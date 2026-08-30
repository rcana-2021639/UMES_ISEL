import { useRef, useState } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { MaskReveal, RevealOnScroll, SplitHeading, SNAP } from "@/components/ui/RevealOnScroll";

const CREDENCIALES = [
  { k: "Área", v: "Coordinación académica" },
  { k: "Enfoque", v: "Innovación educativa" },
  { k: "Ámbito", v: "Educación superior" },
  { k: "Rol", v: "Dirección del ISEL" },
];

/**
 * Dirección académica — tratamiento de revista.
 *
 * El nombre se compone a ancho completo, por encima de todo lo demás, y solo
 * después llegan retrato y reseña: primero quién es, luego el detalle. Debajo,
 * el retrato lleva un foco que sigue al cursor y la frase que resume su
 * trabajo se eleva a cita con un trazo que se dibuja al entrar.
 *
 * Nada de esto inventa contenido: es la misma reseña completa de la página
 * original, reorganizada.
 */
export function AdvisorSection() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [fine] = useState(() => typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches);

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const portraitY = useTransform(scrollYProgress, [0, 1], ["5%", reduce ? "5%" : "-8%"]);

  // Foco sobre el retrato: coordenadas suavizadas para que no se sienta pegado.
  const mx = useMotionValue(50);
  const my = useMotionValue(50);
  const sx = useSpring(mx, { stiffness: 130, damping: 20 });
  const sy = useSpring(my, { stiffness: 130, damping: 20 });
  const spotlight = useMotionTemplate`radial-gradient(circle at ${sx}% ${sy}%, rgba(255,255,255,0.24), transparent 55%)`;

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!fine || reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set(((e.clientX - r.left) / r.width) * 100);
    my.set(((e.clientY - r.top) / r.height) * 100);
  }

  return (
    <section id="direccion" className="relative overflow-hidden bg-white px-6 py-24 lg:py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 top-1/4 h-[32rem] w-[32rem] rounded-full bg-isel-gold/[0.09] blur-[130px]"
      />

      <div ref={ref} className="relative mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <RevealOnScroll y={12}>
            <span className="eyebrow text-isel-gold2">Liderazgo académico</span>
          </RevealOnScroll>
          <RevealOnScroll y={12} delay={0.08}>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-isel-ink/35">Una persona, seis programas</p>
          </RevealOnScroll>
        </div>

        {/* El nombre manda: ancho completo, todo lo demás viene después. */}
        <SplitHeading
          text="Mgtr. Rolando Valdez"
          className="mt-8 font-display text-[clamp(2.6rem,9vw,7rem)] font-semibold leading-[0.88] tracking-ultratight text-isel-navy"
        />

        <RevealOnScroll delay={0.12}>
          <p className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-isel-line pb-10 text-[12px] font-bold uppercase tracking-[0.16em] text-isel-gold2">
            <span className="h-px w-12 bg-isel-gold" />
            Director del Instituto Salesiano de Educación en Línea
          </p>
        </RevealOnScroll>

        <div className="mt-14 grid grid-cols-1 gap-12 lg:grid-cols-[0.78fr_1.22fr] lg:gap-16">
          <div className="relative mx-auto w-full max-w-sm lg:mx-0 lg:max-w-none">
            <span
              aria-hidden
              className="absolute -bottom-6 -left-6 h-full w-full rounded-[1.8rem] border border-isel-gold"
            />
            <MaskReveal>
              <motion.div
                onMouseMove={onMove}
                style={{ y: portraitY }}
                className="relative aspect-[4/5] w-full overflow-hidden rounded-[1.8rem] border border-isel-line bg-isel-paper shadow-card"
              >
                <ImageSlot
                  src="/images/advisor/rolando-valdez.jpg"
                  alt="Mgtr. Rolando Valdez"
                  label="Mgtr. Rolando Valdez"
                  glyph="RV"
                />
                {fine && !reduce && (
                  <motion.span
                    aria-hidden
                    className="pointer-events-none absolute inset-0"
                    style={{ backgroundImage: spotlight }}
                  />
                )}
              </motion.div>
            </MaskReveal>

            <span
              aria-hidden
              className="absolute -left-14 top-10 hidden origin-left -rotate-90 whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.32em] text-isel-ink/30 xl:block"
            >
              Dirección · ISEL
            </span>
          </div>

          <div className="flex flex-col justify-center">
            <MaskReveal delay={0.1} className="relative">
              <p className="font-serif text-[1.9rem] italic leading-[1.22] text-isel-navy sm:text-[2.6rem]">
                “Comprometido con el acompañamiento a jóvenes y la innovación educativa.”
              </p>
              <svg
                aria-hidden
                viewBox="0 0 400 10"
                preserveAspectRatio="none"
                className="mt-3 h-2.5 w-2/3 text-isel-emerald"
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
                  transition={{ duration: 1.1, delay: 0.35, ease: SNAP }}
                />
              </svg>
            </MaskReveal>

            <RevealOnScroll delay={0.2}>
              <p className="mt-10 max-w-2xl text-[15px] leading-relaxed text-isel-ink/70 sm:text-base">
                Educador y administrador con sólida experiencia en coordinación académica, gestión de proyectos y
                docencia en educación superior. Se ha destacado por liderar equipos, diseñar estrategias educativas y
                promover entornos de excelencia mediante una comunicación efectiva y pensamiento analítico.
                Comprometido con el acompañamiento a jóvenes y la innovación educativa, impulsa programas que generan
                impacto significativo en la formación profesional y humana. Actualmente, desempeña funciones
                directivas con una visión orientada al desarrollo institucional y la transformación educativa.
              </p>
            </RevealOnScroll>

            <RevealOnScroll delay={0.26}>
              <dl className="mt-12 grid grid-cols-2 gap-x-8 gap-y-7 border-t border-isel-line pt-8 sm:grid-cols-4">
                {CREDENCIALES.map((c) => (
                  <div key={c.k}>
                    <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-isel-ink/35">{c.k}</dt>
                    <dd className="mt-1.5 text-sm leading-snug text-isel-navy">{c.v}</dd>
                  </div>
                ))}
              </dl>
            </RevealOnScroll>
          </div>
        </div>
      </div>
    </section>
  );
}
