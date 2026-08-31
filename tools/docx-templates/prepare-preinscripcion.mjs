// Prepara Resources/PreinscripcionTemplate.docx a partir del FORMATO real que mandó el usuario:
// inserta tokens {{...}} (texto plano, aún sin resolver) en las celdas de valor —vacías— y junto a
// cada opción de casilla, sin tocar bordes, fuentes, imágenes ni el membrete original. Cada token
// SIEMPRE queda insertado (una celda o marcador por campo); el builder en C# solo hace un
// string.Replace de cada uno por el valor real (o cadena vacía si no aplica) al momento de imprimir
// — ver Services/PreinscripcionDocxBuilder.cs. El .docx de origen nunca se modifica; esto escribe una
// copia nueva.
import fs from "node:fs";

const docPath = process.argv[2];
const outPath = process.argv[3];

let xml = fs.readFileSync(docPath, "utf8");
const edits = []; // {at, insert} — se aplican de mayor a menor offset para no invalidar índices previos

function run(token, sz = 20) {
  return `<w:r><w:rPr><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr><w:t xml:space="preserve">${token}</w:t></w:r>`;
}

/** Inserta `insertXml` justo antes del último </w:p> dentro de xml.slice(cellStart, cellEnd) — la celda de valor está vacía, así que cae dentro de su único párrafo. */
function insertIntoEmptyCell(cellStart, cellEnd, token) {
  const slice = xml.slice(cellStart, cellEnd);
  const at = slice.lastIndexOf("</w:p>");
  if (at === -1) throw new Error(`Sin </w:p> en celda [${cellStart},${cellEnd}]`);
  edits.push({ at: cellStart + at, insert: run(`{{${token}}}`) });
}

/** Inserta `insertXml` justo después de <w:t>label</w:t></w:r> dentro de xml.slice(rangeStart, rangeEnd). */
function insertAfterLabel(rangeStart, rangeEnd, label, token) {
  const slice = xml.slice(rangeStart, rangeEnd);
  const re = new RegExp(`<w:t\\b[^>]*>${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}<\\/w:t>\\s*<\\/w:r>`);
  const m = re.exec(slice);
  if (!m) throw new Error(`Etiqueta ${JSON.stringify(label)} no encontrada en [${rangeStart},${rangeEnd}]`);
  edits.push({ at: rangeStart + m.index + m[0].length, insert: run(`{{${token}}}`) });
}

// ---- campos simples: label -> celda de valor vacía inmediatamente después ---------------------
insertIntoEmptyCell(6792, 7007, "NOMBRE_COMPLETO");
insertIntoEmptyCell(7875, 8090, "DPI");
insertIntoEmptyCell(9219, 9434, "NO_PASAPORTE");
insertIntoEmptyCell(10288, 10503, "CARRERA");
insertIntoEmptyCell(11375, 11590, "JORNADA");
insertIntoEmptyCell(12722, 12937, "FECHA_NACIMIENTO");
insertIntoEmptyCell(13790, 14005, "GENERO");
insertIntoEmptyCell(15135, 15350, "LUGAR_NACIMIENTO");
insertIntoEmptyCell(16209, 16424, "NACIONALIDAD");
insertIntoEmptyCell(17422, 17637, "DIRECCION");
insertIntoEmptyCell(18496, 18711, "DEPARTAMENTO");
insertIntoEmptyCell(19567, 19782, "MUNICIPIO");
insertIntoEmptyCell(20773, 20988, "ESTADO_CIVIL");
insertIntoEmptyCell(21989, 22204, "COMUNIDAD_LINGUISTICA");
insertIntoEmptyCell(37014, 37229, "IDIOMA_MATERNO");
insertIntoEmptyCell(38227, 38442, "CORREO");

// ---- Pueblo de Pertenencia (celda 57: 23319–36021) — un marcador por opción --------------------
insertAfterLabel(23319, 36021, "Maya", "PUEBLO_MAYA");
insertAfterLabel(23319, 36021, "Garifuna", "PUEBLO_GARIFUNA");
insertAfterLabel(23319, 36021, "Extranjero", "PUEBLO_EXTRANJERO");
insertAfterLabel(23319, 36021, "Xinka", "PUEBLO_XINKA");
insertAfterLabel(23319, 36021, "Ladino", "PUEBLO_LADINO");
insertAfterLabel(23319, 36021, "Afroascendiente/Creole/Afromestizo", "PUEBLO_AFRO");

// ---- Teléfono (celdas 69/70) — el valor va pegado tras la etiqueta, misma celda ----------------
insertAfterLabel(39297, 39602, "Celular:", "TELEFONO_CELULAR");
insertAfterLabel(39602, 39904, "Casa:", "TELEFONO_CASA");

// ---- Contacto de Emergencia 1 y 2 (celdas 74/75 y 79/80) ---------------------------------------
insertAfterLabel(41175, 41479, "Nombre:", "EMERGENCIA1_NOMBRE");
insertAfterLabel(41479, 41785, "Teléfono:", "EMERGENCIA1_TELEFONO");
insertAfterLabel(43056, 43360, "Nombre:", "EMERGENCIA2_NOMBRE");
insertAfterLabel(43360, 43666, "Teléfono:", "EMERGENCIA2_TELEFONO");

// ---- ¿Alguna alergia? / ¿Problemas de salud? (celdas 84 y 88) — Si/No + Describa ---------------
insertAfterLabel(44782, 49478, "Si", "ALERGIA_SI");
insertAfterLabel(44782, 49478, "No", "ALERGIA_NO");
insertAfterLabel(44782, 49478, "Describa:", "ALERGIA_DESCRIPCION");
insertAfterLabel(50866, 55562, "Si", "SALUD_SI");
insertAfterLabel(50866, 55562, "No", "SALUD_NO");
insertAfterLabel(50866, 55562, "Describa:", "SALUD_DESCRIPCION");

// ---- Firma — el token va DENTRO del párrafo que ya trae la línea de firma (no en uno nuevo): la
// hoja ya está al límite exacto de una página, y un párrafo nuevo — por corto que sea — empuja la
// leyenda "Firma Estudiante" a una segunda hoja (se comprobó al imprimir). El builder en C# la
// convierte en una imagen FLOTANTE anclada a este mismo párrafo, así que no ocupa flujo de texto.
const firmaAnchor = '<w:jc w:val="center"/><w:rPr><w:sz w:val="24"/></w:rPr></w:pPr><w:r><w:rPr><w:sz w:val="24"/></w:rPr><w:t>Firma</w:t>';
const firmaIdx = xml.indexOf(firmaAnchor);
if (firmaIdx === -1) throw new Error("No se encontró el párrafo de 'Firma Estudiante'.");
// El párrafo INMEDIATAMENTE anterior es el que trae la línea dibujada (un <w:drawing> flotante) —
// se inserta el token al final de ESE párrafo, justo antes de su </w:p>.
const firmaParagraphOpenIdx = xml.lastIndexOf("<w:p>", firmaIdx);
const lineParagraphCloseIdx = xml.lastIndexOf("</w:p>", firmaParagraphOpenIdx) + "</w:p>".length;
if (lineParagraphCloseIdx <= "</w:p>".length) throw new Error("No se encontró el párrafo de la línea de firma.");
edits.push({
  at: lineParagraphCloseIdx - "</w:p>".length,
  insert: `<w:r><w:t xml:space="preserve">{{FIRMA}}</w:t></w:r>`,
});

// ---- aplica todas las inserciones, de mayor a menor offset -------------------------------------
edits.sort((a, b) => b.at - a.at);
for (const e of edits) {
  xml = xml.slice(0, e.at) + e.insert + xml.slice(e.at);
}

fs.writeFileSync(docPath, xml, "utf8"); // reescribe el document.xml ya descomprimido
console.log(`Preinscripción: ${edits.length} inserciones aplicadas.`);
