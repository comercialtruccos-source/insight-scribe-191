import React, { useState, useMemo, useRef, useEffect } from "react";
import { ZonaAporte, CatalogoItem } from "@/lib/ventas-api";
import { formatoCOPFull } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Globe2,
  MapPin,
  TrendingUp,
  Search,
  Plus,
  Minus,
  RotateCcw,
  Plane,
  Building2,
  Navigation,
  Compass,
  CheckCircle2,
  Layers,
  Sparkles,
  ExternalLink,
} from "lucide-react";

interface MapaVentasZonasProps {
  distribucionZonas?: ZonaAporte[];
  totalVentas?: number;
  totalUnidades?: number;
  paisesCatalogo?: CatalogoItem[];
  onSelectZona?: (zonaId: number | null, zonaNombre: string) => void;
  zonaSeleccionadaId?: number | null;
}

// =========================================================================
// DEFINICIÓN DE COORDENADAS Y RUTAS MUNDIALES (CANVAS 1000 x 540)
// =========================================================================

interface HubMundial {
  id: string;
  nombre: string;
  pais: string;
  bandera: string;
  cx: number;
  cy: number;
  tipo: "matriz" | "exportacion" | "cobertura";
  aliases: string[];
}

const HUBS_MUNDIALES: HubMundial[] = [
  {
    id: "colombia",
    nombre: "Colombia (Sede Matriz)",
    pais: "Colombia",
    bandera: "🇨🇴",
    cx: 275,
    cy: 288,
    tipo: "matriz",
    aliases: ["colombia", "co", "nacional"],
  },
  {
    id: "usa",
    nombre: "Estados Unidos",
    pais: "Estados Unidos",
    bandera: "🇺🇸",
    cx: 225,
    cy: 165,
    tipo: "exportacion",
    aliases: ["usa", "estados unidos", "eeuu", "miami", "florida", "us"],
  },
  {
    id: "mexico",
    nombre: "México",
    pais: "México",
    bandera: "🇲🇽",
    cx: 175,
    cy: 215,
    tipo: "exportacion",
    aliases: ["mexico", "méxico", "mx"],
  },
  {
    id: "costa_rica",
    nombre: "Costa Rica",
    pais: "Costa Rica",
    bandera: "🇨🇷",
    cx: 230,
    cy: 260,
    tipo: "exportacion",
    aliases: ["costa rica", "cr", "san jose"],
  },
  {
    id: "panama",
    nombre: "Panamá",
    pais: "Panamá",
    bandera: "🇵🇦",
    cx: 250,
    cy: 272,
    tipo: "exportacion",
    aliases: ["panama", "panamá", "pa"],
  },
  {
    id: "ecuador",
    nombre: "Ecuador",
    pais: "Ecuador",
    bandera: "🇪🇨",
    cx: 260,
    cy: 320,
    tipo: "exportacion",
    aliases: ["ecuador", "ec", "quito", "guayaquil"],
  },
  {
    id: "peru",
    nombre: "Perú",
    pais: "Perú",
    bandera: "🇵🇪",
    cx: 275,
    cy: 355,
    tipo: "exportacion",
    aliases: ["peru", "perú", "pe", "lima"],
  },
  {
    id: "chile",
    nombre: "Chile",
    pais: "Chile",
    bandera: "🇨🇱",
    cx: 280,
    cy: 440,
    tipo: "exportacion",
    aliases: ["chile", "cl", "santiago"],
  },
  {
    id: "espana",
    nombre: "España (Europa)",
    pais: "España",
    bandera: "🇪🇸",
    cx: 465,
    cy: 175,
    tipo: "exportacion",
    aliases: ["espana", "españa", "es", "madrid", "europa"],
  },
  {
    id: "puerto_rico",
    nombre: "Puerto Rico",
    pais: "Puerto Rico",
    bandera: "🇵🇷",
    cx: 290,
    cy: 240,
    tipo: "exportacion",
    aliases: ["puerto rico", "pr", "san juan"],
  },
  {
    id: "guatemala",
    nombre: "Guatemala",
    pais: "Guatemala",
    bandera: "🇬🇹",
    cx: 198,
    cy: 242,
    tipo: "exportacion",
    aliases: ["guatemala", "gt"],
  },
];

// Arcos de exportación comercial que parten desde Colombia (cx: 275, cy: 288)
const RUTAS_EXPORTACION = [
  { id: "ruta-usa", destino: "usa", path: "M 275 288 Q 230 205 225 165" },
  { id: "ruta-mexico", destino: "mexico", path: "M 275 288 Q 210 235 175 215" },
  { id: "ruta-costa-rica", destino: "costa_rica", path: "M 275 288 Q 250 270 230 260" },
  { id: "ruta-panama", destino: "panama", path: "M 275 288 Q 262 278 250 272" },
  { id: "ruta-ecuador", destino: "ecuador", path: "M 275 288 Q 268 305 260 320" },
  { id: "ruta-peru", destino: "peru", path: "M 275 288 Q 275 320 275 355" },
  { id: "ruta-chile", destino: "chile", path: "M 275 288 Q 265 370 280 440" },
  { id: "ruta-espana", destino: "espana", path: "M 275 288 Q 365 170 465 175" },
  { id: "ruta-puerto-rico", destino: "puerto_rico", path: "M 275 288 Q 285 260 290 240" },
  { id: "ruta-guatemala", destino: "guatemala", path: "M 275 288 Q 225 255 198 242" },
];

// =========================================================================
// DEFINICIÓN DE DEPARTAMENTOS DE COLOMBIA (CANVAS DETALLADO 600 x 700)
// =========================================================================

interface DepartamentoColombia {
  id: string;
  nombre: string;
  zonaId?: number;
  aliases: string[];
  cx: number;
  cy: number;
  path: string;
  ciudadPrincipal: string;
}

const DEPARTAMENTOS_COLOMBIA: DepartamentoColombia[] = [
  {
    id: "guajira",
    nombre: "La Guajira",
    aliases: ["guajira", "la guajira", "riohacha", "maicao"],
    ciudadPrincipal: "Riohacha",
    cx: 375,
    cy: 55,
    path: "M 320 100 C 335 70 365 30 395 35 C 415 40 425 65 410 95 C 385 115 355 110 320 100 Z",
  },
  {
    id: "magdalena",
    nombre: "Magdalena",
    aliases: ["magdalena", "santa marta", "cienaga"],
    ciudadPrincipal: "Santa Marta",
    cx: 310,
    cy: 115,
    path: "M 290 95 C 320 90 335 105 340 145 C 325 170 295 165 285 140 C 280 115 285 100 290 95 Z",
  },
  {
    id: "atlantico",
    nombre: "Atlántico",
    aliases: ["atlantico", "atlántico", "barranquilla", "soledad", "costa"],
    ciudadPrincipal: "Barranquilla",
    cx: 275,
    cy: 100,
    path: "M 265 85 C 285 85 292 98 290 115 C 280 125 265 120 262 105 C 260 95 262 88 265 85 Z",
  },
  {
    id: "bolivar",
    nombre: "Bolívar",
    aliases: ["bolivar", "bolívar", "cartagena", "magangue"],
    ciudadPrincipal: "Cartagena",
    cx: 270,
    cy: 175,
    path: "M 260 118 C 280 118 295 145 290 195 C 275 240 250 250 240 205 C 235 165 245 130 260 118 Z",
  },
  {
    id: "cesar",
    nombre: "Cesar",
    aliases: ["cesar", "valledupar", "aguachica"],
    ciudadPrincipal: "Valledupar",
    cx: 345,
    cy: 145,
    path: "M 330 105 C 365 110 360 160 350 200 C 335 205 320 180 325 150 C 328 120 330 108 330 105 Z",
  },
  {
    id: "cordoba",
    nombre: "Córdoba",
    aliases: ["cordoba", "córdoba", "monteria", "montería", "cerete"],
    ciudadPrincipal: "Montería",
    cx: 220,
    cy: 180,
    path: "M 210 150 C 240 145 252 165 245 210 C 230 225 200 215 195 185 C 195 165 205 152 210 150 Z",
  },
  {
    id: "sucre",
    nombre: "Sucre",
    aliases: ["sucre", "sincelejo", "corozal"],
    ciudadPrincipal: "Sincelejo",
    cx: 250,
    cy: 145,
    path: "M 240 135 C 260 130 265 148 260 165 C 250 175 235 168 235 152 Z",
  },
  {
    id: "antioquia",
    nombre: "Antioquia",
    aliases: ["antioquia", "medellin", "medellín", "bello", "itagui", "itaguí", "envigado", "rionegro", "apartado"],
    ciudadPrincipal: "Medellín",
    cx: 230,
    cy: 265,
    path: "M 195 210 C 220 205 255 215 275 240 C 285 275 265 315 225 310 C 190 305 175 265 180 235 C 182 220 190 212 195 210 Z",
  },
  {
    id: "santander",
    nombre: "Santander",
    aliases: ["santander", "bucaramanga", "floridablanca", "giron", "girón", "piedecuesta", "barrancabermeja"],
    ciudadPrincipal: "Bucaramanga",
    cx: 325,
    cy: 265,
    path: "M 290 220 C 330 225 345 255 340 305 C 315 315 285 300 282 265 C 280 240 285 225 290 220 Z",
  },
  {
    id: "norte_santander",
    nombre: "Norte de Santander",
    aliases: ["norte de santander", "cucuta", "cúcuta", "ocana", "santanderes"],
    ciudadPrincipal: "Cúcuta",
    cx: 360,
    cy: 220,
    path: "M 345 190 C 375 200 380 235 365 265 C 345 260 338 230 340 205 Z",
  },
  {
    id: "boyaca",
    nombre: "Boyacá",
    aliases: ["boyaca", "boyacá", "tunja", "sogamoso", "duitama", "chiquinquira"],
    ciudadPrincipal: "Tunja",
    cx: 335,
    cy: 330,
    path: "M 300 295 C 345 290 375 330 360 365 C 320 375 295 350 295 320 Z",
  },
  {
    id: "cundinamarca",
    nombre: "Cundinamarca / Bogotá",
    aliases: ["cundinamarca", "bogota", "bogotá", "centro", "soacha", "chia", "chía", "zipaquira", "facatativa"],
    ciudadPrincipal: "Bogotá D.C.",
    cx: 290,
    cy: 380,
    path: "M 275 335 C 310 330 325 360 320 405 C 295 425 265 410 260 375 C 258 350 268 338 275 335 Z",
  },
  {
    id: "caldas",
    nombre: "Caldas",
    aliases: ["caldas", "manizales", "la dorada", "chinchina"],
    ciudadPrincipal: "Manizales",
    cx: 232,
    cy: 330,
    path: "M 220 318 C 248 318 252 338 245 350 C 228 352 218 340 220 318 Z",
  },
  {
    id: "risaralda",
    nombre: "Risaralda",
    aliases: ["risaralda", "pereira", "dosquebradas", "santa rosa de cabal"],
    ciudadPrincipal: "Pereira",
    cx: 215,
    cy: 348,
    path: "M 205 338 C 225 338 228 355 222 368 C 208 368 200 355 205 338 Z",
  },
  {
    id: "quindio",
    nombre: "Quindío",
    aliases: ["quindio", "quindío", "armenia", "calarca", "montenegro", "quimbaya"],
    ciudadPrincipal: "Armenia",
    cx: 224,
    cy: 372,
    path: "M 215 362 C 235 362 238 378 232 388 C 218 388 212 378 215 362 Z",
  },
  {
    id: "tolima",
    nombre: "Tolima",
    aliases: ["tolima", "ibague", "ibagué", "espinal", "melgar", "honda"],
    ciudadPrincipal: "Ibagué",
    cx: 250,
    cy: 405,
    path: "M 235 365 C 265 368 270 415 260 455 C 235 445 225 415 230 385 Z",
  },
  {
    id: "valle",
    nombre: "Valle del Cauca",
    aliases: ["valle", "valle del cauca", "cali", "palmira", "buenaventura", "tulua", "tuluá", "cartago", "buga", "jamundi"],
    ciudadPrincipal: "Cali",
    cx: 175,
    cy: 415,
    path: "M 155 360 C 205 365 210 435 195 470 C 150 460 135 415 145 380 Z",
  },
  {
    id: "cauca",
    nombre: "Cauca",
    aliases: ["cauca", "popayan", "popayán", "santander de quilichao"],
    ciudadPrincipal: "Popayán",
    cx: 170,
    cy: 485,
    path: "M 150 450 C 195 460 198 510 180 540 C 145 530 135 490 145 465 Z",
  },
  {
    id: "narino",
    nombre: "Nariño",
    aliases: ["narino", "nariño", "pasto", "sur", "ipiales", "tumaco"],
    ciudadPrincipal: "Pasto",
    cx: 140,
    cy: 555,
    path: "M 120 510 C 175 520 180 575 155 610 C 110 595 100 550 115 525 Z",
  },
  {
    id: "huila",
    nombre: "Huila",
    aliases: ["huila", "neiva", "pitalito", "garzon"],
    ciudadPrincipal: "Neiva",
    cx: 235,
    cy: 480,
    path: "M 220 440 C 255 450 250 510 235 550 C 205 535 200 485 215 455 Z",
  },
  {
    id: "meta",
    nombre: "Meta",
    aliases: ["meta", "villavicencio", "acacias", "granada", "llanos"],
    ciudadPrincipal: "Villavicencio",
    cx: 340,
    cy: 435,
    path: "M 305 390 C 385 395 410 455 380 515 C 295 510 275 450 300 405 Z",
  },
  {
    id: "casanare",
    nombre: "Casanare",
    aliases: ["casanare", "yopal", "aguazul"],
    ciudadPrincipal: "Yopal",
    cx: 405,
    cy: 335,
    path: "M 360 295 C 440 315 445 375 395 395 C 350 375 345 325 360 295 Z",
  },
  {
    id: "arauca",
    nombre: "Arauca",
    aliases: ["arauca", "tame", "saravena"],
    ciudadPrincipal: "Arauca",
    cx: 445,
    cy: 260,
    path: "M 380 235 C 485 245 470 295 410 295 C 375 275 370 245 380 235 Z",
  },
  {
    id: "choco",
    nombre: "Chocó",
    aliases: ["choco", "chocó", "quibdo", "quibdó", "istmina"],
    ciudadPrincipal: "Quibdó",
    cx: 160,
    cy: 300,
    path: "M 155 220 C 185 235 180 345 150 355 C 130 330 135 250 155 220 Z",
  },
  {
    id: "orinoquia_amazonia",
    nombre: "Región Sur / Amazonía",
    aliases: ["amazonas", "caqueta", "caquetá", "putumayo", "guaviare", "vaupes", "vaupés", "vichada", "leticia", "florencia"],
    ciudadPrincipal: "Florencia / Leticia",
    cx: 380,
    cy: 560,
    path: "M 250 515 C 340 480 470 410 520 460 C 535 550 495 650 350 670 C 235 640 215 570 250 515 Z",
  },
  {
    id: "san_andres",
    nombre: "San Andrés y Providencia",
    aliases: ["san andres", "san andrés", "providencia"],
    ciudadPrincipal: "San Andrés",
    cx: 90,
    cy: 65,
    path: "M 75 50 C 95 48 105 60 102 75 C 92 88 78 85 75 70 Z",
  },
];

export function MapaVentasZonas({
  distribucionZonas = [],
  totalVentas = 0,
  totalUnidades = 0,
  paisesCatalogo = [],
  onSelectZona,
  zonaSeleccionadaId,
}: MapaVentasZonasProps) {
  // Modo inicial: Mapa Mundi global con Colombia destacada y exportaciones
  const [modoVista, setModoVista] = useState<"mundo" | "colombia">("mundo");
  const [busqueda, setBusqueda] = useState<string>("");

  // Estado de zoom y navegación
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Región activa bajo hover o selección
  const [hoverItem, setHoverItem] = useState<{
    nombre: string;
    subtitulo: string;
    bandera?: string;
    venta: number;
    unidades: number;
    porcentaje: number;
    tipo?: string;
    ciudades?: string[];
    x: number;
    y: number;
  } | null>(null);

  // Región enfocada para el panel lateral
  const [regionEnfocada, setRegionEnfocada] = useState<{
    id?: string | number;
    nombre: string;
    bandera?: string;
    venta: number;
    unidades: number;
    porcentaje: number;
    ciudades?: Array<{ ciudad: string; venta: number; unidades: number; porcentaje: number }>;
    esInternacional?: boolean;
  } | null>(null);

  // Mapear datos de zonas por nombre normalizado
  const zonasMap = useMemo(() => {
    const map = new Map<string, ZonaAporte>();
    for (const z of distribucionZonas) {
      map.set(z.zona.toLowerCase().trim(), z);
    }
    return map;
  }, [distribucionZonas]);

  // Buscar datos de zona para un departamento
  const obtenerDatosZona = (aliases: string[]) => {
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

  // Calcular valor máximo para la escala de calor
  const maxVenta = useMemo(() => {
    if (distribucionZonas.length === 0) return 1;
    return Math.max(...distribucionZonas.map((z) => z.venta), 1);
  }, [distribucionZonas]);

  // Color coroplético según volumen de venta
  const getColorCalor = (venta: number, esSeleccionado: boolean) => {
    if (esSeleccionado) return "#10b981"; // Emerald intenso
    if (!venta || venta <= 0) return "rgba(148, 163, 184, 0.22)"; // Slate neutro
    const ratio = Math.min(1, venta / maxVenta);
    if (ratio > 0.6) return "rgba(16, 185, 129, 0.88)"; // Verde líder
    if (ratio > 0.3) return "rgba(59, 130, 246, 0.82)"; // Azul corporativo
    if (ratio > 0.1) return "rgba(99, 102, 241, 0.75)"; // Indigo
    return "rgba(168, 85, 247, 0.65)"; // Púrpura suave
  };

  // Métricas agregadas de exportación vs nacional
  const metricasGlobales = useMemo(() => {
    let ventaExport = 0;
    let unidadesExport = 0;
    for (const z of distribucionZonas) {
      const zNom = z.zona.toUpperCase();
      if (
        zNom.includes("EXPORT") ||
        zNom.includes("INTERNACIONAL") ||
        zNom.includes("USA") ||
        zNom.includes("EXTERIOR")
      ) {
        ventaExport += z.venta;
        unidadesExport += z.unidades;
      }
    }
    const ventaNac = Math.max(0, totalVentas - ventaExport);
    const unidadesNac = Math.max(0, totalUnidades - unidadesExport);
    const pctExport = totalVentas > 0 ? (ventaExport / totalVentas) * 100 : 0;
    const pctNac = totalVentas > 0 ? (ventaNac / totalVentas) * 100 : 100;

    return {
      ventaNac,
      unidadesNac,
      pctNac,
      ventaExport,
      unidadesExport,
      pctExport,
      totalZonasActivas: distribucionZonas.filter((z) => z.venta > 0).length,
    };
  }, [distribucionZonas, totalVentas, totalUnidades]);

  // Inicializar región enfocada con la principal zona activa o la seleccionada
  useEffect(() => {
    if (zonaSeleccionadaId) {
      const z = distribucionZonas.find((item) => item.id === zonaSeleccionadaId);
      if (z) {
        setRegionEnfocada({
          id: z.id,
          nombre: z.zona,
          bandera: "🇨🇴",
          venta: z.venta,
          unidades: z.unidades,
          porcentaje: z.porcentaje,
          ciudades: z.ciudades || [],
          esInternacional: false,
        });
        return;
      }
    }

    if (distribucionZonas.length > 0 && !regionEnfocada) {
      const top1 = distribucionZonas[0];
      setRegionEnfocada({
        id: top1.id,
        nombre: top1.zona,
        bandera: "🇨🇴",
        venta: top1.venta,
        unidades: top1.unidades,
        porcentaje: top1.porcentaje,
        ciudades: top1.ciudades || [],
        esInternacional: false,
      });
    }
  }, [distribucionZonas, zonaSeleccionadaId]);

  // Manejo de Pan y Drag
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleZoomIn = () => {
    setZoom((z) => Math.min(3.5, z + 0.3));
  };

  const handleZoomOut = () => {
    setZoom((z) => Math.max(0.8, z - 0.3));
  };

  const handleFocusColombia = () => {
    setModoVista("colombia");
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleFocusMundo = () => {
    setModoVista("mundo");
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Filtrado reactivo al escribir en el buscador
  const departamentosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return DEPARTAMENTOS_COLOMBIA;
    const q = busqueda.toLowerCase().trim();
    return DEPARTAMENTOS_COLOMBIA.filter(
      (d) =>
        d.nombre.toLowerCase().includes(q) ||
        d.ciudadPrincipal.toLowerCase().includes(q) ||
        d.aliases.some((a) => a.includes(q))
    );
  }, [busqueda]);

  const hubsFiltrados = useMemo(() => {
    if (!busqueda.trim()) return HUBS_MUNDIALES;
    const q = busqueda.toLowerCase().trim();
    return HUBS_MUNDIALES.filter(
      (h) => h.nombre.toLowerCase().includes(q) || h.aliases.some((a) => a.includes(q))
    );
  }, [busqueda]);

  return (
    <Card className="border-border/80 shadow-md overflow-hidden bg-card/95 backdrop-blur-xs">
      <CardHeader className="pb-3 border-b border-border/60 bg-muted/20">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Globe2 className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
                  <span>Mapa Mundi Interactivo y Cobertura Territorial</span>
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-semibold">
                    Live BI
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Visualizador geográfico mundial de ventas nacionales y rutas de exportación internacional
                </CardDescription>
              </div>
            </div>
          </div>

          {/* Selector de Modo de Mapa y Buscador */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Buscador de Territorios */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar país, depto o ciudad..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="h-8 pl-8 text-xs w-[180px] bg-background rounded-xl border-border/80 shadow-2xs"
              />
            </div>

            {/* Selector de Modo: Mundo vs Colombia */}
            <div className="flex rounded-xl bg-muted p-0.5 border border-border/60 shadow-2xs">
              <button
                type="button"
                onClick={handleFocusMundo}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                  modoVista === "mundo"
                    ? "bg-background shadow-xs text-foreground font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Globe2 className="h-3.5 w-3.5 text-blue-500" />
                <span>Mapa Mundi (Global)</span>
              </button>
              <button
                type="button"
                onClick={handleFocusColombia}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                  modoVista === "colombia"
                    ? "bg-background shadow-xs text-foreground font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <MapPin className="h-3.5 w-3.5 text-emerald-500" />
                <span>Colombia (Deptos)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Barra de KPIs Resumen Geográfico */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 mt-1">
          <div className="p-2 rounded-xl bg-background/80 border border-border/50 text-xs shadow-2xs">
            <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">
              Ventas Nacionales (CO)
            </span>
            <span className="font-extrabold text-foreground text-sm font-mono block">
              {formatoCOPFull(metricasGlobales.ventaNac)}
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
              {metricasGlobales.pctNac.toFixed(1)}% del total • {metricasGlobales.unidadesNac.toLocaleString("es-CO")} unds
            </span>
          </div>

          <div className="p-2 rounded-xl bg-background/80 border border-border/50 text-xs shadow-2xs">
            <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">
              Exportaciones Activas
            </span>
            <span className="font-extrabold text-blue-600 dark:text-blue-400 text-sm font-mono block">
              {formatoCOPFull(metricasGlobales.ventaExport)}
            </span>
            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
              {metricasGlobales.pctExport.toFixed(1)}% del total • {metricasGlobales.unidadesExport.toLocaleString("es-CO")} unds
            </span>
          </div>

          <div className="p-2 rounded-xl bg-background/80 border border-border/50 text-xs shadow-2xs">
            <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">
              Zonas Comerciales Activas
            </span>
            <span className="font-extrabold text-purple-600 dark:text-purple-400 text-sm font-mono block">
              {metricasGlobales.totalZonasActivas} Regiones
            </span>
            <span className="text-[10px] text-muted-foreground font-semibold">
              Cobertura en 32 departamentos
            </span>
          </div>

          <div className="p-2 rounded-xl bg-background/80 border border-border/50 text-xs shadow-2xs">
            <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">
              Zona Líder en Ventas
            </span>
            <span className="font-extrabold text-foreground text-sm truncate block font-display">
              {distribucionZonas[0]?.zona || "N/A"}
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
              {distribucionZonas[0]?.porcentaje?.toFixed(1) ?? 0}% participación
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* ========================================================================= */}
          {/* LIENZO CARTOGRÁFICO INTERACTIVO */}
          {/* ========================================================================= */}
          <div
            className="lg:col-span-8 relative min-h-[440px] rounded-2xl border border-border/60 bg-gradient-to-b from-slate-900/90 via-slate-950 to-slate-900 overflow-hidden shadow-inner cursor-grab active:cursor-grabbing select-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Controles Flotantes de Zoom y Posición */}
            <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5 bg-background/90 backdrop-blur-md p-1.5 rounded-xl border border-border/70 shadow-lg">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomIn}
                className="h-7 w-7 rounded-lg hover:bg-muted"
                title="Acercar mapa (+)"
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomOut}
                className="h-7 w-7 rounded-lg hover:bg-muted"
                title="Alejar mapa (-)"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleResetZoom}
                className="h-7 w-7 rounded-lg hover:bg-muted"
                title="Restablecer vista centrada"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Badge de Estado del Modo */}
            <div className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-background/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-border/70 text-xs font-semibold shadow-md">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              {modoVista === "mundo" ? (
                <span className="text-foreground">
                  Mapa Mundi: <strong>Rutas Comerciales Globales</strong> (Haz clic en Colombia para explorar departamentos)
                </span>
              ) : (
                <span className="text-foreground">
                  Colombia: <strong>Distribución por Departamentos</strong> (Haz clic para filtrar el dashboard)
                </span>
              )}
            </div>

            {/* Leyenda de Escala de Calor */}
            <div className="absolute bottom-3 left-3 z-20 flex items-center gap-2 bg-background/90 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-border/70 text-[10px] shadow-md">
              <span className="text-muted-foreground font-semibold">Concentración:</span>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-xs bg-purple-500/80" title="Bajo" />
                <span className="w-3 h-3 rounded-xs bg-indigo-500" title="Medio" />
                <span className="w-3 h-3 rounded-xs bg-blue-500" title="Alto" />
                <span className="w-3 h-3 rounded-xs bg-emerald-500" title="Líder" />
              </div>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">Mayor Ventas</span>
            </div>

            {/* SVG CARTOGRÁFICO DINÁMICO */}
            <svg
              viewBox={modoVista === "mundo" ? "0 0 1000 520" : "50 20 500 660"}
              className="w-full h-full min-h-[440px] max-h-[500px]"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: "center center",
                transition: isDragging ? "none" : "transform 0.25s ease-out",
              }}
            >
              <defs>
                {/* Gradiente de Océano */}
                <radialGradient id="oceanGrad" cx="50%" cy="50%" r="70%">
                  <stop offset="0%" stopColor="#0f172a" />
                  <stop offset="100%" stopColor="#020617" />
                </radialGradient>

                {/* Filtro de Resplandor Neon */}
                <filter id="glowNeon" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>

                {/* Gradiente de las Líneas de Vuelo / Exportación */}
                <linearGradient id="tradeLineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="50%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>

              {/* Fondo Oceánico */}
              <rect width="1000" height="520" fill="url(#oceanGrad)" />

              {/* ================================================================= */}
              {/* VISTA 1: MAPA MUNDI COMPLETO */}
              {/* ================================================================= */}
              {modoVista === "mundo" && (
                <g>
                  {/* Cuadrícula Cartográfica de Latitud y Longitud */}
                  <g opacity={0.12} stroke="#94a3b8" strokeWidth={0.7} strokeDasharray="3 3">
                    {/* Paralelos */}
                    <line x1={0} y1={130} x2={1000} y2={130} />
                    <line x1={0} y1={260} x2={1000} y2={260} strokeWidth={1} stroke="#38bdf8" /> {/* Ecuador */}
                    <line x1={0} y1={390} x2={1000} y2={390} />
                    {/* Meridianos */}
                    <line x1={250} y1={0} x2={250} y2={520} />
                    <line x1={480} y1={0} x2={480} y2={520} strokeWidth={1} stroke="#38bdf8" /> {/* Greenwich */}
                    <line x1={720} y1={0} x2={720} y2={520} />
                  </g>

                  {/* CONTINENTES DEL MUNDO (Siluetas Realistas) */}
                  <g fill="#1e293b" stroke="#334155" strokeWidth={0.8} opacity={0.85}>
                    {/* Norteamérica (Canadá, USA, Alaska, México) */}
                    <path
                      d="M 120 70 C 160 55 240 60 280 85 C 310 105 320 140 300 170 C 275 190 260 215 220 220 C 180 230 150 190 135 150 C 110 130 95 90 120 70 Z"
                      className="hover:fill-slate-800 transition-colors"
                    />

                    {/* Groenlandia */}
                    <path d="M 330 45 C 355 40 380 55 365 75 C 345 85 330 70 330 45 Z" />

                    {/* Centroamérica y Caribe */}
                    <path d="M 190 225 C 220 235 240 260 255 275 L 245 280 C 230 265 205 245 190 225 Z" />
                    <circle cx={285} cy={240} r={5} /> {/* Cuba / Caribe */}
                    <circle cx={300} cy={245} r={3.5} /> {/* Puerto Rico / Antillas */}

                    {/* Sudamérica Continental (Excepto Colombia) */}
                    <path
                      d="M 285 300 C 330 305 375 330 370 375 C 360 420 335 460 300 495 C 285 510 270 480 275 440 C 265 390 250 350 265 315 Z"
                      className="hover:fill-slate-800 transition-colors"
                    />

                    {/* Europa (Reino Unido, Península Ibérica, Francia, Europa Central, Escandinavia) */}
                    <path
                      d="M 440 140 C 470 120 520 125 540 150 C 530 180 500 195 470 190 C 445 185 435 160 440 140 Z"
                      className="hover:fill-slate-800 transition-colors"
                    />
                    <circle cx={445} cy={135} r={8} /> {/* Islas Británicas */}

                    {/* África */}
                    <path
                      d="M 460 210 C 510 200 550 225 565 270 C 570 330 540 395 515 425 C 490 410 475 350 460 310 C 440 260 445 220 460 210 Z"
                      className="hover:fill-slate-800 transition-colors"
                    />
                    <ellipse cx={570} cy={380} rx={6} ry={14} transform="rotate(15 570 380)" /> {/* Madagascar */}

                    {/* Asia & Medio Oriente */}
                    <path
                      d="M 550 110 C 620 90 750 100 820 135 C 800 190 770 240 730 260 C 680 275 640 250 610 220 C 580 200 550 160 550 110 Z"
                      className="hover:fill-slate-800 transition-colors"
                    />
                    <path d="M 660 230 C 685 240 705 280 680 295 C 660 280 655 250 660 230 Z" /> {/* Subcontinente Indio */}
                    <circle cx={815} cy={195} r={8} /> {/* Japón */}

                    {/* Oceanía (Australia y Nueva Zelanda) */}
                    <path
                      d="M 760 365 C 810 355 850 375 845 420 C 815 440 770 435 755 400 Z"
                      className="hover:fill-slate-800 transition-colors"
                    />
                    <ellipse cx={870} cy={440} rx={4} ry={10} transform="rotate(-25 870 440)" /> {/* Nueva Zelanda */}
                  </g>

                  {/* COLOMBIA: TERRITORIO DESTACADO EN EL MAPA MUNDI */}
                  <g
                    className="cursor-pointer group"
                    onClick={handleFocusColombia}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setHoverItem({
                        nombre: "Colombia",
                        subtitulo: "Sede Matriz Trucco's Fashion",
                        bandera: "🇨🇴",
                        venta: metricasGlobales.ventaNac,
                        unidades: metricasGlobales.unidadesNac,
                        porcentaje: metricasGlobales.pctNac,
                        tipo: "Sede Principal & Fábrica",
                        x: rect.left + rect.width / 2,
                        y: rect.top - 10,
                      });
                    }}
                    onMouseLeave={() => setHoverItem(null)}
                  >
                    {/* Polígono estilizado de Colombia */}
                    <path
                      d="M 268 275 C 285 272 295 285 292 305 C 285 320 270 322 262 305 C 260 290 264 278 268 275 Z"
                      fill="#10b981"
                      stroke="#ffffff"
                      strokeWidth={1.8}
                      className="drop-shadow-lg transition-transform group-hover:scale-110"
                      filter="url(#glowNeon)"
                    />
                    {/* Radar concéntrico animado */}
                    <circle cx={275} cy={288} r={14} fill="none" stroke="#10b981" strokeWidth={1.5} className="animate-ping" opacity={0.6} />
                    <circle cx={275} cy={288} r={6} fill="#ffffff" stroke="#10b981" strokeWidth={2} />
                    <text x={275} y={268} fill="#10b981" fontSize={11} fontWeight={800} textAnchor="middle" className="select-none pointer-events-none drop-shadow-md">
                      🇨🇴 COLOMBIA (HQ)
                    </text>
                  </g>

                  {/* RUTAS Y ARCOS DE EXPORTACIÓN COMERCIAL */}
                  <g>
                    {RUTAS_EXPORTACION.map((ruta) => (
                      <g key={ruta.id} className="pointer-events-none">
                        <path
                          d={ruta.path}
                          fill="none"
                          stroke="url(#tradeLineGrad)"
                          strokeWidth={1.8}
                          strokeDasharray="5 4"
                          opacity={0.75}
                        />
                      </g>
                    ))}
                  </g>

                  {/* HUBS INTERNACIONALES DE EXPORTACIÓN */}
                  {hubsFiltrados.filter((h) => h.id !== "colombia").map((hub) => (
                    <g
                      key={hub.id}
                      className="cursor-pointer group"
                      onClick={() => {
                        setRegionEnfocada({
                          id: hub.id,
                          nombre: hub.nombre,
                          bandera: hub.bandera,
                          venta: Math.round(metricasGlobales.ventaExport * 0.25),
                          unidades: Math.round(metricasGlobales.unidadesExport * 0.25),
                          porcentaje: 5.2,
                          esInternacional: true,
                        });
                      }}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setHoverItem({
                          nombre: hub.nombre,
                          subtitulo: "Destino de Exportación Internacional",
                          bandera: hub.bandera,
                          venta: Math.round(metricasGlobales.ventaExport * 0.25),
                          unidades: Math.round(metricasGlobales.unidadesExport * 0.25),
                          porcentaje: 5.2,
                          tipo: "Exportación Directa",
                          x: rect.left + rect.width / 2,
                          y: rect.top - 10,
                        });
                      }}
                      onMouseLeave={() => setHoverItem(null)}
                    >
                      <circle
                        cx={hub.cx}
                        cy={hub.cy}
                        r={6}
                        fill="#3b82f6"
                        stroke="#ffffff"
                        strokeWidth={1.8}
                        className="transition-transform group-hover:scale-125"
                      />
                      <circle cx={hub.cx} cy={hub.cy} r={2} fill="#ffffff" />
                      <text
                        x={hub.cx}
                        y={hub.cy - 10}
                        fill="#cbd5e1"
                        fontSize={9}
                        fontWeight={700}
                        textAnchor="middle"
                        className="select-none pointer-events-none drop-shadow-md group-hover:fill-white"
                      >
                        {hub.bandera} {hub.nombre.split(" ")[0]}
                      </text>
                    </g>
                  ))}
                </g>
              )}

              {/* ================================================================= */}
              {/* VISTA 2: MAPA DE COLOMBIA DETALLADO POR DEPARTAMENTOS */}
              {/* ================================================================= */}
              {modoVista === "colombia" && (
                <g>
                  {/* Cuadrícula sutil de fondo */}
                  <g opacity={0.08} stroke="#94a3b8" strokeWidth={0.6}>
                    <line x1={50} y1={200} x2={550} y2={200} />
                    <line x1={50} y1={400} x2={550} y2={400} />
                    <line x1={200} y1={50} x2={200} y2={650} />
                    <line x1={400} y1={50} x2={400} y2={650} />
                  </g>

                  {/* DEPARTAMENTOS DE COLOMBIA */}
                  {departamentosFiltrados.map((dep) => {
                    const zData = obtenerDatosZona(dep.aliases);
                    const venta = zData?.venta || 0;
                    const unidades = zData?.unidades || 0;
                    const porcentaje = zData?.porcentaje || 0;
                    const esSeleccionado =
                      (zonaSeleccionadaId && zData?.id === zonaSeleccionadaId) ||
                      (regionEnfocada && regionEnfocada.nombre.toLowerCase().includes(dep.nombre.toLowerCase()));
                    const fill = getColorCalor(venta, Boolean(esSeleccionado));

                    return (
                      <g
                        key={dep.id}
                        className="cursor-pointer group"
                        onClick={() => {
                          if (zData && onSelectZona) {
                            onSelectZona(zData.id, zData.zona);
                          }
                          setRegionEnfocada({
                            id: zData?.id || dep.id,
                            nombre: dep.nombre,
                            bandera: "🇨🇴",
                            venta,
                            unidades,
                            porcentaje,
                            ciudades: zData?.ciudades || [],
                            esInternacional: false,
                          });
                        }}
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setHoverItem({
                            nombre: dep.nombre,
                            subtitulo: `Capital: ${dep.ciudadPrincipal}`,
                            bandera: "🇨🇴",
                            venta,
                            unidades,
                            porcentaje,
                            tipo: "Departamento / Región Comercial",
                            ciudades: zData?.ciudades?.map((c) => c.ciudad),
                            x: rect.left + rect.width / 2,
                            y: rect.top - 10,
                          });
                        }}
                        onMouseLeave={() => setHoverItem(null)}
                      >
                        <path
                          d={dep.path}
                          fill={fill}
                          stroke={esSeleccionado ? "#ffffff" : "#475569"}
                          strokeWidth={esSeleccionado ? 2.5 : 1.2}
                          className="transition-all duration-200 group-hover:opacity-90 group-hover:stroke-primary group-hover:stroke-2"
                        />

                        {/* Pin del Departamento con Nombre */}
                        <circle
                          cx={dep.cx}
                          cy={dep.cy}
                          r={venta > 0 ? (esSeleccionado ? 6 : 4.5) : 2.5}
                          fill={esSeleccionado ? "#ffffff" : venta > 0 ? "#38bdf8" : "#94a3b8"}
                          stroke="#0f172a"
                          strokeWidth={1.2}
                        />

                        <text
                          x={dep.cx}
                          y={dep.cy - 7}
                          fontSize={9.5}
                          fontWeight={esSeleccionado ? "800" : venta > 0 ? "700" : "500"}
                          textAnchor="middle"
                          fill={esSeleccionado ? "#ffffff" : venta > 0 ? "#f8fafc" : "#cbd5e1"}
                          className="pointer-events-none select-none drop-shadow-md"
                        >
                          {dep.nombre.split(" / ")[0]}
                        </text>
                      </g>
                    );
                  })}
                </g>
              )}
            </svg>

            {/* Tooltip Reactivo Flotante */}
            {hoverItem && (
              <div
                className="fixed z-50 pointer-events-none p-3 rounded-xl bg-popover/95 text-popover-foreground shadow-2xl border border-border/80 backdrop-blur-md min-w-[200px] text-xs transform -translate-x-1/2 -translate-y-full"
                style={{ left: hoverItem.x, top: hoverItem.y }}
              >
                <div className="flex items-center gap-1.5 font-bold text-sm border-b pb-1.5 mb-1.5">
                  <span>{hoverItem.bandera}</span>
                  <span className="truncate">{hoverItem.nombre}</span>
                </div>
                <div className="text-[10px] text-muted-foreground font-semibold mb-2">
                  {hoverItem.subtitulo}
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Facturación:</span>
                    <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                      {formatoCOPFull(hoverItem.venta)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Volumen:</span>
                    <span className="font-semibold">{Math.round(hoverItem.unidades).toLocaleString("es-CO")} unds</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Participación:</span>
                    <span className="font-bold">{hoverItem.porcentaje.toFixed(2)}%</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* PANEL LATERAL: DETALLE DE LA ZONA / PAÍS SELECCIONADO */}
          {/* ========================================================================= */}
          <div className="lg:col-span-4 flex flex-col gap-3">
            {regionEnfocada ? (
              <Card className="border-border/80 bg-background/95 shadow-sm">
                <CardHeader className="pb-3 border-b border-border/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{regionEnfocada.bandera || "📍"}</span>
                      <div>
                        <CardTitle className="text-base font-bold text-foreground">
                          {regionEnfocada.nombre}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {regionEnfocada.esInternacional
                            ? "Mercado de Exportación Internacional"
                            : "Departamento / Zona Comercial Nacional"}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="outline" className="font-mono text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                      {regionEnfocada.porcentaje.toFixed(2)}% Total
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="pt-3 space-y-3">
                  {/* Cifras Clave */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border/50">
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase block">
                        Facturación Neta
                      </span>
                      <span className="font-extrabold text-sm font-mono text-emerald-600 dark:text-emerald-400">
                        {formatoCOPFull(regionEnfocada.venta)}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border/50">
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase block">
                        Prendas Vendidas
                      </span>
                      <span className="font-extrabold text-sm font-mono text-foreground">
                        {Math.round(regionEnfocada.unidades).toLocaleString("es-CO")} unds
                      </span>
                    </div>
                  </div>

                  {/* Barra de Aporte Relativo */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground font-medium">Aporte a Facturación Global</span>
                      <span className="font-bold text-foreground">{regionEnfocada.porcentaje.toFixed(2)}%</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(5, regionEnfocada.porcentaje))}%` }}
                      />
                    </div>
                  </div>

                  {/* Desglose de Ciudades en esa Zona */}
                  {regionEnfocada.ciudades && regionEnfocada.ciudades.length > 0 && (
                    <div className="pt-2 border-t border-border/50">
                      <span className="text-xs font-bold text-foreground block mb-1.5 flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-blue-500" />
                        Ciudades Activas ({regionEnfocada.ciudades.length})
                      </span>
                      <div className="space-y-1.5 max-h-[150px] overflow-y-auto pr-1">
                        {regionEnfocada.ciudades.map((c) => (
                          <div
                            key={c.ciudad}
                            className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors"
                          >
                            <span className="font-semibold text-foreground">{c.ciudad}</span>
                            <div className="text-right font-mono">
                              <span className="font-bold text-foreground">{formatoCOPFull(c.venta)}</span>
                              <span className="text-[10px] text-muted-foreground ml-1.5">
                                ({c.porcentaje.toFixed(1)}%)
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Botón de Acción para Filtrar o Desfiltrar */}
                  <div className="pt-2">
                    {zonaSeleccionadaId && typeof regionEnfocada.id === "number" && zonaSeleccionadaId === regionEnfocada.id ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onSelectZona && onSelectZona(null, "")}
                        className="w-full text-xs font-bold border-rose-500/40 text-rose-600 hover:bg-rose-500/10"
                      >
                        ✕ Quitar Filtro de esta Zona
                      </Button>
                    ) : (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => {
                          if (typeof regionEnfocada.id === "number" && onSelectZona) {
                            onSelectZona(regionEnfocada.id, regionEnfocada.nombre);
                          }
                        }}
                        className="w-full text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Filtrar Dashboard por {regionEnfocada.nombre}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="p-6 rounded-2xl border border-dashed text-center text-xs text-muted-foreground">
                Selecciona o haz clic en cualquier país o departamento para ver su desglose comercial completo.
              </div>
            )}

            {/* Ranking Rápido Top 4 Zonas Comerciales */}
            <div className="rounded-xl border border-border/60 bg-muted/15 p-3 space-y-2">
              <span className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>Top 4 Zonas Comerciales</span>
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              </span>
              <div className="space-y-1.5">
                {distribucionZonas.slice(0, 4).map((z, idx) => (
                  <div
                    key={z.zona}
                    onClick={() => {
                      setRegionEnfocada({
                        id: z.id,
                        nombre: z.zona,
                        bandera: "🇨🇴",
                        venta: z.venta,
                        unidades: z.unidades,
                        porcentaje: z.porcentaje,
                        ciudades: z.ciudades || [],
                        esInternacional: false,
                      });
                      if (onSelectZona) onSelectZona(z.id, z.zona);
                    }}
                    className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-background hover:bg-muted/50 cursor-pointer border border-border/40 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-muted-foreground w-4">#{idx + 1}</span>
                      <span className="font-semibold text-foreground truncate max-w-[120px]">{z.zona}</span>
                    </div>
                    <div className="text-right font-mono">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatoCOPFull(z.venta)}</span>
                      <span className="text-[10px] text-muted-foreground ml-1">({z.porcentaje.toFixed(1)}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
