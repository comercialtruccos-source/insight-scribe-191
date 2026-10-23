"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  Calendar,
  Globe,
  Award,
  ShoppingBag,
  Package,
  FileSpreadsheet,
  Users,
  Layers,
  UploadCloud,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface BarraNavegacionDashboardsProps {
  tabActivo: string;
  esAdmin?: boolean;
  puedeVerDigital?: boolean;
  puedeVerMarketplaces?: boolean;
  modoEnfoque?: "ninguno" | "vendedor" | "territorio";
  className?: string;
}

export function BarraNavegacionDashboards({
  tabActivo,
  esAdmin = false,
  puedeVerDigital = false,
  puedeVerMarketplaces = false,
  modoEnfoque = "ninguno",
  className,
}: BarraNavegacionDashboardsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Determinar visibilidad de canales según permisos y modo de enfoque
  const mostrarDigital = puedeVerDigital && modoEnfoque === "ninguno";
  const mostrarMarketplaces = puedeVerMarketplaces && modoEnfoque === "ninguno";

  // Verificar si hay overflow horizontal para mostrar botones de desplazamiento
  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const hasOverflow = el.scrollWidth > el.clientWidth + 4;
    setCanScrollLeft(hasOverflow && el.scrollLeft > 6);
    setCanScrollRight(hasOverflow && el.scrollLeft < el.scrollWidth - el.clientWidth - 6);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    checkScroll();

    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);

    // Revisión diferida para cuando las fuentes e iconos terminen de renderizarse
    const timer = setTimeout(checkScroll, 200);

    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
      clearTimeout(timer);
    };
  }, [checkScroll, mostrarDigital, mostrarMarketplaces, esAdmin]);

  // Desplazar suavemente el tab activo al centro visible cuando cambia
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const timer = setTimeout(() => {
      const activeEl = el.querySelector<HTMLElement>('[data-state="active"]');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
      }
      checkScroll();
    }, 80);

    return () => clearTimeout(timer);
  }, [tabActivo, checkScroll]);

  // Permitir scroll horizontal natural con la rueda del ratón (mouse wheel)
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el) return;

    if (e.deltaY !== 0 && el.scrollWidth > el.clientWidth) {
      el.scrollLeft += e.deltaY;
      checkScroll();
    }
  };

  const handleScroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const offset = direction === "left" ? -280 : 280;
    el.scrollBy({ left: offset, behavior: "smooth" });
  };

  return (
    <div className={cn("relative group/nav-bar w-full select-none", className)}>
      {/* Botón flotante para scroll a la izquierda */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => handleScroll("left")}
          className="absolute left-1 top-1/2 -translate-y-1/2 z-20 grid h-7 w-7 place-items-center rounded-xl bg-background/90 dark:bg-card/90 border border-border/80 shadow-md text-foreground hover:bg-muted transition-all backdrop-blur-md"
          title="Desplazar a la izquierda"
          aria-label="Desplazar tabs a la izquierda"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}

      {/* Degradado indicador izquierdo */}
      {canScrollLeft && (
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-card to-transparent pointer-events-none z-10 rounded-l-2xl" />
      )}

      {/* Contenedor TabsList fluido */}
      <TabsList
        ref={scrollRef}
        onWheel={handleWheel}
        className="flex w-full overflow-x-auto scrollbar-none snap-x items-center gap-1.5 p-1.5 bg-card/90 dark:bg-card/85 backdrop-blur-xl rounded-2xl border border-border/70 shadow-2xs h-auto min-h-[48px]"
      >
        {/* TAB 1: CUMPLIMIENTO */}
        <TabsTrigger
          value="d1"
          title="Dashboard 1: Cumplimiento y Ventas vs Presupuesto"
          className="flex items-center gap-1.5 py-2 px-2.5 lg:px-3 text-xs font-bold rounded-xl shrink-0 snap-start whitespace-nowrap transition-all duration-200 border border-transparent data-[state=active]:bg-blue-500/15 data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-300 data-[state=active]:border-blue-500/30 data-[state=active]:shadow-xs text-muted-foreground hover:text-foreground hover:bg-muted/50"
        >
          <TrendingUp className="h-3.5 w-3.5 text-blue-500 shrink-0" />
          <span>1. Cumplimiento</span>
        </TabsTrigger>

        {/* TAB 2: RUN RATE */}
        <TabsTrigger
          value="d2"
          title="Dashboard 2: Run Rate, Velocidad de Venta y Proyección"
          className="flex items-center gap-1.5 py-2 px-2.5 lg:px-3 text-xs font-bold rounded-xl shrink-0 snap-start whitespace-nowrap transition-all duration-200 border border-transparent data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-300 data-[state=active]:border-emerald-500/30 data-[state=active]:shadow-xs text-muted-foreground hover:text-foreground hover:bg-muted/50"
        >
          <Calendar className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
          <span>2. Run Rate</span>
        </TabsTrigger>

        {/* TAB 3: DIGITAL (CONDICIONAL) */}
        {mostrarDigital && (
          <TabsTrigger
            value="d3"
            title="Dashboard 3: E-Commerce, Social Selling y Canales Digitales"
            className="flex items-center gap-1.5 py-2 px-2.5 lg:px-3 text-xs font-bold rounded-xl shrink-0 snap-start whitespace-nowrap transition-all duration-200 border border-transparent data-[state=active]:bg-indigo-500/15 data-[state=active]:text-indigo-700 dark:data-[state=active]:text-indigo-300 data-[state=active]:border-indigo-500/30 data-[state=active]:shadow-xs text-muted-foreground hover:text-foreground hover:bg-muted/50"
          >
            <Globe className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
            <span>3. Digital</span>
          </TabsTrigger>
        )}

        {/* TAB 4: FUERZA VENTAS */}
        <TabsTrigger
          value="d4"
          title="Dashboard 4: Fuerza de Ventas, Asesores Comerciales y Cartera"
          className="flex items-center gap-1.5 py-2 px-2.5 lg:px-3 text-xs font-bold rounded-xl shrink-0 snap-start whitespace-nowrap transition-all duration-200 border border-transparent data-[state=active]:bg-amber-500/15 data-[state=active]:text-amber-700 dark:data-[state=active]:text-amber-300 data-[state=active]:border-amber-500/30 data-[state=active]:shadow-xs text-muted-foreground hover:text-foreground hover:bg-muted/50"
        >
          <Award className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          <span>4. Fuerza Ventas</span>
        </TabsTrigger>

        {/* TAB 5: MARKETPLACES (CONDICIONAL) */}
        {mostrarMarketplaces && (
          <TabsTrigger
            value="d5"
            title="Dashboard 5: Marketplaces, Retail y Canales Externos"
            className="flex items-center gap-1.5 py-2 px-2.5 lg:px-3 text-xs font-bold rounded-xl shrink-0 snap-start whitespace-nowrap transition-all duration-200 border border-transparent data-[state=active]:bg-pink-500/15 data-[state=active]:text-pink-700 dark:data-[state=active]:text-pink-300 data-[state=active]:border-pink-500/30 data-[state=active]:shadow-xs text-muted-foreground hover:text-foreground hover:bg-muted/50"
          >
            <ShoppingBag className="h-3.5 w-3.5 text-pink-500 shrink-0" />
            <span>5. Marketplaces</span>
          </TabsTrigger>
        )}

        {/* TAB 6: REFERENCIAS */}
        <TabsTrigger
          value="referencias"
          title="Dashboard 6: Catálogo de Referencias, Curva ABC y Pareto"
          className="flex items-center gap-1.5 py-2 px-2.5 lg:px-3 text-xs font-bold rounded-xl shrink-0 snap-start whitespace-nowrap transition-all duration-200 border border-transparent data-[state=active]:bg-cyan-500/15 data-[state=active]:text-cyan-700 dark:data-[state=active]:text-cyan-300 data-[state=active]:border-cyan-500/30 data-[state=active]:shadow-xs text-muted-foreground hover:text-foreground hover:bg-muted/50"
        >
          <Package className="h-3.5 w-3.5 text-cyan-500 shrink-0" />
          <span>6. Referencias</span>
        </TabsTrigger>

        {/* TAB 7: PEDIDOS VS DESPACHOS (ADAPTATIVO) */}
        <TabsTrigger
          value="explorador"
          title="Dashboard 7: Pedidos Tomados vs Despachos Físicos en Bodega"
          className="flex items-center gap-1.5 py-2 px-2.5 lg:px-3 text-xs font-bold rounded-xl shrink-0 snap-start whitespace-nowrap transition-all duration-200 border border-transparent data-[state=active]:bg-teal-500/15 data-[state=active]:text-teal-700 dark:data-[state=active]:text-teal-300 data-[state=active]:border-teal-500/30 data-[state=active]:shadow-xs text-muted-foreground hover:text-foreground hover:bg-muted/50"
        >
          <FileSpreadsheet className="h-3.5 w-3.5 text-teal-500 shrink-0" />
          <span>
            7. Pedidos
            <span className="hidden xl:inline"> vs Despachos</span>
          </span>
        </TabsTrigger>

        {/* TAB 8: CLIENTES ACTIVADOS (ADAPTATIVO) */}
        <TabsTrigger
          value="d8"
          title="Dashboard 8: Clientes Activados y Fidelización"
          className="flex items-center gap-1.5 py-2 px-2.5 lg:px-3 text-xs font-bold rounded-xl shrink-0 snap-start whitespace-nowrap transition-all duration-200 border border-transparent data-[state=active]:bg-purple-500/15 data-[state=active]:text-purple-700 dark:data-[state=active]:text-purple-300 data-[state=active]:border-purple-500/30 data-[state=active]:shadow-xs text-muted-foreground hover:text-foreground hover:bg-muted/50"
        >
          <Users className="h-3.5 w-3.5 text-purple-500 shrink-0" />
          <span>
            8. Clientes
            <span className="hidden xl:inline"> Activados</span>
          </span>
        </TabsTrigger>

        {/* TAB 9: CORRERÍAS (SOLO ADMINS) */}
        {esAdmin && (
          <TabsTrigger
            value="correrias"
            title="Dashboard 9: Análisis de Correrías, Colecciones y Trazabilidad para Diseño"
            className="flex items-center gap-1.5 py-2 px-2.5 lg:px-3 text-xs font-bold rounded-xl shrink-0 snap-start whitespace-nowrap transition-all duration-200 border border-transparent data-[state=active]:bg-rose-500/15 data-[state=active]:text-rose-700 dark:data-[state=active]:text-rose-300 data-[state=active]:border-rose-500/30 data-[state=active]:shadow-xs text-muted-foreground hover:text-foreground hover:bg-muted/50"
          >
            <Layers className="h-3.5 w-3.5 text-rose-500 shrink-0" />
            <span>9. Correrías</span>
          </TabsTrigger>
        )}

        {/* SEPARADOR Y TAB DE UTILIDAD ADMINISTRATIVA: CARGAR */}
        {esAdmin && (
          <>
            <div className="h-5 w-px bg-border/70 mx-1 shrink-0 hidden sm:block" />
            <TabsTrigger
              value="carga"
              title="Módulo de Carga e Ingesta de Archivos Planos HGI (Solo Administrador)"
              className="ml-auto flex items-center gap-1.5 py-1.5 px-3 text-xs font-bold rounded-xl shrink-0 snap-start whitespace-nowrap transition-all duration-200 border border-border/80 hover:border-slate-400/80 bg-muted/40 hover:bg-muted/70 data-[state=active]:bg-slate-500/15 data-[state=active]:text-slate-800 dark:data-[state=active]:text-slate-200 data-[state=active]:border-slate-500/40 text-muted-foreground"
            >
              <UploadCloud className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              <span>Cargar</span>
            </TabsTrigger>
          </>
        )}
      </TabsList>

      {/* Degradado indicador derecho */}
      {canScrollRight && (
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-card to-transparent pointer-events-none z-10 rounded-r-2xl" />
      )}

      {/* Botón flotante para scroll a la derecha */}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => handleScroll("right")}
          className="absolute right-1 top-1/2 -translate-y-1/2 z-20 grid h-7 w-7 place-items-center rounded-xl bg-background/90 dark:bg-card/90 border border-border/80 shadow-md text-foreground hover:bg-muted transition-all backdrop-blur-md"
          title="Desplazar a la derecha"
          aria-label="Desplazar tabs a la derecha"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
