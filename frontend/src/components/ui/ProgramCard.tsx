import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import type { MasterProgram } from "@/types/program";
import { accentFor } from "@/data/accents";
import { ImageSlot } from "./ImageSlot";
import { SNAP } from "./RevealOnScroll";
import { ActionButton } from "./ActionButton";

interface ProgramCardProps {
  program: MasterProgram;
  index: number;
  /** `wide` cambia a composición horizontal (foto a la izquierda). */
  variant?: "tall" | "wide";
  /** Retraso de entrada; la rejilla los reparte de forma irregular. */
  delay?: number;
}

/**
 * Tarjeta de maestría.
 *
 * Cada programa llega con su propio acento (--accent) y lo usa en el numeral
 * gigante, la etiqueta de campo, el velo sobre la foto y el halo de sombra que
 * se enciende al enfocarla.
 *
 * Entrada en dos tiempos: la tarjeta se descubre con cortina mientras la foto
 * arranca ampliada (1.16) y se asienta en su sitio — el mismo gesto de una
 * imagen que "aterriza" en la maqueta, no un fade más. Al pasar el cursor
 * aparece el disco con la flecha sobre la foto, que anuncia que la tarjeta
 * entera es el enlace al detalle; "Inscripción" conserva su propia zona.
 */
export function ProgramCard({ program, index, variant = "tall", delay = 0 }: ProgramCardProps) {
  const reduce = useReducedMotion();
  const { accent, soft, campo } = accentFor(program.slug, index);
  const cuota = program.plan?.costos?.[program.plan.costos.length - 1];
  const num = String(index + 1).padStart(2, "0");
  const wide = variant === "wide";

  return (
    <motion.article
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 56, scale: 0.985 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.16 }}
      transition={{ duration: 1.05, delay, ease: SNAP }}
      style={{ ["--accent" as string]: accent, ["--accent-soft" as string]: soft }}
      className={`group relative flex w-full overflow-hidden rounded-[1.8rem] border border-isel-line bg-white transition-[transform,box-shadow,border-color] duration-700 ease-snap hover:-translate-y-2 hover:border-transparent hover:shadow-accent ${
        wide ? "flex-col md:min-h-[19rem] md:flex-row" : "h-full flex-col"
      }`}
    >
      {/* Filo de color: crece de izquierda a derecha al enfocar la tarjeta. */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 z-30 h-[3px] origin-left scale-x-0 bg-[var(--accent)] transition-transform duration-700 ease-snap group-hover:scale-x-100"
      />

      <div className={`relative overflow-hidden ${wide ? "md:w-[42%]" : ""}`}>
        <motion.div
          initial={reduce ? {} : { scale: 1.06 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true, amount: 0.16 }}
          transition={{ duration: 1.5, delay: delay + 0.1, ease: SNAP }}
          /* En la tarjeta ancha la foto se posiciona absoluta a partir de `md`:
             con `aspect-auto` y altura automática, una imagen real imponía su
             altura intrínseca y estiraba la tarjeta metros hacia abajo (con el
             marcador de "imagen pendiente" no pasaba, porque no tenía tamaño
             propio). Absoluta, la foto se ajusta a la altura de la fila. */
          className={
            wide ? "aspect-[16/10] w-full md:absolute md:inset-0 md:aspect-auto" : "aspect-[16/11] w-full"
          }
        >
          <ImageSlot
            src={program.cardImage}
            alt={program.title}
            label={campo}
            glyph={num}
            className="transition-transform duration-[1100ms] ease-snap group-hover:scale-[1.03]"
          />
        </motion.div>

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

        {/* Disco con la flecha: aparece al enfocar y dice que la tarjeta es el enlace. */}
        <span
          aria-hidden
          className="absolute bottom-5 left-5 z-20 flex h-12 w-12 scale-0 items-center justify-center rounded-full text-lg text-white opacity-0 transition-all duration-500 ease-back group-hover:scale-100 group-hover:opacity-100"
          style={{ backgroundColor: accent }}
        >
          →
        </span>
      </div>

      <div className={`flex flex-1 flex-col p-6 sm:p-7 ${wide ? "md:justify-center md:p-10" : ""}`}>
        <div className="flex items-center gap-3">
          <span className="font-display text-[13px] font-bold tracking-[0.18em] text-[var(--accent)]">{num}</span>
          <span className="h-px flex-1 origin-left bg-isel-line transition-colors duration-700 ease-snap group-hover:bg-[var(--accent)]/40" />
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
          <span className="relative inline-flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.1em] text-isel-navy transition-colors duration-500 ease-snap group-hover:text-[var(--accent)]">
            Ver el programa
            {/* Subrayado que se traza al enfocar la tarjeta. */}
            <span
              aria-hidden
              className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-[var(--accent)] transition-transform duration-500 ease-snap group-hover:scale-x-100"
            />
          </span>

          <ActionButton
            to={`/portal/login?programa=${program.slug}`}
            tone="accent"
            size="sm"
            arrow="none"
            className="relative z-20"
          >
            Inscripción
          </ActionButton>
        </div>
      </div>

      {/* Capa estirada: la tarjeta entera lleva al detalle del programa. */}
      <Link
        to={`/programas/${program.slug}`}
        aria-label={`Ver el programa: ${program.title}`}
        className="absolute inset-0 z-10"
      />
    </motion.article>
  );
}
