import { API_BASE } from "@/lib/config";
import { ApiError, authHeaders, http } from "@/lib/http";
import type { AdminUser } from "@/lib/auth";

export interface ResumenCarrera {
  carrera: string;
  alumnos: number;
  fichas: number;
  aspirantes: number;
  solicitudesTitulo: number;
}

export interface Resumen {
  totalAlumnos: number;
  totalFichas: number;
  fichasHoy: number;
  fichasEstaSemana: number;
  papeleriaPendiente: number;
  aspirantesEnProceso: number;
  aspirantesCompletos: number;
  solicitudesTituloPendientes: number;
  alertasSeguridad7Dias: number;
  ultimoRespaldo: string | null;
  porCarrera: ResumenCarrera[];
}

export interface SecurityEvent {
  id: number;
  ocurridoEn: string;
  tipo: string;
  actor: string;
  ip: string | null;
  detalle: string | null;
  esAlerta: boolean;
}

export interface ImportProblema {
  fila: number;
  carnet: string;
  motivo: string;
}

export interface ImportResult {
  simulacion: boolean;
  filasLeidas: number;
  nuevosAlumnos: number;
  actualizados: number;
  omitidos: number;
  problemas: ImportProblema[];
  columnasDetectadas: string[];
}

export interface BackupInfo {
  nombre: string;
  bytes: number;
  creadoEn: string;
}

export const getResumen = (): Promise<Resumen> => http.get("/api/admin/resumen");

export const getBitacora = (soloAlertas = false, limite = 200): Promise<SecurityEvent[]> =>
  http.get(`/api/admin/bitacora?soloAlertas=${soloAlertas}&limite=${limite}`);

export const getAdminUsers = (): Promise<AdminUser[]> => http.get("/api/admin/usuarios");

export const crearAdminUser = (body: { username: string; nombreCompleto: string; password?: string }) =>
  http.post<{ passwordTemporal: string }>("/api/admin/usuarios", body);

export const actualizarAdminUser = (id: number, body: { nombreCompleto: string; activo: boolean }) =>
  http.put<AdminUser>(`/api/admin/usuarios/${id}`, body);

export const resetAdminPassword = (id: number) =>
  http.post<{ passwordTemporal: string }>(`/api/admin/usuarios/${id}/reset-password`, {});

export const eliminarAdminUser = (id: number) => http.del(`/api/admin/usuarios/${id}`);

export const getRespaldos = (): Promise<BackupInfo[]> => http.get("/api/admin/respaldos");

export const crearRespaldo = (): Promise<BackupInfo> => http.post("/api/admin/respaldos", {});

/**
 * Descarga un archivo protegido y lo GUARDA (no lo abre).
 *
 * Es lo que hacen la exportación y la descarga de respaldos: van con la sesión
 * puesta, así que no pueden ser un simple `<a href>` — una etiqueta de enlace no
 * manda la cabecera de sesión y recibiría un 401.
 */
export async function descargarArchivo(path: string, nombrePorDefecto: string): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`, { headers: authHeaders() });
  if (!res.ok) {
    throw new ApiError((await res.text()) || `Error ${res.status}`, res.status);
  }

  // El servidor manda el nombre real en Content-Disposition (con la fecha
  // dentro); si el navegador no deja leer la cabecera, se usa el de reserva.
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
  const nombre = match ? decodeURIComponent(match[1]) : nombrePorDefecto;

  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/**
 * Sube el archivo de carga masiva. Con `dryRun` no escribe nada: devuelve lo que
 * PASARÍA, que es lo que se le enseña al admin antes de confirmar.
 */
export async function importarAlumnos(file: File, dryRun: boolean): Promise<ImportResult> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/api/admin/importar/alumnos?dryRun=${dryRun}`, {
    method: "POST",
    body: form,
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new ApiError((await res.text()) || `Error ${res.status}`, res.status);
  }
  return (await res.json()) as ImportResult;
}
