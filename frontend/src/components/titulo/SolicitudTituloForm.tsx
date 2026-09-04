import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { PortalPanel } from "@/components/portal/PortalShell";
import { StepGuide } from "@/components/portal/StepGuide";
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

/** Lo que la página de afuera necesita saber de la ficha sin ser dueña de sus campos. */
export interface EstadoSolicitudForm {
  /** Lo que todavía falta para poder imprimir, tal como está la pantalla AHORA. */
  faltantes: string[];
  /** Hay cambios escritos que aún no han llegado al servidor. */
  sinGuardar: boolean;
  /** Foto y firma tal como están en pantalla — para los distintivos del encabezado. */
  tieneFoto: boolean;
  tieneFirma: boolean;
}

export interface SolicitudTituloFormHandle {
  /** Guarda la ficha y devuelve lo que quedó grabado, o null si no se pudo. */
  save: () => Promise<SolicitudTitulo | null>;
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
  /** Avisa a la página de lo que hay en pantalla, para que el paso 08 no hable de datos viejos. */
  onEstadoChange?: (estado: EstadoSolicitudForm) => void;
}

/**
 * La ficha de Solicitud de Título, en pantalla.
 *
 * Se guarda de una sola vez (no por secciones como Inscripción) porque es un único papel: media
 * ficha guardada no sirve para imprimir nada. A cambio, el botón de guardar viaja en una barra fija
 * abajo con el recuento de lo que falta, así que nunca hay que ir a buscarlo al final del scroll.
 *
 * Lo que se ve aquí es el borrador del alumno, no lo que hay grabado. Por eso el formulario le
 * cuenta a la página cómo va (`onEstadoChange`) y le deja guardar desde fuera (`save`): el paso 08
 * miraba solo el servidor, así que quien llenaba todo y bajaba a descargar veía "Pendiente" junto a
 * campos que tenía llenos delante de los ojos.
 */
export const SolicitudTituloForm = forwardRef<SolicitudTituloFormHandle, SolicitudTituloFormProps>(
  function SolicitudTituloForm(
    { solicitud, onSaved, readOnly = false, stickyActions = true, onEstadoChange },
    ref,
  ) {
  const [form, setForm] = useState<SolicitudTituloInput>(() => aInput(solicitud));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [sinGuardar, setSinGuardar] = useState(false);
  const signatureRef = useRef<SignaturePadHandle>(null);

  useEffect(() => {
    setForm(aInput(solicitud));
    setSinGuardar(false);
  }, [solicitud]);

  function set<K extends keyof SolicitudTituloInput>(key: K, value: SolicitudTituloInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
    setSinGuardar(true);
  }

  // Lo que falta para poder imprimir. Se calcula aquí y se muestra en la barra de abajo, para que
  // "guardar" nunca sea un salto al vacío.
  const faltantes = useMemo(() => {
    const falta: string[] = [];
    if (!form.nombres?.trim()) falta.push("sus nombres");
    if (!form.apellidos?.trim()) falta.push("sus apellidos");
    if (!form.campus) falta.push("la sede");
    if (!form.sexo) falta.push("el sexo");
    if (!form.fechaNacimiento) falta.push("la fecha de nacimiento");
    if (!form.correoElectronico?.trim()) falta.push("el correo");
    if (!form.tituloObtener?.trim()) falta.push("el título a obtener");
    if (!form.fotoBase64) falta.push("la fotografía");
    if (!form.firmaBase64) falta.push("la firma");
    return falta;
  }, [form]);

  // El paso 08 y los distintivos del encabezado viven en la página, pero lo que cuentan está aquí.
  useEffect(() => {
    onEstadoChange?.({
      faltantes,
      sinGuardar,
      tieneFoto: !!form.fotoBase64,
      tieneFirma: !!form.firmaBase64,
    });
  }, [faltantes, sinGuardar, form.fotoBase64, form.firmaBase64, onEstadoChange]);

  const nombresSobra = (form.nombres ?? "").length > CASILLAS_NOMBRES;
  const apellidosSobra = (form.apellidos ?? "").length > CASILLAS_APELLIDOS;

  const handleSave = useCallback(async (): Promise<SolicitudTitulo | null> => {
    if (readOnly) return solicitud;
    if (!form.nombres?.trim() || !form.apellidos?.trim()) {
      setError("Los nombres y apellidos son obligatorios, ya que son los datos que se imprimen en el título.");
      return null;
    }
    if (nombresSobra || apellidosSobra) {
      setError("El nombre excede las casillas disponibles en la ficha. Ajústelo antes de guardar.");
      return null;
    }
    setSaving(true);
    setError(null);
    try {
      // La firma sale del formulario, igual que el resto: el lienzo la va copiando ahí a cada trazo.
      // Leerla del lienzo aquí sería peligroso — si la firma guardada todavía no ha terminado de
      // cargarse dentro del canvas, o la imagen viene dañada, el lienzo se ve vacío y guardar
      // borraría una firma que sí existe.
      const guardada = await saveSolicitudTitulo(solicitud.id, {
        ...form,
        fechaNacimiento: form.fechaNacimiento || null,
      });
      onSaved(guardada);
      setSaved(true);
      setSinGuardar(false);
      return guardada;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No fue posible guardar su solicitud.");
      return null;
    } finally {
      setSaving(false);
    }
  }, [readOnly, solicitud, form, nombresSobra, apellidosSobra, onSaved]);

  useImperativeHandle(ref, () => ({ save: handleSave }), [handleSave]);

  return (
    <div className={`space-y-6 ${stickyActions ? "pb-24" : ""}`}>
      {/* ------------------------------------------------ 01 · sede y ceremonia */}
      <PortalPanel
        id="paso-sede"
        step="01"
        accent="#B8791F"
        title="Sede y ceremonia"
        description="Sede en la que cursó sus estudios y participación en el acto de graduación."
      >
        <StepGuide
          steps={[
            "Seleccione la sede en la que cursó sus estudios. Únicamente puede elegir una.",
            "A continuación, indique si asistirá al acto de graduación.",
            "Si aún no lo ha definido, registre la opción que considere más probable. Podrá modificarla mientras no entregue la solicitud.",
          ]}
          outcome="Una vez registradas ambas respuestas, continúe con los pasos siguientes. No es necesario guardar cada sección: la información se guarda en conjunto al finalizar."
        />

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
        title="Su nombre, tal como será impreso"
        description="Regístrelo tal como aparece en su documento de identificación: la primera letra en mayúscula y las restantes en minúscula, con tildes y diéresis."
        actions={
          <Chip tone={nombresSobra || apellidosSobra ? "alert" : "neutral"} icon="alert">
            {CASILLAS_NOMBRES} casillas por renglón
          </Chip>
        }
      >
        <StepGuide
          title="Paso de especial importancia"
          steps={[
            "Copie sus nombres y apellidos exactamente como aparecen en su DPI o pasaporte, incluyendo las tildes.",
            "Escriba la primera letra en mayúscula y las restantes en minúscula. Por ejemplo: María Fernanda.",
            "Observe las casillas que aparecen debajo mientras escribe: reproducen exactamente lo que se imprimirá en su título.",
            "Si el aviso superior cambia de color, su nombre excede el espacio disponible del renglón. Comuníquelo a Secretaría antes de continuar.",
          ]}
          outcome="Una impresión con datos incorrectos obliga a iniciar el trámite nuevamente. Se recomienda revisar esta sección con detenimiento."
        />

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
            <RejillaPreview value={solicitud.carnet} casillas={CASILLAS_CARNET} label="Su número de carné (ya registrado)" />
          </div>
        </div>
      </PortalPanel>

      {/* --------------------------------------------- 03 · datos personales */}
      <PortalPanel
        id="paso-datos"
        step="03"
        accent="#6D5AA8"
        title="Datos personales"
        description="Datos que la Universidad requiere para comunicarse con usted cuando el título esté disponible."
      >
        <StepGuide
          steps={[
            "Complete su fecha de nacimiento y los demás datos solicitados.",
            "Registre un número telefónico y un correo electrónico vigentes, ya que por esos medios se le notificará cuando el título esté disponible.",
            "Los campos señalados con asterisco (*) son obligatorios; los demás puede dejarlos sin completar.",
          ]}
        />

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
        title="Información laboral"
        description="Sección opcional. Puede dejarla sin completar si no aplica en este momento."
      >
        <StepGuide
          title="Sección opcional"
          steps={[
            "Si labora actualmente, indique el nombre de la institución o empresa y el puesto que desempeña.",
            "Si no labora, o prefiere no proporcionar esta información, deje los campos vacíos y continúe.",
          ]}
          outcome="Esta sección no condiciona el trámite: la solicitud se guarda aunque estos campos permanezcan vacíos."
        />

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
        title="Título a obtener"
        description="Proviene de su registro académico. Modifíquelo únicamente si no coincide con lo indicado por Secretaría."
      >
        <StepGuide
          steps={[
            "Revise el nombre del título que aparece a continuación. Por lo general proviene correctamente de su expediente.",
            "Modifíquelo únicamente si no coincide con lo indicado por Secretaría.",
            "En caso de duda, consérvelo tal como aparece: es lo que consta en su registro académico.",
          ]}
        />

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
        title="Fotografía"
        description="Fotografía que se coloca en el recuadro de la ficha. Puede tomarla desde esta página o adjuntar una existente."
        actions={
          <Chip tone={form.fotoBase64 ? "emerald" : "neutral"} icon={form.fotoBase64 ? "check" : "user"}>
            {form.fotoBase64 ? "Lista" : "Pendiente"}
          </Chip>
        }
      >
        <StepGuide
          steps={[
            "Colóquese de frente, con fondo claro e iluminación adecuada, sin lentes oscuros ni accesorios que cubran el rostro.",
            "Desde un teléfono puede tomar la fotografía en ese momento; si ya cuenta con una, adjúntela desde su dispositivo.",
            "Encuadre el rostro dentro del recuadro: corresponde al espacio que ocupa en la ficha impresa.",
            "Puede repetir la captura las veces que considere necesario; se conserva únicamente la última.",
          ]}
          outcome="Esta fotografía se incorpora a su solicitud, por lo que se recomienda que el rostro se aprecie con claridad."
        />

        <FotoCapture value={form.fotoBase64} onChange={(v) => set("fotoBase64", v)} readOnly={readOnly} />
      </PortalPanel>

      {/* ------------------------------------------------- 07 · la firma */}
      <PortalPanel
        id="paso-firma"
        step="07"
        accent="#B23A2B"
        title="Firma"
        description="Puede firmar con el ratón, el dedo o un lápiz digital. La firma se coloca sobre el renglón de “Firma del Interesado”."
      >
        {readOnly ? (
          form.firmaBase64 ? (
            <img src={form.firmaBase64} alt="Firma" className="max-h-28 rounded-xl border border-isel-line bg-white p-2" />
          ) : (
            <p className="text-[13px] text-isel-ink/45">Sin firma.</p>
          )
        ) : (
          <>
            <StepGuide
              title="Último paso"
              steps={[
                "Registre su firma dentro del recuadro: con el dedo desde un teléfono o con el ratón desde una computadora.",
                "Realícela con calma y de un solo trazo; no es necesario que sea idéntica a la de su DPI.",
                "Si el resultado no es satisfactorio, presione “Limpiar firma” y regístrela nuevamente.",
                "Cuando la firma sea correcta, diríjase a la barra inferior y presione el botón para guardar.",
              ]}
              outcome="Después de guardar, podrá descargar su solicitud en formato PDF, imprimirla y presentarla en Secretaría."
            />

            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-[13px] font-semibold text-isel-ink">
                <Icon name="pen" size={16} className="text-isel-gold2" />
                Firma digital
              </p>
              <PortalButton tone="quiet" size="sm" icon="eraser" onClick={() => signatureRef.current?.clear()}>
                Limpiar firma
              </PortalButton>
            </div>
            {/*
              El lienzo copia el trazo al formulario al soltar (y lo borra al limpiar), en vez de
              leerse solo al guardar: así el recuento de abajo deja de decir "falta la firma" con la
              firma ya hecha, y "Limpiar firma" de verdad la borra.
            */}
            <SignaturePad
              ref={signatureRef}
              initialValue={form.firmaBase64}
              onChange={(hayFirma) => set("firmaBase64", hayFirma ? signatureRef.current?.getSignature() ?? null : null)}
              className="max-w-md"
              key={solicitud.id}
            />
          </>
        )}
      </PortalPanel>

      {/*
        El estado de la ficha y el botón de guardar, siempre al alcance — y el resultado del guardado
        AQUÍ dentro, no suelto en el flujo del documento: la barra va fija al fondo de la ventana, así
        que un aviso puesto más arriba caía fuera de la pantalla y guardar parecía no hacer nada.
      */}
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
                name={error ? "alert" : saved ? "check" : sinGuardar ? "save" : faltantes.length === 0 ? "check" : "alert"}
                size={15}
                className={`shrink-0 ${
                  error ? "text-isel-alert" : saved ? "text-isel-emerald" : sinGuardar ? "text-isel-gold2" : faltantes.length === 0 ? "text-isel-emerald" : "text-isel-gold2"
                }`}
              />
              {error ? (
                <span className="font-semibold text-isel-alert">{error}</span>
              ) : saved ? (
                <span className="font-semibold text-isel-emerald2">Su solicitud fue guardada correctamente.</span>
              ) : sinGuardar ? (
                <span className="truncate font-semibold text-isel-navy">
                  Tiene cambios sin guardar. Presione “Guardar solicitud”.
                </span>
              ) : faltantes.length === 0 ? (
                <span className="font-semibold text-isel-emerald2">Su ficha está completa.</span>
              ) : (
                <span className="truncate">
                  Falta {faltantes.slice(0, 2).join(" y ")}
                  {faltantes.length > 2 ? ` y ${faltantes.length - 2} cosa${faltantes.length - 2 === 1 ? "" : "s"} más` : ""}.
                </span>
              )}
            </p>
            <PortalButton tone="accent" icon="save" loading={saving} onClick={() => void handleSave()} className="shrink-0">
              Guardar solicitud
            </PortalButton>
          </div>
        </div>
      )}
    </div>
  );
});
