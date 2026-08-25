import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Acceso | Nexa BI de Ventas" },
      {
        name: "description",
        content:
          "Inicia sesión para cargar tu histórico de ventas y explorar los indicadores de tu empresa.",
      },
      { property: "og:title", content: "Acceso | Nexa BI de Ventas" },
      {
        property: "og:description",
        content: "Panel de Business Intelligence de ventas para tu empresa.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [modo, setModo] = useState<"login" | "registro">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/panel" });
    });
  }, [navigate]);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    try {
      if (modo === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/panel" });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/panel` },
        });
        if (error) throw error;
        toast.success("Cuenta creada. Revisa tu correo si se solicita confirmación.");
        navigate({ to: "/panel" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No fue posible continuar");
    } finally {
      setCargando(false);
    }
  };

  const conGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("No fue posible iniciar sesión con Google");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/panel" });
  };

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-16">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 block text-center text-sm text-muted-foreground">
          ← Volver al inicio
        </Link>
        <Card className="border-border/60 bg-card">
          <CardHeader>
            <CardTitle className="font-display text-2xl">
              {modo === "login" ? "Ingresar a la plataforma" : "Crear cuenta"}
            </CardTitle>
            <CardDescription>
              Acceso restringido al equipo comercial y de analítica.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <Button variant="outline" className="w-full" onClick={conGoogle}>
              Continuar con Google
            </Button>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />o con correo
              <span className="h-px flex-1 bg-border" />
            </div>
            <form onSubmit={enviar} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo corporativo</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nombre@empresa.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={cargando}>
                {cargando ? "Procesando..." : modo === "login" ? "Ingresar" : "Registrarme"}
              </Button>
            </form>
            <button
              type="button"
              className="w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
              onClick={() => setModo(modo === "login" ? "registro" : "login")}
            >
              {modo === "login"
                ? "¿No tienes cuenta? Crear una"
                : "Ya tengo cuenta, ingresar"}
            </button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
