import { http, postFile, openProtectedFile } from "@/lib/http";
import { openPdf } from "@/lib/printPdf";
import type { ApplicantDocument, DocumentoTipo } from "@/types/inscripcion";

/** "Papelería al día" de un alumno ya asignado — mismas categorías que la carta de compromiso, opcional. */
export function getStudentDocumentos(studentId: number): Promise<ApplicantDocument[]> {
  return http.get<ApplicantDocument[]>(`/api/students/${studentId}/documentos`);
}

export function uploadStudentDocumento(studentId: number, tipo: DocumentoTipo, file: File): Promise<ApplicantDocument> {
  return postFile<ApplicantDocument>(`/api/students/${studentId}/documentos/${tipo}`, file);
}

export function deleteStudentDocumento(studentId: number, tipo: DocumentoTipo): Promise<void> {
  return http.del(`/api/students/${studentId}/documentos/${tipo}`);
}

/**
 * Abre el PDF ya subido — el botón "Ver".
 *
 * Antes devolvía la URL para un <a href>. Ya no sirve: el archivo está
 * protegido y una etiqueta de enlace no manda la cabecera de sesión. Ahora se
 * descarga con la sesión puesta y se abre el blob.
 */
export function abrirStudentDocumento(studentId: number, tipo: DocumentoTipo): Promise<void> {
  return openProtectedFile(`/api/students/${studentId}/documentos/${tipo}/archivo`);
}

/** Solo los documentos extra, combinados en un PDF. */
export const openStudentDocumentosPdf = (studentId: number) => openPdf(`/api/students/${studentId}/documentos/pdf`);

/** La ficha de asignación + los documentos extra, combinados en un PDF. */
export const openFichaYDocumentosPdf = (assignmentId: number) => openPdf(`/api/course-assignments/${assignmentId}/ficha-y-documentos.pdf`);
