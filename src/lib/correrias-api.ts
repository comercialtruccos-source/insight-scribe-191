import {
  esTransaccionFacturacionReal,
  normalizarValorTransaccion,
  normalizarUnidadesTransaccion,
  type FilaFactVentas,
  type CatalogoItem,
} from "@/lib/ventas-api";

export type ReferenciaMaestroItem = {
  ref: string;
  nombre: string;
  pvm: number;
  pvp: number;
};

/**
 * Representa un ciclo temporal específico de correría (ej. C1 2025, C2 2025, C5 2026),
 * delimitado por su año y su rango de fechas reales de ejecución.
 */
export type CicloCorreriaItem = {
  cicloKey: string; // ej. "1___2025"
  correriaId: number | string;
  nombreCorreria: string; // "C1", "C2", etc.
  anio: number; // 2025, 2026
  etiqueta: string; // "C1 (2025)"
  fechaInicio: string; // "2025-01-16"
  fechaFin: string; // "2025-03-24"
  rangoFechasTexto: string; // "16 Ene - 24 Mar 2025"
  duracionDias: number;
  facturacion: number;
  unidades: number;
  referenciasCount: number;
  ticketPromedio: number;
  pvmPromedio: number;
  pvpPromedio: number;
  markupPromedio: number;
  participacionPct: number;
};

export type FilaTrazabilidadReferencia = {
  ref: string;
  nombre: string;
  prenda: string;
  ciclosNombres: string[];
  cicloKeys: string[];
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

export type ComparativaYoYCorreria = {
  nombreCorreria: string;
  anioActual: number;
  anioAnterior: number;
  facturacionActual: number;
  facturacionAnterior: number;
  unidadesActual: number;
  unidadesAnterior: number;
  crecimientoVentaPct: number;
  crecimientoUndsPct: number;
  fechasActual: string;
  fechasAnterior: string;
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
  ciclosDisponibles: CicloCorreriaItem[];
  ciclosFiltrados: CicloCorreriaItem[];
  comparativaYoY: ComparativaYoYCorreria[];
  rankingReferencias: FilaTrazabilidadReferencia[];
  resumenPorPrenda: PrendaResumen[];
  referenciasSinVentaEnCorreria: ReferenciaSinVenta[];
  prendasDisponibles: string[];
  aniosDisponibles: number[];
  rangoFechasActivo: {
    fechaMin: string;
    fechaMax: string;
    texto: string;
    diasActivos: number;
  };
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

const NOMBRES_MESES_CORTOS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function formatearFechaCorta(fechaStr: string): string {
  if (!fechaStr) return "";
  const parts = fechaStr.slice(0, 10).split("-");
  if (parts.length < 3) return fechaStr;
  const dia = parseInt(parts[2], 10);
  const mes = NOMBRES_MESES_CORTOS[parseInt(parts[1], 10) - 1] || parts[1];
  const anio = parts[0];
  return `${dia} ${mes} ${anio}`;
}

export function formatearRangoFechasTexto(fMin: string, fMax: string, anioDefault?: number): string {
  if (!fMin && !fMax) return anioDefault ? `Año ${anioDefault}` : "Sin rango";
  if (!fMin) return formatearFechaCorta(fMax);
  if (!fMax) return formatearFechaCorta(fMin);
  if (fMin === fMax) return formatearFechaCorta(fMin);

  const p1 = fMin.slice(0, 10).split("-");
  const p2 = fMax.slice(0, 10).split("-");
  if (p1.length < 3 || p2.length < 3) return `${fMin} - ${fMax}`;

  const d1 = parseInt(p1[2], 10);
  const m1 = NOMBRES_MESES_CORTOS[parseInt(p1[1], 10) - 1] || p1[1];
  const a1 = p1[0];

  const d2 = parseInt(p2[2], 10);
  const m2 = NOMBRES_MESES_CORTOS[parseInt(p2[1], 10) - 1] || p2[1];
  const a2 = p2[0];

  if (a1 === a2) {
    if (m1 === m2) {
      return `${d1} - ${d2} ${m1} ${a1}`;
    }
    return `${d1} ${m1} - ${d2} ${m2} ${a1}`;
  }
  return `${d1} ${m1} ${a1} - ${d2} ${m2} ${a2}`;
}

/**
 * Carga todo el maestro de referencias desde la tabla 'public.referencias' de Supabase
 * utilizando solicitudes concurrentes paginadas.
 */
export async function cargarMaestroReferenciasMap(): Promise<Map<string, ReferenciaMaestroItem>> {
  const map = new Map<string, ReferenciaMaestroItem>();

  try {
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
 * Procesa y agrega los datos de fact_ventas identificando la temporalidad real
 * de cada correría (Año + Ventana de Fechas), permitiendo comparativas dentro del mismo año
 * e interanuales (YoY).
 */
export function calcularDashboardCorrerias({
  ventas,
  catalogoCorrerias = [],
  maestroReferencias,
  anioFiltro = "todos",
  cicloFiltro = "todos",
  prendaFiltro = "todas",
  busqueda = "",
}: {
  ventas: FilaFactVentas[];
  catalogoCorrerias?: CatalogoItem[];
  maestroReferencias: Map<string, ReferenciaMaestroItem>;
  anioFiltro?: string | number;
  cicloFiltro?: string;
  prendaFiltro?: string;
  busqueda?: string;
}): DataDashboardCorrerias {
  // Mapa de nombres de correría (id -> nombre, ej. 1 -> C1, 62 -> C2, etc.)
  const nombresCorreriaMap = new Map<number, string>();
  for (const c of catalogoCorrerias) {
    nombresCorreriaMap.set(Number(c.id), String(c.nombre).trim());
  }

  const aniosSet = new Set<number>();
  const prendasSet = new Set<string>();

  // 1. Detección y agregación de Ciclos de Correría temporales (correria_id + anio)
  type CicloBuilder = {
    cicloKey: string;
    correriaId: number;
    nombreCorreria: string;
    anio: number;
    fechaMin: string;
    fechaMax: string;
    facturacion: number;
    unidades: number;
    referenciasSet: Set<string>;
    sumaPvmPonderado: number;
    sumaPvpPonderado: number;
    pesoPonderado: number;
  };
  const ciclosMap = new Map<string, CicloBuilder>();

  for (const r of ventas) {
    if (!r.correria_id) continue;
    const cId = Number(r.correria_id);
    let an = Number(r.anio);
    if (!an || isNaN(an)) {
      if (r.fecha) an = parseInt(String(r.fecha).slice(0, 4), 10);
    }
    if (!an || isNaN(an)) {
      if (r.anio_col) {
        const m = String(r.anio_col).match(/\b(20\d{2})\b/);
        if (m && m[1]) an = parseInt(m[1], 10);
      }
    }
    if (!an || isNaN(an)) continue;

    aniosSet.add(an);

    let m = Number(r.mes);
    if ((!m || isNaN(m)) && r.fecha) m = parseInt(String(r.fecha).slice(5, 7), 10);
    if (!m || isNaN(m)) m = 1;
    if (!esTransaccionFacturacionReal(r.transaccion, m, an)) continue;

    const rawRef = String(r.producto_c || r.sku || r.producto || "").trim();
    const fecha = r.fecha ? String(r.fecha).slice(0, 10) : "";
    const v = normalizarValorTransaccion(r.transaccion, Number(r.valor || 0));
    const c = normalizarUnidadesTransaccion(r.transaccion, Number(r.cantidad || 0));

    const cicloKey = `${cId}___${an}`;
    if (!ciclosMap.has(cicloKey)) {
      const nombreC = nombresCorreriaMap.get(cId) || `C${cId}`;
      ciclosMap.set(cicloKey, {
        cicloKey,
        correriaId: cId,
        nombreCorreria: nombreC,
        anio: an,
        fechaMin: fecha,
        fechaMax: fecha,
        facturacion: 0,
        unidades: 0,
        referenciasSet: new Set(),
        sumaPvmPonderado: 0,
        sumaPvpPonderado: 0,
        pesoPonderado: 0,
      });
    }

    const cicloItem = ciclosMap.get(cicloKey)!;
    cicloItem.facturacion += v;
    cicloItem.unidades += c;
    if (rawRef) cicloItem.referenciasSet.add(rawRef);
    if (fecha && (!cicloItem.fechaMin || fecha < cicloItem.fechaMin)) cicloItem.fechaMin = fecha;
    if (fecha && (!cicloItem.fechaMax || fecha > cicloItem.fechaMax)) cicloItem.fechaMax = fecha;

    // Maestro precios
    if (rawRef) {
      const mItem = maestroReferencias.get(normalizarClaveRef(rawRef));
      if (mItem && mItem.pvm > 0 && c > 0) {
        cicloItem.sumaPvmPonderado += mItem.pvm * c;
        cicloItem.sumaPvpPonderado += mItem.pvp * c;
        cicloItem.pesoPonderado += c;
      }
    }
  }

  // Convertir ciclos a array estructurado y ordenado cronológicamente por fechaMin
  const totalFacturacionGlobal = Array.from(ciclosMap.values()).reduce((acc, c) => acc + c.facturacion, 0);

  const ciclosDisponibles: CicloCorreriaItem[] = Array.from(ciclosMap.values())
    .map((c) => {
      const ticketPromedio = c.unidades > 0 ? Math.round(c.facturacion / c.unidades) : 0;
      const pvmPromedio = c.pesoPonderado > 0 ? Math.round(c.sumaPvmPonderado / c.pesoPonderado) : 0;
      const pvpPromedio = c.pesoPonderado > 0 ? Math.round(c.sumaPvpPonderado / c.pesoPonderado) : 0;
      const markupPromedio = pvmPromedio > 0 ? ((pvpPromedio - pvmPromedio) / pvmPromedio) * 100 : 0;
      const participacionPct = totalFacturacionGlobal > 0 ? (c.facturacion / totalFacturacionGlobal) * 100 : 0;

      let duracionDias = 1;
      if (c.fechaMin && c.fechaMax) {
        const t1 = new Date(c.fechaMin).getTime();
        const t2 = new Date(c.fechaMax).getTime();
        if (!isNaN(t1) && !isNaN(t2) && t2 >= t1) {
          duracionDias = Math.round((t2 - t1) / (1000 * 60 * 60 * 24)) + 1;
        }
      }

      return {
        cicloKey: c.cicloKey,
        correriaId: c.correriaId,
        nombreCorreria: c.nombreCorreria,
        anio: c.anio,
        etiqueta: `${c.nombreCorreria} (${c.anio})`,
        fechaInicio: c.fechaMin,
        fechaFin: c.fechaMax,
        rangoFechasTexto: formatearRangoFechasTexto(c.fechaMin, c.fechaMax, c.anio),
        duracionDias,
        facturacion: c.facturacion,
        unidades: c.unidades,
        referenciasCount: c.referenciasSet.size,
        ticketPromedio,
        pvmPromedio,
        pvpPromedio,
        markupPromedio,
        participacionPct,
      };
    })
    .sort((a, b) => {
      // Orden cronológico estricto por fechaInicio
      if (a.fechaInicio && b.fechaInicio && a.fechaInicio !== b.fechaInicio) {
        return a.fechaInicio.localeCompare(b.fechaInicio);
      }
      if (a.anio !== b.anio) return a.anio - b.anio;
      return String(a.nombreCorreria).localeCompare(String(b.nombreCorreria));
    });

  // Filtrar ciclos según año seleccionado
  const ciclosFiltrados = ciclosDisponibles.filter((c) => {
    if (anioFiltro !== "todos" && c.anio !== Number(anioFiltro)) return false;
    if (
      cicloFiltro !== "todos" &&
      c.cicloKey !== cicloFiltro &&
      String(c.correriaId) !== cicloFiltro &&
      c.nombreCorreria !== cicloFiltro
    ) {
      return false;
    }
    return true;
  });

  // 2. Generar Comparativa Interanual YoY para aquellas correrías presentes en más de un año (ej: C1 2026 vs C1 2025)
  const comparativaYoY: ComparativaYoYCorreria[] = [];
  const mapPorNombreYAnio = new Map<string, CicloCorreriaItem>();
  for (const c of ciclosDisponibles) {
    mapPorNombreYAnio.set(`${c.nombreCorreria}___${c.anio}`, c);
  }

  const aniosArray = Array.from(aniosSet).sort((a, b) => b - a);
  const anioMax = aniosArray[0] || 2026;
  const anioPrev = aniosArray[1] || anioMax - 1;

  for (const cActual of ciclosDisponibles.filter((c) => c.anio === anioMax)) {
    const cAnt = mapPorNombreYAnio.get(`${cActual.nombreCorreria}___${anioPrev}`);
    if (cAnt) {
      const crecVenta = cAnt.facturacion > 0 ? ((cActual.facturacion - cAnt.facturacion) / cAnt.facturacion) * 100 : 0;
      const crecUnds = cAnt.unidades > 0 ? ((cActual.unidades - cAnt.unidades) / cAnt.unidades) * 100 : 0;
      comparativaYoY.push({
        nombreCorreria: cActual.nombreCorreria,
        anioActual: cActual.anio,
        anioAnterior: cAnt.anio,
        facturacionActual: cActual.facturacion,
        facturacionAnterior: cAnt.facturacion,
        unidadesActual: cActual.unidades,
        unidadesAnterior: cAnt.unidades,
        crecimientoVentaPct: crecVenta,
        crecimientoUndsPct: crecUnds,
        fechasActual: cActual.rangoFechasTexto,
        fechasAnterior: cAnt.rangoFechasTexto,
      });
    }
  }

  // 3. Procesar las ventas filtradas para la tabla de trazabilidad
  const busquedaNorm = busqueda.trim().toLowerCase();

  type RefAgg = {
    ref: string;
    nombre: string;
    prenda: string;
    ciclosSet: Set<string>;
    cicloKeysSet: Set<string>;
    correriasSet: Set<string>;
    correriaIdsSet: Set<number>;
    unidades: number;
    facturacion: number;
  };
  const refAggMap = new Map<string, RefAgg>();

  type PrendaAgg = {
    prenda: string;
    unidades: number;
    facturacion: number;
    referenciasSet: Set<string>;
  };
  const prendaAggMap = new Map<string, PrendaAgg>();

  let facturacionFiltrada = 0;
  let unidadesFiltradas = 0;
  let minFechaFiltrada = "";
  let maxFechaFiltrada = "";

  for (const r of ventas) {
    const rawPrenda = String(r.prenda_hgi || "Sin Categoría").trim().toUpperCase();
    prendasSet.add(rawPrenda);

    const rawRef = String(r.producto_c || r.sku || r.producto || "").trim();
    if (!rawRef) continue;

    const cId = r.correria_id ? Number(r.correria_id) : 0;
    let an = Number(r.anio);
    if (!an || isNaN(an)) {
      if (r.fecha) an = parseInt(String(r.fecha).slice(0, 4), 10);
    }
    if (!an || isNaN(an)) {
      if (r.anio_col) {
        const m = String(r.anio_col).match(/\b(20\d{2})\b/);
        if (m && m[1]) an = parseInt(m[1], 10);
      }
    }
    if (!an || isNaN(an)) an = 2026;

    const cicloKey = `${cId}___${an}`;
    const nombreCorr = cId > 0 ? nombresCorreriaMap.get(cId) || `C${cId}` : "Sin Correría";
    const etiquetaCiclo = `${nombreCorr} (${an})`;

    let m = Number(r.mes);
    if ((!m || isNaN(m)) && r.fecha) m = parseInt(String(r.fecha).slice(5, 7), 10);
    if (!m || isNaN(m)) m = 1;
    if (!esTransaccionFacturacionReal(r.transaccion, m, an)) continue;

    const fecha = r.fecha ? String(r.fecha).slice(0, 10) : "";
    const v = normalizarValorTransaccion(r.transaccion, Number(r.valor || 0));
    const c = normalizarUnidadesTransaccion(r.transaccion, Number(r.cantidad || 0));

    // Filtro por Año
    if (anioFiltro !== "todos" && an !== Number(anioFiltro)) {
      continue;
    }

    // Filtro por Ciclo de Correría
    if (
      cicloFiltro !== "todos" &&
      cicloKey !== cicloFiltro &&
      String(cId) !== cicloFiltro &&
      nombreCorr !== cicloFiltro
    ) {
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

    if (fecha) {
      if (!minFechaFiltrada || fecha < minFechaFiltrada) minFechaFiltrada = fecha;
      if (!maxFechaFiltrada || fecha > maxFechaFiltrada) maxFechaFiltrada = fecha;
    }

    // Agrupación por Referencia
    const normRefKey = normalizarClaveRef(rawRef);
    if (!refAggMap.has(normRefKey)) {
      refAggMap.set(normRefKey, {
        ref: rawRef,
        nombre: String(r.producto || "Sin Nombre").trim(),
        prenda: rawPrenda,
        ciclosSet: new Set(),
        cicloKeysSet: new Set(),
        correriasSet: new Set(),
        correriaIdsSet: new Set(),
        unidades: 0,
        facturacion: 0,
      });
    }
    const itemRef = refAggMap.get(normRefKey)!;
    itemRef.unidades += c;
    itemRef.facturacion += v;
    itemRef.ciclosSet.add(etiquetaCiclo);
    itemRef.cicloKeysSet.add(cicloKey);
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

  // 4. Construir tabla de Trazabilidad
  const referenciasVendidasKeys = new Set<string>();
  const rankingReferencias: FilaTrazabilidadReferencia[] = [];

  let sumaPvmPonderado = 0;
  let sumaPvpPonderado = 0;
  let pesoPonderado = 0;

  for (const [normKey, agg] of refAggMap.entries()) {
    referenciasVendidasKeys.add(normKey);

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
      ciclosNombres: Array.from(agg.ciclosSet),
      cicloKeys: Array.from(agg.cicloKeysSet),
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

  // Ordenar por facturación y calcular Pareto
  rankingReferencias.sort((a, b) => b.facturacion - a.facturacion);
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

  // 5. Resumen por Prenda
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

  // 6. Referencias del Maestro sin Venta en el alcance temporal seleccionado
  const referenciasSinVentaEnCorreria: ReferenciaSinVenta[] = [];
  for (const [normKey, mItem] of maestroReferencias.entries()) {
    if (mItem.ref !== normKey && normalizarClaveRef(mItem.ref) !== normKey) continue;

    if (!referenciasVendidasKeys.has(normKey) && !referenciasVendidasKeys.has(normalizarClaveRef(mItem.ref))) {
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
      if (referenciasSinVentaEnCorreria.length >= 500) break;
    }
  }

  // 7. KPIs Globales
  const totalMaestro = new Set(Array.from(maestroReferencias.values()).map((m) => normalizarClaveRef(m.ref))).size;
  const pvmPromedio = pesoPonderado > 0 ? Math.round(sumaPvmPonderado / pesoPonderado) : 0;
  const pvpPromedio = pesoPonderado > 0 ? Math.round(sumaPvpPonderado / pesoPonderado) : 0;
  const markupPonderado = pvmPromedio > 0 ? ((pvpPromedio - pvmPromedio) / pvmPromedio) * 100 : 0;
  const ticketPromedioGlobal = unidadesFiltradas > 0 ? Math.round(facturacionFiltrada / unidadesFiltradas) : 0;
  const coberturaCatalogoPct = totalMaestro > 0 ? Math.min(100, Math.round(((rankingReferencias.length / totalMaestro) * 100) * 10) / 10) : 0;

  let diasActivos = 1;
  if (minFechaFiltrada && maxFechaFiltrada) {
    const d1 = new Date(minFechaFiltrada).getTime();
    const d2 = new Date(maxFechaFiltrada).getTime();
    if (!isNaN(d1) && !isNaN(d2) && d2 >= d1) {
      diasActivos = Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
    }
  }

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
    ciclosDisponibles,
    ciclosFiltrados,
    comparativaYoY,
    rankingReferencias,
    resumenPorPrenda,
    referenciasSinVentaEnCorreria,
    prendasDisponibles: Array.from(prendasSet).sort(),
    aniosDisponibles: Array.from(aniosSet).sort((a, b) => b - a),
    rangoFechasActivo: {
      fechaMin: minFechaFiltrada,
      fechaMax: maxFechaFiltrada,
      texto: formatearRangoFechasTexto(minFechaFiltrada, maxFechaFiltrada),
      diasActivos,
    },
  };
}
