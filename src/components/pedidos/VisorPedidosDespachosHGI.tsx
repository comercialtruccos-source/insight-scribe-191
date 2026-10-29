import React, { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  obtenerDatosPedidosDespachos,
  obtenerMetadataPedidosDespachos,
  estructurarPedidosDespachosHGI,
  type RegistroPedidosDespachosHGI,
  type MetadataCargaPedidosDespachos,
  type GrupoVendedorHGI,
  type GrupoTerceroHGI,
} from "@/lib/pedidos-despachos-storage";
import { cn, formatoHGI } from "@/lib/utils";
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
}

export function VisorPedidosDespachosHGI({
  onAbrirCarga,
  vendedorIdFiltro = "todos",
  terceroIdFiltro = "todos",
}: VisorPedidosDespachosHGIProps) {
  const [modoVista, setModoVista] = useState<"datos" | "grafico" | "ambos">("datos");
  const [soloPendientes, setSoloPendientes] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [vendedorSeleccionado, setVendedorSeleccionado] = useState<string>("todos");
  const [terceroSeleccionado, setTerceroSeleccionado] = useState<string>("todos");
  const [ciudadSeleccionada, setCiudadSeleccionada] = useState<string>("todas");
  const [vistaMovil, setVistaMovil] = useState<"tarjetas" | "tabla">("tarjetas");
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({});

  // Cargar datos persistidos
  const {
    data: registros = [],
    isLoading,
    refetch,
  } = useQuery<RegistroPedidosDespachosHGI[]>({
    queryKey: ["pedidos-despachos-hgi-data"],
    queryFn: async () => {
      const data = await obtenerDatosPedidosDespachos();
      return data || [];
    },
  });

  const metadata = useMemo(() => obtenerMetadataPedidosDespachos(), [registros]);

  // Estructurar con filtros
  const agrupado = useMemo(() => {
    return estructurarPedidosDespachosHGI(registros, {
      vendedor: vendedorSeleccionado,
      tercero: terceroSeleccionado,
      ciudad: ciudadSeleccionada,
      busqueda,
      soloPendientes,
    });
  }, [registros, vendedorSeleccionado, terceroSeleccionado, ciudadSeleccionada, busqueda, soloPendientes]);

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
            it.ciudad,
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
    <div className="space-y-4">
      {/* 1. Barra de Control y Fuente de Datos */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-card border border-border rounded-xl shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold shrink-0">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-foreground font-display">
                Reporte Oficial: Pedidos vs. Despachos (HGI)
              </span>
              <Badge variant="outline" className="bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30 text-[10px] font-bold">
                18 Columnas Oficiales
              </Badge>
            </div>
            {metadata && (
              <p className="text-[11px] text-muted-foreground font-mono">
                Archivo: <span className="font-bold text-foreground">{metadata.nombreArchivo}</span> • Cargado: {new Date(metadata.fechaCarga).toLocaleDateString("es-CO")} • {metadata.totalRegistros.toLocaleString("es-CO")} filas
              </p>
            )}
          </div>
        </div>

        {onAbrirCarga && (
          <Button
            variant="outline"
            size="sm"
            onClick={onAbrirCarga}
            className="text-xs font-semibold gap-1.5 shrink-0 border-teal-500/40 hover:bg-teal-500/10 text-teal-700 dark:text-teal-300"
          >
            <UploadCloud className="h-3.5 w-3.5" />
            <span>Cargar / Actualizar Archivo HGI</span>
          </Button>
        )}
      </div>

      {/* 2. Filtros Dinámicos */}
      <Card className="p-3 border border-border">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Selector de Asesor */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <User className="h-3 w-3 text-primary" />
              <span>Asesor Comercial ({catalogos.vendedores.length})</span>
            </label>
            <select
              value={vendedorSeleccionado}
              onChange={(e) => setVendedorSeleccionado(e.target.value)}
              className="w-full h-8 text-xs rounded-md border border-input bg-background px-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="todos">Todos los Asesores</option>
              {catalogos.vendedores.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          {/* Selector de Cliente */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Building2 className="h-3 w-3 text-indigo-500" />
              <span>Cliente ({catalogos.clientes.length})</span>
            </label>
            <select
              value={terceroSeleccionado}
              onChange={(e) => setTerceroSeleccionado(e.target.value)}
              className="w-full h-8 text-xs rounded-md border border-input bg-background px-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="todos">Todos los Clientes</option>
              {catalogos.clientes.map((c) => (
                <option key={c.tercero} value={c.tercero}>
                  {c.nombre} ({c.tercero})
                </option>
              ))}
            </select>
          </div>

          {/* Selector de Ciudad */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3 text-emerald-500" />
              <span>Ciudad ({catalogos.ciudades.length})</span>
            </label>
            <select
              value={ciudadSeleccionada}
              onChange={(e) => setCiudadSeleccionada(e.target.value)}
              className="w-full h-8 text-xs rounded-md border border-input bg-background px-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="todas">Todas las Ciudades</option>
              {catalogos.ciudades.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Selector Modo Vista (Datos vs Gráfico) */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <BarChart3 className="h-3 w-3 text-purple-500" />
              <span>Tipo de Visualización</span>
            </label>
            <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-md border border-border">
              <button
                type="button"
                onClick={() => setModoVista("datos")}
                className={cn(
                  "flex-1 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer",
                  modoVista === "datos" ? "bg-primary text-primary-foreground shadow-2xs" : "text-muted-foreground"
                )}
              >
                Tabla
              </button>
              <button
                type="button"
                onClick={() => setModoVista("grafico")}
                className={cn(
                  "flex-1 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer",
                  modoVista === "grafico" ? "bg-primary text-primary-foreground shadow-2xs" : "text-muted-foreground"
                )}
              >
                Gráfico
              </button>
              <button
                type="button"
                onClick={() => setModoVista("ambos")}
                className={cn(
                  "flex-1 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer",
                  modoVista === "ambos" ? "bg-primary text-primary-foreground shadow-2xs" : "text-muted-foreground"
                )}
              >
                Ambos
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* 3. Barra de Búsqueda y Botones de Acción */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20 p-2.5 rounded-xl border border-border">
        {/* Selector de Modo: Solo Pendientes vs Todo el Histórico */}
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

        {/* Buscador de texto en vivo */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar asesor, cliente, doc, ref, talla..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-8 pr-7 h-8 text-xs"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda("")}
              className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {busqueda && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-[11px] font-mono py-1 px-2.5 border">
            {estadisticasBusqueda.totalTerceros} {estadisticasBusqueda.totalTerceros === 1 ? "cliente" : "clientes"} • {estadisticasBusqueda.totalItems} {estadisticasBusqueda.totalItems === 1 ? "referencia" : "referencias"}
          </Badge>
        </div>
      )}

      {/* 4. Tarjetas KPI Ejecutivas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
        <Card className="p-3 border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider">Total Pedidos</span>
            <Package className="h-3.5 w-3.5 text-purple-500" />
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-foreground">
            {kpis.totalPedidos.toLocaleString("es-CO")} unds
          </div>
          <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
            Ant: {kpis.totalAnterior.toLocaleString("es-CO")} • Mes: {kpis.totalPedidoMes.toLocaleString("es-CO")}
          </div>
        </Card>

        <Card className="p-3 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider">Despachados</span>
            <Truck className="h-3.5 w-3.5 text-blue-500" />
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-blue-600 dark:text-blue-400">
            {kpis.totalDespachado.toLocaleString("es-CO")} unds
          </div>
          <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
            Fulfillment bodega
          </div>
        </Card>

        <Card className="p-3 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider">Saldo Pendiente</span>
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-amber-600 dark:text-amber-400">
            {kpis.totalSaldoPedido.toLocaleString("es-CO")} unds
          </div>
          <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
            Por entregar
          </div>
        </Card>

        <Card className="p-3 border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider">Cancelados</span>
            <Ban className="h-3.5 w-3.5 text-rose-500" />
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-rose-600 dark:text-rose-400">
            {kpis.totalCancelado.toLocaleString("es-CO")} unds
          </div>
          <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
            Anulados / devoluciones
          </div>
        </Card>

        <Card className="p-3 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider">Nivel Servicio</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {kpis.nivelServicioPct.toFixed(1)}%
          </div>
          <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
            Cumplimiento despachos
          </div>
        </Card>

        <Card className="p-3 border-l-4 border-l-indigo-500">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider">Clientes Pend.</span>
            <Users className="h-3.5 w-3.5 text-indigo-500" />
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-indigo-600 dark:text-indigo-400">
            {kpis.clientesConPendientesCount} <span className="text-xs font-normal text-muted-foreground">/ {kpis.clientesCount}</span>
          </div>
          <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
            Stock Bodega: {kpis.totalSaldoInv.toLocaleString("es-CO")}
          </div>
        </Card>
      </div>

      {/* 5. Vista de Gráfico */}
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
              <div className="h-[260px] flex items-center justify-center text-muted-foreground text-xs">
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

      {/* 6. Matriz Pivot Jerárquica: Visor de Datos Estilo HGI */}
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
                <span>Cargando matriz de pedidos vs. despachos...</span>
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
