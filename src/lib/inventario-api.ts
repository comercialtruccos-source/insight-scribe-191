import { createClient } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";

export const INVENTORY_SUPABASE_URL = "https://xdssybdyksxymjmloxqp.supabase.co";
export const INVENTORY_SUPABASE_KEY = "sb_publishable_v9seuRqhqBcnBvv8-x0zkg_J43brvVi";

export const inventorySupabase = createClient(INVENTORY_SUPABASE_URL, INVENTORY_SUPABASE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export interface FilaInventarioReal {
  id: string;
  referencia: string | null;
  descripcion: string | null;
  talla_lote: string | null;
  color: string | null;
  saldo: number | null;
  talla: string | null;
  cod_color: string | null;
  sku: string | null;
  pvm: number | null;
  pvp: number | null;
  created_at: string | null;
  image_url: string | null;
  precio_usd: number | null;
  bodega: string | null;
}

export interface ReferenciaStockAgrupada {
  referencia: string;
  descripcion: string;
  saldoTotal: number;
  pvm: number;
  pvp: number;
  image_url: string | null;
  bodegas: string[];
  variantesCount: number;
  colores: { color: string; saldo: number }[];
  tallas: { talla: string; saldo: number }[];
  estadoStock: "disponible_alto" | "disponible_medio" | "stock_bajo" | "agotado";
}

export interface ResumenInventarioReal {
  totalPrendas: number;
  totalValorPvm: number;
  totalValorPvp: number;
  totalReferencias: number;
  totalSkus: number;
  bodegas: string[];
  topStockReferencias: ReferenciaStockAgrupada[];
  alertasSobrestock: ReferenciaStockAgrupada[];
  alertasStockBajo: ReferenciaStockAgrupada[];
  mapaPorReferencia: Map<string, ReferenciaStockAgrupada>;
}

/**
 * Obtiene todas las filas de inventario real desde la base de datos de Supabase.
 */
export async function obtenerInventarioRaw(): Promise<FilaInventarioReal[]> {
  try {
    const { data, error } = await inventorySupabase
      .from("inventory")
      .select("*")
      .limit(10000);

    if (error) {
      console.error("[Inventario API] Error al obtener inventario:", error);
      return [];
    }

    return (data || []) as FilaInventarioReal[];
  } catch (err) {
    console.error("[Inventario API] Excepción al consultar inventario:", err);
    return [];
  }
}

/**
 * Procesa y agrupa el inventario por referencia para consultas rápidas en el Mentor IA.
 */
export function procesarInventarioReal(filas: FilaInventarioReal[]): ResumenInventarioReal {
  let totalPrendas = 0;
  let totalValorPvm = 0;
  let totalValorPvp = 0;

  const bodegasSet = new Set<string>();
  const refMap = new Map<string, ReferenciaStockAgrupada>();

  for (const f of filas) {
    const ref = (f.referencia || "").trim().toUpperCase();
    if (!ref) continue;

    const saldo = Number(f.saldo) || 0;
    const pvm = Number(f.pvm) || 0;
    const pvp = Number(f.pvp) || 0;
    const bodega = (f.bodega || "PRINCIPAL").trim();
    const color = (f.color || "Único").trim();
    const talla = (f.talla || f.talla_lote || "Única").trim();

    totalPrendas += saldo;
    totalValorPvm += saldo * pvm;
    totalValorPvp += saldo * pvp;
    if (bodega) bodegasSet.add(bodega);

    const actual = refMap.get(ref) || {
      referencia: ref,
      descripcion: (f.descripcion || ref).trim(),
      saldoTotal: 0,
      pvm,
      pvp,
      image_url: f.image_url || null,
      bodegas: [],
      variantesCount: 0,
      colores: [],
      tallas: [],
      estadoStock: "agotado",
    };

    actual.saldoTotal += saldo;
    actual.variantesCount += 1;
    if (f.image_url && !actual.image_url) actual.image_url = f.image_url;
    if (pvm > 0 && !actual.pvm) actual.pvm = pvm;
    if (pvp > 0 && !actual.pvp) actual.pvp = pvp;

    if (!actual.bodegas.includes(bodega)) actual.bodegas.push(bodega);

    // Colores
    const colExist = actual.colores.find((c) => c.color.toLowerCase() === color.toLowerCase());
    if (colExist) {
      colExist.saldo += saldo;
    } else {
      actual.colores.push({ color, saldo });
    }

    // Tallas
    const tallaExist = actual.tallas.find((t) => t.talla.toLowerCase() === talla.toLowerCase());
    if (tallaExist) {
      tallaExist.saldo += saldo;
    } else {
      actual.tallas.push({ talla, saldo });
    }

    refMap.set(ref, actual);
  }

  // Clasificar estado de stock
  const listaReferencias = Array.from(refMap.values()).map((r) => {
    let estadoStock: ReferenciaStockAgrupada["estadoStock"] = "agotado";
    if (r.saldoTotal >= 50) estadoStock = "disponible_alto";
    else if (r.saldoTotal >= 10) estadoStock = "disponible_medio";
    else if (r.saldoTotal > 0) estadoStock = "stock_bajo";

    return { ...r, estadoStock };
  });

  // Ordenar por stock disponible descendente
  const sortedStock = [...listaReferencias].sort((a, b) => b.saldoTotal - a.saldoTotal);

  const topStockReferencias = sortedStock.slice(0, 15);
  const alertasSobrestock = sortedStock.filter((r) => r.saldoTotal >= 100);
  const alertasStockBajo = sortedStock.filter((r) => r.saldoTotal > 0 && r.saldoTotal <= 5);

  const mapaPorReferencia = new Map<string, ReferenciaStockAgrupada>(
    listaReferencias.map((r) => [r.referencia.toUpperCase(), r])
  );

  return {
    totalPrendas,
    totalValorPvm,
    totalValorPvp,
    totalReferencias: refMap.size,
    totalSkus: filas.length,
    bodegas: Array.from(bodegasSet),
    topStockReferencias,
    alertasSobrestock,
    alertasStockBajo,
    mapaPorReferencia,
  };
}

/**
 * React Query Hook para cargar y mantener el inventario sincronizado en tiempo real.
 */
export function useInventarioReal() {
  return useQuery({
    queryKey: ["inventario_real_supabase"],
    queryFn: async () => {
      const raw = await obtenerInventarioRaw();
      return procesarInventarioReal(raw);
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
    refetchOnWindowFocus: true,
  });
}
