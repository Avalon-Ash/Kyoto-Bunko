// Borrowed scenery in three depths: the near hall looks across a broad pond to rocks and a distant ridge.
// The empty foreground below the hall lets the eye cross the water before climbing into the mountain.
// The ground (doha.js) is drawn piece by piece, every outline written here as control points:
//   Arashiyama   ONE body of four rounded heads at the upper right, behind the pond: the borrowed scenery itself. Its tallest head stands
//                over the pond's middle, clear of the pines, so that the view from the hall across the water ends in the peak.
//   Kameyama     two low pale heads at the far upper left, over the hall's west end.
//   the shores   a long bank in front of the hall, a crescent along the pond's north (the stones), a tongue under each pine and the
//                maple; a thin silver waterline laid over the north crescent.
import {MAT, pond, hall, branchPine as pine, branchMaple as maple, fallenLeaves, bird, rock, suyari} from './vocab.js';
import {mountain, tongues} from './doha.js';

// Arashiyama, far to near. Why: the mountain is what the garden borrows; the farthest head is the paler, the tallest stands behind the pond.
const ARASHIYAMA = [
  // 1 (blue-gold, the farthest) behind the pond's west half: a full arc, its peak a little right of the middle
  {ridge: [[-60, -120], [-44, -152], [-18, -180], [20, -190], [62, -182], [100, -156], [126, -122]], depth: 78, tone: 'blue'},
  // 2 (gold) the tallest, over the pond's east half: climbs slowly from the left, falls steeply at the right
  {ridge: [[60, -124], [90, -160], [128, -192], [170, -214], [212, -218], [250, -196], [282, -144]], depth: 104},
  // 3 (gold) in front on the right, the last head of the range, its peak toward the right
  {ridge: [[222, -110], [240, -138], [262, -152], [286, -146], [306, -160], [334, -150], [352, -122]], depth: 74},
  // 4 (gold) a low head in front of the first two, over the pond's north bank
  {ridge: [[-10, -104], [12, -122], [40, -134], [66, -137], [90, -130], [108, -114], [118, -102]], depth: 52},
];
// Kameyama, at the far upper left: two low pale heads, the second in front and to the right of the first.
const KAMEYAMA = [
  {ridge: [[-372, -124], [-366, -152], [-350, -170], [-324, -176], [-290, -164], [-250, -146], [-214, -124]], depth: 54, tone: 'blue'},
  {ridge: [[-270, -114], [-246, -128], [-220, -140], [-190, -150], [-160, -162], [-134, -146], [-114, -116]], depth: 46},
];
// The shores, far to near. Each outline is written round the piece, one point per bend (sharp coves, round lobes).
const SHORES = [
  // west, under the old pine behind the hall: a lobe with a bay in its lower edge
  {p: [[-346, -52], [-332, -74], [-312, -82], [-292, -92], [-270, -80], [-250, -88], [-230, -70], [-222, -56], [-238, -44], [-258, -50], [-276, -38], [-298, -46], [-322, -36], [-342, -40]], tone: 'gold', seed: 51},
  // east, under the pine at the pond's back right: reaches round the pond's north-east corner
  {p: [[212, -72], [228, -92], [252, -100], [274, -92], [298, -104], [322, -94], [344, -80], [352, -56], [342, -36], [322, -26], [300, -34], [282, -20], [266, -32], [244, -48], [226, -58]], tone: 'gold', seed: 52},
  // north: the crescent along the pond's back where the two stones lie, thick in the middle, its lower edge on the water
  {p: [[-8, -2], [8, -30], [3, -46], [22, -58], [30, -76], [54, -80], [76, -72], [98, -90], [122, -82], [146, -98], [172, -86], [198, -94], [220, -80], [244, -66], [262, -44], [280, -22], [284, 12],
    [268, -14], [255, -38], [239, -44], [222, -64], [196, -67], [170, -76], [143, -69], [120, -69], [96, -54], [75, -52], [55, -36], [36, -33], [16, -15], [2, -7], [-8, 12]], tone: 'gold', seed: 53},
  // the silver waterline on the north crescent, laid over the gold: a hand's breadth between the gold and the water
  {p: [[46, -38], [58, -48], [72, -46], [84, -56], [98, -60], [110, -58], [124, -68], [138, -72], [150, -74], [164, -68], [178, -76], [192, -72], [206, -66], [220, -58], [232, -48], [228, -62], [214, -76], [204, -84], [190, -82], [176, -90], [160, -84], [146, -88], [130, -82], [116, -90], [102, -82], [88, -78], [74, -68], [58, -60]], tone: 'silver', seed: 54},
  // the long bank in front of the hall: the veranda stands on it; its right end reaches the pond's west tip
  {p: [[-332, 100], [-318, 86], [-296, 92], [-272, 80], [-248, 90], [-222, 78], [-196, 88], [-170, 76], [-144, 86], [-118, 76], [-92, 86], [-66, 78], [-40, 88], [-22, 92], [-10, 104], [-2, 114],
    [-14, 124], [-36, 118], [-58, 128], [-84, 120], [-110, 130], [-136, 122], [-162, 132], [-188, 124], [-214, 134], [-240, 124], [-266, 134], [-292, 124], [-318, 132], [-334, 122], [-340, 110]], tone: 'gold', seed: 55},
  // south, under the red maple: a round tongue in the near corner where the leaves fall
  {p: [[212, 166], [236, 172], [258, 168], [282, 176], [306, 168], [330, 180], [344, 198], [336, 214], [314, 222], [292, 214], [268, 224], [244, 216], [222, 224], [204, 212], [196, 190]], tone: 'gold', seed: 56},
];
/** The clusters, for the measuring and checking scripts. */
const PIECES = {ARASHIYAMA, KAMEYAMA, SHORES};
export {PIECES};

export function ukyo() {
  return [
    ...mountain('arashiyama', ARASHIYAMA),
    ...mountain('kameyama', KAMEYAMA),
    ...pond('sogen', 143, 49, 160, 115, 5),
    ...tongues('shore', SHORES),
    ...fallenLeaves('near-leaves', 238, 196, 96, 26, 14, 4),
    ...suyari('mist-ridge', -350, -190, -122, 12, 4),
    ...suyari('mist-pond', 130, 330, -112, 12, 8),
    ...suyari('mist-near', -310, -115, 157, 14, 3),
    ...rock('dragon-stone', 65, -55, 38, 22, 3),
    ...rock('shore-stone', 140, -48, 24, 20, 7, {mat: MAT.kirigin}),
    ...hall('hojo', -164, 48, 128, 54, {wallH: 34, bays: 9}),
    ...pine('west-pine', -289, -61, 104, 12, 2, {clusters: 3}),
    ...pine('ridge-pine', 263, -67, 98, -12, 6, {clusters: 3}),
    ...maple('near-maple', 272, 214, 104, -8, 9),
    ...bird('uguisu', [[-268.38, -103.48, 1, 'west-pine', 10], [298.77, 161.54, -1, 'near-maple', 12]]),
  ];
}
