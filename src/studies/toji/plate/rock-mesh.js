// Explicit 3D builder for high-makie rocks (takamaki-e mound + kirikane/kirigin square tile mosaic).
// Pure geometry returning a plate part with `mesh` + original `fills`/`lines` for picking and bounds, zero `thick`.
import {MAT, ROCK_LOOK, ROCK_DEFAULT} from './mat.js';
import {KIND, rand} from './vocab.js';


const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (v, fallback = [0, 1, 0]) => {
  const l = Math.hypot(v[0], v[1], v[2]);
  return l > 1e-12 ? [v[0] / l, v[1] / l, v[2] / l] : fallback;
};

function pushTri(out, a, b, c, hint, na, nb, nc, ua, ub, uc) {
  // Without temporary arrays; the arithmetic is the same cross / hypot / divide sequence as before.
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, len = Math.hypot(nx, ny, nz);
  if (!(.5 * len > 1e-7)) return;
  let fx = 0, fy = 1, fz = 0;
  if (len > 1e-12) { fx = nx / len; fy = ny / len; fz = nz / len; }
  if (fx * hint[0] + fy * hint[1] + fz * hint[2] < 0) { fx *= -1; fy *= -1; fz *= -1; [b, c, nb, nc, ub, uc] = [c, b, nc, nb, uc, ub]; }
  out.push(a[0], a[1], a[2], na ? na[0] : fx, na ? na[1] : fy, na ? na[2] : fz, ua ? ua[0] : a[0], ua ? ua[1] : a[2]);
  out.push(b[0], b[1], b[2], nb ? nb[0] : fx, nb ? nb[1] : fy, nb ? nb[2] : fz, ub ? ub[0] : b[0], ub ? ub[1] : b[2]);
  out.push(c[0], c[1], c[2], nc ? nc[0] : fx, nc ? nc[1] : fy, nc ? nc[2] : fz, uc ? uc[0] : c[0], uc ? uc[1] : c[2]);
}

function pushQuad(out, a, b, c, d, hint, na, nb, nc, nd) {
  pushTri(out, a, b, c, hint, na, nb, nc);
  pushTri(out, a, c, d, hint, na, nc, nd);
}

function distSeg(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
  const t = l2 > 1e-12 ? clamp(((px - ax) * dx + (pz - az) * dz) / l2, 0, 1) : 0;
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
}

function distPoly(px, pz, pts) {
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    best = Math.min(best, distSeg(px, pz, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]));
  }
  return best;
}

function barycentricXZ(px, pz, a, b, c) {
  const det = (b[2] - c[2]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[2] - c[2]);
  if (Math.abs(det) < 1e-10) return null;
  const l0 = ((b[2] - c[2]) * (px - c[0]) + (c[0] - b[0]) * (pz - c[2])) / det;
  const l1 = ((c[2] - a[2]) * (px - c[0]) + (a[0] - c[0]) * (pz - c[2])) / det;
  const l2 = 1 - l0 - l1;
  if (l0 < -1e-5 || l1 < -1e-5 || l2 < -1e-5) return null;
  return [l0, l1, l2];
}

// Where the key light comes from over a rock (up, from the left, a little toward the viewer), for foil that is laid on the lit faces only.
const FOIL_LIGHT = unit([-.45, .78, .44]);

/**
 * Explicit-mesh high-makie rock: sculpted 8-facet rounded mound with an upper-left secondary peak,
 * two carved ridge lines, and a dense mosaic of square kirikane/kirigin foil tiles lifted ~0.1 off
 * the surface along its normal.
 * @param {string} id
 * @param {number} cx
 * @param {number} cz
 * @param {number} w
 * @param {number} h
 * @param {number} seed
 * @param {{mat?: number, layer?: number, outline?: number[][], peaks?: {x: number, z: number, rx: number, rz: number, h: number}[], height?: number, lines?: number[][][], foil?: number}} [opts]
 */
export function meshRock(id, cx, cz, w, h, seed, {mat = MAT.kirikane, layer = 1, outline, peaks, height, lines, foil} = {}) {
  if (typeof id !== 'string' || !id) throw new Error(`meshRock: invalid id ${id}`);
  if (![cx, cz, w, h, seed].every(Number.isFinite) || !(w > 0) || !(h > 0)) {
    throw new Error(`meshRock(${id}): invalid geometry parameters`);
  }

  // outline: [[dx, dz]] round the rock from its centre (any count over 4, star-shaped about the centre), instead of the
  // eight-point ring; peaks: [{x, z, rx, rz, h}] the summits (h a share of the height), instead of one main and one side peak;
  // lines: [[[dx, dz]...]] the carved grooves; height: the crown's height; foil: only where the face turns to the light at
  // least this much (0..1; one tile or more always), instead of every upward face. With none of them: the original rock.
  const r = rand(seed), custom = Boolean(outline);
  let d = [];
  if (custom) d = outline.map(([x, z]) => [cx + x, cz + z]);
  else {
    for (let i = 0; i < 8; i++) {
      const t = i / 8 * 6.283 - Math.PI * .9, k = .72 + r() * .38, lower = Math.sin(t) > 0 ? .55 : 1;
      d.push([cx + Math.cos(t) * w * k, cz + Math.sin(t) * h * k * lower]);
    }
    // The crown stands off-centre, to one side or the other by the seed: one flank falls steeply, the other runs out long, so that no
    // two rocks have the same lean (with the crown in the middle every rock was the same small tent). The outline stays where it was.
    cx += (seed % 2 ? 1 : -1) * (.16 + .1 * ((seed * 37) % 10) / 10) * w;
  }
  const n = d.length;

  const p = {
    id, kind: KIND.rock, group: id, order: 0, layer, mat, reach: 4, thick: 0, bias: 0,
    anchor: [cx, cz + h * .4], fills: [], lines: [],
  };
  p.fills.push({d, soft: .35, crisp: .7});
  p.fills.push({d: d.map(([x, z]) => [cx + (x - cx) * .55 - w * .1, cz + (z - cz) * .5 - h * .12]), soft: .5, crisp: 1});
  const line1 = custom ? null : [d[1], [cx - w * .1, cz - h * .1], d[5]];
  const line2 = custom ? null : [d[3], [cx + w * .2, cz], d[6]];
  const grooves = custom ? (lines ?? []).map(l => l.map(([x, z]) => [cx + x, cz + z])) : [line1, line2];
  grooves.forEach((l, i) => p.lines.push({d: l, w: custom ? .65 : i ? .6 : .7, amp: custom ? .7 : i ? .6 : .8}));
  const distLines = (x, z) => grooves.reduce((m, l) => Math.min(m, distPoly(x, z, l)), Infinity);

  const rel = d.map(([x, z]) => [x - cx, z - cz]);
  const sectorCoord = (x, z) => {
    const dx = x - cx, dz = z - cz;
    if (Math.hypot(dx, dz) < 1e-9) return {u: 0, s: 0, f: 0};
    let bestS = 0, bestMin = -Infinity, bestU = 1, bestF = 0;
    for (let s = 0; s < n; s++) {
      const A = rel[s], B = rel[(s + 1) % n];
      const det = A[0] * B[1] - A[1] * B[0];
      const c1 = (dx * B[1] - dz * B[0]) / det;
      const c2 = (A[0] * dz - A[1] * dx) / det;
      const m = Math.min(c1, c2);
      if (m > bestMin) {
        bestMin = m;
        bestS = s;
        bestU = c1 + c2;
        bestF = bestU > 1e-9 ? clamp(c2 / bestU, 0, 1) : 0;
      }
    }
    return {u: bestU, s: bestS, f: bestF};
  };

  const H = height ?? clamp(Math.min(w, h) * .78 + 4.5, 16, 21);
  // Broad upper-left shoulder matching p.fills[1] and clean rock-ridge terraces along line1/line2.
  const mx = cx + w * .04, mz = cz + h * .02;
  const sx = cx - w * .17, sz = cz - h * .14;
  const rockY = (x, z) => {
    const {u, s, f} = sectorCoord(x, z);
    if (u >= 1) return 0;
    if (peaks) {
      let top = 0;
      for (const k of peaks) {
        const du = Math.hypot((x - cx - k.x) / k.rx, (z - cz - k.z) / k.rz);
        if (du < 1) top = Math.max(top, H * k.h * Math.pow(1 - Math.pow(du, 2.2), .65));
      }
      const dome = Math.pow(Math.max(0, 1 - Math.pow(u, 2.4)), .62);
      let gr = 0;
      for (const l of grooves) { const dl = distPoly(x, z, l); if (dl < 1.4) gr += Math.pow(1 - dl / 1.4, 1.5) * .75; }
      return Math.max(0, Math.max(top * smoothstep(1, .6, u), H * .2 * dome) - gr * smoothstep(.96, .74, u));
    }
    // Each sector of the outline is one flat face rising to the crown (u is linear across a sector, so 1 - u is a plane): the faces meet in
    // ridges, as the planes of a rock do. A share of the old dome rounds the crown and the foot a little. (All dome, it was a smooth lump.)
    const baseDome = lerp(Math.pow(Math.max(0, 1 - Math.pow(u, 2.4)), .62), Math.pow(Math.max(0, 1 - u), .8), .7);
    // Broad tilted shoulder steps per face instead of tight radial pinches.
    const facetTilt = .95 + .07 * Math.sin(s * 2.1 + seed) + .04 * Math.sin((f - .5) * Math.PI);
    const facetBlend = lerp(1, facetTilt, smoothstep(.22, .58, u) * smoothstep(1, .84, u));
    const duMain = Math.hypot((x - mx) / (w * .82), (z - mz) / (h * .72));
    const mainPeak = H * baseDome * facetBlend * (1 - .06 * clamp(duMain, 0, 1));
    const duSub = Math.hypot((x - sx) / (w * .54), (z - sz) / (h * .46));
    const peak2 = duSub < 1 ? H * .42 * Math.pow(Math.max(0, 1 - Math.pow(duSub, 2.2)), .65) * smoothstep(.96, .56, u) : 0;
    const d1 = distPoly(x, z, line1), d2 = distPoly(x, z, line2);
    const g1 = d1 < 1.45 ? Math.pow(1 - d1 / 1.45, 1.5) : 0;
    const g2 = d2 < 1.35 ? Math.pow(1 - d2 / 1.35, 1.5) : 0;
    const groove = (g1 * .80 + g2 * .70) * smoothstep(.96, .74, u);
    return Math.max(0, mainPeak + peak2 - groove);
  };

  const N_RAD = 18, SECT_SUB = 7, N_ANG = n * SECT_SUB;
  const uRing = Array.from({length: N_RAD + 1}, (_, j) => 1 - Math.pow(1 - j / N_RAD, 1.35));
  const pos = [], norm = [];
  for (let j = 0; j <= N_RAD; j++) {
    const u = uRing[j];
    const rowP = [], rowN = [];
    for (let i = 0; i < N_ANG; i++) {
      const s = Math.floor(i / SECT_SUB) % n, f = (i % SECT_SUB) / SECT_SUB;
      const A = rel[s], B = rel[(s + 1) % n];
      const ex = lerp(A[0], B[0], f), ez = lerp(A[1], B[1], f);
      const px = cx + u * ex, pz = cz + u * ez;
      rowP.push([px, j === N_RAD ? 0 : rockY(px, pz), pz]);
      rowN.push([0, 0, 0]);
    }
    pos.push(rowP);
    norm.push(rowN);
  }

  // Build top triangles and accumulate area-weighted smooth vertex normals.
  const topTris = [];
  const cellTris = Array.from({length: N_RAD}, () => Array.from({length: N_ANG}, () => []));
  const addTopTri = (j0, i0, j1, i1, j2, i2, cellJ, cellI) => {
    const a = pos[j0][i0], b = pos[j1][i1], c = pos[j2][i2];
    let fn = cross(sub(b, a), sub(c, a));
    const area2 = Math.hypot(fn[0], fn[1], fn[2]);
    if (!(area2 > 1e-7)) return;
    if (fn[1] < 0) {
      fn = scale(fn, -1);
      [j1, i1, j2, i2] = [j2, i2, j1, i1];
    }
    for (const [jj, ii] of [[j0, i0], [j1, i1], [j2, i2]]) {
      norm[jj][ii][0] += fn[0];
      norm[jj][ii][1] += fn[1];
      norm[jj][ii][2] += fn[2];
    }
    const tri = [[j0, i0], [j1, i1], [j2, i2]];
    topTris.push(tri);
    cellTris[cellJ][cellI].push(tri);
  };

  for (let i = 0; i < N_ANG; i++) {
    const iNext = (i + 1) % N_ANG;
    addTopTri(0, 0, 1, i, 1, iNext, 0, i);
  }
  for (let j = 1; j < N_RAD; j++) {
    for (let i = 0; i < N_ANG; i++) {
      const iNext = (i + 1) % N_ANG;
      addTopTri(j, i, j + 1, i, j + 1, iNext, j, i);
      addTopTri(j, i, j + 1, iNext, j, iNext, j, i);
    }
  }

  const apexN = [0, 0, 0];
  for (let i = 0; i < N_ANG; i++) {
    apexN[0] += norm[0][i][0];
    apexN[1] += norm[0][i][1];
    apexN[2] += norm[0][i][2];
  }
  const unitApexN = unit(apexN);
  for (let i = 0; i < N_ANG; i++) norm[0][i] = unitApexN;
  for (let j = 1; j <= N_RAD; j++) {
    for (let i = 0; i < N_ANG; i++) norm[j][i] = unit(norm[j][i]);
  }

  // Warm bronze-amber mura-nashiji mound body so kirikane (gold) and kirigin (silver) tiles read with crisp contrast.
  // The foil's map is the mound unrolled flat: each vertex sits at its distance along the surface from the crown, in its own
  // direction, so a diamond keeps its shape on a steep flank instead of stretching as it would if laid by plan position.
  const foilUv = pos.map((row, j) => row.map((q, i) => {
    let along = 0;
    for (let k = 1; k <= j; k++) along += Math.hypot(...sub(pos[k][i], pos[k - 1][i]));
    const dx = q[0] - cx, dz = q[2] - cz, r = Math.hypot(dx, dz);
    return r > 1e-9 ? [cx + dx / r * along, cz + dz / r * along] : [cx, cz];
  }));

  // A powder rock (the pilot wards): the body is its own pale gold or silver and there are no foil tiles.
  const {powder, body: bodyMat, tile: tileMat} = ROCK_LOOK[mat] ?? ROCK_DEFAULT;
  const bodyVerts = [];
  for (const [[j0, i0], [j1, i1], [j2, i2]] of topTris) {
    pushTri(bodyVerts, pos[j0][i0], pos[j1][i1], pos[j2][i2], [0, 1, 0], norm[j0][i0], norm[j1][i1], norm[j2][i2], foilUv[j0][i0], foilUv[j1][i1], foilUv[j2][i2]);
  }
  const botC = [cx, 0, cz];
  for (let i = 0; i < N_ANG; i++) {
    const iNext = (i + 1) % N_ANG;
    pushTri(bodyVerts, botC, pos[N_RAD][iNext], pos[N_RAD][i], [0, -1, 0], [0, -1, 0], [0, -1, 0], [0, -1, 0]);
  }

  // Exact barycentric sampler over the triangulated rock surface.
  const sampleMesh = (x, z) => {
    const {u, s, f} = sectorCoord(x, z);
    if (u >= 1) return null;
    let jHit = 0;
    for (let j = 0; j < N_RAD; j++) {
      if (u <= uRing[j + 1] + 1e-6) { jHit = j; break; }
    }
    const iHit = s * SECT_SUB + Math.min(SECT_SUB - 1, Math.floor(f * SECT_SUB));
    const checkList = [];
    for (let dj = -1; dj <= 1; dj++) {
      const jj = jHit + dj;
      if (jj < 0 || jj >= N_RAD) continue;
      for (let di = -1; di <= 1; di++) {
        const ii = (iHit + di + N_ANG) % N_ANG;
        for (const tri of cellTris[jj][ii]) checkList.push(tri);
      }
    }
    for (const [[j0, i0], [j1, i1], [j2, i2]] of checkList) {
      const a = pos[j0][i0], b = pos[j1][i1], c = pos[j2][i2];
      const l = barycentricXZ(x, z, a, b, c);
      if (!l) continue;
      const y = l[0] * a[1] + l[1] * b[1] + l[2] * c[1];
      const na = norm[j0][i0], nb = norm[j1][i1], nc = norm[j2][i2];
      const nrm = unit([
        l[0] * na[0] + l[1] * nb[0] + l[2] * nc[0],
        l[0] * na[1] + l[1] * nb[1] + l[2] * nc[1],
        l[0] * na[2] + l[1] * nb[2] + l[2] * nc[2],
      ]);
      return {y, nrm, u};
    }
    return null;
  };

  // Kirikane / kirigin mosaic tiles laid in a tilted grid over the upper/lit rock faces.
  const rt = rand(seed + 101);
  const gridAngle = .28 + (rt() - .5) * .36;
  const cg = Math.cos(gridAngle), sg = Math.sin(gridAngle);
  // Hatsune kirikane squares read as a mosaic at plate scale: about 1.8–2.1 units with a clear gap.
  const pitch = 2.4;
  const maxSpan = Math.ceil(Math.hypot(w, h) * 1.15 / pitch);
  const tileVerts = [];
  const tileThick = .022;
  if (powder) { p.mesh = [{mat: bodyMat, vertices: bodyVerts}]; return [p]; }

  for (let iz = -maxSpan; iz <= maxSpan; iz++) {
    for (let ix = -maxSpan; ix <= maxSpan; ix++) {
      const jx = (rt() - .5) * .06, jz = (rt() - .5) * .06;
      const sz = 1.8 + rt() * .3;
      const sxTile = sz * (.94 + rt() * .10), szTile = sz * (.94 + rt() * .10);
      const rotJit = (rt() - .5) * .07;
      const gx = ix * pitch + jx, gz = iz * pitch + jz;
      const tx = cx + cg * gx - sg * gz, tz = cz + sg * gx + cg * gz;

      const hit = sampleMesh(tx, tz);
      if (!hit || hit.u > .91 || hit.nrm[1] < .35) continue;
      if (distLines(tx, tz) < .45) continue;
      if (foil !== undefined && dot(hit.nrm, FOIL_LIGHT) < foil) continue;

      const N0 = hit.nrm;
      const ca = Math.cos(gridAngle + rotJit), sa = Math.sin(gridAngle + rotJit);
      const dirX = [ca, 0, sa];
      const T1_0 = unit(sub(dirX, scale(N0, dot(dirX, N0))));
      const T2_0 = unit(cross(N0, T1_0));
      const hx = sxTile * .5, hz = szTile * .5;
      const center = [tx, hit.y, tz];
      const probe = [
        add(center, add(scale(T1_0, -hx), scale(T2_0, -hz))),
        add(center, add(scale(T1_0, hx), scale(T2_0, -hz))),
        add(center, add(scale(T1_0, hx), scale(T2_0, hz))),
        add(center, add(scale(T1_0, -hx), scale(T2_0, hz))),
      ];

      // Fit tile plane to the 4 corner surface hits (cuts curvature sag in half compared to center tangent).
      const hitsC = [];
      let ok = true;
      for (const c of probe) {
        const ch = sampleMesh(c[0], c[2]);
        if (!ch || distLines(c[0], c[2]) < .15) { ok = false; break; }
        hitsC.push([c[0], ch.y, c[2]]);
      }
      if (!ok) continue;

      let N = unit(cross(sub(hitsC[2], hitsC[0]), sub(hitsC[3], hitsC[1])), N0);
      if (dot(N, N0) < 0) N = scale(N, -1);
      if (N[1] < .34) continue;

      const T1 = unit(sub(dirX, scale(N, dot(dirX, N))));
      const T2 = unit(cross(N, T1));
      const avgY = (hitsC[0][1] + hitsC[1][1] + hitsC[2][1] + hitsC[3][1]) * .25;
      const midCenter = [tx, (hit.y + avgY) * .5, tz];
      const baseCorners = [
        add(midCenter, add(scale(T1, -hx), scale(T2, -hz))),
        add(midCenter, add(scale(T1, hx), scale(T2, -hz))),
        add(midCenter, add(scale(T1, hx), scale(T2, hz))),
        add(midCenter, add(scale(T1, -hx), scale(T2, hz))),
      ];

      let minS = Infinity, maxS = -Infinity;
      // The tile is checked at its centre, its corners, the middles of its sides and its quarter points: a ridge between two faces of the
      // rock can pass under a tile between its corners, and the tile must clear it there too.
      const mid = (i, j, t = .5) => baseCorners[i].map((v, c) => lerp(v, baseCorners[j][c], t));
      const checks = [...baseCorners, mid(0, 1), mid(1, 2), mid(2, 3), mid(3, 0), mid(0, 2, .25), mid(0, 2, .75), mid(1, 3, .25), mid(1, 3, .75)];
      for (let k = 0; k <= checks.length; k++) {
        const ch = k === 0 ? hit : sampleMesh(checks[k - 1][0], checks[k - 1][2]);
        if (!ch || (k > 0 && k < 5 && distLines(checks[k - 1][0], checks[k - 1][2]) < .15)) {
          ok = false; break;
        }
        const refY = k === 0 ? midCenter[1] : checks[k - 1][1];
        const dY = refY - ch.y;
        const dMin = Math.min(dY * N[1], dY * ch.nrm[1]);
        const dMax = Math.max(dY * N[1], dY * ch.nrm[1]);
        minS = Math.min(minS, dMin);
        maxS = Math.max(maxS, dMax);
      }
      if (!ok || maxS - minS > .095) continue;

      // (The clearance is measured at sample points; a ridge can pass between them, so the tile is set a little higher than the
      // bare minimum and one whose lowest sample is still near the body is left out.)
      const baseOff = clamp(.11 - minS, .078, .15);
      if (baseOff + minS < .095 || baseOff + maxS + tileThick > .188) continue;
      const topOff = baseOff + tileThick;
      const bPts = baseCorners.map(c => add(c, scale(N, baseOff)));
      const tPts = baseCorners.map(c => add(c, scale(N, topOff)));

      pushQuad(tileVerts, tPts[0], tPts[1], tPts[2], tPts[3], N, N, N, N, N);
      const negN = scale(N, -1);
      pushQuad(tileVerts, bPts[0], bPts[3], bPts[2], bPts[1], negN, negN, negN, negN, negN);
      for (let k = 0; k < 4; k++) {
        const kn = (k + 1) % 4;
        const sideN = unit(cross(sub(bPts[kn], bPts[k]), N));
        pushQuad(tileVerts, bPts[k], bPts[kn], tPts[kn], tPts[k], sideN, sideN, sideN, sideN, sideN);
      }
    }
  }

  p.mesh = tileVerts.length ? [{mat: bodyMat, vertices: bodyVerts}, {mat: tileMat, vertices: tileVerts}] : [{mat: bodyMat, vertices: bodyVerts}];
  return [p];
}
