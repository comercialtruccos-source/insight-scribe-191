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
  mapaPorSku: Map<string, ReferenciaStockAgrupada>;
}

/**
 * Obtiene todas las filas de inventario real desde la base de datos de Supabase usando paginación.
 */
export async function obtenerInventarioRaw(): Promise<FilaInventarioReal[]> {
  try {
    const PAGE_SIZE = 1000;
    let from = 0;
    const allRows: FilaInventarioReal[] = [];

    while (true) {
      const { data, error } = await inventorySupabase
        .from("inventory")
        .select("*")
        .range(from, from + PAGE_SIZE - 1);

      if (error) {
        console.error("[Inventario API] Error al obtener inventario paginado:", error);
        break;
      }

      if (!data || data.length === 0) {
        break;
      }

      allRows.push(...(data as FilaInventarioReal[]));

      if (data.length < PAGE_SIZE) {
        break;
      }

      from += PAGE_SIZE;
    }

    return allRows;
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
  const skuToRefMap = new Map<string, string>();

  for (const f of filas) {
    const ref = (f.referencia || "").trim().toUpperCase();
    const sku = (f.sku || "").trim().toUpperCase();
    if (!ref && !sku) continue;

    const refFinal = ref || sku;

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

    if (sku) {
      skuToRefMap.set(sku, refFinal);
    }

    const actual = refMap.get(refFinal) || {
      referencia: refFinal,
      descripcion: (f.descripcion || refFinal).trim(),
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

    refMap.set(refFinal, actual);
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

  const mapaPorSku = new Map<string, ReferenciaStockAgrupada>();
  for (const [skuKey, refKey] of skuToRefMap.entries()) {
    const item = mapaPorReferencia.get(refKey);
    if (item) {
      mapaPorSku.set(skuKey, item);
    }
  }

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
    mapaPorSku,
  };
}

/**
 * Busca de forma inteligente y exhaustiva el stock de un SKU o Referencia.
 * Siempre retorna un objeto con stock y disponibilidad (0 si no tiene stock físico).
 */
export function buscarStockEnResumen(
  resumen: ResumenInventarioReal | undefined,
  skuOrRef: string
): ReferenciaStockAgrupada {
  const clean = (skuOrRef || "").trim().toUpperCase();

  const fallbackSinStock: ReferenciaStockAgrupada = {
    referencia: clean || "REF",
    descripcion: "",
    saldoTotal: 0,
    pvm: 0,
    pvp: 0,
    image_url: null,
    bodegas: [],
    variantesCount: 0,
    colores: [],
    tallas: [],
    estadoStock: "agotado",
  };

  if (!resumen || !clean) {
    return fallbackSinStock;
  }

  // 1. Coincidencia exacta por SKU
  if (resumen.mapaPorSku?.has(clean)) {
    return resumen.mapaPorSku.get(clean)!;
  }

  // 2. Coincidencia exacta por Referencia
  if (resumen.mapaPorReferencia?.has(clean)) {
    return resumen.mapaPorReferencia.get(clean)!;
  }

  // 3. Coincidencia por Prefijo (el SKU empieza con la Referencia, ej: P22036872U08 -> P22036872)
  let mejorMatchPrefijo: ReferenciaStockAgrupada | undefined = undefined;
  let longitudMax = 0;

  for (const [refKey, item] of resumen.mapaPorReferencia.entries()) {
    if (clean.startsWith(refKey) && refKey.length > longitudMax) {
      mejorMatchPrefijo = item;
      longitudMax = refKey.length;
    }
  }

  if (mejorMatchPrefijo) {
    return mejorMatchPrefijo;
  }

  // 4. Coincidencia por Subcadena
  for (const [refKey, item] of resumen.mapaPorReferencia.entries()) {
    if (clean.includes(refKey) || refKey.includes(clean)) {
      return item;
    }
  }

  // 5. Coincidencia en mapa de SKUs por subcadena
  for (const [skuKey, item] of (resumen.mapaPorSku || new Map()).entries()) {
    if (clean.includes(skuKey) || skuKey.includes(clean)) {
      return item;
    }
  }

  return fallbackSinStock;
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
