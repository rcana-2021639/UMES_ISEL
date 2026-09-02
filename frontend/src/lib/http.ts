import { API_BASE } from "@/lib/config";
import { getToken, logout } from "@/lib/auth";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** Pulls a human-readable message out of either a plain-text or ASP.NET ProblemDetails error body. */
async function readError(res: Response): Promise<string> {
  const text = await res.text();
  if (!text) return `Error ${res.status}`;
  try {
    const json = JSON.parse(text);
    if (json.errors) {
      const first = Object.values(json.errors).flat()[0];
      if (typeof first === "string") return first;
    }
    if (typeof json.title === "string") return json.title;
  } catch {
    // not JSON — plain text message from the controller (e.g. NotFound("..."))
  }
  return text;
}

/**
 * Cabeceras comunes. Si hay sesión, viaja su token firmado; el servidor lo
 * verifica y vuelve a mirar el rol en la base en CADA petición, así que esto es
 * lo único que da acceso — el guardia de rutas del navegador solo decide qué se
 * dibuja.
 *
 * La importación cruzada con auth.ts es un ciclo a propósito y seguro: los dos
 * módulos terminan de evaluarse antes de que exista la primera petición, y aquí
 * el token se lee en cada llamada, no al importar.
 */
export function authHeaders(extra?: HeadersInit): Record<string, string> {
  const headers: Record<string, string> = { ...((extra as Record<string, string>) ?? {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/**
 * Qué hacer con un 401.
 *
 * Un 401 significa que el token caducó o dejó de ser válido (por ejemplo,
 * porque a esa cuenta de admin la desactivaron mientras tenía la pestaña
 * abierta). Se borra la sesión y se manda a la pantalla de acceso en vez de
 * dejar al usuario haciendo clics contra una pantalla que ya no responde.
 *
 * El 403 NO se toca: ahí la sesión es válida, simplemente eso no es suyo. Cerrar
 * la sesión en ese caso sería castigar al usuario por un enlace equivocado.
 */
function manejar401() {
  logout();
  const enPortal = window.location.pathname.startsWith("/portal");
  const destino = enPortal ? "/portal/login" : window.location.pathname;
  if (window.location.pathname !== destino) {
    window.location.assign(destino);
  } else {
    window.location.reload();
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: authHeaders({ "Content-Type": "application/json", ...(init?.headers ?? {}) }),
  });

  if (!res.ok) {
    const message = await readError(res);
    if (res.status === 401) manejar401();
    throw new ApiError(message, res.status);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const http = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) => request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  // Genérico con default `void`: los DELETE que solo responden 204 se siguen
  // usando igual, y los que devuelven el estado recalculado (el pénsum) pueden
  // pedir su tipo sin castear.
  del: <T = void>(path: string) => request<T>(path, { method: "DELETE" }),
};

/**
 * Sube un archivo con la sesión puesta.
 *
 * Va aparte de `request` porque con FormData NO se debe fijar Content-Type a
 * mano: el navegador tiene que generarlo él para incluir el `boundary` del
 * multipart. Ponerlo rompe la subida de una forma que solo se ve en el servidor.
 */
export async function postFile<T>(path: string, file: File, field = "file"): Promise<T> {
  const form = new FormData();
  form.append(field, file);

  const res = await fetch(`${API_BASE}${path}`, { method: "POST", body: form, headers: authHeaders() });
  if (!res.ok) {
    const message = await readError(res);
    if (res.status === 401) manejar401();
    throw new ApiError(message, res.status);
  }
  return (await res.json()) as T;
}

/**
 * Descarga un archivo protegido y lo abre en una pestaña nueva.
 *
 * Antes esto era un `<a href>` a la URL del archivo. Ya no puede serlo: una
 * etiqueta de enlace no manda la cabecera de sesión, así que ahora daría 401.
 * Se descarga con fetch, se convierte en un blob local y se abre eso.
 */
export async function openProtectedFile(path: string): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`, { headers: authHeaders() });
  if (!res.ok) {
    const message = await readError(res);
    if (res.status === 401) manejar401();
    throw new ApiError(message, res.status);
  }

  const url = URL.createObjectURL(await res.blob());
  window.open(url, "_blank", "noopener,noreferrer");
  // Se libera con retraso: revocarla de inmediato cancelaría la pestaña que
  // acaba de abrirse antes de que llegue a leerla.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
