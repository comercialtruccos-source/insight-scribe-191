import * as XLSX from "xlsx";
import Papa from "papaparse";

export type VentaRow = {
  transaccion: string | null;
  anio: number | null;
  mes: number | null;
  dia: number | null;
  fecha: string | null;
  vendedor: string | null;
  vendedor2: string | null;
  tercero_aux: string | null;
  tercero: string | null;
  zona: string | null;
  ciudad: string | null;
  linea: string | null;
  coleccion: string | null;
  canal: string | null;
  zona2: string | null;
  pais: string | null;
  zona_colombia: string | null;
  correria: string | null;
  marca: string | null;
  producto_c: string | null;
  prenda_hgi: string | null;
  producto: string | null;
  talla: string | null;
  color: string | null;
  cod_color: string | null;
  sku: string | null;
  anio_col: string | null;
  cantidad: number | null;
  valor: number | null;
  fecha_compra: string | null;
  tr: number | null;
  costo: number | null;
  costo_total: number | null;
  ocurrencia?: number;
  row_index?: number;
};

const CAMPOS_HASH = [
  "transaccion","anio","mes","dia","fecha","vendedor","vendedor2","tercero_aux",
  "zona","ciudad","linea","coleccion","canal","zona2","pais","zona_colombia",
  "correria","marca","producto_c","prenda_hgi","producto","talla","color",
  "cod_color","sku","anio_col","cantidad","valor","fecha_compra","tr","costo","costo_total",
] as const;

/**
 * Asigna un número de ocurrencia a filas idénticas dentro del mismo archivo,
 * para que las repeticiones legítimas no se descarten como duplicados.
 */
export function asignarOcurrencia(fila: VentaRow, contador: Map<string, number>): VentaRow {
  const clave = CAMPOS_HASH.map((c) => {
    const v = (fila as Record<string, unknown>)[c];
    return v === null || v === undefined ? "" : String(v);
  }).join("|");
  const n = (contador.get(clave) ?? 0) + 1;
  contador.set(clave, n);
  fila.ocurrencia = n;
  return fila;
}

export const COLUMNAS_ESPERADAS = [
  "Transaccion",
  "Año",
  "Mes",
  "DIA",
  "Vendedor",
  "TerceroAux",
  "Tercero",
  "Zona",
  "Ciudad",
  "Linea",
  "Colección",
  "ProductoC",
  "PrendaHGI",
  "Producto",
  "TallaP",
  "Color",
  "Cantidad",
  "Valor",
  "Cod Color",
  "SKU",
  "AÑO COL",
  "VENDEDOR2",
  "CANAL",
  "ZONA2",
  "PAIS",
  "ZONA COLOMBIA",
  "FECHA COMPRA",
  "CORRERIA",
  "MARCA",
  "TR",
  "COSTO",
  "COSTO TOTAL",
];

export const COLUMNAS_DIMENSION = [
  "CANAL",
  "ZONA2",
  "PAIS",
  "ZONA COLOMBIA",
  "CORRERIA",
  "MARCA",
  "Vendedor",
  "VENDEDOR2",
  "Zona",
  "Ciudad",
  "Linea",
  "Colección",
  "TerceroAux",
];

export const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();

const MESES_MAP: Record<string, number> = {
  ENERO: 1,
  ENE: 1,
  JAN: 1,
  JANUARY: 1,
  "01": 1,
  "1": 1,
  FEBRERO: 2,
  FEB: 2,
  FEBRUARY: 2,
  "02": 2,
  "2": 2,
  MARZO: 3,
  MAR: 3,
  MARCH: 3,
  "03": 3,
  "3": 3,
  ABRIL: 4,
  ABR: 4,
  APR: 4,
  APRIL: 4,
  "04": 4,
  "4": 4,
  MAYO: 5,
  MAY: 5,
  "05": 5,
  "5": 5,
  JUNIO: 6,
  JUN: 6,
  JUNE: 6,
  "06": 6,
  "6": 6,
  JULIO: 7,
  JUL: 7,
  JULY: 7,
  "07": 7,
  "7": 7,
  AGOSTO: 8,
  AGO: 8,
  AUG: 8,
  AUGUST: 8,
  "08": 8,
  "8": 8,
  SEPTIEMBRE: 9,
  SETIEMBRE: 9,
  SEP: 9,
  SET: 9,
  SEPT: 9,
  SEPTEMBER: 9,
  "09": 9,
  "9": 9,
  OCTUBRE: 10,
  OCT: 10,
  OCTOBER: 10,
  "10": 10,
  NOVIEMBRE: 11,
  NOV: 11,
  NOVEMBER: 11,
  "11": 11,
  DICIEMBRE: 12,
  DIC: 12,
  DEC: 12,
  DECEMBER: 12,
  "12": 12,
};

const MAPA: Record<string, keyof VentaRow> = {
  // Transacción
  TRANSACCION: "transaccion",
  TRANSAC: "transaccion",
  FACTURA: "transaccion",
  NUMERO: "transaccion",
  DOC: "transaccion",
  DOCUMENTO: "transaccion",
  CONSECUTIVO: "transaccion",
  NROFACTURA: "transaccion",
  NRODOC: "transaccion",
  IDTRANSACCION: "transaccion",
  NROTRANSACCION: "transaccion",
  NUMTRANSACCION: "transaccion",

  // Fechas y Periodos
  ANO: "anio",
  ANIO: "anio",
  YEAR: "anio",
  ANODOC: "anio",
  ANOFACTURA: "anio",
  ANOMOV: "anio",
  ANOVENTA: "anio",
  ANODELAVENTA: "anio",
  ANOPERIODO: "anio",
  ANOPPT: "anio",
  ANOPPTO: "anio",
  EJERCICIO: "anio",
  VIGENCIA: "anio",
  MES: "mes",
  MONTH: "mes",
  MESDOC: "mes",
  MESMOV: "mes",
  MESVENTA: "mes",
  MESDELAVENTA: "mes",
  DIA: "dia",
  DAY: "dia",
  DIADOC: "dia",
  DIAMOV: "dia",
  DIAVENTA: "dia",
  FECHA: "fecha",
  FECHADOCUMENTO: "fecha",
  FECHATRANSACCION: "fecha",
  FECHACONTABLE: "fecha",
  FECHAPEDIDO: "fecha",
  FECHACREACION: "fecha",
  FECHACOMPRA: "fecha_compra",
  FECHAVENTA: "fecha_compra",
  FECHADOC: "fecha_compra",
  FECHAMOV: "fecha_compra",
  FECHAMOVIMIENTO: "fecha_compra",
  FECHAFACTURA: "fecha_compra",
  FECHAEMISION: "fecha_compra",
  FECHAREGISTRO: "fecha_compra",
  FMOV: "fecha_compra",
  FDOC: "fecha_compra",
  FFAC: "fecha_compra",
  FECMOV: "fecha_compra",
  FECDOC: "fecha_compra",
  FECFAC: "fecha_compra",
  DATE: "fecha",
  DOCDATE: "fecha_compra",
  POSTINGDATE: "fecha",
  TRANSDATE: "fecha",
  PERIODO: "anio_col",
  PERIOD: "anio_col",

  // Vendedor
  VENDEDOR: "vendedor",
  ASESOR: "vendedor",
  EJECUTIVO: "vendedor",
  VENDEDOR1: "vendedor",
  NOMVENDEDOR: "vendedor",
  VENDEDOR2: "vendedor2",
  ASESOR2: "vendedor2",

  // Tercero / Cliente
  TERCEROAUX: "tercero_aux",
  NIT: "tercero_aux",
  CEDULA: "tercero_aux",
  CODTERCERO: "tercero_aux",
  CODCLIENTE: "tercero_aux",
  IDENTIFICACION: "tercero_aux",
  TERCERO: "tercero",
  CLIENTE: "tercero",
  NOMTERCERO: "tercero",
  NOMBRECLIENTE: "tercero",
  RAZONSOCIAL: "tercero",

  // Geografía
  ZONA: "zona",
  REGION: "zona",
  REGIONAL: "zona",
  CIUDAD: "ciudad",
  MUNICIPIO: "ciudad",
  DESTINO: "ciudad",
  ZONA2: "zona2",
  PAIS: "pais",
  ZONACOLOMBIA: "zona_colombia",

  // Dimensiones comerciales
  LINEA: "linea",
  CATEGORIA: "linea",
  DEPARTAMENTO: "linea",
  COLECCION: "coleccion",
  TEMPORADA: "coleccion",
  CAMPANA: "coleccion",
  CANAL: "canal",
  CANALVENTA: "canal",
  TIPOCANAL: "canal",
  MARCA: "marca",
  BRAND: "marca",
  CORRERIA: "correria",
  ANOCOL: "anio_col",
  ANIOCOL: "anio_col",

  // Producto / SKU
  PRODUCTOC: "producto_c",
  PRENDAHGI: "prenda_hgi",
  PRENDA: "prenda_hgi",
  PRODUCTO: "producto",
  DESCRIPCION: "producto",
  NOMPRODUCTO: "producto",
  DETALLE: "producto",
  SKU: "sku",
  REFERENCIA: "sku",
  REF: "sku",
  CODIGO: "sku",
  CODPRODUCTO: "sku",
  ITEM: "sku",
  TALLAP: "talla",
  TALLA: "talla",
  SIZE: "talla",
  COLOR: "color",
  COLOUR: "color",
  DESCOLOR: "color",
  CODCOLOR: "cod_color",

  // Valores numéricos
  CANTIDAD: "cantidad",
  CANT: "cantidad",
  UNIDADES: "cantidad",
  UNDS: "cantidad",
  QTY: "cantidad",
  VALOR: "valor",
  VALORTOTAL: "valor",
  VRTOTAL: "valor",
  TOTAL: "valor",
  VENTA: "valor",
  VRVENTA: "valor",
  SUBTOTAL: "valor",
  NETO: "valor",
  VALORNETO: "valor",
  VRNETO: "valor",
  VALORBRUTO: "valor",
  VRBRUTO: "valor",
  TR: "tr",
  COSTO: "costo",
  COSTOUNITARIO: "costo",
  VRCOSTO: "costo",
  COSTOTOTAL: "costo_total",
  VRCOSTOTOTAL: "costo_total",
  TOTALCOSTO: "costo_total",
};

const NUMERICOS: (keyof VentaRow)[] = [
  "anio",
  "mes",
  "dia",
  "cantidad",
  "valor",
  "tr",
  "costo",
  "costo_total",
];

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  let s = String(v).trim().replace(/\s/g, "").replace(/[$]/g, "");
  if (!s) return null;
  const negativo = /^\(.*\)$/.test(s);
  s = s.replace(/[()]/g, "");
  if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(/,/g, "");
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return negativo ? -n : n;
}

function parseMonth(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") {
    return Number.isInteger(v) && v >= 1 && v <= 12 ? v : null;
  }
  const s = String(v).trim();
  const normalized = norm(s);
  if (normalized in MESES_MAP) {
    return MESES_MAP[normalized] ?? null;
  }
  const n = parseInt(s.replace(/\D/g, ""), 10);
  if (!isNaN(n) && n >= 1 && n <= 12) return n;
  return null;
}

function parseYear(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") {
    if (v >= 2000 && v <= 2050) return v;
    if (v >= 0 && v <= 50) return 2000 + v;
  }
  const s = String(v).trim();
  const m = s.match(/\b(20\d{2})\b/);
  if (m && m[1]) return parseInt(m[1], 10);
  const n = parseInt(s.replace(/\D/g, "").slice(0, 4), 10);
  if (!isNaN(n) && n >= 2000 && n <= 2050) return n;
  return null;
}

function toText(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function excelSerialToISO(serial: number): string | null {
  if (serial < 25000 || serial > 75000) return null;
  // Floor serial to ignore time of day shifts
  const utcDays = Math.floor(serial - 25569);
  const dateInfo = new Date(utcDays * 86400 * 1000);
  const year = dateInfo.getUTCFullYear();
  const month = String(dateInfo.getUTCMonth() + 1).padStart(2, "0");
  const day = String(dateInfo.getUTCDate()).padStart(2, "0");
  if (isNaN(year) || year < 1990 || year > 2100) return null;
  return `${year}-${month}-${day}`;
}

export function toDate(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return null;
    const year = v.getFullYear();
    const month = String(v.getMonth() + 1).padStart(2, "0");
    const day = String(v.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  if (typeof v === "number") return excelSerialToISO(v);
  const s = String(v).trim();
  if (!s) return null;

  // Formato YYYY-MM-DD o YYYY/MM/DD o YYYY.MM.DD
  let m = s.match(/^(\d{4})[-/. ](\d{1,2})[-/. ](\d{1,2})/);
  if (m && m[1] && m[2] && m[3]) {
    const y = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10);
    const d = parseInt(m[3], 10);
    if (y >= 1990 && y <= 2100 && mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
  }

  // Formato DD-MM-YYYY o DD/MM/YYYY o DD.MM.YYYY
  m = s.match(/^(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{2,4})/);
  if (m && m[1] && m[2] && m[3]) {
    const d = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10);
    let y = parseInt(m[3], 10);
    if (y < 100) y = 2000 + y;
    if (y >= 1990 && y <= 2100 && mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
  }

  // Formato DD-MMM-YYYY (ej. 15-ENE-2024, 01-FEB-2025)
  const mText = s.match(/^(\d{1,2})[-/. ]([A-Za-z]{3,10})[-/. ](\d{2,4})/);
  if (mText && mText[1] && mText[2] && mText[3]) {
    const d = parseInt(mText[1], 10);
    const mo = parseMonth(mText[2]);
    let y = parseInt(mText[3], 10);
    if (y < 100) y = 2000 + y;
    if (mo && y >= 1990 && y <= 2100 && d >= 1 && d <= 31) {
      return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
  }

  // Compacto YYYYMMDD
  if (/^\d{8}$/.test(s)) {
    const y = parseInt(s.slice(0, 4), 10);
    const mo = parseInt(s.slice(4, 6), 10);
    const d = parseInt(s.slice(6, 8), 10);
    if (y >= 1990 && y <= 2100 && mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
  }

  // Si es un número serial en texto (ej. "45230")
  const n = Number(s);
  if (Number.isFinite(n) && n > 25000 && n < 75000) return excelSerialToISO(n);
  return null;
}

export function normalizarFila(
  r: Record<string, unknown>,
  headerMap: Map<string, keyof VentaRow>,
  detectados: Set<string>,
  ignoradasSet: Set<string>,
  indiceFila: number,
  defaultAnio?: number | null
): VentaRow | null {
  const out: Record<string, unknown> = {};

  for (const [h, val] of Object.entries(r)) {
    const campo = headerMap.get(h);
    if (!campo) {
      const normH = norm(h);
      // Detección dinámica de cualquier año (ej. 2018..2030, ANO2024, VENTA2023)
      const matchYearCol = normH.match(/\b(20\d{2})\b/);
      if (matchYearCol && matchYearCol[1]) {
        const detectedY = parseInt(matchYearCol[1], 10);
        if (!out["anio"]) out["anio"] = detectedY;
        if (out["valor"] === undefined && val !== null) out["valor"] = toNumber(val);
      } else {
        ignoradasSet.add(h);
      }
      continue;
    }
    detectados.add(campo);
    if (campo === "fecha" || campo === "fecha_compra") {
      out[campo] = toDate(val);
    } else if (campo === "mes") {
      out[campo] = parseMonth(val);
    } else if (campo === "anio") {
      out[campo] = parseYear(val);
    } else if (NUMERICOS.includes(campo)) {
      out[campo] = toNumber(val);
    } else {
      out[campo] = toText(val);
    }
  }

  const fila = out as unknown as VentaRow;
  fila.row_index = indiceFila;

  // Auto-extracción de fechas y periodos
  if (fila.fecha_compra && !fila.fecha) {
    fila.fecha = fila.fecha_compra;
  }

  if (fila.fecha) {
    const fParts = fila.fecha.split("-");
    if (fParts.length === 3 && fParts[0] && fParts[1] && fParts[2]) {
      if (!fila.anio) fila.anio = parseInt(fParts[0], 10);
      if (!fila.mes) fila.mes = parseInt(fParts[1], 10);
      if (!fila.dia) fila.dia = parseInt(fParts[2], 10);
    }
  }

  // Extraer año desde anio_col (ej. "2024", "ANO 2024", "2024-01", "2024-1")
  if (!fila.anio && fila.anio_col) {
    const parsedY = parseYear(fila.anio_col);
    if (parsedY) fila.anio = parsedY;
    if (!fila.mes) {
      const matchMonth = String(fila.anio_col).match(/[-/](\d{1,2})\b/);
      if (matchMonth && matchMonth[1]) {
        const mVal = parseInt(matchMonth[1], 10);
        if (mVal >= 1 && mVal <= 12) fila.mes = mVal;
      }
    }
  }

  // Si aún no tiene año pero la hoja o archivo especificó defaultAnio (ej. "2024.xlsx")
  if (!fila.anio && defaultAnio) {
    fila.anio = defaultAnio;
  }

  if (fila.anio && !fila.anio_col) {
    fila.anio_col = String(fila.anio);
  }

  // Reconstruir fecha si falta pero anio está disponible
  if (fila.anio && !fila.fecha) {
    const m = fila.mes && fila.mes >= 1 && fila.mes <= 12 ? fila.mes : 1;
    const d = fila.dia && fila.dia >= 1 && fila.dia <= 31 ? fila.dia : 1;
    fila.fecha = `${fila.anio}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    if (!fila.mes) fila.mes = m;
    if (!fila.dia) fila.dia = d;
  }

  // Si tiene fecha pero no tiene día o mes
  if (fila.fecha && (!fila.mes || !fila.dia || !fila.anio)) {
    const fParts = fila.fecha.split("-");
    if (fParts.length === 3 && fParts[0] && fParts[1] && fParts[2]) {
      if (!fila.anio) fila.anio = parseInt(fParts[0], 10);
      if (!fila.mes) fila.mes = parseInt(fParts[1], 10);
      if (!fila.dia) fila.dia = parseInt(fParts[2], 10);
    }
  }

  // Costo total
  if (fila.costo_total === null && fila.costo !== null && fila.cantidad !== null) {
    fila.costo_total = fila.costo * fila.cantidad;
  }

  for (const k of Object.values(MAPA)) {
    if (!(k in fila)) (fila as Record<string, unknown>)[k] = null;
  }

  const tieneDatos =
    fila.transaccion !== null ||
    fila.sku !== null ||
    fila.producto !== null ||
    fila.valor !== null ||
    fila.cantidad !== null;

  if (!tieneDatos) {
    return null;
  }

  return fila;
}

export type MetadataArchivo = {
  columnasDetectadas: string[];
  columnasFaltantes: string[];
  columnasIgnoradas: string[];
  esCSV: boolean;
  tamanoBytes: number;
};

export async function inspeccionarEncabezados(file: File): Promise<MetadataArchivo> {
  const esCSV = file.name.toLowerCase().endsWith(".csv");

  if (esCSV) {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        preview: 5,
        header: true,
        skipEmptyLines: "greedy",
        complete: (results) => {
          const headers = results.meta.fields || [];
          const detectados = new Set<string>();
          const ignoradas: string[] = [];

          for (const h of headers) {
            const campo = MAPA[norm(h)];
            if (campo) detectados.add(campo);
            else ignoradas.push(h);
          }

          const faltantes = COLUMNAS_ESPERADAS.filter((c) => {
            const campo = MAPA[norm(c)];
            return campo ? !detectados.has(campo) : false;
          });

          resolve({
            columnasDetectadas: [...detectados],
            columnasFaltantes: faltantes,
            columnasIgnoradas: ignoradas,
            esCSV: true,
            tamanoBytes: file.size,
          });
        },
        error: (err) => reject(err),
      });
    });
  }

  return {
    columnasDetectadas: [],
    columnasFaltantes: [],
    columnasIgnoradas: [],
    esCSV: false,
    tamanoBytes: file.size,
  };
}

export type OpcionesProcesamiento = {
  file: File;
  tamanoLote?: number;
  onProgreso?: (progreso: {
    filasLeidas: number;
    filasNuevas: number;
    porcentaje: number;
    mensaje: string;
  }) => void;
  onLote: (lote: VentaRow[]) => Promise<{ recibidas: number; nuevas: number }>;
};

export type ResumenIngesta = {
  recibidas: number;
  nuevas: number;
  columnasDetectadas: string[];
  columnasFaltantes: string[];
  columnasIgnoradas: string[];
};

export async function procesarArchivoPorStreaming({
  file,
  tamanoLote = 1000,
  onProgreso,
  onLote,
}: OpcionesProcesamiento): Promise<ResumenIngesta> {
  const esCSV = file.name.toLowerCase().endsWith(".csv");
  const detectados = new Set<string>();
  const ignoradasSet = new Set<string>();

  // Extraer año del nombre del archivo si existe (ej. "Ventas_2025.csv")
  const matchFileYear = file.name.match(/\b(20\d{2})\b/);
  const fileDefaultYear = matchFileYear ? parseInt(matchFileYear[1]!, 10) : null;

  let recibidas = 0;
  let nuevas = 0;
  let globalRowCounter = 0;
  const contadorOcurrencias = new Map<string, number>();

  if (esCSV) {
    let loteBuffer: VentaRow[] = [];
    let headerMap = new Map<string, keyof VentaRow>();
    const fileSize = file.size;

    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: "greedy",
        chunkSize: 1024 * 512,
        chunk: async (results, parser) => {
          parser.pause();
          try {
            if (headerMap.size === 0 && results.meta.fields) {
              for (const f of results.meta.fields) {
                const campo = MAPA[norm(f)];
                if (campo) headerMap.set(f, campo);
              }
            }

            for (const r of results.data as Record<string, unknown>[]) {
              globalRowCounter++;
              const fila = normalizarFila(r, headerMap, detectados, ignoradasSet, globalRowCounter, fileDefaultYear);
              if (fila) loteBuffer.push(asignarOcurrencia(fila, contadorOcurrencias));

              if (loteBuffer.length >= tamanoLote) {
                const subLote = loteBuffer;
                loteBuffer = [];
                const res = await onLote(subLote);
                recibidas += res.recibidas;
                nuevas += res.nuevas;

                const parserAny = parser as unknown as { streamer?: { _cursor?: number } };
                const bytesLeidos = parserAny.streamer?._cursor || 0;
                const porcentaje = fileSize > 0 ? Math.min(99, Math.round((bytesLeidos / fileSize) * 100)) : 50;

                onProgreso?.({
                  filasLeidas: recibidas,
                  filasNuevas: nuevas,
                  porcentaje,
                  mensaje: `Procesando: ${recibidas.toLocaleString("es-CO")} filas (${nuevas.toLocaleString("es-CO")} nuevas)...`,
                });
              }
            }
            parser.resume();
          } catch (err) {
            parser.abort();
            reject(err);
          }
        },
        complete: async () => {
          try {
            if (loteBuffer.length > 0) {
              const res = await onLote(loteBuffer);
              recibidas += res.recibidas;
              nuevas += res.nuevas;
              loteBuffer = [];
            }

            const faltantes = COLUMNAS_ESPERADAS.filter((c) => {
              const campo = MAPA[norm(c)];
              return campo ? !detectados.has(campo) : false;
            });

            onProgreso?.({
              filasLeidas: recibidas,
              filasNuevas: nuevas,
              porcentaje: 100,
              mensaje: `Carga completada: ${recibidas.toLocaleString("es-CO")} procesadas (${nuevas.toLocaleString("es-CO")} nuevas)`,
            });

            resolve({
              recibidas,
              nuevas,
              columnasDetectadas: [...detectados],
              columnasFaltantes: faltantes,
              columnasIgnoradas: [...ignoradasSet],
            });
          } catch (err) {
            reject(err);
          }
        },
        error: (err) => reject(err),
      });
    });
  }

  // Si es Excel (.xlsx, .xls)
  if (file.size > 25 * 1024 * 1024) {
    throw new Error(
      "El archivo Excel supera los 25 MB. Por favor guárdalo/expórtalo en formato .CSV (delimitado por comas) para procesar todas las 680.000 filas en streaming sin límite de memoria."
    );
  }

  onProgreso?.({
    filasLeidas: 0,
    filasNuevas: 0,
    porcentaje: 5,
    mensaje: "Leyendo libro Excel y sus hojas de datos...",
  });

  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, {
    type: "array",
    dense: true,
    raw: true,
    cellDates: true,
    cellFormula: false,
    cellHTML: false,
    cellText: false,
  });

  if (wb.SheetNames.length === 0) throw new Error("El archivo no contiene hojas de datos.");

  for (const sheetName of wb.SheetNames) {
    const matchSheetYear = sheetName.match(/\b(20\d{2})\b/);
    const sheetDefaultYear = matchSheetYear ? parseInt(matchSheetYear[1]!, 10) : fileDefaultYear;

    const hoja = wb.Sheets[sheetName]!;
    const crudo = XLSX.utils.sheet_to_json<Record<string, unknown>>(hoja, {
      defval: null,
      raw: true,
    });

    if (crudo.length === 0) continue;

    const headers = Object.keys(crudo[0]!);
    const headerMap = new Map<string, keyof VentaRow>();
    for (const h of headers) {
      const campo = MAPA[norm(h)];
      if (campo) headerMap.set(h, campo);
    }

    const total = crudo.length;
    for (let i = 0; i < total; i += tamanoLote) {
      const loteFilas: VentaRow[] = [];
      const chunk = crudo.slice(i, i + tamanoLote);

      for (const r of chunk) {
        globalRowCounter++;
        const fila = normalizarFila(r, headerMap, detectados, ignoradasSet, globalRowCounter, sheetDefaultYear);
        if (fila) loteFilas.push(asignarOcurrencia(fila, contadorOcurrencias));
      }

      if (loteFilas.length > 0) {
        const res = await onLote(loteFilas);
        recibidas += res.recibidas;
        nuevas += res.nuevas;
      }

      const porcentaje = Math.min(100, Math.round(((i + chunk.length) / total) * 100));
      onProgreso?.({
        filasLeidas: recibidas,
        filasNuevas: nuevas,
        porcentaje,
        mensaje: `Hoja "${sheetName}": ${recibidas.toLocaleString("es-CO")} filas procesadas...`,
      });
    }
  }

  const faltantes = COLUMNAS_ESPERADAS.filter((c) => {
    const campo = MAPA[norm(c)];
    return campo ? !detectados.has(campo) : false;
  });

  return {
    recibidas,
    nuevas,
    columnasDetectadas: [...detectados],
    columnasFaltantes: faltantes,
    columnasIgnoradas: [...ignoradasSet],
  };
}
