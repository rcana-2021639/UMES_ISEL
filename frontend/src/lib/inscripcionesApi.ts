import { http, postFile, openProtectedFile } from "@/lib/http";
import { guardarSesionExterna } from "@/lib/auth";
import { openPdf } from "@/lib/printPdf";
import { toDateParam } from "@/lib/assignmentsApi";
import type { Student } from "@/types/student";
import type {
  Applicant,
  ApplicantDocument,
  ApplicantListItem,
  AsignacionNuevoIngreso,
  AsignacionNuevoIngresoInput,
  CartaCompromiso,
  CartaCompromisoInput,
  DocumentoTipo,
  MigrarAspiranteInput,
  Preinscripcion,
  PreinscripcionInput,
} from "@/types/inscripcion";

export type EstadoInscripcion = "todas" | "completa" | "pendiente";

/**
 * POST /api/inscripciones/acceso — DPI o pasaporte; crea el expediente o reanuda
 * el que ya había.
 *
 * Además del expediente devuelve la LLAVE de la sesión, atada a ese expediente
 * concreto. Se guarda aquí mismo porque todo lo que viene después —guardar cada
 * sección, subir documentos, imprimir— ya la exige; antes esos endpoints estaban
 * abiertos y bastaba cambiar el número de la URL para leer el de otro.
 */
export async function accesoInscripcion(input: { dpi?: string; pasaporte?: string }): Promise<Applicant> {
  const res = await http.post<{ aspirante: Applicant; token: string; expiresAt: string }>(
    "/api/inscripciones/acceso",
    input,
  );
  guardarSesionExterna("applicant", res.token, res.expiresAt);
  return res.aspirante;
}

export function getApplicant(id: number): Promise<Applicant> {
  return http.get<Applicant>(`/api/inscripciones/${id}`);
}

/**
 * El expediente de inscripción de un alumno que YA está en el padrón.
 *
 * Al agregarlo a la base de datos, el aspirante desaparece del listado de
 * inscripciones —dejó de ser aspirante— pero sus tres fichas y sus documentos
 * siguen guardados. Esta consulta es la que permite volver a abrirlos desde la
 * fila del alumno.
 */
export function getExpedienteDeAlumno(studentId: number): Promise<Applicant> {
  return http.get<Applicant>(`/api/inscripciones/por-alumno/${studentId}`);
}

export function getApplicants(from?: Date, to?: Date, estado: EstadoInscripcion = "todas"): Promise<ApplicantListItem[]> {
  const params = new URLSearchParams();
  if (from) params.set("from", toDateParam(from));
  if (to) params.set("to", toDateParam(to));
  if (estado !== "todas") params.set("estado", estado);
  const query = params.toString();
  return http.get<ApplicantListItem[]>(`/api/inscripciones${query ? `?${query}` : ""}`);
}

export function savePreinscripcion(applicantId: number, input: PreinscripcionInput): Promise<Preinscripcion> {
  return http.put<Preinscripcion>(`/api/inscripciones/${applicantId}/preinscripcion`, input);
}

export function saveAsignacion(applicantId: number, input: AsignacionNuevoIngresoInput): Promise<AsignacionNuevoIngreso> {
  return http.put<AsignacionNuevoIngreso>(`/api/inscripciones/${applicantId}/asignacion`, input);
}

export function saveCompromiso(applicantId: number, input: CartaCompromisoInput): Promise<CartaCompromiso> {
  return http.put<CartaCompromiso>(`/api/inscripciones/${applicantId}/compromiso`, input);
}

export function deleteApplicant(id: number): Promise<void> {
  return http.del(`/api/inscripciones/${id}`);
}

export function migrarAspirante(id: number, input: MigrarAspiranteInput): Promise<Student> {
  return http.post<Student>(`/api/inscripciones/${id}/migrar`, input);
}

// ---- Documentos ---------------------------------------------------------------------------

export function getDocumentos(applicantId: number): Promise<ApplicantDocument[]> {
  return http.get<ApplicantDocument[]>(`/api/inscripciones/${applicantId}/documentos`);
}

/**
 * Abre el PDF ya subido — el botón "Ver". Se descarga con la sesión puesta y se
 * abre el blob: el archivo está protegido y un <a href> no manda la cabecera.
 */
export function abrirDocumento(applicantId: number, tipo: DocumentoTipo): Promise<void> {
  return openProtectedFile(`/api/inscripciones/${applicantId}/documentos/${tipo}/archivo`);
}

/** Sube un PDF para un tipo de documento — reemplaza cualquier subida anterior de ese mismo tipo. */
export function uploadDocumento(applicantId: number, tipo: DocumentoTipo, file: File): Promise<ApplicantDocument> {
  return postFile<ApplicantDocument>(`/api/inscripciones/${applicantId}/documentos/${tipo}`, file);
}

export function deleteDocumento(applicantId: number, tipo: DocumentoTipo): Promise<void> {
  return http.del(`/api/inscripciones/${applicantId}/documentos/${tipo}`);
}

// ---- Impresión ------------------------------------------------------------------------------

export const openPreinscripcionPdf = (id: number) => openPdf(`/api/inscripciones/${id}/preinscripcion.pdf`);
export const openAsignacionInscripcionPdf = (id: number) => openPdf(`/api/inscripciones/${id}/asignacion.pdf`);
export const openCompromisoPdf = (id: number) => openPdf(`/api/inscripciones/${id}/compromiso.pdf`);
/** Las fichas que el aspirante ya tenga guardadas, combinadas en un PDF (una hoja cada una) — botón "Imprimir". */
export const openInscripcionCompletaPdf = (id: number) => openPdf(`/api/inscripciones/${id}/completas.pdf`);

/** "Imprimir todas" del panel de admin — mismos filtros que getApplicants. */
export function openInscripcionesBatchPdf(from: Date, to: Date, estado: EstadoInscripcion): Promise<void> {
  const params = new URLSearchParams({ from: toDateParam(from), to: toDateParam(to) });
  if (estado !== "todas") params.set("estado", estado);
  return openPdf(`/api/inscripciones/ficha-batch.pdf?${params.toString()}`);
}
