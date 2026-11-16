// Doha: the ground of a Hatsune lid is not one raised block but many small pieces, laid one on another.
// Two forms (docs/plans/2026-11-16-doha.md §3.0, §4.2):
//   tongues  Suhama. A flat tongue of gold or silver whose outline is waves and scallops, with a thin rim and, on a few
//            of them, a string of cut gold along the edge that faces the open ground. Flat inlay: it does not rise.
//   banks    A bank. Its upper edge (the ridge) is firm and crisp; from there the powder is ground down in a wedge that
//            ends in the lacquer with no lower edge. The ridge's height dies out toward its two ends, so a bank ends by
//            sinking into the ground, not by a wall.
// A cluster is one group with up to two parts: its gold pieces and its silver pieces (the part limit is 64).
// Pure geometry. The painting of a bank's wedge and the string of cut gold is in bake.js (paintWedge, paintKiriString).
import {MAT} from './mat.js';
import {KIND, rand, PLATE} from './vocab.js';

const TAU = Math.PI * 2;
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const turnBy = (cx, cz, turn) => { const c = Math.cos(turn), s = Math.sin(turn); return (x, z) => [cx + x * c - z * s, cz + x * s + z * c]; };

/** The shape of a bank's wedge: [distance from the ridge / depth, height], read by bake.js (painted) and the shader. */
export const WEDGE_PROFILE = [[0, 1], [.06, .82], [.2, .55], [.45, .24], [.75, .06], [1, 0]];
/** How tall a bank's crest stands in the soft (geometry) channel, as a share of the soft swell (three-pack.js K_SWELL). */
export const BANK_SOFT = .3;

/**
 * A tongue: a pointed lens with cusped scallops on its upper edge and gentler waves on its lower. Returns {outline, top,
 * bottom} (top and bottom run from the left tip to the right tip; outline is the closed polygon).
 */
export function tongueShape(cx, cz, len, wid, turn, seed) {
  const r = rand(seed), n = 30, P = turnBy(cx, cz, turn);
  const ph = [r() * TAU, r() * TAU, r() * TAU], kTop = Math.max(2, Math.round(len / 21)), kBot = Math.max(2, Math.round(len / 27));
  const blunt = [1.7 + r() * 1.2, 1.7 + r() * 1.2];
  const top = [], bottom = [];
  for (let i = 0; i <= n; i++) {
    const u = -1 + 2 * i / n, e = u < 0 ? blunt[0] : blunt[1];
    const w = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(u), e)), .62) * wid / 2 * (1 + .07 * Math.sin(u * 17 + ph[2]));
    const scallop = .5 + .5 * Math.pow(Math.abs(Math.sin(kTop * Math.PI * (u + 1) / 2 + ph[0])), .72);
    const wave = .74 + .27 * Math.sin(kBot * Math.PI * (u + 1) / 2 + ph[1]) + .1 * Math.sin(u * 13 + ph[2]);
    // A small ripple of a few units' wavelength keeps any run of the edge from lying straight.
    const rip = Math.min(1, w / 6) * 1.5;
    top.push(P(u * len / 2, -w * scallop + rip * Math.sin(u * len * .27 + ph[0])));
    bottom.push(P(u * len / 2, w * wave + rip * Math.sin(u * len * .23 + ph[1])));
  }
  return {outline: [...top, ...bottom.slice(1, -1).reverse()], top, bottom};
}

/**
 * A bank: the ridge, a rugged upper edge with an arch, two V notches and a few sharp tips; below it the foot, the ridge
 * dropped by `depth` (pinched at the ends). The ridge points carry their own crest strength (0 at the ends) and the
 * unit normal pointing down the slope. Returns {outline, ridge: [[x, z, env, nx, nz]], depth}.
 */
export function bankShape(cx, cz, len, depth, turn, seed) {
  const r = rand(seed), n = 36, P = turnBy(cx, cz, turn);
  const ph = [r() * TAU, r() * TAU, r() * TAU], k = [5 + r() * 2, 11 + r() * 3, 23 + r() * 6];
  const notches = [-.55 + r() * .3, .15 + r() * .4], tips = [-.1 + r() * .2, .6 + r() * .25];
  const tri = (u, c, w) => Math.max(0, 1 - Math.abs(u - c) / w);
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const u = -1 + 2 * i / n, edge = Math.max(0, 1 - u * u);
    let z = -depth * .2 * Math.pow(edge, .7) + depth * (.07 * Math.sin(k[0] * u + ph[0]) + .045 * Math.sin(k[1] * u + ph[1]) + .025 * Math.sin(k[2] * u + ph[2])) * Math.min(1, edge * 3);
    for (const c of notches) z += depth * .13 * tri(u, c, .055);
    for (const c of tips) z -= depth * .1 * tri(u, c, .08);
    // Longer, lower ends: the crest sinks away over the last quarter.
    const env = Math.pow(smooth(0, .3, 1 - Math.abs(u)), .8) * (.8 + .2 * Math.sin(u * 7 + ph[2]));
    pts.push({u, p: P(u * len / 2, z), env});
  }
  const down = [-Math.sin(turn), Math.cos(turn)];
  const ridge = pts.map((q, i) => {
    const a = pts[Math.max(0, i - 1)].p, b = pts[Math.min(n, i + 1)].p, l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    let nx = -(b[1] - a[1]) / l, nz = (b[0] - a[0]) / l;
    if (nx * down[0] + nz * down[1] < 0) { nx = -nx; nz = -nz; }
    return [q.p[0], q.p[1], q.env, nx, nz];
  });
  const foot = pts.map(q => {
    const taper = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(q.u), 2.4)), .5);
    const d = depth * taper * (.92 + .08 * Math.sin(q.u * 6 + ph[1]));
    return [q.p[0] + down[0] * d, q.p[1] + down[1] * d];
  });
  return {outline: [...ridge.map(q => [q[0], q[1]]), ...foot.slice(1, -1).reverse()], ridge, depth};
}

const part = (id, group, mat, anchor, extra = {}) => ({id, kind: KIND.hill, group, order: 0, layer: 0, mat, reach: .5, thick: 0, bias: 0, anchor, fills: [], lines: [], ...extra});
const pathOf = (pts, from, to) => pts.slice(Math.round(from * (pts.length - 1)), Math.round(to * (pts.length - 1)) + 1).map(q => [q[0], q[1]]);
const centreOf = pieces => [pieces.reduce((s, p) => s + p.x, 0) / pieces.length, pieces.reduce((s, p) => s + p.z, 0) / pieces.length];

/**
 * A cluster of tongues. pieces: {x, z, len, wid, turn?, tone: 'gold' | 'silver', seed, kiri?: [side, from, to]} listed far to near
 * (a later piece lies over an earlier one). kiri puts a string of cut gold on the 'top' or 'bottom' edge between two fractions.
 * The first listed piece of each tone names its part; both parts share the group.
 */
export function tongues(id, pieces) {
  if (!pieces.length) throw new Error(`tongues(${id}): no pieces`);
  const out = {};
  pieces.forEach((q, i) => {
    const s = tongueShape(q.x, q.z, q.len, q.wid, q.turn ?? 0, q.seed ?? i + 1), tone = q.tone ?? 'gold';
    const p = out[tone] ??= part(`${id}-${tone}`, id, tone === 'silver' ? MAT.sandSilver : MAT.sandGold, centreOf(pieces), {reach: 1.6, order: tone === 'silver' ? 1 : 0});
    const f = {d: s.outline, soft: .03, crisp: 1, tongue: true};
    if (q.kiri) { const [side, from, to] = q.kiri; f.kiri = [{path: pathOf(s[side], from, to), pitch: 4, half: 1.1}]; }
    p.fills.push(f);
    p.lines.push({d: [...s.outline, s.outline[0]], w: 1.15, amp: .5});
  });
  return Object.values(out);
}

/**
 * A cluster of banks. pieces: {x, z, len, depth, turn?, tone, seed, kiri?: [from, to]} listed far to near. A bank's ridge is
 * its upper edge; kiri puts a string of cut gold along the ridge between two fractions of its length.
 */
export function banks(id, pieces) {
  if (!pieces.length) throw new Error(`banks(${id}): no pieces`);
  const out = {};
  pieces.forEach((q, i) => {
    const s = bankShape(q.x, q.z, q.len, q.depth, q.turn ?? 0, q.seed ?? i + 1), tone = q.tone ?? 'gold';
    const p = out[tone] ??= part(`${id}-${tone}`, id, tone === 'silver' ? MAT.bankSilver : MAT.bankGold, centreOf(pieces), {order: tone === 'silver' ? 1 : 0});
    const f = {d: s.outline, soft: 0, crisp: 0, wedge: {ridge: s.ridge, depth: s.depth, amp: BANK_SOFT}};
    if (q.kiri) { const [from, to] = q.kiri; f.kiri = [{path: pathOf(s.ridge, from, to).map(([x, z], k, a) => [x, z]), pitch: 4, half: 1.1}]; }
    p.fills.push(f);
  });
  return Object.values(out);
}

/** The most a plate's two halves of a tongue or bank can reach past the lid (a guard for the builders' callers). */
export const inLid = (x, z, m = 0) => Math.abs(x) <= PLATE.halfW - m && Math.abs(z) <= PLATE.halfH - m;

/** A point on a bank's ridge, f of the way along it (0 at its left end): where a rock may stand on the crest. [x, z] */
export function bankPoint(q, f) {
  const {ridge} = bankShape(q.x, q.z, q.len, q.depth, q.turn ?? 0, q.seed);
  const p = ridge[Math.round(Math.max(0, Math.min(1, f)) * (ridge.length - 1))];
  return [p[0], p[1]];
}
/** A point on one edge of a tongue ('top' or 'bottom'), f of the way along it: where a rock may stand at its edge or tip. [x, z] */
export function tonguePoint(q, side, f) {
  const e = tongueShape(q.x, q.z, q.len, q.wid, q.turn ?? 0, q.seed)[side];
  return e[Math.round(Math.max(0, Math.min(1, f)) * (e.length - 1))];
}
