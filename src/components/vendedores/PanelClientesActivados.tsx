import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  obtenerClientesPorVendedor,
  ClienteActivadoItem,
  ResumenClientesVendedor,
  FiltrosBI,
  CatalogoItem,
} from "@/lib/ventas-api";
import { formatoCOPFull } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Search,
  Download,
  TrendingUp,
  TrendingDown,
  UserCheck,
  UserPlus,
  RefreshCw,
  ShoppingBag,
  DollarSign,
  Receipt,
  Sparkles,
} from "lucide-react";

interface PanelClientesActivadosProps {
  filtros: FiltrosBI;
  vendedoresDisponibles?: CatalogoItem[];
  vendedorSeleccionadoId?: number | null;
  onSelectVendedor?: (vendedorId: number | null) => void;
  terceroSeleccionadoId?: number | null;
  onSelectTercero?: (terceroId: number | null) => void;
}

export function PanelClientesActivados({
  filtros,
  vendedoresDisponibles = [],
  vendedorSeleccionadoId,
  onSelectVendedor,
  terceroSeleccionadoId,
  onSelectTercero,
}: PanelClientesActivadosProps) {
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<"todos" | "Nuevo" | "Crecimiento" | "Decrecimiento">("todos");
  const [vendedorFiltroLocal, setVendedorFiltroLocal] = useState<string>(
    vendedorSeleccionadoId ? String(vendedorSeleccionadoId) : "todos"
  );
  const [clienteFiltroLocal, setClienteFiltroLocal] = useState<string>(
    terceroSeleccionadoId ? String(terceroSeleccionadoId) : (filtros.tercero_id ? String(filtros.tercero_id) : "todos")
  );

  React.useEffect(() => {
    if (vendedorSeleccionadoId) {
      setVendedorFiltroLocal(String(vendedorSeleccionadoId));
    } else {
      setVendedorFiltroLocal("todos");
    }
  }, [vendedorSeleccionadoId]);

  React.useEffect(() => {
    if (terceroSeleccionadoId) {
      setClienteFiltroLocal(String(terceroSeleccionadoId));
    } else if (filtros.tercero_id) {
      setClienteFiltroLocal(String(filtros.tercero_id));
    } else {
      setClienteFiltroLocal("todos");
    }
  }, [terceroSeleccionadoId, filtros.tercero_id]);

  // Filtros para la consulta (obtiene todos los clientes del asesor para permitir filtrado local instantáneo)
  const filtrosEfectivos = useMemo<FiltrosBI>(() => {
    const vId = vendedorFiltroLocal !== "todos" ? Number(vendedorFiltroLocal) : filtros.vendedor_id;
    return {
      ...filtros,
      vendedor_id: vId,
      tercero_id: undefined,
      tercero_ids: undefined,
    };
  }, [filtros, vendedorFiltroLocal]);

  const { data, isLoading, isFetching, refetch } = useQuery<ResumenClientesVendedor>({
    queryKey: ["clientes-activados-vendedor", filtrosEfectivos],
    queryFn: () => obtenerClientesPorVendedor(filtrosEfectivos),
  });

  // Lista única de clientes disponibles para el selector
  const clientesDisponibles = useMemo(() => {
    if (!data?.clientes) return [];
    const map = new Map<number, string>();
    for (const c of data.clientes) {
      if (c.terceroId && !map.has(c.terceroId)) {
        map.set(c.terceroId, c.terceroNombre);
      }
    }
    return Array.from(map.entries())
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [data?.clientes]);

  // Filtrado local por búsqueda, cliente y estado
  const clientesFiltrados = useMemo(() => {
    if (!data?.clientes) return [];
    let list = data.clientes;

    if (clienteFiltroLocal !== "todos") {
      const cId = Number(clienteFiltroLocal);
      list = list.filter((c) => c.terceroId === cId);
    }

    if (filtroEstado !== "todos") {
      list = list.filter((c) => c.estadoCliente === filtroEstado);
    }

    if (busqueda.trim()) {
      const b = busqueda.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.terceroNombre.toLowerCase().includes(b) ||
          (c.terceroCodigo && c.terceroCodigo.toLowerCase().includes(b)) ||
          c.vendedorNombre.toLowerCase().includes(b)
      );
    }

    return list;
  }, [data?.clientes, clienteFiltroLocal, filtroEstado, busqueda]);

  // Exportar a CSV
  const exportarCSV = () => {
    if (!clientesFiltrados || clientesFiltrados.length === 0) return;

    const lineas = [
      "Cliente,NIT_Codigo,Vendedor,Venta_Actual_COP,Venta_Anterior_COP,Crecimiento_Venta_YoY_Pct,Unidades_Actuales,Unidades_Anteriores,Crecimiento_Unidades_YoY_Pct,Transacciones,Ticket_Promedio_COP,Estado",
    ];

    for (const c of clientesFiltrados) {
      lineas.push(
        `"${c.terceroNombre}","${c.terceroCodigo || ""}","${c.vendedorNombre}","${c.ventaActual}","${c.ventaAnterior}","${c.crecimientoYoY}%","${c.unidadesActuales}","${c.unidadesAnteriores}","${c.crecimientoUnidadesYoY}%","${c.transacciones}","${c.ticketPromedio}","${c.estadoCliente}"`
      );
    }

    const blob = new Blob([lineas.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Clientes_Activados_Asesores_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const kpis = useMemo(() => {
    if (!data?.kpis) return null;
    if (clienteFiltroLocal === "todos" && filtroEstado === "todos" && !busqueda.trim()) {
      return data.kpis;
    }
    const totalClientes = clientesFiltrados.length;
    const clientesNuevos = clientesFiltrados.filter((c) => c.estadoCliente === "NUEVO").length;
    const ventaTotal = clientesFiltrados.reduce((acc, c) => acc + c.ventaActual, 0);
    const ventaAnteriorTotal = clientesFiltrados.reduce((acc, c) => acc + c.ventaAnterior, 0);
    const crecimientoYoYPct = ventaAnteriorTotal > 0
      ? ((ventaTotal - ventaAnteriorTotal) / ventaAnteriorTotal) * 100
      : ventaTotal > 0 ? 100 : 0;
    const unidadesTotal = clientesFiltrados.reduce((acc, c) => acc + c.unidadesActuales, 0);
    const transaccionesTotal = clientesFiltrados.reduce((acc, c) => acc + c.transacciones, 0);
    const ticketPromedioGlobal = transaccionesTotal > 0 ? Math.round(ventaTotal / transaccionesTotal) : 0;

    return {
      totalClientes,
      clientesNuevos,
      clientesCrecimiento: clientesFiltrados.filter((c) => c.estadoCliente === "CRECIMIENTO").length,
      clientesDecrecimiento: clientesFiltrados.filter((c) => c.estadoCliente === "DECRECIMIENTO").length,
      ventaTotal,
      ventaAnteriorTotal,
      crecimientoYoYPct,
      unidadesTotal,
      unidadesAnteriorTotal: clientesFiltrados.reduce((acc, c) => acc + c.unidadesAnteriores, 0),
      ticketPromedioGlobal,
    };
  }, [data?.kpis, clientesFiltrados, clienteFiltroLocal, filtroEstado, busqueda]);

  return (
    <Card className="border border-border/80 shadow-sm bg-card/95 backdrop-blur-sm overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/60">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <UserCheck className="h-4 w-4 text-primary" />
              <span>Panel de Clientes Activados por Asesor Comercial</span>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Monitorea qué clientes facturó cada vendedor, con comparadores directos de ventas, unidades, crecimiento y tickets.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="h-8 px-2.5 text-xs rounded-xl"
              title="Actualizar datos"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? "animate-spin text-primary" : ""}`} />
              <span>Refrescar</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={exportarCSV}
              disabled={!clientesFiltrados || clientesFiltrados.length === 0}
              className="h-8 px-2.5 text-xs rounded-xl font-semibold"
            >
              <Download className="h-3.5 w-3.5 mr-1.5 text-primary" />
              <span>Exportar CSV</span>
            </Button>
          </div>
        </div>

        {/* Tarjetas KPI de Clientes */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3">
          <div className="rounded-xl border border-border/60 bg-background/60 p-2.5">
            <div className="text-[10.5px] font-semibold text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3 text-primary" />
              <span>Clientes Facturando</span>
            </div>
            <div className="text-xs sm:text-sm font-bold text-foreground font-mono mt-0.5">
              {kpis?.totalClientes ?? 0} Clientes
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              En el periodo activo
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-background/60 p-2.5">
            <div className="text-[10.5px] font-semibold text-muted-foreground flex items-center gap-1">
              <UserPlus className="h-3 w-3 text-emerald-500" />
              <span>Clientes Nuevos</span>
            </div>
            <div className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
              {kpis?.clientesNuevos ?? 0} Nuevos
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              Sin facturación previa
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-background/60 p-2.5">
            <div className="text-[10.5px] font-semibold text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-blue-500" />
              <span>Crecimiento YoY</span>
            </div>
            <div className="text-xs sm:text-sm font-bold font-mono mt-0.5">
              <span className={(kpis?.crecimientoYoYPct ?? 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600"}>
                {(kpis?.crecimientoYoYPct ?? 0) >= 0 ? "+" : ""}
                {kpis?.crecimientoYoYPct?.toFixed(2) ?? "0.00"}%
              </span>
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              Vs. Mismo periodo anterior
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-background/60 p-2.5">
            <div className="text-[10.5px] font-semibold text-muted-foreground flex items-center gap-1">
              <Receipt className="h-3 w-3 text-amber-500" />
              <span>Ticket Promedio</span>
            </div>
            <div className="text-xs sm:text-sm font-bold text-foreground font-mono mt-0.5">
              {formatoCOPFull(kpis?.ticketPromedioGlobal ?? 0)}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              Promedio por factura
            </div>
          </div>
        </div>

        {/* Filtros de la tabla */}
        <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente, NIT o asesor..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-8 h-8 text-xs rounded-xl"
              />
            </div>

            {/* Selector de Asesor */}
            <select
              value={vendedorFiltroLocal}
              onChange={(e) => {
                const val = e.target.value;
                setVendedorFiltroLocal(val);
                if (onSelectVendedor) {
                  onSelectVendedor(val === "todos" ? null : Number(val));
                }
              }}
              className="h-8 px-2.5 text-xs rounded-xl bg-background border border-border/80 text-foreground font-medium focus:outline-hidden"
            >
              <option value="todos">Todos los Asesores</option>
              {(data?.vendedoresLista || vendedoresDisponibles).map((v) => (
                <option key={v.id} value={String(v.id)}>
                  {v.nombre}
                </option>
              ))}
            </select>

            {/* Selector de Cliente / Tercero */}
            <select
              value={clienteFiltroLocal}
              onChange={(e) => {
                const val = e.target.value;
                setClienteFiltroLocal(val);
                if (onSelectTercero) {
                  onSelectTercero(val === "todos" ? null : Number(val));
                }
              }}
              className="h-8 px-2.5 text-xs rounded-xl bg-background border border-border/80 text-foreground font-medium focus:outline-hidden max-w-[220px] truncate"
              title="Filtrar por Cliente (Tercero)"
            >
              <option value="todos">
                {clientesDisponibles.length > 0 ? `Todos los Clientes (${clientesDisponibles.length})` : "Todos los Clientes"}
              </option>
              {clientesDisponibles.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Filtros de estado */}
          <div className="inline-flex rounded-xl border border-border/80 bg-muted/40 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setFiltroEstado("todos")}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                filtroEstado === "todos"
                  ? "bg-background text-foreground font-bold shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Todos ({data?.clientes?.length ?? 0})
            </button>
            <button
              type="button"
              onClick={() => setFiltroEstado("Nuevo")}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                filtroEstado === "Nuevo"
                  ? "bg-background text-emerald-600 dark:text-emerald-400 font-bold shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Nuevos ({kpis?.clientesNuevos ?? 0})
            </button>
            <button
              type="button"
              onClick={() => setFiltroEstado("Crecimiento")}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                filtroEstado === "Crecimiento"
                  ? "bg-background text-blue-600 dark:text-blue-400 font-bold shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Creciendo ({kpis?.clientesCrecimiento ?? 0})
            </button>
            <button
              type="button"
              onClick={() => setFiltroEstado("Decrecimiento")}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                filtroEstado === "Decrecimiento"
                  ? "bg-background text-rose-600 font-bold shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Decreciendo ({kpis?.clientesDecrecimiento ?? 0})
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-md border-b text-[11px] font-bold text-foreground">
              <tr>
                <th className="py-2.5 px-3 text-left">Cliente / NIT</th>
                <th className="py-2.5 px-3 text-left">Asesor Responsable</th>
                <th className="py-2.5 px-3 text-right">Venta Actual ($)</th>
                <th className="py-2.5 px-3 text-center min-w-[130px]">Comparador Visual ($)</th>
                <th className="py-2.5 px-3 text-right">Venta Ant ($)</th>
                <th className="py-2.5 px-3 text-right">Unidades</th>
                <th className="py-2.5 px-3 text-right">Crecimiento YoY</th>
                <th className="py-2.5 px-3 text-right">Ticket Prom</th>
                <th className="py-2.5 px-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="h-5 w-5 animate-spin text-primary" />
                      <span>Cargando análisis de clientes activados...</span>
                    </div>
                  </td>
                </tr>
              ) : clientesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground">
                    No se encontraron clientes con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                clientesFiltrados.map((c) => {
                  const maxVenta = Math.max(c.ventaActual, c.ventaAnterior, 1);
                  const pctActual = (c.ventaActual / maxVenta) * 100;
                  const pctAnterior = (c.ventaAnterior / maxVenta) * 100;

                  return (
                    <tr key={`${c.vendedorId}-${c.terceroId}`} className="hover:bg-muted/40 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-foreground truncate max-w-[200px]" title={c.terceroNombre}>
                          {c.terceroNombre}
                        </div>
                        {c.terceroCodigo && (
                          <div className="text-[10px] text-muted-foreground font-mono">
                            NIT: {c.terceroCodigo}
                          </div>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-muted-foreground">
                        <span className="font-medium text-foreground/90">{c.vendedorNombre}</span>
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono font-bold text-foreground">
                        {formatoCOPFull(c.ventaActual)}
                      </td>

                      {/* Comparador Visual de Barra Dual */}
                      <td className="py-2.5 px-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-[9.5px]">
                            <span className="text-muted-foreground w-6">Act:</span>
                            <div className="flex-1 bg-muted/60 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-emerald-500 h-full rounded-full transition-all"
                                style={{ width: `${Math.min(100, Math.max(3, pctActual))}%` }}
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 text-[9.5px]">
                            <span className="text-muted-foreground w-6">Ant:</span>
                            <div className="flex-1 bg-muted/60 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-slate-400 dark:bg-slate-600 h-full rounded-full transition-all"
                                style={{ width: `${Math.min(100, Math.max(0, pctAnterior))}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">
                        {c.ventaAnterior > 0 ? formatoCOPFull(c.ventaAnterior) : "—"}
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono">
                        <div className="font-semibold text-foreground">
                          {c.unidadesActuales.toLocaleString("es-CO")} unds
                        </div>
                        {c.unidadesAnteriores > 0 && (
                          <div className="text-[10px] text-muted-foreground">
                            Ant: {c.unidadesAnteriores.toLocaleString("es-CO")}
                          </div>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono font-bold">
                        <span
                          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10.5px] ${
                            c.crecimientoYoY > 0
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              : c.crecimientoYoY < 0
                              ? "bg-rose-500/15 text-rose-600"
                              : "text-muted-foreground"
                          }`}
                        >
                          {c.crecimientoYoY > 0 ? "+" : ""}
                          {c.crecimientoYoY.toFixed(2)}%
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">
                        {formatoCOPFull(c.ticketPromedio)}
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <Badge
                          variant="outline"
                          className={`text-[9.5px] font-semibold ${
                            c.estadoCliente === "Nuevo"
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                              : c.estadoCliente === "Crecimiento"
                              ? "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30"
                              : "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30"
                          }`}
                        >
                          {c.estadoCliente}
                        </Badge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
