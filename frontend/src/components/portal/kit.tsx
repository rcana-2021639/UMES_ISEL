import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Icon, Sweep } from "./Icon";

/**
 * Piezas compartidas del portal (acceso, estudiante y panel).
 *
 * Antes cada pantalla repetía sus propias clases: tres `inputClass` distintos
 * copiados a mano, botones-píldora sueltos y colores traídos de la rampa por
 * defecto de Tailwind (emerald-500, sky-100, purple-700, red-600) que no
 * pertenecen a la marca. Aquí viven una sola vez, con los tokens de ISEL.
 *
 * El gesto de los controles es siempre el mismo y nunca escala superficies
 * grandes: cambia el color con curva propia, se abre un aro de foco con
 * box-shadow (no cuesta layout) y el elemento sube 1px. Eso se dibuja nítido
 * en cualquier pantalla, a diferencia de los rellenos que crecen o se recortan.
 */

/* ------------------------------------------------------------------ campos */

export const fieldClass =
  "w-full rounded-xl border border-isel-line bg-white px-3.5 py-2.5 text-[14px] text-isel-ink placeholder:text-isel-ink/30 " +
  "transition-[border-color,box-shadow,background-color] duration-300 ease-crisp " +
  "hover:border-isel-ink/25 " +
  "focus:border-isel-emerald focus:outline-none focus:shadow-[0_0_0_4px_rgba(18,133,92,0.14)] " +
  "disabled:cursor-default disabled:border-isel-line/70 disabled:bg-isel-paper disabled:text-isel-ink/55";

export function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-[0.14em] text-isel-ink/45">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11.5px] leading-snug text-isel-ink/40">{hint}</span>}
    </label>
  );
}

/* ------------------------------------------------------------------ botones */

type Tone = "primary" | "accent" | "ghost" | "danger" | "quiet" | "onDark";
type Size = "sm" | "md";

const toneClass: Record<Tone, string> = {
  primary:
    "bg-isel-navy text-white hover:bg-isel-navy2 hover:shadow-[0_0_0_4px_rgba(20,73,60,0.16)] active:bg-isel-deep",
  accent:
    "bg-isel-emerald text-white hover:bg-isel-emerald2 hover:shadow-[0_0_0_4px_rgba(18,133,92,0.2)] active:bg-isel-emerald2",
  ghost:
    "border border-isel-line bg-white text-isel-ink/75 hover:border-isel-navy/35 hover:text-isel-navy hover:shadow-[0_0_0_4px_rgba(20,73,60,0.09)]",
  danger:
    "border border-isel-alert/25 bg-white text-isel-alert hover:border-transparent hover:bg-isel-alert hover:text-white hover:shadow-[0_0_0_4px_rgba(178,58,43,0.16)]",
  quiet: "text-isel-ink/60 hover:bg-isel-navy/[0.06] hover:text-isel-navy",
  onDark:
    "border border-white/20 text-white/85 hover:border-transparent hover:bg-white hover:text-isel-deep hover:shadow-[0_0_0_4px_rgba(255,255,255,0.16)]",
};

const sizeClass: Record<Size, string> = {
  sm: "gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px]",
  md: "gap-2 rounded-xl px-4 py-2.5 text-[13.5px]",
};

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  tone?: Tone;
  size?: Size;
  icon?: Parameters<typeof Icon>[0]["name"];
  /** El icono va detrás del texto (para "siguiente", "abrir"…). */
  iconRight?: boolean;
  disabled?: boolean;
  /** Sustituye el contenido por la barra de espera sin cambiar de tamaño. */
  loading?: boolean;
  full?: boolean;
  className?: string;
  title?: string;
}

/**
 * Botón del portal. Deliberadamente distinto del `ActionButton` del sitio
 * público —aquel es una píldora en versalita, hecha para dos llamadas por
 * pantalla; aquí hay veinte controles por vista y necesitan densidad— pero de
 * la misma familia: mismo aro de foco, misma elevación de 1px, mismas curvas.
 */
export function PortalButton({
  children,
  onClick,
  type = "button",
  tone = "primary",
  size = "md",
  icon,
  iconRight = false,
  disabled = false,
  loading = false,
  full = false,
  className = "",
  title,
}: ButtonProps) {
  const glyph = icon && (
    <Icon
      name={icon}
      size={size === "sm" ? 14 : 16}
      className={`transition-transform duration-500 ease-snap ${
        iconRight ? "group-hover/pb:translate-x-0.5" : "group-hover/pb:-translate-x-0.5"
      }`}
    />
  );

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
      className={`group/pb relative inline-flex select-none items-center justify-center font-semibold
        transition-[background-color,color,border-color,box-shadow,transform] duration-[400ms] ease-crisp
        hover:-translate-y-px active:translate-y-0 active:scale-[0.985]
        disabled:pointer-events-none disabled:opacity-45
        ${sizeClass[size]} ${toneClass[tone]} ${full ? "w-full" : ""} ${className}`}
    >
      <span className={`inline-flex items-center ${size === "sm" ? "gap-1.5" : "gap-2"} ${loading ? "opacity-0" : ""}`}>
        {!iconRight && glyph}
        {children}
        {iconRight && glyph}
      </span>
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center px-5">
          <Sweep />
        </span>
      )}
    </button>
  );
}

/** Acción de fila: solo icono, con etiqueta accesible y globo nativo. */
export function IconButton({
  icon,
  label,
  onClick,
  tone = "quiet",
  disabled = false,
}: {
  icon: Parameters<typeof Icon>[0]["name"];
  label: string;
  onClick: () => void;
  tone?: "quiet" | "danger";
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-[background-color,color,box-shadow] duration-300 ease-crisp disabled:pointer-events-none disabled:opacity-40 ${
        tone === "danger"
          ? "text-isel-ink/40 hover:bg-isel-alert/10 hover:text-isel-alert"
          : "text-isel-ink/45 hover:bg-isel-navy/[0.07] hover:text-isel-navy"
      }`}
    >
      <Icon name={icon} size={16} />
    </button>
  );
}

/* ------------------------------------------------------- control segmentado */

/**
 * Elección entre 2–4 opciones.
 *
 * La pastilla activa se MIDE (offsetLeft / offsetWidth del botón real) en vez
 * de repartir el ancho a partes iguales. Ese era el fallo del panel: las
 * etiquetas no miden lo mismo ("Todas" contra "Presencial"), `flex-1` no puede
 * encoger un botón por debajo de su contenido, y la pastilla calculada como
 * 100/n quedaba corrida y el texto se salía. Midiendo, da igual lo que midan
 * las etiquetas.
 */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  size = "md",
  disabled = false,
  className = "",
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
  size?: "sm" | "md";
  disabled?: boolean;
  className?: string;
}) {
  const index = options.findIndex((o) => o.value === value);
  const pad = size === "sm" ? "px-3 py-1.5 text-[12px]" : "px-4 py-2 text-[13px]";
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const [pill, setPill] = useState<{ x: number; w: number } | null>(null);

  useLayoutEffect(() => {
    function measure() {
      const el = refs.current[index];
      if (!el) {
        setPill(null);
        return;
      }
      setPill({ x: el.offsetLeft, w: el.offsetWidth });
    }
    measure();
    window.addEventListener("resize", measure);
    // Las fuentes llegan después del primer pintado y cambian los anchos.
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    fonts?.ready.then(measure).catch(() => {});
    return () => window.removeEventListener("resize", measure);
  }, [index, options.length, size]);

  return (
    <div
      role="group"
      className={`relative inline-flex rounded-xl border border-isel-line bg-white p-1 ${
        disabled ? "opacity-55" : ""
      } ${className}`}
    >
      {pill && (
        <span
          aria-hidden
          className="absolute inset-y-1 left-0 rounded-lg bg-isel-navy transition-[transform,width] duration-500 ease-snap"
          style={{ width: pill.w, transform: `translateX(${pill.x}px)` }}
        />
      )}
      {options.map((o, i) => (
        <button
          key={String(o.value)}
          type="button"
          ref={(el) => {
            refs.current[i] = el;
          }}
          disabled={disabled}
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={`relative z-10 whitespace-nowrap rounded-lg font-semibold transition-colors duration-300 ease-crisp disabled:cursor-default ${pad} ${
            o.value === value ? "text-white" : "text-isel-ink/55 hover:text-isel-navy"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------- mensajería */

/**
 * Aviso. Antes un error era una línea de texto rojo suelta bajo el botón —se
 * perdía y no decía qué hacer. Aquí ocupa un bloque con su icono, su color de
 * marca y sitio para instrucciones.
 */
export function Alert({ kind = "error", children }: { kind?: "error" | "info" | "ok"; children: ReactNode }) {
  const map = {
    error: { icon: "alert" as const, cls: "border-isel-alert/25 bg-isel-alert/[0.06] text-isel-alert" },
    info: { icon: "info" as const, cls: "border-isel-sky/25 bg-isel-sky/[0.07] text-isel-sky" },
    ok: { icon: "check" as const, cls: "border-isel-emerald/25 bg-isel-emerald/[0.07] text-isel-emerald2" },
  }[kind];

  return (
    <div role="status" className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-[13px] leading-relaxed ${map.cls}`}>
      <Icon name={map.icon} size={16} className="mt-0.5" />
      <span className="flex-1">{children}</span>
    </div>
  );
}

/** Estado vacío con voz propia: dice qué falta y qué hacer, no "Sin resultados". */
export function EmptyState({
  icon = "search",
  title,
  hint,
}: {
  icon?: Parameters<typeof Icon>[0]["name"];
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-isel-line bg-isel-paper text-isel-ink/30">
        <Icon name={icon} size={20} />
      </span>
      <p className="mt-4 font-display text-[15px] font-semibold text-isel-navy">{title}</p>
      {hint && <p className="mt-1.5 max-w-[42ch] text-[13px] leading-relaxed text-isel-ink/50">{hint}</p>}
    </div>
  );
}

/** Espera con forma: tres carriles que barren, no la palabra "Cargando…". */
export function Loading({ label = "Cargando" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-isel-ink/35">
      <span className="w-40 text-isel-emerald">
        <Sweep />
      </span>
      <p className="text-[12px] font-semibold uppercase tracking-[0.16em]">{label}</p>
    </div>
  );
}

/* ------------------------------------------------------------------- chips */

export function Chip({
  children,
  icon,
  tone = "neutral",
}: {
  children: ReactNode;
  icon?: Parameters<typeof Icon>[0]["name"];
  tone?: "neutral" | "gold" | "emerald" | "sky" | "plum" | "alert" | "onDark";
}) {
  const cls = {
    neutral: "border-isel-line bg-white text-isel-ink/65",
    gold: "border-isel-gold/35 bg-isel-gold/10 text-isel-gold2",
    emerald: "border-isel-emerald/25 bg-isel-emerald/10 text-isel-emerald2",
    sky: "border-isel-sky/25 bg-isel-sky/10 text-isel-sky",
    plum: "border-isel-plum/25 bg-isel-plum/10 text-isel-plum",
    alert: "border-isel-alert/25 bg-isel-alert/10 text-isel-alert",
    onDark: "border-white/15 bg-white/[0.07] text-white/75",
  }[tone];

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11.5px] font-semibold ${cls}`}
    >
      {icon && <Icon name={icon} size={13} />}
      {children}
    </span>
  );
}
