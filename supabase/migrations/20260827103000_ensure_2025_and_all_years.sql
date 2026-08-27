-- =========================================================================
-- MIGRACIÓN PARA GARANTIZAR AÑO 2025 Y TODOS LOS AÑOS HISTÓRICOS
-- =========================================================================

-- Backfill de años basados en fecha, fecha_compra y anio_col
UPDATE public.fact_ventas
SET 
  anio = 2025,
  mes = COALESCE(mes, EXTRACT(MONTH FROM COALESCE(fecha, fecha_compra))::integer, 1),
  dia = COALESCE(dia, EXTRACT(DAY FROM COALESCE(fecha, fecha_compra))::integer, 1),
  fecha = COALESCE(fecha, fecha_compra, (2025 || '-' || LPAD(COALESCE(mes, 1)::text, 2, '0') || '-' || LPAD(COALESCE(dia, 1)::text, 2, '0'))::date)
WHERE (anio IS NULL OR anio = 0) AND (
  fecha BETWEEN '2025-01-01' AND '2025-12-31'
  OR fecha_compra BETWEEN '2025-01-01' AND '2025-12-31'
  OR anio_col LIKE '%2025%'
);

UPDATE public.fact_ventas
SET 
  anio = 2026,
  mes = COALESCE(mes, EXTRACT(MONTH FROM COALESCE(fecha, fecha_compra))::integer, 1),
  dia = COALESCE(dia, EXTRACT(DAY FROM COALESCE(fecha, fecha_compra))::integer, 1),
  fecha = COALESCE(fecha, fecha_compra, (2026 || '-' || LPAD(COALESCE(mes, 1)::text, 2, '0') || '-' || LPAD(COALESCE(dia, 1)::text, 2, '0'))::date)
WHERE (anio IS NULL OR anio = 0) AND (
  fecha BETWEEN '2026-01-01' AND '2026-12-31'
  OR fecha_compra BETWEEN '2026-01-01' AND '2026-12-31'
  OR anio_col LIKE '%2026%'
);

-- Actualizar cualquier fila restante que tenga fecha o anio_col
UPDATE public.fact_ventas
SET 
  anio = COALESCE(anio, EXTRACT(YEAR FROM COALESCE(fecha, fecha_compra))::integer, NULLIF(regexp_replace(COALESCE(anio_col, ''), '\D', '', 'g'), '')::integer, 2025),
  mes = COALESCE(mes, EXTRACT(MONTH FROM COALESCE(fecha, fecha_compra))::integer, 1),
  dia = COALESCE(dia, EXTRACT(DAY FROM COALESCE(fecha, fecha_compra))::integer, 1)
WHERE anio IS NULL OR anio = 0;

-- Asegurar fecha para todas las filas
UPDATE public.fact_ventas
SET fecha = (anio::text || '-' || LPAD(mes::text, 2, '0') || '-' || LPAD(dia::text, 2, '0'))::date
WHERE fecha IS NULL AND anio IS NOT NULL AND mes IS NOT NULL AND dia IS NOT NULL;

-- Función RPC para obtener todos los años
CREATE OR REPLACE FUNCTION public.get_bi_anios_disponibles()
RETURNS TABLE (anio INTEGER)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT fv.anio
  FROM public.fact_ventas fv
  WHERE fv.anio IS NOT NULL AND fv.anio >= 2015 AND fv.anio <= 2035
  ORDER BY fv.anio DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_bi_anios_disponibles() TO authenticated;
