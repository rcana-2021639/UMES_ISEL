import { useEffect, useRef, useState } from "react";
import { PortalPanel } from "@/components/portal/PortalShell";
import { Icon } from "@/components/portal/Icon";
import { Alert, Chip, PortalButton } from "@/components/portal/kit";
import { deleteStudentDocumento, getStudentDocumentos, uploadStudentDocumento } from "@/lib/studentDocumentsApi";
import { ApiError } from "@/lib/http";
import {
  DOCUMENTO_LABELS,
  DOCUMENTO_TIPOS_EXTRANJERO,
  DOCUMENTO_TIPOS_NACIONAL,
  type ApplicantDocument,
  type DocumentoTipo,
} from "@/types/inscripcion";

const TODOS_LOS_TIPOS = [...DOCUMENTO_TIPOS_NACIONAL, ...DOCUMENTO_TIPOS_EXTRANJERO];

/**
 * "¿Tiene su papelería al día?" — opcional, para un alumno que ya está asignado. Mismas categorías
 * que la carta de compromiso; como aquí no se sabe de antemano si es extranjero, se muestran las 8
 * — nada obliga a llenarlas todas. Si sube al menos un documento, el selector de impresión de la
 * ficha (ver AdminPortalPage) ofrece imprimirlos junto con o en vez de la ficha de asignación.
 */
export function StudentDocumentsPanel({ studentId }: { studentId: number }) {
  const [documentos, setDocumentos] = useState<ApplicantDocument[] | null>(null);

  useEffect(() => {
    let active = true;
    setDocumentos(null);
    getStudentDocumentos(studentId).then((docs) => active && setDocumentos(docs));
    return () => {
      active = false;
    };
  }, [studentId]);

  if (documentos === null) return null;

  return (
    <PortalPanel
      step="05"
      accent="#2C6E8F"
      title="¿Tiene su papelería al día?"
      description="Opcional — solo lo que ya se haya recibido en físico. Se puede subir uno a la vez, sin resubir lo que ya estaba."
      actions={
        <Chip tone={documentos.length === TODOS_LOS_TIPOS.length ? "emerald" : documentos.length > 0 ? "gold" : "neutral"} icon="file">
          {documentos.length} de {TODOS_LOS_TIPOS.length}
        </Chip>
      }
    >
      <ul className="divide-y divide-isel-line overflow-hidden rounded-xl border border-isel-line">
        {TODOS_LOS_TIPOS.map((tipo) => (
          <DocRow
            key={tipo}
            studentId={studentId}
            tipo={tipo}
            doc={documentos.find((d) => d.tipo === tipo) ?? null}
            onChanged={(doc, removed) => {
              setDocumentos((prev) => {
                const list = prev ?? [];
                if (removed) return list.filter((d) => d.tipo !== tipo);
                return doc ? [...list.filter((d) => d.tipo !== tipo), doc] : list;
              });
            }}
          />
        ))}
      </ul>
    </PortalPanel>
  );
}

function DocRow({
  studentId,
  tipo,
  doc,
  onChanged,
}: {
  studentId: number;
  tipo: DocumentoTipo;
  doc: ApplicantDocument | null;
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
      const saved = await uploadStudentDocumento(studentId, tipo, file);
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
      await deleteStudentDocumento(studentId, tipo);
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
          <span aria-hidden className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${doc ? "bg-isel-emerald/10 text-isel-emerald" : "bg-isel-paper text-isel-ink/35"}`}>
            <Icon name={doc ? "check" : "file"} size={14} />
          </span>
          <div className="min-w-0">
            <p className="text-[13.5px] leading-snug text-isel-ink">{DOCUMENTO_LABELS[tipo]}</p>
            {doc && <p className="mt-0.5 truncate text-[11.5px] text-isel-ink/45">{doc.fileName}</p>}
          </div>
        </div>
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
      </div>
      {error && <Alert kind="error">{error}</Alert>}
    </li>
  );
}
