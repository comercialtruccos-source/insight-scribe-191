-- =========================================================================
-- MIGRATION: 20261020160000_add_tercero_id_index_fact_ventas.sql
-- Objetivo:
-- Crear índice B-Tree en fact_ventas(tercero_id) para optimizar el filtrado
-- de pedidos y ventas por cliente / comprador (Tercero) y evitar statement
-- timeouts al consultar por comprador.
-- =========================================================================

CREATE INDEX IF NOT EXISTS idx_fact_ventas_tercero_id ON public.fact_ventas(tercero_id);
