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
 * Metodología…) se fueron —la página se recorre con el scroll— y lo que queda
 * son las cinco puertas que alguien busca de verdad al llegar.
 *
 * ── El rediseño ─────────────────────────────────────────────────────────────
 * Antes eran cinco píldoras sueltas flotando sobre una píldora mayor: seis
 * bordes redondos anidados, sin ninguna jerarquía que se leyera de un vistazo,
 * y con dos rellenos distintos peleando por decir "esto es un botón".
 *
 * Ahora hay DOS objetos y no seis: un **riel hundido** que contiene las cuatro
 * consultas, y **una acción** fuera de él. El riel se hunde de verdad —fondo
 * más oscuro que la barra y un filo interior de un píxel— así que se entiende
 * como un control, no como decoración. Dentro, un pelo vertical separa los dos
 * sitios externos de los dos trámites internos: la misma información que antes
 * daban dos colores, ahora con un solo trazo y sin ruido.
 *
 * La geometría cambia de píldora a esquina corta, para alinearse con la nueva
 * regla del sitio: lo redondo informa (etiquetas, estados), lo rectangular
 * actúa (botones, riel, barra).
 *
 * ── La animación (intacta) ──────────────────────────────────────────────────
 * El gesto de firma sigue siendo el mismo: una pastilla compartida (layoutId)
 * viaja de un acceso a otro al pasar el cursor. Lo único que cambió es que
 * ahora viaja DENTRO de un carril visible, que es donde ese movimiento
 * significa algo — antes se deslizaba por el aire.
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

  /**
   * El emblema como botón de inicio.
   *
   * `enPortada` distingue los dos trabajos que hace el mismo control: fuera de
   * la portada navega, y dentro de ella —una vez que hay scroll que deshacer—
   * sube al principio. Estando ya arriba del todo no intercepta nada: dejar que
   * el enlace se comporte como enlace evita el clic que no hace nada, que es
   * peor que no tener el botón.
   */
  const enPortada = isHome && scrolled;
  const etiquetaInicio = enPortada ? "Volver al inicio de la página" : "Ir a la portada de ISEL";

  function irAlInicio(e: React.MouseEvent<HTMLAnchorElement>) {
    if (!enPortada) return;
    // Solo el clic normal: con Ctrl/Cmd/Shift o rueda, el navegador tiene que
    // poder abrirlo en otra pestaña como con cualquier enlace.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /**
   * Un acceso del riel.
   *
   * Es una función de render, no un componente anidado: así el foco compartido
   * no se remonta en cada scroll y la pastilla puede viajar de verdad.
   */
  function navAccess(item: Acceso, variant: "externo" | "interno") {
    const isHot = hovered === item.id;
    const externo = variant === "externo";
    const aqui = Boolean(item.to) && pathname === item.to;

    const content = (
      <>
        {isHot && (
          <motion.span
            layoutId="nav-focus"
            transition={{ duration: 0.45, ease: SNAP }}
            className="absolute inset-0 -z-10 rounded-[0.5rem] bg-white/[0.13] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)]"
          />
        )}
        {/* Dónde estoy: un punto de ámbar en el trámite que ya está abierto.
            La barra no tiene anclajes de sección, así que esta es la única
            señal de ubicación que la página puede dar. */}
        {aqui && <span aria-hidden className="h-1 w-1 shrink-0 rounded-full bg-isel-gold" />}
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

    /* Un solo tratamiento para los cuatro. La diferencia entre "sitio de fuera"
       y "trámite de aquí" la lleva el glifo (↗ / →) y el pelo que los separa,
       no dos rellenos distintos: eso es lo que antes hacía que la barra
       pareciera cinco cosas sin relación. */
    const classes = [
      "group/na relative inline-flex items-center gap-1.5 whitespace-nowrap rounded-[0.5rem] px-3.5 py-2",
      "text-[12.5px] font-semibold tracking-[-0.005em] transition-colors duration-300 ease-entry",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-isel-gold",
      isHot || aqui ? "text-white" : "text-white/65",
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
      <a
        key={item.id}
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className={classes}
        {...handlers}
      >
        {content}
      </a>
    );
  }

  return (
    <>
      <motion.div
        style={{ scaleX: progress }}
        className="fixed inset-x-0 top-0 z-[60] h-[2px] origin-left bg-gradient-to-r from-isel-gold via-isel-gold to-isel-emerald"
      />

      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ease-snap ${solid ? "py-3" : "py-6"}`}
      >
        <div
          className={`mx-auto flex w-full items-center justify-between gap-4 px-5 transition-all duration-500 ease-snap sm:px-6 ${
            solid
              ? "max-w-[80rem] rounded-2xl border border-white/10 bg-isel-deep/85 py-2.5 shadow-lift backdrop-blur-xl"
              : "max-w-[86rem] border border-transparent py-2"
          }`}
        >
          {/* La marca ES el botón de inicio.
              La barra dejó de tener anclas a secciones, así que desde una vista
              interna (una maestría, el portal, la inscripción) no quedaba
              ninguna salida rápida: había que usar el botón «atrás» del
              navegador o borrar la URL a mano. Ahora el emblema hace las dos
              cosas que se esperan de él, según dónde se pulse:

                · fuera de la portada → lleva a la portada;
                · en la portada, ya con scroll → sube al principio, suave.

              Sigue siendo un <Link> de verdad (no un <button>), así que el clic
              con rueda, «abrir en pestaña nueva» y el menú contextual siguen
              funcionando; el atajo solo intercepta el clic normal. Y se ve como
              lo que es: relleno al pasar el cursor, aro de foco y una pista de
              texto que dice a dónde va. */}
          <Link
            to="/"
            onClick={irAlInicio}
            title={etiquetaInicio}
            aria-label={etiquetaInicio}
            className="group flex shrink-0 items-center gap-3 rounded-[0.85rem] py-1 pl-1 pr-3 transition-colors duration-300 ease-entry hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-isel-gold"
          >
            {/* Tesela de esquina corta, no disco: la marca se alinea con la
                geometría nueva de la barra en lugar de repetir el círculo. */}
            <div className="relative h-10 w-10 overflow-hidden rounded-[0.7rem] bg-white/10 ring-1 ring-white/15 transition-transform duration-500 ease-snap group-hover:scale-105">
              <ImageSlot src="/images/hero/logo-isel.avif" alt="Logo ISEL" label="ISEL" tone="dark" glyph="I" />
              {/* Velo con la flecha: aparece sobre el emblema al pasar el
                  cursor y dice el gesto sin ocupar sitio cuando no hace falta.
                  Sube o vuelve, según lo que el clic vaya a hacer. */}
              <span
                aria-hidden
                className="absolute inset-0 flex items-center justify-center bg-isel-deep/75 text-[15px] text-white opacity-0 backdrop-blur-[2px] transition-opacity duration-300 ease-entry group-hover:opacity-100"
              >
                {enPortada ? "↑" : "←"}
              </span>
            </div>
            <span className="flex flex-col leading-none">
              <span className="font-display text-[15px] font-bold tracking-[0.22em] text-white">ISEL</span>
              {/* Debajo del rótulo, la segunda línea cambia al pasar el cursor:
                  en reposo dice de quién es la marca; señalada, a dónde lleva. */}
              <span className="relative mt-1 hidden overflow-hidden text-[10px] uppercase tracking-[0.14em] sm:block">
                {/* Medidor invisible. Los dos rótulos van absolutos para poder
                    cruzarse, y absoluto no ocupa ancho: sin esta copia en
                    flujo, el bloque se encogía al ancho de «ISEL» y el rótulo
                    salía cortado a media palabra. */}
                <span aria-hidden className="invisible block whitespace-nowrap">
                  Universidad Mesoamericana
                </span>
                <span className="absolute inset-0 whitespace-nowrap text-white/45 transition-transform duration-500 ease-snap group-hover:-translate-y-full">
                  Universidad Mesoamericana
                </span>
                <span className="absolute inset-0 translate-y-full whitespace-nowrap font-semibold text-isel-gold transition-transform duration-500 ease-snap group-hover:translate-y-0">
                  {enPortada ? "Volver arriba" : "Ir al inicio"}
                </span>
              </span>
            </span>
          </Link>

          <div className="hidden shrink-0 items-center gap-3 lg:flex">
            {/* El riel: una sola pieza hundida que contiene las cuatro
                consultas. El pelo interior hace el trabajo que antes hacían
                dos rellenos distintos. */}
            <div className="flex items-center gap-0.5 rounded-xl bg-black/20 p-1 shadow-[inset_0_1px_2px_rgba(0,0,0,0.35),inset_0_0_0_1px_rgba(255,255,255,0.07)]">
              {ACCESOS.map((item) => navAccess(item, "externo"))}
              <span aria-hidden className="mx-1 h-5 w-px bg-white/12" />
              {TRAMITES.map((item) => navAccess(item, "interno"))}
            </div>

            {/* Fuera del riel y con imán: es lo único de la barra que no es
                una consulta sino la acción que la página persigue. */}
            <ActionButton
              to="/inscripcion"
              tone="accent"
              size="nav"
              magnetic
              className="[--accent:#12855C]"
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
            className="relative z-[70] flex h-11 w-11 shrink-0 flex-col items-center justify-center gap-[5px] rounded-xl border border-white/15 bg-black/20 lg:hidden"
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
                  className="flex items-center justify-between gap-4 rounded-2xl bg-isel-emerald px-6 py-5 text-white"
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
                    "flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-4";
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
