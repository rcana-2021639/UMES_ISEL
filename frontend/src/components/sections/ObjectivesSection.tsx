import { motion } from "framer-motion";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { RevealOnScroll, SNAP } from "@/components/ui/RevealOnScroll";

const OBJECTIVES = [
  {
    title: "Fortalecer y expandir",
    accent: "#12855C",
    text: "Fortalecer y expandir la oferta educativa virtual del Instituto Salesiano de Educación en Línea (ISEL), garantizando la calidad, accesibilidad e innovación andragógica en los programas de estudios.",
  },
  {
    title: "Implementar nuevas tecnologías",
    accent: "#3F51B5",
    text: "Implementar nuevas tecnologías y metodologías andragógicas para la creación y actualización de programas de estudio en línea, asegurando su pertinencia y calidad académica.",
  },
  {
    title: "Diseñar e implementar",
    accent: "#B8791F",
    text: "Diseñar e implementar programas de estudios innovadores y pertinentes que respondan a las demandas del mercado laboral y las necesidades de la sociedad.",
  },
  {
    title: "Capacitar a docentes y administradores",
    accent: "#6A4BA6",
    text: "Ofrecer programas de capacitación continua para docentes y administradores en el uso de herramientas digitales, técnicas de enseñanza en línea y gestión de plataformas educativas.",
  },
];

/**
 * Objetivos como índice editorial, no como cuatro cajas iguales: filas
 * separadas por hairlines, numeración grande y un color propio por objetivo
 * que solo aparece al posar el cursor. La sección va en claro para cortar la
 * banda oscura de Metodología y que la página respire por contraste.
 */
export function ObjectivesSection() {
  return (
    <section id="objetivos" className="bg-isel-mist px-6 py-24 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Hacia dónde vamos"
          title="Objetivos del Instituto"
          description="Cuatro compromisos que ordenan el trabajo académico del ISEL y su plan de crecimiento."
        />

        <div className="mt-16 border-t border-isel-navy/12">
          {OBJECTIVES.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 26 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.7, delay: i * 0.06, ease: SNAP }}
              style={{ ["--accent" as string]: item.accent }}
              className="group relative border-b border-isel-navy/12"
            >
              {/* Relleno de color que barre la fila de izquierda a derecha. */}
              <span
                aria-hidden
                className="absolute inset-0 origin-left scale-x-0 bg-[var(--accent)] opacity-[0.05] transition-transform duration-700 ease-snap group-hover:scale-x-100"
              />
              <div className="relative grid grid-cols-1 gap-4 py-8 md:grid-cols-[auto_1fr_1.3fr] md:items-baseline md:gap-10 md:py-10">
                <span className="font-display text-sm font-bold tracking-[0.2em] text-isel-navy/35 transition-colors duration-500 ease-snap group-hover:text-[var(--accent)]">
                  0{i + 1}
                </span>
                <h3 className="font-display text-2xl font-semibold leading-tight text-isel-navy sm:text-[1.7rem]">
                  {item.title}
                </h3>
                <p className="text-[15px] leading-relaxed text-isel-ink/65">{item.text}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <RevealOnScroll delay={0.1}>
          <p className="mt-10 max-w-2xl font-serif text-xl italic leading-snug text-isel-navy/70">
            Calidad, accesibilidad e innovación andragógica: los tres criterios con los que el ISEL mide cada
            programa que abre.
          </p>
        </RevealOnScroll>
      </div>
    </section>
  );
}
