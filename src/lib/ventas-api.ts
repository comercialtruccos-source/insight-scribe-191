import { supabase } from "@/integrations/supabase/client";

export async function obtenerResumenCliente() {
  const [ventas, cargas, ultimas, rango] = await Promise.all([
    supabase.from("fact_ventas").select("id", { count: "exact", head: true }),
    supabase.from("cargas").select("id", { count: "exact", head: true }),
    supabase
      .from("cargas")
      .select("id, archivo, filas_recibidas, filas_nuevas, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("fact_ventas")
      .select("fecha")
      .order("fecha", { ascending: false })
      .limit(1),
  ]);

  return {
    totalVentas: ventas.count ?? 0,
    totalCargas: cargas.count ?? 0,
    ultimaFecha: rango.data?.[0]?.fecha ?? null,
    historial: ultimas.data ?? [],
  };
}

export async function ingestarLoteCliente(filas: unknown[]) {
  const { data: res, error } = await supabase.rpc("ingest_ventas", {
    payload: filas as never,
  });
  if (error) throw new Error(error.message);
  const fila = Array.isArray(res) ? res[0] : res;
  return {
    recibidas: Number(fila?.recibidas ?? 0),
    nuevas: Number(fila?.nuevas ?? 0),
  };
}

export async function registrarCargaCliente(
  archivo: string,
  recibidas: number,
  nuevas: number
) {
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase.from("cargas").insert({
    archivo,
    filas_recibidas: recibidas,
    filas_nuevas: nuevas,
    filas_duplicadas: Math.max(0, recibidas - nuevas),
    usuario_id: userData?.user?.id ?? null,
  });
  if (error) throw new Error(error.message);
  return { ok: true };
}
