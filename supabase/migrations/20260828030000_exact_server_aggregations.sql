-- =========================================================================
-- AGREGACIONES EXACTAS EN EL SERVIDOR (SIN LÍMITE DE FILAS / POSTGREST)
-- =========================================================================

-- 1. Resumen exacto de KPIs y totales con soporte completo de fechas y filtros
CREATE OR REPLACE FUNCTION public.get_bi_totales_exactos(
  p_anio INTEGER DEFAULT NULL,
  p_mes INTEGER DEFAULT NULL,
  p_fecha_desde DATE DEFAULT NULL,
  p_fecha_hasta DATE DEFAULT NULL,
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
  SELECT jsonb_build_object(
    'total_ventas_brutas', COALESCE(SUM(CASE WHEN fv.valor > 0 THEN fv.valor ELSE 0 END), 0),
    'total_devoluciones', COALESCE(SUM(CASE WHEN fv.valor < 0 THEN ABS(fv.valor) ELSE 0 END), 0),
    'total_ventas_netas', COALESCE(SUM(fv.valor), 0),
    'total_unidades', COALESCE(SUM(fv.cantidad), 0),
    'total_unidades_positivas', COALESCE(SUM(CASE WHEN fv.cantidad > 0 THEN fv.cantidad ELSE 0 END), 0),
    'total_costo', COALESCE(SUM(fv.costo_total), 0),
    'total_registros', COUNT(*),
    'total_transacciones', COUNT(DISTINCT fv.transaccion)
  )
  INTO v_result
  FROM public.fact_ventas fv
  WHERE (p_fecha_desde IS NULL OR fv.fecha >= p_fecha_desde)
    AND (p_fecha_hasta IS NULL OR fv.fecha <= p_fecha_hasta)
    AND (p_fecha_desde IS NOT NULL OR p_anio IS NULL OR fv.anio = p_anio)
    AND (p_mes IS NULL OR fv.mes = p_mes)
    AND (p_canal_id IS NULL OR fv.canal_id = p_canal_id)
    AND (p_marca_id IS NULL OR fv.marca_id = p_marca_id)
    AND (p_vendedor_id IS NULL OR fv.vendedor_id = p_vendedor_id OR fv.vendedor2_id = p_vendedor_id)
    AND (p_zona_id IS NULL OR fv.zona_id = p_zona_id OR fv.zona_colombia_id = p_zona_id);

  RETURN v_result;
END;
$$;

-- 2. Agrupación mensual exacta por asesor
CREATE OR REPLACE FUNCTION public.get_bi_asesores_exactos(
  p_anio INTEGER DEFAULT NULL,
  p_mes INTEGER DEFAULT NULL,
  p_fecha_desde DATE DEFAULT NULL,
  p_fecha_hasta DATE DEFAULT NULL,
  p_canal_id BIGINT DEFAULT NULL,
  p_marca_id BIGINT DEFAULT NULL,
  p_vendedor_id BIGINT DEFAULT NULL,
  p_zona_id BIGINT DEFAULT NULL
)
RETURNS TABLE (
  vendedor_id BIGINT,
  vendedor_nombre TEXT,
  total_ventas NUMERIC,
  total_unidades BIGINT,
  total_registros BIGINT,
  total_devoluciones NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(fv.vendedor_id, fv.vendedor2_id) AS vendedor_id,
    COALESCE(TRIM(dv.nombre), 'Asesor General') AS vendedor_nombre,
    COALESCE(SUM(fv.valor), 0) AS total_ventas,
    COALESCE(SUM(fv.cantidad), 0)::bigint AS total_unidades,
    COUNT(*)::bigint AS total_registros,
    COALESCE(SUM(CASE WHEN fv.valor < 0 THEN ABS(fv.valor) ELSE 0 END), 0) AS total_devoluciones
  FROM public.fact_ventas fv
  LEFT JOIN public.dim_vendedor dv ON dv.id = COALESCE(fv.vendedor_id, fv.vendedor2_id)
  WHERE (p_fecha_desde IS NULL OR fv.fecha >= p_fecha_desde)
    AND (p_fecha_hasta IS NULL OR fv.fecha <= p_fecha_hasta)
    AND (p_fecha_desde IS NOT NULL OR p_anio IS NULL OR fv.anio = p_anio)
    AND (p_mes IS NULL OR fv.mes = p_mes)
    AND (p_canal_id IS NULL OR fv.canal_id = p_canal_id)
    AND (p_marca_id IS NULL OR fv.marca_id = p_marca_id)
    AND (p_vendedor_id IS NULL OR fv.vendedor_id = p_vendedor_id OR fv.vendedor2_id = p_vendedor_id)
    AND (p_zona_id IS NULL OR fv.zona_id = p_zona_id OR fv.zona_colombia_id = p_zona_id)
  GROUP BY COALESCE(fv.vendedor_id, fv.vendedor2_id), dv.nombre
  ORDER BY total_ventas DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_bi_totales_exactos(INTEGER, INTEGER, DATE, DATE, BIGINT, BIGINT, BIGINT, BIGINT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_bi_asesores_exactos(INTEGER, INTEGER, DATE, DATE, BIGINT, BIGINT, BIGINT, BIGINT) TO authenticated, anon;
