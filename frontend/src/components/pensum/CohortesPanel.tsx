import { useState } from "react";
import { ApiError } from "@/lib/http";
import {
  actualizarCohorte,
  crearCohorte,
  eliminarCohorte,
  fechaLarga,
  type CohorteAdmin,
  type CohortePayload,
} from "@/lib/cohortesApi";
import { Modal } from "@/components/ui/Modal";
import { useConfirm } from "@/hooks/useConfirm";
import { PortalPanel } from "@/components/portal/PortalShell";
import { Alert, Chip, EmptyState, Field, IconButton, Loading, PortalButton, fieldClass } from "@/components/portal/kit";

/**
 * Las cohortes: cuándo empieza cada grupo de ingreso. Es una dimensión aparte de la
 * carrera — "Maestría en X" es una sola, y lo que cambia cada año es la cohorte con la
 * que se entra. De aquí salen tres cosas:
 *
 * · las cohortes ABIERTAS son las que el aspirante puede elegir al inscribirse;
 * · cada alumno del padrón está en una (por defecto, la del año de su carné);
 * · el pénsum de una carrera puede cambiar a partir de una cohorte (ver las versiones
 *   del pénsum más abajo), sin inventar una "carrera 2027" aparte.
 *
 * El estado vive en el padre (PensumAdminPanels) porque las versiones del pénsum
 * también necesitan la lista.
 */
export function CohortesPanel({
  cohortes,
  onChange,
}: {
  cohortes: CohorteAdmin[] | null;
  onChange: (list: CohorteAdmin[]) => void;
}) {
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [modal, setModal] = useState<CohorteAdmin | "nueva" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(accion: () => Promise<CohorteAdmin[]>, fallback: string) {
    setBusy(true);
    setError(null);
    try {
      onChange(await accion());
      return true;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : fallback);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function guardar(payload: CohortePayload) {
    const ok =
      modal === "nueva"
        ? await run(() => crearCohorte(payload), "No se pudo crear la cohorte.")
        : modal
          ? await run(() => actualizarCohorte(modal.id, payload), "No se pudo guardar la cohorte.")
          : false;
    if (ok) setModal(null);
  }

  async function alternarApertura(c: CohorteAdmin) {
    await run(
      () =>
        actualizarCohorte(c.id, {
          anio: c.anio,
          periodo: c.periodo,
          nombre: c.nombre,
          fechaInicio: c.fechaInicio ?? null,
          abiertaInscripcion: !c.abiertaInscripcion,
        }),
      "No se pudo cambiar el estado de la cohorte.",
    );
  }

  async function borrar(c: CohorteAdmin) {
    const ok = await confirm({
      title: "Eliminar cohorte",
      message: `Se va a eliminar la ${c.nombre}. Esta acción no se puede deshacer.`,
      confirmLabel: "Sí, eliminar",
      danger: true,
    });
    if (!ok) return;
    await run(() => eliminarCohorte(c.id), "No se pudo eliminar la cohorte.");
  }

  // Sugerencia para la nueva: el año siguiente a la más reciente.
  const siguienteAnio = cohortes && cohortes.length > 0 ? Math.max(...cohortes.map((c) => c.anio)) + 1 : new Date().getFullYear();

  return (
    <>
      <PortalPanel
        step="01"
        accent="#1F6FA8"
        title="Cohortes"
        description="Cada cohorte es un grupo de ingreso (el año en que se empieza). La carrera es una sola; la cohorte dice cuándo se entra. Las cohortes abiertas son las que el aspirante puede elegir al inscribirse."
        actions={
          <PortalButton tone="accent" icon="plus" disabled={busy} onClick={() => setModal("nueva")}>
            Agregar cohorte
          </PortalButton>
        }
      >
        {error && (
          <div className="mb-5">
            <Alert kind="error">{error}</Alert>
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-isel-line">
          {!cohortes ? (
            <Loading label="Cargando las cohortes" />
          ) : cohortes.length === 0 ? (
            <EmptyState
              icon="calendar"
              title="Todavía no hay cohortes"
              hint="Agrega la primera: el año en que inicia un grupo de ingreso. Mientras no haya ninguna abierta, el formulario de inscripción no pide cohorte."
            />
          ) : (
            <ul className="divide-y divide-isel-line/70">
              {[...cohortes].reverse().map((c) => {
                const enUso = c.alumnos + c.aspirantes + c.versionesPensum > 0;
                return (
                  <li key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold text-isel-navy">{c.nombre}</p>
                      <p className="mt-0.5 text-[12px] text-isel-ink/50">
                        {c.fechaInicio ? `Inicia el ${fechaLarga(c.fechaInicio)}` : "Sin fecha de inicio"}
                        {" · "}
                        {c.alumnos} alumno{c.alumnos === 1 ? "" : "s"}
                        {c.aspirantes > 0 && ` · ${c.aspirantes} aspirante${c.aspirantes === 1 ? "" : "s"} en proceso`}
                        {c.versionesPensum > 0 &&
                          ` · pénsum propio en ${c.versionesPensum} carrera${c.versionesPensum === 1 ? "" : "s"}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                      {c.abiertaInscripcion ? (
                        <Chip tone="emerald" icon="check">
                          Abierta a inscripción
                        </Chip>
                      ) : (
                        <Chip tone="neutral" icon="lock">
                          Cerrada
                        </Chip>
                      )}
                      <PortalButton
                        tone="ghost"
                        size="sm"
                        icon={c.abiertaInscripcion ? "lock" : "check"}
                        disabled={busy}
                        onClick={() => alternarApertura(c)}
                      >
                        {c.abiertaInscripcion ? "Cerrar" : "Abrir"}
                      </PortalButton>
                      <IconButton icon="pencil" label={`Editar ${c.nombre}`} disabled={busy} onClick={() => setModal(c)} />
                      <IconButton
                        icon="trash"
                        tone="danger"
                        label={enUso ? `No se puede eliminar la ${c.nombre}: está en uso. Ciérrala.` : `Eliminar ${c.nombre}`}
                        disabled={busy || enUso}
                        onClick={() => borrar(c)}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PortalPanel>

      {modal && (
        <CohorteFormModal
          cohorte={modal === "nueva" ? null : modal}
          anioSugerido={siguienteAnio}
          busy={busy}
          onClose={() => setModal(null)}
          onSave={guardar}
        />
      )}
      {confirmDialog}
    </>
  );
}

function CohorteFormModal({
  cohorte,
  anioSugerido,
  busy,
  onClose,
  onSave,
}: {
  cohorte: CohorteAdmin | null;
  anioSugerido: number;
  busy: boolean;
  onClose: () => void;
  onSave: (p: CohortePayload) => void;
}) {
  const [anio, setAnio] = useState(String(cohorte?.anio ?? anioSugerido));
  const [periodo, setPeriodo] = useState(String(cohorte?.periodo ?? 1));
  const [nombre, setNombre] = useState(cohorte?.nombre ?? "");
  const [fechaInicio, setFechaInicio] = useState(cohorte?.fechaInicio ?? "");
  const [abierta, setAbierta] = useState(cohorte?.abiertaInscripcion ?? true);

  const anioN = Number(anio);
  const periodoN = Number(periodo);
  const valido = Number.isInteger(anioN) && anioN >= 2000 && anioN <= 2099 && periodoN >= 1 && periodoN <= 9;
  const nombreDefecto = periodoN <= 1 ? `Cohorte ${anio}` : `Cohorte ${anio}-${periodo}`;

  return (
    <Modal open onClose={onClose} title={cohorte ? "Editar cohorte" : "Agregar cohorte"} widthClassName="max-w-xl">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Año de inicio *" hint="Coincide con el año que llevará el carné.">
            <input type="number" value={anio} onChange={(e) => setAnio(e.target.value)} className={fieldClass} />
          </Field>
          <Field label="Ingreso dentro del año" hint="1 si solo hay un ingreso ese año.">
            <input type="number" min={1} max={9} value={periodo} onChange={(e) => setPeriodo(e.target.value)} className={fieldClass} />
          </Field>
        </div>
        <Field label="Nombre" hint={`Si lo dejas vacío: «${nombreDefecto}».`}>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder={nombreDefecto} className={fieldClass} />
        </Field>
        <Field label="Fecha de inicio de clases" hint="Se le muestra al aspirante al elegir la cohorte.">
          <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className={fieldClass} />
        </Field>
        <label className="flex cursor-pointer gap-3 rounded-xl border border-isel-line bg-isel-paper/50 px-3.5 py-3 transition-colors duration-300 ease-crisp hover:border-isel-navy/25">
          <input
            type="checkbox"
            checked={abierta}
            onChange={(e) => setAbierta(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-isel-emerald"
          />
          <span>
            <span className="block text-[13.5px] font-semibold text-isel-navy">Abierta a inscripción</span>
            <span className="mt-1 block text-[12px] leading-relaxed text-isel-ink/50">
              Aparece en el formulario de inscripción de nuevo ingreso. Ciérrala cuando termine la convocatoria; no se borra nada.
            </span>
          </span>
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <PortalButton tone="ghost" onClick={onClose}>
            Cancelar
          </PortalButton>
          <PortalButton
            tone="accent"
            icon="save"
            loading={busy}
            disabled={!valido}
            onClick={() =>
              onSave({
                anio: anioN,
                periodo: periodoN,
                nombre: nombre.trim() || null,
                fechaInicio: fechaInicio || null,
                abiertaInscripcion: abierta,
              })
            }
          >
            {cohorte ? "Guardar cambios" : "Crear cohorte"}
          </PortalButton>
        </div>
      </div>
    </Modal>
  );
}
