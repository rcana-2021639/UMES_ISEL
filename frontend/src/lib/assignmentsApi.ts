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
 * see FichaXlsxBuilder/FichaPdfBuilder) and sends it straight to the browser's native print dialog —
 * entirely inside the current tab, no external/new tab or window involved.
 *
 * How: load the PDF into a hidden `<iframe>` and call `.print()` on the iframe's own window once it
 * finishes loading. Chrome's (and Edge's) built-in PDF viewer honors that exactly like it would for a
 * full-page PDF, so the OS print dialog (e.g. "Microsoft Print to PDF") opens automatically — the
 * admin never sees a blank loading tab, just their same page and then the print dialog. This avoids
 * the popup-blocker dance a `window.open("", "_blank")` approach needs entirely: appending a hidden
 * iframe is never blocked, so there's no "must be a synchronous click, before any await" constraint.
 */
async function openPdf(path: string): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
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

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.setAttribute("aria-hidden", "true");
  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      // Some browser/PDF-viewer combos don't support triggering print this way — the PDF is still
      // loaded, just without the automatic step; rare in practice on Chromium-based browsers.
    }
  };
  document.body.appendChild(iframe);
  iframe.src = url;

  // Keep the blob URL and iframe alive long enough for the admin to actually use the print dialog
  // (pick a printer, hit Imprimir) before cleaning up — closing either too soon can cancel the job.
  setTimeout(() => {
    URL.revokeObjectURL(url);
    iframe.remove();
  }, 5 * 60_000);
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
