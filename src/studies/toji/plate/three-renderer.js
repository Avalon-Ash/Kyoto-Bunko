// The makie plate drawn with three.js (docs/MAKIE_THREE_PLAN.md): {setWard, prefetch, draw, poke, active, dispose}.
// The only drawing pipeline since 2026-11-16; where it cannot run, ../renderer.js shows the still picture (static-plate.js).
//
// T0–T2 scope: box and lid, layer 0 ground relief (groundY from baked soft/ident maps) and makie ground/water shaders,
// floating semi-transparent mist (KIND.mist), every part that is already a mesh (p1–p3 buildings, torii, stage, lanterns),
// trees (T2: half-tube limbs with procedural bark + instanced foliage stamps with 2D array texture & alphaTest),
// their motion (createLife → DataTexture → onBeforeCompile hinge), and a DirectionalLight shadow map.
// The creatures and small solids (rocks, fox, phoenix, uguisu, sand cone and bowl, the moat wall) are low-relief meshes
// (creature-mesh.js, rock-mesh.js) like everything else: no part is painted on the lid any more except layer 0 and the mist.
import * as THREE from 'three';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {PLATE, MAT, KIND, rand} from './vocab.js';
import {PLATES, LAYERS, preparePlate, createLife, partAt} from './parts.js';
import {paintLayer, identMaps, bakeDensityField, bakeContactField, bakeSoftField} from './bake.js';
import {blankStats} from './fillers.js';
import {buildBox, FITTINGS} from './box.js';
import {bakeStamps} from './stamps.js';
import {createCord, cordTube} from './cord.js';
import {stepSpring} from './spring.js';
import {groundPoint, normalize, trailIntensity} from '../geometry.js';
import {MESH_COAT} from './mat.js';
import {
  MATERIALS, agedSpec, CONTACT, BOX_MATERIALS, GROUND_LID, STATE_WIDTH, STATE_HEIGHT, packLifeState,
  meshesByMaterial, limbsByMaterial, stampsByMaterial, sliceBox,
  mistGeometryData, PART_MOTION_GLSL, PART_LIGHT_GLSL, PART_POWDER_GLSL, PART_KIRIKANE_GLSL, BOX_MOTION_GLSL, BOX_GROUND_GLSL, BOX_GROUND_DEPTH_GLSL,
  TREE_LIMB_MOTION_GLSL, TREE_STAMP_MOTION_GLSL, DENSITY, COAT, COAT_GLSL,
  MAKIE_GROUND_PARS_GLSL, MAKIE_GROUND_FRAG_GLSL, MAKIE_MIST_VERT_GLSL, MAKIE_MIST_FRAG_GLSL,
  BOX_SIDE_VERT_GLSL, BOX_SIDE_PARS_GLSL, BOX_SIDE_FRAG_GLSL, BOX_INNER_FRAG_GLSL, BOX_PAPER_FRAG_GLSL, ageFromYears,
} from './three-pack.js';

const EYE = [430, 720, 920], TARGET = [0, 40, 0];
/** How old the box looks unless ?age= says otherwise: 0 is as new, 1 is the Hatsune trousseau as it is today. */
const AGE_DEFAULT = .85;
/** ?coat=0..1: the shared tinted-lacquer coat (three-pack COAT, docs/plans/2026-11-16-coat.md). 0, the default, compiles none of it. */
const COAT_DEFAULT = 1; // the recommended strength once the user has chosen (docs/agent-runs/2026-11-16-coat.md)
const COAT_RAW = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('coat') : null;
const COAT_PARAM = COAT_RAW === null ? COAT_DEFAULT : Number(COAT_RAW);
const COAT_ON = Number.isFinite(COAT_PARAM) && COAT_PARAM > 0 ? Math.min(1, COAT_PARAM) : 0;
const COAT_DEFINE = COAT_ON > 0 ? '#define KYOTO_COAT_ON\n' : '';
/** Scales what lies under the coat (the base's four light terms) by the film's transmittance T. */
const coatApply = (lift, cls) => `\n{\n  vec3 kyotoCoatNW = inverseTransformDirection(normal, viewMatrix);\n  vec3 kyotoCoatTT = kyotoCoatPart(kyotoCoatNW, ${lift}, ${cls});\n  reflectedLight.directDiffuse *= kyotoCoatTT; reflectedLight.indirectDiffuse *= kyotoCoatTT;\n  reflectedLight.directSpecular *= kyotoCoatTT; reflectedLight.indirectSpecular *= kyotoCoatTT;\n}`;
const VIEW = normalize(EYE.map((v, i) => v - TARGET[i])), KEY = normalize([-.5, .78, .22]);
const STRIDE = 10;
const SHADOW_SOFT = 6; // PCF shadow filter radius in texels for softer window-light penumbra
const SHADOW_STRENGTH = .8; // Shadow intensity [0..1] so cast shadows are not pitch-black

/** Procedural gold-powder normal map: random small tilted flakes on a flat tangent-space field. No external image. */
export function bakeFlakeNormal(doc, size = 256) {
  const canvas = doc.createElement('canvas'); canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d'), r = rand(7);
  ctx.fillStyle = 'rgb(128,128,255)'; ctx.fillRect(0, 0, size, size);
  // Nashiji powder is fine and dense (Hatsune trousseau close-ups): many small flat flakes, gentle tilt.
  for (let i = 0; i < 5200; i++) {
    const x = r() * size, y = r() * size, rad = .9 + r() * 1.6, a = r() * 6.283, sides = 4 + Math.floor(r() * 2);
    ctx.fillStyle = `rgb(${Math.round(128 + (r() - .5) * 80)},${Math.round(128 + (r() - .5) * 80)},240)`;
    ctx.beginPath();
    for (let k = 0; k < sides; k++) { const t = a + k / sides * 6.283, s = rad * (.7 + r() * .5); ctx[k ? 'lineTo' : 'moveTo'](x + Math.cos(t) * s, y + Math.sin(t) * s); }
    ctx.closePath(); ctx.fill();
    // Wrap the flakes that cross an edge so the map tiles.
    for (const [ox, oy] of [[size, 0], [-size, 0], [0, size], [0, -size]]) if (x < rad * 2 || y < rad * 2 || x > size - rad * 2 || y > size - rad * 2) {
      ctx.save(); ctx.translate(ox, oy); ctx.beginPath();
      for (let k = 0; k < sides; k++) { const t = a + k / sides * 6.283; ctx[k ? 'lineTo' : 'moveTo'](x + Math.cos(t) * rad, y + Math.sin(t) * rad); }
      ctx.closePath(); ctx.fill(); ctx.restore();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(1 / 16, 1 / 16);
  return texture;
}

/** Procedural 8-layer stamp atlas (R = thin relief, G = coverage, B = incised veins/needles) uploaded as a DataArrayTexture. */
function bakeStampTexture(doc, maxAniso) {
  const {size, layers} = bakeStamps(doc);
  const data = new Uint8Array(size * size * 4 * layers.length);
  layers.forEach((pixels, i) => data.set(pixels, i * size * size * 4));
  const texture = new THREE.DataArrayTexture(data, size, size, layers.length);
  texture.format = THREE.RGBAFormat; texture.type = THREE.UnsignedByteType;
  texture.minFilter = THREE.LinearMipmapLinearFilter; texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true; texture.anisotropy = maxAniso;
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

/**
 * @param {WebGL2RenderingContext} gl the canvas's WebGL2 context
 * @param {HTMLCanvasElement} canvas
 * @param {() => void} [onReady] called once the first plate's shaders have compiled and it can be drawn (loading() turns false)
 */
export function createThreeRenderer(gl, canvas, onReady) {
  const doc = canvas.ownerDocument;
  const renderer = new THREE.WebGLRenderer({canvas, context: gl, antialias: true, alpha: true});
  renderer.setPixelRatio(1);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  const disposables = [];
  const own = object => { disposables.push(object); return object; };

  const scene = new THREE.Scene();
  try {
    const pmrem = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment(), env = pmrem.fromScene(room, .04);
    scene.environment = env.texture; own(env); pmrem.dispose(); room.dispose?.();
  } catch (error) { console.warn('Environment map unavailable:', error); }

  // The camera is the page's: view and projection come in as one matrix and are split into three's two.
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 2200);
  camera.position.set(...EYE); camera.up.set(0, 1, 0); camera.lookAt(...TARGET); camera.updateMatrixWorld(true);
  const pageMatrix = new THREE.Matrix4();

  const ambient = new THREE.AmbientLight('#ffffff', .5);
  const key = new THREE.DirectionalLight('#ffffff', 3);
  key.position.set(KEY[0] * 700, KEY[1] * 700, KEY[2] * 700);
  const shadowSize = canvas.clientWidth < 700 ? 1024 : 2048;
  Object.assign(key.shadow.camera, {left: -480, right: 480, top: 420, bottom: -420, near: 50, far: 1500});
  key.castShadow = true; key.shadow.mapSize.set(shadowSize, shadowSize); key.shadow.bias = -.0006; key.shadow.normalBias = 1.2;
  key.shadow.radius = SHADOW_SOFT; key.shadow.intensity = SHADOW_STRENGTH;
  key.shadow.camera.updateProjectionMatrix();
  const lamp = new THREE.PointLight('#ffe2b0', 0, 0, 2);
  scene.add(ambient, key, key.target, lamp);

  // Per-part motion, written every frame: row 0 = (sway, stand, rise, glow), row 1 = (dx, dz, lift, group).
  const stateData = new Float32Array(STATE_WIDTH * STATE_HEIGHT * 4);
  const stateTexture = own(new THREE.DataTexture(stateData, STATE_WIDTH, STATE_HEIGHT, THREE.RGBAFormat, THREE.FloatType));
  stateTexture.minFilter = stateTexture.magFilter = THREE.NearestFilter; stateTexture.needsUpdate = true;
  const dummyRgba = own(new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1, THREE.RGBAFormat, THREE.UnsignedByteType)); dummyRgba.needsUpdate = true;
  const dummyRg = own(new THREE.DataTexture(new Uint8Array([0, 0]), 1, 1, THREE.RGFormat, THREE.UnsignedByteType)); dummyRg.unpackAlignment = 1; dummyRg.needsUpdate = true;
  const dummySoft = own(new THREE.DataTexture(new Uint16Array([0]), 1, 1, THREE.RedFormat, THREE.HalfFloatType)); dummySoft.unpackAlignment = 1; dummySoft.needsUpdate = true;
  // Dev only: ?dens=off leaves the ground's powder at its flat density (and skips the bake), ?dens=view paints the field, ?dens=mask paints plain ground magenta (for measuring), ?dens=contact paints the contact field.
  const densMode = import.meta.env.DEV ? new URLSearchParams(location.search).get('dens') : null;
  // Dev only: ?clock=<ms> pins every clock the picture depends on (the shader's uTime, the creatures' time; the pointer's trails are
  // left out), so that two pictures of the same code are the same pixels (scripts/plate-diff.mjs). The app's own animation clock is not
  // touched: cabinets still switch and the lid still opens.
  const clockParam = import.meta.env.DEV ? new URLSearchParams(location.search).get('clock') : null;
  const fixedClock = clockParam !== null && clockParam !== '' && !Number.isNaN(Number(clockParam)) ? Number(clockParam) : null;
  // Dev only: ?cold gives the ground shader a used uniform with a new name on every load, so the browser's shader cache misses and the
  // first visit's compile can be measured (docs/plans/2026-11-18-material-table.md §8.12). Without it the shader text is unchanged.
  const coldProbe = import.meta.env.DEV && new URLSearchParams(location.search).has('cold') ? `uCold${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}` : '';
  // Dev only: ?matSwap=21:19,2:3 draws material 21 as 19 and 2 as 3 on the lid, so that ground-shader paths no ward uses can be exercised.
  const matSwap = new Map(import.meta.env.DEV ? (new URLSearchParams(location.search).get('matSwap') ?? '').split(',').filter(Boolean).map(pair => pair.split(':').map(Number)) : []);
  // ?age=0..1 sets how old the box looks (0 is as new); every ageing effect is scaled by it.
  const ageParam = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('age') : null;
  // ?years=N sets the lid's age in years (0: fresh from the workshop; 387: the Hatsune trousseau's age); ?age=0..1 sets uAge itself.
  const yearsParam = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('years') : null;
  const ageValue = yearsParam !== null && !Number.isNaN(Number(yearsParam)) ? ageFromYears(Number(yearsParam))
    : ageParam === null || Number.isNaN(Number(ageParam)) ? AGE_DEFAULT : Math.min(1, Math.max(0, Number(ageParam)));
  const neutralDens = own(new THREE.DataTexture(new Uint8Array([128]), 1, 1, THREE.RedFormat, THREE.UnsignedByteType)); neutralDens.unpackAlignment = 1; neutralDens.needsUpdate = true;
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const stampTex = own(bakeStampTexture(doc, maxAniso));
  const trails = Array.from({length: 20}, () => new THREE.Vector3());
  const shared = {
    uState: {value: stateTexture}, uTilt: {value: new THREE.Matrix3()}, uOpening: {value: 0},
    uSoft0: {value: dummySoft}, uIdent0: {value: dummyRg}, uFine0: {value: dummyRgba}, uDens: {value: neutralDens}, uContact: {value: dummyRgba}, uDensMean: {value: .5}, uDensView: {value: densMode === 'view' ? 1 : densMode === 'mask' ? 2 : densMode === 'contact' ? 3 : densMode === 'kiri' ? 4 : densMode === 'coat' ? 6 : 0},
    uMistFine: {value: dummyRgba}, uMistIdent: {value: dummyRg}, uStamps: {value: stampTex},
    uView: {value: new THREE.Vector3(...VIEW)}, uKey: {value: new THREE.Vector3(...KEY)}, uLamp: {value: new THREE.Vector3(0, 70, 0)},
    uTime: {value: 0}, uNight: {value: 1}, uPresence: {value: 0}, uPx: {value: 1}, uTrails: {value: trails},
    uAge: {value: ageValue},
    uCoatK: {value: 0}, uCoatUp: {value: new THREE.Vector3(0, 1, 0)}, uCoatV: {value: new THREE.Vector3(...VIEW)}, uCoatL: {value: new THREE.Vector3(...KEY)},
  };
  shared.uCoatK.value = COAT_ON * shared.uAge.value;
  if (import.meta.env.DEV) window.__kyotoPlateUniforms = shared; // scripts/plate-shot.mjs flips uDensView to mask the lid
  // Dev only: the three.js renderer, to read the programs' shader sources (timing a shader's compile outside the browser's caches:
  // docs/plans/2026-11-18-material-table.md 8.12).
  if (import.meta.env.DEV) window.__kyotoRenderer = renderer;
  // scripts/plate-clip.mjs reads the settled pose of the ward on screen and measures interpenetration (clip-probe.js).
  if (import.meta.env.DEV) window.__kyotoPlatePose = () => ({ward: plate.ward, parts: plate.parts, soft: plate.soft, ident: plate.ident, mw: plate.mw, mh: plate.mh, a: Float32Array.from(life.a), b: Float32Array.from(life.b)});
  if (import.meta.env.DEV) window.__kyotoPlateProbe = opts => import('./clip-probe.js').then(m => m.probeClip(window.__kyotoPlatePose(), opts));

  const flake = own(bakeFlakeNormal(doc));
  const NORMAL_FIX = THREE.ShaderChunk.normal_fragment_begin.replace('gl_FrontFacing ? 1.0 : - 1.0', '1.0');
  const bindGlow = (shader, spec) => {
    Object.assign(shader.uniforms, shared);
    shader.uniforms.uGlowBase = {value: spec.glow ? .3 : 1};
    shader.uniforms.uGlowGain = {value: spec.glow ? 1.8 : 0};
  };
  /** Faces are lit by their own normals whichever way they wind. */
  const patchMaterial = (material, spec, glsl, call) => {
    const isPart = call === 'kyotoMotion';
    // The columns are the material's own (mat.js meshLook): this function reads them and decides nothing per material.
    // Only rock mounds (meshRock bodyMat) carry `rock` among 3D part meshes; tiles use kirikane/kirigin.
    const isRock = isPart && Boolean(spec.rock), isSilverRock = spec.rock === 'silver';
    const isLacq = isPart && spec.shinnuri;
    const isRockP = isPart && spec.rockPowder;
    const isCoat = COAT_ON > 0 && spec.coat !== 'none';
    const coatClass = MESH_COAT[spec.coat];
    const isPowder = isPart && spec.grain === 'powder', isLeaf = isPart && spec.grain === 'leaf', isGrain = isPowder || isLeaf;
    material.customProgramCacheKey = () => `kyoto-${call}-${spec.glow ? 1 : 0}${isPart ? '-l2w' : ''}${isRock ? `-rock-kiri-v5${isSilverRock ? 's' : ''}` : ''}${isLacq ? '-shinnuri' : ''}${isRockP ? '-rockp-v1' : ''}${isPowder ? '-powder-v1' : ''}${isLeaf ? '-leaf-v1' : ''}${isCoat ? '-coat-v1' : ''}`;
    material.onBeforeCompile = shader => {
      bindGlow(shader, spec);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${isRock || isRockP ? 'varying vec2 vRockUv;\n' : ''}${isGrain ? 'varying vec2 vKyotoUv; varying vec3 vKyotoRest;\n' : ''}${glsl}`)
        .replace('#include <beginnormal_vertex>', `vec3 kyotoP; vec3 objectNormal; ${call}(position, normal, kyotoP, objectNormal);`)
        .replace('#include <begin_vertex>', `vec3 transformed = kyotoP;${isRock || isRockP ? ' vRockUv = uv;' : ''}${isGrain ? ' vKyotoUv = uv; vKyotoRest = position;' : ''}`);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\nvarying float vGlow; uniform float uGlowBase, uGlowGain;${isCoat ? `\n${COAT_GLSL}` : ''}${isPart ? `\n${PART_LIGHT_GLSL}` : ''}${isGrain ? `\n${PART_POWDER_GLSL}` : ''}${isRockP ? '\nvarying vec2 vRockUv;' : ''}${isRock ? `\nuniform float uPx;\nvarying vec2 vRockUv;\nconst bool kyotoRockSilver = ${isSilverRock};\n${PART_KIRIKANE_GLSL}` : ''}`)
        .replace('#include <normal_fragment_begin>', NORMAL_FIX)
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance *= uGlowBase + vGlow * uGlowGain;');
      if (isRock) {
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <color_fragment>', `#include <color_fragment>
vec2 kyotoRockXZ = vRockUv;
vec3 kyotoRockNW = inverseTransformDirection(normalize(vNormal), viewMatrix);
float kyotoRockNL = dot(kyotoRockNW, normalize(uKey));
float kyotoRockLit = smoothstep(K_ROCK_LIT_LO, K_ROCK_LIT_HI, kyotoRockNL);
// Foil grows with the light it faces, thins toward the foot, and swells along the outline.
float kyotoRockRim = pow(1. - clamp(dot(normalize(vNormal), normalize(vViewPosition)), 0., 1.), K_ROCK_RIM_EXP);
float kyotoRockAmt = smoothstep(K_ROCK_AMT_LO, K_ROCK_AMT_HI, kyotoRockNL) * mix(K_ROCK_LOW_AMT, 1., smoothstep(1.5, 12., vLift)) + kyotoRockRim * K_ROCK_RIM_AMT;
vec2 kyotoRockTilt; float kyotoRockTone;
float kyotoRockKiri = kyotoRockKiriPattern(kyotoRockXZ, kyotoRockAmt, uPx, kyotoRockTilt, kyotoRockTone);
vec3 kyotoRockFoil = kyotoRockSilver ? kyotoAgedSilver(mix(K_ROCK_FOIL_OXID, K_ROCK_FOIL_SILVER, smoothstep(.15, .6, kyotoRockAmt)), mix(1., .35, smoothstep(.15, .6, kyotoRockAmt))) : mix(K_ROCK_FOIL_OXID, kyotoKiriGold(), smoothstep(.15, .6, kyotoRockAmt));
// Old foil is uneven: some squares have dulled, more of them in silver than in gold.
kyotoRockFoil *= mix(.9 + .2 * kyotoRockTone, kyotoRockSilver ? .62 + .62 * kyotoRockTone : .74 + .42 * kyotoRockTone, uAge);
diffuseColor.rgb = mix(kyotoAgedSilver(K_ROCK_BODY_SHADE, 1.), kyotoRockSilver ? kyotoAgedSilver(K_ROCK_BODY_SILVER, .8) : K_ROCK_BODY_GOLD, kyotoRockLit);
diffuseColor.rgb = mix(diffuseColor.rgb, kyotoRockFoil, kyotoRockKiri * K_ROCK_KIRI_COVER);
// The mound rises out of the lid: at its foot it is still the ground's own tone, with no edge between them.
diffuseColor.rgb = mix(diffuseColor.rgb, K_ROCK_FOOT, (1. - smoothstep(0., K_ROCK_FOOT_H, vLift)) * K_ROCK_FOOT_AMT * uAge);`)
          .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
roughnessFactor = mix(K_OXID_ROUGH, roughnessFactor, kyotoRockLit);
roughnessFactor = mix(roughnessFactor, mix(K_KIRI_ROUGH, K_KIRI_ROUGH_NIGHT, uNight), kyotoRockKiri);`);
      }
      if (isRockP) {
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <color_fragment>', `#include <color_fragment>
{
  // Fine powder: an even grain, a little paler on the faces that turn to the light and a little deeper in the hollows; at its foot the
  // form takes the ground's own tone, so no edge is drawn between them.
  vec2 rg = floor(vRockUv * 1.9);
  float rn = fract(sin(dot(rg, vec2(12.9898, 78.233))) * 43758.5453);
  float rl = smoothstep(-.4, .6, dot(inverseTransformDirection(normalize(vNormal), viewMatrix), normalize(uKey)));
  diffuseColor.rgb *= (.9 + .1 * rn) * mix(.78, 1.12, rl);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.43, .29, .14), (1. - smoothstep(0., 6., vLift)) * .35 * uAge);
}`);
      }
      if (isPowder) {
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <color_fragment>', `#include <color_fragment>
float kyotoPowFine = kyotoPowderFine();
// Powder lies thicker in some places than others (more so as the box ages), and no two grains are the same brightness.
diffuseColor.rgb *= 1. + (kyotoPowderDensity() - .5) * 2. * K_POW_UNEVEN * mix(.45, 1., uAge);
diffuseColor.rgb *= 1. + (kyotoHash3(floor(vKyotoRest * K_POW_FREQ)).z - .5) * .4 * kyotoPowFine;`)
          .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
normal = normalize(normal + (kyotoHash3(floor(vKyotoRest * K_POW_FREQ)) - .5) * 2. * K_POW_TILT * kyotoPowFine * mix(1.15, 1., uAge));`);
      }
      if (isLeaf) {
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <color_fragment>', `#include <color_fragment>
float kyotoWoodH = kyotoWood(), kyotoLeafFn = kyotoLeafFine();
// Foil is never dead flat: it sags a little over the wood, and the grain shows through, more as it wears thin.
diffuseColor.rgb *= 1. + (kyotoWoodH - .5) * K_LEAF_TONE * kyotoLeafFn * mix(.5, 1., uAge);
diffuseColor.rgb *= 1. + (kyotoVnoise(vKyotoRest.xz * .23 + vKyotoRest.y * .1) - .5) * .06 * kyotoLeafOn();`)
          .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
{
  vec2 kyotoDH = vec2(dFdx(kyotoWoodH), dFdy(kyotoWoodH)) * K_LEAF_BUMP * kyotoLeafFn * mix(.5, 1., uAge);
  vec3 kyotoSx = dFdx(-vViewPosition), kyotoSy = dFdy(-vViewPosition);
  vec3 kyotoR1 = cross(kyotoSy, normal), kyotoR2 = cross(normal, kyotoSx);
  float kyotoDet = dot(kyotoSx, kyotoR1);
  normal = normalize(abs(kyotoDet) * normal - sign(kyotoDet) * (kyotoDH.x * kyotoR1 + kyotoDH.y * kyotoR2));
}`);
      }
      if (isPart) {
        shader.fragmentShader = shader.fragmentShader.replace('#include <aomap_fragment>', `#include <aomap_fragment>
{
  // L1: contact darkness, strongest at the foot, gone by K_CONTACT_H plate units up.
  float kyotoContact=mix(mix(K_CONTACT_MIN,K_AGE_CONTACT_MIN,uAge),1.,smoothstep(0.,K_CONTACT_H,vLift));
  reflectedLight.indirectDiffuse*=kyotoContact;
  reflectedLight.indirectSpecular*=kyotoContact;
  reflectedLight.directDiffuse*=mix(1.,kyotoContact,.5);
  // L2: the gold ground below lights faces that turn away from the sky (the plate's up follows the box's tilt).
  vec3 kyotoUp=normalize(uTilt*vec3(0.,1.,0.));
  vec3 kyotoNW=inverseTransformDirection(normal,viewMatrix);
  float kyotoDown=.5-.5*dot(kyotoNW,kyotoUp); // hemisphere: walls see half the ground, eaves all of it
  vec3 kyotoBounce=K_BOUNCE_C*K_BOUNCE*mix(1.,K_AGE_BOUNCE,uAge)*kyotoDown*mix(1.,.45,uNight)*kyotoContact;
  reflectedLight.indirectDiffuse+=material.diffuseContribution*kyotoBounce;
  reflectedLight.indirectSpecular+=material.specularColorBlended*kyotoBounce;
  // Soft window reflection in the key-light direction for upward-facing metallic faces (e.g. gold roofs).
  vec3 kyotoR=reflect(-normalize(uView),kyotoNW);
  float kyotoWin=smoothstep(1.-K_WIN_SOFT,1.,dot(kyotoR,normalize(uKey)));
  kyotoWin*=1.-smoothstep(.3,.8,material.roughness);
  reflectedLight.directSpecular+=material.specularColorBlended*kyotoWin*K_WIN*mix(1.,.35,uNight)*kyotoContact;${isLacq ? `
  // Shin-nuri: the black body shows what is around it, the gold ground below and the window above, more so at grazing angles.
  float kyotoFres=.04+.96*pow(1.-clamp(dot(kyotoNW,normalize(uView)),0.,1.),5.);
  float kyotoBelow=smoothstep(.75,.2,dot(kyotoNW,kyotoUp)); // walls and undersides face the gold ground; tops face the room
  vec3 kyotoMirror=mix(K_LACQ_ROOM,K_BOUNCE_C*K_LACQ_GROUND,kyotoBelow)+vec3(1.,.95,.86)*pow(max(dot(kyotoR,normalize(uKey)),0.),K_LACQ_WIN_EXP)*K_LACQ_WIN;
  reflectedLight.indirectSpecular+=kyotoMirror*mix(K_LACQ_MIN,1.,kyotoFres)*K_LACQ_MIRROR*mix(1.,.45,uNight)*kyotoContact;` : ''}${isRock ? `
  float kyotoRockGlint=kyotoKiriGlint(kyotoNW,kyotoRockTilt,kyotoRockKiri,normalize(uKey),normalize(uView),uNight);
  reflectedLight.directSpecular*=mix(vec3(1.),K_KIRI_NIGHT_SPEC_TINT,uNight*kyotoRockKiri);
  reflectedLight.directSpecular+=kyotoRockFoil*kyotoRockGlint*kyotoContact;` : ''}${isPowder ? `
  // Powder: a broad soft sheen, and toward the eave (uv.y is t, 1 at the eave) the face is lit less: the powder is thinner there.
  float kyotoLobe=pow(max(dot(kyotoR,normalize(uKey)),0.),K_POW_LOBE_EXP);
  reflectedLight.directSpecular+=material.specularColorBlended*kyotoLobe*K_POW_LOBE*mix(1.,.35,uNight)*kyotoContact;
  float kyotoEaveLit=1.-K_POW_EAVE*smoothstep(.42,1.,vKyotoUv.y);
  reflectedLight.directDiffuse*=kyotoEaveLit; reflectedLight.indirectDiffuse*=kyotoEaveLit;
  reflectedLight.directSpecular*=kyotoEaveLit; reflectedLight.indirectSpecular*=kyotoEaveLit;` : ''}${isCoat ? coatApply('vLift', coatClass) : ''}
}`);
      }
      if (!isPart && isCoat) shader.fragmentShader = shader.fragmentShader.replace('#include <aomap_fragment>', `#include <aomap_fragment>${coatApply(coatClass === MESH_COAT.sunk ? '8.' : '16.', coatClass)}`);
    };
    return material;
  };
  const patchLimbMaterial = (material, spec) => {
    // Wood is silver where the foliage is gold (Hatsune); a tree that flowers in silver keeps gold wood.
    const silver = spec.wood === 'silver', foil = silver ? 'kyotoAgedSilver(K_ROCK_FOIL_SILVER, .35)' : 'kyotoKiriGold()';
    material.customProgramCacheKey = () => `kyoto-limb-${spec.glow ? 1 : 0}-${silver ? 's' : 'g'}-kiri-v3${COAT_ON > 0 ? '-coat-v1' : ''}`;
    material.onBeforeCompile = shader => {
      bindGlow(shader, spec);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${TREE_LIMB_MOTION_GLSL}\nvarying vec2 vTreeUv;\nvarying float vBark;\nvarying vec3 vTreeTanX, vTreeTanZ;`)
        .replace('#include <beginnormal_vertex>', 'vec3 kyotoP, objectNormal, kyotoTx, kyotoTz; kyotoLimb(position, normal, kyotoP, objectNormal, kyotoTx, kyotoTz);')
        .replace('#include <begin_vertex>', 'vec3 transformed = kyotoP; vTreeUv = uv; vBark = aStyle.z; vTreeTanX = normalize(normalMatrix * kyotoTx); vTreeTanZ = normalize(normalMatrix * kyotoTz);');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\nvarying float vGlow;\nvarying vec2 vTreeUv;\nvarying float vBark;\nvarying vec3 vTreeTanX, vTreeTanZ;${COAT_ON > 0 ? `\nvarying float vLift;\n${COAT_GLSL}` : ''}\nuniform float uGlowBase, uGlowGain, uNight, uPx, uAge;\nuniform vec3 uView, uKey;\n${PART_KIRIKANE_GLSL}`)
        .replace('#include <color_fragment>', `#include <color_fragment>
float kyotoGrain = sin(vTreeUv.x * 2.5 + .5 * sin(vTreeUv.y * .31));
float kyotoRow = floor(vTreeUv.y / 6.5);
float kyotoCu = fract(vTreeUv.x / 5. + mod(kyotoRow, 2.) * .5) - .5;
float kyotoCv = fract(vTreeUv.y / 6.5) - .5;
float kyotoSeam = abs(length(vec2(kyotoCu * 1.7, kyotoCv)) - .48) * 5.;
float kyotoBark = vBark > .5 ? 1. - smoothstep(.18, .6, kyotoSeam) : smoothstep(.62, .93, kyotoGrain);
vec3 kyotoTrunkNW = inverseTransformDirection(normalize(vNormal), viewMatrix);
float kyotoTrunkLit = smoothstep(K_TRUNK_LIT_LO, K_TRUNK_LIT_HI, dot(kyotoTrunkNW, normalize(uKey)));
vec2 kyotoTrunkTilt;
float kyotoTrunkKiri = kyotoKiriPattern(vTreeUv, K_TRUNK_KIRI_CELL, kyotoTrunkLit, uPx, kyotoTrunkTilt) * (1. - kyotoBark * K_TRUNK_BARK_MASK);
diffuseColor.rgb = ${silver ? 'kyotoAgedSilver(mix(K_TRUNK_SILVER_SHADE, K_TRUNK_SILVER_LIT, kyotoTrunkLit), mix(1., .7, kyotoTrunkLit))' : 'mix(diffuseColor.rgb, K_M_OXID * K_TRUNK_OXID_SCALE, (1. - kyotoTrunkLit) * K_TRUNK_OXID_STRENGTH)'};
diffuseColor.rgb *= 1. - kyotoBark * .45;
diffuseColor.rgb = mix(diffuseColor.rgb, ${foil}, kyotoTrunkKiri * K_TRUNK_KIRI_COVER);`)
        .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
roughnessFactor = mix(roughnessFactor, .85, kyotoBark * .5);
roughnessFactor = mix(roughnessFactor, K_OXID_ROUGH, (1. - kyotoTrunkLit) * (1. - kyotoTrunkKiri) * ${silver ? '1.' : 'K_TRUNK_OXID_STRENGTH'});
roughnessFactor = mix(roughnessFactor, mix(K_KIRI_ROUGH, K_KIRI_ROUGH_NIGHT, uNight), kyotoTrunkKiri);`)
        .replace('#include <normal_fragment_begin>', NORMAL_FIX)
        .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = normalize(normal - kyotoGrain * .13 * vTreeTanX - cos(vTreeUv.y * .9) * .06 * vTreeTanZ);')
        .replace('#include <aomap_fragment>', `#include <aomap_fragment>
{
  vec3 kyotoTrunkN = inverseTransformDirection(normal, viewMatrix);
  float kyotoTrunkGlint = kyotoKiriGlint(kyotoTrunkN, kyotoTrunkTilt, kyotoTrunkKiri, normalize(uKey), normalize(uView), uNight);
  reflectedLight.directSpecular *= mix(vec3(1.), K_KIRI_NIGHT_SPEC_TINT, uNight * kyotoTrunkKiri);
  reflectedLight.directSpecular += ${foil} * kyotoTrunkGlint;
}${COAT_ON > 0 ? coatApply('vLift', 1) : ''}`)
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance *= uGlowBase + vGlow * uGlowGain;');
    };
    return material;
  };
  const patchStampMaterial = (material, spec) => {
    material.customProgramCacheKey = () => `kyoto-stamp-${spec.glow ? 1 : 0}${COAT_ON > 0 ? '-coat-v1' : ''}`;
    material.onBeforeCompile = shader => {
      bindGlow(shader, spec);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${TREE_STAMP_MOTION_GLSL}\nvarying vec3 vTreeTanX, vTreeTanZ;`)
        .replace('#include <uv_vertex>', '#include <uv_vertex>\n#ifdef USE_NORMALMAP\nvNormalMapUv = (normalMapTransform * vec3(uv * aStamp.xy, 1.0)).xy;\n#endif')
        .replace('#include <beginnormal_vertex>', 'vec3 kyotoP, objectNormal, kyotoTx, kyotoTz; kyotoStamp(uv, kyotoP, objectNormal, kyotoTx, kyotoTz);')
        .replace('#include <begin_vertex>', 'vec3 transformed = kyotoP; vTreeTanX = normalize(normalMatrix * kyotoTx); vTreeTanZ = normalize(normalMatrix * kyotoTz);');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform highp sampler2DArray uStamps;\nvarying float vGlow;\nvarying vec4 vTree;\nvarying vec2 vTreeScale;\nvarying vec3 vTreeTanX, vTreeTanZ;\nuniform float uGlowBase, uGlowGain;\nvarying float vLift;\n' + (COAT_ON > 0 ? COAT_GLSL : ''))
        .replace('#include <map_fragment>', `#include <map_fragment>
vec4 kyotoInk = texture(uStamps, vTree.xyz);
diffuseColor.a *= kyotoInk.g;
float kyotoLine = kyotoInk.b / max(kyotoInk.g, 0.01);
diffuseColor.rgb *= 1. - kyotoLine * .42;`)
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, .85, kyotoLine * .5);')
        .replace('#include <normal_fragment_begin>', NORMAL_FIX)
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
vec2 kyotoE = 1. / vec2(textureSize(uStamps, 0).xy);
vec2 kyotoGrad = vec2(
  texture(uStamps, vTree.xyz + vec3(kyotoE.x, 0., 0.)).r - texture(uStamps, vTree.xyz - vec3(kyotoE.x, 0., 0.)).r,
  texture(uStamps, vTree.xyz + vec3(0., kyotoE.y, 0.)).r - texture(uStamps, vTree.xyz - vec3(0., kyotoE.y, 0.)).r
) * vTree.w / (2. * kyotoE * vTreeScale);
normal = normalize(normal - kyotoGrad.x * vTreeTanX - kyotoGrad.y * vTreeTanZ);`)
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance *= uGlowBase + vGlow * uGlowGain;');
      if (COAT_ON > 0) shader.fragmentShader = shader.fragmentShader.replace('#include <aomap_fragment>', `#include <aomap_fragment>${coatApply('vLift', 1)}`);
    };
    return material;
  };
  const patchDepth = (key, glsl, beginVertex, fragHook) => {
    const material = new THREE.MeshDepthMaterial({depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide, ...(fragHook ? {alphaTest: .5} : {})});
    material.customProgramCacheKey = () => `kyoto-depth-${key}`;
    material.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, shared);
      shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\n${glsl}`)
        .replace('#include <begin_vertex>', beginVertex);
      if (fragHook) fragHook(shader);
    };
    return own(material);
  };
  const partDepth = patchDepth('kyotoMotion', PART_MOTION_GLSL, 'vec3 kyotoP; vec3 kyotoN; kyotoMotion(position, normal, kyotoP, kyotoN); vec3 transformed = kyotoP;');
  const boxDepth = patchDepth('kyotoBox', BOX_MOTION_GLSL, 'vec3 kyotoP; vec3 kyotoN; kyotoBox(position, normal, kyotoP, kyotoN); vec3 transformed = kyotoP;');
  const groundDepth = patchDepth('kyotoGround', BOX_GROUND_DEPTH_GLSL, 'vec3 kyotoP; vec3 kyotoN; kyotoGround(position, normal, kyotoP, kyotoN); vec3 transformed = kyotoP;');
  const limbDepth = patchDepth('kyotoLimb', TREE_LIMB_MOTION_GLSL, 'vec3 kyotoP, kyotoN, kyotoTx, kyotoTz; kyotoLimb(position, normal, kyotoP, kyotoN, kyotoTx, kyotoTz); vec3 transformed = kyotoP;');
  const stampDepth = patchDepth(
    'kyotoStamp',
    TREE_STAMP_MOTION_GLSL,
    'vec3 kyotoP, kyotoN, kyotoTx, kyotoTz; kyotoStamp(uv, kyotoP, kyotoN, kyotoTx, kyotoTz); vec3 transformed = kyotoP;',
    shader => {
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform highp sampler2DArray uStamps;\nvarying vec4 vTree;')
        .replace('#include <map_fragment>', '#include <map_fragment>\nfloat kyotoCover = texture(uStamps, vTree.xyz).g;\ndiffuseColor.a = clamp((kyotoCover - .5) / max(fwidth(kyotoCover), .02) + .5, 0., 1.);');
    },
  );

  const physical = (spec, extra = {}) => {
    const m = new THREE.MeshPhysicalMaterial({
      color: spec.color, metalness: spec.metalness, roughness: spec.roughness, clearcoat: spec.clearcoat, clearcoatRoughness: spec.clearcoatRoughness,
      side: THREE.DoubleSide, shadowSide: THREE.DoubleSide, ...extra,
    });
    // The coat is one lacquer on everything: no surface sits below COAT.shine of clearcoat, and a glossy-but-not-mirror one takes the shared roughness.
    if (COAT_ON > 0 && spec.shine && !spec.glow) {
      m.clearcoat = Math.max(m.clearcoat, COAT.shine * COAT_ON);
      if (spec.clearcoat <= .6) m.clearcoatRoughness = THREE.MathUtils.lerp(spec.clearcoatRoughness, COAT.shineRough, COAT_ON);
    }
    if (spec.emissive) { m.emissive.set(spec.emissive); m.emissiveIntensity = 1; }
    if (spec.envMapIntensity) m.envMapIntensity = spec.envMapIntensity;
    if (spec.iridescence) { m.iridescence = spec.iridescence; m.iridescenceIOR = spec.iridescenceIOR; m.iridescenceThicknessRange = [...spec.iridescenceThicknessRange]; }
    if (spec.flake) { m.normalMap = flake; m.normalScale.set(spec.flake, spec.flake); }
    return own(m);
  };
  const mesh = (geometry, material, depth, shadow = true) => {
    const m = new THREE.Mesh(geometry, material);
    m.frustumCulled = false; m.castShadow = shadow; m.receiveShadow = true; if (depth) m.customDepthMaterial = depth;
    return m;
  };
  const buffers = (position, normal, uv, part) => {
    const g = own(new THREE.BufferGeometry());
    g.setAttribute('position', new THREE.BufferAttribute(position, 3)); g.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); if (part) g.setAttribute('aPart', new THREE.BufferAttribute(part, 1));
    return g;
  };

  // The box: lid top (ground relief, water, sand, steps, border), then everything from the lid's edge down to the tray and packets.
  const box = buildBox(), boxGroup = new THREE.Group(); scene.add(boxGroup);
  const groundMaterial = physical(GROUND_LID);
  groundMaterial.customProgramCacheKey = () => 'kyoto-ground';
  groundMaterial.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, shared);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${BOX_GROUND_GLSL}`)
      .replace('#include <beginnormal_vertex>', 'vec3 kyotoP; vec3 objectNormal; kyotoGround(position, normal, kyotoP, objectNormal);')
      .replace('#include <begin_vertex>', 'vec3 transformed = kyotoP;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${COAT_DEFINE}${MAKIE_GROUND_PARS_GLSL}`)
      .replace('#include <opaque_fragment>', `${MAKIE_GROUND_FRAG_GLSL}\n#include <opaque_fragment>`)
      .replace('#include <tonemapping_fragment>', '')
      .replace('#include <colorspace_fragment>', '');
    if (coldProbe) {
      shader.uniforms[coldProbe] = {value: 0};
      shader.fragmentShader = shader.fragmentShader.replace('void main() {', `uniform float ${coldProbe};
void main() {`)
        .replace('outgoingLight=mFinish(c,1.).rgb;', `outgoingLight=mFinish(c,1.).rgb+vec3(${coldProbe}*0.);`);
    }
  };
  const mistMaterial = own(new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: {...shared},
    vertexShader: MAKIE_MIST_VERT_GLSL,
    fragmentShader: COAT_DEFINE + MAKIE_MIST_FRAG_GLSL,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
  }));
  Object.assign(mistMaterial.uniforms, shared);
  const [lidTop] = [...sliceBox(box.data, 0, box.lidTop).values()];
  boxGroup.add(mesh(buffers(lidTop.position, lidTop.normal, lidTop.uv, lidTop.part), groundMaterial, groundDepth));
  let boxVertices = box.lidTop;
  for (const [id, slice] of sliceBox(box.data, box.lidTop, box.opaque)) {
    if (!BOX_MATERIALS[id]) throw new Error(`three renderer: no material for box id ${id}`);
    const spec = agedSpec(BOX_MATERIALS[id], shared.uAge.value);
    // The cords are drawn live; the fixed geometry here never carries id 27 (they come from cordTube), but guard anyway.
    const boxMaterial = patchMaterial(physical(spec), spec, BOX_MOTION_GLSL, 'kyotoBox');
    if (spec.nashijiSide) {
      // The walls share the lid's nashiji shader (three-pack BOX_SIDE_*), on top of the box hinge patch.
      const hinge = boxMaterial.onBeforeCompile;
      boxMaterial.customProgramCacheKey = () => 'kyoto-box-side';
      boxMaterial.onBeforeCompile = shader => {
        hinge(shader);
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', `#include <common>\n${BOX_SIDE_VERT_GLSL}`)
          .replace('vec3 transformed = kyotoP;', 'vec3 transformed = kyotoP; vKyotoSide = uv; vKyotoSideW = kyotoP; vKyotoSideN = objectNormal;');
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', `#include <common>\n${COAT_DEFINE}${BOX_SIDE_PARS_GLSL}`)
          .replace('#include <opaque_fragment>', `${BOX_SIDE_FRAG_GLSL}\n#include <opaque_fragment>`);
      };
    } else if (spec.nashijiInner || spec.paperFleck) {
      // The inside and the tray are plain nashiji, the paper is flecked with gold, both over three.js's own lighting (three-pack BOX_INNER_FRAG_GLSL, BOX_PAPER_FRAG_GLSL).
      const innerFrag = spec.paperFleck ? BOX_PAPER_FRAG_GLSL : BOX_INNER_FRAG_GLSL;
      const hinge = boxMaterial.onBeforeCompile;
      boxMaterial.customProgramCacheKey = () => `kyoto-box-inner-${spec.name}`;
      boxMaterial.onBeforeCompile = shader => {
        hinge(shader);
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', `#include <common>\n${BOX_SIDE_VERT_GLSL}`)
          .replace('vec3 transformed = kyotoP;', 'vec3 transformed = kyotoP; vKyotoSide = uv; vKyotoSideW = kyotoP; vKyotoSideN = objectNormal;');
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', `#include <common>\n${COAT_DEFINE}${BOX_SIDE_PARS_GLSL}`)
          .replace('#include <opaque_fragment>', `${innerFrag}\n#include <opaque_fragment>`);
      };
    }
    boxGroup.add(mesh(buffers(slice.position, slice.normal, slice.uv, slice.part), boxMaterial, boxDepth));
    boxVertices += slice.position.length / 3;
  }

  // The cords: a few hundred vertices rewritten every frame, already tilted on the CPU (as before).
  const cords = FITTINGS.map(f => ({...f, cord: createCord(f)}));
  for (const c of cords) c.cord.settle();
  const cordMaterial = physical(BOX_MATERIALS[27]);
  let cordMesh = null, cordCount = 0;
  const setCords = strands => {
    const n = strands.length / STRIDE;
    if (!cordMesh || cordCount !== n) {
      if (cordMesh) { scene.remove(cordMesh); cordMesh.geometry.dispose(); }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage));
      g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage));
      cordMesh = mesh(g, cordMaterial, null); scene.add(cordMesh); cordCount = n;
    }
    const pos = cordMesh.geometry.attributes.position, nor = cordMesh.geometry.attributes.normal;
    for (let i = 0; i < n; i++) {
      pos.array[i * 3] = strands[i * STRIDE]; pos.array[i * 3 + 1] = strands[i * STRIDE + 1]; pos.array[i * 3 + 2] = strands[i * STRIDE + 2];
      nor.array[i * 3] = strands[i * STRIDE + 3]; nor.array[i * 3 + 1] = strands[i * STRIDE + 4]; nor.array[i * 3 + 2] = strands[i * STRIDE + 5];
    }
    pos.needsUpdate = nor.needsUpdate = true;
  };

  const materialCache = (patch, extra = {}) => {
    const cache = new Map();
    return mat => {
      if (!cache.has(mat)) {
        const spec = MATERIALS[mat];
        if (!spec) throw new Error(`three renderer: no material for MAT ${mat}`);
        cache.set(mat, patch(physical(agedSpec(spec, shared.uAge.value), extra), spec));
      }
      return cache.get(mat);
    };
  };
  const partMaterial = materialCache((m, spec) => patchMaterial(m, spec, PART_MOTION_GLSL, 'kyotoMotion'));
  const limbMaterial = materialCache((m, spec) => patchLimbMaterial(m, spec));
  const stampMaterial = materialCache((m, spec) => patchStampMaterial(m, spec), {alphaTest: .45, alphaToCoverage: true});
  const IDENTITY = new THREE.Matrix4();

  const MAX_CACHED = 3; // Maximum number of ward plate entries kept in cache (active + two neighbours)
  let plate = null, life = null, lastTime = 0, wardGroup = null, disposed = false;
  // The first plate is not drawn until every program the scene needs has compiled (renderer.compileAsync, which waits on
  // KHR_parallel_shader_compile instead of stalling the page: the ground shader alone takes 10-15 s on a cold D3D cache,
  // docs/plans/2026-11-18-material-table.md §8.12). Until then loading() is true and the page shows the still picture.
  let compiled = false, compiling = false;
  function compileScene() {
    if (compiled || compiling) return;
    compiling = true;
    const group = wardGroup;
    renderer.compileAsync(scene, camera).catch(error => console.warn('Plate shaders did not precompile:', error)).then(() => {
      compiling = false;
      if (disposed) return;
      // A cabinet changed while it compiled: its parts may need programs of their own (the ground and box ones are ready by now).
      if (wardGroup && wardGroup !== group) { compileScene(); return; }
      compiled = true;
      onReady?.();
    });
  }
  const PREFETCH_DELAY_MS = 900; // let the switch animation settle before the neighbours start building
  let lastNeighbours = [], idleHandle = null, prefetchTimer = null;
  const cache = new Map();
  const presence = {x: 0, v: 0}, drift = {offset: 0, velocity: 0}, size = {w: 0, h: 0};
  const hasIdleCallback = typeof requestIdleCallback === 'function';
  const idle = cb => hasIdleCallback ? requestIdleCallback(cb) : setTimeout(cb, 32);
  const cancelIdle = handle => {
    if (handle === null) return;
    if (hasIdleCallback) cancelIdleCallback(handle);
    else clearTimeout(handle);
  };

  function disposeResources(group, textures) {
    if (group) group.traverse(o => { o.geometry?.dispose(); o.dispose?.(); });
    for (const tex of textures) tex.dispose();
  }

  function disposeEntry(entry) {
    disposeResources(entry.group, entry.textures);
  }

  function evict(keep) {
    for (const [w, slot] of cache) {
      if (keep.has(w)) continue;
      if (slot.entry) disposeEntry(slot.entry);
      else slot.gen?.return();
      cache.delete(w);
    }
    for (const [w, slot] of cache) {
      if (cache.size <= MAX_CACHED) break;
      if (w === plate?.ward) continue;
      if (slot.entry) disposeEntry(slot.entry);
      else slot.gen?.return();
      cache.delete(w);
    }
  }

  /** Incrementally builds a ward's textures, meshes, and stats, yielding after each heavy step. */
  function* buildWard(ward) {
    const group = new THREE.Group();
    const textures = [];
    const scratch = doc.createElement('canvas');
    let committed = false;
    let buildMs = 0;
    try {
      let t = performance.now();
      const {parts, errors} = preparePlate(PLATES[ward]());
      if (errors.length) throw Error(`Plate ${ward}: ${errors.join('; ')}`);
      const w = Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE), canvas.clientWidth < 700 ? 1152 : 1536), h = Math.round(w * PLATE.halfH / PLATE.halfW);
      buildMs += performance.now() - t;
      yield;

      t = performance.now();
      scratch.width = w; scratch.height = h;
      const ctx = scratch.getContext('2d', {willReadFrequently: true});
      paintLayer(ctx, w, h, parts, 0);
      let fine0Img = new Uint8Array(ctx.getImageData(0, 0, w, h).data.buffer); // a view of the readback's own bytes, not a copy of them
      const fine0Tex = new THREE.DataTexture(fine0Img, w, h, THREE.RGBAFormat, THREE.UnsignedByteType);
      fine0Tex.minFilter = THREE.LinearMipmapLinearFilter; fine0Tex.magFilter = THREE.LinearFilter;
      fine0Tex.generateMipmaps = true; fine0Tex.anisotropy = maxAniso; fine0Tex.unpackAlignment = 1; fine0Tex.needsUpdate = true;
      textures.push(fine0Tex);
      buildMs += performance.now() - t;
      yield;

      t = performance.now();
      const soft = bakeSoftField(fine0Img, w, h);
      fine0Img = null;
      const softHalf = new Uint16Array(soft.data.length);
      for (let i = 0; i < soft.data.length; i++) softHalf[i] = THREE.DataUtils.toHalfFloat(soft.data[i]);
      const soft0Tex = new THREE.DataTexture(softHalf, soft.sw, soft.sh, THREE.RedFormat, THREE.HalfFloatType);
      soft0Tex.minFilter = soft0Tex.magFilter = THREE.LinearFilter; soft0Tex.unpackAlignment = 1; soft0Tex.needsUpdate = true;
      textures.push(soft0Tex);
      buildMs += performance.now() - t;
      yield;

      t = performance.now();
      const mw = Math.round(w / 2), mh = Math.round(h / 2), {maps, packed} = identMaps(doc, parts, mw, mh, LAYERS, MAT.ground);
      // The ident map is (part, material) byte pairs: the swap rewrites the material byte only.
      if (matSwap.size) for (let i = 1; i < packed[0].length; i += 2) { const to = matSwap.get(packed[0][i]); if (to !== undefined) packed[0][i] = to; }
      const ident0Tex = new THREE.DataTexture(packed[0], mw, mh, THREE.RGFormat, THREE.UnsignedByteType);
      ident0Tex.minFilter = ident0Tex.magFilter = THREE.NearestFilter; ident0Tex.unpackAlignment = 1; ident0Tex.needsUpdate = true;
      textures.push(ident0Tex);
      buildMs += performance.now() - t;
      yield;

      t = performance.now();
      let densTex = neutralDens, densMean = .5;
      if (densMode !== 'off') {
        const dw = DENSITY.width, dh = Math.round(dw * PLATE.halfH / PLATE.halfW);
        const field = bakeDensityField(doc, parts, dw, dh, DENSITY.falloff);
        for (let i = 0; i < field.length; i++) densMean += field[i];
        densMean = (densMean - .5) / field.length / 255 - DENSITY.refShift;
        densTex = new THREE.DataTexture(field, dw, dh, THREE.RedFormat, THREE.UnsignedByteType);
        densTex.minFilter = densTex.magFilter = THREE.LinearFilter; densTex.unpackAlignment = 1; densTex.needsUpdate = true;
        textures.push(densTex);
      }
      // Where things stand on the lid: age gathers dirt there. Not baked for a box as new.
      let contactTex = dummyRgba;
      if (shared.uAge.value > 0) {
        const cw = CONTACT.width, ch = Math.round(cw * PLATE.halfH / PLATE.halfW);
        contactTex = new THREE.DataTexture(bakeContactField(doc, parts, cw, ch, CONTACT.falloff), cw, ch, THREE.RedFormat, THREE.UnsignedByteType);
        contactTex.minFilter = contactTex.magFilter = THREE.LinearFilter; contactTex.unpackAlignment = 1; contactTex.needsUpdate = true;
        textures.push(contactTex);
      }
      buildMs += performance.now() - t;
      yield;

      // Bare nashiji, for reference only (fillers.js): share farther than 12 units from any part / largest empty radius.
      // A readout for the measuring scripts, not something the plate needs: it is worked out after the ward is up (blankText below).
      const blankText = () => {
        const occupied = new Uint8Array(mw * mh);
        for (const map of maps) for (let i = 0; i < map.length; i++) if (map[i]) occupied[i] = 1;
        const blank = blankStats(occupied, mw, mh, PLATE.halfW * 2 / mw);
        return `${(blank.ratio * 100).toFixed(1)}%/${blank.radius.toFixed(0)}`;
      };

      t = performance.now();
      const addInterleaved = (byMat, getMaterial, depth) => {
        let vertices = 0;
        for (const [mat, data] of byMat) {
          const g = new THREE.BufferGeometry(), buffer = new THREE.InterleavedBuffer(data, 16);
          g.setAttribute('position', new THREE.InterleavedBufferAttribute(buffer, 3, 0)); g.setAttribute('normal', new THREE.InterleavedBufferAttribute(buffer, 3, 3));
          g.setAttribute('uv', new THREE.InterleavedBufferAttribute(buffer, 2, 6));
          g.setAttribute('aOwner', new THREE.InterleavedBufferAttribute(buffer, 4, 8)); g.setAttribute('aStyle', new THREE.InterleavedBufferAttribute(buffer, 4, 12));
          group.add(mesh(g, getMaterial(mat), depth));
          vertices += data.length / 16;
        }
        return vertices;
      };
      const meshVertices = addInterleaved(meshesByMaterial(parts), partMaterial, partDepth);
      const treeVertices = addInterleaved(limbsByMaterial(parts), limbMaterial, limbDepth);
      buildMs += performance.now() - t;
      yield;

      t = performance.now();
      let treeStamps = 0;
      for (const [mat, s] of stampsByMaterial(parts)) {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-.5, 0, -.5, .5, 0, -.5, .5, 0, .5, -.5, 0, .5]), 3));
        g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]), 3));
        g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2));
        g.setIndex([0, 1, 2, 0, 2, 3]);
        g.setAttribute('aPlacement', new THREE.InstancedBufferAttribute(s.placement, 4));
        g.setAttribute('aStamp', new THREE.InstancedBufferAttribute(s.stamp, 4));
        g.setAttribute('aOwner', new THREE.InstancedBufferAttribute(s.owner, 4));
        g.setAttribute('aStyle', new THREE.InstancedBufferAttribute(s.style, 4));
        const im = new THREE.InstancedMesh(g, stampMaterial(mat), s.count);
        for (let i = 0; i < s.count; i++) im.setMatrixAt(i, IDENTITY);
        im.instanceMatrix.needsUpdate = true;
        im.frustumCulled = false; im.castShadow = true; im.receiveShadow = true; im.customDepthMaterial = stampDepth;
        group.add(im);
        treeStamps += s.count;
      }
      buildMs += performance.now() - t;
      yield;

      t = performance.now();
      const uniforms = {uFine0: fine0Tex, uSoft0: soft0Tex, uIdent0: ident0Tex, uDens: densTex, uContact: contactTex};
      const mistParts = parts.filter(p => p.kind === KIND.mist);
      if (mistParts.length) {
        paintLayer(ctx, w, h, mistParts.map(p => ({...p, layer: 1})), 1);
        const mistFineImg = new Uint8Array(ctx.getImageData(0, 0, w, h).data.buffer);
        const mistFineTex = new THREE.DataTexture(mistFineImg, w, h, THREE.RGBAFormat, THREE.UnsignedByteType);
        mistFineTex.minFilter = THREE.LinearMipmapLinearFilter; mistFineTex.magFilter = THREE.LinearFilter;
        mistFineTex.generateMipmaps = true; mistFineTex.anisotropy = maxAniso; mistFineTex.unpackAlignment = 1; mistFineTex.needsUpdate = true;

        const {packed: mistPacked} = identMaps(doc, mistParts.map(p => ({...p, layer: 0})), mw, mh, 1, 0);
        const mistIdentTex = new THREE.DataTexture(mistPacked[0], mw, mh, THREE.RGFormat, THREE.UnsignedByteType);
        mistIdentTex.minFilter = mistIdentTex.magFilter = THREE.NearestFilter; mistIdentTex.unpackAlignment = 1; mistIdentTex.needsUpdate = true;

        textures.push(mistFineTex, mistIdentTex);
        uniforms.uMistFine = mistFineTex;
        uniforms.uMistIdent = mistIdentTex;

        const {position, owner} = mistGeometryData(mistParts);
        const mg = new THREE.BufferGeometry();
        mg.setAttribute('position', new THREE.BufferAttribute(position, 3));
        mg.setAttribute('aOwner', new THREE.BufferAttribute(owner, 4));
        const mistMesh = new THREE.Mesh(mg, mistMaterial);
        mistMesh.frustumCulled = false; mistMesh.castShadow = false; mistMesh.receiveShadow = false; mistMesh.renderOrder = 5;
        group.add(mistMesh);
      }
      scratch.width = scratch.height = 1;
      buildMs += performance.now() - t;
      yield;

      committed = true;
      return {
        ward,
        group,
        textures,
        uniforms,
        densMean,
        stats: {meshVertices, treeVertices, treeStamps, boxVertices, parts: parts.length, blank: blankText},
        plate: {parts, maps, mw, mh, ward, soft, ident: packed[0]},
        buildMs,
      };
    } finally {
      if (!committed) {
        scratch.width = scratch.height = 1;
        disposeResources(group, textures);
      }
    }
  }

  function finish(ward) {
    let slot = cache.get(ward);
    if (!slot) {
      slot = {gen: buildWard(ward), entry: null, warmed: false};
      cache.set(ward, slot);
    }
    if (!slot.entry) {
      try {
        let step = slot.gen.next();
        while (!step.done) step = slot.gen.next();
        slot.entry = step.value;
        slot.gen = null;
      } catch (err) {
        cache.delete(ward);
        throw err;
      }
    }
    return slot.entry;
  }

  function freePlate() {
    if (wardGroup) scene.remove(wardGroup);
    shared.uFine0.value = shared.uMistFine.value = dummyRgba;
    shared.uIdent0.value = shared.uMistIdent.value = dummyRg;
    shared.uSoft0.value = dummySoft; shared.uDens.value = neutralDens; shared.uContact.value = dummyRgba; shared.uDensMean.value = .5;
    wardGroup = null; plate = null; life = null;
  }

  function activate(entry, started, prefetched) {
    if (wardGroup) scene.remove(wardGroup);
    shared.uFine0.value = entry.uniforms.uFine0;
    shared.uSoft0.value = entry.uniforms.uSoft0;
    shared.uIdent0.value = entry.uniforms.uIdent0;
    shared.uDens.value = entry.uniforms.uDens;
    shared.uContact.value = entry.uniforms.uContact;
    shared.uDensMean.value = entry.densMean;
    shared.uMistFine.value = entry.uniforms.uMistFine ?? dummyRgba;
    shared.uMistIdent.value = entry.uniforms.uMistIdent ?? dummyRg;
    scene.add(entry.group);
    wardGroup = entry.group;
    plate = {...entry.plate, frames: 0};
    life = createLife(entry.plate.parts);
    compileScene();
    canvas.dataset.ward = entry.ward; // data-renderer turns 'three' at the first frame drawn (draw)
    canvas.dataset.meshVertices = String(entry.stats.meshVertices); canvas.dataset.parts = String(entry.stats.parts);
    canvas.dataset.treeVertices = String(entry.stats.treeVertices); canvas.dataset.treeStamps = String(entry.stats.treeStamps);
    canvas.dataset.boxVertices = String(entry.stats.boxVertices); canvas.dataset.blank = '';
    canvas.dataset.bakeMs = (performance.now() - started).toFixed(0);
    canvas.dataset.prefetched = String(prefetched);
    canvas.dataset.buildMs = entry.buildMs.toFixed(0);
    idle(() => { if (!disposed && canvas.dataset.ward === entry.ward) canvas.dataset.blank = entry.stats.blank(); });
  }

  /** Builds or activates a ward's plate. Returns false when the ward has not been redrawn as a plate. */
  function setWard(ward) {
    if (!Object.hasOwn(PLATES, ward)) { freePlate(); return false; }
    const t0 = performance.now();
    const prefetched = Boolean(cache.get(ward)?.entry);
    const entry = finish(ward);
    activate(entry, t0, prefetched);
    evict(new Set([ward, ...lastNeighbours]));
    return true;
  }

  function warmEntry(slot) {
    if (!slot.entry || slot.warmed) return;
    slot.warmed = true;
    for (const tex of slot.entry.textures) renderer.initTexture(tex);
    renderer.compileAsync(slot.entry.group, camera, scene).catch(() => {});
  }

  function pumpPrefetch() {
    if (disposed || idleHandle !== null) return;
    const hasPending = lastNeighbours.some(w => {
      if (w === plate?.ward) return false;
      const slot = cache.get(w);
      return slot && (!slot.entry || !slot.warmed);
    });
    if (!hasPending) return;
    idleHandle = idle(() => {
      idleHandle = null;
      if (disposed) return;
      for (const w of lastNeighbours) {
        if (w === plate?.ward) continue;
        const slot = cache.get(w);
        if (!slot) continue;
        if (!slot.entry) {
          try {
            const step = slot.gen.next();
            if (step.done) {
              slot.entry = step.value;
              slot.gen = null;
              warmEntry(slot);
            }
          } catch (error) {
            cache.delete(w);
            console.warn(`Prefetch ${w} failed:`, error);
          }
          pumpPrefetch();
          return;
        }
        if (!slot.warmed) {
          warmEntry(slot);
          pumpPrefetch();
          return;
        }
      }
    });
  }

  /** Pre-builds and warms up neighbouring wards during idle time so switching stays off the main path. */
  function prefetch(wards) {
    if (disposed) return;
    lastNeighbours = wards.filter(w => Object.hasOwn(PLATES, w));
    evict(new Set([plate?.ward, ...lastNeighbours]));
    for (const w of lastNeighbours) {
      if (!cache.has(w)) cache.set(w, {gen: buildWard(w), entry: null, warmed: false});
    }
    clearTimeout(prefetchTimer);
    prefetchTimer = setTimeout(pumpPrefetch, PREFETCH_DELAY_MS);
  }

  /**
   * @param {import('../renderer.js').Frame & {presence?:number}} f
   * @param {Float32Array} projection camera matrix for this frame (projection × the page's view)
   * @param {number} unitsPerPx plate units covered by one device pixel
   */
  function draw(f, projection, unitsPerPx) {
    if (!plate || !compiled) return;
    // study.js writes 'webgl' once after init; the frame says which renderer actually drew it.
    canvas.dataset.renderer = 'three';
    const quiet = f.still || f.flat, dt = Math.min(.05, Math.max(0, (f.time - lastTime) / 1000) || .016); lastTime = f.time;
    const want = f.presence ?? 0;
    if (f.still) { presence.x = want; presence.v = 0; } else stepSpring(presence, want, want > presence.x ? 8 : 2.2, dt);
    const [lx, lz] = groundPoint(projection, f.px, -f.py).map(value => Math.max(-430, Math.min(430, value)));
    const LAMP_H = 70, lampAt = [lx - VIEW[0] / VIEW[1] * LAMP_H, LAMP_H, lz - VIEW[2] / VIEW[1] * LAMP_H];
    const now = fixedClock ?? f.time;
    const state = life.update(dt, {time: now, light: [lx, lz], presence: presence.x, still: f.still, lift: f.lift, maps: plate.maps, mapW: plate.mw, mapH: plate.mh});
    canvas.dataset.under = state.under ? plate.parts[state.under - 1].id : '';
    packLifeState(state.a, state.b, stateData); stateTexture.needsUpdate = true;
    // Dev only (?export=glb): once the plate has settled, download it at rest for a ThreeRT reference render
    // (docs/MAKIE_THREERT_REFERENCE.md). The production build drops this branch and the module.
    if (import.meta.env.DEV && ++plate.frames === 30 && new URLSearchParams(location.search).get('export') === 'glb') {
      const pose = {ward: plate.ward, parts: plate.parts, soft: plate.soft, ident: plate.ident, mw: plate.mw, mh: plate.mh,
        a: Float32Array.from(state.a), b: Float32Array.from(state.b), box};
      void import('./export-glb.js').then(m => m.downloadPlateGlb(doc, pose))
        .then(bytes => { canvas.dataset.exported = String(bytes); }, error => { console.error('glb export failed', error); canvas.dataset.exported = 'error'; });
    }

    // The box leans a little toward the hand: Rx · Rz, column-major.
    const rz = quiet ? 0 : -f.px * .05 * f.lift, rx = quiet ? 0 : f.py * .035 * f.lift;
    const cz = Math.cos(rz), sz = Math.sin(rz), cx = Math.cos(rx), sx = Math.sin(rx);
    shared.uTilt.value.fromArray([cz, cx * sz, sx * sz, -sz, cx * cz, sx * cz, 0, -sx, cx]);
    shared.uCoatUp.value.set(-sz, cx * cz, sx * cz);
    shared.uOpening.value = f.opening * f.opening * (3 - 2 * f.opening);

    // The cords feel the box lean and feel it pulled along its track; reduced motion leaves them hanging still.
    const tilt = shared.uTilt.value.elements;
    const offset = (f.offset ?? 0) * unitsPerPx * canvas.width / Math.max(1, canvas.clientWidth), velocity = (offset - drift.offset) / dt;
    const pull = quiet ? 0 : Math.max(-6000, Math.min(6000, -(velocity - drift.velocity) / dt * .5));
    drift.offset = offset; drift.velocity = velocity;
    const strands = [];
    for (const c of cords) {
      const [x, y, z] = [c.anchor[0], c.anchor[1] + 48, c.anchor[2]];
      const pin = [tilt[0] * x + tilt[3] * y + tilt[6] * z, tilt[1] * x + tilt[4] * y + tilt[7] * z - 48, tilt[2] * x + tilt[5] * y + tilt[8] * z];
      if (quiet) c.cord.settle(pin); else c.cord.step(dt, {anchor: pin, ax: pull, kick: (f.kick ?? 0) * 420});
      strands.push(...cordTube(c.cord.points, c.out));
    }
    setCords(strands);

    // Light: a key from the window side, a cool dim room by night, and the hand's own lamp.
    const night = f.night;
    // An aged box sits in a slightly quieter day. (The ground is dark by its own structure now, so the pieces no longer need the light held down to sit above it.)
    const age = shared.uAge.value, dayDim = night ? 1 : 1 - .14 * age;
    ambient.color.set(night ? '#7f96d6' : '#fff4e0'); ambient.intensity = (night ? .5 : .55) * dayDim;
    key.color.set(night ? '#c4c8e2' : '#fff0d6'); key.intensity = (night ? 3.1 : 3.4) * dayDim;
    scene.environmentIntensity = (night ? .36 : .55) * dayDim;
    lamp.position.set(lampAt[0], lampAt[1], lampAt[2]); lamp.intensity = (night ? 120000 : 50000) * (.15 + presence.x);

    shared.uLamp.value.set(lampAt[0], lampAt[1], lampAt[2]);
    shared.uTime.value = (now / 1000) % 3600;
    shared.uNight.value = night ? 1 : 0;
    // A frame may carry the lid's age in years (the demonstration runs it from new to the Hatsune set's age); without one, the age it was made with.
    shared.uAge.value = f.years == null ? ageValue : ageFromYears(f.years);
    shared.uPresence.value = presence.x;
    shared.uPx.value = unitsPerPx;
    for (let i = 0; i < 20; i++) {
      const p = f.trails?.[i];
      if (p && fixedClock === null) trails[i].set(p.x, p.z, trailIntensity(p.time, f.time, f.still));
      else trails[i].set(0, 0, 0);
    }

    const w = canvas.width, h = canvas.height;
    if (size.w !== w || size.h !== h) { size.w = w; size.h = h; renderer.setSize(w, h, false); }
    // three's view is the page's lookAt; its projection is whatever makes projection × view equal the page's matrix.
    pageMatrix.fromArray(projection);
    camera.projectionMatrix.multiplyMatrices(pageMatrix, camera.matrixWorld); camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    renderer.render(scene, camera);
    renderer.resetState();
    // Leave the context as the relief renderer expects to find it.
    gl.bindVertexArray(null); gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.activeTexture(gl.TEXTURE0); gl.depthMask(true); gl.disable(gl.BLEND);
  }

  /** A tap on a part in close-up. Returns the part's id, or '' when the tap met bare ground. */
  function poke(x, z, time) {
    if (!plate) return '';
    const index = partAt(plate.maps, plate.mw, plate.mh, x, z);
    return index && life.act(index, time) ? plate.parts[index - 1].id : '';
  }

  return {
    setWard, prefetch, draw, poke, active: () => Boolean(plate),
    /** True while the first plate's shaders are still compiling (nothing is drawn meanwhile). */
    loading: () => Boolean(plate) && !compiled,
    dispose() {
      disposed = true;
      cancelIdle(idleHandle); clearTimeout(prefetchTimer);
      idleHandle = null;
      freePlate();
      evict(new Set());
      if (cordMesh) cordMesh.geometry.dispose();
      for (const d of disposables.splice(0)) d.dispose?.();
      scene.environment = null;
      renderer.dispose();
    },
  };
}
