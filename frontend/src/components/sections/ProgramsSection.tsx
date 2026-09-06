import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from "framer-motion";
import { Link } from "react-router-dom";
import type { MasterProgram } from "@/types/program";
import { accentFor } from "@/data/accents";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { ActionButton } from "@/components/ui/ActionButton";
import {
  IRREGULAR,
  MaskReveal,
  RevealOnScroll,
  SNAP,
  SplitHeading,
  useScrubProgress,
} from "@/components/ui/RevealOnScroll";

interface ProgramsSectionProps {
  programs: MasterProgram[];
}

/**
 * Oferta académica — «índice y visor», movido por el scroll.
 *
 * ── La composición ──────────────────────────────────────────────────────────
 * Un índice de renglones idénticos, uno por maestría, y al lado un visor que
 * se queda CLAVADO (sticky) mientras el índice pasa por delante. Seis líneas
 * iguales se recorren de un vistazo y no insinúan una jerarquía que no existe;
 * la foto, en vez de repetirse seis veces en miniatura, sale una sola vez y
 * grande, donde de verdad se mira.
 *
 * ── Las cuatro capas de movimiento ──────────────────────────────────────────
 * Cada una responde a una pregunta distinta, y por eso no se estorban:
 *
 *  1. PINNING — el visor se queda fijo (`lg:sticky`) durante todo el recorrido
 *     del índice. Es lo que convierte seis fichas sueltas en una sola escena.
 *
 *  2. SCROLLYTELLING — el renglón más cercano a la línea de lectura toma el
 *     mando y el visor cambia de maestría al pasar: bajar es pasar las seis
 *     fichas; subir es volverlas. El scroll no mueve la página, la cuenta.
 *
 *  3. SCROLL-LINKED (scrub) — el raíl de avance, el numeral gigante del fondo,
 *     el desplazamiento de la foto y el de cada renglón cuelgan del progreso
 *     de scroll, no de un disparador. Por construcción son REVERSIBLES: subir
 *     deshace exactamente lo que bajar hizo, sin banderas ni lógica de
 *     dirección. Es la diferencia entre una página que se ve una vez y una que
 *     responde a la mano en los dos sentidos.
 *
 *  4. PARALLAX — la foto del visor, el numeral del fondo y los halos viajan a
 *     velocidades distintas sobre el mismo recorrido, así que se separan al
 *     bajar y se vuelven a juntar al subir. Profundidad continua, sin una sola
 *     capa de color añadida.
 *
 * ── Lo que además hace el color ─────────────────────────────────────────────
 * Cada maestría trae su acento (ver data/accents.ts) y al activarse se lo
 * presta a TODA la sección: el halo del fondo, el filo del visor, la etiqueta
 * de campo, el numeral y el raíl. La página cambia de temperatura según lo que
 * se está mirando, que es lo que hace que recorrer el índice no se sienta como
 * leer una tabla.
 *
 * Si la API devuelve más de seis programas el índice crece solo: no hay
 * ninguna posición codificada a mano.
 */
export function ProgramsSection({ programs }: ProgramsSectionProps) {
  const [active, setActive] = useState(0);
  const rowRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const reduce = useReducedMotion();

  /** Recorrido de la sección entera por la pantalla — mueve las capas de fondo. */
  const { ref: sectionRef, progress: avanceSeccion } = useScrubProgress<HTMLElement>();

  /**
   * Recorrido del ÍNDICE, que es distinto del de la sección: empieza cuando el
   * primer renglón llega a la línea de lectura y termina cuando la cruza el
   * último. Es el que alimenta el raíl de avance, para que el relleno diga
   * «cuántas maestrías llevas» y no «cuánto queda de sección».
   */
  const listaRef = useRef<HTMLOListElement>(null);
  const { scrollYProgress: avanceCrudo } = useScroll({
    target: listaRef,
    offset: ["start 0.62", "end 0.62"],
  });
  const avanceLista = useSpring(avanceCrudo, { stiffness: 190, damping: 38, mass: 0.5 });
  const cabezaRail = useTransform(avanceLista, [0, 1], ["0%", "100%"]);

  /* Capas atadas al scroll. Comparten origen a propósito: que todas cuelguen
     del mismo progreso es lo que las hace leerse como una escena y no como
     cuatro efectos coincidiendo por casualidad. */
  const fotoY = useTransform(avanceSeccion, [0, 1], [-30, 30]);
  const numeralY = useTransform(avanceSeccion, [0, 1], [70, -70]);
  const haloY = useTransform(avanceSeccion, [0, 1], [-90, 90]);
  const bandaY = useTransform(avanceSeccion, [0, 1], [60, -60]);

  /**
   * El scroll elige el renglón: gana el que esté más cerca de la línea de
   * lectura (un 42% de la altura de pantalla, por encima del centro, que es
   * donde el ojo se posa de verdad al bajar).
   *
   * Va con `getBoundingClientRect` y un listener pasivo, no con
   * IntersectionObserver: aquí no hace falta saber «cuánto» se ve de cada
   * renglón sino «cuál está más cerca», y para eso una medición directa es más
   * corta y no depende de umbrales que se rompan en pantallas bajas.
   *
   * No hay pestillo que proteja la selección del cursor: el reparto es por
   * turnos y lo decide el último gesto. Mientras se señala un renglón no hay
   * eventos de scroll, así que el cursor manda solo; en cuanto se mueve la
   * rueda vuelve a mandar el scroll.
   */
  const syncFromScroll = useCallback(() => {
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const linea = vh * 0.42;
    let mejor = 0;
    let dist = Infinity;
    rowRefs.current.forEach((el, i) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      const d = Math.abs(r.top + r.height / 2 - linea);
      if (d < dist) {
        dist = d;
        mejor = i;
      }
    });
    setActive(mejor);
  }, []);

  useEffect(() => {
    let raf = 0;
    function onScroll() {
      // Un fotograma por scroll: medir seis rectángulos es barato, pero
      // hacerlo en cada evento de rueda no lo es.
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        syncFromScroll();
      });
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [syncFromScroll]);

  const vigente = programs[active];
  const acento = vigente ? accentFor(vigente.slug, active) : accentFor("", 0);
  const cuota = vigente?.plan?.costos?.[vigente.plan.costos.length - 1];
  const numero = String(active + 1).padStart(2, "0");
  const total = String(programs.length).padStart(2, "0");

  return (
    <section
      id="programas"
      ref={sectionRef}
      className="relative bg-isel-paper px-6 py-24 lg:py-32"
      style={{ ["--accent" as string]: acento.accent, ["--accent-soft" as string]: acento.soft }}
    >
      {/* TODO el recorte vive en esta capa y NUNCA en la sección.
          Un `overflow-hidden` en un ancestro anula el `position: sticky` de sus
          descendientes, y de eso depende aquí lo principal: el visor clavado y
          el raíl de avance. Con el recorte en la sección, el visor subía con la
          página como una tarjeta más y la composición entera perdía el sentido.
          Misma regla que en Metodología, por el mismo motivo. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="grid-lines-ink absolute inset-0 opacity-60" />

        {/* Halos del color de la maestría en curso. Cambian de color al cambiar
            de renglón Y se desplazan con el scroll: el fondo de la sección
            respira con lo que se mira y con la mano de quien lee. */}
        <motion.div
          animate={{ backgroundColor: acento.accent }}
          transition={{ duration: 1.1, ease: SNAP }}
          style={reduce ? undefined : { y: haloY }}
          className="absolute -left-52 top-24 h-[34rem] w-[34rem] rounded-full opacity-[0.09] blur-[120px]"
        />
        <motion.div
          animate={{ backgroundColor: acento.accent }}
          transition={{ duration: 1.4, ease: SNAP }}
          style={reduce ? undefined : { y: bandaY }}
          className="absolute -right-64 bottom-10 h-[28rem] w-[28rem] rounded-full opacity-[0.06] blur-[130px]"
        />

        {/* Numeral gigante de fondo: la maestría en curso, escrita en contorno
            a tamaño de cartel y viajando a contramano del scroll. Da peso
            visual sin gastar una gota de tinta sobre el texto. */}
        <motion.span
          style={reduce ? undefined : { y: numeralY }}
          className="numeral-outline absolute -left-6 top-1/2 hidden -translate-y-1/2 select-none font-display text-[22vw] font-bold leading-none tracking-ultratight text-isel-navy/[0.05] lg:block"
        >
          {numero}
        </motion.span>
      </div>

      <div className="relative mx-auto max-w-7xl">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <RevealOnScroll y={12}>
              <span className="eyebrow text-isel-emerald">Oferta académica</span>
            </RevealOnScroll>
            <SplitHeading
              text="Seis maestrías, un solo campus en línea"
              className="mt-6 text-balance font-display text-[clamp(2.2rem,5.4vw,4.2rem)] font-semibold leading-[0.98] tracking-ultratight text-isel-navy"
            />
            <RevealOnScroll delay={0.14}>
              <p className="prose-justify mt-7 max-w-xl text-[15px] leading-relaxed text-isel-ink/60 sm:text-lg">
                Programas de posgrado 100% virtuales para profesionales que quieren especializarse sin pausar su
                carrera. Cada uno con su pensum, su plan de estudios y su propia ruta de inscripción.
              </p>
            </RevealOnScroll>
          </div>

          <RevealOnScroll delay={0.2} className="shrink-0">
            <div className="flex items-start gap-5 border-t-2 border-isel-navy pt-5 lg:border-l-2 lg:border-t-0 lg:pl-6 lg:pt-0">
              <span className="numeral-outline font-display text-[4.5rem] font-bold leading-[0.8] text-isel-navy/50">
                {total}
              </span>
              <p className="max-w-[13rem] pt-1 text-[13px] leading-relaxed text-isel-ink/55">
                Todas duran seis trimestres, se cursan por módulos y llevan tutorías sincrónicas.
              </p>
            </div>
          </RevealOnScroll>
        </div>

        {/* ── Escritorio: visor clavado + raíl de avance + índice ─────────── */}
        <div className="mt-16 hidden gap-10 lg:mt-20 lg:grid lg:grid-cols-[minmax(0,26rem)_2.5rem_minmax(0,1fr)]">
          <MaskReveal className="self-start lg:sticky lg:top-28" from="bottom">
            <Visor
              programa={vigente}
              acento={acento}
              numero={numero}
              total={total}
              cuota={cuota}
              fotoY={fotoY}
              reduce={!!reduce}
            />
          </MaskReveal>

          {/* Raíl de avance. Atado al progreso del índice, así que el relleno
              sube MIENTRAS se lee y baja al volver: no es un rótulo de estado
              que salta de tercio en tercio, es cuánto llevas. */}
          <div className="relative">
            <div className="sticky top-28 h-[calc(100vh-14rem)]">
              <span aria-hidden className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-isel-line" />
              <motion.span
                aria-hidden
                style={{ scaleY: avanceLista, backgroundColor: acento.accent }}
                className="absolute left-1/2 top-0 h-full w-[2px] origin-top -translate-x-1/2 rounded-full"
              />
              {/* La cabeza del raíl: viaja pegada al final del relleno. */}
              <motion.span
                aria-hidden
                style={{ top: cabezaRail, backgroundColor: acento.accent }}
                className="absolute left-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-4 ring-isel-paper"
              />
              {/* Sin rótulo numérico en el raíl: al llegar al final la cabeza
                  aterriza justo donde estaría, y dos cosas en el mismo píxel es
                  una de más. El recuento vive en el visor —«05 · de 06
                  maestrías»—, que es donde se está mirando. */}
            </div>
          </div>

          {/* El índice. Cada renglón mide lo mismo que los demás, que es
              justamente lo que la retícula anterior no cumplía. */}
          <ol ref={listaRef} className="relative">
            {programs.map((program, i) => (
              <Renglon
                key={program.slug}
                program={program}
                index={i}
                total={programs.length}
                esActivo={i === active}
                reduce={!!reduce}
                onEnter={() => setActive(i)}
                onLeave={syncFromScroll}
                registrar={(el) => {
                  rowRefs.current[i] = el;
                }}
              />
            ))}
          </ol>
        </div>

        {/* ── Móvil y tableta: seis fichas idénticas, con foto en parallax ── */}
        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:hidden">
          {programs.map((program, i) => (
            <FichaMovil key={program.slug} program={program} index={i} reduce={!!reduce} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

type Acento = ReturnType<typeof accentFor>;

/**
 * El visor: el objeto que se queda clavado mientras el índice pasa.
 *
 * El marco NO cambia — es el contenido el que rota. Esa es la regla que
 * sostiene el pin: si el recuadro se moviera a cada cambio, dejaría de leerse
 * como un mismo visor mostrando cosas distintas y pasaría a ser seis tarjetas
 * apareciendo en el mismo sitio.
 */
function Visor({
  programa,
  acento,
  numero,
  total,
  cuota,
  fotoY,
  reduce,
}: {
  programa: MasterProgram | undefined;
  acento: Acento;
  numero: string;
  total: string;
  cuota: { label: string; value: string } | undefined;
  fotoY: MotionValue<number>;
  reduce: boolean;
}) {
  return (
    <div
      style={{ ["--accent" as string]: acento.accent, ["--accent-soft" as string]: acento.soft }}
      className="overflow-hidden rounded-2xl border border-isel-line bg-white shadow-card"
    >
      {/* Filo del color de la maestría en curso, a todo el ancho. Es el cambio
          más barato y el que más se nota: el visor entero cambia de bando. */}
      <motion.span
        aria-hidden
        animate={{ backgroundColor: acento.accent }}
        transition={{ duration: 0.7, ease: SNAP }}
        className="block h-[4px] w-full"
      />

      <div className="relative aspect-[4/3] overflow-hidden bg-isel-arena">
        {/* La foto va sobredimensionada y se desplaza con el scroll: el
            parallax necesita margen por arriba y por abajo, y sin él aparecería
            una franja vacía en los extremos del recorrido. */}
        <motion.div style={reduce ? undefined : { y: fotoY }} className="absolute -inset-y-[9%] inset-x-0">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={programa?.slug ?? "vacio"}
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.07 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.85, ease: SNAP }}
              className="absolute inset-0"
            >
              {programa && (
                <ImageSlot src={programa.cardImage} alt={programa.title} label={acento.campo} glyph={numero} />
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>

        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.14] mix-blend-multiply transition-colors duration-700"
          style={{ backgroundColor: acento.accent }}
        />

        <span className="absolute left-5 top-5 z-20 inline-flex items-center gap-2 rounded-full bg-white/95 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--accent)] shadow-sm backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
          {acento.campo}
        </span>

        {/* Numeral en contorno sobre la foto: dice en qué punto del índice se
            está sin obligar a mirar el raíl. */}
        <span
          aria-hidden
          className="numeral-outline pointer-events-none absolute -bottom-4 right-4 z-20 select-none font-display text-[5rem] font-bold leading-none text-white/75"
        >
          {numero}
        </span>
      </div>

      <div className="p-7">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={programa?.slug ?? "vacio-meta"}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10 }}
            transition={{ duration: 0.5, ease: SNAP }}
          >
            <p className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.18em] text-isel-ink/35">
              <span className="tabular text-[var(--accent)]">{numero}</span>
              <span aria-hidden className="h-px w-6 bg-isel-line" />
              <span>de {total} maestrías</span>
            </p>

            <h3 className="mt-4 font-display text-[1.5rem] font-semibold leading-[1.12] tracking-tightest text-isel-navy">
              {programa?.title}
            </h3>

            <dl className="mt-5 flex flex-wrap gap-x-7 gap-y-2 text-[12.5px] text-isel-ink/55">
              <div>
                <dt className="sr-only">Duración</dt>
                <dd>{programa?.plan?.duracion}</dd>
              </div>
              {cuota && (
                <div>
                  <dt className="sr-only">{cuota.label}</dt>
                  <dd>
                    {cuota.label}: <strong className="font-semibold text-isel-navy">{cuota.value}</strong>
                  </dd>
                </div>
              )}
            </dl>
          </motion.div>
        </AnimatePresence>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <ActionButton to={`/programas/${programa?.slug ?? ""}`} tone="accent" size="sm">
            Ver el programa
          </ActionButton>
          <ActionButton
            to={`/portal/login?programa=${programa?.slug ?? ""}`}
            tone="outlineLight"
            size="sm"
            arrow="none"
          >
            Asignación
          </ActionButton>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Un renglón del índice.
 *
 * Va en componente propio porque cada uno necesita SU PROPIO `useScroll`: el
 * desplazamiento lateral se mide contra el recorrido de este renglón por la
 * pantalla, no contra el de la sección. Medido contra la sección los seis se
 * moverían a la vez y el efecto se leería como un fallo de maquetación.
 */
function Renglon({
  program,
  index,
  total,
  esActivo,
  reduce,
  onEnter,
  onLeave,
  registrar,
}: {
  program: MasterProgram;
  index: number;
  total: number;
  esActivo: boolean;
  reduce: boolean;
  onEnter: () => void;
  onLeave: () => void;
  registrar: (el: HTMLAnchorElement | null) => void;
}) {
  const a = accentFor(program.slug, index);
  const { ref: cajaRef, progress } = useScrubProgress<HTMLDivElement>();
  // Deriva lateral mínima (14px en todo el recorrido). Es un pelo a propósito:
  // lo suficiente para que la lista respire al subir y bajar, nunca tanto como
  // para que el ojo pierda el renglón que venía siguiendo.
  const x = useTransform(progress, [0, 1], [14, -14]);

  return (
    <li>
      <motion.div
        ref={cajaRef}
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 34 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.85, delay: IRREGULAR[index] ?? 0, ease: SNAP }}
      >
        <motion.div style={reduce ? undefined : { x }}>
          <Link
            ref={registrar}
            to={`/programas/${program.slug}`}
            onMouseEnter={onEnter}
            // Al retirar el cursor el visor vuelve a lo que dicta el scroll, en
            // vez de quedarse en el último señalado.
            onMouseLeave={onLeave}
            onFocus={onEnter}
            onBlur={onLeave}
            style={{ ["--accent" as string]: a.accent }}
            /* Alto mínimo común: es el requisito de toda la sección. Los
               títulos no miden lo mismo —uno ocupa dos renglones y otro uno— y
               sin este suelo el índice volvería a tener piezas de distinto
               tamaño, que es justo lo que se vino a arreglar. */
            className="group/fila relative flex min-h-[9.5rem] items-center gap-6 py-7 pl-5 pr-4 focus-visible:outline-none"
          >
            {/* La pastilla que viaja: una sola, compartida por los seis
                renglones. Es lo que hace que bajar por el índice se vea como un
                movimiento continuo y no como seis encendidos sueltos. */}
            {esActivo && (
              <motion.span
                layoutId="programa-foco"
                transition={{ duration: 0.5, ease: SNAP }}
                aria-hidden
                className="absolute inset-y-1 -inset-x-1 -z-10 rounded-xl bg-white shadow-card"
              />
            )}
            {esActivo && (
              <motion.span
                layoutId="programa-filo"
                transition={{ duration: 0.5, ease: SNAP }}
                aria-hidden
                className="absolute inset-y-4 left-0 w-[3px] rounded-full bg-[var(--accent)]"
              />
            )}

            <span
              aria-hidden
              className={`font-display text-[13px] font-bold tabular tracking-[0.18em] transition-colors duration-500 ease-snap ${
                esActivo ? "text-[var(--accent)]" : "text-isel-ink/30"
              }`}
            >
              {String(index + 1).padStart(2, "0")}
            </span>

            <span className="min-w-0 flex-1">
              <span
                className={`block text-[10px] font-bold uppercase tracking-[0.16em] transition-colors duration-500 ease-snap ${
                  esActivo ? "text-[var(--accent)]" : "text-isel-ink/35"
                }`}
              >
                {a.campo}
              </span>
              {/* El título da un paso al frente al activarse, en vez de
                  limitarse a cambiar de color. */}
              <span
                className={`mt-1.5 block font-display text-[1.35rem] font-semibold leading-[1.15] tracking-tightest text-isel-navy transition-transform duration-500 ease-snap ${
                  esActivo ? "translate-x-1" : "translate-x-0"
                }`}
              >
                {program.title}
              </span>
            </span>

            <span className="hidden shrink-0 text-[12.5px] text-isel-ink/45 xl:block">
              {program.plan?.duracion}
            </span>

            <span
              aria-hidden
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition-all duration-500 ease-back ${
                esActivo ? "scale-100 opacity-100" : "scale-0 opacity-0"
              }`}
              style={{ backgroundColor: a.accent }}
            >
              →
            </span>
          </Link>
        </motion.div>
      </motion.div>

      {/* Filete separador: se traza de izquierda a derecha al entrar, en vez de
          aparecer de golpe. */}
      {index < total - 1 && (
        <motion.span
          aria-hidden
          initial={reduce ? { opacity: 0 } : { scaleX: 0 }}
          whileInView={{ opacity: 1, scaleX: 1 }}
          viewport={{ once: true, amount: 1 }}
          transition={{ duration: 0.9, delay: (IRREGULAR[index] ?? 0) + 0.1, ease: SNAP }}
          className="block h-px origin-left bg-isel-line"
        />
      )}
    </li>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * La ficha de móvil y tableta.
 *
 * Ahí no hay pin —no hay ancho para dos columnas y clavar algo en una pantalla
 * de teléfono es robarle la mitad— pero sí queda el parallax: la foto de cada
 * ficha se desplaza dentro de su marco mientras la ficha cruza la pantalla, así
 * que la lista tampoco se siente quieta en el móvil.
 */
function FichaMovil({ program, index, reduce }: { program: MasterProgram; index: number; reduce: boolean }) {
  const a = accentFor(program.slug, index);
  const { ref, progress } = useScrubProgress<HTMLDivElement>();
  const y = useTransform(progress, [0, 1], [-22, 22]);

  return (
    <motion.article
      ref={ref}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.9, delay: IRREGULAR[index] ?? 0, ease: SNAP }}
      style={{ ["--accent" as string]: a.accent, ["--accent-soft" as string]: a.soft }}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-isel-line bg-white"
    >
      <span aria-hidden className="block h-[3px] w-full" style={{ backgroundColor: a.accent }} />

      <div className="relative aspect-[16/10] overflow-hidden">
        <motion.div style={reduce ? undefined : { y }} className="absolute -inset-y-[8%] inset-x-0">
          <ImageSlot
            src={program.cardImage}
            alt={program.title}
            label={a.campo}
            glyph={String(index + 1).padStart(2, "0")}
          />
        </motion.div>
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.16] mix-blend-multiply"
          style={{ backgroundColor: a.accent }}
        />
        <span className="absolute left-4 top-4 z-20 inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--accent)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
          {a.campo}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <h3 className="font-display text-[1.3rem] font-semibold leading-[1.14] tracking-tightest text-isel-navy">
          {program.title}
        </h3>
        <p className="mt-3 text-[12.5px] text-isel-ink/55">{program.plan?.duracion}</p>

        <div className="mt-auto flex flex-wrap items-center gap-3 pt-6">
          <span className="text-[12px] font-bold uppercase tracking-[0.1em] text-[var(--accent)]">
            Ver el programa →
          </span>
          <ActionButton
            to={`/portal/login?programa=${program.slug}`}
            tone="outlineLight"
            size="sm"
            arrow="none"
            className="relative z-20"
          >
            Asignación
          </ActionButton>
        </div>
      </div>

      {/* Capa estirada: la ficha entera lleva al detalle. */}
      <Link
        to={`/programas/${program.slug}`}
        aria-label={`Ver el programa: ${program.title}`}
        className="absolute inset-0 z-10"
      />
    </motion.article>
  );
}
