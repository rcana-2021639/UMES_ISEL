import { http } from "@/lib/http";
import type { Student, StudentUpsertInput } from "@/types/student";

export function getStudents(filters?: { carnet?: string; carrera?: string }): Promise<Student[]> {
  const params = new URLSearchParams();
  if (filters?.carnet) params.set("carnet", filters.carnet);
  if (filters?.carrera) params.set("carrera", filters.carrera);
  const query = params.toString();
  return http.get<Student[]>(`/api/students${query ? `?${query}` : ""}`);
}

export function getCarreras(): Promise<string[]> {
  return http.get<string[]>("/api/students/carreras");
}

export function getStudentByCarnet(carnet: string): Promise<Student> {
  return http.get<Student>(`/api/students/by-carnet/${encodeURIComponent(carnet)}`);
}

export function createStudent(input: StudentUpsertInput): Promise<Student> {
  return http.post<Student>("/api/students", input);
}

export function updateStudent(id: number, input: StudentUpsertInput): Promise<Student> {
  return http.put<Student>(`/api/students/${id}`, input);
}

export function deleteStudent(id: number): Promise<void> {
  return http.del(`/api/students/${id}`);
}
