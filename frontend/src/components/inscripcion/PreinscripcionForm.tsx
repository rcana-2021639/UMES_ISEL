import { useEffect, useRef, useState } from "react";
import { PortalPanel } from "@/components/portal/PortalShell";
import { StepGuide } from "@/components/portal/StepGuide";
import { SignaturePad, type SignaturePadHandle } from "@/components/portal/SignaturePad";
import { Icon } from "@/components/portal/Icon";
import { Alert, Field, PortalButton, fieldClass } from "@/components/portal/kit";
import { ChoiceRow } from "@/components/portal/CourseAssignmentForm";
import { getCarreras } from "@/lib/coursesApi";
import { savePreinscripcion } from "@/lib/inscripcionesApi";
import { ApiError } from "@/lib/http";
import type { Preinscripcion, PreinscripcionInput, PuebloPertenencia } from "@/types/inscripcion";

const PUEBLOS: { value: PuebloPertenencia; label: string }[] = [
  { value: "Maya", label: "Maya" },
  { value: "Garifuna", label: "Garífuna" },
  { value: "Extranjero", label: "Extranjero" },
  { value: "Xinka", label: "Xinka" },
  { value: "Ladino", label: "Ladino" },
  { value: "Afroascendiente", label: "Afroascendiente/Creole/Afromestizo" },
];

function blank(): PreinscripcionInput {
  return {
    nombreCompleto: "",
    dpi: "",
    noPasaporte: "",
    carrera: "",
    jornada: "",
    fechaNacimiento: "",
    genero: "",
    lugarNacimiento: "",
    nacionalidad: "Guatemalteca",
    direccionCompleta: "",
    departamento: "",
    municipio: "",
    estadoCivil: "",
    comunidadLinguistica: "",
    puebloPertenencia: null,
    idiomaMaterno: "",
    correoElectronico: "",
    telefonoCelular: "",
    telefonoCasa: "",
    emergencia1Nombre: "",
    emergencia1Telefono: "",
    emergencia2Nombre: "",
    emergencia2Telefono: "",
    tieneAlergia: false,
    alergiaDescripcion: "",
    tieneProblemaSalud: false,
    saludDescripcion: "",
    firmaBase64: null,
  };
}

interface PreinscripcionFormProps {
  applicantId: number;
  initial: Preinscripcion | null;
  onSaved: (p: Preinscripcion) => void;
  readOnly?: boolean;
}

/** Sección 1 del wizard de Inscripción — mismo formato que la ficha "FICHA DE PREINSCRIPCIÓN PARA NUEVO INGRESO". */
export function PreinscripcionForm({ applicantId, initial, onSaved, readOnly = false }: PreinscripcionFormProps) {
  const [form, setForm] = useState<PreinscripcionInput>(initial ?? blank());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  // null mientras carga; [] si la API no responde — entonces el campo vuelve a
  // ser de texto libre en vez de dejar al aspirante sin poder escribir nada.
  const [carreras, setCarreras] = useState<string[] | null>(null);
  const signatureRef = useRef<SignaturePadHandle>(null);

  useEffect(() => {
    setForm(initial ?? blank());
  }, [initial]);

  useEffect(() => {
    let active = true;
    getCarreras()
      .then((list) => active && setCarreras(list))
      .catch(() => active && setCarreras([]));
    return () => {
      active = false;
    };
  }, []);

  function set<K extends keyof PreinscripcionInput>(key: K, value: PreinscripcionInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombreCompleto.trim() || !form.carrera.trim()) {
      setError("Nombre completo y carrera son obligatorios.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const firma = signatureRef.current?.getSignature() ?? form.firmaBase64 ?? null;
      // fechaNacimiento es un DateOnly? en el backend — un string vacío no deserializa como "sin
      // fecha", tiene que viajar como null.
      const saved = await savePreinscripcion(applicantId, {
        ...form,
        fechaNacimiento: form.fechaNacimiento || null,
        firmaBase64: firma,
      });
      onSaved(saved);
      setSaved(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo guardar la preinscripción.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PortalPanel
      id="paso-preinscripcion"
      step="01"
      accent="#12855C"
      title="Ficha de preinscripción"
      description="Los datos personales con los que quedas registrado como aspirante de nuevo ingreso."
    >
      <StepGuide
        steps={[
          "Escribe tu nombre y tus apellidos tal como aparecen en tu DPI o pasaporte. Sin abreviar.",
          "Sigue hacia abajo llenando lo que te pregunte: los campos con asterisco (*) son los únicos obligatorios.",
          "Elige la maestría que vas a estudiar en la lista.",
          "Al final firma en el recuadro con el dedo o con el ratón, y pulsa el botón verde de guardar.",
        ]}
        outcome="Con eso quedas registrado como aspirante. Si te tienes que ir, no pasa nada: vuelves con tu mismo DPI y sigues donde lo dejaste."
      />

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nombre completo *">
            <input className={fieldClass} disabled={readOnly} value={form.nombreCompleto} onChange={(e) => set("nombreCompleto", e.target.value)} />
          </Field>
          <Field label="Carrera / maestría *" hint={carreras === null ? "Cargando las maestrías…" : undefined}>
            {carreras !== null && carreras.length > 0 ? (
              <select
                className={fieldClass}
                disabled={readOnly}
                value={form.carrera}
                onChange={(e) => set("carrera", e.target.value)}
              >
                <option value="">Elige tu maestría…</option>
                {/* Un valor guardado con otra grafía (o de una maestría retirada del
                    catálogo) seguiría siendo válido: se añade para no perderlo. */}
                {form.carrera && !carreras.includes(form.carrera) && <option value={form.carrera}>{form.carrera}</option>}
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
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="DPI">
            <input className={fieldClass} disabled={readOnly} value={form.dpi ?? ""} onChange={(e) => set("dpi", e.target.value)} />
          </Field>
          <Field label="No. de pasaporte" hint="Solo si eres extranjero.">
            <input className={fieldClass} disabled={readOnly} value={form.noPasaporte ?? ""} onChange={(e) => set("noPasaporte", e.target.value)} />
          </Field>
          <Field label="Jornada">
            <input className={fieldClass} disabled={readOnly} value={form.jornada ?? ""} onChange={(e) => set("jornada", e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Fecha de nacimiento">
            <input type="date" className={fieldClass} disabled={readOnly} value={form.fechaNacimiento ?? ""} onChange={(e) => set("fechaNacimiento", e.target.value)} />
          </Field>
          <Field label="Género">
            <input className={fieldClass} disabled={readOnly} value={form.genero ?? ""} onChange={(e) => set("genero", e.target.value)} />
          </Field>
          <Field label="Lugar de nacimiento">
            <input className={fieldClass} disabled={readOnly} value={form.lugarNacimiento ?? ""} onChange={(e) => set("lugarNacimiento", e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Nacionalidad">
            <input className={fieldClass} disabled={readOnly} value={form.nacionalidad ?? ""} onChange={(e) => set("nacionalidad", e.target.value)} />
          </Field>
          <Field label="Departamento">
            <input className={fieldClass} disabled={readOnly} value={form.departamento ?? ""} onChange={(e) => set("departamento", e.target.value)} />
          </Field>
          <Field label="Municipio">
            <input className={fieldClass} disabled={readOnly} value={form.municipio ?? ""} onChange={(e) => set("municipio", e.target.value)} />
          </Field>
        </div>

        <Field label="Dirección completa">
          <input className={fieldClass} disabled={readOnly} value={form.direccionCompleta ?? ""} onChange={(e) => set("direccionCompleta", e.target.value)} />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Estado civil">
            <input className={fieldClass} disabled={readOnly} value={form.estadoCivil ?? ""} onChange={(e) => set("estadoCivil", e.target.value)} />
          </Field>
          <Field label="Comunidad lingüística">
            <input className={fieldClass} disabled={readOnly} value={form.comunidadLinguistica ?? ""} onChange={(e) => set("comunidadLinguistica", e.target.value)} />
          </Field>
          <Field label="Idioma materno">
            <input className={fieldClass} disabled={readOnly} value={form.idiomaMaterno ?? ""} onChange={(e) => set("idiomaMaterno", e.target.value)} />
          </Field>
        </div>

        <div>
          <span className="mb-2 block text-[10.5px] font-bold uppercase tracking-[0.14em] text-isel-ink/45">Pueblo de pertenencia</span>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {PUEBLOS.map((p) => {
              const active = form.puebloPertenencia === p.value;
              return (
                <button
                  key={p.value}
                  type="button"
                  disabled={readOnly}
                  onClick={() => set("puebloPertenencia", p.value)}
                  aria-pressed={active}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-[12.5px] font-semibold leading-snug transition-colors duration-300 ease-crisp disabled:cursor-default ${
                    active ? "border-isel-emerald bg-isel-emerald/[0.08] text-isel-navy" : "border-isel-line text-isel-ink/65 hover:enabled:border-isel-navy/30"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${active ? "bg-isel-emerald text-white" : "bg-isel-paper text-transparent"}`}
                  >
                    <Icon name="check" size={12} />
                  </span>
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        <Field label="Correo electrónico">
          <input type="email" className={fieldClass} disabled={readOnly} value={form.correoElectronico ?? ""} onChange={(e) => set("correoElectronico", e.target.value)} />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Teléfono celular">
            <input className={fieldClass} disabled={readOnly} value={form.telefonoCelular ?? ""} onChange={(e) => set("telefonoCelular", e.target.value)} />
          </Field>
          <Field label="Teléfono de casa">
            <input className={fieldClass} disabled={readOnly} value={form.telefonoCasa ?? ""} onChange={(e) => set("telefonoCasa", e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Contacto de emergencia 1 — nombre">
            <input className={fieldClass} disabled={readOnly} value={form.emergencia1Nombre ?? ""} onChange={(e) => set("emergencia1Nombre", e.target.value)} />
          </Field>
          <Field label="Contacto de emergencia 1 — teléfono">
            <input className={fieldClass} disabled={readOnly} value={form.emergencia1Telefono ?? ""} onChange={(e) => set("emergencia1Telefono", e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Contacto de emergencia 2 — nombre">
            <input className={fieldClass} disabled={readOnly} value={form.emergencia2Nombre ?? ""} onChange={(e) => set("emergencia2Nombre", e.target.value)} />
          </Field>
          <Field label="Contacto de emergencia 2 — teléfono">
            <input className={fieldClass} disabled={readOnly} value={form.emergencia2Telefono ?? ""} onChange={(e) => set("emergencia2Telefono", e.target.value)} />
          </Field>
        </div>

        <div className="space-y-3">
          <ChoiceRow
            label="¿Tiene alguna alergia?"
            options={[{ value: "no", label: "No" }, { value: "si", label: "Sí" }]}
            value={form.tieneAlergia ? "si" : "no"}
            onChange={(v) => set("tieneAlergia", v === "si")}
            disabled={readOnly}
          />
          {form.tieneAlergia && (
            <Field label="Describa la alergia">
              <input className={fieldClass} disabled={readOnly} value={form.alergiaDescripcion ?? ""} onChange={(e) => set("alergiaDescripcion", e.target.value)} />
            </Field>
          )}
          <ChoiceRow
            label="¿Padece de problemas de salud?"
            options={[{ value: "no", label: "No" }, { value: "si", label: "Sí" }]}
            value={form.tieneProblemaSalud ? "si" : "no"}
            onChange={(v) => set("tieneProblemaSalud", v === "si")}
            disabled={readOnly}
          />
          {form.tieneProblemaSalud && (
            <Field label="Describa el problema de salud">
              <input className={fieldClass} disabled={readOnly} value={form.saludDescripcion ?? ""} onChange={(e) => set("saludDescripcion", e.target.value)} />
            </Field>
          )}
        </div>

        {!readOnly && (
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-[13px] font-semibold text-isel-ink">
                <Icon name="pen" size={16} className="text-isel-gold2" />
                Firma digital
              </p>
              <PortalButton tone="quiet" size="sm" icon="eraser" onClick={() => signatureRef.current?.clear()}>
                Limpiar firma
              </PortalButton>
            </div>
            <SignaturePad ref={signatureRef} initialValue={form.firmaBase64} className="max-w-md" key={applicantId} />
          </div>
        )}

        {error && <Alert kind="error">{error}</Alert>}
        {saved && !error && <Alert kind="ok">Preinscripción guardada.</Alert>}

        {!readOnly && (
          <div className="flex justify-end border-t border-isel-line pt-5">
            <PortalButton type="submit" tone="accent" icon="save" loading={saving}>
              Guardar preinscripción
            </PortalButton>
          </div>
        )}
      </form>
    </PortalPanel>
  );
}
