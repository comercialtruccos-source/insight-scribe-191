-- =========================================================================
-- HABILITACIÓN DEFINITIVA DE BORRADO, PURGA Y LIMPIEZA TOTAL EN SUPABASE
-- =========================================================================

-- 1. Deshabilitar RLS en fact_ventas y cargas para que ningún DELETE sea bloqueado silenciosamente
ALTER TABLE public.cargas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.fact_ventas DISABLE ROW LEVEL SECURITY;

-- Asegurar políticas permisivas de lectura, inserción, actualización y borrado
DROP POLICY IF EXISTS "allow_all_cargas" ON public.cargas;
DROP POLICY IF EXISTS "allow_all_fact_ventas" ON public.fact_ventas;
DROP POLICY IF EXISTS "allow_delete_cargas" ON public.cargas;
DROP POLICY IF EXISTS "allow_delete_fact_ventas" ON public.fact_ventas;
DROP POLICY IF EXISTS "auth delete cargas" ON public.cargas;
DROP POLICY IF EXISTS "auth delete fact_ventas" ON public.fact_ventas;

CREATE POLICY "allow_all_cargas" ON public.cargas FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_fact_ventas" ON public.fact_ventas FOR ALL TO public USING (true) WITH CHECK (true);

GRANT ALL ON TABLE public.cargas TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.fact_ventas TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- 2. Actualizar ingest_ventas con interceptor de acciones especiales (purge / delete_carga)
CREATE OR REPLACE FUNCTION public.ingest_ventas(payload JSONB)
RETURNS TABLE (recibidas INTEGER, nuevas INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recibidas INTEGER := 0;
  v_nuevas INTEGER := 0;
  v_action TEXT;
  v_cid BIGINT;
BEGIN
  -- Verificar si es una acción de purga o eliminación de carga
  IF jsonb_typeof(payload) = 'array' AND jsonb_array_length(payload) > 0 THEN
    v_action := payload->0->>'__action__';
    
    IF v_action = 'purge' OR v_action = 'purgar' THEN
      TRUNCATE TABLE public.fact_ventas RESTART IDENTITY CASCADE;
      TRUNCATE TABLE public.cargas RESTART IDENTITY CASCADE;
      RETURN QUERY SELECT 0::integer AS recibidas, 0::integer AS nuevas;
      RETURN;
    END IF;

    IF v_action = 'delete_carga' OR v_action = 'eliminar_carga' THEN
      v_cid := (payload->0->>'carga_id')::bigint;
      IF v_cid IS NOT NULL THEN
        DELETE FROM public.cargas WHERE id = v_cid;
      END IF;
      RETURN QUERY SELECT 0::integer AS recibidas, 0::integer AS nuevas;
      RETURN;
    END IF;
  END IF;

  -- Procesamiento normal de ingesta de ventas
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
  INSERT INTO dim_tercero(codigo, nombre) SELECT DISTINCT ON (tercero_aux) TRIM(tercero_aux), TRIM(tercero) FROM _incoming WHERE tercero_aux IS NOT NULL AND TRIM(tercero_aux) <> '' ON CONFLICT DO NOTHING;
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

  WITH ins AS (
    INSERT INTO fact_ventas (
      row_hash, transaccion, anio, mes, dia, fecha,
      vendedor_id, vendedor2_id, tercero_id, zona_id, ciudad_id, linea_id, coleccion_id,
      canal_id, zona2_id, pais_id, zona_colombia_id, correria_id, marca_id,
      producto_c, prenda_hgi, producto, talla, color, cod_color, sku, anio_col,
      cantidad, valor, fecha_compra, tr, costo, costo_total
    )
    SELECT DISTINCT ON (
      i.transaccion, i.anio, i.mes, i.dia, i.vendedor, i.tercero_aux,
      i.linea, i.canal, i.marca, i.sku, i.talla, i.color, i.cantidad, i.valor, i.occ_num
    )
      md5(
        COALESCE(i.transaccion, '') || '|' ||
        COALESCE(i.anio::text, '') || '|' ||
        COALESCE(i.mes::text, '') || '|' ||
        COALESCE(i.dia::text, '') || '|' ||
        COALESCE(i.vendedor, '') || '|' ||
        COALESCE(i.tercero_aux, '') || '|' ||
        COALESCE(i.linea, '') || '|' ||
        COALESCE(i.canal, '') || '|' ||
        COALESCE(i.marca, '') || '|' ||
        COALESCE(i.sku, '') || '|' ||
        COALESCE(i.talla, '') || '|' ||
        COALESCE(i.color, '') || '|' ||
        COALESCE(i.cantidad::text, '') || '|' ||
        COALESCE(i.valor::text, '') || '|' ||
        i.occ_num::text
      ) AS row_hash,
      i.transaccion, i.anio, i.mes, i.dia, i.fecha,
      dv.id, dv2.id, dt.id, dz.id, dc.id, dl.id, dcol.id,
      dcan.id, dz2.id, dp.id, dzc.id, dcorr.id, dm.id,
      i.producto_c, i.prenda_hgi, i.producto, i.talla, i.color, i.cod_color, i.sku, i.anio_col,
      i.cantidad, i.valor, i.fecha_compra, i.tr, i.costo, i.costo_total
    FROM _incoming i
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

  RETURN QUERY SELECT v_recibidas, v_nuevas;
END;
$$;

-- 3. Funciones RPC directas para purga total
CREATE OR REPLACE FUNCTION public.purgar_datos_ventas()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.fact_ventas;

  TRUNCATE TABLE public.fact_ventas RESTART IDENTITY CASCADE;
  TRUNCATE TABLE public.cargas RESTART IDENTITY CASCADE;

  RETURN jsonb_build_object(
    'ok', true, 
    'filas_eliminadas', v_count,
    'mensaje', 'Se han purgado todas las ventas y cargas correctamente. Base de datos restablecida a 0.'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.eliminar_carga(p_carga_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count BIGINT;
BEGIN
  DELETE FROM public.cargas WHERE id = p_carga_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN jsonb_build_object('ok', true, 'eliminadas', v_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.ingest_ventas(JSONB) TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.purgar_datos_ventas() TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.eliminar_carga(BIGINT) TO postgres, anon, authenticated, service_role;
