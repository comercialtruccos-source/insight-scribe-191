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
  row_index?: number;
};

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

/** Mapeo exhaustivo con sinónimos habituales de sistemas ERP (HGI, SAP, Siigo, Excel) */
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

  // Fechas
  ANO: "anio",
  ANIO: "anio",
  YEAR: "anio",
  MES: "mes",
  MONTH: "mes",
  DIA: "dia",
  DAY: "dia",
  FECHA: "fecha",
  FECHACOMPRA: "fecha_compra",
  FECHAVENTA: "fecha_compra",
  FECHADOC: "fecha_compra",

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

function toText(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function excelSerialToISO(serial: number): string | null {
  const ms = Math.round((serial - 25569) * 86400 * 1000);
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function toDate(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "number") return excelSerialToISO(v);
  const s = String(v).trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) return `${m[1]}-${m[2]!.padStart(2, "0")}-${m[3]!.padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
  if (m) {
    const anio = m[3]!.length === 2 ? `20${m[3]}` : m[3];
    return `${anio}-${m[2]!.padStart(2, "0")}-${m[1]!.padStart(2, "0")}`;
  }
  const n = Number(s);
  if (Number.isFinite(n)) return excelSerialToISO(n);
  return null;
}

export function normalizarFila(
  r: Record<string, unknown>,
  headerMap: Map<string, keyof VentaRow>,
  detectados: Set<string>,
  ignoradasSet: Set<string>,
  indiceFila: number
): VentaRow | null {
  const out: Record<string, unknown> = {};

  for (const [h, val] of Object.entries(r)) {
    const campo = headerMap.get(h);
    if (!campo) {
      ignoradasSet.add(h);
      continue;
    }
    detectados.add(campo);
    if (campo === "fecha_compra") out[campo] = toDate(val);
    else if (NUMERICOS.includes(campo)) out[campo] = toNumber(val);
    else out[campo] = toText(val);
  }

  const fila = out as unknown as VentaRow;
  fila.row_index = indiceFila;

  if (fila.anio && fila.mes && fila.dia) {
    fila.fecha = `${fila.anio}-${String(fila.mes).padStart(2, "0")}-${String(
      fila.dia
    ).padStart(2, "0")}`;
  } else {
    fila.fecha = fila.fecha_compra ?? null;
  }

  for (const k of Object.values(MAPA)) {
    if (!(k in fila)) (fila as Record<string, unknown>)[k] = null;
  }

  // Descartar solo si la fila está completamente vacía
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

  let recibidas = 0;
  let nuevas = 0;
  let globalRowCounter = 0;

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
              const fila = normalizarFila(r, headerMap, detectados, ignoradasSet, globalRowCounter);
              if (fila) loteBuffer.push(fila);

              if (loteBuffer.length >= tamanoLote) {
                const subLote = loteBuffer;
                loteBuffer = [];
                const res = await onLote(subLote);
                recibidas += res.recibidas;
                nuevas += res.nuevas;

                const bytesLeidos = parser.streamer
                  ? (parser.streamer as unknown as { _cursor?: number })._cursor || 0
                  : 0;
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
    cellDates: false,
    cellFormula: false,
    cellHTML: false,
    cellText: false,
  });

  if (wb.SheetNames.length === 0) throw new Error("El archivo no contiene hojas de datos.");

  // Procesar todas las hojas que contengan filas de datos
  for (const sheetName of wb.SheetNames) {
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
        const fila = normalizarFila(r, headerMap, detectados, ignoradasSet, globalRowCounter);
        if (fila) loteFilas.push(fila);
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
