import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ImageSlot } from "@/components/ui/ImageSlot";

const NAV_LINKS = [
  { label: "Inicio", href: "#inicio" },
  { label: "Programas", href: "#programas" },
  { label: "Metodología", href: "#metodologia" },
  { label: "Objetivos", href: "#objetivos" },
  { label: "Dirección", href: "#direccion" },
];

/**
 * ISEL-only navigation bar. Everything that pointed at the rest of the UMES
 * site (Inicio/Nosotros/Facultades/Admisión general/UMES virtual/Académico/
 * Vida universitaria/Egresados) plus Biblioteca, Investigaciones y
 * Publicaciones, Recursos tecnológicos and the search bar has been removed —
 * replaced with in-page section links so the bar still feels alive and full.
 */
export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 24);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ease-snap ${
        scrolled ? "bg-isel-navy shadow-card py-2" : "bg-transparent py-4"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6">
        <Link to="/" className="flex items-center gap-3">
          <div className="h-11 w-11 overflow-hidden rounded-full bg-white/10">
            <ImageSlot src="/images/hero/logo-isel.png" alt="Logo ISEL" label="Logo ISEL" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-bold uppercase tracking-[0.18em] text-white">ISEL</span>
            <span className="text-[11px] text-white/70">Instituto Salesiano de Educación en Línea</span>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="group relative text-sm font-medium text-white/85 transition-colors hover:text-white"
            >
              {link.label}
              <span className="absolute -bottom-1 left-0 h-[2px] w-0 bg-isel-gold transition-all duration-300 ease-snap group-hover:w-full" />
            </a>
          ))}
        </nav>

        <a
          href="#admision"
          className="hidden rounded-full bg-isel-gold px-5 py-2.5 text-sm font-semibold text-isel-navy transition-transform duration-300 ease-snap hover:-translate-y-0.5 hover:bg-white lg:inline-flex"
        >
          Solicita tu entrevista
        </a>

        <button
          aria-label="Abrir menú"
          onClick={() => setMobileOpen((v) => !v)}
          className="relative z-50 flex h-10 w-10 flex-col items-center justify-center gap-1.5 lg:hidden"
        >
          <motion.span
            animate={mobileOpen ? { rotate: 45, y: 7 } : { rotate: 0, y: 0 }}
            className="h-0.5 w-6 bg-white"
          />
          <motion.span animate={mobileOpen ? { opacity: 0 } : { opacity: 1 }} className="h-0.5 w-6 bg-white" />
          <motion.span
            animate={mobileOpen ? { rotate: -45, y: -7 } : { rotate: 0, y: 0 }}
            className="h-0.5 w-6 bg-white"
          />
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden bg-isel-navy lg:hidden"
          >
            <div className="flex flex-col gap-1 px-6 pb-6 pt-2">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-3 text-sm font-medium text-white/90 hover:bg-white/10"
                >
                  {link.label}
                </a>
              ))}
              <a
                href="#admision"
                onClick={() => setMobileOpen(false)}
                className="mt-2 rounded-full bg-isel-gold px-4 py-3 text-center text-sm font-semibold text-isel-navy"
              >
                Solicita tu entrevista
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
