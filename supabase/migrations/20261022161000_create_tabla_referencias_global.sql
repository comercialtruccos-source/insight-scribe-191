-- =========================================================================
-- MIGRATION: 20261022161000_create_tabla_referencias_global.sql
-- Objetivo:
-- Crear la tabla maestra de referencias global de la empresa con las 4
-- columnas solicitadas: REF, Nombre, PVM (Precio Venta Mayorista) y PVP
-- (Precio Venta Público), junto con su tabla de historial de cargas,
-- vistas de compatibilidad e ingestión masiva por UPSERT.
-- =========================================================================

-- 1. Tabla maestra de referencias
CREATE TABLE IF NOT EXISTS public.referencias (
  id BIGSERIAL PRIMARY KEY,
  ref TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL DEFAULT '',
  pvm NUMERIC NOT NULL DEFAULT 0,
  pvp NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Tabla de historial de cargas de referencias
CREATE TABLE IF NOT EXISTS public.cargas_referencias (
  id BIGSERIAL PRIMARY KEY,
  archivo TEXT NOT NULL,
  filas_recibidas INTEGER NOT NULL DEFAULT 0,
  filas_nuevas INTEGER NOT NULL DEFAULT 0,
  filas_actualizadas INTEGER NOT NULL DEFAULT 0,
  usuario_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Vistas de compatibilidad (dim_referencias y referencias_global)
CREATE OR REPLACE VIEW public.dim_referencias AS 
SELECT * FROM public.referencias;

CREATE OR REPLACE VIEW public.referencias_global AS 
SELECT * FROM public.referencias;

-- 4. Índices para búsqueda y rendimiento en cruces con correrías
CREATE INDEX IF NOT EXISTS idx_referencias_ref ON public.referencias(ref);
CREATE INDEX IF NOT EXISTS idx_referencias_nombre ON public.referencias(nombre);
CREATE INDEX IF NOT EXISTS idx_cargas_referencias_created_at ON public.cargas_referencias(created_at DESC);

-- 5. Permisos y RLS (abierto para authenticated y service_role, coherente con las demás dimensiones)
ALTER TABLE public.referencias DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cargas_referencias DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.referencias TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.cargas_referencias TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.dim_referencias TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.referencias_global TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- 6. Función RPC para Ingestión Masiva por UPSERT en Lotes (Streaming)
CREATE OR REPLACE FUNCTION public.ingest_referencias(payload jsonb)
RETURNS TABLE(recibidas integer, nuevas integer, actualizadas integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_recibidas INTEGER := 0;
  v_nuevas INTEGER := 0;
  v_actualizadas INTEGER := 0;
  v_action TEXT;
BEGIN
  -- Soporte para acción de purga total
  IF jsonb_typeof(payload) = 'array' AND jsonb_array_length(payload) > 0 THEN
    v_action := payload->0->>'__action__';
    IF v_action = 'purge' OR v_action = 'purgar' THEN
      TRUNCATE TABLE public.referencias RESTART IDENTITY CASCADE;
      TRUNCATE TABLE public.cargas_referencias RESTART IDENTITY CASCADE;
      RETURN QUERY SELECT 0::integer, 0::integer, 0::integer;
      RETURN;
    END IF;
  END IF;

  -- Procesar filas entrantes e insertar con UPSERT sobre 'ref'
  WITH datos_in AS (
    SELECT
      TRIM(elem->>'ref') AS ref_val,
      COALESCE(NULLIF(TRIM(elem->>'nombre'), ''), 'Sin Nombre') AS nombre_val,
      COALESCE((elem->>'pvm')::numeric, 0) AS pvm_val,
      COALESCE((elem->>'pvp')::numeric, 0) AS pvp_val
    FROM jsonb_array_elements(payload) AS elem
    WHERE NULLIF(TRIM(elem->>'ref'), '') IS NOT NULL
  ),
  filas_unicas AS (
    SELECT DISTINCT ON (ref_val) ref_val, nombre_val, pvm_val, pvp_val
    FROM datos_in
  ),
  conteo_total AS (
    SELECT COUNT(*)::integer AS total FROM filas_unicas
  ),
  upsert_op AS (
    INSERT INTO public.referencias (ref, nombre, pvm, pvp, updated_at)
    SELECT ref_val, nombre_val, pvm_val, pvp_val, now()
    FROM filas_unicas
    ON CONFLICT (ref) DO UPDATE
    SET
      nombre = EXCLUDED.nombre,
      pvm = EXCLUDED.pvm,
      pvp = EXCLUDED.pvp,
      updated_at = now()
    RETURNING (xmax = 0) AS es_nueva
  )
  SELECT
    (SELECT total FROM conteo_total),
    COALESCE(COUNT(*) FILTER (WHERE es_nueva), 0)::integer,
    COALESCE(COUNT(*) FILTER (WHERE NOT es_nueva), 0)::integer
  INTO v_recibidas, v_nuevas, v_actualizadas
  FROM upsert_op;

  RETURN QUERY SELECT v_recibidas, v_nuevas, v_actualizadas;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.ingest_referencias(jsonb) TO postgres, anon, authenticated, service_role;

-- 7. Recargar inmediatamente la caché de esquemas de PostgREST
NOTIFY pgrst, 'reload schema';
