import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ingestarLoteCliente,
  registrarCargaCliente,
  obtenerResumenCliente,
  obtenerCatalogosFiltros,
  obtenerKpisBI,
  obtenerVentasTiempo,
  obtenerRankingDimension,
  obtenerTopProductos,
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
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
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
  LayoutDashboard,
  BarChart3,
  Tag,
  MapPin,
  FileSpreadsheet,
  Search,
} from "lucide-react";
import { toast } from "sonner";

const TAMANO_LOTE = 1000;
const COLORES = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316", "#64748b"];

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

function formatoMoneda(val: number) {
  if (val >= 1_000_000_000) {
    return `$${(val / 1_000_000_000).toFixed(2)}B`;
  }
  if (val >= 1_000_000) {
    return `$${(val / 1_000_000).toFixed(1)}M`;
  }
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(val);
}

function formatoMonedaCompleto(val: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(val);
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

  // Estados de filtros
  const [anio, setAnio] = useState<string>("todos");
  const [mes, setMes] = useState<string>("todos");
  const [canalId, setCanalId] = useState<string>("todos");
  const [marcaId, setMarcaId] = useState<string>("todos");
  const [vendedorId, setVendedorId] = useState<string>("todos");
  const [zonaId, setZonaId] = useState<string>("todos");

  // Estado del explorador de transacciones
  const [busquedaDetalle, setBusquedaDetalle] = useState("");
  const [paginaDetalle, setPaginaDetalle] = useState(0);

  // Estados de carga de archivos
  const [archivo, setArchivo] = useState<File | null>(null);
  const [progreso, setProgreso] = useState(0);
  const [estado, setEstado] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string[]>([]);
  const [esCSV, setEsCSV] = useState(false);

  // Construir objeto de filtros
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

  // Queries
  const { data: resumen } = useQuery({
    queryKey: ["resumen"],
    queryFn: () => obtenerResumenCliente(),
  });

  const { data: catalogos } = useQuery({
    queryKey: ["catalogos-filtros"],
    queryFn: () => obtenerCatalogosFiltros(),
  });

  const { data: kpis, isLoading: cargandoKpis } = useQuery({
    queryKey: ["bi-kpis", filtros],
    queryFn: () => obtenerKpisBI(filtros),
  });

  const { data: ventasTiempo, isLoading: cargandoTiempo } = useQuery({
    queryKey: ["bi-ventas-tiempo", filtros],
    queryFn: () => obtenerVentasTiempo(filtros),
  });

  const { data: rankingVendedores } = useQuery({
    queryKey: ["bi-ranking-vendedores", filtros],
    queryFn: () => obtenerRankingDimension("vendedor", filtros, 10),
  });

  const { data: rankingCanales } = useQuery({
    queryKey: ["bi-ranking-canales", filtros],
    queryFn: () => obtenerRankingDimension("canal", filtros, 10),
  });

  const { data: rankingMarcas } = useQuery({
    queryKey: ["bi-ranking-marcas", filtros],
    queryFn: () => obtenerRankingDimension("marca", filtros, 10),
  });

  const { data: rankingLineas } = useQuery({
    queryKey: ["bi-ranking-lineas", filtros],
    queryFn: () => obtenerRankingDimension("linea", filtros, 10),
  });

  const { data: rankingZonas } = useQuery({
    queryKey: ["bi-ranking-zonas", filtros],
    queryFn: () => obtenerRankingDimension("zona", filtros, 10),
  });

  const { data: rankingCiudades } = useQuery({
    queryKey: ["bi-ranking-ciudades", filtros],
    queryFn: () => obtenerRankingDimension("ciudad", filtros, 10),
  });

  const { data: rankingColecciones } = useQuery({
    queryKey: ["bi-ranking-colecciones", filtros],
    queryFn: () => obtenerRankingDimension("coleccion", filtros, 10),
  });

  const { data: topProductos } = useQuery({
    queryKey: ["bi-top-productos", filtros],
    queryFn: () => obtenerTopProductos(filtros, 10),
  });

  const { data: transaccionesDetalle, isLoading: cargandoDetalle } = useQuery({
    queryKey: ["bi-transacciones-detalle", filtros, busquedaDetalle, paginaDetalle],
    queryFn: () => obtenerTransaccionesDetalle(filtros, busquedaDetalle, paginaDetalle, 25),
  });

  // Manejador de selección de archivo
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

  // Mutación de Carga por Streaming
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
      queryClient.invalidateQueries({ queryKey: ["bi-kpis"] });
      queryClient.invalidateQueries({ queryKey: ["bi-ventas-tiempo"] });
      queryClient.invalidateQueries({ queryKey: ["catalogos-filtros"] });
      queryClient.invalidateQueries({ queryKey: ["bi-ranking-vendedores"] });
      queryClient.invalidateQueries({ queryKey: ["bi-ranking-canales"] });
      queryClient.invalidateQueries({ queryKey: ["bi-ranking-marcas"] });
      queryClient.invalidateQueries({ queryKey: ["bi-top-productos"] });
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
    link.setAttribute("download", `ventas_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Archivo CSV descargado");
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
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground font-bold text-lg">
              N
            </div>
            <div>
              <p className="font-display text-lg font-bold tracking-tight text-foreground">Nexa BI</p>
              <p className="text-xs text-muted-foreground">Plataforma de Business Intelligence & Ventas</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="hidden sm:inline-flex bg-muted/40">
              {(resumen?.totalVentas ?? 0).toLocaleString("es-CO")} registros históricos
            </Badge>
            <Button variant="ghost" size="sm" onClick={salir}>
              Cerrar sesión
            </Button>
          </div>
        </div>

        {/* Barra de Filtros Globales Interactivos */}
        <div className="border-t border-border/60 bg-muted/20 px-4 py-2 sm:px-6">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1">
              Filtros:
            </span>

            {/* Año */}
            <Select value={anio} onValueChange={setAnio}>
              <SelectTrigger className="h-8 w-[110px] text-xs bg-background">
                <SelectValue placeholder="Año" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los Años</SelectItem>
                {(catalogos?.anios || []).map((a) => (
                  <SelectItem key={a} value={String(a)}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Mes */}
            <Select value={mes} onValueChange={setMes}>
              <SelectTrigger className="h-8 w-[110px] text-xs bg-background">
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
                Limpiar
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Contenido Principal con Pestañas */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
        <Tabs defaultValue="resumen" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 h-auto p-1 bg-muted/60">
            <TabsTrigger value="resumen" className="flex items-center gap-1.5 py-2 text-xs">
              <LayoutDashboard className="h-3.5 w-3.5" />
              Resumen
            </TabsTrigger>
            <TabsTrigger value="vendedores" className="flex items-center gap-1.5 py-2 text-xs">
              <Users className="h-3.5 w-3.5" />
              Vendedores
            </TabsTrigger>
            <TabsTrigger value="productos" className="flex items-center gap-1.5 py-2 text-xs">
              <Tag className="h-3.5 w-3.5" />
              Productos
            </TabsTrigger>
            <TabsTrigger value="geografia" className="flex items-center gap-1.5 py-2 text-xs">
              <MapPin className="h-3.5 w-3.5" />
              Geografía
            </TabsTrigger>
            <TabsTrigger value="explorador" className="flex items-center gap-1.5 py-2 text-xs">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Detalle
            </TabsTrigger>
            <TabsTrigger value="carga" className="flex items-center gap-1.5 py-2 text-xs">
              <UploadCloud className="h-3.5 w-3.5" />
              Cargar Datos
            </TabsTrigger>
          </TabsList>

          {/* ========================================================================= */}
          {/* TAB 1: RESUMEN EJECUTIVO */}
          {/* ========================================================================= */}
          <TabsContent value="resumen" className="space-y-6">
            {/* Tarjetas de KPIs Primarios */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <CardKpi
                titulo="Ventas Totales"
                valor={formatoMonedaCompleto(kpis?.totalVentas ?? 0)}
                subtexto="Ingresos brutos acumulados"
                icono={<DollarSign className="h-5 w-5 text-emerald-500" />}
                cargando={cargandoKpis}
              />
              <CardKpi
                titulo="Unidades Vendidas"
                valor={(kpis?.totalCantidad ?? 0).toLocaleString("es-CO")}
                subtexto="Prendas / Artículos comercializados"
                icono={<Package className="h-5 w-5 text-blue-500" />}
                cargando={cargandoKpis}
              />
              <CardKpi
                titulo="Margen Bruto"
                valor={formatoMonedaCompleto(kpis?.margenBruto ?? 0)}
                subtexto={`${kpis?.margenPct ?? 0}% de rentabilidad bruta`}
                icono={<Percent className="h-5 w-5 text-indigo-500" />}
                cargando={cargandoKpis}
              />
              <CardKpi
                titulo="Ticket Promedio"
                valor={formatoMonedaCompleto(kpis?.ticketPromedio ?? 0)}
                subtexto={`Promedio por transacción (${(kpis?.totalTransacciones ?? 0).toLocaleString("es-CO")} transacciones)`}
                icono={<Receipt className="h-5 w-5 text-amber-500" />}
                cargando={cargandoKpis}
              />
            </div>

            {/* Gráfico Principal: Evolución Temporal de Ventas vs Margen */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">Evolución de Ventas y Margen Bruto</CardTitle>
                    <CardDescription>Comportamiento mensual de ingresos y rentabilidad</CardDescription>
                  </div>
                  <Badge variant="outline">Tendencia</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                {cargandoTiempo ? (
                  <div className="h-[300px] grid place-items-center text-sm text-muted-foreground">Cargando gráfico...</div>
                ) : !ventasTiempo || ventasTiempo.length === 0 ? (
                  <div className="h-[300px] grid place-items-center text-sm text-muted-foreground">No hay datos para el periodo seleccionado</div>
                ) : (
                  <div className="h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={ventasTiempo} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorMargen" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="periodo" tick={{ fontSize: 12 }} />
                        <YAxis tickFormatter={(val) => formatoMoneda(val)} tick={{ fontSize: 12 }} width={75} />
                        <Tooltip
                          formatter={(value: number, name: string) => [
                            formatoMonedaCompleto(value),
                            name === "totalVentas" ? "Ventas Totales" : "Margen Bruto",
                          ]}
                          labelFormatter={(label) => `Periodo: ${label}`}
                        />
                        <Legend
                          formatter={(value) => (value === "totalVentas" ? "Ventas Totales" : "Margen Bruto")}
                        />
                        <Area type="monotone" dataKey="totalVentas" stroke="#3b82f6" fillOpacity={1} fill="url(#colorVentas)" strokeWidth={2} />
                        <Area type="monotone" dataKey="margenBruto" stroke="#10b981" fillOpacity={1} fill="url(#colorMargen)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Dos Gráficos Secundarios: Canales y Marcas */}
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Participación por Canal de Venta</CardTitle>
                  <CardDescription>Distribución de ingresos por canal comercial</CardDescription>
                </CardHeader>
                <CardContent>
                  {!rankingCanales || rankingCanales.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-10">Sin datos de canales</p>
                  ) : (
                    <div className="h-[260px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={rankingCanales}
                            dataKey="totalVentas"
                            nameKey="nombre"
                            cx="50%"
                            cy="50%"
                            outerRadius={85}
                            innerRadius={50}
                            paddingAngle={3}
                          >
                            {rankingCanales.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORES[index % COLORES.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => formatoMonedaCompleto(value)} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Top Marcas por Ventas</CardTitle>
                  <CardDescription>Marcas con mayor facturación en el periodo</CardDescription>
                </CardHeader>
                <CardContent>
                  {!rankingMarcas || rankingMarcas.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-10">Sin datos de marcas</p>
                  ) : (
                    <div className="h-[260px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={rankingMarcas.slice(0, 6)} layout="vertical" margin={{ left: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                          <XAxis type="number" tickFormatter={(val) => formatoMoneda(val)} />
                          <YAxis type="category" dataKey="nombre" width={90} tick={{ fontSize: 12 }} />
                          <Tooltip formatter={(value: number) => [formatoMonedaCompleto(value), "Ventas"]} />
                          <Bar dataKey="totalVentas" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ========================================================================= */}
          {/* TAB 2: VENDEDORES Y CANALES */}
          {/* ========================================================================= */}
          <TabsContent value="vendedores" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Ranking Gráfico de Vendedores */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Top Vendedores por Facturación</CardTitle>
                  <CardDescription>Ingresos y unidades generadas por cada asesor comercial</CardDescription>
                </CardHeader>
                <CardContent>
                  {!rankingVendedores || rankingVendedores.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-10">Sin datos de vendedores</p>
                  ) : (
                    <div className="h-[340px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={rankingVendedores} layout="vertical" margin={{ left: 30 }}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                          <XAxis type="number" tickFormatter={(val) => formatoMoneda(val)} />
                          <YAxis type="category" dataKey="nombre" width={110} tick={{ fontSize: 11 }} />
                          <Tooltip
                            formatter={(value: number, name: string) => [
                              name === "totalVentas" ? formatoMonedaCompleto(value) : value.toLocaleString("es-CO"),
                              name === "totalVentas" ? "Ventas" : "Unidades",
                            ]}
                          />
                          <Legend formatter={(v) => (v === "totalVentas" ? "Ventas ($)" : "Unidades (Cant.)")} />
                          <Bar dataKey="totalVentas" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Resumen Canales */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Desempeño por Canal</CardTitle>
                  <CardDescription>Facturación y margen por canal</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(rankingCanales || []).map((c, i) => (
                    <div key={c.id || i} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium">
                        <span>{c.nombre}</span>
                        <span className="text-foreground">{formatoMonedaCompleto(c.totalVentas)}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span>{c.totalCantidad.toLocaleString("es-CO")} unidades</span>
                        <span className="text-emerald-600 font-semibold">{c.margenPct}% margen</span>
                      </div>
                      <Progress value={Math.min(100, (c.totalVentas / (rankingCanales?.[0]?.totalVentas || 1)) * 100)} className="h-1.5" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Tabla Detallada de Vendedores */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Tabla Comparativa de Asesores Comerciales</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border/80 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="py-2.5 px-3">Vendedor</th>
                      <th className="py-2.5 px-3 text-right">Ventas Totales</th>
                      <th className="py-2.5 px-3 text-right">Unidades</th>
                      <th className="py-2.5 px-3 text-right">Margen Bruto</th>
                      <th className="py-2.5 px-3 text-right">% Rentabilidad</th>
                      <th className="py-2.5 px-3 text-right">Transacciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {(rankingVendedores || []).map((v) => (
                      <tr key={v.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-3 font-medium text-foreground">{v.nombre}</td>
                        <td className="py-2.5 px-3 text-right font-semibold">{formatoMonedaCompleto(v.totalVentas)}</td>
                        <td className="py-2.5 px-3 text-right text-muted-foreground">{v.totalCantidad.toLocaleString("es-CO")}</td>
                        <td className="py-2.5 px-3 text-right text-emerald-600 font-medium">{formatoMonedaCompleto(v.margenBruto)}</td>
                        <td className="py-2.5 px-3 text-right">
                          <Badge variant={v.margenPct >= 40 ? "default" : "secondary"}>{v.margenPct}%</Badge>
                        </td>
                        <td className="py-2.5 px-3 text-right text-muted-foreground">{v.transacciones.toLocaleString("es-CO")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========================================================================= */}
          {/* TAB 3: PRODUCTOS, LÍNEAS Y COLECCIONES */}
          {/* ========================================================================= */}
          <TabsContent value="productos" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Ventas por Línea */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Ventas por Línea de Producto</CardTitle>
                  <CardDescription>Rendimiento comercial por categoría de producto</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={rankingLineas || []} margin={{ left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="nombre" tick={{ fontSize: 11 }} />
                        <YAxis tickFormatter={(v) => formatoMoneda(v)} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: number) => [formatoMonedaCompleto(v), "Ventas"]} />
                        <Bar dataKey="totalVentas" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Ventas por Colección */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Ventas por Colección</CardTitle>
                  <CardDescription>Desempeño por temporada / colección</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={rankingColecciones || []} margin={{ left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="nombre" tick={{ fontSize: 11 }} />
                        <YAxis tickFormatter={(v) => formatoMoneda(v)} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: number) => [formatoMonedaCompleto(v), "Ventas"]} />
                        <Bar dataKey="totalVentas" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top 10 SKUs / Prendas Estrella */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Top 10 Productos / SKUs Más Vendidos</CardTitle>
                <CardDescription>Prendas líderes en facturación, volumen y margen</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border/80 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="py-2.5 px-3">SKU</th>
                      <th className="py-2.5 px-3">Producto / Prenda</th>
                      <th className="py-2.5 px-3">Talla</th>
                      <th className="py-2.5 px-3">Color</th>
                      <th className="py-2.5 px-3 text-right">Unidades</th>
                      <th className="py-2.5 px-3 text-right">Ventas Totales</th>
                      <th className="py-2.5 px-3 text-right">Margen Bruto</th>
                      <th className="py-2.5 px-3 text-right">% Rent.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {(topProductos || []).map((p, i) => (
                      <tr key={p.sku || i} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-xs font-semibold text-primary">{p.sku}</td>
                        <td className="py-2.5 px-3 font-medium text-foreground">{p.producto}</td>
                        <td className="py-2.5 px-3 text-muted-foreground">{p.talla || "—"}</td>
                        <td className="py-2.5 px-3 text-muted-foreground">{p.color || "—"}</td>
                        <td className="py-2.5 px-3 text-right font-medium">{p.totalCantidad.toLocaleString("es-CO")}</td>
                        <td className="py-2.5 px-3 text-right font-semibold">{formatoMonedaCompleto(p.totalVentas)}</td>
                        <td className="py-2.5 px-3 text-right text-emerald-600 font-medium">{formatoMonedaCompleto(p.margenBruto)}</td>
                        <td className="py-2.5 px-3 text-right">
                          <Badge variant="outline">{p.margenPct}%</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========================================================================= */}
          {/* TAB 4: ANÁLISIS GEOGRÁFICO */}
          {/* ========================================================================= */}
          <TabsContent value="geografia" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Ventas por Zona */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Ventas por Zona Colombia</CardTitle>
                  <CardDescription>Distribución regional de ingresos</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={rankingZonas || []} layout="vertical" margin={{ left: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis type="number" tickFormatter={(v) => formatoMoneda(v)} />
                        <YAxis type="category" dataKey="nombre" width={110} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: number) => [formatoMonedaCompleto(v), "Ventas"]} />
                        <Bar dataKey="totalVentas" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Ventas por Ciudad */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Top Ciudades</CardTitle>
                  <CardDescription>Ciudades con mayor facturación</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={rankingCiudades || []} layout="vertical" margin={{ left: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis type="number" tickFormatter={(v) => formatoMoneda(v)} />
                        <YAxis type="category" dataKey="nombre" width={110} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: number) => [formatoMonedaCompleto(v), "Ventas"]} />
                        <Bar dataKey="totalVentas" fill="#10b981" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ========================================================================= */}
          {/* TAB 5: EXPLORADOR DE TRANSACCIONES */}
          {/* ========================================================================= */}
          <TabsContent value="explorador" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">Explorador de Ventas y Transacciones</CardTitle>
                    <CardDescription>
                      {(transaccionesDetalle?.total ?? 0).toLocaleString("es-CO")} registros encontrados
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
                {cargandoDetalle ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">Consultando registros...</div>
                ) : !transaccionesDetalle?.filas || transaccionesDetalle.filas.length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">No se encontraron transacciones con los filtros actuales.</div>
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
                          <td className="py-2 px-3 text-right font-semibold">{formatoMonedaCompleto(f.valor ?? 0)}</td>
                          <td className="py-2 px-3 text-right text-muted-foreground">{formatoMonedaCompleto(f.costo_total ?? 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* Paginador */}
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
          {/* TAB 6: CARGA DE DATOS E HISTORIAL */}
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
}: {
  titulo: string;
  valor: string;
  subtexto?: string;
  icono?: React.ReactNode;
  cargando?: boolean;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{titulo}</p>
          {icono && <div className="p-1.5 rounded-md bg-muted/40">{icono}</div>}
        </div>
        <p className="mt-2 text-2xl font-bold font-display tracking-tight text-foreground">
          {cargando ? "—" : valor}
        </p>
        {subtexto && <p className="mt-1 text-xs text-muted-foreground">{subtexto}</p>}
      </CardContent>
    </Card>
  );
}
