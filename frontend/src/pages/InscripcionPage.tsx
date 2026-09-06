import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AccesoInscripcionGate } from "@/components/inscripcion/AccesoInscripcionGate";
import { PreinscripcionForm } from "@/components/inscripcion/PreinscripcionForm";
import { AsignacionNuevoIngresoForm } from "@/components/inscripcion/AsignacionNuevoIngresoForm";
import { CartaCompromisoForm } from "@/components/inscripcion/CartaCompromisoForm";
import { DocumentosForm } from "@/components/inscripcion/DocumentosForm";
import type { FichaHandle } from "@/components/inscripcion/fichaHandle";
import { PortalBand, PortalPanel, PortalTopBar, StepRail, StepStrip, type RailStep } from "@/components/portal/PortalShell";
import { Icon } from "@/components/portal/Icon";
import { Alert, Chip, Loading, PortalButton } from "@/components/portal/kit";
import { useConfirm } from "@/hooks/useConfirm";
import { getApplicant } from "@/lib/inscripcionesApi";
import { joinNombreCompleto, nombreNatural } from "@/lib/nombres";
import {
  DOCUMENTO_TIPOS_EXTRANJERO,
  DOCUMENTO_TIPOS_NACIONAL,
  type Applicant,
  type DocumentoTipo,
} from "@/types/inscripcion";

const STORAGE_KEY = "isel.inscripcion.applicantId";

/**
 * Los cinco tramos del expediente, incluido el cierre.
 *
 * El cierre entra en la lista a propósito: mientras fue un panel que no
 * figuraba en ningún índice, quien llegaba al final del cuarto formulario no
 * tenía forma de saber que todavía faltaba pulsar algo para terminar.
 */
const STEPS: RailStep[] = [
  { id: "paso-preinscripcion", label: "Preinscripción" },
  { id: "paso-asignacion", label: "Asignación de cursos" },
  { id: "paso-compromiso", label: "Carta de compromiso" },
  { id: "paso-documentos", label: "Documentos" },
  { id: "paso-cierre", label: "Terminar" },
];

/**
 * "Inscripción" — flujo público de nuevo ingreso, sin necesidad de entrar a ninguna maestría ni
 * portal existente (a diferencia de "Asignación", que sí requiere carné). Mismo lenguaje visual que
 * el portal de asignación (PortalBand/StepRail/PortalPanel), 4 fichas que se guardan por separado
 * más el cierre.
 */
export function InscripcionPage() {
  const [applicant, setApplicant] = useState<Applicant | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  /**
   * Las tres fichas con formulario, para poder guardarlas desde el cierre.
   *
   * Los documentos no llevan ficha: cada PDF se sube en cuanto se elige, así
   * que ahí nunca hay nada "sin mandar".
   */
  const preRef = useRef<FichaHandle>(null);
  const asigRef = useRef<FichaHandle>(null);
  const compRef = useRef<FichaHandle>(null);

  useEffect(() => {
    document.title = "Inscripción | ISEL";
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) {
      setLoading(false);
      return;
    }
    getApplicant(Number(stored))
      .then(setApplicant)
      .catch(() => sessionStorage.removeItem(STORAGE_KEY))
      .finally(() => setLoading(false));
  }, []);

  function handleEnter(a: Applicant) {
    sessionStorage.setItem(STORAGE_KEY, String(a.id));
    setApplicant(a);
  }

  function handleExit() {
    sessionStorage.removeItem(STORAGE_KEY);
    setApplicant(null);
  }

  /** Cierra el expediente y devuelve al sitio público. */
  function handleFinish() {
    sessionStorage.removeItem(STORAGE_KEY);
    setApplicant(null);
    navigate("/");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-isel-paper">
        <Loading label="Cargando su inscripción" />
      </main>
    );
  }

  if (!applicant) {
    return <AccesoInscripcionGate onEnter={handleEnter} />;
  }

  const nombre = applicant.nombreCompleto || "Aspirante nuevo";
  const identificador = applicant.dpi ? `DPI ${applicant.dpi}` : applicant.pasaporte ? `Pasaporte ${applicant.pasaporte}` : "";

  return (
    <main className="min-h-screen bg-isel-paper pb-28">
      <PortalTopBar context="Inscripción de nuevo ingreso" onLogout={handleExit} />

      <PortalBand
        eyebrow="Ficha de inscripción"
        title={nombre}
        meta={
          <>
            {identificador && (
              <Chip tone="onDark" icon="card">
                {identificador}
              </Chip>
            )}
            <Chip tone="onDark" icon={applicant.preinscripcion ? "check" : "file"}>Preinscripción</Chip>
            <Chip tone="onDark" icon={applicant.asignacion ? "check" : "file"}>Asignación</Chip>
            <Chip tone="onDark" icon={applicant.compromiso ? "check" : "file"}>Compromiso</Chip>
          </>
        }
      />

      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <StepStrip steps={STEPS} />

        <div className="grid grid-cols-1 gap-10 pt-10 lg:grid-cols-[13.5rem_minmax(0,1fr)] lg:gap-14">
          <StepRail steps={STEPS} />
          <div className="min-w-0 space-y-6">
            {/* Aviso de arranque: cuántas fichas son, antes de empezar la
                primera. Era lo primero que faltaba — el expediente se abría
                directamente en la ficha 1 y nada decía que hubiera más. */}
            <ResumenDelCamino applicant={applicant} />

            <PreinscripcionForm
              ref={preRef}
              applicantId={applicant.id}
              initial={applicant.preinscripcion}
              onSaved={(p) => setApplicant((a) => (a ? { ...a, preinscripcion: p, nombreCompleto: a.asignacion ? a.nombreCompleto : p.nombreCompleto } : a))}
            />

            <PasoSiguiente numero={2} titulo="Asignación de cursos" anclaId="paso-asignacion" hecho={!!applicant.asignacion} />

            <AsignacionNuevoIngresoForm
              ref={asigRef}
              applicantId={applicant.id}
              initial={applicant.asignacion}
              nombreSugerido={applicant.preinscripcion?.nombreCompleto ?? applicant.nombreCompleto}
              carreraSugerida={applicant.preinscripcion?.carrera}
              correoSugerido={applicant.preinscripcion?.correoElectronico}
              telefonoSugerido={applicant.preinscripcion?.telefonoCelular}
              onSaved={(asn) =>
                setApplicant((a) => (a ? { ...a, asignacion: asn, nombreCompleto: joinNombreCompleto(asn) } : a))
              }
            />

            <PasoSiguiente numero={3} titulo="Carta de compromiso" anclaId="paso-compromiso" hecho={!!applicant.compromiso} />

            <CartaCompromisoForm
              ref={compRef}
              applicantId={applicant.id}
              initial={applicant.compromiso}
              defaults={{
                carrera: applicant.asignacion?.carrera ?? applicant.preinscripcion?.carrera,
                // La carta se lee en voz alta ("Yo, Fulano de Tal…"), así que aquí el nombre va
                // como se dice, no como se archiva ("Apellidos, Nombres").
                nombreCompleto:
                  applicant.preinscripcion?.nombreCompleto ||
                  (applicant.asignacion ? nombreNatural(applicant.asignacion) : applicant.nombreCompleto),
                dpi: applicant.dpi ?? applicant.preinscripcion?.dpi,
              }}
              onSaved={(c) => setApplicant((a) => (a ? { ...a, compromiso: c, esExtranjero: c.esExtranjero } : a))}
            />

            <PasoSiguiente numero={4} titulo="Documentos" anclaId="paso-documentos" hecho={applicant.documentos.length > 0} opcional />

            <DocumentosForm
              applicantId={applicant.id}
              esExtranjero={applicant.compromiso?.esExtranjero ?? applicant.esExtranjero}
              documentos={applicant.documentos}
              onChanged={(documentos) => setApplicant((a) => (a ? { ...a, documentos } : a))}
            />

            <PasoSiguiente numero={5} titulo="Terminar mi inscripción" anclaId="paso-cierre" hecho={false} />

            <CierrePanel
              applicant={applicant}
              fichas={[preRef, asigRef, compRef]}
              onFinish={handleFinish}
            />
          </div>
        </div>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------------- */

/**
 * El mapa del camino, antes de la primera ficha.
 *
 * Lo que fallaba no era el orden de las fichas sino que NADA anunciaba cuántas
 * eran. Se llenaba la primera, se bajaba, se veía un hueco entre paneles y se
 * daba el trámite por terminado. El índice de la izquierda ya existía, pero en
 * móvil es una tira estrecha y en escritorio queda fuera del recorrido del ojo,
 * que baja por el centro.
 *
 * Aquí va, en el centro y antes de empezar: son cinco tramos, estos son, y
 * cada uno se guarda con su propio botón.
 */
function ResumenDelCamino({ applicant }: { applicant: Applicant }) {
  const hechas = [applicant.preinscripcion, applicant.asignacion, applicant.compromiso].filter(Boolean).length;

  return (
    <div className="rounded-2xl border border-isel-navy/15 bg-isel-navy px-5 py-5 text-white sm:px-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.16em] text-isel-gold">
            <Icon name="layers" size={13} />
            Su inscripción tiene 5 pasos
          </p>
          <p className="mt-2.5 max-w-[60ch] text-[13.5px] leading-relaxed text-white/70">
            Baje por la página para recorrerlos en orden. <b className="font-semibold text-white">Cada paso se guarda
            con su propio botón</b>, al final de su recuadro; puede salir cuando quiera y volver con su mismo DPI para
            continuar donde lo dejó.
          </p>
        </div>
        <Chip tone="onDark" icon={hechas === 3 ? "check" : "file"}>
          {hechas} de 3 fichas guardadas
        </Chip>
      </div>

      <ol className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {STEPS.map((s, i) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.05] px-3.5 py-2.5 text-[12.5px] font-semibold text-white/80 transition-colors duration-300 ease-crisp hover:border-white/25 hover:text-white"
            >
              <span className="tabular text-[11px] font-bold text-isel-gold">{String(i + 1).padStart(2, "0")}</span>
              {s.label}
            </a>
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * El puente entre una ficha y la siguiente.
 *
 * Este es el hueco del que se quejaban: al terminar un formulario venía un
 * espacio en blanco y luego, muy abajo, otro recuadro. Quien ya sabe cómo
 * funciona baja; quien no, cierra la página convencido de haber terminado.
 *
 * Ahora ese espacio dice lo que hay debajo: qué paso viene, el número que le
 * toca y si ya está hecho, con una flecha que apunta hacia allí. Es una banda
 * baja y sin caja —no compite con las fichas, que son lo importante— pero deja
 * de ser un vacío.
 */
function PasoSiguiente({
  numero,
  titulo,
  anclaId,
  hecho,
  opcional = false,
}: {
  numero: number;
  titulo: string;
  anclaId: string;
  hecho: boolean;
  opcional?: boolean;
}) {
  return (
    <a
      href={`#${anclaId}`}
      className="group/paso flex items-center gap-4 rounded-xl border border-dashed border-isel-line px-5 py-4 transition-colors duration-300 ease-crisp hover:border-isel-emerald/50 hover:bg-white"
    >
      <span
        aria-hidden
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[12px] font-bold tabular ${
          hecho ? "bg-isel-emerald/10 text-isel-emerald2" : "bg-isel-paper text-isel-ink/45"
        }`}
      >
        {hecho ? <Icon name="check" size={15} /> : String(numero).padStart(2, "0")}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-[10.5px] font-bold uppercase tracking-[0.14em] text-isel-ink/40">
          {hecho ? "Paso completado" : `Continúe con el paso ${numero} de 5`}
          {opcional && !hecho ? " · opcional" : ""}
        </span>
        <span className="mt-0.5 block text-[14px] font-semibold leading-snug text-isel-navy">{titulo}</span>
      </span>

      {/* La flecha baja un poco al señalar: dice «sigue hacia abajo», no «abre
          otra cosa». */}
      <span
        aria-hidden
        className="shrink-0 text-[15px] text-isel-ink/35 transition-transform duration-300 ease-back group-hover/paso:translate-y-1 group-hover/paso:text-isel-emerald"
      >
        ↓
      </span>
    </a>
  );
}

/* ------------------------------------------------------------------------- */

/**
 * El cierre del expediente.
 *
 * ── Lo que estaba mal ───────────────────────────────────────────────────────
 * El botón decía «Guardar todo y salir» y no guardaba nada: solo cerraba la
 * sesión. Cada ficha tiene su propio botón, y quien llenaba las cuatro sin
 * pulsarlos y remataba con este salía convencido de haber mandado su
 * inscripción. En el panel del administrador aparecía vacía; al volver con su
 * DPI, también. Un fallo silencioso, que es el peor de todos.
 *
 * ── Lo que hace ahora ───────────────────────────────────────────────────────
 * El rótulo pasa a ser verdad. Antes de salir, le pregunta a cada ficha si le
 * queda algo sin mandar (ver fichaHandle.ts) y lo manda. Si alguna no puede
 * guardarse —le falta un campo obligatorio— lo dice, LLEVA hasta ella y no
 * sale. Solo cuando no queda nada pendiente pregunta si desea cerrar.
 *
 * ── Por qué no se quitó el botón ────────────────────────────────────────────
 * Porque un trámite necesita un final. Sin él, la página se acababa y no había
 * forma de saber si lo mandado quedó guardado ni por dónde salir. La otra
 * opción era dejarlo como estaba y limitarse a avisar; no basta: avisar sirve
 * a quien lee, y el aviso llegaba después de que el aspirante ya diera el
 * trámite por hecho. Guardar de verdad no depende de que nadie lea nada.
 */
function CierrePanel({
  applicant,
  fichas,
  onFinish,
}: {
  applicant: Applicant;
  fichas: React.RefObject<FichaHandle>[];
  onFinish: () => void;
}) {
  const { confirm, dialog } = useConfirm();
  const [guardando, setGuardando] = useState(false);
  const [problema, setProblema] = useState<string | null>(null);

  const requeridos: DocumentoTipo[] =
    (applicant.compromiso?.esExtranjero ?? applicant.esExtranjero)
      ? [...DOCUMENTO_TIPOS_EXTRANJERO]
      : [...DOCUMENTO_TIPOS_NACIONAL];
  const subidos = applicant.documentos.filter((d) => requeridos.includes(d.tipo)).length;

  const partes = [
    { label: "Preinscripción", ok: !!applicant.preinscripcion },
    { label: "Asignación de cursos", ok: !!applicant.asignacion },
    { label: "Carta de compromiso", ok: !!applicant.compromiso },
    { label: `Documentos (${subidos} de ${requeridos.length})`, ok: subidos >= requeridos.length, opcional: true },
  ];
  const faltan = partes.filter((p) => !p.ok && !p.opcional).map((p) => p.label);

  /** Las fichas que ahora mismo tienen algo escrito sin mandar al servidor. */
  function pendientes(): FichaHandle[] {
    return fichas.map((r) => r.current).filter((f): f is FichaHandle => !!f && f.tieneCambios());
  }

  async function handleClick() {
    setProblema(null);
    setGuardando(true);
    try {
      // 1. Guardar lo que quedó escrito y sin mandar, en el orden de la página.
      for (const ficha of pendientes()) {
        const motivo = await ficha.guardar();
        if (motivo) {
          setProblema(`No se pudo guardar «${ficha.nombre}»: ${motivo}`);
          document.getElementById(ficha.anclaId)?.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
      }
    } finally {
      setGuardando(false);
    }

    // 2. Ya no queda nada por mandar. Si alguna ficha sigue sin empezarse, se
    //    puede salir igual —el expediente se retoma con el mismo DPI— pero hay
    //    que decirlo, porque salir así deja la inscripción incompleta.
    if (faltan.length > 0) {
      const ok = await confirm({
        title: "Aún tiene fichas sin llenar",
        message: `No ha llenado: ${faltan.join(", ")}. Lo que sí guardó se conserva y puede regresar con su mismo DPI para completarlo. ¿Desea salir de todos modos?`,
        confirmLabel: "Sí, salir",
      });
      if (!ok) return;
    }

    onFinish();
  }

  return (
    <>
      <PortalPanel
        id="paso-cierre"
        step="05"
        accent="#14493C"
        title="Terminar mi inscripción"
        description="Este es el último paso. Al pulsar el botón se guarda lo que haya quedado escrito y se cierra su expediente; puede regresar con su mismo DPI."
      >
        <ul className="divide-y divide-isel-line overflow-hidden rounded-xl border border-isel-line">
          {partes.map((p) => (
            <li key={p.label} className="flex items-center gap-3 px-4 py-3 text-[13.5px]">
              <span
                aria-hidden
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                  p.ok ? "bg-isel-emerald/10 text-isel-emerald" : "bg-isel-paper text-isel-ink/35"
                }`}
              >
                <Icon name={p.ok ? "check" : "file"} size={14} />
              </span>
              <span className="flex-1 text-isel-ink">{p.label}</span>
              {p.ok ? (
                <Chip tone="emerald" icon="check">Guardado</Chip>
              ) : p.opcional ? (
                <Chip tone="neutral" icon="file">Opcional</Chip>
              ) : (
                <Chip tone="gold" icon="alert">Pendiente</Chip>
              )}
            </li>
          ))}
        </ul>

        {problema && (
          <div className="mt-5">
            <Alert kind="error">{problema}</Alert>
          </div>
        )}

        {faltan.length > 0 && !problema && (
          <div className="mt-5">
            <Alert kind="info">
              Puede salir así: lo guardado no se pierde y con su mismo DPI continuará donde lo dejó.
            </Alert>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-isel-line pt-5">
          <p className="mr-auto flex items-center gap-2 text-[12.5px] text-isel-ink/45">
            <Icon name="lock" size={13} />
            Si dejó algo escrito sin guardar, este botón lo guarda antes de salir.
          </p>
          <PortalButton
            tone="accent"
            icon="check"
            loading={guardando}
            onClick={handleClick}
            className="px-6 py-3 text-[14px]"
          >
            Guardar todo y salir
          </PortalButton>
        </div>
      </PortalPanel>
      {dialog}
    </>
  );
}
