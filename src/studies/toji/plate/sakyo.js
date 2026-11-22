// Two textures face each other: dark timber over a small pond, silver raked sand with a single level-topped cone.
// The pavilion stays at the far left, the cone at the near right; an open lower-left wedge separates them.
import {MAT, blob, pond, sandGarden, sandCone, moonBowl, storey, roof, hall, branchPine as pine, bird, rock, suyari, grassTufts, daimonji} from './vocab.js';
import {mountain, tongues} from './doha.js';

// The outline pond() draws for 'kinkyo' (same arguments): the grass is set on it.
const POND = [-182, 36, 112, 67, 5];
const shore = blob(...POND, .055, 80);
/**
 * A tuft just outside the pond's shore at index i, leaning away from the water.
 * @returns {[number, number, number, number, number, boolean]}
 */
function bank(i, h, n, flower = false) {
  const [x, z] = shore[i], dx = x - POND[0], dz = z - POND[1], l = Math.hypot(dx, dz);
  return [x + dx / l * 2.2, z + dz / l * 2.2, h, n, Math.sign(dx) * .22, flower];
}

// The ground (doha.js) is drawn piece by piece, every outline written here as control points:
//   Tsukimachi-yama and Nyoigatake  ONE body of four rounded heads behind the Kannon-den: a pale blue-gold one at the far left, the tallest (the
//                Daimonji hill) standing right of the pavilion, a near gold one at the pavilion's right shoulder, and a small one over the Togudo.
//                The pavilion's crown lies against the foot of the near head; the tall head stands clear of it. The 大 is on the tall head's flank.
//   the shores   the pond's four banks laid one over another: the north bank the pavilion stands on, the west shore, and two on the south
//                (the pine side, and the stone's). The silver sand and the cone have no shore under them: bare ground lies between them and the pond.
// Heads, far to near. Why: the Daimonji hill is the tallest because the 大 must be seen; its peak is off to the right of the pavilion's roof.
const HEADS = [
  // 1 (blue-gold, the farthest) at the far left, over the pavilion's west: a full arc, its peak toward the left
  {ridge: [[-350, -120], [-342, -152], [-318, -174], [-280, -182], [-240, -172], [-206, -150], [-176, -122]], depth: 74},
  // 2 (gold) the tallest, the Daimonji hill: climbs slowly from the pavilion's roof and falls steeply at the right; the 大 is on its flank
  {ridge: [[-122, -122], [-104, -168], [-68, -204], [-22, -222], [26, -224], [68, -200], [94, -150]], depth: 100, tone: 'blue'},
  // 3 (gold) in front, at the pavilion's right shoulder: its peak a little right of the roof, the roof's right side lies against it
  {ridge: [[-190, -118], [-182, -148], [-162, -172], [-132, -184], [-104, -176], [-76, -150], [-54, -118]], depth: 64},
  // 4 (gold) a small head over the Togudo at the right, the last of the body, its peak toward the right
  {ridge: [[34, -112], [56, -136], [90, -152], [126, -162], [160, -154], [190, -132], [206, -110]], depth: 54},
];
// The banks of the pond, far to near. Each outline is written round the piece as a few broad lobes (40-70 wide) and small ones (15-25), with bays of different depths.
const SHORES = [
  // the north bank: the pavilion's lower storey stands on it; three lobes on its back, the lower edge on the water
  {p: [[-274, -26], [-270, -44], [-256, -57], [-236, -63], [-220, -61], [-212, -58], [-206, -67], [-192, -74], [-176, -72], [-166, -66], [-160, -62], [-154, -70], [-144, -75], [-134, -70], [-128, -62], [-120, -68], [-104, -72], [-88, -66], [-78, -54], [-72, -40],
    [-80, -22], [-92, -12], [-108, -8], [-124, -11], [-134, -20], [-146, -15], [-156, -22], [-168, -24], [-192, -19], [-214, -17], [-234, -22], [-250, -14], [-262, -9], [-270, -14]], tone: 'gold', seed: 61},
  // the west shore: the lid's left margin; the grass at the pond's west end grows on it; its outer edge is two broad lobes
  {p: [[-340, 6], [-334, -10], [-316, -18], [-298, -16], [-286, -6], [-278, 4], [-286, 20], [-296, 40], [-290, 60], [-278, 76], [-264, 86],
    [-270, 98], [-292, 102], [-314, 96], [-330, 84], [-341, 62], [-343, 30]], tone: 'gold', seed: 62},
  // the south bank on the pine's side: a broad lobe along the water's bottom-left, then a small one, ending where the stone's bank begins
  {p: [[-290, 88], [-268, 84], [-248, 90], [-228, 98], [-208, 102], [-186, 106], [-176, 112],
    [-172, 126], [-178, 134], [-200, 142], [-232, 140], [-250, 132], [-258, 124], [-264, 130], [-274, 135], [-284, 126], [-294, 112]], tone: 'gold', seed: 63},
  // the south bank on the stone's side, laid over the end of the first: a big lobe and a small one below, the stone on the big lobe
  {p: [[-212, 100], [-190, 104], [-168, 105], [-146, 102], [-128, 98], [-112, 91], [-96, 82], [-84, 70],
    [-72, 86], [-72, 102], [-80, 118], [-96, 130], [-118, 136], [-126, 128], [-134, 134], [-144, 140], [-156, 134], [-162, 128], [-174, 132], [-192, 130], [-206, 118]], tone: 'gold', seed: 64},
];
/** The clusters, for the measuring and checking scripts. */
const PIECES = {HEADS, SHORES};
export {PIECES};

export function sakyo() {
  return [
    // Layer 0: the mountain body, the pond's banks, and the water.
    ...mountain('higashiyama', HEADS),
    // Daimonji: the character 大 in cut gold on the tall head's flank, right of the pavilion's roof.
    ...daimonji('daimonji', -30, -190, 60, {on: 'higashiyama-blue', tile: 6.4, stretch: 1.7}),
    ...tongues('shore', SHORES, {toward: [[-230, 36], [-182, 36], [-130, 36]]}),
    ...pond('kinkyo', -182, 36, 112, 67, 5),
    ...sandGarden('ginshadan', 14, 249, 0, 102),
    // Grass at the pond's edge: a few tufts of gold line work on the west, south and east banks, none on the pavilion's side.
    ...grassTufts('kinkyo-grass', [bank(3, 11, 4), bank(15, 12, 4), bank(25, 11, 4), bank(28, 12, 4, true), bank(40, 12, 4), bank(47, 11, 4)], {on: 'kinkyo', seed: 3}),
    ...sandCone('kogetsudai', 190, 160, 50, 62),
    ...moonBowl('moon', 190, 98, 'kogetsudai'),
    ...suyari('mist-west', -336, -213, -37, 12, 6),
    ...suyari('mist-east', 59, 331, -198, 13, 11),
    ...rock('pond-stone', -112, 127, 25, 18, 4, {mat: MAT.kirikane}),
    ...storey('ginkaku-lower', -163, -88, -57, 64, {group: 'ginkaku', bays: 5}),
    ...roof('ginkaku-eave', -163, -90, 85, 27, {group: 'ginkaku', order: 1, mat: MAT.lacquer, ridgeHalf: 40, motionWith: 'ginkaku-lower'}),
    ...storey('ginkaku-upper', -163, -138, -113, 46, {group: 'ginkaku', order: 2, windowMat: MAT.lacquer}),
    ...roof('ginkaku-crown', -163, -140, 63, 34, {group: 'ginkaku', order: 3, mat: MAT.lacquer, ridgeHalf: 25, motionWith: 'ginkaku-upper'}),
    ...hall('togudo', 84, -102, 82, 32, {wallH: 24}),
    ...pine('near-pine', -293, 178, 99, 12, 2),
    ...pine('east-pine', 282, -54, 112, -12, 6),
    ...bird('uguisu', [[-272.56, 137.72, 1, 'near-pine', 10], [261.10, -100.00, -1, 'east-pine', 10]]),
  ];
}
