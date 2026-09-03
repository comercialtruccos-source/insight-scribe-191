-- =========================================================================
-- SOPORTE TOTAL PARA TODO EL RANGO DE TIEMPO Y PERIODOS DEL DOCUMENTO
-- =========================================================================

-- 1. Backfill integral para cualquier año histórico (2015 a 2035)
UPDATE public.fact_ventas
SET 
  anio = COALESCE(
    anio,
    EXTRACT(YEAR FROM COALESCE(fecha, fecha_compra))::integer,
    NULLIF(substring(COALESCE(anio_col, '') from '\m(20\d{2})\M'), '')::integer,
    NULLIF(regexp_replace(COALESCE(anio_col, ''), '\D', '', 'g'), '')::integer,
    2025
  ),
  mes = COALESCE(
    mes,
    EXTRACT(MONTH FROM COALESCE(fecha, fecha_compra))::integer,
    1
  ),
  dia = COALESCE(
    dia,
    EXTRACT(DAY FROM COALESCE(fecha, fecha_compra))::integer,
    1
  )
WHERE anio IS NULL OR anio = 0 OR mes IS NULL OR dia IS NULL;

-- 2. Asegurar fecha calculada para el 100% de los registros
UPDATE public.fact_ventas
SET fecha = COALESCE(
  fecha,
  fecha_compra,
  (COALESCE(anio, 2025)::text || '-' || LPAD(COALESCE(mes, 1)::text, 2, '0') || '-' || LPAD(COALESCE(dia, 1)::text, 2, '0'))::date
)
WHERE fecha IS NULL;

-- 3. Función para obtener TODOS los años disponibles
CREATE OR REPLACE FUNCTION public.get_bi_anios_disponibles()
RETURNS TABLE (anio INTEGER)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT COALESCE(fv.anio, EXTRACT(YEAR FROM fv.fecha)::integer) AS anio
  FROM public.fact_ventas fv
  WHERE (fv.anio IS NOT NULL AND fv.anio >= 2000 AND fv.anio <= 2050)
     OR (fv.fecha IS NOT NULL)
  ORDER BY anio DESC;
$$;

-- 4. Función para obtener el rango total de fechas del documento
CREATE OR REPLACE FUNCTION public.get_bi_rango_fechas()
RETURNS TABLE (
  fecha_min DATE,
  fecha_max DATE,
  anios_count INTEGER,
  total_registros BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    MIN(fv.fecha) AS fecha_min,
    MAX(fv.fecha) AS fecha_max,
    COUNT(DISTINCT COALESCE(fv.anio, EXTRACT(YEAR FROM fv.fecha)::integer))::integer AS anios_count,
    COUNT(*)::bigint AS total_registros
  FROM public.fact_ventas fv
  WHERE fv.fecha IS NOT NULL;
$$;

-- 5. Función ingest_ventas mejorada para extracción automática de cualquier fecha/año
CREATE OR REPLACE FUNCTION public.ingest_ventas(payload JSONB)
RETURNS TABLE (recibidas INTEGER, nuevas INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recibidas INTEGER := 0;
  v_nuevas INTEGER := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  CREATE TEMP TABLE _incoming ON COMMIT DROP AS
  SELECT
    x.transaccion,
    COALESCE(
      x.anio, 
      EXTRACT(YEAR FROM COALESCE(x.fecha, x.fecha_compra))::integer,
      NULLIF(substring(COALESCE(x.anio_col, '') from '\m(20\d{2})\M'), '')::integer,
      NULLIF(regexp_replace(COALESCE(x.anio_col, ''), '\D', '', 'g'), '')::integer,
      2025
    ) AS anio,
    COALESCE(
      x.mes, 
      EXTRACT(MONTH FROM COALESCE(x.fecha, x.fecha_compra))::integer, 
      1
    ) AS mes,
    COALESCE(
      x.dia, 
      EXTRACT(DAY FROM COALESCE(x.fecha, x.fecha_compra))::integer, 
      1
    ) AS dia,
    COALESCE(
      x.fecha, 
      x.fecha_compra, 
      (COALESCE(x.anio, 2025)::text || '-' || LPAD(COALESCE(x.mes, 1)::text, 2, '0') || '-' || LPAD(COALESCE(x.dia, 1)::text, 2, '0'))::date
    ) AS fecha,
    x.vendedor, x.vendedor2, x.tercero_aux, x.tercero,
    x.zona, x.ciudad, x.linea, x.coleccion, x.canal,
    x.zona2, x.pais, x.zona_colombia, x.correria, x.marca,
    x.producto_c, x.prenda_hgi, x.producto, x.talla, x.color,
    x.cod_color, x.sku, COALESCE(x.anio_col, x.anio::text) AS anio_col, 
    COALESCE(x.cantidad, 1) AS cantidad, 
    COALESCE(x.valor, 0) AS valor,
    x.fecha_compra, x.tr, x.costo, 
    COALESCE(x.costo_total, (COALESCE(x.costo, 0) * COALESCE(x.cantidad, 1))) AS costo_total,
    ROW_NUMBER() OVER (
      PARTITION BY 
        x.transaccion, x.anio, x.mes, x.dia, x.vendedor, x.tercero_aux,
        x.linea, x.canal, x.marca, x.sku, x.talla, x.color, x.cantidad, x.valor
    ) AS occ_num,
    COALESCE(x.row_index, 0) AS row_index
  FROM jsonb_to_recordset(payload) AS x(
    transaccion TEXT, anio INTEGER, mes INTEGER, dia INTEGER, fecha DATE,
    vendedor TEXT, vendedor2 TEXT, tercero_aux TEXT, tercero TEXT,
    zona TEXT, ciudad TEXT, linea TEXT, coleccion TEXT, canal TEXT,
    zona2 TEXT, pais TEXT, zona_colombia TEXT, correria TEXT, marca TEXT,
    producto_c TEXT, prenda_hgi TEXT, producto TEXT, talla TEXT, color TEXT,
    cod_color TEXT, sku TEXT, anio_col TEXT, cantidad NUMERIC, valor NUMERIC,
    fecha_compra DATE, tr NUMERIC, costo NUMERIC, costo_total NUMERIC,
    row_index BIGINT
  );

  SELECT count(*) INTO v_recibidas FROM _incoming;

  -- Insertar catálogos
  INSERT INTO dim_vendedor(nombre) SELECT DISTINCT TRIM(vendedor) FROM _incoming WHERE vendedor IS NOT NULL AND TRIM(vendedor) <> '' ON CONFLICT DO NOTHING;
  INSERT INTO dim_vendedor(nombre) SELECT DISTINCT TRIM(vendedor2) FROM _incoming WHERE vendedor2 IS NOT NULL AND TRIM(vendedor2) <> '' ON CONFLICT DO NOTHING;
  INSERT INTO dim_tercero(codigo, nombre) SELECT DISTINCT ON (TRIM(tercero_aux)) TRIM(tercero_aux), TRIM(tercero) FROM _incoming WHERE tercero_aux IS NOT NULL AND TRIM(tercero_aux) <> '' ON CONFLICT DO NOTHING;
  INSERT INTO dim_zona(nombre) SELECT DISTINCT TRIM(zona) FROM _incoming WHERE zona IS NOT NULL AND TRIM(zona) <> '' ON CONFLICT DO NOTHING;
  INSERT INTO dim_ciudad(nombre) SELECT DISTINCT TRIM(ciudad) FROM _incoming WHERE ciudad IS NOT NULL AND TRIM(ciudad) <> '' ON CONFLICT DO NOTHING;
  INSERT INTO dim_linea(nombre) SELECT DISTINCT TRIM(linea) FROM _incoming WHERE linea IS NOT NULL AND TRIM(linea) <> '' ON CONFLICT DO NOTHING;
  INSERT INTO dim_coleccion(nombre) SELECT DISTINCT TRIM(coleccion) FROM _incoming WHERE coleccion IS NOT NULL AND TRIM(coleccion) <> '' ON CONFLICT DO NOTHING;
  INSERT INTO dim_canal(nombre) SELECT DISTINCT TRIM(canal) FROM _incoming WHERE canal IS NOT NULL AND TRIM(canal) <> '' ON CONFLICT DO NOTHING;
  INSERT INTO dim_zona2(nombre) SELECT DISTINCT TRIM(zona2) FROM _incoming WHERE zona2 IS NOT NULL AND TRIM(zona2) <> '' ON CONFLICT DO NOTHING;
  INSERT INTO dim_pais(nombre) SELECT DISTINCT TRIM(pais) FROM _incoming WHERE pais IS NOT NULL AND TRIM(pais) <> '' ON CONFLICT DO NOTHING;
  INSERT INTO dim_zona_colombia(nombre) SELECT DISTINCT TRIM(zona_colombia) FROM _incoming WHERE zona_colombia IS NOT NULL AND TRIM(zona_colombia) <> '' ON CONFLICT DO NOTHING;
  INSERT INTO dim_correria(nombre) SELECT DISTINCT TRIM(correria) FROM _incoming WHERE correria IS NOT NULL AND TRIM(correria) <> '' ON CONFLICT DO NOTHING;
  INSERT INTO dim_marca(nombre) SELECT DISTINCT TRIM(marca) FROM _incoming WHERE marca IS NOT NULL AND TRIM(marca) <> '' ON CONFLICT DO NOTHING;

  WITH hashed AS (
    SELECT i.*, 
      md5(concat_ws('|',
        i.transaccion, i.anio, i.mes, i.dia, i.fecha, i.vendedor, i.vendedor2,
        i.tercero_aux, i.zona, i.ciudad, i.linea, i.coleccion, i.canal, i.zona2,
        i.pais, i.zona_colombia, i.correria, i.marca, i.producto_c, i.prenda_hgi,
        i.producto, i.talla, i.color, i.cod_color, i.sku, i.anio_col,
        i.cantidad, i.valor, i.fecha_compra, i.tr, i.costo, i.costo_total,
        i.occ_num, i.row_index
      )) AS row_hash
    FROM _incoming i
  ), ins AS (
    INSERT INTO fact_ventas (
      row_hash, transaccion, anio, mes, dia, fecha,
      vendedor_id, vendedor2_id, tercero_id, zona_id, ciudad_id, linea_id, coleccion_id,
      canal_id, zona2_id, pais_id, zona_colombia_id, correria_id, marca_id,
      producto_c, prenda_hgi, producto, talla, color, cod_color, sku, anio_col,
      cantidad, valor, fecha_compra, tr, costo, costo_total
    )
    SELECT DISTINCT ON (i.row_hash)
      i.row_hash, i.transaccion, i.anio, i.mes, i.dia, i.fecha,
      dv.id, dv2.id, dt.id, dz.id, dc.id, dl.id, dcol.id,
      dcan.id, dz2.id, dp.id, dzc.id, dcorr.id, dm.id,
      i.producto_c, i.prenda_hgi, i.producto, i.talla, i.color, i.cod_color, i.sku, i.anio_col,
      i.cantidad, i.valor, i.fecha_compra, i.tr, i.costo, i.costo_total
    FROM hashed i
    LEFT JOIN dim_vendedor dv ON dv.nombre = TRIM(i.vendedor)
    LEFT JOIN dim_vendedor dv2 ON dv2.nombre = TRIM(i.vendedor2)
    LEFT JOIN dim_tercero dt ON dt.codigo = TRIM(i.tercero_aux)
    LEFT JOIN dim_zona dz ON dz.nombre = TRIM(i.zona)
    LEFT JOIN dim_ciudad dc ON dc.nombre = TRIM(i.ciudad)
    LEFT JOIN dim_linea dl ON dl.nombre = TRIM(i.linea)
    LEFT JOIN dim_coleccion dcol ON dcol.nombre = TRIM(i.coleccion)
    LEFT JOIN dim_canal dcan ON dcan.nombre = TRIM(i.canal)
    LEFT JOIN dim_zona2 dz2 ON dz2.nombre = TRIM(i.zona2)
    LEFT JOIN dim_pais dp ON dp.nombre = TRIM(i.pais)
    LEFT JOIN dim_zona_colombia dzc ON dzc.nombre = TRIM(i.zona_colombia)
    LEFT JOIN dim_correria dcorr ON dcorr.nombre = TRIM(i.correria)
    LEFT JOIN dim_marca dm ON dm.nombre = TRIM(i.marca)
    ON CONFLICT (row_hash) DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO v_nuevas FROM ins;

  DROP TABLE _incoming;
  RETURN QUERY SELECT v_recibidas, v_nuevas;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_bi_anios_disponibles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_bi_rango_fechas() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ingest_ventas(JSONB) TO authenticated;
