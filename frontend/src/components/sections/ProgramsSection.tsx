import type { MasterProgram } from "@/types/program";
import { ProgramCard } from "@/components/ui/ProgramCard";
import { RevealOnScroll, SplitHeading, StaggerGroup } from "@/components/ui/RevealOnScroll";

interface ProgramsSectionProps {
  programs: MasterProgram[];
}

/**
 * Retícula asimétrica (bento) en vez de seis tarjetas iguales en fila: dos
 * piezas grandes arriba, tres medianas al centro y una banda ancha al cierre.
 * El ojo recorre la oferta en vez de escanear una tabla, y cada maestría
 * conserva su acento propio.
 *
 * Si la API devuelve más de seis programas, los extra caen en el tamaño
 * mediano — la composición aguanta sin tocar código.
 */
const SPANS = ["lg:col-span-7", "lg:col-span-5", "lg:col-span-4", "lg:col-span-4", "lg:col-span-4", "lg:col-span-12"];

export function ProgramsSection({ programs }: ProgramsSectionProps) {
  return (
    <section id="programas" className="relative overflow-hidden bg-isel-paper px-6 py-24 lg:py-32">
      <div className="grid-lines-ink pointer-events-none absolute inset-0 opacity-60" aria-hidden />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-52 top-24 h-[34rem] w-[34rem] rounded-full bg-isel-emerald/[0.07] blur-[120px]"
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
              <p className="mt-7 max-w-xl text-[15px] leading-relaxed text-isel-ink/60 sm:text-lg">
                Programas de posgrado 100% virtuales para profesionales que quieren especializarse sin pausar su
                carrera. Cada uno con su pensum, su plan de estudios y su propia ruta de inscripción.
              </p>
            </RevealOnScroll>
          </div>

          <RevealOnScroll delay={0.2} className="shrink-0">
            <div className="flex items-start gap-5 border-t-2 border-isel-navy pt-5 lg:border-t-0 lg:border-l-2 lg:pl-6 lg:pt-0">
              <span className="numeral-outline font-display text-[4.5rem] font-bold leading-[0.8] text-isel-navy/50">
                {String(programs.length).padStart(2, "0")}
              </span>
              <p className="max-w-[13rem] pt-1 text-[13px] leading-relaxed text-isel-ink/55">
                Todos duran seis trimestres, se cursan por módulos y llevan tutorías sincrónicas.
              </p>
            </div>
          </RevealOnScroll>
        </div>

        <StaggerGroup
          className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:mt-20 lg:grid-cols-12 lg:gap-7"
          staggerDelay={0.11}
        >
          {programs.map((program, i) => {
            const wide = SPANS[i] === "lg:col-span-12";
            const span = wide ? "sm:col-span-2 lg:col-span-12" : (SPANS[i] ?? "lg:col-span-4");
            return (
              <div key={program.slug} className={`flex ${span}`}>
                <ProgramCard program={program} index={i} variant={wide ? "wide" : "tall"} />
              </div>
            );
          })}
        </StaggerGroup>
      </div>
    </section>
  );
}
