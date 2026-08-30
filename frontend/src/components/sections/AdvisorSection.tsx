import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { RevealOnScroll, ScrollHighlightText, SplitHeading, SNAP } from "@/components/ui/RevealOnScroll";

const CREDENCIALES = [
  { k: "Área", v: "Coordinación académica" },
  { k: "Enfoque", v: "Innovación educativa" },
  { k: "Ámbito", v: "Educación superior" },
  { k: "Trayectoria", v: "Gestión de proyectos" },
];

/**
 * Dirección académica.
 *
 * Es el único bloque de la página dedicado a una persona, así que se trata
 * como una portada: un panel oscuro a sangre sobre el fondo claro, con el
 * retrato ocupando su propia columna de arriba abajo y el nombre en blanco
 * sobre negro. El contraste con las bandas claras que lo rodean es lo que lo
 * convierte en un alto en la lectura y no en una tarjeta de equipo más.
 *
 * Coreografía, de fuera hacia dentro:
 *  1. el panel se abre como un telón (clip-path desde arriba, 1.2s);
 *  2. dentro, el retrato se descubre con una cortina de color mientras la
 *     foto, que arranca ampliada, se asienta — y después deriva con el scroll;
 *  3. el nombre entra palabra por palabra y el sello circular empieza a girar;
 *  4. la cita se subraya con un trazo dibujado y la reseña se enciende al
 *     leerla.
 *
 * Sin efectos de cursor: todo depende del scroll, que es lo que la persona ya
 * está haciendo.
 */
export function AdvisorSection() {
  const panelRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  const { scrollYProgress } = useScroll({ target: panelRef, offset: ["start end", "end start"] });
  const photoY = useTransform(scrollYProgress, [0, 1], ["-7%", reduce ? "-7%" : "7%"]);
  const glowY = useTransform(scrollYProgress, [0, 1], ["12%", reduce ? "12%" : "-12%"]);

  return (
    <section id="direccion" className="relative overflow-hidden bg-isel-paper px-6 py-24 lg:py-32">
      <div className="grid-lines-ink pointer-events-none absolute inset-0 opacity-50" aria-hidden />

      <div className="relative mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <RevealOnScroll y={12}>
            <span className="eyebrow text-isel-gold2">Dirección académica</span>
          </RevealOnScroll>
          <RevealOnScroll y={12} delay={0.08}>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-isel-ink/35">
              Instituto Salesiano de Educación en Línea
            </p>
          </RevealOnScroll>
        </div>

        {/* El panel se abre como un telón. */}
        <motion.div
          ref={panelRef}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 40, clipPath: "inset(0% 0% 100% 0%)" }}
          whileInView={{ opacity: 1, y: 0, clipPath: "inset(0% 0% 0% 0%)" }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 1.2, ease: SNAP }}
          className="grain relative mt-10 overflow-hidden rounded-[2rem] bg-isel-deep lg:rounded-[2.5rem]"
        >
          <div className="grid-lines pointer-events-none absolute inset-0 opacity-60" aria-hidden />
          <motion.div
            aria-hidden
            style={{ y: glowY }}
            className="pointer-events-none absolute -right-32 top-0 h-[34rem] w-[34rem] rounded-full bg-isel-emerald/25 blur-[140px]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -left-24 bottom-[-20%] h-[26rem] w-[26rem] rounded-full bg-isel-gold/[0.12] blur-[130px]"
          />

          <div className="relative grid grid-cols-1 lg:grid-cols-[0.86fr_1.14fr]">
            {/* Retrato a sangre: ocupa su columna de arriba abajo. */}
            <div className="relative min-h-[26rem] overflow-hidden lg:min-h-[38rem]">
              <motion.div
                style={{ y: photoY }}
                initial={reduce ? {} : { scale: 1.22 }}
                whileInView={{ scale: 1.12 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 1.7, ease: SNAP }}
                className="absolute inset-0 h-[114%]"
              >
                <ImageSlot
                  src="/images/advisor/rolando-valdez.jpg"
                  alt="Mgtr. Rolando Valdez"
                  label="Mgtr. Rolando Valdez"
                  tone="dark"
                  glyph="RV"
                />
              </motion.div>

              {/* Cortina que descubre el retrato. */}
              {!reduce && (
                <motion.span
                  aria-hidden
                  initial={{ scaleY: 1 }}
                  whileInView={{ scaleY: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 1.1, delay: 0.35, ease: SNAP }}
                  className="absolute inset-0 origin-top bg-isel-emerald"
                />
              )}

              {/* Velo inferior: asegura que el pie se lea sobre cualquier foto. */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-isel-deep/80"
                style={{ maskImage: "linear-gradient(to top, #000 35%, transparent)" }}
              />

              <RevealOnScroll delay={0.7} className="absolute bottom-7 left-7 right-7">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-isel-gold">
                  Director · desde la dirección del ISEL
                </p>
              </RevealOnScroll>
            </div>

            {/* Columna de texto. */}
            <div className="relative px-7 py-12 sm:px-12 lg:py-16 lg:pl-16 lg:pr-14">
              {/* Sello giratorio, montado en el canto entre las dos columnas. */}
              <div className="absolute -top-11 left-7 hidden h-24 w-24 items-center justify-center rounded-full bg-isel-navy shadow-lift ring-1 ring-white/10 lg:-left-12 lg:top-14 lg:flex">
                <svg viewBox="0 0 200 200" className="h-full w-full animate-spin-slow" aria-hidden>
                  <defs>
                    <path id="advisor-seal" d="M100,100 m-68,0 a68,68 0 1,1 136,0 a68,68 0 1,1 -136,0" />
                  </defs>
                  <text className="fill-white/60 text-[18px] font-bold uppercase tracking-[0.24em]">
                    <textPath href="#advisor-seal">Dirección académica · ISEL · UMES ·</textPath>
                  </text>
                </svg>
                <span className="absolute font-display text-lg font-bold text-isel-gold">RV</span>
              </div>

              <RevealOnScroll y={12} delay={0.55}>
                <p className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.18em] text-isel-gold">
                  <span className="h-px w-10 bg-isel-gold" />
                  Director del Instituto
                </p>
              </RevealOnScroll>

              <SplitHeading
                text="Mgtr. Rolando Valdez"
                delay={0.15}
                className="mt-5 font-display text-[clamp(2.4rem,5.6vw,4.4rem)] font-semibold leading-[0.92] tracking-ultratight text-white"
              />

              <div className="relative mt-9 max-w-xl">
                <SplitHeading
                  as="p"
                  delay={0.1}
                  text="“Comprometido con el acompañamiento a jóvenes y la innovación educativa.”"
                  className="font-serif text-[1.6rem] italic leading-[1.25] text-white sm:text-[2.1rem]"
                />
                <svg
                  aria-hidden
                  viewBox="0 0 400 10"
                  preserveAspectRatio="none"
                  className="mt-3 h-2.5 w-1/2 text-isel-gold"
                >
                  <motion.path
                    d="M2 7C70 2 160 1 240 4c50 2 100 3 158 1"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={3}
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    whileInView={{ pathLength: 1 }}
                    viewport={{ once: true, amount: 0.6 }}
                    transition={{ duration: 1.1, delay: 0.5, ease: SNAP }}
                  />
                </svg>
              </div>

              <ScrollHighlightText
                text="Educador y administrador con sólida experiencia en coordinación académica, gestión de proyectos y docencia en educación superior. Se ha destacado por liderar equipos, diseñar estrategias educativas y promover entornos de excelencia mediante una comunicación efectiva y pensamiento analítico. Comprometido con el acompañamiento a jóvenes y la innovación educativa, impulsa programas que generan impacto significativo en la formación profesional y humana. Actualmente, desempeña funciones directivas con una visión orientada al desarrollo institucional y la transformación educativa."
                className="mt-10 max-w-2xl text-[15.5px] leading-[1.8] text-white sm:text-[16.5px]"
                dim={0.28}
              />

              <dl className="mt-12 grid grid-cols-2 gap-x-8 gap-y-8 border-t border-white/10 pt-9 sm:grid-cols-4">
                {CREDENCIALES.map((c, i) => (
                  <motion.div
                    key={c.k}
                    initial={{ opacity: 0, y: 22 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ duration: 0.7, delay: 0.08 + i * 0.09, ease: SNAP }}
                  >
                    <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-isel-gold/70">{c.k}</dt>
                    <dd className="mt-2 text-sm leading-snug text-white/85">{c.v}</dd>
                  </motion.div>
                ))}
              </dl>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
