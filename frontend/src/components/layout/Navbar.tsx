import { useEffect, useState } from "react";
import { AnimatePresence, motion, useScroll, useSpring } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { SNAP } from "@/components/ui/RevealOnScroll";
import { ActionButton } from "@/components/ui/ActionButton";

/** El aula virtual de ISEL. Es otro sitio, no una sección de este. */
const CANVAS_URL = "https://isel.instructure.com/login/canvas";
/** Registro académico de la UMES: notas, constancias, estado de cuenta. */
const ACADEMICO_URL =
  "https://academico.umes.edu.gt/alumnos/Account/Login.aspx?ReturnUrl=%2falumnos";

type Acceso = {
  id: string;
  label: string;
  /** Qué encuentra ahí quien entra. Se lee en el menú móvil y como title. */
  hint: string;
  to?: string;
  href?: string;
};

/* Primer peldaño: dónde entra quien YA es estudiante. Son dos sitios ajenos,
   por eso van juntos y llevan la flecha diagonal. */
const ACCESOS: Acceso[] = [
  {
    id: "plataforma",
    label: "Plataforma Educativa",
    hint: "Cursos, materiales y entregas",
    href: CANVAS_URL,
  },
  {
    id: "academico",
    label: "Sistema Académico",
    hint: "Notas, constancias y estado de cuenta",
    href: ACADEMICO_URL,
  },
];

/* Segundo peldaño: los trámites que se resuelven dentro de esta misma página. */
const TRAMITES: Acceso[] = [
  {
    id: "asignacion",
    label: "Asignación",
    hint: "Asignación de cursos del ciclo",
    to: "/portal/login",
  },
  {
    id: "titulo",
    label: "Solicitud de título",
    hint: "Impresión y trámite de título",
    to: "/solicitud-titulo",
  },
];

/**
 * Navegación solo-ISEL.
 *
 * La barra dejó de ser un menú: los anclajes a secciones (Inicio, Programas,
 * Metodología, Objetivos, Dirección) se fueron —la página se recorre con el
 * scroll y ese menú solo saturaba— y lo que queda son las cinco puertas que
 * alguien busca de verdad al llegar.
 *
 * Están ordenadas en tres peldaños para que se entiendan sin leerlas todas:
 * dos accesos a sistemas externos (flecha diagonal, píldora hueca), un
 * separador de un pelo, dos trámites internos (píldora llena, verde elevado)
 * y, al final y en verde vivo, la única acción que la página persigue: la
 * inscripción de nuevo ingreso. El peso visual crece de izquierda a derecha.
 *
 * El gesto de firma es el foco que se desliza: una píldora compartida
 * (layoutId) viaja de un acceso a otro al pasar el cursor, igual que antes
 * hacía el indicador de sección.
 */
export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const { pathname } = useLocation();
  const isHome = pathname === "/";

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

  /** Acceso de escritorio: píldora con foco deslizante y flecha de relevo.
      Es una función de render, no un componente anidado: así el foco
      compartido no se remonta en cada scroll. */
  function navAccess(item: Acceso, variant: "externo" | "interno") {
    const isHot = hovered === item.id;
    const externo = variant === "externo";

    const content = (
      <>
        {isHot && (
          <motion.span
            layoutId="nav-focus"
            transition={{ duration: 0.45, ease: SNAP }}
            className={`absolute inset-0 -z-10 rounded-full ${
              externo ? "bg-white/[0.12] ring-1 ring-inset ring-white/25" : "bg-white"
            }`}
          />
        )}
        <span className="relative">{item.label}</span>
        <span
          aria-hidden
          className="relative block h-3.5 w-3.5 shrink-0 overflow-hidden text-[13px] leading-none"
        >
          <span
            className={`absolute inset-0 flex items-center justify-center transition-transform duration-500 ease-snap ${
              externo ? "group-hover/na:-translate-y-[150%]" : "group-hover/na:translate-x-[150%]"
            }`}
          >
            {externo ? "↗" : "→"}
          </span>
          <span
            className={`absolute inset-0 flex items-center justify-center transition-transform duration-500 ease-snap ${
              externo
                ? "translate-y-[150%] group-hover/na:translate-y-0"
                : "-translate-x-[150%] group-hover/na:translate-x-0"
            }`}
          >
            {externo ? "↗" : "→"}
          </span>
        </span>
      </>
    );

    const classes = [
      "group/na relative inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2",
      "text-[12.5px] font-semibold tracking-[-0.005em] transition-colors duration-300 ease-entry",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-isel-gold",
      externo
        ? isHot
          ? "text-white"
          : "text-white/70"
        : isHot
          ? "text-isel-deep"
          : "bg-isel-navy2 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)]",
    ].join(" ");

    const handlers = {
      onMouseEnter: () => setHovered(item.id),
      onMouseLeave: () => setHovered(null),
      onFocus: () => setHovered(item.id),
      onBlur: () => setHovered(null),
      title: item.hint,
    };

    return item.to ? (
      <Link key={item.id} to={item.to} className={classes} {...handlers}>
        {content}
      </Link>
    ) : (
      <a key={item.id} href={item.href} target="_blank" rel="noopener noreferrer" className={classes} {...handlers}>
        {content}
      </a>
    );
  }

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
          className={`mx-auto flex w-full items-center justify-between gap-4 px-5 transition-all duration-500 ease-snap sm:px-6 ${
            solid
              ? "max-w-[80rem] rounded-full border border-white/10 bg-isel-deep/90 py-2.5 shadow-lift backdrop-blur-xl"
              : "max-w-[86rem] border border-transparent py-2"
          }`}
        >
          <Link to="/" className="group flex shrink-0 items-center gap-3">
            <div className="h-10 w-10 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/15 transition-transform duration-500 ease-snap group-hover:scale-105">
              <ImageSlot src="/images/hero/logo-isel.avif" alt="Logo ISEL" label="ISEL" tone="dark" glyph="I" />
            </div>
            <span className="flex flex-col leading-none">
              <span className="font-display text-[15px] font-bold tracking-[0.22em] text-white">ISEL</span>
              <span className="mt-1 hidden text-[10px] uppercase tracking-[0.14em] text-white/45 sm:block">
                Universidad Mesoamericana
              </span>
            </span>
          </Link>

          {/* Ritmo: 2px entre hermanos del mismo peldaño, un pelo de separación
              y 16px entre peldaños, y otro salto antes del CTA. Ese aire
              desigual es lo que hace que los tres bloques se lean como tres
              cosas distintas de un vistazo, sin necesidad de rótulos. */}
          <div className="hidden shrink-0 items-center gap-1.5 lg:flex">
            <div className="flex items-center gap-0.5">
              {ACCESOS.map((item) => (
                navAccess(item, "externo")
              ))}
            </div>

            <span aria-hidden className="mx-2 h-5 w-px bg-white/15" />

            <div className="flex items-center gap-1">
              {TRAMITES.map((item) => (
                navAccess(item, "interno")
              ))}
            </div>

            <ActionButton
              to="/inscripcion"
              tone="accent"
              size="nav"
              className="ml-2 [--accent:#12855C] [--accent-soft:rgba(18,133,92,0.28)]"
            >
              {/* El rótulo completo solo donde cabe entero; por debajo, la mitad
                  que de verdad identifica el trámite. */}
              <span className="hidden 2xl:inline">Inscripción nuevo ingreso</span>
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

      {/* Menú móvil: los mismos peldaños en vertical, cada puerta con la línea
          que dice qué hay detrás. Entra en cascada. */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: SNAP }}
            className="fixed inset-0 z-[55] flex flex-col overflow-y-auto overscroll-contain bg-isel-deep px-6 py-24 sm:px-8 lg:hidden"
          >
            <div className="grain pointer-events-none absolute inset-0" aria-hidden />
            {/* `m-auto` en vez de `justify-center`: centra mientras sobra alto y, en
                pantallas cortas, deja que el bloque crezca y se pueda desplazar sin
                que se recorte por arriba. */}
            <div className="relative m-auto w-full">

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06, duration: 0.6, ease: SNAP }}
              className="relative"
            >
              <Link
                to="/inscripcion"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-between gap-4 rounded-3xl bg-isel-emerald px-6 py-5 text-white"
              >
                <span className="flex flex-col gap-1 text-left">
                  <span className="font-display text-xl font-bold leading-tight">
                    Inscripción nuevo ingreso
                  </span>
                  <span className="text-[12px] leading-snug text-white/80">
                    Complete su ficha y reserve su lugar
                  </span>
                </span>
                <span aria-hidden className="text-lg">
                  →
                </span>
              </Link>
            </motion.div>

            <p className="relative mt-9 text-[10px] font-bold uppercase tracking-[0.18em] text-isel-gold">
              Ya soy estudiante
            </p>
            <nav className="relative mt-3 flex flex-col gap-2">
              {[...ACCESOS, ...TRAMITES].map((item, i) => {
                const externo = Boolean(item.href);
                const inner = (
                  <>
                    <span className="flex flex-col gap-1 text-left">
                      <span className="font-display text-lg font-semibold leading-tight text-white">
                        {item.label}
                      </span>
                      <span className="text-[12px] leading-snug text-white/55">{item.hint}</span>
                    </span>
                    <span aria-hidden className="text-base text-white/45">
                      {externo ? "↗" : "→"}
                    </span>
                  </>
                );
                const cls =
                  "flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4";
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 22 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.14 + i * 0.07, duration: 0.55, ease: SNAP }}
                  >
                    {item.to ? (
                      <Link to={item.to} onClick={() => setMobileOpen(false)} className={cls}>
                        {inner}
                      </Link>
                    ) : (
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setMobileOpen(false)}
                        className={cls}
                      >
                        {inner}
                      </a>
                    )}
                  </motion.div>
                );
              })}
            </nav>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
