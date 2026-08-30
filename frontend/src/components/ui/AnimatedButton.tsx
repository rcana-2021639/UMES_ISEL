import { useRef, type ReactNode } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { Link } from "react-router-dom";

type Variant = "primary" | "secondary" | "ghost" | "accent" | "disabled";

interface AnimatedButtonProps {
  children: ReactNode;
  href?: string;
  to?: string; // ruta interna de react-router
  variant?: Variant;
  icon?: ReactNode;
  className?: string;
  external?: boolean;
  disabledHint?: string;
  /** Imán del cursor. Se apaga solo en táctil y con reduced-motion. */
  magnetic?: boolean;
}

const base =
  "group/btn relative inline-flex select-none items-center justify-center gap-2 overflow-hidden rounded-full px-7 py-3.5 text-[13px] font-bold uppercase tracking-[0.1em] transition-colors duration-500 ease-snap";

const styles: Record<Variant, string> = {
  primary: "bg-isel-navy text-white",
  secondary: "border border-isel-navy/25 text-isel-navy hover:border-isel-navy/50",
  ghost: "border border-white/30 text-white hover:border-white/70",
  accent: "bg-[var(--accent)] text-white",
  disabled: "cursor-not-allowed border border-dashed border-isel-ink/20 text-isel-ink/35",
};

/** Relleno que sube desde abajo al hacer hover — en vez del cambio de color plano. */
const sweep: Record<Variant, string> = {
  primary: "bg-isel-gold",
  secondary: "bg-isel-navy",
  ghost: "bg-white",
  accent: "bg-isel-navy",
  disabled: "",
};

const sweepText: Record<Variant, string> = {
  primary: "group-hover/btn:text-isel-navy",
  secondary: "group-hover/btn:text-white",
  ghost: "group-hover/btn:text-isel-navy",
  accent: "group-hover/btn:text-white",
  disabled: "",
};

/**
 * Botón con tres gestos propios: el relleno que barre de abajo hacia arriba,
 * la etiqueta cinética (el texto sube y su copia entra por debajo) y un imán
 * suave que acerca el botón al cursor. Sin degradados, y nada funcional
 * depende del hover.
 */
export function AnimatedButton({
  children,
  href,
  to,
  variant = "primary",
  icon,
  className = "",
  external = true,
  disabledHint,
  magnetic = true,
}: AnimatedButtonProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, { stiffness: 260, damping: 18, mass: 0.35 });
  const y = useSpring(my, { stiffness: 260, damping: 18, mass: 0.35 });

  const pull = magnetic && !reduce && typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches;

  function onMove(e: React.MouseEvent) {
    if (!pull || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    mx.set((e.clientX - (r.left + r.width / 2)) * 0.3);
    my.set((e.clientY - (r.top + r.height / 2)) * 0.3);
  }
  function onLeave() {
    mx.set(0);
    my.set(0);
  }

  // La etiqueta cinética necesita el texto duplicado: solo aplica a strings.
  const label =
    typeof children === "string" && !reduce ? (
      <span className="kinetic">
        <span>{children}</span>
        <span aria-hidden>{children}</span>
      </span>
    ) : (
      children
    );

  if (variant === "disabled") {
    return (
      <span className={`${base} ${styles.disabled} ${className}`} title={disabledHint ?? "Próximamente"}>
        <span className="relative z-10 inline-flex items-center gap-2">
          {icon}
          {children}
        </span>
      </span>
    );
  }

  const inner = (
    <>
      <span
        aria-hidden
        className={`absolute inset-0 origin-bottom scale-y-0 transition-transform duration-500 ease-snap group-hover/btn:scale-y-100 ${sweep[variant]}`}
      />
      <span
        className={`relative z-10 inline-flex items-center gap-2 transition-colors duration-500 ease-snap ${sweepText[variant]}`}
      >
        {icon}
        {label}
      </span>
    </>
  );

  const wrapper = (child: ReactNode) => (
    <motion.span
      ref={ref}
      style={pull ? { x, y } : undefined}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      whileTap={{ scale: 0.97 }}
      className="inline-block"
    >
      {child}
    </motion.span>
  );

  if (to) {
    return wrapper(
      <Link to={to} className={`${base} ${styles[variant]} ${className}`}>
        {inner}
      </Link>,
    );
  }

  return wrapper(
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className={`${base} ${styles[variant]} ${className}`}
    >
      {inner}
    </a>,
  );
}
