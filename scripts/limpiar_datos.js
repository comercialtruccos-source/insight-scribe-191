#!/usr/bin/env node

/**
 * Script interactivo para limpiar todas las tablas (hechos y dimensiones) de Supabase.
 * Uso:
 *   SUPABASE_URL=... SUPABASE_KEY=... node scripts/limpiar_datos.js
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log(`
=============================================================================
SISTEMA DE LIMPIEZA TOTAL DE TABLAS (HECHOS + DIMENSIONES)
=============================================================================

Para vaciar todas las 14 tablas en Supabase de forma instantánea:

1. Abre Supabase > "SQL Editor"
2. Copia y pega el contenido del archivo:
   scripts/limpiar_base_de_datos.sql
3. Haz clic en "Run".
=============================================================================
`);
  process.exit(0);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const TABLAS = [
  "fact_ventas",
  "cargas",
  "dim_vendedor",
  "dim_tercero",
  "dim_zona",
  "dim_ciudad",
  "dim_linea",
  "dim_coleccion",
  "dim_canal",
  "dim_zona2",
  "dim_pais",
  "dim_zona_colombia",
  "dim_correria",
  "dim_marca"
];

async function ejecutarLimpiezaCompleta() {
  console.log("Iniciando vaciado completo de todas las tablas...");

  for (const tabla of TABLAS) {
    try {
      const { error } = await supabase.from(tabla).delete().gte("id", 0);
      if (!error) {
        console.log(`✓ Tabla ${tabla} vaciada.`);
      } else {
        console.log(`- Tabla ${tabla}: ${error.message}`);
      }
    } catch (err) {
      console.log(`- Error en ${tabla}:`, err.message);
    }
  }

  console.log("\nVerificando conteos finales:");
  for (const tabla of TABLAS) {
    const { count } = await supabase.from(tabla).select("id", { count: "exact", head: true });
    console.log(`- ${tabla}: ${count ?? 0} filas`);
  }

  console.log("\nLimpieza completada.");
}

ejecutarLimpiezaCompleta();
