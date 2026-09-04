import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useReducedMotion } from "framer-motion";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { Icon } from "@/components/portal/Icon";
import { BackButton } from "@/pages/portal/LoginPage";
import { Alert, PortalButton, fieldClass } from "@/components/portal/kit";
import { accesoSolicitudTitulo } from "@/lib/solicitudTituloApi";
import { ApiError } from "@/lib/http";
import type { SolicitudTitulo } from "@/types/solicitudTitulo";

/**
 * Puerta de "Solicitud de título" — se entra con el carné, igual que al portal de Asignación,
 * porque solo un alumno ya inscrito puede pedir su título.
 *
 * Cada una de las tres puertas del sitio cuenta lo que hay detrás con una sola pieza animada:
 * Asignación tiene un contador en anillo, Inscripción una ruta de cuatro nodos. Aquí es el propio
 * título el que se está preparando — una hoja que se inclina con el puntero, sus renglones
 * trazándose uno a uno conforme escribes el carné, y el sello dorado que CAE sobre el papel cuando
 * el número está completo. No es adorno: los renglones son el avance del carné dígito a dígito y el
 * sello es el "ya puedes entrar".
 */

/** Los carnés de la UMES son de 9 dígitos; es lo que mide la barra de avance del emblema. */
const SLOTS = 9;

const PASOS = [
  { icon: "user" as const, text: "Revise sus datos: el carné, el nombre y la carrera ya aparecen registrados." },
  { icon: "sparkle" as const, text: "Te tomas o subes la fotografía, recortada a la medida de la ficha." },
  { icon: "pen" as const, text: "Registra su firma y descarga la solicitud lista para imprimir." },
];

export function AccesoTituloGate({ onEnter }: { onEnter: (s: SolicitudTitulo) => void }) {
  const [value, setValue] = useState("");
  // Esta ficha guarda la fotografía y la firma del alumno, así que ya no basta
  // el carné: se pide el mismo par de datos que el portal de asignación.
  const [correo, setCorreo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [entered, setEntered] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    const id = window.setTimeout(() => setEntered(true), 40);
    return () => window.clearTimeout(id);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim() || !correo.trim()) return;
    setLoading(true);
    setError(null);
    try {
      onEnter(await accesoSolicitudTitulo(value.trim(), correo.trim()));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No fue posible abrir su solicitud. Intente nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  const on = reduce || entered;
  const beat = "transition-[opacity,transform] duration-[900ms] ease-snap";
  const state = on ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0";
  const delay = (ms: number) => ({ transitionDelay: reduce ? "0ms" : `${ms}ms` });

  return (
    <main className="min-h-screen bg-isel-paper lg:grid lg:min-h-screen lg:grid-cols-[1.08fr_1fr]">
      {/* ---------------------------------------------------- panel de marca */}
      <section className="grain relative flex flex-col overflow-hidden bg-isel-deep px-6 py-10 sm:px-10 lg:px-14 lg:py-14">
        <div className="grid-lines pointer-events-none absolute inset-0 opacity-50" aria-hidden />
        <div
          aria-hidden
          className={`pointer-events-none absolute -right-32 top-0 h-[34rem] w-[34rem] animate-drift rounded-full bg-isel-gold blur-[140px] transition-opacity duration-[1200ms] ease-snap ${
            focused ? "opacity-30" : "opacity-[0.18]"
          }`}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-52 -left-28 h-[30rem] w-[30rem] animate-drift2 rounded-full bg-isel-emerald/30 blur-[140px]"
        />

        <div className="relative mx-auto flex w-full max-w-[31rem] flex-1 flex-col justify-between gap-10">
          <Link to="/" className={`group inline-flex w-fit items-center gap-3 ${beat} ${state}`} style={delay(40)}>
            <span className="h-11 w-11 overflow-hidden rounded-xl bg-white/10 ring-1 ring-white/15 transition-transform duration-500 ease-snap group-hover:scale-105">
              <ImageSlot src="/images/hero/logo-isel.avif" alt="Logo ISEL" label="ISEL" tone="dark" glyph="I" />
            </span>
            <span className="flex flex-col leading-none">
              <span className="font-display text-[15px] font-bold tracking-[0.22em] text-white">ISEL</span>
              <span className="mt-1.5 text-[10px] uppercase tracking-[0.14em] text-white/45">
                Universidad Mesoamericana
              </span>
            </span>
          </Link>

          <div>
            <span className={`eyebrow text-isel-gold ${beat} ${state}`} style={delay(140)}>
              Solicitud de impresión de título
            </span>
            <h1
              className={`mt-6 max-w-[11ch] text-balance font-display text-[clamp(2.2rem,4.6vw,3.4rem)] font-semibold leading-[0.98] tracking-ultratight text-white ${beat} ${state}`}
              style={delay(240)}
            >
              El último trámite
            </h1>

            <div className={`mt-9 flex justify-center lg:justify-start ${beat} ${state}`} style={delay(380)}>
              <TituloSello value={value} error={error !== null} reduce={!!reduce} />
            </div>
          </div>

          <p className={`flex items-center gap-2.5 text-[12.5px] text-white/35 ${beat} ${state}`} style={delay(700)}>
            <Icon name="lock" size={14} />
            Únicamente se requiere su número de carné: este trámite no utiliza contraseña.
          </p>
        </div>
      </section>

      {/* ---------------------------------------------------------- el campo */}
      <section className="flex items-center justify-center px-6 py-14 sm:px-10 lg:px-14">
        <div className="w-full max-w-[26rem]">
          <div className={`mb-8 ${beat} ${state}`} style={delay(200)}>
            <BackButton to="/">Volver al inicio</BackButton>
          </div>

          <div className={`${beat} ${state}`} style={delay(300)}>
            <p className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-isel-gold2">Alumnos por graduarse</p>
            <h2 className="mt-3 font-display text-[1.9rem] font-semibold leading-[1.05] tracking-ultratight text-isel-navy">
              Ingrese su carné
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-isel-ink/55">
              Con ese dato se obtienen su nombre y su carrera tal como están registrados, para que la ficha no contenga errores.
            </p>
          </div>

          <form onSubmit={handleSubmit} className={`mt-9 ${beat} ${state}`} style={delay(420)}>
            <label className="block">
              <span className="mb-3 block text-[10.5px] font-bold uppercase tracking-[0.16em] text-isel-ink/45">
                Número de carné
              </span>
              <div className="relative">
                <input
                  autoFocus
                  inputMode="numeric"
                  value={value}
                  onChange={(e) => {
                    setValue(e.target.value);
                    if (error) setError(null);
                  }}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder="202630503"
                  aria-invalid={error !== null}
                  className="carnet-input w-full border-0 border-b-2 border-isel-line bg-transparent px-0 pb-3 font-display text-[2rem] font-semibold text-isel-navy transition-colors duration-300 ease-crisp placeholder:font-normal placeholder:text-isel-ink/20 focus:outline-none sm:text-[2.4rem]"
                />
                <span
                  aria-hidden
                  className={`absolute -bottom-[2px] left-0 h-[2px] w-full origin-left transition-[transform,background-color] duration-[600ms] ease-snap ${
                    error ? "bg-isel-alert" : "bg-isel-gold2"
                  } ${focused || value ? "scale-x-100" : "scale-x-0"}`}
                />
              </div>
            </label>

            <label className="mt-7 block">
              <span className="mb-2 block text-[10.5px] font-bold uppercase tracking-[0.16em] text-isel-ink/45">
                Correo institucional
              </span>
              <input
                // type="text" y NO "email": se acepta escribir solo la parte
                // anterior a la arroba, y type="email" lo rechazaría en silencio.
                type="text"
                inputMode="email"
                autoComplete="email"
                value={correo}
                onChange={(e) => {
                  setCorreo(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="apellidonombre@umes.edu.gt"
                aria-invalid={error !== null}
                className={fieldClass}
              />
              <span className="mt-2 block text-[12px] leading-snug text-isel-ink/40">
                El de @umes.edu.gt. Basta con lo que va antes de la arroba.
              </span>
            </label>

            {error && (
              <div className="mt-6">
                <Alert kind="error">{error}</Alert>
              </div>
            )}

            <PortalButton
              type="submit"
              tone="accent"
              icon="arrowRight"
              iconRight
              full
              loading={loading}
              disabled={!value.trim() || !correo.trim()}
              className="mt-8 py-3.5 text-[14px]"
            >
              Abrir mi solicitud
            </PortalButton>
          </form>

          <div className={`mt-10 border-t border-isel-line pt-7 ${beat} ${state}`} style={delay(540)}>
            <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-isel-ink/40">Lo que sigue</p>
            <ol className="mt-4 space-y-3.5">
              {PASOS.map((p, i) => (
                <li key={p.text} className="flex items-start gap-3">
                  <span className="mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-isel-gold/[0.14] text-isel-gold2">
                    <Icon name={p.icon} size={12} />
                  </span>
                  <span className="flex-1 text-[13px] leading-relaxed text-isel-ink/60">
                    <span className="tabular mr-1.5 font-display text-[11px] font-bold text-isel-ink/30">0{i + 1}</span>
                    {p.text}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>
    </main>
  );
}

/* ------------------------------------------------------------------------- */

/** Los renglones del título: se trazan de izquierda a derecha conforme entra cada dígito. */
const RENGLONES = [
  { y: 96, x1: 40, x2: 214 },
  { y: 118, x1: 40, x2: 244 },
  { y: 140, x1: 40, x2: 196 },
  { y: 162, x1: 40, x2: 232 },
  { y: 184, x1: 40, x2: 168 },
];

/**
 * El emblema: la hoja del título con sus renglones trazándose y el sello dorado cayendo al final.
 * Se inclina siguiendo el puntero, poco y solo con ratón — el mismo gesto que ya usa el sitio.
 */
function TituloSello({ value, error, reduce }: { value: string; error: boolean; reduce: boolean }) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [fine, setFine] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: fine)");
    const sync = () => setFine(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const live = fine && !reduce;
  const digits = value.replace(/\D/g, "").length;
  const completo = digits >= SLOTS;
  const avance = Math.min(digits / SLOTS, 1);
  const tinta = error ? "#B23A2B" : "#E8B33D";

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!live) return;
    const r = e.currentTarget.getBoundingClientRect();
    setTilt({
      x: -((e.clientY - r.top) / r.height - 0.5) * 9,
      y: ((e.clientX - r.left) / r.width - 0.5) * 11,
    });
  }

  return (
    <div
      onPointerMove={onMove}
      onPointerLeave={() => setTilt({ x: 0, y: 0 })}
      className={`relative w-full max-w-[23rem] [perspective:1200px] ${error && !reduce ? "animate-shake" : ""}`}
      aria-hidden
    >
      {/* Motas de luz subiendo detrás del papel. */}
      {!reduce &&
        [0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="absolute h-1 w-1 animate-mota rounded-full bg-isel-gold/70"
            style={{ left: `${12 + i * 19}%`, top: `${62 + (i % 3) * 9}%`, animationDelay: `${i * 1.1}s` }}
          />
        ))}

      <div
        className="preserve-3d relative transition-transform duration-[700ms] ease-snap"
        style={{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}
      >
        {/* Dos hojas detrás: dan grosor al fajo sin dibujar una sombra falsa. */}
        <span
          className="absolute inset-0 rounded-[0.9rem] border border-white/10 bg-white/[0.05]"
          style={{ transform: "translate3d(13px, 15px, -60px)" }}
        />
        <span
          className="absolute inset-0 rounded-[0.9rem] border border-white/10 bg-white/[0.09]"
          style={{ transform: "translate3d(6px, 7px, -30px)" }}
        />

        <svg viewBox="0 0 300 240" className="relative w-full drop-shadow-[0_24px_50px_rgba(0,0,0,0.45)]">
          <defs>
            <linearGradient id="titulo-papel" x1="0" y1="0" x2="0.4" y2="1">
              <stop offset="0%" stopColor="#FBF8F1" />
              <stop offset="100%" stopColor="#EFE7D6" />
            </linearGradient>
          </defs>

          {/* La hoja */}
          <rect x="6" y="6" width="288" height="228" rx="10" fill="url(#titulo-papel)" />
          {/* Orla interior, en el ámbar de la marca */}
          <rect
            x="18"
            y="18"
            width="264"
            height="204"
            rx="5"
            fill="none"
            stroke={tinta}
            strokeWidth="1.6"
            strokeOpacity="0.5"
            style={{ transition: "stroke 500ms ease" }}
          />

          {/* Escudo pequeño arriba, como el membrete del título */}
          <g opacity="0.85">
            <circle cx="150" cy="52" r="17" fill="none" stroke="#14493C" strokeWidth="1.6" />
            <path d="M150 41 L157 47 V58 A7 7 0 0 1 143 58 V47 Z" fill="#14493C" opacity="0.85" />
          </g>

          {/* Renglones: cada uno se traza cuando el carné llega a su tramo */}
          {RENGLONES.map((r, i) => {
            const largo = r.x2 - r.x1;
            const umbral = i / RENGLONES.length;
            const tramo = Math.max(0, Math.min(1, (avance - umbral) * RENGLONES.length));
            return (
              <line
                key={r.y}
                x1={r.x1}
                y1={r.y}
                x2={r.x2}
                y2={r.y}
                stroke={error ? "#B23A2B" : "#14493C"}
                strokeOpacity={0.55}
                strokeWidth="3.4"
                strokeLinecap="round"
                strokeDasharray={largo}
                strokeDashoffset={largo * (1 - tramo)}
                style={{ transition: "stroke-dashoffset 600ms cubic-bezier(0.16,1,0.3,1), stroke 400ms ease" }}
              />
            );
          })}

          {/* Renglón de firma, siempre presente */}
          <line x1="40" y1="206" x2="150" y2="206" stroke="#14493C" strokeOpacity="0.28" strokeWidth="1.4" />
        </svg>

        {/* El sello: cae sobre el papel en cuanto el carné está completo. */}
        <div
          className={`absolute bottom-[7%] right-[7%] transition-opacity duration-300 ${completo && !error ? "opacity-100" : "opacity-0"}`}
          style={{ transform: "translateZ(30px)" }}
        >
          <span
            key={completo ? "on" : "off"}
            className={`relative flex h-[4.6rem] w-[4.6rem] items-center justify-center rounded-full border-[3px] border-isel-gold bg-isel-gold/15 backdrop-blur-[2px] ${
              completo && !reduce ? "animate-sello" : ""
            }`}
            style={{ transform: "rotate(-9deg)" }}
          >
            <span className="absolute inset-[6px] rounded-full border border-isel-gold/60" />
            <span className="flex flex-col items-center leading-none">
              <span className="font-display text-[9px] font-bold uppercase tracking-[0.16em] text-isel-gold2">UMES</span>
              <span className="mt-1 font-serif text-[15px] italic text-isel-gold2">Título</span>
            </span>
          </span>
        </div>
      </div>

      {/* Pie de estado: dice en palabras lo que el dibujo está contando. */}
      <p className="mt-6 text-center text-[10.5px] font-bold uppercase tracking-[0.18em] lg:text-left">
        <span
          className="transition-colors duration-500 ease-crisp"
          style={{ color: error ? "#B23A2B" : completo ? "#E8B33D" : "rgba(255,255,255,0.4)" }}
        >
          {error
            ? "Carné no encontrado"
            : completo
              ? "Carné completo · puede continuar"
              : digits > 0
                ? `${digits} de ${SLOTS} dígitos`
                : "Ingrese su número de carné"}
        </span>
      </p>
    </div>
  );
}
