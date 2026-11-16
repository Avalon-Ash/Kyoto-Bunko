// Doha: the ground of a Hatsune lid is not one raised block but pieces, laid one on another, each drawn by hand.
// Two forms (docs/plans/2026-11-16-doha.md §3.0, §4.2, §10):
//   tongues  Suhama. A flat tongue of gold or silver, a little raised at its edge, with a string of cut gold on a few of them.
//   banks    A bank or a mountain's head. Its upper edge (the ridge) is firm and crisp; from there the powder is ground down in a
//            wedge that ends in the lacquer with no lower edge. The ridge's height dies out toward its two ends, so a head
//            ends by sinking into the ground (or into the head in front of it), not by a wall.
// There are no templates here. A ward's file writes every piece as control points: the outline of a tongue, the ridge of a
// bank (x, z, and optionally how strong the crest is there and how far the wedge runs down). This file only draws a smooth
// curve through them and lets a seed shake it by at most JITTER units, so that no run of an edge is ruled.
// A cluster is one group with up to two parts: its gold pieces and its silver pieces (the part limit is 64).
// Pure geometry. The painting of a bank's wedge and the string of cut gold is in bake.js (paintWedge, paintKiriString).
import {MAT} from './mat.js';
import {KIND, rand, PLATE} from './vocab.js';

const TAU = Math.PI * 2;
/** The most a seed may move any point of a hand-written outline, in plate units. */
export const JITTER = 1.5;
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** The shape of a bank's wedge: [distance from the ridge / depth, height], read by bake.js (painted) and the shader. */
export const WEDGE_PROFILE = [[0, 1], [.06, .82], [.2, .55], [.45, .24], [.75, .06], [1, 0]];
/** The fade of a far mountain's powder down from its ridge: [distance from the ridge / depth, density]. Long and even; it ends in the ground. */
export const TOYAMA_PROFILE = [[0, 1], [.025, .74], [.07, .62], [.24, .49], [.5, .3], [.78, .12], [1, 0]];
/** How tall a bank's crest stands in the soft (geometry) channel, as a share of the soft swell (three-pack.js K_SWELL). */
export const BANK_SOFT = .3;

/** A Catmull-Rom curve through control points (each with any number of extra channels), resampled about every `step` units. */
function spline(ctrl, closed, step) {
  const n = ctrl.length, at = i => closed ? ctrl[((i % n) + n) % n] : ctrl[Math.max(0, Math.min(n - 1, i))];
  const dense = [];
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    for (let k = 0; k < 8; k++) {
      const t = k / 8, t2 = t * t, t3 = t2 * t;
      dense.push(p1.map((_, c) => .5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3)));
    }
  }
  if (!closed) dense.push([...ctrl[n - 1]]);
  // Even out by arc length (x and z only).
  const len = [0];
  for (let i = 1; i < dense.length; i++) len.push(len[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]));
  const closeLen = closed ? Math.hypot(dense[0][0] - dense[dense.length - 1][0], dense[0][1] - dense[dense.length - 1][1]) : 0;
  const total = len[len.length - 1] + closeLen;
  const m = Math.max(closed ? 8 : 2, Math.round(total / step)), out = [];
  let j = 0;
  for (let s = 0; s < (closed ? m : m + 1); s++) {
    const target = total * s / m;
    while (j < dense.length - 1 && len[j + 1] <= target) j++;
    const a = dense[j], b = dense[(j + 1) % dense.length], segEnd = j + 1 < dense.length ? len[j + 1] : total, f = segEnd > len[j] ? (target - len[j]) / (segEnd - len[j]) : 0;
    const t = Math.max(0, Math.min(1, f));
    out.push(a.map((v, c) => v + (b[c] - v) * t));
  }
  return out;
}

/** A seed's small shake: moves each point along its normal by a slow wave, never by more than JITTER. */
function shake(pts, closed, seed) {
  const r = rand(seed), ph = [r() * TAU, r() * TAU], k = [3 + r() * 3, 9 + r() * 5], n = pts.length;
  return pts.map((p, i) => {
    const a = pts[closed ? (i + n - 1) % n : Math.max(0, i - 1)], b = pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, u = i / n, w = JITTER * (.62 * Math.sin(TAU * k[0] * u + ph[0]) + .38 * Math.sin(TAU * k[1] * u + ph[1]));
    return [p[0] - (b[1] - a[1]) / l * w, p[1] + (b[0] - a[0]) / l * w, ...p.slice(2)];
  });
}

const pathOf = (pts, from, to) => pts.slice(Math.round(from * (pts.length - 1)), Math.round(to * (pts.length - 1)) + 1).map(q => [q[0], q[1]]);
const part = (id, group, mat, anchor, extra = {}) => ({id, kind: KIND.hill, group, order: 0, layer: 0, mat, reach: .5, thick: 0, bias: 0, anchor, fills: [], lines: [], ...extra});
const centreOf = geoms => { const all = geoms.flatMap(g => g.outline); return [all.reduce((s, q) => s + q[0], 0) / all.length, all.reduce((s, q) => s + q[1], 0) / all.length]; };

/**
 * A tongue's outline from its control points: a closed smooth curve, the points listed round the piece in either direction
 * (q.sc, default 1, only enlarges the drawing about its middle).
 * Returns {outline}.
 */
export function tongueGeom(q) {
  if (!Array.isArray(q.p) || q.p.length < 6) throw new Error('tongue: write at least six control points');
  const k = q.sc ?? 1, ctrl = q.p.map(([x, z]) => [x * k + (q.at?.[0] ?? 0), z * k + (q.at?.[1] ?? 0)]);
  return {outline: shake(spline(ctrl, true, 3.5), true, q.seed ?? 1)};
}

/**
 * A bank's ridge and foot from its control points (q.rear: how far a rounded crest slopes away behind its ridge). q.ridge: [[x, z, env?, depth?]] along the crest from its left end to its
 * right (env: how strong the crest is there, 0..1; depth: how far the wedge runs down from there, as a share of q.depth). The
 * crest's strength also falls to 0 over the first and last q.taper (default .22) of its length. Each ridge point carries the
 * unit normal pointing down the slope (toward the viewer; the wedge itself runs straight down the plate). Returns {outline, ridge: [[x, z, env, nx, nz, depthShare]], depth}.
 */
export function bankGeom(q) {
  if (!Array.isArray(q.ridge) || q.ridge.length < 3) throw new Error('bank: write at least three ridge points');
  const ctrl = q.ridge.map(([x, z, e = 1, d = 1]) => [x + (q.at?.[0] ?? 0), z + (q.at?.[1] ?? 0), e, d]);
  const smoothRidge = spline(ctrl, false, q.step ?? 4);
  const pts = q.jitter === 0 ? smoothRidge : shake(smoothRidge, false, q.seed ?? 1), n = pts.length, taper = q.taper ?? .22;
  const ridge = pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, u = i / (n - 1);
    let nx = -(b[1] - a[1]) / l, nz = (b[0] - a[0]) / l;
    if (nz < 0 || (nz === 0 && nx < 0)) { nx = -nx; nz = -nz; }
    const env = Math.max(0, Math.min(1, p[2])) * Math.pow(smooth(0, taper, Math.min(u, 1 - u)), .8);
    return [p[0], p[1], env, nx, nz, Math.max(.1, p[3])];
  });
  // The foot only has to hold the whole wedge: the ridge pushed straight down a little further than the wedge runs (bake.js paintWedge).
  const foot = ridge.map(p => [p[0], p[1] + q.depth * p[5] * 1.06]);
  // A head with a rounded crest (q.rear, units) also slopes away behind its ridge, so its top is not a knife edge.
  const rear = q.rear ?? 0, top = ridge.map(p => [p[0], p[1] - rear * Math.min(1, p[2] * 3)]);
  return {outline: [...top, ...foot.slice(1, -1).reverse()], ridge, depth: q.depth, rear};
}

/**
 * A cluster of tongues. pieces: {p: [[x, z]...] the outline's control points, at?: [dx, dz] to move them all, tone: 'gold' |
 * 'silver', seed, kiri?: [from, to]} listed far to near (a later piece lies over an earlier one). kiri puts a string of cut
 * gold along the outline between two fractions of its length. The first listed piece of each tone names its part.
 */
export function tongues(id, pieces) {
  if (!pieces.length) throw new Error(`tongues(${id}): no pieces`);
  const out = {}, geoms = pieces.map(tongueGeom), centre = centreOf(geoms);
  pieces.forEach((q, i) => {
    const s = geoms[i], tone = q.tone ?? 'gold';
    const p = out[tone] ??= part(`${id}-${tone}`, id, tone === 'silver' ? MAT.sandSilver : MAT.sandGold, centre, {reach: 1.6, order: tone === 'silver' ? 1 : 0});
    const f = {d: s.outline, soft: .1, crisp: 1, tongue: true};
    if (q.kiri) { const [from, to] = q.kiri; f.kiri = [{path: pathOf(s.outline, from, to), pitch: 4, half: 1.1}]; }
    p.fills.push(f);
    p.lines.push({d: [...s.outline, s.outline[0]], w: 1.3, amp: .7});
  });
  return Object.values(out);
}

/**
 * A cluster of banks (or the heads of a mountain). pieces: {ridge, depth, at?, taper?, tone, seed, kiri?: [from, to]} listed far
 * to near. A bank's ridge is its upper edge; kiri puts a string of cut gold along the ridge between two fractions of its length.
 */
export function banks(id, pieces) {
  if (!pieces.length) throw new Error(`banks(${id}): no pieces`);
  const out = {}, geoms = pieces.map(bankGeom), centre = centreOf(geoms);
  pieces.forEach((q, i) => {
    const s = geoms[i], tone = q.tone ?? 'gold';
    const p = out[tone] ??= part(`${id}-${tone}`, id, tone === 'silver' ? MAT.bankSilver : MAT.bankGold, centre, {order: tone === 'silver' ? 1 : 0});
    const f = {d: s.outline, soft: 0, crisp: 0, wedge: {ridge: s.ridge, depth: s.depth, rear: s.rear, amp: q.amp ?? BANK_SOFT}};
    if (q.kiri) { const [from, to] = q.kiri; f.kiri = [{path: pathOf(s.ridge, from, to), pitch: 4, half: 1.1}]; }
    p.fills.push(f);
  });
  return Object.values(out);
}

/**
 * A far mountain (toyama, niku-ai togidashi): heads laid one over another, each one full, round, smooth arc, a little lopsided. The
 * ridge is raised (a thin step, with a fine shadow under it where it lies over the head behind) and the face is ground down to the
 * ground's own level; the powder is densest and brightest on the ridge and thins evenly down to nothing. No flake, no cut gold.
 * heads: {ridge: [[x, z]...], depth, tone: 'gold' | 'blue' (a paler, cooler gold), seed, taper?} listed far to near.
 */
export function mountain(id, heads) {
  if (!heads.length) throw new Error(`mountain(${id}): no heads`);
  const out = {}, geoms = heads.map(q => bankGeom({taper: .1, jitter: 0, step: 4, ...q})), centre = centreOf(geoms);
  heads.forEach((q, i) => {
    const s = geoms[i], tone = q.tone ?? 'gold';
    const p = out[tone] ??= part(`${id}-${tone}`, id, tone === 'blue' ? MAT.toyamaBlue : MAT.toyamaGold, centre, {order: tone === 'blue' ? 1 : 0});
    p.fills.push({d: s.outline, soft: 0, crisp: 0, wedge: {ridge: s.ridge, depth: s.depth, amp: q.amp ?? 0, far: true, profile: TOYAMA_PROFILE}});
  });
  return Object.values(out);
}

/** The most a plate's two halves of a tongue or bank can reach past the lid (a guard for the builders' callers). */
export const inLid = (x, z, m = 0) => Math.abs(x) <= PLATE.halfW - m && Math.abs(z) <= PLATE.halfH - m;
