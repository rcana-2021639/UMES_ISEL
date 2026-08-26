import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { Student } from "@/types/student";
import type { AdditionalCourseRow, AssignedCourseRow, CourseAssignment } from "@/types/courseAssignment";
import { saveAssignment } from "@/lib/assignmentsApi";
import { SignaturePad, type SignaturePadHandle } from "@/components/portal/SignaturePad";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";

const ASSIGNED_SLOTS = 10;
const ADDITIONAL_SLOTS = 5;

function blankAssignedRows(): AssignedCourseRow[] {
  return Array.from({ length: ASSIGNED_SLOTS }, (_, i) => ({ numero: i + 1, curso: "", semTri: "", seccion: "" }));
}
function blankAdditionalRows(): AdditionalCourseRow[] {
  return Array.from({ length: ADDITIONAL_SLOTS }, (_, i) => ({
    numero: i + 1,
    cursoAdicional: "",
    carrera: "",
    semTri: "",
    seccion: "",
    jornada: "",
  }));
}

function mergeAssigned(rows: AssignedCourseRow[] | undefined): AssignedCourseRow[] {
  const blanks = blankAssignedRows();
  rows?.forEach((r) => {
    const idx = r.numero - 1;
    if (idx >= 0 && idx < blanks.length) blanks[idx] = { ...r };
  });
  return blanks;
}
function mergeAdditional(rows: AdditionalCourseRow[] | undefined): AdditionalCourseRow[] {
  const blanks = blankAdditionalRows();
  rows?.forEach((r) => {
    const idx = r.numero - 1;
    if (idx >= 0 && idx < blanks.length) blanks[idx] = { ...r };
  });
  return blanks;
}

const inputClass =
  "w-full rounded-lg border border-isel-line bg-white px-3 py-2 text-sm text-isel-ink transition-colors duration-200 focus:border-isel-navy focus:outline-none focus:ring-2 focus:ring-isel-navy/15";

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
  const [cursosAsignados, setCursosAsignados] = useState<AssignedCourseRow[]>(() => mergeAssigned(initialAssignment?.cursosAsignados));
  const [cursosAdicionales, setCursosAdicionales] = useState<AdditionalCourseRow[]>(() =>
    mergeAdditional(initialAssignment?.cursosAdicionales),
  );
  const [pendientesTrimestres, setPendientesTrimestres] = useState(initialAssignment?.tienePendientesTrimestres ?? false);
  const [pendientesMaterias, setPendientesMaterias] = useState(initialAssignment?.tienePendientesMaterias ?? false);
  const [correoContacto, setCorreoContacto] = useState(initialAssignment?.correoContacto ?? student.correoPersonal ?? student.correoInstitucional ?? "");
  const [telefonoContacto, setTelefonoContacto] = useState(initialAssignment?.telefonoContacto ?? student.celular ?? "");
  const [comprobantePagoNo, setComprobantePagoNo] = useState(initialAssignment?.comprobantePagoNo ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const signatureRef = useRef<SignaturePadHandle>(null);

  useEffect(() => {
    setCursosAsignados(mergeAssigned(initialAssignment?.cursosAsignados));
    setCursosAdicionales(mergeAdditional(initialAssignment?.cursosAdicionales));
    setPendientesTrimestres(initialAssignment?.tienePendientesTrimestres ?? false);
    setPendientesMaterias(initialAssignment?.tienePendientesMaterias ?? false);
    setCorreoContacto(initialAssignment?.correoContacto ?? student.correoPersonal ?? student.correoInstitucional ?? "");
    setTelefonoContacto(initialAssignment?.telefonoContacto ?? student.celular ?? "");
    setComprobantePagoNo(initialAssignment?.comprobantePagoNo ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAssignment?.id, student.id]);

  const fechaHoy = useMemo(
    () => new Date().toLocaleDateString("es-GT", { day: "2-digit", month: "2-digit", year: "numeric" }),
    [],
  );

  function updateAssignedField(index: number, field: keyof AssignedCourseRow, value: string) {
    setCursosAsignados((rows) => rows.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  }
  function updateAdditionalField(index: number, field: keyof AdditionalCourseRow, value: string) {
    setCursosAdicionales((rows) => rows.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const firma = signatureRef.current?.getSignature() ?? initialAssignment?.firmaBase64 ?? null;
      const saved = await saveAssignment({
        carnet: student.carnet,
        trimestre,
        cursosAsignados: cursosAsignados.filter((r) => r.curso.trim().length > 0),
        cursosAdicionales: cursosAdicionales.filter((r) => r.cursoAdicional.trim().length > 0),
        tienePendientesTrimestres: pendientesTrimestres,
        tienePendientesMaterias: pendientesMaterias,
        correoContacto: correoContacto || null,
        telefonoContacto: telefonoContacto || null,
        comprobantePagoNo: comprobantePagoNo || null,
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
          <span className="rounded-full bg-isel-paper px-2 py-0.5 text-xs font-semibold text-isel-navy">
            {cursosAsignados.filter((r) => r.curso.trim()).length}
          </span>
        </h3>
        <p className="mb-4 text-sm text-isel-ink/60">
          Anota el nombre correcto del curso o cursos que tienes actualmente asignados.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-isel-ink/50">
                <th className="w-10 pb-2">No.</th>
                <th className="pb-2">Curso</th>
                <th className="w-24 pb-2">Sem/Tri</th>
                <th className="w-24 pb-2">Sección</th>
              </tr>
            </thead>
            <tbody>
              {cursosAsignados.map((row, i) => (
                <tr key={row.numero}>
                  <td className="py-1.5 pr-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-isel-paper text-xs font-semibold text-isel-navy">
                      {row.numero}
                    </span>
                  </td>
                  <td className="py-1.5 pr-2">
                    <input
                      className={inputClass}
                      value={row.curso}
                      placeholder={`Curso ${row.numero}`}
                      onChange={(e) => updateAssignedField(i, "curso", e.target.value)}
                    />
                  </td>
                  <td className="py-1.5 pr-2">
                    <input className={inputClass} value={row.semTri ?? ""} onChange={(e) => updateAssignedField(i, "semTri", e.target.value)} />
                  </td>
                  <td className="py-1.5">
                    <input className={inputClass} value={row.seccion ?? ""} onChange={(e) => updateAssignedField(i, "seccion", e.target.value)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </RevealOnScroll>

      <RevealOnScroll delay={0.1} className="rounded-2xl bg-white p-6 shadow-card">
        <h3 className="mb-1 font-display text-lg font-semibold text-isel-navy">Cursos adicionales o cambio de sección</h3>
        <p className="mb-4 text-sm text-isel-ink/60">
          Anota el nombre correcto del curso o cursos que solicitas agregarte y/o cambiarte de sección.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-isel-ink/50">
                <th className="w-10 pb-2">No.</th>
                <th className="pb-2">Curso adicional</th>
                <th className="pb-2">Carrera</th>
                <th className="w-20 pb-2">Sem/Tri</th>
                <th className="w-20 pb-2">Sección</th>
                <th className="w-28 pb-2">Jornada</th>
              </tr>
            </thead>
            <tbody>
              {cursosAdicionales.map((row, i) => (
                <tr key={row.numero}>
                  <td className="py-1.5 pr-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-isel-paper text-xs font-semibold text-isel-navy">
                      {row.numero}
                    </span>
                  </td>
                  <td className="py-1.5 pr-2">
                    <input className={inputClass} value={row.cursoAdicional} onChange={(e) => updateAdditionalField(i, "cursoAdicional", e.target.value)} />
                  </td>
                  <td className="py-1.5 pr-2">
                    <input className={inputClass} value={row.carrera ?? ""} onChange={(e) => updateAdditionalField(i, "carrera", e.target.value)} />
                  </td>
                  <td className="py-1.5 pr-2">
                    <input className={inputClass} value={row.semTri ?? ""} onChange={(e) => updateAdditionalField(i, "semTri", e.target.value)} />
                  </td>
                  <td className="py-1.5 pr-2">
                    <input className={inputClass} value={row.seccion ?? ""} onChange={(e) => updateAdditionalField(i, "seccion", e.target.value)} />
                  </td>
                  <td className="py-1.5">
                    <select
                      className={inputClass}
                      value={row.jornada ?? ""}
                      onChange={(e) => updateAdditionalField(i, "jornada", e.target.value)}
                    >
                      <option value=""></option>
                      <option value="Matutina">Matutina</option>
                      <option value="Vespertina">Vespertina</option>
                      <option value="Nocturna">Nocturna</option>
                      <option value="Fin de semana">Fin de semana</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
