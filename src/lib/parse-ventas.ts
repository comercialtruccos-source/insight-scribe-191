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
};

/** Columnas esperadas en el archivo, en orden. */
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

/** Columnas que alimentan tablas de dimensión (catálogos). */
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

/** header normalizado -> campo interno */
const MAPA: Record<string, keyof VentaRow> = {
  TRANSACCION: "transaccion",
  ANO: "anio",
  MES: "mes",
  DIA: "dia",
  VENDEDOR: "vendedor",
  TERCEROAUX: "tercero_aux",
  TERCERO: "tercero",
  ZONA: "zona",
  CIUDAD: "ciudad",
  LINEA: "linea",
  COLECCION: "coleccion",
  PRODUCTOC: "producto_c",
  PRENDAHGI: "prenda_hgi",
  PRODUCTO: "producto",
  TALLAP: "talla",
  COLOR: "color",
  CANTIDAD: "cantidad",
  VALOR: "valor",
  CODCOLOR: "cod_color",
  SKU: "sku",
  ANOCOL: "anio_col",
  VENDEDOR2: "vendedor2",
  CANAL: "canal",
  ZONA2: "zona2",
  PAIS: "pais",
  ZONACOLOMBIA: "zona_colombia",
  FECHACOMPRA: "fecha_compra",
  CORRERIA: "correria",
  MARCA: "marca",
  TR: "tr",
  COSTO: "costo",
  COSTOTOTAL: "costo_total",
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
  // Formato 1.234.567,89 -> 1234567.89
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
  // dd/mm/yyyy
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
  ignoradasSet: Set<string>
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

  if (!fila.transaccion && !fila.sku && fila.valor === null) {
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

/** Analiza los encabezados del archivo en milisegundos sin cargar filas en memoria */
export async function inspeccionarEncabezados(file: File): Promise<MetadataArchivo> {
  const esCSV = file.name.toLowerCase().endsWith(".csv");

  if (esCSV) {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        preview: 2,
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

/** Procesa el archivo en lotes por streaming liberando memoria RAM de inmediato */
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

  if (esCSV) {
    let loteBuffer: VentaRow[] = [];
    let headerMap = new Map<string, keyof VentaRow>();
    const fileSize = file.size;

    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: "greedy",
        chunkSize: 1024 * 512, // Lectura en bloques de 512KB del disco
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
              const fila = normalizarFila(r, headerMap, detectados, ignoradasSet);
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
              mensaje: "Carga completada con éxito",
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
  // Advertir si el archivo es mayor a 15MB para prevenir OOM crash de V8
  if (file.size > 15 * 1024 * 1024) {
    throw new Error(
      "El archivo Excel supera los 15 MB y excedería la memoria del navegador. Por favor guárdalo/expórtalo en formato .CSV (delimitado por comas) para procesarlo en streaming sin límite."
    );
  }

  onProgreso?.({
    filasLeidas: 0,
    filasNuevas: 0,
    porcentaje: 5,
    mensaje: "Leyendo archivo Excel...",
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

  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error("El archivo no contiene hojas de datos.");
  const hoja = wb.Sheets[sheetName]!;

  const crudo = XLSX.utils.sheet_to_json<Record<string, unknown>>(hoja, {
    defval: null,
    raw: true,
  });

  if (crudo.length === 0) throw new Error("El archivo no contiene filas de datos.");

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
      const fila = normalizarFila(r, headerMap, detectados, ignoradasSet);
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
      mensaje: `Cargando ${Math.min(i + tamanoLote, total).toLocaleString("es-CO")} de ${total.toLocaleString("es-CO")} filas...`,
    });
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
