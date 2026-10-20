-- =========================================================================
-- MIGRATION: 20261020110000_delete_unmapped_vendedores_and_add_indexes.sql
-- Objetivo:
-- 1. Crear índices en fact_ventas(vendedor_id) y fact_ventas(vendedor2_id) para
--    optimizar las consultas por asesor y permitir eliminaciones en dim_vendedor
--    sin provocar table-scans ni statement timeouts.
-- 2. Desvincular en fact_ventas cualquier registro que apunte a artefactos de
--    tablas dinámicas o días numéricos (IDs 60928 a 60965).
-- 3. Eliminar de dim_vendedor los registros que no son asesores comerciales:
--    - Días del mes numéricos ("1", "2", ..., "31")
--    - Encabezados de tabla dinámica ("Cuenta de Cantidad", "Etiquetas de fila",
--      "Total general", "total oficial", "#N/D")
--    - Nombres de pruebas ("PROBE_%", "TEST_PROBE_NAME")
-- =========================================================================

-- 1. Crear índices B-Tree en fact_ventas para optimizar filtros y llaves foráneas
CREATE INDEX IF NOT EXISTS idx_fact_ventas_vendedor_id ON public.fact_ventas(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_fact_ventas_vendedor2_id ON public.fact_ventas(vendedor2_id);

-- 2. Desvincular en fact_ventas cualquier referencia a estos IDs no válidos
UPDATE public.fact_ventas
SET vendedor_id = NULL
WHERE vendedor_id IN (
  SELECT id FROM public.dim_vendedor
  WHERE (id >= 60928 AND id <= 60966)
     OR nombre ~ '^\d+$'
     OR TRIM(LOWER(nombre)) IN (
       'cuenta de cantidad',
       'etiquetas de fila',
       'total general',
       'total oficial',
       '#n/d',
       'n/d',
       'test_probe_name'
     )
     OR nombre LIKE 'PROBE_%'
);

UPDATE public.fact_ventas
SET vendedor2_id = NULL
WHERE vendedor2_id IN (
  SELECT id FROM public.dim_vendedor
  WHERE (id >= 60928 AND id <= 60966)
     OR nombre ~ '^\d+$'
     OR TRIM(LOWER(nombre)) IN (
       'cuenta de cantidad',
       'etiquetas de fila',
       'total general',
       'total oficial',
       '#n/d',
       'n/d',
       'test_probe_name'
     )
     OR nombre LIKE 'PROBE_%'
);

-- 3. Eliminar definitivamente los registros no-vendedores de dim_vendedor
DELETE FROM public.dim_vendedor
WHERE (id >= 60928 AND id <= 60966)
   OR nombre ~ '^\d+$'
   OR TRIM(LOWER(nombre)) IN (
     'cuenta de cantidad',
     'etiquetas de fila',
     'total general',
     'total oficial',
     '#n/d',
     'n/d',
     'test_probe_name'
   )
   OR nombre LIKE 'PROBE_%';
