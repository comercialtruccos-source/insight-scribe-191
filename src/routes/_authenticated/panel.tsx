import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  ingestarLote,
  registrarCarga,
  obtenerResumen,
} from "@/lib/ventas.functions";
import {
  parseArchivoVentas,
  COLUMNAS_ESPERADAS,
  COLUMNAS_DIMENSION,
} from "@/lib/parse-ventas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const TAMANO_LOTE = 750;

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
  const resumenFn = useServerFn(obtenerResumen);
  const ingestFn = useServerFn(ingestarLote);
  const registrarFn = useServerFn(registrarCarga);

  const [archivo, setArchivo] = useState<File | null>(null);
  const [progreso, setProgreso] = useState(0);
  const [estado, setEstado] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string[]>([]);

  const { data: resumen } = useQuery({
    queryKey: ["resumen"],
    queryFn: () => resumenFn({}),
  });

  const carga = useMutation({
    mutationFn: async (file: File) => {
      setProgreso(0);
      setEstado("Leyendo archivo...");
      const { filas, columnasFaltantes, columnasIgnoradas } = await parseArchivoVentas(file);
      const avisos: string[] = [];
      if (columnasFaltantes.length)
        avisos.push(`Columnas no encontradas: ${columnasFaltantes.join(", ")}`);
      if (columnasIgnoradas.length)
        avisos.push(`Columnas ignoradas: ${columnasIgnoradas.join(", ")}`);
      setAviso(avisos);

      let recibidas = 0;
      let nuevas = 0;
      const total = filas.length;
      for (let i = 0; i < total; i += TAMANO_LOTE) {
        const lote = filas.slice(i, i + TAMANO_LOTE);
        setEstado(`Cargando filas ${i + 1} – ${Math.min(i + TAMANO_LOTE, total)} de ${total}`);
        const r = await ingestFn({ data: { archivo: file.name, filas: lote } });
        recibidas += r.recibidas;
        nuevas += r.nuevas;
        setProgreso(Math.round(((i + lote.length) / total) * 100));
      }
      await registrarFn({ data: { archivo: file.name, recibidas, nuevas } });
      return { recibidas, nuevas };
    },
    onSuccess: (r) => {
      setEstado(null);
      toast.success(
        `Carga completada: ${r.nuevas.toLocaleString("es-CO")} filas nuevas, ${(
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
              <span className="text-xs text-muted-foreground">.xlsx, .xls o .csv</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
              />
            </label>

            {carga.isPending && (
              <div className="space-y-2">
                <Progress value={progreso} />
                <p className="text-xs text-muted-foreground">{estado}</p>
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
              {carga.isPending ? "Procesando..." : "Procesar archivo"}
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
