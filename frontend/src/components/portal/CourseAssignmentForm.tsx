import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Student } from "@/types/student";
import type { CourseAssignment, TipoPago } from "@/types/courseAssignment";
import { getAssignmentByStudent, saveAssignment } from "@/lib/assignmentsApi";
import { getCarreras, getCourses, getTrimestres } from "@/lib/coursesApi";
import type { Course } from "@/types/course";
import { SignaturePad, type SignaturePadHandle } from "@/components/portal/SignaturePad";
import { Modal } from "@/components/ui/Modal";
import { CoursePickerModal } from "@/components/portal/CoursePickerModal";
import { Icon } from "@/components/portal/Icon";
import { PortalPanel } from "@/components/portal/PortalShell";
import { StepGuide } from "@/components/portal/StepGuide";
import { Alert, Chip, EmptyState, Field, Loading, PortalButton, Segmented, fieldClass } from "@/components/portal/kit";

/**
 * Ficha de asignación de cursos.
 *
 * Esta pasada es de diseño: no cambia un solo estado, efecto ni llamada a la
 * API —el flujo es el que ya funcionaba— pero sí cómo se lee.
 *
 * Lo que se corrigió:
 *  · Los emoji de encabezado (📄 💾 ✍️) por trazos que sí toman el color de
 *    la marca y se alinean con el texto.
 *  · Los verdes/rojos/morados sueltos de la rampa de Tailwind por los tokens
 *    de ISEL: el portal parecía otro producto que el sitio público.
 *  · Los "Datos del estudiante" eran seis inputs deshabilitados —controles que
 *    invitan a escribir y no dejan—; ahora son lo que siempre fueron: datos.
 *  · Cinco rectángulos blancos idénticos, sin decir cuál es el primer paso, por
 *    paneles numerados que se anuncian y explican qué hacer.
 *  · El guardado, que vivía en un botón suelto al fondo del scroll, ahora va en
 *    una barra fija que además resume lo que estás por enviar.
 */

/** A "cursos adicionales" row — either a free pick from the whole catalog, or a specific repeated course, chosen
 *  by walking Maestría → Trimestre → Curso on its own (independent of the main "Cursos por asignarse" selection).
 *  Exportada (junto con AdditionalRow/ChoiceRow más abajo) para que el wizard de Inscripción la reutilice tal
 *  cual en su propia ficha de asignación — mismo control, sin copiarlo. */
export interface AdditionalEntry {
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
export function nextRowId() {
  rowIdSeq += 1;
  return `row-${rowIdSeq}`;
}

export function blankAdditionalRow(): AdditionalEntry {
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
  /**
   * Solo lectura. El panel abre la ficha así: consultarla es lo habitual y
   * editar la de otra persona tiene que ser una decisión, no el estado por
   * defecto con el botón de guardar esperando al final del scroll.
   */
  readOnly?: boolean;
}

export function CourseAssignmentForm({
  student,
  autorizadoPorCodigo,
  onSaved,
  onDismissSaved,
  readOnly = false,
}: CourseAssignmentFormProps) {
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

  // La sección NO se precarga del padrón: cambia de un trimestre a otro y
  // muchos estudiantes no la tienen asignada todavía. Se muestra vacía para
  // que la escriba quien sí la sepa. Solo se recupera si ya venía en una ficha
  // guardada (ver la rehidratación de abajo).
  const [seccion, setSeccion] = useState("");
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
    setSeccion(assignment?.seccion ?? "");
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
    setDraftSeccion(c === carrera ? seccion : "");
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

  // Las carreras en las que un alumno puede estar inscrito, en el orden que fijó el admin en la
  // pestaña "Pénsum". Sale del registro de carreras y no de deducirla del catálogo: así los grupos
  // de cursos sueltos (Inglés) quedan fuera por su propia marca, y una carrera archivada desaparece
  // de aquí sola. Si algo falla al cargarla, se cae al catálogo para no dejar la lista vacía.
  const [pickableCarreras, setPickableCarreras] = useState<string[]>([]);
  useEffect(() => {
    let active = true;
    getCarreras()
      .then((list) => active && setPickableCarreras(list))
      .catch(() => {
        if (!active) return;
        setPickableCarreras(Array.from(new Set(allCourses.map((c) => c.carrera))));
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allCourses.length]);

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

  const cursosCount = (mainCourses ?? []).length;
  const adicionalesCount = additional.filter((r) => r.fallback || r.courseId !== null).length;

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------- 01 · datos */}
      <PortalPanel
        id="paso-datos"
        step="01"
        accent="#12855C"
        title="Sus datos"
        description="Provienen de los registros de la Universidad. Si algún dato no coincide, comuníquelo a Coordinación antes de enviar la ficha."
      >
        <StepGuide
          title="Qué debe verificar en esta sección"
          steps={[
            "Revise su nombre y su número de carné y verifique que estén correctamente escritos.",
            "Esta sección no requiere que usted escriba: los datos provienen de los registros de la Universidad.",
            "Si algún dato es incorrecto, comuníquelo a Coordinación antes de continuar; su corrección posterior requiere más tiempo.",
          ]}
          outcome="Si la información es correcta, continúe con el paso 02."
        />

        <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-6">
          <DataItem label="Carné" value={student.carnet} mono />
          <DataItem label="Fecha" value={fechaHoy} mono />
          <DataItem label="Primer apellido" value={student.primerApellido} />
          <DataItem label="Segundo apellido" value={student.segundoApellido} />
          <DataItem label="Primer nombre" value={student.primerNombre} />
          <DataItem label="Segundo nombre" value={student.segundoNombre} />
        </dl>
      </PortalPanel>

      {/* ------------------------------------------------ 02 · cursos */}
      <PortalPanel
        id="paso-cursos"
        step="02"
        accent="#B8791F"
        title="Cursos por asignarse"
        description="Seleccione su maestría para elegir el trimestre y la sección. Los cursos de ese trimestre se asignan de forma conjunta."
      >
        <StepGuide
          steps={[
            "Seleccione el renglón correspondiente a su maestría en el listado siguiente.",
            "Se mostrará una ventana en la que debe elegir el trimestre que cursará y la sección.",
            "No es necesario marcar los cursos de forma individual: al elegir el trimestre se agregan todos los que le corresponden.",
            "Presione aceptar y los cursos quedarán listados en esta sección.",
          ]}
          outcome="Si necesita corregir la selección, elija nuevamente la maestría y otro trimestre; la información anterior se reemplaza."
        />

        <div className="divide-y divide-isel-line overflow-hidden rounded-xl border border-isel-line">
          {pickableCarreras.map((c, i) => {
            const isSelected = c === carrera;
            return (
              <button
                key={c}
                type="button"
                onClick={() => openPicker(c)}
                aria-pressed={isSelected}
                disabled={readOnly}
                className={`group/row relative flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors duration-300 ease-crisp disabled:cursor-default ${
                  isSelected ? "bg-isel-emerald/[0.07]" : "bg-white hover:enabled:bg-isel-paper/70"
                } ${readOnly && !isSelected ? "opacity-45" : ""}`}
              >
                {/* Filo que crece al seleccionar: dice cuál es la elegida sin
                    repintar toda la fila de verde. */}
                <span
                  aria-hidden
                  className={`absolute inset-y-0 left-0 w-[3px] origin-top bg-isel-emerald transition-transform duration-500 ease-snap ${
                    isSelected ? "scale-y-100" : "scale-y-0"
                  }`}
                />
                <span
                  aria-hidden
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[12px] font-bold transition-colors duration-300 ease-crisp ${
                    isSelected ? "bg-isel-emerald text-white" : "bg-isel-paper text-isel-ink/40"
                  }`}
                >
                  {isSelected ? <Icon name="check" size={15} /> : <span className="tabular">{i + 1}</span>}
                </span>
                <span
                  className={`flex-1 text-[14px] leading-snug ${
                    isSelected ? "font-semibold text-isel-navy" : "text-isel-ink/85"
                  }`}
                >
                  {c}
                </span>
                {isSelected ? (
                  <Chip tone="emerald" icon="check">
                    Trimestre {trimestre}
                  </Chip>
                ) : readOnly ? null : (
                  <span className="flex shrink-0 items-center gap-1.5 text-[12px] font-semibold text-isel-ink/30 transition-colors duration-300 ease-crisp group-hover/row:text-isel-navy">
                    Elegir
                    <Icon
                      name="chevronRight"
                      size={13}
                      className="transition-transform duration-500 ease-snap group-hover/row:translate-x-0.5"
                    />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-5">
          {checkingExisting ? (
            <Loading label="Buscando su ficha" />
          ) : carrera === null ? (
            <EmptyState
              icon="layers"
              title="Todavía no has elegido maestría"
              hint="Toca una de la lista de arriba para ver su pénsum y elegir tu trimestre."
            />
          ) : loadingAssignment ? (
            <Loading label="Cargando el pénsum" />
          ) : trimestres && trimestres.length === 0 ? (
            <Alert kind="info">
              Aún no hay pénsum cargado para <strong>{carrera}</strong>. Escríbele a coordinación para que lo suban.
            </Alert>
          ) : (
            <div className="overflow-hidden rounded-xl border border-isel-emerald/25 bg-isel-emerald/[0.05]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-isel-emerald/20 px-4 py-3.5">
                <div className="min-w-0">
                  <p className="font-display text-[15px] font-semibold leading-snug text-isel-navy">{carrera}</p>
                  <p className="mt-1 text-[12.5px] text-isel-ink/55">
                    Trimestre {trimestre} · Sección {seccion || "sin definir"} · {cursosCount}{" "}
                    {cursosCount === 1 ? "curso" : "cursos"}
                  </p>
                </div>
                {!readOnly && (
                  <PortalButton tone="ghost" size="sm" icon="pencil" onClick={() => openPicker(carrera)}>
                    Cambiar
                  </PortalButton>
                )}
              </div>

              {cursosCount === 0 ? (
                <p className="px-4 py-5 text-[13px] text-isel-ink/55">
                  No hay cursos definidos para el trimestre {trimestre}.
                </p>
              ) : (
                <ul className="divide-y divide-isel-emerald/15 bg-white/70">
                  {(mainCourses ?? []).map((c, i) => (
                    <li key={c.id} className="flex items-center gap-3 px-4 py-3 text-[13.5px]">
                      <span className="tabular w-5 shrink-0 text-[11px] font-bold text-isel-emerald2/60">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <Icon name="check" size={15} className="text-isel-emerald" />
                      <span className="text-isel-ink">{c.nombre}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </PortalPanel>

      {/* --------------------------------------------------- selector modal */}
      <Modal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title={draftCarrera ?? "Selecciona maestría"}
        widthClassName="max-w-xl"
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Trimestre">
              <select
                className={fieldClass}
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
            <Field label="Sección" hint="Déjala vacía si todavía no te la asignan.">
              <input
                className={fieldClass}
                value={draftSeccion}
                onChange={(e) => setDraftSeccion(e.target.value)}
                placeholder="Ej. A"
              />
            </Field>
          </div>

          <div>
            {draftTrimestres && draftTrimestres.length === 0 ? (
              <Alert kind="info">Aún no hay pénsum cargado para esta maestría.</Alert>
            ) : (
              <>
                <p className="mb-2.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-isel-ink/45">
                  Cursos del trimestre {draftTrimestre} — se asignan todos
                </p>
                {draftCourses === null ? (
                  <Loading label="Cargando cursos" />
                ) : draftCourses.length === 0 ? (
                  <Alert kind="info">No hay cursos definidos para este trimestre.</Alert>
                ) : (
                  <ul className="divide-y divide-isel-line overflow-hidden rounded-xl border border-isel-line bg-white">
                    {draftCourses.map((c) => (
                      <li key={c.id} className="flex items-center gap-3 px-4 py-2.5 text-[13.5px]">
                        <Icon name="check" size={15} className="text-isel-emerald" />
                        <span className="text-isel-ink">{c.nombre}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>

          <div className="flex justify-end gap-3 border-t border-isel-line pt-4">
            <PortalButton tone="ghost" onClick={() => setPickerOpen(false)}>
              Cancelar
            </PortalButton>
            <PortalButton tone="accent" icon="check" onClick={confirmPicker} disabled={draftTrimestre === null}>
              Confirmar trimestre
            </PortalButton>
          </div>
        </div>
      </Modal>

      {/* -------------------------------------------- 03 · adicionales */}
      <PortalPanel
        id="paso-adicionales"
        step="03"
        accent="#6D5AA8"
        title="Cursos adicionales o cambio de sección"
        description="Sección opcional. Puede agregar un curso adicional de cualquier maestría o marcar “Repetir trimestre” si requiere cursar nuevamente un curso de un trimestre anterior."
      >
        <StepGuide
          title="Sección opcional"
          steps={[
            "Si los cursos del paso anterior cubren su asignación, puede omitir esta sección y dejarla vacía.",
            "Si tiene pendiente un curso de un trimestre anterior, marque “Repetir trimestre” y selecciónelo.",
            "Si desea un curso adicional de otra maestría, deje la casilla sin marcar y ubíquelo en el listado.",
          ]}
          outcome="Dejar esta sección vacía es una respuesta válida y no impide guardar la ficha."
        />

        <div className="space-y-4">
          {additional.map((row, i) => (
            <AdditionalRow
              key={row.id}
              row={row}
              index={i}
              allCourses={allCourses}
              mainCarrera={carrera}
              canRemove={additional.length > 1}
              readOnly={readOnly}
              onChange={(patch) => updateAdditional(row.id, patch)}
              onRemove={() => removeAdditionalRow(row.id)}
            />
          ))}
        </div>

        {!readOnly && (
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <PortalButton tone="ghost" icon="plus" onClick={addAdditionalRow} disabled={additional.length >= 10}>
              Agregar otro curso
            </PortalButton>
            <span className="tabular text-[12px] text-isel-ink/35">{additional.length} de 10</span>
          </div>
        )}
      </PortalPanel>

      {/* -------------------------------------------------- 04 · firma */}
      <PortalPanel
        id="paso-firma"
        step="04"
        accent="#2C6E8F"
        title="Observaciones y firma"
        description="Para finalizar, confirme si tiene periodos pendientes, indique la forma de pago y registre su firma en la ficha."
      >
        <StepGuide
          steps={[
            "Indique si tiene trimestres completos pendientes de cursar. Si no cuenta con esa información, seleccione “No”.",
            "Seleccione la forma de pago entre las opciones disponibles.",
            "Registre su firma dentro del recuadro: con el dedo desde un teléfono o con el ratón desde una computadora. Si el resultado no es satisfactorio, bórrela y regístrela nuevamente.",
            "Presione el botón para guardar, ubicado al final de la página.",
          ]}
          outcome="Al guardar se mostrará un resumen de la asignación registrada, con lo cual se confirma el envío de su ficha."
        />

        <div className="space-y-3">
          <ChoiceRow
            label="Trimestres o semestres completos anteriores pendientes de cursar"
            options={[
              { value: "no", label: "No" },
              { value: "si", label: "Sí" },
            ]}
            value={pendientesTrimestres ? "si" : "no"}
            onChange={(v) => setPendientesTrimestres(v === "si")}
            disabled={readOnly}
          />
          <ChoiceRow
            label="Materias de trimestres o semestres anteriores pendientes de cursar"
            options={[
              { value: "no", label: "No" },
              { value: "si", label: "Sí" },
            ]}
            value={pendientesMaterias ? "si" : "no"}
            onChange={(v) => setPendientesMaterias(v === "si")}
            disabled={readOnly}
          />
          <ChoiceRow
            label="Tipo de pago"
            options={[
              { value: "Link", label: "Link de pago" },
              { value: "Presencial", label: "Presencial" },
            ]}
            value={tipoPago === "" ? null : tipoPago}
            onChange={(v) => setTipoPago(v as TipoPago)}
            disabled={readOnly}
          />
        </div>

        <div className="mt-8">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-[13px] font-semibold text-isel-ink">
              <Icon name="pen" size={16} className="text-isel-gold2" />
              Firma digital
            </p>
            {!readOnly && (
              <PortalButton tone="quiet" size="sm" icon="eraser" onClick={() => signatureRef.current?.clear()}>
                Limpiar firma
              </PortalButton>
            )}
          </div>
          <SignaturePad
            ref={signatureRef}
            initialValue={assignment?.firmaBase64}
            className="max-w-md"
            readOnly={readOnly}
            key={assignment?.id ?? "blank"}
          />
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Correo electrónico">
            <input
              type="email"
              className={fieldClass}
              placeholder="correo@dominio.com"
              value={correoContacto}
              disabled={readOnly}
              onChange={(e) => setCorreoContacto(e.target.value)}
            />
          </Field>
          <Field label="Teléfono para contacto">
            <input
              className={fieldClass}
              placeholder="8 dígitos"
              value={telefonoContacto}
              disabled={readOnly}
              onChange={(e) => setTelefonoContacto(e.target.value)}
            />
          </Field>
        </div>
      </PortalPanel>

      {error && !readOnly && <Alert kind="error">{error}</Alert>}

      {/* ------------------------------------------------- barra de envío */}
      <div
        className={`sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-4 rounded-2xl border px-5 py-4 shadow-card-hover backdrop-blur ${
          readOnly ? "border-isel-line bg-isel-arena/90" : "border-isel-line bg-white/95"
        }`}
      >
        <div className="min-w-0">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-isel-ink/40">
            {readOnly ? "Ficha guardada" : "Vas a enviar"}
          </p>
          <p className="mt-1 truncate text-[13.5px] text-isel-ink/75">
            {carrera === null ? (
              <span className="text-isel-ink/40">Falta elegir tu maestría</span>
            ) : (
              <>
                <span className="font-semibold text-isel-navy">{carrera}</span> · Trimestre {trimestre} ·{" "}
                <span className="tabular">{cursosCount}</span> {cursosCount === 1 ? "curso" : "cursos"}
                {adicionalesCount > 0 && (
                  <>
                    {" "}
                    + <span className="tabular">{adicionalesCount}</span>{" "}
                    {adicionalesCount === 1 ? "adicional" : "adicionales"}
                  </>
                )}
              </>
            )}
          </p>
        </div>
        {readOnly ? (
          <span className="flex shrink-0 items-center gap-2 rounded-xl border border-isel-line bg-white px-3.5 py-2 text-[12.5px] font-semibold text-isel-ink/50">
            <Icon name="lock" size={14} />
            Solo lectura
          </span>
        ) : (
          <PortalButton tone="accent" icon="save" onClick={handleSave} loading={saving} className="shrink-0">
            {saving ? "Guardando" : "Guardar asignación"}
          </PortalButton>
        )}
      </div>

      {/* ------------------------------------------------ resumen guardado */}
      <Modal open={savedSummary !== null} onClose={handleDismissSaved} title="Ficha guardada" widthClassName="max-w-md">
        {savedSummary && (
          <div className="space-y-5">
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-isel-emerald/10 text-isel-emerald">
                <Icon name="check" size={22} />
              </span>
              <p className="pt-0.5 text-[13.5px] leading-relaxed text-isel-ink">
                La ficha de <strong className="text-isel-navy">{savedSummary.nombreCompleto}</strong> se envió
                correctamente. Esto quedó registrado:
              </p>
            </div>

            <dl className="divide-y divide-isel-line overflow-hidden rounded-xl border border-isel-line">
              <SummaryRow label="Carrera" value={savedSummary.carrera} />
              <SummaryRow label="Trimestre" value={String(savedSummary.trimestre)} />
              <SummaryRow label="Sección" value={savedSummary.seccion || "No especificada"} />
              <SummaryRow label="Cursos asignados" value={String(savedSummary.cursosAsignados.length)} />
              <SummaryRow label="Cursos adicionales" value={String(savedSummary.cursosAdicionales.length)} />
              <SummaryRow label="Firma" value={savedSummary.firmaBase64 ? "Registrada" : "No registrada"} />
            </dl>

            <p className="text-[12px] leading-relaxed text-isel-ink/45">
              No hace falta volver a guardar. Si necesitas corregir algo, edita el formulario y guarda de nuevo.
            </p>

            <div className="flex justify-end gap-3 border-t border-isel-line pt-4">
              <PortalButton tone="ghost" onClick={() => setSavedSummary(null)}>
                Seguir editando
              </PortalButton>
              <PortalButton tone="primary" icon="arrowRight" iconRight onClick={handleDismissSaved}>
                {onDismissSaved ? "Cerrar" : "Volver al inicio"}
              </PortalButton>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ---------------------------------------------------------------- piezas */

/** Dato de solo lectura. Antes era un `<input disabled>`: un control que
 *  invita a escribir y no deja. Un dato se muestra, no se simula editable. */
function DataItem({ label, value, mono = false }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-bold uppercase tracking-[0.13em] text-isel-ink/40">{label}</dt>
      <dd
        className={`mt-1.5 truncate text-[14.5px] font-semibold text-isel-navy ${mono ? "tabular" : ""} ${
          value ? "" : "font-normal text-isel-ink/25"
        }`}
        title={value ?? undefined}
      >
        {value || "—"}
      </dd>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 bg-white px-4 py-2.5">
      <dt className="text-[12.5px] text-isel-ink/55">{label}</dt>
      <dd className="tabular text-[13px] font-semibold text-isel-navy">{value}</dd>
    </div>
  );
}

/** Pregunta con respuesta cerrada. Un solo patrón para las tres (y para el wizard de Inscripción). */
export function ChoiceRow({
  label,
  options,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string | null;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-isel-line bg-isel-paper/60 px-4 py-3 transition-colors duration-300 ease-crisp hover:border-isel-ink/20">
      <span className="max-w-[46ch] text-[13.5px] leading-snug text-isel-ink/80">{label}</span>
      <Segmented options={options} value={value} onChange={onChange} size="sm" disabled={disabled} className="shrink-0" />
    </div>
  );
}

/**
 * Una fila de "cursos adicionales".
 *
 * Los dos modos —añadir un curso suelto o repetir uno de un trimestre
 * anterior— usan ahora el MISMO selector en modal. "Repetir trimestre" eran
 * tres desplegables encadenados (maestría → trimestre → curso) metidos dentro
 * de la fila: ocupaban tres columnas, obligaban a acertar en orden y no se
 * parecían en nada a cómo se elige el otro curso de la misma fila. El recorrido
 * es idéntico, así que la herramienta también debe serlo; lo único que cambia
 * es dónde aterriza el selector al abrirse (en tu maestría, si vas a repetir)
 * y que al elegir se guardan además la carrera y el trimestre de origen.
 */
export function AdditionalRow({
  row,
  index,
  allCourses,
  mainCarrera,
  canRemove,
  readOnly,
  onChange,
  onRemove,
}: {
  row: AdditionalEntry;
  index: number;
  allCourses: Course[];
  mainCarrera: string | null;
  canRemove: boolean;
  readOnly: boolean;
  onChange: (patch: Partial<AdditionalEntry>) => void;
  onRemove: () => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const repetir = row.mode === "repetir";
  const chosen = row.courseId !== null ? allCourses.find((c) => c.id === row.courseId) : undefined;

  const numeral = (
    <span aria-hidden className="tabular text-[11px] font-bold text-isel-ink/25">
      {String(index + 1).padStart(2, "0")}
    </span>
  );

  if (row.fallback) {
    return (
      <div className="rounded-xl border border-isel-gold/30 bg-isel-gold/[0.06] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5">{numeral}</span>
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-isel-navy">{row.fallback.nombre}</p>
              <p className="mt-1 text-[12px] text-isel-ink/50">
                {row.fallback.carrera} — ya no está en el catálogo actual, pero se conserva
              </p>
            </div>
          </div>
          {!readOnly && (
            <PortalButton tone="quiet" size="sm" icon="trash" onClick={onRemove}>
              Quitar
            </PortalButton>
          )}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <input
            className={fieldClass}
            placeholder="Sección (opcional)"
            value={row.seccion}
            disabled={readOnly}
            onChange={(e) => onChange({ seccion: e.target.value })}
          />
          <input
            className={fieldClass}
            placeholder="Jornada (opcional)"
            value={row.jornada}
            disabled={readOnly}
            onChange={(e) => onChange({ jornada: e.target.value })}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border p-4 transition-colors duration-300 ease-crisp ${
        chosen
          ? repetir
            ? "border-isel-gold/35 bg-isel-gold/[0.05]"
            : "border-isel-emerald/25 bg-isel-emerald/[0.04]"
          : "border-isel-line bg-isel-paper/50"
      }`}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {numeral}
          <Segmented
            size="sm"
            disabled={readOnly}
            value={row.mode}
            onChange={(mode) =>
              onChange(
                mode === "adicional"
                  ? { mode: "adicional", courseId: null, repetirCarrera: null, repetirTrimestre: null }
                  : { mode: "repetir", courseId: null, repetirCarrera: mainCarrera, repetirTrimestre: null },
              )
            }
            options={[
              { value: "adicional", label: "Curso adicional" },
              { value: "repetir", label: "Repetir trimestre" },
            ]}
          />
        </div>
        {canRemove && !readOnly && (
          <PortalButton tone="quiet" size="sm" icon="trash" onClick={onRemove}>
            Quitar este campo
          </PortalButton>
        )}
      </div>

      <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-[0.14em] text-isel-ink/45">
        {repetir ? "Curso a repetir" : "Curso adicional"}
      </span>

      {/* Disparador del selector: enseña lo elegido con su maestría y su
          trimestre, en vez de esconderlo dentro de un desplegable. */}
      <button
        type="button"
        disabled={readOnly}
        onClick={() => setPickerOpen(true)}
        className={`group/pick flex w-full items-center gap-3 rounded-xl border bg-white px-4 py-3 text-left transition-[border-color,box-shadow] duration-300 ease-crisp disabled:cursor-default ${
          chosen
            ? repetir
              ? "border-isel-gold/45 shadow-[0_0_0_3px_rgba(232,179,61,0.14)]"
              : "border-isel-emerald/35 shadow-[0_0_0_3px_rgba(18,133,92,0.09)]"
            : "border-dashed border-isel-line hover:enabled:border-isel-navy/35"
        }`}
      >
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
            chosen
              ? repetir
                ? "bg-isel-gold/15 text-isel-gold2"
                : "bg-isel-emerald/10 text-isel-emerald"
              : "bg-isel-paper text-isel-ink/35"
          }`}
        >
          <Icon name={chosen ? (repetir ? "repeat" : "check") : "search"} size={17} />
        </span>
        <span className="min-w-0 flex-1">
          {chosen ? (
            <>
              <span className="block truncate text-[14px] font-semibold text-isel-navy">{chosen.nombre}</span>
              <span className="mt-0.5 block truncate text-[12px] text-isel-ink/50">
                {chosen.carrera === "Inglés" ? "Inglés" : `${chosen.carrera} · Trimestre ${chosen.trimestre}`}
              </span>
            </>
          ) : (
            <>
              <span className="block text-[14px] font-semibold text-isel-ink/60">
                {repetir ? "Elegir el curso que vas a repetir" : "Elegir un curso"}
              </span>
              <span className="mt-0.5 block text-[12px] text-isel-ink/40">
                {repetir
                  ? "Se abre en tu maestría; puedes cambiar a cualquier otra"
                  : "Todo el catálogo, separado por carrera y trimestre"}
              </span>
            </>
          )}
        </span>
        {!readOnly && (
          <Icon
            name="chevronRight"
            size={16}
            className="shrink-0 text-isel-ink/30 transition-transform duration-500 ease-snap group-hover/pick:translate-x-0.5"
          />
        )}
      </button>

      <CoursePickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        courses={allCourses}
        value={row.courseId}
        initialGroup={repetir ? mainCarrera : null}
        title={repetir ? "Elegir curso a repetir" : "Elegir curso adicional"}
        onSelect={(courseId) => {
          const c = allCourses.find((x) => x.id === courseId);
          // En "repetir" se guardan además la carrera y el trimestre de origen,
          // que es lo que antes se elegía a mano en los dos primeros selects.
          onChange(
            repetir
              ? { courseId, repetirCarrera: c?.carrera ?? null, repetirTrimestre: c?.trimestre ?? null }
              : { courseId },
          );
        }}
      />

      <div className="mt-4 grid grid-cols-2 gap-3">
        <input
          className={fieldClass}
          placeholder="Sección (opcional)"
          value={row.seccion}
          disabled={readOnly}
          onChange={(e) => onChange({ seccion: e.target.value })}
        />
        <input
          className={fieldClass}
          placeholder="Jornada (opcional)"
          value={row.jornada}
          disabled={readOnly}
          onChange={(e) => onChange({ jornada: e.target.value })}
        />
      </div>
    </div>
  );
}
