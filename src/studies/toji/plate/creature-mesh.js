// Low-relief (takamaki-e) meshes for the plate's creatures and small solids (fox, phoenix, bird, sand cone, bowl, wall).
// Pure geometry like rock-mesh.js: every builder returns chunks {mat, vertices} of 8 floats per vertex [x, y, z, nx, ny, nz, u, v],
// non-indexed triangles, in plate coordinates (x right, z down the picture) with y the height the relief stands off its plane.
//
// The big form is a pillow: the part's own 2D outline (the same polygon the picture, picking and bounds use) raised into a
// rounded boss, so the silhouette cannot drift from the outline the user has seen. Features are not carved into it. They are
// laid on the surface the way cut gold and silver are in the pictures: sheets (kirikane, kirigin, a black lacquer eye) and
// thin strips (tsukegaki lines) that follow the boss a hair above it.
import {MAT} from './vocab.js';

const hyp = Math.hypot, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
const areaOf = p => { let a = 0; for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; a += p[i][0] * q[1] - q[0] * p[i][1]; } return a / 2; };

/** Drops repeated points (and a closing copy of the first point) so triangulation never meets a zero-length edge. */
function cleanPolygon(poly) {
  const out = [];
  for (const q of poly) { const l = out.at(-1); if (!l || hyp(q[0] - l[0], q[1] - l[1]) > 1e-6) out.push([q[0], q[1]]); }
  while (out.length > 1 && hyp(out[0][0] - out.at(-1)[0], out[0][1] - out.at(-1)[1]) <= 1e-6) out.pop();
  return out;
}

const inTriangle = (p, a, b, c) => {
  const d1 = cross(a, b, p), d2 = cross(b, c, p), d3 = cross(c, a, p);
  return d1 >= -1e-9 && d2 >= -1e-9 && d3 >= -1e-9;
};

/** Ear clipping for a simple polygon of a few dozen points. Returns index triples, counter-clockwise in (x, z). */
function earClip(poly) {
  const idx = poly.map((_, i) => i);
  if (areaOf(poly) < 0) idx.reverse();
  const tris = [];
  for (let guard = 0; idx.length > 3 && guard < 5000; guard++) {
    const n = idx.length;
    let cut = -1, flat = -1;
    for (let i = 0; i < n && cut < 0; i++) {
      const a = poly[idx[(i + n - 1) % n]], b = poly[idx[i]], c = poly[idx[(i + 1) % n]], k = cross(a, b, c);
      if (Math.abs(k) <= 1e-9) { if (flat < 0) flat = i; continue; }
      if (k < 0) continue;
      let ear = true;
      for (const j of idx) {
        const p = poly[j];
        if (p === a || p === b || p === c || (p[0] === a[0] && p[1] === a[1]) || (p[0] === b[0] && p[1] === b[1]) || (p[0] === c[0] && p[1] === c[1])) continue;
        if (inTriangle(p, a, b, c)) { ear = false; break; }
      }
      if (ear) cut = i;
    }
    if (cut < 0) { // no ear: a collinear point can simply go; otherwise cut the first corner and carry on
      if (flat >= 0) { idx.splice(flat, 1); continue; }
      cut = 0;
    }
    tris.push([idx[(cut + n - 1) % n], idx[cut], idx[(cut + 1) % n]]);
    idx.splice(cut, 1);
  }
  if (idx.length === 3 && Math.abs(cross(poly[idx[0]], poly[idx[1]], poly[idx[2]])) > 1e-9) tris.push([idx[0], idx[1], idx[2]]);
  return tris;
}

/** Triangulates a polygon and bisects every edge longer than `target` (shared midpoints keep the mesh watertight). */
function refine(poly, target, band = Infinity, coarse = target) {
  const pts = poly.map(p => [p[0], p[1]]), near = pts.map(([x, z]) => edgeDist(x, z, poly));
  let current = earClip(poly);
  const key = (a, b) => (a < b ? `${a}_${b}` : `${b}_${a}`);
  for (let pass = 0; pass < 40; pass++) {
    // Each pass bisects only the longest edge of every triangle that is too coarse for where it lies, so thin slivers
    // grow fat rather than getting thinner; the edge's neighbours split along it too, so the mesh stays watertight.
    const mids = new Map(), owners = new Map(), longest = tri => {
      let best = 0, bl = 0;
      for (let e = 0; e < 3; e++) { const x = tri[e], y = tri[(e + 1) % 3], l = hyp(pts[x][0] - pts[y][0], pts[x][1] - pts[y][1]); if (l > bl) { bl = l; best = e; } }
      return [tri[best], tri[(best + 1) % 3], bl];
    };
    for (const tri of current) for (let e = 0; e < 3; e++) { const k = key(tri[e], tri[(e + 1) % 3]); if (!owners.has(k)) owners.set(k, []); owners.get(k).push(tri); }
    const mark = (x, y) => {
      const k = key(x, y);
      if (mids.has(k)) return;
      pts.push([(pts[x][0] + pts[y][0]) / 2, (pts[x][1] + pts[y][1]) / 2]); near.push(edgeDist(pts.at(-1)[0], pts.at(-1)[1], poly)); mids.set(k, pts.length - 1);
      // Rivara closure: a neighbour that does not have this edge as its longest splits its own longest edge first.
      for (const tri of owners.get(k)) { const [lx, ly] = longest(tri); mark(lx, ly); }
    };
    for (const tri of current) {
      const [x, y, l] = longest(tri);
      if (mids.has(key(x, y))) continue;
      const dm = edgeDist((pts[x][0] + pts[y][0]) / 2, (pts[x][1] + pts[y][1]) / 2, poly);
      if (l > (dm < band ? target : coarse)) mark(x, y);
    }
    if (!mids.size) break;
    const mid = (a, b) => mids.get(key(a, b)) ?? -1;
    const next = [];
    let split = false;
    for (const [a, b, c] of current) {
      const m = [mid(a, b), mid(b, c), mid(c, a)], v = [a, b, c], count = m.filter(i => i >= 0).length;
      if (!count) { next.push([a, b, c]); continue; }
      split = true;
      if (count === 3) { next.push([a, m[0], m[2]], [m[0], b, m[1]], [m[2], m[1], c], [m[0], m[1], m[2]]); continue; }
      if (count === 1) {
        const i = m.findIndex(q => q >= 0), p = v[i], q = v[(i + 1) % 3], r = v[(i + 2) % 3];
        next.push([p, m[i], r], [m[i], q, r]); continue;
      }
      // two edges: rotate so the unsplit edge is (v2, v0)
      const i = m.findIndex(q => q < 0), p = v[(i + 1) % 3], q = v[(i + 2) % 3], r = v[i], mpq = m[(i + 1) % 3], mqr = m[(i + 2) % 3];
      // edges: p-q (mpq), q-r (mqr); unsplit r-p.
      next.push([mpq, q, mqr]);
      const d1 = hyp(pts[p][0] - pts[mqr][0], pts[p][1] - pts[mqr][1]), d2 = hyp(pts[mpq][0] - pts[r][0], pts[mpq][1] - pts[r][1]);
      if (d1 <= d2) next.push([p, mpq, mqr], [p, mqr, r]); else next.push([p, mpq, r], [mpq, mqr, r]);
    }
    current = next;
    if (!split) break;
  }
  return {pts, tris: current};
}

function segDist(x, z, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz, t = l2 > 1e-12 ? clamp(((x - a[0]) * dx + (z - a[1]) * dz) / l2, 0, 1) : 0;
  return hyp(x - a[0] - t * dx, z - a[1] - t * dz);
}
const edgeDist = (x, z, poly) => { let best = Infinity; for (let i = 0; i < poly.length; i++) best = Math.min(best, segDist(x, z, poly[i], poly[(i + 1) % poly.length])); return best; };
const insidePoly = (x, z, poly) => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
};

/** Welds nothing: smooth normals come from the indexed mesh, then are spread to 8-float vertices. */
function toVertices(pts3, tris, uvOf) {
  const normals = pts3.map(() => [0, 0, 0]);
  const faces = [];
  for (const [a, b, c] of tris) {
    const A = pts3[a], B = pts3[b], C = pts3[c];
    const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2], vx = C[0] - A[0], vy = C[1] - A[1], vz = C[2] - A[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const area = hyp(nx, ny, nz) / 2;
    if (!(area > 1e-6)) continue;
    // Counter-clockwise in (x, z) means this normal points down; the boss faces up.
    let order = [a, b, c];
    if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; order = [a, c, b]; }
    for (const i of [a, b, c]) { normals[i][0] += nx; normals[i][1] += ny; normals[i][2] += nz; }
    faces.push(order);
  }
  const out = [];
  for (const order of faces) for (const i of order) {
    const n = normals[i], l = hyp(n[0], n[1], n[2]) || 1, [u, v] = uvOf(pts3[i]);
    out.push(pts3[i][0], pts3[i][1], pts3[i][2], n[0] / l, n[1] / l, n[2] / l, u, v);
  }
  return out;
}

const plateUv = p => [p[0], p[2]];

/**
 * A pillow: the polygon raised to height `h` with a rounded shoulder `round` wide and a faint dome.
 * Returns the sampler `height(x, z)` (0 outside) as well as the data to mesh it.
 */
export function makePillow(poly, {h, round = h, dome = .1, target, coarse} = {}) {
  const outline = cleanPolygon(poly);
  if (outline.length < 3 || !(h > 0)) throw new Error('makePillow: need a polygon of at least 3 points and h > 0');
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const [x, z] of outline) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  const fine = target ?? clamp(round / 1.2, 1.3, 3.4), mesh = refine(outline, fine, round * 1.15, coarse ?? Math.max(fine * 3, 6));
  let maxD = 0;
  for (const [x, z] of mesh.pts) maxD = Math.max(maxD, edgeDist(x, z, outline));
  const R = Math.max(.4, Math.min(round, maxD * .9));
  const height = (x, z) => {
    if (!insidePoly(x, z, outline)) return 0;
    const d = edgeDist(x, z, outline), t = clamp(d / R, 0, 1), centre = clamp(d / maxD, 0, 1);
    return h * (1 - Math.pow(1 - t, 2.6)) * (1 - dome * (1 - centre));
  };
  return {outline, mesh, height, h};
}

/** Chunk of a pillow's own surface. */
export function pillowChunk(pillow, mat, {uv = plateUv} = {}) {
  const pts3 = pillow.mesh.pts.map(([x, z]) => [x, pillow.height(x, z), z]);
  return {mat, vertices: toVertices(pts3, pillow.mesh.tris, uv)};
}

/** The surface of several pillows: wherever they overlap, the higher one shows. */
export const surfaceOf = pillows => (x, z) => { let y = 0; for (const p of pillows) y = Math.max(y, p.height(x, z)); return y; };

/** A thin sheet of cut metal following `surface`, lifted `lift` above it (and `shift` for a part whose plane sits elsewhere). */
export function sheet(poly, surface, mat, {lift = .22, shift = 0, target, uv = plateUv} = {}) {
  const outline = cleanPolygon(poly);
  if (outline.length < 3) throw new Error('sheet: need a polygon of at least 3 points');
  const mesh = refine(outline, target ?? 1.4);
  const pts3 = mesh.pts.map(([x, z]) => [x, surface(x, z) + lift + shift, z]);
  return {mat, vertices: toVertices(pts3, mesh.tris, uv)};
}

/** A line of cut metal (tsukegaki) of width `w` following `surface`. `d` is a polyline of [x, z]. */
export function strip(d, w, surface, mat, {lift = .2, shift = 0, uv = plateUv} = {}) {
  const line = cleanPolygon(d.length > 2 && hyp(d[0][0] - d.at(-1)[0], d[0][1] - d.at(-1)[1]) <= 1e-6 ? d.slice(0, -1) : d);
  const closed = d.length > 2 && hyp(d[0][0] - d.at(-1)[0], d[0][1] - d.at(-1)[1]) <= 1e-6;
  const pts = closed ? [...line, line[0]] : line, dense = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], n = Math.max(1, Math.ceil(hyp(b[0] - a[0], b[1] - a[1]) / 1.6));
    for (let k = 0; k < n; k++) dense.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]);
  }
  dense.push(pts.at(-1));
  const pts3 = [], tris = [];
  dense.forEach((p, i) => {
    const a = dense[Math.max(0, i - 1)], b = dense[Math.min(dense.length - 1, i + 1)], l = hyp(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = -(b[1] - a[1]) / l * w / 2, nz = (b[0] - a[0]) / l * w / 2;
    for (const s of [1, -1]) { const x = p[0] + nx * s, z = p[1] + nz * s; pts3.push([x, surface(x, z) + lift + shift, z]); }
  });
  for (let i = 0; i < dense.length - 1; i++) { const a = i * 2; tris.push([a, a + 1, a + 2], [a + 1, a + 3, a + 2]); }
  return {mat, vertices: toVertices(pts3, tris, uv)};
}

/** A small round disc of cut metal, for an eye or a nostril. */
export function dot(x, z, r, surface, mat, opts = {}) {
  const ring = Array.from({length: 12}, (_, i) => [x + Math.cos(i / 12 * 6.2832) * r, z + Math.sin(i / 12 * 6.2832) * r]);
  return sheet(ring, surface, mat, {target: r * 3, ...opts});
}

/** Shrinks a convex polygon about its centroid (ear linings, the heart of a feather). */
export function inset(poly, k) {
  const c = poly.reduce(([x, z], p) => [x + p[0] / poly.length, z + p[1] / poly.length], [0, 0]);
  return poly.map(([x, z]) => [c[0] + (x - c[0]) * k, c[1] + (z - c[1]) * k]);
}

/** The part of a polygon lying at z <= zCut (Sutherland-Hodgman against one half-plane): a tail tip, a hem. */
export function clipAbove(poly, zCut) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], ain = a[1] <= zCut, bin = b[1] <= zCut;
    if (ain) out.push(a);
    if (ain !== bin) { const t = (zCut - a[1]) / (b[1] - a[1]); out.push([a[0] + (b[0] - a[0]) * t, zCut]); }
  }
  return out;
}

/** Chunks of the same material are merged, in the order materials first appear, as a part's `mesh`. */
export function mergeChunks(chunks) {
  const by = new Map();
  for (const c of chunks) { if (!c.vertices.length) continue; if (!by.has(c.mat)) by.set(c.mat, []); const into = by.get(c.mat); for (let i = 0; i < c.vertices.length; i++) into.push(c.vertices[i]); }
  return [...by].map(([mat, vertices]) => ({mat, vertices}));
}

/** The centre of the two feet that pin a bird to its twig: the last point of each of its last two lines. */
export function feetCentre(lines) {
  const feet = lines.slice(-2).map(l => l.d.at(-1));
  return [(feet[0][0] + feet[1][0]) / 2, (feet[0][1] + feet[1][1]) / 2];
}

/** Moves the vertices of chunks, shifting their uv with them when uv carries a plate position (the bird's centre). */
export function shiftChunks(chunks, dx, dz, shiftUv = false) {
  return chunks.map(c => {
    const v = c.vertices.slice();
    for (let i = 0; i < v.length; i += 8) { v[i] += dx; v[i + 2] += dz; if (shiftUv) { v[i + 6] += dx; v[i + 7] += dz; } }
    return {mat: c.mat, vertices: v};
  });
}

// ---- compositions -------------------------------------------------------------------------------------------------

/** Inari's fox: the stone in two stepped blocks of cut gold; the fox a silver boss with gold and lacquer laid on it. */
export function meshFox(stone, body, s) {
  const lift = clamp(s * .16, .16, .3), W = w => w * s;
  const blocks = [makePillow(stone.fills[0].d, {h: 5.5 * s, round: 2.6 * s, dome: .04}), makePillow(stone.fills[1].d, {h: 8.5 * s, round: 3 * s, dome: .04})];
  const stoneSurface = surfaceOf(blocks);
  stone.mesh = mergeChunks([
    ...blocks.map(b => pillowChunk(b, MAT.kirikane)),
    strip(stone.lines[0].d, W(.8), stoneSurface, MAT.kirigin, {lift: .12 * s}),
  ]);
  // torso, chest/haunch, head, muzzle, two ears, brush
  const heights = [[12.5, 5], [10.8, 4.5], [13.8, 4.5], [9, 3.2], [8.2, 2.6], [7.6, 2.6], [8.6, 4]];
  const pillows = body.fills.map((f, i) => makePillow(f.d, {h: heights[i][0] * s, round: heights[i][1] * s, dome: .12}));
  const surface = surfaceOf(pillows);
  const chunks = pillows.map(p => pillowChunk(p, MAT.kirigin));
  const [, , , muzzle, earA, earB, brush] = body.fills;
  for (const ear of [earA, earB]) chunks.push(sheet(inset(ear.d, .5), surface, MAT.kirikane, {lift, target: 1.8}));
  const tip = clipAbove(brush.d, brush.d.reduce((m, q) => Math.min(m, q[1]), Infinity) + 10 * s);
  if (tip.length >= 3) chunks.push(sheet(tip, surface, MAT.kirikane, {lift, target: 1.8}));
  for (const i of [0, 1]) chunks.push(strip(body.lines[i].d, W(.9), surface, MAT.kirikane, {lift}));
  chunks.push(strip(body.lines[2].d, W(1.5), surface, MAT.lacquer, {lift}));
  // The nose: a small lacquer dot just inside the muzzle's tip (its second point).
  const tipPoint = muzzle.d[1];
  const mc = muzzle.d.reduce(([x, z], q) => [x + q[0] / 3, z + q[1] / 3], [0, 0]);
  chunks.push(dot(tipPoint[0] + (mc[0] - tipPoint[0]) * .12, tipPoint[1] + (mc[1] - tipPoint[1]) * .12, W(.75), surface, MAT.lacquer, {lift}));
  body.mesh = mergeChunks(chunks);
}

/** The phoenix crest on the roof ridge: a gold boss of wing and tail, a raised head, silver feathering and a lacquer eye. */
export function meshPhoenix(p, P) {
  const [mass, head] = p.fills;
  const wing = makePillow(mass.d, {h: 6.5, round: 3.6, dome: .1}), crest = makePillow(head.d, {h: 8.6, round: 3.2, dome: .1});
  const surface = surfaceOf([wing, crest]);
  const chunks = [pillowChunk(wing, MAT.hyomonGold), pillowChunk(crest, MAT.hyomonGold)];
  chunks.push(strip(p.lines[0].d, .9, surface, MAT.kirigin, {lift: .2}));
  // Feathering, laid from the body out to the tips of the wing and tail.
  for (const [a, b, c] of [[[-6, -15], [-17, -22], [-29, -26]], [[-5, -18], [-14, -27], [-25, -31]], [[-5, -13], [-15, -16], [-28, -19]],
    [[5, -16], [15, -22], [26, -27]], [[5, -19], [14, -26], [25, -33]], [[6, -14], [14, -17], [24, -21]]]) {
    chunks.push(strip([P(...a), P(...b), P(...c)], .75, surface, MAT.kirigin, {lift: .18}));
  }
  chunks.push(dot(...P(9, -34), .95, surface, MAT.lacquer, {lift: .2}));
  p.mesh = mergeChunks(chunks);
}

/** Uguisu: a silver body, head, bill and tail, with a gold wing and legs, and a lacquer eye. Built where the perch was drawn. */
export function meshBird(p, flip, S) {
  const [bodyF, headF, billF, tailF] = p.fills;
  const body = makePillow(bodyF.d, {h: 4.8, round: 3.4, dome: .12}), head = makePillow(headF.d, {h: 5.4, round: 2.8, dome: .1});
  const bill = makePillow(billF.d, {h: 1.8, round: 1.2, dome: 0}), tail = makePillow(tailF.d, {h: 2.6, round: 1.6, dome: 0});
  const surface = surfaceOf([body, head, bill, tail]);
  const chunks = [body, head, bill, tail].map(q => pillowChunk(q, MAT.kirigin, {uv: () => [p.anchor[0], p.anchor[1]]}));
  const hc = headF.d.reduce(([x, z], q) => [x + q[0] / headF.d.length, z + q[1] / headF.d.length], [0, 0]);
  const opts = {lift: .18, uv: () => [p.anchor[0], p.anchor[1]]};
  const [ax, az] = p.anchor, f = (dx, dz) => [ax + dx * flip * S, az + dz * S];
  chunks.push(strip(p.lines[0].d, .9, surface, MAT.kirikane, opts));
  chunks.push(strip([f(-1.8, -3.7), f(-6.8, -1.8)], .8, surface, MAT.kirikane, opts));
  chunks.push(strip([f(-5.4, -3.2), f(-12, -.4)], .8, surface, MAT.kirikane, opts));
  for (const l of p.lines.slice(-2)) chunks.push(strip(l.d, .9, surface, MAT.kirikane, opts));
  chunks.push(dot(hc[0] + flip * S * .3, hc[1] - S * .15, .8, surface, MAT.lacquer, opts));
  p.mesh = mergeChunks(chunks);
}

/** Kogetsudai: a silver truncated cone with a raised level crown and the sand's rakings laid on its flank. */
export function meshSandCone(p, cx, zBase, halfW, top) {
  const [flank, crown] = p.fills;
  const cone = makePillow(flank.d, {h: 15, round: 9, dome: .08}), disc = makePillow(crown.d, {h: 16.6, round: 1.6, dome: 0});
  const surface = surfaceOf([cone, disc]);
  const chunks = [pillowChunk(cone, MAT.silver), pillowChunk(disc, MAT.silver)];
  chunks.push(strip(p.lines[0].d, .8, surface, MAT.kirigin, {lift: .2}));
  const r = halfW * .43;
  for (let k = 1; k <= 4; k++) {
    const t = k / 5, z = top + (zBase - top) * t, hw = (r + (halfW - r) * t) * .94;
    const arc = Array.from({length: 25}, (_, i) => { const u = i / 24; return [cx - hw + 2 * hw * u, z + Math.sin(u * Math.PI) * hw * .2]; });
    chunks.push(strip(arc, .8, surface, MAT.kirigin, {lift: .18}));
  }
  p.mesh = mergeChunks(chunks);
}

/** The small shinnuri vessel on the cone, with the moon's reflection and silver light lines laid inside its mouth. */
export function meshMoonBowl(bowl, reflection, light, bias) {
  const vessel = makePillow(bowl.fills[0].d, {h: 10, round: 5.5, dome: .1}), surface = surfaceOf([vessel]);
  bowl.mesh = mergeChunks([pillowChunk(vessel, MAT.lacquer), strip(bowl.lines[0].d, .9, surface, MAT.kirikane, {lift: .25})]);
  reflection.mesh = [sheet(reflection.fills[0].d, surface, MAT.aogai, {lift: .3, target: 1.8})];
  light.mesh = mergeChunks(light.fills.map(f => sheet(f.d, surface, MAT.kirigin, {lift: .5, target: 1.8})));
}

/** Nakagyo's moat wall: a low block of mura lacquer with its stone courses laid in black. */
export function meshWall(p) {
  const block = makePillow(p.fills[0].d, {h: 7, round: 3, dome: 0, target: 2.6, coarse: 24}), surface = surfaceOf([block]);
  p.mesh = mergeChunks([pillowChunk(block, MAT.mura), ...p.lines.map(l => strip(l.d, Math.max(.9, l.w * 1.2), surface, MAT.lacquer, {lift: .12}))]);
}
