import { ImageSlot } from "@/components/ui/ImageSlot";

const SOCIALS = [
  { label: "Facebook", href: "https://www.facebook.com/mesoamericana" },
  { label: "Instagram", href: "https://www.instagram.com/mesoamericana/" },
  { label: "WhatsApp", href: "https://api.whatsapp.com/send?phone=50224138021" },
  { label: "YouTube", href: "https://www.youtube.com/@UniversidadMesoamericana" },
  { label: "X", href: "https://x.com/UMES_Guatemala" },
  { label: "LinkedIn", href: "https://www.linkedin.com/school/universidad-mesoamericana" },
  { label: "TikTok", href: "https://www.tiktok.com/@umesguatemala" },
];

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-isel-navy">
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-3">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 overflow-hidden rounded-full bg-white/10">
                <ImageSlot src="/images/hero/logo-umes.png" alt="Logo Universidad Mesoamericana" label="Logo UMES" />
              </div>
              <div className="h-12 w-12 overflow-hidden rounded-full bg-white/10">
                <ImageSlot src="/images/hero/logo-isel.png" alt="Logo ISEL" label="Logo ISEL" />
              </div>
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-white/60">
              Instituto Salesiano de Educación en Línea — Universidad Mesoamericana. Programas de maestría 100%
              online, con acompañamiento sincrónico y asincrónico.
            </p>
          </div>

          <div className="flex flex-col gap-3 text-sm text-white/70">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-isel-gold">Contacto</span>
            <a href="mailto:info@umes.edu.gt" className="w-fit transition-colors hover:text-white">
              info@umes.edu.gt
            </a>
            <span>2413 8021</span>
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-isel-gold">Síguenos</span>
            <div className="flex flex-wrap gap-2">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-white/70 transition-colors duration-300 hover:border-isel-gold hover:text-isel-gold"
                >
                  {s.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-white/50 sm:flex-row">
          <span>© {new Date().getFullYear()} ISEL · Universidad Mesoamericana. Todos los derechos reservados.</span>
          <a href="https://www.umes.edu.gt/politica-de-privacidad" className="hover:text-white/80">
            Política de Privacidad
          </a>
        </div>
      </div>
    </footer>
  );
}
