import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import createGlobe, { Globe } from "cobe";
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
  Sparkles,
  Layers,
  Filter,
  Play,
  Pause,
  Compass,
} from "lucide-react";

interface MapaVentasZonasProps {
  distribucionZonas?: ZonaAporte[];
  totalVentas?: number;
  totalUnidades?: number;
  paisesCatalogo?: CatalogoItem[];
  onSelectZona?: (zonaId: number | null, zonaNombre: string) => void;
  zonaSeleccionadaId?: number | null;
}

// Coordenadas geográficas mundiales de Sede Matriz y Destinos Comerciales
interface HubMundialGeo {
  id: string;
  nombre: string;
  pais: string;
  bandera: string;
  lat: number;
  lng: number;
  tipo: "matriz" | "exportacion";
  aliases: string[];
}

const HUBS_MUNDIALES_GEO: HubMundialGeo[] = [
  {
    id: "colombia",
    nombre: "Colombia (Sede Matriz)",
    pais: "Colombia",
    bandera: "🇨🇴",
    lat: 4.711,
    lng: -74.0721,
    tipo: "matriz",
    aliases: ["colombia", "co", "nacional"],
  },
  {
    id: "usa",
    nombre: "Estados Unidos",
    pais: "Estados Unidos",
    bandera: "🇺🇸",
    lat: 25.7617,
    lng: -80.1918,
    tipo: "exportacion",
    aliases: ["usa", "estados unidos", "eeuu", "miami", "florida", "us"],
  },
  {
    id: "mexico",
    nombre: "México",
    pais: "México",
    bandera: "🇲🇽",
    lat: 19.4326,
    lng: -99.1332,
    tipo: "exportacion",
    aliases: ["mexico", "méxico", "mx"],
  },
  {
    id: "costa_rica",
    nombre: "Costa Rica",
    pais: "Costa Rica",
    bandera: "🇨🇷",
    lat: 9.9281,
    lng: -84.0907,
    tipo: "exportacion",
    aliases: ["costa rica", "cr", "san jose"],
  },
  {
    id: "panama",
    nombre: "Panamá",
    pais: "Panamá",
    bandera: "🇵🇦",
    lat: 8.9824,
    lng: -79.5199,
    tipo: "exportacion",
    aliases: ["panama", "panamá", "pa"],
  },
  {
    id: "ecuador",
    nombre: "Ecuador",
    pais: "Ecuador",
    bandera: "🇪🇨",
    lat: -0.1807,
    lng: -78.4678,
    tipo: "exportacion",
    aliases: ["ecuador", "ec", "quito", "guayaquil"],
  },
  {
    id: "peru",
    nombre: "Perú",
    pais: "Perú",
    bandera: "🇵🇪",
    lat: -12.0464,
    lng: -77.0428,
    tipo: "exportacion",
    aliases: ["peru", "perú", "pe", "lima"],
  },
  {
    id: "chile",
    nombre: "Chile",
    pais: "Chile",
    bandera: "🇨🇱",
    lat: -33.4489,
    lng: -70.6693,
    tipo: "exportacion",
    aliases: ["chile", "cl", "santiago"],
  },
  {
    id: "espana",
    nombre: "España (Europa)",
    pais: "España",
    bandera: "🇪🇸",
    lat: 40.4168,
    lng: -3.7038,
    tipo: "exportacion",
    aliases: ["espana", "españa", "es", "madrid", "europa"],
  },
  {
    id: "puerto_rico",
    nombre: "Puerto Rico",
    pais: "Puerto Rico",
    bandera: "🇵🇷",
    lat: 18.4655,
    lng: -66.1057,
    tipo: "exportacion",
    aliases: ["puerto rico", "pr", "san juan"],
  },
  {
    id: "guatemala",
    nombre: "Guatemala",
    pais: "Guatemala",
    bandera: "🇬🇹",
    lat: 14.6349,
    lng: -90.5069,
    tipo: "exportacion",
    aliases: ["guatemala", "gt"],
  },
];

// Departamentos de Colombia con coordenadas reales y capitales
interface DepartamentoColombiaGeo {
  id: string;
  nombre: string;
  ciudadPrincipal: string;
  lat: number;
  lng: number;
  aliases: string[];
}

const DEPARTAMENTOS_COLOMBIA_GEO: DepartamentoColombiaGeo[] = [
  { id: "antioquia", nombre: "Antioquia", ciudadPrincipal: "Medellín", lat: 6.2442, lng: -75.5812, aliases: ["antioquia", "medellin", "medellín", "bello", "itagui", "envigado", "rionegro"] },
  { id: "cundinamarca", nombre: "Bogotá D.C. / Cundinamarca", ciudadPrincipal: "Bogotá", lat: 4.711, lng: -74.0721, aliases: ["bogota", "bogotá", "cundinamarca", "soacha", "chia"] },
  { id: "valle", nombre: "Valle del Cauca", ciudadPrincipal: "Cali", lat: 3.4516, lng: -76.532, aliases: ["valle", "valle del cauca", "cali", "palmira", "buenaventura"] },
  { id: "santander", nombre: "Santander", ciudadPrincipal: "Bucaramanga", lat: 7.1254, lng: -73.1198, aliases: ["santander", "bucaramanga", "floridablanca", "giron", "piedecuesta"] },
  { id: "atlantico", nombre: "Atlántico", ciudadPrincipal: "Barranquilla", lat: 10.9685, lng: -74.7813, aliases: ["atlantico", "atlántico", "barranquilla", "soledad"] },
  { id: "bolivar", nombre: "Bolívar", ciudadPrincipal: "Cartagena", lat: 10.391, lng: -75.4794, aliases: ["bolivar", "bolívar", "cartagena"] },
  { id: "quindio", nombre: "Quindío", ciudadPrincipal: "Armenia", lat: 4.5339, lng: -75.6811, aliases: ["quindio", "quindío", "armenia"] },
  { id: "risaralda", nombre: "Risaralda", ciudadPrincipal: "Pereira", lat: 4.8133, lng: -75.6961, aliases: ["risaralda", "pereira", "dosquebradas"] },
  { id: "caldas", nombre: "Caldas", ciudadPrincipal: "Manizales", lat: 5.0689, lng: -75.5174, aliases: ["caldas", "manizales"] },
  { id: "tolima", nombre: "Tolima", ciudadPrincipal: "Ibagué", lat: 4.4389, lng: -75.2322, aliases: ["tolima", "ibague", "ibagué"] },
  { id: "huila", nombre: "Huila", ciudadPrincipal: "Neiva", lat: 2.9273, lng: -75.2819, aliases: ["huila", "neiva", "pitalito"] },
  { id: "narino", nombre: "Nariño", ciudadPrincipal: "Pasto", lat: 1.2136, lng: -77.2811, aliases: ["narino", "nariño", "pasto", "ipiales"] },
  { id: "cauca", nombre: "Cauca", ciudadPrincipal: "Popayán", lat: 2.4419, lng: -76.6063, aliases: ["cauca", "popayan", "popayán"] },
  { id: "norte_santander", nombre: "Norte de Santander", ciudadPrincipal: "Cúcuta", lat: 7.8939, lng: -72.5078, aliases: ["norte de santander", "cucuta", "cúcuta"] },
  { id: "cesar", nombre: "Cesar", ciudadPrincipal: "Valledupar", lat: 10.4631, lng: -73.2532, aliases: ["cesar", "valledupar"] },
  { id: "cordoba", nombre: "Córdoba", ciudadPrincipal: "Montería", lat: 8.7479, lng: -75.8814, aliases: ["cordoba", "córdoba", "monteria"] },
  { id: "magdalena", nombre: "Magdalena", ciudadPrincipal: "Santa Marta", lat: 11.2408, lng: -74.199, aliases: ["magdalena", "santa marta"] },
  { id: "meta", nombre: "Meta", ciudadPrincipal: "Villavicencio", lat: 4.142, lng: -73.6266, aliases: ["meta", "villavicencio"] },
  { id: "boyaca", nombre: "Boyacá", ciudadPrincipal: "Tunja", lat: 5.5353, lng: -73.3678, aliases: ["boyaca", "boyacá", "tunja"] },
  { id: "sucre", nombre: "Sucre", ciudadPrincipal: "Sincelejo", lat: 9.3047, lng: -75.3978, aliases: ["sucre", "sincelejo"] },
  { id: "guajira", nombre: "La Guajira", ciudadPrincipal: "Riohacha", lat: 11.5444, lng: -72.9072, aliases: ["guajira", "la guajira", "riohacha"] },
  { id: "arauca", nombre: "Arauca", ciudadPrincipal: "Arauca", lat: 7.0847, lng: -70.7591, aliases: ["arauca"] },
  { id: "casanare", nombre: "Casanare", ciudadPrincipal: "Yopal", lat: 5.3378, lng: -72.3959, aliases: ["casanare", "yopal"] },
  { id: "choco", nombre: "Chocó", ciudadPrincipal: "Quibdó", lat: 5.6947, lng: -76.6583, aliases: ["choco", "chocó", "quibdo"] },
  { id: "san_andres", nombre: "San Andrés y Providencia", ciudadPrincipal: "San Andrés", lat: 12.5847, lng: -81.7006, aliases: ["san andres", "san andrés"] },
  { id: "caqueta", nombre: "Caquetá", ciudadPrincipal: "Florencia", lat: 1.6144, lng: -75.6062, aliases: ["caqueta", "caquetá"] },
  { id: "putumayo", nombre: "Putumayo", ciudadPrincipal: "Mocoa", lat: 1.1478, lng: -76.6469, aliases: ["putumayo", "mocoa"] },
  { id: "amazonas", nombre: "Amazonas", ciudadPrincipal: "Leticia", lat: -4.2033, lng: -69.9406, aliases: ["amazonas", "leticia"] },
];

// Función matemática de proyección 3D a pantalla 2D
function proyectar3Da2D(
  lat: number,
  lng: number,
  phi: number,
  theta: number,
  ancho: number,
  alto: number,
  escala = 1
): { screenX: number; screenY: number; isFront: boolean; depth: number } {
  const rLat = (lat * Math.PI) / 180;
  const aLng = (lng * Math.PI) / 180 - Math.PI;
  const cosLat = Math.cos(rLat);
  const x3d = -cosLat * Math.cos(aLng);
  const y3d = Math.sin(rLat);
  const z3d = cosLat * Math.sin(aLng);

  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);
  const cosP = Math.cos(phi);
  const sinP = Math.sin(phi);

  const rx = cosP * x3d + sinP * z3d;
  const ry = sinP * sinT * x3d + cosT * y3d - cosP * sinT * z3d;
  const rz = -sinP * cosT * x3d + sinT * y3d + cosP * cosT * z3d;

  const isFront = rz >= 0.1;
  const radio = Math.min(ancho, alto) * 0.4 * escala;
  const screenX = ancho / 2 + rx * radio;
  const screenY = alto / 2 - ry * radio;

  return { screenX, screenY, isFront, depth: rz };
}

export function MapaVentasZonas({
  distribucionZonas = [],
  totalVentas = 0,
  totalUnidades = 0,
  paisesCatalogo = [],
  onSelectZona,
  zonaSeleccionadaId,
}: MapaVentasZonasProps) {
  const [modoVista, setModoVista] = useState<"mundo" | "colombia">("mundo");
  const [estiloGlobo, setEstiloGlobo] = useState<"shopify" | "dark">("shopify");
  const [autoRotar, setAutoRotar] = useState<boolean>(true);
  const [busqueda, setBusqueda] = useState<string>("");
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Coordenadas calculadas en pantalla del pin de Colombia en el globo 3D
  const [pinColombia2D, setPinColombia2D] = useState<{
    x: number;
    y: number;
    visible: boolean;
    opacity: number;
  }>({ x: 250, y: 250, visible: true, opacity: 1 });

  // Región activa bajo hover o selección
  const [regionSeleccionadaInfo, setRegionSeleccionadaInfo] = useState<{
    nombre: string;
    subtitulo: string;
    bandera?: string;
    venta: number;
    unidades: number;
    porcentaje: number;
    ciudades?: string[];
    zonaId?: number | null;
  } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const globeInstanceRef = useRef<Globe | null>(null);

  // Física de rotación interactiva
  const phiRef = useRef<number>(-0.28); // Centrado en Colombia
  const thetaRef = useRef<number>(0.12);
  const targetPhiRef = useRef<number>(-0.28);
  const targetThetaRef = useRef<number>(0.12);
  const scaleRef = useRef<number>(1);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const autoRotateRef = useRef<boolean>(true);

  // Sincronizar estado con refs
  useEffect(() => {
    autoRotateRef.current = autoRotar;
  }, [autoRotar]);

  useEffect(() => {
    scaleRef.current = zoomLevel;
  }, [zoomLevel]);

  // Normalización de datos de ventas por territorio
  const datosTerritorios = useMemo(() => {
    const mapaDatos = new Map<string, { venta: number; unidades: number; porcentaje: number; id: number | null; ciudades: string[] }>();

    for (const z of distribucionZonas) {
      const nombreNorm = z.zona.toLowerCase().trim();
      const ciudadesNombres = z.ciudades?.map((c) => c.ciudad) || [];
      mapaDatos.set(nombreNorm, {
        venta: z.venta || 0,
        unidades: z.unidades || 0,
        porcentaje: z.porcentaje || 0,
        id: z.id,
        ciudades: ciudadesNombres,
      });
    }

    return mapaDatos;
  }, [distribucionZonas]);

  // Asociación de datos a hubs mundiales
  const hubsConDatos = useMemo(() => {
    return HUBS_MUNDIALES_GEO.map((hub) => {
      let matchedData = { venta: 0, unidades: 0, porcentaje: 0, id: null as number | null, ciudades: [] as string[] };

      for (const alias of hub.aliases) {
        if (datosTerritorios.has(alias)) {
          matchedData = datosTerritorios.get(alias)!;
          break;
        }
      }

      if (hub.id === "colombia") {
        let ventaNac = 0;
        let undsNac = 0;
        for (const [key, val] of datosTerritorios.entries()) {
          const isExport = HUBS_MUNDIALES_GEO.some(
            (h) => h.id !== "colombia" && h.aliases.some((a) => a === key || key.includes(a))
          );
          if (!isExport) {
            ventaNac += val.venta;
            undsNac += val.unidades;
          }
        }
        if (ventaNac > 0 || undsNac > 0) {
          const pct = totalVentas > 0 ? (ventaNac / totalVentas) * 100 : 100;
          matchedData = {
            venta: ventaNac,
            unidades: undsNac,
            porcentaje: pct,
            id: null,
            ciudades: ["Bogotá", "Medellín", "Cali", "Barranquilla", "Bucaramanga"],
          };
        }
      }

      return {
        ...hub,
        ...matchedData,
      };
    });
  }, [datosTerritorios, totalVentas]);

  // Asociación de datos a departamentos de Colombia
  const departamentosConDatos = useMemo(() => {
    return DEPARTAMENTOS_COLOMBIA_GEO.map((depto) => {
      let matchedData = { venta: 0, unidades: 0, porcentaje: 0, id: null as number | null, ciudades: [] as string[] };

      for (const alias of depto.aliases) {
        if (datosTerritorios.has(alias)) {
          matchedData = datosTerritorios.get(alias)!;
          break;
        }
      }

      return {
        ...depto,
        ...matchedData,
      };
    }).sort((a, b) => b.venta - a.venta);
  }, [datosTerritorios]);

  // KPIs globales consolidados
  const metricasGlobales = useMemo(() => {
    const hubCol = hubsConDatos.find((h) => h.id === "colombia");
    const ventaNac = hubCol?.venta || 0;
    const unidadesNac = hubCol?.unidades || 0;
    const pctNac = hubCol?.porcentaje || (totalVentas > 0 ? (ventaNac / totalVentas) * 100 : 0);

    const exportHubs = hubsConDatos.filter((h) => h.id !== "colombia" && h.venta > 0);
    const ventaExport = exportHubs.reduce((acc, h) => acc + h.venta, 0);
    const unidadesExport = exportHubs.reduce((acc, h) => acc + h.unidades, 0);
    const pctExport = totalVentas > 0 ? (ventaExport / totalVentas) * 100 : 0;

    const zonasActivas = distribucionZonas.filter((z) => z.venta > 0).length;
    const zonaLider = [...distribucionZonas].sort((a, b) => b.venta - a.venta)[0];

    return {
      ventaNac,
      unidadesNac,
      pctNac,
      ventaExport,
      unidadesExport,
      pctExport,
      totalZonasActivas: zonasActivas,
      zonaLider: zonaLider?.zona || "Antioquia",
      zonaLiderVenta: zonaLider?.venta || 0,
    };
  }, [hubsConDatos, distribucionZonas, totalVentas]);

  // =========================================================================
  // RENDERIZADO DEL GLOBO 3D WEBGL (COBE SHOPIFY LIVE STYLE)
  // =========================================================================

  useEffect(() => {
    if (typeof window === "undefined" || !canvasRef.current || modoVista !== "mundo") return;

    const canvas = canvasRef.current;
    let width = containerRef.current?.clientWidth || 560;
    let height = containerRef.current?.clientHeight || 500;
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    // Preparar marcadores 3D
    const markers = [
      // Sede Matriz Colombia: Pin violeta destacado con halo
      { location: [4.711, -74.0721] as [number, number], size: 0.13, color: [0.65, 0.22, 0.95] as [number, number, number] },
      // Destinos internacionales de exportación
      ...hubsConDatos
        .filter((h) => h.id !== "colombia")
        .map((h) => ({
          location: [h.lat, h.lng] as [number, number],
          size: h.venta > 0 ? 0.09 : 0.05,
          color: h.venta > 0 ? ([0.05, 0.75, 0.95] as [number, number, number]) : ([0.3, 0.5, 0.8] as [number, number, number]),
        })),
    ];

    // Preparar arcos 3D de rutas comerciales que nacen en Colombia
    const arcs = hubsConDatos
      .filter((h) => h.id !== "colombia")
      .map((dest) => ({
        from: [4.711, -74.0721] as [number, number],
        to: [dest.lat, dest.lng] as [number, number],
        color: dest.venta > 0 ? ([0.2, 0.75, 1.0] as [number, number, number]) : ([0.4, 0.6, 0.9] as [number, number, number]),
      }));

    // Configuración visual idéntica a la referencia de Shopify (Dots cian/turquesa sobre esfera pastel iluminada)
    const esShopify = estiloGlobo === "shopify";
    const globe = createGlobe(canvas, {
      devicePixelRatio: dpr,
      width: width * dpr,
      height: height * dpr,
      phi: phiRef.current,
      theta: thetaRef.current,
      dark: esShopify ? 0 : 1,
      diffuse: esShopify ? 1.25 : 1.1,
      mapSamples: 22000,
      mapBrightness: esShopify ? 2.9 : 3.2,
      mapBaseBrightness: esShopify ? 0.08 : 0.04,
      baseColor: esShopify ? [0.35, 0.72, 0.94] : [0.15, 0.55, 0.85],
      markerColor: [0.65, 0.22, 0.95],
      glowColor: esShopify ? [0.75, 0.92, 1.0] : [0.12, 0.35, 0.7],
      markers,
      arcs,
      arcColor: [0.25, 0.75, 1.0],
      arcHeight: 0.26,
      arcWidth: 1.8,
      scale: scaleRef.current,
    });

    globeInstanceRef.current = globe;

    let animId: number;
    const loop = () => {
      // Auto-rotación sutil y suave cuando no hay interacción activa del mouse
      if (!isDraggingRef.current && autoRotateRef.current) {
        targetPhiRef.current += 0.0022;
      }

      // Amortiguación e interpolación suave hacia el ángulo objetivo
      phiRef.current += (targetPhiRef.current - phiRef.current) * 0.08;
      thetaRef.current += (targetThetaRef.current - thetaRef.current) * 0.08;

      globe.update({
        phi: phiRef.current,
        theta: thetaRef.current,
        scale: scaleRef.current,
      });

      // Calcular la posición 2D en pantalla del Pin de Colombia para renderizar el icono violeta interactivo
      const projCol = proyectar3Da2D(
        4.711,
        -74.0721,
        phiRef.current,
        thetaRef.current,
        width,
        height,
        scaleRef.current
      );

      setPinColombia2D({
        x: projCol.screenX,
        y: projCol.screenY,
        visible: projCol.isFront,
        opacity: Math.max(0, Math.min(1, (projCol.depth - 0.05) / 0.3)),
      });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      globe.destroy();
      globeInstanceRef.current = null;
    };
  }, [modoVista, estiloGlobo, hubsConDatos]);

  // Manejo de interacción de arrastre (drag-to-rotate 3D 360°)
  const onPointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;

    targetPhiRef.current += deltaX * 0.005;
    targetThetaRef.current = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, targetThetaRef.current + deltaY * 0.005));

    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const onPointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  // Centrar cámara en Colombia suavemente
  const centrarEnColombia = () => {
    targetPhiRef.current = -0.28;
    targetThetaRef.current = 0.12;
    setZoomLevel(1);
    setRegionSeleccionadaInfo({
      nombre: "Colombia",
      subtitulo: "Sede Matriz Trucco's Jeans",
      bandera: "🇨🇴",
      venta: metricasGlobales.ventaNac,
      unidades: metricasGlobales.unidadesNac,
      porcentaje: metricasGlobales.pctNac,
      ciudades: ["Bogotá", "Medellín", "Cali", "Barranquilla", "Bucaramanga"],
      zonaId: null,
    });
  };

  // Búsqueda inteligente con rotación automática del globo
  const ejecutarBusqueda = useCallback(
    (query: string) => {
      setBusqueda(query);
      if (!query.trim()) return;
      const q = query.toLowerCase().trim();

      // Buscar en hubs mundiales
      const hubMatch = hubsConDatos.find(
        (h) => h.nombre.toLowerCase().includes(q) || h.aliases.some((a) => a.includes(q))
      );

      if (hubMatch) {
        setModoVista("mundo");
        // Calcular phi hacia las coordenadas del hub
        const aLng = (hubMatch.lng * Math.PI) / 180 - Math.PI;
        const cosLat = Math.cos((hubMatch.lat * Math.PI) / 180);
        const x3d = -cosLat * Math.cos(aLng);
        const z3d = cosLat * Math.sin(aLng);
        targetPhiRef.current = Math.atan2(-x3d, z3d);
        targetThetaRef.current = Math.max(-0.4, Math.min(0.4, (hubMatch.lat * Math.PI) / 180));

        setRegionSeleccionadaInfo({
          nombre: hubMatch.nombre,
          subtitulo: `Mercado Internacional • ${hubMatch.pais}`,
          bandera: hubMatch.bandera,
          venta: hubMatch.venta,
          unidades: hubMatch.unidades,
          porcentaje: hubMatch.porcentaje,
          ciudades: hubMatch.ciudades,
          zonaId: hubMatch.id,
        });
        return;
      }

      // Buscar en departamentos
      const deptoMatch = departamentosConDatos.find(
        (d) =>
          d.nombre.toLowerCase().includes(q) ||
          d.ciudadPrincipal.toLowerCase().includes(q) ||
          d.aliases.some((a) => a.includes(q))
      );

      if (deptoMatch) {
        setModoVista("colombia");
        setRegionSeleccionadaInfo({
          nombre: deptoMatch.nombre,
          subtitulo: `Departamento • Capital: ${deptoMatch.ciudadPrincipal}`,
          bandera: "🇨🇴",
          venta: deptoMatch.venta,
          unidades: deptoMatch.unidades,
          porcentaje: deptoMatch.porcentaje,
          ciudades: deptoMatch.ciudades.length > 0 ? deptoMatch.ciudades : [deptoMatch.ciudadPrincipal],
          zonaId: deptoMatch.id,
        });
      }
    },
    [hubsConDatos, departamentosConDatos]
  );

  return (
    <Card className="border-border/80 shadow-md overflow-hidden bg-card/95 backdrop-blur-xs">
      {/* CABECERA CON CONTROLES Y BUSCADOR */}
      <CardHeader className="pb-3 border-b border-border/60 bg-muted/20">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                <Globe2 className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
                  <span>Globo 3D Shopify & Cobertura Geográfica</span>
                  <Badge variant="outline" className="text-[10px] bg-sky-500/10 text-sky-600 border-sky-500/30 font-semibold">
                    Shopify 3D Live
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Globo terráqueo tridimensional con red de nodos hexagonales, rutas comerciales y cobertura nacional
                </CardDescription>
              </div>
            </div>
          </div>

          {/* Selector de Modo, Buscador y Botones de Control */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Buscador de Territorios */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar país o departamento..."
                value={busqueda}
                onChange={(e) => ejecutarBusqueda(e.target.value)}
                className="h-8 pl-8 text-xs w-[180px] bg-background rounded-xl border-border/80 shadow-2xs"
              />
            </div>

            {/* Selector de Modo: Globo 3D vs Departamentos Colombia */}
            <div className="flex rounded-xl bg-muted p-0.5 border border-border/60 shadow-2xs">
              <button
                type="button"
                onClick={() => setModoVista("mundo")}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                  modoVista === "mundo"
                    ? "bg-background shadow-xs text-foreground font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Globe2 className="h-3.5 w-3.5 text-sky-500" />
                <span>Globo 3D (Shopify)</span>
              </button>
              <button
                type="button"
                onClick={() => setModoVista("colombia")}
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

            {/* Alternador de Estilo del Globo (Shopify Light vs Cyber Dark) */}
            {modoVista === "mundo" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEstiloGlobo((e) => (e === "shopify" ? "dark" : "shopify"))}
                className="h-8 px-2.5 text-xs rounded-xl border-border/70 text-muted-foreground hover:text-foreground"
                title="Cambiar paleta de color del globo"
              >
                <Layers className="h-3.5 w-3.5 mr-1 text-sky-500" />
                <span>{estiloGlobo === "shopify" ? "Shopify Light" : "Cyber Dark"}</span>
              </Button>
            )}
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
            <span className="font-extrabold text-sky-600 dark:text-sky-400 text-sm font-mono block">
              {formatoCOPFull(metricasGlobales.ventaExport)}
            </span>
            <span className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold">
              {metricasGlobales.pctExport.toFixed(1)}% del total • {metricasGlobales.unidadesExport.toLocaleString("es-CO")} unds
            </span>
          </div>

          <div className="p-2 rounded-xl bg-background/80 border border-border/50 text-xs shadow-2xs">
            <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">
              Zonas Activas
            </span>
            <span className="font-extrabold text-purple-600 dark:text-purple-400 text-sm font-mono block">
              {metricasGlobales.totalZonasActivas} Regiones
            </span>
            <span className="text-[10px] text-muted-foreground font-semibold">
              32 departamentos en cobertura
            </span>
          </div>

          <div className="p-2 rounded-xl bg-background/80 border border-border/50 text-xs shadow-2xs">
            <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">
              Zona Líder en Ventas
            </span>
            <span className="font-extrabold text-foreground text-sm truncate block font-display">
              {metricasGlobales.zonaLider}
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
              {formatoCOPFull(metricasGlobales.zonaLiderVenta)}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-border/60">
          {/* ================================================================= */}
          {/* VISTA 1: GLOBO TERRÁQUEO 3D SHOPIFY (HEXAGONAL DOTS) */}
          {/* ================================================================= */}
          {modoVista === "mundo" ? (
            <div
              ref={containerRef}
              className={`lg:col-span-8 relative flex items-center justify-center min-h-[480px] max-h-[540px] overflow-hidden select-none cursor-grab active:cursor-grabbing ${
                estiloGlobo === "shopify"
                  ? "bg-gradient-to-b from-[#ebf8ff] via-[#f0f9ff] to-[#ffffff] dark:from-[#082f49] dark:via-[#0c4a6e] dark:to-[#082f49]"
                  : "bg-gradient-to-b from-slate-950 via-[#030712] to-slate-950"
              }`}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
            >
              {/* Resplandor atmosférico de fondo circular como en el diseño de Shopify */}
              <div
                className={`absolute w-[440px] h-[440px] rounded-full blur-3xl pointer-events-none transition-all duration-700 ${
                  estiloGlobo === "shopify"
                    ? "bg-gradient-to-tr from-sky-200/70 via-blue-200/50 to-emerald-200/40"
                    : "bg-gradient-to-tr from-sky-950/60 via-blue-900/40 to-indigo-950/40"
                }`}
              />

              {/* Canvas WebGL de COBE para el Globo 3D */}
              <canvas
                ref={canvasRef}
                className="w-[500px] h-[500px] max-w-full aspect-square z-10 transition-transform duration-300"
                style={{
                  transform: `scale(${zoomLevel})`,
                }}
              />

              {/* OVERLAY HTML: PIN VIOLETA REAL SOBRE COLOMBIA (EXACTAMENTE COMO LA IMAGEN) */}
              {pinColombia2D.visible && (
                <div
                  className="absolute z-20 pointer-events-auto cursor-pointer group transition-opacity duration-300 -translate-x-1/2 -translate-y-full"
                  style={{
                    left: `${pinColombia2D.x}px`,
                    top: `${pinColombia2D.y}px`,
                    opacity: pinColombia2D.opacity,
                  }}
                  onClick={centrarEnColombia}
                >
                  <div className="relative flex flex-col items-center">
                    {/* Anillo de pulso radar concéntrico */}
                    <div className="absolute -bottom-1 w-6 h-6 rounded-full bg-purple-500/40 animate-ping" />
                    <div className="absolute -bottom-0.5 w-3 h-3 rounded-full bg-purple-600/70" />

                    {/* Pin violeta estilo Shopify con sombra */}
                    <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-purple-600 text-white shadow-xl shadow-purple-600/50 border-2 border-white transition-transform group-hover:scale-125">
                      <MapPin className="h-4 w-4 fill-white text-purple-600" />
                    </div>

                    {/* Etiqueta flotante con el nombre de Colombia y Ventas */}
                    <div className="mt-1 px-2.5 py-0.5 rounded-full bg-slate-900/90 text-white text-[10px] font-extrabold tracking-tight border border-purple-400 shadow-lg whitespace-nowrap flex items-center gap-1">
                      <span>🇨🇴</span>
                      <span>COLOMBIA (HQ)</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Controles flotantes sobre el Globo 3D */}
              <div className="absolute top-3 right-3 z-30 flex flex-col gap-1.5 bg-background/90 backdrop-blur-md p-1 rounded-xl border border-border/70 shadow-lg pointer-events-auto">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setZoomLevel((z) => Math.min(1.4, z + 0.1))}
                  className="h-7 w-7 rounded-lg hover:bg-muted"
                  title="Acercar (+)"
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setZoomLevel((z) => Math.max(0.75, z - 0.1))}
                  className="h-7 w-7 rounded-lg hover:bg-muted"
                  title="Alejar (-)"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={centrarEnColombia}
                  className="h-7 w-7 rounded-lg hover:bg-muted text-purple-600 dark:text-purple-400 font-bold"
                  title="Centrar en Colombia (Sede Matriz)"
                >
                  <Compass className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setAutoRotar((r) => !r)}
                  className={`h-7 w-7 rounded-lg hover:bg-muted ${autoRotar ? "text-sky-500" : "text-muted-foreground"}`}
                  title={autoRotar ? "Pausar giro automático" : "Iniciar giro automático"}
                >
                  {autoRotar ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                </Button>
              </div>

              {/* Badge descriptivo del estado */}
              <div className="absolute top-3 left-3 z-30 flex items-center gap-2 bg-background/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-border/70 text-xs font-semibold shadow-md pointer-events-none">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse" />
                <span className="text-foreground">
                  Globo 3D: <strong>Arrastra para rotar 360°</strong> • Haz clic en Colombia o un mercado para ver métricas
                </span>
              </div>

              {/* Leyenda de Red de Nodos */}
              <div className="absolute bottom-3 left-3 z-30 flex items-center gap-2 bg-background/90 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-border/70 text-[10px] shadow-md pointer-events-none">
                <span className="text-muted-foreground font-semibold">Red Comercial:</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                  <span className="text-foreground font-bold">Sede Matriz (CO)</span>
                  <span className="w-2 h-2 rounded-full bg-sky-500 ml-1" />
                  <span className="text-foreground font-medium">Exportaciones</span>
                </div>
              </div>

              {/* Tarjeta flotante emergente con información de la región seleccionada */}
              {regionSeleccionadaInfo && (
                <div className="absolute bottom-3 right-3 z-30 max-w-[280px] bg-background/95 backdrop-blur-md p-3.5 rounded-2xl border border-border/80 shadow-2xl animate-in fade-in slide-in-from-bottom-2 pointer-events-auto">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5">
                      {regionSeleccionadaInfo.bandera && (
                        <span className="text-base">{regionSeleccionadaInfo.bandera}</span>
                      )}
                      <div>
                        <h4 className="text-xs font-extrabold text-foreground leading-tight">
                          {regionSeleccionadaInfo.nombre}
                        </h4>
                        <p className="text-[10px] text-muted-foreground">{regionSeleccionadaInfo.subtitulo}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setRegionSeleccionadaInfo(null)}
                      className="text-muted-foreground hover:text-foreground text-xs p-1"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 p-2 rounded-xl bg-muted/40 border border-border/40 text-xs mb-2.5">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-muted-foreground block">Facturación</span>
                      <span className="font-mono font-extrabold text-foreground text-xs block">
                        {formatoCOPFull(regionSeleccionadaInfo.venta)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-muted-foreground block">Unidades</span>
                      <span className="font-mono font-extrabold text-sky-600 dark:text-sky-400 text-xs block">
                        {regionSeleccionadaInfo.unidades.toLocaleString("es-CO")} unds
                      </span>
                    </div>
                  </div>

                  {regionSeleccionadaInfo.ciudades && regionSeleccionadaInfo.ciudades.length > 0 && (
                    <p className="text-[10px] text-muted-foreground mb-2.5 truncate">
                      <span className="font-semibold text-foreground">Ciudades:</span>{" "}
                      {regionSeleccionadaInfo.ciudades.slice(0, 3).join(", ")}
                    </p>
                  )}

                  <div className="flex gap-2">
                    {regionSeleccionadaInfo.nombre === "Colombia" ? (
                      <Button
                        size="sm"
                        onClick={() => setModoVista("colombia")}
                        className="w-full h-7 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-xs"
                      >
                        <MapPin className="h-3 w-3 mr-1" />
                        <span>Ver Departamentos</span>
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => {
                          if (regionSeleccionadaInfo.zonaId !== undefined && onSelectZona) {
                            onSelectZona(regionSeleccionadaInfo.zonaId, regionSeleccionadaInfo.nombre);
                          }
                        }}
                        className="w-full h-7 text-xs font-bold rounded-xl bg-sky-600 hover:bg-sky-700 text-white shadow-xs"
                      >
                        <Filter className="h-3 w-3 mr-1" />
                        <span>Filtrar Dashboard</span>
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            // =================================================================
            // VISTA 2: COLOMBIA DEPARTAMENTAL (COBERTURA NACIONAL)
            // =================================================================
            <div className="lg:col-span-8 p-6 flex flex-col justify-between min-h-[480px] max-h-[540px] overflow-y-auto bg-muted/10">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🇨🇴</span>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">Distribución Departamental de Colombia</h3>
                      <p className="text-xs text-muted-foreground">
                        Cobertura en los 32 departamentos y principales centros de distribución nacional
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setModoVista("mundo")}
                    className="h-7 text-xs font-semibold rounded-xl"
                  >
                    <Globe2 className="h-3.5 w-3.5 mr-1.5 text-sky-500" />
                    <span>Volver al Globo 3D</span>
                  </Button>
                </div>

                {/* Grid de Departamentos con Ranking y Ventas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {departamentosConDatos.map((depto, idx) => {
                    const isSelected = zonaSeleccionadaId === depto.id;
                    const tieneVenta = depto.venta > 0;
                    return (
                      <div
                        key={depto.id}
                        onClick={() => {
                          setRegionSeleccionadaInfo({
                            nombre: depto.nombre,
                            subtitulo: `Departamento • Capital: ${depto.ciudadPrincipal}`,
                            bandera: "🇨🇴",
                            venta: depto.venta,
                            unidades: depto.unidades,
                            porcentaje: depto.porcentaje,
                            ciudades: depto.ciudades.length > 0 ? depto.ciudades : [depto.ciudadPrincipal],
                            zonaId: depto.id,
                          });
                          if (depto.id && onSelectZona) {
                            onSelectZona(depto.id, depto.nombre);
                          }
                        }}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-purple-500/10 border-purple-500/60 shadow-md ring-1 ring-purple-500/30"
                            : tieneVenta
                            ? "bg-background hover:border-sky-500/50 border-border/80 shadow-2xs hover:shadow-xs"
                            : "bg-muted/30 border-border/40 opacity-70"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                                idx === 0
                                  ? "bg-emerald-500 text-white"
                                  : idx < 3
                                  ? "bg-sky-500 text-white"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {idx + 1}
                            </span>
                            <span className="font-bold text-xs text-foreground truncate max-w-[110px]">
                              {depto.nombre}
                            </span>
                          </div>
                          {tieneVenta && (
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                              {depto.porcentaje.toFixed(1)}%
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] font-mono font-extrabold text-foreground mb-1">
                          {tieneVenta ? formatoCOPFull(depto.venta) : "$ 0 COP"}
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span className="truncate">Cap: {depto.ciudadPrincipal}</span>
                          {tieneVenta && <span>{depto.unidades.toLocaleString("es-CO")} unds</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* PANEL LATERAL: RANKING DE TERRITORIOS Y APORTE */}
          {/* ================================================================= */}
          <div className="lg:col-span-4 p-4 flex flex-col justify-between max-h-[540px] overflow-hidden bg-card/60">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                  <TrendingUp className="h-3.5 w-3.5 text-sky-500" />
                  <span>Ranking Comercial</span>
                </h3>
                <span className="text-[10px] text-muted-foreground">
                  {modoVista === "mundo" ? "Mercados Globales" : "32 Departamentos"}
                </span>
              </div>

              {/* Lista scrolleable con territorios */}
              <div className="space-y-1.5 overflow-y-auto max-h-[420px] pr-1">
                {(modoVista === "mundo" ? hubsConDatos : departamentosConDatos)
                  .filter((t) => t.venta > 0)
                  .map((t, idx) => {
                    const isSelected = zonaSeleccionadaId === t.id;
                    return (
                      <div
                        key={t.id || idx}
                        onClick={() => {
                          setRegionSeleccionadaInfo({
                            nombre: t.nombre,
                            subtitulo: "bandera" in t ? `Mercado ${t.pais}` : `Departamento de Colombia`,
                            bandera: "bandera" in t ? t.bandera : "🇨🇴",
                            venta: t.venta,
                            unidades: t.unidades,
                            porcentaje: t.porcentaje,
                            ciudades: t.ciudades,
                            zonaId: t.id,
                          });
                          if (t.id && onSelectZona) {
                            onSelectZona(t.id, t.nombre);
                          }

                          // Si está en el globo 3D, girar hacia el objetivo
                          if (modoVista === "mundo" && "lat" in t && "lng" in t) {
                            const aLng = (t.lng * Math.PI) / 180 - Math.PI;
                            const cosLat = Math.cos((t.lat * Math.PI) / 180);
                            const x3d = -cosLat * Math.cos(aLng);
                            const z3d = cosLat * Math.sin(aLng);
                            targetPhiRef.current = Math.atan2(-x3d, z3d);
                            targetThetaRef.current = Math.max(-0.4, Math.min(0.4, (t.lat * Math.PI) / 180));
                          }
                        }}
                        className={`p-2.5 rounded-xl border text-xs transition-all cursor-pointer ${
                          isSelected
                            ? "bg-purple-500/10 border-purple-500/50 shadow-xs ring-1 ring-purple-500/30"
                            : "bg-background/80 hover:bg-muted/50 border-border/60 shadow-2xs"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center font-bold text-[10px] text-muted-foreground">
                              #{idx + 1}
                            </span>
                            <span className="font-bold text-foreground truncate max-w-[140px]">
                              {"bandera" in t && t.bandera ? `${t.bandera} ` : ""}
                              {t.nombre}
                            </span>
                          </div>
                          <span className="font-mono font-extrabold text-foreground text-xs">
                            {formatoCOPFull(t.venta)}
                          </span>
                        </div>

                        {/* Barra de progreso de aporte porcentual */}
                        <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden mb-1">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              idx === 0
                                ? "bg-purple-600"
                                : idx <= 2
                                ? "bg-sky-500"
                                : "bg-blue-500"
                            }`}
                            style={{ width: `${Math.min(100, Math.max(3, t.porcentaje))}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>{t.unidades.toLocaleString("es-CO")} unidades</span>
                          <span className="font-semibold text-purple-600 dark:text-purple-400">
                            {t.porcentaje.toFixed(1)}% aporte
                          </span>
                        </div>
                      </div>
                    );
                  })}

                {(modoVista === "mundo" ? hubsConDatos : departamentosConDatos).filter((t) => t.venta > 0).length === 0 && (
                  <div className="p-6 text-center text-muted-foreground text-xs">
                    No se registran ventas para los filtros actuales.
                  </div>
                )}
              </div>
            </div>

            {/* Botón de limpiar filtro territorial */}
            {zonaSeleccionadaId !== null && (
              <div className="pt-2 border-t border-border/50">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSelectZona && onSelectZona(null, "todos")}
                  className="w-full text-xs h-7 rounded-xl border-dashed border-purple-500/50 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10"
                >
                  ✕ Quitar filtro geográfico
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
