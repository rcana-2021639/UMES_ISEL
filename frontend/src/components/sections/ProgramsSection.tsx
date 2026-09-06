import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import type { MasterProgram } from "@/types/program";
import { accentFor } from "@/data/accents";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { ActionButton } from "@/components/ui/ActionButton";
import { IRREGULAR, MaskReveal, RevealOnScroll, SNAP, SplitHeading } from "@/components/ui/RevealOnScroll";

interface ProgramsSectionProps {
  programs: MasterProgram[];
}

/**
 * Oferta académica — «índice y visor».
 *
 * ── Por qué se rehízo ───────────────────────────────────────────────────────
 * Antes eran seis tarjetas en retícula asimétrica (dos grandes, tres medianas,
 * una banda ancha). La composición era vistosa, pero mentía: el tamaño de una
 * tarjeta es lo primero que se lee como jerarquía, y aquí las seis maestrías
 * valen exactamente lo mismo. Quien llegaba entendía «hay dos importantes y
 * cuatro de relleno», que es falso, y para descubrir que no lo era tenía que
 * leerse las seis fichas enteras. Eso es lo que se veía mal.
 *
 * ── Qué hay ahora ───────────────────────────────────────────────────────────
 * Un índice: seis renglones idénticos, uno por maestría, con su numeral, su
 * campo y su título. Seis líneas iguales se recorren de un vistazo —cinco
 * segundos— y no insinúan ninguna jerarquía que no exista.
 *
 * Al lado, un **visor** que se queda fijo mientras el índice pasa por delante
 * y muestra la maestría en curso: su foto, su campo, su duración, su cuota y
 * las dos acciones. Las fotos no se pierden, al contrario: en vez de seis
 * miniaturas compitiendo, hay una sola imagen grande a la que se le presta
 * atención de verdad.
 *
 * ── El movimiento ───────────────────────────────────────────────────────────
 * 1. ENTRADA — el visor se descubre con cortina y los renglones caen en
 *    cascada irregular (0, 90, 150, 260, 340, 480 ms), cada uno con su filete
 *    trazándose de izquierda a derecha. Nada de seis fundidos idénticos.
 * 2. SCROLL — el visor AVANZA SOLO. El renglón más cercano a la línea de
 *    lectura toma el mando y el visor cambia de maestría al pasar: recorrer la
 *    sección hacia abajo es pasar las seis fichas, y hacia arriba, volverlas.
 *    Es la razón de ser de la composición, no un adorno pegado encima.
 * 3. CURSOR — señalar un renglón se lo arrebata al scroll de inmediato. La
 *    marca activa es una pastilla compartida (layoutId) que se DESLIZA de un
 *    renglón a otro: el mismo gesto que el riel del navbar, para que la página
 *    hable un solo idioma de movimiento.
 *
 * Si la API devuelve más de seis programas el índice simplemente crece: no hay
 * ninguna posición codificada a mano, que era la otra fragilidad de la
 * retícula anterior.
 */
export function ProgramsSection({ programs }: ProgramsSectionProps) {
  const [active, setActive] = useState(0);
  const rowRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const reduce = useReducedMotion();

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
   * rueda vuelve a mandar el scroll. Un `pinned` que solo se soltaba al salir
   * del renglón dejaba el visor congelado en cuanto alguien hacía scroll con
   * el puntero parado encima de la lista — que es como se lee una lista.
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

  return (
    <section id="programas" className="relative overflow-hidden bg-isel-paper px-6 py-24 lg:py-32">
      <div className="grid-lines-ink pointer-events-none absolute inset-0 opacity-60" aria-hidden />
      {/* El halo adopta el color de la maestría en curso: el fondo entero de la
          sección respira con lo que se está mirando. */}
      <motion.div
        aria-hidden
        animate={{ backgroundColor: acento.accent }}
        transition={{ duration: 1.1, ease: SNAP }}
        className="pointer-events-none absolute -left-52 top-24 h-[34rem] w-[34rem] rounded-full opacity-[0.07] blur-[120px]"
      />

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
                {String(programs.length).padStart(2, "0")}
              </span>
              <p className="max-w-[13rem] pt-1 text-[13px] leading-relaxed text-isel-ink/55">
                Todas duran seis trimestres, se cursan por módulos y llevan tutorías sincrónicas.
              </p>
            </div>
          </RevealOnScroll>
        </div>

        {/* ── Escritorio: visor fijo + índice ─────────────────────────────── */}
        <div className="mt-16 hidden gap-14 lg:mt-20 lg:grid lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
          <MaskReveal className="self-start lg:sticky lg:top-28" from="bottom">
            <div
              style={{ ["--accent" as string]: acento.accent, ["--accent-soft" as string]: acento.soft }}
              className="overflow-hidden rounded-2xl border border-isel-line bg-white shadow-card"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-isel-arena">
                {/* Solo cambia la foto, no el marco: el visor es un objeto
                    estable y lo que rota es su contenido. */}
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div
                    key={vigente?.slug ?? "vacio"}
                    initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.07 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.02 }}
                    transition={{ duration: 0.85, ease: SNAP }}
                    className="absolute inset-0"
                  >
                    {vigente && (
                      <ImageSlot
                        src={vigente.cardImage}
                        alt={vigente.title}
                        label={acento.campo}
                        glyph={String(active + 1).padStart(2, "0")}
                      />
                    )}
                  </motion.div>
                </AnimatePresence>

                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 opacity-[0.14] mix-blend-multiply transition-colors duration-700"
                  style={{ backgroundColor: acento.accent }}
                />

                <span className="absolute left-5 top-5 z-20 inline-flex items-center gap-2 rounded-full bg-white/95 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--accent)] shadow-sm backdrop-blur">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                  {acento.campo}
                </span>
              </div>

              <div className="p-7">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={vigente?.slug ?? "vacio-meta"}
                    initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10 }}
                    transition={{ duration: 0.5, ease: SNAP }}
                  >
                    <h3 className="font-display text-[1.5rem] font-semibold leading-[1.12] tracking-tightest text-isel-navy">
                      {vigente?.title}
                    </h3>
                    <dl className="mt-5 flex flex-wrap gap-x-7 gap-y-2 text-[12.5px] text-isel-ink/55">
                      <div>
                        <dt className="sr-only">Duración</dt>
                        <dd>{vigente?.plan?.duracion}</dd>
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
                  <ActionButton to={`/programas/${vigente?.slug ?? ""}`} tone="accent" size="sm">
                    Ver el programa
                  </ActionButton>
                  <ActionButton
                    to={`/portal/login?programa=${vigente?.slug ?? ""}`}
                    tone="outlineLight"
                    size="sm"
                    arrow="none"
                  >
                    Asignación
                  </ActionButton>
                </div>
              </div>
            </div>
          </MaskReveal>

          {/* El índice. Cada renglón mide lo mismo que los demás, que es
              justamente lo que la retícula anterior no cumplía. */}
          <ol className="relative">
            {programs.map((program, i) => {
              const a = accentFor(program.slug, i);
              const esActivo = i === active;
              return (
                <li key={program.slug}>
                  <motion.div
                    initial={reduce ? { opacity: 0 } : { opacity: 0, y: 34 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ duration: 0.85, delay: IRREGULAR[i] ?? 0, ease: SNAP }}
                  >
                    <Link
                      ref={(el) => {
                        rowRefs.current[i] = el;
                      }}
                      to={`/programas/${program.slug}`}
                      onMouseEnter={() => setActive(i)}
                      // Al retirar el cursor el visor vuelve a lo que dicta el
                      // scroll, en vez de quedarse en el último señalado.
                      onMouseLeave={syncFromScroll}
                      onFocus={() => setActive(i)}
                      onBlur={syncFromScroll}
                      style={{ ["--accent" as string]: a.accent }}
                      /* Alto mínimo común: es el requisito de toda la sección.
                         Los títulos no miden lo mismo —uno ocupa dos renglones
                         y otro uno— y sin este suelo el índice volvería a tener
                         piezas de distinto tamaño, que es justo lo que se vino
                         a arreglar. */
                      className="group/fila relative flex min-h-[9.5rem] items-center gap-6 py-7 pl-5 pr-4 focus-visible:outline-none"
                    >
                      {/* La pastilla que viaja: una sola, compartida por los
                          seis renglones. Es lo que hace que bajar por el índice
                          se vea como un movimiento continuo y no como seis
                          encendidos sueltos. */}
                      {esActivo && (
                        <motion.span
                          layoutId="programa-foco"
                          transition={{ duration: 0.5, ease: SNAP }}
                          aria-hidden
                          className="absolute inset-y-1 -inset-x-1 -z-10 rounded-xl bg-white shadow-card"
                        />
                      )}
                      {/* Filete de color a la izquierda del renglón activo. */}
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
                        {String(i + 1).padStart(2, "0")}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span
                          className={`block text-[10px] font-bold uppercase tracking-[0.16em] transition-colors duration-500 ease-snap ${
                            esActivo ? "text-[var(--accent)]" : "text-isel-ink/35"
                          }`}
                        >
                          {a.campo}
                        </span>
                        {/* El título se desplaza un pelo al activarse: el
                            renglón «da un paso al frente» en vez de limitarse a
                            cambiar de color. */}
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

                      {/* Disco con la flecha: solo en el renglón activo. */}
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

                  {/* Filete separador: se traza de izquierda a derecha al
                      entrar, en vez de aparecer de golpe. */}
                  {i < programs.length - 1 && (
                    <motion.span
                      aria-hidden
                      initial={reduce ? { opacity: 0 } : { scaleX: 0 }}
                      whileInView={{ opacity: 1, scaleX: 1 }}
                      viewport={{ once: true, amount: 1 }}
                      transition={{ duration: 0.9, delay: (IRREGULAR[i] ?? 0) + 0.1, ease: SNAP }}
                      className="block h-px origin-left bg-isel-line"
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </div>

        {/* ── Móvil y tableta: seis fichas idénticas ──────────────────────── */}
        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:hidden">
          {programs.map((program, i) => {
            const a = accentFor(program.slug, i);
            return (
              <motion.article
                key={program.slug}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.9, delay: IRREGULAR[i] ?? 0, ease: SNAP }}
                style={{ ["--accent" as string]: a.accent, ["--accent-soft" as string]: a.soft }}
                className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-isel-line bg-white"
              >
                <div className="relative aspect-[16/10] overflow-hidden">
                  <ImageSlot
                    src={program.cardImage}
                    alt={program.title}
                    label={a.campo}
                    glyph={String(i + 1).padStart(2, "0")}
                  />
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 opacity-[0.16] mix-blend-multiply"
                    style={{ backgroundColor: a.accent }}
                  />
                  <span className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--accent)]">
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
          })}
        </div>
      </div>
    </section>
  );
}
