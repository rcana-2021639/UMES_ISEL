import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ImageSlot } from "@/components/ui/ImageSlot";

/**
 * Hero — mirrors the original "INSTITUTO SALESIANO DE EDUCACIÓN EN LÍNEA"
 * block, but the "Acceder" button has been intentionally removed (per spec,
 * it isn't functional on this site). Background image gets a subtle
 * scroll-parallax; content fades/rises in on load.
 */
export function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", "22%"]);
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "35%"]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section id="inicio" ref={ref} className="relative flex min-h-[92vh] items-center overflow-hidden bg-isel-navy">
      <motion.div style={{ y: imageY }} className="absolute inset-0">
        <ImageSlot
          src="/images/hero/hero-principal.jpg"
          alt="Maestrías en modalidad virtual UMES"
          label="Imagen principal del hero (fondo)"
          className="opacity-40"
        />
        <div className="absolute inset-0 bg-isel-navy/70" />
      </motion.div>

      <motion.div
        style={{ y: contentY, opacity: contentOpacity }}
        className="relative z-10 mx-auto flex max-w-5xl flex-col items-center gap-8 px-6 pt-24 text-center"
      >
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center gap-4"
        >
          <div className="h-16 w-16 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/20">
            <ImageSlot src="/images/hero/logo-umes.png" alt="Logo UMES" label="Logo UMES" />
          </div>
          <div className="h-16 w-16 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/20">
            <ImageSlot src="/images/hero/logo-isel.png" alt="Logo ISEL" label="Logo ISEL" />
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="text-4xl font-semibold leading-[1.1] text-white sm:text-5xl lg:text-6xl"
        >
          Instituto Salesiano
          <br />
          de Educación en Línea
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-2xl text-base leading-relaxed text-white/75 sm:text-lg"
        >
          El Instituto Salesiano de Educación en Línea —ISEL— se dedica al desarrollo e implementación dinámica de
          programas de enseñanza-aprendizaje en línea. Ofrece un ambiente educativo donde estudiantes y docentes
          generan experiencias de aprendizaje flexibles, efectivas e innovadoras.
        </motion.p>

        <motion.a
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          whileHover={{ y: -3, scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          href="#programas"
          className="mt-2 inline-flex items-center gap-2 rounded-full bg-isel-gold px-7 py-3.5 text-sm font-semibold tracking-wide text-isel-navy transition-colors duration-300 hover:bg-white"
        >
          Explorar programas
          <span aria-hidden>↓</span>
        </motion.a>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.6 }}
        className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="flex h-9 w-6 items-start justify-center rounded-full border-2 border-white/40 p-1"
        >
          <span className="h-2 w-1 rounded-full bg-white/70" />
        </motion.div>
      </motion.div>
    </section>
  );
}
