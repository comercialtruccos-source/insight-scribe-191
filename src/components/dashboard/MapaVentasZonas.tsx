import React, { useState, useMemo } from "react";
import { ZonaAporte, CatalogoItem } from "@/lib/ventas-api";
import { formatoCOP, formatoCOPFull } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MapPin,
  TrendingUp,
  Search,
  Filter,
  Package,
  Building2,
  CheckCircle2,
  Sparkles,
  Layers,
  ArrowUpRight,
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

  return (
    <div className="space-y-4">
      {/* TARJETA SUPERIOR: RESUMEN TERRITORIAL DEL ASESOR / VENDEDOR */}
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
            {zonasOrdenadas.length} Regiones / Departamentos
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

      {/* CUERPO PRINCIPAL: SELECTOR DE ZONAS + DETALLE DE CIUDADES Y REFERENCIAS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* COLUMNA IZQUIERDA: LISTA Y RANKING DE ZONAS DEL VENDEDOR (COL 5) */}
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
                          ? `Ventas realizadas por ${vendedorNombre} en esta zona`
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
              Selecciona una zona a la izquierda para inspeccionar sus municipios y las referencias vendidas.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
