// Sistema de almacenamiento persistente, parseo y agregación para
// el reporte oficial de HGI: Pedidos vs Despachos (18 Columnas Oficiales)
import * as XLSX from "xlsx";
import Papa from "papaparse";

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

// Cache en memoria
let cacheRegistros: RegistroPedidosDespachosHGI[] | null = null;
let cacheMeta: MetadataCargaPedidosDespachos | null = null;
let inicializado = false;

// Configuración IndexedDB para soportar archivos de gran tamaño sin límite de 5MB
const IDB_NAME = "TruccosPedidosDespachosDB";
const IDB_VERSION = 1;
const IDB_STORE = "hgi_records";

function abrirIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB no disponible"));
    }
    const req = window.indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function guardarEnIDB(key: string, data: unknown): Promise<void> {
  try {
    const db = await abrirIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      const store = tx.objectStore(IDB_STORE);
      const req = store.put({ key, data });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[pedidos-despachos-storage] Fallback guardado en localStorage:", err);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(key, JSON.stringify(data));
    }
  }
}

async function leerDeIDB<T>(key: string): Promise<T | null> {
  try {
    const db = await abrirIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(key);
      req.onsuccess = () => {
        resolve(req.result ? (req.result.data as T) : null);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    if (typeof window !== "undefined") {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        try {
          return JSON.parse(raw) as T;
        } catch {
          return null;
        }
      }
    }
    return null;
  }
}

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
    const fila = (matrizFilas[i] || []).map((c) => String(c || "").trim());
    const match = detectarIndices(fila);
    // Verificamos si encuentra al menos 4 columnas clave (ej. tercero/nombre, producto, despachado/saldo)
    let encontradas = 0;
    if (match.tercero !== -1 || match.nombre !== -1) encontradas++;
    if (match.producto !== -1 || match.descripcion !== -1) encontradas++;
    if (match.vendedor !== -1) encontradas++;
    if (match.despachado !== -1 || match.saldoPedido !== -1 || match.pedidoMes !== -1) encontradas++;

    if (encontradas >= 3) {
      filaHeaderIdx = i;
      indices = match;
      break;
    }
  }

  if (filaHeaderIdx === -1 || !indices) {
    throw new Error(
      "No se identificaron los encabezados requeridos (Transaccion, Tercero, Nombre, Vendedor, Ciudad, Fechas, Vence, Documento, Producto, Descripcion, Talla, Color, Anterior, Pedido Mes, Despachado, Cancelado, Saldo Pedido, Saldo Inv)."
    );
  }

  const headers = (matrizFilas[filaHeaderIdx] || []).map((c) => String(c || "").trim());
  const registros: RegistroPedidosDespachosHGI[] = [];

  let sumAnterior = 0;
  let sumPedidoMes = 0;
  let sumTotalPedido = 0;
  let sumDespachado = 0;
  let sumCancelado = 0;
  let sumSaldoPedido = 0;
  let sumSaldoInv = 0;

  const vendedoresSet = new Set<string>();
  const clientesSet = new Set<string>();
  const ciudadesSet = new Set<string>();

  for (let i = filaHeaderIdx + 1; i < matrizFilas.length; i++) {
    const fila = matrizFilas[i] || [];
    if (!fila || fila.length === 0) continue;

    const valStr = (idx: number) => (idx !== -1 && fila[idx] !== undefined ? String(fila[idx]).trim() : "");
    const valNum = (idx: number) => (idx !== -1 && fila[idx] !== undefined ? limpiarNumero(fila[idx]) : 0);

    const transaccion = valStr(indices.transaccion) || "PEDIDO";
    const tercero = valStr(indices.tercero);
    const nombre = valStr(indices.nombre);
    const vendedor = valStr(indices.vendedor) || "GENERAL";
    const ciudad = valStr(indices.ciudad) || "MEDELLIN";
    const fechas = valStr(indices.fechas);
    const vence = valStr(indices.vence);
    const documento = valStr(indices.documento);
    const producto = valStr(indices.producto);
    const descripcion = valStr(indices.descripcion);
    const talla = valStr(indices.talla);
    const color = valStr(indices.color);

    // Omitir filas que sean totales o estén completamente vacías
    if (!tercero && !nombre && !producto && !documento) continue;
    if (nombre.toUpperCase().includes("TOTAL GENERAL") || tercero.toUpperCase().includes("TOTAL")) continue;

    const anterior = valNum(indices.anterior);
    const pedidoMes = valNum(indices.pedidoMes);
    const despachado = valNum(indices.despachado);
    const cancelado = valNum(indices.cancelado);

    let saldoPedido = valNum(indices.saldoPedido);
    // Si saldoPedido viene en 0 o no estaba mapeado, calcular por fórmula
    if (indices.saldoPedido === -1 && (anterior !== 0 || pedidoMes !== 0)) {
      saldoPedido = Math.max(0, anterior + pedidoMes - despachado - cancelado);
    }

    const saldoInv = valNum(indices.saldoInv);
    const totalPedido = anterior + pedidoMes;
    const esPendiente = saldoPedido > 0;

    sumAnterior += anterior;
    sumPedidoMes += pedidoMes;
    sumTotalPedido += totalPedido;
    sumDespachado += despachado;
    sumCancelado += cancelado;
    sumSaldoPedido += saldoPedido;
    sumSaldoInv += saldoInv;

    if (vendedor) vendedoresSet.add(vendedor.toUpperCase());
    if (tercero || nombre) clientesSet.add(`${tercero}|${nombre}`.toUpperCase());
    if (ciudad) ciudadesSet.add(ciudad.toUpperCase());

    registros.push({
      id: `${i}-${documento}-${producto}-${talla}-${color}`,
      transaccion,
      tercero: tercero || "S/N",
      nombre: nombre || "CLIENTE GENERAL",
      vendedor: vendedor || "SIN ASIGNAR",
      ciudad: ciudad || "COLOMBIA",
      fechas,
      vence,
      documento: documento || `PED-${i}`,
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
 * Guarda los registros de pedidos vs despachos en almacenamiento persistente
 */
export async function guardarDatosPedidosDespachos(
  registros: RegistroPedidosDespachosHGI[],
  metadata: MetadataCargaPedidosDespachos
): Promise<void> {
  cacheRegistros = registros;
  cacheMeta = metadata;
  inicializado = true;

  await guardarEnIDB(STORAGE_KEY_DATA, registros);

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY_META, JSON.stringify(metadata));
    } catch (e) {
      console.warn("[pedidos-despachos-storage] Error guardando meta:", e);
    }

    try {
      window.dispatchEvent(
        new CustomEvent(EVENT_PEDIDOS_DESPACHOS_UPDATED, {
          detail: { metadata, timestamp: Date.now() },
        })
      );
    } catch {
      // Ignorar si no soporta CustomEvent
    }
  }
}

/**
 * Obtiene los registros guardados
 */
export async function obtenerDatosPedidosDespachos(): Promise<RegistroPedidosDespachosHGI[] | null> {
  if (cacheRegistros) return cacheRegistros;
  const data = await leerDeIDB<RegistroPedidosDespachosHGI[]>(STORAGE_KEY_DATA);
  if (data) cacheRegistros = data;
  return cacheRegistros;
}

/**
 * Obtiene la metadata de la última carga
 */
export function obtenerMetadataPedidosDespachos(): MetadataCargaPedidosDespachos | null {
  if (cacheMeta) return cacheMeta;
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_META);
    if (raw) {
      cacheMeta = JSON.parse(raw);
    }
  } catch {
    return null;
  }
  return cacheMeta;
}

/**
 * Verifica si hay datos cargados
 */
export function hayDatosPedidosDespachos(): boolean {
  return obtenerMetadataPedidosDespachos() !== null;
}

/**
 * Limpia los datos cargados
 */
export async function limpiarDatosPedidosDespachos(): Promise<void> {
  cacheRegistros = null;
  cacheMeta = null;
  inicializado = true;

  try {
    const db = await abrirIndexedDB();
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).delete(STORAGE_KEY_DATA);
  } catch {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY_DATA);
    }
  }

  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY_META);
    try {
      window.dispatchEvent(
        new CustomEvent(EVENT_PEDIDOS_DESPACHOS_UPDATED, {
          detail: { metadata: null, timestamp: Date.now() },
        })
      );
    } catch {}
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
  // vendedorKey -> Map<terceroKey, GrupoTerceroHGI>
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
      // Ordenar items de cada cliente por mayor saldo pendiente o mayor pedido
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

    // Ordenar clientes por saldo pendiente descendente
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

  // Ordenar vendedores por mayor saldo pendiente o alfabéticamente
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
