import { SectionHeading } from "@/components/ui/SectionHeading";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { useTilt } from "@/hooks/useTilt";
import { motion } from "framer-motion";

export function AdvisorSection() {
  const { rotateX, rotateY, onMouseMove, onMouseLeave } = useTilt(5);

  return (
    <section id="direccion" className="bg-isel-paper px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <SectionHeading eyebrow="Liderazgo académico" title="Guías académicos" />

        <div className="mt-14 flex flex-col items-center gap-10 lg:flex-row lg:items-stretch">
          <RevealOnScroll className="w-full max-w-xs" style={{ perspective: 1000 }}>
            <motion.div
              onMouseMove={onMouseMove}
              onMouseLeave={onMouseLeave}
              style={{ rotateX, rotateY, transformPerspective: 900 }}
              className="aspect-[4/5] w-full overflow-hidden rounded-2xl border border-isel-line shadow-card"
            >
              <ImageSlot
                src="/images/advisor/rolando-valdez.jpg"
                alt="Mgtr. Rolando Valdez"
                label="Foto — Mgtr. Rolando Valdez"
              />
            </motion.div>
          </RevealOnScroll>

          <RevealOnScroll delay={0.15} className="flex max-w-2xl flex-col justify-center gap-4">
            <div>
              <h3 className="text-2xl font-semibold text-isel-navy">Mgtr. Rolando Valdez</h3>
              <p className="text-sm font-semibold uppercase tracking-wide text-isel-gold2">
                Director del Instituto Salesiano de Educación en Línea
              </p>
            </div>
            <p className="text-base leading-relaxed text-isel-ink/75">
              Educador y administrador con sólida experiencia en coordinación académica, gestión de proyectos y
              docencia en educación superior. Se ha destacado por liderar equipos, diseñar estrategias educativas y
              promover entornos de excelencia mediante una comunicación efectiva y pensamiento analítico. Comprometido
              con el acompañamiento a jóvenes y la innovación educativa, impulsa programas que generan impacto
              significativo en la formación profesional y humana. Actualmente, desempeña funciones directivas con una
              visión orientada al desarrollo institucional y la transformación educativa.
            </p>
          </RevealOnScroll>
        </div>
      </div>
    </section>
  );
}
