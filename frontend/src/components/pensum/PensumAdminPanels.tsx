import { useEffect, useMemo, useState } from "react";
import { ApiError } from "@/lib/http";
import {
  actualizarCarrera,
  actualizarCurso,
  crearCarrera,
  crearCurso,
  eliminarCarrera,
  eliminarCurso,
  eliminarTrimestre,
  getPensum,
  reordenarCarreras,
  type CarreraPayload,
  type PensumCarrera,
} from "@/lib/pensumApi";
import { Modal } from "@/components/ui/Modal";
import { useConfirm } from "@/hooks/useConfirm";
import { Icon } from "@/components/portal/Icon";
import { PortalPanel } from "@/components/portal/PortalShell";
import { Alert, Chip, EmptyState, Field, IconButton, Loading, PortalButton, fieldClass } from "@/components/portal/kit";

/**
 * Pestaña "Pénsum" del panel administrativo.
 *
 * Es el único sitio donde se edita el plan de estudios, y lo que se guarde aquí
 * es lo que ven en el acto los tres trámites — asignación, inscripción y
 * solicitud de título — porque los tres leen de esta misma tabla. No hay una
 * segunda copia del pénsum en el código que haya que acordarse de tocar.
 *
 * Dos decisiones que sostienen todo lo demás:
 *
 * · **Cada operación devuelve el pénsum entero recalculado**, no un "listo".
 *   Un renombrado arrastra ocho tablas y borrar un trimestre se lleva varios
 *   cursos por delante; adivinar en el cliente cómo quedó el árbol después de
 *   eso es exactamente donde aparecen las pantallas que mienten. Aquí se pinta
 *   lo que respondió el servidor.
 *
 * · **Borrar y archivar no son lo mismo.** Una carrera con alumnos, fichas o
 *   expedientes no se puede borrar: los dejaría apuntando a una carrera que ya
 *   no existe y su pénsum saldría vacío. Para esas, la salida es archivarla —
 *   desaparece de los formularios y el historial sigue en pie. El servidor lo
 *   comprueba también, no solo esta pantalla.
 */

const TIPOS = ["Maestría", "Actualización profesional", "Diplomado", "Cursos libres"];

const ORDINALES = ["", "Primer", "Segundo", "Tercer", "Cuarto", "Quinto", "Sexto", "Séptimo", "Octavo", "Noveno", "Décimo"];

/** "Cuarto trimestre" mientras haya palabra; a partir del décimo, "Trimestre 11". */
const tituloTrimestre = (n: number) => (ORDINALES[n] ? `${ORDINALES[n]} trimestre` : `Trimestre ${n}`);

export function PensumAdminPanels() {
  const { confirm, dialog: confirmDialog } = useConfirm();

  const [carreras, setCarreras] = useState<PensumCarrera[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Qué carrera está desplegada. Solo una a la vez: con siete pénsums abiertos
  // el scroll pierde toda referencia de dónde está uno.
  const [abierta, setAbierta] = useState<number | null>(null);
  const [filtro, setFiltro] = useState("");

  const [modalCarrera, setModalCarrera] = useState<PensumCarrera | "nueva" | null>(null);

  // Edición de un curso en su propia fila, y alta de curso dentro de un trimestre.
  const [cursoEditando, setCursoEditando] = useState<{ id: number; nombre: string } | null>(null);
  const [cursoNuevo, setCursoNuevo] = useState<{ carreraId: number; trimestre: number; nombre: string } | null>(null);

  useEffect(() => {
    let active = true;
    getPensum()
      .then((list) => active && setCarreras(list))
      .catch((e) => active && setError(mensaje(e, "No se pudo cargar el pénsum.")));
    return () => {
      active = false;
    };
  }, []);

  function mensaje(e: unknown, fallback: string) {
    return e instanceof ApiError ? e.message : fallback;
  }

  /**
   * Envoltorio de toda escritura: apaga los controles mientras va, guarda el
   * árbol que devolvió el servidor y deja el error a la vista si falló. Sin
   * esto, cada uno de los ocho handlers repetiría el mismo try/catch y alguno
   * se quedaría sin él.
   */
  async function run(accion: () => Promise<PensumCarrera[]>, fallback: string) {
    setBusy(true);
    setError(null);
    try {
      setCarreras(await accion());
      return true;
    } catch (e) {
      setError(mensaje(e, fallback));
      return false;
    } finally {
      setBusy(false);
    }
  }

  const visibles = useMemo(() => {
    if (!carreras) return [];
    const q = filtro.trim().toLowerCase();
    if (!q) return carreras;
    return carreras.filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        c.trimestres.some((t) => t.cursos.some((cu) => cu.nombre.toLowerCase().includes(q))),
    );
  }, [carreras, filtro]);

  const totales = useMemo(() => {
    if (!carreras) return { carreras: 0, cursos: 0, archivadas: 0 };
    return {
      carreras: carreras.filter((c) => c.activa).length,
      cursos: carreras.reduce((n, c) => n + c.totalCursos, 0),
      archivadas: carreras.filter((c) => !c.activa).length,
    };
  }, [carreras]);

  // ------------------------------------------------------------- acciones

  async function guardarCarrera(payload: CarreraPayload) {
    const ok =
      modalCarrera === "nueva"
        ? await run(() => crearCarrera(payload), "No se pudo crear la carrera.")
        : modalCarrera
          ? await run(() => actualizarCarrera(modalCarrera.id, payload), "No se pudo guardar la carrera.")
          : false;
    if (ok) setModalCarrera(null);
  }

  async function borrarCarrera(c: PensumCarrera) {
    const ok = await confirm({
      title: "Eliminar carrera",
      message:
        `Se va a eliminar «${c.nombre}» y sus ${c.totalCursos} curso${c.totalCursos === 1 ? "" : "s"} del pénsum. ` +
        "Esta acción no se puede deshacer.",
      confirmLabel: "Sí, eliminar",
      danger: true,
    });
    if (!ok) return;
    await run(() => eliminarCarrera(c.id), "No se pudo eliminar la carrera.");
  }

  async function alternarArchivo(c: PensumCarrera) {
    if (c.activa) {
      const ok = await confirm({
        title: "Archivar carrera",
        message:
          `«${c.nombre}» dejará de aparecer en los formularios de inscripción y asignación. ` +
          "Los alumnos que ya la cursan la conservan y sus fichas siguen imprimiéndose igual. Puedes reactivarla cuando quieras.",
        confirmLabel: "Sí, archivar",
      });
      if (!ok) return;
    }
    await run(
      () =>
        actualizarCarrera(c.id, {
          nombre: c.nombre,
          tipo: c.tipo,
          esPrograma: c.esPrograma,
          activa: !c.activa,
        }),
      "No se pudo cambiar el estado de la carrera.",
    );
  }

  /** Sube o baja una carrera en el orden en que se listan en todos los formularios. */
  async function mover(c: PensumCarrera, delta: -1 | 1) {
    if (!carreras) return;
    const ids = carreras.map((x) => x.id);
    const i = ids.indexOf(c.id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    await run(() => reordenarCarreras(ids), "No se pudo cambiar el orden.");
  }

  async function agregarCurso() {
    if (!cursoNuevo || !cursoNuevo.nombre.trim()) return;
    const ok = await run(
      () => crearCurso(cursoNuevo.carreraId, { trimestre: cursoNuevo.trimestre, nombre: cursoNuevo.nombre }),
      "No se pudo agregar el curso.",
    );
    // El campo se queda abierto y vacío: casi nunca se agrega un solo curso a un trimestre.
    if (ok) setCursoNuevo({ ...cursoNuevo, nombre: "" });
  }

  async function guardarCurso(cursoId: number, trimestre: number) {
    if (!cursoEditando || !cursoEditando.nombre.trim()) return;
    const ok = await run(
      () => actualizarCurso(cursoId, { trimestre, nombre: cursoEditando.nombre }),
      "No se pudo guardar el curso.",
    );
    if (ok) setCursoEditando(null);
  }

  async function borrarCurso(cursoId: number, nombre: string) {
    const ok = await confirm({
      title: "Quitar curso del pénsum",
      message:
        `«${nombre}» dejará de ofrecerse en ese trimestre. Las fichas ya guardadas que lo incluyen ` +
        "no cambian: siguen diciendo lo que decían el día que se imprimieron.",
      confirmLabel: "Sí, quitar",
      danger: true,
    });
    if (!ok) return;
    await run(() => eliminarCurso(cursoId), "No se pudo quitar el curso.");
  }

  async function borrarTrimestre(c: PensumCarrera, trimestre: number, cuantos: number) {
    const ok = await confirm({
      title: `Eliminar el trimestre ${trimestre}`,
      message:
        `Se quitarán del pénsum de «${c.nombre}» los ${cuantos} curso${cuantos === 1 ? "" : "s"} de ese trimestre. ` +
        "Las fichas ya guardadas no cambian.",
      confirmLabel: "Sí, eliminar",
      danger: true,
    });
    if (!ok) return;
    await run(() => eliminarTrimestre(c.id, trimestre), "No se pudo eliminar el trimestre.");
  }

  function agregarTrimestre(c: PensumCarrera) {
    const siguiente = (c.trimestres.at(-1)?.trimestre ?? 0) + 1;
    setCursoNuevo({ carreraId: c.id, trimestre: siguiente, nombre: "" });
  }

  // ------------------------------------------------------------- pintado

  return (
    <>
      <PortalPanel
        step="01"
        accent="#5B4B9E"
        title="Pénsum"
        description="El plan de estudios de cada carrera. Lo que se guarde aquí es lo que ven al instante la asignación de cursos, la inscripción de nuevo ingreso y la solicitud de título."
        actions={
          <PortalButton tone="accent" icon="plus" disabled={busy} onClick={() => setModalCarrera("nueva")}>
            Agregar carrera
          </PortalButton>
        }
      >
        {error && (
          <div className="mb-5">
            <Alert kind="error">{error}</Alert>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Icon
              name="search"
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-isel-ink/30"
            />
            <input
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              placeholder="Buscar una carrera o un curso…"
              className={`${fieldClass} pl-10`}
            />
          </div>
          {carreras && (
            <div className="flex flex-wrap items-center gap-2">
              <Chip tone="neutral" icon="layers">
                {totales.carreras} activa{totales.carreras === 1 ? "" : "s"}
              </Chip>
              <Chip tone="neutral" icon="file">
                {totales.cursos} curso{totales.cursos === 1 ? "" : "s"}
              </Chip>
              {totales.archivadas > 0 && <Chip tone="gold">{totales.archivadas} archivada{totales.archivadas === 1 ? "" : "s"}</Chip>}
            </div>
          )}
        </div>

        <div className="mt-5 space-y-3">
          {!carreras ? (
            <div className="overflow-hidden rounded-xl border border-isel-line">
              <Loading label="Cargando el pénsum" />
            </div>
          ) : visibles.length === 0 ? (
            <div className="overflow-hidden rounded-xl border border-isel-line">
              <EmptyState
                icon={filtro ? "search" : "layers"}
                title={filtro ? `Nada coincide con “${filtro}”` : "Todavía no hay ninguna carrera"}
                hint={
                  filtro
                    ? "La búsqueda mira el nombre de la carrera y el de sus cursos."
                    : "Agrega la primera con el botón de arriba; luego le vas armando el pénsum trimestre por trimestre."
                }
              />
            </div>
          ) : (
            visibles.map((c, i) => (
              <CarreraCard
                key={c.id}
                carrera={c}
                abierta={abierta === c.id}
                busy={busy}
                primera={i === 0}
                ultima={i === visibles.length - 1}
                cursoEditando={cursoEditando}
                cursoNuevo={cursoNuevo}
                onToggle={() => setAbierta((v) => (v === c.id ? null : c.id))}
                onEditar={() => setModalCarrera(c)}
                onArchivar={() => alternarArchivo(c)}
                onEliminar={() => borrarCarrera(c)}
                onMover={(d) => mover(c, d)}
                onCursoEditandoChange={setCursoEditando}
                onCursoNuevoChange={setCursoNuevo}
                onGuardarCurso={guardarCurso}
                onBorrarCurso={borrarCurso}
                onAgregarCurso={agregarCurso}
                onBorrarTrimestre={(t, n) => borrarTrimestre(c, t, n)}
                onAgregarTrimestre={() => agregarTrimestre(c)}
              />
            ))
          )}
        </div>
      </PortalPanel>

      {modalCarrera && (
        <CarreraFormModal
          carrera={modalCarrera === "nueva" ? null : modalCarrera}
          busy={busy}
          onClose={() => setModalCarrera(null)}
          onSave={guardarCarrera}
        />
      )}
      {confirmDialog}
    </>
  );
}

/* ----------------------------------------------------------- una carrera */

interface CarreraCardProps {
  carrera: PensumCarrera;
  abierta: boolean;
  busy: boolean;
  primera: boolean;
  ultima: boolean;
  cursoEditando: { id: number; nombre: string } | null;
  cursoNuevo: { carreraId: number; trimestre: number; nombre: string } | null;
  onToggle: () => void;
  onEditar: () => void;
  onArchivar: () => void;
  onEliminar: () => void;
  onMover: (delta: -1 | 1) => void;
  onCursoEditandoChange: (v: { id: number; nombre: string } | null) => void;
  onCursoNuevoChange: (v: { carreraId: number; trimestre: number; nombre: string } | null) => void;
  onGuardarCurso: (cursoId: number, trimestre: number) => void;
  onBorrarCurso: (cursoId: number, nombre: string) => void;
  onAgregarCurso: () => void;
  onBorrarTrimestre: (trimestre: number, cuantos: number) => void;
  onAgregarTrimestre: () => void;
}

function CarreraCard({
  carrera: c,
  abierta,
  busy,
  primera,
  ultima,
  cursoEditando,
  cursoNuevo,
  onToggle,
  onEditar,
  onArchivar,
  onEliminar,
  onMover,
  onCursoEditandoChange,
  onCursoNuevoChange,
  onGuardarCurso,
  onBorrarCurso,
  onAgregarCurso,
  onBorrarTrimestre,
  onAgregarTrimestre,
}: CarreraCardProps) {
  // Una carrera en uso no se puede borrar: el botón lo dice antes de pulsarlo,
  // en vez de dejar que el servidor conteste 409 y parezca una avería.
  const enUso = c.uso.total > 0;

  return (
    <div
      className={`overflow-hidden rounded-xl border transition-colors duration-300 ease-crisp ${
        abierta ? "border-isel-plum/35 bg-white" : "border-isel-line bg-white hover:border-isel-navy/25"
      } ${c.activa ? "" : "opacity-70"}`}
    >
      <div className="flex flex-wrap items-center gap-3 px-4 py-3.5">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={abierta}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-all duration-300 ease-snap ${
              abierta ? "border-isel-plum/30 bg-isel-plum/10 text-isel-plum" : "border-isel-line bg-isel-paper text-isel-ink/40"
            }`}
          >
            <Icon name="chevronRight" size={15} className={`transition-transform duration-300 ease-snap ${abierta ? "rotate-90" : ""}`} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-semibold text-isel-navy">{c.nombre}</span>
            <span className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11.5px] text-isel-ink/50">
              <span className="font-semibold uppercase tracking-[0.1em] text-isel-plum">{c.tipo}</span>
              <span aria-hidden>·</span>
              <span className="tabular">
                {c.trimestres.length} trimestre{c.trimestres.length === 1 ? "" : "s"} · {c.totalCursos} curso
                {c.totalCursos === 1 ? "" : "s"}
              </span>
              {enUso && (
                <>
                  <span aria-hidden>·</span>
                  <span className="tabular">
                    {c.uso.alumnos > 0 && `${c.uso.alumnos} alumno${c.uso.alumnos === 1 ? "" : "s"}`}
                    {c.uso.alumnos > 0 && c.uso.fichas > 0 && ", "}
                    {c.uso.fichas > 0 && `${c.uso.fichas} ficha${c.uso.fichas === 1 ? "" : "s"}`}
                    {(c.uso.alumnos > 0 || c.uso.fichas > 0) && c.uso.aspirantes > 0 && ", "}
                    {c.uso.aspirantes > 0 && `${c.uso.aspirantes} aspirante${c.uso.aspirantes === 1 ? "" : "s"}`}
                  </span>
                </>
              )}
            </span>
          </span>
        </button>

        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          {!c.activa && <Chip tone="gold">Archivada</Chip>}
          {!c.esPrograma && <Chip tone="neutral">Cursos sueltos</Chip>}
          <IconButton icon="arrowUp" label={`Subir ${c.nombre}`} disabled={busy || primera} onClick={() => onMover(-1)} />
          <IconButton icon="arrowDown" label={`Bajar ${c.nombre}`} disabled={busy || ultima} onClick={() => onMover(1)} />
          <IconButton icon="pencil" label={`Editar ${c.nombre}`} disabled={busy} onClick={onEditar} />
          <PortalButton tone="ghost" size="sm" icon={c.activa ? "lock" : "check"} disabled={busy} onClick={onArchivar}>
            {c.activa ? "Archivar" : "Reactivar"}
          </PortalButton>
          <IconButton
            icon="trash"
            tone="danger"
            label={
              enUso
                ? `No se puede eliminar ${c.nombre}: la usan ${c.uso.total} registros. Archívala.`
                : `Eliminar ${c.nombre}`
            }
            disabled={busy || enUso}
            onClick={onEliminar}
          />
        </div>
      </div>

      {abierta && (
        <div className="border-t border-isel-line bg-isel-paper/40 px-4 py-4">
          {c.trimestres.length === 0 && !cursoNuevo && (
            <p className="px-1 pb-3 text-[13px] text-isel-ink/50">
              Esta carrera todavía no tiene pénsum. Agrega su primer trimestre para empezar.
            </p>
          )}

          <div className="space-y-3">
            {c.trimestres.map((t) => (
              <div key={t.trimestre} className="overflow-hidden rounded-lg border border-isel-line bg-white">
                <div className="flex items-center justify-between gap-3 border-b border-isel-line/70 px-3.5 py-2">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-isel-ink/50">
                    {tituloTrimestre(t.trimestre)}
                    <span className="ml-2 font-normal normal-case tracking-normal text-isel-ink/35">
                      {t.cursos.length} curso{t.cursos.length === 1 ? "" : "s"}
                    </span>
                  </p>
                  <IconButton
                    icon="trash"
                    tone="danger"
                    label={`Eliminar el trimestre ${t.trimestre} de ${c.nombre}`}
                    disabled={busy}
                    onClick={() => onBorrarTrimestre(t.trimestre, t.cursos.length)}
                  />
                </div>

                <ul className="divide-y divide-isel-line/60">
                  {t.cursos.map((curso, idx) => (
                    <li key={curso.id} className="flex items-center gap-3 px-3.5 py-2">
                      <span className="tabular w-5 shrink-0 text-[12px] font-semibold text-isel-ink/30">{idx + 1}</span>
                      {cursoEditando?.id === curso.id ? (
                        <>
                          <input
                            autoFocus
                            value={cursoEditando.nombre}
                            onChange={(e) => onCursoEditandoChange({ id: curso.id, nombre: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") onGuardarCurso(curso.id, t.trimestre);
                              if (e.key === "Escape") onCursoEditandoChange(null);
                            }}
                            className={`${fieldClass} py-1.5 text-[13.5px]`}
                          />
                          <PortalButton
                            tone="accent"
                            size="sm"
                            icon="check"
                            disabled={busy}
                            onClick={() => onGuardarCurso(curso.id, t.trimestre)}
                          >
                            Guardar
                          </PortalButton>
                          <IconButton icon="close" label="Cancelar" onClick={() => onCursoEditandoChange(null)} />
                        </>
                      ) : (
                        <>
                          <span className="min-w-0 flex-1 truncate text-[13.5px] text-isel-ink">{curso.nombre}</span>
                          <IconButton
                            icon="pencil"
                            label={`Editar ${curso.nombre}`}
                            disabled={busy}
                            onClick={() => onCursoEditandoChange({ id: curso.id, nombre: curso.nombre })}
                          />
                          <IconButton
                            icon="trash"
                            tone="danger"
                            label={`Quitar ${curso.nombre}`}
                            disabled={busy}
                            onClick={() => onBorrarCurso(curso.id, curso.nombre)}
                          />
                        </>
                      )}
                    </li>
                  ))}
                </ul>

                {cursoNuevo?.carreraId === c.id && cursoNuevo.trimestre === t.trimestre ? (
                  <NuevoCursoRow
                    valor={cursoNuevo.nombre}
                    busy={busy}
                    onChange={(nombre) => onCursoNuevoChange({ ...cursoNuevo, nombre })}
                    onGuardar={onAgregarCurso}
                    onCerrar={() => onCursoNuevoChange(null)}
                  />
                ) : (
                  <div className="px-3.5 py-2">
                    <PortalButton
                      tone="ghost"
                      size="sm"
                      icon="plus"
                      disabled={busy}
                      onClick={() => onCursoNuevoChange({ carreraId: c.id, trimestre: t.trimestre, nombre: "" })}
                    >
                      Agregar curso
                    </PortalButton>
                  </div>
                )}
              </div>
            ))}

            {/* Un trimestre nuevo no existe hasta que tiene su primer curso: el
                trimestre no es una fila en la base, es la etiqueta de sus cursos. */}
            {cursoNuevo?.carreraId === c.id && !c.trimestres.some((t) => t.trimestre === cursoNuevo.trimestre) ? (
              <div className="overflow-hidden rounded-lg border border-isel-plum/30 bg-white">
                <div className="border-b border-isel-line/70 px-3.5 py-2">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-isel-plum">
                    {tituloTrimestre(cursoNuevo.trimestre)} — nuevo
                  </p>
                </div>
                <NuevoCursoRow
                  valor={cursoNuevo.nombre}
                  busy={busy}
                  onChange={(nombre) => onCursoNuevoChange({ ...cursoNuevo, nombre })}
                  onGuardar={onAgregarCurso}
                  onCerrar={() => onCursoNuevoChange(null)}
                />
              </div>
            ) : (
              <PortalButton tone="ghost" size="sm" icon="plus" disabled={busy} onClick={onAgregarTrimestre}>
                Agregar trimestre {(c.trimestres.at(-1)?.trimestre ?? 0) + 1}
              </PortalButton>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NuevoCursoRow({
  valor,
  busy,
  onChange,
  onGuardar,
  onCerrar,
}: {
  valor: string;
  busy: boolean;
  onChange: (v: string) => void;
  onGuardar: () => void;
  onCerrar: () => void;
}) {
  return (
    <div className="flex items-center gap-2 px-3.5 py-2.5">
      <input
        autoFocus
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onGuardar();
          if (e.key === "Escape") onCerrar();
        }}
        placeholder="Nombre del curso, tal como va en la ficha…"
        className={`${fieldClass} py-1.5 text-[13.5px]`}
      />
      <PortalButton tone="accent" size="sm" icon="plus" disabled={busy || !valor.trim()} onClick={onGuardar}>
        Agregar
      </PortalButton>
      <IconButton icon="close" label="Cerrar" onClick={onCerrar} />
    </div>
  );
}

/* -------------------------------------------------- alta / edición de carrera */

function CarreraFormModal({
  carrera,
  busy,
  onClose,
  onSave,
}: {
  carrera: PensumCarrera | null;
  busy: boolean;
  onClose: () => void;
  onSave: (payload: CarreraPayload) => void;
}) {
  const [nombre, setNombre] = useState(carrera?.nombre ?? "");
  const [tipo, setTipo] = useState(carrera?.tipo ?? TIPOS[0]);
  const [esPrograma, setEsPrograma] = useState(carrera?.esPrograma ?? true);
  const [activa, setActiva] = useState(carrera?.activa ?? true);

  const renombra = !!carrera && nombre.trim() !== carrera.nombre;
  const afectados = carrera?.uso.total ?? 0;

  return (
    <Modal open onClose={onClose} title={carrera ? "Editar carrera" : "Agregar carrera"} widthClassName="max-w-xl">
      <div className="space-y-4">
        <Field
          label="Nombre"
          hint="Tal cual tiene que salir impreso en la ficha y en los formularios."
        >
          <input
            autoFocus
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Maestría en…"
            className={fieldClass}
          />
        </Field>

        <Field label="Tipo" hint="Solo es la etiqueta que se ve al lado del nombre en este panel.">
          <input
            list="pensum-tipos"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className={fieldClass}
          />
          <datalist id="pensum-tipos">
            {TIPOS.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </Field>

        <Check
          checked={esPrograma}
          onChange={setEsPrograma}
          label="Es una carrera en la que se inscribe gente"
          hint="Desmárcalo solo para grupos de cursos sueltos que se toman al lado de otra carrera, como Inglés: sus cursos se podrán elegir como “curso adicional”, pero nadie se inscribirá en ella."
        />

        <Check
          checked={activa}
          onChange={setActiva}
          label="Activa"
          hint="Si la desmarcas, deja de aparecer en los formularios sin borrar el historial de quienes ya la cursan."
        />

        {renombra && afectados > 0 && (
          <Alert kind="info">
            Al cambiar el nombre se actualiza también en los {afectados} registro{afectados === 1 ? "" : "s"} que lo
            usan (alumnos, fichas y expedientes de inscripción), para que ninguno quede apuntando al nombre viejo.
          </Alert>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <PortalButton tone="ghost" onClick={onClose}>
            Cancelar
          </PortalButton>
          <PortalButton
            tone="accent"
            icon="save"
            loading={busy}
            disabled={!nombre.trim()}
            onClick={() => onSave({ nombre: nombre.trim(), tipo: tipo.trim(), esPrograma, activa })}
          >
            {carrera ? "Guardar cambios" : "Crear carrera"}
          </PortalButton>
        </div>
      </div>
    </Modal>
  );
}

function Check({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint: string;
}) {
  return (
    <label className="flex cursor-pointer gap-3 rounded-xl border border-isel-line bg-isel-paper/50 px-3.5 py-3 transition-colors duration-300 ease-crisp hover:border-isel-navy/25">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-isel-emerald"
      />
      <span>
        <span className="block text-[13.5px] font-semibold text-isel-navy">{label}</span>
        <span className="mt-1 block text-[12px] leading-relaxed text-isel-ink/50">{hint}</span>
      </span>
    </label>
  );
}
