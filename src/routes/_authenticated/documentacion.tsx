import { createFileRoute, useNavigate } from "@tanstack/react-router";
import React, { useState, useMemo } from "react";
import {
  ArrowLeft,
  BookOpen,
  Search,
  TrendingUp,
  Calendar,
  Globe,
  Award,
  ShoppingBag,
  Package,
  FileSpreadsheet,
  Users,
  UploadCloud,
  Sparkles,
  HelpCircle,
  Calculator,
  ShieldCheck,
  Target,
  CheckCircle2,
  AlertTriangle,
  Info,
  ChevronRight,
  ExternalLink,
  Layers,
  Filter,
  ArrowUpRight,
  Sparkle,
  Clock,
  DollarSign,
  Percent,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/documentacion")({
  head: () => ({
    meta: [
      { title: "Manual y Documentación | Trucco´s Jeans BI" },
      { property: "og:title", content: "Manual y Documentación | Trucco´s Jeans BI" },
    ],
  }),
  component: DocumentacionPage,
});

interface SeccionDoc {
  id: string;
  titulo: string;
  categoria: "general" | "dashboards" | "herramientas" | "referencia";
  icono: React.ElementType;
  resumen: string;
  tabPanel?: string;
  palabrasClave: string[];
}

const SECCIONES: SeccionDoc[] = [
  {
    id: "intro",
    titulo: "1. Visión General y Roles",
    categoria: "general",
    icono: ShieldCheck,
    resumen: "Propósito del BI, arquitectura de datos y diferencias entre perfil Directivo y Asesor Comercial.",
    palabrasClave: ["introduccion", "roles", "admin", "asesor", "seguridad", "permisos", "directivo"],
  },
  {
    id: "filtros",
    titulo: "2. Filtros y Modos de Enfoque",
    categoria: "general",
    icono: Filter,
    resumen: "Uso de selectores de fecha, asesores, zonas y los modos de aislamiento de pantalla.",
    palabrasClave: ["filtros", "fechas", "vendedores", "zonas", "ciudades", "enfoque", "slicers"],
  },
  {
    id: "d1",
    titulo: "3. D1: Cumplimiento y Ventas",
    categoria: "dashboards",
    icono: TrendingUp,
    resumen: "Metas de venta, % de cumplimiento, semaforización verde/amarillo/rojo y Pareto de asesores.",
    tabPanel: "d1",
    palabrasClave: ["d1", "cumplimiento", "metas", "semaforo", "asesores", "zonas", "territorial", "multianual"],
  },
  {
    id: "d2",
    titulo: "4. D2: Run Rate y Proyección",
    categoria: "dashboards",
    icono: Calendar,
    resumen: "Velocidad diaria de venta, días hábiles, proyección matemática a fin de mes y brecha de cuota.",
    tabPanel: "d2",
    palabrasClave: ["d2", "run rate", "proyeccion", "dias habiles", "cierre", "velocidad", "meta diaria"],
  },
  {
    id: "d3",
    titulo: "5. D3: Canales Digitales",
    categoria: "dashboards",
    icono: Globe,
    resumen: "E-Commerce (tienda virtual), Social Selling (WhatsApp), ventas directas y ticket promedio digital.",
    tabPanel: "d3",
    palabrasClave: ["d3", "digital", "ecommerce", "tienda online", "whatsapp", "social selling", "shopify"],
  },
  {
    id: "d4",
    titulo: "6. D4: Fuerza de Ventas",
    categoria: "dashboards",
    icono: Award,
    resumen: "Productividad en prendas físicas (unidades), ranking de asesores, ticket medio y estado de cartera.",
    tabPanel: "d4",
    palabrasClave: ["d4", "fuerza de ventas", "ranking", "unidades", "prendas", "cartera", "ticket promedio"],
  },
  {
    id: "d5",
    titulo: "7. D5: Marketplaces",
    categoria: "dashboards",
    icono: ShoppingBag,
    resumen: "Ventas y rotación de prendas en Mercado Libre, Falabella, Dafiti y centros de cumplimiento.",
    tabPanel: "d5",
    palabrasClave: ["d5", "marketplaces", "mercado libre", "falabella", "dafiti", "retail", "fulfillment"],
  },
  {
    id: "d6",
    titulo: "8. D6: Catálogo de Referencias",
    categoria: "dashboards",
    icono: Package,
    resumen: "Portafolio de prendas, curva ABC (Pareto 80/20), desglose de tallas/colores y tasas de devolución.",
    tabPanel: "d6",
    palabrasClave: ["d6", "referencias", "skus", "abc", "pareto", "tallas", "colores", "devoluciones", "prendas"],
  },
  {
    id: "d7",
    titulo: "9. D7: Pedidos vs Despachos",
    categoria: "dashboards",
    icono: FileSpreadsheet,
    resumen: "Monitoreo en tiempo real de pedidos HGI: pendientes, facturados, despachados y cumplimiento de entrega.",
    tabPanel: "explorador",
    palabrasClave: ["d7", "pedidos", "despachos", "hgi", "bodega", "logistica", "entregas", "facturacion"],
  },
  {
    id: "d8",
    titulo: "10. D8: Clientes Activados",
    categoria: "dashboards",
    icono: Users,
    resumen: "Fidelización de clientes: Nuevos, Crecimiento, Decrecimiento y Dormidos, con comparativa YoY.",
    tabPanel: "d8",
    palabrasClave: ["d8", "clientes", "fidelizacion", "nuevos", "dormidos", "crecimiento", "yoy", "recuperacion"],
  },
  {
    id: "mentor",
    titulo: "11. Mentor Comercial (IA)",
    categoria: "herramientas",
    icono: Sparkles,
    resumen: "Copiloto inteligente que analiza debilidades, sugiere productos de inventario y tácticas comerciales.",
    palabrasClave: ["mentor", "inteligencia artificial", "ia", "diagnostico", "copiloto", "recomendaciones"],
  },
  {
    id: "carga",
    titulo: "12. Carga de Datos",
    categoria: "herramientas",
    icono: UploadCloud,
    resumen: "Formatos Excel/CSV, columnas requeridas, streaming de subida, ingesta por lotes y validaciones.",
    tabPanel: "carga",
    palabrasClave: ["carga", "excel", "csv", "actualizar", "subir", "hgi", "lotes", "streaming"],
  },
  {
    id: "faq",
    titulo: "13. Preguntas Frecuentes & Casos Prácticos",
    categoria: "referencia",
    icono: HelpCircle,
    resumen: "Respuestas directas a las situaciones comerciales y operativas más habituales.",
    palabrasClave: ["faq", "preguntas", "casos de uso", "ayuda", "como saber", "enfriando", "meta"],
  },
  {
    id: "glosario",
    titulo: "14. Glosario de Fórmulas",
    categoria: "referencia",
    icono: Calculator,
    resumen: "Definición matemática y explicación gerencial de cada métrica calculada en la plataforma.",
    palabrasClave: ["glosario", "formulas", "run rate", "ticket promedio", "tasa devolucion", "pareto", "yoy"],
  },
];

export function DocumentacionPage() {
  const navigate = useNavigate();
  const [seccionActiva, setSeccionActiva] = useState<string>("intro");
  const [busqueda, setBusqueda] = useState<string>("");

  // Filtrado reactivo de secciones según búsqueda
  const seccionesFiltradas = useMemo(() => {
    if (!busqueda.trim()) return SECCIONES;
    const q = busqueda.toLowerCase().trim();
    return SECCIONES.filter(
      (s) =>
        s.titulo.toLowerCase().includes(q) ||
        s.resumen.toLowerCase().includes(q) ||
        s.palabrasClave.some((k) => k.toLowerCase().includes(q))
    );
  }, [busqueda]);

  const irAlDashboard = (tabKey?: string) => {
    if (tabKey) {
      window.location.href = `/panel?tab=${tabKey}`;
    } else {
      navigate({ to: "/panel" });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950/80 font-sans text-foreground">
      {/* Header Superior del Centro de Documentación */}
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-2xl shadow-2xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2.5 sm:px-6 sm:py-3.5 gap-3">
          {/* Logo y Título */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="grid h-9 w-9 sm:h-10 sm:w-10 place-items-center rounded-xl sm:rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-purple-800 text-white font-black text-base sm:text-lg shadow-md shadow-indigo-500/20 ring-1 ring-white/20 shrink-0">
              T
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-display text-base sm:text-lg font-bold tracking-tight text-foreground truncate">
                  Centro de Documentación
                </h1>
                <Badge variant="outline" className="hidden sm:inline-flex bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 text-[10px] font-bold rounded-full">
                  Manual Oficial
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate hidden sm:block">
                Guía completa de funcionamiento, métricas y dashboards de Trucco´s Jeans BI
              </p>
            </div>
          </div>

          {/* Buscador Rápido y Botón Volver */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="relative hidden md:block w-64 lg:w-80">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar dashboard, métrica, fórmula..."
                className="h-8.5 pl-8 text-xs bg-muted/40 border-border/70 rounded-xl focus-visible:ring-indigo-500"
              />
              {busqueda && (
                <button
                  type="button"
                  onClick={() => setBusqueda("")}
                  className="absolute right-2.5 top-2.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              )}
            </div>

            <Button
              variant="default"
              size="sm"
              onClick={() => irAlDashboard()}
              className="h-8.5 px-3 sm:px-4 text-xs font-bold rounded-xl gap-1.5 shadow-md shadow-indigo-500/20 bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Volver al Panel</span>
            </Button>
          </div>
        </div>

        {/* Buscador Móvil */}
        <div className="md:hidden px-3 pb-2.5">
          <div className="relative w-full">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar concepto, fórmula, dashboard..."
              className="h-8.5 pl-8 text-xs bg-muted/40 border-border/70 rounded-xl"
            />
          </div>
        </div>
      </header>

      {/* Contenido Principal con Layout de Centro de Documentación */}
      <div className="mx-auto max-w-7xl px-3 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* SIDEBAR DE NAVEGACIÓN (Desktop: sticky, Móvil: lista horizontal colapsable) */}
          <aside className="lg:col-span-4 xl:col-span-3.5 space-y-4">
            <div className="bg-card/90 backdrop-blur-xl border border-border/70 rounded-2xl p-3 sm:p-4 shadow-sm sticky top-20">
              <div className="flex items-center justify-between pb-3 border-b border-border/60 mb-2">
                <span className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-indigo-500" />
                  Tabla de Contenido
                </span>
                <span className="text-[11px] font-mono text-muted-foreground">
                  {seccionesFiltradas.length} temas
                </span>
              </div>

              {/* Lista de Secciones */}
              <nav className="space-y-1 max-h-[calc(100vh-180px)] overflow-y-auto pr-1">
                {seccionesFiltradas.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    No hay resultados para "{busqueda}".
                  </p>
                ) : (
                  seccionesFiltradas.map((seccion) => {
                    const Icono = seccion.icono;
                    const esActiva = seccionActiva === seccion.id;
                    return (
                      <button
                        key={seccion.id}
                        type="button"
                        onClick={() => {
                          setSeccionActiva(seccion.id);
                          const el = document.getElementById(seccion.id);
                          if (el) {
                            el.scrollIntoView({ behavior: "smooth", block: "start" });
                          }
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 transition-all duration-150",
                          esActiva
                            ? "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 shadow-2xs font-bold border border-indigo-500/30"
                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icono className={cn("h-4 w-4 shrink-0", esActiva ? "text-indigo-600 dark:text-indigo-400" : "text-muted-foreground")} />
                          <span className="truncate">{seccion.titulo}</span>
                        </div>
                        {seccion.tabPanel && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-mono shrink-0 bg-background/50">
                            Dashboard
                          </Badge>
                        )}
                      </button>
                    );
                  })
                )}
              </nav>

              {/* Botón Atajo a FAQ */}
              <div className="pt-3 mt-2 border-t border-border/50">
                <button
                  type="button"
                  onClick={() => {
                    setSeccionActiva("faq");
                    const el = document.getElementById("faq");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Sparkle className="h-3.5 w-3.5 text-amber-500" />
                  <span>Casos Prácticos & FAQ</span>
                </button>
              </div>
            </div>
          </aside>

          {/* CONTENIDO PRINCIPAL DE LA DOCUMENTACIÓN */}
          <main className="lg:col-span-8 xl:col-span-8.5 space-y-8">
            {/* SECCIÓN 1: INTRODUCCIÓN Y ROLES */}
            <section id="intro" className="scroll-mt-24 space-y-4">
              <Card className="border-border/80 shadow-xs overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent border-b border-border/60 pb-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-600 text-white font-bold shadow-xs">
                        <ShieldCheck className="h-4 w-4" />
                      </div>
                      <CardTitle className="text-lg font-bold">1. Visión General del Sistema y Roles</CardTitle>
                    </div>
                    <Badge variant="secondary" className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-bold text-xs">
                      Fundamentos
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Comprende el propósito central de Trucco´s Jeans BI y cómo se distribuyen los accesos y la confidencialidad.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 space-y-4 text-xs leading-relaxed">
                  <p>
                    <strong className="text-foreground font-semibold">Trucco´s Jeans BI</strong> es la plataforma unificada de inteligencia comercial y analítica de datos diseñada para reemplazar las hojas de cálculo estáticas de Excel por un tablero interactivo, veraz y actualizado en tiempo real. Permite evaluar el cumplimiento de metas comerciales, rotación física de prendas, cartera de asesores, despachos logísticos y fidelización de clientes.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5 space-y-2">
                      <div className="flex items-center gap-2 font-bold text-indigo-700 dark:text-indigo-300 text-sm">
                        <Award className="h-4 w-4" />
                        <span>Perfil: Directivo / Administrador</span>
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground text-[11.5px]">
                        <li>Visualización total del catálogo y los 8 dashboards.</li>
                        <li>Configuración y asignación de permisos a asesores.</li>
                        <li>Módulo de simulación para verificar qué ve exactamente cada vendedor.</li>
                        <li>Subida, actualización e ingesta de archivos Excel/CSV de HGI.</li>
                        <li>Análisis multianual comparativo año contra año (YoY).</li>
                      </ul>
                    </div>

                    <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-2">
                      <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-300 text-sm">
                        <Users className="h-4 w-4" />
                        <span>Perfil: Asesor Comercial</span>
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground text-[11.5px]">
                        <li>Vista restringida exclusivamente a sus clientes y ventas asignadas.</li>
                        <li>Seguimiento diario de su cuota mensual y velocidad de venta (Run Rate).</li>
                        <li>Monitoreo de pedidos tomados vs despachos físicos en bodega.</li>
                        <li>Detección inmediata de clientes enfriados o inactivos para reactivación.</li>
                        <li>Diagnóstico y recomendaciones tácticas del Mentor Comercial con IA.</li>
                      </ul>
                    </div>
                  </div>

                  <div className="p-3 bg-muted/40 rounded-xl border border-border/60 flex items-start gap-2.5">
                    <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-[11.5px] text-muted-foreground">
                      <strong className="text-foreground">Seguridad a nivel de fila (RLS):</strong> Si un asesor comercial ingresa con su correo registrado, la base de datos filtra matemáticamente solo sus registros. Ningún vendedor puede ver cifras, clientes o comisiones de otro colega.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* SECCIÓN 2: FILTROS Y MODOS DE ENFOQUE */}
            <section id="filtros" className="scroll-mt-24 space-y-4">
              <Card className="border-border/80 shadow-xs overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-transparent border-b border-border/60 pb-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="grid h-8 w-8 place-items-center rounded-xl bg-blue-600 text-white font-bold shadow-xs">
                        <Filter className="h-4 w-4" />
                      </div>
                      <CardTitle className="text-lg font-bold">2. Guía de Filtros Globales y Modos de Enfoque</CardTitle>
                    </div>
                    <Badge variant="outline" className="border-blue-500/30 text-blue-700 dark:text-blue-300 text-xs font-semibold">
                      Navegación
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Aprende a segmentar la información por fecha, asesor, región y activar los modos de aislamiento.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 space-y-4 text-xs leading-relaxed">
                  <p>
                    En la parte superior del panel se ubica la <strong className="text-foreground">Barra de Filtros Globales</strong>. Cualquier filtro que selecciones aquí afectará de manera sincronizada todas las métricas, tarjetas y gráficas de los dashboards.
                  </p>

                  <div className="space-y-3">
                    <div className="border border-border/60 rounded-xl p-3 bg-card space-y-1">
                      <span className="font-bold text-foreground text-xs flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-blue-500" />
                        Rango de Fechas (Período de Análisis)
                      </span>
                      <p className="text-[11.5px] text-muted-foreground">
                        Puedes escoger entre "Todo el Historial", un Año específico, un Mes específico o un rango personalizado (Desde / Hasta). Al filtrar por un mes (ej: Octubre 2026), los dashboards calculan las metas proporcionales a los días transcurridos de ese período.
                      </p>
                    </div>

                    <div className="border border-border/60 rounded-xl p-3 bg-card space-y-1">
                      <span className="font-bold text-foreground text-xs flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-amber-500" />
                        Selector de Asesores (Multi-select)
                      </span>
                      <p className="text-[11.5px] text-muted-foreground">
                        Permite elegir uno o varios vendedores simultáneamente para evaluar el rendimiento de un equipo regional conjunto. Si seleccionas un solo vendedor, se activa automáticamente el <strong>Modo Enfoque Vendedor</strong>, adaptando los tabs a sus necesidades operativas individuales.
                      </p>
                    </div>

                    <div className="border border-border/60 rounded-xl p-3 bg-card space-y-1">
                      <span className="font-bold text-foreground text-xs flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5 text-indigo-500" />
                        Modos de Enfoque de Pantalla
                      </span>
                      <p className="text-[11.5px] text-muted-foreground">
                        Para evitar distracciones, la plataforma cuenta con 3 modos de enfoque inteligente:
                      </p>
                      <ul className="list-disc list-inside text-[11px] text-muted-foreground pt-1 space-y-0.5">
                        <li><strong>Modo Enfoque Vendedor:</strong> Oculta canales impersonales (Marketplaces y Digital) y prioriza cumplimiento, pedidos y clientes del asesor.</li>
                        <li><strong>Modo Enfoque Territorial:</strong> Al filtrar por una Zona o Ciudad, se resaltan los mapas y desgloses de cobertura regional.</li>
                        <li><strong>Modo Enfoque Digital:</strong> Aisla exclusivamente los canales de E-commerce y WhatsApp.</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* SECCIÓN 3: DASHBOARD 1 - CUMPLIMIENTO */}
            <section id="d1" className="scroll-mt-24 space-y-4">
              <Card className="border-border/80 shadow-xs overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-transparent border-b border-border/60 pb-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="grid h-8 w-8 place-items-center rounded-xl bg-blue-600 text-white font-bold shadow-xs">
                        <TrendingUp className="h-4 w-4" />
                      </div>
                      <CardTitle className="text-lg font-bold">3. Dashboard 1: Cumplimiento y Ventas</CardTitle>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => irAlDashboard("d1")}
                      className="h-7 text-xs font-bold gap-1 border-blue-500/40 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
                    >
                      <span>Ir al Dashboard 1</span>
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                  <CardDescription className="text-xs">
                    El pulso financiero de Trucco´s Jeans: venta neta, meta comercial y cumplimiento porcentual.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 space-y-4 text-xs leading-relaxed">
                  <p>
                    Este es el dashboard principal de control gerencial y operativo. Compara la facturación neta comercial acumulada contra la cuota mensual fijada.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 text-center space-y-1">
                      <span className="font-bold text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Verde (≥ 100%)
                      </span>
                      <p className="text-[11px] text-muted-foreground">Meta cumplida. El asesor o equipo ha superado su objetivo presupuestal.</p>
                    </div>
                    <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 text-center space-y-1">
                      <span className="font-bold text-amber-700 dark:text-amber-300 text-xs flex items-center justify-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Amarillo (90% - 99.9%)
                      </span>
                      <p className="text-[11px] text-muted-foreground">Alerta preventiva. Requiere aceleración de pedidos en los días restantes.</p>
                    </div>
                    <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/5 text-center space-y-1">
                      <span className="font-bold text-rose-700 dark:text-rose-300 text-xs flex items-center justify-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Rojo (&lt; 90%)
                      </span>
                      <p className="text-[11px] text-muted-foreground">Desempeño crítico. Desfase considerable contra la meta comercial esperada.</p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <h4 className="font-bold text-foreground text-xs uppercase tracking-wider">Tablas y Gráficas Incluidas:</h4>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground text-[11.5px]">
                      <li><strong>Tabla Comparativa de Asesores:</strong> Desglose por vendedor con su meta, venta real, % cumplimiento con semáforo y ticket medio.</li>
                      <li><strong>Mapa y Tabla Territorial:</strong> Distribución geográfica de ventas en Colombia por zonas y ciudades con ranking de aporte.</li>
                      <li><strong>Top 10 Referencias Líderes:</strong> Prendas de mayor rotación física y facturación con clasificación ABC.</li>
                      <li><strong>Matriz Histórica Año × Mes:</strong> Comparativa multianual de facturación mes a mes para evaluar crecimiento YoY.</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* SECCIÓN 4: DASHBOARD 2 - RUN RATE */}
            <section id="d2" className="scroll-mt-24 space-y-4">
              <Card className="border-border/80 shadow-xs overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border-b border-border/60 pb-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-600 text-white font-bold shadow-xs">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <CardTitle className="text-lg font-bold">4. Dashboard 2: Run Rate y Proyección</CardTitle>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => irAlDashboard("d2")}
                      className="h-7 text-xs font-bold gap-1 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                    >
                      <span>Ir al Dashboard 2</span>
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                  <CardDescription className="text-xs">
                    Velocidad comercial diaria, proyección de cierre y cálculo de días hábiles restantes.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 space-y-4 text-xs leading-relaxed">
                  <p>
                    El <strong className="text-foreground">Run Rate</strong> responde a la pregunta más importante del mes: <em>"Al ritmo que estoy vendiendo hoy, ¿cuánto cerraré a fin de mes?"</em>.
                  </p>

                  <div className="bg-muted/40 p-3.5 rounded-xl border border-border/60 space-y-2">
                    <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                      <Calculator className="h-4 w-4 text-emerald-500" />
                      ¿Cómo se calcula el Run Rate Proyectado?
                    </span>
                    <p className="text-[11.5px] text-muted-foreground font-mono bg-background p-2 rounded-lg border border-border/50">
                      Proyección Cierre = (Venta Neta Acumulada / Días Hábiles Transcurridos) × Días Hábiles Totales del Mes
                    </p>
                    <p className="text-[11.5px] text-muted-foreground">
                      No toma en cuenta fines de semana o feriados sin despacho, asegurando que la velocidad diaria requerida refleje días comerciales efectivos de trabajo.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="p-3 rounded-xl border border-border/60 bg-card space-y-1">
                      <span className="font-bold text-xs text-foreground">Velocidad Diaria Real</span>
                      <p className="text-[11.5px] text-muted-foreground">
                        Es el promedio en dinero que el equipo o asesor está facturando por cada día hábil transcurrido del mes.
                      </p>
                    </div>
                    <div className="p-3 rounded-xl border border-border/60 bg-card space-y-1">
                      <span className="font-bold text-xs text-foreground">Velocidad Diaria Requerida</span>
                      <p className="text-[11.5px] text-muted-foreground">
                        Es el monto exacto que se debe facturar diariamente en los días hábiles que faltan para alcanzar la meta.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* SECCIÓN 5: DASHBOARD 3 - DIGITAL */}
            <section id="d3" className="scroll-mt-24 space-y-4">
              <Card className="border-border/80 shadow-xs overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent border-b border-border/60 pb-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-600 text-white font-bold shadow-xs">
                        <Globe className="h-4 w-4" />
                      </div>
                      <CardTitle className="text-lg font-bold">5. Dashboard 3: Canales Digitales y Social Selling</CardTitle>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => irAlDashboard("d3")}
                      className="h-7 text-xs font-bold gap-1 border-indigo-500/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10"
                    >
                      <span>Ir al Dashboard 3</span>
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                  <CardDescription className="text-xs">
                    Ventas en canales directos: Tienda Online (Shopify) y Social Selling asistido por WhatsApp.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 space-y-4 text-xs leading-relaxed">
                  <p>
                    Concentra el análisis de ventas en canales no tradicionales. Permite diferenciar los pedidos originados en la tienda web frente a los cierres personalizados generados por las asesoras de WhatsApp y redes sociales.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl border border-indigo-500/30 bg-indigo-500/5 space-y-1">
                      <span className="font-bold text-indigo-700 dark:text-indigo-300 text-xs">Tienda Virtual (E-commerce)</span>
                      <p className="text-[11.5px] text-muted-foreground">
                        Venta automatizada y autoservicio desde la plataforma web. Muestra ticket promedio y unidades por transacción directa.
                      </p>
                    </div>
                    <div className="p-3 rounded-xl border border-purple-500/30 bg-purple-500/5 space-y-1">
                      <span className="font-bold text-purple-700 dark:text-purple-300 text-xs">Social Selling (WhatsApp)</span>
                      <p className="text-[11.5px] text-muted-foreground">
                        Venta consultiva asistida. Identifica qué referencias tienen mayor tracción en canales conversacionales.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* SECCIÓN 6: DASHBOARD 4 - FUERZA DE VENTAS */}
            <section id="d4" className="scroll-mt-24 space-y-4">
              <Card className="border-border/80 shadow-xs overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent border-b border-border/60 pb-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="grid h-8 w-8 place-items-center rounded-xl bg-amber-600 text-white font-bold shadow-xs">
                        <Award className="h-4 w-4" />
                      </div>
                      <CardTitle className="text-lg font-bold">6. Dashboard 4: Fuerza de Ventas y Ranking de Asesores</CardTitle>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => irAlDashboard("d4")}
                      className="h-7 text-xs font-bold gap-1 border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
                    >
                      <span>Ir al Dashboard 4</span>
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                  <CardDescription className="text-xs">
                    Productividad física en prendas, ticket medio y semáforo de salud de cartera de cobro.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 space-y-4 text-xs leading-relaxed">
                  <p>
                    A diferencia del Dashboard 1 (que mide facturación en pesos), el Dashboard 4 evalúa el <strong className="text-foreground">volumen real de prendas comercializadas (unidades)</strong>. Esto evita que asesores que venden productos más costosos parezcan tener mayor productividad que quienes colocan un volumen masivo de prendas.
                  </p>

                  <div className="p-3.5 rounded-xl border border-border/60 bg-card space-y-2">
                    <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-amber-500" />
                      Semáforo de Cartera y Cobranza por Vendedor:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] pt-1">
                      <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-medium">
                        <strong>≤ 5% Mora:</strong> Cartera al día. Cliente sano y sujeto a despacho inmediato.
                      </div>
                      <div className="p-2 rounded-lg bg-amber-500/10 text-amber-800 dark:text-amber-300 font-medium">
                        <strong>5% - 15% Mora:</strong> Alerta de cobro. Se recomienda gestión preventiva.
                      </div>
                      <div className="p-2 rounded-lg bg-rose-500/10 text-rose-800 dark:text-rose-300 font-medium">
                        <strong>&gt; 15% Mora:</strong> Cartera crítica. Bloqueo de nuevos pedidos hasta normalizar pagos.
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* SECCIÓN 7: DASHBOARD 5 - MARKETPLACES */}
            <section id="d5" className="scroll-mt-24 space-y-4">
              <Card className="border-border/80 shadow-xs overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-pink-500/10 via-rose-500/5 to-transparent border-b border-border/60 pb-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="grid h-8 w-8 place-items-center rounded-xl bg-pink-600 text-white font-bold shadow-xs">
                        <ShoppingBag className="h-4 w-4" />
                      </div>
                      <CardTitle className="text-lg font-bold">7. Dashboard 5: Marketplaces y Retail Externo</CardTitle>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => irAlDashboard("d5")}
                      className="h-7 text-xs font-bold gap-1 border-pink-500/40 text-pink-600 dark:text-pink-400 hover:bg-pink-500/10"
                    >
                      <span>Ir al Dashboard 5</span>
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                  <CardDescription className="text-xs">
                    Rendimiento de ventas en Mercado Libre, Falabella, Dafiti y centros de cumplimiento fulfillment.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 space-y-4 text-xs leading-relaxed">
                  <p>
                    Permite monitorear el comportamiento de las prendas en vitrinas externas multimarca. Ayuda a planificar los traslados de stock hacia las bodegas de fulfillment de Mercado Libre o Falabella, asegurando que las prendas líderes nunca queden sin inventario disponible.
                  </p>
                </CardContent>
              </Card>
            </section>

            {/* SECCIÓN 8: DASHBOARD 6 - REFERENCIAS */}
            <section id="d6" className="scroll-mt-24 space-y-4">
              <Card className="border-border/80 shadow-xs overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-cyan-500/10 via-teal-500/5 to-transparent border-b border-border/60 pb-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="grid h-8 w-8 place-items-center rounded-xl bg-cyan-600 text-white font-bold shadow-xs">
                        <Package className="h-4 w-4" />
                      </div>
                      <CardTitle className="text-lg font-bold">8. Dashboard 6: Catálogo Global de Referencias & ABC</CardTitle>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => irAlDashboard("referencias")}
                      className="h-7 text-xs font-bold gap-1 border-cyan-500/40 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10"
                    >
                      <span>Ir al Dashboard 6</span>
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                  <CardDescription className="text-xs">
                    Curva de Pareto 80/20, desgloses por SKU en tallas y colores, y monitoreo de devoluciones.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 space-y-4 text-xs leading-relaxed">
                  <p>
                    Este módulo analiza el catálogo completo de productos de Trucco´s Jeans y aplica la <strong className="text-foreground">Clasificación ABC (Principio de Pareto)</strong>:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-1">
                      <span className="font-bold text-emerald-700 dark:text-emerald-300 text-xs">Clase A (Top ~80% Venta)</span>
                      <p className="text-[11px] text-muted-foreground">Las referencias estrella de alta rotación. No pueden faltar en bodega bajo ninguna circunstancia.</p>
                    </div>
                    <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-1">
                      <span className="font-bold text-amber-700 dark:text-amber-300 text-xs">Clase B (~15% Venta)</span>
                      <p className="text-[11px] text-muted-foreground">Productos de rotación intermedia o de temporada regular con demanda moderada.</p>
                    </div>
                    <div className="p-3 rounded-xl border border-slate-500/30 bg-slate-500/5 space-y-1">
                      <span className="font-bold text-slate-700 dark:text-slate-300 text-xs">Clase C (~5% Venta)</span>
                      <p className="text-[11px] text-muted-foreground">Referencias de baja rotación o cola larga (huesos). Candidatas a descuentos u outlets.</p>
                    </div>
                  </div>

                  <div className="p-3 bg-muted/40 rounded-xl border border-border/60 space-y-1">
                    <span className="font-bold text-foreground text-xs flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-cyan-500" />
                      Desglose de SKUs por Talla y Color
                    </span>
                    <p className="text-[11.5px] text-muted-foreground">
                      Al hacer clic en cualquier fila de la tabla o tarjeta móvil, se despliega el cajón interactivo con el desglose exacto de tallas (6, 8, 10, 12, 14, 16, etc.) y colores de esa referencia, indicando qué combinación aporta más unidades vendidas.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* SECCIÓN 9: DASHBOARD 7 - PEDIDOS VS DESPACHOS */}
            <section id="d7" className="scroll-mt-24 space-y-4">
              <Card className="border-border/80 shadow-xs overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-teal-500/10 via-emerald-500/5 to-transparent border-b border-border/60 pb-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="grid h-8 w-8 place-items-center rounded-xl bg-teal-600 text-white font-bold shadow-xs">
                        <FileSpreadsheet className="h-4 w-4" />
                      </div>
                      <CardTitle className="text-lg font-bold">9. Dashboard 7: Pedidos vs Despachos (HGI)</CardTitle>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => irAlDashboard("explorador")}
                      className="h-7 text-xs font-bold gap-1 border-teal-500/40 text-teal-600 dark:text-teal-400 hover:bg-teal-500/10"
                    >
                      <span>Ir al Dashboard 7</span>
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                  <CardDescription className="text-xs">
                    Trazabilidad en tiempo real entre pedidos tomados y lo efectivamente despachado por bodega.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 space-y-4 text-xs leading-relaxed">
                  <p>
                    Resuelve una de las mayores fricciones entre ventas y logística: saber si un pedido ya fue empacado, facturado y entregado a la transportadora, o si continúa retenido en bodega.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center text-[11px] pt-1">
                    <div className="p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-semibold">
                      Completado (100%)
                      <span className="block text-[10px] font-normal text-muted-foreground mt-0.5">Todas las prendas del pedido fueron despachadas.</span>
                    </div>
                    <div className="p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 font-semibold">
                      Despacho Parcial (&gt; 0%)
                      <span className="block text-[10px] font-normal text-muted-foreground mt-0.5">Parte del pedido ya salió, faltan prendas por stock.</span>
                    </div>
                    <div className="p-2.5 rounded-xl border border-slate-500/30 bg-slate-500/10 text-slate-800 dark:text-slate-300 font-semibold">
                      Pendiente (0%)
                      <span className="block text-[10px] font-normal text-muted-foreground mt-0.5">Pedido registrado sin orden de salida en bodega.</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* SECCIÓN 10: DASHBOARD 8 - CLIENTES ACTIVADOS */}
            <section id="d8" className="scroll-mt-24 space-y-4">
              <Card className="border-border/80 shadow-xs overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-purple-500/10 via-indigo-500/5 to-transparent border-b border-border/60 pb-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="grid h-8 w-8 place-items-center rounded-xl bg-purple-600 text-white font-bold shadow-xs">
                        <Users className="h-4 w-4" />
                      </div>
                      <CardTitle className="text-lg font-bold">10. Dashboard 8: Clientes Activados y Fidelización</CardTitle>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => irAlDashboard("d8")}
                      className="h-7 text-xs font-bold gap-1 border-purple-500/40 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10"
                    >
                      <span>Ir al Dashboard 8</span>
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                  <CardDescription className="text-xs">
                    Matriz de clientes por estado de compra y comparativa visual YoY en tarjetas móviles.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 space-y-4 text-xs leading-relaxed">
                  <p>
                    La retención de clientes es fundamental para la rentabilidad de Trucco´s Jeans. Este dashboard categoriza a cada cliente registrado en el sistema según su comportamiento de compra comparado contra el mismo período del año anterior:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-1">
                      <span className="font-bold text-emerald-700 dark:text-emerald-300 text-xs">✨ Cliente Nuevo</span>
                      <p className="text-[11.5px] text-muted-foreground">Compró en el período actual y no registraba ninguna compra en el año anterior. Es un cliente ganado.</p>
                    </div>
                    <div className="p-3 rounded-xl border border-blue-500/30 bg-blue-500/5 space-y-1">
                      <span className="font-bold text-blue-700 dark:text-blue-300 text-xs">📈 Cliente en Crecimiento</span>
                      <p className="text-[11.5px] text-muted-foreground">Compró en ambos años pero incrementó su facturación este año (YoY positivo).</p>
                    </div>
                    <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-1">
                      <span className="font-bold text-amber-700 dark:text-amber-300 text-xs">⚠️ Cliente en Decrecimiento</span>
                      <p className="text-[11.5px] text-muted-foreground">Compró en ambos años pero redujo su volumen de compra. Alerta para el asesor comercial.</p>
                    </div>
                    <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/5 space-y-1">
                      <span className="font-bold text-rose-700 dark:text-rose-300 text-xs">❄️ Cliente Dormido / Inactivo</span>
                      <p className="text-[11.5px] text-muted-foreground">Compró el año anterior pero no ha realizado ninguna compra en el período actual. Cliente en fuga.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* SECCIÓN 11: MENTOR COMERCIAL CON IA */}
            <section id="mentor" className="scroll-mt-24 space-y-4">
              <Card className="border-border/80 shadow-xs overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-purple-500/15 via-indigo-500/10 to-transparent border-b border-border/60 pb-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-bold shadow-xs">
                        <Sparkles className="h-4 w-4 text-amber-300" />
                      </div>
                      <CardTitle className="text-lg font-bold">11. Mentor Comercial Inteligente (IA)</CardTitle>
                    </div>
                    <Badge variant="secondary" className="bg-purple-500/20 text-purple-700 dark:text-purple-300 font-bold text-xs">
                      Inteligencia Artificial
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Copiloto analítico automatizado para sugerencias de venta e inventario por asesor.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 space-y-4 text-xs leading-relaxed">
                  <p>
                    El botón <strong className="text-foreground">"Mentor Comercial"</strong> presente en la barra superior del panel abre un cajón inteligente que analiza los datos actuales y genera automáticamente:
                  </p>
                  <ul className="list-disc list-inside space-y-1.5 text-muted-foreground text-[11.5px]">
                    <li><strong>Diagnóstico de Desempeño:</strong> Identifica brechas en la cuota mensual y tendencias de venta del asesor.</li>
                    <li><strong>Recomendaciones de Inventario:</strong> Detecta referencias líderes en stock físico que el asesor no ha ofrecido a su cartera.</li>
                    <li><strong>Sugerencias Tácticas:</strong> Tips de cierre comercial personalizados según la temporada comercial (Día de la Madre, Amor y Amistad, Navidad, etc.).</li>
                  </ul>
                </CardContent>
              </Card>
            </section>

            {/* SECCIÓN 12: CARGA Y ACTUALIZACIÓN DE DATOS */}
            <section id="carga" className="scroll-mt-24 space-y-4">
              <Card className="border-border/80 shadow-xs overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-slate-500/10 via-zinc-500/5 to-transparent border-b border-border/60 pb-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="grid h-8 w-8 place-items-center rounded-xl bg-slate-700 text-white font-bold shadow-xs">
                        <UploadCloud className="h-4 w-4" />
                      </div>
                      <CardTitle className="text-lg font-bold">12. Carga y Actualización de Datos (Directivos)</CardTitle>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => irAlDashboard("carga")}
                      className="h-7 text-xs font-bold gap-1 border-slate-500/40 text-slate-700 dark:text-slate-300 hover:bg-slate-500/10"
                    >
                      <span>Ir a Carga de Datos</span>
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                  <CardDescription className="text-xs">
                    Cómo cargar y procesar archivos de ventas procedentes del ERP HGI sin saturar el navegador.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 space-y-4 text-xs leading-relaxed">
                  <p>
                    El módulo de carga permite importar archivos planos en formato Excel (`.xlsx`) o CSV exportados desde HGI. El sistema procesa los archivos mediante <em>Streaming</em> por lotes de 1.000 registros para soportar archivos de cientos de miles de filas con máxima estabilidad.
                  </p>

                  <div className="bg-muted/40 p-3 rounded-xl border border-border/60 space-y-2">
                    <span className="font-bold text-xs text-foreground">Columnas Clave Esperadas:</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                      <span className="p-1.5 bg-background rounded border border-border/50 text-center">FECHA_FAC</span>
                      <span className="p-1.5 bg-background rounded border border-border/50 text-center">VALOR_NETO</span>
                      <span className="p-1.5 bg-background rounded border border-border/50 text-center">CAN_FAC</span>
                      <span className="p-1.5 bg-background rounded border border-border/50 text-center">COD_VEND</span>
                      <span className="p-1.5 bg-background rounded border border-border/50 text-center">NOM_VEND</span>
                      <span className="p-1.5 bg-background rounded border border-border/50 text-center">COD_PROD / SKU</span>
                      <span className="p-1.5 bg-background rounded border border-border/50 text-center">NOM_TER</span>
                      <span className="p-1.5 bg-background rounded border border-border/50 text-center">ZONA / CIUDAD</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* SECCIÓN 13: CASOS DE USO PRÁCTICOS Y FAQ */}
            <section id="faq" className="scroll-mt-24 space-y-4">
              <Card className="border-border/80 shadow-xs overflow-hidden border-amber-500/30">
                <CardHeader className="bg-gradient-to-r from-amber-500/15 via-orange-500/5 to-transparent border-b border-border/60 pb-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="grid h-8 w-8 place-items-center rounded-xl bg-amber-600 text-white font-bold shadow-xs">
                        <HelpCircle className="h-4 w-4" />
                      </div>
                      <CardTitle className="text-lg font-bold">13. Preguntas Frecuentes y Casos Prácticos de Venta</CardTitle>
                    </div>
                    <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-300 font-bold text-xs">
                      Casos de Uso
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Guía de resolución rápida para las preguntas comerciales más cotidianas.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 space-y-4 text-xs leading-relaxed divide-y divide-border/60">
                  {/* Pregunta 1 */}
                  <div className="pt-3 first:pt-0 space-y-1.5">
                    <h4 className="font-bold text-foreground text-sm flex items-center gap-2">
                      <span className="grid h-5 w-5 place-items-center rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold">1</span>
                      ¿Cómo sé si un cliente de mi cartera se está enfriando o dejando de comprar?
                    </h4>
                    <p className="text-muted-foreground text-[11.5px] pl-7">
                      Ve al <strong className="text-foreground">Dashboard 8 (Clientes Activados)</strong>. En el filtro de estado selecciona <em>"Decrecimiento"</em> o <em>"Dormidos"</em>. Las tarjetas móviles te mostrarán en barras rojas/grises cuánta venta se ha perdido frente al año anterior para que programes una llamada de reactivación prioritaria.
                    </p>
                  </div>

                  {/* Pregunta 2 */}
                  <div className="pt-3 space-y-1.5">
                    <h4 className="font-bold text-foreground text-sm flex items-center gap-2">
                      <span className="grid h-5 w-5 place-items-center rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold">2</span>
                      ¿Cómo calcular cuánto debo vender diariamente para alcanzar mi meta del mes?
                    </h4>
                    <p className="text-muted-foreground text-[11.5px] pl-7">
                      Ingresa al <strong className="text-foreground">Dashboard 2 (Run Rate)</strong>. Revisa la métrica <em>"Velocidad Diaria Requerida"</em>. Te indicará la cifra monetaria exacta que debes facturar por cada día hábil restante para asegurar el 100% de cumplimiento.
                    </p>
                  </div>

                  {/* Pregunta 3 */}
                  <div className="pt-3 space-y-1.5">
                    <h4 className="font-bold text-foreground text-sm flex items-center gap-2">
                      <span className="grid h-5 w-5 place-items-center rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold">3</span>
                      ¿Cómo sé qué tallas o colores son los más vendidos de una prenda?
                    </h4>
                    <p className="text-muted-foreground text-[11.5px] pl-7">
                      En el <strong className="text-foreground">Dashboard 6 (Catálogo de Referencias)</strong>, busca la referencia y toca el botón <em>"Ver desglose de SKUs"</em>. Se abrirá una tabla/tarjeta detallando la curva de demanda exacta por talla (ej: Talla 8 y 10 con 65% de la rotación) y color.
                    </p>
                  </div>

                  {/* Pregunta 4 */}
                  <div className="pt-3 space-y-1.5">
                    <h4 className="font-bold text-foreground text-sm flex items-center gap-2">
                      <span className="grid h-5 w-5 place-items-center rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold">4</span>
                      ¿Cómo saber si los pedidos tomados ya fueron despachados por bodega?
                    </h4>
                    <p className="text-muted-foreground text-[11.5px] pl-7">
                      Ve al <strong className="text-foreground">Dashboard 7 (Pedidos vs Despachos)</strong>. Filtra por tu nombre o por el NIT del cliente. La barra de progreso de cada pedido te mostrará el porcentaje exacto empacado y facturado versus lo que sigue en espera de stock.
                    </p>
                  </div>

                  {/* Pregunta 5 */}
                  <div className="pt-3 space-y-1.5">
                    <h4 className="font-bold text-foreground text-sm flex items-center gap-2">
                      <span className="grid h-5 w-5 place-items-center rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold">5</span>
                      ¿Por qué un vendedor aparece con semáforo rojo en Cartera?
                    </h4>
                    <p className="text-muted-foreground text-[11.5px] pl-7">
                      En el <strong className="text-foreground">Dashboard 4</strong>, si más del 15% del saldo pendiente de un asesor supera los días de crédito estipulados, el sistema enciende automáticamente el semáforo rojo de riesgo de cobro para evitar despachar a clientes en mora prolongada.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* SECCIÓN 14: GLOSARIO DE FÓRMULAS */}
            <section id="glosario" className="scroll-mt-24 space-y-4">
              <Card className="border-border/80 shadow-xs overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent border-b border-border/60 pb-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-600 text-white font-bold shadow-xs">
                        <Calculator className="h-4 w-4" />
                      </div>
                      <CardTitle className="text-lg font-bold">14. Glosario de Fórmulas y Métricas Comerciales</CardTitle>
                    </div>
                    <Badge variant="secondary" className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-bold text-xs">
                      Diccionario
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Explicación matemática de los cálculos utilizados en todos los paneles.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 space-y-4 text-xs leading-relaxed">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div className="p-3.5 rounded-xl border border-border/60 bg-card space-y-1.5">
                      <span className="font-bold text-foreground text-xs">Venta Neta Comercial</span>
                      <p className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400 bg-indigo-500/5 p-1.5 rounded border border-indigo-500/20">
                        Venta Bruta - Devoluciones - Descuentos Comerciales
                      </p>
                      <p className="text-[11px] text-muted-foreground">Es la facturación real y definitiva que ingresa a la compañía tras deducir notas crédito.</p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-border/60 bg-card space-y-1.5">
                      <span className="font-bold text-foreground text-xs">Cumplimiento de Meta (%)</span>
                      <p className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 p-1.5 rounded border border-emerald-500/20">
                        (Venta Neta Acumulada / Meta Presupuestal) × 100
                      </p>
                      <p className="text-[11px] text-muted-foreground">Porcentaje de logro de la cuota. Valores &gt;= 100% activan semáforo verde.</p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-border/60 bg-card space-y-1.5">
                      <span className="font-bold text-foreground text-xs">Ticket Promedio por Cliente</span>
                      <p className="font-mono text-[11px] text-blue-600 dark:text-blue-400 bg-blue-500/5 p-1.5 rounded border border-blue-500/20">
                        Venta Neta Total / Número de Clientes Activos
                      </p>
                      <p className="text-[11px] text-muted-foreground">Monto monetario promedio que cada cliente compra en el período analizado.</p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-border/60 bg-card space-y-1.5">
                      <span className="font-bold text-foreground text-xs">Tasa de Devolución (%)</span>
                      <p className="font-mono text-[11px] text-rose-600 dark:text-rose-400 bg-rose-500/5 p-1.5 rounded border border-rose-500/20">
                        (Valor de Devoluciones / Venta Bruta) × 100
                      </p>
                      <p className="text-[11px] text-muted-foreground">Porcentaje de prendas devueltas por garantía, talla o inconformidad del cliente.</p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-border/60 bg-card space-y-1.5">
                      <span className="font-bold text-foreground text-xs">Crecimiento Multianual (YoY %)</span>
                      <p className="font-mono text-[11px] text-purple-600 dark:text-purple-400 bg-purple-500/5 p-1.5 rounded border border-purple-500/20">
                        ((Venta Actual - Venta Año Anterior) / Venta Año Anterior) × 100
                      </p>
                      <p className="text-[11px] text-muted-foreground">Variación porcentual interanual comparando exactamente los mismos meses.</p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-border/60 bg-card space-y-1.5">
                      <span className="font-bold text-foreground text-xs">Pareto Catálogo ABC</span>
                      <p className="font-mono text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/5 p-1.5 rounded border border-amber-500/20">
                        Clase A: 0% a 80% • Clase B: 80% a 95% • Clase C: 95% a 100%
                      </p>
                      <p className="text-[11px] text-muted-foreground">Clasificación acumulativa de ingresos por SKU ordenados de mayor a menor facturación.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
