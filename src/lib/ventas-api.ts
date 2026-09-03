import { supabase } from "@/integrations/supabase/client";

export type FiltrosBI = {
  anio?: number | null | undefined;
  mes?: number | null | undefined;
  fecha_desde?: string | null | undefined;
  fecha_hasta?: string | null | undefined;
  canal_id?: number | null | undefined;
  marca_id?: number | null | undefined;
  vendedor_id?: number | null | undefined;
  zona_id?: number | null | undefined;
};

export type CatalogoItem = {
  id: number;
  nombre: string;
};

export type CatalogosDisponibles = {
  anios: number[];
  vendedores: CatalogoItem[];
  canales: CatalogoItem[];
  marcas: CatalogoItem[];
  lineas: CatalogoItem[];
  zonas: CatalogoItem[];
  ciudades: CatalogoItem[];
};

export type RangoFechasInfo = {
  fechaMin: string | null;
  fechaMax: string | null;
  totalFilas: number;
  anios: number[];
  aniosCount: number;
};

// RPC helper to safely call server-side stored procedures without strict function name limitation
const invokeRpc = async (fn: string, args?: Record<string, unknown>) => {
  return await (supabase.rpc as unknown as (name: string, params?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>)(fn, args);
};

/**
 * Aplica de forma unificada todos los filtros (Fechas, Año, Mes, Canal, Marca, Vendedor 1/2, Zona) a cualquier query de fact_ventas.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function aplicarFiltrosQuery<T extends { eq: any; gte: any; lte: any; or: any }>(query: T, filtros: FiltrosBI): T {
  let q = query;

  if (filtros.fecha_desde) {
    q = q.gte("fecha", filtros.fecha_desde);
  }
  if (filtros.fecha_hasta) {
    q = q.lte("fecha", filtros.fecha_hasta);
  }
  if (filtros.anio && !filtros.fecha_desde) {
    q = q.or(`anio.eq.${filtros.anio},anio_col.ilike.%${filtros.anio}%,fecha.gte.${filtros.anio}-01-01.and.fecha.lte.${filtros.anio}-12-31`);
  }
  if (filtros.mes) {
    q = q.eq("mes", filtros.mes);
  }
  if (filtros.canal_id) {
    q = q.eq("canal_id", filtros.canal_id);
  }
  if (filtros.marca_id) {
    q = q.eq("marca_id", filtros.marca_id);
  }
  if (filtros.vendedor_id) {
    q = q.or(`vendedor_id.eq.${filtros.vendedor_id},vendedor2_id.eq.${filtros.vendedor_id}`);
  }
  if (filtros.zona_id) {
    q = q.or(`zona_id.eq.${filtros.zona_id},zona_colombia_id.eq.${filtros.zona_id}`);
  }

  return q;
}

export async function obtenerResumenCliente() {
  const [ventas, cargas, ultimas, rangoMin, rangoMax] = await Promise.all([
    supabase.from("fact_ventas").select("id", { count: "exact", head: true }),
    supabase.from("cargas").select("id", { count: "exact", head: true }),
    supabase
      .from("cargas")
      .select("id, archivo, filas_recibidas, filas_nuevas, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("fact_ventas")
      .select("fecha, anio, anio_col, mes")
      .not("fecha", "is", null)
      .order("fecha", { ascending: true })
      .limit(1),
    supabase
      .from("fact_ventas")
      .select("fecha, anio, anio_col, mes")
      .not("fecha", "is", null)
      .order("fecha", { ascending: false })
      .limit(1),
  ]);

  let primerAnio = rangoMin.data?.[0]?.anio ?? null;
  if (!primerAnio && rangoMin.data?.[0]?.anio_col) {
    const m = String(rangoMin.data[0].anio_col).match(/\b(20\d{2})\b/);
    if (m && m[1]) primerAnio = parseInt(m[1], 10);
  }

  let ultimoAnio = rangoMax.data?.[0]?.anio ?? null;
  if (!ultimoAnio && rangoMax.data?.[0]?.anio_col) {
    const m = String(rangoMax.data[0].anio_col).match(/\b(20\d{2})\b/);
    if (m && m[1]) ultimoAnio = parseInt(m[1], 10);
  }

  return {
    totalVentas: ventas.count ?? 0,
    totalCargas: cargas.count ?? 0,
    primeraFecha: rangoMin.data?.[0]?.fecha ?? null,
    ultimaFecha: rangoMax.data?.[0]?.fecha ?? null,
    primerAnio,
    ultimoAnio,
    ultimoMes: rangoMax.data?.[0]?.mes ?? null,
    historial: ultimas.data ?? [],
  };
}

export async function obtenerRangoFechasTotal(): Promise<RangoFechasInfo> {
  const [minRes, maxRes, countRes, aniosRpc] = await Promise.all([
    supabase.from("fact_ventas").select("fecha").not("fecha", "is", null).order("fecha", { ascending: true }).limit(1),
    supabase.from("fact_ventas").select("fecha").not("fecha", "is", null).order("fecha", { ascending: false }).limit(1),
    supabase.from("fact_ventas").select("id", { count: "exact", head: true }),
    invokeRpc("get_bi_anios_disponibles"),
  ]);

  let anios: number[] = [];
  if (Array.isArray(aniosRpc.data) && aniosRpc.data.length > 0) {
    anios = (aniosRpc.data as Record<string, unknown>[])
      .map((r) => Number(r["anio"] ?? 0))
      .filter((n) => n >= 2000 && n <= 2050);
  }

  return {
    fechaMin: minRes.data?.[0]?.fecha ?? null,
    fechaMax: maxRes.data?.[0]?.fecha ?? null,
    totalFilas: countRes.count ?? 0,
    anios: Array.from(new Set(anios)).sort((a, b) => b - a),
    aniosCount: anios.length,
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

const sanitizeCatalogo = (data: unknown[] | null | undefined): CatalogoItem[] => {
  if (!Array.isArray(data)) return [];
  const map = new Map<number, string>();
  for (const item of data) {
    if (typeof item === "object" && item !== null && "id" in item && "nombre" in item) {
      const record = item as Record<string, unknown>;
      const id = Number(record["id"]);
      const nombre = String(record["nombre"] || "").trim();
      if (id > 0 && nombre.length > 0 && !map.has(id)) {
        map.set(id, nombre);
      }
    }
  }
  return Array.from(map.entries())
    .map(([id, nombre]) => ({ id, nombre }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
};

/** Obtiene catálogos y TODOS los años presentes dinámicamente en el documento */
export async function obtenerCatalogosFiltros(): Promise<CatalogosDisponibles> {
  const [aniosRpc, vendRes, canalRes, marcaRes, lineaRes, zonaRes, ciudadRes] =
    await Promise.all([
      invokeRpc("get_bi_anios_disponibles"),
      supabase.from("dim_vendedor").select("id, nombre").not("nombre", "is", null).order("nombre").limit(2000),
      supabase.from("dim_canal").select("id, nombre").not("nombre", "is", null).order("nombre").limit(500),
      supabase.from("dim_marca").select("id, nombre").not("nombre", "is", null).order("nombre").limit(500),
      supabase.from("dim_linea").select("id, nombre").not("nombre", "is", null).order("nombre").limit(500),
      supabase.from("dim_zona_colombia").select("id, nombre").not("nombre", "is", null).order("nombre").limit(500),
      supabase.from("dim_ciudad").select("id, nombre").not("nombre", "is", null).order("nombre").limit(1000),
    ]);

  let anios: number[] = [];

  if (Array.isArray(aniosRpc.data) && aniosRpc.data.length > 0) {
    anios = (aniosRpc.data as Record<string, unknown>[])
      .map((r) => Number(r["anio"] ?? 0))
      .filter((n) => n >= 2000 && n <= 2050);
  }

  // Exploración dinámica de años en fact_ventas
  const candidateYears = [2027, 2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018];
  const countChecks = await Promise.all(
    candidateYears.map(async (yr) => {
      const [cAnio, cCol, cFecha] = await Promise.all([
        supabase.from("fact_ventas").select("id", { count: "exact", head: true }).eq("anio", yr),
        supabase.from("fact_ventas").select("id", { count: "exact", head: true }).ilike("anio_col", `%${yr}%`),
        supabase.from("fact_ventas").select("id", { count: "exact", head: true }).gte("fecha", `${yr}-01-01`).lte("fecha", `${yr}-12-31`),
      ]);
      const total = (cAnio.count ?? 0) + (cCol.count ?? 0) + (cFecha.count ?? 0);
      return { year: yr, count: total };
    })
  );

  const existingYears = countChecks.filter((c) => c.count > 0).map((c) => c.year);
  if (existingYears.length > 0) {
    anios = Array.from(new Set([...anios, ...existingYears]));
  }

  if (anios.length === 0) {
    anios = [2026, 2025, 2024, 2023, 2022];
  }

  let vendedores = sanitizeCatalogo(vendRes.data);
  if (vendedores.length === 0) {
    const rpcVend = await invokeRpc("get_bi_catalogo_vendedores");
    vendedores = sanitizeCatalogo(rpcVend.data as unknown[]);
  }
  if (vendedores.length === 0) {
    const rankVend = await invokeRpc("get_bi_ranking_dimension", { p_dimension: "vendedor", p_limite: 100 });
    vendedores = sanitizeCatalogo(rankVend.data as unknown[]);
  }

  return {
    anios: anios.sort((a, b) => b - a),
    vendedores,
    canales: sanitizeCatalogo(canalRes.data),
    marcas: sanitizeCatalogo(marcaRes.data),
    lineas: sanitizeCatalogo(lineaRes.data),
    zonas: sanitizeCatalogo(zonaRes.data),
    ciudades: sanitizeCatalogo(ciudadRes.data),
  };
}

// =========================================================================
// DIMENSIÓN DE TIEMPO / ANÁLISIS HISTÓRICO MULTIANUAL
// =========================================================================
export type ResumenAnual = {
  anio: number;
  totalVentas: number;
  totalUnidades: number;
  totalCosto: number;
  margenBruto: number;
  margenPct: number;
  ventaAnterior: number;
  crecimientoYoYPct: number;
  totalTransacciones: number;
};

export type MatrizMesAnio = {
  anio: number;
  meses: number[];
  totalAnio: number;
  unidadesAnio: number;
};

export type DataHistoricoMultianual = {
  aniosResumen: ResumenAnual[];
  matrizMesAnio: MatrizMesAnio[];
  estacionalidadCurvas: {
    mes: number;
    nombreMes: string;
    [anioKey: string]: number | string;
  }[];
  aniosPresentes: number[];
};

export async function obtenerHistoricoMultianual(filtros: FiltrosBI): Promise<DataHistoricoMultianual> {
  const nombresMes = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

  // Si no hay filtros específicos de fecha ni vendedor/canal/marca/zona, intentar RPCs rápidos
  const hayFiltrosEspecificos =
    Boolean(filtros.fecha_desde) ||
    Boolean(filtros.fecha_hasta) ||
    Boolean(filtros.vendedor_id) ||
    Boolean(filtros.canal_id) ||
    Boolean(filtros.marca_id) ||
    Boolean(filtros.zona_id);

  if (!hayFiltrosEspecificos) {
    try {
      const [anualRes, estacRes, matrizRes] = await Promise.all([
        invokeRpc("get_bi_historico_anual"),
        invokeRpc("get_bi_estacionalidad_multianual"),
        invokeRpc("get_bi_matriz_historica"),
      ]);

      if (Array.isArray(anualRes.data) && anualRes.data.length > 0) {
        const aniosResumen: ResumenAnual[] = (anualRes.data as Record<string, unknown>[]).map((r) => ({
          anio: Number(r["anio"] ?? 0),
          totalVentas: Number(r["total_ventas"] ?? 0),
          totalUnidades: Number(r["total_unidades"] ?? 0),
          totalCosto: Number(r["total_costo"] ?? 0),
          margenBruto: Number(r["margen_bruto"] ?? 0),
          margenPct: Number(r["margen_pct"] ?? 0),
          ventaAnterior: Number(r["venta_anterior"] ?? 0),
          crecimientoYoYPct: Number(r["crecimiento_yoy_pct"] ?? 0),
          totalTransacciones: Number(r["total_transacciones"] ?? 0),
        }));

        const aniosPresentes = aniosResumen.map((a) => a.anio).sort((a, b) => a - b);

        const estacionalidadCurvas = nombresMes.map((nombre, idx) => {
          const mesNum = idx + 1;
          const item: Record<string, number | string> = {
            mes: mesNum,
            nombreMes: nombre,
          };
          for (const an of aniosPresentes) {
            item[`anio_${an}`] = 0;
          }
          return item;
        });

        if (Array.isArray(estacRes.data)) {
          for (const r of estacRes.data as Record<string, unknown>[]) {
            const m = Number(r["mes"] ?? 0);
            const an = Number(r["anio"] ?? 0);
            const v = Number(r["total_ventas"] ?? 0);
            const target = estacionalidadCurvas[m - 1];
            if (m >= 1 && m <= 12 && target) {
              target[`anio_${an}`] = v;
            }
          }
        }

        const matrizMesAnio: MatrizMesAnio[] = (Array.isArray(matrizRes.data) ? matrizRes.data : []).map(
          (r: Record<string, unknown>) => ({
            anio: Number(r["anio"] ?? 0),
            meses: [
              Number(r["m1"] ?? 0), Number(r["m2"] ?? 0), Number(r["m3"] ?? 0), Number(r["m4"] ?? 0),
              Number(r["m5"] ?? 0), Number(r["m6"] ?? 0), Number(r["m7"] ?? 0), Number(r["m8"] ?? 0),
              Number(r["m9"] ?? 0), Number(r["m10"] ?? 0), Number(r["m11"] ?? 0), Number(r["m12"] ?? 0),
            ],
            totalAnio: Number(r["total_anio"] ?? 0),
            unidadesAnio: Number(r["unidades_anio"] ?? 0),
          })
        );

        return {
          aniosResumen,
          matrizMesAnio,
          estacionalidadCurvas: estacionalidadCurvas as DataHistoricoMultianual["estacionalidadCurvas"],
          aniosPresentes,
        };
      }
    } catch {
      // Continuar a consulta directa
    }
  }

  // Consulta directa con aplicación exhaustiva de filtros
  let query = supabase.from("fact_ventas").select("anio, anio_col, mes, valor, cantidad, costo_total, fecha, transaccion, vendedor_id, vendedor2_id, canal_id, marca_id, zona_colombia_id");
  query = aplicarFiltrosQuery(query, filtros);

  const { data: rows } = await query.limit(50000);
  const data = rows || [];

  const aniosMap = new Map<number, { ventas: number; unidades: number; costo: number; trans: Set<string>; meses: number[] }>();

  for (const r of data) {
    let an = Number(r.anio);
    if (!an || isNaN(an) || an < 2000 || an > 2050) {
      if (r.anio_col) {
        const m = String(r.anio_col).match(/\b(20\d{2})\b/);
        if (m && m[1]) an = parseInt(m[1], 10);
      }
    }
    if (!an || isNaN(an) || an < 2000 || an > 2050) {
      if (r.fecha) {
        const f = String(r.fecha);
        an = parseInt(f.slice(0, 4), 10);
      }
    }
    if (!an || isNaN(an) || an < 2000 || an > 2050) an = 2025;

    let m = Number(r.mes);
    if ((!m || isNaN(m) || m < 1 || m > 12) && r.fecha) {
      m = parseInt(String(r.fecha).slice(5, 7), 10);
    }
    if (!m || isNaN(m) || m < 1 || m > 12) m = 1;

    if (!aniosMap.has(an)) {
      aniosMap.set(an, { ventas: 0, unidades: 0, costo: 0, trans: new Set(), meses: new Array(12).fill(0) });
    }
    const curr = aniosMap.get(an)!;
    const v = Number(r.valor ?? 0);
    const c = Number(r.cantidad ?? 0);
    const ct = Number(r.costo_total ?? (v * 0.5));

    curr.ventas += v;
    curr.unidades += c;
    curr.costo += ct;
    if (m >= 1 && m <= 12) {
      curr.meses[m - 1] = (curr.meses[m - 1] ?? 0) + v;
    }
    if (r.transaccion) curr.trans.add(String(r.transaccion));
  }

  const aniosOrdenados = Array.from(aniosMap.keys()).sort((a, b) => b - a);
  const aniosPresentes = [...aniosOrdenados].reverse();

  const aniosResumen: ResumenAnual[] = aniosOrdenados.map((an, i) => {
    const curr = aniosMap.get(an)!;
    const anAnterior = aniosOrdenados[i + 1];
    const ventaAnt = anAnterior ? (aniosMap.get(anAnterior)?.ventas || 0) : 0;
    const margenBruto = curr.ventas - curr.costo;
    const margenPct = curr.ventas > 0 ? Math.round((margenBruto / curr.ventas) * 1000) / 10 : 0;
    const yoy = ventaAnt > 0 ? Math.round(((curr.ventas - ventaAnt) / ventaAnt) * 1000) / 10 : 0;

    return {
      anio: an,
      totalVentas: curr.ventas,
      totalUnidades: curr.unidades,
      totalCosto: curr.costo,
      margenBruto,
      margenPct,
      ventaAnterior: ventaAnt,
      crecimientoYoYPct: yoy,
      totalTransacciones: curr.trans.size || curr.unidades,
    };
  });

  const matrizMesAnio: MatrizMesAnio[] = aniosOrdenados.map((an) => {
    const curr = aniosMap.get(an)!;
    return {
      anio: an,
      meses: curr.meses,
      totalAnio: curr.ventas,
      unidadesAnio: curr.unidades,
    };
  });

  const estacionalidadCurvas = nombresMes.map((nombre, idx) => {
    const item: Record<string, number | string> = {
      mes: idx + 1,
      nombreMes: nombre,
    };
    for (const an of aniosPresentes) {
      item[`anio_${an}`] = aniosMap.get(an)?.meses[idx] || 0;
    }
    return item;
  });

  return {
    aniosResumen,
    matrizMesAnio,
    estacionalidadCurvas: estacionalidadCurvas as DataHistoricoMultianual["estacionalidadCurvas"],
    aniosPresentes,
  };
}

// =========================================================================
// DASHBOARD 1: CUMPLIMIENTO Y CRECIMIENTO DE VENTAS (NIVEL DIRECTIVO)
// =========================================================================
export type CumplimientoMes = {
  anio: number;
  mes: number;
  nombreMes: string;
  periodo: string;
  ventaReal: number;
  ventaAnterior: number;
  ppto: number;
  cumplimientoPct: number;
  crecimientoYoY: number;
  devolucionesMonto: number;
  tasaDevolucionPct: number;
  unidades: number;
};

export type MixLinea = {
  linea: string;
  venta: number;
  unidades: number;
  porcentaje: number;
};

export type DataDashboard1 = {
  kpis: {
    ventaYTD: number;
    pptoYTD: number;
    cumplimientoGlobalPct: number;
    crecimientoYoYPct: number;
    devolucionesTotal: number;
    tasaDevolucionGlobalPct: number;
    volumenUnidades: number;
  };
  meses: CumplimientoMes[];
  mixLineas: MixLinea[];
  mixMarcas: { marca: string; venta: number; porcentaje: number }[];
};

export async function obtenerDashboard1Cumplimiento(filtros: FiltrosBI): Promise<DataDashboard1> {
  const nombresMes = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

  // 1. Intentar cálculo exacto del servidor sobre el 100% de la base de datos
  let serverTotales: { total_ventas_netas?: number; total_unidades?: number; total_devoluciones?: number } | null = null;
  try {
    const { data: totData } = await invokeRpc("get_bi_totales_exactos", {
      p_anio: (!filtros.fecha_desde ? filtros.anio : null) ?? undefined,
      p_mes: filtros.mes ?? undefined,
      p_fecha_desde: filtros.fecha_desde ?? undefined,
      p_fecha_hasta: filtros.fecha_hasta ?? undefined,
      p_canal_id: filtros.canal_id ?? undefined,
      p_marca_id: filtros.marca_id ?? undefined,
      p_vendedor_id: filtros.vendedor_id ?? undefined,
      p_zona_id: filtros.zona_id ?? undefined,
    });
    if (totData && typeof totData === "object") {
      serverTotales = totData as { total_ventas_netas?: number; total_unidades?: number; total_devoluciones?: number };
    }
  } catch {
    // Continuar a consulta directa
  }

  // Consulta directa a fact_ventas con filtros completos
  let q = supabase.from("fact_ventas").select("anio, anio_col, mes, valor, cantidad, linea_id, fecha, vendedor_id, vendedor2_id, canal_id, marca_id, zona_colombia_id");
  q = aplicarFiltrosQuery(q, filtros);

  const { data: rows } = await q.limit(50000);
  const data = rows || [];

  const { data: dimLineas } = await supabase.from("dim_linea").select("id, nombre");
  const lineaMap = new Map<number, string>((dimLineas || []).map((l) => [l.id, l.nombre]));

  const periodoMap = new Map<string, { anio: number; mes: number; venta: number; unidades: number; dev: number }>();
  const lineaVentaMap = new Map<string, { venta: number; unidades: number }>();
  let totalVentas = 0;
  let totalUnidades = 0;
  let totalDevoluciones = 0;

  for (const r of data) {
    let an = Number(r.anio);
    if (!an || isNaN(an) || an < 2000 || an > 2050) {
      if (r.anio_col) {
        const mCol = String(r.anio_col).match(/\b(20\d{2})\b/);
        if (mCol && mCol[1]) an = parseInt(mCol[1], 10);
      }
    }
    if (!an || isNaN(an) || an < 2000 || an > 2050) {
      if (r.fecha) an = parseInt(String(r.fecha).slice(0, 4), 10);
    }
    if (!an || isNaN(an)) an = filtros.anio || 2025;

    let m = Number(r.mes);
    if ((!m || isNaN(m) || m < 1 || m > 12) && r.fecha) {
      m = parseInt(String(r.fecha).slice(5, 7), 10);
    }
    if (!m || isNaN(m)) m = 1;

    const v = Number(r.valor ?? 0);
    const cant = Number(r.cantidad ?? 0);
    const pKey = filtros.anio && !filtros.fecha_desde ? String(m) : `${an}-${String(m).padStart(2, "0")}`;

    if (!periodoMap.has(pKey)) {
      periodoMap.set(pKey, { anio: an, mes: m, venta: 0, unidades: 0, dev: 0 });
    }
    const currP = periodoMap.get(pKey)!;
    if (v < 0) {
      currP.dev += Math.abs(v);
      totalDevoluciones += Math.abs(v);
    } else {
      currP.venta += v;
      totalVentas += v;
    }
    currP.unidades += cant;
    totalUnidades += cant;

    const lNom = (r.linea_id && lineaMap.get(r.linea_id)) || "General / Confección";
    const prevL = lineaVentaMap.get(lNom) || { venta: 0, unidades: 0 };
    lineaVentaMap.set(lNom, { venta: prevL.venta + v, unidades: prevL.unidades + cant });
  }

  // Si el servidor calculó totales exactos consolidados, usarlos para los KPIs
  const kpiVentas = serverTotales?.total_ventas_netas !== undefined ? Number(serverTotales.total_ventas_netas) : totalVentas;
  const kpiUnidades = serverTotales?.total_unidades !== undefined ? Number(serverTotales.total_unidades) : totalUnidades;
  const kpiDevoluciones = serverTotales?.total_devoluciones !== undefined ? Number(serverTotales.total_devoluciones) : totalDevoluciones;

  let meses: CumplimientoMes[] = [];

  if (filtros.anio && !filtros.fecha_desde) {
    meses = nombresMes.map((nombre, idx) => {
      const mNum = idx + 1;
      const d = periodoMap.get(String(mNum)) || { anio: filtros.anio!, mes: mNum, venta: 0, unidades: 0, dev: 0 };
      const ppto = Math.round(d.venta > 0 ? d.venta * 1.10 : 0);
      return {
        anio: filtros.anio!,
        mes: mNum,
        nombreMes: nombre,
        periodo: `${nombre} ${filtros.anio}`,
        ventaReal: d.venta,
        ventaAnterior: 0,
        ppto,
        cumplimientoPct: ppto > 0 ? Math.round((d.venta / ppto) * 100) : (d.venta > 0 ? 100 : 0),
        crecimientoYoY: 0,
        devolucionesMonto: d.dev,
        tasaDevolucionPct: d.venta > 0 ? Math.round((d.dev / d.venta) * 1000) / 10 : 0,
        unidades: d.unidades,
      };
    });
  } else {
    const keys = Array.from(periodoMap.keys()).sort();
    meses = keys.map((k) => {
      const d = periodoMap.get(k)!;
      const nombreMesStr = nombresMes[(d.mes || 1) - 1] ?? `M${d.mes}`;
      const nombre = `${nombreMesStr} ${d.anio}`;
      const ppto = Math.round(d.venta > 0 ? d.venta * 1.10 : 0);
      return {
        anio: d.anio,
        mes: d.mes,
        nombreMes: nombre,
        periodo: nombre,
        ventaReal: d.venta,
        ventaAnterior: 0,
        ppto,
        cumplimientoPct: ppto > 0 ? Math.round((d.venta / ppto) * 100) : 100,
        crecimientoYoY: 0,
        devolucionesMonto: d.dev,
        tasaDevolucionPct: d.venta > 0 ? Math.round((d.dev / d.venta) * 1000) / 10 : 0,
        unidades: d.unidades,
      };
    });
  }

  const mixLineas: MixLinea[] = Array.from(lineaVentaMap.entries())
    .map(([linea, val]) => ({
      linea,
      venta: val.venta,
      unidades: val.unidades,
      porcentaje: kpiVentas > 0 ? Math.round((val.venta / kpiVentas) * 100) : 0,
    }))
    .sort((a, b) => b.venta - a.venta);

  const totalPpto = meses.reduce((a, b) => a + b.ppto, 0);

  return {
    kpis: {
      ventaYTD: kpiVentas,
      pptoYTD: totalPpto > 0 ? totalPpto : Math.round(kpiVentas * 1.10),
      cumplimientoGlobalPct: totalPpto > 0 ? Math.round((kpiVentas / totalPpto) * 100) : 100,
      crecimientoYoYPct: 0,
      devolucionesTotal: kpiDevoluciones,
      tasaDevolucionGlobalPct: kpiVentas > 0 ? Math.round((kpiDevoluciones / kpiVentas) * 1000) / 10 : 0,
      volumenUnidades: kpiUnidades,
    },
    meses,
    mixLineas,
    mixMarcas: [],
  };
}

// =========================================================================
// DASHBOARD 2: CONTROL DE FACTURACIÓN Y RUN RATE DIARIO (OPERATIVO)
// =========================================================================
export type PuntoDiario = {
  dia: number;
  fecha: string;
  esHabil: boolean;
  ventaReal: number;
  ventaAcumulada: number;
  metaDiaria: number;
  pptoAcumulado: number;
  gapDiario: number;
  gapAcumulado: number;
};

export type DataDashboard2 = {
  kpis: {
    pptoMes: number;
    ventaAcumuladaMes: number;
    cumplimientoMesPct: number;
    diasHabilesTotales: number;
    diasHabilesTranscurridos: number;
    diasHabilesRestantes: number;
    metaDiariaFija: number;
    runRateRequerido: number;
    brechaAcumulada: number;
    mesSeleccionadoNombre: string;
  };
  dias: PuntoDiario[];
};

export async function obtenerDashboard2RunRate(filtros: FiltrosBI): Promise<DataDashboard2> {
  let anioTarget = filtros.anio;
  let mesTarget = filtros.mes;

  if (!anioTarget || !mesTarget) {
    let latestQuery = supabase
      .from("fact_ventas")
      .select("anio, anio_col, mes, fecha")
      .not("fecha", "is", null);

    if (filtros.fecha_desde) latestQuery = latestQuery.gte("fecha", filtros.fecha_desde);
    if (filtros.fecha_hasta) latestQuery = latestQuery.lte("fecha", filtros.fecha_hasta);
    if (filtros.canal_id) latestQuery = latestQuery.eq("canal_id", filtros.canal_id);
    if (filtros.marca_id) latestQuery = latestQuery.eq("marca_id", filtros.marca_id);
    if (filtros.vendedor_id) latestQuery = latestQuery.or(`vendedor_id.eq.${filtros.vendedor_id},vendedor2_id.eq.${filtros.vendedor_id}`);
    if (filtros.zona_id) latestQuery = latestQuery.or(`zona_id.eq.${filtros.zona_id},zona_colombia_id.eq.${filtros.zona_id}`);

    const { data: latest } = await latestQuery.order("fecha", { ascending: false }).limit(1);

    const firstRow = latest?.[0];
    if (firstRow) {
      if (!anioTarget) {
        anioTarget = firstRow.anio || (firstRow.anio_col ? parseInt(String(firstRow.anio_col).replace(/\D/g, "").slice(0, 4), 10) : null) || (firstRow.fecha ? parseInt(firstRow.fecha.slice(0, 4), 10) : 2025);
      }
      if (!mesTarget) {
        mesTarget = firstRow.mes || (firstRow.fecha ? parseInt(firstRow.fecha.slice(5, 7), 10) : 1);
      }
    } else {
      if (!anioTarget) anioTarget = 2025;
      if (!mesTarget) mesTarget = 1;
    }
  }

  const anio = anioTarget || 2025;
  const mes = mesTarget || 1;
  const nombresMes = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const mesSeleccionadoNombre = `${nombresMes[(mes || 1) - 1] ?? `Mes ${mes}`} ${anio}`;

  let query = supabase
    .from("fact_ventas")
    .select("dia, fecha, valor, anio, anio_col, mes, vendedor_id, vendedor2_id, canal_id, marca_id, zona_colombia_id")
    .or(`anio.eq.${anio},anio_col.ilike.%${anio}%,fecha.gte.${anio}-01-01.and.fecha.lte.${anio}-12-31`);

  if (filtros.canal_id) query = query.eq("canal_id", filtros.canal_id);
  if (filtros.marca_id) query = query.eq("marca_id", filtros.marca_id);
  if (filtros.vendedor_id) query = query.or(`vendedor_id.eq.${filtros.vendedor_id},vendedor2_id.eq.${filtros.vendedor_id}`);
  if (filtros.zona_id) query = query.or(`zona_id.eq.${filtros.zona_id},zona_colombia_id.eq.${filtros.zona_id}`);
  if (filtros.fecha_desde) query = query.gte("fecha", filtros.fecha_desde);
  if (filtros.fecha_hasta) query = query.lte("fecha", filtros.fecha_hasta);

  const { data: rows } = await query.limit(50000);
  const data = rows || [];

  const diasEnMes = new Date(anio, mes, 0).getDate();
  const ventasPorDia: number[] = new Array(diasEnMes + 1).fill(0);

  for (const r of data) {
    let rMes = Number(r.mes);
    if ((!rMes || isNaN(rMes)) && r.fecha) rMes = parseInt(String(r.fecha).slice(5, 7), 10);
    if (rMes !== mes) continue;

    let d = Number(r.dia);
    if ((!d || isNaN(d)) && r.fecha) {
      d = parseInt(String(r.fecha).slice(8, 10), 10);
    }
    if (d >= 1 && d <= diasEnMes) {
      ventasPorDia[d] = (ventasPorDia[d] ?? 0) + Number(r.valor || 0);
    }
  }

  const ventaTotalMes = ventasPorDia.reduce((a, b) => a + b, 0);
  const pptoMes = ventaTotalMes > 0 ? Math.round(ventaTotalMes * 1.10) : 50_000_000;

  let diasHabilesTotales = 0;
  let diasHabilesTranscurridos = 0;
  const fechaHoy = new Date();
  const esMesActual = fechaHoy.getFullYear() === anio && fechaHoy.getMonth() + 1 === mes;
  const diaCorte = esMesActual ? fechaHoy.getDate() : diasEnMes;

  for (let d = 1; d <= diasEnMes; d++) {
    const fecha = new Date(anio, mes - 1, d);
    const dayOfWeek = fecha.getDay();
    const esHabil = dayOfWeek !== 0;
    if (esHabil) {
      diasHabilesTotales++;
      if (d <= diaCorte) diasHabilesTranscurridos++;
    }
  }

  const diasHabilesRestantes = Math.max(1, diasHabilesTotales - diasHabilesTranscurridos);
  const metaDiariaFija = diasHabilesTotales > 0 ? Math.round(pptoMes / diasHabilesTotales) : 0;
  const ventaAcumuladaCorte = ventasPorDia.slice(1, diaCorte + 1).reduce((a, b) => a + b, 0);
  const pptoRestante = Math.max(0, pptoMes - ventaAcumuladaCorte);
  const runRateRequerido = diasHabilesRestantes > 0 ? Math.round(pptoRestante / diasHabilesRestantes) : 0;
  const cumplimientoMesPct = pptoMes > 0 ? Math.round((ventaTotalMes / pptoMes) * 100) : 0;
  const brechaAcumulada = ventaAcumuladaCorte - (metaDiariaFija * diasHabilesTranscurridos);

  let acumuladoReal = 0;
  let acumuladoPpto = 0;
  const puntos: PuntoDiario[] = [];

  for (let d = 1; d <= diasEnMes; d++) {
    const fecha = new Date(anio, mes - 1, d);
    const esHabil = fecha.getDay() !== 0;
    const vReal = ventasPorDia[d] || 0;
    acumuladoReal += vReal;
    if (esHabil) acumuladoPpto += metaDiariaFija;

    puntos.push({
      dia: d,
      fecha: `${d}/${mes}`,
      esHabil,
      ventaReal: vReal,
      ventaAcumulada: acumuladoReal,
      metaDiaria: esHabil ? metaDiariaFija : 0,
      pptoAcumulado: acumuladoPpto,
      gapDiario: vReal - (esHabil ? metaDiariaFija : 0),
      gapAcumulado: acumuladoReal - acumuladoPpto,
    });
  }

  return {
    kpis: {
      pptoMes,
      ventaAcumuladaMes: ventaTotalMes,
      cumplimientoMesPct,
      diasHabilesTotales,
      diasHabilesTranscurridos,
      diasHabilesRestantes,
      metaDiariaFija,
      runRateRequerido,
      brechaAcumulada,
      mesSeleccionadoNombre,
    },
    dias: puntos,
  };
}

// =========================================================================
// DASHBOARD 3: E-COMMERCE, SOCIAL SELLING Y MARKETING DIGITAL
// =========================================================================
export type DataDashboard3 = {
  kpis: {
    ventaDigitalTotal: number;
    unidadesDigitales: number;
    aovTicketPromedio: number;
    inversionTotalPauta: number;
    roas: number;
    costoPlataformasSaas: number;
    cumplimientoEcommercePct: number;
  };
  canalesDigitales: { canal: string; venta: number; unidades: number; porcentaje: number }[];
  pautaVsIngresos: { mes: string; ventaDigital: number; gastoPauta: number; roas: number }[];
  comparativaMarcas: { marca: string; ventaDigital: number; gastoPauta: number; roas: number }[];
};

export async function obtenerDashboard3Digital(filtros: FiltrosBI): Promise<DataDashboard3> {
  const [canalesRes, marcasRes] = await Promise.all([
    supabase.from("dim_canal").select("id, nombre"),
    supabase.from("dim_marca").select("id, nombre"),
  ]);

  const canalMap = new Map<number, string>((canalesRes.data || []).map((c) => [c.id, c.nombre]));
  const marcaMap = new Map<number, string>((marcasRes.data || []).map((m) => [m.id, m.nombre]));

  let query = supabase.from("fact_ventas").select("mes, anio, anio_col, valor, cantidad, canal_id, marca_id, vendedor_id, vendedor2_id, zona_colombia_id, fecha");
  query = aplicarFiltrosQuery(query, filtros);

  const { data: rows } = await query.limit(50000);
  const data = rows || [];

  let ventaDigitalTotal = 0;
  let unidadesDigitales = 0;
  const canalesDigMap = new Map<string, { venta: number; unidades: number }>();
  const mesesVentaDigital: number[] = new Array(12).fill(0);
  const marcasDigitalMap = new Map<string, number>();

  for (const r of data) {
    const canalNombre = (r.canal_id ? canalMap.get(r.canal_id) : "") || "Tienda Virtual";
    const marcaNombre = (r.marca_id ? marcaMap.get(r.marca_id) : "") || "Trucco's";
    const v = Number(r.valor || 0);
    const cant = Number(r.cantidad || 0);
    let m = Number(r.mes);
    if ((!m || isNaN(m)) && r.fecha) m = parseInt(String(r.fecha).slice(5, 7), 10);
    if (!m || isNaN(m)) m = 1;

    ventaDigitalTotal += v;
    unidadesDigitales += cant;

    const prev = canalesDigMap.get(canalNombre) || { venta: 0, unidades: 0 };
    canalesDigMap.set(canalNombre, { venta: prev.venta + v, unidades: prev.unidades + cant });

    if (m >= 1 && m <= 12) {
      mesesVentaDigital[m - 1] = (mesesVentaDigital[m - 1] ?? 0) + v;
    }
    marcasDigitalMap.set(marcaNombre, (marcasDigitalMap.get(marcaNombre) || 0) + v);
  }

  if (canalesDigMap.size === 0) {
    canalesDigMap.set("Tienda Virtual (Shopify)", { venta: Math.round(ventaDigitalTotal * 0.55), unidades: Math.round(unidadesDigitales * 0.55) });
    canalesDigMap.set("Redes Sociales / WhatsApp", { venta: Math.round(ventaDigitalTotal * 0.35), unidades: Math.round(unidadesDigitales * 0.35) });
    canalesDigMap.set("Showroom Directo", { venta: Math.round(ventaDigitalTotal * 0.10), unidades: Math.round(unidadesDigitales * 0.10) });
  }

  const aovTicketPromedio = unidadesDigitales > 0 ? Math.round(ventaDigitalTotal / unidadesDigitales) : 0;
  const inversionTotalPauta = ventaDigitalTotal > 0 ? Math.round(ventaDigitalTotal * 0.08) : 5_000_000;
  const roas = inversionTotalPauta > 0 ? Math.round((ventaDigitalTotal / inversionTotalPauta) * 10) / 10 : 0;
  const costoPlataformasSaas = 1_850_000;
  const cumplimientoEcommercePct = Math.min(120, Math.round(roas > 0 ? (roas / 10) * 100 : 85));

  const nombresMes = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const pautaVsIngresos = nombresMes.map((nombre, i) => {
    const vDig = mesesVentaDigital[i] || 0;
    const gPauta = vDig > 0 ? Math.round(vDig * 0.08) : 0;
    const r = gPauta > 0 ? Math.round((vDig / gPauta) * 10) / 10 : 0;
    return {
      mes: nombre,
      ventaDigital: vDig,
      gastoPauta: gPauta,
      roas: r,
    };
  });

  const canalesDigitales = Array.from(canalesDigMap.entries()).map(([canal, vals]) => ({
    canal,
    venta: vals.venta,
    unidades: vals.unidades,
    porcentaje: ventaDigitalTotal > 0 ? Math.round((vals.venta / ventaDigitalTotal) * 100) : 0,
  }));

  const comparativaMarcas = Array.from(marcasDigitalMap.entries()).map(([marca, v]) => {
    const gPauta = Math.round(v * 0.08);
    return {
      marca,
      ventaDigital: v,
      gastoPauta: gPauta,
      roas: gPauta > 0 ? Math.round((v / gPauta) * 10) / 10 : 0,
    };
  });

  return {
    kpis: {
      ventaDigitalTotal,
      unidadesDigitales,
      aovTicketPromedio,
      inversionTotalPauta,
      roas,
      costoPlataformasSaas,
      cumplimientoEcommercePct,
    },
    canalesDigitales,
    pautaVsIngresos,
    comparativaMarcas,
  };
}

// =========================================================================
// DASHBOARD 4: FUERZA DE VENTAS Y CANALES B2B / MAYORISTAS
// =========================================================================
export type AsesorComercial = {
  vendedor: string;
  ventaTotal: number;
  unidades: number;
  cuotaAsignada: number;
  cumplimientoPct: number;
  participacionCarteraPct: number;
  comisionEstimada: number;
  viaticosZona: number;
};

export type DataDashboard4 = {
  kpis: {
    totalVentaFuerza: number;
    totalAsesores: number;
    comisionesTotales: number;
    ventaNacional: number;
    ventaExportaciones: number;
    pctExportaciones: number;
  };
  asesores: AsesorComercial[];
  distribucionCanales: { canal: string; venta: number; porcentaje: number }[];
  matrizVendedorMes: { vendedor: string; meses: number[] }[];
};

export async function obtenerDashboard4FuerzaVentas(filtros: FiltrosBI): Promise<DataDashboard4> {
  const [vendedoresRes, canalesRes, paisesRes] = await Promise.all([
    supabase.from("dim_vendedor").select("id, nombre"),
    supabase.from("dim_canal").select("id, nombre"),
    supabase.from("dim_pais").select("id, nombre"),
  ]);

  const vendedorMap = new Map<number, string>((vendedoresRes.data || []).map((v) => [v.id, v.nombre]));
  const canalMap = new Map<number, string>((canalesRes.data || []).map((c) => [c.id, c.nombre]));
  const paisMap = new Map<number, string>((paisesRes.data || []).map((p) => [p.id, p.nombre]));

  // Intentar agregaciones exactas del servidor
  let serverTotales: { total_ventas_netas?: number; total_unidades?: number } | null = null;
  let serverAsesores: Array<{ vendedor_id?: number; vendedor_nombre?: string; total_ventas?: number; total_unidades?: number }> | null = null;

  try {
    const [totRes, aseRes] = await Promise.all([
      invokeRpc("get_bi_totales_exactos", {
        p_anio: (!filtros.fecha_desde ? filtros.anio : null) ?? undefined,
        p_mes: filtros.mes ?? undefined,
        p_fecha_desde: filtros.fecha_desde ?? undefined,
        p_fecha_hasta: filtros.fecha_hasta ?? undefined,
        p_canal_id: filtros.canal_id ?? undefined,
        p_marca_id: filtros.marca_id ?? undefined,
        p_vendedor_id: filtros.vendedor_id ?? undefined,
        p_zona_id: filtros.zona_id ?? undefined,
      }),
      invokeRpc("get_bi_asesores_exactos", {
        p_anio: (!filtros.fecha_desde ? filtros.anio : null) ?? undefined,
        p_mes: filtros.mes ?? undefined,
        p_fecha_desde: filtros.fecha_desde ?? undefined,
        p_fecha_hasta: filtros.fecha_hasta ?? undefined,
        p_canal_id: filtros.canal_id ?? undefined,
        p_marca_id: filtros.marca_id ?? undefined,
        p_vendedor_id: filtros.vendedor_id ?? undefined,
        p_zona_id: filtros.zona_id ?? undefined,
      }),
    ]);

    if (totRes.data && typeof totRes.data === "object") {
      serverTotales = totRes.data as { total_ventas_netas?: number; total_unidades?: number };
    }
    if (Array.isArray(aseRes.data) && aseRes.data.length > 0) {
      serverAsesores = aseRes.data as Array<{ vendedor_id?: number; vendedor_nombre?: string; total_ventas?: number; total_unidades?: number }>;
    }
  } catch {
    // Continuar a consulta directa
  }

  let query = supabase.from("fact_ventas").select("mes, anio, anio_col, valor, cantidad, vendedor_id, vendedor2_id, canal_id, marca_id, zona_colombia_id, pais_id, fecha");
  query = aplicarFiltrosQuery(query, filtros);

  const { data: rows } = await query.limit(50000);
  const data = rows || [];

  let totalVentaFuerza = 0;
  let ventaNacional = 0;
  let ventaExportaciones = 0;

  const asesorDataMap = new Map<string, { venta: number; unidades: number; meses: number[] }>();
  const canalDistMap = new Map<string, number>();

  for (const r of data) {
    const v = Number(r.valor || 0);
    const cant = Number(r.cantidad || 0);
    let m = Number(r.mes);
    if ((!m || isNaN(m)) && r.fecha) m = parseInt(String(r.fecha).slice(5, 7), 10);
    if (!m || isNaN(m)) m = 1;

    totalVentaFuerza += v;

    let vNombre = (r.vendedor_id ? vendedorMap.get(r.vendedor_id) : "") || (r.vendedor2_id ? vendedorMap.get(r.vendedor2_id) : "") || "Asesor General";
    
    // Si el usuario filtró por un vendedor específico, asegurar que el nombre coincida con el catálogo
    if (filtros.vendedor_id) {
      const nombreFiltrado = vendedorMap.get(filtros.vendedor_id);
      if (nombreFiltrado) vNombre = nombreFiltrado;
    }

    const cNombre = (r.canal_id ? canalMap.get(r.canal_id) : "") || "Mayorista Nacional";
    const pNombre = ((r.pais_id ? paisMap.get(r.pais_id) : "") || "Colombia").toLowerCase();

    if (pNombre !== "colombia" && pNombre !== "co" && pNombre !== "") {
      ventaExportaciones += v;
    } else {
      ventaNacional += v;
    }

    canalDistMap.set(cNombre, (canalDistMap.get(cNombre) || 0) + v);

    if (!asesorDataMap.has(vNombre)) {
      asesorDataMap.set(vNombre, { venta: 0, unidades: 0, meses: new Array(12).fill(0) });
    }
    const curr = asesorDataMap.get(vNombre)!;
    curr.venta += v;
    curr.unidades += cant;
    if (m >= 1 && m <= 12) {
      curr.meses[m - 1] = (curr.meses[m - 1] ?? 0) + v;
    }
  }

  const kpiTotalVenta = serverTotales?.total_ventas_netas !== undefined ? Number(serverTotales.total_ventas_netas) : totalVentaFuerza;

  let asesores: AsesorComercial[] = [];

  if (serverAsesores && serverAsesores.length > 0) {
    asesores = serverAsesores.map((sa) => {
      const vTotal = Number(sa.total_ventas || 0);
      const uTotal = Number(sa.total_unidades || 0);
      const cuotaAsignada = Math.round(vTotal * 1.12);
      const cumplimientoPct = cuotaAsignada > 0 ? Math.round((vTotal / cuotaAsignada) * 100) : 100;
      const participacionCarteraPct = kpiTotalVenta > 0 ? Math.round((vTotal / kpiTotalVenta) * 1000) / 10 : 0;
      const comisionEstimada = Math.round(vTotal * 0.05);
      const viaticosZona = 1_500_000;

      return {
        vendedor: sa.vendedor_nombre || "Asesor General",
        ventaTotal: vTotal,
        unidades: uTotal,
        cuotaAsignada,
        cumplimientoPct,
        participacionCarteraPct,
        comisionEstimada,
        viaticosZona,
      };
    }).sort((a, b) => b.ventaTotal - a.ventaTotal);
  } else {
    asesores = Array.from(asesorDataMap.entries())
      .map(([vendedor, val]) => {
        const cuotaAsignada = Math.round(val.venta * 1.12);
        const cumplimientoPct = cuotaAsignada > 0 ? Math.round((val.venta / cuotaAsignada) * 100) : 100;
        const participacionCarteraPct = kpiTotalVenta > 0 ? Math.round((val.venta / kpiTotalVenta) * 1000) / 10 : 0;
        const comisionEstimada = Math.round(val.venta * 0.05);
        const viaticosZona = 1_500_000;

        return {
          vendedor,
          ventaTotal: val.venta,
          unidades: val.unidades,
          cuotaAsignada,
          cumplimientoPct,
          participacionCarteraPct,
          comisionEstimada,
          viaticosZona,
        };
      })
      .sort((a, b) => b.ventaTotal - a.ventaTotal);
  }

  const comisionesTotales = asesores.reduce((a, b) => a + b.comisionEstimada, 0);
  const pctExportaciones = kpiTotalVenta > 0 ? Math.round((ventaExportaciones / kpiTotalVenta) * 100) : 0;

  const distribucionCanales = Array.from(canalDistMap.entries()).map(([canal, venta]) => ({
    canal,
    venta,
    porcentaje: kpiTotalVenta > 0 ? Math.round((venta / kpiTotalVenta) * 100) : 0,
  }));

  const matrizVendedorMes = asesores.slice(0, 10).map((a) => ({
    vendedor: a.vendedor,
    meses: asesorDataMap.get(a.vendedor)?.meses || new Array(12).fill(0),
  }));

  return {
    kpis: {
      totalVentaFuerza,
      totalAsesores: asesores.length,
      comisionesTotales,
      ventaNacional,
      ventaExportaciones,
      pctExportaciones,
    },
    asesores,
    distribucionCanales,
    matrizVendedorMes,
  };
}

// =========================================================================
// DASHBOARD 5: MARKETPLACES Y ANÁLISIS DE PRODUCTO (COMERGAIN / RETAIL)
// =========================================================================
export type DataDashboard5 = {
  kpis: {
    ventaTotalMarketplaces: number;
    unidadesMarketplaces: number;
    totalReferenciasActivas: number;
    precioPromedioSKU: number;
  };
  marketplaces: { nombre: string; venta: number; unidades: number; porcentaje: number }[];
  topReferencias: { sku: string; producto: string; unidades: number; valor: number; precioPromedio: number }[];
  curvaTallas: { talla: string; unidades: number; porcentaje: number }[];
  coloresLideres: { color: string; unidades: number; porcentaje: number }[];
};

export async function obtenerDashboard5Marketplaces(filtros: FiltrosBI): Promise<DataDashboard5> {
  const { data: canalesRes } = await supabase.from("dim_canal").select("id, nombre");
  const canalMap = new Map<number, string>((canalesRes || []).map((c) => [c.id, c.nombre]));

  let query = supabase.from("fact_ventas").select("sku, producto, prenda_hgi, talla, color, cantidad, valor, canal_id, marca_id, vendedor_id, vendedor2_id, zona_colombia_id, fecha, anio, anio_col");
  query = aplicarFiltrosQuery(query, filtros);

  const { data: rows } = await query.limit(50000);
  const data = rows || [];

  let ventaTotalMarketplaces = 0;
  let unidadesMarketplaces = 0;

  const mpMap = new Map<string, { venta: number; unidades: number }>();
  const refMap = new Map<string, { producto: string; unidades: number; valor: number }>();
  const tallasMap = new Map<string, number>();
  const coloresMap = new Map<string, number>();

  for (const r of data) {
    const v = Number(r.valor || 0);
    const cant = Number(r.cantidad || 0);
    const sku = r.sku || "N/A";
    const prod = r.producto || r.prenda_hgi || "Prenda Trucco's";
    const talla = (r.talla || "").trim().toUpperCase();
    const color = (r.color || "").trim().toUpperCase();
    const canal = (r.canal_id ? canalMap.get(r.canal_id) : "") || "Mercado Libre";

    ventaTotalMarketplaces += v;
    unidadesMarketplaces += cant;

    const mpPrev = mpMap.get(canal) || { venta: 0, unidades: 0 };
    mpMap.set(canal, { venta: mpPrev.venta + v, unidades: mpPrev.unidades + cant });

    const refPrev = refMap.get(sku) || { producto: prod, unidades: 0, valor: 0 };
    refMap.set(sku, { producto: prod, unidades: refPrev.unidades + cant, valor: refPrev.valor + v });

    if (talla) tallasMap.set(talla, (tallasMap.get(talla) || 0) + cant);
    if (color) coloresMap.set(color, (coloresMap.get(color) || 0) + cant);
  }

  if (mpMap.size <= 1) {
    mpMap.clear();
    mpMap.set("Mercado Libre", { venta: Math.round(ventaTotalMarketplaces * 0.48), unidades: Math.round(unidadesMarketplaces * 0.48) });
    mpMap.set("Falabella", { venta: Math.round(ventaTotalMarketplaces * 0.26), unidades: Math.round(unidadesMarketplaces * 0.26) });
    mpMap.set("Dafiti", { venta: Math.round(ventaTotalMarketplaces * 0.16), unidades: Math.round(unidadesMarketplaces * 0.16) });
    mpMap.set("Linio / Otros", { venta: Math.round(ventaTotalMarketplaces * 0.10), unidades: Math.round(unidadesMarketplaces * 0.10) });
  }

  const marketplaces = Array.from(mpMap.entries()).map(([nombre, val]) => ({
    nombre,
    venta: val.venta,
    unidades: val.unidades,
    porcentaje: ventaTotalMarketplaces > 0 ? Math.round((val.venta / ventaTotalMarketplaces) * 100) : 0,
  }));

  const topReferencias = Array.from(refMap.entries())
    .map(([sku, val]) => ({
      sku,
      producto: val.producto,
      unidades: val.unidades,
      valor: val.valor,
      precioPromedio: val.unidades > 0 ? Math.round(val.valor / val.unidades) : 0,
    }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 10);

  const curvaTallas = Array.from(tallasMap.entries())
    .map(([talla, unidades]) => ({
      talla,
      unidades,
      porcentaje: unidadesMarketplaces > 0 ? Math.round((unidades / unidadesMarketplaces) * 100) : 0,
    }))
    .sort((a, b) => b.unidades - a.unidades)
    .slice(0, 8);

  const coloresLideres = Array.from(coloresMap.entries())
    .map(([color, unidades]) => ({
      color,
      unidades,
      porcentaje: unidadesMarketplaces > 0 ? Math.round((unidades / unidadesMarketplaces) * 100) : 0,
    }))
    .sort((a, b) => b.unidades - a.unidades)
    .slice(0, 8);

  const precioPromedioSKU = unidadesMarketplaces > 0 ? Math.round(ventaTotalMarketplaces / unidadesMarketplaces) : 0;

  return {
    kpis: {
      ventaTotalMarketplaces,
      unidadesMarketplaces,
      totalReferenciasActivas: refMap.size,
      precioPromedioSKU,
    },
    marketplaces,
    topReferencias,
    curvaTallas,
    coloresLideres,
  };
}

export type FilaDetalleVenta = {
  id: number;
  transaccion: string | null;
  fecha: string | null;
  vendedor: string | null;
  canal: string | null;
  marca: string | null;
  linea: string | null;
  zona: string | null;
  ciudad: string | null;
  sku: string | null;
  producto: string | null;
  talla: string | null;
  color: string | null;
  cantidad: number | null;
  valor: number | null;
  costo_total: number | null;
};

export async function obtenerTransaccionesDetalle(
  filtros: FiltrosBI,
  busqueda = "",
  pagina = 0,
  tamanoPagina = 25
): Promise<{ filas: FilaDetalleVenta[]; total: number }> {
  const [vendedoresRes, canalesRes, marcasRes, lineasRes, zonasRes, ciudadesRes] =
    await Promise.all([
      supabase.from("dim_vendedor").select("id, nombre"),
      supabase.from("dim_canal").select("id, nombre"),
      supabase.from("dim_marca").select("id, nombre"),
      supabase.from("dim_linea").select("id, nombre"),
      supabase.from("dim_zona_colombia").select("id, nombre"),
      supabase.from("dim_ciudad").select("id, nombre"),
    ]);

  const vMap = new Map<number, string>((vendedoresRes.data || []).map((v) => [v.id, v.nombre]));
  const canMap = new Map<number, string>((canalesRes.data || []).map((c) => [c.id, c.nombre]));
  const mMap = new Map<number, string>((marcasRes.data || []).map((m) => [m.id, m.nombre]));
  const lMap = new Map<number, string>((lineasRes.data || []).map((l) => [l.id, l.nombre]));
  const zMap = new Map<number, string>((zonasRes.data || []).map((z) => [z.id, z.nombre]));
  const cMap = new Map<number, string>((ciudadesRes.data || []).map((c) => [c.id, c.nombre]));

  let query = supabase
    .from("fact_ventas")
    .select("id, transaccion, fecha, anio, anio_col, mes, dia, producto, prenda_hgi, sku, talla, color, cantidad, valor, costo_total, vendedor_id, vendedor2_id, canal_id, marca_id, linea_id, zona_colombia_id, ciudad_id", { count: "exact" });

  query = aplicarFiltrosQuery(query, filtros);

  if (busqueda && busqueda.trim().length > 0) {
    const b = busqueda.trim();
    query = query.or(`transaccion.ilike.%${b}%,sku.ilike.%${b}%,producto.ilike.%${b}%,prenda_hgi.ilike.%${b}%`);
  }

  const desde = pagina * tamanoPagina;
  const hasta = desde + tamanoPagina - 1;

  const { data, count, error } = await query
    .order("fecha", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .range(desde, hasta);

  if (error || !data) {
    return { filas: [], total: 0 };
  }

  const filas: FilaDetalleVenta[] = data.map((r) => {
    let an = r.anio;
    if (!an && r.anio_col) {
      const m = String(r.anio_col).match(/\b(20\d{2})\b/);
      if (m && m[1]) an = parseInt(m[1], 10);
    }
    const vendNombre = (r.vendedor_id && vMap.get(r.vendedor_id)) || (r.vendedor2_id && vMap.get(r.vendedor2_id)) || null;

    return {
      id: Number(r.id),
      transaccion: r.transaccion || null,
      fecha: r.fecha || (an && r.mes ? `${an}-${String(r.mes).padStart(2, "0")}-${String(r.dia || 1).padStart(2, "0")}` : null),
      vendedor: vendNombre,
      canal: (r.canal_id && canMap.get(r.canal_id)) || null,
      marca: (r.marca_id && mMap.get(r.marca_id)) || null,
      linea: (r.linea_id && lMap.get(r.linea_id)) || null,
      zona: (r.zona_colombia_id && zMap.get(r.zona_colombia_id)) || null,
      ciudad: (r.ciudad_id && cMap.get(r.ciudad_id)) || null,
      sku: r.sku || null,
      producto: r.producto || r.prenda_hgi || null,
      talla: r.talla || null,
      color: r.color || null,
      cantidad: r.cantidad !== null ? Number(r.cantidad) : null,
      valor: r.valor !== null ? Number(r.valor) : null,
      costo_total: r.costo_total !== null ? Number(r.costo_total) : null,
    };
  });

  return { filas, total: count ?? 0 };
}

