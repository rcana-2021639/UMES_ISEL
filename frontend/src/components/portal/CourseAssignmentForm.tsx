import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { Student } from "@/types/student";
import type { CourseAssignment, TipoPago } from "@/types/courseAssignment";
import { getAssignmentByStudent, saveAssignment } from "@/lib/assignmentsApi";
import { getCourses, getTrimestres } from "@/lib/coursesApi";
import { getCarreras } from "@/lib/studentsApi";
import type { Course } from "@/types/course";
import { SignaturePad, type SignaturePadHandle } from "@/components/portal/SignaturePad";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { SearchSelect, type SearchSelectOption } from "@/components/ui/SearchSelect";

const inputClass =
  "w-full rounded-lg border border-isel-line bg-white px-3 py-2 text-sm text-isel-ink transition-colors duration-200 focus:border-isel-navy focus:outline-none focus:ring-2 focus:ring-isel-navy/15";

/** A "cursos adicionales" row — either a free pick from the whole catalog, or a specific repeated course from an earlier trimestre of the same carrera. */
interface AdditionalEntry {
  id: string;
  mode: "adicional" | "repetir";
  courseId: number | null;
  repetirTrimestre: number | null;
  seccion: string;
  jornada: string;
  // Preserves a previously-saved row that no longer matches anything in the catalog, so nothing silently disappears.
  fallback?: { nombre: string; carrera: string | null; semTri: string | null };
}

let rowIdSeq = 0;
function nextRowId() {
  rowIdSeq += 1;
  return `row-${rowIdSeq}`;
}

function groupLabel(c: Course): string {
  return c.carrera === "Inglés" ? "Inglés" : `${c.carrera} · Trimestre ${c.trimestre}`;
}

function blankAdditionalRow(): AdditionalEntry {
  return { id: nextRowId(), mode: "adicional", courseId: null, repetirTrimestre: null, seccion: "", jornada: "" };
}

interface CourseAssignmentFormProps {
  student: Student;
  /** Present when an admin (not the student) is saving — recorded as an audit trail, not a real auth token. */
  autorizadoPorCodigo?: string | null;
  onSaved?: (assignment: CourseAssignment) => void;
}

export function CourseAssignmentForm({ student, autorizadoPorCodigo, onSaved }: CourseAssignmentFormProps) {
  const [carreras, setCarreras] = useState<string[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [carrera, setCarrera] = useState(student.carrera);
  const [trimestres, setTrimestres] = useState<number[] | null>(null);
  const [trimestre, setTrimestre] = useState<number | null>(student.trimestre ?? null);
  const [mainCourses, setMainCourses] = useState<Course[] | null>(null);
  const [assignment, setAssignment] = useState<CourseAssignment | null>(null);
  const [loadingAssignment, setLoadingAssignment] = useState(true);

  const [seccion, setSeccion] = useState(student.seccion ?? "");
  const [additional, setAdditional] = useState<AdditionalEntry[]>([blankAdditionalRow()]);
  const [pendientesTrimestres, setPendientesTrimestres] = useState(false);
  const [pendientesMaterias, setPendientesMaterias] = useState(false);
  const [tipoPago, setTipoPago] = useState<TipoPago | "">("");
  const [correoContacto, setCorreoContacto] = useState(student.correoPersonal ?? student.correoInstitucional ?? "");
  const [telefonoContacto, setTelefonoContacto] = useState(student.celular ?? "");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const signatureRef = useRef<SignaturePadHandle>(null);

  // Reference catalogs — loaded once.
  useEffect(() => {
    getCarreras().then(setCarreras);
    getCourses().then(setAllCourses);
  }, []);

  // Trimestres available for the chosen carrera.
  useEffect(() => {
    let active = true;
    setTrimestres(null);
    getTrimestres(carrera).then((list) => {
      if (!active) return;
      setTrimestres(list);
      setTrimestre((current) => (current && list.includes(current) ? current : (list[0] ?? null)));
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carrera]);

  // Courses auto-included for carrera+trimestre, and the ficha already saved for that exact combo (if any).
  useEffect(() => {
    if (trimestre === null) {
      setMainCourses(null);
      return;
    }
    let active = true;
    setLoadingAssignment(true);
    getCourses(carrera, trimestre).then((list) => active && setMainCourses(list));
    getAssignmentByStudent(student.carnet, trimestre).then((ca) => {
      if (!active) return;
      const matching = ca && ca.carrera === carrera ? ca : null;
      setAssignment(matching);
      setLoadingAssignment(false);
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carrera, trimestre, student.carnet]);

  // Re-hydrate the rest of the form whenever the loaded ficha (for this carrera+trimestre) changes.
  useEffect(() => {
    setSeccion(assignment?.seccion ?? student.seccion ?? "");
    setPendientesTrimestres(assignment?.tienePendientesTrimestres ?? false);
    setPendientesMaterias(assignment?.tienePendientesMaterias ?? false);
    setTipoPago(assignment?.tipoPago ?? "");
    setCorreoContacto(assignment?.correoContacto ?? student.correoPersonal ?? student.correoInstitucional ?? "");
    setTelefonoContacto(assignment?.telefonoContacto ?? student.celular ?? "");

    if (!assignment || assignment.cursosAdicionales.length === 0) {
      setAdditional([blankAdditionalRow()]);
      return;
    }
    setAdditional(
      assignment.cursosAdicionales.map((row) => {
        const match = allCourses.find(
          (c) => c.nombre === row.cursoAdicional && c.carrera === row.carrera && String(c.trimestre) === row.semTri,
        );
        return {
          id: nextRowId(),
          mode: "adicional",
          courseId: match?.id ?? null,
          repetirTrimestre: null,
          seccion: row.seccion ?? "",
          jornada: row.jornada ?? "",
          fallback: match ? undefined : { nombre: row.cursoAdicional, carrera: row.carrera ?? null, semTri: row.semTri ?? null },
        };
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignment, allCourses.length]);

  const fechaHoy = useMemo(
    () => new Date().toLocaleDateString("es-GT", { day: "2-digit", month: "2-digit", year: "numeric" }),
    [],
  );

  const additionalCourseOptions: SearchSelectOption[] = useMemo(
    () =>
      allCourses
        .slice()
        .sort((a, b) => (a.carrera + a.trimestre).localeCompare(b.carrera + b.trimestre))
        .map((c) => ({ value: String(c.id), label: c.nombre, group: groupLabel(c) })),
    [allCourses],
  );

  const earlierTrimestres = useMemo(
    () => (trimestre === null ? [] : (trimestres ?? []).filter((t) => t < trimestre)),
    [trimestres, trimestre],
  );

  function updateAdditional(id: string, patch: Partial<AdditionalEntry>) {
    setAdditional((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function addAdditionalRow() {
    setAdditional((rows) => (rows.length >= 10 ? rows : [...rows, blankAdditionalRow()]));
  }
  function removeAdditionalRow(id: string) {
    setAdditional((rows) => rows.filter((r) => r.id !== id));
  }

  async function handleSave() {
    if (trimestre === null) {
      setError("Selecciona una maestría con pénsum cargado y un trimestre.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const firma = signatureRef.current?.getSignature() ?? assignment?.firmaBase64 ?? null;

      const cursosAsignados = (mainCourses ?? []).map((c, i) => ({
        numero: i + 1,
        curso: c.nombre,
        semTri: String(trimestre),
        seccion,
      }));

      const cursosAdicionales = additional
        .map((row, i) => {
          if (row.fallback) {
            return { numero: i + 1, cursoAdicional: row.fallback.nombre, carrera: row.fallback.carrera, semTri: row.fallback.semTri, seccion: row.seccion, jornada: row.jornada };
          }
          const course = allCourses.find((c) => c.id === row.courseId);
          if (!course) return null;
          return { numero: i + 1, cursoAdicional: course.nombre, carrera: course.carrera, semTri: String(course.trimestre), seccion: row.seccion, jornada: row.jornada };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);

      const saved = await saveAssignment({
        carnet: student.carnet,
        carrera,
        trimestre,
        seccion: seccion || null,
        cursosAsignados,
        cursosAdicionales,
        tienePendientesTrimestres: pendientesTrimestres,
        tienePendientesMaterias: pendientesMaterias,
        correoContacto: correoContacto || null,
        telefonoContacto: telefonoContacto || null,
        tipoPago: tipoPago || null,
        firmaBase64: firma,
        autorizadoPorCodigo: autorizadoPorCodigo ?? null,
      });
      setAssignment(saved);
      setSavedAt(new Date().toLocaleTimeString("es-GT"));
      onSaved?.(saved);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar la asignación.");
    } finally {
      setSaving(false);
    }
  }

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
          <Field label="Primer apellido">
            <input className={inputClass} value={student.primerApellido} disabled />
          </Field>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        </h3>
        <p className="mb-4 text-sm text-isel-ink/60">
          Elige tu maestría y el trimestre — los cursos de ese trimestre se asignan todos juntos.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Maestría">
            <select className={inputClass} value={carrera} onChange={(e) => setCarrera(e.target.value)}>
              {carreras.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Trimestre">
            <select
              className={inputClass}
              value={trimestre ?? ""}
              onChange={(e) => setTrimestre(e.target.value ? Number(e.target.value) : null)}
              disabled={!trimestres || trimestres.length === 0}
            >
              {(trimestres ?? []).map((t) => (
                <option key={t} value={t}>
                  Trimestre {t}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Sección">
            <input className={inputClass} value={seccion} onChange={(e) => setSeccion(e.target.value)} placeholder="Ej. A" />
          </Field>
        </div>

        <div className="mt-4">
          {loadingAssignment ? (
            <p className="py-4 text-sm text-isel-ink/40">Cargando…</p>
          ) : trimestres && trimestres.length === 0 ? (
            <p className="rounded-lg bg-isel-paper px-4 py-3 text-sm text-isel-ink/60">
              Aún no hay pénsum cargado para <strong>{carrera}</strong>.
            </p>
          ) : (mainCourses ?? []).length === 0 ? (
            <p className="rounded-lg bg-isel-paper px-4 py-3 text-sm text-isel-ink/60">
              No hay cursos definidos para el trimestre {trimestre}.
            </p>
          ) : (
            <>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-isel-ink/50">
                Cursos del trimestre {trimestre} (se asignan todos)
              </p>
              <ul className="divide-y divide-isel-line rounded-lg border border-isel-line">
                {(mainCourses ?? []).map((c) => (
                  <li key={c.id} className="flex items-center gap-2 px-4 py-2.5 text-sm">
                    <span className="text-emerald-600" aria-hidden>
                      ✔
                    </span>
                    <span className="text-isel-ink">{c.nombre}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </RevealOnScroll>

      <RevealOnScroll delay={0.1} className="rounded-2xl bg-white p-6 shadow-card">
        <h3 className="mb-1 font-display text-lg font-semibold text-isel-navy">Cursos adicionales o cambio de sección</h3>
        <p className="mb-4 text-sm text-isel-ink/60">
          Agrega un curso extra de cualquier carrera, o marca "Repetir trimestre" si necesitas retomar un curso específico
          de un trimestre anterior tuyo.
        </p>

        <div className="space-y-4">
          {additional.map((row) => (
            <AdditionalRow
              key={row.id}
              row={row}
              options={additionalCourseOptions}
              allCourses={allCourses}
              carrera={carrera}
              earlierTrimestres={earlierTrimestres}
              canRemove={additional.length > 1}
              onChange={(patch) => updateAdditional(row.id, patch)}
              onRemove={() => removeAdditionalRow(row.id)}
            />
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
          <SignaturePad ref={signatureRef} initialValue={assignment?.firmaBase64} className="max-w-md" key={assignment?.id ?? "blank"} />
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

function AdditionalRow({
  row,
  options,
  allCourses,
  carrera,
  earlierTrimestres,
  canRemove,
  onChange,
  onRemove,
}: {
  row: AdditionalEntry;
  options: SearchSelectOption[];
  allCourses: Course[];
  carrera: string;
  earlierTrimestres: number[];
  canRemove: boolean;
  onChange: (patch: Partial<AdditionalEntry>) => void;
  onRemove: () => void;
}) {
  const repetirCourseOptions = useMemo(
    () => allCourses.filter((c) => c.carrera === carrera && c.trimestre === row.repetirTrimestre),
    [allCourses, carrera, row.repetirTrimestre],
  );

  if (row.fallback) {
    return (
      <div className="rounded-lg bg-isel-paper p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-isel-ink">{row.fallback.nombre}</p>
            <p className="text-xs text-isel-ink/50">
              {row.fallback.carrera} — ya no está en el catálogo actual, pero se conserva
            </p>
          </div>
          <button type="button" onClick={onRemove} className="text-xs font-semibold text-red-600 hover:underline">
            Quitar
          </button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <input className={`${inputClass} bg-white`} placeholder="Sección" value={row.seccion} onChange={(e) => onChange({ seccion: e.target.value })} />
          <input className={`${inputClass} bg-white`} placeholder="Jornada" value={row.jornada} onChange={(e) => onChange({ jornada: e.target.value })} />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-isel-paper p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex overflow-hidden rounded-full border-2 border-isel-line">
          <button
            type="button"
            onClick={() => onChange({ mode: "adicional", courseId: null, repetirTrimestre: null })}
            className={`px-3 py-1 text-xs font-bold transition-colors duration-200 ${row.mode === "adicional" ? "bg-isel-navy text-white" : "bg-white text-isel-ink/50"}`}
          >
            Curso adicional
          </button>
          <button
            type="button"
            onClick={() => onChange({ mode: "repetir", courseId: null, repetirTrimestre: null })}
            className={`px-3 py-1 text-xs font-bold transition-colors duration-200 ${row.mode === "repetir" ? "bg-isel-gold text-isel-navy" : "bg-white text-isel-ink/50"}`}
          >
            Repetir trimestre
          </button>
        </div>
        {canRemove && (
          <button type="button" onClick={onRemove} className="text-xs font-semibold text-red-600 hover:underline">
            Quitar este campo
          </button>
        )}
      </div>

      {row.mode === "adicional" ? (
        <Field label="Curso adicional (busca en todas las carreras)">
          <SearchSelect
            options={options}
            value={row.courseId !== null ? String(row.courseId) : ""}
            onChange={(v) => onChange({ courseId: Number(v) })}
            placeholder="Buscar curso…"
          />
        </Field>
      ) : earlierTrimestres.length === 0 ? (
        <p className="text-sm text-isel-ink/50">
          Selecciona primero, arriba, tu trimestre principal — "repetir trimestre" solo aplica a trimestres anteriores a
          ese.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Trimestre a repetir">
            <select
              className={inputClass}
              value={row.repetirTrimestre ?? ""}
              onChange={(e) => onChange({ repetirTrimestre: e.target.value ? Number(e.target.value) : null, courseId: null })}
            >
              <option value="">Selecciona…</option>
              {earlierTrimestres.map((t) => (
                <option key={t} value={t}>
                  Trimestre {t}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Curso a repetir">
            <select
              className={inputClass}
              value={row.courseId ?? ""}
              onChange={(e) => onChange({ courseId: e.target.value ? Number(e.target.value) : null })}
              disabled={row.repetirTrimestre === null}
            >
              <option value="">Selecciona…</option>
              {repetirCourseOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </Field>
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-3">
        <input className={`${inputClass} bg-white`} placeholder="Sección" value={row.seccion} onChange={(e) => onChange({ seccion: e.target.value })} />
        <input className={`${inputClass} bg-white`} placeholder="Jornada" value={row.jornada} onChange={(e) => onChange({ jornada: e.target.value })} />
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
