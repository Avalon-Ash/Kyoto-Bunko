// Material ids of the plate. No imports: vocab.js and rock-mesh.js both need them and import each other.
// muraSilver is the body of a silver rock (the shader lays silver foil on it); kasumi is mist, which is baked, not meshed.
// roofPowder is gold powder sprinkled on a roof face (takamakie); gold is leaf, kept for small parts.
// coral is red coral inlay: the one colour that is not metal or shell, kept to a few small pieces (Hatsune: plum blossoms).
export const MAT = {ground: 1, nashijiLight: 2, mura: 3, gyobu: 4, gold: 5, silver: 6, kirikane: 7, kirigin: 8, aogai: 9,
  hyomonGold: 10, hyomonSilver: 11, water: 12, kasumi: 13, lacquer: 14, lamp: 15, muraSilver: 16, coral: 17,
  roofPowder: 18,
  // Doha: banks (a crisp ridge over a wedge that sinks into the ground) and suhama tongues (flat, with a rim). Gold or silver.
  bankGold: 19, bankSilver: 20, sandGold: 21, sandSilver: 22,
  // Toyama (far mountain) maki-e: a flat fine powder, brightest at the ridge and thinning to nothing down the slope; gold or a paler, cooler blue-gold.
  toyamaGold: 23, toyamaBlue: 24,
  // Doha rocks (pilot wards only): one raised form of fine pale powder, gold or silver, with grooves along its grain; no cut-gold squares.
  rockGold: 25, rockSilver: 26,
  // The crags (the two pilot wards): a blue-gold body (pale olive gold) and the fine pale-gold lines drawn over their faces.
  rockOlive: 27, rockLine: 28};

/**
 * MAT_LOOK: one row per material, one column per property. It is the only place a material's look on the lid is decided; the ground
 * shader, the coat, the dev views and the measuring tools read the columns (three-pack.js turns them into GLSL constant arrays).
 * Add a material here, not as a branch in a shader (docs/plans/2026-11-18-material-table.md).
 *
 *   ch         how steeply the powder channel (fine.g) tilts the surface's normal: 2.4 a bevelled inlay or line; 15 a bank's wedge;
 *              5 a far mountain's ridge; 0 flush with the lid (togidashi: suhama, water).
 *   chRidge    ch only bites near the ridge (a far mountain: the step where its head lies over the one behind).
 *   lh         how steeply a drawn line (fine.b) tilts the normal: .7, or .15 for the fine gold line on a gold suhama's edge.
 *   coat       how the transparent lacquer lies over it (COAT_KIND).
 *   density    the ground under it is the plain ground itself, so it takes the same powder-density field (maki-bokashi). A material
 *              drawn flush on the ground without this shows a dark rim where its powder thins (the three dark edges of 2026-11-17).
 *   flakeD, flakeCell   larger flakes scattered in its powder (density and cell size); 0: none.
 *   foil       cut foil that flashes as the light moves.
 *   tone       its metal (TONE).
 *   hill       hill ground: carries halftone kirikane and wears at the crown.
 *   tier       which tone layer it belongs to (TIER): the plain ground is the darkest, dense-nashiji faces the middle, the rest the pattern.
 *   cloud      hill ground whose metal lies in cloudy patches (mura nashiji).
 *   recipe     how it is painted (RECIPE): which branches of the ground shader draw it. Gold and silver of one technique share a
 *              recipe and differ by `tone`.
 *   fine       what the baked fine.g channel holds for it, and so how bake.js paints its fills (FINE): 'mask' its coverage; 'wedge' a
 *              bank's height, falling from the ridge (each fill carries f.wedge); 'ridge' a far mountain's head, painted with the
 *              other heads far to near (f.wedge); 'powder' a suhama's powder thinning from its drawn edge (f.fade, when it has one;
 *              flush with the lid, so it shades nothing below it).
 *   refColour  its one flat colour on the lid in the path-traced reference (export-glb.js); null: the plain ground's.
 *   mesh       its MeshPhysicalMaterial parameters as a raised part (meshLook below); three-pack.js MATERIALS is this column.
 */
export const COAT_KIND = {top: 0, sunk: 1, half: 2, foot: 3, powder30: 4, powder35: 5, waterEdge: 6, inlayEdge: 7, none: 8};
export const TONE = {gold: 0, silver: 1, blue: 2};
export const TIER = {pattern: 0, ground: 1, dense: 2};
export const FINE = Object.freeze({mask: 'mask', wedge: 'wedge', ridge: 'ridge', powder: 'powder'});
export const RECIPE = {lamp: 0, ground: 1, hill: 2, gyobu: 3, gold: 4, hirame: 5, foil: 6, aogai: 7, sheet: 8, ryusui: 9, kasumi: 10, lacquer: 11,
  coral: 12, bank: 13, suhama: 14, toyama: 15};
/**
 * A raised surface's material (a part's mesh, a piece of the box): MeshPhysicalMaterial parameters (docs/MAKIE_THREE_PLAN.md §3)
 * and the columns three-renderer.js reads to patch its shader. flake: strength of the procedural gold-powder normal map (0 = none).
 * paint: the flat colour used by the ground texture for parts that are not yet three meshes. glow: emissive follows the part's glow
 * state. aged: the values it moves toward with age (three-pack.js agedSpec).
 *   coat       how the lacquer coat lies on it (MESH_COAT): 'sunk' under the coat (the box's inside, the tray), 'top' on it, 'faint'
 *              inlaid shell and coral; 'none' not lacquered (the paper). Not the ground's `coat`: shell and coral take none on the lid
 *              and a faint one as raised pieces (docs/plans/2026-11-18-material-table.md §6 item 3; to unify is the user's decision).
 *   shine      its clearcoat is raised to the shared coat's shine (three-pack.js COAT.shine). Not the paper or the cords.
 *   shinnuri   black lacquer polished to a dark mirror (walls, plinths).
 *   rock       the body of a cut-foil rock mound, and its foil: 'gold' or 'silver'; null otherwise.
 *   rockPowder a pilot ward's powder rock or its lines (rock-mesh.js): fine pale powder in one raised form, no foil.
 *   grain      'powder' gold powder on a roof face, 'leaf' gold leaf laid on wood (three-pack.js PART_POWDER_GLSL); null none.
 *   wood       a tree's limbs in this material are 'silver' wood (Hatsune: silver wood under gold foliage) or 'gold'.
 */
export const MESH_COAT = Object.freeze({sunk: 0, top: 1, faint: 2}); // three-pack.js kyotoCoatPart's cls; 'none' has no class
const MESH_DEFAULT = {coat: 'top', shine: true, shinnuri: false, rock: null, rockPowder: false, grain: null, wood: 'gold'};
export const meshLook = spec => Object.freeze({...MESH_DEFAULT, ...spec});
const LOOK_DEFAULT = {ch: 2.4, chRidge: false, lh: .7, coat: 'top', density: false, flakeD: 0, flakeCell: 0, foil: false, tone: 'gold', hill: false, cloud: false, tier: 'pattern', recipe: 'lamp', fine: 'mask', refColour: null, mesh: null};
const look = (over = {}, mesh = null) => Object.freeze({...LOOK_DEFAULT, ...over, mesh: mesh && meshLook(mesh)});
const HILL = {coat: 'foot', hill: true, tier: 'dense'};
export const MAT_LOOK = Object.freeze({
  0: look(), // a material this table does not list: painted as the lamp's glow
  [MAT.ground]: look({coat: 'sunk', density: true, tier: 'ground', recipe: 'ground', refColour: '#c48f42'},
    {name: 'ground', color: '#a8742e', paint: '#9a6c2c', metalness: .75, roughness: .45, clearcoat: 1, clearcoatRoughness: .08, flake: .35}),
  [MAT.nashijiLight]: look({...HILL, recipe: 'hill', refColour: '#d4a656'},
    {name: 'nashijiLight', aged: {color: '#b7a276', roughness: .6}, color: '#b88a3c', paint: '#a8823a', metalness: .85, roughness: .5, clearcoat: .6, clearcoatRoughness: .1, flake: .5}),
  [MAT.mura]: look({...HILL, cloud: true, recipe: 'hill', refColour: '#d0a252'},
    {name: 'mura', rock: 'gold', color: '#9c7430', paint: '#6e5222', metalness: .8, roughness: .55, clearcoat: .6, clearcoatRoughness: .1, flake: .45}),
  [MAT.gyobu]: look({...HILL, recipe: 'gyobu', refColour: '#c99a48'},
    {name: 'gyobu', aged: {color: '#bfa468', roughness: .55}, color: '#c29a46', paint: '#8a6a2c', metalness: .85, roughness: .45, clearcoat: .5, clearcoatRoughness: .1, flake: .7}),
  [MAT.gold]: look({coat: 'inlayEdge', recipe: 'gold', refColour: '#e0b050'},
    {name: 'gold', aged: {color: '#cdb98e', roughness: .55, clearcoat: .1}, color: '#cf9e48', paint: '#d6a640', metalness: 1, roughness: .38, clearcoat: .3, clearcoatRoughness: .1, flake: .22, grain: 'leaf'}),
  // T3: railings read dull grey under the grey room; a whiter, smoother silver with a thin coat keeps them silver.
  // Age: silver and sheet silver stand for white things (sand, a fox, blossom, an eave's edge), so they dull a little but stay
  // pale and keep their polish (a rougher silver only mirrors the dim room and goes dark);
  // envMapIntensity makes up for the quieter day an aged box sits in, which would otherwise grey them. The dark, sulphided silver is the shade of rocks, trunks and banks, which the shaders lay themselves.
  [MAT.silver]: look({coat: 'half', tone: 'silver', recipe: 'hirame', refColour: '#a8a8a4'},
    {name: 'silver', aged: {color: '#d9d6cc', roughness: .27, metalness: .7, clearcoat: .2, envMapIntensity: 1.4}, envMapIntensity: 1, color: '#e6e8e4', paint: '#d8dad6', metalness: 1, roughness: .2, clearcoat: .3, clearcoatRoughness: .08, flake: .3, wood: 'silver'}),
  [MAT.kirikane]: look({coat: 'inlayEdge', foil: true, recipe: 'foil', refColour: '#f0c860'},
    {name: 'kirikane', aged: {color: '#dcc892', roughness: .52}, color: '#f2c65e', paint: '#e0b650', metalness: .88, roughness: .45, clearcoat: 0, clearcoatRoughness: 0, flake: .12}),
  [MAT.kirigin]: look({coat: 'inlayEdge', foil: true, tone: 'silver', recipe: 'foil', refColour: '#c8c8c4'},
    {name: 'kirigin', aged: {color: '#d0ccc1', roughness: .45, metalness: .66, envMapIntensity: 1.4}, envMapIntensity: 1, color: '#d8dbd6', paint: '#bfc0b8', metalness: .88, roughness: .45, clearcoat: 0, clearcoatRoughness: 0, flake: .12}),
  // T3: mother-of-pearl is pale with colour that shifts, not a teal paint: lighter base, wider film range.
  [MAT.aogai]: look({coat: 'none', recipe: 'aogai', refColour: '#6fa8b0'},
    {name: 'aogai', color: '#8fbcb6', paint: '#9cc6c0', metalness: .2, roughness: .2, clearcoat: 1, clearcoatRoughness: .05, flake: 0, iridescence: 1, iridescenceIOR: 1.6, iridescenceThicknessRange: [250, 800], coat: 'faint'}),
  [MAT.hyomonGold]: look({coat: 'inlayEdge', recipe: 'sheet', refColour: '#e6b94e'},
    {name: 'hyomonGold', aged: {color: '#d6c294', roughness: .36}, color: '#e6b94e', paint: '#e2b24c', metalness: 1, roughness: .18, clearcoat: 0, clearcoatRoughness: 0, flake: .15}),
  [MAT.hyomonSilver]: look({coat: 'inlayEdge', tone: 'silver', recipe: 'sheet', refColour: '#d0d2ce'},
    {name: 'hyomonSilver', aged: {color: '#d6d3c8', roughness: .21, metalness: .66, envMapIntensity: 1.4}, envMapIntensity: 1, color: '#e0e2de', paint: '#d8d9d4', metalness: 1, roughness: .15, clearcoat: 0, clearcoatRoughness: 0, flake: .15}),
  [MAT.water]: look({ch: 0, coat: 'waterEdge', density: true, tier: 'dense', recipe: 'ryusui', refColour: '#d6a64c'},
    {name: 'water', color: '#2c4256', paint: '#2a3d50', metalness: .6, roughness: .12, clearcoat: 1, clearcoatRoughness: .02, flake: 0}),
  [MAT.kasumi]: look({recipe: 'kasumi', refColour: '#e6be66'},
    {name: 'kasumi', color: '#d9b25a', paint: '#caa24a', metalness: .9, roughness: .3, clearcoat: 0, clearcoatRoughness: 0, flake: .2}),
  [MAT.lacquer]: look({recipe: 'lacquer', refColour: '#0b0807'},
    {name: 'lacquer', color: '#0b0807', paint: '#1a1310', metalness: 0, roughness: .12, clearcoat: 1, clearcoatRoughness: .03, flake: 0, shinnuri: true}),
  // T3: a paper window lit from inside is warm amber, not saturated orange.
  [MAT.lamp]: look({refColour: '#ff9a3c'},
    {name: 'lamp', color: '#2a1a0a', paint: '#f0b46a', metalness: 0, roughness: .6, clearcoat: 0, clearcoatRoughness: 0, flake: 0, emissive: '#f0b46a', glow: true}),
  // Body of a silver (kirigin) rock: the shader lays silver foil on it. Mist (kasumi) is baked, so it has no mesh material of its own.
  [MAT.muraSilver]: look({tone: 'silver'},
    {name: 'muraSilver', rock: 'silver', color: '#d9b25a', paint: '#caa24a', metalness: .9, roughness: .3, clearcoat: 0, clearcoatRoughness: 0, flake: .2}),
  // Red coral, cut and polished: a soft sheen, no metal. It does not age.
  [MAT.coral]: look({coat: 'none', recipe: 'coral', refColour: '#b9412d'},
    {name: 'coral', color: '#a3341f', paint: '#b0402e', metalness: 0, roughness: .55, clearcoat: .25, clearcoatRoughness: .3, flake: 0, coat: 'faint'}),
  // Roof faces: gold powder under clear lacquer (takamakie). Broad, soft sheen rather than a mirror; the grain and the
  // unevenness come from the shader (PART_POWDER_GLSL), not from a normal map.
  [MAT.roofPowder]: look({},
    {name: 'roofPowder', aged: {color: '#b99d5f', roughness: .68, clearcoat: 0, envMapIntensity: .5}, color: '#c4973f', paint: '#d6a640', metalness: .92, roughness: .6, clearcoat: .06, clearcoatRoughness: .5, envMapIntensity: .7, flake: 0, grain: 'powder'}),
  // Doha: the ground pieces are painted into the lid by the ground shader (the mat id is read from the ident map), not meshed; these
  // entries give each a plain stand-in colour for the glb export and the material table's checks.
  [MAT.bankGold]: look({ch: 15, coat: 'powder30', density: true, tier: 'dense', recipe: 'bank', fine: 'wedge', refColour: '#cfa24e'},
    {name: 'bankGold', color: '#c29a46', paint: '#b8903a', metalness: .85, roughness: .5, clearcoat: .5, clearcoatRoughness: .1, flake: .5}),
  [MAT.bankSilver]: look({ch: 15, coat: 'powder30', density: true, tone: 'silver', tier: 'dense', recipe: 'bank', fine: 'wedge', refColour: '#a8a8a2'},
    {name: 'bankSilver', color: '#9c9a92', paint: '#8e8c85', metalness: .85, roughness: .4, clearcoat: .3, clearcoatRoughness: .1, flake: .3}),
  [MAT.sandGold]: look({ch: 0, lh: .15, coat: 'powder35', density: true, flakeD: .3, flakeCell: 5.2, tier: 'dense', recipe: 'suhama', fine: 'powder', refColour: '#dcb45a'},
    {name: 'sandGold', color: '#d6ad55', paint: '#cfa44a', metalness: .9, roughness: .4, clearcoat: .4, clearcoatRoughness: .1, flake: .3}),
  [MAT.sandSilver]: look({ch: 0, coat: 'powder35', density: true, tone: 'silver', tier: 'dense', recipe: 'suhama', fine: 'powder', refColour: '#b4b4ae'},
    {name: 'sandSilver', color: '#a9a8a0', paint: '#9b9a93', metalness: .85, roughness: .35, clearcoat: .3, clearcoatRoughness: .1, flake: .3}),
  [MAT.toyamaGold]: look({ch: 5, chRidge: true, coat: 'powder30', density: true, flakeD: .3, flakeCell: 5.2, tier: 'dense', recipe: 'toyama', fine: 'ridge', refColour: '#d9b865'},
    {name: 'toyamaGold', color: '#d9b865', paint: '#cfa850', metalness: .85, roughness: .5, clearcoat: .3, clearcoatRoughness: .1, flake: .1}),
  [MAT.toyamaBlue]: look({ch: 5, chRidge: true, coat: 'powder30', density: true, tone: 'blue', tier: 'dense', recipe: 'toyama', fine: 'ridge', refColour: '#cdbf86'},
    {name: 'toyamaBlue', color: '#cdbf86', paint: '#c0b374', metalness: .85, roughness: .5, clearcoat: .3, clearcoatRoughness: .1, flake: .1}),
  [MAT.rockGold]: look({refColour: '#e2c27c'},
    {name: 'rockPowderGold', color: '#e2c27c', paint: '#d2b068', metalness: .8, roughness: .5, clearcoat: .25, clearcoatRoughness: .15, flake: .15, rockPowder: true}),
  [MAT.rockSilver]: look({tone: 'silver', refColour: '#d6d9d2'},
    {name: 'rockPowderSilver', color: '#b9b8ae', paint: '#aeada4', metalness: .85, roughness: .52, clearcoat: .1, clearcoatRoughness: .15, flake: .15, rockPowder: true}),
  [MAT.rockOlive]: look({tone: 'blue', refColour: '#c4b46e'},
    {name: 'rockPowderOlive', color: '#bdae78', paint: '#ae9f6a', metalness: .8, roughness: .5, clearcoat: .25, clearcoatRoughness: .15, flake: .15, rockPowder: true}),
  [MAT.rockLine]: look({refColour: '#f0d98c'},
    {name: 'rockPowderLine', color: '#f0d98c', paint: '#e6cf80', metalness: .9, roughness: .4, clearcoat: .2, clearcoatRoughness: .15, flake: .1, rockPowder: true}),
});

// Doha piece properties keyed by cluster kind and tone, so doha.js reads one table instead of branching on tone strings.
export const DOHA_TONE = Object.freeze({
  tongue: Object.freeze({
    gold: Object.freeze({mat: MAT.sandGold, order: 0, under: 16, soft: .05}),
    // Silver suhama is ground flush like gold and ends at the waterline unless asked to run under it.
    silver: Object.freeze({mat: MAT.sandSilver, order: 1, under: 0, soft: .03}),
  }),
  bank: Object.freeze({
    gold: Object.freeze({mat: MAT.bankGold, order: 0}),
    silver: Object.freeze({mat: MAT.bankSilver, order: 1}),
  }),
  toyama: Object.freeze({
    gold: Object.freeze({mat: MAT.toyamaGold, order: 0}),
    blue: Object.freeze({mat: MAT.toyamaBlue, order: 1}),
  }),
});

// High-makie rock body and foil-tile materials keyed by the requested MAT id; unlisted ids keep the gold kirikane mound default.
export const ROCK_DEFAULT = Object.freeze({powder: false, body: MAT.mura, tile: MAT.kirikane});
const rockLook = (over = {}) => Object.freeze({...ROCK_DEFAULT, ...over});
export const ROCK_LOOK = Object.freeze({
  [MAT.kirikane]: rockLook(),
  [MAT.kirigin]: rockLook({body: MAT.muraSilver, tile: MAT.kirigin}),
  [MAT.rockGold]: rockLook({powder: true, body: MAT.rockGold}),
  [MAT.rockSilver]: rockLook({powder: true, body: MAT.rockSilver}),
});
