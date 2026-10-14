import React, { useState, useMemo, useRef } from "react";
import { ZonaAporte, CatalogoItem } from "@/lib/ventas-api";
import { formatoCOP, formatoCOPFull } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  WORLD_LAND_PATH,
  KEY_COUNTRIES_PATHS,
  PUNTOS_GEOGRAFICOS,
  buscarPuntoGeografico,
  PuntoGeografico,
} from "./world-geo-paths";
import {
  Globe2,
  MapPin,
  Search,
  Filter,
  Package,
  Building2,
  Compass,
  ArrowUpRight,
  Maximize2,
  RotateCcw,
  Plane,
  Layers,
  Sparkles,
} from "lucide-react";

interface MapaVentasZonasProps {
  distribucionZonas?: ZonaAporte[];
  totalVentas?: number;
  totalUnidades?: number;
  paisesCatalogo?: CatalogoItem[];
  onSelectZona?: (zonaId: number | null, zonaNombre: string) => void;
  zonaSeleccionadaId?: number | null;
  vendedorNombre?: string | null;
}

export function MapaVentasZonas({
  distribucionZonas = [],
  totalVentas = 0,
  totalUnidades = 0,
  onSelectZona,
  zonaSeleccionadaId,
  vendedorNombre,
}: MapaVentasZonasProps) {
  const [busqueda, setBusqueda] = useState<string>("");
  const [ordenRefs, setOrdenRefs] = useState<"valor" | "unidades">("valor");
  const [modoVista, setModoVista] = useState<"mundo" | "americas" | "colombia">("mundo");
  const [hoverPunto, setHoverPunto] = useState<{
    nombre: string;
    bandera: string;
    pais: string;
    tipo: string;
    venta: number;
    unidades: number;
    porcentaje: number;
    ciudadesCount: number;
    refsCount: number;
    x: number;
    y: number;
  } | null>(null);

  // Zonas activas con ventas ordenadas por facturación descendente
  const zonasOrdenadas = useMemo(() => {
    return [...distribucionZonas]
      .filter((z) => z.venta > 0)
      .sort((a, b) => b.venta - a.venta);
  }, [distribucionZonas]);

  // Zona actualmente seleccionada para ver su detalle
  const [zonaActivaNombre, setZonaActivaNombre] = useState<string>("");

  const zonaActiva = useMemo(() => {
    if (zonaSeleccionadaId !== null && zonaSeleccionadaId !== undefined) {
      const match = distribucionZonas.find((z) => z.id === zonaSeleccionadaId);
      if (match) return match;
    }
    if (zonaActivaNombre) {
      const match = distribucionZonas.find((z) => z.zona === zonaActivaNombre);
      if (match) return match;
    }
    return zonasOrdenadas[0] || distribucionZonas[0] || null;
  }, [distribucionZonas, zonaSeleccionadaId, zonaActivaNombre, zonasOrdenadas]);

  // Filtrado por buscador
  const zonasFiltradas = useMemo(() => {
    if (!busqueda.trim()) return zonasOrdenadas;
    const q = busqueda.toLowerCase().trim();
    return zonasOrdenadas.filter(
      (z) =>
        z.zona.toLowerCase().includes(q) ||
        (z.ciudades && z.ciudades.some((c) => c.ciudad.toLowerCase().includes(q)))
    );
  }, [zonasOrdenadas, busqueda]);

  // Referencias de la zona seleccionada ordenadas
  const referenciasZona = useMemo(() => {
    if (!zonaActiva?.referencias) return [];
    const lista = [...zonaActiva.referencias];
    if (ordenRefs === "unidades") {
      return lista.sort((a, b) => b.unidades - a.unidades);
    }
    return lista.sort((a, b) => b.valor - a.valor);
  }, [zonaActiva, ordenRefs]);

  const zonaLider = zonasOrdenadas[0] || null;
  const ciudadLider = useMemo(() => {
    if (!zonaActiva?.ciudades || zonaActiva.ciudades.length === 0) return null;
    return [...zonaActiva.ciudades].sort((a, b) => b.venta - a.venta)[0];
  }, [zonaActiva]);

  // Mapear cada zona activa a un punto geográfico en el Mapa Mundi
  const puntosMapeados = useMemo(() => {
    const ColombiaMatrix = { cx: 292.0, cy: 235.0 };

    return zonasOrdenadas.map((z, idx) => {
      const punto = buscarPuntoGeografico(z.zona);
      let cx = 292.0;
      let cy = 235.0;
      let bandera = "🇨🇴";
      let pais = "Colombia";
      let tipo: "nacional" | "internacional" = "nacional";
      let countryCode = "COL";

      if (punto) {
        cx = punto.cx;
        cy = punto.cy;
        bandera = punto.bandera;
        pais = punto.pais;
        tipo = punto.tipo;
        if (punto.id === "mexico") countryCode = "MEX";
        else if (punto.id === "usa") countryCode = "USA";
        else if (punto.id === "ecuador") countryCode = "ECU";
        else if (punto.id === "peru") countryCode = "PER";
        else if (punto.id === "costa_rica") countryCode = "CRI";
        else if (punto.id === "panama") countryCode = "PAN";
        else if (punto.id === "espana") countryCode = "ESP";
        else if (punto.id === "chile") countryCode = "CHL";
        else if (punto.id === "guatemala") countryCode = "GTM";
      } else {
        // Asignación dispersa controlada para zonas sin punto exacto
        const hash = z.zona.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
        cx = 286.0 + (hash % 12);
        cy = 222.0 + (hash % 24);
      }

      // Tamaño de la burbuja según porcentaje
      const pct = Math.max(0, Math.min(100, z.porcentaje || 0));
      const r = Math.min(13, Math.max(4.5, Math.sqrt(pct) * 3.6));

      return {
        zonaData: z,
        nombre: z.zona,
        cx,
        cy,
        r,
        bandera,
        pais,
        tipo,
        countryCode,
        esLider: idx === 0,
        isSelected: zonaActiva?.zona === z.zona,
        venta: z.venta,
        unidades: z.unidades,
        porcentaje: z.porcentaje,
        ciudadesCount: z.ciudades?.length || 0,
        refsCount: z.referencias?.length || 0,
      };
    });
  }, [zonasOrdenadas, zonaActiva]);

  // Rutas de exportación curvas desde Colombia hacia destinos internacionales
  const rutasExportacion = useMemo(() => {
    const colX = 292.0;
    const colY = 235.0;
    const internacionales = puntosMapeados.filter((p) => p.tipo === "internacional");

    return internacionales.map((dest) => {
      // Punto de control para curva cuadrática de Bézier
      const midX = (colX + dest.cx) / 2;
      const midY = Math.min(colY, dest.cy) - 25;
      const pathD = `M ${colX} ${colY} Q ${midX} ${midY} ${dest.cx} ${dest.cy}`;
      return {
        id: `ruta-col-${dest.nombre}`,
        destNombre: dest.nombre,
        bandera: dest.bandera,
        pathD,
        venta: dest.venta,
      };
    });
  }, [puntosMapeados]);

  // Países destacados en el mapa
  const paisesDestacados = useMemo(() => {
    const set = new Set<string>();
    puntosMapeados.forEach((p) => {
      if (p.countryCode && KEY_COUNTRIES_PATHS[p.countryCode]) {
        set.add(p.countryCode);
      }
    });
    // Colombia siempre resaltada como matriz
    set.add("COL");
    return Array.from(set);
  }, [puntosMapeados]);

  // ViewBox dinámico según el modo de vista seleccionado
  const viewBoxActual = useMemo(() => {
    if (modoVista === "colombia") {
      // Zoom centrado en Colombia y departamentos
      return "272 208 40 48";
    }
    if (modoVista === "americas") {
      // Vista ampliada de América y rutas de exportación
      return "140 70 340 320";
    }
    // Vista Mundial Global Completa
    return "0 0 1000 500";
  }, [modoVista]);

  return (
    <div className="space-y-4">
      {/* ============================================================== */}
      {/* 1. MAPA MUNDI INTERACTIVO: COBERTURA GLOBAL Y REGIONAL         */}
      {/* ============================================================== */}
      <Card className="border border-border/80 shadow-md bg-card overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/60 bg-muted/20">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Globe2 className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-extrabold tracking-tight text-foreground flex items-center gap-2">
                    <span>Mapa Mundi de Ventas y Cobertura Territorial</span>
                    <Badge
                      variant="outline"
                      className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-bold"
                    >
                      Interactivo
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    {vendedorNombre
                      ? `Visualización geográfica de los mercados y zonas atendidas por ${vendedorNombre}`
                      : "Distribución geográfica de facturación nacional y rutas internacionales de exportación"}
                  </CardDescription>
                </div>
              </div>
            </div>

            {/* Selector de Perspectiva Cartográfica */}
            <div className="flex items-center gap-1.5 bg-muted/80 p-1 rounded-xl border border-border/60 text-xs">
              <button
                type="button"
                onClick={() => setModoVista("mundo")}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  modoVista === "mundo"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>🌐</span>
                <span>Mundo Completo</span>
              </button>
              <button
                type="button"
                onClick={() => setModoVista("americas")}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  modoVista === "americas"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>🌎</span>
                <span>Américas & Rutas</span>
              </button>
              <button
                type="button"
                onClick={() => setModoVista("colombia")}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  modoVista === "colombia"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>🇨🇴</span>
                <span>Enfoque Colombia</span>
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-3 sm:p-4">
          <div className="relative w-full aspect-[2/1] min-h-[300px] max-h-[500px] rounded-2xl overflow-hidden border border-border/70 bg-[#0f172a] shadow-inner select-none">
            {/* SVG del Mapa Mundi */}
            <svg
              viewBox={viewBoxActual}
              className="w-full h-full transition-all duration-700 ease-out cursor-grab"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                {/* Degradado oceánico de alta definición */}
                <linearGradient id="oceanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#091122" />
                  <stop offset="50%" stopColor="#0b172e" />
                  <stop offset="100%" stopColor="#0f172a" />
                </linearGradient>

                {/* Filtro de brillo para nodos líderes */}
                <filter id="glowFilter" x="-40%" y="-40%" width="180%" height="180%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Fondo oceánico */}
              <rect width="1000" height="500" fill="url(#oceanGrad)" />

              {/* Cuadrícula cartográfica de meridianos y paralelos */}
              <g opacity="0.12" stroke="#38bdf8" strokeWidth="0.5" strokeDasharray="2 3">
                <line x1="0" y1="125" x2="1000" y2="125" />
                <line x1="0" y1="250" x2="1000" y2="250" strokeWidth="0.8" />
                <line x1="0" y1="375" x2="1000" y2="375" />
                <line x1="250" y1="0" x2="250" y2="500" />
                <line x1="500" y1="0" x2="500" y2="500" strokeWidth="0.8" />
                <line x1="750" y1="0" x2="750" y2="500" />
              </g>

              {/* CONTINENTES DEL MUNDO (Base Cartográfica Vectorial Real) */}
              <path
                d={WORLD_LAND_PATH}
                fill="#1e293b"
                stroke="#334155"
                strokeWidth={modoVista === "colombia" ? "0.15" : "0.6"}
                className="transition-colors duration-300"
              />

              {/* PAÍSES CON VENTAS ACTIVAS ILUMINADOS */}
              {paisesDestacados.map((cCode) => {
                const cInfo = KEY_COUNTRIES_PATHS[cCode];
                if (!cInfo) return null;
                const esCol = cCode === "COL";

                return (
                  <path
                    key={`country-${cCode}`}
                    d={cInfo.path}
                    fill={esCol ? "rgba(16, 185, 129, 0.22)" : "rgba(14, 165, 233, 0.22)"}
                    stroke={esCol ? "#10b981" : "#38bdf8"}
                    strokeWidth={modoVista === "colombia" ? "0.2" : "0.9"}
                    className="transition-all duration-300 hover:fill-opacity-50 cursor-pointer"
                  />
                );
              })}

              {/* RUTAS COMERCIALES DE EXPORTACIÓN (Curvas Animadas desde Colombia HQ) */}
              {rutasExportacion.map((ruta) => (
                <g key={ruta.id} className="transition-opacity">
                  <path
                    d={ruta.pathD}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth={modoVista === "colombia" ? "0.3" : "1.6"}
                    strokeDasharray={modoVista === "colombia" ? "1 1" : "4 4"}
                    opacity="0.85"
                  />
                </g>
              ))}

              {/* PUNTOS Y BALIZAS GEOGRÁFICAS INTERACTIVAS */}
              {puntosMapeados.map((p) => {
                const colorFondo = p.tipo === "internacional" ? "#0ea5e9" : "#10b981";
                const colorGlow = p.tipo === "internacional" ? "rgba(14, 165, 233, 0.4)" : "rgba(16, 185, 129, 0.4)";
                const escalaAjuste = modoVista === "colombia" ? 0.35 : 1;
                const radioFinal = p.r * escalaAjuste;

                return (
                  <g
                    key={`punto-${p.nombre}`}
                    className="cursor-pointer group"
                    onClick={() => {
                      setZonaActivaNombre(p.nombre);
                      if (p.zonaData.id && onSelectZona) {
                        onSelectZona(p.zonaData.id, p.nombre);
                      }
                    }}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setHoverPunto({
                        nombre: p.nombre,
                        bandera: p.bandera,
                        pais: p.pais,
                        tipo: p.tipo,
                        venta: p.venta,
                        unidades: p.unidades,
                        porcentaje: p.porcentaje,
                        ciudadesCount: p.ciudadesCount,
                        refsCount: p.refsCount,
                        x: p.cx,
                        y: p.cy,
                      });
                    }}
                    onMouseLeave={() => setHoverPunto(null)}
                  >
                    {/* Anillo exterior pulsante */}
                    <circle
                      cx={p.cx}
                      cy={p.cy}
                      r={radioFinal * 1.9}
                      fill={colorFondo}
                      opacity={p.isSelected ? "0.45" : "0.25"}
                      className="animate-ping"
                      style={{ transformOrigin: `${p.cx}px ${p.cy}px` }}
                    />

                    {/* Halo de resplandor */}
                    <circle
                      cx={p.cx}
                      cy={p.cy}
                      r={radioFinal * 1.4}
                      fill={colorGlow}
                    />

                    {/* Núcleo del punto de ventas */}
                    <circle
                      cx={p.cx}
                      cy={p.cy}
                      r={radioFinal}
                      fill={p.isSelected ? "#ffffff" : colorFondo}
                      stroke={p.isSelected ? colorFondo : "#ffffff"}
                      strokeWidth={modoVista === "colombia" ? "0.3" : "1.8"}
                      filter={p.esLider ? "url(#glowFilter)" : undefined}
                      className="transition-transform duration-200 group-hover:scale-125"
                      style={{ transformOrigin: `${p.cx}px ${p.cy}px` }}
                    />

                    {/* Etiqueta de texto con bandera y nombre de la zona */}
                    {modoVista !== "colombia" && (
                      <text
                        x={p.cx + radioFinal + 3}
                        y={p.cy + 3}
                        fill="#ffffff"
                        fontSize={p.esLider || p.isSelected ? "9.5" : "8"}
                        fontWeight={p.esLider || p.isSelected ? "bold" : "600"}
                        className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] pointer-events-none"
                      >
                        {p.bandera} {p.nombre}
                      </text>
                    )}

                    {modoVista === "colombia" && (
                      <text
                        x={p.cx}
                        y={p.cy - radioFinal - 1}
                        fill="#ffffff"
                        textAnchor="middle"
                        fontSize="2.4"
                        fontWeight="bold"
                        className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)] pointer-events-none"
                      >
                        {p.nombre}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Tooltip flotante al pasar el mouse por encima de un marcador */}
            {hoverPunto && (
              <div
                className="absolute z-20 pointer-events-none p-2.5 rounded-xl bg-slate-900/95 text-white border border-slate-700/80 shadow-xl backdrop-blur-md text-xs min-w-[190px]"
                style={{
                  top: "12px",
                  right: "12px",
                }}
              >
                <div className="flex items-center gap-1.5 mb-1 pb-1 border-b border-slate-800">
                  <span className="text-base">{hoverPunto.bandera}</span>
                  <div>
                    <span className="font-extrabold text-foreground text-xs block text-white leading-tight">
                      {hoverPunto.nombre}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {hoverPunto.tipo === "internacional" ? `Mercado ${hoverPunto.pais}` : "Departamento de Colombia"}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] text-slate-400">Facturación:</span>
                    <span className="font-mono font-bold text-emerald-400 text-xs">
                      {formatoCOPFull(hoverPunto.venta)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] text-slate-400">Participación:</span>
                    <span className="font-bold text-sky-400 text-[11px]">
                      {hoverPunto.porcentaje.toFixed(1)}% del total
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] text-slate-400">Volumen:</span>
                    <span className="text-[11px] text-slate-200">
                      {hoverPunto.unidades.toLocaleString("es-CO")} prendas
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5 border-t border-slate-800">
                    <span>{hoverPunto.ciudadesCount} municipios</span>
                    <span>{hoverPunto.refsCount} referencias</span>
                  </div>
                </div>
              </div>
            )}

            {/* Controles flotantes en la esquina inferior izquierda del mapa */}
            <div className="absolute bottom-2.5 left-2.5 z-10 flex items-center gap-2 bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/60 text-[10px] text-white">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs" />
                <span className="font-semibold">Sede Matriz / Colombia</span>
              </div>
              <span className="text-slate-600">•</span>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shadow-xs" />
                <span className="font-semibold">Exportaciones</span>
              </div>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400">Haz clic en un punto para inspeccionarlo</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ============================================================== */}
      {/* 2. TARJETAS DE RESUMEN TERRITORIAL DEL ASESOR / VENDEDOR       */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-card border border-border/70 shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
            {vendedorNombre ? `Ventas de ${vendedorNombre}` : "Facturación Nacional Total"}
          </span>
          <span className="text-base font-extrabold text-foreground font-mono block mt-0.5">
            {formatoCOPFull(totalVentas)}
          </span>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
            {totalUnidades.toLocaleString("es-CO")} unidades comercializadas
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-card border border-border/70 shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
            Zonas con Ventas Activas
          </span>
          <span className="text-base font-extrabold text-sky-600 dark:text-sky-400 font-mono block mt-0.5">
            {zonasOrdenadas.length} Regiones / Mercados
          </span>
          <span className="text-[11px] text-muted-foreground font-medium">
            Presencia comercial registrada
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-card border border-border/70 shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
            Zona Líder (Mayor Ventas)
          </span>
          <span className="text-base font-extrabold text-foreground truncate block mt-0.5">
            {zonaLider ? zonaLider.zona : "Sin ventas"}
          </span>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
            {zonaLider ? `${formatoCOPFull(zonaLider.venta)} (${zonaLider.porcentaje.toFixed(1)}%)` : "$ 0 COP"}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-card border border-border/70 shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
            Municipio / Ciudad Líder
          </span>
          <span className="text-base font-extrabold text-foreground truncate block mt-0.5">
            {ciudadLider ? ciudadLider.ciudad : "Sin ventas"}
          </span>
          <span className="text-[11px] text-sky-600 dark:text-sky-400 font-semibold">
            {ciudadLider ? `${formatoCOPFull(ciudadLider.venta)} (${ciudadLider.porcentaje.toFixed(1)}% de zona)` : "$ 0 COP"}
          </span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. DOS COLUMNAS DE DETALLE: ZONAS + MUNICIPIOS Y REFERENCIAS   */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* COLUMNA IZQUIERDA: LISTA Y RANKING DE ZONAS (COL 5) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
              <MapPin className="h-3.5 w-3.5 text-emerald-500" />
              <span>Departamentos y Zonas con Ventas</span>
            </h3>
            <span className="text-[11px] text-muted-foreground">
              {zonasFiltradas.length} {zonasFiltradas.length === 1 ? "Zona" : "Zonas"}
            </span>
          </div>

          {/* Buscador de zonas o municipios */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar zona o ciudad del asesor..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="h-8 pl-8 text-xs bg-background rounded-xl border-border/80 shadow-2xs"
            />
          </div>

          {/* Lista scrolleable de zonas */}
          <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
            {zonasFiltradas.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-2xl bg-muted/10">
                No se registran ventas en zonas para el filtro seleccionado.
              </div>
            ) : (
              zonasFiltradas.map((z, idx) => {
                const isSelected = zonaActiva?.zona === z.zona;
                const esLider = idx === 0;

                return (
                  <div
                    key={z.zona}
                    onClick={() => {
                      setZonaActivaNombre(z.zona);
                      if (onSelectZona) {
                        onSelectZona(z.id, z.zona);
                      }
                    }}
                    className={`p-3 rounded-2xl border text-xs transition-all cursor-pointer ${
                      isSelected
                        ? "bg-emerald-500/10 border-emerald-500 shadow-xs ring-1 ring-emerald-500/30"
                        : "bg-card hover:bg-muted/40 border-border/70 shadow-2xs"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                            esLider
                              ? "bg-emerald-600 text-white shadow-xs"
                              : idx < 3
                              ? "bg-sky-500 text-white"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          #{idx + 1}
                        </span>
                        <div>
                          <span className="font-extrabold text-foreground text-xs block leading-tight">
                            {z.zona}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {z.ciudades?.length || 0} {z.ciudades?.length === 1 ? "ciudad" : "ciudades"} • {z.referencias?.length || 0} refs
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-extrabold text-foreground text-xs block">
                          {formatoCOPFull(z.venta)}
                        </span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                          {z.porcentaje.toFixed(1)}% del total
                        </span>
                      </div>
                    </div>

                    {/* Barra de progreso visual */}
                    <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden mb-1.5">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          esLider ? "bg-emerald-500" : "bg-sky-500"
                        }`}
                        style={{ width: `${Math.min(100, Math.max(3, z.porcentaje))}%` }}
                      />
                    </div>

                    {/* Previsualización de ciudades principales */}
                    {z.ciudades && z.ciudades.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1 border-t border-border/40">
                        {z.ciudades.slice(0, 3).map((c) => (
                          <span
                            key={c.ciudad}
                            className="px-1.5 py-0.5 rounded-md bg-muted/50 text-foreground text-[9.5px] font-medium"
                          >
                            {c.ciudad} ({c.porcentaje.toFixed(0)}%)
                          </span>
                        ))}
                        {z.ciudades.length > 3 && (
                          <span className="text-[9px] text-muted-foreground self-center">
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

        {/* COLUMNA DERECHA: DETALLE COMPLETO DE LA ZONA (CIUDADES + REFERENCIAS VENDIDAS) (COL 7) */}
        <div className="lg:col-span-7 space-y-4">
          {zonaActiva ? (
            <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs space-y-4">
              {/* Encabezado de la Zona Seleccionada */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-border/60 gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <MapPin className="h-4 w-4" />
                    </span>
                    <div>
                      <h4 className="text-sm font-extrabold text-foreground flex items-center gap-1.5">
                        <span>Zona: {zonaActiva.zona}</span>
                        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 font-bold border-emerald-500/30">
                          {zonaActiva.porcentaje.toFixed(1)}% Participación
                        </Badge>
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        {vendedorNombre
                          ? `Detalle comercial de municipios y referencias vendidas por ${vendedorNombre}`
                          : "Detalle comercial de municipios y referencias vendidas"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-right flex items-center gap-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                      Facturación en Zona
                    </span>
                    <span className="text-sm font-mono font-extrabold text-foreground block">
                      {formatoCOPFull(zonaActiva.venta)}
                    </span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      {zonaActiva.unidades.toLocaleString("es-CO")} prendas
                    </span>
                  </div>

                  {onSelectZona && (
                    <Button
                      size="sm"
                      onClick={() => onSelectZona(zonaActiva.id, zonaActiva.zona)}
                      className="h-8 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                    >
                      <Filter className="h-3.5 w-3.5 mr-1" />
                      <span>Filtrar Dashboard</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* Sub-sección 1: Ciudades y Municipios donde tuvo ventas */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5 text-sky-500" />
                    <span>Municipios y Ciudades ({zonaActiva.ciudades?.length || 0})</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground">Ordenado por facturación</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[140px] overflow-y-auto pr-1">
                  {(!zonaActiva.ciudades || zonaActiva.ciudades.length === 0) ? (
                    <p className="text-xs text-muted-foreground py-2">Sin ciudades registradas</p>
                  ) : (
                    zonaActiva.ciudades.map((c, cIdx) => (
                      <div
                        key={c.ciudad}
                        className="p-2 rounded-xl bg-background border border-border/60 flex items-center justify-between text-xs shadow-2xs"
                      >
                        <div className="flex items-center gap-1.5 truncate max-w-[150px]">
                          <span className="w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[9px] font-bold text-muted-foreground">
                            {cIdx + 1}
                          </span>
                          <span className="font-semibold text-foreground truncate">{c.ciudad}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-foreground text-[11px] block">
                            {formatoCOP(c.venta)}
                          </span>
                          <span className="text-[9.5px] text-muted-foreground">
                            {c.unidades.toLocaleString("es-CO")} unds ({c.porcentaje.toFixed(0)}%)
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Sub-sección 2: Referencias / Prendas Vendidas en esta Zona */}
              <div className="space-y-2 pt-2 border-t border-border/50">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-purple-500" />
                    <span>Referencias Vendidas en {zonaActiva.zona} ({referenciasZona.length})</span>
                  </span>

                  {/* Selector: Por Facturación vs Por Unidades */}
                  <div className="flex rounded-lg bg-muted p-0.5 border border-border/50 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setOrdenRefs("valor")}
                      className={`px-2 py-0.5 rounded font-semibold transition-all ${
                        ordenRefs === "valor"
                          ? "bg-background text-foreground shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Por Facturación ($)
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrdenRefs("unidades")}
                      className={`px-2 py-0.5 rounded font-semibold transition-all ${
                        ordenRefs === "unidades"
                          ? "bg-background text-foreground shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Por Unidades
                    </button>
                  </div>
                </div>

                {referenciasZona.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground border border-dashed rounded-xl bg-muted/10">
                    No se registran referencias vendidas en {zonaActiva.zona} para los filtros actuales.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-border/60 bg-background/60 max-h-[220px]">
                    <table className="w-full text-xs text-left">
                      <thead className="border-b border-border/80 uppercase text-[10px] text-muted-foreground font-bold bg-muted/30 sticky top-0">
                        <tr>
                          <th className="py-2 px-2.5">#</th>
                          <th className="py-2 px-2.5">SKU / Ref</th>
                          <th className="py-2 px-2.5">Nombre del Producto</th>
                          <th className="py-2 px-2.5">Línea</th>
                          <th className="py-2 px-2.5 text-right">Unidades</th>
                          <th className="py-2 px-2.5 text-right">Precio Prom.</th>
                          <th className="py-2 px-2.5 text-right">Facturación</th>
                          <th className="py-2 px-2.5 text-right">% en Zona</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40 text-[11px]">
                        {referenciasZona.map((ref, idx) => (
                          <tr key={`${ref.sku}-${idx}`} className="hover:bg-muted/40 transition-colors">
                            <td className="py-1.5 px-2.5 font-bold text-muted-foreground">
                              {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                            </td>
                            <td className="py-1.5 px-2.5 font-mono font-medium text-foreground">{ref.sku}</td>
                            <td className="py-1.5 px-2.5 font-semibold text-foreground truncate max-w-[140px]">
                              {ref.producto}
                            </td>
                            <td className="py-1.5 px-2.5 text-muted-foreground">{ref.linea}</td>
                            <td className="py-1.5 px-2.5 text-right font-medium">
                              {ref.unidades.toLocaleString("es-CO")}
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-mono text-muted-foreground">
                              {formatoCOP(ref.precioPromedio)}
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                              {formatoCOPFull(ref.valor)}
                            </td>
                            <td className="py-1.5 px-2.5 text-right">
                              <Badge variant="outline" className="text-[9.5px] font-bold bg-primary/5 py-0 px-1">
                                {Number(ref.porcentaje).toFixed(1)}%
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-muted-foreground border border-dashed rounded-2xl bg-muted/10">
              Selecciona una zona en el mapa o a la izquierda para inspeccionar sus municipios y referencias vendidas.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
