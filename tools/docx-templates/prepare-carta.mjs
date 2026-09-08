// Prepara Resources/CartaCompromisoTemplate.docx a partir del FORMATO real — misma filosofía que
// prepare-preinscripcion.mjs: inserta tokens {{...}} de texto plano en los renglones en blanco
// (subrayados) y junto a cada documento del checklist, sin tocar el diseño original. Ver el
// comentario de ese script para el porqué del enfoque.
import fs from "node:fs";

const docPath = process.argv[2];
let xml = fs.readFileSync(docPath, "utf8");
// Idempotente: si el document.xml ya trae los tokens (se está re-corriendo sobre una plantilla ya
// preparada) no se vuelven a insertar; las secciones de casillas y del renglón de firma sí se
// rehacen, y también son idempotentes.
const yaConTokens = xml.includes("{{NOMBRE_COMPLETO}}");
const edits = [];

function run(token, sz = null) {
  const rPr = sz ? `<w:rPr><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr>` : "";
  return `<w:r>${rPr}<w:t xml:space="preserve">${token}</w:t></w:r>`;
}

/** Reemplaza el CONTENIDO del run <w:t>exactText</w:t> más cercano a approxIndex por `token`. */
function replaceRunNear(approxIndex, exactText, token) {
  if (yaConTokens) return; // los offsets son los del FORMATO virgen; ya no aplican
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
  if (yaConTokens) return; // los offsets son los del FORMATO virgen; ya no aplican
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
  if (yaConTokens) return; // los offsets son los del FORMATO virgen; ya no aplican
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
if (!yaConTokens) {
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

// ---- casillas: la marca va DENTRO del recuadro, no al lado del texto ---------------------------
// Los recuadros de esta ficha son formas (wps) flotantes con posición absoluta: el "✓" que se
// escribía junto a la etiqueta caía fuera del recuadro, a la derecha del renglón. Aquí cada recuadro
// recibe su propio cuadro de texto centrado con el token de esa casilla dentro, así que la marca sale
// exactamente en medio del recuadro. El builder en C# resuelve el token a "X" o a cadena vacía.
//
// El orden es el del documento y está confirmado pintando cada recuadro de un color y convirtiendo
// la plantilla a imagen. La octava forma no se ve en la hoja (queda tapada) y por eso no lleva token.
const CASILLAS_CARTA = [
  "DOC_DPI",
  "DOC_FOTOS",
  "DOC_TITULO_MEDIO",
  "DOC_TITULO_LICENCIATURA",
  "DOC_FOTOS_EXTRANJERO",
  "DOC_PASAPORTE",
  "DOC_TITULO_MEDIO_EXTRANJERO",
  null,
  "DOC_TITULO_PREGRADO",
];

// Los tokens que estaban sueltos en el texto se quitan: ahora viven dentro del recuadro.
xml = xml.replace(/<w:r\b(?:(?!<\/w:r>).)*?\{\{DOC_[A-Z_]+\}\}(?:(?!<\/w:r>).)*?<\/w:r>/gs, "");

{
  const bloques = [];
  const re = /<wps:wsp>/g;
  let m;
  while ((m = re.exec(xml))) {
    const end = xml.indexOf("</wps:wsp>", m.index) + "</wps:wsp>".length;
    re.lastIndex = end;
    bloques.push({ start: m.index, end });
  }
  if (bloques.length !== CASILLAS_CARTA.length) {
    throw new Error(`Se esperaban ${CASILLAS_CARTA.length} recuadros, se encontraron ${bloques.length}`);
  }
  for (let i = bloques.length - 1; i >= 0; i--) {
    const token = CASILLAS_CARTA[i];
    if (!token) continue;
    let b = xml.slice(bloques[i].start, bloques[i].end);
    if (b.includes("<wps:txbx>")) continue; // ya preparado
    // Sin márgenes internos, para que la marca quede centrada en un recuadro de solo 14 pt.
    b = b.replace(/lIns="\d+" tIns="\d+" rIns="\d+" bIns="\d+"/, 'lIns="0" tIns="0" rIns="0" bIns="0"');
    const txbx =
      "<wps:txbx><w:txbxContent><w:p><w:pPr><w:spacing w:before=\"0\" w:after=\"0\" w:line=\"240\" w:lineRule=\"auto\"/><w:jc w:val=\"center\"/></w:pPr>" +
      `<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:color w:val="000000"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>{{${token}}}</w:t></w:r>` +
      "</w:p></w:txbxContent></wps:txbx>";
    b = b.replace("<wps:bodyPr", `${txbx}<wps:bodyPr`);
    xml = xml.slice(0, bloques[i].start) + b + xml.slice(bloques[i].end);
  }
  console.log(`Carta de compromiso: ${CASILLAS_CARTA.filter(Boolean).length} recuadros con marca adentro.`);
}

// ---- el No. DPI se separa del nombre ------------------------------------------------------------
// El renglón de la firma trae "{{NOMBRE_COMPLETO}} <tab> {{NO_DPI}}" con las tabulaciones por
// omisión (cada 708 twips): con un nombre largo, el tabulador solo avanzaba a la siguiente parada y
// el DPI quedaba pegado al nombre, en vez de debajo de su etiqueta "No. DPI". Una parada de
// tabulación explícita lo fija siempre en el mismo sitio, alineado con la etiqueta de abajo.
{
  const i = xml.indexOf("{{NOMBRE_COMPLETO}}");
  if (i === -1) throw new Error("No se encontró {{NOMBRE_COMPLETO}}");
  const pStart = xml.lastIndexOf("<w:p ", i);
  const pPrStart = xml.indexOf("<w:pPr>", pStart);
  if (pPrStart === -1 || pPrStart > i) throw new Error("El párrafo del nombre no tiene <w:pPr>");
  if (!xml.slice(pPrStart, i).includes("<w:tabs>")) {
    xml =
      xml.slice(0, pPrStart + "<w:pPr>".length) +
      '<w:tabs><w:tab w:val="left" w:pos="5400"/></w:tabs>' +
      xml.slice(pPrStart + "<w:pPr>".length);
  }
}

fs.writeFileSync(docPath, xml, "utf8");
console.log(`Carta de compromiso: ${edits.length} ediciones aplicadas.`);
