import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { programs as localPrograms } from "@/data/programs";
import { getProgramBySlug } from "@/lib/api";
import type { MasterProgram } from "@/types/program";
import { accentFor } from "@/data/accents";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { RevealOnScroll, SplitHeading } from "@/components/ui/RevealOnScroll";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

/**
 * Página "Información" de una maestría.
 *
 * Mantiene el contenido del detalle original (descripción + plan de estudios)
 * y las tres acciones —Pensum, Entrevista e Inscripción—, esta última entrando
 * al portal con el programa ya seleccionado.
 *
 * Toda la página se tiñe con el acento del programa: cabecera, viñetas del
 * plan y botón de pensum. Entrar a dos maestrías distintas se siente distinto,
 * aunque la plantilla sea la misma.
 */
export function ProgramDetailPage() {
  const { slug = "" } = useParams();
  const [program, setProgram] = useState<MasterProgram | undefined>(() =>
    localPrograms.find((p) => p.slug === slug),
  );
  const [notFound, setNotFound] = useState(false);

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
            <Link
              to="/#programas"
              className="mt-5 inline-block text-sm font-bold uppercase tracking-[0.1em] text-isel-emerald hover:underline"
            >
              ← Volver a programas
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const index = localPrograms.findIndex((p) => p.slug === program.slug);
  const { accent, soft, campo } = accentFor(program.slug, Math.max(index, 0));
  const otros = localPrograms.filter((p) => p.slug !== program.slug).slice(0, 3);

  return (
    <div style={{ ["--accent" as string]: accent, ["--accent-soft" as string]: soft }}>
      <Navbar />

      <main className="bg-isel-paper">
        {/* Cabecera oscura teñida con el acento del programa. */}
        <header className="grain relative overflow-hidden bg-isel-deep px-6 pb-16 pt-36 lg:pb-20 lg:pt-44">
          <div className="grid-lines pointer-events-none absolute inset-0 opacity-50" aria-hidden />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-32 -top-32 h-[34rem] w-[34rem] animate-drift rounded-full blur-[130px]"
            style={{ backgroundColor: accent, opacity: 0.28 }}
          />

          <div className="relative mx-auto max-w-6xl">
            <Link
              to="/#programas"
              className="inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em] text-white/50 transition-colors duration-300 hover:text-white"
            >
              ← Volver a programas
            </Link>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <span
                className="rounded-full px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white"
                style={{ backgroundColor: accent }}
              >
                {campo}
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
                {program.tagline}
              </span>
            </div>

            <SplitHeading
              as="h1"
              immediate
              delay={0.1}
              text={program.title}
              className="mt-6 max-w-[20ch] font-display text-[clamp(2.1rem,4.8vw,3.6rem)] font-semibold leading-[1.02] tracking-tightest text-white"
            />

            <dl className="mt-12 grid grid-cols-1 gap-6 border-t border-white/10 pt-8 sm:grid-cols-3">
              {[
                { k: "Duración", v: program.plan.duracion },
                { k: "Modalidad", v: program.plan.modalidad },
                { k: "Tutorías", v: program.plan.tutorias },
              ].map((f) => (
                <div key={f.k}>
                  <dt className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">{f.k}</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-white/80">{f.v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </header>

        <section className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-6 py-16 lg:grid-cols-[1.25fr_0.75fr] lg:gap-16 lg:py-24">
          <div>
            <RevealOnScroll className="aspect-[16/9] w-full overflow-hidden rounded-[1.6rem] border border-isel-line shadow-card">
              <ImageSlot
                src={program.detailImage ?? program.cardImage}
                alt={program.title}
                label={campo}
                glyph={String(Math.max(index, 0) + 1).padStart(2, "0")}
              />
            </RevealOnScroll>

            <RevealOnScroll delay={0.1} className="mt-10 flex flex-col gap-6">
              {program.paragraphs.map((paragraph, i) => (
                <p
                  key={i}
                  className={
                    i === 0
                      ? "text-[17px] leading-relaxed text-isel-navy sm:text-[19px]"
                      : "text-[15px] leading-relaxed text-isel-ink/70 sm:text-base"
                  }
                >
                  {paragraph}
                </p>
              ))}
            </RevealOnScroll>
          </div>

          {/* Columna fija: plan de estudios + las tres acciones del programa. */}
          <aside className="lg:sticky lg:top-28 lg:h-fit lg:self-start">
            <RevealOnScroll delay={0.06} className="rounded-[1.6rem] border border-isel-line bg-white p-7 shadow-card">
              <h2 className="font-display text-xl font-semibold text-isel-navy">Plan de estudios</h2>

              <dl className="mt-6 flex flex-col gap-5">
                <div className="border-l-2 border-[var(--accent)] pl-4">
                  <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-isel-ink/40">Duración</dt>
                  <dd className="mt-1 text-sm text-isel-ink/75">{program.plan.duracion}</dd>
                </div>
                <div className="border-l-2 border-[var(--accent)] pl-4">
                  <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-isel-ink/40">Modalidad</dt>
                  <dd className="mt-1 text-sm text-isel-ink/75">{program.plan.modalidad}</dd>
                </div>
                <div className="border-l-2 border-[var(--accent)] pl-4">
                  <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-isel-ink/40">Tutorías</dt>
                  <dd className="mt-1 text-sm text-isel-ink/75">{program.plan.tutorias}</dd>
                </div>
              </dl>

              <div className="mt-7 rounded-2xl bg-[var(--accent-soft)] p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--accent)]">Costos</p>
                <ul className="mt-3 flex flex-col gap-2">
                  {program.plan.costos.map((c) => (
                    <li key={c.label} className="flex items-baseline justify-between gap-4 text-sm">
                      <span className="text-isel-ink/65">{c.label}</span>
                      <strong className="font-display font-semibold text-isel-navy">{c.value}</strong>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-[11px] leading-relaxed text-isel-ink/45">{program.plan.notaCostos}</p>
              </div>

              <div className="mt-7 flex flex-col gap-3">
                <AnimatedButton href={program.pensumUrl} variant="accent" magnetic={false} className="w-full">
                  Pensum
                </AnimatedButton>
                <AnimatedButton href={program.interviewUrl} variant="secondary" magnetic={false} className="w-full">
                  Entrevista
                </AnimatedButton>
                <AnimatedButton
                  to={`/portal/login?programa=${program.slug}`}
                  variant="primary"
                  magnetic={false}
                  className="w-full"
                >
                  Inscripción
                </AnimatedButton>
              </div>
            </RevealOnScroll>
          </aside>
        </section>

        {/* Otras maestrías: salida natural en vez de un callejón sin fondo. */}
        <section className="border-t border-isel-line bg-isel-mist px-6 py-16 lg:py-20">
          <div className="mx-auto max-w-6xl">
            <span className="eyebrow text-isel-gold2">Otras maestrías</span>
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {otros.map((p) => {
                const a = accentFor(p.slug, localPrograms.findIndex((lp) => lp.slug === p.slug));
                return (
                  <Link
                    key={p.slug}
                    to={`/programas/${p.slug}`}
                    style={{ ["--accent" as string]: a.accent }}
                    className="group flex flex-col justify-between gap-6 rounded-2xl border border-isel-line bg-white p-6 transition-all duration-500 ease-snap hover:-translate-y-1 hover:border-[var(--accent)] hover:shadow-card"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--accent)]">
                      {a.campo}
                    </span>
                    <span className="font-display text-lg font-semibold leading-snug text-isel-navy">{p.title}</span>
                    <span className="text-[12px] font-bold uppercase tracking-[0.1em] text-isel-ink/45 transition-colors group-hover:text-[var(--accent)]">
                      Información →
                    </span>
                  </Link>
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
