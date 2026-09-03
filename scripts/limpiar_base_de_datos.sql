-- =========================================================================
-- SCRIPT DE LIMPIEZA TOTAL Y REINICIO DE DATOS (EJECUTAR EN SUPABASE SQL EDITOR)
-- =========================================================================

-- 1. Vaciar tabla de ventas y tabla de cargas restableciendo contadores a 0
TRUNCATE TABLE public.fact_ventas RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.cargas RESTART IDENTITY CASCADE;

-- 2. Desactivar bloqueos RLS en ambas tablas para permitir futuras eliminaciones
ALTER TABLE public.cargas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.fact_ventas DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_cargas" ON public.cargas;
DROP POLICY IF EXISTS "allow_all_fact_ventas" ON public.fact_ventas;
CREATE POLICY "allow_all_cargas" ON public.cargas FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_fact_ventas" ON public.fact_ventas FOR ALL TO public USING (true) WITH CHECK (true);

GRANT ALL ON TABLE public.cargas TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.fact_ventas TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- 3. Verificación de resultado (debe mostrar 0 y 0)
SELECT 
  (SELECT count(*) FROM public.fact_ventas) AS total_ventas_restantes,
  (SELECT count(*) FROM public.cargas) AS total_cargas_restantes;
