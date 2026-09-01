import { useEffect, useMemo, useRef, useState } from "react";
import { PortalPanel } from "@/components/portal/PortalShell";
import { SignaturePad, type SignaturePadHandle } from "@/components/portal/SignaturePad";
import { ChoiceRow } from "@/components/portal/CourseAssignmentForm";
import { Icon } from "@/components/portal/Icon";
import { Alert, Chip, Field, PortalButton, fieldClass } from "@/components/portal/kit";
import { FotoCapture } from "@/components/titulo/FotoCapture";
import { RejillaPreview } from "@/components/titulo/RejillaPreview";
import { saveSolicitudTitulo } from "@/lib/solicitudTituloApi";
import { ApiError } from "@/lib/http";
import {
  CAMPUS_OPCIONES,
  CASILLAS_APELLIDOS,
  CASILLAS_CARNET,
  CASILLAS_NOMBRES,
  type CampusSolicitud,
  type SolicitudTitulo,
  type SolicitudTituloInput,
} from "@/types/solicitudTitulo";

const ESTADOS_CIVILES = ["Soltero(a)", "Casado(a)", "Unido(a)", "Divorciado(a)", "Viudo(a)"];

function aInput(s: SolicitudTitulo): SolicitudTituloInput {
  return {
    campus: s.campus ?? null,
    participaCeremonia: s.participaCeremonia,
    nombres: s.nombres ?? "",
    apellidos: s.apellidos ?? "",
    fechaNacimiento: s.fechaNacimiento ?? "",
    estadoCivil: s.estadoCivil ?? "",
    sexo: s.sexo ?? null,
    direccionDomicilio: s.direccionDomicilio ?? "",
    telefonoDomicilio: s.telefonoDomicilio ?? "",
    telefonoCelular: s.telefonoCelular ?? "",
    telefonoEmergencia: s.telefonoEmergencia ?? "",
    correoElectronico: s.correoElectronico ?? "",
    empresa: s.empresa ?? "",
    cargo: s.cargo ?? "",
    direccionTrabajo: s.direccionTrabajo ?? "",
    telefonoTrabajo: s.telefonoTrabajo ?? "",
    facultadDepartamento: s.facultadDepartamento ?? "",
    tituloObtener: s.tituloObtener ?? "",
    fotoBase64: s.fotoBase64 ?? null,
    firmaBase64: s.firmaBase64 ?? null,
  };
}

interface SolicitudTituloFormProps {
  solicitud: SolicitudTitulo;
  onSaved: (s: SolicitudTitulo) => void;
  readOnly?: boolean;
  /**
   * La barra de guardado va fija al fondo de la ventana en la página pública, donde el formulario
   * ocupa toda la pantalla. Dentro del modal del panel de admin eso la sacaría del modal, así que
   * ahí se pide en línea, al final de la ficha.
   */
  stickyActions?: boolean;
}

/**
 * La ficha de Solicitud de Título, en pantalla.
 *
 * Se guarda de una sola vez (no por secciones como Inscripción) porque es un único papel: media
 * ficha guardada no sirve para imprimir nada. A cambio, el botón de guardar viaja en una barra fija
 * abajo con el recuento de lo que falta, así que nunca hay que ir a buscarlo al final del scroll.
 */
export function SolicitudTituloForm({ solicitud, onSaved, readOnly = false, stickyActions = true }: SolicitudTituloFormProps) {
  const [form, setForm] = useState<SolicitudTituloInput>(() => aInput(solicitud));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const signatureRef = useRef<SignaturePadHandle>(null);

  useEffect(() => {
    setForm(aInput(solicitud));
  }, [solicitud]);

  function set<K extends keyof SolicitudTituloInput>(key: K, value: SolicitudTituloInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  // Lo que falta para poder imprimir. Se calcula aquí y se muestra en la barra de abajo, para que
  // "guardar" nunca sea un salto al vacío.
  const faltantes = useMemo(() => {
    const falta: string[] = [];
    if (!form.nombres?.trim()) falta.push("tus nombres");
    if (!form.apellidos?.trim()) falta.push("tus apellidos");
    if (!form.campus) falta.push("la sede");
    if (!form.sexo) falta.push("el sexo");
    if (!form.fechaNacimiento) falta.push("la fecha de nacimiento");
    if (!form.correoElectronico?.trim()) falta.push("el correo");
    if (!form.tituloObtener?.trim()) falta.push("el título a obtener");
    if (!form.fotoBase64) falta.push("la fotografía");
    if (!form.firmaBase64 && !signatureRef.current?.getSignature()) falta.push("la firma");
    return falta;
  }, [form]);

  const nombresSobra = (form.nombres ?? "").length > CASILLAS_NOMBRES;
  const apellidosSobra = (form.apellidos ?? "").length > CASILLAS_APELLIDOS;

  async function handleSave() {
    if (!form.nombres?.trim() || !form.apellidos?.trim()) {
      setError("Tus nombres y apellidos son obligatorios: son los que se imprimen en el título.");
      return;
    }
    if (nombresSobra || apellidosSobra) {
      setError("El nombre no cabe en las casillas de la ficha. Ajústalo antes de guardar.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const firma = signatureRef.current?.getSignature() ?? form.firmaBase64 ?? null;
      const saved = await saveSolicitudTitulo(solicitud.id, {
        ...form,
        // El backend distingue "" (bórralo) de null (déjalo) — ver SolicitudesTituloController.Save.
        fechaNacimiento: form.fechaNacimiento || null,
        firmaBase64: firma,
      });
      onSaved(saved);
      setSaved(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo guardar tu solicitud.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`space-y-6 ${stickyActions ? "pb-24" : ""}`}>
      {/* ------------------------------------------------ 01 · sede y ceremonia */}
      <PortalPanel
        id="paso-sede"
        step="01"
        accent="#B8791F"
        title="Sede y ceremonia"
        description="Dónde estudiaste y si vas a participar en el acto de graduación."
      >
        <div>
          <span className="mb-2.5 block text-[10.5px] font-bold uppercase tracking-[0.14em] text-isel-ink/45">
            Sede *
          </span>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {CAMPUS_OPCIONES.map((c) => {
              const active = form.campus === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  disabled={readOnly}
                  aria-pressed={active}
                  onClick={() => set("campus", c.value as CampusSolicitud)}
                  className={`group/sede flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left text-[13px] font-semibold leading-snug transition-[background-color,border-color,color,transform,box-shadow] duration-400 ease-crisp disabled:cursor-default ${
                    active
                      ? "-translate-y-px border-isel-gold bg-isel-gold/[0.09] text-isel-navy shadow-[0_0_0_3px_rgba(232,179,61,0.14)]"
                      : "border-isel-line text-isel-ink/65 hover:enabled:-translate-y-px hover:enabled:border-isel-navy/30"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] border transition-colors duration-300 ease-crisp ${
                      active ? "border-isel-gold2 bg-isel-gold2 text-white" : "border-isel-ink/25 bg-white text-transparent"
                    }`}
                  >
                    <Icon name="check" size={12} />
                  </span>
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5">
          <ChoiceRow
            label="Deseo participar en la ceremonia de graduación"
            options={[
              { value: "si", label: "Sí" },
              { value: "no", label: "No" },
            ]}
            value={form.participaCeremonia ? "si" : "no"}
            onChange={(v) => set("participaCeremonia", v === "si")}
            disabled={readOnly}
          />
        </div>
      </PortalPanel>

      {/* ------------------------------------------- 02 · el nombre del título */}
      <PortalPanel
        id="paso-nombre"
        step="02"
        accent="#12855C"
        title="Tu nombre, como irá impreso"
        description="Escríbelo igual que en tu documento de identificación: primera letra mayúscula, el resto en minúsculas, con tildes y diéresis."
        actions={
          <Chip tone={nombresSobra || apellidosSobra ? "alert" : "neutral"} icon="alert">
            {CASILLAS_NOMBRES} casillas por renglón
          </Chip>
        }
      >
        <Alert kind="info">
          La ficha oficial reserva una casilla por letra. Debajo de cada campo verás las casillas reales llenándose:
          lo que aparezca ahí es exactamente lo que se imprimirá en tu título.
        </Alert>

        <div className="mt-5 space-y-6">
          <div>
            <Field label="Nombres *">
              <input
                className={fieldClass}
                disabled={readOnly}
                value={form.nombres ?? ""}
                onChange={(e) => set("nombres", e.target.value)}
                placeholder="Héctor Eduardo"
              />
            </Field>
            <div className="mt-3">
              <RejillaPreview value={form.nombres ?? ""} casillas={CASILLAS_NOMBRES} label="Como se verá en la ficha" />
            </div>
          </div>

          <div>
            <Field label="Apellidos *">
              <input
                className={fieldClass}
                disabled={readOnly}
                value={form.apellidos ?? ""}
                onChange={(e) => set("apellidos", e.target.value)}
                placeholder="Ajtún González"
              />
            </Field>
            <div className="mt-3">
              <RejillaPreview value={form.apellidos ?? ""} casillas={CASILLAS_APELLIDOS} label="Como se verá en la ficha" />
            </div>
          </div>

          <div className="rounded-xl border border-isel-line bg-isel-paper/60 p-4">
            <RejillaPreview value={solicitud.carnet} casillas={CASILLAS_CARNET} label="Tu número de carné (ya registrado)" />
          </div>
        </div>
      </PortalPanel>

      {/* --------------------------------------------- 03 · datos personales */}
      <PortalPanel
        id="paso-datos"
        step="03"
        accent="#6D5AA8"
        title="Datos personales"
        description="Los que la universidad necesita para localizarte cuando el título esté listo."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Fecha de nacimiento *">
            <input
              type="date"
              className={fieldClass}
              disabled={readOnly}
              value={form.fechaNacimiento ?? ""}
              onChange={(e) => set("fechaNacimiento", e.target.value)}
            />
          </Field>
          <Field label="Estado civil">
            <select
              className={fieldClass}
              disabled={readOnly}
              value={form.estadoCivil ?? ""}
              onChange={(e) => set("estadoCivil", e.target.value)}
            >
              <option value="">Elige…</option>
              {form.estadoCivil && !ESTADOS_CIVILES.includes(form.estadoCivil) && (
                <option value={form.estadoCivil}>{form.estadoCivil}</option>
              )}
              {ESTADOS_CIVILES.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Sexo *">
            <select
              className={fieldClass}
              disabled={readOnly}
              value={form.sexo ?? ""}
              onChange={(e) => set("sexo", (e.target.value || null) as "F" | "M" | null)}
            >
              <option value="">Elige…</option>
              <option value="F">Femenino</option>
              <option value="M">Masculino</option>
            </select>
          </Field>
        </div>

        <div className="mt-4">
          <Field label="Dirección de domicilio">
            <input
              className={fieldClass}
              disabled={readOnly}
              value={form.direccionDomicilio ?? ""}
              onChange={(e) => set("direccionDomicilio", e.target.value)}
            />
          </Field>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Teléfono de domicilio">
            <input
              className={fieldClass}
              disabled={readOnly}
              value={form.telefonoDomicilio ?? ""}
              onChange={(e) => set("telefonoDomicilio", e.target.value)}
            />
          </Field>
          <Field label="Teléfono celular">
            <input
              className={fieldClass}
              disabled={readOnly}
              value={form.telefonoCelular ?? ""}
              onChange={(e) => set("telefonoCelular", e.target.value)}
            />
          </Field>
          <Field label="Teléfono de emergencia">
            <input
              className={fieldClass}
              disabled={readOnly}
              value={form.telefonoEmergencia ?? ""}
              onChange={(e) => set("telefonoEmergencia", e.target.value)}
            />
          </Field>
        </div>

        <div className="mt-4">
          <Field label="Correo electrónico *">
            <input
              type="email"
              className={fieldClass}
              disabled={readOnly}
              value={form.correoElectronico ?? ""}
              onChange={(e) => set("correoElectronico", e.target.value)}
            />
          </Field>
        </div>
      </PortalPanel>

      {/* --------------------------------------------------- 04 · trabajo */}
      <PortalPanel
        id="paso-trabajo"
        step="04"
        accent="#2C6E8F"
        title="Dónde trabajas"
        description="Opcional — déjalo en blanco si por ahora no aplica."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nombre de la empresa">
            <input
              className={fieldClass}
              disabled={readOnly}
              value={form.empresa ?? ""}
              onChange={(e) => set("empresa", e.target.value)}
            />
          </Field>
          <Field label="Cargo que desempeñas">
            <input
              className={fieldClass}
              disabled={readOnly}
              value={form.cargo ?? ""}
              onChange={(e) => set("cargo", e.target.value)}
            />
          </Field>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-[1.6fr_1fr]">
          <Field label="Dirección del trabajo">
            <input
              className={fieldClass}
              disabled={readOnly}
              value={form.direccionTrabajo ?? ""}
              onChange={(e) => set("direccionTrabajo", e.target.value)}
            />
          </Field>
          <Field label="Teléfono(s)">
            <input
              className={fieldClass}
              disabled={readOnly}
              value={form.telefonoTrabajo ?? ""}
              onChange={(e) => set("telefonoTrabajo", e.target.value)}
            />
          </Field>
        </div>
      </PortalPanel>

      {/* ------------------------------------------------ 05 · el título */}
      <PortalPanel
        id="paso-titulo"
        step="05"
        accent="#14493C"
        title="El título que vas a obtener"
        description="Viene de tu registro académico. Corrígelo solo si no coincide con lo que te dijo Secretaría."
      >
        <div className="grid grid-cols-1 gap-4">
          <Field label="Facultad o departamento">
            <input
              className={fieldClass}
              disabled={readOnly}
              value={form.facultadDepartamento ?? ""}
              onChange={(e) => set("facultadDepartamento", e.target.value)}
            />
          </Field>
          <Field label="Título, diploma o grado a obtener *">
            <input
              className={fieldClass}
              disabled={readOnly}
              value={form.tituloObtener ?? ""}
              onChange={(e) => set("tituloObtener", e.target.value)}
            />
          </Field>
        </div>
      </PortalPanel>

      {/* ---------------------------------------------- 06 · la fotografía */}
      <PortalPanel
        id="paso-foto"
        step="06"
        accent="#A97B18"
        title="Tu fotografía"
        description="La que va pegada en el recuadro de la ficha. Puedes tomártela aquí mismo o subir una que ya tengas."
        actions={
          <Chip tone={form.fotoBase64 ? "emerald" : "neutral"} icon={form.fotoBase64 ? "check" : "user"}>
            {form.fotoBase64 ? "Lista" : "Pendiente"}
          </Chip>
        }
      >
        <FotoCapture value={form.fotoBase64} onChange={(v) => set("fotoBase64", v)} readOnly={readOnly} />
      </PortalPanel>

      {/* ------------------------------------------------- 07 · la firma */}
      <PortalPanel
        id="paso-firma"
        step="07"
        accent="#B23A2B"
        title="Tu firma"
        description="Firma con el ratón, el dedo o el lápiz. Se coloca sobre el renglón de 'Firma del Interesado'."
      >
        {readOnly ? (
          form.firmaBase64 ? (
            <img src={form.firmaBase64} alt="Firma" className="max-h-28 rounded-xl border border-isel-line bg-white p-2" />
          ) : (
            <p className="text-[13px] text-isel-ink/45">Sin firma.</p>
          )
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-[13px] font-semibold text-isel-ink">
                <Icon name="pen" size={16} className="text-isel-gold2" />
                Firma digital
              </p>
              <PortalButton tone="quiet" size="sm" icon="eraser" onClick={() => signatureRef.current?.clear()}>
                Limpiar firma
              </PortalButton>
            </div>
            <SignaturePad ref={signatureRef} initialValue={form.firmaBase64} className="max-w-md" key={solicitud.id} />
          </>
        )}
      </PortalPanel>

      {error && <Alert kind="error">{error}</Alert>}
      {saved && !error && <Alert kind="ok">Tu solicitud quedó guardada.</Alert>}

      {/* El estado de la ficha y el botón de guardar, siempre al alcance. */}
      {!readOnly && (
        <div
          className={
            stickyActions
              ? "fixed inset-x-0 bottom-0 z-40 border-t border-isel-line bg-white/95 backdrop-blur-xl"
              : "rounded-2xl border border-isel-line bg-white shadow-card"
          }
        >
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-8">
            <p className="flex min-w-0 items-center gap-2.5 text-[12.5px] leading-snug text-isel-ink/55">
              <Icon
                name={faltantes.length === 0 ? "check" : "alert"}
                size={15}
                className={faltantes.length === 0 ? "shrink-0 text-isel-emerald" : "shrink-0 text-isel-gold2"}
              />
              {faltantes.length === 0 ? (
                <span className="font-semibold text-isel-emerald2">Tu ficha está completa.</span>
              ) : (
                <span className="truncate">
                  Falta {faltantes.slice(0, 2).join(" y ")}
                  {faltantes.length > 2 ? ` y ${faltantes.length - 2} cosa${faltantes.length - 2 === 1 ? "" : "s"} más` : ""}.
                </span>
              )}
            </p>
            <PortalButton tone="accent" icon="save" loading={saving} onClick={handleSave} className="shrink-0">
              Guardar solicitud
            </PortalButton>
          </div>
        </div>
      )}
    </div>
  );
}
