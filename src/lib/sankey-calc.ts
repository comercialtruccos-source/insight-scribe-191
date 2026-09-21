import { FilaFactVentas, CatalogoItem } from "./ventas-api";

export interface SankeyNode {
  id: string;
  name: string;
  category?: string;
  color: string;
  column: number;
  value: number;
  units: number;
  pctTotal: number;
  pctParent?: number;
  // Layout computed fields
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  totalIn?: number;
  totalOut?: number;
}

export interface SankeyLink {
  id: string;
  source: string;
  target: string;
  value: number;
  units: number;
  pctSource: number;
  pctTarget: number;
  pctTotal: number;
  color?: string;
  sourceColor?: string;
  targetColor?: string;
  gradientId?: string;
  // Layout computed fields
  path?: string;
  y0?: number;
  y1?: number;
  h0?: number;
  h1?: number;
  x0?: number;
  x1?: number;
}

export interface SankeyData {
  id: string;
  title: string;
  subtitle: string;
  columnLabels: string[];
  nodes: SankeyNode[];
  links: SankeyLink[];
  totalValue: number;
  totalUnits: number;
  topSource?: { name: string; value: number; pct: number };
  topDestination?: { name: string; value: number; pct: number };
  concentrationTop3?: number;
}

export interface SankeyLayoutResult {
  nodes: SankeyNode[];
  links: SankeyLink[];
  width: number;
  height: number;
}

// Palette of premium colors for flows and nodes
const COLOR_PALETTE = {
  blue: "#3b82f6",
  indigo: "#6366f1",
  purple: "#a855f7",
  emerald: "#10b981",
  teal: "#14b8a6",
  cyan: "#06b6d4",
  amber: "#f59e0b",
  orange: "#f97316",
  rose: "#f43f5e",
  pink: "#ec4899",
  slate: "#64748b",
};

const PALETA_NODOS = [
  COLOR_PALETTE.blue,
  COLOR_PALETTE.indigo,
  COLOR_PALETTE.emerald,
  COLOR_PALETTE.amber,
  COLOR_PALETTE.purple,
  COLOR_PALETTE.cyan,
  COLOR_PALETTE.rose,
  COLOR_PALETTE.orange,
  COLOR_PALETTE.teal,
  COLOR_PALETTE.pink,
];

/**
 * Computes the SVG layout for a multi-column Sankey diagram with cubic bezier curves.
 */
export function computeSankeyLayout(
  sankeyData: SankeyData,
  width: number,
  height: number
): SankeyLayoutResult {
  if (!sankeyData || sankeyData.nodes.length === 0) {
    return { nodes: [], links: [], width, height };
  }

  const padding = {
    top: 40,
    bottom: 30,
    left: width < 640 ? 110 : 150,
    right: width < 640 ? 110 : 160,
  };

  const nodeWidth = 14;
  const minNodeHeight = 16;
  const nodeGap = 12;

  const numCols = sankeyData.columnLabels.length || 3;
  const availableWidth = width - padding.left - padding.right;
  const availableHeight = height - padding.top - padding.bottom;

  // Group nodes by column
  const cols: SankeyNode[][] = Array.from({ length: numCols }, () => []);
  sankeyData.nodes.forEach((n) => {
    if (n.column >= 0 && n.column < numCols) {
      cols[n.column].push({ ...n });
    }
  });

  // Calculate node position and height per column
  cols.forEach((colNodes, colIdx) => {
    const colX =
      numCols === 1
        ? width / 2
        : padding.left + (colIdx / (numCols - 1)) * availableWidth - nodeWidth / 2;

    const totalColValue = colNodes.reduce((acc, n) => acc + (n.value || 0), 0) || 1;
    const totalGaps = (colNodes.length - 1) * nodeGap;
    const usableH = Math.max(50, availableHeight - totalGaps);

    let currentY = padding.top;

    colNodes.forEach((node) => {
      const rawH = (node.value / totalColValue) * usableH;
      const h = Math.max(minNodeHeight, rawH);
      node.x = colX;
      node.y = currentY;
      node.width = nodeWidth;
      node.height = h;
      currentY += h + nodeGap;
    });

    // Re-center column if it doesn't take the full available height
    const actualColHeight = currentY - nodeGap - padding.top;
    if (actualColHeight < availableHeight) {
      const offset = (availableHeight - actualColHeight) / 2;
      colNodes.forEach((node) => {
        if (node.y !== undefined) node.y += offset;
      });
    }
  });

  const flatNodes = cols.flat();
  const nodeMap = new Map<string, SankeyNode>(flatNodes.map((n) => [n.id, n]));

  // Track cumulative link offsets for each node
  const outOffsets = new Map<string, number>();
  const inOffsets = new Map<string, number>();
  const totalOutMap = new Map<string, number>();
  const totalInMap = new Map<string, number>();

  // Pre-calculate sum of link values per node
  sankeyData.links.forEach((l) => {
    totalOutMap.set(l.source, (totalOutMap.get(l.source) || 0) + l.value);
    totalInMap.set(l.target, (totalInMap.get(l.target) || 0) + l.value);
  });

  const calculatedLinks: SankeyLink[] = sankeyData.links.map((link) => {
    const src = nodeMap.get(link.source);
    const tgt = nodeMap.get(link.target);

    if (!src || !tgt || src.x === undefined || src.y === undefined || tgt.x === undefined || tgt.y === undefined || !src.height || !tgt.height) {
      return { ...link };
    }

    const srcTotalOut = totalOutMap.get(link.source) || src.value || 1;
    const tgtTotalIn = totalInMap.get(link.target) || tgt.value || 1;

    const currentOut = outOffsets.get(link.source) || 0;
    const currentIn = inOffsets.get(link.target) || 0;

    const h0 = Math.max(2, (link.value / srcTotalOut) * src.height);
    const h1 = Math.max(2, (link.value / tgtTotalIn) * tgt.height);

    const y0 = src.y + currentOut;
    const y1 = tgt.y + currentIn;

    outOffsets.set(link.source, currentOut + h0);
    inOffsets.set(link.target, currentIn + h1);

    const x0 = src.x + src.width!;
    const x1 = tgt.x;
    const xi = (x0 + x1) / 2;

    // Smooth ribbon bezier path
    const path = `M ${x0},${y0} C ${xi},${y0} ${xi},${y1} ${x1},${y1} L ${x1},${y1 + h1} C ${xi},${y1 + h1} ${xi},${y0 + h0} ${x0},${y0 + h0} Z`;

    const gradientId = `sankey-grad-${link.source.replace(/[^a-zA-Z0-9]/g, "_")}-${link.target.replace(/[^a-zA-Z0-9]/g, "_")}`;

    return {
      ...link,
      path,
      x0,
      x1,
      y0,
      y1,
      h0,
      h1,
      sourceColor: src.color,
      targetColor: tgt.color,
      gradientId,
    };
  });

  return {
    nodes: flatNodes,
    links: calculatedLinks,
    width,
    height,
  };
}

// =========================================================================
// GENERADORES DE DATOS SANKEY PARA TRUCCO'S JEANS BI
// =========================================================================

/**
 * Vista 1: Flujo Comercial Integral (Canales de Venta ➔ Facturación Neta ➔ Líneas de Producto)
 */
export function generarSankeyFlujoComercial(
  rawVentas: FilaFactVentas[],
  catalogos?: { canales?: CatalogoItem[]; lineas?: CatalogoItem[] }
): SankeyData {
  const canalMap = new Map<number, string>((catalogos?.canales || []).map((c) => [c.id, c.nombre]));
  const lineaMap = new Map<number, string>((catalogos?.lineas || []).map((l) => [l.id, l.nombre]));

  const canalTotals = new Map<string, { value: number; units: number }>();
  const lineaTotals = new Map<string, { value: number; units: number }>();

  let totalGeneral = 0;
  let totalPrendas = 0;

  for (const r of rawVentas) {
    const val = Number(r.valor) || 0;
    const qty = Math.abs(Number(r.cantidad) || 0);

    const cNombre = (r.canal_id && canalMap.get(r.canal_id)) || (r as any).canal || "Canal General";
    const lNombre = (r.linea_id && lineaMap.get(r.linea_id)) || (r as any).linea || "Línea General";

    totalGeneral += val;
    totalPrendas += qty;

    const cObj = canalTotals.get(cNombre) || { value: 0, units: 0 };
    cObj.value += val;
    cObj.units += qty;
    canalTotals.set(cNombre, cObj);

    const lObj = lineaTotals.get(lNombre) || { value: 0, units: 0 };
    lObj.value += val;
    lObj.units += qty;
    lineaTotals.set(lNombre, lObj);
  }

  // Capa 0: Canales
  const canalesSorted = Array.from(canalTotals.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.value - a.value);

  // Capa 2: Top Líneas (Top 6 + Otras)
  const lineasSorted = Array.from(lineaTotals.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.value - a.value);

  const topLineas = lineasSorted.slice(0, 6);
  const otherLineas = lineasSorted.slice(6);
  const otherVal = otherLineas.reduce((acc, l) => acc + l.value, 0);
  const otherQty = otherLineas.reduce((acc, l) => acc + l.units, 0);

  const finalLineas = [...topLineas];
  if (otherVal > 0) {
    finalLineas.push({ name: "Otras Líneas", value: otherVal, units: otherQty });
  }

  const nodes: SankeyNode[] = [];
  const links: SankeyLink[] = [];

  // 1. Nodos de Canales (Columna 0)
  canalesSorted.forEach((c, idx) => {
    nodes.push({
      id: `canal_${idx}`,
      name: c.name,
      column: 0,
      value: Math.max(1, c.value),
      units: c.units,
      pctTotal: totalGeneral > 0 ? (c.value / totalGeneral) * 100 : 0,
      color: PALETA_NODOS[idx % PALETA_NODOS.length],
    });
  });

  // 2. Nodo Central: Facturación Neta (Columna 1)
  const centralId = "facturacion_neta_total";
  nodes.push({
    id: centralId,
    name: "Facturación Neta Total",
    column: 1,
    value: Math.max(1, totalGeneral),
    units: totalPrendas,
    pctTotal: 100,
    color: COLOR_PALETTE.indigo,
  });

  // 3. Nodos de Líneas (Columna 2)
  finalLineas.forEach((l, idx) => {
    nodes.push({
      id: `linea_${idx}`,
      name: l.name,
      column: 2,
      value: Math.max(1, l.value),
      units: l.units,
      pctTotal: totalGeneral > 0 ? (l.value / totalGeneral) * 100 : 0,
      color: PALETA_NODOS[(idx + 4) % PALETA_NODOS.length],
    });
  });

  // Links: Canales -> Central
  nodes
    .filter((n) => n.column === 0)
    .forEach((cNode) => {
      links.push({
        id: `${cNode.id}->${centralId}`,
        source: cNode.id,
        target: centralId,
        value: cNode.value,
        units: cNode.units,
        pctSource: 100,
        pctTarget: (cNode.value / (totalGeneral || 1)) * 100,
        pctTotal: cNode.pctTotal,
      });
    });

  // Links: Central -> Líneas
  nodes
    .filter((n) => n.column === 2)
    .forEach((lNode) => {
      links.push({
        id: `${centralId}->${lNode.id}`,
        source: centralId,
        target: lNode.id,
        value: lNode.value,
        units: lNode.units,
        pctSource: (lNode.value / (totalGeneral || 1)) * 100,
        pctTarget: 100,
        pctTotal: lNode.pctTotal,
      });
    });

  const top3Sum = canalesSorted.slice(0, 3).reduce((acc, c) => acc + c.value, 0);
  const concentrationTop3 = totalGeneral > 0 ? (top3Sum / totalGeneral) * 100 : 0;

  return {
    id: "flujo_comercial_lineas",
    title: "Flujo Integral de Facturación: Canales ➔ Ingresos ➔ Líneas",
    subtitle: "Muestra cómo fluye el capital recaudado desde cada canal hacia las categorías y líneas de vestuario",
    columnLabels: ["Canales de Comercialización", "Facturación Neta", "Líneas de Producto"],
    nodes,
    links,
    totalValue: totalGeneral,
    totalUnits: totalPrendas,
    topSource: canalesSorted[0]
      ? { name: canalesSorted[0].name, value: canalesSorted[0].value, pct: (canalesSorted[0].value / (totalGeneral || 1)) * 100 }
      : undefined,
    topDestination: finalLineas[0]
      ? { name: finalLineas[0].name, value: finalLineas[0].value, pct: (finalLineas[0].value / (totalGeneral || 1)) * 100 }
      : undefined,
    concentrationTop3,
  };
}

/**
 * Vista 2: Flujo Territorial / Geográfico (Canales ➔ Facturación ➔ Zonas Geográficas)
 */
export function generarSankeyFlujoTerritorial(
  rawVentas: FilaFactVentas[],
  catalogos?: { canales?: CatalogoItem[]; zonas?: CatalogoItem[] }
): SankeyData {
  const canalMap = new Map<number, string>((catalogos?.canales || []).map((c) => [c.id, c.nombre]));
  const zonaMap = new Map<number, string>((catalogos?.zonas || []).map((z) => [z.id, z.nombre]));

  const canalTotals = new Map<string, { value: number; units: number }>();
  const zonaTotals = new Map<string, { value: number; units: number }>();

  let totalGeneral = 0;
  let totalPrendas = 0;

  for (const r of rawVentas) {
    const val = Number(r.valor) || 0;
    const qty = Math.abs(Number(r.cantidad) || 0);

    const cNombre = (r.canal_id && canalMap.get(r.canal_id)) || (r as any).canal || "Canal General";
    const zId = r.zona_id || r.zona_colombia_id;
    const zNombre = (zId && zonaMap.get(zId)) || (r as any).zona || "Zona Nacional";

    totalGeneral += val;
    totalPrendas += qty;

    const cObj = canalTotals.get(cNombre) || { value: 0, units: 0 };
    cObj.value += val;
    cObj.units += qty;
    canalTotals.set(cNombre, cObj);

    const zObj = zonaTotals.get(zNombre) || { value: 0, units: 0 };
    zObj.value += val;
    zObj.units += qty;
    zonaTotals.set(zNombre, zObj);
  }

  const canalesSorted = Array.from(canalTotals.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.value - a.value);

  const zonasSorted = Array.from(zonaTotals.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.value - a.value);

  const topZonas = zonasSorted.slice(0, 6);
  const otherZonas = zonasSorted.slice(6);
  const otherVal = otherZonas.reduce((acc, z) => acc + z.value, 0);
  const otherQty = otherZonas.reduce((acc, z) => acc + z.units, 0);

  const finalZonas = [...topZonas];
  if (otherVal > 0) {
    finalZonas.push({ name: "Otras Zonas", value: otherVal, units: otherQty });
  }

  const nodes: SankeyNode[] = [];
  const links: SankeyLink[] = [];

  // Columna 0: Canales
  canalesSorted.forEach((c, idx) => {
    nodes.push({
      id: `canal_geo_${idx}`,
      name: c.name,
      column: 0,
      value: Math.max(1, c.value),
      units: c.units,
      pctTotal: totalGeneral > 0 ? (c.value / totalGeneral) * 100 : 0,
      color: PALETA_NODOS[idx % PALETA_NODOS.length],
    });
  });

  // Columna 1: Central
  const centralId = "recaudo_nacional_total";
  nodes.push({
    id: centralId,
    name: "Recaudo Nacional Consolidado",
    column: 1,
    value: Math.max(1, totalGeneral),
    units: totalPrendas,
    pctTotal: 100,
    color: COLOR_PALETTE.blue,
  });

  // Columna 2: Zonas
  finalZonas.forEach((z, idx) => {
    nodes.push({
      id: `zona_geo_${idx}`,
      name: z.name,
      column: 2,
      value: Math.max(1, z.value),
      units: z.units,
      pctTotal: totalGeneral > 0 ? (z.value / totalGeneral) * 100 : 0,
      color: PALETA_NODOS[(idx + 2) % PALETA_NODOS.length],
    });
  });

  nodes
    .filter((n) => n.column === 0)
    .forEach((cNode) => {
      links.push({
        id: `${cNode.id}->${centralId}`,
        source: cNode.id,
        target: centralId,
        value: cNode.value,
        units: cNode.units,
        pctSource: 100,
        pctTarget: (cNode.value / (totalGeneral || 1)) * 100,
        pctTotal: cNode.pctTotal,
      });
    });

  nodes
    .filter((n) => n.column === 2)
    .forEach((zNode) => {
      links.push({
        id: `${centralId}->${zNode.id}`,
        source: centralId,
        target: zNode.id,
        value: zNode.value,
        units: zNode.units,
        pctSource: (zNode.value / (totalGeneral || 1)) * 100,
        pctTarget: 100,
        pctTotal: zNode.pctTotal,
      });
    });

  return {
    id: "flujo_comercial_zonas",
    title: "Flujo Territorial: Canales ➔ Facturación ➔ Zonas Geográficas",
    subtitle: "Rastreo de distribución geográfica de las ventas generadas por cada canal en el país",
    columnLabels: ["Canales de Comercialización", "Recaudo Nacional", "Zonas y Departamentos"],
    nodes,
    links,
    totalValue: totalGeneral,
    totalUnits: totalPrendas,
    topSource: canalesSorted[0]
      ? { name: canalesSorted[0].name, value: canalesSorted[0].value, pct: (canalesSorted[0].value / (totalGeneral || 1)) * 100 }
      : undefined,
    topDestination: finalZonas[0]
      ? { name: finalZonas[0].name, value: finalZonas[0].value, pct: (finalZonas[0].value / (totalGeneral || 1)) * 100 }
      : undefined,
    concentrationTop3: 0,
  };
}

/**
 * Vista 3: Flujo Cascada Financiero (Venta Bruta ➔ Devoluciones vs Venta Neta ➔ Canales)
 */
export function generarSankeyFlujoCascada(
  rawVentas: FilaFactVentas[],
  catalogos?: { canales?: CatalogoItem[] }
): SankeyData {
  const canalMap = new Map<number, string>((catalogos?.canales || []).map((c) => [c.id, c.nombre]));

  let ventaBruta = 0;
  let devoluciones = 0;
  let ventaNeta = 0;
  let totalPrendas = 0;

  const canalNeto = new Map<string, { value: number; units: number }>();

  for (const r of rawVentas) {
    const val = Number(r.valor) || 0;
    const qty = Math.abs(Number(r.cantidad) || 0);
    const cNombre = (r.canal_id && canalMap.get(r.canal_id)) || (r as any).canal || "Canal General";

    totalPrendas += qty;

    if (val < 0) {
      devoluciones += Math.abs(val);
    } else {
      ventaBruta += val;
    }

    const cObj = canalNeto.get(cNombre) || { value: 0, units: 0 };
    cObj.value += val;
    cObj.units += qty;
    canalNeto.set(cNombre, cObj);
  }

  ventaNeta = ventaBruta - devoluciones;
  if (ventaNeta <= 0) ventaNeta = ventaBruta;

  const canalesSorted = Array.from(canalNeto.entries())
    .map(([name, data]) => ({ name, ...data }))
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value);

  const nodes: SankeyNode[] = [
    // Columna 0: Venta Bruta
    {
      id: "venta_bruta_node",
      name: "Facturación Bruta (100%)",
      column: 0,
      value: Math.max(1, ventaBruta),
      units: totalPrendas,
      pctTotal: 100,
      color: COLOR_PALETTE.blue,
    },
    // Columna 1: Venta Neta vs Devoluciones
    {
      id: "venta_neta_node",
      name: "Venta Neta Efectiva",
      column: 1,
      value: Math.max(1, ventaNeta),
      units: totalPrendas,
      pctTotal: ventaBruta > 0 ? (ventaNeta / ventaBruta) * 100 : 100,
      color: COLOR_PALETTE.emerald,
    },
    {
      id: "devoluciones_node",
      name: "Devoluciones / Notas Crédito",
      column: 1,
      value: Math.max(1, devoluciones),
      units: 0,
      pctTotal: ventaBruta > 0 ? (devoluciones / ventaBruta) * 100 : 0,
      color: COLOR_PALETTE.rose,
    },
  ];

  // Columna 2: Canales de Venta
  canalesSorted.forEach((c, idx) => {
    nodes.push({
      id: `canal_cascada_${idx}`,
      name: c.name,
      column: 2,
      value: Math.max(1, c.value),
      units: c.units,
      pctTotal: ventaNeta > 0 ? (c.value / ventaNeta) * 100 : 0,
      color: PALETA_NODOS[idx % PALETA_NODOS.length],
    });
  });

  const links: SankeyLink[] = [
    // Bruta -> Neta
    {
      id: "bruta->neta",
      source: "venta_bruta_node",
      target: "venta_neta_node",
      value: ventaNeta,
      units: totalPrendas,
      pctSource: ventaBruta > 0 ? (ventaNeta / ventaBruta) * 100 : 100,
      pctTarget: 100,
      pctTotal: 100,
    },
    // Bruta -> Devoluciones
    {
      id: "bruta->dev",
      source: "venta_bruta_node",
      target: "devoluciones_node",
      value: Math.max(1, devoluciones),
      units: 0,
      pctSource: ventaBruta > 0 ? (devoluciones / ventaBruta) * 100 : 0,
      pctTarget: 100,
      pctTotal: (devoluciones / (ventaBruta || 1)) * 100,
    },
  ];

  // Neta -> Canales
  nodes
    .filter((n) => n.column === 2)
    .forEach((cNode) => {
      links.push({
        id: `neta->${cNode.id}`,
        source: "venta_neta_node",
        target: cNode.id,
        value: cNode.value,
        units: cNode.units,
        pctSource: (cNode.value / (ventaNeta || 1)) * 100,
        pctTarget: 100,
        pctTotal: cNode.pctTotal,
      });
    });

  return {
    id: "flujo_cascada_financiera",
    title: "Flujo Cascada Financiero: Venta Bruta ➔ Deducciones/Devoluciones ➔ Canales",
    subtitle: "Descomposición contable del margen comercial desde la facturación bruta hasta el aporte neto por canal",
    columnLabels: ["Facturación Bruta", "Estado Comercial", "Canales de Salida"],
    nodes,
    links,
    totalValue: ventaNeta,
    totalUnits: totalPrendas,
    topSource: { name: "Facturación Bruta", value: ventaBruta, pct: 100 },
    topDestination: canalesSorted[0]
      ? { name: canalesSorted[0].name, value: canalesSorted[0].value, pct: (canalesSorted[0].value / (ventaNeta || 1)) * 100 }
      : undefined,
  };
}

/**
 * Vista 4: Flujo de Portafolio Pareto ABC (Clases A, B, C ➔ Catálogo ➔ Líneas)
 */
export function generarSankeyFlujoPareto(
  d6: any,
  catalogos?: { lineas?: CatalogoItem[] }
): SankeyData {
  const todasRef = d6?.todasReferencias || [];

  let totalGeneral = 0;
  let totalPrendas = 0;

  const lineaMap = new Map<string, { value: number; units: number }>();
  const claseTotals = {
    A: { value: 0, units: 0, skus: 0 },
    B: { value: 0, units: 0, skus: 0 },
    C: { value: 0, units: 0, skus: 0 },
  };

  todasRef.forEach((r: any) => {
    const val = r.ventaNeta || 0;
    const qty = r.unidades || 0;
    const clase = (r.clasificacionABC as "A" | "B" | "C") || "C";
    const linea = r.linea || "Otras Líneas";

    totalGeneral += val;
    totalPrendas += qty;

    if (claseTotals[clase]) {
      claseTotals[clase].value += val;
      claseTotals[clase].units += qty;
      claseTotals[clase].skus += 1;
    }

    const lObj = lineaMap.get(linea) || { value: 0, units: 0 };
    lObj.value += val;
    lObj.units += qty;
    lineaMap.set(linea, lObj);
  });

  const lineasSorted = Array.from(lineaMap.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.value - a.value);

  const topLineas = lineasSorted.slice(0, 6);
  const otherLineas = lineasSorted.slice(6);
  const otherVal = otherLineas.reduce((acc, l) => acc + l.value, 0);
  const otherQty = otherLineas.reduce((acc, l) => acc + l.units, 0);

  const finalLineas = [...topLineas];
  if (otherVal > 0) {
    finalLineas.push({ name: "Otras Líneas", value: otherVal, units: otherQty });
  }

  const nodes: SankeyNode[] = [
    // Columna 0: Pareto ABC
    {
      id: "clase_A",
      name: "Clase A (Motor 80% Ventas)",
      column: 0,
      value: Math.max(1, claseTotals.A.value),
      units: claseTotals.A.units,
      pctTotal: totalGeneral > 0 ? (claseTotals.A.value / totalGeneral) * 100 : 80,
      color: COLOR_PALETTE.emerald,
    },
    {
      id: "clase_B",
      name: "Clase B (Rotación 15% Ventas)",
      column: 0,
      value: Math.max(1, claseTotals.B.value),
      units: claseTotals.B.units,
      pctTotal: totalGeneral > 0 ? (claseTotals.B.value / totalGeneral) * 100 : 15,
      color: COLOR_PALETTE.amber,
    },
    {
      id: "clase_C",
      name: "Clase C (Cola Larga 5% Ventas)",
      column: 0,
      value: Math.max(1, claseTotals.C.value),
      units: claseTotals.C.units,
      pctTotal: totalGeneral > 0 ? (claseTotals.C.value / totalGeneral) * 100 : 5,
      color: COLOR_PALETTE.slate,
    },
    // Columna 1: Catálogo Consolidado
    {
      id: "catalogo_activo",
      name: "Catálogo Activo de Prendas",
      column: 1,
      value: Math.max(1, totalGeneral),
      units: totalPrendas,
      pctTotal: 100,
      color: COLOR_PALETTE.purple,
    },
  ];

  // Columna 2: Líneas
  finalLineas.forEach((l, idx) => {
    nodes.push({
      id: `pareto_linea_${idx}`,
      name: l.name,
      column: 2,
      value: Math.max(1, l.value),
      units: l.units,
      pctTotal: totalGeneral > 0 ? (l.value / totalGeneral) * 100 : 0,
      color: PALETA_NODOS[(idx + 1) % PALETA_NODOS.length],
    });
  });

  const links: SankeyLink[] = [];

  // Clases -> Catálogo
  ["clase_A", "clase_B", "clase_C"].forEach((cId) => {
    const cNode = nodes.find((n) => n.id === cId);
    if (cNode) {
      links.push({
        id: `${cId}->catalogo_activo`,
        source: cId,
        target: "catalogo_activo",
        value: cNode.value,
        units: cNode.units,
        pctSource: 100,
        pctTarget: (cNode.value / (totalGeneral || 1)) * 100,
        pctTotal: cNode.pctTotal,
      });
    }
  });

  // Catálogo -> Líneas
  nodes
    .filter((n) => n.column === 2)
    .forEach((lNode) => {
      links.push({
        id: `catalogo_activo->${lNode.id}`,
        source: "catalogo_activo",
        target: lNode.id,
        value: lNode.value,
        units: lNode.units,
        pctSource: (lNode.value / (totalGeneral || 1)) * 100,
        pctTarget: 100,
        pctTotal: lNode.pctTotal,
      });
    });

  return {
    id: "flujo_pareto_abc",
    title: "Flujo de Mix y Pareto ABC: Clases ABC ➔ Catálogo ➔ Líneas de Producto",
    subtitle: "Rastreo de cómo las referencias estrella Clase A impulsan cada una de las líneas del catálogo",
    columnLabels: ["Segmentación Pareto ABC", "Catálogo Comercial", "Líneas de Vestuario"],
    nodes,
    links,
    totalValue: totalGeneral,
    totalUnits: totalPrendas,
    topSource: { name: "Clase A", value: claseTotals.A.value, pct: (claseTotals.A.value / (totalGeneral || 1)) * 100 },
    topDestination: finalLineas[0]
      ? { name: finalLineas[0].name, value: finalLineas[0].value, pct: (finalLineas[0].value / (totalGeneral || 1)) * 100 }
      : undefined,
  };
}

/**
 * Vista 5: Flujo E-Commerce y Canales Digitales (Plataformas Web ➔ Facturación Digital ➔ Líneas)
 */
export function generarSankeyFlujoDigital(
  d3: any
): SankeyData {
  const vShopify = d3?.kpis.ventaTiendaVirtual || 0;
  const vRedes = d3?.kpis.ventaRedesSociales || 0;
  const totalDigital = d3?.kpis.ventaDigitalTotal || vShopify + vRedes || 1;
  const totalUnidades = d3?.kpis.unidadesDigitales || 0;

  const lineasDigital = d3?.lineasDigital || [];
  const topLines = lineasDigital.slice(0, 5);
  const otherLines = lineasDigital.slice(5);
  const otherVal = otherLines.reduce((acc: number, l: any) => acc + (l.venta || 0), 0);
  const otherQty = otherLines.reduce((acc: number, l: any) => acc + (l.unidades || 0), 0);

  const finalLineas = [...topLines];
  if (otherVal > 0) {
    finalLineas.push({ linea: "Otras Categorías", venta: otherVal, unidades: otherQty });
  }

  const nodes: SankeyNode[] = [
    // Columna 0: Plataformas
    {
      id: "dig_shopify",
      name: "Tienda Virtual (Shopify)",
      column: 0,
      value: Math.max(1, vShopify),
      units: d3?.kpis.unidadesTiendaVirtual || 0,
      pctTotal: totalDigital > 0 ? (vShopify / totalDigital) * 100 : 0,
      color: COLOR_PALETTE.blue,
    },
    {
      id: "dig_redes",
      name: "Redes Sociales (WhatsApp)",
      column: 0,
      value: Math.max(1, vRedes),
      units: d3?.kpis.unidadesRedesSociales || 0,
      pctTotal: totalDigital > 0 ? (vRedes / totalDigital) * 100 : 0,
      color: COLOR_PALETTE.emerald,
    },
    // Columna 1: Central
    {
      id: "dig_central",
      name: "Ecosistema Digital Consolidado",
      column: 1,
      value: Math.max(1, totalDigital),
      units: totalUnidades,
      pctTotal: 100,
      color: COLOR_PALETTE.indigo,
    },
  ];

  // Columna 2: Líneas Online
  finalLineas.forEach((l: any, idx: number) => {
    nodes.push({
      id: `dig_linea_${idx}`,
      name: l.linea,
      column: 2,
      value: Math.max(1, l.venta || 1),
      units: l.unidades || 0,
      pctTotal: totalDigital > 0 ? ((l.venta || 0) / totalDigital) * 100 : 0,
      color: PALETA_NODOS[(idx + 3) % PALETA_NODOS.length],
    });
  });

  const links: SankeyLink[] = [
    {
      id: "dig_shopify->dig_central",
      source: "dig_shopify",
      target: "dig_central",
      value: Math.max(1, vShopify),
      units: d3?.kpis.unidadesTiendaVirtual || 0,
      pctSource: 100,
      pctTarget: (vShopify / totalDigital) * 100,
      pctTotal: (vShopify / totalDigital) * 100,
    },
    {
      id: "dig_redes->dig_central",
      source: "dig_redes",
      target: "dig_central",
      value: Math.max(1, vRedes),
      units: d3?.kpis.unidadesRedesSociales || 0,
      pctSource: 100,
      pctTarget: (vRedes / totalDigital) * 100,
      pctTotal: (vRedes / totalDigital) * 100,
    },
  ];

  nodes
    .filter((n) => n.column === 2)
    .forEach((lNode) => {
      links.push({
        id: `dig_central->${lNode.id}`,
        source: "dig_central",
        target: lNode.id,
        value: lNode.value,
        units: lNode.units,
        pctSource: (lNode.value / totalDigital) * 100,
        pctTarget: 100,
        pctTotal: lNode.pctTotal,
      });
    });

  return {
    id: "flujo_digital_ecommerce",
    title: "Flujo Digital y Social Commerce: Plataformas ➔ Facturación ➔ Categorías",
    subtitle: "Rendimiento y origen de la demanda online por canal directo y categorías de producto",
    columnLabels: ["Plataformas Digitales", "Facturación Digital Total", "Categorías Demandadas"],
    nodes,
    links,
    totalValue: totalDigital,
    totalUnits: totalUnidades,
    topSource: vShopify >= vRedes ? { name: "Tienda Virtual", value: vShopify, pct: (vShopify / totalDigital) * 100 } : { name: "Redes Sociales", value: vRedes, pct: (vRedes / totalDigital) * 100 },
    topDestination: finalLineas[0] ? { name: finalLineas[0].linea, value: finalLineas[0].venta, pct: ((finalLineas[0].venta || 0) / totalDigital) * 100 } : undefined,
  };
}
