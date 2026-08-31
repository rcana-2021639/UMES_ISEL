import { useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { RevealOnScroll, SplitHeading, SNAP } from "@/components/ui/RevealOnScroll";

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
 * Detrás, la palabra "OBJETIVOS" cruza la sección en sentido contrario al
 * scroll (scrub 1:1): sostiene el fondo sin competir con el texto.
 *
 * La sección va en arena cálida para cortar la banda oscura de Metodología —
 * el contraste de temperatura es parte del ritmo de la página.
 */
export function ObjectivesSection() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<number | null>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const watermarkX = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["12%", "-26%"]);

  return (
    <section id="objetivos" ref={ref} className="relative overflow-hidden bg-isel-arena px-6 py-24 lg:py-32">
      <motion.span
        aria-hidden
        style={{ x: watermarkX }}
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

        <div className="mt-16 border-t border-isel-navy/15 lg:mt-20">
          {OBJECTIVES.map((item, i) => {
            const on = hover === i;
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ duration: 0.8, delay: i * 0.07, ease: SNAP }}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                style={{ ["--accent" as string]: item.accent }}
                className="group relative block border-b border-isel-navy/15"
              >
                {/* Barrido de color a ancho completo. */}
                <span
                  aria-hidden
                  className="absolute inset-0 origin-left scale-x-0 transition-transform duration-700 ease-snap group-hover:scale-x-100"
                  style={{ backgroundColor: item.accent }}
                />

                <div className="relative grid grid-cols-1 items-start gap-5 px-1 py-9 transition-[padding] duration-500 ease-snap group-hover:px-6 md:grid-cols-[7rem_1fr_1.25fr] md:items-center md:gap-10 md:py-11">
                  <span
                    className={`font-display text-[3.2rem] font-bold leading-none tracking-ultratight transition-colors duration-500 ease-snap md:text-[4.2rem] ${
                      on ? "numeral-outline text-white" : "text-isel-navy/15"
                    }`}
                  >
                    0{i + 1}
                  </span>

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
                    className={`text-[15px] leading-relaxed transition-colors duration-500 ease-snap ${
                      on ? "text-white/85" : "text-isel-ink/60"
                    }`}
                  >
                    {item.text}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
