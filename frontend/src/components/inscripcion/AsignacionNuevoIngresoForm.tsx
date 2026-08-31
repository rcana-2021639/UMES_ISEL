import { useEffect, useMemo, useRef, useState } from "react";
import { getCourses, getTrimestres } from "@/lib/coursesApi";
import { saveAsignacion } from "@/lib/inscripcionesApi";
import { ApiError } from "@/lib/http";
import type { Course } from "@/types/course";
import type { AsignacionNuevoIngreso, AsignacionNuevoIngresoInput } from "@/types/inscripcion";
import { SignaturePad, type SignaturePadHandle } from "@/components/portal/SignaturePad";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/portal/Icon";
import { PortalPanel } from "@/components/portal/PortalShell";
import { Alert, Chip, EmptyState, Field, Loading, PortalButton, fieldClass } from "@/components/portal/kit";
import {
  AdditionalRow,
  ChoiceRow,
  blankAdditionalRow,
  nextRowId,
  type AdditionalEntry,
} from "@/components/portal/CourseAssignmentForm";

/**
 * Sección 2 del wizard de Inscripción — la MISMA "Ficha de Asignación de Cursos" que ya usa el portal
 * de alumnos (CourseAssignmentForm), reutilizando su selector de maestría/trimestre y sus filas de
 * "cursos adicionales" (AdditionalRow/ChoiceRow, importadas de ahí). La única diferencia real: como
 * el aspirante todavía no tiene carné, "Tus datos" se teclea a mano en vez de venir del padrón.
 */
interface AsignacionNuevoIngresoFormProps {
  applicantId: number;
  initial: AsignacionNuevoIngreso | null;
  onSaved: (a: AsignacionNuevoIngreso) => void;
  readOnly?: boolean;
}

export function AsignacionNuevoIngresoForm({ applicantId, initial, onSaved, readOnly = false }: AsignacionNuevoIngresoFormProps) {
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [primerApellido, setPrimerApellido] = useState(initial?.primerApellido ?? "");
  const [segundoApellido, setSegundoApellido] = useState(initial?.segundoApellido ?? "");
  const [primerNombre, setPrimerNombre] = useState(initial?.primerNombre ?? "");
  const [segundoNombre, setSegundoNombre] = useState(initial?.segundoNombre ?? "");

  const [carrera, setCarrera] = useState<string | null>(initial?.carrera ?? null);
  const [trimestres, setTrimestres] = useState<number[] | null>(null);
  const [trimestre, setTrimestre] = useState<number | null>(initial?.trimestre ?? null);
  const [mainCourses, setMainCourses] = useState<Course[] | null>(null);
  const [seccion, setSeccion] = useState(initial?.seccion ?? "");
  const [additional, setAdditional] = useState<AdditionalEntry[]>([blankAdditionalRow()]);
  const [pendientesTrimestres, setPendientesTrimestres] = useState(initial?.tienePendientesTrimestres ?? false);
  const [pendientesMaterias, setPendientesMaterias] = useState(initial?.tienePendientesMaterias ?? false);
  const [correoContacto, setCorreoContacto] = useState(initial?.correoContacto ?? "");
  const [telefonoContacto, setTelefonoContacto] = useState(initial?.telefonoContacto ?? "");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const signatureRef = useRef<SignaturePadHandle>(null);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [draftCarrera, setDraftCarrera] = useState<string | null>(null);
  const [draftTrimestre, setDraftTrimestre] = useState<number | null>(null);
  const [draftTrimestres, setDraftTrimestres] = useState<number[] | null>(null);
  const [draftCourses, setDraftCourses] = useState<Course[] | null>(null);
  const [draftSeccion, setDraftSeccion] = useState("");

  useEffect(() => {
    getCourses().then(setAllCourses);
  }, []);

  // Re-hidrata todo cuando cambia la ficha ya guardada de este aspirante (p.ej. al recargar el wizard).
  useEffect(() => {
    setPrimerApellido(initial?.primerApellido ?? "");
    setSegundoApellido(initial?.segundoApellido ?? "");
    setPrimerNombre(initial?.primerNombre ?? "");
    setSegundoNombre(initial?.segundoNombre ?? "");
    setCarrera(initial?.carrera ?? null);
    setTrimestre(initial?.trimestre ?? null);
    setSeccion(initial?.seccion ?? "");
    setPendientesTrimestres(initial?.tienePendientesTrimestres ?? false);
    setPendientesMaterias(initial?.tienePendientesMaterias ?? false);
    setCorreoContacto(initial?.correoContacto ?? "");
    setTelefonoContacto(initial?.telefonoContacto ?? "");

    if (!initial || initial.cursosAdicionales.length === 0) {
      setAdditional([blankAdditionalRow()]);
      return;
    }
    setAdditional(
      initial.cursosAdicionales.map((row) => {
        const match = allCourses.find((c) => c.nombre === row.cursoAdicional && c.carrera === row.carrera && String(c.trimestre) === row.semTri);
        return {
          id: nextRowId(),
          mode: "adicional" as const,
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
  }, [initial, allCourses.length]);

  useEffect(() => {
    if (carrera === null) {
      setTrimestres(null);
      return;
    }
    let active = true;
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

  useEffect(() => {
    if (carrera === null || trimestre === null) {
      setMainCourses(null);
      return;
    }
    let active = true;
    getCourses(carrera, trimestre).then((list) => active && setMainCourses(list));
    return () => {
      active = false;
    };
  }, [carrera, trimestre]);

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
    setSaved(false);
  }

  const pickableCarreras = useMemo(
    () => Array.from(new Set(allCourses.filter((c) => c.carrera !== "Inglés").map((c) => c.carrera))).sort((a, b) => a.localeCompare(b)),
    [allCourses],
  );

  function updateAdditional(id: string, patch: Partial<AdditionalEntry>) {
    setAdditional((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setSaved(false);
  }
  function addAdditionalRow() {
    setAdditional((rows) => (rows.length >= 10 ? rows : [...rows, blankAdditionalRow()]));
  }
  function removeAdditionalRow(id: string) {
    setAdditional((rows) => rows.filter((r) => r.id !== id));
  }

  function findIncompleteAdditionalRow(): number | null {
    for (let i = 0; i < additional.length; i++) {
      const row = additional[i];
      if (row.fallback) continue;
      const started = row.courseId !== null || (row.mode === "repetir" && (row.repetirCarrera !== null || row.repetirTrimestre !== null));
      if (started && row.courseId === null) return i + 1;
    }
    return null;
  }

  async function handleSave() {
    if (!primerApellido.trim() || !primerNombre.trim() || carrera === null || trimestre === null) {
      setError("Primer apellido, primer nombre, maestría y trimestre son obligatorios.");
      return;
    }
    const incompleteRow = findIncompleteAdditionalRow();
    if (incompleteRow !== null) {
      setError(`Falta elegir el curso en la fila ${incompleteRow} de "Cursos adicionales", o bórrala con "Quitar este campo".`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const firma = signatureRef.current?.getSignature() ?? initial?.firmaBase64 ?? null;
      const cursosAsignados = (mainCourses ?? []).map((c, i) => ({ numero: i + 1, curso: c.nombre, semTri: String(trimestre), seccion }));
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

      const input: AsignacionNuevoIngresoInput = {
        primerApellido: primerApellido.trim(),
        segundoApellido: segundoApellido.trim() || null,
        primerNombre: primerNombre.trim(),
        segundoNombre: segundoNombre.trim() || null,
        trimestre,
        carrera,
        seccion: seccion || null,
        cursosAsignados,
        cursosAdicionales,
        tienePendientesTrimestres: pendientesTrimestres,
        tienePendientesMaterias: pendientesMaterias,
        correoContacto: correoContacto || null,
        telefonoContacto: telefonoContacto || null,
        firmaBase64: firma,
      };
      const savedAsn = await saveAsignacion(applicantId, input);
      onSaved(savedAsn);
      setSaved(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo guardar la asignación de cursos.");
    } finally {
      setSaving(false);
    }
  }

  const cursosCount = (mainCourses ?? []).length;

  return (
    <PortalPanel
      id="paso-asignacion"
      step="02"
      accent="#B8791F"
      title="Ficha de asignación de cursos"
      description="Como todavía no tienes carné, escribe tus datos a mano. El resto funciona igual que para un alumno ya inscrito."
    >
      <div className="space-y-8">
        <div>
          <p className="mb-3 text-[10.5px] font-bold uppercase tracking-[0.14em] text-isel-ink/45">Tus datos</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Primer apellido *">
              <input className={fieldClass} disabled={readOnly} value={primerApellido} onChange={(e) => { setPrimerApellido(e.target.value); setSaved(false); }} />
            </Field>
            <Field label="Segundo apellido">
              <input className={fieldClass} disabled={readOnly} value={segundoApellido ?? ""} onChange={(e) => { setSegundoApellido(e.target.value); setSaved(false); }} />
            </Field>
            <Field label="Primer nombre *">
              <input className={fieldClass} disabled={readOnly} value={primerNombre} onChange={(e) => { setPrimerNombre(e.target.value); setSaved(false); }} />
            </Field>
            <Field label="Segundo nombre">
              <input className={fieldClass} disabled={readOnly} value={segundoNombre ?? ""} onChange={(e) => { setSegundoNombre(e.target.value); setSaved(false); }} />
            </Field>
          </div>
        </div>

        <div>
          <p className="mb-3 text-[10.5px] font-bold uppercase tracking-[0.14em] text-isel-ink/45">Cursos por asignarse</p>
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
                    isSelected ? "bg-isel-gold/[0.07]" : "bg-white hover:enabled:bg-isel-paper/70"
                  } ${readOnly && !isSelected ? "opacity-45" : ""}`}
                >
                  <span
                    aria-hidden
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[12px] font-bold transition-colors duration-300 ease-crisp ${
                      isSelected ? "bg-isel-gold2 text-white" : "bg-isel-paper text-isel-ink/40"
                    }`}
                  >
                    {isSelected ? <Icon name="check" size={15} /> : <span className="tabular">{i + 1}</span>}
                  </span>
                  <span className={`flex-1 text-[14px] leading-snug ${isSelected ? "font-semibold text-isel-navy" : "text-isel-ink/85"}`}>{c}</span>
                  {isSelected ? (
                    <Chip tone="gold" icon="check">Trimestre {trimestre}</Chip>
                  ) : readOnly ? null : (
                    <span className="flex shrink-0 items-center gap-1.5 text-[12px] font-semibold text-isel-ink/30 transition-colors duration-300 ease-crisp group-hover/row:text-isel-navy">
                      Elegir <Icon name="chevronRight" size={13} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-5">
            {carrera === null ? (
              <EmptyState icon="layers" title="Todavía no has elegido maestría" hint="Toca una de la lista de arriba para ver su pénsum y elegir tu trimestre." />
            ) : trimestres && trimestres.length === 0 ? (
              <Alert kind="info">Aún no hay pénsum cargado para <strong>{carrera}</strong>.</Alert>
            ) : (
              <div className="overflow-hidden rounded-xl border border-isel-gold/25 bg-isel-gold/[0.05]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-isel-gold/20 px-4 py-3.5">
                  <div className="min-w-0">
                    <p className="font-display text-[15px] font-semibold leading-snug text-isel-navy">{carrera}</p>
                    <p className="mt-1 text-[12.5px] text-isel-ink/55">
                      Trimestre {trimestre} · Sección {seccion || "sin definir"} · {cursosCount} {cursosCount === 1 ? "curso" : "cursos"}
                    </p>
                  </div>
                  {!readOnly && (
                    <PortalButton tone="ghost" size="sm" icon="pencil" onClick={() => openPicker(carrera)}>Cambiar</PortalButton>
                  )}
                </div>
                {cursosCount === 0 ? (
                  <p className="px-4 py-5 text-[13px] text-isel-ink/55">No hay cursos definidos para el trimestre {trimestre}.</p>
                ) : (
                  <ul className="divide-y divide-isel-gold/15 bg-white/70">
                    {(mainCourses ?? []).map((c, i) => (
                      <li key={c.id} className="flex items-center gap-3 px-4 py-3 text-[13.5px]">
                        <span className="tabular w-5 shrink-0 text-[11px] font-bold text-isel-gold2/70">{String(i + 1).padStart(2, "0")}</span>
                        <Icon name="check" size={15} className="text-isel-gold2" />
                        <span className="text-isel-ink">{c.nombre}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>

        <Modal open={pickerOpen} onClose={() => setPickerOpen(false)} title={draftCarrera ?? "Selecciona maestría"} widthClassName="max-w-xl">
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
                    <option key={t} value={t}>Trimestre {t}</option>
                  ))}
                </select>
              </Field>
              <Field label="Sección" hint="Déjala vacía si todavía no te la asignan.">
                <input className={fieldClass} value={draftSeccion} onChange={(e) => setDraftSeccion(e.target.value)} placeholder="Ej. A" />
              </Field>
            </div>
            <div>
              {draftTrimestres && draftTrimestres.length === 0 ? (
                <Alert kind="info">Aún no hay pénsum cargado para esta maestría.</Alert>
              ) : (
                <>
                  <p className="mb-2.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-isel-ink/45">Cursos del trimestre {draftTrimestre} — se asignan todos</p>
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
              <PortalButton tone="ghost" onClick={() => setPickerOpen(false)}>Cancelar</PortalButton>
              <PortalButton tone="accent" icon="check" onClick={confirmPicker} disabled={draftTrimestre === null}>Confirmar trimestre</PortalButton>
            </div>
          </div>
        </Modal>

        <div>
          <p className="mb-3 text-[10.5px] font-bold uppercase tracking-[0.14em] text-isel-ink/45">Cursos adicionales o cambio de sección</p>
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
              <PortalButton tone="ghost" icon="plus" onClick={addAdditionalRow} disabled={additional.length >= 10}>Agregar otro curso</PortalButton>
              <span className="tabular text-[12px] text-isel-ink/35">{additional.length} de 10</span>
            </div>
          )}
        </div>

        <div>
          <p className="mb-3 text-[10.5px] font-bold uppercase tracking-[0.14em] text-isel-ink/45">Observaciones y firma</p>
          <div className="space-y-3">
            <ChoiceRow
              label="Trimestres o semestres completos anteriores pendientes de cursar"
              options={[{ value: "no", label: "No" }, { value: "si", label: "Sí" }]}
              value={pendientesTrimestres ? "si" : "no"}
              onChange={(v) => { setPendientesTrimestres(v === "si"); setSaved(false); }}
              disabled={readOnly}
            />
            <ChoiceRow
              label="Materias de trimestres o semestres anteriores pendientes de cursar"
              options={[{ value: "no", label: "No" }, { value: "si", label: "Sí" }]}
              value={pendientesMaterias ? "si" : "no"}
              onChange={(v) => { setPendientesMaterias(v === "si"); setSaved(false); }}
              disabled={readOnly}
            />
          </div>

          {!readOnly && (
            <div className="mt-8">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <p className="flex items-center gap-2 text-[13px] font-semibold text-isel-ink">
                  <Icon name="pen" size={16} className="text-isel-gold2" /> Firma digital
                </p>
                <PortalButton tone="quiet" size="sm" icon="eraser" onClick={() => signatureRef.current?.clear()}>Limpiar firma</PortalButton>
              </div>
              <SignaturePad ref={signatureRef} initialValue={initial?.firmaBase64} className="max-w-md" key={applicantId} />
            </div>
          )}

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Correo electrónico">
              <input type="email" className={fieldClass} disabled={readOnly} value={correoContacto} onChange={(e) => { setCorreoContacto(e.target.value); setSaved(false); }} />
            </Field>
            <Field label="Teléfono para contacto">
              <input className={fieldClass} disabled={readOnly} value={telefonoContacto} onChange={(e) => { setTelefonoContacto(e.target.value); setSaved(false); }} />
            </Field>
          </div>
        </div>

        {error && <Alert kind="error">{error}</Alert>}
        {saved && !error && <Alert kind="ok">Ficha de asignación guardada.</Alert>}

        {!readOnly && (
          <div className="flex justify-end border-t border-isel-line pt-5">
            <PortalButton tone="accent" icon="save" onClick={handleSave} loading={saving}>Guardar asignación de cursos</PortalButton>
          </div>
        )}
      </div>
    </PortalPanel>
  );
}
