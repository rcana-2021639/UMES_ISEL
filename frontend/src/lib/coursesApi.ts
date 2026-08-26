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

/** The trimestres a carrera's pensum actually has, in order (populates the Trimestre selector once a maestría is chosen). */
export function getTrimestres(carrera: string): Promise<number[]> {
  return http.get<number[]>(`/api/courses/trimestres?carrera=${encodeURIComponent(carrera)}`);
}
