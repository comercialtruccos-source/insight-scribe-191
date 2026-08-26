import { supabase } from "@/integrations/supabase/client";

export type FiltrosBI = {
  anio?: number | null;
  mes?: number | null;
  canal_id?: number | null;
  marca_id?: number | null;
  vendedor_id?: number | null;
  zona_id?: number | null;
};

export type KpisBI = {
  totalVentas: number;
  totalCantidad: number;
  totalCosto: number;
  margenBruto: number;
  margenPct: number;
  totalTransacciones: number;
  totalClientes: number;
  totalSkus: number;
  ticketPromedio: number;
  precioPromedioUnidad: number;
};

export type VentasPeriodo = {
  anio: number;
  mes: number;
  periodo: string;
  totalVentas: number;
  totalCantidad: number;
  totalCosto: number;
  margenBruto: number;
  margenPct: number;
  totalTransacciones: number;
};

export type ItemRanking = {
  id: number;
  nombre: string;
  totalVentas: number;
  totalCantidad: number;
  totalCosto: number;
  margenBruto: number;
  margenPct: number;
  transacciones: number;
};

export type ProductoRanking = {
  sku: string;
  producto: string;
  prendaHgi: string;
  talla: string;
  color: string;
  totalVentas: number;
  totalCantidad: number;
  totalCosto: number;
  margenBruto: number;
  margenPct: number;
};

export type CatalogoItem = {
  id: number;
  nombre: string;
};

export type CatalogosDisponibles = {
  anios: number[];
  vendedores: CatalogoItem[];
  canales: CatalogoItem[];
  marcas: CatalogoItem[];
  lineas: CatalogoItem[];
  zonas: CatalogoItem[];
  ciudades: CatalogoItem[];
};

export async function obtenerResumenCliente() {
  const [ventas, cargas, ultimas, rango] = await Promise.all([
    supabase.from("fact_ventas").select("id", { count: "exact", head: true }),
    supabase.from("cargas").select("id", { count: "exact", head: true }),
    supabase
      .from("cargas")
      .select("id, archivo, filas_recibidas, filas_nuevas, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("fact_ventas")
      .select("fecha")
      .order("fecha", { ascending: false })
      .limit(1),
  ]);

  return {
    totalVentas: ventas.count ?? 0,
    totalCargas: cargas.count ?? 0,
    ultimaFecha: rango.data?.[0]?.fecha ?? null,
    historial: ultimas.data ?? [],
  };
}

export async function ingestarLoteCliente(filas: unknown[]) {
  const { data: res, error } = await supabase.rpc("ingest_ventas", {
    payload: filas as never,
  });
  if (error) throw new Error(error.message);
  const fila = Array.isArray(res) ? res[0] : res;
  return {
    recibidas: Number(fila?.recibidas ?? 0),
    nuevas: Number(fila?.nuevas ?? 0),
  };
}

export async function registrarCargaCliente(
  archivo: string,
  recibidas: number,
  nuevas: number
) {
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase.from("cargas").insert({
    archivo,
    filas_recibidas: recibidas,
    filas_nuevas: nuevas,
    filas_duplicadas: Math.max(0, recibidas - nuevas),
    usuario_id: userData?.user?.id ?? null,
  });
  if (error) throw new Error(error.message);
  return { ok: true };
}

/** Obtiene los catálogos para llenar los selectores de filtros */
export async function obtenerCatalogosFiltros(): Promise<CatalogosDisponibles> {
  const [aniosRes, vendRes, canalRes, marcaRes, lineaRes, zonaRes, ciudadRes] =
    await Promise.all([
      supabase
        .from("fact_ventas")
        .select("anio")
        .not("anio", "is", null)
        .order("anio", { ascending: false })
        .limit(200),
      supabase.from("dim_vendedor").select("id, nombre").order("nombre"),
      supabase.from("dim_canal").select("id, nombre").order("nombre"),
      supabase.from("dim_marca").select("id, nombre").order("nombre"),
      supabase.from("dim_linea").select("id, nombre").order("nombre"),
      supabase.from("dim_zona_colombia").select("id, nombre").order("nombre"),
      supabase.from("dim_ciudad").select("id, nombre").order("nombre"),
    ]);

  const aniosUnicos = Array.from(
    new Set((aniosRes.data || []).map((r) => r.anio).filter(Boolean))
  ) as number[];

  return {
    anios: aniosUnicos.sort((a, b) => b - a),
    vendedores: vendRes.data || [],
    canales: canalRes.data || [],
    marcas: marcaRes.data || [],
    lineas: lineaRes.data || [],
    zonas: zonaRes.data || [],
    ciudades: ciudadRes.data || [],
  };
}

/** Obtiene las métricas KPI principales aplicando filtros */
export async function obtenerKpisBI(filtros: FiltrosBI): Promise<KpisBI> {
  try {
    const { data, error } = await supabase.rpc("get_bi_kpis", {
      p_anio: filtros.anio ?? undefined,
      p_mes: filtros.mes ?? undefined,
      p_canal_id: filtros.canal_id ?? undefined,
      p_marca_id: filtros.marca_id ?? undefined,
      p_vendedor_id: filtros.vendedor_id ?? undefined,
      p_zona_id: filtros.zona_id ?? undefined,
    });

    if (!error && data) {
      const d = data as Record<string, unknown>;
      return {
        totalVentas: Number(d.total_ventas ?? 0),
        totalCantidad: Number(d.total_cantidad ?? 0),
        totalCosto: Number(d.total_costo ?? 0),
        margenBruto: Number(d.margen_bruto ?? 0),
        margenPct: Number(d.margen_pct ?? 0),
        totalTransacciones: Number(d.total_transacciones ?? 0),
        totalClientes: Number(d.total_clientes ?? 0),
        totalSkus: Number(d.total_skus ?? 0),
        ticketPromedio: Number(d.ticket_promedio ?? 0),
        precioPromedioUnidad: Number(d.precio_promedio_unidad ?? 0),
      };
    }
  } catch {
    // Continuar con fallback
  }

  // Fallback client-side query
  let query = supabase.from("fact_ventas").select("valor, cantidad, costo_total, transaccion, sku");
  if (filtros.anio) query = query.eq("anio", filtros.anio);
  if (filtros.mes) query = query.eq("mes", filtros.mes);
  if (filtros.canal_id) query = query.eq("canal_id", filtros.canal_id);
  if (filtros.marca_id) query = query.eq("marca_id", filtros.marca_id);
  if (filtros.vendedor_id) query = query.eq("vendedor_id", filtros.vendedor_id);
  if (filtros.zona_id) query = query.eq("zona_colombia_id", filtros.zona_id);

  const { data: rows } = await query.limit(10000);
  if (!rows || rows.length === 0) {
    return {
      totalVentas: 0,
      totalCantidad: 0,
      totalCosto: 0,
      margenBruto: 0,
      margenPct: 0,
      totalTransacciones: 0,
      totalClientes: 0,
      totalSkus: 0,
      ticketPromedio: 0,
      precioPromedioUnidad: 0,
    };
  }

  let totalVentas = 0;
  let totalCantidad = 0;
  let totalCosto = 0;
  const transacciones = new Set<string>();
  const skus = new Set<string>();

  for (const r of rows) {
    totalVentas += Number(r.valor ?? 0);
    totalCantidad += Number(r.cantidad ?? 0);
    totalCosto += Number(r.costo_total ?? 0);
    if (r.transaccion) transacciones.add(r.transaccion);
    if (r.sku) skus.add(r.sku);
  }

  const margenBruto = totalVentas - totalCosto;
  const margenPct = totalVentas > 0 ? (margenBruto / totalVentas) * 100 : 0;
  const totalTrans = transacciones.size || rows.length;

  return {
    totalVentas,
    totalCantidad,
    totalCosto,
    margenBruto,
    margenPct: Math.round(margenPct * 100) / 100,
    totalTransacciones: totalTrans,
    totalClientes: 0,
    totalSkus: skus.size,
    ticketPromedio: totalTrans > 0 ? Math.round(totalVentas / totalTrans) : 0,
    precioPromedioUnidad: totalCantidad > 0 ? Math.round(totalVentas / totalCantidad) : 0,
  };
}

/** Obtiene la evolución temporal de ventas y margen */
export async function obtenerVentasTiempo(filtros: FiltrosBI): Promise<VentasPeriodo[]> {
  try {
    const { data, error } = await supabase.rpc("get_bi_ventas_tiempo", {
      p_anio: filtros.anio ?? undefined,
      p_canal_id: filtros.canal_id ?? undefined,
      p_marca_id: filtros.marca_id ?? undefined,
      p_vendedor_id: filtros.vendedor_id ?? undefined,
      p_zona_id: filtros.zona_id ?? undefined,
    });

    if (!error && Array.isArray(data)) {
      return data.map((r: Record<string, unknown>) => ({
        anio: Number(r.anio),
        mes: Number(r.mes),
        periodo: String(r.periodo),
        totalVentas: Number(r.total_ventas ?? 0),
        totalCantidad: Number(r.total_cantidad ?? 0),
        totalCosto: Number(r.total_costo ?? 0),
        margenBruto: Number(r.margen_bruto ?? 0),
        margenPct: Number(r.margen_pct ?? 0),
        totalTransacciones: Number(r.total_transacciones ?? 0),
      }));
    }
  } catch {
    // Continuar con fallback
  }

  return [];
}

/** Obtiene ranking por dimensión (vendedor, canal, marca, línea, zona, etc.) */
export async function obtenerRankingDimension(
  dimension: "vendedor" | "canal" | "marca" | "linea" | "zona" | "ciudad" | "coleccion",
  filtros: FiltrosBI,
  limite = 10
): Promise<ItemRanking[]> {
  try {
    const { data, error } = await supabase.rpc("get_bi_ranking_dimension", {
      p_dimension: dimension,
      p_anio: filtros.anio ?? undefined,
      p_mes: filtros.mes ?? undefined,
      p_canal_id: filtros.canal_id ?? undefined,
      p_marca_id: filtros.marca_id ?? undefined,
      p_vendedor_id: filtros.vendedor_id ?? undefined,
      p_zona_id: filtros.zona_id ?? undefined,
      p_limite: limite,
    });

    if (!error && Array.isArray(data)) {
      return data.map((r: Record<string, unknown>) => ({
        id: Number(r.id),
        nombre: String(r.nombre),
        totalVentas: Number(r.total_ventas ?? 0),
        totalCantidad: Number(r.total_cantidad ?? 0),
        totalCosto: Number(r.total_costo ?? 0),
        margenBruto: Number(r.margen_bruto ?? 0),
        margenPct: Number(r.margen_pct ?? 0),
        transacciones: Number(r.transacciones ?? 0),
      }));
    }
  } catch {
    // Continuar con fallback
  }

  return [];
}

/** Obtiene el ranking de mejores productos / SKUs */
export async function obtenerTopProductos(
  filtros: FiltrosBI,
  limite = 10
): Promise<ProductoRanking[]> {
  try {
    const { data, error } = await supabase.rpc("get_bi_top_productos", {
      p_anio: filtros.anio ?? undefined,
      p_mes: filtros.mes ?? undefined,
      p_canal_id: filtros.canal_id ?? undefined,
      p_marca_id: filtros.marca_id ?? undefined,
      p_vendedor_id: filtros.vendedor_id ?? undefined,
      p_limite: limite,
    });

    if (!error && Array.isArray(data)) {
      return data.map((r: Record<string, unknown>) => ({
        sku: String(r.sku),
        producto: String(r.producto),
        prendaHgi: String(r.prenda_hgi ?? ""),
        talla: String(r.talla ?? ""),
        color: String(r.color ?? ""),
        totalVentas: Number(r.total_ventas ?? 0),
        totalCantidad: Number(r.total_cantidad ?? 0),
        totalCosto: Number(r.total_costo ?? 0),
        margenBruto: Number(r.margen_bruto ?? 0),
        margenPct: Number(r.margen_pct ?? 0),
      }));
    }
  } catch {
    // Continuar con fallback
  }

  return [];
}

export type FilaDetalleVenta = {
  id: number;
  transaccion: string | null;
  fecha: string | null;
  vendedor: string | null;
  canal: string | null;
  marca: string | null;
  linea: string | null;
  zona: string | null;
  ciudad: string | null;
  sku: string | null;
  producto: string | null;
  talla: string | null;
  color: string | null;
  cantidad: number | null;
  valor: number | null;
  costo_total: number | null;
};

/** Consulta paginada con búsqueda para el explorador de transacciones */
export async function obtenerTransaccionesDetalle(
  filtros: FiltrosBI,
  busqueda = "",
  pagina = 0,
  tamanoPagina = 25
): Promise<{ filas: FilaDetalleVenta[]; total: number }> {
  let query = supabase
    .from("fact_ventas")
    .select(
      `
      id,
      transaccion,
      fecha,
      producto,
      prenda_hgi,
      sku,
      talla,
      color,
      cantidad,
      valor,
      costo_total,
      dim_vendedor!fact_ventas_vendedor_id_fkey(nombre),
      dim_canal(nombre),
      dim_marca(nombre),
      dim_linea(nombre),
      dim_zona_colombia(nombre),
      dim_ciudad(nombre)
    `,
      { count: "exact" }
    );

  if (filtros.anio) query = query.eq("anio", filtros.anio);
  if (filtros.mes) query = query.eq("mes", filtros.mes);
  if (filtros.canal_id) query = query.eq("canal_id", filtros.canal_id);
  if (filtros.marca_id) query = query.eq("marca_id", filtros.marca_id);
  if (filtros.vendedor_id) query = query.eq("vendedor_id", filtros.vendedor_id);
  if (filtros.zona_id) query = query.eq("zona_colombia_id", filtros.zona_id);

  if (busqueda && busqueda.trim().length > 0) {
    const b = busqueda.trim();
    query = query.or(`transaccion.ilike.%${b}%,sku.ilike.%${b}%,producto.ilike.%${b}%,prenda_hgi.ilike.%${b}%`);
  }

  const desde = pagina * tamanoPagina;
  const hasta = desde + tamanoPagina - 1;

  const { data, count, error } = await query
    .order("fecha", { ascending: false })
    .range(desde, hasta);

  if (error || !data) {
    return { filas: [], total: 0 };
  }

  const filas: FilaDetalleVenta[] = data.map((r: Record<string, unknown>) => {
    const v = r.dim_vendedor as { nombre?: string } | null;
    const can = r.dim_canal as { nombre?: string } | null;
    const m = r.dim_marca as { nombre?: string } | null;
    const l = r.dim_linea as { nombre?: string } | null;
    const z = r.dim_zona_colombia as { nombre?: string } | null;
    const c = r.dim_ciudad as { nombre?: string } | null;

    return {
      id: Number(r.id),
      transaccion: (r.transaccion as string) || null,
      fecha: (r.fecha as string) || null,
      vendedor: v?.nombre || null,
      canal: can?.nombre || null,
      marca: m?.nombre || null,
      linea: l?.nombre || null,
      zona: z?.nombre || null,
      ciudad: c?.nombre || null,
      sku: (r.sku as string) || null,
      producto: (r.producto as string) || (r.prenda_hgi as string) || null,
      talla: (r.talla as string) || null,
      color: (r.color as string) || null,
      cantidad: r.cantidad !== null ? Number(r.cantidad) : null,
      valor: r.valor !== null ? Number(r.valor) : null,
      costo_total: r.costo_total !== null ? Number(r.costo_total) : null,
    };
  });

  return { filas, total: count ?? 0 };
}
