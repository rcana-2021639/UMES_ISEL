import { motion } from "framer-motion";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { ImageSlot } from "@/components/ui/ImageSlot";

const INTERVIEW_URL = "https://b24-we8qvv.bitrix24.site/crm_form_2iluh/";

export function AdmissionCta() {
  return (
    <section id="admision" className="relative overflow-hidden bg-isel-navy px-6 py-24">
      {/* Decorative floating rings — solid strokes only, no gradients. */}
      <motion.div
        aria-hidden
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full border border-isel-gold/20"
      />
      <motion.div
        aria-hidden
        animate={{ rotate: -360 }}
        transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
        className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full border border-white/10"
      />

      <div className="relative mx-auto flex max-w-5xl flex-col items-center gap-12 text-center">
        <div className="grid w-full grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:text-left">
          <RevealOnScroll className="flex flex-col items-center gap-5 lg:items-start">
            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-isel-gold">
              <span className="h-px w-8 bg-isel-gold" />
              Siguiente paso
            </span>
            <h2 className="text-3xl font-semibold text-white sm:text-4xl">Solicita tu entrevista de admisión</h2>
            <p className="max-w-xl text-base leading-relaxed text-white/70">
              Da el primer paso hacia tu maestría en línea. Agenda tu entrevista de admisión y un asesor académico te
              acompañará durante todo el proceso.
            </p>
            <AnimatedButton href={INTERVIEW_URL} variant="ghost" className="mt-2">
              Solicitar entrevista
            </AnimatedButton>
          </RevealOnScroll>

          <RevealOnScroll
            delay={0.1}
            className="aspect-[4/3] w-full overflow-hidden rounded-2xl border border-white/10 shadow-card"
          >
            <ImageSlot
              src="/images/admission/entrevista-admision.jpg"
              alt="Entrevista de admisión"
              label="Imagen — Entrevista de admisión"
            />
          </RevealOnScroll>
        </div>

        <RevealOnScroll delay={0.15} className="border-t border-white/10 pt-8 text-xs leading-relaxed text-white/45">
          <p>
            La promoción de la integridad académica, honestidad intelectual, la consistencia del pensamiento crítico y
            el rigor del ejercicio pedagógico de la comunidad académica de la Universidad Mesoamericana está
            acompañada por{" "}
            <a
              href="https://www.turnitin.com/products/originality/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-isel-gold hover:underline"
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
