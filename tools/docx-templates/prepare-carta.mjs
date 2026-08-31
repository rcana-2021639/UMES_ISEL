// Prepara Resources/CartaCompromisoTemplate.docx a partir del FORMATO real — misma filosofía que
// prepare-preinscripcion.mjs: inserta tokens {{...}} de texto plano en los renglones en blanco
// (subrayados) y junto a cada documento del checklist, sin tocar el diseño original. Ver el
// comentario de ese script para el porqué del enfoque.
import fs from "node:fs";

const docPath = process.argv[2];
let xml = fs.readFileSync(docPath, "utf8");
const edits = [];

function run(token, sz = null) {
  const rPr = sz ? `<w:rPr><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr>` : "";
  return `<w:r>${rPr}<w:t xml:space="preserve">${token}</w:t></w:r>`;
}

/** Reemplaza el CONTENIDO del run <w:t>exactText</w:t> más cercano a approxIndex por `token`. */
function replaceRunNear(approxIndex, exactText, token) {
  const windowStart = Math.max(0, approxIndex - 30);
  const windowEnd = approxIndex + exactText.length + 30;
  const slice = xml.slice(windowStart, windowEnd);
  const re = new RegExp(`(<w:t\\b[^>]*>)${exactText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(<\\/w:t>)`);
  const m = re.exec(slice);
  if (!m) throw new Error(`No se encontró el run ${JSON.stringify(exactText)} cerca de ${approxIndex}`);
  const from = windowStart + m.index;
  const to = from + m[0].length;
  edits.push({ from, to, replacement: `${m[1]}${token}${m[2]}` });
}

/** Vacía el run <w:t>exactText</w:t> más cercano a approxIndex (para los subrayados de relleno sobrantes). */
function blankRunNear(approxIndex, exactText) {
  replaceRunNear(approxIndex, exactText, "");
}

/** Como replaceRunNear, pero el contenido se localiza con un cuerpo de regex (para blancos con espacios/guiones que no se pueden transcribir a mano con exactitud). */
function replaceRunPatternNear(approxIndex, regexBody, token, windowRadius = 80) {
  const windowStart = Math.max(0, approxIndex - windowRadius);
  const windowEnd = approxIndex + windowRadius;
  const slice = xml.slice(windowStart, windowEnd);
  const re = new RegExp(`(<w:t\\b[^>]*>)${regexBody}(<\\/w:t>)`);
  const m = re.exec(slice);
  if (!m) throw new Error(`No se encontró el patrón /${regexBody}/ cerca de ${approxIndex}`);
  const from = windowStart + m.index;
  const to = from + m[0].length;
  edits.push({ from, to, replacement: `${m[1]}${token}${m[2]}` });
}

/** Inserta `insertXml` justo después de <w:t>exactText</w:t></w:r> más cercano a approxIndex. */
function insertAfterRunNear(approxIndex, exactText, insertXml) {
  const windowStart = Math.max(0, approxIndex - 30);
  const windowEnd = approxIndex + exactText.length + 60;
  const slice = xml.slice(windowStart, windowEnd);
  const re = new RegExp(`<w:t\\b[^>]*>${exactText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}<\\/w:t>\\s*<\\/w:r>`);
  const m = re.exec(slice);
  if (!m) throw new Error(`No se encontró el run ${JSON.stringify(exactText)} cerca de ${approxIndex}`);
  const at = windowStart + m.index + m[0].length;
  edits.push({ at, insert: insertXml });
}

// ---- Fecha: "Guatemala, ____ _ _____________________ ." -> "Guatemala, {{FECHA}}." ------------
// OJO: replaceRunNear reemplaza solo el TEXTO entre <w:t>...</w:t> (conserva la etiqueta original);
// el token va tal cual, sin envolver en run() — run() arma un <w:r> completo, que es lo que
// insertAfterRunNear necesita (inserta un run HERMANO nuevo), no lo que replaceRunNear necesita.
replaceRunNear(4382, "____", "{{FECHA}}");
blankRunNear(4527, "_");
blankRunNear(4669, "_____________________");

// ---- Carrera: "...en la carrera de _____________________________________________________" -----
replaceRunNear(8702, "_____________________________________________________", "{{CARRERA}}");

// ---- Checklist nacional (antes de "Estudiantes Extranjeros") -----------------------------------
insertAfterRunNear(15946, "Fotocopia de DPI autenticada", run(" {{DOC_DPI}}"));
insertAfterRunNear(22010, "2 fotografías en blanco y negro de 3x4 cm impresas en papel mate", run(" {{DOC_FOTOS}}"));
insertAfterRunNear(29161, "edio", run(" {{DOC_TITULO_MEDIO}}"));
insertAfterRunNear(35799, "de Licenciatura", run(" {{DOC_TITULO_LICENCIATURA}}"));

// ---- Checklist extranjero (después de "Estudiantes Extranjeros:") ------------------------------
insertAfterRunNear(49116, "Pasaporte completo autenticado", run(" {{DOC_PASAPORTE}}"));
insertAfterRunNear(55244, "2 fotografías en blanco y negro de 3x4 cm impresas en papel mate", run(" {{DOC_FOTOS_EXTRANJERO}}"));
insertAfterRunNear(63155, "ducación.", run(" {{DOC_TITULO_MEDIO_EXTRANJERO}}"));
insertAfterRunNear(69931, "o y apostillado ", run(" {{DOC_TITULO_PREGRADO}}"));

// ---- Firma: nombre completo / No. DPI --------------------------------------------------------
replaceRunPatternNear(75872, "_+\\s*", "{{NOMBRE_COMPLETO}}");
replaceRunPatternNear(76230, "_+\\s*", "{{NO_DPI}}");

// ---- Firma — el token va DENTRO del párrafo de la línea "F. ___" (no en uno nuevo): la hoja ya
// está al límite exacto de una página, y un párrafo nuevo la corre a una segunda hoja (se comprobó
// al imprimir). El builder en C# la convierte en una imagen FLOTANTE anclada a este mismo párrafo
// (con un desplazamiento negativo para que quede arriba de la línea), así que no ocupa flujo de texto.
{
  const anchor = xml.indexOf("<w:t>F.</w:t>");
  if (anchor === -1) throw new Error('No se encontró la línea "F."');
  const paragraphCloseIdx = xml.indexOf("</w:p>", anchor);
  if (paragraphCloseIdx === -1) throw new Error('No se encontró el cierre del párrafo de "F."');
  edits.push({
    at: paragraphCloseIdx,
    insert: `<w:r><w:t xml:space="preserve">{{FIRMA}}</w:t></w:r>`,
  });
}

// ---- aplica todo en UNA sola pasada, de mayor a menor offset ----------------------------------
// Todos los offsets (from/to de los reemplazos, at de las inserciones) se calcularon buscando sobre
// el `xml` original sin tocar — por eso hay que aplicarlos todos juntos, del offset más alto al más
// bajo, y no en dos pasadas separadas (una pasada de reemplazos primero habría corrido la longitud
// del string e invalidado los `at` calculados para las inserciones que vinieran después en el texto).
edits.sort((a, b) => (b.from ?? b.at) - (a.from ?? a.at));
for (const e of edits) {
  if ("from" in e) {
    xml = xml.slice(0, e.from) + e.replacement + xml.slice(e.to);
  } else {
    xml = xml.slice(0, e.at) + e.insert + xml.slice(e.at);
  }
}

fs.writeFileSync(docPath, xml, "utf8");
console.log(`Carta de compromiso: ${edits.length} ediciones aplicadas.`);
