import { supabase } from "@/integrations/supabase/client";

export type RolUsuario = "admin" | "vendedor";

export type PermisoUsuario = {
  id?: string;
  userId?: string | null;
  email: string;
  nombre?: string | null;
  rol: RolUsuario;
  vendedorIds: number[]; // Array de IDs de dim_vendedor asignados (ej. [12, 18])
  creadoEn?: string;
  actualizadoEn?: string;
};

const STORAGE_KEY_PERMISOS = "TRUCCOS_BI_PERMISOS_USUARIOS_V1";
const STORAGE_KEY_ADMIN_OVERRIDE = "TRUCCOS_BI_ADMIN_SIMULACION";

// Lista por defecto de administradores conocidos
const ADMINS_POR_DEFECTO = [
  "admin@truccos.com",
  "gerencia@truccos.com",
  "sistemas@truccos.com",
  "daniel@truccos.com",
];

/**
 * Obtiene la lista de permisos configurados desde almacenamiento local.
 */
export function obtenerTodosLosPermisosLocales(): PermisoUsuario[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY_PERMISOS);
    if (!data) return [];
    return JSON.parse(data) as PermisoUsuario[];
  } catch (err) {
    console.warn("Error leyendo permisos locales:", err);
    return [];
  }
}

/**
 * Guarda la lista completa de permisos de usuarios.
 */
export function guardarTodosLosPermisosLocales(permisos: PermisoUsuario[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_PERMISOS, JSON.stringify(permisos));
    window.dispatchEvent(new Event("truccos_permisos_actualizados"));
  } catch (err) {
    console.warn("Error guardando permisos locales:", err);
  }
}

/**
 * Obtiene el permiso de un usuario específico por su email o ID.
 */
export function obtenerPermisoUsuario(email?: string | null, userId?: string | null): PermisoUsuario | null {
  if (!email && !userId) return null;
  const normalEmail = (email || "").trim().toLowerCase();
  const todos = obtenerTodosLosPermisosLocales();

  const encontrado = todos.find((p) => {
    if (userId && p.userId && p.userId === userId) return true;
    if (normalEmail && p.email.toLowerCase() === normalEmail) return true;
    return false;
  });

  if (encontrado) return encontrado;

  // Si no está registrado pero es un admin por defecto o no hay reglas aún
  if (normalEmail && ADMINS_POR_DEFECTO.some((a) => normalEmail.includes(a.split("@")[0]))) {
    return {
      email: normalEmail,
      rol: "admin",
      vendedorIds: [],
    };
  }

  // Por defecto, si aún no hay usuarios configurados, el usuario actual se considera administrador
  if (todos.length === 0 && normalEmail) {
    return {
      email: normalEmail,
      rol: "admin",
      vendedorIds: [],
    };
  }

  return null;
}

/**
 * Guarda o actualiza la asignación de un usuario específico.
 */
export function guardarPermisoUsuario(permiso: Omit<PermisoUsuario, "actualizadoEn">): void {
  const todos = obtenerTodosLosPermisosLocales();
  const normalEmail = permiso.email.trim().toLowerCase();
  const index = todos.findIndex(
    (p) =>
      (permiso.userId && p.userId === permiso.userId) ||
      p.email.toLowerCase() === normalEmail
  );

  const payload: PermisoUsuario = {
    ...permiso,
    email: normalEmail,
    vendedorIds: Array.from(new Set(permiso.vendedorIds || [])),
    actualizadoEn: new Date().toISOString(),
    creadoEn: index >= 0 ? todos[index].creadoEn : new Date().toISOString(),
  };

  if (index >= 0) {
    todos[index] = payload;
  } else {
    todos.push(payload);
  }

  guardarTodosLosPermisosLocales(todos);
}

/**
 * Elimina la asignación de un usuario específico.
 */
export function eliminarPermisoUsuario(email: string): void {
  const normalEmail = email.trim().toLowerCase();
  const todos = obtenerTodosLosPermisosLocales().filter(
    (p) => p.email.toLowerCase() !== normalEmail
  );
  guardarTodosLosPermisosLocales(todos);
}

/**
 * Simulación de vista para pruebas de administradores.
 */
export function obtenerSimulacionAdmin(): PermisoUsuario | null {
  if (typeof window === "undefined") return null;
  try {
    const data = sessionStorage.getItem(STORAGE_KEY_ADMIN_OVERRIDE);
    if (!data) return null;
    return JSON.parse(data) as PermisoUsuario;
  } catch {
    return null;
  }
}

export function establecerSimulacionAdmin(permiso: PermisoUsuario | null): void {
  if (typeof window === "undefined") return;
  if (!permiso) {
    sessionStorage.removeItem(STORAGE_KEY_ADMIN_OVERRIDE);
  } else {
    sessionStorage.setItem(STORAGE_KEY_ADMIN_OVERRIDE, JSON.stringify(permiso));
  }
  window.dispatchEvent(new Event("truccos_permisos_actualizados"));
}
