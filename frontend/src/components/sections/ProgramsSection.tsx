import type { MasterProgram } from "@/types/program";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ProgramCard } from "@/components/ui/ProgramCard";
import { StaggerGroup } from "@/components/ui/RevealOnScroll";

interface ProgramsSectionProps {
  programs: MasterProgram[];
}

export function ProgramsSection({ programs }: ProgramsSectionProps) {
  return (
    <section id="programas" className="bg-isel-paper px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Oferta académica"
          title="Programas"
          description="Maestrías 100% en línea, diseñadas para profesionales que buscan especializarse sin pausar su carrera."
        />

        <StaggerGroup className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {programs.map((program) => (
            <ProgramCard key={program.slug} program={program} />
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}
