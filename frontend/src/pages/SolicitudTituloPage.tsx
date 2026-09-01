import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AccesoTituloGate } from "@/components/titulo/AccesoTituloGate";
import { SolicitudTituloForm } from "@/components/titulo/SolicitudTituloForm";
import { PortalBand, PortalPanel, PortalTopBar, StepRail, StepStrip, type RailStep } from "@/components/portal/PortalShell";
import { Icon } from "@/components/portal/Icon";
import { Alert, Chip, Loading, PortalButton } from "@/components/portal/kit";
import { useConfirm } from "@/hooks/useConfirm";
import { getSolicitudTitulo, openSolicitudTituloPdf } from "@/lib/solicitudTituloApi";
import { ApiError } from "@/lib/http";
import type { SolicitudTitulo } from "@/types/solicitudTitulo";

const STORAGE_KEY = "isel.titulo.solicitudId";

const STEPS: RailStep[] = [
  { id: "paso-sede", label: "Sede y ceremonia" },
  { id: "paso-nombre", label: "Tu nombre" },
  { id: "paso-datos", label: "Datos personales" },
  { id: "paso-trabajo", label: "Trabajo" },
  { id: "paso-titulo", label: "El título" },
  { id: "paso-foto", label: "Fotografía" },
  { id: "paso-firma", label: "Firma" },
];

/**
 * "Solicitud de título" — el tercer trámite público, hermano de Inscripción y Asignación: mismo
 * lenguaje visual (PortalBand / StepRail / PortalPanel) y misma forma de entrar sin contraseña, pero
 * con carné, porque solo un alumno ya inscrito puede pedir la impresión de su título.
 *
 * A diferencia de Inscripción (cuatro fichas independientes), aquí es UN solo papel: se guarda
 * entero de una vez y al final se descarga en PDF, listo para imprimir y entregar en Secretaría.
 */
export function SolicitudTituloPage() {
  const [solicitud, setSolicitud] = useState<SolicitudTitulo | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Solicitud de título | ISEL";
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) {
      setLoading(false);
      return;
    }
    getSolicitudTitulo(Number(stored))
      .then(setSolicitud)
      .catch(() => sessionStorage.removeItem(STORAGE_KEY))
      .finally(() => setLoading(false));
  }, []);

  function handleEnter(s: SolicitudTitulo) {
    sessionStorage.setItem(STORAGE_KEY, String(s.id));
    setSolicitud(s);
  }

  function handleExit() {
    sessionStorage.removeItem(STORAGE_KEY);
    setSolicitud(null);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-isel-paper">
        <Loading label="Abriendo tu solicitud" />
      </main>
    );
  }

  if (!solicitud) {
    return <AccesoTituloGate onEnter={handleEnter} />;
  }

  return (
    <main className="min-h-screen bg-isel-paper pb-28">
      <PortalTopBar context="Solicitud de impresión de título" onLogout={handleExit} />

      <PortalBand
        eyebrow="Solicitud de impresión de título"
        title={solicitud.nombreCompletoAlumno || "Tu solicitud"}
        meta={
          <>
            <Chip tone="onDark" icon="card">
              Carné {solicitud.carnet}
            </Chip>
            <Chip tone="onDark" icon="calendar">
              Solicitud del {solicitud.fechaSolicitud.split("-").reverse().join("/")}
            </Chip>
            <Chip tone="onDark" icon={solicitud.fotoBase64 ? "check" : "user"}>Fotografía</Chip>
            <Chip tone="onDark" icon={solicitud.firmaBase64 ? "check" : "pen"}>Firma</Chip>
          </>
        }
      />

      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <StepStrip steps={STEPS} />

        <div className="grid grid-cols-1 gap-10 pt-10 lg:grid-cols-[13.5rem_minmax(0,1fr)] lg:gap-14">
          <StepRail steps={STEPS} />
          <div className="min-w-0">
            <SolicitudTituloForm solicitud={solicitud} onSaved={setSolicitud} />
            <div className="mt-6 pb-4">
              <CierreSolicitud
                solicitud={solicitud}
                onFinish={() => {
                  sessionStorage.removeItem(STORAGE_KEY);
                  setSolicitud(null);
                  navigate("/");
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------------- */

/**
 * El cierre: descargar la ficha ya llena y salir.
 *
 * La solicitud no termina en el sistema —termina en Secretaría, en papel—, así que el remate útil
 * aquí no es "enviar" sino tener el PDF en la mano. El botón imprime lo que hay guardado, no lo que
 * está en pantalla sin guardar; por eso avisa si quedó algo pendiente antes de generarlo.
 */
function CierreSolicitud({ solicitud, onFinish }: { solicitud: SolicitudTitulo; onFinish: () => void }) {
  const { confirm, dialog } = useConfirm();
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const partes = [
    { label: "Sede", ok: !!solicitud.campus },
    { label: "Nombres y apellidos", ok: !!solicitud.nombres && !!solicitud.apellidos },
    { label: "Datos personales", ok: !!solicitud.sexo && !!solicitud.fechaNacimiento && !!solicitud.correoElectronico },
    { label: "Título a obtener", ok: !!solicitud.tituloObtener },
    { label: "Fotografía", ok: !!solicitud.fotoBase64 },
    { label: "Firma", ok: !!solicitud.firmaBase64 },
  ];
  const faltan = partes.filter((p) => !p.ok).map((p) => p.label);

  async function handlePrint() {
    if (faltan.length > 0) {
      const ok = await confirm({
        title: "Tu ficha está incompleta",
        message: `Todavía falta: ${faltan.join(", ")}. Se imprimirá con esos espacios en blanco. ¿Descargarla así?`,
        confirmLabel: "Sí, descargar",
      });
      if (!ok) return;
    }
    setPrinting(true);
    setError(null);
    try {
      await openSolicitudTituloPdf(solicitud.id);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo generar el PDF de tu solicitud.");
    } finally {
      setPrinting(false);
    }
  }

  return (
    <>
      <PortalPanel
        step="08"
        accent="#0C332A"
        title="Descarga tu solicitud"
        description="Imprímela, fírmala si te lo piden en físico y entrégala en Secretaría junto con lo que te indiquen."
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
              ) : (
                <Chip tone="gold" icon="alert">Pendiente</Chip>
              )}
            </li>
          ))}
        </ul>

        {error && (
          <div className="mt-5">
            <Alert kind="error">{error}</Alert>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-isel-line pt-5">
          <p className="mr-auto flex items-center gap-2 text-[12.5px] text-isel-ink/45">
            <Icon name="lock" size={13} />
            El PDF sale en una sola hoja, con el formato oficial de la universidad.
          </p>
          <PortalButton tone="ghost" icon="arrowLeft" onClick={onFinish}>
            Guardar y salir
          </PortalButton>
          <PortalButton tone="accent" icon="printer" loading={printing} onClick={handlePrint} className="px-6 py-3 text-[14px]">
            Descargar mi solicitud
          </PortalButton>
        </div>
      </PortalPanel>
      {dialog}
    </>
  );
}
