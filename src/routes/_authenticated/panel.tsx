import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ingestarLoteCliente,
  registrarCargaCliente,
  obtenerResumenCliente,
} from "@/lib/ventas-api";
import {
  procesarArchivoPorStreaming,
  inspeccionarEncabezados,
  COLUMNAS_ESPERADAS,
  COLUMNAS_DIMENSION,
} from "@/lib/parse-ventas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const TAMANO_LOTE = 1000;

export const Route = createFileRoute("/_authenticated/panel")({
  component: Panel,
  errorComponent: ({ error }) => (
    <div role="alert" className="p-10 text-destructive">
      {error.message}
    </div>
  ),
  notFoundComponent: () => <div className="p-10">Sin información.</div>,
});

function Panel() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [archivo, setArchivo] = useState<File | null>(null);
  const [progreso, setProgreso] = useState(0);
  const [estado, setEstado] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string[]>([]);
  const [esCSV, setEsCSV] = useState(false);

  const { data: resumen } = useQuery({
    queryKey: ["resumen"],
    queryFn: () => obtenerResumenCliente(),
  });

  const alSeleccionarArchivo = async (file: File | null) => {
    setArchivo(file);
    setAviso([]);
    setProgreso(0);
    setEstado(null);

    if (!file) return;

    const esCsvFile = file.name.toLowerCase().endsWith(".csv");
    setEsCSV(esCsvFile);

    try {
      const meta = await inspeccionarEncabezados(file);
      const avisos: string[] = [];
      if (meta.columnasFaltantes.length > 0) {
        avisos.push(`Columnas no detectadas: ${meta.columnasFaltantes.join(", ")}`);
      }
      if (meta.columnasIgnoradas.length > 0) {
        avisos.push(`Columnas adicionales ignoradas: ${meta.columnasIgnoradas.join(", ")}`);
      }
      setAviso(avisos);
    } catch {
      // Continuar si la inspección previa no es concluyente
    }
  };

  const carga = useMutation({
    mutationFn: async (file: File) => {
      setProgreso(0);
      setEstado("Iniciando procesamiento por streaming...");

      const res = await procesarArchivoPorStreaming({
        file,
        tamanoLote: TAMANO_LOTE,
        onProgreso: (p) => {
          setProgreso(p.porcentaje);
          setEstado(p.mensaje);
        },
        onLote: async (lote) => {
          return await ingestarLoteCliente(lote);
        },
      });

      await registrarCargaCliente(file.name, res.recibidas, res.nuevas);
      return res;
    },
    onSuccess: (r) => {
      setEstado(null);
      setProgreso(100);
      toast.success(
        `Carga completada: ${r.nuevas.toLocaleString("es-CO")} filas nuevas agregadas, ${(
          r.recibidas - r.nuevas
        ).toLocaleString("es-CO")} ya existentes.`,
      );
      queryClient.invalidateQueries({ queryKey: ["resumen"] });
    },
    onError: (e) => {
      setEstado(null);
      toast.error(e instanceof Error ? e.message : "Error al cargar el archivo");
    },
  });

  const salir = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <p className="font-display text-lg tracking-tight text-foreground">Nexa BI</p>
            <p className="text-xs text-muted-foreground">Inteligencia de ventas</p>
          </div>
          <Button variant="ghost" size="sm" onClick={salir}>
            Cerrar sesión
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-6 py-10">
        <section className="grid gap-4 sm:grid-cols-3">
          <Metric label="Registros de venta" value={(resumen?.totalVentas ?? 0).toLocaleString("es-CO")} />
          <Metric label="Cargas realizadas" value={(resumen?.totalCargas ?? 0).toLocaleString("es-CO")} />
          <Metric label="Última fecha con datos" value={resumen?.ultimaFecha ?? "—"} />
        </section>

        <Card>
          <CardHeader>
            <CardTitle className="font-display">Cargar histórico de ventas</CardTitle>
            <CardDescription>
              Sube el archivo Excel o CSV. La primera carga crea la base inicial; en las
              siguientes sólo se agregan los registros nuevos (días, meses y años posteriores).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-6 py-12 text-center transition-colors hover:border-primary/60">
              <span className="font-medium text-foreground">
                {archivo ? archivo.name : "Selecciona o arrastra tu archivo"}
              </span>
              <span className="text-xs text-muted-foreground">.csv (recomendado para streaming sin límite de tamaño), .xlsx o .xls</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                disabled={carga.isPending}
                onChange={(e) => alSeleccionarArchivo(e.target.files?.[0] ?? null)}
              />
            </label>

            {archivo && !esCSV && (
              <div className="rounded-lg border border-border/80 bg-muted/20 p-3 text-xs text-muted-foreground">
                💡 <strong className="text-foreground">Consejo de rendimiento:</strong> Si tu histórico tiene más de 50.000 filas, guardarlo en formato <strong className="text-foreground">.CSV</strong> permite procesamiento en streaming instantáneo consumiendo menos de 20 MB de memoria.
              </div>
            )}

            {carga.isPending && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{estado}</span>
                  <span className="font-semibold text-foreground">{progreso}%</span>
                </div>
                <Progress value={progreso} />
              </div>
            )}

            {aviso.length > 0 && (
              <ul className="space-y-1 text-xs text-muted-foreground">
                {aviso.map((a) => (
                  <li key={a}>• {a}</li>
                ))}
              </ul>
            )}

            <Button
              disabled={!archivo || carga.isPending}
              onClick={() => archivo && carga.mutate(archivo)}
            >
              {carga.isPending ? "Procesando en streaming..." : "Procesar archivo"}
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-base">Historial de cargas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(resumen?.historial ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">Aún no hay cargas registradas.</p>
              )}
              {(resumen?.historial ?? []).map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between border-b border-border/50 pb-2 text-sm last:border-0"
                >
                  <div>
                    <p className="font-medium text-foreground">{h.archivo}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(h.created_at).toLocaleString("es-CO")}
                    </p>
                  </div>
                  <div className="text-right text-xs">
                    <p className="text-primary">+{h.filas_nuevas.toLocaleString("es-CO")} nuevas</p>
                    <p className="text-muted-foreground">
                      {h.filas_recibidas.toLocaleString("es-CO")} leídas
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-display text-base">Estructura esperada</CardTitle>
              <CardDescription>
                Las columnas resaltadas se guardan como catálogos (dimensiones) reutilizables.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-1.5">
              {COLUMNAS_ESPERADAS.map((c) => (
                <Badge key={c} variant={COLUMNAS_DIMENSION.includes(c) ? "default" : "secondary"}>
                  {c}
                </Badge>
              ))}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 font-display text-3xl text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}
