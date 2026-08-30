import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import type { MasterProgram } from "@/types/program";
import { accentFor } from "@/data/accents";
import { ImageSlot } from "./ImageSlot";
import { staggerItem } from "./RevealOnScroll";

interface ProgramCardProps {
  program: MasterProgram;
  index: number;
}

/**
 * Tarjeta de maestría.
 *
 * Cada programa llega con su propio acento (--accent) y lo usa en el número
 * de índice, la etiqueta de campo y el filo superior que se dibuja al pasar
 * el cursor. Es lo que evita que seis tarjetas verdes se lean como una sola
 * mancha.
 *
 * Dos acciones, las dos reales: "Información" abre el detalle del programa e
 * "Inscripción" entra al flujo del portal con el programa preseleccionado.
 */
export function ProgramCard({ program, index }: ProgramCardProps) {
  const { accent, soft, campo } = accentFor(program.slug, index);
  const cuota = program.plan?.costos?.[program.plan.costos.length - 1];

  return (
    <motion.article
      variants={staggerItem}
      style={{ ["--accent" as string]: accent, ["--accent-soft" as string]: soft }}
      className="group relative flex h-full flex-col overflow-hidden rounded-[1.6rem] border border-isel-line bg-white shadow-card transition-[box-shadow,transform,border-color] duration-500 ease-snap hover:-translate-y-1.5 hover:border-[var(--accent)] hover:shadow-card-hover"
    >
      {/* Filo de color: crece de izquierda a derecha al enfocar la tarjeta. */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 z-20 h-[3px] origin-left scale-x-0 bg-[var(--accent)] transition-transform duration-700 ease-snap group-hover:scale-x-100"
      />

      <div className="relative aspect-[16/11] w-full overflow-hidden">
        <ImageSlot
          src={program.cardImage}
          alt={program.title}
          label={campo}
          glyph={String(index + 1).padStart(2, "0")}
          className="transition-transform duration-[900ms] ease-snap group-hover:scale-[1.07]"
        />
        <span className="absolute left-5 top-5 z-10 rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--accent)] shadow-sm">
          {campo}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-6 sm:p-7">
        <div className="flex items-baseline gap-3">
          <span className="font-display text-sm font-bold tracking-widest text-[var(--accent)]">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="h-px flex-1 bg-isel-line" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-isel-ink/40">
            {program.tagline}
          </span>
        </div>

        <h3 className="mt-4 font-display text-[1.35rem] font-semibold leading-[1.15] text-isel-navy">
          {program.title}
        </h3>

        {program.plan && (
          <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-[12px] text-isel-ink/55">
            <div>
              <dt className="sr-only">Duración</dt>
              <dd>{program.plan.duracion}</dd>
            </div>
            {cuota && (
              <div>
                <dt className="sr-only">{cuota.label}</dt>
                <dd>
                  {cuota.label}: <strong className="font-semibold text-isel-navy">{cuota.value}</strong>
                </dd>
              </div>
            )}
          </dl>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-3 pt-7">
          <Link
            to={`/programas/${program.slug}`}
            className="inline-flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.1em] text-isel-navy transition-colors duration-300 ease-snap hover:text-[var(--accent)]"
          >
            Información
            <span aria-hidden className="transition-transform duration-500 ease-snap group-hover:translate-x-1.5">
              →
            </span>
          </Link>
          <Link
            to={`/portal/login?programa=${program.slug}`}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-soft)] px-4 py-2 text-[12px] font-bold uppercase tracking-[0.08em] text-[var(--accent)] transition-colors duration-500 ease-snap hover:bg-[var(--accent)] hover:text-white"
          >
            Inscripción
          </Link>
        </div>
      </div>
    </motion.article>
  );
}
