import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import type { Student, StudentUpsertInput } from "@/types/student";
import { createStudent, updateStudent } from "@/lib/studentsApi";
import { ApiError } from "@/lib/http";
import { useConfirm } from "@/hooks/useConfirm";

const inputClass =
  "w-full rounded-lg border border-isel-line bg-white px-3 py-2 text-sm text-isel-ink transition-colors duration-200 focus:border-isel-navy focus:outline-none focus:ring-2 focus:ring-isel-navy/15";

function blank(): StudentUpsertInput {
  return {
    carnet: "",
    primerApellido: "",
    segundoApellido: "",
    primerNombre: "",
    segundoNombre: "",
    carrera: "",
    seccion: "",
    trimestre: undefined,
    correoInstitucional: "",
    correoPersonal: "",
    celular: "",
  };
}

interface StudentFormModalProps {
  open: boolean;
  onClose: () => void;
  /** Present when editing an existing student; absent for "Agregar alumno". */
  student?: Student | null;
  onSaved: (student: Student) => void;
}

/** Admin "Agregar / editar alumno" — every field the Excel roster/DB tracks, so nobody has to touch SQL by hand. */
export function StudentFormModal({ open, onClose, student, onSaved }: StudentFormModalProps) {
  const [form, setForm] = useState<StudentUpsertInput>(blank());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { confirm, dialog: confirmDialog } = useConfirm();

  useEffect(() => {
    if (open) {
      setForm(
        student
          ? {
              carnet: student.carnet,
              primerApellido: student.primerApellido,
              segundoApellido: student.segundoApellido ?? "",
              primerNombre: student.primerNombre,
              segundoNombre: student.segundoNombre ?? "",
              carrera: student.carrera,
              seccion: student.seccion ?? "",
              trimestre: student.trimestre ?? undefined,
              correoInstitucional: student.correoInstitucional ?? "",
              correoPersonal: student.correoPersonal ?? "",
              celular: student.celular ?? "",
            }
          : blank(),
      );
      setError(null);
    }
  }, [open, student]);

  function set<K extends keyof StudentUpsertInput>(key: K, value: StudentUpsertInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.carnet.trim() || !form.primerApellido.trim() || !form.primerNombre.trim() || !form.carrera.trim()) {
      setError("Carné, primer apellido, primer nombre y carrera son obligatorios.");
      return;
    }

    if (student) {
      const ok = await confirm({
        title: "Confirmar cambios",
        message: `¿Confirmas guardar los cambios de ${student.nombreCompleto}?`,
        confirmLabel: "Sí, guardar",
      });
      if (!ok) return;
    }

    setSaving(true);
    setError(null);
    try {
      const saved = student ? await updateStudent(student.id, form) : await createStudent(form);
      onSaved(saved);
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo guardar el alumno.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={student ? "Editar alumno" : "Agregar alumno"} widthClassName="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Carné *">
            <input className={inputClass} value={form.carnet} onChange={(e) => set("carnet", e.target.value)} />
          </Field>
          <Field label="Carrera *">
            <input className={inputClass} value={form.carrera} onChange={(e) => set("carrera", e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Primer apellido *">
            <input className={inputClass} value={form.primerApellido} onChange={(e) => set("primerApellido", e.target.value)} />
          </Field>
          <Field label="Segundo apellido">
            <input className={inputClass} value={form.segundoApellido ?? ""} onChange={(e) => set("segundoApellido", e.target.value)} />
          </Field>
          <Field label="Primer nombre *">
            <input className={inputClass} value={form.primerNombre} onChange={(e) => set("primerNombre", e.target.value)} />
          </Field>
          <Field label="Segundo nombre">
            <input className={inputClass} value={form.segundoNombre ?? ""} onChange={(e) => set("segundoNombre", e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Sección">
            <input className={inputClass} value={form.seccion ?? ""} onChange={(e) => set("seccion", e.target.value)} />
          </Field>
          <Field label="Sem/Trim">
            <input
              type="number"
              className={inputClass}
              value={form.trimestre ?? ""}
              onChange={(e) => set("trimestre", e.target.value ? Number(e.target.value) : undefined)}
            />
          </Field>
          <Field label="Celular">
            <input className={inputClass} value={form.celular ?? ""} onChange={(e) => set("celular", e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Correo institucional">
            <input className={inputClass} value={form.correoInstitucional ?? ""} onChange={(e) => set("correoInstitucional", e.target.value)} />
          </Field>
          <Field label="Correo personal">
            <input className={inputClass} value={form.correoPersonal ?? ""} onChange={(e) => set("correoPersonal", e.target.value)} />
          </Field>
        </div>

        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border-2 border-isel-line px-5 py-2 text-sm font-semibold text-isel-ink/70 hover:border-isel-navy hover:text-isel-navy"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-isel-navy px-5 py-2 text-sm font-semibold text-white transition-colors duration-300 hover:bg-isel-gold hover:text-isel-navy disabled:opacity-60"
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
      {confirmDialog}
    </Modal>
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
