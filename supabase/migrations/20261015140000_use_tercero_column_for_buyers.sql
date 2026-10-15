-- Migration: 20261015140000_use_tercero_column_for_buyers.sql
-- Goal: Use source column TERCERO as the real name of the buyer (comprador).
-- Key dim_tercero on nombre (buyer name) instead of tercero_aux, and link fact_ventas to buyer.

-- 1. Quitar la restricción UNIQUE de 'codigo' en dim_tercero para permitir múltiples compradores sin NIT o con 'NO APLICA'
ALTER TABLE public.dim_tercero DROP CONSTRAINT IF EXISTS dim_tercero_codigo_key;
ALTER TABLE public.dim_tercero ALTER COLUMN codigo DROP NOT NULL;

-- 2. Normalizar nombres existentes y eliminar duplicados de nombre en dim_tercero si existieran
UPDATE public.dim_tercero 
SET nombre = TRIM(nombre)
WHERE nombre IS NOT NULL;

DO $$
DECLARE
  r RECORD;
  keep_id BIGINT;
BEGIN
  FOR r IN 
    SELECT LOWER(TRIM(nombre)) AS norm_nom, array_agg(id ORDER BY id ASC) AS ids
    FROM public.dim_tercero
    WHERE nombre IS NOT NULL AND TRIM(nombre) <> ''
    GROUP BY LOWER(TRIM(nombre))
    HAVING count(*) > 1
  LOOP
    keep_id := r.ids[1];
    UPDATE public.fact_ventas
    SET tercero_id = keep_id
    WHERE tercero_id = ANY(r.ids[2:]);
    DELETE FROM public.dim_tercero
    WHERE id = ANY(r.ids[2:]);
  END LOOP;
END $$;

-- 3. Crear restricción UNIQUE sobre 'nombre' en dim_tercero
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'dim_tercero_nombre_key'
  ) THEN
    ALTER TABLE public.dim_tercero ADD CONSTRAINT dim_tercero_nombre_key UNIQUE (nombre);
  END IF;
END $$;

-- 4. Reparar registros históricos donde una persona física quedó asociada erróneamente al código 'NO APLICA' o 'GENERAL'
DO $$
DECLARE
  rec RECORD;
  v_old_nombre TEXT;
BEGIN
  FOR rec IN 
    SELECT id, nombre, codigo 
    FROM public.dim_tercero 
    WHERE UPPER(TRIM(COALESCE(codigo, ''))) IN ('NO APLICA', 'GENERAL', 'VARIOS')
      AND UPPER(TRIM(nombre)) NOT LIKE '%MOSTRADOR%'
      AND UPPER(TRIM(nombre)) NOT LIKE '%CONSUMIDOR FINAL%'
      AND UPPER(TRIM(nombre)) NOT LIKE '%SIN IDENTIFICAR%'
      AND UPPER(TRIM(nombre)) NOT LIKE '%VENTAS GENERALES%'
  LOOP
    v_old_nombre := TRIM(rec.nombre);
    
    -- Insertar un registro limpio e independiente para la persona real
    INSERT INTO public.dim_tercero (nombre, codigo)
    VALUES (v_old_nombre, NULL)
    ON CONFLICT (nombre) DO NOTHING;
    
    -- El registro masivo de ventas de mostrador / no aplica se renombra a su verdadera naturaleza
    UPDATE public.dim_tercero
    SET nombre = 'Venta Mostrador / Sin Identificar (Consumidor Final)'
    WHERE id = rec.id;
  END LOOP;
END $$;

-- 5. Actualizar la función ingest_ventas para extraer el comprador de la columna TERCERO
CREATE OR REPLACE FUNCTION public.ingest_ventas(payload jsonb)
 RETURNS TABLE(recibidas integer, nuevas integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    fecha_compra DATE, tr NUMERIC, costo NUMERIC, costo_total NUMERIC,
    ocurrencia INTEGER
  );

  SELECT count(*) INTO v_recibidas FROM _incoming;

  -- Dimensiones comerciales y operativas
  INSERT INTO dim_vendedor(nombre) 
  SELECT DISTINCT TRIM(vendedor) FROM _incoming 
  WHERE vendedor IS NOT NULL AND TRIM(vendedor) <> '' 
  ON CONFLICT DO NOTHING;

  INSERT INTO dim_vendedor(nombre) 
  SELECT DISTINCT TRIM(vendedor2) FROM _incoming 
  WHERE vendedor2 IS NOT NULL AND TRIM(vendedor2) <> '' 
  ON CONFLICT DO NOTHING;

  -- DIMENSIÓN TERCERO: Usar la columna TERCERO como el nombre real del comprador
  INSERT INTO dim_tercero(nombre, codigo)
  SELECT DISTINCT ON (TRIM(tercero))
    TRIM(tercero) AS nombre,
    NULLIF(TRIM(tercero_aux), '') AS codigo
  FROM _incoming
  WHERE tercero IS NOT NULL AND TRIM(tercero) <> ''
  ON CONFLICT (nombre) DO UPDATE
    SET codigo = COALESCE(EXCLUDED.codigo, dim_tercero.codigo);

  -- Fallback para registros sin columna TERCERO
  INSERT INTO dim_tercero(nombre, codigo)
  SELECT DISTINCT ON (TRIM(tercero_aux))
    TRIM(tercero_aux) AS nombre,
    NULLIF(TRIM(tercero_aux), '') AS codigo
  FROM _incoming
  WHERE (tercero IS NULL OR TRIM(tercero) = '')
    AND tercero_aux IS NOT NULL AND TRIM(tercero_aux) <> ''
  ON CONFLICT (nombre) DO NOTHING;

  -- Fallback de seguridad para transacciones anónimas
  INSERT INTO dim_tercero(nombre, codigo)
  VALUES ('Sin Identificar', 'NO APLICA')
  ON CONFLICT (nombre) DO NOTHING;

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
