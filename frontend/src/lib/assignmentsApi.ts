import { http, ApiError } from "@/lib/http";
import { API_BASE } from "@/lib/config";
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

/**
 * Downloads a file from the backend and triggers a browser save — used for the ficha .xlsx/.zip
 * endpoints, which return the *actual* official template filled in (see FichaXlsxBuilder on the
 * backend) rather than an HTML approximation, so "Imprimir" opens/prints from the real Excel file.
 */
async function downloadFile(path: string, fallbackFilename: string): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(text || `Error ${res.status}`, res.status);
  }
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition");
  const match = disposition?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  const filename = match ? decodeURIComponent(match[1]) : fallbackFilename;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** One ficha, filled into a copy of the real template — see the "{id}/ficha.xlsx" endpoint. */
export function downloadFichaXlsx(assignmentId: number): Promise<void> {
  return downloadFile(`/api/course-assignments/${assignmentId}/ficha.xlsx`, `Ficha-${assignmentId}.xlsx`);
}

/** Every ficha in a date range (+ optional tipoPago filter), one real .xlsx per student inside a .zip. */
export function downloadFichaBatchZip(from: Date, to: Date, tipoPago?: TipoPago): Promise<void> {
  const params = new URLSearchParams({ from: toDateParam(from), to: toDateParam(to) });
  if (tipoPago) params.set("tipoPago", tipoPago);
  return downloadFile(`/api/course-assignments/ficha-batch.zip?${params.toString()}`, "Fichas.zip");
}
