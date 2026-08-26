import { useEffect, useState } from "react";
import { getSession, logout as clearSession, type Session } from "@/lib/auth";

/** Reads the portal session from localStorage and keeps it in sync across tabs. */
export function useSession() {
  const [session, setSession] = useState<Session | null>(() => getSession());

  useEffect(() => {
    const onStorage = () => setSession(getSession());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function logout() {
    clearSession();
    setSession(null);
  }

  return { session, setSession, logout };
}
