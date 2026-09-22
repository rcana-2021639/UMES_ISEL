import { http } from "@/lib/http";

/**
 * Una cohorte: el grupo que INICIA sus estudios en un mismo período ("Cohorte 2026",
 * "Cohorte 2027-2"). Es independiente de la carrera — la maestría es una sola; lo que
 * cambia con los años es la cohorte con la que se entra, y de ella depende qué versión
 * del pénsum le toca a cada quien.
 */
export interface Cohorte {
  id: number;
  anio: number;
  /** Número de ingreso dentro del año (1 = primer ingreso). */
  periodo: number;
  nombre: string;
  fechaInicio?: string | null; // yyyy-MM-dd
  /** Si aparece en el formulario de inscripción de nuevo ingreso. */
  abiertaInscripcion: boolean;
}

/** Con su uso: decide si se puede borrar o solo cerrar. */
export interface CohorteAdmin extends Cohorte {
  alumnos: number;
  aspirantes: number;
  versionesPensum: number;
}

export interface CohortePayload {
  anio: number;
  periodo: number;
  nombre?: string | null;
  fechaInicio?: string | null;
  abiertaInscripcion: boolean;
}

/** En orden cronológico. `soloAbiertas` = las que reciben inscripciones (formulario público). */
export const getCohortes = (soloAbiertas = false): Promise<Cohorte[]> =>
  http.get(`/api/cohortes${soloAbiertas ? "?abiertas=true" : ""}`);

export const getCohortesAdmin = (): Promise<CohorteAdmin[]> => http.get("/api/cohortes/admin");

export const crearCohorte = (body: CohortePayload): Promise<CohorteAdmin[]> => http.post("/api/cohortes", body);

export const actualizarCohorte = (id: number, body: CohortePayload): Promise<CohorteAdmin[]> =>
  http.put(`/api/cohortes/${id}`, body);

export const eliminarCohorte = (id: number): Promise<CohorteAdmin[]> => http.del<CohorteAdmin[]>(`/api/cohortes/${id}`);

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** "12 de enero de 2027" a partir de "2027-01-12". */
export function fechaLarga(iso?: string | null): string | null {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} de ${MESES[m - 1]} de ${y}`;
}
