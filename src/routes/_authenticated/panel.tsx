import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ingestarLoteCliente,
  registrarCargaCliente,
  obtenerResumenCliente,
  obtenerRangoFechasTotal,
  obtenerCatalogosFiltros,
  obtenerVentasRaw,
  calcularHistoricoMultianual,
  calcularDashboard1Cumplimiento,
  calcularDashboard2RunRate,
  calcularDashboard3Digital,
  calcularDashboard4FuerzaVentas,
  calcularDashboard5Marketplaces,
  obtenerTransaccionesDetalle,
  purgarDatosVentas,
  eliminarCarga,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  History,
  Clock,
  Trash2,
  AlertTriangle,
  Loader2,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";

const TAMANO_LOTE = 1000;
const COLORES = ["#2563eb", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316", "#64748b", "#14b8a6", "#84cc16"];

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

  // Modo de rango temporal
  const [tipoRango, setTipoRango] = useState<string>("mesActual");
  const [fechaDesde, setFechaDesde] = useState<string>("");
  const [fechaHasta, setFechaHasta] = useState<string>("");

  // Filtros globales
  const [anio, setAnio] = useState<string>("todos");
  const [mes, setMes] = useState<string>("todos");
  const [canalId, setCanalId] = useState<string>("todos");
  const [marcaId, setMarcaId] = useState<string>("todos");
  const [vendedorId, setVendedorId] = useState<string>("todos");
  const [zonaId, setZonaId] = useState<string>("todos");
  const [ciudadId, setCiudadId] = useState<string>("todos");

  // Explorador de ubicaciones (Zonas y Ciudades) en Dashboard 1
  const [zonaUbicacionD1, setZonaUbicacionD1] = useState<string>("todas");
  const [busquedaCiudadD1, setBusquedaCiudadD1] = useState<string>("");
  const [vistaUbicacionesD1, setVistaUbicacionesD1] = useState<"graficas" | "tabla">("graficas");

  // Explorador detalle
  const [busquedaDetalle, setBusquedaDetalle] = useState("");
  const [paginaDetalle, setPaginaDetalle] = useState(0);

  // Carga archivos
  const [archivo, setArchivo] = useState<File | null>(null);
  const [progreso, setProgreso] = useState(0);
  const [estado, setEstado] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string[]>([]);
  const [esCSV, setEsCSV] = useState(false);

  // Queries iniciales para metadatos y rangos
  const { data: resumen } = useQuery({
    queryKey: ["resumen"],
    queryFn: () => obtenerResumenCliente(),
  });

  const { data: rangoTotal } = useQuery({
    queryKey: ["bi-rango-fechas-total"],
    queryFn: () => obtenerRangoFechasTotal(),
  });

  const { data: catalogos } = useQuery({
    queryKey: ["catalogos-filtros"],
    queryFn: () => obtenerCatalogosFiltros(),
  });

  const filtros: FiltrosBI = useMemo(() => {
    let fDesde: string | null = null;
    let fHasta: string | null = null;
    let anioVal: number | null = null;
    let mesVal: number | null = null;

    if (tipoRango === "mesActual") {
      // Solo el mes más reciente con información (carga inicial rápida)
      const maxDateStr = rangoTotal?.fechaMax || new Date().toISOString().slice(0, 10);
      const [y, m] = maxDateStr.split("-").map(Number);
      const anioM = y || new Date().getFullYear();
      const mesM = m || new Date().getMonth() + 1;
      const mPad = String(mesM).padStart(2, "0");
      const ultimoDia = new Date(anioM, mesM, 0).getDate();
      fDesde = `${anioM}-${mPad}-01`;
      fHasta = `${anioM}-${mPad}-${String(ultimoDia).padStart(2, "0")}`;
    } else if (tipoRango === "personalizado") {
      fDesde = fechaDesde.trim() || null;
      fHasta = fechaHasta.trim() || null;
    } else if (tipoRango === "ultimos12") {
      const maxDateStr = rangoTotal?.fechaMax || new Date().toISOString().slice(0, 10);
      const [y, m, d] = maxDateStr.split("-").map(Number);
      const baseDate = new Date(y || new Date().getFullYear(), (m || 1) - 1, d || 1);
      const hace12 = new Date(baseDate);
      hace12.setFullYear(hace12.getFullYear() - 1);
      const y12 = hace12.getFullYear();
      const m12 = String(hace12.getMonth() + 1).padStart(2, "0");
      const d12 = String(hace12.getDate()).padStart(2, "0");
      fDesde = `${y12}-${m12}-${d12}`;
      fHasta = maxDateStr;
    } else if (tipoRango === "ultimos6") {
      const maxDateStr = rangoTotal?.fechaMax || new Date().toISOString().slice(0, 10);
      const [y, m, d] = maxDateStr.split("-").map(Number);
      const baseDate = new Date(y || new Date().getFullYear(), (m || 1) - 1, d || 1);
      const hace6 = new Date(baseDate);
      hace6.setMonth(hace6.getMonth() - 6);
      const y6 = hace6.getFullYear();
      const m6 = String(hace6.getMonth() + 1).padStart(2, "0");
      const d6 = String(hace6.getDate()).padStart(2, "0");
      fDesde = `${y6}-${m6}-${d6}`;
      fHasta = maxDateStr;
    } else {
      // Modo "anio" o "todo" con año/mes seleccionados
      if (anio !== "todos") anioVal = Number(anio);
      if (mes !== "todos") mesVal = Number(mes);
    }

    return {
      anio: anioVal,
      mes: mesVal,
      fecha_desde: fDesde,
      fecha_hasta: fHasta,
      canal_id: canalId !== "todos" ? Number(canalId) : null,
      marca_id: marcaId !== "todos" ? Number(marcaId) : null,
      vendedor_id: vendedorId !== "todos" ? Number(vendedorId) : null,
      zona_id: zonaId !== "todos" ? Number(zonaId) : null,
      ciudad_id: ciudadId !== "todos" ? Number(ciudadId) : null,
    };
  }, [tipoRango, fechaDesde, fechaHasta, anio, mes, canalId, marcaId, vendedorId, zonaId, ciudadId, rangoTotal?.fechaMax]);

  const hayFiltrosActivos =
    tipoRango !== "mesActual" ||
    anio !== "todos" ||
    mes !== "todos" ||
    canalId !== "todos" ||
    marcaId !== "todos" ||
    vendedorId !== "todos" ||
    zonaId !== "todos" ||
    ciudadId !== "todos" ||
    Boolean(fechaDesde) ||
    Boolean(fechaHasta);

  const limpiarFiltros = () => {
    setTipoRango("mesActual");
    setFechaDesde("");
    setFechaHasta("");
    setAnio("todos");
    setMes("todos");
    setCanalId("todos");
    setMarcaId("todos");
    setVendedorId("todos");
    setZonaId("todos");
    setCiudadId("todos");
  };

  // Carga unificada de ventas para todos los dashboards
  const { data: rawVentas, isLoading: cVentas, isFetching: cFetching } = useQuery({
    queryKey: ["bi-fact-ventas", filtros],
    queryFn: () => obtenerVentasRaw(filtros),
    staleTime: 60 * 1000,
    // En modo "Mes Actual" esperamos a conocer el último mes con datos
    enabled: tipoRango !== "mesActual" || rangoTotal !== undefined,
  });

  const cMultianual = cVentas;
  const cD1 = cVentas;
  const cD2 = cVentas;
  const cD3 = cVentas;
  const cD4 = cVentas;
  const cD5 = cVentas;

  const dMultianual = useMemo(
    () => calcularHistoricoMultianual(rawVentas || [], filtros),
    [rawVentas, filtros]
  );
  const d1 = useMemo(
    () =>
      calcularDashboard1Cumplimiento(
        rawVentas || [],
        filtros,
        catalogos
      ),
    [rawVentas, filtros, catalogos]
  );

  const vendedorSeleccionadoNombre = useMemo(() => {
    if (vendedorId === "todos") return null;
    return catalogos?.vendedores?.find((v) => String(v.id) === String(vendedorId))?.nombre || null;
  }, [vendedorId, catalogos]);

  const ciudadSeleccionadaObj = useMemo(() => {
    if (ciudadId === "todos") return null;
    return catalogos?.ciudades?.find((c) => String(c.id) === String(ciudadId)) || null;
  }, [ciudadId, catalogos]);

  const ciudadesFiltradasD1 = useMemo(() => {
    if (!d1) return [];
    let list: Array<{
      id: number | null;
      ciudad: string;
      zona: string;
      venta: number;
      unidades: number;
      porcentaje: number;
      porcentajeGlobal?: number;
    }> = [];

    if (zonaUbicacionD1 === "todas") {
      list = d1.topCiudades || [];
    } else {
      const zonaObj = d1.distribucionZonas?.find((z) => z.zona === zonaUbicacionD1);
      list = (zonaObj?.ciudades || []).map((c) => ({
        id: c.id,
        ciudad: c.ciudad,
        zona: zonaObj?.zona || "",
        venta: c.venta,
        unidades: c.unidades,
        porcentaje: c.porcentaje,
        porcentajeGlobal: c.porcentajeGlobal,
      }));
    }

    if (busquedaCiudadD1.trim()) {
      const q = busquedaCiudadD1.toLowerCase().trim();
      list = list.filter((c) => c.ciudad.toLowerCase().includes(q) || c.zona.toLowerCase().includes(q));
    }

    return list;
  }, [d1, zonaUbicacionD1, busquedaCiudadD1]);
  const d2 = useMemo(
    () => calcularDashboard2RunRate(rawVentas || [], filtros),
    [rawVentas, filtros]
  );
  const d3 = useMemo(
    () => calcularDashboard3Digital(rawVentas || [], filtros, catalogos?.canales, catalogos?.marcas),
    [rawVentas, filtros, catalogos]
  );
  const d4 = useMemo(
    () => calcularDashboard4FuerzaVentas(rawVentas || [], filtros, catalogos?.vendedores, catalogos?.canales),
    [rawVentas, filtros, catalogos]
  );
  const d5 = useMemo(
    () => calcularDashboard5Marketplaces(rawVentas || [], filtros, catalogos?.canales),
    [rawVentas, filtros, catalogos]
  );

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
      if (meta.columnasDetectadas.length > 0) {
        avisos.push(`✓ ${meta.columnasDetectadas.length} columnas reconocidas y listas para procesar.`);
      }
      if (meta.columnasIgnoradas.length > 0) {
        avisos.push(`Columnas adicionales no mapeadas: ${meta.columnasIgnoradas.join(", ")}`);
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
      queryClient.invalidateQueries({ queryKey: ["bi-multianual"] });
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

  const purgarMutation = useMutation({
    mutationFn: purgarDatosVentas,
    onSuccess: (res) => {
      toast.success(res.mensaje || "Se han eliminado los datos cargados con éxito.");
      queryClient.setQueryData(["resumen"], {
        totalVentas: 0,
        totalCargas: 0,
        primeraFecha: null,
        ultimaFecha: null,
        primerAnio: null,
        ultimoAnio: null,
        ultimoMes: null,
        historial: [],
      });
      queryClient.setQueryData(["bi-rango-fechas-total"], {
        fechaMin: null,
        fechaMax: null,
        totalFilas: 0,
        anios: [],
        aniosCount: 0,
      });
      queryClient.invalidateQueries();
      setArchivo(null);
      setAviso([]);
      setProgreso(0);
      setEstado(null);
    },
    onError: (err: Error) => {
      toast.error(`Error al purgar datos: ${err.message}`);
    },
  });

  const [eliminandoId, setEliminandoId] = useState<number | null>(null);

  const eliminarCargaMutation = useMutation({
    mutationFn: async (id: number) => {
      setEliminandoId(id);
      return await eliminarCarga(id);
    },
    onSuccess: (_, deletedId) => {
      setEliminandoId(null);
      toast.success("Registro de carga eliminado.");
      queryClient.setQueryData(["resumen"], (old: unknown) => {
        if (!old || typeof old !== "object") return old;
        const oldObj = old as { historial?: Array<{ id: number }>; totalCargas?: number };
        return {
          ...oldObj,
          historial: (oldObj.historial || []).filter((item) => item.id !== deletedId),
          totalCargas: Math.max(0, (oldObj.totalCargas || 1) - 1),
        };
      });
      queryClient.invalidateQueries({ queryKey: ["resumen"] });
    },
    onError: (err: Error) => {
      setEliminandoId(null);
      toast.error(`Error al eliminar carga: ${err.message}`);
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
          <div className="flex items-center gap-2 sm:gap-3">
            {rangoTotal?.fechaMin && rangoTotal?.fechaMax && (
              <Badge variant="outline" className="hidden md:inline-flex bg-primary/10 border-primary/20 text-primary font-mono text-xs">
                <Calendar className="mr-1.5 h-3 w-3" />
                Rango Documento: {rangoTotal.fechaMin} al {rangoTotal.fechaMax}
              </Badge>
            )}
            {cFetching && (
              <Badge variant="secondary" className="animate-pulse bg-primary/15 border-primary/30 text-primary font-medium text-xs">
                <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                Actualizando datos...
              </Badge>
            )}
            <Badge variant="outline" className="hidden sm:inline-flex bg-muted/40 font-mono text-xs">
              {(resumen?.totalVentas ?? 0).toLocaleString("es-CO")} registros
            </Badge>
            <Button variant="ghost" size="sm" onClick={salir}>
              Cerrar sesión
            </Button>
          </div>
        </div>

        {/* Barra de Filtros Globales (Slicers) */}
        <div className="border-t border-border/60 bg-muted/30 px-4 py-2 sm:px-6">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1 flex items-center gap-1">
              <Clock className="h-3 w-3 text-primary" />
              Periodo:
            </span>

            {/* Selector de Modo de Rango Temporal */}
            <Select
              value={tipoRango}
              onValueChange={(v) => {
                setTipoRango(v);
                if (v === "todo") {
                  setAnio("todos");
                  setMes("todos");
                  setFechaDesde("");
                  setFechaHasta("");
                } else if (v === "anio") {
                  if (anio === "todos" && (catalogos?.anios?.length ?? 0) > 0) {
                    setAnio(String(catalogos!.anios[0]));
                  }
                  setFechaDesde("");
                  setFechaHasta("");
                } else if (v === "personalizado") {
                  setAnio("todos");
                  setMes("todos");
                  if (!fechaDesde && rangoTotal?.fechaMin) {
                    setFechaDesde(rangoTotal.fechaMin);
                  }
                  if (!fechaHasta && rangoTotal?.fechaMax) {
                    setFechaHasta(rangoTotal.fechaMax);
                  }
                } else {
                  setAnio("todos");
                  setMes("todos");
                  setFechaDesde("");
                  setFechaHasta("");
                }
              }}
            >
              <SelectTrigger className="h-8 w-[190px] text-xs font-medium bg-background border-primary/40 text-foreground">
                <SelectValue placeholder="Rango Temporal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mesActual">📆 Mes Actual (carga rápida)</SelectItem>
                <SelectItem value="todo">🌐 Todo el Histórico Completo</SelectItem>
                <SelectItem value="anio">🗓️ Por Año y Mes</SelectItem>
                <SelectItem value="personalizado">📅 Rango de Fechas (Desde/Hasta)</SelectItem>
                <SelectItem value="ultimos12">⏱️ Últimos 12 Meses</SelectItem>
                <SelectItem value="ultimos6">⏱️ Últimos 6 Meses</SelectItem>
              </SelectContent>
            </Select>

            {/* Campos de Fecha Personalizada */}
            {tipoRango === "personalizado" && (
              <div className="flex items-center gap-1.5 bg-background border border-primary/40 rounded-md px-2 py-0.5">
                <span className="text-[11px] text-muted-foreground font-medium">Desde:</span>
                <Input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="h-6 text-xs border-0 p-0 w-28 bg-transparent focus-visible:ring-0"
                />
                <span className="text-[11px] text-muted-foreground font-medium ml-1">Hasta:</span>
                <Input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="h-6 text-xs border-0 p-0 w-28 bg-transparent focus-visible:ring-0"
                />
              </div>
            )}

            {/* Selector de Año con todos los años históricos */}
            {(tipoRango === "anio" || tipoRango === "todo") && (
              <Select
                value={anio}
                onValueChange={(val) => {
                  setAnio(val);
                  if (val !== "todos" && tipoRango !== "anio") {
                    setTipoRango("anio");
                  }
                }}
              >
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
            )}

            {/* Mes */}
            {(tipoRango === "anio" || anio !== "todos") && (
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
            )}

            <div className="h-4 w-px bg-border/80 mx-1 hidden sm:block" />

            {/* Canal */}
            <Select value={canalId} onValueChange={setCanalId}>
              <SelectTrigger className="h-8 w-[130px] text-xs bg-background">
                <SelectValue placeholder="Canal" />
              </SelectTrigger>
              <SelectContent className="max-h-72 overflow-y-auto">
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
              <SelectContent className="max-h-72 overflow-y-auto">
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
              <SelectContent className="max-h-72 overflow-y-auto">
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
              <SelectContent className="max-h-72 overflow-y-auto">
                <SelectItem value="todos">Todas las Zonas</SelectItem>
                {(catalogos?.zonas || []).map((z) => (
                  <SelectItem key={z.id} value={String(z.id)}>
                    {z.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Ciudad */}
            <Select value={ciudadId} onValueChange={setCiudadId}>
              <SelectTrigger className={`h-8 w-[140px] text-xs bg-background ${ciudadId !== "todos" ? "border-emerald-500 font-semibold text-emerald-700 dark:text-emerald-300" : ""}`}>
                <SelectValue placeholder="Ciudad" />
              </SelectTrigger>
              <SelectContent className="max-h-72 overflow-y-auto">
                <SelectItem value="todos">Todas las Ciudades</SelectItem>
                {(catalogos?.ciudades || []).map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hayFiltrosActivos && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground border-rose-500/30 hover:bg-rose-500/10"
                onClick={limpiarFiltros}
              >
                <FilterX className="mr-1 h-3.5 w-3.5 text-rose-500" />
                Restablecer Todo
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
        <Tabs defaultValue="multianual" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 md:grid-cols-8 h-auto p-1 bg-muted/60">
            <TabsTrigger value="multianual" className="flex items-center gap-1.5 py-2.5 text-xs font-medium">
              <History className="h-3.5 w-3.5 text-purple-500" />
              Multianual
            </TabsTrigger>
            <TabsTrigger value="d1" className="flex items-center gap-1.5 py-2.5 text-xs font-medium">
              <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
              1. Cumplimiento
            </TabsTrigger>
            <TabsTrigger value="d2" className="flex items-center gap-1.5 py-2.5 text-xs font-medium">
              <Calendar className="h-3.5 w-3.5 text-emerald-500" />
              2. Run Rate
            </TabsTrigger>
            <TabsTrigger value="d3" className="flex items-center gap-1.5 py-2.5 text-xs font-medium">
              <Globe className="h-3.5 w-3.5 text-indigo-500" />
              3. Digital
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
              Detalle
            </TabsTrigger>
            <TabsTrigger value="carga" className="flex items-center gap-1.5 py-2.5 text-xs font-medium">
              <UploadCloud className="h-3.5 w-3.5 text-slate-500" />
              Cargar
            </TabsTrigger>
          </TabsList>

          {/* ========================================================================= */}
          {/* TAB MULTIANUAL: DIMENSIÓN DE TIEMPO Y COMPARATIVO HISTÓRICO */}
          {/* ========================================================================= */}
          <TabsContent value="multianual" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/60 pb-3">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground font-display">
                  Dimensión de Tiempo: Análisis Histórico Multianual
                </h2>
                <p className="text-xs text-muted-foreground">
                  Consolidado interanual de facturación, crecimiento año a año (YoY), estacionalidad comparativa y matriz histórica completa.
                </p>
              </div>
              <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/30 font-semibold">
                {dMultianual?.aniosResumen.length ?? 0} Años Registrados ({dMultianual?.aniosPresentes[0] ?? "—"} - {dMultianual?.aniosPresentes[dMultianual.aniosPresentes.length - 1] ?? "—"})
              </Badge>
            </div>

            {/* Tarjetas KPI Multianual */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <CardKpi
                titulo="Facturación Histórica Total"
                valor={formatoCOPFull(
                  (dMultianual?.aniosResumen || []).reduce((a, b) => a + b.totalVentas, 0)
                )}
                subtexto={`Acumulado de todos los años en el documento`}
                icono={<DollarSign className="h-5 w-5 text-emerald-500" />}
                cargando={cMultianual}
              />
              <CardKpi
                titulo="Unidades Históricas Vendidas"
                valor={`${(dMultianual?.aniosResumen || [])
                  .reduce((a, b) => a + b.totalUnidades, 0)
                  .toLocaleString("es-CO")} unds`}
                subtexto="Total de prendas y artículos facturados"
                icono={<Package className="h-5 w-5 text-blue-500" />}
                cargando={cMultianual}
              />
              <CardKpi
                titulo="Años Históricos en Sistema"
                valor={`${dMultianual?.aniosResumen.length ?? 0} Años`}
                subtexto={`Rango: ${(dMultianual?.aniosPresentes || []).join(", ")}`}
                icono={<History className="h-5 w-5 text-purple-500" />}
                cargando={cMultianual}
              />
              <CardKpi
                titulo="Transacciones Totales"
                valor={(dMultianual?.aniosResumen || [])
                  .reduce((a, b) => a + b.totalTransacciones, 0)
                  .toLocaleString("es-CO")}
                subtexto="Facturas y recibos únicos procesados"
                icono={<Receipt className="h-5 w-5 text-amber-500" />}
                cargando={cMultianual}
              />
            </div>

            {/* Gráfico 1: Facturación por Año (BarChart) */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">Facturación Anual Comparativa</CardTitle>
                    <CardDescription>Ingresos totales por cada año de operación</CardDescription>
                  </div>
                  <Badge variant="outline">Anual</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[...(dMultianual?.aniosResumen || [])].reverse()}
                      margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="anio" tick={{ fontSize: 12 }} />
                      <YAxis tickFormatter={(v) => formatoCOP(v)} tick={{ fontSize: 12 }} width={80} />
                      <Tooltip
                        formatter={(v: number, name: string) => [
                          formatoCOPFull(v),
                          name === "totalVentas" ? "Ventas Totales" : "Margen Bruto",
                        ]}
                      />
                      <Legend formatter={(v) => (v === "totalVentas" ? "Facturación ($ COP)" : "Margen Bruto ($)")} />
                      <Bar dataKey="totalVentas" fill="#2563eb" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="margenBruto" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Gráfico 2: Estacionalidad Mensual Superpuesta (Multi-Line Chart) */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">Curvas de Estacionalidad Mensual por Año</CardTitle>
                    <CardDescription>Comparación directa de los meses (Ene a Dic) superponiendo cada año histórico</CardDescription>
                  </div>
                  <Badge variant="outline">Estacionalidad</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-[340px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dMultianual?.estacionalidadCurvas || []} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="nombreMes" tick={{ fontSize: 12 }} />
                      <YAxis tickFormatter={(v) => formatoCOP(v)} tick={{ fontSize: 12 }} width={80} />
                      <Tooltip formatter={(v: number) => [formatoCOPFull(v)]} />
                      <Legend />
                      {(dMultianual?.aniosPresentes || []).map((an, i) => (
                        <Line
                          key={`line-an-${an}`}
                          type="monotone"
                          dataKey={`anio_${an}`}
                          name={`Año ${an}`}
                          stroke={COLORES[i % COLORES.length]}
                          strokeWidth={2.5}
                          dot={{ r: 3 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Tabla Matriz Histórica Año x Mes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Matriz Histórica de Facturación (Año × Mes)</CardTitle>
                <CardDescription>Ventas mensuales detalladas en pesos colombianos para todos los años</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="border-b border-border/80 uppercase text-muted-foreground font-semibold bg-muted/20">
                    <tr>
                      <th className="py-2.5 px-3">Año</th>
                      <th className="py-2.5 px-2 text-right">Ene</th>
                      <th className="py-2.5 px-2 text-right">Feb</th>
                      <th className="py-2.5 px-2 text-right">Mar</th>
                      <th className="py-2.5 px-2 text-right">Abr</th>
                      <th className="py-2.5 px-2 text-right">May</th>
                      <th className="py-2.5 px-2 text-right">Jun</th>
                      <th className="py-2.5 px-2 text-right">Jul</th>
                      <th className="py-2.5 px-2 text-right">Ago</th>
                      <th className="py-2.5 px-2 text-right">Sep</th>
                      <th className="py-2.5 px-2 text-right">Oct</th>
                      <th className="py-2.5 px-2 text-right">Nov</th>
                      <th className="py-2.5 px-2 text-right">Dic</th>
                      <th className="py-2.5 px-3 text-right bg-muted/40 font-bold text-foreground">Total Anual</th>
                      <th className="py-2.5 px-3 text-right">% YoY</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {(dMultianual?.matrizMesAnio || []).map((m) => {
                      const resAnual = dMultianual?.aniosResumen.find((a) => a.anio === m.anio);
                      const yoy = resAnual?.crecimientoYoYPct ?? 0;
                      return (
                        <tr key={m.anio} className="hover:bg-muted/30 font-mono">
                          <td className="py-2.5 px-3 font-sans font-bold text-primary">{m.anio}</td>
                          {m.meses.map((val, idx) => (
                            <td key={idx} className="py-2.5 px-2 text-right text-muted-foreground">
                              {val > 0 ? formatoCOP(val) : "—"}
                            </td>
                          ))}
                          <td className="py-2.5 px-3 text-right bg-muted/40 font-bold text-foreground">
                            {formatoCOP(m.totalAnio)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-sans font-semibold">
                            {yoy !== 0 ? (
                              <span className={yoy >= 0 ? "text-emerald-600" : "text-rose-600"}>
                                {yoy > 0 ? "+" : ""}{yoy}%
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========================================================================= */}
          {/* DASHBOARD 1: CUMPLIMIENTO Y CRECIMIENTO DE VENTAS (NIVEL DIRECTIVO) */}
          {/* ========================================================================= */}
          <TabsContent value="d1" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/60 pb-3">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground font-display">
                  Dashboard 1: Cumplimiento, Participación y Análisis de Ventas
                </h2>
                <p className="text-xs text-muted-foreground">
                  Evolución cronológica de ventas vs presupuesto (PPTO), ranking de vendedores, top referencias, distribución geográfica y mix de líneas/canales.
                </p>
              </div>
              <Badge variant="outline" className={`font-semibold ${colorSemaforo(d1?.kpis.cumplimientoGlobalPct ?? 0)}`}>
                {anio === "todos" ? "Histórico Completo" : `Año ${anio}`} • Cumplimiento: {d1?.kpis.cumplimientoGlobalPct ?? 0}%
              </Badge>
            </div>

            {/* 6 Tarjetas KPI Ejecutivas */}
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
              <CardKpi
                titulo="Venta Neta Total"
                valor={formatoCOPFull(d1?.kpis.ventaYTD ?? 0)}
                subtexto={`Bruta: ${formatoCOP(d1?.kpis.ventaBrutaTotal ?? 0)}`}
                icono={<DollarSign className="h-5 w-5 text-emerald-500" />}
                cargando={cD1}
              />
              <CardKpi
                titulo="Cumplimiento PPTO"
                valor={`${d1?.kpis.cumplimientoGlobalPct ?? 0}%`}
                subtexto={`Meta: ${formatoCOP(d1?.kpis.pptoYTD ?? 0)}`}
                icono={<Percent className="h-5 w-5 text-blue-500" />}
                cargando={cD1}
                badgeSemaforo={d1?.kpis.cumplimientoGlobalPct}
              />
              <CardKpi
                titulo="Volumen Unidades"
                valor={`${(d1?.kpis.volumenUnidades ?? 0).toLocaleString("es-CO")} unds`}
                subtexto="Prendas comercializadas"
                icono={<Package className="h-5 w-5 text-indigo-500" />}
                cargando={cD1}
              />
              <CardKpi
                titulo="Tasa Devolución"
                valor={`${d1?.kpis.tasaDevolucionGlobalPct ?? 0}%`}
                subtexto={`Total: ${formatoCOP(d1?.kpis.devolucionesTotal ?? 0)}`}
                icono={<ArrowDownRight className="h-5 w-5 text-rose-500" />}
                cargando={cD1}
              />
              <CardKpi
                titulo="Ticket Promedio"
                valor={formatoCOP(d1?.kpis.ticketPromedio ?? 0)}
                subtexto={`${(d1?.kpis.totalTransacciones ?? 0).toLocaleString("es-CO")} transacciones`}
                icono={<Receipt className="h-5 w-5 text-amber-500" />}
                cargando={cD1}
              />
              <CardKpi
                titulo="Precio Prom. / Prenda"
                valor={formatoCOP(d1?.kpis.precioPromedioPrenda ?? 0)}
                subtexto="Por unidad vendida"
                icono={<Tag className="h-5 w-5 text-cyan-500" />}
                cargando={cD1}
              />
            </div>

            {/* Gráfico Mixto: Evolución Cronológica de Ventas vs Presupuesto */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">
                      {anio === "todos" ? "Evolución Cronológica Completa de Ventas (Todos los Periodos)" : `Venta Real vs. Presupuesto Mensual (${anio})`}
                    </CardTitle>
                    <CardDescription>
                      {d1?.meses.length ?? 0} periodos registrados en el análisis
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

            {/* Fila 2: Aporte por Vendedor & Distribución Geográfica por Zonas */}
            {/* ========================================================================= */}
            {/* SECCIÓN DE UBICACIONES: ZONAS Y CIUDADES DE VENTAS (FILTRO INTERACTIVO) */}
            {/* ========================================================================= */}
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="pb-3 border-b border-border/40">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                        <MapPin className="h-4 w-4 text-emerald-500" /> Ubicaciones de Ventas: Zonas y Ciudades
                      </CardTitle>
                      {vendedorSeleccionadoNombre ? (
                        <Badge className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs">
                          Asesor: {vendedorSeleccionadoNombre}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          Nacional / Todos los Vendedores
                        </Badge>
                      )}
                      {ciudadSeleccionadaObj && (
                        <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm animate-pulse">
                          <span>Ciudad Activa: {ciudadSeleccionadaObj.nombre}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCiudadId("todos");
                            }}
                            className="ml-1 hover:bg-emerald-800 rounded-full p-0.5"
                          >
                            ✕
                          </button>
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        {(d1?.distribucionZonas || []).length} Zonas
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {(d1?.topCiudades || []).length} Ciudades
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">
                      {ciudadSeleccionadaObj
                        ? `Mostrando únicamente los datos de ${ciudadSeleccionadaObj.nombre}. Haz clic en cualquier otra ciudad o en 'Quitar filtro' para restaurar.`
                        : vendedorSeleccionadoNombre
                        ? `Analizando las zonas territoriales y municipios/ciudades donde ${vendedorSeleccionadoNombre} ha tenido sus ventas. Haz clic en una ciudad para filtrar todo el dashboard.`
                        : "Distribución geográfica de ventas. Haz clic en cualquier ciudad para actualizar todos los datos del dashboard a esa ubicación."}
                    </CardDescription>
                  </div>

                  {/* Controles de filtro y modo de vista */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Select value={zonaUbicacionD1} onValueChange={setZonaUbicacionD1}>
                      <SelectTrigger className="w-[170px] h-8 text-xs bg-background">
                        <SelectValue placeholder="Filtrar por Zona" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todas">Todas las Zonas (Nacional)</SelectItem>
                        {(d1?.distribucionZonas || []).map((z) => (
                          <SelectItem key={z.zona} value={z.zona}>
                            {z.zona} ({z.porcentaje}%)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Buscar ciudad o zona..."
                        value={busquedaCiudadD1}
                        onChange={(e) => setBusquedaCiudadD1(e.target.value)}
                        className="h-8 pl-8 text-xs w-[160px] bg-background"
                      />
                    </div>

                    <div className="flex rounded-md bg-muted p-0.5 border border-border/50">
                      <button
                        type="button"
                        onClick={() => setVistaUbicacionesD1("graficas")}
                        className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                          vistaUbicacionesD1 === "graficas"
                            ? "bg-background shadow-sm text-foreground font-semibold"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Gráficas
                      </button>
                      <button
                        type="button"
                        onClick={() => setVistaUbicacionesD1("tabla")}
                        className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                          vistaUbicacionesD1 === "tabla"
                            ? "bg-background shadow-sm text-foreground font-semibold"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Tabla
                      </button>
                    </div>
                  </div>
                </div>

                {/* Banner de alerta interactivo cuando hay una ciudad seleccionada */}
                {ciudadSeleccionadaObj && (
                  <div className="mt-3 flex items-center justify-between p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="font-medium text-foreground">
                        Filtro interactivo activado: Todos los KPIs, gráficos de vendedores, marcas y referencias reflejan exclusivamente las ventas en <strong>{ciudadSeleccionadaObj.nombre}</strong>.
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCiudadId("todos")}
                      className="h-6 px-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
                    >
                      ✕ Quitar filtro de ciudad
                    </Button>
                  </div>
                )}
              </CardHeader>

              <CardContent className="pt-4">
                {vistaUbicacionesD1 === "graficas" ? (
                  <div className="grid gap-6 lg:grid-cols-2">
                    {/* Gráfico 1: Zonas Comerciales / Departamentos */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                          1. Participación por Zonas Comerciales
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          Clic para filtrar ciudades de esa zona
                        </span>
                      </div>
                      {(!d1?.distribucionZonas || d1.distribucionZonas.length === 0) ? (
                        <div className="h-[280px] grid place-items-center text-sm text-muted-foreground">
                          Sin datos de zonas para los filtros actuales
                        </div>
                      ) : (
                        <div className="h-[280px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={d1.distribucionZonas.slice(0, 10)}
                              layout="vertical"
                              margin={{ left: 20, right: 20 }}
                              onClick={(e) => {
                                if (e && e.activePayload && e.activePayload[0]) {
                                  const zName = e.activePayload[0].payload.zona;
                                  setZonaUbicacionD1(zonaUbicacionD1 === zName ? "todas" : zName);
                                }
                              }}
                            >
                              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                              <XAxis type="number" tickFormatter={(v) => formatoCOP(v)} tick={{ fontSize: 11 }} />
                              <YAxis type="category" dataKey="zona" width={110} tick={{ fontSize: 11 }} />
                              <Tooltip
                                formatter={(v: number, name: string, item: any) => [
                                  `${formatoCOPFull(v)} (${item.payload.porcentaje}% • ${item.payload.unidades.toLocaleString("es-CO")} unds)`,
                                  "Facturación",
                                ]}
                              />
                              <Bar dataKey="venta" fill="#10b981" radius={[0, 4, 4, 0]} className="cursor-pointer">
                                {d1.distribucionZonas.slice(0, 10).map((entry, i) => (
                                  <Cell
                                    key={`bar-zona-${i}`}
                                    fill={
                                      zonaUbicacionD1 === "todas" || zonaUbicacionD1 === entry.zona
                                        ? COLORES[i % COLORES.length]
                                        : "#94a3b8"
                                    }
                                    opacity={zonaUbicacionD1 === "todas" || zonaUbicacionD1 === entry.zona ? 1 : 0.4}
                                  />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      {/* Chips interactivos de zonas */}
                      <div className="flex flex-wrap gap-1.5 pt-1 max-h-[80px] overflow-y-auto">
                        <button
                          type="button"
                          onClick={() => setZonaUbicacionD1("todas")}
                          className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                            zonaUbicacionD1 === "todas"
                              ? "bg-primary text-primary-foreground border-primary font-bold"
                              : "bg-muted/40 hover:bg-muted text-muted-foreground border-border/40"
                          }`}
                        >
                          Todas ({d1?.distribucionZonas?.length || 0})
                        </button>
                        {(d1?.distribucionZonas || []).map((z, idx) => (
                          <button
                            key={z.zona}
                            type="button"
                            onClick={() => setZonaUbicacionD1(zonaUbicacionD1 === z.zona ? "todas" : z.zona)}
                            className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors flex items-center gap-1.5 ${
                              zonaUbicacionD1 === z.zona
                                ? "bg-emerald-600 text-white border-emerald-600 font-bold shadow-sm"
                                : "bg-muted/40 hover:bg-muted text-foreground border-border/40"
                            }`}
                          >
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: COLORES[idx % COLORES.length] }}
                            />
                            <span>{z.zona}</span>
                            <span className="text-muted-foreground font-medium">({z.porcentaje}%)</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Gráfico 2: Ciudades y Municipios (Interactivo con clic para filtrar todo el dashboard) */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <span>2. {zonaUbicacionD1 === "todas" ? "Top Ciudades Líderes en Facturación" : `Ciudades en Zona: ${zonaUbicacionD1}`}</span>
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                            (Clic para filtrar)
                          </span>
                        </span>
                        <Badge variant="outline" className="text-[11px]">
                          {ciudadesFiltradasD1.length} {ciudadesFiltradasD1.length === 1 ? "Ciudad" : "Ciudades"}
                        </Badge>
                      </div>

                      {ciudadesFiltradasD1.length === 0 ? (
                        <div className="h-[280px] grid place-items-center text-sm text-muted-foreground">
                          Sin ciudades registradas para la selección actual
                        </div>
                      ) : (
                        <div className="h-[280px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={ciudadesFiltradasD1.slice(0, 10)}
                              layout="vertical"
                              margin={{ left: 20, right: 20 }}
                              onClick={(e) => {
                                if (e && e.activePayload && e.activePayload[0]) {
                                  const cItem = e.activePayload[0].payload;
                                  if (cItem.id) {
                                    setCiudadId(String(ciudadId) === String(cItem.id) ? "todos" : String(cItem.id));
                                  } else {
                                    const match = catalogos?.ciudades?.find(
                                      (cat) => cat.nombre.toLowerCase().trim() === String(cItem.ciudad).toLowerCase().trim()
                                    );
                                    if (match) {
                                      setCiudadId(String(ciudadId) === String(match.id) ? "todos" : String(match.id));
                                    }
                                  }
                                }
                              }}
                            >
                              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                              <XAxis type="number" tickFormatter={(v) => formatoCOP(v)} tick={{ fontSize: 11 }} />
                              <YAxis type="category" dataKey="ciudad" width={110} tick={{ fontSize: 11 }} />
                              <Tooltip
                                formatter={(v: number, name: string, item: any) => [
                                  `${formatoCOPFull(v)} (${item.payload.porcentaje}% • ${item.payload.unidades.toLocaleString("es-CO")} unds)`,
                                  `Ventas en ${item.payload.zona || ""} • Clic para filtrar`,
                                ]}
                              />
                              <Bar dataKey="venta" fill="#3b82f6" radius={[0, 4, 4, 0]} className="cursor-pointer">
                                {ciudadesFiltradasD1.slice(0, 10).map((cEntry, i) => {
                                  const estaSeleccionada =
                                    ciudadId !== "todos" &&
                                    (String(cEntry.id) === String(ciudadId) ||
                                      ciudadSeleccionadaObj?.nombre.toLowerCase().trim() === cEntry.ciudad.toLowerCase().trim());
                                  return (
                                    <Cell
                                      key={`bar-ciudad-${i}`}
                                      fill={estaSeleccionada ? "#10b981" : COLORES[(i + 2) % COLORES.length]}
                                      stroke={estaSeleccionada ? "#059669" : undefined}
                                      strokeWidth={estaSeleccionada ? 2 : 0}
                                      opacity={ciudadId === "todos" || estaSeleccionada ? 1 : 0.4}
                                    />
                                  );
                                })}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      {/* Resumen rápido de ciudades con interacción de clic */}
                      <div className="space-y-1.5 max-h-[80px] overflow-y-auto pr-1">
                        {ciudadesFiltradasD1.slice(0, 5).map((c, idx) => {
                          const estaSeleccionada =
                            ciudadId !== "todos" &&
                            (String(c.id) === String(ciudadId) ||
                              ciudadSeleccionadaObj?.nombre.toLowerCase().trim() === c.ciudad.toLowerCase().trim());
                          return (
                            <div
                              key={`${c.ciudad}-${idx}`}
                              onClick={() => {
                                if (c.id) {
                                  setCiudadId(String(ciudadId) === String(c.id) ? "todos" : String(c.id));
                                } else {
                                  const match = catalogos?.ciudades?.find(
                                    (cat) => cat.nombre.toLowerCase().trim() === String(c.ciudad).toLowerCase().trim()
                                  );
                                  if (match) {
                                    setCiudadId(String(ciudadId) === String(match.id) ? "todos" : String(match.id));
                                  }
                                }
                              }}
                              className={`flex items-center justify-between text-xs p-1 rounded cursor-pointer transition-colors ${
                                estaSeleccionada
                                  ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-950 dark:text-emerald-100 font-bold"
                                  : "hover:bg-muted/50 border-b border-border/20"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-muted-foreground">#{idx + 1}</span>
                                <span className="font-semibold text-foreground">{c.ciudad}</span>
                                <Badge variant="secondary" className="text-[10px] py-0 px-1 font-normal">
                                  {c.zona}
                                </Badge>
                                {estaSeleccionada && (
                                  <Badge className="bg-emerald-600 text-white text-[9px] py-0 px-1">
                                    Filtro Activo
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">{c.unidades.toLocaleString("es-CO")} unds</span>
                                <span className="font-semibold text-foreground">{formatoCOP(c.venta)}</span>
                                <span className="text-emerald-600 font-bold text-[11px]">({c.porcentaje}%)</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Modo Tabla Territorial con Clic Interactivo */
                  <div className="overflow-x-auto max-h-[380px]">
                    <table className="w-full text-xs text-left">
                      <thead className="border-b border-border/80 uppercase text-muted-foreground font-semibold bg-muted/20 sticky top-0">
                        <tr>
                          <th className="py-2.5 px-3">#</th>
                          <th className="py-2.5 px-3">Zona / Departamento</th>
                          <th className="py-2.5 px-3">Ciudad / Municipio (Clic para filtrar)</th>
                          <th className="py-2.5 px-3 text-right">Unidades Vendidas</th>
                          <th className="py-2.5 px-3 text-right">Venta Neta Facturada</th>
                          <th className="py-2.5 px-3 text-right">
                            {zonaUbicacionD1 === "todas" ? "% Aporte Total" : "% Aporte en Zona"}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {ciudadesFiltradasD1.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-6 text-center text-muted-foreground">
                              Sin ubicaciones registradas para el filtro seleccionado
                            </td>
                          </tr>
                        ) : (
                          ciudadesFiltradasD1.map((loc, idx) => {
                            const estaSeleccionada =
                              ciudadId !== "todos" &&
                              (String(loc.id) === String(ciudadId) ||
                                ciudadSeleccionadaObj?.nombre.toLowerCase().trim() === loc.ciudad.toLowerCase().trim());
                            return (
                              <tr
                                key={`${loc.ciudad}-${loc.zona}-${idx}`}
                                onClick={() => {
                                  if (loc.id) {
                                    setCiudadId(String(ciudadId) === String(loc.id) ? "todos" : String(loc.id));
                                  } else {
                                    const match = catalogos?.ciudades?.find(
                                      (cat) => cat.nombre.toLowerCase().trim() === String(loc.ciudad).toLowerCase().trim()
                                    );
                                    if (match) {
                                      setCiudadId(String(ciudadId) === String(match.id) ? "todos" : String(match.id));
                                    }
                                  }
                                }}
                                className={`cursor-pointer transition-colors ${
                                  estaSeleccionada
                                    ? "bg-emerald-500/15 font-semibold text-foreground"
                                    : "hover:bg-muted/40"
                                }`}
                              >
                                <td className="py-2.5 px-3 font-bold text-muted-foreground">#{idx + 1}</td>
                                <td className="py-2.5 px-3 font-medium text-foreground">
                                  <span className="inline-flex items-center gap-1.5">
                                    <MapPin className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                    {loc.zona}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 font-semibold text-foreground flex items-center gap-2">
                                  <span>{loc.ciudad}</span>
                                  {estaSeleccionada && (
                                    <Badge className="bg-emerald-600 text-white text-[9px] py-0 px-1">
                                      Filtro Activo
                                    </Badge>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-right font-medium text-muted-foreground">
                                  {loc.unidades.toLocaleString("es-CO")}
                                </td>
                                <td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                                  {formatoCOPFull(loc.venta)}
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <Badge variant="outline" className="font-semibold text-[11px] bg-primary/5">
                                    {loc.porcentaje}%
                                  </Badge>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Fila 2: Aporte por Vendedor & Mix por Canal Comercial */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Ranking y Aporte de Vendedores */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-500" /> Aporte por Vendedor / Asesor
                      </CardTitle>
                      <CardDescription>
                        Participación % de cada vendedor en el total facturado del periodo
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {(d1?.rankingVendedores || []).length} Vendedores
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
                  {(!d1?.rankingVendedores || d1.rankingVendedores.length === 0) ? (
                    <div className="h-[200px] grid place-items-center text-sm text-muted-foreground">Sin datos de vendedores</div>
                  ) : (
                    d1.rankingVendedores.map((v, i) => (
                      <div key={v.id ?? v.vendedor ?? i} className="space-y-1.5 p-2 rounded-lg hover:bg-muted/40 transition-colors border border-border/30">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold w-5 text-muted-foreground">#{i + 1}</span>
                            <span className="font-semibold text-foreground">{v.vendedor}</span>
                          </div>
                          <div className="flex items-center gap-3 text-right">
                            <span className="text-muted-foreground">{v.unidades.toLocaleString("es-CO")} unds</span>
                            <span className="font-bold text-foreground">{formatoCOPFull(v.venta)}</span>
                            <Badge variant="outline" className="font-bold bg-primary/10 text-primary border-primary/20 text-[11px] min-w-[50px] justify-center">
                              {v.porcentaje}%
                            </Badge>
                          </div>
                        </div>
                        <Progress value={v.porcentaje} className="h-1.5 bg-muted" />
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Mix de Canales */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Globe className="h-4 w-4 text-blue-500" /> Mix por Canal Comercial
                  </CardTitle>
                  <CardDescription>Participación de ventas por canal de comercialización</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={d1?.mixCanales || []} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis type="number" tickFormatter={(v) => formatoCOP(v)} />
                        <YAxis type="category" dataKey="canal" width={100} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: number) => [formatoCOPFull(v), "Ventas"]} />
                        <Bar dataKey="venta" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                          {(d1?.mixCanales || []).map((_, i) => (
                            <Cell key={`mix-canal-${i}`} fill={COLORES[(i + 3) % COLORES.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Fila 3: Top 10 Referencias / Productos Más Vendidos */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4 text-purple-500" /> Top 10 Referencias y Productos Más Vendidos
                    </CardTitle>
                    <CardDescription>
                      Prendas líderes en facturación, rotación de unidades y precio promedio
                    </CardDescription>
                  </div>
                  <Badge variant="outline">Top 10 SKUs</Badge>
                </div>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="border-b border-border/80 uppercase text-muted-foreground font-semibold bg-muted/20">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">SKU / Ref</th>
                      <th className="py-2.5 px-3">Nombre del Producto</th>
                      <th className="py-2.5 px-3">Línea</th>
                      <th className="py-2.5 px-3 text-right">Unidades</th>
                      <th className="py-2.5 px-3 text-right">Precio Prom.</th>
                      <th className="py-2.5 px-3 text-right">Venta Neta</th>
                      <th className="py-2.5 px-3 text-right">% Participación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {(!d1?.topReferencias || d1.topReferencias.length === 0) ? (
                      <tr>
                        <td colSpan={8} className="py-6 text-center text-muted-foreground">
                          Sin referencias registradas para el periodo seleccionado
                        </td>
                      </tr>
                    ) : (
                      d1.topReferencias.map((ref, idx) => (
                        <tr key={ref.sku || idx} className="hover:bg-muted/30 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-muted-foreground">
                            {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-medium text-foreground">{ref.sku}</td>
                          <td className="py-2.5 px-3 font-semibold text-foreground">{ref.producto}</td>
                          <td className="py-2.5 px-3 text-muted-foreground">{ref.linea}</td>
                          <td className="py-2.5 px-3 text-right font-medium">{ref.unidades.toLocaleString("es-CO")}</td>
                          <td className="py-2.5 px-3 text-right text-muted-foreground">{formatoCOP(ref.precioPromedio)}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                            {formatoCOPFull(ref.valor)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <Badge variant="outline" className="font-semibold text-[11px] bg-primary/5">
                              {ref.porcentaje}%
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Fila 4: Mix por Línea de Producto & Mix por Canal Comercial */}
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Layers className="h-4 w-4 text-violet-500" /> Mix por Línea de Producto
                  </CardTitle>
                  <CardDescription>Aporte y cumplimiento de cada línea al total de facturación</CardDescription>
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

              {/* Mix de Canales */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Globe className="h-4 w-4 text-blue-500" /> Mix por Canal Comercial
                  </CardTitle>
                  <CardDescription>Participación de ventas por canal de comercialización</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={d1?.mixCanales || []} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis type="number" tickFormatter={(v) => formatoCOP(v)} />
                        <YAxis type="category" dataKey="canal" width={100} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: number) => [formatoCOPFull(v), "Ventas"]} />
                        <Bar dataKey="venta" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                          {(d1?.mixCanales || []).map((_, i) => (
                            <Cell key={`mix-canal-${i}`} fill={COLORES[(i + 3) % COLORES.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Fila 5: Tabla Detalle Cronológico Mes a Mes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-500" /> Detalle Cronológico Mes a Mes
                </CardTitle>
                <CardDescription>Facturación, presupuesto y cumplimiento por periodo registrado</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto max-h-[340px]">
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
            {/* ZONA DE CONTROL Y LIMPIEZA DE DATOS */}
            <Card className="border-rose-500/30 bg-rose-500/5">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-500 mt-0.5">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="font-display text-base text-foreground">
                        Zona de Limpieza y Reinicio de Datos
                      </CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        Si cargaste un archivo con inconsistencias o deseas reiniciar los datos para importar un archivo nuevo y limpio desde cero.
                      </CardDescription>
                    </div>
                  </div>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={purgarMutation.isPending || (resumen?.totalVentas ?? 0) === 0}
                        className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm shrink-0"
                      >
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                        {purgarMutation.isPending ? "Purgando datos..." : "Eliminar y Purgar Todo"}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-rose-600">
                          <AlertTriangle className="h-5 w-5" />
                          ¿Eliminar y purgar todos los datos de ventas?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-2 text-sm text-muted-foreground">
                          <p>
                            Esta acción <strong className="text-foreground font-semibold">eliminará definitivamente todos los registros de ventas ({resumen?.totalVentas?.toLocaleString("es-CO") || 0} filas)</strong> y el historial de cargas actual.
                          </p>
                          <p>
                            Usa esta función si tu archivo anterior tenía datos erróneos o duplicados y deseas dejar la base de datos totalmente limpia antes de subir el nuevo archivo corregido.
                          </p>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => purgarMutation.mutate()}
                          className="bg-rose-600 hover:bg-rose-700 text-white"
                        >
                          Sí, eliminar y purgar datos
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardHeader>
            </Card>

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
                      <div className="flex items-center gap-3 text-right text-xs">
                        <div>
                          <p className="text-primary font-semibold">+{h.filas_nuevas.toLocaleString("es-CO")} nuevas</p>
                          <p className="text-muted-foreground">
                            {h.filas_recibidas.toLocaleString("es-CO")} leídas
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10"
                          title="Eliminar registro de carga"
                          disabled={eliminandoId === h.id || eliminarCargaMutation.isPending}
                          onClick={() => eliminarCargaMutation.mutate(h.id)}
                        >
                          {eliminandoId === h.id ? (
                            <div className="h-3.5 w-3.5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
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
  subtexto?: string | undefined;
  icono?: React.ReactNode | undefined;
  cargando?: boolean | undefined;
  badgeSemaforo?: number | undefined;
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
