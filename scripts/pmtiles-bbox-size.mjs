// Usage: node scripts/pmtiles-bbox-size.mjs <archive url> <W,S,E,N> <maxzoom...>   (B-0 measurement, docs/plans/2026-11-16-r10-map-evaluation.md)
// Sum the bytes of every tile inside a bbox up to maxzoom in a remote PMTiles v3 archive, by reading its directories
// with HTTP Range requests (spec: https://github.com/protomaps/PMTiles/blob/main/spec/v3/spec.md). No tile data is downloaded.
import { gunzipSync } from 'node:zlib';
const [url, bboxArg, ...zooms] = process.argv.slice(2);
const [W, S, E, N] = bboxArg.split(',').map(Number);
let requests = 0;
const range = async (off, len) => { requests++; const r = await fetch(url, { headers: { Range: `bytes=${off}-${off + len - 1}` } }); if (r.status !== 206) throw new Error(`HTTP ${r.status}`); return Buffer.from(await r.arrayBuffer()); };
const h = await range(0, 127);
if (h.toString('latin1', 0, 7) !== 'PMTiles' || h[7] !== 3) throw new Error('not a PMTiles v3 archive');
const u64 = o => Number(h.readBigUInt64LE(o));
const hd = { rootOff: u64(8), rootLen: u64(16), leafOff: u64(40), tileOff: u64(56), tileLen: u64(64), comp: h[97], minZ: h[100], maxZ: h[101] };
if (hd.comp !== 2) throw new Error(`directory compression ${hd.comp} not handled (only gzip)`);
function readDir(buf) {
  const b = gunzipSync(buf); let p = 0;
  const v = () => { let r = 0, m = 1, c; do { c = b[p++]; r += (c & 0x7f) * m; m *= 128; } while (c & 0x80); return r; };
  /** @typedef {{id: number, run: number, len: number, off: number}} DirEntry */
  const n = v(), e = Array.from({ length: n }, () => /** @type {DirEntry} */ ({}));
  let id = 0; for (const x of e) { id += v(); x.id = id; }
  for (const x of e) x.run = v();
  for (const x of e) x.len = v();
  e.forEach((x, i) => { const o = v(); x.off = o === 0 && i > 0 ? e[i - 1].off + e[i - 1].len : o - 1; });
  return e;
}
const dirs = new Map();
const dir = async (off, len) => { const k = `${off}:${len}`; if (!dirs.has(k)) dirs.set(k, readDir(await range(off, len))); return dirs.get(k); };
function tileId(z, x, y) {
  let acc = 0; for (let i = 0; i < z; i++) acc += 4 ** i;
  const n = 2 ** z, xy = [x, y]; let d = 0;
  for (let s = n / 2; s >= 1; s /= 2) {
    const rx = (xy[0] & s) > 0 ? 1 : 0, ry = (xy[1] & s) > 0 ? 1 : 0;
    d += s * s * ((3 * rx) ^ ry);
    if (ry === 0) { if (rx === 1) { xy[0] = s - 1 - xy[0]; xy[1] = s - 1 - xy[1]; } [xy[0], xy[1]] = [xy[1], xy[0]]; }
  }
  return acc + d;
}
async function find(id) {
  let e = await dir(hd.rootOff, hd.rootLen);
  for (let depth = 0; depth < 4; depth++) {
    let lo = 0, hi = e.length - 1, hit = -1;
    while (lo <= hi) { const m = (lo + hi) >> 1; if (e[m].id <= id) { hit = m; lo = m + 1; } else hi = m - 1; }
    if (hit < 0) return null;
    const x = e[hit];
    if (x.run === 0) { e = await dir(hd.leafOff + x.off, x.len); continue; }
    return id < x.id + x.run ? x : null;
  }
  return null;
}
const lon2x = (lon, z) => Math.floor((lon + 180) / 360 * 2 ** z);
const lat2y = (lat, z) => { const r = lat * Math.PI / 180; return Math.floor((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * 2 ** z); };
console.log(`archive: zoom ${hd.minZ}-${hd.maxZ}, tile data ${(hd.tileLen / 2 ** 30).toFixed(1)} GiB`);
for (const maxZ of zooms.map(Number)) {
  const seen = new Set(); let bytes = 0, tiles = 0, missing = 0;
  for (let z = 0; z <= maxZ; z++) {
    for (let x = lon2x(W, z); x <= lon2x(E, z); x++) for (let y = lat2y(N, z); y <= lat2y(S, z); y++) {
      const t = await find(tileId(z, x, y));
      if (!t) { missing++; continue; }
      tiles++; if (!seen.has(t.off)) { seen.add(t.off); bytes += t.len; }
    }
  }
  console.log(`bbox ${bboxArg} z0-${maxZ}: ${tiles} tiles (${missing} not in archive), ${(bytes / 2 ** 20).toFixed(1)} MiB of tile data`);
}
console.log(`range requests: ${requests}`);
