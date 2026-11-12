-- =========================================================================
-- MIGRATION: 20261112160000_create_tabla_clientes_mora.sql
-- Objetivo:
-- Crear las tablas para la carga de clientes en mora (cartera vencida) HGI:
-- 1. public.clientes_mora (con columnas T, Tercero, Nombre, Tr, Documento, Cuota, Referencia, Fecha, Vence, Vendedor)
-- 2. public.cargas_clientes_mora (historial de archivos y auditoría de carga)
-- 3. Vistas de compatibilidad (cartera_mora, cartera_clientes_mora, cargas_cartera_mora)
-- 4. Índices para consultas y filtros ultra rápidos
-- 5. RLS y permisos para postgres, anon, authenticated y service_role
-- 6. Función RPC ingest_clientes_mora(payload jsonb) para ingestión en streaming y purga
-- 7. Recarga de caché de esquemas en PostgREST
-- =========================================================================

-- 1. Tabla maestra de clientes en mora
CREATE TABLE IF NOT EXISTS public.clientes_mora (
  id BIGSERIAL PRIMARY KEY,
  t TEXT NOT NULL DEFAULT '',
  tercero TEXT NOT NULL DEFAULT '',
  nombre TEXT NOT NULL DEFAULT '',
  tr TEXT NOT NULL DEFAULT '',
  documento TEXT NOT NULL DEFAULT '',
  cuota TEXT NOT NULL DEFAULT '1',
  referencia TEXT DEFAULT '',
  fecha TEXT DEFAULT '',
  vence TEXT DEFAULT '',
  vendedor TEXT NOT NULL DEFAULT '',
  valor NUMERIC NOT NULL DEFAULT 0,
  saldo NUMERIC NOT NULL DEFAULT 0,
  dias_mora INTEGER NOT NULL DEFAULT 0,
  carga_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Tabla de historial de cargas
CREATE TABLE IF NOT EXISTS public.cargas_clientes_mora (
  id BIGSERIAL PRIMARY KEY,
  archivo TEXT NOT NULL,
  filas_recibidas INTEGER NOT NULL DEFAULT 0,
  filas_insertadas INTEGER NOT NULL DEFAULT 0,
  total_saldo NUMERIC NOT NULL DEFAULT 0,
  total_clientes INTEGER NOT NULL DEFAULT 0,
  usuario_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Vistas de compatibilidad para consultas flexibles
CREATE OR REPLACE VIEW public.cartera_mora AS 
SELECT * FROM public.clientes_mora;

CREATE OR REPLACE VIEW public.cartera_clientes_mora AS 
SELECT * FROM public.clientes_mora;

CREATE OR REPLACE VIEW public.cargas_cartera_mora AS 
SELECT * FROM public.cargas_clientes_mora;

-- 4. Índices optimizados para filtros de analítica y búsqueda
CREATE INDEX IF NOT EXISTS idx_clientes_mora_tercero ON public.clientes_mora(tercero);
CREATE INDEX IF NOT EXISTS idx_clientes_mora_nombre ON public.clientes_mora(nombre);
CREATE INDEX IF NOT EXISTS idx_clientes_mora_vendedor ON public.clientes_mora(vendedor);
CREATE INDEX IF NOT EXISTS idx_clientes_mora_documento ON public.clientes_mora(documento);
CREATE INDEX IF NOT EXISTS idx_clientes_mora_fecha ON public.clientes_mora(fecha);
CREATE INDEX IF NOT EXISTS idx_clientes_mora_vence ON public.clientes_mora(vence);
CREATE INDEX IF NOT EXISTS idx_clientes_mora_saldo ON public.clientes_mora(saldo);
CREATE INDEX IF NOT EXISTS idx_clientes_mora_dias_mora ON public.clientes_mora(dias_mora);
CREATE INDEX IF NOT EXISTS idx_cargas_clientes_mora_created ON public.cargas_clientes_mora(created_at DESC);

-- 5. Configuración de permisos y RLS (abierto para authenticated y service_role)
ALTER TABLE public.clientes_mora DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cargas_clientes_mora DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.clientes_mora TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.cargas_clientes_mora TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.cartera_mora TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.cartera_clientes_mora TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.cargas_cartera_mora TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- 6. Función RPC de ingestión masiva por streaming y purga
CREATE OR REPLACE FUNCTION public.ingest_clientes_mora(payload jsonb)
RETURNS TABLE(recibidas integer, insertadas integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_recibidas INTEGER := 0;
  v_insertadas INTEGER := 0;
  v_action TEXT;
BEGIN
  -- Si el payload solicita purga completa, vaciar las tablas
  IF jsonb_typeof(payload) = 'array' AND jsonb_array_length(payload) > 0 THEN
    v_action := payload->0->>'__action__';
    IF v_action = 'purge' OR v_action = 'purgar' THEN
      TRUNCATE TABLE public.clientes_mora RESTART IDENTITY CASCADE;
      TRUNCATE TABLE public.cargas_clientes_mora RESTART IDENTITY CASCADE;
      RETURN QUERY SELECT 0::integer, 0::integer;
      RETURN;
    END IF;
  END IF;

  WITH ins AS (
    INSERT INTO public.clientes_mora (
      t, tercero, nombre, tr, documento, cuota, referencia, fecha, vence, vendedor,
      valor, saldo, dias_mora, carga_id
    )
    SELECT
      COALESCE(NULLIF(TRIM(COALESCE(elem->>'t', elem->>'T')), ''), ''),
      COALESCE(NULLIF(TRIM(COALESCE(elem->>'tercero', elem->>'Tercero', elem->>'nit', elem->>'NIT')), ''), ''),
      COALESCE(NULLIF(TRIM(COALESCE(elem->>'nombre', elem->>'Nombre', elem->>'cliente', elem->>'Cliente')), ''), ''),
      COALESCE(NULLIF(TRIM(COALESCE(elem->>'tr', elem->>'Tr', elem->>'TR')), ''), ''),
      COALESCE(NULLIF(TRIM(COALESCE(elem->>'documento', elem->>'Documento', elem->>'doc', elem->>'DOC')), ''), ''),
      COALESCE(NULLIF(TRIM(COALESCE(elem->>'cuota', elem->>'Cuota')), ''), '1'),
      COALESCE(NULLIF(TRIM(COALESCE(elem->>'referencia', elem->>'Referencia', elem->>'ref', elem->>'REF')), ''), ''),
      COALESCE(NULLIF(TRIM(COALESCE(elem->>'fecha', elem->>'Fecha')), ''), ''),
      COALESCE(NULLIF(TRIM(COALESCE(elem->>'vence', elem->>'Vence', elem->>'vencimiento', elem->>'Vencimiento')), ''), ''),
      COALESCE(NULLIF(TRIM(COALESCE(elem->>'vendedor', elem->>'Vendedor')), ''), ''),
      COALESCE(NULLIF(TRIM(COALESCE(elem->>'valor', elem->>'Valor', elem->>'total', elem->>'Total')), '')::numeric, 0),
      COALESCE(NULLIF(TRIM(COALESCE(elem->>'saldo', elem->>'Saldo', elem->>'saldo_mora', elem->>'Saldo_Mora', elem->>'valor', elem->>'Valor')), '')::numeric, 0),
      COALESCE(NULLIF(TRIM(COALESCE(elem->>'dias_mora', elem->>'Dias_Mora', elem->>'dias', elem->>'Dias')), '')::integer, 0),
      COALESCE(NULLIF(TRIM(elem->>'carga_id'), '')::bigint, NULL)
    FROM jsonb_array_elements(payload) AS elem
    RETURNING id
  )
  SELECT COUNT(*)::integer INTO v_insertadas FROM ins;

  v_recibidas := jsonb_array_length(payload);
  RETURN QUERY SELECT v_recibidas, v_insertadas;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.ingest_clientes_mora(jsonb) TO postgres, anon, authenticated, service_role;

-- 7. Notificar a PostgREST para recargar la caché de esquemas inmediatamente
NOTIFY pgrst, 'reload schema';
