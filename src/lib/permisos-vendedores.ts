import { supabase } from "@/integrations/supabase/client";

export type RolUsuario = "admin" | "vendedor";

export type PermisoUsuario = {
  id?: string;
  userId?: string | null;
  email: string;
  nombre?: string | null;
  rol: RolUsuario;
  vendedorIds: number[]; // Array de IDs de dim_vendedor asignados
  zona?: string | null;
  canal?: string | null;
  marca?: string | null;
  creadoEn?: string;
  actualizadoEn?: string;
};

const STORAGE_KEY_PERMISOS = "TRUCCOS_BI_PERMISOS_USUARIOS_V1";
const STORAGE_KEY_ADMIN_OVERRIDE = "TRUCCOS_BI_ADMIN_SIMULACION";

// Lista oficial preconfigurada según la matriz comercial de Trucco's
export const USUARIOS_INICIALES_PRECONFIGURADOS: PermisoUsuario[] = [
  {
    nombre: "MELISA GOMEZ",
    email: "melisagomez@truccos.com",
    rol: "admin",
    vendedorIds: [],
    zona: "CONSULTA ADMIN",
    canal: "ADMIN",
    marca: "ADMIN",
  },
  {
    nombre: "LUIS VILLA",
    email: "luisvilla@truccos.com",
    rol: "vendedor",
    vendedorIds: [15], // Luis Villa
    zona: "MEDELLIN",
    canal: "MAYORISTA NACIONAL",
    marca: "TRUCCOS",
  },
  {
    nombre: "LINA GARCIA",
    email: "linagarcia@truccos.com",
    rol: "vendedor",
    vendedorIds: [11, 10554], // LINA GARCIA, LINA PLUSS
    zona: "MEDELLIN",
    canal: "MAYORISTA NACIONAL",
    marca: "TRUCCOS",
  },
  {
    nombre: "FREDY SANCHEZ",
    email: "fredysanchez@truccos.com",
    rol: "vendedor",
    vendedorIds: [10, 7, 25], // JOHN FREDY MEDELLIN, JOHN FREDY CORRERIA, JOHN FREDY SANCHEZ
    zona: "MEDELLIN-SANTADERES-SUR-VALLE",
    canal: "MAYORISTA NACIONAL",
    marca: "RAPPAZ",
  },
  {
    nombre: "JUAN DIEGO GIRALDO",
    email: "juandiegogiraldo@truccos.com",
    rol: "vendedor",
    vendedorIds: [16, 12, 18, 34], // DIEGO GIRALDO-MEDELLIN, Diego Giraldo Correria, DIEGO GIRALDO RAPPAZ, DIEGO GIRALDO
    zona: "COSTA - PERIFERIA MEDELLIN",
    canal: "MAYORISTA NACIONAL",
    marca: "TRUCCOS-RAPPAZ",
  },
  {
    nombre: "CLAUDIA GIRALDO",
    email: "claudiagiraldo@truccos.com",
    rol: "vendedor",
    vendedorIds: [131, 157], // Claudia Giraldo, CLAUDIA GIRALDO
    zona: "VALLE",
    canal: "MAYORISTA NACIONAL",
    marca: "TRUCCOS",
  },
  {
    nombre: "DIANA AGUDELO",
    email: "dianaagudelo@truccos.com",
    rol: "vendedor",
    vendedorIds: [58819, 113, 58592, 7968], // DIANA AGUDELO, JONATHAN LOPEZ, CAMILO ZULUAGA, JONATHAN LOPEZ RAPPAZ
    zona: "EJE CAFETERO - SANTANDERES",
    canal: "MAYORISTA NACIONAL",
    marca: "TRUCCOS-RAPPAZ",
  },
  {
    nombre: "JUAN DAVID QUINTANA",
    email: "juandavidquintana@truccos.com",
    rol: "vendedor",
    vendedorIds: [13], // JUAN DAVID QUINTANA
    zona: "SUR",
    canal: "MAYORISTA NACIONAL",
    marca: "TRUCCOS",
  },
  {
    nombre: "ERICA USUAGA",
    email: "ericausuaga@truccos.com",
    rol: "vendedor",
    vendedorIds: [226, 108, 3333], // REDES SOCIALES, TIENDA VIRTUAL, TRJUSA WEB
    zona: "DIGITAL DETAL",
    canal: "DETAL",
    marca: "TRUCCOS-RAPPAZ",
  },
  {
    nombre: "ANGELA ACEVEDO",
    email: "angelaacevedo@truccos.com",
    rol: "vendedor",
    vendedorIds: [58326, 5, 58621], // MAYORISTA DIGITAL, LEADS MAYORISTAS, ANGELA MACARENA
    zona: "DIGITAL MAYORISTA",
    canal: "MAYORISTA DIGITAL/PRESENCIAL",
    marca: "TRUCCOS-RAPPAZ",
  },
  {
    nombre: "CRISTINA RESTREPO",
    email: "cristinarestrepo@truccos.com",
    rol: "vendedor",
    vendedorIds: [57255, 51], // Olga Zuluaga, TRUCCO'S EXPORTACION
    zona: "EXPORTACION",
    canal: "EXPORTACION",
    marca: "TRUCCOS-RAPPAZ",
  },
  {
    nombre: "ALEIDA GALLEGO",
    email: "aleidagallego@truccos.com",
    rol: "vendedor",
    vendedorIds: [14], // ALEIDA GALLEGO
    zona: "PUNTO DE VENTA FABRICA",
    canal: "MAYORISTA DIGITAL/PRESENCIAL",
    marca: "TRUCCOS-RAPPAZ",
  },
  {
    nombre: "ALEJANDRA HERRERA",
    email: "alejandraherrera@truccos.com",
    rol: "vendedor",
    vendedorIds: [3], // ALEJANDRA HERRERA
    zona: "PUNTO DE VENTA FABRICA",
    canal: "MAYORISTA DIGITAL/PRESENCIAL",
    marca: "TRUCCOS-RAPPAZ",
  },
  {
    nombre: "MAYORCA",
    email: "mayorca@truccos.com",
    rol: "vendedor",
    vendedorIds: [9935, 4793, 59048, 4936, 4541], // LINA MARIA ZULUAGA, ANNY FERNANDA YARCE MEJIA, SALOME CASTELLANOS, GLORIA MONTOYA, MAYORCA
    zona: "TIENDA FISICA",
    canal: "DETAL",
    marca: "TRUCCOS",
  },
];

// Lista de administradores globales por defecto
const ADMINS_POR_DEFECTO = [
  "admin@truccos.com",
  "melisagomez",
  "melisa.gomez",
  "melisa@",
  "gerencia@truccos.com",
  "sistemas@truccos.com",
  "daniel@truccos.com",
];

function normalizarTexto(txt: string): string {
  return txt
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Obtiene la lista de permisos configurados desde almacenamiento local, pre-cargando los iniciales si no existen.
 */
export function obtenerTodosLosPermisosLocales(): PermisoUsuario[] {
  if (typeof window === "undefined") return USUARIOS_INICIALES_PRECONFIGURADOS;
  try {
    const data = localStorage.getItem(STORAGE_KEY_PERMISOS);
    if (!data) {
      // Guardar e inicializar con la matriz comercial preconfigurada
      localStorage.setItem(STORAGE_KEY_PERMISOS, JSON.stringify(USUARIOS_INICIALES_PRECONFIGURADOS));
      return USUARIOS_INICIALES_PRECONFIGURADOS;
    }
    const guardados = JSON.parse(data) as PermisoUsuario[];
    
    // Asegurar que Melisa Gomez y los usuarios base estén siempre presentes
    const emailsGuardados = new Set(guardados.map((g) => g.email.toLowerCase()));
    let cambio = false;
    for (const initUser of USUARIOS_INICIALES_PRECONFIGURADOS) {
      if (!emailsGuardados.has(initUser.email.toLowerCase())) {
        guardados.push(initUser);
        cambio = true;
      }
    }
    if (cambio) {
      localStorage.setItem(STORAGE_KEY_PERMISOS, JSON.stringify(guardados));
    }
    return guardados;
  } catch (err) {
    console.warn("Error leyendo permisos locales:", err);
    return USUARIOS_INICIALES_PRECONFIGURADOS;
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
 * Obtiene el permiso de un usuario específico por su email o ID, admitiendo variaciones de correo y nombre.
 */
export function obtenerPermisoUsuario(email?: string | null, userId?: string | null): PermisoUsuario | null {
  if (!email && !userId) return null;
  const normalEmail = (email || "").trim().toLowerCase();
  const emailNormClave = normalizarTexto(normalEmail.split("@")[0] || "");
  const todos = obtenerTodosLosPermisosLocales();

  // 1. Coincidencia exacta por ID o email
  const encontrado = todos.find((p) => {
    if (userId && p.userId && p.userId === userId) return true;
    if (normalEmail && p.email.toLowerCase() === normalEmail) return true;
    return false;
  });

  if (encontrado) return encontrado;

  // 2. Coincidencia difusa por nombre o usuario del correo (ej. melisa.gomez, melisagomez, melisa@...)
  const matchDifuso = todos.find((p) => {
    const pEmailNorm = normalizarTexto(p.email.split("@")[0] || "");
    const pNombreNorm = normalizarTexto(p.nombre || "");
    return (
      (pEmailNorm && emailNormClave.includes(pEmailNorm)) ||
      (emailNormClave && pEmailNorm.includes(emailNormClave)) ||
      (pNombreNorm && emailNormClave.includes(pNombreNorm))
    );
  });

  if (matchDifuso) return matchDifuso;

  // 3. Si no está registrado pero es un admin por defecto
  if (normalEmail && ADMINS_POR_DEFECTO.some((a) => normalEmail.includes(a))) {
    return {
      email: normalEmail,
      nombre: "Administrador",
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

export const STORAGE_KEY_AUTH_SESSION = "TRUCCOS_AUTH_USER_SESSION_V1";

export type AuthUsuarioSession = {
  id: string;
  email: string;
  nombre?: string | null;
  rol: RolUsuario;
  vendedorIds: number[];
  loggedAt: string;
};

export function obtenerSesionActiva(): AuthUsuarioSession | null {
  if (typeof window === "undefined") return null;
  try {
    const data = localStorage.getItem(STORAGE_KEY_AUTH_SESSION);
    if (!data) return null;
    return JSON.parse(data) as AuthUsuarioSession;
  } catch {
    return null;
  }
}

export function guardarSesionActiva(session: AuthUsuarioSession): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_AUTH_SESSION, JSON.stringify(session));
    window.dispatchEvent(new Event("truccos_auth_change"));
  } catch (err) {
    console.warn("Error guardando sesión activa:", err);
  }
}

export function cerrarSesionActiva(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY_AUTH_SESSION);
    sessionStorage.removeItem(STORAGE_KEY_ADMIN_OVERRIDE);
    window.dispatchEvent(new Event("truccos_auth_change"));
  } catch (err) {
    console.warn("Error cerrando sesión activa:", err);
  }
}

