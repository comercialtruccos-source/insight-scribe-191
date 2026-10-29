"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Truck,
  Boxes,
  Package,
  PackageCheck,
  AlertTriangle,
  Clock,
  Calendar,
  Users,
  ShoppingBag,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Printer,
  Download,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Eye,
  RefreshCw,
  FileText,
  Layers,
  Sparkles,
  ArrowUpDown,
  Tag,
  Check,
  X,
  ExternalLink,
  Info,
  SlidersHorizontal,
  MapPin,
  ClipboardList,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  obtenerDatosPedidosDespachos,
  type RegistroPedidosDespachosHGI,
} from "@/lib/pedidos-despachos-storage";
import {
  calcularInformeDespachosBodega,
  obtenerDecisionesBodegaLocales,
  guardarDecisionAlistamientoBodega,
  sincronizarDecisionesBodegaDesdeSupabase,
  exportarPlanillaBodegaExcel,
  exportarPlanillaPickingCSV,
  type GrupoPedidoClienteBodega,
  type GrupoReferenciaPickingBodega,
  type DecisionAlistamientoPedido,
  type EstadoAlistamientoBodega,
  type FiltrosDespachosBodega,
} from "@/lib/despachos-bodega";

interface InformeDespachosBodegaProps {
  esAdmin: boolean;
  asesorNombre?: string;
  vendedorIdsPermitidos?: number[];
  onVolverInicio?: () => void;
  className?: string;
}

const ESTADOS_ALISTAMIENTO: Array<{
  valor: EstadoAlistamientoBodega;
  etiqueta: string;
  badgeClass: string;
  dotColor: string;
  descripcion: string;
}> = [
  {
    valor: "pendiente",
    etiqueta: "Pendiente Picking",
    badgeClass: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30",
    dotColor: "bg-slate-400",
    descripcion: "En cola de espera para separación en bodega",
  },
  {
    valor: "en_picking",
    etiqueta: "En Separación / Picking",
    badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
    dotColor: "bg-amber-500",
    descripcion: "Operador recolectando prendas en pasillos",
  },
  {
    valor: "empacado",
    etiqueta: "Empacado / Rotulado",
    badgeClass: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
    dotColor: "bg-indigo-500",
    descripcion: "Cajas selladas y rotuladas en mesa de packing",
  },
  {
    valor: "listo_despacho",
    etiqueta: "Listo para Despacho",
    badgeClass: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
    dotColor: "bg-blue-500",
    descripcion: "En muelle de carga esperando transportadora",
  },
  {
    valor: "despachado",
    etiqueta: "Despachado / Entregado",
    badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    dotColor: "bg-emerald-500",
    descripcion: "Entregado a la empresa de transporte o cliente",
  },
];

const TRANSPORTADORAS_FRECUENTES = [
  "Coordinadora Mercantil",
  "Envía Colvanes",
  "Servientrega",
  "Interrapidísimo",
  "TCC",
  "Vehículo Propio Truccos",
  "Entrega en Tienda / Mostrador",
  "Mensajería Local Express",
];

export function InformeDespachosBodega({
  esAdmin,
  asesorNombre,
  vendedorIdsPermitidos,
  onVolverInicio,
  className,
}: InformeDespachosBodegaProps) {
  // Modo de visualización: por Pedido/Cliente vs por Referencia/Picking
  const [modoVista, setModoVista] = useState<"pedidos" | "picking">("pedidos");

  // Decisiones de alistamiento
  const [decisiones, setDecisiones] = useState<Record<string, DecisionAlistamientoPedido>>(() =>
    obtenerDecisionesBodegaLocales()
  );

  // Filtros
  const [tipoDespachoFiltro, setTipoDespachoFiltro] = useState<string>("todos");
  const [estadoAlistamientoFiltro, setEstadoAlistamientoFiltro] = useState<string>("todos");
  const [urgenciaFiltro, setUrgenciaFiltro] = useState<string>("todos");
  const [ciudadFiltro, setCiudadFiltro] = useState<string>("todas");
  const [vendedorFiltro, setVendedorFiltro] = useState<string>("todos");
  const [correriaFiltro, setCorreriaFiltro] = useState<string>("todas");
  const [busqueda, setBusqueda] = useState<string>("");
  const [ordenarPor, setOrdenarPor] = useState<FiltrosDespachosBodega["ordenarPor"]>("urgencia_asc");

  // Expansión de filas
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({});

  // Modal de gestión de despacho
  const [pedidoEnEdicion, setPedidoEnEdicion] = useState<GrupoPedidoClienteBodega | null>(null);
  const [formAlistamiento, setFormAlistamiento] = useState<{
    estadoAlistamiento: EstadoAlistamientoBodega;
    transportadora: string;
    numeroGuia: string;
    bultos: number;
    responsable: string;
    observaciones: string;
  }>({
    estadoAlistamiento: "pendiente",
    transportadora: "",
    numeroGuia: "",
    bultos: 1,
    responsable: "",
    observaciones: "",
  });

  // Cargar datos oficiales de pedidos_despachos
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
    staleTime: 1000 * 30,
  });

  // Sincronizar con Supabase en el montaje
  useEffect(() => {
    sincronizarDecisionesBodegaDesdeSupabase().then((data) => {
      if (data && Object.keys(data).length > 0) {
        setDecisiones(data);
      }
    });

    const handler = (e: any) => {
      if (e.detail) {
        setDecisiones((prev) => ({
          ...prev,
          [e.detail.documento]: e.detail,
        }));
      }
    };
    window.addEventListener("truccos_alistamiento_decision_updated", handler);
    return () => window.removeEventListener("truccos_alistamiento_decision_updated", handler);
  }, []);

  // Consolidar informe de bodega
  const { pedidos, todosLosPedidos, referenciasPicking, kpis, catalogos } = useMemo(() => {
    // Si el usuario no es admin y tiene asesores asignados, prefiltrar registros por seguridad
    let baseRegistros = registros;
    if (!esAdmin && asesorNombre) {
      const aNorm = asesorNombre.toLowerCase().trim();
      baseRegistros = registros.filter((r) => {
        if (!r.vendedor) return false;
        const vNorm = r.vendedor.toLowerCase().trim();
        return vNorm === aNorm || vNorm.includes(aNorm) || aNorm.includes(vNorm);
      });
    }

    return calcularInformeDespachosBodega(
      baseRegistros,
      {
        tipoDespacho: tipoDespachoFiltro as any,
        estadoAlistamiento: estadoAlistamientoFiltro as any,
        urgencia: urgenciaFiltro as any,
        ciudad: ciudadFiltro,
        vendedor: vendedorFiltro,
        correria: correriaFiltro,
        busqueda,
        ordenarPor,
      },
      decisiones
    );
  }, [
    registros,
    esAdmin,
    asesorNombre,
    tipoDespachoFiltro,
    estadoAlistamientoFiltro,
    urgenciaFiltro,
    ciudadFiltro,
    vendedorFiltro,
    correriaFiltro,
    busqueda,
    ordenarPor,
    decisiones,
  ]);

  const toggleExpand = (key: string) => {
    setExpandidos((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const expandirTodos = () => {
    const next: Record<string, boolean> = {};
    if (modoVista === "pedidos") {
      for (const p of pedidos) next[p.documento] = true;
    } else {
      for (const r of referenciasPicking) next[r.producto] = true;
    }
    setExpandidos(next);
  };

  const colapsarTodos = () => setExpandidos({});

  // Cambio rápido del estado de alistamiento directamente en la fila
  const cambiarEstadoAlistamientoRapido = async (
    p: GrupoPedidoClienteBodega,
    nuevoEstado: EstadoAlistamientoBodega
  ) => {
    const decExistente = decisiones[p.documento] || p.decision;
    const nuevaDecision: DecisionAlistamientoPedido = {
      ...decExistente,
      documento: p.documento,
      estadoAlistamiento: nuevoEstado,
      updatedAt: new Date().toISOString(),
    };

    setDecisiones((prev) => ({
      ...prev,
      [p.documento]: nuevaDecision,
    }));

    await guardarDecisionAlistamientoBodega(nuevaDecision);

    const etiqueta =
      ESTADOS_ALISTAMIENTO.find((e) => e.valor === nuevoEstado)?.etiqueta || nuevoEstado;
    toast.success(`Pedido ${p.documento}: ${etiqueta}`);
  };

  // Abrir modal de edición para empaque y transporte
  const abrirEdicionDespacho = (p: GrupoPedidoClienteBodega) => {
    const dec = decisiones[p.documento] || p.decision;
    setPedidoEnEdicion(p);
    setFormAlistamiento({
      estadoAlistamiento: dec.estadoAlistamiento || "pendiente",
      transportadora: dec.transportadora || "",
      numeroGuia: dec.numeroGuia || "",
      bultos: dec.bultos || 1,
      responsable: dec.responsable || "",
      observaciones: dec.observaciones || "",
    });
  };

  // Guardar desde modal
  const guardarEdicionModal = async () => {
    if (!pedidoEnEdicion) return;

    const nuevaDecision: DecisionAlistamientoPedido = {
      documento: pedidoEnEdicion.documento,
      estadoAlistamiento: formAlistamiento.estadoAlistamiento,
      transportadora: formAlistamiento.transportadora,
      numeroGuia: formAlistamiento.numeroGuia,
      bultos: Number(formAlistamiento.bultos) || 1,
      responsable: formAlistamiento.responsable,
      observaciones: formAlistamiento.observaciones,
      updatedAt: new Date().toISOString(),
    };

    setDecisiones((prev) => ({
      ...prev,
      [pedidoEnEdicion.documento]: nuevaDecision,
    }));

    await guardarDecisionAlistamientoBodega(nuevaDecision);
    toast.success(`Datos de despacho guardados para pedido ${pedidoEnEdicion.documento}`);
    setPedidoEnEdicion(null);
  };

  return (
    <div className={cn("space-y-6 pb-12 animate-in fade-in-50 duration-300", className)}>
      {/* ========================================================================= */}
      {/* 1. ENCABEZADO LOGÍSTICO DE BODEGA Y DESPACHOS */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-2xl border border-teal-500/25 bg-gradient-to-br from-teal-950/80 via-slate-900 to-slate-950 p-5 sm:p-6 text-white shadow-lg">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-400/30 text-xs font-bold tracking-wide">
              <Truck className="h-3.5 w-3.5 text-teal-400" />
              <span>Centro de Logística y Despachos • Área de Bodega</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white font-display flex items-center gap-2">
              <span>Despachos de Bodega: Pedidos con Inventario Disponible</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Consolida los pedidos de clientes y productos que tienen existencias físicas en bodega, listos para separar (picking), empacar y despachar a sus ciudades de destino.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="h-8 text-xs font-semibold bg-white/10 text-white border-white/20 hover:bg-white/20 cursor-pointer"
            >
              <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", isFetching && "animate-spin")} />
              <span>{isFetching ? "Actualizando..." : "Actualizar Stock"}</span>
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={() =>
                exportarPlanillaBodegaExcel(
                  pedidos,
                  referenciasPicking,
                  `Planilla_Despachos_Bodega_${new Date().toISOString().slice(0, 10)}.xlsx`
                )
              }
              className="h-8 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-xs gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Exportar Planilla Bodega (.xlsx)</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. TARJETAS DE KPIS LOGÍSTICOS Y OPERATIVOS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* KPI 1: Prendas Listas para Despacho */}
        <Card className="border-border/70 shadow-xs relative overflow-hidden bg-card/80 backdrop-blur-xs border-l-4 border-l-teal-500">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-bold uppercase tracking-wider">Prendas Listas</span>
              <PackageCheck className="h-4 w-4 text-teal-500" />
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-black font-display text-teal-600 dark:text-teal-400 mt-1">
              {kpis.totalPrendasDespachables.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
            <p className="font-medium text-foreground">Con inventario en bodega</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              de {kpis.totalPrendasPendientes.toLocaleString()} pendientes totales
            </p>
          </CardContent>
        </Card>

        {/* KPI 2: Pedidos con Stock */}
        <Card className="border-border/70 shadow-xs relative overflow-hidden bg-card/80 backdrop-blur-xs border-l-4 border-l-emerald-500">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-bold uppercase tracking-wider">Pedidos Surtibles</span>
              <Boxes className="h-4 w-4 text-emerald-500" />
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-black font-display text-emerald-600 dark:text-emerald-400 mt-1">
              {kpis.totalPedidosDespachables}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5 mt-0.5 font-semibold text-emerald-700 dark:text-emerald-300">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span>{kpis.pedidosCompletos} pedidos 100% completos</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 text-muted-foreground">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500 shrink-0" />
              <span>{kpis.pedidosParciales} pedidos parciales</span>
            </div>
          </CardContent>
        </Card>

        {/* KPI 3: Clientes Beneficiados */}
        <Card className="border-border/70 shadow-xs relative overflow-hidden bg-card/80 backdrop-blur-xs">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-bold uppercase tracking-wider">Clientes con Stock</span>
              <Users className="h-4 w-4 text-purple-500" />
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-black font-display text-foreground mt-1">
              {kpis.totalClientesBeneficiados}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
            <p className="font-medium text-purple-600 dark:text-purple-400">
              {kpis.totalReferenciasDistintas} referencias listas
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">En diferentes pasillos de bodega</p>
          </CardContent>
        </Card>

        {/* KPI 4: Despachos Vencidos / Prioridad Máxima */}
        <Card className="border-border/70 shadow-xs relative overflow-hidden bg-card/80 backdrop-blur-xs border-l-4 border-l-rose-500">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-bold uppercase tracking-wider">Vencidos con Stock</span>
              <AlertTriangle className="h-4 w-4 text-rose-500" />
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-black font-display text-rose-600 dark:text-rose-400 mt-1">
              {kpis.pedidosVencidosConStock}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
            <p className="font-medium text-rose-700 dark:text-rose-300">
              ¡Prioridad Máxima de Salida!
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              +{kpis.pedidosUrgentesConStock} vencen en ≤ 3 días
            </p>
          </CardContent>
        </Card>

        {/* KPI 5: Estado de Alistamiento en Bodega */}
        <Card className="border-border/70 shadow-xs relative overflow-hidden bg-card/80 backdrop-blur-xs col-span-2 md:col-span-1">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-bold uppercase tracking-wider">Cola de Alistamiento</span>
              <ClipboardList className="h-4 w-4 text-indigo-500" />
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-black font-display text-foreground mt-1">
              {kpis.pedidosPendientesPicking + kpis.pedidosEnPicking}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
            <p className="font-medium text-indigo-600 dark:text-indigo-400">
              {kpis.pedidosEmpacados} empacados • {kpis.pedidosListosDespacho} en muelle
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {kpis.pedidosDespachados} despachados recientemente
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* 3. BARRA DE PERSPECTIVAS Y FILTROS */}
      {/* ========================================================================= */}
      <Card className="border-border/70 shadow-xs bg-card/90">
        <CardHeader className="p-4 pb-3 border-b border-border/50">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            {/* Selector de Perspectiva (Por Pedido vs Por Referencia) */}
            <div className="flex items-center gap-1.5 p-1 bg-muted rounded-xl border border-border w-fit">
              <button
                type="button"
                onClick={() => setModoVista("pedidos")}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  modoVista === "pedidos"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <ShoppingBag className="h-3.5 w-3.5 text-teal-600" />
                <span>Por Pedido y Cliente ({pedidos.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setModoVista("picking")}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  modoVista === "picking"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <ClipboardList className="h-3.5 w-3.5 text-indigo-600" />
                <span>Lista Picking Pasillos ({referenciasPicking.length} Ref)</span>
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={expandirTodos}
                className="h-7 px-2 text-[11px] font-semibold"
              >
                Expandir Todo
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={colapsarTodos}
                className="h-7 px-2 text-[11px] font-semibold"
              >
                Colapsar Todo
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  exportarPlanillaPickingCSV(
                    referenciasPicking,
                    `Planilla_Picking_${new Date().toISOString().slice(0, 10)}.csv`
                  )
                }
                className="h-7 px-2 text-[11px] font-semibold gap-1 text-slate-700 dark:text-slate-300"
              >
                <Download className="h-3 w-3" />
                <span>CSV Picking</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-3">
          {/* Fila 1: Filtros */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* Buscador */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar pedido, cliente, NIT, ciudad, guía..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="h-8 pl-8 text-xs bg-background"
              />
              {busqueda && (
                <button
                  type="button"
                  onClick={() => setBusqueda("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Filtro por Tipo de Despacho */}
            <div>
              <Select value={tipoDespachoFiltro} onValueChange={setTipoDespachoFiltro}>
                <SelectTrigger className="h-8 text-xs bg-background">
                  <SelectValue placeholder="Tipo de Despacho" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los Tipos de Despacho</SelectItem>
                  <SelectItem value="completo">🟢 Solo Pedidos 100% Completos</SelectItem>
                  <SelectItem value="parcial">🟡 Solo Despachos Parciales</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Estado de Alistamiento */}
            <div>
              <Select
                value={estadoAlistamientoFiltro}
                onValueChange={setEstadoAlistamientoFiltro}
              >
                <SelectTrigger className="h-8 text-xs bg-background">
                  <SelectValue placeholder="Estado de Alistamiento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los Estados en Bodega</SelectItem>
                  {ESTADOS_ALISTAMIENTO.map((e) => (
                    <SelectItem key={e.valor} value={e.valor}>
                      {e.etiqueta}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Urgencia */}
            <div>
              <Select value={urgenciaFiltro} onValueChange={setUrgenciaFiltro}>
                <SelectTrigger className="h-8 text-xs bg-background">
                  <SelectValue placeholder="Semáforo de Entrega" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los Vencimientos</SelectItem>
                  <SelectItem value="vencidos">🔴 Ya Vencidos (Máxima Urgencia)</SelectItem>
                  <SelectItem value="urgentes">🟡 Vence en ≤ 3 días</SelectItem>
                  <SelectItem value="normales">🟢 Vigentes (&gt; 3 días)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Fila 2: Filtros geográficos y comerciales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* Filtro por Ciudad Destino */}
            <div>
              <Select value={ciudadFiltro} onValueChange={setCiudadFiltro}>
                <SelectTrigger className="h-8 text-xs bg-background truncate">
                  <SelectValue placeholder="Ciudad Destino (Ruta)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las Ciudades</SelectItem>
                  {catalogos.ciudades.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Asesor */}
            <div>
              <Select value={vendedorFiltro} onValueChange={setVendedorFiltro}>
                <SelectTrigger className="h-8 text-xs bg-background truncate">
                  <SelectValue placeholder="Asesor Comercial" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los Asesores</SelectItem>
                  {catalogos.vendedores.map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Correría */}
            <div>
              <Select value={correriaFiltro} onValueChange={setCorreriaFiltro}>
                <SelectTrigger className="h-8 text-xs bg-background">
                  <SelectValue placeholder="Correría / Colección" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las Correrías</SelectItem>
                  {catalogos.correrias.map((c) => (
                    <SelectItem key={c} value={c}>
                      Correría {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Ordenamiento */}
            <div>
              <Select value={ordenarPor} onValueChange={(v) => setOrdenarPor(v as any)}>
                <SelectTrigger className="h-8 text-xs bg-background">
                  <SelectValue placeholder="Ordenar lista por..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgencia_asc">Más Vencidos Primero (Urgencia)</SelectItem>
                  <SelectItem value="despachables_desc">Más Prendas a Despachar</SelectItem>
                  <SelectItem value="porcentaje_desc">Mayor % de Surtido</SelectItem>
                  <SelectItem value="ciudad_asc">Ciudad Destino (A-Z)</SelectItem>
                  <SelectItem value="cliente_asc">Cliente (A-Z)</SelectItem>
                  <SelectItem value="documento_asc">N° Documento Pedido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* 4. PERSPECTIVA A: TABLA DE PEDIDOS Y CLIENTES (EMPAQUE Y TRANSPORTE) */}
      {/* ========================================================================= */}
      {modoVista === "pedidos" && (
        <Card className="border-border/70 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/60 text-muted-foreground font-semibold uppercase text-[10px] tracking-wider select-none">
                  <th className="py-2.5 px-3 w-8 text-center"></th>
                  <th className="py-2.5 px-3">Documento & Cliente</th>
                  <th className="py-2.5 px-3">Ciudad Destino</th>
                  <th className="py-2.5 px-3">Asesor</th>
                  <th className="py-2.5 px-3">Vencimiento / Urgencia</th>
                  <th className="py-2.5 px-3 text-right">Listas Hoy</th>
                  <th className="py-2.5 px-3 text-right">Pendiente Total</th>
                  <th className="py-2.5 px-3 text-center">% Surtido</th>
                  <th className="py-2.5 px-3 text-center">Tipo</th>
                  <th className="py-2.5 px-3 min-w-[190px]">Estado Alistamiento</th>
                  <th className="py-2.5 px-3">Transportadora & Guía</th>
                  <th className="py-2.5 px-3 text-center w-20">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {pedidos.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <CheckCircle2 className="h-8 w-8 text-teal-500/70" />
                        <p className="text-sm font-semibold text-foreground">
                          No hay pedidos con inventario para despachar según los filtros aplicados
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pedidos.map((p) => {
                    const expandido = !!expandidos[p.documento];
                    const dec = p.decision;
                    const estadoInfo =
                      ESTADOS_ALISTAMIENTO.find((e) => e.valor === dec.estadoAlistamiento) ||
                      ESTADOS_ALISTAMIENTO[0];

                    return (
                      <React.Fragment key={p.documento}>
                        <tr
                          className={cn(
                            "transition-colors hover:bg-muted/40 font-medium",
                            expandido && "bg-muted/30 border-l-4 border-l-teal-500",
                            p.semaforoUrgencia === "vencido" &&
                              !expandido &&
                              "hover:bg-rose-500/5"
                          )}
                        >
                          {/* Expandir */}
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => toggleExpand(p.documento)}
                              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-transform"
                              title={expandido ? "Ocultar prendas" : "Ver prendas del pedido"}
                            >
                              {expandido ? (
                                <ChevronDown className="h-4 w-4 text-teal-600" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                          </td>

                          {/* Documento & Cliente */}
                          <td className="py-2.5 px-3">
                            <div className="flex flex-col">
                              <span className="font-bold text-foreground font-mono text-xs">
                                {p.documento}
                              </span>
                              <span className="font-semibold text-foreground truncate max-w-[200px]">
                                {p.nombre}
                              </span>
                              <span className="text-[10px] text-muted-foreground font-mono">
                                NIT: {p.tercero}
                              </span>
                            </div>
                          </td>

                          {/* Ciudad Destino */}
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1 text-foreground">
                              <MapPin className="h-3 w-3 text-teal-500 shrink-0" />
                              <span className="font-medium">{p.ciudad}</span>
                            </div>
                          </td>

                          {/* Asesor */}
                          <td className="py-2.5 px-3 text-muted-foreground">
                            {p.vendedor}
                          </td>

                          {/* Vencimiento / Urgencia */}
                          <td className="py-2.5 px-3">
                            <div className="flex flex-col">
                              {p.semaforoUrgencia === "vencido" ? (
                                <Badge
                                  variant="outline"
                                  className="text-[9.5px] bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 font-bold gap-1 w-fit"
                                >
                                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500" />
                                  <span>Vencido hace {Math.abs(p.diasParaVencer || 0)}d</span>
                                </Badge>
                              ) : p.semaforoUrgencia === "urgente" ? (
                                <Badge
                                  variant="outline"
                                  className="text-[9.5px] bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 font-bold gap-1 w-fit"
                                >
                                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" />
                                  <span>Vence en {p.diasParaVencer}d</span>
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-[9.5px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-semibold gap-1 w-fit"
                                >
                                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  <span>Vigente</span>
                                </Badge>
                              )}
                              <span className="text-[9.5px] font-mono text-muted-foreground mt-0.5">
                                Vence: {p.fechaVence || "Sin fecha"}
                              </span>
                            </div>
                          </td>

                          {/* Listas Hoy */}
                          <td className="py-2.5 px-3 text-right font-mono">
                            <span className="px-2 py-0.5 rounded font-black bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30">
                              {p.totalPrendasDespachables.toLocaleString()}
                            </span>
                          </td>

                          {/* Pendiente Total */}
                          <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">
                            {p.totalPrendasPendientes.toLocaleString()}
                          </td>

                          {/* % Surtido */}
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-[10px] font-mono font-bold">
                                {p.porcentajeSurtido}%
                              </span>
                              <Progress
                                value={p.porcentajeSurtido}
                                className="h-1.5 w-14 bg-muted"
                              />
                            </div>
                          </td>

                          {/* Tipo */}
                          <td className="py-2.5 px-3 text-center">
                            {p.tipoDespacho === "completo" ? (
                              <Badge
                                variant="outline"
                                className="text-[9px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-bold"
                              >
                                100% Completo
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-[9px] bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 font-semibold"
                              >
                                Parcial
                              </Badge>
                            )}
                          </td>

                          {/* Estado de Alistamiento (Selector directo) */}
                          <td className="py-2.5 px-3">
                            <Select
                              value={dec.estadoAlistamiento}
                              onValueChange={(val) =>
                                cambiarEstadoAlistamientoRapido(p, val as any)
                              }
                            >
                              <SelectTrigger className="h-7 text-xs bg-background border-border/80 font-medium">
                                <div className="flex items-center gap-1.5 truncate">
                                  <span
                                    className={cn(
                                      "w-2 h-2 rounded-full shrink-0",
                                      estadoInfo.dotColor
                                    )}
                                  />
                                  <span className="truncate">{estadoInfo.etiqueta}</span>
                                </div>
                              </SelectTrigger>
                              <SelectContent>
                                {ESTADOS_ALISTAMIENTO.map((e) => (
                                  <SelectItem key={e.valor} value={e.valor}>
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={cn("w-2 h-2 rounded-full", e.dotColor)}
                                      />
                                      <span>{e.etiqueta}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>

                          {/* Transportadora & Guía */}
                          <td className="py-2.5 px-3">
                            {dec.transportadora || dec.numeroGuia ? (
                              <div className="flex flex-col text-[11px]">
                                <span className="font-semibold text-foreground truncate max-w-[140px]">
                                  {dec.transportadora || "Sin transportadora"}
                                </span>
                                {dec.numeroGuia && (
                                  <span className="font-mono text-[10px] text-muted-foreground">
                                    Guía: {dec.numeroGuia}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-[10px] italic">
                                Por asignar
                              </span>
                            )}
                          </td>

                          {/* Acción Gestionar */}
                          <td className="py-2.5 px-3 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => abrirEdicionDespacho(p)}
                              className="h-7 px-2 text-xs font-semibold text-teal-600 hover:text-teal-700 hover:bg-teal-50 dark:hover:bg-teal-950/40 cursor-pointer"
                            >
                              Despachar
                            </Button>
                          </td>
                        </tr>

                        {/* Fila expandida con las prendas del pedido */}
                        {expandido && (
                          <tr className="bg-muted/15 border-b border-border/80">
                            <td colSpan={12} className="p-4 pl-10 pr-6 space-y-2">
                              <div className="flex items-center justify-between pb-1">
                                <span className="text-xs font-bold text-foreground">
                                  📦 Prendas del Pedido {p.documento} ({p.items.length} líneas)
                                </span>
                                {dec.observaciones && (
                                  <span className="text-[11px] text-muted-foreground italic">
                                    Nota: "{dec.observaciones}"
                                  </span>
                                )}
                              </div>

                              <div className="overflow-x-auto rounded-lg border border-border bg-card">
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead>
                                    <tr className="bg-muted/70 text-muted-foreground text-[10px] uppercase font-bold tracking-wider border-b border-border">
                                      <th className="py-2 px-3">Referencia</th>
                                      <th className="py-2 px-3">Descripción</th>
                                      <th className="py-2 px-3">Talla</th>
                                      <th className="py-2 px-3">Color</th>
                                      <th className="py-2 px-3 text-right">A Despachar Hoy</th>
                                      <th className="py-2 px-3 text-right">Saldo Pedido</th>
                                      <th className="py-2 px-3 text-right">Stock en Bodega</th>
                                      <th className="py-2 px-3 text-center">Estado Ítem</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border/60">
                                    {p.items.map((it, itIdx) => (
                                      <tr key={`${it.id}_${itIdx}`} className="hover:bg-muted/30">
                                        <td className="py-1.5 px-3 font-mono font-bold text-foreground">
                                          {it.producto}
                                        </td>
                                        <td className="py-1.5 px-3 text-muted-foreground">
                                          {it.descripcion}
                                        </td>
                                        <td className="py-1.5 px-3 font-mono font-semibold">
                                          {it.talla}
                                        </td>
                                        <td className="py-1.5 px-3 font-medium text-foreground">
                                          {it.color}
                                        </td>
                                        <td className="py-1.5 px-3 text-right font-mono font-black text-teal-600 dark:text-teal-400">
                                          {it.unidadesDespachables}
                                        </td>
                                        <td className="py-1.5 px-3 text-right font-mono text-muted-foreground">
                                          {it.saldoPedido}
                                        </td>
                                        <td className="py-1.5 px-3 text-right font-mono">
                                          {it.saldoInv}
                                        </td>
                                        <td className="py-1.5 px-3 text-center">
                                          {it.esCompleto ? (
                                            <Badge
                                              variant="outline"
                                              className="text-[9px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                            >
                                              Completo
                                            </Badge>
                                          ) : (
                                            <Badge
                                              variant="outline"
                                              className="text-[9px] bg-amber-500/10 text-amber-600 border-amber-500/20"
                                            >
                                              Parcial (Faltan {it.unidadesFaltantes})
                                            </Badge>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 5. PERSPECTIVA B: LISTA MAESTRA DE PICKING POR REFERENCIA (PASILLOS) */}
      {/* ========================================================================= */}
      {modoVista === "picking" && (
        <Card className="border-border/70 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/60 text-muted-foreground font-semibold uppercase text-[10px] tracking-wider select-none">
                  <th className="py-2.5 px-3 w-8 text-center"></th>
                  <th className="py-2.5 px-3">Referencia & Descripción</th>
                  <th className="py-2.5 px-3">Correría</th>
                  <th className="py-2.5 px-3 text-right">Prendas a Extraer (Picking)</th>
                  <th className="py-2.5 px-3 text-right">Stock Total en Bodega</th>
                  <th className="py-2.5 px-3 text-right">Demanda Pedida</th>
                  <th className="py-2.5 px-3 text-center">Pedidos a Surtir</th>
                  <th className="py-2.5 px-3 text-center">Clientes</th>
                  <th className="py-2.5 px-3">Ciudades Destino</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {referenciasPicking.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-muted-foreground">
                      No hay referencias para picking
                    </td>
                  </tr>
                ) : (
                  referenciasPicking.map((r) => {
                    const expandido = !!expandidos[r.producto];
                    return (
                      <React.Fragment key={r.producto}>
                        <tr className="hover:bg-muted/40 font-medium">
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => toggleExpand(r.producto)}
                              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                              {expandido ? (
                                <ChevronDown className="h-4 w-4 text-indigo-600" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex flex-col">
                              <span className="font-bold text-foreground font-mono">
                                {r.producto}
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                {r.descripcion}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <Badge variant="outline" className="text-[10px]">
                              {r.correriaPrincipal}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-black text-teal-600 dark:text-teal-400 text-sm">
                            {r.totalDespachable.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold">
                            {r.totalSaldoInv.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">
                            {r.totalSaldoPedido.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold">
                            {r.pedidosCount}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono">
                            {r.clientesCount}
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground text-[11px] truncate max-w-[200px]">
                            {r.ciudades.slice(0, 3).join(", ")}
                            {r.ciudades.length > 3 && ` +${r.ciudades.length - 3}`}
                          </td>
                        </tr>

                        {expandido && (
                          <tr className="bg-muted/15 border-b border-border/80">
                            <td colSpan={9} className="p-4 pl-10 pr-6 space-y-2">
                              <span className="text-xs font-bold text-foreground">
                                ✂️ Curva de Tallas y Colores a Extraer para {r.producto}
                              </span>
                              <div className="overflow-x-auto rounded-lg border border-border bg-card">
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead>
                                    <tr className="bg-muted/70 text-muted-foreground text-[10px] uppercase font-bold tracking-wider border-b border-border">
                                      <th className="py-2 px-3">Talla</th>
                                      <th className="py-2 px-3">Color</th>
                                      <th className="py-2 px-3 text-right">Cantidad a Sacar (Picking)</th>
                                      <th className="py-2 px-3 text-right">Inventario en Bodega</th>
                                      <th className="py-2 px-3 text-right">Pedido por Clientes</th>
                                      <th className="py-2 px-3 text-center">Pedidos que la esperan</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border/60">
                                    {r.curva.map((c, cIdx) => (
                                      <tr key={`${c.talla}_${c.color}_${cIdx}`} className="hover:bg-muted/30">
                                        <td className="py-1.5 px-3 font-mono font-bold">
                                          {c.talla}
                                        </td>
                                        <td className="py-1.5 px-3 font-medium text-foreground">
                                          {c.color}
                                        </td>
                                        <td className="py-1.5 px-3 text-right font-mono font-black text-teal-600 dark:text-teal-400">
                                          {c.unidadesDespachables}
                                        </td>
                                        <td className="py-1.5 px-3 text-right font-mono">
                                          {c.saldoInv}
                                        </td>
                                        <td className="py-1.5 px-3 text-right font-mono text-muted-foreground">
                                          {c.saldoPedido}
                                        </td>
                                        <td className="py-1.5 px-3 text-center font-mono">
                                          {c.pedidosCount}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 6. MODAL DE GESTIÓN LOGÍSTICA DE DESPACHO */}
      {/* ========================================================================= */}
      <Dialog
        open={!!pedidoEnEdicion}
        onOpenChange={(open) => !open && setPedidoEnEdicion(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2 text-teal-600">
              <Truck className="h-5 w-5" />
              <DialogTitle className="text-base sm:text-lg font-bold">
                Gestión de Despacho • Pedido {pedidoEnEdicion?.documento}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Cliente: <strong>{pedidoEnEdicion?.nombre}</strong> • Ciudad:{" "}
              <strong>{pedidoEnEdicion?.ciudad}</strong> • Unidades a despachar:{" "}
              <strong className="text-teal-600 font-mono">
                {pedidoEnEdicion?.totalPrendasDespachables} prendas
              </strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Estado de Alistamiento */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">
                Estado del Pedido en Bodega
              </label>
              <Select
                value={formAlistamiento.estadoAlistamiento}
                onValueChange={(val) =>
                  setFormAlistamiento((prev) => ({
                    ...prev,
                    estadoAlistamiento: val as EstadoAlistamientoBodega,
                  }))
                }
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  {ESTADOS_ALISTAMIENTO.map((e) => (
                    <SelectItem key={e.valor} value={e.valor}>
                      <div className="flex flex-col text-left py-0.5">
                        <span className="font-semibold">{e.etiqueta}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {e.descripcion}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Transportadora */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">
                Empresa Transportadora
              </label>
              <Input
                placeholder="ej. Coordinadora, Envía, Servientrega..."
                value={formAlistamiento.transportadora}
                onChange={(e) =>
                  setFormAlistamiento((prev) => ({
                    ...prev,
                    transportadora: e.target.value,
                  }))
                }
                className="h-9 text-xs"
              />
              <div className="flex flex-wrap gap-1 mt-1">
                {TRANSPORTADORAS_FRECUENTES.slice(0, 4).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() =>
                      setFormAlistamiento((prev) => ({ ...prev, transportadora: t }))
                    }
                    className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground cursor-pointer font-medium"
                  >
                    {t.split(" ")[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Guía y Bultos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  Número de Guía / Remisión
                </label>
                <Input
                  placeholder="ej. GUIA-987654321"
                  value={formAlistamiento.numeroGuia}
                  onChange={(e) =>
                    setFormAlistamiento((prev) => ({
                      ...prev,
                      numeroGuia: e.target.value,
                    }))
                  }
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  Cantidad de Bultos / Cajas
                </label>
                <Input
                  type="number"
                  min="1"
                  value={formAlistamiento.bultos}
                  onChange={(e) =>
                    setFormAlistamiento((prev) => ({
                      ...prev,
                      bultos: Math.max(1, parseInt(e.target.value, 10) || 1),
                    }))
                  }
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            {/* Responsable de Bodega */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">
                Responsable de Alistamiento / Empacador
              </label>
              <Input
                placeholder="Nombre del operario que realizó el picking/packing"
                value={formAlistamiento.responsable}
                onChange={(e) =>
                  setFormAlistamiento((prev) => ({
                    ...prev,
                    responsable: e.target.value,
                  }))
                }
                className="h-9 text-xs"
              />
            </div>

            {/* Observaciones Logísticas */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">
                Observaciones de Despacho
              </label>
              <Textarea
                placeholder="Instrucciones para la transportadora, datos de recepción en destino..."
                value={formAlistamiento.observaciones}
                onChange={(e) =>
                  setFormAlistamiento((prev) => ({
                    ...prev,
                    observaciones: e.target.value,
                  }))
                }
                rows={2}
                className="text-xs resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPedidoEnEdicion(null)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={guardarEdicionModal}
              className="text-xs bg-teal-600 hover:bg-teal-700 text-white font-semibold"
            >
              Guardar Estado Despacho
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
