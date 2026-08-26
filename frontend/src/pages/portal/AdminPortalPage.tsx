import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSession } from "@/lib/auth";
import { useSession } from "@/hooks/useSession";
import { getAssignments, getAssignmentStatus, toDateParam, getAssignmentByStudent, deleteAssignment } from "@/lib/assignmentsApi";
import { getStudents, getCarreras, deleteStudent } from "@/lib/studentsApi";
import { rangeFor, type RangeMode } from "@/lib/dateRanges";
import type { CourseAssignment, AssignmentStatusRow } from "@/types/courseAssignment";
import type { Student } from "@/types/student";
import { Modal } from "@/components/ui/Modal";
import { StudentFormModal } from "@/components/portal/StudentFormModal";
import { CourseAssignmentForm } from "@/components/portal/CourseAssignmentForm";
import { PrintableFichaBatch } from "@/components/portal/PrintableFicha";

const inputClass =
  "rounded-lg border border-isel-line bg-white px-3 py-2 text-sm text-isel-ink transition-colors duration-200 focus:border-isel-navy focus:outline-none focus:ring-2 focus:ring-isel-navy/15";

function todayInput(): string {
  const d = new Date();
  return toDateParam(d);
}

export function AdminPortalPage() {
  const { logout } = useSession();
  const navigate = useNavigate();
  const session = getSession();

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
  const [assignments, setAssignments] = useState<CourseAssignment[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [assignmentsLoaded, setAssignmentsLoaded] = useState(false);

  async function loadAssignments(mode: RangeMode) {
    setRangeMode(mode);
    setLoadingAssignments(true);
    const anchor = new Date(`${dateInput}T00:00:00`);
    const { from, to } = rangeFor(mode, anchor);
    try {
      const results = await getAssignments(from, to);
      setAssignments(results);
      setAssignmentsLoaded(true);
    } finally {
      setLoadingAssignments(false);
    }
  }

  // ---- Enviadas por carrera y trimestre ----
  const [carreras, setCarreras] = useState<string[]>([]);
  const [statusCarrera, setStatusCarrera] = useState("");
  const [statusTrimestre, setStatusTrimestre] = useState<number | "">("");
  const [statusRows, setStatusRows] = useState<AssignmentStatusRow[] | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  useEffect(() => {
    getCarreras().then(setCarreras);
  }, []);

  async function loadStatus() {
    if (!statusCarrera || statusTrimestre === "") return;
    setLoadingStatus(true);
    try {
      setStatusRows(await getAssignmentStatus(statusCarrera, Number(statusTrimestre)));
    } finally {
      setLoadingStatus(false);
    }
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
    if (!confirm(`¿Eliminar a ${s.nombreCompleto} (${s.carnet}) de la base de datos?`)) return;
    await deleteStudent(s.id);
    loadStudents();
  }

  // ---- Ver / editar ficha de un alumno ----
  const [fichaModal, setFichaModal] = useState<{ student: Student; assignment: CourseAssignment | null } | null>(null);

  async function openFicha(student: Student) {
    const existing = await getAssignmentByStudent(student.carnet, student.trimestre ?? undefined);
    setFichaModal({ student, assignment: existing });
  }

  async function handleDeleteAssignment(a: CourseAssignment) {
    if (!confirm(`¿Eliminar la ficha de ${a.nombreCompleto}?`)) return;
    await deleteAssignment(a.id);
    if (rangeMode) loadAssignments(rangeMode);
  }

  // ---- Impresión ----
  const [printItems, setPrintItems] = useState<CourseAssignment[] | null>(null);

  useEffect(() => {
    if (!printItems) return;
    const timer = setTimeout(() => window.print(), 150);
    const handleAfterPrint = () => setPrintItems(null);
    window.addEventListener("afterprint", handleAfterPrint);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, [printItems]);

  const rangeLabel = useMemo(() => {
    if (!rangeMode) return null;
    return { day: "Hoy", week: "Esta semana", month: "Este mes" }[rangeMode];
  }, [rangeMode]);

  return (
    <>
    <main className="min-h-screen bg-isel-paper pb-24 print:hidden">
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
              disabled={assignments.length === 0}
              onClick={() => setPrintItems(assignments)}
              className="rounded-full bg-isel-navy px-4 py-2 text-sm font-semibold text-white transition-colors duration-300 hover:bg-isel-gold hover:text-isel-navy disabled:cursor-not-allowed disabled:opacity-40"
            >
              🖨️ Imprimir todas
            </button>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-isel-ink/50">
                  <th className="pb-2">Carné</th>
                  <th className="pb-2">Alumno</th>
                  <th className="pb-2">Carrera</th>
                  <th className="pb-2">Sem/Tri</th>
                  <th className="pb-2">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-isel-line">
                {!assignmentsLoaded ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-isel-ink/50">
                      Elige HOY, SEMANA, MES o carga un día para ver las asignaciones guardadas.
                    </td>
                  </tr>
                ) : loadingAssignments ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-isel-ink/50">
                      Cargando…
                    </td>
                  </tr>
                ) : assignments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-isel-ink/50">
                      No hay asignaciones guardadas para {rangeLabel?.toLowerCase()}.
                    </td>
                  </tr>
                ) : (
                  assignments.map((a) => (
                    <tr key={a.id}>
                      <td className="py-2 pr-2">{a.carnet}</td>
                      <td className="py-2 pr-2">{a.nombreCompleto}</td>
                      <td className="py-2 pr-2">{a.carrera}</td>
                      <td className="py-2 pr-2">{a.trimestre}</td>
                      <td className="py-2">
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setPrintItems([a])} className="text-xs font-semibold text-isel-navy hover:underline">
                            Imprimir
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

        {/* Enviadas por carrera y trimestre */}
        <section className="rounded-2xl bg-white p-6 shadow-card">
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-isel-navy">
            👥 Enviadas por carrera y trimestre
          </h2>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-semibold text-isel-ink/60">Carrera</span>
              <select value={statusCarrera} onChange={(e) => setStatusCarrera(e.target.value)} className={`${inputClass} min-w-[16rem]`}>
                <option value="">Seleccione carrera</option>
                {carreras.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-semibold text-isel-ink/60">Sem/Trim</span>
              <input
                type="number"
                value={statusTrimestre}
                onChange={(e) => setStatusTrimestre(e.target.value ? Number(e.target.value) : "")}
                className={`${inputClass} w-24`}
              />
            </label>
            <button type="button" onClick={loadStatus} className="rounded-full bg-isel-navy px-4 py-2 text-sm font-semibold text-white hover:bg-isel-gold hover:text-isel-navy">
              👥 Ver reporte
            </button>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-isel-ink/50">
                  <th className="pb-2">Estado</th>
                  <th className="pb-2">Carné</th>
                  <th className="pb-2">Alumno</th>
                  <th className="pb-2">Carrera</th>
                  <th className="pb-2">Sem/Tri</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-isel-line">
                {loadingStatus ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-isel-ink/50">
                      Cargando…
                    </td>
                  </tr>
                ) : !statusRows ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-isel-ink/50">
                      Selecciona carrera y trimestre para ver el estado.
                    </td>
                  </tr>
                ) : statusRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-isel-ink/50">
                      No hay alumnos en esa carrera/trimestre.
                    </td>
                  </tr>
                ) : (
                  statusRows.map((r) => (
                    <tr key={r.carnet}>
                      <td className="py-2 pr-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${r.estado === "Enviada" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                          {r.estado}
                        </span>
                      </td>
                      <td className="py-2 pr-2">{r.carnet}</td>
                      <td className="py-2 pr-2">{r.alumno}</td>
                      <td className="py-2 pr-2">{r.carrera}</td>
                      <td className="py-2">{r.semTri}</td>
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
                          <button type="button" onClick={() => openFicha(s)} className="text-xs font-semibold text-isel-navy hover:underline">
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
        onSaved={() => {
          loadStudents();
          getCarreras().then(setCarreras);
        }}
      />

      {fichaModal && (
        <Modal open onClose={() => setFichaModal(null)} title={`Ficha — ${fichaModal.student.nombreCompleto}`} widthClassName="max-w-4xl">
          <CourseAssignmentForm
            student={fichaModal.student}
            initialAssignment={fichaModal.assignment}
            trimestre={fichaModal.student.trimestre ?? 1}
            autorizadoPorCodigo={session?.role === "admin" ? "ADMIN" : null}
            onSaved={(saved) => setFichaModal({ student: fichaModal.student, assignment: saved })}
          />
        </Modal>
      )}
    </main>

    {/* Print-only region — hidden on screen, shown only inside window.print() (sibling of `main`, which is print:hidden) */}
    {printItems && (
      <div className="hidden print:block">
        <PrintableFichaBatch assignments={printItems} />
      </div>
    )}
    </>
  );
}
