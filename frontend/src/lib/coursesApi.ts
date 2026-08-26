import { http } from "@/lib/http";
import type { Course, CourseUpsertInput } from "@/types/course";

/** Omit carrera to get the full cross-program catalog (used by "Cursos adicionales"). */
export function getCourses(carrera?: string): Promise<Course[]> {
  const query = carrera ? `?carrera=${encodeURIComponent(carrera)}` : "";
  return http.get<Course[]>(`/api/courses${query}`);
}

export function createCourse(input: CourseUpsertInput): Promise<Course> {
  return http.post<Course>("/api/courses", input);
}

export function updateCourse(id: number, input: CourseUpsertInput): Promise<Course> {
  return http.put<Course>(`/api/courses/${id}`, input);
}

export function deleteCourse(id: number): Promise<void> {
  return http.del(`/api/courses/${id}`);
}
