import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { RevealOnScroll, SplitHeading } from "@/components/ui/RevealOnScroll";

/**
 * Dirección académica. Tratamiento editorial —retrato a la izquierda con un
 * marco desplazado en ámbar, cita destacada en serif y la reseña completa— en
 * lugar de la típica "tarjeta de equipo". El retrato se desplaza muy poco con
 * el scroll (parallax de 8%) para que la columna respire sin marear.
 */
export function AdvisorSection() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const portraitY = useTransform(scrollYProgress, [0, 1], ["4%", reduce ? "4%" : "-8%"]);

  return (
    <section id="direccion" className="bg-white px-6 py-24 lg:py-32">
      <div ref={ref} className="relative mx-auto max-w-7xl">
        <span className="eyebrow text-isel-gold2">Liderazgo académico</span>

        <div className="mt-12 grid grid-cols-1 gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div className="relative mx-auto w-full max-w-sm lg:mx-0">
            <span
              aria-hidden
              className="absolute -bottom-5 -left-5 h-full w-full rounded-[1.6rem] border border-isel-gold"
            />
            <motion.div
              style={{ y: portraitY }}
              className="relative aspect-[4/5] w-full overflow-hidden rounded-[1.6rem] border border-isel-line bg-isel-paper shadow-card"
            >
              <ImageSlot
                src="/images/advisor/rolando-valdez.jpg"
                alt="Mgtr. Rolando Valdez"
                label="Mgtr. Rolando Valdez"
                glyph="RV"
              />
            </motion.div>
          </div>

          <div className="flex flex-col justify-center">
            <SplitHeading
              text="Mgtr. Rolando Valdez"
              className="font-display text-[clamp(2rem,4.4vw,3.2rem)] font-semibold leading-[1.03] text-isel-navy"
            />

            <RevealOnScroll delay={0.1}>
              <p className="mt-4 text-[13px] font-bold uppercase tracking-[0.14em] text-isel-gold2">
                Director del Instituto Salesiano de Educación en Línea
              </p>
            </RevealOnScroll>

            <RevealOnScroll delay={0.16}>
              <p className="mt-9 border-l-2 border-isel-emerald pl-6 font-serif text-[1.6rem] italic leading-snug text-isel-navy sm:text-[1.9rem]">
                Comprometido con el acompañamiento a jóvenes y la innovación educativa.
              </p>
            </RevealOnScroll>

            <RevealOnScroll delay={0.22}>
              <p className="mt-8 max-w-2xl text-[15px] leading-relaxed text-isel-ink/70 sm:text-base">
                Educador y administrador con sólida experiencia en coordinación académica, gestión de proyectos y
                docencia en educación superior. Se ha destacado por liderar equipos, diseñar estrategias educativas y
                promover entornos de excelencia mediante una comunicación efectiva y pensamiento analítico.
                Comprometido con el acompañamiento a jóvenes y la innovación educativa, impulsa programas que generan
                impacto significativo en la formación profesional y humana. Actualmente, desempeña funciones
                directivas con una visión orientada al desarrollo institucional y la transformación educativa.
              </p>
            </RevealOnScroll>

            <RevealOnScroll delay={0.28}>
              <dl className="mt-10 grid max-w-lg grid-cols-2 gap-6 border-t border-isel-line pt-8">
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-isel-ink/40">Área</dt>
                  <dd className="mt-1 text-sm text-isel-navy">Coordinación académica</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-isel-ink/40">Enfoque</dt>
                  <dd className="mt-1 text-sm text-isel-navy">Innovación educativa</dd>
                </div>
              </dl>
            </RevealOnScroll>
          </div>
        </div>
      </div>
    </section>
  );
}
