"use client";

import React from "react";
import {
  TrendingUp,
  Calendar,
  Globe,
  Award,
  ShoppingBag,
  Package,
  FileSpreadsheet,
  Users,
  UploadCloud,
  ChevronRight,
  Sparkles,
  BookOpen,
  LayoutDashboard,
  ShieldCheck,
  Target,
  Layers,
  Factory,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface VentanaInicialDashboardsMovilProps {
  onSeleccionarDashboard: (tabKey: string) => void;
  puedeVerDigital?: boolean;
  puedeVerMarketplaces?: boolean;
  esAdmin?: boolean;
  vendedorNombre?: string;
  periodoEtiqueta?: string;
  onAbrirMentor?: () => void;
  onAbrirDocs?: () => void;
}

interface OpcionDashboard {
  id: string;
  numero: string;
  titulo: string;
  subtitulo: string;
  badge: string;
  icono: React.ElementType;
  colorGradiente: string;
  colorTexto: string;
  colorBorde: string;
  colorFondo: string;
  colorBadge: string;
}

export function VentanaInicialDashboardsMovil({
  onSeleccionarDashboard,
  puedeVerDigital = false,
  puedeVerMarketplaces = false,
  esAdmin = false,
  vendedorNombre,
  periodoEtiqueta,
  onAbrirMentor,
  onAbrirDocs,
}: VentanaInicialDashboardsMovilProps) {
  // Construcción de la lista de opciones según permisos
  const opciones: OpcionDashboard[] = [
    {
      id: "d1",
      numero: "1",
      titulo: "Cumplimiento y Ventas",
      subtitulo: "Meta comercial, facturación neta, % cumplimiento y semáforo",
      badge: "Ventas & Metas",
      icono: TrendingUp,
      colorGradiente: "from-blue-600 to-indigo-600",
      colorTexto: "text-blue-700 dark:text-blue-300",
      colorBorde: "border-blue-500/30 active:border-blue-500/60",
      colorFondo: "bg-blue-500/5 active:bg-blue-500/10",
      colorBadge: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
    },
    {
      id: "d2",
      numero: "2",
      titulo: "Run Rate y Proyección",
      subtitulo: "Velocidad diaria de venta, días hábiles y proyección de cierre",
      badge: "Proyección",
      icono: Calendar,
      colorGradiente: "from-emerald-600 to-teal-600",
      colorTexto: "text-emerald-700 dark:text-emerald-300",
      colorBorde: "border-emerald-500/30 active:border-emerald-500/60",
      colorFondo: "bg-emerald-500/5 active:bg-emerald-500/10",
      colorBadge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    },
    ...(puedeVerDigital
      ? [
          {
            id: "d3",
            numero: "3",
            titulo: "Canales Digitales",
            subtitulo: "Tienda online Shopify, Social Selling (WhatsApp) y tickets",
            badge: "E-Commerce",
            icono: Globe,
            colorGradiente: "from-indigo-600 to-purple-600",
            colorTexto: "text-indigo-700 dark:text-indigo-300",
            colorBorde: "border-indigo-500/30 active:border-indigo-500/60",
            colorFondo: "bg-indigo-500/5 active:bg-indigo-500/10",
            colorBadge: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
          },
        ]
      : []),
    {
      id: "d4",
      numero: "4",
      titulo: "Fuerza de Ventas",
      subtitulo: "Ranking de asesores por prendas físicas (unidades) y cartera",
      badge: "Productividad",
      icono: Award,
      colorGradiente: "from-amber-600 to-orange-600",
      colorTexto: "text-amber-700 dark:text-amber-300",
      colorBorde: "border-amber-500/30 active:border-amber-500/60",
      colorFondo: "bg-amber-500/5 active:bg-amber-500/10",
      colorBadge: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
    },
    ...(puedeVerMarketplaces
      ? [
          {
            id: "d5",
            numero: "5",
            titulo: "Marketplaces y Retail",
            subtitulo: "Mercado Libre, Falabella, rotación y centros de cumplimiento",
            badge: "Retail Externo",
            icono: ShoppingBag,
            colorGradiente: "from-pink-600 to-rose-600",
            colorTexto: "text-pink-700 dark:text-pink-300",
            colorBorde: "border-pink-500/30 active:border-pink-500/60",
            colorFondo: "bg-pink-500/5 active:bg-pink-500/10",
            colorBadge: "bg-pink-500/15 text-pink-700 dark:text-pink-300 border-pink-500/30",
          },
        ]
      : []),
    {
      id: "referencias",
      numero: "6",
      titulo: "Catálogo de Referencias",
      subtitulo: "Curva ABC (Pareto 80/20), desgloses por talla/color y devoluciones",
      badge: "Curva ABC",
      icono: Package,
      colorGradiente: "from-cyan-600 to-blue-600",
      colorTexto: "text-cyan-700 dark:text-cyan-300",
      colorBorde: "border-cyan-500/30 active:border-cyan-500/60",
      colorFondo: "bg-cyan-500/5 active:bg-cyan-500/10",
      colorBadge: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30",
    },
    {
      id: "explorador",
      numero: "7",
      titulo: "Pedidos vs Despachos",
      subtitulo: "Trazabilidad de pedidos tomados en HGI vs entregados en bodega",
      badge: "Logística HGI",
      icono: FileSpreadsheet,
      colorGradiente: "from-teal-600 to-emerald-600",
      colorTexto: "text-teal-700 dark:text-teal-300",
      colorBorde: "border-teal-500/30 active:border-teal-500/60",
      colorFondo: "bg-teal-500/5 active:bg-teal-500/10",
      colorBadge: "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30",
    },
    {
      id: "d8",
      numero: "8",
      titulo: "Clientes Activados",
      subtitulo: "Fidelización: Clientes nuevos, en crecimiento, decrecimiento y dormidos",
      badge: "Fidelización",
      icono: Users,
      colorGradiente: "from-purple-600 to-indigo-600",
      colorTexto: "text-purple-700 dark:text-purple-300",
      colorBorde: "border-purple-500/30 active:border-purple-500/60",
      colorFondo: "bg-purple-500/5 active:bg-purple-500/10",
      colorBadge: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
    },
    ...(esAdmin
      ? [
          {
            id: "correrias",
            numero: "9",
            titulo: "Análisis de Correrías",
            subtitulo: "Trazabilidad de referencias vendidas por correría, PVM, PVP y diseño",
            badge: "Solo Admin",
            icono: Layers,
            colorGradiente: "from-rose-600 to-indigo-600",
            colorTexto: "text-rose-700 dark:text-rose-300",
            colorBorde: "border-rose-500/30 active:border-rose-500/60",
            colorFondo: "bg-rose-500/5 active:bg-rose-500/10",
            colorBadge: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
          },
          {
            id: "programacion-produccion",
            numero: "10",
            titulo: "Programación de Producción",
            subtitulo: "Referencias con pedido sin inventario para evaluar reprogramación",
            badge: "Solo Admin",
            icono: Factory,
            colorGradiente: "from-indigo-600 to-cyan-600",
            colorTexto: "text-indigo-700 dark:text-indigo-300",
            colorBorde: "border-indigo-500/30 active:border-indigo-500/60",
            colorFondo: "bg-indigo-500/5 active:bg-indigo-500/10",
            colorBadge: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
          },
          {
            id: "carga",
            numero: "⚙️",
            titulo: "Carga de Datos",
            subtitulo: "Subida e ingesta de archivos planos Excel y CSV de ventas HGI",
            badge: "Administrador",
            icono: UploadCloud,
            colorGradiente: "from-slate-600 to-zinc-700",
            colorTexto: "text-slate-700 dark:text-slate-300",
            colorBorde: "border-slate-500/30 active:border-slate-500/60",
            colorFondo: "bg-slate-500/5 active:bg-slate-500/10",
            colorBadge: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30",
          },
        ]
      : []),
  ];

  return (
    <div className="sm:hidden space-y-4 pb-12 animate-in fade-in-50 duration-300">
      {/* Tarjeta de Bienvenida y Encabezado de la Ventana Inicial */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/80 via-slate-900 to-slate-950 p-4 text-white shadow-md">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-[10px] font-bold">
              <LayoutDashboard className="h-3 w-3" />
              <span>Centro de Módulos Móvil</span>
            </div>
            <h2 className="text-base font-bold tracking-tight text-white font-display">
              {vendedorNombre ? `Hola, ${vendedorNombre}` : "Analítica Comercial Trucco´s"}
            </h2>
            <p className="text-xs text-slate-300 leading-snug">
              Selecciona el dashboard que deseas consultar:
            </p>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-black text-lg shadow-md shrink-0">
            T
          </div>
        </div>

        {periodoEtiqueta && (
          <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-300">
            <span className="opacity-80">Período activo:</span>
            <span className="font-mono font-semibold text-white bg-white/10 px-2 py-0.5 rounded-md">
              {periodoEtiqueta}
            </span>
          </div>
        )}
      </div>

      {/* Grid de Opciones de Dashboards (Diseñado para toques cómodos con el pulgar) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Módulos Disponibles ({opciones.length})
          </span>
          <span className="text-[10px] text-muted-foreground font-medium">
            Toca uno para abrir
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          {opciones.map((opcion) => {
            const Icono = opcion.icono;
            return (
              <button
                key={opcion.id}
                type="button"
                onClick={() => onSeleccionarDashboard(opcion.id)}
                className={cn(
                  "w-full text-left p-3.5 rounded-2xl border transition-all duration-200 select-none",
                  "flex items-center justify-between gap-3 shadow-2xs group cursor-pointer",
                  opcion.colorFondo,
                  opcion.colorBorde,
                  "active:scale-[0.98] active:shadow-inner"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Ícono con Gradiente de Color */}
                  <div
                    className={cn(
                      "grid h-11 w-11 place-items-center rounded-xl text-white font-bold shadow-xs shrink-0",
                      `bg-gradient-to-tr ${opcion.colorGradiente}`
                    )}
                  >
                    <Icono className="h-5 w-5" />
                  </div>

                  {/* Textos Informativos */}
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">
                        {opcion.titulo}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn("text-[9px] px-1.5 py-0 font-bold rounded-full", opcion.colorBadge)}
                      >
                        {opcion.badge}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-1 leading-tight">
                      {opcion.subtitulo}
                    </p>
                  </div>
                </div>

                {/* Flecha Indicadora */}
                <div className="grid h-8 w-8 place-items-center rounded-full bg-background/80 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 border border-border/60 shadow-2xs">
                  <ChevronRight className="h-4 w-4" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Accesos Rápidos Complementarios (Mentor IA y Manual de Usuario) */}
      <div className="pt-2 grid grid-cols-2 gap-2">
        {onAbrirMentor && (
          <button
            type="button"
            onClick={onAbrirMentor}
            className="p-3 rounded-2xl bg-gradient-to-r from-purple-600/10 via-indigo-600/10 to-indigo-700/10 border border-purple-500/30 text-left space-y-1 active:scale-95 transition-all"
          >
            <div className="flex items-center gap-1.5 font-bold text-xs text-purple-700 dark:text-purple-300">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>Mentor IA</span>
            </div>
            <p className="text-[10.5px] text-muted-foreground line-clamp-2">
              Diagnóstico y sugerencias comerciales
            </p>
          </button>
        )}

        {onAbrirDocs && (
          <button
            type="button"
            onClick={onAbrirDocs}
            className="p-3 rounded-2xl bg-muted/40 border border-border/70 text-left space-y-1 active:scale-95 transition-all"
          >
            <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
              <BookOpen className="h-3.5 w-3.5 text-indigo-500" />
              <span>Manual y Guía</span>
            </div>
            <p className="text-[10.5px] text-muted-foreground line-clamp-2">
              Aprende a interpretar cada métrica
            </p>
          </button>
        )}
      </div>
    </div>
  );
}
