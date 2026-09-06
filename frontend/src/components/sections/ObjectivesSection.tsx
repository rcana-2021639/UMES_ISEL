import { useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import {
  RevealOnScroll,
  SplitHeading,
  useScrubProgress,
  SNAP,
} from "@/components/ui/RevealOnScroll";

const OBJECTIVES = [
  {
    title: "Fortalecer y expandir",
    clave: "Oferta educativa virtual",
    accent: "#12855C",
    text: "Fortalecer y expandir la oferta educativa virtual del Instituto Salesiano de Educación en Línea (ISEL), garantizando la calidad, accesibilidad e innovación andragógica en los programas de estudios.",
  },
  {
    title: "Implementar nuevas tecnologías",
    clave: "Metodologías andragógicas",
    accent: "#3F51B5",
    text: "Implementar nuevas tecnologías y metodologías andragógicas para la creación y actualización de programas de estudio en línea, asegurando su pertinencia y calidad académica.",
  },
  {
    title: "Diseñar e implementar",
    clave: "Programas pertinentes",
    accent: "#B8791F",
    text: "Diseñar e implementar programas de estudios innovadores y pertinentes que respondan a las demandas del mercado laboral y las necesidades de la sociedad.",
  },
  {
    title: "Capacitar a docentes y administradores",
    clave: "Formación continua",
    accent: "#6A4BA6",
    text: "Ofrecer programas de capacitación continua para docentes y administradores en el uso de herramientas digitales, técnicas de enseñanza en línea y gestión de plataformas educativas.",
  },
];

/**
 * Objetivos — índice editorial, no cuatro cajas iguales.
 *
 * Cada objetivo es una franja a ancho completo que se invierte al enfocarla:
 * el color propio del objetivo barre la fila de izquierda a derecha en 700ms y
 * el texto pasa a blanco, con el numeral quedando en contorno. Se lee como un
 * índice impreso que se marca con rotulador, no como una cuadrícula de tarjetas.
 *
 * La sección va en arena cálida para cortar la banda oscura de Metodología —
 * el contraste de temperatura es parte del ritmo de la página.
 *
 * ── Lo que se añadió ────────────────────────────────────────────────────────
 * El barrido de color al pasar el cursor NO se ha tocado: es el gesto de la
 * sección y funciona. Lo que faltaba era que la sección dijera algo mientras
 * se la recorre sin cursor —en un teléfono, o simplemente bajando— porque el
 * barrido solo existe si hay ratón. Se le han sumado cuatro capas atadas al
 * scroll, todas reversibles, ninguna compitiendo con el barrido:
 *
 *  1. La marca de agua del fondo ya no es una sola: son dos, cruzando a
 *     velocidades y en sentidos distintos. Dos planos a distinta velocidad es
 *     lo que produce profundidad; uno solo es un adorno que se desliza.
 *  2. El numeral de cada franja flota a contramano de su propia fila mientras
 *     esta cruza la pantalla. Las cifras se descolocan y se recolocan solas:
 *     es lo que hace que el índice se vea vivo al bajar Y al subir.
 *  3. El filete inferior de cada franja se TRAZA de izquierda a derecha con el
 *     scroll, en vez de estar dibujado desde el principio. El índice se
 *     escribe a medida que se llega a él.
 *  4. Un raíl vertical a la izquierda se llena conforme se avanza por los
 *     cuatro objetivos: la sección se llama «hacia dónde vamos» y ahora se ve
 *     cuánto se lleva recorrido.
 */
export function ObjectivesSection() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<number | null>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });

  /* Dos planos de marca de agua a velocidades opuestas. El de delante corre
     más y en sentido contrario al scroll; el de detrás apenas se mueve. */
  const marcaFrente = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["12%", "-26%"]);
  const marcaFondo = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["-14%", "6%"]);

  /* Raíl de avance por la lista. Se mide contra el recorrido de la sección, de
     forma que llega al tope justo cuando el último objetivo termina de leerse. */
  const railRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: railRaw } = useScroll({
    target: railRef,
    offset: ["start 0.8", "end 0.6"],
  });

  return (
    <section id="objetivos" ref={ref} className="relative overflow-hidden bg-isel-arena px-6 py-24 lg:py-32">
      <motion.span
        aria-hidden
        style={{ x: marcaFondo }}
        className="pointer-events-none absolute left-0 top-[38%] -translate-y-1/2 select-none whitespace-nowrap font-display text-[30vw] font-bold leading-none tracking-ultratight text-isel-navy/[0.028]"
      >
        ISEL ISEL
      </motion.span>
      <motion.span
        aria-hidden
        style={{ x: marcaFrente }}
        className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 select-none whitespace-nowrap font-display text-[26vw] font-bold leading-none tracking-ultratight text-isel-navy/[0.045]"
      >
        OBJETIVOS OBJETIVOS
      </motion.span>

      <div className="relative mx-auto max-w-7xl">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <RevealOnScroll y={12}>
              <span className="eyebrow text-isel-gold2">Hacia dónde vamos</span>
            </RevealOnScroll>
            <SplitHeading
              text="Cuatro compromisos que ordenan el trabajo del Instituto"
              className="mt-6 text-balance font-display text-[clamp(2.1rem,5vw,3.8rem)] font-semibold leading-[1] tracking-ultratight text-isel-navy"
            />
          </div>
          <RevealOnScroll delay={0.16} className="shrink-0">
            <p className="max-w-xs text-[13px] leading-relaxed text-isel-ink/55">
              Calidad, accesibilidad e innovación andragógica: los tres criterios con los que el ISEL mide cada
              programa que abre.
            </p>
          </RevealOnScroll>
        </div>

        {/* El raíl vive fuera de la lista para poder medirla entera. */}
        <div ref={railRef} className="relative mt-16 lg:mt-20">
          <span
            aria-hidden
            className="absolute -left-4 top-0 hidden h-full w-px bg-isel-navy/10 lg:block"
          >
            <motion.span
              style={{ scaleY: reduce ? 1 : railRaw, originY: 0 }}
              className="absolute inset-0 block bg-isel-navy/45"
            />
          </span>

          <div className="border-t border-isel-navy/15">
            {OBJECTIVES.map((item, i) => (
              <Objective
                key={item.title}
                item={item}
                index={i}
                on={hover === i}
                onEnter={() => setHover(i)}
                onLeave={() => setHover(null)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

interface ObjectiveProps {
  item: (typeof OBJECTIVES)[number];
  index: number;
  on: boolean;
  onEnter: () => void;
  onLeave: () => void;
}

/**
 * Una franja del índice.
 *
 * Va en componente propio porque cada una necesita medir SU recorrido por la
 * pantalla: el flotar del numeral y el trazado del filete se calculan contra
 * esta fila, no contra la página entera.
 */
function Objective({ item, index, on, onEnter, onLeave }: ObjectiveProps) {
  const reduce = useReducedMotion();
  const { ref, progress } = useScrubProgress<HTMLDivElement>();

  // El numeral flota a contramano de su fila: se descoloca y se recoloca solo.
  const numeralY = useTransform(progress, [0, 1], [18, -18]);
  // El filete inferior se traza mientras la fila cruza la mitad de la pantalla.
  const fileteX = useTransform(progress, [0.15, 0.55], [0, 1]);

  return (
    <div ref={ref}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.35 }}
        transition={{ duration: 0.8, delay: index * 0.07, ease: SNAP }}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        style={{ ["--accent" as string]: item.accent }}
        className="group relative block"
      >
        {/* Barrido de color a ancho completo — el gesto de la sección, intacto. */}
        <span
          aria-hidden
          className="absolute inset-0 origin-left scale-x-0 transition-transform duration-700 ease-snap group-hover:scale-x-100"
          style={{ backgroundColor: item.accent }}
        />

        <div className="relative grid grid-cols-1 items-start gap-5 px-1 py-9 transition-[padding] duration-500 ease-snap group-hover:px-6 md:grid-cols-[7rem_1fr_1.25fr] md:items-center md:gap-10 md:py-11">
          <motion.span
            style={reduce ? undefined : { y: numeralY }}
            className={`font-display text-[3.2rem] font-bold leading-none tracking-ultratight transition-colors duration-500 ease-snap md:text-[4.2rem] ${
              on ? "numeral-outline text-white" : "text-isel-navy/15"
            }`}
          >
            0{index + 1}
          </motion.span>

          <div>
            <p
              className={`text-[10px] font-bold uppercase tracking-[0.18em] transition-colors duration-500 ease-snap ${
                on ? "text-white/70" : "text-[var(--accent)]"
              }`}
            >
              {item.clave}
            </p>
            <h3
              className={`mt-2 font-display text-[1.6rem] font-semibold leading-[1.08] tracking-tightest transition-colors duration-500 ease-snap sm:text-[2rem] ${
                on ? "text-white" : "text-isel-navy"
              }`}
            >
              {item.title}
            </h3>
          </div>

          <p
            className={`prose-justify text-[15px] leading-relaxed transition-colors duration-500 ease-snap ${
              on ? "text-white/85" : "text-isel-ink/60"
            }`}
          >
            {item.text}
          </p>
        </div>

        {/* El filete que cierra la franja se traza con el scroll en vez de
            estar ya dibujado: el índice se escribe a medida que se llega. */}
        <motion.span
          aria-hidden
          style={reduce ? undefined : { scaleX: fileteX }}
          className="absolute inset-x-0 bottom-0 block h-px origin-left bg-isel-navy/25"
        />
      </motion.div>
    </div>
  );
}
