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
import { useConfirm } from "@/hooks/useConfirm";

const inputClass =
  "rounded-lg border border-isel-line bg-white px-3 py-2 text-sm text-isel-ink transition-colors duration-200 focus:border-isel-navy focus:outline-none focus:ring-2 focus:ring-isel-navy/15";

function todayInput(): string {
  const d = new Date();
  return toDateParam(d);
}

/** Lowercased, accent-stripped, so typing "jose" finds a name with an accented "e" and "gonzalez"
 *  finds one with an accented "a". NFD-decomposes each accented letter into a base letter plus a
 *  separate combining-mark codepoint, then drops every codepoint in the Unicode "Combining
 *  Diacritical Marks" block (hex 0x0300 to 0x036F) by numeric comparison rather than a regex range,
 *  which is easy to mis-paste as literal accented characters instead of the codepoints themselves. */
function normalize(s: string): string {
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
  const [fichaStudent, setFichaStudent] = useState<Student | null>(null);

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

  async function handlePrintOne(a: CourseAssignment) {
    setPrintingId(a.id);
    setPrintError(null);
    try {
      await openFichaPdf(a.id);
    } catch (e) {
      setPrintError(e instanceof ApiError ? e.message : "No se pudo generar el PDF de la ficha.");
    } finally {
      setPrintingId(null);
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

  return (
    <main className="min-h-screen bg-isel-paper pb-24">
      <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-isel-line bg-white/90 px-6 py-4 backdrop-blur">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-isel-gold2">Panel administrativo</p>
          <h1 className="font-display text-xl font-bold text-isel-navy sm:text-2xl">Asignaciones de cursos</h1>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-2 rounded-full border-2 border-isel-navy px-4 py-2 text-sm font-semibold text-isel-navy transition-colors duration-200 hover:bg-isel-navy hover:text-white"
        >
          ↩ Cerrar sesión
        </button>
      </header>

      <div className="mx-auto max-w-6xl space-y-8 px-6 py-8">
        {/* Impresión de asignaciones */}
        <section className="rounded-2xl bg-white p-6 shadow-card">
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-isel-navy">
            🖨️ Impresión de asignaciones
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-isel-ink/60">Fecha</span>
              <input type="date" value={dateInput} onChange={(e) => setDateInput(e.target.value)} className={inputClass} />
            </label>
            <button type="button" onClick={() => loadAssignments("day")} className="rounded-full bg-isel-paper px-4 py-2 text-sm font-semibold text-isel-navy hover:bg-isel-line">
              📅 Cargar día
            </button>
            <div className="ml-auto flex gap-2">
              {(["day", "week", "month"] as RangeMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => loadAssignments(m)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-200 ${
                    rangeMode === m ? "bg-isel-navy text-white" : "border-2 border-isel-line text-isel-ink/70 hover:border-isel-navy hover:text-isel-navy"
                  }`}
                >
                  {{ day: "HOY", week: "SEMANA", month: "MES" }[m]}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={assignments.length === 0 || printingId !== null}
              onClick={handlePrintAll}
              className="rounded-full bg-isel-navy px-4 py-2 text-sm font-semibold text-white transition-colors duration-300 hover:bg-isel-gold hover:text-isel-navy disabled:cursor-not-allowed disabled:opacity-40"
            >
              🖨️ {printingId === "batch" ? "Generando…" : "Imprimir todas"}
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-isel-ink/50">Tipo de pago</span>
            {(["todas", "Link", "Presencial"] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => handleTipoPagoFilterChange(opt)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors duration-200 ${
                  tipoPagoFilter === opt ? "bg-isel-gold text-isel-navy" : "border-2 border-isel-line text-isel-ink/60 hover:border-isel-navy hover:text-isel-navy"
                }`}
              >
                {opt === "todas" ? "Todas" : opt === "Link" ? "Link de pago" : "Presencial"}
              </button>
            ))}
          </div>

          {printError && (
            <p className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-600">⚠️ {printError}</p>
          )}

          {assignmentsLoaded && assignments.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[220px]">
                <input
                  type="text"
                  value={assignmentSearch}
                  onChange={(e) => setAssignmentSearch(e.target.value)}
                  placeholder="🔎 Buscar por carné, nombre o carrera…"
                  className={`${inputClass} w-full pr-8`}
                />
                {assignmentSearch && (
                  <button
                    type="button"
                    onClick={() => setAssignmentSearch("")}
                    aria-label="Limpiar búsqueda"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-isel-ink/40 hover:text-isel-ink"
                  >
                    ✕
                  </button>
                )}
              </div>
              <span className="text-xs text-isel-ink/50">
                {assignmentSearch
                  ? `${filteredAssignments.length} de ${assignments.length} fichas`
                  : `${assignments.length} ficha${assignments.length === 1 ? "" : "s"}`}
              </span>
            </div>
          )}

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-isel-ink/50">
                  <th className="pb-2">Carné</th>
                  <th className="pb-2">Alumno</th>
                  <th className="pb-2">Carrera</th>
                  <th className="pb-2">Sem/Tri</th>
                  <th className="pb-2">Tipo de pago</th>
                  <th className="pb-2">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-isel-line">
                {!assignmentsLoaded ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-isel-ink/50">
                      Elige HOY, SEMANA, MES o carga un día para ver las asignaciones guardadas.
                    </td>
                  </tr>
                ) : loadingAssignments ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-isel-ink/50">
                      Cargando…
                    </td>
                  </tr>
                ) : assignments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-isel-ink/50">
                      {emptyAssignmentsMessage}
                    </td>
                  </tr>
                ) : filteredAssignments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-isel-ink/50">
                      Ninguna ficha coincide con "{assignmentSearch}".
                    </td>
                  </tr>
                ) : (
                  filteredAssignments.map((a) => (
                    <tr key={a.id}>
                      <td className="py-2 pr-2">{a.carnet}</td>
                      <td className="py-2 pr-2">{a.nombreCompleto}</td>
                      <td className="py-2 pr-2">{a.carrera}</td>
                      <td className="py-2 pr-2">{a.trimestre}</td>
                      <td className="py-2 pr-2">
                        {a.tipoPago ? (
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${a.tipoPago === "Link" ? "bg-sky-100 text-sky-700" : "bg-purple-100 text-purple-700"}`}>
                            {a.tipoPago === "Link" ? "Link de pago" : "Presencial"}
                          </span>
                        ) : (
                          <span className="text-xs text-isel-ink/30">—</span>
                        )}
                      </td>
                      <td className="py-2">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={printingId !== null}
                            onClick={() => handlePrintOne(a)}
                            className="text-xs font-semibold text-isel-navy hover:underline disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {printingId === a.id ? "Generando…" : "Imprimir"}
                          </button>
                          <button type="button" onClick={() => handleDeleteAssignment(a)} className="text-xs font-semibold text-red-600 hover:underline">
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Alumnos (CRUD) */}
        <section className="rounded-2xl bg-white p-6 shadow-card">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-isel-navy">🗂️ Alumnos</h2>
            <button
              type="button"
              onClick={() => {
                setEditingStudent(null);
                setStudentModalOpen(true);
              }}
              className="rounded-full bg-isel-navy px-4 py-2 text-sm font-semibold text-white transition-colors duration-300 hover:bg-isel-gold hover:text-isel-navy"
            >
              + Agregar alumno
            </button>
          </div>

          <div className="mb-4 flex gap-3">
            <input
              value={carnetFilter}
              onChange={(e) => setCarnetFilter(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadStudents()}
              placeholder="Filtrar por carné…"
              className={`${inputClass} flex-1`}
            />
            <button type="button" onClick={loadStudents} className="rounded-full border-2 border-isel-line px-4 py-2 text-sm font-semibold text-isel-ink/70 hover:border-isel-navy hover:text-isel-navy">
              Buscar
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] border-collapse text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-isel-ink/50">
                  <th className="pb-2">Carné</th>
                  <th className="pb-2">Alumno</th>
                  <th className="pb-2">Carrera</th>
                  <th className="pb-2">Sección</th>
                  <th className="pb-2">Sem/Tri</th>
                  <th className="pb-2">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-isel-line">
                {loadingStudents ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-isel-ink/50">
                      Cargando…
                    </td>
                  </tr>
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-isel-ink/50">
                      Sin resultados.
                    </td>
                  </tr>
                ) : (
                  students.map((s) => (
                    <tr key={s.id}>
                      <td className="py-2 pr-2">{s.carnet}</td>
                      <td className="py-2 pr-2">{s.nombreCompleto}</td>
                      <td className="py-2 pr-2">{s.carrera}</td>
                      <td className="py-2 pr-2">{s.seccion}</td>
                      <td className="py-2 pr-2">{s.trimestre}</td>
                      <td className="py-2">
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => setFichaStudent(s)} className="text-xs font-semibold text-isel-navy hover:underline">
                            Ver ficha
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingStudent(s);
                              setStudentModalOpen(true);
                            }}
                            className="text-xs font-semibold text-isel-navy hover:underline"
                          >
                            Editar
                          </button>
                          <button type="button" onClick={() => handleDeleteStudent(s)} className="text-xs font-semibold text-red-600 hover:underline">
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <StudentFormModal
        open={studentModalOpen}
        onClose={() => setStudentModalOpen(false)}
        student={editingStudent}
        onSaved={loadStudents}
      />

      {fichaStudent && (
        <Modal open onClose={() => setFichaStudent(null)} title={`Ficha — ${fichaStudent.nombreCompleto}`} widthClassName="max-w-4xl">
          <CourseAssignmentForm
            student={fichaStudent}
            autorizadoPorCodigo={session?.role === "admin" ? "ADMIN" : null}
            onSaved={() => {
              if (rangeMode) loadAssignments(rangeMode);
            }}
            onDismissSaved={() => setFichaStudent(null)}
          />
        </Modal>
      )}
      {confirmDialog}
    </main>
  );
}
