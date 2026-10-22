"use client";

import React, { useState, useEffect } from "react";
import { ArrowUp, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BotonVolverInicioProps {
  /** Clave del dashboard actualmente activo (ej: 'd1', 'd2', 'referencias', etc.) */
  tabActivo?: string;
  /** Umbral de scroll en píxeles para mostrar el botón flotante (por defecto: 280) */
  threshold?: number;
  /** Acción opcional para regresar al menú inicial de selección en móvil */
  onVolverMenuMovil?: () => void;
  /** Clases CSS adicionales */
  className?: string;
}

const NOMBRES_DASHBOARDS: Record<string, string> = {
  d1: "1. Cumplimiento y Ventas",
  d2: "2. Run Rate y Proyección",
  d3: "3. Canales Digitales y Social Selling",
  d4: "4. Fuerza de Ventas y Asesores",
  d5: "5. Marketplaces y Retail",
  referencias: "6. Inteligencia de Referencias",
  explorador: "7. Pedidos vs Despachos",
  d8: "8. Clientes Activados y Fidelización",
  carga: "Carga de Datos",
};

export function BotonVolverInicio({
  tabActivo,
  threshold = 280,
  onVolverMenuMovil,
  className,
}: BotonVolverInicioProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      setVisible(scrollY > threshold);
    };

    // Verificación inicial
    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [threshold]);

  const handleClick = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
    if (onVolverMenuMovil && typeof window !== "undefined" && window.innerWidth < 640) {
      onVolverMenuMovil();
    }
  };

  const nombreDashboard = tabActivo ? NOMBRES_DASHBOARDS[tabActivo] || tabActivo : null;

  return (
    <div
      className={cn(
        "fixed bottom-5 left-5 sm:bottom-6 sm:left-6 z-40 transition-all duration-300 ease-out",
        visible
          ? "opacity-100 translate-y-0 pointer-events-auto scale-100"
          : "opacity-0 translate-y-6 pointer-events-none scale-95",
        className
      )}
    >
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={handleClick}
              aria-label="Volver al inicio de la página para cambiar de dashboard"
              className={cn(
                "group grid h-11 w-11 sm:h-12 sm:w-12 place-items-center rounded-full shadow-lg",
                "bg-gradient-to-tr from-indigo-600 via-indigo-700 to-purple-700",
                "hover:from-indigo-500 hover:via-indigo-600 hover:to-purple-600",
                "text-white shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/50",
                "border border-white/25 hover:scale-110 active:scale-95",
                "transition-all duration-200 cursor-pointer select-none",
                "ring-1 ring-black/10 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2"
              )}
            >
              <ArrowUp className="h-5 w-5 stroke-[2.5] text-white group-hover:-translate-y-0.5 transition-transform duration-200" />
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="right"
            align="center"
            sideOffset={12}
            className="p-3 max-w-[280px] rounded-xl shadow-2xl border border-border/80 bg-popover text-popover-foreground z-50 animate-in fade-in zoom-in-95"
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                <div className="grid h-5 w-5 place-items-center rounded-md bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 shrink-0">
                  <ArrowUp className="h-3 w-3 stroke-[2.5]" />
                </div>
                <span>Volver al inicio</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Sube rápidamente al inicio para seleccionar otro dashboard o modificar los filtros de fecha y asesores.
              </p>
              {nombreDashboard && (
                <div className="pt-1.5 mt-1 border-t border-border/50 flex items-center gap-1.5 text-[10.5px]">
                  <LayoutDashboard className="h-3 w-3 text-indigo-500 shrink-0" />
                  <span className="text-muted-foreground">Viendo:</span>
                  <span className="font-semibold text-foreground truncate">
                    {nombreDashboard}
                  </span>
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
