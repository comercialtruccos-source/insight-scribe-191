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
import { Input } from "@/components/ui/input";
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
  Boxes,
  Search,
  Warehouse,
  ImageIcon,
  Flame,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import {
  DiagnosticoMentor,
  ComboEstrategico,
  EstrategiaZonaItem,
  EstrategiaABCItem,
  GuionComercial,
} from "@/lib/mentor-comercial";
import { ResumenInventarioReal, ReferenciaStockAgrupada } from "@/lib/inventario-api";

interface MentorComercialDrawerProps {
  diagnostico: DiagnosticoMentor;
  resumenInventario?: ResumenInventarioReal;
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
  resumenInventario,
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

  // Estados para el explorador de Inventario Real
  const [busquedaInv, setBusquedaInv] = useState("");
  const [bodegaSeleccionada, setBodegaSeleccionada] = useState("todas");
  const [filtroTipoStock, setFiltroTipoStock] = useState<"todos" | "sobrestock" | "stock_bajo" | "con_foto">("todos");

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

  const generarOfertaWhatsAppInventario = (item: ReferenciaStockAgrupada) => {
    const tallasStr = item.tallas.map((t) => `${t.talla} (${t.saldo})`).join(", ");
    const coloresStr = item.colores.map((c) => c.color).join(", ");
    const bodegasStr = item.bodegas.join(", ");

    const mensaje = `¡Hola [Nombre Cliente]! 👋 Te saluda el equipo de Trucco's Jeans.\n\nTe comparto disponibilidad inmediata en bodega de nuestra referencia:\n✨ *${item.referencia} - ${item.descripcion}*\n\n📦 *Stock Disponible:* ${item.saldoTotal} unidades (${bodegasStr})\n🎨 *Colores:* ${coloresStr}\n📏 *Tallas disponibles:* ${tallasStr}\n💵 *Precio Mayorista:* ${formatoCOP(item.pvm)} (PVP Sugerido: ${formatoCOP(item.pvp)})\n\n¿Te aparto una curva completa para despacho hoy mismo? 👖✨`;

    abrirWhatsAppWeb(mensaje);
  };

  // Lista de referencias de inventario filtradas
  const referenciasInventarioFiltradas = useMemo(() => {
    if (!resumenInventario || !resumenInventario.mapaPorReferencia) return [];
    let items = Array.from(resumenInventario.mapaPorReferencia.values());

    if (bodegaSeleccionada !== "todas") {
      items = items.filter((it) => it.bodegas.includes(bodegaSeleccionada));
    }

    if (busquedaInv.trim()) {
      const q = busquedaInv.trim().toLowerCase();
      items = items.filter(
        (it) => it.referencia.toLowerCase().includes(q) || it.descripcion.toLowerCase().includes(q)
      );
    }

    if (filtroTipoStock === "sobrestock") {
      items = items.filter((it) => it.saldoTotal >= 50);
    } else if (filtroTipoStock === "stock_bajo") {
      items = items.filter((it) => it.saldoTotal > 0 && it.saldoTotal <= 10);
    } else if (filtroTipoStock === "con_foto") {
      items = items.filter((it) => Boolean(it.image_url));
    }

    return items;
  }, [resumenInventario, bodegaSeleccionada, busquedaInv, filtroTipoStock]);

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
                  Estrategias inteligentes de ventas, combos, stock en bodega y optimización de cartera.
                </SheetDescription>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {resumenInventario && (
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                  Stock Live
                </Badge>
              )}
              <Badge variant="secondary" className="font-mono text-[11px] font-bold bg-background/80 border border-border/60 rounded-full px-2.5 py-0.5 shadow-2xs">
                {diagnostico.periodoNombre}
              </Badge>
            </div>
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

        {/* Pestañas de Navegación del Mentor (6 Pestañas) */}
        <Tabs value={tabActiva} onValueChange={setTabActiva} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-5 pt-3 pb-2 border-b border-border/60 bg-muted/15">
            <TabsList className="grid grid-cols-6 w-full h-9 bg-card/80 p-1 rounded-xl border border-border/60 shadow-2xs">
              <TabsTrigger value="diagnostico" className="text-xs font-bold gap-1 rounded-lg data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-xs transition-all">
                <TrendingUp className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Diagnóstico</span>
              </TabsTrigger>
              <TabsTrigger value="combos" className="text-xs font-bold gap-1 rounded-lg data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-xs transition-all">
                <Package className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Combos</span>
              </TabsTrigger>
              <TabsTrigger value="inventario" className="text-xs font-bold gap-1 rounded-lg data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-xs transition-all">
                <Boxes className="h-3.5 w-3.5 text-emerald-500" />
                <span className="hidden sm:inline">Inventario</span>
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
            {/* TAB 2: COMBOS GANADORES & UPSELLING (CON STOCK REAL & FOTOS) */}
            {/* ========================================================================= */}
            <TabsContent value="combos" className="space-y-4 m-0">
              <div>
                <h3 className="text-sm font-bold text-foreground">Combos Estratégicos con Inventario Real</h3>
                <p className="text-xs text-muted-foreground">
                  Paquetes calculados automáticamente cruzando tus prendas de alta demanda con disponibilidad física en bodega.
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
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-1.5">
                                <Sparkles className="h-4 w-4 text-amber-500" />
                                {combo.titulo}
                              </CardTitle>
                              {combo.origenEstrategia === "desbloqueo_inventario" && (
                                <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] font-bold">
                                  <Flame className="h-3 w-3 mr-0.5" /> Desbloqueo Bodega
                                </Badge>
                              )}
                            </div>
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
                        {/* Productos del Combo con Fotos y Stock */}
                        <div className="grid sm:grid-cols-2 gap-2.5">
                          {/* Producto Principal */}
                          <div className="p-2.5 rounded-lg border border-border/60 bg-muted/10 text-xs flex gap-2.5 items-start">
                            {combo.productoPrincipal.imageUrl ? (
                              <img
                                src={combo.productoPrincipal.imageUrl}
                                alt={combo.productoPrincipal.nombre}
                                className="h-14 w-14 rounded-md object-cover border border-border/60 shrink-0 bg-background"
                              />
                            ) : (
                              <div className="h-14 w-14 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-primary">
                                <Package className="h-6 w-6" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between text-muted-foreground text-[11px] mb-0.5">
                                <span className="font-semibold text-primary">Líder (Clase {combo.productoPrincipal.clase})</span>
                                <span className="font-mono font-bold">{combo.productoPrincipal.sku}</span>
                              </div>
                              <p className="font-bold text-foreground text-xs truncate">{combo.productoPrincipal.nombre}</p>
                              <p className="font-mono text-muted-foreground text-[11px] mt-0.5">
                                Precio: {formatoCOP(combo.productoPrincipal.precio)}
                              </p>
                              {combo.productoPrincipal.stockDisponible !== undefined ? (
                                <Badge
                                  variant="outline"
                                  className={`text-[9px] font-bold mt-1 px-1.5 py-0 ${
                                    combo.productoPrincipal.stockDisponible >= 20
                                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                      : combo.productoPrincipal.stockDisponible > 0
                                      ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                                      : "bg-rose-500/10 text-rose-600 border-rose-500/30"
                                  }`}
                                >
                                  🟢 Stock: {combo.productoPrincipal.stockDisponible} unds {combo.productoPrincipal.bodega ? `(${combo.productoPrincipal.bodega})` : ""}
                                </Badge>
                              ) : null}
                            </div>
                          </div>

                          {/* Producto Complemento */}
                          <div className="p-2.5 rounded-lg border border-border/60 bg-muted/10 text-xs flex gap-2.5 items-start">
                            {combo.productoComplemento.imageUrl ? (
                              <img
                                src={combo.productoComplemento.imageUrl}
                                alt={combo.productoComplemento.nombre}
                                className="h-14 w-14 rounded-md object-cover border border-border/60 shrink-0 bg-background"
                              />
                            ) : (
                              <div className="h-14 w-14 rounded-md bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 text-indigo-500">
                                <Package className="h-6 w-6" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between text-muted-foreground text-[11px] mb-0.5">
                                <span className="font-semibold text-indigo-500">Complemento (Clase {combo.productoComplemento.clase})</span>
                                <span className="font-mono font-bold">{combo.productoComplemento.sku}</span>
                              </div>
                              <p className="font-bold text-foreground text-xs truncate">{combo.productoComplemento.nombre}</p>
                              <p className="font-mono text-muted-foreground text-[11px] mt-0.5">
                                Precio: {formatoCOP(combo.productoComplemento.precio)}
                              </p>
                              {combo.productoComplemento.stockDisponible !== undefined ? (
                                <Badge
                                  variant="outline"
                                  className={`text-[9px] font-bold mt-1 px-1.5 py-0 ${
                                    combo.productoComplemento.stockDisponible >= 20
                                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                      : combo.productoComplemento.stockDisponible > 0
                                      ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                                      : "bg-rose-500/10 text-rose-600 border-rose-500/30"
                                  }`}
                                >
                                  🟢 Stock: {combo.productoComplemento.stockDisponible} unds {combo.productoComplemento.bodega ? `(${combo.productoComplemento.bodega})` : ""}
                                </Badge>
                              ) : null}
                            </div>
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
            {/* TAB 3: INVENTARIO REAL EN BODEGA (NUEVA PESTAÑA CONECTADA A SUPABASE) */}
            {/* ========================================================================= */}
            <TabsContent value="inventario" className="space-y-4 m-0">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <Boxes className="h-4 w-4 text-emerald-500" />
                    Inventario Físico en Tiempo Real
                  </h3>
                  {resumenInventario && (
                    <Badge variant="outline" className="text-[10px] font-mono font-bold">
                      {resumenInventario.totalSkus.toLocaleString("es-CO")} SKUs Sincronizados
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Consulta de existencias físicas en bodegas, valorización y generación de ofertas instantáneas para WhatsApp.
                </p>
              </div>

              {/* KPIs Globales de Inventario */}
              {resumenInventario && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-2.5 rounded-xl border border-border/80 bg-card/60 shadow-2xs">
                    <p className="text-[10px] text-muted-foreground font-medium">Total Prendas</p>
                    <p className="text-base font-black font-mono text-foreground mt-0.5">
                      {resumenInventario.totalPrendas.toLocaleString("es-CO")} unds
                    </p>
                    <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Disponibles</p>
                  </div>
                  <div className="p-2.5 rounded-xl border border-border/80 bg-card/60 shadow-2xs">
                    <p className="text-[10px] text-muted-foreground font-medium">Referencias Únicas</p>
                    <p className="text-base font-black font-mono text-foreground mt-0.5">
                      {resumenInventario.totalReferencias}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{resumenInventario.bodegas.length} bodegas</p>
                  </div>
                  <div className="p-2.5 rounded-xl border border-border/80 bg-card/60 shadow-2xs">
                    <p className="text-[10px] text-muted-foreground font-medium">Valor Bodega (PVM)</p>
                    <p className="text-base font-black font-mono text-foreground mt-0.5">
                      {formatoCOP(resumenInventario.totalValorPvm)}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Mayorista</p>
                  </div>
                  <div className="p-2.5 rounded-xl border border-border/80 bg-card/60 shadow-2xs">
                    <p className="text-[10px] text-muted-foreground font-medium">Valor Sugerido (PVP)</p>
                    <p className="text-base font-black font-mono text-foreground mt-0.5">
                      {formatoCOP(resumenInventario.totalValorPvp)}
                    </p>
                    <p className="text-[10px] text-indigo-500 font-semibold mt-0.5">Público</p>
                  </div>
                </div>
              )}

              {/* Barra de Búsqueda y Filtros de Bodega */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por referencia o descripción..."
                    value={busquedaInv}
                    onChange={(e) => setBusquedaInv(e.target.value)}
                    className="pl-8 text-xs h-8 bg-background border-border/80 rounded-xl"
                  />
                </div>

                {resumenInventario && resumenInventario.bodegas.length > 0 && (
                  <select
                    value={bodegaSeleccionada}
                    onChange={(e) => setBodegaSeleccionada(e.target.value)}
                    className="text-xs bg-background border border-border/80 rounded-xl px-2.5 h-8 font-semibold focus:ring-2 focus:ring-primary/30 focus:outline-none"
                  >
                    <option value="todas">Todas las Bodegas</option>
                    {resumenInventario.bodegas.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Filtros Rápidos (Pills) */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <Button
                  size="sm"
                  variant={filtroTipoStock === "todos" ? "default" : "outline"}
                  className="h-6 text-[11px] px-2.5 rounded-full"
                  onClick={() => setFiltroTipoStock("todos")}
                >
                  Todas ({resumenInventario?.totalReferencias || 0})
                </Button>
                <Button
                  size="sm"
                  variant={filtroTipoStock === "sobrestock" ? "default" : "outline"}
                  className="h-6 text-[11px] px-2.5 rounded-full gap-1"
                  onClick={() => setFiltroTipoStock("sobrestock")}
                >
                  <Flame className="h-3 w-3 text-amber-500" />
                  Mayor Stock (+50 unds)
                </Button>
                <Button
                  size="sm"
                  variant={filtroTipoStock === "stock_bajo" ? "default" : "outline"}
                  className="h-6 text-[11px] px-2.5 rounded-full gap-1"
                  onClick={() => setFiltroTipoStock("stock_bajo")}
                >
                  <AlertTriangle className="h-3 w-3 text-rose-500" />
                  Stock Crítico (1-10 unds)
                </Button>
                <Button
                  size="sm"
                  variant={filtroTipoStock === "con_foto" ? "default" : "outline"}
                  className="h-6 text-[11px] px-2.5 rounded-full gap-1"
                  onClick={() => setFiltroTipoStock("con_foto")}
                >
                  <ImageIcon className="h-3 w-3 text-blue-500" />
                  Con Foto
                </Button>
              </div>

              {/* Lista de Referencias de Inventario */}
              <div className="space-y-2.5">
                {referenciasInventarioFiltradas.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground text-xs border border-dashed rounded-xl p-6">
                    No se encontraron referencias con los filtros seleccionados.
                  </div>
                ) : (
                  referenciasInventarioFiltradas.slice(0, 30).map((item) => (
                    <Card key={item.referencia} className="border border-border/70 shadow-2xs hover:border-border transition-colors overflow-hidden">
                      <CardContent className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.descripcion}
                              className="h-16 w-16 rounded-xl object-cover border border-border/60 shrink-0 bg-background shadow-2xs"
                            />
                          ) : (
                            <div className="h-16 w-16 rounded-xl bg-muted/40 border border-border/60 flex flex-col items-center justify-center shrink-0 text-muted-foreground">
                              <Package className="h-6 w-6 opacity-60" />
                              <span className="text-[9px] mt-0.5 font-medium">Sin foto</span>
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-black text-xs text-primary">{item.referencia}</span>
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-bold px-2 py-0 ${
                                  item.saldoTotal >= 50
                                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                    : item.saldoTotal >= 10
                                    ? "bg-blue-500/10 text-blue-600 border-blue-500/30"
                                    : item.saldoTotal > 0
                                    ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                                    : "bg-rose-500/10 text-rose-600 border-rose-500/30"
                                }`}
                              >
                                {item.saldoTotal} unds en bodega
                              </Badge>
                              {item.bodegas.map((b) => (
                                <Badge key={b} variant="secondary" className="text-[9px] px-1.5 py-0">
                                  {b}
                                </Badge>
                              ))}
                            </div>

                            <p className="font-semibold text-xs text-foreground mt-0.5 line-clamp-1">{item.descripcion}</p>

                            <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1">
                              <span>
                                PVM: <strong className="text-foreground font-mono">{formatoCOP(item.pvm)}</strong>
                              </span>
                              <span>
                                PVP: <strong className="text-foreground font-mono">{formatoCOP(item.pvp)}</strong>
                              </span>
                              <span>{item.variantesCount} SKUs/Tallas</span>
                            </div>

                            {/* Tallas disponibles */}
                            {item.tallas.length > 0 && (
                              <div className="flex items-center gap-1 flex-wrap mt-1.5">
                                <span className="text-[10px] text-muted-foreground font-semibold">Tallas:</span>
                                {item.tallas.slice(0, 8).map((t) => (
                                  <span
                                    key={t.talla}
                                    className="text-[10px] font-mono px-1 py-0.2 bg-muted rounded border border-border/40 text-foreground"
                                  >
                                    {t.talla}:{t.saldo}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Botón Acción Oferta WhatsApp */}
                        <div className="flex items-center justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                          <Button
                            size="sm"
                            className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs font-semibold"
                            onClick={() => generarOfertaWhatsAppInventario(item)}
                          >
                            <Share2 className="h-3.5 w-3.5" />
                            Ofertar WhatsApp
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
                {referenciasInventarioFiltradas.length > 30 && (
                  <p className="text-center text-xs text-muted-foreground pt-2">
                    Mostrando las primeras 30 de {referenciasInventarioFiltradas.length} referencias. Usa el buscador para filtrar.
                  </p>
                )}
              </div>
            </TabsContent>

            {/* ========================================================================= */}
            {/* TAB 4: PLAN ESTRATÉGICO POR ZONAS */}
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
            {/* TAB 5: MIX DE PORTAFOLIO ABC (CON STOCK REAL & FOTOS) */}
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
                            Referencias Destacadas & Stock:
                          </p>
                          <div className="divide-y divide-border/40 border border-border/60 rounded-lg overflow-hidden">
                            {cat.itemsDestacados.map((item, itIdx) => (
                              <div key={itIdx} className="p-2.5 bg-background flex items-center justify-between gap-2.5 text-xs">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  {item.imageUrl ? (
                                    <img
                                      src={item.imageUrl}
                                      alt={item.nombre}
                                      className="h-10 w-10 rounded-md object-cover border border-border/60 shrink-0 bg-background"
                                    />
                                  ) : (
                                    <div className="h-10 w-10 rounded-md bg-muted/40 border border-border/60 flex items-center justify-center shrink-0 text-muted-foreground">
                                      <Package className="h-4 w-4" />
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-mono font-bold text-primary">{item.sku}</span>
                                      <span className="text-foreground font-medium truncate max-w-[200px]">{item.nombre}</span>
                                      {item.stockDisponible !== undefined && (
                                        <Badge
                                          variant="outline"
                                          className={`text-[9px] px-1.5 py-0 font-bold ${
                                            item.stockDisponible >= 20
                                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                              : item.stockDisponible > 0
                                              ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                                              : "bg-rose-500/10 text-rose-600 border-rose-500/30"
                                          }`}
                                        >
                                          {item.stockDisponible} unds
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">{item.recomendacion}</p>
                                  </div>
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
