import { http } from "@/lib/http";
import { openPdf } from "@/lib/printPdf";
import type { CourseAssignment, CourseAssignmentUpsertInput, TipoPago } from "@/types/courseAssignment";

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

/** One ficha as a ready-to-print PDF (the real template, filled in) — see the "{id}/ficha.pdf" endpoint. */
export function openFichaPdf(assignmentId: number): Promise<void> {
  return openPdf(`/api/course-assignments/${assignmentId}/ficha.pdf`);
}

/** Every ficha in a date range (+ optional tipoPago filter), combined into one printable PDF. */
export function openFichaBatchPdf(from: Date, to: Date, tipoPago: TipoPago | undefined): Promise<void> {
  const params = new URLSearchParams({ from: toDateParam(from), to: toDateParam(to) });
  if (tipoPago) params.set("tipoPago", tipoPago);
  return openPdf(`/api/course-assignments/ficha-batch.pdf?${params.toString()}`);
}
