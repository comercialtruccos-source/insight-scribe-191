import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users,
  ShieldCheck,
  UserCheck,
  Plus,
  Trash2,
  Search,
  Check,
  X,
  AlertCircle,
  Eye,
  Settings2,
  Lock,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  PermisoUsuario,
  RolUsuario,
  obtenerTodosLosPermisosLocales,
  guardarPermisoUsuario,
  eliminarPermisoUsuario,
  establecerSimulacionAdmin,
  obtenerSimulacionAdmin,
} from "@/lib/permisos-vendedores";
import type { CatalogoItem } from "@/lib/ventas-api";

interface AdminPermisosVendedoresDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendedoresCatalogo: CatalogoItem[];
  currentUserEmail?: string | null;
  onPermisosActualizados?: () => void;
}

export function AdminPermisosVendedoresDialog({
  open,
  onOpenChange,
  vendedoresCatalogo,
  currentUserEmail,
  onPermisosActualizados,
}: AdminPermisosVendedoresDialogProps) {
  const [permisos, setPermisos] = useState<PermisoUsuario[]>(() =>
    obtenerTodosLosPermisosLocales()
  );
  const [simulacionActual, setSimulacionActual] = useState<PermisoUsuario | null>(() =>
    obtenerSimulacionAdmin()
  );

  // Estado del formulario para crear/editar
  const [modoEdicion, setModoEdicion] = useState<boolean>(false);
  const [emailForm, setEmailForm] = useState<string>("");
  const [nombreForm, setNombreForm] = useState<string>("");
  const [rolForm, setRolForm] = useState<RolUsuario>("vendedor");
  const [vendedoresSeleccionados, setVendedoresSeleccionados] = useState<number[]>([]);
  const [busquedaVendedor, setBusquedaVendedor] = useState<string>("");
  const [busquedaUsuario, setBusquedaUsuario] = useState<string>("");

  const recargarPermisos = () => {
    const list = obtenerTodosLosPermisosLocales();
    setPermisos(list);
    setSimulacionActual(obtenerSimulacionAdmin());
    if (onPermisosActualizados) {
      onPermisosActualizados();
    }
  };

  const iniciarNuevoUsuario = () => {
    setEmailForm("");
    setNombreForm("");
    setRolForm("vendedor");
    setVendedoresSeleccionados([]);
    setBusquedaVendedor("");
    setModoEdicion(true);
  };

  const editarUsuario = (p: PermisoUsuario) => {
    setEmailForm(p.email);
    setNombreForm(p.nombre || "");
    setRolForm(p.rol);
    setVendedoresSeleccionados(p.vendedorIds || []);
    setBusquedaVendedor("");
    setModoEdicion(true);
  };

  const toggleVendedor = (vId: number) => {
    setVendedoresSeleccionados((prev) => {
      if (prev.includes(vId)) {
        return prev.filter((id) => id !== vId);
      } else {
        // Sugerencia visual si selecciona más de 2 vendedores
        if (prev.length >= 2) {
          toast.info("Has seleccionado más de 2 vendedores. El usuario tendrá acceso a todos los seleccionados.");
        }
        return [...prev, vId];
      }
    });
  };

  const guardarUsuario = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailForm.trim()) {
      toast.error("Por favor ingresa un correo electrónico válido");
      return;
    }

    if (rolForm === "vendedor" && vendedoresSeleccionados.length === 0) {
      toast.error("Debes asignar al menos 1 vendedor para este usuario");
      return;
    }

    guardarPermisoUsuario({
      email: emailForm.trim().toLowerCase(),
      nombre: nombreForm.trim() || undefined,
      rol: rolForm,
      vendedorIds: rolForm === "admin" ? [] : vendedoresSeleccionados,
    });

    toast.success(`Permisos guardados correctamente para ${emailForm}`);
    setModoEdicion(false);
    recargarPermisos();
  };

  const eliminarUsuario = (email: string) => {
    if (confirm(`¿Estás seguro de eliminar los permisos configurados para ${email}?`)) {
      eliminarPermisoUsuario(email);
      toast.success(`Permisos eliminados para ${email}`);
      recargarPermisos();
    }
  };

  const toggleSimulacion = (p: PermisoUsuario | null) => {
    if (!p) {
      establecerSimulacionAdmin(null);
      setSimulacionActual(null);
      toast.info("Modo simulación desactivado. Vista de administrador restaurada.");
    } else {
      establecerSimulacionAdmin(p);
      setSimulacionActual(p);
      toast.success(`Simulando vista del usuario ${p.email} (${p.vendedorIds.length} vendedores asignados)`);
    }
    if (onPermisosActualizados) onPermisosActualizados();
  };

  const vendedoresFiltrados = vendedoresCatalogo.filter((v) =>
    v.nombre.toLowerCase().includes(busquedaVendedor.toLowerCase())
  );

  const usuariosFiltrados = permisos.filter(
    (p) =>
      p.email.toLowerCase().includes(busquedaUsuario.toLowerCase()) ||
      (p.nombre && p.nombre.toLowerCase().includes(busquedaUsuario.toLowerCase()))
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-background border-border/80 shadow-2xl">
        {/* Encabezado */}
        <DialogHeader className="p-6 pb-4 border-b border-border/60 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold tracking-tight">
                  Administración de Acceso y Consulta de Vendedores
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Asigna vendedores específicos (hasta 2 o más) a cada usuario para restringir qué información pueden consultar.
                </DialogDescription>
              </div>
            </div>
            {!modoEdicion && (
              <Button
                size="sm"
                onClick={iniciarNuevoUsuario}
                className="gap-1.5 h-8 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                Asignar Usuario
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Banner de Simulación si está activa */}
        {simulacionActual && (
          <div className="bg-amber-500/15 border-b border-amber-500/30 px-6 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-medium text-amber-700 dark:text-amber-400">
              <Eye className="h-4 w-4 animate-pulse" />
              <span>
                <strong>Modo Simulación Activo:</strong> Estás viendo el panel como <u>{simulacionActual.email}</u> con {simulacionActual.vendedorIds.length} vendedor(es) asignado(s).
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleSimulacion(null)}
              className="h-7 text-xs border-amber-500/40 hover:bg-amber-500/10 text-amber-800 dark:text-amber-300"
            >
              Restaurar Vista Admin
            </Button>
          </div>
        )}

        {/* Cuerpo Principal */}
        <div className="flex-1 overflow-y-auto p-6">
          {modoEdicion ? (
            /* FORMULARIO DE ASIGNACIÓN */
            <form onSubmit={guardarUsuario} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Correo Electrónico del Usuario *</Label>
                  <Input
                    type="email"
                    placeholder="ej. vendedor1@truccos.com"
                    value={emailForm}
                    onChange={(e) => setEmailForm(e.target.value)}
                    required
                    className="h-9 text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Debe coincidir con el correo que el usuario usa para iniciar sesión.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Nombre o Alias (Opcional)</Label>
                  <Input
                    type="text"
                    placeholder="ej. Carlos Pérez (Zona Norte)"
                    value={nombreForm}
                    onChange={(e) => setNombreForm(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Rol y Nivel de Acceso</Label>
                <Select value={rolForm} onValueChange={(v) => setRolForm(v as RolUsuario)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Seleccionar Rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vendedor">
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-emerald-600" />
                        <span>Vendedor (Acceso restringido únicamente a sus vendedores asignados)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-indigo-600" />
                        <span>Administrador (Acceso total a todos los vendedores y configuración)</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {rolForm === "vendedor" && (
                <div className="space-y-3 pt-2 border-t border-border/60">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs font-semibold flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-primary" />
                        Vendedores Asignados para Consulta
                        <Badge variant="secondary" className="ml-1 text-[11px] font-bold">
                          {vendedoresSeleccionados.length} seleccionado(s)
                        </Badge>
                      </Label>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Puedes asignar 1, 2 o más vendedores de la base de datos comercial.
                      </p>
                    </div>
                    {vendedoresSeleccionados.length > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setVendedoresSeleccionados([])}
                        className="h-6 text-[11px] text-muted-foreground hover:text-destructive"
                      >
                        Limpiar selección
                      </Button>
                    )}
                  </div>

                  {/* Badges de seleccionados */}
                  {vendedoresSeleccionados.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-muted/40 border border-border/50">
                      {vendedoresSeleccionados.map((vId) => {
                        const vItem = vendedoresCatalogo.find((c) => c.id === vId);
                        return (
                          <Badge
                            key={vId}
                            variant="secondary"
                            className="text-xs py-1 pl-2.5 pr-1 gap-1.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60"
                          >
                            <span>{vItem ? vItem.nombre : `Vendedor ID: ${vId}`}</span>
                            <button
                              type="button"
                              onClick={() => toggleVendedor(vId)}
                              className="rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-800 p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        );
                      })}
                    </div>
                  )}

                  {/* Buscador de vendedores */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Buscar vendedor en el catálogo..."
                      value={busquedaVendedor}
                      onChange={(e) => setBusquedaVendedor(e.target.value)}
                      className="pl-8 h-8 text-xs"
                    />
                  </div>

                  {/* Lista con checkboxes */}
                  <ScrollArea className="h-44 rounded-md border border-border/70 p-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {vendedoresFiltrados.map((v) => {
                        const isSelected = vendedoresSeleccionados.includes(v.id);
                        return (
                          <div
                            key={v.id}
                            onClick={() => toggleVendedor(v.id)}
                            className={`flex items-center justify-between p-2 rounded-md text-xs cursor-pointer transition-colors border ${
                              isSelected
                                ? "bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800 text-indigo-950 dark:text-indigo-200 font-semibold"
                                : "bg-card hover:bg-muted/60 border-border/40 text-foreground"
                            }`}
                          >
                            <span className="truncate pr-2">{v.nombre}</span>
                            <div
                              className={`h-4 w-4 rounded flex items-center justify-center shrink-0 border ${
                                isSelected
                                  ? "bg-indigo-600 border-indigo-600 text-white"
                                  : "border-muted-foreground/40"
                              }`}
                            >
                              {isSelected && <Check className="h-3 w-3" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Botones del Formulario */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModoEdicion(false)}
                  className="h-8 text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="h-8 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
                >
                  <Check className="h-3.5 w-3.5" />
                  Guardar Permisos
                </Button>
              </div>
            </form>
          ) : (
            /* LISTA DE USUARIOS ASIGNADOS */
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Filtrar por correo o nombre..."
                    value={busquedaUsuario}
                    onChange={(e) => setBusquedaUsuario(e.target.value)}
                    className="pl-8 h-8 text-xs"
                  />
                </div>
                <Badge variant="outline" className="text-xs font-mono">
                  {permisos.length} usuario(s) configurado(s)
                </Badge>
              </div>

              {usuariosFiltrados.length === 0 ? (
                <div className="text-center py-10 border border-dashed rounded-xl border-border/70 p-6">
                  <UserCheck className="mx-auto h-8 w-8 text-muted-foreground/60 mb-2" />
                  <p className="text-sm font-semibold text-foreground">No hay usuarios con permisos configurados</p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                    Asigna vendedores a los correos de tus comerciales para que solo puedan visualizar y consultar sus datos.
                  </p>
                  <Button
                    size="sm"
                    onClick={iniciarNuevoUsuario}
                    className="gap-1.5 h-8 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Asignar Primer Usuario
                  </Button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {usuariosFiltrados.map((p) => {
                    const esCurrentUser = currentUserEmail && p.email.toLowerCase() === currentUserEmail.toLowerCase();
                    const esSimulado = simulacionActual && simulacionActual.email.toLowerCase() === p.email.toLowerCase();

                    return (
                      <div
                        key={p.email}
                        className={`p-3.5 rounded-xl border transition-all ${
                          esSimulado
                            ? "bg-amber-50/70 dark:bg-amber-950/30 border-amber-400 dark:border-amber-700 shadow-sm"
                            : "bg-card hover:bg-muted/30 border-border/70 shadow-2xs"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-xs text-foreground">{p.email}</span>
                              {p.nombre && (
                                <span className="text-[11px] text-muted-foreground">({p.nombre})</span>
                              )}
                              {esCurrentUser && (
                                <Badge variant="secondary" className="text-[10px] py-0 px-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                  Tú
                                </Badge>
                              )}
                              <Badge
                                variant="outline"
                                className={`text-[10px] py-0 px-1.5 font-bold ${
                                  p.rol === "admin"
                                    ? "bg-purple-500/10 text-purple-600 border-purple-500/30"
                                    : "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                }`}
                              >
                                {p.rol === "admin" ? "Administrador (Total)" : "Vendedor Restringido"}
                              </Badge>
                            </div>

                            {/* Vendedores asignados */}
                            {p.rol === "vendedor" && (
                              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                                <span className="text-[11px] font-medium text-muted-foreground">
                                  Vendedores asignados ({p.vendedorIds.length}):
                                </span>
                                {p.vendedorIds.length === 0 ? (
                                  <span className="text-[11px] text-amber-600 dark:text-amber-400 italic">
                                    Sin vendedores asignados
                                  </span>
                                ) : (
                                  p.vendedorIds.map((vId) => {
                                    const vItem = vendedoresCatalogo.find((c) => c.id === vId);
                                    return (
                                      <Badge
                                        key={vId}
                                        variant="secondary"
                                        className="text-[10px] py-0.5 px-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                                      >
                                        {vItem ? vItem.nombre : `ID ${vId}`}
                                      </Badge>
                                    );
                                  })
                                )}
                              </div>
                            )}
                          </div>

                          {/* Acciones por usuario */}
                          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                            {p.rol === "vendedor" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleSimulacion(esSimulado ? null : p)}
                                className={`h-7 px-2 text-xs gap-1 ${
                                  esSimulado
                                    ? "bg-amber-500/20 text-amber-800 dark:text-amber-300"
                                    : "hover:bg-muted text-muted-foreground"
                                }`}
                                title="Simular la vista de este usuario para probar"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                {esSimulado ? "Viendo" : "Simular"}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => editarUsuario(p)}
                              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                            >
                              Editar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => eliminarUsuario(p.email)}
                              className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 border-t border-border/60 bg-muted/20 flex items-center justify-between sm:justify-between">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5 text-primary" />
            <span>Los usuarios restringidos nunca podrán seleccionar ni ver datos de otros vendedores.</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="h-8 text-xs">
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
