import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useReducedMotion } from "framer-motion";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { useReveal } from "@/components/ui/RevealOnScroll";
import { PortalButton } from "./kit";

/**
 * Estructura común del portal: barra superior, banda de identidad, paneles y
 * el riel de pasos.
 *
 * El portal no puede parecer otro producto que el sitio público, pero tampoco
 * comportarse igual: allí el movimiento es el espectáculo, aquí es
 * orientación. Un solo gesto con protagonismo —el riel que sigue el scroll— y
 * el resto disciplinado.
 *
 * Todo lo que descubre contenido se anima con transiciones CSS sobre
 * `useReveal` (rect + scroll pasivo en captura), nunca con la librería de
 * animación: si algo fallara al arrancar, el contenido igual queda visible.
 */

/* ------------------------------------------------------------- barra fija */

interface TopBarProps {
  /** "Portal del estudiante" / "Panel administrativo". */
  context: string;
  /** Bloque de identidad a la derecha. */
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
            <ImageSlot src="/images/hero/logo-isel.avif" alt="Logo ISEL" label="ISEL" tone="dark" glyph="I" />
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
 * el nombre en tipografía de titular. Los campos de color derivan muy despacio
 * y la banda se despide con un degradado de trama hacia el papel, para que el
 * corte entre lo oscuro y lo claro no sea una línea recta más.
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

      <div className="relative mx-auto flex max-w-7xl flex-col gap-10 px-5 py-12 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:gap-16 lg:py-16">
        <div className="min-w-0 flex-1">
          <span className={`eyebrow text-isel-gold ${beat} ${state}`} style={{ transitionDelay: reduce ? "0ms" : "40ms" }}>
            {eyebrow}
          </span>
          <h1
            className={`mt-5 max-w-[16ch] text-balance font-display text-[clamp(1.9rem,4.6vw,3.4rem)] font-semibold leading-[1.02] tracking-ultratight text-white ${beat} ${state}`}
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

      {/* Despedida de la banda: la trama se disuelve hacia el papel. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-isel-deep/0"
        style={{ backgroundImage: "linear-gradient(to bottom, rgba(6,26,22,0), rgba(246,243,236,0.06))" }}
      />
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
  /**
   * Color propio del panel. Cada paso del portal tiene el suyo —igual que cada
   * maestría en el sitio público— para que la ficha no sea una fila de cinco
   * cajas blancas idénticas y para que se sepa de un vistazo en cuál estás.
   */
  accent?: string;
}

export function PortalPanel({
  id,
  step,
  title,
  description,
  actions,
  children,
  className = "",
  accent = "#12855C",
}: PanelProps) {
  const reduce = useReducedMotion();
  const { ref, shown } = useReveal<HTMLElement>(0.08);
  const on = reduce || shown;

  return (
    <section
      id={id}
      ref={ref}
      style={{ ["--accent" as string]: accent }}
      className={`group/panel relative scroll-mt-28 overflow-hidden rounded-2xl border border-isel-line bg-white shadow-card
        transition-[opacity,transform,box-shadow] duration-[800ms] ease-snap
        hover:shadow-card-hover
        ${on ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"} ${className}`}
    >
      {/* Filo del color del paso: se traza de izquierda a derecha al aparecer. */}
      <span
        aria-hidden
        className={`absolute inset-x-0 top-0 z-10 h-[3px] origin-left bg-[var(--accent)] transition-transform duration-[900ms] ease-snap ${
          on ? "scale-x-100" : "scale-x-0"
        }`}
        style={{ transitionDelay: reduce ? "0ms" : "220ms" }}
      />

      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-isel-line/70 bg-isel-paper/50 px-5 py-4 sm:px-7 sm:py-5">
        <div className="flex min-w-0 items-start gap-4">
          {step && (
            <span
              aria-hidden
              className="numeral-outline mt-0.5 shrink-0 font-display text-[2.1rem] font-bold leading-[0.8] text-[var(--accent)] opacity-70 transition-opacity duration-500 ease-crisp group-hover/panel:opacity-100"
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
 * Mide qué sección ocupa la franja de lectura con rects en un listener pasivo.
 * Un IntersectionObserver registrado antes de que existan los nodos se queda
 * mudo para siempre; esto no.
 */
function useScrollSpy(ids: string[]): { active: string | null; ratio: number } {
  const [active, setActive] = useState<string | null>(ids[0] ?? null);
  const [ratio, setRatio] = useState(0);
  const key = ids.join("|");

  useEffect(() => {
    function measure() {
      const list = key.split("|");
      const line = window.innerHeight * 0.34;
      let current: string | null = null;
      for (const id of list) {
        const el = document.getElementById(id);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.top <= line && r.bottom > line * 0.5) current = id;
        else if (r.top > line && current === null) break;
      }
      setActive((prev) => current ?? prev);

      // Progreso continuo entre el primer y el último panel: alimenta la
      // barra del riel, que así avanza mientras se lee y no a saltos.
      const first = document.getElementById(list[0]);
      const last = document.getElementById(list[list.length - 1]);
      if (first && last) {
        const a = first.getBoundingClientRect().top;
        const b = last.getBoundingClientRect().bottom;
        const span = b - a;
        setRatio(span > 0 ? Math.max(0, Math.min(1, (line - a) / span)) : 0);
      }
    }
    measure();
    document.addEventListener("scroll", measure, { passive: true, capture: true });
    window.addEventListener("resize", measure);
    return () => {
      document.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [key]);

  return { active, ratio };
}

export interface RailStep {
  id: string;
  label: string;
}

/**
 * Momento de firma del portal: la columna se queda fija mientras bajas y el
 * punto activo viaja por el carril, con la barra llenándose detrás.
 *
 * El envoltorio de rejilla y el elemento pegajoso están separados a propósito:
 * un elemento de rejilla se estira a la altura de su fila, así que ponerle
 * `sticky` a él mismo no hace nada —se queda arriba, que era justo el fallo—.
 * El que se pega tiene que ser un hijo dentro de esa celda alta.
 */
export function StepRail({ steps }: { steps: RailStep[] }) {
  const { active, ratio } = useScrollSpy(steps.map((s) => s.id));
  const index = Math.max(0, steps.findIndex((s) => s.id === active));
  const pct = Math.round(ratio * 100);

  return (
    <div className="hidden lg:block">
      <div className="sticky top-24">
        <div className="flex items-baseline justify-between">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-isel-ink/35">Tu ficha</p>
          <p className="tabular font-display text-[13px] font-bold text-isel-emerald2">{pct}%</p>
        </div>

        <ol className="relative mt-6 pl-6">
          <span aria-hidden className="absolute bottom-2 left-[5px] top-2 w-px bg-isel-line" />
          <span
            aria-hidden
            className="absolute left-[5px] top-2 w-px origin-top bg-isel-emerald transition-transform duration-[500ms] ease-crisp"
            style={{ height: "calc(100% - 1rem)", transform: `scaleY(${ratio})` }}
          />

          {steps.map((s, i) => {
            const done = i < index;
            const now = i === index;
            return (
              <li key={s.id} className="relative pb-7 last:pb-0">
                <span
                  aria-hidden
                  className={`absolute -left-6 top-[7px] flex h-[11px] w-[11px] items-center justify-center rounded-full border transition-[background-color,border-color,transform] duration-500 ease-back ${
                    now
                      ? "scale-[1.35] border-isel-emerald bg-isel-emerald"
                      : done
                        ? "border-isel-emerald bg-isel-emerald"
                        : "border-isel-line bg-white"
                  }`}
                />
                {/* Halo del punto activo: late muy despacio, solo uno en pantalla. */}
                {now && (
                  <span
                    aria-hidden
                    className="absolute -left-[27px] top-[4px] h-[17px] w-[17px] animate-breathe rounded-full bg-isel-emerald/25"
                  />
                )}
                <a
                  href={`#${s.id}`}
                  className={`block text-[13.5px] font-semibold leading-snug transition-[color,transform] duration-300 ease-crisp hover:translate-x-0.5 ${
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
    </div>
  );
}

/** Riel en móvil: la misma información, en una tira que no ocupa columna. */
export function StepStrip({ steps }: { steps: RailStep[] }) {
  const { active, ratio } = useScrollSpy(steps.map((s) => s.id));
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
      <span aria-hidden className="mt-2.5 block h-px bg-isel-line">
        <span
          className="block h-full origin-left bg-isel-emerald transition-transform duration-500 ease-crisp"
          style={{ transform: `scaleX(${ratio})` }}
        />
      </span>
    </div>
  );
}
