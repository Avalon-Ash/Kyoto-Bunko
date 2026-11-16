// Rasterises a plate's parts with Canvas 2D. The GPU side (blur, upload) lives in three-renderer.js.
// Channels of a painted layer:  R soft swell (blurred later)  G crisp relief  B line work  A coverage.
import {PLATE, KIND} from './vocab.js';
import {WEDGE_PROFILE} from './doha.js';

const trace = (ctx, d, close) => {
  ctx.beginPath();
  ctx.moveTo(d[0][0], d[0][1]);
  for (let i = 1; i < d.length; i++) ctx.lineTo(d[i][0], d[i][1]);
  if (close) ctx.closePath();
};
const toUnits = (ctx, w, h) => ctx.setTransform(w / (PLATE.halfW * 2), 0, 0, h / (PLATE.halfH * 2), w / 2, h / 2);

/**
 * A bank's wedge (doha.js): its height falls from 1 at the ridge to 0 at depth along the normal, painted as linear-gradient
 * strips along the ridge and radial fans at its corners, kept by 'lighten' (the highest wins) and clipped to the bank's outline.
 * The G channel carries the height itself (the shader's relief and the colour's fade); R carries it times f.wedge.amp (the soft
 * swell the geometry is raised by). The ridge's own strength (env) scales both, so a bank's crest dies out at its ends.
 */
function paintWedge(ctx, f) {
  const {depth, amp} = f.wedge;
  // Every other ridge vertex (the ends kept): the strips are 7 units long at most and the corners are fanned, so nothing shows.
  const ridge = f.wedge.ridge.filter((_, i, a) => i % 2 === 0 || i === a.length - 1);
  const stops = (g, k) => { for (const [t, h] of WEDGE_PROFILE) g.addColorStop(t, 'rgb(' + Math.round(255 * Math.min(1, amp * h * k)) + ',' + Math.round(255 * h * k) + ',0)'); };
  ctx.save();
  trace(ctx, f.d, true); ctx.clip();
  ctx.globalCompositeOperation = 'lighten';
  for (let i = 0; i < ridge.length - 1; i++) {
    const [ax, az, ae, nx, nz] = ridge[i], [bx, bz, be] = ridge[i + 1], k = (ae + be) / 2;
    if (k < .015) continue;
    const tl = Math.hypot(bx - ax, bz - az) || 1, ex = (bx - ax) / tl * 1.2, ez = (bz - az) / tl * 1.2;
    const g = ctx.createLinearGradient((ax + bx) / 2, (az + bz) / 2, (ax + bx) / 2 + nx * depth, (az + bz) / 2 + nz * depth);
    stops(g, k); ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(ax - ex, az - ez); ctx.lineTo(bx + ex, bz + ez); ctx.lineTo(bx + ex + nx * depth, bz + ez + nz * depth); ctx.lineTo(ax - ex + nx * depth, az - ez + nz * depth); ctx.closePath(); ctx.fill();
    if (i === 0) continue;
    // The corner at this vertex: a fan between the two segments' normals, so the wedge has no gap where the ridge turns.
    const [px, pz, pe, mx, mz] = ridge[i - 1];
    if (mx * nx + mz * nz > .995) continue;
    const r = ctx.createRadialGradient(ax, az, 0, ax, az, depth);
    stops(r, Math.max(ae, pe)); ctx.fillStyle = r;
    ctx.beginPath(); ctx.moveTo(ax, az); ctx.lineTo(ax + mx * depth, az + mz * depth); ctx.lineTo(ax + (mx + nx) * depth * .52, az + (mz + nz) * depth * .52); ctx.lineTo(ax + nx * depth, az + nz * depth); ctx.closePath(); ctx.fill();
    void px; void pz;
  }
  ctx.restore();
}

/**
 * A string of cut gold squares laid along a path (the suhama's edge, a bank's ridge): into the B channel at full strength,
 * where a rim line (amp .5) never reaches. Every so often one is left out, as a string is laid by hand.
 */
function paintKiriString(ctx, strings) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighten'; ctx.fillStyle = 'rgb(0,0,255)';
  for (const {path, pitch, half} of strings) {
    let at = 0, k = 0, carried = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const [ax, az] = path[i], [bx, bz] = path[i + 1], len = Math.hypot(bx - ax, bz - az), ang = Math.atan2(bz - az, bx - ax);
      for (; at <= carried + len; at += pitch, k++) {
        if ((k * 7 + 3) % 11 === 0) continue;
        const t = (at - carried) / len;
        ctx.save(); ctx.translate(ax + (bx - ax) * t, az + (bz - az) * t); ctx.rotate(ang);
        ctx.fillRect(-half, -half, half * 2, half * 2); ctx.restore();
      }
      carried += len;
    }
  }
  ctx.restore();
}

/** Paint one layer of the plate into ctx (w × h pixels). Layer 0 is opaque: it is the ground itself. */
export function paintLayer(ctx, w, h, parts, layer) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, w, h);
  if (layer === 0) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h); }
  toUnits(ctx, w, h);
  ctx.lineCap = ctx.lineJoin = 'round';
  for (const p of parts) {
    if (p.layer !== layer || p.limbs || p.mesh) continue;
    ctx.globalCompositeOperation = 'source-over';
    for (const f of p.fills) {
      if (f.wedge && layer === 0) { paintWedge(ctx, f); if (f.kiri) paintKiriString(ctx, f.kiri); continue; }
      // A standing part is a pillow: its whole silhouette feeds the blurred channel, which becomes its dome.
      ctx.fillStyle = `rgb(${layer > 0 ? 255 : Math.round(f.soft * 255)},${Math.round(f.crisp * 255)},0)`;
      trace(ctx, f.d, true); ctx.fill();
      if (f.kiri && layer === 0) paintKiriString(ctx, f.kiri);
    }
    // Lines add to the blue channel only, so they sit on whatever relief is already there.
    ctx.globalCompositeOperation = 'lighter';
    for (const l of p.lines) {
      ctx.strokeStyle = `rgb(0,0,${Math.round(l.amp * 255)})`; ctx.lineWidth = l.w;
      trace(ctx, l.d, false); ctx.stroke();
    }
  }
  ctx.globalCompositeOperation = 'source-over';
}

/**
 * Which part owns each texel, per layer, grown by the part's reach so a part that moves still finds itself
 * and a solid has room for the wall around its drawing.
 * Returns interleaved (index, material) bytes per layer, plus the bare index maps used for picking.
 */
export function identMaps(doc, parts, w, h, layers, groundMat) {
  const scratch = doc.createElement('canvas'); scratch.width = w; scratch.height = h;
  const ctx = scratch.getContext('2d', {willReadFrequently: true});
  const packed = Array.from({length: layers}, (_, i) => { const a = new Uint8Array(w * h * 2); if (i === 0) for (let k = 1; k < a.length; k += 2) a[k] = groundMat; return a; });
  const maps = Array.from({length: layers}, () => new Uint8Array(w * h));
  if (!ctx) return {packed, maps};
  const sx = w / (PLATE.halfW * 2), sz = h / (PLATE.halfH * 2);
  ctx.fillStyle = ctx.strokeStyle = '#fff'; ctx.lineCap = ctx.lineJoin = 'round';
  // Two passes: first every part with its margin, then every part's drawing alone, so a margin never eats into
  // a neighbour's own shape however wide it is.
  for (const exact of [false, true]) for (const p of parts) {
    const reach = exact ? 0 : p.reach;
    if (exact && !p.reach) continue;
    const pad = reach + 2;
    const x0 = Math.max(0, Math.floor((p.bounds[0] - pad + PLATE.halfW) * sx)), z0 = Math.max(0, Math.floor((p.bounds[1] - pad + PLATE.halfH) * sz));
    const x1 = Math.min(w, Math.ceil((p.bounds[2] + pad + PLATE.halfW) * sx)), z1 = Math.min(h, Math.ceil((p.bounds[3] + pad + PLATE.halfH) * sz));
    if (x1 <= x0 || z1 <= z0) continue;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(x0, z0, x1 - x0, z1 - z0); toUnits(ctx, w, h);
    for (const f of p.fills) { trace(ctx, f.d, true); ctx.fill(); if (reach > 0) { ctx.lineWidth = reach * 2; ctx.stroke(); } }
    for (const l of p.lines) { ctx.lineWidth = l.w + reach * 2; trace(ctx, l.d, false); ctx.stroke(); }
    const data = ctx.getImageData(x0, z0, x1 - x0, z1 - z0).data, map = maps[p.layer], pack = packed[p.layer];
    for (let z = z0; z < z1; z++) for (let x = x0; x < x1; x++) {
      if (data[((z - z0) * (x1 - x0) + (x - x0)) * 4 + 3] < 128) continue;
      const i = z * w + x; map[i] = p.index; pack[i * 2] = p.index; pack[i * 2 + 1] = p.mat;
    }
  }
  return {packed, maps};
}

/**
 * How strongly each kind of part gathers dense nashiji around it (the Hatsune lids are thick near the mist, banks,
 * rocks, buildings and water's edge, and thin in the open). Birds ride a pine and add nothing of their own.
 */
const DENSITY_WEIGHT = {[KIND.still]: .3, [KIND.tier]: 1, [KIND.pine]: .6, [KIND.rock]: 1, [KIND.hill]: .9, [KIND.water]: .8, [KIND.mist]: 1, [KIND.bird]: 0};

/**
 * One-channel density field of the powder (0..1): 1 on a part, falling away to 0 at `falloff` plate units from the
 * heaviest one, then softened, so the ground goes from dense to sparse without an edge (maki-bokashi).
 * Rasterised at w × h (small: it only needs to be smooth). Returns a Uint8Array of w × h.
 */
export function bakeDensityField(doc, parts, w, h, falloff) {
  const scratch = doc.createElement('canvas'); scratch.width = w; scratch.height = h;
  const ctx = scratch.getContext('2d', {willReadFrequently: true});
  if (!ctx) return new Uint8Array(w * h);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
  toUnits(ctx, w, h);
  ctx.lineCap = ctx.lineJoin = 'round';
  ctx.globalCompositeOperation = 'lighten'; // the strongest part wins where footprints overlap
  for (const p of parts) {
    const weight = DENSITY_WEIGHT[p.kind] ?? .3;
    if (weight <= 0) continue;
    const g = Math.round(weight * 255), grey = `rgb(${g},${g},${g})`;
    ctx.fillStyle = ctx.strokeStyle = grey;
    if (!p.fills.length && !p.lines.length) {
      // A tree is limbs and stamps, not polygons: its bounds stand in for it.
      const [x0, z0, x1, z1] = p.bounds;
      ctx.beginPath(); ctx.ellipse((x0 + x1) / 2, (z0 + z1) / 2, Math.max((x1 - x0) / 2, 1), Math.max((z1 - z0) / 2, 1), 0, 0, 6.2832); ctx.fill();
      continue;
    }
    for (const f of p.fills) { trace(ctx, f.d, true); ctx.fill(); }
    for (const l of p.lines) { ctx.lineWidth = l.w + (p.reach ?? 0) * 2; trace(ctx, l.d, false); ctx.stroke(); }
  }
  const rgba = ctx.getImageData(0, 0, w, h).data, mask = new Float32Array(w * h);
  for (let i = 0; i < mask.length; i++) mask[i] = rgba[i * 4] / 255;
  return densityFromMask(mask, w, h, falloff);
}

/**
 * Where raised things meet the lid (0..1): 1 along the foot, falling in a straight line to 0 at `falloff` plate units.
 * A part that stands up touches the lid only along its foot line, as wide as whatever of it reaches down there; a
 * mound (a rock) touches it all round its outline. Flat inlays, in-ground banks, water, mist and birds touch nothing:
 * the shader finds the banks' own edges in the relief. Dirt and the dark line of bare lacquer gather here with age.
 */
export function bakeContactField(doc, parts, w, h, falloff) {
  const scratch = doc.createElement('canvas'); scratch.width = w; scratch.height = h;
  const ctx = scratch.getContext('2d', {willReadFrequently: true});
  if (!ctx) return new Uint8Array(w * h);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
  toUnits(ctx, w, h);
  ctx.fillStyle = ctx.strokeStyle = '#fff'; ctx.lineCap = 'round'; ctx.lineWidth = 1.6;
  for (const p of parts) {
    if (p.hinge > 0 && p.kind !== KIND.bird && !p.attach) {
      // The span of everything that comes within two units of the foot line.
      let x0 = Infinity, x1 = -Infinity;
      for (const f of p.fills) for (const [x, z] of f.d) if (z > p.foot - 2) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
      if (x0 > x1) continue;
      ctx.beginPath(); ctx.moveTo(x0, p.foot); ctx.lineTo(x1, p.foot); ctx.stroke();
    } else if (p.kind === KIND.rock) {
      for (const f of p.fills) { trace(ctx, f.d, true); ctx.fill(); }
    }
  }
  const rgba = ctx.getImageData(0, 0, w, h).data, mask = new Float32Array(w * h);
  for (let i = 0; i < mask.length; i++) mask[i] = rgba[i * 4] / 255;
  return densityFromMask(mask, w, h, falloff, false);
}

/** The canvas-free half of bakeDensityField: spreads weights (0..1 per texel) into the 0..255 field. Pure, so node can test it. */
export function densityFromMask(mask, w, h, falloff, soften = true) {
  const out = new Uint8Array(w * h), v = Float32Array.from(mask);
  // Grey-scale dilation with a linear fall per unit of distance: two chamfer sweeps (8 neighbours).
  const unit = PLATE.halfW * 2 / w, side = unit / falloff, diag = side * 1.4142;
  const relax = (i, j, cost) => { const c = v[j] - cost; if (c > v[i]) v[i] = c; };
  for (let z = 0; z < h; z++) for (let x = 0; x < w; x++) {
    const i = z * w + x;
    if (x > 0) relax(i, i - 1, side);
    if (z > 0) { relax(i, i - w, side); if (x > 0) relax(i, i - w - 1, diag); if (x < w - 1) relax(i, i - w + 1, diag); }
  }
  for (let z = h - 1; z >= 0; z--) for (let x = w - 1; x >= 0; x--) {
    const i = z * w + x;
    if (x < w - 1) relax(i, i + 1, side);
    if (z < h - 1) { relax(i, i + w, side); if (x < w - 1) relax(i, i + w + 1, diag); if (x > 0) relax(i, i + w - 1, diag); }
  }
  if (!soften) { for (let i = 0; i < v.length; i++) out[i] = Math.round(Math.min(1, Math.max(0, v[i])) * 255); return out; }
  for (let i = 0; i < v.length; i++) { const t = Math.min(1, Math.max(0, v[i])); v[i] = t * t * (3 - 2 * t); }
  // Three box passes per axis stand in for a gaussian, so the cone's tip and foot lose their creases.
  const tmp = new Float32Array(w * h), R = 3;
  const blur = (src, dst, n, stride, lines, lineStride) => {
    for (let l = 0; l < lines; l++) {
      let acc = 0; const base = l * lineStride;
      for (let k = -R; k <= R; k++) acc += src[base + Math.min(n - 1, Math.max(0, k)) * stride];
      for (let k = 0; k < n; k++) {
        dst[base + k * stride] = acc / (2 * R + 1);
        acc += src[base + Math.min(n - 1, k + R + 1) * stride] - src[base + Math.max(0, k - R) * stride];
      }
    }
  };
  for (let pass = 0; pass < 3; pass++) { blur(v, tmp, w, 1, h, w); blur(tmp, v, h, w, w, 1); }
  for (let i = 0; i < v.length; i++) out[i] = Math.round(Math.min(1, Math.max(0, v[i])) * 255);
  return out;
}
