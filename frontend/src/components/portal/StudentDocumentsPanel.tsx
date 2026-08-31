import { useEffect, useRef, useState } from "react";
import { PortalPanel } from "@/components/portal/PortalShell";
import { Icon } from "@/components/portal/Icon";
import { Alert, Chip, PortalButton, Segmented } from "@/components/portal/kit";
import { deleteStudentDocumento, getStudentDocumentoUrl, getStudentDocumentos, uploadStudentDocumento } from "@/lib/studentDocumentsApi";
import { setPapeleriaEnOrden } from "@/lib/studentsApi";
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
 * "¿Tiene su papelería al día?" — para un alumno que ya está asignado. Se pregunta primero: si dice
 * que sí, no se pide nada más (ya la entregó en físico); si dice que no, aparece el checklist para
 * subir SOLO lo que falte, uno a la vez. Mismas categorías que la carta de compromiso; como aquí no
 * se sabe de antemano si es extranjero, se muestran las 8 — nada obliga a llenarlas todas. Si sube
 * al menos un documento, el selector de impresión de la ficha (ver AdminPortalPage) ofrece
 * imprimirlos junto con o en vez de la ficha de asignación.
 */
export function StudentDocumentsPanel({
  studentId,
  papeleriaEnOrden,
  onPapeleriaChanged,
}: {
  studentId: number;
  papeleriaEnOrden: boolean;
  onPapeleriaChanged: (enOrden: boolean) => void;
}) {
  const [documentos, setDocumentos] = useState<ApplicantDocument[] | null>(null);
  const [savingRespuesta, setSavingRespuesta] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setDocumentos(null);
    getStudentDocumentos(studentId).then((docs) => active && setDocumentos(docs));
    return () => {
      active = false;
    };
  }, [studentId]);

  async function handleRespuesta(enOrden: boolean) {
    setSavingRespuesta(true);
    setError(null);
    try {
      await setPapeleriaEnOrden(studentId, enOrden);
      onPapeleriaChanged(enOrden);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo guardar la respuesta.");
    } finally {
      setSavingRespuesta(false);
    }
  }

  if (documentos === null) return null;

  return (
    <PortalPanel
      step="05"
      accent="#2C6E8F"
      title="¿Tiene su papelería al día?"
      description="Si ya entregó todo en físico, marca “Sí” y no hay nada más que hacer. Si le falta algo, marca “No” y sube solo lo que falte."
      actions={
        papeleriaEnOrden ? (
          <Chip tone="emerald" icon="check">Al día</Chip>
        ) : (
          <Chip tone={documentos.length === TODOS_LOS_TIPOS.length ? "emerald" : documentos.length > 0 ? "gold" : "neutral"} icon="file">
            {documentos.length} de {TODOS_LOS_TIPOS.length}
          </Chip>
        )
      }
    >
      <div className="mb-5">
        <Segmented
          value={papeleriaEnOrden ? "si" : "no"}
          disabled={savingRespuesta}
          onChange={(v) => handleRespuesta(v === "si")}
          options={[
            { value: "si" as const, label: "Sí, ya la entregó" },
            { value: "no" as const, label: "No, le falta papelería" },
          ]}
        />
      </div>

      {error && (
        <div className="mb-4">
          <Alert kind="error">{error}</Alert>
        </div>
      )}

      {papeleriaEnOrden ? (
        <Alert kind="ok">
          Este alumno tiene su expediente completo — no hace falta subir nada.
          {documentos.length > 0 && " Los documentos que ya se habían subido se conservan."}
        </Alert>
      ) : (
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
      )}
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
          {doc && (
            <PortalButton
              tone="ghost"
              size="sm"
              icon="eye"
              onClick={() => window.open(getStudentDocumentoUrl(studentId, tipo), "_blank", "noopener,noreferrer")}
            >
              Ver
            </PortalButton>
          )}
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
