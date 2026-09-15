import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Lock, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Acceso Corporativo | Nexa BI" },
      {
        name: "description",
        content: "Plataforma interna de inteligencia comercial y analítica de ventas.",
      },
      { property: "og:title", content: "Acceso Corporativo | Nexa BI" },
      {
        property: "og:description",
        content: "Plataforma interna de inteligencia comercial y analítica de ventas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
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
    <main className="grid min-h-screen place-items-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Identidad de la plataforma */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary text-primary-foreground font-bold text-2xl shadow-md">
            N
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              Nexa BI
            </h1>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5 mt-0.5">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              Plataforma Interna de Inteligencia Comercial
            </p>
          </div>
        </div>

        {/* Tarjeta de Acceso */}
        <Card className="border-border/70 bg-card shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="font-display text-xl flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" />
              {modo === "login" ? "Ingreso de Usuario" : "Crear Cuenta de Acceso"}
            </CardTitle>
            <CardDescription className="text-xs">
              Acceso restringido para el equipo comercial y directivo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" className="w-full text-xs font-medium h-9" onClick={conGoogle}>
              Continuar con Google
            </Button>
            
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground uppercase tracking-wider">
              <span className="h-px flex-1 bg-border" />
              <span>o con credenciales</span>
              <span className="h-px flex-1 bg-border" />
            </div>

            {errorMsg && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
                {errorMsg}
              </div>
            )}

            {infoMsg && (
              <div className="rounded-md border border-primary/50 bg-primary/10 p-3 text-xs text-primary">
                {infoMsg}
              </div>
            )}

            <form onSubmit={enviar} className="space-y-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs">Correo corporativo</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@empresa.com"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-9 text-xs"
                />
              </div>
              <Button type="submit" className="w-full h-9 text-xs font-semibold" disabled={cargando}>
                {cargando ? "Validando acceso..." : modo === "login" ? "Iniciar Sesión" : "Registrar Cuenta"}
              </Button>
            </form>

            <button
              type="button"
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline pt-1"
              onClick={() => {
                setErrorMsg(null);
                setInfoMsg(null);
                setModo(modo === "login" ? "registro" : "login");
              }}
            >
              {modo === "login"
                ? "¿No tienes acceso registrado? Solicitar / Crear cuenta"
                : "Ya tengo cuenta, iniciar sesión"}
            </button>
          </CardContent>
        </Card>

        <p className="text-center text-[11px] text-muted-foreground">
          Nexa BI • Sistema confidencial de uso exclusivo interno
        </p>
      </div>
    </main>
  );
}
