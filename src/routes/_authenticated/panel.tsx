import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ingestarLoteCliente,
  registrarCargaCliente,
  obtenerResumenCliente,
  obtenerRangoFechasTotal,
  obtenerCatalogosFiltros,
  obtenerVentasRaw,
  obtenerFiltrosAnioAnterior,
  calcularHistoricoMultianual,
  calcularDashboard1Cumplimiento,
  calcularDashboard2RunRate,
  calcularDashboard3Digital,
  calcularDashboard4FuerzaVentas,
  calcularDashboard5Marketplaces,
  calcularDashboard6Referencias,
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
import { cn } from "@/lib/utils";
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
  LabelList,
} from "recharts";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  ArrowLeft,
  History,
  Clock,
  Trash2,
  AlertTriangle,
  Loader2,
  MapPin,
  Share2,
  Smartphone,
  Store,
  Info,
  ShieldCheck,
  UserCheck,
  Eye,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { AdminPermisosVendedoresDialog } from "@/components/admin-permisos-vendedores-dialog";
import {
  obtenerPermisoUsuario,
  obtenerSimulacionAdmin,
  establecerSimulacionAdmin,
  obtenerSesionActiva,
  cerrarSesionActiva,
  type PermisoUsuario,
} from "@/lib/permisos-vendedores";

const TAMANO_LOTE = 1000;
const COLORES = [
  "#4f46e5", // Electric Indigo
  "#10b981", // Emerald Mint
  "#f59e0b", // Amber Gold
  "#06b6d4", // Cyan Sky
  "#ec4899", // Rose Pink
  "#8b5cf6", // Violet Purple
  "#3b82f6", // Royal Blue
  "#f97316", // Coral Orange
  "#14b8a6", // Teal Aqua
  "#6366f1", // Iris Indigo
];

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
  const abs = Math.abs(val);
  const sign = val < 0 ? "-" : "";
  if (abs >= 1_000_000_000) {
    return `${sign}$${(abs / 1_000_000_000).toFixed(2)}B`;
  }
  if (abs >= 1_000_000) {
    return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  }
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(val);
}

function formatoCOPFull(val: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(val);
}

function formatoUnidades(val: number) {
  return `${Math.round(val || 0).toLocaleString("es-CO")} unds`;
}

function formatoEntero(val: number) {
  return Math.round(val || 0).toLocaleString("es-CO");
}

function colorSemaforo(pct: number) {
  if (pct >= 100) return "bg-emerald-500/15 text-emerald-600 border-emerald-500/30";
  if (pct >= 90) return "bg-amber-500/15 text-amber-600 border-amber-500/30";
  return "bg-rose-500/15 text-rose-600 border-rose-500/30";
}

function BadgeYoY({
  actual,
  anterior,
  porcentaje,
  invertido = false,
  label = "año ant.",
  tipo = "cop",
  formatoCustom,
}: {
  actual?: number;
  anterior?: number;
  porcentaje?: number;
  invertido?: boolean;
  label?: string;
  tipo?: "cop" | "unidades" | "pct" | "entero" | "ratio" | "custom";
  formatoCustom?: (val: number) => string;
}) {
  if (anterior === undefined || anterior === null || (anterior === 0 && actual === 0)) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground/80 bg-muted/40 px-1.5 py-0.5 rounded border border-border/40">
        Sin datos año ant.
      </span>
    );
  }
  const pct =
    porcentaje !== undefined
      ? porcentaje
      : anterior !== 0
      ? Math.round((((actual ?? 0) - anterior) / Math.abs(anterior)) * 1000) / 10
      : (actual ?? 0) > 0
      ? 100
      : 0;
  const esPositivo = pct >= 0;
  const esBueno = invertido ? !esPositivo : esPositivo;

  let valorAnteriorFormateado = "";
  if (formatoCustom) {
    valorAnteriorFormateado = formatoCustom(anterior);
  } else if (tipo === "cop") {
    valorAnteriorFormateado = formatoCOP(anterior);
  } else if (tipo === "unidades" || tipo === "entero") {
    valorAnteriorFormateado = `${formatoEntero(anterior)} ${tipo === "unidades" ? "uds" : ""}`.trim();
  } else if (tipo === "pct") {
    valorAnteriorFormateado = `${anterior.toFixed(1)}%`;
  } else if (tipo === "ratio") {
    valorAnteriorFormateado = `${anterior.toFixed(2)}x`;
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap text-xs">
      <span
        className={cn(
          "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-semibold text-[11px]",
          esBueno
            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
            : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
        )}
      >
        {esPositivo ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
        {pct > 0 ? `+${pct.toFixed(1)}%` : `${pct.toFixed(1)}%`}
      </span>
      <span className="text-[11px] text-muted-foreground font-normal">
        ({valorAnteriorFormateado} {label})
      </span>
    </div>
  );
}

function BadgeYoYUnidades({
  actual,
  anterior,
  porcentaje,
  label = "año ant.",
}: {
  actual?: number;
  anterior?: number;
  porcentaje?: number;
  label?: string;
}) {
  return (
    <BadgeYoY
      actual={actual}
      anterior={anterior}
      porcentaje={porcentaje}
      tipo="unidades"
      label={label}
    />
  );
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
  const [tipoRango, setTipoRango] = useState<string>("todo");
  const [fechaDesde, setFechaDesde] = useState<string>("");
  const [fechaHasta, setFechaHasta] = useState<string>("");

  // Control de Tab Activo
  const [tabActivo, setTabActivo] = useState<string>("multianual");

  // Filtros globales
  const [anio, setAnio] = useState<string>("todos");
  const [mes, setMes] = useState<string>("todos");
  const [canalId, setCanalId] = useState<string>("todos");
  const [marcaId, setMarcaId] = useState<string>("todos");
  const [vendedorId, setVendedorId] = useState<string>("todos");
  const [zonaId, setZonaId] = useState<string>("todos");
  const [ciudadId, setCiudadId] = useState<string>("todos");

  // Sub-filtro de canal digital para Dashboard 3
  const [filtroCanalDigital, setFiltroCanalDigital] = useState<"todos" | "tienda_virtual" | "redes_sociales">("todos");

  // Explorador de ubicaciones (Zonas y Ciudades) en Dashboard 1
  const [zonaUbicacionD1, setZonaUbicacionD1] = useState<string>("todas");
  const [busquedaCiudadD1, setBusquedaCiudadD1] = useState<string>("");
  const [vistaUbicacionesD1, setVistaUbicacionesD1] = useState<"graficas" | "tabla">("graficas");

  // Dashboard 6: Referencias
  const [busquedaRef, setBusquedaRef] = useState("");
  const [filtroLineaRef, setFiltroLineaRef] = useState("todas");
  const [filtroAbcRef, setFiltroAbcRef] = useState("todos");
  const [ordenRef, setOrdenRef] = useState<"ventaDesc" | "unidadesDesc" | "precioDesc" | "devDesc" | "paretoAsc">("ventaDesc");
  const [filasPorPaginaRef, setFilasPorPaginaRef] = useState("25");
  const [paginaRef, setPaginaRef] = useState(1);

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

  // Control de Usuario y Permisos de Vendedores
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string; nombre?: string | null } | null>(() => {
    const s = obtenerSesionActiva();
    return s ? { id: s.id, email: s.email, nombre: s.nombre } : null;
  });
  const [permisoVersion, setPermisoVersion] = useState(0);
  const [modalPermisosAbierto, setModalPermisosAbierto] = useState(false);

  useEffect(() => {
    const s = obtenerSesionActiva();
    if (s) {
      setCurrentUser({ id: s.id, email: s.email, nombre: s.nombre });
    }

    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setCurrentUser({
          id: data.user.id,
          email: data.user.email || "",
          nombre: (data.user.user_metadata?.full_name as string) || null,
        });
      }
    });

    const handlePermisosChange = () => setPermisoVersion((v) => v + 1);
    const handleAuthChange = () => {
      const ses = obtenerSesionActiva();
      if (ses) {
        setCurrentUser({ id: ses.id, email: ses.email, nombre: ses.nombre });
      }
      setPermisoVersion((v) => v + 1);
    };

    window.addEventListener("truccos_permisos_actualizados", handlePermisosChange);
    window.addEventListener("truccos_auth_change", handleAuthChange);
    return () => {
      window.removeEventListener("truccos_permisos_actualizados", handlePermisosChange);
      window.removeEventListener("truccos_auth_change", handleAuthChange);
    };
  }, []);

  const simulacionActual = useMemo(() => {
    return obtenerSimulacionAdmin();
  }, [permisoVersion]);

  const permisoActual = useMemo(() => {
    if (simulacionActual) return simulacionActual;
    if (!currentUser) return null;
    return obtenerPermisoUsuario(currentUser.email, currentUser.id);
  }, [currentUser, simulacionActual, permisoVersion]);

  const esAdmin = useMemo(() => {
    if (!permisoActual) return true;
    return permisoActual.rol === "admin";
  }, [permisoActual]);

  const puedeVerDigital = useMemo(() => {
    if (esAdmin) return true;
    const email = (permisoActual?.email || "").toLowerCase();
    const zona = (permisoActual?.zona || "").toLowerCase();
    const canal = (permisoActual?.canal || "").toLowerCase();
    if (email.includes("ericausuaga") || email.includes("angelaacevedo")) return true;
    if (zona.includes("digital") || (canal.includes("digital") && !zona.includes("punto de venta"))) return true;
    return false;
  }, [esAdmin, permisoActual]);

  const puedeVerMarketplaces = useMemo(() => {
    return esAdmin;
  }, [esAdmin]);

  const puedeVerCargar = useMemo(() => {
    return esAdmin;
  }, [esAdmin]);

  const vendedorIdsPermitidos = useMemo(() => {
    if (esAdmin) return null;
    return permisoActual?.vendedorIds || [];
  }, [esAdmin, permisoActual]);

  const vendedoresDisponibles = useMemo(() => {
    const todos = catalogos?.vendedores || [];
    if (esAdmin || !vendedorIdsPermitidos) return todos;
    return todos.filter((v) => vendedorIdsPermitidos.includes(v.id));
  }, [catalogos?.vendedores, esAdmin, vendedorIdsPermitidos]);

  // Catálogos dinámicos adaptados al vendedor y contexto seleccionado (excluyendo canales no comerciales como publicidad)
  const canalesDisponibles = useMemo(() => {
    const base = (catalogos?.canales || []).filter((c) => {
      const n = (c.nombre || "").trim().toLowerCase();
      return !n.includes("publicidad") && !n.includes("publicada");
    });

    // Restricción estricta de canales si el usuario no es admin
    if (!esAdmin && permisoActual) {
      const userCanal = (permisoActual.canal || "").trim().toUpperCase();
      const userZona = (permisoActual.zona || "").trim().toUpperCase();

      const filtradosPorUsuario = base.filter((c) => {
        const cn = (c.nombre || "").trim().toUpperCase();
        if (userCanal.includes("MAYORISTA NACIONAL")) {
          return cn.includes("MAYORISTA NACIONAL") || c.id === 1;
        }
        if (userCanal === "EXPORTACION" || userZona.includes("EXPORTACION")) {
          return cn.includes("INTERNACIONAL") || cn.includes("EXPORTACION") || c.id === 4;
        }
        if (userCanal === "DETAL" || userZona.includes("TIENDA FISICA") || userZona.includes("DIGITAL DETAL")) {
          return cn.includes("DETAL") || c.id === 2;
        }
        if (userCanal.includes("MAYORISTA DIGITAL") || userZona.includes("DIGITAL MAYORISTA") || userZona.includes("PUNTO DE VENTA")) {
          return cn.includes("MAYORISTA NACIONAL") || cn.includes("DETAL") || c.id === 1 || c.id === 2;
        }
        return true;
      });

      if (filtradosPorUsuario.length > 0) return filtradosPorUsuario;
    }

    return base;
  }, [catalogos?.canales, esAdmin, permisoActual]);

  const filtros: FiltrosBI = useMemo(() => {
    let fDesde: string | null = null;
    let fHasta: string | null = null;
    let anioVal: number | null = null;
    let mesVal: number | null = null;

    if (tipoRango === "mesActual") {
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
      const [y, m] = maxDateStr.split("-").map(Number);
      const anioMax = y || new Date().getFullYear();
      const mesMax = m || new Date().getMonth() + 1;
      const baseDate = new Date(anioMax, mesMax - 1, 1);
      const hace12 = new Date(baseDate);
      hace12.setMonth(hace12.getMonth() - 11);
      const y12 = hace12.getFullYear();
      const m12 = String(hace12.getMonth() + 1).padStart(2, "0");
      fDesde = `${y12}-${m12}-01`;
      fHasta = maxDateStr;
    } else if (tipoRango === "ultimos6") {
      const maxDateStr = rangoTotal?.fechaMax || new Date().toISOString().slice(0, 10);
      const [y, m] = maxDateStr.split("-").map(Number);
      const anioMax = y || new Date().getFullYear();
      const mesMax = m || new Date().getMonth() + 1;
      const baseDate = new Date(anioMax, mesMax - 1, 1);
      const hace6 = new Date(baseDate);
      hace6.setMonth(hace6.getMonth() - 5);
      const y6 = hace6.getFullYear();
      const m6 = String(hace6.getMonth() + 1).padStart(2, "0");
      fDesde = `${y6}-${m6}-01`;
      fHasta = maxDateStr;
    } else {
      // Modo "anio" o "todo" con año/mes seleccionados
      if (anio !== "todos") anioVal = Number(anio);
      if (mes !== "todos") mesVal = Number(mes);
    }

    let fVendedorId: number | null = null;
    let fVendedorIds: number[] | null = null;

    if (!esAdmin && vendedorIdsPermitidos) {
      if (vendedorId !== "todos") {
        fVendedorId = Number(vendedorId);
      } else {
        fVendedorIds = vendedorIdsPermitidos.length > 0 ? vendedorIdsPermitidos : [-99999];
      }
    } else {
      if (vendedorId !== "todos") {
        fVendedorId = Number(vendedorId);
      }
    }

    let fCanalId: number | null = null;
    if (canalId !== "todos") {
      fCanalId = Number(canalId);
    } else if (!esAdmin && canalesDisponibles.length === 1) {
      fCanalId = canalesDisponibles[0].id;
    }

    return {
      anio: anioVal,
      mes: mesVal,
      fecha_desde: fDesde,
      fecha_hasta: fHasta,
      canal_id: fCanalId,
      marca_id: marcaId !== "todos" ? Number(marcaId) : null,
      vendedor_id: fVendedorId,
      vendedor_ids: fVendedorIds,
      zona_id: zonaId !== "todos" ? Number(zonaId) : null,
      ciudad_id: ciudadId !== "todos" ? Number(ciudadId) : null,
    };
  }, [tipoRango, fechaDesde, fechaHasta, anio, mes, canalId, marcaId, vendedorId, zonaId, ciudadId, rangoTotal?.fechaMax, esAdmin, vendedorIdsPermitidos, canalesDisponibles]);

  const hayFiltrosActivos =
    tabActivo === "d3"
      ? tipoRango !== "todo" ||
        anio !== "todos" ||
        mes !== "todos" ||
        marcaId !== "todos" ||
        ciudadId !== "todos" ||
        filtroCanalDigital !== "todos" ||
        Boolean(fechaDesde) ||
        Boolean(fechaHasta)
      : tipoRango !== "todo" ||
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
    setTipoRango("todo");
    setFechaDesde("");
    setFechaHasta("");
    setAnio("todos");
    setMes("todos");
    setCanalId(!esAdmin && canalesDisponibles.length === 1 ? String(canalesDisponibles[0].id) : "todos");
    setMarcaId("todos");
    setVendedorId("todos");
    setZonaId("todos");
    setCiudadId("todos");
    setFiltroCanalDigital("todos");
  };

  // Modo Comparativa vs Año Anterior (YoY) - Activación On-Demand
  const [compararAnioAnterior, setCompararAnioAnterior] = useState<boolean>(false);

  const filtrosYoY = useMemo(() => {
    if (!compararAnioAnterior) return null;
    return obtenerFiltrosAnioAnterior(filtros, catalogos?.anios);
  }, [compararAnioAnterior, filtros, catalogos?.anios]);

  // Carga unificada de ventas para todos los dashboards
  const { data: rawVentas, isLoading: cVentas, isFetching: cFetching } = useQuery({
    queryKey: ["bi-fact-ventas", filtros],
    queryFn: () => obtenerVentasRaw(filtros),
    staleTime: 60 * 1000,
    // En modo "Mes Actual" esperamos a conocer el último mes con datos
    enabled: tipoRango !== "mesActual" || rangoTotal !== undefined,
  });

  // Carga on-demand de ventas del año anterior (sólo si se activa el botón)
  const { data: rawVentasYoY, isLoading: cYoYLoading } = useQuery({
    queryKey: ["bi-fact-ventas-yoy", filtrosYoY],
    queryFn: () => (filtrosYoY ? obtenerVentasRaw(filtrosYoY) : Promise.resolve([])),
    enabled: Boolean(compararAnioAnterior && filtrosYoY),
    staleTime: 60 * 1000,
  });

  const etiquetaPeriodoAnterior = useMemo(() => {
    if (filtrosYoY?.fecha_desde && filtrosYoY?.fecha_hasta) {
      return `${filtrosYoY.fecha_desde} al ${filtrosYoY.fecha_hasta}`;
    }
    if (filtrosYoY?.anio && filtrosYoY?.mes) {
      const nomMes = MESES.find((m) => m.num === filtrosYoY.mes)?.nombre || `Mes ${filtrosYoY.mes}`;
      return `${nomMes} ${filtrosYoY.anio}`;
    }
    if (filtrosYoY?.anio) {
      return `Año ${filtrosYoY.anio}`;
    }
    return "Mismo periodo del año anterior";
  }, [filtrosYoY]);

  const cMultianual = cVentas || (compararAnioAnterior && cYoYLoading);
  const cD1 = cVentas || (compararAnioAnterior && cYoYLoading);
  const cD2 = cVentas || (compararAnioAnterior && cYoYLoading);
  const cD3 = cVentas || (compararAnioAnterior && cYoYLoading);
  const cD4 = cVentas || (compararAnioAnterior && cYoYLoading);
  const cD5 = cVentas || (compararAnioAnterior && cYoYLoading);
  const cD6 = cVentas || (compararAnioAnterior && cYoYLoading);

  const dMultianual = useMemo(
    () =>
      calcularHistoricoMultianual(
        rawVentas || [],
        filtros,
        compararAnioAnterior ? rawVentasYoY : undefined
      ),
    [rawVentas, filtros, compararAnioAnterior, rawVentasYoY]
  );
  const d1 = useMemo(
    () =>
      calcularDashboard1Cumplimiento(
        rawVentas || [],
        filtros,
        catalogos,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        compararAnioAnterior ? rawVentasYoY : undefined
      ),
    [rawVentas, filtros, catalogos, compararAnioAnterior, rawVentasYoY]
  );

  const vendedorSeleccionadoNombre = useMemo(() => {
    if (vendedorId === "todos") return null;
    return catalogos?.vendedores?.find((v) => String(v.id) === String(vendedorId))?.nombre || null;
  }, [vendedorId, catalogos]);

  const zonaSeleccionadaNombre = useMemo(() => {
    if (zonaId === "todos") return null;
    return catalogos?.zonas?.find((z) => String(z.id) === String(zonaId))?.nombre || null;
  }, [zonaId, catalogos]);

  const ciudadSeleccionadaObj = useMemo(() => {
    if (ciudadId === "todos") return null;
    return catalogos?.ciudades?.find((c) => String(c.id) === String(ciudadId)) || null;
  }, [ciudadId, catalogos]);

  const ciudadSeleccionadaNombre = useMemo(() => {
    return ciudadSeleccionadaObj?.nombre || null;
  }, [ciudadSeleccionadaObj]);

  const marcasDisponibles = useMemo(() => {
    const base = catalogos?.marcas || [];
    if (vendedorId === "todos" || !rawVentas || rawVentas.length === 0) return base;
    const ids = new Set(rawVentas.map((r) => r.marca_id).filter((id): id is number => id !== null && id !== undefined && id > 0));
    const filtrados = base.filter((m) => ids.has(m.id));
    return filtrados.length > 0 ? filtrados : base;
  }, [vendedorId, rawVentas, catalogos?.marcas]);

  const zonasDisponibles = useMemo(() => {
    const base = catalogos?.zonas || [];
    if (vendedorId === "todos" || !rawVentas || rawVentas.length === 0) return base;
    const ids = new Set(rawVentas.map((r) => r.zona_id || r.zona_colombia_id).filter((id): id is number => id !== null && id !== undefined && id > 0));
    const filtrados = base.filter((z) => ids.has(z.id));
    return filtrados.length > 0 ? filtrados : base;
  }, [vendedorId, rawVentas, catalogos?.zonas]);

  const ciudadesDisponibles = useMemo(() => {
    const base = catalogos?.ciudades || [];
    if (vendedorId === "todos" || !rawVentas || rawVentas.length === 0) return base;
    const ids = new Set(rawVentas.map((r) => r.ciudad_id).filter((id): id is number => id !== null && id !== undefined && id > 0));
    const filtrados = base.filter((c) => ids.has(c.id));
    return filtrados.length > 0 ? filtrados : base;
  }, [vendedorId, rawVentas, catalogos?.ciudades]);

  // Si se selecciona un vendedor o perfil con canales fijos, sincronizar los filtros
  useEffect(() => {
    if (!esAdmin && canalesDisponibles.length === 1) {
      const unicoId = String(canalesDisponibles[0].id);
      if (canalId !== unicoId) {
        setCanalId(unicoId);
      }
    } else if (vendedorId !== "todos") {
      if (canalId !== "todos" && !canalesDisponibles.some((c) => String(c.id) === String(canalId))) {
        setCanalId("todos");
      }
    }
    if (marcaId !== "todos" && !marcasDisponibles.some((m) => String(m.id) === String(marcaId))) {
      setMarcaId("todos");
    }
    if (zonaId !== "todos" && !zonasDisponibles.some((z) => String(z.id) === String(zonaId))) {
      setZonaId("todos");
    }
    if (ciudadId !== "todos" && !ciudadesDisponibles.some((c) => String(c.id) === String(ciudadId))) {
      setCiudadId("todos");
    }
  }, [vendedorId, canalId, marcaId, zonaId, ciudadId, canalesDisponibles, marcasDisponibles, zonasDisponibles, ciudadesDisponibles, esAdmin]);

  // Redirección inteligente si se filtra por vendedor o territorio o por falta de permisos en tabs protegidos
  useEffect(() => {
    if (tabActivo === "carga" && !puedeVerCargar) {
      setTabActivo("d4");
    } else if (tabActivo === "d3" && !puedeVerDigital) {
      setTabActivo("d4");
    } else if (tabActivo === "d5" && !puedeVerMarketplaces) {
      setTabActivo("d4");
    } else if (vendedorId !== "todos") {
      if (tabActivo === "d3" || tabActivo === "d5") {
        setTabActivo("d4");
      }
    } else if (zonaId !== "todos" || (ciudadId !== "todos" && tabActivo !== "d3")) {
      if (tabActivo === "d3" || tabActivo === "d5") {
        setTabActivo("d1");
      }
    }
  }, [vendedorId, zonaId, ciudadId, tabActivo, puedeVerDigital, puedeVerMarketplaces, puedeVerCargar]);

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
    () => calcularDashboard2RunRate(rawVentas || [], filtros, compararAnioAnterior ? rawVentasYoY : undefined),
    [rawVentas, filtros, compararAnioAnterior, rawVentasYoY]
  );
  const d3 = useMemo(
    () => calcularDashboard3Digital(rawVentas || [], filtros, catalogos, undefined, filtroCanalDigital, compararAnioAnterior ? rawVentasYoY : undefined),
    [rawVentas, filtros, catalogos, filtroCanalDigital, compararAnioAnterior, rawVentasYoY]
  );
  const d4 = useMemo(
    () => calcularDashboard4FuerzaVentas(rawVentas || [], filtros, vendedoresDisponibles, catalogos?.canales, undefined, compararAnioAnterior ? rawVentasYoY : undefined),
    [rawVentas, filtros, vendedoresDisponibles, catalogos, compararAnioAnterior, rawVentasYoY]
  );
  const d5 = useMemo(
    () => calcularDashboard5Marketplaces(rawVentas || [], filtros, catalogos?.canales, compararAnioAnterior ? rawVentasYoY : undefined),
    [rawVentas, filtros, catalogos, compararAnioAnterior, rawVentasYoY]
  );
  const d6 = useMemo(
    () => calcularDashboard6Referencias(rawVentas || [], filtros, catalogos, compararAnioAnterior ? rawVentasYoY : undefined),
    [rawVentas, filtros, catalogos, compararAnioAnterior, rawVentasYoY]
  );

  const referenciasFiltradas = useMemo(() => {
    if (!d6?.todasReferencias) return [];
    let list = d6.todasReferencias;

    if (filtroLineaRef !== "todas") {
      list = list.filter((r) => r.linea === filtroLineaRef);
    }
    if (filtroAbcRef !== "todos") {
      list = list.filter((r) => r.clasificacionABC === filtroAbcRef);
    }
    if (busquedaRef.trim()) {
      const q = busquedaRef.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.sku.toLowerCase().includes(q) ||
          r.producto.toLowerCase().includes(q) ||
          r.linea.toLowerCase().includes(q)
      );
    }

    const sorted = [...list];
    if (ordenRef === "ventaDesc") {
      sorted.sort((a, b) => b.ventaNeta - a.ventaNeta);
    } else if (ordenRef === "unidadesDesc") {
      sorted.sort((a, b) => b.unidades - a.unidades);
    } else if (ordenRef === "precioDesc") {
      sorted.sort((a, b) => b.precioPromedio - a.precioPromedio);
    } else if (ordenRef === "devDesc") {
      sorted.sort((a, b) => b.devoluciones - a.devoluciones);
    } else if (ordenRef === "paretoAsc") {
      sorted.sort((a, b) => a.acumuladoPareto - b.acumuladoPareto);
    }

    return sorted;
  }, [d6, filtroLineaRef, filtroAbcRef, busquedaRef, ordenRef]);

  const referenciasPaginadas = useMemo(() => {
    if (filasPorPaginaRef === "todas") return referenciasFiltradas;
    const limit = Number(filasPorPaginaRef) || 25;
    const start = (paginaRef - 1) * limit;
    return referenciasFiltradas.slice(start, start + limit);
  }, [referenciasFiltradas, paginaRef, filasPorPaginaRef]);

  const totalPaginasRef = useMemo(() => {
    if (filasPorPaginaRef === "todas") return 1;
    const limit = Number(filasPorPaginaRef) || 25;
    return Math.max(1, Math.ceil(referenciasFiltradas.length / limit));
  }, [referenciasFiltradas.length, filasPorPaginaRef]);

  const exportarCSVReferencias = () => {
    if (!referenciasFiltradas || referenciasFiltradas.length === 0) {
      toast.info("No hay datos de referencias para exportar");
      return;
    }
    const headers = [
      "Ranking",
      "SKU / Referencia",
      "Producto / Descripcion",
      "Linea",
      "Marca",
      "Unidades Vendidas",
      "Venta Bruta",
      "Devoluciones",
      "Venta Neta",
      "Precio Promedio Unitario",
      "Tasa Devolucion %",
      "Participacion Venta %",
      "Acumulado Pareto %",
      "Clasificacion ABC",
    ];
    const csvRows = [
      headers.join(","),
      ...referenciasFiltradas.map((r, idx) => [
        idx + 1,
        `"${(r.sku || "").replace(/"/g, '""')}"`,
        `"${(r.producto || "").replace(/"/g, '""')}"`,
        `"${(r.linea || "").replace(/"/g, '""')}"`,
        `"${(r.marca || "").replace(/"/g, '""')}"`,
        r.unidades,
        r.ventaBruta,
        r.devoluciones,
        r.ventaNeta,
        r.precioPromedio,
        r.tasaDevolucion,
        r.porcentajeVenta,
        r.acumuladoPareto,
        `"${r.clasificacionABC}"`,
      ].join(",")),
    ];
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `catalogo_referencias_truccos_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Catálogo de referencias descargado en CSV con éxito");
  };

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
    cerrarSesionActiva();
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950/80 font-sans">
      {/* Header Superior */}
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-xl shadow-2xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-indigo-700 text-white font-bold text-lg shadow-sm shadow-indigo-500/25 shrink-0">
              T
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-display text-lg font-bold tracking-tight text-foreground">Trucco´s BI</p>
                <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  Analytics
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground font-medium">Plataforma Consolidada de Inteligencia Comercial</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {rangoTotal?.fechaMin && rangoTotal?.fechaMax && (
              <Badge variant="outline" className="hidden md:inline-flex bg-primary/10 border-primary/20 text-primary font-mono text-xs">
                <Calendar className="mr-1.5 h-3 w-3" />
                Rango: {rangoTotal.fechaMin} al {rangoTotal.fechaMax}
              </Badge>
            )}
            {cFetching && (
              <Badge variant="secondary" className="animate-pulse bg-primary/15 border-primary/30 text-primary font-medium text-xs">
                <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                Actualizando...
              </Badge>
            )}

            {/* Acciones de administración de permisos */}
            {esAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setModalPermisosAbierto(true)}
                className="h-8 text-xs font-semibold border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 gap-1.5 shadow-2xs"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                <span className="hidden md:inline">Administrar Vendedores</span>
                <span className="md:hidden">Permisos</span>
              </Button>
            )}

            {simulacionActual && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  establecerSimulacionAdmin(null);
                  setPermisoVersion((v) => v + 1);
                  toast.info("Vista de administrador restaurada");
                }}
                className="h-8 text-xs font-semibold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 gap-1.5"
                title="Haga clic para volver a la vista total de administrador"
              >
                <Eye className="h-3.5 w-3.5 animate-pulse text-amber-600 dark:text-amber-400" />
                <span className="hidden sm:inline">Simulando: {simulacionActual.email}</span>
                <span className="sm:hidden">Salir Simulación</span>
              </Button>
            )}

            {!esAdmin && !simulacionActual && (
              <Badge
                variant="secondary"
                className="hidden sm:inline-flex bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-xs gap-1"
              >
                <UserCheck className="h-3 w-3" />
                {vendedoresDisponibles.length === 1
                  ? "1 Vendedor Asignado"
                  : `${vendedoresDisponibles.length} Vendedores Asignados`}
              </Badge>
            )}

            <Badge variant="outline" className="hidden sm:inline-flex bg-muted/40 font-mono text-xs">
              {(resumen?.totalVentas ?? 0).toLocaleString("es-CO")} registros
            </Badge>
            <Button variant="ghost" size="sm" onClick={salir} className="h-8 text-xs font-medium hover:bg-muted/80">
              Cerrar sesión
            </Button>
          </div>
        </div>

        {/* Barra de Filtros Globales (Slicers) */}
        <div className="border-t border-border/50 bg-background/60 backdrop-blur-md px-4 py-2 sm:px-6">
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

            {/* Si estamos en el Dashboard Digital (d3), desactivamos los filtros físicos y activamos el selector de canal digital */}
            {tabActivo === "d3" ? (
              <>
                {/* Selector especializado de Canal Digital */}
                <Select
                  value={filtroCanalDigital}
                  onValueChange={(v: "todos" | "tienda_virtual" | "redes_sociales") => setFiltroCanalDigital(v)}
                >
                  <SelectTrigger className="h-8 w-[205px] text-xs bg-background border-indigo-500/60 text-indigo-700 dark:text-indigo-300 font-semibold shadow-xs">
                    <SelectValue placeholder="Canal Digital" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">🌐 Todo el Ecosistema Digital</SelectItem>
                    <SelectItem value="tienda_virtual">🛒 Tienda Virtual (Shopify / Web)</SelectItem>
                    <SelectItem value="redes_sociales">📱 Redes Sociales (WhatsApp)</SelectItem>
                  </SelectContent>
                </Select>

                {/* Marca */}
                <Select value={marcaId} onValueChange={setMarcaId}>
                  <SelectTrigger className="h-8 w-[130px] text-xs bg-background">
                    <SelectValue placeholder="Marca" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72 overflow-y-auto">
                    <SelectItem value="todos">Todas las Marcas</SelectItem>
                    {marcasDisponibles.map((m) => (
                      <SelectItem key={m.id} value={String(m.id)}>
                        {m.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Ciudad (Compradores Digitales) */}
                <Select value={ciudadId} onValueChange={setCiudadId}>
                  <SelectTrigger className={`h-8 w-[140px] text-xs bg-background ${ciudadId !== "todos" ? "border-emerald-500 font-semibold text-emerald-700 dark:text-emerald-300" : ""}`}>
                    <SelectValue placeholder="Ciudad Destino" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72 overflow-y-auto">
                    <SelectItem value="todos">Todas las Ciudades</SelectItem>
                    {ciudadesDisponibles.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Badge variant="outline" className="hidden lg:inline-flex bg-indigo-500/10 text-indigo-600 border-indigo-500/30 text-xs font-semibold py-1 px-2.5 items-center gap-1.5 ml-auto">
                  <Globe className="h-3.5 w-3.5" />
                  Modo Enfoque Digital
                </Badge>
              </>
            ) : (
              <>
                {/* Canal Físico/General */}
                <Select value={canalId} onValueChange={setCanalId} disabled={!esAdmin && canalesDisponibles.length === 1}>
                  <SelectTrigger className="h-8 w-[140px] text-xs bg-background">
                    <SelectValue placeholder="Canal" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72 overflow-y-auto">
                    {(esAdmin || canalesDisponibles.length > 1) && (
                      <SelectItem value="todos">Todos los Canales</SelectItem>
                    )}
                    {canalesDisponibles.map((c) => (
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
                    {marcasDisponibles.map((m) => (
                      <SelectItem key={m.id} value={String(m.id)}>
                        {m.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Vendedor */}
                <Select value={vendedorId} onValueChange={setVendedorId}>
                  <SelectTrigger className="h-8 min-w-[150px] max-w-[200px] text-xs bg-background">
                    <SelectValue placeholder="Vendedor" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72 overflow-y-auto">
                    <SelectItem value="todos">
                      {esAdmin
                        ? "Todos los Vendedores"
                        : vendedoresDisponibles.length === 1
                        ? "Mi Vendedor Asignado"
                        : `Mis Vendedores (${vendedoresDisponibles.length})`}
                    </SelectItem>
                    {vendedoresDisponibles.map((v) => (
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
                    {zonasDisponibles.map((z) => (
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
                    {ciudadesDisponibles.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}

            <div className="h-4 w-px bg-border/80 mx-1 hidden sm:block" />

            {/* Botón On-Demand para Comparativa vs Año Anterior (YoY) */}
            <Button
              type="button"
              variant={compararAnioAnterior ? "default" : "outline"}
              size="sm"
              onClick={() => setCompararAnioAnterior((prev) => !prev)}
              className={cn(
                "h-8 px-3 text-xs font-semibold transition-all duration-200 shadow-xs",
                compararAnioAnterior
                  ? "bg-amber-600 hover:bg-amber-700 text-white border-amber-600 ring-2 ring-amber-500/20"
                  : "bg-background text-foreground hover:bg-muted/80 border-amber-500/40 text-amber-700 dark:text-amber-400 hover:border-amber-500"
              )}
            >
              <History className="mr-1.5 h-3.5 w-3.5" />
              <span>Vs. Año Anterior (YoY)</span>
              {compararAnioAnterior && (
                <span className="ml-1.5 px-1.5 py-0.2 bg-white/20 text-white rounded text-[10px] font-bold">
                  ON
                </span>
              )}
            </Button>

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
        {/* Banner Informativo de Comparación YoY Activa */}
        {compararAnioAnterior && (
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/15 via-indigo-500/10 to-amber-500/15 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-amber-500/20 border border-amber-500/40 grid place-items-center shrink-0">
                <TrendingUp className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  Modo Comparativa vs Año Anterior Activado
                  {cYoYLoading && <Loader2 className="h-3 w-3 animate-spin text-amber-600" />}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Comparando contra: <strong className="text-amber-700 dark:text-amber-300">{etiquetaPeriodoAnterior}</strong>. Los indicadores, gráficas y tablas reflejan variaciones YoY y valores del periodo previo.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCompararAnioAnterior(false)}
                className="h-7 text-xs text-muted-foreground hover:text-foreground hover:bg-amber-500/20"
              >
                Desactivar Comparación
              </Button>
            </div>
          </div>
        )}

        {!esAdmin && vendedoresDisponibles.length === 0 && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 shadow-2xs">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-300">
                Sin asesores asignados para consulta
              </p>
              <p className="text-xs text-amber-800/80 dark:text-amber-400/80 mt-0.5">
                Tu usuario ({currentUser?.email}) no tiene vendedores vinculados todavía. Contacta al administrador para que configure tus asesores comerciales permitidos.
              </p>
            </div>
          </div>
        )}

        <Tabs value={tabActivo} onValueChange={setTabActivo} className="space-y-6">
          {tabActivo === "d3" ? (
            /* Barra de Enfoque Exclusivo Digital: Oculta y desactiva todos los demás dashboards */
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-indigo-500/10 dark:bg-indigo-950/40 rounded-xl border border-indigo-500/30 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-indigo-600 text-white font-bold shadow-xs shrink-0">
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-sm text-foreground font-display">
                      Dashboard 3: E-Commerce, Social Selling y Marketing Digital
                    </span>
                    <Badge variant="outline" className="bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-500/40 font-semibold text-[11px]">
                      ✨ Modo Enfoque Digital Activo
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Los demás paneles están desactivados para concentrar la visualización y análisis exclusivamente en canales digitales.
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-semibold border-indigo-500/40 hover:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 hover:text-indigo-950 dark:hover:text-white flex items-center gap-1.5 shrink-0 bg-background/80"
                onClick={() => setTabActivo("multianual")}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Volver a Todos los Dashboards
              </Button>
            </div>
          ) : vendedorId !== "todos" ? (
            <div className="space-y-3">
              {/* Barra de Enfoque Exclusivo Vendedor / Asesor Comercial */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-amber-500/10 dark:bg-amber-950/40 rounded-xl border border-amber-500/30 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-amber-600 text-white font-bold shadow-xs shrink-0">
                    <Award className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-foreground font-display">
                        Modo Enfoque: Asesor Comercial — {vendedorSeleccionadoNombre}
                      </span>
                      <Badge variant="outline" className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 font-semibold text-[11px]">
                        ✨ Enfoque Vendedor Activo
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Los paneles de Canales Digitales y Marketplaces se han desactivado para concentrar el análisis exclusivamente en el desempeño del vendedor.
                    </p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-semibold border-amber-500/40 hover:bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:text-amber-950 dark:hover:text-white flex items-center gap-1.5 shrink-0 bg-background/80"
                  onClick={() => setVendedorId("todos")}
                >
                  <FilterX className="h-3.5 w-3.5" />
                  Ver Todos los Vendedores
                </Button>
              </div>

              {/* Tabs enfocados para Vendedor (sin Digital ni Marketplaces) */}
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-6 lg:grid-cols-7 h-auto p-1.5 bg-card/85 backdrop-blur-md rounded-2xl border border-border/70 shadow-2xs gap-1">
                <TabsTrigger
                  value="d4"
                  className="flex items-center gap-1.5 py-2 px-2 text-xs font-semibold rounded-xl data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400 data-[state=active]:shadow-2xs transition-all duration-200"
                >
                  <Award className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  4. Fuerza Ventas
                </TabsTrigger>
                <TabsTrigger
                  value="d1"
                  className="flex items-center gap-1.5 py-2 px-2 text-xs font-semibold rounded-xl data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-2xs transition-all duration-200"
                >
                  <TrendingUp className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                  1. Cumplimiento
                </TabsTrigger>
                <TabsTrigger
                  value="d2"
                  className="flex items-center gap-1.5 py-2 px-2 text-xs font-semibold rounded-xl data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 data-[state=active]:shadow-2xs transition-all duration-200"
                >
                  <Calendar className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  2. Run Rate
                </TabsTrigger>
                <TabsTrigger
                  value="referencias"
                  className="flex items-center gap-1.5 py-2 px-2 text-xs font-semibold rounded-xl data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-600 dark:data-[state=active]:text-cyan-400 data-[state=active]:shadow-2xs transition-all duration-200"
                >
                  <Package className="h-3.5 w-3.5 text-cyan-500 shrink-0" />
                  6. Referencias
                </TabsTrigger>
                <TabsTrigger
                  value="multianual"
                  className="flex items-center gap-1.5 py-2 px-2 text-xs font-semibold rounded-xl data-[state=active]:bg-purple-500/10 data-[state=active]:text-purple-600 dark:data-[state=active]:text-purple-400 data-[state=active]:shadow-2xs transition-all duration-200"
                >
                  <History className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                  Multianual
                </TabsTrigger>
                <TabsTrigger
                  value="explorador"
                  className="flex items-center gap-1.5 py-2 px-2 text-xs font-semibold rounded-xl data-[state=active]:bg-teal-500/10 data-[state=active]:text-teal-600 dark:data-[state=active]:text-teal-400 data-[state=active]:shadow-2xs transition-all duration-200"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-teal-500 shrink-0" />
                  Detalle
                </TabsTrigger>
                {esAdmin && (
                  <TabsTrigger
                    value="carga"
                    className="flex items-center gap-1.5 py-2 px-2 text-xs font-semibold rounded-xl data-[state=active]:bg-slate-500/10 data-[state=active]:text-slate-700 dark:data-[state=active]:text-slate-300 data-[state=active]:shadow-2xs transition-all duration-200"
                  >
                    <UploadCloud className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                    Cargar
                  </TabsTrigger>
                )}
              </TabsList>
            </div>
          ) : (zonaId !== "todos" || ciudadId !== "todos") ? (
            <div className="space-y-3">
              {/* Barra de Enfoque Exclusivo Territorial / Regional */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-blue-500/10 dark:bg-blue-950/40 rounded-xl border border-blue-500/30 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-blue-600 text-white font-bold shadow-xs shrink-0">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-foreground font-display">
                        Modo Enfoque Territorial — {zonaSeleccionadaNombre ? `Zona: ${zonaSeleccionadaNombre}` : `Ciudad: ${ciudadSeleccionadaNombre}`}
                      </span>
                      <Badge variant="outline" className="bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/40 font-semibold text-[11px]">
                        ✨ Enfoque Territorial Activo
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Los paneles no territoriales se han desactivado para concentrar el análisis en la cobertura y cumplimiento de esta región.
                    </p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-semibold border-blue-500/40 hover:bg-blue-500/15 text-blue-700 dark:text-blue-300 hover:text-blue-950 dark:hover:text-white flex items-center gap-1.5 shrink-0 bg-background/80"
                  onClick={() => {
                    setZonaId("todos");
                    setCiudadId("todos");
                  }}
                >
                  <FilterX className="h-3.5 w-3.5" />
                  Restablecer Territorio
                </Button>
              </div>

              {/* Tabs enfocados para Región (sin Digital ni Marketplaces) */}
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-6 lg:grid-cols-7 h-auto p-1.5 bg-card/85 backdrop-blur-md rounded-2xl border border-border/70 shadow-2xs gap-1">
                <TabsTrigger
                  value="d1"
                  className="flex items-center gap-1.5 py-2 px-2 text-xs font-semibold rounded-xl data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-2xs transition-all duration-200"
                >
                  <TrendingUp className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                  1. Cumplimiento
                </TabsTrigger>
                <TabsTrigger
                  value="d2"
                  className="flex items-center gap-1.5 py-2 px-2 text-xs font-semibold rounded-xl data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 data-[state=active]:shadow-2xs transition-all duration-200"
                >
                  <Calendar className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  2. Run Rate
                </TabsTrigger>
                <TabsTrigger
                  value="d4"
                  className="flex items-center gap-1.5 py-2 px-2 text-xs font-semibold rounded-xl data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400 data-[state=active]:shadow-2xs transition-all duration-200"
                >
                  <Award className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  4. Fuerza Ventas
                </TabsTrigger>
                <TabsTrigger
                  value="referencias"
                  className="flex items-center gap-1.5 py-2 px-2 text-xs font-semibold rounded-xl data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-600 dark:data-[state=active]:text-cyan-400 data-[state=active]:shadow-2xs transition-all duration-200"
                >
                  <Package className="h-3.5 w-3.5 text-cyan-500 shrink-0" />
                  6. Referencias
                </TabsTrigger>
                <TabsTrigger
                  value="multianual"
                  className="flex items-center gap-1.5 py-2 px-2 text-xs font-semibold rounded-xl data-[state=active]:bg-purple-500/10 data-[state=active]:text-purple-600 dark:data-[state=active]:text-purple-400 data-[state=active]:shadow-2xs transition-all duration-200"
                >
                  <History className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                  Multianual
                </TabsTrigger>
                <TabsTrigger
                  value="explorador"
                  className="flex items-center gap-1.5 py-2 px-2 text-xs font-semibold rounded-xl data-[state=active]:bg-teal-500/10 data-[state=active]:text-teal-600 dark:data-[state=active]:text-teal-400 data-[state=active]:shadow-2xs transition-all duration-200"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-teal-500 shrink-0" />
                  Detalle
                </TabsTrigger>
                {esAdmin && (
                  <TabsTrigger
                    value="carga"
                    className="flex items-center gap-1.5 py-2 px-2 text-xs font-semibold rounded-xl data-[state=active]:bg-slate-500/10 data-[state=active]:text-slate-700 dark:data-[state=active]:text-slate-300 data-[state=active]:shadow-2xs transition-all duration-200"
                  >
                    <UploadCloud className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                    Cargar
                  </TabsTrigger>
                )}
              </TabsList>
            </div>
          ) : (
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 md:grid-cols-8 lg:grid-cols-9 h-auto p-1.5 bg-card/85 backdrop-blur-md rounded-2xl border border-border/70 shadow-2xs gap-1">
              <TabsTrigger
                value="multianual"
                className="flex items-center gap-1.5 py-2 px-2 text-xs font-semibold rounded-xl data-[state=active]:bg-purple-500/10 data-[state=active]:text-purple-600 dark:data-[state=active]:text-purple-400 data-[state=active]:shadow-2xs transition-all duration-200"
              >
                <History className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                Multianual
              </TabsTrigger>
              <TabsTrigger
                value="d1"
                className="flex items-center gap-1.5 py-2 px-2 text-xs font-semibold rounded-xl data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-2xs transition-all duration-200"
              >
                <TrendingUp className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                1. Cumplimiento
              </TabsTrigger>
              <TabsTrigger
                value="d2"
                className="flex items-center gap-1.5 py-2 px-2 text-xs font-semibold rounded-xl data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 data-[state=active]:shadow-2xs transition-all duration-200"
              >
                <Calendar className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                2. Run Rate
              </TabsTrigger>
              {puedeVerDigital && (
                <TabsTrigger
                  value="d3"
                  className="flex items-center gap-1.5 py-2 px-2 text-xs font-semibold rounded-xl data-[state=active]:bg-indigo-500/10 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 data-[state=active]:shadow-2xs transition-all duration-200"
                >
                  <Globe className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                  3. Digital
                </TabsTrigger>
              )}
              <TabsTrigger
                value="d4"
                className="flex items-center gap-1.5 py-2 px-2 text-xs font-semibold rounded-xl data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400 data-[state=active]:shadow-2xs transition-all duration-200"
              >
                <Award className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                4. Fuerza Ventas
              </TabsTrigger>
              {puedeVerMarketplaces && (
                <TabsTrigger
                  value="d5"
                  className="flex items-center gap-1.5 py-2 px-2 text-xs font-semibold rounded-xl data-[state=active]:bg-pink-500/10 data-[state=active]:text-pink-600 dark:data-[state=active]:text-pink-400 data-[state=active]:shadow-2xs transition-all duration-200"
                >
                  <ShoppingBag className="h-3.5 w-3.5 text-pink-500 shrink-0" />
                  5. Marketplaces
                </TabsTrigger>
              )}
              <TabsTrigger
                value="referencias"
                className="flex items-center gap-1.5 py-2 px-2 text-xs font-semibold rounded-xl data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-600 dark:data-[state=active]:text-cyan-400 data-[state=active]:shadow-2xs transition-all duration-200"
              >
                <Package className="h-3.5 w-3.5 text-cyan-500 shrink-0" />
                6. Referencias
              </TabsTrigger>
              <TabsTrigger
                value="explorador"
                className="flex items-center gap-1.5 py-2 px-2 text-xs font-semibold rounded-xl data-[state=active]:bg-teal-500/10 data-[state=active]:text-teal-600 dark:data-[state=active]:text-teal-400 data-[state=active]:shadow-2xs transition-all duration-200"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-teal-500 shrink-0" />
                Detalle
              </TabsTrigger>
              {esAdmin && (
                <TabsTrigger
                  value="carga"
                  className="flex items-center gap-1.5 py-2 px-2 text-xs font-semibold rounded-xl data-[state=active]:bg-slate-500/10 data-[state=active]:text-slate-700 dark:data-[state=active]:text-slate-300 data-[state=active]:shadow-2xs transition-all duration-200"
                >
                  <UploadCloud className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                  Cargar
                </TabsTrigger>
              )}
            </TabsList>
          )}

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
                titulo={compararAnioAnterior && dMultianual?.aniosResumen.length ? `Facturación Año ${dMultianual.aniosResumen[0].anio}` : "Facturación Histórica Total"}
                valor={formatoCOPFull(
                  compararAnioAnterior && dMultianual?.aniosResumen.length
                    ? dMultianual.aniosResumen[0].totalVentas
                    : (dMultianual?.aniosResumen || []).reduce((a, b) => a + b.totalVentas, 0)
                )}
                subtexto={
                  compararAnioAnterior && dMultianual?.aniosResumen.length
                    ? `Periodo activo en año ${dMultianual.aniosResumen[0].anio}`
                    : `Acumulado de todos los años en el documento`
                }
                icono={<DollarSign className="h-5 w-5 text-emerald-500" />}
                cargando={cMultianual}
                badgeYoY={
                  compararAnioAnterior && dMultianual?.aniosResumen && dMultianual.aniosResumen.length > 1
                    ? (
                      <BadgeYoY
                        actual={dMultianual.aniosResumen[0].totalVentas}
                        anterior={dMultianual.aniosResumen[1].totalVentas}
                        porcentaje={dMultianual.aniosResumen[0].crecimientoYoYPct}
                        label={`año ${dMultianual.aniosResumen[1].anio}`}
                      />
                    )
                    : undefined
                }
              />
              <CardKpi
                titulo={compararAnioAnterior && dMultianual?.aniosResumen.length ? `Unidades Año ${dMultianual.aniosResumen[0].anio}` : "Unidades Históricas Vendidas"}
                valor={`${(
                  compararAnioAnterior && dMultianual?.aniosResumen.length
                    ? dMultianual.aniosResumen[0].totalUnidades
                    : (dMultianual?.aniosResumen || []).reduce((a, b) => a + b.totalUnidades, 0)
                ).toLocaleString("es-CO")} unds`}
                subtexto={
                  compararAnioAnterior && dMultianual?.aniosResumen.length
                    ? `Prendas facturadas en año ${dMultianual.aniosResumen[0].anio}`
                    : "Total de prendas y artículos facturados"
                }
                icono={<Package className="h-5 w-5 text-blue-500" />}
                cargando={cMultianual}
                badgeYoY={
                  compararAnioAnterior && dMultianual?.aniosResumen && dMultianual.aniosResumen.length > 1
                    ? (
                      <BadgeYoYUnidades
                        actual={dMultianual.aniosResumen[0].totalUnidades}
                        anterior={dMultianual.aniosResumen[1].totalUnidades}
                        label={`año ${dMultianual.aniosResumen[1].anio}`}
                      />
                    )
                    : undefined
                }
              />
              <CardKpi
                titulo="Años Registrados"
                valor={`${dMultianual?.aniosResumen.length ?? 0} Años`}
                subtexto={`Rango: ${(dMultianual?.aniosPresentes || []).join(", ")}`}
                icono={<History className="h-5 w-5 text-purple-500" />}
                cargando={cMultianual}
              />
              <CardKpi
                titulo={compararAnioAnterior && dMultianual?.aniosResumen.length ? `Transacciones Año ${dMultianual.aniosResumen[0].anio}` : "Transacciones Totales"}
                valor={(
                  compararAnioAnterior && dMultianual?.aniosResumen.length
                    ? dMultianual.aniosResumen[0].totalTransacciones
                    : (dMultianual?.aniosResumen || []).reduce((a, b) => a + b.totalTransacciones, 0)
                ).toLocaleString("es-CO")}
                subtexto={
                  compararAnioAnterior && dMultianual?.aniosResumen.length
                    ? `Documentos en año ${dMultianual.aniosResumen[0].anio}`
                    : "Facturas y recibos únicos procesados"
                }
                icono={<Receipt className="h-5 w-5 text-amber-500" />}
                cargando={cMultianual}
                badgeYoY={
                  compararAnioAnterior && dMultianual?.aniosResumen && dMultianual.aniosResumen.length > 1
                    ? (
                      <BadgeYoY
                        actual={dMultianual.aniosResumen[0].totalTransacciones}
                        anterior={dMultianual.aniosResumen[1].totalTransacciones}
                        tipo="entero"
                        label={`trans. ${dMultianual.aniosResumen[1].anio}`}
                      />
                    )
                    : undefined
                }
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
                  <div className="flex items-center gap-2">
                    <InfoGrafica
                      titulo="Facturación Anual Comparativa"
                      descripcion="Compara la facturación neta total y el margen generado en cada uno de los años registrados en el documento."
                      metrica="Suma consolidada de ventas brutas menos devoluciones por año calendario."
                      interpretacion="Permite evaluar la tasa de crecimiento interanual (YoY) y la estabilidad financiera del negocio en el tiempo."
                    />
                    <Badge variant="outline">Anual</Badge>
                  </div>
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
                  <div className="flex items-center gap-2">
                    <InfoGrafica
                      titulo="Curvas de Estacionalidad Mensual"
                      descripcion="Superpone la curva mensual de ventas de cada año para identificar patrones estacionales fijos del comportamiento de compra."
                      metrica="Ventas netas mes a mes (Enero a Diciembre) desglosadas por línea de color para cada año."
                      interpretacion="Identifica picos comerciales (Día de la Madre, Amor y Amistad, Diciembre) y valles para sincronizar compras de insumos, confección y promociones."
                    />
                    <Badge variant="outline">Estacionalidad</Badge>
                  </div>
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
            <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6">
              <CardKpi
                titulo="Venta Neta Total"
                valor={formatoCOPFull(d1?.kpis.ventaYTD ?? 0)}
                subtexto={`Bruta: ${formatoCOP(d1?.kpis.ventaBrutaTotal ?? 0)}`}
                icono={<DollarSign className="h-5 w-5 text-emerald-500" />}
                cargando={cD1}
                badgeYoY={compararAnioAnterior ? <BadgeYoY actual={d1?.kpis.ventaYTD} anterior={d1?.kpis.ventaAnteriorTotal} porcentaje={d1?.kpis.crecimientoYoYPct} /> : undefined}
              />
              <CardKpi
                titulo="Cumplimiento PPTO"
                valor={`${d1?.kpis.cumplimientoGlobalPct ?? 0}%`}
                subtexto={`Meta: ${formatoCOP(d1?.kpis.pptoYTD ?? 0)}`}
                icono={<Percent className="h-5 w-5 text-blue-500" />}
                cargando={cD1}
                badgeSemaforo={d1?.kpis.cumplimientoGlobalPct}
                badgeYoY={compararAnioAnterior ? <BadgeYoY actual={d1?.kpis.cumplimientoGlobalPct} anterior={d1?.kpis.cumplimientoAnteriorPct} tipo="pct" label="cumpl. año ant." /> : undefined}
              />
              <CardKpi
                titulo="Volumen Unidades"
                valor={`${(d1?.kpis.volumenUnidades ?? 0).toLocaleString("es-CO")} unds`}
                subtexto="Prendas comercializadas"
                icono={<Package className="h-5 w-5 text-indigo-500" />}
                cargando={cD1}
                badgeYoY={compararAnioAnterior ? <BadgeYoYUnidades actual={d1?.kpis.volumenUnidades} anterior={d1?.kpis.unidadesAnteriorTotal} /> : undefined}
              />
              <CardKpi
                titulo="Tasa Devolución"
                valor={`${d1?.kpis.tasaDevolucionGlobalPct ?? 0}%`}
                subtexto={`Total: ${formatoCOP(d1?.kpis.devolucionesTotal ?? 0)}`}
                icono={<ArrowDownRight className="h-5 w-5 text-rose-500" />}
                cargando={cD1}
                badgeYoY={compararAnioAnterior ? <BadgeYoY actual={d1?.kpis.tasaDevolucionGlobalPct} anterior={d1?.kpis.tasaDevolucionAnteriorPct} tipo="pct" invertido={true} label="tasa año ant." /> : undefined}
              />
              <CardKpi
                titulo="Ticket Promedio"
                valor={formatoCOP(d1?.kpis.ticketPromedio ?? 0)}
                subtexto={`${(d1?.kpis.totalTransacciones ?? 0).toLocaleString("es-CO")} transacciones`}
                icono={<Receipt className="h-5 w-5 text-amber-500" />}
                cargando={cD1}
                badgeYoY={compararAnioAnterior ? <BadgeYoY actual={d1?.kpis.ticketPromedio} anterior={d1?.kpis.ticketPromedioAnterior} /> : undefined}
              />
              <CardKpi
                titulo="Precio Prom. / Prenda"
                valor={formatoCOP(d1?.kpis.precioPromedioPrenda ?? 0)}
                subtexto="Por unidad vendida"
                icono={<Tag className="h-5 w-5 text-cyan-500" />}
                cargando={cD1}
                badgeYoY={compararAnioAnterior ? <BadgeYoY actual={d1?.kpis.precioPromedioPrenda} anterior={d1?.kpis.precioPromedioPrendaAnterior} /> : undefined}
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
                      {d1?.meses.length ?? 0} periodos registrados en el análisis {compararAnioAnterior && "• Superposición de Venta Año Anterior activada"}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <InfoGrafica
                      titulo="Venta Real vs. Presupuesto (PPTO)"
                      descripcion="Compara la ejecución real de ventas monetarias frente a la cuota presupuestada para cada mes, mostrando el % de cumplimiento relativo."
                      metrica="Barras azules: Venta real ($). Barras grises: Presupuesto ($). Línea verde: % de cumplimiento meta. Línea ámbar punteada: Venta Año Anterior."
                      interpretacion="Permite evaluar qué meses superaron la meta comercial (verde) y en cuáles existió brecha presupuestal para ajustar tácticas de venta."
                    />
                    <Badge variant="outline">
                      {anio === "todos" ? "Todo el Histórico" : `Año ${anio}`}
                    </Badge>
                  </div>
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
                            if (name === "cumplimientoPct" || name === "% Cumplimiento") return [`${Number(value).toFixed(1)}%`, "% Cumplimiento"];
                            if (name === "ventaAnterior" || name === "Venta Año Anterior ($)") return [formatoCOPFull(value), "Venta Año Anterior"];
                            return [formatoCOPFull(value), name === "ventaReal" || name === "Venta Real ($)" ? "Venta Real" : "Presupuesto (PPTO)"];
                          }}
                        />
                        <Legend
                          formatter={(v) => (v === "ventaReal" ? "Venta Real ($)" : v === "ventaAnterior" ? "Venta Año Anterior ($)" : v === "ppto" ? "Presupuesto ($ PPTO)" : "% Cumplimiento")}
                        />
                        <Bar yAxisId="left" dataKey="ventaReal" fill="#2563eb" radius={[4, 4, 0, 0]} />
                        {compararAnioAnterior && (
                          <Line yAxisId="left" type="monotone" dataKey="ventaAnterior" stroke="#f59e0b" strokeWidth={2.5} strokeDasharray="4 4" dot={{ r: 3.5, fill: "#f59e0b" }} />
                        )}
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
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                            1. Participación por Zonas Comerciales
                          </span>
                          <InfoGrafica
                            titulo="Participación por Zonas Comerciales"
                            descripcion="Muestra la facturación y el volumen de prendas concentrado en cada departamento o macro-zona geográfica."
                            metrica="Ventas netas ($) y % de participación por zona comercial."
                            interpretacion="Permite evaluar qué regiones geográficas tienen mayor peso comercial y detectar oportunidades de expansión territorial."
                          />
                        </div>
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
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                            <span>2. {zonaUbicacionD1 === "todas" ? "Top Ciudades Líderes en Facturación" : `Ciudades en Zona: ${zonaUbicacionD1}`}</span>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                              (Clic para filtrar)
                            </span>
                          </span>
                          <InfoGrafica
                            titulo="Top Ciudades Líderes en Facturación"
                            descripcion="Ranking de los municipios y ciudades con mayores ingresos por ventas. Al hacer clic en una barra, toda la plataforma se filtra para esa ciudad."
                            metrica="Facturación neta ($) por ciudad destino de la factura."
                            interpretacion="Permite enfocar rutas comerciales, logística de despacho y apertura de puntos de venta o distribuidores clave."
                          />
                        </div>
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

              {/* Mix de Marcas */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Tag className="h-4 w-4 text-emerald-500" /> Mix por Marca
                      </CardTitle>
                      <CardDescription>Participación de ventas por marca comercial</CardDescription>
                    </div>
                    <InfoGrafica
                      titulo="Mix por Marca"
                      descripcion="Distribución de la facturación y participación porcentual entre las diferentes marcas (Trucco's, Rappaz, etc.)."
                      metrica="Facturación acumulada ($) y porcentaje (%) de participación sobre la venta total."
                      interpretacion="Permite analizar el peso relativo de cada marca en el portafolio comercial."
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={d1?.mixMarcas || []} layout="vertical" margin={{ left: 10, right: 50, top: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} horizontal={false} />
                        <XAxis type="number" tickFormatter={(v) => formatoCOP(v)} tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="marca" width={110} tick={{ fontSize: 11 }} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload as { marca: string; venta: number; porcentaje: number };
                              return (
                                <div className="bg-popover/95 backdrop-blur-md border border-border p-3 rounded-xl shadow-lg text-xs space-y-1.5 min-w-[210px]">
                                  <p className="font-bold text-foreground text-sm flex items-center gap-1.5">
                                    <Tag className="h-3.5 w-3.5 text-emerald-500" />
                                    {data.marca}
                                  </p>
                                  <div className="flex items-center justify-between gap-4 text-muted-foreground pt-1">
                                    <span>Facturación:</span>
                                    <span className="font-bold text-foreground">{formatoCOPFull(data.venta)}</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-4 border-t border-border/60 pt-1.5 mt-1 bg-emerald-500/10 -mx-3 -mb-3 p-2.5 rounded-b-lg">
                                    <span className="font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                                      <Percent className="h-3 w-3" /> Participación Total:
                                    </span>
                                    <span className="font-extrabold text-emerald-700 dark:text-emerald-300 text-sm">
                                      {data.porcentaje}%
                                    </span>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="venta" fill="#10b981" radius={[0, 4, 4, 0]}>
                          {(d1?.mixMarcas || []).map((_, i) => (
                            <Cell key={`mix-marca-${i}`} fill={COLORES[(i + 1) % COLORES.length]} />
                          ))}
                          <LabelList
                            dataKey="porcentaje"
                            position="right"
                            formatter={(v: number) => `${v}%`}
                            className="fill-foreground text-[11px] font-bold"
                          />
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
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Layers className="h-4 w-4 text-violet-500" /> Mix por Línea de Producto
                      </CardTitle>
                      <CardDescription>Aporte y cumplimiento de cada línea al total de facturación</CardDescription>
                    </div>
                    <InfoGrafica
                      titulo="Mix por Línea de Producto"
                      descripcion="Distribución y participación porcentual de los ingresos generados según las categorías o líneas de vestuario comercializadas (Ej. TRJ Denim, TRJ Plus Size, TRJ Casual, Complementos)."
                      metrica="Venta neta ($), unidades vendidas y porcentaje (%) de participación sobre la facturación total."
                      interpretacion="Permite detectar qué categorías lideran las ventas y aportan la mayor proporción a la facturación global, facilitando la toma de decisiones de inventario."
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={d1?.mixLineas || []} layout="vertical" margin={{ left: 10, right: 50, top: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} horizontal={false} />
                        <XAxis type="number" tickFormatter={(v) => formatoCOP(v)} tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="linea" width={110} tick={{ fontSize: 11 }} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload as { linea: string; venta: number; unidades: number; porcentaje: number };
                              return (
                                <div className="bg-popover/95 backdrop-blur-md border border-border p-3 rounded-xl shadow-lg text-xs space-y-1.5 min-w-[210px]">
                                  <p className="font-bold text-foreground text-sm flex items-center gap-1.5">
                                    <Layers className="h-3.5 w-3.5 text-violet-500" />
                                    {data.linea}
                                  </p>
                                  <div className="flex items-center justify-between gap-4 text-muted-foreground pt-1">
                                    <span>Facturación:</span>
                                    <span className="font-bold text-foreground">{formatoCOPFull(data.venta)}</span>
                                  </div>
                                  {data.unidades !== undefined && (
                                    <div className="flex items-center justify-between gap-4 text-muted-foreground">
                                      <span>Prendas / Unidades:</span>
                                      <span className="font-medium text-foreground">{data.unidades.toLocaleString("es-CO")} unds</span>
                                    </div>
                                  )}
                                  <div className="flex items-center justify-between gap-4 border-t border-border/60 pt-1.5 mt-1 bg-violet-500/10 -mx-3 -mb-3 p-2.5 rounded-b-lg">
                                    <span className="font-semibold text-violet-700 dark:text-violet-300 flex items-center gap-1">
                                      <Percent className="h-3 w-3" /> Participación Total:
                                    </span>
                                    <span className="font-extrabold text-violet-700 dark:text-violet-300 text-sm">
                                      {data.porcentaje}%
                                    </span>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="venta" fill="#8b5cf6" radius={[0, 4, 4, 0]}>
                          {(d1?.mixLineas || []).map((_, i) => (
                            <Cell key={`mix-linea-${i}`} fill={COLORES[i % COLORES.length]} />
                          ))}
                          <LabelList
                            dataKey="porcentaje"
                            position="right"
                            formatter={(v: number) => `${v}%`}
                            className="fill-foreground text-[11px] font-bold"
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Mix de Canales */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Globe className="h-4 w-4 text-blue-500" /> Mix por Canal Comercial
                      </CardTitle>
                      <CardDescription>Participación de ventas por canal de comercialización</CardDescription>
                    </div>
                    <InfoGrafica
                      titulo="Mix por Canal Comercial"
                      descripcion="Distribución de los ingresos de la empresa a través de los diferentes canales de venta (Mayoristas, Tienda Directa, Digital, Distribuidores, etc.)."
                      metrica="Facturación total ($) y porcentaje (%) de cuota por canal comercial sobre la venta total."
                      interpretacion="Permite evaluar la dependencia del negocio respecto a canales tradicionales frente al crecimiento de canales directos o digitales."
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={d1?.mixCanales || []} layout="vertical" margin={{ left: 10, right: 50, top: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} horizontal={false} />
                        <XAxis type="number" tickFormatter={(v) => formatoCOP(v)} tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="canal" width={110} tick={{ fontSize: 11 }} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload as { canal: string; venta: number; porcentaje: number };
                              return (
                                <div className="bg-popover/95 backdrop-blur-md border border-border p-3 rounded-xl shadow-lg text-xs space-y-1.5 min-w-[210px]">
                                  <p className="font-bold text-foreground text-sm flex items-center gap-1.5">
                                    <Globe className="h-3.5 w-3.5 text-blue-500" />
                                    {data.canal}
                                  </p>
                                  <div className="flex items-center justify-between gap-4 text-muted-foreground pt-1">
                                    <span>Facturación:</span>
                                    <span className="font-bold text-foreground">{formatoCOPFull(data.venta)}</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-4 border-t border-border/60 pt-1.5 mt-1 bg-blue-500/10 -mx-3 -mb-3 p-2.5 rounded-b-lg">
                                    <span className="font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1">
                                      <Percent className="h-3 w-3" /> Participación Total:
                                    </span>
                                    <span className="font-extrabold text-blue-700 dark:text-blue-300 text-sm">
                                      {data.porcentaje}%
                                    </span>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="venta" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                          {(d1?.mixCanales || []).map((_, i) => (
                            <Cell key={`mix-canal-${i}`} fill={COLORES[(i + 3) % COLORES.length]} />
                          ))}
                          <LabelList
                            dataKey="porcentaje"
                            position="right"
                            formatter={(v: number) => `${v}%`}
                            className="fill-foreground text-[11px] font-bold"
                          />
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
                badgeYoY={compararAnioAnterior ? <BadgeYoY actual={d2?.kpis.ventaAcumuladaMes} anterior={d2?.kpis.ventaAcumuladaAnterior} porcentaje={d2?.kpis.crecimientoYoYPct} /> : undefined}
              />
              <CardKpi
                titulo="Meta Diaria (PPTO Diario)"
                valor={formatoCOPFull(d2?.kpis.metaDiariaFija ?? 0)}
                subtexto={`Calculado sobre ${d2?.kpis.diasHabilesTotales ?? 0} días hábiles`}
                icono={<Calendar className="h-5 w-5 text-blue-500" />}
                cargando={cD2}
                badgeYoY={compararAnioAnterior ? <BadgeYoY actual={d2?.kpis.metaDiariaFija} anterior={d2?.kpis.metaDiariaFijaAnterior} label="meta ant." /> : undefined}
              />
              <CardKpi
                titulo="Run Rate / Cuota Diaria Requerida"
                valor={formatoCOPFull(d2?.kpis.runRateRequerido ?? 0)}
                subtexto={`Para los ${d2?.kpis.diasHabilesRestantes ?? 0} días hábiles restantes`}
                icono={<Compass className="h-5 w-5 text-amber-500" />}
                cargando={cD2}
                badgeYoY={compararAnioAnterior ? <BadgeYoY actual={d2?.kpis.runRateRequerido} anterior={d2?.kpis.runRateRequeridoAnterior} label="req. ant." /> : undefined}
              />
              <CardKpi
                titulo="Brecha Acumulada ($ Gap)"
                valor={formatoCOPFull(d2?.kpis.brechaAcumulada ?? 0)}
                subtexto={d2?.kpis.brechaAcumulada && d2.kpis.brechaAcumulada >= 0 ? "Superávit frente a meta a la fecha" : "Déficit acumulado a la fecha"}
                icono={<ArrowUpRight className={`h-5 w-5 ${d2?.kpis.brechaAcumulada && d2.kpis.brechaAcumulada >= 0 ? "text-emerald-500" : "text-rose-500"}`} />}
                cargando={cD2}
                badgeYoY={compararAnioAnterior ? <BadgeYoY actual={d2?.kpis.brechaAcumulada} anterior={d2?.kpis.brechaAcumuladaAnterior} label="gap ant." /> : undefined}
              />
            </div>

            {/* Gráfico de Avance Acumulado: PPTO Acumulado vs Real Acumulado */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">Curva de Avance Acumulado Diario vs. Meta ({d2?.kpis.mesSeleccionadoNombre})</CardTitle>
                    <CardDescription>Evolución acumulativa día por día en el mes {compararAnioAnterior && "• Superposición de Venta Año Anterior activada"}</CardDescription>
                  </div>
                  <InfoGrafica
                    titulo="Curva de Avance Acumulado Diario vs. Meta"
                    descripcion="Compara la trayectoria de facturación acumulada día a día frente a la línea de meta presupuestal esperada para el mes."
                    metrica="Línea Azul: Venta Real Acumulada ($) • Línea Ámbar Punteada: Venta Año Anterior ($) • Línea Gris Punteada: Presupuesto Acumulado ($) • % Avance Acumulado a la fecha."
                    interpretacion="Si la línea azul se mantiene por encima de la gris punteada, la empresa marcha con superávit sobre el ritmo presupuestal esperado."
                  />
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={d2?.dias || []} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={(v) => formatoCOP(v)} tick={{ fontSize: 12 }} width={80} />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload as PuntoDiario;
                            const vAcum = data.ventaAcumulada || 0;
                            const pptoAcum = data.pptoAcumulado || 0;
                            const vAnterior = data.ventaAcumuladaAnterior;
                            const cumpl = pptoAcum > 0 ? ((vAcum / pptoAcum) * 100).toFixed(1) : "0.0";
                            const supero = vAcum >= pptoAcum;

                            return (
                              <div className="rounded-lg border bg-popover p-3 shadow-md text-xs space-y-1.5 min-w-[210px] z-50">
                                <div className="flex items-center justify-between border-b pb-1">
                                  <span className="font-bold text-foreground text-sm font-mono">{label || data.fecha}</span>
                                  <span className={`px-1.5 py-0.5 rounded text-[11px] font-bold border ${
                                    Number(cumpl) >= 100
                                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                                      : Number(cumpl) >= 80
                                      ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                                      : "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30"
                                  }`}>
                                    {cumpl}% Avance
                                  </span>
                                </div>
                                <div className="space-y-1 pt-0.5">
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="text-blue-600 dark:text-blue-400 font-medium">Venta Acumulada:</span>
                                    <span className="font-bold text-foreground font-mono">{formatoCOPFull(vAcum)}</span>
                                  </div>
                                  {compararAnioAnterior && vAnterior !== undefined && (
                                    <div className="flex items-center justify-between gap-3">
                                      <span className="text-amber-600 dark:text-amber-400 font-medium">Venta Año Anterior:</span>
                                      <span className="font-bold text-foreground font-mono">{formatoCOPFull(vAnterior)}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="text-slate-500 font-medium">Meta Acumulada:</span>
                                    <span className="font-medium text-muted-foreground font-mono">{formatoCOPFull(pptoAcum)}</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-3 pt-1 border-t border-border/40">
                                    <span className="text-muted-foreground text-[11px]">Brecha Acumulada:</span>
                                    <span className={`font-mono font-semibold text-[11px] ${supero ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                                      {supero ? "+" : ""}{formatoCOPFull(vAcum - pptoAcum)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend
                        formatter={(v) =>
                          v === "ventaAcumulada"
                            ? "Facturación Real Acumulada"
                            : v === "ventaAcumuladaAnterior"
                            ? "Venta Acumulada Año Anterior"
                            : "Meta Presupuesto Acumulada"
                        }
                      />
                      <Line type="monotone" dataKey="ventaAcumulada" stroke="#2563eb" strokeWidth={3} dot={{ r: 3 }} />
                      {compararAnioAnterior && (
                        <Line type="monotone" dataKey="ventaAcumuladaAnterior" stroke="#f59e0b" strokeWidth={2.5} strokeDasharray="4 4" dot={{ r: 2.5, fill: "#f59e0b" }} />
                      )}
                      <Line type="monotone" dataKey="pptoAcumulado" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Gráfico de Facturación Diaria vs Meta Diaria Fija */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">Facturación Diaria Real vs. Meta por Día</CardTitle>
                    <CardDescription>Desempeño diario frente a la cuota base diaria</CardDescription>
                  </div>
                  <InfoGrafica
                    titulo="Facturación Diaria Real vs. Meta por Día"
                    descripcion="Muestra la facturación individual facturada en cada jornada frente al requerimiento diario promedio para alcanzar el presupuesto mensual."
                    metrica="Barras Verdes: Venta diaria ($) • Línea Naranja: Meta fija diaria ($) • % Cumplimiento Diario: Tasa porcentual de logro diario alcanzado (Venta Real / Meta Diaria × 100)."
                    interpretacion="Permite identificar de un vistazo las jornadas con superávit (cumplimiento ≥ 100%) y los días críticos con déficit frente al ritmo de ventas exigido."
                  />
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={d2?.dias || []} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={(v) => formatoCOP(v)} tick={{ fontSize: 12 }} width={80} />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload as PuntoDiario;
                            const vReal = data.ventaReal || 0;
                            const meta = data.metaDiaria || 0;
                            const cumpl = meta > 0 ? ((vReal / meta) * 100).toFixed(1) : "0.0";
                            const superoMeta = vReal >= meta;

                            return (
                              <div className="rounded-lg border bg-popover p-3 shadow-md text-xs space-y-1.5 min-w-[210px] z-50">
                                <div className="flex items-center justify-between border-b pb-1">
                                  <span className="font-bold text-foreground text-sm font-mono">{label || data.fecha}</span>
                                  <span className={`px-1.5 py-0.5 rounded text-[11px] font-bold border ${
                                    Number(cumpl) >= 100
                                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                                      : Number(cumpl) >= 80
                                      ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                                      : "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30"
                                  }`}>
                                    {cumpl}% Cumpl.
                                  </span>
                                </div>
                                <div className="space-y-1 pt-0.5">
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                                      Venta Diaria Real:
                                    </span>
                                    <span className="font-bold text-foreground font-mono">{formatoCOPFull(vReal)}</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                                      Meta Diaria:
                                    </span>
                                    <span className="font-medium text-muted-foreground font-mono">{formatoCOPFull(meta)}</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-3 pt-1 border-t border-border/40">
                                    <span className="text-muted-foreground text-[11px]">Diferencia (Gap):</span>
                                    <span className={`font-mono font-semibold text-[11px] ${superoMeta ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                                      {superoMeta ? "+" : ""}{formatoCOPFull(vReal - meta)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend formatter={(v) => (v === "ventaReal" ? "Venta Diaria Real" : "Meta Diaria")} />
                      <Bar dataKey="ventaReal" name="ventaReal" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Line type="monotone" dataKey="metaDiaria" name="metaDiaria" stroke="#f59e0b" strokeWidth={2.5} strokeDasharray="4 4" dot={{ r: 2 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========================================================================= */}
          {/* DASHBOARD 3: E-COMMERCE, SOCIAL SELLING Y MARKETING DIGITAL */}
          {/* ========================================================================= */}
          {puedeVerDigital && (
            <TabsContent value="d3" className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/60 pb-3">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground font-display">
                  Dashboard 3: E-Commerce, Social Selling y Marketing Digital
                </h2>
                <p className="text-xs text-muted-foreground">
                  Análisis inteligente de canales directos: Tienda Virtual (Shopify / Web) vs Redes Sociales (WhatsApp / Social Selling), ROAS publicitario y rendimiento de catálogo online.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30 font-semibold text-xs">
                  Participación Digital: {d3?.kpis.pctVentaEmpresa ?? 0}%
                </Badge>
                <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 border-indigo-500/30 font-semibold text-xs">
                  ROAS Promedio: {d3?.kpis.roas ?? 0}x
                </Badge>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-semibold text-xs">
                  AOV: {formatoCOPFull(d3?.kpis.aovTicketPromedio ?? 0)}
                </Badge>
              </div>
            </div>

            {/* Barra de Segmentación Rápida de Canales Digitales (Modo Enfoque) */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-2 bg-indigo-500/5 dark:bg-indigo-950/20 rounded-xl border border-indigo-500/20 shadow-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-semibold text-foreground ml-1 mr-2 flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-indigo-500" />
                  Enfoque de Canal:
                </span>
                <Button
                  variant={filtroCanalDigital === "todos" ? "default" : "outline"}
                  size="sm"
                  className={`h-7 text-xs font-medium ${
                    filtroCanalDigital === "todos"
                      ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                      : "border-border/80 text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setFiltroCanalDigital("todos")}
                >
                  🌐 Todo el Ecosistema Digital (Consolidado)
                </Button>
                <Button
                  variant={filtroCanalDigital === "tienda_virtual" ? "default" : "outline"}
                  size="sm"
                  className={`h-7 text-xs font-medium ${
                    filtroCanalDigital === "tienda_virtual"
                      ? "bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                      : "border-border/80 text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setFiltroCanalDigital("tienda_virtual")}
                >
                  🛒 Tienda Virtual (Shopify / Web)
                </Button>
                <Button
                  variant={filtroCanalDigital === "redes_sociales" ? "default" : "outline"}
                  size="sm"
                  className={`h-7 text-xs font-medium ${
                    filtroCanalDigital === "redes_sociales"
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                      : "border-border/80 text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setFiltroCanalDigital("redes_sociales")}
                >
                  📱 Redes Sociales (WhatsApp / Social Selling)
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[11px] font-mono bg-background border border-border/60">
                  {filtroCanalDigital === "todos"
                    ? "Vista: Consolidada (TV + RS)"
                    : filtroCanalDigital === "tienda_virtual"
                    ? "Vista: 100% Tienda Virtual"
                    : "Vista: 100% Redes Sociales"}
                </Badge>
              </div>
            </div>

            {/* Tarjetas KPI Digital */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <CardKpi
                titulo="Venta Canal Digital Total"
                valor={formatoCOPFull(d3?.kpis.ventaDigitalTotal ?? 0)}
                subtexto={`${(d3?.kpis.unidadesDigitales ?? 0).toLocaleString("es-CO")} prendas vendidas`}
                icono={<ShoppingBag className="h-5 w-5 text-indigo-500" />}
                cargando={cD3}
                badgeYoY={compararAnioAnterior ? <BadgeYoY actual={d3?.kpis.ventaDigitalTotal} anterior={d3?.kpis.ventaAnterior} porcentaje={d3?.kpis.crecimientoYoYPct} /> : undefined}
              />
              <CardKpi
                titulo="Tienda Virtual (Shopify)"
                valor={formatoCOPFull(d3?.kpis.ventaTiendaVirtual ?? 0)}
                subtexto={`${(d3?.kpis.unidadesTiendaVirtual ?? 0).toLocaleString("es-CO")} unds | AOV ${formatoCOP(d3?.kpis.aovTiendaVirtual ?? 0)}`}
                icono={<Globe className="h-5 w-5 text-blue-500" />}
                cargando={cD3}
                badgeYoY={compararAnioAnterior ? <BadgeYoY actual={d3?.kpis.ventaTiendaVirtual} anterior={d3?.kpis.ventaTiendaVirtualAnterior} /> : undefined}
              />
              <CardKpi
                titulo="Redes Sociales (WhatsApp)"
                valor={formatoCOPFull(d3?.kpis.ventaRedesSociales ?? 0)}
                subtexto={`${(d3?.kpis.unidadesRedesSociales ?? 0).toLocaleString("es-CO")} unds | AOV ${formatoCOP(d3?.kpis.aovRedesSociales ?? 0)}`}
                icono={<Share2 className="h-5 w-5 text-emerald-500" />}
                cargando={cD3}
                badgeYoY={compararAnioAnterior ? <BadgeYoY actual={d3?.kpis.ventaRedesSociales} anterior={d3?.kpis.ventaRedesSocialesAnterior} /> : undefined}
              />
              <CardKpi
                titulo="Ticket Promedio (AOV)"
                valor={formatoCOPFull(d3?.kpis.aovTicketPromedio ?? 0)}
                subtexto="Promedio por prenda facturada"
                icono={<Receipt className="h-5 w-5 text-purple-500" />}
                cargando={cD3}
                badgeYoY={compararAnioAnterior ? <BadgeYoY actual={d3?.kpis.aovTicketPromedio} anterior={d3?.kpis.aovTicketPromedioAnterior} label="aov ant." /> : undefined}
              />
              <CardKpi
                titulo="Inversión en Pauta & ROAS"
                valor={formatoCOPFull(d3?.kpis.inversionTotalPauta ?? 0)}
                subtexto={`Retorno: ${d3?.kpis.roas ?? 0}x sobre pauta`}
                icono={<DollarSign className="h-5 w-5 text-amber-500" />}
                cargando={cD3}
                badgeYoY={compararAnioAnterior ? <BadgeYoY actual={d3?.kpis.inversionTotalPauta} anterior={d3?.kpis.inversionTotalPautaAnterior} label="pauta ant." /> : undefined}
              />
              <CardKpi
                titulo="Margen Operativo Digital"
                valor={formatoCOPFull(d3?.kpis.margenOperativoDigital ?? 0)}
                subtexto="Deduciendo Pauta + SaaS ($1.85M)"
                icono={<TrendingUp className="h-5 w-5 text-cyan-500" />}
                cargando={cD3}
                badgeYoY={compararAnioAnterior ? <BadgeYoY actual={d3?.kpis.margenOperativoDigital} anterior={d3?.kpis.margenOperativoDigitalAnterior} label="margen ant." /> : undefined}
              />
            </div>

            {/* Fila 1: Participación por canal digital y Evolución mensual comparativa */}
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-1 flex flex-col justify-between">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold">Participación por Canal</CardTitle>
                      <CardDescription>Tienda Virtual vs Redes Sociales</CardDescription>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[11px] font-normal">
                        {(d3?.kpis.unidadesDigitales ?? 0).toLocaleString("es-CO")} unds
                      </Badge>
                      <InfoGrafica
                        titulo="Participación por Canal Digital"
                        descripcion="Compara la cuota de ventas generada por la Tienda Virtual (Shopify / Web directa) vs las ventas asistidas por Redes Sociales (WhatsApp y Social Selling)."
                        metrica="Facturación ($) y porcentaje (%) de participación sobre el total del ecosistema digital."
                        interpretacion="Permite evaluar la tracción orgánica de la web automatizada versus el esfuerzo comercial asistido por asesores en WhatsApp."
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[240px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={d3?.canalesDigitales || []}
                          dataKey="venta"
                          nameKey="canal"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          innerRadius={45}
                          paddingAngle={3}
                        >
                          {(d3?.canalesDigitales || []).map((entry, i) => (
                            <Cell
                              key={`cell-d3-${i}`}
                              fill={
                                entry.tipo === "tienda_virtual"
                                  ? "#2563eb"
                                  : entry.tipo === "redes_sociales"
                                  ? "#10b981"
                                  : "#f59e0b"
                              }
                            />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => formatoCOPFull(v)} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t text-xs">
                    <div className="p-2 rounded bg-blue-500/10 border border-blue-500/20">
                      <p className="font-semibold text-blue-600">Tienda Virtual</p>
                      <p className="text-muted-foreground">{formatoCOP(d3?.kpis.ventaTiendaVirtual ?? 0)}</p>
                      <p className="font-mono text-[11px] text-blue-700">
                        {d3?.kpis.ventaDigitalTotal ? ((d3.kpis.ventaTiendaVirtual / d3.kpis.ventaDigitalTotal) * 100).toFixed(1) : 0}%
                      </p>
                    </div>
                    <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20">
                      <p className="font-semibold text-emerald-600">Redes Sociales</p>
                      <p className="text-muted-foreground">{formatoCOP(d3?.kpis.ventaRedesSociales ?? 0)}</p>
                      <p className="font-mono text-[11px] text-emerald-700">
                        {d3?.kpis.ventaDigitalTotal ? ((d3.kpis.ventaRedesSociales / d3.kpis.ventaDigitalTotal) * 100).toFixed(1) : 0}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader className="pb-2">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <div>
                      <CardTitle className="text-base font-semibold">Evolución Mensual de Ventas Digitales</CardTitle>
                      <CardDescription>Facturación por canal digital e inversión en pauta mes a mes {compararAnioAnterior && "• Superposición de Venta Año Anterior activada"}</CardDescription>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-xs bg-muted/50 w-fit">
                        12 Meses
                      </Badge>
                      <InfoGrafica
                        titulo="Evolución Mensual de Ventas Digitales"
                        descripcion="Comportamiento histórico de las ventas online mes a mes, contrastando la venta de Tienda Virtual, Redes Sociales, la venta del año anterior y el gasto publicitario."
                        metrica="Barras Azules: Tienda Virtual • Barras Verdes: Redes Sociales • Línea Ámbar Punteada: Venta Digital Año Anterior • Barras Naranjas: Inversión en Pauta ($)."
                        interpretacion="Permite analizar la correlación entre la inyección de pauta publicitaria, el crecimiento respecto al año anterior y el repunte de ingresos digitales."
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[290px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={d3?.evolucionMensual || []} margin={{ left: 10, right: 10, top: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                        <YAxis tickFormatter={(v) => formatoCOP(v)} tick={{ fontSize: 11 }} width={75} />
                        <Tooltip
                          formatter={(v: number, name: string) => [
                            formatoCOPFull(v),
                            name === "ventaTiendaVirtual"
                              ? "Tienda Virtual (Shopify)"
                              : name === "ventaRedesSociales"
                              ? "Redes Sociales (WhatsApp)"
                              : name === "ventaAnterior"
                              ? "Venta Digital Año Anterior"
                              : name === "gastoPauta"
                              ? "Inversión en Pauta"
                              : name,
                          ]}
                        />
                        <Legend
                          formatter={(v) =>
                            v === "ventaTiendaVirtual"
                              ? "Tienda Virtual (Shopify)"
                              : v === "ventaRedesSociales"
                              ? "Redes Sociales (WhatsApp)"
                              : v === "ventaAnterior"
                              ? "Venta Digital Año Anterior"
                              : v === "gastoPauta"
                              ? "Inversión Pauta"
                              : v
                          }
                        />
                        <Bar dataKey="ventaTiendaVirtual" fill="#2563eb" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="ventaRedesSociales" fill="#10b981" radius={[3, 3, 0, 0]} />
                        {compararAnioAnterior && (
                          <Line type="monotone" dataKey="ventaAnterior" stroke="#f59e0b" strokeWidth={2.5} strokeDasharray="4 4" dot={{ r: 3, fill: "#f59e0b" }} />
                        )}
                        <Bar dataKey="gastoPauta" fill="#f59e0b" radius={[3, 3, 0, 0]} opacity={0.7} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Fila 2: Top Referencias en Digital y Mix por Línea de Producto */}
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader className="pb-2">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <div>
                      <CardTitle className="text-base font-semibold">Top 10 Referencias / SKUs Más Vendidos en Digital</CardTitle>
                      <CardDescription>Productos estrella en Tienda Virtual y Social Selling</CardDescription>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-xs bg-indigo-500/10 text-indigo-600 border-indigo-500/20 w-fit">
                        Top Sellers Digital
                      </Badge>
                      <InfoGrafica
                        titulo="Top 10 Referencias en Canales Digitales"
                        descripcion="Ranking de los productos y referencias de mayor facturación en el ecosistema digital."
                        metrica="Ventas netas ($), unidades despachadas y línea de vestuario del SKU."
                        interpretacion="Identifica las prendas ganadoras ('Hero Products') para priorizar en pauta publicitaria y asegurar stock continuo."
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={d3?.topReferenciasDigital || []}
                        layout="vertical"
                        margin={{ left: 20, right: 20, top: 5, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} horizontal={false} />
                        <XAxis type="number" tickFormatter={(v) => formatoCOP(v)} tick={{ fontSize: 10 }} />
                        <YAxis
                          type="category"
                          dataKey="referencia"
                          tick={{ fontSize: 10 }}
                          width={90}
                        />
                        <Tooltip
                          formatter={(v: number, name: string, item: any) => [
                            formatoCOPFull(v),
                            `Venta (${item?.payload?.unidades ?? 0} unds - ${item?.payload?.linea ?? "General"})`,
                          ]}
                          labelFormatter={(label, payload) => {
                            const p = payload?.[0]?.payload;
                            return p ? `${label} - ${p.producto}` : label;
                          }}
                        />
                        <Bar dataKey="venta" fill="#6366f1" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-1">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold">Mix por Línea en Digital</CardTitle>
                      <CardDescription>Participación por categorías de producto</CardDescription>
                    </div>
                    <InfoGrafica
                      titulo="Mix por Línea de Producto en Digital"
                      descripcion="Distribución porcentual de las ventas digitales clasificadas por categoría o línea de producto."
                      metrica="Venta acumulada ($), unidades y porcentaje de participación digital."
                      interpretacion="Permite conocer cuáles líneas de moda tienen mayor acogida en el consumidor digital."
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={d3?.lineasDigital || []}
                        layout="vertical"
                        margin={{ left: 10, right: 45, top: 5, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} horizontal={false} />
                        <XAxis type="number" tickFormatter={(v) => formatoCOP(v)} tick={{ fontSize: 10 }} />
                        <YAxis type="category" dataKey="linea" tick={{ fontSize: 10 }} width={80} />
                        <Tooltip
                          formatter={(v: number, name: string, item: any) => [
                            `${formatoCOPFull(v)} (${item?.payload?.porcentaje ?? 0}%)`,
                            `Línea (${item?.payload?.unidades ?? 0} unds)`,
                          ]}
                        />
                        <Bar dataKey="venta" fill="#ec4899" radius={[0, 4, 4, 0]}>
                          <LabelList
                            dataKey="porcentaje"
                            position="right"
                            formatter={(v: number) => `${v}%`}
                            className="fill-foreground text-[10px] font-bold"
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Fila 3: Top Ciudades y Tabla Comparativa de Canales */}
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-1">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold">Top Ciudades Compradoras</CardTitle>
                      <CardDescription>Destinos principales de pedidos online</CardDescription>
                    </div>
                    <InfoGrafica
                      titulo="Top Ciudades Compradoras en Digital"
                      descripcion="Ciudades y municipios con mayor concentración de órdenes y facturación digital."
                      metrica="Facturación ($), unidades y porcentaje de penetración por ciudad."
                      interpretacion="Esencial para segmentar campañas geográficas de Meta Ads / Google Ads y negociar tarifas de transporte logístico."
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={d3?.ciudadesDigital || []}
                        layout="vertical"
                        margin={{ left: 10, right: 10, top: 5, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} horizontal={false} />
                        <XAxis type="number" tickFormatter={(v) => formatoCOP(v)} tick={{ fontSize: 10 }} />
                        <YAxis type="category" dataKey="ciudad" tick={{ fontSize: 10 }} width={80} />
                        <Tooltip
                          formatter={(v: number, name: string, item: any) => [
                            `${formatoCOPFull(v)} (${item?.payload?.porcentaje ?? 0}%)`,
                            `Venta Ciudad (${item?.payload?.unidades ?? 0} unds)`,
                          ]}
                        />
                        <Bar dataKey="venta" fill="#06b6d4" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Matriz Comparativa de Canales Digitales</CardTitle>
                  <CardDescription>Rendimiento detallado de Tienda Virtual vs Redes Sociales</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wider border-b">
                        <tr>
                          <th className="py-2.5 px-3">Canal Digital</th>
                          <th className="py-2.5 px-3 text-right">Facturación</th>
                          <th className="py-2.5 px-3 text-right">Part. %</th>
                          <th className="py-2.5 px-3 text-right">Unidades</th>
                          <th className="py-2.5 px-3 text-right">Ticket AOV</th>
                          <th className="py-2.5 px-3 text-right">Pauta Est.</th>
                          <th className="py-2.5 px-3 text-right">ROAS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {(d3?.canalesDigitales || []).map((c, i) => (
                          <tr key={`tbl-canal-dig-${i}`} className="hover:bg-muted/30">
                            <td className="py-2.5 px-3 font-medium flex items-center gap-1.5">
                              {c.tipo === "tienda_virtual" ? (
                                <Globe className="h-4 w-4 text-blue-500 shrink-0" />
                              ) : c.tipo === "redes_sociales" ? (
                                <Share2 className="h-4 w-4 text-emerald-500 shrink-0" />
                              ) : (
                                <Store className="h-4 w-4 text-amber-500 shrink-0" />
                              )}
                              <span>{c.canal}</span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-semibold">
                              {formatoCOPFull(c.venta)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono">
                              <Badge variant="outline" className="text-[10px] py-0 font-normal">
                                {c.porcentaje}%
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono">
                              {c.unidades.toLocaleString("es-CO")}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">
                              {formatoCOP(c.ticketPromedio)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-amber-600">
                              {formatoCOP(c.gastoPauta)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-semibold text-indigo-600">
                              {c.roas}x
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-muted/30 border-t font-semibold">
                        <tr>
                          <td className="py-2.5 px-3">Total Ecosistema Digital</td>
                          <td className="py-2.5 px-3 text-right text-foreground">
                            {formatoCOPFull(d3?.kpis.ventaDigitalTotal ?? 0)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <Badge variant="default" className="text-[10px] py-0">
                              100%
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {(d3?.kpis.unidadesDigitales ?? 0).toLocaleString("es-CO")}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {formatoCOP(d3?.kpis.aovTicketPromedio ?? 0)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-amber-600">
                            {formatoCOP(d3?.kpis.inversionTotalPauta ?? 0)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-indigo-600">
                            {d3?.kpis.roas ?? 0}x
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          )}

          {/* ========================================================================= */}
          {/* DASHBOARD 4: FUERZA DE VENTAS Y DESEMPEÑO COMERCIAL */}
          {/* ========================================================================= */}
          <TabsContent value="d4" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/60 pb-3">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground font-display">
                  Dashboard 4: Fuerza de Ventas y Desempeño Comercial
                </h2>
                <p className="text-xs text-muted-foreground">
                  Facturación real, volumen de prendas, facturas procesadas, ticket promedio y precio por unidad de cada asesor comercial.
                </p>
              </div>
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 font-semibold text-xs">
                {d4?.kpis.totalAsesores ?? 0} asesores comerciales activos
              </Badge>
            </div>

            {/* Tarjetas KPI Reales Fuerza de Ventas */}
            <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
              <CardKpi
                titulo="Facturación Fuerza Comercial"
                valor={formatoCOPFull(d4?.kpis.totalVentaFuerza ?? 0)}
                subtexto={`Nacional: ${formatoCOP(d4?.kpis.ventaNacional ?? 0)} • Export: ${formatoCOP(d4?.kpis.ventaExportaciones ?? 0)}`}
                icono={<DollarSign className="h-5 w-5 text-emerald-500" />}
                cargando={cD4}
                badgeYoY={compararAnioAnterior ? <BadgeYoY actual={d4?.kpis.totalVentaFuerza} anterior={d4?.kpis.ventaAnteriorTotal} porcentaje={d4?.kpis.crecimientoYoYPct} /> : undefined}
              />
              <CardKpi
                titulo="Prendas Comercializadas"
                valor={`${(d4?.kpis.totalUnidades ?? 0).toLocaleString("es-CO")} unds`}
                subtexto="Volumen total entregado"
                icono={<Package className="h-5 w-5 text-blue-500" />}
                cargando={cD4}
                badgeYoY={compararAnioAnterior ? <BadgeYoYUnidades actual={d4?.kpis.totalUnidades} anterior={d4?.kpis.unidadesAnteriorTotal} /> : undefined}
              />
              <CardKpi
                titulo="Facturas / Transacciones"
                valor={`${(d4?.kpis.totalTransacciones ?? 0).toLocaleString("es-CO")}`}
                subtexto="Documentos emitidos"
                icono={<Receipt className="h-5 w-5 text-amber-500" />}
                cargando={cD4}
                badgeYoY={compararAnioAnterior ? <BadgeYoY actual={d4?.kpis.totalTransacciones} anterior={d4?.kpis.totalTransaccionesAnterior} tipo="entero" label="trans. ant." /> : undefined}
              />
              <CardKpi
                titulo="Ticket Promedio / Pedido"
                valor={formatoCOP(d4?.kpis.ticketPromedio ?? 0)}
                subtexto="Facturación por documento"
                icono={<ShoppingBag className="h-5 w-5 text-purple-500" />}
                cargando={cD4}
                badgeYoY={compararAnioAnterior ? <BadgeYoY actual={d4?.kpis.ticketPromedio} anterior={d4?.kpis.ticketPromedioAnterior} label="ticket ant." /> : undefined}
              />
              <CardKpi
                titulo="Precio Promedio / Prenda"
                valor={formatoCOP(d4?.kpis.precioPromedioPrenda ?? 0)}
                subtexto="ASP unitario ponderado"
                icono={<Tag className="h-5 w-5 text-cyan-500" />}
                cargando={cD4}
                badgeYoY={compararAnioAnterior ? <BadgeYoY actual={d4?.kpis.precioPromedioPrenda} anterior={d4?.kpis.precioPromedioPrendaAnterior} /> : undefined}
              />
            </div>

            {/* Gráficos de Rendimiento Comercial */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Top 10 Asesores por Facturación */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold flex items-center justify-between">
                        <span>Top 10 Asesores por Facturación ($)</span>
                      </CardTitle>
                      <CardDescription>Participación en valor monetario del equipo comercial</CardDescription>
                    </div>
                    <InfoGrafica
                      titulo="Top 10 Asesores por Facturación"
                      descripcion="Ranking de los 10 asesores comerciales con mayor recaudo y facturación dentro del periodo seleccionado. Puedes hacer clic sobre una barra para aislar y enfocar a dicho vendedor."
                      metrica="Ventas netas totales ($) facturadas por el asesor."
                      interpretacion="Permite reconocer a los mejores ejecutivos de cuenta y detectar brechas de rendimiento dentro del equipo comercial."
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  {(d4?.asesores || []).length === 0 ? (
                    <div className="h-[280px] grid place-items-center text-sm text-muted-foreground">
                      Sin datos de asesores para el periodo seleccionado
                    </div>
                  ) : (
                    <div className="h-[280px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={(d4?.asesores || []).slice(0, 10)}
                          layout="vertical"
                          margin={{ left: 30, right: 20 }}
                          onClick={(e) => {
                            if (e && e.activePayload && e.activePayload[0]) {
                              const aItem = e.activePayload[0].payload as AsesorComercial;
                              const matchVendedor = vendedoresDisponibles.find(
                                (v) => v.nombre.toLowerCase() === aItem.vendedor.toLowerCase()
                              );
                              if (matchVendedor) {
                                setVendedorId(String(matchVendedor.id) === String(vendedorId) ? "todos" : String(matchVendedor.id));
                              }
                            }
                          }}
                        >
                          <XAxis type="number" tickFormatter={(v) => formatoCOP(v)} tick={{ fontSize: 11 }} />
                          <YAxis dataKey="vendedor" type="category" width={110} tick={{ fontSize: 11 }} />
                          <Tooltip
                            formatter={(v: number, name: string) => [
                              formatoCOPFull(v),
                              "Facturación Total",
                            ]}
                          />
                          <Bar dataKey="ventaTotal" fill="#4f46e5" radius={[0, 6, 6, 0]} className="cursor-pointer" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Evolución Mensual del Equipo */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold">Evolución Mensual de Ventas y Unidades</CardTitle>
                      <CardDescription>Comportamiento cronológico de la fuerza comercial {compararAnioAnterior && "• Superposición de Venta Año Anterior activada"}</CardDescription>
                    </div>
                    <InfoGrafica
                      titulo="Evolución Mensual de la Fuerza Comercial"
                      descripcion="Histórico mes a mes de los ingresos en pesos colombianos, la venta del año anterior y el volumen de prendas comercializadas por la fuerza de ventas."
                      metrica="Barras Moradas: Facturación ($) • Línea Ámbar Punteada: Facturación Año Anterior ($) • Línea Verde: Cantidad total de prendas (Unidades)."
                      interpretacion="Permite evaluar la estacionalidad de la demanda en canales tradicionales mayoristas e institucionales y el crecimiento interanual."
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={d4?.evolucionMensualEquipo || []} margin={{ left: 10, right: 10 }}>
                        <XAxis dataKey="mesNombre" tick={{ fontSize: 11 }} />
                        <YAxis yAxisId="left" tickFormatter={(v) => formatoCOP(v)} tick={{ fontSize: 11 }} width={70} />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          allowDecimals={false}
                          tickFormatter={(v) => Math.round(v).toLocaleString("es-CO")}
                          tick={{ fontSize: 11 }}
                          width={55}
                        />
                        <Tooltip
                          formatter={(v: number, name: string) => [
                            name === "venta" || name === "ventaAnterior" ? formatoCOPFull(v) : `${Math.round(v).toLocaleString("es-CO")} unds`,
                            name === "venta" ? "Facturación ($)" : name === "ventaAnterior" ? "Facturación Año Anterior ($)" : "Prendas (Unds)",
                          ]}
                        />
                        <Legend
                          formatter={(v) =>
                            v === "venta"
                              ? "Facturación ($)"
                              : v === "ventaAnterior"
                              ? "Facturación Año Anterior ($)"
                              : "Prendas (Unds)"
                          }
                          wrapperStyle={{ fontSize: "11px" }}
                        />
                        <Bar yAxisId="left" dataKey="venta" name="venta" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                        {compararAnioAnterior && (
                          <Line yAxisId="left" type="monotone" dataKey="ventaAnterior" name="ventaAnterior" stroke="#f59e0b" strokeWidth={2.5} strokeDasharray="4 4" dot={{ r: 3, fill: "#f59e0b" }} />
                        )}
                        <Line yAxisId="right" type="monotone" dataKey="unidades" name="unidades" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabla Matriz Integral de Asesores */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <CardTitle className="text-base font-semibold">Ranking Integral de Asesores Comerciales</CardTitle>
                    <CardDescription>
                      Métricas reales consolidadas: facturación, cuota de participación, unidades, transacciones y promedios por documento y prenda.
                    </CardDescription>
                  </div>
                  {vendedorId !== "todos" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setVendedorId("todos")}
                      className="text-xs border-amber-500/40 text-amber-700 dark:text-amber-300"
                    >
                      <FilterX className="h-3.5 w-3.5 mr-1 text-amber-500" />
                      Quitar Filtro de Asesor
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="overflow-x-auto p-0">
                <table className="w-full text-xs text-left">
                  <thead className="border-y border-border/80 uppercase text-muted-foreground font-semibold bg-muted/40">
                    <tr>
                      <th className="py-3 px-3 text-center w-12">#</th>
                      <th className="py-3 px-3">Asesor Comercial</th>
                      <th className="py-3 px-3 text-right">Facturación ($)</th>
                      {compararAnioAnterior && <th className="py-3 px-3 text-right">Vs. Año Ant.</th>}
                      <th className="py-3 px-3 text-left w-36">% Cartera</th>
                      <th className="py-3 px-3 text-right">Prendas (Unds)</th>
                      <th className="py-3 px-3 text-right">Facturas</th>
                      <th className="py-3 px-3 text-right">Ticket Promedio</th>
                      <th className="py-3 px-3 text-right">Precio Prom. / Prenda</th>
                      <th className="py-3 px-3 text-right">Prendas / Factura</th>
                      <th className="py-3 px-3 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {(d4?.asesores || []).map((a, idx) => {
                      const matchVendedor = vendedoresDisponibles.find(
                        (v) => v.nombre.toLowerCase() === a.vendedor.toLowerCase()
                      );
                      const isSelected = matchVendedor && String(matchVendedor.id) === String(vendedorId);
                      return (
                        <tr
                          key={a.vendedor}
                          onClick={() => {
                            if (matchVendedor) {
                              setVendedorId(isSelected ? "todos" : String(matchVendedor.id));
                            }
                          }}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-amber-500/15 dark:bg-amber-950/30 font-semibold"
                              : "hover:bg-muted/40"
                          }`}
                          title={matchVendedor ? "Clic para activar Modo Enfoque de este asesor" : undefined}
                        >
                          <td className="py-3 px-3 text-center text-muted-foreground font-mono">
                            {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}`}
                          </td>
                          <td className="py-3 px-3 font-medium text-foreground">
                            <div className="flex items-center gap-2">
                              <span>{a.vendedor}</span>
                              {isSelected && (
                                <Badge variant="outline" className="text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40">
                                  Enfocado
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-foreground">{formatoCOPFull(a.ventaTotal)}</td>
                          {compararAnioAnterior && (
                            <td className="py-3 px-3 text-right font-mono">
                              {a.ventaAnterior ? (
                                <span
                                  className={cn(
                                    "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-semibold text-[11px]",
                                    (a.crecimientoYoYPct ?? 0) >= 0
                                      ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                                      : "text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20"
                                  )}
                                >
                                  {(a.crecimientoYoYPct ?? 0) >= 0 ? "+" : ""}
                                  {(a.crecimientoYoYPct ?? 0).toFixed(1)}%
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-[11px]">-</span>
                              )}
                            </td>
                          )}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full bg-indigo-600 rounded-full"
                                  style={{ width: `${Math.min(100, a.participacionCarteraPct)}%` }}
                                />
                              </div>
                              <span className="font-semibold text-[11px] text-muted-foreground">{a.participacionCarteraPct}%</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right text-muted-foreground font-medium">{a.unidades.toLocaleString("es-CO")}</td>
                          <td className="py-3 px-3 text-right text-muted-foreground font-medium">{a.transacciones.toLocaleString("es-CO")}</td>
                          <td className="py-3 px-3 text-right font-semibold text-foreground">{formatoCOP(a.ticketPromedio)}</td>
                          <td className="py-3 px-3 text-right text-muted-foreground">{formatoCOP(a.precioPromedioPrenda)}</td>
                          <td className="py-3 px-3 text-right font-medium text-muted-foreground">{Math.round(a.prendasPorTransaccion).toLocaleString("es-CO")} unds</td>
                          <td className="py-3 px-3 text-center">
                            <Button
                              variant={isSelected ? "default" : "outline"}
                              size="sm"
                              className={`h-6 text-[11px] px-2 rounded-lg ${
                                isSelected ? "bg-amber-600 hover:bg-amber-700 text-white" : "border-border/60 hover:bg-amber-500/10 hover:text-amber-700"
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (matchVendedor) {
                                  setVendedorId(isSelected ? "todos" : String(matchVendedor.id));
                                }
                              }}
                            >
                              {isSelected ? "Enfocado" : "Enfocar"}
                            </Button>
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
          {/* DASHBOARD 5: MARKETPLACES Y ANÁLISIS DE PRODUCTO (COMERGAIN / RETAIL) */}
          {/* ========================================================================= */}
          {puedeVerMarketplaces && (
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
                badgeYoY={compararAnioAnterior ? <BadgeYoY actual={d5?.kpis.ventaTotalMarketplaces} anterior={d5?.kpis.ventaAnterior} porcentaje={d5?.kpis.crecimientoYoYPct} /> : undefined}
              />
              <CardKpi
                titulo="Precio Promedio por SKU"
                valor={formatoCOPFull(d5?.kpis.precioPromedioSKU ?? 0)}
                subtexto="Valor promedio por unidad en marketplaces"
                icono={<Tag className="h-5 w-5 text-emerald-500" />}
                cargando={cD5}
                badgeYoY={compararAnioAnterior ? <BadgeYoY actual={d5?.kpis.precioPromedioSKU} anterior={d5?.kpis.precioPromedioSKUAnterior} label="precio ant." /> : undefined}
              />
              <CardKpi
                titulo="Referencias Activas"
                valor={`${(d5?.kpis.totalReferenciasActivas ?? 0).toLocaleString("es-CO")}`}
                subtexto="Catálogo en rotación digital"
                icono={<Package className="h-5 w-5 text-blue-500" />}
                cargando={cD5}
                badgeYoY={compararAnioAnterior ? <BadgeYoY actual={d5?.kpis.totalReferenciasActivas} anterior={d5?.kpis.totalReferenciasActivasAnterior} tipo="entero" label="refs ant." /> : undefined}
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
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold">Participación por Marketplace</CardTitle>
                      <CardDescription>Cuota de facturación de Mercado Libre, Falabella, Dafiti y Linio</CardDescription>
                    </div>
                    <InfoGrafica
                      titulo="Participación por Marketplace"
                      descripcion="Distribución porcentual de los ingresos recaudados en cada portal de retail externo o marketplace integrado."
                      metrica="Facturación total ($) y porcentaje de cuota por plataforma (Mercado Libre, Falabella, Dafiti, Linio)."
                      interpretacion="Permite saber en qué marketplace se concentra la mayor demanda y dónde vale la pena invertir en posicionamiento patrocinado."
                    />
                  </div>
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
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold">Curva de Demanda por Tallas</CardTitle>
                      <CardDescription>Tallas con mayor volumen de reposición y demanda</CardDescription>
                    </div>
                    <InfoGrafica
                      titulo="Curva de Demanda por Tallas en Marketplaces"
                      descripcion="Distribución física de unidades demandadas desglosadas por talla en las ventas de retail y marketplaces."
                      metrica="Cantidad total de prendas vendidas agrupadas por talla (XS, S, M, L, XL, etc.)."
                      interpretacion="Fundamental para planificar lotes de confección y abastecimiento de bodegas fullfillment sin generar quiebres ni sobrestocks."
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={d5?.curvaTallas || []} margin={{ left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="talla" tick={{ fontSize: 12 }} />
                        <YAxis allowDecimals={false} tickFormatter={(v) => Math.round(v).toLocaleString("es-CO")} tick={{ fontSize: 11 }} width={55} />
                        <Tooltip formatter={(v: number) => [`${Math.round(v).toLocaleString("es-CO")} unds`, "Unidades"]} />
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
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">Top 10 Referencias / SKUs Líderes</CardTitle>
                    <CardDescription>Productos de mayor rotación y recaudación</CardDescription>
                  </div>
                  <InfoGrafica
                    titulo="Top 10 SKUs en Marketplaces"
                    descripcion="Listado de las 10 referencias con mayor facturación y rotación en canales de marketplaces."
                    metrica="Unidades vendidas, facturación total ($) y precio promedio unitario."
                    interpretacion="Identifica las prendas con mayor tracción en canales de retail para garantizar disponibilidad en centros de cumplimiento (Fulfillment)."
                  />
                </div>
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
          )}

          {/* ========================================================================= */}
          {/* TAB 6: INTELIGENCIA Y RENDIMIENTO DE REFERENCIAS (CATÁLOGO GLOBAL) */}
          {/* ========================================================================= */}
          <TabsContent value="referencias" className="space-y-6">
            {/* Encabezado del Dashboard */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/60 pb-3">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground font-display flex items-center gap-2">
                  <Package className="h-5 w-5 text-cyan-500" />
                  Dashboard 6: Inteligencia y Rendimiento de Referencias (Catálogo Global)
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Análisis gerencial del portafolio completo de productos: rotación física, concentración ABC (Pareto 80/20), ticket promedio por prenda, curva de demanda y calidad.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="bg-cyan-500/10 border-cyan-500/30 text-cyan-700 dark:text-cyan-300 font-mono text-xs">
                  <Package className="mr-1 h-3 w-3" />
                  {(d6?.kpis.totalReferenciasActivas ?? 0).toLocaleString("es-CO")} SKUs activos
                </Badge>
                {d6?.kpis.concentracionParetoA && (
                  <Badge variant="outline" className="bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
                    <Percent className="mr-1 h-3 w-3" />
                    Top {d6.kpis.concentracionParetoA.referenciasPct}% genera el {d6.kpis.concentracionParetoA.ventaPct}% de la venta
                  </Badge>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportarCSVReferencias}
                  className="h-8 text-xs font-medium border-primary/30 text-primary hover:bg-primary/10"
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  Exportar Catálogo CSV
                </Button>
              </div>
            </div>

            {/* Tarjetas KPI Gerenciales de Referencias */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
              <CardKpi
                titulo="Facturación Neta"
                valor={formatoCOPFull(d6?.kpis.totalVentaNeta ?? 0)}
                subtexto={`Bruta: ${formatoCOP(d6?.kpis.totalVentaBruta ?? 0)} • Devs: ${formatoCOP(d6?.kpis.totalDevoluciones ?? 0)}`}
                icono={<DollarSign className="h-5 w-5 text-emerald-500" />}
                cargando={cD6}
                badgeYoY={compararAnioAnterior ? <BadgeYoY actual={d6?.kpis.totalVentaNeta} anterior={d6?.kpis.totalVentaNetaAnterior} porcentaje={d6?.kpis.crecimientoYoYPct} /> : undefined}
              />
              <CardKpi
                titulo="Volumen Prendas"
                valor={`${(d6?.kpis.totalUnidades ?? 0).toLocaleString("es-CO")} unds`}
                subtexto="Total unidades comercializadas"
                icono={<Package className="h-5 w-5 text-blue-500" />}
                cargando={cD6}
                badgeYoY={compararAnioAnterior ? <BadgeYoYUnidades actual={d6?.kpis.totalUnidades} anterior={d6?.kpis.totalUnidadesAnterior} /> : undefined}
              />
              <CardKpi
                titulo="Catálogo Activo"
                valor={`${(d6?.kpis.totalReferenciasActivas ?? 0).toLocaleString("es-CO")} SKUs`}
                subtexto={`${d6?.kpis.concentracionParetoA.referenciasCount ?? 0} referencias en Clase A`}
                icono={<Layers className="h-5 w-5 text-indigo-500" />}
                cargando={cD6}
                badgeYoY={compararAnioAnterior ? <BadgeYoY actual={d6?.kpis.totalReferenciasActivas} anterior={d6?.kpis.totalReferenciasActivasAnterior} tipo="entero" label="SKUs ant." /> : undefined}
              />
              <CardKpi
                titulo="Precio Promedio (ASP)"
                valor={formatoCOPFull(d6?.kpis.precioPromedioPonderado ?? 0)}
                subtexto="Ticket unitario ponderado"
                icono={<Tag className="h-5 w-5 text-amber-500" />}
                cargando={cD6}
                badgeYoY={compararAnioAnterior ? <BadgeYoY actual={d6?.kpis.precioPromedioPonderado} anterior={d6?.kpis.precioPromedioPonderadoAnterior} label="precio ant." /> : undefined}
              />
              <CardKpi
                titulo="Concentración Pareto"
                valor={`${d6?.kpis.concentracionParetoA.ventaPct ?? 0}%`}
                subtexto={`Generado por el ${d6?.kpis.concentracionParetoA.referenciasPct ?? 0}% de SKUs`}
                icono={<Percent className="h-5 w-5 text-purple-500" />}
                cargando={cD6}
              />
              <CardKpi
                titulo="Top #1 en Ventas"
                valor={d6?.kpis.referenciaTopVentas?.sku ?? "N/A"}
                subtexto={
                  d6?.kpis.referenciaTopVentas
                    ? `${formatoCOP(d6.kpis.referenciaTopVentas.valor)} (${d6.kpis.referenciaTopVentas.porcentaje}% total)`
                    : "Sin datos"
                }
                icono={<Award className="h-5 w-5 text-pink-500" />}
                cargando={cD6}
              />
              <CardKpi
                titulo="Tasa Devolución"
                valor={`${d6?.kpis.tasaDevolucionGlobal ?? 0}%`}
                subtexto={`Total devs: ${formatoCOP(d6?.kpis.totalDevoluciones ?? 0)}`}
                icono={<ArrowDownRight className="h-5 w-5 text-rose-500" />}
                cargando={cD6}
                badgeYoY={compararAnioAnterior ? <BadgeYoY actual={d6?.kpis.tasaDevolucionGlobal} anterior={d6?.kpis.tasaDevolucionAnterior} tipo="pct" invertido={true} label="tasa ant." /> : undefined}
              />
            </div>

            {/* SECCIÓN 1: Rankings Top Performers (Facturación $ vs Rotación Unidades) */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Top 15 por Facturación */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                        Top 15 Referencias por Facturación ($ COP)
                      </CardTitle>
                      <CardDescription>
                        SKUs que generan el mayor flujo de ingresos para la compañía
                      </CardDescription>
                    </div>
                    <InfoGrafica
                      titulo="Top 15 Referencias por Facturación"
                      descripcion="Las 15 referencias con mayor recaudación acumulada en ventas netas dentro del catálogo."
                      metrica="Ventas netas ($ COP), unidades físicas vendidas, precio unitario y clasificación ABC."
                      interpretacion="Representa el núcleo de facturación del negocio. Son referencias que deben estar siempre priorizadas en compras de materia prima."
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[380px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={d6?.top15PorValor || []}
                        margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                        <XAxis
                          type="number"
                          tickFormatter={(v) => formatoCOP(v)}
                          tick={{ fontSize: 11 }}
                        />
                        <YAxis
                          type="category"
                          dataKey="sku"
                          tick={{ fontSize: 11, fontWeight: 500 }}
                          width={75}
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload as ItemReferenciaAnalisis;
                              return (
                                <div className="rounded-lg border bg-popover p-3 shadow-md text-xs space-y-1 z-50">
                                  <p className="font-bold text-foreground text-sm font-mono">{data.sku}</p>
                                  <p className="text-muted-foreground font-medium">{data.producto}</p>
                                  <div className="h-px bg-border my-1.5" />
                                  <p className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                    Venta Neta: {formatoCOPFull(data.ventaNeta)}
                                  </p>
                                  <p className="text-muted-foreground">
                                    Unidades: <span className="font-semibold text-foreground">{data.unidades.toLocaleString("es-CO")}</span>
                                  </p>
                                  <p className="text-muted-foreground">
                                    Precio Promedio: <span className="font-semibold text-foreground">{formatoCOPFull(data.precioPromedio)}</span>
                                  </p>
                                  <p className="text-muted-foreground">
                                    Línea: <span className="font-semibold text-foreground">{data.linea}</span>
                                  </p>
                                  <p className="text-muted-foreground">
                                    Participación: <span className="font-semibold text-foreground">{data.porcentajeVenta}%</span> • Clase <span className="font-bold text-primary">{data.clasificacionABC}</span>
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="ventaNeta" fill="#0284c7" radius={[0, 4, 4, 0]}>
                          {(d6?.top15PorValor || []).map((_, index) => (
                            <Cell
                              key={`cell-val-${index}`}
                              fill={index === 0 ? "#059669" : index < 3 ? "#0284c7" : "#3b82f6"}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Top 15 por Rotación (Unidades) */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Package className="h-4 w-4 text-cyan-500" />
                        Top 15 Referencias por Rotación (Unidades Físicas)
                      </CardTitle>
                      <CardDescription>
                        Prendas con mayor volumen de salida física de inventario
                      </CardDescription>
                    </div>
                    <InfoGrafica
                      titulo="Top 15 Referencias por Rotación Física"
                      descripcion="Las 15 referencias con mayor volumen de unidades entregadas y despachadas de bodega."
                      metrica="Cantidad neta de prendas vendidas (Unidades físicas)."
                      interpretacion="Permite monitorear la velocidad de rotación física de inventario y programar la capacidad de planta y talleres."
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[380px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={d6?.top15PorVolumen || []}
                        margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                        <XAxis
                          type="number"
                          allowDecimals={false}
                          tickFormatter={(v) => `${Math.round(v).toLocaleString("es-CO")} u`}
                          tick={{ fontSize: 11 }}
                        />
                        <YAxis
                          type="category"
                          dataKey="sku"
                          tick={{ fontSize: 11, fontWeight: 500 }}
                          width={75}
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload as ItemReferenciaAnalisis;
                              return (
                                <div className="rounded-lg border bg-popover p-3 shadow-md text-xs space-y-1 z-50">
                                  <p className="font-bold text-foreground text-sm font-mono">{data.sku}</p>
                                  <p className="text-muted-foreground font-medium">{data.producto}</p>
                                  <div className="h-px bg-border my-1.5" />
                                  <p className="text-blue-600 dark:text-blue-400 font-semibold">
                                    Unidades Vendidas: {Math.round(data.unidades).toLocaleString("es-CO")} unds
                                  </p>
                                  <p className="text-muted-foreground">
                                    Facturación: <span className="font-semibold text-foreground">{formatoCOPFull(data.ventaNeta)}</span>
                                  </p>
                                  <p className="text-muted-foreground">
                                    Precio Promedio: <span className="font-semibold text-foreground">{formatoCOPFull(data.precioPromedio)}</span>
                                  </p>
                                  <p className="text-muted-foreground">
                                    Línea: <span className="font-semibold text-foreground">{data.linea}</span>
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="unidades" fill="#0d9488" radius={[0, 4, 4, 0]}>
                          {(d6?.top15PorVolumen || []).map((_, index) => (
                            <Cell
                              key={`cell-vol-${index}`}
                              fill={index === 0 ? "#0d9488" : index < 3 ? "#14b8a6" : "#2dd4bf"}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* SECCIÓN 2: Mezcla por Líneas & Clasificación ABC de Pareto */}
            <div className="grid gap-6 lg:grid-cols-12">
              {/* Distribución por Líneas de Producto (7 cols) */}
              <Card className="lg:col-span-7">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Layers className="h-4 w-4 text-indigo-500" />
                        Ventas y Unidades por Línea de Producto
                      </CardTitle>
                      <CardDescription>
                        Comparativo de facturación total, prendas comercializadas y ticket promedio por categoría
                      </CardDescription>
                    </div>
                    <InfoGrafica
                      titulo="Ventas y Unidades por Línea de Producto"
                      descripcion="Rendimiento consolidado de cada línea de vestuario con su facturación, volumen de prendas y precio promedio ponderado."
                      metrica="Barras: Facturación en $ • Tooltip interactivo con unidades y número de SKUs activos."
                      interpretacion="Permite balancear la colección evaluando qué líneas generan mayor rentabilidad y volumen comercial."
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={d6?.distribucionLineas.slice(0, 8) || []}
                        margin={{ top: 10, right: 10, left: 10, bottom: 25 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                        <XAxis
                          dataKey="linea"
                          tick={{ fontSize: 10 }}
                          angle={-15}
                          textAnchor="end"
                          interval={0}
                        />
                        <YAxis
                          yAxisId="left"
                          tickFormatter={(v) => formatoCOP(v)}
                          tick={{ fontSize: 10 }}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          allowDecimals={false}
                          tickFormatter={(v) => `${Math.round(v).toLocaleString("es-CO")} u`}
                          tick={{ fontSize: 10 }}
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="rounded-lg border bg-popover p-3 shadow-md text-xs space-y-1 z-50">
                                  <p className="font-bold text-foreground text-sm">{data.linea}</p>
                                  <div className="h-px bg-border my-1" />
                                  <p className="text-indigo-600 dark:text-indigo-400 font-semibold">
                                    Venta Total: {formatoCOPFull(data.venta)} ({data.porcentaje}%)
                                  </p>
                                  <p className="text-emerald-600 dark:text-emerald-400 font-medium">
                                    Unidades: {Math.round(data.unidades).toLocaleString("es-CO")} prendas
                                  </p>
                                  <p className="text-muted-foreground">
                                    Referencias Activas: {data.referenciasCount} SKUs
                                  </p>
                                  <p className="text-muted-foreground">
                                    Precio Promedio: {formatoCOPFull(data.precioPromedio)}
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar yAxisId="left" dataKey="venta" name="Facturación ($)" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Matriz y Diagnóstico ABC de Pareto (5 cols) */}
              <Card className="lg:col-span-5 flex flex-col justify-between">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Percent className="h-4 w-4 text-purple-500" />
                        Estructura Pareto / Clasificación ABC
                      </CardTitle>
                      <CardDescription>
                        Segmentación estratégica del catálogo para optimizar inventarios y compras
                      </CardDescription>
                    </div>
                    <InfoGrafica
                      titulo="Estructura Pareto / Clasificación ABC"
                      descripcion="Clasifica el catálogo en 3 zonas: Clase A (80% de ventas, ~20% SKUs), Clase B (15% ventas, ~30% SKUs) y Clase C (5% ventas, cola larga)."
                      metrica="Porcentaje acumulado de facturación ($) y cantidad de SKUs por grupo."
                      interpretacion="Optimiza el capital de trabajo: enfoca el 80% de los esfuerzos de aprovisionamiento en la Clase A y evalúa liquidaciones en la Clase C."
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3.5">
                  {(d6?.clasificacionABCResumen || []).map((item) => (
                    <div
                      key={item.clase}
                      className={`p-3 rounded-lg border transition-all ${
                        item.clase === "A"
                          ? "bg-emerald-500/10 border-emerald-500/30"
                          : item.clase === "B"
                          ? "bg-amber-500/10 border-amber-500/30"
                          : "bg-slate-500/10 border-slate-500/20"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            className={
                              item.clase === "A"
                                ? "bg-emerald-600 text-white font-bold"
                                : item.clase === "B"
                                ? "bg-amber-600 text-white font-bold"
                                : "bg-slate-600 text-white font-bold"
                            }
                          >
                            Clase {item.clase}
                          </Badge>
                          <span className="text-xs font-semibold text-foreground">
                            {item.clase === "A"
                              ? "Alto Impacto (Motor de Ingresos)"
                              : item.clase === "B"
                              ? "Rotación Regular (Catálogo Activo)"
                              : "Cola Larga (Revisión de Inventario)"}
                          </span>
                        </div>
                        <span className="text-xs font-bold font-mono text-foreground">
                          {item.porcentajeVenta}% Venta
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mb-2">
                        {item.descripcion}
                      </p>
                      <div className="grid grid-cols-3 gap-2 text-center text-xs bg-background/60 rounded p-1.5 border border-border/40">
                        <div>
                          <p className="text-[10px] text-muted-foreground">SKUs</p>
                          <p className="font-bold text-foreground font-mono">{item.referenciasCount} ({item.referenciasPct}%)</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">Facturación</p>
                          <p className="font-bold text-foreground font-mono">{formatoCOP(item.ventaTotal)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">Prendas</p>
                          <p className="font-bold text-foreground font-mono">{item.unidadesTotal.toLocaleString("es-CO")}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* SECCIÓN 3: Curva de Tallas, Colores y Alertas de Calidad / Devoluciones */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Curva de Tallas */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Tag className="h-4 w-4 text-purple-500" />
                        Curva de Tallas Más Demandadas
                      </CardTitle>
                      <CardDescription>Distribución de unidades vendidas por talla</CardDescription>
                    </div>
                    <InfoGrafica
                      titulo="Curva de Tallas Más Demandadas"
                      descripcion="Muestra la proporción de unidades vendidas clasificadas por talla física del producto en el periodo."
                      metrica="Prendas vendidas y porcentaje de demanda por talla."
                      interpretacion="Permite afinar la escala de corte en confección y rebalancear compras de insumos para evitar agotados en tallas clave."
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[240px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={d6?.curvaTallas || []}
                        margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                        <XAxis dataKey="talla" tick={{ fontSize: 11, fontWeight: 600 }} />
                        <YAxis allowDecimals={false} tickFormatter={(v) => `${Math.round(v).toLocaleString("es-CO")}`} tick={{ fontSize: 10 }} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload;
                              return (
                                <div className="rounded border bg-popover p-2 shadow text-xs">
                                  <p className="font-bold">Talla: {d.talla}</p>
                                  <p className="text-purple-600 font-semibold">{Math.round(d.unidades).toLocaleString("es-CO")} unds ({d.porcentaje}%)</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="unidades" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Colores Líderes */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <ShoppingBag className="h-4 w-4 text-pink-500" />
                        Colores Más Vendidos
                      </CardTitle>
                      <CardDescription>Demanda cromática de referencias</CardDescription>
                    </div>
                    <InfoGrafica
                      titulo="Colores Más Vendidos"
                      descripcion="Ranking de los tonos y variantes de color preferidos por los clientes en las compras de prendas."
                      metrica="Volumen total de unidades vendidas y cuota porcentual por color."
                      interpretacion="Guía las decisiones de tintorería y selección de paleta de color para próximas colecciones y lanzamientos."
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[240px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={d6?.coloresLideres || []}
                        margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                        <XAxis dataKey="color" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" interval={0} />
                        <YAxis allowDecimals={false} tickFormatter={(v) => `${Math.round(v).toLocaleString("es-CO")}`} tick={{ fontSize: 10 }} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload;
                              return (
                                <div className="rounded border bg-popover p-2 shadow text-xs">
                                  <p className="font-bold">Color: {d.color}</p>
                                  <p className="text-pink-600 font-semibold">{Math.round(d.unidades).toLocaleString("es-CO")} unds ({d.porcentaje}%)</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="unidades" fill="#ec4899" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Alertas de Calidad / Devoluciones */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-rose-500" />
                        Top Devoluciones por Referencia
                      </CardTitle>
                      <CardDescription>Alertas de fit o calidad para revisión de producción</CardDescription>
                    </div>
                    <InfoGrafica
                      titulo="Alertas de Devolución por Referencia"
                      descripcion="Referencias con mayor impacto monetario o tasa de devolución y notas crédito registradas."
                      metrica="Valor monetario devuelto ($ COP) y tasa de devolución relativa sobre las ventas del SKU."
                      interpretacion="Permite detectar precozmente problemas de horma, moldería, costura o tela en referencias específicas para corregir en fábrica."
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2.5 max-h-[240px] overflow-y-auto pr-1">
                    {(d6?.top10Devoluciones || []).length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-[180px] text-center text-muted-foreground text-xs">
                        <Package className="h-8 w-8 mb-2 opacity-30" />
                        No se registran devoluciones en el periodo
                      </div>
                    ) : (
                      (d6?.top10Devoluciones || []).slice(0, 5).map((ref, idx) => (
                        <div key={ref.sku} className="flex items-center justify-between p-2 rounded-md bg-rose-500/10 border border-rose-500/20 text-xs">
                          <div className="min-w-0 flex-1 pr-2">
                            <p className="font-mono font-bold text-rose-700 dark:text-rose-300 truncate">
                              #{idx + 1} {ref.sku}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate">{ref.producto}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-rose-600 dark:text-rose-400 font-mono">
                              {formatoCOPFull(ref.devoluciones)}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {ref.tasaDevolucion}% tasa dev.
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* SECCIÓN 4: Maestro y Explorador Completo de Referencias */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-primary" />
                      Maestro Interactivo de Referencias del Catálogo
                    </CardTitle>
                    <CardDescription>
                      Mostrando {referenciasFiltradas.length.toLocaleString("es-CO")} referencias filtradas de {(d6?.todasReferencias?.length ?? 0).toLocaleString("es-CO")} en catálogo
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportarCSVReferencias}
                    className="h-8 text-xs font-medium border-primary/40 text-primary hover:bg-primary/10 self-start md:self-auto"
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                    Descargar Tabla en CSV
                  </Button>
                </div>

                {/* Filtros locales de la tabla */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-3 border-t border-border/50 mt-2">
                  {/* Buscador */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Buscar SKU o nombre..."
                      value={busquedaRef}
                      onChange={(e) => {
                        setBusquedaRef(e.target.value);
                        setPaginaRef(1);
                      }}
                      className="h-8 pl-8 text-xs bg-background"
                    />
                  </div>

                  {/* Filtro por Línea */}
                  <Select
                    value={filtroLineaRef}
                    onValueChange={(v) => {
                      setFiltroLineaRef(v);
                      setPaginaRef(1);
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs bg-background">
                      <SelectValue placeholder="Todas las Líneas" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      <SelectItem value="todas">Todas las Líneas</SelectItem>
                      {(d6?.distribucionLineas || []).map((l) => (
                        <SelectItem key={l.linea} value={l.linea}>
                          {l.linea} ({l.referenciasCount} SKUs)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Filtro por Clase ABC */}
                  <Select
                    value={filtroAbcRef}
                    onValueChange={(v) => {
                      setFiltroAbcRef(v);
                      setPaginaRef(1);
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs bg-background">
                      <SelectValue placeholder="Clasificación ABC" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todas las Clases (A, B, C)</SelectItem>
                      <SelectItem value="A">⭐ Solo Clase A (Alto Impacto - 80%)</SelectItem>
                      <SelectItem value="B">📦 Solo Clase B (Medio Impacto - 15%)</SelectItem>
                      <SelectItem value="C">⏳ Solo Clase C (Larga Cola - 5%)</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Selector de Orden */}
                  <Select
                    value={ordenRef}
                    onValueChange={(v: any) => {
                      setOrdenRef(v);
                      setPaginaRef(1);
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs bg-background">
                      <SelectValue placeholder="Ordenar por" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ventaDesc">💰 Mayor Facturación Neta ($)</SelectItem>
                      <SelectItem value="unidadesDesc">📦 Mayor Unidades Vendidas</SelectItem>
                      <SelectItem value="precioDesc">🏷️ Mayor Precio Promedio Unitario</SelectItem>
                      <SelectItem value="devDesc">⚠️ Mayor Monto de Devolución</SelectItem>
                      <SelectItem value="paretoAsc">📈 Orden Pareto Acumulado</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Filas por página */}
                  <Select
                    value={filasPorPaginaRef}
                    onValueChange={(v) => {
                      setFilasPorPaginaRef(v);
                      setPaginaRef(1);
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs bg-background">
                      <SelectValue placeholder="Registros por página" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">Ver 25 registros</SelectItem>
                      <SelectItem value="50">Ver 50 registros</SelectItem>
                      <SelectItem value="100">Ver 100 registros</SelectItem>
                      <SelectItem value="todas">Ver todas ({referenciasFiltradas.length})</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wider border-y border-border/60">
                      <tr>
                        <th className="py-2.5 px-3 text-center w-12">#</th>
                        <th className="py-2.5 px-3">SKU / Referencia</th>
                        <th className="py-2.5 px-3">Descripción de Producto</th>
                        <th className="py-2.5 px-3">Línea</th>
                        <th className="py-2.5 px-3 text-center">Clase ABC</th>
                        <th className="py-2.5 px-3 text-right">Unidades</th>
                        <th className="py-2.5 px-3 text-right">Facturación Neta</th>
                        {compararAnioAnterior && <th className="py-2.5 px-3 text-right">Vs. Año Ant.</th>}
                        <th className="py-2.5 px-3 text-right">Precio Prom.</th>
                        <th className="py-2.5 px-3 text-right">% Aporte</th>
                        <th className="py-2.5 px-3 text-right">Tasa Dev.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {referenciasPaginadas.length === 0 ? (
                        <tr>
                          <td colSpan={compararAnioAnterior ? 11 : 10} className="py-8 text-center text-muted-foreground">
                            No se encontraron referencias con los filtros aplicados.
                          </td>
                        </tr>
                      ) : (
                        referenciasPaginadas.map((ref, idx) => {
                          const rank = filasPorPaginaRef === "todas"
                            ? idx + 1
                            : (paginaRef - 1) * Number(filasPorPaginaRef) + idx + 1;
                          return (
                            <tr key={ref.sku} className="hover:bg-muted/30 transition-colors">
                              <td className="py-2.5 px-3 text-center text-muted-foreground font-mono font-semibold">
                                {rank}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold text-primary">
                                {ref.sku}
                              </td>
                              <td className="py-2.5 px-3 font-medium text-foreground max-w-[220px] truncate" title={ref.producto}>
                                {ref.producto}
                              </td>
                              <td className="py-2.5 px-3 text-muted-foreground">
                                {ref.linea}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <Badge
                                  className={
                                    ref.clasificacionABC === "A"
                                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-bold"
                                      : ref.clasificacionABC === "B"
                                      ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px] font-bold"
                                      : "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30 text-[10px] font-bold"
                                  }
                                >
                                  Clase {ref.clasificacionABC}
                                </Badge>
                              </td>
                              <td className="py-2.5 px-3 text-right font-semibold text-foreground">
                                {ref.unidades.toLocaleString("es-CO")}
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                                {formatoCOPFull(ref.ventaNeta)}
                              </td>
                              {compararAnioAnterior && (
                                <td className="py-2.5 px-3 text-right font-mono">
                                  {ref.ventaAnterior ? (
                                    <span
                                      className={cn(
                                        "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-semibold text-[11px]",
                                        (ref.crecimientoYoYPct ?? 0) >= 0
                                          ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                                          : "text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20"
                                      )}
                                    >
                                      {(ref.crecimientoYoYPct ?? 0) >= 0 ? "+" : ""}
                                      {(ref.crecimientoYoYPct ?? 0).toFixed(1)}%
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground text-[11px]">-</span>
                                  )}
                                </td>
                              )}
                              <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">
                                {formatoCOP(ref.precioPromedio)}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <div className="w-12 bg-muted rounded-full h-1.5 overflow-hidden hidden sm:block">
                                    <div
                                      className="bg-primary h-full rounded-full"
                                      style={{ width: `${Math.min(100, ref.porcentajeVenta * 10)}%` }}
                                    />
                                  </div>
                                  <span className="font-mono font-medium">{ref.porcentajeVenta}%</span>
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono">
                                {ref.tasaDevolucion > 0 ? (
                                  <span className="text-rose-600 dark:text-rose-400 font-medium">
                                    {ref.tasaDevolucion}%
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">0%</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Paginación */}
                {filasPorPaginaRef !== "todas" && totalPaginasRef > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-border/60 bg-muted/20">
                    <p className="text-xs text-muted-foreground">
                      Página <span className="font-bold text-foreground">{paginaRef}</span> de <span className="font-bold text-foreground">{totalPaginasRef}</span> ({referenciasFiltradas.length.toLocaleString("es-CO")} registros en total)
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        disabled={paginaRef <= 1}
                        onClick={() => setPaginaRef((p) => Math.max(1, p - 1))}
                      >
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        disabled={paginaRef >= totalPaginasRef}
                        onClick={() => setPaginaRef((p) => Math.min(totalPaginasRef, p + 1))}
                      >
                        Siguiente
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========================================================================= */}
          {/* TAB 7: EXPLORADOR DE TRANSACCIONES */}
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
          {esAdmin && (
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
          )}
        </Tabs>
      </main>

      {/* Modal de Administración de Permisos de Vendedores */}
      <AdminPermisosVendedoresDialog
        open={modalPermisosAbierto}
        onOpenChange={setModalPermisosAbierto}
        vendedoresCatalogo={catalogos?.vendedores || []}
        currentUserEmail={currentUser?.email}
        onPermisosActualizados={() => {
          setPermisoVersion((v) => v + 1);
          queryClient.invalidateQueries({ queryKey: ["bi-fact-ventas"] });
        }}
      />
    </div>
  );
}

function InfoGrafica({
  titulo,
  descripcion,
  metrica,
  interpretacion,
}: {
  titulo: string;
  descripcion: string;
  metrica?: string;
  interpretacion?: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Información de la gráfica: ${titulo}`}
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/70 hover:text-foreground border border-transparent hover:border-border/60 transition-all duration-200 shrink-0"
        >
          <Info className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="bottom"
        className="w-80 sm:w-96 p-4 rounded-2xl border border-border/80 shadow-lg bg-popover/95 backdrop-blur-md text-xs space-y-3 z-50"
      >
        <div className="flex items-center gap-2 border-b border-border/50 pb-2">
          <div className="grid h-6 w-6 place-items-center rounded-lg bg-primary/10 text-primary shrink-0">
            <Info className="h-3.5 w-3.5" />
          </div>
          <span className="font-semibold text-sm text-foreground font-display">{titulo}</span>
        </div>
        <p className="text-muted-foreground leading-relaxed text-xs">
          {descripcion}
        </p>
        {metrica && (
          <div className="bg-muted/50 p-2.5 rounded-xl border border-border/40">
            <span className="font-semibold text-foreground block text-[11px] uppercase tracking-wider mb-0.5">
              📊 ¿Qué datos muestra?
            </span>
            <p className="text-muted-foreground text-[11px] leading-snug">{metrica}</p>
          </div>
        )}
        {interpretacion && (
          <div className="bg-primary/5 p-2.5 rounded-xl border border-primary/20">
            <span className="font-semibold text-primary block text-[11px] uppercase tracking-wider mb-0.5">
              💡 Utilidad gerencial
            </span>
            <p className="text-muted-foreground text-[11px] leading-snug">{interpretacion}</p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function getKpiValueFontSize(val: string) {
  const len = val.length;
  if (len >= 16) return "text-sm sm:text-base xl:text-lg 2xl:text-xl";
  if (len >= 13) return "text-base sm:text-lg xl:text-xl 2xl:text-2xl";
  if (len >= 10) return "text-lg sm:text-xl xl:text-2xl 2xl:text-[1.65rem]";
  return "text-xl sm:text-2xl xl:text-[1.65rem]";
}

function CardKpi({
  titulo,
  valor,
  subtexto,
  icono,
  cargando,
  badgeSemaforo,
  badgeYoY,
}: {
  titulo: string;
  valor: string;
  subtexto?: string | undefined;
  icono?: React.ReactNode | undefined;
  cargando?: boolean | undefined;
  badgeSemaforo?: number | undefined;
  badgeYoY?: React.ReactNode | undefined;
}) {
  return (
    <Card className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card/90 backdrop-blur-xs shadow-2xs hover:shadow-md hover:border-primary/40 transition-all duration-300">
      {/* Top accent highlight */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <CardContent className="p-4 sm:p-4.5 flex flex-col justify-between h-full">
        <div>
          <div className="flex items-start justify-between gap-1.5 min-h-[2.2rem]">
            <p
              className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground leading-snug line-clamp-2"
              title={titulo}
            >
              {titulo}
            </p>
            {icono && (
              <div className="grid h-7 w-7 sm:h-8 sm:w-8 place-items-center rounded-xl bg-muted/60 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary group-hover:scale-105 transition-all duration-200 shrink-0">
                {icono}
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-baseline gap-1.5 mt-2">
            <p
              className={cn(
                "font-bold font-display tracking-tight text-foreground tabular-nums leading-tight break-all sm:break-normal",
                getKpiValueFontSize(cargando ? "—" : valor)
              )}
              title={cargando ? undefined : valor}
            >
              {cargando ? "—" : valor}
            </p>
            {badgeSemaforo !== undefined && (
              <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border shadow-2xs shrink-0 ${colorSemaforo(badgeSemaforo)}`}>
                {badgeSemaforo >= 100 ? "Meta Cumplida" : badgeSemaforo >= 90 ? "Alerta" : "Crítico"}
              </span>
            )}
          </div>
        </div>
        {badgeYoY && !cargando && (
          <div className="mt-2.5">
            {badgeYoY}
          </div>
        )}
        {subtexto && (
          <p
            className="mt-2.5 text-[11px] sm:text-xs text-muted-foreground font-medium flex items-center gap-1 line-clamp-2 leading-snug"
            title={subtexto}
          >
            {subtexto}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
