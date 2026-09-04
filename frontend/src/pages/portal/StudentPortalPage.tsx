import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "@/hooks/useSession";
import { CourseAssignmentForm } from "@/components/portal/CourseAssignmentForm";
import { FichaCard } from "@/components/portal/FichaCard";
import { PortalBand, PortalTopBar, StepRail, StepStrip, type RailStep } from "@/components/portal/PortalShell";
import { Chip } from "@/components/portal/kit";

/**
 * Portal del estudiante.
 *
 * La banda de entrada dice tres cosas y ninguna más: que esta ficha es tuya
 * (tu nombre en tipografía de titular), con qué carné entraste, y qué papel
 * vas a firmar (la ficha dibujada en perspectiva a la derecha).
 *
 * Lo que se quitó a propósito:
 *  · Las iniciales y el carné repetidos en la barra superior — el carné ya
 *    está dos centímetros más abajo, en su sitio.
 *  · La maestría y la sección bajo el nombre. La maestría del padrón NO es la
 *    que el estudiante está asignando (todavía no ha elegido ninguna), así
 *    que anunciarla ahí era decirle algo falso; y la sección cambia de un
 *    trimestre a otro, así que tampoco es un dato de identidad.
 */

const STEPS: RailStep[] = [
  { id: "paso-datos", label: "Sus datos" },
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

  return (
    <main className="min-h-screen bg-isel-paper pb-28">
      <PortalTopBar context="Portal del estudiante" onLogout={handleLogout} />

      <PortalBand
        eyebrow="Ficha de asignación de cursos"
        title={student.nombreCompleto}
        meta={
          <Chip tone="onDark" icon="card">
            Carné {student.carnet}
          </Chip>
        }
        aside={<FichaCard student={student} />}
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
