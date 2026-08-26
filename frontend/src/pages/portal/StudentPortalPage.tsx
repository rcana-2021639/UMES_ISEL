import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "@/hooks/useSession";
import { CourseAssignmentForm } from "@/components/portal/CourseAssignmentForm";

export function StudentPortalPage() {
  const { session, logout } = useSession();
  const navigate = useNavigate();
  const student = session?.student;

  useEffect(() => {
    if (!student) return;
    document.title = `Asignación de cursos | ${student.nombreCompleto}`;
  }, [student]);

  function handleLogout() {
    logout();
    navigate("/portal/login");
  }

  if (!student) return null; // RequireRole already redirects; guards against a stale render

  return (
    <main className="min-h-screen bg-isel-paper pb-24">
      <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-isel-line bg-white/90 px-6 py-4 backdrop-blur">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-isel-gold2">Universidad Mesoamericana · ISEL</p>
          <h1 className="font-display text-xl font-bold text-isel-navy sm:text-2xl">Asignación de cursos</h1>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-2 rounded-full border-2 border-isel-navy px-4 py-2 text-sm font-semibold text-isel-navy transition-colors duration-200 hover:bg-isel-navy hover:text-white"
        >
          ↩ Cerrar sesión
        </button>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-8">
        <CourseAssignmentForm student={student} />
      </div>
    </main>
  );
}
