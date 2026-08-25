import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nexa BI | Inteligencia de ventas para tu empresa" },
      {
        name: "description",
        content:
          "Carga tu histórico de ventas y conviértelo en un modelo con dimensiones de tiempo, región, vendedores, canal y marca. Actualización incremental sin duplicados.",
      },
      { property: "og:title", content: "Nexa BI | Inteligencia de ventas" },
      {
        property: "og:description",
        content:
          "Plataforma de Business Intelligence: carga incremental de ventas con dimensiones de tiempo, región y vendedores.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const CARACTERISTICAS = [
  {
    titulo: "Carga incremental",
    texto:
      "La primera carga crea la base histórica. En las siguientes sólo entran los días, meses y años nuevos: las filas repetidas se descartan automáticamente.",
  },
  {
    titulo: "Modelo dimensional",
    texto:
      "Canal, Zona2, País, Zona Colombia, Correría, Marca, vendedores, ciudades, líneas y colecciones se guardan como catálogos consultables.",
  },
  {
    titulo: "Dimensión de tiempo",
    texto:
      "Año, Mes y Día se combinan en una fecha real, junto con la Fecha de compra, para analizar por periodo y comparar temporadas.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="font-display text-lg tracking-tight text-foreground">Nexa BI</span>
        <Button asChild variant="outline" size="sm">
          <Link to="/auth">Ingresar</Link>
        </Button>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-6 pb-16 pt-14">
          <p className="text-xs uppercase tracking-[0.25em] text-primary">
            Business Intelligence de ventas
          </p>
          <h1 className="mt-5 max-w-3xl font-display text-4xl leading-tight text-foreground sm:text-6xl">
            Tu histórico de ventas, convertido en un modelo analítico vivo.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            Sube el archivo de transacciones y la plataforma lo normaliza en tablas de
            dimensiones y hechos, listo para medir vendedores, regiones, marcas y márgenes.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Cargar mi archivo</Link>
            </Button>
          </div>
        </section>

        <section className="border-t border-border/60 bg-card/40">
          <div className="mx-auto grid max-w-6xl gap-8 px-6 py-16 md:grid-cols-3">
            {CARACTERISTICAS.map((c) => (
              <article key={c.titulo}>
                <h2 className="font-display text-xl text-foreground">{c.titulo}</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{c.texto}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-6 py-10 text-xs text-muted-foreground">
        Nexa BI — plataforma interna de analítica comercial.
      </footer>
    </div>
  );
}
