import { useReducedMotion } from "framer-motion";
import type { MasterProgram } from "@/types/program";
import { programs as localPrograms } from "@/data/programs";
import { RevealOnScroll, SplitHeading } from "@/components/ui/RevealOnScroll";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { ActionButton } from "@/components/ui/ActionButton";

const INTERVIEW_URL = "https://b24-we8qvv.bitrix24.site/crm_form_2iluh/";

interface AdmissionCtaProps {
  programs?: MasterProgram[];
}

/**
 * Cierre de página: la banda de admisión.
 *
 * Arriba corre una cinta con los nombres de las maestrías (transform puro, se
 * detiene con prefers-reduced-motion), y debajo el llamado real a agendar la
 * entrevista, la nota de integridad académica con Turnitin y los datos de
 * contacto —todo el contenido de la página original, ordenado como un cierre.
 */
export function AdmissionCta({ programs }: AdmissionCtaProps) {
  const reduce = useReducedMotion();
  const list = (programs?.length ? programs : localPrograms).map((p) => p.title);
  const strip = [...list, ...list];

  return (
    <section id="admision" className="grain relative overflow-hidden bg-isel-deep">
      <div className="grid-lines pointer-events-none absolute inset-0 opacity-40" aria-hidden />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 top-1/3 h-[40rem] w-[40rem] animate-drift rounded-full bg-isel-emerald/20 blur-[140px]"
      />

      {/* Cinta de programas: da movimiento continuo sin robarle foco al CTA. */}
      <div className="relative border-y border-white/10 py-6">
        <div className="mask-fade-x overflow-hidden">
          <div className={`flex w-max items-center gap-10 ${reduce ? "" : "animate-marquee"}`}>
            {strip.map((title, i) => (
              <span key={`${title}-${i}`} className="flex items-center gap-10 whitespace-nowrap">
                <span className="font-display text-sm font-semibold uppercase tracking-[0.16em] text-white/45">
                  {title}
                </span>
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-isel-gold" aria-hidden />
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="relative mx-auto max-w-7xl px-6 py-24 lg:py-32">
        <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
          <div>
            <RevealOnScroll y={12}>
              <span className="eyebrow text-isel-gold">Siguiente paso</span>
            </RevealOnScroll>

            <SplitHeading
              text="Solicita tu entrevista de admisión"
              className="mt-6 max-w-[14ch] font-display text-[clamp(2.3rem,5.4vw,4rem)] font-semibold leading-[1] tracking-tightest text-white"
            />

            <RevealOnScroll delay={0.12}>
              <p className="mt-7 max-w-xl text-[15px] leading-relaxed text-white/60 sm:text-lg">
                Da el primer paso hacia tu maestría en línea. Agenda tu entrevista de admisión y un asesor académico
                te acompañará durante todo el proceso.
              </p>
            </RevealOnScroll>

            <RevealOnScroll delay={0.18}>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <ActionButton href={INTERVIEW_URL} tone="light">
                  Solicitar entrevista
                </ActionButton>
                <ActionButton href="#programas" external={false} tone="outlineDark" arrow="down">
                  Revisar programas
                </ActionButton>
              </div>
            </RevealOnScroll>

            <RevealOnScroll delay={0.24}>
              <div className="mt-12 flex flex-wrap gap-x-12 gap-y-6 border-t border-white/10 pt-8">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">Correo</p>
                  <a
                    href="mailto:info@umes.edu.gt"
                    className="mt-1 block text-[15px] text-white transition-colors hover:text-isel-gold"
                  >
                    info@umes.edu.gt
                  </a>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">Teléfono</p>
                  <a
                    href="tel:+50224138021"
                    className="mt-1 block text-[15px] text-white transition-colors hover:text-isel-gold"
                  >
                    2413 8021
                  </a>
                </div>
              </div>
            </RevealOnScroll>
          </div>

          <RevealOnScroll delay={0.1} scale className="relative">
            <div className="aspect-[4/5] w-full overflow-hidden rounded-[2rem] border border-white/10 shadow-lift">
              <ImageSlot
                src="/images/admission/entrevista-admision.jpg"
                alt="Entrevista de admisión ISEL"
                label="Entrevista de admisión"
                tone="dark"
                glyph="→"
              />
            </div>
            <div className="absolute -bottom-6 left-6 right-6 rounded-2xl border border-white/10 bg-isel-navy/95 px-6 py-5 shadow-lift backdrop-blur-md">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/45">Admisión</p>
              <p className="mt-1 font-display text-lg font-semibold text-white">
                Un asesor te acompaña de principio a fin
              </p>
            </div>
          </RevealOnScroll>
        </div>

        <RevealOnScroll delay={0.1}>
          <p className="mt-24 max-w-4xl border-t border-white/10 pt-8 text-[13px] leading-relaxed text-white/40">
            La promoción de la integridad académica, honestidad intelectual, la consistencia del pensamiento crítico y
            el rigor del ejercicio pedagógico de la comunidad académica de la Universidad Mesoamericana está
            acompañada por{" "}
            <a
              href="https://www.turnitin.com/products/originality/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-isel-gold underline-offset-4 hover:underline"
            >
              Originality Check de Turnitin
            </a>
            .
          </p>
        </RevealOnScroll>
      </div>
    </section>
  );
}
