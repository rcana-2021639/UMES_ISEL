import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { PortalPanel } from "@/components/portal/PortalShell";
import { StepGuide } from "@/components/portal/StepGuide";
import { SignaturePad, type SignaturePadHandle } from "@/components/portal/SignaturePad";
import { ChoiceRow } from "@/components/portal/CourseAssignmentForm";
import { FichaEnviadaModal } from "@/components/portal/FichaEnviadaModal";
import { Icon } from "@/components/portal/Icon";
import { Alert, Field, PortalButton, fieldClass } from "@/components/portal/kit";
import { getCarreras } from "@/lib/coursesApi";
import { openCompromisoPdf, saveCompromiso } from "@/lib/inscripcionesApi";
import { ApiError } from "@/lib/http";
import type { CartaCompromiso, CartaCompromisoInput } from "@/types/inscripcion";
import type { FichaHandle } from "./fichaHandle";

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
export const CartaCompromisoForm = forwardRef<FichaHandle, CartaCompromisoFormProps>(function CartaCompromisoForm(
  { applicantId, initial, defaults, onSaved, readOnly = false },
  ref,
) {
  const [form, setForm] = useState<CartaCompromisoInput>(initial ?? blank(defaults));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Ver el comentario gemelo en PreinscripcionForm: la señal que ya existía
      («cambió algo» / «acabo de guardar») es la que necesita el cierre del
      expediente para saber si le queda algo por mandar. */
  const [tocado, setTocado] = useState(false);
  function setSaved(v: boolean) {
    setTocado(!v);
  }
  // null mientras carga; [] si la API no responde — entonces el campo vuelve a
  // ser de texto libre en vez de dejar al aspirante sin poder escribir nada.
  const [carreras, setCarreras] = useState<string[] | null>(null);
  const signatureRef = useRef<SignaturePadHandle>(null);
  /** La ficha recién guardada, para el modal de confirmación — null si no hay nada que mostrar. */
  const [savedSummary, setSavedSummary] = useState<CartaCompromiso | null>(null);

  /**
   * El listado oficial de maestrías, el mismo que usan la preinscripción y la
   * ficha de asignación.
   *
   * Aquí el campo era de texto libre y eso rompía el expediente por dentro: la
   * misma persona escribía «Maestría en Fintech» en un paso y «fintech» en
   * otro, y como la carrera es lo que une la ficha con el pénsum, el nombre mal
   * tecleado no casaba con nada. Además obligaba a copiar a mano un título de
   * ochenta caracteres. Sale de la lista o no sale.
   */
  useEffect(() => {
    let active = true;
    getCarreras()
      .then((list) => active && setCarreras(list))
      .catch(() => active && setCarreras([]));
    return () => {
      active = false;
    };
  }, []);

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
    // Rellenar con lo que ya está guardado en otra ficha no es «tener cambios
    // sin mandar»: si lo fuera, el cierre intentaría guardar fichas que el
    // aspirante ni siquiera ha mirado.
    if (initial) setTocado(false);
  }, [initial, defaults.carrera, defaults.nombreCompleto, defaults.dpi]);

  function set<K extends keyof CartaCompromisoInput>(key: K, value: CartaCompromisoInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  /** Ver `guardar` en PreinscripcionForm: devuelve `null` si guardó, o el motivo. */
  async function guardar(): Promise<string | null> {
    if (!form.carrera.trim() || !form.nombreCompleto.trim() || !form.noDpi.trim()) {
      const motivo = "Carrera, nombre completo y DPI son obligatorios.";
      setError(motivo);
      return motivo;
    }
    setSaving(true);
    setError(null);
    try {
      const firma = signatureRef.current?.getSignature() ?? initial?.firmaBase64 ?? null;
      const savedC = await saveCompromiso(applicantId, { ...form, firmaBase64: firma });
      onSaved(savedC);
      setSaved(true);
      setSavedSummary(savedC);
      return null;
    } catch (e) {
      const motivo = e instanceof ApiError ? e.message : "No se pudo guardar la carta de compromiso.";
      setError(motivo);
      return motivo;
    } finally {
      setSaving(false);
    }
  }

  useImperativeHandle(ref, () => ({
    nombre: "Carta de compromiso",
    anclaId: "paso-compromiso",
    tieneCambios: () => !readOnly && tocado,
    guardar,
  }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await guardar();
  }

  return (
    <PortalPanel
      id="paso-compromiso"
      step="03"
      accent="#6D5AA8"
      title="Carta de compromiso"
      description="Confirmación de la documentación que usted debe entregar. Los archivos se adjuntan en el paso siguiente."
    >
      <StepGuide
        steps={[
          "Confirme que la maestría indicada corresponde a la de su interés; si no, elíjala en la lista.",
          "Indique si usted es estudiante extranjero. De ello depende la documentación que se le requerirá.",
          "Revise el listado de documentos que aparece a continuación. En este paso únicamente confirma que conoce dicho listado; todavía no debe adjuntar archivos.",
          "Registre su firma en el recuadro y presione el botón para guardar.",
        ]}
        outcome="La documentación se adjunta en el paso siguiente, de forma individual y cuando usted la tenga disponible."
      />

      <form onSubmit={handleSubmit} className="space-y-5">
        <Field
          label="Carrera / maestría *"
          hint={
            carreras === null
              ? "Cargando el listado de maestrías…"
              : form.carrera
                ? "Viene de su ficha de preinscripción. Puede cambiarla aquí si se equivocó."
                : undefined
          }
        >
          {carreras !== null && carreras.length > 0 ? (
            <select
              className={fieldClass}
              disabled={readOnly}
              value={form.carrera}
              onChange={(e) => set("carrera", e.target.value)}
            >
              <option value="">Seleccione su maestría…</option>
              {/* Un valor guardado con otra grafía (o de una maestría retirada del
                  catálogo) seguiría siendo válido: se añade para no perderlo. */}
              {form.carrera && !carreras.includes(form.carrera) && (
                <option value={form.carrera}>{form.carrera}</option>
              )}
              {carreras.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          ) : (
            <input className={fieldClass} disabled={readOnly} value={form.carrera} onChange={(e) => set("carrera", e.target.value)} />
          )}
        </Field>

        <ChoiceRow
          label="¿Es usted estudiante extranjero?"
          options={[{ value: "no", label: "No" }, { value: "si", label: "Sí" }]}
          value={form.esExtranjero ? "si" : "no"}
          onChange={(v) => set("esExtranjero", v === "si")}
          disabled={readOnly}
        />

        {form.esExtranjero && (
          <Alert kind="info">
            Como estudiante extranjero, en el paso siguiente se le pedirá el pasaporte, sus fotografías,
            el título de nivel medio apostillado y el título de pregrado.
          </Alert>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nombre completo *" hint={form.nombreCompleto ? "Viene de su ficha de preinscripción." : undefined}>
            <input className={fieldClass} disabled={readOnly} value={form.nombreCompleto} onChange={(e) => set("nombreCompleto", e.target.value)} />
          </Field>
          <Field label="No. de DPI *" hint={form.noDpi ? "Viene de su ficha de preinscripción." : undefined}>
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

        {!readOnly && (
          <div className="flex justify-end border-t border-isel-line pt-5">
            <PortalButton type="submit" tone="accent" icon="save" loading={saving}>Guardar carta de compromiso</PortalButton>
          </div>
        )}
      </form>

      {savedSummary && (
        <FichaEnviadaModal
          open
          onClose={() => setSavedSummary(null)}
          nombre={savedSummary.nombreCompleto}
          rows={[
            { label: "Carrera / maestría", value: savedSummary.carrera },
            { label: "DPI", value: savedSummary.noDpi },
            { label: "Estudiante extranjero", value: savedSummary.esExtranjero ? "Sí" : "No" },
            { label: "Firma", value: savedSummary.firmaBase64 ? "Registrada" : "No registrada" },
          ]}
          onVerFicha={() => openCompromisoPdf(applicantId)}
          nota="No hace falta volver a guardar. Si necesita corregir algo, edite el formulario y guarde de nuevo."
        />
      )}
    </PortalPanel>
  );
});
