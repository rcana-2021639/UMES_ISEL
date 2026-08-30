import { RevealOnScroll, SplitHeading } from "./RevealOnScroll";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  tone?: "light" | "dark";
  className?: string;
}

/**
 * Arranque de sección: etiqueta corta + titular que se revela palabra por
 * palabra + bajada opcional. Alineado a la izquierda por defecto: la retícula
 * editorial da más carácter que el clásico bloque centrado.
 */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  tone = "light",
  className = "",
}: SectionHeadingProps) {
  const dark = tone === "dark";
  const alignment = align === "center" ? "items-center text-center mx-auto" : "items-start text-left";

  return (
    <div className={`flex max-w-3xl flex-col gap-5 ${alignment} ${className}`}>
      {eyebrow && (
        <RevealOnScroll y={12}>
          <span className={`eyebrow ${dark ? "text-isel-gold" : "text-[var(--accent)]"}`}>{eyebrow}</span>
        </RevealOnScroll>
      )}
      <SplitHeading
        text={title}
        className={`text-balance font-display text-[clamp(2rem,4.6vw,3.4rem)] font-semibold leading-[1.04] ${
          dark ? "text-white" : "text-isel-navy"
        }`}
      />
      {description && (
        <RevealOnScroll delay={0.12}>
          <p
            className={`max-w-2xl text-[15px] leading-relaxed sm:text-lg ${
              dark ? "text-white/65" : "text-isel-ink/65"
            }`}
          >
            {description}
          </p>
        </RevealOnScroll>
      )}
    </div>
  );
}
