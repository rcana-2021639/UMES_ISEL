import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/portal/Icon";
import { PortalButton, Segmented } from "@/components/portal/kit";
import { PreinscripcionForm } from "@/components/inscripcion/PreinscripcionForm";
import { AsignacionNuevoIngresoForm } from "@/components/inscripcion/AsignacionNuevoIngresoForm";
import { CartaCompromisoForm } from "@/components/inscripcion/CartaCompromisoForm";
import { DocumentosForm } from "@/components/inscripcion/DocumentosForm";
import { nombreNatural } from "@/lib/nombres";
import type { Applicant } from "@/types/inscripcion";

type Ficha = "preinscripcion" | "asignacion" | "compromiso" | "documentos";

const FICHAS: { value: Ficha; label: string }[] = [
  { value: "preinscripcion", label: "1 · Preinscripción" },
  { value: "asignacion", label: "2 · Asignación" },
  { value: "compromiso", label: "3 · Compromiso" },
  { value: "documentos", label: "Documentos" },
];

/**
 * "Ver fichas" / "Editar" / "Documentos" del panel de admin — las 3 fichas del aspirante y su
 * papelería, navegables con botones (no todas juntas), en modal. Abre siempre en consulta; pasar a
 * edición es un clic aparte, misma convención que el modal de ficha de Asignación.
 *
 * `startFicha` existe porque los documentos estaban aquí desde el principio pero enterrados detrás
 * de "Ver fichas" → cuarta pestaña: nadie los encontraba. Ahora la tabla trae su propio botón que
 * abre directamente en ellos.
 */
export function AspiranteFichasModal({
  applicant,
  open,
  onClose,
  onUpdated,
  startInEdit = false,
  startFicha = "preinscripcion",
}: {
  applicant: Applicant;
  open: boolean;
  onClose: () => void;
  onUpdated: (a: Applicant) => void;
  startInEdit?: boolean;
  startFicha?: Ficha;
}) {
  const [ficha, setFicha] = useState<Ficha>(startFicha);
  const [editing, setEditing] = useState(startInEdit);

  function handleClose() {
    setFicha(startFicha);
    setEditing(startInEdit);
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title={`Fichas — ${applicant.nombreCompleto || "Aspirante"}`} widthClassName="max-w-4xl">
      <div className="space-y-5">
        <div
          className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors duration-500 ease-crisp ${
            editing ? "border-isel-gold/40 bg-isel-gold/10" : "border-isel-line bg-isel-paper/70"
          }`}
        >
          <p className="flex items-center gap-2.5 text-[13px] font-semibold text-isel-navy">
            <Icon name={editing ? "pencil" : "eye"} size={16} className="text-isel-gold2" />
            {editing ? "Estás editando esta ficha" : "Estás consultando esta ficha"}
            <span className="font-normal text-isel-ink/45">
              {editing ? "— guarda cada sección por separado" : "— nada se puede modificar"}
            </span>
          </p>
          {editing ? (
            <PortalButton tone="ghost" size="sm" icon="close" onClick={() => setEditing(false)}>Salir de edición</PortalButton>
          ) : (
            <PortalButton tone="primary" size="sm" icon="pencil" onClick={() => setEditing(true)}>Editar ficha</PortalButton>
          )}
        </div>

        <Segmented value={ficha} onChange={setFicha} options={FICHAS} className="w-full" />

        <div className="max-h-[65vh] overflow-y-auto pr-1">
          {ficha === "preinscripcion" && (
            <PreinscripcionForm
              applicantId={applicant.id}
              initial={applicant.preinscripcion}
              readOnly={!editing}
              onSaved={(p) => onUpdated({ ...applicant, preinscripcion: p })}
            />
          )}
          {ficha === "asignacion" && (
            <AsignacionNuevoIngresoForm
              applicantId={applicant.id}
              initial={applicant.asignacion}
              nombreSugerido={applicant.preinscripcion?.nombreCompleto ?? applicant.nombreCompleto}
              readOnly={!editing}
              onSaved={(asn) => onUpdated({ ...applicant, asignacion: asn })}
            />
          )}
          {ficha === "compromiso" && (
            <CartaCompromisoForm
              applicantId={applicant.id}
              initial={applicant.compromiso}
              readOnly={!editing}
              defaults={{
                carrera: applicant.asignacion?.carrera ?? applicant.preinscripcion?.carrera,
                nombreCompleto:
                  applicant.preinscripcion?.nombreCompleto ||
                  (applicant.asignacion ? nombreNatural(applicant.asignacion) : applicant.nombreCompleto),
                dpi: applicant.dpi ?? applicant.preinscripcion?.dpi,
              }}
              onSaved={(c) => onUpdated({ ...applicant, compromiso: c })}
            />
          )}
          {ficha === "documentos" && (
            <DocumentosForm
              applicantId={applicant.id}
              esExtranjero={applicant.compromiso?.esExtranjero ?? applicant.esExtranjero}
              documentos={applicant.documentos}
              readOnly={!editing}
              onChanged={(documentos) => onUpdated({ ...applicant, documentos })}
            />
          )}
        </div>
      </div>
    </Modal>
  );
}
