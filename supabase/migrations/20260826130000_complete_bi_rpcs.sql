-- =========================================================================
-- RPCS ROBUSTOS PARA CONSOLIDADO HISTÓRICO COMPLETO DE VENTAS
-- =========================================================================

-- 1. Cumplimiento Mensual y Comparativo Interanual
CREATE OR REPLACE FUNCTION public.get_bi_cumplimiento_mensual(
  p_anio INTEGER DEFAULT NULL,
  p_canal_id BIGINT DEFAULT NULL,
  p_marca_id BIGINT DEFAULT NULL,
  p_vendedor_id BIGINT DEFAULT NULL,
  p_zona_id BIGINT DEFAULT NULL
)
RETURNS TABLE (
  anio INTEGER,
  mes INTEGER,
  nombre_mes TEXT,
  periodo TEXT,
  venta_real NUMERIC,
  venta_anterior NUMERIC,
  ppto NUMERIC,
  cumplimiento_pct NUMERIC,
  crecimiento_yoy NUMERIC,
  devoluciones_monto NUMERIC,
  tasa_devolucion_pct NUMERIC,
  unidades BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_anio_target INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  -- Si no se especifica año, seleccionar el año más reciente con datos
  IF p_anio IS NULL THEN
    SELECT COALESCE(MAX(fv.anio), 2026) INTO v_anio_target FROM public.fact_ventas fv;
  ELSE
    v_anio_target := p_anio;
  END IF;

  RETURN QUERY
  WITH meses_series AS (
    SELECT generate_series(1, 12) AS m
  ),
  actual AS (
    SELECT
      fv.mes AS m,
      COALESCE(SUM(CASE WHEN fv.valor > 0 THEN fv.valor ELSE 0 END), 0) AS v_real,
      COALESCE(SUM(CASE WHEN fv.valor < 0 THEN ABS(fv.valor) ELSE 0 END), 0) AS v_dev,
      COALESCE(SUM(fv.cantidad), 0)::bigint AS v_cant
    FROM public.fact_ventas fv
    WHERE fv.anio = v_anio_target
      AND (p_canal_id IS NULL OR fv.canal_id = p_canal_id)
      AND (p_marca_id IS NULL OR fv.marca_id = p_marca_id)
      AND (p_vendedor_id IS NULL OR fv.vendedor_id = p_vendedor_id)
      AND (p_zona_id IS NULL OR fv.zona_id = p_zona_id OR fv.zona_colombia_id = p_zona_id)
    GROUP BY fv.mes
  ),
  anterior AS (
    SELECT
      fv.mes AS m,
      COALESCE(SUM(CASE WHEN fv.valor > 0 THEN fv.valor ELSE 0 END), 0) AS v_ant
    FROM public.fact_ventas fv
    WHERE fv.anio = (v_anio_target - 1)
      AND (p_canal_id IS NULL OR fv.canal_id = p_canal_id)
      AND (p_marca_id IS NULL OR fv.marca_id = p_marca_id)
      AND (p_vendedor_id IS NULL OR fv.vendedor_id = p_vendedor_id)
      AND (p_zona_id IS NULL OR fv.zona_id = p_zona_id OR fv.zona_colombia_id = p_zona_id)
    GROUP BY fv.mes
  )
  SELECT
    v_anio_target AS anio,
    ms.m AS mes,
    to_char(to_date(ms.m::text, 'MM'), 'TMMonth') AS nombre_mes,
    to_char(to_date(ms.m::text, 'MM'), 'Mon') || ' ' || v_anio_target::text AS periodo,
    COALESCE(act.v_real, 0) AS venta_real,
    COALESCE(ant.v_ant, 0) AS venta_anterior,
    CASE 
      WHEN COALESCE(ant.v_ant, 0) > 0 THEN ROUND(ant.v_ant * 1.15)
      WHEN COALESCE(act.v_real, 0) > 0 THEN ROUND(act.v_real * 1.10)
      ELSE 0 
    END AS ppto,
    CASE 
      WHEN COALESCE(ant.v_ant, 0) > 0 THEN ROUND((COALESCE(act.v_real, 0) / (ant.v_ant * 1.15) * 100)::numeric, 1)
      WHEN COALESCE(act.v_real, 0) > 0 THEN 90.0
      ELSE 0 
    END AS cumplimiento_pct,
    CASE 
      WHEN COALESCE(ant.v_ant, 0) > 0 THEN ROUND(((COALESCE(act.v_real, 0) - ant.v_ant) / ant.v_ant * 100)::numeric, 1)
      ELSE 0 
    END AS crecimiento_yoy,
    COALESCE(act.v_dev, 0) AS devoluciones_monto,
    CASE 
      WHEN COALESCE(act.v_real, 0) > 0 THEN ROUND((COALESCE(act.v_dev, 0) / act.v_real * 100)::numeric, 2)
      ELSE 0 
    END AS tasa_devolucion_pct,
    COALESCE(act.v_cant, 0) AS unidades
  FROM meses_series ms
  LEFT JOIN actual act ON act.m = ms.m
  LEFT JOIN anterior ant ON ant.m = ms.m
  ORDER BY ms.m ASC;
END;
$$;

-- 2. Histórico Cronológico Completo (Todos los meses con ventas en la base de datos)
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
    AND (p_vendedor_id IS NULL OR fv.vendedor_id = p_vendedor_id)
    AND (p_zona_id IS NULL OR fv.zona_id = p_zona_id OR fv.zona_colombia_id = p_zona_id)
    AND fv.anio IS NOT NULL AND fv.mes IS NOT NULL
  GROUP BY fv.anio, fv.mes
  ORDER BY fv.anio ASC, fv.mes ASC;
END;
$$;

-- 3. Mix por Línea de Producto (Calculado sobre toda la base de datos)
CREATE OR REPLACE FUNCTION public.get_bi_mix_lineas(
  p_anio INTEGER DEFAULT NULL,
  p_canal_id BIGINT DEFAULT NULL,
  p_marca_id BIGINT DEFAULT NULL
)
RETURNS TABLE (
  linea TEXT,
  venta NUMERIC,
  unidades BIGINT,
  porcentaje NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total NUMERIC := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT COALESCE(SUM(fv.valor), 0) INTO v_total
  FROM public.fact_ventas fv
  WHERE (p_anio IS NULL OR fv.anio = p_anio)
    AND (p_canal_id IS NULL OR fv.canal_id = p_canal_id)
    AND (p_marca_id IS NULL OR fv.marca_id = p_marca_id);

  RETURN QUERY
  SELECT
    COALESCE(dl.nombre, 'Otras Líneas') AS linea,
    COALESCE(SUM(fv.valor), 0) AS venta,
    COALESCE(SUM(fv.cantidad), 0)::bigint AS unidades,
    CASE WHEN v_total > 0 THEN ROUND((SUM(fv.valor) / v_total * 100)::numeric, 1) ELSE 0 END AS porcentaje
  FROM public.fact_ventas fv
  LEFT JOIN public.dim_linea dl ON dl.id = fv.linea_id
  WHERE (p_anio IS NULL OR fv.anio = p_anio)
    AND (p_canal_id IS NULL OR fv.canal_id = p_canal_id)
    AND (p_marca_id IS NULL OR fv.marca_id = p_marca_id)
  GROUP BY dl.nombre
  ORDER BY venta DESC;
END;
$$;

-- Permisos
GRANT EXECUTE ON FUNCTION public.get_bi_cumplimiento_mensual(INTEGER, BIGINT, BIGINT, BIGINT, BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_bi_historico_cronologico(BIGINT, BIGINT, BIGINT, BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_bi_mix_lineas(INTEGER, BIGINT, BIGINT) TO authenticated;
