import { useEffect, useState } from "react";

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
  /**
   * Avisa del tamaño real del archivo en cuanto carga. Lo usa la sección de
   * Dirección para adoptar la proporción de la foto y no ampliarla por encima
   * de sus píxeles: ampliar es exactamente lo que la vuelve borrosa.
   */
  onNaturalSize?: (width: number, height: number) => void;
}

/**
 * Formatos que se prueban con el MISMO nombre base antes de dar la imagen por
 * ausente. Es lo que evita tener que tocar código cuando la foto que llega es
 * .png y aquí está declarada como .jpg: basta con dejar el archivo en su
 * carpeta con el nombre correcto, en cualquiera de estas extensiones.
 */
const FORMATS = ["jpg", "jpeg", "png", "webp", "avif"];

/** ["/x/foto.jpg", "/x/foto.jpeg", "/x/foto.png", …] — la declarada va primera. */
function candidates(src: string): string[] {
  const dot = src.lastIndexOf(".");
  if (dot < 0) return [src];
  const base = src.slice(0, dot);
  const declared = src.slice(dot + 1).toLowerCase();
  return [src, ...FORMATS.filter((f) => f !== declared).map((f) => `${base}.${f}`)];
}

/**
 * Muestra la imagen si existe en /public; si no, dibuja un marcador tratado
 * como parte del diseño —no como un error—: campo tintado con el acento
 * vigente, un glifo grande y el nombre exacto del archivo esperado.
 *
 * Para publicar la foto real basta copiarla en frontend/public/images/... con
 * el nombre que indica el marcador y CUALQUIERA de las extensiones de FORMATS.
 * Cero cambios de código.
 */
export function ImageSlot({
  src,
  alt,
  label,
  className = "",
  tone = "light",
  glyph,
  decorative = false,
  onNaturalSize,
}: ImageSlotProps) {
  const [attempt, setAttempt] = useState(0);
  const list = candidates(src);
  const current = list[attempt];

  // Si cambia la ruta declarada (p. ej. al navegar a otra maestría) se vuelve a
  // empezar por su formato original en lugar de arrastrar el intento anterior.
  useEffect(() => {
    setAttempt(0);
  }, [src]);

  const fileBase = (src.split("/").pop() ?? src).replace(/\.[^.]+$/, "");

  if (current === undefined) {
    if (decorative) return null;

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
          {fileBase}.jpg · .png · .webp
        </code>
      </div>
    );
  }

  return (
    <img
      key={current}
      src={current}
      alt={alt}
      loading="lazy"
      decoding="async"
      onLoad={(e) => {
        const img = e.currentTarget;
        onNaturalSize?.(img.naturalWidth, img.naturalHeight);
      }}
      onError={() => setAttempt((n) => n + 1)}
      className={`h-full w-full object-cover ${className}`}
    />
  );
}
