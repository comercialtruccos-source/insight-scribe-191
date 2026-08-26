-- =========================================================================
-- FUNCIONES RPC DE ALTO RENDIMIENTO PARA BUSINESS INTELLIGENCE
-- =========================================================================

-- 1. KPIs Generales con filtros
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

-- 2. Ventas por Tiempo (Evolución mensual/anual)
CREATE OR REPLACE FUNCTION public.get_bi_ventas_tiempo(
  p_anio INTEGER DEFAULT NULL,
  p_canal_id BIGINT DEFAULT NULL,
  p_marca_id BIGINT DEFAULT NULL,
  p_vendedor_id BIGINT DEFAULT NULL,
  p_zona_id BIGINT DEFAULT NULL
)
RETURNS TABLE (
  anio INTEGER,
  mes INTEGER,
  periodo TEXT,
  total_ventas NUMERIC,
  total_cantidad NUMERIC,
  total_costo NUMERIC,
  margen_bruto NUMERIC,
  margen_pct NUMERIC,
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
  SELECT
    fv.anio,
    fv.mes,
    to_char(to_date(COALESCE(fv.mes, 1)::text, 'MM'), 'Mon') || ' ' || COALESCE(fv.anio, 2026)::text AS periodo,
    COALESCE(SUM(fv.valor), 0) AS total_ventas,
    COALESCE(SUM(fv.cantidad), 0) AS total_cantidad,
    COALESCE(SUM(fv.costo_total), 0) AS total_costo,
    COALESCE(SUM(fv.valor) - SUM(fv.costo_total), 0) AS margen_bruto,
    CASE WHEN SUM(fv.valor) > 0 
      THEN ROUND(((SUM(fv.valor) - SUM(COALESCE(fv.costo_total, 0))) / SUM(fv.valor) * 100)::numeric, 2)
      ELSE 0 END AS margen_pct,
    COUNT(DISTINCT fv.transaccion) AS total_transacciones
  FROM public.fact_ventas fv
  WHERE (p_anio IS NULL OR fv.anio = p_anio)
    AND (p_canal_id IS NULL OR fv.canal_id = p_canal_id)
    AND (p_marca_id IS NULL OR fv.marca_id = p_marca_id)
    AND (p_vendedor_id IS NULL OR fv.vendedor_id = p_vendedor_id OR fv.vendedor2_id = p_vendedor_id)
    AND (p_zona_id IS NULL OR fv.zona_id = p_zona_id OR fv.zona_colombia_id = p_zona_id)
    AND fv.anio IS NOT NULL AND fv.mes IS NOT NULL
  GROUP BY fv.anio, fv.mes
  ORDER BY fv.anio ASC, fv.mes ASC;
END;
$$;

-- 3. Rankings por Dimensión (Vendedores, Marcas, Canales, Líneas, Zonas, etc.)
CREATE OR REPLACE FUNCTION public.get_bi_ranking_dimension(
  p_dimension TEXT,
  p_anio INTEGER DEFAULT NULL,
  p_mes INTEGER DEFAULT NULL,
  p_canal_id BIGINT DEFAULT NULL,
  p_marca_id BIGINT DEFAULT NULL,
  p_vendedor_id BIGINT DEFAULT NULL,
  p_zona_id BIGINT DEFAULT NULL,
  p_limite INTEGER DEFAULT 10
)
RETURNS TABLE (
  id BIGINT,
  nombre TEXT,
  total_ventas NUMERIC,
  total_cantidad NUMERIC,
  total_costo NUMERIC,
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

  IF p_dimension = 'vendedor' THEN
    RETURN QUERY
    SELECT
      d.id,
      COALESCE(d.nombre, 'Sin Vendedor') AS nombre,
      COALESCE(SUM(fv.valor), 0) AS total_ventas,
      COALESCE(SUM(fv.cantidad), 0) AS total_cantidad,
      COALESCE(SUM(fv.costo_total), 0) AS total_costo,
      COALESCE(SUM(fv.valor) - SUM(fv.costo_total), 0) AS margen_bruto,
      CASE WHEN SUM(fv.valor) > 0 THEN ROUND(((SUM(fv.valor) - SUM(COALESCE(fv.costo_total, 0))) / SUM(fv.valor) * 100)::numeric, 2) ELSE 0 END AS margen_pct,
      COUNT(DISTINCT fv.transaccion) AS transacciones
    FROM public.fact_ventas fv
    JOIN public.dim_vendedor d ON d.id = fv.vendedor_id
    WHERE (p_anio IS NULL OR fv.anio = p_anio)
      AND (p_mes IS NULL OR fv.mes = p_mes)
      AND (p_canal_id IS NULL OR fv.canal_id = p_canal_id)
      AND (p_marca_id IS NULL OR fv.marca_id = p_marca_id)
      AND (p_zona_id IS NULL OR fv.zona_id = p_zona_id OR fv.zona_colombia_id = p_zona_id)
    GROUP BY d.id, d.nombre
    ORDER BY total_ventas DESC
    LIMIT p_limite;

  ELSIF p_dimension = 'canal' THEN
    RETURN QUERY
    SELECT
      d.id,
      COALESCE(d.nombre, 'Sin Canal') AS nombre,
      COALESCE(SUM(fv.valor), 0) AS total_ventas,
      COALESCE(SUM(fv.cantidad), 0) AS total_cantidad,
      COALESCE(SUM(fv.costo_total), 0) AS total_costo,
      COALESCE(SUM(fv.valor) - SUM(fv.costo_total), 0) AS margen_bruto,
      CASE WHEN SUM(fv.valor) > 0 THEN ROUND(((SUM(fv.valor) - SUM(COALESCE(fv.costo_total, 0))) / SUM(fv.valor) * 100)::numeric, 2) ELSE 0 END AS margen_pct,
      COUNT(DISTINCT fv.transaccion) AS transacciones
    FROM public.fact_ventas fv
    JOIN public.dim_canal d ON d.id = fv.canal_id
    WHERE (p_anio IS NULL OR fv.anio = p_anio)
      AND (p_mes IS NULL OR fv.mes = p_mes)
      AND (p_marca_id IS NULL OR fv.marca_id = p_marca_id)
      AND (p_vendedor_id IS NULL OR fv.vendedor_id = p_vendedor_id)
      AND (p_zona_id IS NULL OR fv.zona_id = p_zona_id OR fv.zona_colombia_id = p_zona_id)
    GROUP BY d.id, d.nombre
    ORDER BY total_ventas DESC
    LIMIT p_limite;

  ELSIF p_dimension = 'marca' THEN
    RETURN QUERY
    SELECT
      d.id,
      COALESCE(d.nombre, 'Sin Marca') AS nombre,
      COALESCE(SUM(fv.valor), 0) AS total_ventas,
      COALESCE(SUM(fv.cantidad), 0) AS total_cantidad,
      COALESCE(SUM(fv.costo_total), 0) AS total_costo,
      COALESCE(SUM(fv.valor) - SUM(fv.costo_total), 0) AS margen_bruto,
      CASE WHEN SUM(fv.valor) > 0 THEN ROUND(((SUM(fv.valor) - SUM(COALESCE(fv.costo_total, 0))) / SUM(fv.valor) * 100)::numeric, 2) ELSE 0 END AS margen_pct,
      COUNT(DISTINCT fv.transaccion) AS transacciones
    FROM public.fact_ventas fv
    JOIN public.dim_marca d ON d.id = fv.marca_id
    WHERE (p_anio IS NULL OR fv.anio = p_anio)
      AND (p_mes IS NULL OR fv.mes = p_mes)
      AND (p_canal_id IS NULL OR fv.canal_id = p_canal_id)
      AND (p_vendedor_id IS NULL OR fv.vendedor_id = p_vendedor_id)
      AND (p_zona_id IS NULL OR fv.zona_id = p_zona_id OR fv.zona_colombia_id = p_zona_id)
    GROUP BY d.id, d.nombre
    ORDER BY total_ventas DESC
    LIMIT p_limite;

  ELSIF p_dimension = 'linea' THEN
    RETURN QUERY
    SELECT
      d.id,
      COALESCE(d.nombre, 'Sin Línea') AS nombre,
      COALESCE(SUM(fv.valor), 0) AS total_ventas,
      COALESCE(SUM(fv.cantidad), 0) AS total_cantidad,
      COALESCE(SUM(fv.costo_total), 0) AS total_costo,
      COALESCE(SUM(fv.valor) - SUM(fv.costo_total), 0) AS margen_bruto,
      CASE WHEN SUM(fv.valor) > 0 THEN ROUND(((SUM(fv.valor) - SUM(COALESCE(fv.costo_total, 0))) / SUM(fv.valor) * 100)::numeric, 2) ELSE 0 END AS margen_pct,
      COUNT(DISTINCT fv.transaccion) AS transacciones
    FROM public.fact_ventas fv
    JOIN public.dim_linea d ON d.id = fv.linea_id
    WHERE (p_anio IS NULL OR fv.anio = p_anio)
      AND (p_mes IS NULL OR fv.mes = p_mes)
      AND (p_canal_id IS NULL OR fv.canal_id = p_canal_id)
      AND (p_marca_id IS NULL OR fv.marca_id = p_marca_id)
      AND (p_vendedor_id IS NULL OR fv.vendedor_id = p_vendedor_id)
      AND (p_zona_id IS NULL OR fv.zona_id = p_zona_id OR fv.zona_colombia_id = p_zona_id)
    GROUP BY d.id, d.nombre
    ORDER BY total_ventas DESC
    LIMIT p_limite;

  ELSIF p_dimension = 'zona' THEN
    RETURN QUERY
    SELECT
      d.id,
      COALESCE(d.nombre, 'Sin Zona') AS nombre,
      COALESCE(SUM(fv.valor), 0) AS total_ventas,
      COALESCE(SUM(fv.cantidad), 0) AS total_cantidad,
      COALESCE(SUM(fv.costo_total), 0) AS total_costo,
      COALESCE(SUM(fv.valor) - SUM(fv.costo_total), 0) AS margen_bruto,
      CASE WHEN SUM(fv.valor) > 0 THEN ROUND(((SUM(fv.valor) - SUM(COALESCE(fv.costo_total, 0))) / SUM(fv.valor) * 100)::numeric, 2) ELSE 0 END AS margen_pct,
      COUNT(DISTINCT fv.transaccion) AS transacciones
    FROM public.fact_ventas fv
    JOIN public.dim_zona_colombia d ON d.id = fv.zona_colombia_id
    WHERE (p_anio IS NULL OR fv.anio = p_anio)
      AND (p_mes IS NULL OR fv.mes = p_mes)
      AND (p_canal_id IS NULL OR fv.canal_id = p_canal_id)
      AND (p_marca_id IS NULL OR fv.marca_id = p_marca_id)
      AND (p_vendedor_id IS NULL OR fv.vendedor_id = p_vendedor_id)
    GROUP BY d.id, d.nombre
    ORDER BY total_ventas DESC
    LIMIT p_limite;

  ELSIF p_dimension = 'ciudad' THEN
    RETURN QUERY
    SELECT
      d.id,
      COALESCE(d.nombre, 'Sin Ciudad') AS nombre,
      COALESCE(SUM(fv.valor), 0) AS total_ventas,
      COALESCE(SUM(fv.cantidad), 0) AS total_cantidad,
      COALESCE(SUM(fv.costo_total), 0) AS total_costo,
      COALESCE(SUM(fv.valor) - SUM(fv.costo_total), 0) AS margen_bruto,
      CASE WHEN SUM(fv.valor) > 0 THEN ROUND(((SUM(fv.valor) - SUM(COALESCE(fv.costo_total, 0))) / SUM(fv.valor) * 100)::numeric, 2) ELSE 0 END AS margen_pct,
      COUNT(DISTINCT fv.transaccion) AS transacciones
    FROM public.fact_ventas fv
    JOIN public.dim_ciudad d ON d.id = fv.ciudad_id
    WHERE (p_anio IS NULL OR fv.anio = p_anio)
      AND (p_mes IS NULL OR fv.mes = p_mes)
      AND (p_canal_id IS NULL OR fv.canal_id = p_canal_id)
      AND (p_marca_id IS NULL OR fv.marca_id = p_marca_id)
      AND (p_vendedor_id IS NULL OR fv.vendedor_id = p_vendedor_id)
    GROUP BY d.id, d.nombre
    ORDER BY total_ventas DESC
    LIMIT p_limite;

  ELSIF p_dimension = 'coleccion' THEN
    RETURN QUERY
    SELECT
      d.id,
      COALESCE(d.nombre, 'Sin Colección') AS nombre,
      COALESCE(SUM(fv.valor), 0) AS total_ventas,
      COALESCE(SUM(fv.cantidad), 0) AS total_cantidad,
      COALESCE(SUM(fv.costo_total), 0) AS total_costo,
      COALESCE(SUM(fv.valor) - SUM(fv.costo_total), 0) AS margen_bruto,
      CASE WHEN SUM(fv.valor) > 0 THEN ROUND(((SUM(fv.valor) - SUM(COALESCE(fv.costo_total, 0))) / SUM(fv.valor) * 100)::numeric, 2) ELSE 0 END AS margen_pct,
      COUNT(DISTINCT fv.transaccion) AS transacciones
    FROM public.fact_ventas fv
    JOIN public.dim_coleccion d ON d.id = fv.coleccion_id
    WHERE (p_anio IS NULL OR fv.anio = p_anio)
      AND (p_mes IS NULL OR fv.mes = p_mes)
      AND (p_canal_id IS NULL OR fv.canal_id = p_canal_id)
      AND (p_marca_id IS NULL OR fv.marca_id = p_marca_id)
      AND (p_vendedor_id IS NULL OR fv.vendedor_id = p_vendedor_id)
    GROUP BY d.id, d.nombre
    ORDER BY total_ventas DESC
    LIMIT p_limite;

  ELSE
    RETURN QUERY
    SELECT
      0::BIGINT AS id,
      'No soportado'::TEXT AS nombre,
      0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::BIGINT;
  END IF;
END;
$$;

-- 4. Top Productos / SKUs / Prendas
CREATE OR REPLACE FUNCTION public.get_bi_top_productos(
  p_anio INTEGER DEFAULT NULL,
  p_mes INTEGER DEFAULT NULL,
  p_canal_id BIGINT DEFAULT NULL,
  p_marca_id BIGINT DEFAULT NULL,
  p_vendedor_id BIGINT DEFAULT NULL,
  p_limite INTEGER DEFAULT 10
)
RETURNS TABLE (
  sku TEXT,
  producto TEXT,
  prenda_hgi TEXT,
  talla TEXT,
  color TEXT,
  total_ventas NUMERIC,
  total_cantidad NUMERIC,
  total_costo NUMERIC,
  margen_bruto NUMERIC,
  margen_pct NUMERIC
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
    COALESCE(fv.sku, 'N/A') AS sku,
    COALESCE(fv.producto, fv.prenda_hgi, 'Producto sin nombre') AS producto,
    COALESCE(fv.prenda_hgi, '') AS prenda_hgi,
    COALESCE(fv.talla, '') AS talla,
    COALESCE(fv.color, '') AS color,
    COALESCE(SUM(fv.valor), 0) AS total_ventas,
    COALESCE(SUM(fv.cantidad), 0) AS total_cantidad,
    COALESCE(SUM(fv.costo_total), 0) AS total_costo,
    COALESCE(SUM(fv.valor) - SUM(fv.costo_total), 0) AS margen_bruto,
    CASE WHEN SUM(fv.valor) > 0 THEN ROUND(((SUM(fv.valor) - SUM(COALESCE(fv.costo_total, 0))) / SUM(fv.valor) * 100)::numeric, 2) ELSE 0 END AS margen_pct
  FROM public.fact_ventas fv
  WHERE (p_anio IS NULL OR fv.anio = p_anio)
    AND (p_mes IS NULL OR fv.mes = p_mes)
    AND (p_canal_id IS NULL OR fv.canal_id = p_canal_id)
    AND (p_marca_id IS NULL OR fv.marca_id = p_marca_id)
    AND (p_vendedor_id IS NULL OR fv.vendedor_id = p_vendedor_id)
  GROUP BY fv.sku, fv.producto, fv.prenda_hgi, fv.talla, fv.color
  ORDER BY total_ventas DESC
  LIMIT p_limite;
END;
$$;

-- Permisos
GRANT EXECUTE ON FUNCTION public.get_bi_kpis(INTEGER, INTEGER, BIGINT, BIGINT, BIGINT, BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_bi_ventas_tiempo(INTEGER, BIGINT, BIGINT, BIGINT, BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_bi_ranking_dimension(TEXT, INTEGER, INTEGER, BIGINT, BIGINT, BIGINT, BIGINT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_bi_top_productos(INTEGER, INTEGER, BIGINT, BIGINT, BIGINT, INTEGER) TO authenticated;
