// Prepara Resources/SolicitudTituloTemplate.docx a partir del FORMATO real
// ("FORMATO - SOLICITUD DE IMPRESIÓN DE TÍTULO 2025 carta.docx") — misma filosofía que
// prepare-preinscripcion.mjs y prepare-carta.mjs: se insertan tokens {{...}} en los huecos, sin
// tocar ni un borde, fuente, imagen ni casilla del diseño original.
//
// Esta ficha tiene dos particularidades que las otras dos no tienen:
//
//   1. El carné, los nombres y los apellidos se escriben LETRA POR LETRA, cada una en su propia
//      casilla de una rejilla (13, 37 y 37 casillas). Cada casilla recibe su propio token
//      ({{C0}}…{{C12}}, {{N0}}…{{N36}}, {{A0}}…{{A36}}) y el backend reparte el texto carácter a
//      carácter. Además se centra el párrafo de cada casilla: es una casilla de un solo carácter,
//      centrarlo es lo que el diseño ya pide a mano.
//
//   2. Las casillas de opción (Campus, ceremonia SÍ/NO, Sexo F/M) NO son texto: son imágenes
//      ("Icono de casilla sin marcar"). En vez de escribir un ✓ al lado —que quedaría fuera del
//      recuadro— a cada casilla que nos interesa se le da su PROPIA relación de imagen
//      (rIdChkCampus1, rIdChkSi, rIdChkSexoF…), todas apuntando de inicio al mismo PNG vacío que ya
//      usaban. Marcar una casilla en producción es entonces cambiar el Target de esa relación a
//      media/casillaMarcada.png (ver DocxCellSurgery.SetCheckbox) — la casilla se marca sin mover un
//      píxel, porque el PNG marcado ES el PNG original con una X dibujada dentro (png-check.mjs).
//
// A diferencia de los otros dos scripts, este recibe la CARPETA descomprimida (necesita tocar
// también word/_rels/document.xml.rels y word/media/).
//
// Uso:
//   node prepare-solicitud-titulo.mjs <carpetaDescomprimida>
//   node zip-dir.mjs <carpetaDescomprimida> ../../backend/UmesIsel.Api/Resources/SolicitudTituloTemplate.docx
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const dir = process.argv[2];
if (!dir) throw new Error("Uso: node prepare-solicitud-titulo.mjs <carpetaDescomprimida>");

const docPath = path.join(dir, "word", "document.xml");
const relsPath = path.join(dir, "word", "_rels", "document.xml.rels");
const mediaDir = path.join(dir, "word", "media");

let xml = fs.readFileSync(docPath, "utf8");

/* ------------------------------------------------------------------ utilidades XML */

function balancedEnd(s, start, openTag, closeTag) {
  let depth = 1;
  let i = start + openTag.length;
  while (depth > 0) {
    const o = s.indexOf(openTag, i);
    const c = s.indexOf(closeTag, i);
    if (c === -1) return s.length;
    if (o !== -1 && o < c) {
      depth++;
      i = o + openTag.length;
    } else {
      depth--;
      i = c + closeTag.length;
    }
  }
  return i;
}

/** Rangos <mc:Fallback>: copia del <mc:Choice> para Word viejo. Se ignoran (Word/LibreOffice usan el Choice). */
function fallbackRanges(s) {
  const out = [];
  const re = /<mc:Fallback>/g;
  let m;
  while ((m = re.exec(s))) {
    out.push([m.index, balancedEnd(s, m.index, "<mc:Fallback>", "</mc:Fallback>")]);
    re.lastIndex = m.index + 13;
  }
  return out;
}

function listRealTables(s) {
  const fb = fallbackRanges(s);
  const inFb = (i) => fb.some(([a, b]) => i >= a && i < b);
  const out = [];
  const re = /<w:tbl>/g;
  let m;
  while ((m = re.exec(s))) {
    const start = m.index;
    const end = balancedEnd(s, start, "<w:tbl>", "</w:tbl>");
    if (!inFb(start)) out.push({ start, end });
    re.lastIndex = start + 7;
  }
  return out;
}

function listCells(s, table) {
  const cells = [];
  let i = table.start;
  while (i < table.end) {
    const cs = s.indexOf("<w:tc>", i);
    if (cs === -1 || cs >= table.end) break;
    const ce = balancedEnd(s, cs, "<w:tc>", "</w:tc>");
    cells.push({ start: cs, end: ce });
    i = ce;
  }
  return cells;
}

const edits = [];
const push = (e) => edits.push(e);

function applyEdits(s, list) {
  const sorted = [...list].sort((a, b) => (b.at ?? b.from) - (a.at ?? a.from));
  let out = s;
  for (const e of sorted) {
    if (e.insert !== undefined) out = out.slice(0, e.at) + e.insert + out.slice(e.at);
    else out = out.slice(0, e.from) + e.replacement + out.slice(e.to);
  }
  return out;
}

/** Punto de inserción justo antes del </w:p> del primer párrafo de la celda. */
function endOfFirstParagraph(cell) {
  const pStart = xml.indexOf("<w:p", cell.start);
  if (pStart === -1 || pStart >= cell.end) throw new Error(`Celda @${cell.start} sin párrafo`);
  const pEnd = xml.indexOf("</w:p>", pStart);
  if (pEnd === -1 || pEnd > cell.end) throw new Error(`Celda @${cell.start} con párrafo raro`);
  return pEnd;
}

/** Centra el primer párrafo de la celda (rejillas de un carácter). */
function centerFirstParagraph(cell) {
  const pStart = xml.indexOf("<w:p", cell.start);
  const styleTag = '<w:pStyle w:val="TableParagraph"/>';
  const at = xml.indexOf(styleTag, pStart);
  if (at === -1 || at > cell.end) return;
  push({ at: at + styleTag.length, insert: '<w:jc w:val="center"/>' });
}

const run = (token, sz, { space = false } = {}) =>
  `<w:r><w:rPr><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr>` +
  `<w:t${space ? ' xml:space="preserve"' : ""}>${space ? " " : ""}${token}</w:t></w:r>`;

/* ------------------------------------------------------------------ tablas */

const tables = listRealTables(xml);
if (tables.length !== 10) throw new Error(`Se esperaban 10 tablas reales, hay ${tables.length} — ¿cambió el FORMATO?`);

const [, , tFechaSolicitud, tCarnet, tNombres, , tApellidos, tDatos] = tables;

// -- Fecha de Solicitud: 3 celdas que YA traen la etiqueta DÍA/MES/AÑO en letra diminuta ----------
{
  const cells = listCells(xml, tFechaSolicitud);
  if (cells.length !== 3) throw new Error(`Fecha de Solicitud: se esperaban 3 celdas, hay ${cells.length}`);
  ["SOL_DIA", "SOL_MES", "SOL_ANIO"].forEach((token, i) => {
    push({ at: endOfFirstParagraph(cells[i]), insert: run(`{{${token}}}`, 18, { space: true }) });
  });
}

// -- Rejillas de un carácter por casilla ---------------------------------------------------------
function prepareGrid(table, prefix, expected, label) {
  const cells = listCells(xml, table);
  if (cells.length !== expected) throw new Error(`${label}: se esperaban ${expected} casillas, hay ${cells.length}`);
  cells.forEach((cell, i) => {
    centerFirstParagraph(cell);
    push({ at: endOfFirstParagraph(cell), insert: run(`{{${prefix}${i}}}`, 20) });
  });
}

prepareGrid(tCarnet, "C", 13, "Número de Carné");
prepareGrid(tNombres, "N", 37, "Nombres");
prepareGrid(tApellidos, "A", 37, "Apellidos");

// -- Tabla de datos: el token va pegado detrás de la etiqueta que ya existe en cada celda ---------
{
  const cells = listCells(xml, tDatos);
  if (cells.length !== 17) throw new Error(`Tabla de datos: se esperaban 17 celdas, hay ${cells.length}`);
  // índice de celda -> [token, tamaño]. Las celdas 0 (etiqueta "Fecha de Nacimiento:") y
  // 5 ("Sexo: F M", casillas de imagen) no llevan token.
  const campos = {
    1: ["NAC_DIA", 18],
    2: ["NAC_MES", 18],
    3: ["NAC_ANIO", 18],
    4: ["ESTADO_CIVIL", 18],
    6: ["DIRECCION", 18],
    7: ["TEL_CASA", 18],
    8: ["TEL_CELULAR", 18],
    9: ["TEL_EMERGENCIA", 18],
    10: ["CORREO", 18],
    11: ["EMPRESA", 18],
    12: ["CARGO", 18],
    13: ["DIRECCION_TRABAJO", 18],
    14: ["TEL_TRABAJO", 18],
    15: ["FACULTAD", 18],
    16: ["TITULO_OBTENER", 18],
  };
  for (const [idx, [token, sz]] of Object.entries(campos)) {
    push({ at: endOfFirstParagraph(cells[Number(idx)]), insert: run(`{{${token}}}`, sz, { space: true }) });
  }
}

/* ------------------------------------------------------------------ firma y foto */

// {{FIRMA}}: dentro del párrafo que ya dice "Firma del Interesado:" — nunca en un párrafo nuevo.
// La ficha entra justo en una hoja; un párrafo de más la parte en dos (ver DocxCellSurgery).
{
  const i = xml.indexOf("Interesado:");
  if (i === -1) throw new Error("No se encontró 'Interesado:'");
  const pEnd = xml.indexOf("</w:p>", i);
  push({ at: pEnd, insert: `<w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t>{{FIRMA}}</w:t></w:r>` });
}

// {{FOTO}}: en el mismo párrafo que hospeda el recuadro "PEGAR FOTOGRAFÍA RECIENTE", justo después
// de su run — así el ancla de la foto puede reusar tal cual las coordenadas del recuadro.
{
  const i = xml.indexOf("PEGAR");
  if (i === -1) throw new Error("No se encontró el recuadro 'PEGAR FOTOGRAFÍA RECIENTE'");
  const acEnd = xml.indexOf("</mc:AlternateContent>", i) + "</mc:AlternateContent>".length;
  const runEnd = xml.indexOf("</w:r>", acEnd) + "</w:r>".length;
  push({ at: runEnd, insert: `<w:r><w:rPr><w:sz w:val="2"/></w:rPr><w:t>{{FOTO}}</w:t></w:r>` });
}

xml = applyEdits(xml, edits);

/* ------------------------------------------------------------------ casillas de opción */

// Cada casilla que el sistema puede marcar recibe su propia relación de imagen. El orden es el del
// documento y está confirmado por las coordenadas de sus anclas (columna izquierda x=387095 EMU,
// derecha x=3313810; dentro de cada columna, de arriba abajo).
const CASILLAS = [
  "rIdChkCampusCentral",
  "rIdChkCampusAltaVerapaz",
  "rIdChkCampusQuetzaltenango",
  "rIdChkCampusMorales",
  "rIdChkCampusSalesiano",
  "rIdChkCampusHonduras",
  "rIdChkCeremoniaSi",
  "rIdChkCeremoniaNo",
  "rIdChkSexoF",
  "rIdChkSexoM",
];

{
  const objetivos = [];
  const re = /<w:drawing>/g;
  let m;
  const fb = fallbackRanges(xml);
  const inFb = (i) => fb.some(([a, b]) => i >= a && i < b);
  while ((m = re.exec(xml))) {
    const start = m.index;
    const end = balancedEnd(xml, start, "<w:drawing>", "</w:drawing>");
    re.lastIndex = end;
    if (inFb(start)) continue;
    const d = xml.slice(start, end);
    // Solo las casillas propiamente dichas: cuadraditos de ~0.15", no la línea de firma.
    const ext = /<wp:extent cx="(\d+)" cy="(\d+)"\/>/.exec(d);
    if (!/descr="[^"]*casilla[^"]*"/i.test(d) || !ext || Number(ext[1]) > 200000) continue;
    objetivos.push({ start, end });
  }
  // Las 10 primeras son las del alumno; las siguientes son las de Secretaría (uso interno) y no se tocan.
  if (objetivos.length < CASILLAS.length) {
    throw new Error(`Se esperaban al menos ${CASILLAS.length} casillas, hay ${objetivos.length}`);
  }
  const swaps = [];
  objetivos.slice(0, CASILLAS.length).forEach((o, i) => {
    const blip = /<a:blip r:embed="([^"]+)"/.exec(xml.slice(o.start, o.end));
    if (!blip) throw new Error(`Casilla ${i} sin <a:blip>`);
    const at = o.start + blip.index + blip[0].indexOf(blip[1]);
    swaps.push({ from: at, to: at + blip[1].length, replacement: CASILLAS[i], original: blip[1] });
  });
  xml = applyEdits(xml, swaps);

  // Relaciones nuevas: todas apuntan de inicio al MISMO PNG vacío que ya usaba cada casilla.
  let rels = fs.readFileSync(relsPath, "utf8");
  const targetDe = (relId) => {
    const r = new RegExp(`<Relationship Id="${relId}"[^>]*Target="([^"]+)"`).exec(rels);
    if (!r) throw new Error(`No existe la relación ${relId}`);
    return r[1];
  };
  const nuevas = swaps
    .map(
      (s, i) =>
        `<Relationship Id="${CASILLAS[i]}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${targetDe(s.original)}"/>`,
    )
    .join("");
  rels = rels.replace("</Relationships>", `${nuevas}</Relationships>`);
  fs.writeFileSync(relsPath, rels);
  console.log(`Casillas con relación propia: ${CASILLAS.length}`);
}

/* ------------------------------------------------------------------ PNG de casilla marcada */

{
  const vacia = path.join(mediaDir, "image4.png");
  const marcada = path.join(mediaDir, "casillaMarcada.png");
  execFileSync(process.execPath, [path.join(import.meta.dirname, "png-check.mjs"), vacia, marcada], {
    stdio: "inherit",
  });
}

fs.writeFileSync(docPath, xml);
console.log(`Listo: ${edits.length} tokens insertados en ${docPath}`);
