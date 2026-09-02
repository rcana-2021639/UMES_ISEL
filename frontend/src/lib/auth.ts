import { http } from "@/lib/http";
import type { Student } from "@/types/student";

export type Role = "student" | "admin" | "applicant";

export interface AdminUser {
  id: number;
  username: string;
  nombreCompleto: string;
  activo: boolean;
  debeCambiarPassword: boolean;
  ultimoAcceso: string | null;
}

export interface Session {
  role: Role;
  /**
   * El token firmado que emitió el servidor. Viaja en `Authorization: Bearer`
   * en cada petición (ver lib/http.ts) y caduca solo.
   *
   * Lo que hay guardado aquí ya NO decide nada: el servidor vuelve a comprobar
   * el token y el rol en cada llamada. Antes esto era al revés —el navegador
   * decía "soy admin" y se le creía—, así que bastaba escribir una línea en la
   * consola para entrar al panel.
   */
  token: string;
  expiresAt: string;
  student?: Student;
  admin?: AdminUser;
}

const STORAGE_KEY = "isel.portal.session";

interface LoginResponse {
  role: Role;
  token: string;
  expiresAt: string;
  student: Student | null;
  admin: AdminUser | null;
}

function guardar(res: LoginResponse): Session {
  const session: Session = {
    role: res.role,
    token: res.token,
    expiresAt: res.expiresAt,
    student: res.student ?? undefined,
    admin: res.admin ?? undefined,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  return session;
}

/** Acceso de alumno: carné + correo institucional. */
export async function loginEstudiante(carnet: string, correoInstitucional: string): Promise<Session> {
  return guardar(await http.post<LoginResponse>("/api/auth/login/estudiante", { carnet, correoInstitucional }));
}

/** Acceso al panel: cuenta y contraseña. */
export async function loginAdmin(username: string, password: string): Promise<Session> {
  return guardar(await http.post<LoginResponse>("/api/auth/login/admin", { username, password }));
}

/**
 * Guarda la sesión que emitieron los trámites públicos (inscripción y solicitud
 * de título), que tienen su propia puerta de entrada pero acaban necesitando el
 * mismo token para todo lo demás.
 */
export function guardarSesionExterna(role: Role, token: string, expiresAt: string, student?: Student): Session {
  return guardar({ role, token, expiresAt, student: student ?? null, admin: null });
}

export function logout(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function getSession(): Session | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as Session;
    // Una sesión caducada se tira aquí en vez de dejar que cada llamada choque
    // contra un 401: así el usuario ve la pantalla de acceso en vez de una
    // pantalla a medio cargar llena de errores.
    if (!session.token || (session.expiresAt && new Date(session.expiresAt).getTime() <= Date.now())) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return session;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

/** El token de la sesión actual, si la hay. Lo lee lib/http.ts en cada petición. */
export function getToken(): string | null {
  return getSession()?.token ?? null;
}

/** Cambia la contraseña de la cuenta de admin con la que se entró. */
export function cambiarPassword(passwordActual: string, passwordNueva: string): Promise<void> {
  return http.put<void>("/api/auth/password", { passwordActual, passwordNueva });
}

/** Marca la sesión guardada como "ya no tiene que cambiar la contraseña". */
export function marcarPasswordCambiada(): void {
  const session = getSession();
  if (!session?.admin) return;
  session.admin = { ...session.admin, debeCambiarPassword: false };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}
