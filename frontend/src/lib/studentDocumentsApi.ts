import { http, ApiError } from "@/lib/http";
import { API_BASE } from "@/lib/config";
import { openPdf } from "@/lib/printPdf";
import type { ApplicantDocument, DocumentoTipo } from "@/types/inscripcion";

/** "Papelería al día" de un alumno ya asignado — mismas categorías que la carta de compromiso, opcional. */
export function getStudentDocumentos(studentId: number): Promise<ApplicantDocument[]> {
  return http.get<ApplicantDocument[]>(`/api/students/${studentId}/documentos`);
}

export async function uploadStudentDocumento(studentId: number, tipo: DocumentoTipo, file: File): Promise<ApplicantDocument> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/api/students/${studentId}/documentos/${tipo}`, { method: "POST", body: form });
  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(text || `Error ${res.status}`, res.status);
  }
  return (await res.json()) as ApplicantDocument;
}

export function deleteStudentDocumento(studentId: number, tipo: DocumentoTipo): Promise<void> {
  return http.del(`/api/students/${studentId}/documentos/${tipo}`);
}

/** URL directa del PDF ya subido — para el botón "Ver". */
export function getStudentDocumentoUrl(studentId: number, tipo: DocumentoTipo): string {
  return `${API_BASE}/api/students/${studentId}/documentos/${tipo}/archivo`;
}

/** Solo los documentos extra, combinados en un PDF. */
export const openStudentDocumentosPdf = (studentId: number) => openPdf(`/api/students/${studentId}/documentos/pdf`);

/** La ficha de asignación + los documentos extra, combinados en un PDF. */
export const openFichaYDocumentosPdf = (assignmentId: number) => openPdf(`/api/course-assignments/${assignmentId}/ficha-y-documentos.pdf`);
