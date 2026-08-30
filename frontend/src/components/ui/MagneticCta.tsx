import { useRef, type ReactNode } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { Link } from "react-router-dom";

type Tone = "light" | "outline" | "soft" | "dark" | "accent";

interface MagneticCtaProps {
  children: string;
  href?: string;
  to?: string;
  tone?: Tone;
  /** Glifo del disco; por defecto una flecha. */
  glyph?: ReactNode;
  className?: string;
  external?: boolean;
  /** Dirección del gesto del glifo al pasar el cursor. */
  arrow?: "right" | "down";
  /** Ocupa todo el ancho disponible, con el disco alineado a la derecha. */
  full?: boolean;
}

const shell: Record<Tone, string> = {
  light: "bg-white text-isel-deep",
  outline: "border border-white/25 text-white hover:border-white/50",
  soft: "border border-isel-line bg-white text-isel-navy hover:border-isel-navy/40",
  dark: "bg-isel-navy text-white",
  accent: "bg-[var(--accent)] text-white",
};

/** Color del disco en reposo — es también el que inunda el botón al enfocarlo. */
const disc: Record<Tone, string> = {
  light: "bg-isel-deep text-white",
  outline: "bg-white text-isel-deep",
  soft: "bg-isel-navy text-white",
  dark: "bg-isel-gold text-isel-deep",
  accent: "bg-white text-[var(--accent)]",
};

/** Color al que vira la etiqueta cuando el relleno ya cubrió el botón. */
const flipped: Record<Tone, string> = {
  light: "group-hover/cta:text-white",
  outline: "group-hover/cta:text-isel-deep",
  soft: "group-hover/cta:text-white",
  dark: "group-hover/cta:text-isel-deep",
  accent: "group-hover/cta:text-[var(--accent)]",
};

/**
 * CTA principal.
 *
 * En vez del clásico relleno que sube en bloque, el color nace del disco de la
 * derecha y se expande en círculo hasta inundar la cápsula (700ms): el botón
 * se rellena desde donde está la flecha, que es justo donde va el clic. La
 * etiqueta cambia de color a mitad de camino, el disco invierte su contraste y
 * la flecha da un paso en la dirección a la que lleva.
 *
 * Encima, imán de cursor: la cápsula se acerca al puntero y el disco se
 * adelanta un poco más que la etiqueta, así el gesto tiene profundidad. Nada
 * de esto es necesario para usarlo — sin ratón el botón es una cápsula normal
 * con foco visible.
 */
export function MagneticCta({
  children,
  href,
  to,
  tone = "light",
  glyph,
  className = "",
  external = true,
  arrow = "right",
  full = false,
}: MagneticCtaProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, { stiffness: 220, damping: 17, mass: 0.4 });
  const y = useSpring(my, { stiffness: 220, damping: 17, mass: 0.4 });
  // El disco viaja un 60% más que la cápsula: parallax interno del botón.
  const discX = useTransform(x, (v) => v * 0.6);
  const discY = useTransform(y, (v) => v * 0.6);

  const pull = !reduce && typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches;

  function onMove(e: React.MouseEvent) {
    if (!pull || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    mx.set((e.clientX - (r.left + r.width / 2)) * 0.26);
    my.set((e.clientY - (r.top + r.height / 2)) * 0.4);
  }
  function onLeave() {
    mx.set(0);
    my.set(0);
  }

  const body = (
    <>
      {/* Relleno radial: círculo anclado al disco que crece hasta cubrir todo. */}
      <span
        aria-hidden
        className={`pointer-events-none absolute right-[1.35rem] top-1/2 h-12 w-12 -translate-y-1/2 scale-0 rounded-full transition-transform duration-700 ease-snap group-hover/cta:scale-[9] ${
          disc[tone].split(" ")[0]
        }`}
      />

      <span
        className={`kinetic relative z-10 text-[13px] font-bold uppercase tracking-[0.1em] transition-colors duration-500 ease-snap ${flipped[tone]}`}
      >
        <span>{children}</span>
        <span aria-hidden>{children}</span>
      </span>

      <motion.span
        style={pull ? { x: discX, y: discY } : undefined}
        className={`relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[15px] transition-colors duration-500 ease-snap ${disc[tone]} group-hover/cta:bg-transparent`}
      >
        <span
          className={`inline-block transition-transform duration-500 ease-snap ${
            arrow === "down" ? "group-hover/cta:translate-y-1" : "group-hover/cta:translate-x-1"
          }`}
        >
          {glyph ?? (arrow === "down" ? "↓" : "→")}
        </span>
      </motion.span>
    </>
  );

  const classes = `group/cta group/btn relative flex items-center gap-5 overflow-hidden rounded-full py-2 pl-7 pr-2 ${
    full ? "w-full justify-between" : "inline-flex"
  } ${shell[tone]} ${className}`;

  return (
    <motion.span
      ref={ref}
      style={pull ? { x, y } : undefined}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      whileTap={{ scale: 0.97 }}
      className={full ? "block w-full" : "inline-block"}
    >
      {to ? (
        <Link to={to} className={classes}>
          {body}
        </Link>
      ) : (
        <a
          href={href}
          target={external ? "_blank" : undefined}
          rel={external ? "noopener noreferrer" : undefined}
          className={classes}
        >
          {body}
        </a>
      )}
    </motion.span>
  );
}
