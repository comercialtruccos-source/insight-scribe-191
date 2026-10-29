// Sistema de almacenamiento persistente en Supabase, parseo y agregación para
// el reporte oficial de HGI: Pedidos vs Despachos (18 Columnas Oficiales)
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";

export interface RegistroPedidosDespachosHGI {
  id: string;
  transaccion: string;
  tercero: string;
  nombre: string;
  vendedor: string;
  ciudad: string;
  fechas: string;
  vence: string;
  documento: string;
  producto: string;
  descripcion: string;
  talla: string;
  color: string;
  anterior: number;
  pedidoMes: number;
  totalPedido: number; // anterior + pedidoMes
  despachado: number;
  cancelado: number;
  saldoPedido: number;
  saldoInv: number;
  esPendiente: boolean;
}

export interface MetadataCargaPedidosDespachos {
  fechaCarga: string;
  nombreArchivo: string;
  totalRegistros: number;
  totalAnterior: number;
  totalPedidoMes: number;
  totalPedidos: number;
  totalDespachado: number;
  totalCancelado: number;
  totalSaldoPedido: number;
  totalSaldoInv: number;
  nivelServicioPct: number;
  vendedoresCount: number;
  clientesCount: number;
  ciudadesCount: number;
}

export interface GrupoTerceroHGI {
  tercero: string;
  nombre: string;
  ciudad: string;
  vendedor: string;
  anterior: number;
  pedidoMes: number;
  totalPedido: number;
  despachado: number;
  cancelado: number;
  saldoPedido: number;
  saldoInv: number;
  esPendiente: boolean;
  items: RegistroPedidosDespachosHGI[];
}

export interface GrupoVendedorHGI {
  vendedor: string;
  anterior: number;
  pedidoMes: number;
  totalPedido: number;
  despachado: number;
  cancelado: number;
  saldoPedido: number;
  saldoInv: number;
  esPendiente: boolean;
  terceros: GrupoTerceroHGI[];
}

export interface ResultadoAgrupacionHGI {
  vendedores: GrupoVendedorHGI[];
  kpis: {
    totalAnterior: number;
    totalPedidoMes: number;
    totalPedidos: number;
    totalDespachado: number;
    totalCancelado: number;
    totalSaldoPedido: number;
    totalSaldoInv: number;
    nivelServicioPct: number;
    clientesCount: number;
    clientesConPendientesCount: number;
    vendedoresCount: number;
  };
  catalogos: {
    vendedores: string[];
    ciudades: string[];
    clientes: { tercero: string; nombre: string }[];
  };
}

export const STORAGE_KEY_META = "TRUCCOS_PEDIDOS_DESPACHOS_META_V1";
export const STORAGE_KEY_DATA = "TRUCCOS_PEDIDOS_DESPACHOS_DATA_V1";
export const EVENT_PEDIDOS_DESPACHOS_UPDATED = "truccos-pedidos-despachos-updated";

// Cache en memoria para renderizado ultra veloz
let cacheRegistros: RegistroPedidosDespachosHGI[] | null = null;
let cacheMeta: MetadataCargaPedidosDespachos | null = null;

/**
 * Limpieza numérica flexible
 */
export function limpiarNumero(val: unknown): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  let s = String(val).trim();
  if (!s || s === "-" || s === "--") return 0;

  let esNeg = false;
  if (s.startsWith("-") || (s.startsWith("(") && s.endsWith(")"))) {
    esNeg = true;
    s = s.replace(/^[-\(]/, "").replace(/\)$/, "").trim();
  }

  s = s.replace(/[$%,\s]/g, "");
  const n = parseFloat(s);
  if (isNaN(n)) return 0;
  return esNeg ? -n : n;
}

/**
 * Normaliza nombres de columna eliminando acentos, caracteres especiales y espacios
 */
export function normalizarHeader(header: string): string {
  return String(header || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Mapeo inteligente de encabezados de las 18 columnas requeridas
 */
interface IndicesColumnas {
  transaccion: number;
  tercero: number;
  nombre: number;
  vendedor: number;
  ciudad: number;
  fechas: number;
  vence: number;
  documento: number;
  producto: number;
  descripcion: number;
  talla: number;
  color: number;
  anterior: number;
  pedidoMes: number;
  despachado: number;
  cancelado: number;
  saldoPedido: number;
  saldoInv: number;
}

function detectarIndices(headers: string[]): IndicesColumnas {
  const norm = headers.map(normalizarHeader);

  const buscar = (patrones: string[]): number => {
    for (const pat of patrones) {
      const idx = norm.findIndex((h) => h === pat || h.includes(pat));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  return {
    transaccion: buscar(["transaccion", "trans", "tipo"]),
    tercero: buscar(["tercero", "nit", "cedula", "idtercero", "codcliente", "clienteid"]),
    nombre: buscar(["nombre", "razonsocial", "nombretercero", "cliente", "nombrecliente"]),
    vendedor: buscar(["vendedor", "asesor", "asesorcomercial", "nomvendedor", "vendedorid"]),
    ciudad: buscar(["ciudad", "municipio", "poblacion", "zona"]),
    fechas: buscar(["fechas", "fecha", "fechapedido", "fecpedido", "fecdoc"]),
    vence: buscar(["vence", "fechavence", "fechavencimiento", "vencimiento"]),
    documento: buscar(["documento", "doc", "nropedido", "pedido", "numero", "nrodoc"]),
    producto: buscar(["producto", "codproducto", "referencia", "ref", "articulo", "item"]),
    descripcion: buscar(["descripcion", "desc", "descripcionproducto", "nombreproducto", "prenda"]),
    talla: buscar(["talla", "tal", "size"]),
    color: buscar(["color", "col", "tono"]),
    anterior: buscar(["anterior", "saldoanterior", "pedanterior"]),
    pedidoMes: buscar(["pedidomes", "pedmes", "mespedido", "nuevopedido", "pedido"]),
    despachado: buscar(["despachado", "despachos", "despacho", "salidas", "entregado"]),
    cancelado: buscar(["cancelado", "anulado", "devolucion"]),
    saldoPedido: buscar(["saldopedido", "pendiente", "porcumplir", "saldo"]),
    saldoInv: buscar(["saldoinv", "inventario", "inv", "stock", "existencia", "disponible"]),
  };
}

/**
 * Parsea un archivo Excel o CSV con las 18 columnas oficiales de Pedidos vs Despachos
 */
export async function parsearArchivoPedidosDespachos(file: File): Promise<{
  registros: RegistroPedidosDespachosHGI[];
  metadata: MetadataCargaPedidosDespachos;
  headersEncontrados: string[];
}> {
  const nombreArchivo = file.name;
  const esCsv = nombreArchivo.toLowerCase().endsWith(".csv");
  let matrizFilas: string[][] = [];

  if (esCsv) {
    const texto = await file.text();
    const resultado = Papa.parse<string[]>(texto, {
      skipEmptyLines: true,
      header: false,
    });
    matrizFilas = resultado.data as string[][];
  } else {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });
    const nombreHoja = wb.SheetNames[0];
    const hoja = wb.Sheets[nombreHoja];
    matrizFilas = XLSX.utils.sheet_to_json<string[]>(hoja, {
      header: 1,
      defval: "",
      raw: false,
    });
  }

  if (!matrizFilas || matrizFilas.length < 2) {
    throw new Error("El archivo no contiene suficientes filas para procesar.");
  }

  // Buscar la fila de encabezados
  let filaHeaderIdx = -1;
  let indices: IndicesColumnas | null = null;

  for (let i = 0; i < Math.min(15, matrizFilas.length); i++) {
    const fila = matrizFilas[i].map(String);
    const ind = detectarIndices(fila);
    let encontrados = 0;
    if (ind.producto !== -1) encontrados++;
    if (ind.tercero !== -1 || ind.nombre !== -1) encontrados++;
    if (ind.vendedor !== -1) encontrados++;
    if (ind.saldoPedido !== -1 || ind.despachado !== -1 || ind.pedidoMes !== -1) encontrados++;

    if (encontrados >= 3) {
      filaHeaderIdx = i;
      indices = ind;
      break;
    }
  }

  if (filaHeaderIdx === -1 || !indices) {
    throw new Error(
      "No se identificaron los encabezados oficiales requeridos (Transaccion, Tercero, Nombre, Vendedor, Ciudad, Fechas, Vence, Documento, Producto, Descripcion, Talla, Color, Anterior, Pedido Mes, Despachado, Cancelado, Saldo Pedido, Saldo Inv)."
    );
  }

  const headers = matrizFilas[filaHeaderIdx].map(String);
  const filasDatos = matrizFilas.slice(filaHeaderIdx + 1);

  const registros: RegistroPedidosDespachosHGI[] = [];
  const vendedoresSet = new Set<string>();
  const clientesSet = new Set<string>();
  const ciudadesSet = new Set<string>();

  let sumAnterior = 0;
  let sumPedidoMes = 0;
  let sumTotalPedido = 0;
  let sumDespachado = 0;
  let sumCancelado = 0;
  let sumSaldoPedido = 0;
  let sumSaldoInv = 0;

  const val = (row: string[], idx: number): string => {
    if (idx === -1 || idx >= row.length) return "";
    return String(row[idx] ?? "").trim();
  };

  const num = (row: string[], idx: number): number => {
    if (idx === -1 || idx >= row.length) return 0;
    return limpiarNumero(row[idx]);
  };

  for (let i = 0; i < filasDatos.length; i++) {
    const row = filasDatos[i];
    if (!row || row.every((c) => !c || String(c).trim() === "")) continue;

    const producto = val(row, indices.producto);
    const nombre = val(row, indices.nombre);
    const tercero = val(row, indices.tercero);
    const vendedor = val(row, indices.vendedor);
    const ciudad = val(row, indices.ciudad);
    const descripcion = val(row, indices.descripcion);
    const talla = val(row, indices.talla);
    const color = val(row, indices.color);
    const documento = val(row, indices.documento);
    const transaccion = val(row, indices.transaccion) || "PEDIDO";
    const fechas = val(row, indices.fechas);
    const vence = val(row, indices.vence);

    const anterior = num(row, indices.anterior);
    const pedidoMes = num(row, indices.pedidoMes);
    const despachado = num(row, indices.despachado);
    const cancelado = num(row, indices.cancelado);
    let saldoPedido = num(row, indices.saldoPedido);
    const saldoInv = num(row, indices.saldoInv);

    const totalPedido = anterior + pedidoMes;
    // Si la columna saldoPedido no vino o vino en 0 pero hay totalPedido - despachado - cancelado, recalcular
    if (saldoPedido === 0 && totalPedido > 0 && despachado === 0 && cancelado === 0) {
      saldoPedido = totalPedido;
    }

    // Filtrar filas de subtotales que suelen venir en exportes de HGI
    const nombreUpper = nombre.toUpperCase();
    const prodUpper = producto.toUpperCase();
    if (
      nombreUpper.includes("TOTAL") ||
      nombreUpper.includes("SUBTOTAL") ||
      prodUpper.includes("TOTAL") ||
      prodUpper.includes("SUBTOTAL")
    ) {
      continue;
    }

    if (!producto && !nombre && !tercero) continue;

    sumAnterior += anterior;
    sumPedidoMes += pedidoMes;
    sumTotalPedido += totalPedido;
    sumDespachado += despachado;
    sumCancelado += cancelado;
    sumSaldoPedido += saldoPedido;
    sumSaldoInv += saldoInv;

    if (vendedor) vendedoresSet.add(vendedor);
    if (tercero || nombre) clientesSet.add(tercero || nombre);
    if (ciudad) ciudadesSet.add(ciudad);

    const esPendiente = saldoPedido > 0;

    registros.push({
      id: `hgi-${i + 1}-${Date.now()}`,
      transaccion,
      tercero: tercero || "SIN_NIT",
      nombre: nombre || "CLIENTE NO DEFINIDO",
      vendedor: vendedor || "SIN ASIGNAR",
      ciudad: ciudad || "SIN CIUDAD",
      fechas,
      vence,
      documento: documento || `PED-${i + 1}`,
      producto: producto || "SIN_REF",
      descripcion: descripcion || "PRODUCTO HGI",
      talla,
      color,
      anterior,
      pedidoMes,
      totalPedido,
      despachado,
      cancelado,
      saldoPedido,
      saldoInv,
      esPendiente,
    });
  }

  const nivelServicioPct = sumTotalPedido > 0 ? (sumDespachado / sumTotalPedido) * 100 : 100;

  const metadata: MetadataCargaPedidosDespachos = {
    fechaCarga: new Date().toISOString(),
    nombreArchivo,
    totalRegistros: registros.length,
    totalAnterior: sumAnterior,
    totalPedidoMes: sumPedidoMes,
    totalPedidos: sumTotalPedido,
    totalDespachado: sumDespachado,
    totalCancelado: sumCancelado,
    totalSaldoPedido: sumSaldoPedido,
    totalSaldoInv: sumSaldoInv,
    nivelServicioPct,
    vendedoresCount: vendedoresSet.size,
    clientesCount: clientesSet.size,
    ciudadesCount: ciudadesSet.size,
  };

  return { registros, metadata, headersEncontrados: headers };
}

/**
 * Guarda los registros de pedidos vs despachos en la base de datos de SUPABASE (public.pedidos_despachos)
 */
export async function guardarDatosPedidosDespachos(
  registros: RegistroPedidosDespachosHGI[],
  metadata: MetadataCargaPedidosDespachos,
  onProgreso?: (porcentaje: number, loteActual: number, totalLotes: number) => void
): Promise<void> {
  // 1. Limpiar registros previos en la tabla pedidos_despachos de Supabase
  const { error: deleteError } = await supabase
    .from("pedidos_despachos")
    .delete()
    .neq("id", 0);

  if (deleteError) {
    console.error("[pedidos-despachos-storage] Error limpiando tabla pedidos_despachos:", deleteError);
    throw new Error(`Error al preparar base de datos Supabase: ${deleteError.message}`);
  }

  // 2. Insertar en lotes de 500 registros para evitar timeouts o payloads excesivos
  const BATCH_SIZE = 500;
  const totalLotes = Math.ceil(registros.length / BATCH_SIZE);

  for (let i = 0; i < registros.length; i += BATCH_SIZE) {
    const loteActual = Math.floor(i / BATCH_SIZE) + 1;
    const chunk = registros.slice(i, i + BATCH_SIZE).map((r) => ({
      transaccion: r.transaccion || "PEDIDO",
      tercero: String(r.tercero || ""),
      nombre: r.nombre || "",
      vendedor: r.vendedor || "",
      ciudad: r.ciudad || "",
      fechas: r.fechas || "",
      vence: r.vence || "",
      documento: r.documento || "",
      producto: r.producto || "",
      descripcion: r.descripcion || "",
      talla: r.talla || "",
      color: r.color || "",
      anterior: r.anterior || 0,
      pedido_mes: r.pedidoMes || 0,
      total_pedido: r.totalPedido || 0,
      despachado: r.despachado || 0,
      cancelado: r.cancelado || 0,
      saldo_pedido: r.saldoPedido || 0,
      saldo_inv: r.saldoInv || 0,
    }));

    const { error: insertError } = await supabase
      .from("pedidos_despachos")
      .insert(chunk);

    if (insertError) {
      console.error(`[pedidos-despachos-storage] Error insertando lote ${loteActual}:`, insertError);
      throw new Error(`Error al insertar lote ${loteActual} de ${totalLotes} en Supabase: ${insertError.message}`);
    }

    if (onProgreso) {
      const pct = Math.round((loteActual / totalLotes) * 100);
      onProgreso(pct, loteActual, totalLotes);
    }
  }

  // 3. Registrar en historial de cargas (cargas_pedidos_despachos)
  try {
    await supabase.from("cargas_pedidos_despachos").insert({
      archivo: metadata.nombreArchivo,
      filas_recibidas: metadata.totalRegistros,
      filas_insertadas: registros.length,
      total_pedidos: metadata.totalPedidos,
      total_despachado: metadata.totalDespachado,
      total_saldo_pedido: metadata.totalSaldoPedido,
    });
  } catch (err) {
    console.warn("[pedidos-despachos-storage] Advertencia registrando en historial cargas:", err);
  }

  // 4. Actualizar memoria y emitir evento
  cacheRegistros = registros;
  cacheMeta = metadata;

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY_META, JSON.stringify(metadata));
    } catch {}

    window.dispatchEvent(
      new CustomEvent(EVENT_PEDIDOS_DESPACHOS_UPDATED, {
        detail: { metadata, timestamp: Date.now() },
      })
    );
  }
}

/**
 * Obtiene los registros guardados consultando directamente la base de datos de SUPABASE
 */
export async function obtenerDatosPedidosDespachos(): Promise<RegistroPedidosDespachosHGI[]> {
  try {
    let todosLosRegistros: any[] = [];
    let offset = 0;
    const limit = 1000;
    let hayMas = true;

    while (hayMas) {
      const { data, error } = await supabase
        .from("pedidos_despachos")
        .select("*")
        .range(offset, offset + limit - 1)
        .order("id", { ascending: true });

      if (error) {
        console.warn("[pedidos-despachos-storage] Error consultando Supabase pedidos_despachos:", error);
        break;
      }

      if (!data || data.length === 0) {
        hayMas = false;
      } else {
        todosLosRegistros = todosLosRegistros.concat(data);
        if (data.length < limit) {
          hayMas = false;
        } else {
          offset += limit;
        }
      }
    }

    if (todosLosRegistros.length > 0) {
      const mapeados: RegistroPedidosDespachosHGI[] = todosLosRegistros.map((row) => {
        const anterior = Number(row.anterior) || 0;
        const pedidoMes = Number(row.pedido_mes) || 0;
        const totalPedido = Number(row.total_pedido) || anterior + pedidoMes;
        const despachado = Number(row.despachado) || 0;
        const cancelado = Number(row.cancelado) || 0;
        const saldoPedido = Number(row.saldo_pedido) || 0;
        const saldoInv = Number(row.saldo_inv) || 0;

        return {
          id: String(row.id),
          transaccion: row.transaccion || "PEDIDO",
          tercero: String(row.tercero || ""),
          nombre: row.nombre || "",
          vendedor: row.vendedor || "",
          ciudad: row.ciudad || "",
          fechas: row.fechas || "",
          vence: row.vence || "",
          documento: row.documento || "",
          producto: row.producto || "",
          descripcion: row.descripcion || "",
          talla: row.talla || "",
          color: row.color || "",
          anterior,
          pedidoMes,
          totalPedido,
          despachado,
          cancelado,
          saldoPedido,
          saldoInv,
          esPendiente: saldoPedido > 0,
        };
      });

      cacheRegistros = mapeados;
      return mapeados;
    }
  } catch (err) {
    console.error("[pedidos-despachos-storage] Error general obteniendo datos de Supabase:", err);
  }

  if (cacheRegistros) return cacheRegistros;
  return [];
}

/**
 * Obtiene la metadata de la última carga (desde memoria o Supabase)
 */
export function obtenerMetadataPedidosDespachos(): MetadataCargaPedidosDespachos | null {
  if (cacheMeta) return cacheMeta;
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY_META);
      if (raw) {
        cacheMeta = JSON.parse(raw);
        return cacheMeta;
      }
    } catch {}
  }
  return null;
}

/**
 * Obtiene la metadata asíncrona consultando cargas_pedidos_despachos en Supabase
 */
export async function obtenerMetadataPedidosDespachosAsync(): Promise<MetadataCargaPedidosDespachos | null> {
  try {
    const { data, error } = await supabase
      .from("cargas_pedidos_despachos")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      const meta: MetadataCargaPedidosDespachos = {
        fechaCarga: data.created_at,
        nombreArchivo: data.archivo || "Reporte Oficial HGI",
        totalRegistros: data.filas_insertadas || 0,
        totalAnterior: 0,
        totalPedidoMes: 0,
        totalPedidos: Number(data.total_pedidos) || 0,
        totalDespachado: Number(data.total_despachado) || 0,
        totalCancelado: 0,
        totalSaldoPedido: Number(data.total_saldo_pedido) || 0,
        totalSaldoInv: 0,
        nivelServicioPct:
          Number(data.total_pedidos) > 0
            ? (Number(data.total_despachado) / Number(data.total_pedidos)) * 100
            : 100,
        vendedoresCount: 0,
        clientesCount: 0,
        ciudadesCount: 0,
      };
      cacheMeta = meta;
      return meta;
    }
  } catch (err) {
    console.warn("[pedidos-despachos-storage] Error consultando cargas_pedidos_despachos:", err);
  }

  return obtenerMetadataPedidosDespachos();
}

/**
 * Verifica si hay datos cargados en Supabase
 */
export async function verificarHayDatosEnSupabase(): Promise<boolean> {
  try {
    const { count, error } = await supabase
      .from("pedidos_despachos")
      .select("id", { count: "exact", head: true });

    if (!error && typeof count === "number") {
      return count > 0;
    }
  } catch {}
  return hayDatosPedidosDespachos();
}

/**
 * Verifica de forma síncrona si hay datos conocidos
 */
export function hayDatosPedidosDespachos(): boolean {
  if (cacheRegistros && cacheRegistros.length > 0) return true;
  return obtenerMetadataPedidosDespachos() !== null;
}

/**
 * Limpia los datos de pedidos_despachos en Supabase
 */
export async function limpiarDatosPedidosDespachos(): Promise<void> {
  cacheRegistros = null;
  cacheMeta = null;

  try {
    await supabase.from("pedidos_despachos").delete().neq("id", 0);
  } catch (e) {
    console.warn("[pedidos-despachos-storage] Error limpiando Supabase:", e);
  }

  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY_META);
    window.localStorage.removeItem(STORAGE_KEY_DATA);
    window.dispatchEvent(
      new CustomEvent(EVENT_PEDIDOS_DESPACHOS_UPDATED, {
        detail: { metadata: null, timestamp: Date.now() },
      })
    );
  }
}

/**
 * Agrupa y estructura los registros con filtros dinámicos en formato HGI Pedidos vs Despachos
 */
export function estructurarPedidosDespachosHGI(
  registros: RegistroPedidosDespachosHGI[],
  filtros: {
    vendedor?: string;
    tercero?: string;
    ciudad?: string;
    busqueda?: string;
    soloPendientes?: boolean;
    fechaDesde?: string;
    fechaHasta?: string;
  } = {}
): ResultadoAgrupacionHGI {
  const norm = (s: string | null | undefined) =>
    String(s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  const queryTokens = norm(filtros.busqueda).split(/\s+/).filter(Boolean);
  const vendedorFiltro = filtros.vendedor && filtros.vendedor !== "todos" ? norm(filtros.vendedor) : null;
  const terceroFiltro = filtros.tercero && filtros.tercero !== "todos" ? norm(filtros.tercero) : null;
  const ciudadFiltro = filtros.ciudad && filtros.ciudad !== "todas" ? norm(filtros.ciudad) : null;
  const soloPendientes = filtros.soloPendientes ?? true;

  // Catálogos únicos para los selectores
  const vendedoresSet = new Set<string>();
  const ciudadesSet = new Set<string>();
  const clientesMap = new Map<string, string>();

  // 1. Filtrar registros individuales
  const registrosFiltrados: RegistroPedidosDespachosHGI[] = [];

  for (const r of registros) {
    if (r.vendedor) vendedoresSet.add(r.vendedor);
    if (r.ciudad) ciudadesSet.add(r.ciudad);
    if (r.tercero) clientesMap.set(r.tercero, r.nombre);

    if (vendedorFiltro && !norm(r.vendedor).includes(vendedorFiltro)) continue;
    if (terceroFiltro && !norm(r.tercero).includes(terceroFiltro) && !norm(r.nombre).includes(terceroFiltro)) {
      continue;
    }
    if (ciudadFiltro && !norm(r.ciudad).includes(ciudadFiltro)) continue;
    if (soloPendientes && !r.esPendiente) continue;

    // Filtro por rango de fechas (si las fechas vienen informadas en formato YYYY-MM-DD o DD/MM/YYYY)
    if (filtros.fechaDesde || filtros.fechaHasta) {
      const fItem = r.fechas.trim();
      if (fItem && fItem.length >= 8) {
        // Normalizar a YYYY-MM-DD si es DD/MM/YYYY
        let fechaIso = fItem;
        if (fItem.includes("/")) {
          const partes = fItem.split("/");
          if (partes.length === 3) {
            const d = partes[0].padStart(2, "0");
            const m = partes[1].padStart(2, "0");
            const y = partes[2].length === 2 ? `20${partes[2]}` : partes[2];
            fechaIso = `${y}-${m}-${d}`;
          }
        }
        if (filtros.fechaDesde && fechaIso < filtros.fechaDesde) continue;
        if (filtros.fechaHasta && fechaIso > filtros.fechaHasta) continue;
      }
    }

    // Filtro de búsqueda textual multi-término
    if (queryTokens.length > 0) {
      const filaTexto = norm(
        `${r.vendedor} ${r.tercero} ${r.nombre} ${r.ciudad} ${r.documento} ${r.producto} ${r.descripcion} ${r.talla} ${r.color}`
      );
      const coincide = queryTokens.every((tok) => filaTexto.includes(tok));
      if (!coincide) continue;
    }

    registrosFiltrados.push(r);
  }

  // 2. Agrupación jerárquica: Vendedor -> Tercero -> Items
  const vendedoresMap = new Map<string, Map<string, GrupoTerceroHGI>>();

  for (const r of registrosFiltrados) {
    const vKey = r.vendedor.trim() || "VENDEDOR GENERAL";
    const tKey = `${r.tercero.trim()}|${r.nombre.trim()}`;

    if (!vendedoresMap.has(vKey)) {
      vendedoresMap.set(vKey, new Map());
    }

    const tMap = vendedoresMap.get(vKey)!;
    if (!tMap.has(tKey)) {
      tMap.set(tKey, {
        tercero: r.tercero,
        nombre: r.nombre,
        ciudad: r.ciudad,
        vendedor: r.vendedor,
        anterior: 0,
        pedidoMes: 0,
        totalPedido: 0,
        despachado: 0,
        cancelado: 0,
        saldoPedido: 0,
        saldoInv: 0,
        esPendiente: false,
        items: [],
      });
    }

    const tObj = tMap.get(tKey)!;
    tObj.items.push(r);
    tObj.anterior += r.anterior;
    tObj.pedidoMes += r.pedidoMes;
    tObj.totalPedido += r.totalPedido;
    tObj.despachado += r.despachado;
    tObj.cancelado += r.cancelado;
    tObj.saldoPedido += r.saldoPedido;
    tObj.saldoInv += r.saldoInv;
    tObj.esPendiente = tObj.saldoPedido > 0;
  }

  // 3. Estructurar matriz final y calcular KPIs
  let kpiAnterior = 0;
  let kpiPedidoMes = 0;
  let kpiTotalPedido = 0;
  let kpiDespachado = 0;
  let kpiCancelado = 0;
  let kpiSaldoPedido = 0;
  let kpiSaldoInv = 0;
  let kpiClientesConPendientes = 0;
  let kpiClientesTotal = 0;

  const resultadoVendedores: GrupoVendedorHGI[] = [];

  for (const [vKey, tMap] of vendedoresMap.entries()) {
    let vAnt = 0;
    let vPed = 0;
    let vTot = 0;
    let vDesp = 0;
    let vCanc = 0;
    let vSaldo = 0;
    let vInv = 0;

    const tercerosList: GrupoTerceroHGI[] = [];

    for (const tObj of tMap.values()) {
      tObj.items.sort((a, b) => b.saldoPedido - a.saldoPedido || b.totalPedido - a.totalPedido);

      tercerosList.push(tObj);

      vAnt += tObj.anterior;
      vPed += tObj.pedidoMes;
      vTot += tObj.totalPedido;
      vDesp += tObj.despachado;
      vCanc += tObj.cancelado;
      vSaldo += tObj.saldoPedido;
      vInv += tObj.saldoInv;

      kpiClientesTotal++;
      if (tObj.esPendiente) {
        kpiClientesConPendientes++;
      }
    }

    tercerosList.sort((a, b) => b.saldoPedido - a.saldoPedido || b.totalPedido - a.totalPedido);

    resultadoVendedores.push({
      vendedor: vKey,
      anterior: vAnt,
      pedidoMes: vPed,
      totalPedido: vTot,
      despachado: vDesp,
      cancelado: vCanc,
      saldoPedido: vSaldo,
      saldoInv: vInv,
      esPendiente: vSaldo > 0,
      terceros: tercerosList,
    });

    kpiAnterior += vAnt;
    kpiPedidoMes += vPed;
    kpiTotalPedido += vTot;
    kpiDespachado += vDesp;
    kpiCancelado += vCanc;
    kpiSaldoPedido += vSaldo;
    kpiSaldoInv += vInv;
  }

  resultadoVendedores.sort((a, b) => b.saldoPedido - a.saldoPedido || a.vendedor.localeCompare(b.vendedor));

  const nivelServicio = kpiTotalPedido > 0 ? (kpiDespachado / kpiTotalPedido) * 100 : 100;

  return {
    vendedores: resultadoVendedores,
    kpis: {
      totalAnterior: kpiAnterior,
      totalPedidoMes: kpiPedidoMes,
      totalPedidos: kpiTotalPedido,
      totalDespachado: kpiDespachado,
      totalCancelado: kpiCancelado,
      totalSaldoPedido: kpiSaldoPedido,
      totalSaldoInv: kpiSaldoInv,
      nivelServicioPct: nivelServicio,
      clientesCount: kpiClientesTotal,
      clientesConPendientesCount: kpiClientesConPendientes,
      vendedoresCount: resultadoVendedores.length,
    },
    catalogos: {
      vendedores: Array.from(vendedoresSet).sort(),
      ciudades: Array.from(ciudadesSet).sort(),
      clientes: Array.from(clientesMap.entries())
        .map(([tercero, nombre]) => ({ tercero, nombre }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre)),
    },
  };
}
