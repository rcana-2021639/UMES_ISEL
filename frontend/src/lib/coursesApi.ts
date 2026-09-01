import { http } from "@/lib/http";
import type { Course } from "@/types/course";

/** Omit both filters to get the full cross-program catalog (used by "Cursos adicionales"). */
export function getCourses(carrera?: string, trimestre?: number): Promise<Course[]> {
  const params = new URLSearchParams();
  if (carrera) params.set("carrera", carrera);
  if (trimestre) params.set("trimestre", String(trimestre));
  const query = params.toString();
  return http.get<Course[]>(`/api/courses${query ? `?${query}` : ""}`);
}

/**
 * Las maestrías que tienen pénsum cargado, en orden alfabético. Es la MISMA lista
 * que se elige en la ficha de asignación, y por eso también alimenta el selector
 * de "Carrera / maestría" de la preinscripción: escrito a mano, el mismo
 * expediente terminaba con dos grafías distintas de la misma maestría.
 * "Inglés" no es una maestría (son los cursos sueltos I–IV), así que no aparece.
 */
export async function getCarreras(): Promise<string[]> {
  const courses = await getCourses();
  return Array.from(new Set(courses.filter((c) => c.carrera !== "Inglés").map((c) => c.carrera))).sort((a, b) =>
    a.localeCompare(b),
  );
}

/** The trimestres a carrera's pensum actually has, in order (populates the Trimestre selector once a maestría is chosen). */
export function getTrimestres(carrera: string): Promise<number[]> {
  return http.get<number[]>(`/api/courses/trimestres?carrera=${encodeURIComponent(carrera)}`);
}
