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
import { Progress } from "@/components/ui/progress";
import {
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Download,
  Search,
  Sparkles,
  RefreshCw,
  Package,
  Truck,
  Users,
  Check,
  Copy,
  ExternalLink,
  Database,
} from "lucide-react";
import { toast } from "sonner";
import {
  parsearArchivoPedidosDespachos,
  guardarDatosPedidosDespachos,
  obtenerMetadataPedidosDespachos,
  obtenerMetadataPedidosDespachosAsync,
  limpiarDatosPedidosDespachos,
  verificarHayDatosEnSupabase,
  type RegistroPedidosDespachosHGI,
  type MetadataCargaPedidosDespachos,
} from "@/lib/pedidos-despachos-storage";
import * as XLSX from "xlsx";

const COLUMNAS_OFICIALES = [
  "Transaccion",
  "Tercero",
  "Nombre",
  "Vendedor",
  "Ciudad",
  "Fechas",
  "Vence",
  "Documento",
  "Producto",
  "Descripcion",
  "Talla",
  "Color",
  "Anterior",
  "Pedido Mes",
  "Despachado",
  "Cancelado",
  "Saldo Pedido",
  "Saldo Inv",
];

const SQL_MIGRACION = `-- SQL para crear tabla pedidos_despachos en Supabase
CREATE TABLE IF NOT EXISTS public.pedidos_despachos (
  id BIGSERIAL PRIMARY KEY,
  transaccion TEXT NOT NULL DEFAULT 'PEDIDO',
  tercero TEXT NOT NULL DEFAULT '',
  nombre TEXT NOT NULL DEFAULT '',
  vendedor TEXT NOT NULL DEFAULT '',
  ciudad TEXT NOT NULL DEFAULT '',
  fechas TEXT DEFAULT '',
  vence TEXT DEFAULT '',
  documento TEXT DEFAULT '',
  producto TEXT NOT NULL DEFAULT '',
  descripcion TEXT DEFAULT '',
  talla TEXT DEFAULT '',
  color TEXT DEFAULT '',
  anterior NUMERIC NOT NULL DEFAULT 0,
  pedido_mes NUMERIC NOT NULL DEFAULT 0,
  total_pedido NUMERIC NOT NULL DEFAULT 0,
  despachado NUMERIC NOT NULL DEFAULT 0,
  cancelado NUMERIC NOT NULL DEFAULT 0,
  saldo_pedido NUMERIC NOT NULL DEFAULT 0,
  saldo_inv NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cargas_pedidos_despachos (
  id BIGSERIAL PRIMARY KEY,
  archivo TEXT NOT NULL,
  filas_recibidas INTEGER NOT NULL DEFAULT 0,
  filas_insertadas INTEGER NOT NULL DEFAULT 0,
  total_pedidos NUMERIC NOT NULL DEFAULT 0,
  total_despachado NUMERIC NOT NULL DEFAULT 0,
  total_saldo_pedido NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pedidos_despachos_vendedor ON public.pedidos_despachos(vendedor);
CREATE INDEX IF NOT EXISTS idx_pedidos_despachos_tercero ON public.pedidos_despachos(tercero);
CREATE INDEX IF NOT EXISTS idx_pedidos_despachos_producto ON public.pedidos_despachos(producto);
CREATE INDEX IF NOT EXISTS idx_pedidos_despachos_saldo ON public.pedidos_despachos(saldo_pedido);

ALTER TABLE public.pedidos_despachos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cargas_pedidos_despachos DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.pedidos_despachos TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.cargas_pedidos_despachos TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
`;

export function ModuloCargaPedidosDespachos({
  onCargaExitosa,
}: {
  onCargaExitosa?: () => void;
}) {
  const queryClient = useQueryClient();

  const [archivo, setArchivo] = useState<File | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [progreso, setProgreso] = useState<{ pct: number; lote: number; total: number } | null>(null);
  const [registrosParseados, setRegistrosParseados] = useState<RegistroPedidosDespachosHGI[] | null>(null);
  const [metaParseada, setMetaParseada] = useState<MetadataCargaPedidosDespachos | null>(null);
  const [headersEncontrados, setHeadersEncontrados] = useState<string[]>([]);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [errorSqlSupabase, setErrorSqlSupabase] = useState<string | null>(null);
  const [busquedaPreview, setBusquedaPreview] = useState("");

  const [metaActiva, setMetaActiva] = useState<MetadataCargaPedidosDespachos | null>(() =>
    obtenerMetadataPedidosDespachos()
  );
  const [hayDatos, setHayDatos] = useState(false);

  const refrescarEstado = async () => {
    try {
      const hay = await verificarHayDatosEnSupabase();
      setHayDatos(hay);
      const meta = await obtenerMetadataPedidosDespachosAsync();
      setMetaActiva(meta);
    } catch {
      setHayDatos(false);
    }
  };

  useEffect(() => {
    refrescarEstado();
  }, []);

  const alSeleccionarArchivo = async (file: File | null) => {
    setArchivo(file);
    setErrorCarga(null);
    setErrorSqlSupabase(null);
    setRegistrosParseados(null);
    setMetaParseada(null);
    setProgreso(null);

    if (!file) return;

    setProcesando(true);
    try {
      const res = await parsearArchivoPedidosDespachos(file);
      setRegistrosParseados(res.registros);
      setMetaParseada(res.metadata);
      setHeadersEncontrados(res.headersEncontrados);

      toast.success(`Archivo "${file.name}" leído exitosamente`, {
        description: `Se detectaron ${res.registros.length.toLocaleString("es-CO")} registros, ${res.metadata.vendedoresCount} vendedores y ${res.metadata.clientesCount} clientes.`,
      });
    } catch (err: any) {
      console.error("[ModuloCargaPedidosDespachos] Error parseando:", err);
      const msg = err?.message || "No se pudo interpretar el archivo como reporte de Pedidos vs Despachos.";
      setErrorCarga(msg);
      toast.error("Error al leer el archivo", { description: msg });
    } finally {
      setProcesando(false);
    }
  };

  const aplicarCarga = async () => {
    if (!registrosParseados || !metaParseada) return;

    try {
      setProcesando(true);
      setErrorSqlSupabase(null);

      await guardarDatosPedidosDespachos(
        registrosParseados,
        metaParseada,
        (porcentaje, loteActual, totalLotes) => {
          setProgreso({ pct: porcentaje, lote: loteActual, total: totalLotes });
        }
      );

      await refrescarEstado();

      queryClient.invalidateQueries({ queryKey: ["visor-pedidos-despachos"] });
      queryClient.invalidateQueries({ queryKey: ["pedidos-despachos-hgi-data"] });
      queryClient.invalidateQueries({ queryKey: ["pedidos-despachos-hay-datos"] });

      toast.success("¡Reporte de Pedidos vs Despachos sincronizado con Supabase!", {
        description: `Se guardaron ${metaParseada.totalRegistros.toLocaleString("es-CO")} filas en la base de datos oficial.`,
      });

      if (onCargaExitosa) {
        onCargaExitosa();
      }
    } catch (err: any) {
      console.error("[ModuloCargaPedidosDespachos] Error guardando en Supabase:", err);
      const msg = err?.message || "Error al guardar en Supabase";
      setErrorCarga(msg);
      if (msg.includes("does not exist") || msg.includes("42P01") || msg.includes("pedidos_despachos")) {
        setErrorSqlSupabase(msg);
      }
      toast.error("Error al sincronizar con Supabase", { description: msg });
    } finally {
      setProcesando(false);
      setProgreso(null);
    }
  };

  const limpiarCarga = async () => {
    try {
      await limpiarDatosPedidosDespachos();
      await refrescarEstado();
      setRegistrosParseados(null);
      setMetaParseada(null);
      setArchivo(null);

      queryClient.invalidateQueries({ queryKey: ["visor-pedidos-despachos"] });
      queryClient.invalidateQueries({ queryKey: ["pedidos-despachos-hgi-data"] });
      queryClient.invalidateQueries({ queryKey: ["pedidos-despachos-hay-datos"] });

      toast.info("Se han eliminado los datos cargados de Pedidos vs Despachos en Supabase.");
    } catch (err) {
      console.error("[ModuloCargaPedidosDespachos] Error al limpiar:", err);
      toast.error("Error al limpiar los datos");
    }
  };

  const descargarPlantilla = () => {
    const wb = XLSX.utils.book_new();
    const headers = [COLUMNAS_OFICIALES];
    const ejemplos = [
      [
        "PEDIDOS",
        "900123456",
        "BOUTIQUE EJEMPLO S.A.S.",
        "PAULA ANDREA",
        "MEDELLIN",
        "2026-10-14",
        "2026-11-14",
        "PED-10254",
        "B03024821",
        "BLUSA MANGA LARGA POPELINA",
        "M",
        "NEGRO",
        0,
        5,
        2,
        0,
        3,
        15,
      ],
      [
        "PEDIDOS",
        "900987654",
        "DISTRIBUCIONES MODA MODERNA",
        "LILIANA RIOS",
        "BOGOTA",
        "2026-10-18",
        "2026-11-18",
        "PED-10310",
        "T22107104",
        "JEAN BARREL DENIM",
        "08",
        "AZUL MEDIO",
        2,
        6,
        8,
        0,
        0,
        4,
      ],
    ];

    const ws = XLSX.utils.aoa_to_sheet([...headers, ...ejemplos]);
    XLSX.utils.book_append_sheet(wb, ws, "Pedidos_vs_Despachos");
    XLSX.writeFile(wb, "Plantilla_HGI_Pedidos_vs_Despachos.xlsx");
    toast.success("Plantilla descargada en formato Excel (.xlsx)");
  };

  const copiarSql = () => {
    navigator.clipboard.writeText(SQL_MIGRACION);
    toast.success("SQL copiado al portapapeles. Pégalo en Supabase SQL Editor.");
  };

  const previewFiltrada = (registrosParseados || []).filter((r) => {
    if (!busquedaPreview.trim()) return true;
    const b = busquedaPreview.toLowerCase();
    return (
      r.vendedor.toLowerCase().includes(b) ||
      r.nombre.toLowerCase().includes(b) ||
      r.tercero.toLowerCase().includes(b) ||
      r.producto.toLowerCase().includes(b) ||
      r.descripcion.toLowerCase().includes(b) ||
      r.documento.toLowerCase().includes(b)
    );
  });

  return (
    <div className="space-y-6">
      {/* 1. Cabecera Informativa */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-teal-500/30 bg-teal-500/5 shadow-2xs">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5">
            <FileSpreadsheet className="h-6 w-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-base text-foreground font-display">
                Módulo de Carga: Reporte Oficial Pedidos vs. Despachos (HGI)
              </h3>
              <Badge variant="outline" className="bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30 text-[10px] font-bold">
                18 Columnas Oficiales
              </Badge>
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold flex items-center gap-1">
                <Database className="h-3 w-3" />
                <span>Base de Datos Supabase</span>
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-3xl">
              Carga el archivo plano exportado directamente de HGI con los saldos de pedidos, despachos, cancelaciones e inventario. Los datos se guardan de forma centralizada en la base de datos de <strong>Supabase</strong> para que todos los asesores y administradores consulten en tiempo real.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={descargarPlantilla}
          className="text-xs font-semibold gap-1.5 shrink-0 border-teal-500/40 hover:bg-teal-500/10 text-teal-700 dark:text-teal-300"
        >
          <Download className="h-3.5 w-3.5" />
          Descargar Plantilla
        </Button>
      </div>

      {/* Alerta de Tabla no creada si aplica */}
      {errorSqlSupabase && (
        <Card className="border-amber-500/40 bg-amber-500/10">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-foreground">
                  La tabla `public.pedidos_despachos` aún no existe en Supabase
                </h4>
                <p className="text-xs text-muted-foreground">
                  Ejecuta el script SQL en el editor de Supabase para crear las tablas e índices oficiales.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={copiarSql}
                className="text-xs font-semibold gap-1.5 bg-background shadow-2xs"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>Copiar SQL de Creación</span>
              </Button>
              <a
                href="https://supabase.com/dashboard/project/tdanxpksmfnwzdgzttau/sql/new"
                target="_blank"
                rel="noreferrer"
              >
                <Button
                  variant="default"
                  size="sm"
                  className="text-xs font-semibold gap-1.5 shadow-2xs"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Abrir Editor SQL de Supabase</span>
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2. Estado del Archivo Activo en el Sistema */}
      {hayDatos && metaActiva && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mt-0.5">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-foreground">
                    Datos Activos en Supabase: {metaActiva.nombreArchivo}
                  </span>
                  <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold border-emerald-500/30">
                    Sincronizado
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground font-mono">
                  <span>Cargado: {new Date(metaActiva.fechaCarga).toLocaleString("es-CO")}</span>
                  <span>Registros: {metaActiva.totalRegistros.toLocaleString("es-CO")}</span>
                  <span>Pedidos: {metaActiva.totalPedidos.toLocaleString("es-CO")} unds</span>
                  <span>Despachados: {metaActiva.totalDespachado.toLocaleString("es-CO")} unds</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    Saldo Pendiente: {metaActiva.totalSaldoPedido.toLocaleString("es-CO")} unds
                  </span>
                  <span>Nivel Servicio: {metaActiva.nivelServicioPct.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={limpiarCarga}
              className="text-xs text-rose-600 hover:text-rose-700 border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1.5 shrink-0"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Eliminar Carga
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 3. Guía de Columnas Requeridas */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5 text-primary" />
            <span>Columnas Oficiales Reconocidas por el Sistema</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-1">
          <div className="flex flex-wrap gap-1.5">
            {COLUMNAS_OFICIALES.map((col, idx) => (
              <Badge
                key={col}
                variant="outline"
                className={`text-[11px] font-mono py-1 px-2.5 ${
                  col === "Saldo Pedido"
                    ? "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/40 font-bold"
                    : col === "Despachado"
                    ? "bg-blue-500/15 text-blue-800 dark:text-blue-200 border-blue-500/40 font-bold"
                    : col === "Pedido Mes" || col === "Anterior"
                    ? "bg-purple-500/15 text-purple-800 dark:text-purple-200 border-purple-500/40 font-bold"
                    : "bg-muted/40 text-foreground"
                }`}
              >
                <span className="text-muted-foreground mr-1 text-[9px]">{idx + 1}.</span>
                {col}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 4. Dropzone / Selector de Archivo */}
      <Card className="border-dashed border-2 border-border/80 hover:border-primary/60 transition-colors">
        <CardContent className="p-8 text-center flex flex-col items-center justify-center space-y-3">
          <div className="p-4 rounded-full bg-primary/10 text-primary">
            <UploadCloud className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              {archivo ? `Archivo seleccionado: ${archivo.name}` : "Arrastra aquí tu archivo Excel (.xlsx, .xls) o CSV"}
            </p>
            <p className="text-xs text-muted-foreground">
              Exportación del informe de Pedidos vs Despachos desde HGI ERP con las 18 columnas oficiales.
            </p>
          </div>

          <div className="pt-2">
            <label htmlFor="input-file-pedidos" className="cursor-pointer">
              <input
                id="input-file-pedidos"
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                disabled={procesando}
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  alSeleccionarArchivo(file);
                }}
              />
              <Button
                type="button"
                variant="default"
                size="sm"
                disabled={procesando}
                onClick={() => document.getElementById("input-file-pedidos")?.click()}
                className="font-semibold gap-1.5 shadow-2xs"
              >
                {procesando ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Procesando archivo...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="h-4 w-4" />
                    <span>{archivo ? "Cambiar Archivo" : "Seleccionar Archivo"}</span>
                  </>
                )}
              </Button>
            </label>
          </div>

          {/* Barra de progreso de guardado en Supabase */}
          {progreso && (
            <div className="w-full max-w-md space-y-1.5 pt-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                <span>Guardando en Supabase: Lote {progreso.lote} de {progreso.total}</span>
                <span className="font-bold text-foreground">{progreso.pct}%</span>
              </div>
              <Progress value={progreso.pct} className="h-2" />
            </div>
          )}

          {errorCarga && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 max-w-lg mt-3">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{errorCarga}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 5. Vista Previa de Validación y Botón de Aplicar */}
      {registrosParseados && metaParseada && (
        <Card className="border-border">
          <CardHeader className="p-4 border-b border-border/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-500" />
                  <span>Vista Previa de Validación ({metaParseada.totalRegistros.toLocaleString("es-CO")} registros)</span>
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Verifica que los totales coincidan con el reporte de HGI antes de subir a la base de datos Supabase.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setRegistrosParseados(null);
                    setMetaParseada(null);
                    setArchivo(null);
                  }}
                  className="text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={aplicarCarga}
                  disabled={procesando}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 text-xs shadow-2xs"
                >
                  <Check className="h-4 w-4" />
                  <span>Subir a Base de Datos Supabase</span>
                </Button>
              </div>
            </div>

            {/* Tarjetas métricas de vista previa */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 pt-4">
              <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Total Anterior</span>
                <p className="text-sm font-bold font-mono">{metaParseada.totalAnterior.toLocaleString("es-CO")}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Pedido Mes</span>
                <p className="text-sm font-bold font-mono text-purple-600 dark:text-purple-400">
                  {metaParseada.totalPedidoMes.toLocaleString("es-CO")}
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Total Pedidos</span>
                <p className="text-sm font-bold font-mono">{metaParseada.totalPedidos.toLocaleString("es-CO")}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Despachados</span>
                <p className="text-sm font-bold font-mono text-blue-600 dark:text-blue-400">
                  {metaParseada.totalDespachado.toLocaleString("es-CO")}
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Cancelados</span>
                <p className="text-sm font-bold font-mono text-rose-600 dark:text-rose-400">
                  {metaParseada.totalCancelado.toLocaleString("es-CO")}
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <span className="text-[10px] text-amber-700 dark:text-amber-300 uppercase font-bold">Saldo Pendiente</span>
                <p className="text-sm font-bold font-mono text-amber-700 dark:text-amber-300">
                  {metaParseada.totalSaldoPedido.toLocaleString("es-CO")}
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                <span className="text-[10px] text-emerald-700 dark:text-emerald-300 uppercase font-bold">Nivel Servicio</span>
                <p className="text-sm font-bold font-mono text-emerald-700 dark:text-emerald-300">
                  {metaParseada.nivelServicioPct.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {/* Buscador en la vista previa */}
            <div className="p-3 border-b border-border/60 flex items-center justify-between gap-2">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Filtrar vista previa por cliente, asesor, producto..."
                  value={busquedaPreview}
                  onChange={(e) => setBusquedaPreview(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>
              <Badge variant="outline" className="text-[11px] font-mono shrink-0">
                Mostrando {Math.min(15, previewFiltrada.length)} de {metaParseada.totalRegistros.toLocaleString("es-CO")}
              </Badge>
            </div>

            {/* Tabla de primeras filas */}
            <div className="overflow-x-auto max-h-[360px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-muted/80 sticky top-0 z-10 text-[10.5px] uppercase font-bold text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="py-2 px-2.5">Vendedor</th>
                    <th className="py-2 px-2.5">Tercero / Cliente</th>
                    <th className="py-2 px-2.5">Ciudad</th>
                    <th className="py-2 px-2.5">Doc</th>
                    <th className="py-2 px-2.5">Producto</th>
                    <th className="py-2 px-2.5">Talla/Color</th>
                    <th className="py-2 px-2 text-right">Ant</th>
                    <th className="py-2 px-2 text-right">Ped Mes</th>
                    <th className="py-2 px-2 text-right">Desp</th>
                    <th className="py-2 px-2 text-right">Canc</th>
                    <th className="py-2 px-2 text-right font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10">
                      Saldo Ped
                    </th>
                    <th className="py-2 px-2 text-right">Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-mono text-[11px]">
                  {previewFiltrada.slice(0, 15).map((r, idx) => (
                    <tr key={idx} className="hover:bg-muted/30">
                      <td className="py-2 px-2.5 font-sans font-medium text-foreground">{r.vendedor}</td>
                      <td className="py-2 px-2.5 font-sans">{r.nombre}</td>
                      <td className="py-2 px-2.5 text-muted-foreground">{r.ciudad}</td>
                      <td className="py-2 px-2.5">{r.documento}</td>
                      <td className="py-2 px-2.5 font-bold text-primary">{r.producto}</td>
                      <td className="py-2 px-2.5 text-muted-foreground">{r.talla} / {r.color}</td>
                      <td className="py-2 px-2 text-right">{r.anterior}</td>
                      <td className="py-2 px-2 text-right text-purple-600 dark:text-purple-400">{r.pedidoMes}</td>
                      <td className="py-2 px-2 text-right text-blue-600 dark:text-blue-400">{r.despachado}</td>
                      <td className="py-2 px-2 text-right text-rose-600 dark:text-rose-400">{r.cancelado}</td>
                      <td className={`py-2 px-2 text-right font-bold ${
                        r.saldoPedido > 0
                          ? "text-amber-700 dark:text-amber-300 bg-amber-500/10"
                          : "text-muted-foreground"
                      }`}>
                        {r.saldoPedido}
                      </td>
                      <td className="py-2 px-2 text-right text-muted-foreground">{r.saldoInv}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
