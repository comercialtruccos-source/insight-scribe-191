-- =========================================================================
-- FUNCIONES DE LIMPIEZA, PURGA Y ELIMINACIÓN DE CARGAS / VENTAS
-- =========================================================================

-- 1. Eliminar una carga específica del historial
CREATE OR REPLACE FUNCTION public.eliminar_carga(p_carga_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  DELETE FROM public.cargas WHERE id = p_carga_id;

  RETURN jsonb_build_object('ok', true, 'mensaje', 'Registro de carga eliminado.');
END;
$$;

-- 2. Purgar todos los datos de ventas para permitir recargar archivo limpio desde cero
CREATE OR REPLACE FUNCTION public.purgar_datos_ventas()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count BIGINT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT COUNT(*) INTO v_count FROM public.fact_ventas;

  -- Truncar fact_ventas y cargas de forma segura
  TRUNCATE TABLE public.fact_ventas RESTART IDENTITY CASCADE;
  TRUNCATE TABLE public.cargas RESTART IDENTITY CASCADE;

  RETURN jsonb_build_object(
    'ok', true, 
    'filas_eliminadas', v_count,
    'mensaje', 'Se han eliminado todas las ventas y cargas correctamente. La base de datos está lista para una carga limpia.'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.eliminar_carga(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.purgar_datos_ventas() TO authenticated;
