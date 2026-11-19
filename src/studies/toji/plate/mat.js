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
 */
export const COAT_KIND = {top: 0, sunk: 1, half: 2, foot: 3, powder30: 4, powder35: 5, waterEdge: 6, inlayEdge: 7, none: 8};
export const TONE = {gold: 0, silver: 1, blue: 2};
export const TIER = {pattern: 0, ground: 1, dense: 2};
export const RECIPE = {lamp: 0, ground: 1, hill: 2, gyobu: 3, gold: 4, hirame: 5, foil: 6, aogai: 7, sheet: 8, ryusui: 9, kasumi: 10, lacquer: 11,
  coral: 12, bank: 13, suhama: 14, toyama: 15};
const LOOK_DEFAULT = {ch: 2.4, chRidge: false, lh: .7, coat: 'top', density: false, flakeD: 0, flakeCell: 0, foil: false, tone: 'gold', hill: false, cloud: false, tier: 'pattern', recipe: 'lamp'};
const look = (over = {}) => Object.freeze({...LOOK_DEFAULT, ...over});
const HILL = {coat: 'foot', hill: true, tier: 'dense'};
export const MAT_LOOK = Object.freeze({
  0: look(), // a material this table does not list: painted as the lamp's glow
  [MAT.ground]: look({coat: 'sunk', density: true, tier: 'ground', recipe: 'ground'}),
  [MAT.nashijiLight]: look({...HILL, recipe: 'hill'}),
  [MAT.mura]: look({...HILL, cloud: true, recipe: 'hill'}),
  [MAT.gyobu]: look({...HILL, recipe: 'gyobu'}),
  [MAT.gold]: look({coat: 'inlayEdge', recipe: 'gold'}),
  [MAT.silver]: look({coat: 'half', tone: 'silver', recipe: 'hirame'}),
  [MAT.kirikane]: look({coat: 'inlayEdge', foil: true, recipe: 'foil'}),
  [MAT.kirigin]: look({coat: 'inlayEdge', foil: true, tone: 'silver', recipe: 'foil'}),
  [MAT.aogai]: look({coat: 'none', recipe: 'aogai'}),
  [MAT.hyomonGold]: look({coat: 'inlayEdge', recipe: 'sheet'}),
  [MAT.hyomonSilver]: look({coat: 'inlayEdge', tone: 'silver', recipe: 'sheet'}),
  [MAT.water]: look({ch: 0, coat: 'waterEdge', density: true, tier: 'dense', recipe: 'ryusui'}),
  [MAT.kasumi]: look({recipe: 'kasumi'}),
  [MAT.lacquer]: look({recipe: 'lacquer'}),
  [MAT.lamp]: look(),
  [MAT.muraSilver]: look({tone: 'silver'}),
  [MAT.coral]: look({coat: 'none', recipe: 'coral'}),
  [MAT.roofPowder]: look(),
  [MAT.bankGold]: look({ch: 15, coat: 'powder30', density: true, tier: 'dense', recipe: 'bank'}),
  [MAT.bankSilver]: look({ch: 15, coat: 'powder30', density: true, tone: 'silver', tier: 'dense', recipe: 'bank'}),
  [MAT.sandGold]: look({ch: 0, lh: .15, coat: 'powder35', density: true, flakeD: .3, flakeCell: 5.2, tier: 'dense', recipe: 'suhama'}),
  [MAT.sandSilver]: look({ch: 0, coat: 'powder35', density: true, tone: 'silver', tier: 'dense', recipe: 'suhama'}),
  [MAT.toyamaGold]: look({ch: 5, chRidge: true, coat: 'powder30', density: true, flakeD: .3, flakeCell: 5.2, tier: 'dense', recipe: 'toyama'}),
  [MAT.toyamaBlue]: look({ch: 5, chRidge: true, coat: 'powder30', density: true, tone: 'blue', tier: 'dense', recipe: 'toyama'}),
  [MAT.rockGold]: look(),
  [MAT.rockSilver]: look({tone: 'silver'}),
  [MAT.rockOlive]: look({tone: 'blue'}),
  [MAT.rockLine]: look(),
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
