-- =========================================================================
-- SCRIPT DE LIMPIEZA TOTAL Y REINICIO COMPLETO DE TODAS LAS TABLAS (A CERO)
-- =========================================================================

-- 1. Vaciar todas las tablas de hechos, cargas y todas las dimensiones/catálogos
TRUNCATE TABLE 
  public.fact_ventas,
  public.cargas,
  public.dim_vendedor,
  public.dim_tercero,
  public.dim_zona,
  public.dim_ciudad,
  public.dim_linea,
  public.dim_coleccion,
  public.dim_canal,
  public.dim_zona2,
  public.dim_pais,
  public.dim_zona_colombia,
  public.dim_correria,
  public.dim_marca
RESTART IDENTITY CASCADE;

-- 2. Asegurar permisos totales y desactivar bloqueos RLS
ALTER TABLE public.cargas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.fact_ventas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_vendedor DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_tercero DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_zona DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_ciudad DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_linea DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_coleccion DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_canal DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_zona2 DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_pais DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_zona_colombia DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_correria DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_marca DISABLE ROW LEVEL SECURITY;

GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- 3. Verificación de resultado (todas deben mostrar 0)
SELECT 
  'fact_ventas' AS tabla, count(*) AS filas FROM public.fact_ventas
UNION ALL SELECT 'cargas', count(*) FROM public.cargas
UNION ALL SELECT 'dim_canal', count(*) FROM public.dim_canal
UNION ALL SELECT 'dim_ciudad', count(*) FROM public.dim_ciudad
UNION ALL SELECT 'dim_coleccion', count(*) FROM public.dim_coleccion
UNION ALL SELECT 'dim_correria', count(*) FROM public.dim_correria
UNION ALL SELECT 'dim_linea', count(*) FROM public.dim_linea
UNION ALL SELECT 'dim_marca', count(*) FROM public.dim_marca
UNION ALL SELECT 'dim_pais', count(*) FROM public.dim_pais
UNION ALL SELECT 'dim_tercero', count(*) FROM public.dim_tercero
UNION ALL SELECT 'dim_vendedor', count(*) FROM public.dim_vendedor
UNION ALL SELECT 'dim_zona', count(*) FROM public.dim_zona
UNION ALL SELECT 'dim_zona2', count(*) FROM public.dim_zona2
UNION ALL SELECT 'dim_zona_colombia', count(*) FROM public.dim_zona_colombia;
