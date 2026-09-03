-- =========================================================================
-- PERMISOS TOTALES Y PROCEDIMIENTOS DE PURGA Y ELIMINACIÓN DE DATOS
-- =========================================================================

-- 1. Deshabilitar bloqueo RLS para operaciones de borrado en fact_ventas y cargas
ALTER TABLE public.cargas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.fact_ventas DISABLE ROW LEVEL SECURITY;

-- Asegurar políticas permisivas por si RLS se vuelve a habilitar
DROP POLICY IF EXISTS "allow_all_cargas" ON public.cargas;
DROP POLICY IF EXISTS "allow_all_fact_ventas" ON public.fact_ventas;
DROP POLICY IF EXISTS "auth delete cargas" ON public.cargas;
DROP POLICY IF EXISTS "auth delete fact_ventas" ON public.fact_ventas;

CREATE POLICY "allow_all_cargas" ON public.cargas FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_fact_ventas" ON public.fact_ventas FOR ALL TO public USING (true) WITH CHECK (true);

-- Permisos totales a todos los roles
GRANT ALL ON TABLE public.cargas TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.fact_ventas TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- 2. Variantes de funciones RPC para eliminar carga individual
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

CREATE OR REPLACE FUNCTION public.eliminar_carga(carga_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count BIGINT;
BEGIN
  DELETE FROM public.cargas WHERE id = carga_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN jsonb_build_object('ok', true, 'eliminadas', v_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.eliminar_carga(p_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count BIGINT;
BEGIN
  DELETE FROM public.cargas WHERE id = p_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN jsonb_build_object('ok', true, 'eliminadas', v_count);
END;
$$;

-- 3. Variantes de funciones RPC para purgar todos los datos de ventas y cargas
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

CREATE OR REPLACE FUNCTION public.purgar_ventas()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.purgar_datos_ventas();
END;
$$;

CREATE OR REPLACE FUNCTION public.limpiar_todo()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.purgar_datos_ventas();
END;
$$;

GRANT EXECUTE ON FUNCTION public.eliminar_carga(BIGINT) TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.purgar_datos_ventas() TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.purgar_ventas() TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.limpiar_todo() TO postgres, anon, authenticated, service_role;
