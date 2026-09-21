import { FilaFactVentas, FiltrosBI, CatalogosDisponibles } from "./ventas-api";
import { ResumenInventarioReal, ReferenciaStockAgrupada } from "./inventario-api";

export interface ComboEstrategico {
  id: string;
  titulo: string;
  descripcion: string;
  productoPrincipal: {
    sku: string;
    nombre: string;
    linea: string;
    precio: number;
    clase: "A" | "B" | "C";
    unidades: number;
    stockDisponible?: number;
    estadoStock?: "disponible_alto" | "disponible_medio" | "stock_bajo" | "agotado";
    imageUrl?: string | null;
    bodega?: string;
  };
  productoComplemento: {
    sku: string;
    nombre: string;
    linea: string;
    precio: number;
    clase: "A" | "B" | "C";
    unidades: number;
    stockDisponible?: number;
    estadoStock?: "disponible_alto" | "disponible_medio" | "stock_bajo" | "agotado";
    imageUrl?: string | null;
    bodega?: string;
  };
  descuentoSugeridoPct: number;
  precioSumaRegular: number;
  precioComboSugerido: number;
  incrementoTicketEstimadoPct: number;
  beneficioComercial: string;
  argumentoVenta: string;
  origenEstrategia?: "ventas_historicas" | "desbloqueo_inventario" | "cross_selling" | "bestsellers";
}

export interface EstrategiaZonaItem {
  zona: string;
  ventaActual: number;
  ventaAnterior: number;
  crecimientoPct: number;
  tipo: "lider" | "oportunidad" | "critica";
  diagnostico: string;
  accionRecomendada: string;
  ofertaSugerida: string;
  skusMasVendidos: string[];
}

export interface EstrategiaABCItem {
  clase: "A" | "B" | "C";
  totalVentas: number;
  porcentajeVenta: number;
  totalSkus: number;
  porcentajeSkus: number;
  diagnostico: string;
  estrategiaPrincipal: string;
  itemsDestacados: {
    sku: string;
    nombre: string;
    linea: string;
    unidades: number;
    valor: number;
    precioPromedio: number;
    recomendacion: string;
    stockDisponible?: number;
    imageUrl?: string | null;
    estadoStock?: "disponible_alto" | "disponible_medio" | "stock_bajo" | "agotado";
    bodega?: string;
  }[];
}

export interface GuionComercial {
  id: string;
  tipo: "combo" | "upsell" | "reactivacion_zona" | "liquidacion_c" | "fidelizacion";
  titulo: string;
  etiqueta: string;
  descripcion: string;
  destinatario: string;
  mensajeWhatsApp: string;
  beneficioCliente: string;
}

export interface DiagnosticoMentor {
  asesorNombre: string;
  periodoNombre: string;
  kpis: {
    ventaActual: number;
    ventaMesAnterior: number;
    ventaAnioAnterior: number;
    crecimientoMoMPct: number;
    crecimientoYoYPct: number;
    ticketPromedio: number;
    ticketPromedioAnterior: number;
    precioPromedioPrenda: number;
    unidadesVendidas: number;
    transacciones: number;
    saludComercial: "Excelente" | "Crecimiento" | "Estable" | "Atención Requerida" | "Crítico";
    puntuacionRendimiento: number;
    mensajeMotivacional: string;
  };
  combos: ComboEstrategico[];
  zonas: EstrategiaZonaItem[];
  abc: EstrategiaABCItem[];
  guiones: GuionComercial[];
  alertasInmediatas: {
    tipo: "success" | "warning" | "info" | "urgent";
    mensaje: string;
    accion: string;
  }[];
}

function formatoMoneda(val: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(val || 0);
}

export function calcularDiagnosticoMentor(
  ventasActuales: FilaFactVentas[],
  filtros: FiltrosBI,
  catalogos?: CatalogosDisponibles,
  ventasYoY?: FilaFactVentas[],
  ventasHistoricasRecientes?: FilaFactVentas[],
  resumenInventario?: ResumenInventarioReal
): DiagnosticoMentor {
  const vendedorMap = new Map<number, string>((catalogos?.vendedores || []).map((v) => [v.id, v.nombre]));
  const lineaMap = new Map<number, string>((catalogos?.lineas || []).map((l) => [l.id, l.nombre]));
  const zonaMap = new Map<number, string>((catalogos?.zonas || []).map((z) => [z.id, z.nombre]));

  // Helper para buscar información de inventario real por SKU / Referencia
  const buscarStockRef = (skuOrRef: string): ReferenciaStockAgrupada | undefined => {
    if (!resumenInventario || !resumenInventario.mapaPorReferencia) return undefined;
    const clean = (skuOrRef || "").trim().toUpperCase();
    if (!clean) return undefined;

    // 1. Coincidencia exacta
    if (resumenInventario.mapaPorReferencia.has(clean)) {
      return resumenInventario.mapaPorReferencia.get(clean);
    }
    // 2. Coincidencia por subcadena / prefijo
    for (const [refKey, itemStock] of resumenInventario.mapaPorReferencia.entries()) {
      if (clean.includes(refKey) || refKey.includes(clean)) {
        return itemStock;
      }
    }
    return undefined;
  };

  // Identificar el Asesor Comercial
  let asesorNombre = "Consolidado Equipo Comercial";
  if (filtros.vendedor_id) {
    const vId = Number(filtros.vendedor_id);
    if (!isNaN(vId) && vendedorMap.has(vId)) {
      asesorNombre = vendedorMap.get(vId)!;
    } else {
      const matchV = (catalogos?.vendedores || []).find((v) => String(v.id) === String(filtros.vendedor_id));
      if (matchV) asesorNombre = matchV.nombre;
    }
  }

  const periodoNombre = filtros.mes && filtros.anio
    ? `${["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"][filtros.mes - 1]} ${filtros.anio}`
    : filtros.anio
    ? `Año ${filtros.anio}`
    : "Periodo General";

  // 1. Análisis de Ventas Actuales
  let ventaActual = 0;
  let unidadesActual = 0;
  const transaccionesActualSet = new Set<string>();
  const refMap = new Map<string, { sku: string; nombre: string; linea: string; venta: number; unidades: number }>();
  const zonaMapActual = new Map<string, { venta: number; unidades: number; skus: Map<string, number> }>();
  const mesActualMap = new Map<number, number>();

  for (const r of ventasActuales) {
    const v = Number(r.valor || 0);
    const cant = Math.round(Number(r.cantidad || 0));
    const rawSku = (r.sku || r.prenda_hgi || "").trim();
    const sku = rawSku || "REF-GRAL";
    const prodNom = (r.producto || r.prenda_hgi || sku).trim();
    const lNom = (r.linea_id ? lineaMap.get(r.linea_id) : "") || "Confección General";
    const zNom = (r.zona_id ? zonaMap.get(r.zona_id) : "") || (r.zona_colombia_id ? zonaMap.get(r.zona_colombia_id) : "") || "Zona Principal";

    let m = Number(r.mes);
    if ((!m || isNaN(m)) && r.fecha) m = parseInt(String(r.fecha).slice(5, 7), 10);
    if (!m || isNaN(m)) m = 1;

    ventaActual += v;
    unidadesActual += cant;
    if (r.transaccion) transaccionesActualSet.add(String(r.transaccion));
    mesActualMap.set(m, (mesActualMap.get(m) || 0) + v);

    // Referencias
    const prevR = refMap.get(sku) || { sku, nombre: prodNom, linea: lNom, venta: 0, unidades: 0 };
    prevR.venta += v;
    prevR.unidades += cant;
    refMap.set(sku, prevR);

    // Zonas
    if (!zonaMapActual.has(zNom)) {
      zonaMapActual.set(zNom, { venta: 0, unidades: 0, skus: new Map() });
    }
    const currZ = zonaMapActual.get(zNom)!;
    currZ.venta += v;
    currZ.unidades += cant;
    currZ.skus.set(sku, (currZ.skus.get(sku) || 0) + cant);
  }

  // 2. Análisis del Año Anterior (YoY)
  let ventaAnioAnterior = 0;
  let unidadesAnioAnterior = 0;
  const transaccionesAntSet = new Set<string>();
  const zonaMapYoY = new Map<string, { venta: number; unidades: number }>();

  if (ventasYoY && ventasYoY.length > 0) {
    for (const r of ventasYoY) {
      const v = Number(r.valor || 0);
      const cant = Math.round(Number(r.cantidad || 0));
      const zNom = (r.zona_id ? zonaMap.get(r.zona_id) : "") || (r.zona_colombia_id ? zonaMap.get(r.zona_colombia_id) : "") || "Zona Principal";

      ventaAnioAnterior += v;
      unidadesAnioAnterior += cant;
      if (r.transaccion) transaccionesAntSet.add(String(r.transaccion));

      const prevZ = zonaMapYoY.get(zNom) || { venta: 0, unidades: 0 };
      prevZ.venta += v;
      prevZ.unidades += cant;
      zonaMapYoY.set(zNom, prevZ);
    }
  }

  // 3. Análisis de Mes Anterior / Histórico Reciente (MoM)
  let ventaMesAnterior = 0;
  if (filtros.mes && filtros.mes > 1 && mesActualMap.has(filtros.mes - 1)) {
    ventaMesAnterior = mesActualMap.get(filtros.mes - 1) || 0;
  } else if (ventasHistoricasRecientes && ventasHistoricasRecientes.length > 0) {
    ventaMesAnterior = ventasHistoricasRecientes.reduce((sum, r) => sum + Number(r.valor || 0), 0);
  } else if (ventaAnioAnterior > 0) {
    ventaMesAnterior = Math.round(ventaAnioAnterior / (filtros.mes || 1));
  } else {
    ventaMesAnterior = Math.round(ventaActual * 0.9);
  }

  const transacciones = transaccionesActualSet.size || Math.max(1, Math.round(unidadesActual / 4));
  const transaccionesAnt = transaccionesAntSet.size || Math.max(1, Math.round(unidadesAnioAnterior / 4));
  const ticketPromedio = transacciones > 0 ? Math.round(ventaActual / transacciones) : 0;
  const ticketPromedioAnterior = transaccionesAnt > 0 ? Math.round(ventaAnioAnterior / transaccionesAnt) : 0;
  const precioPromedioPrenda = unidadesActual > 0 ? Math.round(ventaActual / unidadesActual) : 0;

  const crecimientoMoMPct = ventaMesAnterior > 0
    ? Math.round(((ventaActual - ventaMesAnterior) / ventaMesAnterior) * 1000) / 10
    : 0;

  const crecimientoYoYPct = ventaAnioAnterior > 0
    ? Math.round(((ventaActual - ventaAnioAnterior) / ventaAnioAnterior) * 1000) / 10
    : 0;

  // Clasificación de Salud Comercial
  let saludComercial: DiagnosticoMentor["kpis"]["saludComercial"] = "Estable";
  let puntuacionRendimiento = 70;
  let mensajeMotivacional = "Buen ritmo comercial. Hay oportunidades clave para optimizar el mix de venta.";

  if (crecimientoYoYPct >= 15 || crecimientoMoMPct >= 12) {
    saludComercial = "Excelente";
    puntuacionRendimiento = 95;
    mensajeMotivacional = "¡Excelente tracción comercial! Tu impulso está por encima del promedio. Momento ideal para cerrar clientes clave con preventas de nuevas colecciones.";
  } else if (crecimientoYoYPct >= 5 || crecimientoMoMPct >= 5) {
    saludComercial = "Crecimiento";
    puntuacionRendimiento = 82;
    mensajeMotivacional = "Crecimiento sostenido. Si aplicas los combos sugeridos y aumentas 1.5 prendas por pedido, puedes acelerar a doble dígito.";
  } else if (crecimientoYoYPct < -10 || crecimientoMoMPct < -10) {
    saludComercial = "Atención Requerida";
    puntuacionRendimiento = 52;
    mensajeMotivacional = "Detectamos una desaceleración frente a periodos previos. El mentor ha preparado un plan de rescate de zonas y paquetes de volumen para revertir la tendencia.";
  } else if (ventaActual === 0) {
    saludComercial = "Crítico";
    puntuacionRendimiento = 20;
    mensajeMotivacional = "Sin registros significativos en el periodo. Revisa la cartera de clientes inactivos y activa ofertas de bienvenida inmediata.";
  }

  // =========================================================================
  // 4. CLASIFICACIÓN ABC DE PRODUCTOS (ENRIQUECIDA CON STOCK REAL)
  // =========================================================================
  const allRefs = Array.from(refMap.values()).sort((a, b) => b.venta - a.venta);
  const totalVentaRefs = allRefs.reduce((sum, r) => sum + r.venta, 0) || 1;
  const totalRefsCount = allRefs.length || 1;

  let acumV = 0;
  const refsA: typeof allRefs = [];
  const refsB: typeof allRefs = [];
  const refsC: typeof allRefs = [];

  for (const r of allRefs) {
    acumV += r.venta;
    const share = acumV / totalVentaRefs;
    if (share <= 0.80 || refsA.length < 3) {
      refsA.push(r);
    } else if (share <= 0.95 || refsB.length < 3) {
      refsB.push(r);
    } else {
      refsC.push(r);
    }
  }

  const mapItemDestacado = (r: typeof allRefs[0], clase: "A" | "B" | "C", recomendacionDefecto: string) => {
    const stockInfo = buscarStockRef(r.sku);
    let recomendacion = recomendacionDefecto;

    if (stockInfo) {
      if (stockInfo.estadoStock === "agotado") {
        recomendacion = `⚠️ Sin stock en bodega. Programar pedido a producción o sugerir sustituto.`;
      } else if (stockInfo.estadoStock === "stock_bajo") {
        recomendacion = `⚡ Quedan solo ${stockInfo.saldoTotal} unds en bodega (${stockInfo.bodegas.join(", ")}). Priorizar clientes premium.`;
      } else if (stockInfo.estadoStock === "disponible_alto") {
        recomendacion = `🟢 ${stockInfo.saldoTotal} unds disponibles en bodega (${stockInfo.bodegas.join(", ")}). Despacho 24h garantizado.`;
      }
    }

    return {
      sku: r.sku,
      nombre: stockInfo?.descripcion || r.nombre,
      linea: r.linea,
      unidades: r.unidades,
      valor: r.venta,
      precioPromedio: r.unidades > 0 ? Math.round(r.venta / r.unidades) : stockInfo?.pvm || 0,
      recomendacion,
      stockDisponible: stockInfo?.saldoTotal,
      imageUrl: stockInfo?.image_url || null,
      estadoStock: stockInfo?.estadoStock,
      bodega: stockInfo?.bodegas.join(", "),
    };
  };

  const abc: EstrategiaABCItem[] = [
    {
      clase: "A",
      totalVentas: refsA.reduce((sum, r) => sum + r.venta, 0),
      porcentajeVenta: Math.round((refsA.reduce((sum, r) => sum + r.venta, 0) / totalVentaRefs) * 1000) / 10,
      totalSkus: refsA.length,
      porcentajeSkus: Math.round((refsA.length / totalRefsCount) * 1000) / 10,
      diagnostico: `Tus ${refsA.length} productos estrella generan el ${Math.round((refsA.reduce((sum, r) => sum + r.venta, 0) / totalVentaRefs) * 100)}% de tus ingresos.`,
      estrategiaPrincipal: "Garantizar disponibilidad, ofrecer reposición programada cada 15 días y usar como producto gancho para abrir nuevos pedidos.",
      itemsDestacados: refsA.slice(0, 5).map((r) => mapItemDestacado(r, "A", "Producto Top: Mantener siempre en el pedido inicial de cada cliente.")),
    },
    {
      clase: "B",
      totalVentas: refsB.reduce((sum, r) => sum + r.venta, 0),
      porcentajeVenta: Math.round((refsB.reduce((sum, r) => sum + r.venta, 0) / totalVentaRefs) * 1000) / 10,
      totalSkus: refsB.length,
      porcentajeSkus: Math.round((refsB.length / totalRefsCount) * 1000) / 10,
      diagnostico: "Referencias de rotación media y catálogo complementario.",
      estrategiaPrincipal: "Ofrecer como Cross-Selling directo cada vez que el cliente pida un producto Clase A.",
      itemsDestacados: refsB.slice(0, 5).map((r) => mapItemDestacado(r, "B", "Cross-Sell: Añadir al pedido por solo un diferencial pequeño.")),
    },
    {
      clase: "C",
      totalVentas: refsC.reduce((sum, r) => sum + r.venta, 0),
      porcentajeVenta: Math.round((refsC.reduce((sum, r) => sum + r.venta, 0) / totalVentaRefs) * 1000) / 10,
      totalSkus: refsC.length,
      porcentajeSkus: Math.round((refsC.length / totalRefsCount) * 1000) / 10,
      diagnostico: "Referencias de baja rotación o remanentes de colecciones anteriores.",
      estrategiaPrincipal: "Liquidar mediante combos con descuento especial, bonificaciones por volumen o promociones de cierre de temporada.",
      itemsDestacados: refsC.slice(0, 5).map((r) => mapItemDestacado(r, "C", "Liquidación: Ofrecer 15-20% de descuento si se compra junto a Clase A.")),
    },
  ];

  // =========================================================================
  // 5. GENERACIÓN AUTOMÁTICA DE COMBOS & UPSELLING (CONECTADOS A INVENTARIO REAL)
  // =========================================================================
  const combos: ComboEstrategico[] = [];

  if (refsA.length > 0) {
    // Combo 1: Estrella + Complemento B
    const star1 = refsA[0];
    const comp1 = refsB[0] || refsA[1] || refsC[0] || star1;
    const stockStar1 = buscarStockRef(star1.sku);
    const stockComp1 = buscarStockRef(comp1.sku);

    const precioStar1 = star1.unidades > 0 ? Math.round(star1.venta / star1.unidades) : stockStar1?.pvm || 65000;
    const precioComp1 = comp1.unidades > 0 ? Math.round(comp1.venta / comp1.unidades) : stockComp1?.pvm || 45000;
    const suma1 = precioStar1 + precioComp1;
    const combo1Precio = Math.round(suma1 * 0.92);

    combos.push({
      id: "combo-1-estrella-cross",
      titulo: `Combo Dúo Comercial: ${stockStar1?.descripcion || star1.nombre} + ${stockComp1?.descripcion || comp1.nombre}`,
      descripcion: `Combina tu prenda líder de alta rotación con un complemento directo para asegurar ${formatoMoneda(combo1Precio)} por conjunto.`,
      productoPrincipal: {
        sku: star1.sku,
        nombre: stockStar1?.descripcion || star1.nombre,
        linea: star1.linea,
        precio: precioStar1,
        clase: "A",
        unidades: star1.unidades,
        stockDisponible: stockStar1?.saldoTotal,
        estadoStock: stockStar1?.estadoStock,
        imageUrl: stockStar1?.image_url,
        bodega: stockStar1?.bodegas.join(", "),
      },
      productoComplemento: {
        sku: comp1.sku,
        nombre: stockComp1?.descripcion || comp1.nombre,
        linea: comp1.linea,
        precio: precioComp1,
        clase: refsB.length > 0 ? "B" : "A",
        unidades: comp1.unidades,
        stockDisponible: stockComp1?.saldoTotal,
        estadoStock: stockComp1?.estadoStock,
        imageUrl: stockComp1?.image_url,
        bodega: stockComp1?.bodegas.join(", "),
      },
      descuentoSugeridoPct: 8,
      precioSumaRegular: suma1,
      precioComboSugerido: combo1Precio,
      incrementoTicketEstimadoPct: 28,
      beneficioComercial: "Eleva el valor del pedido en un 28% y aumenta la rotación de la segunda prenda.",
      argumentoVenta: `Estimado cliente, por la compra de la referencia estrella ${star1.sku}, llévate la referencia ${comp1.sku} con un beneficio exclusivo del 8% por curva completa.${stockStar1?.saldoTotal ? ` (Disponibilidad inmediata: ${stockStar1.saldoTotal} unds en ${stockStar1.bodegas.join(", ")})` : ""}`,
      origenEstrategia: "cross_selling",
    });

    // Combo 2: Paquete Desbloqueo de Bodega / Liquidación con Alto Stock
    // Si tenemos datos de inventario real con sobrestock en bodega, usamos una referencia con alto saldo físico
    let itemAltoStock: ReferenciaStockAgrupada | undefined = undefined;
    if (resumenInventario && resumenInventario.alertasSobrestock.length > 0) {
      // Buscar una referencia en sobrestock que no sea la estrella actual
      itemAltoStock = resumenInventario.alertasSobrestock.find((s) => s.referencia !== star1.sku.toUpperCase());
    }

    if (itemAltoStock) {
      const star2 = refsA[1] || refsA[0];
      const stockStar2 = buscarStockRef(star2.sku);
      const pStar2 = star2.unidades > 0 ? Math.round(star2.venta / star2.unidades) : stockStar2?.pvm || 70000;
      const pComp2 = itemAltoStock.pvm || 42000;
      const suma2 = pStar2 * 3 + pComp2 * 3; // Paquete de 6 prendas
      const combo2Precio = Math.round(suma2 * 0.85);

      combos.push({
        id: "combo-2-desbloqueo-bodega",
        titulo: `Pack Desbloqueo Bodega (3x ${stockStar2?.descripcion || star2.nombre} + 3x ${itemAltoStock.descripcion})`,
        descripcion: `Combo estratégico para colocar ${itemAltoStock.saldoTotal} unidades disponibles en ${itemAltoStock.bodegas.join(", ")} apalancándose en tu bestseller.`,
        productoPrincipal: {
          sku: star2.sku,
          nombre: stockStar2?.descripcion || star2.nombre,
          linea: star2.linea,
          precio: pStar2,
          clase: "A",
          unidades: star2.unidades,
          stockDisponible: stockStar2?.saldoTotal,
          estadoStock: stockStar2?.estadoStock,
          imageUrl: stockStar2?.image_url,
          bodega: stockStar2?.bodegas.join(", "),
        },
        productoComplemento: {
          sku: itemAltoStock.referencia,
          nombre: itemAltoStock.descripcion,
          linea: "Confección Bodega",
          precio: pComp2,
          clase: "C",
          unidades: 0,
          stockDisponible: itemAltoStock.saldoTotal,
          estadoStock: itemAltoStock.estadoStock,
          imageUrl: itemAltoStock.image_url,
          bodega: itemAltoStock.bodegas.join(", "),
        },
        descuentoSugeridoPct: 15,
        precioSumaRegular: suma2,
        precioComboSugerido: combo2Precio,
        incrementoTicketEstimadoPct: 45,
        beneficioComercial: `Despeja ${itemAltoStock.saldoTotal} prendas en bodega asegurando ${formatoMoneda(combo2Precio)} por paquete mayorista.`,
        argumentoVenta: `Oportunidad especial de inventario: Llévate 3 unidades de nuestro bestseller ${star2.sku} + 3 unidades de ${itemAltoStock.referencia} con un 15% de descuento directo y entrega inmediata desde ${itemAltoStock.bodegas.join(", ")}.`,
        origenEstrategia: "desbloqueo_inventario",
      });
    } else if (refsC.length > 0 || refsB.length > 1) {
      // Fallback Combo Volumen
      const star2 = refsA[1] || refsA[0];
      const comp2 = refsC[0] || refsB[1] || refsB[0];
      const stockStar2 = buscarStockRef(star2.sku);
      const stockComp2 = buscarStockRef(comp2.sku);
      const pStar2 = star2.unidades > 0 ? Math.round(star2.venta / star2.unidades) : 70000;
      const pComp2 = comp2.unidades > 0 ? Math.round(comp2.venta / comp2.unidades) : 40000;
      const suma2 = pStar2 * 3 + pComp2 * 3; // Paquete de 6 prendas
      const combo2Precio = Math.round(suma2 * 0.88);

      combos.push({
        id: "combo-2-pack-volumen",
        titulo: `Pack Mayorista Surtido (3x ${stockStar2?.descripcion || star2.nombre} + 3x ${stockComp2?.descripcion || comp2.nombre})`,
        descripcion: "Estrategia para colocar volumen y rotar inventario complementario en pedidos de boutique.",
        productoPrincipal: {
          sku: star2.sku,
          nombre: stockStar2?.descripcion || star2.nombre,
          linea: star2.linea,
          precio: pStar2,
          clase: "A",
          unidades: star2.unidades,
          stockDisponible: stockStar2?.saldoTotal,
          estadoStock: stockStar2?.estadoStock,
          imageUrl: stockStar2?.image_url,
          bodega: stockStar2?.bodegas.join(", "),
        },
        productoComplemento: {
          sku: comp2.sku,
          nombre: stockComp2?.descripcion || comp2.nombre,
          linea: comp2.linea,
          precio: pComp2,
          clase: "C",
          unidades: comp2.unidades,
          stockDisponible: stockComp2?.saldoTotal,
          estadoStock: stockComp2?.estadoStock,
          imageUrl: stockComp2?.image_url,
          bodega: stockComp2?.bodegas.join(", "),
        },
        descuentoSugeridoPct: 12,
        precioSumaRegular: suma2,
        precioComboSugerido: combo2Precio,
        incrementoTicketEstimadoPct: 45,
        beneficioComercial: "Despeja inventario Clase C sin sacrificar margen y triplica el volumen de prendas facturadas.",
        argumentoVenta: `Aprovecha este pack surtido especial: llevas 3 unidades de alta rotación (${star2.sku}) y 3 complementarias (${comp2.sku}) con un 12% de descuento sobre el pedido total.`,
        origenEstrategia: "ventas_historicas",
      });
    }

    // Combo 3: Upselling de Ticket Premium (Top Bestsellers con Stock)
    if (refsA.length >= 2) {
      const starA1 = refsA[0];
      const starA2 = refsA[1];
      const stockA1 = buscarStockRef(starA1.sku);
      const stockA2 = buscarStockRef(starA2.sku);
      const pA1 = starA1.unidades > 0 ? Math.round(starA1.venta / starA1.unidades) : stockA1?.pvm || 65000;
      const pA2 = starA2.unidades > 0 ? Math.round(starA2.venta / starA2.unidades) : stockA2?.pvm || 68000;
      const suma3 = pA1 + pA2;
      const combo3Precio = Math.round(suma3 * 0.95);

      combos.push({
        id: "combo-3-top-bestsellers",
        titulo: `Dúo Best-Sellers Trucco's: ${starA1.sku} + ${starA2.sku}`,
        descripcion: "Las 2 prendas más vendidas del catálogo en una sola oferta imperdible.",
        productoPrincipal: {
          sku: starA1.sku,
          nombre: stockA1?.descripcion || starA1.nombre,
          linea: starA1.linea,
          precio: pA1,
          clase: "A",
          unidades: starA1.unidades,
          stockDisponible: stockA1?.saldoTotal,
          estadoStock: stockA1?.estadoStock,
          imageUrl: stockA1?.image_url,
          bodega: stockA1?.bodegas.join(", "),
        },
        productoComplemento: {
          sku: starA2.sku,
          nombre: stockA2?.descripcion || starA2.nombre,
          linea: starA2.linea,
          precio: pA2,
          clase: "A",
          unidades: starA2.unidades,
          stockDisponible: stockA2?.saldoTotal,
          estadoStock: stockA2?.estadoStock,
          imageUrl: stockA2?.image_url,
          bodega: stockA2?.bodegas.join(", "),
        },
        descuentoSugeridoPct: 5,
        precioSumaRegular: suma3,
        precioComboSugerido: combo3Precio,
        incrementoTicketEstimadoPct: 35,
        beneficioComercial: "Fórmula probada de conversión inmediata para clientes que buscan asegurar venta garantizada.",
        argumentoVenta: `Te reservamos nuestro top 2 en ventas nacionales (${starA1.sku} y ${starA2.sku}) para que surtas tu vitrina con las referencias que más rápido rotan.`,
        origenEstrategia: "bestsellers",
      });
    }
  }

  // =========================================================================
  // 6. ESTRATEGIAS POR ZONAS (TOP vs OPORTUNIDAD)
  // =========================================================================
  const zonas: EstrategiaZonaItem[] = [];
  const allZonasList = Array.from(zonaMapActual.entries()).map(([zName, dataZ]) => {
    const prevZ = zonaMapYoY.get(zName)?.venta || 0;
    const yoyPct = prevZ > 0 ? Math.round(((dataZ.venta - prevZ) / prevZ) * 1000) / 10 : 0;
    const topSkusZona = Array.from(dataZ.skus.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map((s) => s[0]);

    return {
      zona: zName,
      ventaActual: dataZ.venta,
      ventaAnterior: prevZ,
      crecimientoPct: yoyPct,
      topSkusZona,
    };
  }).sort((a, b) => b.ventaActual - a.ventaActual);

  for (let i = 0; i < allZonasList.length; i++) {
    const z = allZonasList[i];
    if (i < 2 || z.crecimientoPct >= 10) {
      // Zona Líder
      zonas.push({
        zona: z.zona,
        ventaActual: z.ventaActual,
        ventaAnterior: z.ventaAnterior,
        crecimientoPct: z.crecimientoPct,
        tipo: "lider",
        diagnostico: `Zona de alto desempeño y recaudación (${formatoMoneda(z.ventaActual)}).`,
        accionRecomendada: "Ofrecer preventas exclusivas, contratos de suministro continuo y paquetes mayoristas de 24+ prendas.",
        ofertaSugerida: "Envío bonificado o 5% de descuento por pedidos superiores a $2.500.000.",
        skusMasVendidos: z.topSkusZona,
      });
    } else if (z.crecimientoPct < 0 || z.ventaActual < (ventaActual / (allZonasList.length || 1)) * 0.5) {
      // Zona Oportunidad / Crítica
      zonas.push({
        zona: z.zona,
        ventaActual: z.ventaActual,
        ventaAnterior: z.ventaAnterior,
        crecimientoPct: z.crecimientoPct,
        tipo: z.crecimientoPct < -15 ? "critica" : "oportunidad",
        diagnostico: z.crecimientoPct < 0
          ? `Caída del ${Math.abs(z.crecimientoPct)}% frente al año anterior.`
          : "Facturación por debajo del potencial promedio del territorio.",
        accionRecomendada: "Llamada de reactivación a clientes que no compran hace 45+ días con catálogo de precios especiales.",
        ofertaSugerida: "Kit de reactivación: 10% de descuento en el primer pedido de la temporada + muestra comercial.",
        skusMasVendidos: z.topSkusZona,
      });
    } else {
      // Zona Estable
      zonas.push({
        zona: z.zona,
        ventaActual: z.ventaActual,
        ventaAnterior: z.ventaAnterior,
        crecimientoPct: z.crecimientoPct,
        tipo: "oportunidad",
        diagnostico: "Zona con comportamiento estable y recompra moderada.",
        accionRecomendada: "Presentar novedades de producto e incentivar cross-selling de accesorios o prendas complementarias.",
        ofertaSugerida: "Combo Dúo con 8% de descuento en la segunda referencia.",
        skusMasVendidos: z.topSkusZona,
      });
    }
  }

  // =========================================================================
  // 7. GUIONES Y PITCH COMERCIAL LISTOS PARA WHATSAPP
  // =========================================================================
  const guiones: GuionComercial[] = [
    {
      id: "pitch-combo-estrella",
      tipo: "combo",
      titulo: "Propuesta de Combo Estrella (WhatsApp)",
      etiqueta: "Aumento de Ticket",
      descripcion: "Guión para ofrecer un paquete de referencias líderes con beneficio de precio cerrado.",
      destinatario: "Clientes recurrentes / Boutiques activas",
      mensajeWhatsApp: `¡Hola [Nombre Cliente]! 👋 Espero que estés teniendo una excelente semana.\n\nTe escribo porque acabamos de habilitar un *Combo Comercial Especial Trucco's* exclusivo para tu tienda:\n\n✨ *1. Prenda Estrella:* ${refsA[0]?.nombre || "Jean Clásico"} (${refsA[0]?.sku || "REF-A"})\n✨ *2. Prenda Complementaria:* ${refsB[0]?.nombre || refsA[1]?.nombre || "Blusa Moda"} (${refsB[0]?.sku || refsA[1]?.sku || "REF-B"})\n\n🎁 *Beneficio Exclusivo:* Si llevas la curva del dúo esta semana, tienes un *8% de descuento directo* en la orden.\n\n¿Te aparto una curva para despacharte el pedido hoy mismo?`,
      beneficioCliente: "Ahorro del 8% y producto de alta rotación garantizado en vitrina.",
    },
    {
      id: "pitch-reactivacion",
      tipo: "reactivacion_zona",
      titulo: "Mensaje de Reactivación de Cliente (Zona)",
      etiqueta: "Recuperación de Cartera",
      descripcion: "Diseñado para retomar contacto con clientes que tienen baja recompra reciente.",
      destinatario: "Clientes inactivos en zonas rezagadas",
      mensajeWhatsApp: `¡Hola [Nombre Cliente]! Te saluda ${asesorNombre} de Trucco's Jeans. 👖✨\n\nRevisando nuestra cartera de clientes preferenciales, vimos que hace unas semanas no actualizas el inventario de tu tienda y queremos apoyarte en tus ventas de este mes.\n\nTe preparé una selección con nuestras *5 referencias más vendidas del momento*, con una condición especial de reactivación y despacho prioritario.\n\n¿Te puedo enviar el catálogo rápido en PDF por aquí para que elijas tus curvas favoritas?`,
      beneficioCliente: "Atención preferencial, despacho prioritario y mejores condiciones de pago.",
    },
    {
      id: "pitch-upsell-volumen",
      tipo: "upsell",
      titulo: "Upsell por Escala de Volumen",
      etiqueta: "Cierre de Pedido Mayor",
      descripcion: "Ideal para cuando un cliente ya tiene un pedido cotizado y queremos aumentarlo un 20-30%.",
      destinatario: "Clientes con cotización abierta",
      mensajeWhatsApp: `¡Hola [Nombre Cliente]! Ya tengo lista tu cotización por [X] unidades. 👌\n\nTe cuento que si agregamos solo *6 unidades adicionales* de la referencia ${refsA[1]?.sku || refsA[0]?.sku || "Bestseller"}, alcanzamos la escala de descuento mayorista con envío 100% cubierto por nosotros.\n\nEsto te mejora el margen por prenda en un 6% adicional. ¿Le sumamos las 6 unidades para aprovechar el flete gratis?`,
      beneficioCliente: "Flete bonificado y mayor rentabilidad unitaria.",
    },
    {
      id: "pitch-remate-clase-c",
      tipo: "liquidacion_c",
      titulo: "Oportunidad de Remate / Oportunidad Flash",
      etiqueta: "Rotación Rápida",
      descripcion: "Para liquidar saldo de referencias Clase C a clientes que buscan precio de remate.",
      destinatario: "Comercializadores de alto volumen / Outlets",
      mensajeWhatsApp: `¡Hola [Nombre Cliente]! Tengo una oportunidad flash de bodega disponible solo por 48 horas. ⚡\n\nTenemos un lote seleccionado de referencias de colección con un *15% de descuento directo* por bulto cerrado (mínimo 12 prendas surtidas).\n\nEs ideal para hacer una promoción de fin de semana en tu local con altísimo margen. ¿Te separo un lote antes de que se agoten las tallas?`,
      beneficioCliente: "Margen de ganancia superior al 50% en su punto de venta.",
    },
  ];

  // =========================================================================
  // 8. ALERTAS INMEDIATAS (INCLUYENDO ALERTAS DE INVENTARIO FÍSICO)
  // =========================================================================
  const alertasInmediatas: DiagnosticoMentor["alertasInmediatas"] = [];

  // Alerta de Sobrestock en Bodega
  if (resumenInventario && resumenInventario.alertasSobrestock.length > 0) {
    const topSobre = resumenInventario.alertasSobrestock[0];
    alertasInmediatas.push({
      tipo: "urgent",
      mensaje: `📦 Oportunidad de inventario: Tienes ${resumenInventario.alertasSobrestock.length} referencias con sobrestock (Ej: ${topSobre.referencia} con ${topSobre.saldoTotal} unds en ${topSobre.bodegas.join(", ")}).`,
      accion: "Revisar la pestaña de Combos o Inventario Real para activar combos de liquidación.",
    });
  }

  // Alerta de Stock Bajo en Bestseller
  if (refsA.length > 0 && resumenInventario) {
    const starStock = buscarStockRef(refsA[0].sku);
    if (starStock && starStock.saldoTotal > 0 && starStock.saldoTotal < 15) {
      alertasInmediatas.push({
        tipo: "warning",
        mensaje: `⚠️ Tu prenda estrella (${refsA[0].sku}) tiene solo ${starStock.saldoTotal} unidades en bodega.`,
        accion: "Contactar a producción para programar reposición o reservar para clientes triple A.",
      });
    }
  }

  if (ticketPromedio > 0 && ticketPromedio < 150000) {
    alertasInmediatas.push({
      tipo: "warning",
      mensaje: `Tu ticket promedio actual está en ${formatoMoneda(ticketPromedio)}. Aplicando el Combo Dúo puedes elevarlo sobre ${formatoMoneda(ticketPromedio * 1.3)}.`,
      accion: "Ofrecer combo en las próximas 3 llamadas.",
    });
  }

  if (refsC.length > 5) {
    alertasInmediatas.push({
      tipo: "info",
      mensaje: `Tienes ${refsC.length} referencias en Clase C con baja rotación.`,
      accion: "Revisar la pestaña de Mix ABC para aplicar la estrategia de remate flash.",
    });
  }

  const zonaCaida = zonas.find((z) => z.tipo === "critica");
  if (zonaCaida) {
    alertasInmediatas.push({
      tipo: "urgent",
      mensaje: `La zona ${zonaCaida.zona} presenta una caída del ${Math.abs(zonaCaida.crecimientoPct)}% frente al año anterior.`,
      accion: "Enviar el guión de reactivación a los clientes de esta zona.",
    });
  }

  if (crecimientoYoYPct > 10) {
    alertasInmediatas.push({
      tipo: "success",
      mensaje: `¡Excelente ritmo! Crecimiento interanual del +${crecimientoYoYPct.toFixed(1)}%.`,
      accion: "Mantener foco en reposición de referencias Clase A.",
    });
  }

  return {
    asesorNombre,
    periodoNombre,
    kpis: {
      ventaActual,
      ventaMesAnterior,
      ventaAnioAnterior,
      crecimientoMoMPct,
      crecimientoYoYPct,
      ticketPromedio,
      ticketPromedioAnterior,
      precioPromedioPrenda,
      unidadesVendidas: unidadesActual,
      transacciones,
      saludComercial,
      puntuacionRendimiento,
      mensajeMotivacional,
    },
    combos,
    zonas,
    abc,
    guiones,
    alertasInmediatas,
  };
}
