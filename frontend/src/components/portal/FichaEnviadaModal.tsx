import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/portal/Icon";
import { PortalButton } from "@/components/portal/kit";

/**
 * El "sí se envió", en un modal.
 *
 * Nace del de Asignación de cursos (CourseAssignmentForm), que ya lo tenía: al guardar, un aviso de
 * una línea ("Ficha guardada.") no basta para que alguien confíe en que su trámite quedó hecho —
 * sobre todo cuando lo siguiente que hace es cerrar la pestaña. Aquí, en cambio, se ve exactamente lo
 * que quedó registrado y hay un botón para abrir la ficha real (el PDF con el que se presenta en
 * Secretaría), no solo la promesa de que se guardó.
 *
 * Se comparte entre las cuatro fichas que un aspirante o alumno llena por su cuenta —Preinscripción,
 * Asignación de cursos (inscripción y portal de alumno), Carta de compromiso y Solicitud de
 * título— para que las cuatro confirmen igual, en vez de que cada una invente su propio aviso.
 */
export function FichaEnviadaModal({
  open,
  onClose,
  nombre,
  rows,
  onVerFicha,
  onSeguirEditando,
  primaryLabel = "Cerrar",
  nota,
}: {
  open: boolean;
  onClose: () => void;
  /** El nombre del titular, para la frase de confirmación. */
  nombre: string;
  /** Lo que quedó registrado, en el orden en que debe leerse. */
  rows: { label: string; value: string }[];
  /** Abre el PDF de la ficha tal como quedó guardada. Si falta, no se muestra el botón. */
  onVerFicha?: () => Promise<void>;
  /** Botón secundario para volver al formulario sin cerrar el trámite. Si falta, no se muestra. */
  onSeguirEditando?: () => void;
  /** Rótulo del botón de cierre — "Cerrar" por defecto, "Volver al inicio" en algún caso. */
  primaryLabel?: string;
  /** Nota al pie, opcional (p.ej. "no hace falta volver a guardar"). */
  nota?: string;
}) {
  const [viendo, setViendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleVer() {
    if (!onVerFicha) return;
    setViendo(true);
    setError(null);
    try {
      await onVerFicha();
    } catch {
      setError("No se pudo abrir la ficha. Inténtelo de nuevo.");
    } finally {
      setViendo(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Ficha guardada" widthClassName="max-w-md">
      <div className="space-y-5">
        {/* El "sí quedó", sin ambigüedad.
            La confirmación era una línea de texto al lado de un icono, y se leía como un aviso más
            de la página: la gente volvía a pulsar Guardar por si acaso, o cerraba la pestaña sin
            saber si había funcionado. Un bloque verde entero, con la palabra en grande, no se
            confunde con nada. */}
        <div className="rounded-xl border border-isel-emerald/30 bg-isel-emerald/[0.07] px-5 py-4 text-center">
          <span className="mx-auto mb-2.5 flex h-12 w-12 items-center justify-center rounded-full bg-isel-emerald text-white">
            <Icon name="check" size={26} />
          </span>
          <p className="font-display text-[17px] font-semibold tracking-tightest text-isel-emerald">
            Se guardó correctamente
          </p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-isel-ink/65">
            La ficha de <strong className="text-isel-navy">{nombre}</strong> ya quedó registrada en el
            sistema.
          </p>
        </div>

        <p className="text-[12.5px] font-semibold text-isel-ink/60">Esto fue lo que se envió:</p>

        <dl className="divide-y divide-isel-line overflow-hidden rounded-xl border border-isel-line">
          {rows.map((r) => (
            <SummaryRow key={r.label} label={r.label} value={r.value} />
          ))}
        </dl>

        {error && <p className="text-[12.5px] font-semibold text-isel-alert">{error}</p>}

        {nota && <p className="text-[12px] leading-relaxed text-isel-ink/45">{nota}</p>}

        <div className="flex flex-wrap justify-end gap-3 border-t border-isel-line pt-4">
          {onVerFicha && (
            <PortalButton tone="ghost" icon="eye" loading={viendo} onClick={() => void handleVer()}>
              Ver ficha
            </PortalButton>
          )}
          {onSeguirEditando && (
            <PortalButton tone="ghost" onClick={onSeguirEditando}>
              Seguir editando
            </PortalButton>
          )}
          <PortalButton tone="primary" icon="arrowRight" iconRight onClick={onClose}>
            {primaryLabel}
          </PortalButton>
        </div>
      </div>
    </Modal>
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
