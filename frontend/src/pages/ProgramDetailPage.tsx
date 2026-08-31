import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { programs as localPrograms } from "@/data/programs";
import { getProgramBySlug } from "@/lib/api";
import type { MasterProgram } from "@/types/program";
import { accentFor } from "@/data/accents";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { ActionButton } from "@/components/ui/ActionButton";
import {
  MaskReveal,
  RevealOnScroll,
  ScrollHighlightText,
  SplitHeading,
  SNAP,
} from "@/components/ui/RevealOnScroll";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

/**
 * Página de una maestría.
 *
 * Lo primero que resuelve es "¿dónde estoy?": una barra fija bajo la
 * navegación repite en todo momento la ruta (Programas › campo › programa),
 * el número de programa sobre el total y —lo importante— un botón de volver
 * grande y siempre a la vista. Antes había un enlace de texto que se perdía
 * al hacer scroll.
 *
 * Después la página cuenta el programa en tres tiempos: la portada oscura
 * teñida con su acento, la descripción (que se enciende al leerla) con el
 * plan fijo al costado, y la ruta de inscripción en tres pasos con las tres
 * acciones reales: Pensum, Entrevista e Inscripción.
 */
export function ProgramDetailPage() {
  const { slug = "" } = useParams();
  const reduce = useReducedMotion();
  const headerRef = useRef<HTMLElement>(null);
  const coverRef = useRef<HTMLDivElement>(null);

  const [program, setProgram] = useState<MasterProgram | undefined>(() =>
    localPrograms.find((p) => p.slug === slug),
  );
  const [notFound, setNotFound] = useState(false);

  // Todos los hooks de scroll viven aquí arriba: por debajo hay un return
  // temprano para el programa inexistente y el orden no puede cambiar.
  const { scrollYProgress: headerProgress } = useScroll({
    target: headerRef,
    offset: ["start start", "end start"],
  });
  const headerY = useTransform(headerProgress, [0, 1], ["0%", reduce ? "0%" : "18%"]);
  const headerFade = useTransform(headerProgress, [0, 0.85], [1, reduce ? 1 : 0.15]);

  const { scrollYProgress: coverProgress } = useScroll({
    target: coverRef,
    offset: ["start end", "end start"],
  });
  const coverY = useTransform(coverProgress, [0, 1], ["-8%", reduce ? "-8%" : "8%"]);

  useEffect(() => {
    window.scrollTo(0, 0);
    let active = true;
    setProgram(localPrograms.find((p) => p.slug === slug));
    setNotFound(false);

    getProgramBySlug(slug).then((p) => {
      if (!active) return;
      if (p) setProgram(p);
      else if (!localPrograms.some((lp) => lp.slug === slug)) setNotFound(true);
    });

    return () => {
      active = false;
    };
  }, [slug]);

  useEffect(() => {
    document.title = program ? `${program.title} | ISEL` : "ISEL | Instituto Salesiano de Educación en Línea";
  }, [program]);

  if (notFound || !program) {
    return (
      <>
        <Navbar />
        <main className="flex min-h-screen items-center justify-center bg-isel-paper px-6 pt-28 text-center">
          <div>
            <h1 className="font-display text-3xl font-semibold text-isel-navy">Programa no encontrado</h1>
            <div className="mt-7">
              <ActionButton to="/#programas" tone="solid">
                Volver a programas
              </ActionButton>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const index = Math.max(
    localPrograms.findIndex((p) => p.slug === program.slug),
    0,
  );
  const total = localPrograms.length;
  const { accent, soft, campo } = accentFor(program.slug, index);
  const num = String(index + 1).padStart(2, "0");
  const otros = localPrograms.filter((p) => p.slug !== program.slug).slice(0, 3);

  // Los tres pasos explican el proceso; las acciones viven una sola vez, en la
  // columna fija. Repetir aquí Pensum/Entrevista/Inscripción era decir lo mismo
  // dos veces en la misma pantalla.
  const pasos = [
    {
      n: "01",
      titulo: "Revisa el pensum",
      texto: "Descarga el plan completo del programa y confirma que los cursos encajan con lo que buscas.",
    },
    {
      n: "02",
      titulo: "Agenda tu entrevista",
      texto: "Un asesor académico resuelve tus dudas de admisión, horarios y costos antes de que decidas.",
    },
    {
      n: "03",
      titulo: "Completa tu inscripción",
      texto: "Entra al portal ISEL con este programa ya seleccionado y llena tu ficha de asignación.",
    },
  ];

  return (
    <div style={{ ["--accent" as string]: accent, ["--accent-soft" as string]: soft }}>
      <Navbar />

      <main className="bg-isel-paper">
        {/* Portada del programa, teñida con su acento. */}
        <header
          ref={headerRef}
          className="grain relative overflow-hidden bg-isel-deep px-6 pb-20 pt-36 lg:pb-24 lg:pt-44"
        >
          <motion.div style={{ y: headerY, opacity: headerFade }} className="absolute inset-0">
            <div className="grid-lines absolute inset-0 opacity-50" aria-hidden />
            <div
              aria-hidden
              className="absolute -right-24 -top-40 h-[22rem] w-[22rem] animate-drift rounded-full blur-[120px] sm:-right-32 sm:h-[38rem] sm:w-[38rem] sm:blur-[140px]"
              style={{ backgroundColor: accent, opacity: 0.24 }}
            />
            <div
              aria-hidden
              className="absolute -left-40 bottom-[-30%] h-[30rem] w-[30rem] animate-drift2 rounded-full bg-isel-emerald/20 blur-[130px]"
            />
          </motion.div>

          <div className="relative mx-auto max-w-6xl">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: SNAP }}
              className="flex flex-wrap items-center gap-3"
            >
              <span
                className="rounded-full px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white"
                style={{ backgroundColor: accent }}
              >
                {campo}
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
                {program.tagline}
              </span>
            </motion.div>

            <div className="mt-8 flex items-start gap-8">
              {/* Numeral de posición: sitúa el programa dentro de la oferta. */}
              <motion.span
                aria-hidden
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.9, delay: 0.15, ease: SNAP }}
                className="numeral-outline hidden shrink-0 font-display text-[7rem] font-bold leading-[0.8] tracking-ultratight text-white/45 lg:block"
              >
                {num}
              </motion.span>

              <div>
                <SplitHeading
                  as="h1"
                  immediate
                  delay={0.12}
                  text={program.title}
                  className="max-w-[20ch] font-display text-[clamp(2.1rem,5vw,3.8rem)] font-semibold leading-[1] tracking-ultratight text-white"
                />
                <motion.p
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.6, ease: SNAP }}
                  className="mt-6 text-[13px] font-semibold uppercase tracking-[0.14em] text-white/45"
                >
                  Programa {num} de {String(total).padStart(2, "0")} · Instituto Salesiano de Educación en Línea
                </motion.p>
              </div>
            </div>

          </div>
        </header>

        {/* Barra de ubicación: siempre visible, con el botón de volver grande. */}
        <div className="sticky top-[5.25rem] z-40 mx-auto -mt-8 w-[calc(100%-2rem)] max-w-6xl sm:-mt-9">
          <div className="flex items-center justify-between gap-4 rounded-full border border-isel-line bg-white/95 py-2 pl-2 pr-3 shadow-card backdrop-blur-xl sm:pr-4">
            <Link
              to="/#programas"
              className="group/back inline-flex shrink-0 items-center gap-2.5 rounded-full bg-isel-navy py-2.5 pl-3 pr-5 text-[12px] font-bold uppercase tracking-[0.1em] text-white transition-colors duration-500 ease-snap hover:bg-[var(--accent)]"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 transition-transform duration-500 ease-snap group-hover/back:-translate-x-1">
                ←
              </span>
              <span className="hidden sm:inline">Volver a programas</span>
              <span className="sm:hidden">Programas</span>
            </Link>

            <p className="hidden min-w-0 flex-1 items-center gap-2 truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-isel-ink/40 md:flex">
              <span className="text-[var(--accent)]">{campo}</span>
              <span aria-hidden>›</span>
              <span className="truncate text-isel-navy">{program.title}</span>
            </p>

            <span className="shrink-0 font-display text-[13px] font-bold tracking-[0.14em] text-isel-ink/45">
              {num}
              <span className="text-isel-ink/25">/{String(total).padStart(2, "0")}</span>
            </span>
          </div>
        </div>

        <section className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-6 pb-16 pt-16 lg:grid-cols-[1.25fr_0.75fr] lg:gap-16 lg:pb-24">
          <div>
            <div ref={coverRef} className="overflow-hidden rounded-[1.8rem] border border-isel-line shadow-card">
              <MaskReveal>
                <motion.div style={{ y: coverY }} className="aspect-[16/9] w-full scale-110">
                  <ImageSlot
                    src={program.detailImage ?? program.cardImage}
                    alt={program.title}
                    label={campo}
                    glyph={num}
                  />
                </motion.div>
              </MaskReveal>
            </div>

            <RevealOnScroll delay={0.08}>
              <span className="eyebrow mt-12 text-[var(--accent)]">Sobre el programa</span>
            </RevealOnScroll>

            {/* Entradilla en grande + resto del texto encendiéndose al leer. */}
            <RevealOnScroll delay={0.12}>
              <p className="mt-6 font-display text-[1.35rem] font-medium leading-[1.35] tracking-tightest text-isel-navy sm:text-[1.6rem]">
                {program.paragraphs[0]}
              </p>
            </RevealOnScroll>

            {program.paragraphs.slice(1).map((paragraph, i) => (
              <ScrollHighlightText
                key={i}
                text={paragraph}
                className="mt-8 text-[16px] leading-[1.75] text-isel-ink sm:text-[17px]"
                dim={0.24}
              />
            ))}
          </div>

          {/* Columna fija: plan de estudios + las tres acciones del programa. */}
          <aside className="lg:sticky lg:top-40 lg:h-fit lg:self-start">
            <RevealOnScroll
              delay={0.06}
              className="overflow-hidden rounded-[1.8rem] border border-isel-line bg-white shadow-card"
            >
              <div className="px-7 py-5" style={{ backgroundColor: soft }}>
                <h2 className="font-display text-lg font-semibold text-isel-navy">Plan de estudios</h2>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
                  {campo} · {num}/{String(total).padStart(2, "0")}
                </p>
              </div>

              <div className="p-7">
                <dl className="flex flex-col gap-5">
                  {[
                    { k: "Duración", v: program.plan.duracion },
                    { k: "Modalidad", v: program.plan.modalidad },
                    { k: "Tutorías", v: program.plan.tutorias },
                  ].map((f) => (
                    <div key={f.k} className="border-l-2 border-[var(--accent)] pl-4">
                      <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-isel-ink/40">{f.k}</dt>
                      <dd className="mt-1 text-sm text-isel-ink/75">{f.v}</dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-7 rounded-2xl bg-isel-paper p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--accent)]">Costos</p>
                  <ul className="mt-3 flex flex-col divide-y divide-isel-line">
                    {program.plan.costos.map((c) => (
                      <li key={c.label} className="flex items-baseline justify-between gap-4 py-2.5 text-sm">
                        <span className="text-isel-ink/65">{c.label}</span>
                        <strong className="font-display text-base font-semibold text-isel-navy">{c.value}</strong>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4 text-[11px] leading-relaxed text-isel-ink/45">{program.plan.notaCostos}</p>
                </div>

                <div className="mt-7 flex flex-col items-start gap-3">
                  {/* Escalera de peso: consultar el pensum es lo ligero,
                      inscribirse es la acción que la página persigue. */}
                  <ActionButton href={program.pensumUrl} tone="outlineLight" full>
                    Pensum
                  </ActionButton>
                  <ActionButton href={program.interviewUrl} tone="solid" full>
                    Entrevista
                  </ActionButton>
                  <ActionButton to={`/portal/login?programa=${program.slug}`} tone="accent" full>
                    Inscripción
                  </ActionButton>
                </div>
              </div>
            </RevealOnScroll>
          </aside>
        </section>

        {/* Ruta de inscripción: los tres pasos reales, en orden. */}
        <section className="relative overflow-hidden bg-isel-navy px-6 py-20 lg:py-28">
          <div className="grid-lines pointer-events-none absolute inset-0 opacity-50" aria-hidden />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-40 top-0 h-[30rem] w-[30rem] animate-drift rounded-full blur-[130px]"
            style={{ backgroundColor: accent, opacity: 0.22 }}
          />

          <div className="relative mx-auto max-w-6xl">
            <RevealOnScroll y={12}>
              <span className="eyebrow text-isel-gold">Cómo se entra</span>
            </RevealOnScroll>
            <SplitHeading
              text="Tu ruta de inscripción, en tres pasos"
              className="mt-5 max-w-2xl font-display text-[clamp(1.9rem,4.2vw,3rem)] font-semibold leading-[1.02] tracking-ultratight text-white"
            />

            {/* Línea de tiempo: los tres números cuelgan de un hilo que se
                traza al entrar. Sin botones — las acciones están arriba. */}
            <div className="relative mt-16">
              <span aria-hidden className="absolute left-6 top-6 hidden h-px w-[calc(100%-3rem)] bg-white/12 md:block" />
              <motion.span
                aria-hidden
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 1.4, ease: SNAP }}
                className="absolute left-6 top-6 hidden h-px w-[calc(100%-3rem)] origin-left md:block"
                style={{ backgroundColor: accent }}
              />

              <ol className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
                {pasos.map((paso, i) => (
                  <motion.li
                    key={paso.n}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ duration: 0.8, delay: 0.25 + i * 0.14, ease: SNAP }}
                    className="relative md:pr-8"
                  >
                    <span
                      className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full font-display text-sm font-bold text-isel-deep ring-8 ring-isel-navy"
                      style={{ backgroundColor: accent }}
                    >
                      {paso.n}
                    </span>
                    <h3 className="mt-7 font-display text-xl font-semibold text-white">{paso.titulo}</h3>
                    <p className="mt-3 max-w-[34ch] text-[14.5px] leading-relaxed text-white/60">{paso.texto}</p>
                  </motion.li>
                ))}
              </ol>
            </div>

            <RevealOnScroll delay={0.2}>
              <div className="mt-14 flex flex-wrap items-center gap-5 border-t border-white/10 pt-9">
                <ActionButton to={`/portal/login?programa=${program.slug}`} tone="light">
                  Comenzar mi inscripción
                </ActionButton>
                <p className="text-[13px] leading-relaxed text-white/45">
                  ¿Prefieres hablarlo antes? Agenda la entrevista desde el panel del programa.
                </p>
              </div>
            </RevealOnScroll>
          </div>
        </section>

        {/* Otras maestrías: salida natural en vez de un callejón sin fondo. */}
        <section className="border-t border-isel-line bg-isel-mist px-6 py-16 lg:py-20">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <span className="eyebrow text-isel-gold2">Otras maestrías</span>
              <Link
                to="/#programas"
                className="group/all inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.1em] text-isel-navy hover:text-[var(--accent)]"
              >
                Ver las {total}
                <span className="transition-transform duration-500 ease-snap group-hover/all:translate-x-1">→</span>
              </Link>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {otros.map((p, i) => {
                const a = accentFor(
                  p.slug,
                  localPrograms.findIndex((lp) => lp.slug === p.slug),
                );
                return (
                  <motion.div
                    key={p.slug}
                    initial={{ opacity: 0, y: 26 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ duration: 0.7, delay: i * 0.09, ease: SNAP }}
                    style={{ ["--accent" as string]: a.accent }}
                  >
                    <Link
                      to={`/programas/${p.slug}`}
                      className="group flex h-full flex-col justify-between gap-6 rounded-2xl border border-isel-line bg-white p-6 transition-all duration-500 ease-snap hover:-translate-y-1 hover:border-[var(--accent)] hover:shadow-card"
                    >
                      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--accent)]">
                        {a.campo}
                      </span>
                      <span className="font-display text-lg font-semibold leading-snug text-isel-navy">
                        {p.title}
                      </span>
                      <span className="inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.1em] text-isel-ink/45 transition-colors group-hover:text-[var(--accent)]">
                        Ver el programa
                        <span className="transition-transform duration-500 ease-snap group-hover:translate-x-1">
                          →
                        </span>
                      </span>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
