import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { SplitHeading, SNAP } from "@/components/ui/RevealOnScroll";

/**
 * Hero — el momento de firma de la página.
 *
 * Un solo gesto grande: el titular se revela palabra por palabra desde debajo
 * de una máscara mientras el panel de la derecha entra escalando. Nada más en
 * el sitio usa ese efecto, para que este arranque sea el que se recuerda.
 *
 * El fondo no es una foto oscurecida más: es un campo verde profundo con
 * retícula, dos manchas de color en deriva lenta (verde vivo + ámbar) y grano
 * fino encima. Así la marca sigue siendo verde sin que la pantalla sea un
 * bloque plano de verde.
 *
 * Conserva el texto institucional original y el botón "Acceder" sigue fuera
 * (no es funcional en este sitio); en su lugar los dos CTA reales: bajar a
 * programas y solicitar entrevista.
 */

const DATOS = [
  { valor: "06", label: "Maestrías en línea" },
  { valor: "100%", label: "Modalidad virtual" },
  { valor: "15", label: "Días entre sesiones en vivo" },
  { valor: "06", label: "Trimestres por programa" },
];

const INTERVIEW_URL = "https://b24-we8qvv.bitrix24.site/crm_form_2iluh/";

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });

  const copyY = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "26%"]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.75], [1, reduce ? 1 : 0]);
  const panelY = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "-14%"]);
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "18%"]);

  return (
    <section
      id="inicio"
      ref={ref}
      className="grain relative isolate flex min-h-[100svh] items-center overflow-hidden bg-isel-deep pb-20 pt-32 lg:pb-28"
    >
      {/* Capas de fondo: foto opcional + retícula + manchas en deriva. */}
      <motion.div style={{ y: bgY }} className="absolute inset-0 -z-10">
        <div className="absolute inset-0 opacity-[0.18]">
          <ImageSlot src="/images/hero/hero-principal.jpg" alt="" decorative />
        </div>
        <div className="grid-lines absolute inset-0 opacity-60" aria-hidden />
        <div
          aria-hidden
          className="absolute -left-40 top-[-15%] h-[46rem] w-[46rem] animate-drift rounded-full bg-isel-emerald/25 blur-[120px]"
        />
        <div
          aria-hidden
          className="absolute -right-32 bottom-[-25%] h-[40rem] w-[40rem] animate-drift2 rounded-full bg-isel-gold/[0.14] blur-[130px]"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-56 bg-isel-deep"
          style={{ maskImage: "linear-gradient(to top, #000 30%, transparent)" }}
        />
      </motion.div>

      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-14 px-6 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
        <motion.div style={{ y: copyY, opacity: copyOpacity }} className="relative">
          <motion.span
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: SNAP }}
            className="eyebrow text-isel-gold"
          >
            Universidad Mesoamericana · Guatemala
          </motion.span>

          <SplitHeading
            as="h1"
            immediate
            delay={0.18}
            text="Instituto Salesiano de Educación en Línea"
            className="mt-6 max-w-[15ch] font-display text-[clamp(2.6rem,7vw,5.1rem)] font-semibold leading-[0.98] tracking-tightest text-white"
          />

          <motion.p
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.55, ease: SNAP }}
            className="mt-7 max-w-xl text-[15px] leading-relaxed text-white/65 sm:text-lg"
          >
            El Instituto Salesiano de Educación en Línea —ISEL— se dedica al desarrollo e implementación dinámica de
            programas de enseñanza-aprendizaje en línea. Ofrece un ambiente educativo donde estudiantes y docentes
            generan experiencias de aprendizaje flexibles, efectivas e innovadoras.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.68, ease: SNAP }}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <a
              href="#programas"
              className="group relative overflow-hidden rounded-full bg-white px-7 py-4 text-[13px] font-bold uppercase tracking-[0.1em] text-isel-deep"
            >
              <span
                aria-hidden
                className="absolute inset-0 origin-bottom scale-y-0 bg-isel-gold transition-transform duration-500 ease-snap group-hover:scale-y-100"
              />
              <span className="relative inline-flex items-center gap-2">
                Ver las 6 maestrías
                <span className="transition-transform duration-500 ease-snap group-hover:translate-y-1">↓</span>
              </span>
            </a>
            <a
              href={INTERVIEW_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-white/25 px-7 py-4 text-[13px] font-bold uppercase tracking-[0.1em] text-white/85 transition-colors duration-500 ease-snap hover:border-white/70 hover:text-white"
            >
              Solicitar entrevista
            </a>
          </motion.div>

          <motion.dl
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.9, delay: 0.85 }}
            className="mt-14 grid max-w-2xl grid-cols-2 gap-x-6 gap-y-7 border-t border-white/10 pt-8 sm:grid-cols-4"
          >
            {DATOS.map((d, i) => (
              <motion.div
                key={d.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.9 + i * 0.08, ease: SNAP }}
              >
                <dt className="font-display text-3xl font-semibold text-white">{d.valor}</dt>
                <dd className="mt-1 text-[11px] uppercase leading-snug tracking-[0.12em] text-white/45">
                  {d.label}
                </dd>
              </motion.div>
            ))}
          </motion.dl>
        </motion.div>

        {/* Panel visual: entra escalando y se adelanta al scroll un poco más que el texto. */}
        <motion.div
          style={{ y: panelY }}
          initial={{ opacity: 0, scale: reduce ? 1 : 1.06, y: reduce ? 0 : 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1.1, delay: 0.25, ease: SNAP }}
          className="relative hidden lg:block"
        >
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[2rem] border border-white/10 shadow-lift">
            <ImageSlot
              src="/images/hero/hero-principal.jpg"
              alt="Estudiantes de maestría en modalidad virtual"
              label="Imagen principal"
              tone="dark"
              glyph="ISEL"
            />
            <div className="absolute inset-x-0 bottom-0 h-40 bg-isel-deep/80 backdrop-blur-[2px]" />
            <div className="absolute inset-x-0 bottom-0 p-7">
              <p className="font-serif text-2xl italic leading-snug text-white">
                Aprender sin pausar la carrera profesional.
              </p>
              <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-isel-gold">
                Sincrónico + asincrónico
              </p>
            </div>
          </div>

          <div className="absolute -left-8 top-10 hidden rounded-2xl border border-white/10 bg-isel-navy/90 px-5 py-4 shadow-lift backdrop-blur-md xl:block">
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/45">Titulación</p>
            <p className="mt-1 font-display text-lg font-semibold text-white">Maestría UMES</p>
          </div>
        </motion.div>
      </div>

      {!reduce && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3, duration: 0.6 }}
          className="pointer-events-none absolute bottom-8 right-8 z-10 hidden flex-col items-center gap-2 xl:flex"
        >
          <span className="text-[10px] uppercase tracking-[0.24em] text-white/40">Desplázate</span>
          <span className="relative block h-12 w-px overflow-hidden bg-white/15">
            <motion.span
              animate={{ y: ["-100%", "100%"] }}
              transition={{ duration: 1.9, repeat: Infinity, ease: [0.45, 0, 0.55, 1] }}
              className="absolute inset-x-0 top-0 block h-6 bg-isel-gold"
            />
          </span>
        </motion.div>
      )}
    </section>
  );
}
