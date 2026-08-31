import { Link } from "react-router-dom";
import { ImageSlot } from "@/components/ui/ImageSlot";

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
        <div className="grid gap-12 lg:grid-cols-[1.3fr_0.7fr_1fr]">
          <div>
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
          </div>

          <nav className="flex flex-col gap-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-isel-gold">Secciones</span>
            {SECCIONES.map((s) => (
              <a
                key={s.href}
                href={s.href}
                className="w-fit text-sm text-white/60 transition-colors duration-300 ease-snap hover:text-white"
              >
                {s.label}
              </a>
            ))}
            <Link
              to="/portal/login"
              className="mt-2 w-fit text-sm font-semibold text-white/85 transition-colors duration-300 ease-snap hover:text-isel-gold"
            >
              Inscripciones →
            </Link>
          </nav>

          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-isel-gold">Contacto</span>
              <a
                href="mailto:info@umes.edu.gt"
                className="w-fit text-sm text-white/60 transition-colors hover:text-white"
              >
                info@umes.edu.gt
              </a>
              <a href="tel:+50224138021" className="w-fit text-sm text-white/60 transition-colors hover:text-white">
                2413 8021
              </a>
              <a
                href="https://www.umes.edu.gt"
                target="_blank"
                rel="noopener noreferrer"
                className="w-fit text-sm text-white/60 transition-colors hover:text-white"
              >
                www.umes.edu.gt
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
                    className="group flex items-baseline gap-2 text-sm text-white/60 transition-colors duration-300 ease-snap hover:text-white"
                  >
                    <span className="font-semibold">{s.label}</span>
                    <span className="truncate text-[11px] text-white/30 group-hover:text-white/50">{s.handle}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-7 text-xs text-white/40 sm:flex-row sm:items-center">
          <span>© {new Date().getFullYear()} ISEL · Universidad Mesoamericana. Todos los derechos reservados.</span>
          <a
            href="https://www.umes.edu.gt/politica-de-privacidad"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-white/80"
          >
            Política de Privacidad
          </a>
        </div>
      </div>
    </footer>
  );
}
