/**
 * Un nombre, escrito una sola vez.
 *
 * La ficha de preinscripción pide "Nombre completo" en un único campo, pero la
 * ficha de asignación lo pide partido en cuatro (primer/segundo apellido,
 * primer/segundo nombre) porque así viene el formato oficial. Obligar a
 * teclearlo dos veces era la forma segura de que las dos fichas del mismo
 * expediente terminaran con nombres distintos.
 *
 * Estas funciones traducen entre los dos formatos. El reparto es una
 * SUGERENCIA —los cuatro campos siguen siendo editables— porque ningún
 * algoritmo acierta siempre: "María José Ruiz" puede ser dos nombres y un
 * apellido o un nombre y dos apellidos, y solo la persona lo sabe.
 */

/**
 * Palabras que no son un apellido por sí solas: se pegan a la siguiente pieza,
 * para que "de León" o "de la Cruz" cuenten como un apellido y no como dos.
 */
const PARTICULAS = new Set([
  "de",
  "del",
  "la",
  "las",
  "los",
  "san",
  "santa",
  "y",
  "da",
  "das",
  "dos",
  "di",
  "van",
  "von",
  "mac",
  "mc",
]);

export interface NombrePartes {
  primerNombre: string;
  segundoNombre: string;
  primerApellido: string;
  segundoApellido: string;
}

/** Lo que aceptan `joinNombreCompleto`/`nombreNatural`: las fichas guardan `null` en los opcionales. */
type PartesSueltas = { [K in keyof NombrePartes]?: string | null };

const VACIO: NombrePartes = { primerNombre: "", segundoNombre: "", primerApellido: "", segundoApellido: "" };

/** Agrupa las partículas con la palabra que las sigue: ["de","la","Cruz"] → ["de la Cruz"]. */
function agrupar(texto: string): string[] {
  const piezas: string[] = [];
  let pendiente: string[] = [];
  for (const palabra of texto.replace(/\s+/g, " ").trim().split(" ")) {
    if (!palabra) continue;
    if (PARTICULAS.has(palabra.toLowerCase())) {
      pendiente.push(palabra);
      continue;
    }
    piezas.push([...pendiente, palabra].join(" "));
    pendiente = [];
  }
  // Una partícula suelta al final no tiene a qué pegarse; se queda como está.
  if (pendiente.length) piezas.push(pendiente.join(" "));
  return piezas;
}

/** La primera pieza va sola; todo lo demás se junta en la segunda. */
function partirEnDos(texto: string): [string, string] {
  const piezas = agrupar(texto);
  if (piezas.length === 0) return ["", ""];
  return [piezas[0], piezas.slice(1).join(" ")];
}

/**
 * "Nombre completo" → las cuatro casillas de la ficha de asignación.
 *
 * Acepta los dos órdenes que se usan en la práctica:
 * - "Pérez López, Juan Carlos" (el formato que imprime la propia ficha), y
 * - "Juan Carlos Pérez López", donde se asume que las dos últimas piezas son
 *   los apellidos — la convención guatemalteca.
 */
export function splitNombreCompleto(nombreCompleto: string | null | undefined): NombrePartes {
  const limpio = (nombreCompleto ?? "").replace(/\s+/g, " ").trim();
  if (!limpio) return { ...VACIO };

  if (limpio.includes(",")) {
    const [apellidos, ...resto] = limpio.split(",");
    const [primerApellido, segundoApellido] = partirEnDos(apellidos);
    const [primerNombre, segundoNombre] = partirEnDos(resto.join(" "));
    return { primerNombre, segundoNombre, primerApellido, segundoApellido };
  }

  const piezas = agrupar(limpio);
  switch (piezas.length) {
    case 0:
      return { ...VACIO };
    case 1:
      return { ...VACIO, primerNombre: piezas[0] };
    case 2:
      return { ...VACIO, primerNombre: piezas[0], primerApellido: piezas[1] };
    case 3:
      return { ...VACIO, primerNombre: piezas[0], primerApellido: piezas[1], segundoApellido: piezas[2] };
    default: {
      // 4 o más: las dos últimas son los apellidos, el resto son los nombres.
      const apellidos = piezas.slice(-2);
      const nombres = piezas.slice(0, -2);
      return {
        primerNombre: nombres[0] ?? "",
        segundoNombre: nombres.slice(1).join(" "),
        primerApellido: apellidos[0],
        segundoApellido: apellidos[1],
      };
    }
  }
}

/** Las cuatro casillas → "Apellidos, Nombres", el formato que guarda el backend. */
export function joinNombreCompleto(partes: PartesSueltas): string {
  const apellidos = [partes.primerApellido, partes.segundoApellido].filter((s) => s?.trim()).join(" ");
  const nombres = [partes.primerNombre, partes.segundoNombre].filter((s) => s?.trim()).join(" ");
  if (!apellidos) return nombres;
  if (!nombres) return apellidos;
  return `${apellidos}, ${nombres}`;
}

/** Las cuatro casillas → "Nombres Apellidos", como se lee en una carta. */
export function nombreNatural(partes: PartesSueltas): string {
  return [partes.primerNombre, partes.segundoNombre, partes.primerApellido, partes.segundoApellido]
    .filter((s) => s?.trim())
    .join(" ");
}
