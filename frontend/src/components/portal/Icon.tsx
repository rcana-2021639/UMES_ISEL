/**
 * Iconografía del portal.
 *
 * Sustituye a los emoji que había antes (📄 💾 🖨️ 🗂️ ✍️ 🧹 📅 🔎 ⚠️ ✔ ✕ ↩).
 * Un emoji se dibuja con la fuente del sistema: cambia de forma entre Windows,
 * Android y iOS, no se apoya en la línea base del texto y —lo decisivo aquí—
 * no puede tomar el color de la marca. Estos trazos sí: heredan `currentColor`,
 * comparten grosor (1.6) y terminación redonda, y se alinean con la tipografía.
 */

type Name =
  | "arrowRight"
  | "arrowLeft"
  | "arrowDown"
  | "check"
  | "close"
  | "plus"
  | "minus"
  | "trash"
  | "pencil"
  | "printer"
  | "calendar"
  | "search"
  | "eye"
  | "logout"
  | "pen"
  | "eraser"
  | "save"
  | "alert"
  | "info"
  | "users"
  | "user"
  | "file"
  | "layers"
  | "card"
  | "mail"
  | "phone"
  | "chevronDown"
  | "chevronRight"
  | "lock"
  | "repeat"
  | "sparkle";

/** Trazos sueltos; el <svg> pone viewBox, grosor y terminaciones. */
const PATHS: Record<Name, string> = {
  arrowRight: "M4 12h16M14 6l6 6-6 6",
  arrowLeft: "M20 12H4M10 18l-6-6 6-6",
  arrowDown: "M12 4v16M6 14l6 6 6-6",
  check: "M4 12.5l5.5 5.5L20 6.5",
  close: "M6 6l12 12M18 6L6 18",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  trash: "M4 7h16M9 7V4.5h6V7M6.5 7l.8 12.2a1.4 1.4 0 001.4 1.3h6.6a1.4 1.4 0 001.4-1.3L17.5 7M10 11v6M14 11v6",
  pencil: "M4 20h4L20 8a2.1 2.1 0 10-3-3L5 17v3zM15 6l3 3",
  printer: "M7 9V3.5h10V9M7 18H5.2A2.2 2.2 0 013 15.8v-3.6A2.2 2.2 0 015.2 10h13.6A2.2 2.2 0 0121 12.2v3.6a2.2 2.2 0 01-2.2 2.2H17M7 14.5h10v6H7v-6z",
  calendar: "M4 8.5h16M8 3.5v3M16 3.5v3M5.5 6h13A1.5 1.5 0 0120 7.5v11a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 014 18.5v-11A1.5 1.5 0 015.5 6z",
  search: "M11 18.5a7.5 7.5 0 100-15 7.5 7.5 0 000 15zM16.5 16.5L21 21",
  eye: "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 14.6a2.6 2.6 0 100-5.2 2.6 2.6 0 000 5.2z",
  logout: "M14 8V5.5A1.5 1.5 0 0012.5 4h-6A1.5 1.5 0 005 5.5v13A1.5 1.5 0 006.5 20h6a1.5 1.5 0 001.5-1.5V16M10 12h11M18 8.5l3 3.5-3 3.5",
  pen: "M3 20.5c3-.6 4.6-1.6 6.2-3.2L19.4 7.1a2.2 2.2 0 10-3.1-3.1L6.1 14.2C4.5 15.8 3.6 17.5 3 20.5zM14.8 5.6l3.1 3.1",
  eraser: "M9 20H5.5L3.4 17.9a1.6 1.6 0 010-2.3L13.2 5.8a1.6 1.6 0 012.3 0l5.2 5.2a1.6 1.6 0 010 2.3L14 20.2M9 20h11.5M8 11l5.2 5.2",
  save: "M6 4h9l4 4v11a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 015 19V5.5A1.5 1.5 0 016.5 4zM8.5 4v5h6V4M8.5 20v-5.5h7V20",
  alert: "M12 4.5l8.5 15h-17l8.5-15zM12 10v4.2M12 17.2v.1",
  info: "M12 21a9 9 0 100-18 9 9 0 000 18zM12 11v6M12 7.5v.1",
  users: "M15.5 20v-1.6a3.6 3.6 0 00-3.6-3.6H6.6A3.6 3.6 0 003 18.4V20M9.2 11.4a3.7 3.7 0 100-7.4 3.7 3.7 0 000 7.4zM21 20v-1.6a3.6 3.6 0 00-2.7-3.5M15.8 4.2a3.7 3.7 0 010 7.1",
  user: "M19 20v-1.8a4 4 0 00-4-4H9a4 4 0 00-4 4V20M12 10.5a3.7 3.7 0 100-7.4 3.7 3.7 0 000 7.4z",
  file: "M14 3.5H7.5A1.5 1.5 0 006 5v14a1.5 1.5 0 001.5 1.5h9A1.5 1.5 0 0018 19V7.5l-4-4zM14 3.5v4h4M9 12.5h6M9 16h4",
  layers: "M12 3.5l8.5 4.3-8.5 4.3-8.5-4.3L12 3.5zM3.5 12.2l8.5 4.3 8.5-4.3M3.5 16.3l8.5 4.2 8.5-4.2",
  card: "M3.5 7.5h17A1.5 1.5 0 0122 9v7.5a1.5 1.5 0 01-1.5 1.5h-17A1.5 1.5 0 012 16.5V9a1.5 1.5 0 011.5-1.5zM6 14.5h4M14.5 11.5h3.5M14.5 14.5h3.5",
  mail: "M4 5.5h16A1.5 1.5 0 0121.5 7v10a1.5 1.5 0 01-1.5 1.5H4A1.5 1.5 0 012.5 17V7A1.5 1.5 0 014 5.5zM3 7l9 6.2L21 7",
  phone: "M7.5 3.5h9A1.5 1.5 0 0118 5v14a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 016 19V5a1.5 1.5 0 011.5-1.5zM10.5 17.3h3",
  chevronDown: "M6 9.5l6 6 6-6",
  chevronRight: "M9.5 6l6 6-6 6",
  lock: "M7 10.5V8a5 5 0 0110 0v2.5M6 10.5h12a1.4 1.4 0 011.4 1.4v7.2A1.4 1.4 0 0118 20.5H6a1.4 1.4 0 01-1.4-1.4v-7.2A1.4 1.4 0 016 10.5z",
  repeat: "M4 9.5V8a2.5 2.5 0 012.5-2.5H19M16 2.5l3 3-3 3M20 14.5V16a2.5 2.5 0 01-2.5 2.5H5M8 21.5l-3-3 3-3",
  sparkle: "M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9L12 3.5z",
};

interface IconProps {
  name: Name;
  /** Lado en px. El grosor del trazo se compensa para que no engorde al reducir. */
  size?: number;
  className?: string;
}

export function Icon({ name, size = 18, className = "" }: IconProps) {
  return (
    <svg
      aria-hidden
      focusable="false"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

/**
 * Espera indeterminada. Una barra que barre su carril, no un círculo girando:
 * el círculo es el gesto por defecto de cualquier plantilla y no dice nada
 * sobre lo que se está haciendo; la barra sugiere que se recorre una lista.
 */
export function Sweep({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`relative block h-[3px] w-full overflow-hidden rounded-full ${className}`}
    >
      <span className="absolute inset-0 rounded-full bg-current opacity-[0.15]" />
      <span className="absolute inset-y-0 left-0 w-1/4 animate-sweep rounded-full bg-current" />
    </span>
  );
}
