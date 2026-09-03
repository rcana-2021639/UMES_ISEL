import type { ReactNode } from "react";
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
  onClick?: () => void;
}

/**
 * Botón único de todo el sitio.
 *
 * El gesto es el relevo de la flecha: al pasar el cursor, la flecha sale por
 * la derecha y otra idéntica entra por la izquierda dentro de una ventana de
 * 1rem. Solo se mueven dos glifos pequeños, así que se dibuja nítido siempre
 * —a diferencia de los rellenos que escalan o recortan grandes superficies,
 * que en pantallas normales dejan bordes sucios y tirones.
 *
 * Lo acompañan un cambio de color con curva propia, un aro que se abre
 * alrededor (box-shadow, sin coste de layout) y una elevación de 2px. Cuatro
 * cosas baratas y coordinadas en lugar de una cara y frágil.
 */

const shell: Record<Tone, string> = {
  solid: "bg-isel-navy text-white hover:bg-isel-gold hover:text-isel-deep hover:shadow-[0_0_0_5px_rgba(232,179,61,0.22)]",
  accent:
    "bg-[var(--accent)] text-white hover:bg-isel-navy hover:shadow-[0_0_0_5px_var(--accent-soft)]",
  light:
    "bg-white text-isel-deep hover:bg-isel-gold hover:shadow-[0_0_0_5px_rgba(232,179,61,0.25)]",
  outlineDark:
    "border border-white/25 text-white hover:border-transparent hover:bg-white hover:text-isel-deep hover:shadow-[0_0_0_5px_rgba(255,255,255,0.14)]",
  outlineLight:
    "border border-isel-navy/20 text-isel-navy hover:border-transparent hover:bg-isel-navy hover:text-white hover:shadow-[0_0_0_5px_rgba(20,73,60,0.14)]",
  /* Accesos rápidos del navbar. Mismo cuerpo que el botón principal —píldora
     llena, relevo de flecha, aro al pasar— pero un peldaño por debajo en la
     escalera de color: verde elevado en reposo, blanco al enfocarlo. Así los
     cuatro se leen como botones (era el problema: tres eran texto suelto) sin
     que la inscripción pierda el mando. */
  navSoft:
    "bg-isel-navy2 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)] hover:bg-white hover:text-isel-deep hover:shadow-[0_0_0_5px_rgba(255,255,255,0.13)]",
};

/* El tamaño trae consigo su tratamiento tipográfico: `nav` es el único que no
   va en versalita —cuatro accesos en MAYÚSCULAS con tracking no caben en la
   barra, y encima competirían con el titular por el mismo registro. */
const sizing: Record<Size, string> = {
  nav: "gap-2 px-4 py-2.5 text-[12.5px] font-semibold tracking-[-0.005em]",
  sm: "gap-2.5 px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.1em]",
  md: "gap-3.5 px-7 py-3.5 text-[13px] font-bold uppercase tracking-[0.1em]",
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
  onClick,
}: ActionButtonProps) {
  const glyph = arrow === "down" ? "↓" : arrow === "upRight" ? "↗" : "→";
  // El relevo viaja en el eje del glifo: horizontal para "ir a", vertical para "bajar".
  const out = arrow === "down" ? "group-hover/ab:translate-y-[150%]" : "group-hover/ab:translate-x-[150%]";
  const inFrom = arrow === "down" ? "-translate-y-[150%]" : "-translate-x-[150%]";
  const inTo = arrow === "down" ? "group-hover/ab:translate-y-0" : "group-hover/ab:translate-x-0";

  const classes = [
    "group/ab relative inline-flex select-none items-center justify-center whitespace-nowrap rounded-full",
    "transition-[background-color,color,border-color,box-shadow,transform] duration-500 ease-entry",
    "hover:-translate-y-0.5 active:translate-y-0",
    sizing[size],
    shell[tone],
    full ? "w-full justify-between" : "",
    className,
  ].join(" ");

  const body = (
    <>
      <span>{children}</span>
      {arrow !== "none" && (
        <span aria-hidden className="relative block h-4 w-4 shrink-0 overflow-hidden">
          <span className={`absolute inset-0 flex items-center justify-center transition-transform duration-500 ease-snap ${out}`}>
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

  if (to) {
    return (
      <Link to={to} onClick={onClick} className={classes}>
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
    >
      {body}
    </a>
  );
}
