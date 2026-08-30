/**
 * Un acento por maestría.
 *
 * El verde institucional sostiene la página (fondos, navegación, tipografía),
 * pero si TODO fuera verde la oferta académica se leería como un bloque único.
 * Cada programa recibe entonces un color propio que lo acompaña desde la
 * tarjeta hasta su página de detalle: el mismo componente cambia de
 * personalidad cromática porque cambia el contenido, no por decoración.
 *
 * `accent` se inyecta como variable CSS --accent, así que cualquier clase
 * `text-[var(--accent)]` / `bg-[var(--accent)]` sigue al programa activo.
 */
export interface ProgramAccent {
  /** Color sólido, ya validado para texto sobre hueso (#F6F3EC). */
  accent: string;
  /** Versión clara para fondos de badge / relleno suave. */
  soft: string;
  /** Campo de conocimiento — se muestra como etiqueta en la tarjeta. */
  campo: string;
}

const PALETTE: ProgramAccent[] = [
  { accent: "#B8791F", soft: "#B8791F14", campo: "Educación" },
  { accent: "#3F51B5", soft: "#3F51B514", campo: "Negocios" },
  { accent: "#C2185B", soft: "#C2185B14", campo: "Marketing" },
  { accent: "#00796B", soft: "#00796B14", campo: "Finanzas" },
  { accent: "#D2542B", soft: "#D2542B14", campo: "Talento" },
  { accent: "#6A4BA6", soft: "#6A4BA614", campo: "Auditoría" },
];

const BY_SLUG: Record<string, ProgramAccent> = {
  "docencia-superior": PALETTE[0],
  "administracion-empresas-inteligencia-negocios": PALETTE[1],
  "marketing-digital-comercio-electronico": PALETTE[2],
  fintech: PALETTE[3],
  "talento-humano": PALETTE[4],
  "auditoria-desempeno": PALETTE[5],
};

/** Devuelve el acento del slug; si la API trae un programa nuevo, cae en la paleta por índice. */
export function accentFor(slug: string, index = 0): ProgramAccent {
  return BY_SLUG[slug] ?? PALETTE[index % PALETTE.length];
}
