import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { Student } from "@/types/student";
import type { AdditionalCourseRow, CourseAssignment, TipoPago } from "@/types/courseAssignment";
import { saveAssignment } from "@/lib/assignmentsApi";
import { getCourses } from "@/lib/coursesApi";
import { getCarreras } from "@/lib/studentsApi";
import type { Course } from "@/types/course";
import { SignaturePad, type SignaturePadHandle } from "@/components/portal/SignaturePad";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { SearchSelect } from "@/components/ui/SearchSelect";

const inputClass =
  "w-full rounded-lg border border-isel-line bg-white px-3 py-2 text-sm text-isel-ink transition-colors duration-200 focus:border-isel-navy focus:outline-none focus:ring-2 focus:ring-isel-navy/15";

/** A "cursos por asignarse" entry — one per course the student has picked from the catalog. */
interface AssignedEntry {
  key: string;
  courseId: number | null; // null = no longer in the catalog (legacy data), still shown so nothing gets silently dropped
  nombre: string;
  semTri: string;
  seccion: string;
}

/** A "cursos adicionales" row — starts as a single blank row, grown one at a time via "+ Agregar otro". */
interface AdditionalEntry {
  id: string;
  cursoAdicional: string;
  carrera: string;
  semTri: string;
  seccion: string;
  jornada: string;
}

let entryIdSeq = 0;
function nextId() {
  entryIdSeq += 1;
  return `row-${entryIdSeq}`;
}

function initAssigned(rows: CourseAssignment["cursosAsignados"] | undefined): AssignedEntry[] {
  return (rows ?? []).map((r) => ({
    key: nextId(),
    courseId: null, // resolved against the catalog once it loads (see resolveAssignedAgainstCatalog)
    nombre: r.curso,
    semTri: r.semTri ?? "",
    seccion: r.seccion ?? "",
  }));
}

function initAdditional(rows: AdditionalCourseRow[] | undefined): AdditionalEntry[] {
  if (!rows || rows.length === 0) {
    return [{ id: nextId(), cursoAdicional: "", carrera: "", semTri: "", seccion: "", jornada: "" }];
  }
  return rows.map((r) => ({
    id: nextId(),
    cursoAdicional: r.cursoAdicional,
    carrera: r.carrera ?? "",
    semTri: r.semTri ?? "",
    seccion: r.seccion ?? "",
    jornada: r.jornada ?? "",
  }));
}

interface CourseAssignmentFormProps {
  student: Student;
  initialAssignment: CourseAssignment | null;
  trimestre: number;
  /** Present when an admin (not the student) is saving — recorded as an audit trail, not a real auth token. */
  autorizadoPorCodigo?: string | null;
  onSaved?: (assignment: CourseAssignment) => void;
}

export function CourseAssignmentForm({
  student,
  initialAssignment,
  trimestre,
  autorizadoPorCodigo,
  onSaved,
}: CourseAssignmentFormProps) {
  const [catalog, setCatalog] = useState<Course[] | null>(null);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [carreras, setCarreras] = useState<string[]>([]);
  const [assigned, setAssigned] = useState<AssignedEntry[]>(() => initAssigned(initialAssignment?.cursosAsignados));
  const [additional, setAdditional] = useState<AdditionalEntry[]>(() => initAdditional(initialAssignment?.cursosAdicionales));
  const [pendientesTrimestres, setPendientesTrimestres] = useState(initialAssignment?.tienePendientesTrimestres ?? false);
  const [pendientesMaterias, setPendientesMaterias] = useState(initialAssignment?.tienePendientesMaterias ?? false);
  const [tipoPago, setTipoPago] = useState<TipoPago | "">(initialAssignment?.tipoPago ?? "");
  const [correoContacto, setCorreoContacto] = useState(initialAssignment?.correoContacto ?? student.correoPersonal ?? student.correoInstitucional ?? "");
  const [telefonoContacto, setTelefonoContacto] = useState(initialAssignment?.telefonoContacto ?? student.celular ?? "");
  const [comprobantePagoNo, setComprobantePagoNo] = useState(initialAssignment?.comprobantePagoNo ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const signatureRef = useRef<SignaturePadHandle>(null);

  // Reset the whole form whenever we're pointed at a different student/ficha.
  useEffect(() => {
    setAssigned(initAssigned(initialAssignment?.cursosAsignados));
    setAdditional(initAdditional(initialAssignment?.cursosAdicionales));
    setPendientesTrimestres(initialAssignment?.tienePendientesTrimestres ?? false);
    setPendientesMaterias(initialAssignment?.tienePendientesMaterias ?? false);
    setTipoPago(initialAssignment?.tipoPago ?? "");
    setCorreoContacto(initialAssignment?.correoContacto ?? student.correoPersonal ?? student.correoInstitucional ?? "");
    setTelefonoContacto(initialAssignment?.telefonoContacto ?? student.celular ?? "");
    setComprobantePagoNo(initialAssignment?.comprobantePagoNo ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAssignment?.id, student.id]);

  // Load the carrera's course catalog + the full cross-program catalog + the carrera list, once per carrera.
  useEffect(() => {
    let active = true;
    setCatalog(null);
    getCourses(student.carrera).then((courses) => {
      if (!active) return;
      setCatalog(courses);
      // Match previously-saved course names to catalog ids now that we have them.
      setAssigned((rows) =>
        rows.map((r) => {
          if (r.courseId !== null) return r;
          const match = courses.find((c) => c.nombre === r.nombre);
          return match ? { ...r, courseId: match.id } : r;
        }),
      );
    });
    getCourses().then((courses) => active && setAllCourses(courses));
    getCarreras().then((list) => active && setCarreras(list));
    return () => {
      active = false;
    };
  }, [student.carrera]);

  const fechaHoy = useMemo(
    () => new Date().toLocaleDateString("es-GT", { day: "2-digit", month: "2-digit", year: "numeric" }),
    [],
  );

  function toggleAssign(course: Course) {
    setAssigned((rows) => {
      const existing = rows.find((r) => r.courseId === course.id);
      if (existing) {
        return rows.filter((r) => r.key !== existing.key);
      }
      return [
        ...rows,
        { key: nextId(), courseId: course.id, nombre: course.nombre, semTri: String(trimestre), seccion: student.seccion ?? "" },
      ];
    });
  }

  function removeAssigned(key: string) {
    setAssigned((rows) => rows.filter((r) => r.key !== key));
  }

  function updateAssignedMeta(key: string, field: "semTri" | "seccion", value: string) {
    setAssigned((rows) => rows.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  }

  function addAdditionalRow() {
    setAdditional((rows) => (rows.length >= 10 ? rows : [...rows, { id: nextId(), cursoAdicional: "", carrera: "", semTri: "", seccion: "", jornada: "" }]));
  }
  function removeAdditionalRow(id: string) {
    setAdditional((rows) => rows.filter((r) => r.id !== id));
  }
  function updateAdditionalField(id: string, field: keyof AdditionalEntry, value: string) {
    setAdditional((rows) => rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }

  const additionalCourseOptions = useMemo(
    () => allCourses.map((c) => ({ value: c.nombre, label: c.nombre, hint: c.carrera })),
    [allCourses],
  );

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const firma = signatureRef.current?.getSignature() ?? initialAssignment?.firmaBase64 ?? null;
      const saved = await saveAssignment({
        carnet: student.carnet,
        trimestre,
        cursosAsignados: assigned.map((r, i) => ({ numero: i + 1, curso: r.nombre, semTri: r.semTri, seccion: r.seccion })),
        cursosAdicionales: additional
          .filter((r) => r.cursoAdicional.trim().length > 0)
          .map((r, i) => ({
            numero: i + 1,
            cursoAdicional: r.cursoAdicional,
            carrera: r.carrera,
            semTri: r.semTri,
            seccion: r.seccion,
            jornada: r.jornada,
          })),
        tienePendientesTrimestres: pendientesTrimestres,
        tienePendientesMaterias: pendientesMaterias,
        correoContacto: correoContacto || null,
        telefonoContacto: telefonoContacto || null,
        comprobantePagoNo: comprobantePagoNo || null,
        tipoPago: tipoPago || null,
        firmaBase64: firma,
        autorizadoPorCodigo: autorizadoPorCodigo ?? null,
      });
      setSavedAt(new Date().toLocaleTimeString("es-GT"));
      onSaved?.(saved);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar la asignación.");
    } finally {
      setSaving(false);
    }
  }

  const offCatalogAssigned = assigned.filter((r) => r.courseId === null);

  return (
    <div className="space-y-6">
      <RevealOnScroll className="rounded-2xl bg-white p-6 shadow-card">
        <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-isel-navy">
          <span aria-hidden>📄</span> Datos del estudiante
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Carné">
            <input className={inputClass} value={student.carnet} disabled />
          </Field>
          <Field label="Fecha">
            <input className={inputClass} value={fechaHoy} disabled />
          </Field>
          <Field label="Sem/Trim">
            <input className={inputClass} value={trimestre} disabled />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Carrera">
            <input className={inputClass} value={student.carrera} disabled />
          </Field>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Primer apellido">
            <input className={inputClass} value={student.primerApellido} disabled />
          </Field>
          <Field label="Segundo apellido">
            <input className={inputClass} value={student.segundoApellido ?? ""} disabled />
          </Field>
          <Field label="Primer nombre">
            <input className={inputClass} value={student.primerNombre} disabled />
          </Field>
          <Field label="Segundo nombre">
            <input className={inputClass} value={student.segundoNombre ?? ""} disabled />
          </Field>
        </div>
      </RevealOnScroll>

      <RevealOnScroll delay={0.05} className="rounded-2xl bg-white p-6 shadow-card">
        <h3 className="mb-1 flex items-center gap-2 font-display text-lg font-semibold text-isel-navy">
          <span aria-hidden>💾</span> Cursos por asignarse
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
            {assigned.length} asignado{assigned.length === 1 ? "" : "s"}
          </span>
        </h3>
        <p className="mb-4 text-sm text-isel-ink/60">
          Elige de la lista los cursos que tienes actualmente asignados — puedes marcar varios.
        </p>

        {catalog === null ? (
          <p className="py-4 text-sm text-isel-ink/40">Cargando catálogo de cursos…</p>
        ) : catalog.length === 0 ? (
          <p className="rounded-lg bg-isel-paper px-4 py-3 text-sm text-isel-ink/60">
            Aún no hay cursos cargados para <strong>{student.carrera}</strong>. Pídele al administrador que los agregue en
            el panel de Cursos.
          </p>
        ) : (
          <ul className="divide-y divide-isel-line">
            {catalog.map((course) => {
              const entry = assigned.find((r) => r.courseId === course.id);
              return (
                <li key={course.id} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {entry && <span className="text-emerald-600" aria-hidden>✔</span>}
                      <span className={entry ? "font-semibold text-isel-navy" : "text-isel-ink"}>{course.nombre}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleAssign(course)}
                      className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors duration-200 ${
                        entry
                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                          : "bg-isel-navy text-white hover:bg-isel-gold hover:text-isel-navy"
                      }`}
                    >
                      {entry ? "✓ Asignado — Quitar" : "+ Asignar"}
                    </button>
                  </div>
                  {entry && (
                    <div className="mt-2 grid grid-cols-2 gap-3 rounded-lg bg-emerald-50 p-3 sm:w-80">
                      <Field label="Sem/Tri">
                        <input className={inputClass} value={entry.semTri} onChange={(e) => updateAssignedMeta(entry.key, "semTri", e.target.value)} />
                      </Field>
                      <Field label="Sección">
                        <input className={inputClass} value={entry.seccion} onChange={(e) => updateAssignedMeta(entry.key, "seccion", e.target.value)} />
                      </Field>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {offCatalogAssigned.length > 0 && (
          <div className="mt-4 rounded-lg border border-dashed border-isel-line p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-isel-ink/50">
              Otros cursos ya asignados (no están en el catálogo actual)
            </p>
            <ul className="space-y-2">
              {offCatalogAssigned.map((entry) => (
                <li key={entry.key} className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="font-semibold text-isel-ink">{entry.nombre}</span>
                  <input className={`${inputClass} w-20`} placeholder="Sem/Tri" value={entry.semTri} onChange={(e) => updateAssignedMeta(entry.key, "semTri", e.target.value)} />
                  <input className={`${inputClass} w-20`} placeholder="Sección" value={entry.seccion} onChange={(e) => updateAssignedMeta(entry.key, "seccion", e.target.value)} />
                  <button type="button" onClick={() => removeAssigned(entry.key)} className="text-xs font-semibold text-red-600 hover:underline">
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </RevealOnScroll>

      <RevealOnScroll delay={0.1} className="rounded-2xl bg-white p-6 shadow-card">
        <h3 className="mb-1 font-display text-lg font-semibold text-isel-navy">Cursos adicionales o cambio de sección</h3>
        <p className="mb-4 text-sm text-isel-ink/60">
          Busca y selecciona el curso o cursos que solicitas agregarte y/o cambiarte de sección.
        </p>

        <div className="space-y-4">
          {additional.map((row) => (
            <div key={row.id} className="rounded-lg bg-isel-paper p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div className="lg:col-span-2">
                  <Field label="Curso adicional">
                    <SearchSelect
                      options={additionalCourseOptions}
                      value={row.cursoAdicional}
                      onChange={(v) => updateAdditionalField(row.id, "cursoAdicional", v)}
                      placeholder="Buscar curso…"
                    />
                  </Field>
                </div>
                <Field label="Carrera">
                  <select className={inputClass} value={row.carrera} onChange={(e) => updateAdditionalField(row.id, "carrera", e.target.value)}>
                    <option value=""></option>
                    {carreras.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Sem/Tri">
                  <input className={inputClass} value={row.semTri} onChange={(e) => updateAdditionalField(row.id, "semTri", e.target.value)} />
                </Field>
                <Field label="Sección">
                  <input className={inputClass} value={row.seccion} onChange={(e) => updateAdditionalField(row.id, "seccion", e.target.value)} />
                </Field>
              </div>
              <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                <Field label="Jornada">
                  <select
                    className={`${inputClass} w-40`}
                    value={row.jornada}
                    onChange={(e) => updateAdditionalField(row.id, "jornada", e.target.value)}
                  >
                    <option value=""></option>
                    <option value="Matutina">Matutina</option>
                    <option value="Vespertina">Vespertina</option>
                    <option value="Nocturna">Nocturna</option>
                    <option value="Fin de semana">Fin de semana</option>
                  </select>
                </Field>
                {additional.length > 1 && (
                  <button type="button" onClick={() => removeAdditionalRow(row.id)} className="text-xs font-semibold text-red-600 hover:underline">
                    Quitar este campo
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addAdditionalRow}
          disabled={additional.length >= 10}
          className="mt-4 rounded-full border-2 border-isel-navy px-4 py-2 text-sm font-semibold text-isel-navy transition-colors duration-200 hover:bg-isel-navy hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          + Agregar otro
        </button>
      </RevealOnScroll>

      <RevealOnScroll delay={0.15} className="rounded-2xl bg-white p-6 shadow-card">
        <h3 className="mb-4 font-display text-lg font-semibold text-isel-navy">Observaciones y contacto</h3>
        <div className="space-y-3">
          <YesNoRow
            label="Trimestres o semestres completos anteriores pendientes de cursar"
            value={pendientesTrimestres}
            onChange={setPendientesTrimestres}
          />
          <YesNoRow
            label="Materias de trimestres o semestres anteriores pendientes de cursar"
            value={pendientesMaterias}
            onChange={setPendientesMaterias}
          />
          <TipoPagoRow value={tipoPago} onChange={setTipoPago} />
        </div>

        <div className="mt-6">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-isel-ink">
            <span aria-hidden>✍️</span> Firma digital
          </p>
          <SignaturePad ref={signatureRef} initialValue={initialAssignment?.firmaBase64} className="max-w-md" />
          <button
            type="button"
            onClick={() => signatureRef.current?.clear()}
            className="mt-2 rounded-full border-2 border-isel-line px-4 py-1.5 text-xs font-semibold text-isel-ink/70 transition-colors duration-200 hover:border-isel-navy hover:text-isel-navy"
          >
            🧹 Limpiar
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Correo electrónico">
            <input
              type="email"
              className={inputClass}
              placeholder="correo@dominio.com"
              value={correoContacto}
              onChange={(e) => setCorreoContacto(e.target.value)}
            />
          </Field>
          <Field label="Teléfono para contacto">
            <input
              className={inputClass}
              placeholder="8 dígitos"
              value={telefonoContacto}
              onChange={(e) => setTelefonoContacto(e.target.value)}
            />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Comprobante de pago No.">
            <input className={inputClass} value={comprobantePagoNo} onChange={(e) => setComprobantePagoNo(e.target.value)} />
          </Field>
        </div>
      </RevealOnScroll>

      <div className="flex flex-wrap items-center gap-4">
        <motion.button
          type="button"
          onClick={handleSave}
          disabled={saving}
          whileHover={{ y: -2, scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          transition={{ type: "spring", stiffness: 420, damping: 22 }}
          className="inline-flex items-center gap-2 rounded-full bg-isel-navy px-6 py-3 text-sm font-semibold text-white transition-colors duration-300 ease-snap hover:bg-isel-gold hover:text-isel-navy disabled:cursor-not-allowed disabled:opacity-60"
        >
          💾 {saving ? "Guardando…" : "Guardar asignación"}
        </motion.button>
        {savedAt && <span className="text-sm text-isel-navy/70">Guardado a las {savedAt} ✓</span>}
        {error && <span className="text-sm font-semibold text-red-600">{error}</span>}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-isel-ink/50">{label}</span>
      {children}
    </label>
  );
}

function YesNoRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-isel-paper px-4 py-3">
      <span className="text-sm text-isel-ink">{label}</span>
      <div className="flex overflow-hidden rounded-full border-2 border-isel-line">
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`px-4 py-1 text-xs font-bold transition-colors duration-200 ${!value ? "bg-isel-navy text-white" : "bg-white text-isel-ink/50"}`}
        >
          No
        </button>
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`px-4 py-1 text-xs font-bold transition-colors duration-200 ${value ? "bg-isel-gold text-isel-navy" : "bg-white text-isel-ink/50"}`}
        >
          Sí
        </button>
      </div>
    </div>
  );
}

function TipoPagoRow({ value, onChange }: { value: TipoPago | ""; onChange: (v: TipoPago) => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-isel-paper px-4 py-3">
      <span className="text-sm text-isel-ink">Tipo de pago</span>
      <div className="flex overflow-hidden rounded-full border-2 border-isel-line">
        <button
          type="button"
          onClick={() => onChange("Link")}
          className={`px-4 py-1 text-xs font-bold transition-colors duration-200 ${value === "Link" ? "bg-isel-navy text-white" : "bg-white text-isel-ink/50"}`}
        >
          Link de pago
        </button>
        <button
          type="button"
          onClick={() => onChange("Presencial")}
          className={`px-4 py-1 text-xs font-bold transition-colors duration-200 ${value === "Presencial" ? "bg-isel-gold text-isel-navy" : "bg-white text-isel-ink/50"}`}
        >
          Presencial
        </button>
      </div>
    </div>
  );
}
