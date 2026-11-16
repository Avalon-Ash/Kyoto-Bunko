// Crag: a Hatsune-style rock for the two pilot wards (docs/plans/2026-11-16-doha.md §15.1, §17). Not a solid but a few slabs of thick,
// low relief laid one over another: each lobe has a hand-written scalloped outline (a cusp, a round bulge, a cusp), a steep shoulder
// and a nearly flat top, with one or two terraces drawn in on it like contour lines; a later lobe stands on whatever it lies over.
// Every lobe has its own powder (blue-gold, pale gold or pale silver). Over the faces run a few fine raised lines in the grain of
// the rock (the stroke of a fude), and on a few lit faces a small group of cut-gold squares. At the foot there are flat pebbles.
// All of it is written by hand in the ward's file; only the surface is computed here.
// Pure geometry. Returns one plate part (`mesh` + `fills` for the bake and for picking), like meshRock.
import {MAT} from './mat.js';
import {KIND} from './vocab.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const unit = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const STEP = .9;
/** How far the whole form sinks below the lid, so that its foot is in the ground and no edge stands. */
const SINK = .3;
const BODY = {olive: MAT.rockOlive, gold: MAT.rockGold, silver: MAT.rockSilver};

/** The distance of (px, pz) to the segment a-b. */
function segD(px, pz, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz, t = l2 > 1e-9 ? clamp(((px - a[0]) * dx + (pz - a[1]) * dz) / l2, 0, 1) : 0;
  return Math.hypot(px - a[0] - t * dx, pz - a[1] - t * dz);
}
const ringD = (x, z, r) => { let d = Infinity; for (let i = 0; i < r.length; i++) d = Math.min(d, segD(x, z, r[i], r[(i + 1) % r.length])); return d; };
const inRing = (x, z, r) => {
  let inside = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const a = r[i], b = r[j];
    if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
};

/**
 * The scalloped outline of a lobe: `pts` are the hand-written cusps (the sharp notches), taken in order round the shape; between two
 * of them the edge is a round bulge (an arc of the circle through both, `bulge` of the half chord deep) pushed away from the heart.
 * A lobe of five to nine cusps has five to nine such bulges: the edge of a cloud or a wood-ear fungus.
 */
function scallop(pts, bulge = .5, per = 7) {
  const c = pts.reduce((m, p) => [m[0] + p[0] / pts.length, m[1] + p[1] / pts.length], [0, 0]), out = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1;
    let nx = -dz / l, nz = dx / l;
    if (nx * ((a[0] + b[0]) / 2 - c[0]) + nz * ((a[1] + b[1]) / 2 - c[1]) < 0) { nx = -nx; nz = -nz; }
    const sag = bulge * l / 2;
    for (let k = 0; k < per; k++) { const t = k / per, w = Math.sin(Math.PI * t); out.push([a[0] + dx * t + nx * sag * w, a[1] + dz * t + nz * sag * w]); }
  }
  return out;
}

/**
 * One lobe of a crag, written as a thick slab of relief: its outline (cusps in `d`, scalloped; `holes` plain) stands up with a steep
 * shoulder `s` wide and then is nearly flat, so every cusp and hole of the outline reads as it was written. Inside it, `t` lists
 * terraces: [k, dx, dz, h], a smaller outline (the same cusps drawn in by k about the heart, moved by dx, dz and swelled or
 * pinched a little from cusp to cusp, so it is not a copy), `h` higher still. l: {mat, h, d, bulge?, holes?, t?}
 */
function lobeOf(l, ox, oz, seed) {
  ox += l.mv?.[0] ?? 0; oz += l.mv?.[1] ?? 0;
  const mv = r => r.map(([x, z]) => [x + ox, z + oz]), holes = (l.holes ?? []).map(mv);
  const centre = l.d.reduce((m, p) => [m[0] + p[0] / l.d.length, m[1] + p[1] / l.d.length], [0, 0]);
  const levels = [{d: l.d, h: l.h, s: 2.2, bulge: l.bulge ?? .5}];
  (l.t ?? []).forEach(([k, dx, dz, h], n) => levels.push({
    d: l.d.map(([x, z], i) => { const f = k * (1 + .17 * Math.sin(i * 2.3 + n * 4.1 + seed)); return [centre[0] + dx + (x - centre[0]) * f, centre[1] + dz + (z - centre[1]) * f]; }),
    h, s: 1.5, bulge: (l.bulge ?? .5) * .8,
  }));
  return levels.map((lv, n) => {
    const outer = mv(scallop(lv.d, lv.bulge)), rings = [outer, ...holes];
    const xs = outer.map(p => p[0]), zs = outer.map(p => p[1]), bx0 = Math.min(...xs), bx1 = Math.max(...xs), bz0 = Math.min(...zs), bz1 = Math.max(...zs);
    const inside = (x, z) => inRing(x, z, outer) && !holes.some(r => inRing(x, z, r)), dist = (x, z) => Math.min(...rings.map(r => ringD(x, z, r)));
    const ph = seed * 1.3 + n;
    return {mat: l.mat, bounds: [bx0, bz0, bx1, bz1], outer, holes, area: polyAreaOf(outer), inside, h: (x, z) => {
      if (x < bx0 || x > bx1 || z < bz0 || z > bz1 || !inside(x, z)) return 0;
      const t = clamp(dist(x, z) / lv.s, 0, 1), up = 1 - (1 - t) * (1 - t);
      // a very shallow swell on the top face, so a plateau is not a table
      return lv.h * up + .22 * Math.sin(.55 * x + ph) * Math.sin(.47 * z - ph * .6) * up;
    }};
  });
}
const polyAreaOf = d => Math.abs(d.reduce((s, [x, z], i) => { const [x2, z2] = d[(i + 1) % d.length]; return s + x * z2 - x2 * z; }, 0)) / 2;

/**
 * The field of a crag: {h(x, z), b(x, z)} (height, and the index of the lobe that shows there). All in the part's own frame.
 * The lobes are laid back to front, each standing on whatever lies under it: inside its outline the surface is what was there plus
 * its own relief, so where a lobe lies over another, its steep shoulder is a ledge on the one behind, and the surface stays continuous.
 */
function cragField(crag, ox, oz) {
  const lobes = crag.lobes.flatMap((l, i) => lobeOf(l, ox, oz, i + (crag.seed ?? 0)));
  const pick = (x, z) => {
    let y = 0, b = 0;
    lobes.forEach((lb, i) => { const v = lb.h(x, z); if (v > 0) { y += v; b = i; } });
    return [y, b];
  };
  return {
    h: (x, z) => pick(x, z)[0], b: (x, z) => pick(x, z)[1], blocks: lobes, lobes,
    bounds: lobes.reduce((m, l) => [Math.min(m[0], l.bounds[0] - 2), Math.min(m[1], l.bounds[1] - 2), Math.max(m[2], l.bounds[2] + 2), Math.max(m[3], l.bounds[3] + 2)], [Infinity, Infinity, -Infinity, -Infinity]),
  };
}

/** A flat pebble: a low, rounded dome on an ellipse. p: [dx, dz, rx, rz, height, turn?]. */
function pebbleField(p, ox, oz) {
  const [dx, dz, rx, rz, H, ang = 0] = p, cx = dx + ox, cz = dz + oz, c = Math.cos(ang), s = Math.sin(ang);
  return {
    h: (x, z) => { const u = (x - cx) * c + (z - cz) * s, v = -(x - cx) * s + (z - cz) * c, k = Math.hypot(u / rx, v / rz); return k >= 1 ? 0 : H * Math.pow(1 - k * k, .55); },
    b: () => 0, pebble: true, blocks: [{mat: p[6] ?? 'silver'}], bounds: [cx - Math.max(rx, rz) - 1, cz - Math.max(rx, rz) - 1, cx + Math.max(rx, rz) + 1, cz + Math.max(rx, rz) + 1],
  };
}

/** Marching squares of {h > .05} over a grid: the closed outlines (arrays of [x, z]) of the rock's footprint. */
function outlines(h, x0, z0, nx, nz, step) {
  const iso = .05, v = (i, j) => h[j * (nx + 1) + i] - iso, segs = [];
  const lerp = (a, b, pa, pb) => { const t = pa / (pa - pb); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; };
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const P = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]].map(([a, b]) => [x0 + a * step, z0 + b * step]), V = [v(i, j), v(i + 1, j), v(i + 1, j + 1), v(i, j + 1)];
    const code = V.reduce((m, q, k) => m | (q > 0 ? 1 << k : 0), 0);
    if (code === 0 || code === 15) continue;
    const e = k => lerp(P[k], P[(k + 1) % 4], V[k], V[(k + 1) % 4]);
    const tbl = {1: [[3, 0]], 2: [[0, 1]], 3: [[3, 1]], 4: [[1, 2]], 5: [[3, 0], [1, 2]], 6: [[0, 2]], 7: [[3, 2]], 8: [[2, 3]], 9: [[0, 2]], 10: [[0, 1], [2, 3]], 11: [[1, 2]], 12: [[1, 3]], 13: [[0, 1]], 14: [[3, 0]]};
    for (const [a, b] of tbl[code]) segs.push([e(a), e(b)]);
  }
  // Chain the segments into loops by their end points.
  const key = p => `${Math.round(p[0] * 1000)},${Math.round(p[1] * 1000)}`, byStart = new Map(), used = new Set();
  const ends = new Map();
  segs.forEach((s, i) => { for (const p of s) { const k = key(p); (ends.get(k) ?? ends.set(k, []).get(k)).push(i); } });
  const loops = [];
  for (let i = 0; i < segs.length; i++) {
    if (used.has(i)) continue;
    used.add(i);
    const loop = [segs[i][0], segs[i][1]];
    for (let guard = 0; guard < 100000; guard++) {
      const last = loop[loop.length - 1], next = (ends.get(key(last)) ?? []).find(j => !used.has(j));
      if (next === undefined) break;
      used.add(next);
      const s = segs[next];
      loop.push(key(s[0]) === key(last) ? s[1] : s[0]);
    }
    if (loop.length > 6) loops.push(loop);
  }
  void byStart;
  return loops;
}
const polyArea = d => Math.abs(d.reduce((s, [x, z], i) => { const [x2, z2] = d[(i + 1) % d.length]; return s + x * z2 - x2 * z; }, 0)) / 2;
/** Drops points that lie within `tol` of the line between their neighbours, so a footprint is a few dozen points. */
function simplify(d, tol) {
  let out = d.slice(0, -1);
  for (let again = true; again && out.length > 8;) {
    again = false;
    for (let i = 0; i < out.length && out.length > 8; i++) {
      const a = out[(i + out.length - 1) % out.length], p = out[i], b = out[(i + 1) % out.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      if (l < 6 && Math.abs((b[0] - a[0]) * (a[1] - p[1]) - (a[0] - p[0]) * (b[1] - a[1])) / l < tol) { out.splice(i, 1); i--; again = true; }
    }
  }
  return out;
}

/** The mesh of one field on a grid: triangles into `out[mat]`. Returns the footprint loops. */
function meshField(field, matOf, out, push, flat) {
  const [bx0, bz0, bx1, bz1] = field.bounds, nx = Math.ceil((bx1 - bx0) / STEP), nz = Math.ceil((bz1 - bz0) / STEP);
  const hs = new Float32Array((nx + 1) * (nz + 1)), X = i => bx0 + i * STEP, Z = j => bz0 + j * STEP;
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) hs[j * (nx + 1) + i] = field.h(X(i), Z(j));
  const H = (i, j) => hs[clamp(j, 0, nz) * (nx + 1) + clamp(i, 0, nx)];
  const nrm = (i, j) => unit([-(H(i + 1, j) - H(i - 1, j)) / (2 * STEP), 1, -(H(i, j + 1) - H(i, j - 1)) / (2 * STEP)]);
  const P = (i, j) => [X(i), H(i, j) - SINK, Z(j)];
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    if (H(i, j) + H(i + 1, j) + H(i, j + 1) + H(i + 1, j + 1) <= 0) continue;
    // Diagonal along the lower pair, so a crease is cut cleanly.
    const flip = Math.abs(H(i, j) - H(i + 1, j + 1)) > Math.abs(H(i + 1, j) - H(i, j + 1));
    const tris = flip ? [[[i, j], [i + 1, j], [i, j + 1]], [[i + 1, j], [i + 1, j + 1], [i, j + 1]]] : [[[i, j], [i + 1, j], [i + 1, j + 1]], [[i, j], [i + 1, j + 1], [i, j + 1]]];
    for (const t of tris) {
      const cxm = X((t[0][0] + t[1][0] + t[2][0]) / 3), czm = Z((t[0][1] + t[1][1] + t[2][1]) / 3);
      const vs = t.map(([a, b]) => ({p: P(a, b), n: nrm(a, b)}));
      if (flat) { const A = vs[0].p, B = vs[1].p, C = vs[2].p, f = unit([(B[1] - A[1]) * (C[2] - A[2]) - (B[2] - A[2]) * (C[1] - A[1]), (B[2] - A[2]) * (C[0] - A[0]) - (B[0] - A[0]) * (C[2] - A[2]), (B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0])]), fn = f[1] < 0 ? [-f[0], -f[1], -f[2]] : f; for (const v of vs) v.n = fn; }
      push(out, matOf(field.blocks[field.b(cxm, czm)].mat), vs);
    }
  }
  const loops = outlines(hs, bx0, bz0, nx, nz, STEP).map(l => simplify(l, .22));
  return {loops, sample: (x, z) => { const i = (x - bx0) / STEP, j = (z - bz0) / STEP; return {i: Math.round(i), j: Math.round(j)}; }};
}

/**
 * A crag cluster. spec (everything in final plate units, relative to the cluster's (x, z)):
 *   crags    [{at?: [dx, dz], lobes: [{mat: 'olive' | 'gold' | 'silver', h, d: [[dx, dz]...] (5-9 cusps), bulge?, holes?: [[[dx, dz]...]], t?: [[k, dx, dz, h]...] terraces, mv?: [dx, dz] the whole lobe moved}]}]
 *            listed far to near; a crag's lobes likewise (a later lobe lies over the one before)
 *   lines    [[[dx, dz]...]] fine raised lines of the grain (pale gold), laid over the faces
 *   kiri     [{at: [dx, dz], cols, rows, turn?}] small groups of cut-gold squares on lit faces
 *   pebbles  [[dx, dz, rx, rz, height, turn?, 'silver' | 'olive']] flat stones at the foot
 */
export function meshCrag(id, cx, cz, spec0) {
  const spec = spec0;
  if (typeof id !== 'string' || !id) throw new Error(`meshCrag: invalid id ${id}`);
  if (![cx, cz].every(Number.isFinite) || !spec.crags?.length) throw new Error(`meshCrag(${id}): invalid parameters`);
  const out = new Map();
  const push = (m, mat, vs) => { const a = vs[0].p, b = vs[1].p, c = vs[2].p; const f = [(b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]), (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]), (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])];
    if (Math.hypot(...f) < 1e-7) return;
    const list = m.get(mat) ?? m.set(mat, []).get(mat), v = f[1] < 0 ? [vs[0], vs[2], vs[1]] : vs;
    for (const q of v) list.push(q.p[0], q.p[1], q.p[2], q.n[0], q.n[1], q.n[2], q.p[0], q.p[2]); };
  const fields = [...spec.crags.map(c => cragField(c, cx + (c.at?.[0] ?? 0), cz + (c.at?.[1] ?? 0))), ...(spec.pebbles ?? []).map(p => pebbleField(p, cx, cz))];
  const loops = [];
  for (const f of fields) loops.push(...meshField(f, k => BODY[k] ?? k, out, push, !f.pebble && (spec.flat ?? false)).loops);
  loops.sort((a, b) => polyArea(b) - polyArea(a));
  // The highest surface under (x, z) over every field, for the lines and the tiles.
  const surf = (x, z) => Math.max(0, ...fields.map(f => f.h(x, z)));
  const grad = (x, z) => unit([-(surf(x + .4, z) - surf(x - .4, z)) / .8, 1, -(surf(x, z + .4) - surf(x, z - .4)) / .8]);
  // Fine lines: a thin ribbon draped on the surface, a hair above it.
  const W = .9, lineV = [];
  for (const raw of spec.lines ?? []) {
    const pts = raw.map(([x, z]) => [x + cx, z + cz]), dense = [];
    for (let i = 0; i < pts.length - 1; i++) { const n = Math.max(1, Math.ceil(Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]) / .5)); for (let k = 0; k < n; k++) dense.push([pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k / n, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k / n]); }
    dense.push(pts[pts.length - 1]);
    const rib = dense.map((p, i) => {
      const a = dense[Math.max(0, i - 1)], b = dense[Math.min(dense.length - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / l, nz = (b[0] - a[0]) / l;
      // Taper at both ends, as a brush stroke does.
      const w = W * (.35 + .65 * Math.min(1, Math.min(i, dense.length - 1 - i) / 3)), h = surf(p[0], p[1]);
      const side = s => { const x = p[0] + nx * w * s, z = p[1] + nz * w * s, y = surf(x, z), n = grad(x, z); return {p: [x + n[0] * .1, y - SINK + n[1] * .1, z + n[2] * .1], n}; };
      return {l: side(-.5), r: side(.5), h};
    });
    for (let i = 0; i < rib.length - 1; i++) {
      if (rib[i].h < .5 || rib[i + 1].h < .5) continue;
      push(new Map([[MAT.rockLine, lineV]]), MAT.rockLine, [rib[i].l, rib[i].r, rib[i + 1].r]);
      push(new Map([[MAT.rockLine, lineV]]), MAT.rockLine, [rib[i].l, rib[i + 1].r, rib[i + 1].l]);
    }
  }
  // Cut-gold squares: a few in a small group, each a thin plate lying on the face.
  const tileV = [], T = 2.1, PITCH = 2.75;
  for (const g of spec.kiri ?? []) {
    const gx = cx + g.at[0], gz = cz + g.at[1], c = Math.cos(g.turn ?? .3), s = Math.sin(g.turn ?? .3);
    for (let r = 0; r < g.rows; r++) for (let q = 0; q < g.cols; q++) {
      const lx = (q - (g.cols - 1) / 2) * PITCH, lz = (r - (g.rows - 1) / 2) * PITCH, x = gx + c * lx - s * lz, z = gz + s * lx + c * lz;
      if (surf(x, z) < 1.5) continue;
      const n = grad(x, z), t1 = unit([c - n[0] * (c * n[0] + s * n[2]), -n[1] * (c * n[0] + s * n[2]), s - n[2] * (c * n[0] + s * n[2])]), t2 = unit([n[1] * t1[2] - n[2] * t1[1], n[2] * t1[0] - n[0] * t1[2], n[0] * t1[1] - n[1] * t1[0]]);
      const y = surf(x, z) - SINK, ctr = [x + n[0] * .16, y + n[1] * .16, z + n[2] * .16];
      const co = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => ({p: [ctr[0] + t1[0] * a * T / 2 + t2[0] * b * T / 2, ctr[1] + t1[1] * a * T / 2 + t2[1] * b * T / 2, ctr[2] + t1[2] * a * T / 2 + t2[2] * b * T / 2], n}));
      push(new Map([[MAT.kirikane, tileV]]), MAT.kirikane, [co[0], co[1], co[2]]);
      push(new Map([[MAT.kirikane, tileV]]), MAT.kirikane, [co[0], co[2], co[3]]);
    }
  }
  const mesh = [...out.entries()].map(([mat, vertices]) => ({mat, vertices}));
  if (lineV.length) mesh.push({mat: MAT.rockLine, vertices: lineV});
  if (tileV.length) mesh.push({mat: MAT.kirikane, vertices: tileV});
  const fills = loops.map((d, i) => ({d, soft: .35, crisp: .7, }));
  fills.push({d: loops[0].map(([x, z]) => { const m = loops[0].reduce((s, q) => [s[0] + q[0] / loops[0].length, s[1] + q[1] / loops[0].length], [0, 0]); return [m[0] + (x - m[0]) * .55, m[1] + (z - m[1]) * .55]; }), soft: .5, crisp: 1});
  const near = Math.max(...loops[0].map(q => q[1]));
  return [{id, kind: KIND.rock, group: id, order: 0, layer: spec.layer ?? 1, mat: MAT.rockGold, reach: 4, thick: 0, bias: 0, anchor: [cx, near - 2], fills, lines: [], mesh}];
}


/** The numbers of a cluster for the report and the tests: per crag, its footprint width and depth, its height, its lobes and summits. */
export function cragStats(cx, cz, spec) {
  const ST = 2;
  return spec.crags.map(c => {
    const f = cragField(c, cx + (c.at?.[0] ?? 0), cz + (c.at?.[1] ?? 0)), [x0, z0, x1, z1] = f.bounds;
    let w = [Infinity, -Infinity], d = [Infinity, -Infinity], top = 0, hs = new Map();
    const nx = Math.ceil((x1 - x0) / ST), nz = Math.ceil((z1 - z0) / ST);
    for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
      const x = x0 + i * ST, z = z0 + j * ST, h = f.h(x, z);
      if (h > .05) { w = [Math.min(w[0], x), Math.max(w[1], x)]; d = [Math.min(d[0], z), Math.max(d[1], z)]; top = Math.max(top, h); }
      hs.set(`${i},${j}`, h);
    }
    const peaks = [];
    for (let j = 1; j < nz; j++) for (let i = 1; i < nx; i++) {
      const h = hs.get(`${i},${j}`);
      if (h < top * .3) continue;
      let ok = true;
      for (let dj = -1; dj <= 1 && ok; dj++) for (let di = -1; di <= 1 && ok; di++) if ((di || dj) && hs.get(`${i + di},${j + dj}`) > h) ok = false;
      if (ok) peaks.push([x0 + i * ST, z0 + j * ST, h]);
    }
    const kept = [];
    for (const p of peaks.sort((a, b) => b[2] - a[2])) {
      if (kept.every(q => { let lo = Infinity; for (let k = 1; k < 24; k++) lo = Math.min(lo, f.h(p[0] + (q[0] - p[0]) * k / 24, p[1] + (q[1] - p[1]) * k / 24)); return lo < p[2] - 4; })) kept.push(p);
    }
    // Per lobe: how much of its area later lobes lie over, and its height against its short side (the main level only).
    const mainIdx = []; let n = 0;
    for (const l of c.lobes) { mainIdx.push(n); n += 1 + (l.t?.length ?? 0); }
    const covered = [], ratio = [];
    c.lobes.forEach((l, i) => {
      const me = f.lobes[mainIdx[i]], [lx0, lz0, lx1, lz1] = me.bounds; let tot = 0, cov = 0;
      for (let z = lz0; z <= lz1; z += .5) for (let x = lx0; x <= lx1; x += .5) if (me.inside(x, z)) { tot++; if (mainIdx.slice(i + 1).some(k => f.lobes[k].inside(x, z))) cov++; }
      covered.push(+(cov / Math.max(1, tot)).toFixed(2)); ratio.push(+(l.h / Math.min(lx1 - lx0, lz1 - lz0)).toFixed(2));
    });
    return {width: +(w[1] - w[0]).toFixed(1), depth: +(d[1] - d[0]).toFixed(1), height: +top.toFixed(1), lobes: c.lobes.length, peaks: kept.length, covered, ratio};
  });
}
