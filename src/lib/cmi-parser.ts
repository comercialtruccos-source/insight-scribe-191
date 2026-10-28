// Parser inteligente para archivos del Cuadro de Mando Integral (CMI) de Trucco'\''s
// Soporta tanto archivos Excel (.xlsx, .xls) como CSV (.csv) con detección automática de estructura.
import * as XLSX from "xlsx";
import Papa from "papaparse";
import type { CMIEntity, CMIMes } from "./cuadro-mando-matrix";
import { CMI_ENTITIES } from "./cuadro-mando-matrix";
import type { CMIMetadataCarga } from "./cmi-storage";

export type CMIItemPreview = {
  nombre: string;
  pptoAcumulado: number;
  ventaAcumulada: number;
  unidadesAcumuladas: number;
  cumplimientoPct: number;
  crecimientoYoYPct: number;
  devolucionesMonto: number;
  tasaDevolucionPct: number;
  esCanal: boolean;
  esTotal: boolean;
};

export type CMIResultadoParse = {
  entidades: Record<string, CMIEntity>;
  resumen: CMIMetadataCarga;
  previewVendedores: CMIItemPreview[];
  advertencias: string[];
};

const MESES_NOMBRES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

/**
 * Limpia y convierte valores de texto a número flotante manejando
 * formatos colombianos con signo negativo separado, comas de miles y símbolos de moneda.
 */
export function limpiarNumeroCMI(val: unknown): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === "number") return isNaN(val) ? 0 : val;

  let str = String(val).trim();
  if (!str || str === "-" || str === "--") return 0;

  // Manejo de negativos entre paréntesis ej: (1,234,567) o con espacio: - 1,234,567
  let esNegativo = false;
  if (str.startsWith("-") || (str.startsWith("(") && str.endsWith(")"))) {
    esNegativo = true;
    str = str.replace(/^[-\(]/, "").replace(/\)$/, "").trim();
  }

  // Quitar signo $, %, comas y espacios
  str = str.replace(/[$%,\s]/g, "");
  const num = parseFloat(str);
  if (isNaN(num)) return 0;
  return esNegativo ? -num : num;
}

/**
 * Parsea un archivo CMI (Excel o CSV) y produce la matriz oficial lista para el sistema.
 */
export async function parsearArchivoCMI(file: File): Promise<CMIResultadoParse> {
  const nombreArchivo = file.name;
  const esCsv = nombreArchivo.toLowerCase().endsWith(".csv");
  let matrizFilas: string[][] = [];

  if (esCsv) {
    const texto = await file.text();
    const resultado = Papa.parse<string[]>(texto, {
      skipEmptyLines: false,
      header: false,
    });
    matrizFilas = resultado.data as string[][];
  } else {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    
    // Buscar la hoja "CMI", "Cuadro de Mando" o la primera hoja válida
    let nombreHoja = workbook.SheetNames[0];
    for (const h of workbook.SheetNames) {
      const hNorm = h.trim().toUpperCase();
      if (hNorm === "CMI" || hNorm.includes("CUADRO") || hNorm.includes("MANDO")) {
        nombreHoja = h;
        break;
      }
    }

    const hoja = workbook.Sheets[nombreHoja];
    matrizFilas = XLSX.utils.sheet_to_json<string[]>(hoja, {
      header: 1,
      defval: "",
      raw: false,
    });
  }

  if (!matrizFilas || matrizFilas.length < 4) {
    throw new Error("El archivo no contiene suficientes filas para ser un Cuadro de Mando Integral válido.");
  }

  // Buscar la fila de encabezados principales
  let filaEncabezadosIdx = -1;
  for (let i = 0; i < Math.min(10, matrizFilas.length); i++) {
    const filaStr = (matrizFilas[i] || []).join(" ").toUpperCase();
    if (filaStr.includes("PPTO TOTAL ACUMULADO") || filaStr.includes("VENTA ACUMULADA")) {
      filaEncabezadosIdx = i;
      break;
    }
  }

  if (filaEncabezadosIdx === -1) {
    // Si no se encontró explícito, asumir fila 0
    filaEncabezadosIdx = 0;
  }

  const advertencias: string[] = [];
  const entidades: Record<string, CMIEntity> = {};
  const previewVendedores: CMIItemPreview[] = [];

  // Filas de datos empiezan usualmente 2 o 3 filas después de los encabezados (ej. fila 3)
  const filaInicioDatos = filaEncabezadosIdx + 3 < matrizFilas.length ? filaEncabezadosIdx + 3 : filaEncabezadosIdx + 1;

  for (let rIdx = filaInicioDatos; rIdx < matrizFilas.length; rIdx++) {
    const row = matrizFilas[rIdx];
    if (!row || !row[0]) continue;

    const rawName = String(row[0]).trim();
    if (!rawName) continue;
    const normName = rawName.toUpperCase();

    // Filtrar pies de página o notas metodológicas
    if (
      normName.startsWith("% SOBRE") ||
      normName.startsWith("ERROR DE") ||
      normName.startsWith("CAMBIO") ||
      normName.startsWith("REEMBOLSO") ||
      normName.startsWith("PPTO LINEAL") ||
      normName.startsWith("DIF 2026")
    ) {
      continue;
    }

    const pptoAcum = limpiarNumeroCMI(row[1]);
    const v2025Acum = limpiarNumeroCMI(row[2]);
    const v2026Acum = limpiarNumeroCMI(row[3]);
    const undsAcum = limpiarNumeroCMI(row[5]);
    const devAcum = limpiarNumeroCMI(row[6]);
    const devPctAcum = limpiarNumeroCMI(row[7]);
    const cumpAcum = limpiarNumeroCMI(row[9]);
    const crecAcum = limpiarNumeroCMI(row[10]);

    // Meses cronológicos (meses 1 a 10 presentes en el CMI)
    const meses: CMIMes[] = [];
    for (let m = 1; m <= 10; m++) {
      const baseCol = 11 + (m - 1) * 14;
      const ppto = baseCol < row.length ? limpiarNumeroCMI(row[baseCol]) : 0;
      const v25 = baseCol + 1 < row.length ? limpiarNumeroCMI(row[baseCol + 1]) : 0;
      const u26 = baseCol + 2 < row.length ? limpiarNumeroCMI(row[baseCol + 2]) : 0;
      const v26 = baseCol + 3 < row.length ? limpiarNumeroCMI(row[baseCol + 3]) : 0;
      const cump = baseCol + 6 < row.length ? limpiarNumeroCMI(row[baseCol + 6]) : 0;
      const crec = baseCol + 7 < row.length ? limpiarNumeroCMI(row[baseCol + 7]) : 0;
      const dev = baseCol + 8 < row.length ? limpiarNumeroCMI(row[baseCol + 8]) : 0;
      const devPct = baseCol + 9 < row.length ? limpiarNumeroCMI(row[baseCol + 9]) : 0;
      const cartera = baseCol + 10 < row.length ? limpiarNumeroCMI(row[baseCol + 10]) : 0;
      const pct90 = baseCol + 11 < row.length ? limpiarNumeroCMI(row[baseCol + 11]) : 0;
      const mora90 = cartera > 0 && pct90 > 0 ? Math.round(cartera * (pct90 / 100)) : 0;

      meses.push({
        mes: m,
        nombreMes: MESES_NOMBRES[m - 1],
        ppto2026: Math.round(ppto),
        v2025: Math.round(v25),
        u2026: Math.round(u26),
        v2026: Math.round(v26),
        dev2026: Math.round(dev),
        cumplimientoPct: Number(cump.toFixed(2)),
        crecimientoYoYPct: Number(crec.toFixed(2)),
        tasaDevolucionPct: Number(devPct.toFixed(2)),
        cartera2026: Math.round(cartera),
        pctCartera90Dias: Number(pct90.toFixed(2)),
        carteraMayor90Dias: Math.round(mora90),
      });
    }

    // Meses 11 y 12 (Nov y Dic no transcurridos en 2026)
    for (let m = 11; m <= 12; m++) {
      meses.push({
        mes: m,
        nombreMes: MESES_NOMBRES[m - 1],
        ppto2026: 0,
        v2025: 0,
        u2026: 0,
        v2026: 0,
        dev2026: 0,
        cumplimientoPct: 0,
        crecimientoYoYPct: 0,
        tasaDevolucionPct: 0,
        cartera2026: 0,
        pctCartera90Dias: 0,
        carteraMayor90Dias: 0,
      });
    }

    // Cartera acumulada del último mes con reporte
    let carteraAcum = 0;
    let pct90Acum = 0;
    let mora90Acum = 0;
    for (const mObj of [...meses].reverse()) {
      if ((mObj.cartera2026 || 0) > 0) {
        carteraAcum = mObj.cartera2026 || 0;
        pct90Acum = mObj.pctCartera90Dias || 0;
        mora90Acum = mObj.carteraMayor90Dias || 0;
        break;
      }
    }

    // Meses 2025 completos (tomando meses 11 y 12 del baseline de código si existen)
    const entidadExistente = CMI_ENTITIES[normName] || CMI_ENTITIES[rawName];
    const m25Existentes = entidadExistente?.meses2025 || [];

    const meses2025: number[] = meses.slice(0, 10).map((m) => m.v2025);
    meses2025.push(m25Existentes[10] || 0);
    meses2025.push(m25Existentes[11] || 0);

    const entidad: CMIEntity = {
      nombre: normName,
      row: rIdx + 1,
      acumulado: {
        ppto: Math.round(pptoAcum),
        v2025: Math.round(v2025Acum),
        v2026: Math.round(v2026Acum),
        unds: Math.round(undsAcum),
        dev: Math.round(devAcum),
        cumplimientoPct: Number(cumpAcum.toFixed(2)),
        crecimientoYoYPct: Number(crecAcum.toFixed(2)),
        tasaDevPct: Number(devPctAcum.toFixed(2)),
        cartera: carteraAcum,
        pctCartera90Dias: pct90Acum,
        carteraMayor90Dias: mora90Acum,
      },
      meses,
      meses2025,
    };

    entidades[normName] = entidad;

    // Agregar a preview si tiene venta o presupuesto relevante
    if (Math.abs(v2026Acum) > 0 || Math.abs(pptoAcum) > 0) {
      previewVendedores.push({
        nombre: normName,
        pptoAcumulado: Math.round(pptoAcum),
        ventaAcumulada: Math.round(v2026Acum),
        unidadesAcumuladas: Math.round(undsAcum),
        cumplimientoPct: Number(cumpAcum.toFixed(2)),
        crecimientoYoYPct: Number(crecAcum.toFixed(2)),
        devolucionesMonto: Math.round(Math.abs(devAcum)),
        tasaDevolucionPct: Number(devPctAcum.toFixed(2)),
        esCanal: normName.startsWith("CANAL") || normName === "MAYORCA" || normName === "PUNTO DE VENTA",
        esTotal: normName.startsWith("TOTAL"),
      });
    }
  }

  const totalGeneral = entidades["TOTAL GENERAL"];
  if (!totalGeneral) {
    advertencias.push("No se encontró la fila 'TOTAL GENERAL' explícita. Se calculará el total a partir de los canales.");
  }

  const resumen: CMIMetadataCarga = {
    fechaCarga: new Date().toISOString(),
    nombreArchivo,
    totalVentas2026: totalGeneral?.acumulado.v2026 || 0,
    totalPpto2026: totalGeneral?.acumulado.ppto || 0,
    totalUnidades2026: totalGeneral?.acumulado.unds || 0,
    vendedoresCount: Object.keys(entidades).length,
  };

  return {
    entidades,
    resumen,
    previewVendedores,
    advertencias,
  };
}
