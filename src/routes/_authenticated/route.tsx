import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const navigate = useNavigate();
  const [cargando, setCargando] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let montado = true;

    const verificarAuth = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session?.user) {
          if (montado) {
            setUser(sessionData.session.user);
            setCargando(false);
          }
          return;
        }

        const { data: userData, error } = await supabase.auth.getUser();
        if (error || !userData?.user) {
          if (montado) navigate({ to: "/auth" });
        } else {
          if (montado) {
            setUser(userData.user);
            setCargando(false);
          }
        }
      } catch {
        if (montado) navigate({ to: "/auth" });
      } finally {
        if (montado) setCargando(false);
      }
    };

    verificarAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          setUser(session.user);
          setCargando(false);
        } else if (event === "SIGNED_OUT") {
          navigate({ to: "/auth" });
        }
      }
    );

    return () => {
      montado = false;
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  if (cargando) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <Outlet />;
}
