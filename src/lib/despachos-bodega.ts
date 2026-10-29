/**
 * Módulo de Logística y Despachos para Bodega (Alistamiento de Pedidos con Stock)
 * Consolida los productos y pedidos que TIENEN inventario disponible en bodega
 * y están listos para ser alistados, separados (picking), empacados (packing) y despachados.
 */

import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { RegistroPedidosDespachosHGI } from "@/lib/pedidos-despachos-storage";
import {
  CORRERIAS_OFICIALES,
  detectarCorreriaPorFecha,
} from "@/lib/correrias-config";

const db = supabase as any;

export type EstadoAlistamientoBodega =
  | "pendiente"
  | "en_picking"
  | "empacado"
  | "listo_despacho"
  | "despachado";

export interface DecisionAlistamientoPedido {
  documento: string;
  estadoAlistamiento: EstadoAlistamientoBodega;
  transportadora?: string;
  numeroGuia?: string;
  bultos?: number;
  responsable?: string;
  observaciones?: string;
  updatedAt: string;
}

export interface ItemPedidoBodega {
  id: string;
  documento: string;
  tercero: string;
  nombre: string;
  ciudad: string;
  vendedor: string;
  fechas: string;
  vence: string;
  producto: string;
  descripcion: string;
  talla: string;
  color: string;
  totalPedido: number;
  despachado: number;
  saldoPedido: number;
  saldoInv: number;
  unidadesDespachables: number; // Math.min(saldoPedido, Math.max(0, saldoInv))
  esCompleto: boolean; // saldoInv >= saldoPedido
  unidadesFaltantes: number; // Math.max(0, saldoPedido - Math.max(0, saldoInv))
  diasParaVencer: number | null;
  esVencido: boolean;
}

export interface GrupoPedidoClienteBodega {
  documento: string;
  tercero: string;
  nombre: string;
  ciudad: string;
  vendedor: string;
  fechaPedido: string;
  fechaVence: string;
  diasParaVencer: number | null;
  semaforoUrgencia: "vencido" | "urgente" | "normal";
  totalPrendasPedido: number;
  totalPrendasDespachadas: number;
  totalPrendasPendientes: number;
  totalPrendasDespachables: number; // Unidades con inventario listas para despacho
  totalPrendasFaltantes: number;
  porcentajeSurtido: number; // (totalPrendasDespachables / totalPrendasPendientes) * 100
  tipoDespacho: "completo" | "parcial";
  items: ItemPedidoBodega[];
  referenciasCount: number;
  correrias: string[];
  decision: DecisionAlistamientoPedido;
}

export interface CurvaSKUBodega {
  talla: string;
  color: string;
  saldoPedido: number;
  saldoInv: number;
  unidadesDespachables: number;
  pedidosCount: number;
}

export interface GrupoReferenciaPickingBodega {
  producto: string;
  descripcion: string;
  correrias: string[];
  correriaPrincipal: string;
  totalSaldoPedido: number;
  totalSaldoInv: number;
  totalDespachable: number;
  pedidosCount: number;
  clientesCount: number;
  ciudades: string[];
  vendedores: string[];
  curva: CurvaSKUBodega[];
  pedidos: ItemPedidoBodega[];
}

export interface ResumenBodegaKPIs {
  totalPrendasDespachables: number;
  totalPrendasPendientes: number;
  totalPedidosDespachables: number;
  pedidosCompletos: number;
  pedidosParciales: number;
  totalClientesBeneficiados: number;
  pedidosVencidosConStock: number;
  pedidosUrgentesConStock: number;
  pedidosVigentesConStock: number;
  // Estados de alistamiento
  pedidosPendientesPicking: number;
  pedidosEnPicking: number;
  pedidosEmpacados: number;
  pedidosListosDespacho: number;
  pedidosDespachados: number;
  totalReferenciasDistintas: number;
}

export interface FiltrosDespachosBodega {
  tipoDespacho?: "todos" | "completo" | "parcial";
  estadoAlistamiento?: "todos" | EstadoAlistamientoBodega;
  urgencia?: "todos" | "vencidos" | "urgentes" | "normales";
  ciudad?: string; // "todas" o nombre
  vendedor?: string; // "todos" o nombre
  correria?: string; // "todas" | "C1" | "C2" | ...
  busqueda?: string;
  ordenarPor?:
    | "urgencia_asc"
    | "despachables_desc"
    | "porcentaje_desc"
    | "documento_asc"
    | "cliente_asc"
    | "ciudad_asc";
}

const STORAGE_KEY_ALISTAMIENTO_BODEGA = "truccos_alistamiento_bodega_decisiones_v1";

/**
 * Carga las decisiones de alistamiento de pedidos guardadas localmente
 */
export function obtenerDecisionesBodegaLocales(): Record<string, DecisionAlistamientoPedido> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ALISTAMIENTO_BODEGA);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn("[despachos-bodega] Error leyendo localStorage:", e);
  }
  return {};
}

/**
 * Guarda el estado de alistamiento de un pedido en localStorage y Supabase
 */
export async function guardarDecisionAlistamientoBodega(
  decision: DecisionAlistamientoPedido
): Promise<void> {
  const current = obtenerDecisionesBodegaLocales();
  current[decision.documento] = {
    ...decision,
    updatedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(STORAGE_KEY_ALISTAMIENTO_BODEGA, JSON.stringify(current));
    window.dispatchEvent(
      new CustomEvent("truccos_alistamiento_decision_updated", { detail: decision })
    );
  } catch (e) {
    console.warn("[despachos-bodega] Error guardando en localStorage:", e);
  }

  // Sincronización en segundo plano con Supabase si la tabla existe
  try {
    await db.from("alistamiento_bodega").upsert(
      {
        documento: decision.documento,
        estado_alistamiento: decision.estadoAlistamiento,
        transportadora: decision.transportadora || "",
        numero_guia: decision.numeroGuia || "",
        bultos: decision.bultos || 1,
        responsable: decision.responsable || "Bodega",
        observaciones: decision.observaciones || "",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "documento" }
    );
  } catch (err) {
    console.debug("[despachos-bodega] Supabase sync fallback a local:", err);
  }
}

/**
 * Sincroniza estados de bodega desde Supabase
 */
export async function sincronizarDecisionesBodegaDesdeSupabase(): Promise<
  Record<string, DecisionAlistamientoPedido>
> {
  const locales = obtenerDecisionesBodegaLocales();
  try {
    const { data, error } = await db.from("alistamiento_bodega").select("*");
    if (!error && Array.isArray(data)) {
      const combinadas = { ...locales };
      for (const row of data) {
        if (row.documento) {
          combinadas[row.documento] = {
            documento: row.documento,
            estadoAlistamiento: (row.estado_alistamiento as EstadoAlistamientoBodega) || "pendiente",
            transportadora: row.transportadora || "",
            numeroGuia: row.numero_guia || "",
            bultos: Number(row.bultos) || 1,
            responsable: row.responsable || "",
            observaciones: row.observaciones || "",
            updatedAt: row.updated_at || new Date().toISOString(),
          };
        }
      }
      try {
        localStorage.setItem(STORAGE_KEY_ALISTAMIENTO_BODEGA, JSON.stringify(combinadas));
      } catch (e) {}
      return combinadas;
    }
  } catch (err) {
    console.debug("[despachos-bodega] No se pudo leer alistamiento_bodega en Supabase:", err);
  }
  return locales;
}

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
 * Motor de consolidación para el área de Bodega.
 * Filtra los productos con saldo de pedido pendiente Y saldo de inventario físico > 0.
 * Agrupa tanto por Pedido/Cliente (para empaque/guías) como por Referencia (para picking por estanterías).
 */
export function calcularInformeDespachosBodega(
  registros: RegistroPedidosDespachosHGI[],
  filtros: FiltrosDespachosBodega = {},
  decisionesGuardadas: Record<string, DecisionAlistamientoPedido> = {}
): {
  pedidos: GrupoPedidoClienteBodega[];
  todosLosPedidos: GrupoPedidoClienteBodega[];
  referenciasPicking: GrupoReferenciaPickingBodega[];
  kpis: ResumenBodegaKPIs;
  catalogos: {
    ciudades: string[];
    vendedores: string[];
    correrias: string[];
  };
} {
  const norm = (s: string | null | undefined) => (s ? s.trim().toUpperCase() : "");

  // 1. Filtrar filas que tengan pedido pendiente Y existencias en bodega
  // Para cada fila individual:
  // saldoPedido > 0 y saldoInv > 0
  const itemsDespachables: ItemPedidoBodega[] = [];
  const ciudadesSet = new Set<string>();
  const vendedoresSet = new Set<string>();

  for (const r of registros) {
    if (!r.producto || !r.producto.trim()) continue;
    const saldoPed = Number(r.saldoPedido) || 0;
    const saldoInv = Number(r.saldoInv) || 0;

    // Solo nos interesa si los clientes esperan producto Y hay existencias disponibles
    if (saldoPed <= 0 || saldoInv <= 0) continue;

    const fPedIso = normalizarFecha(r.fechas);
    const fVenceIso = normalizarFecha(r.vence);
    const diasVence = calcularDiasRestantes(fVenceIso);

    if (r.ciudad) ciudadesSet.add(r.ciudad.trim());
    if (r.vendedor) vendedoresSet.add(r.vendedor.trim());

    // Unidades que se pueden despachar de esta fila
    const unidadesDespachables = Math.min(saldoPed, saldoInv);
    const esCompleto = saldoInv >= saldoPed;
    const unidadesFaltantes = Math.max(0, saldoPed - saldoInv);

    itemsDespachables.push({
      id: r.id || `${r.documento}_${r.producto}_${r.talla}_${r.color}`,
      documento: r.documento ? r.documento.trim() : "SIN_DOCUMENTO",
      tercero: r.tercero ? r.tercero.trim() : "",
      nombre: r.nombre ? r.nombre.trim() : "CLIENTE GENERAL",
      ciudad: r.ciudad ? r.ciudad.trim() : "SIN CIUDAD",
      vendedor: r.vendedor ? r.vendedor.trim() : "SIN VENDEDOR",
      fechas: fPedIso,
      vence: fVenceIso,
      producto: r.producto.trim(),
      descripcion: r.descripcion || r.producto.trim(),
      talla: (r.talla || "UNICA").trim().toUpperCase(),
      color: (r.color || "SURTIDO").trim().toUpperCase(),
      totalPedido: Number(r.totalPedido) || 0,
      despachado: Number(r.despachado) || 0,
      saldoPedido: saldoPed,
      saldoInv: saldoInv,
      unidadesDespachables,
      esCompleto,
      unidadesFaltantes,
      diasParaVencer: diasVence,
      esVencido: diasVence !== null && diasVence < 0,
    });
  }

  // 2. Agrupar por Pedido / Documento (Perspectiva de Despacho y Empaque)
  const pedidosAgrupados: Record<
    string,
    {
      documento: string;
      tercero: string;
      nombre: string;
      ciudad: string;
      vendedor: string;
      fechas: string[];
      vences: string[];
      items: ItemPedidoBodega[];
      correriasSet: Set<string>;
      referenciasSet: Set<string>;
      totalPrendasPedido: number;
      totalPrendasDespachadas: number;
      totalPrendasPendientes: number;
      totalPrendasDespachables: number;
      totalPrendasFaltantes: number;
    }
  > = {};

  for (const item of itemsDespachables) {
    const docKey = item.documento;
    if (!pedidosAgrupados[docKey]) {
      pedidosAgrupados[docKey] = {
        documento: item.documento,
        tercero: item.tercero,
        nombre: item.nombre,
        ciudad: item.ciudad,
        vendedor: item.vendedor,
        fechas: [],
        vences: [],
        items: [],
        correriasSet: new Set(),
        referenciasSet: new Set(),
        totalPrendasPedido: 0,
        totalPrendasDespachadas: 0,
        totalPrendasPendientes: 0,
        totalPrendasDespachables: 0,
        totalPrendasFaltantes: 0,
      };
    }

    const p = pedidosAgrupados[docKey];
    p.items.push(item);
    if (item.fechas) p.fechas.push(item.fechas);
    if (item.vence) p.vences.push(item.vence);
    p.referenciasSet.add(item.producto);

    const corr = detectarCorreriaPorFecha(item.fechas || item.vence);
    if (corr) p.correriasSet.add(corr.etiqueta);

    p.totalPrendasPedido += item.totalPedido;
    p.totalPrendasDespachadas += item.despachado;
    p.totalPrendasPendientes += item.saldoPedido;
    p.totalPrendasDespachables += item.unidadesDespachables;
    p.totalPrendasFaltantes += item.unidadesFaltantes;
  }

  const todosLosPedidos: GrupoPedidoClienteBodega[] = [];

  for (const docKey of Object.keys(pedidosAgrupados)) {
    const p = pedidosAgrupados[docKey];
    const vencesSorted = [...p.vences].sort();
    const fechasSorted = [...p.fechas].sort();
    const fechaVence = vencesSorted[0] || "";
    const fechaPedido = fechasSorted[0] || "";
    const diasVenceMin = calcularDiasRestantes(fechaVence);

    let semaforoUrgencia: "vencido" | "urgente" | "normal" = "normal";
    if (diasVenceMin !== null) {
      if (diasVenceMin < 0) semaforoUrgencia = "vencido";
      else if (diasVenceMin <= 3) semaforoUrgencia = "urgente";
    }

    const pctSurtido =
      p.totalPrendasPendientes > 0
        ? Math.min(100, Math.round((p.totalPrendasDespachables / p.totalPrendasPendientes) * 100))
        : 100;

    const tipoDespacho: "completo" | "parcial" =
      p.totalPrendasFaltantes === 0 ? "completo" : "parcial";

    const decisionExistente = decisionesGuardadas[p.documento];
    const decision: DecisionAlistamientoPedido = decisionExistente || {
      documento: p.documento,
      estadoAlistamiento: "pendiente",
      transportadora: "",
      numeroGuia: "",
      bultos: 1,
      responsable: "",
      observaciones: "",
      updatedAt: new Date().toISOString(),
    };

    todosLosPedidos.push({
      documento: p.documento,
      tercero: p.tercero,
      nombre: p.nombre,
      ciudad: p.ciudad,
      vendedor: p.vendedor,
      fechaPedido,
      fechaVence,
      diasParaVencer: diasVenceMin,
      semaforoUrgencia,
      totalPrendasPedido: p.totalPrendasPedido,
      totalPrendasDespachadas: p.totalPrendasDespachadas,
      totalPrendasPendientes: p.totalPrendasPendientes,
      totalPrendasDespachables: p.totalPrendasDespachables,
      totalPrendasFaltantes: p.totalPrendasFaltantes,
      porcentajeSurtido: pctSurtido,
      tipoDespacho,
      items: p.items.sort((a, b) => a.producto.localeCompare(b.producto)),
      referenciasCount: p.referenciasSet.size,
      correrias: Array.from(p.correriasSet),
      decision,
    });
  }

  // 3. Agrupar por Referencia (Perspectiva de Picking en Bodega)
  const referenciasAgrupadas: Record<
    string,
    {
      producto: string;
      descripcion: string;
      correriasSet: Set<string>;
      ciudadesSet: Set<string>;
      vendedoresSet: Set<string>;
      pedidosSet: Set<string>;
      clientesSet: Set<string>;
      totalSaldoPedido: number;
      totalSaldoInv: number;
      totalDespachable: number;
      skus: Record<
        string,
        {
          talla: string;
          color: string;
          saldoPedido: number;
          saldoInv: number;
          unidadesDespachables: number;
          pedidosSet: Set<string>;
        }
      >;
      pedidosList: ItemPedidoBodega[];
    }
  > = {};

  for (const item of itemsDespachables) {
    const refKey = norm(item.producto);
    const skuKey = `${item.talla}___${item.color}`;

    if (!referenciasAgrupadas[refKey]) {
      referenciasAgrupadas[refKey] = {
        producto: item.producto,
        descripcion: item.descripcion,
        correriasSet: new Set(),
        ciudadesSet: new Set(),
        vendedoresSet: new Set(),
        pedidosSet: new Set(),
        clientesSet: new Set(),
        totalSaldoPedido: 0,
        totalSaldoInv: 0,
        totalDespachable: 0,
        skus: {},
        pedidosList: [],
      };
    }

    const rAcc = referenciasAgrupadas[refKey];
    rAcc.totalSaldoPedido += item.saldoPedido;
    rAcc.totalSaldoInv += item.saldoInv;
    rAcc.totalDespachable += item.unidadesDespachables;
    rAcc.ciudadesSet.add(item.ciudad);
    rAcc.vendedoresSet.add(item.vendedor);
    rAcc.pedidosSet.add(item.documento);
    rAcc.clientesSet.add(`${item.tercero}_${item.nombre}`);
    rAcc.pedidosList.push(item);

    const corr = detectarCorreriaPorFecha(item.fechas || item.vence);
    if (corr) rAcc.correriasSet.add(corr.etiqueta);

    if (!rAcc.skus[skuKey]) {
      rAcc.skus[skuKey] = {
        talla: item.talla,
        color: item.color,
        saldoPedido: 0,
        saldoInv: 0,
        unidadesDespachables: 0,
        pedidosSet: new Set(),
      };
    }

    const s = rAcc.skus[skuKey];
    s.saldoPedido += item.saldoPedido;
    s.saldoInv = item.saldoInv; // inventario registrado para este SKU
    s.unidadesDespachables += item.unidadesDespachables;
    s.pedidosSet.add(item.documento);
  }

  const referenciasPicking: GrupoReferenciaPickingBodega[] = [];

  for (const refKey of Object.keys(referenciasAgrupadas)) {
    const r = referenciasAgrupadas[refKey];
    const curva: CurvaSKUBodega[] = [];

    for (const skuKey of Object.keys(r.skus)) {
      const s = r.skus[skuKey];
      curva.push({
        talla: s.talla,
        color: s.color,
        saldoPedido: s.saldoPedido,
        saldoInv: s.saldoInv,
        unidadesDespachables: s.unidadesDespachables,
        pedidosCount: s.pedidosSet.size,
      });
    }

    curva.sort((a, b) => {
      if (a.color !== b.color) return a.color.localeCompare(b.color);
      return a.talla.localeCompare(b.talla, undefined, { numeric: true });
    });

    const corrArr = Array.from(r.correriasSet);

    referenciasPicking.push({
      producto: r.producto,
      descripcion: r.descripcion,
      correrias: corrArr,
      correriaPrincipal: corrArr[0] || "General",
      totalSaldoPedido: r.totalSaldoPedido,
      totalSaldoInv: r.totalSaldoInv,
      totalDespachable: r.totalDespachable,
      pedidosCount: r.pedidosSet.size,
      clientesCount: r.clientesSet.size,
      ciudades: Array.from(r.ciudadesSet),
      vendedores: Array.from(r.vendedoresSet),
      curva,
      pedidos: r.pedidosList,
    });
  }

  referenciasPicking.sort((a, b) => b.totalDespachable - a.totalDespachable);

  // 4. Calcular KPIs Globales
  let totalPrendasDespachables = 0;
  let totalPrendasPendientes = 0;
  let pedidosCompletos = 0;
  let pedidosParciales = 0;
  let pedidosVencidosConStock = 0;
  let pedidosUrgentesConStock = 0;
  let pedidosVigentesConStock = 0;
  const clientesBeneficiadosSet = new Set<string>();

  let pedidosPendientesPicking = 0;
  let pedidosEnPicking = 0;
  let pedidosEmpacados = 0;
  let pedidosListosDespacho = 0;
  let pedidosDespachados = 0;

  for (const p of todosLosPedidos) {
    totalPrendasDespachables += p.totalPrendasDespachables;
    totalPrendasPendientes += p.totalPrendasPendientes;
    clientesBeneficiadosSet.add(`${p.tercero}_${p.nombre}`);

    if (p.tipoDespacho === "completo") pedidosCompletos++;
    else pedidosParciales++;

    if (p.semaforoUrgencia === "vencido") pedidosVencidosConStock++;
    else if (p.semaforoUrgencia === "urgente") pedidosUrgentesConStock++;
    else pedidosVigentesConStock++;

    const st = p.decision?.estadoAlistamiento || "pendiente";
    if (st === "en_picking") pedidosEnPicking++;
    else if (st === "empacado") pedidosEmpacados++;
    else if (st === "listo_despacho") pedidosListosDespacho++;
    else if (st === "despachado") pedidosDespachados++;
    else pedidosPendientesPicking++;
  }

  const kpis: ResumenBodegaKPIs = {
    totalPrendasDespachables,
    totalPrendasPendientes,
    totalPedidosDespachables: todosLosPedidos.length,
    pedidosCompletos,
    pedidosParciales,
    totalClientesBeneficiados: clientesBeneficiadosSet.size,
    pedidosVencidosConStock,
    pedidosUrgentesConStock,
    pedidosVigentesConStock,
    pedidosPendientesPicking,
    pedidosEnPicking,
    pedidosEmpacados,
    pedidosListosDespacho,
    pedidosDespachados,
    totalReferenciasDistintas: referenciasPicking.length,
  };

  // 5. Aplicar Filtros de usuario sobre los pedidos
  let pedidosFiltrados = [...todosLosPedidos];

  // Filtro por tipo de despacho
  if (filtros.tipoDespacho && filtros.tipoDespacho !== "todos") {
    pedidosFiltrados = pedidosFiltrados.filter((p) => p.tipoDespacho === filtros.tipoDespacho);
  }

  // Filtro por estado de alistamiento
  if (filtros.estadoAlistamiento && filtros.estadoAlistamiento !== "todos") {
    pedidosFiltrados = pedidosFiltrados.filter(
      (p) => p.decision.estadoAlistamiento === filtros.estadoAlistamiento
    );
  }

  // Filtro por urgencia
  if (filtros.urgencia && filtros.urgencia !== "todos") {
    if (filtros.urgencia === "vencidos") {
      pedidosFiltrados = pedidosFiltrados.filter((p) => p.semaforoUrgencia === "vencido");
    } else if (filtros.urgencia === "urgentes") {
      pedidosFiltrados = pedidosFiltrados.filter((p) => p.semaforoUrgencia === "urgente");
    } else if (filtros.urgencia === "normales") {
      pedidosFiltrados = pedidosFiltrados.filter((p) => p.semaforoUrgencia === "normal");
    }
  }

  // Filtro por ciudad
  if (filtros.ciudad && filtros.ciudad !== "todas") {
    const cNorm = filtros.ciudad.toLowerCase().trim();
    pedidosFiltrados = pedidosFiltrados.filter((p) => p.ciudad.toLowerCase().includes(cNorm));
  }

  // Filtro por vendedor
  if (filtros.vendedor && filtros.vendedor !== "todos") {
    const vNorm = filtros.vendedor.toLowerCase().trim();
    pedidosFiltrados = pedidosFiltrados.filter((p) => p.vendedor.toLowerCase().includes(vNorm));
  }

  // Filtro por correría
  if (filtros.correria && filtros.correria !== "todas") {
    const cClave = filtros.correria.toUpperCase();
    pedidosFiltrados = pedidosFiltrados.filter((p) =>
      p.correrias.some((c) => c.toUpperCase().includes(cClave))
    );
  }

  // Filtro de búsqueda
  if (filtros.busqueda && filtros.busqueda.trim()) {
    const b = filtros.busqueda.toLowerCase().trim();
    pedidosFiltrados = pedidosFiltrados.filter((p) => {
      return (
        p.documento.toLowerCase().includes(b) ||
        p.nombre.toLowerCase().includes(b) ||
        p.tercero.toLowerCase().includes(b) ||
        p.ciudad.toLowerCase().includes(b) ||
        p.vendedor.toLowerCase().includes(b) ||
        (p.decision.transportadora || "").toLowerCase().includes(b) ||
        (p.decision.numeroGuia || "").toLowerCase().includes(b) ||
        p.items.some(
          (it) =>
            it.producto.toLowerCase().includes(b) ||
            it.descripcion.toLowerCase().includes(b) ||
            it.color.toLowerCase().includes(b) ||
            it.talla.toLowerCase().includes(b)
        )
      );
    });
  }

  // 6. Ordenamiento
  const orden = filtros.ordenarPor || "urgencia_asc";
  pedidosFiltrados.sort((a, b) => {
    switch (orden) {
      case "urgencia_asc": {
        const peso = (u: string) => (u === "vencido" ? 1 : u === "urgente" ? 2 : 3);
        const diffPeso = peso(a.semaforoUrgencia) - peso(b.semaforoUrgencia);
        if (diffPeso !== 0) return diffPeso;
        return (a.diasParaVencer || 0) - (b.diasParaVencer || 0);
      }
      case "despachables_desc":
        return b.totalPrendasDespachables - a.totalPrendasDespachables;
      case "porcentaje_desc":
        return b.porcentajeSurtido - a.porcentajeSurtido;
      case "documento_asc":
        return a.documento.localeCompare(b.documento);
      case "cliente_asc":
        return a.nombre.localeCompare(b.nombre);
      case "ciudad_asc":
        return a.ciudad.localeCompare(b.ciudad);
      default:
        return b.totalPrendasDespachables - a.totalPrendasDespachables;
    }
  });

  return {
    pedidos: pedidosFiltrados,
    todosLosPedidos,
    referenciasPicking,
    kpis,
    catalogos: {
      ciudades: Array.from(ciudadesSet).sort(),
      vendedores: Array.from(vendedoresSet).sort(),
      correrias: CORRERIAS_OFICIALES.map((c) => c.clave),
    },
  };
}

/**
 * Exporta la Planilla Oficial de Alistamiento y Despachos para Bodega (.xlsx)
 * con 3 hojas estructuradas:
 * 1. Planilla de Despacho por Pedido (Guías, empaques, clientes y transportadoras)
 * 2. Planilla Maestra de Picking por Referencia y Talla/Color (Para operadores en pasillos de bodega)
 * 3. Detalle Íntegro SKU por Pedido
 */
export function exportarPlanillaBodegaExcel(
  pedidos: GrupoPedidoClienteBodega[],
  referencias: GrupoReferenciaPickingBodega[],
  nombreArchivo: string = "Planilla_Alistamiento_Despachos_Bodega.xlsx"
) {
  const wb = XLSX.utils.book_new();

  // Hoja 1: Planilla por Pedido / Cliente
  const filasPedidos: (string | number)[][] = [
    [
      "DOCUMENTO",
      "NIT / TERCERO",
      "CLIENTE",
      "CIUDAD DESTINO",
      "ASESOR COMERCIAL",
      "FECHA PEDIDO",
      "FECHA VENCE",
      "URGENCIA",
      "DIAS VENCIMIENTO",
      "TIPO DESPACHO",
      "PRENDAS DESPACHABLES HOY",
      "PRENDAS PENDIENTES TOTAL",
      "% SURTIDO DISPONIBLE",
      "REFERENCIAS DISTINTAS",
      "ESTADO ALISTAMIENTO",
      "TRANSPORTADORA",
      "NUMERO GUIA",
      "BULTOS / CAJAS",
      "RESPONSABLE BODEGA",
      "OBSERVACIONES LOGISTICAS",
    ],
  ];

  for (const p of pedidos) {
    const dec = p.decision;
    filasPedidos.push([
      p.documento,
      p.tercero,
      p.nombre,
      p.ciudad,
      p.vendedor,
      p.fechaPedido,
      p.fechaVence,
      p.semaforoUrgencia.toUpperCase(),
      p.diasParaVencer !== null ? String(p.diasParaVencer) : "N/A",
      p.tipoDespacho === "completo" ? "100% COMPLETO" : "PARCIAL",
      p.totalPrendasDespachables,
      p.totalPrendasPendientes,
      `${p.porcentajeSurtido}%`,
      p.referenciasCount,
      (dec?.estadoAlistamiento || "pendiente").toUpperCase(),
      dec?.transportadora || "SIN ASIGNAR",
      dec?.numeroGuia || "",
      dec?.bultos || 1,
      dec?.responsable || "",
      dec?.observaciones || "",
    ]);
  }

  const wsPedidos = XLSX.utils.aoa_to_sheet(filasPedidos);
  XLSX.utils.book_append_sheet(wb, wsPedidos, "Planilla_Despacho_Pedidos");

  // Hoja 2: Planilla Maestra de Picking (por Referencia y Talla/Color)
  const filasPicking: (string | number)[][] = [
    [
      "REFERENCIA",
      "DESCRIPCION",
      "TALLA",
      "COLOR",
      "CANTIDAD A EXTRAER (PICKING)",
      "INVENTARIO DISPONIBLE BODEGA",
      "TOTAL PEDIDO POR CLIENTES",
      "PEDIDOS QUE LA ESPERAN",
      "CORRERIAS",
    ],
  ];

  for (const r of referencias) {
    for (const c of r.curva) {
      if (c.unidadesDespachables > 0) {
        filasPicking.push([
          r.producto,
          r.descripcion,
          c.talla,
          c.color,
          c.unidadesDespachables,
          c.saldoInv,
          c.saldoPedido,
          c.pedidosCount,
          r.correrias.join(" | "),
        ]);
      }
    }
  }

  const wsPicking = XLSX.utils.aoa_to_sheet(filasPicking);
  XLSX.utils.book_append_sheet(wb, wsPicking, "Lista_Picking_Pasillos");

  // Hoja 3: Detalle Completo de Prendas por Pedido
  const filasDetalle: (string | number)[][] = [
    [
      "DOCUMENTO",
      "CLIENTE",
      "CIUDAD",
      "REFERENCIA",
      "DESCRIPCION",
      "TALLA",
      "COLOR",
      "A DESPACHAR HOY",
      "PENDIENTE TOTAL",
      "STOCK EN BODEGA",
      "ESTADO ITEM",
    ],
  ];

  for (const p of pedidos) {
    for (const it of p.items) {
      filasDetalle.push([
        p.documento,
        p.nombre,
        p.ciudad,
        it.producto,
        it.descripcion,
        it.talla,
        it.color,
        it.unidadesDespachables,
        it.saldoPedido,
        it.saldoInv,
        it.esCompleto ? "COMPLETO" : "PARCIAL",
      ]);
    }
  }

  const wsDetalle = XLSX.utils.aoa_to_sheet(filasDetalle);
  XLSX.utils.book_append_sheet(wb, wsDetalle, "Detalle_Prendas_Pedidos");

  XLSX.writeFile(wb, nombreArchivo);
}

/**
 * Exporta plano CSV para lectores ópticos de código de barras / ERP de Bodega
 */
export function exportarPlanillaPickingCSV(
  referencias: GrupoReferenciaPickingBodega[],
  nombreArchivo: string = "Lista_Picking_Bodega.csv"
) {
  const lineas = [
    "REFERENCIA,TALLA,COLOR,CANTIDAD_A_ALISTAR,DESCRIPCION,STOCK_BODEGA,PEDIDOS_AFECTADOS",
  ];

  for (const r of referencias) {
    for (const c of r.curva) {
      if (c.unidadesDespachables > 0) {
        lineas.push(
          `"${r.producto}","${c.talla}","${c.color}",${c.unidadesDespachables},"${r.descripcion.replace(/"/g, '""')}",${c.saldoInv},${c.pedidosCount}`
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
