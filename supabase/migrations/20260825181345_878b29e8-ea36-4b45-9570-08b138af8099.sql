-- ============ DIMENSIONES ============
CREATE TABLE public.dim_vendedor (id BIGSERIAL PRIMARY KEY, nombre TEXT NOT NULL UNIQUE);
CREATE TABLE public.dim_tercero (id BIGSERIAL PRIMARY KEY, codigo TEXT NOT NULL UNIQUE, nombre TEXT);
CREATE TABLE public.dim_zona (id BIGSERIAL PRIMARY KEY, nombre TEXT NOT NULL UNIQUE);
CREATE TABLE public.dim_ciudad (id BIGSERIAL PRIMARY KEY, nombre TEXT NOT NULL UNIQUE);
CREATE TABLE public.dim_linea (id BIGSERIAL PRIMARY KEY, nombre TEXT NOT NULL UNIQUE);
CREATE TABLE public.dim_coleccion (id BIGSERIAL PRIMARY KEY, nombre TEXT NOT NULL UNIQUE);
CREATE TABLE public.dim_canal (id BIGSERIAL PRIMARY KEY, nombre TEXT NOT NULL UNIQUE);
CREATE TABLE public.dim_zona2 (id BIGSERIAL PRIMARY KEY, nombre TEXT NOT NULL UNIQUE);
CREATE TABLE public.dim_pais (id BIGSERIAL PRIMARY KEY, nombre TEXT NOT NULL UNIQUE);
CREATE TABLE public.dim_zona_colombia (id BIGSERIAL PRIMARY KEY, nombre TEXT NOT NULL UNIQUE);
CREATE TABLE public.dim_correria (id BIGSERIAL PRIMARY KEY, nombre TEXT NOT NULL UNIQUE);
CREATE TABLE public.dim_marca (id BIGSERIAL PRIMARY KEY, nombre TEXT NOT NULL UNIQUE);

-- ============ HECHOS ============
CREATE TABLE public.fact_ventas (
  id BIGSERIAL PRIMARY KEY,
  row_hash TEXT NOT NULL UNIQUE,
  transaccion TEXT,
  anio INTEGER,
  mes INTEGER,
  dia INTEGER,
  fecha DATE,
  vendedor_id BIGINT REFERENCES public.dim_vendedor(id),
  vendedor2_id BIGINT REFERENCES public.dim_vendedor(id),
  tercero_id BIGINT REFERENCES public.dim_tercero(id),
  zona_id BIGINT REFERENCES public.dim_zona(id),
  ciudad_id BIGINT REFERENCES public.dim_ciudad(id),
  linea_id BIGINT REFERENCES public.dim_linea(id),
  coleccion_id BIGINT REFERENCES public.dim_coleccion(id),
  canal_id BIGINT REFERENCES public.dim_canal(id),
  zona2_id BIGINT REFERENCES public.dim_zona2(id),
  pais_id BIGINT REFERENCES public.dim_pais(id),
  zona_colombia_id BIGINT REFERENCES public.dim_zona_colombia(id),
  correria_id BIGINT REFERENCES public.dim_correria(id),
  marca_id BIGINT REFERENCES public.dim_marca(id),
  producto_c TEXT,
  prenda_hgi TEXT,
  producto TEXT,
  talla TEXT,
  color TEXT,
  cod_color TEXT,
  sku TEXT,
  anio_col TEXT,
  cantidad NUMERIC DEFAULT 0,
  valor NUMERIC DEFAULT 0,
  fecha_compra DATE,
  tr NUMERIC,
  costo NUMERIC,
  costo_total NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_fact_ventas_fecha ON public.fact_ventas(fecha);
CREATE INDEX idx_fact_ventas_anio_mes ON public.fact_ventas(anio, mes);
CREATE INDEX idx_fact_ventas_sku ON public.fact_ventas(sku);

CREATE TABLE public.cargas (
  id BIGSERIAL PRIMARY KEY,
  archivo TEXT NOT NULL,
  filas_recibidas INTEGER NOT NULL DEFAULT 0,
  filas_nuevas INTEGER NOT NULL DEFAULT 0,
  filas_duplicadas INTEGER NOT NULL DEFAULT 0,
  usuario_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ GRANTS ============
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dim_vendedor, public.dim_tercero, public.dim_zona, public.dim_ciudad, public.dim_linea, public.dim_coleccion, public.dim_canal, public.dim_zona2, public.dim_pais, public.dim_zona_colombia, public.dim_correria, public.dim_marca, public.fact_ventas, public.cargas TO authenticated;
GRANT ALL ON public.dim_vendedor, public.dim_tercero, public.dim_zona, public.dim_ciudad, public.dim_linea, public.dim_coleccion, public.dim_canal, public.dim_zona2, public.dim_pais, public.dim_zona_colombia, public.dim_correria, public.dim_marca, public.fact_ventas, public.cargas TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ============ RLS ============
ALTER TABLE public.dim_vendedor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_tercero ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_zona ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_ciudad ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_linea ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_coleccion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_canal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_zona2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_pais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_zona_colombia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_correria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_marca ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fact_ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cargas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read dim_vendedor" ON public.dim_vendedor FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read dim_tercero" ON public.dim_tercero FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read dim_zona" ON public.dim_zona FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read dim_ciudad" ON public.dim_ciudad FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read dim_linea" ON public.dim_linea FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read dim_coleccion" ON public.dim_coleccion FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read dim_canal" ON public.dim_canal FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read dim_zona2" ON public.dim_zona2 FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read dim_pais" ON public.dim_pais FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read dim_zona_colombia" ON public.dim_zona_colombia FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read dim_correria" ON public.dim_correria FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read dim_marca" ON public.dim_marca FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read fact_ventas" ON public.fact_ventas FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read cargas" ON public.cargas FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert cargas" ON public.cargas FOR INSERT TO authenticated WITH CHECK (auth.uid() = usuario_id);

-- ============ FUNCION DE CARGA INCREMENTAL ============
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
    fecha_compra DATE, tr NUMERIC, costo NUMERIC, costo_total NUMERIC,
    row_hash TEXT
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

  WITH ins AS (
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
    FROM _incoming i
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

REVOKE ALL ON FUNCTION public.ingest_ventas(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ingest_ventas(JSONB) TO authenticated;
