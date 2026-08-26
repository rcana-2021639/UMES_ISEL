import { http } from "@/lib/http";
import type { Student } from "@/types/student";

export type Role = "student" | "admin";

export interface Session {
  role: Role;
  student?: Student;
}

const STORAGE_KEY = "isel.portal.session";

interface LoginResponse {
  role: Role;
  student: Student | null;
}

/** POST /api/auth/login — one field, no password. See AuthController for the rules. */
export async function login(value: string): Promise<Session> {
  const res = await http.post<LoginResponse>("/api/auth/login", { value });
  const session: Session = { role: res.role, student: res.student ?? undefined };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  return session;
}

export function logout(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function getSession(): Session | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}
