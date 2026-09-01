// Toma la casilla vacía del FORMATO (word/media/image4.png, RGBA de 8 bits sin entrelazar) y le
// dibuja dentro una "X" gruesa, conservando el borde original intacto. Así la casilla marcada es
// EXACTAMENTE la misma casilla del documento, no un dibujo parecido: al cambiar la relación de la
// imagen (ver DocxCellSurgery.SetCheckbox) la casilla se marca sin mover un píxel del diseño.
//
// Uso: node png-check.mjs <casillaVacia.png> <salidaMarcada.png>
import fs from "node:fs";
import zlib from "node:zlib";

const [srcPath, outPath] = process.argv.slice(2);
const png = fs.readFileSync(srcPath);

if (png.readUInt32BE(0) !== 0x89504e47) throw new Error("No es un PNG");

// ---- leer chunks ----
const chunks = [];
for (let i = 8; i < png.length; ) {
  const len = png.readUInt32BE(i);
  const type = png.toString("ascii", i + 4, i + 8);
  chunks.push({ type, data: png.subarray(i + 8, i + 8 + len) });
  i += 12 + len;
  if (type === "IEND") break;
}
const ihdr = chunks.find((c) => c.type === "IHDR").data;
const width = ihdr.readUInt32BE(0);
const height = ihdr.readUInt32BE(4);
const bitDepth = ihdr[8];
const colorType = ihdr[9];
if (bitDepth !== 8 || colorType !== 6) throw new Error(`Se esperaba RGBA de 8 bits, no ${colorType}/${bitDepth}`);

const raw = zlib.inflateSync(Buffer.concat(chunks.filter((c) => c.type === "IDAT").map((c) => c.data)));

// ---- deshacer los filtros por línea ----
const bpp = 4;
const stride = width * bpp;
const pix = Buffer.alloc(height * stride);
for (let y = 0; y < height; y++) {
  const filter = raw[y * (stride + 1)];
  const line = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
  for (let x = 0; x < stride; x++) {
    const a = x >= bpp ? pix[y * stride + x - bpp] : 0;
    const b = y > 0 ? pix[(y - 1) * stride + x] : 0;
    const c = x >= bpp && y > 0 ? pix[(y - 1) * stride + x - bpp] : 0;
    let v = line[x];
    if (filter === 1) v += a;
    else if (filter === 2) v += b;
    else if (filter === 3) v += (a + b) >> 1;
    else if (filter === 4) {
      const p = a + b - c;
      const pa = Math.abs(p - a);
      const pb = Math.abs(p - b);
      const pc = Math.abs(p - c);
      v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
    }
    pix[y * stride + x] = v & 0xff;
  }
}

// ---- dibujar la X ----
// El trazo va del 26% al 74% del recuadro, para que no toque el borde. Grosor proporcional al
// tamaño (la casilla vacía mide ~96px, así que salen ~7px, parecido al grosor del propio borde).
const ink = [0, 0, 0, 255];
const grosor = Math.max(2, Math.round(Math.min(width, height) * 0.075));
const x0 = Math.round(width * 0.26);
const x1 = Math.round(width * 0.74);
const y0 = Math.round(height * 0.26);
const y1 = Math.round(height * 0.74);

function plot(x, y) {
  if (x < 0 || y < 0 || x >= width || y >= height) return;
  const o = y * stride + x * bpp;
  pix[o] = ink[0];
  pix[o + 1] = ink[1];
  pix[o + 2] = ink[2];
  pix[o + 3] = ink[3];
}

function linea(ax, ay, bx, by) {
  const pasos = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
  const r = Math.floor(grosor / 2);
  for (let s = 0; s <= pasos; s++) {
    const x = Math.round(ax + ((bx - ax) * s) / pasos);
    const y = Math.round(ay + ((by - ay) * s) / pasos);
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) plot(x + dx, y + dy);
  }
}

linea(x0, y0, x1, y1);
linea(x1, y0, x0, y1);

// ---- volver a codificar (sin filtro, que para 96x92 no cuesta nada) ----
const out = Buffer.alloc(height * (stride + 1));
for (let y = 0; y < height; y++) {
  out[y * (stride + 1)] = 0;
  pix.copy(out, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
}
const idat = zlib.deflateSync(out, { level: 9 });

function chunk(type, data) {
  const b = Buffer.alloc(12 + data.length);
  b.writeUInt32BE(data.length, 0);
  b.write(type, 4, "ascii");
  data.copy(b, 8);
  b.writeInt32BE(crc32(b.subarray(4, 8 + data.length)), 8 + data.length);
  return b;
}

let crcTable = null;
function crc32(buf) {
  if (!crcTable) {
    crcTable = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c;
    }
  }
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return c ^ -1;
}

fs.writeFileSync(
  outPath,
  Buffer.concat([
    png.subarray(0, 8),
    chunk("IHDR", ihdr),
    chunk("pHYs", chunks.find((c) => c.type === "pHYs")?.data ?? Buffer.alloc(0)),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]),
);
console.log(`Escrito ${outPath} (${width}x${height}, trazo ${grosor}px)`);
