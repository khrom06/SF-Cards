// Minimal PNG comparison (no dependency): node scripts/pngdiff.mjs a.png b.png  ->  differing pixels, max channel delta, bounding box.
// Handles 8-bit RGB / RGBA, non-interlaced PNGs (what headless Chrome writes).
import fs from "node:fs";
import zlib from "node:zlib";

export function decode(file) {
  const b = fs.readFileSync(file); let p = 8, w = 0, h = 0, ct = 0; const idat = [];
  while (p < b.length) { const len = b.readUInt32BE(p), type = b.toString("ascii", p + 4, p + 8), d = b.subarray(p + 8, p + 8 + len);
    if (type === "IHDR") { w = d.readUInt32BE(0); h = d.readUInt32BE(4); ct = d[9]; if (d[8] !== 8 || d[12] !== 0) throw new Error("unsupported PNG (need 8-bit, non-interlaced)"); }
    if (type === "IDAT") idat.push(d); p += 12 + len; }
  const bpp = ct === 6 ? 4 : ct === 2 ? 3 : 0; if (!bpp) throw new Error("unsupported colour type " + ct);
  const raw = zlib.inflateSync(Buffer.concat(idat)), stride = w * bpp, out = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) { const f = raw[y * (stride + 1)], row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) { const a = x >= bpp ? out[y * stride + x - bpp] : 0, up = y ? out[(y - 1) * stride + x] : 0, c = x >= bpp && y ? out[(y - 1) * stride + x - bpp] : 0; let v = row[x];
      if (f === 1) v += a; else if (f === 2) v += up; else if (f === 3) v += (a + up) >> 1; else if (f === 4) { const pp = a + up - c, pa = Math.abs(pp - a), pb = Math.abs(pp - up), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? up : c; }
      out[y * stride + x] = v & 255; } }
  return { w, h, bpp, data: out };
}
export function diff(fa, fb) {
  const A = decode(fa), B = decode(fb); if (A.w !== B.w || A.h !== B.h) return { size: `${A.w}x${A.h} vs ${B.w}x${B.h}` };
  let n = 0, max = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let y = 0; y < A.h; y++) for (let x = 0; x < A.w; x++) { let m = 0; for (let c = 0; c < 3; c++) m = Math.max(m, Math.abs(A.data[(y * A.w + x) * A.bpp + c] - B.data[(y * B.w + x) * B.bpp + c]));
    if (m) { n++; max = Math.max(max, m); x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } }
  return { pixels: n, maxDelta: max, box: n ? [x0, y0, x1, y1] : null };
}
if (process.argv[1] && process.argv[1].endsWith("pngdiff.mjs") && process.argv[2]) console.log(JSON.stringify(diff(process.argv[2], process.argv[3])));
