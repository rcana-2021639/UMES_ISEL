import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { CSSProperties, ReactNode } from "react";

/** Curva propia de entrada — nunca `ease`/`ease-in-out` por defecto. */
export const SNAP = [0.16, 1, 0.3, 1] as const;

interface RevealOnScrollProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  scale?: boolean;
  style?: CSSProperties;
}

/**
 * Entrada al hacer scroll: sube + aparece, una sola vez por elemento.
 * Con `prefers-reduced-motion` no hay desplazamiento — el contenido
 * simplemente está ahí, sin quedar invisible ni a medio camino.
 */
export function RevealOnScroll({ children, className, delay = 0, y = 28, scale = false, style }: RevealOnScrollProps) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={className}
      style={style}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y, scale: scale ? 0.97 : 1 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: reduce ? 0.3 : 0.7, delay: reduce ? 0 : delay, ease: SNAP }}
    >
      {children}
    </motion.div>
  );
}

interface StaggerGroupProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
  style?: CSSProperties;
}

/** Contenedor con cascada; los hijos se enganchan con `variants={staggerItem}`. */
export function StaggerGroup({ children, className, staggerDelay = 0.09, style }: StaggerGroupProps) {
  return (
    <motion.div
      className={className}
      style={style}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
      transition={{ staggerChildren: staggerDelay }}
    >
      {children}
    </motion.div>
  );
}

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 0.72, ease: SNAP } },
};

interface SplitHeadingProps {
  text: string;
  className?: string;
  /** Retraso base antes de la primera palabra. */
  delay?: number;
  /** `true` anima al montar (hero); `false` espera a entrar en viewport. */
  immediate?: boolean;
  as?: "h1" | "h2" | "h3" | "p";
}

/**
 * Titular que se revela palabra por palabra desde debajo de una máscara,
 * con cascada irregular (las palabras largas tardan un poco más). Es el
 * gesto tipográfico de la página: nada más usa este efecto, para que el
 * hero y los arranques de sección sean el momento que se recuerda.
 */
export function SplitHeading({
  text,
  className = "",
  delay = 0,
  immediate = false,
  as: Tag = "h2",
}: SplitHeadingProps) {
  const reduce = useReducedMotion();
  const words = text.split(" ");

  if (reduce) return <Tag className={className}>{text}</Tag>;

  const container: Variants = {
    hidden: {},
    show: { transition: { delayChildren: delay, staggerChildren: 0.055 } },
  };
  const word: Variants = {
    hidden: { y: "108%", opacity: 0 },
    show: { y: "0%", opacity: 1, transition: { duration: 0.85, ease: SNAP } },
  };

  return (
    <Tag className={className}>
      <motion.span
        variants={container}
        initial="hidden"
        {...(immediate ? { animate: "show" } : { whileInView: "show", viewport: { once: true, amount: 0.4 } })}
        className="inline"
      >
        {words.map((w, i) => (
          <span key={`${w}-${i}`} className="inline-block overflow-hidden align-bottom">
            <motion.span variants={word} className="inline-block">
              {w}
              {i < words.length - 1 ? "\u00A0" : ""}
            </motion.span>
          </span>
        ))}
      </motion.span>
    </Tag>
  );
}
