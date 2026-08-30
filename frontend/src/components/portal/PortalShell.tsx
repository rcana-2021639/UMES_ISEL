import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useReducedMotion } from "framer-motion";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { useReveal } from "@/components/ui/RevealOnScroll";
import { Icon } from "./Icon";
import { PortalButton } from "./kit";

/**
 * Estructura común del portal: barra superior, banda de identidad, paneles
 * numerados y el riel de pasos.
 *
 * El portal no puede parecer otro producto que el sitio público, pero tampoco
 * puede comportarse igual: allí el movimiento es el espectáculo, aquí es
 * orientación. Por eso hay UN solo gesto memorable —el riel lateral que sigue
 * el scroll y va marcando en qué paso vas— y el resto es quieto y rápido.
 *
 * Todo lo que descubre contenido se anima con transiciones CSS sobre
 * `useReveal` (medición de rect + scroll pasivo), nunca con la librería de
 * animación: si algo fallara al arrancar, el contenido igual queda visible.
 */

/* ------------------------------------------------------------- barra fija */

interface TopBarProps {
  /** "Portal del estudiante" / "Panel administrativo". */
  context: string;
  /** Bloque de identidad a la derecha (nombre + carné, o el rol). */
  identity?: ReactNode;
  onLogout: () => void;
}

export function PortalTopBar({ context, identity, onLogout }: TopBarProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function onScroll() {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-isel-deep">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-5 sm:px-8">
        <Link to="/" className="group flex shrink-0 items-center gap-3" title="Volver al sitio de ISEL">
          <span className="h-9 w-9 overflow-hidden rounded-xl bg-white/10 ring-1 ring-white/15 transition-transform duration-500 ease-snap group-hover:scale-105">
            <ImageSlot src="/images/hero/logo-isel.png" alt="Logo ISEL" label="ISEL" tone="dark" glyph="I" />
          </span>
          <span className="hidden font-display text-[14px] font-bold tracking-[0.22em] text-white sm:block">ISEL</span>
        </Link>

        <span aria-hidden className="hidden h-5 w-px bg-white/15 sm:block" />

        <p className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-white/60">{context}</p>

        {identity}

        <PortalButton tone="onDark" size="sm" icon="logout" onClick={onLogout} className="shrink-0">
          <span className="hidden sm:inline">Cerrar sesión</span>
          <span className="sm:hidden">Salir</span>
        </PortalButton>
      </div>

      {/* Avance de lectura: la única señal de movimiento continuo del portal. */}
      <span aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-white/10">
        <span
          className="block h-full origin-left bg-isel-gold transition-transform duration-150 ease-crisp"
          style={{ transform: `scaleX(${progress})` }}
        />
      </span>
    </header>
  );
}

/* --------------------------------------------------------- banda oscura */

interface BandProps {
  eyebrow: string;
  title: ReactNode;
  meta?: ReactNode;
  aside?: ReactNode;
}

/**
 * Primer impacto al entrar. Continúa el verde de la barra hacia abajo y suelta
 * el nombre en tipografía de titular: en la versión anterior el saludo era una
 * línea de 20px sobre blanco y el portal empezaba sin ningún momento propio.
 */
export function PortalBand({ eyebrow, title, meta, aside }: BandProps) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setShown(true), 40);
    return () => window.clearTimeout(id);
  }, []);

  const on = reduce || shown;
  const beat = "transition-[opacity,transform] duration-[900ms] ease-snap";
  const state = on ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0";

  return (
    <div className="grain relative overflow-hidden bg-isel-deep">
      <div className="grid-lines pointer-events-none absolute inset-0 opacity-50" aria-hidden />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 -top-40 h-[30rem] w-[30rem] animate-drift rounded-full bg-isel-emerald/20 blur-[130px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-56 right-0 h-[26rem] w-[26rem] animate-drift2 rounded-full bg-isel-gold/10 blur-[130px]"
      />

      <div className="relative mx-auto flex max-w-7xl flex-col gap-8 px-5 py-12 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:py-16">
        <div className="min-w-0">
          <span
            className={`eyebrow text-isel-gold ${beat} ${state}`}
            style={{ transitionDelay: reduce ? "0ms" : "40ms" }}
          >
            {eyebrow}
          </span>
          <h1
            className={`mt-5 max-w-[18ch] text-balance font-display text-[clamp(1.9rem,4.6vw,3.4rem)] font-semibold leading-[1.02] tracking-ultratight text-white ${beat} ${state}`}
            style={{ transitionDelay: reduce ? "0ms" : "140ms" }}
          >
            {title}
          </h1>
          {meta && (
            <div
              className={`mt-6 flex flex-wrap items-center gap-2 ${beat} ${state}`}
              style={{ transitionDelay: reduce ? "0ms" : "280ms" }}
            >
              {meta}
            </div>
          )}
        </div>

        {aside && (
          <div className={`shrink-0 ${beat} ${state}`} style={{ transitionDelay: reduce ? "0ms" : "400ms" }}>
            {aside}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- paneles */

interface PanelProps {
  id?: string;
  /** Numeral del paso; se dibuja en contorno, sin peso de tinta. */
  step?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Superficie de trabajo. Antes todos los bloques eran el mismo rectángulo
 * blanco con la misma sombra: cinco cajas iguales sin decir cuál es el primer
 * paso ni cuánto queda. Ahora el encabezado lleva numeral, título y una línea
 * de instrucción, y la tarjeta reacciona al foco de teclado de lo que contiene.
 */
export function PortalPanel({ id, step, title, description, actions, children, className = "" }: PanelProps) {
  const reduce = useReducedMotion();
  const { ref, shown } = useReveal<HTMLElement>(0.08);
  const on = reduce || shown;

  return (
    <section
      id={id}
      ref={ref}
      className={`scroll-mt-28 overflow-hidden rounded-2xl border border-isel-line bg-white shadow-card
        transition-[opacity,transform] duration-[800ms] ease-snap
        ${on ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"} ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-isel-line/70 bg-isel-paper/50 px-5 py-4 sm:px-7 sm:py-5">
        <div className="flex min-w-0 items-start gap-4">
          {step && (
            <span
              aria-hidden
              className="numeral-outline mt-0.5 shrink-0 font-display text-[2.1rem] font-bold leading-[0.8] text-isel-navy/45"
            >
              {step}
            </span>
          )}
          <div className="min-w-0">
            <h2 className="font-display text-[17px] font-semibold tracking-tightest text-isel-navy sm:text-[19px]">
              {title}
            </h2>
            {description && (
              <p className="mt-1.5 max-w-[62ch] text-[13px] leading-relaxed text-isel-ink/55">{description}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>

      <div className="px-5 py-6 sm:px-7">{children}</div>
    </section>
  );
}

/* ----------------------------------------------------------- riel de pasos */

/**
 * Mide qué sección ocupa la franja de lectura leyendo rects en un listener de
 * scroll pasivo. Es indicador, no contenido, pero se mide igual que el resto:
 * un IntersectionObserver que se registre antes de que existan los nodos se
 * queda mudo para siempre, y este no.
 */
function useScrollSpy(ids: string[]): string | null {
  const [active, setActive] = useState<string | null>(ids[0] ?? null);
  const key = ids.join("|");

  useEffect(() => {
    function measure() {
      const line = window.innerHeight * 0.34;
      let current: string | null = null;
      for (const id of key.split("|")) {
        const el = document.getElementById(id);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.top <= line && r.bottom > line * 0.5) current = id;
        else if (r.top > line && current === null) break;
      }
      setActive((prev) => current ?? prev);
    }
    measure();
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [key]);

  return active;
}

export interface RailStep {
  id: string;
  label: string;
}

/**
 * Momento de firma del portal: una columna fija donde el punto activo se
 * desplaza mientras bajas y la línea de progreso se llena tras él. Responde a
 * lo que el usuario dijo —"no quiero que no sepan dónde están las cosas"—
 * mejor que cualquier animación decorativa: es movimiento que informa.
 */
export function StepRail({ steps }: { steps: RailStep[] }) {
  const active = useScrollSpy(steps.map((s) => s.id));
  const index = Math.max(0, steps.findIndex((s) => s.id === active));

  return (
    <div className="sticky top-24 hidden lg:block">
      <p className="mb-5 text-[10.5px] font-bold uppercase tracking-[0.2em] text-isel-ink/35">Tu ficha, paso a paso</p>

      <ol className="relative pl-6">
        {/* Carril y su relleno: solo se anima scaleY. */}
        <span aria-hidden className="absolute bottom-2 left-[5px] top-2 w-px bg-isel-line" />
        <span
          aria-hidden
          className="absolute left-[5px] top-2 w-px origin-top bg-isel-emerald transition-transform duration-[700ms] ease-snap"
          style={{
            height: "calc(100% - 1rem)",
            transform: `scaleY(${steps.length > 1 ? index / (steps.length - 1) : 1})`,
          }}
        />

        {steps.map((s, i) => {
          const done = i < index;
          const now = i === index;
          return (
            <li key={s.id} className="relative pb-7 last:pb-0">
              <span
                aria-hidden
                className={`absolute -left-6 top-1.5 flex h-[11px] w-[11px] items-center justify-center rounded-full border transition-[background-color,border-color,transform] duration-500 ease-back ${
                  now
                    ? "scale-125 border-isel-emerald bg-isel-emerald"
                    : done
                      ? "border-isel-emerald bg-isel-emerald"
                      : "border-isel-line bg-white"
                }`}
              />
              <a
                href={`#${s.id}`}
                className={`block text-[13.5px] font-semibold leading-snug transition-colors duration-300 ease-crisp ${
                  now ? "text-isel-navy" : done ? "text-isel-ink/55 hover:text-isel-navy" : "text-isel-ink/35 hover:text-isel-navy"
                }`}
              >
                {s.label}
              </a>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Riel en móvil: la misma información, en una tira que no ocupa columna. */
export function StepStrip({ steps }: { steps: RailStep[] }) {
  const active = useScrollSpy(steps.map((s) => s.id));
  const index = Math.max(0, steps.findIndex((s) => s.id === active));

  return (
    <div className="sticky top-16 z-30 -mx-5 mb-6 border-b border-isel-line bg-isel-paper/95 px-5 py-3 backdrop-blur lg:hidden">
      <div className="mask-fade-x no-scrollbar flex items-center gap-2 overflow-x-auto">
        {steps.map((s, i) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors duration-300 ease-crisp ${
              i === index
                ? "border-transparent bg-isel-navy text-white"
                : i < index
                  ? "border-isel-emerald/30 bg-isel-emerald/10 text-isel-emerald2"
                  : "border-isel-line bg-white text-isel-ink/45"
            }`}
          >
            <span className="mr-1.5 tabular">{i + 1}</span>
            {s.label}
          </a>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- utilidades */

/** Dato numérico del panel: cifra grande y etiqueta corta. */
export function StatTile({
  value,
  label,
  icon,
  tone = "navy",
}: {
  value: ReactNode;
  label: string;
  icon: Parameters<typeof Icon>[0]["name"];
  tone?: "navy" | "emerald" | "sky" | "plum";
}) {
  const color = { navy: "text-isel-navy", emerald: "text-isel-emerald2", sky: "text-isel-sky", plum: "text-isel-plum" }[
    tone
  ];
  return (
    <div className="flex items-center gap-4 rounded-xl border border-isel-line bg-white px-4 py-3.5">
      <span className={`flex h-9 w-9 items-center justify-center rounded-lg bg-isel-paper ${color}`}>
        <Icon name={icon} size={17} />
      </span>
      <div className="min-w-0">
        <p className={`tabular font-display text-[22px] font-semibold leading-none tracking-tightest ${color}`}>{value}</p>
        <p className="mt-1 truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-isel-ink/40">{label}</p>
      </div>
    </div>
  );
}
