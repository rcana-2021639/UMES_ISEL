// Autoría única de las plantillas .xlsx nuevas (Preinscripción y Carta de compromiso).
// Se ejecuta a mano cuando hace falta rehacerlas; el resultado se guarda tal cual en
// backend/UmesIsel.Api/Resources/ y de ahí en adelante lo llenan
// PreinscripcionXlsxBuilder.cs / CartaCompromisoXlsxBuilder.cs con cirugía de celdas,
// exactamente como ya hace FichaXlsxBuilder.cs con la ficha de asignación.
//
// Convención de "casillas": en vez de los controles de formulario de Excel que trae
// la plantilla original (heredados del archivo de la universidad), aquí una casilla
// es simplemente texto "[ ] Opción" horneado en la celda; el builder solo reescribe
// la ÚNICA celda elegida como "[X] Opción" — las demás se quedan tal cual vienen en
// la plantilla (ya "desmarcadas"). Evita la complejidad de los controles VML/form
// porque estas dos plantillas se generan desde cero, sin arrastrar ese formato.

import ExcelJS from "exceljs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const resourcesDir = path.resolve(__dirname, "../../backend/UmesIsel.Api/Resources");
const logoPath = path.resolve(__dirname, "../../backend/UmesIsel.Api/Resources/_umes-logo.png");

// El logo se extrae una vez de la plantilla de asignación ya existente, para que
// las tres fichas impresas se vean de la misma familia — ver README de esta carpeta.
if (!fs.existsSync(logoPath)) {
  throw new Error(
    `No se encontró ${logoPath}. Extrae xl/media/image1.png de FichaTemplate.xlsx y guárdalo ahí antes de correr este script.`,
  );
}

const FONT = "Arial";
const THIN = { style: "thin", color: { argb: "FF9AA5A0" } };
const BOX = { top: THIN, left: THIN, bottom: THIN, right: THIN };

function borderAll(ws, ref) {
  ws.getCell(ref).border = BOX;
}

/** Aplica el mismo borde a cada celda del rango (no solo a la ancla del merge). */
function boxRange(ws, range) {
  const [from, to] = range.split(":");
  const f = ws.getCell(from);
  const t = ws.getCell(to);
  for (let r = f.row; r <= t.row; r++) {
    for (let c = f.col; c <= t.col; c++) {
      ws.getCell(r, c).border = BOX;
    }
  }
}

function setCell(ws, ref, value, opts = {}) {
  const cell = ws.getCell(ref);
  cell.value = value;
  cell.font = { name: FONT, size: opts.size ?? 9.5, bold: !!opts.bold, italic: !!opts.italic, color: opts.color };
  cell.alignment = { vertical: "middle", horizontal: opts.align ?? "left", wrapText: !!opts.wrap, indent: opts.indent ?? 0 };
  return cell;
}

function label(ws, range, text, opts = {}) {
  ws.mergeCells(range);
  const anchor = range.split(":")[0];
  setCell(ws, anchor, text, { bold: true, size: 9, ...opts });
  boxRange(ws, range);
}

/** Celda de valor: se deja vacía (el builder la llena) salvo que se pase `placeholder`. */
function value(ws, range, placeholder = "", opts = {}) {
  ws.mergeCells(range);
  const anchor = range.split(":")[0];
  setCell(ws, anchor, placeholder, { size: 9.5, ...opts });
  boxRange(ws, range);
  return anchor;
}

function header(ws, imageId, title1, title2) {
  ws.addImage(imageId, { tl: { col: 0.15, row: 0.15 }, ext: { width: 118, height: 91 }, editAs: "oneCell" });
  ws.mergeCells("C1:H2");
  setCell(ws, "C1", title1, { bold: true, size: 17, align: "center" });
  ws.getCell("C1").alignment = { vertical: "bottom", horizontal: "center" };
  ws.mergeCells("C3:H3");
  setCell(ws, "C3", title2, { bold: true, size: 13, align: "center" });
  ws.mergeCells("A4:H4");
  setCell(ws, "A4", "40 Calle 10-02 zona 8, Ciudad de Guatemala. Guatemala - PBX: (502) 2413-8000", {
    size: 7.5,
    italic: true,
    align: "right",
  });
  ws.getCell("A4").border = { bottom: { style: "medium", color: { argb: "FF14493C" } } };
  for (const col of ["B4", "C4", "D4", "E4", "F4", "G4", "H4"]) {
    ws.getCell(col).border = { bottom: { style: "medium", color: { argb: "FF14493C" } } };
  }
  ws.getRow(1).height = 20;
  ws.getRow(2).height = 20;
  ws.getRow(3).height = 16;
  ws.getRow(4).height = 14;
}

function footer(ws, row, text) {
  setCell(ws, `A${row}`, text, { bold: true, size: 7.5 });
}

const COLS = [16, 13, 13, 13, 13, 13, 13, 13]; // A..H — la escala real la fuerza fitToPage al imprimir.

async function buildPreinscripcion(workbook, imageId) {
  const ws = workbook.addWorksheet("Preinscripcion", { pageSetup: { paperSize: 1, orientation: "portrait" } });
  ws.columns = COLS.map((width) => ({ width }));
  header(ws, imageId, "FICHA DE PREINSCRIPCIÓN", "PARA NUEVO INGRESO");

  label(ws, "A5:B5", "Nombre Completo");
  value(ws, "C5:H5");

  label(ws, "A6:B6", "DPI");
  value(ws, "C6:D6");
  label(ws, "E6:F6", "No. De Pasaporte");
  value(ws, "G6:H6");

  label(ws, "A7:B7", "Carrera");
  value(ws, "C7:H7");

  label(ws, "A8:B8", "Jornada");
  value(ws, "C8:D8");
  label(ws, "E8:F8", "Fecha de Nacimiento");
  value(ws, "G8:H8");

  label(ws, "A9:B9", "Género");
  value(ws, "C9:D9");
  label(ws, "E9:F9", "Lugar de Nacimiento");
  value(ws, "G9:H9");

  label(ws, "A10:B10", "Nacionalidad");
  value(ws, "C10:D10");
  label(ws, "E10:F10", "Estado Civil");
  value(ws, "G10:H10");

  label(ws, "A11:B11", "Dirección Completa");
  value(ws, "C11:H11");

  label(ws, "A12:B12", "Departamento");
  value(ws, "C12:D12");
  label(ws, "E12:F12", "Municipio");
  value(ws, "G12:H12");

  label(ws, "A13:B13", "Comunidad Lingüística");
  value(ws, "C13:D13");
  label(ws, "E13:F13", "Idioma Materno");
  value(ws, "G13:H13");

  label(ws, "A14:B15", "Pueblo de Pertenencia");
  value(ws, "C14:C14", "[ ] Maya");
  value(ws, "D14:D14", "[ ] Garífuna");
  value(ws, "E14:F14", "[ ] Extranjero");
  value(ws, "C15:C15", "[ ] Xinka");
  value(ws, "D15:D15", "[ ] Ladino");
  value(ws, "E15:H15", "[ ] Afroascendiente/Creole/Afromestizo");

  label(ws, "A16:B16", "Correo Electrónico");
  value(ws, "C16:H16");

  label(ws, "A17:B17", "Teléfono");
  label(ws, "C17:C17", "Celular:");
  value(ws, "D17:E17");
  label(ws, "F17:F17", "Casa:");
  value(ws, "G17:H17");

  label(ws, "A18:B18", "Contacto de Emergencia 1");
  label(ws, "C18:C18", "Nombre:");
  value(ws, "D18:E18");
  label(ws, "F18:F18", "Teléfono:");
  value(ws, "G18:H18");

  label(ws, "A19:B19", "Contacto de Emergencia 2");
  label(ws, "C19:C19", "Nombre:");
  value(ws, "D19:E19");
  label(ws, "F19:F19", "Teléfono:");
  value(ws, "G19:H19");

  label(ws, "A20:B20", "¿Tiene alguna alergia?");
  value(ws, "C20:C20", "[ ] Sí");
  value(ws, "D20:D20", "[ ] No");
  label(ws, "E20:E20", "Describa:");
  value(ws, "F20:H20");

  label(ws, "A21:B21", "¿Padece de problemas de salud?");
  value(ws, "C21:C21", "[ ] Sí");
  value(ws, "D21:D21", "[ ] No");
  label(ws, "E21:E21", "Describa:");
  value(ws, "F21:H21");

  ws.getRow(23).height = 26;
  ws.mergeCells("B23:E23");
  ws.getCell("B23").border = { bottom: { style: "thin" } };
  ws.mergeCells("B24:E24");
  setCell(ws, "B24", "Firma Estudiante", { align: "center", size: 8 });

  footer(ws, 26, "Actualizado Abril 2025");

  ws.pageSetup = { ...ws.pageSetup, fitToPage: true, fitToWidth: 1, fitToHeight: 1, margins: { left: 0.35, right: 0.35, top: 0.3, bottom: 0.3, header: 0, footer: 0 } };
}

async function buildCartaCompromiso(workbook, imageId) {
  const ws = workbook.addWorksheet("CartaCompromiso", { pageSetup: { paperSize: 1, orientation: "portrait" } });
  ws.columns = COLS.map((width) => ({ width }));
  header(ws, imageId, "CARTA DE COMPROMISO", "MAESTRÍAS 2025");

  label(ws, "A6:B6", "Guatemala,");
  value(ws, "C6:E6");
  label(ws, "F6:H6", "(fecha)", { align: "left", italic: true, bold: false, size: 7.5 });

  ws.mergeCells("A8:H10");
  const parrafo = ws.getCell("A8");
  parrafo.value =
    "Por este medio hago constar que estoy enterado que, de acuerdo con el Reglamento Académico de la " +
    "Universidad Mesoamericana, para ser admitido como estudiante regular en la carrera de:";
  parrafo.font = { name: FONT, size: 9.5 };
  parrafo.alignment = { wrapText: true, vertical: "top" };

  value(ws, "A11:H11");

  ws.mergeCells("A12:H12");
  setCell(ws, "A12", "debo completar mi expediente con los siguientes documentos:", { size: 9 });

  value(ws, "A13:H13", "[ ] Fotocopia de DPI autenticada");
  value(ws, "A14:H14", "[ ] 2 fotografías en blanco y negro de 3x4 cm impresas en papel mate");
  value(ws, "A15:H15", "[ ] Fotocopia autenticada del Título Nivel Medio");
  value(ws, "A16:H16", "[ ] Fotocopia autenticada del Título de Licenciatura");

  ws.mergeCells("A18:H18");
  setCell(ws, "A18", "Estudiantes Extranjeros:", { bold: true, size: 9.5 });

  value(ws, "A19:H19", "[ ] Fotocopia de Pasaporte completo autenticado");
  value(ws, "A20:H20", "[ ] 2 fotografías en blanco y negro de 3x4 cm impresas en papel mate");
  ws.getRow(21).height = 26;
  const t3 = value(ws, "A21:H21", "[ ] Fotocopia del Título a Nivel Medio autenticado, apostillado y con equiparación por el Ministerio de Educación.");
  ws.getCell(t3).alignment = { wrapText: true, vertical: "middle" };
  value(ws, "A22:H22", "[ ] Fotocopia del Título de Pre-Grado autenticado y apostillado");

  ws.mergeCells("A24:H26");
  const aviso = ws.getCell("A24");
  aviso.value =
    "Mientras el estudiante no cumpla con los requisitos de papelería requeridos, no se emitirá ningún " +
    "certificado o constancia oficial. De igual forma, el estudiante no podrá realizar el trámite de título " +
    "para efectos de graduación.";
  aviso.font = { name: FONT, size: 9, italic: true };
  aviso.alignment = { wrapText: true, vertical: "top" };

  setCell(ws, "A28", "Atentamente,", { size: 9.5 });

  ws.getRow(31).height = 20;
  ws.mergeCells("A31:D31");
  ws.getCell("A31").border = { bottom: { style: "thin" } };
  value(ws, "E31:H31");
  ws.getCell("E31").border = { bottom: { style: "thin" } };
  ws.mergeCells("A32:D32");
  setCell(ws, "A32", "Nombre completo", { align: "center", size: 8 });
  ws.mergeCells("E32:H32");
  setCell(ws, "E32", "No. DPI", { align: "center", size: 8 });

  ws.getRow(35).height = 22;
  ws.mergeCells("A35:D35");
  ws.getCell("A35").border = { bottom: { style: "thin" } };
  ws.mergeCells("A36:D36");
  setCell(ws, "A36", "F.", { align: "center", size: 8 });

  footer(ws, 38, "Actualizado Maestrías 2025");

  ws.pageSetup = { ...ws.pageSetup, fitToPage: true, fitToWidth: 1, fitToHeight: 1, margins: { left: 0.35, right: 0.35, top: 0.3, bottom: 0.3, header: 0, footer: 0 } };
}

async function main() {
  const workbook = new ExcelJS.Workbook();
  const imageId = workbook.addImage({ filename: logoPath, extension: "png" });

  await buildPreinscripcion(workbook, imageId);
  const wbPre = workbook;
  await wbPre.xlsx.writeFile(path.join(resourcesDir, "PreinscripcionTemplate.xlsx"));

  const workbook2 = new ExcelJS.Workbook();
  const imageId2 = workbook2.addImage({ filename: logoPath, extension: "png" });
  await buildCartaCompromiso(workbook2, imageId2);
  await workbook2.xlsx.writeFile(path.join(resourcesDir, "CartaCompromisoTemplate.xlsx"));

  console.log("Listo: PreinscripcionTemplate.xlsx y CartaCompromisoTemplate.xlsx escritos en", resourcesDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
