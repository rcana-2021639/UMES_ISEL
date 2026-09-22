import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { getCarreras, getCourses, getTrimestres } from "@/lib/coursesApi";
import { openAsignacionInscripcionPdf, saveAsignacion } from "@/lib/inscripcionesApi";
import { joinNombreCompleto, splitNombreCompleto } from "@/lib/nombres";
import { ApiError } from "@/lib/http";
import type { Course } from "@/types/course";
import type { TipoPago } from "@/types/courseAssignment";
import type { AsignacionNuevoIngreso, AsignacionNuevoIngresoInput } from "@/types/inscripcion";
import type { FichaHandle } from "./fichaHandle";
import { SignaturePad, type SignaturePadHandle } from "@/components/portal/SignaturePad";
import { Modal } from "@/components/ui/Modal";
import { FichaEnviadaModal } from "@/components/portal/FichaEnviadaModal";
import { useConfirm } from "@/hooks/useConfirm";
import { Icon } from "@/components/portal/Icon";
import { PortalPanel } from "@/components/portal/PortalShell";
import { StepGuide } from "@/components/portal/StepGuide";
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
  /**
   * El "Nombre completo" de la preinscripción, para no volver a teclearlo. Esta ficha lo
   * pide partido en cuatro casillas, así que llega repartido (ver lib/nombres.ts) y como
   * sugerencia: los cuatro campos siguen siendo editables porque ningún reparto automático
   * acierta siempre con dos nombres y dos apellidos.
   */
  nombreSugerido?: string | null;
  /**
   * Lo demás que la preinscripción ya preguntó: la maestría elegida y los dos
   * datos de contacto. Se usan como valores de partida en una ficha que aún no
   * se ha guardado ni tocado — nadie tiene que teclear dos veces su correo, y
   * si algo cambió, los tres campos siguen siendo editables.
   */
  carreraSugerida?: string | null;
  /** La cohorte elegida en la preinscripción: decide qué versión del pénsum se le ofrece. */
  cohorteId?: number | null;
  correoSugerido?: string | null;
  telefonoSugerido?: string | null;
  onSaved: (a: AsignacionNuevoIngreso) => void;
  readOnly?: boolean;
}

export const AsignacionNuevoIngresoForm = forwardRef<FichaHandle, AsignacionNuevoIngresoFormProps>(
  function AsignacionNuevoIngresoForm(
    { applicantId, initial, nombreSugerido, carreraSugerida, cohorteId, correoSugerido, telefonoSugerido, onSaved, readOnly = false },
    ref,
  ) {
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
  const [tipoPago, setTipoPago] = useState<TipoPago | "">(initial?.tipoPago ?? "");
  // Mientras nadie haya tocado las casillas del nombre, se dejan sincronizadas con la
  // preinscripción; en cuanto se corrigen a mano, mandan ellas.
  const [nombreTocado, setNombreTocado] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Ver el comentario gemelo en PreinscripcionForm: los campos de esta ficha
      ya avisaban de cada cambio con `setSaved(false)`, así que esa misma señal
      es la que le dice al cierre del expediente si queda algo sin mandar. */
  const [tocado, setTocado] = useState(false);
  function setSaved(v: boolean) {
    setTocado(!v);
  }
  const signatureRef = useRef<SignaturePadHandle>(null);
  /** La ficha recién guardada, para el modal de confirmación — null si no hay nada que mostrar. */
  const [savedSummary, setSavedSummary] = useState<AsignacionNuevoIngreso | null>(null);
  const { confirm, dialog: confirmDialog } = useConfirm();
  /** Ver el comentario gemelo en CourseAssignmentForm: sin este modal, "guardar" sin firmar
      quedaba en silencio y el problema solo se descubría al imprimir la ficha. */
  const [faltaFirma, setFaltaFirma] = useState(false);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [draftCarrera, setDraftCarrera] = useState<string | null>(null);
  const [draftTrimestre, setDraftTrimestre] = useState<number | null>(null);
  const [draftTrimestres, setDraftTrimestres] = useState<number[] | null>(null);
  const [draftCourses, setDraftCourses] = useState<Course[] | null>(null);
  const [draftSeccion, setDraftSeccion] = useState("");

  useEffect(() => {
    getCourses(undefined, undefined, cohorteId).then(setAllCourses);
  }, [cohorteId]);

  // Re-hidrata todo cuando cambia la ficha ya guardada de este aspirante (p.ej. al recargar el wizard).
  useEffect(() => {
    /* Freno de mano: si esta ficha todavía no está guardada pero alguien ya
       escribió en ella, nada de fuera la reescribe.

       Sin él, guardar la PREINSCRIPCIÓN mientras se está llenando esta —que es
       el orden natural: se baja, se guarda la de arriba, se sigue— cambiaba las
       sugerencias, disparaba este efecto y borraba de un plumazo la maestría,
       el trimestre, el correo y el teléfono que se acababan de elegir aquí. */
    if (!initial && tocado) return;

    if (initial) {
      setPrimerApellido(initial.primerApellido);
      setSegundoApellido(initial.segundoApellido ?? "");
      setPrimerNombre(initial.primerNombre);
      setSegundoNombre(initial.segundoNombre ?? "");
      setNombreTocado(false);
    } else if (!nombreTocado) {
      const partes = splitNombreCompleto(nombreSugerido);
      setPrimerApellido(partes.primerApellido);
      setSegundoApellido(partes.segundoApellido);
      setPrimerNombre(partes.primerNombre);
      setSegundoNombre(partes.segundoNombre);
    }
    /* Llegados aquí, «sin ficha guardada» ya significa «e intacta» (lo garantiza
       el freno de arriba), así que las sugerencias de la preinscripción pueden
       entrar sin miedo a pisar nada escrito. */
    const virgen = !initial;
    setCarrera(initial?.carrera ?? (virgen ? (carreraSugerida ?? null) : null));
    /* El trimestre solo se fija desde aquí cuando hay ficha guardada. Sin ella
       lo elige el efecto que carga los trimestres de la maestría —se queda con
       el primero disponible—, y ese efecto corre después de este: ponerlo a
       null aquí borraba justo lo que aquel acababa de elegir, y la ficha se
       quedaba con «0 cursos» y «no hay cursos definidos para el trimestre». */
    if (initial) setTrimestre(initial.trimestre);
    setSeccion(initial?.seccion ?? "");
    setPendientesTrimestres(initial?.tienePendientesTrimestres ?? false);
    setPendientesMaterias(initial?.tienePendientesMaterias ?? false);
    setCorreoContacto(initial?.correoContacto ?? (virgen ? (correoSugerido ?? "") : ""));
    setTelefonoContacto(initial?.telefonoContacto ?? (virgen ? (telefonoSugerido ?? "") : ""));
    setTipoPago(initial?.tipoPago ?? "");
    // Lo que acaba de llegar del servidor ES lo guardado: nada pendiente.
    setTocado(false);

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
  }, [initial, nombreSugerido, carreraSugerida, correoSugerido, telefonoSugerido, allCourses.length]);

  useEffect(() => {
    if (carrera === null) {
      setTrimestres(null);
      return;
    }
    let active = true;
    getTrimestres(carrera, cohorteId).then((list) => {
      if (!active) return;
      setTrimestres(list);
      // Solo se elige un trimestre por defecto cuando todavía no hay ninguno puesto — NUNCA se
      // reemplaza uno que ya está seleccionado, ni siquiera si esta lista (recién llegada del
      // servidor) no lo trae. Antes se descartaba en cuanto no aparecía en `list`, y esa lista
      // puede no traerlo por cosas tan normales como que el pénsum de esa maestría se corrigió
      // después de que se imprimiera la ficha (carnés de distinto año con pénsum distinto, por
      // ejemplo): al reabrir esa ficha para editarla, el trimestre real se sustituía en silencio
      // por el primero de la lista nueva, la ficha guardada para ESE trimestre dejaba de encontrarse
      // y su firma desaparecía del formulario sin que nadie la hubiera borrado.
      setTrimestre((current) => (current !== null ? current : (list[0] ?? null)));
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carrera, cohorteId]);

  useEffect(() => {
    if (carrera === null || trimestre === null) {
      setMainCourses(null);
      return;
    }
    let active = true;
    getCourses(carrera, trimestre, cohorteId).then((list) => active && setMainCourses(list));
    return () => {
      active = false;
    };
  }, [carrera, trimestre, cohorteId]);

  useEffect(() => {
    if (!pickerOpen || !draftCarrera) return;
    let active = true;
    setDraftTrimestres(null);
    getTrimestres(draftCarrera, cohorteId).then((list) => {
      if (!active) return;
      setDraftTrimestres(list);
      setDraftTrimestre((current) => (current && list.includes(current) ? current : (list[0] ?? null)));
    });
    return () => {
      active = false;
    };
  }, [pickerOpen, draftCarrera, cohorteId]);

  useEffect(() => {
    if (!pickerOpen || !draftCarrera || draftTrimestre === null) {
      setDraftCourses(null);
      return;
    }
    let active = true;
    getCourses(draftCarrera, draftTrimestre, cohorteId).then((list) => active && setDraftCourses(list));
    return () => {
      active = false;
    };
  }, [pickerOpen, draftCarrera, draftTrimestre, cohorteId]);

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

  // Igual que en la ficha del alumno: la lista sale del registro de carreras, en
  // el orden que fijó el admin en la pestaña "Pénsum", no de deducirla del
  // catálogo filtrando por un nombre escrito a mano. Si la llamada falla, se cae
  // al catálogo para no dejar al aspirante sin nada que elegir.
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

  /**
   * Ver el comentario gemelo en CourseAssignmentForm: antes de guardar de verdad se cobran los
   * mismos dos peajes que ya tiene la ficha de un alumno ya inscrito — sin firma no se envía, y
   * sin forma de pago se pregunta una vez —, para que esta ficha (la de un aspirante nuevo) no
   * se quede atrás de esos cambios.
   *
   * Devuelve `null` si guardó, o el motivo por el que no se pudo (ver `guardar` en
   * PreinscripcionForm, mismo contrato).
   */
  async function guardar(): Promise<string | null> {
    if (!primerApellido.trim() || !primerNombre.trim() || carrera === null || trimestre === null) {
      const motivo = "Primer apellido, primer nombre, maestría y trimestre son obligatorios.";
      setError(motivo);
      return motivo;
    }
    const incompleteRow = findIncompleteAdditionalRow();
    if (incompleteRow !== null) {
      const motivo = `Falta elegir el curso en la fila ${incompleteRow} de "Cursos adicionales", o bórrala con "Quitar este campo".`;
      setError(motivo);
      return motivo;
    }

    const firma = signatureRef.current?.getSignature() ?? initial?.firmaBase64 ?? null;
    if (!firma) {
      setFaltaFirma(true);
      return "Falta la firma.";
    }

    if (!tipoPago) {
      const seguir = await confirm({
        title: "No indicaste la forma de pago",
        message:
          "Vas a enviar la ficha sin decir si vas a pagar con link de pago o de forma presencial. Puedes hacerlo, pero Coordinación tendrá que escribirte para preguntártelo. ¿Quieres enviarla así?",
        confirmLabel: "Sí, enviar sin indicarlo",
      });
      if (!seguir) {
        document.getElementById("paso-asignacion-firma")?.scrollIntoView({ behavior: "smooth", block: "start" });
        return "Falta la forma de pago.";
      }
    }

    setSaving(true);
    setError(null);
    try {
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
        tipoPago: tipoPago || null,
        firmaBase64: firma,
      };
      const savedAsn = await saveAsignacion(applicantId, input);
      onSaved(savedAsn);
      setSaved(true);
      setSavedSummary(savedAsn);
      return null;
    } catch (e) {
      const motivo = e instanceof ApiError ? e.message : "No se pudo guardar la asignación de cursos.";
      setError(motivo);
      return motivo;
    } finally {
      setSaving(false);
    }
  }

  useImperativeHandle(ref, () => ({
    nombre: "Asignación de cursos",
    anclaId: "paso-asignacion",
    tieneCambios: () => !readOnly && tocado,
    guardar,
  }));

  const cursosCount = (mainCourses ?? []).length;
  const nombrePrellenado = !readOnly && !initial && !nombreTocado && !!nombreSugerido?.trim();

  return (
    <PortalPanel
      id="paso-asignacion"
      step="02"
      accent="#B8791F"
      title="Ficha de asignación de cursos"
      description="Al no contar aún con carné, sus datos deben registrarse manualmente. El resto del proceso es igual al de un estudiante ya inscrito."
    >
      <StepGuide
        steps={[
          "Verifique sus datos. Provienen del paso anterior; corríjalos en esta sección si alguno ha cambiado.",
          "Seleccione su maestría y, a continuación, el trimestre con el que inicia. Los cursos correspondientes a ese trimestre se agregan de forma automática.",
          "Si requiere un curso adicional o repetir alguno, regístrelo en el apartado siguiente. De lo contrario, puede dejarlo vacío.",
          "Indique la forma de pago, registre su firma y presione el botón para guardar.",
        ]}
        outcome="Esta ficha es la que respalda la asignación de sus cursos. Puede abrirla y modificarla mientras su inscripción permanezca abierta."
      />

      <div className="space-y-8">
        <div>
          <p className="mb-3 text-[10.5px] font-bold uppercase tracking-[0.14em] text-isel-ink/45">Tus datos</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Primer apellido *">
              <input className={fieldClass} disabled={readOnly} value={primerApellido} onChange={(e) => { setPrimerApellido(e.target.value); setNombreTocado(true); setSaved(false); }} />
            </Field>
            <Field label="Segundo apellido">
              <input className={fieldClass} disabled={readOnly} value={segundoApellido ?? ""} onChange={(e) => { setSegundoApellido(e.target.value); setNombreTocado(true); setSaved(false); }} />
            </Field>
            <Field label="Primer nombre *">
              <input className={fieldClass} disabled={readOnly} value={primerNombre} onChange={(e) => { setPrimerNombre(e.target.value); setNombreTocado(true); setSaved(false); }} />
            </Field>
            <Field label="Segundo nombre">
              <input className={fieldClass} disabled={readOnly} value={segundoNombre ?? ""} onChange={(e) => { setSegundoNombre(e.target.value); setNombreTocado(true); setSaved(false); }} />
            </Field>
          </div>
          {nombrePrellenado && (
            <p className="mt-2.5 flex items-start gap-2 text-[12px] leading-relaxed text-isel-ink/45">
              <Icon name="sparkle" size={13} className="mt-0.5 shrink-0 text-isel-gold2" />
              Repartimos aquí el nombre que escribiste en tu preinscripción. Si algún apellido o nombre
              quedó en la casilla equivocada, corrígelo.
            </p>
          )}
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
              <EmptyState icon="layers" title="Aún no ha seleccionado una maestría" hint="Seleccione una del listado anterior para consultar su pénsum y elegir el trimestre." />
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

        <div id="paso-asignacion-firma">
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

          {/* Misma forma de pago, visible y no solo una fila más entre las de sí/no — ver el
              comentario gemelo en CourseAssignmentForm. */}
          <div
            className={`mt-6 rounded-xl border-2 px-5 py-5 transition-colors duration-300 ease-crisp ${
              tipoPago ? "border-isel-emerald/40 bg-isel-emerald/[0.05]" : "border-isel-gold2/55 bg-isel-gold2/[0.07]"
            }`}
          >
            <div className="mb-1.5 flex items-center gap-2">
              <Icon name={tipoPago ? "check" : "card"} size={17} className={tipoPago ? "text-isel-emerald" : "text-isel-gold2"} />
              <p className="text-[14.5px] font-semibold text-isel-navy">¿Cómo va a realizar su pago?</p>
            </div>
            <p className="mb-4 text-[12.5px] leading-relaxed text-isel-ink/60">
              {tipoPago
                ? "Queda registrado en su ficha. Si se equivocó, puede cambiarlo antes de guardar."
                : "Elija una de las dos opciones. Si no lo indica, Coordinación tendrá que escribirle para preguntárselo."}
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {([
                { value: "Link", label: "Link de pago", hint: "Le envían un enlace para pagar en línea", icon: "globe" },
                { value: "Presencial", label: "Presencial", hint: "Paga directamente en caja", icon: "card" },
              ] as const).map((op) => {
                const elegido = tipoPago === op.value;
                return (
                  <button
                    key={op.value}
                    type="button"
                    disabled={readOnly}
                    aria-pressed={elegido}
                    onClick={() => { setTipoPago(op.value); setSaved(false); }}
                    className={`flex items-start gap-3 rounded-xl border-2 px-4 py-3.5 text-left transition-all duration-300 ease-crisp disabled:cursor-default disabled:opacity-60 ${
                      elegido
                        ? "border-isel-emerald bg-white shadow-card-hover"
                        : "border-isel-line bg-white/70 hover:enabled:border-isel-emerald/45 hover:enabled:bg-white"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-300 ease-crisp ${
                        elegido ? "border-isel-emerald bg-isel-emerald text-white" : "border-isel-ink/25"
                      }`}
                    >
                      {elegido && <Icon name="check" size={11} />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13.5px] font-semibold text-isel-navy">{op.label}</span>
                      <span className="mt-0.5 block text-[12px] leading-snug text-isel-ink/55">{op.hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>
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

        {!readOnly && (
          <div className="flex justify-end border-t border-isel-line pt-5">
            <PortalButton tone="accent" icon="save" onClick={() => void guardar()} loading={saving}>Guardar asignación de cursos</PortalButton>
          </div>
        )}
      </div>

      {savedSummary && (
        <FichaEnviadaModal
          open
          onClose={() => setSavedSummary(null)}
          nombre={joinNombreCompleto(savedSummary)}
          rows={[
            { label: "Carrera / maestría", value: savedSummary.carrera },
            { label: "Trimestre", value: String(savedSummary.trimestre) },
            { label: "Sección", value: savedSummary.seccion || "No especificada" },
            { label: "Cursos asignados", value: String(savedSummary.cursosAsignados.length) },
            { label: "Cursos adicionales", value: String(savedSummary.cursosAdicionales.length) },
            { label: "Firma", value: savedSummary.firmaBase64 ? "Registrada" : "No registrada" },
          ]}
          onVerFicha={() => openAsignacionInscripcionPdf(applicantId)}
          nota="No hace falta volver a guardar. Si necesita corregir algo, edite el formulario y guarde de nuevo."
        />
      )}

      {/* Ver el comentario gemelo en CourseAssignmentForm: el botón de guardar vive en el pie del
          asistente y el recuadro de la firma suele quedar fuera de pantalla, así que hace falta
          algo que tape la página y que, al cerrarse, deje viendo el recuadro que falta. */}
      <Modal open={faltaFirma} onClose={() => setFaltaFirma(false)} title="Falta su firma" widthClassName="max-w-md">
        <div className="space-y-5">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-isel-alert/10 text-isel-alert">
              <Icon name="pen" size={22} />
            </span>
            <p className="pt-0.5 text-[13.5px] leading-relaxed text-isel-ink">
              No se puede enviar la ficha sin firmar. La firma es lo que hace válido el documento que
              presenta en Secretaría.
            </p>
          </div>
          <p className="text-[12.5px] leading-relaxed text-isel-ink/55">
            Al cerrar esta ventana lo llevamos al recuadro de la firma. Puede firmar con el dedo desde
            un teléfono o con el ratón desde una computadora, y borrarla para repetirla si no queda bien.
          </p>
          <div className="flex justify-end border-t border-isel-line pt-4">
            <PortalButton
              tone="primary"
              icon="arrowRight"
              iconRight
              onClick={() => {
                setFaltaFirma(false);
                document.getElementById("paso-asignacion-firma")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              Ir a firmar
            </PortalButton>
          </div>
        </div>
      </Modal>

      {confirmDialog}
    </PortalPanel>
  );
},
);
