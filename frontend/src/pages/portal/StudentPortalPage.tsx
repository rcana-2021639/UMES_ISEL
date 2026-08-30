import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "@/hooks/useSession";
import { CourseAssignmentForm } from "@/components/portal/CourseAssignmentForm";
import { PortalBand, PortalTopBar, StepRail, StepStrip, type RailStep } from "@/components/portal/PortalShell";
import { Chip } from "@/components/portal/kit";

/**
 * Portal del estudiante.
 *
 * Antes: una cabecera blanca de 20px, un botón de salir y el formulario a
 * pelo. El estudiante entraba sin saber si era su ficha, cuántos pasos tenía
 * ni por dónde iba.
 *
 * Ahora la pantalla se abre con su nombre en tipografía de titular sobre la
 * banda verde —confirma de un vistazo que la ficha es suya— y el formulario
 * queda flanqueado por el riel de pasos, que sigue el scroll. Ese riel es el
 * único movimiento con protagonismo de la vista: aquí el resto tiene que
 * estarse quieto, porque la gente viene a rellenar campos.
 */

const STEPS: RailStep[] = [
  { id: "paso-datos", label: "Tus datos" },
  { id: "paso-cursos", label: "Cursos por asignarse" },
  { id: "paso-adicionales", label: "Cursos adicionales" },
  { id: "paso-firma", label: "Observaciones y firma" },
];

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

  const iniciales = `${student.primerNombre?.[0] ?? ""}${student.primerApellido?.[0] ?? ""}`.toUpperCase();

  return (
    <main className="min-h-screen bg-isel-paper pb-28">
      <PortalTopBar
        context="Portal del estudiante"
        onLogout={handleLogout}
        identity={
          <span className="hidden items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.06] py-1 pl-1 pr-3.5 md:inline-flex">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-isel-gold font-display text-[11px] font-bold text-isel-deep">
              {iniciales}
            </span>
            <span className="tabular text-[12px] font-semibold text-white/70">{student.carnet}</span>
          </span>
        }
      />

      <PortalBand
        eyebrow="Ficha de asignación de cursos"
        title={student.nombreCompleto}
        meta={
          <>
            <Chip tone="onDark" icon="card">
              Carné {student.carnet}
            </Chip>
            <Chip tone="onDark" icon="layers">
              {student.carrera}
            </Chip>
            {student.seccion && (
              <Chip tone="onDark" icon="users">
                Sección {student.seccion}
              </Chip>
            )}
          </>
        }
      />

      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <StepStrip steps={STEPS} />

        <div className="grid grid-cols-1 gap-10 pt-10 lg:grid-cols-[13.5rem_minmax(0,1fr)] lg:gap-14">
          <StepRail steps={STEPS} />
          <div className="min-w-0">
            <CourseAssignmentForm student={student} />
          </div>
        </div>
      </div>
    </main>
  );
}
