import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AccesoTituloGate } from "@/components/titulo/AccesoTituloGate";
import {
  SolicitudTituloForm,
  type EstadoSolicitudForm,
  type SolicitudTituloFormHandle,
} from "@/components/titulo/SolicitudTituloForm";
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
  // Lo que hay EN PANTALLA, no lo que hay grabado: el paso 08 y los distintivos de arriba se leen de
  // aquí para no contradecir al formulario mientras el alumno lo llena.
  const [estado, setEstado] = useState<EstadoSolicitudForm | null>(null);
  const formRef = useRef<SolicitudTituloFormHandle>(null);
  const navigate = useNavigate();

  // Estable: se lo pasamos al formulario, que lo llama desde un efecto.
  const handleEstado = useCallback((e: EstadoSolicitudForm) => setEstado(e), []);

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
            <Chip tone="onDark" icon={(estado?.tieneFoto ?? !!solicitud.fotoBase64) ? "check" : "user"}>Fotografía</Chip>
            <Chip tone="onDark" icon={(estado?.tieneFirma ?? !!solicitud.firmaBase64) ? "check" : "pen"}>Firma</Chip>
          </>
        }
      />

      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <StepStrip steps={STEPS} />

        <div className="grid grid-cols-1 gap-10 pt-10 lg:grid-cols-[13.5rem_minmax(0,1fr)] lg:gap-14">
          <StepRail steps={STEPS} />
          <div className="min-w-0">
            <SolicitudTituloForm
              ref={formRef}
              solicitud={solicitud}
              onSaved={setSolicitud}
              onEstadoChange={handleEstado}
            />
            <div className="mt-6 pb-4">
              <CierreSolicitud
                solicitud={solicitud}
                estado={estado}
                onGuardar={() => formRef.current?.save() ?? Promise.resolve(null)}
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
 * aquí no es "enviar" sino tener el PDF en la mano.
 *
 * El repaso mira lo que hay EN PANTALLA (`estado`), no lo último grabado. Antes miraba solo el
 * servidor, y como la ficha se guarda de una sola vez con un botón que queda al fondo, quien llenaba
 * todo y bajaba directo a descargar veía "Pendiente" en los apartados que acababa de llenar: los
 * únicos que salían en verde eran los que el sistema ya traía puestos (sede, nombre, carrera). Y por
 * la misma razón ninguno de los dos botones se lleva nada a medias: ambos guardan antes de seguir.
 */
function CierreSolicitud({
  solicitud,
  estado,
  onGuardar,
  onFinish,
}: {
  solicitud: SolicitudTitulo;
  estado: EstadoSolicitudForm | null;
  onGuardar: () => Promise<SolicitudTitulo | null>;
  onFinish: () => void;
}) {
  const { confirm, dialog } = useConfirm();
  const [printing, setPrinting] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mientras el formulario no haya dicho cómo va (primer pintado), se usa lo grabado.
  const faltantes = estado?.faltantes ?? [];
  const conocido = estado !== null;
  const partes = [
    { label: "Sede", ok: conocido ? !faltantes.includes("la sede") : !!solicitud.campus },
    {
      label: "Nombres y apellidos",
      ok: conocido
        ? !faltantes.includes("tus nombres") && !faltantes.includes("tus apellidos")
        : !!solicitud.nombres && !!solicitud.apellidos,
    },
    {
      label: "Datos personales",
      ok: conocido
        ? !faltantes.includes("el sexo") &&
          !faltantes.includes("la fecha de nacimiento") &&
          !faltantes.includes("el correo")
        : !!solicitud.sexo && !!solicitud.fechaNacimiento && !!solicitud.correoElectronico,
    },
    {
      label: "Título a obtener",
      ok: conocido ? !faltantes.includes("el título a obtener") : !!solicitud.tituloObtener,
    },
    { label: "Fotografía", ok: conocido ? !!estado?.tieneFoto : !!solicitud.fotoBase64 },
    { label: "Firma", ok: conocido ? !!estado?.tieneFirma : !!solicitud.firmaBase64 },
  ];
  const faltan = partes.filter((p) => !p.ok).map((p) => p.label);
  const sinGuardar = estado?.sinGuardar ?? false;

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
      // El PDF lo arma el servidor con lo que tiene grabado, así que se guarda primero: si no, la
      // ficha salía impresa sin lo último que el alumno acababa de escribir.
      const guardada = await onGuardar();
      if (!guardada) {
        setError("Revisa el aviso de la barra de abajo: no pudimos guardar antes de generar el PDF.");
        return;
      }
      await openSolicitudTituloPdf(guardada.id);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo generar el PDF de tu solicitud.");
    } finally {
      setPrinting(false);
    }
  }

  /** "Guardar y salir" guarda de verdad — antes solo salía, y se perdía lo escrito. */
  async function handleFinish() {
    setSaliendo(true);
    setError(null);
    try {
      const guardada = await onGuardar();
      if (!guardada) {
        setError("Revisa el aviso de la barra de abajo: no pudimos guardar tu solicitud.");
        return;
      }
      onFinish();
    } finally {
      setSaliendo(false);
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
                <Chip tone="emerald" icon="check">{sinGuardar ? "Listo" : "Guardado"}</Chip>
              ) : (
                <Chip tone="gold" icon="alert">Pendiente</Chip>
              )}
            </li>
          ))}
        </ul>

        {sinGuardar && (
          <div className="mt-5">
            <Alert kind="info">
              Tienes cambios sin guardar. No hace falta que subas a buscar el botón: al descargar o al
              salir se guardan solos.
            </Alert>
          </div>
        )}

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
          <PortalButton tone="ghost" icon="arrowLeft" loading={saliendo} onClick={handleFinish}>
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
