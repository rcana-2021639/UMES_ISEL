import { http } from "@/lib/http";
import { guardarSesionExterna } from "@/lib/auth";
import { openPdf } from "@/lib/printPdf";
import { toDateParam } from "@/lib/assignmentsApi";
import type {
  EstadoSolicitudTitulo,
  SolicitudTitulo,
  SolicitudTituloInput,
  SolicitudTituloListItem,
} from "@/types/solicitudTitulo";

/**
 * POST /api/solicitudes-titulo/acceso — carné MÁS correo institucional.
 *
 * Pedía solo el carné, y esta ficha lleva la fotografía y la firma del alumno
 * dentro: con carnés correlativos, eso era un catálogo de fotos y firmas a un
 * bucle de distancia. Ahora son los mismos dos datos que el portal de asignación,
 * y la respuesta trae la llave de sesión para poder seguir editando.
 */
export async function accesoSolicitudTitulo(carnet: string, correoInstitucional: string): Promise<SolicitudTitulo> {
  const res = await http.post<{ solicitud: SolicitudTitulo; token: string; expiresAt: string }>(
    "/api/solicitudes-titulo/acceso",
    { carnet, correoInstitucional },
  );
  guardarSesionExterna("student", res.token, res.expiresAt);
  return res.solicitud;
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
