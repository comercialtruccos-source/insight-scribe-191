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
  "transaccion","anio","mes","dia","fecha","vendedor","vendedor2","tercero_aux","tercero",
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
  "Tercero",
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

export const NUMERICOS = ["cantidad", "valor", "tr", "costo", "costo_total"] as const;

export function toNumber(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "number") return isNaN(val) ? null : val;
  const str = String(val).trim();
  if (!str) return null;

  let limpio = str.replace(/[$ ]/g, "");
  let negativo = false;
  if (limpio.startsWith("(") && limpio.endsWith(")")) {
    negativo = true;
    limpio = limpio.slice(1, -1).trim();
  } else if (limpio.startsWith("-")) {
    negativo = true;
    limpio = limpio.slice(1).trim();
  }

  const ultimoPunto = limpio.lastIndexOf(".");
  const ultimaComa = limpio.lastIndexOf(",");

  if (ultimaComa !== -1 && ultimoPunto !== -1) {
    if (ultimaComa > ultimoPunto) {
      // Formato latino: 1.250.000,50 -> la coma es decimal
      limpio = limpio.replace(/\./g, "").replace(",", ".");
    } else {
      // Formato anglosajón: 1,250,000.50 -> el punto es decimal
      limpio = limpio.replace(/,/g, "");
    }
  } else if (ultimaComa !== -1) {
    // Solo hay coma: decimal (ej. 150,5 o 1250,00) o miles (ej. 1,500,000)
    const partes = limpio.split(",");
    if (partes.length === 2 && partes[1] && partes[1].length <= 3) {
      limpio = partes[0] + "." + partes[1];
    } else {
      limpio = limpio.replace(/,/g, "");
    }
  } else if (ultimoPunto !== -1) {
    // Solo hay punto: decimal (ej. 150.5 o 1250.00) o miles (ej. 1.500.000)
    const partes = limpio.split(".");
    if (partes.length === 2 && partes[1] && partes[1].length <= 2) {
      // 1 o 2 decimales -> mantener punto decimal
    } else if (partes.length === 2 && partes[0] && partes[0].length <= 3 && partes[1] && partes[1].length === 3) {
      // ej. "1.500" -> miles en formato latino
      limpio = limpio.replace(/\./g, "");
    } else if (partes.length > 2) {
      // ej. 1.500.000 -> miles en formato latino
      limpio = limpio.replace(/\./g, "");
    }
  }

  const num = parseFloat(limpio);
  if (isNaN(num)) return null;
  return negativo ? -num : num;
}

export function toText(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  const str = String(val).trim();
  return str === "" ? null : str;
}

export function parseMonth(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "number") {
    if (val >= 1 && val <= 12) return Math.round(val);
    return null;
  }
  const str = String(val).trim();
  if (!str) return null;
  const num = parseInt(str, 10);
  if (!isNaN(num) && num >= 1 && num <= 12) return num;

  const n = norm(str);
  if (MESES_MAP[n]) return MESES_MAP[n];

  for (const [k, v] of Object.entries(MESES_MAP)) {
    if (n.startsWith(k) || k.startsWith(n)) return v;
  }
  return null;
}

export function parseYear(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "number") {
    if (val >= 1990 && val <= 2040) return Math.round(val);
    return null;
  }
  const str = String(val).trim();
  if (!str) return null;
  const match = str.match(/\b(20\d{2}|19\d{2})\b/);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  const num = parseInt(str, 10);
  if (!isNaN(num) && num >= 1990 && num <= 2040) return num;
  return null;
}

export function toDate(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString().slice(0, 10);
  }
  if (typeof val === "number" && val > 30000 && val < 60000) {
    const epoch = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(epoch.getTime())) {
      return epoch.toISOString().slice(0, 10);
    }
  }

  const str = String(val).trim();
  if (!str) return null;

  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch && isoMatch[1] && isoMatch[2] && isoMatch[3]) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10);
    const d = parseInt(isoMatch[3], 10);
    if (y >= 1990 && y <= 2040 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
  }

  const latMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (latMatch && latMatch[1] && latMatch[2] && latMatch[3]) {
    const d = parseInt(latMatch[1], 10);
    const m = parseInt(latMatch[2], 10);
    const y = parseInt(latMatch[3], 10);
    if (y >= 1990 && y <= 2040 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
  }

  const textMatch = str.match(/^(\d{1,2})[-/ ]([A-Za-z]{3,10})[-/ ](\d{4})/);
  if (textMatch && textMatch[1] && textMatch[2] && textMatch[3]) {
    const d = parseInt(textMatch[1], 10);
    const m = parseMonth(textMatch[2]);
    const y = parseInt(textMatch[3], 10);
    if (m && y >= 1990 && y <= 2040 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
  }

  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    if (y >= 1990 && y <= 2040) {
      return d.toISOString().slice(0, 10);
    }
  }

  return null;
}

const MAPA: Record<string, keyof VentaRow> = {
  // Transacción / Factura / Documento
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
  NRO: "transaccion",
  NUM: "transaccion",
  ID: "transaccion",
  IDVENTA: "transaccion",
  COMPROBANTE: "transaccion",
  NROCOMPROBANTE: "transaccion",
  NUMERODOC: "transaccion",
  PREFIJONUMERO: "transaccion",
  MOVIMIENTO: "transaccion",
  NROMOVIMIENTO: "transaccion",
  NUMERODOCUMENTO: "transaccion",
  NUMERODEFACTURA: "transaccion",
  NRODEFACTURA: "transaccion",
  DOCUMENTONUMERO: "transaccion",
  ORDEN: "transaccion",
  NROORDEN: "transaccion",
  PEDIDO: "transaccion",
  NROPEDIDO: "transaccion",

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
  ANODOCUMENTO: "anio",
  ANIODOCUMENTO: "anio",
  ANIOFACTURA: "anio",
  ANIOMOV: "anio",
  ANIOVENTA: "anio",
  ANIODELAVENTA: "anio",
  ANIOPERIODO: "anio",
  ANIOPPTO: "anio",
  ANIOVIGENCIA: "anio",
  ANOVIGENCIA: "anio",
  PERIODOANO: "anio",
  PERIODOANIO: "anio",

  MES: "mes",
  MONTH: "mes",
  MESDOC: "mes",
  MESMOV: "mes",
  MESVENTA: "mes",
  MESDELAVENTA: "mes",
  MESDOCUMENTO: "mes",
  MESFACTURA: "mes",
  MESNOMBRE: "mes",
  NOMBREMES: "mes",
  MESTEXTO: "mes",
  MESNUMERO: "mes",
  NUMEROMES: "mes",
  MESDELANO: "mes",
  MESDELANIO: "mes",

  DIA: "dia",
  DAY: "dia",
  DIADOC: "dia",
  DIAMOV: "dia",
  DIAVENTA: "dia",
  DIADOCUMENTO: "dia",
  DIAFACTURA: "dia",
  DIADELMES: "dia",

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
  FECHADEVENTA: "fecha_compra",
  FECHADEFACTURA: "fecha_compra",
  FECHADEDOCUMENTO: "fecha_compra",
  FECHADEREGISTRO: "fecha_compra",
  FECHADELMOVIMIENTO: "fecha_compra",
  FECHAMOVTO: "fecha_compra",
  FECMOVTO: "fecha_compra",
  PERIODO: "anio_col",
  PERIOD: "anio_col",

  // Vendedor
  VENDEDOR: "vendedor",
  ASESOR: "vendedor",
  EJECUTIVO: "vendedor",
  VENDEDOR1: "vendedor",
  NOMVENDEDOR: "vendedor",
  NOMBREVENDEDOR: "vendedor",
  ASESORCOMERCIAL: "vendedor",
  VENDEDORCOMERCIAL: "vendedor",
  AGENTE: "vendedor",
  COMERCIAL: "vendedor",
  CODVENDEDOR: "vendedor",
  CODASESOR: "vendedor",
  NOMBREASESOR: "vendedor",
  NOMASESOR: "vendedor",
  ASESORDEVENTA: "vendedor",
  VENDEDORDEVENTA: "vendedor",
  EJECUTIVODEVENTAS: "vendedor",
  ASESOR1: "vendedor",

  VENDEDOR2: "vendedor2",
  ASESOR2: "vendedor2",
  SEGUNDOASESOR: "vendedor2",
  SEGUNDOVENDEDOR: "vendedor2",
  NOMVENDEDOR2: "vendedor2",
  NOMBREVENDEDOR2: "vendedor2",
  NOMBREASESOR2: "vendedor2",

  // Tercero / Cliente
  TERCEROAUX: "tercero_aux",
  NIT: "tercero_aux",
  CEDULA: "tercero_aux",
  CODTERCERO: "tercero_aux",
  CODCLIENTE: "tercero_aux",
  IDENTIFICACION: "tercero_aux",
  IDENTIFICACIONCLIENTE: "tercero_aux",
  NITCLIENTE: "tercero_aux",
  DOCUMENTOCLIENTE: "tercero_aux",
  NITCEDA: "tercero_aux",
  CODIGOCLIENTE: "tercero_aux",
  CODIGOTERCERO: "tercero_aux",
  CEDULACLIENTE: "tercero_aux",
  TERCERO: "tercero",
  CLIENTE: "tercero",
  COMPRADOR: "tercero",
  NOMBRECOMPRADOR: "tercero",
  NOMBREDELCOMPRADOR: "tercero",
  NOMCOMPRADOR: "tercero",
  CLIENTECOMPRADOR: "tercero",
  NOMTERCERO: "tercero",
  NOMBRECLIENTE: "tercero",
  NOMBREDELCLIENTE: "tercero",
  RAZONSOCIAL: "tercero",
  NOMBRETERCERO: "tercero",
  NOMBREDELTERCERO: "tercero",
  CLIENTENOMBRE: "tercero",
  RAZON: "tercero",

  // Geografía
  ZONA: "zona",
  REGION: "zona",
  REGIONAL: "zona",
  ZONAVENTA: "zona",
  ZONACOMERCIAL: "zona",
  DEPARTAMENTO: "zona",
  DPTO: "zona",
  TERRITORIO: "zona",
  CIUDAD: "ciudad",
  MUNICIPIO: "ciudad",
  DESTINO: "ciudad",
  CIUDADDESTINO: "ciudad",
  CIUDADVENTA: "ciudad",
  POBLACION: "ciudad",
  ZONA2: "zona2",
  REGIONAL2: "zona2",
  SUBREGION: "zona2",
  SUBZONA: "zona2",
  PAIS: "pais",
  COUNTRY: "pais",
  PAISDESTINO: "pais",
  ZONACOLOMBIA: "zona_colombia",
  ZONANAL: "zona_colombia",
  ZONANACIONAL: "zona_colombia",
  REGIONCOLOMBIA: "zona_colombia",
  TERRITORIOCOLOMBIA: "zona_colombia",

  // Dimensiones comerciales
  LINEA: "linea",
  CATEGORIA: "linea",
  DEPARTAMENTOPROD: "linea",
  LINEAPRODUCTO: "linea",
  LINEAPRENDA: "linea",
  GRUPO: "linea",
  SUBGRUPO: "linea",
  LINEADENEGOCIO: "linea",
  LINEAVENTA: "linea",
  COLECCION: "coleccion",
  TEMPORADA: "coleccion",
  CAMPANA: "coleccion",
  COLECCIONPRENDA: "coleccion",
  NOMCOLECCION: "coleccion",
  CANAL: "canal",
  CANALVENTA: "canal",
  TIPOCANAL: "canal",
  CANALDEVENTA: "canal",
  TIPODECANAL: "canal",
  CANALDISTRIBUCION: "canal",
  MEDIOVENTA: "canal",
  CANALCOMERCIAL: "canal",
  MARCA: "marca",
  BRAND: "marca",
  MARCAPRODUCTO: "marca",
  NOMMARCA: "marca",
  CORRERIA: "correria",
  CORRERIAVENTA: "correria",
  CORRERIADESCRIPCION: "correria",
  NOMCORRERIA: "correria",
  ANOCOL: "anio_col",
  ANIOCOL: "anio_col",
  ANOCOLECCION: "anio_col",
  ANIOCOLECCION: "anio_col",
  COLECCIONANO: "anio_col",
  COLECCIONANIO: "anio_col",

  // Producto / SKU / Prenda
  PRODUCTOC: "producto_c",
  CODPRODUCTO: "producto_c",
  CODITEM: "producto_c",
  CODPRENDA: "producto_c",
  CODIGOPRODUCTO: "producto_c",
  CODIGOITEM: "producto_c",
  CODIGOPRENDA: "producto_c",
  CODARTICULO: "producto_c",
  CODIGOARTICULO: "producto_c",
  PRENDAHGI: "prenda_hgi",
  PRENDA: "prenda_hgi",
  TIPOPRENDA: "prenda_hgi",
  NOMPRENDA: "prenda_hgi",
  DESCRIPCIONPRENDA: "prenda_hgi",
  TIPODEPRENDA: "prenda_hgi",
  PRODUCTO: "producto",
  DESCRIPCION: "producto",
  NOMPRODUCTO: "producto",
  DETALLE: "producto",
  DESCRIPCIONPRODUCTO: "producto",
  NOMBREPRODUCTO: "producto",
  ARTICULO: "producto",
  DESCRIPCIONARTICULO: "producto",
  DESCRIPCIONDELPRODUCTO: "producto",
  SKU: "sku",
  REFERENCIA: "sku",
  REF: "sku",
  CODIGO: "sku",
  ITEM: "sku",
  REFPRODUCTO: "sku",
  REFERENCIAPRODUCTO: "sku",
  REFPRENDA: "sku",
  PLU: "sku",
  BARCODE: "sku",
  CODIGOBARRAS: "sku",
  REFERENCIADELPRODUCTO: "sku",
  TALLAP: "talla",
  TALLA: "talla",
  SIZE: "talla",
  TAMANO: "talla",
  TALLAPRENDA: "talla",
  TALLADEPRENDA: "talla",
  COLOR: "color",
  COLOUR: "color",
  DESCOLOR: "color",
  DESCRIPCIONCOLOR: "color",
  NOMCOLOR: "color",
  COLORPRENDA: "color",
  NOMBRECOLOR: "color",
  DESCRIPCIONDELCOLOR: "color",
  CODCOLOR: "cod_color",
  CODIGOCOLOR: "cod_color",
  CODIGODELCOLOR: "cod_color",

  // Cantidad / Unidades
  CANTIDAD: "cantidad",
  UNIDADES: "cantidad",
  CANT: "cantidad",
  QTY: "cantidad",
  QUANTITY: "cantidad",
  UNIDAD: "cantidad",
  UND: "cantidad",
  UNDS: "cantidad",
  NUMEROUNIDADES: "cantidad",
  CANTIDADVENDIDA: "cantidad",
  CANTIDADTOTAL: "cantidad",
  UNIDADESVENDIDAS: "cantidad",
  CANTTOTAL: "cantidad",
  CANTIDADPRENDAS: "cantidad",
  NUMUNIDADES: "cantidad",
  TOTALUNIDADES: "cantidad",

  // Valor / Ventas / Ingresos
  VALOR: "valor",
  VENTA: "valor",
  VALORTOTAL: "valor",
  TOTAL: "valor",
  TOTALVENTA: "valor",
  VALORVENTA: "valor",
  VENTATOTAL: "valor",
  MONTO: "valor",
  IMPORTE: "valor",
  INGRESOS: "valor",
  PRECIOTOTAL: "valor",
  SUBTOTAL: "valor",
  VRVENTA: "valor",
  VRBRUTO: "valor",
  VALORNETO: "valor",
  NETO: "valor",
  VLRVENTA: "valor",
  VLRTOTAL: "valor",
  VALORTOT: "valor",
  VLRBRUTO: "valor",
  VALORBRUTO: "valor",
  VALORTOTALVENTA: "valor",
  VALOR_TOTAL: "valor",
  TOTAL_VENTA: "valor",
  PRECIO_TOTAL: "valor",
  VALORFACTURA: "valor",
  TOTALFACTURA: "valor",
  PRECIO: "valor",
  PRECIOVENTA: "valor",

  // TR / Tasa
  TR: "tr",
  TASAREFERENCIA: "tr",
  TASA: "tr",
  TASACAMBIO: "tr",
  TRC: "tr",
  TIPOREFERENCIA: "tr",

  // Costo
  COSTO: "costo",
  COSTOUNITARIO: "costo",
  COSTO_UNITARIO: "costo",
  COSTOESTANDAR: "costo",
  VALORCOSTO: "costo",
  VLRCOSTO: "costo",
  COSTOU: "costo",
  VRCOSTO: "costo",
  UNITCOST: "costo",
  COST: "costo",
  COSTO_U: "costo",
  PRECIOCOSTO: "costo",

  // Costo Total
  COSTOTOTAL: "costo_total",
  COSTO_TOTAL: "costo_total",
  TOTALCOSTO: "costo_total",
  VLRCOSTOTOTAL: "costo_total",
  VALORCOSTOTOTAL: "costo_total",
  VRCOSTOTOTAL: "costo_total",
  TOTALCOST: "costo_total",
  COSTOS_TOTALES: "costo_total",
  COSTOTOT: "costo_total",
};

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
    } else if (campo === "tr") {
      const textVal = toText(val);
      if (textVal && (
        textVal.toUpperCase().includes("PEDIDO") || 
        textVal.toUpperCase().includes("DESPACHO") || 
        textVal.toUpperCase().includes("SALIDA") ||
        textVal.toUpperCase().includes("FACTURA") ||
        textVal.toUpperCase().includes("NOTA")
      )) {
        // Columna AD en HGI contiene el tipo de transacción comercial / logística
        if (!out["transaccion"] || typeof out["transaccion"] === "number" || !isNaN(Number(out["transaccion"]))) {
          out["transaccion"] = textVal;
        }
      } else {
        out["tr"] = toNumber(val);
      }
    } else if ((NUMERICOS as readonly string[]).includes(campo)) {
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
      const pY = parseInt(fParts[0], 10);
      const pM = parseInt(fParts[1], 10);
      const pD = parseInt(fParts[2], 10);
      if (!fila.anio && pY >= 1990 && pY <= 2040) fila.anio = pY;
      if (!fila.mes && pM >= 1 && pM <= 12) fila.mes = pM;
      if (!fila.dia && pD >= 1 && pD <= 31) fila.dia = pD;
    }
  }

  // Si anio y mes están explícitos pero fecha falta
  if (fila.anio && fila.mes && !fila.fecha) {
    const m = Math.min(12, Math.max(1, fila.mes));
    const d = fila.dia && fila.dia >= 1 && fila.dia <= 31 ? fila.dia : 1;
    fila.fecha = `${fila.anio}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    if (!fila.dia) fila.dia = d;
  }

  // Extraer año desde anio_col (ej. "2026", "ANO 2026", "2026-08", "2026-8")
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

  // Si aún no tiene año pero la hoja o archivo especificó defaultAnio (ej. "2026.xlsx")
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

  // Asegurar que las cantidades de prendas siempre sean unidades cerradas (sin decimales)
  if (fila.cantidad !== null && fila.cantidad !== undefined) {
    fila.cantidad = Math.round(fila.cantidad);
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
    fila.cantidad !== null ||
    fila.vendedor !== null ||
    fila.tercero !== null ||
    fila.fecha !== null;

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

/**
 * Corrige el rango !ref de la hoja de cálculo.
 * Algunos ERPs (como HGI) o motores de exportación escriben <dimension ref="A1:XX269"/>
 * acotando erróneamente la hoja a 269 filas (encabezado + 268 registros).
 * Esta función examina todas las celdas presentes tanto en modo denso como disperso
 * y expande !ref para abarcar el 100% de los datos reales.
 */
export function expandirRangoHoja(sheet: XLSX.WorkSheet): string | undefined {
  if (!sheet) return undefined;
  let minR = Infinity, maxR = -1, minC = Infinity, maxC = -1;
  let hasCells = false;

  if (Array.isArray(sheet)) {
    // Modo denso: sheet es un arreglo de filas
    for (let r = 0; r < sheet.length; r++) {
      const row = sheet[r];
      if (!row || !Array.isArray(row)) continue;
      for (let c = 0; c < row.length; c++) {
        const cell = row[c];
        if (cell !== undefined && cell !== null && (cell.v !== undefined || cell.t !== undefined)) {
          if (r < minR) minR = r;
          if (r > maxR) maxR = r;
          if (c < minC) minC = c;
          if (c > maxC) maxC = c;
          hasCells = true;
        }
      }
    }
  } else {
    // Modo disperso estándar: propiedades como "A1", "B2", etc.
    for (const key of Object.keys(sheet)) {
      if (key.startsWith("!")) continue;
      const cell = XLSX.utils.decode_cell(key);
      if (cell.r < minR) minR = cell.r;
      if (cell.r > maxR) maxR = cell.r;
      if (cell.c < minC) minC = cell.c;
      if (cell.c > maxC) maxC = cell.c;
      hasCells = true;
    }
  }

  // Respetar también el !ref original si tenía dimensiones válidas y mayores
  if (sheet["!ref"]) {
    try {
      const existingRange = XLSX.utils.decode_range(sheet["!ref"]);
      if (existingRange.s.r < minR) minR = existingRange.s.r;
      if (existingRange.e.r > maxR) maxR = existingRange.e.r;
      if (existingRange.s.c < minC) minC = existingRange.s.c;
      if (existingRange.e.c > maxC) maxC = existingRange.e.c;
      hasCells = true;
    } catch {
      // Ignorar si el rango existente está malformado
    }
  }

  if (hasCells && maxR >= 0 && maxC >= 0) {
    if (minR === Infinity) minR = 0;
    if (minC === Infinity) minC = 0;
    const newRef = XLSX.utils.encode_range({ s: { r: minR, c: minC }, e: { r: maxR, c: maxC } });
    sheet["!ref"] = newRef;
    return newRef;
  }
  return sheet["!ref"];
}

/**
 * Escanea las primeras 30 filas de una matriz de datos crudos para identificar
 * cuál fila corresponde a los encabezados de columnas reales (ignorando títulos,
 * logotipos o membretes iniciales del ERP).
 */
export function encontrarFilaEncabezados(filas: unknown[][]): {
  filaEncabezados: number;
  coincidencias: number;
} {
  let mejorFila = 0;
  let maxCoincidencias = 0;

  const limite = Math.min(filas.length, 30);
  for (let r = 0; r < limite; r++) {
    const fila = filas[r];
    if (!Array.isArray(fila)) continue;

    let coincidencias = 0;
    for (const celda of fila) {
      if (celda === null || celda === undefined) continue;
      const texto = String(celda).trim();
      if (!texto) continue;
      const n = norm(texto);
      if (MAPA[n] || n.match(/\b(20\d{2})\b/)) {
        coincidencias++;
      }
    }

    if (coincidencias > maxCoincidencias) {
      maxCoincidencias = coincidencias;
      mejorFila = r;
    }
  }

  return { filaEncabezados: mejorFila, coincidencias: maxCoincidencias };
}

export async function inspeccionarEncabezados(file: File): Promise<MetadataArchivo> {
  const esCSV = file.name.toLowerCase().endsWith(".csv");

  if (esCSV) {
    return new Promise((resolve, reject) => {
      Papa.parse<unknown[]>(file, {
        preview: 35,
        header: false,
        skipEmptyLines: "greedy",
        complete: (results) => {
          const rawRows = (results.data || []) as unknown[][];
          const { filaEncabezados } = encontrarFilaEncabezados(rawRows);
          const headers = ((rawRows[filaEncabezados] as unknown[]) || [])
            .map((h) => String(h ?? "").trim())
            .filter(Boolean);

          const detectados = new Set<string>();
          const ignoradas: string[] = [];

          for (const h of headers) {
            const normH = norm(h);
            const campo = MAPA[normH];
            if (campo) {
              detectados.add(campo);
            } else if (normH.match(/\b(20\d{2})\b/)) {
              detectados.add("anio");
            } else {
              ignoradas.push(h);
            }
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

  // Si es Excel (.xlsx, .xls)
  try {
    const buffer = await file.slice(0, Math.min(file.size, 2 * 1024 * 1024)).arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array", dense: true, sheetRows: 35 });
    if (wb.SheetNames.length > 0) {
      for (const sheetName of wb.SheetNames) {
        const sheet = wb.Sheets[sheetName];
        if (!sheet) continue;
        expandirRangoHoja(sheet);
        const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 }) as unknown[][];
        const { filaEncabezados, coincidencias } = encontrarFilaEncabezados(rawRows);
        if (coincidencias > 0) {
          const headers = ((rawRows[filaEncabezados] as unknown[]) || [])
            .map((h) => String(h ?? "").trim())
            .filter(Boolean);

          const detectados = new Set<string>();
          const ignoradas: string[] = [];

          for (const h of headers) {
            const normH = norm(h);
            const campo = MAPA[normH];
            if (campo) {
              detectados.add(campo);
            } else if (normH.match(/\b(20\d{2})\b/)) {
              detectados.add("anio");
            } else {
              ignoradas.push(h);
            }
          }

          const faltantes = COLUMNAS_ESPERADAS.filter((c) => {
            const campo = MAPA[norm(c)];
            return campo ? !detectados.has(campo) : false;
          });

          return {
            columnasDetectadas: [...detectados],
            columnasFaltantes: faltantes,
            columnasIgnoradas: ignoradas,
            esCSV: false,
            tamanoBytes: file.size,
          };
        }
      }
    }
  } catch {
    // Fallback silencioso si el slice no es un zip válido
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

  // Extraer año del nombre del archivo si existe (ej. "Ventas_2026.csv")
  const matchFileYear = file.name.match(/\b(20\d{2})\b/);
  const fileDefaultYear = matchFileYear ? parseInt(matchFileYear[1]!, 10) : null;

  let recibidas = 0;
  let nuevas = 0;
  let globalRowCounter = 0;
  const contadorOcurrencias = new Map<string, number>();

  if (esCSV) {
    onProgreso?.({
      filasLeidas: 0,
      filasNuevas: 0,
      porcentaje: 5,
      mensaje: "Leyendo y analizando archivo CSV...",
    });

    const texto = await file.text();
    const parsed = Papa.parse<unknown[]>(texto, {
      header: false,
      skipEmptyLines: "greedy",
    });

    const rawRows = (parsed.data || []) as unknown[][];
    if (rawRows.length === 0) {
      return {
        recibidas: 0,
        nuevas: 0,
        columnasDetectadas: [],
        columnasFaltantes: COLUMNAS_ESPERADAS,
        columnasIgnoradas: [],
      };
    }

    const { filaEncabezados } = encontrarFilaEncabezados(rawRows);
    const rawHeaderList = ((rawRows[filaEncabezados] as unknown[]) || []).map((h) => String(h ?? "").trim());
    const headerMap = new Map<string, keyof VentaRow>();

    for (const h of rawHeaderList) {
      const normH = norm(h);
      const campo = MAPA[normH];
      if (campo) {
        headerMap.set(h, campo);
        detectados.add(campo);
      } else if (normH.match(/\b(20\d{2})\b/)) {
        headerMap.set(h, "anio");
        detectados.add("anio");
      } else {
        ignoradasSet.add(h);
      }
    }

    const dataRows = rawRows.slice(filaEncabezados + 1);
    const totalDataRows = dataRows.length;

    for (let i = 0; i < totalDataRows; i += tamanoLote) {
      const loteFilas: VentaRow[] = [];
      const chunk = dataRows.slice(i, i + tamanoLote);

      for (const arr of chunk) {
        if (!Array.isArray(arr) || arr.length === 0) continue;
        const r: Record<string, unknown> = {};
        for (let c = 0; c < rawHeaderList.length; c++) {
          const key = rawHeaderList[c];
          if (key === undefined) continue;
          r[key] = arr[c] ?? null;
        }
        globalRowCounter++;
        const fila = normalizarFila(r, headerMap, detectados, ignoradasSet, globalRowCounter, fileDefaultYear);
        if (fila) loteFilas.push(asignarOcurrencia(fila, contadorOcurrencias));
      }

      if (loteFilas.length > 0) {
        const res = await onLote(loteFilas);
        recibidas += res.recibidas;
        nuevas += res.nuevas;
      }

      const porcentaje = totalDataRows > 0 ? Math.min(100, Math.round(((i + chunk.length) / totalDataRows) * 100)) : 100;
      onProgreso?.({
        filasLeidas: recibidas,
        filasNuevas: nuevas,
        porcentaje,
        mensaje: `Procesando: ${recibidas.toLocaleString("es-CO")} filas (${nuevas.toLocaleString("es-CO")} nuevas)...`,
      });
    }

    const faltantesCsv = COLUMNAS_ESPERADAS.filter((c) => {
      const campo = MAPA[norm(c)];
      return campo ? !detectados.has(campo) : false;
    });

    onProgreso?.({
      filasLeidas: recibidas,
      filasNuevas: nuevas,
      porcentaje: 100,
      mensaje: `Carga completada: ${recibidas.toLocaleString("es-CO")} procesadas (${nuevas.toLocaleString("es-CO")} nuevas)`,
    });

    return {
      recibidas,
      nuevas,
      columnasDetectadas: [...detectados],
      columnasFaltantes: faltantesCsv,
      columnasIgnoradas: [...ignoradasSet],
    };
  }

  // Si es Excel (.xlsx, .xls)
  if (file.size > 50 * 1024 * 1024) {
    throw new Error(
      "El archivo Excel supera los 50 MB. Por favor guárdalo/expórtalo en formato .CSV (delimitado por comas) para procesarlo de manera óptima."
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

  // Pre-inspeccionar hojas para saber cuáles tienen datos de ventas
  const hojasProcesables: { sheetName: string; rawRows: unknown[][]; filaEncabezados: number; headers: string[] }[] = [];

  for (const sheetName of wb.SheetNames) {
    const hoja = wb.Sheets[sheetName];
    if (!hoja) continue;

    // CRÍTICO: Recalcular rango real de la hoja para no truncar a 268 registros
    expandirRangoHoja(hoja);

    const rawRows = XLSX.utils.sheet_to_json<unknown[]>(hoja, { header: 1, defval: null, raw: true }) as unknown[][];
    if (!rawRows || rawRows.length === 0) continue;

    const { filaEncabezados, coincidencias } = encontrarFilaEncabezados(rawRows);
    // Si hay más de una hoja, requerimos al menos 2 coincidencias de columnas para no procesar hojas vacías o instructivos
    if (wb.SheetNames.length > 1 && coincidencias < 2) continue;

    const headers = ((rawRows[filaEncabezados] as unknown[]) || []).map((h) => String(h ?? "").trim());
    hojasProcesables.push({ sheetName, rawRows, filaEncabezados, headers });
  }

  if (hojasProcesables.length === 0) {
    // Si ninguna cumplió el filtro estricto, tomar la primera hoja disponible
    const sheetName = wb.SheetNames[0]!;
    const hoja = wb.Sheets[sheetName]!;
    expandirRangoHoja(hoja);
    const rawRows = XLSX.utils.sheet_to_json<unknown[]>(hoja, { header: 1, defval: null, raw: true }) as unknown[][];
    const { filaEncabezados } = encontrarFilaEncabezados(rawRows);
    const headers = ((rawRows[filaEncabezados] as unknown[]) || []).map((h) => String(h ?? "").trim());
    hojasProcesables.push({ sheetName, rawRows, filaEncabezados, headers });
  }

  for (const { sheetName, rawRows, filaEncabezados, headers } of hojasProcesables) {
    const matchSheetYear = sheetName.match(/\b(20\d{2})\b/);
    const sheetDefaultYear = matchSheetYear ? parseInt(matchSheetYear[1]!, 10) : fileDefaultYear;

    const headerMap = new Map<string, keyof VentaRow>();
    for (const h of headers) {
      const normH = norm(h);
      const campo = MAPA[normH];
      if (campo) {
        headerMap.set(h, campo);
        detectados.add(campo);
      } else if (normH.match(/\b(20\d{2})\b/)) {
        headerMap.set(h, "anio");
        detectados.add("anio");
      } else {
        ignoradasSet.add(h);
      }
    }

    const dataRows = rawRows.slice(filaEncabezados + 1);
    const totalDataRows = dataRows.length;

    for (let i = 0; i < totalDataRows; i += tamanoLote) {
      const loteFilas: VentaRow[] = [];
      const chunk = dataRows.slice(i, i + tamanoLote);

      for (const arr of chunk) {
        if (!Array.isArray(arr) || arr.length === 0) continue;
        const r: Record<string, unknown> = {};
        for (let c = 0; c < headers.length; c++) {
          const key = headers[c];
          if (key === undefined) continue;
          r[key] = arr[c] ?? null;
        }
        globalRowCounter++;
        const fila = normalizarFila(r, headerMap, detectados, ignoradasSet, globalRowCounter, sheetDefaultYear);
        if (fila) loteFilas.push(asignarOcurrencia(fila, contadorOcurrencias));
      }

      if (loteFilas.length > 0) {
        const res = await onLote(loteFilas);
        recibidas += res.recibidas;
        nuevas += res.nuevas;
      }

      const porcentaje = totalDataRows > 0 ? Math.min(100, Math.round(((i + chunk.length) / totalDataRows) * 100)) : 100;
      onProgreso?.({
        filasLeidas: recibidas,
        filasNuevas: nuevas,
        porcentaje,
        mensaje: `Hoja "${sheetName}": ${recibidas.toLocaleString("es-CO")} filas procesadas (${nuevas.toLocaleString("es-CO")} nuevas)...`,
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
