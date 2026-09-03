import { useEffect, useRef, useState } from "react";
import { PortalPanel } from "@/components/portal/PortalShell";
import { StepGuide } from "@/components/portal/StepGuide";
import { SignaturePad, type SignaturePadHandle } from "@/components/portal/SignaturePad";
import { ChoiceRow } from "@/components/portal/CourseAssignmentForm";
import { Icon } from "@/components/portal/Icon";
import { Alert, Field, PortalButton, fieldClass } from "@/components/portal/kit";
import { saveCompromiso } from "@/lib/inscripcionesApi";
import { ApiError } from "@/lib/http";
import type { CartaCompromiso, CartaCompromisoInput } from "@/types/inscripcion";

interface CartaCompromisoFormProps {
  applicantId: number;
  initial: CartaCompromiso | null;
  /** Sugerencias para no volver a escribir lo mismo — de la preinscripción/asignación ya guardadas. */
  defaults: { carrera?: string | null; nombreCompleto?: string | null; dpi?: string | null };
  onSaved: (c: CartaCompromiso) => void;
  readOnly?: boolean;
}

function blank(defaults: CartaCompromisoFormProps["defaults"]): CartaCompromisoInput {
  return {
    carrera: defaults.carrera ?? "",
    esExtranjero: false,
    nombreCompleto: defaults.nombreCompleto ?? "",
    noDpi: defaults.dpi ?? "",
  };
}

/** Sección 3 del wizard — "Carta de compromiso". El checklist de documentos vive en la sección 4 (DocumentosForm). */
export function CartaCompromisoForm({ applicantId, initial, defaults, onSaved, readOnly = false }: CartaCompromisoFormProps) {
  const [form, setForm] = useState<CartaCompromisoInput>(initial ?? blank(defaults));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const signatureRef = useRef<SignaturePadHandle>(null);

  /**
   * Carrera, nombre y DPI ya se escribieron en la preinscripción: aquí solo se rellena
   * lo que siga vacío. Nunca se pisa lo que alguien haya escrito a mano, y por eso el
   * efecto también escucha a `defaults` — así el nombre baja hasta esta ficha en cuanto
   * se guarda la preinscripción, sin esperar a que se recargue la página.
   */
  useEffect(() => {
    setForm((actual) => {
      const base = initial ?? actual;
      return {
        ...base,
        carrera: base.carrera || defaults.carrera || "",
        nombreCompleto: base.nombreCompleto || defaults.nombreCompleto || "",
        noDpi: base.noDpi || defaults.dpi || "",
      };
    });
  }, [initial, defaults.carrera, defaults.nombreCompleto, defaults.dpi]);

  function set<K extends keyof CartaCompromisoInput>(key: K, value: CartaCompromisoInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.carrera.trim() || !form.nombreCompleto.trim() || !form.noDpi.trim()) {
      setError("Carrera, nombre completo y DPI son obligatorios.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const firma = signatureRef.current?.getSignature() ?? initial?.firmaBase64 ?? null;
      const savedC = await saveCompromiso(applicantId, { ...form, firmaBase64: firma });
      onSaved(savedC);
      setSaved(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo guardar la carta de compromiso.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PortalPanel
      id="paso-compromiso"
      step="03"
      accent="#6D5AA8"
      title="Carta de compromiso"
      description="Confirma que sabes qué documentos debes entregar. Súbelos en el siguiente paso, uno a la vez."
    >
      <StepGuide
        steps={[
          "Confirma que la maestría escrita arriba es la correcta.",
          "Dinos si eres estudiante extranjero: de eso depende qué papeles te van a pedir.",
          "Lee la lista de documentos que aparece debajo. Aquí solo estás diciendo que ya sabes cuáles son; todavía no hay que subir nada.",
          "Firma en el recuadro y pulsa guardar.",
        ]}
        outcome="Los documentos se suben en el paso siguiente, uno por uno y cuando los tengas listos."
      />

      <form onSubmit={handleSubmit} className="space-y-5">
        <Field label="Carrera / maestría *">
          <input className={fieldClass} disabled={readOnly} value={form.carrera} onChange={(e) => set("carrera", e.target.value)} />
        </Field>

        <ChoiceRow
          label="¿Eres estudiante extranjero?"
          options={[{ value: "no", label: "No" }, { value: "si", label: "Sí" }]}
          value={form.esExtranjero ? "si" : "no"}
          onChange={(v) => set("esExtranjero", v === "si")}
          disabled={readOnly}
        />

        {form.esExtranjero && (
          <Alert kind="info">
            Como estudiante extranjero, en el siguiente paso también podrás subir el pasaporte, tus
            fotografías, el título de nivel medio apostillado y el título de pre-grado.
          </Alert>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nombre completo *">
            <input className={fieldClass} disabled={readOnly} value={form.nombreCompleto} onChange={(e) => set("nombreCompleto", e.target.value)} />
          </Field>
          <Field label="No. de DPI *">
            <input className={fieldClass} disabled={readOnly} value={form.noDpi} onChange={(e) => set("noDpi", e.target.value)} />
          </Field>
        </div>

        {!readOnly && (
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-[13px] font-semibold text-isel-ink">
                <Icon name="pen" size={16} className="text-isel-gold2" /> Firma digital
              </p>
              <PortalButton tone="quiet" size="sm" icon="eraser" onClick={() => signatureRef.current?.clear()}>Limpiar firma</PortalButton>
            </div>
            <SignaturePad ref={signatureRef} initialValue={form.firmaBase64} className="max-w-md" key={applicantId} />
          </div>
        )}

        {error && <Alert kind="error">{error}</Alert>}
        {saved && !error && <Alert kind="ok">Carta de compromiso guardada.</Alert>}

        {!readOnly && (
          <div className="flex justify-end border-t border-isel-line pt-5">
            <PortalButton type="submit" tone="accent" icon="save" loading={saving}>Guardar carta de compromiso</PortalButton>
          </div>
        )}
      </form>
    </PortalPanel>
  );
}
