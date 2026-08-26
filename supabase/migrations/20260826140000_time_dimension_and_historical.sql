-- =========================================================================
-- DIMENSIÓN DE TIEMPO Y ANÁLISIS HISTÓRICO MULTIANUAL (2018 - 2026)
-- =========================================================================

-- Asegurar que anio, mes, dia estén poblados si fecha existe
UPDATE public.fact_ventas
SET 
  anio = EXTRACT(YEAR FROM COALESCE(fecha, fecha_compra))::integer,
  mes = EXTRACT(MONTH FROM COALESCE(fecha, fecha_compra))::integer,
  dia = EXTRACT(DAY FROM COALESCE(fecha, fecha_compra))::integer
WHERE anio IS NULL AND (fecha IS NOT NULL OR fecha_compra IS NOT NULL);

-- 1. Obtener todos los años únicos en la base de datos sin límite
CREATE OR REPLACE FUNCTION public.get_bi_anios_disponibles()
RETURNS TABLE (anio INTEGER)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT fv.anio
  FROM public.fact_ventas fv
  WHERE fv.anio IS NOT NULL AND fv.anio > 2000 AND fv.anio < 2100
  ORDER BY fv.anio DESC;
$$;

-- 2. Resumen Histórico Anual (Consolidado por Año y Crecimiento YoY)
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
      AND (p_vendedor_id IS NULL OR fv.vendedor_id = p_vendedor_id)
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

-- 3. Estacionalidad Mensual Multi-Año (Comparativo de curvas de cada año)
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
    AND (p_vendedor_id IS NULL OR fv.vendedor_id = p_vendedor_id)
    AND (p_zona_id IS NULL OR fv.zona_id = p_zona_id OR fv.zona_colombia_id = p_zona_id)
    AND fv.anio IS NOT NULL AND fv.mes IS NOT NULL
  GROUP BY fv.mes, fv.anio
  ORDER BY fv.mes ASC, fv.anio ASC;
END;
$$;

-- 4. Matriz Histórica Año x Mes (Tabla completa de calor)
CREATE OR REPLACE FUNCTION public.get_bi_matriz_historica(
  p_canal_id BIGINT DEFAULT NULL,
  p_marca_id BIGINT DEFAULT NULL,
  p_vendedor_id BIGINT DEFAULT NULL,
  p_zona_id BIGINT DEFAULT NULL
)
RETURNS TABLE (
  anio INTEGER,
  m1 NUMERIC, m2 NUMERIC, m3 NUMERIC, m4 NUMERIC, m5 NUMERIC, m6 NUMERIC,
  m7 NUMERIC, m8 NUMERIC, m9 NUMERIC, m10 NUMERIC, m11 NUMERIC, m12 NUMERIC,
  total_anio NUMERIC,
  unidades_anio BIGINT
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
    COALESCE(SUM(CASE WHEN fv.mes = 1 THEN fv.valor ELSE 0 END), 0) AS m1,
    COALESCE(SUM(CASE WHEN fv.mes = 2 THEN fv.valor ELSE 0 END), 0) AS m2,
    COALESCE(SUM(CASE WHEN fv.mes = 3 THEN fv.valor ELSE 0 END), 0) AS m3,
    COALESCE(SUM(CASE WHEN fv.mes = 4 THEN fv.valor ELSE 0 END), 0) AS m4,
    COALESCE(SUM(CASE WHEN fv.mes = 5 THEN fv.valor ELSE 0 END), 0) AS m5,
    COALESCE(SUM(CASE WHEN fv.mes = 6 THEN fv.valor ELSE 0 END), 0) AS m6,
    COALESCE(SUM(CASE WHEN fv.mes = 7 THEN fv.valor ELSE 0 END), 0) AS m7,
    COALESCE(SUM(CASE WHEN fv.mes = 8 THEN fv.valor ELSE 0 END), 0) AS m8,
    COALESCE(SUM(CASE WHEN fv.mes = 9 THEN fv.valor ELSE 0 END), 0) AS m9,
    COALESCE(SUM(CASE WHEN fv.mes = 10 THEN fv.valor ELSE 0 END), 0) AS m10,
    COALESCE(SUM(CASE WHEN fv.mes = 11 THEN fv.valor ELSE 0 END), 0) AS m11,
    COALESCE(SUM(CASE WHEN fv.mes = 12 THEN fv.valor ELSE 0 END), 0) AS m12,
    COALESCE(SUM(fv.valor), 0) AS total_anio,
    COALESCE(SUM(fv.cantidad), 0)::bigint AS unidades_anio
  FROM public.fact_ventas fv
  WHERE (p_canal_id IS NULL OR fv.canal_id = p_canal_id)
    AND (p_marca_id IS NULL OR fv.marca_id = p_marca_id)
    AND (p_vendedor_id IS NULL OR fv.vendedor_id = p_vendedor_id)
    AND (p_zona_id IS NULL OR fv.zona_id = p_zona_id OR fv.zona_colombia_id = p_zona_id)
    AND fv.anio IS NOT NULL
  GROUP BY fv.anio
  ORDER BY fv.anio DESC;
END;
$$;

-- Permisos
GRANT EXECUTE ON FUNCTION public.get_bi_anios_disponibles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_bi_historico_anual(BIGINT, BIGINT, BIGINT, BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_bi_estacionalidad_multianual(BIGINT, BIGINT, BIGINT, BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_bi_matriz_historica(BIGINT, BIGINT, BIGINT, BIGINT) TO authenticated;
