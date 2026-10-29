/**
 * Módulo de Análisis y Programación de Producción (Solo Administrador)
 * Consolida las referencias que tienen pedido pero no hay inventario suficiente para cumplir,
 * calculando la curva técnica de tallas y colores, urgencias de entrega y estado de viabilidad
 * para reprogramación en talleres/plantas de confección.
 */

import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { RegistroPedidosDespachosHGI } from "@/lib/pedidos-despachos-storage";
import {
  CORRERIAS_OFICIALES,
  detectarCorreriaPorFecha,
  obtenerRangoFechasCorreria,
} from "@/lib/correrias-config";

const db = supabase as any;

export type EstadoViabilidadProduccion =
  | "pendiente"
  | "viable"
  | "en_revision"
  | "no_viable"
  | "en_taller"
  | "completado";

export type PrioridadProduccion = "alta" | "media" | "baja";

export interface ProgramacionItemDecision {
  producto: string;
  estadoViabilidad: EstadoViabilidadProduccion;
  unidadesProgramadas: number;
  fechaEstimadaEntrega?: string;
  taller?: string;
  prioridad: PrioridadProduccion;
  observaciones?: string;
  actualizadoPor?: string;
  updatedAt: string;
}

export interface CurvaSKU {
  talla: string;
  color: string;
  saldoPedido: number;
  saldoInv: number;
  deficit: number;
  pedidosCount: number;
}

export interface PedidoClienteAfectado {
  id: string;
  documento: string;
  tercero: string;
  nombre: string;
  ciudad: string;
  vendedor: string;
  fechas: string;
  vence: string;
  talla: string;
  color: string;
  saldoPedido: number;
  saldoInv: number;
  deficit: number;
  diasParaVencer: number | null;
  esVencido: boolean;
}

export interface ItemReferenciaDeficit {
  producto: string;
  descripcion: string;
  totalPedido: number;
  despachado: number;
  saldoPedido: number;
  saldoInv: number;
  deficit: number; // Suma del déficit individual por variante talla/color
  coberturaPct: number;
  estadoStock: "sin_stock" | "insuficiente";
  correrias: string[];
  correriaPrincipal: string;
  fechaPedidoMin: string;
  fechaVenceMin: string;
  diasParaVencerMin: number | null;
  semaforoUrgencia: "vencido" | "urgente" | "normal";
  pedidosCount: number;
  clientesCount: number;
  vendedoresCount: number;
  vendedores: string[];
  ciudades: string[];
  curva: CurvaSKU[];
  tallasUnicas: string[];
  coloresUnicos: string[];
  pedidos: PedidoClienteAfectado[];
  decision: ProgramacionItemDecision;
}

export interface ResumenProduccionKPIs {
  totalReferenciasEnDeficit: number;
  totalPrendasDeficit: number;
  totalSaldoPedido: number;
  totalSaldoInv: number;
  referenciasSinStock: number;
  referenciasStockInsuficiente: number;
  referenciasVencidas: number;
  referenciasUrgentes: number;
  referenciasVigentes: number;
  totalClientesAfectados: number;
  totalPedidosAfectados: number;
  // Métricas de programación de producción
  referenciasViables: number;
  prendasProgramadasViables: number;
  referenciasEnRevision: number;
  referenciasNoViables: number;
  referenciasPendientes: number;
  referenciasEnTaller: number;
  referenciasCompletadas: number;
}

export interface FiltrosProgramacionProduccion {
  correria?: string; // "todas" | "C1" | "C2" | "C3" | "C4" | "C5"
  anioCorreria?: number;
  criterioFecha?: "fechas" | "vence";
  estadoViabilidad?: "todos" | EstadoViabilidadProduccion;
  estadoStock?: "todos" | "sin_stock" | "insuficiente";
  urgencia?: "todos" | "vencidos" | "urgentes" | "normales";
  umbralDeficitMinimo?: number; // 0, 10, 25, 50, 100
  vendedor?: string; // "todos" o nombre
  busqueda?: string;
  ordenarPor?:
    | "deficit_desc"
    | "vence_asc"
    | "pedidos_desc"
    | "clientes_desc"
    | "producto_asc"
    | "prioridad_desc";
}

const STORAGE_KEY_DECISIONES = "truccos_programacion_produccion_decisiones_v1";

/**
 * Carga las decisiones de programación guardadas localmente y desde Supabase
 */
export function obtenerDecisionesProgramacionLocales(): Record<string, ProgramacionItemDecision> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DECISIONES);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn("[programacion-produccion] Error al leer localStorage:", e);
  }
  return {};
}

/**
 * Guarda las decisiones en localStorage y en background intenta persistir en Supabase
 */
export async function guardarDecisionProgramacion(
  decision: ProgramacionItemDecision
): Promise<void> {
  const current = obtenerDecisionesProgramacionLocales();
  current[decision.producto] = {
    ...decision,
    updatedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(STORAGE_KEY_DECISIONES, JSON.stringify(current));
    window.dispatchEvent(new CustomEvent("truccos_programacion_decision_updated", { detail: decision }));
  } catch (e) {
    console.warn("[programacion-produccion] Error al guardar en localStorage:", e);
  }

  // Sincronización en segundo plano con Supabase si la tabla existe
  try {
    await db.from("programacion_produccion").upsert(
      {
        producto: decision.producto,
        estado_viabilidad: decision.estadoViabilidad,
        unidades_programadas: decision.unidadesProgramadas,
        fecha_estimada_entrega: decision.fechaEstimadaEntrega || "",
        taller: decision.taller || "",
        prioridad: decision.prioridad || "media",
        observaciones: decision.observaciones || "",
        actualizado_por: decision.actualizadoPor || "Administrador",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "producto" }
    );
  } catch (err) {
    // Si la tabla no ha sido creada en Supabase, no bloquear la experiencia de usuario
    console.debug("[programacion-produccion] Supabase sync fallback a local:", err);
  }
}

/**
 * Carga decisiones asíncronamente desde Supabase si están disponibles
 */
export async function sincronizarDecisionesDesdeSupabase(): Promise<Record<string, ProgramacionItemDecision>> {
  const locales = obtenerDecisionesProgramacionLocales();
  try {
    const { data, error } = await db.from("programacion_produccion").select("*");
    if (!error && Array.isArray(data)) {
      const combinadas = { ...locales };
      for (const row of data) {
        if (row.producto) {
          combinadas[row.producto] = {
            producto: row.producto,
            estadoViabilidad: (row.estado_viabilidad as EstadoViabilidadProduccion) || "pendiente",
            unidadesProgramadas: Number(row.unidades_programadas) || 0,
            fechaEstimadaEntrega: row.fecha_estimada_entrega || "",
            taller: row.taller || "",
            prioridad: (row.prioridad as PrioridadProduccion) || "media",
            observaciones: row.observaciones || "",
            actualizadoPor: row.actualizado_por || "",
            updatedAt: row.updated_at || new Date().toISOString(),
          };
        }
      }
      try {
        localStorage.setItem(STORAGE_KEY_DECISIONES, JSON.stringify(combinadas));
      } catch (e) {}
      return combinadas;
    }
  } catch (err) {
    console.debug("[programacion-produccion] No se pudo leer programacion_produccion en Supabase:", err);
  }
  return locales;
}

/**
 * Normaliza fecha para ordenamiento y cálculo de días
 */
function normalizarFecha(fStr: string | null | undefined): string {
  if (!fStr) return "";
  const s = fStr.trim();
  if (s.includes("/")) {
    const parts = s.split("/");
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
      } else {
        const y = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
        return `${y}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
      }
    }
  }
  return s.slice(0, 10);
}

function calcularDiasRestantes(fechaIso: string): number | null {
  if (!fechaIso || fechaIso.length < 10) return null;
  try {
    const [y, m, d] = fechaIso.split("-").map(Number);
    if (!y || !m || !d) return null;
    const fecha = new Date(y, m - 1, d);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    fecha.setHours(0, 0, 0, 0);
    const diffMs = fecha.getTime() - hoy.getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  } catch (e) {
    return null;
  }
}

/**
 * Motor central de cálculo del informe de programación de producción.
 * Identifica cada referencia con pedido y calcula el déficit real por variante.
 */
export function calcularInformeProgramacionProduccion(
  registros: RegistroPedidosDespachosHGI[],
  filtros: FiltrosProgramacionProduccion = {},
  decisionesGuardadas: Record<string, ProgramacionItemDecision> = {}
): {
  items: ItemReferenciaDeficit[];
  todosLosDeficitItems: ItemReferenciaDeficit[]; // Sin filtros de estado o búsqueda para métricas globales
  kpis: ResumenProduccionKPIs;
  catalogos: {
    correrias: string[];
    vendedores: string[];
    ciudades: string[];
  };
} {
  const norm = (s: string | null | undefined) => (s ? s.trim().toUpperCase() : "");

  // 1. Agrupar filas a nivel de SKU variante: Referencia + Talla + Color
  interface SkuAccum {
    producto: string;
    descripcion: string;
    talla: string;
    color: string;
    saldoPedido: number;
    saldoInv: number;
    totalPedido: number;
    despachado: number;
    pedidosList: PedidoClienteAfectado[];
  }

  const agrupacionReferencia: Record<
    string,
    {
      producto: string;
      descripcion: string;
      totalPedido: number;
      despachado: number;
      saldoPedido: number;
      saldoInv: number;
      skus: Record<string, SkuAccum>;
      pedidosList: PedidoClienteAfectado[];
      vendedoresSet: Set<string>;
      ciudadesSet: Set<string>;
      clientesSet: Set<string>;
      documentosSet: Set<string>;
      fechasPedido: string[];
      fechasVence: string[];
      correriasSet: Set<string>;
    }
  > = {};

  const todosVendedoresSet = new Set<string>();
  const todasCiudadesSet = new Set<string>();

  for (const r of registros) {
    if (!r.producto || !r.producto.trim()) continue;
    const refKey = norm(r.producto);
    const desc = r.descripcion || refKey;
    const talla = (r.talla || "UNICA").trim().toUpperCase();
    const color = (r.color || "SURTIDO").trim().toUpperCase();
    const skuKey = `${talla}___${color}`;

    if (r.vendedor) todosVendedoresSet.add(r.vendedor.trim());
    if (r.ciudad) todasCiudadesSet.add(r.ciudad.trim());

    if (!agrupacionReferencia[refKey]) {
      agrupacionReferencia[refKey] = {
        producto: r.producto.trim(),
        descripcion: desc,
        totalPedido: 0,
        despachado: 0,
        saldoPedido: 0,
        saldoInv: 0,
        skus: {},
        pedidosList: [],
        vendedoresSet: new Set(),
        ciudadesSet: new Set(),
        clientesSet: new Set(),
        documentosSet: new Set(),
        fechasPedido: [],
        fechasVence: [],
        correriasSet: new Set(),
      };
    }

    const refAcc = agrupacionReferencia[refKey];
    refAcc.totalPedido += r.totalPedido || 0;
    refAcc.despachado += r.despachado || 0;
    refAcc.saldoPedido += r.saldoPedido || 0;
    refAcc.saldoInv += r.saldoInv || 0;

    if (r.vendedor) refAcc.vendedoresSet.add(r.vendedor.trim());
    if (r.ciudad) refAcc.ciudadesSet.add(r.ciudad.trim());
    if (r.tercero || r.nombre) refAcc.clientesSet.add(`${r.tercero || ""} - ${r.nombre || ""}`);
    if (r.documento) refAcc.documentosSet.add(r.documento.trim());

    const fPedIso = normalizarFecha(r.fechas);
    const fVenceIso = normalizarFecha(r.vence);
    if (fPedIso) refAcc.fechasPedido.push(fPedIso);
    if (fVenceIso) refAcc.fechasVence.push(fVenceIso);

    // Detectar correría
    const corrDetectada = detectarCorreriaPorFecha(fPedIso || fVenceIso);
    if (corrDetectada) {
      refAcc.correriasSet.add(corrDetectada.etiqueta);
    }

    if (!refAcc.skus[skuKey]) {
      refAcc.skus[skuKey] = {
        producto: r.producto.trim(),
        descripcion: desc,
        talla,
        color,
        saldoPedido: 0,
        saldoInv: 0,
        totalPedido: 0,
        despachado: 0,
        pedidosList: [],
      };
    }

    const skuAcc = refAcc.skus[skuKey];
    skuAcc.saldoPedido += r.saldoPedido || 0;
    skuAcc.saldoInv += r.saldoInv || 0;
    skuAcc.totalPedido += r.totalPedido || 0;
    skuAcc.despachado += r.despachado || 0;

    // Agregar registro de pedido afectado si tiene saldo pendiente
    if ((r.saldoPedido || 0) > 0) {
      const diasVence = calcularDiasRestantes(fVenceIso);
      const pedidoObj: PedidoClienteAfectado = {
        id: r.id || `${r.documento}_${refKey}_${skuKey}`,
        documento: r.documento || "S/D",
        tercero: r.tercero || "",
        nombre: r.nombre || "CLIENTE NO REGISTRADO",
        ciudad: r.ciudad || "",
        vendedor: r.vendedor || "",
        fechas: fPedIso,
        vence: fVenceIso,
        talla,
        color,
        saldoPedido: r.saldoPedido || 0,
        saldoInv: r.saldoInv || 0,
        deficit: Math.max(0, (r.saldoPedido || 0) - Math.max(0, r.saldoInv || 0)),
        diasParaVencer: diasVence,
        esVencido: diasVence !== null && diasVence < 0,
      };

      skuAcc.pedidosList.push(pedidoObj);
      refAcc.pedidosList.push(pedidoObj);
    }
  }

  // 2. Construir items de referencia consolidando el déficit técnico real
  const todosDeficitItems: ItemReferenciaDeficit[] = [];

  for (const refKey of Object.keys(agrupacionReferencia)) {
    const ref = agrupacionReferencia[refKey];

    // Solo nos interesan referencias con pedido pendiente de entregar
    if (ref.saldoPedido <= 0) continue;

    // Calcular la curva y el déficit real variante a variante
    const curva: CurvaSKU[] = [];
    const tallasSet = new Set<string>();
    const coloresSet = new Set<string>();
    let deficitTotalReferencia = 0;

    for (const skuKey of Object.keys(ref.skus)) {
      const sku = ref.skus[skuKey];
      tallasSet.add(sku.talla);
      coloresSet.add(sku.color);

      // El déficit real de cada talla/color es lo que los clientes piden menos lo que hay en bodega de ESA talla/color
      const deficitSKU = Math.max(0, sku.saldoPedido - Math.max(0, sku.saldoInv));
      if (deficitSKU > 0 || sku.saldoPedido > 0) {
        deficitTotalReferencia += deficitSKU;
        curva.push({
          talla: sku.talla,
          color: sku.color,
          saldoPedido: sku.saldoPedido,
          saldoInv: sku.saldoInv,
          deficit: deficitSKU,
          pedidosCount: sku.pedidosList.length,
        });
      }
    }

    // Si NO hay déficit (el inventario cubre 100% de los pedidos de cada talla/color), no necesita reprogramación
    if (deficitTotalReferencia <= 0) continue;

    // Ordenar curva por talla y color
    curva.sort((a, b) => {
      if (a.color !== b.color) return a.color.localeCompare(b.color);
      return a.talla.localeCompare(b.talla, undefined, { numeric: true });
    });

    // Fechas mínimas de pedido y vencimiento
    const fechasVenceOrdenadas = [...ref.fechasVence].sort();
    const fechasPedidoOrdenadas = [...ref.fechasPedido].sort();
    const fechaVenceMin = fechasVenceOrdenadas[0] || "";
    const fechaPedidoMin = fechasPedidoOrdenadas[0] || "";
    const diasParaVencerMin = calcularDiasRestantes(fechaVenceMin);

    let semaforoUrgencia: "vencido" | "urgente" | "normal" = "normal";
    if (diasParaVencerMin !== null) {
      if (diasParaVencerMin < 0) {
        semaforoUrgencia = "vencido";
      } else if (diasParaVencerMin <= 15) {
        semaforoUrgencia = "urgente";
      }
    }

    const coberturaPct =
      ref.saldoPedido > 0
        ? Math.min(100, Math.round((Math.max(0, ref.saldoInv) / ref.saldoPedido) * 100))
        : 100;

    const estadoStock: "sin_stock" | "insuficiente" =
      ref.saldoInv <= 0 ? "sin_stock" : "insuficiente";

    const correriasArr = Array.from(ref.correriasSet);
    const correriaPrincipal = correriasArr[0] || "General";

    // Decisión de programación cargada o por defecto
    const decisionGuardada = decisionesGuardadas[ref.producto];
    const decision: ProgramacionItemDecision = decisionGuardada || {
      producto: ref.producto,
      estadoViabilidad: "pendiente",
      unidadesProgramadas: deficitTotalReferencia,
      taller: "",
      prioridad: semaforoUrgencia === "vencido" ? "alta" : semaforoUrgencia === "urgente" ? "media" : "baja",
      observaciones: "",
      updatedAt: new Date().toISOString(),
    };

    todosDeficitItems.push({
      producto: ref.producto,
      descripcion: ref.descripcion,
      totalPedido: ref.totalPedido,
      despachado: ref.despachado,
      saldoPedido: ref.saldoPedido,
      saldoInv: ref.saldoInv,
      deficit: deficitTotalReferencia,
      coberturaPct,
      estadoStock,
      correrias: correriasArr,
      correriaPrincipal,
      fechaPedidoMin,
      fechaVenceMin,
      diasParaVencerMin,
      semaforoUrgencia,
      pedidosCount: ref.documentosSet.size,
      clientesCount: ref.clientesSet.size,
      vendedoresCount: ref.vendedoresSet.size,
      vendedores: Array.from(ref.vendedoresSet),
      ciudades: Array.from(ref.ciudadesSet),
      curva,
      tallasUnicas: Array.from(tallasSet),
      coloresUnicos: Array.from(coloresSet),
      pedidos: ref.pedidosList.sort((a, b) => (a.vence || "").localeCompare(b.vence || "")),
      decision,
    });
  }

  // 3. Calcular KPIs globales sobre todos los items con déficit
  let totalPrendasDeficit = 0;
  let totalSaldoPedido = 0;
  let totalSaldoInv = 0;
  let referenciasSinStock = 0;
  let referenciasStockInsuficiente = 0;
  let referenciasVencidas = 0;
  let referenciasUrgentes = 0;
  let referenciasVigentes = 0;
  const clientesGlobalesSet = new Set<string>();
  const pedidosGlobalesSet = new Set<string>();

  let referenciasViables = 0;
  let prendasProgramadasViables = 0;
  let referenciasEnRevision = 0;
  let referenciasNoViables = 0;
  let referenciasPendientes = 0;
  let referenciasEnTaller = 0;
  let referenciasCompletadas = 0;

  for (const item of todosDeficitItems) {
    totalPrendasDeficit += item.deficit;
    totalSaldoPedido += item.saldoPedido;
    totalSaldoInv += Math.max(0, item.saldoInv);

    if (item.estadoStock === "sin_stock") referenciasSinStock++;
    else referenciasStockInsuficiente++;

    if (item.semaforoUrgencia === "vencido") referenciasVencidas++;
    else if (item.semaforoUrgencia === "urgente") referenciasUrgentes++;
    else referenciasVigentes++;

    for (const p of item.pedidos) {
      if (p.tercero || p.nombre) clientesGlobalesSet.add(`${p.tercero}_${p.nombre}`);
      if (p.documento) pedidosGlobalesSet.add(p.documento);
    }

    const st = item.decision?.estadoViabilidad || "pendiente";
    if (st === "viable") {
      referenciasViables++;
      prendasProgramadasViables += item.decision?.unidadesProgramadas || item.deficit;
    } else if (st === "en_revision") {
      referenciasEnRevision++;
    } else if (st === "no_viable") {
      referenciasNoViables++;
    } else if (st === "en_taller") {
      referenciasEnTaller++;
    } else if (st === "completado") {
      referenciasCompletadas++;
    } else {
      referenciasPendientes++;
    }
  }

  const kpis: ResumenProduccionKPIs = {
    totalReferenciasEnDeficit: todosDeficitItems.length,
    totalPrendasDeficit,
    totalSaldoPedido,
    totalSaldoInv,
    referenciasSinStock,
    referenciasStockInsuficiente,
    referenciasVencidas,
    referenciasUrgentes,
    referenciasVigentes,
    totalClientesAfectados: clientesGlobalesSet.size,
    totalPedidosAfectados: pedidosGlobalesSet.size,
    referenciasViables,
    prendasProgramadasViables,
    referenciasEnRevision,
    referenciasNoViables,
    referenciasPendientes,
    referenciasEnTaller,
    referenciasCompletadas,
  };

  // 4. Aplicar Filtros de usuario
  let itemsFiltrados = [...todosDeficitItems];

  // Filtro por Correría
  if (filtros.correria && filtros.correria !== "todas") {
    const cClave = filtros.correria.toUpperCase();
    itemsFiltrados = itemsFiltrados.filter((item) => {
      return (
        item.correrias.some((c) => c.toUpperCase().includes(cClave)) ||
        item.correriaPrincipal.toUpperCase().includes(cClave)
      );
    });
  }

  // Filtro por Estado de Viabilidad
  if (filtros.estadoViabilidad && filtros.estadoViabilidad !== "todos") {
    itemsFiltrados = itemsFiltrados.filter(
      (item) => item.decision.estadoViabilidad === filtros.estadoViabilidad
    );
  }

  // Filtro por Estado de Stock
  if (filtros.estadoStock && filtros.estadoStock !== "todos") {
    itemsFiltrados = itemsFiltrados.filter((item) => item.estadoStock === filtros.estadoStock);
  }

  // Filtro por Urgencia
  if (filtros.urgencia && filtros.urgencia !== "todos") {
    if (filtros.urgencia === "vencidos") {
      itemsFiltrados = itemsFiltrados.filter((item) => item.semaforoUrgencia === "vencido");
    } else if (filtros.urgencia === "urgentes") {
      itemsFiltrados = itemsFiltrados.filter((item) => item.semaforoUrgencia === "urgente");
    } else if (filtros.urgencia === "normales") {
      itemsFiltrados = itemsFiltrados.filter((item) => item.semaforoUrgencia === "normal");
    }
  }

  // Filtro por Umbral Mínimo de Déficit
  if (typeof filtros.umbralDeficitMinimo === "number" && filtros.umbralDeficitMinimo > 0) {
    itemsFiltrados = itemsFiltrados.filter((item) => item.deficit >= filtros.umbralDeficitMinimo!);
  }

  // Filtro por Vendedor
  if (filtros.vendedor && filtros.vendedor !== "todos") {
    const vNorm = filtros.vendedor.toLowerCase().trim();
    itemsFiltrados = itemsFiltrados.filter((item) =>
      item.vendedores.some((v) => v.toLowerCase().includes(vNorm))
    );
  }

  // Filtro de Búsqueda de texto
  if (filtros.busqueda && filtros.busqueda.trim()) {
    const b = filtros.busqueda.toLowerCase().trim();
    itemsFiltrados = itemsFiltrados.filter((item) => {
      return (
        item.producto.toLowerCase().includes(b) ||
        item.descripcion.toLowerCase().includes(b) ||
        item.coloresUnicos.some((c) => c.toLowerCase().includes(b)) ||
        item.tallasUnicas.some((t) => t.toLowerCase().includes(b)) ||
        item.pedidos.some(
          (p) =>
            p.nombre.toLowerCase().includes(b) ||
            p.tercero.toLowerCase().includes(b) ||
            p.documento.toLowerCase().includes(b)
        )
      );
    });
  }

  // 5. Ordenamiento
  const orden = filtros.ordenarPor || "deficit_desc";
  itemsFiltrados.sort((a, b) => {
    switch (orden) {
      case "deficit_desc":
        return b.deficit - a.deficit;
      case "vence_asc": {
        const vA = a.fechaVenceMin || "9999-99-99";
        const vB = b.fechaVenceMin || "9999-99-99";
        return vA.localeCompare(vB);
      }
      case "pedidos_desc":
        return b.pedidosCount - a.pedidosCount;
      case "clientes_desc":
        return b.clientesCount - a.clientesCount;
      case "producto_asc":
        return a.producto.localeCompare(b.producto);
      case "prioridad_desc": {
        const peso = (p: PrioridadProduccion) => (p === "alta" ? 3 : p === "media" ? 2 : 1);
        return peso(b.decision.prioridad) - peso(a.decision.prioridad);
      }
      default:
        return b.deficit - a.deficit;
    }
  });

  return {
    items: itemsFiltrados,
    todosLosDeficitItems: todosDeficitItems,
    kpis,
    catalogos: {
      correrias: CORRERIAS_OFICIALES.map((c) => c.clave),
      vendedores: Array.from(todosVendedoresSet).sort(),
      ciudades: Array.from(todasCiudadesSet).sort(),
    },
  };
}

/**
 * Exporta el informe oficial para el Área de Producción a Excel (.xlsx) con 3 hojas estructuradas:
 * 1. Resumen de Referencias a Programar
 * 2. Curva Técnica de Tallas y Colores
 * 3. Detalle de Pedidos y Clientes Afectados
 */
export function exportarInformeProduccionExcel(
  items: ItemReferenciaDeficit[],
  kpis?: ResumenProduccionKPIs,
  nombreArchivo: string = "Informe_Programacion_Produccion_Truccos.xlsx"
) {
  const wb = XLSX.utils.book_new();

  // 1. Hoja Resumen de Referencias y Viabilidad
  const filasResumen: (string | number)[][] = [
    [
      "REFERENCIA",
      "DESCRIPCION",
      "CORRERIAS",
      "URGENCIA",
      "FECHA VENCE MIN",
      "DIAS RESTANTES",
      "PEDIDO TOTAL",
      "DESPACHADO",
      "SALDO PEDIDO PENDIENTE",
      "INVENTARIO ACTUAL",
      "DEFICIT A PRODUCIR",
      "COBERTURA STOCK %",
      "CLIENTES AFECTADOS",
      "PEDIDOS AFECTADOS",
      "ESTADO VIABILIDAD",
      "UNIDADES PROGRAMADAS",
      "TALLER ASIGNADO",
      "FECHA ESTIMADA ENTREGA",
      "PRIORIDAD",
      "OBSERVACIONES PRODUCCION",
    ],
  ];

  for (const item of items) {
    const dec = item.decision;
    filasResumen.push([
      item.producto,
      item.descripcion,
      item.correrias.join(" | "),
      item.semaforoUrgencia.toUpperCase(),
      item.fechaVenceMin || "SIN FECHA",
      item.diasParaVencerMin !== null ? String(item.diasParaVencerMin) : "N/A",
      item.totalPedido,
      item.despachado,
      item.saldoPedido,
      item.saldoInv,
      item.deficit,
      `${item.coberturaPct}%`,
      item.clientesCount,
      item.pedidosCount,
      (dec?.estadoViabilidad || "pendiente").toUpperCase(),
      dec?.unidadesProgramadas || item.deficit,
      dec?.taller || "SIN ASIGNAR",
      dec?.fechaEstimadaEntrega || "",
      (dec?.prioridad || "media").toUpperCase(),
      dec?.observaciones || "",
    ]);
  }

  const wsResumen = XLSX.utils.aoa_to_sheet(filasResumen);
  XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen_Programacion");

  // 2. Hoja Curva Técnica de Tallas y Colores
  const filasCurva: (string | number)[][] = [
    [
      "REFERENCIA",
      "DESCRIPCION",
      "TALLA",
      "COLOR",
      "SALDO PEDIDO (CLIENTES)",
      "INVENTARIO DISPONIBLE",
      "DEFICIT A CORTAR / PRODUCIR",
      "PEDIDOS QUE LA PIDEN",
      "ESTADO VIABILIDAD",
    ],
  ];

  for (const item of items) {
    for (const c of item.curva) {
      filasCurva.push([
        item.producto,
        item.descripcion,
        c.talla,
        c.color,
        c.saldoPedido,
        c.saldoInv,
        c.deficit,
        c.pedidosCount,
        (item.decision?.estadoViabilidad || "pendiente").toUpperCase(),
      ]);
    }
  }

  const wsCurva = XLSX.utils.aoa_to_sheet(filasCurva);
  XLSX.utils.book_append_sheet(wb, wsCurva, "Curva_Tallas_Colores");

  // 3. Hoja Detalle de Pedidos de Clientes
  const filasPedidos: (string | number)[][] = [
    [
      "DOCUMENTO",
      "NIT / TERCERO",
      "CLIENTE",
      "CIUDAD",
      "ASESOR COMERCIAL",
      "FECHA PEDIDO",
      "FECHA VENCE",
      "REFERENCIA",
      "TALLA",
      "COLOR",
      "UNIDADES PENDIENTES",
      "INVENTARIO",
      "DEFICIT",
      "ESTADO VENCIMIENTO",
    ],
  ];

  for (const item of items) {
    for (const p of item.pedidos) {
      filasPedidos.push([
        p.documento,
        p.tercero,
        p.nombre,
        p.ciudad,
        p.vendedor,
        p.fechas,
        p.vence,
        item.producto,
        p.talla,
        p.color,
        p.saldoPedido,
        p.saldoInv,
        p.deficit,
        p.esVencido ? "VENCIDO" : "VIGENTE",
      ]);
    }
  }

  const wsPedidos = XLSX.utils.aoa_to_sheet(filasPedidos);
  XLSX.utils.book_append_sheet(wb, wsPedidos, "Detalle_Pedidos_Clientes");

  XLSX.writeFile(wb, nombreArchivo);
}

/**
 * Exporta un plano CSV rápido para software de corte o ERP
 */
export function exportarPlanDeCorteCSV(
  items: ItemReferenciaDeficit[],
  nombreArchivo: string = "Plan_Corte_Produccion.csv"
) {
  const lineas = [
    "REFERENCIA,TALLA,COLOR,UNIDADES_DEFICIT,DESCRIPCION,ESTADO_VIABILIDAD,TALLER",
  ];

  for (const item of items) {
    const estado = item.decision?.estadoViabilidad || "pendiente";
    const taller = (item.decision?.taller || "").replace(/,/g, " ");
    for (const c of item.curva) {
      if (c.deficit > 0) {
        lineas.push(
          `"${item.producto}","${c.talla}","${c.color}",${c.deficit},"${item.descripcion.replace(/"/g, '""')}","${estado}","${taller}"`
        );
      }
    }
  }

  const blob = new Blob([lineas.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  a.click();
  URL.revokeObjectURL(url);
}
