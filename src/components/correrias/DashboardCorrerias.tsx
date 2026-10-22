import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import {
  Layers,
  Tag,
  TrendingUp,
  DollarSign,
  Package,
  Download,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Eye,
  Sparkles,
  Percent,
  ShieldAlert,
  RefreshCw,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  SlidersHorizontal,
  Building2,
  Calendar,
  Award,
} from "lucide-react";
import { toast } from "sonner";
import type { FilaFactVentas, CatalogosDisponibles, FiltrosBI } from "@/lib/ventas-api";
import {
  cargarMaestroReferenciasMap,
  calcularDashboardCorrerias,
  type FilaTrazabilidadReferencia,
  type ReferenciaSinVenta,
} from "@/lib/correrias-api";

interface DashboardCorreriasProps {
  ventas: FilaFactVentas[];
  catalogos: CatalogosDisponibles | null;
  cargandoVentas?: boolean;
  esAdmin: boolean;
  filtrosGlobales?: FiltrosBI;
}

function formatoCOP(val: number) {
  const abs = Math.abs(val);
  const sign = val < 0 ? "-" : "";
  if (abs >= 1_000_000_000) {
    return `${sign}$${(abs / 1_000_000_000).toFixed(2)}B`;
  }
  if (abs >= 1_000_000) {
    return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  }
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(val || 0);
}

function formatoCOPFull(val: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(val || 0);
}

const PALETA_COLORES = [
  "#4f46e5", // Indigo
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#06b6d4", // Cyan
  "#ec4899", // Rose
  "#8b5cf6", // Violet
  "#3b82f6", // Blue
  "#f97316", // Orange
  "#14b8a6", // Teal
];

export function DashboardCorrerias({
  ventas,
  catalogos,
  cargandoVentas = false,
  esAdmin,
}: DashboardCorreriasProps) {
  // 1. Control estricto de acceso para Administradores
  if (!esAdmin) {
    return (
      <Card className="border-rose-500/30 bg-rose-500/5 p-8 text-center rounded-2xl shadow-sm">
        <ShieldAlert className="h-12 w-12 text-rose-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-foreground font-display">
          Acceso Restringido a Administradores
        </h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
          El panel de análisis de correrías y trazabilidad de colecciones para diseño está
          habilitado exclusivamente para usuarios con perfil de Administrador.
        </p>
      </Card>
    );
  }

  // Estados de filtros internos
  const [correriaFiltro, setCorreriaFiltro] = useState<string | number>("todas");
  const [prendaFiltro, setPrendaFiltro] = useState<string>("todas");
  const [busqueda, setBusqueda] = useState<string>("");
  const [vistaActiva, setVistaActiva] = useState<"trazabilidad" | "graficas" | "sinVenta">("trazabilidad");

  // Paginación y ordenamiento de la tabla
  const [pagina, setPagina] = useState<number>(1);
  const [ordenCampo, setOrdenCampo] = useState<"facturacion" | "unidades" | "markup" | "pvm">("facturacion");
  const [ordenAsc, setOrdenAsc] = useState<boolean>(false);
  const POR_PAGINA = 15;

  // Referencia seleccionada para ver detalle de tallas y colores
  const [refDetalle, setRefDetalle] = useState<FilaTrazabilidadReferencia | null>(null);

  // 2. Cargar maestro de referencias de Supabase
  const { data: maestroMap, isLoading: cMaestro, refetch: recargarMaestro } = useQuery({
    queryKey: ["bi-maestro-referencias-map"],
    queryFn: cargarMaestroReferenciasMap,
    staleTime: 10 * 60 * 1000, // 10 minutos
  });

  // 3. Procesar datos agregados del Dashboard de Correrías
  const data = useMemo(() => {
    return calcularDashboardCorrerias({
      ventas: ventas || [],
      catalogoCorrerias: catalogos?.correrias || [],
      maestroReferencias: maestroMap || new Map(),
      correriaFiltro,
      prendaFiltro,
      busqueda,
    });
  }, [ventas, catalogos?.correrias, maestroMap, correriaFiltro, prendaFiltro, busqueda]);

  // Lista ordenada de referencias
  const referenciasOrdenadas = useMemo(() => {
    const arr = [...data.rankingReferencias];
    arr.sort((a, b) => {
      let valA = a[ordenCampo];
      let valB = b[ordenCampo];
      if (valA < valB) return ordenAsc ? -1 : 1;
      if (valA > valB) return ordenAsc ? 1 : -1;
      return 0;
    });
    return arr;
  }, [data.rankingReferencias, ordenCampo, ordenAsc]);

  const totalPaginas = Math.max(1, Math.ceil(referenciasOrdenadas.length / POR_PAGINA));
  const referenciasPaginadas = useMemo(() => {
    const inicio = (pagina - 1) * POR_PAGINA;
    return referenciasOrdenadas.slice(inicio, inicio + POR_PAGINA);
  }, [referenciasOrdenadas, pagina]);

  // Manejar cambio de ordenamiento
  const alternarOrden = (campo: "facturacion" | "unidades" | "markup" | "pvm") => {
    if (ordenCampo === campo) {
      setOrdenAsc(!ordenAsc);
    } else {
      setOrdenCampo(campo);
      setOrdenAsc(false);
    }
    setPagina(1);
  };

  // Exportar Trazabilidad a CSV para el área de diseño
  const exportarCSV = () => {
    if (data.rankingReferencias.length === 0) {
      toast.error("No hay datos de referencias para exportar con los filtros actuales");
      return;
    }

    const encabezados = [
      "REF",
      "Nombre Prenda",
      "Categoria",
      "Correrias",
      "Unidades Vendidas",
      "Facturacion Neta COP",
      "Ticket Promedio Unitario",
      "PVM Mayorista Lista",
      "PVP Publico Lista",
      "Markup Estimado %",
      "Diferencia vs PVM COP",
      "Participacion en Coleccion %",
      "Clasificacion Pareto",
    ];

    const filas = data.rankingReferencias.map((r) => [
      `"${r.ref}"`,
      `"${r.nombre.replace(/"/g, '""')}"`,
      `"${r.prenda}"`,
      `"${r.correriasNombres.join(" | ")}"`,
      r.unidades,
      r.facturacion,
      r.ticketPromedio,
      r.pvm,
      r.pvp,
      r.markup.toFixed(2),
      r.diferenciaTicketVsPvm,
      r.participacionVenta.toFixed(2),
      r.paretoClase,
    ]);

    const csvContent = "\uFEFF" + [encabezados.join(";"), ...filas.map((f) => f.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `trazabilidad_correrias_diseno_${correriaFiltro}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Informe de trazabilidad descargado con éxito");
  };

  // Detalle de transacciones para el modal de una referencia
  const detalleTransaccionesRef = useMemo(() => {
    if (!refDetalle) return [];
    const norm = refDetalle.ref.trim().toLowerCase();
    return (ventas || []).filter((v) => {
      const rRef = String(v.producto_c || v.sku || v.producto || "").trim().toLowerCase();
      return rRef.includes(norm);
    });
  }, [refDetalle, ventas]);

  return (
    <div className="space-y-6">
      {/* 1. ENCABEZADO GERENCIAL */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-linear-to-tr from-rose-500/20 to-indigo-500/20 text-indigo-600 dark:text-indigo-400">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground font-display flex items-center gap-2">
                Dashboard de Correrías: Trazabilidad para Diseño y Comercial
                <Badge variant="outline" className="text-[10px] bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 gap-1 font-mono">
                  Solo Admin
                </Badge>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Seguimiento de ventas por correría (C1..C5), precios PVM vs PVP del catálogo maestro, rotación y referencias activas vs inactivas.
              </p>
            </div>
          </div>
        </div>

        {/* Acciones y Estado del Maestro */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-xs bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 gap-1.5 py-1 px-2.5">
            <Package className="h-3.5 w-3.5 text-indigo-500" />
            <span>
              {cMaestro ? "Cargando catálogo..." : `${data.kpis.totalReferenciasMaestro.toLocaleString("es-CO")} refs en maestro`}
            </span>
          </Badge>

          <Button
            variant="outline"
            size="sm"
            onClick={exportarCSV}
            className="h-8 text-xs font-semibold border-primary/30 text-primary hover:bg-primary/10 gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            Exportar CSV Diseño
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => recargarMaestro()}
            disabled={cMaestro}
            title="Refrescar catálogo maestro"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${cMaestro ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* 2. BARRA DE FILTROS DEL DASHBOARD DE CORRERÍAS */}
      <Card className="border-border/80 shadow-xs bg-card/60 backdrop-blur-sm">
        <CardContent className="p-3.5">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Selector de Correría */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
              <span className="text-xs font-bold text-foreground shrink-0 flex items-center gap-1 mr-1">
                <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                Correría:
              </span>

              <Button
                size="sm"
                variant={correriaFiltro === "todas" ? "default" : "outline"}
                onClick={() => {
                  setCorreriaFiltro("todas");
                  setPagina(1);
                }}
                className={`h-7 px-2.5 text-xs rounded-lg transition-all ${
                  correriaFiltro === "todas" ? "bg-indigo-600 text-white font-bold" : "text-muted-foreground"
                }`}
              >
                Todas las Correrías
              </Button>

              {(catalogos?.correrias || []).map((c) => {
                const esActiva = String(correriaFiltro) === String(c.id);
                return (
                  <Button
                    key={c.id}
                    size="sm"
                    variant={esActiva ? "default" : "outline"}
                    onClick={() => {
                      setCorreriaFiltro(c.id);
                      setPagina(1);
                    }}
                    className={`h-7 px-2.5 text-xs rounded-lg transition-all ${
                      esActiva ? "bg-indigo-600 text-white font-bold shadow-xs" : "text-foreground"
                    }`}
                  >
                    {c.nombre}
                  </Button>
                );
              })}
            </div>

            {/* Filtros secundarios: Prenda, Búsqueda y Selector de Vista */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Filtro por Prenda / Tipo */}
              <div className="w-40 sm:w-44">
                <Select
                  value={prendaFiltro}
                  onValueChange={(val) => {
                    setPrendaFiltro(val);
                    setPagina(1);
                  }}
                >
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue placeholder="Todas las Prendas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas" className="text-xs">
                      Todas las Categorías
                    </SelectItem>
                    {data.prendasDisponibles.map((pr) => (
                      <SelectItem key={pr} value={pr} className="text-xs">
                        {pr}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Buscador de Referencia o Nombre */}
              <div className="relative w-48 sm:w-56">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Buscar REF o Nombre..."
                  value={busqueda}
                  onChange={(e) => {
                    setBusqueda(e.target.value);
                    setPagina(1);
                  }}
                  className="h-8 pl-8 text-xs bg-background"
                />
              </div>

              {/* Selector de Pestaña Interna */}
              <div className="flex items-center rounded-lg border border-border/70 p-0.5 bg-muted/40">
                <Button
                  size="sm"
                  variant={vistaActiva === "trazabilidad" ? "secondary" : "ghost"}
                  onClick={() => setVistaActiva("trazabilidad")}
                  className="h-7 px-2 text-xs font-semibold"
                >
                  <Tag className="h-3 w-3 mr-1 text-indigo-500" />
                  Trazabilidad
                </Button>
                <Button
                  size="sm"
                  variant={vistaActiva === "graficas" ? "secondary" : "ghost"}
                  onClick={() => setVistaActiva("graficas")}
                  className="h-7 px-2 text-xs font-semibold"
                >
                  <TrendingUp className="h-3 w-3 mr-1 text-emerald-500" />
                  Gráficas
                </Button>
                <Button
                  size="sm"
                  variant={vistaActiva === "sinVenta" ? "secondary" : "ghost"}
                  onClick={() => setVistaActiva("sinVenta")}
                  className="h-7 px-2 text-xs font-semibold text-amber-700 dark:text-amber-400"
                >
                  <AlertCircle className="h-3 w-3 mr-1 text-amber-500" />
                  Sin Venta
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. TARJETAS KPI EJECUTIVAS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Facturación */}
        <div className="p-3.5 rounded-2xl bg-card border border-border/70 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Facturación Correría</span>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-lg font-black text-foreground font-mono">
            {cargandoVentas ? "..." : formatoCOP(data.kpis.facturacionTotal)}
          </p>
          <p className="text-[10px] text-muted-foreground">Total ventas netas en el alcance</p>
        </div>

        {/* Unidades */}
        <div className="p-3.5 rounded-2xl bg-card border border-border/70 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Prendas Vendidas</span>
            <Package className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-lg font-black text-foreground font-mono">
            {cargandoVentas ? "..." : data.kpis.unidadesTotales.toLocaleString("es-CO")}
          </p>
          <p className="text-[10px] text-muted-foreground">Volumen físico comercializado</p>
        </div>

        {/* Referencias Activas */}
        <div className="p-3.5 rounded-2xl bg-card border border-border/70 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Referencias con Venta</span>
            <Tag className="h-4 w-4 text-indigo-500" />
          </div>
          <p className="text-lg font-black text-foreground font-mono">
            {cargandoVentas ? "..." : data.kpis.referenciasVendidas.toLocaleString("es-CO")}
          </p>
          <p className="text-[10px] text-muted-foreground">SKUs colocados en pedidos</p>
        </div>

        {/* Ticket Promedio por Prenda */}
        <div className="p-3.5 rounded-2xl bg-card border border-border/70 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Ticket Promedio Real</span>
            <TrendingUp className="h-4 w-4 text-cyan-500" />
          </div>
          <p className="text-lg font-black text-foreground font-mono">
            {cargandoVentas ? "..." : formatoCOP(data.kpis.ticketPromedioGlobal)}
          </p>
          <p className="text-[10px] text-muted-foreground">Precio real facturado por prenda</p>
        </div>

        {/* PVM Promedio de Lista */}
        <div className="p-3.5 rounded-2xl bg-card border border-border/70 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>PVM Promedio (Lista)</span>
            <Award className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-lg font-black text-foreground font-mono">
            {cargandoVentas ? "..." : formatoCOP(data.kpis.pvmPromedio)}
          </p>
          <p className="text-[10px] text-muted-foreground">Precio base mayorista sugerido</p>
        </div>

        {/* Markup Ponderado */}
        <div className="p-3.5 rounded-2xl bg-card border border-border/70 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Markup Colección</span>
            <Percent className="h-4 w-4 text-purple-500" />
          </div>
          <p className="text-lg font-black text-foreground font-mono">
            {cargandoVentas ? "..." : `+${data.kpis.markupPonderado.toFixed(1)}%`}
          </p>
          <p className="text-[10px] text-muted-foreground">Margen PVM vs PVP sugerido</p>
        </div>
      </div>

      {/* 4. CONTENIDO SEGÚN LA PESTAÑA ACTIVA */}

      {/* VISTA 1: TABLA MAESTRA DE TRAZABILIDAD DE REFERENCIAS */}
      {vistaActiva === "trazabilidad" && (
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <Tag className="h-4 w-4 text-indigo-500" />
                  Trazabilidad de Referencias en la Correría ({referenciasOrdenadas.length.toLocaleString("es-CO")} activas)
                </CardTitle>
                <CardDescription className="text-xs">
                  Detalle de prendas vendidas, volumen, facturación, ticket promedio vs PVM/PVP oficial del catálogo.
                </CardDescription>
              </div>

              {/* Botones de ordenamiento rápido */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>Ordenar por:</span>
                <Button
                  size="sm"
                  variant={ordenCampo === "facturacion" ? "secondary" : "ghost"}
                  onClick={() => alternarOrden("facturacion")}
                  className="h-7 px-2 text-xs font-semibold gap-1"
                >
                  Facturación
                  <ArrowUpDown className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant={ordenCampo === "unidades" ? "secondary" : "ghost"}
                  onClick={() => alternarOrden("unidades")}
                  className="h-7 px-2 text-xs font-semibold gap-1"
                >
                  Prendas
                  <ArrowUpDown className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant={ordenCampo === "markup" ? "secondary" : "ghost"}
                  onClick={() => alternarOrden("markup")}
                  className="h-7 px-2 text-xs font-semibold gap-1"
                >
                  Markup
                  <ArrowUpDown className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-3 space-y-3">
            {cargandoVentas ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                Cargando trazabilidad de referencias...
              </div>
            ) : referenciasPaginadas.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                No se encontraron referencias con ventas para los filtros seleccionados.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border/60">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 text-[10px] text-muted-foreground uppercase border-b border-border/60">
                    <tr>
                      <th className="py-2 px-3 font-bold">REF / Código</th>
                      <th className="py-2 px-3 font-bold">Descripción de Prenda</th>
                      <th className="py-2 px-3 font-bold">Categoría</th>
                      <th className="py-2 px-3 font-bold text-center">Correrías</th>
                      <th className="py-2 px-3 font-bold text-right cursor-pointer hover:text-foreground" onClick={() => alternarOrden("unidades")}>
                        Prendas {ordenCampo === "unidades" && (ordenAsc ? "↑" : "↓")}
                      </th>
                      <th className="py-2 px-3 font-bold text-right cursor-pointer hover:text-foreground" onClick={() => alternarOrden("facturacion")}>
                        Facturación {ordenCampo === "facturacion" && (ordenAsc ? "↑" : "↓")}
                      </th>
                      <th className="py-2 px-3 font-bold text-right">Ticket Real</th>
                      <th className="py-2 px-3 font-bold text-right">PVM (Mayorista)</th>
                      <th className="py-2 px-3 font-bold text-right">PVP (Público)</th>
                      <th className="py-2 px-3 font-bold text-right cursor-pointer hover:text-foreground" onClick={() => alternarOrden("markup")}>
                        Markup {ordenCampo === "markup" && (ordenAsc ? "↑" : "↓")}
                      </th>
                      <th className="py-2 px-3 font-bold text-center">Pareto</th>
                      <th className="py-2 px-3 font-bold text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {referenciasPaginadas.map((item) => {
                      const tieneDiferenciaPvm = item.pvm > 0 && item.ticketPromedio > 0;
                      const difPct = tieneDiferenciaPvm ? ((item.ticketPromedio - item.pvm) / item.pvm) * 100 : 0;

                      return (
                        <tr key={item.ref} className="hover:bg-muted/30 transition-colors">
                          {/* REF */}
                          <td className="py-2.5 px-3 font-mono font-bold text-foreground">
                            {item.ref}
                          </td>

                          {/* Nombre */}
                          <td className="py-2.5 px-3 text-foreground font-medium truncate max-w-[200px]" title={item.nombre}>
                            {item.nombre}
                          </td>

                          {/* Prenda / Categoría */}
                          <td className="py-2.5 px-3 text-muted-foreground">
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal">
                              {item.prenda}
                            </Badge>
                          </td>

                          {/* Correrías */}
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex flex-wrap items-center justify-center gap-1">
                              {item.correriasNombres.map((cn) => (
                                <Badge
                                  key={cn}
                                  variant="outline"
                                  className="text-[9px] font-mono py-0 px-1 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30"
                                >
                                  {cn}
                                </Badge>
                              ))}
                            </div>
                          </td>

                          {/* Prendas */}
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-foreground">
                            {item.unidades.toLocaleString("es-CO")}
                          </td>

                          {/* Facturación */}
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {formatoCOP(item.facturacion)}
                          </td>

                          {/* Ticket Promedio Real */}
                          <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">
                            {formatoCOP(item.ticketPromedio)}
                          </td>

                          {/* PVM */}
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-blue-600 dark:text-blue-400">
                            {item.pvm > 0 ? formatoCOP(item.pvm) : <span className="text-muted-foreground text-[10px]">—</span>}
                          </td>

                          {/* PVP */}
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                            {item.pvp > 0 ? formatoCOP(item.pvp) : <span className="text-muted-foreground text-[10px]">—</span>}
                          </td>

                          {/* Markup */}
                          <td className="py-2.5 px-3 text-right font-mono">
                            {item.markup > 0 ? (
                              <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                                +{item.markup.toFixed(0)}%
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-[10px]">—</span>
                            )}
                          </td>

                          {/* Pareto */}
                          <td className="py-2.5 px-3 text-center">
                            <Badge
                              className={`text-[9px] font-bold py-0 px-1.5 ${
                                item.paretoClase === "A"
                                  ? "bg-emerald-600 text-white"
                                  : item.paretoClase === "B"
                                  ? "bg-blue-600 text-white"
                                  : "bg-slate-500 text-white"
                              }`}
                            >
                              {item.paretoClase}
                            </Badge>
                          </td>

                          {/* Ver Detalle */}
                          <td className="py-2.5 px-3 text-center">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setRefDetalle(item)}
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                              title="Ver desglose por tallas y vendedores"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Paginación */}
            {totalPaginas > 1 && (
              <div className="flex items-center justify-between pt-2 text-xs">
                <span className="text-muted-foreground text-[11px]">
                  Mostrando página {pagina} de {totalPaginas} ({referenciasOrdenadas.length.toLocaleString("es-CO")} referencias)
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    disabled={pagina <= 1}
                    onClick={() => setPagina((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    disabled={pagina >= totalPaginas}
                    onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                  >
                    Siguiente
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* VISTA 2: GRÁFICAS COMPARATIVAS Y CURVAS */}
      {vistaActiva === "graficas" && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Gráfica 1: Comparativa de Rendimiento entre Correrías */}
          <Card className="border-border/80 shadow-xs lg:col-span-2">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4 text-indigo-500" />
                Comparativa de Facturación y Prendas entre Correrías (C1, C2, C3, C4, C5...)
              </CardTitle>
              <CardDescription className="text-xs">
                Volumen comercializado y monto facturado por ciclo de venta.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.resumenPorCorreria} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="nombre" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" tickFormatter={(v) => formatoCOP(v)} tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v} und`} tick={{ fontSize: 10 }} />
                    <Tooltip
                      formatter={(val: any, name: string) => {
                        if (name === "Facturación COP") return [formatoCOPFull(Number(val)), name];
                        return [`${Number(val).toLocaleString("es-CO")} prendas`, name];
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar yAxisId="left" dataKey="facturacion" name="Facturación COP" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="right" dataKey="unidades" name="Prendas Vendidas" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Gráfica 2: Desglose por Categoría / Prenda */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <Package className="h-4 w-4 text-emerald-500" />
                Top Categorías de Prenda en la Correría
              </CardTitle>
              <CardDescription className="text-xs">
                Participación porcentual de Jeans, Sets, Blusas, Pantalones, etc.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.resumenPorPrenda.slice(0, 7)}
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 40, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis type="number" tickFormatter={(v) => formatoCOP(v)} tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="prenda" tick={{ fontSize: 10 }} width={80} />
                    <Tooltip formatter={(v: any) => [formatoCOPFull(Number(v)), "Facturación"]} />
                    <Bar dataKey="facturacion" fill="#06b6d4" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Gráfica 3: Concentración Pareto de Referencias */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <Percent className="h-4 w-4 text-purple-500" />
                Distribución Pareto de Referencias (Curva ABC)
              </CardTitle>
              <CardDescription className="text-xs">
                Clase A genera el 80% de la venta, Clase B el 15% y Clase C la cola larga.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 flex flex-col items-center justify-center">
              {(() => {
                const countA = data.rankingReferencias.filter((r) => r.paretoClase === "A").length;
                const countB = data.rankingReferencias.filter((r) => r.paretoClase === "B").length;
                const countC = data.rankingReferencias.filter((r) => r.paretoClase === "C").length;
                const pieData = [
                  { name: "Clase A (Top 80% Venta)", value: countA, color: "#10b981" },
                  { name: "Clase B (15% Venta)", value: countB, color: "#3b82f6" },
                  { name: "Clase C (5% Venta)", value: countC, color: "#94a3b8" },
                ];
                return (
                  <div className="w-full h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          innerRadius={45}
                          paddingAngle={3}
                          label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: any) => [`${v} referencias`, "Total"]} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      )}

      {/* VISTA 3: AUDITORÍA DE REFERENCIAS DEL MAESTRO SIN VENTA EN LA CORRERÍA */}
      {vistaActiva === "sinVenta" && (
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  Auditoría de Referencias del Maestro sin Venta en esta Correría
                </CardTitle>
                <CardDescription className="text-xs">
                  Prendas registradas en el catálogo maestro de la empresa que NO han registrado ventas en la correría seleccionada.
                </CardDescription>
              </div>
              <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 text-xs font-mono">
                {data.referenciasSinVentaEnCorreria.length.toLocaleString("es-CO")} referencias sin venta
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-3">
            {data.referenciasSinVentaEnCorreria.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-emerald-500" />
                ¡Excelente! Todas las referencias del maestro tienen ventas en esta correría.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border/60">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 text-[10px] text-muted-foreground uppercase border-b border-border/60">
                    <tr>
                      <th className="py-2 px-3 font-bold">REF</th>
                      <th className="py-2 px-3 font-bold">Nombre de Producto</th>
                      <th className="py-2 px-3 font-bold text-right">PVM (Mayorista)</th>
                      <th className="py-2 px-3 font-bold text-right">PVP (Público)</th>
                      <th className="py-2 px-3 font-bold text-right">Markup</th>
                      <th className="py-2 px-3 font-bold text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {data.referenciasSinVentaEnCorreria.slice(0, 50).map((item) => (
                      <tr key={item.ref} className="hover:bg-muted/30">
                        <td className="py-2 px-3 font-mono font-bold text-foreground">{item.ref}</td>
                        <td className="py-2 px-3 text-foreground">{item.nombre}</td>
                        <td className="py-2 px-3 text-right font-mono text-blue-600 dark:text-blue-400">
                          {item.pvm > 0 ? formatoCOP(item.pvm) : "—"}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                          {item.pvp > 0 ? formatoCOP(item.pvp) : "—"}
                        </td>
                        <td className="py-2 px-3 text-right font-mono">
                          {item.markup > 0 ? `+${item.markup.toFixed(0)}%` : "—"}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-700 dark:text-amber-400 bg-amber-500/10">
                            Sin venta
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 5. MODAL DE DETALLE DE TALLAS, COLORES Y VENDEDORES */}
      <Dialog open={Boolean(refDetalle)} onOpenChange={(open) => !open && setRefDetalle(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Badge className="font-mono text-xs bg-indigo-600 text-white">{refDetalle?.ref}</Badge>
              <DialogTitle className="text-base font-bold text-foreground">{refDetalle?.nombre}</DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              Trazabilidad física de pedidos para esta referencia: desglose por tallas, colores y asesores.
            </DialogDescription>
          </DialogHeader>

          {refDetalle && (
            <div className="space-y-4 pt-2 text-xs">
              {/* Tarjetas resumen de la referencia */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60">
                  <span className="text-[10px] text-muted-foreground block uppercase font-bold">Unidades</span>
                  <span className="text-base font-bold text-foreground font-mono">
                    {refDetalle.unidades.toLocaleString("es-CO")}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60">
                  <span className="text-[10px] text-muted-foreground block uppercase font-bold">Facturación</span>
                  <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    {formatoCOP(refDetalle.facturacion)}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60">
                  <span className="text-[10px] text-muted-foreground block uppercase font-bold">PVM Lista</span>
                  <span className="text-base font-bold text-blue-600 dark:text-blue-400 font-mono">
                    {refDetalle.pvm > 0 ? formatoCOP(refDetalle.pvm) : "—"}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60">
                  <span className="text-[10px] text-muted-foreground block uppercase font-bold">PVP Lista</span>
                  <span className="text-base font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                    {refDetalle.pvp > 0 ? formatoCOP(refDetalle.pvp) : "—"}
                  </span>
                </div>
              </div>

              {/* Transacciones Registradas */}
              <div className="space-y-1.5">
                <span className="font-bold text-foreground text-xs block">
                  Transacciones en HGI ({detalleTransaccionesRef.length}):
                </span>
                <div className="max-h-60 overflow-y-auto rounded-lg border border-border/60">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/60 text-[10px] text-muted-foreground uppercase border-b border-border/60 sticky top-0">
                      <tr>
                        <th className="py-1.5 px-2.5 font-bold">Fecha</th>
                        <th className="py-1.5 px-2.5 font-bold">Talla</th>
                        <th className="py-1.5 px-2.5 font-bold">Color</th>
                        <th className="py-1.5 px-2.5 font-bold text-right">Cant</th>
                        <th className="py-1.5 px-2.5 font-bold text-right">Valor COP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {detalleTransaccionesRef.slice(0, 100).map((tr, idx) => (
                        <tr key={`tr-${idx}`} className="hover:bg-muted/30">
                          <td className="py-1 px-2.5 font-mono text-[11px] text-muted-foreground">
                            {tr.fecha ? String(tr.fecha).slice(0, 10) : "—"}
                          </td>
                          <td className="py-1 px-2.5 font-bold text-foreground">{tr.talla || "—"}</td>
                          <td className="py-1 px-2.5 text-muted-foreground">{tr.color || "—"}</td>
                          <td className="py-1 px-2.5 text-right font-mono font-bold text-foreground">
                            {tr.cantidad ?? 0}
                          </td>
                          <td className="py-1 px-2.5 text-right font-mono text-emerald-600 dark:text-emerald-400">
                            {formatoCOP(Number(tr.valor || 0))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
