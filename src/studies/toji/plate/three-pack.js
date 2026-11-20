// Pure data for the three.js plate renderer (three-renderer.js): material table, box and mesh packing, motion state
// packing and the GLSL that moves a part. Nothing here imports three, so node:test can check it.
import {MAT, KIND} from './vocab.js';
import {MAT_LOOK, lookOf, COAT_KIND, TONE, TIER, RECIPE, meshLook} from './mat.js';
import {MAX_PARTS} from './parts.js';
import {packMeshes} from './mesh-geometry.js';
import {limbMesh, stampInstances} from './limbs.js';
import {shiftChunks, feetCentre} from './creature-mesh.js';

/** MAT → a raised part's MeshPhysicalMaterial parameters and shader columns: the `mesh` column of MAT_LOOK (mat.js). */
export const MATERIALS = Object.freeze(Object.fromEntries(Object.entries(MAT_LOOK).filter(([, row]) => row.mesh).map(([id, row]) => [id, row.mesh])));

/**
 * A material as it looks at `age` (0 as new, 1 as the Hatsune trousseau today): the numbers and the colour move toward
 * the entry's `aged` values. Raised gold goes paler, flatter and less saturated than the ground it stands on.
 */
export function agedSpec(spec, age) {
  if (!spec.aged || !(age > 0)) return spec;
  const out = {...spec};
  for (const [k, v] of Object.entries(spec.aged)) {
    if (typeof v === 'number') out[k] = spec[k] + (v - spec[k]) * age;
    else {
      const a = parseInt(spec[k].slice(1), 16), b = parseInt(v.slice(1), 16);
      const ch = s => Math.round((a >> s & 255) + ((b >> s & 255) - (a >> s & 255)) * age);
      out[k] = '#' + (ch(16) << 16 | ch(8) << 8 | ch(0)).toString(16).padStart(6, '0');
    }
  }
  return out;
}

/** The box has its own small material ids (see buildBox in box.js). 25 is the shadow underlay and is not drawn here. */
/**
 * The inside of the box and its tray (box ids 22, 28): plain nashiji, as the insides of the Hatsune boxes are: amber lacquer over an even
 * scatter of gold flake, no picture. three.js has already lit the face (the lamp's glow, the shade under the rolls); that light is kept
 * as the light on the flake, so the inside is not a flat brown.
 */
export const BOX_INNER_FRAG_GLSL = `
{
  mWake=0.;mSh=1.;mSetLight(normalize(vKyotoSideN),vKyotoSideW);
  vec3 nn=abs(normalize(vKyotoSideN)),w=vKyotoSideW;
  vec2 sp=nn.y>.6?w.xz:(nn.x>nn.z?w.zy:w.xy);
  float lit=dot(outgoingLight,vec3(.3,.55,.15));
  vec3 nj=mNashiji(sp,1.05,M_GOLD)*vec3(1.,.86,.62);
  outgoingLight=mix(outgoingLight*.55,nj*(.5+2.3*lit),.8);
}`;
/**
 * The paper in the box (box id 23: the sheets in the tray, the rolls): decorated writing paper (ryoshi), as a box of this rank holds. On
 * the faces that look up: small squares of cut gold leaf (kirihaku) and a dust of gold (sunago), gathered in a drifting cloud band, over a
 * faint dye under the cloud. three.js's own lighting is kept as the light on it.
 */
export const BOX_PAPER_FRAG_GLSL = `
{
  vec3 nn=abs(normalize(vKyotoSideN));
  if(nn.y>.55){
    vec2 sp=vKyotoSideW.xz;
    float cloud=smoothstep(.42,.68,mVnoise(sp*.017+3.)*.7+mVnoise(sp*.06)*.3);
    vec2 g=floor(sp/7.),f=fract(sp/7.)-.5,o=(mHash2(g)-.5)*.4;float h=mHash(g+7.);
    float sq=step(max(abs(f.x-o.x),abs(f.y-o.y)),.2+.14*h)*step(.8-.55*cloud,h);
    float dust=step(.9-.34*cloud,mHash(floor(sp/1.5)+3.));
    float lit=dot(outgoingLight,vec3(.3,.55,.15));
    outgoingLight*=mix(vec3(1.),vec3(.90,.80,.62),cloud*.8);
    outgoingLight=mix(outgoingLight,vec3(.80,.50,.13)*(.5+.7*lit),max(sq,dust*.8));
  }
}`;
/**
 * The lid's age (uAge, 0..1) from its age in years. Lacquer clears fastest in its first decades and ever more slowly after: an
 * exponential approach with a time constant of AGE_TAU_YEARS. The fixed point is the Hatsune trousseau, made in 1639: at its age
 * (HATSUNE_YEARS in 2026) the curve gives about .92, the look the shader's age 1 constants were set against. 0 years is a lid fresh
 * from the workshop: a deep brown film over the gold.
 */
export const AGE_TAU_YEARS = 150, HATSUNE_YEARS = 2026 - 1639;
export const ageFromYears = years => 1 - Math.exp(-Math.max(0, Number(years) || 0) / AGE_TAU_YEARS);
export const BOX_MATERIALS = {
  // Hatsune: the whole body is nashiji (amber lacquer over gold powder), not black lacquer (user decision, handoff §3).
  20: meshLook({name: 'side', color: '#a8722e', metalness: .72, roughness: .45, clearcoat: 1, clearcoatRoughness: .06, flake: 0, nashijiSide: true}),
  // The lid's lip: gold, as on the Hatsune boxes (museum photos show no silver rim).
  21: meshLook({name: 'rim', aged: {color: '#ad9668', roughness: .46}, color: '#c39345', metalness: 1, roughness: .3, clearcoat: .2, clearcoatRoughness: .1, flake: .2}),
  22: meshLook({name: 'inner', coat: 'sunk', color: '#8c6a2d', metalness: .8, roughness: .5, clearcoat: .5, clearcoatRoughness: .1, flake: .5, nashijiInner: true}),
  23: meshLook({name: 'paper', coat: 'none', shine: false, color: '#cdbd98', metalness: 0, roughness: .9, clearcoat: 0, clearcoatRoughness: 0, flake: 0, paperFleck: true}),
  24: meshLook({name: 'gold', aged: {color: '#c2aa76', roughness: .46}, color: '#d7a64a', metalness: 1, roughness: .3, clearcoat: .2, clearcoatRoughness: .1, flake: .3}),
  26: meshLook({name: 'edge', aged: {color: '#b39c6c', roughness: .46}, color: '#c99a42', metalness: 1, roughness: .3, clearcoat: .2, clearcoatRoughness: .1, flake: .3}),
  27: meshLook({name: 'cord', shine: false, color: '#85100a', metalness: 0, roughness: .6, clearcoat: 0, clearcoatRoughness: 0, flake: 0}),
  28: meshLook({name: 'tray', coat: 'sunk', color: '#b4843a', metalness: .8, roughness: .5, clearcoat: .5, clearcoatRoughness: .1, flake: .5, nashijiInner: true}),
};

/** The lid's own ground (box ids 0): the picture is painted on it. */
export const GROUND_LID = meshLook({name: 'lid', color: '#ffffff', metalness: .3, roughness: .4, clearcoat: 1, clearcoatRoughness: .06, flake: 0});

/** Texels per row of the motion texture; row 0 holds `a` (sway, stand, rise, glow), row 1 holds `b` (dx, dz, lift, group). */
export const STATE_WIDTH = MAX_PARTS, STATE_HEIGHT = 2;

/** Writes createLife's two Float32Arrays into one RGBA float texture's data, row 0 then row 1. */
export function packLifeState(a, b, out = new Float32Array(STATE_WIDTH * STATE_HEIGHT * 4)) {
  const row = STATE_WIDTH * 4;
  if (a.length < row || b.length < row) throw new Error('packLifeState: state arrays are shorter than MAX_PARTS * 4');
  out.set(a.subarray(0, row), 0); out.set(b.subarray(0, row), row);
  return out;
}

/**
 * A part's mesh where it stands. A bird is built where its perch was drawn, and preparePlate slides it to its carrier's
 * twig (moving its fills and lines); its mesh slides by the same amount, measured on the two feet.
 */
export function placedMesh(p) {
  if (!p.mesh || !p.feet0 || !p.treeRider) return p.mesh;
  const [cx, cz] = feetCentre(p.lines);
  return shiftChunks(p.mesh, cx - p.feet0[0], cz - p.feet0[1], true);
}

/**
 * Gold leaf on a long member shows the wood under it. A MAT.gold chunk at least 1.6 times longer than it is wide, in plan,
 * gets uv = (1000 + across, along) so the shader can run a grain down its length; any other chunk keeps its uv (and gets no grain).
 */
export function grainUv(chunk) {
  if (chunk.mat !== MAT.gold) return chunk;
  const v = chunk.vertices;
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (let i = 0; i < v.length; i += 8) { x0 = Math.min(x0, v[i]); x1 = Math.max(x1, v[i]); z0 = Math.min(z0, v[i + 2]); z1 = Math.max(z1, v[i + 2]); }
  const dx = x1 - x0, dz = z1 - z0, long = Math.max(dx, dz), short = Math.min(dx, dz);
  if (long < 6 || long < 1.6 * short) return chunk;
  const out = v.slice(), alongX = dx > dz;
  for (let i = 0; i < v.length; i += 8) { out[i + 6] = 1000 + (alongX ? v[i + 2] : v[i]); out[i + 7] = alongX ? v[i] : v[i + 2]; }
  return {...chunk, vertices: out};
}

/**
 * Part meshes grouped by material id: Map(mat → Float32Array of 16 floats per vertex, the packMeshes layout).
 * Bird vertices carry style.z = 1 and their perch point in uv; the hinge shrinks a bird to that point while it sleeps.
 */
export function meshesByMaterial(parts) {
  const placed = parts.map(p => (p.mesh ? {...p, mesh: placedMesh(p).map(grainUv)} : p));
  const mats = new Set();
  for (const p of placed) for (const chunk of p.mesh ?? []) mats.add(chunk.mat);
  const out = new Map();
  for (const mat of [...mats].sort((x, y) => x - y)) {
    const only = placed.filter(p => p.mesh?.some(c => c.mat === mat)).map(p => ({...p, mesh: p.mesh.filter(c => c.mat === mat)}));
    const packed = packMeshes(only);
    let at = 0;
    for (const p of only) {
      const n = p.mesh.reduce((sum, c) => sum + c.vertices.length / 8, 0);
      if (p.kind === KIND.bird) for (let v = 0; v < n; v++) packed[(at + v) * 16 + 14] = 1;
      at += n;
    }
    out.set(mat, packed);
  }
  return out;
}

/** Tree limbs grouped by material id: Map(mat → Float32Array of 16 floats per vertex, the limbMesh layout). */
export function limbsByMaterial(parts) {
  const mats = new Set();
  for (const p of parts) for (const limb of p.limbs ?? []) mats.add(limb.mat ?? p.mat);
  const out = new Map();
  for (const mat of [...mats].sort((x, y) => x - y)) {
    const only = parts.filter(p => p.limbs?.some(l => (l.mat ?? p.mat) === mat))
      .map(p => ({...p, limbs: p.limbs.filter(l => (l.mat ?? p.mat) === mat)}));
    out.set(mat, limbMesh(only));
  }
  return out;
}

/**
 * Tree stamps grouped by material id for InstancedMesh:
 * Map(mat → {placement, stamp, owner, style, count}) where each typed array holds 4 floats per stamp.
 */
export function stampsByMaterial(parts) {
  const mats = new Set();
  for (const p of parts) for (const s of p.stamps ?? []) mats.add(s.mat);
  const out = new Map();
  for (const mat of [...mats].sort((x, y) => x - y)) {
    const only = parts.filter(p => p.stamps?.some(s => s.mat === mat))
      .map(p => ({...p, stamps: p.stamps.filter(s => s.mat === mat)}));
    const packed = stampInstances(only);
    const count = packed.length / 16;
    const placement = new Float32Array(count * 4), stamp = new Float32Array(count * 4);
    const owner = new Float32Array(count * 4), style = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      const b = i * 16, o = i * 4;
      placement.set(packed.subarray(b, b + 4), o);
      stamp.set(packed.subarray(b + 4, b + 8), o);
      owner.set(packed.subarray(b + 8, b + 12), o);
      style.set(packed.subarray(b + 12, b + 16), o);
    }
    out.set(mat, {placement, stamp, owner, style, count});
  }
  return out;
}

const BOX_STRIDE = 10;
/** Splits buildBox's vertices [from, to) by box material id: Map(id → {position, normal, uv, part}) of Float32Arrays. */
export function sliceBox(data, from, to) {
  const lists = new Map();
  for (let v = from; v < to; v++) {
    const i = v * BOX_STRIDE, mat = data[i + 8];
    if (!lists.has(mat)) lists.set(mat, {position: [], normal: [], uv: [], part: []});
    const l = lists.get(mat);
    l.position.push(data[i], data[i + 1], data[i + 2]); l.normal.push(data[i + 3], data[i + 4], data[i + 5]);
    l.uv.push(data[i + 6], data[i + 7]); l.part.push(data[i + 9]);
  }
  return new Map([...lists].map(([mat, l]) => [mat, {position: new Float32Array(l.position), normal: new Float32Array(l.normal), uv: new Float32Array(l.uv), part: new Float32Array(l.part)}]));
}

/** The lid's ground has no height field yet (T1): the dome only, same formula as buildBox. */
export const DOME_GLSL = `float groundY(vec2 p){ return 3.2*(1.-(p.x/370.)*(p.x/370.))*(1.-(p.y/240.)*(p.y/240.)); }`;

/** Layer 0 height field: the shallow dome plus the blurred soft swell modulated by each bank's rise state. */
export const GROUND_GLSL = `
uniform sampler2D uSoft0, uIdent0;
const vec2 K_HALF=vec2(360.,230.);
const float K_SWELL=17.;
float groundY(vec2 p){
  vec2 c=clamp(p,-K_HALF,K_HALF),uv=(c+K_HALF)/(2.*K_HALF);
  ivec2 sz=textureSize(uIdent0,0);
  int id=int(texelFetch(uIdent0,clamp(ivec2(uv*vec2(sz)),ivec2(0),sz-1),0).r*255.+.5);
  float rise=texelFetch(uState,ivec2(id,0),0).z;
  float dome=3.2*(1.-(p.x/370.)*(p.x/370.))*(1.-(p.y/240.)*(p.y/240.));
  vec2 e=1.-smoothstep(K_HALF-44.,K_HALF-6.,abs(c));
  return dome+textureLod(uSoft0,uv,0.).r*K_SWELL*mix(.3,1.,rise)*e.x*e.y;
}`;

/**
 * Downsamples the red channel of layer 0 (4×4 box, matching mip 2 of the legacy GPU blur) and runs a
 * 15-tap separable Gaussian blur (`exp(-i*i/14)`), producing the soft swell height field in 0..1.
 */
export function bakeSoftLayer(rgba, w, h) {
  const sw = Math.round(w / 4), sh = Math.round(h / 4);
  const src = new Float32Array(sw * sh), tmp = new Float32Array(sw * sh), dst = new Float32Array(sw * sh);
  for (let sy = 0; sy < sh; sy++) {
    const y0 = Math.floor(sy * h / sh), y1 = Math.min(h, Math.floor((sy + 1) * h / sh));
    for (let sx = 0; sx < sw; sx++) {
      const x0 = Math.floor(sx * w / sw), x1 = Math.min(w, Math.floor((sx + 1) * w / sw));
      let sum = 0, count = 0;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { sum += rgba[(y * w + x) * 4]; count++; }
      src[sy * sw + sx] = count ? sum / (count * 255) : 0;
    }
  }
  const weights = new Float32Array(15);
  let norm = 0;
  for (let i = -7; i <= 7; i++) { const wt = Math.exp(-(i * i) / 14); weights[i + 7] = wt; norm += wt; }
  for (let i = 0; i < 15; i++) weights[i] /= norm;
  for (let y = 0; y < sh; y++) {
    const row = y * sw;
    for (let x = 0; x < sw; x++) {
      let sum = 0;
      for (let i = -7; i <= 7; i++) sum += weights[i + 7] * src[row + Math.max(0, Math.min(sw - 1, x + i))];
      tmp[row + x] = sum;
    }
  }
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      let sum = 0;
      for (let i = -7; i <= 7; i++) sum += weights[i + 7] * tmp[Math.max(0, Math.min(sh - 1, y + i)) * sw + x];
      dst[y * sw + x] = sum;
    }
  }
  return {data: dst, sw, sh};
}

/**
 * Builds subdivided quads for every KIND.mist band so floating mist tracks the hills beneath it cleanly.
 * Returns {position: Float32Array, owner: Float32Array, count: number}.
 */
export function mistGeometryData(mistParts, nx = 24, nz = 6) {
  const pos = [], owner = [], pad = 3;
  for (const p of mistParts) {
    const x0 = p.bounds[0] - pad, z0 = p.bounds[1] - pad, x1 = p.bounds[2] + pad, z1 = p.bounds[3] + pad;
    const dx = (x1 - x0) / nx, dz = (z1 - z0) / nz;
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const xa = x0 + i * dx, xb = xa + dx, za = z0 + j * dz, zb = za + dz;
      for (const [x, z] of [[xa, za], [xb, za], [xb, zb], [xa, za], [xb, zb], [xa, zb]]) {
        pos.push(x, 0, z);
        owner.push(p.index, p.foot, p.anchor[0], p.anchor[1]);
      }
    }
  }
  return {position: new Float32Array(pos), owner: new Float32Array(owner), count: pos.length / 3};
}

/**
 * The part hinge, written as a function so MeshPhysicalMaterial and MeshDepthMaterial run the same code:
 * stand up about the foot line, sway about the anchor, travel, lift, open with the lid, tilt with the hand.
 * Per-part state comes from uState (row 0 = a, row 1 = b, one texel per part index).
 */
export const PART_MOTION_GLSL = `
uniform sampler2D uState; uniform mat3 uTilt; uniform float uOpening;
attribute vec4 aOwner; attribute vec4 aStyle;
varying float vGlow; varying float vLift;
${GROUND_GLSL}
void kyotoMotion(vec3 aPos, vec3 aNormal, out vec3 outPos, out vec3 outNormal){
  int id=int(aOwner.x+.5); vec4 A=texelFetch(uState,ivec2(id,0),0), B=texelFetch(uState,ivec2(id,1),0);
  // A bird (style.z) is at one perch at a time: elsewhere it sinks into the lacquer, shrinking to its perch point (uv).
  if(aStyle.z>.5){ float k=smoothstep(.04,.22,A.z); aPos=vec3(uv.x+(aPos.x-uv.x)*k, aPos.y*k, uv.y+(aPos.z-uv.y)*k); }
  float foot=aOwner.y; vec2 anchor=aOwner.zw;
  float theta=A.y*aStyle.x, ct=cos(theta), st=sin(theta), cs=cos(A.x), sn=sin(A.x);
  vec2 r=aPos.xz-anchor, q=anchor+vec2(cs*r.x-sn*r.y,sn*r.x+cs*r.y)+B.xy;
  float upF=aStyle.x>0.?smoothstep(.1,.7,A.y):0.;
  float gy=mix(groundY(q),groundY(vec2(q.x,foot)),upF);
  float eps=1.5;
  float gyX0=mix(groundY(q-vec2(eps,0.)),groundY(vec2(q.x-eps,foot)),upF);
  float gyX1=mix(groundY(q+vec2(eps,0.)),groundY(vec2(q.x+eps,foot)),upF);
  float dgyX=(gyX1-gyX0)/(2.*eps);
  float dgyZ=(1.-upF)*(groundY(q+vec2(0.,eps))-groundY(q-vec2(0.,eps)))/(2.*eps);
  vec3 up=vec3(0.,ct,st), down=vec3(0.,-st,ct), right=vec3(1.,0.,0.);
  vec3 tx=right*cs+down*sn, tz=-right*sn+down*cs;
  vec3 jx=tx+vec3(0.,dgyX*cs+dgyZ*sn,0.), jy=up, jz=tz+vec3(0.,-dgyX*sn+dgyZ*cs,0.);
  vec3 nLocal=cross(jy,jz)*aNormal.x+cross(jz,jx)*aNormal.y+cross(jx,jy)*aNormal.z;
  float height=aPos.y+aStyle.w;
  vec3 p=vec3(q.x,gy+B.z+.35,foot)+down*(q.y-foot)+up*height;
  p.y+=uOpening*360.; p.z-=uOpening*650.;
  vec3 centre=vec3(0.,-48.,0.); p=uTilt*(p-centre)+centre;
  outPos=p; outNormal=uTilt*normalize(nLocal);
  vGlow=A.w; vLift=height;
}`;

export const PART_LIGHT_GLSL = `
// Live-view stand-ins for what the path-traced reference shows (docs/agent-runs/2026-11-14-threert-reference.md):
// L1 the pieces darken where they meet the ground; L2 faces turned down catch the gold ground's bounce.
const float K_CONTACT_MIN=.45, K_CONTACT_H=10., K_BOUNCE=.8;
// With age the ground is darker, so it throws less light back up at the pieces. The foot is no darker than before:
// a low piece (a fox, a lantern) is all foot, and went black when it was.
const float K_AGE_CONTACT_MIN=.45, K_AGE_BOUNCE=.75;
const vec3 K_BOUNCE_C=vec3(1.,.72,.36);
const float K_WIN=.55; // soft window reflection intensity on upward-facing metallic parts
const float K_WIN_SOFT=.35; // soft window reflection angular width (larger is wider)
// Shin-nuri black lacquer as a dark mirror: overall strength, the floor at head-on angles, how much gold ground and
// room it shows, and the window's sharpness and strength in it.
const float K_LACQ_MIRROR=.3, K_LACQ_MIN=.35, K_LACQ_GROUND=.9, K_LACQ_WIN=.8, K_LACQ_WIN_EXP=40.;
const vec3 K_LACQ_ROOM=vec3(.05,.045,.04);
uniform mat3 uTilt; uniform float uNight, uAge; uniform vec3 uView, uKey;
varying float vLift;`;

/**
 * Gold powder on the roof faces (MAT.roofPowder) and gold leaf on long members (MAT.gold with grainUv). Both work on the
 * geometry's rest position, so the grains stay on the roof as it sways, and both fade out where a grain is smaller than a pixel.
 * Powder: every grain is a tiny facet at its own tilt; the density of powder varies slowly over the face; toward the eave
 * the face receives less light. Leaf: the foil follows the wood under it, so a grain runs down the member and bumps the normal.
 */
export const PART_POWDER_GLSL = `
varying vec2 vKyotoUv; varying vec3 vKyotoRest;
const float K_POW_FREQ=1.7; // powder cells per plate unit
const float K_POW_TILT=1.1; // how far one grain's facet leans
const float K_POW_UNEVEN=.11; // how unevenly the powder lies over the face (share of its brightness)
const float K_POW_EAVE=.4; // share of the light the face loses at the eave
const float K_POW_LOBE=.1, K_POW_LOBE_EXP=6.; // the broad soft sheen of the powder
const float K_LEAF_FREQ=.55, K_LEAF_BUMP=.5, K_LEAF_TONE=.3; // wood grain lines per plate unit across a member, how far they raise the foil, how much they change its brightness
vec3 kyotoHash3(vec3 p){ p=fract(p*vec3(.1031,.103,.0973)); p+=dot(p,p.yxz+33.33); return fract((p.xxy+p.yxx)*p.zyx); }
float kyotoHash2(vec2 p){ vec3 q=fract(vec3(p.xyx)*.1031); q+=dot(q,q.yzx+33.33); return fract((q.x+q.y)*q.z); }
float kyotoVnoise(vec2 p){
  vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(kyotoHash2(i),kyotoHash2(i+vec2(1.,0.)),f.x),mix(kyotoHash2(i+vec2(0.,1.)),kyotoHash2(i+vec2(1.,1.)),f.x),f.y);
}
float kyotoPowderFine(){ return 1.-smoothstep(.5,1.4,length(fwidth(vKyotoRest))*K_POW_FREQ); }
float kyotoPowderDensity(){ return kyotoVnoise(vKyotoRest.xz*.11+vKyotoRest.y*.07)*.6+kyotoVnoise(vKyotoRest.xz*.37-vKyotoRest.y*.2)*.4; }
float kyotoLeafOn(){ return step(500.,vKyotoUv.x); }
float kyotoLeafFine(){ return kyotoLeafOn()*(1.-smoothstep(.5,1.4,length(fwidth(vKyotoUv))*K_LEAF_FREQ)); }
// Wood under the foil: lines run along the member (uv.y), wander slowly, and come in two widths.
float kyotoWood(){
  float across=vKyotoUv.x-1000., along=vKyotoUv.y;
  float wander=kyotoVnoise(vec2(along*.045,across*.31))*3.;
  return kyotoVnoise(vec2(across*K_LEAF_FREQ+wander,along*.018))*.6+kyotoVnoise(vec2(across*K_LEAF_FREQ*2.7+wander,along*.04))*.4;
}`;

/** Shared diamond-halftone kirikane & gold/oxidized-silver helpers for tree trunks and rock bodies. */
export const PART_KIRIKANE_GLSL = `
const vec3 K_M_OXID=vec3(.66,.66,.64); // oxidized silver-grey on shaded faces (matches M_OXID)
const vec3 K_KIRI_GOLD=vec3(.92,.62,.14); // bright cut-gold foil color for halftone kirikane pieces
const vec3 K_KIRI_GOLD_AGED=vec3(.80,.66,.40); // the same foil gone pale and flat with age
vec3 kyotoKiriGold(){return mix(K_KIRI_GOLD,K_KIRI_GOLD_AGED,uAge);}
// Silver sulphides with age: K_TARNISH is what is left of it at age 1 (a warm dark grey). k is how exposed the place
// is to it: 1 in the hollows and the shade, less on ridges and foil that handling keeps rubbed bright.
const vec3 K_TARNISH=vec3(.46,.42,.36);
const vec3 K_ROCK_FOOT=vec3(.43,.29,.14); // the aged ground's tone, which a rock keeps at its foot
const float K_ROCK_FOOT_H=9., K_ROCK_FOOT_AMT=.6; // how high the ground's tone climbs the rock, and how fully it takes it
vec3 kyotoAgedSilver(vec3 c,float k){return c*mix(vec3(1.),K_TARNISH,clamp(uAge*k,0.,1.));}
const vec3 K_ROCK_BODY_GOLD=vec3(.45,.29,.09); // dark bronze ground between the gold foil on the lit face of a rock
const vec3 K_ROCK_BODY_SHADE=vec3(.27,.27,.26); // the ground where the rock turns away from the light: oxidized silver, dark
const vec3 K_ROCK_BODY_SILVER=vec3(.50,.51,.50); // the ground of a silver rock, lit
const vec3 K_ROCK_FOIL_SILVER=vec3(.90,.91,.88); // kirigin foil on the lit face
const vec3 K_ROCK_FOIL_OXID=vec3(.60,.60,.57); // foil where it turns from the light: oxidized silver
const float K_TRUNK_OXID_SCALE=.76; // oxidized silver brightness on shaded gold trunks relative to K_M_OXID
const float K_TRUNK_OXID_STRENGTH=.4; // blend weight toward oxidized silver on shaded gold trunk faces
const vec3 K_TRUNK_SILVER_SHADE=vec3(.34,.34,.33); // a trunk's shaded side: oxidized silver
const vec3 K_TRUNK_SILVER_LIT=vec3(.74,.75,.73); // a trunk's lit side: silver, a little greyer than the foil on it
const float K_TRUNK_BARK_MASK=.55; // suppress kirikane pieces inside deep bark seams so grain stays readable
const float K_ROCK_LIT_LO=-.35; // rock N.L threshold where shaded M_OXID begins transitioning to gold
const float K_ROCK_LIT_HI=.30; // rock N.L threshold where lit gold reaches full strength
const float K_TRUNK_LIT_LO=-.30; // trunk N.L threshold where shaded M_OXID begins transitioning to gold
const float K_TRUNK_LIT_HI=.55; // trunk N.L threshold where lit gold and dense kirikane reach full strength
const float K_TRUNK_KIRI_CELL=2.8; // trunk kirikane diagonal lattice spacing in plate units
const float K_ROCK_KIRI_CELL=3.0; // rock kirikane diagonal lattice spacing in plate units
const float K_ROCK_SZ_MIN=.08, K_ROCK_SZ_MAX=.37; // half-width of a rock foil diamond in cell units: smallest in the dark, largest in the light
const float K_ROCK_DENS_MIN=.22; // share of cells that carry foil where the rock is darkest (1 where it is lit)
const float K_ROCK_KIRI_JITTER=.24; // rock foil position jitter in cell units
const float K_ROCK_AMT_LO=-.1, K_ROCK_AMT_HI=.62; // N.L range over which foil grows from small and sparse to large and dense
const float K_ROCK_LOW_AMT=.62; // foil amount at the foot of the rock, relative to its shoulders
const float K_ROCK_RIM_AMT=.30; // foil amount added along the outline, where the surface turns edge-on
const float K_ROCK_RIM_EXP=2.; // how tightly that outline boost hugs the edge
const float K_KIRI_SZ=.26; // base half-width of a kirikane square in cell units (<= 3 px at 1440px)
const float K_KIRI_JITTER=.18; // per-cell position jitter in cell units (keeps squares inside cell bounds)
const float K_KIRI_DENS_BASE=.12; // minimum cell occupancy fraction at low litness
const float K_KIRI_DENS_GAIN=1.15; // litness multiplier controlling cell occupancy ramp
const float K_KIRI_AA=.55; // anti-aliasing filter width in pixels for kirikane edges
const float K_TRUNK_KIRI_COVER=.88; // color blend strength of kirikane foil over trunk bark
const float K_ROCK_KIRI_COVER=.96; // color blend strength of kirikane foil over rock body
const float K_OXID_ROUGH=.56; // slightly matte roughness on oxidized silver shaded faces
const float K_KIRI_ROUGH=.36; // daytime metallic roughness on cut-gold kirikane pieces
const float K_KIRI_ROUGH_NIGHT=.46; // calmer nighttime roughness on kirikane pieces to prevent glare
const float K_KIRI_TILT=.45; // per-cell micro-facet normal tilt for subtle kirikane sparkle
const float K_KIRI_SPEC_EXP=56.; // specular exponent for kirikane diamond glints
const float K_KIRI_GLINT=.38; // daytime kirikane glint intensity
const float K_KIRI_NIGHT_GLINT=.22; // nighttime glint scale so kirikane sparkle converges softly
const vec3 K_KIRI_NIGHT_SPEC_TINT=vec3(.78,.66,.48); // warm attenuation on directSpecular at night to avoid grey-white glare
float kyotoHash(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
vec2 kyotoHash2(vec2 p){vec3 q=fract(vec3(p.xyx)*vec3(.1031,.1030,.0973));q+=dot(q,q.yzx+33.33);return fract((q.xx+q.yz)*q.zy);}
float kyotoKiriPattern(vec2 p,float cell,float amount,float px,out vec2 tilt){
  vec2 q=mat2(.7071,-.7071,.7071,.7071)*p/cell,id=floor(q),j=kyotoHash2(id)-.5,f=fract(q)-.5-j*K_KIRI_JITTER;
  tilt=j;
  float a=clamp(amount,0.,1.),baseSz=K_KIRI_SZ*sqrt(a);
  float dens=clamp(K_KIRI_DENS_BASE+a*K_KIRI_DENS_GAIN,0.,1.);
  float sz=baseSz*(.72+.48*kyotoHash(id+5.1))*step(kyotoHash(id+9.7),dens);
  float pxSafe=max(px,.05),aa=pxSafe/cell*K_KIRI_AA;
  float cov=(1.-smoothstep(sz-aa,sz+aa,max(abs(f.x),abs(f.y))))*step(.02,sz);
  float vis=smoothstep(1.3,3.2,cell/pxSafe);
  return mix(3.8*baseSz*baseSz*dens,cov,vis);
}
float kyotoRockKiriPattern(vec2 p,float amt,float px,out vec2 tilt,out float tone){
  float cell=K_ROCK_KIRI_CELL;
  vec2 q=mat2(.7071,-.7071,.7071,.7071)*p/cell,id=floor(q),j=kyotoHash2(id)-.5,f=fract(q)-.5-j*K_ROCK_KIRI_JITTER;
  tilt=j; tone=kyotoHash(id+2.3);
  // The squares are laid by hand in loose groups, not as a net over the whole rock (an even lattice read as a pine cone): a slow
  // field decides where a group lies; between groups the rock's own powdered body shows, with a stray square here and there.
  vec2 gq=q/2.3,gi=floor(gq),gf=fract(gq);gf=gf*gf*(3.-2.*gf);
  float grp=mix(mix(kyotoHash(gi+31.),kyotoHash(gi+vec2(1.,0.)+31.),gf.x),mix(kyotoHash(gi+vec2(0.,1.)+31.),kyotoHash(gi+vec2(1.,1.)+31.),gf.x),gf.y);
  float a=clamp(amt,0.,1.),base=mix(K_ROCK_SZ_MIN,K_ROCK_SZ_MAX,a),dens=mix(K_ROCK_DENS_MIN,.92,a)*mix(.1,1.,smoothstep(.33,.5,grp));
  float hw=base*(.62+.55*kyotoHash(id+5.1))*step(kyotoHash(id+9.7),dens);
  float pxSafe=max(px,.05),aa=pxSafe/cell*K_KIRI_AA;
  float cov=(1.-smoothstep(hw-aa,hw+aa,max(abs(f.x),abs(f.y))))*step(.02,hw);
  float vis=smoothstep(1.3,3.2,cell/pxSafe);
  return mix(4.*base*base*dens,cov,vis);
}
float kyotoKiriGlint(vec3 nw,vec2 tilt,float cov,vec3 keyDir,vec3 viewDir,float night){
  vec3 nf=normalize(nw+vec3(tilt.x,0.,tilt.y)*K_KIRI_TILT);
  vec3 hk=normalize(keyDir+viewDir);
  float spec=pow(max(dot(nf,hk),1e-4),K_KIRI_SPEC_EXP);
  return cov*spec*K_KIRI_GLINT*mix(1.,K_KIRI_NIGHT_GLINT,night);
}`;

const TREE_MOTION_CORE_GLSL = `
uniform sampler2D uState; uniform mat3 uTilt; uniform float uOpening;
varying float vGlow; varying float vLift;
${GROUND_GLSL}
void kyotoTreeTransform(vec2 rest, float height, vec3 localN, vec2 along, vec4 owner, vec4 style,
    out vec3 outPos, out vec3 outNormal, out vec3 outTanX, out vec3 outTanZ){
  int id=int(owner.x+.5); vec4 A=texelFetch(uState,ivec2(id,0),0), B=texelFetch(uState,ivec2(id,1),0);
  float foot=owner.y; vec2 anchor=owner.zw;
  float theta=A.y*style.x, ct=cos(theta), st=sin(theta), cs=cos(A.x), sn=sin(A.x);
  vec2 r=rest-anchor, q=anchor+vec2(cs*r.x-sn*r.y,sn*r.x+cs*r.y)+B.xy;
  vec3 up=vec3(0.,ct,st), down=vec3(0.,-st,ct), right=vec3(1.,0.,0.);
  vec3 tx=right*cs+down*sn, tz=-right*sn+down*cs;
  // Lying, each point rests on the ground under it; standing, on the line the tree stands on (as PART_MOTION_GLSL does).
  float upF=style.x>0.?smoothstep(.1,.7,A.y):0.;
  float gy=mix(groundY(q),groundY(vec2(q.x,foot)),upF);
  vec3 p=vec3(q.x,gy+B.z+.6,foot)+down*(q.y-foot)+up*height;
  p.y+=uOpening*360.; p.z-=uOpening*650.;
  vec3 centre=vec3(0.,-48.,0.); p=uTilt*(p-centre)+centre;
  outPos=p;
  outNormal=uTilt*normalize(tx*localN.x+up*localN.y+tz*localN.z);
  outTanX=uTilt*(tx*along.x+tz*along.y);
  outTanZ=uTilt*(-tx*along.y+tz*along.x);
  vGlow=A.w; vLift=height;
}`;

/** Tree limb hinge/sway transform (groundY under each vertex, +0.6 clearance). */
export const TREE_LIMB_MOTION_GLSL = `
attribute vec4 aOwner; attribute vec4 aStyle;
${TREE_MOTION_CORE_GLSL}
void kyotoLimb(vec3 aPos, vec3 aNormal, out vec3 outPos, out vec3 outNormal, out vec3 outTanX, out vec3 outTanZ){
  kyotoTreeTransform(aPos.xz, aPos.y, aNormal, vec2(1.,0.), aOwner, aStyle, outPos, outNormal, outTanX, outTanZ);
}`;

/** Instanced tree stamp hinge/sway transform. */
export const TREE_STAMP_MOTION_GLSL = `
attribute vec4 aPlacement, aStamp, aOwner, aStyle;
varying vec4 vTree;
varying vec2 vTreeScale;
${TREE_MOTION_CORE_GLSL}
void kyotoStamp(vec2 aUv, out vec3 outPos, out vec3 outNormal, out vec3 outTanX, out vec3 outTanZ){
  float c=cos(aPlacement.z), s=sin(aPlacement.z);
  vec2 along=vec2(c,s), corner=(aUv-.5)*aStamp.xy;
  vec2 rest=aPlacement.xy+vec2(c*corner.x-s*corner.y,s*corner.x+c*corner.y);
  kyotoTreeTransform(rest, aPlacement.w, vec3(0.,1.,0.), along, aOwner, aStyle, outPos, outNormal, outTanX, outTanZ);
  vTree=vec4(aUv, aStamp.z, aStamp.w);
  vTreeScale=aStamp.xy;
}`;

/** The box and its lid: only the lid (part 0) opens, everything leans with the hand. */
export const BOX_MOTION_GLSL = `
uniform mat3 uTilt; uniform float uOpening;
attribute float aPart;
varying float vGlow;
void kyotoBox(vec3 aPos, vec3 aNormal, out vec3 outPos, out vec3 outNormal){
  vec3 p=aPos;
  if(aPart<.5){p.y+=uOpening*360.; p.z-=uOpening*650.;}
  vec3 centre=vec3(0.,-48.,0.); p=uTilt*(p-centre)+centre;
  outPos=p; outNormal=uTilt*aNormal; vGlow=0.;
}`;

/** Lid top vertex deformation: shares groundY with PART_MOTION_GLSL and passes plate coordinates to the fragment shader. */
export const BOX_GROUND_GLSL = `
uniform sampler2D uState; uniform mat3 uTilt; uniform float uOpening;
attribute float aPart;
varying float vGlow;
varying vec2 vKyotoPlate;
varying vec3 vKyotoWorld, vKyotoNormal, vKyotoTanX, vKyotoTanZ;
${GROUND_GLSL}
void kyotoGround(vec3 aPos, vec3 aNormal, out vec3 outPos, out vec3 outNormal){
  vec3 p=vec3(aPos.x,groundY(aPos.xz),aPos.z);
  if(aPart<.5){p.y+=uOpening*360.; p.z-=uOpening*650.;}
  vec3 centre=vec3(0.,-48.,0.); p=uTilt*(p-centre)+centre;
  outPos=p; outNormal=uTilt*aNormal; vGlow=0.;
  vKyotoPlate=aPos.xz; vKyotoWorld=p; vKyotoNormal=outNormal;
  vKyotoTanX=uTilt*vec3(1.,0.,0.); vKyotoTanZ=uTilt*vec3(0.,0.,1.);
}`;

/** Lid top shadow-depth vertex deformation so building shadows meet hills at their raised height. */
export const BOX_GROUND_DEPTH_GLSL = `
uniform sampler2D uState; uniform mat3 uTilt; uniform float uOpening;
attribute float aPart;
${GROUND_GLSL}
void kyotoGround(vec3 aPos, vec3 aNormal, out vec3 outPos, out vec3 outNormal){
  vec3 p=vec3(aPos.x,groundY(aPos.xz),aPos.z);
  if(aPart<.5){p.y+=uOpening*360.; p.z-=uOpening*650.;}
  vec3 centre=vec3(0.,-48.,0.); p=uTilt*(p-centre)+centre;
  outPos=p; outNormal=uTilt*aNormal;
}`;

/**
 * The powder-density field (docs/MAKIE_GROUND_PLAN.md D3): the ground's nashiji is denser near mist, banks, rocks,
 * buildings and water and thinner in the open, and the two meet without an edge.
 *   width     texels across the baked field (plate is 720 wide); small is enough, it is smooth
 *   falloff   plate units from a heavy part at which the extra density has faded out
 *   more      how much denser than the base right on a part (fraction of the base density)
 *   less      how much thinner than the base in the open, far from everything
 *   refShift  the reference sits this far below the mean: the powder loses more brightness when thinned than it gains
 *             when thickened (the biggest layer is already full), so a ward's mean is kept up by this
 * The base density is unchanged where the field equals the ward's own mean (uDensMean, measured when it is baked), so
 * a ward with a lot of open ground is not dimmed overall and a crowded one is not brightened. Dev only: ?dens=off skips the bake, ?dens=view paints the field itself, ?dens=mask paints plain ground magenta.
 */
/** The contact field (bake.js bakeContactField): texels across the lid, and how far from a foot it reaches, in plate units. */
export const CONTACT = {width: 512, falloff: 18};
export const DENSITY = {width: 256, falloff: 80, more: .65, less: .22, refShift: .06};

/**
 * The shared coat (docs/plans/2026-11-16-coat.md): one tinted clear lacquer over every surface but the paper. It is Beer-Lambert
 * absorption in the film, applied to what lies under the coat and never to the coat's own mirror. Light goes in and comes out, so
 * the film is crossed twice, once along the key light and once along the view, each bent by the lacquer's index (K_COAT_N).
 * COAT.color is the colour the film leaves a ray that crosses it twice at right angles through thickness 1 (OpenPBR's coat_color), so
 * the absorption is -ln(C) per unit thickness. The thickness follows the form (kyotoCoatPart, mThick on the ground): thick in
 * hollows, at the foot of things and under eaves, thin on crowns and raised faces, and never nothing, as the old lacquer on
 * a raised part is still coated. uCoatK is ?coat times the box's age; with it at 0 nothing here runs.
 */
/**
 * Round two (docs/plans/2026-11-16-coat.md §7): what the coat does depends on whether a thing lies under the lacquer or on it.
 *   sunk   (nashiji chips, silver hirame, the box's walls and inside)  film all over, the same amber everywhere (COAT.sunk).
 *   edge   (togidashi: flat inlays, hills, banks, sandbars, mist, water)  the face is ground flush and bare: no colour. The edge
 *          is wrapped by lacquer: only a ring just inside the outline takes COAT.edge, strongest at the outline, none a little in.
 *   top    (takamaki-e roofs, rocks, trees, foxes, birds, frames, cut gold, the lid's gold rim)  a thin, cooler film (COAT.top); a hard step.
 *   faint  (aogai, coral)  inlaid, barely stained.
 * Colours are what the film leaves a ray crossing it twice at right angles through thickness 1 (OpenPBR coat_color); the absorption is
 * -ln(C) per unit thickness, along the key and the view, each bent by the index. gain keeps the luminance of the class where it applies.
 */
export const COAT = {sunk: [.955, .76, .44], edge: [.50, .28, .10], top: [.985, .93, .80], faint: [.995, .975, .93], sunkGain: 1.2, topGain: 1.03, index: 1.5, shine: .32, shineRough: .1, edgeWidth: [.6, .5]};
const v3 = c => c.map(v => v.toFixed(3)).join(',');
export const COAT_GLSL = `
#ifndef KYOTO_COAT_DEFS
#define KYOTO_COAT_DEFS
uniform float uCoatK; uniform vec3 uCoatUp, uCoatV, uCoatL;
const vec3 K_COAT_AS=-log(vec3(${v3(COAT.sunk)})), K_COAT_AE=-log(vec3(${v3(COAT.edge)})), K_COAT_AT=-log(vec3(${v3(COAT.top)})), K_COAT_AF=-log(vec3(${v3(COAT.faint)}));
const float K_COAT_RN2=1./(${(COAT.index * COAT.index).toFixed(3)}), K_COAT_GS=${COAT.sunkGain.toFixed(3)}, K_COAT_GT=${COAT.topGain.toFixed(3)};
vec3 kyotoCoatT(vec3 A,float thick,float cv,float cl){
  float tv=sqrt(1.-(1.-cv*cv)*K_COAT_RN2),tl=sqrt(1.-(1.-cl*cl)*K_COAT_RN2);
  return exp(-A*thick*.5*(1./tv+1./tl)*uCoatK);
}
// cls: 0 sunk, 1 top, 2 faint. The thickness follows the form: thick at the foot and on faces turned from the sky, thin high up and on crowns.
vec3 kyotoCoatPart(vec3 nW,float lift,int cls){
  float up=clamp(dot(nW,uCoatUp),0.,1.);
  float th=mix(1.5,.7,smoothstep(0.,16.,lift))*(.75+.5*(1.-up));
  vec3 A=cls==0?K_COAT_AS:cls==1?K_COAT_AT:K_COAT_AF;
  float g=cls==0?K_COAT_GS:cls==1?K_COAT_GT:1.;
  return kyotoCoatT(A,th,clamp(dot(nW,uCoatV),0.,1.),clamp(dot(nW,uCoatL),0.,1.))*pow(g,min(uCoatK/.85,1.));
}
#endif`;
const MAKIE_COMMON_GLSL = `
#ifdef KYOTO_COAT_ON
${COAT_GLSL}
#endif
uniform vec3 uView, uKey, uLamp;
uniform float uTime, uNight, uPresence, uPx, uOpening, uAge;
uniform vec3 uTrails[20];
uniform sampler2D uSoft0, uIdent0;
const vec2 M_HALF=vec2(360.,230.);
const vec3 M_GOLD=vec3(1.,.70,.26), M_PALE=vec3(.98,.84,.48), M_SILVER=vec3(.84,.85,.83), M_LACQ=vec3(.020,.015,.013), M_AMBER=vec3(1.,.86,.58), M_OXID=vec3(.66,.66,.64);
const float M_SWELL=17., M_AMB=.17, M_KEY=.44, M_POOL=1.75;
// The lacquer's window (ThreeRT reference, docs/agent-runs/2026-11-14-threert-reference.md L3), in two layers: the
// coat mirrors a narrow warm-white band (M_BAND_*), and the powder under it a broad gold sheen that brightens the
// body without whitening it (M_SHEEN_*). SWEEP: how fast the place follows the lean; FALL: how fast it fades across
// the lid; WIDTH: the gaussian's tightness (larger is narrower); GAIN: how bright, by day (a night keeps .45 of it).
// Age (uAge, 0 as new to 1): the amber lacquer has browned (M_FLAKE_AGED tints the chips, and the lacquer between them
// is less amber), and its surface has hazed, laying a very thin grey veil (M_AGE_VEIL) while the
// mirror in the coat, the sheen in the powder and the lamp's pool all weaken (M_AGE_GLOSS, _SHEEN, _POOL at age 1).
// The ground is dark because of the lacquer between its chips (mNashiji), never because the whole thing is multiplied down: the
// tiers are M_DEPTH_A/B/C (three depths of chip) and M_FILL (the gold under the lacquer where powder lies close); a night keeps M_FLAKE_NIGHT of them.
// Raised gold keeps its value but loses saturation (M_AGE_PALE): the picture ends up paler than its ground.
const vec3 M_AGE_VEIL=vec3(.0035,.003,.002);
const float M_DEPTH_A=.078, M_DEPTH_B=.19, M_DEPTH_C=.53, M_FILL=.8, M_FLAKE_NIGHT=.78;
// Silver on the lid sulphides the same way (M_TARNISH at age 1), in blotches; fine drawn lines stay bright.
// The coat no longer mirrors evenly (M_AGE_HAZE: how far its gloss swings from place to place), the lacquer lies a
// little thicker here and thinner there (M_AGE_MURA: the swing in the ground's value), and where a bank's crown has
// been rubbed for centuries the red-brown under-lacquer shows through the gold (M_AGE_WEAR, M_UNDER).
const float M_AGE_BOKASHI=2.4;
const float M_AGE_HAZE=1.1, M_AGE_MURA=.26, M_AGE_WEAR=.3;
const vec3 M_UNDER=vec3(.21,.075,.04);
const vec3 M_CORAL=vec3(.60,.115,.06);
const vec3 M_TARNISH=vec3(.46,.42,.36);
const float M_AGE_GLOSS=.35, M_AGE_SHEEN=.25, M_AGE_POOL=.28, M_AGE_PALE=.42;
const float M_BAND_SWEEP=6.5, M_BAND_FALL=1., M_BAND_WIDTH=2.2, M_BAND_GAIN=.14, M_SHEEN_WIDTH=.35, M_SHEEN_GAIN=.55;
const mat2 M_R1=mat2(.940,.342,-.342,.940), M_R2=mat2(.766,-.643,.643,.766), M_R3=mat2(.5,.866,-.866,.5);
vec2 mPuv(vec2 q){return (clamp(q,-M_HALF,M_HALF)+M_HALF)/(2.*M_HALF);}
ivec2 mIdent0(vec2 p){
  ivec2 sz=textureSize(uIdent0,0);
  return ivec2(texelFetch(uIdent0,clamp(ivec2((p+M_HALF)/(2.*M_HALF)*vec2(sz)),ivec2(0),sz-1),0).rg*255.+.5);
}
float mHash(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
vec2 mHash2(vec2 p){vec3 q=fract(vec3(p.xyx)*vec3(.1031,.1030,.0973));q+=dot(q,q.yzx+33.33);return fract((q.xx+q.yz)*q.zy);}
float mVnoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mHash(i),mHash(i+vec2(1.,0.)),f.x),mix(mHash(i+vec2(0.,1.)),mHash(i+1.),f.x),f.y);}
vec3 mN, mHk, mHp, mKeyC, mPoolC, mAmbC, mWP; float mThick=1., mKS=1., mKE=0., mKT=0., mAtt, mDk, mDp, mWake=0., mSh=1., mOcc=1., mBand=0., mSheen=0.;
float mPool(){return M_POOL*mix(1.,M_AGE_POOL,uAge);}
vec3 mLight(){return M_AMB*mAmbC*mOcc+(M_KEY*mDk*mKeyC+mPool()*mAtt*mDp*mPoolC)*mSh;}
vec3 mSpec(float e){return (M_KEY*pow(max(dot(mN,mHk),0.),e)*mKeyC+mPool()*mAtt*pow(max(dot(mN,mHp),0.),e)*mPoolC)*mSh;}
vec3 mAgedSilver(vec3 f0,vec2 p,float k){return f0*mix(vec3(1.),M_TARNISH,clamp(uAge*k*(.86+.26*smoothstep(.25,.8,mVnoise(p*.05+17.))),0.,1.));}
vec3 mRoom(float rough){
  vec3 r=reflect(-uView,mN);
  float up=smoothstep(-.35,1.,r.y),win=smoothstep(mix(.74,.15,rough),1.,dot(r,uKey));
  return (mAmbC*(.04+.30*up*up)+mKeyC*win*mix(1.15,.5,rough))*mix(1.,mOcc,.7);
}
void mSetLight(vec3 n,vec3 worldPos){
  mN=n;mWP=worldPos;
  mKeyC=mix(vec3(1.,.95,.86),vec3(.64,.72,.90),uNight);
  mPoolC=mix(vec3(1.,.93,.80),vec3(.96,.96,1.),uNight);
  mAmbC=mix(vec3(1.,.96,.90),vec3(.50,.60,.84),uNight);
  vec3 toLamp=uLamp-worldPos;float d2=dot(toLamp,toLamp);vec3 lp=toLamp*inversesqrt(max(d2,1.));
  mAtt=(uPresence/(1.+d2/24000.))+mWake*.55;
  mDk=max(dot(n,uKey),0.);mDp=max(dot(n,lp),0.);
  mHk=normalize(uKey+uView);mHp=normalize(lp+uView);
  // Polished lacquer mirrors a soft window: a broad diagonal band whose place follows the reflected ray, so it
  // sweeps across the lid as the box leans toward the hand (the 移光), and rests off-centre when the box is still.
  vec3 r=reflect(-uView,n);
  float s=dot(r.xz-vec2(-.35,-.74),vec2(.62,-.78))*M_BAND_SWEEP+dot(worldPos.xz,vec2(.0021,.0013))*M_BAND_FALL-.35;
  float dim=mix(1.,.45,uNight);
  mBand=exp(-s*s*M_BAND_WIDTH)*mSh*dim;
  mSheen=exp(-s*s*M_SHEEN_WIDTH)*mix(.6,1.,mSh)*dim;
}
float mFlake(vec2 p,float cell,float size,float dens,float sq,float spread,out vec3 glint){
  float vis=smoothstep(1.3,3.2,cell/max(uPx,.05));
  dens=min(dens,1.);
  float avg=dens*mix(1.95,3.57,sq)*size*size;
  vec3 broad=(M_KEY*pow(max(dot(mN,mHk),0.),12.)*mKeyC+M_POOL*mAtt*pow(max(dot(mN,mHp),0.),12.)*mPoolC)*mSh;
  vec2 g=p/cell,id=floor(g),r=mHash2(id);
  float present=step(mHash(id+7.31),dens);
  float sz=size*mix(1.,.55+.45*mHash(id+11.3),1.-sq*.6);
  vec2 d=fract(g)-(.5+(r-.5)*(1.-2.*sz));
  float a=(mHash(id+3.17)-.5)*mix(6.283,.5,sq),ca=cos(a),sa=sin(a);d=vec2(ca*d.x-sa*d.y,sa*d.x+ca*d.y);
  float ang=atan(d.y,d.x);
  float round_=length(d)*(1.+.26*sin(ang*3.+r.x*6.3)+.16*sin(ang*4.+r.y*9.)+.08*sin(ang*7.+r.x*4.));
  float dist=mix(round_,max(abs(d.x),abs(d.y)*mix(.8,1.25,r.x)),sq),aa=max(uPx,.05)/cell*.75;
  float cov=present*(1.-smoothstep(sz-aa,sz+aa,dist));
  vec3 nf=normalize(mN+vec3(r.x-.5,0.,r.y-.5)*spread);
  vec3 gl=(M_KEY*.45*pow(max(dot(nf,mHk),0.),70.)*mKeyC+M_POOL*mAtt*pow(max(dot(nf,mHp),0.),70.)*mPoolC)*mSh;
  glint=mix(avg*broad*.55,cov*gl*2.6,vis);
  return mix(avg,cov,vis);
}
// Gyobu nashiji (刑部梨子地): large, irregular flakes of gold sunk in the lacquer, flat, each its own shape and way round.
// They are the inset cells of a jittered Voronoi mosaic, so none touches or covers another and there is no lattice;
// dP and dC (how dense the flakes are here, and at the flake's own centre) thin them smoothly: the flake shrinks, then
// the ones that are left out vanish. Size runs about 2.5 to 5 plate units.
const float M_GY_CELL=5.5;
float mVd=0.; // distance (in cells) from the last mVoro point to its seed
float mVoro(vec2 q,out vec2 id,out vec2 cen){
  vec2 g=floor(q),f=fract(q),mr=vec2(0.),mg=vec2(0.);float md=9.;
  for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){vec2 o=vec2(float(i),float(j)),r=o+mHash2(g+o)*.86+.07-f;float d=dot(r,r);if(d<md){md=d;mr=r;mg=o;}}
  float bd=9.;
  for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){vec2 o=mg+vec2(float(i),float(j)),r=o+mHash2(g+o)*.86+.07-f,dv=r-mr;float l=dot(dv,dv);if(l>1e-5)bd=min(bd,dot(.5*(mr+r),dv)*inversesqrt(l));}
  id=g+mg;cen=id+mHash2(id)*.86+.07;mVd=sqrt(md);return bd;
}
float mGyobuCov(vec2 p,float bd,vec2 id,float dP,float dC){
  float gap=.08+(1.-clamp(dP,0.,1.))*.34+.16*mHash(id+6.1),aa=max(uPx,.05)*.75/M_GY_CELL;
  // Corners are rounded off (the far reaches of a cell lose ground first) and the edge is roughened.
  float wob=(mVnoise(p*.9+id*3.1)-.5)*.22+(mVnoise(p*2.3+id)-.5)*.08-.2*mVd;
  return step(mHash(id+2.9),clamp(dC*.96,0.,1.))*smoothstep(gap-aa,gap+aa,bd+wob);
}
// Kirikane as an accent (the Hatsune hills carry it only along their lit ridges and edges): small squares laid in short
// rows, three to nine to a group, along the edge, with open ground between the groups. e (0..1) is how much of an edge
// this is; the squares shrink to nothing as it falls. tdir runs along the edge. A group is a row of slots, one square to
// a slot, so each pixel only has to ask which slot of each nearby group it is in.
float mKiriCluster(vec2 p,vec2 tdir,float e,out vec3 glint){
  const float CL=21.,PITCH=2.9;
  vec2 g=floor(p/CL),nrm=vec2(-tdir.y,tdir.x);
  float cov=0.,aa=max(uPx,.05)*.75;glint=vec3(0.);
  if(e<.02)return 0.;
  for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){
    vec2 id=g+vec2(float(i),float(j));
    if(mHash(id+4.7)>.55)continue;
    vec2 c=(id+.2+.6*mHash2(id))*CL,d=p-c;
    float n=3.+floor(mHash(id+9.1)*7.),s=dot(d,tdir)/PITCH+n*.5,k=floor(s);
    if(k<0.||k>=n)continue;
    vec2 hk=mHash2(id*7.+k+3.1);
    float u0=(s-k-.5)*PITCH,v0=dot(d,nrm)-(hk.y-.5)*.7-(k-n*.5)*(mHash(id+1.3)-.5)*.3;
    float ca=cos((hk.x-.5)*.5),sa=sin((hk.x-.5)*.5);
    vec2 q=vec2(ca*u0-sa*v0,sa*u0+ca*v0);
    float sz=mix(.8,1.2,hk.x)*smoothstep(.2,.65,e);
    float cv=(1.-smoothstep(sz-aa,sz+aa,max(abs(q.x),abs(q.y))))*step(.02,sz);
    if(cv>cov){
      cov=cv;
      vec3 nf=normalize(mN+vec3(hk.x-.5,0.,hk.y-.5)*.5);
      glint=(M_KEY*.5*pow(max(dot(nf,mHk),0.),60.)*mKeyC+M_POOL*mAtt*pow(max(dot(nf,mHp),0.),60.)*mPoolC)*mSh*2.4;
    }
  }
  glint*=cov;return cov;
}
// How far a point is from the inside of a shape's edge, 0 well inside and 1 at the outline: six taps on a ring of radius r around it, each
// counting if the field there is below lo..hi (outside). Togidashi: the lacquer wraps the edge, so the colour is put on this ring and nowhere else.
#ifdef KYOTO_COAT_ON
float mEdgeOut(sampler2D tex,int ch,vec2 p,float r,float lo,float hi){
  float o=0.;
  for(int i=0;i<6;i++){
    float a=float(i)*1.0472+1.3;vec2 d=vec2(cos(a),sin(a));
    vec4 t=texture(tex,mPuv(p+d*r)),u=texture(tex,mPuv(p+vec2(-d.y,d.x)*r*.5));
    o+=2.-smoothstep(lo,hi,ch==0?t.g:ch==1?t.r:t.a)-smoothstep(lo,hi,ch==0?u.g:ch==1?u.r:u.a);
  }
  return o*.08333;
}
#endif
vec3 mCoat(){return (vec3(1.,.95,.86)*(mSpec(220.)*.42+mSpec(36.)*.10)+mRoom(0.)*.045+mKeyC*mBand*M_BAND_GAIN)*mix(1.,M_AGE_GLOSS*(.45+M_AGE_HAZE*mVnoise(mWP.xz*.035+9.)),uAge);}
// Nashiji (梨子地), the Hatsune way: the ground is dark lacquer and the gold is in it as flat chips, large, each of its own
// shape and size, in several golds (mostly orange, some yellow, some reddish, a few pale). They are laid in three layers
// at three depths, so chips overlap and some lie deeper (dimmer) than others. The ground is dark because of the lacquer
// between the chips, not because anything is darkened: where the powder lies close (dens high: 濃梨子地) the chips cover
// nearly all of it, the layers lie brighter, and the lacquer between them has a deep gold under it, so a close ground is
// one step up from a sparse one with no edge between. dens is the powder's density here (.4 thin, .9 the ground, 2+ dense).
const vec2 M_PN[5]=vec2[5](vec2(1.,0.),vec2(.309,.951),vec2(-.809,.588),vec2(-.809,-.588),vec2(.309,-.951));
// Suki-urushi clears with age: new, it is a deep brown film over the powder; over the years it grows more transparent and lighter, so the
// gold under it shows brighter and yellower (the Edo-period Hatsune set is bright partly for its quantity of gold, partly because its
// lacquer has cleared; user, 2026-11-17). So age does not brown the chips: it lets a little more of them through.
// New (age 0, fresh from the workshop) the film is at its darkest and brownest (M_FLAKE_NEW); at age 1 it has cleared (M_FLAKE_AGED).
const vec3 M_FLAKE_NEW=vec3(.86,.76,.60), M_FLAKE_AGED=vec3(1.06,1.,.90);
// The chips that lie deep are the ones the lacquer hides: as it clears they show more, and less reddened (the deepest tier by
// M_AGE_CLEAR_A at age 1, the middle one by M_AGE_CLEAR_B; the shallow tier was never hidden).
const float M_NEW_CLEAR_A=.6, M_NEW_CLEAR_B=.78, M_AGE_CLEAR_A=2.2, M_AGE_CLEAR_B=1.5;
// One layer of chips: one in each cell, a convex piece of five random sides, longer than wide, at its own angle, inside
// its cell. hl, hw are its half-length and half-width as a share of the cell. Returns its coverage of the pixel; col is
// the chip's colour (lit), glint the light it mirrors.
float mChips(vec2 p,float cell,float lo,float hi,float pres,float depth,vec3 hueMul,vec3 L,vec3 broad,out vec3 col,out vec3 glint){
  float vis=smoothstep(1.3,3.2,cell/max(uPx,.05));
  vec2 g=p/cell,id=floor(g),r=mHash2(id),a=mHash2(id+3.7),b=mHash2(id+9.1),o1=mHash2(id+31.1),o2=mHash2(id+41.3),h=mHash2(id+7.31);
  float hl=mix(lo,hi,a.x),hw=hl*mix(.62,.95,a.y);
  vec2 d=fract(g)-.5-(r-.5)*max(1.-2.48*hl,0.);
  float ang=b.x*6.283,ca=cos(ang),sa=sin(ang);
  vec2 q=vec2(ca*d.x-sa*d.y,sa*d.x+ca*d.y)/vec2(hl,hw);
  float dist=max(max(max(dot(q,M_PN[0])-(.72+.28*b.y),dot(q,M_PN[1])-(.72+.28*o1.x)),max(dot(q,M_PN[2])-(.72+.28*o1.y),dot(q,M_PN[3])-(.72+.28*o2.x))),dot(q,M_PN[4])-(.72+.28*o2.y));
  float aa=max(uPx,.05)*.75/(cell*hw);
  float cov=step(h.x,pres)*(1.-smoothstep(-aa,aa,dist));
  float hh=h.y;
  vec3 hue=hh<.58?vec3(1.,.38,.09):hh<.78?vec3(1.,.54,.13):hh<.93?vec3(.92,.25,.07):vec3(1.,.70,.32);
  float tone=.62+.66*fract(hh*37.3);
  vec3 chip=hue*hueMul*tone*depth*(.06+.90*L);
  vec3 nf=normalize(mN+vec3(r.x-.5,0.,r.y-.5)*.5);
  vec3 gl=(M_KEY*.45*pow(max(dot(nf,mHk),0.),70.)*mKeyC+M_POOL*mAtt*pow(max(dot(nf,mHp),0.),70.)*mPoolC)*mSh;
  float avg=pres*2.7*(lo+hi)*(lo+hi)*.25*.8*.9;
  col=mix(vec3(1.,.40,.10)*hueMul*.95*depth*(.06+.90*L),chip,vis);
  glint=mix(avg*broad*.55,cov*gl*2.6,vis);
  return mix(avg,cov,vis);
}
vec3 mNashiji(vec2 p,float dens,vec3 tint){
  vec3 L=mLight(),hueMul=clamp(tint/M_GOLD,vec3(.6),vec3(2.)),c1,c2,c3,g1,g2,g3;
  float dn=smoothstep(1.05,2.1,dens);
  vec3 broad=(M_KEY*pow(max(dot(mN,mHk),0.),12.)*mKeyC+M_POOL*mAtt*pow(max(dot(mN,mHp),0.),12.)*mPoolC)*mSh;
  // The chips' lay is warped a little so the cells they sit in never read as a lattice.
  vec2 w=p+(vec2(mVnoise(p*.37+3.1),mVnoise(p*.37+11.7))-.5)*2.2;
  vec3 age=mix(M_FLAKE_NEW,M_FLAKE_AGED,uAge)*mix(1.,mix(M_FLAKE_NIGHT,M_FLAKE_NIGHT*.8,dn),uNight);
  float a=mChips(M_R1*w,2.8,.30,.41,mix(.3,1.,clamp(dens*1.0,0.,1.)),mix(M_DEPTH_A,M_DEPTH_A*5.4,dn)*mix(M_NEW_CLEAR_A,M_AGE_CLEAR_A,uAge),hueMul*age*mix(vec3(1.,.80,.64),vec3(1.,.92,.82),uAge),L,broad,c1,g1);
  float b=mChips(M_R2*w+13.7,2.5,.30,.41,mix(.3,1.,clamp(dens*.85,0.,1.)),mix(M_DEPTH_B,M_DEPTH_B*3.0,dn)*mix(M_NEW_CLEAR_B,M_AGE_CLEAR_B,uAge),hueMul*age,L,broad,c2,g2);
  float c=mChips(M_R3*w+41.3,3.3,.30,.41,mix(.2,1.,clamp(dens*.55,0.,1.)),mix(M_DEPTH_C,M_DEPTH_C*1.5,dn),hueMul*age*vec3(1.,1.10,1.22),L,broad,c3,g3);
  // The lacquer between the chips: nearly black amber; where the powder lies close, the gold under it shows through.
  vec3 lacq=mix(vec3(.30,.10,.045)*(.02+.05*L)*mix(1.8,1.,uAge),vec3(.62,.28,.07)*hueMul*age*M_FILL*(.06+.90*L),dn*.85);
  vec3 col=mix(mix(mix(lacq,c1,a),c2,b),c3,c);
  float sheen=mSheen*mix(1.,M_AGE_SHEEN,uAge);
  col*=(1.+M_SHEEN_GAIN*sheen)*(1.+(mVnoise(p*.011+3.)-.5)*M_AGE_MURA*uAge);
  vec3 glint=(g1+g2*1.1+g3*1.3)*tint*M_AMBER;
  return col+glint*(1.+2.2*mBand*mix(1.,M_AGE_GLOSS,uAge)+1.2*sheen)+M_AGE_VEIL*uAge*(mAmbC*.55*mOcc+mKeyC*mDk*.45*mSh)+mCoat()*.18;
}
vec3 mMetal(vec2 p,vec3 f0,float rise){
  f0=mix(f0,vec3(dot(f0,vec3(.3,.55,.15)))*vec3(1.05,1.,.90),M_AGE_PALE*uAge);
  vec3 g;mFlake(p,.5,.4,.9,0.,.35,g);
  vec3 c=f0*f0*(.04+.30*mLight())+f0*mRoom(.7)*.85+mix(f0,vec3(1.),.14)*(mSpec(34.)*.8+mSpec(9.)*.10+g*.5);
  return mix(c*vec3(.80,.60,.36)*.8,c,smoothstep(.12,.85,rise));
}
vec3 mSheet(vec3 f0){return f0*(.05+.18*mLight()+mRoom(.12)*.8)+mix(f0,vec3(1.),.5)*(mSpec(160.)*1.5+mSpec(18.)*.18);}
vec3 mKiriColor(vec3 foil){return mSheet(foil)*.6+foil*(.16+.95*mLight());}
vec3 mGyobuShade(vec2 id,out vec3 glint){
  vec2 r=mHash2(id+3.3);float hv=mHash(id+8.8);
  vec3 foil=mix(M_GOLD,M_PALE,.35+.45*hv),L=mLight();
  vec3 nf=normalize(mN+vec3(r.x-.5,0.,r.y-.5)*.3);
  vec3 col=foil*vec3(1.,.82,.5)*(.12+.95*L)*(.84+.32*hv)+mSheet(foil)*.26*mix(1.,.3,uAge);
  // Old flakes have gone dull, and a few have darkened.
  col*=1.-.4*uAge*step(.84,mHash(id+1.7));
  glint=foil*(M_KEY*.45*pow(max(dot(nf,mHk),0.),70.)*mKeyC+M_POOL*mAtt*pow(max(dot(nf,mHp),0.),70.)*mPoolC)*mSh*2.*mix(1.,.4,uAge);
  return col;
}
// Silver hirame (the silver sand and the silver banks): coarse silver flakes of two sizes lie close under the lacquer, each a
// little brighter or darker than its neighbours. dS (0..1) is how thickly they lie; c is what they lie on.
vec3 mHirame(vec3 c,vec2 kp,float dS,float rise){
    vec2 id1,c1,id2,c2;
    float b1=mVoro(M_R3*kp/2.3,id1,c1),b2=mVoro(M_R1*kp/1.25+7.3,id2,c2);
    float a1=max(uPx,.05)*.75/2.3,a2=max(uPx,.05)*.75/1.25;
    float g1=.09+(1.-dS)*.40+.04*mHash(id1+6.1),g2=.10+(1.-dS)*.40+.04*mHash(id2+6.1);
    float v1=step(mHash(id1+2.9),min(dS*1.2,1.))*smoothstep(g1-a1,g1+a1,b1+(mVnoise(kp*.9)-.5)*.1);
    float v2=step(mHash(id2+2.9),min(dS*1.2,1.))*smoothstep(g2-a2,g2+a2,b2+(mVnoise(kp*1.3+4.)-.5)*.1);
    float cv=max(v1,v2*(1.-v1)),pick=v1>.5?1.:0.;
    vec2 fid=pick>.5?id1:id2;
    float fh=mHash(fid+8.8);vec2 fr=mHash2(fid+3.3);
    vec3 fs0=mAgedSilver(M_SILVER*1.1,kp,.3)*(1.-.12*uAge*step(.86,mHash(fid+1.7)));
    vec3 sc=mMetal(kp,fs0,rise)*(.98+.40*fh);
    vec3 snf=normalize(mN+vec3(fr.x-.5,0.,fr.y-.5)*.3);
    sc+=mix(fs0,vec3(1.),.4)*(M_KEY*.5*pow(max(dot(snf,mHk),0.),48.)*mKeyC+M_POOL*mAtt*pow(max(dot(snf,mHp),0.),48.)*mPoolC)*mSh*mix(1.,.4,uAge);
    // Between the flakes the ground is the same silver, a shade down, so the grain is in the flakes and not in dark joints.
    c=mix(c,mMetal(kp,mAgedSilver(M_SILVER*.85,kp,.3),rise)*1.12,dS*.92);
    return mix(c,sc,cv);
}
vec4 mFinish(vec3 c,float a){
#ifdef KYOTO_COAT_ON
  if(uCoatK>0.){
    vec3 T=kyotoCoatT(K_COAT_AS*mKS+K_COAT_AT*mKT+K_COAT_AE*mKE,mThick,clamp(dot(mN,uCoatV),0.,1.),clamp(dot(mN,uCoatL),0.,1.))*pow(K_COAT_GS,mKS*min(uCoatK/.85,1.))*pow(K_COAT_GT,mKT*min(uCoatK/.85,1.));
    c=c*T+mCoat()*(1.-T)*.3;
  }
#endif
  c*=1.25;float l=max(dot(c,vec3(.3,.55,.15)),1e-4),t=l/(1.+l*.42);
  c=mix(c*(t/l),vec3(t),smoothstep(.9,2.6,l)*.55);c=min(c,vec3(1.));
  c=mix(c,c*vec3(.92,.96,1.05)+vec3(.003,.005,.009),uNight*.6);
  return vec4(pow(c,vec3(.4545)),a);
}`;

/**
 * MAT_LOOK (mat.js) as GLSL constant arrays, one per column, indexed by the material id; and the names of each column's kinds.
 * The ground shader reads these and never compares a material id with a number. A float is written out in full (String, not
 * toFixed), so the shader holds exactly the table's value.
 */
const LOOK_N = Math.max(...Object.keys(MAT_LOOK).map(Number)) + 1;
const lookColumn = (type, value) => `const ${type} T_${value.name}[${LOOK_N}]=${type}[${LOOK_N}](${Array.from({length: LOOK_N}, (_, id) => value.of(lookOf(id))).join(',')});`;
const glslFloat = v => { const text = String(v); return /[.e]/.test(text) ? text : `${text}.`; };
const glslName = key => key.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase();
const glslKinds = (prefix, kinds) => `const int ${Object.entries(kinds).map(([key, id]) => `${prefix}_${glslName(key)}=${id}`).join(',')};`;
export const MAT_LOOK_GLSL = [
  `const int LOOK_N=${LOOK_N};`,
  glslKinds('COAT', COAT_KIND), glslKinds('TONE', TONE), glslKinds('TIER', TIER), glslKinds('RECIPE', RECIPE),
  lookColumn('float', {name: 'CH', of: row => glslFloat(row.ch)}),
  lookColumn('bool', {name: 'CH_RIDGE', of: row => String(row.chRidge)}),
  lookColumn('float', {name: 'LH', of: row => glslFloat(row.lh)}),
  lookColumn('int', {name: 'COAT', of: row => COAT_KIND[row.coat]}),
  lookColumn('bool', {name: 'DENSITY', of: row => String(row.density)}),
  lookColumn('float', {name: 'FLAKE_D', of: row => glslFloat(row.flakeD)}),
  lookColumn('float', {name: 'FLAKE_CELL', of: row => glslFloat(row.flakeCell)}),
  lookColumn('bool', {name: 'FOIL', of: row => String(row.foil)}),
  lookColumn('int', {name: 'TONE', of: row => TONE[row.tone]}),
  lookColumn('bool', {name: 'HILL', of: row => String(row.hill)}),
  lookColumn('int', {name: 'TIER', of: row => TIER[row.tier]}),
  lookColumn('bool', {name: 'CLOUD', of: row => String(row.cloud)}),
  lookColumn('int', {name: 'RECIPE', of: row => RECIPE[row.recipe]}),
].join('\n');

/** Fragment declarations injected into groundMaterial (MeshPhysicalMaterial). */
export const MAKIE_GROUND_PARS_GLSL = `
varying float vGlow; uniform float uGlowBase, uGlowGain;
uniform sampler2D uState, uFine0, uDens, uContact;
uniform float uDensView, uDensMean;
// Where things stand they shut out the room: the lid gets less of the sky's light there (M_OCC_AMB) and a little
// less of everything else (M_OCC_ALL). It is light withheld, never a colour laid on, and it fades out with no edge.
const float M_OCC_AMB=.85, M_OCC_ALL=.16;
${MAT_LOOK_GLSL}
const float M_DENS_MORE=${DENSITY.more.toFixed(3)}, M_DENS_LESS=${DENSITY.less.toFixed(3)};
varying vec2 vKyotoPlate;
varying vec3 vKyotoWorld, vKyotoNormal, vKyotoTanX, vKyotoTanZ;
${MAKIE_COMMON_GLSL}`;

/** Fragment body replacing outgoingLight right before #include <opaque_fragment> on the lid top. */
export const MAKIE_GROUND_FRAG_GLSL = `
if(uOpening>.999)discard;
vec2 kp=vKyotoPlate;
if(abs(kp.x)>M_HALF.x||abs(kp.y)>M_HALF.y){
  vec2 e=abs(kp)-M_HALF;float out_=max(e.x,e.y);
  mWake=0.;mSh=1.;mSetLight(normalize(vKyotoNormal),vKyotoWorld);
  vec3 bc=out_>7.4?mMetal(kp,M_GOLD*.92,1.):out_>6.4?mMetal(kp,M_GOLD*.6,1.):mNashiji(kp,.9,M_GOLD);
  // The lip is where hands lift the lid: its gold has worn through to the lacquer in patches, most at the corners.
  float corner=smoothstep(.86,1.,min(abs(kp.x)/M_HALF.x,abs(kp.y)/M_HALF.y));
  float worn=uAge*step(6.4,out_)*smoothstep(.46-.22*corner,.86,mVnoise(kp*.045+2.))*.5;
  bc=mix(bc,M_UNDER*(.3+mLight()),worn);
#ifdef KYOTO_COAT_ON
  mKS=0.;mKT=1.; // the lip's gold is thin and bright
#endif
  outgoingLight=mFinish(bc,1.).rgb;
  diffuseColor.a=1.;
}else{
  ivec2 im=mIdent0(kp);int id=im.x,mat=im.y,mi=clamp(mat,0,LOOK_N-1); // mi: the material's row in MAT_LOOK (the T_ arrays)
  float rise=texelFetch(uState,ivec2(id,0),0).z,glow=texelFetch(uState,ivec2(id,0),0).w;
  vec4 fine=texture(uFine0,mPuv(kp));float hs=texture(uSoft0,mPuv(kp)).r;
  float eS=3.,sH=M_SWELL*mix(.3,1.,rise),cH=T_CH_RIDGE[mi]?T_CH[mi]*smoothstep(.56,.72,fine.g):T_CH[mi],lH=T_LH[mi],eC=max(uPx*.9,.55);
  vec4 st=vec4(texture(uSoft0,mPuv(kp+vec2(eS,0.))).r,texture(uSoft0,mPuv(kp-vec2(eS,0.))).r,
               texture(uSoft0,mPuv(kp+vec2(0.,eS))).r,texture(uSoft0,mPuv(kp-vec2(0.,eS))).r);
  vec2 gs=vec2(st.x-st.y,st.z-st.w)/(2.*eS)*sH;
  vec4 fx1=texture(uFine0,mPuv(kp+vec2(eC,0.))),fx0=texture(uFine0,mPuv(kp-vec2(eC,0.))),
       fz1=texture(uFine0,mPuv(kp+vec2(0.,eC))),fz0=texture(uFine0,mPuv(kp-vec2(0.,eC)));
  vec2 grad=gs+vec2((fx1.g-fx0.g)*cH+(fx1.b-fx0.b)*lH,(fz1.g-fz0.g)*cH+(fz1.b-fz0.b)*lH)/(2.*eC)*mix(.55,1.,rise);
  grad*=min(1.,2.4/max(length(grad),1e-4));
  mWake=0.;float ring=0.;
  for(int i=0;i<20;i++){
    vec2 d=vKyotoWorld.xz-uTrails[i].xy;float dd=dot(d,d),tw=uTrails[i].z;
    mWake=max(mWake,exp(-dd/900.)*tw);
    float l=sqrt(dd);ring+=tw*exp(-l/46.)*sin(l*.55-(1.-tw)*26.);
  }
  float sh=1.;
  #if defined(USE_SHADOWMAP) && NUM_DIR_LIGHT_SHADOWS > 0
    if(receiveShadow){
      sh=getShadow(directionalShadowMap[0],directionalLightShadows[0].shadowMapSize,directionalLightShadows[0].shadowIntensity,directionalLightShadows[0].shadowBias,directionalLightShadows[0].shadowRadius,vDirectionalShadowCoord[0]);
    }
  #endif
  mSh=mix(1.,sh,.86);
  // Occlusion from the contact field (bake.js): squared twice over so it has no edge anywhere.
  float occ=texture(uContact,mPuv(kp)).r;occ*=occ*(3.-2.*occ);
  mOcc=1.-M_OCC_AMB*occ*uAge;mSh*=1.-M_OCC_ALL*occ*uAge;
  // The film lies thick in the hollows and at the foot of things, thin over raised ground (the coat, kyotoCoatT).
  mThick=(.55+.8*occ+.55*(1.-smoothstep(0.,.3,hs)))*(.85+.3*mVnoise(kp*.3+4.));
  // A flat inlay (cut foil, sheet, coral) is exactly its own outline: the plain ground runs right up to its edge.
  float inlay=clamp((fine.g-.5)/max(fwidth(fine.g),.004)+.5,0.,1.);
#ifdef KYOTO_COAT_ON
  if(uCoatK>0.){
    // Which kind of coat this pixel has (three-pack COAT): sunk chips; a flush inlay's edge, wrapped by the lacquer, in a soft ring inside the outline;
    // or a thin film. Hills, banks and sandbars are raised toward their crest and fade out at the foot: no ring, the crest keeps its own light.
    mKS=0.;mKT=1.;mKE=0.;float mFlat=0.;
    float er=(${COAT.edgeWidth[0].toFixed(2)}+${COAT.edgeWidth[1].toFixed(2)}*uAge)*(.75+.5*mVnoise(kp*.9+3.))*(.8+.4*mThick);
    int ck=T_COAT[mi];
    if(ck==COAT_SUNK){mKS=1.;mKT=0.;}
    else if(ck==COAT_HALF){mKS=.45;mKT=.55;}
    else if(ck==COAT_FOOT){mKS=1.-smoothstep(.01,.14,hs);mKT=1.-mKS;}
    else if(ck==COAT_POWDER30){mKS=1.-smoothstep(.0,.3,fine.g);mKT=1.-mKS;}
    else if(ck==COAT_POWDER35){mKS=1.-smoothstep(.0,.35,fine.g);mKT=1.-mKS;}
    else if(ck==COAT_WATER_EDGE){mFlat=1.;mKE=.3*smoothstep(.0,.5,mEdgeOut(uFine0,0,kp,er,.02,.06));mKT=1.-mKE;}
    else if(ck==COAT_INLAY_EDGE){mFlat=1.;float ke=smoothstep(.0,.5,mEdgeOut(uFine0,0,kp,er,.42,.58));mKE=ke*smoothstep(0.,.25,inlay);mKS=(1.-inlay)*(1.-mKE);mKT=inlay*(1.-ke);}
    else if(ck==COAT_NONE){mKT=0.;mKS=0.;mKE=0.;}
    // Flush inlay has no step: the relief that bevels its outline is left out (the drawn line stays, dimmed inside the ring).
    if(mFlat>0.){
      vec2 gfg=vec2(fx1.g-fx0.g,fz1.g-fz0.g)*cH/(2.*eC)*mix(.55,1.,rise),gfb=vec2(fx1.b-fx0.b,fz1.b-fz0.b)*lH/(2.*eC)*mix(.55,1.,rise);
      grad=gs+gfb;grad*=min(1.,2.4/max(length(grad),1e-4));
    }
  }
#endif
  mSetLight(normalize(normalize(vKyotoNormal)-grad.x*vKyotoTanX-grad.y*vKyotoTanZ),vKyotoWorld);
  float line=fine.b;vec3 L=mLight();
  float w=smoothstep(.02,.34,hs);
  float dens=.82+.22*mVnoise(kp*.02),kAmt=0.,wN=0.,wM=0.,wS=0.,bigD=0.,bigCell=6.6,bigSq=0.,kiriV=0.,kiriB=0.;
  vec3 tint=M_GOLD,f0=M_GOLD,c=vec3(0.);
  float dField=texture(uDens,mPuv(kp)).r;
  // Maki-bokashi: powder gathers toward things and thins in the open. On an old, darker ground the grading carries
  // further (M_AGE_BOKASHI times as strong at age 1): it is what joins a form to the ground it stands on.
  // (Under a bank, a gold suhama or a far mountain the ground is the plain ground itself: their powder is laid over it and thins into it,
  // so nothing marks where their outline runs.)
  // rc: the material's recipe; gold: its metal. The branches below never ask which material it is. (They stay in this body, base first
  // and finish after the shared powder: moved into functions, the shader took most of a minute to compile in Chrome on Windows.)
  int rc=T_RECIPE[mi];bool gold=T_TONE[mi]==TONE_GOLD;
  if(T_DENSITY[mi]){float bk=mix(1.,M_AGE_BOKASHI,uAge);wN=1.;dens*=dField>=uDensMean?1.+M_DENS_MORE*bk*(dField-uDensMean)/max(1.-uDensMean,.05):1.-min(M_DENS_LESS*bk,.6)*(uDensMean-dField)/max(uDensMean,.05);}
  else if(rc==RECIPE_HILL){
    float cloud=T_CLOUD[mi]?mVnoise(kp*.045)*.6+mVnoise(kp*.13)*.3:.55;
    // Land in the Hatsune lids is pale smooth gold; powder gathers thick at the foot and thins toward the crown.
    wM=smoothstep(.06,.62,hs)*(.30+.25*cloud)*.2;wN=1.-wM;dens=mix(dens,2.1,smoothstep(.02,.3,hs)*(1.-wM));
    kAmt=smoothstep(.01,.09,hs)*.85;
    f0=mix(M_GOLD,M_PALE,.55);tint=mix(M_GOLD,M_PALE,.35*w);rise=max(rise,.75);c=M_PALE*line*(.14+.6*L)*w;
  }
  else if(rc==RECIPE_GYOBU){wN=1.;dens=mix(dens,2.,w);kAmt=smoothstep(.01,.09,hs)*.85;c=M_PALE*line*(.12+.5*L)*w;}
  else if(rc==RECIPE_GOLD){wM=1.;c=M_PALE*line*(.12+.6*L)*mix(.5,1.,rise);}
  // Flat silver stands for white things (sand, petals): it dulls but stays pale. Raised and shaded silver goes dark.
  else if(rc==RECIPE_HIRAME){wN=1.;dens=.95;}
  else if(rc==RECIPE_FOIL&&gold){wM=inlay;wN=1.-inlay;f0=M_GOLD*.9;rise=max(rise,.6);bigD=.4;bigCell=7.;bigSq=1.;c=M_PALE*line*(.22+.6*L)*inlay*(1.-mKE);}
  else if(rc==RECIPE_FOIL){wM=inlay;wN=1.-inlay;f0=mAgedSilver(mix(M_SILVER,M_GOLD,.25)*.9,kp,.35);rise=max(rise,.6);bigD=.4;bigCell=7.;bigSq=1.;c=M_SILVER*line*(.22+.6*L)*inlay*(1.-mKE);}
  else if(rc==RECIPE_AOGAI){wN=1.;}
  else if(rc==RECIPE_SHEET&&gold){wS=inlay;wN=1.-inlay;f0=M_PALE;c=(M_PALE*glow*.5+mix(M_GOLD,M_PALE,.4)*(.10+.46*L))*inlay;} // gold sheet is polished: the brightest flat gold on the lid, brighter than any powder it lies on
  else if(rc==RECIPE_SHEET){wS=inlay;wN=1.-inlay;f0=mAgedSilver(M_SILVER,kp,.3);}
  else if(rc==RECIPE_KASUMI){wS=.82;wM=.18;f0=M_GOLD;tint=M_GOLD;}
  else if(rc==RECIPE_CORAL){wN=1.-inlay;c=(M_CORAL*(.12+.70*L)+mCoat()*.55)*inlay;}
  else if(rc==RECIPE_LACQUER)c=M_LACQ*(.8+1.4*L)+mCoat()*2.2+M_GOLD*line*(.16+.80*L)*mix(.5,1.,rise);
  else c=mix(vec3(.10,.06,.025)*(.4+.5*L),vec3(1.,.62,.22)*1.15,glow)+M_LACQ;
  c+=wN*mNashiji(kp,dens,tint)+wM*mMetal(kp,f0,rise)+wS*mSheet(f0);
  // Gold suhama and far mountains carry a scatter of larger flakes that catch the light (the powder of the Hatsune set is coarse and of several golds).
  if(T_FLAKE_D[mi]>0.){bigD=T_FLAKE_D[mi];bigCell=T_FLAKE_CELL[mi];}
  vec3 bigG;float bigX=mFlake(M_R2*kp,bigCell,mix(.47,.30,bigSq),bigD,bigSq,.26,bigG);
  if(T_FOIL[mi]){
    vec3 foil=T_TONE[mi]==TONE_GOLD?M_PALE:mAgedSilver(M_SILVER,kp,.6);bigX*=inlay;bigG*=inlay;
    c=mix(c,mSheet(foil)+foil*(.10+.25*L)+foil*glow*(.45+.45*sin(kp.x*.31+kp.y*.17-uTime*9.)),bigX)+foil*bigG*.6;
  }else c=mix(c,tint*vec3(1.,.80,.44)*(.07+.74*L),bigX*.92)+tint*M_AMBER*bigG;
  if(rc==RECIPE_BANK||rc==RECIPE_SUHAMA){
    // Doha. kiri: the string of cut gold squares (B channel at full strength; a rim line is half that).
    float kiri=smoothstep(.86,.98,fine.b);
    if(rc==RECIPE_BANK){
      // A bank. fine.g is its height: 1 at the ridge, falling to 0 where the wedge ends in the lacquer, so its colour fades out with it.
      float Hh=fine.g,ha=smoothstep(.01,.2,Hh),crest=smoothstep(.58,.9,Hh);
      const float eW=3.5;
      vec2 gw=vec2(texture(uFine0,mPuv(kp+vec2(eW,0.))).g-texture(uFine0,mPuv(kp-vec2(eW,0.))).g,texture(uFine0,mPuv(kp+vec2(0.,eW))).g-texture(uFine0,mPuv(kp-vec2(0.,eW))).g);
      float sl=smoothstep(.015,.25,length(gw)),face=-dot(gw/max(length(gw),1e-4),normalize(uKey.xz))*sl;
      if(gold){
        // Gold: dense powder at the crest, thinning down the wedge into the ground's own; large flakes of gyobu on it.
        c=mix(c,mix(mNashiji(kp,mix(1.2,2.2,crest),mix(M_GOLD,M_PALE,.5)),mMetal(kp,mix(M_GOLD,M_PALE,.5+.3*crest),max(rise,.75)),.55)*(1.05+.2*crest),ha*.92);
        vec2 gid,gcen;float gbd=mVoro(M_R2*kp/M_GY_CELL,gid,gcen);
        float hC=texture(uFine0,mPuv(transpose(M_R2)*(gcen*M_GY_CELL))).g;
        float gcov=mGyobuCov(kp,gbd,gid,smoothstep(.01,.3,Hh),smoothstep(.01,.3,hC));
        vec3 gg,gcol=mGyobuShade(gid,gg);
        c=mix(c,gcol,gcov*ha)+gg*gcov*ha;
        c=mix(c,mMetal(kp,mix(M_GOLD,M_PALE,.7),max(rise,.7)),crest*.5*ha);
      }else{
        // Silver: a sheet of sulphided silver over the wedge; it fades into the ground the same way.
        c=mix(mHirame(c,kp,ha*.96,max(rise,.7)),mMetal(kp,mAgedSilver(M_OXID,kp,1.),1.)*.8,.28*ha);
      }
      // The side turned from the light carries the sulphide (silver is the shade of a bank).
      c=mix(c,mMetal(kp,mAgedSilver(M_OXID,kp,1.),1.)*.8,clamp(max(-face,0.)*1.3,0.,.75)*ha*(gold?1.:.6));
      // Below the crest, away from the light, the powder lies deeper under the lacquer: a darker, redder gold.
      if(gold)c*=1.-.34*clamp(max(-face,0.)*1.2,0.,1.)*ha;
      kiriB=ha;
    }else{
      // A suhama tongue (togidashi): ground flush with the lid, no step and no shade at its edge.
      if(gold){
        // Gold suhama. fine.g is how thick the powder lies: 1 along the drawn edge, thinning away from it until it is the ground's own
        // sprinkle (maki-bokashi). Thick, it is a polished, finely raked sand, brighter and yellower than the ground; thin, single flakes.
        float dn=fine.g,body=smoothstep(.35,.9,dn),a=smoothstep(.0,.1,dn);
        float rake=.93+.07*sin(kp.y*2.1+mVnoise(kp*.06)*7.)*(.6+.4*mVnoise(kp*.4));
        vec3 pw=mix(mNashiji(kp,mix(dens,2.8,pow(dn,1.3)),mix(tint,mix(M_GOLD,M_PALE,.35),a)),mMetal(kp,M_GOLD,max(rise,.8)),.4*body)*mix(vec3(1.),vec3(1.3,1.18,.96)*rake,body);
        c=mix(c,pw,a);
        // Larger flakes lie in the powder and glint as the light moves: the face is not one flat tone.
        c=mix(c,mix(M_GOLD,M_PALE,.55)*(.1+.85*L),bigX*.5*a)+M_AMBER*bigG*.55*a;
        // The drawn edge: a fine line of pale gold laid on top (tsukegaki).
        c=mix(c,mMetal(kp,mix(M_GOLD,M_PALE,.7),1.)*1.2,smoothstep(.1,.45,line)*.9);
        kiriB=a;
      }else{
        // Silver suhama, made the way the gold is: fine.g is how thick the powder lies, 1 along the drawn edge, thinning away from it into
        // the ground's own sprinkle. Thick, it is a matt grey-white body with flat flakes in it; thin, single silver flakes on the lacquer.
        float dn=fine.g,body=smoothstep(.3,.85,dn),a=smoothstep(.0,.1,dn);
        vec3 sil=mAgedSilver(mix(M_SILVER,M_OXID,.4),kp,.8);
        vec3 pw=mix(mNashiji(kp,mix(dens,2.6,pow(dn,1.3)),mix(tint,sil,.35+.5*a)),mix(mHirame(mMetal(kp,sil,max(rise,.8))*.9,kp,.8,max(rise,.8)),mMetal(kp,mAgedSilver(M_OXID,kp,1.),1.)*.8,.25),.2+.7*body);
        c=mix(c,pw,a);
        c=mix(c,mMetal(kp,mix(M_SILVER,M_PALE,.25),1.)*1.1,smoothstep(.1,.45,line)*.8);
        kiriB=a;
      }
    }
    c=mix(c,mKiriColor(mix(M_GOLD,M_PALE,.8))*mix(1.5,1.,uAge)+M_PALE*.12*kiri,kiri);
    kiriV=kiri;
  }
  if(rc==RECIPE_TOYAMA){
    // Toyama (a far mountain, niku-ai togidashi): the ridge is a raised, hard edge (a step where it lies over the head behind it, and the
    // ground is ground down to the same level a little below); fine powder, densest and brightest on it, thinning evenly down the slope until
    // it is the ground's own. No flake, no cut gold, no grain but the powder's. Powder is laid on or left off; no dark is mixed in.
    float Ht=fine.g,a=smoothstep(.0,.85,Ht),ridgeV=smoothstep(.45,1.,Ht),edgeV=smoothstep(.6,1.,Ht);
    // A silver head (24) is made the way a gold one is: opaque pale silver powder, a warm neutral, thinning from the ridge to the ground. Its ridge is a line of gold.
    // A blue-gold head (24, aokin: gold with silver in it) is a pale, greenish gold, never white.
    vec3 pw=gold?mix(M_GOLD,M_PALE,.5):vec3(.86,.90,.62);
    vec3 pwd=mNashiji(kp,mix(1.4,2.5,Ht),pw)*mix(1.55,2.1,ridgeV);
    // Silver is laid thick: opaque over most of the face (the ground's flakes do not show through), and only the last of the slope thins into the ground.
    if(!gold){pwd=mix(mMetal(kp,pw*.9,.9)*1.1,pwd*1.05,.35);a=1.-pow(1.-smoothstep(.0,.4,Ht),2.4);}
    // Gold: toward the ridge the powder closes into a matt body (the ground's flakes no longer show through); lower down it is a veil.
    else{pwd=mix(pwd,mMetal(kp,pw,.9)*1.05,.3+.4*smoothstep(.1,.7,Ht));a=1.-pow(1.-smoothstep(.0,.45,Ht),2.);}
    if(gold)pwd=mix(pwd,mix(M_GOLD,M_PALE,.6)*(.1+.85*L),bigX*.45)+M_AMBER*bigG*.5;
    c=mix(c,pwd,a)+(!gold?mMetal(kp,M_GOLD*1.25,1.)*1.5*smoothstep(.55,.9,Ht):mMetal(kp,pw,.9)*.9*edgeV);
  }
  if(kAmt>0.){
    // Halftone kirikane on banks: light-facing slopes and the rim of the bank get the big pieces.
    // Which way the bank faces the light, from the soft relief's slope: the lit face gets big pieces, the far face
    // is left darker with only specks, so the pieces carry the bank's depth.
    float slope=smoothstep(.02,.25,length(gs)),face=-dot(gs/max(length(gs),1e-4),normalize(uKey.xz))*slope;
    float rim=smoothstep(.0,.04,hs)*(1.-smoothstep(.1,.7,hs));
    // Silver carries the shade: the Hatsune rocks and sandbars are gold where lit and grey silver on the far face.
    c=mix(c*(1.-.14*kAmt),mMetal(kp,mAgedSilver(M_OXID,kp,1.),1.)*.82,clamp(kAmt*max(-face,0.)*1.1,0.,.75));
    // One gradient from the rim inward, carried by two techniques (Hatsune rocks and sandbars): kirikane at the bright
    // end, thinning; dense nashiji under and between the pieces, carrying on past the last piece and thinning in turn
    // into the plain ground.
    float g=clamp(.08+.85*rim+.6*max(face,0.)-.25*max(-face,0.),0.,1.);
    c=mix(c,mNashiji(kp,mix(1.,2.4,smoothstep(.1,.75,g)),mix(M_GOLD,M_PALE,.3)),kAmt*smoothstep(.02,.4,g)*.92);
    {
      // Gyobu nashiji: the face of the bank is large irregular flakes in the lacquer, denser toward the crown, thinning down the slope.
      vec2 gid,gcen;float gbd=mVoro(M_R2*kp/M_GY_CELL,gid,gcen);
      float hC=texture(uSoft0,mPuv(transpose(M_R2)*(gcen*M_GY_CELL))).r;
      float dN=.8+.4*mVnoise(kp*.03);
      float gcov=mGyobuCov(kp,gbd,gid,smoothstep(.01,.10,hs)*mix(.82,1.,smoothstep(.1,.45,hs))*dN,smoothstep(.01,.10,hC)*mix(.82,1.,smoothstep(.1,.45,hC)));
      vec3 gg,gcol=mGyobuShade(gid,gg);
      c=mix(c,gcol,gcov)+gg*gcov;
    }
    vec2 td=normalize(vec2(-gs.y,gs.x)+vec2(.012,0.));
    vec3 kg;float kv=mKiriCluster(kp,td,smoothstep(.35,1.,g)*kAmt/.85,kg);
    // Old foil has gone flat: it is still the lightest thing on the bank, but it no longer flashes.
    c=mix(c,mKiriColor(mix(M_GOLD,M_PALE,.75))*mix(1.15,.74,uAge),kv)+M_PALE*kg*mix(1.,.4,uAge);
    kiriV=kv;
  }
  if(rc==RECIPE_HIRAME){
    // Silver hirame ground: coarse silver flakes of two sizes lie close under the lacquer, each a little brighter or
    // darker than its neighbours. Toward the garden's edge they thin and the gold nashiji shows between them, then alone.
    float inn=1.;
    for(int k=0;k<8;k++){float a=float(k)*.7854;vec2 dv=vec2(cos(a),sin(a));inn+=float(mIdent0(kp+dv*5.).x==id)+float(mIdent0(kp+dv*10.).x==id)+float(mIdent0(kp+dv*16.).x==id);}
    float dS=smoothstep(.45,.9,inn/25.+(mVnoise(kp*.25)-.5)*.16);
    c=mHirame(c,kp,dS,rise);
    // It stands for white sand: where the flakes lie close it is lifted toward a pale, cool silver (it read as a dull taupe mat).
    c=mix(c,c*vec3(1.3,1.33,1.36)+M_SILVER*(.05+.14*L),dS);
  }
  if(rc==RECIPE_AOGAI){
    vec2 r=mHash2(floor(kp/2.3));
    float t=dot(normalize(mN+vec3(r.x-.5,0.,r.y-.5)*.5),mHp)*2.4+r.x*1.7+mAtt*.6;
    vec3 film=mix(vec3(.16,.50,.50),vec3(.26,.40,.70),.5+.5*sin(t*3.1));
    film=mix(film,vec3(.80,.56,.64),smoothstep(.55,1.,.5+.5*sin(t*2.3+2.))*.45);
    c=mix(c,film*(.16+.60*L)+vec3(.9,1.,1.)*mSpec(120.)*.9,clamp((fine.g-.2)/max(fwidth(fine.g)*1.5,.004)+.5,0.,1.));
  }
  if(rc==RECIPE_RYUSUI){
    // Ryusui: tight, swirling, roughly parallel gold lines over gold (the Hatsune trousseau's streams), not a grey band.
    float m=clamp((fine.g-.035)/max(fwidth(fine.g)*1.5,.004)+.5,0.,1.);
    vec2 q=kp+vec2(mVnoise(kp*.035),mVnoise(kp*.035+7.3))*14.;
    float ph=(q.y+sin(q.x*.085+q.y*.02)*5.5+sin(q.x*.23+q.y*.05)*1.6)/3.4-uTime*.05;
    float fw=fwidth(ph),d=abs(fract(ph)-.5)*2.;
    float ln=mix(1.-smoothstep(.26-fw,.26+fw,d),.26,smoothstep(.22,.55,fw));
    float flow=.55+.45*sin(kp.y*.20-uTime*1.5+kp.x*.06);
    // Depth: how far this point is from the pond's own edge (share of the points around it, out to 40 units, that are water).
    float inn=0.;
    for(int k=0;k<8;k++){float a=float(k)*.7854+.39;vec2 dv=vec2(cos(a),sin(a));inn+=float(mIdent0(kp+dv*10.).x==id)+float(mIdent0(kp+dv*22.).x==id)+float(mIdent0(kp+dv*40.).x==id);}
    float deep=smoothstep(.45,.96,inn/24.+(mVnoise(kp*.05)-.5)*.12);
    // Broad swells: every few lines the water lightens and darkens, so it still reads as water when the lines are too fine to see.
    float sw=.5+.5*sin(ph*.55+mVnoise(kp*.018)*5.);
    // Powder lies thick and pale along the shore and thins toward the middle, where the lines carry the water (maki-bokashi).
    vec3 shoal=mMetal(kp,mix(M_GOLD,M_PALE,.15)*.86,.9)*.95+tint*vec3(.36,.17,.045)*(.10+.30*L);
    vec3 pool=mNashiji(kp,1.3,mix(M_GOLD,M_PALE,.15))*.9;
    vec3 base=mix(shoal,pool,deep*.75)+mKeyC*mBand*.10;
    vec3 crest=mSheet(M_PALE)*.45+mix(M_PALE,M_GOLD,.3)*(.10+.62*L)*(.8+.2*flow)+M_PALE*mBand*.12;
    vec3 wtr=mix(base,crest,ln)+M_SILVER*line*(.08+.36*L)*(.5+.5*flow)+M_SILVER*max(ring,0.)*.5*(.2+L)+mCoat()*.6;
    // The depth and the swells are laid over the whole of it (lines and gloss too): the lines and the lid's gloss are most of the water's
    // brightness away from the light, so a depth carried by the powder alone is lost there, and on a phone, where no light follows a pointer.
    wtr*=mix(vec3(1.),vec3(.85,.76,.62),deep)*mix(.9,1.1,sw);
    // A silver shore just inside the water's edge (the Hatsune sandbars and banks are grey silver).
    float e=.25*(texture(uFine0,mPuv(kp+vec2(7.,0.))).g+texture(uFine0,mPuv(kp-vec2(7.,0.))).g+texture(uFine0,mPuv(kp+vec2(0.,7.))).g+texture(uFine0,mPuv(kp-vec2(0.,7.))).g);
    float shore=1.-smoothstep(.5,.95,e/max(fine.g,.01));
    wtr=mix(wtr*vec3(1.,.93,.80),mMetal(kp,mAgedSilver(M_OXID,kp,1.),1.)*.85+M_SILVER*line*(.1+.3*L),shore*.35);
    c=mix(c,wtr,m);
  }
  if(uAge>0.&&T_HILL[mi]){
    float wr=smoothstep(.62,.95,hs)*smoothstep(.50,.72,mVnoise(M_R1*kp*.07+5.)*.62+mVnoise(M_R2*kp*.19)*.38)*M_AGE_WEAR*uAge;
    c=mix(c,M_UNDER*(.3+L),wr);
  }
  if(uDensView>4.5)c=T_TIER[mi]==TIER_GROUND?vec3(1.,0.,1.):T_TIER[mi]==TIER_DENSE?vec3(0.,1.,1.):vec3(0.,1.,0.); // dev layers: plain ground magenta, dense-nashiji faces cyan, the rest green
  else if(uDensView>2.5)c=vec3(texture(uContact,mPuv(kp)).r*.8);
  else if(uDensView>1.5)c=T_TIER[mi]==TIER_GROUND?vec3(1.,0.,1.):vec3(0.,1.,0.); // dev mask: which pixels are plain ground
  else if(uDensView>.5)c=vec3(dField*.8);
  if(uDensView>.5&&uDensView<5.5){mKS=0.;mKE=0.;mKT=0.;} // dev views are data, not a picture: no coat on them (the coat view itself needs the three amounts)
  outgoingLight=mFinish(c,1.).rgb;
  if(uDensView>5.5)outgoingLight=vec3(mKS,mKE,mKT); // dev ?dens=coat: sunk red, wrapped edge green, thin film blue
  if(uDensView>3.5&&uDensView<4.5)outgoingLight=vec3(kiriV,0.,T_HILL[mi]?1.-kiriV:kiriB*(1.-kiriV)); // dev: red = kirikane, blue = other hill ground (?dens=kiri)
  diffuseColor.a=1.;
}`;

/** Box sides (box id 20): the lid's nashiji continues down the walls, with a low gold bank and a faint mist band, as
 * on the Hatsune stationery box and document box whose landscapes run onto the sides. uv = (perimeter run, world y). */
export const BOX_SIDE_VERT_GLSL = `varying vec2 vKyotoSide; varying vec3 vKyotoSideW, vKyotoSideN;`;
export const BOX_SIDE_PARS_GLSL = `
varying vec2 vKyotoSide; varying vec3 vKyotoSideW, vKyotoSideN;
${MAKIE_COMMON_GLSL}
float mSideBank(vec2 s){return s.y-(-92.+20.*mVnoise(vec2(s.x*.011,1.3))+9.*mVnoise(vec2(s.x*.043,4.1)));}
float mSideG(vec2 s){float b=mSideBank(s);return (1.-smoothstep(-1.5,1.5,b))*step(s.y,-35.)*(1.-smoothstep(0.,26.,-b));}`;
export const BOX_SIDE_FRAG_GLSL = `
{
  vec2 sp=vKyotoSide;
  mWake=0.;mSh=1.;mSetLight(normalize(vKyotoSideN),vKyotoSideW);
  float body=step(sp.y,-35.);
  float bank=sp.y-(-92.+20.*mVnoise(vec2(sp.x*.011,1.3))+9.*mVnoise(vec2(sp.x*.043,4.1)));
  float land=(1.-smoothstep(-1.5,1.5,bank))*body;
  float mist=smoothstep(.56,.64,mVnoise(vec2(sp.x*.0075,(sp.y+(1.-body)*40.)*.05+2.)))*(1.-land);
  vec3 c=mNashiji(sp,.95,M_GOLD);
  c=mix(c,mMetal(sp,mix(M_GOLD,M_PALE,.5),1.)*.85+mNashiji(sp,1.3,M_PALE)*.2,land*.55);
  c=mix(c,.5*mMetal(sp,M_PALE*.95,1.)+.25*mSheet(M_PALE)+.3*mNashiji(sp,1.6,M_PALE),mist*.45);
  c+=M_PALE*(1.-smoothstep(0.,.9,abs(bank)))*body*(.06+.3*mLight());
  float g=land*(1.-smoothstep(0.,26.,-bank));
  c=mix(c*(1.-.12*land),mNashiji(sp,mix(1.,2.4,smoothstep(.1,.75,g)),mix(M_GOLD,M_PALE,.3)),smoothstep(.02,.4,g)*.9);
  {
    vec2 gid,gcen;float gbd=mVoro(M_R2*sp/M_GY_CELL,gid,gcen);
    float gc=mSideG(transpose(M_R2)*(gcen*M_GY_CELL));
    float gcov=mGyobuCov(sp,gbd,gid,land*mix(.2,.92,g),mix(.2,.92,gc))*land;
    vec3 gg,gcol=mGyobuShade(gid,gg);
    c=mix(c,gcol,gcov)+gg*gcov;
  }
  vec2 td=normalize(vec2(1.,(mSideBank(sp-vec2(1.,0.))-mSideBank(sp+vec2(1.,0.)))*.5));
  vec3 kg;float kv=mKiriCluster(sp,td,smoothstep(.4,1.,g),kg);
  c=mix(c,mKiriColor(mix(M_GOLD,M_PALE,.6)),kv)+M_PALE*kg;
  // Walls face the room, not the window: keep them a warmer, slightly deeper amber than the lid.
  const float K_SIDE_DIM=.82; // dim box walls one step below the lid while keeping rim and edge bright
  // The walls darken toward the foot in one long grade, as a box does that has stood on a shelf.
  float low=smoothstep(-70.,-134.,sp.y);
  c=mix(c,c*vec3(.56,.49,.42),low*low*.6*uAge);
  mThick=.6+1.0*low;
  outgoingLight=mFinish(c*vec3(1.,.86,.62)*.9*K_SIDE_DIM,1.).rgb;
}`;

/** Vertex shader for KIND.mist (suyari-gasumi) bands floating above the hills. */
export const MAKIE_MIST_VERT_GLSL = `
uniform sampler2D uState; uniform mat3 uTilt; uniform float uOpening;
attribute vec4 aOwner;
varying vec3 vKyotoWorld, vKyotoNormal;
varying vec2 vKyotoUv, vKyotoMeta;
varying float vPartId;
${GROUND_GLSL}
void main(){
  int id=int(aOwner.x+.5);vec4 B=texelFetch(uState,ivec2(id,1),0);
  vec2 q=position.xz+B.xy;
  float gy=groundY(q);
  vec3 p=vec3(q.x,gy+B.z+.35,q.y);
  p.y+=uOpening*360.;p.z-=uOpening*650.;
  vec3 centre=vec3(0.,-48.,0.);p=uTilt*(p-centre)+centre;
  vKyotoWorld=p;vKyotoNormal=uTilt*vec3(0.,1.,0.);
  vKyotoUv=position.xz;vKyotoMeta=q;vPartId=aOwner.x;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
}`;

/** Fragment shader for KIND.mist: semi-transparent gold foil drifting over the plate, clipped inside the lid lip. */
export const MAKIE_MIST_FRAG_GLSL = `
uniform sampler2D uState, uMistFine, uMistIdent;
uniform float uDensView;
varying vec3 vKyotoWorld, vKyotoNormal;
varying vec2 vKyotoUv, vKyotoMeta;
varying float vPartId;
out vec4 fragColor;
${MAKIE_COMMON_GLSL}
void main(){
  if(uOpening>.999)discard;
  ivec2 sz=textureSize(uMistIdent,0);
  int id=int(texelFetch(uMistIdent,clamp(ivec2((vKyotoUv+M_HALF)/(2.*M_HALF)*vec2(sz)),ivec2(0),sz-1),0).r*255.+.5);
  if(id==0||id!=int(vPartId+.5))discard;
  vec4 fine=texture(uMistFine,mPuv(vKyotoUv));
  // The band is sprinkled, not cut: its coverage is taken over a few units round the pixel, so that it thins toward its edge, and the
  // powder's own grain decides where the last of it lies (no line anywhere round it).
  float cov=fine.a*2.;
  cov+=texture(uMistFine,mPuv(vKyotoUv+vec2(3.,0.))).a+texture(uMistFine,mPuv(vKyotoUv-vec2(3.,0.))).a+texture(uMistFine,mPuv(vKyotoUv+vec2(0.,3.))).a+texture(uMistFine,mPuv(vKyotoUv-vec2(0.,3.))).a;
  cov+=texture(uMistFine,mPuv(vKyotoUv+vec2(2.1,2.1))).a+texture(uMistFine,mPuv(vKyotoUv-vec2(2.1,2.1))).a+texture(uMistFine,mPuv(vKyotoUv+vec2(2.1,-2.1))).a+texture(uMistFine,mPuv(vKyotoUv-vec2(2.1,-2.1))).a;
  cov+=texture(uMistFine,mPuv(vKyotoUv+vec2(1.4,0.))).a+texture(uMistFine,mPuv(vKyotoUv-vec2(1.4,0.))).a+texture(uMistFine,mPuv(vKyotoUv+vec2(0.,1.4))).a+texture(uMistFine,mPuv(vKyotoUv-vec2(0.,1.4))).a;
  cov/=14.;
  float grain=mVnoise(vKyotoUv*1.7+vPartId*5.)*.6+mVnoise(vKyotoUv*.35+vPartId)*.4;
  float core=smoothstep(.5,.92,cov),alpha=smoothstep(.22+.2*grain,.58+.22*grain,cov)*.92;
  vec2 lip=1.-smoothstep(M_HALF-5.,M_HALF-1.,abs(vKyotoMeta));
  alpha*=lip.x*lip.y;
  if(alpha<.01)discard;
  float rise=texelFetch(uState,ivec2(id,0),0).z;
  mWake=0.;mSh=1.;mSetLight(normalize(vKyotoNormal),vKyotoWorld);
#ifdef KYOTO_COAT_ON
  if(uCoatK>0.){ // mist is ground flush: bare face, wrapped edge
    float ke=smoothstep(.0,.4,mEdgeOut(uMistFine,2,vKyotoUv,(${COAT.edgeWidth[0].toFixed(2)}+${COAT.edgeWidth[1].toFixed(2)}*uAge)*(.75+.5*mVnoise(vKyotoUv*.9+3.)),.45,.6));
    mKS=0.;mKE=ke;mKT=1.-ke;
  }
#endif
  // Suyari-gasumi in the Hatsune lids is dense, bright gold (濃梨子地 into flat gold), clearly richer than the ground.
  // Thin at its edge it is single flakes on the lacquer; toward its middle the powder closes into pale gold.
  vec3 c=mix(mNashiji(vKyotoUv,mix(1.9,2.9,core),mix(M_GOLD,M_PALE,.25)),mMetal(vKyotoUv,mix(M_GOLD,M_PALE,.45),1.)*1.12,.18+.5*core)*vec3(1.12,1.04,.9);
  // A few long thin strips of pale silver lie in the gold (the Hatsune mist bands carry the two metals): a thread, never the band's colour.
  float sv=smoothstep(.74,.84,mVnoise(vec2(vKyotoUv.x*.012,vKyotoUv.y*.55)+vPartId*3.7))*core;
  c=mix(c,mMetal(vKyotoUv,mAgedSilver(M_SILVER,vKyotoUv,.45),1.)*.95+.15*mSheet(mAgedSilver(M_SILVER,vKyotoUv,.5)),sv*.6);
  fragColor=mFinish(c,alpha);
  if(uDensView>4.5)fragColor=vec4(0.,1.,1.,alpha); // dev layers mask: mist is a dense-nashiji face
}`;
