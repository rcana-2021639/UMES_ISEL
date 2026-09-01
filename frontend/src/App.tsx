import { Route, Routes, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { HomePage } from "@/pages/HomePage";
import { ProgramDetailPage } from "@/pages/ProgramDetailPage";
import { InscripcionPage } from "@/pages/InscripcionPage";
import { SolicitudTituloPage } from "@/pages/SolicitudTituloPage";
import { LoginPage } from "@/pages/portal/LoginPage";
import { StudentPortalPage } from "@/pages/portal/StudentPortalPage";
import { AdminPortalPage } from "@/pages/portal/AdminPortalPage";
import { RequireRole } from "@/components/portal/RequireRole";

/**
 * Resets scroll position on route change; if the new URL carries a hash
 * (e.g. Link to="/#programas" from a detail page), scrolls that section
 * into view instead of jumping to the top.
 */
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const el = document.querySelector(hash);
      if (el) {
        // Wait a tick so the target page has mounted before measuring it.
        requestAnimationFrame(() => el.scrollIntoView({ behavior: "smooth", block: "start" }));
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/programas/:slug" element={<ProgramDetailPage />} />
        <Route path="/inscripcion" element={<InscripcionPage />} />
        <Route path="/solicitud-titulo" element={<SolicitudTituloPage />} />
        <Route path="/portal/login" element={<LoginPage />} />
        <Route
          path="/portal/estudiante"
          element={
            <RequireRole role="student">
              <StudentPortalPage />
            </RequireRole>
          }
        />
        <Route
          path="/portal/admin"
          element={
            <RequireRole role="admin">
              <AdminPortalPage />
            </RequireRole>
          }
        />
      </Routes>
    </>
  );
}
