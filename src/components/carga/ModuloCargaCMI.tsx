import React, { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  UploadCloud,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Search,
  TrendingUp,
  DollarSign,
  Package,
  Sparkles,
  RefreshCw,
  ShieldCheck,
  Building2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  parsearArchivoCMI,
  type CMIResultadoParse,
  type CMIItemPreview,
} from "@/lib/cmi-parser";
import {
  guardarMatrizCMIPersonalizada,
  obtenerMetaCMIPersonalizada,
  limpiarMatrizCMIPersonalizada,
  hayCMIPersonalizado,
} from "@/lib/cmi-storage";

function formatoCOP(val: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(val || 0);
}

export function ModuloCargaCMI() {
  const queryClient = useQueryClient();

  const [archivo, setArchivo] = useState<File | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [resultadoParse, setResultadoParse] = useState<CMIResultadoParse | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");

  const [metaGuardada, setMetaGuardada] = useState(() => obtenerMetaCMIPersonalizada());
  const [tienePersonalizado, setTienePersonalizado] = useState(() => hayCMIPersonalizado());

  // Actualizar estado de almacenamiento
  const refrescarEstadoAlmacenamiento = () => {
    setMetaGuardada(obtenerMetaCMIPersonalizada());
    setTienePersonalizado(hayCMIPersonalizado());
  };

  useEffect(() => {
    refrescarEstadoAlmacenamiento();
  }, []);

  const alSeleccionarArchivo = async (file: File | null) => {
    setArchivo(file);
    setErrorCarga(null);
    setResultadoParse(null);

    if (!file) return;

    setProcesando(true);
    try {
      const res = await parsearArchivoCMI(file);
      setResultadoParse(res);
      toast.success(`Archivo "${file.name}" leído correctamente.`, {
        description: `Se detectaron ${res.resumen.vendedoresCount} entidades comerciales y canales. Revisa la vista previa y haz clic en "Aplicar y Sincronizar".`,
      });
    } catch (err: any) {
      console.error("[ModuloCargaCMI] Error parseando CMI:", err);
      const msg = err?.message || "No se pudo interpretar el archivo como Cuadro de Mando Integral.";
      setErrorCarga(msg);
      toast.error("Error al procesar el archivo CMI", { description: msg });
    } finally {
      setProcesando(false);
    }
  };

  const aplicarSincronizacion = () => {
    if (!resultadoParse) return;

    try {
      guardarMatrizCMIPersonalizada(resultadoParse.entidades, resultadoParse.resumen);
      refrescarEstadoAlmacenamiento();

      // Invalidar todas las consultas BI para que los dashboards se actualicen en tiempo real
      queryClient.invalidateQueries({ queryKey: ["bi-"] });
      queryClient.invalidateQueries({ queryKey: ["ventas-"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-"] });

      toast.success("¡Cuadro de Mando Integral sincronizado con éxito!", {
        description: `Se han actualizado las ventas, presupuestos y cumplimientos oficiales de todos los vendedores.`,
      });
    } catch (err: any) {
      console.error("[ModuloCargaCMI] Error al guardar CMI:", err);
      toast.error("Error al guardar la sincronización del CMI");
    }
  };

  const restaurarPredefinido = () => {
    try {
      limpiarMatrizCMIPersonalizada();
      refrescarEstadoAlmacenamiento();
      setResultadoParse(null);
      setArchivo(null);

      queryClient.invalidateQueries({ queryKey: ["bi-"] });
      queryClient.invalidateQueries({ queryKey: ["ventas-"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-"] });

      toast.info("Se ha restaurado el Cuadro de Mando Integral predefinido", {
        description: "El sistema volvió a utilizar la verdad oficial calibrada de código.",
      });
    } catch (err: any) {
      console.error("[ModuloCargaCMI] Error al restaurar:", err);
      toast.error("Error al restaurar");
    }
  };

  const itemsFiltrados = (resultadoParse?.previewVendedores || []).filter((item: CMIItemPreview) => {
    if (!busqueda.trim()) return true;
    return item.nombre.toLowerCase().includes(busqueda.trim().toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* TARJETA DE ESTADO ACTUAL */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-lg bg-primary/10 text-primary mt-0.5">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="font-display text-base text-foreground">
                    Sincronización Automática del Cuadro de Mando Integral (CMI)
                  </CardTitle>
                  {tienePersonalizado ? (
                    <Badge variant="default" className="text-[10px] bg-emerald-600 hover:bg-emerald-600 text-white font-semibold">
                      Archivo Personalizado Activo
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-primary/20 font-semibold">
                      Versión Oficial Calibrada
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-xs mt-1">
                  {tienePersonalizado && metaGuardada ? (
                    <span>
                      Última actualización: <strong>{new Date(metaGuardada.fechaCarga).toLocaleString("es-CO")}</strong> desde{" "}
                      <code>{metaGuardada.nombreArchivo}</code>. Ventas YTD:{" "}
                      <strong className="text-foreground">{formatoCOP(metaGuardada.totalVentas2026)}</strong> | Ppto:{" "}
                      <strong>{formatoCOP(metaGuardada.totalPpto2026)}</strong>.
                    </span>
                  ) : (
                    <span>
                      Actualmente el sistema está sincronizado con la matriz oficial del CMI (Corte 26 de Octubre de 2026).
                      Sube un archivo nuevo en cualquier momento para actualizar automáticamente todas las métricas de la empresa.
                    </span>
                  )}
                </CardDescription>
              </div>
            </div>

            {tienePersonalizado && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs font-semibold gap-1.5 shrink-0 text-muted-foreground hover:text-foreground"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Restaurar CMI Predefinido
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <RefreshCw className="h-5 w-5 text-primary" />
                      ¿Restaurar el CMI predefinido?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-2 text-sm text-muted-foreground">
                      <p>
                        Esta acción quitará el archivo personalizado que subiste y regresará el sistema a la base oficial
                        calibrada de Trucco's.
                      </p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={restaurarPredefinido}>
                      Sí, restaurar predefinido
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* ZONA DE CARGA DE ARCHIVO */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display">Cargar archivo CMI actualizado</CardTitle>
          <CardDescription>
            Sube el archivo Excel (<code>.xlsx</code> / <code>.xls</code>) o <code>.csv</code> del Cuadro de Mando Integral.
            El sistema detecta automáticamente todos los asesores, presupuestos, ventas netas, unidades, devoluciones y cartera.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-6 py-10 text-center transition-colors hover:border-primary/60">
            <UploadCloud className="h-8 w-8 text-primary/70" />
            <span className="font-medium text-foreground">
              {archivo ? archivo.name : "Selecciona o arrastra el archivo de Cuadro de Mando Integral (CMI)"}
            </span>
            <span className="text-xs text-muted-foreground">
              Formatos compatibles: .xlsx (hoja 'CMI'), .xls o .csv exportado de Excel
            </span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              disabled={procesando}
              onChange={(e) => alSeleccionarArchivo(e.target.files?.[0] ?? null)}
            />
          </label>

          {procesando && (
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-2">
              <RefreshCw className="h-4 w-4 animate-spin text-primary" />
              <span>Analizando columnas y métricas del CMI...</span>
            </div>
          )}

          {errorCarga && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error al procesar el archivo CMI</AlertTitle>
              <AlertDescription className="text-xs">{errorCarga}</AlertDescription>
            </Alert>
          )}

          {/* VISTA PREVIA DEL ARCHIVO LEÍDO */}
          {resultadoParse && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg border border-border bg-card">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Venta Neta Total</span>
                  </div>
                  <div className="text-base sm:text-lg font-bold text-foreground">
                    {formatoCOP(resultadoParse.resumen.totalVentas2026)}
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-border bg-card">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <TrendingUp className="h-3.5 w-3.5 text-primary" />
                    <span>Presupuesto Total</span>
                  </div>
                  <div className="text-base sm:text-lg font-bold text-foreground">
                    {formatoCOP(resultadoParse.resumen.totalPpto2026)}
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-border bg-card">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <Package className="h-3.5 w-3.5 text-amber-500" />
                    <span>Unidades Totales</span>
                  </div>
                  <div className="text-base sm:text-lg font-bold text-foreground">
                    {resultadoParse.resumen.totalUnidades2026.toLocaleString("es-CO")}
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-border bg-card">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <Users className="h-3.5 w-3.5 text-blue-500" />
                    <span>Entidades Detectadas</span>
                  </div>
                  <div className="text-base sm:text-lg font-bold text-foreground">
                    {resultadoParse.resumen.vendedoresCount}
                  </div>
                </div>
              </div>

              {/* BARRA DE ACCIÓN PARA SINCRONIZAR */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5">
                <div className="flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>
                    El archivo es válido y está listo para ser aplicado a todos los dashboards de la aplicación.
                  </span>
                </div>
                <Button
                  onClick={aplicarSincronizacion}
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm gap-1.5 shrink-0 w-full sm:w-auto"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Aplicar y Sincronizar CMI
                </Button>
              </div>

              {/* TABLA DE VISTA PREVIA DETALLADA */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-foreground">
                    Vista previa de Vendedores y Canales ({itemsFiltrados.length}):
                  </span>
                  <div className="relative w-48 sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Buscar asesor o canal..."
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      className="pl-8 h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="rounded-md border border-border overflow-hidden">
                  <div className="max-h-80 overflow-y-auto overflow-x-auto text-xs">
                    <table className="w-full text-left">
                      <thead className="sticky top-0 bg-muted/80 backdrop-blur-xs font-semibold text-muted-foreground border-b border-border">
                        <tr>
                          <th className="p-2.5">Entidad / Comercial</th>
                          <th className="p-2.5 text-right">Presupuesto</th>
                          <th className="p-2.5 text-right">Venta Neta</th>
                          <th className="p-2.5 text-right">Cumplimiento</th>
                          <th className="p-2.5 text-right">Crecimiento YoY</th>
                          <th className="p-2.5 text-right">Unidades</th>
                          <th className="p-2.5 text-right">% Dev</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {itemsFiltrados.map((item) => (
                          <tr
                            key={item.nombre}
                            className={`hover:bg-muted/40 transition-colors ${
                              item.esTotal
                                ? "font-bold bg-primary/5"
                                : item.esCanal
                                ? "font-medium bg-muted/20"
                                : ""
                            }`}
                          >
                            <td className="p-2.5 flex items-center gap-1.5">
                              {item.esTotal ? (
                                <Sparkles className="h-3.5 w-3.5 text-primary" />
                              ) : item.esCanal ? (
                                <Building2 className="h-3.5 w-3.5 text-blue-500" />
                              ) : (
                                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                              )}
                              <span>{item.nombre}</span>
                            </td>
                            <td className="p-2.5 text-right">{formatoCOP(item.pptoAcumulado)}</td>
                            <td className="p-2.5 text-right font-semibold text-foreground">
                              {formatoCOP(item.ventaAcumulada)}
                            </td>
                            <td className="p-2.5 text-right">
                              <span
                                className={`font-semibold ${
                                  item.cumplimientoPct >= 100
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : item.cumplimientoPct >= 80
                                    ? "text-amber-600 dark:text-amber-400"
                                    : "text-rose-600 dark:text-rose-400"
                                }`}
                              >
                                {item.cumplimientoPct}%
                              </span>
                            </td>
                            <td className="p-2.5 text-right">
                              <span
                                className={
                                  item.crecimientoYoYPct >= 0
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-rose-600 dark:text-rose-400"
                                }
                              >
                                {item.crecimientoYoYPct >= 0 ? "+" : ""}
                                {item.crecimientoYoYPct}%
                              </span>
                            </td>
                            <td className="p-2.5 text-right">{item.unidadesAcumuladas.toLocaleString("es-CO")}</td>
                            <td className="p-2.5 text-right text-muted-foreground">{item.tasaDevolucionPct}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
