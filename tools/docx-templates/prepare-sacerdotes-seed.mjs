// Genera backend/UmesIsel.Api/Data/Seed/sacerdotes.seed.json desde la hoja
// "Sacerdotes" del Excel del trimestre. Se corre a mano, no forma parte del build.
import ExcelJS from "exceljs";
import fs from "node:fs";

const XLSX = "C:/Users/Rhandy/Downloads/III Trimestre 2026 - Procesos de inscripción y asignación de cursos.xlsx";
const CARRERA = "Actualización profesional de la licenciatura en Teología con especialidad en Pastoral";
const OUT = "C:/Users/Rhandy/Desktop/UMES_PAGISEL/backend/UmesIsel.Api/Data/Seed/sacerdotes.seed.json";

/**
 * La hoja escribe el nombre corrido, sin coma, y no siempre en el mismo orden:
 * la mayoría va "Apellido1 Apellido2 Nombre1 Nombre2", pero unos cuantos van al
 * revés ("Jose Larios Solis"). El correo institucional es el desempate: lo forma
 * el apellido y el nombre pegados, así que dice cuál de los dos bandos del
 * nombre es el apellido. Los que no se dejan partir por esa regla van a mano
 * en OVERRIDES.
 */
const OVERRIDES = {
  // "De la Cruz" es un apellido de tres palabras.
  "2026101500": { ap1: "De la Cruz", ap2: "Flores", n1: "Osman", n2: "Leonel" },
  // La hoja lo escribe "Alvaro Riz González"; el correo (gonzalezalvaro@) dice
  // que el apellido es González, así que "Riz" es segundo nombre, no apellido.
  "2026101513": { ap1: "González", ap2: null, n1: "Alvaro", n2: "Riz" },
  // Los cuatro que la hoja escribe con el nombre primero.
  "2026101528": { ap1: "Upún", ap2: "Miculax", n1: "Vitalino", n2: null },
  "2026101531": { ap1: "Flores", ap2: "Trinidad", n1: "Elder", n2: "Ernesto" },
  "2026101532": { ap1: "Butz", ap2: "Pop", n1: "Marvin", n2: "Alberto" },
  "2026101530": { ap1: "Larios", ap2: "Solis", n1: "Jose", n2: null },
};

function cell(c) {
  if (c == null) return "";
  if (typeof c === "object") {
    if (c.richText) return c.richText.map((r) => r.text).join("");
    if (c.text != null) return String(c.text);
    if (c.result != null) return String(c.result);
    return "";
  }
  return String(c);
}

const clean = (s) => cell(s).replace(/\s+/g, " ").trim();
// Los correos de la hoja traen algún carácter invisible pegado delante (U+200E).
const cleanMail = (s) => clean(s).replace(/[\u200B-\u200F\uFEFF]/g, "").toLowerCase() || null;
const cleanTel = (s) => clean(s).replace(/\s+/g, "") || null;

/** "Apellido1 Apellido2 Nombre1 Nombre2" -> las cuatro partes, por posición. */
function splitPorPosicion(nombre) {
  const t = nombre.split(" ").filter(Boolean);
  if (t.length <= 1) return { ap1: t[0] ?? "", ap2: null, n1: "", n2: null };
  if (t.length === 2) return { ap1: t[0], ap2: null, n1: t[1], n2: null };
  if (t.length === 3) return { ap1: t[0], ap2: t[1], n1: t[2], n2: null };
  return { ap1: t[0], ap2: t[1], n1: t[2], n2: t.slice(3).join(" ") };
}

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(XLSX);
const ws = wb.getWorksheet("Sacerdotes");

const alumnos = [];
const sinCarnet = [];
const duplicados = [];
const vistos = new Map();

for (let r = 3; r <= ws.rowCount; r++) {
  const row = ws.getRow(r);
  const carnet = clean(row.getCell(2).value);
  const nombre = clean(row.getCell(3).value);
  if (!nombre) continue;

  // Solo entran carnés reales: el carné es la llave con la que se entra al
  // portal, y "PENDIENTE" o vacío no lo es. El resto se reporta aparte.
  if (!/^\d{6,}$/.test(carnet)) {
    sinCarnet.push({ fila: r, carnet: carnet || "(vacío)", nombre });
    continue;
  }
  if (vistos.has(carnet)) {
    duplicados.push({ fila: r, carnet, nombre, chocaCon: vistos.get(carnet) });
    continue;
  }
  vistos.set(carnet, nombre);

  const p = OVERRIDES[carnet] ?? splitPorPosicion(nombre);
  const apellidos = [p.ap1, p.ap2].filter(Boolean).join(" ");
  const nombres = [p.n1, p.n2].filter(Boolean).join(" ");

  alumnos.push({
    carnet,
    nombreCompleto: `${apellidos}, ${nombres}`,
    primerApellido: p.ap1,
    segundoApellido: p.ap2 || null,
    primerNombre: p.n1,
    segundoNombre: p.n2 || null,
    carrera: CARRERA,
    seccion: null,
    trimestre: Number(clean(row.getCell(4).value)) || 1,
    correoInstitucional: cleanMail(row.getCell(6).value),
    correoPersonal: cleanMail(row.getCell(7).value),
    celular: cleanTel(row.getCell(8).value),
  });
}

fs.writeFileSync(OUT, JSON.stringify(alumnos, null, 2) + "\n", "utf8");

console.log(`Escritos ${alumnos.length} sacerdotes en ${OUT}\n`);
console.log(`--- Sin carné válido (${sinCarnet.length}), NO se importaron ---`);
for (const s of sinCarnet) console.log(`  fila ${s.fila}: ${s.nombre}  [carné: ${s.carnet}]`);
console.log(`\n--- Carné repetido (${duplicados.length}), NO se importaron ---`);
for (const d of duplicados) console.log(`  fila ${d.fila}: ${d.nombre} tiene el carné ${d.carnet}, que ya es de "${d.chocaCon}"`);
