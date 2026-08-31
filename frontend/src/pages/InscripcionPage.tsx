import { useEffect, useState } from "react";
import { AccesoInscripcionGate } from "@/components/inscripcion/AccesoInscripcionGate";
import { PreinscripcionForm } from "@/components/inscripcion/PreinscripcionForm";
import { AsignacionNuevoIngresoForm } from "@/components/inscripcion/AsignacionNuevoIngresoForm";
import { CartaCompromisoForm } from "@/components/inscripcion/CartaCompromisoForm";
import { DocumentosForm } from "@/components/inscripcion/DocumentosForm";
import { PortalBand, PortalTopBar, StepRail, StepStrip, type RailStep } from "@/components/portal/PortalShell";
import { Chip, Loading } from "@/components/portal/kit";
import { getApplicant } from "@/lib/inscripcionesApi";
import type { Applicant } from "@/types/inscripcion";

const STORAGE_KEY = "isel.inscripcion.applicantId";

const STEPS: RailStep[] = [
  { id: "paso-preinscripcion", label: "Preinscripción" },
  { id: "paso-asignacion", label: "Asignación de cursos" },
  { id: "paso-compromiso", label: "Carta de compromiso" },
  { id: "paso-documentos", label: "Documentos" },
];

/**
 * "Inscripción" — flujo público de nuevo ingreso, sin necesidad de entrar a ninguna maestría ni
 * portal existente (a diferencia de "Asignación", que sí requiere carné). Mismo lenguaje visual que
 * el portal de asignación (PortalBand/StepRail/PortalPanel), 4 secciones que se guardan por separado.
 */
export function InscripcionPage() {
  const [applicant, setApplicant] = useState<Applicant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Inscripción | ISEL";
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) {
      setLoading(false);
      return;
    }
    getApplicant(Number(stored))
      .then(setApplicant)
      .catch(() => sessionStorage.removeItem(STORAGE_KEY))
      .finally(() => setLoading(false));
  }, []);

  function handleEnter(a: Applicant) {
    sessionStorage.setItem(STORAGE_KEY, String(a.id));
    setApplicant(a);
  }

  function handleExit() {
    sessionStorage.removeItem(STORAGE_KEY);
    setApplicant(null);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-isel-paper">
        <Loading label="Cargando tu inscripción" />
      </main>
    );
  }

  if (!applicant) {
    return <AccesoInscripcionGate onEnter={handleEnter} />;
  }

  const nombre = applicant.nombreCompleto || "Aspirante nuevo";
  const identificador = applicant.dpi ? `DPI ${applicant.dpi}` : applicant.pasaporte ? `Pasaporte ${applicant.pasaporte}` : "";

  return (
    <main className="min-h-screen bg-isel-paper pb-28">
      <PortalTopBar context="Inscripción de nuevo ingreso" onLogout={handleExit} />

      <PortalBand
        eyebrow="Ficha de inscripción"
        title={nombre}
        meta={
          <>
            {identificador && (
              <Chip tone="onDark" icon="card">
                {identificador}
              </Chip>
            )}
            <Chip tone="onDark" icon={applicant.preinscripcion ? "check" : "file"}>Preinscripción</Chip>
            <Chip tone="onDark" icon={applicant.asignacion ? "check" : "file"}>Asignación</Chip>
            <Chip tone="onDark" icon={applicant.compromiso ? "check" : "file"}>Compromiso</Chip>
          </>
        }
      />

      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <StepStrip steps={STEPS} />

        <div className="grid grid-cols-1 gap-10 pt-10 lg:grid-cols-[13.5rem_minmax(0,1fr)] lg:gap-14">
          <StepRail steps={STEPS} />
          <div className="min-w-0 space-y-6">
            <PreinscripcionForm
              applicantId={applicant.id}
              initial={applicant.preinscripcion}
              onSaved={(p) => setApplicant((a) => (a ? { ...a, preinscripcion: p, nombreCompleto: a.asignacion ? a.nombreCompleto : p.nombreCompleto } : a))}
            />
            <AsignacionNuevoIngresoForm
              applicantId={applicant.id}
              initial={applicant.asignacion}
              onSaved={(asn) =>
                setApplicant((a) =>
                  a
                    ? {
                        ...a,
                        asignacion: asn,
                        nombreCompleto: `${asn.primerApellido} ${asn.segundoApellido ?? ""}`.trim() + ", " + `${asn.primerNombre} ${asn.segundoNombre ?? ""}`.trim(),
                      }
                    : a,
                )
              }
            />
            <CartaCompromisoForm
              applicantId={applicant.id}
              initial={applicant.compromiso}
              defaults={{
                carrera: applicant.asignacion?.carrera ?? applicant.preinscripcion?.carrera,
                nombreCompleto: applicant.preinscripcion?.nombreCompleto ?? applicant.nombreCompleto,
                dpi: applicant.dpi ?? applicant.preinscripcion?.dpi,
              }}
              onSaved={(c) => setApplicant((a) => (a ? { ...a, compromiso: c, esExtranjero: c.esExtranjero } : a))}
            />
            <DocumentosForm
              applicantId={applicant.id}
              esExtranjero={applicant.compromiso?.esExtranjero ?? applicant.esExtranjero}
              documentos={applicant.documentos}
              onChanged={(documentos) => setApplicant((a) => (a ? { ...a, documentos } : a))}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
