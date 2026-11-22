// Crag: a Hatsune-style rock for the two pilot wards (docs/plans/2026-11-16-doha.md §15.1). Not a mound with a star outline but a
// handful of blocks laid one in front of another, each a ridge (a polyline of [dx, dz, height, radius]) whose two sides fall away
// in planes to the ground. The blocks are united by their highest surface, so two blocks meet in a crease, and the front block
// lies over the one behind it. Every block has its own powder (blue-gold, pale gold or pale silver). Over the faces run a few fine
// raised lines in the grain of the rock (the stroke of a fude), and on a few lit faces a small group of cut-gold squares. At the
// foot there are flat pebbles. All of it is written by hand in the ward's file; only the surface is computed here.
// Pure geometry. Returns one plate part (`mesh` + `fills` for the bake and for picking), like meshRock.
import {MAT} from './mat.js';
import {KIND} from './vocab.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const unit = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const STEP = 1.1;
/** How far the whole form sinks below the lid, so that its foot is in the ground and no edge stands. */
const SINK = .3;
const BODY = {olive: MAT.rockOlive, gold: MAT.rockGold, silver: MAT.rockSilver};

/** The distance of (px, pz) to the segment a-b, and where along it (0..1) the nearest point is. */
function toSeg(px, pz, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz, t = l2 > 1e-9 ? clamp(((px - a[0]) * dx + (pz - a[1]) * dz) / l2, 0, 1) : 0;
  return [Math.hypot(px - a[0] - t * dx, pz - a[1] - t * dz), t];
}

/** The height of one block at (x, z): the highest of its ridge segments, each a plane sloping from the ridge to the ground. */
/** The lumpiness of a rock's surface: two slow waves, one of about 8 units and one of about 3.3, each with phases from the crag's seed. */
function lumps(seed) {
  return (x, z, fine) => fine
    ? Math.sin(1.9 * x - 1.3 * z + seed * 3.1) * Math.sin(1.7 * z + 1.1 * x + seed * .7)
    : Math.sin(.83 * x + .57 * z + seed * 1.7) * Math.sin(.61 * z - .49 * x + seed * 2.3);
}
function blockHeight(bl, x, z, nz) {
  const q = bl.q ?? .72, top = bl.top ?? .4, r = bl.ridge;
  let best = 0;
  for (let i = 0; i < r.length - 1 || (r.length === 1 && i === 0); i++) {
    const a = r[i], b = r[Math.min(i + 1, r.length - 1)], [d0, t] = toSeg(x, z, a, b), d = d0 * (1 - .2 * nz(x, z, false)), R = a[3] + (b[3] - a[3]) * t, Y = a[2] + (b[2] - a[2]) * t;
    const k = clamp((d - top * R) / (R * (1 - top)), 0, 1);
    if (k < 1) best = Math.max(best, Y * Math.pow(1 - k, q));
  }
  // Strata: shallow creases across the block in the lean of the rock, one every `period` units, `amp` deep (the folds of its face).
  const st = bl.strata;
  if (st && best > 0) {
    const u = (x * Math.cos(st.ang) + z * Math.sin(st.ang)) / st.period + (st.phase ?? 0), f = Math.abs(u - Math.round(u)) * st.period;
    if (f < (st.w ?? 1)) best -= st.amp * (1 - f / (st.w ?? 1)) * Math.min(1, best / 3);
  }
  return Math.max(0, best * (1 + .15 * nz(x, z, false) + .022 * nz(x, z, true)));
}

/** A groove (a V along a polyline) that notches the highest blocks. g: {p: [[dx, dz]...], w, depth}. */
function grooveCut(grooves, x, z) {
  let cut = 0;
  for (const g of grooves) for (let i = 0; i < g.p.length - 1; i++) {
    const [d] = toSeg(x, z, g.p[i], g.p[i + 1]);
    if (d < g.w) cut = Math.max(cut, g.depth * (1 - d / g.w));
  }
  return cut;
}

/** The field of a crag: {h(x, z), b(x, z)} (height, and the index of the block that is highest there). All in the part's own frame. */
function cragField(crag, ox, oz) {
  const nz = lumps(crag.seed ?? 1);
  const blocks = crag.blocks.map(bl => ({...bl, ridge: bl.ridge.map(([x, z, y, r]) => [x + ox, z + oz, y, r])}));
  const grooves = (crag.grooves ?? []).map(g => ({...g, p: g.p.map(([x, z]) => [x + ox, z + oz])}));
  const pick = (x, z) => {
    let h = 0, b = 0;
    blocks.forEach((bl, i) => { const v = blockHeight(bl, x, z, nz); if (v > h + 1e-9) { h = v; b = i; } });
    return [h, b];
  };
  return {
    h: (x, z) => { const [h] = pick(x, z); return h <= 0 ? 0 : Math.max(0, h - grooveCut(grooves, x, z) * Math.min(1, h / 3)); },
    b: (x, z) => pick(x, z)[1],
    blocks, bounds: blocks.flatMap(bl => bl.ridge).reduce((m, [x, z, , r]) => [Math.min(m[0], x - r * 1.3 - 2), Math.min(m[1], z - r * 1.3 - 2), Math.max(m[2], x + r * 1.3 + 2), Math.max(m[3], z + r * 1.3 + 2)], [Infinity, Infinity, -Infinity, -Infinity]),
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

/** spec.scale (default 1) enlarges a cluster's plan (offsets, radii, lines, pebbles), never its heights. */
function scaled(spec) {
  const k = spec.scale ?? 1;
  if (k === 1) return spec;
  const xz = ([x, z, ...r]) => [x * k, z * k, ...r], ridge = ([x, z, y, r]) => [x * k, z * k, y, r * k];
  return {...spec,
    crags: spec.crags.map(c => ({...c, at: c.at && xz(c.at), blocks: c.blocks.map(b => ({...b, ridge: b.ridge.map(ridge), strata: b.strata && {...b.strata, period: b.strata.period * k}})), grooves: c.grooves?.map(g => ({...g, p: g.p.map(xz), w: g.w * k}))})),
    lines: spec.lines?.map(l => l.map(xz)), kiri: spec.kiri?.map(g => ({...g, at: xz(g.at)})),
    pebbles: spec.pebbles?.map(([x, z, rx, rz, ...r]) => [x * k, z * k, rx * k, rz * k, ...r])};
}

/**
 * A crag cluster. spec:
 *   crags    [{at: [dx, dz], blocks: [{mat: 'olive' | 'gold' | 'silver', ridge: [[dx, dz, height, radius]...], q?, top?}], grooves?: [{p: [[dx, dz]...], w, depth}]}]
 *            listed far to near; a crag's blocks likewise (a later block lies in front)
 *   lines    [[[dx, dz]...]] fine raised lines of the grain (pale gold), laid over the faces
 *   kiri     [{at: [dx, dz], cols, rows, turn?}] small groups of cut-gold squares on lit faces
 *   pebbles  [[dx, dz, rx, rz, height, turn?, 'silver' | 'olive']] flat stones at the foot
 */
export function meshCrag(id, cx, cz, spec0) {
  const spec = scaled(spec0);
  if (typeof id !== 'string' || !id) throw new Error(`meshCrag: invalid id ${id}`);
  if (![cx, cz].every(Number.isFinite) || !spec.crags?.length) throw new Error(`meshCrag(${id}): invalid parameters`);
  const out = new Map();
  const push = (m, mat, vs) => { const a = vs[0].p, b = vs[1].p, c = vs[2].p; const f = [(b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]), (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]), (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])];
    if (Math.hypot(...f) < 1e-7) return;
    const list = m.get(mat) ?? m.set(mat, []).get(mat), v = f[1] < 0 ? [vs[0], vs[2], vs[1]] : vs;
    for (const q of v) list.push(q.p[0], q.p[1], q.p[2], q.n[0], q.n[1], q.n[2], q.p[0], q.p[2]); };
  const fields = [...spec.crags.map(c => cragField(c, cx + (c.at?.[0] ?? 0), cz + (c.at?.[1] ?? 0))), ...(spec.pebbles ?? []).map(p => pebbleField(p, cx, cz))];
  const loops = [];
  for (const f of fields) loops.push(...meshField(f, k => BODY[k] ?? k, out, push, !f.pebble && (spec.flat ?? true)).loops);
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
  const fills = loops.map(d => ({d, soft: .35, crisp: .7, }));
  fills.push({d: loops[0].map(([x, z]) => { const m = loops[0].reduce((s, q) => [s[0] + q[0] / loops[0].length, s[1] + q[1] / loops[0].length], [0, 0]); return [m[0] + (x - m[0]) * .55, m[1] + (z - m[1]) * .55]; }), soft: .5, crisp: 1});
  const near = Math.max(...loops[0].map(q => q[1]));
  return [{id, kind: KIND.rock, group: id, order: 0, layer: spec.layer ?? 1, mat: MAT.rockGold, reach: 4, thick: 0, bias: 0, anchor: [cx, near - 2], fills, lines: [], mesh}];
}

/** The numbers of a cluster for the report and the tests: per crag, its footprint width and depth, its height, its blocks and summits. */
export function cragStats(cx, cz, spec0) {
  const ST = 2;
  const spec = scaled(spec0);
  return spec.crags.map(c => {
    const f = cragField(c, cx + (c.at?.[0] ?? 0), cz + (c.at?.[1] ?? 0)), [x0, z0, x1, z1] = f.bounds;
    let w = [Infinity, -Infinity], d = [Infinity, -Infinity], top = 0, hs = new Map();
    const nx = Math.ceil((x1 - x0) / ST), nz = Math.ceil((z1 - z0) / ST);
    for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
      const x = x0 + i * ST, z = z0 + j * ST, h = f.h(x, z);
      if (h > .05) { w = [Math.min(w[0], x), Math.max(w[1], x)]; d = [Math.min(d[0], z), Math.max(d[1], z)]; top = Math.max(top, h); }
      hs.set(`${i},${j}`, h);
    }
    // Summits: local maxima of the height field that stand at least 2.5 over the lowest pass to a higher summit (a coarse count).
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
      // A summit counts when, on the straight line to every higher summit already kept, the surface dips at least 2.5 below it.
      if (kept.every(q => { let lo = Infinity; for (let k = 1; k < 24; k++) lo = Math.min(lo, f.h(p[0] + (q[0] - p[0]) * k / 24, p[1] + (q[1] - p[1]) * k / 24)); return lo < p[2] - 4; })) kept.push(p);
    }
    return {width: +(w[1] - w[0]).toFixed(1), depth: +(d[1] - d[0]).toFixed(1), height: +top.toFixed(1), blocks: c.blocks.length, peaks: kept.length};
  });
}
