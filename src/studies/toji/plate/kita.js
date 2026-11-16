// A horizontal mirror: three gold storeys rise from the north bank, their broken image lies in still water.
// The island pine balances the pavilion; the entire lower-left quarter stays bare lacquer and nashiji.
// The ground (doha.js) is drawn piece by piece, every outline written here as control points:
//   Kinugasa-yama  one low, wide body of three round heads behind the pavilion, with the pavilion standing in the saddle
//                  between the two left heads so that its roofs and phoenix are read against the lacquer, not against powder.
//   the suhama     the pond's shore: thick on the north (the pavilion stands on it) and the west, a thin silver ribbon along the
//                  north waterline, a thin gold tongue from the south-east that carries the island pine.
import {MAT, blob, pond, phoenix, storey, roof, branchPine as pine, bird, rock, suyari, grassTufts} from './vocab.js';
import {mountain, tongues} from './doha.js';

// The outline pond() draws for 'kyoko' (same arguments): the reeds are set on its north-west bank.
const POND = [-5, 68, 244, 82, 3];
const shore = blob(...POND, .055, 80);
/** A reed clump on the shore at index i, rooted a little inland, leaning out over the water. */
function reed(i, h, n) {
  const [x, z] = shore[i];
  return [x, z - 1.2, h, n, .16];
}

// Kinugasa, far to near. Why: it is the green hill behind the Golden Pavilion; low, so it answers the pavilion instead of competing.
const KINUGASA = [
  // 1 (blue-gold, the farthest) at the far left: a full arc, its peak a little left of the middle
  {ridge: [[-340, -118], [-316, -152], [-276, -176], [-232, -182], [-190, -170], [-160, -146], [-142, -118]], depth: 70, tone: 'blue'},
  // 2 (gold) the broadest, right of the pavilion: climbs slowly and drops at the right
  {ridge: [[-60, -110], [-34, -142], [10, -168], [72, -182], [134, -176], [186, -152], [214, -122]], depth: 78},
  // 3 (gold) in front on the right: a low shoulder with its peak toward the right
  {ridge: [[120, -100], [148, -112], [182, -128], [218, -146], [252, -150], [286, -138], [324, -118], [352, -100]], depth: 66},
];
// The pond's shore, listed far to near (a later piece lies over an earlier one).
const SHORE = [
  // north: the thick gold bank the pavilion stands on; its upper edge behind the pavilion in low waves, its lower edge a little over the water
  {p: [[-326, -30], [-312, -42], [-292, -48], [-270, -44], [-250, -52], [-226, -56], [-202, -50], [-178, -57], [-150, -60], [-122, -54], [-96, -58], [-68, -56], [-40, -50], [-28, -55], [-14, -49], [0, -54], [12, -47], [26, -52], [38, -44], [64, -48], [76, -43], [88, -49], [98, -39], [112, -30], [124, -16],
    [118, -4], [96, -6], [76, -12], [50, -16], [26, -14], [4, -18], [-12, -10], [-30, -16], [-46, -9], [-62, -15], [-78, -6], [-96, -13], [-110, -9], [-132, -6], [-158, 8], [-170, 15], [-184, 11], [-196, 22], [-210, 20], [-222, 31], [-236, 28], [-250, 34], [-272, 26], [-296, 20], [-318, 6], [-328, -12]], tone: 'gold', seed: 71, kiri: [.5, .58]},
  // west: a thick crescent along the pond's west end, over the end of the north bank
  {p: [[-272, 28], [-252, 34], [-238, 48], [-226, 60], [-232, 72], [-224, 86], [-234, 98], [-244, 112], [-258, 126],
    [-282, 126], [-296, 112], [-304, 94], [-312, 76], [-316, 56], [-306, 40], [-290, 32]], tone: 'gold', seed: 72},
  // north waterline: the silver ribbon laid over the gold bank's lower edge, only a hand's breadth wide
  {p: [[-186, 10], [-160, 2], [-136, -6], [-110, -10], [-84, -12], [-58, -8], [-44, -13], [-30, -9], [-16, -13], [-4, -10], [22, -6], [52, -4], [74, 0],
    [66, 8], [44, 6], [18, 10], [-8, 6], [-34, 8], [-60, 4], [-86, 8], [-112, 3], [-140, 10], [-164, 16]], tone: 'silver', seed: 73},
  // south-east: a thin tongue from the shore out under the island pine, ending at the stone
  {p: [[150, 92], [164, 86], [182, 90], [200, 100], [218, 112], [234, 124], [244, 140], [236, 150], [220, 146], [204, 136], [188, 126], [172, 116], [158, 106]], tone: 'gold', seed: 74},
];
/** The clusters, for the measuring and checking scripts. */
const PIECES = {KINUGASA, SHORE};
export {PIECES};

export function kita() {
  const pavilion = [];
  for (let i = 0; i < 3; i++) {
    const eave = -45 - i * 48, w = 94 - i * 17;
    pavilion.push(...storey(`kinkaku-wall-${i}`, -85, eave + 1, eave + 26, w * .73,
      {group: 'kinkaku', order: i * 2, mat: i ? MAT.gold : MAT.lacquer, windowMat: i ? MAT.lacquer : MAT.lamp}));
    pavilion.push(...roof(`kinkaku-roof-${i}`, -85, eave, w, 27,
      {group: 'kinkaku', order: i * 2 + 1, ridgeHalf: w * .48, motionWith: `kinkaku-wall-${i}`}));
  }
  return [
    ...mountain('kinugasa', KINUGASA),
    ...tongues('suhama', SHORE, {toward: [[-150, 68], [-5, 68], [140, 68]]}),
    ...pond('kyoko', -5, 68, 244, 82, 3, {reflection: {x: -85, z: 9, width: 78, height: 90}}),
    // Reeds of silver line work on the north-west bank, from the pavilion's west foot toward the shore stone.
    ...grassTufts('kyoko-reeds', [reed(45, 21, 5), reed(47, 25, 5), reed(49, 21, 5), reed(51, 18, 4)], {on: 'kyoko', mat: MAT.silver, seed: 5, w: 2.4, spread: .12}),
    ...suyari('mist-west', -350, -196, -98, 10, 2),
    ...suyari('mist-east', 232, 352, -84, 10, 7),
    ...rock('shore-stone', -246, 18, 29, 20, 5),
    ...rock('island-stone', 204, 134, 30, 18, 8, {mat: MAT.kirigin}),
    ...pavilion,
    ...phoenix('ho-o', -85, -168, 1.25, {group: 'kinkaku', order: 6}).map(p => ({...p, motionWith: 'kinkaku-wall-2'})),
    ...pine('island-pine', 171, 97, 124, -15, 6),
    ...pine('west-pine', -291, -28, 114, 12, 2, {clusters: 3}),
    ...bird('uguisu', [[148.36, 45.72, -1, 'island-pine', 10], [-270.03, -74.88, 1, 'west-pine', 10]]),
  ];
}
