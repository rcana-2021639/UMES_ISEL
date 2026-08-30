import type { MasterProgram } from "@/types/program";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ProgramCard } from "@/components/ui/ProgramCard";
import { RevealOnScroll, StaggerGroup } from "@/components/ui/RevealOnScroll";

interface ProgramsSectionProps {
  programs: MasterProgram[];
}

/**
 * Oferta académica. Las seis maestrías del ISEL, cada una con su acento
 * cromático (ver src/data/accents.ts) para que el catálogo se lea como seis
 * caminos distintos y no como una lista repetida.
 */
export function ProgramsSection({ programs }: ProgramsSectionProps) {
  return (
    <section id="programas" className="relative bg-isel-paper px-6 py-24 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <SectionHeading
            eyebrow="Oferta académica"
            title="Seis maestrías, un solo campus en línea"
            description="Programas de posgrado 100% virtuales para profesionales que quieren especializarse sin pausar su carrera."
          />
          <RevealOnScroll delay={0.15} className="shrink-0">
            <p className="max-w-[16rem] border-l-2 border-isel-gold pl-5 text-[13px] leading-relaxed text-isel-ink/55">
              Todos los programas duran seis trimestres y se cursan por módulos, con tutorías sincrónicas.
            </p>
          </RevealOnScroll>
        </div>

        <StaggerGroup
          className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:mt-20 lg:grid-cols-3 lg:gap-8"
          staggerDelay={0.08}
        >
          {programs.map((program, i) => (
            <ProgramCard key={program.slug} program={program} index={i} />
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}
