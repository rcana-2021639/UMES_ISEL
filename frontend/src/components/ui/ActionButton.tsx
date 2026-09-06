import { useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import { Link } from "react-router-dom";

type Tone = "solid" | "accent" | "light" | "outlineDark" | "outlineLight" | "navSoft";
type Size = "nav" | "sm" | "md";

interface ActionButtonProps {
  children: ReactNode;
  href?: string;
  to?: string;
  tone?: Tone;
  size?: Size;
  className?: string;
  external?: boolean;
  full?: boolean;
  /** Dirección del glifo: hacia dónde lleva la acción. */
  arrow?: "right" | "down" | "upRight" | "none";
  /**
   * El botón se inclina hacia el cursor cuando este se acerca. Solo en las
   * acciones de mando (el CTA del navbar, los del hero); si lo llevaran todos
   * dejaría de significar nada.
   */
  magnetic?: boolean;
  onClick?: () => void;
}

/**
 * Botón único de todo el sitio.
 *
 * ── El gesto ────────────────────────────────────────────────────────────────
 * El relleno NACE DONDE ENTRÓ EL CURSOR. Al pasar el ratón se lee la posición
 * exacta del puntero sobre el botón y desde ese punto se expande un disco de
 * color que lo cubre entero; al salir, el disco se repliega hacia el punto por
 * donde el cursor se fue. Entrar por la izquierda y entrar por la derecha NO
 * producen la misma animación: el botón responde a *dónde* está el cursor, no
 * solo a *si* está.
 *
 * Es la diferencia entre un botón que reacciona y uno que se enciende. Y sale
 * barato: un solo `transform: scale()` sobre un disco, nada de animar
 * `background-size` ni `clip-path`, que obligan a repintar en cada fotograma.
 *
 * ── La forma ────────────────────────────────────────────────────────────────
 * Rectángulo de esquina corta, no píldora. En esta página las píldoras ya
 * significan otra cosa —etiquetas, campos, estados— y cuando TODO es una
 * píldora nada destaca. Separar las geometrías da una regla que se lee sin
 * explicación: lo redondo informa, lo rectangular actúa.
 *
 * Lo acompañan el relevo de la flecha (sale por un lado, entra otra idéntica
 * por el otro), un hundimiento real al pulsar y un aro de foco de teclado
 * propio, distinto del hover — piso de accesibilidad, no adorno.
 */

interface ToneSpec {
  /** Estado de reposo. */
  base: string;
  /** Color del disco que se expande desde el cursor. */
  fill: string;
  /** Color del texto una vez el disco cubre el botón. */
  hoverText: string;
  /** Aro de foco de teclado — nunca igual al hover. */
  ring: string;
}

const TONES: Record<Tone, ToneSpec> = {
  solid: {
    base: "bg-isel-navy text-white",
    fill: "bg-isel-gold",
    hoverText: "group-hover/ab:text-isel-deep",
    ring: "focus-visible:ring-isel-gold",
  },
  accent: {
    base: "bg-[var(--accent)] text-white",
    fill: "bg-isel-deep",
    hoverText: "group-hover/ab:text-white",
    ring: "focus-visible:ring-[var(--accent)]",
  },
  light: {
    base: "bg-white text-isel-deep",
    fill: "bg-isel-gold",
    hoverText: "group-hover/ab:text-isel-deep",
    ring: "focus-visible:ring-isel-gold",
  },
  outlineDark: {
    base: "border border-white/25 text-white",
    fill: "bg-white",
    hoverText: "group-hover/ab:text-isel-deep",
    ring: "focus-visible:ring-white",
  },
  outlineLight: {
    base: "border border-isel-navy/25 text-isel-navy",
    fill: "bg-isel-navy",
    hoverText: "group-hover/ab:text-white",
    ring: "focus-visible:ring-isel-navy",
  },
  /* Accesos del navbar: un peldaño por debajo del CTA en la escalera de color
     —vidrio elevado en reposo— pero con el mismo cuerpo y el mismo gesto, para
     que los cuatro se lean como botones sin quitarle el mando a la inscripción. */
  navSoft: {
    base: "bg-white/[0.07] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)]",
    fill: "bg-white",
    hoverText: "group-hover/ab:text-isel-deep",
    ring: "focus-visible:ring-isel-gold",
  },
};

/* El tamaño trae consigo su tratamiento tipográfico: `nav` es el único que no
   va en versalita —cuatro accesos en MAYÚSCULAS con tracking no caben en la
   barra, y encima competirían con el titular por el mismo registro. */
const SIZING: Record<Size, string> = {
  nav: "gap-2 rounded-[0.6rem] px-4 py-2.5 text-[12.5px] font-semibold tracking-[-0.005em]",
  sm: "gap-2.5 rounded-lg px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.1em]",
  md: "gap-3.5 rounded-lg px-7 py-3.5 text-[13px] font-bold uppercase tracking-[0.1em]",
};

export function ActionButton({
  children,
  href,
  to,
  tone = "solid",
  size = "md",
  className = "",
  external = true,
  full = false,
  arrow = "right",
  magnetic = false,
  onClick,
}: ActionButtonProps) {
  const spec = TONES[tone];
  /** Origen del disco, en porcentaje del botón. Centro mientras nadie lo toca. */
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  /** Desplazamiento magnético, en píxeles. */
  const [pull, setPull] = useState({ x: 0, y: 0 });

  /**
   * Traduce la posición del puntero al origen del disco. En táctil este evento
   * no llega nunca, así que el disco sale del centro y el botón se comporta
   * exactamente igual — el efecto se degrada solo, sin ramas por dispositivo.
   */
  function readPointer(e: MouseEvent<HTMLElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    setOrigin({
      x: ((e.clientX - r.left) / r.width) * 100,
      y: ((e.clientY - r.top) / r.height) * 100,
    });
    if (magnetic) {
      setPull({
        x: (e.clientX - (r.left + r.width / 2)) * 0.16,
        y: (e.clientY - (r.top + r.height / 2)) * 0.24,
      });
    }
  }

  const glyph = arrow === "down" ? "↓" : arrow === "upRight" ? "↗" : "→";
  // El relevo viaja en el eje del glifo: horizontal para "ir a", vertical para "bajar".
  const out = arrow === "down" ? "group-hover/ab:translate-y-[150%]" : "group-hover/ab:translate-x-[150%]";
  const inFrom = arrow === "down" ? "-translate-y-[150%]" : "-translate-x-[150%]";
  const inTo = arrow === "down" ? "group-hover/ab:translate-y-0" : "group-hover/ab:translate-x-0";

  const classes = [
    "group/ab relative isolate inline-flex select-none items-center justify-center overflow-hidden whitespace-nowrap",
    // El botón solo cambia color y se transforma: nada que fuerce maquetación.
    "transition-[color,transform,box-shadow] duration-500 ease-entry",
    "active:scale-[0.97] active:duration-100",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
    SIZING[size],
    spec.base,
    spec.hoverText,
    spec.ring,
    full ? "w-full justify-between" : "",
    className,
  ].join(" ");

  const body = (
    <>
      {/* El disco. Ancho en porcentaje del propio botón y `aspect-square`: sea
          cual sea la proporción, siempre supera su diagonal, así que cubre
          entre por donde entre el cursor. */}
      <span
        aria-hidden
        style={{ left: `${origin.x}%`, top: `${origin.y}%` }}
        className={`pointer-events-none absolute -z-10 aspect-square w-[280%] -translate-x-1/2 -translate-y-1/2 scale-0 rounded-full transition-transform duration-[620ms] ease-snap group-hover/ab:scale-100 ${spec.fill}`}
      />
      <span className="relative">{children}</span>
      {arrow !== "none" && (
        <span aria-hidden className="relative block h-4 w-4 shrink-0 overflow-hidden">
          <span
            className={`absolute inset-0 flex items-center justify-center transition-transform duration-500 ease-snap ${out}`}
          >
            {glyph}
          </span>
          <span
            className={`absolute inset-0 flex items-center justify-center transition-transform duration-500 ease-snap ${inFrom} ${inTo}`}
          >
            {glyph}
          </span>
        </span>
      )}
    </>
  );

  const handlers = {
    onMouseEnter: readPointer,
    // Seguir el puntero solo cuando hay imán: si no, un `mousemove` por
    // fotograma re-renderizaría el botón sin que se note ninguna diferencia.
    onMouseMove: magnetic ? readPointer : undefined,
    onMouseLeave: (e: MouseEvent<HTMLElement>) => {
      // El disco se repliega hacia el punto por donde el cursor se fue.
      readPointer(e);
      setPull({ x: 0, y: 0 });
    },
  };

  const style = { transform: `translate3d(${pull.x}px, ${pull.y}px, 0)` };

  if (to) {
    return (
      <Link to={to} onClick={onClick} className={classes} style={style} {...handlers}>
        {body}
      </Link>
    );
  }

  return (
    <a
      href={href}
      onClick={onClick}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className={classes}
      style={style}
      {...handlers}
    >
      {body}
    </a>
  );
}
