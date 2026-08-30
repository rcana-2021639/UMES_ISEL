import { useEffect, useRef, useState } from "react";
import {
  motion,
  useInView,
  useScroll,
  useTransform,
  useMotionValue,
  useReducedMotion,
  useSpring,
  type MotionValue,
  type Variants,
} from "framer-motion";
import type { CSSProperties, ReactNode } from "react";

/** Curvas propias — nunca `ease`/`ease-in-out` por defecto. */
export const SNAP = [0.16, 1, 0.3, 1] as const; // cola larga, para lo grande
export const ENTRY = [0.32, 0.72, 0, 1] as const; // decidida, para lo mediano
export const BACK = [0.34, 1.56, 0.64, 1] as const; // overshoot corto, para lo pequeño

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

/**
 * "¿Ya entró en pantalla?" — medición directa, sin IntersectionObserver ni
 * motor de animación de por medio.
 *
 * Se reserva para lo que TAPA contenido (el panel de dirección, las
 * cortinas). Si el revelado dependiera de la librería de animación o del
 * observador, cualquier tropiezo dejaría un bloque entero invisible de forma
 * permanente — que es exactamente lo que pasó con el panel de dirección. Aquí
 * solo hay `getBoundingClientRect` y un listener pasivo de scroll que se
 * desconecta en cuanto el bloque se muestra: no hay nada que pueda fallar sin
 * que falle el navegador entero.
 *
 * `amount` es la fracción del elemento que debe verse, con tope en un tercio
 * de la pantalla para que los bloques más altos que el viewport también
 * lleguen a cumplirlo.
 */
export function useReveal<T extends HTMLElement>(amount = 0.15) {
  const ref = useRef<T>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (shown) return;

    function check() {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const visible = Math.min(r.bottom, vh) - Math.max(r.top, 0);
      const needed = Math.min(r.height * amount, vh * 0.33);
      if (visible >= needed) setShown(true);
    }

    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, [amount, shown]);

  return { ref, shown };
}

interface MaskRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  /** Lado por el que se retira la cortina. */
  from?: "bottom" | "left" | "right";
  /** Clase de color de la cortina; debe igualar el fondo que la rodea. */
  curtain?: string;
  style?: CSSProperties;
}

/**
 * Revelado por cortina: una lámina del color del fondo cubre el bloque y se
 * retira al entrar en pantalla, como al destapar un impreso.
 *
 * La cortina se mueve con una transición CSS de `transform`, no con
 * `clip-path` ni con la librería de animación. Regla de la casa: lo que puede
 * dejar contenido invisible se resuelve con el navegador, que no falla; los
 * adornos que no tapan nada sí pueden ir por la librería.
 */
export function MaskReveal({
  children,
  className = "",
  delay = 0,
  from = "bottom",
  curtain = "bg-isel-paper",
  style,
}: MaskRevealProps) {
  const reduce = useReducedMotion();
  const { ref, shown } = useReveal<HTMLDivElement>(0.2);

  if (reduce) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }

  const vertical = from === "bottom";
  const origin = vertical ? "origin-top" : from === "left" ? "origin-right" : "origin-left";
  const closed = vertical ? "scale-y-100" : "scale-x-100";
  const open = vertical ? "scale-y-0" : "scale-x-0";

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`} style={style}>
      {children}
      <span
        aria-hidden
        style={{ transitionDelay: `${delay}s` }}
        className={`pointer-events-none absolute inset-0 z-20 transition-transform duration-[1050ms] ease-snap ${origin} ${curtain} ${
          shown ? open : closed
        }`}
      />
    </div>
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
      viewport={{ once: true, amount: 0.12 }}
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
  delay?: number;
  /** `true` anima al montar (hero); `false` espera a entrar en viewport. */
  immediate?: boolean;
  as?: "h1" | "h2" | "h3" | "p";
  /**
   * `words` sube cada palabra desde debajo de una máscara.
   * `chars` añade desenfoque→foco letra a letra: reservado para el titular
   * del hero, que es el único momento que debe sentirse cinematográfico.
   */
  mode?: "words" | "chars";
}

/**
 * Titular que se revela por partes con cascada irregular. Es el gesto
 * tipográfico de la página: el hero usa el modo `chars` (blur→foco) y las
 * secciones el modo `words`, de forma que el arranque siempre pesa más que
 * lo que viene después.
 */
export function SplitHeading({
  text,
  className = "",
  delay = 0,
  immediate = false,
  as: Tag = "h2",
  mode = "words",
}: SplitHeadingProps) {
  const reduce = useReducedMotion();
  if (reduce) return <Tag className={className}>{text}</Tag>;

  const trigger = immediate
    ? ({ animate: "show" } as const)
    : ({ whileInView: "show", viewport: { once: true, amount: 0.35 } } as const);

  if (mode === "chars") {
    const words = text.split(" ");
    let i = 0;
    return (
      <Tag className={className}>
        <motion.span
          initial="hidden"
          {...trigger}
          variants={{ hidden: {}, show: { transition: { delayChildren: delay, staggerChildren: 0.026 } } }}
          className="inline"
        >
          {words.map((w, wi) => (
            <span key={`${w}-${wi}`} className="inline-block whitespace-nowrap">
              {[...w].map((c) => (
                <motion.span
                  key={`${c}-${i++}`}
                  variants={{
                    hidden: { opacity: 0, y: "0.42em", filter: "blur(10px)" },
                    show: {
                      opacity: 1,
                      y: "0em",
                      filter: "blur(0px)",
                      transition: { duration: 0.95, ease: SNAP },
                    },
                  }}
                  className="inline-block"
                >
                  {c}
                </motion.span>
              ))}
              {wi < words.length - 1 && <span className="inline-block">&nbsp;</span>}
            </span>
          ))}
        </motion.span>
      </Tag>
    );
  }

  const words = text.split(" ");
  return (
    <Tag className={className}>
      <motion.span
        initial="hidden"
        {...trigger}
        variants={{ hidden: {}, show: { transition: { delayChildren: delay, staggerChildren: 0.055 } } }}
        className="inline"
      >
        {words.map((w, i) => (
          <span key={`${w}-${i}`} className="inline-block overflow-hidden align-bottom">
            <motion.span
              variants={{
                hidden: { y: "108%", opacity: 0 },
                show: { y: "0%", opacity: 1, transition: { duration: 0.85, ease: SNAP } },
              }}
              className="inline-block"
            >
              {w}
              {i < words.length - 1 ? " " : ""}
            </motion.span>
          </span>
        ))}
      </motion.span>
    </Tag>
  );
}

/**
 * Parallax por posición del puntero, normalizado a [-0.5, 0.5] sobre el
 * elemento. Solo se activa con ratón fino: en táctil devuelve valores
 * quietos en lugar de forzar un efecto que ahí no existe.
 */
export function usePointerParallax(strength = 14): {
  x: MotionValue<number>;
  y: MotionValue<number>;
  onMouseMove: (e: React.MouseEvent<HTMLElement>) => void;
  onMouseLeave: () => void;
  active: boolean;
} {
  const reduce = useReducedMotion();
  const [fine, setFine] = useState(false);
  useEffect(() => {
    setFine(window.matchMedia("(pointer: fine)").matches);
  }, []);

  const raw = { stiffness: 140, damping: 22, mass: 0.6 };
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, raw);
  const y = useSpring(my, raw);
  const active = fine && !reduce;

  function onMouseMove(e: React.MouseEvent<HTMLElement>) {
    if (!active) return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set(((e.clientX - r.left) / r.width - 0.5) * strength * 2);
    my.set(((e.clientY - r.top) / r.height - 0.5) * strength * 2);
  }
  function onMouseLeave() {
    mx.set(0);
    my.set(0);
  }

  return { x, y, onMouseMove, onMouseLeave, active };
}


interface ScrollHighlightTextProps {
  text: string;
  className?: string;
  /** Opacidad de partida de las palabras aún "no leídas". */
  dim?: number;
}

/** Una palabra del párrafo: se enciende cuando el scroll llega a su tramo. */
function HighlightWord({
  word,
  progress,
  start,
  end,
  dim,
}: {
  word: string;
  progress: MotionValue<number>;
  start: number;
  end: number;
  dim: number;
}) {
  const opacity = useTransform(progress, [start, end], [dim, 1]);
  return (
    <motion.span style={{ opacity }} className="mr-[0.26em] inline-block">
      {word}
    </motion.span>
  );
}

/**
 * Texto que se enciende al leerlo.
 *
 * El párrafo empieza atenuado y cada palabra sube a opacidad plena conforme el
 * bloque atraviesa la pantalla: el scroll marca el renglón, como un dedo
 * siguiendo la línea. Es lo que convierte un párrafo largo en algo que apetece
 * leer, y por eso se reserva a los textos que de verdad hay que leer
 * (metodología y la reseña de dirección), nunca a etiquetas sueltas.
 */
export function ScrollHighlightText({ text, className = "", dim = 0.22 }: ScrollHighlightTextProps) {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.55"] });
  const words = text.split(" ");

  if (reduce) return <p className={className}>{text}</p>;

  return (
    <p ref={ref} className={className}>
      {words.map((w, i) => {
        const start = i / words.length;
        return (
          <HighlightWord
            key={`${w}-${i}`}
            word={w}
            progress={scrollYProgress}
            start={start}
            end={Math.min(start + 1.6 / words.length, 1)}
            dim={dim}
          />
        );
      })}
    </p>
  );
}

/**
 * Cascadas irregulares. Un stagger constante suena a metrónomo; estos saltos
 * desiguales (y la pausa mayor antes de la última pieza) hacen que la entrada
 * parezca compuesta por alguien.
 */
export const IRREGULAR = [0, 0.09, 0.15, 0.26, 0.34, 0.48, 0.55, 0.63];

interface CountUpProps {
  /** Valor final. Si es null se muestra `text` tal cual (p. ej. "100%"). */
  to: number;
  suffix?: string;
  /** Rellena con ceros a la izquierda hasta esta longitud. */
  pad?: number;
  duration?: number;
  className?: string;
}

/**
 * Cifra que cuenta hasta su valor cuando entra en pantalla. Se usa solo en
 * los datos del hero: son números concretos del programa (6 maestrías, 6
 * trimestres, 15 días), así que contar los hace legibles como dato, no como
 * adorno.
 */
export function CountUp({ to, suffix = "", pad = 0, duration = 1.4, className = "" }: CountUpProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const [n, setN] = useState(reduce ? to : 0);

  useEffect(() => {
    if (!inView || reduce) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / (duration * 1000), 1);
      // easeOutExpo: rápido al inicio y frenado largo, igual que el resto.
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setN(Math.round(eased * to));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration, reduce]);

  return (
    <span ref={ref} className={className}>
      {String(n).padStart(pad, "0")}
      {suffix}
    </span>
  );
}
