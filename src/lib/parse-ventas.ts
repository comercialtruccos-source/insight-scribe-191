// @ts-nocheck
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
  PEDIDOS: "transaccion",
  NROPEDIDO: "transaccion",
  NROPEDIDOS: "transaccion",
  NUMEROPEDIDO: "transaccion",
  NUMEROPEDIDOS: "transaccion",
  TIPOTRANSACCION: "transaccion",
  TIPODOCUMENTO: "transaccion",

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
      const textVal = toText(val);
      if (campo === "transaccion") {
        if (textVal) {
          const upper = textVal.toUpperCase();
          const esTipoTransaccion =
            upper.includes("PEDIDO") ||
            upper.includes("DESPACHO") ||
            upper.includes("SALIDA") ||
            upper.includes("FACTURA") ||
            upper.includes("NOTA") ||
            upper.includes("COTIZACION");
          if (esTipoTransaccion || !out["transaccion"]) {
            out["transaccion"] = textVal;
          }
        }
      } else {
        if (textVal !== null || out[campo] === undefined) {
          out[campo] = textVal;
        }
      }
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

  // Filtrar valores de vendedor que sean números (ej: días 1..31) o etiquetas de tablas dinámicas
  const esVendedorTextoValido = (v: string | null): boolean => {
    if (!v) return false;
    const s = v.trim();
    if (!s || /^\d+$/.test(s)) return false;
    const low = s.toLowerCase();
    if (
      low.includes("etiquetas de") ||
      low.includes("cuenta de") ||
      low.includes("suma de") ||
      low.includes("total general") ||
      low.includes("total oficial") ||
      low === "#n/d" ||
      low === "n/d" ||
      low.startsWith("probe_") ||
      low.includes("publicidad")
    ) {
      return false;
    }
    return true;
  };

  if (fila.vendedor && !esVendedorTextoValido(fila.vendedor)) {
    fila.vendedor = null;
  }
  if (fila.vendedor2 && !esVendedorTextoValido(fila.vendedor2)) {
    fila.vendedor2 = null;
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

export type InfoHojaExcel = {
  nombre: string;
  coincidencias: number;
  totalFilasEstimadas: number;
  esValida: boolean;
  esPivot: boolean;
  columnasDetectadas: string[];
  filaEncabezados: number;
};

export type MetadataArchivo = {
  columnasDetectadas: string[];
  columnasFaltantes: string[];
  columnasIgnoradas: string[];
  esCSV: boolean;
  tamanoBytes: number;
  totalFilasEstimadas?: number;
  esPivotOInvalido?: boolean;
  advertenciaBloqueante?: string;
  hojaSeleccionada?: string;
  hojasDisponibles?: InfoHojaExcel[];
  mensajeAviso?: string;
};

export type ResultadoFilaEncabezados = {
  filaEncabezados: number;
  coincidencias: number;
  campos: Set<string>;
  archivoTienePivot: boolean;
  esValido: boolean;
};

/**
 * Determina si un encabezado es un artefacto técnico, columna sin nombre generada por parsers
 * (ej. _1, _2, __EMPTY) o filtro/marcador de tabla dinámica de Excel.
 */
export function esEncabezadoTecnicoOIgnorable(header: string): boolean {
  if (!header) return true;
  const h = header.trim();
  if (!h) return true;
  if (/^_\d+$/.test(h)) return true;
  if (/^__EMPTY/i.test(h)) return true;
  if (/^\d+$/.test(h)) return true;

  const lower = h.toLowerCase();
  if (lower.includes("varios elementos")) return true;
  if (lower.includes("multiple items")) return true;
  if (lower.includes("(todas)") || lower.includes("(todos)") || lower.includes("(all)")) return true;
  if (
    lower.startsWith("etiquetas de") ||
    lower.startsWith("total general") ||
    lower.startsWith("total oficial")
  ) {
    return true;
  }
  if (lower.startsWith("cuenta de ") || lower.startsWith("suma de ")) return true;
  if (/^(transaccion|pedidos|vendedor|documento|factura)_\d+$/i.test(h)) return true;

  return false;
}

/**
 * Corrige el rango !ref de la hoja de cálculo.
 * Algunos ERPs (como HGI) o motores de exportación escriben <dimension ref="A1:XX269"/>
 * acotando erróneamente la hoja a 269 filas (encabezado + 268 registros).
 * Esta función examina todas las celdas presentes tanto en modo denso como disperso
 * y expande !ref para abarcar el 100% de los datos reales.
 */
export function expandirRangoHoja(sheet: XLSX.WorkSheet): string | undefined {
  if (!sheet) return undefined;
  let minR = 0, maxR = -1, minC = 0, maxC = -1;
  let hasCells = false;

  if (Array.isArray(sheet)) {
    // Modo denso: sheet es un arreglo de filas
    if (sheet.length > 0) {
      minR = 0;
      maxR = sheet.length - 1;
      hasCells = true;
      // Determinar maxC inspeccionando las primeras 50 filas y la última
      const sampleLimit = Math.min(sheet.length, 50);
      for (let r = 0; r < sampleLimit; r++) {
        const row = sheet[r];
        if (Array.isArray(row) && row.length > 0) {
          if (row.length - 1 > maxC) maxC = row.length - 1;
        }
      }
      const lastRow = sheet[sheet.length - 1];
      if (Array.isArray(lastRow) && lastRow.length > 0) {
        if (lastRow.length - 1 > maxC) maxC = lastRow.length - 1;
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

  // Si !ref existe, respetar el ancho de columnas (maxC) o coordenadas válidas
  if (sheet["!ref"]) {
    try {
      const existingRange = XLSX.utils.decode_range(sheet["!ref"]);
      if (existingRange.e.c > maxC) maxC = existingRange.e.c;
      // Si la hoja no tenía celdas computadas en el bucle pero !ref sí
      if (maxR < 0 && existingRange.e.r >= 0) {
        maxR = existingRange.e.r;
        hasCells = true;
      }
    } catch {
      // Ignorar si el rango existente está malformado
    }
  }

  if (hasCells && maxR >= 0 && maxC >= 0) {
    const newRef = XLSX.utils.encode_range({ s: { r: minR, c: minC }, e: { r: maxR, c: maxC } });
    sheet["!ref"] = newRef;
    return newRef;
  }
  return sheet["!ref"];
}

/**
 * Escanea hasta las primeras 60 filas de una matriz de datos crudos para identificar
 * cuál fila corresponde a los encabezados de columnas reales.
 * Detecta y descarta automáticamente filas con filtros de Tablas Dinámicas
 * (como "(Varios elementos)", "(Todas)", "(Todos)", "Multiple items" o columnas repetidas).
 */
export function encontrarFilaEncabezados(filas: unknown[][]): ResultadoFilaEncabezados {
  let mejorFila = 0;
  let maxPuntaje = 0;
  let camposMejorFila = new Set<string>();
  let archivoTienePivot = false;

  const limite = Math.min(filas.length, 60);
  for (let r = 0; r < limite; r++) {
    const fila = filas[r];
    if (!Array.isArray(fila)) continue;

    const camposFila = new Set<string>();
    const frecuencias = new Map<string, number>();
    let esFilaFiltroPivot = false;

    for (const celda of fila) {
      if (celda === null || celda === undefined) continue;
      const texto = String(celda).trim();
      if (!texto) continue;

      const lower = texto.toLowerCase();
      if (
        lower.includes("varios elementos") ||
        lower.includes("(todas)") ||
        lower.includes("(todos)") ||
        lower.includes("(all)") ||
        lower.includes("multiple items")
      ) {
        esFilaFiltroPivot = true;
        archivoTienePivot = true;
      }

      const n = norm(texto);
      const campo = MAPA[n];
      if (campo) {
        camposFila.add(campo);
        frecuencias.set(campo, (frecuencias.get(campo) || 0) + 1);
      } else if (n.match(/\b(20\d{2})\b/)) {
        camposFila.add("anio");
      }
    }

    // Si una misma columna aparece repetida 3 o más veces en la misma fila, es un bloque de filtros/slicers
    let repetidosExcesivos = false;
    for (const count of frecuencias.values()) {
      if (count >= 3) repetidosExcesivos = true;
    }

    if (esFilaFiltroPivot || repetidosExcesivos) {
      continue;
    }

    let puntaje = camposFila.size;
    if (camposFila.has("cantidad") && camposFila.has("valor")) puntaje += 2;
    if (camposFila.has("vendedor")) puntaje += 1;
    if (camposFila.has("tercero")) puntaje += 1;
    if (camposFila.has("transaccion")) puntaje += 1;

    if (puntaje > maxPuntaje) {
      maxPuntaje = puntaje;
      mejorFila = r;
      camposMejorFila = camposFila;
    }
  }

  return {
    filaEncabezados: mejorFila,
    coincidencias: camposMejorFila.size,
    campos: camposMejorFila,
    archivoTienePivot,
    esValido: camposMejorFila.size >= 3,
  };
}

export async function inspeccionarEncabezados(file: File): Promise<MetadataArchivo> {
  const esCSV = file.name.toLowerCase().endsWith(".csv");

  if (esCSV) {
    return new Promise((resolve, reject) => {
      Papa.parse<unknown[]>(file, {
        preview: 60,
        header: false,
        skipEmptyLines: "greedy",
        complete: (results) => {
          const rawRows = (results.data || []) as unknown[][];
          const info = encontrarFilaEncabezados(rawRows);

          const rawHeaderList = ((rawRows[info.filaEncabezados] as unknown[]) || [])
            .map((h) => String(h ?? "").trim())
            .filter(Boolean);

          const detectados = new Set<string>();
          const ignoradas: string[] = [];

          for (const h of rawHeaderList) {
            const normH = norm(h);
            const campo = MAPA[normH];
            if (campo) {
              detectados.add(campo);
            } else if (normH.match(/\b(20\d{2})\b/)) {
              detectados.add("anio");
            } else {
              if (!esEncabezadoTecnicoOIgnorable(h)) {
                ignoradas.push(h);
              }
            }
          }

          const faltantes = COLUMNAS_ESPERADAS.filter((c) => {
            const campo = MAPA[norm(c)];
            return campo ? !detectados.has(campo) : false;
          });

          // Detectar si el CSV es un resumen o tabla dinámica acotada (ej. 268 registros exportados desde Excel)
          const tieneMarcasPivot = info.archivoTienePivot || rawHeaderList.some((h) => {
            const l = h.toLowerCase();
            return (
              l.includes("varios elementos") ||
              l.includes("(todas)") ||
              l.includes("(todos)") ||
              l.includes("cuenta de") ||
              l.includes("etiquetas de") ||
              l.includes("total general") ||
              l.includes("total oficial")
            );
          });

          const esInvalido = tieneMarcasPivot || detectados.size < 3;

          let advertenciaBloqueante: string | undefined = undefined;
          let mensajeAviso: string | undefined = undefined;

          if (esInvalido) {
            advertenciaBloqueante = `⚠️ Tabla Dinámica o Resumen Detectado: Este archivo contiene marcas de tabla dinámica de Excel ("(Varios elementos)") y sólo ${detectados.size} columnas reconocidas (${[...detectados].join(", ") || "ninguna"}). No contiene la base de datos detallada de transacciones (+700.000 filas). Por favor sube directamente el archivo Excel (.xlsx / .xlsm) o exporta a CSV la pestaña con la base de datos detallada completa.`;
          } else {
            mensajeAviso = `✓ ${detectados.size} columnas reconocidas y listas para procesar.`;
          }

          resolve({
            columnasDetectadas: [...detectados],
            columnasFaltantes: faltantes,
            columnasIgnoradas: ignoradas,
            esCSV: true,
            tamanoBytes: file.size,
            esPivotOInvalido: esInvalido,
            advertenciaBloqueante,
            mensajeAviso,
          });
        },
        error: (err) => reject(err),
      });
    });
  }

  // Si es Excel (.xlsx, .xls, .xlsm)
  try {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array", dense: true, sheetRows: 60 });
    if (wb.SheetNames.length > 0) {
      const infoHojas: InfoHojaExcel[] = [];

      for (const sheetName of wb.SheetNames) {
        const sheet = wb.Sheets[sheetName];
        if (!sheet) continue;
        expandirRangoHoja(sheet);

        const sampleRows: unknown[][] = [];
        if (Array.isArray(sheet)) {
          for (let r = 0; r < Math.min(sheet.length, 60); r++) {
            const row = sheet[r];
            if (Array.isArray(row)) {
              sampleRows.push(row.map((c) => (c && typeof c === "object" && "v" in c ? c.v : null)));
            } else {
              sampleRows.push([]);
            }
          }
        }

        if (sampleRows.length === 0) continue;

        const info = encontrarFilaEncabezados(sampleRows);
        const rawHeaders = ((sampleRows[info.filaEncabezados] as unknown[]) || [])
          .map((h) => String(h ?? "").trim())
          .filter(Boolean);

        const sheetDetectados: string[] = [];
        for (const h of rawHeaders) {
          const normH = norm(h);
          const campo = MAPA[normH];
          if (campo) sheetDetectados.push(campo);
          else if (normH.match(/\b(20\d{2})\b/)) sheetDetectados.push("anio");
        }

        let totalFilasEstimadas = 0;
        if (sheet["!ref"]) {
          try {
            const range = XLSX.utils.decode_range(sheet["!ref"]);
            totalFilasEstimadas = Math.max(0, range.e.r - info.filaEncabezados);
          } catch {
            totalFilasEstimadas = 0;
          }
        }

        const esPivot = info.archivoTienePivot || rawHeaders.some((h) => {
          const l = h.toLowerCase();
          return (
            l.includes("varios elementos") ||
            l.includes("(todas)") ||
            l.includes("(todos)") ||
            l.includes("cuenta de") ||
            l.includes("etiquetas de") ||
            l.includes("total general") ||
            l.includes("total oficial")
          );
        });

        infoHojas.push({
          nombre: sheetName,
          coincidencias: sheetDetectados.length,
          totalFilasEstimadas,
          esValida: sheetDetectados.length >= 3 && !esPivot,
          esPivot,
          columnasDetectadas: sheetDetectados,
          filaEncabezados: info.filaEncabezados,
        });
      }

      if (infoHojas.length > 0) {
        // Ordenar hojas: primero las válidas (>= 3 columnas y sin marcas de pivot), luego por mayor cantidad de coincidencias
        infoHojas.sort((a, b) => {
          if (a.esValida !== b.esValida) return a.esValida ? -1 : 1;
          if (b.coincidencias !== a.coincidencias) return b.coincidencias - a.coincidencias;
          return b.totalFilasEstimadas - a.totalFilasEstimadas;
        });

        const mejor = infoHojas[0]!;

        const sheet = wb.Sheets[mejor.nombre]!;
        const sampleRows: unknown[][] = [];
        if (Array.isArray(sheet)) {
          for (let r = 0; r < Math.min(sheet.length, 60); r++) {
            const row = sheet[r];
            if (Array.isArray(row)) {
              sampleRows.push(row.map((c) => (c && typeof c === "object" && "v" in c ? c.v : null)));
            } else {
              sampleRows.push([]);
            }
          }
        }

        const rawHeaderList = ((sampleRows[mejor.filaEncabezados] as unknown[]) || [])
          .map((h) => String(h ?? "").trim())
          .filter(Boolean);

        const detectados = new Set<string>();
        const ignoradas: string[] = [];

        for (const h of rawHeaderList) {
          const normH = norm(h);
          const campo = MAPA[normH];
          if (campo) {
            detectados.add(campo);
          } else if (normH.match(/\b(20\d{2})\b/)) {
            detectados.add("anio");
          } else {
            if (!esEncabezadoTecnicoOIgnorable(h)) {
              ignoradas.push(h);
            }
          }
        }

        const faltantes = COLUMNAS_ESPERADAS.filter((c) => {
          const campo = MAPA[norm(c)];
          return campo ? !detectados.has(campo) : false;
        });

        let advertenciaBloqueante: string | undefined = undefined;
        let mensajeAviso: string | undefined = undefined;

        if (!mejor.esValida) {
          advertenciaBloqueante = `⚠️ Ninguna de las hojas de este libro Excel contiene una base de datos detallada de ventas válida (sólo se detectaron tablas dinámicas o resúmenes con ${mejor.coincidencias} columnas). Asegúrate de incluir la hoja con las transacciones completas.`;
        } else if (infoHojas.length > 1) {
          mensajeAviso = `📄 Hoja seleccionada automáticamente: "${mejor.nombre}" (${detectados.size} columnas de ventas reconocidas). Si deseas cambiar de pestaña, puedes seleccionarla en el menú.`;
        }

        return {
          columnasDetectadas: [...detectados],
          columnasFaltantes: faltantes,
          columnasIgnoradas: ignoradas,
          esCSV: false,
          tamanoBytes: file.size,
          totalFilasEstimadas: mejor.totalFilasEstimadas,
          esPivotOInvalido: !mejor.esValida,
          advertenciaBloqueante,
          hojaSeleccionada: mejor.nombre,
          hojasDisponibles: infoHojas,
          mensajeAviso,
        };
      }
    }
  } catch {
    // Fallback silencioso si no es un archivo procesable
  }

  return {
    columnasDetectadas: [],
    columnasFaltantes: [],
    columnasIgnoradas: [],
    esCSV: false,
    tamanoBytes: file.size,
    esPivotOInvalido: true,
    advertenciaBloqueante: "No se pudieron reconocer columnas válidas en el archivo seleccionado.",
  };
}

export async function inspeccionarHojaEspecifica(file: File, hojaNombre: string): Promise<MetadataArchivo> {
  const metaGeneral = await inspeccionarEncabezados(file);
  if (metaGeneral.esCSV || !metaGeneral.hojasDisponibles) return metaGeneral;

  try {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array", dense: true, sheetRows: 60, sheets: [hojaNombre] });
    const sheet = wb.Sheets[hojaNombre];
    if (!sheet) return metaGeneral;

    expandirRangoHoja(sheet);

    const sampleRows: unknown[][] = [];
    if (Array.isArray(sheet)) {
      for (let r = 0; r < Math.min(sheet.length, 60); r++) {
        const row = sheet[r];
        if (Array.isArray(row)) {
          sampleRows.push(row.map((c) => (c && typeof c === "object" && "v" in c ? c.v : null)));
        } else {
          sampleRows.push([]);
        }
      }
    }

    const info = encontrarFilaEncabezados(sampleRows);
    const rawHeaderList = ((sampleRows[info.filaEncabezados] as unknown[]) || [])
      .map((h) => String(h ?? "").trim())
      .filter(Boolean);

    const detectados = new Set<string>();
    const ignoradas: string[] = [];

    for (const h of rawHeaderList) {
      const normH = norm(h);
      const campo = MAPA[normH];
      if (campo) {
        detectados.add(campo);
      } else if (normH.match(/\b(20\d{2})\b/)) {
        detectados.add("anio");
      } else {
        if (!esEncabezadoTecnicoOIgnorable(h)) {
          ignoradas.push(h);
        }
      }
    }

    const faltantes = COLUMNAS_ESPERADAS.filter((c) => {
      const campo = MAPA[norm(c)];
      return campo ? !detectados.has(campo) : false;
    });

    const esPivot = info.archivoTienePivot || rawHeaderList.some((h) => {
      const l = h.toLowerCase();
      return (
        l.includes("varios elementos") ||
        l.includes("(todas)") ||
        l.includes("(todos)") ||
        l.includes("cuenta de") ||
        l.includes("etiquetas de") ||
        l.includes("total general") ||
        l.includes("total oficial")
      );
    });

    const esInvalido = esPivot || detectados.size < 3;
    let advertenciaBloqueante: string | undefined = undefined;
    if (esInvalido) {
      advertenciaBloqueante = `⚠️ La pestaña "${hojaNombre}" parece ser una tabla dinámica o resumen (${detectados.size} columnas reconocidas). Te recomendamos seleccionar la pestaña con la base de datos detallada de transacciones.`;
    }

    let totalFilasEstimadas = 0;
    if (sheet["!ref"]) {
      try {
        const range = XLSX.utils.decode_range(sheet["!ref"]);
        totalFilasEstimadas = Math.max(0, range.e.r - info.filaEncabezados);
      } catch {
        totalFilasEstimadas = 0;
      }
    }

    return {
      columnasDetectadas: [...detectados],
      columnasFaltantes: faltantes,
      columnasIgnoradas: ignoradas,
      esCSV: false,
      tamanoBytes: file.size,
      totalFilasEstimadas,
      esPivotOInvalido: esInvalido,
      advertenciaBloqueante,
      hojaSeleccionada: hojaNombre,
      hojasDisponibles: metaGeneral.hojasDisponibles,
      mensajeAviso: `📄 Hoja activa seleccionada: "${hojaNombre}" (${detectados.size} columnas detectadas).`,
    };
  } catch {
    return metaGeneral;
  }
}

export type OpcionesProcesamiento = {
  file: File;
  tamanoLote?: number;
  hojaSeleccionada?: string;
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
  hojaSeleccionada,
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

    return new Promise((resolve, reject) => {
      let headers: string[] = [];
      const headerMap = new Map<string, keyof VentaRow>();
      let loteBuffer: VentaRow[] = [];
      const fileSize = file.size;
      let headerRowIndex = 0;
      let headerDetected = false;
      const initialRowsBuffer: unknown[][] = [];

      Papa.parse<unknown[]>(file, {
        chunkSize: 1024 * 1024 * 2, // Chunks de 2MB para streaming de bajo consumo de memoria
        header: false,
        skipEmptyLines: "greedy",
        chunk: async (results, parser) => {
          parser.pause();
          try {
            let filas = (results.data || []) as unknown[][];

            if (!headerDetected) {
              initialRowsBuffer.push(...filas);
              if (initialRowsBuffer.length >= 60 || results.meta.cursor >= fileSize) {
                const info = encontrarFilaEncabezados(initialRowsBuffer.slice(0, 100));
                headerRowIndex = info.filaEncabezados;
                const rawHeaderList = ((initialRowsBuffer[headerRowIndex] as unknown[]) || []).map((h) =>
                  String(h ?? "").trim()
                );

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
                    if (!esEncabezadoTecnicoOIgnorable(h)) {
                      ignoradasSet.add(h);
                    }
                  }
                }
                headers = rawHeaderList;
                headerDetected = true;

                filas = initialRowsBuffer.slice(headerRowIndex + 1);
              } else {
                parser.resume();
                return;
              }
            }

            for (const arr of filas) {
              if (!Array.isArray(arr) || arr.length === 0) continue;
              const r: Record<string, unknown> = {};
              for (let c = 0; c < headers.length; c++) {
                const key = headers[c];
                if (key === undefined) continue;
                r[key] = arr[c] ?? null;
              }
              globalRowCounter++;
              const fila = normalizarFila(r, headerMap, detectados, ignoradasSet, globalRowCounter, fileDefaultYear);
              if (fila) loteBuffer.push(asignarOcurrencia(fila, contadorOcurrencias));

              if (loteBuffer.length >= tamanoLote) {
                const subLote = loteBuffer;
                loteBuffer = [];
                const res = await onLote(subLote);
                recibidas += res.recibidas;
                nuevas += res.nuevas;
                const cursor = results.meta?.cursor ?? globalRowCounter * 100;
                const porcentaje = fileSize > 0 ? Math.min(99, Math.round((cursor / fileSize) * 100)) : 50;
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
            if (!headerDetected && initialRowsBuffer.length > 0) {
              const info = encontrarFilaEncabezados(initialRowsBuffer);
              headerRowIndex = info.filaEncabezados;
              const rawHeaderList = ((initialRowsBuffer[headerRowIndex] as unknown[]) || []).map((h) =>
                String(h ?? "").trim()
              );

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
                  if (!esEncabezadoTecnicoOIgnorable(h)) {
                    ignoradasSet.add(h);
                  }
                }
              }
              headers = rawHeaderList;

              const dataFilas = initialRowsBuffer.slice(headerRowIndex + 1);
              for (const arr of dataFilas) {
                if (!Array.isArray(arr) || arr.length === 0) continue;
                const r: Record<string, unknown> = {};
                for (let c = 0; c < headers.length; c++) {
                  const key = headers[c];
                  if (key === undefined) continue;
                  r[key] = arr[c] ?? null;
                }
                globalRowCounter++;
                const fila = normalizarFila(r, headerMap, detectados, ignoradasSet, globalRowCounter, fileDefaultYear);
                if (fila) loteBuffer.push(asignarOcurrencia(fila, contadorOcurrencias));
              }
            }

            if (loteBuffer.length > 0) {
              const res = await onLote(loteBuffer);
              recibidas += res.recibidas;
              nuevas += res.nuevas;
              loteBuffer = [];
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

            resolve({
              recibidas,
              nuevas,
              columnasDetectadas: [...detectados],
              columnasFaltantes: faltantesCsv,
              columnasIgnoradas: [...ignoradasSet],
            });
          } catch (err) {
            reject(err);
          }
        },
        error: (err) => {
          reject(err);
        },
      });
    });
  }

  // Si es Excel (.xlsx, .xls, .xlsm)
  if (file.size > 200 * 1024 * 1024) {
    throw new Error(
      "El archivo Excel supera los 200 MB. Por favor guárdalo/expórtalo en formato .CSV (delimitado por comas) para procesarlo de manera óptima."
    );
  }

  onProgreso?.({
    filasLeidas: 0,
    filasNuevas: 0,
    porcentaje: 5,
    mensaje: "Leyendo libro Excel y sus hojas de datos...",
  });

  const buffer = await file.arrayBuffer();

  // Para optimizar memoria drásticamente con archivos de +700k filas,
  // si se especificó una hoja, parseamos únicamente esa hoja.
  const parsingOptions: XLSX.ParsingOptions = {
    type: "array",
    dense: true,
    raw: true,
    cellDates: true,
    cellFormula: false,
    cellHTML: false,
    cellText: false,
  };
  if (hojaSeleccionada) {
    parsingOptions.sheets = [hojaSeleccionada];
  }

  const wb = XLSX.read(buffer, parsingOptions);

  if (wb.SheetNames.length === 0) throw new Error("El archivo no contiene hojas de datos.");

  // Seleccionar la hoja objetivo
  const sheetName = hojaSeleccionada && wb.Sheets[hojaSeleccionada]
    ? hojaSeleccionada
    : wb.SheetNames[0]!;

  const hoja = wb.Sheets[sheetName];
  if (!hoja) throw new Error(`No se pudo encontrar la hoja "${sheetName}" en el archivo.`);

  // Recalcular rango real para abarcar el 100% de las filas
  expandirRangoHoja(hoja);

  const totalRows = Array.isArray(hoja) ? hoja.length : 0;
  if (totalRows === 0) throw new Error(`La hoja "${sheetName}" no contiene registros de datos.`);

  // Extraer muestra de hasta 60 filas directamente del arreglo denso para detectar encabezados (0 MB de sobrecarga)
  const sampleRows: unknown[][] = [];
  const sampleLimit = Math.min(totalRows, 60);
  for (let r = 0; r < sampleLimit; r++) {
    const row = hoja[r];
    if (Array.isArray(row)) {
      sampleRows.push(row.map((c) => (c && typeof c === "object" && "v" in c ? c.v : null)));
    } else {
      sampleRows.push([]);
    }
  }

  const info = encontrarFilaEncabezados(sampleRows);
  const filaEncabezados = info.filaEncabezados;
  const headerRow = hoja[filaEncabezados];
  const headers: string[] = [];
  if (Array.isArray(headerRow)) {
    for (let c = 0; c < headerRow.length; c++) {
      const cell = headerRow[c];
      const val = cell && typeof cell === "object" && "v" in cell ? cell.v : "";
      headers.push(String(val ?? "").trim());
    }
  }

  const matchSheetYear = sheetName.match(/\b(20\d{2})\b/);
  const sheetDefaultYear = matchSheetYear ? parseInt(matchSheetYear[1]!, 10) : fileDefaultYear;

  const headerMap = new Map<string, keyof VentaRow>();
  for (let c = 0; c < headers.length; c++) {
    const h = headers[c];
    if (!h) continue;
    const normH = norm(h);
    const campo = MAPA[normH];
    if (campo) {
      headerMap.set(h, campo);
      detectados.add(campo);
    } else if (normH.match(/\b(20\d{2})\b/)) {
      headerMap.set(h, "anio");
      detectados.add("anio");
    } else {
      if (!esEncabezadoTecnicoOIgnorable(h)) {
        ignoradasSet.add(h);
      }
    }
  }

  const dataStart = filaEncabezados + 1;
  const totalDataRows = Math.max(0, totalRows - dataStart);

  // Streaming directo sobre las filas densas de la hoja sin duplicación en memoria
  for (let i = dataStart; i < totalRows; i += tamanoLote) {
    const loteFilas: VentaRow[] = [];
    const limit = Math.min(i + tamanoLote, totalRows);

    for (let r = i; r < limit; r++) {
      const row = hoja[r];
      if (!Array.isArray(row) || row.length === 0) continue;

      const rObj: Record<string, unknown> = {};
      for (let c = 0; c < headers.length; c++) {
        const key = headers[c];
        if (!key) continue;
        const cell = row[c];
        rObj[key] = cell && typeof cell === "object" && "v" in cell ? cell.v : null;
      }

      globalRowCounter++;
      const fila = normalizarFila(rObj, headerMap, detectados, ignoradasSet, globalRowCounter, sheetDefaultYear);
      if (fila) loteFilas.push(asignarOcurrencia(fila, contadorOcurrencias));
    }

    if (loteFilas.length > 0) {
      const res = await onLote(loteFilas);
      recibidas += res.recibidas;
      nuevas += res.nuevas;
    }

    const porcentaje = totalDataRows > 0 ? Math.min(100, Math.round(((i - dataStart + (limit - i)) / totalDataRows) * 100)) : 100;
    onProgreso?.({
      filasLeidas: recibidas,
      filasNuevas: nuevas,
      porcentaje,
      mensaje: `Hoja "${sheetName}": ${recibidas.toLocaleString("es-CO")} filas procesadas (${nuevas.toLocaleString("es-CO")} nuevas)...`,
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
