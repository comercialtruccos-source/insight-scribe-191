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
    vendedorIds: [10, 7, 25], // JOHN FREDY MEDELLIN, JOHN FREDY CORRERIA, TOTAL FREDY
    zona: "MEDELLIN-SANTADERES-SUR-VALLE",
    canal: "MAYORISTA NACIONAL",
    marca: "RAPPAZ",
  },
  {
    nombre: "JUAN DIEGO GIRALDO",
    email: "juandiegogiraldo@truccos.com",
    rol: "vendedor",
    vendedorIds: [16, 12, 18, 34], // DIEGO GIRALDO-MEDELLIN, Diego Giraldo Correria, DIEGO GIRALDO RAPPAZ, TOTAL DIEGO
    zona: "COSTA - PERIFERIA MEDELLIN",
    canal: "MAYORISTA NACIONAL",
    marca: "TRUCCOS-RAPPAZ",
  },
  {
    nombre: "CLAUDIA GIRALDO",
    email: "claudiagiraldo@truccos.com",
    rol: "vendedor",
    vendedorIds: [157, 131, 60964], // Claudia Giraldo, CLAUDIA GIRALDO, CLAUDIA FIN DE AÑO (HGI; en dim_vendedor quedó como "[EXCLUIDO] 60964")
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
    vendedorIds: [108, 226, 3333], // TIENDA VIRTUAL, REDES SOCIALES, TRJUSA WEB
    zona: "DIGITAL DETAL",
    canal: "DETAL",
    marca: "TRUCCOS-RAPPAZ",
  },
  {
    nombre: "MAYORISTA DIGITAL",
    email: "mayoristadigital@truccos.com",
    rol: "vendedor",
    vendedorIds: [58326], // MAYORISTA DIGITAL (LEADS MAYORISTAS es una fila aparte en el CMI y no suma a este usuario)
    zona: "DIGITAL MAYORISTA",
    canal: "MAYORISTA DIGITAL/PRESENCIAL",
    marca: "TRUCCOS-RAPPAZ",
  },
  {
    nombre: "CRISTINA RESTREPO",
    email: "cristinarestrepo@truccos.com",
    rol: "vendedor",
    vendedorIds: [51, 57255], // TRUCCO'S EXPORTACION, Olga Zuluaga
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
    vendedorIds: [4541, 9935, 4793, 59048, 4936, 8974], // MAYORCA, LINA MARIA ZULUAGA, ANNY FERNANDA YARCE MEJIA, SALOME CASTELLANOS, GLORIA MONTOYA, KAROL DUQUE MESA
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
    let guardados = JSON.parse(data) as PermisoUsuario[];

    // Migrar cuentas previas (ej. Angela Acevedo -> Mayorista Digital)
    for (const g of guardados) {
      const gEmail = (g.email || "").toLowerCase();
      const gNom = (g.nombre || "").toUpperCase();
      if (gEmail.includes("angelaacevedo") || gNom.includes("ANGELA")) {
        g.nombre = "MAYORISTA DIGITAL";
        g.email = "mayoristadigital@truccos.com";
        g.vendedorIds = [58326];
        g.zona = "DIGITAL MAYORISTA";
        g.canal = "MAYORISTA DIGITAL/PRESENCIAL";
        g.marca = "TRUCCOS-RAPPAZ";
      }
    }
    
    // Purgar cuentas antiguas no autorizadas del almacenamiento local
    const correosPermitidos = new Set(USUARIOS_INICIALES_PRECONFIGURADOS.map((u) => u.email.toLowerCase()));
    const filtrados = guardados.filter((x) => correosPermitidos.has((x.email || "").toLowerCase()));
    let cambio = filtrados.length !== guardados.length;
    guardados = filtrados;

    // Sincronizar y asegurar que los asesores de la matriz comercial oficial estén presentes con todos sus IDs oficiales
    for (const initUser of USUARIOS_INICIALES_PRECONFIGURADOS) {
      const g = guardados.find((x) => x.email.toLowerCase() === initUser.email.toLowerCase());
      if (!g) {
        guardados.push(initUser);
        cambio = true;
      } else {
        // Garantizar campos oficiales y IDs oficiales exactos
        g.nombre = initUser.nombre;
        g.zona = initUser.zona;
        g.canal = initUser.canal;
        g.marca = initUser.marca;
        g.vendedorIds = [...initUser.vendedorIds];
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
  let normalEmail = (email || "").trim().toLowerCase();
  if (normalEmail && !normalEmail.includes("@")) {
    normalEmail = `${normalEmail}@truccos.com`;
  }
  if (normalEmail.includes("angelaacevedo") || normalEmail.includes("angela@")) {
    normalEmail = "mayoristadigital@truccos.com";
  }
  const emailNormClave = normalizarTexto(normalEmail.split("@")[0] || "");

  // 1. Coincidencia directa en la matriz oficial preconfigurada
  const matchOficial = USUARIOS_INICIALES_PRECONFIGURADOS.find((p) => {
    if (userId && p.userId && p.userId === userId) return true;
    if (normalEmail && p.email.toLowerCase() === normalEmail) return true;
    const pEmailNorm = normalizarTexto(p.email.split("@")[0] || "");
    const pNombreNorm = normalizarTexto(p.nombre || "");
    return (
      (pEmailNorm && emailNormClave === pEmailNorm) ||
      (pNombreNorm && emailNormClave === pNombreNorm) ||
      (pEmailNorm && emailNormClave.includes(pEmailNorm)) ||
      (emailNormClave && pEmailNorm.includes(emailNormClave))
    );
  });
  if (matchOficial) return matchOficial;

  const todos = obtenerTodosLosPermisosLocales();

  // 2. Coincidencia exacta por ID o email en almacenamiento local
  const encontrado = todos.find((p) => {
    if (userId && p.userId && p.userId === userId) return true;
    if (normalEmail && p.email.toLowerCase() === normalEmail) return true;
    return false;
  });

  if (encontrado) return encontrado;

  // 3. Coincidencia difusa por nombre o usuario del correo
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

  // 4. Si no está registrado pero es un admin por defecto
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
    const permiso = JSON.parse(data) as PermisoUsuario;
    if (permiso.email?.toLowerCase().includes("juandiegogiraldo") && permiso.vendedorIds?.includes(34)) {
      permiso.vendedorIds = permiso.vendedorIds.filter((id) => id !== 34);
      sessionStorage.setItem(STORAGE_KEY_ADMIN_OVERRIDE, JSON.stringify(permiso));
    }
    if (
      (permiso.email?.toLowerCase().includes("fredy") || (permiso.nombre && permiso.nombre.toLowerCase().includes("fredy"))) &&
      permiso.vendedorIds?.includes(25)
    ) {
      permiso.vendedorIds = permiso.vendedorIds.filter((id) => id !== 25);
      sessionStorage.setItem(STORAGE_KEY_ADMIN_OVERRIDE, JSON.stringify(permiso));
    }
    return permiso;
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
    const session = JSON.parse(data) as AuthUsuarioSession;
    if (session.email?.toLowerCase().includes("juandiegogiraldo") && session.vendedorIds?.includes(34)) {
      session.vendedorIds = session.vendedorIds.filter((id) => id !== 34);
      localStorage.setItem(STORAGE_KEY_AUTH_SESSION, JSON.stringify(session));
    }
    if (
      (session.email?.toLowerCase().includes("fredy") || (session.nombre && session.nombre.toLowerCase().includes("fredy"))) &&
      session.vendedorIds?.includes(25)
    ) {
      session.vendedorIds = session.vendedorIds.filter((id) => id !== 25);
      localStorage.setItem(STORAGE_KEY_AUTH_SESSION, JSON.stringify(session));
    }
    return session;
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

/**
 * Obtiene la lista de nombres y variaciones de vendedor autorizados para un asesor comercial.
 * Permite filtrar de forma estricta los registros de HGI para que cada vendedor solo vea sus propios pedidos.
 * Si el usuario es administrador (rol === "admin"), retorna undefined (sin restricción).
 */
export function obtenerNombresVendedoresAutorizados(
  permiso: PermisoUsuario | null,
  dimVendedores?: { id: number; nombre: string }[]
): string[] | undefined {
  if (!permiso || permiso.rol === "admin") {
    return undefined; // Administrador: sin restricción, puede consultar todo
  }

  const nombres = new Set<string>();

  // 1. Nombre oficial del asesor
  if (permiso.nombre && permiso.nombre.trim()) {
    nombres.add(permiso.nombre.trim());
  }

  // 2. Mapear cada ID asignado de dim_vendedor a su nombre real
  if (permiso.vendedorIds && permiso.vendedorIds.length > 0 && dimVendedores) {
    for (const vId of permiso.vendedorIds) {
      const vFound = dimVendedores.find((dv) => dv.id === vId);
      if (vFound && vFound.nombre) {
        nombres.add(vFound.nombre.trim());
      }
    }
  }

  // 3. Diccionario preconfigurado de alias y sub-carteras comerciales oficiales de Trucco's
  const pNomUpper = (permiso.nombre || "").toUpperCase();
  const pEmailLower = (permiso.email || "").toLowerCase();

  if (pNomUpper.includes("LUIS VILLA") || pEmailLower.includes("luisvilla")) {
    nombres.add("LUIS VILLA");
    nombres.add("Luis Villa");
  } else if (pNomUpper.includes("LINA GARCIA") || pEmailLower.includes("linagarcia")) {
    nombres.add("LINA GARCIA");
    nombres.add("LINA PLUSS");
  } else if (pNomUpper.includes("FREDY") || pEmailLower.includes("fredy")) {
    nombres.add("FREDY SANCHEZ");
    nombres.add("JOHN FREDY MEDELLIN");
    nombres.add("JOHN FREDY CORRERIA");
    nombres.add("JOHN FREDY");
  } else if (pNomUpper.includes("DIEGO GIRALDO") || pEmailLower.includes("juandiegogiraldo")) {
    nombres.add("JUAN DIEGO GIRALDO");
    nombres.add("DIEGO GIRALDO");
    nombres.add("DIEGO GIRALDO-MEDELLIN");
    nombres.add("Diego Giraldo Correria");
    nombres.add("DIEGO GIRALDO RAPPAZ");
  } else if (pNomUpper.includes("CLAUDIA GIRALDO") || pEmailLower.includes("claudiagiraldo")) {
    nombres.add("CLAUDIA GIRALDO");
    nombres.add("Claudia Giraldo");
  } else if (pNomUpper.includes("DIANA AGUDELO") || pEmailLower.includes("dianaagudelo")) {
    nombres.add("DIANA AGUDELO");
    nombres.add("JONATHAN LOPEZ");
    nombres.add("CAMILO ZULUAGA");
    nombres.add("JONATHAN LOPEZ RAPPAZ");
  } else if (pNomUpper.includes("JUAN DAVID QUINTANA") || pEmailLower.includes("juandavidquintana")) {
    nombres.add("JUAN DAVID QUINTANA");
  } else if (pNomUpper.includes("ERICA USUAGA") || pEmailLower.includes("ericausuaga")) {
    nombres.add("ERICA USUAGA");
    nombres.add("TIENDA VIRTUAL");
    nombres.add("REDES SOCIALES");
    nombres.add("TRJUSA WEB");
  } else if (
    pNomUpper.includes("MAYORISTA DIGITAL") ||
    pNomUpper.includes("ANGELA") ||
    pEmailLower.includes("mayoristadigital") ||
    pEmailLower.includes("angelaacevedo")
  ) {
    nombres.add("MAYORISTA DIGITAL");
  } else if (pNomUpper.includes("CRISTINA RESTREPO") || pEmailLower.includes("cristinarestrepo")) {
    nombres.add("CRISTINA RESTREPO");
    nombres.add("TRUCCO'S EXPORTACION");
    nombres.add("Olga Zuluaga");
  } else if (pNomUpper.includes("ALEIDA GALLEGO") || pEmailLower.includes("aleidagallego")) {
    nombres.add("ALEIDA GALLEGO");
  } else if (pNomUpper.includes("ALEJANDRA HERRERA") || pEmailLower.includes("alejandraherrera")) {
    nombres.add("ALEJANDRA HERRERA");
  } else if (pNomUpper.includes("MAYORCA") || pEmailLower.includes("mayorca")) {
    nombres.add("MAYORCA");
    nombres.add("LINA MARIA ZULUAGA");
    nombres.add("ANNY FERNANDA YARCE MEJIA");
    nombres.add("SALOME CASTELLANOS");
    nombres.add("GLORIA MONTOYA");
    nombres.add("KAROL DUQUE MESA");
  }

  return Array.from(nombres);
}

