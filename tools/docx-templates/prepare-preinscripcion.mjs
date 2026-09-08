// Prepara Resources/PreinscripcionTemplate.docx a partir del FORMATO real que mandó el usuario:
// inserta tokens {{...}} (texto plano, aún sin resolver) en las celdas de valor —vacías— y junto a
// cada opción de casilla, sin tocar bordes, fuentes, imágenes ni el membrete original. Cada token
// SIEMPRE queda insertado (una celda o marcador por campo); el builder en C# solo hace un
// string.Replace de cada uno por el valor real (o cadena vacía si no aplica) al momento de imprimir
// — ver Services/PreinscripcionDocxBuilder.cs. El .docx de origen nunca se modifica; esto escribe una
// copia nueva.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

// Recibe la CARPETA descomprimida (no solo el document.xml): además de los tokens hay que tocar
// word/_rels/document.xml.rels y word/media/ para las casillas — ver la sección de casillas al final.
const dir = process.argv[2];
if (!dir) throw new Error("Uso: node prepare-preinscripcion.mjs <carpetaDescomprimida>");
const docPath = path.join(dir, "word", "document.xml");
const relsPath = path.join(dir, "word", "_rels", "document.xml.rels");
const mediaDir = path.join(dir, "word", "media");

let xml = fs.readFileSync(docPath, "utf8");
// Idempotente: si la carpeta ya trae los tokens (se está re-corriendo sobre una plantilla ya
// preparada) no se vuelven a insertar; la parte de casillas sí se rehace, y también es idempotente.
const yaConTokens = xml.includes("{{NOMBRE_COMPLETO}}");
const edits = []; // {at, insert} — se aplican de mayor a menor offset para no invalidar índices previos

function run(token, sz = 20) {
  return `<w:r><w:rPr><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr><w:t xml:space="preserve">${token}</w:t></w:r>`;
}

/** Inserta `insertXml` justo antes del último </w:p> dentro de xml.slice(cellStart, cellEnd) — la celda de valor está vacía, así que cae dentro de su único párrafo. */
function insertIntoEmptyCell(cellStart, cellEnd, token) {
  if (yaConTokens) return; // los offsets son los del FORMATO virgen; ya no aplican
  const slice = xml.slice(cellStart, cellEnd);
  const at = slice.lastIndexOf("</w:p>");
  if (at === -1) throw new Error(`Sin </w:p> en celda [${cellStart},${cellEnd}]`);
  edits.push({ at: cellStart + at, insert: run(`{{${token}}}`) });
}

/** Inserta `insertXml` justo después de <w:t>label</w:t></w:r> dentro de xml.slice(rangeStart, rangeEnd). */
function insertAfterLabel(rangeStart, rangeEnd, label, token) {
  if (yaConTokens) return; // idem
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
const firmaIdx = yaConTokens ? -1 : xml.indexOf(firmaAnchor);
if (!yaConTokens && firmaIdx === -1) throw new Error("No se encontró el párrafo de 'Firma Estudiante'.");
if (!yaConTokens) {
// El párrafo INMEDIATAMENTE anterior es el que trae la línea dibujada (un <w:drawing> flotante) —
// se inserta el token al final de ESE párrafo, justo antes de su </w:p>.
const firmaParagraphOpenIdx = xml.lastIndexOf("<w:p>", firmaIdx);
const lineParagraphCloseIdx = xml.lastIndexOf("</w:p>", firmaParagraphOpenIdx) + "</w:p>".length;
if (lineParagraphCloseIdx <= "</w:p>".length) throw new Error("No se encontró el párrafo de la línea de firma.");
  edits.push({
    at: lineParagraphCloseIdx - "</w:p>".length,
    insert: `<w:r><w:t xml:space="preserve">{{FIRMA}}</w:t></w:r>`,
  });
}

// ---- aplica todas las inserciones, de mayor a menor offset -------------------------------------
if (!yaConTokens) {
  edits.sort((a, b) => b.at - a.at);
  for (const e of edits) {
    xml = xml.slice(0, e.at) + e.insert + xml.slice(e.at);
  }
}

// ---- casillas: cada recuadro es una IMAGEN anclada, no un carácter -----------------------------
// Escribir un "✓" al lado de la etiqueta (que es lo que hacían los tokens {{PUEBLO_*}},
// {{ALERGIA_*}} y {{SALUD_*}}) deja la marca FUERA del recuadro: los recuadros son imágenes
// flotantes con posición absoluta y el texto corre por su cuenta. La solución es la misma que ya
// usa la Solicitud de Título: cada casilla recibe su PROPIA relación de imagen, apuntando de inicio
// al mismo PNG vacío que ya usaba, y marcarla en producción es cambiar el Target de esa relación al
// PNG marcado — que es el MISMO recuadro con una X dibujada dentro (png-check.mjs). Cero
// desplazamiento. Los tokens de texto se quedan en la plantilla, pero el builder los resuelve
// siempre a cadena vacía.
//
// El orden es el del documento y está confirmado por las coordenadas de las anclas:
// Maya / Garifuna / Extranjero arriba, Xinka / Ladino / Afroascendiente abajo; luego Si / No de
// alergia y Si / No de salud.
const CASILLAS = [
  "rIdChkPuebloMaya",
  "rIdChkPuebloGarifuna",
  "rIdChkPuebloExtranjero",
  "rIdChkPuebloXinka",
  "rIdChkPuebloLadino",
  "rIdChkPuebloAfro",
  "rIdChkAlergiaSi",
  "rIdChkAlergiaNo",
  "rIdChkSaludSi",
  "rIdChkSaludNo",
];

{
  // Cada casilla vive en un <mc:AlternateContent>: el <mc:Choice> la dibuja con <a:blip r:embed>
  // y el <mc:Fallback> repite la misma imagen con <v:imagedata r:id> para Word viejo. Se cambian
  // las dos referencias del bloque, para que ambos caminos vean la misma casilla.
  const bloques = [];
  const re = /<mc:AlternateContent>/g;
  let m;
  while ((m = re.exec(xml))) {
    const end = xml.indexOf("</mc:AlternateContent>", m.index) + "</mc:AlternateContent>".length;
    const b = xml.slice(m.index, end);
    re.lastIndex = end;
    const ext = /<wp:extent cx="(\d+)" cy="(\d+)"\/>/.exec(b);
    if (!ext || Number(ext[1]) > 200000) continue; // la línea de firma mide 2147570 EMU: no es casilla
    const blip = /<a:blip r:embed="([^"]+)"/.exec(b);
    if (!blip) continue;
    bloques.push({ start: m.index, end, rel: blip[1] });
  }
  if (bloques.length !== CASILLAS.length) {
    throw new Error(`Se esperaban ${CASILLAS.length} casillas, se encontraron ${bloques.length}`);
  }

  // De atrás hacia adelante para no invalidar offsets.
  const usados = new Map(); // relIdNuevo -> Target original
  for (let i = bloques.length - 1; i >= 0; i--) {
    const b = bloques[i];
    const nuevo = CASILLAS[i];
    if (b.rel === nuevo) {
      continue; // ya preparada
    }
    usados.set(nuevo, b.rel);
    const bloque = xml
      .slice(b.start, b.end)
      .replaceAll(`r:embed="${b.rel}"`, `r:embed="${nuevo}"`)
      .replaceAll(`r:id="${b.rel}"`, `r:id="${nuevo}"`);
    xml = xml.slice(0, b.start) + bloque + xml.slice(b.end);
  }

  let rels = fs.readFileSync(relsPath, "utf8");
  const targetDe = (relId) => {
    const r = new RegExp(`<Relationship Id="${relId}"[^>]*Target="([^"]+)"`).exec(rels);
    if (!r) throw new Error(`No existe la relación ${relId}`);
    return r[1];
  };
  const nuevas = [...usados]
    .filter(([nuevo]) => !rels.includes(`Id="${nuevo}"`))
    .map(
      ([nuevo, original]) =>
        `<Relationship Id="${nuevo}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${targetDe(original)}"/>`,
    )
    .join("");
  if (nuevas) {
    rels = rels.replace("</Relationships>", `${nuevas}</Relationships>`);
    fs.writeFileSync(relsPath, rels, "utf8");
  }
  console.log(`Preinscripción: ${CASILLAS.length} casillas con relación propia.`);
}

// ---- PNG de casilla marcada, uno por cada recuadro distinto del FORMATO -------------------------
// El FORMATO usa dos recuadros de tamaños distintos (image4.png para casi todas, image5.png para
// "Extranjero" y "Afroascendiente"), así que hacen falta dos marcados: cada uno es su propio
// recuadro con la X dentro, para que la casilla marcada calce pixel a pixel con la vacía.
for (const [vacia, marcada] of [
  ["image4.png", "casillaMarcada4.png"],
  ["image5.png", "casillaMarcada5.png"],
]) {
  execFileSync(
    process.execPath,
    [path.join(import.meta.dirname, "png-check.mjs"), path.join(mediaDir, vacia), path.join(mediaDir, marcada)],
    { stdio: "inherit" },
  );
}

fs.writeFileSync(docPath, xml, "utf8"); // reescribe el document.xml ya descomprimido
console.log(`Preinscripción: ${yaConTokens ? "tokens ya presentes" : `${edits.length} inserciones aplicadas`}.`);
