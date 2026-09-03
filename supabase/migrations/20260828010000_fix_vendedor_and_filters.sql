-- =========================================================================
-- ACTUALIZACIÓN DE FUNCIONES BI: SOPORTE VENDEDOR 1 / VENDEDOR 2 Y FILTROS
-- =========================================================================

-- 1. get_bi_kpis con soporte completo de vendedor 1 y 2, canal, marca, zona
CREATE OR REPLACE FUNCTION public.get_bi_kpis(
  p_anio INTEGER DEFAULT NULL,
  p_mes INTEGER DEFAULT NULL,
  p_canal_id BIGINT DEFAULT NULL,
  p_marca_id BIGINT DEFAULT NULL,
  p_vendedor_id BIGINT DEFAULT NULL,
  p_zona_id BIGINT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT jsonb_build_object(
    'total_ventas', COALESCE(SUM(fv.valor), 0),
    'total_cantidad', COALESCE(SUM(fv.cantidad), 0),
    'total_costo', COALESCE(SUM(fv.costo_total), 0),
    'margen_bruto', COALESCE(SUM(fv.valor) - SUM(fv.costo_total), 0),
    'margen_pct', CASE WHEN COALESCE(SUM(fv.valor), 0) > 0 
      THEN ROUND(((SUM(fv.valor) - SUM(COALESCE(fv.costo_total, 0))) / SUM(fv.valor) * 100)::numeric, 2) 
      ELSE 0 END,
    'total_transacciones', COUNT(DISTINCT fv.transaccion),
    'total_clientes', COUNT(DISTINCT fv.tercero_id),
    'total_skus', COUNT(DISTINCT fv.sku),
    'ticket_promedio', CASE WHEN COUNT(DISTINCT fv.transaccion) > 0 
      THEN ROUND((SUM(fv.valor) / COUNT(DISTINCT fv.transaccion))::numeric, 0)
      ELSE 0 END,
    'precio_promedio_unidad', CASE WHEN SUM(fv.cantidad) > 0 
      THEN ROUND((SUM(fv.valor) / SUM(fv.cantidad))::numeric, 0)
      ELSE 0 END
  )
  INTO v_result
  FROM public.fact_ventas fv
  WHERE (p_anio IS NULL OR fv.anio = p_anio)
    AND (p_mes IS NULL OR fv.mes = p_mes)
    AND (p_canal_id IS NULL OR fv.canal_id = p_canal_id)
    AND (p_marca_id IS NULL OR fv.marca_id = p_marca_id)
    AND (p_vendedor_id IS NULL OR fv.vendedor_id = p_vendedor_id OR fv.vendedor2_id = p_vendedor_id)
    AND (p_zona_id IS NULL OR fv.zona_id = p_zona_id OR fv.zona_colombia_id = p_zona_id);

  RETURN v_result;
END;
$$;

-- 2. get_bi_historico_anual con soporte de vendedor 1 y 2
CREATE OR REPLACE FUNCTION public.get_bi_historico_anual(
  p_canal_id BIGINT DEFAULT NULL,
  p_marca_id BIGINT DEFAULT NULL,
  p_vendedor_id BIGINT DEFAULT NULL,
  p_zona_id BIGINT DEFAULT NULL
)
RETURNS TABLE (
  anio INTEGER,
  total_ventas NUMERIC,
  total_unidades BIGINT,
  total_costo NUMERIC,
  margen_bruto NUMERIC,
  margen_pct NUMERIC,
  venta_anterior NUMERIC,
  crecimiento_yoy_pct NUMERIC,
  total_transacciones BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  RETURN QUERY
  WITH agrupado AS (
    SELECT
      fv.anio,
      COALESCE(SUM(fv.valor), 0) AS v_ventas,
      COALESCE(SUM(fv.cantidad), 0)::bigint AS v_unidades,
      COALESCE(SUM(fv.costo_total), 0) AS v_costo,
      COALESCE(SUM(fv.valor) - SUM(fv.costo_total), 0) AS v_margen,
      CASE WHEN SUM(fv.valor) > 0 
        THEN ROUND(((SUM(fv.valor) - SUM(COALESCE(fv.costo_total, 0))) / SUM(fv.valor) * 100)::numeric, 2)
        ELSE 0 END AS v_margen_pct,
      COUNT(DISTINCT fv.transaccion) AS v_trans
    FROM public.fact_ventas fv
    WHERE (p_canal_id IS NULL OR fv.canal_id = p_canal_id)
      AND (p_marca_id IS NULL OR fv.marca_id = p_marca_id)
      AND (p_vendedor_id IS NULL OR fv.vendedor_id = p_vendedor_id OR fv.vendedor2_id = p_vendedor_id)
      AND (p_zona_id IS NULL OR fv.zona_id = p_zona_id OR fv.zona_colombia_id = p_zona_id)
      AND fv.anio IS NOT NULL
    GROUP BY fv.anio
  ),
  con_lag AS (
    SELECT
      a.anio,
      a.v_ventas,
      a.v_unidades,
      a.v_costo,
      a.v_margen,
      a.v_margen_pct,
      LAG(a.v_ventas) OVER (ORDER BY a.anio ASC) AS v_ant,
      a.v_trans
    FROM agrupado a
  )
  SELECT
    c.anio,
    c.v_ventas AS total_ventas,
    c.v_unidades AS total_unidades,
    c.v_costo AS total_costo,
    c.v_margen AS margen_bruto,
    c.v_margen_pct AS margen_pct,
    COALESCE(c.v_ant, 0) AS venta_anterior,
    CASE 
      WHEN COALESCE(c.v_ant, 0) > 0 THEN ROUND(((c.v_ventas - c.v_ant) / c.v_ant * 100)::numeric, 2)
      ELSE 0 
    END AS crecimiento_yoy_pct,
    c.v_trans AS total_transacciones
  FROM con_lag c
  ORDER BY c.anio DESC;
END;
$$;

-- 3. get_bi_estacionalidad_multianual con soporte de vendedor 1 y 2
CREATE OR REPLACE FUNCTION public.get_bi_estacionalidad_multianual(
  p_canal_id BIGINT DEFAULT NULL,
  p_marca_id BIGINT DEFAULT NULL,
  p_vendedor_id BIGINT DEFAULT NULL,
  p_zona_id BIGINT DEFAULT NULL
)
RETURNS TABLE (
  mes INTEGER,
  nombre_mes TEXT,
  anio INTEGER,
  total_ventas NUMERIC,
  total_unidades BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  RETURN QUERY
  SELECT
    fv.mes,
    to_char(to_date(fv.mes::text, 'MM'), 'TMMonth') AS nombre_mes,
    fv.anio,
    COALESCE(SUM(fv.valor), 0) AS total_ventas,
    COALESCE(SUM(fv.cantidad), 0)::bigint AS total_unidades
  FROM public.fact_ventas fv
  WHERE (p_canal_id IS NULL OR fv.canal_id = p_canal_id)
    AND (p_marca_id IS NULL OR fv.marca_id = p_marca_id)
    AND (p_vendedor_id IS NULL OR fv.vendedor_id = p_vendedor_id OR fv.vendedor2_id = p_vendedor_id)
    AND (p_zona_id IS NULL OR fv.zona_id = p_zona_id OR fv.zona_colombia_id = p_zona_id)
    AND fv.anio IS NOT NULL AND fv.mes IS NOT NULL
  GROUP BY fv.mes, fv.anio
  ORDER BY fv.mes ASC, fv.anio ASC;
END;
$$;

-- 4. get_bi_historico_cronologico con soporte de vendedor 1 y 2
CREATE OR REPLACE FUNCTION public.get_bi_historico_cronologico(
  p_canal_id BIGINT DEFAULT NULL,
  p_marca_id BIGINT DEFAULT NULL,
  p_vendedor_id BIGINT DEFAULT NULL,
  p_zona_id BIGINT DEFAULT NULL
)
RETURNS TABLE (
  anio INTEGER,
  mes INTEGER,
  periodo TEXT,
  venta_real NUMERIC,
  unidades BIGINT,
  costo_total NUMERIC,
  margen_bruto NUMERIC,
  margen_pct NUMERIC,
  transacciones BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  RETURN QUERY
  SELECT
    fv.anio,
    fv.mes,
    to_char(to_date(COALESCE(fv.mes, 1)::text, 'MM'), 'Mon') || ' ' || COALESCE(fv.anio, 2026)::text AS periodo,
    COALESCE(SUM(fv.valor), 0) AS venta_real,
    COALESCE(SUM(fv.cantidad), 0)::bigint AS unidades,
    COALESCE(SUM(fv.costo_total), 0) AS costo_total,
    COALESCE(SUM(fv.valor) - SUM(fv.costo_total), 0) AS margen_bruto,
    CASE WHEN SUM(fv.valor) > 0 
      THEN ROUND(((SUM(fv.valor) - SUM(COALESCE(fv.costo_total, 0))) / SUM(fv.valor) * 100)::numeric, 2)
      ELSE 0 END AS margen_pct,
    COUNT(DISTINCT fv.transaccion) AS transacciones
  FROM public.fact_ventas fv
  WHERE (p_canal_id IS NULL OR fv.canal_id = p_canal_id)
    AND (p_marca_id IS NULL OR fv.marca_id = p_marca_id)
    AND (p_vendedor_id IS NULL OR fv.vendedor_id = p_vendedor_id OR fv.vendedor2_id = p_vendedor_id)
    AND (p_zona_id IS NULL OR fv.zona_id = p_zona_id OR fv.zona_colombia_id = p_zona_id)
    AND fv.anio IS NOT NULL AND fv.mes IS NOT NULL
  GROUP BY fv.anio, fv.mes
  ORDER BY fv.anio ASC, fv.mes ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_bi_kpis(INTEGER, INTEGER, BIGINT, BIGINT, BIGINT, BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_bi_historico_anual(BIGINT, BIGINT, BIGINT, BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_bi_estacionalidad_multianual(BIGINT, BIGINT, BIGINT, BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_bi_historico_cronologico(BIGINT, BIGINT, BIGINT, BIGINT) TO authenticated;
