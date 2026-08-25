import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import type { MasterProgram } from "@/types/program";
import { useTilt } from "@/hooks/useTilt";
import { ImageSlot } from "./ImageSlot";
import { staggerItem } from "./RevealOnScroll";

interface ProgramCardProps {
  program: MasterProgram;
}

/**
 * Program card with a real 3D cursor-tilt (rotateX/rotateY driven by mouse
 * position over the card) — not a global cursor aura, just this element
 * reacting in 3D space. Whole card is a link to the detail ("Información")
 * page, matching the original card + "Información" button structure.
 */
export function ProgramCard({ program }: ProgramCardProps) {
  const { rotateX, rotateY, onMouseMove, onMouseLeave } = useTilt(6);

  return (
    <motion.div variants={staggerItem} className="preserve-3d" style={{ perspective: 1000 }}>
      <motion.div
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        style={{ rotateX, rotateY, transformPerspective: 900 }}
        className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-isel-line bg-white shadow-card transition-shadow duration-300 ease-snap hover:shadow-card-hover"
      >
        <div className="aspect-[4/3] w-full overflow-hidden">
          <ImageSlot
            src={program.cardImage}
            alt={program.title}
            label={`Imagen — ${program.title}`}
            className="transition-transform duration-500 ease-snap group-hover:scale-[1.06]"
          />
        </div>

        <div className="flex flex-1 flex-col gap-3 p-6">
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-isel-gold">
            {program.tagline}
          </span>
          <h3 className="text-lg font-semibold leading-snug text-isel-navy">{program.title}</h3>

          <div className="mt-auto pt-4">
            <Link
              to={`/programas/${program.slug}`}
              className="inline-flex items-center gap-2 text-sm font-semibold text-isel-navy transition-colors duration-300 group-hover:text-isel-gold2"
            >
              Información
              <motion.span aria-hidden animate={{ x: [0, 4, 0] }} transition={{ duration: 1.6, repeat: Infinity }}>
                →
              </motion.span>
            </Link>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
