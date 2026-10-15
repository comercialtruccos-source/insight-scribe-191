import React, { useState, useMemo } from "react";
import { SkuDetalle } from "@/lib/ventas-api";
import { formatoCOP, formatoCOPFull } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Layers,
  Search,
  ArrowUpDown,
  Sparkles,
  Tag,
  Package,
  X,
} from "lucide-react";

export interface DesgloseSkusTablaProps {
  referencia: string;
  nombreProducto?: string;
  prenda?: string;
  linea?: string;
  totalUnidadesRef?: number;
  totalValorRef?: number;
  skus?: SkuDetalle[];
  onClose?: () => void;
}

export function DesgloseSkusTabla({
  referencia,
  nombreProducto,
  prenda,
  linea,
  totalUnidadesRef,
  totalValorRef,
  skus = [],
  onClose,
}: DesgloseSkusTablaProps) {
  const [busqueda, setBusqueda] = useState("");
  const [orden, setOrden] = useState<"valor" | "unidades" | "talla">("valor");

  // Totales
  const totalValor = totalValorRef ?? skus.reduce((acc, s) => acc + s.valor, 0);
  const totalUnidades = totalUnidadesRef ?? skus.reduce((acc, s) => acc + s.unidades, 0);
  const precioPromedioGlobal = totalUnidades > 0 ? Math.round(totalValor / totalUnidades) : 0;

  // Estadísticas clave: Talla líder y Color líder
  const insights = useMemo(() => {
    if (!skus || skus.length === 0) return null;

    const tallasMap = new Map<string, { unidades: number; valor: number }>();
    const coloresMap = new Map<string, { unidades: number; valor: number }>();

    for (const s of skus) {
      const t = s.talla || "Única";
      const c = s.color || "Estándar";

      const prevT = tallasMap.get(t) || { unidades: 0, valor: 0 };
      tallasMap.set(t, { unidades: prevT.unidades + s.unidades, valor: prevT.valor + s.valor });

      const prevC = coloresMap.get(c) || { unidades: 0, valor: 0 };
      coloresMap.set(c, { unidades: prevC.unidades + s.unidades, valor: prevC.valor + s.valor });
    }

    const topTalla = Array.from(tallasMap.entries()).sort((a, b) => b[1].unidades - a[1].unidades)[0];
    const topColor = Array.from(coloresMap.entries()).sort((a, b) => b[1].unidades - a[1].unidades)[0];

    return {
      tallaLider: topTalla ? { talla: topTalla[0], unidades: topTalla[1].unidades, pct: totalUnidades > 0 ? Math.round((topTalla[1].unidades / totalUnidades) * 100) : 0 } : null,
      colorLider: topColor ? { color: topColor[0], unidades: topColor[1].unidades, pct: totalUnidades > 0 ? Math.round((topColor[1].unidades / totalUnidades) * 100) : 0 } : null,
    };
  }, [skus, totalUnidades]);

  // Lista filtrada y ordenada
  const skusFiltrados = useMemo(() => {
    let list = [...skus];

    if (busqueda.trim()) {
      const q = busqueda.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.sku.toLowerCase().includes(q) ||
          s.talla.toLowerCase().includes(q) ||
          s.color.toLowerCase().includes(q) ||
          (s.cod_color && s.cod_color.toLowerCase().includes(q))
      );
    }

    if (orden === "unidades") {
      list.sort((a, b) => b.unidades - a.unidades);
    } else if (orden === "talla") {
      list.sort((a, b) => a.talla.localeCompare(b.talla, "es", { numeric: true }));
    } else {
      list.sort((a, b) => b.valor - a.valor);
    }

    return list;
  }, [skus, busqueda, orden]);

  return (
    <div className="rounded-xl border border-primary/30 bg-card p-3 sm:p-4 shadow-sm space-y-3 animate-in fade-in-50 duration-200">
      {/* Encabezado del Desglose */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 border-b border-border/70 pb-3">
        <div className="flex items-start sm:items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5 sm:mt-0">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-sm text-foreground">
                Desglose por SKU • Ref: <span className="font-mono text-primary font-extrabold">{referencia}</span>
              </span>
              <Badge variant="outline" className="text-[10px] font-semibold bg-primary/5 text-primary border-primary/30">
                {skus.length} {skus.length === 1 ? "Variante (SKU)" : "Variantes (SKUs)"}
              </Badge>
              {prenda && (
                <Badge variant="secondary" className="text-[10px] font-medium py-0 px-1.5">
                  {prenda}
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {nombreProducto || `Referencia ${referencia}`}
              {linea ? ` • Línea: ${linea}` : ""}
            </p>
          </div>
        </div>

        {/* Resumen numérico y botón de cierre */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-muted/60 border border-border/60">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Total Ref:</span>
              <span className="font-bold text-foreground">{totalUnidades.toLocaleString("es-CO")} unds</span>
              <span className="text-muted-foreground">•</span>
              <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {formatoCOPFull(totalValor)}
              </span>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground font-mono text-[11px]">
                Prom. {formatoCOP(precioPromedioGlobal)}
              </span>
            </div>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              title="Cerrar desglose de SKU"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Barra de Insights Clave (Talla Líder y Color Líder) */}
      {insights && (insights.tallaLider || insights.colorLider) && (
        <div className="flex flex-wrap items-center gap-2 text-[11px] bg-muted/30 px-2.5 py-1.5 rounded-lg border border-border/50">
          <span className="flex items-center gap-1 font-semibold text-muted-foreground shrink-0">
            <Sparkles className="h-3 w-3 text-amber-500" />
            <span>Rotación por Variante:</span>
          </span>
          {insights.tallaLider && (
            <span className="inline-flex items-center gap-1 bg-background/80 px-2 py-0.5 rounded border border-border/60">
              <span className="text-muted-foreground">Talla más vendida:</span>
              <strong className="text-foreground">{insights.tallaLider.talla}</strong>
              <span className="text-primary font-bold">({insights.tallaLider.unidades} unds - {insights.tallaLider.pct}%)</span>
            </span>
          )}
          {insights.colorLider && (
            <span className="inline-flex items-center gap-1 bg-background/80 px-2 py-0.5 rounded border border-border/60">
              <span className="text-muted-foreground">Color líder:</span>
              <strong className="text-foreground">{insights.colorLider.color}</strong>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                ({insights.colorLider.unidades} unds - {insights.colorLider.pct}%)
              </span>
            </span>
          )}
        </div>
      )}

      {/* Controles de búsqueda y ordenamiento de SKUs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1">
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por SKU, talla o color..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-8 h-8 text-xs bg-background"
          />
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <span className="text-[10px] text-muted-foreground font-semibold uppercase">Ordenar:</span>
          <div className="flex rounded-md bg-muted p-0.5 border border-border/50 text-[10px]">
            <button
              type="button"
              onClick={() => setOrden("valor")}
              className={`px-2 py-0.5 rounded font-medium transition-all ${
                orden === "valor"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Facturación ($)
            </button>
            <button
              type="button"
              onClick={() => setOrden("unidades")}
              className={`px-2 py-0.5 rounded font-medium transition-all ${
                orden === "unidades"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Unidades
            </button>
            <button
              type="button"
              onClick={() => setOrden("talla")}
              className={`px-2 py-0.5 rounded font-medium transition-all ${
                orden === "talla"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Talla
            </button>
          </div>
        </div>
      </div>

      {/* Tabla detallada de variantes SKU */}
      {skusFiltrados.length === 0 ? (
        <div className="p-6 text-center text-xs text-muted-foreground border border-dashed rounded-lg bg-muted/10">
          {busqueda.trim()
            ? `No se encontraron SKUs que coincidan con "${busqueda}"`
            : "No hay variantes de SKU registradas para esta referencia en los filtros actuales."}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border/70 max-h-[260px] bg-background">
          <table className="w-full text-xs text-left">
            <thead className="border-b border-border/70 uppercase text-[10px] text-muted-foreground font-bold bg-muted/40 sticky top-0">
              <tr>
                <th className="py-2 px-2.5">#</th>
                <th className="py-2 px-2.5">Código SKU</th>
                <th className="py-2 px-2.5">Talla</th>
                <th className="py-2 px-2.5">Color</th>
                <th className="py-2 px-2.5 text-right">Unidades</th>
                <th className="py-2 px-2.5 text-right">Precio Prom.</th>
                <th className="py-2 px-2.5 text-right">Facturación Neta</th>
                <th className="py-2 px-2.5 text-right">% en Referencia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-[11px]">
              {skusFiltrados.map((item, idx) => {
                const pct = Number(item.porcentajeEnReferencia || 0);
                return (
                  <tr key={`${item.sku}-${idx}`} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2 px-2.5 font-bold text-muted-foreground w-8">
                      {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                    </td>
                    <td className="py-2 px-2.5 font-mono font-bold text-primary">
                      {item.sku}
                    </td>
                    <td className="py-2 px-2.5">
                      <Badge variant="outline" className="text-[10px] font-bold px-1.5 py-0 bg-muted/60 border-border">
                        {item.talla || "Única"}
                      </Badge>
                    </td>
                    <td className="py-2 px-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-foreground">{item.color || "Estándar"}</span>
                        {item.cod_color && (
                          <span className="text-[9px] font-mono text-muted-foreground bg-muted/50 px-1 py-0.2 rounded border border-border/60">
                            {item.cod_color}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-2.5 text-right font-semibold text-foreground">
                      {item.unidades.toLocaleString("es-CO")}
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono text-muted-foreground">
                      {formatoCOP(item.precioPromedio)}
                    </td>
                    <td className="py-2 px-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      {formatoCOPFull(item.valor)}
                    </td>
                    <td className="py-2 px-2.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <div className="w-14 h-1.5 bg-muted rounded-full overflow-hidden hidden sm:block">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${Math.min(100, Math.max(3, pct))}%` }}
                          />
                        </div>
                        <span className="font-bold text-[10px] text-foreground font-mono">
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
