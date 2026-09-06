import { Link } from "react-router-dom";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";

/**
 * Subrayado que se traza de izquierda a derecha al pasar el cursor.
 *
 * Los enlaces del pie eran lo único interactivo de toda la página cuya única
 * respuesta al cursor era subir de gris a blanco. Es el mínimo que hace un
 * navegador solo, y a estas alturas de la página se nota que nadie lo miró.
 * El trazo usa `scale-x` sobre un pelo ya presente —no `width`, que obligaría
 * a recalcular maquetación en cada fotograma— y va con la curva de la casa.
 */
const ENLACE =
  "group/e relative w-fit transition-colors duration-300 ease-snap";
const TRAZO =
  "absolute -bottom-0.5 left-0 block h-px w-full origin-left scale-x-0 bg-current transition-transform duration-500 ease-snap group-hover/e:scale-x-100";

const SOCIALS = [
  { label: "Facebook", handle: "@mesoamericana", href: "https://www.facebook.com/mesoamericana" },
  { label: "Instagram", handle: "@mesoamericana", href: "https://www.instagram.com/mesoamericana/" },
  { label: "WhatsApp", handle: "+502 2413 8021", href: "https://api.whatsapp.com/send?phone=50224138021" },
  { label: "YouTube", handle: "@UniversidadMesoamericana", href: "https://www.youtube.com/@UniversidadMesoamericana" },
  { label: "X", handle: "@UMES_Guatemala", href: "https://x.com/UMES_Guatemala" },
  { label: "LinkedIn", handle: "universidad-mesoamericana", href: "https://www.linkedin.com/school/universidad-mesoamericana" },
  { label: "TikTok", handle: "@umesguatemala", href: "https://www.tiktok.com/@umesguatemala" },
];

const SECCIONES = [
  { label: "Inicio", href: "/#inicio" },
  { label: "Programas", href: "/#programas" },
  { label: "Metodología", href: "/#metodologia" },
  { label: "Objetivos", href: "/#objetivos" },
  { label: "Dirección", href: "/#direccion" },
  { label: "Admisión", href: "/#admision" },
];

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-white/10 bg-isel-navy">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:py-20">
        {/* Las tres columnas entran en cascada desigual (0, 90, 160ms) al
            asomar el pie. Antes el bloque entero aparecía de golpe, que a
            estas alturas de la página se lee como que se acabó el trabajo. */}
        <div className="grid gap-12 lg:grid-cols-[1.3fr_0.7fr_1fr]">
          <RevealOnScroll y={22}>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/15">
                <ImageSlot
                  src="/images/hero/logo-umes.avif"
                  alt="Logo Universidad Mesoamericana"
                  label="UMES"
                  tone="dark"
                  glyph="U"
                />
              </div>
              <div className="h-12 w-12 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/15">
                <ImageSlot src="/images/hero/logo-isel.avif" alt="Logo ISEL" label="ISEL" tone="dark" glyph="I" />
              </div>
            </div>
            <p className="mt-6 max-w-sm font-display text-2xl font-semibold leading-snug text-white">
              Instituto Salesiano de Educación en Línea
            </p>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/50">
              Universidad Mesoamericana. Programas de maestría 100% en línea, con acompañamiento sincrónico y
              asincrónico.
            </p>
          </RevealOnScroll>

          <RevealOnScroll y={22} delay={0.09}>
          <nav className="flex flex-col gap-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-isel-gold">Secciones</span>
            {SECCIONES.map((s) => (
              <a key={s.href} href={s.href} className={`${ENLACE} text-sm text-white/60 hover:text-white`}>
                {s.label}
                <span aria-hidden className={TRAZO} />
              </a>
            ))}
            <Link
              to="/portal/login"
              className={`${ENLACE} mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-white/85 hover:text-isel-gold`}
            >
              Asignación
              {/* Relevo de flecha: el mismo gesto que los botones del sitio. */}
              <span aria-hidden className="relative block h-4 w-4 shrink-0 overflow-hidden">
                <span className="absolute inset-0 flex items-center justify-center transition-transform duration-500 ease-snap group-hover/e:translate-x-[150%]">
                  →
                </span>
                <span className="absolute inset-0 flex -translate-x-[150%] items-center justify-center transition-transform duration-500 ease-snap group-hover/e:translate-x-0">
                  →
                </span>
              </span>
            </Link>
          </nav>
          </RevealOnScroll>

          <RevealOnScroll y={22} delay={0.16}>
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-isel-gold">Contacto</span>
              <a href="mailto:info@umes.edu.gt" className={`${ENLACE} text-sm text-white/60 hover:text-white`}>
                info@umes.edu.gt
                <span aria-hidden className={TRAZO} />
              </a>
              <a href="tel:+50224138021" className={`${ENLACE} text-sm text-white/60 hover:text-white`}>
                2413 8021
                <span aria-hidden className={TRAZO} />
              </a>
              <a
                href="https://www.umes.edu.gt"
                target="_blank"
                rel="noopener noreferrer"
                className={`${ENLACE} text-sm text-white/60 hover:text-white`}
              >
                www.umes.edu.gt
                <span aria-hidden className={TRAZO} />
              </a>
            </div>

            <div className="flex flex-col gap-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-isel-gold">Síguenos</span>
              <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
                {SOCIALS.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${ENLACE} flex items-baseline gap-2 text-sm text-white/60 hover:text-white`}
                  >
                    <span className="relative font-semibold">
                      {s.label}
                      {/* El trazo se ciñe al nombre de la red, no al renglón
                          entero: el @ de al lado no forma parte del enlace que
                          se está señalando. */}
                      <span aria-hidden className={TRAZO} />
                    </span>
                    <span className="truncate text-[11px] text-white/30 transition-colors duration-300 ease-snap group-hover/e:text-white/50">
                      {s.handle}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </div>
          </RevealOnScroll>
        </div>

        <div className="mt-16 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-7 text-xs text-white/40 sm:flex-row sm:items-center">
          <span>© {new Date().getFullYear()} ISEL · Universidad Mesoamericana. Todos los derechos reservados.</span>
          <a
            href="https://www.umes.edu.gt/politica-de-privacidad"
            target="_blank"
            rel="noopener noreferrer"
            className={`${ENLACE} hover:text-white/80`}
          >
            Política de Privacidad
            <span aria-hidden className={TRAZO} />
          </a>
        </div>
      </div>
    </footer>
  );
}
