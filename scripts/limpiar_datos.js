#!/usr/bin/env node

/**
 * Script interactivo y directo para limpiar la base de datos de Supabase.
 * Uso:
 *   SUPABASE_URL=... SUPABASE_KEY=... node scripts/limpiar_datos.js
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log(`
=============================================================================
SISTEMA DE LIMPIEZA DE BASE DE DATOS
=============================================================================

Para vaciar la base de datos de manera directa y 100% instantánea:

OPCIÓN A (Recomendada - 10 segundos):
1. Abre tu proyecto en Supabase (o el SQL Editor de Lovable Cloud).
2. Ve a la sección "SQL Editor".
3. Copia y pega el contenido del archivo:
   scripts/limpiar_base_de_datos.sql
4. Haz clic en "Run".

OPCIÓN B (Desde terminal):
Ejecuta:
SUPABASE_URL="tu_url_supabase" SUPABASE_KEY="tu_clave_servicio" node scripts/limpiar_datos.js
=============================================================================
`);
  process.exit(0);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function ejecutarLimpieza() {
  console.log("Iniciando purga de datos...");

  // 1. Intentar RPC ingest_ventas con payload especial
  try {
    const { error } = await supabase.rpc("ingest_ventas", {
      payload: [{ __action__: "purge" }],
    });
    if (!error) console.log("✓ Purga vía ingest_ventas ejecutada con éxito.");
  } catch (err) {
    console.log("Nota: ingest_ventas RPC purge:", err.message);
  }

  // 2. Intentar RPC dedicado
  try {
    const { error } = await supabase.rpc("purgar_datos_ventas");
    if (!error) console.log("✓ Purga vía purgar_datos_ventas ejecutada con éxito.");
  } catch (err) {
    console.log("Nota: purgar_datos_ventas RPC:", err.message);
  }

  // 3. Borrado directo en tablas
  try {
    const { error: errVentas } = await supabase.from("fact_ventas").delete().gte("id", 0);
    if (!errVentas) console.log("✓ fact_ventas vaciada.");
    const { error: errCargas } = await supabase.from("cargas").delete().gte("id", 0);
    if (!errCargas) console.log("✓ cargas vaciada.");
  } catch (err) {
    console.log("Nota: Borrado directo:", err.message);
  }

  // Verificación
  const [{ count: countVentas }, { count: countCargas }] = await Promise.all([
    supabase.from("fact_ventas").select("id", { count: "exact", head: true }),
    supabase.from("cargas").select("id", { count: "exact", head: true }),
  ]);

  console.log(`\nEstado final en base de datos:`);
  console.log(`- Ventas restantes: ${countVentas ?? 0}`);
  console.log(`- Cargas restantes: ${countCargas ?? 0}`);
  console.log("\nProceso finalizado.");
}

ejecutarLimpieza();
