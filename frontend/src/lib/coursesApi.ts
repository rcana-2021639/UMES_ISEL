import { http } from "@/lib/http";
import { getCarreraOpciones } from "@/lib/pensumApi";
import type { Course } from "@/types/course";

/**
 * Omit carrera and trimestre to get the full cross-program catalog (used by "Cursos adicionales").
 * `cohorteId` = la cohorte de quien llena la ficha: cada carrera puede tener varias versiones
 * del pénsum y el servidor devuelve la que le toca a esa cohorte (sin ella, la vigente hoy).
 */
export function getCourses(carrera?: string, trimestre?: number, cohorteId?: number | null): Promise<Course[]> {
  const params = new URLSearchParams();
  if (carrera) params.set("carrera", carrera);
  if (trimestre) params.set("trimestre", String(trimestre));
  if (cohorteId) params.set("cohorteId", String(cohorteId));
  const query = params.toString();
  return http.get<Course[]>(`/api/courses${query ? `?${query}` : ""}`);
}

/**
 * Las carreras en las que un alumno puede estar inscrito, en el orden que fijó
 * el admin en la pestaña "Pénsum". Es la MISMA lista que se elige en la ficha de
 * asignación, y por eso también alimenta el selector de "Carrera / maestría" de
 * la preinscripción: escrito a mano, el mismo expediente terminaba con dos
 * grafías distintas de la misma maestría.
 *
 * Sale del registro de carreras, no de deducirla de los cursos: así una carrera
 * archivada desaparece de los formularios sola, y "Inglés" queda fuera por su
 * propia marca (`esPrograma: false`) en vez de por un nombre escrito a mano aquí
 * — que era lo que se rompía en cuanto alguien lo renombraba.
 */
export async function getCarreras(): Promise<string[]> {
  const carreras = await getCarreraOpciones(true);
  return carreras.map((c) => c.nombre);
}

/** The trimestres a carrera's pensum actually has, in order (populates the Trimestre selector once a maestría is chosen). */
export function getTrimestres(carrera: string, cohorteId?: number | null): Promise<number[]> {
  const cohorte = cohorteId ? `&cohorteId=${cohorteId}` : "";
  return http.get<number[]>(`/api/courses/trimestres?carrera=${encodeURIComponent(carrera)}${cohorte}`);
}
