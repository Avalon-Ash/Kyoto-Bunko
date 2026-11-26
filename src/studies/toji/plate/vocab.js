// The drawing vocabulary of a makie plate: hills, water, mist, trees, rocks, buildings and gates in picture view.
// Pure geometry. A plate is a flat picture 720 × 460 units: x runs right, z runs down toward the viewer.
// Every builder returns parts; a part is plain data (polygons and polylines), baked into relief by bake.js.
//
// Part: {id, kind, group, order, layer, mat, reach, thick, bias, attach?, anchor:[x,z], fills:[{d, soft, crisp}], lines:[{d, w, amp}]}
//   layer 0 is the ground itself (it swells); layers 1–3 are texture slots for parts that stand up from the lid
//   thick       how far the part's body stands off its own plane when it is awake, in units
//   bias        a small offset along the part's normal so overlapping members of one tree do not share a plane
//   attach      a part that rides on another group's plane (the bird on its pine)
//   soft  0..1  shishiai swell: blurred into a slope that sinks into the ground
//   crisp 0..1  takamaki edge: a raised plane with a defined border
//   lines       tsukegaki: fine raised line work

import {meshTorii, meshKakezukuri} from './frame-mesh.js';
import {meshRoof, meshStorey, meshPagoda, meshHall, meshRomon, meshSanmon, meshKaramon, meshCorridor} from './architecture-mesh.js';
import {meshLantern} from './lantern-mesh.js';
import {meshFox, meshPhoenix, meshBird, meshSandCone, meshMoonBowl, meshWall, feetCentre} from './creature-mesh.js';

export const PLATE = {halfW: 360, halfH: 230};
import {MAT} from './mat.js';
export {MAT};
export const KIND = {still: 0, tier: 1, pine: 2, rock: 3, hill: 4, water: 5, mist: 6, bird: 7};

/** Deterministic noise in 0..1 so a plate bakes the same on every device. */
export function rand(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
const lerp = (a, b, t) => a + (b - a) * t;
const quad = (a, c, b, n = 10) => Array.from({length: n + 1}, (_, i) => {
  const t = i / n, u = 1 - t;
  return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]];
});
/**
 * @typedef {{
 *   id: string,
 *   kind: number,
 *   group: string,
 *   order: number,
 *   layer: number,
 *   mat: number,
 *   reach: number,
 *   thick: number,
 *   bias: number,
 *   anchor: number[],
 *   fills: {d: number[][], soft: number, crisp: number}[],
 *   lines: {d: number[][], w: number, amp: number}[],
 *   mesh?: import('./mesh-geometry.js').MeshChunk[],
 *   feet0?: number[],
 *   attach?: string,
 *   on?: string,
 *   mountY?: number,
 *   motionWith?: string,
 *   rigidGroup?: boolean,
 *   eye?: number[],
 * }} Part
 */

/** @returns {Part} */
const part = (id, kind, layer, mat, anchor, extra = {}) => ({id, kind, group: id, order: 0, layer, mat, reach: 4, thick: 24, bias: 0, anchor, fills: [], lines: [], ...extra});

/** An organic closed outline. */
export function blob(cx, cz, rx, rz, seed, wobble = .1, n = 44) {
  const r = rand(seed), a = r() * 6.283, b = r() * 6.283, k1 = 2 + Math.floor(r() * 3), k2 = 5 + Math.floor(r() * 3);
  return Array.from({length: n}, (_, i) => {
    const t = i / n * 6.283, s = 1 + wobble * Math.sin(t * k1 + a) + wobble * .5 * Math.sin(t * k2 + b);
    return [cx + Math.cos(t) * rx * s, cz + Math.sin(t) * rz * s];
  });
}

/** A stream: a band that widens as it nears the viewer, with togidashi flow lines inside. */
export function stream(id, points, widths, layer = 0) {
  if (points.length < 2) throw new Error(`stream(${id}): points must have at least 2 points`);
  if (widths.length !== points.length) throw new Error(`stream(${id}): widths length (${widths.length}) must equal points length (${points.length})`);
  const n = 64, centre = [], left = [], right = [];
  const at = t => {
    const f = t * (points.length - 1), i = Math.min(points.length - 2, Math.floor(f)), u = f - i;
    const p0 = points[Math.max(0, i - 1)], p1 = points[i], p2 = points[i + 1], p3 = points[Math.min(points.length - 1, i + 2)];
    // Catmull–Rom keeps the bends round.
    const c = k => .5 * (2 * p1[k] + (p2[k] - p0[k]) * u + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * u * u + (3 * p1[k] - p0[k] - 3 * p2[k] + p3[k]) * u * u * u);
    return [c(0), c(1), lerp(widths[i], widths[i + 1], u)];
  };
  for (let i = 0; i <= n; i++) centre.push(at(i / n));
  const normal = i => {
    const a = centre[Math.max(0, i - 1)], b = centre[Math.min(n, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [-(b[1] - a[1]) / l, (b[0] - a[0]) / l];
  };
  for (let i = 0; i <= n; i++) { const [x, z, w] = centre[i], [nx, nz] = normal(i); left.push([x + nx * w, z + nz * w]); right.push([x - nx * w, z - nz * w]); }
  const p = part(id, KIND.water, layer, MAT.water, [centre[n >> 1][0], centre[n >> 1][1]]);
  p.fills.push({d: [...left, ...right.reverse()], soft: 0, crisp: .12});
  for (const [offset, from, to] of [[-.62, 0, 1], [-.22, .08, .94], [.2, .02, .86], [.6, .12, 1], [0, .3, .7]]) {
    const line = [];
    for (let i = Math.round(from * n); i <= Math.round(to * n); i++) {
      const [x, z, w] = centre[i], [nx, nz] = normal(i), sway = Math.sin(i * .42 + offset * 9) * .12;
      line.push([x + nx * w * (offset + sway), z + nz * w * (offset + sway)]);
    }
    p.lines.push({d: line, w: .8, amp: 1});
  }
  return [p];
}

/** Suyari-gasumi: the stepped mist band of the picture scrolls. Flat sheets of gold, with connected steps and a cut edge. */
export function suyari(id, x0, x1, z, thick, seed, layer = 1) {
  const r = rand(seed), bars = [], p = part(id, KIND.mist, layer, MAT.kasumi, [(x0 + x1) / 2, z], {reach: 4, thick: 0});
  const bar = (a, b, zc, h) => {
    const d = [], rad = h / 2;
    for (let i = 0; i <= 10; i++) { const t = Math.PI / 2 + i / 10 * Math.PI; d.push([a + rad + Math.cos(t) * rad, zc - Math.sin(t) * rad]); }
    for (let i = 0; i <= 10; i++) { const t = -Math.PI / 2 + i / 10 * Math.PI; d.push([b - rad + Math.cos(t) * rad, zc - Math.sin(t) * rad]); }
    return d;
  };
  const span = x1 - x0;
  bars.push(bar(x0, x1 - span * (.12 + r() * .1), z, thick));
  bars.push(bar(x0 + span * (.2 + r() * .12), x1, z + thick * .82, thick * .8));
  if (r() > .35) bars.push(bar(x0 + span * .06, x0 + span * (.5 + r() * .2), z - thick * .8, thick * .62));
  for (const d of bars) p.fills.push({d, soft: 0, crisp: .12});
  return [p];
}

/**
 * A roof in elevation: eaves that lift at the corners, a concave slope, tile lines fanning to the ridge.
 * zEave is the eave line; the roof rises toward -z. Built as a thin shell (architecture-mesh.js).
 */
export function roof(id, cx, zEave, halfW, rise, opts = {}) {
  if (!((opts.tiles ?? 15) >= 1)) throw new Error(`roof(${id}): tiles must be >= 1`);
  return meshRoof(id, cx, zEave, halfW, rise, opts);
}

/** A storey in elevation: black lacquer wall, gold posts, and paper windows that can hold a light. */
export function storey(id, cx, zTop, zBottom, halfW, opts = {}) {
  if (!((opts.bays ?? 3) >= 1)) throw new Error(`storey(${id}): bays must be >= 1`);
  return meshStorey(id, cx, zTop, zBottom, halfW, opts);
}

/** Five-storey pagoda in elevation. Each storey is its own group member so the tower can wake from the ground up. */
export function pagoda(id, cx, zBase, opts = {}) { return meshPagoda(id, cx, zBase, opts); }

/** A hall: one broad hipped roof over a row of bays. Give it a group to make it one solid with what carries it. */
export function hall(id, cx, zEave, halfW, rise, opts = {}) { return meshHall(id, cx, zEave, halfW, rise, opts); }

/**
 * Rōmon: a two-storey gate. A lower storey of three open bays, a railed balcony round its waist, a shorter upper
 * storey and one hipped roof. It wakes from the ground up, like a tower.
 */
export function romon(id, cx, zBase, halfW, opts = {}) { return meshRomon(id, cx, zBase, halfW, opts); }

/**
 * Myōjin torii in elevation: two posts leaning together on stone feet, a tie beam through them, a strut, and a
 * lintel that lifts at both ends. `s` scales the whole gate (1 is about 116 wide and 104 tall).
 * With `cap` the lintel carries a silver lip, as the roofs do.
 */
export function torii(id, cx, zFoot, s = 1, opts = {}) {
  return meshTorii(id, cx, zFoot, s, opts);
}

/**
 * Kakezukuri: a deck carried out over a drop on a lattice of posts and tie beams, with a railing along its edge.
 * The posts all meet the ground on one line (zGround), which is the line the whole structure stands on.
 */
export function kakezukuri(id, x0, x1, zDeck, zGround, opts = {}) {
  const {posts = 9} = opts;
  if (!(posts >= 2)) throw new Error(`kakezukuri(${id}): posts must be >= 2`);
  return meshKakezukuri(id, x0, x1, zDeck, zGround, opts);
}

/** One maple leaf: five points about the head of its stalk, the middle one longest, with deep notches between. */
function mapleLeaf(cx, cz, radius, turn) {
  const tips = [1, .84, .58], d = [], at = (a, len) => d.push([cx + Math.cos(a) * len, cz + Math.sin(a) * len]);
  for (let i = -2; i <= 2; i++) {
    const a = turn + i * .95, len = radius * tips[Math.abs(i)];
    if (i > -2) at(a - .475, radius * .3);
    at(a - .2, len * .72); at(a, len); at(a + .2, len * .72);
  }
  d.push([cx - Math.cos(turn) * radius * .22, cz - Math.sin(turn) * radius * .22]);
  return d;
}
/**
 * Small shapes inlaid flat in the lid, one part per material. They are ground, so each keeps its outline however
 * small it is: this is where a picture says what the solids are too round to say. Densest at the centre of the drift.
 * mats: [name, material, every]. The first is the body; each later one takes one piece in `every` (3 if not given),
 * the last listed winning where two fall on the same piece.
 * An inlay owns its outline and half a unit round it (reach .5): the lid's material stops where the piece stops.
 */
function scatter(id, cx, cz, rx, rz, count, seed, size, shape, mats) {
  const r = rand(seed), parts = mats.map(([name, mat]) => part(`${id}-${name}`, KIND.still, 0, mat, [cx, cz], {reach: .5}));
  const clamp = (v, m) => Math.max(-m, Math.min(m, v));
  for (let i = 0; i < count; i++) {
    const a = r() * 6.283, q = Math.pow(r(), .7), R = size * (.75 + r() * .6), m = R + 2;
    const x = clamp(cx + Math.cos(a) * rx * q, PLATE.halfW - m), z = clamp(cz + Math.sin(a) * rz * q, PLATE.halfH - m);
    let pick = 0;
    for (let k = 1; k < mats.length; k++) { const every = mats[k][2] ?? 3; if (i % every === every - 1) pick = k; }
    parts[pick].fills.push({d: shape(x, z, R, r() * 6.283), soft: 0, crisp: 1});
  }
  return parts.filter(p => p.fills.length);
}
/** Fallen maple leaves: whole sheets of gold, one in three silver, and one in five red coral. */
export function fallenLeaves(id, cx, cz, rx, rz, count, seed, {size = 11} = {}) {
  return scatter(id, cx, cz, rx, rz, count, seed, size, mapleLeaf, [['gold', MAT.hyomonGold], ['silver', MAT.hyomonSilver], ['coral', MAT.coral, 5]]);
}
/** One ginkgo leaf: a fan on a stalk, split at the middle of its rim. */
function ginkgoLeaf(cx, cz, radius, turn) {
  const d = [[cx - Math.cos(turn) * radius * .5, cz - Math.sin(turn) * radius * .5]];
  for (let i = 0; i <= 10; i++) { const t = i / 10, a = turn + (t - .5) * 2; d.push([cx + Math.cos(a) * radius * (i === 5 ? .62 : 1), cz + Math.sin(a) * radius * (i === 5 ? .62 : 1)]); }
  return d;
}
/** Fallen ginkgo leaves: a carpet of gold sheet, one in six of silver (more silver and the carpet reads as grey water from afar). */
export function fallenFans(id, cx, cz, rx, rz, count, seed, {size = 10} = {}) {
  return scatter(id, cx, cz, rx, rz, count, seed, size, ginkgoLeaf, [['gold', MAT.hyomonGold], ['pale', MAT.hyomonSilver, 6]]);
}
/** One cherry petal: a drop with a notched tip. */
function petal(cx, cz, radius, turn) {
  const at = (a, len) => [cx + Math.cos(turn + a) * len * radius, cz + Math.sin(turn + a) * len * radius];
  return [at(Math.PI, .9), at(2.2, .75), at(1.1, .95), at(.25, 1.05), at(0, .7), at(-.25, 1.05), at(-1.1, .95), at(-2.2, .75)];
}
/** Scattered cherry petals: silver sheet, and one in three of shell. */
export function petals(id, cx, cz, rx, rz, count, seed, {size = 6} = {}) {
  return scatter(id, cx, cz, rx, rz, count, seed, size, petal, [['silver', MAT.hyomonSilver], ['shell', MAT.aogai]]);
}
/** Fallen fruit of the tachibana: small rounds of gold sheet. */
export function fruits(id, cx, cz, rx, rz, count, seed, {size = 4.5} = {}) {
  return scatter(id, cx, cz, rx, rz, count, seed, size, (x, z, R, turn) => blob(x, z, R, R, Math.round(turn * 10), .05, 12), [['gold', MAT.hyomonGold]]);
}
/** The moon, or its image in still water: a disc of shell and two or three broken strokes of cut silver beneath it. */
export function moon(id, cx, cz, radius, {ripples = 3} = {}) {
  const disc = part(id, KIND.still, 0, MAT.aogai, [cx, cz]);
  disc.fills.push({d: blob(cx, cz, radius, radius, 2, 0, 40), soft: 0, crisp: 1});
  if (!ripples) return [disc];
  const wake = part(`${id}-wake`, KIND.still, 0, MAT.kirigin, [cx, cz + radius * 2], {reach: .5});
  for (let i = 0; i < ripples; i++) {
    const z = cz + radius * (1.5 + i * .62), half = radius * (.95 - i * .22), h = Math.max(1.4, radius * .1), dx = (i % 2 ? -1 : 1) * radius * .22;
    wake.fills.push({d: [[cx + dx - half, z - h], [cx + dx + half, z - h], [cx + dx + half * .8, z + h], [cx + dx - half * .8, z + h]], soft: 0, crisp: 1});
  }
  return [disc, wake];
}
/** A fox's trail in cut silver: `points` are [x, z] along its way, the prints falling left and right of the line. */
export function pawPrints(id, points, {size = 4.6} = {}) {
  const p = part(id, KIND.still, 0, MAT.kirigin, points[0], {reach: .5});
  points.forEach(([x, z], i) => {
    const [nx, nz] = points[Math.min(i + 1, points.length - 1)], [px, pz] = points[Math.max(i - 1, 0)], a = Math.atan2(nz - pz, nx - px);
    const side = i % 2 ? 1 : -1, ox = x - Math.sin(a) * side * size * .9, oz = z + Math.cos(a) * side * size * .9;
    p.fills.push({d: blob(ox, oz, size, size * .8, 3, .04, 14), soft: 0, crisp: 1});
    for (const t of [-.6, 0, .6]) p.fills.push({d: blob(ox + Math.cos(a + t) * size * 1.7, oz + Math.sin(a + t) * size * 1.7, size * .42, size * .42, 1, 0, 8), soft: 0, crisp: 1});
  });
  return [p];
}

/** Inari's fox, seated on its stone, its brush rising close behind it: silver on a block of cut gold. `flip` -1 faces it left. */
export function fox(id, x, z, flip = 1, s = 1, {layer = 2} = {}) {
  const f = (dx, h) => [x + dx * flip * s, z - h * s], B = 16;
  const stone = part(`${id}-stone`, KIND.tier, layer, MAT.kirikane, [x, z], {group: id, order: 0});
  stone.fills.push({d: [f(-15, 0), f(15, 0), f(13, 12), f(-13, 12)], soft: .3, crisp: .9});
  stone.fills.push({d: [f(-17, 12), f(17, 12), f(17, B), f(-17, B)], soft: .2, crisp: 1});
  stone.lines.push({d: [f(-13.5, 6), f(13.5, 6)], w: .6, amp: .7});
  const body = part(`${id}-body`, KIND.tier, layer, MAT.silver, [x, z], {group: id, order: 1, thick: 14});
  body.fills.push({d: blob(...f(-3, B + 10), 7.5 * s, 10 * s, 3, .04, 22), soft: .3, crisp: .8});
  body.fills.push({d: [f(1, B), f(8, B), f(8, B + 23), f(5, B + 32), f(-2, B + 25)], soft: .3, crisp: .8});
  body.fills.push({d: blob(...f(6, B + 35), 7 * s, 6 * s, 5, .02, 20), soft: .2, crisp: .9});
  // A long, tapering muzzle and two high ears; their tips remain above the brush.
  body.fills.push({d: [f(9, B + 40), f(27, B + 33), f(11, B + 29)], soft: .15, crisp: 1});
  body.fills.push({d: [f(-2, B + 35), f(-3, B + 58), f(8, B + 39)], soft: .15, crisp: 1});
  body.fills.push({d: [f(7, B + 38), f(16, B + 55), f(16, B + 34)], soft: .15, crisp: 1});
  // A broad brush folds up close to the back, with a clear cleft below the ears.
  body.fills.push({d: [...quad(f(-5, B + 1), f(-34, B + 5), f(-24, B + 31), 14), ...quad(f(-24, B + 31), f(-19, B + 39), f(-18, B + 44), 8), ...quad(f(-18, B + 44), f(-8, B + 29), f(-12, B + 17), 12), ...quad(f(-12, B + 17), f(-17, B + 7), f(-5, B + 8), 8)], soft: .25, crisp: .9});
  body.lines.push({d: quad(f(-9, B + 6), f(-26, B + 14), f(-20, B + 31), 12), w: .75, amp: .9});
  body.lines.push({d: [f(3, B + 2), f(4, B + 19)], w: .8, amp: .9});
  body.lines.push({d: [f(9, B + 36), f(12, B + 35)], w: .9, amp: 1});
  body.lines.push({d: [f(0, B + 44), f(0, B + 50)], w: .7, amp: .8});
  // The jewel is an inlaid sign at the feet, not another swollen appendage.
  const jewel = part(`${id}-jewel`, KIND.still, 0, MAT.kirikane, [x + 22 * flip * s, z + 10 * s]);
  const jx = x + 22 * flip * s, jz = z + 10 * s;
  jewel.fills.push({d: blob(jx, jz, 7 * s, 6 * s, 1, 0, 24), soft: 0, crisp: 1});
  jewel.fills.push({d: [[jx - 4 * s, jz - 3 * s], [jx + 1 * s, jz - 12 * s], [jx + 4 * s, jz - 3 * s]], soft: 0, crisp: 1});
  meshFox(stone, body, s); // the fills and lines above stay as the picture's outline; the relief is raised from them
  return [jewel, stone, body];
}

/** Uguisu, the first song of the year: a small bird of cut silver. It rests at one perch at a time. */
export function bird(id, perches, layer = 1) {
  return perches.map(([x, z, flip = 1, attach, bias = 32], i) => {
    const p = part(`${id}-${i}`, KIND.bird, layer, MAT.hyomonSilver, [x, z], {group: id, order: i, reach: 4, thick: 16, bias, attach});
    const S = 2.2, f = (dx, dz) => [x + dx * flip * S, z + dz * S];
    p.fills.push({d: blob(x, z - 3.4 * S, 5.6 * S, 3.3 * S, 9, .04, 18), soft: 0, crisp: 1});                       // body
    p.fills.push({d: blob(x + 5 * flip * S, z - 6.4 * S, 2.5 * S, 2.3 * S, 4, 0, 12), soft: 0, crisp: 1});             // head
    p.fills.push({d: [f(7, -6.8), f(10.4, -6.1), f(7, -5.5)], soft: 0, crisp: 1});                     // bill
    p.fills.push({d: [f(-4, -4.4), f(-13.5, -1.2), f(-12.6, .9), f(-3.4, -1.6)], soft: 0, crisp: 1});  // tail
    p.lines.push({d: [f(-1, -4.4), f(-5.6, -2.5)], w: .5, amp: 1}, {d: [f(.6, 0), f(.6, 2.6)], w: .5, amp: 1}, {d: [f(2.4, 0), f(2.4, 2.6)], w: .5, amp: 1});
    // Built where the perch was drawn; preparePlate may slide a rider to its carrier's twig, and three-pack moves the mesh by the same amount.
    p.feet0 = feetCentre(p.lines); meshBird(p, flip, S);
    return p;
  });
}

/** A few petals of shell, used sparingly. */
export function shell(id, spots, layer = 0) {
  if (!spots.length) throw new Error(`shell(${id}): spots must not be empty`);
  const p = part(id, KIND.still, layer, MAT.aogai, spots[0].slice(0, 2));
  for (const [x, z, s, seed] of spots) p.fills.push({d: blob(x, z, s, s * .62, seed, .16, 12), soft: 0, crisp: .5});
  return [p];
}

/** A still pond: a closed shore and widely spaced horizontal glints, never a flowing ribbon. */
export function pond(id, cx, cz, rx, rz, seed, {reflection = null} = {}) {
  const p = part(id, KIND.water, 0, MAT.water, [cx, cz]);
  const shore = blob(cx, cz, rx, rz, seed, .055, 80);
  p.fills.push({d: shore, soft: 0, crisp: .08});
  p.lines.push({d: [...shore, shore[0]], w: .65, amp: .5});
  for (let i = 0; i < 5; i++) {
    const z = cz + (i - 2) * rz * .28, half = rx * (.5 + .14 * Math.sin(i * 2 + seed));
    p.lines.push({d: [[cx - half, z], [cx + half * .7, z]], w: .6, amp: .45});
  }
  if (!reflection) return [p];
  const {x, z, width, height} = reflection;
  const image = part(`${id}-reflection`, KIND.still, 0, MAT.nashijiLight, [x, z]);
  // Broken, inverted eaves read as a reflection without painting a second solid pavilion.
  for (let i = 0; i < 3; i++) {
    const half = width * (1 - i * .22), top = z + i * height / 3;
    image.fills.push({d: [[x - half, top], [x + half, top], [x + half * .5, top + height * .19], [x - half * .5, top + height * .19]], soft: .12, crisp: .08});
    image.lines.push({d: [[x - half * .8, top + 4], [x + half * .6, top + 4]], w: 1, amp: .5});
  }
  return [p, image];
}

/**
 * The phoenix (ho-o) of Kinkaku's roof, seen as the crest on a Hatsune lid: standing on a small pedestal (roban), breast to the
 * viewer, a long neck bending to a crested head with the bill forward, both wings spread up and out in a V, three tail plumes
 * streaming up and back. Drawn in plan, since the relief lies on the plate; the unit is 1 at s = 1 before the .88 shrink.
 * fills, in order (creature-mesh.js meshPhoenix reads them by index): 0 pedestal, 1 tail centre, 2 tail right, 3 tail left,
 * 4 wing right, 5 wing left, 6 body, 7 neck, 8 head, 9 bill, 10 crest right, 11 crest left.
 * lines: 0..4 right wing feather lines, 5..9 left, 10..12 tail rachises, 13 right covert edge, 14 left covert edge.
 */
/** How much larger than first drawn the phoenix's head, bill and eye are, and the point (bird units) they grow from: the neck. */
const PHOENIX_HEAD = 1.3, PHOENIX_NECK = [-3, -11];
export function phoenix(id, x, z, s = 1, {group = id, order = 0} = {}) {
  const p = part(id, KIND.tier, 2, MAT.hyomonGold, [x, z], {group, order, thick: 10, bias: 8.5}); // 8.5: sits in the ridge of the roof it crowns
  const P = (dx, dz) => [x + dx * s * .88, z + dz * s * .88];
  const poly = pts => pts.map(([a, b]) => P(a, b));
  const mirror = pts => pts.map(([a, b]) => [-a, b]).reverse();
  // A plume: a leaf along a quadratic centre line from a to b bent through c, widest a third of the way along.
  const plume = (a, c, b, w, n = 8, band = false) => {
    const at = t => [(1 - t) ** 2 * a[0] + 2 * t * (1 - t) * c[0] + t * t * b[0], (1 - t) ** 2 * a[1] + 2 * t * (1 - t) * c[1] + t * t * b[1]];
    const wid = t => band ? w * (1 - .3 * t) * Math.min(1, .55 + t * 3) : w * Math.pow(Math.sin(Math.PI * Math.pow(t, .75)), .8);
    const left = [], right = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, q = at(t), r = at(Math.min(1, t + .01)), o = at(Math.max(0, t - .01)), dx = r[0] - o[0], dz = r[1] - o[1], l = Math.hypot(dx, dz) || 1;
      left.push([q[0] - dz / l * wid(t) / 2, q[1] + dx / l * wid(t) / 2]); right.push([q[0] + dz / l * wid(t) / 2, q[1] - dx / l * wid(t) / 2]);
    }
    return {pts: [...left, ...right.reverse().slice(1)], axis: Array.from({length: n + 1}, (_, i) => at(i / n))};
  };
  const tailC = plume([0, -12], [-3, -28], [0, -42], 7.5), tailR = plume([3, -12], [12, -24], [22, -37], 6.5), tailL = plume([-3, -12], [-12, -24], [-22, -37], 6.5);
  // The right wing: a leading edge out to the wrist, then five long flight feathers fanning back, each ending in a point.
  const wingR = [[5, -4], [11, -8], [19, -12], [27, -16], [33, -20], [35, -26], [31, -25], [31, -31], [26, -28], [25, -37], [21, -31], [19, -41], [15, -33], [12, -41], [9, -30], [6, -20]];
  const wingL = mirror(wingR);
  const body = Array.from({length: 18}, (_, i) => [Math.cos(i / 18 * 6.2832) * 8.2, -4 + Math.sin(i / 18 * 6.2832) * 11.5]);
  // Head, bill and eye are drawn PHOENIX_HEAD times their first size, grown from where the neck meets the head, so the head still
  // reads on the roof at the home page's zoom (chain-2 V1); the eye goes with them (p.eye, read by meshPhoenix).
  const head = pts => pts.map(([a, b]) => [PHOENIX_NECK[0] + (a - PHOENIX_NECK[0]) * PHOENIX_HEAD, PHOENIX_NECK[1] + (b - PHOENIX_NECK[1]) * PHOENIX_HEAD]);
  p.eye = P(...head([[4.6, -13.4]])[0]);
  const f = pts => ({d: poly(pts), soft: .1, crisp: .9});
  p.fills.push(
    f([[-11, -12], [11, -12], [13, -9], [13, 8], [10, 11], [-10, 11], [-13, 8], [-13, -9]]),
    f(tailC.pts), f(tailR.pts), f(tailL.pts), f(wingR), f(wingL), f(body),
    f(plume([3, 1], [-9, -3], [-4, -11], 5.6, 8, true).pts),
    f(head([[-6, -13], [-2, -15.5], [3, -15.5], [7, -14], [10.5, -12.3], [6.5, -11.2], [2, -9.5], [-3, -9], [-6, -10]])),
    f(head([[6, -14.2], [10.7, -12.3], [6.2, -11.3]])),
    f(plume([-3, -14], [-8, -19], [-9, -25], 3.8).pts),
    f(plume([-4.5, -12.5], [-11, -14], [-17, -19], 3.6).pts),
  );
  // Feather lines run from the shoulder to each flight feather's tip; a covert line follows the leading edge.
  const tips = [[34, -23], [29, -31], [23, -37], [17, -38], [11, -36]];
  for (const sign of [1, -1]) for (const [tx, tz] of tips) p.lines.push({d: [P(sign * 8, -10), P(sign * (8 + (tx - 8) * .55), -10 + (tz + 10) * .55), P(sign * tx * .97, tz * .96)], w: .75, amp: 1});
  for (const t of [tailC, tailR, tailL]) p.lines.push({d: t.axis.slice(1, -2).map(([a, b]) => P(a, b)), w: .75, amp: 1});
  for (const sign of [1, -1]) p.lines.push({d: [P(sign * 7, -6), P(sign * 15, -10), P(sign * 24, -14), P(sign * 31, -18)], w: .75, amp: 1});
  meshPhoenix(p, P);
  return [p];
}

/**
 * A moon-viewing deck of bamboo: a floor, so it is inlaid flat in the lid, never stood up like a screen.
 * Its slats run toward the water; the moon it waits for is drawn in the pond (see moon).
 */
export function moonDeck(id, x0, x1, zBack, zFront) {
  const p = part(id, KIND.still, 0, MAT.gold, [(x0 + x1) / 2, zFront]);
  p.fills.push({d: [[x0, zBack], [x1, zBack], [x1, zFront], [x0, zFront]], soft: 0, crisp: .7});
  for (let x = x0 + 5; x < x1 - 2; x += 6) p.lines.push({d: [[x, zBack + 1], [x, zFront - 1]], w: .8, amp: 1});
  for (const z of [zBack + 1.5, zFront - 1.5]) p.lines.push({d: [[x0, z], [x1, z]], w: 1.4, amp: 1});
  return [p];
}

/** Inlaid stepping stones stay in the ground; each broad oval is separated by exposed lacquer. */
export function steppingStones(id, points) {
  if (!points.length) throw new Error(`steppingStones(${id}): points must not be empty`);
  const p = part(id, KIND.still, 0, MAT.kirigin, points[0].slice(0, 2));
  points.forEach(([x, z, r], i) => p.fills.push({d: blob(x, z, r, r * .65, i + 3, .09, 16), soft: .2, crisp: .55}));
  return [p];
}

/**
 * A stone lantern in elevation: squat, with a broad cap and a window of cut gold. What makes it a lantern is its light, which no solid can
 * show: chips of cut gold strewn on the ground before it, densest at its foot.
 */
export function lantern(id, x, z, s = 1) {
  const chip = (cx, cz, R, turn) => [0, 1, 2, 3].map(i => [cx + Math.cos(turn + i * 1.5708) * R, cz + Math.sin(turn + i * 1.5708) * R]);
  return [...meshLantern(id, x, z, s), ...scatter(`${id}-glow`, x, z + 20 * s, 46 * s, 16 * s, 16, 5, 2.8, chip, [['gold', MAT.kirikane]])];
}

/** White sand is a ground field; raking is engraved line work, never a row of raised bars. */
export function sandGarden(id, x0, x1, zBack, zFront, {raked = true, mat = MAT.silver} = {}) {
  const p = part(id, KIND.still, 0, mat, [(x0 + x1) / 2, (zBack + zFront) / 2]);
  p.fills.push({d: [[x0 + 12, zBack], [x1 - 12, zBack], [x1, zFront], [x0, zFront]], soft: .08, crisp: .12});
  if (raked) for (let z = zBack + 8; z < zFront - 5; z += 9) {
    p.lines.push({d: quad([x0 + 15, z], [(x0 + x1) / 2, z - 7], [x1 - 15, z], 24), w: .75, amp: .8});
  }
  return [p];
}

/** Kogetsudai in elevation: the level crown must rise with the flank to read as a truncated cone. */
export function sandCone(id, cx, zBase, halfW, height) {
  const p = part(id, KIND.tier, 2, MAT.silver, [cx, zBase], {thick: 18});
  const top = zBase - height, r = halfW * .43;
  p.fills.push({d: [[cx - r, top], [cx + r, top], ...quad([cx + halfW, zBase - 3], [cx, zBase + 10], [cx - halfW, zBase - 3], 24)], soft: .35, crisp: .65});
  p.fills.push({d: blob(cx, top, r, r * .24, 4, 0, 40), soft: .2, crisp: .9});
  p.lines.push({d: [...blob(cx, top, r * .87, r * .18, 4, 0, 40), [cx + r * .87, top]], w: .7, amp: .7});
  meshSandCone(p, cx, zBase, halfW, top);
  return [p];
}

/** A small shinnuri vessel on the cone, with a shell moon inside its oval mouth.
 * All members share the cone's hinge; the ellipse supplies the pictorial view into the bowl.
 */
export function moonBowl(id, cx, top, group) {
  const anchor = [cx, top], rimZ = top - 13;
  const bowl = part(id + '-vessel', KIND.tier, 3, MAT.lacquer, anchor, {group, thick: 12, bias: 15, reach: 4}); // 15: its foot sinks into the cone's crown
  bowl.fills.push({d: [...quad([cx-18,rimZ], [cx,top+10], [cx+18,rimZ], 24),
    ...quad([cx+18,rimZ], [cx,top-26], [cx-18,rimZ], 24).slice(1)], soft:0,crisp:1});
  bowl.lines.push({d:[...blob(cx,rimZ,17,6.5,1,0,48),[cx+17,rimZ]],w:.7,amp:1});
  const reflection = part(id + '-reflection', KIND.tier, 1, MAT.aogai, anchor, {group,thick:.7,bias:15,reach:3});
  reflection.fills.push({d:blob(cx-2,rimZ-1,6.2,4.7,1,0,40),soft:0,crisp:1});
  const light = part(id + '-light', KIND.tier, 1, MAT.hyomonSilver, anchor, {group,thick:.5,bias:15,reach:3});
  for (const [dx,dz,len] of [[6,2,7],[-9,5,9],[6,7,6]]) {
    light.fills.push({d:[[cx+dx-len/2,rimZ+dz],[cx+dx+len/2,rimZ+dz-.4],
      [cx+dx+len/2-1,rimZ+dz+.8],[cx+dx-len/2,rimZ+dz+1]],soft:0,crisp:1});
  }
  meshMoonBowl(bowl, reflection, light);
  return [bowl,reflection,light];
}

/** A low tiled wall or open gallery. Bays are engraved, keeping a quiet continuous silhouette. */
export function corridor(id, x0, x1, zBase, opts = {}) { return meshCorridor(id, x0, x1, zBase, opts); }

/** Karamon: a lifted cusped gable over closed leaves of black lacquer, between two posts. */
export function karamon(id, cx, zBase, halfW = 66) { return meshKaramon(id, cx, zBase, halfW); }

/** Masonry and its moat form a low ground border, with staggered joints drawn into a continuous bank. */
export function moatWall(id, x0, x1, zTop, zBottom, waterFront) {
  const water = part(`${id}-moat`, KIND.water, 0, MAT.water, [(x0 + x1) / 2, waterFront]);
  water.fills.push({d: [[x0 - 6, zBottom + 4], [x1 + 6, zBottom + 4], [x1 + 6, waterFront], [x0 - 6, waterFront]], soft: 0, crisp: .1});
  water.lines.push({d: [[x0, waterFront - 3], [x1, waterFront - 3]], w: .6, amp: .7});
  const wall = part(id, KIND.rock, 1, MAT.mura, [(x0 + x1) / 2, zBottom], {thick: 15});
  wall.fills.push({d: [[x0 + 6, zTop], [x1 - 6, zTop], [x1, zBottom], [x0, zBottom]], soft: .3, crisp: .65});
  const mid = (zTop + zBottom) / 2;
  wall.lines.push({d: [[x0 + 4, mid], [x1 - 4, mid]], w: 1, amp: .8});
  for (let x = x0 + 23; x < x1 - 20; x += 42) {
    wall.lines.push({d: [[x, zTop + 1], [x + 3, mid], [x + 21, mid], [x + 23, zBottom - 1]], w: .8, amp: .9});
  }
  meshWall(wall);
  return [water, wall];
}

/** Receding stone treads are part of the hillside, not a screen that hinges upright. */
export function stoneSteps(id, cx, zBack, zFront, farW, nearW, count = 11) {
  if (!(count >= 1)) throw new Error(`stoneSteps(${id}): count must be >= 1`);
  const p = part(id, KIND.still, 0, MAT.nashijiLight, [cx, zFront]);
  p.fills.push({d: [[cx - farW, zBack], [cx + farW, zBack], [cx + nearW, zFront], [cx - nearW, zFront]], soft: .5, crisp: .25});
  for (let i = 0; i <= count; i++) {
    const t = i / count, z = lerp(zBack, zFront, t), w = lerp(farW, nearW, t);
    p.lines.push({d: [[cx - w, z], [cx + w, z]], w: 1.4, amp: 1});
    if (i < count) p.lines.push({d: [[cx + (i % 2 ? -.18 : .22) * w, z], [cx + (i % 2 ? -.18 : .22) * w, lerp(zBack, zFront, (i + 1) / count)]], w: .6, amp: .7});
  }
  return [p];
}

/** An open mountain gate: the lower passage is negative space, with all posts on the same foot line. */
export function sanmon(id, cx, zBase, halfW) { return meshSanmon(id, cx, zBase, halfW); }

// Trees bypass the inflated silhouette path. Branch-prefixed names are compatibility aliases for ward scores.
export {stampedPine, stampedPine as pine, stampedPine as branchPine,
  stampedMaple, stampedMaple as maple, stampedMaple as branchMaple,
  stampedGinkgo as ginkgo, stampedGinkgo as branchGinkgo,
  stampedCourtTree as courtTree, stampedCourtTree as branchCourtTree} from './trees.js';

// ---- Attached scenes (R5a). Each hangs on a named part (`on`), is flat inlay in the ground, and sits at a place written
// out in its ward's own file. `rand` only jitters a stroke, with fixed seeds.
// Their reach is .5, never 0: bake.js repaints every part with reach > 0 over the margins, in order, so a reach-0 part
// under one of the big ground parts (a ground piece) would be painted out of the material map.
const need = (fn, id, on) => { if (typeof on !== 'string' || !on) throw new Error(`${fn}(${id}): "on" must name the part it hangs on`); };
/** A band along a polyline, w0 wide at its first point and w1 at its last (closed outline). */
function ribbon(pts, w0, w1) {
  const left = [], right = [], n = pts.length - 1;
  pts.forEach(([x, z], i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, w = lerp(w0, w1, i / n) / 2;
    left.push([x - (b[1] - a[1]) / l * w, z + (b[0] - a[0]) / l * w]); right.push([x + (b[1] - a[1]) / l * w, z - (b[0] - a[0]) / l * w]);
  });
  return [...left, ...right.reverse()];
}
/** A point on one bank of a stream() (same Catmull-Rom as stream) with its tangent: [x, z, tx, tz]. side is -1 or 1. */
export function streamEdge(points, widths, t, side) {
  const at = u => {
    const f = u * (points.length - 1), i = Math.min(points.length - 2, Math.floor(f)), v = f - i;
    const p0 = points[Math.max(0, i - 1)], p1 = points[i], p2 = points[i + 1], p3 = points[Math.min(points.length - 1, i + 2)];
    const c = k => .5 * (2 * p1[k] + (p2[k] - p0[k]) * v + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * v * v + (3 * p1[k] - p0[k] - 3 * p2[k] + p3[k]) * v * v * v);
    return [c(0), c(1), lerp(widths[i], widths[i + 1], v)];
  };
  const a = at(Math.max(0, t - .01)), b = at(Math.min(1, t + .01)), q = at(t), l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const tx = (b[0] - a[0]) / l, tz = (b[1] - a[1]) / l;
  return [q[0] - tz * q[2] * side, q[1] + tx * q[2] * side, tx, tz];
}
const five = (cx, cz, r, turn) => Array.from({length: 5}, (_, i) => blob(cx + Math.cos(turn + i * 1.2566) * r * .95, cz + Math.sin(turn + i * 1.2566) * r * .95, r * .8, r * .8, 1, 0, 9));
/**
 * How a tuft's blades are drawn, one row per kind (the only place the two kinds differ). Each blade is a leaf along a
 * quadratic curve from its root to its tip, w wide at the root, full through its middle and pointed at the tip (BLADE_BELLY).
 * u runs -1..1 across the tuft (outer blades at ±1); h is the height a ward file gives the tuft; "the tallest blade" is h * rise.
 * - mat: gold sheet = grass, silver sheet = reed. Why sheet: the grass stands on gold banks and powder; in the ground's own gold
 *   (MAT.gold) it melted into them, and polished sheet is the one flat gold brighter than any powder it lies on (chain-3 P4).
 * - w: root width (plate units). At the home page's zoom one unit is about 1.5 px at 1440 wide: under about 2 units a blade is
 *   lost unless the lid is zoomed (chain-2 V2).
 * - rise: the tallest blade over h. The lid is seen from above at a slant, so height on the lid reads at about .6 of width.
 * - gap: distance between neighbouring roots, in root widths (w). Grass roots stand a little over a blade apart so the blades
 *   part low and the ground shows between them (C1: with roots under one unit apart the old grass blades overlapped up to two
 *   thirds of their height and read as one lump, at any texture size). Reed roots crowd together (.2).
 * - fan, bend: where the tip and the curve's control point sit across, times the tallest blade.
 * - bow: the control point's height over the blade's own height; above 1 the blade climbs and then bends over.
 * - arch: how far the outer blades' tips sink back (times u², so the middle blade stays upright).
 * - short: how much shorter the outer blades are (times |u|).
 * @typedef {{mat: number, w: number, rise: number, gap: number, fan: number, bend: number, bow: number, arch: number, short: number}} BladeLook
 * @type {Readonly<{grass: Readonly<BladeLook>, reed: Readonly<BladeLook>}>}
 */
export const BLADE = Object.freeze({
  grass: Object.freeze({mat: MAT.hyomonGold, w: 3, rise: 1.8, gap: 1.05, fan: .6, bend: .2, bow: 1.1, arch: .4, short: .3}),
  reed: Object.freeze({mat: MAT.hyomonSilver, w: 2.2, rise: 1, gap: .2, fan: .13, bend: .14, bow: .55, arch: 0, short: .38}),
});
/** How far a blade's tip and control point move with the tuft's lean, times the tallest blade (outer blades lean further). */
const LEAN_TIP = .6, LEAN_TIP_OUTER = .4, LEAN_BEND = .15;
/** The blades' random height change, as a share of the tallest blade (whole range). */
const BLADE_JITTER = .16;
/**
 * A blade's width at t (0 root .. 1 tip) is w * (1 - t) * (1 + BLADE_BELLY * t): full through the middle, then pointed. .84 is the
 * profile of the earlier two-curve outline (control points pushed out .46 w on each side), so a blade is as wide at half height
 * (.71 w) as it was when chain-2 V2 sized the widths. A straight taper (0) is .5 w there and the reed, 1.1 units, falls under
 * the 2-unit floor in BLADE's w.
 */
const BLADE_BELLY = .84;
/** Points along a blade's centre line. */
const BLADE_STEPS = 12;
/** A blade's closed outline along its centre line pts (root first), w wide at the root (BLADE_BELLY). */
function bladeOutline(pts, w) {
  const left = [], right = [], n = pts.length - 1;
  pts.forEach(([x, z], i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, t = i / n;
    const half = w * (1 - t) * (1 + BLADE_BELLY * t) / 2;
    left.push([x - (b[1] - a[1]) / l * half, z + (b[0] - a[0]) / l * half]); right.push([x + (b[1] - a[1]) / l * half, z - (b[0] - a[0]) / l * half]);
  });
  return [...left, ...right.reverse().slice(1)]; // the tip once: both sides meet there
}
/**
 * Tufts of grass or reed at the places given: [x, z, height, blades, lean?, flower?]. Blades rise from roots set side by side
 * (BLADE's gap) and curve with the lean; a tuft with a flower carries one five-petalled silver blossom on its middle blade (with
 * an even count, the one just right of the middle).
 * Each blade is a thin leaf of sheet metal inlaid flat (hyomon), not a raised stalk; its shape is the BLADE row given.
 * @param {string} id
 * @param {Array<[number, number, number, number, number?, boolean?]>} spots
 * @param {{on?: string, seed?: number, blade?: Readonly<BladeLook>}} [opts]
 */
export function grassTufts(id, spots, {on, seed = 1, blade = BLADE.grass} = {}) {
  need('grassTufts', id, on);
  if (!spots.length) throw new Error(`grassTufts(${id}): spots must not be empty`);
  const {mat, w, rise, gap, fan, bend, bow, arch, short} = blade;
  const r = rand(seed), grass = part(id, KIND.still, 0, mat, spots[0].slice(0, 2), {reach: .5, on}), bloom = [];
  for (const [x, z, h, n, lean = 0, flower = false] of spots) {
    const top = h * rise;
    for (let k = 0; k < n; k++) {
      const u = n === 1 ? 0 : k / (n - 1) * 2 - 1, a = Math.abs(u), hh = top * (1 - short * a + (r() - .5) * BLADE_JITTER);
      const root = [x + u * gap * w * (n - 1) / 2, z];
      const tip = [x + u * top * fan + lean * top * (LEAN_TIP + LEAN_TIP_OUTER * a), z - hh * (1 - arch * u * u)];
      const ctrl = [x + u * top * bend + lean * top * LEAN_BEND, z - hh * bow];
      grass.fills.push({d: bladeOutline(quad(root, ctrl, tip, BLADE_STEPS), w), soft: 0, crisp: 1});
      if (flower && k === Math.floor(n / 2)) bloom.push(tip);
    }
  }
  if (!bloom.length) return [grass];
  const flowers = part(`${id}-flower`, KIND.still, 0, MAT.hyomonSilver, bloom[0], {reach: .5, on});
  // Each blossom holds a drop of shell at its heart, as dew.
  const dew = part(`${id}-dew`, KIND.still, 0, MAT.aogai, bloom[0], {reach: .5, on});
  for (const [x, z] of bloom) {
    for (const d of five(x, z - 1.2, 2.6, -1.57)) flowers.fills.push({d, soft: 0, crisp: 1});
    dew.fills.push({d: blob(x, z - 1.2, 1.3, 1.3, 3, 0, 10), soft: 0, crisp: 1});
  }
  return [grass, flowers, dew];
}
/**
 * A pagoda at a great distance, a flat silhouette of pale gold standing on a ridge (`on`): five stacked eaves and a mast.
 * h is its whole height; zBase is the ridge line under it.
 * @param {string} id
 * @param {number} x
 * @param {number} zBase
 * @param {number} h
 * @param {{on?: string}} [opts]
 */
export function farPagoda(id, x, zBase, h, {on} = {}) {
  need('farPagoda', id, on);
  const p = part(id, KIND.still, 0, MAT.kirikane, [x, zBase], {reach: .5, on}), tier = h * .17;
  for (let i = 0; i < 5; i++) {
    const w = h * (.21 - i * .02) * .9, z1 = zBase - i * tier, z0 = z1 - tier * .78;
    p.fills.push({d: [[x - w * 1.15, z1], [x + w * 1.15, z1], [x + w * .62, z0], [x - w * .62, z0]], soft: 0, crisp: 1});
    p.fills.push({d: [[x - w * .5, z0], [x + w * .5, z0], [x + w * .5, z0 - tier * .22], [x - w * .5, z0 - tier * .22]], soft: 0, crisp: 1});
  }
  p.fills.push({d: [[x - h * .02, zBase - 5 * tier], [x + h * .02, zBase - 5 * tier], [x, zBase - h]], soft: 0, crisp: 1});
  return [p];
}
/**
 * The character 大 laid out in small squares of cut gold on a slope (`on`), as the bonfire on the mountain is: a bar and
 * two legs, and one square in three of red coral, for the fire. cx, cz is the middle of the bar; size is the bar's full width.
 * @param {string} id
 * @param {number} cx
 * @param {number} cz
 * @param {number} size
 * @param {{on?: string, tile?: number, stretch?: number}} [opts]
 */
export function daimonji(id, cx, cz, size, {on, tile = 3.8, stretch = 1} = {}) {
  need('daimonji', id, on);
  const p = part(id, KIND.still, 0, MAT.kirikane, [cx, cz], {reach: .5, on}), h = size * .5, s = tile / 2;
  const fire = part(`${id}-fire`, KIND.still, 0, MAT.coral, [cx, cz], {reach: .5, on});
  let count = 0;
  const put = (a, b) => {
    const n = Math.max(2, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / (tile * 1.5)));
    for (let i = 0; i <= n; i++) { const x = lerp(a[0], b[0], i / n), z = lerp(a[1], b[1], i / n); (count++ % 3 === 1 ? fire : p).fills.push({d: [[x - s, z - s], [x + s, z - s], [x + s, z + s], [x - s, z + s]], soft: 0, crisp: 1}); }
  };
  // stretch draws the character taller up the plate: the lid is seen at a slant, which presses it flat.
  const v = h * stretch;
  put([cx - h, cz], [cx + h, cz]);                    // the bar
  put([cx, cz - v * .55], [cx - h * .95, cz + v]);    // the left-falling leg, begun above the bar
  put([cx, cz + v * .05], [cx + h * .95, cz + v]);    // the right-falling leg
  return [p, fire];
}
/**
 * A plum beside a roof (`on`): a bare branch of dark line work rising from its foot, and on it blossoms of five
 * silver petals, each with a small round heart of red coral. x, z is the foot; s scales it
 * (1 is about 26 tall); lean -1 mirrors it.
 * @param {string} id
 * @param {number} x
 * @param {number} z
 * @param {number} s
 * @param {{on?: string, lean?: number}} [opts]
 */
export function silverPlum(id, x, z, s, {on, lean = 1} = {}) {
  need('silverPlum', id, on);
  const P = (dx, dz) => [x + dx * lean * s, z - dz * s];
  const limb = (pts, w0, w1) => ribbon(pts.map(([a, b]) => P(a, b)), w0 * s, w1 * s);
  const wood = part(id, KIND.still, 0, MAT.lacquer, [x, z], {reach: .5, on}), petals = part(`${id}-blossom`, KIND.still, 0, MAT.hyomonSilver, [x, z], {reach: .5, on});
  const heart = part(`${id}-heart`, KIND.still, 0, MAT.coral, [x, z], {reach: .5, on});
  wood.fills.push({d: limb([[0, 0], [-1.5, 6], [1, 12], [4.5, 17], [8, 21]], 2.4, 1), soft: 0, crisp: .8},
    {d: limb([[1, 12], [-3, 17], [-8, 20]], 1.5, .8), soft: 0, crisp: .8},
    {d: limb([[4, 17], [9, 15], [14, 16]], 1.2, .7), soft: 0, crisp: .8});
  for (const [dx, dz, r, turn] of [[8, 22, 2.2, .3], [-8, 21, 2.1, 1], [14, 17, 2, .6], [4.5, 18.5, 1.9, 1.4], [-4, 17.5, 1.8, .1], [10.5, 12.5, 1.7, .9]]) {
    const [cx, cz] = P(dx, dz);
    for (const d of five(cx, cz, r * s, turn)) petals.fills.push({d, soft: 0, crisp: 1});
    heart.fills.push({d: blob(cx, cz, r * s * .42, r * s * .42, 2, 0, 10), soft: 0, crisp: 1});
  }
  return [wood, petals, heart];
}

/**
 * A bamboo fence (`on`) along the line a to b: a horizontal band of silver and upright poles at an even step along it,
 * rising `rise` into the garden. Flat inlay.
 * @param {string} id
 * @param {[number, number]} a
 * @param {[number, number]} b
 * @param {{on?: string, rise?: number, step?: number, band?: number, pole?: number}} [opts]
 */
export function bambooFence(id, a, b, {on, rise = 12, step = 7, band = 3.4, pole = 2.6} = {}) {
  need('bambooFence', id, on);
  const p = part(id, KIND.still, 0, MAT.silver, a, {reach: .5, on}), len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  p.fills.push({d: ribbon([a, [lerp(a[0], b[0], .5), lerp(a[1], b[1], .5)], b], band, band), soft: 0, crisp: 1});
  const n = Math.floor(len / step);
  for (let i = 0; i <= n; i++) {
    const x = lerp(a[0], b[0], i / n), z = lerp(a[1], b[1], i / n);
    p.fills.push({d: [[x - pole / 2, z], [x + pole / 2, z], [x + pole / 2, z - rise], [x - pole / 2, z - rise]], soft: 0, crisp: 1});
  }
  return [p];
}
