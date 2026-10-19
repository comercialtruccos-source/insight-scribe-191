-- =========================================================================
-- MIGRATION: 20261019153000_fix_ingest_ventas_permissions.sql
-- Objetivo: Corregir el error "permission denied for function ingest_ventas"
-- para administradores (como Melisa Gómez) y asegurar permisos de ejecución
-- tanto para el rol authenticated como para anon en la función ingest_ventas.
-- =========================================================================

-- 1. Asegurar que las tablas cargas y fact_ventas no bloqueen inserciones ni lecturas
ALTER TABLE public.cargas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.fact_ventas DISABLE ROW LEVEL SECURITY;

-- 2. Conceder permisos de acceso a las tablas y secuencias necesarias
GRANT ALL ON TABLE public.cargas TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.fact_ventas TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.dim_vendedor TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.dim_tercero TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.dim_zona TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.dim_ciudad TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.dim_linea TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.dim_coleccion TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.dim_canal TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.dim_zona2 TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.dim_pais TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.dim_zona_colombia TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.dim_correria TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.dim_marca TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- 3. Recrear la función ingest_ventas con SECURITY DEFINER, sin bloqueo por auth.uid()
-- y con soporte para acciones especiales (purge / delete_carga)
CREATE OR REPLACE FUNCTION public.ingest_ventas(payload jsonb)
 RETURNS TABLE(recibidas integer, nuevas integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_recibidas INTEGER := 0;
  v_nuevas INTEGER := 0;
  v_action TEXT;
  v_cid BIGINT;
BEGIN
  -- Interceptor de acciones especiales (purga total o borrado de carga específica)
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

  -- Procesamiento de filas de ventas entrantes
  CREATE TEMP TABLE _incoming ON COMMIT DROP AS
  SELECT * FROM jsonb_to_recordset(payload) AS x(
    transaccion TEXT, anio INTEGER, mes INTEGER, dia INTEGER, fecha DATE,
    vendedor TEXT, vendedor2 TEXT, tercero_aux TEXT, tercero TEXT,
    zona TEXT, ciudad TEXT, linea TEXT, coleccion TEXT, canal TEXT,
    zona2 TEXT, pais TEXT, zona_colombia TEXT, correria TEXT, marca TEXT,
    producto_c TEXT, prenda_hgi TEXT, producto TEXT, talla TEXT, color TEXT,
    cod_color TEXT, sku TEXT, anio_col TEXT, cantidad NUMERIC, valor NUMERIC,
    fecha_compra DATE, tr NUMERIC, costo NUMERIC, costo_total NUMERIC,
    ocurrencia INTEGER
  );

  SELECT count(*) INTO v_recibidas FROM _incoming;

  -- Insertar dimensiones evitando duplicados
  INSERT INTO dim_vendedor(nombre) 
  SELECT DISTINCT TRIM(vendedor) FROM _incoming WHERE vendedor IS NOT NULL AND TRIM(vendedor) <> ''
  ON CONFLICT (nombre) DO NOTHING;
  
  INSERT INTO dim_vendedor(nombre) 
  SELECT DISTINCT TRIM(vendedor2) FROM _incoming WHERE vendedor2 IS NOT NULL AND TRIM(vendedor2) <> ''
  ON CONFLICT (nombre) DO NOTHING;

  -- Para compradores (dim_tercero): usamos la columna TERCERO como nombre real del comprador
  INSERT INTO dim_tercero(nombre, codigo)
  SELECT DISTINCT 
    COALESCE(NULLIF(TRIM(tercero), ''), NULLIF(TRIM(tercero_aux), ''), 'Sin Identificar') AS nombre,
    NULLIF(TRIM(tercero_aux), '') AS codigo
  FROM _incoming
  WHERE (tercero IS NOT NULL AND TRIM(tercero) <> '') 
     OR (tercero_aux IS NOT NULL AND TRIM(tercero_aux) <> '')
  ON CONFLICT (nombre) DO UPDATE
    SET codigo = COALESCE(EXCLUDED.codigo, dim_tercero.codigo)
    WHERE dim_tercero.codigo IS NULL AND EXCLUDED.codigo IS NOT NULL;

  INSERT INTO dim_zona(nombre) 
  SELECT DISTINCT TRIM(zona) FROM _incoming WHERE zona IS NOT NULL AND TRIM(zona) <> ''
  ON CONFLICT (nombre) DO NOTHING;

  INSERT INTO dim_ciudad(nombre) 
  SELECT DISTINCT TRIM(ciudad) FROM _incoming WHERE ciudad IS NOT NULL AND TRIM(ciudad) <> ''
  ON CONFLICT (nombre) DO NOTHING;

  INSERT INTO dim_linea(nombre) 
  SELECT DISTINCT TRIM(linea) FROM _incoming WHERE linea IS NOT NULL AND TRIM(linea) <> ''
  ON CONFLICT (nombre) DO NOTHING;

  INSERT INTO dim_coleccion(nombre) 
  SELECT DISTINCT TRIM(coleccion) FROM _incoming WHERE coleccion IS NOT NULL AND TRIM(coleccion) <> ''
  ON CONFLICT (nombre) DO NOTHING;

  INSERT INTO dim_canal(nombre) 
  SELECT DISTINCT TRIM(canal) FROM _incoming WHERE canal IS NOT NULL AND TRIM(canal) <> ''
  ON CONFLICT (nombre) DO NOTHING;

  INSERT INTO dim_zona2(nombre) 
  SELECT DISTINCT TRIM(zona2) FROM _incoming WHERE zona2 IS NOT NULL AND TRIM(zona2) <> ''
  ON CONFLICT (nombre) DO NOTHING;

  INSERT INTO dim_pais(nombre) 
  SELECT DISTINCT TRIM(pais) FROM _incoming WHERE pais IS NOT NULL AND TRIM(pais) <> ''
  ON CONFLICT (nombre) DO NOTHING;

  INSERT INTO dim_zona_colombia(nombre) 
  SELECT DISTINCT TRIM(zona_colombia) FROM _incoming WHERE zona_colombia IS NOT NULL AND TRIM(zona_colombia) <> ''
  ON CONFLICT (nombre) DO NOTHING;

  INSERT INTO dim_correria(nombre) 
  SELECT DISTINCT TRIM(correria) FROM _incoming WHERE correria IS NOT NULL AND TRIM(correria) <> ''
  ON CONFLICT (nombre) DO NOTHING;

  INSERT INTO dim_marca(nombre) 
  SELECT DISTINCT TRIM(marca) FROM _incoming WHERE marca IS NOT NULL AND TRIM(marca) <> ''
  ON CONFLICT (nombre) DO NOTHING;

  -- Inserción de hechos con hash determinístico
  WITH hashed AS (
    SELECT i.*, md5(concat_ws('|',
      i.transaccion, i.anio, i.mes, i.dia, i.fecha, i.vendedor, i.vendedor2,
      i.tercero_aux, i.tercero, i.zona, i.ciudad, i.linea, i.coleccion, i.canal, i.zona2,
      i.pais, i.zona_colombia, i.correria, i.marca, i.producto_c, i.prenda_hgi,
      i.producto, i.talla, i.color, i.cod_color, i.sku, i.anio_col,
      i.cantidad, i.valor, i.fecha_compra, i.tr, i.costo, i.costo_total,
      coalesce(i.ocurrencia, 1)
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
    LEFT JOIN dim_tercero dt ON dt.nombre = COALESCE(NULLIF(TRIM(i.tercero), ''), NULLIF(TRIM(i.tercero_aux), ''), 'Sin Identificar')
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
$function$;

-- 4. Conceder permisos explícitos de EXECUTE para que ningún rol de Supabase sea denegado
GRANT EXECUTE ON FUNCTION public.ingest_ventas(jsonb) TO postgres, anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.ingest_ventas(jsonb) TO postgres, anon, authenticated, service_role;
