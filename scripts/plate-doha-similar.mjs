// How alike are two pieces, or two rocks, of one ward (docs/plans/2026-11-16-doha.md §10.3)? Each outline is normalised (moved
// to its centre, turned onto its long axis, scaled by its mean radius) and written as its radius at 96 angles; the distance of two
// shapes is the RMS difference of those, the smaller over the four mirror/half-turn variants. A bank is compared by its crest: the
// ridge as a curve over its chord (chord = 1). Printed per ward: the nearest pair of tongues, of banks, of rocks.
//   floor      the same control points with two different seeds: what the jitter alone makes (the median over the pieces)
//   threshold  FLOOR_X times the floor of that kind (tongues and rocks: the tongues' floor; banks: the banks'), never under MIN_DIST: a pair under it is called a copy, and the test fails
// Usage: node scripts/plate-doha-similar.mjs [W_NAKAGYO W_FUSHIMI ...]
import {PLATES, preparePlate} from '../src/studies/toji/plate/parts.js';
import {MAT} from '../src/studies/toji/plate/mat.js';
import {KIND} from '../src/studies/toji/plate/vocab.js';
import {tongueGeom, bankGeom} from '../src/studies/toji/plate/doha.js';
import {fileURLToPath} from 'node:url';

export const FLOOR_X = 2, MIN_DIST = .06;
const N = 96;

/** The radius of a closed outline at N angles from its centroid, along its long axis, divided by its mean radius. */
export function radial(d) {
  const cx = d.reduce((s, p) => s + p[0], 0) / d.length, cz = d.reduce((s, p) => s + p[1], 0) / d.length;
  let sxx = 0, szz = 0, sxz = 0;
  for (const [x, z] of d) { sxx += (x - cx) ** 2; szz += (z - cz) ** 2; sxz += (x - cx) * (z - cz); }
  const a0 = .5 * Math.atan2(2 * sxz, sxx - szz), out = [];
  for (let k = 0; k < N; k++) {
    const th = a0 + k / N * 2 * Math.PI, ux = Math.cos(th), uz = Math.sin(th);
    let best = 0;
    for (let i = 0; i < d.length; i++) {
      const [ax, az] = [d[i][0] - cx, d[i][1] - cz], [bx, bz] = [d[(i + 1) % d.length][0] - cx, d[(i + 1) % d.length][1] - cz];
      const den = ux * (bz - az) - uz * (bx - ax);
      if (Math.abs(den) < 1e-9) continue;
      const t = (ax * (bz - az) - az * (bx - ax)) / den, s = (ax * uz - az * ux) / den;
      if (t > 0 && s >= 0 && s <= 1) best = Math.max(best, t);
    }
    out.push(best);
  }
  // A light smoothing (two passes of 1-2-1): the jitter and the scallops are not the shape.
  let v = out;
  for (let pass = 0; pass < 3; pass++) v = v.map((x, i) => (v[(i + N - 1) % N] + 2 * x + v[(i + 1) % N]) / 4);
  const m = v.reduce((s, q) => s + q, 0) / N;
  return v.map(q => q / m);
}
/** The crest of a bank over its chord: its height over the chord (in units of its own peak height) at 64 steps along it, and its aspect (peak height / chord). */
export function crest(ridge) {
  const [x0, z0] = ridge[0], [x1, z1] = ridge[ridge.length - 1], c = Math.hypot(x1 - x0, z1 - z0), ca = (x1 - x0) / c, sa = (z1 - z0) / c;
  const pts = ridge.map(([x, z]) => [((x - x0) * ca + (z - z0) * sa) / c, (-(x - x0) * sa + (z - z0) * ca) / c]), out = [];
  const peak = Math.max(1e-6, ...pts.map(p => Math.abs(p[1])));
  for (let k = 0; k < 64; k++) {
    const u = k / 63; let j = 0;
    while (j < pts.length - 2 && pts[j + 1][0] < u) j++;
    const f = (u - pts[j][0]) / ((pts[j + 1][0] - pts[j][0]) || 1);
    out.push((pts[j][1] + (pts[j + 1][1] - pts[j][1]) * Math.max(0, Math.min(1, f))) / peak);
  }
  out.aspect = peak;
  return out;
}
const rms = (a, b) => Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0) / a.length);
/** Distance of two radial profiles over the four variants (mirror, half turn). */
export function radialDist(a, b) {
  const rev = v => v.map((_, i) => v[(N - i) % N]), half = v => v.map((_, i) => v[(i + N / 2) % N]);
  return Math.min(rms(a, b), rms(a, rev(b)), rms(a, half(b)), rms(a, half(rev(b))));
}
export const crestDist = (a, b) => Math.hypot(Math.min(rms(a, b), rms(a, b.slice().reverse())), .5 * Math.log(a.aspect / b.aspect));

function pairs(items, dist) {
  let best = {d: Infinity};
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) { const d = dist(items[i].sig, items[j].sig); if (d < best.d) best = {d, a: items[i].id, b: items[j].id}; }
  return best;
}
/** The jitter floor: a shape against itself drawn with another seed. */
function floorOf(spec, kind) {
  const f = kind === 'tongue' ? q => radial(tongueGeom(q).outline) : q => crest(bankGeom(q).ridge);
  const d = kind === 'tongue' ? radialDist : crestDist;
  const out = spec.map(q => d(f({...q, seed: 1}), f({...q, seed: 97})));
  return out.sort((a, b) => a - b)[Math.floor(out.length / 2)];
}

export async function similar(ward) {
  const mod = await import(`../src/studies/toji/plate/${{W_FUSHIMI: 'fushimi', W_NAKAGYO: 'nakagyo', W_HIGASHIYAMA: 'higashiyama', W_KITA: 'kita', W_MINAMI: 'minami', W_UKYO: 'ukyo', W_SAKYO: 'sakyo', W_YAMASHINA: 'yamashina', W_NISHIKYO: 'nishikyo', W_KAMIGYO: 'kamigyo', W_SHIMOGYO: 'shimogyo'}[ward]}.js`);
  const {parts} = preparePlate(PLATES[ward]());
  const tong = [], bank = [], rocks = [];
  for (const p of parts) {
    if (p.kind === KIND.hill) for (const f of p.fills) { const id = p.id + '#' + (tong.length + bank.length); if (f.tongue) tong.push({id, sig: radial(f.d)}); else if (f.wedge) bank.push({id, sig: crest(f.wedge.ridge)}); }
    if (p.kind === KIND.rock && /^rock-/.test(p.id)) rocks.push({id: p.id, sig: radial(p.fills[0].d)});
  }
  const specs = Object.values(mod.PIECES).flat(), tspec = specs.filter(q => q.p), bspec = specs.filter(q => q.ridge);
  const tf = tspec.length ? floorOf(tspec, 'tongue') : 0, bf = bspec.length ? floorOf(bspec, 'bank') : 0;
  const thr = f => +Math.max(MIN_DIST, FLOOR_X * f).toFixed(3), threshold = {tongues: thr(tf), banks: thr(bf), rocks: thr(tf)};
  return {ward, floor: {tongues: +tf.toFixed(4), banks: +bf.toFixed(4)}, threshold,
    tongues: tong.length > 1 ? {...pairs(tong, radialDist), n: tong.length} : null,
    banks: bank.length > 1 ? {...pairs(bank, crestDist), n: bank.length} : null,
    rocks: rocks.length > 1 ? {...pairs(rocks, radialDist), n: rocks.length} : null};
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  for (const ward of process.argv.length > 2 ? process.argv.slice(2) : ['W_NAKAGYO', 'W_FUSHIMI']) console.log(JSON.stringify(await similar(ward)));
}
