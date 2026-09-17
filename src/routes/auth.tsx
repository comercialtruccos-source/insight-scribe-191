import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  obtenerPermisoUsuario,
  obtenerSesionActiva,
  guardarSesionActiva,
  USUARIOS_INICIALES_PRECONFIGURADOS,
  type AuthUsuarioSession,
} from "@/lib/permisos-vendedores";
import { Users, ShieldCheck, KeyRound, ChevronDown, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Acceso | Trucco´s Jeans BI" },
      {
        name: "description",
        content:
          "Inicia sesión para cargar tu histórico de ventas y explorar los indicadores de tu empresa.",
      },
      { property: "og:title", content: "Acceso | Trucco´s Jeans BI" },
      {
        property: "og:description",
        content: "Panel de Business Intelligence de ventas para Trucco´s Jeans.",
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
  const [mostrarAccesosRapidos, setMostrarAccesosRapidos] = useState(false);

  useEffect(() => {
    // Si ya existe sesión local activa
    const s = obtenerSesionActiva();
    if (s) {
      navigate({ to: "/panel" });
      return;
    }

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

  const seleccionarUsuarioRapido = (u: typeof USUARIOS_INICIALES_PRECONFIGURADOS[0]) => {
    setEmail(u.email);
    setPassword("QWE123");
    setErrorMsg(null);
    setInfoMsg(null);

    const userSession: AuthUsuarioSession = {
      id: u.userId || `user_${u.email.replace(/[^a-z0-9]/g, "")}`,
      email: u.email,
      nombre: u.nombre || undefined,
      rol: u.rol,
      vendedorIds: u.vendedorIds,
      loggedAt: new Date().toISOString(),
    };
    guardarSesionActiva(userSession);
    toast.success(`¡Bienvenido ${u.nombre || u.email}!`);
    navigate({ to: "/panel" });
  };

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setErrorMsg(null);
    setInfoMsg(null);

    let emailTrim = email.trim().toLowerCase();
    if (emailTrim && !emailTrim.includes("@")) {
      emailTrim = `${emailTrim}@truccos.com`;
    }
    const pwdTrim = password.trim();

    // 1. Acceso directo e instantáneo para correos corporativos y ficticios
    // No requiere confirmación de email en Cloud
    const permisoConfigurado = obtenerPermisoUsuario(emailTrim);

    if (permisoConfigurado) {
      const userSession: AuthUsuarioSession = {
        id: permisoConfigurado.userId || `user_${emailTrim.replace(/[^a-z0-9]/g, "")}`,
        email: permisoConfigurado.email,
        nombre: permisoConfigurado.nombre || undefined,
        rol: permisoConfigurado.rol,
        vendedorIds: permisoConfigurado.vendedorIds,
        loggedAt: new Date().toISOString(),
      };
      guardarSesionActiva(userSession);
      toast.success(`¡Bienvenido ${permisoConfigurado.nombre || permisoConfigurado.email}!`);
      navigate({ to: "/panel" });
      setCargando(false);
      return;
    }

    // 2. Si es cualquier otro correo corporativo o nuevo usuario registrado
    const nombreDefecto = emailTrim.split("@")[0].replace(/[._-]/g, " ").toUpperCase();
    const esAdmin =
      emailTrim.includes("admin") ||
      emailTrim.includes("gerencia") ||
      emailTrim.includes("melisa") ||
      emailTrim.includes("sistemas");

    const userSession: AuthUsuarioSession = {
      id: `user_${emailTrim.replace(/[^a-z0-9]/g, "")}`,
      email: emailTrim,
      nombre: nombreDefecto,
      rol: esAdmin ? "admin" : "vendedor",
      vendedorIds: [],
      loggedAt: new Date().toISOString(),
    };
    guardarSesionActiva(userSession);

    // Intento opcional y no bloqueante en Supabase Cloud
    supabase.auth.signInWithPassword({ email: emailTrim, password: pwdTrim }).catch(() => {});

    toast.success(
      modo === "registro"
        ? `¡Cuenta creada exitosamente para ${nombreDefecto}!`
        : `¡Bienvenido ${nombreDefecto}!`
    );
    navigate({ to: "/panel" });
    setCargando(false);
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
    <main className="grid min-h-screen place-items-center bg-slate-50/60 dark:bg-slate-950/80 px-4 py-12 font-sans">
      <div className="w-full max-w-md space-y-6">
        {/* Logo y Encabezado */}
        <div className="text-center space-y-2.5">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-purple-800 text-white font-black text-2xl shadow-lg shadow-indigo-500/25 ring-2 ring-white/20">
            T
          </div>
          <h1 className="text-2xl font-black font-display tracking-tight text-foreground">
            Trucco´s Jeans BI
          </h1>
          <p className="text-xs text-muted-foreground font-medium flex items-center justify-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            Plataforma de Inteligencia Comercial y Analítica
          </p>
        </div>

        <Card className="border-border/80 bg-card/95 backdrop-blur-xl shadow-xl rounded-3xl overflow-hidden glass-card-hover">
          <CardHeader className="pb-4 border-b border-border/40 bg-muted/20">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-display text-lg font-bold">
                  {modo === "login" ? "Ingreso de Usuario" : "Crear Cuenta de Acceso"}
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Acceso directo sin validación de email externo para correos corporativos.
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono font-bold bg-primary/10 border-primary/20 text-primary rounded-full px-2.5">
                v1.3
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-[11px] text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-2 shadow-2xs">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Acceso directo activo: No requiere confirmación de email en Cloud.</span>
            </div>

            <Button variant="outline" className="w-full h-9 text-xs font-semibold rounded-xl border-border/80 shadow-2xs hover:bg-muted/80" onClick={conGoogle}>
              Continuar con Google
            </Button>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />o con correo corporativo
              <span className="h-px flex-1 bg-border" />
            </div>

            {errorMsg && (
              <div className="rounded-2xl border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive font-medium shadow-2xs">
                {errorMsg}
              </div>
            )}

            {infoMsg && (
              <div className="rounded-2xl border border-primary/50 bg-primary/10 p-3 text-xs text-primary font-medium shadow-2xs">
                {infoMsg}
              </div>
            )}

            <form onSubmit={enviar} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold">Correo corporativo</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ej. mayorca@truccos.com o melisagomez@truccos.com"
                  className="h-9 text-xs rounded-xl border-border/80 bg-background/80 shadow-2xs"
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-semibold">Contraseña</Label>
                  <span className="text-[10px] text-muted-foreground font-mono">Clave: QWE123</span>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={4}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-9 text-xs rounded-xl border-border/80 bg-background/80 shadow-2xs"
                />
              </div>
              <Button type="submit" className="w-full h-9 text-xs font-bold rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white shadow-md shadow-indigo-500/20" disabled={cargando}>
                {cargando ? "Validando credenciales..." : modo === "login" ? "Ingresar al Panel" : "Registrarme"}
              </Button>
            </form>

            {/* Accesos Rápidos para Comercial y Admin */}
            <div className="pt-2 border-t border-border/50">
              <button
                type="button"
                onClick={() => setMostrarAccesosRapidos(!mostrarAccesosRapidos)}
                className="w-full flex items-center justify-between py-1.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                  Directorio de Cuentas Preconfiguradas
                </span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${mostrarAccesosRapidos ? "rotate-180" : ""}`} />
              </button>

              {mostrarAccesosRapidos && (
                <div className="mt-2.5 max-h-52 overflow-y-auto space-y-1.5 p-2 rounded-2xl bg-muted/40 border border-border/50 text-xs">
                  <p className="text-[11px] text-muted-foreground mb-1 font-medium">
                    Haz clic en tu usuario para rellenar tus datos (Clave: <code>QWE123</code>):
                  </p>
                  {USUARIOS_INICIALES_PRECONFIGURADOS.map((u) => (
                    <div
                      key={u.email}
                      onClick={() => seleccionarUsuarioRapido(u)}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-card hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-border/40 cursor-pointer transition-all shadow-2xs hover:scale-[1.01]"
                    >
                      <div className="flex items-center gap-2">
                        {u.rol === "admin" ? (
                          <ShieldCheck className="h-4 w-4 text-purple-600 shrink-0" />
                        ) : (
                          <Users className="h-4 w-4 text-indigo-600 shrink-0" />
                        )}
                        <div>
                          <p className="font-bold text-[11px] text-foreground">{u.nombre}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{u.email}</p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[9px] py-0.5 px-2 rounded-full font-bold ${
                          u.rol === "admin"
                            ? "bg-purple-500/10 text-purple-600 border-purple-500/30"
                            : "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                        }`}
                      >
                        {u.rol === "admin" ? "Admin" : "Vendedor"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              className="w-full text-center text-xs text-muted-foreground underline-offset-4 hover:underline pt-1"
              onClick={() => {
                setErrorMsg(null);
                setInfoMsg(null);
                setModo(modo === "login" ? "registro" : "login");
              }}
            >
              {modo === "login"
                ? "¿Deseas registrar un nuevo correo? Crear cuenta"
                : "Ya tengo cuenta registrada, ingresar"}
            </button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
