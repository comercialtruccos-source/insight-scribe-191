import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type LoteEntrada = {
  archivo: string;
  filas: unknown[];
};

export const ingestarLote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: LoteEntrada) => {
    if (!input || !Array.isArray(input.filas)) throw new Error("Lote inválido");
    if (input.filas.length > 2000) throw new Error("Lote demasiado grande");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: res, error } = await supabase.rpc("ingest_ventas", {
      payload: data.filas as never,
    });
    if (error) throw new Error(error.message);
    const fila = Array.isArray(res) ? res[0] : res;
    return {
      recibidas: Number(fila?.recibidas ?? 0),
      nuevas: Number(fila?.nuevas ?? 0),
    };
  });

export const registrarCarga = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { archivo: string; recibidas: number; nuevas: number }) => input,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("cargas").insert({
      archivo: data.archivo,
      filas_recibidas: data.recibidas,
      filas_nuevas: data.nuevas,
      filas_duplicadas: Math.max(0, data.recibidas - data.nuevas),
      usuario_id: userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const obtenerResumen = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const [ventas, cargas, ultimas] = await Promise.all([
      supabase
        .from("fact_ventas")
        .select("id", { count: "exact", head: true }),
      supabase.from("cargas").select("id", { count: "exact", head: true }),
      supabase
        .from("cargas")
        .select("id, archivo, filas_recibidas, filas_nuevas, created_at")
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

    const { data: rango } = await supabase
      .from("fact_ventas")
      .select("fecha")
      .order("fecha", { ascending: false })
      .limit(1);

    return {
      totalVentas: ventas.count ?? 0,
      totalCargas: cargas.count ?? 0,
      ultimaFecha: rango?.[0]?.fecha ?? null,
      historial: ultimas.data ?? [],
    };
  });
