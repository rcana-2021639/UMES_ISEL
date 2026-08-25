import { RevealOnScroll } from "./RevealOnScroll";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  tone?: "light" | "dark";
}

/**
 * Shared section title pattern: small gold eyebrow label + serif heading
 * with an animated underline + optional supporting paragraph.
 */
export function SectionHeading({ eyebrow, title, description, align = "center", tone = "light" }: SectionHeadingProps) {
  const alignment = align === "center" ? "items-center text-center mx-auto" : "items-start text-left";
  const titleColor = tone === "light" ? "text-isel-navy" : "text-white";
  const descColor = tone === "light" ? "text-isel-ink/70" : "text-white/75";

  return (
    <RevealOnScroll className={`flex max-w-2xl flex-col gap-4 ${alignment}`}>
      {eyebrow && (
        <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-isel-gold">
          <span className="h-px w-8 bg-isel-gold" />
          {eyebrow}
        </span>
      )}
      <h2 className={`text-3xl font-semibold leading-tight sm:text-4xl ${titleColor}`}>{title}</h2>
      {description && <p className={`text-base leading-relaxed sm:text-lg ${descColor}`}>{description}</p>}
    </RevealOnScroll>
  );
}
