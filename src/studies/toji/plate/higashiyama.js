// 東山区・清水. One mass held in the air: the hall and its stage on a lattice over the drop, Otowa behind it,
// maples in the valley. The left third is the drop itself: empty ground, the far western range and a thread of water.
// The ground (doha.js) is drawn piece by piece, every outline written here as control points:
//   Otowa-yama   ONE body of four rounded heads behind the hall; the tallest just right of the hall; two lower heads flank the hall on its left. The
//                stage is thrust out of its flank. Its foot is dissolved by a band of mist. No rocks on it.
//   the west     three low, pale heads at the far upper left (Nishiyama): the city's far side, with Yasaka's pagoda on its crest.
//   the banks    a scalloped bank the lattice stands on, an arm of it following the Otowa water down to the left, an arm
//                on the right under the maple; a thin silver ribbon under the front of the stage bank.
// The mist across the lattice's middle is what makes it hang: the ground is behind it, far below.
import {MAT, stream, suyari, rock, hall, bird, shell, kakezukuri, stampedMaple as maple, fallenLeaves, farPagoda} from './vocab.js';
import {mountain, tongues} from './doha.js';

// Toyama maki-e: each head is one smooth arc, [x, z] from its left foot to its right: a main peak and a shoulder or two, never the
// same either side. Far to near. Why: the Otowa hill is what the stage is built against; its crest is the brightest line on the lid.
const OTOWA = [
  // 1 (blue-gold, the farthest, at the hall's left): a round head with its peak a little left of the middle, the roof's left slope below it
  {ridge: [[-112, -112], [-88, -150], [-54, -180], [-8, -192], [34, -182], [68, -156], [86, -124]], depth: 84, tone: 'blue'},
  // 2 (gold) the tallest, standing right of the hall: climbs slowly from behind the roof, drops steeply at the right
  {ridge: [[150, -112], [178, -164], [222, -204], [270, -222], [318, -208], [346, -178], [360, -148]], depth: 92},
  // 3 (gold) in front on the left: a broad shoulder at the drop's edge that falls away to the right toward the hall
  {ridge: [[-136, -94], [-118, -124], [-94, -148], [-58, -154], [-16, -138], [22, -116], [50, -96]], depth: 92},
  // 4 (gold) in front on the right: a small head with its peak toward the right, the last of the range
  {ridge: [[226, -96], [238, -112], [258, -132], [290, -150], [324, -156], [346, -138], [356, -116]], depth: 72},
];
// Nishiyama, at the far upper left: one pale head in the blue metal, a second behind it, a small gold one in front on the right.
const WEST = [
  {ridge: [[-360, -110], [-346, -146], [-322, -162], [-290, -158], [-256, -140], [-226, -118], [-204, -102]], depth: 62, tone: 'blue'},
  {ridge: [[-292, -96], [-278, -114], [-258, -128], [-228, -134], [-200, -126], [-182, -104]], depth: 52, tone: 'blue'},
  {ridge: [[-232, -90], [-214, -116], [-190, -126], [-166, -114], [-150, -92]], depth: 46},
];
// The banks. Each outline is written round the piece, one point per bend of the shore (a scalloped edge: sharp coves, round lobes).
const BANKS = [
  // the thin silver ribbon under the front of the stage bank: only a hand's breadth of it shows below the gold
  {p: [[30, 132], [48, 128], [72, 130], [96, 134], [112, 142], [104, 150], [84, 148], [70, 156], [52, 151], [36, 145]], tone: 'silver', seed: 61},
  // the stage bank: the lattice's posts all stand on it; its upper edge lies behind them, its lower edge in gentle waves
  {p: [[-56, 108], [-46, 100], [-30, 96], [-14, 98], [2, 92], [20, 96], [34, 101], [48, 95], [62, 100], [76, 92], [90, 95], [104, 90], [118, 96], [130, 99], [154, 93], [170, 90], [184, 96], [198, 92], [214, 99], [230, 95], [246, 101], [262, 96], [270, 100], [274, 110],
    [270, 122], [252, 128], [234, 124], [214, 131], [192, 128], [170, 134], [148, 130], [130, 134], [118, 139], [106, 131], [94, 137], [82, 128], [58, 132], [36, 128], [22, 135], [8, 129], [-6, 135], [-18, 128], [-32, 132], [-42, 124], [-50, 120]], tone: 'gold', seed: 62, kiri: [.5, .62]},
  // the water's bank: from under the stage's left foot down the valley beside the Otowa water, a narrow arm that follows it
  {p: [[-62, 108], [-80, 104], [-98, 109], [-114, 106], [-130, 116], [-148, 118], [-166, 128], [-184, 130], [-202, 140], [-222, 142], [-240, 152], [-258, 154], [-274, 166], [-294, 170], [-312, 184], [-322, 196],
    [-318, 204], [-300, 198], [-290, 190], [-278, 192], [-268, 181], [-256, 184], [-246, 171], [-234, 172], [-226, 162], [-206, 160], [-196, 152], [-184, 154], [-170, 146], [-158, 149], [-148, 142], [-140, 139], [-130, 141], [-120, 133], [-110, 135], [-100, 127], [-88, 128], [-72, 124]], tone: 'gold', seed: 63},
  // the east bank: a broad arm under the maple on the right, its lower edge dipping to the stone
  {p: [[226, 110], [240, 104], [258, 100], [276, 102], [296, 96], [318, 98], [338, 94], [358, 100],
    [358, 146], [342, 152], [324, 148], [306, 156], [288, 162], [270, 172], [254, 176], [240, 166], [228, 158], [222, 144], [220, 126]], tone: 'gold', seed: 64},
];
/** The clusters, for the measuring and checking scripts. */
const PIECES = {OTOWA, WEST, BANKS};
export {PIECES};

export function higashiyama() {
  return [
    // Layer 0: Otowa, the western range, the banks, and the water.
    ...mountain('otowa', OTOWA),
    ...mountain('nishiyama', WEST),
    ...tongues('bank', BANKS),
    ...stream('otowa-water', [[-80, 138], [-150, 156], [-222, 176], [-284, 204], [-330, 238]], [5, 8, 12, 17, 24]),
    ...shell('shell', [[-118, 146, 4, 2], [-196, 166, 4.8, 5], [-262, 192, 5.4, 8]]),
    // Yasaka's pagoda on the crest of the western range, very small and pale: its height is under a quarter of the hall's.
    ...farPagoda('yasaka-tower', -322, -161, 20, {on: 'nishiyama-blue'}),
    // Fallen leaves of cut gold and silver drift from the maples down the valley toward the water.
    ...fallenLeaves('momiji', -60, 192, 240, 34, 30, 7),
    // Slot 1: mist and stones. The mist across the lattice is the void under the stage; the others cut the feet of the two ranges.
    ...suyari('mist-under', -150, 290, 52, 11, 5),
    ...suyari('mist-west', -352, -176, -88, 11, 11),
    ...suyari('mist-hall', 210, 352, -70, 12, 8),
    ...rock('rock-a', -10, 150, 30, 20, 5),
    ...rock('rock-b', 262, 176, 34, 22, 7, {mat: MAT.kirigin}),
    // Slot 2: the stage. Lattice, deck, hall and roof are one solid standing on the lattice's foot.
    ...kakezukuri('butai', -40, 252, -8, 104, {posts: 8}),
    ...hall('hondo', 106, -44, 132, 60, {wallH: 33, bays: 9, group: 'butai', order: 2}),
    ...maple('maple-a', -134, 216, 96, 10, 2),
    ...maple('maple-b', 150, 218, 78, -8, 9),
    ...maple('maple-c', 316, 122, 72, -6, 4),
    ...bird('uguisu', [[-111.57, 167.13, 1, 'maple-a', 12], [335.44, 83.92, -1, 'maple-c', 12]]),
  ];
}
