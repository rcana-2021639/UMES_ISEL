import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "@/hooks/useSession";
import { getAssignmentByStudent } from "@/lib/assignmentsApi";
import type { CourseAssignment } from "@/types/courseAssignment";
import { CourseAssignmentForm } from "@/components/portal/CourseAssignmentForm";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";

export function StudentPortalPage() {
  const { session, logout } = useSession();
  const navigate = useNavigate();
  const student = session?.student;

  const [assignment, setAssignment] = useState<CourseAssignment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!student) return;
    document.title = `Asignación de cursos | ${student.nombreCompleto}`;
    let active = true;
    getAssignmentByStudent(student.carnet, student.trimestre ?? undefined).then((ca) => {
      if (active) {
        setAssignment(ca);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
    // Only the carné identifies a distinct student — re-running this for every new
    // (identical-looking) session object would loop forever.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student?.carnet]);

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
        {loading ? (
          <RevealOnScroll className="rounded-2xl bg-white p-10 text-center text-isel-ink/50 shadow-card">
            Cargando tu ficha…
          </RevealOnScroll>
        ) : (
          <CourseAssignmentForm
            student={student}
            initialAssignment={assignment}
            trimestre={student.trimestre ?? 1}
            onSaved={setAssignment}
          />
        )}
      </div>
    </main>
  );
}
