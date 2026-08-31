import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { CountUp, SNAP, usePointerParallax } from "@/components/ui/RevealOnScroll";
import { ActionButton } from "@/components/ui/ActionButton";

/**
 * Hero — el momento de firma de la página.
 *
 * Tono: cinematográfico institucional. El titular no "aparece": se enfoca.
 * Cada letra entra desde un desenfoque de 10px hasta el foco, con cascada de
 * 26ms, y el remate "en Línea" cambia a serif itálica y se subraya con un
 * trazo que se dibuja solo. Es el único lugar de la página con revelado por
 * letra — así el arranque pesa más que todo lo que viene después.
 *
 * Detrás: campo verde profundo, retícula, dos manchas de color en deriva y un
 * sistema de órbitas punteadas girando muy lento. La marca sigue siendo verde
 * sin que la pantalla sea un bloque plano de verde.
 *
 * El panel derecho responde al puntero (parallax por capas: panel, foto y dos
 * fichas flotantes a distintas profundidades) y todo el bloque se aleja al
 * hacer scroll, como si la página pasara por delante.
 *
 * Conserva el texto institucional original; el botón "Acceder" sigue fuera
 * (no es funcional aquí) y en su lugar están los dos CTA reales.
 */

const DATOS = [
  { to: 6, pad: 2, label: "Maestrías en línea" },
  { to: 100, suffix: "%", label: "Modalidad virtual" },
  { to: 15, label: "Días entre sesiones en vivo" },
  { to: 6, pad: 2, label: "Trimestres por programa" },
];

const INTERVIEW_URL = "https://b24-we8qvv.bitrix24.site/crm_form_2iluh/";

/** Titular partido en líneas → palabras → letras, con acento serif en el remate. */
function HeroTitle() {
  const reduce = useReducedMotion();
  const lines = [
    { text: "Instituto Salesiano", accent: false },
    { text: "de Educación", accent: false },
    { text: "en Línea", accent: true },
  ];

  if (reduce) {
    return (
      <h1 className="mt-6 font-display text-[clamp(2.6rem,7.2vw,5.4rem)] font-semibold leading-[0.95] tracking-ultratight text-white">
        Instituto Salesiano de Educación <span className="font-serif italic">en Línea</span>
      </h1>
    );
  }

  let k = 0;
  return (
    <h1 className="mt-6 font-display text-[clamp(2.6rem,7.2vw,5.4rem)] font-semibold leading-[0.95] tracking-ultratight text-white">
      {lines.map((line, li) => (
        <span key={line.text} className="block">
          <motion.span
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { delayChildren: 0.18 + li * 0.12, staggerChildren: 0.026 } } }}
            className={line.accent ? "relative inline-block font-serif italic" : "inline-block"}
          >
            {[...line.text].map((c) => (
              <motion.span
                key={`${c}-${k++}`}
                variants={{
                  hidden: { opacity: 0, y: "0.4em", filter: "blur(10px)" },
                  show: { opacity: 1, y: "0em", filter: "blur(0px)", transition: { duration: 0.95, ease: SNAP } },
                }}
                className="inline-block whitespace-pre"
              >
                {c}
              </motion.span>
            ))}

            {/* Trazo bajo el remate: se dibuja cuando el titular ya está en foco. */}
            {line.accent && (
              <svg
                aria-hidden
                viewBox="0 0 300 12"
                preserveAspectRatio="none"
                className="absolute -bottom-1 left-0 h-3 w-full text-isel-gold"
              >
                <motion.path
                  d="M2 8C56 3 116 2 168 5c40 2 80 4 130 2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={3}
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 1.1, delay: 1.05, ease: SNAP }}
                />
              </svg>
            )}
          </motion.span>
        </span>
      ))}
    </h1>
  );
}

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const pointer = usePointerParallax(16);

  const copyY = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "24%"]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.78], [1, reduce ? 1 : 0]);
  const panelY = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "-16%"]);
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "20%"]);
  const orbitScale = useTransform(scrollYProgress, [0, 1], [1, reduce ? 1 : 1.25]);

  // Profundidades del panel: la ficha más cercana se mueve el doble que el
  // panel, la del fondo se mueve en contra. Hooks arriba, no dentro del JSX.
  const chipNearX = useTransform(pointer.x, (v) => v * 2.1);
  const chipNearY = useTransform(pointer.y, (v) => v * 2.1);
  const chipFarX = useTransform(pointer.x, (v) => v * -1.6);
  const chipFarY = useTransform(pointer.y, (v) => v * -1.6);

  return (
    <section
      id="inicio"
      ref={ref}
      className="grain relative isolate flex min-h-[100svh] items-center overflow-hidden bg-isel-deep pb-20 pt-32 lg:pb-28"
    >
      {/* Capas de fondo: foto opcional + retícula + manchas en deriva. */}
      <motion.div style={{ y: bgY }} className="absolute inset-0 -z-10">
        <div className="absolute inset-0 opacity-[0.16]">
          <ImageSlot src="/images/hero/hero-principal2.avif" alt="" decorative />
        </div>
        <div className="grid-lines absolute inset-0 opacity-60" aria-hidden />
        <div
          aria-hidden
          className="absolute -left-40 top-[-18%] h-[46rem] w-[46rem] animate-drift rounded-full bg-isel-emerald/25 blur-[130px]"
        />
        <div
          aria-hidden
          className="absolute -right-32 bottom-[-28%] h-[42rem] w-[42rem] animate-drift2 rounded-full bg-isel-gold/[0.13] blur-[140px]"
        />
        <div
          aria-hidden
          className="absolute bottom-[10%] left-[38%] h-[26rem] w-[26rem] animate-drift rounded-full bg-[#3F51B5]/[0.16] blur-[150px]"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-56 bg-isel-deep"
          style={{ maskImage: "linear-gradient(to top, #000 30%, transparent)" }}
        />
      </motion.div>

      {/* Sistema de órbitas: tres anillos punteados girando a ritmos distintos. */}
      <motion.svg
        aria-hidden
        style={{ scale: orbitScale }}
        viewBox="0 0 600 600"
        className="pointer-events-none absolute -right-[18%] top-1/2 -z-10 hidden h-[46rem] w-[46rem] -translate-y-1/2 text-white/[0.14] lg:block"
      >
        <g className="animate-spin-slow" style={{ transformOrigin: "300px 300px" }}>
          <circle cx="300" cy="300" r="286" fill="none" stroke="currentColor" strokeDasharray="2 12" />
        </g>
        <g className="animate-spin-slow" style={{ transformOrigin: "300px 300px", animationDuration: "70s", animationDirection: "reverse" }}>
          <circle cx="300" cy="300" r="212" fill="none" stroke="currentColor" strokeDasharray="1 18" />
          <circle cx="300" cy="88" r="4" fill="#E8B33D" />
        </g>
        <g className="animate-spin-slow" style={{ transformOrigin: "300px 300px", animationDuration: "95s" }}>
          <circle cx="300" cy="300" r="146" fill="none" stroke="currentColor" strokeDasharray="3 10" />
        </g>
      </motion.svg>

      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-14 px-6 lg:grid-cols-[1.12fr_0.88fr] lg:gap-16">
        <motion.div style={{ y: copyY, opacity: copyOpacity }} className="relative">
          <motion.span
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: SNAP }}
            className="eyebrow text-isel-gold"
          >
            Universidad Mesoamericana · Guatemala
          </motion.span>

          <HeroTitle />

          <motion.p
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.95, ease: SNAP }}
            className="mt-8 max-w-xl text-[15px] leading-relaxed text-white/60 sm:text-lg"
          >
            El Instituto Salesiano de Educación en Línea —ISEL— se dedica al desarrollo e implementación dinámica de
            programas de enseñanza-aprendizaje en línea. Ofrece un ambiente educativo donde estudiantes y docentes
            generan experiencias de aprendizaje flexibles, efectivas e innovadoras.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 1.08, ease: SNAP }}
            className="mt-10 flex flex-wrap items-center gap-3"
          >
            <ActionButton href="#programas" external={false} tone="light" arrow="down">
              Ver las 6 maestrías
            </ActionButton>
            <ActionButton href={INTERVIEW_URL} tone="outlineDark">
              Solicitar entrevista
            </ActionButton>
          </motion.div>

          <motion.dl
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.9, delay: 1.2 }}
            className="mt-14 grid max-w-2xl grid-cols-2 gap-x-6 gap-y-8 border-t border-white/10 pt-9 sm:grid-cols-4"
          >
            {DATOS.map((d, i) => (
              <motion.div
                key={d.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 1.25 + i * 0.09, ease: SNAP }}
              >
                <dt className="font-display text-4xl font-semibold tracking-tightest text-white">
                  <CountUp to={d.to} suffix={d.suffix} pad={d.pad} duration={1.6} />
                </dt>
                <dd className="mt-2 text-[11px] uppercase leading-snug tracking-[0.12em] text-white/40">
                  {d.label}
                </dd>
              </motion.div>
            ))}
          </motion.dl>
        </motion.div>

        {/* Panel visual: tres profundidades que reaccionan al puntero. */}
        <motion.div
          style={{ y: panelY }}
          onMouseMove={pointer.onMouseMove}
          onMouseLeave={pointer.onMouseLeave}
          className="relative hidden lg:block"
        >
          <motion.div
            style={{ x: pointer.x, y: pointer.y }}
            initial={{ opacity: 0, scale: reduce ? 1 : 1.05, y: reduce ? 0 : 34 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.3, ease: SNAP }}
            className="relative aspect-[4/5] w-full overflow-hidden rounded-[2.2rem] border border-white/10 shadow-lift"
          >
            <ImageSlot
              src="/images/hero/hero-principal.avif"
              alt="Estudiantes de maestría en modalidad virtual"
              label="Imagen principal"
              tone="dark"
              glyph="ISEL"
            />
            <div className="absolute inset-x-0 bottom-0 h-44 bg-isel-deep/85 backdrop-blur-[3px]" />
            <div className="absolute inset-x-0 bottom-0 p-8">
              <p className="font-serif text-[1.7rem] italic leading-snug text-white">
                Aprender sin pausar la carrera profesional.
              </p>
              <p className="mt-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-isel-gold">
                <span className="h-1.5 w-1.5 animate-breathe rounded-full bg-isel-gold" />
                Sincrónico + asincrónico
              </p>
            </div>
          </motion.div>

          {/* Fichas flotantes: se mueven más que el panel — la profundidad se lee sola. */}
          <motion.div
            style={{ x: chipNearX, y: chipNearY }}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, delay: 0.8, ease: SNAP }}
            className="absolute -left-10 top-12 hidden rounded-2xl border border-white/10 bg-isel-navy/90 px-5 py-4 shadow-lift backdrop-blur-md xl:block"
          >
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">Titulación</p>
            <p className="mt-1 font-display text-lg font-semibold text-white">Maestría UMES</p>
          </motion.div>

          <motion.div
            style={{ x: chipFarX, y: chipFarY }}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, delay: 0.95, ease: SNAP }}
            className="absolute -right-8 bottom-24 hidden rounded-2xl border border-white/10 bg-isel-emerald px-5 py-4 shadow-lift xl:block"
          >
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/60">Duración</p>
            <p className="mt-1 font-display text-lg font-semibold text-white">6 trimestres</p>
          </motion.div>
        </motion.div>
      </div>

      {!reduce && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8, duration: 0.6 }}
          className="pointer-events-none absolute bottom-8 right-8 z-10 hidden flex-col items-center gap-3 xl:flex"
        >
          <span className="text-[10px] uppercase tracking-[0.24em] text-white/35">Desplázate</span>
          <span className="relative block h-14 w-px overflow-hidden bg-white/12">
            <motion.span
              animate={{ y: ["-100%", "100%"] }}
              transition={{ duration: 2.1, repeat: Infinity, ease: [0.45, 0, 0.55, 1] }}
              className="absolute inset-x-0 top-0 block h-7 bg-isel-gold"
            />
          </span>
        </motion.div>
      )}
    </section>
  );
}
