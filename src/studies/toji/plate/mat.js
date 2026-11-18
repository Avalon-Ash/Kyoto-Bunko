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
 */
export const COAT_KIND = {top: 0, sunk: 1, half: 2, foot: 3, powder30: 4, powder35: 5, waterEdge: 6, inlayEdge: 7, none: 8};
export const TONE = {gold: 0, silver: 1, blue: 2};
export const TIER = {pattern: 0, ground: 1, dense: 2};
const LOOK_DEFAULT = {ch: 2.4, chRidge: false, lh: .7, coat: 'top', density: false, flakeD: 0, flakeCell: 0, foil: false, tone: 'gold', hill: false, tier: 'pattern'};
const look = (over = {}) => Object.freeze({...LOOK_DEFAULT, ...over});
const HILL = look({coat: 'foot', hill: true, tier: 'dense'});
export const MAT_LOOK = Object.freeze({
  0: look(), // a material this table does not list
  [MAT.ground]: look({coat: 'sunk', density: true, tier: 'ground'}),
  [MAT.nashijiLight]: HILL,
  [MAT.mura]: HILL,
  [MAT.gyobu]: HILL,
  [MAT.gold]: look({coat: 'inlayEdge'}),
  [MAT.silver]: look({coat: 'half', tone: 'silver'}),
  [MAT.kirikane]: look({coat: 'inlayEdge', foil: true}),
  [MAT.kirigin]: look({coat: 'inlayEdge', foil: true, tone: 'silver'}),
  [MAT.aogai]: look({coat: 'none'}),
  [MAT.hyomonGold]: look({coat: 'inlayEdge'}),
  [MAT.hyomonSilver]: look({coat: 'inlayEdge', tone: 'silver'}),
  [MAT.water]: look({ch: 0, coat: 'waterEdge', density: true, tier: 'dense'}),
  [MAT.kasumi]: look(),
  [MAT.lacquer]: look(),
  [MAT.lamp]: look(),
  [MAT.muraSilver]: look({tone: 'silver'}),
  [MAT.coral]: look({coat: 'none'}),
  [MAT.roofPowder]: look(),
  [MAT.bankGold]: look({ch: 15, coat: 'powder30', density: true, tier: 'dense'}),
  [MAT.bankSilver]: look({ch: 15, coat: 'powder30', density: true, tone: 'silver', tier: 'dense'}),
  [MAT.sandGold]: look({ch: 0, lh: .15, coat: 'powder35', density: true, flakeD: .3, flakeCell: 5.2, tier: 'dense'}),
  [MAT.sandSilver]: look({ch: 0, coat: 'powder35', density: true, tone: 'silver', tier: 'dense'}),
  [MAT.toyamaGold]: look({ch: 5, chRidge: true, coat: 'powder30', density: true, flakeD: .3, flakeCell: 5.2, tier: 'dense'}),
  [MAT.toyamaBlue]: look({ch: 5, chRidge: true, coat: 'powder30', density: true, tone: 'blue', tier: 'dense'}),
  [MAT.rockGold]: look(),
  [MAT.rockSilver]: look({tone: 'silver'}),
  [MAT.rockOlive]: look({tone: 'blue'}),
  [MAT.rockLine]: look(),
});
