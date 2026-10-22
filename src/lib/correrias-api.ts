import { supabase } from "@/integrations/supabase/client";
import type { FilaFactVentas, CatalogoItem } from "@/lib/ventas-api";

export type ReferenciaMaestroItem = {
  ref: string;
  nombre: string;
  pvm: number;
  pvp: number;
};

export type ResumenCorreriaItem = {
  correriaId: number | string;
  nombre: string;
  facturacion: number;
  unidades: number;
  referenciasCount: number;
  ticketPromedio: number;
  participacionPct: number;
};

export type FilaTrazabilidadReferencia = {
  ref: string;
  nombre: string;
  prenda: string;
  correriasNombres: string[];
  correriaIds: number[];
  unidades: number;
  facturacion: number;
  ticketPromedio: number;
  pvm: number;
  pvp: number;
  markup: number;
  diferenciaTicketVsPvm: number;
  participacionVenta: number;
  acumuladoVentaPct: number;
  paretoClase: "A" | "B" | "C";
  tieneMaestro: boolean;
};

export type PrendaResumen = {
  prenda: string;
  unidades: number;
  facturacion: number;
  participacionPct: number;
  referenciasCount: number;
  precioPromedio: number;
};

export type ReferenciaSinVenta = {
  ref: string;
  nombre: string;
  pvm: number;
  pvp: number;
  markup: number;
};

export type DataDashboardCorrerias = {
  kpis: {
    facturacionTotal: number;
    unidadesTotales: number;
    referenciasVendidas: number;
    totalReferenciasMaestro: number;
    ticketPromedioGlobal: number;
    pvmPromedio: number;
    pvpPromedio: number;
    markupPonderado: number;
    coberturaCatalogoPct: number;
  };
  resumenPorCorreria: ResumenCorreriaItem[];
  rankingReferencias: FilaTrazabilidadReferencia[];
  resumenPorPrenda: PrendaResumen[];
  referenciasSinVentaEnCorreria: ReferenciaSinVenta[];
  prendasDisponibles: string[];
};

/**
 * Normaliza claves de referencia para búsquedas insensibles a mayúsculas, espacios y caracteres especiales.
 */
export function normalizarClaveRef(txt: string): string {
  if (!txt) return "";
  return String(txt)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

/**
 * Carga todo el maestro de referencias desde la tabla 'public.referencias' de Supabase
 * utilizando solicitudes concurrentes paginadas.
 */
export async function cargarMaestroReferenciasMap(): Promise<Map<string, ReferenciaMaestroItem>> {
  const map = new Map<string, ReferenciaMaestroItem>();

  try {
    // 1. Obtener conteo total para calcular lotes
    const { count, error: countErr } = await (supabase as any)
      .from("referencias")
      .select("*", { count: "exact", head: true });

    if (countErr) {
      console.warn("[correrias-api] Error consultando conteo de referencias:", countErr);
      return map;
    }

    const total = count || 0;
    if (total === 0) return map;

    const CHUNK_SIZE = 1000;
    const numChunks = Math.ceil(total / CHUNK_SIZE);
    const offsets = Array.from({ length: numChunks }, (_, i) => i * CHUNK_SIZE);

    // Cargar en paralelo en bloques de 6 concurrentes
    const BATCH_CONCURRENCY = 6;
    for (let i = 0; i < offsets.length; i += BATCH_CONCURRENCY) {
      const batchOffsets = offsets.slice(i, i + BATCH_CONCURRENCY);
      const batchResults = await Promise.all(
        batchOffsets.map((offset) =>
          (supabase as any)
            .from("referencias")
            .select("ref, nombre, pvm, pvp")
            .range(offset, offset + CHUNK_SIZE - 1)
        )
      );

      for (const res of batchResults) {
        if (!res.error && res.data) {
          for (const item of res.data) {
            const rawRef = String(item.ref || "").trim();
            if (!rawRef) continue;
            const norm = normalizarClaveRef(rawRef);
            const val: ReferenciaMaestroItem = {
              ref: rawRef,
              nombre: String(item.nombre || "Sin Nombre").trim(),
              pvm: Number(item.pvm || 0),
              pvp: Number(item.pvp || 0),
            };
            map.set(norm, val);
            // También mapear por clave original
            if (!map.has(rawRef)) {
              map.set(rawRef, val);
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn("[correrias-api] Error cargando maestro de referencias:", err);
  }

  return map;
}

/**
 * Procesa y agrega los datos de fact_ventas y del catálogo maestro de referencias
 * para generar las métricas, KPIs, trazabilidad y curvas del Dashboard de Correrías.
 */
export function calcularDashboardCorrerias({
  ventas,
  catalogoCorrerias = [],
  maestroReferencias,
  correriaFiltro = "todas",
  prendaFiltro = "todas",
  busqueda = "",
}: {
  ventas: FilaFactVentas[];
  catalogoCorrerias?: CatalogoItem[];
  maestroReferencias: Map<string, ReferenciaMaestroItem>;
  correriaFiltro?: string | number;
  prendaFiltro?: string;
  busqueda?: string;
}): DataDashboardCorrerias {
  // Mapa de nombres de correría (id -> nombre, ej. 1 -> C1, 62 -> C2)
  const nombresCorreriaMap = new Map<number, string>();
  for (const c of catalogoCorrerias) {
    nombresCorreriaMap.set(Number(c.id), String(c.nombre).trim());
  }

  // 1. Filtrar ventas según correría seleccionada
  const correriaIdNum = correriaFiltro !== "todas" ? Number(correriaFiltro) : null;
  const busquedaNorm = busqueda.trim().toLowerCase();

  // Conjunto para recolectar prendas disponibles
  const prendasSet = new Set<string>();

  // Agrupador global por correría para la comparativa C1..C5
  const ventasPorCorreriaMap = new Map<
    number | string,
    {
      correriaId: number | string;
      nombre: string;
      facturacion: number;
      unidades: number;
      referenciasSet: Set<string>;
    }
  >();

  // Inicializar correrías conocidas de dim_correria
  for (const c of catalogoCorrerias) {
    ventasPorCorreriaMap.set(c.id, {
      correriaId: c.id,
      nombre: c.nombre,
      facturacion: 0,
      unidades: 0,
      referenciasSet: new Set<string>(),
    });
  }

  // Agrupador por Referencia (para el alcance filtrado)
  type RefAgg = {
    ref: string;
    nombre: string;
    prenda: string;
    correriasSet: Set<string>;
    correriaIdsSet: Set<number>;
    unidades: number;
    facturacion: number;
  };
  const refAggMap = new Map<string, RefAgg>();

  // Agrupador por Prenda HGI
  type PrendaAgg = {
    prenda: string;
    unidades: number;
    facturacion: number;
    referenciasSet: Set<string>;
  };
  const prendaAggMap = new Map<string, PrendaAgg>();

  // Acumuladores de las ventas filtradas
  let facturacionFiltrada = 0;
  let unidadesFiltradas = 0;

  for (const r of ventas) {
    const rawPrenda = String(r.prenda_hgi || "Sin Categoría").trim().toUpperCase();
    prendasSet.add(rawPrenda);

    // Identificar referencia del producto (prioridad: producto_c -> sku -> producto)
    const rawRef = String(r.producto_c || r.sku || r.producto || "").trim();
    if (!rawRef) continue;

    const cId = r.correria_id ? Number(r.correria_id) : 0;
    const nombreCorr = cId > 0 ? nombresCorreriaMap.get(cId) || `Correria ${cId}` : "Sin Correría";

    const v = Number(r.valor || 0);
    const c = Math.round(Number(r.cantidad || 0));

    // Acumular en comparativa general de correrías (sin filtrar por correría)
    if (cId > 0) {
      if (!ventasPorCorreriaMap.has(cId)) {
        ventasPorCorreriaMap.set(cId, {
          correriaId: cId,
          nombre: nombreCorr,
          facturacion: 0,
          unidades: 0,
          referenciasSet: new Set(),
        });
      }
      const cItem = ventasPorCorreriaMap.get(cId)!;
      cItem.facturacion += v;
      cItem.unidades += c;
      cItem.referenciasSet.add(rawRef);
    }

    // Filtro por Correría
    if (correriaIdNum !== null && cId !== correriaIdNum) {
      continue;
    }

    // Filtro por Prenda
    if (prendaFiltro !== "todas" && rawPrenda !== prendaFiltro.trim().toUpperCase()) {
      continue;
    }

    // Filtro por Búsqueda rápida
    if (busquedaNorm) {
      const matchRef = rawRef.toLowerCase().includes(busquedaNorm);
      const matchNombre = String(r.producto || "").toLowerCase().includes(busquedaNorm);
      const matchPrenda = rawPrenda.toLowerCase().includes(busquedaNorm);
      if (!matchRef && !matchNombre && !matchPrenda) continue;
    }

    facturacionFiltrada += v;
    unidadesFiltradas += c;

    // Agrupación por Referencia
    const normRefKey = normalizarClaveRef(rawRef);
    if (!refAggMap.has(normRefKey)) {
      refAggMap.set(normRefKey, {
        ref: rawRef,
        nombre: String(r.producto || "Sin Nombre").trim(),
        prenda: rawPrenda,
        correriasSet: new Set(),
        correriaIdsSet: new Set(),
        unidades: 0,
        facturacion: 0,
      });
    }
    const itemRef = refAggMap.get(normRefKey)!;
    itemRef.unidades += c;
    itemRef.facturacion += v;
    if (nombreCorr) itemRef.correriasSet.add(nombreCorr);
    if (cId > 0) itemRef.correriaIdsSet.add(cId);

    // Agrupación por Prenda
    if (!prendaAggMap.has(rawPrenda)) {
      prendaAggMap.set(rawPrenda, {
        prenda: rawPrenda,
        unidades: 0,
        facturacion: 0,
        referenciasSet: new Set(),
      });
    }
    const itemPrenda = prendaAggMap.get(rawPrenda)!;
    itemPrenda.unidades += c;
    itemPrenda.facturacion += v;
    itemPrenda.referenciasSet.add(rawRef);
  }

  // 2. Construir lista de Trazabilidad de Referencias con cruce contra el Maestro de Productos
  const referenciasVendidasKeys = new Set<string>();
  const rankingReferencias: FilaTrazabilidadReferencia[] = [];

  let sumaPvmPonderado = 0;
  let sumaPvpPonderado = 0;
  let pesoPonderado = 0;

  for (const [normKey, agg] of refAggMap.entries()) {
    referenciasVendidasKeys.add(normKey);

    // Buscar en maestro de referencias
    const maestroItem =
      maestroReferencias.get(normKey) ||
      maestroReferencias.get(agg.ref) ||
      maestroReferencias.get(normalizarClaveRef(agg.ref));

    const pvm = maestroItem?.pvm ?? 0;
    const pvp = maestroItem?.pvp ?? 0;
    const nombreFinal = maestroItem?.nombre && maestroItem.nombre !== "Sin Nombre" ? maestroItem.nombre : agg.nombre;

    const ticketPromedio = agg.unidades > 0 ? Math.round(agg.facturacion / agg.unidades) : 0;
    const markup = pvm > 0 && pvp > 0 ? ((pvp - pvm) / pvm) * 100 : 0;
    const diferenciaTicketVsPvm = pvm > 0 ? ticketPromedio - pvm : 0;
    const participacionVenta = facturacionFiltrada > 0 ? (agg.facturacion / facturacionFiltrada) * 100 : 0;

    if (pvm > 0 && agg.unidades > 0) {
      sumaPvmPonderado += pvm * agg.unidades;
      sumaPvpPonderado += pvp * agg.unidades;
      pesoPonderado += agg.unidades;
    }

    rankingReferencias.push({
      ref: agg.ref,
      nombre: nombreFinal,
      prenda: agg.prenda,
      correriasNombres: Array.from(agg.correriasSet),
      correriaIds: Array.from(agg.correriaIdsSet),
      unidades: agg.unidades,
      facturacion: agg.facturacion,
      ticketPromedio,
      pvm,
      pvp,
      markup,
      diferenciaTicketVsPvm,
      participacionVenta,
      acumuladoVentaPct: 0,
      paretoClase: "C",
      tieneMaestro: Boolean(maestroItem),
    });
  }

  // Ordenar ranking por mayor facturación
  rankingReferencias.sort((a, b) => b.facturacion - a.facturacion);

  // Calcular curva Pareto (A: 0..80%, B: 80..95%, C: 95..100%)
  let sumaAcumulada = 0;
  for (const r of rankingReferencias) {
    sumaAcumulada += r.facturacion;
    const pctAcum = facturacionFiltrada > 0 ? (sumaAcumulada / facturacionFiltrada) * 100 : 0;
    r.acumuladoVentaPct = pctAcum;
    if (pctAcum <= 80) {
      r.paretoClase = "A";
    } else if (pctAcum <= 95) {
      r.paretoClase = "B";
    } else {
      r.paretoClase = "C";
    }
  }

  // 3. Resumen por Prenda / Categoría
  const resumenPorPrenda: PrendaResumen[] = Array.from(prendaAggMap.values())
    .map((p) => ({
      prenda: p.prenda,
      unidades: p.unidades,
      facturacion: p.facturacion,
      participacionPct: facturacionFiltrada > 0 ? (p.facturacion / facturacionFiltrada) * 100 : 0,
      referenciasCount: p.referenciasSet.size,
      precioPromedio: p.unidades > 0 ? Math.round(p.facturacion / p.unidades) : 0,
    }))
    .sort((a, b) => b.facturacion - a.facturacion);

  // 4. Comparativa de Correrías
  const totalFacturacionGlobal = Array.from(ventasPorCorreriaMap.values()).reduce((acc, c) => acc + c.facturacion, 0);
  const resumenPorCorreria: ResumenCorreriaItem[] = Array.from(ventasPorCorreriaMap.values())
    .map((c) => ({
      correriaId: c.correriaId,
      nombre: c.nombre,
      facturacion: c.facturacion,
      unidades: c.unidades,
      referenciasCount: c.referenciasSet.size,
      ticketPromedio: c.unidades > 0 ? Math.round(c.facturacion / c.unidades) : 0,
      participacionPct: totalFacturacionGlobal > 0 ? (c.facturacion / totalFacturacionGlobal) * 100 : 0,
    }))
    .sort((a, b) => {
      // Ordenar por nombre de correría (C1, C2, C3...)
      const numA = parseInt(String(a.nombre).replace(/\D/g, ""), 10) || 0;
      const numB = parseInt(String(b.nombre).replace(/\D/g, ""), 10) || 0;
      return numA - numB;
    });

  // 5. Referencias del Maestro sin Venta en el alcance seleccionado
  const referenciasSinVentaEnCorreria: ReferenciaSinVenta[] = [];
  for (const [normKey, mItem] of maestroReferencias.entries()) {
    // Evitar claves duplicadas sin normalizar
    if (mItem.ref !== normKey && normalizarClaveRef(mItem.ref) !== normKey) continue;

    if (!referenciasVendidasKeys.has(normKey) && !referenciasVendidasKeys.has(normalizarClaveRef(mItem.ref))) {
      // Si hay filtro de búsqueda, aplicar
      if (busquedaNorm) {
        const mRef = mItem.ref.toLowerCase().includes(busquedaNorm);
        const mNom = mItem.nombre.toLowerCase().includes(busquedaNorm);
        if (!mRef && !mNom) continue;
      }
      const markup = mItem.pvm > 0 && mItem.pvp > 0 ? ((mItem.pvp - mItem.pvm) / mItem.pvm) * 100 : 0;
      referenciasSinVentaEnCorreria.push({
        ref: mItem.ref,
        nombre: mItem.nombre,
        pvm: mItem.pvm,
        pvp: mItem.pvp,
        markup,
      });
      // Limitar a 500 para evitar sobrecarga de render
      if (referenciasSinVentaEnCorreria.length >= 500) break;
    }
  }

  // 6. KPIs Globales
  const totalMaestro = maestroReferencias.size > 0 ? Math.round(maestroReferencias.size / 2) : 0; // dividido 2 por doble indexación
  const pvmPromedio = pesoPonderado > 0 ? Math.round(sumaPvmPonderado / pesoPonderado) : 0;
  const pvpPromedio = pesoPonderado > 0 ? Math.round(sumaPvpPonderado / pesoPonderado) : 0;
  const markupPonderado = pvmPromedio > 0 ? ((pvpPromedio - pvmPromedio) / pvmPromedio) * 100 : 0;
  const ticketPromedioGlobal = unidadesFiltradas > 0 ? Math.round(facturacionFiltrada / unidadesFiltradas) : 0;
  const coberturaCatalogoPct = totalMaestro > 0 ? (rankingReferencias.length / totalMaestro) * 100 : 0;

  return {
    kpis: {
      facturacionTotal: facturacionFiltrada,
      unidadesTotales: unidadesFiltradas,
      referenciasVendidas: rankingReferencias.length,
      totalReferenciasMaestro: totalMaestro,
      ticketPromedioGlobal,
      pvmPromedio,
      pvpPromedio,
      markupPonderado,
      coberturaCatalogoPct,
    },
    resumenPorCorreria,
    rankingReferencias,
    resumenPorPrenda,
    referenciasSinVentaEnCorreria,
    prendasDisponibles: Array.from(prendasSet).sort(),
  };
}
