import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Progress } from "@/components/ui/progress";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
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
  Tag,
  UploadCloud,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  DollarSign,
  Package,
  Layers,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  inspeccionarArchivoReferencias,
  parsearTodasLasReferencias,
  ingestarLoteReferencias,
  registrarCargaReferencias,
  obtenerResumenReferencias,
  consultarReferencias,
  purgarReferencias,
  type MetaArchivoReferencias,
  type FilaReferencia,
} from "@/lib/referencias-api";

function formatoCOP(val: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(val || 0);
}

export function ModuloCargaReferencias() {
  const queryClient = useQueryClient();

  const [archivo, setArchivo] = useState<File | null>(null);
  const [metaArchivo, setMetaArchivo] = useState<MetaArchivoReferencias | null>(null);
  const [hojaSeleccionada, setHojaSeleccionada] = useState<string | null>(null);
  const [progreso, setProgreso] = useState<number>(0);
  const [estado, setEstado] = useState<string | null>(null);

  // Filtros del visualizador
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);
  const POR_PAGINA = 15;

  // Consultar métricas y resumen de referencias
  const { data: resumen, isLoading: cResumen } = useQuery({
    queryKey: ["bi-referencias-resumen"],
    queryFn: obtenerResumenReferencias,
  });

  // Consultar tabla de referencias activas
  const { data: catalogo, isLoading: cCatalogo } = useQuery({
    queryKey: ["bi-referencias-catalogo", busqueda, pagina],
    queryFn: () => consultarReferencias(busqueda, pagina, POR_PAGINA),
    staleTime: 30 * 1000,
  });

  // Manejar selección de archivo
  const alSeleccionarArchivo = async (file: File | null) => {
    setArchivo(file);
    setProgreso(0);
    setEstado(null);
    setMetaArchivo(null);
    setHojaSeleccionada(null);

    if (!file) return;

    try {
      const meta = await inspeccionarArchivoReferencias(file);
      setMetaArchivo(meta);
      if (meta.hojaSeleccionada) {
        setHojaSeleccionada(meta.hojaSeleccionada);
      }
    } catch (err: any) {
      toast.error(err.message || "Error al leer el archivo de referencias");
    }
  };

  // Cambiar hoja de Excel
  const alCambiarHoja = async (nombreHoja: string) => {
    if (!archivo) return;
    setHojaSeleccionada(nombreHoja);
    try {
      const meta = await inspeccionarArchivoReferencias(archivo, nombreHoja);
      setMetaArchivo(meta);
    } catch (err: any) {
      toast.error(err.message || "Error al cambiar de hoja");
    }
  };

  // Mutación para procesar e ingestar el catálogo de referencias
  const cargaMutation = useMutation({
    mutationFn: async () => {
      if (!archivo) throw new Error("No hay ningún archivo seleccionado");

      setProgreso(10);
      setEstado("Analizando y leyendo todas las referencias...");

      const { filas } = await parsearTodasLasReferencias(archivo, hojaSeleccionada || undefined);

      if (filas.length === 0) {
        throw new Error("No se encontraron referencias válidas con código en el archivo.");
      }

      setProgreso(30);
      setEstado(`Procesando ${filas.length.toLocaleString("es-CO")} referencias...`);

      // Enviar por lotes de 500 para streaming progresivo
      const TAMANO_LOTE = 500;
      let procesadas = 0;
      let nuevasTotal = 0;
      let actualizadasTotal = 0;

      for (let i = 0; i < filas.length; i += TAMANO_LOTE) {
        const lote = filas.slice(i, i + TAMANO_LOTE);
        const res = await ingestarLoteReferencias(lote);
        procesadas += lote.length;
        nuevasTotal += res.nuevas;
        actualizadasTotal += res.actualizadas;

        const pct = Math.min(95, Math.round(30 + (procesadas / filas.length) * 65));
        setProgreso(pct);
        setEstado(
          `Guardando en base de datos: ${procesadas.toLocaleString("es-CO")} de ${filas.length.toLocaleString("es-CO")} referencias...`
        );
      }

      // Registrar historial de carga
      await registrarCargaReferencias(archivo.name, filas.length, nuevasTotal, actualizadasTotal);

      return { total: filas.length, nuevas: nuevasTotal, actualizadas: actualizadasTotal };
    },
    onSuccess: (res) => {
      setProgreso(100);
      setEstado(null);
      toast.success(
        `Catálogo cargado con éxito: ${res.total.toLocaleString("es-CO")} referencias procesadas.`
      );
      setArchivo(null);
      setMetaArchivo(null);
      queryClient.invalidateQueries({ queryKey: ["bi-referencias-resumen"] });
      queryClient.invalidateQueries({ queryKey: ["bi-referencias-catalogo"] });
    },
    onError: (err: any) => {
      setEstado(null);
      toast.error(err.message || "Error al procesar el catálogo de referencias");
    },
  });

  // Mutación para purgar referencias
  const purgarMutation = useMutation({
    mutationFn: purgarReferencias,
    onSuccess: () => {
      toast.success("Se ha limpiado el catálogo global de referencias.");
      queryClient.invalidateQueries({ queryKey: ["bi-referencias-resumen"] });
      queryClient.invalidateQueries({ queryKey: ["bi-referencias-catalogo"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Error al purgar referencias");
    },
  });

  const totalPaginas = Math.max(1, Math.ceil((catalogo?.total || 0) / POR_PAGINA));

  return (
    <div className="space-y-6">
      {/* TARJETA DE RESUMEN Y MÉTRICAS GLOBALES */}
      <Card className="border-border/80 shadow-xs bg-linear-to-b from-card to-muted/20">
        <CardHeader className="pb-3 border-b border-border/40">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <Tag className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg font-bold text-foreground">
                  Catálogo Global de Referencias (Prendas y Productos)
                </CardTitle>
              </div>
              <CardDescription className="text-xs">
                Base de datos maestra de referencias de la empresa con las 4 columnas clave:{" "}
                <strong className="text-foreground">REF, Nombre, PVM y PVP</strong>. Servirá para
                trazabilidad en el área de diseño y el nuevo análisis de ventas por correría.
              </CardDescription>
            </div>

            {/* Acciones Rápidas */}
            <div className="flex items-center gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={purgarMutation.isPending || (resumen?.totalReferencias || 0) === 0}
                    className="border-rose-500/30 text-rose-600 hover:bg-rose-500/10 text-xs gap-1.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Limpiar Catálogo
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-rose-600">
                      <AlertTriangle className="h-5 w-5" />
                      ¿Eliminar todo el catálogo de referencias?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-2 text-sm text-muted-foreground">
                      <p>
                        Esta acción eliminará las{" "}
                        <strong className="text-foreground font-semibold">
                          {(resumen?.totalReferencias || 0).toLocaleString("es-CO")} referencias
                        </strong>{" "}
                        guardadas en la tabla global.
                      </p>
                      <p>
                        Úsalo si necesitas reiniciar la base antes de subir un archivo nuevo o
                        corregido.
                      </p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => purgarMutation.mutate()}
                      className="bg-rose-600 hover:bg-rose-700 text-white"
                    >
                      Sí, purgar catálogo
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardHeader>

        {/* Pills de Métricas */}
        <CardContent className="pt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-background border border-border/60 shadow-2xs">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
              <Package className="h-3.5 w-3.5 text-indigo-500" />
              <span>Total Referencias</span>
            </div>
            <p className="text-lg font-black text-foreground font-mono mt-1">
              {cResumen ? "..." : (resumen?.totalReferencias || 0).toLocaleString("es-CO")}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Prendas registradas en el sistema</p>
          </div>

          <div className="p-3 rounded-xl bg-background border border-border/60 shadow-2xs">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
              <DollarSign className="h-3.5 w-3.5 text-blue-500" />
              <span>Promedio PVM (Mayorista)</span>
            </div>
            <p className="text-lg font-black text-foreground font-mono mt-1">
              {cResumen ? "..." : formatoCOP(resumen?.precioPromedioPVM || 0)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Precio promedio base mayorista</p>
          </div>

          <div className="p-3 rounded-xl bg-background border border-border/60 shadow-2xs col-span-2 sm:col-span-1">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
              <span>Promedio PVP (Público)</span>
            </div>
            <p className="text-lg font-black text-foreground font-mono mt-1">
              {cResumen ? "..." : formatoCOP(resumen?.precioPromedioPVP || 0)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Precio promedio sugerido al público</p>
          </div>
        </CardContent>
      </Card>

      {/* MÓDULO DE CARGA DE ARCHIVO */}
      <Card className="border-border/80 shadow-xs">
        <CardHeader className="pb-3 border-b border-border/40">
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <UploadCloud className="h-4 w-4 text-primary" />
            Cargar o Actualizar Archivo de Referencias
          </CardTitle>
          <CardDescription className="text-xs">
            Arrastra tu archivo Excel (.xlsx, .xlsm, .xls) o CSV. El sistema detectará las 4 columnas
            automáticamente e insertará las nuevas referencias o actualizará precios y descripciones
            sin duplicar datos.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-4">
          {/* Zona de Dropzone */}
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed border-border/80 bg-muted/20 px-6 py-10 text-center transition-colors hover:border-primary/60 hover:bg-muted/40">
            <div className="p-3 rounded-full bg-primary/10 text-primary">
              <UploadCloud className="h-6 w-6" />
            </div>
            <div>
              <span className="font-semibold text-sm text-foreground block">
                {archivo ? archivo.name : "Selecciona o arrastra el archivo de Referencias"}
              </span>
              <span className="text-xs text-muted-foreground mt-0.5 block">
                Formatos compatibles: .xlsx, .xlsm, .xls o .csv
              </span>
            </div>
            <input
              type="file"
              accept=".xlsx,.xls,.xlsm,.csv"
              className="hidden"
              disabled={cargaMutation.isPending}
              onChange={(e) => alSeleccionarArchivo(e.target.files?.[0] ?? null)}
            />
          </label>

          {/* Selector de Pestaña si es Excel con múltiples hojas */}
          {archivo && metaArchivo?.hojasDisponibles && metaArchivo.hojasDisponibles.length > 1 && (
            <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <FileSpreadsheet className="h-4 w-4 text-primary" />
                  Pestaña de Excel a procesar:
                </span>
                <Badge variant="outline" className="text-[10px]">
                  {metaArchivo.hojasDisponibles.length} pestañas detectadas
                </Badge>
              </div>
              <Select
                value={hojaSeleccionada || ""}
                onValueChange={alCambiarHoja}
                disabled={cargaMutation.isPending}
              >
                <SelectTrigger className="w-full text-xs bg-background">
                  <SelectValue placeholder="Selecciona la pestaña" />
                </SelectTrigger>
                <SelectContent>
                  {metaArchivo.hojasDisponibles.map((h) => (
                    <SelectItem key={h} value={h} className="text-xs">
                      {h}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Reconocimiento de las 4 Columnas Requeridas */}
          {metaArchivo && (
            <div className="rounded-xl border border-border/60 bg-background p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">
                  Mapeo de Columnas Requeridas
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {metaArchivo.totalFilas.toLocaleString("es-CO")} filas estimadas
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {/* REF */}
                <div className="p-2 rounded-lg bg-muted/40 border border-border/60 text-xs">
                  <span className="text-[10px] text-muted-foreground font-semibold block uppercase">
                    1. REF (Obligatoria)
                  </span>
                  {metaArchivo.columnasDetectadas.ref ? (
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                      <CheckCircle2 className="h-3 w-3" />
                      {metaArchivo.columnasDetectadas.ref}
                    </span>
                  ) : (
                    <span className="text-rose-500 font-semibold text-[11px]">No detectada</span>
                  )}
                </div>

                {/* Nombre */}
                <div className="p-2 rounded-lg bg-muted/40 border border-border/60 text-xs">
                  <span className="text-[10px] text-muted-foreground font-semibold block uppercase">
                    2. Nombre
                  </span>
                  {metaArchivo.columnasDetectadas.nombre ? (
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                      <CheckCircle2 className="h-3 w-3" />
                      {metaArchivo.columnasDetectadas.nombre}
                    </span>
                  ) : (
                    <span className="text-amber-500 font-semibold text-[11px]">Opcional (Por defecto)</span>
                  )}
                </div>

                {/* PVM */}
                <div className="p-2 rounded-lg bg-muted/40 border border-border/60 text-xs">
                  <span className="text-[10px] text-muted-foreground font-semibold block uppercase">
                    3. PVM (Mayorista)
                  </span>
                  {metaArchivo.columnasDetectadas.pvm ? (
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                      <CheckCircle2 className="h-3 w-3" />
                      {metaArchivo.columnasDetectadas.pvm}
                    </span>
                  ) : (
                    <span className="text-amber-500 font-semibold text-[11px]">En cero ($0)</span>
                  )}
                </div>

                {/* PVP */}
                <div className="p-2 rounded-lg bg-muted/40 border border-border/60 text-xs">
                  <span className="text-[10px] text-muted-foreground font-semibold block uppercase">
                    4. PVP (Público)
                  </span>
                  {metaArchivo.columnasDetectadas.pvp ? (
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                      <CheckCircle2 className="h-3 w-3" />
                      {metaArchivo.columnasDetectadas.pvp}
                    </span>
                  ) : (
                    <span className="text-amber-500 font-semibold text-[11px]">En cero ($0)</span>
                  )}
                </div>
              </div>

              {/* Previsualización de Filas */}
              {metaArchivo.preview.length > 0 && (
                <div className="pt-2 border-t border-border/50 space-y-1.5">
                  <span className="text-[11px] font-semibold text-muted-foreground block">
                    Vista previa de los primeros registros a cargar:
                  </span>
                  <div className="overflow-x-auto rounded-lg border border-border/60">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/50 text-[10px] text-muted-foreground uppercase border-b border-border/60">
                        <tr>
                          <th className="py-1.5 px-3 font-bold">REF</th>
                          <th className="py-1.5 px-3 font-bold">Nombre</th>
                          <th className="py-1.5 px-3 font-bold text-right">PVM ($)</th>
                          <th className="py-1.5 px-3 font-bold text-right">PVP ($)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {metaArchivo.preview.map((row, idx) => (
                          <tr key={`prev-${idx}`} className="hover:bg-muted/30">
                            <td className="py-1.5 px-3 font-mono font-bold text-foreground">
                              {row.ref}
                            </td>
                            <td className="py-1.5 px-3 text-foreground">{row.nombre}</td>
                            <td className="py-1.5 px-3 text-right font-mono text-blue-600 dark:text-blue-400">
                              {formatoCOP(row.pvm)}
                            </td>
                            <td className="py-1.5 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                              {formatoCOP(row.pvp)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Barra de Progreso */}
          {cargaMutation.isPending && (
            <div className="space-y-2 p-3 rounded-xl bg-primary/5 border border-primary/20">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-primary">{estado}</span>
                <span className="text-foreground font-mono">{progreso}%</span>
              </div>
              <Progress value={progreso} className="h-2" />
            </div>
          )}

          {/* Botón de Iniciar Carga */}
          <Button
            disabled={
              !archivo ||
              cargaMutation.isPending ||
              !metaArchivo?.esValido ||
              !metaArchivo?.columnasDetectadas.ref
            }
            onClick={() => cargaMutation.mutate()}
            className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-sm gap-2"
          >
            <Sparkles className="h-4 w-4" />
            {cargaMutation.isPending ? "Procesando catálogo..." : "Procesar Catálogo de Referencias"}
          </Button>
        </CardContent>
      </Card>

      {/* HISTORIAL Y VISUALIZADOR DE REFERENCIAS EN BASE DE DATOS */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Historial de Cargas de Referencias */}
        <Card className="border-border/80 shadow-xs lg:col-span-1">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Historial de Cargas de Referencias
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3 space-y-3">
            {(resumen?.historial ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                Aún no hay cargas registradas en la tabla de referencias.
              </p>
            ) : (
              (resumen?.historial ?? []).map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between border-b border-border/40 pb-2.5 last:border-0"
                >
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-foreground truncate max-w-[180px]">
                      {h.archivo}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(h.created_at).toLocaleString("es-CO")}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-primary font-mono block">
                      +{h.filas_recibidas.toLocaleString("es-CO")} refs
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {h.filas_nuevas > 0 ? `${h.filas_nuevas} nuevas` : "actualizadas"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Buscador y Tabla de Referencias Guardadas */}
        <Card className="border-border/80 shadow-xs lg:col-span-2">
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Tag className="h-4 w-4 text-indigo-500" />
                  Referencias Guardadas en Base de Datos ({catalogo?.total?.toLocaleString("es-CO") || 0})
                </CardTitle>
                <CardDescription className="text-xs">
                  Consulta rápida y verificación de los precios PVM y PVP registrados.
                </CardDescription>
              </div>

              {/* Buscador */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Buscar por REF o Nombre..."
                  value={busqueda}
                  onChange={(e) => {
                    setBusqueda(e.target.value);
                    setPagina(1);
                  }}
                  className="h-8 pl-8 text-xs bg-background"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-3 space-y-3">
            {cCatalogo ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                Cargando referencias...
              </div>
            ) : (catalogo?.filas || []).length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                {busqueda ? "No se encontraron referencias que coincidan con la búsqueda." : "No hay referencias guardadas aún."}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border/60">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 text-[10px] text-muted-foreground uppercase border-b border-border/60">
                    <tr>
                      <th className="py-2 px-3 font-bold">REF</th>
                      <th className="py-2 px-3 font-bold">Nombre de Producto</th>
                      <th className="py-2 px-3 font-bold text-right">PVM (Mayorista)</th>
                      <th className="py-2 px-3 font-bold text-right">PVP (Público)</th>
                      <th className="py-2 px-3 font-bold text-right">Markup</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {(catalogo?.filas || []).map((refItem) => {
                      const tieneMarkup = refItem.pvp > 0 && refItem.pvm > 0;
                      const markupPct = tieneMarkup
                        ? ((refItem.pvp - refItem.pvm) / refItem.pvm) * 100
                        : 0;

                      return (
                        <tr key={refItem.ref} className="hover:bg-muted/30">
                          <td className="py-2 px-3 font-mono font-bold text-foreground">
                            {refItem.ref}
                          </td>
                          <td className="py-2 px-3 text-foreground truncate max-w-[200px]">
                            {refItem.nombre}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-blue-600 dark:text-blue-400 font-semibold">
                            {formatoCOP(refItem.pvm)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                            {formatoCOP(refItem.pvp)}
                          </td>
                          <td className="py-2 px-3 text-right">
                            {tieneMarkup ? (
                              <Badge
                                variant="outline"
                                className="text-[10px] font-mono border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                              >
                                +{markupPct.toFixed(0)}%
                              </Badge>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Paginación */}
            {totalPaginas > 1 && (
              <div className="flex items-center justify-between pt-2 text-xs">
                <span className="text-muted-foreground text-[11px]">
                  Página {pagina} de {totalPaginas}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    disabled={pagina <= 1}
                    onClick={() => setPagina((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    disabled={pagina >= totalPaginas}
                    onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                  >
                    Siguiente
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
