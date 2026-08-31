import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Alert, Field, PortalButton, fieldClass } from "@/components/portal/kit";
import { migrarAspirante } from "@/lib/inscripcionesApi";
import { ApiError } from "@/lib/http";
import type { Applicant } from "@/types/inscripcion";
import type { Student } from "@/types/student";

/**
 * "Agregar a la base de datos" — una vez el otro departamento ya asignó carné y sección, este modal
 * pide justo esos dos datos (más el trimestre, por si cambió) y crea el alumno real, con su ficha de
 * asignación sembrada desde lo que el aspirante ya llenó a mano.
 */
export function MigrarAspiranteModal({
  applicant,
  open,
  onClose,
  onMigrated,
}: {
  applicant: Applicant;
  open: boolean;
  onClose: () => void;
  onMigrated: (student: Student) => void;
}) {
  const [carnet, setCarnet] = useState("");
  const [seccion, setSeccion] = useState(applicant.asignacion?.seccion ?? "");
  const [trimestre, setTrimestre] = useState<number | "">(applicant.asignacion?.trimestre ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!carnet.trim()) {
      setError("El carné es obligatorio.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const student = await migrarAspirante(applicant.id, {
        carnet: carnet.trim(),
        seccion: seccion.trim() || null,
        trimestre: trimestre === "" ? null : trimestre,
      });
      onMigrated(student);
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo migrar el aspirante.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Agregar a la base de datos" widthClassName="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-[13px] leading-relaxed text-isel-ink/65">
          <strong className="text-isel-navy">{applicant.nombreCompleto}</strong> pasará de la tabla de
          inscripciones a la de alumnos asignados, con su ficha de asignación de cursos ya sembrada.
          Escribe el carné y la sección que le dio el otro departamento.
        </p>

        <Field label="Carné *">
          <input autoFocus className={fieldClass} value={carnet} onChange={(e) => setCarnet(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Sección">
            <input className={fieldClass} value={seccion} onChange={(e) => setSeccion(e.target.value)} />
          </Field>
          <Field label="Trimestre">
            <input
              type="number"
              className={fieldClass}
              value={trimestre}
              onChange={(e) => setTrimestre(e.target.value ? Number(e.target.value) : "")}
            />
          </Field>
        </div>

        {error && <Alert kind="error">{error}</Alert>}

        <div className="flex justify-end gap-3 border-t border-isel-line pt-4">
          <PortalButton tone="ghost" onClick={onClose}>Cancelar</PortalButton>
          <PortalButton type="submit" tone="accent" icon="check" loading={saving}>Agregar a la base de datos</PortalButton>
        </div>
      </form>
    </Modal>
  );
}
