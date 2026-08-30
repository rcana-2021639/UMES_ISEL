import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { RevealOnScroll, ScrollHighlightText, SplitHeading, SNAP } from "@/components/ui/RevealOnScroll";

const ITEMS = [
  {
    key: "sincronicas",
    title: "Sesiones sincrónicas",
    resumen: "Videoconferencias quincenales, grabadas.",
    dato: "Cada 15 días",
    accent: "#2FA98A",
    image: "/images/methodology/sesiones-sincronicas.jpg",
    text: "Se llevarán a cabo a través de videoconferencias quincenales. Estas sesiones permitirán la interacción en tiempo real entre los docentes y los estudiantes, facilitando la explicación de contenidos, la discusión de temas y la resolución de dudas. Se grabarán para que puedan ser consultadas posteriormente por quienes no puedan asistir en vivo.",
  },
  {
    key: "asincronico",
    title: "Trabajo asincrónico",
    resumen: "Tareas, foros y proyectos, a tu ritmo.",
    dato: "24/7",
    accent: "#E8B33D",
    image: "/images/methodology/trabajo-asincronico.jpg",
    text: "Las actividades asincrónicas incluirán tareas, lecturas, discusiones en foros y proyectos colaborativos. Los estudiantes tendrán acceso a los recursos de aprendizaje en cualquier momento, gestionando su tiempo de estudio según sus necesidades y disponibilidad.",
  },
  {
    key: "tutoria",
    title: "Tutoría",
    resumen: "Acompañamiento continuo y personalizado.",
    dato: "1 a 1",
    accent: "#8E7BD8",
    image: "/images/methodology/tutoria.jpg",
    text: "Cada curso incluye un componente de tutorización. Los tutores estarán disponibles para consultas a través de los correos institucionales y foros. Además, se organizan sesiones de tutoría en vivo mediante videoconferencias, con apoyo continuo y personalizado.",
  },
];

/**
 * Metodología — scrollytelling.
 *
 * La columna izquierda queda fija y va cambiando (numeral, título, resumen y
 * dato) mientras la derecha desfila los tres componentes: el scroll no solo
 * mueve la página, va contando cómo se estudia.
 *
 * Sobre eso, dos refuerzos que no existían: el bloque que se está leyendo se
 * ilumina y los otros dos bajan de intensidad, y el color ambiental de toda la
 * sección viaja del verde al ámbar y al violeta según el paso activo — el
 * fondo también avanza en la narración.
 *
 * En móvil el pin se desactiva solo y los tres bloques se leen en orden, sin
 * depender del efecto.
 */
export function MethodologySection() {
  const [active, setActive] = useState(0);
  const reduce = useReducedMotion();
  const current = ITEMS[active];

  return (
    <section
      id="metodologia"
      className="grain relative bg-isel-navy px-6 py-24 lg:py-32"
      style={{ ["--accent" as string]: current.accent }}
    >
      {/* El recorte vive aquí dentro y no en la sección: un overflow-hidden en
          el ancestro anularía el position:sticky de la columna izquierda. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="grid-lines absolute inset-0 opacity-50" />
        <motion.div
          animate={{ backgroundColor: current.accent }}
          transition={{ duration: 1.1, ease: SNAP }}
          className="absolute -right-40 top-1/4 h-[40rem] w-[40rem] animate-drift2 rounded-full opacity-[0.18] blur-[140px]"
        />
        <motion.div
          animate={{ backgroundColor: current.accent }}
          transition={{ duration: 1.4, ease: SNAP }}
          className="absolute -left-52 bottom-0 h-[30rem] w-[30rem] animate-drift rounded-full opacity-[0.10] blur-[130px]"
        />
      </div>

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-14 lg:grid-cols-[0.92fr_1.08fr] lg:gap-20">
        <div className="lg:sticky lg:top-32 lg:h-fit lg:self-start">
          <RevealOnScroll y={12}>
            <span className="eyebrow text-isel-gold">Cómo se estudia</span>
          </RevealOnScroll>

          <SplitHeading
            text="Metodología"
            className="mt-5 font-display text-[clamp(2.4rem,5.6vw,4.2rem)] font-semibold leading-[0.98] tracking-ultratight text-white"
          />

          <RevealOnScroll delay={0.12}>
            <p className="mt-7 max-w-md text-[15px] leading-relaxed text-white/55">
              Los programas se imparten completamente en modalidad virtual, combinando sesiones sincrónicas y
              actividades asincrónicas para asegurar una formación flexible.
            </p>
          </RevealOnScroll>

          {/* Indicador del paso en curso — visible mientras se lee la derecha. */}
          <div className="mt-14 hidden lg:block">
            <div className="flex items-start gap-7">
              <div className="relative h-[5.5rem] w-[6.5rem] shrink-0 overflow-hidden">
                <AnimatePresence mode="popLayout">
                  <motion.span
                    key={current.key}
                    initial={reduce ? { opacity: 0 } : { y: "70%", opacity: 0, filter: "blur(6px)" }}
                    animate={{ y: "0%", opacity: 1, filter: "blur(0px)" }}
                    exit={reduce ? { opacity: 0 } : { y: "-70%", opacity: 0, filter: "blur(6px)" }}
                    transition={{ duration: 0.6, ease: SNAP }}
                    className="absolute inset-0 font-display text-[5.5rem] font-bold leading-[0.85] tracking-ultratight text-[var(--accent)]"
                  >
                    0{active + 1}
                  </motion.span>
                </AnimatePresence>
              </div>

              <div className="min-h-[5.5rem] pt-2">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={current.key}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.45, ease: SNAP }}
                  >
                    <p className="font-display text-2xl font-semibold text-white">{current.title}</p>
                    <p className="mt-2 text-sm text-white/50">{current.resumen}</p>
                    <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--accent)]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                      {current.dato}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Raíl de progreso: tres tramos que se llenan conforme avanzas. */}
            <div className="mt-10 flex items-center gap-3">
              {ITEMS.map((item, i) => (
                <span key={item.key} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/12">
                  <motion.span
                    animate={{ scaleX: i <= active ? 1 : 0, backgroundColor: item.accent }}
                    transition={{ duration: 0.7, ease: SNAP }}
                    className="block h-full origin-left"
                  />
                </span>
              ))}
              <span className="ml-2 shrink-0 font-display text-xs font-bold tracking-[0.16em] text-white/40">
                0{active + 1}/0{ITEMS.length}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-8 lg:gap-20">
          {ITEMS.map((item, i) => {
            const isActive = active === i;
            return (
              <div key={item.key} className="relative" style={{ ["--accent" as string]: item.accent }}>
                {/* Sentinela: cruza el centro de la pantalla y marca el paso
                    activo. Va aparte de la animación de entrada para que cada
                    una use su propio umbral. */}
                <motion.span
                  aria-hidden
                  className="pointer-events-none absolute left-0 top-0 block h-full w-px"
                  onViewportEnter={() => setActive(i)}
                  viewport={{ margin: "-50% 0px -50% 0px" }}
                />

                {/* La atenuación va en un envoltorio propio: si la pusiera en
                    el mismo elemento que anima la entrada, framer y el estado
                    activo se pelearían por la misma propiedad `opacity`. */}
                <div
                  className="transition-opacity duration-700 ease-snap"
                  style={{ opacity: reduce || isActive ? 1 : 0.5 }}
                >
                <motion.article
                  initial={{ opacity: 0, y: 44, scale: 0.99 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{ duration: 1, ease: SNAP }}
                  className="group relative overflow-hidden rounded-[1.8rem] border bg-white/[0.035] transition-colors duration-700 ease-snap"
                  style={{ borderColor: isActive ? `${item.accent}66` : "rgba(255,255,255,0.1)" }}
                >
                  <div className="relative aspect-[16/9] w-full overflow-hidden">
                    <ImageSlot
                      src={item.image}
                      alt={item.title}
                      label={item.title}
                      tone="dark"
                      glyph={`0${i + 1}`}
                      className="transition-transform duration-[1100ms] ease-snap group-hover:scale-[1.06]"
                    />
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 transition-opacity duration-700"
                      style={{ backgroundColor: item.accent, opacity: isActive ? 0.06 : 0.2 }}
                    />
                    <span
                      className="absolute left-6 top-6 inline-flex h-11 w-11 items-center justify-center rounded-full font-display text-sm font-bold text-isel-deep"
                      style={{ backgroundColor: item.accent }}
                    >
                      0{i + 1}
                    </span>
                  </div>

                  <div className="p-7 sm:p-10">
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                      <h3 className="font-display text-[1.9rem] font-semibold tracking-ultratight text-white sm:text-[2.4rem]">
                        {item.title}
                      </h3>
                      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--accent)]">
                        {item.dato}
                      </span>
                    </div>

                    {/* Entradilla en serif: da un punto de entrada a la lectura
                        antes del párrafo largo. */}
                    <p className="mt-4 font-serif text-[1.35rem] italic leading-snug text-[var(--accent)] sm:text-[1.6rem]">
                      {item.resumen}
                    </p>

                    {/* El párrafo se enciende palabra a palabra con el scroll. */}
                    <ScrollHighlightText
                      text={item.text}
                      className="mt-6 max-w-[52ch] text-[16px] leading-[1.75] text-white sm:text-[17px]"
                      dim={0.26}
                    />
                  </div>
                </motion.article>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
