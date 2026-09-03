-- =========================================================================
-- CORRECCIÓN DEFINITIVA DE POLÍTICAS DE ELIMINACIÓN (DELETE RLS) EN CARGAS
-- =========================================================================

-- 1. Políticas de eliminación en cargas para authenticated y anon
ALTER TABLE public.cargas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth delete cargas" ON public.cargas;
DROP POLICY IF EXISTS "public delete cargas" ON public.cargas;
DROP POLICY IF EXISTS "auth delete fact_ventas" ON public.fact_ventas;

CREATE POLICY "auth delete cargas" ON public.cargas FOR DELETE TO public USING (true);
CREATE POLICY "auth update cargas" ON public.cargas FOR UPDATE TO public USING (true);
CREATE POLICY "auth delete fact_ventas" ON public.fact_ventas FOR DELETE TO public USING (true);

GRANT ALL ON public.cargas TO authenticated, anon;
GRANT ALL ON public.fact_ventas TO authenticated, anon;

-- 2. Función RPC para eliminar carga individual con permisos plenos SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.eliminar_carga(p_carga_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_archivo TEXT;
  v_eliminadas BIGINT;
BEGIN
  -- Obtener nombre del archivo si existe
  SELECT archivo INTO v_archivo FROM public.cargas WHERE id = p_carga_id;

  -- Eliminar de cargas
  DELETE FROM public.cargas WHERE id = p_carga_id;
  GET DIAGNOSTICS v_eliminadas = ROW_COUNT;

  RETURN jsonb_build_object(
    'ok', true,
    'eliminadas', v_eliminadas,
    'archivo', v_archivo,
    'mensaje', 'Carga eliminada correctamente.'
  );
END;
$$;

-- 3. Función RPC de purga total
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

  -- Truncar fact_ventas y cargas de forma segura
  TRUNCATE TABLE public.fact_ventas RESTART IDENTITY CASCADE;
  TRUNCATE TABLE public.cargas RESTART IDENTITY CASCADE;

  RETURN jsonb_build_object(
    'ok', true, 
    'filas_eliminadas', v_count,
    'mensaje', 'Se han purgado todas las ventas y cargas correctamente. Base de datos restablecida a 0.'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.eliminar_carga(BIGINT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.purgar_datos_ventas() TO authenticated, anon;
