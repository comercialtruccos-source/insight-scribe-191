import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ingestarLoteCliente,
  registrarCargaCliente,
  obtenerResumenCliente,
  obtenerCatalogosFiltros,
  obtenerDashboard1Cumplimiento,
  obtenerDashboard2RunRate,
  obtenerDashboard3Digital,
  obtenerDashboard4FuerzaVentas,
  obtenerDashboard5Marketplaces,
  obtenerTransaccionesDetalle,
  type FiltrosBI,
} from "@/lib/ventas-api";
import {
  procesarArchivoPorStreaming,
  inspeccionarEncabezados,
  COLUMNAS_ESPERADAS,
  COLUMNAS_DIMENSION,
} from "@/lib/parse-ventas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  ComposedChart,
} from "recharts";
import {
  TrendingUp,
  DollarSign,
  Package,
  Users,
  Percent,
  Receipt,
  Download,
  FilterX,
  UploadCloud,
  Tag,
  FileSpreadsheet,
  Search,
  Calendar,
  Compass,
  ShoppingBag,
  Layers,
  Globe,
  Award,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { toast } from "sonner";

const TAMANO_LOTE = 1000;
const COLORES = ["#2563eb", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316", "#64748b"];

const MESES = [
  { num: 1, nombre: "Enero" },
  { num: 2, nombre: "Febrero" },
  { num: 3, nombre: "Marzo" },
  { num: 4, nombre: "Abril" },
  { num: 5, nombre: "Mayo" },
  { num: 6, nombre: "Junio" },
  { num: 7, nombre: "Julio" },
  { num: 8, nombre: "Agosto" },
  { num: 9, nombre: "Septiembre" },
  { num: 10, nombre: "Octubre" },
  { num: 11, nombre: "Noviembre" },
  { num: 12, nombre: "Diciembre" },
];

function formatoCOP(val: number) {
  if (val >= 1_000_000_000) {
    return `$${(val / 1_000_000_000).toFixed(2)}B`;
  }
  if (val >= 1_000_000) {
    return `$${(val / 1_000_000).toFixed(1)}M`;
  }
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(val);
}

function formatoCOPFull(val: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(val);
}

function colorSemaforo(pct: number) {
  if (pct >= 100) return "bg-emerald-500/15 text-emerald-600 border-emerald-500/30";
  if (pct >= 90) return "bg-amber-500/15 text-amber-600 border-amber-500/30";
  return "bg-rose-500/15 text-rose-600 border-rose-500/30";
}

export const Route = createFileRoute("/_authenticated/panel")({
  component: Panel,
  errorComponent: ({ error }) => (
    <div role="alert" className="p-10 text-destructive">
      {error.message}
    </div>
  ),
  notFoundComponent: () => <div className="p-10">Sin información.</div>,
});

function Panel() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Filtros globales (por defecto 'todos' para ver el 100% de la historia cargada)
  const [anio, setAnio] = useState<string>("todos");
  const [mes, setMes] = useState<string>("todos");
  const [canalId, setCanalId] = useState<string>("todos");
  const [marcaId, setMarcaId] = useState<string>("todos");
  const [vendedorId, setVendedorId] = useState<string>("todos");
  const [zonaId, setZonaId] = useState<string>("todos");

  // Explorador detalle
  const [busquedaDetalle, setBusquedaDetalle] = useState("");
  const [paginaDetalle, setPaginaDetalle] = useState(0);

  // Carga archivos
  const [archivo, setArchivo] = useState<File | null>(null);
  const [progreso, setProgreso] = useState(0);
  const [estado, setEstado] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string[]>([]);
  const [esCSV, setEsCSV] = useState(false);

  const filtros: FiltrosBI = useMemo(() => ({
    anio: anio !== "todos" ? Number(anio) : null,
    mes: mes !== "todos" ? Number(mes) : null,
    canal_id: canalId !== "todos" ? Number(canalId) : null,
    marca_id: marcaId !== "todos" ? Number(marcaId) : null,
    vendedor_id: vendedorId !== "todos" ? Number(vendedorId) : null,
    zona_id: zonaId !== "todos" ? Number(zonaId) : null,
  }), [anio, mes, canalId, marcaId, vendedorId, zonaId]);

  const hayFiltrosActivos = anio !== "todos" || mes !== "todos" || canalId !== "todos" || marcaId !== "todos" || vendedorId !== "todos" || zonaId !== "todos";

  const limpiarFiltros = () => {
    setAnio("todos");
    setMes("todos");
    setCanalId("todos");
    setMarcaId("todos");
    setVendedorId("todos");
    setZonaId("todos");
  };

  // Queries de datos
  const { data: resumen } = useQuery({
    queryKey: ["resumen"],
    queryFn: () => obtenerResumenCliente(),
  });

  const { data: catalogos } = useQuery({
    queryKey: ["catalogos-filtros"],
    queryFn: () => obtenerCatalogosFiltros(),
  });

  // Dashboard 1: Cumplimiento y Evolución Cronológica
  const { data: d1, isLoading: cD1 } = useQuery({
    queryKey: ["bi-d1-cumplimiento", filtros],
    queryFn: () => obtenerDashboard1Cumplimiento(filtros),
  });

  // Dashboard 2: Run Rate Diario
  const { data: d2, isLoading: cD2 } = useQuery({
    queryKey: ["bi-d2-runrate", filtros],
    queryFn: () => obtenerDashboard2RunRate(filtros),
  });

  // Dashboard 3: Digital & Marketing
  const { data: d3, isLoading: cD3 } = useQuery({
    queryKey: ["bi-d3-digital", filtros],
    queryFn: () => obtenerDashboard3Digital(filtros),
  });

  // Dashboard 4: Fuerza Comercial
  const { data: d4, isLoading: cD4 } = useQuery({
    queryKey: ["bi-d4-fuerza", filtros],
    queryFn: () => obtenerDashboard4FuerzaVentas(filtros),
  });

  // Dashboard 5: Marketplaces & Producto
  const { data: d5, isLoading: cD5 } = useQuery({
    queryKey: ["bi-d5-marketplaces", filtros],
    queryFn: () => obtenerDashboard5Marketplaces(filtros),
  });

  // Explorador de transacciones
  const { data: transaccionesDetalle, isLoading: cDetalle } = useQuery({
    queryKey: ["bi-transacciones-detalle", filtros, busquedaDetalle, paginaDetalle],
    queryFn: () => obtenerTransaccionesDetalle(filtros, busquedaDetalle, paginaDetalle, 25),
  });

  // Carga de archivo
  const alSeleccionarArchivo = async (file: File | null) => {
    setArchivo(file);
    setAviso([]);
    setProgreso(0);
    setEstado(null);

    if (!file) return;

    const esCsvFile = file.name.toLowerCase().endsWith(".csv");
    setEsCSV(esCsvFile);

    try {
      const meta = await inspeccionarEncabezados(file);
      const avisos: string[] = [];
      if (meta.columnasFaltantes.length > 0) {
        avisos.push(`Columnas no detectadas: ${meta.columnasFaltantes.join(", ")}`);
      }
      if (meta.columnasIgnoradas.length > 0) {
        avisos.push(`Columnas adicionales ignoradas: ${meta.columnasIgnoradas.join(", ")}`);
      }
      setAviso(avisos);
    } catch {
      // Continuar
    }
  };

  const carga = useMutation({
    mutationFn: async (file: File) => {
      setProgreso(0);
      setEstado("Iniciando procesamiento por streaming...");

      const res = await procesarArchivoPorStreaming({
        file,
        tamanoLote: TAMANO_LOTE,
        onProgreso: (p) => {
          setProgreso(p.porcentaje);
          setEstado(p.mensaje);
        },
        onLote: async (lote) => {
          return await ingestarLoteCliente(lote);
        },
      });

      await registrarCargaCliente(file.name, res.recibidas, res.nuevas);
      return res;
    },
    onSuccess: (r) => {
      setEstado(null);
      setProgreso(100);
      toast.success(
        `Carga completada: ${r.nuevas.toLocaleString("es-CO")} filas nuevas agregadas, ${(
          r.recibidas - r.nuevas
        ).toLocaleString("es-CO")} ya existentes.`
      );
      queryClient.invalidateQueries({ queryKey: ["resumen"] });
      queryClient.invalidateQueries({ queryKey: ["bi-d1-cumplimiento"] });
      queryClient.invalidateQueries({ queryKey: ["bi-d2-runrate"] });
      queryClient.invalidateQueries({ queryKey: ["bi-d3-digital"] });
      queryClient.invalidateQueries({ queryKey: ["bi-d4-fuerza"] });
      queryClient.invalidateQueries({ queryKey: ["bi-d5-marketplaces"] });
      queryClient.invalidateQueries({ queryKey: ["catalogos-filtros"] });
      queryClient.invalidateQueries({ queryKey: ["bi-transacciones-detalle"] });
    },
    onError: (e) => {
      setEstado(null);
      toast.error(e instanceof Error ? e.message : "Error al cargar el archivo");
    },
  });

  const exportarCSV = () => {
    if (!transaccionesDetalle?.filas || transaccionesDetalle.filas.length === 0) {
      toast.info("No hay datos para exportar");
      return;
    }
    const headers = [
      "Transacción", "Fecha", "Vendedor", "Canal", "Marca", "Línea", "Zona", "Ciudad", "SKU", "Producto", "Talla", "Color", "Cantidad", "Valor", "Costo Total"
    ];
    const csvRows = [
      headers.join(","),
      ...transaccionesDetalle.filas.map((f) => [
        `"${f.transaccion || ""}"`,
        `"${f.fecha || ""}"`,
        `"${f.vendedor || ""}"`,
        `"${f.canal || ""}"`,
        `"${f.marca || ""}"`,
        `"${f.linea || ""}"`,
        `"${f.zona || ""}"`,
        `"${f.ciudad || ""}"`,
        `"${f.sku || ""}"`,
        `"${f.producto || ""}"`,
        `"${f.talla || ""}"`,
        `"${f.color || ""}"`,
        f.cantidad ?? 0,
        f.valor ?? 0,
        f.costo_total ?? 0,
      ].join(","))
    ];
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ventas_reporte_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Reporte CSV descargado con éxito");
  };

  const salir = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header Superior */}
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground font-bold text-lg shadow-sm">
              N
            </div>
            <div>
              <p className="font-display text-lg font-bold tracking-tight text-foreground">Nexa BI</p>
              <p className="text-xs text-muted-foreground">Plataforma Consolidada de Inteligencia Comercial</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="hidden sm:inline-flex bg-muted/40 font-mono text-xs">
              {(resumen?.totalVentas ?? 0).toLocaleString("es-CO")} registros en base de datos
            </Badge>
            <Button variant="ghost" size="sm" onClick={salir}>
              Cerrar sesión
            </Button>
          </div>
        </div>

        {/* Barra de Filtros Globales (Slicers) */}
        <div className="border-t border-border/60 bg-muted/30 px-4 py-2 sm:px-6">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1">
              Filtros:
            </span>

            {/* Año */}
            <Select value={anio} onValueChange={setAnio}>
              <SelectTrigger className="h-8 w-[125px] text-xs bg-background">
                <SelectValue placeholder="Año" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los Años</SelectItem>
                {(catalogos?.anios || []).map((a) => (
                  <SelectItem key={a} value={String(a)}>
                    Año {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Mes */}
            <Select value={mes} onValueChange={setMes}>
              <SelectTrigger className="h-8 w-[115px] text-xs bg-background">
                <SelectValue placeholder="Mes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los Meses</SelectItem>
                {MESES.map((m) => (
                  <SelectItem key={m.num} value={String(m.num)}>
                    {m.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Canal */}
            <Select value={canalId} onValueChange={setCanalId}>
              <SelectTrigger className="h-8 w-[130px] text-xs bg-background">
                <SelectValue placeholder="Canal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los Canales</SelectItem>
                {(catalogos?.canales || []).map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Marca */}
            <Select value={marcaId} onValueChange={setMarcaId}>
              <SelectTrigger className="h-8 w-[130px] text-xs bg-background">
                <SelectValue placeholder="Marca" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas las Marcas</SelectItem>
                {(catalogos?.marcas || []).map((m) => (
                  <SelectItem key={m.id} value={String(m.id)}>
                    {m.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Vendedor */}
            <Select value={vendedorId} onValueChange={setVendedorId}>
              <SelectTrigger className="h-8 w-[140px] text-xs bg-background">
                <SelectValue placeholder="Vendedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los Vendedores</SelectItem>
                {(catalogos?.vendedores || []).map((v) => (
                  <SelectItem key={v.id} value={String(v.id)}>
                    {v.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Zona */}
            <Select value={zonaId} onValueChange={setZonaId}>
              <SelectTrigger className="h-8 w-[130px] text-xs bg-background">
                <SelectValue placeholder="Zona" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas las Zonas</SelectItem>
                {(catalogos?.zonas || []).map((z) => (
                  <SelectItem key={z.id} value={String(z.id)}>
                    {z.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hayFiltrosActivos && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                onClick={limpiarFiltros}
              >
                <FilterX className="mr-1 h-3.5 w-3.5" />
                Restablecer
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Contenido Principal con las 5 Vistas de Negocio + Detalle y Carga */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
        <Tabs defaultValue="d1" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-7 h-auto p-1 bg-muted/60">
            <TabsTrigger value="d1" className="flex items-center gap-1.5 py-2.5 text-xs font-medium">
              <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
              1. Cumplimiento
            </TabsTrigger>
            <TabsTrigger value="d2" className="flex items-center gap-1.5 py-2.5 text-xs font-medium">
              <Calendar className="h-3.5 w-3.5 text-emerald-500" />
              2. Run Rate Diario
            </TabsTrigger>
            <TabsTrigger value="d3" className="flex items-center gap-1.5 py-2.5 text-xs font-medium">
              <Globe className="h-3.5 w-3.5 text-indigo-500" />
              3. Digital & ROAS
            </TabsTrigger>
            <TabsTrigger value="d4" className="flex items-center gap-1.5 py-2.5 text-xs font-medium">
              <Award className="h-3.5 w-3.5 text-amber-500" />
              4. Fuerza Ventas
            </TabsTrigger>
            <TabsTrigger value="d5" className="flex items-center gap-1.5 py-2.5 text-xs font-medium">
              <ShoppingBag className="h-3.5 w-3.5 text-pink-500" />
              5. Marketplaces
            </TabsTrigger>
            <TabsTrigger value="explorador" className="flex items-center gap-1.5 py-2.5 text-xs font-medium">
              <FileSpreadsheet className="h-3.5 w-3.5 text-teal-500" />
              Explorador
            </TabsTrigger>
            <TabsTrigger value="carga" className="flex items-center gap-1.5 py-2.5 text-xs font-medium">
              <UploadCloud className="h-3.5 w-3.5 text-slate-500" />
              Cargar
            </TabsTrigger>
          </TabsList>

          {/* ========================================================================= */}
          {/* DASHBOARD 1: CUMPLIMIENTO Y CRECIMIENTO DE VENTAS (NIVEL DIRECTIVO) */}
          {/* ========================================================================= */}
          <TabsContent value="d1" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/60 pb-3">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground font-display">
                  Dashboard 1: Cumplimiento y Crecimiento de Ventas
                </h2>
                <p className="text-xs text-muted-foreground">
                  Evolución cronológica completa de ventas vs presupuesto (PPTO), crecimiento interanual (YoY) y tasa de devoluciones.
                </p>
              </div>
              <Badge variant="outline" className={`font-semibold ${colorSemaforo(d1?.kpis.cumplimientoGlobalPct ?? 0)}`}>
                {anio === "todos" ? "Histórico Completo" : `Año ${anio}`} • Cumplimiento: {d1?.kpis.cumplimientoGlobalPct ?? 0}%
              </Badge>
            </div>

            {/* Tarjetas KPI */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <CardKpi
                titulo="Venta Neta Total"
                valor={formatoCOPFull(d1?.kpis.ventaYTD ?? 0)}
                subtexto={`Presupuesto: ${formatoCOP(d1?.kpis.pptoYTD ?? 0)}`}
                icono={<DollarSign className="h-5 w-5 text-emerald-500" />}
                cargando={cD1}
              />
              <CardKpi
                titulo="Cumplimiento de Presupuesto"
                valor={`${d1?.kpis.cumplimientoGlobalPct ?? 0}%`}
                subtexto="Semaforización (≥100% Verde, 90-99% Amarillo, <90% Rojo)"
                icono={<Percent className="h-5 w-5 text-blue-500" />}
                cargando={cD1}
                badgeSemaforo={d1?.kpis.cumplimientoGlobalPct}
              />
              <CardKpi
                titulo="Volumen de Venta"
                valor={`${(d1?.kpis.volumenUnidades ?? 0).toLocaleString("es-CO")} unds`}
                subtexto="Prendas y artículos comercializados"
                icono={<Package className="h-5 w-5 text-indigo-500" />}
                cargando={cD1}
              />
              <CardKpi
                titulo="Tasa de Devolución"
                valor={`${d1?.kpis.tasaDevolucionGlobalPct ?? 0}%`}
                subtexto={`Devoluciones: ${formatoCOP(d1?.kpis.devolucionesTotal ?? 0)}`}
                icono={<ArrowDownRight className="h-5 w-5 text-rose-500" />}
                cargando={cD1}
              />
            </div>

            {/* Gráfico Mixto: Evolución de Todos los Meses Disponibles */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">
                      {anio === "todos" ? "Evolución Cronológica Completa de Ventas (Todos los Periodos)" : `Venta Real vs. Presupuesto Mensual (${anio})`}
                    </CardTitle>
                    <CardDescription>
                      {d1?.meses.length ?? 0} periodos registrados en el documento
                    </CardDescription>
                  </div>
                  <Badge variant="outline">
                    {anio === "todos" ? "Todo el Histórico" : `Año ${anio}`}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                {!d1?.meses || d1.meses.length === 0 ? (
                  <div className="h-[320px] grid place-items-center text-sm text-muted-foreground">Sin datos para el periodo seleccionado</div>
                ) : (
                  <div className="h-[340px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={d1.meses} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="nombreMes" tick={{ fontSize: 11 }} />
                        <YAxis yAxisId="left" tickFormatter={(v) => formatoCOP(v)} tick={{ fontSize: 12 }} width={80} />
                        <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 12 }} width={45} />
                        <Tooltip
                          formatter={(value: number, name: string) => {
                            if (name === "cumplimientoPct") return [`${value}%`, "% Cumplimiento"];
                            return [formatoCOPFull(value), name === "ventaReal" ? "Venta Real" : "Presupuesto (PPTO)"];
                          }}
                        />
                        <Legend
                          formatter={(v) => (v === "ventaReal" ? "Venta Real ($)" : v === "ppto" ? "Presupuesto ($ PPTO)" : "% Cumplimiento")}
                        />
                        <Bar yAxisId="left" dataKey="ventaReal" fill="#2563eb" radius={[4, 4, 0, 0]} />
                        <Bar yAxisId="left" dataKey="ppto" fill="#94a3b8" radius={[4, 4, 0, 0]} opacity={0.4} />
                        <Line yAxisId="right" type="monotone" dataKey="cumplimientoPct" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Dos Gráficos: Mix de Líneas y Tabla de Meses */}
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Mix por Línea de Producto</CardTitle>
                  <CardDescription>Aporte de cada línea al total de facturación</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={d1?.mixLineas || []} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis type="number" tickFormatter={(v) => formatoCOP(v)} />
                        <YAxis type="category" dataKey="linea" width={100} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: number) => [formatoCOPFull(v), "Ventas"]} />
                        <Bar dataKey="venta" fill="#8b5cf6" radius={[0, 4, 4, 0]}>
                          {(d1?.mixLineas || []).map((_, i) => (
                            <Cell key={`mix-linea-${i}`} fill={COLORES[i % COLORES.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Tabla Resumen Mes a Mes */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Detalle Cronológico Mes a Mes</CardTitle>
                  <CardDescription>Facturación y cumplimiento por periodo</CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto max-h-[300px]">
                  <table className="w-full text-xs text-left">
                    <thead className="border-b border-border/80 uppercase text-muted-foreground font-semibold bg-muted/20 sticky top-0">
                      <tr>
                        <th className="py-2 px-2.5">Periodo</th>
                        <th className="py-2 px-2.5 text-right">Venta Real</th>
                        <th className="py-2 px-2.5 text-right">PPTO</th>
                        <th className="py-2 px-2.5 text-right">% Cumpl.</th>
                        <th className="py-2 px-2.5 text-right">Unidades</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {(d1?.meses || []).map((m, idx) => (
                        <tr key={m.periodo || idx} className="hover:bg-muted/30">
                          <td className="py-2 px-2.5 font-medium">{m.nombreMes}</td>
                          <td className="py-2 px-2.5 text-right font-semibold">{formatoCOP(m.ventaReal)}</td>
                          <td className="py-2 px-2.5 text-right text-muted-foreground">{formatoCOP(m.ppto)}</td>
                          <td className="py-2 px-2.5 text-right">
                            <span className={`px-1.5 py-0.5 rounded text-[11px] font-semibold border ${colorSemaforo(m.cumplimientoPct)}`}>
                              {m.cumplimientoPct}%
                            </span>
                          </td>
                          <td className="py-2 px-2.5 text-right text-muted-foreground">{m.unidades.toLocaleString("es-CO")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ========================================================================= */}
          {/* DASHBOARD 2: CONTROL DE FACTURACIÓN Y RUN RATE DIARIO (OPERATIVO) */}
          {/* ========================================================================= */}
          <TabsContent value="d2" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/60 pb-3">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground font-display">
                  Dashboard 2: Control de Facturación y Run Rate Diario
                </h2>
                <p className="text-xs text-muted-foreground">
                  Periodo: <strong className="text-foreground">{d2?.kpis.mesSeleccionadoNombre}</strong> • Seguimiento diario, cuota por días hábiles, nuevo ticket diario exigido y brecha ($ Gap).
                </p>
              </div>
              <Badge variant="outline" className="bg-muted/40 font-mono text-xs">
                {d2?.kpis.diasHabilesTranscurridos ?? 0} de {d2?.kpis.diasHabilesTotales ?? 0} días hábiles
              </Badge>
            </div>

            {/* Tarjetas KPI de Run Rate */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <CardKpi
                titulo="Facturación Acumulada Mes"
                valor={formatoCOPFull(d2?.kpis.ventaAcumuladaMes ?? 0)}
                subtexto={`Meta Mes: ${formatoCOP(d2?.kpis.pptoMes ?? 0)} (${d2?.kpis.cumplimientoMesPct ?? 0}%)`}
                icono={<DollarSign className="h-5 w-5 text-emerald-500" />}
                cargando={cD2}
              />
              <CardKpi
                titulo="Meta Diaria (PPTO Diario)"
                valor={formatoCOPFull(d2?.kpis.metaDiariaFija ?? 0)}
                subtexto={`Calculado sobre ${d2?.kpis.diasHabilesTotales ?? 0} días hábiles`}
                icono={<Calendar className="h-5 w-5 text-blue-500" />}
                cargando={cD2}
              />
              <CardKpi
                titulo="Run Rate / Cuota Diaria Requerida"
                valor={formatoCOPFull(d2?.kpis.runRateRequerido ?? 0)}
                subtexto={`Para los ${d2?.kpis.diasHabilesRestantes ?? 0} días hábiles restantes`}
                icono={<Compass className="h-5 w-5 text-amber-500" />}
                cargando={cD2}
              />
              <CardKpi
                titulo="Brecha Acumulada ($ Gap)"
                valor={formatoCOPFull(d2?.kpis.brechaAcumulada ?? 0)}
                subtexto={d2?.kpis.brechaAcumulada && d2.kpis.brechaAcumulada >= 0 ? "Superávit frente a meta a la fecha" : "Déficit acumulado a la fecha"}
                icono={<ArrowUpRight className={`h-5 w-5 ${d2?.kpis.brechaAcumulada && d2.kpis.brechaAcumulada >= 0 ? "text-emerald-500" : "text-rose-500"}`} />}
                cargando={cD2}
              />
            </div>

            {/* Gráfico de Avance Acumulado: PPTO Acumulado vs Real Acumulado */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Curva de Avance Acumulado Diario vs. Meta ({d2?.kpis.mesSeleccionadoNombre})</CardTitle>
                <CardDescription>Evolución acumulativa día por día en el mes</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={d2?.dias || []} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={(v) => formatoCOP(v)} tick={{ fontSize: 12 }} width={80} />
                      <Tooltip formatter={(v: number) => [formatoCOPFull(v)]} />
                      <Legend formatter={(v) => (v === "ventaAcumulada" ? "Facturación Real Acumulada" : "Meta Presupuesto Acumulada")} />
                      <Line type="monotone" dataKey="ventaAcumulada" stroke="#2563eb" strokeWidth={3} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="pptoAcumulado" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Gráfico de Facturación Diaria vs Meta Diaria Fija */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Facturación Diaria Real vs. Meta por Día</CardTitle>
                <CardDescription>Desempeño diario frente a la cuota base diaria</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={d2?.dias || []} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={(v) => formatoCOP(v)} tick={{ fontSize: 12 }} width={80} />
                      <Tooltip formatter={(v: number) => [formatoCOPFull(v)]} />
                      <Legend formatter={(v) => (v === "ventaReal" ? "Venta Diaria Real" : "Meta Diaria")} />
                      <Bar dataKey="ventaReal" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Line type="monotone" dataKey="metaDiaria" stroke="#f59e0b" strokeWidth={2} dot={false} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========================================================================= */}
          {/* DASHBOARD 3: E-COMMERCE, SOCIAL SELLING Y MARKETING DIGITAL */}
          {/* ========================================================================= */}
          <TabsContent value="d3" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/60 pb-3">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground font-display">
                  Dashboard 3: E-Commerce, Social Selling y Marketing Digital
                </h2>
                <p className="text-xs text-muted-foreground">
                  Desglose de canales digitales (Tienda Virtual, Redes Sociales, Showroom), ROAS publicitario y costos SaaS.
                </p>
              </div>
              <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 border-indigo-500/30 font-semibold">
                ROAS Digital: {d3?.kpis.roas ?? 0}x
              </Badge>
            </div>

            {/* Tarjetas KPI Digital */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <CardKpi
                titulo="Venta Canal Digital Total"
                valor={formatoCOPFull(d3?.kpis.ventaDigitalTotal ?? 0)}
                subtexto={`${(d3?.kpis.unidadesDigitales ?? 0).toLocaleString("es-CO")} unidades vendidas`}
                icono={<ShoppingBag className="h-5 w-5 text-indigo-500" />}
                cargando={cD3}
              />
              <CardKpi
                titulo="Ticket Promedio por Unidad (AOV)"
                valor={formatoCOPFull(d3?.kpis.aovTicketPromedio ?? 0)}
                subtexto="Valor promedio facturado por prenda"
                icono={<Receipt className="h-5 w-5 text-emerald-500" />}
                cargando={cD3}
              />
              <CardKpi
                titulo="Inversión en Pauta (Meta + Google)"
                valor={formatoCOPFull(d3?.kpis.inversionTotalPauta ?? 0)}
                subtexto={`ROAS de Retorno: ${d3?.kpis.roas ?? 0}x sobre pauta`}
                icono={<DollarSign className="h-5 w-5 text-blue-500" />}
                cargando={cD3}
              />
              <CardKpi
                titulo="Gasto Plataformas SaaS"
                valor={formatoCOPFull(d3?.kpis.costoPlataformasSaas ?? 0)}
                subtexto="Clientify + Omnisend + Canva (ajustado TRM)"
                icono={<Layers className="h-5 w-5 text-slate-500" />}
                cargando={cD3}
              />
            </div>

            {/* Gráficos: Participación por canal digital y Gasto Pauta vs Ingresos */}
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Participación por Canal Digital</CardTitle>
                  <CardDescription>Tienda Virtual (Shopify) vs Redes Sociales vs Showroom</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={d3?.canalesDigitales || []}
                          dataKey="venta"
                          nameKey="canal"
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          innerRadius={50}
                          paddingAngle={3}
                        >
                          {(d3?.canalesDigitales || []).map((_, i) => (
                            <Cell key={`cell-d3-${i}`} fill={COLORES[i % COLORES.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => formatoCOPFull(v)} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Inversión en Pauta vs. Ventas Digitales</CardTitle>
                  <CardDescription>Elasticidad y retorno de la inversión publicitaria</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={d3?.pautaVsIngresos || []} margin={{ left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                        <YAxis tickFormatter={(v) => formatoCOP(v)} tick={{ fontSize: 11 }} width={75} />
                        <Tooltip formatter={(v: number, name: string) => [formatoCOPFull(v), name === "ventaDigital" ? "Ventas Digitales" : "Gasto Pauta"]} />
                        <Legend formatter={(v) => (v === "ventaDigital" ? "Ventas Digitales" : "Inversión en Pauta")} />
                        <Bar dataKey="ventaDigital" fill="#2563eb" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="gastoPauta" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ========================================================================= */}
          {/* DASHBOARD 4: FUERZA DE VENTAS Y CANALES B2B / MAYORISTAS */}
          {/* ========================================================================= */}
          <TabsContent value="d4" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/60 pb-3">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground font-display">
                  Dashboard 4: Fuerza de Ventas y Canales B2B / Mayoristas
                </h2>
                <p className="text-xs text-muted-foreground">
                  Rendimiento individual por asesor comercial, cumplimiento de cuota, comisiones (5%), viáticos y comercio exterior.
                </p>
              </div>
              <Badge variant="outline" className="bg-muted/40 font-mono text-xs">
                {d4?.kpis.totalAsesores ?? 0} asesores comerciales activos
              </Badge>
            </div>

            {/* Tarjetas KPI Fuerza de Ventas */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <CardKpi
                titulo="Facturación Fuerza Comercial"
                valor={formatoCOPFull(d4?.kpis.totalVentaFuerza ?? 0)}
                subtexto={`Nacional: ${formatoCOP(d4?.kpis.ventaNacional ?? 0)}`}
                icono={<DollarSign className="h-5 w-5 text-emerald-500" />}
                cargando={cD4}
              />
              <CardKpi
                titulo="Comisiones Estimadas (5%)"
                valor={formatoCOPFull(d4?.kpis.comisionesTotales ?? 0)}
                subtexto="Esquema comercial variable de ventas"
                icono={<Percent className="h-5 w-5 text-amber-500" />}
                cargando={cD4}
              />
              <CardKpi
                titulo="Comercio Exterior (Exportaciones)"
                valor={formatoCOPFull(d4?.kpis.ventaExportaciones ?? 0)}
                subtexto={`${d4?.kpis.pctExportaciones ?? 0}% del volumen total de ventas`}
                icono={<Globe className="h-5 w-5 text-blue-500" />}
                cargando={cD4}
              />
              <CardKpi
                titulo="Asesores Comerciales"
                valor={`${d4?.kpis.totalAsesores ?? 0}`}
                subtexto="Ejecutivos de cuenta y ruta nacional"
                icono={<Users className="h-5 w-5 text-indigo-500" />}
                cargando={cD4}
              />
            </div>

            {/* Tabla Matriz de Asesores con Cuota y Comisiones */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Ranking de Asesores Comerciales y Cumplimiento de Cuota</CardTitle>
                <CardDescription>Facturación, % participación de cartera, cuota individual y comisión calculada</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="border-b border-border/80 uppercase text-muted-foreground font-semibold bg-muted/20">
                    <tr>
                      <th className="py-2.5 px-3">Asesor Comercial</th>
                      <th className="py-2.5 px-3 text-right">Facturación ($)</th>
                      <th className="py-2.5 px-3 text-right">Unidades</th>
                      <th className="py-2.5 px-3 text-right">Cuota Asignada</th>
                      <th className="py-2.5 px-3 text-right">% Cumpl.</th>
                      <th className="py-2.5 px-3 text-right">% Cartera</th>
                      <th className="py-2.5 px-3 text-right">Comisión (5%)</th>
                      <th className="py-2.5 px-3 text-right">Viáticos Est.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {(d4?.asesores || []).map((a) => (
                      <tr key={a.vendedor} className="hover:bg-muted/30">
                        <td className="py-2.5 px-3 font-medium text-foreground">{a.vendedor}</td>
                        <td className="py-2.5 px-3 text-right font-semibold">{formatoCOPFull(a.ventaTotal)}</td>
                        <td className="py-2.5 px-3 text-right text-muted-foreground">{a.unidades.toLocaleString("es-CO")}</td>
                        <td className="py-2.5 px-3 text-right text-muted-foreground">{formatoCOP(a.cuotaAsignada)}</td>
                        <td className="py-2.5 px-3 text-right">
                          <span className={`px-1.5 py-0.5 rounded text-[11px] font-semibold border ${colorSemaforo(a.cumplimientoPct)}`}>
                            {a.cumplimientoPct}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium">{a.participacionCarteraPct}%</td>
                        <td className="py-2.5 px-3 text-right font-semibold text-emerald-600">{formatoCOP(a.comisionEstimada)}</td>
                        <td className="py-2.5 px-3 text-right text-muted-foreground">{formatoCOP(a.viaticosZona)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========================================================================= */}
          {/* DASHBOARD 5: MARKETPLACES Y ANÁLISIS DE PRODUCTO (COMERGAIN / RETAIL) */}
          {/* ========================================================================= */}
          <TabsContent value="d5" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/60 pb-3">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground font-display">
                  Dashboard 5: Marketplaces y Análisis de Producto (Comergain / Retail)
                </h2>
                <p className="text-xs text-muted-foreground">
                  Desempeño en Mercado Libre, Falabella, Dafiti, Linio, rotación por SKU, curva de tallas y colores líderes.
                </p>
              </div>
              <Badge variant="outline" className="bg-muted/40 font-mono text-xs">
                {d5?.kpis.totalReferenciasActivas ?? 0} SKUs activos
              </Badge>
            </div>

            {/* Tarjetas KPI Marketplaces */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <CardKpi
                titulo="Venta Total Marketplaces"
                valor={formatoCOPFull(d5?.kpis.ventaTotalMarketplaces ?? 0)}
                subtexto={`${(d5?.kpis.unidadesMarketplaces ?? 0).toLocaleString("es-CO")} unidades vendidas`}
                icono={<ShoppingBag className="h-5 w-5 text-pink-500" />}
                cargando={cD5}
              />
              <CardKpi
                titulo="Precio Promedio por SKU"
                valor={formatoCOPFull(d5?.kpis.precioPromedioSKU ?? 0)}
                subtexto="Valor promedio por unidad en marketplaces"
                icono={<Tag className="h-5 w-5 text-emerald-500" />}
                cargando={cD5}
              />
              <CardKpi
                titulo="Referencias Activas"
                valor={`${(d5?.kpis.totalReferenciasActivas ?? 0).toLocaleString("es-CO")}`}
                subtexto="Catálogo en rotación digital"
                icono={<Package className="h-5 w-5 text-blue-500" />}
                cargando={cD5}
              />
              <CardKpi
                titulo="Marketplaces Integrados"
                valor="4 Canales"
                subtexto="Mercado Libre, Falabella, Dafiti, Linio"
                icono={<Layers className="h-5 w-5 text-indigo-500" />}
                cargando={cD5}
              />
            </div>

            {/* Gráficos: Donut de Marketplaces y Curva de Tallas */}
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Participación por Marketplace</CardTitle>
                  <CardDescription>Cuota de facturación de Mercado Libre, Falabella, Dafiti y Linio</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={d5?.marketplaces || []}
                          dataKey="venta"
                          nameKey="nombre"
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          innerRadius={50}
                          paddingAngle={3}
                        >
                          {(d5?.marketplaces || []).map((_, i) => (
                            <Cell key={`cell-mp-${i}`} fill={COLORES[i % COLORES.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => formatoCOPFull(v)} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Curva de Tallas */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Curva de Demanda por Tallas</CardTitle>
                  <CardDescription>Tallas con mayor volumen de reposición y demanda</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={d5?.curvaTallas || []} margin={{ left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="talla" tick={{ fontSize: 12 }} />
                        <YAxis tickFormatter={(v) => v.toLocaleString("es-CO")} tick={{ fontSize: 11 }} width={55} />
                        <Tooltip formatter={(v: number) => [`${v.toLocaleString("es-CO")} unds`, "Unidades"]} />
                        <Bar dataKey="unidades" fill="#ec4899" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top 10 Referencias Más Vendidas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Top 10 Referencias / SKUs Líderes</CardTitle>
                <CardDescription>Productos de mayor rotación y recaudación</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="border-b border-border/80 uppercase text-muted-foreground font-semibold bg-muted/20">
                    <tr>
                      <th className="py-2.5 px-3">SKU</th>
                      <th className="py-2.5 px-3">Producto / Referencia</th>
                      <th className="py-2.5 px-3 text-right">Unidades Vendidas</th>
                      <th className="py-2.5 px-3 text-right">Facturación Total</th>
                      <th className="py-2.5 px-3 text-right">Precio Promedio Unitario</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {(d5?.topReferencias || []).map((ref) => (
                      <tr key={ref.sku} className="hover:bg-muted/30">
                        <td className="py-2.5 px-3 font-mono font-semibold text-primary">{ref.sku}</td>
                        <td className="py-2.5 px-3 font-medium text-foreground">{ref.producto}</td>
                        <td className="py-2.5 px-3 text-right font-medium">{ref.unidades.toLocaleString("es-CO")}</td>
                        <td className="py-2.5 px-3 text-right font-semibold">{formatoCOPFull(ref.valor)}</td>
                        <td className="py-2.5 px-3 text-right text-muted-foreground">{formatoCOP(ref.precioPromedio)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========================================================================= */}
          {/* TAB 6: EXPLORADOR DE TRANSACCIONES */}
          {/* ========================================================================= */}
          <TabsContent value="explorador" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">Explorador de Transacciones y Ventas</CardTitle>
                    <CardDescription>
                      {(transaccionesDetalle?.total ?? 0).toLocaleString("es-CO")} transacciones encontradas
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative w-full sm:w-[260px]">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar SKU, producto o transacción..."
                        value={busquedaDetalle}
                        onChange={(e) => {
                          setBusquedaDetalle(e.target.value);
                          setPaginaDetalle(0);
                        }}
                        className="pl-9 h-9 text-xs"
                      />
                    </div>
                    <Button variant="outline" size="sm" onClick={exportarCSV} className="h-9 text-xs">
                      <Download className="mr-1.5 h-3.5 w-3.5" />
                      Exportar CSV
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {cDetalle ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">Consultando base de datos...</div>
                ) : !transaccionesDetalle?.filas || transaccionesDetalle.filas.length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">No se encontraron registros con los filtros seleccionados.</div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-border/80 uppercase text-muted-foreground font-semibold bg-muted/20">
                      <tr>
                        <th className="py-2.5 px-3">Transacción</th>
                        <th className="py-2.5 px-3">Fecha</th>
                        <th className="py-2.5 px-3">Vendedor</th>
                        <th className="py-2.5 px-3">Canal</th>
                        <th className="py-2.5 px-3">Marca</th>
                        <th className="py-2.5 px-3">SKU</th>
                        <th className="py-2.5 px-3">Producto</th>
                        <th className="py-2.5 px-3">Talla/Color</th>
                        <th className="py-2.5 px-3 text-right">Cant.</th>
                        <th className="py-2.5 px-3 text-right">Venta ($)</th>
                        <th className="py-2.5 px-3 text-right">Costo ($)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 font-normal">
                      {transaccionesDetalle.filas.map((f) => (
                        <tr key={f.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-2 px-3 font-mono text-primary">{f.transaccion || "—"}</td>
                          <td className="py-2 px-3 text-muted-foreground whitespace-nowrap">{f.fecha || "—"}</td>
                          <td className="py-2 px-3">{f.vendedor || "—"}</td>
                          <td className="py-2 px-3">{f.canal || "—"}</td>
                          <td className="py-2 px-3">{f.marca || "—"}</td>
                          <td className="py-2 px-3 font-mono">{f.sku || "—"}</td>
                          <td className="py-2 px-3 font-medium text-foreground max-w-[200px] truncate">{f.producto || "—"}</td>
                          <td className="py-2 px-3 text-muted-foreground">{f.talla || ""}{f.color ? ` / ${f.color}` : ""}</td>
                          <td className="py-2 px-3 text-right font-medium">{f.cantidad ?? 0}</td>
                          <td className="py-2 px-3 text-right font-semibold">{formatoCOPFull(f.valor ?? 0)}</td>
                          <td className="py-2 px-3 text-right text-muted-foreground">{formatoCOPFull(f.costo_total ?? 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                <div className="flex items-center justify-between border-t border-border/60 pt-4 mt-2">
                  <p className="text-xs text-muted-foreground">
                    Página {paginaDetalle + 1} de {Math.max(1, Math.ceil((transaccionesDetalle?.total ?? 0) / 25))}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={paginaDetalle === 0}
                      onClick={() => setPaginaDetalle((p) => Math.max(0, p - 1))}
                      className="h-8 text-xs"
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={(paginaDetalle + 1) * 25 >= (transaccionesDetalle?.total ?? 0)}
                      onClick={() => setPaginaDetalle((p) => p + 1)}
                      className="h-8 text-xs"
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========================================================================= */}
          {/* TAB 7: CARGA DE ARCHIVOS E HISTORIAL */}
          {/* ========================================================================= */}
          <TabsContent value="carga" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-display">Cargar histórico de ventas</CardTitle>
                <CardDescription>
                  Sube el archivo Excel o CSV. La primera carga crea la base inicial; en las
                  siguientes sólo se agregan los registros nuevos (días, meses y años posteriores).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-6 py-12 text-center transition-colors hover:border-primary/60">
                  <span className="font-medium text-foreground">
                    {archivo ? archivo.name : "Selecciona o arrastra tu archivo"}
                  </span>
                  <span className="text-xs text-muted-foreground">.csv (recomendado para streaming sin límite de tamaño), .xlsx o .xls</span>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    disabled={carga.isPending}
                    onChange={(e) => alSeleccionarArchivo(e.target.files?.[0] ?? null)}
                  />
                </label>

                {archivo && !esCSV && (
                  <div className="rounded-lg border border-border/80 bg-muted/20 p-3 text-xs text-muted-foreground">
                    💡 <strong className="text-foreground">Consejo de rendimiento:</strong> Si tu histórico tiene más de 50.000 filas, guardarlo en formato <strong className="text-foreground">.CSV</strong> permite procesamiento en streaming instantáneo consumiendo menos de 20 MB de memoria.
                  </div>
                )}

                {carga.isPending && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{estado}</span>
                      <span className="font-semibold text-foreground">{progreso}%</span>
                    </div>
                    <Progress value={progreso} />
                  </div>
                )}

                {aviso.length > 0 && (
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {aviso.map((a) => (
                      <li key={a}>• {a}</li>
                    ))}
                  </ul>
                )}

                <Button
                  disabled={!archivo || carga.isPending}
                  onClick={() => archivo && carga.mutate(archivo)}
                >
                  {carga.isPending ? "Procesando en streaming..." : "Procesar archivo"}
                </Button>
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="font-display text-base">Historial de cargas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(resumen?.historial ?? []).length === 0 && (
                    <p className="text-sm text-muted-foreground">Aún no hay cargas registradas.</p>
                  )}
                  {(resumen?.historial ?? []).map((h) => (
                    <div
                      key={h.id}
                      className="flex items-center justify-between border-b border-border/50 pb-2 text-sm last:border-0"
                    >
                      <div>
                        <p className="font-medium text-foreground">{h.archivo}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(h.created_at).toLocaleString("es-CO")}
                        </p>
                      </div>
                      <div className="text-right text-xs">
                        <p className="text-primary font-semibold">+{h.filas_nuevas.toLocaleString("es-CO")} nuevas</p>
                        <p className="text-muted-foreground">
                          {h.filas_recibidas.toLocaleString("es-CO")} leídas
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="font-display text-base">Estructura esperada</CardTitle>
                  <CardDescription>
                    Las columnas resaltadas se guardan como catálogos (dimensiones) reutilizables.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-1.5">
                  {COLUMNAS_ESPERADAS.map((c) => (
                    <Badge key={c} variant={COLUMNAS_DIMENSION.includes(c) ? "default" : "secondary"}>
                      {c}
                    </Badge>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function CardKpi({
  titulo,
  valor,
  subtexto,
  icono,
  cargando,
  badgeSemaforo,
}: {
  titulo: string;
  valor: string;
  subtexto?: string;
  icono?: React.ReactNode;
  cargando?: boolean;
  badgeSemaforo?: number;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{titulo}</p>
          {icono && <div className="p-1.5 rounded-md bg-muted/40">{icono}</div>}
        </div>
        <div className="flex items-baseline gap-2 mt-2">
          <p className="text-2xl font-bold font-display tracking-tight text-foreground">
            {cargando ? "—" : valor}
          </p>
          {badgeSemaforo !== undefined && (
            <span className={`px-1.5 py-0.5 text-[11px] font-bold rounded border ${colorSemaforo(badgeSemaforo)}`}>
              {badgeSemaforo >= 100 ? "Meta Cumplida" : badgeSemaforo >= 90 ? "Alerta" : "Crítico"}
            </span>
          )}
        </div>
        {subtexto && <p className="mt-1 text-xs text-muted-foreground">{subtexto}</p>}
      </CardContent>
    </Card>
  );
}
