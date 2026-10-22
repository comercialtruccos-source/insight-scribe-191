import * as XLSX from "xlsx";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";

export type FilaReferencia = {
  ref: string;
  nombre: string;
  pvm: number;
  pvp: number;
};

export type MetaArchivoReferencias = {
  totalFilas: number;
  columnasDetectadas: {
    ref?: string;
    nombre?: string;
    pvm?: string;
    pvp?: string;
  };
  esValido: boolean;
  hojasDisponibles?: string[];
  hojaSeleccionada?: string;
  preview: FilaReferencia[];
  filasInvalidas: number;
  mensajeError?: string;
};

export type HistorialCargaReferencia = {
  id: number;
  archivo: string;
  filas_recibidas: number;
  filas_nuevas: number;
  filas_actualizadas: number;
  created_at: string;
};

/**
 * Limpia y normaliza cadenas para comparar encabezados sin importar tildes, mayúsculas o caracteres especiales.
 */
function normalizarEncabezado(txt: string): string {
  return txt
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Parsea valores numéricos de precio limpiando signos de moneda, puntos y comas.
 */
function limpiarNumero(val: unknown): number {
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  if (!val) return 0;
  let str = String(val).trim();
  // Quitar símbolos de moneda o texto
  str = str.replace(/[$€COPcop\s]/g, "");
  if (!str) return 0;

  // Si contiene tanto punto como coma, determinar formato (ej. 1.250,50 o 1,250.50)
  if (str.includes(".") && str.includes(",")) {
    if (str.lastIndexOf(",") > str.lastIndexOf(".")) {
      // 1.250,50
      str = str.replace(/\./g, "").replace(",", ".");
    } else {
      // 1,250.50
      str = str.replace(/,/g, "");
    }
  } else if (str.includes(",")) {
    // Si solo tiene coma: 50000,00 o 50,000
    const parts = str.split(",");
    if (parts.length === 2 && parts[1].length <= 2) {
      str = str.replace(",", ".");
    } else {
      str = str.replace(/,/g, "");
    }
  } else if (str.includes(".")) {
    // Si tiene puntos: en Colombia suele ser separador de miles: 50.000 -> 50000
    const parts = str.split(".");
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      str = str.replace(/\./g, "");
    }
  }

  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

/**
 * Detecta qué columna del archivo corresponde a cada uno de los 4 campos requeridos.
 */
function detectarColumnas(headers: string[]): {
  ref?: string;
  nombre?: string;
  pvm?: string;
  pvp?: string;
} {
  const result: { ref?: string; nombre?: string; pvm?: string; pvp?: string } = {};

  for (const h of headers) {
    const norm = normalizarEncabezado(h);
    // REF
    if (!result.ref && (norm === "ref" || norm === "referencia" || norm === "codigo" || norm === "sku" || norm === "cod" || norm === "codigoreferencia")) {
      result.ref = h;
      continue;
    }
    // PVM (Precio Venta Mayorista)
    if (!result.pvm && (norm === "pvm" || norm === "preciomayorista" || norm === "preciopvm" || norm === "valormayorista" || norm === "mayorista" || norm === "vpm")) {
      result.pvm = h;
      continue;
    }
    // PVP (Precio Venta Público)
    if (!result.pvp && (norm === "pvp" || norm === "preciopublico" || norm === "preciopvp" || norm === "valorpublico" || norm === "publico" || norm === "vpp" || norm === "precioalpublico")) {
      result.pvp = h;
      continue;
    }
    // Nombre (Descripción del producto)
    if (!result.nombre && (norm === "nombre" || norm === "descripcion" || norm === "producto" || norm === "prenda" || norm === "detalle" || norm === "nom" || norm === "desc")) {
      result.nombre = h;
      continue;
    }
  }

  // Fallback si no hubo coincidencia exacta pero contiene la palabra clave
  if (!result.ref) {
    const candidate = headers.find((h) => normalizarEncabezado(h).includes("ref") || normalizarEncabezado(h).includes("sku"));
    if (candidate) result.ref = candidate;
  }
  if (!result.nombre) {
    const candidate = headers.find((h) => normalizarEncabezado(h).includes("nombre") || normalizarEncabezado(h).includes("descrip"));
    if (candidate) result.nombre = candidate;
  }
  if (!result.pvm) {
    const candidate = headers.find((h) => normalizarEncabezado(h).includes("pvm") || normalizarEncabezado(h).includes("mayorist"));
    if (candidate) result.pvm = candidate;
  }
  if (!result.pvp) {
    const candidate = headers.find((h) => normalizarEncabezado(h).includes("pvp") || normalizarEncabezado(h).includes("public"));
    if (candidate) result.pvp = candidate;
  }

  return result;
}

/**
 * Lee e inspecciona un archivo Excel o CSV de referencias para previsualización y validación.
 */
export async function inspeccionarArchivoReferencias(
  file: File,
  hojaElegida?: string
): Promise<MetaArchivoReferencias> {
  const esCsv = file.name.toLowerCase().endsWith(".csv");

  if (esCsv) {
    return new Promise((resolve) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: "greedy",
        preview: 50,
        complete: (results) => {
          const headers = (results.meta.fields || []).map((s) => s.trim());
          const mapeo = detectarColumnas(headers);
          const preview: FilaReferencia[] = [];

          if (!mapeo.ref) {
            return resolve({
              totalFilas: 0,
              columnasDetectadas: mapeo,
              esValido: false,
              preview: [],
              filasInvalidas: 0,
              mensajeError: "No se encontró la columna 'REF' (o 'Referencia') en el archivo.",
            });
          }

          for (const raw of results.data as Record<string, unknown>[]) {
            const refVal = String(raw[mapeo.ref] || "").trim();
            if (!refVal) continue;
            preview.push({
              ref: refVal,
              nombre: mapeo.nombre ? String(raw[mapeo.nombre] || "").trim() || "Sin Nombre" : "Sin Nombre",
              pvm: mapeo.pvm ? limpiarNumero(raw[mapeo.pvm]) : 0,
              pvp: mapeo.pvp ? limpiarNumero(raw[mapeo.pvp]) : 0,
            });
            if (preview.length >= 5) break;
          }

          resolve({
            totalFilas: results.data.length,
            columnasDetectadas: mapeo,
            esValido: Boolean(mapeo.ref),
            preview,
            filasInvalidas: 0,
          });
        },
        error: (err) => {
          resolve({
            totalFilas: 0,
            columnasDetectadas: {},
            esValido: false,
            preview: [],
            filasInvalidas: 0,
            mensajeError: err.message,
          });
        },
      });
    });
  }

  // Archivo Excel (.xlsx, .xls, .xlsm)
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
  const hojasDisponibles = workbook.SheetNames;
  const hojaSeleccionada = hojaElegida && hojasDisponibles.includes(hojaElegida) ? hojaElegida : hojasDisponibles[0];
  const worksheet = workbook.Sheets[hojaSeleccionada];

  if (!worksheet) {
    return {
      totalFilas: 0,
      columnasDetectadas: {},
      esValido: false,
      hojasDisponibles,
      preview: [],
      filasInvalidas: 0,
      mensajeError: "La hoja seleccionada está vacía.",
    };
  }

  const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "" });
  if (jsonData.length === 0) {
    return {
      totalFilas: 0,
      columnasDetectadas: {},
      esValido: false,
      hojasDisponibles,
      hojaSeleccionada,
      preview: [],
      filasInvalidas: 0,
      mensajeError: "No se encontraron filas con datos en la hoja seleccionada.",
    };
  }

  const headers = Object.keys(jsonData[0]).map((h) => h.trim());
  const mapeo = detectarColumnas(headers);
  const preview: FilaReferencia[] = [];

  for (const raw of jsonData) {
    if (!mapeo.ref) break;
    const refVal = String(raw[mapeo.ref] || "").trim();
    if (!refVal) continue;
    preview.push({
      ref: refVal,
      nombre: mapeo.nombre ? String(raw[mapeo.nombre] || "").trim() || "Sin Nombre" : "Sin Nombre",
      pvm: mapeo.pvm ? limpiarNumero(raw[mapeo.pvm]) : 0,
      pvp: mapeo.pvp ? limpiarNumero(raw[mapeo.pvp]) : 0,
    });
    if (preview.length >= 5) break;
  }

  return {
    totalFilas: jsonData.length,
    columnasDetectadas: mapeo,
    esValido: Boolean(mapeo.ref),
    hojasDisponibles,
    hojaSeleccionada,
    preview,
    filasInvalidas: 0,
  };
}

/**
 * Parsea el archivo completo de referencias en un arreglo de objetos normalizados FilaReferencia.
 */
export async function parsearTodasLasReferencias(
  file: File,
  hojaElegida?: string
): Promise<{ filas: FilaReferencia[]; columnasDetectadas: Record<string, string | undefined> }> {
  const esCsv = file.name.toLowerCase().endsWith(".csv");

  if (esCsv) {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: "greedy",
        complete: (results) => {
          const headers = (results.meta.fields || []).map((s) => s.trim());
          const mapeo = detectarColumnas(headers);

          if (!mapeo.ref) {
            return reject(new Error("No se detectó la columna 'REF' (o Referencia) en el archivo CSV."));
          }

          const filasMap = new Map<string, FilaReferencia>();
          for (const raw of results.data as Record<string, unknown>[]) {
            const refVal = String(raw[mapeo.ref] || "").trim();
            if (!refVal) continue;

            const nom = mapeo.nombre ? String(raw[mapeo.nombre] || "").trim() || "Sin Nombre" : "Sin Nombre";
            const pvm = mapeo.pvm ? limpiarNumero(raw[mapeo.pvm]) : 0;
            const pvp = mapeo.pvp ? limpiarNumero(raw[mapeo.pvp]) : 0;

            filasMap.set(refVal, {
              ref: refVal,
              nombre: nom,
              pvm,
              pvp,
            });
          }

          resolve({
            filas: Array.from(filasMap.values()),
            columnasDetectadas: mapeo,
          });
        },
        error: (err) => reject(new Error(err.message)),
      });
    });
  }

  // Excel
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
  const hojaSeleccionada = hojaElegida && workbook.SheetNames.includes(hojaElegida) ? hojaElegida : workbook.SheetNames[0];
  const worksheet = workbook.Sheets[hojaSeleccionada];

  if (!worksheet) {
    throw new Error("La pestaña seleccionada no existe o no tiene contenido.");
  }

  const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "" });
  if (jsonData.length === 0) {
    throw new Error("No hay registros en la pestaña seleccionada.");
  }

  const headers = Object.keys(jsonData[0]).map((h) => h.trim());
  const mapeo = detectarColumnas(headers);

  if (!mapeo.ref) {
    throw new Error("No se detectó la columna 'REF' (o Referencia) en la hoja de Excel.");
  }

  const filasMap = new Map<string, FilaReferencia>();
  for (const raw of jsonData) {
    const refVal = String(raw[mapeo.ref] || "").trim();
    if (!refVal) continue;

    const nom = mapeo.nombre ? String(raw[mapeo.nombre] || "").trim() || "Sin Nombre" : "Sin Nombre";
    const pvm = mapeo.pvm ? limpiarNumero(raw[mapeo.pvm]) : 0;
    const pvp = mapeo.pvp ? limpiarNumero(raw[mapeo.pvp]) : 0;

    filasMap.set(refVal, {
      ref: refVal,
      nombre: nom,
      pvm,
      pvp,
    });
  }

  return {
    filas: Array.from(filasMap.values()),
    columnasDetectadas: mapeo,
  };
}

export const SUPABASE_SQL_EDITOR_URL = "https://supabase.com/dashboard/project/tdanxpksmfnwzdgzttau/sql/new";

export const SQL_MIGRACION_REFERENCIAS = `-- =========================================================================
-- MIGRACIÓN: Tabla Maestra de Referencias Global (REF, Nombre, PVM, PVP)
-- =========================================================================

-- 1. Tabla maestra de referencias
CREATE TABLE IF NOT EXISTS public.referencias (
  id BIGSERIAL PRIMARY KEY,
  ref TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL DEFAULT '',
  pvm NUMERIC NOT NULL DEFAULT 0,
  pvp NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Tabla de historial de cargas de referencias
CREATE TABLE IF NOT EXISTS public.cargas_referencias (
  id BIGSERIAL PRIMARY KEY,
  archivo TEXT NOT NULL,
  filas_recibidas INTEGER NOT NULL DEFAULT 0,
  filas_nuevas INTEGER NOT NULL DEFAULT 0,
  filas_actualizadas INTEGER NOT NULL DEFAULT 0,
  usuario_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Vistas de compatibilidad (dim_referencias y referencias_global)
CREATE OR REPLACE VIEW public.dim_referencias AS 
SELECT * FROM public.referencias;

CREATE OR REPLACE VIEW public.referencias_global AS 
SELECT * FROM public.referencias;

-- 4. Índices para búsqueda y rendimiento
CREATE INDEX IF NOT EXISTS idx_referencias_ref ON public.referencias(ref);
CREATE INDEX IF NOT EXISTS idx_referencias_nombre ON public.referencias(nombre);
CREATE INDEX IF NOT EXISTS idx_cargas_referencias_created_at ON public.cargas_referencias(created_at DESC);

-- 5. Permisos y RLS
ALTER TABLE public.referencias DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cargas_referencias DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.referencias TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.cargas_referencias TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.dim_referencias TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.referencias_global TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- 6. Función RPC para Ingestión Masiva por UPSERT en Lotes (Streaming)
CREATE OR REPLACE FUNCTION public.ingest_referencias(payload jsonb)
RETURNS TABLE(recibidas integer, nuevas integer, actualizadas integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_recibidas INTEGER := 0;
  v_nuevas INTEGER := 0;
  v_actualizadas INTEGER := 0;
  v_action TEXT;
BEGIN
  IF jsonb_typeof(payload) = 'array' AND jsonb_array_length(payload) > 0 THEN
    v_action := payload->0->>'__action__';
    IF v_action = 'purge' OR v_action = 'purgar' THEN
      TRUNCATE TABLE public.referencias RESTART IDENTITY CASCADE;
      TRUNCATE TABLE public.cargas_referencias RESTART IDENTITY CASCADE;
      RETURN QUERY SELECT 0::integer, 0::integer, 0::integer;
      RETURN;
    END IF;
  END IF;

  WITH datos_in AS (
    SELECT
      TRIM(elem->>'ref') AS ref_val,
      COALESCE(NULLIF(TRIM(elem->>'nombre'), ''), 'Sin Nombre') AS nombre_val,
      COALESCE((elem->>'pvm')::numeric, 0) AS pvm_val,
      COALESCE((elem->>'pvp')::numeric, 0) AS pvp_val
    FROM jsonb_array_elements(payload) AS elem
    WHERE NULLIF(TRIM(elem->>'ref'), '') IS NOT NULL
  ),
  filas_unicas AS (
    SELECT DISTINCT ON (ref_val) ref_val, nombre_val, pvm_val, pvp_val
    FROM datos_in
  ),
  conteo_total AS (
    SELECT COUNT(*)::integer AS total FROM filas_unicas
  ),
  upsert_op AS (
    INSERT INTO public.referencias (ref, nombre, pvm, pvp, updated_at)
    SELECT ref_val, nombre_val, pvm_val, pvp_val, now()
    FROM filas_unicas
    ON CONFLICT (ref) DO UPDATE
    SET
      nombre = EXCLUDED.nombre,
      pvm = EXCLUDED.pvm,
      pvp = EXCLUDED.pvp,
      updated_at = now()
    RETURNING (xmax = 0) AS es_nueva
  )
  SELECT
    (SELECT total FROM conteo_total),
    COALESCE(COUNT(*) FILTER (WHERE es_nueva), 0)::integer,
    COALESCE(COUNT(*) FILTER (WHERE NOT es_nueva), 0)::integer
  INTO v_recibidas, v_nuevas, v_actualizadas
  FROM upsert_op;

  RETURN QUERY SELECT v_recibidas, v_nuevas, v_actualizadas;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.ingest_referencias(jsonb) TO postgres, anon, authenticated, service_role;

-- 7. Notificar a PostgREST para recargar la caché de esquemas inmediatamente
NOTIFY pgrst, 'reload schema';`;

/**
 * Comprueba si la tabla 'referencias' ya existe en Supabase y está disponible en la caché de esquemas.
 */
export async function verificarEstadoTablaReferencias(): Promise<{
  existe: boolean;
  error?: string;
}> {
  try {
    const { error } = await (supabase as any)
      .from("referencias")
      .select("ref", { head: true, count: "exact" });

    if (error) {
      if (
        error.code === "PGRST205" ||
        error.message?.includes("schema cache") ||
        error.message?.includes("Could not find the table")
      ) {
        return { existe: false, error: error.message };
      }
      return { existe: false, error: error.message };
    }
    return { existe: true };
  } catch (err: any) {
    return { existe: false, error: err?.message };
  }
}

/**
 * Ingesta un lote de referencias en Supabase con UPSERT (inserta o actualiza por REF).
 */
export async function ingestarLoteReferencias(
  lote: FilaReferencia[]
): Promise<{ recibidas: number; nuevas: number; actualizadas: number }> {
  if (!lote || lote.length === 0) {
    return { recibidas: 0, nuevas: 0, actualizadas: 0 };
  }

  // 1. Intentar primero con la función RPC optimizada ingest_referencias
  try {
    const { data: rpcRes, error: rpcErr } = await supabase.rpc("ingest_referencias", {
      payload: lote as any,
    });
    if (!rpcErr && rpcRes && rpcRes.length > 0) {
      return {
        recibidas: Number(rpcRes[0].recibidas ?? lote.length),
        nuevas: Number(rpcRes[0].nuevas ?? 0),
        actualizadas: Number(rpcRes[0].actualizadas ?? 0),
      };
    }
  } catch {
    // Si la función RPC aún no está activa o falla, usar fallback directo con supabase.from('referencias').upsert
  }

  // 2. Fallback directo vía Supabase REST Upsert sobre la tabla referencias
  const payloadToUpsert = lote.map((item) => ({
    ref: item.ref,
    nombre: item.nombre,
    pvm: item.pvm,
    pvp: item.pvp,
    updated_at: new Date().toISOString(),
  }));

  const { error: upsertErr } = await (supabase as any)
    .from("referencias")
    .upsert(payloadToUpsert, { onConflict: "ref" });

  if (upsertErr) {
    if (
      upsertErr.code === "PGRST205" ||
      upsertErr.message?.includes("schema cache") ||
      upsertErr.message?.includes("Could not find the table")
    ) {
      throw new Error(
        "La tabla 'referencias' aún no existe en la base de datos de Supabase. Por favor ejecuta el script de migración SQL en el SQL Editor de Supabase (ver panel superior) para habilitarla."
      );
    }
    throw new Error(`Error al guardar referencias: ${upsertErr.message}`);
  }

  return {
    recibidas: lote.length,
    nuevas: lote.length,
    actualizadas: 0,
  };
}

/**
 * Registra una entrada en el historial de cargas de referencias.
 */
export async function registrarCargaReferencias(
  archivo: string,
  recibidas: number,
  nuevas: number,
  actualizadas: number
): Promise<{ ok: boolean }> {
  const { data: userData } = await supabase.auth.getUser();

  // Intentar guardar en cargas_referencias
  const { error } = await (supabase as any).from("cargas_referencias").insert({
    archivo,
    filas_recibidas: recibidas,
    filas_nuevas: nuevas,
    filas_actualizadas: actualizadas,
    usuario_id: userData?.user?.id ?? null,
  });

  if (error) {
    // Fallback: insertar con usuario_id nulo si hay restricción de clave foránea
    await (supabase as any).from("cargas_referencias").insert({
      archivo,
      filas_recibidas: recibidas,
      filas_nuevas: nuevas,
      filas_actualizadas: actualizadas,
      usuario_id: null,
    });
  }

  return { ok: true };
}

/**
 * Obtiene el resumen del catálogo de referencias (total referencias, precios promedio e historial).
 */
export async function obtenerResumenReferencias(): Promise<{
  totalReferencias: number;
  historial: HistorialCargaReferencia[];
  precioPromedioPVM: number;
  precioPromedioPVP: number;
}> {
  try {
    const { count, error: countErr } = await (supabase as any)
      .from("referencias")
      .select("*", { count: "exact", head: true });

    const totalReferencias = !countErr ? count ?? 0 : 0;

    const { data: histData } = await (supabase as any)
      .from("cargas_referencias")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    const historial: HistorialCargaReferencia[] = (histData || []).map((h: any) => ({
      id: Number(h.id),
      archivo: String(h.archivo || "Archivo"),
      filas_recibidas: Number(h.filas_recibidas || 0),
      filas_nuevas: Number(h.filas_nuevas || 0),
      filas_actualizadas: Number(h.filas_actualizadas || 0),
      created_at: String(h.created_at),
    }));

    // Muestra para calcular precio promedio
    const { data: sampleData } = await (supabase as any)
      .from("referencias")
      .select("pvm, pvp")
      .limit(100);

    let sumPvm = 0;
    let sumPvp = 0;
    let countSample = 0;

    if (sampleData && sampleData.length > 0) {
      for (const row of sampleData) {
        if (Number(row.pvm) > 0 || Number(row.pvp) > 0) {
          sumPvm += Number(row.pvm || 0);
          sumPvp += Number(row.pvp || 0);
          countSample++;
        }
      }
    }

    return {
      totalReferencias,
      historial,
      precioPromedioPVM: countSample > 0 ? Math.round(sumPvm / countSample) : 0,
      precioPromedioPVP: countSample > 0 ? Math.round(sumPvp / countSample) : 0,
    };
  } catch (err) {
    console.warn("Aviso en obtenerResumenReferencias:", err);
    return {
      totalReferencias: 0,
      historial: [],
      precioPromedioPVM: 0,
      precioPromedioPVP: 0,
    };
  }
}

/**
 * Consulta referencias paginadas con soporte para búsqueda rápida por REF o Nombre.
 */
export async function consultarReferencias(
  busqueda = "",
  pagina = 1,
  porPagina = 20
): Promise<{ filas: FilaReferencia[]; total: number }> {
  try {
    let query = (supabase as any)
      .from("referencias")
      .select("ref, nombre, pvm, pvp", { count: "exact" });

    if (busqueda.trim()) {
      const b = busqueda.trim();
      query = query.or(`ref.ilike.%${b}%,nombre.ilike.%${b}%`);
    }

    const desde = (pagina - 1) * porPagina;
    const hasta = desde + porPagina - 1;

    const { data, count, error } = await query
      .order("updated_at", { ascending: false })
      .range(desde, hasta);

    if (error) throw error;

    return {
      filas: (data || []).map((r: any) => ({
        ref: String(r.ref),
        nombre: String(r.nombre),
        pvm: Number(r.pvm || 0),
        pvp: Number(r.pvp || 0),
      })),
      total: count ?? (data?.length || 0),
    };
  } catch (err) {
    console.warn("Aviso en consultarReferencias:", err);
    return { filas: [], total: 0 };
  }
}

/**
 * Purgar completamente la tabla de referencias.
 */
export async function purgarReferencias(): Promise<{ ok: boolean; mensaje: string }> {
  try {
    const { error: rpcErr } = await supabase.rpc("ingest_referencias", {
      payload: [{ __action__: "purge" }] as any,
    });
    if (!rpcErr) {
      return { ok: true, mensaje: "Catálogo de referencias purgado exitosamente." };
    }
  } catch {
    // Continuar con borrado directo
  }

  const { error } = await (supabase as any).from("referencias").delete().neq("id", -1);
  if (error) {
    throw new Error(`Error al purgar referencias: ${error.message}`);
  }

  return { ok: true, mensaje: "Catálogo de referencias purgado exitosamente." };
}
