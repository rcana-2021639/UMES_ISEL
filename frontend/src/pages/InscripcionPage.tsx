import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AccesoInscripcionGate } from "@/components/inscripcion/AccesoInscripcionGate";
import { PreinscripcionForm } from "@/components/inscripcion/PreinscripcionForm";
import { AsignacionNuevoIngresoForm } from "@/components/inscripcion/AsignacionNuevoIngresoForm";
import { CartaCompromisoForm } from "@/components/inscripcion/CartaCompromisoForm";
import { DocumentosForm } from "@/components/inscripcion/DocumentosForm";
import { PortalBand, PortalPanel, PortalTopBar, StepRail, StepStrip, type RailStep } from "@/components/portal/PortalShell";
import { Icon } from "@/components/portal/Icon";
import { Alert, Chip, Loading, PortalButton } from "@/components/portal/kit";
import { useConfirm } from "@/hooks/useConfirm";
import { getApplicant } from "@/lib/inscripcionesApi";
import { joinNombreCompleto, nombreNatural } from "@/lib/nombres";
import {
  DOCUMENTO_TIPOS_EXTRANJERO,
  DOCUMENTO_TIPOS_NACIONAL,
  type Applicant,
  type DocumentoTipo,
} from "@/types/inscripcion";

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
  const navigate = useNavigate();

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

  /** "Guardar todo y salir": cierra el expediente y devuelve al sitio público. */
  function handleFinish() {
    sessionStorage.removeItem(STORAGE_KEY);
    setApplicant(null);
    navigate("/");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-isel-paper">
        <Loading label="Cargando su inscripción" />
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
              nombreSugerido={applicant.preinscripcion?.nombreCompleto ?? applicant.nombreCompleto}
              onSaved={(asn) =>
                setApplicant((a) => (a ? { ...a, asignacion: asn, nombreCompleto: joinNombreCompleto(asn) } : a))
              }
            />
            <CartaCompromisoForm
              applicantId={applicant.id}
              initial={applicant.compromiso}
              defaults={{
                carrera: applicant.asignacion?.carrera ?? applicant.preinscripcion?.carrera,
                // La carta se lee en voz alta ("Yo, Fulano de Tal…"), así que aquí el nombre va
                // como se dice, no como se archiva ("Apellidos, Nombres").
                nombreCompleto:
                  applicant.preinscripcion?.nombreCompleto ||
                  (applicant.asignacion ? nombreNatural(applicant.asignacion) : applicant.nombreCompleto),
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
            <CierrePanel applicant={applicant} onFinish={handleFinish} />
          </div>
        </div>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------------- */

/**
 * El cierre del expediente.
 *
 * Cada sección se guarda por su cuenta y los PDF se suben en cuanto se eligen, así que técnicamente
 * al llegar aquí ya no queda nada pendiente de enviar. El problema era que eso no se veía por
 * ninguna parte: después del último documento la página simplemente se acababa y no había forma de
 * saber si lo mandado quedó guardado ni por dónde salir. Este panel responde las dos cosas —el
 * recuento de lo que hay guardado, y una sola salida— y avisa antes de cerrar si algo quedó a medias.
 */
function CierrePanel({ applicant, onFinish }: { applicant: Applicant; onFinish: () => void }) {
  const { confirm, dialog } = useConfirm();

  const requeridos: DocumentoTipo[] =
    (applicant.compromiso?.esExtranjero ?? applicant.esExtranjero)
      ? [...DOCUMENTO_TIPOS_NACIONAL, ...DOCUMENTO_TIPOS_EXTRANJERO]
      : [...DOCUMENTO_TIPOS_NACIONAL];
  const subidos = applicant.documentos.filter((d) => requeridos.includes(d.tipo)).length;

  const partes = [
    { label: "Preinscripción", ok: !!applicant.preinscripcion },
    { label: "Asignación de cursos", ok: !!applicant.asignacion },
    { label: "Carta de compromiso", ok: !!applicant.compromiso },
    { label: `Documentos (${subidos} de ${requeridos.length})`, ok: subidos >= requeridos.length, opcional: true },
  ];
  const faltan = partes.filter((p) => !p.ok && !p.opcional).map((p) => p.label);

  async function handleClick() {
    if (faltan.length > 0) {
      const ok = await confirm({
        title: "Aún tiene fichas pendientes",
        message: `No ha guardado: ${faltan.join(", ")}. La información ya guardada se conserva y puede regresar con su mismo DPI para completarla. ¿Desea salir de todos modos?`,
        confirmLabel: "Sí, salir",
      });
      if (!ok) return;
    }
    onFinish();
  }

  return (
    <>
      <PortalPanel
        step="05"
        accent="#14493C"
        title="Terminar mi inscripción"
        description="La información guardada ya quedó registrada. Revise el resumen y podrá salir cuando lo considere; puede regresar con su mismo DPI."
      >
        <ul className="divide-y divide-isel-line overflow-hidden rounded-xl border border-isel-line">
          {partes.map((p) => (
            <li key={p.label} className="flex items-center gap-3 px-4 py-3 text-[13.5px]">
              <span
                aria-hidden
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                  p.ok ? "bg-isel-emerald/10 text-isel-emerald" : "bg-isel-paper text-isel-ink/35"
                }`}
              >
                <Icon name={p.ok ? "check" : "file"} size={14} />
              </span>
              <span className="flex-1 text-isel-ink">{p.label}</span>
              {p.ok ? (
                <Chip tone="emerald" icon="check">Guardado</Chip>
              ) : p.opcional ? (
                <Chip tone="neutral" icon="file">Opcional</Chip>
              ) : (
                <Chip tone="gold" icon="alert">Pendiente</Chip>
              )}
            </li>
          ))}
        </ul>

        {faltan.length > 0 && (
          <div className="mt-5">
            <Alert kind="info">
              Puedes salir así: lo guardado no se pierde y con tu mismo DPI continuará donde lo dejó.
            </Alert>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-isel-line pt-5">
          <p className="mr-auto flex items-center gap-2 text-[12.5px] text-isel-ink/45">
            <Icon name="lock" size={13} />
            No hay nada más que enviar: cada sección se guardó al pulsar su propio botón.
          </p>
          <PortalButton tone="accent" icon="check" onClick={handleClick} className="px-6 py-3 text-[14px]">
            Guardar todo y salir
          </PortalButton>
        </div>
      </PortalPanel>
      {dialog}
    </>
  );
}
