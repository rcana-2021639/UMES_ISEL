import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import type { Student } from "@/types/student";
import type { CourseAssignment, TipoPago } from "@/types/courseAssignment";
import { getAssignmentByStudent, saveAssignment } from "@/lib/assignmentsApi";
import { getCourses, getTrimestres } from "@/lib/coursesApi";
import type { Course } from "@/types/course";
import { SignaturePad, type SignaturePadHandle } from "@/components/portal/SignaturePad";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { SearchSelect, type SearchSelectOption } from "@/components/ui/SearchSelect";
import { Modal } from "@/components/ui/Modal";

const inputClass =
  "w-full rounded-lg border border-isel-line bg-white px-3 py-2 text-sm text-isel-ink transition-colors duration-200 focus:border-isel-navy focus:outline-none focus:ring-2 focus:ring-isel-navy/15";

/** A "cursos adicionales" row — either a free pick from the whole catalog, or a specific repeated course, chosen
 *  by walking Maestría → Trimestre → Curso on its own (independent of the main "Cursos por asignarse" selection). */
interface AdditionalEntry {
  id: string;
  mode: "adicional" | "repetir";
  courseId: number | null;
  repetirCarrera: string | null;
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
  return {
    id: nextRowId(),
    mode: "adicional",
    courseId: null,
    repetirCarrera: null,
    repetirTrimestre: null,
    seccion: "",
    jornada: "",
  };
}

interface CourseAssignmentFormProps {
  student: Student;
  /** Present when an admin (not the student) is saving — recorded as an audit trail, not a real auth token. */
  autorizadoPorCodigo?: string | null;
  onSaved?: (assignment: CourseAssignment) => void;
  /** Called when the post-save summary modal's primary button is pressed. Passed by the admin panel
   *  (closes the "Ver ficha" modal, since there's no separate "menú principal" to send an admin back
   *  to); when omitted — the student flow — the button instead navigates to the site's home page. */
  onDismissSaved?: () => void;
}

export function CourseAssignmentForm({ student, autorizadoPorCodigo, onSaved, onDismissSaved }: CourseAssignmentFormProps) {
  const navigate = useNavigate();
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  // Nothing is pre-selected — a student only ever sees a maestría "chosen" here once they (or an
  // admin) actually confirm one via the picker, or if a ficha was already saved before (see the
  // "existing ficha" check below). Defaulting this to the student's roster carrera used to make it
  // look like an assignment already existed when nothing had actually been picked/saved yet.
  const [carrera, setCarrera] = useState<string | null>(null);
  const [trimestres, setTrimestres] = useState<number[] | null>(null);
  const [trimestre, setTrimestre] = useState<number | null>(null);
  const [mainCourses, setMainCourses] = useState<Course[] | null>(null);
  const [assignment, setAssignment] = useState<CourseAssignment | null>(null);
  const [loadingAssignment, setLoadingAssignment] = useState(false);
  // True only until we've checked whether this student already has ANY saved ficha.
  const [checkingExisting, setCheckingExisting] = useState(true);

  const [seccion, setSeccion] = useState(student.seccion ?? "");
  const [additional, setAdditional] = useState<AdditionalEntry[]>([blankAdditionalRow()]);
  const [pendientesTrimestres, setPendientesTrimestres] = useState(false);
  const [pendientesMaterias, setPendientesMaterias] = useState(false);
  const [tipoPago, setTipoPago] = useState<TipoPago | "">("");
  const [correoContacto, setCorreoContacto] = useState(student.correoPersonal ?? student.correoInstitucional ?? "");
  const [telefonoContacto, setTelefonoContacto] = useState(student.celular ?? "");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Shown once, right after a successful save — replaces the old "Guardado ✓" text next to the
  // button, which gave no clear sense of being "done" and led to the same ficha being submitted over
  // and over. The modal blocks the button underneath it, and its own primary action leaves the page.
  const [savedSummary, setSavedSummary] = useState<CourseAssignment | null>(null);
  const signatureRef = useRef<SignaturePadHandle>(null);

  // "Cursos por asignarse" picker — a numbered list of maestrías; tapping one opens a modal to pick
  // its trimestre + sección and preview the trimestre's courses before confirming with "Listo".
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draftCarrera, setDraftCarrera] = useState<string | null>(null);
  const [draftTrimestre, setDraftTrimestre] = useState<number | null>(null);
  const [draftTrimestres, setDraftTrimestres] = useState<number[] | null>(null);
  const [draftCourses, setDraftCourses] = useState<Course[] | null>(null);
  const [draftSeccion, setDraftSeccion] = useState("");

  // Reference catalog — loaded once.
  useEffect(() => {
    getCourses().then(setAllCourses);
  }, []);

  // Does this student already have ANY saved ficha? If so, open on it (so returning students see
  // what they already picked) — otherwise leave the picker with nothing selected.
  useEffect(() => {
    let active = true;
    setCheckingExisting(true);
    getAssignmentByStudent(student.carnet).then((ca) => {
      if (!active) return;
      if (ca) {
        setCarrera(ca.carrera);
        setTrimestre(ca.trimestre);
      }
      setCheckingExisting(false);
    });
    return () => {
      active = false;
    };
  }, [student.carnet]);

  // Trimestres available for the chosen carrera.
  useEffect(() => {
    if (carrera === null) {
      setTrimestres(null);
      return;
    }
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
    if (carrera === null || trimestre === null) {
      setMainCourses(null);
      setAssignment(null);
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
          repetirCarrera: null,
          repetirTrimestre: null,
          seccion: row.seccion ?? "",
          jornada: row.jornada ?? "",
          fallback: match ? undefined : { nombre: row.cursoAdicional, carrera: row.carrera ?? null, semTri: row.semTri ?? null },
        };
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignment, allCourses.length]);

  // Trimestres for whichever maestría is open in the picker modal (independent of the committed carrera).
  useEffect(() => {
    if (!pickerOpen || !draftCarrera) return;
    let active = true;
    setDraftTrimestres(null);
    getTrimestres(draftCarrera).then((list) => {
      if (!active) return;
      setDraftTrimestres(list);
      setDraftTrimestre((current) => (current && list.includes(current) ? current : (list[0] ?? null)));
    });
    return () => {
      active = false;
    };
  }, [pickerOpen, draftCarrera]);

  // Preview of the courses for whichever trimestre is currently picked in the modal.
  useEffect(() => {
    if (!pickerOpen || !draftCarrera || draftTrimestre === null) {
      setDraftCourses(null);
      return;
    }
    let active = true;
    getCourses(draftCarrera, draftTrimestre).then((list) => active && setDraftCourses(list));
    return () => {
      active = false;
    };
  }, [pickerOpen, draftCarrera, draftTrimestre]);

  function openPicker(c: string) {
    setDraftCarrera(c);
    setDraftTrimestre(c === carrera ? trimestre : null);
    setDraftSeccion(c === carrera ? seccion : (student.seccion ?? ""));
    setPickerOpen(true);
  }

  function confirmPicker() {
    if (!draftCarrera || draftTrimestre === null) return;
    setCarrera(draftCarrera);
    setTrimestre(draftTrimestre);
    setSeccion(draftSeccion);
    setPickerOpen(false);
  }

  const fechaHoy = useMemo(
    () => new Date().toLocaleDateString("es-GT", { day: "2-digit", month: "2-digit", year: "numeric" }),
    [],
  );

  // Only maestrías that actually have a pénsum loaded (i.e. exist in the course catalog) are
  // selectable here — e.g. a "Diplomado" or a cross-listed cohort group in the student roster has
  // no trimestre/course data and isn't a real ISEL maestría, so it has no business in this list.
  const pickableCarreras = useMemo(
    () =>
      Array.from(new Set(allCourses.filter((c) => c.carrera !== "Inglés").map((c) => c.carrera))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [allCourses],
  );

  const additionalCourseOptions: SearchSelectOption[] = useMemo(
    () =>
      allCourses
        .slice()
        .sort((a, b) => (a.carrera + a.trimestre).localeCompare(b.carrera + b.trimestre))
        .map((c) => ({ value: String(c.id), label: c.nombre, group: groupLabel(c) })),
    [allCourses],
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

  /**
   * A "Cursos adicionales" row is only required to be complete once the student has actually started
   * filling it in — an untouched blank row (the default one, or an unused extra one) is simply
   * skipped, same as always. Sección and Jornada are the one exception: some students genuinely have
   * neither, so those two never count toward "started" and are never required — but if a row has
   * anything else in it (a course chosen, or "Repetir trimestre" begun), the course itself IS
   * required, so an incomplete row never gets silently dropped without telling the student. Returns
   * the 1-indexed row number of the first incomplete row, or null if all rows are fine.
   */
  function findIncompleteAdditionalRow(): number | null {
    for (let i = 0; i < additional.length; i++) {
      const row = additional[i];
      if (row.fallback) continue; // already complete — came from a previously-saved ficha
      const started =
        row.courseId !== null || (row.mode === "repetir" && (row.repetirCarrera !== null || row.repetirTrimestre !== null));
      if (started && row.courseId === null) return i + 1;
    }
    return null;
  }

  async function handleSave() {
    if (carrera === null || trimestre === null) {
      setError("Selecciona una maestría y un trimestre antes de guardar.");
      return;
    }
    const incompleteRow = findIncompleteAdditionalRow();
    if (incompleteRow !== null) {
      setError(
        `Falta elegir el curso en la fila ${incompleteRow} de "Cursos adicionales" — sección y jornada son opcionales, pero el curso no. Complétalo, o bórralo con "Quitar este campo".`,
      );
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
      setSavedSummary(saved);
      onSaved?.(saved);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar la asignación.");
    } finally {
      setSaving(false);
    }
  }

  function handleDismissSaved() {
    setSavedSummary(null);
    if (onDismissSaved) {
      onDismissSaved();
    } else {
      navigate("/");
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
          Toca tu maestría en la lista para elegir el trimestre y la sección — los cursos de ese trimestre se asignan
          todos juntos.
        </p>

        <div className="overflow-hidden rounded-xl border border-isel-line">
          {pickableCarreras.map((c, i) => {
            const isSelected = c === carrera;
            return (
              <button
                key={c}
                type="button"
                onClick={() => openPicker(c)}
                className={`flex w-full items-center gap-3 border-b border-isel-line px-4 py-3 text-left transition-colors duration-200 last:border-b-0 ${
                  isSelected ? "bg-emerald-50 hover:bg-emerald-100" : "bg-white hover:bg-isel-paper"
                }`}
              >
                <span
                  className={`flex h-7 w-7 flex-none items-center justify-center rounded-full text-xs font-bold transition-colors duration-200 ${
                    isSelected ? "bg-emerald-500 text-white" : "bg-isel-paper text-isel-ink/50"
                  }`}
                  aria-hidden
                >
                  {isSelected ? "✔" : i + 1}
                </span>
                <span className={`flex-1 text-sm ${isSelected ? "font-semibold text-emerald-800" : "text-isel-ink"}`}>{c}</span>
                {isSelected ? (
                  <span className="flex-none rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-bold text-white">
                    Trimestre {trimestre} ✓
                  </span>
                ) : (
                  <span className="flex-none text-xs text-isel-ink/30">Elegir →</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-4">
          {checkingExisting ? (
            <p className="py-4 text-sm text-isel-ink/40">Cargando…</p>
          ) : carrera === null ? (
            <p className="rounded-lg bg-isel-paper px-4 py-3 text-sm text-isel-ink/60">
              Aún no has elegido ninguna maestría — toca una de la lista de arriba para empezar.
            </p>
          ) : loadingAssignment ? (
            <p className="py-4 text-sm text-isel-ink/40">Cargando…</p>
          ) : trimestres && trimestres.length === 0 ? (
            <p className="rounded-lg bg-isel-paper px-4 py-3 text-sm text-isel-ink/60">
              Aún no hay pénsum cargado para <strong>{carrera}</strong>.
            </p>
          ) : (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-emerald-800">
                  {carrera} — Trimestre {trimestre} — Sección {seccion || "(sin definir)"}
                </p>
                <button type="button" onClick={() => openPicker(carrera)} className="text-xs font-semibold text-isel-navy hover:underline">
                  Editar
                </button>
              </div>
              {(mainCourses ?? []).length === 0 ? (
                <p className="text-sm text-isel-ink/60">No hay cursos definidos para el trimestre {trimestre}.</p>
              ) : (
                <ul className="divide-y divide-emerald-100 rounded-lg border border-emerald-100 bg-white">
                  {(mainCourses ?? []).map((c) => (
                    <li key={c.id} className="flex items-center gap-2 px-4 py-2.5 text-sm">
                      <span className="text-emerald-600" aria-hidden>
                        ✔
                      </span>
                      <span className="text-isel-ink">{c.nombre}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </RevealOnScroll>

      <Modal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title={draftCarrera ?? "Selecciona maestría"}
        widthClassName="max-w-xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Trimestre">
              <select
                className={inputClass}
                value={draftTrimestre ?? ""}
                onChange={(e) => setDraftTrimestre(e.target.value ? Number(e.target.value) : null)}
                disabled={!draftTrimestres || draftTrimestres.length === 0}
              >
                {(draftTrimestres ?? []).map((t) => (
                  <option key={t} value={t}>
                    Trimestre {t}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Sección (opcional)">
              <input
                className={inputClass}
                value={draftSeccion}
                onChange={(e) => setDraftSeccion(e.target.value)}
                placeholder="Ej. A"
              />
            </Field>
          </div>

          <div>
            {draftTrimestres && draftTrimestres.length === 0 ? (
              <p className="rounded-lg bg-isel-paper px-4 py-3 text-sm text-isel-ink/60">
                Aún no hay pénsum cargado para esta maestría.
              </p>
            ) : (
              <>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-isel-ink/50">
                  Cursos del trimestre {draftTrimestre} (se asignan todos)
                </p>
                {draftCourses === null ? (
                  <p className="py-3 text-sm text-isel-ink/40">Cargando…</p>
                ) : draftCourses.length === 0 ? (
                  <p className="rounded-lg bg-isel-paper px-4 py-3 text-sm text-isel-ink/60">
                    No hay cursos definidos para este trimestre.
                  </p>
                ) : (
                  <ul className="divide-y divide-isel-line rounded-lg border border-isel-line">
                    {draftCourses.map((c) => (
                      <li key={c.id} className="flex items-center gap-2 px-4 py-2.5 text-sm">
                        <span className="text-emerald-600" aria-hidden>
                          ✔
                        </span>
                        <span className="text-isel-ink">{c.nombre}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setPickerOpen(false)}
              className="rounded-full border-2 border-isel-line px-4 py-2 text-sm font-semibold text-isel-ink/70 transition-colors duration-200 hover:border-isel-navy hover:text-isel-navy"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmPicker}
              disabled={draftTrimestre === null}
              className="rounded-full bg-isel-navy px-5 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-isel-gold hover:text-isel-navy disabled:cursor-not-allowed disabled:opacity-40"
            >
              ✔ Listo
            </button>
          </div>
        </div>
      </Modal>

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
              mainCarrera={carrera}
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
        {error && <span className="text-sm font-semibold text-red-600">{error}</span>}
      </div>

      <Modal open={savedSummary !== null} onClose={handleDismissSaved} title="✔ Ficha guardada" widthClassName="max-w-md">
        {savedSummary && (
          <div className="space-y-4">
            <p className="text-sm text-isel-ink">
              La ficha de asignación de cursos de <strong>{savedSummary.nombreCompleto}</strong> se envió exitosamente. Resumen
              de lo que se guardó:
            </p>
            <ul className="space-y-1.5 rounded-lg bg-isel-paper p-4 text-sm text-isel-ink">
              <li>
                <strong>Carrera:</strong> {savedSummary.carrera}
              </li>
              <li>
                <strong>Trimestre:</strong> {savedSummary.trimestre}
              </li>
              <li>
                <strong>Sección:</strong> {savedSummary.seccion || "No especificada"}
              </li>
              <li>
                <strong>Cursos asignados:</strong> {savedSummary.cursosAsignados.length}
              </li>
              <li>
                <strong>Cursos adicionales:</strong> {savedSummary.cursosAdicionales.length}
              </li>
              <li>
                <strong>Firma:</strong> {savedSummary.firmaBase64 ? "Registrada ✔" : "No registrada"}
              </li>
            </ul>
            <p className="text-xs text-isel-ink/50">
              Ya no es necesario volver a guardar — si necesitas corregir algo, edita el formulario y guarda de nuevo.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSavedSummary(null)}
                className="rounded-full border-2 border-isel-line px-4 py-2 text-sm font-semibold text-isel-ink/70 transition-colors duration-200 hover:border-isel-navy hover:text-isel-navy"
              >
                Seguir editando
              </button>
              <button
                type="button"
                onClick={handleDismissSaved}
                className="rounded-full bg-isel-navy px-5 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-isel-gold hover:text-isel-navy"
              >
                {onDismissSaved ? "Cerrar" : "Volver al menú principal"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function AdditionalRow({
  row,
  options,
  allCourses,
  mainCarrera,
  canRemove,
  onChange,
  onRemove,
}: {
  row: AdditionalEntry;
  options: SearchSelectOption[];
  allCourses: Course[];
  mainCarrera: string | null;
  canRemove: boolean;
  onChange: (patch: Partial<AdditionalEntry>) => void;
  onRemove: () => void;
}) {
  const catalogCarreras = useMemo(
    () => Array.from(new Set(allCourses.map((c) => c.carrera))).sort((a, b) => a.localeCompare(b)),
    [allCourses],
  );
  const repetirTrimestres = useMemo(
    () =>
      Array.from(new Set(allCourses.filter((c) => c.carrera === row.repetirCarrera).map((c) => c.trimestre))).sort(
        (a, b) => a - b,
      ),
    [allCourses, row.repetirCarrera],
  );
  const repetirCourseOptions = useMemo(
    () => allCourses.filter((c) => c.carrera === row.repetirCarrera && c.trimestre === row.repetirTrimestre),
    [allCourses, row.repetirCarrera, row.repetirTrimestre],
  );
  const repetirCourseChoice = row.courseId !== null ? repetirCourseOptions.find((c) => c.id === row.courseId) : undefined;

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
          <input className={`${inputClass} bg-white`} placeholder="Sección (opcional)" value={row.seccion} onChange={(e) => onChange({ seccion: e.target.value })} />
          <input className={`${inputClass} bg-white`} placeholder="Jornada (opcional)" value={row.jornada} onChange={(e) => onChange({ jornada: e.target.value })} />
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
            onClick={() => onChange({ mode: "adicional", courseId: null, repetirCarrera: null, repetirTrimestre: null })}
            className={`px-3 py-1 text-xs font-bold transition-colors duration-200 ${row.mode === "adicional" ? "bg-isel-navy text-white" : "bg-white text-isel-ink/50"}`}
          >
            Curso adicional
          </button>
          <button
            type="button"
            onClick={() => onChange({ mode: "repetir", courseId: null, repetirCarrera: mainCarrera, repetirTrimestre: null })}
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
      ) : (
        <div>
          <p className="mb-3 text-xs text-isel-ink/50">
            Elige la maestría, luego el trimestre que necesitas repetir, y por último el curso específico.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Maestría">
              <select
                className={inputClass}
                value={row.repetirCarrera ?? ""}
                onChange={(e) =>
                  onChange({ repetirCarrera: e.target.value || null, repetirTrimestre: null, courseId: null })
                }
              >
                <option value="">Selecciona…</option>
                {catalogCarreras.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Trimestre a repetir">
              <select
                className={inputClass}
                value={row.repetirTrimestre ?? ""}
                onChange={(e) => onChange({ repetirTrimestre: e.target.value ? Number(e.target.value) : null, courseId: null })}
                disabled={row.repetirCarrera === null}
              >
                <option value="">Selecciona…</option>
                {repetirTrimestres.map((t) => (
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
          {repetirCourseChoice && (
            <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
              <span aria-hidden>✔</span> Vas a repetir: {repetirCourseChoice.nombre}
              <span className="font-normal text-isel-ink/50">
                ({repetirCourseChoice.carrera} · Trimestre {repetirCourseChoice.trimestre})
              </span>
            </p>
          )}
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-3">
        <input className={`${inputClass} bg-white`} placeholder="Sección (opcional)" value={row.seccion} onChange={(e) => onChange({ seccion: e.target.value })} />
        <input className={`${inputClass} bg-white`} placeholder="Jornada (opcional)" value={row.jornada} onChange={(e) => onChange({ jornada: e.target.value })} />
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
