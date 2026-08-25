import { motion } from "framer-motion";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { StaggerGroup, staggerItem } from "@/components/ui/RevealOnScroll";

const OBJECTIVES = [
  {
    title: "Fortalecer y Expandir",
    text: "Fortalecer y expandir la oferta educativa virtual del Instituto Salesiano de Educación en Línea (ISEL), garantizando la calidad, accesibilidad e innovación andragógica en los programas de estudios.",
  },
  {
    title: "Implementar Nuevas Tecnologías",
    text: "Implementar nuevas tecnologías y metodologías andragógicas para la creación y actualización de programas de estudio en línea, asegurando su pertinencia y calidad académica.",
  },
  {
    title: "Diseñar e Implementar",
    text: "Diseñar e implementar programas de estudios innovadores y pertinentes que respondan a las demandas del mercado laboral y las necesidades de la sociedad.",
  },
  {
    title: "Capacitar a Docentes y Administradores",
    text: "Ofrecer programas de capacitación continua para docentes y administradores en el uso de herramientas digitales, técnicas de enseñanza en línea y gestión de plataformas educativas.",
  },
];

export function ObjectivesSection() {
  return (
    <section id="objetivos" className="bg-isel-navy px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <SectionHeading eyebrow="Hacia dónde vamos" title="Objetivos" tone="dark" />

        <StaggerGroup className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2" staggerDelay={0.12}>
          {OBJECTIVES.map((item, i) => (
            <motion.div
              key={item.title}
              variants={staggerItem}
              whileHover={{ x: 6 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              className="flex gap-5 rounded-2xl border border-white/10 bg-white/[0.04] p-7 transition-colors duration-300 hover:border-isel-gold/50 hover:bg-white/[0.07]"
            >
              <span className="font-display text-3xl font-semibold text-isel-gold/80">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="flex flex-col gap-2">
                <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                <p className="text-sm leading-relaxed text-white/65">{item.text}</p>
              </div>
            </motion.div>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}
