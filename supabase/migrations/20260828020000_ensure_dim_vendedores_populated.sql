-- =========================================================================
-- GARANTIZAR CATÁLOGO COMPLETO DE VENDEDORES Y ACCESO RLS
-- =========================================================================

-- 1. Asegurar políticas de lectura en dim_vendedor para todos los usuarios autenticados
ALTER TABLE public.dim_vendedor ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth read dim_vendedor" ON public.dim_vendedor;
CREATE POLICY "auth read dim_vendedor" ON public.dim_vendedor FOR SELECT TO public USING (true);

-- 2. Asegurar permisos de lectura
GRANT SELECT ON public.dim_vendedor TO authenticated, anon;
GRANT SELECT ON public.dim_canal TO authenticated, anon;
GRANT SELECT ON public.dim_marca TO authenticated, anon;
GRANT SELECT ON public.dim_linea TO authenticated, anon;
GRANT SELECT ON public.dim_zona_colombia TO authenticated, anon;
GRANT SELECT ON public.dim_ciudad TO authenticated, anon;

-- 3. Función RPC para obtener catálogo de vendedores garantizado
CREATE OR REPLACE FUNCTION public.get_bi_catalogo_vendedores()
RETURNS TABLE (id BIGINT, nombre TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT dv.id, TRIM(dv.nombre) AS nombre
  FROM public.dim_vendedor dv
  WHERE dv.nombre IS NOT NULL AND TRIM(dv.nombre) <> ''
  ORDER BY nombre ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_bi_catalogo_vendedores() TO authenticated, anon;
