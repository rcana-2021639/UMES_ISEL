import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { RevealOnScroll, ScrollHighlightText, SplitHeading, SNAP } from "@/components/ui/RevealOnScroll";

const CREDENCIALES = [
  { k: "Área", v: "Coordinación académica" },
  { k: "Enfoque", v: "Innovación educativa" },
  { k: "Ámbito", v: "Educación superior" },
  { k: "Rol", v: "Dirección del ISEL" },
];

/**
 * Dirección académica.
 *
 * Tres gestos, ninguno dependiente del cursor:
 *
 * 1. El nombre se compone en dos capas —una llena y una en contorno detrás—
 *    que se separan con el scroll. La tipografía se convierte en el objeto
 *    con profundidad de la sección, en vez de una foto inclinándose.
 * 2. El retrato se descubre con una cortina de color que sube mientras la
 *    imagen, que arranca ampliada, se asienta. Es el gesto de un impreso al
 *    destaparse; después la foto sigue derivando dentro de su marco con el
 *    scroll (parallax real, no un truco de hover).
 * 3. Un sello circular gira despacio junto al retrato — el detalle pequeño
 *    que fija la identidad de la sección.
 *
 * La reseña completa se enciende palabra a palabra al leerla, igual que en
 * metodología: es el texto más largo de la página y merece que apetezca.
 */
export function AdvisorSection() {
  const ref = useRef<HTMLDivElement>(null);
  const portraitRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const { scrollYProgress: portraitProgress } = useScroll({
    target: portraitRef,
    offset: ["start end", "end start"],
  });

  // Las dos capas del nombre se separan: el contorno viaja el doble.
  const nameFillY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -26]);
  const nameOutlineY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 34]);
  const nameOutlineX = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 18]);
  // La foto deriva dentro de su marco (se recorta, así que nunca deja hueco).
  const photoY = useTransform(portraitProgress, [0, 1], ["-6%", reduce ? "-6%" : "6%"]);

  return (
    <section id="direccion" className="relative overflow-hidden bg-white px-6 py-24 lg:py-32">
      <div className="grid-lines-ink pointer-events-none absolute inset-0 opacity-40" aria-hidden />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 top-1/4 h-[34rem] w-[34rem] rounded-full bg-isel-gold/[0.10] blur-[130px]"
      />

      <div ref={ref} className="relative mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <RevealOnScroll y={12}>
            <span className="eyebrow text-isel-gold2">Liderazgo académico</span>
          </RevealOnScroll>
          <RevealOnScroll y={12} delay={0.08}>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-isel-ink/35">
              Una persona, seis programas
            </p>
          </RevealOnScroll>
        </div>

        {/* Nombre en dos capas: la de contorno queda detrás y se desplaza más. */}
        <div className="relative mt-8">
          <motion.span
            aria-hidden
            style={{ y: nameOutlineY, x: nameOutlineX }}
            className="numeral-outline pointer-events-none absolute inset-0 select-none font-display text-[clamp(2.6rem,9vw,7rem)] font-semibold leading-[0.88] tracking-ultratight text-isel-emerald/35"
          >
            Mgtr. Rolando Valdez
          </motion.span>
          <motion.div style={{ y: nameFillY }} className="relative">
            <SplitHeading
              text="Mgtr. Rolando Valdez"
              className="font-display text-[clamp(2.6rem,9vw,7rem)] font-semibold leading-[0.88] tracking-ultratight text-isel-navy"
            />
          </motion.div>
        </div>

        <RevealOnScroll delay={0.12}>
          <p className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-isel-line pb-10 text-[12px] font-bold uppercase tracking-[0.16em] text-isel-gold2">
            <span className="h-px w-12 bg-isel-gold" />
            Director del Instituto Salesiano de Educación en Línea
          </p>
        </RevealOnScroll>

        <div className="mt-14 grid grid-cols-1 gap-14 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div ref={portraitRef} className="relative mx-auto w-full max-w-sm lg:mx-0 lg:max-w-none">
            <span
              aria-hidden
              className="absolute -bottom-6 -left-6 h-full w-full rounded-[1.8rem] border border-isel-gold"
            />

            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[1.8rem] border border-isel-line bg-isel-paper shadow-card">
              {/* La foto arranca ampliada y se asienta; luego deriva con el scroll. */}
              <motion.div
                style={{ y: photoY }}
                initial={reduce ? {} : { scale: 1.24 }}
                whileInView={{ scale: 1.12 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 1.6, ease: SNAP }}
                className="h-[112%] w-full"
              >
                <ImageSlot
                  src="/images/advisor/rolando-valdez.jpg"
                  alt="Mgtr. Rolando Valdez"
                  label="Mgtr. Rolando Valdez"
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
                  transition={{ duration: 1.05, ease: SNAP }}
                  className="absolute inset-0 origin-top bg-isel-emerald"
                />
              )}
            </div>

            {/* Sello giratorio: el detalle pequeño que identifica la sección. */}
            <div className="absolute -right-5 -top-8 hidden h-28 w-28 items-center justify-center rounded-full bg-isel-navy shadow-lift sm:flex">
              <svg viewBox="0 0 200 200" className="h-full w-full animate-spin-slow" aria-hidden>
                <defs>
                  <path id="advisor-seal" d="M100,100 m-68,0 a68,68 0 1,1 136,0 a68,68 0 1,1 -136,0" />
                </defs>
                <text className="fill-white/70 text-[19px] font-bold uppercase tracking-[0.22em]">
                  <textPath href="#advisor-seal">Dirección académica · ISEL · UMES ·</textPath>
                </text>
              </svg>
              <span className="absolute font-display text-xl font-bold text-isel-gold">RV</span>
            </div>
          </div>

          <div className="flex flex-col justify-center">
            <SplitHeading
              text="“Comprometido con el acompañamiento a jóvenes y la innovación educativa.”"
              className="font-serif text-[1.9rem] italic leading-[1.22] text-isel-navy sm:text-[2.6rem]"
            />

            <svg
              aria-hidden
              viewBox="0 0 400 10"
              preserveAspectRatio="none"
              className="mt-4 h-2.5 w-2/3 text-isel-emerald"
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
                transition={{ duration: 1.1, delay: 0.4, ease: SNAP }}
              />
            </svg>

            <ScrollHighlightText
              text="Educador y administrador con sólida experiencia en coordinación académica, gestión de proyectos y docencia en educación superior. Se ha destacado por liderar equipos, diseñar estrategias educativas y promover entornos de excelencia mediante una comunicación efectiva y pensamiento analítico. Comprometido con el acompañamiento a jóvenes y la innovación educativa, impulsa programas que generan impacto significativo en la formación profesional y humana. Actualmente, desempeña funciones directivas con una visión orientada al desarrollo institucional y la transformación educativa."
              className="mt-10 max-w-2xl text-[16px] leading-[1.75] text-isel-ink sm:text-[17px]"
              dim={0.2}
            />

            <dl className="mt-12 grid grid-cols-2 gap-x-8 gap-y-7 border-t border-isel-line pt-8 sm:grid-cols-4">
              {CREDENCIALES.map((c, i) => (
                <motion.div
                  key={c.k}
                  initial={{ opacity: 0, y: 22 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ duration: 0.7, delay: 0.06 + i * 0.08, ease: SNAP }}
                  className="border-l border-isel-line pl-4"
                >
                  <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-isel-ink/35">{c.k}</dt>
                  <dd className="mt-1.5 text-sm leading-snug text-isel-navy">{c.v}</dd>
                </motion.div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
