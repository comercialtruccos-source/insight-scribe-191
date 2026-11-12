import * as XLSX from "xlsx";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";

/**
 * Representa una fila individual del archivo de clientes en mora (cartera vencida).
 * Columnas requeridas por el usuario: T, Tercero, Nombre, Tr, Documento, Cuota, Referencia, Fecha, Vence, Vendedor.
 */
export type FilaClienteMora = {
  t: string;           // T: Tipo de documento
  tercero: string;     // Tercero: Cédula o NIT del cliente
  nombre: string;      // Nombre: Razón social o nombre del cliente
  tr: string;          // Tr: Código de transacción
  documento: string;   // Documento: Número de factura / documento
  cuota: string;       // Cuota: Número de cuota
  referencia: string;  // Referencia: Detalle o referencia del documento
  fecha: string;       // Fecha: Fecha de emisión
  vence: string;       // Vence: Fecha de vencimiento
  vendedor: string;    // Vendedor: Nombre o código del asesor comercial
  valor?: number;      // Valor total del documento
  saldo?: number;      // Saldo pendiente / mora
  dias_mora?: number;  // Días de mora calculados
  carga_id?: number;   // ID de la auditoría de carga
};

export type RegistroClienteMora = FilaClienteMora & {
  id: number;
  created_at: string;
  updated_at: string;
};

export type CargaClienteMora = {
  id: number;
  archivo: string;
  filas_recibidas: number;
  filas_insertadas: number;
  total_saldo: number;
  total_clientes: number;
  created_at: string;
};

export type MetaArchivoClientesMora = {
  totalFilas: number;
  columnasDetectadas: {
    t?: string;
    tercero?: string;
    nombre?: string;
    tr?: string;
    documento?: string;
    cuota?: string;
    referencia?: string;
    fecha?: string;
    vence?: string;
    vendedor?: string;
    valor?: string;
    saldo?: string;
    dias_mora?: string;
  };
  esValido: boolean;
  hojasDisponibles?: string[];
  hojaSeleccionada?: string;
  preview: FilaClienteMora[];
  filasInvalidas: number;
  mensajeError?: string;
};

export const SUPABASE_SQL_EDITOR_URL = "https://supabase.com/dashboard/project/tdanxpksmfnwzdgzttau/sql/new";

export const SQL_MIGRACION_CLIENTES_MORA = `-- =========================================================================
-- MIGRACIÓN: Tabla Maestra de Clientes en Mora (Cartera Vencida)
-- Columnas: T, Tercero, Nombre, Tr, Documento, Cuota, Referencia, Fecha, Vence, Vendedor
-- =========================================================================

-- 1. Tabla maestra de clientes en mora
CREATE TABLE IF NOT EXISTS public.clientes_mora (
  id BIGSERIAL PRIMARY KEY,
  t TEXT NOT NULL DEFAULT '',
  tercero TEXT NOT NULL DEFAULT '',
  nombre TEXT NOT NULL DEFAULT '',
  tr TEXT NOT NULL DEFAULT '',
  documento TEXT NOT NULL DEFAULT '',
  cuota TEXT NOT NULL DEFAULT '1',
  referencia TEXT DEFAULT '',
  fecha TEXT DEFAULT '',
  vence TEXT DEFAULT '',
  vendedor TEXT NOT NULL DEFAULT '',
  valor NUMERIC NOT NULL DEFAULT 0,
  saldo NUMERIC NOT NULL DEFAULT 0,
  dias_mora INTEGER NOT NULL DEFAULT 0,
  carga_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Tabla de historial de cargas
CREATE TABLE IF NOT EXISTS public.cargas_clientes_mora (
  id BIGSERIAL PRIMARY KEY,
  archivo TEXT NOT NULL,
  filas_recibidas INTEGER NOT NULL DEFAULT 0,
  filas_insertadas INTEGER NOT NULL DEFAULT 0,
  total_saldo NUMERIC NOT NULL DEFAULT 0,
  total_clientes INTEGER NOT NULL DEFAULT 0,
  usuario_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Vistas de compatibilidad
CREATE OR REPLACE VIEW public.cartera_mora AS 
SELECT * FROM public.clientes_mora;

CREATE OR REPLACE VIEW public.cartera_clientes_mora AS 
SELECT * FROM public.clientes_mora;

CREATE OR REPLACE VIEW public.cargas_cartera_mora AS 
SELECT * FROM public.cargas_clientes_mora;

-- 4. Índices optimizados
CREATE INDEX IF NOT EXISTS idx_clientes_mora_tercero ON public.clientes_mora(tercero);
CREATE INDEX IF NOT EXISTS idx_clientes_mora_nombre ON public.clientes_mora(nombre);
CREATE INDEX IF NOT EXISTS idx_clientes_mora_vendedor ON public.clientes_mora(vendedor);
CREATE INDEX IF NOT EXISTS idx_clientes_mora_documento ON public.clientes_mora(documento);
CREATE INDEX IF NOT EXISTS idx_clientes_mora_fecha ON public.clientes_mora(fecha);
CREATE INDEX IF NOT EXISTS idx_clientes_mora_vence ON public.clientes_mora(vence);
CREATE INDEX IF NOT EXISTS idx_clientes_mora_saldo ON public.clientes_mora(saldo);
CREATE INDEX IF NOT EXISTS idx_clientes_mora_dias_mora ON public.clientes_mora(dias_mora);
CREATE INDEX IF NOT EXISTS idx_cargas_clientes_mora_created ON public.cargas_clientes_mora(created_at DESC);

-- 5. Permisos y RLS
ALTER TABLE public.clientes_mora DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cargas_clientes_mora DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.clientes_mora TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.cargas_clientes_mora TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.cartera_mora TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.cartera_clientes_mora TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.cargas_cartera_mora TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- 6. Función RPC de ingestión masiva por streaming y purga
CREATE OR REPLACE FUNCTION public.ingest_clientes_mora(payload jsonb)
RETURNS TABLE(recibidas integer, insertadas integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_recibidas INTEGER := 0;
  v_insertadas INTEGER := 0;
  v_action TEXT;
BEGIN
  IF jsonb_typeof(payload) = 'array' AND jsonb_array_length(payload) > 0 THEN
    v_action := payload->0->>'__action__';
    IF v_action = 'purge' OR v_action = 'purgar' THEN
      TRUNCATE TABLE public.clientes_mora RESTART IDENTITY CASCADE;
      TRUNCATE TABLE public.cargas_clientes_mora RESTART IDENTITY CASCADE;
      RETURN QUERY SELECT 0::integer, 0::integer;
      RETURN;
    END IF;
  END IF;

  WITH ins AS (
    INSERT INTO public.clientes_mora (
      t, tercero, nombre, tr, documento, cuota, referencia, fecha, vence, vendedor,
      valor, saldo, dias_mora, carga_id
    )
    SELECT
      COALESCE(NULLIF(TRIM(COALESCE(elem->>'t', elem->>'T')), ''), ''),
      COALESCE(NULLIF(TRIM(COALESCE(elem->>'tercero', elem->>'Tercero', elem->>'nit', elem->>'NIT')), ''), ''),
      COALESCE(NULLIF(TRIM(COALESCE(elem->>'nombre', elem->>'Nombre', elem->>'cliente', elem->>'Cliente')), ''), ''),
      COALESCE(NULLIF(TRIM(COALESCE(elem->>'tr', elem->>'Tr', elem->>'TR')), ''), ''),
      COALESCE(NULLIF(TRIM(COALESCE(elem->>'documento', elem->>'Documento', elem->>'doc', elem->>'DOC')), ''), ''),
      COALESCE(NULLIF(TRIM(COALESCE(elem->>'cuota', elem->>'Cuota')), ''), '1'),
      COALESCE(NULLIF(TRIM(COALESCE(elem->>'referencia', elem->>'Referencia', elem->>'ref', elem->>'REF')), ''), ''),
      COALESCE(NULLIF(TRIM(COALESCE(elem->>'fecha', elem->>'Fecha')), ''), ''),
      COALESCE(NULLIF(TRIM(COALESCE(elem->>'vence', elem->>'Vence', elem->>'vencimiento', elem->>'Vencimiento')), ''), ''),
      COALESCE(NULLIF(TRIM(COALESCE(elem->>'vendedor', elem->>'Vendedor')), ''), ''),
      COALESCE(NULLIF(TRIM(COALESCE(elem->>'valor', elem->>'Valor', elem->>'total', elem->>'Total')), '')::numeric, 0),
      COALESCE(NULLIF(TRIM(COALESCE(elem->>'saldo', elem->>'Saldo', elem->>'saldo_mora', elem->>'Saldo_Mora', elem->>'valor', elem->>'Valor')), '')::numeric, 0),
      COALESCE(NULLIF(TRIM(COALESCE(elem->>'dias_mora', elem->>'Dias_Mora', elem->>'dias', elem->>'Dias')), '')::integer, 0),
      COALESCE(NULLIF(TRIM(elem->>'carga_id'), '')::bigint, NULL)
    FROM jsonb_array_elements(payload) AS elem
    RETURNING id
  )
  SELECT COUNT(*)::integer INTO v_insertadas FROM ins;

  v_recibidas := jsonb_array_length(payload);
  RETURN QUERY SELECT v_recibidas, v_insertadas;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.ingest_clientes_mora(jsonb) TO postgres, anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
`;

/**
 * Normaliza encabezados de columnas para emparejamiento insensible a mayúsculas y acentos.
 */
export function normalizarEncabezado(txt: string): string {
  return txt
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Limpia y parsea valores monetarios y numéricos.
 */
export function limpiarNumero(val: unknown): number {
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  if (!val) return 0;
  let str = String(val).trim();
  str = str.replace(/[$€COPcop\s]/g, "");
  if (!str) return 0;

  if (str.includes(".") && str.includes(",")) {
    if (str.lastIndexOf(",") > str.lastIndexOf(".")) {
      str = str.replace(/\./g, "").replace(",", ".");
    } else {
      str = str.replace(/,/g, "");
    }
  } else if (str.includes(",")) {
    const parts = str.split(",");
    if (parts.length === 2 && parts[1].length <= 2) {
      str = str.replace(",", ".");
    } else {
      str = str.replace(/,/g, "");
    }
  } else if (str.includes(".")) {
    const parts = str.split(".");
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      str = str.replace(/\./g, "");
    }
  }

  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

/**
 * Detecta qué columnas del archivo corresponden a los campos solicitados.
 */
export function detectarColumnasClientesMora(headers: string[]): MetaArchivoClientesMora["columnasDetectadas"] {
  const result: MetaArchivoClientesMora["columnasDetectadas"] = {};

  for (const h of headers) {
    const norm = normalizarEncabezado(h);

    if (!result.t && (norm === "t" || norm === "tipodoc" || norm === "tipodocumento" || norm === "tipo")) {
      result.t = h;
    } else if (!result.tercero && (norm === "tercero" || norm === "nit" || norm === "cedula" || norm === "identificacion")) {
      result.tercero = h;
    } else if (!result.nombre && (norm === "nombre" || norm === "razonsocial" || norm === "cliente" || norm === "nombrecliente")) {
      result.nombre = h;
    } else if (!result.tr && (norm === "tr" || norm === "trans" || norm === "transaccion" || norm === "prefijo")) {
      result.tr = h;
    } else if (!result.documento && (norm === "documento" || norm === "doc" || norm === "factura" || norm === "nrodocumento" || norm === "numero")) {
      result.documento = h;
    } else if (!result.cuota && (norm === "cuota" || norm === "cta" || norm === "nrocuota")) {
      result.cuota = h;
    } else if (!result.referencia && (norm === "referencia" || norm === "ref" || norm === "detalle" || norm === "observacion")) {
      result.referencia = h;
    } else if (!result.fecha && (norm === "fecha" || norm === "fechafactura" || norm === "fechaemision" || norm === "emision")) {
      result.fecha = h;
    } else if (!result.vence && (norm === "vence" || norm === "vencimiento" || norm === "fechavence" || norm === "fechavencimiento")) {
      result.vence = h;
    } else if (!result.vendedor && (norm === "vendedor" || norm === "asesor" || norm === "comercial" || norm === "nomvendedor")) {
      result.vendedor = h;
    } else if (!result.saldo && (norm === "saldo" || norm === "saldomora" || norm === "saldopendiente" || norm === "cartera")) {
      result.saldo = h;
    } else if (!result.valor && (norm === "valor" || norm === "valortotal" || norm === "total" || norm === "monto")) {
      result.valor = h;
    } else if (!result.dias_mora && (norm === "diasmora" || norm === "dias" || norm === "mora" || norm === "diasvencidos")) {
      result.dias_mora = h;
    }
  }

  return result;
}

/**
 * Comprueba si la tabla 'clientes_mora' ya existe en Supabase y está disponible en la caché de esquemas.
 */
export async function verificarEstadoTablaClientesMora(): Promise<{
  existe: boolean;
  error?: string;
}> {
  try {
    const { error } = await (supabase as any)
      .from("clientes_mora")
      .select("documento", { head: true, count: "exact" });

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
 * Ingesta un lote de clientes en mora en Supabase utilizando la función RPC o fallback REST.
 */
export async function ingestarLoteClientesMora(
  lote: FilaClienteMora[],
  cargaId?: number
): Promise<{ recibidas: number; insertadas: number }> {
  if (!lote || lote.length === 0) {
    return { recibidas: 0, insertadas: 0 };
  }

  const loteConCarga = cargaId ? lote.map((f) => ({ ...f, carga_id: cargaId })) : lote;

  // 1. Intentar primero con la función RPC ingest_clientes_mora
  try {
    const { data: rpcRes, error: rpcErr } = await supabase.rpc("ingest_clientes_mora", {
      payload: loteConCarga as any,
    });
    if (!rpcErr && rpcRes && rpcRes.length > 0) {
      return {
        recibidas: Number(rpcRes[0].recibidas ?? lote.length),
        insertadas: Number(rpcRes[0].insertadas ?? lote.length),
      };
    }
  } catch {
    // Si la función RPC aún no está activa o falla, usar inserción directa REST
  }

  // 2. Fallback directo vía Supabase REST
  const payloadToInsert = loteConCarga.map((item) => ({
    t: item.t || "",
    tercero: item.tercero || "",
    nombre: item.nombre || "",
    tr: item.tr || "",
    documento: item.documento || "",
    cuota: item.cuota || "1",
    referencia: item.referencia || "",
    fecha: item.fecha || "",
    vence: item.vence || "",
    vendedor: item.vendedor || "",
    valor: Number(item.valor || 0),
    saldo: Number(item.saldo || 0),
    dias_mora: Number(item.dias_mora || 0),
    carga_id: item.carga_id || null,
  }));

  const { data, error } = await (supabase as any)
    .from("clientes_mora")
    .insert(payloadToInsert)
    .select("id");

  if (error) {
    throw new Error(`Error al insertar clientes en mora: ${error.message}`);
  }

  return {
    recibidas: lote.length,
    insertadas: data?.length || lote.length,
  };
}

/**
 * Consulta clientes en mora con paginación, filtros de búsqueda y vendedor.
 */
export async function obtenerClientesMora(params: {
  busqueda?: string;
  vendedor?: string;
  pagina?: number;
  porPagina?: number;
} = {}): Promise<{
  filas: RegistroClienteMora[];
  total: number;
}> {
  const { busqueda = "", vendedor = "", pagina = 1, porPagina = 50 } = params;

  try {
    let query = (supabase as any)
      .from("clientes_mora")
      .select("*", { count: "exact" });

    if (busqueda.trim()) {
      const b = busqueda.trim();
      query = query.or(`tercero.ilike.%${b}%,nombre.ilike.%${b}%,documento.ilike.%${b}%`);
    }

    if (vendedor.trim() && vendedor !== "TODOS") {
      query = query.ilike("vendedor", `%${vendedor.trim()}%`);
    }

    const desde = (pagina - 1) * porPagina;
    const hasta = desde + porPagina - 1;

    const { data, count, error } = await query
      .order("dias_mora", { ascending: false })
      .range(desde, hasta);

    if (error) throw error;

    return {
      filas: (data || []) as RegistroClienteMora[],
      total: count ?? (data?.length || 0),
    };
  } catch (err) {
    console.warn("Aviso en obtenerClientesMora:", err);
    return { filas: [], total: 0 };
  }
}

/**
 * Obtiene métricas resumen de la cartera de clientes en mora.
 */
export async function obtenerResumenClientesMora(): Promise<{
  totalRegistros: number;
  totalClientes: number;
  totalSaldoMora: number;
  vendedoresAfectados: number;
}> {
  try {
    const { data, error, count } = await (supabase as any)
      .from("clientes_mora")
      .select("tercero, vendedor, saldo", { count: "exact" });

    if (error || !data) {
      return { totalRegistros: 0, totalClientes: 0, totalSaldoMora: 0, vendedoresAfectados: 0 };
    }

    const clientesUnicos = new Set<string>();
    const vendedoresUnicos = new Set<string>();
    let saldoTotal = 0;

    for (const r of data) {
      if (r.tercero) clientesUnicos.add(String(r.tercero).trim());
      if (r.vendedor) vendedoresUnicos.add(String(r.vendedor).trim());
      saldoTotal += Number(r.saldo || 0);
    }

    return {
      totalRegistros: count ?? data.length,
      totalClientes: clientesUnicos.size,
      totalSaldoMora: saldoTotal,
      vendedoresAfectados: vendedoresUnicos.size,
    };
  } catch {
    return { totalRegistros: 0, totalClientes: 0, totalSaldoMora: 0, vendedoresAfectados: 0 };
  }
}

/**
 * Purga completamente las tablas de clientes en mora e historial de cargas.
 */
export async function purgarClientesMora(): Promise<{ ok: boolean; mensaje: string }> {
  try {
    const { error: rpcErr } = await supabase.rpc("ingest_clientes_mora", {
      payload: [{ __action__: "purge" }] as any,
    });
    if (!rpcErr) {
      return { ok: true, mensaje: "Tabla de clientes en mora purgada exitosamente." };
    }
  } catch {
    // Continuar con borrado directo
  }

  const { error } = await (supabase as any).from("clientes_mora").delete().neq("id", -1);
  if (error) {
    throw new Error(`Error al purgar clientes en mora: ${error.message}`);
  }

  return { ok: true, mensaje: "Tabla de clientes en mora purgada exitosamente." };
}
