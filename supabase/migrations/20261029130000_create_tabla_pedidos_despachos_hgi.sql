-- =========================================================================
-- MIGRATION: 20261029130000_create_tabla_pedidos_despachos_hgi.sql
-- Objetivo:
-- Crear la tabla maestra de Pedidos vs Despachos HGI con las 18 columnas oficiales
-- solicitadas por la dirección comercial, junto con su tabla de cargas, índices
-- y función RPC de ingestión masiva.
-- =========================================================================

-- 1. Tabla maestra de pedidos vs despachos HGI
CREATE TABLE IF NOT EXISTS public.pedidos_despachos (
  id BIGSERIAL PRIMARY KEY,
  transaccion TEXT NOT NULL DEFAULT 'PEDIDO',
  tercero TEXT NOT NULL DEFAULT '',
  nombre TEXT NOT NULL DEFAULT '',
  vendedor TEXT NOT NULL DEFAULT '',
  ciudad TEXT NOT NULL DEFAULT '',
  fechas TEXT DEFAULT '',
  vence TEXT DEFAULT '',
  documento TEXT DEFAULT '',
  producto TEXT NOT NULL DEFAULT '',
  descripcion TEXT DEFAULT '',
  talla TEXT DEFAULT '',
  color TEXT DEFAULT '',
  anterior NUMERIC NOT NULL DEFAULT 0,
  pedido_mes NUMERIC NOT NULL DEFAULT 0,
  total_pedido NUMERIC NOT NULL DEFAULT 0,
  despachado NUMERIC NOT NULL DEFAULT 0,
  cancelado NUMERIC NOT NULL DEFAULT 0,
  saldo_pedido NUMERIC NOT NULL DEFAULT 0,
  saldo_inv NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Tabla de historial de cargas
CREATE TABLE IF NOT EXISTS public.cargas_pedidos_despachos (
  id BIGSERIAL PRIMARY KEY,
  archivo TEXT NOT NULL,
  filas_recibidas INTEGER NOT NULL DEFAULT 0,
  filas_insertadas INTEGER NOT NULL DEFAULT 0,
  total_pedidos NUMERIC NOT NULL DEFAULT 0,
  total_despachado NUMERIC NOT NULL DEFAULT 0,
  total_saldo_pedido NUMERIC NOT NULL DEFAULT 0,
  usuario_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Índices para consultas de alta velocidad y filtrado
CREATE INDEX IF NOT EXISTS idx_pedidos_despachos_vendedor ON public.pedidos_despachos(vendedor);
CREATE INDEX IF NOT EXISTS idx_pedidos_despachos_tercero ON public.pedidos_despachos(tercero);
CREATE INDEX IF NOT EXISTS idx_pedidos_despachos_nombre ON public.pedidos_despachos(nombre);
CREATE INDEX IF NOT EXISTS idx_pedidos_despachos_producto ON public.pedidos_despachos(producto);
CREATE INDEX IF NOT EXISTS idx_pedidos_despachos_saldo ON public.pedidos_despachos(saldo_pedido);
CREATE INDEX IF NOT EXISTS idx_pedidos_despachos_ciudad ON public.pedidos_despachos(ciudad);
CREATE INDEX IF NOT EXISTS idx_cargas_pedidos_despachos_created ON public.cargas_pedidos_despachos(created_at DESC);

-- 4. Permisos y RLS
ALTER TABLE public.pedidos_despachos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cargas_pedidos_despachos DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.pedidos_despachos TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.cargas_pedidos_despachos TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- 5. Función RPC para ingestión por lotes y purga
CREATE OR REPLACE FUNCTION public.ingest_pedidos_despachos(payload jsonb)
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
  -- Si el primer elemento pide purga, vaciar la tabla
  IF jsonb_typeof(payload) = 'array' AND jsonb_array_length(payload) > 0 THEN
    v_action := payload->0->>'__action__';
    IF v_action = 'purge' OR v_action = 'purgar' THEN
      TRUNCATE TABLE public.pedidos_despachos RESTART IDENTITY CASCADE;
      RETURN QUERY SELECT 0::integer, 0::integer;
      RETURN;
    END IF;
  END IF;

  WITH ins AS (
    INSERT INTO public.pedidos_despachos (
      transaccion, tercero, nombre, vendedor, ciudad, fechas, vence, documento,
      producto, descripcion, talla, color, anterior, pedido_mes, total_pedido,
      despachado, cancelado, saldo_pedido, saldo_inv
    )
    SELECT
      COALESCE(elem->>'transaccion', 'PEDIDO'),
      COALESCE(elem->>'tercero', ''),
      COALESCE(elem->>'nombre', ''),
      COALESCE(elem->>'vendedor', ''),
      COALESCE(elem->>'ciudad', ''),
      COALESCE(elem->>'fechas', ''),
      COALESCE(elem->>'vence', ''),
      COALESCE(elem->>'documento', ''),
      COALESCE(elem->>'producto', ''),
      COALESCE(elem->>'descripcion', ''),
      COALESCE(elem->>'talla', ''),
      COALESCE(elem->>'color', ''),
      COALESCE((elem->>'anterior')::numeric, 0),
      COALESCE((elem->>'pedido_mes')::numeric, 0),
      COALESCE((elem->>'total_pedido')::numeric, 0),
      COALESCE((elem->>'despachado')::numeric, 0),
      COALESCE((elem->>'cancelado')::numeric, 0),
      COALESCE((elem->>'saldo_pedido')::numeric, 0),
      COALESCE((elem->>'saldo_inv')::numeric, 0)
    FROM jsonb_array_elements(payload) AS elem
    RETURNING id
  )
  SELECT COUNT(*)::integer INTO v_insertadas FROM ins;

  v_recibidas := jsonb_array_length(payload);
  RETURN QUERY SELECT v_recibidas, v_insertadas;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.ingest_pedidos_despachos(jsonb) TO postgres, anon, authenticated, service_role;
