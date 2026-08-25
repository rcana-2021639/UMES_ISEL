import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { programs as localPrograms } from "@/data/programs";
import { getProgramBySlug } from "@/lib/api";
import type { MasterProgram } from "@/types/program";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

/**
 * The "Información" page for a single maestría. Mirrors the original
 * detail page 1:1 (description paragraphs + Plan de estudios), and adds
 * a third "Inscripción" button next to Pensum/Entrevista as requested —
 * disabled for now since that flow doesn't exist yet.
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

  if (notFound || !program) {
    return (
      <>
        <Navbar />
        <main className="flex min-h-screen items-center justify-center bg-isel-paper px-6 pt-28 text-center">
          <div>
            <h1 className="text-2xl font-semibold text-isel-navy">Programa no encontrado</h1>
            <Link to="/" className="mt-4 inline-block font-semibold text-isel-gold2 hover:underline">
              Volver al inicio
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="bg-isel-paper pt-28">
        <section className="mx-auto max-w-5xl px-6 py-16">
          <RevealOnScroll>
            <Link to="/#programas" className="text-sm font-semibold text-isel-gold2 hover:underline">
              ← Volver a Programas
            </Link>
            <h1 className="mt-4 text-3xl font-semibold leading-tight text-isel-navy sm:text-4xl">
              {program.title}
            </h1>
            <span className="mt-2 inline-block text-sm font-bold uppercase tracking-wide text-isel-gold2">
              {program.tagline}
            </span>
          </RevealOnScroll>

          <RevealOnScroll
            delay={0.1}
            className="mt-8 aspect-[16/9] w-full overflow-hidden rounded-2xl border border-isel-line shadow-card"
          >
            <ImageSlot
              src={program.detailImage ?? program.cardImage}
              alt={program.title}
              label={`Imagen de portada — ${program.title}`}
            />
          </RevealOnScroll>

          <RevealOnScroll delay={0.15} className="mt-8 flex flex-col gap-4 text-base leading-relaxed text-isel-ink/80">
            {program.paragraphs.map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </RevealOnScroll>

          <RevealOnScroll delay={0.2} className="mt-8 flex flex-wrap gap-4">
            <AnimatedButton href={program.pensumUrl} variant="primary">
              Pensum
            </AnimatedButton>
            <AnimatedButton href={program.interviewUrl} variant="secondary">
              Entrevista
            </AnimatedButton>
            <AnimatedButton variant="disabled" disabledHint="Próximamente disponible">
              Inscripción
            </AnimatedButton>
          </RevealOnScroll>

          <RevealOnScroll delay={0.25} className="mt-14 rounded-2xl border border-isel-line bg-white p-8 shadow-card">
            <h2 className="text-xl font-semibold text-isel-navy">Plan de estudios</h2>
            <dl className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-isel-gold2">Duración</dt>
                <dd className="mt-1 text-sm text-isel-ink/75">{program.plan.duracion}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-isel-gold2">Modalidad</dt>
                <dd className="mt-1 text-sm text-isel-ink/75">{program.plan.modalidad}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-isel-gold2">Tutorías</dt>
                <dd className="mt-1 text-sm text-isel-ink/75">{program.plan.tutorias}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-isel-gold2">Costos</dt>
                <dd className="mt-1 flex flex-col gap-1 text-sm text-isel-ink/75">
                  {program.plan.costos.map((c) => (
                    <span key={c.label}>
                      {c.label}: <strong className="text-isel-navy">{c.value}</strong>
                    </span>
                  ))}
                </dd>
              </div>
            </dl>
            <p className="mt-6 text-xs text-isel-ink/50">{program.plan.notaCostos}</p>
          </RevealOnScroll>
        </section>
      </main>
      <Footer />
    </>
  );
}
