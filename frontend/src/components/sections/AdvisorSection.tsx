import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { RevealOnScroll, SplitHeading, useReveal, SNAP } from "@/components/ui/RevealOnScroll";

/**
 * Dirección académica.
 *
 * Registro: retrato editorial de publicación académica. Autoridad tranquila,
 * mucho aire y el rostro como protagonista — no una tarjeta de equipo ni un
 * panel oscuro que se lo traga.
 *
 * Decisiones que sostienen la sección:
 *
 *  · Fondo blanco. Es la única banda realmente clara de la página (hero,
 *    metodología y admisión son oscuras; objetivos, arena), así que el
 *    silencio la destaca más de lo que lo haría otro bloque negro.
 *  · El retrato va montado sobre un bloque verde desplazado, como una
 *    fotografía sobre su passe-partout: enmarca sin recortar.
 *  · Una sola etiqueta en versalita en toda la sección. El cargo va en serif
 *    itálica, que rompe la cadena de mayúsculas y suena a nombramiento.
 *  · La semblanza arranca con capitular y se lee en tinta sobre claro, a 62
 *    caracteres por línea. Es el texto más largo de la página: aquí manda la
 *    lectura, no el efecto.
 *  · Cierra con el monograma y su rúbrica trazándose, como al pie de una
 *    carta. Ese es el momento de la sección, y es de esta persona: no se
 *    puede pegar en ninguna otra página.
 *
 * Fuera quedaron el sello giratorio (adorno sin contenido), la cita que
 * repetía una frase de la propia semblanza, y las cuatro "credenciales" que
 * no salían de ninguna fuente.
 */
export function AdvisorSection() {
  const reduce = useReducedMotion();
  const { ref: portraitRef, shown } = useReveal<HTMLDivElement>(0.25);
  // La semblanza también se revela por CSS: es el contenido de la sección y no
  // puede depender de que arranque nada. Los retrasos van desiguales a
  // propósito (0, 90, 210, 330, 480ms) para que la entrada no suene a metrónomo.
  const { ref: textRef, shown: textShown } = useReveal<HTMLDivElement>(0.2);
  const beat = "transition-[opacity,transform] duration-[900ms] ease-snap";
  const beatState = reduce || textShown ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0";
  /** El retraso va en estilo inline: Tailwind no genera clases construidas al vuelo. */
  const delay = (ms: number) => ({ transitionDelay: reduce ? "0ms" : `${ms}ms` });
  /**
   * El marco adopta la proporción de la foto real y nunca la dibuja más ancha
   * que sus propios píxeles.
   *
   * Antes el marco era 4:5 fijo con la imagen al 110% y un parallax encima: una
   * foto cuadrada de 349px acababa recortada Y ampliada a más de 400px de
   * ancho, que es justo lo que la volvía borrosa. Ahora el marco se adapta a lo
   * que subas: si mañana llega una foto de 1200px, crece sola.
   */
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);

  return (
    <section id="direccion" className="relative overflow-hidden bg-white px-6 py-28 lg:py-40">
      <div className="grid-lines-ink pointer-events-none absolute inset-0 opacity-40" aria-hidden />

      <div className="relative mx-auto max-w-6xl">
        <RevealOnScroll y={12}>
          <span className="eyebrow text-isel-gold2">Dirección académica</span>
        </RevealOnScroll>

        <div className="mt-14 grid grid-cols-1 gap-16 lg:grid-cols-[0.72fr_1fr] lg:gap-20">
          {/* Retrato montado sobre su bloque de color.
              El envoltorio interior es el que manda: la celda del grid se
              estira a la altura de la columna de texto, así que el bloque de
              color medido contra ella se alargaba de más. */}
          <div ref={portraitRef} className="w-full lg:self-center">
            <div
              className="relative mx-auto lg:mx-0"
              style={{ maxWidth: nat ? `${nat.w}px` : "24rem" }}
            >
            <span
              aria-hidden
              className={`absolute -bottom-5 -left-4 top-12 w-full rounded-[1.4rem] bg-isel-navy sm:-bottom-7 sm:-left-7 sm:top-16 transition-transform duration-[1100ms] ease-snap ${
                reduce || shown ? "translate-x-0 translate-y-0" : "-translate-y-6 translate-x-6"
              }`}
            />

            <div
              className="relative w-full overflow-hidden rounded-[1.4rem] bg-isel-paper shadow-lift"
              style={{ aspectRatio: nat ? `${nat.w} / ${nat.h}` : "4 / 5" }}
            >
              {/* Sin ampliación de entrada ni parallax: cualquiera de los dos
                  reescala la foto y en un archivo pequeño eso se ve. */}
              <ImageSlot
                src="/images/advisor/rolando-valdez.avif"
                alt="Retrato del Mgtr. Rolando Valdez"
                label="Mgtr. Rolando Valdez"
                glyph="RV"
                onNaturalSize={(w, h) => setNat({ w, h })}
              />

              {/* Cortina: se retira de abajo hacia arriba, por transición CSS. */}
              {!reduce && (
                <span
                  aria-hidden
                  className={`absolute inset-0 origin-bottom bg-isel-navy transition-transform duration-[1100ms] ease-snap ${
                    shown ? "scale-y-0" : "scale-y-100"
                  }`}
                />
              )}
            </div>

              <span
                aria-hidden
                className={`absolute -bottom-5 left-0 block h-[3px] w-24 origin-left bg-isel-gold sm:-bottom-7 transition-transform delay-500 duration-[900ms] ease-snap ${
                  reduce || shown ? "scale-x-100" : "scale-x-0"
                }`}
              />
            </div>
          </div>

          {/* Semblanza. */}
          <div ref={textRef} className="flex flex-col justify-center">
            <SplitHeading
              text="Mgtr. Rolando Valdez"
              className="font-display text-[clamp(2.5rem,6.2vw,4.6rem)] font-semibold leading-[0.92] tracking-ultratight text-isel-navy"
            />

            <p
              style={delay(90)}
              className={`mt-5 font-serif text-[1.4rem] italic leading-snug text-isel-gold2 sm:text-[1.7rem] ${beat} ${beatState}`}
            >
              Director del Instituto Salesiano de Educación en Línea
            </p>

            <span
              aria-hidden
              style={delay(210)}
              className={`mt-10 block h-px w-full bg-isel-line ${beat} ${beatState}`}
            />

            <p
              style={delay(330)}
              className={`dropcap mt-10 max-w-[62ch] text-[16.5px] leading-[1.85] text-isel-ink/80 sm:text-[17.5px] ${beat} ${beatState}`}
            >
              Educador y administrador con sólida experiencia en coordinación académica, gestión de proyectos y
              docencia en educación superior. Se ha destacado por liderar equipos, diseñar estrategias educativas y
              promover entornos de excelencia mediante una comunicación efectiva y pensamiento analítico.
            </p>

            <p
              style={delay(480)}
              className={`mt-6 max-w-[62ch] text-[16.5px] leading-[1.85] text-isel-ink/80 sm:text-[17.5px] ${beat} ${beatState}`}
            >
              Comprometido con el acompañamiento a jóvenes y la innovación educativa, impulsa programas que generan
              impacto significativo en la formación profesional y humana. Actualmente, desempeña funciones directivas
              con una visión orientada al desarrollo institucional y la transformación educativa.
            </p>

            {/* Cierre: monograma y rúbrica, como al pie de una carta. */}
            <div style={delay(620)} className={`mt-16 flex items-end gap-7 ${beat} ${beatState}`}>
              <div className="relative shrink-0">
                <span className="font-display text-[2.6rem] font-semibold leading-none tracking-ultratight text-isel-navy">
                  RV
                </span>
                <svg
                  aria-hidden
                  viewBox="0 0 160 26"
                  preserveAspectRatio="none"
                  className="absolute -bottom-4 -left-2 h-6 w-[8.5rem] text-isel-gold"
                >
                  <motion.path
                    d="M3 15c22 8 46 9 68 3 12-3 21-9 31-9 9 0 12 6 21 6 6 0 12-2 16-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    whileInView={{ pathLength: 1 }}
                    viewport={{ once: true, amount: 0.8 }}
                    transition={{ duration: 1.2, delay: 0.35, ease: SNAP }}
                  />
                </svg>
              </div>

              <p className="pb-1 text-[13px] leading-relaxed text-isel-ink/45">
                Mgtr. Rolando Valdez
                <br />
                Dirección del ISEL · Universidad Mesoamericana
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
