// Six modest roofs descend in a goose-flight staircase, each with its own clear interval; there is no keep.
// The cusped gate anchors the open left court, while the masonry and moat underline the entire procession.
// The ground is suhama (doha.js): tongues of gold and silver, laid one beside and over another, each hall on its own. Every
// outline is written here, point by point, round the piece (x, z from its centre `at`). Four clusters: the staircase of halls,
// the forecourt of the gate, the east pine, the west pine. A few rocks, each against something: see ROCKS.
import {hall, karamon, moatWall, branchPine as pine, bird, suyari} from './vocab.js';
import {tongues} from './doha.js';
import {crags} from './crag-mesh.js';

// The ground is one shore (岸) along the moat and the stone wall, laid as a gold bank over a thin silver ribbon over a front gold
// bank, with a long gold arm up the east side to the pine. Their outlines are the scalloped waves of a Shioyama-style suhama: a
// run of round lobes with sharp coves between. The halls rise out of mist (suyari), not out of pieces of ground.
// Listed far to near; kiri: [from, to], a string of cut gold along the outline between those fractions of its length.
const SHORE = [
  // silver: a thin ribbon sandwiched between the two gold banks; only a hand's breadth of it shows
  {p: [[-358,172],[-300,170],[-240,173],[-170,171],[-90,173],[0,171],[90,172],[180,171],[260,173],[330,171],[358,174],[358,198],[300,201],[220,199],[130,201],[40,199],[-50,201],[-140,199],[-230,201],[-310,199],[-358,198]], tone: 'silver', seed: 51},
  // the long gold bank: its upper edge scalloped, a lobe at the left that rises to the west pine, its lower edge in gentler waves
  {p: [[-352,180],[-338,184],[-320,187],[-302,185],[-288,180],[-269,187],[-244,189],[-219,186],[-200,180],[-185,183],[-165,186],[-145,185],[-130,180],[-109,185],[-82,188],[-55,185],[-34,180],[-18,186],[2,187],[22,184],[38,180],[56,185],[80,189],[104,187],[122,180],[137,184],[155,186],[173,184],[188,180],[205,186],[227,188],[249,185],[266,181],[284,184],[310,187],[334,185],[352,181],[358,168],[352,152],[334,158],[322,166],[309,159],[292,154],[275,154],[262,163],[247,153],[227,148],[207,152],[192,159],[179,151],[163,146],[147,148],[134,156],[116,144],[94,139],[72,144],[54,151],[39,142],[21,136],[3,137],[-12,147],[-23,139],[-36,135],[-49,138],[-60,145],[-76,132],[-97,127],[-118,133],[-134,140],[-148,132],[-165,126],[-182,127],[-196,137],[-208,125],[-223,121],[-238,126],[-250,134],[-258,112],[-266,92],[-280,68],[-304,52],[-330,56],[-348,76],[-356,110],[-357,150]], tone: 'gold', seed: 52, kiri: [.52, .62]},
  // the front gold bank at the water: low waves, its lower edge under the stone wall
  {p: [[-352,197],[-339,194],[-323,192],[-307,193],[-294,197],[-278,192],[-257,191],[-236,193],[-220,197],[-206,194],[-189,192],[-172,193],[-158,197],[-139,193],[-115,191],[-91,193],[-72,197],[-57,193],[-39,192],[-21,194],[-6,197],[9,194],[29,191],[49,192],[64,197],[77,193],[94,192],[111,193],[124,197],[140,192],[160,191],[180,193],[196,197],[207,194],[222,192],[237,193],[248,196],[262,192],[284,193],[300,197],[322,192],[340,193],[352,196],[353,204],[200,205],[0,204],[-200,205],[-353,204]], tone: 'gold', seed: 53},
  // the east arm: a long gold bank up the right side to the foot of the east pine, its left edge scalloped
  {p: [[356,170],[358,120],[357,60],[354,10],[346,-30],[334,-62],[322,-90],[302,-108],[276,-114],[252,-108],[238,-92],[234,-72],[238,-62],[246,-44],[252,-22],[250,0],[242,18],[236,30],[240,42],[250,58],[256,80],[254,100],[246,114],[242,120],[248,132],[262,146],[270,160],[274,172],[300,176],[330,176]], tone: 'gold', seed: 54, kiri: [.34, .5]},
];

// Rocks (docs/plans/2026-11-16-doha.md §15.1): each against something it belongs to, on the shore. A cluster is one large crag of
// three or four blocks (a ridge each: [dx, dz, height, radius]; a block listed later lies in front of the one before), one small
// crag beside it, fine grain lines, flat pebbles at the foot, and on a few of them a small group of cut-gold squares. Everything is
// relative to (x, z). on: what it stands against; why: the reason it is there.
export const ROCKS = [
  // the east pine's roots: one tall crown leaning toward the trunk, a silver shoulder in front on the left, a gold step on the right
  {id: 'east-pine', x: 257, z: -66, scale: 1.2,
    crags: [
      {seed: 5, blocks: [
        {mat: 'olive', ridge: [[-10, -4, 13, 7], [-2, -8, 18, 8], [8, -6, 16, 7]], strata: {ang: -.7, period: 4.2, amp: 0.6, w: 1.1}},
        {mat: 'silver', ridge: [[-14, 1, 9, 5.5], [-8, 4, 10, 5]], q: .85},
        {mat: 'gold', ridge: [[6, 3, 8, 6], [13, 1, 11, 5]], strata: {ang: .8, period: 3.6, amp: 0.5, w: 1}},
        {mat: 'olive', ridge: [[-4, 3, 8, 5], [1, 5, 6, 4]]},
      ], grooves: [{p: [[3, -9], [4, -3], [3, 3]], w: 2.4, depth: 2.4}]},
      {at: [-28, 5], blocks: [{mat: 'silver', ridge: [[0, 0, 6, 4], [4, -1, 5, 3.4]]}]},
    ],
    lines: [[[-2, -9], [-4, -4], [-6, 1], [-8, 5]], [[1, -8], [2, -3], [2, 3]], [[9, -7], [11, -2], [13, 2]], [[-13, 2], [-15, 5]], [[7, 4], [10, 6], [14, 5]]],
    pebbles: [[-18, 9, 3.2, 1.9, .8, .2, 'silver'], [4, 11, 2.4, 1.6, .7, -.2, 'olive'], [19, 9, 3, 1.8, .7, .3, 'silver']],
    on: 'the roots of the east pine, on the east arm of the shore', why: 'the pine grips a stone; the stone is what holds its foot'},
  // the west pine: a tall thin leaning stone with a flat shoulder at its side
  {id: 'west-pine', x: -279, z: 74, scale: 1.2,
    crags: [
      {seed: 9, blocks: [
        {mat: 'gold', ridge: [[-4, -4, 14, 6], [2, -10, 21, 6], [4, -4, 16, 6]], strata: {ang: 1.3, period: 4, amp: 0.6, w: 1}},
        {mat: 'silver', ridge: [[-10, 2, 9, 5], [-6, 6, 8, 5]], q: .85},
        {mat: 'olive', ridge: [[8, 4, 10, 5], [12, 0, 8, 4]]},
        {mat: 'olive', ridge: [[-3, 3, 10, 5], [3, 4, 11, 4.5]], strata: {ang: -.4, period: 3.5, amp: 0.45, w: 1}},
      ], grooves: [{p: [[0, -12], [-1, -5], [-2, 1]], w: 2.2, depth: 2.6}]},
      {at: [2, 15], blocks: [{mat: 'olive', ridge: [[0, 0, 4, 5], [5, 0, 5, 3.5]]}]},
    ],
    lines: [[[2, -11], [1, -6], [0, -1], [-2, 4]], [[4, -9], [6, -4], [8, 1]], [[-4, -6], [-7, -2], [-9, 2]], [[-10, 3], [-8, 7]], [[10, 2], [12, 6]]],
    pebbles: [[-17, 8, 2.6, 1.6, .7, .3, 'silver'], [3, 12, 3.2, 1.8, .8, -.1, 'olive'], [-14, -2, 2, 1.4, .6, 0, 'silver'], [14, 11, 2.2, 1.5, .6, .2, 'silver']],
    on: 'the roots of the west pine, on the left lobe of the shore', why: 'a tall thin stone leaning at the pine, as a lantern stone stands by an old tree'},
  // the foot of the cusped gate, its east side: two crowns, one of silver, bridged by a gold step
  {id: 'karamon-foot', x: -86, z: 173, scale: 1.2,
    crags: [
      {seed: 13, blocks: [
        {mat: 'olive', ridge: [[-14, -2, 13, 6], [-9, -6, 16, 7]], strata: {ang: .9, period: 4, amp: 0.6, w: 1}},
        {mat: 'silver', ridge: [[8, -6, 17, 7], [13, -2, 12, 5]], q: .9},
        {mat: 'gold', ridge: [[-4, 2, 8, 7], [4, 3, 9, 6]], strata: {ang: -.3, period: 3.6, amp: 0.45, w: 1}},
        {mat: 'olive', ridge: [[-12, 4, 6, 4], [-6, 6, 7, 4]]},
      ], grooves: [{p: [[-1, -9], [-1, -2], [0, 3]], w: 2.6, depth: 3}]},
      {at: [-24, 6], blocks: [{mat: 'gold', ridge: [[0, 0, 5, 4], [3, 1, 6, 3.4]]}]},
    ],
    lines: [[[-9, -7], [-11, -2], [-13, 3]], [[-7, -4], [-4, 0], [-3, 4]], [[8, -7], [9, -2], [10, 3]], [[13, -3], [15, 1]], [[0, 3], [4, 5], [8, 4]]],
    kiri: [{at: [-10, -3], cols: 3, rows: 2, turn: .25}],
    pebbles: [[-14, 9, 3, 1.8, .8, .2, 'silver'], [8, 10, 3.4, 2, .8, -.2, 'olive'], [20, 5, 2.2, 1.5, .6, .3, 'silver']],
    on: 'the footing of the cusped gate, at its east side, on the bank', why: 'the gate foot is steadied by a stone, the way a garden gate has one'},
];

/** The clusters, for the measuring and checking scripts. */
const PIECES = {SHORE};
export {PIECES};

export function nakagyo() {
  const rooms = [[-248, -172, 62], [-161, -110, 64], [-74, -48, 66], [13, 14, 62], [100, 76, 58], [187, 138, 58]];
  return [
    ...tongues('shore', SHORE),
    // The halls rise out of the mist: two bands across the staircase, one among the far halls, one among the near.
    ...suyari('mist-court', -205, 15, -212, 11, 8),
    ...suyari('mist-far', -358, 40, -118, 13, 3),
    ...suyari('mist-near', -90, 358, 62, 13, 5),
    ...moatWall('ishigaki', -333, 333, 201, 218, 232),
    ...crags(ROCKS),
    ...rooms.flatMap(([x, z, w], i) => hall(`ninomaru-${i}`, x, z, w, 22, {wallH: 22, bays: 5})),
    ...karamon('karamon', -172, 184, 69),
    ...pine('west-pine', -305, 62, 99, 12, 2),
    ...pine('east-pine', 282, -79, 112, -12, 6),
    ...bird('uguisu', [[-284.56, 21.72, 1, 'west-pine', 10], [261.10, -125.00, -1, 'east-pine', 10]]),
  ];
}
