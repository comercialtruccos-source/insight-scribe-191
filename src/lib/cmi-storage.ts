// Sistema de almacenamiento persistente para el Cuadro de Mando Integral (CMI)
// Permite que cuando el usuario cargue un archivo CMI actualizado (Excel o CSV),
// las métricas de todos los dashboards se sincronicen de manera inmediata y persistente.
import type { CMIEntity } from "./cuadro-mando-matrix";

export const TRUCCOS_CMI_STORAGE_KEY = "TRUCCOS_CMI_CUSTOM_MATRIX_V1";
export const TRUCCOS_CMI_META_KEY = "TRUCCOS_CMI_CUSTOM_META_V1";
export const TRUCCOS_CMI_EVENT_NAME = "truccos-cmi-updated";

export type CMIMetadataCarga = {
  fechaCarga: string;
  nombreArchivo: string;
  totalVentas2026: number;
  totalPpto2026: number;
  totalUnidades2026: number;
  vendedoresCount: number;
};

// Cache en memoria para acceso ultra rápido y soporte SSR/Workers
let cmiCacheEnMemoria: Record<string, CMIEntity> | null = null;
let cmiMetaCacheEnMemoria: CMIMetadataCarga | null = null;
let inicializado = false;

function asegurarInicializado() {
  if (inicializado || typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(TRUCCOS_CMI_STORAGE_KEY);
    if (raw) {
      cmiCacheEnMemoria = JSON.parse(raw);
    }
    const rawMeta = window.localStorage.getItem(TRUCCOS_CMI_META_KEY);
    if (rawMeta) {
      cmiMetaCacheEnMemoria = JSON.parse(rawMeta);
    }
  } catch (err) {
    console.warn("[cmi-storage] Error al leer CMI de localStorage:", err);
  } finally {
    inicializado = true;
  }
}

/**
 * Retorna la matriz CMI personalizada si existe en localStorage o memoria.
 */
export function obtenerMatrizCMIPersonalizada(): Record<string, CMIEntity> | null {
  asegurarInicializado();
  return cmiCacheEnMemoria;
}

/**
 * Retorna los metadatos de la última carga CMI realizada.
 */
export function obtenerMetaCMIPersonalizada(): CMIMetadataCarga | null {
  asegurarInicializado();
  return cmiMetaCacheEnMemoria;
}

/**
 * Verifica si hay una matriz CMI personalizada activa en el sistema.
 */
export function hayCMIPersonalizado(): boolean {
  asegurarInicializado();
  return cmiCacheEnMemoria !== null && Object.keys(cmiCacheEnMemoria).length > 0;
}

/**
 * Guarda una nueva matriz CMI en almacenamiento y notifica a todos los componentes del sistema.
 */
export function guardarMatrizCMIPersonalizada(
  entidades: Record<string, CMIEntity>,
  meta: CMIMetadataCarga
): void {
  cmiCacheEnMemoria = entidades;
  cmiMetaCacheEnMemoria = meta;
  inicializado = true;

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(TRUCCOS_CMI_STORAGE_KEY, JSON.stringify(entidades));
      window.localStorage.setItem(TRUCCOS_CMI_META_KEY, JSON.stringify(meta));
    } catch (err) {
      console.error("[cmi-storage] Error al persistir CMI en localStorage:", err);
    }

    try {
      window.dispatchEvent(
        new CustomEvent(TRUCCOS_CMI_EVENT_NAME, {
          detail: { meta, timestamp: Date.now() },
        })
      );
    } catch {
      // Ignorar si no hay soporte de CustomEvent
    }
  }
}

/**
 * Elimina la matriz personalizada y restaura el CMI oficial predefinido de código.
 */
export function limpiarMatrizCMIPersonalizada(): void {
  cmiCacheEnMemoria = null;
  cmiMetaCacheEnMemoria = null;

  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(TRUCCOS_CMI_STORAGE_KEY);
      window.localStorage.removeItem(TRUCCOS_CMI_META_KEY);
    } catch (err) {
      console.error("[cmi-storage] Error al limpiar CMI en localStorage:", err);
    }

    try {
      window.dispatchEvent(
        new CustomEvent(TRUCCOS_CMI_EVENT_NAME, {
          detail: { restablecido: true, timestamp: Date.now() },
        })
      );
    } catch {
      // Ignorar
    }
  }
}
