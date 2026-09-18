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

/**
 * Las fichas de un rango de fechas. Con `from`/`to` en null trae el histórico completo, que es lo
 * que necesita el rango "Todo" del panel: pasado un mes, la ficha de alguien se busca por su nombre
 * y no adivinando en el calendario qué día la llenó.
 */
export function getAssignments(from: Date | null, to: Date | null, tipoPago?: TipoPago): Promise<CourseAssignment[]> {
  const params = new URLSearchParams();
  if (from) params.set("from", toDateParam(from));
  if (to) params.set("to", toDateParam(to));
  if (tipoPago) params.set("tipoPago", tipoPago);
  const query = params.toString();
  return http.get<CourseAssignment[]>(`/api/course-assignments${query ? `?${query}` : ""}`);
}

/** Marca o desmarca una ficha como impresa. La marca normal la pone el servidor al generar el PDF. */
export function marcarFichaImpresa(id: number, impresa: boolean): Promise<CourseAssignment> {
  return http.put<CourseAssignment>(`/api/course-assignments/${id}/impresa`, { impresa });
}

export function marcarCorreoEnviado(id: number, enviado: boolean): Promise<CourseAssignment> {
  return http.put<CourseAssignment>(`/api/course-assignments/${id}/correo-enviado`, { enviado });
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
export function openFichaBatchPdf(
  from: Date | null,
  to: Date | null,
  tipoPago: TipoPago | undefined,
  soloPendientes = false,
): Promise<void> {
  const params = new URLSearchParams();
  if (from) params.set("from", toDateParam(from));
  if (to) params.set("to", toDateParam(to));
  if (tipoPago) params.set("tipoPago", tipoPago);
  if (soloPendientes) params.set("soloPendientes", "true");
  const query = params.toString();
  return openPdf(`/api/course-assignments/ficha-batch.pdf${query ? `?${query}` : ""}`);
}

/** La carta de entrega a Secretaría General con las fichas YA impresas del rango — ver CartaEntregaPdfBuilder. */
export function openCartaEntregaPdf(
  from: Date | null,
  to: Date | null,
  tipoPago: TipoPago | undefined,
  periodo: string,
): Promise<void> {
  const params = new URLSearchParams();
  if (from) params.set("from", toDateParam(from));
  if (to) params.set("to", toDateParam(to));
  if (tipoPago) params.set("tipoPago", tipoPago);
  if (periodo.trim()) params.set("periodo", periodo.trim());
  return openPdf(`/api/course-assignments/carta-entrega.pdf?${params.toString()}`);
}
