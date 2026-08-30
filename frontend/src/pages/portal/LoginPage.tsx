import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useReducedMotion } from "framer-motion";
import { login } from "@/lib/auth";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { Icon } from "@/components/portal/Icon";
import { Alert, PortalButton } from "@/components/portal/kit";

/**
 * Acceso al portal.
 *
 * El anterior era una tarjeta redondeada flotando sobre un verde plano, con un
 * balanceo 3D al mover el ratón: el layout más barato posible y encima el gesto
 * más manido. Aquí el acceso ocupa la pantalla entera y se parte en dos:
 *
 *  · Izquierda, oscura: la marca y —lo importante— qué va a pasar después.
 *    Nadie escribe su carné con confianza en una caja que no explica nada.
 *  · Derecha, papel: un solo campo, tratado como el protagonista que es.
 *
 * El momento de firma es el propio campo del carné: dígitos separados y de
 * ancho fijo (como se lee un carné en voz alta) sobre un filete que se traza de
 * izquierda a derecha al enfocarlo. Es el único input así en todo el proyecto,
 * y sale del contenido: aquí solo hay un dato y es un número.
 *
 * No hay contraseña — y eso se dice, en lugar de dejar al usuario buscándola.
 */

const PASOS = [
  { icon: "layers" as const, text: "Eliges tu maestría y el trimestre que vas a cursar." },
  { icon: "check" as const, text: "Revisas los cursos que se te asignan y agregas los adicionales." },
  { icon: "pen" as const, text: "Firmas tu ficha y la envías." },
];

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
    document.title = "Portal ISEL | Iniciar sesión";
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
    <main className="min-h-screen bg-isel-paper lg:grid lg:min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* ---------------------------------------------------- panel de marca */}
      <section className="grain relative flex flex-col justify-between overflow-hidden bg-isel-deep px-6 py-10 sm:px-10 lg:py-14">
        <div className="grid-lines pointer-events-none absolute inset-0 opacity-50" aria-hidden />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-40 top-10 h-[32rem] w-[32rem] animate-drift rounded-full bg-isel-emerald/25 blur-[130px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-48 -right-24 h-[28rem] w-[28rem] animate-drift2 rounded-full bg-isel-gold/10 blur-[130px]"
        />

        <Link
          to="/"
          className={`group relative inline-flex w-fit items-center gap-3 ${beat} ${state}`}
          style={delay(40)}
        >
          <span className="h-11 w-11 overflow-hidden rounded-xl bg-white/10 ring-1 ring-white/15 transition-transform duration-500 ease-snap group-hover:scale-105">
            <ImageSlot src="/images/hero/logo-isel.png" alt="Logo ISEL" label="ISEL" tone="dark" glyph="I" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-display text-[15px] font-bold tracking-[0.22em] text-white">ISEL</span>
            <span className="mt-1.5 text-[10px] uppercase tracking-[0.14em] text-white/45">
              Universidad Mesoamericana
            </span>
          </span>
        </Link>

        <div className="relative my-14 lg:my-0">
          <span className={`eyebrow text-isel-gold ${beat} ${state}`} style={delay(140)}>
            Portal ISEL
          </span>
          <h1
            className={`mt-6 max-w-[13ch] text-balance font-display text-[clamp(2.4rem,5.6vw,4rem)] font-semibold leading-[0.98] tracking-ultratight text-white ${beat} ${state}`}
            style={delay(240)}
          >
            Asignación de cursos
          </h1>

          <ol className="mt-11 max-w-md space-y-5">
            {PASOS.map((p, i) => (
              <li
                key={p.text}
                className={`flex items-start gap-4 ${beat} ${state}`}
                style={delay(380 + i * 110)}
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] text-isel-gold">
                  <Icon name={p.icon} size={15} />
                </span>
                <span className="flex-1 pt-1 text-[14.5px] leading-relaxed text-white/65">
                  <span className="mr-2 font-display text-[12px] font-bold tabular text-white/30">0{i + 1}</span>
                  {p.text}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <p
          className={`relative flex items-center gap-2.5 text-[12.5px] text-white/35 ${beat} ${state}`}
          style={delay(740)}
        >
          <Icon name="lock" size={14} />
          Tu carné es lo único que necesitas: este portal no usa contraseña.
        </p>
      </section>

      {/* ---------------------------------------------------------- el campo */}
      <section className="flex items-center justify-center px-6 py-14 sm:px-10 lg:py-14">
        <div className="w-full max-w-md">
          <div className={`${beat} ${state}`} style={delay(300)}>
            <p className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-isel-gold2">Ingreso de estudiantes</p>
            <h2 className="mt-3 font-display text-[1.9rem] font-semibold leading-[1.05] tracking-ultratight text-isel-navy">
              Escribe tu carné
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-isel-ink/55">
              El mismo número que aparece en tus registros de la Universidad Mesoamericana.
            </p>
          </div>

          <form onSubmit={handleSubmit} className={`mt-10 ${beat} ${state}`} style={delay(420)}>
            <label className="block">
              <span className="mb-3 block text-[10.5px] font-bold uppercase tracking-[0.16em] text-isel-ink/45">
                Número de carné
              </span>

              <div className="relative">
                <input
                  autoFocus
                  inputMode="numeric"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder="202630503"
                  aria-invalid={error !== null}
                  className="carnet-input w-full border-0 border-b-2 border-isel-line bg-transparent px-0 pb-3 font-display text-[2rem] font-semibold text-isel-navy transition-colors duration-300 ease-crisp placeholder:font-normal placeholder:text-isel-ink/20 focus:outline-none sm:text-[2.4rem]"
                />
                {/* Filete que se traza al enfocar: el campo se "abre" en vez de
                    encenderse un halo azul del navegador. */}
                <span
                  aria-hidden
                  className={`absolute -bottom-[2px] left-0 h-[2px] w-full origin-left bg-isel-emerald transition-transform duration-[600ms] ease-snap ${
                    focused || value ? "scale-x-100" : "scale-x-0"
                  }`}
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

          <div className={`mt-10 border-t border-isel-line pt-6 ${beat} ${state}`} style={delay(560)}>
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
