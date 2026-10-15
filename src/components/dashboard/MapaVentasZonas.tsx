import React, { useState, useMemo, useEffect } from "react";
import { ZonaAporte, CatalogoItem, ClienteEnCiudad } from "@/lib/ventas-api";
import { formatoCOP, formatoCOPFull } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  WORLD_LAND_PATH,
  KEY_COUNTRIES_PATHS,
  buscarPuntoGeografico,
} from "./world-geo-paths";
import {
  Globe2,
  MapPin,
  Search,
  Filter,
  FilterX,
  Package,
  Building2,
  Info,
  Users,
  Store,
  UserCheck,
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

/**
 * Limpia y normaliza cadenas que contienen errores de encoding o caracteres de reemplazo (, ?, etc.)
 */
export function limpiarTextoEncoding(str: string): string {
  if (!str) return "";
  return str
    .replace(/C[\uFFFD?]RDOBA/gi, "Córdoba")
    .replace(/CRDOBA/gi, "Córdoba")
    .replace(/C[\uFFFD?]RDOVA/gi, "Córdoba")
    .replace(/CRDOVA/gi, "Córdoba")
    .replace(/PANTAL[\uFFFD?]N/gi, "Pantalón")
    .replace(/PANTALN/gi, "Pantalón")
    .replace(/JAMUND[\uFFFD?]/gi, "Jamundí")
    .replace(/JAMUNDI/gi, "Jamundí")
    .replace(/BOGOT[\uFFFD?]/gi, "Bogotá")
    .replace(/BOGOTA/gi, "Bogotá")
    .replace(/MEDELL[\uFFFD?]N/gi, "Medellín")
    .replace(/MEDELLIN/gi, "Medellín")
    .replace(/C[\uFFFD?]CUTA/gi, "Cúcuta")
    .replace(/CUCUTA/gi, "Cúcuta")
    .replace(/GIR[\uFFFD?]N/gi, "Girón")
    .replace(/GIRON/gi, "Girón")
    .replace(/IBAGU[\uFFFD?]/gi, "Ibagué")
    .replace(/IBAGUE/gi, "Ibagué")
    .replace(/POPAY[\uFFFD?]N/gi, "Popayán")
    .replace(/POPAYAN/gi, "Popayán")
    .replace(/NARI[\uFFFD?]O/gi, "Nariño")
    .replace(/NARINO/gi, "Nariño")
    .replace(/QUIND[\uFFFD?]O/gi, "Quindío")
    .replace(/QUINDIO/gi, "Quindío")
    .replace(/ATL[\uFFFD?]NTICO/gi, "Atlántico")
    .replace(/ATLANTICO/gi, "Atlántico")
    .replace(/BOL[\uFFFD?]VAR/gi, "Bolívar")
    .replace(/BOLIVAR/gi, "Bolívar")
    .replace(/BOYAC[\uFFFD?]/gi, "Boyacá")
    .replace(/BOYACA/gi, "Boyacá")
    .replace(/CHOC[\uFFFD?]/gi, "Chocó")
    .replace(/CHOCO/gi, "Chocó")
    .replace(/M[\uFFFD?]XICO/gi, "México")
    .replace(/MEXICO/gi, "México")
    .replace(/ESP[\uFFFD?]A/gi, "España")
    .replace(/ESPAÑA/gi, "España")
    .replace(/PER[\uFFFD?]/gi, "Perú")
    .replace(/PERU/gi, "Perú")
    .replace(/PANAM[\uFFFD?]/gi, "Panamá")
    .replace(/PANAMA/gi, "Panamá")
    .replace(/LARG@/gi, "Larga")
    .replace(/\uFFFD/g, "")
    .trim();
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
  const [modoVista, setModoVista] = useState<"mundo" | "americas" | "colombia">("colombia");
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
    topCiudades: string[];
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
      const match = distribucionZonas.find(
        (z) => z.zona === zonaActivaNombre || limpiarTextoEncoding(z.zona) === limpiarTextoEncoding(zonaActivaNombre)
      );
      if (match) return match;
    }
    return zonasOrdenadas[0] || distribucionZonas[0] || null;
  }, [distribucionZonas, zonaSeleccionadaId, zonaActivaNombre, zonasOrdenadas]);

  // Filtrado por buscador
  const zonasFiltradas = useMemo(() => {
    if (!busqueda.trim()) return zonasOrdenadas;
    const q = busqueda.toLowerCase().trim();
    return zonasOrdenadas.filter((z) => {
      const nom = limpiarTextoEncoding(z.zona).toLowerCase();
      const matchNom = nom.includes(q);
      const matchCiudad = z.ciudades && z.ciudades.some((c) => limpiarTextoEncoding(c.ciudad).toLowerCase().includes(q));
      return matchNom || matchCiudad;
    });
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

  // Ciudad seleccionada dentro de la zona activa para ver sus clientes (null = ver todos los clientes de la zona)
  const [ciudadSeleccionadaNombre, setCiudadSeleccionadaNombre] = useState<string | null>(null);
  const [ordenClientes, setOrdenClientes] = useState<"valor" | "unidades">("valor");
  const [filtroTipoCliente, setFiltroTipoCliente] = useState<"todos" | "identificados">("todos");

  // Al cambiar de zona activa, resetear el filtro de ciudad
  useEffect(() => {
    setCiudadSeleccionadaNombre(null);
  }, [zonaActiva?.zona]);

  const ciudadActiva = useMemo(() => {
    if (!ciudadSeleccionadaNombre || !zonaActiva?.ciudades || zonaActiva.ciudades.length === 0) return null;
    const match = zonaActiva.ciudades.find(
      (c) => c.ciudad === ciudadSeleccionadaNombre || limpiarTextoEncoding(c.ciudad) === limpiarTextoEncoding(ciudadSeleccionadaNombre)
    );
    return match || null;
  }, [zonaActiva, ciudadSeleccionadaNombre]);

  // Clientes a mostrar: si hay una ciudad filtrada muestra los de esa ciudad; si no, muestra el consolidado de toda la zona
  const clientesConsolidados = useMemo(() => {
    let lista: ClienteEnCiudad[] = [];
    if (ciudadActiva?.clientes && ciudadActiva.clientes.length > 0) {
      lista = [...ciudadActiva.clientes];
    } else if (zonaActiva?.clientes && zonaActiva.clientes.length > 0) {
      lista = [...zonaActiva.clientes];
    } else if (zonaActiva?.ciudades) {
      // Fallback si no viniera directo en zonaActiva.clientes
      const mapCli = new Map<number, ClienteEnCiudad>();
      for (const c of zonaActiva.ciudades) {
        for (const cli of (c.clientes || [])) {
          const prev = mapCli.get(cli.id);
          if (!prev) {
            mapCli.set(cli.id, { ...cli });
          } else {
            prev.venta += cli.venta;
            prev.unidades += cli.unidades;
            prev.transacciones += cli.transacciones;
            prev.ticketPromedio = prev.transacciones > 0 ? Math.round(prev.venta / prev.transacciones) : prev.venta;
          }
        }
      }
      lista = Array.from(mapCli.values());
    }

    if (ordenClientes === "unidades") {
      return lista.sort((a, b) => b.unidades - a.unidades);
    }
    return lista.sort((a, b) => b.venta - a.venta);
  }, [ciudadActiva, zonaActiva, ordenClientes]);

  // Totales y estadísticas para desglose transparente de mostrador vs identificados
  const statsClientes = useMemo(() => {
    const totalVenta = clientesConsolidados.reduce((acc, c) => acc + c.venta, 0);
    const ventaMostrador = clientesConsolidados.filter((c) => c.esGenerico).reduce((acc, c) => acc + c.venta, 0);
    const ventaIdentificada = clientesConsolidados.filter((c) => !c.esGenerico).reduce((acc, c) => acc + c.venta, 0);
    const cantIdentificados = clientesConsolidados.filter((c) => !c.esGenerico).length;
    const cantMostrador = clientesConsolidados.filter((c) => c.esGenerico).length;
    return { totalVenta, ventaMostrador, ventaIdentificada, cantIdentificados, cantMostrador };
  }, [clientesConsolidados]);

  const listaIdentificados = useMemo(() => {
    return clientesConsolidados.filter((c) => !c.esGenerico);
  }, [clientesConsolidados]);

  const clientesCiudad = useMemo(() => {
    if (filtroTipoCliente === "identificados") {
      return clientesConsolidados.filter((c) => !c.esGenerico);
    }
    return clientesConsolidados;
  }, [clientesConsolidados, filtroTipoCliente]);

  const zonaLider = zonasOrdenadas[0] || null;
  const ciudadLider = useMemo(() => {
    if (!zonaActiva?.ciudades || zonaActiva.ciudades.length === 0) return null;
    return [...zonaActiva.ciudades].sort((a, b) => b.venta - a.venta)[0];
  }, [zonaActiva]);

  // Parámetros de escala calibrados según la perspectiva para evitar colisiones
  const escalaGeometria = useMemo(() => {
    if (modoVista === "colombia") {
      return {
        radioBase: 0.7,
        radioExtraMax: 0.45,
        hitRadius: 1.15,
        strokeWidth: 0.25,
      };
    }
    if (modoVista === "americas") {
      return {
        radioBase: 2.2,
        radioExtraMax: 1.8,
        hitRadius: 3.5,
        strokeWidth: 1.0,
      };
    }
    // mundo
    return {
      radioBase: 3.8,
      radioExtraMax: 3.0,
      hitRadius: 5.8,
      strokeWidth: 1.5,
    };
  }, [modoVista]);

  // Mapear cada zona activa a un punto geográfico con coordenadas fijas y radios acotados
  const puntosMapeados = useMemo(() => {
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
        const hash = z.zona.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
        cx = 286.0 + (hash % 10);
        cy = 224.0 + (hash % 20);
      }

      const pct = Math.max(0, Math.min(100, z.porcentaje || 0));
      const radioCore = escalaGeometria.radioBase + Math.min(escalaGeometria.radioExtraMax, Math.sqrt(pct) * 0.05);

      const nombreLimpio = limpiarTextoEncoding(z.zona);
      const isSelected = zonaActiva && limpiarTextoEncoding(zonaActiva.zona) === nombreLimpio;
      const isHovered = hoverPunto && hoverPunto.nombre === nombreLimpio;

      return {
        zonaData: z,
        nombre: nombreLimpio,
        nombreOriginal: z.zona,
        cx,
        cy,
        r: radioCore,
        hitRadius: escalaGeometria.hitRadius,
        strokeWidth: escalaGeometria.strokeWidth,
        bandera,
        pais,
        tipo,
        countryCode,
        esLider: idx === 0,
        isSelected: !!isSelected,
        isHovered: !!isHovered,
        venta: z.venta,
        unidades: z.unidades,
        porcentaje: z.porcentaje,
        ciudadesCount: z.ciudades?.length || 0,
        refsCount: z.referencias?.length || 0,
      };
    });
  }, [zonasOrdenadas, zonaActiva, hoverPunto, escalaGeometria]);

  // Rutas de exportación curvas desde Colombia hacia destinos internacionales
  const rutasExportacion = useMemo(() => {
    const colX = 292.0;
    const colY = 235.0;
    const internacionales = puntosMapeados.filter((p) => p.tipo === "internacional");

    return internacionales.map((dest) => {
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
    set.add("COL");
    return Array.from(set);
  }, [puntosMapeados]);

  // ViewBox dinámico según la perspectiva seleccionada
  const viewBoxActual = useMemo(() => {
    if (modoVista === "colombia") {
      // Zoom óptimo sobre Colombia sin recorte
      return "272 208 40 48";
    }
    if (modoVista === "americas") {
      return "140 70 340 320";
    }
    return "0 0 1000 500";
  }, [modoVista]);

  // Punto activo para renderizar en capa superior (z-index SVG)
  const puntoSuperior = useMemo(() => {
    if (hoverPunto) {
      return puntosMapeados.find((p) => p.nombre === hoverPunto.nombre) || null;
    }
    return puntosMapeados.find((p) => p.isSelected) || null;
  }, [puntosMapeados, hoverPunto]);

  return (
    <div className="space-y-4">
      {/* ============================================================== */}
      {/* 1. MAPA MUNDI VECTORIAL DE ALTA DEFINICIÓN (GIS / INTERACTIVO)  */}
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
                      ? `Visualización geográfica de los mercados y zonas atendidas por ${limpiarTextoEncoding(vendedorNombre)}`
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
              className="w-full h-full transition-all duration-700 ease-out"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <linearGradient id="oceanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#091122" />
                  <stop offset="50%" stopColor="#0b172e" />
                  <stop offset="100%" stopColor="#0f172a" />
                </linearGradient>

                <filter id="glowFilt" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="1.5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Fondo oceánico */}
              <rect width="1000" height="500" fill="url(#oceanGrad)" className="pointer-events-none" />

              {/* Cuadrícula cartográfica de meridianos y paralelos */}
              <g opacity="0.10" stroke="#38bdf8" strokeWidth="0.5" strokeDasharray="2 3" className="pointer-events-none">
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
                className="transition-colors duration-300 pointer-events-none"
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
                    className="transition-all duration-300 pointer-events-none"
                  />
                );
              })}

              {/* RUTAS COMERCIALES DE EXPORTACIÓN (Curvas hacia destinos internacionales) */}
              {rutasExportacion.map((ruta) => (
                <path
                  key={ruta.id}
                  d={ruta.pathD}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth={modoVista === "colombia" ? "0.25" : "1.6"}
                  strokeDasharray={modoVista === "colombia" ? "1 1" : "4 4"}
                  opacity="0.85"
                  className="pointer-events-none"
                />
              ))}

              {/* CAPA BASE DE PUNTOS GEOGRÁFICOS */}
              {puntosMapeados.map((p) => {
                const colorFondo = p.tipo === "internacional" ? "#0ea5e9" : "#10b981";
                const isSelected = p.isSelected;
                const isHovered = p.isHovered;

                return (
                  <g key={`punto-${p.nombre}`} className="pointer-events-none">
                    {/* Núcleo visual del punto */}
                    <circle
                      cx={p.cx}
                      cy={p.cy}
                      r={isSelected || isHovered ? p.r * 1.35 : p.r}
                      fill={isSelected ? "#ffffff" : colorFondo}
                      stroke={isSelected ? colorFondo : "#ffffff"}
                      strokeWidth={p.strokeWidth}
                      className="pointer-events-none transition-all duration-150"
                    />

                    {/* Halo suave solo para el líder o seleccionado (sin interferencia de eventos) */}
                    {(p.esLider || isSelected) && (
                      <circle
                        cx={p.cx}
                        cy={p.cy}
                        r={p.r * 1.5}
                        fill={colorFondo}
                        opacity="0.25"
                        className="pointer-events-none"
                      />
                    )}
                  </g>
                );
              })}

              {/* CAPA SUPERIOR: ELEMENTO HOVERED O SELECCIONADO (Z-Index alto para no solaparse) */}
              {puntoSuperior && (
                <g className="pointer-events-none animate-in fade-in zoom-in-95 duration-100">
                  {/* Anillo de pulso sutil EXCLUSIVO del punto activo */}
                  <circle
                    cx={puntoSuperior.cx}
                    cy={puntoSuperior.cy}
                    r={puntoSuperior.r * 1.9}
                    fill={puntoSuperior.tipo === "internacional" ? "#0ea5e9" : "#10b981"}
                    opacity="0.3"
                    className="animate-ping pointer-events-none"
                  />

                  {/* Núcleo resaltado */}
                  <circle
                    cx={puntoSuperior.cx}
                    cy={puntoSuperior.cy}
                    r={puntoSuperior.r * 1.4}
                    fill="#ffffff"
                    stroke={puntoSuperior.tipo === "internacional" ? "#0ea5e9" : "#10b981"}
                    strokeWidth={puntoSuperior.strokeWidth * 1.6}
                    className="pointer-events-none"
                  />

                  {/* Etiqueta flotante anti-colisión exclusiva del punto activo */}
                  {modoVista === "colombia" ? (
                    <g className="pointer-events-none">
                      <rect
                        x={puntoSuperior.cx - 9}
                        y={puntoSuperior.cy - puntoSuperior.r - 4.5}
                        width="18"
                        height="3.6"
                        rx="1"
                        fill="#0b1329"
                        stroke={puntoSuperior.tipo === "internacional" ? "#38bdf8" : "#10b981"}
                        strokeWidth="0.22"
                        opacity="0.95"
                      />
                      <text
                        x={puntoSuperior.cx}
                        y={puntoSuperior.cy - puntoSuperior.r - 2.1}
                        fill="#ffffff"
                        textAnchor="middle"
                        fontSize="1.9"
                        fontWeight="bold"
                        className="drop-shadow-xs"
                      >
                        {puntoSuperior.bandera} {puntoSuperior.nombre}
                      </text>
                    </g>
                  ) : (
                    <g className="pointer-events-none">
                      <rect
                        x={puntoSuperior.cx - 28}
                        y={puntoSuperior.cy - puntoSuperior.r - 18}
                        width="56"
                        height="14"
                        rx="4"
                        fill="#0b1329"
                        stroke={puntoSuperior.tipo === "internacional" ? "#38bdf8" : "#10b981"}
                        strokeWidth="1"
                        opacity="0.95"
                      />
                      <text
                        x={puntoSuperior.cx}
                        y={puntoSuperior.cy - puntoSuperior.r - 7.5}
                        fill="#ffffff"
                        textAnchor="middle"
                        fontSize="8.5"
                        fontWeight="bold"
                        className="drop-shadow-sm"
                      >
                        {puntoSuperior.bandera} {puntoSuperior.nombre}
                      </text>
                    </g>
                  )}
                </g>
              )}

              {/* CAPA EXCLUSIVA DE INTERACCIÓN: HIT-TARGETS INDEPENDIENTES (Sin solapamiento) */}
              {puntosMapeados.map((p) => (
                <circle
                  key={`hit-${p.nombre}`}
                  cx={p.cx}
                  cy={p.cy}
                  r={p.hitRadius}
                  fill="transparent"
                  className="cursor-pointer pointer-events-auto"
                  onClick={(e) => {
                    e.stopPropagation();
                    setZonaActivaNombre(p.nombreOriginal);
                    if (p.zonaData.id && onSelectZona) {
                      onSelectZona(p.zonaData.id, p.nombreOriginal);
                    }
                  }}
                  onMouseEnter={() => {
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
                      topCiudades: p.zonaData.ciudades?.slice(0, 3).map((c) => limpiarTextoEncoding(c.ciudad)) || [],
                    });
                  }}
                  onMouseLeave={() => {
                    setHoverPunto(null);
                  }}
                />
              ))}
            </svg>

            {/* HUD / TOOLTIP FLOTANTE AISLADO EN LA ESQUINA SUPERIOR DERECHA */}
            {hoverPunto ? (
              <div
                className="absolute z-20 pointer-events-none p-3 rounded-2xl bg-slate-900/95 text-white border border-slate-700/80 shadow-2xl backdrop-blur-md text-xs min-w-[210px] animate-in fade-in duration-100"
                style={{
                  top: "12px",
                  right: "12px",
                }}
              >
                <div className="flex items-center gap-2 mb-1.5 pb-1.5 border-b border-slate-800">
                  <span className="text-xl">{hoverPunto.bandera}</span>
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

                  {hoverPunto.topCiudades.length > 0 && (
                    <div className="pt-1 border-t border-slate-800 text-[9.5px] text-slate-300">
                      <span className="text-slate-400 font-medium">Ciudades: </span>
                      {hoverPunto.topCiudades.join(", ")}
                      {hoverPunto.ciudadesCount > 3 ? ` (+${hoverPunto.ciudadesCount - 3})` : ""}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[9.5px] text-slate-400 pt-0.5 border-t border-slate-800">
                    <span>{hoverPunto.ciudadesCount} municipios</span>
                    <span>{hoverPunto.refsCount} referencias</span>
                  </div>
                </div>
              </div>
            ) : (
              /* Indicador de ayuda cuando no hay cursor sobre una ciudad */
              <div
                className="hidden sm:flex items-center gap-1.5 absolute z-10 pointer-events-none p-2 rounded-xl bg-slate-900/70 text-slate-300 border border-slate-800 backdrop-blur-xs text-[10.5px]"
                style={{
                  top: "12px",
                  right: "12px",
                }}
              >
                <Info className="h-3.5 w-3.5 text-sky-400" />
                <span>Pasa el cursor sobre un punto para ver su detalle</span>
              </div>
            )}

            {/* Leyenda en la esquina inferior izquierda */}
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
              <span className="text-slate-400">Haz clic en un punto para seleccionarlo</span>
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
            {vendedorNombre ? `Ventas de ${limpiarTextoEncoding(vendedorNombre)}` : "Facturación Nacional Total"}
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
            {zonaLider ? limpiarTextoEncoding(zonaLider.zona) : "Sin ventas"}
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
            {ciudadLider ? limpiarTextoEncoding(ciudadLider.ciudad) : "Sin ventas"}
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
                const nombreLimpio = limpiarTextoEncoding(z.zona);
                const isSelected = zonaActiva && limpiarTextoEncoding(zonaActiva.zona) === nombreLimpio;
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
                            {nombreLimpio}
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
                            {limpiarTextoEncoding(c.ciudad)} ({c.porcentaje.toFixed(0)}%)
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
                        <span>Zona: {limpiarTextoEncoding(zonaActiva.zona)}</span>
                        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 font-bold border-emerald-500/30">
                          {zonaActiva.porcentaje.toFixed(1)}% Participación
                        </Badge>
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        {vendedorNombre
                          ? `Detalle comercial de municipios y referencias vendidas por ${limpiarTextoEncoding(vendedorNombre)}`
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
                <div className="flex items-center justify-between flex-wrap gap-1.5">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5 text-sky-500" />
                    <span>Municipios y Ciudades ({zonaActiva.ciudades?.length || 0})</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    {ciudadActiva ? (
                      <button
                        type="button"
                        onClick={() => setCiudadSeleccionadaNombre(null)}
                        className="text-[10px] font-bold text-sky-600 dark:text-sky-400 hover:text-sky-700 bg-sky-500/10 hover:bg-sky-500/20 px-2 py-0.5 rounded-md flex items-center gap-1 transition-all cursor-pointer border border-sky-500/30"
                        title="Desfiltrar ciudad y ver todos los clientes de la zona"
                      >
                        <FilterX className="h-3 w-3" />
                        <span>Desfiltrar ciudad ({limpiarTextoEncoding(ciudadActiva.ciudad)})</span>
                      </button>
                    ) : (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <span>💡 Clic en una ciudad para ver sus clientes</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[140px] overflow-y-auto pr-1">
                  {(!zonaActiva.ciudades || zonaActiva.ciudades.length === 0) ? (
                    <p className="text-xs text-muted-foreground py-2">Sin ciudades registradas</p>
                  ) : (
                    zonaActiva.ciudades.map((c, cIdx) => {
                      const isSelected =
                        ciudadActiva &&
                        (ciudadActiva.ciudad === c.ciudad ||
                          limpiarTextoEncoding(ciudadActiva.ciudad) === limpiarTextoEncoding(c.ciudad));
                      return (
                        <button
                          key={c.ciudad}
                          type="button"
                          onClick={() => {
                            setCiudadSeleccionadaNombre((prev) => {
                              const isCurrent =
                                prev &&
                                (prev === c.ciudad ||
                                  limpiarTextoEncoding(prev) === limpiarTextoEncoding(c.ciudad));
                              return isCurrent ? null : c.ciudad;
                            });
                          }}
                          className={`p-2 rounded-xl text-left border flex items-center justify-between text-xs transition-all cursor-pointer ${
                            isSelected
                              ? "bg-sky-500/15 border-sky-500 ring-2 ring-sky-500/30 shadow-xs"
                              : "bg-background border-border/60 hover:bg-muted/50 hover:border-border shadow-2xs"
                          }`}
                          title={
                            isSelected
                              ? `Clic para desfiltrar ${limpiarTextoEncoding(c.ciudad)} y ver toda la zona`
                              : `Clic para filtrar los clientes de ${limpiarTextoEncoding(c.ciudad)}`
                          }
                        >
                          <div className="flex items-center gap-1.5 truncate max-w-[155px]">
                            <span
                              className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                                isSelected ? "bg-sky-500 text-white" : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {cIdx + 1}
                            </span>
                            <div className="truncate">
                              <span
                                className={`font-semibold truncate block ${
                                  isSelected ? "text-sky-600 dark:text-sky-400 font-bold" : "text-foreground"
                                }`}
                              >
                                {limpiarTextoEncoding(c.ciudad)}
                              </span>
                              {isSelected ? (
                                <span className="text-[9px] text-sky-600 dark:text-sky-400 font-bold block leading-none mt-0.5">
                                  ● Filtrando clientes <span className="font-normal opacity-80">(clic p/ quitar)</span>
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-mono font-bold text-foreground text-[11px] block">
                              {formatoCOP(c.venta)}
                            </span>
                            <span className="text-[9.5px] text-muted-foreground">
                              {c.unidades.toLocaleString("es-CO")} unds ({c.porcentaje.toFixed(0)}%)
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Sub-sección 2: Clientes que han comprado en la ciudad seleccionada */}
              <div className="space-y-2 pt-2 border-t border-border/50">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="p-1 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      <Users className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5 flex-wrap">
                      <span>
                        Clientes que Compraron en{" "}
                        {ciudadActiva ? (
                          <span className="text-sky-600 dark:text-sky-400 font-extrabold">
                            {limpiarTextoEncoding(ciudadActiva.ciudad)}
                          </span>
                        ) : (
                          <span className="text-foreground font-extrabold">
                            {limpiarTextoEncoding(zonaActiva.zona)} (Todas las Ciudades)
                          </span>
                        )}{" "}
                        ({clientesCiudad.length})
                      </span>
                    </span>
                    {ciudadActiva && (
                      <button
                        type="button"
                        onClick={() => setCiudadSeleccionadaNombre(null)}
                        className="text-[10px] font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer ml-1 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20"
                        title="Ver todos los clientes de la zona"
                      >
                        <FilterX className="h-2.5 w-2.5" />
                        <span>Ver toda la zona</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Filtro: Todos vs Solo Clientes Identificados */}
                    {statsClientes.cantMostrador > 0 && (
                      <div className="flex rounded-lg bg-muted p-0.5 border border-border/50 text-[10px]">
                        <button
                          type="button"
                          onClick={() => setFiltroTipoCliente("todos")}
                          className={`px-2 py-0.5 rounded font-semibold transition-all ${
                            filtroTipoCliente === "todos"
                              ? "bg-background text-foreground shadow-2xs"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          Todos ({clientesConsolidados.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setFiltroTipoCliente("identificados")}
                          className={`px-2 py-0.5 rounded font-semibold transition-all flex items-center gap-1 ${
                            filtroTipoCliente === "identificados"
                              ? "bg-background text-foreground shadow-2xs"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                          title="Mostrar únicamente clientes con NIT o identificación registrada"
                        >
                          <UserCheck className="h-2.5 w-2.5" />
                          Solo Clientes ({statsClientes.cantIdentificados})
                        </button>
                      </div>
                    )}

                    {/* Selector: Por Facturación vs Por Unidades */}
                    <div className="flex rounded-lg bg-muted p-0.5 border border-border/50 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setOrdenClientes("valor")}
                        className={`px-2 py-0.5 rounded font-semibold transition-all ${
                          ordenClientes === "valor"
                            ? "bg-background text-foreground shadow-2xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Por Facturación ($)
                      </button>
                      <button
                        type="button"
                        onClick={() => setOrdenClientes("unidades")}
                        className={`px-2 py-0.5 rounded font-semibold transition-all ${
                          ordenClientes === "unidades"
                            ? "bg-background text-foreground shadow-2xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Por Unidades
                      </button>
                    </div>
                  </div>
                </div>

                {/* Banner informativo de transparencia para compras de mostrador */}
                {statsClientes.ventaMostrador > 0 && filtroTipoCliente === "todos" && (
                  <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                        <Store className="h-3.5 w-3.5" />
                      </span>
                      <div>
                        <span className="font-semibold text-foreground">Ventas Mostrador / Sin NIT: </span>
                        <span className="font-bold text-amber-700 dark:text-amber-300 font-mono">
                          {formatoCOPFull(statsClientes.ventaMostrador)}
                        </span>
                        <span className="text-muted-foreground text-[10.5px] ml-1.5">
                          ({statsClientes.totalVenta > 0 ? ((statsClientes.ventaMostrador / statsClientes.totalVenta) * 100).toFixed(1) : 0}% de compras directas sin identificación)
                        </span>
                      </div>
                    </div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <UserCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span><strong className="text-foreground">{statsClientes.cantIdentificados}</strong> clientes identificados:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        {formatoCOPFull(statsClientes.ventaIdentificada)}
                      </span>
                    </div>
                  </div>
                )}

                {clientesCiudad.length === 0 ? (
                  <div className="p-5 text-center text-xs text-muted-foreground border border-dashed rounded-xl bg-muted/10">
                    No se registran clientes con compras en{" "}
                    {ciudadActiva ? limpiarTextoEncoding(ciudadActiva.ciudad) : limpiarTextoEncoding(zonaActiva.zona)}{" "}
                    para los filtros actuales.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-border/60 bg-background/60 max-h-[220px]">
                    <table className="w-full text-xs text-left">
                      <thead className="border-b border-border/80 uppercase text-[10px] text-muted-foreground font-bold bg-muted/30 sticky top-0">
                        <tr>
                          <th className="py-2 px-2.5">#</th>
                          <th className="py-2 px-2.5">Cliente / Razón Social</th>
                          <th className="py-2 px-2.5">NIT / Código</th>
                          <th className="py-2 px-2.5 text-right">Prendas</th>
                          <th className="py-2 px-2.5 text-right">Ticket Prom.</th>
                          <th className="py-2 px-2.5 text-right">Facturación</th>
                          <th className="py-2 px-2.5 text-right">
                            {ciudadActiva
                              ? `% en ${limpiarTextoEncoding(ciudadActiva.ciudad)}`
                              : `% en ${limpiarTextoEncoding(zonaActiva.zona)}`}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40 text-[11px]">
                        {clientesCiudad.map((cli, idx) => {
                          const idxIdentificado = listaIdentificados.findIndex((x) => x.id === cli.id);
                          return (
                            <tr key={`${cli.id}-${idx}`} className="hover:bg-muted/40 transition-colors">
                              <td className="py-1.5 px-2.5 font-bold text-muted-foreground">
                                {cli.esGenerico ? (
                                  <Badge variant="outline" className="text-[9px] px-1 py-0 bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 font-semibold flex items-center gap-0.5 w-fit">
                                    <Store className="h-2.5 w-2.5" />
                                    Mostrador
                                  </Badge>
                                ) : (
                                  idxIdentificado === 0 ? "🥇" : idxIdentificado === 1 ? "🥈" : idxIdentificado === 2 ? "🥉" : `#${idxIdentificado + 1}`
                                )}
                              </td>
                              <td className="py-1.5 px-2.5 font-semibold text-foreground truncate max-w-[220px]" title={cli.nombre}>
                                {cli.esGenerico ? (
                                  <div className="flex flex-col">
                                    <span className="font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                                      <Store className="h-3 w-3 shrink-0 text-amber-500" />
                                      {limpiarTextoEncoding(cli.nombre)}
                                    </span>
                                    <span className="text-[9.5px] text-muted-foreground font-normal">
                                      Consolidado ventas directas en mostrador
                                    </span>
                                  </div>
                                ) : (
                                  <span>{limpiarTextoEncoding(cli.nombre)}</span>
                                )}
                              </td>
                              <td className="py-1.5 px-2.5 font-mono text-muted-foreground">
                                {cli.esGenerico ? (
                                  <Badge variant="outline" className="text-[9px] font-mono px-1 py-0 bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20">
                                    {cli.codigo || "NO APLICA"}
                                  </Badge>
                                ) : cli.codigo ? (
                                  <Badge variant="outline" className="text-[9px] font-mono px-1 py-0 bg-muted/40 text-muted-foreground border-border">
                                    {cli.codigo}
                                  </Badge>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground/60">N/D</span>
                                )}
                              </td>
                              <td className="py-1.5 px-2.5 text-right font-medium text-foreground">
                                {cli.unidades.toLocaleString("es-CO")}
                              </td>
                              <td className="py-1.5 px-2.5 text-right font-mono text-muted-foreground">
                                <span>{formatoCOP(cli.ticketPromedio)}</span>
                                <span className="block text-[8.5px] text-muted-foreground/80">
                                  {cli.transacciones} {cli.transacciones === 1 ? "operación" : "operaciones"}
                                </span>
                              </td>
                              <td className="py-1.5 px-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                                {formatoCOPFull(cli.venta)}
                              </td>
                              <td className="py-1.5 px-2.5 text-right">
                                <Badge variant="outline" className="text-[9.5px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 py-0 px-1">
                                  {Number(cli.porcentajeEnCiudad).toFixed(1)}%
                                </Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Sub-sección 3: Referencias / Prendas Vendidas en esta Zona */}
              <div className="space-y-2 pt-2 border-t border-border/50">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-purple-500" />
                    <span>Referencias Vendidas en {limpiarTextoEncoding(zonaActiva.zona)} ({referenciasZona.length})</span>
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
                    No se registran referencias vendidas en {limpiarTextoEncoding(zonaActiva.zona)} para los filtros actuales.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-border/60 bg-background/60 max-h-[220px]">
                    <table className="w-full text-xs text-left">
                      <thead className="border-b border-border/80 uppercase text-[10px] text-muted-foreground font-bold bg-muted/30 sticky top-0">
                        <tr>
                          <th className="py-2 px-2.5">#</th>
                          <th className="py-2 px-2.5">SKU / Ref</th>
                          <th className="py-2 px-2.5">Nombre del Producto</th>
                          <th className="py-2 px-2.5">Prenda / Tipo</th>
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
                            <td className="py-1.5 px-2.5 font-mono font-bold text-primary">{limpiarTextoEncoding(ref.sku)}</td>
                            <td className="py-1.5 px-2.5 font-semibold text-foreground truncate max-w-[170px]" title={ref.producto}>
                              {limpiarTextoEncoding(ref.producto)}
                            </td>
                            <td className="py-1.5 px-2.5">
                              {ref.prenda ? (
                                <Badge variant="outline" className="text-[9px] font-semibold bg-muted/40 py-0 px-1 border-border/60">
                                  {limpiarTextoEncoding(ref.prenda)}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground/60 text-[10px]">-</span>
                              )}
                            </td>
                            <td className="py-1.5 px-2.5 text-muted-foreground">{limpiarTextoEncoding(ref.linea)}</td>
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
