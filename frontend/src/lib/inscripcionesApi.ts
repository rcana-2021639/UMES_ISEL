import { http, ApiError } from "@/lib/http";
import { API_BASE } from "@/lib/config";
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

/** POST /api/inscripciones/acceso — DPI o pasaporte, sin contraseña; crea el aspirante o reanuda si ya existía. */
export function accesoInscripcion(input: { dpi?: string; pasaporte?: string }): Promise<Applicant> {
  return http.post<Applicant>("/api/inscripciones/acceso", input);
}

export function getApplicant(id: number): Promise<Applicant> {
  return http.get<Applicant>(`/api/inscripciones/${id}`);
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

/** Sube un PDF para un tipo de documento — reemplaza cualquier subida anterior de ese mismo tipo. */
export async function uploadDocumento(applicantId: number, tipo: DocumentoTipo, file: File): Promise<ApplicantDocument> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/api/inscripciones/${applicantId}/documentos/${tipo}`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(text || `Error ${res.status}`, res.status);
  }
  return (await res.json()) as ApplicantDocument;
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
