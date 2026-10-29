"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Factory,
  Scissors,
  Package,
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
  obtenerMetadataPedidosDespachosAsync,
  EVENT_PEDIDOS_DESPACHOS_UPDATED,
  type RegistroPedidosDespachosHGI,
} from "@/lib/pedidos-despachos-storage";
import {
  calcularInformeProgramacionProduccion,
  obtenerDecisionesProgramacionLocales,
  guardarDecisionProgramacion,
  sincronizarDecisionesDesdeSupabase,
  exportarInformeProduccionExcel,
  exportarPlanDeCorteCSV,
  type ItemReferenciaDeficit,
  type ProgramacionItemDecision,
  type EstadoViabilidadProduccion,
  type PrioridadProduccion,
  type FiltrosProgramacionProduccion,
} from "@/lib/programacion-produccion";
import { CORRERIAS_OFICIALES } from "@/lib/correrias-config";

interface InformeProgramacionProduccionProps {
  esAdmin: boolean;
  onVolverInicio?: () => void;
  className?: string;
}

const ESTADOS_VIABILIDAD: Array<{
  valor: EstadoViabilidadProduccion;
  etiqueta: string;
  badgeClass: string;
  dotColor: string;
  descripcion: string;
}> = [
  {
    valor: "pendiente",
    etiqueta: "Pendiente de Análisis",
    badgeClass: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30",
    dotColor: "bg-slate-400",
    descripcion: "Por evaluar por el equipo de producción",
  },
  {
    valor: "viable",
    etiqueta: "Viable - Reprogramar",
    badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    dotColor: "bg-emerald-500",
    descripcion: "Aprobada para corte y confección",
  },
  {
    valor: "en_revision",
    etiqueta: "En Revisión de Insumos",
    badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
    dotColor: "bg-amber-500",
    descripcion: "Validando tela, hilos, moldes o lavandería",
  },
  {
    valor: "en_taller",
    etiqueta: "En Confección / Taller",
    badgeClass: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
    dotColor: "bg-indigo-500",
    descripcion: "En proceso físico de manufactura",
  },
  {
    valor: "no_viable",
    etiqueta: "No Viable - Agotar / Cancelar",
    badgeClass: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
    dotColor: "bg-rose-500",
    descripcion: "No se volverá a confeccionar, saldo se cancelará",
  },
  {
    valor: "completado",
    etiqueta: "Completado / Entregado",
    badgeClass: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
    dotColor: "bg-blue-500",
    descripcion: "Producción finalizada y transferida a bodega",
  },
];

export function InformeProgramacionProduccion({
  esAdmin,
  onVolverInicio,
  className,
}: InformeProgramacionProduccionProps) {
  // Estado de decisiones cargadas
  const [decisiones, setDecisiones] = useState<Record<string, ProgramacionItemDecision>>(() =>
    obtenerDecisionesProgramacionLocales()
  );

  // Filtros de visualización
  const [correriaFiltro, setCorreriaFiltro] = useState<string>("todas");
  const [estadoViabilidadFiltro, setEstadoViabilidadFiltro] = useState<string>("todos");
  const [estadoStockFiltro, setEstadoStockFiltro] = useState<string>("todos");
  const [urgenciaFiltro, setUrgenciaFiltro] = useState<string>("todos");
  const [umbralDeficitFiltro, setUmbralDeficitFiltro] = useState<number>(0);
  const [vendedorFiltro, setVendedorFiltro] = useState<string>("todos");
  const [busqueda, setBusqueda] = useState<string>("");
  const [ordenarPor, setOrdenarPor] = useState<FiltrosProgramacionProduccion["ordenarPor"]>("deficit_desc");

  // Estado de filas expandidas
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({});

  // Subpestaña activa dentro de la fila expandida: "curva" o "pedidos"
  const [subTabExpandida, setSubTabExpandida] = useState<Record<string, "curva" | "pedidos">>({});

  // Modal de edición técnica de programación
  const [itemEnEdicion, setItemEnEdicion] = useState<ItemReferenciaDeficit | null>(null);
  const [decisionForm, setDecisionForm] = useState<{
    estadoViabilidad: EstadoViabilidadProduccion;
    unidadesProgramadas: number;
    fechaEstimadaEntrega: string;
    taller: string;
    prioridad: PrioridadProduccion;
    observaciones: string;
  }>({
    estadoViabilidad: "pendiente",
    unidadesProgramadas: 0,
    fechaEstimadaEntrega: "",
    taller: "",
    prioridad: "media",
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

  // Sincronizar decisiones desde Supabase en el montaje
  useEffect(() => {
    sincronizarDecisionesDesdeSupabase().then((data) => {
      if (data && Object.keys(data).length > 0) {
        setDecisiones(data);
      }
    });

    const handler = (e: any) => {
      if (e.detail) {
        setDecisiones((prev) => ({
          ...prev,
          [e.detail.producto]: e.detail,
        }));
      }
    };
    window.addEventListener("truccos_programacion_decision_updated", handler);
    return () => window.removeEventListener("truccos_programacion_decision_updated", handler);
  }, []);

  // Recalcular informe completo con memorización
  const { items, todosLosDeficitItems, kpis, catalogos } = useMemo(() => {
    return calcularInformeProgramacionProduccion(
      registros,
      {
        correria: correriaFiltro,
        estadoViabilidad: estadoViabilidadFiltro as any,
        estadoStock: estadoStockFiltro as any,
        urgencia: urgenciaFiltro as any,
        umbralDeficitMinimo: umbralDeficitFiltro,
        vendedor: vendedorFiltro,
        busqueda,
        ordenarPor,
      },
      decisiones
    );
  }, [
    registros,
    correriaFiltro,
    estadoViabilidadFiltro,
    estadoStockFiltro,
    urgenciaFiltro,
    umbralDeficitFiltro,
    vendedorFiltro,
    busqueda,
    ordenarPor,
    decisiones,
  ]);

  // Manejador para alternar expansión de fila
  const toggleExpand = (refCode: string) => {
    setExpandidos((prev) => ({ ...prev, [refCode]: !prev[refCode] }));
    if (!subTabExpandida[refCode]) {
      setSubTabExpandida((prev) => ({ ...prev, [refCode]: "curva" }));
    }
  };

  const expandirTodos = () => {
    const next: Record<string, boolean> = {};
    for (const it of items) {
      next[it.producto] = true;
    }
    setExpandidos(next);
  };

  const colapsarTodos = () => {
    setExpandidos({});
  };

  // Cambio rápido del estado de viabilidad directamente en la fila
  const cambiarEstadoViabilidadRapido = async (
    item: ItemReferenciaDeficit,
    nuevoEstado: EstadoViabilidadProduccion
  ) => {
    const decExistente = decisiones[item.producto] || item.decision;
    const nuevaDecision: ProgramacionItemDecision = {
      ...decExistente,
      producto: item.producto,
      estadoViabilidad: nuevoEstado,
      unidadesProgramadas:
        decExistente.unidadesProgramadas > 0 ? decExistente.unidadesProgramadas : item.deficit,
      updatedAt: new Date().toISOString(),
    };

    setDecisiones((prev) => ({
      ...prev,
      [item.producto]: nuevaDecision,
    }));

    await guardarDecisionProgramacion(nuevaDecision);

    const etiqueta =
      ESTADOS_VIABILIDAD.find((e) => e.valor === nuevoEstado)?.etiqueta || nuevoEstado;
    toast.success(`Referencia ${item.producto}: ${etiqueta}`);
  };

  // Abrir modal de edición técnica
  const abrirEdicion = (item: ItemReferenciaDeficit) => {
    const dec = decisiones[item.producto] || item.decision;
    setItemEnEdicion(item);
    setDecisionForm({
      estadoViabilidad: dec.estadoViabilidad || "pendiente",
      unidadesProgramadas: dec.unidadesProgramadas || item.deficit,
      fechaEstimadaEntrega: dec.fechaEstimadaEntrega || "",
      taller: dec.taller || "",
      prioridad: dec.prioridad || (item.semaforoUrgencia === "vencido" ? "alta" : "media"),
      observaciones: dec.observaciones || "",
    });
  };

  // Guardar desde modal
  const guardarEdicionModal = async () => {
    if (!itemEnEdicion) return;

    const nuevaDecision: ProgramacionItemDecision = {
      producto: itemEnEdicion.producto,
      estadoViabilidad: decisionForm.estadoViabilidad,
      unidadesProgramadas: Number(decisionForm.unidadesProgramadas) || itemEnEdicion.deficit,
      fechaEstimadaEntrega: decisionForm.fechaEstimadaEntrega,
      taller: decisionForm.taller,
      prioridad: decisionForm.prioridad,
      observaciones: decisionForm.observaciones,
      actualizadoPor: "Administrador",
      updatedAt: new Date().toISOString(),
    };

    setDecisiones((prev) => ({
      ...prev,
      [itemEnEdicion.producto]: nuevaDecision,
    }));

    await guardarDecisionProgramacion(nuevaDecision);
    toast.success(`Programación guardada para referencia ${itemEnEdicion.producto}`);
    setItemEnEdicion(null);
  };

  // Control de Acceso Estricto
  if (!esAdmin) {
    return (
      <div className="p-8 text-center max-w-xl mx-auto space-y-4 animate-in fade-in">
        <div className="mx-auto w-12 h-12 rounded-full bg-rose-500/15 text-rose-600 flex items-center justify-center border border-rose-500/30">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-foreground font-display">
          Acceso Exclusivo para Administrador
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          El informe de Programación de Producción y Re-programación de Referencias con Déficit es una herramienta técnica y estratégica reservada únicamente para la Dirección y Administración del sistema.
        </p>
        {onVolverInicio && (
          <Button onClick={onVolverInicio} variant="outline" className="mt-2">
            Volver a Dashboards Principales
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-6 pb-12 animate-in fade-in-50 duration-300", className)}>
      {/* ========================================================================= */}
      {/* 1. ENCABEZADO PRINCIPAL DE PROGRAMACIÓN DE PRODUCCIÓN */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-500/25 bg-gradient-to-br from-indigo-950/80 via-slate-900 to-slate-950 p-5 sm:p-6 text-white shadow-lg">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-xs font-bold tracking-wide">
              <Factory className="h-3.5 w-3.5 text-indigo-400" />
              <span>Módulo Exclusivo de Administración • Área de Producción</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white font-display flex items-center gap-2">
              <span>Programación de Producción: Referencias con Pedido sin Inventario</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Herramienta técnica para que el área de confección y producción evalúe la viabilidad de reprogramar y cortar referencias agotadas o con existencias insuficientes para cumplir los pedidos de clientes.
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
              <span>{isFetching ? "Actualizando..." : "Actualizar Datos"}</span>
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={() =>
                exportarInformeProduccionExcel(
                  items,
                  kpis,
                  `Informe_Programacion_Produccion_${new Date().toISOString().slice(0, 10)}.xlsx`
                )
              }
              className="h-8 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Exportar Excel Producción</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. TARJETAS DE KPIS TÉCNICOS Y EJECUTIVOS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* KPI 1: Referencias en Déficit */}
        <Card className="border-border/70 shadow-xs relative overflow-hidden bg-card/80 backdrop-blur-xs">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-bold uppercase tracking-wider">Ref. en Déficit</span>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-black font-display text-foreground mt-1">
              {kpis.totalReferenciasEnDeficit}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5 mt-1 font-medium">
              <span className="inline-block w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              <span>{kpis.referenciasSinStock} con stock cero (0)</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 font-medium">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500 shrink-0" />
              <span>{kpis.referenciasStockInsuficiente} con stock insuficiente</span>
            </div>
          </CardContent>
        </Card>

        {/* KPI 2: Prendas Faltantes a Fabricar (Déficit) */}
        <Card className="border-border/70 shadow-xs relative overflow-hidden bg-card/80 backdrop-blur-xs border-l-4 border-l-rose-500">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-bold uppercase tracking-wider">Prendas a Cortar</span>
              <Scissors className="h-4 w-4 text-rose-500" />
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-black font-display text-rose-600 dark:text-rose-400 mt-1">
              {kpis.totalPrendasDeficit.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
            <p className="font-medium text-foreground">Déficit neto a producir</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Demanda: {kpis.totalSaldoPedido.toLocaleString()} | Bodega: {kpis.totalSaldoInv.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        {/* KPI 3: Clientes y Pedidos Afectados */}
        <Card className="border-border/70 shadow-xs relative overflow-hidden bg-card/80 backdrop-blur-xs">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-bold uppercase tracking-wider">Clientes Retenidos</span>
              <Users className="h-4 w-4 text-purple-500" />
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-black font-display text-foreground mt-1">
              {kpis.totalClientesAfectados}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
            <p className="font-medium text-purple-600 dark:text-purple-400">
              {kpis.totalPedidosAfectados} pedidos de clientes
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Esperando existencias en bodega</p>
          </CardContent>
        </Card>

        {/* KPI 4: Semáforo de Urgencia (Vencidos) */}
        <Card className="border-border/70 shadow-xs relative overflow-hidden bg-card/80 backdrop-blur-xs border-l-4 border-l-amber-500">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-bold uppercase tracking-wider">Vencidos / Urgentes</span>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-black font-display text-amber-600 dark:text-amber-400 mt-1">
              {kpis.referenciasVencidas}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
            <p className="font-medium text-amber-700 dark:text-amber-300">
              {kpis.referenciasUrgentes} por vencer en ≤ 15 días
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Prioridad alta de programación</p>
          </CardContent>
        </Card>

        {/* KPI 5: Viabilidad Aprobada para Producción */}
        <Card className="border-border/70 shadow-xs relative overflow-hidden bg-card/80 backdrop-blur-xs border-l-4 border-l-emerald-500 col-span-2 md:col-span-1">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-bold uppercase tracking-wider">Aprobadas Viables</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-black font-display text-emerald-600 dark:text-emerald-400 mt-1">
              {kpis.referenciasViables}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
            <p className="font-medium text-emerald-700 dark:text-emerald-300">
              {kpis.prendasProgramadasViables.toLocaleString()} uds autorizadas
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {kpis.referenciasPendientes} pendientes de evaluar
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* 3. BARRA DE FILTROS Y CONTROLES TÉCNICOS */}
      {/* ========================================================================= */}
      <Card className="border-border/70 shadow-xs bg-card/90">
        <CardHeader className="p-4 pb-3 border-b border-border/50">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-indigo-500" />
              <CardTitle className="text-sm font-bold tracking-tight">
                Filtros de Análisis y Programación de Taller
              </CardTitle>
              <Badge variant="outline" className="text-[10px] font-mono">
                {items.length} de {todosLosDeficitItems.length} Referencias Mostradas
              </Badge>
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
                  exportarPlanDeCorteCSV(
                    items,
                    `Plan_Corte_${new Date().toISOString().slice(0, 10)}.csv`
                  )
                }
                className="h-7 px-2 text-[11px] font-semibold gap-1 text-slate-700 dark:text-slate-300"
              >
                <Download className="h-3 w-3" />
                <span>Plano CSV Corte</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-3">
          {/* Fila 1: Filtros principales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* Buscador */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por referencia, prenda, color..."
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

            {/* Filtro por Correría */}
            <div>
              <Select value={correriaFiltro} onValueChange={setCorreriaFiltro}>
                <SelectTrigger className="h-8 text-xs bg-background">
                  <SelectValue placeholder="Correría / Colección" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las Correrías</SelectItem>
                  {CORRERIAS_OFICIALES.map((c) => (
                    <SelectItem key={c.clave} value={c.clave}>
                      {c.nombre} ({c.rangoTexto})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Estado de Viabilidad */}
            <div>
              <Select
                value={estadoViabilidadFiltro}
                onValueChange={setEstadoViabilidadFiltro}
              >
                <SelectTrigger className="h-8 text-xs bg-background">
                  <SelectValue placeholder="Estado de Viabilidad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los Estados de Viabilidad</SelectItem>
                  {ESTADOS_VIABILIDAD.map((e) => (
                    <SelectItem key={e.valor} value={e.valor}>
                      {e.etiqueta}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Estado de Stock */}
            <div>
              <Select value={estadoStockFiltro} onValueChange={setEstadoStockFiltro}>
                <SelectTrigger className="h-8 text-xs bg-background">
                  <SelectValue placeholder="Estado del Inventario" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Cualquier Déficit de Inventario</SelectItem>
                  <SelectItem value="sin_stock">🔴 Solo Sin Stock (0 en bodega)</SelectItem>
                  <SelectItem value="insuficiente">🟡 Stock Insuficiente (&lt; Pedido)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Fila 2: Filtros secundarios */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* Filtro por Urgencia */}
            <div>
              <Select value={urgenciaFiltro} onValueChange={setUrgenciaFiltro}>
                <SelectTrigger className="h-8 text-xs bg-background">
                  <SelectValue placeholder="Semáforo de Entrega" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los Vencimientos</SelectItem>
                  <SelectItem value="vencidos">🔴 Pedidos Ya Vencidos</SelectItem>
                  <SelectItem value="urgentes">🟡 Próximos a Vencer (≤ 15 días)</SelectItem>
                  <SelectItem value="normales">🟢 Vigentes (&gt; 15 días)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Umbral Mínimo de Déficit */}
            <div>
              <Select
                value={String(umbralDeficitFiltro)}
                onValueChange={(v) => setUmbralDeficitFiltro(Number(v))}
              >
                <SelectTrigger className="h-8 text-xs bg-background">
                  <SelectValue placeholder="Umbral Mínimo de Déficit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Cualquier cantidad de déficit</SelectItem>
                  <SelectItem value="10">Déficit ≥ 10 unidades</SelectItem>
                  <SelectItem value="25">Déficit ≥ 25 unidades</SelectItem>
                  <SelectItem value="50">Déficit ≥ 50 unidades (Lote corte)</SelectItem>
                  <SelectItem value="100">Déficit ≥ 100 unidades (Gran lote)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Ordenamiento */}
            <div>
              <Select
                value={ordenarPor}
                onValueChange={(v) => setOrdenarPor(v as any)}
              >
                <SelectTrigger className="h-8 text-xs bg-background">
                  <SelectValue placeholder="Ordenar por..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deficit_desc">Mayor Déficit a Menor</SelectItem>
                  <SelectItem value="vence_asc">Fecha Vencimiento Más Próxima</SelectItem>
                  <SelectItem value="pedidos_desc">Más Pedidos Afectados</SelectItem>
                  <SelectItem value="clientes_desc">Más Clientes Retenidos</SelectItem>
                  <SelectItem value="producto_asc">Referencia (A-Z)</SelectItem>
                  <SelectItem value="prioridad_desc">Mayor Prioridad</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Vendedor */}
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
          </div>
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* 4. TABLA PRINCIPAL DE REFERENCIAS A PROGRAMAR */}
      {/* ========================================================================= */}
      <Card className="border-border/70 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/60 text-muted-foreground font-semibold uppercase text-[10px] tracking-wider select-none">
                <th className="py-2.5 px-3 w-8 text-center"></th>
                <th className="py-2.5 px-3">Referencia & Descripción</th>
                <th className="py-2.5 px-3">Correría</th>
                <th className="py-2.5 px-3">Urgencia Entrega</th>
                <th className="py-2.5 px-3 text-right">Saldo Pedido</th>
                <th className="py-2.5 px-3 text-right">Saldo Inv</th>
                <th className="py-2.5 px-3 text-right">Déficit a Producir</th>
                <th className="py-2.5 px-3 text-center">Cobertura</th>
                <th className="py-2.5 px-3 text-center">Clientes / Pedidos</th>
                <th className="py-2.5 px-3 min-w-[200px]">Estado de Viabilidad</th>
                <th className="py-2.5 px-3 text-right">Uds Programadas</th>
                <th className="py-2.5 px-3 text-center w-20">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <CheckCircle2 className="h-8 w-8 text-emerald-500/70" />
                      <p className="text-sm font-semibold text-foreground">
                        No se encontraron referencias con déficit según los filtros aplicados
                      </p>
                      <p className="text-xs text-muted-foreground max-w-md">
                        Todos los pedidos pendientes están cubiertos por inventario disponible o coinciden con otros criterios de búsqueda.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const expandido = !!expandidos[item.producto];
                  const dec = item.decision;
                  const estadoInfo =
                    ESTADOS_VIABILIDAD.find((e) => e.valor === dec.estadoViabilidad) ||
                    ESTADOS_VIABILIDAD[0];

                  return (
                    <React.Fragment key={item.producto}>
                      <tr
                        className={cn(
                          "transition-colors hover:bg-muted/40 font-medium",
                          expandido && "bg-muted/30 border-l-4 border-l-indigo-500",
                          item.semaforoUrgencia === "vencido" &&
                            !expandido &&
                            "hover:bg-rose-500/5"
                        )}
                      >
                        {/* Botón expandir */}
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => toggleExpand(item.producto)}
                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-transform"
                            title={expandido ? "Ocultar curva y clientes" : "Ver curva técnica y pedidos"}
                          >
                            {expandido ? (
                              <ChevronDown className="h-4 w-4 text-indigo-600" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                        </td>

                        {/* Referencia y Descripción */}
                        <td className="py-2.5 px-3">
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground font-mono text-xs">
                              {item.producto}
                            </span>
                            <span className="text-[11px] text-muted-foreground line-clamp-1 max-w-[220px]">
                              {item.descripcion}
                            </span>
                          </div>
                        </td>

                        {/* Correría */}
                        <td className="py-2.5 px-3">
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-slate-500/5 font-semibold text-slate-700 dark:text-slate-300 border-slate-500/30"
                          >
                            {item.correriaPrincipal}
                          </Badge>
                        </td>

                        {/* Urgencia / Vence */}
                        <td className="py-2.5 px-3">
                          <div className="flex flex-col">
                            {item.semaforoUrgencia === "vencido" ? (
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 font-bold gap-1 w-fit"
                              >
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500" />
                                <span>Vencido ({Math.abs(item.diasParaVencerMin || 0)}d)</span>
                              </Badge>
                            ) : item.semaforoUrgencia === "urgente" ? (
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 font-bold gap-1 w-fit"
                              >
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" />
                                <span>Vence en {item.diasParaVencerMin}d</span>
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-semibold gap-1 w-fit"
                              >
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span>Vigente</span>
                              </Badge>
                            )}
                            <span className="text-[9.5px] font-mono text-muted-foreground mt-0.5">
                              {item.fechaVenceMin || "Sin fecha"}
                            </span>
                          </div>
                        </td>

                        {/* Saldo Pedido */}
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-foreground">
                          {item.saldoPedido.toLocaleString()}
                        </td>

                        {/* Saldo Inv */}
                        <td className="py-2.5 px-3 text-right font-mono">
                          <span
                            className={cn(
                              "font-semibold",
                              item.saldoInv <= 0
                                ? "text-rose-600 dark:text-rose-400"
                                : "text-amber-600 dark:text-amber-400"
                            )}
                          >
                            {item.saldoInv.toLocaleString()}
                          </span>
                        </td>

                        {/* Déficit a Producir */}
                        <td className="py-2.5 px-3 text-right font-mono">
                          <span className="px-2 py-0.5 rounded font-black bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                            {item.deficit.toLocaleString()}
                          </span>
                        </td>

                        {/* Cobertura */}
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-[10px] font-mono font-bold">
                              {item.coberturaPct}%
                            </span>
                            <Progress
                              value={item.coberturaPct}
                              className="h-1.5 w-14 bg-muted"
                            />
                          </div>
                        </td>

                        {/* Clientes / Pedidos */}
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                            <span title={`${item.clientesCount} clientes`}>
                              👥 {item.clientesCount}
                            </span>
                            <span>•</span>
                            <span title={`${item.pedidosCount} pedidos`}>
                              📄 {item.pedidosCount}
                            </span>
                          </div>
                        </td>

                        {/* Estado de Viabilidad (Selector directo en celda) */}
                        <td className="py-2.5 px-3">
                          <Select
                            value={dec.estadoViabilidad}
                            onValueChange={(val) =>
                              cambiarEstadoViabilidadRapido(item, val as any)
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
                              {ESTADOS_VIABILIDAD.map((e) => (
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

                        {/* Unidades Programadas */}
                        <td className="py-2.5 px-3 text-right font-mono font-bold">
                          {dec.unidadesProgramadas ? (
                            <span className="text-emerald-600 dark:text-emerald-400">
                              {dec.unidadesProgramadas.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">-</span>
                          )}
                        </td>

                        {/* Acción / Botón Gestionar */}
                        <td className="py-2.5 px-3 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => abrirEdicion(item)}
                            className="h-7 px-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 cursor-pointer"
                            title="Editar programación, taller y notas técnicas"
                          >
                            Gestionar
                          </Button>
                        </td>
                      </tr>

                      {/* ========================================================================= */}
                      {/* FILA EXPANDIDA: CURVA TÉCNICA Y PEDIDOS COMPROMETIDOS */}
                      {/* ========================================================================= */}
                      {expandido && (
                        <tr className="bg-muted/15 border-b border-border/80">
                          <td colSpan={12} className="p-4 pl-10 pr-6 space-y-4">
                            {/* Selector de subpestañas */}
                            <div className="flex items-center justify-between border-b border-border/60 pb-2">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSubTabExpandida((prev) => ({
                                      ...prev,
                                      [item.producto]: "curva",
                                    }))
                                  }
                                  className={cn(
                                    "px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer",
                                    subTabExpandida[item.producto] === "curva"
                                      ? "bg-indigo-600 text-white shadow-xs"
                                      : "bg-muted text-muted-foreground hover:text-foreground"
                                  )}
                                >
                                  ✂️ Curva Técnica de Tallas y Colores ({item.curva.length} SKUs)
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    setSubTabExpandida((prev) => ({
                                      ...prev,
                                      [item.producto]: "pedidos",
                                    }))
                                  }
                                  className={cn(
                                    "px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer",
                                    subTabExpandida[item.producto] === "pedidos"
                                      ? "bg-indigo-600 text-white shadow-xs"
                                      : "bg-muted text-muted-foreground hover:text-foreground"
                                  )}
                                >
                                  👥 Detalle de Pedidos de Clientes ({item.pedidos.length})
                                </button>
                              </div>

                              {/* Datos de programación asignados */}
                              {dec.taller || dec.fechaEstimadaEntrega || dec.observaciones ? (
                                <div className="text-[11px] text-muted-foreground flex items-center gap-3">
                                  {dec.taller && (
                                    <span>
                                      <strong>Taller:</strong> {dec.taller}
                                    </span>
                                  )}
                                  {dec.fechaEstimadaEntrega && (
                                    <span>
                                      <strong>Entrega:</strong> {dec.fechaEstimadaEntrega}
                                    </span>
                                  )}
                                  {dec.observaciones && (
                                    <span className="italic max-w-xs truncate" title={dec.observaciones}>
                                      "{dec.observaciones}"
                                    </span>
                                  )}
                                </div>
                              ) : null}
                            </div>

                            {/* PESTAÑA A: CURVA DE TALLAS Y COLORES */}
                            {subTabExpandida[item.producto] === "curva" && (
                              <div className="space-y-2">
                                <div className="overflow-x-auto rounded-lg border border-border bg-card">
                                  <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                      <tr className="bg-muted/70 text-muted-foreground text-[10px] uppercase font-bold tracking-wider border-b border-border">
                                        <th className="py-2 px-3">Talla</th>
                                        <th className="py-2 px-3">Color</th>
                                        <th className="py-2 px-3 text-right">Saldo Pedido</th>
                                        <th className="py-2 px-3 text-right">Saldo Inv (Bodega)</th>
                                        <th className="py-2 px-3 text-right">Déficit a Cortar</th>
                                        <th className="py-2 px-3 text-center">Pedidos que la piden</th>
                                        <th className="py-2 px-3 text-center">Estado Variante</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/60">
                                      {item.curva.map((c, idx) => (
                                        <tr
                                          key={`${c.talla}_${c.color}_${idx}`}
                                          className={cn(
                                            "hover:bg-muted/30",
                                            c.deficit > 0 && "bg-rose-500/5 font-medium"
                                          )}
                                        >
                                          <td className="py-2 px-3 font-mono font-bold">
                                            {c.talla}
                                          </td>
                                          <td className="py-2 px-3 font-medium text-foreground">
                                            {c.color}
                                          </td>
                                          <td className="py-2 px-3 text-right font-mono font-semibold">
                                            {c.saldoPedido}
                                          </td>
                                          <td className="py-2 px-3 text-right font-mono">
                                            <span
                                              className={cn(
                                                c.saldoInv <= 0
                                                  ? "text-rose-600 dark:text-rose-400 font-bold"
                                                  : "text-amber-600"
                                              )}
                                            >
                                              {c.saldoInv}
                                            </span>
                                          </td>
                                          <td className="py-2 px-3 text-right font-mono font-black">
                                            {c.deficit > 0 ? (
                                              <span className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                                                {c.deficit}
                                              </span>
                                            ) : (
                                              <span className="text-emerald-600 font-normal">
                                                Cubierto
                                              </span>
                                            )}
                                          </td>
                                          <td className="py-2 px-3 text-center font-mono text-muted-foreground">
                                            {c.pedidosCount}
                                          </td>
                                          <td className="py-2 px-3 text-center">
                                            {c.deficit > 0 ? (
                                              <Badge
                                                variant="outline"
                                                className="text-[9px] bg-rose-500/10 text-rose-600 border-rose-500/20"
                                              >
                                                Requiere Corte
                                              </Badge>
                                            ) : (
                                              <Badge
                                                variant="outline"
                                                className="text-[9px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                              >
                                                Stock Ok
                                              </Badge>
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                    <tfoot>
                                      <tr className="bg-muted font-bold text-xs border-t-2 border-border">
                                        <td colSpan={2} className="py-2 px-3 text-right">
                                          TOTALES CURVA TÉCNICA:
                                        </td>
                                        <td className="py-2 px-3 text-right font-mono">
                                          {item.saldoPedido}
                                        </td>
                                        <td className="py-2 px-3 text-right font-mono">
                                          {item.saldoInv}
                                        </td>
                                        <td className="py-2 px-3 text-right font-mono text-rose-600 dark:text-rose-400 font-black">
                                          {item.deficit}
                                        </td>
                                        <td colSpan={2} className="py-2 px-3"></td>
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>
                              </div>
                            )}

                            {/* PESTAÑA B: DETALLE DE PEDIDOS DE CLIENTES */}
                            {subTabExpandida[item.producto] === "pedidos" && (
                              <div className="space-y-2">
                                <div className="overflow-x-auto rounded-lg border border-border bg-card max-h-[350px]">
                                  <table className="w-full text-left text-xs border-collapse">
                                    <thead className="sticky top-0 bg-muted/90 backdrop-blur-xs border-b border-border text-[10px] uppercase font-bold text-muted-foreground z-10">
                                      <tr>
                                        <th className="py-2 px-3">Documento</th>
                                        <th className="py-2 px-3">Cliente</th>
                                        <th className="py-2 px-3">Ciudad</th>
                                        <th className="py-2 px-3">Asesor</th>
                                        <th className="py-2 px-3">Fecha Pedido</th>
                                        <th className="py-2 px-3">Fecha Vencimiento</th>
                                        <th className="py-2 px-3">Talla / Color</th>
                                        <th className="py-2 px-3 text-right">Cant. Pendiente</th>
                                        <th className="py-2 px-3 text-center">Estado Vence</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/60">
                                      {item.pedidos.map((p, pIdx) => (
                                        <tr key={`${p.id}_${pIdx}`} className="hover:bg-muted/30">
                                          <td className="py-1.5 px-3 font-mono font-bold text-foreground">
                                            {p.documento}
                                          </td>
                                          <td className="py-1.5 px-3">
                                            <div className="flex flex-col">
                                              <span className="font-semibold text-foreground">
                                                {p.nombre}
                                              </span>
                                              <span className="text-[10px] text-muted-foreground font-mono">
                                                NIT: {p.tercero}
                                              </span>
                                            </div>
                                          </td>
                                          <td className="py-1.5 px-3 text-muted-foreground">
                                            {p.ciudad}
                                          </td>
                                          <td className="py-1.5 px-3 text-muted-foreground">
                                            {p.vendedor}
                                          </td>
                                          <td className="py-1.5 px-3 font-mono text-[11px]">
                                            {p.fechas}
                                          </td>
                                          <td className="py-1.5 px-3 font-mono text-[11px] font-semibold">
                                            {p.vence}
                                          </td>
                                          <td className="py-1.5 px-3 font-mono text-[11px]">
                                            {p.talla} / {p.color}
                                          </td>
                                          <td className="py-1.5 px-3 text-right font-mono font-bold text-foreground">
                                            {p.saldoPedido}
                                          </td>
                                          <td className="py-1.5 px-3 text-center">
                                            {p.esVencido ? (
                                              <Badge
                                                variant="outline"
                                                className="text-[9px] bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 font-bold"
                                              >
                                                Vencido ({Math.abs(p.diasParaVencer || 0)}d)
                                              </Badge>
                                            ) : (
                                              <Badge
                                                variant="outline"
                                                className="text-[9px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                              >
                                                Vigente ({p.diasParaVencer}d)
                                              </Badge>
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
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

      {/* ========================================================================= */}
      {/* 5. MODAL / DIALOG DE GESTIÓN TÉCNICA DE PROGRAMACIÓN */}
      {/* ========================================================================= */}
      <Dialog open={!!itemEnEdicion} onOpenChange={(open) => !open && setItemEnEdicion(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <div className="flex items-center gap-2 text-indigo-600">
              <Factory className="h-5 w-5" />
              <DialogTitle className="text-base sm:text-lg font-bold">
                Programación de Producción • Referencia {itemEnEdicion?.producto}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              {itemEnEdicion?.descripcion} • Déficit a cortar:{" "}
              <strong className="text-rose-600 font-mono">
                {itemEnEdicion?.deficit} unidades
              </strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Estado de Viabilidad */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">
                Estado de Viabilidad de la Reprogramación
              </label>
              <Select
                value={decisionForm.estadoViabilidad}
                onValueChange={(val) =>
                  setDecisionForm((prev) => ({
                    ...prev,
                    estadoViabilidad: val as EstadoViabilidadProduccion,
                  }))
                }
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Seleccionar viabilidad" />
                </SelectTrigger>
                <SelectContent>
                  {ESTADOS_VIABILIDAD.map((e) => (
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

            {/* Unidades Programadas y Botones Rápidos */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground">
                  Unidades a Programar / Cortar
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setDecisionForm((prev) => ({
                        ...prev,
                        unidadesProgramadas: itemEnEdicion?.deficit || 0,
                      }))
                    }
                    className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground font-semibold cursor-pointer"
                  >
                    Usar Déficit Exacto ({itemEnEdicion?.deficit})
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDecisionForm((prev) => ({
                        ...prev,
                        unidadesProgramadas: Math.ceil((itemEnEdicion?.deficit || 50) / 50) * 50,
                      }))
                    }
                    className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground font-semibold cursor-pointer"
                  >
                    Lote Redondo (50s)
                  </button>
                </div>
              </div>
              <Input
                type="number"
                min="0"
                value={decisionForm.unidadesProgramadas}
                onChange={(e) =>
                  setDecisionForm((prev) => ({
                    ...prev,
                    unidadesProgramadas: Math.max(0, parseInt(e.target.value, 10) || 0),
                  }))
                }
                className="h-9 text-xs font-mono font-bold"
              />
            </div>

            {/* Fila: Fecha Estimada de Entrega y Taller */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  Fecha Estimada de Entrega
                </label>
                <Input
                  type="date"
                  value={decisionForm.fechaEstimadaEntrega}
                  onChange={(e) =>
                    setDecisionForm((prev) => ({
                      ...prev,
                      fechaEstimadaEntrega: e.target.value,
                    }))
                  }
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  Taller / Planta Asignada
                </label>
                <Input
                  placeholder="ej. Taller Satélite 1, Planta Principal"
                  value={decisionForm.taller}
                  onChange={(e) =>
                    setDecisionForm((prev) => ({ ...prev, taller: e.target.value }))
                  }
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Prioridad */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Prioridad en Taller</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { valor: "alta", etiqueta: "🔴 Alta (Vencido / Urgente)" },
                  { valor: "media", etiqueta: "🟡 Media (Normal)" },
                  { valor: "baja", etiqueta: "🟢 Baja (Preventivo)" },
                ].map((p) => (
                  <button
                    key={p.valor}
                    type="button"
                    onClick={() =>
                      setDecisionForm((prev) => ({
                        ...prev,
                        prioridad: p.valor as PrioridadProduccion,
                      }))
                    }
                    className={cn(
                      "p-2 text-[11px] font-semibold rounded-lg border text-center transition-all cursor-pointer",
                      decisionForm.prioridad === p.valor
                        ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500"
                        : "border-border bg-background hover:bg-muted text-muted-foreground"
                    )}
                  >
                    {p.etiqueta}
                  </button>
                ))}
              </div>
            </div>

            {/* Observaciones Técnicas y de Insumos */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">
                Observaciones Técnicas de Producción
              </label>
              <Textarea
                placeholder="Anotar detalles sobre tela requerida, moldes, disponibilidad de hilos, lavado o razones técnicas de viabilidad..."
                value={decisionForm.observaciones}
                onChange={(e) =>
                  setDecisionForm((prev) => ({
                    ...prev,
                    observaciones: e.target.value,
                  }))
                }
                rows={3}
                className="text-xs resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setItemEnEdicion(null)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={guardarEdicionModal}
              className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
            >
              Guardar Programación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
