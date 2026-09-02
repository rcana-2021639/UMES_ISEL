import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { RevealOnScroll, ScrollHighlightText, SplitHeading, SNAP } from "@/components/ui/RevealOnScroll";

const ITEMS = [
  {
    key: "sincronicas",
    title: "Sesiones sincrónicas",
    resumen: "Videoconferencias quincenales, grabadas.",
    dato: "Cada 15 días",
    accent: "#2FA98A",
    text: "Se llevarán a cabo a través de videoconferencias quincenales. Estas sesiones permitirán la interacción en tiempo real entre los docentes y los estudiantes, facilitando la explicación de contenidos, la discusión de temas y la resolución de dudas. Se grabarán para que puedan ser consultadas posteriormente por quienes no puedan asistir en vivo.",
  },
  {
    key: "asincronico",
    title: "Trabajo asincrónico",
    resumen: "Tareas, foros y proyectos, a tu ritmo.",
    dato: "24/7",
    accent: "#E8B33D",
    text: "Las actividades asincrónicas incluirán tareas, lecturas, discusiones en foros y proyectos colaborativos. Los estudiantes tendrán acceso a los recursos de aprendizaje en cualquier momento, gestionando su tiempo de estudio según sus necesidades y disponibilidad.",
  },
  {
    key: "tutoria",
    title: "Tutoría",
    resumen: "Acompañamiento continuo y personalizado.",
    dato: "1 a 1",
    accent: "#8E7BD8",
    text: "Cada curso incluye un componente de tutorización. Los tutores estarán disponibles para consultas a través de los correos institucionales y foros. Además, se organizan sesiones de tutoría en vivo mediante videoconferencias, con apoyo continuo y personalizado.",
  },
];

/**
 * Metodología — scrollytelling.
 *
 * La columna izquierda queda fija y va cambiando (numeral, título, resumen y
 * dato) mientras la derecha desfila los tres componentes: el scroll no solo
 * mueve la página, va contando cómo se estudia. El bloque que se está leyendo
 * se ilumina, los otros dos bajan de intensidad, y el color ambiental de toda
 * la sección viaja del verde al ámbar y al violeta según el paso activo.
 *
 * Sin fotografías y sin tarjeta. Antes cada componente vivía dentro de un
 * rectángulo con borde, y encima de una imagen que nunca existió: en su lugar
 * se veía un recuadro punteado con el nombre del archivo que faltaba — un hueco
 * anunciándose como hueco, justo encima del texto que sí importa.
 *
 * Ahora el bloque es tipografía sobre el fondo, sin caja, y quien marca dónde
 * empieza y hasta dónde llega es un filete vertical que se llena del color del
 * paso al activarse. Ese filete hace el trabajo que hacía el borde de la
 * tarjeta —agrupar— sin cerrar el texto en un cuadro, y además dice cuál de los
 * tres se está leyendo, cosa que el borde no hacía.
 *
 * El movimiento se apoya en tres capas que no compiten por la misma propiedad:
 * la entrada (opacidad + desplazamiento, una sola vez), un parallax de lectura
 * sobre el encabezado ligado al scroll, y el encendido palabra a palabra del
 * párrafo. En móvil el pin se desactiva solo y los tres bloques se leen en
 * orden, sin depender del efecto.
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

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-14 lg:grid-cols-[0.86fr_1.14fr] lg:gap-24">
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

        <div className="flex flex-col">
          {ITEMS.map((item, i) => (
            <Step key={item.key} item={item} index={i} isActive={active === i} onEnter={() => setActive(i)} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

interface StepProps {
  item: (typeof ITEMS)[number];
  index: number;
  isActive: boolean;
  onEnter: () => void;
}

/**
 * Un componente de la metodología.
 *
 * Va en su propio componente y no en línea dentro del `.map` porque cada uno
 * necesita su propio `useScroll`: el parallax del encabezado se mide contra el
 * recorrido de ESTE bloque por la pantalla, no contra el de la página.
 */
function Step({ item, index, isActive, onEnter }: StepProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);

  // Parallax de lectura: el encabezado entra un poco por debajo de su sitio y
  // sale un poco por encima, a menos velocidad que el párrafo. Da profundidad
  // sin mover el texto que se está leyendo, que es lo que marea.
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const headY = useTransform(scrollYProgress, [0, 1], [26, -26]);

  return (
    <article
      ref={ref}
      className="relative py-14 first:pt-0 last:pb-0 lg:py-20"
      style={{ ["--accent" as string]: item.accent }}
    >
      {/* Sentinela: cruza el centro de la pantalla y marca el paso activo. Va
          aparte de la animación de entrada para que cada una use su umbral. */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 block h-full w-px"
        onViewportEnter={onEnter}
        viewport={{ margin: "-50% 0px -50% 0px" }}
      />

      {/* Filete separador entre bloques — un pelo de luz, no un borde de caja. */}
      {index > 0 && <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-white/[0.08]" />}

      <div className="relative pl-7 sm:pl-10">
        {/* El raíl: siempre presente en gris, y encima el tramo de color que se
            llena de arriba abajo cuando este es el bloque que se está leyendo.
            Es lo que agrupa el bloque ahora que no hay tarjeta. */}
        <span aria-hidden className="absolute left-0 top-1 bottom-1 w-px bg-white/[0.09]" />
        <motion.span
          aria-hidden
          animate={{ scaleY: reduce || isActive ? 1 : 0 }}
          transition={{ duration: 0.9, ease: SNAP }}
          style={{ originY: 0, backgroundColor: item.accent }}
          className="absolute left-0 top-1 bottom-1 w-px"
        />

        {/* La atenuación del bloque inactivo va en un envoltorio propio: si
            compartiera elemento con la animación de entrada, framer y el estado
            activo se pelearían por la misma propiedad `opacity` y ganaría el
            último que escribiera. */}
        <div
          className="transition-opacity duration-700 ease-snap"
          style={{ opacity: reduce || isActive ? 1 : 0.44 }}
        >
        <motion.div
          initial={{ opacity: 0, y: 34 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.9, ease: SNAP }}
        >
          <motion.div style={reduce ? undefined : { y: headY }}>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold uppercase tracking-[0.2em]">
              <span className="text-[var(--accent)]">0{index + 1}</span>
              <span aria-hidden className="h-px w-6 bg-white/20" />
              <span className="text-white/40">{item.dato}</span>
            </p>

            <h3 className="mt-5 font-display text-[clamp(2rem,4.4vw,3.1rem)] font-semibold leading-[1.02] tracking-ultratight text-white">
              {item.title}
            </h3>

            {/* Entradilla en serif: da un punto de entrada a la lectura antes
                del párrafo largo. */}
            <p className="mt-3 max-w-[34ch] font-serif text-[1.4rem] italic leading-snug text-[var(--accent)] sm:text-[1.7rem]">
              {item.resumen}
            </p>
          </motion.div>

          {/* El párrafo se enciende palabra a palabra con el scroll. Se queda
              fuera del parallax a propósito: lo que se está leyendo no se mueve. */}
          <ScrollHighlightText
            text={item.text}
            className="mt-7 max-w-[56ch] text-[16.5px] leading-[1.8] text-white sm:text-[17.5px]"
            dim={0.24}
          />
        </motion.div>
        </div>
      </div>
    </article>
  );
}
