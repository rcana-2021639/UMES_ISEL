import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/portal/Icon";
import { PortalButton } from "@/components/portal/kit";

export type PrintSelection = "ficha" | "documentos" | "ambas";

/**
 * Se abre solo cuando el alumno tiene al menos un documento extra subido (papelería al día) — si no
 * tiene ninguno, "Imprimir" sigue yendo directo a la ficha, como siempre. Deja elegir qué imprimir:
 * la ficha de asignación, los documentos extra, o ambas cosas en un solo PDF.
 */
export function PrintOptionsModal({
  open,
  onClose,
  onPrint,
  printing,
}: {
  open: boolean;
  onClose: () => void;
  onPrint: (selection: PrintSelection) => void;
  printing: boolean;
}) {
  const [selection, setSelection] = useState<PrintSelection>("ficha");

  return (
    <Modal open={open} onClose={onClose} title="¿Qué quieres imprimir?" widthClassName="max-w-md">
      <div className="space-y-4">
        <p className="text-[13px] leading-relaxed text-isel-ink/60">
          Este alumno tiene documentos extra subidos además de su ficha de asignación.
        </p>

        <div className="space-y-2.5">
          <Option value="ficha" label="Solo la ficha de asignación" selection={selection} onSelect={setSelection} />
          <Option value="documentos" label="Solo los documentos extra" selection={selection} onSelect={setSelection} />
          <Option value="ambas" label="Ambas, en un solo PDF" selection={selection} onSelect={setSelection} />
        </div>

        <div className="flex justify-end gap-3 border-t border-isel-line pt-4">
          <PortalButton tone="ghost" onClick={onClose}>Cancelar</PortalButton>
          <PortalButton tone="accent" icon="printer" loading={printing} onClick={() => onPrint(selection)}>
            Imprimir
          </PortalButton>
        </div>
      </div>
    </Modal>
  );
}

function Option({
  value,
  label,
  selection,
  onSelect,
}: {
  value: PrintSelection;
  label: string;
  selection: PrintSelection;
  onSelect: (v: PrintSelection) => void;
}) {
  const active = selection === value;
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      aria-pressed={active}
      className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-[13.5px] font-semibold transition-colors duration-300 ease-crisp ${
        active ? "border-isel-emerald bg-isel-emerald/[0.07] text-isel-navy" : "border-isel-line text-isel-ink/70 hover:border-isel-navy/25"
      }`}
    >
      <span aria-hidden className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${active ? "border-isel-emerald bg-isel-emerald text-white" : "border-isel-line text-transparent"}`}>
        <Icon name="check" size={11} />
      </span>
      {label}
    </button>
  );
}
