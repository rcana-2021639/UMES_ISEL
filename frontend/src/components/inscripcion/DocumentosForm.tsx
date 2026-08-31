import { useRef, useState } from "react";
import { PortalPanel } from "@/components/portal/PortalShell";
import { Icon } from "@/components/portal/Icon";
import { Alert, Chip, PortalButton } from "@/components/portal/kit";
import { deleteDocumento, uploadDocumento } from "@/lib/inscripcionesApi";
import { ApiError } from "@/lib/http";
import {
  DOCUMENTO_LABELS,
  DOCUMENTO_TIPOS_EXTRANJERO,
  DOCUMENTO_TIPOS_NACIONAL,
  type ApplicantDocument,
  type DocumentoTipo,
} from "@/types/inscripcion";

interface DocumentosFormProps {
  applicantId: number;
  esExtranjero: boolean;
  documentos: ApplicantDocument[];
  onChanged: (documentos: ApplicantDocument[]) => void;
  readOnly?: boolean;
}

/**
 * Sección 4 del wizard — opcional: sube uno a la vez lo que pide la carta de compromiso. Si a alguien
 * solo le falta el DPI, sube solo el DPI — nada obliga a resubir lo que ya estaba.
 */
export function DocumentosForm({ applicantId, esExtranjero, documentos, onChanged, readOnly = false }: DocumentosFormProps) {
  const tipos = esExtranjero ? [...DOCUMENTO_TIPOS_NACIONAL, ...DOCUMENTO_TIPOS_EXTRANJERO] : DOCUMENTO_TIPOS_NACIONAL;
  const subidos = documentos.length;

  return (
    <PortalPanel
      id="paso-documentos"
      step="04"
      accent="#2C6E8F"
      title="Documentos de la carta de compromiso"
      description="Opcional — puedes seguir sin ellos y subirlos más adelante. Solo se aceptan archivos en PDF."
      actions={
        <Chip tone={subidos === tipos.length ? "emerald" : subidos > 0 ? "gold" : "neutral"} icon={subidos === tipos.length ? "check" : "file"}>
          {subidos} de {tipos.length}
        </Chip>
      }
    >
      <ul className="divide-y divide-isel-line overflow-hidden rounded-xl border border-isel-line">
        {tipos.map((tipo) => (
          <DocumentoRow
            key={tipo}
            applicantId={applicantId}
            tipo={tipo}
            doc={documentos.find((d) => d.tipo === tipo) ?? null}
            readOnly={readOnly}
            onChanged={(doc, removed) => {
              if (removed) {
                onChanged(documentos.filter((d) => d.tipo !== tipo));
              } else if (doc) {
                onChanged([...documentos.filter((d) => d.tipo !== tipo), doc]);
              }
            }}
          />
        ))}
      </ul>
    </PortalPanel>
  );
}

function DocumentoRow({
  applicantId,
  tipo,
  doc,
  readOnly,
  onChanged,
}: {
  applicantId: number;
  tipo: DocumentoTipo;
  doc: ApplicantDocument | null;
  readOnly?: boolean;
  onChanged: (doc: ApplicantDocument | null, removed: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const saved = await uploadDocumento(applicantId, tipo, file);
      onChanged(saved, false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo subir el archivo.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    setError(null);
    try {
      await deleteDocumento(applicantId, tipo);
      onChanged(null, true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo quitar el archivo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="flex flex-col gap-2 px-4 py-3.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            aria-hidden
            className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
              doc ? "bg-isel-emerald/10 text-isel-emerald" : "bg-isel-paper text-isel-ink/35"
            }`}
          >
            <Icon name={doc ? "check" : "file"} size={14} />
          </span>
          <div className="min-w-0">
            <p className="text-[13.5px] leading-snug text-isel-ink">{DOCUMENTO_LABELS[tipo]}</p>
            {doc && <p className="mt-0.5 truncate text-[11.5px] text-isel-ink/45">{doc.fileName}</p>}
          </div>
        </div>

        {!readOnly && (
          <div className="flex shrink-0 items-center gap-1.5">
            <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFile} />
            <PortalButton tone="ghost" size="sm" icon="upload" loading={busy} onClick={() => inputRef.current?.click()}>
              {doc ? "Reemplazar" : "Subir PDF"}
            </PortalButton>
            {doc && (
              <PortalButton tone="quiet" size="sm" icon="trash" disabled={busy} onClick={handleDelete}>
                Quitar
              </PortalButton>
            )}
          </div>
        )}
      </div>
      {error && <Alert kind="error">{error}</Alert>}
    </li>
  );
}
