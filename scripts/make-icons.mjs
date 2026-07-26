/**
 * Renders public/icon-192.png and icon-512.png — the PWA install icons.
 * Pure Node (zlib only) so there is no image-tooling dependency.
 * Run with: npm run icons
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../public');

/* ----------------------------- geometry ------------------------------ */

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

/** Signed distance to a rounded rectangle centred at (cx, cy). */
function sdRoundRect(px, py, cx, cy, hw, hh, r) {
  const qx = Math.abs(px - cx) - (hw - r);
  const qy = Math.abs(py - cy) - (hh - r);
  const ax = Math.max(qx, 0), ay = Math.max(qy, 0);
  return Math.hypot(ax, ay) + Math.min(Math.max(qx, qy), 0) - r;
}

/** Signed distance to a capsule (thick line segment) from a to b. */
function sdCapsule(px, py, ax, ay, bx, by, r) {
  const pax = px - ax, pay = py - ay;
  const bax = bx - ax, bay = by - ay;
  const h = clamp01((pax * bax + pay * bay) / (bax * bax + bay * bay));
  return Math.hypot(pax - bax * h, pay - bay * h) - r;
}

const mix = (a, b, t) => a + (b - a) * t;

/* ------------------------------ render ------------------------------- */

function render(size) {
  const s = size / 512;                       // design is authored at 512
  const px = new Uint8Array(size * size * 4);
  const AA = 1.2 * s;                          // antialias width in pixels

  const bg = [8, 13, 11];
  const g0 = [34, 197, 94];
  const g1 = [74, 222, 128];

  // dumbbell strokes, in 512-space
  const strokes = [
    [158, 168, 158, 344, 15],
    [110, 208, 110, 304, 15],
    [354, 168, 354, 344, 15],
    [402, 208, 402, 304, 15],
    [158, 256, 354, 256, 15],
  ];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const X = (x + 0.5) / s;                 // to 512-space
      const Y = (y + 0.5) / s;
      const i = (y * size + x) * 4;

      // gradient factor across the diagonal
      const t = clamp01((X + Y) / 1024);
      const gr = mix(g0[0], g1[0], t);
      const gg = mix(g0[1], g1[1], t);
      const gb = mix(g0[2], g1[2], t);

      // outer rounded square (the icon body)
      const dBody = sdRoundRect(X, Y, 256, 256, 256, 256, 112);
      const bodyA = clamp01(0.5 - dBody / (AA / s));
      if (bodyA <= 0) { px[i + 3] = 0; continue; }

      let r = bg[0], g = bg[1], b = bg[2];

      // soft inner gradient plate
      const dPlate = sdRoundRect(X, Y, 256, 256, 228, 228, 92);
      const plateA = clamp01(0.5 - dPlate / (AA / s)) * 0.16;
      r = mix(r, gr, plateA); g = mix(g, gg, plateA); b = mix(b, gb, plateA);

      // dumbbell
      let dMark = Infinity;
      for (const [ax, ay, bx, by, rad] of strokes) {
        dMark = Math.min(dMark, sdCapsule(X, Y, ax, ay, bx, by, rad));
      }
      const markA = clamp01(0.5 - dMark / (AA / s));
      r = mix(r, gr, markA); g = mix(g, gg, markA); b = mix(b, gb, markA);

      px[i] = Math.round(r);
      px[i + 1] = Math.round(g);
      px[i + 2] = Math.round(b);
      px[i + 3] = Math.round(bodyA * 255);
    }
  }
  return px;
}

/* ------------------------------- PNG --------------------------------- */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function toPng(pixels, size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;    // bit depth
  ihdr[9] = 6;    // RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;   // filter: none
    Buffer.from(pixels.buffer, y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(OUT_DIR, { recursive: true });
for (const size of [192, 512]) {
  const file = resolve(OUT_DIR, `icon-${size}.png`);
  writeFileSync(file, toPng(render(size), size));
  console.log(`wrote ${file}`);
}
