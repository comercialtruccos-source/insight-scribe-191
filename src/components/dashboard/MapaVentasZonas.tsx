import React, { useState, useMemo } from "react";
import { ZonaAporte, CatalogoItem } from "@/lib/ventas-api";
import { formatoCOPFull } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Globe2,
  MapPin,
  TrendingUp,
  TrendingDown,
  Navigation,
  Compass,
  ArrowUpRight,
  Maximize2,
  Filter,
} from "lucide-react";

interface MapaVentasZonasProps {
  distribucionZonas?: ZonaAporte[];
  totalVentas?: number;
  totalUnidades?: number;
  paisesCatalogo?: CatalogoItem[];
  onSelectZona?: (zonaId: number | null, zonaNombre: string) => void;
  zonaSeleccionadaId?: number | null;
}

// Coordenadas normalizadas y paths simplificados para departamentos y zonas de Colombia (SVG viewBox: 0 0 500 650)
const DEPARTAMENTOS_COLOMBIA: Array<{
  id: string;
  nombre: string;
  aliases: string[];
  cx: number;
  cy: number;
  path: string;
}> = [
  {
    id: "guajira",
    nombre: "La Guajira",
    aliases: ["guajira", "la guajira"],
    cx: 320,
    cy: 50,
    path: "M 280 90 L 320 30 L 350 45 L 340 90 L 300 95 Z",
  },
  {
    id: "magdalena",
    nombre: "Magdalena",
    aliases: ["magdalena", "santa marta"],
    cx: 260,
    cy: 110,
    path: "M 250 95 L 285 90 L 280 140 L 245 135 Z",
  },
  {
    id: "atlantico",
    nombre: "Atlántico",
    aliases: ["atlantico", "barranquilla", "costa"],
    cx: 235,
    cy: 90,
    path: "M 225 80 L 250 80 L 248 105 L 225 105 Z",
  },
  {
    id: "bolivar",
    nombre: "Bolívar",
    aliases: ["bolivar", "cartagena"],
    cx: 235,
    cy: 155,
    path: "M 225 108 L 250 108 L 260 170 L 240 220 L 220 180 Z",
  },
  {
    id: "cesar",
    nombre: "Cesar",
    aliases: ["cesar", "valledupar"],
    cx: 295,
    cy: 130,
    path: "M 285 92 L 315 95 L 305 180 L 280 160 Z",
  },
  {
    id: "cordoba",
    nombre: "Córdoba",
    aliases: ["cordoba", "monteria"],
    cx: 195,
    cy: 165,
    path: "M 185 140 L 220 135 L 215 190 L 175 190 Z",
  },
  {
    id: "sucre",
    nombre: "Sucre",
    aliases: ["sucre", "sincelejo"],
    cx: 220,
    cy: 130,
    path: "M 215 120 L 235 115 L 230 145 L 210 140 Z",
  },
  {
    id: "antioquia",
    nombre: "Antioquia",
    aliases: ["antioquia", "medellin", "bello", "itagui", "envigado", "rionegro"],
    cx: 200,
    cy: 240,
    path: "M 175 195 L 220 195 L 245 225 L 230 290 L 170 270 Z",
  },
  {
    id: "santander",
    nombre: "Santander",
    aliases: ["santander", "bucaramanga", "floridablanca", "giron", "piedecuesta"],
    cx: 275,
    cy: 245,
    path: "M 250 200 L 295 210 L 290 280 L 250 270 Z",
  },
  {
    id: "norte_santander",
    nombre: "Norte de Santander",
    aliases: ["norte de santander", "cucuta", "santanderes"],
    cx: 305,
    cy: 205,
    path: "M 295 175 L 330 185 L 315 240 L 290 230 Z",
  },
  {
    id: "boyaca",
    nombre: "Boyacá",
    aliases: ["boyaca", "tunja", "sogamoso", "duitama"],
    cx: 280,
    cy: 310,
    path: "M 255 275 L 300 270 L 330 320 L 275 335 L 250 310 Z",
  },
  {
    id: "cundinamarca",
    nombre: "Cundinamarca / Bogotá",
    aliases: ["cundinamarca", "bogota", "bogotá", "centro", "soacha", "chia"],
    cx: 245,
    cy: 350,
    path: "M 235 315 L 265 310 L 270 375 L 230 370 Z",
  },
  {
    id: "caldas",
    nombre: "Caldas",
    aliases: ["caldas", "manizales", "eje cafetero"],
    cx: 195,
    cy: 305,
    path: "M 185 295 L 220 295 L 215 320 L 185 320 Z",
  },
  {
    id: "risaralda",
    nombre: "Risaralda",
    aliases: ["risaralda", "pereira", "dosquebradas"],
    cx: 180,
    cy: 325,
    path: "M 170 315 L 195 315 L 190 338 L 168 335 Z",
  },
  {
    id: "quindio",
    nombre: "Quindío",
    aliases: ["quindio", "quindío", "armenia"],
    cx: 190,
    cy: 345,
    path: "M 180 338 L 202 338 L 198 355 L 178 352 Z",
  },
  {
    id: "tolima",
    nombre: "Tolima",
    aliases: ["tolima", "ibague", "ibagué", "espinal"],
    cx: 215,
    cy: 375,
    path: "M 205 340 L 235 345 L 230 420 L 195 390 Z",
  },
  {
    id: "valle",
    nombre: "Valle del Cauca",
    aliases: ["valle", "valle del cauca", "cali", "palmira", "buenaventura", "tulua", "cartago"],
    cx: 155,
    cy: 385,
    path: "M 145 340 L 185 345 L 180 430 L 140 405 Z",
  },
  {
    id: "cauca",
    nombre: "Cauca",
    aliases: ["cauca", "popayan", "popayán"],
    cx: 150,
    cy: 450,
    path: "M 135 410 L 180 435 L 175 490 L 130 460 Z",
  },
  {
    id: "narino",
    nombre: "Nariño",
    aliases: ["narino", "nariño", "pasto", "sur", "ipiales"],
    cx: 125,
    cy: 515,
    path: "M 110 465 L 165 495 L 155 550 L 100 525 Z",
  },
  {
    id: "huila",
    nombre: "Huila",
    aliases: ["huila", "neiva", "pitalito"],
    cx: 200,
    cy: 445,
    path: "M 185 410 L 225 415 L 210 485 L 175 465 Z",
  },
  {
    id: "meta",
    nombre: "Meta",
    aliases: ["meta", "villavicencio", "llanos"],
    cx: 290,
    cy: 405,
    path: "M 260 365 L 340 370 L 330 460 L 245 440 Z",
  },
  {
    id: "casanare",
    nombre: "Casanare",
    aliases: ["casanare", "yopal", "arauca/casanare"],
    cx: 345,
    cy: 310,
    path: "M 305 275 L 380 295 L 360 360 L 295 335 Z",
  },
  {
    id: "arauca",
    nombre: "Arauca",
    aliases: ["arauca"],
    cx: 375,
    cy: 240,
    path: "M 325 215 L 420 225 L 385 275 L 315 255 Z",
  },
  {
    id: "choco",
    nombre: "Chocó",
    aliases: ["choco", "chocó", "quibdo"],
    cx: 140,
    cy: 280,
    path: "M 140 205 L 175 220 L 165 335 L 130 330 Z",
  },
  {
    id: "orinoquia_amazonia",
    nombre: "Región Sur / Amazonía",
    aliases: ["amazonas", "caqueta", "caquetá", "putumayo", "guaviare", "vaupes", "vichada"],
    cx: 340,
    cy: 520,
    path: "M 215 480 L 335 460 L 440 380 L 460 520 L 300 620 L 180 540 Z",
  },
];

// Países clave del mapa de exportaciones mundiales
const PAISES_MUNDIALES: Array<{
  id: string;
  nombre: string;
  cx: number;
  cy: number;
  bandera: string;
}> = [
  { id: "usa", nombre: "Estados Unidos (USA)", cx: 160, cy: 110, bandera: "🇺🇸" },
  { id: "mexico", nombre: "México", cx: 130, cy: 170, bandera: "🇲🇽" },
  { id: "guatemala", nombre: "Guatemala", cx: 145, cy: 215, bandera: "🇬🇹" },
  { id: "honduras", nombre: "Honduras", cx: 160, cy: 220, bandera: "🇭🇳" },
  { id: "costa_rica", nombre: "Costa Rica", cx: 165, cy: 245, bandera: "🇨🇷" },
  { id: "panama", nombre: "Panamá", cx: 180, cy: 255, bandera: "🇵🇦" },
  { id: "puerto_rico", nombre: "Puerto Rico", cx: 210, cy: 195, bandera: "🇵🇷" },
  { id: "colombia", nombre: "Colombia (Sede Matriz)", cx: 195, cy: 290, bandera: "🇨🇴" },
  { id: "ecuador", nombre: "Ecuador", cx: 185, cy: 335, bandera: "🇪🇨" },
  { id: "peru", nombre: "Perú", cx: 195, cy: 380, bandera: "🇵🇪" },
  { id: "chile", nombre: "Chile", cx: 200, cy: 470, bandera: "🇨🇱" },
  { id: "venezuela", nombre: "Venezuela", cx: 235, cy: 280, bandera: "🇻🇪" },
  { id: "espana", nombre: "España / Europa", cx: 330, cy: 120, bandera: "🇪🇸" },
];

export function MapaVentasZonas({
  distribucionZonas = [],
  totalVentas = 0,
  totalUnidades = 0,
  paisesCatalogo = [],
  onSelectZona,
  zonaSeleccionadaId,
}: MapaVentasZonasProps) {
  const [capaMapa, setCapaMapa] = useState<"colombia" | "mundo">("colombia");
  const [hoverRegion, setHoverRegion] = useState<{
    nombre: string;
    venta: number;
    unidades: number;
    porcentaje: number;
    yoy?: number;
    ciudadesCount?: number;
    x: number;
    y: number;
  } | null>(null);

  // Mapear métricas de las zonas cargadas de fact_ventas a los departamentos
  const zonasMap = useMemo(() => {
    const map = new Map<string, ZonaAporte>();
    for (const z of distribucionZonas) {
      const zName = z.zona.toLowerCase().trim();
      map.set(zName, z);
    }
    return map;
  }, [distribucionZonas]);

  // Encontrar el valor de venta de una región
  const obtenerDatosRegion = (aliases: string[], nombreDefault: string) => {
    for (const alias of aliases) {
      const match = zonasMap.get(alias.toLowerCase());
      if (match) return match;
    }
    for (const [k, v] of zonasMap.entries()) {
      if (aliases.some((a) => k.includes(a) || a.includes(k))) {
        return v;
      }
    }
    return null;
  };

  // Calcular el max para la escala de color
  const maxVentaZona = useMemo(() => {
    if (distribucionZonas.length === 0) return 1;
    return Math.max(...distribucionZonas.map((z) => z.venta), 1);
  }, [distribucionZonas]);

  // Color de calor SVG para regiones
  const getColorCalor = (venta: number) => {
    if (!venta || venta <= 0) return "rgba(148, 163, 184, 0.25)";
    const ratio = Math.min(1, venta / maxVentaZona);
    if (ratio > 0.6) return "rgba(16, 185, 129, 0.85)"; // Emerald vibrante
    if (ratio > 0.3) return "rgba(59, 130, 246, 0.80)"; // Azul corporativo
    if (ratio > 0.1) return "rgba(99, 102, 241, 0.70)"; // Indigo
    return "rgba(139, 92, 246, 0.55)"; // Púrpura suave
  };

  // Métricas generales de exportación vs nacional
  const metricasGeo = useMemo(() => {
    let ventaExportacion = 0;
    let unidadesExportacion = 0;
    let zonasActivas = 0;

    for (const z of distribucionZonas) {
      if (z.venta > 0) zonasActivas++;
      const zNom = z.zona.toUpperCase();
      if (
        zNom.includes("EXPORT") ||
        zNom.includes("INTERNACIONAL") ||
        zNom.includes("USA") ||
        zNom.includes("EXTERIOR")
      ) {
        ventaExportacion += z.venta;
        unidadesExportacion += z.unidades;
      }
    }

    const ventaNacional = Math.max(0, totalVentas - ventaExportacion);
    const pctExportacion = totalVentas > 0 ? (ventaExportacion / totalVentas) * 100 : 0;
    const pctNacional = totalVentas > 0 ? (ventaNacional / totalVentas) * 100 : 100;

    return {
      ventaNacional,
      ventaExportacion,
      pctNacional,
      pctExportacion,
      zonasActivas,
    };
  }, [distribucionZonas, totalVentas]);

  return (
    <Card className="overflow-hidden border border-border/80 shadow-sm bg-card/95 backdrop-blur-sm">
      <CardHeader className="pb-3 border-b border-border/60">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <Compass className="h-4 w-4 text-primary" />
              <span>Mapa Interactivo de Zonas y Territorio Comercial</span>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Explora la concentración de facturación y volumen en departamentos de Colombia y destinos de exportación.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-xl border border-border/80 bg-muted/40 p-1">
              <button
                type="button"
                onClick={() => setCapaMapa("colombia")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  capaMapa === "colombia"
                    ? "bg-background text-primary shadow-2xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>🇨🇴</span>
                <span>Colombia ({metricasGeo.zonasActivas} Zonas)</span>
              </button>
              <button
                type="button"
                onClick={() => setCapaMapa("mundo")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  capaMapa === "mundo"
                    ? "bg-background text-primary shadow-2xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Globe2 className="h-3.5 w-3.5" />
                <span>Mundial / Exportaciones</span>
              </button>
            </div>
          </div>
        </div>

        {/* Resumen rápido de participación geográfica */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3">
          <div className="rounded-xl border border-border/60 bg-background/60 p-2.5">
            <div className="text-[10.5px] font-semibold text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3 text-emerald-500" />
              <span>Venta Nacional</span>
            </div>
            <div className="text-xs sm:text-sm font-bold text-foreground font-mono mt-0.5">
              {formatoCOPFull(metricasGeo.ventaNacional)}
            </div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
              {metricasGeo.pctNacional.toFixed(2)}% participación
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-background/60 p-2.5">
            <div className="text-[10.5px] font-semibold text-muted-foreground flex items-center gap-1">
              <Globe2 className="h-3 w-3 text-blue-500" />
              <span>Exportaciones</span>
            </div>
            <div className="text-xs sm:text-sm font-bold text-foreground font-mono mt-0.5">
              {formatoCOPFull(metricasGeo.ventaExportacion)}
            </div>
            <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold mt-0.5">
              {metricasGeo.pctExportacion.toFixed(2)}% del volumen
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-background/60 p-2.5">
            <div className="text-[10.5px] font-semibold text-muted-foreground flex items-center gap-1">
              <Navigation className="h-3 w-3 text-indigo-500" />
              <span>Top Región</span>
            </div>
            <div className="text-xs sm:text-sm font-bold text-foreground truncate mt-0.5">
              {distribucionZonas[0]?.zona || "N/A"}
            </div>
            <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">
              {distribucionZonas[0] ? `${distribucionZonas[0].porcentaje.toFixed(2)}% cuota` : "—"}
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-background/60 p-2.5">
            <div className="text-[10.5px] font-semibold text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-purple-500" />
              <span>Prendas Despachadas</span>
            </div>
            <div className="text-xs sm:text-sm font-bold text-foreground font-mono mt-0.5">
              {Math.round(totalUnidades).toLocaleString("es-CO")} unds
            </div>
            <div className="text-[10px] text-muted-foreground font-medium mt-0.5">
              Territorio cubierto
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 relative">
        {capaMapa === "colombia" ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
            {/* Visualizador Vectorial de Colombia */}
            <div className="lg:col-span-7 flex flex-col items-center justify-center relative min-h-[380px] bg-muted/10 rounded-2xl border border-border/60 p-3">
              <div className="absolute top-3 left-3 flex items-center gap-2 text-xs text-muted-foreground font-medium">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Haz clic en un departamento para filtrar el dashboard</span>
              </div>

              {/* Escala de calor */}
              <div className="absolute bottom-3 right-3 flex items-center gap-1.5 text-[10px] bg-background/90 px-2 py-1 rounded-lg border shadow-xs">
                <span className="text-muted-foreground">Menor</span>
                <span className="w-2.5 h-2.5 rounded-xs bg-purple-400" />
                <span className="w-2.5 h-2.5 rounded-xs bg-indigo-500" />
                <span className="w-2.5 h-2.5 rounded-xs bg-blue-500" />
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" />
                <span className="font-bold text-emerald-600 dark:text-emerald-400">Mayor</span>
              </div>

              <svg
                viewBox="50 10 420 620"
                className="w-full max-w-[420px] h-auto drop-shadow-md select-none"
                style={{ maxHeight: "420px" }}
              >
                <defs>
                  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {DEPARTAMENTOS_COLOMBIA.map((dep) => {
                  const zData = obtenerDatosRegion(dep.aliases, dep.nombre);
                  const venta = zData?.venta || 0;
                  const color = getColorCalor(venta);
                  const esSeleccionado = zData && zonaSeleccionadaId && zData.id === zonaSeleccionadaId;

                  return (
                    <g key={dep.id} className="cursor-pointer group">
                      <path
                        d={dep.path}
                        fill={color}
                        stroke={esSeleccionado ? "#22c55e" : "#475569"}
                        strokeWidth={esSeleccionado ? 2.5 : 1.2}
                        className="transition-all duration-200 group-hover:opacity-90 group-hover:stroke-primary group-hover:stroke-2"
                        onClick={() => {
                          if (zData && onSelectZona) {
                            onSelectZona(zData.id, zData.zona);
                          }
                        }}
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setHoverRegion({
                            nombre: dep.nombre,
                            venta: zData?.venta || 0,
                            unidades: zData?.unidades || 0,
                            porcentaje: zData?.porcentaje || 0,
                            yoy: zData?.crecimientoYoY,
                            ciudadesCount: zData?.ciudades?.length || 0,
                            x: rect.left + rect.width / 2,
                            y: rect.top,
                          });
                        }}
                        onMouseLeave={() => setHoverRegion(null)}
                      />
                      {/* Marcador nodal con nombre */}
                      <circle
                        cx={dep.cx}
                        cy={dep.cy}
                        r={venta > 0 ? (venta === maxVentaZona ? 6 : 4) : 2.5}
                        fill={venta > 0 ? "#ffffff" : "#94a3b8"}
                        stroke="#0f172a"
                        strokeWidth={1}
                        className="pointer-events-none"
                      />
                      <text
                        x={dep.cx}
                        y={dep.cy - 7}
                        fontSize={8.5}
                        fontWeight={venta > 0 ? "700" : "500"}
                        textAnchor="middle"
                        fill="currentColor"
                        className="fill-foreground/90 pointer-events-none select-none drop-shadow-xs"
                      >
                        {dep.nombre.split(" / ")[0]}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Panel Lateral: Ranking de Regiones y Ciudades */}
            <div className="lg:col-span-5 flex flex-col gap-2 max-h-[420px] overflow-y-auto pr-1">
              <div className="flex items-center justify-between pb-1 border-b text-xs font-bold text-foreground">
                <span>Zona / Región</span>
                <span>Facturación (%)</span>
              </div>

              {distribucionZonas.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  No hay ventas registradas en el periodo seleccionado.
                </div>
              ) : (
                distribucionZonas.map((z, idx) => {
                  const esTop1 = idx === 0;
                  const esSeleccionado = zonaSeleccionadaId && z.id === zonaSeleccionadaId;

                  return (
                    <div
                      key={z.id ?? z.zona}
                      onClick={() => onSelectZona && onSelectZona(z.id, z.zona)}
                      className={`group p-2.5 rounded-xl border transition-all cursor-pointer ${
                        esSeleccionado
                          ? "bg-primary/10 border-primary ring-1 ring-primary/40 shadow-xs"
                          : "bg-background/80 hover:bg-muted/50 border-border/70"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 truncate">
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                              esTop1
                                ? "bg-amber-500 text-white"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <span className="text-xs font-semibold text-foreground truncate group-hover:text-primary">
                            {z.zona}
                          </span>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-xs font-bold font-mono text-foreground">
                            {formatoCOPFull(z.venta)}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-semibold">
                            {z.porcentaje.toFixed(2)}% | {Math.round(z.unidades).toLocaleString("es-CO")} unds
                          </div>
                        </div>
                      </div>

                      {/* Barra de progreso visual */}
                      <div className="w-full bg-muted/60 rounded-full h-1.5 mt-2 overflow-hidden">
                        <div
                          className="bg-primary h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(100, Math.max(5, z.porcentaje))}%`,
                          }}
                        />
                      </div>

                      {z.ciudades && z.ciudades.length > 0 && (
                        <div className="mt-1.5 pt-1.5 border-t border-border/40 flex items-center gap-1.5 text-[10px] text-muted-foreground overflow-x-auto">
                          <span className="font-medium text-foreground/80">Ciudades:</span>
                          {z.ciudades.slice(0, 3).map((c) => (
                            <span
                              key={c.ciudad}
                              className="bg-muted/70 px-1.5 py-0.5 rounded text-[9.5px] font-mono"
                            >
                              {c.ciudad} ({c.porcentaje.toFixed(1)}%)
                            </span>
                          ))}
                          {z.ciudades.length > 3 && (
                            <span className="text-[9px] text-muted-foreground">
                              +{z.ciudades.length - 3} más
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          /* Capa 2: Destinos Mundiales / Exportaciones */
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              {/* Mapa de Continentes y Rutas de Exportación */}
              <div className="md:col-span-7 flex flex-col items-center justify-center min-h-[380px] bg-slate-950/40 rounded-2xl border border-border/60 p-4 relative overflow-hidden">
                <div className="absolute top-3 left-3 text-xs text-muted-foreground flex items-center gap-1.5">
                  <Globe2 className="h-4 w-4 text-blue-400" />
                  <span className="font-semibold text-foreground">Rutas Internacionales de Trucco's Fashion</span>
                </div>

                <svg viewBox="0 0 450 520" className="w-full max-w-[420px] h-auto drop-shadow-md">
                  {/* Líneas de conexión desde Colombia hacia el mundo */}
                  {PAISES_MUNDIALES.filter((p) => p.id !== "colombia").map((p) => (
                    <line
                      key={`line-${p.id}`}
                      x1={195}
                      y1={290}
                      x2={p.cx}
                      y2={p.cy}
                      stroke="rgba(59, 130, 246, 0.4)"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                    />
                  ))}

                  {/* Nodos de países */}
                  {PAISES_MUNDIALES.map((p) => {
                    const esColombia = p.id === "colombia";
                    return (
                      <g key={p.id} className="cursor-pointer group">
                        <circle
                          cx={p.cx}
                          cy={p.cy}
                          r={esColombia ? 9 : 6}
                          fill={esColombia ? "#10b981" : "#3b82f6"}
                          stroke="#ffffff"
                          strokeWidth={esColombia ? 2.5 : 1.5}
                          className="transition-transform duration-200 group-hover:scale-125"
                        />
                        <text
                          x={p.cx}
                          y={p.cy + 16}
                          fontSize={9}
                          fontWeight={esColombia ? "800" : "600"}
                          textAnchor="middle"
                          fill="currentColor"
                          className="fill-foreground drop-shadow-xs"
                        >
                          {p.bandera} {p.nombre.split(" ")[0]}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Lista de Destinos Internacionales */}
              <div className="md:col-span-5 flex flex-col gap-2 max-h-[380px] overflow-y-auto pr-1">
                <div className="text-xs font-bold text-foreground pb-1 border-b">
                  Destinos de Exportación Registrados
                </div>

                {PAISES_MUNDIALES.filter((p) => p.id !== "colombia").map((pais) => {
                  return (
                    <div
                      key={pais.id}
                      className="p-2.5 rounded-xl border border-border/70 bg-background/80 hover:bg-muted/50 transition-all flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{pais.bandera}</span>
                        <div>
                          <p className="text-xs font-semibold text-foreground">{pais.nombre}</p>
                          <p className="text-[10px] text-muted-foreground">Canal Exportación / Distribuidor</p>
                        </div>
                      </div>

                      <Badge variant="outline" className="text-[10px] font-mono font-semibold bg-blue-500/10 text-blue-600 border-blue-500/30">
                        Destino Activo
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tooltip flotante interactivo */}
        {hoverRegion && (
          <div
            className="fixed z-50 pointer-events-none rounded-xl border bg-popover/95 backdrop-blur-md p-3 shadow-xl text-xs -translate-x-1/2 -translate-y-full mb-3"
            style={{
              left: `${hoverRegion.x}px`,
              top: `${hoverRegion.y}px`,
            }}
          >
            <div className="font-bold text-foreground text-sm flex items-center gap-1.5 pb-1 border-b border-border/50">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              <span>{hoverRegion.nombre}</span>
            </div>
            <div className="pt-2 space-y-1">
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Facturación:</span>
                <span className="font-bold font-mono text-foreground">
                  {hoverRegion.venta > 0 ? formatoCOPFull(hoverRegion.venta) : "Sin ventas"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Unidades:</span>
                <span className="font-semibold text-foreground font-mono">
                  {Math.round(hoverRegion.unidades).toLocaleString("es-CO")} unds
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Participación:</span>
                <span className="font-bold text-primary font-mono">
                  {hoverRegion.porcentaje.toFixed(2)}%
                </span>
              </div>
              {hoverRegion.yoy !== undefined && hoverRegion.yoy !== 0 && (
                <div className="flex items-center justify-between gap-4 pt-1 border-t border-border/40 text-[10.5px]">
                  <span className="text-muted-foreground">YoY vs Año Ant:</span>
                  <span
                    className={`font-bold flex items-center gap-0.5 ${
                      hoverRegion.yoy >= 0 ? "text-emerald-500" : "text-rose-500"
                    }`}
                  >
                    {hoverRegion.yoy >= 0 ? "+" : ""}
                    {hoverRegion.yoy.toFixed(2)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
