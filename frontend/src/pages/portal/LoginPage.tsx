import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useReducedMotion } from "framer-motion";
import { login } from "@/lib/auth";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { Icon } from "@/components/portal/Icon";
import { Alert, PortalButton } from "@/components/portal/kit";

/**
 * Asignación — acceso al portal.
 *
 * Lo que fallaba antes: la columna oscura tenía el contenido pegado al borde
 * (padding y nada más, sin columna de medida), así que a 1440px el texto
 * empezaba a 40px del canto y el resto era campo vacío. Y lo que había en ella
 * era un cartel: título, tres viñetas, ninguna razón para mirarlo dos veces.
 *
 * Ahora las dos mitades tienen su columna medida y centrada, y la izquierda
 * hace algo: sostiene la ficha en perspectiva —el mismo papel que se firma
 * dentro del portal— y **el carné se va escribiendo en ella** mientras lo
 * tecleas, casilla a casilla. Esa interacción no es decorativa: enseña el
 * documento al que estás entrando y confirma dígito a dígito lo que llevas
 * escrito, que es justo lo que uno comprueba dos veces antes de pulsar.
 *
 * Si el carné no existe, las casillas se tiñen del rojo de la marca: el error
 * aparece donde estabas mirando, no solo en un aviso debajo del campo.
 */

const PASOS = [
  { icon: "layers" as const, text: "Eliges tu maestría y el trimestre que vas a cursar." },
  { icon: "check" as const, text: "Revisas los cursos que se te asignan y agregas los adicionales." },
  { icon: "pen" as const, text: "Firmas tu ficha y la envías." },
];

/** Nº de casillas del carné en la hoja. Los carnés de la UMES son de 9 dígitos. */
const SLOTS = 9;

export function LoginPage() {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [entered, setEntered] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reduce = useReducedMotion();

  useEffect(() => {
    document.title = "Asignación | Portal ISEL";
    const id = window.setTimeout(() => setEntered(true), 40);
    return () => window.clearTimeout(id);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const session = await login(value.trim());
      const programa = searchParams.get("programa");
      if (session.role === "admin") {
        navigate("/portal/admin");
      } else {
        navigate(`/portal/estudiante${programa ? `?programa=${programa}` : ""}`);
      }
    } catch {
      setError("No encontramos ese carné. Verifica el número e intenta de nuevo.");
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
      {/* ---------------------------------------------------- panel de marca */}
      <section className="grain relative flex flex-col overflow-hidden bg-isel-deep px-6 py-10 sm:px-10 lg:px-14 lg:py-14">
        <div className="grid-lines pointer-events-none absolute inset-0 opacity-50" aria-hidden />
        {/* El campo verde se aviva mientras el campo tiene el foco: la mitad
            oscura acusa recibo de que estás escribiendo al otro lado. */}
        <div
          aria-hidden
          className={`pointer-events-none absolute -left-40 top-4 h-[34rem] w-[34rem] animate-drift rounded-full bg-isel-emerald blur-[130px] transition-opacity duration-[1200ms] ease-snap ${
            focused ? "opacity-40" : "opacity-25"
          }`}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-48 -right-24 h-[28rem] w-[28rem] animate-drift2 rounded-full bg-isel-gold/10 blur-[130px]"
        />

        <div className="relative mx-auto flex w-full max-w-[31rem] flex-1 flex-col justify-between gap-12">
          <Link to="/" className={`group inline-flex w-fit items-center gap-3 ${beat} ${state}`} style={delay(40)}>
            <span className="h-11 w-11 overflow-hidden rounded-xl bg-white/10 ring-1 ring-white/15 transition-transform duration-500 ease-snap group-hover:scale-105">
              <ImageSlot src="/images/hero/logo-isel.avif" alt="Logo ISEL" label="ISEL" tone="dark" glyph="I" />
            </span>
            <span className="flex flex-col leading-none">
              <span className="font-display text-[15px] font-bold tracking-[0.22em] text-white">ISEL</span>
              <span className="mt-1.5 text-[10px] uppercase tracking-[0.14em] text-white/45">
                Universidad Mesoamericana
              </span>
            </span>
          </Link>

          <div>
            <span className={`eyebrow text-isel-gold ${beat} ${state}`} style={delay(140)}>
              Asignación de cursos
            </span>
            <h1
              className={`mt-6 max-w-[12ch] text-balance font-display text-[clamp(2.2rem,4.6vw,3.4rem)] font-semibold leading-[0.98] tracking-ultratight text-white ${beat} ${state}`}
              style={delay(240)}
            >
              Tu ficha empieza aquí
            </h1>

            <div className={`mt-10 ${beat} ${state}`} style={delay(380)}>
              <CarnetSheet value={value} error={error !== null} />
            </div>
          </div>

          <p className={`flex items-center gap-2.5 text-[12.5px] text-white/35 ${beat} ${state}`} style={delay(620)}>
            <Icon name="lock" size={14} />
            Tu carné es lo único que necesitas: este portal no usa contraseña.
          </p>
        </div>
      </section>

      {/* ---------------------------------------------------------- el campo */}
      <section className="flex items-center justify-center px-6 py-14 sm:px-10 lg:px-14">
        <div className="w-full max-w-[26rem]">
          <div className={`${beat} ${state}`} style={delay(300)}>
            <p className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-isel-gold2">Ingreso de estudiantes</p>
            <h2 className="mt-3 font-display text-[1.9rem] font-semibold leading-[1.05] tracking-ultratight text-isel-navy">
              Escribe tu carné
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-isel-ink/55">
              El mismo número que aparece en tus registros de la Universidad Mesoamericana.
            </p>
          </div>

          <form onSubmit={handleSubmit} className={`mt-9 ${beat} ${state}`} style={delay(420)}>
            <label className="block">
              <span className="mb-3 block text-[10.5px] font-bold uppercase tracking-[0.16em] text-isel-ink/45">
                Número de carné
              </span>

              <div className="relative">
                <input
                  autoFocus
                  inputMode="numeric"
                  value={value}
                  onChange={(e) => {
                    setValue(e.target.value);
                    if (error) setError(null);
                  }}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder="202630503"
                  aria-invalid={error !== null}
                  className="carnet-input w-full border-0 border-b-2 border-isel-line bg-transparent px-0 pb-3 font-display text-[2rem] font-semibold text-isel-navy transition-colors duration-300 ease-crisp placeholder:font-normal placeholder:text-isel-ink/20 focus:outline-none sm:text-[2.4rem]"
                />
                <span
                  aria-hidden
                  className={`absolute -bottom-[2px] left-0 h-[2px] w-full origin-left transition-[transform,background-color] duration-[600ms] ease-snap ${
                    error ? "bg-isel-alert" : "bg-isel-emerald"
                  } ${focused || value ? "scale-x-100" : "scale-x-0"}`}
                />
              </div>
            </label>

            {error && (
              <div className="mt-6">
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
              className="mt-8 py-3.5 text-[14px]"
            >
              Entrar al portal
            </PortalButton>
          </form>

          {/* Qué pasa después de pulsar. Va aquí, junto al botón, y no al otro
              lado de la pantalla: es donde alguien duda antes de entrar. */}
          <div className={`mt-10 border-t border-isel-line pt-7 ${beat} ${state}`} style={delay(540)}>
            <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-isel-ink/40">Lo que sigue</p>
            <ol className="mt-4 space-y-3.5">
              {PASOS.map((p, i) => (
                <li key={p.text} className="flex items-start gap-3">
                  <span className="mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-isel-navy/[0.06] text-isel-navy/70">
                    <Icon name={p.icon} size={12} />
                  </span>
                  <span className="flex-1 text-[13px] leading-relaxed text-isel-ink/60">
                    <span className="tabular mr-1.5 font-display text-[11px] font-bold text-isel-ink/30">0{i + 1}</span>
                    {p.text}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <div className={`mt-8 ${beat} ${state}`} style={delay(640)}>
            <Link
              to="/"
              className="group inline-flex items-center gap-2 text-[13px] font-semibold text-isel-ink/50 transition-colors duration-300 ease-crisp hover:text-isel-navy"
            >
              <Icon
                name="arrowLeft"
                size={15}
                className="transition-transform duration-500 ease-snap group-hover:-translate-x-1"
              />
              Volver al sitio de ISEL
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

/* ------------------------------------------------------------------------- */

/**
 * La ficha en blanco, esperando. Se inclina siguiendo el puntero —poco, y solo
 * con ratón— y las casillas del carné se van llenando con lo que escribes.
 */
function CarnetSheet({ value, error }: { value: string; error: boolean }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [fine, setFine] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: fine)");
    const sync = () => setFine(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const live = fine && !reduce;

  const onMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!live) return;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setTilt({
        x: -((e.clientY - r.top) / r.height - 0.5) * 11,
        y: ((e.clientX - r.left) / r.width - 0.5) * 13,
      });
    },
    [live],
  );

  const digits = value.replace(/\s/g, "").slice(0, SLOTS);
  const slots = Array.from({ length: SLOTS }, (_, i) => digits[i] ?? "");
  const completo = digits.length >= SLOTS;

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={() => setTilt({ x: 0, y: 0 })}
      className="relative w-full max-w-[24rem] [perspective:1200px]"
      aria-hidden
    >
      <div
        className="preserve-3d relative transition-transform duration-[700ms] ease-snap"
        style={{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}
      >
        <span
          className="absolute inset-0 rounded-[1.1rem] border border-white/10 bg-white/[0.07]"
          style={{ transform: "translate3d(14px, 16px, -60px)" }}
        />
        <span
          className="absolute inset-0 rounded-[1.1rem] border border-white/10 bg-white/[0.12]"
          style={{ transform: "translate3d(7px, 8px, -30px)" }}
        />

        <div className="relative overflow-hidden rounded-[1.1rem] bg-isel-paper px-6 py-6 shadow-lift">
          <span
            className="pointer-events-none absolute inset-0 opacity-[0.5]"
            style={{
              backgroundImage: "repeating-linear-gradient(to bottom, rgba(20,73,60,0.055) 0 1px, transparent 1px 26px)",
            }}
          />

          <div className="relative flex items-center justify-between gap-3 border-b border-isel-navy/15 pb-3">
            <p className="text-[8.5px] font-bold uppercase tracking-[0.16em] text-isel-navy/60">
              Universidad Mesoamericana
            </p>
            <p className="text-[8.5px] font-bold uppercase tracking-[0.22em] text-isel-gold2">ISEL</p>
          </div>

          <p className="relative mt-4 font-display text-[13px] font-bold uppercase tracking-[0.1em] text-isel-navy">
            Ficha de asignación de cursos
          </p>

          {/* El carné, casilla a casilla. */}
          <div className="relative mt-6">
            <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-isel-ink/40">Carné</p>
            <div className="mt-2 flex gap-[5px]">
              {slots.map((d, i) => (
                <span
                  key={i}
                  className={`flex h-9 flex-1 items-end justify-center border-b-2 pb-0.5 font-display text-[17px] font-semibold transition-[color,border-color,transform] duration-300 ease-back ${
                    error
                      ? "border-isel-alert/60 text-isel-alert"
                      : d
                        ? "-translate-y-px border-isel-emerald text-isel-navy"
                        : "border-isel-navy/20 text-transparent"
                  }`}
                >
                  {d || "0"}
                </span>
              ))}
            </div>
          </div>

          <div className="relative mt-6">
            <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-isel-ink/40">Estudiante</p>
            <span className="mt-3 block h-px w-full bg-isel-navy/20" />
          </div>

          <div className="relative mt-6 flex items-end gap-4">
            <div className="flex-1">
              <span className="block h-px w-full bg-isel-navy/20" />
              <p className="mt-1.5 text-[8px] font-bold uppercase tracking-[0.14em] text-isel-ink/35">
                Firma del estudiante
              </p>
            </div>

            {/* El sello se "entinta" cuando el carné está completo. */}
            <span
              className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-500 ease-crisp ${
                completo ? "border-isel-gold" : "border-isel-gold/30"
              }`}
              style={{ transform: "translateZ(24px) rotate(-9deg)" }}
            >
              <span
                className={`absolute inset-1 rounded-full border transition-colors duration-500 ease-crisp ${
                  completo ? "border-isel-gold/60" : "border-isel-gold/20"
                }`}
              />
              <span
                className={`font-display text-[8.5px] font-bold uppercase tracking-[0.14em] transition-colors duration-500 ease-crisp ${
                  completo ? "text-isel-gold2" : "text-isel-gold2/40"
                }`}
              >
                ISEL
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
