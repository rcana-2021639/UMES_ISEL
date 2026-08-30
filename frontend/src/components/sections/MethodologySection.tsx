import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { RevealOnScroll, SplitHeading, SNAP } from "@/components/ui/RevealOnScroll";

const ITEMS = [
  {
    key: "sincronicas",
    title: "Sesiones sincrónicas",
    resumen: "Videoconferencias quincenales, grabadas.",
    image: "/images/methodology/sesiones-sincronicas.jpg",
    text: "Se llevarán a cabo a través de videoconferencias quincenales. Estas sesiones permitirán la interacción en tiempo real entre los docentes y los estudiantes, facilitando la explicación de contenidos, la discusión de temas y la resolución de dudas. Se grabarán para que puedan ser consultadas posteriormente por quienes no puedan asistir en vivo.",
  },
  {
    key: "asincronico",
    title: "Trabajo asincrónico",
    resumen: "Tareas, foros y proyectos, a tu ritmo.",
    image: "/images/methodology/trabajo-asincronico.jpg",
    text: "Las actividades asincrónicas incluirán tareas, lecturas, discusiones en foros y proyectos colaborativos. Los estudiantes tendrán acceso a los recursos de aprendizaje en cualquier momento, gestionando su tiempo de estudio según sus necesidades y disponibilidad.",
  },
  {
    key: "tutoria",
    title: "Tutoría",
    resumen: "Acompañamiento continuo y personalizado.",
    image: "/images/methodology/tutoria.jpg",
    text: "Cada curso incluye un componente de tutorización. Los tutores estarán disponibles para consultas a través de los correos institucionales y foros. Además, se organizan sesiones de tutoría en vivo mediante videoconferencias, con apoyo continuo y personalizado.",
  },
];

/**
 * Metodología en formato scrollytelling: la columna izquierda queda fija y va
 * cambiando (número, título y resumen) mientras la derecha desfila los tres
 * componentes. El scroll no solo mueve la página, va contando cómo se estudia.
 *
 * En móvil el pin se desactiva solo —la columna deja de ser sticky— y los tres
 * bloques se leen en orden, sin depender del efecto.
 */
export function MethodologySection() {
  const [active, setActive] = useState(0);

  return (
    <section id="metodologia" className="grain relative bg-isel-navy px-6 py-24 lg:py-32">
      {/* El recorte vive aquí dentro y no en la sección: un overflow-hidden en el
          ancestro anularía el position:sticky de la columna izquierda. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="grid-lines absolute inset-0 opacity-50" />
        <div className="absolute -right-40 top-1/4 h-[38rem] w-[38rem] animate-drift2 rounded-full bg-isel-emerald/20 blur-[130px]" />
      </div>

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <div className="lg:sticky lg:top-32 lg:h-fit lg:self-start">
          <RevealOnScroll y={12}>
            <span className="eyebrow text-isel-gold">Cómo se estudia</span>
          </RevealOnScroll>

          <SplitHeading
            text="Metodología"
            className="mt-5 font-display text-[clamp(2.2rem,5vw,3.6rem)] font-semibold leading-[1.02] text-white"
          />

          <RevealOnScroll delay={0.12}>
            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-white/60">
              Los programas se imparten completamente en modalidad virtual, combinando sesiones sincrónicas y
              actividades asincrónicas para asegurar una formación flexible.
            </p>
          </RevealOnScroll>

          {/* Indicador del paso en curso — se mantiene visible mientras se lee la columna derecha. */}
          <div className="mt-12 hidden lg:block">
            <div className="flex items-start gap-6">
              <span className="font-display text-[5rem] font-semibold leading-none text-white/15">
                0{active + 1}
              </span>
              <div className="pt-3">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={ITEMS[active].key}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.45, ease: SNAP }}
                  >
                    <p className="font-display text-xl font-semibold text-white">{ITEMS[active].title}</p>
                    <p className="mt-1 text-sm text-white/50">{ITEMS[active].resumen}</p>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            <div className="mt-8 flex gap-2">
              {ITEMS.map((item, i) => (
                <span key={item.key} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/12">
                  <motion.span
                    animate={{ scaleX: i <= active ? 1 : 0 }}
                    transition={{ duration: 0.6, ease: SNAP }}
                    className="block h-full origin-left bg-isel-gold"
                  />
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-8 lg:gap-16">
          {ITEMS.map((item, i) => (
            <div key={item.key} className="relative">
              {/* Sentinela: cruza el centro de la pantalla y marca el paso activo
                  en la columna fija. Va aparte de la animación de entrada para
                  que cada una use su propio umbral. */}
              <motion.span
                aria-hidden
                className="pointer-events-none absolute left-0 top-0 block h-full w-px"
                onViewportEnter={() => setActive(i)}
                viewport={{ margin: "-50% 0px -50% 0px" }}
              />
              <motion.article
                initial={{ opacity: 0, y: 34 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.8, ease: SNAP }}
                className="group overflow-hidden rounded-[1.6rem] border border-white/10 bg-white/[0.035] transition-colors duration-500 ease-snap hover:border-isel-gold/40"
              >
                <div className="aspect-[16/9] w-full overflow-hidden">
                  <ImageSlot
                    src={item.image}
                    alt={item.title}
                    label={item.title}
                    tone="dark"
                    glyph={`0${i + 1}`}
                    className="transition-transform duration-[900ms] ease-snap group-hover:scale-[1.05]"
                  />
                </div>
                <div className="p-7 sm:p-9">
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-isel-gold lg:hidden">
                    0{i + 1}
                  </span>
                  <h3 className="mt-2 font-display text-2xl font-semibold text-white lg:mt-0">{item.title}</h3>
                  <p className="mt-4 text-[15px] leading-relaxed text-white/60">{item.text}</p>
                </div>
              </motion.article>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
