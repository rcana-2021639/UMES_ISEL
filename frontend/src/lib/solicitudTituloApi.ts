import { http } from "@/lib/http";
import { openPdf } from "@/lib/printPdf";
import { toDateParam } from "@/lib/assignmentsApi";
import type {
  EstadoSolicitudTitulo,
  SolicitudTitulo,
  SolicitudTituloInput,
  SolicitudTituloListItem,
} from "@/types/solicitudTitulo";

/** POST /api/solicitudes-titulo/acceso — solo el carné; crea la solicitud sembrada o reanuda la que ya había. */
export function accesoSolicitudTitulo(carnet: string): Promise<SolicitudTitulo> {
  return http.post<SolicitudTitulo>("/api/solicitudes-titulo/acceso", { carnet });
}

export function getSolicitudTitulo(id: number): Promise<SolicitudTitulo> {
  return http.get<SolicitudTitulo>(`/api/solicitudes-titulo/${id}`);
}

export function saveSolicitudTitulo(id: number, input: SolicitudTituloInput): Promise<SolicitudTitulo> {
  return http.put<SolicitudTitulo>(`/api/solicitudes-titulo/${id}`, input);
}

export function getSolicitudesTitulo(
  from?: Date,
  to?: Date,
  estado: EstadoSolicitudTitulo = "todas",
): Promise<SolicitudTituloListItem[]> {
  const params = new URLSearchParams();
  if (from) params.set("from", toDateParam(from));
  if (to) params.set("to", toDateParam(to));
  if (estado !== "todas") params.set("estado", estado);
  const query = params.toString();
  return http.get<SolicitudTituloListItem[]>(`/api/solicitudes-titulo${query ? `?${query}` : ""}`);
}

export function marcarSolicitudEntregada(id: number, entregada: boolean): Promise<SolicitudTitulo> {
  return http.patch<SolicitudTitulo>(`/api/solicitudes-titulo/${id}/entregada`, { entregada });
}

export function deleteSolicitudTitulo(id: number): Promise<void> {
  return http.del(`/api/solicitudes-titulo/${id}`);
}

export const openSolicitudTituloPdf = (id: number) => openPdf(`/api/solicitudes-titulo/${id}/solicitud.pdf`);

/** "Imprimir todas" del panel de admin — mismos filtros que getSolicitudesTitulo. */
export function openSolicitudesTituloBatchPdf(from: Date, to: Date, estado: EstadoSolicitudTitulo): Promise<void> {
  const params = new URLSearchParams({ from: toDateParam(from), to: toDateParam(to) });
  if (estado !== "todas") params.set("estado", estado);
  return openPdf(`/api/solicitudes-titulo/batch.pdf?${params.toString()}`);
}
