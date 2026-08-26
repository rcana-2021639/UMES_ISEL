import { http } from "@/lib/http";
import type { AssignmentStatusRow, CourseAssignment, CourseAssignmentUpsertInput, TipoPago } from "@/types/courseAssignment";

/** yyyy-MM-dd in the browser's local time (never UTC — a date filter must match the user's "today"). */
export function toDateParam(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getAssignments(from: Date, to: Date, tipoPago?: TipoPago): Promise<CourseAssignment[]> {
  const params = new URLSearchParams({ from: toDateParam(from), to: toDateParam(to) });
  if (tipoPago) params.set("tipoPago", tipoPago);
  return http.get<CourseAssignment[]>(`/api/course-assignments?${params.toString()}`);
}

export function getAssignmentStatus(carrera: string, trimestre: number): Promise<AssignmentStatusRow[]> {
  const params = new URLSearchParams({ carrera, trimestre: String(trimestre) });
  return http.get<AssignmentStatusRow[]>(`/api/course-assignments/status?${params.toString()}`);
}

export async function getAssignmentByStudent(carnet: string, trimestre?: number): Promise<CourseAssignment | null> {
  const params = trimestre ? `?trimestre=${trimestre}` : "";
  try {
    return await http.get<CourseAssignment>(`/api/course-assignments/by-student/${encodeURIComponent(carnet)}${params}`);
  } catch {
    return null; // 404 = no ficha saved yet, not an error the UI needs to surface
  }
}

export function saveAssignment(input: CourseAssignmentUpsertInput): Promise<CourseAssignment> {
  return http.post<CourseAssignment>("/api/course-assignments", input);
}

export function deleteAssignment(id: number): Promise<void> {
  return http.del(`/api/course-assignments/${id}`);
}
