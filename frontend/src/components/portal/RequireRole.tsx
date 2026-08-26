import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getSession, type Role } from "@/lib/auth";

/** Route guard: redirects to /portal/login if there's no session, or the wrong role. */
export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const session = getSession();
  const location = useLocation();

  if (!session || session.role !== role) {
    return <Navigate to="/portal/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}
