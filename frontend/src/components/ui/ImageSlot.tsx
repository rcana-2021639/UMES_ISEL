import { useState } from "react";

interface ImageSlotProps {
  /** Ruta relativa a /public, p. ej. "/images/programs/fintech.jpg" */
  src: string;
  alt: string;
  label?: string;
  className?: string;
  /** Sobre fondo oscuro el marcador se invierte para no abrir un hueco blanco. */
  tone?: "light" | "dark";
  /** Texto grande del marcador (inicial, número de programa…). */
  glyph?: string;
  /**
   * Imagen puramente decorativa (fondos): si el archivo no existe no dibuja
   * marcador alguno — el fondo se queda limpio en lugar de mostrar un cartel.
   */
  decorative?: boolean;
}

/**
 * Muestra la imagen si existe en /public; si no, dibuja un marcador tratado
 * como parte del diseño —no como un error—: campo tintado con el acento
 * vigente, un glifo grande y el nombre exacto del archivo esperado.
 *
 * Para publicar la foto real basta copiarla en frontend/public/images/... con
 * el nombre que indica el marcador. Cero cambios de código.
 */
export function ImageSlot({ src, alt, label, className = "", tone = "light", glyph, decorative = false }: ImageSlotProps) {
  const [failed, setFailed] = useState(false);
  const fileName = src.split("/").pop();

  if (failed && decorative) return null;

  if (failed) {
    const dark = tone === "dark";
    return (
      <div
        className={`relative flex h-full w-full flex-col items-center justify-center overflow-hidden px-6 py-10 text-center ${
          dark ? "bg-white/[0.04]" : "bg-[var(--accent-soft)]"
        } ${className}`}
      >
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.5]"
          style={{
            backgroundImage: `repeating-linear-gradient(135deg, ${
              dark ? "rgba(255,255,255,0.05)" : "var(--accent)"
            } 0 1px, transparent 1px 12px)`,
            opacity: dark ? 1 : 0.09,
          }}
        />
        <span
          className={`relative font-display text-6xl font-semibold leading-none tracking-tightest ${
            dark ? "text-white/25" : "text-[var(--accent)] opacity-30"
          }`}
        >
          {glyph ?? "ISEL"}
        </span>
        <p
          className={`relative mt-4 max-w-[22ch] text-[11px] font-semibold uppercase tracking-[0.16em] ${
            dark ? "text-white/50" : "text-isel-ink/45"
          }`}
        >
          {label ?? "Imagen pendiente"}
        </p>
        <code
          className={`relative mt-2 rounded-full px-3 py-1 text-[10px] leading-relaxed ${
            dark ? "bg-white/10 text-white/60" : "bg-isel-navy/[0.06] text-isel-ink/55"
          }`}
        >
          {fileName}
        </code>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`h-full w-full object-cover ${className}`}
    />
  );
}
