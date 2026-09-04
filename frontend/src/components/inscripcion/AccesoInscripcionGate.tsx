import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useReducedMotion } from "framer-motion";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { Icon } from "@/components/portal/Icon";
import { BackButton } from "@/pages/portal/LoginPage";
import { Alert, PortalButton, Segmented, fieldClass } from "@/components/portal/kit";
import { accesoInscripcion } from "@/lib/inscripcionesApi";
import { ApiError } from "@/lib/http";
import type { Applicant } from "@/types/inscripcion";

/**
 * Puerta de entrada a "Inscripción" — sin contraseña, igual que el ingreso por carné del portal de
 * Asignación, pero aquí la clave es el DPI (o el pasaporte, si el aspirante es extranjero y no tiene
 * DPI guatemalteco), porque todavía no existe ningún carné. La primera vez crea el aspirante; si ya
 * existía, reanuda exactamente donde lo dejó.
 *
 * La mitad oscura sigue diciendo lo mismo que antes —qué vas a hacer y en cuántas partes— pero ya no
 * como un párrafo corrido: los cuatro pasos cuelgan de un hilo que se traza solo al entrar, y cada
 * nodo aparece detrás del anterior. El texto no cambia de sentido; cambia el orden en que llega, que
 * es lo que hace que se lea de un vistazo en vez de tener que buscarlo dentro de un bloque.
 */

const PASOS = [
  { icon: "user" as const, label: "Preinscripción", text: "Sus datos personales, de contacto y de emergencia." },
  { icon: "layers" as const, label: "Asignación de cursos", text: "Su maestría, su trimestre y los cursos que cursará." },
  { icon: "pen" as const, label: "Carta de compromiso", text: "Se firma y se confirma la documentación que usted entregará." },
  { icon: "upload" as const, label: "Documentos", text: "Adjunta sus archivos en PDF. Puede hacerlo posteriormente." },
];

export function AccesoInscripcionGate({ onEnter }: { onEnter: (applicant: Applicant) => void }) {
  const [modo, setModo] = useState<"dpi" | "pasaporte">("dpi");
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entered, setEntered] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    const id = window.setTimeout(() => setEntered(true), 40);
    return () => window.clearTimeout(id);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const applicant = await accesoInscripcion(modo === "dpi" ? { dpi: value.trim() } : { pasaporte: value.trim() });
      onEnter(applicant);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No fue posible iniciar la inscripción. Intente nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  const on = reduce || entered;
  const beat = "transition-[opacity,transform] duration-[900ms] ease-snap";
  const state = on ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0";
  const delay = (ms: number) => ({ transitionDelay: reduce ? "0ms" : `${ms}ms` });

  return (
    <main className="min-h-screen bg-isel-paper lg:grid lg:min-h-screen lg:grid-cols-[1.08fr_1fr]">
      <section className="grain relative flex flex-col overflow-hidden bg-isel-deep px-6 py-10 sm:px-10 lg:px-14 lg:py-14">
        <div className="grid-lines pointer-events-none absolute inset-0 opacity-50" aria-hidden />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-40 top-4 h-[34rem] w-[34rem] animate-drift rounded-full bg-isel-gold opacity-25 blur-[130px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-52 -right-28 h-[30rem] w-[30rem] animate-drift2 rounded-full bg-isel-emerald/25 blur-[140px]"
        />

        <div className="relative mx-auto flex w-full max-w-[31rem] flex-1 flex-col justify-between gap-10">
          <Link to="/" className={`group inline-flex w-fit items-center gap-3 ${beat} ${state}`} style={delay(40)}>
            <span className="h-11 w-11 overflow-hidden rounded-xl bg-white/10 ring-1 ring-white/15 transition-transform duration-500 ease-snap group-hover:scale-105">
              <ImageSlot src="/images/hero/logo-isel.avif" alt="Logo ISEL" label="ISEL" tone="dark" glyph="I" />
            </span>
            <span className="flex flex-col leading-none">
              <span className="font-display text-[15px] font-bold tracking-[0.22em] text-white">ISEL</span>
              <span className="mt-1.5 text-[10px] uppercase tracking-[0.14em] text-white/45">Universidad Mesoamericana</span>
            </span>
          </Link>

          <div>
            <span className={`eyebrow text-isel-gold ${beat} ${state}`} style={delay(140)}>
              Inscripción de nuevo ingreso
            </span>
            <h1
              className={`mt-6 max-w-[14ch] text-balance font-display text-[clamp(2rem,4.2vw,3rem)] font-semibold leading-[0.98] tracking-ultratight text-white ${beat} ${state}`}
              style={delay(240)}
            >
              Inicio de su expediente
            </h1>
            <p
              className={`mt-6 max-w-[42ch] text-[14px] leading-relaxed text-white/60 ${beat} ${state}`}
              style={delay(320)}
            >
              El proceso consta de cuatro secciones que se guardan por separado. Puede cerrar la página y regresar más adelante: con su
              mismo DPI continuará donde lo dejó.
            </p>

            <RutaPasos on={on} reduce={!!reduce} />
          </div>

          <p className={`flex items-center gap-2.5 text-[12.5px] text-white/35 ${beat} ${state}`} style={delay(1300)}>
            <Icon name="lock" size={14} />
            No se requiere contraseña: su DPI o pasaporte le permite regresar al proceso.
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center px-6 py-14 sm:px-10 lg:px-14">
        <div className="w-full max-w-[26rem]">
          {/* Salida siempre a la vista, con forma de botón — no un enlace tenue al pie. */}
          <div className={`mb-8 ${beat} ${state}`} style={delay(200)}>
            <BackButton to="/">Volver al inicio</BackButton>
          </div>

          <div className={`${beat} ${state}`} style={delay(300)}>
            <p className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-isel-gold2">Identificación</p>
            <h2 className="mt-3 font-display text-[1.7rem] font-semibold leading-[1.05] tracking-ultratight text-isel-navy">
              ¿Con qué documento se identifica?
            </h2>
          </div>

          <form onSubmit={handleSubmit} className={`mt-8 ${beat} ${state}`} style={delay(420)}>
            <div className="mb-5">
              <Segmented
                value={modo}
                onChange={(m) => {
                  setModo(m);
                  setValue("");
                  setError(null);
                }}
                options={[
                  { value: "dpi" as const, label: "DPI" },
                  { value: "pasaporte" as const, label: "Pasaporte (extranjero)" },
                ]}
              />
            </div>

            <label className="block">
              <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-[0.14em] text-isel-ink/45">
                {modo === "dpi" ? "Número de DPI" : "Número de pasaporte"}
              </span>
              <input
                autoFocus
                inputMode={modo === "dpi" ? "numeric" : "text"}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={modo === "dpi" ? "2900 12345 0101" : "AA1234567"}
                className={fieldClass}
              />
            </label>

            {error && (
              <div className="mt-5">
                <Alert kind="error">{error}</Alert>
              </div>
            )}

            <PortalButton
              type="submit"
              tone="accent"
              icon="arrowRight"
              iconRight
              full
              loading={loading}
              disabled={!value.trim()}
              className="mt-7 py-3.5 text-[14px]"
            >
              Empezar / continuar
            </PortalButton>
          </form>
        </div>
      </section>
    </main>
  );
}

/* ------------------------------------------------------------------------- */

/**
 * Los cuatro pasos colgando de un hilo que se traza al entrar (scaleY, un solo
 * transform) y nodos que llegan uno detrás de otro. Cada nodo enciende su
 * anillo al pasar el cursor, así se puede recorrer la lista con el ratón sin
 * que nada se mueva de sitio.
 */
function RutaPasos({ on, reduce }: { on: boolean; reduce: boolean }) {
  const beat = "transition-[opacity,transform] duration-[900ms] ease-snap";
  const state = on ? "translate-x-0 opacity-100" : "-translate-x-3 opacity-0";
  const delay = (ms: number) => ({ transitionDelay: reduce ? "0ms" : `${ms}ms` });

  return (
    <ol className="relative mt-9 flex flex-col gap-5 pl-1">
      {/* El hilo: se dibuja de arriba abajo justo antes de que lleguen los nodos. */}
      <span
        aria-hidden
        className={`absolute left-[22px] top-3 w-px origin-top bg-gradient-to-b from-isel-gold/70 via-white/20 to-transparent transition-transform duration-[1400ms] ease-snap ${
          on ? "scale-y-100" : "scale-y-0"
        }`}
        style={{ height: "calc(100% - 2rem)", transitionDelay: reduce ? "0ms" : "420ms" }}
      />

      {PASOS.map((p, i) => (
        <li
          key={p.label}
          className={`group/paso relative flex items-start gap-4 ${beat} ${state}`}
          style={delay(560 + i * 130)}
        >
          <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/12 bg-white/[0.06] text-isel-gold backdrop-blur-sm transition-[background-color,border-color,transform] duration-500 ease-snap group-hover/paso:-translate-y-0.5 group-hover/paso:border-isel-gold/45 group-hover/paso:bg-isel-gold/15">
            <Icon name={p.icon} size={17} />
            <span className="tabular absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-isel-gold px-1 font-display text-[9.5px] font-bold text-isel-deep">
              {i + 1}
            </span>
          </span>
          <div className="min-w-0 pt-0.5">
            <p className="font-display text-[15px] font-semibold leading-snug text-white">{p.label}</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-white/45">{p.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
