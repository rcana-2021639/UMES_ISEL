// Empaqueta un directorio (una plantilla .docx ya descomprimida y editada) de vuelta a .docx/.zip
// con separadores '/' correctos — Compress-Archive de PowerShell usa '\' y LibreOffice/Word no lo
// abren. Uso: node zip-dir.mjs <directorioFuente> <archivoSalida.docx>
import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";

const [srcDir, outFile] = process.argv.slice(2);

function walk(dir, base = "") {
  const entries = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const rel = base ? `${base}/${name}` : name;
    if (fs.statSync(full).isDirectory()) entries.push(...walk(full, rel));
    else entries.push({ rel, full });
  }
  return entries;
}

const zip = new JSZip();
for (const { rel, full } of walk(srcDir)) {
  zip.file(rel, fs.readFileSync(full));
}
const buf = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
fs.writeFileSync(outFile, buf);
console.log(`Escrito ${outFile} (${buf.length} bytes)`);
