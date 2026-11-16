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
/// The shores, far to near. Each outline is written round the piece as a few broad lobes (a big lobe 40-70 wide, a small one 15-25) with bays of different depths between.
// The pond's length: the shores that lie along it are drawn firm at the water and thin away from it (doha.js tongueFade).
const POND = [[80, 49], [143, 49], [210, 49]];
const SHORES = [
  // west, under the old pine behind the hall: a big lobe, a small one and a mid one along its back, two lobes below with a shallow bay
  {p: [[-348, -54], [-340, -76], [-322, -85], [-302, -88], [-290, -80], [-284, -88], [-274, -91], [-266, -82], [-260, -77], [-252, -86], [-238, -84], [-226, -72], [-222, -58],
    [-232, -46], [-246, -38], [-268, -34], [-290, -36], [-300, -42], [-306, -49], [-314, -44], [-324, -35], [-336, -38], [-347, -42]], tone: 'gold', seed: 51},
  // east, under the pine at the pond's back right: reaches round the pond's north-east corner; a big lobe and a small one on top, a mid and a small one below
  {p: [[214, -70], [224, -90], [244, -100], [266, -96], [276, -88], [284, -93], [292, -101], [304, -104], [313, -98], [320, -92], [328, -97], [343, -86], [352, -66], [354, -50], [346, -34],
    [336, -27], [320, -21], [302, -24], [290, -32], [284, -37], [278, -31], [268, -24], [260, -31], [254, -40], [246, -45], [232, -51], [220, -59]], toward: POND, tone: 'gold', seed: 52},
  // north: the crescent along the pond's back where the two stones lie, thick in the middle, its lower edge on the water: two big lobes above, two small ones, a long lower edge of lobes of every size
  {p: [[-8, 8], [-5, -16], [4, -34], [22, -52], [32, -74], [54, -84], [78, -82], [92, -72], [97, -69], [102, -78], [112, -90], [124, -88], [131, -80], [138, -90], [160, -100], [186, -98], [204, -88], [210, -78], [218, -84], [228, -86], [236, -76], [242, -68], [252, -62], [266, -46], [276, -30], [284, -12], [284, 4],
    [278, 2], [270, -16], [258, -30], [244, -32], [234, -44], [226, -50], [214, -58], [204, -58], [196, -66], [184, -62], [160, -58], [140, -60], [128, -62], [118, -68], [110, -62], [98, -54], [90, -58], [80, -50], [62, -40], [44, -36], [34, -40], [28, -33], [20, -24], [8, -14]], toward: POND, tone: 'gold', seed: 53},
  // the silver waterline on the north crescent, laid over the gold along its lower edge: a hand's breadth between the gold and the water
  {p: [[130, -67], [144, -65], [160, -62], [182, -66], [194, -70], [202, -63], [212, -62], [220, -59], [216, -69], [205, -74], [189, -77], [161, -71], [143, -73], [129, -74]], tone: 'silver', seed: 54},
  // the long bank in front of the hall: the veranda stands on it; five lobes along its back and six below, its right end reaching the pond's west tip
  {p: [[-338, 110], [-336, 104], [-328, 88], [-308, 80], [-286, 80], [-268, 88], [-260, 96], [-254, 86], [-244, 78], [-234, 84], [-228, 92], [-222, 90], [-214, 82], [-190, 74], [-160, 72], [-134, 78], [-118, 88], [-112, 92], [-104, 84], [-88, 76], [-72, 80], [-64, 88], [-58, 92], [-52, 80], [-36, 78], [-20, 84], [-8, 94], [-2, 108], [-4, 118],
    [-8, 124], [-18, 133], [-38, 137], [-56, 133], [-64, 126], [-70, 122], [-76, 126], [-86, 134], [-98, 130], [-104, 122], [-112, 128], [-134, 136], [-166, 138], [-188, 132], [-198, 126], [-204, 120], [-210, 126], [-218, 132], [-226, 126], [-232, 118], [-240, 124], [-262, 134], [-290, 134], [-310, 128], [-316, 120], [-322, 118], [-330, 126], [-340, 121]], tone: 'gold', seed: 55},
  // south, under the red maple: a round tongue in the near corner where the leaves fall; a big lobe, two small ones and a mid one on its back
  {p: [[198, 196], [202, 176], [224, 168], [250, 166], [266, 172], [272, 178], [280, 172], [292, 166], [304, 172], [310, 178], [316, 172], [334, 180], [344, 198],
    [342, 210], [334, 220], [314, 222], [296, 217], [288, 212], [280, 216], [270, 222], [248, 224], [230, 220], [222, 213], [214, 218], [204, 212]], toward: POND, tone: 'gold', seed: 56},
];
/** The clusters, for the measuring and checking scripts. */
const PIECES = {ARASHIYAMA, KAMEYAMA, SHORES};
export {PIECES};

export function ukyo() {
  return [
    ...mountain('arashiyama', ARASHIYAMA),
    ...mountain('kameyama', KAMEYAMA),
    ...tongues('shore', SHORES),
    ...pond('sogen', 143, 49, 160, 115, 5),
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
