// 南区・東寺. A composition, not a survey: the pagoda on its bank, the hall half lost in mist,
// a stream between two banks, pines in the foreground. A third of the ground stays empty nashiji.
// The ground (doha.js) is drawn piece by piece, every outline written here as control points:
//   the range    three low heads at the far upper left, behind the hall (the hall's roof lies against the lacquer below the crest).
//   the shores   a scalloped tongue under the hall, one under each pine group on the west and one broad one under the pagoda
//                on the east, each reaching to the water; a thin silver ribbon lies along the waterline on each side.
import {MAT, stream, streamEdge, suyari, rock, pagoda, hall, stampedPine as pine, bird, shell, grassTufts, silverPlum} from './vocab.js';
import {mountain, tongues} from './doha.js';

// The stream's own points and widths, kept here so its banks can be found again for the grass.
const STREAM = [[[-8, -150], [22, -70], [-30, 20], [14, 110], [-26, 232]], [7, 11, 17, 25, 36]];
/** A tuft on the bank of the stream at t (0 head, 1 foot), side -1 east or 1 west, set 2.5 units out from the water. */
function bankTuft(t, side, h, n, flower = false) {
  const [x, z] = streamEdge(...STREAM, t, side);
  return [x - side * 2.5, z, h, n, -side * .2, flower];
}

// The far range at the upper left, far to near. Why: the temple stands in the south of the city under a low line of hills; the lowest
// reads as the far horizon, and the stream rises out of the foot of the near one.
const RANGE = [
  // 1 (blue-gold, the farthest) at the far left, beyond the hall's west end: a full arc with its peak toward the left
  {ridge: [[-372, -122], [-358, -160], [-332, -186], [-296, -194], [-250, -184], [-206, -160], [-170, -128]], depth: 66, tone: 'blue'},
  // 2 (gold) the tallest, right of the hall over the stream's head: the stream rises at its foot; the hall's roof lies in the saddle between 1 and 2
  {ridge: [[0, -130], [16, -164], [44, -192], [84, -206], [122, -196], [152, -168], [170, -132]], depth: 66},
  // 3 (gold) a small head in front of the first, at the lid's left edge
  {ridge: [[-372, -100], [-358, -124], [-338, -142], [-312, -146], [-286, -136], [-266, -118], [-250, -100]], depth: 44},
];
// The shores, far to near. Each outline is written round the piece, one point per bend (sharp coves, round lobes).
const SHORES = [
  // west, under the hall: a long low tongue the hall stands on, ending at the water above the first bend
  {p: [[-276, -40], [-262, -52], [-244, -56], [-224, -51], [-204, -58], [-182, -53], [-160, -60], [-136, -54], [-112, -59], [-88, -52], [-64, -57], [-44, -50], [-28, -42],
    [-30, -28], [-36, -17], [-52, -10], [-70, -16], [-88, -8], [-108, -14], [-130, -6], [-150, -13], [-172, -5], [-194, -12], [-214, -4], [-236, -11], [-256, -6], [-272, -16], [-282, -28]], tone: 'gold', seed: 41},
  // west, under the far pine: a round tongue off the lid's left edge, lower edge in broad waves
  {p: [[-350, 132], [-340, 120], [-322, 124], [-304, 114], [-284, 122], [-264, 112], [-244, 120], [-226, 124], [-214, 140], [-220, 158], [-214, 176], [-228, 190],
    [-248, 184], [-266, 198], [-288, 190], [-308, 204], [-330, 196], [-348, 200], [-354, 178], [-346, 154]], tone: 'gold', seed: 42},
  // west, under the near pine and the grey stone: reaches up the west side of the water as a narrow arm
  {p: [[-198, 118], [-180, 107], [-158, 114], [-134, 103], [-112, 111], [-90, 100], [-74, 90], [-68, 74], [-58, 62], [-50, 50], [-45, 46],
    [-43, 60], [-28, 70], [-31, 80], [-17, 90], [-20, 100], [-11, 110], [-21, 120], [-17, 132], [-32, 146], [-29, 158], [-43, 170], [-40, 182], [-54, 194], [-52, 206],
    [-68, 210], [-88, 202], [-110, 212], [-134, 200], [-158, 208], [-182, 196], [-198, 182], [-206, 160], [-196, 138]], tone: 'gold', seed: 43},
  // the silver waterline on the west arm, laid over the gold: a hand's breadth between the gold and the water
  {p: [[-48, 56], [-41, 68], [-36, 80], [-27, 91], [-23, 103], [-20, 112], [-30, 114], [-37, 102], [-43, 90], [-50, 78], [-56, 66], [-58, 58]], tone: 'silver', seed: 44},
  // east, a small lobe on the water's side for the first stone
  {p: [[12, 62], [22, 46], [40, 40], [58, 44], [76, 38], [96, 46], [112, 58], [106, 74], [88, 80], [72, 88], [54, 80], [38, 86], [24, 78]], tone: 'gold', seed: 45},
  // east, under the pagoda: the broad bank the tower stands on, reaching to the water at its west end
  {p: [[38, 116], [54, 108], [76, 116], [98, 106], [122, 114], [146, 104], [172, 112], [196, 102], [222, 110], [248, 100], [274, 108], [300, 98], [326, 106], [346, 118], [354, 140],
    [352, 164], [342, 184], [324, 196], [302, 188], [280, 200], [256, 190], [232, 202], [208, 192], [184, 204], [158, 194], [132, 204], [108, 194], [84, 202], [62, 194], [46, 206], [36, 192], [28, 176], [32, 156], [34, 134]], tone: 'gold', seed: 46},
  // the silver waterline on the east bank, laid over the gold
  {p: [[42, 114], [44, 128], [41, 142], [36, 156], [32, 166], [40, 166], [47, 156], [52, 142], [52, 126], [50, 114]], tone: 'silver', seed: 47},
];
/** The clusters, for the measuring and checking scripts. */
const PIECES = {RANGE, SHORES};
export {PIECES};

export function minami() {
  return [
    // Layer 0: the range, the shores and the water.
    ...mountain('range', RANGE),
    ...tongues('shore', SHORES),
    ...stream('stream', ...STREAM),
    ...shell('shell', [[14, -44, 4.2, 2], [-22, 34, 5, 5], [6, 96, 4.4, 8], [-12, 168, 5.6, 3]]),
    // Grass on both banks: gold line work, two tufts carrying a small silver flower.
    ...grassTufts('stream-grass', [bankTuft(.38, -1, 12, 4), bankTuft(.58, -1, 11, 4, true), bankTuft(.78, -1, 12, 4), bankTuft(.5, 1, 12, 4), bankTuft(.68, 1, 11, 4, true)], {on: 'stream', seed: 4}),
    // A silver plum by the hall's west roof corner.
    ...silverPlum('plum', -222, 4, 1.4, {on: 'kondo'}),
    // Slot 1: mist and stones.
    ...suyari('mist-hall', -360, -18, -34, 17, 5),
    ...suyari('mist-sky', 196, 372, -186, 15, 9),
    ...suyari('mist-far', -372, -250, -118, 13, 14),
    ...rock('rock-a', 62, 62, 34, 22, 3),
    ...rock('rock-b', -44, 112, 27, 18, 8, {mat: MAT.kirigin}),
    ...rock('rock-c', 48, 178, 38, 24, 6),
    // Slot 2: the hall, the pagoda and the trunks. These stand up from the lid.
    ...hall('kondo', -150, -72, 104, 44),
    ...pagoda('pagoda', 176, 128),
    ...pine('pine-a', -288, 172, 150, 26, 2),
    ...pine('pine-b', -134, 190, 104, -18, 7, {clusters: 3}),
    ...pine('pine-c', 300, 150, 96, -14, 5, {clusters: 3}),
    // Slot 3 holds the foliage pads (from pine). The bird's two perches ride on their pines but are painted in
    // slot 1, clear of the stones and the mist, so the pad under a sleeping bird stays whole.
    ...bird('uguisu', [[-259.61, 109.28, 1, 'pine-a', 10], [-157.26, 147.52, -1, 'pine-b', 10]]),
  ];
}
