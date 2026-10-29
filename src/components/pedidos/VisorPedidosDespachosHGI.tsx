import React, { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  obtenerDatosPedidosDespachos,
  obtenerMetadataPedidosDespachos,
  obtenerMetadataPedidosDespachosAsync,
  estructurarPedidosDespachosHGI,
  type RegistroPedidosDespachosHGI,
  type MetadataCargaPedidosDespachos,
  type GrupoVendedorHGI,
  type GrupoTerceroHGI,
} from "@/lib/pedidos-despachos-storage";
import { supabase } from "@/integrations/supabase/client";
import { cn, formatoHGI, formatoCOPFull } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Download,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  BarChart3,
  Package,
  Truck,
  User,
  Users,
  Building2,
  MapPin,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  X,
  UploadCloud,
  FileCheck2,
  Ban,
  Boxes,
  Calendar,
  Save,
  Palette,
  Scissors,
  Plus,
  Clock,
  Tag,
  Layers,
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

interface VisorPedidosDespachosHGIProps {
  onAbrirCarga?: () => void;
  vendedorIdFiltro?: string | number | "todos";
  terceroIdFiltro?: string | number | "todos";
  vendedorIdsPermitidos?: number[];
  esAdmin?: boolean;
  anioGlobal?: string;
  mesGlobal?: string;
  fechaDesdeGlobal?: string;
  fechaHastaGlobal?: string;
}

export function VisorPedidosDespachosHGI({
  onAbrirCarga,
  vendedorIdFiltro = "todos",
  terceroIdFiltro = "todos",
  vendedorIdsPermitidos,
  esAdmin = false,
  anioGlobal,
  mesGlobal,
  fechaDesdeGlobal,
  fechaHastaGlobal,
}: VisorPedidosDespachosHGIProps) {
  const [modoVista, setModoVista] = useState<"datos" | "grafico" | "ambos">("datos");
  const [soloPendientes, setSoloPendientes] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [vendedorSeleccionado, setVendedorSeleccionado] = useState<string>("todos");
  const [terceroSeleccionado, setTerceroSeleccionado] = useState<string>("todos");
  const [ciudadSeleccionada, setCiudadSeleccionada] = useState<string>("todas");
  const [vistaMovil, setVistaMovil] = useState<"tarjetas" | "tabla">("tarjetas");
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({});

  // Fechas estilo visor HGI
  const [fechaDesde, setFechaDesde] = useState(() => {
    if (fechaDesdeGlobal) return fechaDesdeGlobal;
    const ahora = new Date();
    const y = anioGlobal ? parseInt(anioGlobal, 10) || ahora.getFullYear() : ahora.getFullYear();
    const m = mesGlobal && mesGlobal !== "todos" ? String(parseInt(mesGlobal, 10)).padStart(2, "0") : String(ahora.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}-01`;
  });

  const [fechaHasta, setFechaHasta] = useState(() => {
    if (fechaHastaGlobal) return fechaHastaGlobal;
    const ahora = new Date();
    const y = anioGlobal ? parseInt(anioGlobal, 10) || ahora.getFullYear() : ahora.getFullYear();
    const m = mesGlobal && mesGlobal !== "todos" ? parseInt(mesGlobal, 10) : ahora.getMonth() + 1;
    const ultimoDia = new Date(y, m, 0).getDate();
    return `${y}-${String(m).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`;
  });

  // Opciones de configuración de tabla estilo visor HGI
  const [mostrarSubtotalesColumna, setMostrarSubtotalesColumna] = useState(true);
  const [mostrarTotalesColumna, setMostrarTotalesColumna] = useState(true);
  const [mostrarSubtotalesFila, setMostrarSubtotalesFila] = useState(true);
  const [mostrarTotalesFila, setMostrarTotalesFila] = useState(true);

  // Cargar catálogo de vendedores de dim_vendedor para mapear IDs si es necesario
  const { data: dimVendedores } = useQuery<{ id: number; nombre: string }[]>({
    queryKey: ["visor-hgi-dim-vendedores"],
    queryFn: async () => {
      const { data } = await supabase
        .from("dim_vendedor")
        .select("id, nombre")
        .not("nombre", "is", null);
      return (data || []).map((v) => ({ id: Number(v.id), nombre: String(v.nombre) }));
    },
    staleTime: 1000 * 60 * 30,
  });

  // Sincronizar vendedor seleccionado si el usuario es un vendedor específico
  useEffect(() => {
    if (vendedorIdFiltro && vendedorIdFiltro !== "todos") {
      if (typeof vendedorIdFiltro === "number" && dimVendedores) {
        const match = dimVendedores.find((v) => v.id === vendedorIdFiltro);
        if (match) {
          setVendedorSeleccionado(match.nombre);
          return;
        }
      }
      setVendedorSeleccionado(String(vendedorIdFiltro));
    } else {
      setVendedorSeleccionado("todos");
    }
  }, [vendedorIdFiltro, dimVendedores]);

  // Cargar datos oficiales persistidos directamente desde SUPABASE
  const {
    data: registros = [],
    isLoading,
    refetch,
    isFetching,
  } = useQuery<RegistroPedidosDespachosHGI[]>({
    queryKey: ["pedidos-despachos-hgi-data"],
    queryFn: async () => {
      const data = await obtenerDatosPedidosDespachos();
      return data || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  // Cargar metadata de la carga
  const { data: metadataAsync } = useQuery<MetadataCargaPedidosDespachos | null>({
    queryKey: ["pedidos-despachos-metadata"],
    queryFn: () => obtenerMetadataPedidosDespachosAsync(),
    staleTime: 1000 * 60 * 5,
  });

  const metadata = metadataAsync || obtenerMetadataPedidosDespachos();

  // Estructurar con filtros
  const agrupado = useMemo(() => {
    return estructurarPedidosDespachosHGI(registros, {
      vendedor: vendedorSeleccionado,
      tercero: terceroSeleccionado,
      ciudad: ciudadSeleccionada,
      busqueda,
      soloPendientes,
      fechaDesde,
      fechaHasta,
    });
  }, [
    registros,
    vendedorSeleccionado,
    terceroSeleccionado,
    ciudadSeleccionada,
    busqueda,
    soloPendientes,
    fechaDesde,
    fechaHasta,
  ]);

  const { vendedores, kpis, catalogos } = agrupado;

  // Estadísticas de búsqueda
  const estadisticasBusqueda = useMemo(() => {
    let totalTerceros = 0;
    let totalItems = 0;
    for (const v of vendedores) {
      totalTerceros += v.terceros.length;
      for (const t of v.terceros) {
        totalItems += t.items.length;
      }
    }
    return { totalTerceros, totalItems };
  }, [vendedores]);

  // Manejo de expansión / colapso
  const toggleExpandir = (clave: string) => {
    setExpandidos((prev) => ({
      ...prev,
      [clave]: !prev[clave],
    }));
  };

  const expandirTodos = () => {
    const nuevo: Record<string, boolean> = {};
    for (const v of vendedores) {
      for (const t of v.terceros) {
        nuevo[`${v.vendedor}|${t.tercero}|${t.nombre}`] = true;
      }
    }
    setExpandidos(nuevo);
  };

  const colapsarTodos = () => {
    setExpandidos({});
  };

  // Exportar a CSV
  const exportarCSV = () => {
    if (!vendedores || vendedores.length === 0) return;
    const encabezados = [
      "Vendedor",
      "NIT / Tercero",
      "Cliente",
      "Ciudad",
      "Documento",
      "Fecha",
      "Vence",
      "Referencia",
      "Descripcion",
      "Talla",
      "Color",
      "Anterior",
      "Pedido Mes",
      "Total Pedido",
      "Despachado",
      "Cancelado",
      "Saldo Pedido",
      "Saldo Inv",
      "Estado",
    ];

    const filas: string[][] = [];

    for (const v of vendedores) {
      for (const t of v.terceros) {
        for (const it of t.items) {
          filas.push([
            v.vendedor,
            t.tercero,
            t.nombre,
            t.ciudad,
            it.documento,
            it.fechas,
            it.vence,
            it.producto,
            it.descripcion,
            it.talla,
            it.color,
            String(it.anterior),
            String(it.pedidoMes),
            String(it.totalPedido),
            String(it.despachado),
            String(it.cancelado),
            String(it.saldoPedido),
            String(it.saldoInv),
            it.esPendiente ? "Pendiente" : "Completado",
          ]);
        }
      }
    }

    const contenido = [
      encabezados.join(";"),
      ...filas.map((f) => f.map((c) => `"${String(c || "").replace(/"/g, '""')}"`).join(";")),
    ].join("\r\n");

    const blob = new Blob(["\uFEFF" + contenido], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Pedidos_vs_Despachos_HGI_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Datos para el gráfico Top 15 clientes
  const datosGrafico = useMemo(() => {
    const list: {
      nombre: string;
      pedidos: number;
      despachados: number;
      pendientes: number;
    }[] = [];

    for (const v of vendedores) {
      for (const t of v.terceros) {
        list.push({
          nombre: t.nombre.length > 18 ? `${t.nombre.slice(0, 16)}...` : t.nombre,
          pedidos: t.totalPedido,
          despachados: t.despachado,
          pendientes: t.saldoPedido,
        });
      }
    }

    return list.sort((a, b) => b.pendientes - a.pendientes || b.pedidos - a.pedidos).slice(0, 15);
  }, [vendedores]);

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
              <span className="font-semibold text-foreground">HGI OFICIAL</span>
            </div>

            {metadata && (
              <Badge variant="outline" className="text-[11px] font-mono py-1 px-2.5 border-teal-500/30 bg-teal-500/5 text-teal-700 dark:text-teal-300">
                {metadata.nombreArchivo} • {metadata.totalRegistros.toLocaleString("es-CO")} registros
              </Badge>
            )}
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
          {/* Consulta & Plantilla & Asesor & Cliente */}
          <div className="md:col-span-5 flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 min-w-[70px]">
              <span className="text-muted-foreground font-medium">Consulta:</span>
              <span className="font-bold text-foreground">Documentos</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 bg-background border rounded-md">
              <span className="text-muted-foreground text-[10.5px]">Plantilla:</span>
              <span className="font-bold text-primary font-mono text-[11px]">PEDIDOSVS.DESPACHOS</span>
              <Save className="h-3 w-3 text-muted-foreground ml-1" />
            </div>

            {/* Selector de Asesor Comercial */}
            {esAdmin ? (
              <div className="flex items-center gap-1 px-2 py-1 bg-background border rounded-md">
                <User className="h-3 w-3 text-primary shrink-0" />
                <span className="text-muted-foreground text-[10.5px]">Asesor:</span>
                <select
                  value={vendedorSeleccionado}
                  onChange={(e) => setVendedorSeleccionado(e.target.value)}
                  className="bg-transparent border-0 text-[11px] font-bold text-foreground focus:outline-hidden cursor-pointer max-w-[170px] truncate"
                >
                  <option value="todos">Todos los Asesores ({catalogos.vendedores.length})</option>
                  {catalogos.vendedores.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-1 px-2 py-1 bg-background border rounded-md text-[11px]">
                <User className="h-3 w-3 text-primary shrink-0" />
                <span className="text-muted-foreground text-[10.5px]">Asesor:</span>
                <span className="font-bold text-foreground truncate max-w-[170px]">
                  {vendedorSeleccionado !== "todos" ? vendedorSeleccionado : "Mi Cartera"}
                </span>
              </div>
            )}

            {/* Selector de Cliente / Comprador (Tercero) */}
            <div className="flex items-center gap-1 px-2 py-1 bg-background border rounded-md">
              <Users className="h-3 w-3 text-indigo-500 shrink-0" />
              <span className="text-muted-foreground text-[10.5px]">Cliente:</span>
              <select
                value={terceroSeleccionado}
                onChange={(e) => setTerceroSeleccionado(e.target.value)}
                className="bg-transparent border-0 text-[11px] font-bold text-foreground focus:outline-hidden cursor-pointer max-w-[190px] truncate"
              >
                <option value="todos">Todos los Clientes ({catalogos.clientes.length})</option>
                {catalogos.clientes.map((c) => (
                  <option key={c.tercero} value={c.tercero}>
                    {c.nombre} ({c.tercero})
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
                title="Refrescar datos oficiales"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin text-primary" : ""}`} />
              </Button>
            </div>

            {/* Botones de Periodo Rápido */}
            <div className="flex items-center gap-1 text-[10px] flex-wrap justify-center">
              <span className="text-muted-foreground font-medium">Periodos:</span>
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  const y = now.getFullYear();
                  const m = String(now.getMonth() + 1).padStart(2, "0");
                  const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
                  setFechaDesde(`${y}-${m}-01`);
                  setFechaHasta(`${y}-${m}-${String(lastDay).padStart(2, "0")}`);
                }}
                className={`px-1.5 py-0.5 rounded border transition-colors ${
                  (() => {
                    const now = new Date();
                    const y = now.getFullYear();
                    const m = String(now.getMonth() + 1).padStart(2, "0");
                    const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
                    return (
                      fechaDesde === `${y}-${m}-01` &&
                      fechaHasta === `${y}-${m}-${String(lastDay).padStart(2, "0")}`
                    );
                  })()
                    ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                    : "bg-background border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                Mes Actual
              </button>
              <button
                type="button"
                onClick={() => { setFechaDesde("2025-01-01"); setFechaHasta("2025-12-31"); }}
                className={`px-1.5 py-0.5 rounded border transition-colors ${
                  fechaDesde === "2025-01-01" && fechaHasta === "2025-12-31"
                    ? "bg-primary text-primary-foreground border-primary font-bold"
                    : "bg-background border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                2025
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
          <div className="md:col-span-3 flex items-center justify-end gap-3 flex-wrap text-[10.5px]">
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
            <span>Saldo Unds</span>
          </div>
        </div>

        {/* Acciones Rápidas: Solo Pendientes vs Histórico */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center p-0.5 rounded-lg border border-border/80 bg-muted/40 shadow-2xs">
            <button
              type="button"
              onClick={() => setSoloPendientes(true)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer",
                soloPendientes
                  ? "bg-amber-600 text-white shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Solo Pendientes</span>
              {kpis.totalSaldoPedido > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 text-white font-mono">
                  {kpis.totalSaldoPedido.toLocaleString("es-CO")}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setSoloPendientes(false)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer",
                !soloPendientes
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Ver Todo (Histórico)</span>
            </button>
          </div>

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
            {kpis.totalPedidos.toLocaleString("es-CO")} unds
          </div>
          <div className="text-[11px] text-muted-foreground font-mono truncate">
            Ant: {kpis.totalAnterior.toLocaleString("es-CO")} • Mes: {kpis.totalPedidoMes.toLocaleString("es-CO")}
          </div>
        </Card>

        <Card className="p-3 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Salidas Despacho</span>
            <Truck className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-foreground">
            {kpis.totalDespachado.toLocaleString("es-CO")} unds
          </div>
          <div className="text-[11px] text-muted-foreground font-mono truncate">
            Cancelados: {kpis.totalCancelado.toLocaleString("es-CO")} unds
          </div>
        </Card>

        <Card className="p-3 border-l-4 border-l-amber-500 bg-amber-500/5">
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pendiente Despacho</span>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-base sm:text-lg font-extrabold font-mono text-amber-700 dark:text-amber-300">
            {kpis.totalSaldoPedido.toLocaleString("es-CO")} unds
          </div>
          <div className="text-[11px] text-amber-600/80 dark:text-amber-400/80 font-mono font-medium truncate">
            Stock Bodega: {kpis.totalSaldoInv.toLocaleString("es-CO")} unds
          </div>
        </Card>

        <Card className="p-3 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Nivel de Servicio</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {Number(kpis.nivelServicioPct || 0).toFixed(2)}%
          </div>
          <div className="text-[10px] text-muted-foreground">Unidades entregadas vs pedidas</div>
        </Card>

        <Card className="p-3 border-l-4 border-l-indigo-500 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Clientes Pendientes</span>
            <Users className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-foreground">
            {kpis.clientesConPendientesCount} <span className="text-xs font-normal text-muted-foreground">/ {kpis.clientesCount}</span>
          </div>
          <div className="text-[10px] text-muted-foreground">Clientes con saldo de entrega</div>
        </Card>
      </div>

      {/* 5. Buscador Multi-criterio */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por vendedor, cliente, NIT, ciudad, documento, referencia, descripción o talla..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-8 text-xs font-medium"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda("")}
              className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {busqueda && (
          <Badge variant="outline" className="text-xs font-mono h-8 px-3 shrink-0">
            {estadisticasBusqueda.totalTerceros} clientes • {estadisticasBusqueda.totalItems} referencias
          </Badge>
        )}
      </div>

      {/* 6. Vista de Gráfico (si está activo) */}
      {(modoVista === "grafico" || modoVista === "ambos") && (
        <Card className="p-4">
          <CardHeader className="p-0 pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span>Top 15 Clientes: Pedidos vs. Despachados vs. Saldo Pendiente</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Muestra los clientes con mayor volumen y su saldo pendiente de despacho.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {datosGrafico.length === 0 ? (
              <div className="h-[240px] flex items-center justify-center text-muted-foreground text-xs">
                No hay datos disponibles para graficar con los filtros aplicados.
              </div>
            ) : (
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={datosGrafico} margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="nombre" angle={-35} textAnchor="end" interval={0} tick={{ fontSize: 10 }} height={60} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(val: number) => [`${val.toLocaleString("es-CO")} unds`, ""]} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                    <Bar dataKey="pedidos" name="Pedidos" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="despachados" name="Despachados" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="pendientes" name="Saldo Pendiente" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 7. Matriz Pivot Jerárquica: Visor de Datos Estilo HGI */}
      {(modoVista === "datos" || modoVista === "ambos") && (
        <Card className="overflow-hidden border border-border">
          {/* Selector móvil de vista */}
          <div className="sm:hidden px-3 py-2 bg-muted/40 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-1 bg-background p-0.5 rounded-lg border border-border text-xs">
              <button
                type="button"
                onClick={() => setVistaMovil("tarjetas")}
                className={cn("px-2.5 py-1 rounded-md text-[11px] font-bold", vistaMovil === "tarjetas" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
              >
                Tarjetas
              </button>
              <button
                type="button"
                onClick={() => setVistaMovil("tabla")}
                className={cn("px-2.5 py-1 rounded-md text-[11px] font-bold", vistaMovil === "tabla" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
              >
                Tabla
              </button>
            </div>
            <span className="text-[11px] font-mono text-muted-foreground">{vendedores.length} asesores</span>
          </div>

          {/* VISTA MÓVIL: TARJETAS */}
          {vistaMovil === "tarjetas" && (
            <div className="sm:hidden divide-y divide-border/60">
              {vendedores.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No hay pedidos que coincidan con los filtros seleccionados.
                </div>
              ) : (
                vendedores.map((v) => (
                  <div key={v.vendedor} className="p-3 space-y-3">
                    <div className="flex items-center justify-between bg-muted/30 p-2 rounded-lg border border-border/60">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-primary" />
                        <span className="font-bold text-xs">{v.vendedor}</span>
                      </div>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        Pend: {v.saldoPedido} unds
                      </Badge>
                    </div>

                    <div className="space-y-2 pl-1">
                      {v.terceros.map((t) => {
                        const clave = `${v.vendedor}|${t.tercero}|${t.nombre}`;
                        const expandido = Boolean(expandidos[clave]);
                        return (
                          <div key={clave} className="border border-border/80 rounded-lg p-2.5 bg-card">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="font-bold text-xs text-foreground">{t.nombre}</span>
                                <div className="text-[10px] text-muted-foreground font-mono">
                                  NIT: {t.tercero} • {t.ciudad}
                                </div>
                              </div>
                              {t.esPendiente ? (
                                <Badge variant="outline" className="text-[9px] bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30">
                                  Pendiente
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[9px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                                  Listo
                                </Badge>
                              )}
                            </div>

                            <div className="grid grid-cols-4 gap-1 text-[10px] font-mono text-center pt-2 mt-2 border-t border-border/40">
                              <div className="bg-muted/30 p-1 rounded">
                                <span className="text-[8.5px] text-muted-foreground block">PEDIDOS</span>
                                <span className="font-bold">{t.totalPedido}</span>
                              </div>
                              <div className="bg-blue-500/10 p-1 rounded text-blue-700 dark:text-blue-300">
                                <span className="text-[8.5px] block">DESP</span>
                                <span className="font-bold">{t.despachado}</span>
                              </div>
                              <div className="bg-amber-500/10 p-1 rounded text-amber-700 dark:text-amber-300">
                                <span className="text-[8.5px] block">SALDO</span>
                                <span className="font-bold">{t.saldoPedido}</span>
                              </div>
                              <div className="bg-muted/30 p-1 rounded">
                                <span className="text-[8.5px] text-muted-foreground block">STOCK</span>
                                <span className="font-bold">{t.saldoInv}</span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => toggleExpandir(clave)}
                              className="w-full mt-2 text-[10.5px] text-primary flex items-center justify-between p-1 rounded bg-primary/5 hover:bg-primary/10"
                            >
                              <span>{expandido ? "Ocultar items" : `Ver ${t.items.length} items`}</span>
                              {expandido ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                            </button>

                            {expandido && (
                              <div className="mt-2 divide-y divide-border/40 space-y-1.5 pt-1">
                                {t.items.map((it, idx) => (
                                  <div key={it.id || idx} className="text-[10px] pt-1.5 first:pt-0">
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-primary">{it.producto}</span>
                                      <span className="font-mono text-muted-foreground">Doc: {it.documento}</span>
                                    </div>
                                    <p className="text-muted-foreground text-[9.5px] truncate">{it.descripcion}</p>
                                    <div className="flex items-center justify-between font-mono text-[9px] mt-0.5 text-muted-foreground">
                                      <span>T:{it.talla} C:{it.color}</span>
                                      <span>Ped:{it.totalPedido}</span>
                                      <span>Desp:{it.despachado}</span>
                                      <span className={cn("font-bold", it.saldoPedido > 0 ? "text-amber-600 dark:text-amber-400" : "")}>
                                        Saldo:{it.saldoPedido}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* VISTA TABLA CLÁSICA ESCRITORIO */}
          <div className={`overflow-x-auto touch-pan ${vistaMovil === "tabla" ? "block" : "hidden sm:block"}`}>
            {isLoading ? (
              <div className="py-16 text-center text-sm text-muted-foreground flex flex-col items-center justify-center gap-2">
                <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                <span>Cargando matriz oficial de pedidos vs. despachos desde Supabase...</span>
              </div>
            ) : vendedores.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">
                No se encontraron pedidos ni despachos para los filtros seleccionados.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                {/* Encabezados Dobles estilo HGI */}
                <thead>
                  <tr className="bg-muted/80 border-b border-border/80 text-[11px] font-bold text-foreground">
                    <th className="py-2.5 px-3 border-r border-border/60 min-w-[150px]">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-primary" />
                        <span>Vendedor</span>
                      </div>
                    </th>
                    <th className="py-2.5 px-3 border-r border-border/60 min-w-[200px]">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-indigo-500" />
                        <span>Cliente (Tercero)</span>
                      </div>
                    </th>
                    <th className="py-2.5 px-2 border-r border-border/60 min-w-[90px]">Ciudad</th>
                    <th className="py-2.5 px-2 border-r border-border/60 min-w-[80px]">Doc</th>
                    <th className="py-2.5 px-3 border-r border-border/80 min-w-[140px]">
                      <div className="flex items-center gap-1.5">
                        <Package className="h-3.5 w-3.5 text-cyan-500" />
                        <span>Producto / Ref</span>
                      </div>
                    </th>
                    <th className="py-2.5 px-2 border-r border-border/80 min-w-[70px]">Talla / Col</th>

                    {/* Grupo PEDIDOS */}
                    <th colSpan={3} className="py-2 px-2 text-center bg-purple-500/15 text-purple-700 dark:text-purple-300 border-r border-border/80 uppercase font-extrabold text-[10.5px]">
                      PEDIDOS
                    </th>

                    {/* Grupo DESPACHADO */}
                    <th className="py-2 px-3 text-center bg-blue-500/15 text-blue-700 dark:text-blue-300 border-r border-border/80 uppercase font-extrabold text-[10.5px]">
                      DESPACHADO
                    </th>

                    {/* Grupo CANCELADO */}
                    <th className="py-2 px-2 text-center bg-rose-500/15 text-rose-700 dark:text-rose-300 border-r border-border/80 uppercase font-extrabold text-[10.5px]">
                      CANCELADO
                    </th>

                    {/* Grupo SALDO PEDIDO (PENDIENTE) */}
                    <th className="py-2 px-3 text-center bg-amber-500/20 text-amber-800 dark:text-amber-200 border-r border-border/80 uppercase font-extrabold text-[10.5px]">
                      SALDO PEDIDO (PENDIENTE)
                    </th>

                    {/* Grupo SALDO INV */}
                    <th className="py-2 px-2 text-center bg-slate-500/15 text-slate-700 dark:text-slate-300 uppercase font-extrabold text-[10.5px]">
                      SALDO INV
                    </th>
                  </tr>

                  {/* Sub-encabezados */}
                  <tr className="bg-muted/50 border-b-2 border-border text-[10px] font-semibold text-muted-foreground uppercase">
                    <th className="py-1.5 px-3 border-r border-border/60"></th>
                    <th className="py-1.5 px-3 border-r border-border/60"></th>
                    <th className="py-1.5 px-2 border-r border-border/60"></th>
                    <th className="py-1.5 px-2 border-r border-border/60"></th>
                    <th className="py-1.5 px-3 border-r border-border/80"></th>
                    <th className="py-1.5 px-2 border-r border-border/80"></th>
                    <th className="py-1.5 px-2 text-right border-r border-border/40">Anterior</th>
                    <th className="py-1.5 px-2 text-right border-r border-border/40">Pedido Mes</th>
                    <th className="py-1.5 px-2 text-right border-r border-border/80 font-bold">Total Ped</th>
                    <th className="py-1.5 px-3 text-right border-r border-border/80 font-bold">Cantidad</th>
                    <th className="py-1.5 px-2 text-right border-r border-border/80">Cantidad</th>
                    <th className="py-1.5 px-3 text-right border-r border-border/80 font-bold text-amber-800 dark:text-amber-200">Saldo Unds</th>
                    <th className="py-1.5 px-2 text-right">Stock</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border/40 font-mono text-[11px]">
                  {vendedores.map((v) => (
                    <React.Fragment key={v.vendedor}>
                      {/* FILA DE VENDEDOR (ENCABEZADO DE GRUPO) */}
                      <tr className="bg-muted/70 font-bold border-t-2 border-border/80 text-foreground">
                        <td colSpan={6} className="py-2 px-3 border-r border-border/60 font-sans">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-primary" />
                            <span className="text-xs uppercase tracking-wide">{v.vendedor}</span>
                            <Badge variant="outline" className="text-[10px] font-mono py-0 px-1.5">
                              {v.terceros.length} {v.terceros.length === 1 ? "cliente" : "clientes"}
                            </Badge>
                          </div>
                        </td>
                        <td className="py-2 px-2 text-right border-r border-border/40">{v.anterior.toLocaleString("es-CO")}</td>
                        <td className="py-2 px-2 text-right border-r border-border/40 text-purple-600 dark:text-purple-400 font-bold">{v.pedidoMes.toLocaleString("es-CO")}</td>
                        <td className="py-2 px-2 text-right border-r border-border/80 font-bold">{v.totalPedido.toLocaleString("es-CO")}</td>
                        <td className="py-2 px-3 text-right border-r border-border/80 text-blue-600 dark:text-blue-400 font-bold">{v.despachado.toLocaleString("es-CO")}</td>
                        <td className="py-2 px-2 text-right border-r border-border/80 text-rose-600 dark:text-rose-400">{v.cancelado.toLocaleString("es-CO")}</td>
                        <td className="py-2 px-3 text-right border-r border-border/80 text-amber-700 dark:text-amber-400 font-bold bg-amber-500/10">
                          {v.saldoPedido.toLocaleString("es-CO")}
                        </td>
                        <td className="py-2 px-2 text-right text-muted-foreground">{v.saldoInv.toLocaleString("es-CO")}</td>
                      </tr>

                      {/* FILAS DE CLIENTES */}
                      {v.terceros.map((t) => {
                        const clave = `${v.vendedor}|${t.tercero}|${t.nombre}`;
                        const expandido = Boolean(expandidos[clave]);
                        return (
                          <React.Fragment key={clave}>
                            {/* Fila Resumen del Cliente */}
                            <tr className={cn("hover:bg-muted/30 transition-colors font-medium", t.esPendiente ? "bg-amber-500/5" : "")}>
                              <td className="py-1.5 px-3 border-r border-border/40 text-muted-foreground font-sans"></td>
                              <td className="py-1.5 px-3 border-r border-border/40 font-sans">
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => toggleExpandir(clave)}
                                    className="p-0.5 rounded hover:bg-muted text-muted-foreground cursor-pointer"
                                    title={expandido ? "Contraer" : "Expandir"}
                                  >
                                    {expandido ? <ChevronDown className="h-3.5 w-3.5 text-primary" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                  </button>
                                  <span className="font-semibold text-foreground">{t.nombre}</span>
                                  <span className="text-[10px] text-muted-foreground">({t.tercero})</span>
                                </div>
                              </td>
                              <td className="py-1.5 px-2 border-r border-border/40 text-muted-foreground font-sans">{t.ciudad}</td>
                              <td className="py-1.5 px-2 border-r border-border/40 text-muted-foreground font-sans">{t.items[0]?.documento || "-"}</td>
                              <td className="py-1.5 px-3 border-r border-border/80 text-muted-foreground font-sans italic">
                                {t.items.length} {t.items.length === 1 ? "referencia" : "referencias"}
                              </td>
                              <td className="py-1.5 px-2 border-r border-border/80 text-muted-foreground font-sans">-</td>
                              <td className="py-1.5 px-2 text-right border-r border-border/40">{t.anterior ? t.anterior.toLocaleString("es-CO") : "-"}</td>
                              <td className="py-1.5 px-2 text-right border-r border-border/40 text-purple-600 dark:text-purple-400 font-semibold">{t.pedidoMes ? t.pedidoMes.toLocaleString("es-CO") : "-"}</td>
                              <td className="py-1.5 px-2 text-right border-r border-border/80 font-bold">{t.totalPedido.toLocaleString("es-CO")}</td>
                              <td className="py-1.5 px-3 text-right border-r border-border/80 text-blue-600 dark:text-blue-400 font-bold">{t.despachado ? t.despachado.toLocaleString("es-CO") : "-"}</td>
                              <td className="py-1.5 px-2 text-right border-r border-border/80 text-rose-600 dark:text-rose-400">{t.cancelado ? t.cancelado.toLocaleString("es-CO") : "-"}</td>
                              <td className={cn("py-1.5 px-3 text-right border-r border-border/80 font-bold", t.esPendiente ? "text-amber-700 dark:text-amber-400 bg-amber-500/10" : "text-emerald-700 dark:text-emerald-400")}>
                                <div className="flex items-center justify-end gap-1">
                                  <span>{t.saldoPedido.toLocaleString("es-CO")}</span>
                                  {t.esPendiente ? (
                                    <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/30">
                                      Pend
                                    </span>
                                  ) : (
                                    <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-500/30">
                                      Listo
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-1.5 px-2 text-right text-muted-foreground">{t.saldoInv ? t.saldoInv.toLocaleString("es-CO") : "-"}</td>
                            </tr>

                            {/* Detalle de Referencias (Si está expandido) */}
                            {expandido &&
                              t.items.map((it, idx) => (
                                <tr key={it.id || idx} className={cn("hover:bg-muted/20 transition-colors text-[10.5px]", it.esPendiente ? "bg-amber-500/5" : "")}>
                                  <td className="py-1 px-3 border-r border-border/40 text-muted-foreground font-sans"></td>
                                  <td className="py-1 px-3 border-r border-border/40 text-muted-foreground font-sans pl-8 text-[10px]">
                                    ↳ Fechas: {it.fechas || "S/N"} {it.vence ? `• Vence: ${it.vence}` : ""}
                                  </td>
                                  <td className="py-1 px-2 border-r border-border/40 text-muted-foreground font-sans">{it.ciudad}</td>
                                  <td className="py-1 px-2 border-r border-border/40 text-muted-foreground">{it.documento}</td>
                                  <td className="py-1 px-3 border-r border-border/80 font-sans">
                                    <span className="font-bold text-primary">{it.producto}</span>
                                    {it.descripcion && (
                                      <span className="text-[9.5px] text-muted-foreground ml-1 truncate max-w-[150px] inline-block align-bottom">
                                        ({it.descripcion})
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-1 px-2 border-r border-border/80 text-muted-foreground">
                                    {it.talla || "-"} / {it.color || "-"}
                                  </td>
                                  <td className="py-1 px-2 text-right border-r border-border/40">{it.anterior || "-"}</td>
                                  <td className="py-1 px-2 text-right border-r border-border/40 text-purple-600 dark:text-purple-400 font-bold">{it.pedidoMes || "-"}</td>
                                  <td className="py-1 px-2 text-right border-r border-border/80 font-bold">{it.totalPedido}</td>
                                  <td className="py-1 px-3 text-right border-r border-border/80 text-blue-600 dark:text-blue-400">{it.despachado || "-"}</td>
                                  <td className="py-1 px-2 text-right border-r border-border/80 text-rose-600 dark:text-rose-400">{it.cancelado || "-"}</td>
                                  <td className={cn("py-1 px-3 text-right border-r border-border/80 font-bold", it.esPendiente ? "text-amber-700 dark:text-amber-400 bg-amber-500/10" : "text-muted-foreground")}>
                                    <div className="flex items-center justify-end gap-1">
                                      <span>{it.saldoPedido}</span>
                                      {it.esPendiente && (
                                        <span className="text-[8.5px] px-1 py-0 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/30">
                                          Pend
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-1 px-2 text-right text-muted-foreground">{it.saldoInv || "-"}</td>
                                </tr>
                              ))}
                          </React.Fragment>
                        );
                      })}
                    </React.Fragment>
                  ))}

                  {/* FILA DE TOTAL GENERAL */}
                  <tr className="bg-muted font-extrabold border-t-2 border-border text-foreground text-xs">
                    <td colSpan={6} className="py-3 px-3 border-r border-border/60 uppercase font-sans">
                      TOTAL GENERAL ({vendedores.length} ASESORES • {kpis.clientesCount} CLIENTES)
                    </td>
                    <td className="py-3 px-2 text-right border-r border-border/40">{kpis.totalAnterior.toLocaleString("es-CO")}</td>
                    <td className="py-3 px-2 text-right border-r border-border/40 text-purple-600 dark:text-purple-400">{kpis.totalPedidoMes.toLocaleString("es-CO")}</td>
                    <td className="py-3 px-2 text-right border-r border-border/80">{kpis.totalPedidos.toLocaleString("es-CO")}</td>
                    <td className="py-3 px-3 text-right border-r border-border/80 text-blue-600 dark:text-blue-400">{kpis.totalDespachado.toLocaleString("es-CO")}</td>
                    <td className="py-3 px-2 text-right border-r border-border/80 text-rose-600 dark:text-rose-400">{kpis.totalCancelado.toLocaleString("es-CO")}</td>
                    <td className="py-3 px-3 text-right border-r border-border/80 text-amber-700 dark:text-amber-400 bg-amber-500/15">
                      {kpis.totalSaldoPedido.toLocaleString("es-CO")}
                    </td>
                    <td className="py-3 px-2 text-right text-muted-foreground">{kpis.totalSaldoInv.toLocaleString("es-CO")}</td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
