import { useEffect, useState } from "react";
import { AnimatePresence, motion, useScroll, useSpring } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { useActiveSection } from "@/hooks/useActiveSection";
import { SNAP } from "@/components/ui/RevealOnScroll";
import { ActionButton } from "@/components/ui/ActionButton";

const NAV_LINKS = [
  { label: "Inicio", id: "inicio" },
  { label: "Programas", id: "programas" },
  { label: "Metodología", id: "metodologia" },
  { label: "Objetivos", id: "objetivos" },
  { label: "Dirección", id: "direccion" },
];

const IDS = NAV_LINKS.map((l) => l.id);

/** El aula virtual de ISEL. Es otro sitio, no una sección de este. */
const CANVAS_URL = "https://isel.instructure.com/login/canvas";

/**
 * Navegación solo-ISEL. Todo lo que apuntaba al resto del sitio UMES
 * (Facultades, UMES virtual, Egresados, buscador...) no vive aquí; en su lugar
 * la barra ancla las secciones de esta página y marca cuál se está leyendo
 * con una píldora que se desliza entre enlaces (layoutId).
 *
 * Sobre el hero es transparente; al pasar los 40px se condensa en una cápsula
 * con desenfoque. Arriba del todo corre la barra de progreso de lectura.
 */
export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();
  const isHome = pathname === "/";
  const active = useActiveSection(IDS);

  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 26, restDelta: 0.001 });

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 40);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const solid = scrolled || !isHome;
  const href = (id: string) => (isHome ? `#${id}` : `/#${id}`);

  return (
    <>
      <motion.div
        style={{ scaleX: progress }}
        className="fixed inset-x-0 top-0 z-[60] h-[2px] origin-left bg-isel-gold"
      />

      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ease-snap ${solid ? "py-3" : "py-6"}`}
      >
        <div
          className={`mx-auto flex w-full items-center justify-between gap-4 px-5 transition-all duration-500 ease-snap sm:px-6 xl:gap-5 ${
            solid
              ? "max-w-[86rem] rounded-full border border-white/10 bg-isel-deep/90 py-2.5 shadow-lift backdrop-blur-xl"
              : "max-w-[90rem] border border-transparent py-2"
          }`}
        >
          <Link to="/" className="group flex shrink-0 items-center gap-3">
            <div className="h-10 w-10 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/15 transition-transform duration-500 ease-snap group-hover:scale-105">
              <ImageSlot src="/images/hero/logo-isel.avif" alt="Logo ISEL" label="ISEL" tone="dark" glyph="I" />
            </div>
            <span className="flex flex-col leading-none">
              <span className="font-display text-[15px] font-bold tracking-[0.22em] text-white">ISEL</span>
              <span className="mt-1 hidden text-[10px] uppercase tracking-[0.14em] text-white/45 sm:block lg:hidden 2xl:block">
                Universidad Mesoamericana
              </span>
            </span>
          </Link>

          <nav className="hidden min-w-0 items-center gap-0.5 xl:flex">
            {NAV_LINKS.map((link) => {
              const isActive = isHome && active === link.id;
              return (
                <a
                  key={link.id}
                  href={href(link.id)}
                  className={`relative whitespace-nowrap rounded-full px-2.5 py-2 text-[13px] font-semibold transition-colors duration-300 ease-snap ${
                    isActive ? "text-isel-deep" : "text-white/70 hover:text-white"
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="nav-pill"
                      transition={{ duration: 0.5, ease: SNAP }}
                      className="absolute inset-0 -z-10 rounded-full bg-isel-gold"
                    />
                  )}
                  {link.label}
                </a>
              );
            })}
          </nav>

          {/* Accesos rápidos. Los tres trámites y el aula virtual eran enlaces de
              texto al lado de un botón verde: se leían como parte del menú y
              nadie los distinguía. Ahora los cuatro son el mismo botón —misma
              píldora, mismo relevo de flecha, mismo aro al pasar— y lo único
              que los separa es el peldaño de color: verde elevado para los
              tres accesos, verde vivo para la inscripción, que sigue siendo la
              acción que la página persigue.

              El grupo es `shrink-0` y cada botón `whitespace-nowrap`: pase lo
              que pase con el ancho, quien cede es el menú de secciones, nunca
              este bloque. Eso es lo que hacía que el CTA se saliera de la
              cápsula al condensarse la barra. */}
          <div className="hidden shrink-0 items-center gap-1.5 lg:flex xl:gap-2">
            <ActionButton
              href={CANVAS_URL}
              tone="navSoft"
              size="nav"
              arrow="upRight"
            >
              Canvas
            </ActionButton>
            <ActionButton to="/portal/login" tone="navSoft" size="nav">
              Asignación
            </ActionButton>
            <ActionButton to="/solicitud-titulo" tone="navSoft" size="nav">
              Solicitud de título
            </ActionButton>
            <ActionButton
              to="/inscripcion"
              tone="accent"
              size="nav"
              className="[--accent:#12855C] [--accent-soft:rgba(18,133,92,0.28)]"
            >
              {/* El rótulo completo solo donde cabe entero; por debajo, la mitad
                  que de verdad identifica el trámite. */}
              <span className="hidden 2xl:inline">Inscripciones nuevo ingreso</span>
              <span className="2xl:hidden">Nuevo ingreso</span>
            </ActionButton>
          </div>

          <button
            aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
            className="relative z-[70] flex h-11 w-11 shrink-0 flex-col items-center justify-center gap-[5px] rounded-full border border-white/15 lg:hidden"
          >
            <motion.span
              animate={mobileOpen ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
              transition={{ duration: 0.35, ease: SNAP }}
              className="h-[1.5px] w-5 bg-white"
            />
            <motion.span
              animate={mobileOpen ? { opacity: 0, x: -8 } : { opacity: 1, x: 0 }}
              transition={{ duration: 0.25 }}
              className="h-[1.5px] w-5 bg-white"
            />
            <motion.span
              animate={mobileOpen ? { rotate: -45, y: -7 } : { rotate: 0, y: 0 }}
              transition={{ duration: 0.35, ease: SNAP }}
              className="h-[1.5px] w-5 bg-white"
            />
          </button>
        </div>
      </header>

      {/* Menú móvil: pantalla completa y enlaces en cascada, no un acordeón apretado. */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: SNAP }}
            className="fixed inset-0 z-[55] flex flex-col justify-center overflow-y-auto bg-isel-deep px-8 py-24 lg:hidden"
          >
            <div className="grain pointer-events-none absolute inset-0" aria-hidden />
            <nav className="relative flex flex-col">
              {NAV_LINKS.map((link, i) => (
                <motion.a
                  key={link.id}
                  href={href(link.id)}
                  onClick={() => setMobileOpen(false)}
                  initial={{ opacity: 0, y: 28 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 + i * 0.06, duration: 0.6, ease: SNAP }}
                  className="border-b border-white/10 py-4 font-display text-3xl font-semibold text-white"
                >
                  <span className="mr-4 align-middle text-xs font-bold tracking-widest text-isel-gold">
                    0{i + 1}
                  </span>
                  {link.label}
                </motion.a>
              ))}
            </nav>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.42, duration: 0.6, ease: SNAP }}
              className="relative mt-10 flex flex-col gap-3"
            >
              <Link
                to="/inscripcion"
                onClick={() => setMobileOpen(false)}
                className="rounded-full bg-isel-emerald px-6 py-4 text-center text-sm font-bold uppercase tracking-[0.12em] text-white"
              >
                Inscripciones nuevo ingreso
              </Link>
              <Link
                to="/portal/login"
                onClick={() => setMobileOpen(false)}
                className="rounded-full border border-white/25 px-6 py-4 text-center text-sm font-bold uppercase tracking-[0.12em] text-white/85"
              >
                Asignación
              </Link>
              <Link
                to="/solicitud-titulo"
                onClick={() => setMobileOpen(false)}
                className="rounded-full border border-white/25 px-6 py-4 text-center text-sm font-bold uppercase tracking-[0.12em] text-white/85"
              >
                Solicitud de título
              </Link>
              <a
                href={CANVAS_URL}
                target="_blank"
                rel="noreferrer noopener"
                onClick={() => setMobileOpen(false)}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 px-6 py-4 text-center text-sm font-bold uppercase tracking-[0.12em] text-white/85"
              >
                Canvas
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                  className="h-3.5 w-3.5 opacity-60"
                >
                  <path d="M8 16L16 8M9 8h7v7" />
                </svg>
              </a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
