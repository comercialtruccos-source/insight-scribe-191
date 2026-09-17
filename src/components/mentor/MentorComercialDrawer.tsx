import React, { useState, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sparkles,
  TrendingUp,
  Package,
  MapPin,
  Layers,
  MessageSquare,
  Copy,
  Check,
  Share2,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  Award,
  Zap,
  Tag,
  DollarSign,
  UserCheck,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import {
  DiagnosticoMentor,
  ComboEstrategico,
  EstrategiaZonaItem,
  EstrategiaABCItem,
  GuionComercial,
} from "@/lib/mentor-comercial";

interface MentorComercialDrawerProps {
  diagnostico: DiagnosticoMentor;
  esDirectivo?: boolean;
  vendedoresDisponibles?: { id: number; nombre: string }[];
  vendedorSeleccionadoId?: string;
  onCambiarVendedor?: (id: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  triggerButton?: React.ReactNode;
}

function formatoCOP(val: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(val || 0);
}

export function MentorComercialDrawer({
  diagnostico,
  esDirectivo = false,
  vendedoresDisponibles = [],
  vendedorSeleccionadoId = "todos",
  onCambiarVendedor,
  open,
  onOpenChange,
  triggerButton,
}: MentorComercialDrawerProps) {
  const [tabActiva, setTabActiva] = useState<string>("diagnostico");
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  const copiarTexto = (texto: string, id: string, titulo: string) => {
    navigator.clipboard.writeText(texto);
    setCopiadoId(id);
    toast.success(`¡${titulo} copiado al portapapeles!`, {
      description: "Listo para pegar en WhatsApp o correo comercial.",
    });
    setTimeout(() => {
      setCopiadoId((curr) => (curr === id ? null : curr));
    }, 2500);
  };

  const abrirWhatsAppWeb = (mensaje: string) => {
    const url = `https://web.whatsapp.com/send?text=${encodeURIComponent(mensaje)}`;
    window.open(url, "_blank");
  };

  const colorSalud = useMemo(() => {
    switch (diagnostico.kpis.saludComercial) {
      case "Excelente":
        return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
      case "Crecimiento":
        return "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30";
      case "Estable":
        return "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30";
      case "Atención Requerida":
        return "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30";
      case "Crítico":
        return "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  }, [diagnostico.kpis.saludComercial]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {triggerButton && <SheetTrigger asChild>{triggerButton}</SheetTrigger>}
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl lg:max-w-3xl p-0 flex flex-col h-full bg-background border-l border-border/80 shadow-2xl"
      >
        {/* Header con información del Asesor y Puntuación */}
        <div className="p-5 border-b border-border/60 bg-gradient-to-b from-primary/10 via-muted/20 to-transparent flex flex-col gap-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-primary flex items-center justify-center text-white shadow-md shadow-indigo-500/25 ring-2 ring-white/20 shrink-0">
                <Sparkles className="h-5 w-5 text-amber-300 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <SheetTitle className="text-lg font-black tracking-tight font-display text-foreground">
                    Copiloto & Mentor Comercial
                  </SheetTitle>
                  <Badge variant="outline" className={`font-bold text-xs rounded-full px-2.5 py-0.5 shadow-2xs ${colorSalud}`}>
                    {diagnostico.kpis.saludComercial} ({diagnostico.kpis.puntuacionRendimiento}/100)
                  </Badge>
                </div>
                <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                  Estrategias inteligentes de ventas, combos y optimización de cartera.
                </SheetDescription>
              </div>
            </div>

            <Badge variant="secondary" className="font-mono text-[11px] font-bold bg-background/80 border border-border/60 rounded-full px-2.5 py-0.5 shadow-2xs">
              {diagnostico.periodoNombre}
            </Badge>
          </div>

          {/* Selector de Asesor para Directivos */}
          {esDirectivo && vendedoresDisponibles.length > 0 && onCambiarVendedor && (
            <div className="flex items-center gap-2 pt-2 border-t border-border/40">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5 text-primary" />
                Coaching para Asesor:
              </span>
              <select
                value={vendedorSeleccionadoId}
                onChange={(e) => onCambiarVendedor(e.target.value)}
                className="text-xs bg-background/90 border border-border/80 rounded-xl px-2.5 py-1 font-semibold focus:ring-2 focus:ring-primary/30 focus:outline-none shadow-2xs"
              >
                <option value="todos">Todos los Asesores (Consolidado)</option>
                {vendedoresDisponibles.map((v) => (
                  <option key={v.id} value={String(v.id)}>
                    {v.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Mensaje motivacional / Diagnóstico inicial */}
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl p-3 text-xs text-foreground/90 flex items-start gap-2.5 shadow-2xs">
            <Zap className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="text-primary font-bold">{diagnostico.asesorNombre}: </strong>
              {diagnostico.kpis.mensajeMotivacional}
            </p>
          </div>
        </div>

        {/* Pestañas de Navegación del Mentor */}
        <Tabs value={tabActiva} onValueChange={setTabActiva} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-5 pt-3 pb-2 border-b border-border/60 bg-muted/15">
            <TabsList className="grid grid-cols-5 w-full h-9 bg-card/80 p-1 rounded-xl border border-border/60 shadow-2xs">
              <TabsTrigger value="diagnostico" className="text-xs font-bold gap-1 rounded-lg data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-xs transition-all">
                <TrendingUp className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Diagnóstico</span>
              </TabsTrigger>
              <TabsTrigger value="combos" className="text-xs font-bold gap-1 rounded-lg data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-xs transition-all">
                <Package className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Combos</span>
              </TabsTrigger>
              <TabsTrigger value="zonas" className="text-xs font-bold gap-1 rounded-lg data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-xs transition-all">
                <MapPin className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Zonas</span>
              </TabsTrigger>
              <TabsTrigger value="abc" className="text-xs font-bold gap-1 rounded-lg data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-xs transition-all">
                <Layers className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Mix ABC</span>
              </TabsTrigger>
              <TabsTrigger value="guiones" className="text-xs font-bold gap-1 rounded-lg data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-xs transition-all">
                <MessageSquare className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Guiones</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1 p-5">
            {/* ========================================================================= */}
            {/* TAB 1: DIAGNÓSTICO ESTRATÉGICO */}
            {/* ========================================================================= */}
            <TabsContent value="diagnostico" className="space-y-5 m-0">
              {/* Alertas Inmediatas */}
              {diagnostico.alertasInmediatas.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 text-primary" />
                    Alertas y Acciones Inmediatas
                  </h3>
                  <div className="grid gap-2">
                    {diagnostico.alertasInmediatas.map((a, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-lg border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                          a.tipo === "urgent"
                            ? "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300"
                            : a.tipo === "warning"
                            ? "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300"
                            : a.tipo === "success"
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                            : "bg-blue-500/10 border-blue-500/30 text-blue-800 dark:text-blue-300"
                        }`}
                      >
                        <div>
                          <p className="font-semibold">{a.mensaje}</p>
                          <p className="text-[11px] opacity-90 mt-0.5">Sugerencia: {a.accion}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Grid de Métricas Clave */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="bg-card/60">
                  <CardContent className="p-3">
                    <p className="text-[11px] text-muted-foreground">Venta Actual</p>
                    <p className="text-base font-bold font-mono text-foreground mt-0.5">
                      {formatoCOP(diagnostico.kpis.ventaActual)}
                    </p>
                    <div className="flex items-center gap-1 mt-1 text-[11px]">
                      {diagnostico.kpis.crecimientoYoYPct >= 0 ? (
                        <span className="text-emerald-600 font-semibold flex items-center">
                          <ArrowUpRight className="h-3 w-3" />+{diagnostico.kpis.crecimientoYoYPct}%
                        </span>
                      ) : (
                        <span className="text-rose-600 font-semibold flex items-center">
                          <ArrowDownRight className="h-3 w-3" />{diagnostico.kpis.crecimientoYoYPct}%
                        </span>
                      )}
                      <span className="text-muted-foreground">vs año ant.</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card/60">
                  <CardContent className="p-3">
                    <p className="text-[11px] text-muted-foreground">Ticket Promedio</p>
                    <p className="text-base font-bold font-mono text-foreground mt-0.5">
                      {formatoCOP(diagnostico.kpis.ticketPromedio)}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {diagnostico.kpis.transacciones} pedidos emitidos
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-card/60">
                  <CardContent className="p-3">
                    <p className="text-[11px] text-muted-foreground">Precio Promedio</p>
                    <p className="text-base font-bold font-mono text-foreground mt-0.5">
                      {formatoCOP(diagnostico.kpis.precioPromedioPrenda)}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1">por unidad vendida</p>
                  </CardContent>
                </Card>

                <Card className="bg-card/60">
                  <CardContent className="p-3">
                    <p className="text-[11px] text-muted-foreground">Prendas Vendidas</p>
                    <p className="text-base font-bold font-mono text-foreground mt-0.5">
                      {diagnostico.kpis.unidadesVendidas.toLocaleString("es-CO")} unds
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1">en el periodo</p>
                  </CardContent>
                </Card>
              </div>

              {/* Guía Rápida de Acción */}
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Award className="h-4 w-4 text-primary" />
                    Las 3 Acciones de Mayor Impacto para este Mes:
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-1 text-xs space-y-2 text-foreground/90">
                  <div className="flex items-start gap-2">
                    <span className="h-5 w-5 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center shrink-0 text-[11px]">
                      1
                    </span>
                    <p>
                      <strong>Impulsa el Combo Dúo Comercial:</strong> Empareja tu prenda Clase A con complementos B para elevar el ticket promedio en un +28%.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="h-5 w-5 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center shrink-0 text-[11px]">
                      2
                    </span>
                    <p>
                      <strong>Reactivación de Zonas Rezagadas:</strong> Envía el guión de WhatsApp con catálogo express a clientes inactivos hace 45+ días.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="h-5 w-5 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center shrink-0 text-[11px]">
                      3
                    </span>
                    <p>
                      <strong>Liquidación de Remanentes Clase C:</strong> Ofrece el paquete de 6 prendas surtidas con 12% de descuento para rotar stock estancado.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ========================================================================= */}
            {/* TAB 2: COMBOS GANADORES & UPSELLING */}
            {/* ========================================================================= */}
            <TabsContent value="combos" className="space-y-4 m-0">
              <div>
                <h3 className="text-sm font-bold text-foreground">Combos Estratégicos Recomendados</h3>
                <p className="text-xs text-muted-foreground">
                  Paquetes calculados automáticamente cruzando tus productos de mayor demanda con complementos ideales.
                </p>
              </div>

              <div className="space-y-4">
                {diagnostico.combos.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-xs">
                    No hay suficientes datos de referencias para generar combos en este periodo.
                  </div>
                ) : (
                  diagnostico.combos.map((combo) => (
                    <Card key={combo.id} className="border-border/80 shadow-sm overflow-hidden">
                      <CardHeader className="p-4 bg-muted/20 border-b border-border/40 pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-1.5">
                              <Sparkles className="h-4 w-4 text-amber-500" />
                              {combo.titulo}
                            </CardTitle>
                            <CardDescription className="text-xs mt-0.5">
                              {combo.descripcion}
                            </CardDescription>
                          </div>
                          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[11px] font-bold shrink-0">
                            +{combo.incrementoTicketEstimadoPct}% Ticket
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 space-y-3">
                        {/* Productos del Combo */}
                        <div className="grid sm:grid-cols-2 gap-2">
                          <div className="p-2.5 rounded-lg border border-border/60 bg-muted/10 text-xs">
                            <div className="flex items-center justify-between text-muted-foreground text-[11px] mb-1">
                              <span className="font-semibold text-primary">Prenda Principal (Clase {combo.productoPrincipal.clase})</span>
                              <span>SKU: {combo.productoPrincipal.sku}</span>
                            </div>
                            <p className="font-bold text-foreground">{combo.productoPrincipal.nombre}</p>
                            <p className="font-mono text-muted-foreground mt-0.5">
                              Precio Regular: {formatoCOP(combo.productoPrincipal.precio)}
                            </p>
                          </div>

                          <div className="p-2.5 rounded-lg border border-border/60 bg-muted/10 text-xs">
                            <div className="flex items-center justify-between text-muted-foreground text-[11px] mb-1">
                              <span className="font-semibold text-indigo-500">Prenda Complemento (Clase {combo.productoComplemento.clase})</span>
                              <span>SKU: {combo.productoComplemento.sku}</span>
                            </div>
                            <p className="font-bold text-foreground">{combo.productoComplemento.nombre}</p>
                            <p className="font-mono text-muted-foreground mt-0.5">
                              Precio Regular: {formatoCOP(combo.productoComplemento.precio)}
                            </p>
                          </div>
                        </div>

                        {/* Precios y Beneficios */}
                        <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs">
                          <div>
                            <span className="text-[11px] text-muted-foreground line-through mr-2">
                              {formatoCOP(combo.precioSumaRegular)}
                            </span>
                            <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                              {formatoCOP(combo.precioComboSugerido)} Combo
                            </span>
                            <span className="text-[11px] text-emerald-700 dark:text-emerald-300 ml-1.5 font-semibold">
                              ({combo.descuentoSugeridoPct}% OFF)
                            </span>
                          </div>
                          <span className="text-[11px] text-muted-foreground hidden sm:inline">
                            {combo.beneficioComercial}
                          </span>
                        </div>

                        {/* Argumento de Venta y Botones */}
                        <div className="p-2.5 bg-muted/30 rounded-lg text-xs border border-border/40 space-y-2">
                          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                            Pitch Sugerido para el Cliente:
                          </p>
                          <p className="italic text-foreground/90 font-sans">
                            "{combo.argumentoVenta}"
                          </p>
                          <div className="flex items-center justify-end gap-2 pt-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1.5"
                              onClick={() => copiarTexto(combo.argumentoVenta, combo.id, "Argumento de Venta")}
                            >
                              {copiadoId === combo.id ? (
                                <>
                                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                                  Copiado
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3.5 w-3.5" />
                                  Copiar Pitch
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              className="h-7 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => abrirWhatsAppWeb(combo.argumentoVenta)}
                            >
                              <Share2 className="h-3.5 w-3.5" />
                              WhatsApp
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            {/* ========================================================================= */}
            {/* TAB 3: PLAN ESTRATÉGICO POR ZONAS */}
            {/* ========================================================================= */}
            <TabsContent value="zonas" className="space-y-4 m-0">
              <div>
                <h3 className="text-sm font-bold text-foreground">Diagnóstico y Plan por Territorio</h3>
                <p className="text-xs text-muted-foreground">
                  Estrategias diferenciadas para zonas de alta tracción y planes de rescate para zonas con caída.
                </p>
              </div>

              <div className="space-y-3">
                {diagnostico.zonas.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-xs">
                    Sin datos de zonas en el periodo.
                  </div>
                ) : (
                  diagnostico.zonas.map((z, idx) => (
                    <Card
                      key={idx}
                      className={`border shadow-sm ${
                        z.tipo === "lider"
                          ? "border-emerald-500/40 bg-emerald-500/5"
                          : z.tipo === "critica"
                          ? "border-rose-500/40 bg-rose-500/5"
                          : "border-border/80"
                      }`}
                    >
                      <CardContent className="p-4 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <MapPin className={`h-4 w-4 ${z.tipo === "lider" ? "text-emerald-500" : z.tipo === "critica" ? "text-rose-500" : "text-blue-500"}`} />
                            <span className="font-bold text-sm text-foreground">{z.zona}</span>
                            <Badge
                              variant="outline"
                              className={`text-[10px] uppercase font-bold ${
                                z.tipo === "lider"
                                  ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                                  : z.tipo === "critica"
                                  ? "bg-rose-500/15 text-rose-600 border-rose-500/30"
                                  : "bg-blue-500/15 text-blue-600 border-blue-500/30"
                              }`}
                            >
                              {z.tipo === "lider" ? "Zona Líder" : z.tipo === "critica" ? "Zona Crítica" : "Zona en Potencial"}
                            </Badge>
                          </div>
                          <div className="text-right font-mono">
                            <span className="font-bold text-xs">{formatoCOP(z.ventaActual)}</span>
                            {z.ventaAnterior > 0 && (
                              <span className={`text-[11px] ml-1.5 font-semibold ${z.crecimientoPct >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                ({z.crecimientoPct >= 0 ? `+${z.crecimientoPct}%` : `${z.crecimientoPct}%`})
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="text-xs text-muted-foreground">{z.diagnostico}</p>

                        <div className="grid sm:grid-cols-2 gap-2 text-xs pt-1">
                          <div className="p-2 rounded bg-background/80 border border-border/60">
                            <span className="font-semibold text-primary block text-[11px]">Acción Recomendada:</span>
                            <p className="mt-0.5 text-foreground/90">{z.accionRecomendada}</p>
                          </div>
                          <div className="p-2 rounded bg-background/80 border border-border/60">
                            <span className="font-semibold text-amber-600 dark:text-amber-400 block text-[11px]">Oferta Sugerida:</span>
                            <p className="mt-0.5 text-foreground/90">{z.ofertaSugerida}</p>
                          </div>
                        </div>

                        {z.skusMasVendidos.length > 0 && (
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-1">
                            <span className="font-semibold">Top SKUs de la zona:</span>
                            <div className="flex gap-1 flex-wrap">
                              {z.skusMasVendidos.map((sku, sIdx) => (
                                <Badge key={sIdx} variant="secondary" className="font-mono text-[10px] py-0 px-1.5">
                                  {sku}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            {/* ========================================================================= */}
            {/* TAB 4: MIX DE PORTAFOLIO ABC */}
            {/* ========================================================================= */}
            <TabsContent value="abc" className="space-y-4 m-0">
              <div>
                <h3 className="text-sm font-bold text-foreground">Optimización de Portafolio ABC</h3>
                <p className="text-xs text-muted-foreground">
                  Estrategia para maximizar ingresos con referencias Clase A y rotar inventario Clase C.
                </p>
              </div>

              <div className="space-y-4">
                {diagnostico.abc.map((cat) => (
                  <Card key={cat.clase} className="border border-border/80 shadow-sm">
                    <CardHeader className="p-4 pb-2 bg-muted/20 border-b border-border/40">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge
                            className={`font-bold text-xs ${
                              cat.clase === "A"
                                ? "bg-emerald-500 text-white"
                                : cat.clase === "B"
                                ? "bg-blue-500 text-white"
                                : "bg-rose-500 text-white"
                            }`}
                          >
                            Clase {cat.clase}
                          </Badge>
                          <span className="font-bold text-sm">
                            {cat.clase === "A" ? "Alto Impacto (80% Ventas)" : cat.clase === "B" ? "Rotación Media (15% Ventas)" : "Larga Cola (5% Ventas)"}
                          </span>
                        </div>
                        <span className="font-mono text-xs font-bold">
                          {formatoCOP(cat.totalVentas)} ({cat.porcentajeVenta}%)
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{cat.diagnostico}</p>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3">
                      <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/15 text-xs text-foreground/90">
                        <strong className="text-primary font-semibold">Táctica del Mentor: </strong>
                        {cat.estrategiaPrincipal}
                      </div>

                      {cat.itemsDestacados.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-[11px] font-semibold text-muted-foreground uppercase">
                            Referencias Destacadas:
                          </p>
                          <div className="divide-y divide-border/40 border border-border/60 rounded-lg overflow-hidden">
                            {cat.itemsDestacados.map((item, itIdx) => (
                              <div key={itIdx} className="p-2.5 bg-background flex items-center justify-between gap-2 text-xs">
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono font-bold text-primary">{item.sku}</span>
                                    <span className="text-foreground font-medium truncate max-w-[200px]">{item.nombre}</span>
                                  </div>
                                  <p className="text-[11px] text-muted-foreground mt-0.5">{item.recomendacion}</p>
                                </div>
                                <div className="text-right font-mono shrink-0">
                                  <p className="font-bold">{formatoCOP(item.valor)}</p>
                                  <p className="text-[11px] text-muted-foreground">{item.unidades} unds</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* ========================================================================= */}
            {/* TAB 5: GUIONES Y PITCH COMERCIAL WHATSAPP */}
            {/* ========================================================================= */}
            <TabsContent value="guiones" className="space-y-4 m-0">
              <div>
                <h3 className="text-sm font-bold text-foreground">Guiones y Mensajes Listos para WhatsApp</h3>
                <p className="text-xs text-muted-foreground">
                  Plantillas redactadas con técnicas de persuasión comercial listas para copiar y enviar a tus clientes.
                </p>
              </div>

              <div className="space-y-4">
                {diagnostico.guiones.map((g) => (
                  <Card key={g.id} className="border border-border/80 shadow-sm">
                    <CardHeader className="p-4 pb-2 bg-muted/20 border-b border-border/40">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-emerald-500" />
                          <CardTitle className="text-sm font-bold">{g.titulo}</CardTitle>
                        </div>
                        <Badge variant="outline" className="text-[10px] font-semibold">
                          {g.etiqueta}
                        </Badge>
                      </div>
                      <CardDescription className="text-xs mt-0.5">
                        Destinatario recomendado: <strong>{g.destinatario}</strong>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3">
                      <div className="p-3 bg-muted/40 rounded-lg border border-border/60 font-mono text-xs whitespace-pre-wrap leading-relaxed text-foreground">
                        {g.mensajeWhatsApp}
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-muted-foreground">
                          Beneficio: {g.beneficioCliente}
                        </span>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs gap-1.5"
                            onClick={() => copiarTexto(g.mensajeWhatsApp, g.id, g.titulo)}
                          >
                            {copiadoId === g.id ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-emerald-500" />
                                Copiado
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" />
                                Copiar Texto
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => abrirWhatsAppWeb(g.mensajeWhatsApp)}
                          >
                            <Share2 className="h-3.5 w-3.5" />
                            WhatsApp Web
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
