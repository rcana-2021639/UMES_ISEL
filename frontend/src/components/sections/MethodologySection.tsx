import { motion } from "framer-motion";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { StaggerGroup, staggerItem } from "@/components/ui/RevealOnScroll";

const ITEMS = [
  {
    key: "sincronicas",
    title: "Sesiones sincrónicas",
    image: "/images/methodology/sesiones-sincronicas.jpg",
    text: "Se llevarán a cabo a través de videoconferencias quincenales. Estas sesiones permitirán la interacción en tiempo real entre los docentes y los estudiantes, facilitando la explicación de contenidos, la discusión de temas y la resolución de dudas. Se grabarán para que puedan ser consultadas posteriormente por quienes no puedan asistir en vivo.",
  },
  {
    key: "asincronico",
    title: "Trabajo asincrónico",
    image: "/images/methodology/trabajo-asincronico.jpg",
    text: "Las actividades asincrónicas incluirán tareas, lecturas, discusiones en foros y proyectos colaborativos. Los estudiantes tendrán acceso a los recursos de aprendizaje en cualquier momento, gestionando su tiempo de estudio según sus necesidades y disponibilidad.",
  },
  {
    key: "tutoria",
    title: "Tutoría",
    image: "/images/methodology/tutoria.jpg",
    text: "Cada curso incluye un componente de tutorización. Los tutores estarán disponibles para consultas a través de los correos institucionales y foros. Además, se organizan sesiones de tutoría en vivo mediante videoconferencias, con apoyo continuo y personalizado.",
  },
];

export function MethodologySection() {
  return (
    <section id="metodologia" className="bg-white px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Cómo se estudia"
          title="Metodología"
          description="Los programas se imparten completamente en modalidad virtual, combinando sesiones sincrónicas y actividades asincrónicas para asegurar una formación flexible."
        />

        <StaggerGroup className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-3" staggerDelay={0.15}>
          {ITEMS.map((item) => (
            <motion.div
              key={item.key}
              variants={staggerItem}
              whileHover={{ y: -6 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="flex flex-col overflow-hidden rounded-2xl border border-isel-line bg-isel-paper shadow-card transition-shadow duration-300 hover:shadow-card-hover"
            >
              <div className="aspect-[16/10] w-full">
                <ImageSlot src={item.image} alt={item.title} label={`Imagen — ${item.title}`} />
              </div>
              <div className="flex flex-col gap-3 p-7">
                <h3 className="text-xl font-semibold text-isel-navy">{item.title}</h3>
                <p className="text-sm leading-relaxed text-isel-ink/70">{item.text}</p>
              </div>
            </motion.div>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}
