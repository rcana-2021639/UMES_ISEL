/**
 * El contrato que las fichas del expediente le ofrecen a la página.
 *
 * ── Por qué existe ──────────────────────────────────────────────────────────
 * Cada ficha se guarda por su cuenta, con su propio botón. Está bien: son
 * largas y nadie quiere perder tres pantallas de datos porque la cuarta tenga
 * un campo mal. Pero al final del expediente había un botón rotulado «Guardar
 * todo y salir» que NO guardaba nada — solo cerraba la sesión. Quien llenaba
 * las cuatro fichas sin pulsar los cuatro botones y remataba con ese salía
 * convencido de haber enviado su inscripción, y en el panel del administrador
 * aparecía vacía. Al volver con su DPI, también vacía. Es el peor fallo
 * posible: el que no avisa.
 *
 * Con este contrato el rótulo pasa a ser verdad. La página le pregunta a cada
 * ficha si le queda algo sin mandar y, si lo hay, lo manda antes de salir. Si
 * una ficha no puede guardarse (le falta un campo obligatorio), lo dice y NO se
 * sale: el aspirante se queda exactamente donde tiene que corregir.
 */
export interface FichaHandle {
  /** Nombre de la ficha, para poder nombrarla en los avisos. */
  nombre: string;

  /** Ancla de la sección, para poder llevar al aspirante hasta ella. */
  anclaId: string;

  /**
   * ¿Hay algo escrito que todavía no ha viajado al servidor?
   *
   * `false` en una ficha intacta —aunque esté vacía—, para que «guardar todo»
   * no intente mandar fichas que nadie tocó.
   */
  tieneCambios(): boolean;

  /**
   * Guarda esta ficha. Devuelve `null` si quedó guardada, o el motivo por el
   * que no se pudo (campo obligatorio vacío, error del servidor…), que es el
   * mismo texto que la ficha muestra en su propio aviso.
   */
  guardar(): Promise<string | null>;
}
