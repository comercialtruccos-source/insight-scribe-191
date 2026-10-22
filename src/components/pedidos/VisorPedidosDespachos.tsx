import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  obtenerPedidosVsDespachos,
  ResultadoPedidosDespachos,
  GrupoVendedorPedidoDespacho,
  GrupoTerceroPedidoDespacho,
  ItemProductoPedidoDespacho,
  CatalogoItem,
  fetchAllDimTercero,
} from "@/lib/ventas-api";
import { formatoCOPFull, formatoHGI } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Download,
  Calendar,
  Filter,
  ChevronDown,
  ChevronRight,
  Package,
  Truck,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  BarChart3,
  Layers,
  Clock,
  User,
  Users,
  Building2,
  Tag,
  Palette,
  Scissors,
  Save,
  Trash2,
  Plus,
  RefreshCw,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface VisorPedidosDespachosProps {
  vendedorIdFiltro?: number | "todos";
  vendedorIdsPermitidos?: number[];
  vendedorIds?: number[];
  esAdmin?: boolean;
  terceroIdFiltro?: number | "todos";
  onSelectTercero?: (terceroId: number | null) => void;
}

export function VisorPedidosDespachos({
  vendedorIdFiltro = "todos",
  vendedorIdsPermitidos,
  vendedorIds,
  esAdmin = false,
  terceroIdFiltro = "todos",
  onSelectTercero,
}: VisorPedidosDespachosProps) {
  // Filtros de encabezado HGI
  const [fechaDesde, setFechaDesde] = useState("2025-01-01");
  const [fechaHasta, setFechaHasta] = useState("2025-12-31");
  const [modoVista, setModoVista] = useState<"datos" | "grafico" | "ambos">("datos");
  const [soloPendientes, setSoloPendientes] = useState(false);
  const [correriaSeleccionada, setCorreriaSeleccionada] = useState<string>("todas");
  const [busqueda, setBusqueda] = useState("");
  const [vendedorSeleccionado, setVendedorSeleccionado] = useState<number | "todos">(
    vendedorIdFiltro
  );
  const [terceroSeleccionado, setTerceroSeleccionado] = useState<number | "todos">(
    terceroIdFiltro || "todos"
  );

  React.useEffect(() => {
    setVendedorSeleccionado(vendedorIdFiltro);
  }, [vendedorIdFiltro]);

  React.useEffect(() => {
    if (terceroIdFiltro) {
      setTerceroSeleccionado(terceroIdFiltro);
    }
  }, [terceroIdFiltro]);

  // Cargar catálogo de correrías de dim_correria
  const { data: correriasData } = useQuery<CatalogoItem[]>({
    queryKey: ["visor-correrias-catalogo"],
    queryFn: async () => {
      const { data } = await supabase
        .from("dim_correria")
        .select("id, nombre")
        .not("nombre", "is", null)
        .order("nombre");
      return (data || []).map((c) => ({ id: Number(c.id), nombre: String(c.nombre) }));
    },
    staleTime: 1000 * 60 * 30,
  });

  // Cargar catálogo de clientes / terceros
  const { data: tercerosData } = useQuery<CatalogoItem[]>({
    queryKey: ["visor-terceros-catalogo"],
    queryFn: () => fetchAllDimTercero(),
    staleTime: 1000 * 60 * 30,
  });

  // Opciones de configuración de tabla estilo visor HGI
  const [mostrarSubtotalesColumna, setMostrarSubtotalesColumna] = useState(true);
  const [mostrarTotalesColumna, setMostrarTotalesColumna] = useState(true);
  const [mostrarSubtotalesFila, setMostrarSubtotalesFila] = useState(true);
  const [mostrarTotalesFila, setMostrarTotalesFila] = useState(true);

  // Estado de filas expandidas (claves: `${vendedorNombre}|${terceroNombre}`)
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({});

  // Query para obtener datos agrupados
  const { data, isLoading, refetch, isFetching } = useQuery<ResultadoPedidosDespachos>({
    queryKey: [
      "visor-pedidos-despachos",
      fechaDesde,
      fechaHasta,
      vendedorSeleccionado,
      vendedorIds,
      vendedorIdsPermitidos,
      terceroSeleccionado,
      correriaSeleccionada,
      soloPendientes,
    ],
    queryFn: () =>
      obtenerPedidosVsDespachos({
        fecha_desde: fechaDesde,
        fecha_hasta: fechaHasta,
        vendedor_id: vendedorSeleccionado !== "todos" ? Number(vendedorSeleccionado) : undefined,
        vendedor_ids:
          vendedorIds && vendedorIds.length > 0
            ? vendedorIds
            : vendedorSeleccionado === "todos" && vendedorIdsPermitidos?.length
            ? vendedorIdsPermitidos
            : undefined,
        tercero_id: terceroSeleccionado !== "todos" ? Number(terceroSeleccionado) : undefined,
        correria_id: correriaSeleccionada !== "todas" ? Number(correriaSeleccionada) : undefined,
        solo_pendientes: soloPendientes,
      }),
  });

  // Filtro de búsqueda local por texto (Tercero, Vendedor o Producto) y filtro de cliente
  const vendedoresFiltrados = useMemo(() => {
    if (!data?.vendedores) return [];
    let list = data.vendedores;

    if (terceroSeleccionado !== "todos") {
      list = list
        .map((v) => ({
          ...v,
          terceros: v.terceros.filter((t) => Number(t.terceroId) === Number(terceroSeleccionado)),
        }))
        .filter((v) => v.terceros.length > 0);
    }

    if (busqueda.trim()) {
      const b = busqueda.trim().toLowerCase();
      list = list
        .map((v) => {
          const coincideVendedor = v.vendedorNombre.toLowerCase().includes(b);
          const tercerosFiltrados = v.terceros.filter((t) => {
            const coincideTercero =
              t.terceroNombre.toLowerCase().includes(b) ||
              (t.terceroCodigo && t.terceroCodigo.toLowerCase().includes(b));
            const coincideProducto = t.productos.some(
              (p) =>
                p.producto.toLowerCase().includes(b) ||
                (p.descripcion && p.descripcion.toLowerCase().includes(b)) ||
                (p.sku && p.sku.toLowerCase().includes(b))
            );
            return coincideTercero || coincideProducto || coincideVendedor;
          });

          if (coincideVendedor || tercerosFiltrados.length > 0) {
            return {
              ...v,
              terceros: coincideVendedor ? v.terceros : tercerosFiltrados,
            };
          }
          return null;
        })
        .filter((v): v is GrupoVendedorPedidoDespacho => v !== null);
    }

    return list;
  }, [data?.vendedores, terceroSeleccionado, busqueda]);

  // Manejo de expansión / colapso
  const toggleExpandir = (clave: string) => {
    setExpandidos((prev) => ({
      ...prev,
      [clave]: !prev[clave],
    }));
  };

  const expandirTodos = () => {
    const nuevo: Record<string, boolean> = {};
    for (const v of vendedoresFiltrados) {
      for (const t of v.terceros) {
        nuevo[`${v.vendedorNombre}|${t.terceroNombre}`] = true;
      }
    }
    setExpandidos(nuevo);
  };

  const colapsarTodos = () => {
    setExpandidos({});
  };

  // Exportar a CSV
  const exportarCSV = () => {
    if (!vendedoresFiltrados || vendedoresFiltrados.length === 0) return;

    const lineas: string[] = [];
    lineas.push(
      "Vendedor,Tercero,Codigo_Producto,Descripcion_Producto,Pedidos_Cantidad,Pedidos_Valor,Salida_Despacho_Cantidad,Salida_Despacho_Valor,Total_General_Cantidad,Total_General_Valor,Estado"
    );

    for (const v of vendedoresFiltrados) {
      for (const t of v.terceros) {
        for (const p of t.productos) {
          lineas.push(
            `"${v.vendedorNombre}","${t.terceroNombre}","${p.producto}","${p.descripcion || ""}","${p.pedidosCantidad}","${p.pedidosValor}","${p.despachosCantidad}","${p.despachosValor}","${p.totalGeneralCantidad}","${p.totalGeneralValor}","${p.esPendiente ? "PENDIENTE" : "COMPLETADO"}"`
          );
        }
        lineas.push(
          `"${v.vendedorNombre}","${t.terceroNombre} TOTAL","—","Subtotal Cliente","${t.pedidosCantidad}","${t.pedidosValor}","${t.despachosCantidad}","${t.despachosValor}","${t.totalGeneralCantidad}","${t.totalGeneralValor}","${t.esPendiente ? "PENDIENTE" : "COMPLETADO"}"`
        );
      }
      lineas.push(
        `"${v.vendedorNombre} TOTAL","—","—","Subtotal Vendedor","${v.pedidosCantidad}","${v.pedidosValor}","${v.despachosCantidad}","${v.despachosValor}","${v.totalGeneralCantidad}","${v.totalGeneralValor}","${v.esPendiente ? "PENDIENTE" : "COMPLETADO"}"`
      );
    }

    const blob = new Blob([lineas.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Pedidos_vs_Despachos_${fechaDesde}_${fechaHasta}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Datos para gráfico comparativo
  const datosGrafico = useMemo(() => {
    if (!vendedoresFiltrados) return [];
    const clientes: { nombre: string; pedidos: number; despachados: number; pendientes: number }[] = [];
    for (const v of vendedoresFiltrados) {
      for (const t of v.terceros) {
        clientes.push({
          nombre: t.terceroNombre.length > 20 ? t.terceroNombre.slice(0, 18) + "..." : t.terceroNombre,
          pedidos: t.pedidosCantidad,
          despachados: Math.abs(t.despachosCantidad),
          pendientes: Math.max(0, t.totalGeneralCantidad),
        });
      }
    }
    // Top 15 con más pedidos o pendientes
    return clientes.sort((a, b) => b.pendientes - a.pendientes || b.pedidos - a.pedidos).slice(0, 15);
  }, [vendedoresFiltrados]);

  const kpis = data?.kpis;

  return (
    <div className="space-y-4 font-sans text-xs">
      {/* 1. Barra de Ventana / Encabezado de Empresa (Estilo HGI Visor de Datos) */}
      <div className="bg-muted/40 border border-border/80 rounded-xl p-3 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2.5 pb-2.5 border-b border-border/60">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-background rounded-lg border border-border text-[11px] font-semibold text-foreground">
              <Building2 className="h-3.5 w-3.5 text-primary" />
              <span>Empresa:</span>
              <span className="font-bold text-primary">TRUCCO S FASHION S.A.S.</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-background rounded-lg border border-border text-[11px] text-muted-foreground">
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              <span>Periodo:</span>
              <span className="font-semibold text-foreground">{fechaDesde} al {fechaHasta}</span>
              <span className="text-muted-foreground/50">|</span>
              <span>Modo:</span>
              <span className="font-semibold text-foreground">PCGA</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-muted-foreground">Vista:</span>
            <div className="inline-flex rounded-lg border border-border bg-background p-0.5">
              <button
                type="button"
                onClick={() => setModoVista("datos")}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                  modoVista === "datos"
                    ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Datos
              </button>
              <button
                type="button"
                onClick={() => setModoVista("grafico")}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                  modoVista === "grafico"
                    ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Gráfico
              </button>
              <button
                type="button"
                onClick={() => setModoVista("ambos")}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                  modoVista === "ambos"
                    ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Ambos
              </button>
            </div>
          </div>
        </div>

        {/* 2. Barra de Control / Filtros de Plantilla HGI */}
        <div className="pt-2.5 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Consulta & Plantilla & Correría */}
          <div className="md:col-span-4 flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 min-w-[70px]">
              <span className="text-muted-foreground font-medium">Consulta:</span>
              <span className="font-bold text-foreground">Documentos</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 bg-background border rounded-md">
              <span className="text-muted-foreground text-[10.5px]">Plantilla:</span>
              <span className="font-bold text-primary font-mono text-[11px]">PEDIDOSVS.DESPACHOS</span>
              <Save className="h-3 w-3 text-muted-foreground ml-1" />
            </div>

            {/* Selector de Correría */}
            <div className="flex items-center gap-1 px-2 py-1 bg-background border rounded-md">
              <Layers className="h-3 w-3 text-primary shrink-0" />
              <span className="text-muted-foreground text-[10.5px]">Correría:</span>
              <select
                value={correriaSeleccionada}
                onChange={(e) => setCorreriaSeleccionada(e.target.value)}
                className="bg-transparent border-0 text-[11px] font-bold text-foreground focus:outline-hidden cursor-pointer font-mono"
              >
                <option value="todas">Todas</option>
                {(correriasData || []).map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Selector de Cliente / Comprador (Tercero) */}
            <div className="flex items-center gap-1 px-2 py-1 bg-background border rounded-md">
              <Users className="h-3 w-3 text-indigo-500 shrink-0" />
              <span className="text-muted-foreground text-[10.5px]">Cliente:</span>
              <select
                value={terceroSeleccionado}
                onChange={(e) => {
                  const val = e.target.value === "todos" ? "todos" : Number(e.target.value);
                  setTerceroSeleccionado(val);
                  if (onSelectTercero) {
                    onSelectTercero(val === "todos" ? null : val);
                  }
                }}
                className="bg-transparent border-0 text-[11px] font-bold text-foreground focus:outline-hidden cursor-pointer max-w-[190px] truncate"
                title="Filtrar por Cliente / Comprador"
              >
                <option value="todos">Todos los Clientes ({(tercerosData || []).length})</option>
                {(tercerosData || []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Rango de Fechas y Accesos Rápidos */}
          <div className="md:col-span-4 flex flex-col items-center gap-1.5 justify-center w-full">
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full justify-center">
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 bg-background border rounded-lg px-2 py-1 w-full sm:w-auto">
                <div className="flex items-center gap-1 flex-1 min-w-[120px]">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <input
                    type="date"
                    value={fechaDesde}
                    onChange={(e) => setFechaDesde(e.target.value)}
                    className="bg-transparent border-0 text-[11px] font-mono text-foreground focus:outline-hidden w-full"
                  />
                </div>
                <span className="text-muted-foreground font-semibold text-xs px-0.5">a</span>
                <div className="flex items-center gap-1 flex-1 min-w-[120px]">
                  <input
                    type="date"
                    value={fechaHasta}
                    onChange={(e) => setFechaHasta(e.target.value)}
                    className="bg-transparent border-0 text-[11px] font-mono text-foreground focus:outline-hidden w-full"
                  />
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
                className="h-8 px-2.5 shrink-0"
                title="Refrescar datos"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin text-primary" : ""}`} />
              </Button>
            </div>
            {/* Botones de Periodo Rápido */}
            <div className="flex items-center gap-1 text-[10px] flex-wrap justify-center">
              <span className="text-muted-foreground font-medium">Periodos:</span>
              <button
                type="button"
                onClick={() => { setFechaDesde("2025-01-01"); setFechaHasta("2025-12-31"); }}
                className={`px-1.5 py-0.5 rounded border transition-colors ${
                  fechaDesde === "2025-01-01" && fechaHasta === "2025-12-31"
                    ? "bg-primary text-primary-foreground border-primary font-bold"
                    : "bg-background border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                2025 (Año Macro)
              </button>
              <button
                type="button"
                onClick={() => { setFechaDesde("2025-01-01"); setFechaHasta("2025-06-30"); }}
                className={`px-1.5 py-0.5 rounded border transition-colors ${
                  fechaDesde === "2025-01-01" && fechaHasta === "2025-06-30"
                    ? "bg-primary text-primary-foreground border-primary font-bold"
                    : "bg-background border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                S1 2025
              </button>
              <button
                type="button"
                onClick={() => { setFechaDesde("2026-01-01"); setFechaHasta("2026-12-31"); }}
                className={`px-1.5 py-0.5 rounded border transition-colors ${
                  fechaDesde === "2026-01-01" && fechaHasta === "2026-12-31"
                    ? "bg-primary text-primary-foreground border-primary font-bold"
                    : "bg-background border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                2026
              </button>
              <button
                type="button"
                onClick={() => { setFechaDesde("2026-01-01"); setFechaHasta("2026-06-30"); }}
                className={`px-1.5 py-0.5 rounded border transition-colors ${
                  fechaDesde === "2026-01-01" && fechaHasta === "2026-06-30"
                    ? "bg-primary text-primary-foreground border-primary font-bold"
                    : "bg-background border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                S1 2026
              </button>
              <button
                type="button"
                onClick={() => { setFechaDesde("2026-07-01"); setFechaHasta("2026-12-31"); }}
                className={`px-1.5 py-0.5 rounded border transition-colors ${
                  fechaDesde === "2026-07-01" && fechaHasta === "2026-12-31"
                    ? "bg-primary text-primary-foreground border-primary font-bold"
                    : "bg-background border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                S2 2026
              </button>
              <button
                type="button"
                onClick={() => { setFechaDesde("2025-01-01"); setFechaHasta("2026-12-31"); }}
                className={`px-1.5 py-0.5 rounded border transition-colors ${
                  fechaDesde === "2025-01-01" && fechaHasta === "2026-12-31"
                    ? "bg-primary text-primary-foreground border-primary font-bold"
                    : "bg-background border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                Todo
              </button>
            </div>
          </div>

          {/* Opciones de Totales y Subtotales (Checkboxes HGI) */}
          <div className="md:col-span-4 flex items-center justify-end gap-3 flex-wrap text-[10.5px]">
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={mostrarSubtotalesColumna}
                onChange={(e) => setMostrarSubtotalesColumna(e.target.checked)}
                className="rounded border-border text-primary focus:ring-0"
              />
              <span>SubTotales Col.</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={mostrarTotalesColumna}
                onChange={(e) => setMostrarTotalesColumna(e.target.checked)}
                className="rounded border-border text-primary focus:ring-0"
              />
              <span>Totales Col.</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={mostrarSubtotalesFila}
                onChange={(e) => setMostrarSubtotalesFila(e.target.checked)}
                className="rounded border-border text-primary focus:ring-0"
              />
              <span>SubTotales Fila</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={mostrarTotalesFila}
                onChange={(e) => setMostrarTotalesFila(e.target.checked)}
                className="rounded border-border text-primary focus:ring-0"
              />
              <span>Totales Fila</span>
            </label>
          </div>
        </div>
      </div>

      {/* 3. Barra de Dimensiones y Métricas (Pills HGI) */}
      <div className="flex items-center justify-between gap-2 flex-wrap py-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10.5px] uppercase font-bold text-muted-foreground mr-1">Dimensiones:</span>
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-[10.5px] font-medium border text-foreground">
            <Package className="h-3 w-3 text-cyan-500" />
            <span>Producto</span>
          </div>
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-[10.5px] font-medium border text-foreground">
            <Palette className="h-3 w-3 text-pink-500" />
            <span>Color</span>
          </div>
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-[10.5px] font-medium border text-foreground">
            <Scissors className="h-3 w-3 text-purple-500" />
            <span>TallaP</span>
          </div>
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-[10.5px] font-medium border text-foreground">
            <Tag className="h-3 w-3 text-emerald-500" />
            <span>Linea</span>
          </div>
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-[10.5px] font-medium border text-foreground">
            <Layers className="h-3 w-3 text-blue-500" />
            <span>COLECCION</span>
          </div>

          <span className="text-muted-foreground/40 mx-1">|</span>

          <span className="text-[10.5px] uppercase font-bold text-muted-foreground mr-1">Métricas:</span>
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10.5px] font-bold border border-emerald-500/30">
            <Plus className="h-3 w-3" />
            <span>Cantidad</span>
          </div>
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10.5px] font-bold border border-emerald-500/30">
            <Plus className="h-3 w-3" />
            <span>Valor</span>
          </div>
        </div>

        {/* Acciones Rápidas */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={soloPendientes ? "default" : "outline"}
            size="sm"
            onClick={() => setSoloPendientes(!soloPendientes)}
            className={`h-7 text-xs font-semibold gap-1.5 ${
              soloPendientes
                ? "bg-amber-600 hover:bg-amber-700 text-white"
                : "border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>{soloPendientes ? "Mostrando Solo Pendientes" : "Filtrar Solo Pendientes"}</span>
          </Button>

          <Button variant="outline" size="sm" onClick={expandirTodos} className="h-7 text-xs">
            Expandir Todo
          </Button>
          <Button variant="outline" size="sm" onClick={colapsarTodos} className="h-7 text-xs">
            Contraer Todo
          </Button>
          <Button variant="outline" size="sm" onClick={exportarCSV} className="h-7 text-xs">
            <Download className="mr-1 h-3.5 w-3.5" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* 4. Tarjetas KPI de Resumen Ejecutivo de Despachos vs Pedidos */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
        <Card className="p-3 border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Pedidos</span>
            <Package className="h-4 w-4 text-purple-500" />
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-foreground">
            {(kpis?.totalPedidosCantidad ?? 0).toLocaleString("es-CO")} unds
          </div>
          <div className="text-[11px] text-muted-foreground font-mono truncate">
            {formatoCOPFull(kpis?.totalPedidosValor ?? 0)}
          </div>
        </Card>

        <Card className="p-3 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Salidas Despacho</span>
            <Truck className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-foreground">
            {(kpis?.totalDespachosCantidad ?? 0).toLocaleString("es-CO")} unds
          </div>
          <div className="text-[11px] text-muted-foreground font-mono truncate">
            {formatoCOPFull(kpis?.totalDespachosValor ?? 0)}
          </div>
        </Card>

        <Card className="p-3 border-l-4 border-l-amber-500 bg-amber-500/5">
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pendiente Despacho</span>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-base sm:text-lg font-extrabold font-mono text-amber-700 dark:text-amber-300">
            {(kpis?.totalPendienteCantidad ?? 0).toLocaleString("es-CO")} unds
          </div>
          <div className="text-[11px] text-amber-600/80 dark:text-amber-400/80 font-mono font-medium truncate">
            {formatoCOPFull(kpis?.totalPendienteValor ?? 0)}
          </div>
        </Card>

        <Card className="p-3 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Nivel de Servicio</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {Number(kpis?.nivelServicioPct ?? 0).toFixed(2)}%
          </div>
          <div className="text-[10px] text-muted-foreground">Unidades entregadas vs pedidas</div>
        </Card>

        <Card className="p-3 border-l-4 border-l-indigo-500 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Clientes Pendientes</span>
            <Users className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-foreground">
            {(kpis?.totalClientesConPendientes ?? 0).toLocaleString("es-CO")}
          </div>
          <div className="text-[10px] text-muted-foreground">Clientes con saldo de entrega</div>
        </Card>
      </div>

      {/* Buscador de Terceros o Productos */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente/tercero, referencia de producto o vendedor..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
        {busqueda && (
          <Button variant="ghost" size="sm" onClick={() => setBusqueda("")} className="h-9 text-xs">
            Limpiar
          </Button>
        )}
      </div>

      {/* 5. Vista de Gráfico (si 'grafico' o 'ambos' está activo) */}
      {(modoVista === "grafico" || modoVista === "ambos") && (
        <Card className="p-4">
          <CardHeader className="p-0 pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span>Top 15 Clientes: Unidades Pedidas vs. Despachadas vs. Pendientes</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Muestra los clientes con mayor volumen y su saldo pendiente de despacho en el periodo.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {datosGrafico.length === 0 ? (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground text-xs">
                No hay datos disponibles para graficar en el rango seleccionado.
              </div>
            ) : (
              <div>
                <div className="sm:hidden px-3 py-1 text-[10.5px] text-muted-foreground flex items-center justify-between">
                  <span>↔ Desliza horizontalmente para ver clientes</span>
                  <span className="font-mono">{datosGrafico.length} clientes</span>
                </div>
                <div className="overflow-x-auto w-full touch-pan">
                  <div className="h-[280px] min-w-[550px] sm:min-w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={datosGrafico} margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis
                          dataKey="nombre"
                          angle={-35}
                          textAnchor="end"
                          interval={0}
                          tick={{ fontSize: 10 }}
                          height={60}
                        />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip
                          contentStyle={{ fontSize: 11, borderRadius: 8 }}
                          formatter={(val: number) => [`${val.toLocaleString("es-CO")} unds`, ""]}
                        />
                        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                        <Bar dataKey="pedidos" name="Pedidos" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="despachados" name="Despachados" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="pendientes" name="Pendiente Despacho" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 6. Matriz Pivot Jerárquica: Visor de Datos - PEDIDOS VS. DESPACHOS */}
      {(modoVista === "datos" || modoVista === "ambos") && (
        <Card className="overflow-hidden border border-border">
          <div className="sm:hidden px-3 py-1.5 bg-muted/40 border-b border-border/60 text-[10.5px] text-muted-foreground flex items-center justify-between font-medium">
            <span>← Desliza horizontalmente para ver la matriz completa →</span>
          </div>
          <div className="overflow-x-auto touch-pan">
            {isLoading ? (
              <div className="py-16 text-center text-sm text-muted-foreground flex flex-col items-center justify-center gap-2">
                <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                <span>Cargando matriz de pedidos y salidas por despacho...</span>
              </div>
            ) : vendedoresFiltrados.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">
                No se encontraron pedidos o despachos para los filtros seleccionados.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                {/* Encabezado Doble Nivel Estilo HGI */}
                <thead>
                  {/* Nivel 1: Columnas de Dimensiones y Agrupador Transacción */}
                  <tr className="bg-muted/80 border-b border-border/80 text-[11px] font-bold text-foreground">
                    <th className="py-2.5 px-3 border-r border-border/60 min-w-[160px]">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-primary" />
                        <span>Vendedor</span>
                      </div>
                    </th>
                    <th className="py-2.5 px-3 border-r border-border/60 min-w-[200px]">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-indigo-500" />
                        <span>Tercero (Cliente)</span>
                      </div>
                    </th>
                    <th className="py-2.5 px-3 border-r border-border/80 min-w-[140px]">
                      <div className="flex items-center gap-1.5">
                        <Package className="h-3.5 w-3.5 text-cyan-500" />
                        <span>Producto</span>
                      </div>
                    </th>

                    {/* Grupo Transacción: PEDIDOS */}
                    <th
                      colSpan={2}
                      className="py-2 px-3 text-center bg-purple-500/15 text-purple-700 dark:text-purple-300 border-r border-border/80 uppercase tracking-wider font-extrabold"
                    >
                      PEDIDOS
                    </th>

                    {/* Grupo Transacción: SALIDA POR DESPACHO */}
                    <th
                      colSpan={2}
                      className="py-2 px-3 text-center bg-blue-500/15 text-blue-700 dark:text-blue-300 border-r border-border/80 uppercase tracking-wider font-extrabold"
                    >
                      SALIDA POR DESPACHO
                    </th>

                    {/* Grupo Transacción: Total General (Pendiente) */}
                    <th
                      colSpan={2}
                      className="py-2 px-3 text-center bg-amber-500/20 text-amber-800 dark:text-amber-200 uppercase tracking-wider font-extrabold"
                    >
                      Total General (Pendiente)
                    </th>
                  </tr>

                  {/* Nivel 2: Subcolumnas de Cantidad y Valor */}
                  <tr className="bg-muted/50 border-b-2 border-border text-[10.5px] font-semibold text-muted-foreground uppercase">
                    <th className="py-1.5 px-3 border-r border-border/60"></th>
                    <th className="py-1.5 px-3 border-r border-border/60"></th>
                    <th className="py-1.5 px-3 border-r border-border/80"></th>

                    {/* Subcolumnas PEDIDOS */}
                    <th className="py-1.5 px-3 text-right border-r border-border/40 font-mono">Cantidad</th>
                    <th className="py-1.5 px-3 text-right border-r border-border/80 font-mono">Valor ($)</th>

                    {/* Subcolumnas SALIDA POR DESPACHO */}
                    <th className="py-1.5 px-3 text-right border-r border-border/40 font-mono">Cantidad</th>
                    <th className="py-1.5 px-3 text-right border-r border-border/80 font-mono">Valor ($)</th>

                    {/* Subcolumnas Total General */}
                    <th className="py-1.5 px-3 text-right border-r border-border/40 font-mono font-bold text-foreground">
                      Cantidad
                    </th>
                    <th className="py-1.5 px-3 text-right font-mono font-bold text-foreground">Valor ($)</th>
                  </tr>
                </thead>

                {/* Cuerpo de la Tabla Jerárquica */}
                <tbody className="divide-y divide-border/40">
                  {vendedoresFiltrados.map((v) => (
                    <React.Fragment key={v.vendedorNombre}>
                      {/* Filas de Terceros y Productos bajo este Vendedor */}
                      {v.terceros.map((t) => {
                        const clave = `${v.vendedorNombre}|${t.terceroNombre}`;
                        const estaExpandido = expandidos[clave] ?? true; // Expandido por defecto para visibilidad inmediata

                        return (
                          <React.Fragment key={clave}>
                            {/* Productos individuales si está expandido */}
                            {estaExpandido &&
                              t.productos.map((p, idx) => (
                                <tr
                                  key={`${clave}|${p.producto}|${idx}`}
                                  className={`hover:bg-muted/20 transition-colors ${
                                    p.esPendiente ? "bg-amber-500/5 dark:bg-amber-500/10" : ""
                                  }`}
                                >
                                  {/* Columna Vendedor: se muestra solo en la primera fila o espacio en blanco */}
                                  <td className="py-1.5 px-3 border-r border-border/40 font-medium text-muted-foreground whitespace-nowrap">
                                    {idx === 0 ? v.vendedorNombre : ""}
                                  </td>

                                  {/* Columna Tercero con Botón de Colapso */}
                                  <td className="py-1.5 px-3 border-r border-border/40 font-medium text-foreground whitespace-nowrap">
                                    {idx === 0 ? (
                                      <div className="flex items-center gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => toggleExpandir(clave)}
                                          className="p-0.5 rounded hover:bg-muted text-muted-foreground"
                                          title={estaExpandido ? "Contraer productos" : "Expandir productos"}
                                        >
                                          {estaExpandido ? (
                                            <ChevronDown className="h-3.5 w-3.5 text-primary" />
                                          ) : (
                                            <ChevronRight className="h-3.5 w-3.5" />
                                          )}
                                        </button>
                                        <span className="font-semibold">{t.terceroNombre}</span>
                                      </div>
                                    ) : (
                                      ""
                                    )}
                                  </td>

                                  {/* Columna Producto (Código y descripción) */}
                                  <td className="py-1.5 px-3 border-r border-border/80 font-mono text-foreground">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-semibold text-primary">{p.producto}</span>
                                      {p.descripcion && (
                                        <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                                          ({p.descripcion})
                                        </span>
                                      )}
                                    </div>
                                  </td>

                                  {/* Pedidos */}
                                  <td className="py-1.5 px-3 text-right font-mono border-r border-border/40">
                                    {p.pedidosCantidad > 0 ? p.pedidosCantidad.toLocaleString("es-CO") : "0"}
                                  </td>
                                  <td className="py-1.5 px-3 text-right font-mono border-r border-border/80">
                                    {p.pedidosValor > 0 ? formatoHGI(p.pedidosValor) : "0.00"}
                                  </td>

                                  {/* Salidas por Despacho (en negativo como en la imagen) */}
                                  <td className="py-1.5 px-3 text-right font-mono border-r border-border/40 text-blue-600 dark:text-blue-400">
                                    {p.despachosCantidad !== 0 ? p.despachosCantidad.toLocaleString("es-CO") : ""}
                                  </td>
                                  <td className="py-1.5 px-3 text-right font-mono border-r border-border/80 text-blue-600 dark:text-blue-400">
                                    {p.despachosValor !== 0 ? formatoHGI(p.despachosValor) : ""}
                                  </td>

                                  {/* Total General (Pendiente) */}
                                  <td
                                    className={`py-1.5 px-3 text-right font-mono font-bold border-r border-border/40 ${
                                      p.esPendiente
                                        ? "text-amber-700 dark:text-amber-400 bg-amber-500/10"
                                        : "text-muted-foreground"
                                    }`}
                                  >
                                    <div className="flex items-center justify-end gap-1">
                                      <span>{p.totalGeneralCantidad.toLocaleString("es-CO")}</span>
                                      {p.esPendiente && (
                                        <span className="text-[9px] px-1 py-0 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/30">
                                          Pend
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td
                                    className={`py-1.5 px-3 text-right font-mono font-bold ${
                                      p.esPendiente
                                        ? "text-amber-700 dark:text-amber-400 bg-amber-500/10"
                                        : "text-muted-foreground"
                                    }`}
                                  >
                                    {formatoHGI(p.totalGeneralValor)}
                                  </td>
                                </tr>
                              ))}

                            {/* Fila de Subtotal por Tercero (como 'AME DISEÑOS S.A.S. Total' en la imagen) */}
                            {mostrarSubtotalesColumna && (
                              <tr
                                className={`border-b border-border/80 font-semibold ${
                                  t.esPendiente ? "bg-amber-500/15 dark:bg-amber-500/20" : "bg-muted/40"
                                }`}
                              >
                                <td className="py-2 px-3 border-r border-border/40 text-muted-foreground">
                                  {!estaExpandido ? v.vendedorNombre : ""}
                                </td>
                                <td className="py-2 px-3 border-r border-border/40 text-foreground" colSpan={2}>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                      {!estaExpandido && (
                                        <button
                                          type="button"
                                          onClick={() => toggleExpandir(clave)}
                                          className="p-0.5 rounded hover:bg-muted text-muted-foreground"
                                        >
                                          <ChevronRight className="h-3.5 w-3.5" />
                                        </button>
                                      )}
                                      <span className="font-bold">{t.terceroNombre} Total</span>
                                    </div>
                                    <span className="text-[10px] text-muted-foreground font-normal">
                                      ({t.productos.length} {t.productos.length === 1 ? "ítem" : "ítems"})
                                    </span>
                                  </div>
                                </td>

                                {/* Subtotales Pedidos */}
                                <td className="py-2 px-3 text-right font-mono font-bold text-purple-700 dark:text-purple-300 border-r border-border/40">
                                  {t.pedidosCantidad.toLocaleString("es-CO")}
                                </td>
                                <td className="py-2 px-3 text-right font-mono font-bold text-purple-700 dark:text-purple-300 border-r border-border/80">
                                  {formatoHGI(t.pedidosValor)}
                                </td>

                                {/* Subtotales Salidas */}
                                <td className="py-2 px-3 text-right font-mono font-bold text-blue-700 dark:text-blue-300 border-r border-border/40">
                                  {t.despachosCantidad !== 0 ? t.despachosCantidad.toLocaleString("es-CO") : ""}
                                </td>
                                <td className="py-2 px-3 text-right font-mono font-bold text-blue-700 dark:text-blue-300 border-r border-border/80">
                                  {t.despachosValor !== 0 ? formatoHGI(t.despachosValor) : ""}
                                </td>

                                {/* Subtotales Total General */}
                                <td
                                  className={`py-2 px-3 text-right font-mono font-extrabold border-r border-border/40 ${
                                    t.esPendiente
                                      ? "text-amber-800 dark:text-amber-200 bg-amber-500/25"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  {t.totalGeneralCantidad.toLocaleString("es-CO")}
                                </td>
                                <td
                                  className={`py-2 px-3 text-right font-mono font-extrabold ${
                                    t.esPendiente
                                      ? "text-amber-800 dark:text-amber-200 bg-amber-500/25"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  {formatoHGI(t.totalGeneralValor)}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}

                      {/* Subtotal del Vendedor si hay más de 1 vendedor o para separar grupos */}
                      {mostrarSubtotalesFila && (
                        <tr className="bg-muted/70 border-b-2 border-border font-bold text-[11.5px]">
                          <td className="py-2.5 px-3 border-r border-border/60 text-primary" colSpan={3}>
                            <div className="flex items-center gap-1.5">
                              <User className="h-4 w-4" />
                              <span>SUBTOTAL ASESOR: {v.vendedorNombre}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono border-r border-border/40 text-purple-700 dark:text-purple-300">
                            {v.pedidosCantidad.toLocaleString("es-CO")}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono border-r border-border/80 text-purple-700 dark:text-purple-300">
                            {formatoHGI(v.pedidosValor)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono border-r border-border/40 text-blue-700 dark:text-blue-300">
                            {v.despachosCantidad !== 0 ? v.despachosCantidad.toLocaleString("es-CO") : ""}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono border-r border-border/80 text-blue-700 dark:text-blue-300">
                            {v.despachosValor !== 0 ? formatoHGI(v.despachosValor) : ""}
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right font-mono border-r border-border/40 ${
                              v.esPendiente
                                ? "text-amber-800 dark:text-amber-200 bg-amber-500/20"
                                : "text-muted-foreground"
                            }`}
                          >
                            {v.totalGeneralCantidad.toLocaleString("es-CO")}
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right font-mono ${
                              v.esPendiente
                                ? "text-amber-800 dark:text-amber-200 bg-amber-500/20"
                                : "text-muted-foreground"
                            }`}
                          >
                            {formatoHGI(v.totalGeneralValor)}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>

                {/* Totales Generales de la Fila (Pie de tabla) */}
                {mostrarTotalesFila && kpis && (
                  <tfoot>
                    <tr className="bg-primary/10 border-t-2 border-primary/40 font-extrabold text-xs text-foreground">
                      <td className="py-3 px-3 border-r border-border" colSpan={3}>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                          <span>TOTAL GENERAL CONSOLIDADO</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-purple-700 dark:text-purple-300 border-r border-border/40">
                        {kpis.totalPedidosCantidad.toLocaleString("es-CO")}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-purple-700 dark:text-purple-300 border-r border-border">
                        {formatoHGI(kpis.totalPedidosValor)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-blue-700 dark:text-blue-300 border-r border-border/40">
                        {(-kpis.totalDespachosCantidad).toLocaleString("es-CO")}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-blue-700 dark:text-blue-300 border-r border-border">
                        {formatoHGI(-kpis.totalDespachosValor)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-amber-700 dark:text-amber-300 bg-amber-500/20 border-r border-border/40">
                        {kpis.totalPendienteCantidad.toLocaleString("es-CO")}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-amber-700 dark:text-amber-300 bg-amber-500/20">
                        {formatoHGI(kpis.totalPendienteValor)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
export default VisorPedidosDespachos;
