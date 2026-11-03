import React, { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  obtenerPedidosVsDespachos,
  ResultadoPedidosDespachos,
  GrupoVendedorPedidoDespacho,
  GrupoTerceroPedidoDespacho,
  ItemProductoPedidoDespacho,
  ItemSkuPedidoDespacho,
  CatalogoItem,
  fetchAllDimTercero,
} from "@/lib/ventas-api";
import { CORRERIAS_OFICIALES } from "@/lib/correrias-config";
import { cn, formatoCOPFull, formatoHGI } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Download,
  Calendar,
  Filter,
  ChevronDown,
  ChevronRight,
  Package,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  BarChart3,
  Layers,
  Clock,
  User,
  Users,
  Building2,
  Tag,
  Palette,
  Scissors,
  Save,
  Trash2,
  Plus,
  RefreshCw,
  X,
  Database,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface VisorPedidosDespachosProps {
  onNavegarAProgramacion?: () => void;
  onNavegarABodega?: () => void;
  vendedorIdFiltro?: number | "todos";
  vendedorIdsPermitidos?: number[];
  vendedorIds?: number[];
  asesorNombre?: string;
  esAdmin?: boolean;
  terceroIdFiltro?: number | "todos";
  onSelectTercero?: (terceroId: number | null) => void;
  anioGlobal?: string;
  mesGlobal?: string;
  fechaDesdeGlobal?: string;
  fechaHastaGlobal?: string;
}

// Función auxiliar para normalizar textos (elimina acentos/tildes, espacios extra y pasa a minúsculas)
function normalizarTexto(texto: string | null | undefined): string {
  if (!texto) return "";
  return String(texto)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function VisorPedidosDespachos({
  onNavegarAProgramacion,
  onNavegarABodega,
  vendedorIdFiltro = "todos",
  vendedorIdsPermitidos,
  vendedorIds,
  asesorNombre,
  esAdmin = false,
  terceroIdFiltro = "todos",
  onSelectTercero,
  anioGlobal,
  mesGlobal,
  fechaDesdeGlobal,
  fechaHastaGlobal,
}: VisorPedidosDespachosProps) {
  // Filtros de fecha: por defecto abarcan el año completo para visualizar pedidos históricos
  const [fechaDesde, setFechaDesde] = useState(() => {
    if (fechaDesdeGlobal && fechaHastaGlobal) return fechaDesdeGlobal;
    const ahora = new Date();
    const y = anioGlobal ? parseInt(anioGlobal, 10) || ahora.getFullYear() : ahora.getFullYear();
    return `${y}-01-01`;
  });
  const [fechaHasta, setFechaHasta] = useState(() => {
    if (fechaDesdeGlobal && fechaHastaGlobal) return fechaHastaGlobal;
    const ahora = new Date();
    const y = anioGlobal ? parseInt(anioGlobal, 10) || ahora.getFullYear() : ahora.getFullYear();
    return `${y}-12-31`;
  });

  // Sincronización reactiva con filtros de fecha globales del panel cuando se definen explícitamente
  React.useEffect(() => {
    if (fechaDesdeGlobal && fechaHastaGlobal) {
      setFechaDesde(fechaDesdeGlobal);
      setFechaHasta(fechaHastaGlobal);
    }
  }, [fechaDesdeGlobal, fechaHastaGlobal]);

  const [modoVista, setModoVista] = useState<"datos" | "grafico" | "ambos">("datos");
  // Por defecto 'false' para ver todos los productos que han pedido antes y no solo los pendientes
  const [soloPendientes, setSoloPendientes] = useState(false);
  const [correriaSeleccionada, setCorreriaSeleccionada] = useState<string>("todas");

  // Al seleccionar una correría, ajustar automáticamente las fechas según la configuración oficial
  const handleCambioCorreria = (val: string) => {
    setCorreriaSeleccionada(val);
    const ahora = new Date();
    const y = anioGlobal ? parseInt(anioGlobal, 10) || ahora.getFullYear() : ahora.getFullYear();

    if (val === "todas") {
      setFechaDesde(`${y}-01-01`);
      setFechaHasta(`${y}-12-31`);
      return;
    }

    const numId = Number(val);
    const corr = CORRERIAS_OFICIALES.find(
      (c) => c.id === numId || c.clave === val.toUpperCase()
    );
    if (corr) {
      setFechaDesde(`${y}-${corr.mesInicio}`);
      setFechaHasta(`${y}-${corr.mesFin}`);
    }
  };
  const [busqueda, setBusqueda] = useState("");
  const [vendedorSeleccionado, setVendedorSeleccionado] = useState<number | "todos">(
    vendedorIdFiltro
  );
  const [terceroSeleccionado, setTerceroSeleccionado] = useState<number | "todos">(
    terceroIdFiltro || "todos"
  );
  const [vistaMovil, setVistaMovil] = useState<"tarjetas" | "tabla">("tarjetas");

  React.useEffect(() => {
    setVendedorSeleccionado(vendedorIdFiltro);
  }, [vendedorIdFiltro]);

  React.useEffect(() => {
    if (terceroIdFiltro) {
      setTerceroSeleccionado(terceroIdFiltro);
    }
  }, [terceroIdFiltro]);

  // Cargar catálogo de correrías de dim_correria
  const { data: correriasData } = useQuery<CatalogoItem[]>({
    queryKey: ["visor-correrias-catalogo"],
    queryFn: async () => {
      const { data } = await supabase
        .from("dim_correria")
        .select("id, nombre")
        .not("nombre", "is", null)
        .order("nombre");
      return (data || []).map((c) => ({ id: Number(c.id), nombre: String(c.nombre) }));
    },
    staleTime: 1000 * 60 * 30,
  });

  // Cargar catálogo de clientes / terceros
  const { data: tercerosData } = useQuery<CatalogoItem[]>({
    queryKey: ["visor-terceros-catalogo"],
    queryFn: () => fetchAllDimTercero(),
    staleTime: 1000 * 60 * 30,
  });

  // Opciones de configuración de tabla estilo visor HGI
  const [mostrarSubtotalesColumna, setMostrarSubtotalesColumna] = useState(true);
  const [mostrarTotalesColumna, setMostrarTotalesColumna] = useState(true);
  const [mostrarSubtotalesFila, setMostrarSubtotalesFila] = useState(true);
  const [mostrarTotalesFila, setMostrarTotalesFila] = useState(true);

  // Estado de filas expandidas (claves: `${vendedorNombre}|${terceroNombre}`)
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({});
  // Estado de SKUs expandidos por producto (claves: `${vendedorNombre}|${terceroNombre}|${producto}`)
  const [skusExpandidos, setSkusExpandidos] = useState<Record<string, boolean>>({});

  // Query para obtener datos agrupados
  const { data, isLoading, refetch, isFetching } = useQuery<ResultadoPedidosDespachos>({
    queryKey: [
      "visor-pedidos-despachos",
      fechaDesde,
      fechaHasta,
      vendedorSeleccionado,
      vendedorIds,
      vendedorIdsPermitidos,
      terceroSeleccionado,
      correriaSeleccionada,
      soloPendientes,
    ],
    queryFn: () =>
      obtenerPedidosVsDespachos({
        fecha_desde: fechaDesde,
        fecha_hasta: fechaHasta,
        vendedor_id: vendedorSeleccionado !== "todos" ? Number(vendedorSeleccionado) : undefined,
        vendedor_ids:
          vendedorIds && vendedorIds.length > 0
            ? vendedorIds
            : vendedorSeleccionado === "todos" && vendedorIdsPermitidos?.length
            ? vendedorIdsPermitidos
            : undefined,
        tercero_id: terceroSeleccionado !== "todos" ? Number(terceroSeleccionado) : undefined,
        correria_id: correriaSeleccionada !== "todas" ? Number(correriaSeleccionada) : undefined,
        solo_pendientes: soloPendientes,
      }),
  });

  // Filtro de búsqueda multi-criterio e insensible a tildes/acentos
  const queryTokens = useMemo(() => {
    return normalizarTexto(busqueda).split(/\s+/).filter(Boolean);
  }, [busqueda]);

  // Filtro de búsqueda local por texto (Tercero, Vendedor, Producto, Color, Talla, SKU) y filtro de cliente
  const vendedoresFiltrados = useMemo(() => {
    if (!data?.vendedores) return [];
    let list = data.vendedores;

    // SEGURIDAD POR ASESOR: Filtrar vendedores si el usuario no es admin
    if (!esAdmin && vendedorIdsPermitidos && vendedorIdsPermitidos.length > 0) {
      list = list.filter((v) => vendedorIdsPermitidos.includes(Number(v.vendedorId)));
    }

    // 1. Filtrar por tercero si está seleccionado específicamente en el dropdown
    if (terceroSeleccionado !== "todos") {
      list = list
        .map((v) => ({
          ...v,
          terceros: v.terceros.filter((t) => Number(t.terceroId) === Number(terceroSeleccionado)),
        }))
        .filter((v) => v.terceros.length > 0);
    }

    // 2. Si no hay términos de búsqueda textual, devolver la lista base
    if (queryTokens.length === 0) {
      return list;
    }

    // 3. Filtrar por términos de búsqueda (todos los tokens deben coincidir en vendedor, tercero o producto)
    const resultado: GrupoVendedorPedidoDespacho[] = [];

    for (const v of list) {
      const vText = normalizarTexto(`${v.vendedorNombre} ${v.vendedorId}`);
      const vCoincideTodo = queryTokens.every((tok) => vText.includes(tok));

      const tercerosFiltrados: GrupoTerceroPedidoDespacho[] = [];

      for (const t of v.terceros) {
        const tText = normalizarTexto(`${t.terceroNombre} ${t.terceroCodigo || ""} ${t.terceroId}`);
        const vtText = `${vText} ${tText}`;
        const vtCoincideTodo = queryTokens.every((tok) => vtText.includes(tok));

        let prodsCoincidentes: ItemProductoPedidoDespacho[] = [];

        if (vCoincideTodo || vtCoincideTodo) {
          // Si el vendedor o el cliente coincide plenamente con la búsqueda, mostrar productos respetando el filtro de pendientes
          prodsCoincidentes = soloPendientes
            ? t.productos.filter((p) => p.esPendiente)
            : t.productos;
        } else {
          // Filtrar los productos individuales que cumplan la combinación de términos
          prodsCoincidentes = t.productos.filter((p) => {
            if (soloPendientes && !p.esPendiente) return false;
            const skusTexto = (p.skus || []).map((s) => `${s.sku} ${s.talla || ""} ${s.color || ""}`).join(" ");
            const pText = normalizarTexto(
              `${p.producto} ${p.descripcion || ""} ${p.sku || ""} ${p.color || ""} ${p.talla || ""} ${skusTexto}`
            );
            const filaCompleta = `${vtText} ${pText}`;
            return queryTokens.every((tok) => filaCompleta.includes(tok));
          });
        }

        if (prodsCoincidentes.length > 0) {
          const pedCant = prodsCoincidentes.reduce((s, p) => s + p.pedidosCantidad, 0);
          const pedVal = prodsCoincidentes.reduce((s, p) => s + p.pedidosValor, 0);
          const despCant = prodsCoincidentes.reduce((s, p) => s + p.despachosCantidad, 0);
          const despVal = prodsCoincidentes.reduce((s, p) => s + p.despachosValor, 0);
          const totCant = Math.max(0, pedCant - despCant);
          const totVal = totCant > 0 ? Math.max(0, pedVal - despVal) : 0;

          if (!soloPendientes || totCant > 0) {
            tercerosFiltrados.push({
              ...t,
              pedidosCantidad: pedCant,
              pedidosValor: pedVal,
              despachosCantidad: despCant,
              despachosValor: despVal,
              totalGeneralCantidad: totCant,
              totalGeneralValor: totVal,
              esPendiente: totCant > 0,
              productos: prodsCoincidentes,
            });
          }
        }
      }

      if (tercerosFiltrados.length > 0) {
        const vPedCant = tercerosFiltrados.reduce((s, t) => s + t.pedidosCantidad, 0);
        const vPedVal = tercerosFiltrados.reduce((s, t) => s + t.pedidosValor, 0);
        const vDespCant = tercerosFiltrados.reduce((s, t) => s + t.despachosCantidad, 0);
        const vDespVal = tercerosFiltrados.reduce((s, t) => s + t.despachosValor, 0);
        const vTotCant = Math.max(0, vPedCant - vDespCant);
        const vTotVal = vTotCant > 0 ? Math.max(0, vPedVal - vDespVal) : 0;

        if (!soloPendientes || vTotCant > 0) {
          resultado.push({
            ...v,
            pedidosCantidad: vPedCant,
            pedidosValor: vPedVal,
            despachosCantidad: vDespCant,
            despachosValor: vDespVal,
            totalGeneralCantidad: vTotCant,
            totalGeneralValor: vTotVal,
            esPendiente: vTotCant > 0,
            terceros: tercerosFiltrados,
          });
        }
      }
    }

    return resultado;
  }, [data?.vendedores, terceroSeleccionado, queryTokens, soloPendientes]);

  // Estadísticas de coincidencia de búsqueda
  const estadisticasBusqueda = useMemo(() => {
    let totalTerceros = 0;
    let totalProductos = 0;
    for (const v of vendedoresFiltrados) {
      totalTerceros += v.terceros.length;
      for (const t of v.terceros) {
        totalProductos += t.productos.length;
      }
    }
    return { totalTerceros, totalProductos };
  }, [vendedoresFiltrados]);

  // Manejo de expansión / colapso
  const toggleExpandir = (clave: string) => {
    setExpandidos((prev) => ({
      ...prev,
      [clave]: !prev[clave],
    }));
  };

  const expandirTodos = () => {
    const nuevo: Record<string, boolean> = {};
    for (const v of vendedoresFiltrados) {
      for (const t of v.terceros) {
        nuevo[`${v.vendedorNombre}|${t.terceroNombre}`] = true;
      }
    }
    setExpandidos(nuevo);
  };

  const colapsarTodos = () => {
    setExpandidos({});
  };

  // Manejo de expansión / colapso de SKUs individuales por referencia
  const toggleExpandirSku = (prodKey: string) => {
    setSkusExpandidos((prev) => ({
      ...prev,
      [prodKey]: !prev[prodKey],
    }));
  };

  const expandirTodosSkus = () => {
    const nuevo: Record<string, boolean> = {};
    for (const v of vendedoresFiltrados) {
      for (const t of v.terceros) {
        for (const p of t.productos) {
          nuevo[`${v.vendedorNombre}|${t.terceroNombre}|${p.producto}`] = true;
        }
      }
    }
    setSkusExpandidos(nuevo);
  };

  const colapsarTodosSkus = () => {
    setSkusExpandidos({});
  };

  // Exportar a CSV incluyendo desglose por SKU
  const exportarCSV = () => {
    if (!vendedoresFiltrados || vendedoresFiltrados.length === 0) return;

    const lineas: string[] = [];
    lineas.push(
      "Tipo_Fila,Vendedor,Tercero,Codigo_Producto_O_SKU,Descripcion,Talla,Color,Pedidos_Cantidad,Pedidos_Valor,Salida_Despacho_Cantidad,Salida_Despacho_Valor,Total_General_Cantidad,Total_General_Valor,Estado"
    );

    for (const v of vendedoresFiltrados) {
      for (const t of v.terceros) {
        for (const p of t.productos) {
          lineas.push(
            `"REFERENCIA","${v.vendedorNombre}","${t.terceroNombre}","${p.producto}","${p.descripcion || ""}","${p.talla || ""}","${p.color || ""}","${p.pedidosCantidad}","${p.pedidosValor}","${p.despachosCantidad}","${p.despachosValor}","${p.totalGeneralCantidad}","${p.totalGeneralValor}","${p.esPendiente ? "PENDIENTE" : "COMPLETADO"}"`
          );

          if (p.skus && p.skus.length > 0) {
            for (const s of p.skus) {
              lineas.push(
                `"SKU","${v.vendedorNombre}","${t.terceroNombre}","${s.sku}","${p.descripcion || ""}","${s.talla || ""}","${s.color || ""}","${s.pedidosCantidad}","${s.pedidosValor}","${s.despachosCantidad}","${s.despachosValor}","${s.totalGeneralCantidad}","${s.totalGeneralValor}","${s.esPendiente ? "PENDIENTE" : "COMPLETADO"}"`
              );
            }
          }
        }
        lineas.push(
          `"SUBTOTAL_CLIENTE","${v.vendedorNombre}","${t.terceroNombre} TOTAL","—","Subtotal Cliente","—","—","${t.pedidosCantidad}","${t.pedidosValor}","${t.despachosCantidad}","${t.despachosValor}","${t.totalGeneralCantidad}","${t.totalGeneralValor}","${t.esPendiente ? "PENDIENTE" : "COMPLETADO"}"`
        );
      }
      lineas.push(
        `"SUBTOTAL_VENDEDOR","${v.vendedorNombre} TOTAL","—","—","Subtotal Vendedor","—","—","${v.pedidosCantidad}","${v.pedidosValor}","${v.despachosCantidad}","${v.despachosValor}","${v.totalGeneralCantidad}","${v.totalGeneralValor}","${v.esPendiente ? "PENDIENTE" : "COMPLETADO"}"`
      );
    }

    const blob = new Blob([lineas.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Pedidos_vs_Despachos_${fechaDesde}_${fechaHasta}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Datos para gráfico comparativo
  const datosGrafico = useMemo(() => {
    if (!vendedoresFiltrados) return [];
    const clientes: { nombre: string; pedidos: number; despachados: number; pendientes: number }[] = [];
    for (const v of vendedoresFiltrados) {
      for (const t of v.terceros) {
        clientes.push({
          nombre: t.terceroNombre.length > 20 ? t.terceroNombre.slice(0, 18) + "..." : t.terceroNombre,
          pedidos: t.pedidosCantidad,
          despachados: Math.abs(t.despachosCantidad),
          pendientes: Math.max(0, t.totalGeneralCantidad),
        });
      }
    }
    // Top 15 con más pedidos o pendientes
    return clientes.sort((a, b) => b.pendientes - a.pendientes || b.pedidos - a.pedidos).slice(0, 15);
  }, [vendedoresFiltrados]);

  // KPIs consolidados dinámicamente según la selección y filtros de búsqueda activos
  const kpis = useMemo(() => {
    let pedCant = 0;
    let pedVal = 0;
    let despCant = 0;
    let despVal = 0;
    let pendCant = 0;
    let pendVal = 0;
    let clientesConPend = 0;

    for (const v of vendedoresFiltrados) {
      for (const t of v.terceros) {
        pedCant += t.pedidosCantidad;
        pedVal += t.pedidosValor;
        despCant += t.despachosCantidad;
        despVal += t.despachosValor;
        pendCant += t.totalGeneralCantidad;
        pendVal += t.totalGeneralValor;
        if (t.totalGeneralCantidad > 0) {
          clientesConPend++;
        }
      }
    }

    const nivelServicio =
      pedCant > 0 ? (despCant / pedCant) * 100 : pedCant === 0 && despCant === 0 ? 100 : 0;

    return {
      totalPedidosCantidad: pedCant,
      totalPedidosValor: pedVal,
      totalDespachosCantidad: despCant,
      totalDespachosValor: despVal,
      totalPendienteCantidad: pendCant,
      totalPendienteValor: pendVal,
      nivelServicioPct: Number(nivelServicio.toFixed(2)),
      totalClientesConPendientes: clientesConPend,
      totalRegistros: data?.kpis?.totalRegistros ?? 0,
    };
  }, [vendedoresFiltrados, data?.kpis?.totalRegistros]);

  return (
    <div className="space-y-4 font-sans text-xs">
      {/* Encabezado y Accesos Rápidos de Administración */}
      {esAdmin && (onNavegarAProgramacion || onNavegarABodega) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-border bg-card shadow-2xs">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs font-semibold py-1 px-2.5 border-primary/30 bg-primary/5 text-primary">
              <Database className="h-3.5 w-3.5 mr-1 text-primary" />
              Base de Ventas y Pedidos Original (fact_ventas)
            </Badge>
            <span className="text-xs text-muted-foreground">
              Cruce directo de pedidos tomados vs. salidas de bodega / facturación históricas
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onNavegarAProgramacion && (
              <Button
                variant="outline"
                size="sm"
                onClick={onNavegarAProgramacion}
                className="text-xs font-semibold gap-1.5 border-purple-500/40 hover:bg-purple-500/10 text-purple-700 dark:text-purple-300"
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Programación Producción</span>
              </Button>
            )}
            {onNavegarABodega && (
              <Button
                variant="outline"
                size="sm"
                onClick={onNavegarABodega}
                className="text-xs font-semibold gap-1.5 border-blue-500/40 hover:bg-blue-500/10 text-blue-700 dark:text-blue-300"
              >
                <Package className="h-3.5 w-3.5" />
                <span>Despachos Bodega</span>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* 1. Barra de Ventana / Encabezado de Empresa (Estilo HGI Visor de Datos) */}
      <div className="bg-muted/40 border border-border/80 rounded-xl p-3 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2.5 pb-2.5 border-b border-border/60">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-background rounded-lg border border-border text-[11px] font-semibold text-foreground">
              <Building2 className="h-3.5 w-3.5 text-primary" />
              <span>Empresa:</span>
              <span className="font-bold text-primary">TRUCCO S FASHION S.A.S.</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-background rounded-lg border border-border text-[11px] text-muted-foreground">
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              <span>Periodo:</span>
              <span className="font-semibold text-foreground">{fechaDesde} al {fechaHasta}</span>
              <span className="text-muted-foreground/50">|</span>
              <span>Modo:</span>
              <span className="font-semibold text-foreground">PCGA</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-muted-foreground">Vista:</span>
            <div className="inline-flex rounded-lg border border-border bg-background p-0.5">
              <button
                type="button"
                onClick={() => setModoVista("datos")}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                  modoVista === "datos"
                    ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Datos
              </button>
              <button
                type="button"
                onClick={() => setModoVista("grafico")}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                  modoVista === "grafico"
                    ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Gráfico
              </button>
              <button
                type="button"
                onClick={() => setModoVista("ambos")}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                  modoVista === "ambos"
                    ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Ambos
              </button>
            </div>
          </div>
        </div>

        {/* 2. Barra de Control / Filtros de Plantilla HGI */}
        <div className="pt-2.5 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Consulta & Plantilla & Correría */}
          <div className="md:col-span-4 flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 min-w-[70px]">
              <span className="text-muted-foreground font-medium">Consulta:</span>
              <span className="font-bold text-foreground">Documentos</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 bg-background border rounded-md">
              <span className="text-muted-foreground text-[10.5px]">Plantilla:</span>
              <span className="font-bold text-primary font-mono text-[11px]">PEDIDOSVS.DESPACHOS</span>
              <Save className="h-3 w-3 text-muted-foreground ml-1" />
            </div>

            {/* Selector de Correría */}
            <div className="flex items-center gap-1 px-2 py-1 bg-background border rounded-md">
              <Layers className="h-3 w-3 text-primary shrink-0" />
              <span className="text-muted-foreground text-[10.5px]">Correría:</span>
              <select
                value={correriaSeleccionada}
                onChange={(e) => handleCambioCorreria(e.target.value)}
                className="bg-transparent border-0 text-[11px] font-bold text-foreground focus:outline-hidden cursor-pointer font-mono"
              >
                <option value="todas">Todas</option>
                {(correriasData || []).map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Selector de Cliente / Comprador (Tercero) */}
            <div className="flex items-center gap-1 px-2 py-1 bg-background border rounded-md">
              <Users className="h-3 w-3 text-indigo-500 shrink-0" />
              <span className="text-muted-foreground text-[10.5px]">Cliente:</span>
              <select
                value={terceroSeleccionado}
                onChange={(e) => {
                  const val = e.target.value === "todos" ? "todos" : Number(e.target.value);
                  setTerceroSeleccionado(val);
                  if (onSelectTercero) {
                    onSelectTercero(val === "todos" ? null : val);
                  }
                }}
                className="bg-transparent border-0 text-[11px] font-bold text-foreground focus:outline-hidden cursor-pointer max-w-[190px] truncate"
                title="Filtrar por Cliente / Comprador"
              >
                <option value="todos">Todos los Clientes ({(tercerosData || []).length})</option>
                {(tercerosData || []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Rango de Fechas y Accesos Rápidos */}
          <div className="md:col-span-4 flex flex-col items-center gap-1.5 justify-center w-full">
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full justify-center">
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 bg-background border rounded-lg px-2 py-1 w-full sm:w-auto">
                <div className="flex items-center gap-1 flex-1 min-w-[120px]">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <input
                    type="date"
                    value={fechaDesde}
                    onChange={(e) => setFechaDesde(e.target.value)}
                    className="bg-transparent border-0 text-[11px] font-mono text-foreground focus:outline-hidden w-full"
                  />
                </div>
                <span className="text-muted-foreground font-semibold text-xs px-0.5">a</span>
                <div className="flex items-center gap-1 flex-1 min-w-[120px]">
                  <input
                    type="date"
                    value={fechaHasta}
                    onChange={(e) => setFechaHasta(e.target.value)}
                    className="bg-transparent border-0 text-[11px] font-mono text-foreground focus:outline-hidden w-full"
                  />
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
                className="h-8 px-2.5 shrink-0"
                title="Refrescar datos"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin text-primary" : ""}`} />
              </Button>
            </div>
            {/* Botones de Periodo Rápido */}
            <div className="flex items-center gap-1 text-[10px] flex-wrap justify-center">
              <span className="text-muted-foreground font-medium">Periodos:</span>
              <button
                type="button"
                onClick={() => { setFechaDesde("2026-01-01"); setFechaHasta("2026-12-31"); }}
                className={`px-1.5 py-0.5 rounded border transition-colors ${
                  fechaDesde === "2026-01-01" && fechaHasta === "2026-12-31"
                    ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                    : "bg-background border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                Año 2026
              </button>
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  const y = now.getFullYear();
                  const m = String(now.getMonth() + 1).padStart(2, "0");
                  const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
                  setFechaDesde(`${y}-${m}-01`);
                  setFechaHasta(`${y}-${m}-${String(lastDay).padStart(2, "0")}`);
                }}
                className={`px-1.5 py-0.5 rounded border transition-colors ${
                  (() => {
                    const now = new Date();
                    const y = now.getFullYear();
                    const m = String(now.getMonth() + 1).padStart(2, "0");
                    const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
                    return (
                      fechaDesde === `${y}-${m}-01` &&
                      fechaHasta === `${y}-${m}-${String(lastDay).padStart(2, "0")}`
                    );
                  })()
                    ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                    : "bg-background border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                Mes Actual
              </button>
              <button
                type="button"
                onClick={() => { setFechaDesde("2025-01-01"); setFechaHasta("2026-12-31"); }}
                className={`px-1.5 py-0.5 rounded border transition-colors ${
                  fechaDesde === "2025-01-01" && fechaHasta === "2026-12-31"
                    ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                    : "bg-background border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                Todo el Historial
              </button>
              <button
                type="button"
                onClick={() => { setFechaDesde("2026-01-01"); setFechaHasta("2026-06-30"); }}
                className={`px-1.5 py-0.5 rounded border transition-colors ${
                  fechaDesde === "2026-01-01" && fechaHasta === "2026-06-30"
                    ? "bg-primary text-primary-foreground border-primary font-bold"
                    : "bg-background border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                S1 2026
              </button>
              <button
                type="button"
                onClick={() => { setFechaDesde("2026-07-01"); setFechaHasta("2026-12-31"); }}
                className={`px-1.5 py-0.5 rounded border transition-colors ${
                  fechaDesde === "2026-07-01" && fechaHasta === "2026-12-31"
                    ? "bg-primary text-primary-foreground border-primary font-bold"
                    : "bg-background border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                S2 2026
              </button>
              <button
                type="button"
                onClick={() => { setFechaDesde("2025-01-01"); setFechaHasta("2025-12-31"); }}
                className={`px-1.5 py-0.5 rounded border transition-colors ${
                  fechaDesde === "2025-01-01" && fechaHasta === "2025-12-31"
                    ? "bg-primary text-primary-foreground border-primary font-bold"
                    : "bg-background border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                2025
              </button>
            </div>
          </div>

          {/* Opciones de Totales y Subtotales (Checkboxes HGI) */}
          <div className="md:col-span-4 flex items-center justify-end gap-3 flex-wrap text-[10.5px]">
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={mostrarSubtotalesColumna}
                onChange={(e) => setMostrarSubtotalesColumna(e.target.checked)}
                className="rounded border-border text-primary focus:ring-0"
              />
              <span>SubTotales Col.</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={mostrarTotalesColumna}
                onChange={(e) => setMostrarTotalesColumna(e.target.checked)}
                className="rounded border-border text-primary focus:ring-0"
              />
              <span>Totales Col.</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={mostrarSubtotalesFila}
                onChange={(e) => setMostrarSubtotalesFila(e.target.checked)}
                className="rounded border-border text-primary focus:ring-0"
              />
              <span>SubTotales Fila</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={mostrarTotalesFila}
                onChange={(e) => setMostrarTotalesFila(e.target.checked)}
                className="rounded border-border text-primary focus:ring-0"
              />
              <span>Totales Fila</span>
            </label>
          </div>
        </div>
      </div>

      {/* 3. Barra de Dimensiones y Métricas (Pills HGI) */}
      <div className="flex items-center justify-between gap-2 flex-wrap py-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10.5px] uppercase font-bold text-muted-foreground mr-1">Dimensiones:</span>
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-[10.5px] font-medium border text-foreground">
            <Package className="h-3 w-3 text-cyan-500" />
            <span>Producto</span>
          </div>
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-[10.5px] font-medium border text-foreground">
            <Palette className="h-3 w-3 text-pink-500" />
            <span>Color</span>
          </div>
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-[10.5px] font-medium border text-foreground">
            <Scissors className="h-3 w-3 text-purple-500" />
            <span>TallaP</span>
          </div>
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-[10.5px] font-medium border text-foreground">
            <Tag className="h-3 w-3 text-emerald-500" />
            <span>Linea</span>
          </div>
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-[10.5px] font-medium border text-foreground">
            <Layers className="h-3 w-3 text-blue-500" />
            <span>COLECCION</span>
          </div>

          <span className="text-muted-foreground/40 mx-1">|</span>

          <span className="text-[10.5px] uppercase font-bold text-muted-foreground mr-1">Métricas:</span>
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10.5px] font-bold border border-emerald-500/30">
            <Plus className="h-3 w-3" />
            <span>Cantidad</span>
          </div>
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10.5px] font-bold border border-emerald-500/30">
            <Plus className="h-3 w-3" />
            <span>Valor</span>
          </div>
        </div>

        {/* Acciones Rápidas: Selector de Modo (Solo Pendientes vs Histórico) */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center p-0.5 rounded-lg border border-border/80 bg-muted/40 shadow-2xs">
            <button
              type="button"
              onClick={() => setSoloPendientes(false)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer",
                !soloPendientes
                  ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Ver Todo (Histórico)</span>
            </button>
            <button
              type="button"
              onClick={() => setSoloPendientes(true)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer",
                soloPendientes
                  ? "bg-amber-600 text-white shadow-2xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Solo Pendientes</span>
              {kpis?.totalPendienteCantidad ? (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 text-white font-mono">
                  {kpis.totalPendienteCantidad.toLocaleString("es-CO")}
                </span>
              ) : null}
            </button>
          </div>

          <Button variant="outline" size="sm" onClick={expandirTodos} className="h-7 text-xs">
            Expandir Clientes
          </Button>
          <Button variant="outline" size="sm" onClick={colapsarTodos} className="h-7 text-xs">
            Contraer Clientes
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={Object.values(skusExpandidos).some(Boolean) ? colapsarTodosSkus : expandirTodosSkus}
            className="h-7 text-xs font-medium"
            title="Expandir o contraer desglose de SKUs para todas las referencias"
          >
            <Layers className="mr-1 h-3.5 w-3.5 text-primary" />
            {Object.values(skusExpandidos).some(Boolean) ? "Contraer SKUs" : "Expandir SKUs"}
          </Button>
          <Button variant="outline" size="sm" onClick={exportarCSV} className="h-7 text-xs">
            <Download className="mr-1 h-3.5 w-3.5" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* 4. Tarjetas KPI de Resumen Ejecutivo de Despachos vs Pedidos */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
        <Card className="p-3 border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Pedidos</span>
            <Package className="h-4 w-4 text-purple-500" />
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-foreground">
            {(kpis?.totalPedidosCantidad ?? 0).toLocaleString("es-CO")} unds
          </div>
          <div className="text-[11px] text-muted-foreground font-mono truncate">
            {formatoCOPFull(kpis?.totalPedidosValor ?? 0)}
          </div>
        </Card>

        <Card className="p-3 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Salidas Despacho</span>
            <Package className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-foreground">
            {(kpis?.totalDespachosCantidad ?? 0).toLocaleString("es-CO")} unds
          </div>
          <div className="text-[11px] text-muted-foreground font-mono truncate">
            {formatoCOPFull(kpis?.totalDespachosValor ?? 0)}
          </div>
        </Card>

        <Card className="p-3 border-l-4 border-l-amber-500 bg-amber-500/5">
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pendiente Despacho</span>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-base sm:text-lg font-extrabold font-mono text-amber-700 dark:text-amber-300">
            {(kpis?.totalPendienteCantidad ?? 0).toLocaleString("es-CO")} unds
          </div>
          <div className="text-[11px] text-amber-600/80 dark:text-amber-400/80 font-mono font-medium truncate">
            {formatoCOPFull(kpis?.totalPendienteValor ?? 0)}
          </div>
        </Card>

        <Card className="p-3 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Nivel de Servicio</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {Number(kpis?.nivelServicioPct ?? 0).toFixed(2)}%
          </div>
          <div className="text-[10px] text-muted-foreground">Unidades entregadas vs pedidas</div>
        </Card>

        <Card className="p-3 border-l-4 border-l-indigo-500 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Clientes Pendientes</span>
            <Users className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-foreground">
            {(kpis?.totalClientesConPendientes ?? 0).toLocaleString("es-CO")}
          </div>
          <div className="text-[10px] text-muted-foreground">Clientes con saldo de entrega</div>
        </Card>
      </div>

      {/* Buscador de Terceros o Productos */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente/NIT, referencia, descripción, color, talla o asesor..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-9 pr-8 h-9 text-xs"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda("")}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground p-0.5 rounded-full"
              title="Borrar búsqueda"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {busqueda.trim() && (
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="secondary" className="text-[11px] font-mono py-1 px-2.5 border">
              {estadisticasBusqueda.totalTerceros} {estadisticasBusqueda.totalTerceros === 1 ? "cliente" : "clientes"} • {estadisticasBusqueda.totalProductos} {estadisticasBusqueda.totalProductos === 1 ? "ítem" : "ítems"}
            </Badge>
            <Button variant="ghost" size="sm" onClick={() => setBusqueda("")} className="h-8 text-xs px-2.5">
              Limpiar
            </Button>
          </div>
        )}
      </div>

      {/* 5. Vista de Gráfico (si 'grafico' o 'ambos' está activo) */}
      {(modoVista === "grafico" || modoVista === "ambos") && (
        <Card className="p-4">
          <CardHeader className="p-0 pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span>Top 15 Clientes: Unidades Pedidas vs. Despachadas vs. Pendientes</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Muestra los clientes con mayor volumen y su saldo pendiente de despacho en el periodo.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {datosGrafico.length === 0 ? (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground text-xs">
                No hay datos disponibles para graficar en el rango seleccionado.
              </div>
            ) : (
              <div>
                <div className="sm:hidden px-3 py-1 text-[10.5px] text-muted-foreground flex items-center justify-between">
                  <span>↔ Desliza horizontalmente para ver clientes</span>
                  <span className="font-mono">{datosGrafico.length} clientes</span>
                </div>
                <div className="overflow-x-auto w-full touch-pan">
                  <div className="h-[280px] min-w-[550px] sm:min-w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={datosGrafico} margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis
                          dataKey="nombre"
                          angle={-35}
                          textAnchor="end"
                          interval={0}
                          tick={{ fontSize: 10 }}
                          height={60}
                        />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip
                          contentStyle={{ fontSize: 11, borderRadius: 8 }}
                          formatter={(val: number) => [`${val.toLocaleString("es-CO")} unds`, ""]}
                        />
                        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                        <Bar dataKey="pedidos" name="Pedidos" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="despachados" name="Despachados" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="pendientes" name="Pendiente Despacho" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 6. Matriz Pivot Jerárquica: Visor de Datos - PEDIDOS VS. DESPACHOS */}
      {(modoVista === "datos" || modoVista === "ambos") && (
        <Card className="overflow-hidden border border-border">
          {/* Cabecera Móvil: Selector de Vista (Tarjetas vs Tabla) */}
          <div className="sm:hidden px-3 py-2 bg-muted/40 border-b border-border/60 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 bg-background/90 p-0.5 rounded-lg border border-border/70 text-xs shadow-2xs">
              <button
                type="button"
                onClick={() => setVistaMovil("tarjetas")}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-bold transition-all",
                  vistaMovil === "tarjetas"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                🗂️ Tarjetas
              </button>
              <button
                type="button"
                onClick={() => setVistaMovil("tabla")}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-bold transition-all",
                  vistaMovil === "tabla"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                📊 Tabla
              </button>
            </div>
            <span className="font-mono text-xs font-bold text-foreground">
              {vendedoresFiltrados.reduce((acc, v) => acc + v.terceros.length, 0)} clientes
            </span>
          </div>

          {/* Aviso deslizar en vista tabla móvil */}
          {vistaMovil === "tabla" && (
            <div className="sm:hidden px-3 py-1.5 bg-amber-500/10 border-b border-amber-500/20 text-[10.5px] text-amber-700 dark:text-amber-300 font-medium">
              ← Desliza horizontalmente para ver la matriz completa →
            </div>
          )}

          {/* VISTA MÓVIL EN TARJETAS (sm:hidden cuando vistaMovil === 'tarjetas') */}
          {vistaMovil === "tarjetas" && (
            <div className="sm:hidden divide-y divide-border/60 max-h-[620px] overflow-y-auto">
              {isLoading ? (
                <div className="py-16 text-center text-sm text-muted-foreground flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                  <span>Cargando matriz de pedidos y salidas por despacho...</span>
                </div>
              ) : vendedoresFiltrados.length === 0 ? (
                <div className="py-16 text-center text-sm text-muted-foreground">
                  No se encontraron pedidos o despachos para los filtros seleccionados.
                </div>
              ) : (
                vendedoresFiltrados.map((v) => (
                  <div key={`movil-vendedor-${v.vendedorNombre}`} className="p-3 bg-muted/10 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-foreground bg-muted/40 px-2.5 py-1.5 rounded-lg border border-border/50">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-primary" />
                        <span>{v.vendedorNombre}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {v.terceros.length} {v.terceros.length === 1 ? "cliente" : "clientes"}
                      </Badge>
                    </div>

                    <div className="space-y-2.5">
                      {v.terceros.map((t) => {
                        const clave = `${v.vendedorNombre}|${t.terceroNombre}`;
                        const estaExpandido = Boolean(busqueda.trim()) || (expandidos[clave] ?? false);
                        const pctDespacho = t.pedidosCantidad > 0
                          ? Math.min(100, Math.round((t.despachosCantidad / t.pedidosCantidad) * 100))
                          : 0;

                        return (
                          <div
                            key={`movil-card-${clave}`}
                            className="bg-card rounded-xl p-3 border border-border/60 shadow-2xs space-y-2.5"
                          >
                            {/* Fila 1: Cliente & Badge Estado */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <h4 className="font-bold text-xs text-foreground leading-snug">
                                  {t.terceroNombre}
                                </h4>
                                <span className="text-[10.5px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <Building2 className="h-3 w-3 text-indigo-500 shrink-0" />
                                  {t.productos.length} {t.productos.length === 1 ? "producto" : "productos"}
                                </span>
                              </div>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full",
                                  t.esPendiente
                                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                                    : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                                )}
                              >
                                {t.esPendiente ? "Pendiente" : "Completado"}
                              </Badge>
                            </div>

                            {/* Fila 2: Cifras Principales */}
                            <div className="flex items-baseline justify-between pt-0.5">
                              <div>
                                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                                  Valor Pedido
                                </span>
                                <span className="text-sm font-extrabold font-mono text-purple-700 dark:text-purple-300">
                                  {formatoHGI(t.pedidosValor)}
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                                  Saldo Pendiente
                                </span>
                                <span
                                  className={cn(
                                    "font-mono font-bold text-xs",
                                    t.esPendiente ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"
                                  )}
                                >
                                  {formatoHGI(t.totalGeneralValor)}
                                </span>
                              </div>
                            </div>

                            {/* Fila 3: Barra de Comparación de Despacho (100% width) */}
                            <div className="bg-muted/30 rounded-xl p-2.5 space-y-1.5 border border-border/50">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-muted-foreground font-medium flex items-center gap-1">
                                  <Package className="h-3 w-3 text-blue-500" />
                                  Despacho: {pctDespacho}%
                                </span>
                                <span className="font-mono text-foreground font-bold">
                                  {t.despachosCantidad.toLocaleString("es-CO")} de {t.pedidosCantidad.toLocaleString("es-CO")} unds
                                </span>
                              </div>
                              <div className="w-full bg-muted/70 h-2.5 rounded-full overflow-hidden flex">
                                <div
                                  className="bg-blue-500 h-full transition-all"
                                  style={{ width: `${pctDespacho}%` }}
                                />
                                {pctDespacho < 100 && (
                                  <div
                                    className="bg-amber-500/60 h-full transition-all"
                                    style={{ width: `${100 - pctDespacho}%` }}
                                  />
                                )}
                              </div>
                            </div>

                            {/* Fila 4: Chips Resumen */}
                            <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-border/40 text-[10px]">
                              <div className="bg-purple-500/10 p-1.5 rounded-lg border border-purple-500/20 text-center">
                                <span className="text-muted-foreground block text-[9px] uppercase font-bold">Pedidos</span>
                                <span className="font-mono font-bold text-purple-700 dark:text-purple-300">
                                  {t.pedidosCantidad.toLocaleString("es-CO")} und
                                </span>
                              </div>
                              <div className="bg-blue-500/10 p-1.5 rounded-lg border border-blue-500/20 text-center">
                                <span className="text-muted-foreground block text-[9px] uppercase font-bold">Despacho</span>
                                <span className="font-mono font-bold text-blue-700 dark:text-blue-300">
                                  {t.despachosCantidad.toLocaleString("es-CO")} und
                                </span>
                              </div>
                              <div className={cn(
                                "p-1.5 rounded-lg border text-center",
                                t.esPendiente
                                  ? "bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-300"
                                  : "bg-muted/40 border-border text-muted-foreground"
                              )}>
                                <span className="block text-[9px] uppercase font-bold">Pendiente</span>
                                <span className="font-mono font-bold">
                                  {t.totalGeneralCantidad.toLocaleString("es-CO")} und
                                </span>
                              </div>
                            </div>

                            {/* Fila 5: Botón Desplegable para ver Productos */}
                            <div className="pt-1">
                              <button
                                type="button"
                                onClick={() => toggleExpandir(clave)}
                                className="w-full flex items-center justify-between text-[11px] text-primary hover:text-primary/80 font-medium py-1 px-2 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors"
                              >
                                <span className="flex items-center gap-1.5">
                                  <Package className="h-3.5 w-3.5" />
                                  {estaExpandido ? "Ocultar productos" : `Ver ${t.productos.length} productos`}
                                </span>
                                {estaExpandido ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                              </button>

                              {estaExpandido && (
                                <div className="mt-2 divide-y divide-border/40 bg-muted/20 rounded-lg p-2 border border-border/50 space-y-2">
                                  {t.productos.map((prod, pIdx) => {
                                    const prodKey = `${clave}|${prod.producto}`;
                                    const tieneSkus = Boolean(prod.skus && prod.skus.length > 0);
                                    const buscaSku = Boolean(
                                      busqueda.trim() &&
                                        prod.skus?.some((s) =>
                                          normalizarTexto(`${s.sku} ${s.talla || ""} ${s.color || ""}`).includes(
                                            normalizarTexto(busqueda.trim())
                                          )
                                        )
                                    );
                                    const estaSkuExpandido = Boolean(skusExpandidos[prodKey] || buscaSku);
                                    const skusAMostrar = soloPendientes
                                      ? (prod.skus || []).filter((s) => s.esPendiente)
                                      : (prod.skus || []);

                                    return (
                                      <div key={`${clave}-${prod.producto}-${pIdx}`} className="pt-2 first:pt-0 space-y-1.5 text-[11px]">
                                        <div className="flex items-start justify-between gap-1.5">
                                          <div>
                                            <button
                                              type="button"
                                              onClick={() => tieneSkus && toggleExpandirSku(prodKey)}
                                              disabled={!tieneSkus}
                                              className={cn(
                                                "flex items-center gap-1.5 font-semibold text-foreground text-left",
                                                tieneSkus ? "hover:text-primary cursor-pointer group" : ""
                                              )}
                                            >
                                              <span className="text-primary group-hover:underline">{prod.producto}</span>
                                              {tieneSkus && (
                                                <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-primary/10 text-primary border-primary/20">
                                                  {prod.skus!.length} SKUs
                                                </Badge>
                                              )}
                                            </button>
                                            {prod.descripcion && (
                                              <span className="text-[10px] text-muted-foreground truncate max-w-[160px] block">
                                                ({prod.descripcion})
                                              </span>
                                            )}
                                            {(prod.talla || prod.color) && (
                                              <div className="flex items-center gap-1 text-[9px] text-muted-foreground mt-0.5">
                                                {prod.talla && <span className="px-1 rounded bg-muted/80">T: {prod.talla}</span>}
                                                {prod.color && <span className="px-1 rounded bg-muted/80">C: {prod.color}</span>}
                                              </div>
                                            )}
                                          </div>
                                          {prod.esPendiente ? (
                                            <Badge variant="outline" className="text-[9px] bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 shrink-0">
                                              Pendiente
                                            </Badge>
                                          ) : (
                                            <Badge variant="outline" className="text-[9px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 shrink-0">
                                              Completado
                                            </Badge>
                                          )}
                                        </div>

                                        <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                                          <span>Ped: {prod.pedidosCantidad} ({formatoHGI(prod.pedidosValor)})</span>
                                          <span>Desp: {prod.despachosCantidad}</span>
                                          <span className={cn("font-bold", prod.esPendiente ? "text-amber-700 dark:text-amber-300" : "")}>
                                            Pend: {prod.totalGeneralCantidad}
                                          </span>
                                        </div>

                                        {/* Desglose de SKUs en Móvil */}
                                        {tieneSkus && (
                                          <div className="pt-0.5">
                                            <button
                                              type="button"
                                              onClick={() => toggleExpandirSku(prodKey)}
                                              className="w-full flex items-center justify-between text-[10px] font-medium py-1 px-2 rounded bg-primary/5 hover:bg-primary/10 text-primary transition-colors cursor-pointer"
                                            >
                                              <span className="flex items-center gap-1">
                                                <Tag className="h-3 w-3" />
                                                {estaSkuExpandido
                                                  ? "Ocultar desglose de SKUs"
                                                  : `Ver ${skusAMostrar.length} SKUs ${soloPendientes ? "pendientes" : ""}`}
                                              </span>
                                              {estaSkuExpandido ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                            </button>

                                            {estaSkuExpandido && (
                                              <div className="mt-1 space-y-1.5 pl-2 border-l-2 border-primary/30 py-1">
                                                {skusAMostrar.length === 0 ? (
                                                  <div className="text-[10px] italic text-muted-foreground">
                                                    No hay SKUs pendientes para esta referencia.
                                                  </div>
                                                ) : (
                                                  skusAMostrar.map((s, sIdx) => (
                                                    <div
                                                      key={`${prodKey}-m-sku-${s.sku}-${sIdx}`}
                                                      className={`p-1.5 rounded border text-[10.5px] space-y-0.5 font-mono ${
                                                        s.esPendiente
                                                          ? "bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-100"
                                                          : "bg-background/80 border-border/60 text-foreground"
                                                      }`}
                                                    >
                                                      <div className="flex items-center justify-between font-bold">
                                                        <span className="text-foreground tracking-tight">{s.sku}</span>
                                                        {s.esPendiente ? (
                                                          <span className="px-1.5 py-0.2 rounded text-[8.5px] bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/40">
                                                            {s.totalGeneralCantidad} Pend
                                                          </span>
                                                        ) : (
                                                          <span className="px-1.5 py-0.2 rounded text-[8.5px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                                            Listo
                                                          </span>
                                                        )}
                                                      </div>
                                                      {(s.talla || s.color) && (
                                                        <div className="flex items-center gap-2 text-[9px] text-muted-foreground font-sans">
                                                          {s.talla && <span>Talla: <b className="text-foreground">{s.talla}</b></span>}
                                                          {s.color && <span>Color: <b className="text-foreground">{s.color}</b></span>}
                                                        </div>
                                                      )}
                                                      <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                                                        <span>Ped: {s.pedidosCantidad}</span>
                                                        <span>Desp: {s.despachosCantidad}</span>
                                                        <span className={s.esPendiente ? "font-bold text-amber-700 dark:text-amber-300" : ""}>
                                                          Saldo: {s.totalGeneralCantidad}
                                                        </span>
                                                      </div>
                                                    </div>
                                                  ))
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* VISTA TABLA CLÁSICA (hidden sm:block cuando vistaMovil === 'tarjetas') */}
          <div className={`overflow-x-auto touch-pan ${vistaMovil === "tabla" ? "block" : "hidden sm:block"}`}>
            {isLoading ? (
              <div className="py-16 text-center text-sm text-muted-foreground flex flex-col items-center justify-center gap-2">
                <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                <span>Cargando matriz de pedidos y salidas por despacho...</span>
              </div>
            ) : vendedoresFiltrados.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">
                No se encontraron pedidos o despachos para los filtros seleccionados.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                {/* Encabezado Doble Nivel Estilo HGI */}
                <thead>
                  {/* Nivel 1: Columnas de Dimensiones y Agrupador Transacción */}
                  <tr className="bg-muted/80 border-b border-border/80 text-[11px] font-bold text-foreground">
                    <th className="py-2.5 px-3 border-r border-border/60 min-w-[160px]">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-primary" />
                        <span>Vendedor</span>
                      </div>
                    </th>
                    <th className="py-2.5 px-3 border-r border-border/60 min-w-[200px]">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-indigo-500" />
                        <span>Tercero (Cliente)</span>
                      </div>
                    </th>
                    <th className="py-2.5 px-3 border-r border-border/80 min-w-[140px]">
                      <div className="flex items-center gap-1.5">
                        <Package className="h-3.5 w-3.5 text-cyan-500" />
                        <span>Producto</span>
                      </div>
                    </th>

                    {/* Grupo Transacción: PEDIDOS */}
                    <th
                      colSpan={2}
                      className="py-2 px-3 text-center bg-purple-500/15 text-purple-700 dark:text-purple-300 border-r border-border/80 uppercase tracking-wider font-extrabold"
                    >
                      PEDIDOS
                    </th>

                    {/* Grupo Transacción: SALIDA POR DESPACHO */}
                    <th
                      colSpan={2}
                      className="py-2 px-3 text-center bg-blue-500/15 text-blue-700 dark:text-blue-300 border-r border-border/80 uppercase tracking-wider font-extrabold"
                    >
                      SALIDA POR DESPACHO
                    </th>

                    {/* Grupo Transacción: Total General (Pendiente) */}
                    <th
                      colSpan={2}
                      className="py-2 px-3 text-center bg-amber-500/20 text-amber-800 dark:text-amber-200 uppercase tracking-wider font-extrabold"
                    >
                      Total General (Pendiente)
                    </th>
                  </tr>

                  {/* Nivel 2: Subcolumnas de Cantidad y Valor */}
                  <tr className="bg-muted/50 border-b-2 border-border text-[10.5px] font-semibold text-muted-foreground uppercase">
                    <th className="py-1.5 px-3 border-r border-border/60"></th>
                    <th className="py-1.5 px-3 border-r border-border/60"></th>
                    <th className="py-1.5 px-3 border-r border-border/80"></th>

                    {/* Subcolumnas PEDIDOS */}
                    <th className="py-1.5 px-3 text-right border-r border-border/40 font-mono">Cantidad</th>
                    <th className="py-1.5 px-3 text-right border-r border-border/80 font-mono">Valor ($)</th>

                    {/* Subcolumnas SALIDA POR DESPACHO */}
                    <th className="py-1.5 px-3 text-right border-r border-border/40 font-mono">Cantidad</th>
                    <th className="py-1.5 px-3 text-right border-r border-border/80 font-mono">Valor ($)</th>

                    {/* Subcolumnas Total General */}
                    <th className="py-1.5 px-3 text-right border-r border-border/40 font-mono font-bold text-foreground">
                      Cantidad
                    </th>
                    <th className="py-1.5 px-3 text-right font-mono font-bold text-foreground">Valor ($)</th>
                  </tr>
                </thead>

                {/* Cuerpo de la Tabla Jerárquica */}
                <tbody className="divide-y divide-border/40">
                  {vendedoresFiltrados.map((v) => (
                    <React.Fragment key={v.vendedorNombre}>
                      {/* Filas de Terceros y Productos bajo este Vendedor */}
                      {v.terceros.map((t) => {
                        const clave = `${v.vendedorNombre}|${t.terceroNombre}`;
                        const estaExpandido = Boolean(busqueda.trim()) || (expandidos[clave] ?? true); // Expandido si hay búsqueda o por defecto para visibilidad inmediata

                        return (
                          <React.Fragment key={clave}>
                            {/* Productos individuales si está expandido */}
                            {estaExpandido &&
                              t.productos.map((p, idx) => {
                                const prodKey = `${clave}|${p.producto}`;
                                const tieneSkus = Boolean(p.skus && p.skus.length > 0);
                                const buscaSku = Boolean(
                                  busqueda.trim() &&
                                    p.skus?.some((s) =>
                                      normalizarTexto(`${s.sku} ${s.talla || ""} ${s.color || ""}`).includes(
                                        normalizarTexto(busqueda.trim())
                                      )
                                    )
                                );
                                const estaSkuExpandido = Boolean(skusExpandidos[prodKey] || buscaSku);
                                const skusAMostrar = soloPendientes
                                  ? (p.skus || []).filter((s) => s.esPendiente)
                                  : (p.skus || []);

                                return (
                                  <React.Fragment key={`${clave}|${p.producto}|${idx}`}>
                                    <tr
                                      className={`hover:bg-muted/20 transition-colors ${
                                        p.esPendiente ? "bg-amber-500/5 dark:bg-amber-500/10" : ""
                                      } ${estaSkuExpandido ? "border-b-0" : ""}`}
                                    >
                                      {/* Columna Vendedor: se muestra solo en la primera fila o espacio en blanco */}
                                      <td className="py-1.5 px-3 border-r border-border/40 font-medium text-muted-foreground whitespace-nowrap">
                                        {idx === 0 ? v.vendedorNombre : ""}
                                      </td>

                                      {/* Columna Tercero con Botón de Colapso */}
                                      <td className="py-1.5 px-3 border-r border-border/40 font-medium text-foreground whitespace-nowrap">
                                        {idx === 0 ? (
                                          <div className="flex items-center gap-1.5">
                                            <button
                                              type="button"
                                              onClick={() => toggleExpandir(clave)}
                                              className="p-0.5 rounded hover:bg-muted text-muted-foreground"
                                              title={estaExpandido ? "Contraer productos" : "Expandir productos"}
                                            >
                                              {estaExpandido ? (
                                                <ChevronDown className="h-3.5 w-3.5 text-primary" />
                                              ) : (
                                                <ChevronRight className="h-3.5 w-3.5" />
                                              )}
                                            </button>
                                            <span className="font-semibold">{t.terceroNombre}</span>
                                          </div>
                                        ) : (
                                          ""
                                        )}
                                      </td>

                                      {/* Columna Producto (Código interactivo para ver SKUs, descripción, talla, color) */}
                                      <td className="py-1.5 px-3 border-r border-border/80 font-mono text-foreground">
                                        <div className="flex flex-col gap-0.5">
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <button
                                              type="button"
                                              onClick={() => tieneSkus && toggleExpandirSku(prodKey)}
                                              disabled={!tieneSkus}
                                              className={cn(
                                                "inline-flex items-center gap-1 font-semibold text-primary transition-colors text-left",
                                                tieneSkus
                                                  ? "hover:text-primary/80 hover:underline cursor-pointer group"
                                                  : "cursor-default"
                                              )}
                                              title={
                                                tieneSkus
                                                  ? estaSkuExpandido
                                                    ? "Ocultar desglose de SKUs"
                                                    : "Clic para ver SKUs individuales (tallas y colores)"
                                                  : undefined
                                              }
                                            >
                                              {tieneSkus && (
                                                estaSkuExpandido ? (
                                                  <ChevronDown className="h-3 w-3 text-primary shrink-0" />
                                                ) : (
                                                  <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:text-primary shrink-0" />
                                                )
                                              )}
                                              <span>{p.producto}</span>
                                            </button>

                                            {p.descripcion && (
                                              <span className="text-[10px] text-muted-foreground truncate max-w-[180px]" title={p.descripcion}>
                                                ({p.descripcion})
                                              </span>
                                            )}

                                            {tieneSkus && (
                                              <button
                                                type="button"
                                                onClick={() => toggleExpandirSku(prodKey)}
                                                className={cn(
                                                  "inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9.5px] font-sans font-medium transition-all cursor-pointer border",
                                                  estaSkuExpandido
                                                    ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                                                    : "bg-primary/10 hover:bg-primary/20 text-primary border-primary/25"
                                                )}
                                                title="Clic para ver desglose de SKUs pendientes de esta referencia"
                                              >
                                                <Tag className="h-2.5 w-2.5" />
                                                <span>{p.skus!.length} {p.skus!.length === 1 ? "SKU" : "SKUs"}</span>
                                                {p.skus!.some((s) => s.esPendiente) && (
                                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                                )}
                                              </button>
                                            )}
                                          </div>

                                          {(p.talla || p.color) && (
                                            <div className="flex items-center gap-1 text-[9px] flex-wrap">
                                              {p.talla && (
                                                <span className="px-1 py-0.2 rounded bg-muted/70 text-muted-foreground border border-border/40 font-sans">
                                                  T: {p.talla}
                                                </span>
                                              )}
                                              {p.color && (
                                                <span className="px-1 py-0.2 rounded bg-muted/70 text-muted-foreground border border-border/40 font-sans">
                                                  C: {p.color}
                                                </span>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </td>

                                      {/* Pedidos */}
                                      <td className="py-1.5 px-3 text-right font-mono border-r border-border/40">
                                        {p.pedidosCantidad > 0 ? p.pedidosCantidad.toLocaleString("es-CO") : "0"}
                                      </td>
                                      <td className="py-1.5 px-3 text-right font-mono border-r border-border/80">
                                        {p.pedidosValor > 0 ? formatoHGI(p.pedidosValor) : "0.00"}
                                      </td>

                                      {/* Salidas por Despacho */}
                                      <td className="py-1.5 px-3 text-right font-mono border-r border-border/40 text-blue-600 dark:text-blue-400">
                                        {p.despachosCantidad !== 0 ? p.despachosCantidad.toLocaleString("es-CO") : ""}
                                      </td>
                                      <td className="py-1.5 px-3 text-right font-mono border-r border-border/80 text-blue-600 dark:text-blue-400">
                                        {p.despachosValor !== 0 ? formatoHGI(p.despachosValor) : ""}
                                      </td>

                                      {/* Total General (Pendiente) */}
                                      <td
                                        className={`py-1.5 px-3 text-right font-mono font-bold border-r border-border/40 ${
                                          p.esPendiente
                                            ? "text-amber-700 dark:text-amber-400 bg-amber-500/10"
                                            : "text-muted-foreground"
                                        }`}
                                      >
                                        <div className="flex items-center justify-end gap-1">
                                          <span>{p.totalGeneralCantidad.toLocaleString("es-CO")}</span>
                                          {p.esPendiente ? (
                                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/30">
                                              Pend
                                            </span>
                                          ) : (
                                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-500/30">
                                              Listo
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                      <td
                                        className={`py-1.5 px-3 text-right font-mono font-bold ${
                                          p.esPendiente
                                            ? "text-amber-700 dark:text-amber-400 bg-amber-500/10"
                                            : "text-muted-foreground"
                                        }`}
                                      >
                                        {formatoHGI(p.totalGeneralValor)}
                                      </td>
                                    </tr>

                                    {/* Subfilas de Desglose de SKUs al dar Clic */}
                                    {estaSkuExpandido && (
                                      skusAMostrar.length === 0 ? (
                                        <tr className="bg-amber-500/5 text-[10.5px] italic text-muted-foreground border-b border-border/40">
                                          <td className="py-1 px-3 border-r border-border/40"></td>
                                          <td className="py-1 px-3 border-r border-border/40"></td>
                                          <td colSpan={7} className="py-1 px-4 text-amber-700/80 dark:text-amber-400/80">
                                            ↳ No hay SKUs pendientes registrados para esta referencia.
                                          </td>
                                        </tr>
                                      ) : (
                                        skusAMostrar.map((skuItem, sIdx) => (
                                          <tr
                                            key={`${prodKey}|sku|${skuItem.sku}|${sIdx}`}
                                            className={`text-[11px] border-b border-border/30 transition-colors ${
                                              skuItem.esPendiente
                                                ? "bg-amber-500/10 dark:bg-amber-500/15 hover:bg-amber-500/20"
                                                : "bg-muted/15 dark:bg-muted/20 hover:bg-muted/30"
                                            }`}
                                          >
                                            {/* Columna Vendedor */}
                                            <td className="py-1 px-3 border-r border-border/40"></td>

                                            {/* Columna Tercero */}
                                            <td className="py-1 px-3 border-r border-border/40"></td>

                                            {/* Columna Producto (SKU con sangría) */}
                                            <td className="py-1 px-3 border-r border-border/80 font-mono">
                                              <div className="flex items-center gap-2 pl-4">
                                                <span className="text-muted-foreground select-none font-bold text-xs">↳</span>
                                                <span className="font-semibold text-foreground tracking-tight">
                                                  {skuItem.sku}
                                                </span>
                                                {(skuItem.talla || skuItem.color) && (
                                                  <div className="flex items-center gap-1 text-[9.5px]">
                                                    {skuItem.talla && (
                                                      <span className="px-1 py-0.2 rounded bg-background/90 text-foreground border border-border/60 font-sans font-medium">
                                                        T: {skuItem.talla}
                                                      </span>
                                                    )}
                                                    {skuItem.color && (
                                                      <span className="px-1 py-0.2 rounded bg-background/90 text-foreground border border-border/60 font-sans font-medium">
                                                        C: {skuItem.color}
                                                      </span>
                                                    )}
                                                  </div>
                                                )}
                                              </div>
                                            </td>

                                            {/* Pedidos Cantidad */}
                                            <td className="py-1 px-3 text-right font-mono border-r border-border/40 text-purple-700 dark:text-purple-300">
                                              {skuItem.pedidosCantidad > 0 ? skuItem.pedidosCantidad.toLocaleString("es-CO") : "0"}
                                            </td>

                                            {/* Pedidos Valor */}
                                            <td className="py-1 px-3 text-right font-mono border-r border-border/80 text-muted-foreground">
                                              {skuItem.pedidosValor > 0 ? formatoHGI(skuItem.pedidosValor) : "0.00"}
                                            </td>

                                            {/* Salida por Despacho Cantidad */}
                                            <td className="py-1 px-3 text-right font-mono border-r border-border/40 text-blue-600 dark:text-blue-400">
                                              {skuItem.despachosCantidad !== 0 ? skuItem.despachosCantidad.toLocaleString("es-CO") : ""}
                                            </td>

                                            {/* Salida por Despacho Valor */}
                                            <td className="py-1 px-3 text-right font-mono border-r border-border/80 text-blue-600 dark:text-blue-400">
                                              {skuItem.despachosValor !== 0 ? formatoHGI(skuItem.despachosValor) : ""}
                                            </td>

                                            {/* Total General (Pendiente) Cantidad */}
                                            <td
                                              className={`py-1 px-3 text-right font-mono font-bold border-r border-border/40 ${
                                                skuItem.esPendiente
                                                  ? "text-amber-700 dark:text-amber-400 bg-amber-500/15"
                                                  : "text-muted-foreground"
                                              }`}
                                            >
                                              <div className="flex items-center justify-end gap-1">
                                                <span>{skuItem.totalGeneralCantidad.toLocaleString("es-CO")}</span>
                                                {skuItem.esPendiente ? (
                                                  <span className="text-[8.5px] px-1 py-0.2 rounded bg-amber-500/25 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/40">
                                                    Pend
                                                  </span>
                                                ) : (
                                                  <span className="text-[8.5px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-medium border border-emerald-500/30">
                                                    Listo
                                                  </span>
                                                )}
                                              </div>
                                            </td>

                                            {/* Total General (Pendiente) Valor */}
                                            <td
                                              className={`py-1 px-3 text-right font-mono font-semibold ${
                                                skuItem.esPendiente
                                                  ? "text-amber-700 dark:text-amber-400 bg-amber-500/15"
                                                  : "text-muted-foreground"
                                              }`}
                                            >
                                              {skuItem.totalGeneralValor > 0 ? formatoHGI(skuItem.totalGeneralValor) : "0.00"}
                                            </td>
                                          </tr>
                                        ))
                                      )
                                    )}
                                  </React.Fragment>
                                );
                              })}

                            {/* Fila de Subtotal por Tercero (como 'AME DISEÑOS S.A.S. Total' en la imagen) */}
                            {mostrarSubtotalesColumna && (
                              <tr
                                className={`border-b border-border/80 font-semibold ${
                                  t.esPendiente ? "bg-amber-500/15 dark:bg-amber-500/20" : "bg-muted/40"
                                }`}
                              >
                                <td className="py-2 px-3 border-r border-border/40 text-muted-foreground">
                                  {!estaExpandido ? v.vendedorNombre : ""}
                                </td>
                                <td className="py-2 px-3 border-r border-border/40 text-foreground" colSpan={2}>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                      {!estaExpandido && (
                                        <button
                                          type="button"
                                          onClick={() => toggleExpandir(clave)}
                                          className="p-0.5 rounded hover:bg-muted text-muted-foreground"
                                        >
                                          <ChevronRight className="h-3.5 w-3.5" />
                                        </button>
                                      )}
                                      <span className="font-bold">{t.terceroNombre} Total</span>
                                    </div>
                                    <span className="text-[10px] text-muted-foreground font-normal">
                                      ({t.productos.length} {t.productos.length === 1 ? "ítem" : "ítems"})
                                    </span>
                                  </div>
                                </td>

                                {/* Subtotales Pedidos */}
                                <td className="py-2 px-3 text-right font-mono font-bold text-purple-700 dark:text-purple-300 border-r border-border/40">
                                  {t.pedidosCantidad.toLocaleString("es-CO")}
                                </td>
                                <td className="py-2 px-3 text-right font-mono font-bold text-purple-700 dark:text-purple-300 border-r border-border/80">
                                  {formatoHGI(t.pedidosValor)}
                                </td>

                                {/* Subtotales Salidas */}
                                <td className="py-2 px-3 text-right font-mono font-bold text-blue-700 dark:text-blue-300 border-r border-border/40">
                                  {t.despachosCantidad !== 0 ? t.despachosCantidad.toLocaleString("es-CO") : ""}
                                </td>
                                <td className="py-2 px-3 text-right font-mono font-bold text-blue-700 dark:text-blue-300 border-r border-border/80">
                                  {t.despachosValor !== 0 ? formatoHGI(t.despachosValor) : ""}
                                </td>

                                {/* Subtotales Total General */}
                                <td
                                  className={`py-2 px-3 text-right font-mono font-extrabold border-r border-border/40 ${
                                    t.esPendiente
                                      ? "text-amber-800 dark:text-amber-200 bg-amber-500/25"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  {t.totalGeneralCantidad.toLocaleString("es-CO")}
                                </td>
                                <td
                                  className={`py-2 px-3 text-right font-mono font-extrabold ${
                                    t.esPendiente
                                      ? "text-amber-800 dark:text-amber-200 bg-amber-500/25"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  {formatoHGI(t.totalGeneralValor)}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}

                      {/* Subtotal del Vendedor si hay más de 1 vendedor o para separar grupos */}
                      {mostrarSubtotalesFila && (
                        <tr className="bg-muted/70 border-b-2 border-border font-bold text-[11.5px]">
                          <td className="py-2.5 px-3 border-r border-border/60 text-primary" colSpan={3}>
                            <div className="flex items-center gap-1.5">
                              <User className="h-4 w-4" />
                              <span>SUBTOTAL ASESOR: {v.vendedorNombre}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono border-r border-border/40 text-purple-700 dark:text-purple-300">
                            {v.pedidosCantidad.toLocaleString("es-CO")}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono border-r border-border/80 text-purple-700 dark:text-purple-300">
                            {formatoHGI(v.pedidosValor)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono border-r border-border/40 text-blue-700 dark:text-blue-300">
                            {v.despachosCantidad !== 0 ? v.despachosCantidad.toLocaleString("es-CO") : ""}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono border-r border-border/80 text-blue-700 dark:text-blue-300">
                            {v.despachosValor !== 0 ? formatoHGI(v.despachosValor) : ""}
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right font-mono border-r border-border/40 ${
                              v.esPendiente
                                ? "text-amber-800 dark:text-amber-200 bg-amber-500/20"
                                : "text-muted-foreground"
                            }`}
                          >
                            {v.totalGeneralCantidad.toLocaleString("es-CO")}
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right font-mono ${
                              v.esPendiente
                                ? "text-amber-800 dark:text-amber-200 bg-amber-500/20"
                                : "text-muted-foreground"
                            }`}
                          >
                            {formatoHGI(v.totalGeneralValor)}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>

                {/* Totales Generales de la Fila (Pie de tabla) */}
                {mostrarTotalesFila && kpis && (
                  <tfoot>
                    <tr className="bg-primary/10 border-t-2 border-primary/40 font-extrabold text-xs text-foreground">
                      <td className="py-3 px-3 border-r border-border" colSpan={3}>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                          <span>
                            {busqueda.trim()
                              ? "TOTAL FILTRADO POR BÚSQUEDA"
                              : "TOTAL GENERAL CONSOLIDADO"}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-purple-700 dark:text-purple-300 border-r border-border/40">
                        {kpis.totalPedidosCantidad.toLocaleString("es-CO")}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-purple-700 dark:text-purple-300 border-r border-border">
                        {formatoHGI(kpis.totalPedidosValor)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-blue-700 dark:text-blue-300 border-r border-border/40">
                        {kpis.totalDespachosCantidad.toLocaleString("es-CO")}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-blue-700 dark:text-blue-300 border-r border-border">
                        {formatoHGI(kpis.totalDespachosValor)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-amber-700 dark:text-amber-300 bg-amber-500/20 border-r border-border/40">
                        {kpis.totalPendienteCantidad.toLocaleString("es-CO")}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-amber-700 dark:text-amber-300 bg-amber-500/20">
                        {formatoHGI(kpis.totalPendienteValor)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
export default VisorPedidosDespachos;
