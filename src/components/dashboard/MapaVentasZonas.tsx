import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
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
  Info,
  ChevronRight,
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

// =========================================================================
// DEFINICIÓN DE COORDENADAS CARTOGRÁFICAS REALES (LATITUD / LONGITUD)
// =========================================================================

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
  { id: "cundinamarca", nombre: "Bogotá D.C. / Cundinamarca", ciudadPrincipal: "Bogotá", lat: 4.711, lng: -74.0721, aliases: ["bogota", "bogotá", "cundinamarca", "soacha", "chia", "chía"] },
  { id: "valle", nombre: "Valle del Cauca", ciudadPrincipal: "Cali", lat: 3.4516, lng: -76.532, aliases: ["valle", "valle del cauca", "cali", "palmira", "buenaventura", "tulua", "tuluá"] },
  { id: "santander", nombre: "Santander", ciudadPrincipal: "Bucaramanga", lat: 7.1254, lng: -73.1198, aliases: ["santander", "bucaramanga", "floridablanca", "giron", "piedecuesta", "barrancabermeja"] },
  { id: "atlantico", nombre: "Atlántico", ciudadPrincipal: "Barranquilla", lat: 10.9685, lng: -74.7813, aliases: ["atlantico", "atlántico", "barranquilla", "soledad", "costa"] },
  { id: "bolivar", nombre: "Bolívar", ciudadPrincipal: "Cartagena", lat: 10.391, lng: -75.4794, aliases: ["bolivar", "bolívar", "cartagena", "magangue"] },
  { id: "quindio", nombre: "Quindío", ciudadPrincipal: "Armenia", lat: 4.5339, lng: -75.6811, aliases: ["quindio", "quindío", "armenia", "calarca"] },
  { id: "risaralda", nombre: "Risaralda", ciudadPrincipal: "Pereira", lat: 4.8133, lng: -75.6961, aliases: ["risaralda", "pereira", "dosquebradas"] },
  { id: "caldas", nombre: "Caldas", ciudadPrincipal: "Manizales", lat: 5.0689, lng: -75.5174, aliases: ["caldas", "manizales", "villamaria"] },
  { id: "tolima", nombre: "Tolima", ciudadPrincipal: "Ibagué", lat: 4.4389, lng: -75.2322, aliases: ["tolima", "ibague", "ibagué", "espinal"] },
  { id: "huila", nombre: "Huila", ciudadPrincipal: "Neiva", lat: 2.9273, lng: -75.2819, aliases: ["huila", "neiva", "pitalito"] },
  { id: "narino", nombre: "Nariño", ciudadPrincipal: "Pasto", lat: 1.2136, lng: -77.2811, aliases: ["narino", "nariño", "pasto", "ipiales", "tumaco"] },
  { id: "cauca", nombre: "Cauca", ciudadPrincipal: "Popayán", lat: 2.4419, lng: -76.6063, aliases: ["cauca", "popayan", "popayán", "santander de quilichao"] },
  { id: "norte_santander", nombre: "Norte de Santander", ciudadPrincipal: "Cúcuta", lat: 7.8939, lng: -72.5078, aliases: ["norte de santander", "cucuta", "cúcuta", "ocana", "santanderes"] },
  { id: "cesar", nombre: "Cesar", ciudadPrincipal: "Valledupar", lat: 10.4631, lng: -73.2532, aliases: ["cesar", "valledupar", "aguachica"] },
  { id: "cordoba", nombre: "Córdoba", ciudadPrincipal: "Montería", lat: 8.7479, lng: -75.8814, aliases: ["cordoba", "córdoba", "monteria", "montería"] },
  { id: "magdalena", nombre: "Magdalena", ciudadPrincipal: "Santa Marta", lat: 11.2408, lng: -74.199, aliases: ["magdalena", "santa marta", "cienaga"] },
  { id: "meta", nombre: "Meta", ciudadPrincipal: "Villavicencio", lat: 4.142, lng: -73.6266, aliases: ["meta", "villavicencio", "acacias", "llanos"] },
  { id: "boyaca", nombre: "Boyacá", ciudadPrincipal: "Tunja", lat: 5.5353, lng: -73.3678, aliases: ["boyaca", "boyacá", "tunja", "sogamoso", "duitama"] },
  { id: "sucre", nombre: "Sucre", ciudadPrincipal: "Sincelejo", lat: 9.3047, lng: -75.3978, aliases: ["sucre", "sincelejo", "corozal"] },
  { id: "guajira", nombre: "La Guajira", ciudadPrincipal: "Riohacha", lat: 11.5444, lng: -72.9072, aliases: ["guajira", "la guajira", "riohacha", "maicao"] },
  { id: "arauca", nombre: "Arauca", ciudadPrincipal: "Arauca", lat: 7.0847, lng: -70.7591, aliases: ["arauca", "tame", "saravena"] },
  { id: "casanare", nombre: "Casanare", ciudadPrincipal: "Yopal", lat: 5.3378, lng: -72.3959, aliases: ["casanare", "yopal", "aguazul"] },
  { id: "choco", nombre: "Chocó", ciudadPrincipal: "Quibdó", lat: 5.6947, lng: -76.6583, aliases: ["choco", "chocó", "quibdo", "quibdó"] },
  { id: "san_andres", nombre: "San Andrés y Providencia", ciudadPrincipal: "San Andrés", lat: 12.5847, lng: -81.7006, aliases: ["san andres", "san andrés", "providencia"] },
  { id: "caqueta", nombre: "Caquetá", ciudadPrincipal: "Florencia", lat: 1.6144, lng: -75.6062, aliases: ["caqueta", "caquetá", "florencia"] },
  { id: "putumayo", nombre: "Putumayo", ciudadPrincipal: "Mocoa", lat: 1.1478, lng: -76.6469, aliases: ["putumayo", "mocoa", "puerto asis"] },
  { id: "amazonas", nombre: "Amazonas", ciudadPrincipal: "Leticia", lat: -4.2033, lng: -69.9406, aliases: ["amazonas", "leticia", "puerto narino"] },
];

// Cálculo de arco curvo (Gran Círculo / Bezier) para rutas aéreas en Leaflet
function calcularPuntosArco(
  inicio: [number, number],
  fin: [number, number],
  curvatura = 0.2,
  puntos = 30
): [number, number][] {
  const [lat1, lng1] = inicio;
  const [lat2, lng2] = fin;
  const midLat = (lat1 + lat2) / 2;
  const midLng = (lng1 + lng2) / 2;
  const dLat = lat2 - lat1;
  const dLng = lng2 - lng1;
  const dist = Math.sqrt(dLat * dLat + dLng * dLng);

  if (dist === 0) return [inicio, fin];

  const normalLat = -dLng / dist;
  const normalLng = dLat / dist;
  const ctrlLat = midLat + normalLat * dist * curvatura;
  const ctrlLng = midLng + normalLng * dist * curvatura;

  const resultado: [number, number][] = [];
  for (let i = 0; i <= puntos; i++) {
    const t = i / puntos;
    const invT = 1 - t;
    const lat = invT * invT * lat1 + 2 * invT * t * ctrlLat + t * t * lat2;
    const lng = invT * invT * lng1 + 2 * invT * t * ctrlLng + t * t * lng2;
    resultado.push([lat, lng]);
  }
  return resultado;
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
  const [tipoMapa, setTipoMapa] = useState<"dark" | "clean">("dark");
  const [busqueda, setBusqueda] = useState<string>("");
  const [leafletCargado, setLeafletCargado] = useState<boolean>(false);
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

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const layerGroupRef = useRef<any>(null);

  // Normalización y cálculo de métricas por territorio
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

  // KPIs de cabecera
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

  // Carga asíncrona segura de Leaflet en el cliente (Browser-only, SSR-safe)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const LEAFLET_CSS_ID = "leaflet-css-truccos";
    if (!document.getElementById(LEAFLET_CSS_ID)) {
      const link = document.createElement("link");
      link.id = LEAFLET_CSS_ID;
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      link.crossOrigin = "";
      document.head.appendChild(link);
    }

    if ((window as any).L) {
      setLeafletCargado(true);
      return;
    }

    const LEAFLET_JS_ID = "leaflet-js-truccos";
    if (!document.getElementById(LEAFLET_JS_ID)) {
      const script = document.createElement("script");
      script.id = LEAFLET_JS_ID;
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.async = true;
      script.crossOrigin = "";
      script.onload = () => {
        setLeafletCargado(true);
      };
      document.head.appendChild(script);
    } else {
      const timer = setInterval(() => {
        if ((window as any).L) {
          clearInterval(timer);
          setLeafletCargado(true);
        }
      }, 100);
      return () => clearInterval(timer);
    }
  }, []);

  // Inicialización de la instancia de Leaflet Map
  useEffect(() => {
    if (!leafletCargado || !mapContainerRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [16, -55],
        zoom: 3,
        minZoom: 2,
        maxZoom: 14,
        zoomControl: false,
        attributionControl: false,
        worldCopyJump: true,
      });

      // Capa base de mapas cartográficos de alta definición
      const tileUrl =
        tipoMapa === "dark"
          ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

      L.tileLayer(tileUrl, {
        subdomains: "abcd",
        maxZoom: 19,
      }).addTo(map);

      // Grupo de capas para pines y arcos dinámicos
      const layerGroup = L.layerGroup().addTo(map);
      layerGroupRef.current = layerGroup;
      mapInstanceRef.current = map;

      // Invalidate size para asegurar renderizado nítido
      setTimeout(() => {
        map.invalidateSize();
      }, 150);
    }

    return () => {
      // Limpieza segura al desmontar
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [leafletCargado, tipoMapa]);

  // Actualización de marcadores y arcos cuando cambian datos o modo de vista
  useEffect(() => {
    if (!mapInstanceRef.current || !layerGroupRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    const layerGroup = layerGroupRef.current;
    layerGroup.clearLayers();
    const map = mapInstanceRef.current;

    if (modoVista === "mundo") {
      // Centrar vista mundial
      map.flyTo([16, -55], 3, { duration: 1.2 });

      // Punto matriz: Colombia
      const hubCol = hubsConDatos.find((h) => h.id === "colombia") || HUBS_MUNDIALES_GEO[0];

      // Rutas comerciales curvas desde Colombia hacia destinos internacionales
      const destinos = hubsConDatos.filter((h) => h.id !== "colombia");
      destinos.forEach((dest) => {
        const puntosArco = calcularPuntosArco([hubCol.lat, hubCol.lng], [dest.lat, dest.lng], 0.22);
        
        // Línea curva discontinua con brillo
        const rutaPolyline = L.polyline(puntosArco, {
          color: dest.venta > 0 ? "#10b981" : "#3b82f6",
          weight: dest.venta > 0 ? 2.5 : 1.8,
          dashArray: "6, 6",
          opacity: 0.8,
          smoothFactor: 1,
        });

        rutaPolyline.addTo(layerGroup);
      });

      // Marcadores de países exportación
      destinos.forEach((hub) => {
        const tieneVentas = hub.venta > 0;
        const iconHtml = `
          <div class="group relative cursor-pointer flex items-center transition-transform hover:scale-115">
            <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full ${
              tieneVentas
                ? "bg-emerald-950/90 border border-emerald-400 text-emerald-100 shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                : "bg-slate-900/85 border border-slate-600 text-slate-200 shadow-md"
            } backdrop-blur-md">
              <span class="text-sm leading-none">${hub.bandera}</span>
              <span class="text-[11px] font-bold tracking-tight">${hub.nombre.split(" ")[0]}</span>
              ${
                tieneVentas
                  ? `<span class="px-1.5 py-0.2 text-[9px] rounded-full bg-emerald-500 text-slate-950 font-black">${hub.porcentaje.toFixed(1)}%</span>`
                  : ""
              }
            </div>
          </div>
        `;

        const customIcon = L.divIcon({
          html: iconHtml,
          className: "leaflet-custom-marker",
          iconSize: [110, 32],
          iconAnchor: [55, 16],
        });

        const marker = L.marker([hub.lat, hub.lng], { icon: customIcon }).addTo(layerGroup);

        marker.on("click", () => {
          setRegionSeleccionadaInfo({
            nombre: hub.nombre,
            subtitulo: `Mercado Internacional • ${hub.pais}`,
            bandera: hub.bandera,
            venta: hub.venta,
            unidades: hub.unidades,
            porcentaje: hub.porcentaje,
            ciudades: hub.ciudades,
            zonaId: hub.id,
          });

          if (hub.id && onSelectZona) {
            onSelectZona(hub.id, hub.nombre);
          }
        });
      });

      // Marcador destacado para Colombia (HQ Matriz)
      const colIconHtml = `
        <div class="relative flex items-center justify-center cursor-pointer group">
          <div class="absolute w-12 h-12 rounded-full bg-emerald-500/35 animate-ping"></div>
          <div class="relative flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-600 text-white font-extrabold text-xs shadow-[0_0_20px_rgba(16,185,129,0.8)] border-2 border-white backdrop-blur-md hover:scale-110 transition-transform">
            <span class="text-base">🇨🇴</span>
            <span>COLOMBIA (HQ)</span>
            <span class="bg-white text-emerald-800 text-[10px] font-black px-1.5 py-0.5 rounded-full">
              ${metricasGlobales.pctNac.toFixed(1)}%
            </span>
          </div>
        </div>
      `;

      const colIcon = L.divIcon({
        html: colIconHtml,
        className: "leaflet-colombia-hq-marker",
        iconSize: [160, 40],
        iconAnchor: [80, 20],
      });

      const colMarker = L.marker([hubCol.lat, hubCol.lng], { icon: colIcon, zIndexOffset: 1000 }).addTo(layerGroup);
      colMarker.on("click", () => {
        setModoVista("colombia");
      });
    } else {
      // VISTA COLOMBIA: Vuelo suave y zoom en territorio nacional
      map.flyTo([4.5709, -74.2973], 6.2, { duration: 1.2 });

      // Marcadores detallados por departamento de Colombia
      departamentosConDatos.forEach((depto, index) => {
        const tieneVentas = depto.venta > 0;
        const ranking = index + 1;
        const colorBg =
          ranking === 1
            ? "bg-emerald-500 text-slate-950 border-white shadow-[0_0_15px_rgba(16,185,129,0.7)]"
            : ranking <= 3
            ? "bg-blue-500 text-white border-white/80 shadow-md"
            : ranking <= 7
            ? "bg-indigo-600 text-white border-white/60 shadow-sm"
            : "bg-slate-800 text-slate-300 border-slate-600";

        const iconHtml = `
          <div class="relative group cursor-pointer flex flex-col items-center transition-transform hover:scale-120">
            <div class="flex items-center gap-1.5 px-2 py-0.8 rounded-full border text-[11px] font-bold ${colorBg} backdrop-blur-sm">
              <span class="w-4 h-4 rounded-full bg-black/20 flex items-center justify-center text-[9px] font-black">${ranking}</span>
              <span class="truncate max-w-[90px]">${depto.nombre.split(" ")[0]}</span>
              ${
                tieneVentas
                  ? `<span class="text-[9px] font-mono opacity-90">${depto.porcentaje.toFixed(0)}%</span>`
                  : ""
              }
            </div>
            <div class="w-1.5 h-1.5 rotate-45 -mt-0.5 ${colorBg}"></div>
          </div>
        `;

        const deptoIcon = L.divIcon({
          html: iconHtml,
          className: "leaflet-depto-marker",
          iconSize: [120, 30],
          iconAnchor: [60, 28],
        });

        const marker = L.marker([depto.lat, depto.lng], { icon: deptoIcon }).addTo(layerGroup);

        marker.on("click", () => {
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
        });
      });
    }
  }, [modoVista, hubsConDatos, departamentosConDatos, leafletCargado, metricasGlobales.pctNac, onSelectZona]);

  // Búsqueda inteligente interactiva con vuelo automático de cámara (flyTo)
  const ejecutarBusqueda = useCallback(
    (query: string) => {
      setBusqueda(query);
      if (!query.trim() || !mapInstanceRef.current) return;
      const q = query.toLowerCase().trim();

      // Primero buscar en departamentos de Colombia
      const deptoMatch = departamentosConDatos.find(
        (d) =>
          d.nombre.toLowerCase().includes(q) ||
          d.ciudadPrincipal.toLowerCase().includes(q) ||
          d.aliases.some((a) => a.includes(q))
      );

      if (deptoMatch) {
        setModoVista("colombia");
        mapInstanceRef.current.flyTo([deptoMatch.lat, deptoMatch.lng], 8.5, { duration: 1 });
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
        return;
      }

      // Buscar en hubs mundiales
      const hubMatch = hubsConDatos.find(
        (h) => h.nombre.toLowerCase().includes(q) || h.aliases.some((a) => a.includes(q))
      );

      if (hubMatch) {
        if (hubMatch.id === "colombia") {
          setModoVista("colombia");
        } else {
          setModoVista("mundo");
          mapInstanceRef.current.flyTo([hubMatch.lat, hubMatch.lng], 5, { duration: 1 });
        }
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
      }
    },
    [departamentosConDatos, hubsConDatos]
  );

  return (
    <Card className="border-border/80 shadow-md overflow-hidden bg-card/95 backdrop-blur-xs">
      <style>{`
        .leaflet-container {
          background-color: #020617 !important;
          font-family: inherit !important;
        }
        .leaflet-custom-marker,
        .leaflet-colombia-hq-marker,
        .leaflet-depto-marker {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
        }
        .leaflet-pane {
          z-index: 10 !important;
        }
        .leaflet-top, .leaflet-bottom {
          z-index: 15 !important;
        }
      `}</style>
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
                    Live GIS
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Cartografía interactiva en tiempo real con rutas globales de exportación y cobertura nacional
                </CardDescription>
              </div>
            </div>
          </div>

          {/* Selector de Modo de Mapa, Buscador y Estilo */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Buscador de Territorios */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar país, depto o ciudad..."
                value={busqueda}
                onChange={(e) => ejecutarBusqueda(e.target.value)}
                className="h-8 pl-8 text-xs w-[180px] bg-background rounded-xl border-border/80 shadow-2xs"
              />
            </div>

            {/* Selector de Modo: Mundo vs Colombia */}
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
                <Globe2 className="h-3.5 w-3.5 text-blue-500" />
                <span>Mundo (Global)</span>
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

            {/* Alternador de tema de mapa (Dark vs Clean) */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTipoMapa((t) => (t === "dark" ? "clean" : "dark"))}
              className="h-8 px-2.5 text-xs rounded-xl border-border/70 text-muted-foreground hover:text-foreground"
              title="Cambiar tema de la cartografía"
            >
              <Layers className="h-3.5 w-3.5 mr-1" />
              <span>{tipoMapa === "dark" ? "Dark Carto" : "Voyager"}</span>
            </Button>
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
          {/* CONTENEDOR CARTOGRÁFICO INTERACTIVO */}
          <div className="lg:col-span-8 relative bg-slate-950 overflow-hidden flex flex-col justify-center min-h-[460px] max-h-[540px]">
            {/* Contenedor del Mapa Leaflet */}
            <div ref={mapContainerRef} className="w-full h-[520px] z-10" />

            {/* Estado de carga / Fallback visual mientras inicia Leaflet */}
            {!leafletCargado && (
              <div className="absolute inset-0 z-0 flex flex-col items-center justify-center bg-slate-950 text-slate-400 p-6 text-center">
                <div className="w-12 h-12 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin mb-3"></div>
                <p className="text-sm font-bold text-slate-200">Cargando Cartografía Satelital e Interactiva...</p>
                <p className="text-xs text-slate-500 mt-1">Conectando rutas comerciales y coordenadas geográficas</p>
              </div>
            )}

            {/* Controles flotantes de Navegación Cartográfica */}
            <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5 bg-background/90 backdrop-blur-md p-1 rounded-xl border border-border/70 shadow-lg">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => mapInstanceRef.current?.zoomIn()}
                className="h-7 w-7 rounded-lg hover:bg-muted"
                title="Acercar mapa (+)"
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => mapInstanceRef.current?.zoomOut()}
                className="h-7 w-7 rounded-lg hover:bg-muted"
                title="Alejar mapa (-)"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (modoVista === "mundo") {
                    mapInstanceRef.current?.flyTo([16, -55], 3);
                  } else {
                    mapInstanceRef.current?.flyTo([4.5709, -74.2973], 6.2);
                  }
                }}
                className="h-7 w-7 rounded-lg hover:bg-muted"
                title="Restablecer posición inicial"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Badge interactivo con el estado del mapa */}
            <div className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-background/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-border/70 text-xs font-semibold shadow-md">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              {modoVista === "mundo" ? (
                <span className="text-foreground">
                  Mapa Mundi: <strong>Rutas Comerciales Globales</strong> (Haz clic en Colombia para ver departamentos)
                </span>
              ) : (
                <span className="text-foreground">
                  Colombia: <strong>Distribución Departamental</strong> (Haz clic en un marcador para filtrar)
                </span>
              )}
            </div>

            {/* Leyenda de Concentración */}
            <div className="absolute bottom-3 left-3 z-20 flex items-center gap-2 bg-background/90 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-border/70 text-[10px] shadow-md">
              <span className="text-muted-foreground font-semibold">Concentración:</span>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-800 border border-slate-600" title="Bajo" />
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" title="Medio" />
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" title="Alto" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" title="Líder" />
              </div>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">Mayor Ventas</span>
            </div>

            {/* Tarjeta flotante emergente con información detallada de la región seleccionada */}
            {regionSeleccionadaInfo && (
              <div className="absolute bottom-3 right-3 z-20 max-w-[280px] bg-background/95 backdrop-blur-md p-3.5 rounded-2xl border border-border/80 shadow-2xl animate-in fade-in slide-in-from-bottom-2">
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
                    <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400 text-xs block">
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

                <Button
                  size="sm"
                  onClick={() => {
                    if (regionSeleccionadaInfo.zonaId !== undefined && onSelectZona) {
                      onSelectZona(regionSeleccionadaInfo.zonaId, regionSeleccionadaInfo.nombre);
                    }
                  }}
                  className="w-full h-7 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                >
                  <Filter className="h-3 w-3 mr-1.5" />
                  <span>Filtrar Dashboard</span>
                </Button>
              </div>
            )}
          </div>

          {/* PANEL LATERAL DE RANKING TERRITORIAL Y APORTE */}
          <div className="lg:col-span-4 p-4 flex flex-col justify-between max-h-[520px] overflow-hidden bg-card/60">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Ranking de Territorios</span>
                </h3>
                <span className="text-[10px] text-muted-foreground">
                  {modoVista === "mundo" ? "Mercados Internacionales" : "32 Departamentos"}
                </span>
              </div>

              {/* Lista scrolleable de regiones */}
              <div className="space-y-1.5 overflow-y-auto max-h-[400px] pr-1">
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
                          if (mapInstanceRef.current) {
                            mapInstanceRef.current.flyTo([t.lat, t.lng], modoVista === "mundo" ? 5 : 8, { duration: 1 });
                          }
                        }}
                        className={`p-2.5 rounded-xl border text-xs transition-all cursor-pointer ${
                          isSelected
                            ? "bg-emerald-500/10 border-emerald-500/50 shadow-xs ring-1 ring-emerald-500/30"
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
                                ? "bg-emerald-500"
                                : idx <= 2
                                ? "bg-blue-500"
                                : "bg-indigo-500"
                            }`}
                            style={{ width: `${Math.min(100, Math.max(3, t.porcentaje))}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>{t.unidades.toLocaleString("es-CO")} unidades</span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {t.porcentaje.toFixed(1)}% aporte
                          </span>
                        </div>
                      </div>
                    );
                  })}

                {(modoVista === "mundo" ? hubsConDatos : departamentosConDatos).filter((t) => t.venta > 0).length === 0 && (
                  <div className="p-6 text-center text-muted-foreground text-xs">
                    No se registran ventas para los filtros actuales en esta vista.
                  </div>
                )}
              </div>
            </div>

            {/* Botón de limpiar filtro territorial si está activo */}
            {zonaSeleccionadaId !== null && (
              <div className="pt-2 border-t border-border/50">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSelectZona && onSelectZona(null, "todos")}
                  className="w-full text-xs h-7 rounded-xl border-dashed border-emerald-500/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
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
