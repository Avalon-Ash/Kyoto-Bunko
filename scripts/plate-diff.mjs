// Compares two folders of plate pictures pixel by pixel (PNG, 8-bit RGB or RGBA, as scripts/plate-shot.mjs writes them). No dependencies.
// Usage: node scripts/plate-diff.mjs <dirA> <dirB> [--noise <dirA2>] [--tol N] [--share P]
//   --noise <dirA2>  a second shooting of the same code as dirA: the pixels where A and A2 differ are the noise mask, and only
//                    differences outside it count against B.
//   --tol N          a pixel differs when any channel is more than N levels (of 255) apart. Default 0: the pictures must be identical.
//   --share P        the share of differing pixels (percent, outside the mask) a picture may have. Default 0.
// Prints one JSON line per picture (pixels, differing pixels and their share, the largest channel difference, the differences'
// bounding box) and a summary; exits 1 when a picture is missing, of another size, or over the limits.
// Shoot both folders with PLATE_CLOCK set (the picture is then the lid alone under a pinned clock): docs/plans/2026-11-18-material-table.md §3.
import {readFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';
import {inflateSync} from 'node:zlib';

/** Decodes a PNG file to {width, height, channels, data}: 8 bits a channel, colour type 2 (RGB) or 6 (RGBA), not interlaced. */
export function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  let at = 8, width = 0, height = 0, channels = 0;
  const idat = [];
  while (at < buf.length) {
    const len = buf.readUInt32BE(at), type = buf.toString('latin1', at + 4, at + 8), body = buf.subarray(at + 8, at + 8 + len);
    if (type === 'IHDR') {
      width = body.readUInt32BE(0); height = body.readUInt32BE(4);
      if (body[8] !== 8 || (body[9] !== 2 && body[9] !== 6) || body[12] !== 0) throw new Error(`unsupported PNG (depth ${body[8]}, colour ${body[9]}, interlace ${body[12]})`);
      channels = body[9] === 6 ? 4 : 3;
    } else if (type === 'IDAT') idat.push(body);
    else if (type === 'IEND') break;
    at += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat)), stride = width * channels, data = new Uint8Array(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)], row = y * (stride + 1) + 1, out = y * stride;
    for (let x = 0; x < stride; x++) {
      const left = x >= channels ? data[out + x - channels] : 0, up = y ? data[out + x - stride] : 0, upLeft = y && x >= channels ? data[out + x - stride - channels] : 0;
      let predicted = 0;
      if (filter === 1) predicted = left;
      else if (filter === 2) predicted = up;
      else if (filter === 3) predicted = (left + up) >> 1;
      else if (filter === 4) { const p = left + up - upLeft, a = Math.abs(p - left), b = Math.abs(p - up), c = Math.abs(p - upLeft); predicted = a <= b && a <= c ? left : b <= c ? up : upLeft; }
      else if (filter !== 0) throw new Error(`unknown PNG filter ${filter}`);
      data[out + x] = (raw[row + x] + predicted) & 255;
    }
  }
  return {width, height, channels, data};
}

/** Largest channel difference at each pixel of two decoded pictures of the same size (alpha left out). */
export function pixelDiff(a, b) {
  if (a.width !== b.width || a.height !== b.height) throw new Error(`sizes differ: ${a.width}x${a.height} and ${b.width}x${b.height}`);
  const out = new Uint8Array(a.width * a.height);
  for (let i = 0; i < out.length; i++) {
    const p = i * a.channels, q = i * b.channels;
    out[i] = Math.max(Math.abs(a.data[p] - b.data[q]), Math.abs(a.data[p + 1] - b.data[q + 1]), Math.abs(a.data[p + 2] - b.data[q + 2]));
  }
  return out;
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll('\\', '/').split('/').pop());
if (isMain) {
  const args = process.argv.slice(2), flag = name => { const i = args.indexOf(name); return i < 0 ? null : args.splice(i, 2)[1]; };
  const noiseDir = flag('--noise'), tol = Number(flag('--tol') ?? 0), share = Number(flag('--share') ?? 0), [dirA, dirB] = args;
  if (!dirA || !dirB) { console.error('usage: node scripts/plate-diff.mjs <dirA> <dirB> [--noise <dirA2>] [--tol N] [--share P]'); process.exit(2); }
  const names = readdirSync(dirA).filter(n => n.endsWith('.png')).sort();
  let bad = 0, worst = 0, total = 0;
  for (const name of names) {
    let line;
    try {
      const a = decodePng(readFileSync(join(dirA, name))), diff = pixelDiff(a, decodePng(readFileSync(join(dirB, name))));
      const noise = noiseDir ? pixelDiff(a, decodePng(readFileSync(join(noiseDir, name)))) : null;
      let differ = 0, masked = 0, max = 0, x0 = a.width, y0 = a.height, x1 = -1, y1 = -1, noisy = 0;
      for (let i = 0; i < diff.length; i++) {
        if (noise && noise[i] > 0) { noisy++; if (diff[i] > tol) masked++; continue; }
        if (diff[i] > max) max = diff[i];
        if (diff[i] > tol) { differ++; const x = i % a.width, y = (i - x) / a.width; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      }
      const pct = differ / diff.length * 100, over = pct > share;
      if (over) bad++;
      worst = Math.max(worst, max); total += differ;
      line = {name, pixels: diff.length, differ, share: Math.round(pct * 10000) / 10000, max, ...(differ ? {box: [x0, y0, x1, y1]} : {}), ...(noise ? {noise: noisy, inNoise: masked} : {}), ok: !over};
    } catch (error) { bad++; line = {name, error: /** @type {Error} */ (error).message, ok: false}; }
    console.log(JSON.stringify(line));
  }
  console.log(JSON.stringify({pictures: names.length, failing: bad, differingPixels: total, largestDifference: worst, tol, share, ...(noiseDir ? {noise: noiseDir} : {})}));
  if (bad || !names.length) process.exitCode = 1;
}
