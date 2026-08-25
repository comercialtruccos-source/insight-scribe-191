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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
          navigate({ to: "/panel" });
        }
      }
    );

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/panel" });
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  const traducirError = (msg: string) => {
    const m = msg.toLowerCase();
    if (m.includes("invalid login credentials")) {
      return "Credenciales incorrectas. Verifica tu correo y contraseña.";
    }
    if (m.includes("email not confirmed")) {
      return "Tu correo electrónico no ha sido confirmado. Revisa tu bandeja de entrada o confirma el usuario en Supabase.";
    }
    if (m.includes("user already registered")) {
      return "Este correo ya está registrado. Por favor selecciona 'Ingresar'.";
    }
    if (m.includes("password should be at least")) {
      return "La contraseña debe tener al menos 6 caracteres.";
    }
    return msg;
  };

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setErrorMsg(null);
    setInfoMsg(null);
    try {
      if (modo === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        if (data.session) {
          toast.success("¡Bienvenido!");
          navigate({ to: "/panel" });
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: `${window.location.origin}/panel` },
        });
        if (error) throw error;
        if (data.session) {
          toast.success("Cuenta creada exitosamente");
          navigate({ to: "/panel" });
        } else {
          setInfoMsg(
            "Cuenta registrada. Si Supabase requiere confirmación, revisa tu correo electrónico para activar la cuenta."
          );
          toast.info("Revisa tu correo para confirmar tu cuenta.");
        }
      }
    } catch (err) {
      const errorText = err instanceof Error ? err.message : "No fue posible continuar";
      const mensajeTraducido = traducirError(errorText);
      setErrorMsg(mensajeTraducido);
      toast.error(mensajeTraducido);
    } finally {
      setCargando(false);
    }
  };

  const conGoogle = async () => {
    setErrorMsg(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setErrorMsg("No fue posible iniciar sesión con Google");
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

            {errorMsg && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {errorMsg}
              </div>
            )}

            {infoMsg && (
              <div className="rounded-md border border-primary/50 bg-primary/10 p-3 text-sm text-primary">
                {infoMsg}
              </div>
            )}

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
              onClick={() => {
                setErrorMsg(null);
                setInfoMsg(null);
                setModo(modo === "login" ? "registro" : "login");
              }}
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
