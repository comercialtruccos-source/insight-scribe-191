REVOKE ALL ON FUNCTION public.ingest_ventas(JSONB) FROM anon;

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
  SELECT * FROM jsonb_to_recordset(payload) AS x(
    transaccion TEXT, anio INTEGER, mes INTEGER, dia INTEGER, fecha DATE,
    vendedor TEXT, vendedor2 TEXT, tercero_aux TEXT, tercero TEXT,
    zona TEXT, ciudad TEXT, linea TEXT, coleccion TEXT, canal TEXT,
    zona2 TEXT, pais TEXT, zona_colombia TEXT, correria TEXT, marca TEXT,
    producto_c TEXT, prenda_hgi TEXT, producto TEXT, talla TEXT, color TEXT,
    cod_color TEXT, sku TEXT, anio_col TEXT, cantidad NUMERIC, valor NUMERIC,
    fecha_compra DATE, tr NUMERIC, costo NUMERIC, costo_total NUMERIC
  );

  SELECT count(*) INTO v_recibidas FROM _incoming;

  INSERT INTO dim_vendedor(nombre) SELECT DISTINCT vendedor FROM _incoming WHERE vendedor IS NOT NULL ON CONFLICT DO NOTHING;
  INSERT INTO dim_vendedor(nombre) SELECT DISTINCT vendedor2 FROM _incoming WHERE vendedor2 IS NOT NULL ON CONFLICT DO NOTHING;
  INSERT INTO dim_tercero(codigo, nombre) SELECT DISTINCT ON (tercero_aux) tercero_aux, tercero FROM _incoming WHERE tercero_aux IS NOT NULL ON CONFLICT DO NOTHING;
  INSERT INTO dim_zona(nombre) SELECT DISTINCT zona FROM _incoming WHERE zona IS NOT NULL ON CONFLICT DO NOTHING;
  INSERT INTO dim_ciudad(nombre) SELECT DISTINCT ciudad FROM _incoming WHERE ciudad IS NOT NULL ON CONFLICT DO NOTHING;
  INSERT INTO dim_linea(nombre) SELECT DISTINCT linea FROM _incoming WHERE linea IS NOT NULL ON CONFLICT DO NOTHING;
  INSERT INTO dim_coleccion(nombre) SELECT DISTINCT coleccion FROM _incoming WHERE coleccion IS NOT NULL ON CONFLICT DO NOTHING;
  INSERT INTO dim_canal(nombre) SELECT DISTINCT canal FROM _incoming WHERE canal IS NOT NULL ON CONFLICT DO NOTHING;
  INSERT INTO dim_zona2(nombre) SELECT DISTINCT zona2 FROM _incoming WHERE zona2 IS NOT NULL ON CONFLICT DO NOTHING;
  INSERT INTO dim_pais(nombre) SELECT DISTINCT pais FROM _incoming WHERE pais IS NOT NULL ON CONFLICT DO NOTHING;
  INSERT INTO dim_zona_colombia(nombre) SELECT DISTINCT zona_colombia FROM _incoming WHERE zona_colombia IS NOT NULL ON CONFLICT DO NOTHING;
  INSERT INTO dim_correria(nombre) SELECT DISTINCT correria FROM _incoming WHERE correria IS NOT NULL ON CONFLICT DO NOTHING;
  INSERT INTO dim_marca(nombre) SELECT DISTINCT marca FROM _incoming WHERE marca IS NOT NULL ON CONFLICT DO NOTHING;

  WITH hashed AS (
    SELECT i.*, md5(concat_ws('|',
      i.transaccion, i.anio, i.mes, i.dia, i.fecha, i.vendedor, i.vendedor2,
      i.tercero_aux, i.zona, i.ciudad, i.linea, i.coleccion, i.canal, i.zona2,
      i.pais, i.zona_colombia, i.correria, i.marca, i.producto_c, i.prenda_hgi,
      i.producto, i.talla, i.color, i.cod_color, i.sku, i.anio_col,
      i.cantidad, i.valor, i.fecha_compra, i.tr, i.costo, i.costo_total
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
    LEFT JOIN dim_vendedor dv ON dv.nombre = i.vendedor
    LEFT JOIN dim_vendedor dv2 ON dv2.nombre = i.vendedor2
    LEFT JOIN dim_tercero dt ON dt.codigo = i.tercero_aux
    LEFT JOIN dim_zona dz ON dz.nombre = i.zona
    LEFT JOIN dim_ciudad dc ON dc.nombre = i.ciudad
    LEFT JOIN dim_linea dl ON dl.nombre = i.linea
    LEFT JOIN dim_coleccion dcol ON dcol.nombre = i.coleccion
    LEFT JOIN dim_canal dcan ON dcan.nombre = i.canal
    LEFT JOIN dim_zona2 dz2 ON dz2.nombre = i.zona2
    LEFT JOIN dim_pais dp ON dp.nombre = i.pais
    LEFT JOIN dim_zona_colombia dzc ON dzc.nombre = i.zona_colombia
    LEFT JOIN dim_correria dcorr ON dcorr.nombre = i.correria
    LEFT JOIN dim_marca dm ON dm.nombre = i.marca
    ON CONFLICT (row_hash) DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO v_nuevas FROM ins;

  DROP TABLE _incoming;
  RETURN QUERY SELECT v_recibidas, v_nuevas;
END;
$$;

REVOKE ALL ON FUNCTION public.ingest_ventas(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ingest_ventas(JSONB) TO authenticated;
