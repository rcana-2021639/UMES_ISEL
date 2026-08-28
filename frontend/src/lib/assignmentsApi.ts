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
 * Fetches a PDF from the backend (the real ficha template, filled in and converted server-side —
 * see FichaXlsxBuilder/FichaPdfBuilder) and loads it into an already-open tab. The browser's own PDF
 * viewer already has a print button/shortcut, so this is "click Imprimir → it's ready to print" with
 * no extra step (no Excel to open first, no file to download and then open).
 *
 * `targetWindow` must come from a `window.open("", "_blank")` called synchronously inside the click
 * handler, *before* this async function runs — calling `window.open` only after an `await` (e.g.
 * after the fetch resolves) loses the browser's "this came from a real click" signal and gets
 * silently popup-blocked. If the caller couldn't open a tab at all (blocked even then, or an older
 * browser), this falls back to a plain download instead of losing the PDF.
 */
async function openPdf(path: string, targetWindow: Window | null): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    targetWindow?.close();
    const text = await res.text();
    let message = text || `Error ${res.status}`;
    try {
      const problem = JSON.parse(text) as { detail?: string; title?: string };
      message = problem.detail || problem.title || message;
    } catch {
      // not JSON — keep the plain-text message
    }
    throw new ApiError(message, res.status);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  if (targetWindow && !targetWindow.closed) {
    targetWindow.location.href = url;
  } else {
    const a = document.createElement("a");
    a.href = url;
    a.download = "ficha.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  // The tab needs the blob URL to still be valid while it loads — release it a bit later instead
  // of immediately, rather than trying to guess exactly when that load finishes.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** One ficha as a ready-to-print PDF (the real template, filled in) — see the "{id}/ficha.pdf" endpoint. */
export function openFichaPdf(assignmentId: number, targetWindow: Window | null): Promise<void> {
  return openPdf(`/api/course-assignments/${assignmentId}/ficha.pdf`, targetWindow);
}

/** Every ficha in a date range (+ optional tipoPago filter), combined into one printable PDF. */
export function openFichaBatchPdf(from: Date, to: Date, tipoPago: TipoPago | undefined, targetWindow: Window | null): Promise<void> {
  const params = new URLSearchParams({ from: toDateParam(from), to: toDateParam(to) });
  if (tipoPago) params.set("tipoPago", tipoPago);
  return openPdf(`/api/course-assignments/ficha-batch.pdf?${params.toString()}`, targetWindow);
}
