import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import type { Student } from "@/types/student";

/**
 * La ficha, como objeto.
 *
 * Este portal no gestiona "registros": gestiona un papel concreto —la ficha de
 * asignación de cursos— que se imprime, se firma y se entrega. Así que el
 * momento memorable de la vista del estudiante es ese papel, dibujado como
 * papel: tres hojas apiladas en perspectiva, con su encabezado institucional,
 * el nombre a mano alzada del titular y el renglón de firma esperando.
 *
 * Se inclina siguiendo el puntero, pero muy poco (7° como máximo) y con las
 * hojas de atrás moviéndose a distinta profundidad, que es lo que da el
 * relieve. No es el balanceo genérico de una foto: es el gesto de levantar una
 * hoja de la mesa, y solo tiene sentido aquí.
 *
 * Se apaga entero con `prefers-reduced-motion` y en punteros gruesos (táctil),
 * donde un "hover" no existe y el efecto solo estorbaría.
 */
export function FichaCard({ student }: { student: Student }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
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

  const onMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!live) return;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      setTilt({ x: -py * 12, y: px * 14 });
    },
    [live],
  );

  const fecha = new Date().toLocaleDateString("es-GT", { day: "2-digit", month: "2-digit", year: "numeric" });

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={() => setTilt({ x: 0, y: 0 })}
      className="relative mx-auto w-full max-w-[21rem] [perspective:1200px] lg:mx-0"
      aria-hidden
    >
      <div
        className="preserve-3d relative transition-transform duration-[700ms] ease-snap"
        style={{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}
      >
        {/* Dos hojas debajo, a distinta profundidad: son las que hacen el relieve. */}
        <span
          className="absolute inset-0 rounded-[1.1rem] border border-white/10 bg-white/[0.07]"
          style={{ transform: "translate3d(14px, 16px, -60px)" }}
        />
        <span
          className="absolute inset-0 rounded-[1.1rem] border border-white/10 bg-white/[0.12]"
          style={{ transform: "translate3d(7px, 8px, -30px)" }}
        />

        {/* La hoja de arriba. */}
        <div className="relative overflow-hidden rounded-[1.1rem] bg-isel-paper px-6 py-6 shadow-lift">
          {/* Trama de renglones muy tenue: papel, no tarjeta de producto. */}
          <span
            className="pointer-events-none absolute inset-0 opacity-[0.5]"
            style={{
              backgroundImage: "repeating-linear-gradient(to bottom, rgba(20,73,60,0.055) 0 1px, transparent 1px 26px)",
            }}
          />

          <div className="relative flex items-center justify-between gap-3 border-b border-isel-navy/15 pb-3">
            <p className="text-[8.5px] font-bold uppercase tracking-[0.16em] text-isel-navy/60">
              Universidad Mesoamericana
            </p>
            <p className="text-[8.5px] font-bold uppercase tracking-[0.22em] text-isel-gold2">ISEL</p>
          </div>

          <p className="relative mt-4 font-display text-[13px] font-bold uppercase tracking-[0.1em] text-isel-navy">
            Ficha de asignación
            <br />
            de cursos
          </p>

          <dl className="relative mt-5 grid grid-cols-2 gap-x-4 gap-y-3">
            <div>
              <dt className="text-[8px] font-bold uppercase tracking-[0.14em] text-isel-ink/40">Carné</dt>
              <dd className="tabular mt-0.5 text-[13px] font-semibold text-isel-navy">{student.carnet}</dd>
            </div>
            <div>
              <dt className="text-[8px] font-bold uppercase tracking-[0.14em] text-isel-ink/40">Fecha</dt>
              <dd className="tabular mt-0.5 text-[13px] font-semibold text-isel-navy">{fecha}</dd>
            </div>
          </dl>

          <div className="relative mt-4">
            <dt className="text-[8px] font-bold uppercase tracking-[0.14em] text-isel-ink/40">Estudiante</dt>
            <p className="mt-1 font-display text-[15px] font-semibold leading-tight tracking-tightest text-isel-navy">
              {student.nombreCompleto}
            </p>
          </div>

          {/* Renglón de firma: lo que el estudiante va a completar al final. */}
          <div className="relative mt-7 flex items-end gap-4">
            <div className="flex-1">
              <span className="block h-px w-full bg-isel-navy/25" />
              <p className="mt-1.5 text-[8px] font-bold uppercase tracking-[0.14em] text-isel-ink/35">
                Firma del estudiante
              </p>
            </div>

            {/* Sello. Fijo, sin girar: un sello no gira. */}
            <span
              className="relative flex h-12 w-12 shrink-0 -rotate-[9deg] items-center justify-center rounded-full border-2 border-isel-gold/45"
              style={{ transform: "translateZ(24px) rotate(-9deg)" }}
            >
              <span className="absolute inset-1 rounded-full border border-isel-gold/30" />
              <span className="font-display text-[8.5px] font-bold uppercase tracking-[0.14em] text-isel-gold2">
                ISEL
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------- */

interface FichaStackProps {
  loaded: boolean;
  /** "Hoy" / "Esta semana" / "Este mes". */
  rangeLabel: string | null;
  /** Las fechas de verdad: "del 1 al 31 de agosto de 2026". */
  rangeText: string | null;
  total: number;
  link: number;
  presencial: number;
}

/**
 * La misma pila de papel, del lado del panel: el objeto del administrador es
 * el mismo que el del estudiante, solo que en montón.
 *
 * La primera versión de esta tarjeta no se entendía —el propio usuario lo dijo—
 * y con razón: ponía "Fichas cargadas / Este mes / 1 / Link de pago 1 /
 * Presencial 0" sin decir en ningún momento QUÉ fechas eran "este mes", ni que
 * el 1 y el 0 de abajo eran un desglose de ese 1 de arriba. Tres cifras
 * sueltas, sin relación visible entre ellas.
 *
 * Ahora la hoja se lee como una frase de arriba abajo: cuántas fichas, de qué
 * fechas exactas, y en qué se reparten —con porcentaje y barra, para que se vea
 * que las dos partes suman el total—.
 */
export function FichaStack({ loaded, rangeLabel, rangeText, total, link, presencial }: FichaStackProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
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

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!live) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setTilt({ x: -((e.clientY - r.top) / r.height - 0.5) * 10, y: ((e.clientX - r.left) / r.width - 0.5) * 12 });
  }

  const sinTipo = Math.max(0, total - link - presencial);

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={() => setTilt({ x: 0, y: 0 })}
      className="relative mx-auto w-full max-w-[21rem] [perspective:1200px] lg:mx-0"
    >
      <div
        className="preserve-3d relative transition-transform duration-[700ms] ease-snap"
        style={{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}
      >
        <span
          aria-hidden
          className="absolute inset-0 rounded-[1.1rem] border border-white/10 bg-white/[0.07]"
          style={{ transform: "translate3d(14px, 16px, -60px)" }}
        />
        <span
          aria-hidden
          className="absolute inset-0 rounded-[1.1rem] border border-white/10 bg-white/[0.12]"
          style={{ transform: "translate3d(7px, 8px, -30px)" }}
        />

        <div className="relative overflow-hidden rounded-[1.1rem] bg-isel-paper px-6 py-5 shadow-lift">
          <div className="flex items-center justify-between gap-3 border-b border-isel-navy/15 pb-3">
            <p className="text-[8.5px] font-bold uppercase tracking-[0.16em] text-isel-navy/60">
              Fichas guardadas
            </p>
            {rangeLabel && (
              <p className="text-[8.5px] font-bold uppercase tracking-[0.16em] text-isel-gold2">{rangeLabel}</p>
            )}
          </div>

          {loaded ? (
            <>
              <div className="mt-4 flex items-baseline gap-2.5">
                <p className="tabular font-display text-[3.2rem] font-semibold leading-[0.85] tracking-ultratight text-isel-navy">
                  {total}
                </p>
                <p className="text-[13px] font-semibold text-isel-ink/50">{total === 1 ? "ficha" : "fichas"}</p>
              </div>
              {rangeText && <p className="mt-2 text-[12px] leading-snug text-isel-ink/50">{rangeText}</p>}

              <p className="mt-6 text-[8px] font-bold uppercase tracking-[0.14em] text-isel-ink/40">
                Cómo van a pagar
              </p>
              <div className="mt-3 space-y-3.5">
                <Split label="Link de pago" value={link} total={total} color="#2C6E8F" />
                <Split label="Presencial" value={presencial} total={total} color="#6D5AA8" />
                {sinTipo > 0 && <Split label="Sin especificar" value={sinTipo} total={total} color="#A9A296" />}
              </div>
            </>
          ) : (
            <>
              <p className="mt-5 font-display text-[15px] font-semibold leading-snug text-isel-navy">
                Todavía no has elegido fechas
              </p>
              <p className="mt-2 pb-3 text-[12.5px] leading-relaxed text-isel-ink/50">
                Pulsa <strong className="font-semibold text-isel-navy">Hoy</strong>,{" "}
                <strong className="font-semibold text-isel-navy">Semana</strong> o{" "}
                <strong className="font-semibold text-isel-navy">Mes</strong> ahí abajo y aquí verás cuántas fichas se
                guardaron en ese periodo.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Una parte del total: cifra, porcentaje y barra proporcional. */
function Split({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[11.5px] font-semibold text-isel-ink/65">{label}</p>
        <p className="tabular text-[12px] font-semibold text-isel-ink/40">
          <span className="text-[13.5px] font-bold" style={{ color }}>
            {value}
          </span>
          <span className="ml-1.5">· {pct}%</span>
        </p>
      </div>
      <span className="mt-1.5 block h-[4px] w-full overflow-hidden rounded-full bg-isel-navy/10">
        <span
          className="block h-full origin-left rounded-full transition-transform duration-[900ms] ease-snap"
          style={{ backgroundColor: color, transform: `scaleX(${pct / 100})` }}
        />
      </span>
    </div>
  );
}
