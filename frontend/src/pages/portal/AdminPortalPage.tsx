import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSession } from "@/lib/auth";
import { useSession } from "@/hooks/useSession";
import { getAssignments, toDateParam, deleteAssignment, openFichaPdf, openFichaBatchPdf } from "@/lib/assignmentsApi";
import { ApiError } from "@/lib/http";
import { getStudents, deleteStudent } from "@/lib/studentsApi";
import { rangeFor, type RangeMode } from "@/lib/dateRanges";
import type { CourseAssignment, TipoPago } from "@/types/courseAssignment";
import type { Student } from "@/types/student";
import { Modal } from "@/components/ui/Modal";
import { StudentFormModal } from "@/components/portal/StudentFormModal";
import { CourseAssignmentForm } from "@/components/portal/CourseAssignmentForm";
import { InscripcionesAdminPanels } from "@/components/inscripcion/InscripcionesAdminPanels";
import { StudentDocumentsPanel } from "@/components/portal/StudentDocumentsPanel";
import { PrintOptionsModal, type PrintSelection } from "@/components/portal/PrintOptionsModal";
import { getStudentDocumentos, openFichaYDocumentosPdf, openStudentDocumentosPdf } from "@/lib/studentDocumentsApi";
import { useConfirm } from "@/hooks/useConfirm";
import { Icon } from "@/components/portal/Icon";
import { FichaStack } from "@/components/portal/FichaCard";
import { PortalBand, PortalPanel, PortalTopBar } from "@/components/portal/PortalShell";
import { Alert, Chip, EmptyState, IconButton, Loading, PortalButton, Segmented, fieldClass } from "@/components/portal/kit";

/**
 * Panel administrativo.
 *
 * Rediseño de superficie: ni un handler, ni una llamada a la API, ni un filtro
 * cambian de comportamiento. Lo que cambia es que se pueda leer.
 *
 * Diagnóstico de lo que había: dos <table> desnudas, sin cabecera fija, con
 * "Imprimir / Eliminar" como enlaces subrayados de 12px —la afordancia más
 * débil que existe para una acción destructiva—; los filtros de rango repartidos
 * en cinco botones-píldora sueltos por la fila, uno de ellos ("Cargar día")
 * literalmente idéntico a otro ("HOY"); emoji por iconos; y ningún sitio donde
 * mirar para saber cuántas fichas hay, ni cuántas son de link y cuántas
 * presenciales sin contarlas a mano.
 *
 * Ahora: una banda de identidad con la pila de fichas del rango cargado, un
 * solo control segmentado por decisión, tablas con cabecera propia y acciones
 * con peso, y estados de vacío/carga/error diseñados en vez de una línea de
 * texto gris. La ficha de un alumno se abre en consulta; editarla es un clic
 * aparte.
 */

export function todayInput(): string {
  const d = new Date();
  return toDateParam(d);
}

/**
 * Las fechas del rango, en palabras. "Este mes" no dice nada por sí solo —¿qué
 * mes, contado desde cuándo?—; "del 1 al 31 de agosto de 2026" sí, y es lo que
 * hay que poder leer antes de mandar cuarenta fichas a la impresora.
 */
export function rangeText(from: Date, to: Date): string {
  const dia = (d: Date) => d.getDate();
  const mes = (d: Date) => d.toLocaleDateString("es-GT", { month: "long" });
  const anio = to.getFullYear();
  if (from.toDateString() === to.toDateString()) return `${dia(from)} de ${mes(from)} de ${anio}`;
  if (from.getMonth() === to.getMonth()) return `del ${dia(from)} al ${dia(to)} de ${mes(to)} de ${anio}`;
  return `del ${dia(from)} de ${mes(from)} al ${dia(to)} de ${mes(to)} de ${anio}`;
}

/** Lowercased, accent-stripped, so typing "jose" finds a name with an accented "e" and "gonzalez"
 *  finds one with an accented "a". NFD-decomposes each accented letter into a base letter plus a
 *  separate combining-mark codepoint, then drops every codepoint in the Unicode "Combining
 *  Diacritical Marks" block (hex 0x0300 to 0x036F) by numeric comparison rather than a regex range,
 *  which is easy to mis-paste as literal accented characters instead of the codepoints themselves. */
export function normalize(s: string): string {
  return Array.from(s.normalize("NFD"))
    .filter((ch) => {
      const code = ch.codePointAt(0) ?? 0;
      return code < 0x0300 || code > 0x036f;
    })
    .join("")
    .toLowerCase();
}

export function AdminPortalPage() {
  const { logout } = useSession();
  const navigate = useNavigate();
  const session = getSession();
  const { confirm, dialog: confirmDialog } = useConfirm();

  // Un solo panel de admin, dos superficies — igual que ya era, con "Inscripciones" como segunda
  // pestaña en vez de una ruta aparte.
  const [adminTab, setAdminTab] = useState<"asignaciones" | "inscripciones">("asignaciones");

  useEffect(() => {
    document.title = "Panel administrativo | ISEL";
  }, []);

  function handleLogout() {
    logout();
    navigate("/portal/login");
  }

  // ---- Impresión de asignaciones ----
  const [dateInput, setDateInput] = useState(todayInput());
  const [rangeMode, setRangeMode] = useState<RangeMode | null>(null);
  const [tipoPagoFilter, setTipoPagoFilter] = useState<TipoPago | "todas">("todas");
  const [assignments, setAssignments] = useState<CourseAssignment[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [assignmentsLoaded, setAssignmentsLoaded] = useState(false);
  // Finds one ficha among however many HOY/SEMANA/MES loaded — client-side over what's already on
  // screen, so it's instant and doesn't touch "Imprimir todas", which still prints the full loaded
  // range regardless of what's typed here.
  const [assignmentSearch, setAssignmentSearch] = useState("");

  async function loadAssignments(mode: RangeMode, tipoPago: TipoPago | "todas" = tipoPagoFilter) {
    setRangeMode(mode);
    setLoadingAssignments(true);
    const anchor = new Date(`${dateInput}T00:00:00`);
    const { from, to } = rangeFor(mode, anchor);
    try {
      const results = await getAssignments(from, to, tipoPago === "todas" ? undefined : tipoPago);
      setAssignments(results);
      setAssignmentsLoaded(true);
    } finally {
      setLoadingAssignments(false);
    }
  }

  function handleTipoPagoFilterChange(tipoPago: TipoPago | "todas") {
    setTipoPagoFilter(tipoPago);
    if (rangeMode) loadAssignments(rangeMode, tipoPago);
  }

  // ---- Alumnos (CRUD) ----
  const [students, setStudents] = useState<Student[]>([]);
  const [carnetFilter, setCarnetFilter] = useState("");
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  async function loadStudents() {
    setLoadingStudents(true);
    try {
      setStudents(await getStudents({ carnet: carnetFilter || undefined }));
    } finally {
      setLoadingStudents(false);
    }
  }

  useEffect(() => {
    loadStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDeleteStudent(s: Student) {
    const ok = await confirm({
      title: "Eliminar alumno",
      message: `¿Estás seguro que deseas eliminar a ${s.nombreCompleto} (carné ${s.carnet}) de la base de datos? Esta acción no se puede deshacer.`,
      confirmLabel: "Sí, eliminar",
      danger: true,
    });
    if (!ok) return;
    await deleteStudent(s.id);
    loadStudents();
  }

  // ---- Ver / editar ficha de un alumno ----
  // Se abre SIEMPRE en solo lectura. Consultar una ficha es lo que se hace
  // veinte veces al día; modificar la de otra persona tiene que ser una
  // decisión explícita, no el estado por defecto con "Guardar asignación"
  // esperando al final del scroll.
  const [fichaStudent, setFichaStudent] = useState<Student | null>(null);
  const [fichaEditing, setFichaEditing] = useState(false);

  function openFicha(s: Student) {
    setFichaStudent(s);
    setFichaEditing(false);
  }

  function closeFicha() {
    setFichaStudent(null);
    setFichaEditing(false);
  }

  async function handleDeleteAssignment(a: CourseAssignment) {
    const ok = await confirm({
      title: "Eliminar ficha",
      message: `¿Estás seguro que deseas eliminar la ficha de asignación de ${a.nombreCompleto}? Esta acción no se puede deshacer.`,
      confirmLabel: "Sí, eliminar",
      danger: true,
    });
    if (!ok) return;
    await deleteAssignment(a.id);
    if (rangeMode) loadAssignments(rangeMode);
  }

  // ---- Impresión — genera un PDF real (plantilla oficial rellenada y convertida en el servidor) y
  // lo manda directo al diálogo de impresión nativo del navegador, todo dentro de la misma pestaña
  // (ningún tab/ventana externa) — ver el comentario de openPdf en assignmentsApi.ts ----
  const [printingId, setPrintingId] = useState<number | "batch" | null>(null);
  const [printError, setPrintError] = useState<string | null>(null);
  // Si el alumno tiene papelería extra subida, "Imprimir" pregunta qué imprimir en vez de ir directo
  // a la ficha — ver PrintOptionsModal. Sin documentos, nada cambia respecto a como ya funcionaba.
  const [printOptionsFor, setPrintOptionsFor] = useState<CourseAssignment | null>(null);
  const [printingSelection, setPrintingSelection] = useState(false);

  async function handlePrintOne(a: CourseAssignment) {
    setPrintingId(a.id);
    setPrintError(null);
    try {
      const docs = await getStudentDocumentos(a.studentId);
      if (docs.length === 0) {
        await openFichaPdf(a.id);
      } else {
        setPrintOptionsFor(a);
      }
    } catch (e) {
      setPrintError(e instanceof ApiError ? e.message : "No se pudo generar el PDF de la ficha.");
    } finally {
      setPrintingId(null);
    }
  }

  async function handlePrintSelection(selection: PrintSelection) {
    if (!printOptionsFor) return;
    setPrintingSelection(true);
    setPrintError(null);
    try {
      if (selection === "ficha") await openFichaPdf(printOptionsFor.id);
      else if (selection === "documentos") await openStudentDocumentosPdf(printOptionsFor.studentId);
      else await openFichaYDocumentosPdf(printOptionsFor.id);
      setPrintOptionsFor(null);
    } catch (e) {
      setPrintError(e instanceof ApiError ? e.message : "No se pudo generar el PDF.");
    } finally {
      setPrintingSelection(false);
    }
  }

  async function handlePrintAll() {
    if (!rangeMode) return;
    setPrintingId("batch");
    setPrintError(null);
    try {
      const anchor = new Date(`${dateInput}T00:00:00`);
      const { from, to } = rangeFor(rangeMode, anchor);
      await openFichaBatchPdf(from, to, tipoPagoFilter === "todas" ? undefined : tipoPagoFilter);
    } catch (e) {
      setPrintError(e instanceof ApiError ? e.message : "No se pudo generar el PDF de las fichas.");
    } finally {
      setPrintingId(null);
    }
  }

  const rangeLabel = useMemo(() => {
    if (!rangeMode) return null;
    return { day: "Hoy", week: "Esta semana", month: "Este mes" }[rangeMode];
  }, [rangeMode]);

  const rangeDates = useMemo(() => {
    if (!rangeMode) return null;
    const { from, to } = rangeFor(rangeMode, new Date(`${dateInput}T00:00:00`));
    return rangeText(from, to);
  }, [rangeMode, dateInput]);

  const emptyAssignmentsMessage = useMemo(() => {
    const tipoPagoLabel = { link: "de pago por link", presencial: "de pago presencial" } as const;
    const suffix = tipoPagoFilter === "todas" ? "" : ` ${tipoPagoLabel[tipoPagoFilter.toLowerCase() as "link" | "presencial"]}`;
    return `No hay fichas${suffix} para ${rangeLabel?.toLowerCase()}.`;
  }, [tipoPagoFilter, rangeLabel]);

  // Matches carné, nombre, or carrera — whichever the admin is most likely to remember about the
  // one ficha they're looking for among however many the date range pulled in.
  const filteredAssignments = useMemo(() => {
    const q = normalize(assignmentSearch.trim());
    if (!q) return assignments;
    return assignments.filter(
      (a) => normalize(a.carnet).includes(q) || normalize(a.nombreCompleto).includes(q) || normalize(a.carrera).includes(q),
    );
  }, [assignments, assignmentSearch]);

  // Cifras derivadas de lo que ya está cargado — ninguna consulta nueva.
  const linkCount = useMemo(() => assignments.filter((a) => a.tipoPago === "Link").length, [assignments]);
  const presencialCount = useMemo(() => assignments.filter((a) => a.tipoPago === "Presencial").length, [assignments]);

  return (
    <main className="min-h-screen bg-isel-paper pb-24">
      <PortalTopBar
        context="Panel administrativo"
        onLogout={handleLogout}
        identity={
          <span className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 md:inline-flex">
            <Icon name="lock" size={13} className="text-isel-gold" />
            <span className="text-[12px] font-semibold text-white/70">Administración</span>
          </span>
        }
      />

      <PortalBand
        eyebrow="Fichas de asignación"
        title="Panel administrativo"
        meta={
          <Chip tone="onDark" icon="users">
            {students.length} {students.length === 1 ? "alumno" : "alumnos"} en la lista
          </Chip>
        }
        aside={
          <FichaStack
            loaded={assignmentsLoaded}
            rangeLabel={rangeLabel}
            rangeText={rangeDates}
            total={assignments.length}
            link={linkCount}
            presencial={presencialCount}
          />
        }
      />

      <div className="mx-auto max-w-7xl space-y-6 px-5 pt-10 sm:px-8">
        <Segmented
          value={adminTab}
          onChange={setAdminTab}
          options={[
            { value: "asignaciones" as const, label: "Asignaciones" },
            { value: "inscripciones" as const, label: "Inscripciones" },
          ]}
        />

        {adminTab === "inscripciones" ? (
          <InscripcionesAdminPanels />
        ) : (
          <>
        {/* ------------------------------------------ fichas / impresión */}
        <PortalPanel
          step="01"
          accent="#B8791F"
          title="Impresión de asignaciones"
          description="Elige una fecha ancla y el rango que quieres revisar. La impresión masiva usa el rango cargado, no el texto que busques."
          actions={
            <PortalButton
              tone="primary"
              icon="printer"
              disabled={assignments.length === 0}
              loading={printingId === "batch"}
              onClick={handlePrintAll}
            >
              Imprimir todas
            </PortalButton>
          }
        >
          <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
            <label className="block">
              <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-[0.14em] text-isel-ink/45">
                Fecha ancla
              </span>
              <input
                type="date"
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
                className={`${fieldClass} w-auto tabular`}
              />
            </label>

            <div>
              <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-[0.14em] text-isel-ink/45">
                Rango
              </span>
              <Segmented
                value={rangeMode}
                onChange={(m) => loadAssignments(m)}
                options={[
                  { value: "day" as RangeMode, label: "Hoy" },
                  { value: "week" as RangeMode, label: "Semana" },
                  { value: "month" as RangeMode, label: "Mes" },
                ]}
              />
            </div>

            <div>
              <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-[0.14em] text-isel-ink/45">
                Tipo de pago
              </span>
              <Segmented
                value={tipoPagoFilter}
                onChange={handleTipoPagoFilterChange}
                options={[
                  { value: "todas" as const, label: "Todas" },
                  { value: "Link" as const, label: "Link" },
                  { value: "Presencial" as const, label: "Presencial" },
                ]}
              />
            </div>
          </div>

          {printError && (
            <div className="mt-5">
              <Alert kind="error">{printError}</Alert>
            </div>
          )}

          {assignmentsLoaded && assignments.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div className="relative min-w-[240px] flex-1">
                <Icon
                  name="search"
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-isel-ink/30"
                />
                <input
                  type="text"
                  value={assignmentSearch}
                  onChange={(e) => setAssignmentSearch(e.target.value)}
                  placeholder="Buscar por carné, nombre o carrera…"
                  className={`${fieldClass} pl-10 pr-9`}
                />
                {assignmentSearch && (
                  <button
                    type="button"
                    onClick={() => setAssignmentSearch("")}
                    aria-label="Limpiar búsqueda"
                    className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-isel-ink/35 transition-colors duration-200 hover:bg-isel-navy/[0.07] hover:text-isel-navy"
                  >
                    <Icon name="close" size={14} />
                  </button>
                )}
              </div>
              <span className="tabular text-[12.5px] text-isel-ink/45">
                {assignmentSearch
                  ? `${filteredAssignments.length} de ${assignments.length} fichas`
                  : `${assignments.length} ficha${assignments.length === 1 ? "" : "s"}`}
              </span>
            </div>
          )}

          <div className="mt-5 overflow-hidden rounded-xl border border-isel-line">
            {!assignmentsLoaded ? (
              <EmptyState
                icon="calendar"
                title="Elige un rango para empezar"
                hint="Hoy, Semana o Mes carga las fichas guardadas alrededor de la fecha ancla."
              />
            ) : loadingAssignments ? (
              <Loading label="Cargando fichas" />
            ) : assignments.length === 0 ? (
              <EmptyState icon="file" title={emptyAssignmentsMessage} hint="Prueba con otro rango o con otro tipo de pago." />
            ) : filteredAssignments.length === 0 ? (
              <EmptyState
                icon="search"
                title={`Ninguna ficha coincide con “${assignmentSearch}”`}
                hint="La búsqueda mira el carné, el nombre y la carrera de lo que ya está cargado."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[780px] border-collapse text-left text-[13.5px]">
                  <thead>
                    <tr className="border-b border-isel-line bg-isel-paper/60">
                      <Th>Carné</Th>
                      <Th>Alumno</Th>
                      <Th>Carrera</Th>
                      <Th className="text-center">Tri</Th>
                      <Th>Tipo de pago</Th>
                      <Th className="text-right">Acciones</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-isel-line/70">
                    {filteredAssignments.map((a) => (
                      <tr key={a.id} className="group/tr relative transition-colors duration-200 ease-crisp hover:bg-isel-paper/60">
                        <Td className="tabular relative font-semibold text-isel-navy">
                          <span
                            aria-hidden
                            className="absolute inset-y-0 left-0 w-[3px] origin-center scale-y-0 bg-[var(--accent)] transition-transform duration-300 ease-snap group-hover/tr:scale-y-100"
                          />
                          {a.carnet}
                        </Td>
                        <Td>{a.nombreCompleto}</Td>
                        <Td className="text-isel-ink/65">{a.carrera}</Td>
                        <Td className="tabular text-center text-isel-ink/65">{a.trimestre}</Td>
                        <Td>
                          {a.tipoPago ? (
                            <Chip tone={a.tipoPago === "Link" ? "sky" : "plum"}>
                              {a.tipoPago === "Link" ? "Link de pago" : "Presencial"}
                            </Chip>
                          ) : (
                            <span className="text-isel-ink/25">—</span>
                          )}
                        </Td>
                        <Td>
                          <div className="flex items-center justify-end gap-1">
                            <PortalButton
                              tone="ghost"
                              size="sm"
                              icon="printer"
                              loading={printingId === a.id}
                              disabled={printingId !== null && printingId !== a.id}
                              onClick={() => handlePrintOne(a)}
                            >
                              Imprimir
                            </PortalButton>
                            <IconButton
                              icon="trash"
                              tone="danger"
                              label={`Eliminar la ficha de ${a.nombreCompleto}`}
                              onClick={() => handleDeleteAssignment(a)}
                            />
                          </div>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </PortalPanel>

        {/* ------------------------------------------------------ alumnos */}
        <PortalPanel
          step="02"
          accent="#12855C"
          title="Alumnos"
          description="La lista de la que sale todo: quien no está aquí, no puede entrar al portal ni firmar una ficha."
          actions={
            <PortalButton
              tone="accent"
              icon="plus"
              onClick={() => {
                setEditingStudent(null);
                setStudentModalOpen(true);
              }}
            >
              Agregar alumno
            </PortalButton>
          }
        >
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[240px] flex-1">
              <Icon
                name="search"
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-isel-ink/30"
              />
              <input
                value={carnetFilter}
                onChange={(e) => setCarnetFilter(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadStudents()}
                placeholder="Filtrar por carné y pulsa Enter…"
                className={`${fieldClass} pl-10`}
              />
            </div>
            <PortalButton tone="ghost" icon="search" onClick={loadStudents} loading={loadingStudents}>
              Buscar
            </PortalButton>
          </div>

          <div className="mt-5 overflow-hidden rounded-xl border border-isel-line">
            {loadingStudents ? (
              <Loading label="Cargando alumnos" />
            ) : students.length === 0 ? (
              <EmptyState
                icon="users"
                title="Ningún alumno con ese carné"
                hint="Vacía el filtro y pulsa Buscar para volver a ver la lista completa."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] border-collapse text-left text-[13.5px]">
                  <thead>
                    <tr className="border-b border-isel-line bg-isel-paper/60">
                      <Th>Carné</Th>
                      <Th>Alumno</Th>
                      <Th>Carrera</Th>
                      <Th className="text-center">Sección</Th>
                      <Th className="text-center">Tri</Th>
                      <Th className="text-right">Acciones</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-isel-line/70">
                    {students.map((s) => (
                      <tr key={s.id} className="group/tr relative transition-colors duration-200 ease-crisp hover:bg-isel-paper/60">
                        <Td className="tabular relative font-semibold text-isel-navy">
                          <span
                            aria-hidden
                            className="absolute inset-y-0 left-0 w-[3px] origin-center scale-y-0 bg-[var(--accent)] transition-transform duration-300 ease-snap group-hover/tr:scale-y-100"
                          />
                          {s.carnet}
                        </Td>
                        <Td>{s.nombreCompleto}</Td>
                        <Td className="text-isel-ink/65">{s.carrera}</Td>
                        <Td className="text-center text-isel-ink/65">{s.seccion || "—"}</Td>
                        <Td className="tabular text-center text-isel-ink/65">{s.trimestre ?? "—"}</Td>
                        <Td>
                          <div className="flex items-center justify-end gap-1">
                            <PortalButton tone="ghost" size="sm" icon="eye" onClick={() => openFicha(s)}>
                              Ver ficha
                            </PortalButton>
                            <IconButton
                              icon="pencil"
                              label={`Editar a ${s.nombreCompleto}`}
                              onClick={() => {
                                setEditingStudent(s);
                                setStudentModalOpen(true);
                              }}
                            />
                            <IconButton
                              icon="trash"
                              tone="danger"
                              label={`Eliminar a ${s.nombreCompleto}`}
                              onClick={() => handleDeleteStudent(s)}
                            />
                          </div>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </PortalPanel>
          </>
        )}
      </div>

      <StudentFormModal
        open={studentModalOpen}
        onClose={() => setStudentModalOpen(false)}
        student={editingStudent}
        onSaved={loadStudents}
      />

      {fichaStudent && (
        <Modal open onClose={closeFicha} title={`Ficha — ${fichaStudent.nombreCompleto}`} widthClassName="max-w-4xl">
          {/* Barra de modo. Mientras diga "consulta", nada de dentro se puede
              tocar y no hay botón de guardar; pasar a edición es un clic
              deliberado, y se nota porque la barra cambia de color. */}
          <div
            className={`mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors duration-500 ease-crisp ${
              fichaEditing
                ? "border-isel-gold/40 bg-isel-gold/10"
                : "border-isel-line bg-isel-paper/70"
            }`}
          >
            <p className="flex items-center gap-2.5 text-[13px] font-semibold text-isel-navy">
              <Icon name={fichaEditing ? "pencil" : "eye"} size={16} className="text-isel-gold2" />
              {fichaEditing ? "Estás editando esta ficha" : "Estás consultando esta ficha"}
              <span className="font-normal text-isel-ink/45">
                {fichaEditing ? "— los cambios se guardan al final" : "— nada se puede modificar"}
              </span>
            </p>
            {fichaEditing ? (
              <PortalButton tone="ghost" size="sm" icon="close" onClick={() => setFichaEditing(false)}>
                Salir de edición
              </PortalButton>
            ) : (
              <PortalButton tone="primary" size="sm" icon="pencil" onClick={() => setFichaEditing(true)}>
                Editar ficha
              </PortalButton>
            )}
          </div>

          <CourseAssignmentForm
            key={fichaEditing ? "edit" : "view"}
            student={fichaStudent}
            readOnly={!fichaEditing}
            autorizadoPorCodigo={session?.role === "admin" ? "ADMIN" : null}
            onSaved={() => {
              if (rangeMode) loadAssignments(rangeMode);
            }}
            onDismissSaved={closeFicha}
          />

          <div className="mt-6">
            <StudentDocumentsPanel studentId={fichaStudent.id} />
          </div>
        </Modal>
      )}

      {printOptionsFor && (
        <PrintOptionsModal
          open
          printing={printingSelection}
          onClose={() => setPrintOptionsFor(null)}
          onPrint={handlePrintSelection}
        />
      )}
      {confirmDialog}
    </main>
  );
}

/* Celdas de tabla: la cabecera se queda pegada al desplazar en horizontal y
   las cifras van tabulares, para que las columnas no bailen al filtrar.
   Exportadas — el panel de Inscripciones (components/inscripcion/InscripcionesAdminPanels.tsx)
   las reutiliza tal cual, mismas tablas, mismo aspecto. */
export function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={`whitespace-nowrap px-4 py-3 text-[10.5px] font-bold uppercase tracking-[0.13em] text-isel-ink/45 ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 align-middle text-isel-ink ${className}`}>{children}</td>;
}
