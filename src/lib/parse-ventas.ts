import * as XLSX from "xlsx";

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

const norm = (s: string) =>
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

export type ResultadoParseo = {
  filas: VentaRow[];
  columnasDetectadas: string[];
  columnasFaltantes: string[];
  columnasIgnoradas: string[];
};

export async function parseArchivoVentas(file: File): Promise<ResultadoParseo> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array", cellDates: true, raw: false });
  const hoja = wb.Sheets[wb.SheetNames[0]!];
  if (!hoja) throw new Error("El archivo no contiene hojas de datos.");

  const crudo = XLSX.utils.sheet_to_json<Record<string, unknown>>(hoja, {
    defval: null,
    raw: true,
  });
  if (crudo.length === 0) throw new Error("El archivo no contiene filas de datos.");

  const headers = Object.keys(crudo[0]!);
  const detectados = new Set<string>();
  const ignoradas: string[] = [];

  const filas: VentaRow[] = crudo.map((r) => {
    const out: Record<string, unknown> = {};
    for (const h of headers) {
      const campo = MAPA[norm(h)];
      if (!campo) {
        if (!ignoradas.includes(h)) ignoradas.push(h);
        continue;
      }
      detectados.add(campo);
      const valor = r[h];
      if (campo === "fecha_compra") out[campo] = toDate(valor);
      else if (NUMERICOS.includes(campo)) out[campo] = toNumber(valor);
      else out[campo] = toText(valor);
    }
    const fila = out as unknown as VentaRow;
    // Dimensión de tiempo derivada de Año / Mes / DIA
    if (fila.anio && fila.mes && fila.dia) {
      fila.fecha = `${fila.anio}-${String(fila.mes).padStart(2, "0")}-${String(
        fila.dia,
      ).padStart(2, "0")}`;
    } else {
      fila.fecha = fila.fecha_compra ?? null;
    }
    for (const k of Object.keys(MAPA).map((k) => MAPA[k]!)) {
      if (!(k in fila)) (fila as Record<string, unknown>)[k] = null;
    }
    return fila;
  });

  const faltantes = COLUMNAS_ESPERADAS.filter((c) => {
    const campo = MAPA[norm(c)];
    return campo ? !detectados.has(campo) : false;
  });

  return {
    filas: filas.filter((f) => f.transaccion || f.sku || f.valor !== null),
    columnasDetectadas: [...detectados],
    columnasFaltantes: faltantes,
    columnasIgnoradas: ignoradas,
  };
}
