import { useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
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
 * Un glifo por componente, dibujado a trazo.
 *
 * La sección era enteramente tipográfica y por eso se leía apagada: tres
 * bloques de texto seguidos, sin nada que distinga uno de otro más que el
 * color. Aquí NO vuelven las fotografías —las que había nunca existieron y
 * dejaban un recuadro de «falta el archivo» encima del texto— sino un dibujo
 * hecho de líneas, que no depende de ningún archivo y no puede faltar.
 *
 * Cada trazo se dibuja conforme se baja y se borra conforme se sube, atado al
 * recorrido del bloque: es reversible por construcción y le da a cada
 * componente una identidad que se reconoce antes de leer el título.
 *
 *  01 · Sincrónicas → ondas que salen de un punto: la emisión en vivo.
 *  02 · Asincrónico → capas apiladas y desfasadas: el material que se toma
 *       cuando cada quien puede.
 *  03 · Tutoría     → dos puntos y el arco que los une: uno a uno.
 */
const GLIFOS: Record<string, string[]> = {
  sincronicas: [
    "M60 60 m-6 0 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0",
    "M60 32 a28 28 0 0 1 0 56 a28 28 0 0 1 0 -56",
    "M60 12 a48 48 0 0 1 0 96 a48 48 0 0 1 0 -96",
    "M12 60 h96",
  ],
  asincronico: [
    "M18 40 L60 20 L102 40 L60 60 Z",
    "M18 60 L60 80 L102 60",
    "M18 80 L60 100 L102 80",
  ],
  tutoria: [
    "M28 44 m-9 0 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0",
    "M92 44 m-9 0 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0",
    "M28 62 c0 22 64 22 64 0",
    "M60 84 v14",
  ],
};

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

  /**
   * Avance real por los tres componentes, medido sobre la columna que se lee.
   *
   * El raíl de progreso saltaba de tercio en tercio: se llenaba de golpe al
   * cambiar el paso activo y luego se quedaba muerto durante todo el rato que
   * uno tarda en leer el bloque. Ahora el relleno es continuo —avanza mientras
   * se lee y retrocede al subir— así que el raíl deja de ser un rótulo de
   * estado y pasa a ser lo que dice ser: cuánto llevas.
   */
  const pasosRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: pasosRef,
    offset: ["start 0.72", "end 0.72"],
  });
  const avance = useSpring(scrollYProgress, { stiffness: 180, damping: 36, mass: 0.5 });

  /* Parallax del fondo: la retícula viaja un poco más despacio que el
     contenido. Es lo que separa el fondo del texto sin añadir una sola capa
     de color más. */
  const reticulaY = useTransform(avance, [0, 1], [-26, 26]);

  return (
    <section
      id="metodologia"
      className="grain relative bg-isel-navy px-6 py-24 lg:py-32"
      style={{ ["--accent" as string]: current.accent }}
    >
      {/* El recorte vive aquí dentro y no en la sección: un overflow-hidden en
          el ancestro anularía el position:sticky de la columna izquierda. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <motion.div
          style={reduce ? undefined : { y: reticulaY }}
          className="grid-lines absolute -inset-y-10 inset-x-0 opacity-50"
        />
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
            <p className="prose-justify mt-7 max-w-md text-[15px] leading-relaxed text-white/55">
              Los programas se imparten completamente en modalidad virtual, combinando sesiones sincrónicas y
              actividades asincrónicas para asegurar una formación flexible.
            </p>
          </RevealOnScroll>

          {/* Indicador del paso en curso — visible mientras se lee la derecha. */}
          <div className="mt-14 hidden lg:block">
            <div className="flex items-start gap-7">
              {/* Anillo de avance alrededor del numeral.
                  El raíl de abajo dice cuánto llevas de los tres bloques, pero
                  está lejos del numeral y hay que buscarlo. Este anillo pone la
                  misma información donde ya se está mirando, y como cuelga del
                  scroll se cierra al bajar y se abre al subir. */}
              <div className="relative h-[7rem] w-[7rem] shrink-0">
                <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90" fill="none">
                  <circle cx="50" cy="50" r="46" stroke="rgba(255,255,255,0.10)" strokeWidth={2} />
                  <motion.circle
                    cx="50"
                    cy="50"
                    r="46"
                    stroke={current.accent}
                    strokeWidth={2}
                    strokeLinecap="round"
                    style={{ pathLength: reduce ? 1 : avance }}
                  />
                </svg>

                <div className="absolute inset-[0.9rem] overflow-hidden">
                <AnimatePresence mode="popLayout">
                  <motion.span
                    key={current.key}
                    initial={reduce ? { opacity: 0 } : { y: "70%", opacity: 0, filter: "blur(6px)" }}
                    animate={{ y: "0%", opacity: 1, filter: "blur(0px)" }}
                    exit={reduce ? { opacity: 0 } : { y: "-70%", opacity: 0, filter: "blur(6px)" }}
                    transition={{ duration: 0.6, ease: SNAP }}
                    className="absolute inset-0 flex items-center justify-center font-display text-[3.1rem] font-bold leading-none tracking-ultratight text-[var(--accent)]"
                  >
                    0{active + 1}
                  </motion.span>
                </AnimatePresence>
                </div>
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

            {/* Raíl de progreso: tres tramos que se llenan CONTINUAMENTE
                conforme se lee, no de golpe al cambiar de paso. */}
            <div className="mt-10 flex items-center gap-3">
              {ITEMS.map((item, i) => (
                <RailSegment key={item.key} avance={avance} index={i} total={ITEMS.length} color={item.accent} />
              ))}
              <span className="ml-2 shrink-0 font-display text-xs font-bold tabular tracking-[0.16em] text-white/40">
                0{active + 1}/0{ITEMS.length}
              </span>
            </div>
          </div>
        </div>

        <div ref={pasosRef} className="flex flex-col">
          {ITEMS.map((item, i) => (
            <Step key={item.key} item={item} index={i} isActive={active === i} onEnter={() => setActive(i)} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Un tramo del raíl de progreso.
 *
 * Reparte el avance global entre los tramos: el tramo `i` va de `i/total` a
 * `(i+1)/total`, así que se llena solo mientras se está leyendo su bloque y se
 * vacía al volver sobre él. Los tres juntos forman una barra continua.
 */
function RailSegment({
  avance,
  index,
  total,
  color,
}: {
  avance: MotionValue<number>;
  index: number;
  total: number;
  color: string;
}) {
  const reduce = useReducedMotion();
  const relleno = useTransform(avance, [index / total, (index + 1) / total], [0, 1], {
    clamp: true,
  });

  return (
    <span className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/12">
      <motion.span
        style={{ scaleX: reduce ? 1 : relleno, backgroundColor: color }}
        className="block h-full origin-left"
      />
    </span>
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

  /* El filete de color ya no se enciende de golpe al activarse el bloque: se
     LLENA de arriba abajo al ritmo de la lectura y se vacía al subir. Antes
     marcaba «este es el activo»; ahora marca «vas por aquí», que es una
     información distinta y bastante más útil en un texto largo. */
  const relleno = useTransform(scrollYProgress, [0.2, 0.68], [0, 1], { clamp: true });

  /* El trazo del glifo va por delante de la lectura: termina de dibujarse a
     media altura del bloque, cuando el ojo llega al párrafo. Si acabara con el
     bloque, nadie lo vería completo. */
  const trazo = useTransform(scrollYProgress, [0.12, 0.52], [0, 1], { clamp: true });
  /* El numeral de fondo cruza el bloque a contramano. Es la capa más lejana de
     las tres, y por eso la que más se desplaza. */
  const numeralY = useTransform(scrollYProgress, [0, 1], [80, -80]);
  const glifoY = useTransform(scrollYProgress, [0, 1], [34, -34]);

  return (
    <article
      ref={ref}
      className="relative py-14 first:pt-0 last:pb-0 lg:py-20"
      style={{ ["--accent" as string]: item.accent }}
    >
      {/* Numeral de cartel, en contorno y al fondo de todo. Ancla el bloque
          visualmente sin robarle una gota de contraste al texto. */}
      <motion.span
        aria-hidden
        style={reduce ? undefined : { y: numeralY }}
        className="numeral-outline pointer-events-none absolute -right-4 top-1/2 hidden -translate-y-1/2 select-none font-display text-[16rem] font-bold leading-none tracking-ultratight text-white/[0.045] xl:block"
      >
        0{index + 1}
      </motion.span>

      {/* El glifo, dibujándose. Va detrás del texto y con la mezcla en claro,
          así que nunca compite con lo que hay que leer: se percibe como una
          marca de agua que responde al scroll. */}
      <motion.div
        aria-hidden
        style={reduce ? undefined : { y: glifoY }}
        className="pointer-events-none absolute right-0 top-10 hidden lg:block xl:right-24"
      >
        <svg viewBox="0 0 120 120" className="h-40 w-40 xl:h-52 xl:w-52" fill="none">
          {(GLIFOS[item.key] ?? []).map((d, i) => (
            <motion.path
              key={d}
              d={d}
              stroke={item.accent}
              strokeWidth={1.4}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.55}
              /* Cada trazo arranca un poco después que el anterior, así que el
                 dibujo se construye por partes en vez de aparecer entero. */
              style={{ pathLength: reduce ? 1 : trazo, transitionDelay: `${i * 40}ms` }}
            />
          ))}
        </svg>
      </motion.div>

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
          style={{
            originY: 0,
            backgroundColor: item.accent,
            scaleY: reduce ? 1 : relleno,
          }}
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
            className="prose-justify mt-7 max-w-[56ch] text-[16.5px] leading-[1.8] text-white sm:text-[17.5px]"
            dim={0.24}
          />
        </motion.div>
        </div>
      </div>
    </article>
  );
}
