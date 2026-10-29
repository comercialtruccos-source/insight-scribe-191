/**
 * Configuración oficial de Correrías y Colecciones para Trucco's Jeans
 * Define las 5 correrías del año comercial con sus rangos de fechas de corte y análisis.
 */

export interface InfoCorreriaCorte {
  id: number;
  clave: "C1" | "C2" | "C3" | "C4" | "C5";
  nombre: string;
  descripcion: string;
  mesInicio: string; // MM-DD
  mesFin: string; // MM-DD
  rangoTexto: string; // Texto descriptivo del corte
}

export const CORRERIAS_OFICIALES: InfoCorreriaCorte[] = [
  {
    id: 1,
    clave: "C1",
    nombre: "C1 (Ene – Mar)",
    descripcion: "Colección 1: Inicio de Año",
    mesInicio: "01-01",
    mesFin: "03-24",
    rangoTexto: "16 Ene – 24 Mar",
  },
  {
    id: 62,
    clave: "C2",
    nombre: "C2 (Mar – May)",
    descripcion: "Colección 2: Temporada Madres",
    mesInicio: "03-25",
    mesFin: "05-24",
    rangoTexto: "25 Mar – 24 May",
  },
  {
    id: 123,
    clave: "C3",
    nombre: "C3 (May – Jul)",
    descripcion: "Colección 3: Padres y Mitad de Año",
    mesInicio: "05-25",
    mesFin: "07-15",
    rangoTexto: "25 May – 15 Jul",
  },
  {
    id: 201,
    clave: "C4",
    nombre: "C4 (Jul – Sep)",
    descripcion: "Colección 4: ColombiaModa y Amor & Amistad",
    mesInicio: "07-16",
    mesFin: "09-10",
    rangoTexto: "16 Jul – 10 Sep",
  },
  {
    id: 284,
    clave: "C5",
    nombre: "C5 (Sep – Dic)",
    descripcion: "Colección 5: Fin de Año y Navidad",
    mesInicio: "09-11",
    mesFin: "12-31",
    rangoTexto: "11 Sep – 31 Dic",
  },
];

export interface RangoCorreriaResultado {
  clave: "C1" | "C2" | "C3" | "C4" | "C5";
  nombre: string;
  anio: number;
  fechaDesde: string; // YYYY-MM-DD
  fechaHasta: string; // YYYY-MM-DD
  rangoTexto: string;
  etiqueta: string; // ej. "C1 (2026)"
  descripcion: string;
}

/**
 * Obtiene el rango exacto de fechas ISO para una correría y año determinados.
 */
export function obtenerRangoFechasCorreria(
  clave: string,
  anio: number | string = 2026
): RangoCorreriaResultado | null {
  const anioNum = typeof anio === "string" ? parseInt(anio, 10) || 2026 : anio;
  const claveNorm = String(clave || "").trim().toUpperCase();
  const corr = CORRERIAS_OFICIALES.find((c) => c.clave === claveNorm);
  if (!corr) return null;

  const fechaDesde = `${anioNum}-${corr.mesInicio}`;
  const fechaHasta = `${anioNum}-${corr.mesFin}`;

  return {
    clave: corr.clave,
    nombre: corr.nombre,
    anio: anioNum,
    fechaDesde,
    fechaHasta,
    rangoTexto: `${corr.rangoTexto} ${anioNum}`,
    etiqueta: `${corr.clave} ${anioNum}`,
    descripcion: corr.descripcion,
  };
}

/**
 * Detecta a qué correría pertenece una fecha determinada (formato YYYY-MM-DD o DD/MM/YYYY).
 */
export function detectarCorreriaPorFecha(fechaStr: string): {
  clave: "C1" | "C2" | "C3" | "C4" | "C5";
  anio: number;
  etiqueta: string;
} | null {
  if (!fechaStr) return null;
  let fIso = fechaStr.trim();
  if (fIso.includes("/")) {
    const parts = fIso.split("/");
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        fIso = `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
      } else {
        const y = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
        fIso = `${y}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
      }
    }
  }

  const anio = parseInt(fIso.slice(0, 4), 10);
  if (isNaN(anio) || anio < 2000) return null;
  const mesDia = fIso.slice(5, 10);

  for (const corr of CORRERIAS_OFICIALES) {
    if (mesDia >= corr.mesInicio && mesDia <= corr.mesFin) {
      return {
        clave: corr.clave,
        anio,
        etiqueta: `${corr.clave} (${anio})`,
      };
    }
  }

  // Si cae en los primeros días de enero antes del 16, asignar a C1
  if (mesDia < "01-16") {
    return {
      clave: "C1",
      anio,
      etiqueta: `C1 (${anio})`,
    };
  }

  return null;
}
