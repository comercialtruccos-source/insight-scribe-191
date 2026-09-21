import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  SankeyData,
  SankeyNode,
  SankeyLink,
  computeSankeyLayout,
  generarSankeyFlujoComercial,
  generarSankeyFlujoTerritorial,
  generarSankeyFlujoCascada,
  generarSankeyFlujoDigital,
} from "@/lib/sankey-calc";
import { FilaFactVentas, CatalogoItem } from "@/lib/ventas-api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Layers,
  MapPin,
  Package,
  Globe,
  DollarSign,
  Maximize2,
  Minimize2,
  Info,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface SankeyFlujoComercialProps {
  rawVentas?: FilaFactVentas[];
  catalogos?: {
    canales?: CatalogoItem[];
    lineas?: CatalogoItem[];
    zonas?: CatalogoItem[];
    marcas?: CatalogoItem[];
  };
  d3?: any;
  d6?: any;
  presetInicial?: "comercial" | "territorial" | "cascada" | "digital";
  tituloPersonalizado?: string;
  subtituloPersonalizado?: string;
  mostrarSelectorPresets?: boolean;
  className?: string;
}

function formatoCOP(val: number): string {
  if (Math.abs(val) >= 1_000_000_000) {
    return `$${(val / 1_000_000_000).toFixed(2)}B`;
  }
  if (Math.abs(val) >= 1_000_000) {
    return `$${(val / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(val) >= 1_000) {
    return `$${(val / 1_000).toFixed(0)}K`;
  }
  return `$${Math.round(val).toLocaleString("es-CO")}`;
}

function formatoCOPFull(val: number): string {
  return `$${Math.round(val).toLocaleString("es-CO")}`;
}

export function SankeyFlujoComercial({
  rawVentas = [],
  catalogos,
  d3,
  d6,
  presetInicial = "comercial",
  tituloPersonalizado,
  subtituloPersonalizado,
  mostrarSelectorPresets = true,
  className = "",
}: SankeyFlujoComercialProps) {
  const [preset, setPreset] = useState<"comercial" | "territorial" | "cascada" | "digital">(presetInicial);
  const [hoveredLink, setHoveredLink] = useState<SankeyLink | null>(null);
  const [hoveredNode, setHoveredNode] = useState<SankeyNode | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(900);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (entries[0] && entries[0].contentRect.width > 0) {
        setContainerWidth(Math.max(450, entries[0].contentRect.width));
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Compute active dataset
  const activeSankeyData: SankeyData = useMemo(() => {
    switch (preset) {
      case "territorial":
        return generarSankeyFlujoTerritorial(rawVentas, catalogos);
      case "cascada":
        return generarSankeyFlujoCascada(rawVentas, catalogos);
      case "digital":
        return generarSankeyFlujoDigital(d3, rawVentas);
      case "comercial":
      default:
        return generarSankeyFlujoComercial(rawVentas, catalogos);
    }
  }, [preset, rawVentas, catalogos, d3]);

  const height = isExpanded ? 580 : containerWidth < 640 ? 380 : 440;

  // Compute layout
  const layout = useMemo(() => {
    return computeSankeyLayout(activeSankeyData, containerWidth, height);
  }, [activeSankeyData, containerWidth, height]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setTooltipPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const activeHoveredLinkObj = hoveredLink;

  return (
    <Card
      ref={containerRef}
      className={`relative overflow-hidden border-border/80 shadow-md transition-all duration-300 ${
        isExpanded ? "fixed inset-4 z-50 bg-background/95 backdrop-blur-2xl overflow-y-auto max-h-[95vh]" : ""
      } ${className}`}
    >
      <CardHeader className="pb-3 border-b border-border/40 bg-muted/10">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                <Sparkles className="h-4 w-4" />
              </div>
              <CardTitle className="text-base font-bold text-foreground font-display flex items-center gap-2">
                {tituloPersonalizado || activeSankeyData.title}
              </CardTitle>
              <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 text-[10px] font-bold">
                Diagrama de Sankey Interactivo
              </Badge>
            </div>
            <CardDescription className="text-xs text-muted-foreground mt-1">
              {subtituloPersonalizado || activeSankeyData.subtitle}
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 self-start lg:self-auto flex-wrap">
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="Información del Diagrama de Sankey"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/70 hover:text-foreground border border-transparent hover:border-border/60 transition-all duration-200 shrink-0"
                >
                  <Info className="h-4 w-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                side="bottom"
                className="w-80 sm:w-96 p-4 rounded-2xl border border-border/80 shadow-lg bg-popover/95 backdrop-blur-md text-xs space-y-3 z-50"
              >
                <div className="flex items-center gap-2 border-b border-border/50 pb-2">
                  <div className="grid h-6 w-6 place-items-center rounded-lg bg-primary/10 text-primary shrink-0">
                    <Info className="h-3.5 w-3.5" />
                  </div>
                  <span className="font-semibold text-sm text-foreground font-display">
                    Diagrama de Flujo / Sankey
                  </span>
                </div>
                <div className="space-y-1.5 text-muted-foreground leading-relaxed">
                  <p>
                    <strong className="text-foreground">¿Qué representa?</strong> Visualiza la distribución proporcional del dinero y prendas entre diferentes etapas comerciales. El ancho de cada cinta curva representa el volumen financiero transferido.
                  </p>
                  <p>
                    <strong className="text-foreground">Métrica:</strong> Facturación ($ COP), unidades de producto y % de aporte relativo.
                  </p>
                  <p className="border-t border-border/40 pt-1.5 text-primary/90 dark:text-primary/80">
                    💡 <strong>Interacción:</strong> Pasa el cursor sobre cualquier cinta o nodo para aislar el flujo y ver la tasa de concentración de valor de extremo a extremo.
                  </p>
                </div>
              </PopoverContent>
            </Popover>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 text-xs font-medium border-border/70 text-muted-foreground hover:text-foreground"
              title={isExpanded ? "Contraer gráfico" : "Expandir en pantalla completa"}
            >
              {isExpanded ? (
                <>
                  <Minimize2 className="h-3.5 w-3.5 mr-1" /> Contraer
                </>
              ) : (
                <>
                  <Maximize2 className="h-3.5 w-3.5 mr-1" /> Expandir
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Selector de Perspectivas de Flujo */}
        {mostrarSelectorPresets && (
          <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-border/40 mt-2">
            <span className="text-[11px] font-semibold text-muted-foreground mr-1">Perspectiva:</span>
            <button
              type="button"
              onClick={() => setPreset("comercial")}
              className={`text-xs px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
                preset === "comercial"
                  ? "bg-indigo-600 text-white border-indigo-600 font-bold shadow-xs"
                  : "bg-muted/40 hover:bg-muted text-muted-foreground border-border/40"
              }`}
            >
              <Layers className="h-3 w-3" />
              Canales ➔ Líneas
            </button>
            <button
              type="button"
              onClick={() => setPreset("territorial")}
              className={`text-xs px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
                preset === "territorial"
                  ? "bg-blue-600 text-white border-blue-600 font-bold shadow-xs"
                  : "bg-muted/40 hover:bg-muted text-muted-foreground border-border/40"
              }`}
            >
              <MapPin className="h-3 w-3" />
              Canales ➔ Zonas Geográficas
            </button>
            <button
              type="button"
              onClick={() => setPreset("cascada")}
              className={`text-xs px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
                preset === "cascada"
                  ? "bg-emerald-600 text-white border-emerald-600 font-bold shadow-xs"
                  : "bg-muted/40 hover:bg-muted text-muted-foreground border-border/40"
              }`}
            >
              <DollarSign className="h-3 w-3" />
              Cascada / Devoluciones vs Neta
            </button>
            {d3 && (
              <button
                type="button"
                onClick={() => setPreset("digital")}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
                  preset === "digital"
                    ? "bg-pink-600 text-white border-pink-600 font-bold shadow-xs"
                    : "bg-muted/40 hover:bg-muted text-muted-foreground border-border/40"
                }`}
              >
                <Globe className="h-3 w-3" />
                Digital & Social Commerce
              </button>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0 relative" onMouseMove={handleMouseMove}>
        {/* Cabecera de Columnas / Capas */}
        <div
          className="grid text-center text-xs font-bold text-muted-foreground tracking-wider uppercase pt-3 pb-1 border-b border-border/30 bg-muted/20"
          style={{
            gridTemplateColumns: `repeat(${activeSankeyData.columnLabels.length}, 1fr)`,
          }}
        >
          {activeSankeyData.columnLabels.map((col, idx) => (
            <div key={idx} className="px-2 truncate">
              {col}
            </div>
          ))}
        </div>

        {/* Lienzo SVG del Diagrama de Sankey */}
        <div className="relative w-full overflow-hidden bg-radial from-card via-card/90 to-background/50">
          <svg
            width="100%"
            height={height}
            viewBox={`0 0 ${containerWidth} ${height}`}
            className="w-full h-full select-none"
          >
            <defs>
              {/* Filtro Glow para cintas activas */}
              <filter id="glow-filter" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>

              {/* Gradientes lineales para cada cinta de flujo */}
              {layout.links.map((link) => (
                <linearGradient
                  key={link.gradientId}
                  id={link.gradientId}
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                >
                  <stop offset="0%" stopColor={link.sourceColor || "#3b82f6"} stopOpacity={0.8} />
                  <stop offset="100%" stopColor={link.targetColor || "#6366f1"} stopOpacity={0.8} />
                </linearGradient>
              ))}
            </defs>

            {/* Cintas de Flujo (Links) */}
            <g className="sankey-links">
              {layout.links.map((link) => {
                const isHovered = hoveredLink?.id === link.id;
                const isConnectedToHoveredNode =
                  hoveredNode && (hoveredNode.id === link.source || hoveredNode.id === link.target);
                const isDimmed =
                  (hoveredLink && !isHovered) || (hoveredNode && !isConnectedToHoveredNode);

                return (
                  <path
                    key={link.id}
                    d={link.path}
                    fill={`url(#${link.gradientId})`}
                    opacity={isHovered ? 0.95 : isConnectedToHoveredNode ? 0.85 : isDimmed ? 0.08 : 0.45}
                    filter={isHovered ? "url(#glow-filter)" : undefined}
                    className="cursor-pointer transition-all duration-200"
                    onMouseEnter={() => {
                      setHoveredLink(link);
                      setHoveredNode(null);
                    }}
                    onMouseLeave={() => setHoveredLink(null)}
                  />
                );
              })}
            </g>

            {/* Nodos Verticales */}
            <g className="sankey-nodes">
              {layout.nodes.map((node) => {
                const isHovered = hoveredNode?.id === node.id;
                const isConnectedToHoveredLink =
                  hoveredLink && (hoveredLink.source === node.id || hoveredLink.target === node.id);
                const isDimmed =
                  (hoveredNode && !isHovered) || (hoveredLink && !isConnectedToHoveredLink);

                const isLeft = node.column === 0;
                const isRight = node.column === (activeSankeyData.columnLabels.length - 1);
                const isCenter = !isLeft && !isRight;

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x || 0}, ${node.y || 0})`}
                    className="cursor-pointer transition-all duration-200"
                    opacity={isDimmed ? 0.35 : 1}
                    onMouseEnter={() => {
                      setHoveredNode(node);
                      setHoveredLink(null);
                    }}
                    onMouseLeave={() => setHoveredNode(null)}
                  >
                    {/* Barra de nodo con borde y sombra */}
                    <rect
                      width={node.width || 14}
                      height={node.height || 20}
                      fill={node.color}
                      rx={4}
                      className="transition-all duration-200"
                      stroke={isHovered ? "#ffffff" : "rgba(255,255,255,0.2)"}
                      strokeWidth={isHovered ? 2 : 1}
                      filter={isHovered ? "url(#glow-filter)" : undefined}
                    />

                    {/* Etiquetas y Metadatos de Nodo */}
                    <g
                      transform={
                        isLeft
                          ? `translate(-8, ${(node.height || 20) / 2})`
                          : isRight
                          ? `translate(${(node.width || 14) + 8}, ${(node.height || 20) / 2})`
                          : `translate(${(node.width || 14) / 2}, ${(node.height || 20) / 2})`
                      }
                      textAnchor={isLeft ? "end" : isRight ? "start" : "middle"}
                      className="pointer-events-none"
                    >
                      {/* Nombre del nodo */}
                      <text
                        y={isCenter ? -14 : -4}
                        className="font-bold text-[11px] fill-foreground transition-all duration-200"
                        style={{
                          textShadow: isCenter ? "0px 1px 3px rgba(0,0,0,0.6)" : undefined,
                        }}
                      >
                        {node.name.length > 24 ? `${node.name.slice(0, 22)}...` : node.name}
                      </text>

                      {/* Facturación y Porcentaje */}
                      <text
                        y={isCenter ? 4 : 10}
                        className="font-mono text-[10px] font-semibold fill-muted-foreground"
                      >
                        {formatoCOP(node.value)}
                        {node.column !== 1 && (
                          <tspan className="font-bold text-foreground"> • {node.pctTotal.toFixed(1)}%</tspan>
                        )}
                      </text>
                    </g>
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Floating Dark Glassmorphism Tooltip (Identical to user's screenshot) */}
          {activeHoveredLinkObj && tooltipPos && (
            <div
              className="absolute z-50 pointer-events-none -translate-x-1/2 -translate-y-full pb-3 transition-all duration-100 ease-out"
              style={{
                left: Math.min(containerWidth - 140, Math.max(140, tooltipPos.x)),
                top: Math.max(70, tooltipPos.y - 10),
              }}
            >
              <div className="bg-slate-950/95 dark:bg-slate-900/95 backdrop-blur-xl border border-border/80 text-white p-3.5 rounded-xl shadow-2xl space-y-1.5 min-w-[240px] text-xs">
                <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800 pb-1">
                  <span>FLUJO COMERCIAL</span>
                  <span className="flex items-center gap-1 text-indigo-400">
                    <TrendingUp className="h-3 w-3" /> Detalle de Tráfico
                  </span>
                </div>

                <p className="font-bold text-slate-100 text-xs flex items-center gap-1.5">
                  <span className="truncate max-w-[100px]">
                    {layout.nodes.find((n) => n.id === activeHoveredLinkObj.source)?.name || "Origen"}
                  </span>
                  <ArrowRight className="h-3 w-3 text-indigo-400 shrink-0" />
                  <span className="truncate max-w-[100px]">
                    {layout.nodes.find((n) => n.id === activeHoveredLinkObj.target)?.name || "Destino"}
                  </span>
                </p>

                <div className="text-xl font-extrabold text-white font-mono tracking-tight pt-0.5">
                  {formatoCOPFull(activeHoveredLinkObj.value)}
                </div>

                <div className="space-y-0.5 text-[11px] text-slate-300 pt-1 border-t border-slate-800">
                  <p className="flex justify-between">
                    <span className="text-slate-400">% de la Venta Total:</span>
                    <span className="font-bold text-emerald-400">{activeHoveredLinkObj.pctTotal.toFixed(1)}%</span>
                  </p>
                  {activeHoveredLinkObj.units > 0 && (
                    <p className="flex justify-between">
                      <span className="text-slate-400">Prendas Comercializadas:</span>
                      <span className="font-mono font-medium">{activeHoveredLinkObj.units.toLocaleString("es-CO")} unds</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Barra de Métricas KPI al Pie (Bottom KPI Bar - como en el screenshot) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5 p-3 bg-muted/30 border-t border-border/50 text-xs">
          <div className="p-2 rounded-lg bg-background/60 border border-border/40">
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">TOTAL FACTURACIÓN</p>
            <p className="font-bold font-mono text-sm text-emerald-600 dark:text-emerald-400">
              {formatoCOP(activeSankeyData.totalValue)}
            </p>
            <p className="text-[10px] text-muted-foreground">{formatoCOPFull(activeSankeyData.totalValue)}</p>
          </div>

          <div className="p-2 rounded-lg bg-background/60 border border-border/40">
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">ORIGEN PRINCIPAL</p>
            <p className="font-bold text-sm text-foreground truncate" title={activeSankeyData.topSource?.name}>
              {activeSankeyData.topSource?.name || "N/A"}
            </p>
            <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
              {activeSankeyData.topSource?.pct.toFixed(1)}% del total
            </p>
          </div>

          <div className="p-2 rounded-lg bg-background/60 border border-border/40">
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">DESTINO PRINCIPAL</p>
            <p className="font-bold text-sm text-foreground truncate" title={activeSankeyData.topDestination?.name}>
              {activeSankeyData.topDestination?.name || "N/A"}
            </p>
            <p className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">
              {activeSankeyData.topDestination?.pct.toFixed(1)}% del total
            </p>
          </div>

          <div className="p-2 rounded-lg bg-background/60 border border-border/40">
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">VOLUMEN PRENDAS</p>
            <p className="font-bold font-mono text-sm text-foreground">
              {activeSankeyData.totalUnits.toLocaleString("es-CO")}
            </p>
            <p className="text-[10px] text-muted-foreground">Unidades físicas</p>
          </div>

          <div className="hidden lg:block p-2 rounded-lg bg-background/60 border border-border/40">
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">CONCENTRACIÓN TOP 3</p>
            <p className="font-bold font-mono text-sm text-amber-600 dark:text-amber-400">
              {activeSankeyData.concentrationTop3?.toFixed(1) || "N/A"}%
            </p>
            <p className="text-[10px] text-muted-foreground">En 3 canales líderes</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
