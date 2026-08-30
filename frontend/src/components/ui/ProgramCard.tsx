import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import type { MasterProgram } from "@/types/program";
import { accentFor } from "@/data/accents";
import { ImageSlot } from "./ImageSlot";
import { staggerCard } from "./RevealOnScroll";

interface ProgramCardProps {
  program: MasterProgram;
  index: number;
  /** `wide` cambia a composición horizontal (foto a la izquierda). */
  variant?: "tall" | "wide";
}

/**
 * Tarjeta de maestría.
 *
 * Cada programa llega con su propio acento (--accent) y lo usa en el numeral
 * gigante, la etiqueta de campo, el velo sobre la foto y el halo de sombra que
 * se enciende al enfocarla. Es lo que impide que seis tarjetas verdes se lean
 * como una sola mancha.
 *
 * Toda la tarjeta es el enlace a "Información" (capa estirada), y encima queda
 * "Inscripción" con su propia zona de clic — dos acciones reales, un solo
 * bloque. El anillo del cursor muestra "Ver" al pasar por encima.
 */
export function ProgramCard({ program, index, variant = "tall" }: ProgramCardProps) {
  const { accent, soft, campo } = accentFor(program.slug, index);
  const cuota = program.plan?.costos?.[program.plan.costos.length - 1];
  const num = String(index + 1).padStart(2, "0");
  const wide = variant === "wide";

  return (
    <motion.article
      variants={staggerCard}
      data-cursor="Ver"
      style={{ ["--accent" as string]: accent, ["--accent-soft" as string]: soft }}
      className={`group relative flex overflow-hidden rounded-[1.8rem] border border-isel-line bg-white transition-[transform,box-shadow,border-color] duration-700 ease-snap hover:-translate-y-2 hover:border-transparent hover:shadow-accent ${
        wide ? "flex-col md:flex-row" : "h-full flex-col"
      }`}
    >
      {/* Filo de color: crece de izquierda a derecha al enfocar la tarjeta. */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 z-30 h-[3px] origin-left scale-x-0 bg-[var(--accent)] transition-transform duration-700 ease-snap group-hover:scale-x-100"
      />

      <div className={`relative overflow-hidden ${wide ? "md:w-[42%]" : ""}`}>
        <div className={wide ? "aspect-[16/10] h-full w-full md:aspect-auto md:min-h-[19rem]" : "aspect-[16/11] w-full"}>
          <ImageSlot
            src={program.cardImage}
            alt={program.title}
            label={campo}
            glyph={num}
            className="transition-transform duration-[1100ms] ease-snap group-hover:scale-[1.08]"
          />
        </div>

        {/* Velo del color del programa: se retira al pasar el cursor. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.16] mix-blend-multiply transition-opacity duration-700 ease-snap group-hover:opacity-0"
          style={{ backgroundColor: accent }}
        />

        <span className="absolute left-5 top-5 z-20 inline-flex items-center gap-2 rounded-full bg-white/95 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--accent)] shadow-sm backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
          {campo}
        </span>

        {/* Numeral gigante en contorno: peso visual sin peso de tinta. */}
        <span
          aria-hidden
          className="numeral-outline pointer-events-none absolute -bottom-5 right-4 z-20 font-display text-[5.5rem] font-bold leading-none text-white/70 transition-transform duration-700 ease-snap group-hover:-translate-y-1"
        >
          {num}
        </span>
      </div>

      <div className={`flex flex-1 flex-col p-6 sm:p-7 ${wide ? "md:justify-center md:p-10" : ""}`}>
        <div className="flex items-center gap-3">
          <span className="font-display text-[13px] font-bold tracking-[0.18em] text-[var(--accent)]">{num}</span>
          <span className="h-px flex-1 bg-isel-line transition-colors duration-700 ease-snap group-hover:bg-[var(--accent)]/40" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-isel-ink/35">
            {program.tagline}
          </span>
        </div>

        <h3
          className={`mt-4 font-display font-semibold leading-[1.12] tracking-tightest text-isel-navy ${
            wide ? "text-[1.7rem] sm:text-[2.1rem]" : "text-[1.4rem]"
          }`}
        >
          {program.title}
        </h3>

        {program.plan && (
          <dl className={`mt-5 flex flex-wrap gap-x-7 gap-y-2 text-[12.5px] text-isel-ink/55 ${wide ? "md:mt-6" : ""}`}>
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

        <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-3 pt-8">
          <span className="inline-flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.1em] text-isel-navy transition-colors duration-500 ease-snap group-hover:text-[var(--accent)]">
            Información
            <span
              aria-hidden
              className="inline-block transition-transform duration-500 ease-snap group-hover:translate-x-1.5"
            >
              →
            </span>
          </span>

          <Link
            to={`/portal/login?programa=${program.slug}`}
            data-cursor="Inscribirse"
            className="group/ins relative z-20 inline-flex items-center gap-2 overflow-hidden rounded-full bg-[var(--accent-soft)] px-4 py-2 text-[12px] font-bold uppercase tracking-[0.08em] text-[var(--accent)] transition-colors duration-500 ease-snap hover:text-white"
          >
            <span
              aria-hidden
              className="absolute inset-0 origin-bottom scale-y-0 bg-[var(--accent)] transition-transform duration-500 ease-snap group-hover/ins:scale-y-100"
            />
            <span className="relative">Inscripción</span>
          </Link>
        </div>
      </div>

      {/* Capa estirada: la tarjeta entera lleva al detalle del programa. */}
      <Link
        to={`/programas/${program.slug}`}
        aria-label={`Información sobre ${program.title}`}
        className="absolute inset-0 z-10"
      />
    </motion.article>
  );
}
