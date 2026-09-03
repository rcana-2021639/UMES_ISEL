import { useEffect, useId, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { Icon } from "./Icon";

/**
 * "Qué tengo que hacer aquí" — la guía de cada paso.
 *
 * Quien llena estas fichas no es quien las diseñó: en su mayoría entra una
 * sola vez en su vida, desde el teléfono, y muchas veces sin haber llenado un
 * formulario en línea antes. El encabezado del panel dice QUÉ es el paso, pero
 * no decía CÓMO se hace, y esa era la parte que faltaba: la gente llegaba, veía
 * los campos y no sabía por dónde empezar ni qué pasaba al terminar.
 *
 * Reglas de este bloque, para que ayude en vez de estorbar:
 *
 * - Tres o cuatro renglones, nunca un muro de texto. Un renglón = una acción.
 * - Se habla de tú y en presente ("Escribe tu nombre…"), sin jerga y sin
 *   "deberá proceder a". La voz es la de alguien sentado al lado, no la de un
 *   reglamento.
 * - Siempre se dice qué pasa al final del paso, que es la duda de verdad:
 *   ¿esto se guardó?, ¿puedo irme?, ¿lo perdí?
 * - Se puede cerrar. Quien ya lo entendió lo pliega y no lo vuelve a ver en
 *   esa sesión; quien vuelve al día siguiente lo encuentra abierto otra vez.
 *
 * El plegado usa la transición de `grid-template-rows` de 0fr a 1fr: es la
 * única forma de animar "hasta el alto que ocupe el contenido" sin medir nada
 * con JavaScript, así que no hay ningún cálculo que pueda dejar el bloque
 * recortado o en blanco. Con `prefers-reduced-motion` simplemente aparece.
 */

export interface StepGuideProps {
  /** Los pasos, en el orden en que se hacen. Tres o cuatro; nunca más de cinco. */
  steps: string[];
  /**
   * El remate: qué pasa cuando se termina el paso. Va aparte de la lista
   * porque no es una acción del usuario, es la respuesta a "¿y ahora qué?".
   */
  outcome?: string;
  /** Encabezado del bloque. Solo se cambia si el paso pide otra promesa. */
  title?: string;
}

/**
 * El acento del paso, rebajado.
 *
 * Va en `style` y no en clase de Tailwind a propósito: en Tailwind 3 el
 * modificador de opacidad (`bg-[var(--x)]/25`) no funciona sobre una variable
 * CSS —el compilador no sabe qué color hay dentro, así que no puede inyectar
 * el canal alfa y la regla se pierde en silencio—. `color-mix` sí lo resuelve
 * en el navegador, que es quien conoce el valor.
 */
const tint = (pct: number) => `color-mix(in srgb, var(--accent) ${pct}%, transparent)`;

export function StepGuide({ steps, outcome, title = "Cómo se llena este paso" }: StepGuideProps) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(true);
  const [shown, setShown] = useState(false);
  const panelId = useId();

  // La cascada de renglones arranca un latido después de montar, no al hacer
  // scroll: cuando el paso ya está en pantalla el bloque tiene que estar ahí.
  useEffect(() => {
    const id = window.setTimeout(() => setShown(true), 60);
    return () => window.clearTimeout(id);
  }, []);

  const on = reduce || shown;

  return (
    <div
      className="mb-6 overflow-hidden rounded-xl border"
      style={{ borderColor: tint(24), backgroundColor: tint(6) }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="group/guia flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span
          aria-hidden
          style={{ backgroundColor: tint(15) }}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[var(--accent)] transition-transform duration-500 ease-back group-hover/guia:scale-110"
        >
          <Icon name="info" size={14} />
        </span>
        <span className="flex-1 text-[12.5px] font-bold uppercase tracking-[0.13em] text-[var(--accent)]">
          {title}
        </span>
        <span
          aria-hidden
          className={`shrink-0 text-[var(--accent)] transition-transform duration-500 ease-snap ${
            open ? "rotate-180" : "rotate-0"
          }`}
        >
          <Icon name="chevronDown" size={16} />
        </span>
      </button>

      <div
        id={panelId}
        className="grid transition-[grid-template-rows] duration-[600ms] ease-snap"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <ol className="px-4 pb-4 pt-0.5">
            {steps.map((s, i) => (
              <li
                key={s}
                style={{ transitionDelay: reduce ? "0ms" : `${120 + i * 70}ms` }}
                className={`flex gap-3 py-1.5 transition-[opacity,transform] duration-[600ms] ease-snap ${
                  on ? "translate-x-0 opacity-100" : "-translate-x-1.5 opacity-0"
                }`}
              >
                <span
                  aria-hidden
                  className="tabular mt-[3px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-bold leading-none text-white"
                >
                  {i + 1}
                </span>
                <span className="flex-1 text-[13.5px] leading-relaxed text-isel-ink/75">{s}</span>
              </li>
            ))}

            {outcome && (
              <li
                style={{ transitionDelay: reduce ? "0ms" : `${140 + steps.length * 70}ms`, borderTopColor: tint(20) }}
                className={`mt-2.5 flex gap-3 border-t pt-3 transition-[opacity,transform] duration-[600ms] ease-snap ${
                  on ? "translate-x-0 opacity-100" : "-translate-x-1.5 opacity-0"
                }`}
              >
                <span aria-hidden className="mt-[2px] shrink-0 text-[var(--accent)]">
                  <Icon name="check" size={14} />
                </span>
                <span className="flex-1 text-[13px] leading-relaxed text-isel-ink/60">{outcome}</span>
              </li>
            )}
          </ol>
        </div>
      </div>
    </div>
  );
}
