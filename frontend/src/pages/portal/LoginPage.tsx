import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useReducedMotion } from "framer-motion";
import { loginAdmin, loginEstudiante } from "@/lib/auth";
import { ApiError } from "@/lib/http";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { Icon } from "@/components/portal/Icon";
import { Alert, PortalButton, Segmented, fieldClass } from "@/components/portal/kit";

/**
 * Asignación — acceso al portal.
 *
 * La mitad oscura no repite el documento al que entras (antes había una ficha
 * de papel dibujada, con sus casillas y su sello: decoración que fingía ser un
 * formulario y confundía sobre dónde había que escribir). En su lugar hay un
 * emblema: tres anillos concéntricos girando a ritmos distintos y, sobre
 * ellos, un arco que **se dibuja mientras tecleas** —un noveno de vuelta por
 * dígito— con nueve marcas que se encienden una a una.
 *
 * Es una sola pieza abstracta, sin texto que competir, y hace un trabajo real:
 * confirma de un vistazo cuántos dígitos llevas y remata con un check cuando
 * el carné está completo. Si el carné no existe, el emblema entero se tiñe del
 * rojo de la marca y se sacude: el error aparece donde estabas mirando.
 *
 * El botón de volver ya no es un enlace tenue al pie de la columna: es la
 * primera pieza de la mitad clara, una cápsula con borde y flecha, para que
 * salir de aquí nunca haya que buscarlo.
 */

const PASOS = [
  { icon: "layers" as const, text: "Eliges tu maestría y el trimestre que vas a cursar." },
  { icon: "check" as const, text: "Revisas los cursos que se te asignan y agregas los adicionales." },
  { icon: "pen" as const, text: "Firmas tu ficha y la envías." },
];

/** Nº de dígitos del carné que el emblema cuenta. Los de la UMES son de 9. */
const SLOTS = 9;

type Modo = "alumno" | "admin";

export function LoginPage() {
  // Dos puertas separadas en vez de una caja que aceptaba "un carné o el código
  // de admin". Con una sola, la misma petición podía acabar en el panel
  // administrativo y probar valores al azar tenía como premio mayor el control
  // total; además obligaba a que el mensaje de error sirviera para los dos
  // casos, que es como se acaba diciendo de más.
  const [modo, setModo] = useState<Modo>("alumno");

  const [value, setValue] = useState("");
  const [correo, setCorreo] = useState("");
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [entered, setEntered] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reduce = useReducedMotion();

  useEffect(() => {
    document.title = "Asignación | Portal ISEL";
    const id = window.setTimeout(() => setEntered(true), 40);
    return () => window.clearTimeout(id);
  }, []);

  const puedeEnviar =
    modo === "alumno" ? value.trim().length > 0 && correo.trim().length > 0 : usuario.trim().length > 0 && password.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!puedeEnviar || loading) return;
    setLoading(true);
    setError(null);
    try {
      if (modo === "alumno") {
        await loginEstudiante(value.trim(), correo.trim());
        const programa = searchParams.get("programa");
        navigate(`/portal/estudiante${programa ? `?programa=${programa}` : ""}`);
      } else {
        await loginAdmin(usuario.trim(), password);
        navigate("/portal/admin");
      }
    } catch (err) {
      // El mensaje del servidor es deliberadamente ambiguo (no dice si falló el
      // usuario o la contraseña) y ya viene redactado para leerse; se muestra
      // tal cual en vez de inventar aquí uno que diga de más.
      setError(err instanceof ApiError ? err.message : "No se pudo conectar con el servidor. Revisa tu conexión.");
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
        {/* El campo verde se aviva mientras el campo tiene el foco: la mitad
            oscura acusa recibo de que estás escribiendo al otro lado. */}
        <div
          aria-hidden
          className={`pointer-events-none absolute -left-40 top-4 h-[34rem] w-[34rem] animate-drift rounded-full bg-isel-emerald blur-[130px] transition-opacity duration-[1200ms] ease-snap ${
            focused ? "opacity-40" : "opacity-25"
          }`}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-48 -right-24 h-[28rem] w-[28rem] animate-drift2 rounded-full bg-isel-gold/10 blur-[130px]"
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
              Asignación de cursos
            </span>
            <h1
              className={`mt-6 max-w-[12ch] text-balance font-display text-[clamp(2.2rem,4.6vw,3.4rem)] font-semibold leading-[0.98] tracking-ultratight text-white ${beat} ${state}`}
              style={delay(240)}
            >
              Tu ficha empieza aquí
            </h1>

            {modo === "alumno" && (
              <div className={`mt-10 flex justify-center lg:justify-start ${beat} ${state}`} style={delay(380)}>
                <CarnetOrb value={value} error={error !== null} reduce={!!reduce} />
              </div>
            )}
          </div>

          <p className={`flex items-center gap-2.5 text-[12.5px] text-white/35 ${beat} ${state}`} style={delay(620)}>
            <Icon name="lock" size={14} />
            {modo === "alumno"
              ? "Tu carné y tu correo institucional: los dos, para que nadie entre por ti."
              : "Acceso administrativo. Cada cuenta tiene su propia contraseña."}
          </p>
        </div>
      </section>

      {/* ---------------------------------------------------------- el campo */}
      <section className="flex items-center justify-center px-6 py-14 sm:px-10 lg:px-14">
        <div className="w-full max-w-[26rem]">
          {/* Salida siempre a la vista: lo primero de la columna, con forma de
              botón —no un enlace gris al fondo que hay que ir a buscar. */}
          <div className={`mb-8 ${beat} ${state}`} style={delay(200)}>
            <BackButton to="/">Volver al inicio</BackButton>
          </div>

          <div className={`${beat} ${state}`} style={delay(260)}>
            <Segmented
              value={modo}
              onChange={(m) => {
                setModo(m);
                setError(null);
              }}
              options={[
                { value: "alumno" as const, label: "Soy alumno" },
                { value: "admin" as const, label: "Administración" },
              ]}
            />
          </div>

          <div className={`mt-8 ${beat} ${state}`} style={delay(300)}>
            <p className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-isel-gold2">
              {modo === "alumno" ? "Ingreso de estudiantes" : "Ingreso administrativo"}
            </p>
            <h2 className="mt-3 font-display text-[1.9rem] font-semibold leading-[1.05] tracking-ultratight text-isel-navy">
              {modo === "alumno" ? "Escribe tu carné" : "Entra con tu cuenta"}
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-isel-ink/55">
              {modo === "alumno"
                ? "Tu carné y tu correo institucional (@umes.edu.gt), tal como los tiene la Universidad."
                : "La cuenta que te dieron para administrar el portal. Si es la primera vez, se te pedirá cambiar la contraseña."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className={`mt-9 ${beat} ${state}`} style={delay(420)}>
            {modo === "alumno" ? (
              <>
                <label className="block">
                  <span className="mb-3 block text-[10.5px] font-bold uppercase tracking-[0.16em] text-isel-ink/45">
                    Número de carné
                  </span>

                  <div className="relative">
                    <input
                      autoFocus
                      inputMode="numeric"
                      autoComplete="username"
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
                        error ? "bg-isel-alert" : "bg-isel-emerald"
                      } ${focused || value ? "scale-x-100" : "scale-x-0"}`}
                    />
                  </div>
                </label>

                <label className="mt-7 block">
                  <span className="mb-2 block text-[10.5px] font-bold uppercase tracking-[0.16em] text-isel-ink/45">
                    Correo institucional
                  </span>
                  <input
                    // type="text" y NO "email": la ayuda de abajo dice que basta
                    // con lo que va antes de la arroba, y con type="email" el
                    // navegador rechaza eso con su propia validación y bloquea el
                    // envío SIN mensaje — el botón simplemente no hacía nada.
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
                    El de @umes.edu.gt. Si no te lo sabes completo, basta con lo que va antes de la arroba.
                  </span>
                </label>
              </>
            ) : (
              <>
                <label className="block">
                  <span className="mb-2 block text-[10.5px] font-bold uppercase tracking-[0.16em] text-isel-ink/45">
                    Usuario
                  </span>
                  <input
                    autoFocus
                    autoComplete="username"
                    value={usuario}
                    onChange={(e) => {
                      setUsuario(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="tu.usuario"
                    aria-invalid={error !== null}
                    className={fieldClass}
                  />
                </label>

                <label className="mt-6 block">
                  <span className="mb-2 block text-[10.5px] font-bold uppercase tracking-[0.16em] text-isel-ink/45">
                    Contraseña
                  </span>
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    aria-invalid={error !== null}
                    className={fieldClass}
                  />
                </label>
              </>
            )}

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
              disabled={!puedeEnviar}
              className="mt-8 py-3.5 text-[14px]"
            >
              Entrar al portal
            </PortalButton>
          </form>

          {/* Qué pasa después de pulsar. Va aquí, junto al botón, y no al otro
              lado de la pantalla: es donde alguien duda antes de entrar. */}
          <div className={`mt-10 border-t border-isel-line pt-7 ${beat} ${state}`} style={delay(540)}>
            <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-isel-ink/40">Lo que sigue</p>
            <ol className="mt-4 space-y-3.5">
              {PASOS.map((p, i) => (
                <li key={p.text} className="flex items-start gap-3">
                  <span className="mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-isel-navy/[0.06] text-isel-navy/70">
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

/**
 * Salida de una pantalla sin navegación. Se usa igual en el acceso de
 * Asignación y en el de Inscripción: cápsula con borde de 2px, flecha en su
 * propio disco que retrocede al pasar el cursor y relleno sólido en hover.
 * Tiene el peso de un botón porque hace falta que se vea, no el de un enlace.
 */
export function BackButton({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="group/back inline-flex items-center gap-2.5 rounded-full border-2 border-isel-navy/20 bg-white py-2.5 pl-2.5 pr-5 text-[12.5px] font-bold uppercase tracking-[0.1em] text-isel-navy shadow-card transition-[background-color,border-color,color,box-shadow,transform] duration-500 ease-snap hover:-translate-y-px hover:border-transparent hover:bg-isel-navy hover:text-white hover:shadow-[0_0_0_4px_rgba(20,73,60,0.16)]"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-isel-navy/[0.08] text-isel-navy transition-[background-color,color,transform] duration-500 ease-snap group-hover/back:-translate-x-1 group-hover/back:bg-white/20 group-hover/back:text-white">
        <Icon name="arrowLeft" size={14} />
      </span>
      {children}
    </Link>
  );
}

/**
 * El emblema del acceso: anillos que giran, un arco que se dibuja con lo que
 * escribes y nueve marcas que se van encendiendo. Sin texto de formulario y
 * sin fingir un documento — solo el progreso del carné, en grande.
 */
function CarnetOrb({ value, error, reduce }: { value: string; error: boolean; reduce: boolean }) {
  const digits = value.replace(/\D/g, "").slice(0, SLOTS);
  const filled = digits.length;
  const completo = filled >= SLOTS;
  const progress = filled / SLOTS;

  const R = 118;
  const CIRC = 2 * Math.PI * R;
  const tono = error ? "#B23A2B" : completo ? "#12855C" : "#E8B33D";

  // Marcas: una por dígito, empezando arriba y girando en el sentido del reloj.
  const marcas = Array.from({ length: SLOTS }, (_, i) => {
    const a = ((i / SLOTS) * 360 - 90) * (Math.PI / 180);
    return { x: 160 + R * Math.cos(a), y: 160 + R * Math.sin(a), on: i < filled };
  });

  // Punta del arco: el punto que "va escribiendo" la vuelta.
  const headA = ((progress * 360 - 90) * Math.PI) / 180;
  const head = { x: 160 + R * Math.cos(headA), y: 160 + R * Math.sin(headA) };

  return (
    <div
      className={`relative h-[17rem] w-[17rem] shrink-0 sm:h-[19rem] sm:w-[19rem] ${
        error && !reduce ? "animate-shake" : ""
      }`}
      aria-hidden
    >
      {/* Halo de remate: solo aparece cuando el carné ya está completo. */}
      {completo && !error && !reduce && (
        <span className="absolute inset-6 animate-halo rounded-full border border-isel-emerald/60" />
      )}

      <svg viewBox="0 0 320 320" className="absolute inset-0 h-full w-full">
        <defs>
          <radialGradient id="orb-core" cx="50%" cy="42%" r="62%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Tres anillos punteados, ritmos distintos — mismo sistema que el hero. */}
        <g className={reduce ? "" : "animate-spin-slow"} style={{ transformOrigin: "160px 160px" }}>
          <circle cx="160" cy="160" r="150" fill="none" stroke="rgba(255,255,255,0.14)" strokeDasharray="2 13" />
        </g>
        <g
          className={reduce ? "" : "animate-spin-slow"}
          style={{ transformOrigin: "160px 160px", animationDuration: "68s", animationDirection: "reverse" }}
        >
          <circle cx="160" cy="160" r="139" fill="none" stroke="rgba(255,255,255,0.09)" strokeDasharray="1 19" />
        </g>
        <g className={reduce ? "" : "animate-spin-slow"} style={{ transformOrigin: "160px 160px", animationDuration: "96s" }}>
          <circle cx="160" cy="160" r="84" fill="none" stroke="rgba(255,255,255,0.10)" strokeDasharray="3 11" />
        </g>

        <circle cx="160" cy="160" r="104" fill="url(#orb-core)" />

        {/* Carril + arco de progreso: un noveno de vuelta por dígito. */}
        <circle cx="160" cy="160" r={R} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth={2} />
        <circle
          cx="160"
          cy="160"
          r={R}
          fill="none"
          stroke={tono}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC * (1 - progress)}
          transform="rotate(-90 160 160)"
          style={{ transition: "stroke-dashoffset 700ms cubic-bezier(0.16,1,0.3,1), stroke 500ms ease" }}
        />

        {marcas.map((m, i) => (
          <circle
            key={i}
            cx={m.x}
            cy={m.y}
            r={m.on ? 5 : 3}
            fill={m.on ? tono : "rgba(255,255,255,0.18)"}
            style={{ transition: "r 400ms cubic-bezier(0.34,1.56,0.64,1), fill 400ms ease" }}
          />
        ))}

        {filled > 0 && !completo && (
          <circle
            cx={head.x}
            cy={head.y}
            r={8}
            fill={tono}
            opacity={0.22}
            style={{ transition: "cx 700ms cubic-bezier(0.16,1,0.3,1), cy 700ms cubic-bezier(0.16,1,0.3,1)" }}
          />
        )}
      </svg>

      {/* Núcleo: el contador, o el remate cuando ya está completo. */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {completo && !error ? (
          <>
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-isel-emerald text-white">
              <Icon name="check" size={26} />
            </span>
            <p className="mt-4 font-display text-[15px] font-semibold text-white">Carné completo</p>
            <p className="mt-1.5 text-[10.5px] font-bold uppercase tracking-[0.18em] text-white/40">
              Ya puedes entrar
            </p>
          </>
        ) : (
          <>
            <p
              className="tabular font-display text-[3.6rem] font-semibold leading-none tracking-ultratight transition-colors duration-500 ease-crisp"
              style={{ color: error ? "#B23A2B" : filled ? "#ffffff" : "rgba(255,255,255,0.32)" }}
            >
              {filled}
              <span className="text-[1.6rem] text-white/30">/{SLOTS}</span>
            </p>
            <p className="mt-3 text-[10.5px] font-bold uppercase tracking-[0.18em] text-white/40">
              {error ? "Carné no encontrado" : filled ? "Dígitos escritos" : "Esperando tu carné"}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
