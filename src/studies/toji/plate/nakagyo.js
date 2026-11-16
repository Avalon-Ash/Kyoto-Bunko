// Six modest roofs descend in a goose-flight staircase, each with its own clear interval; there is no keep.
// The cusped gate anchors the open left court, while the masonry and moat underline the entire procession.
// The ground is suhama (doha.js): tongues of gold and silver, laid one beside and over another, each hall on its own. Every
// outline is written here, point by point, round the piece (x, z from its centre `at`). Four clusters: the staircase of halls,
// the forecourt of the gate, the east pine, the west pine. A few rocks, each against something: see ROCKS.
import {hall, karamon, moatWall, branchPine as pine, bird, suyari} from './vocab.js';
import {tongues} from './doha.js';
import {meshCrag} from './crag-mesh.js';

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

// Rocks (docs/plans/2026-11-16-doha.md §15.1, §17): each against something it belongs to, on the shore. A cluster is one large crag of
// four to six lobes, each a thick slab of low relief (a hand-written outline: its cusps [dx, dz], round bulges between them; h its
// height; t its terraces [k, dx, dz, h]); a lobe listed later stands on whatever it lies over. Then one small lobe beside it, fine
// grain lines, flat pebbles at the foot, and on a few of them a small group of cut-gold squares.
// Everything is relative to (x, z). on: what it stands against; why: the reason it is there.
export const ROCKS = [
  // the east pine's roots: a back slab leaning toward the trunk, a silver slab at the left, a gold one at the right, an olive one over their feet
  {id: 'east-pine', x: 257, z: -66,
    crags: [
      {lobes: [
        {mat: 'olive', h: 3.4, d: [[-15, -8], [-9, -15], [-1, -18], [7, -16], [13, -10], [10, -4], [0, -2], [-9, -3]], t: [[.64, 1, -.5, 1.3], [.36, 2.5, -1, 1]]},
        {mat: 'silver', h: 2.8, mv: [3, 0], d: [[-23, 0], [-18, -8], [-11, -7], [-8, 0], [-12, 7], [-20, 8]], t: [[.58, -.5, .5, 1.1]]},
        {mat: 'gold', h: 3, mv: [-4, 0], d: [[5, -1], [10, -8], [17, -7], [22, -1], [19, 6], [11, 8], [6, 5]], t: [[.58, 1, .5, 1.2]]},
        {mat: 'olive', h: 2.6, mv: [0, -3], d: [[-11, 2], [-5, -4], [3, -4], [8, 2], [5, 9], [-3, 10], [-9, 8]], t: [[.55, 0, 1, 1]]},
        {mat: 'silver', h: 2, mv: [3, -3], d: [[-17, 9], [-12, 5], [-6, 6], [-4, 11], [-9, 14], [-15, 13]]},
      ]},
      {at: [-32, 5], lobes: [{mat: 'silver', h: 1.8, d: [[-5, -1], [-2, -5], [3, -4], [5, 0], [2, 4], [-3, 4]]}, {mat: 'olive', h: 1.2, d: [[3, 2], [7, 0], [10, 3], [7, 6]]}]},
    ],
    lines: [[[-4, -13], [-1, -9], [-2, -5]], [[5, -13], [8, -9], [8, -5]], [[-19, -2], [-16, 3]], [[13, -3], [16, 1]], [[-6, 2], [1, 3], [5, 2]]],
    pebbles: [[-18, 16, 3.2, 1.9, .8, .2, 'silver'], [4, 16, 2.4, 1.6, .7, -.2, 'olive'], [20, 12, 3, 1.8, .7, .3, 'silver']],
    on: 'the roots of the east pine, on the east arm of the shore', why: 'the pine grips a stone; the stone is what holds its foot'},
  // the west pine: a tall back slab (its terraces climb), a silver and an olive shoulder, a broad olive one in front
  {id: 'west-pine', x: -279, z: 74,
    crags: [
      {lobes: [
        {mat: 'gold', h: 3.6, mv: [0, 2], d: [[-7, -10], [-4, -18], [2, -22], [8, -18], [10, -10], [6, -3], [-3, -2]], t: [[.66, 0, -1.5, 1.4], [.4, 1, -3, 1.2]]},
        {mat: 'silver', h: 2.8, mv: [1, 0], d: [[-19, -1], [-14, -8], [-8, -7], [-4, -1], [-8, 5], [-15, 6]], t: [[.55, 0, .5, 1]]},
        {mat: 'olive', h: 2.8, mv: [-2, 0], d: [[5, -2], [10, -8], [16, -8], [20, -2], [17, 5], [9, 6]], t: [[.55, 0, 0, 1.1]]},
        {mat: 'olive', h: 2.6, mv: [2, -5], d: [[-9, 4], [-3, -2], [5, -2], [10, 4], [6, 11], [-2, 12], [-8, 10]], t: [[.58, .5, 1, 1.1]]},
        {mat: 'gold', h: 2, mv: [3, -4], d: [[-17, 8], [-11, 5], [-6, 7], [-5, 12], [-11, 14], [-16, 13]]},
      ]},
      {at: [2, 17], lobes: [{mat: 'olive', h: 1.6, d: [[-6, -3], [-2, -5], [4, -4], [7, 0], [2, 3], [-4, 2]]}]},
    ],
    lines: [[[-2, -18], [1, -13], [1, -8]], [[5, -16], [8, -11]], [[-16, -3], [-13, 2]], [[12, -4], [16, 0]], [[-4, 3], [2, 5], [6, 4]]],
    pebbles: [[-19, 14, 2.6, 1.6, .7, .3, 'silver'], [3, 19, 3.2, 1.8, .8, -.1, 'olive'], [-22, -4, 2, 1.4, .6, 0, 'silver'], [22, 11, 2.2, 1.5, .6, .2, 'silver']],
    on: 'the roots of the west pine, on the left lobe of the shore', why: 'a tall thin stone leaning at the pine, as a lantern stone stands by an old tree'},
  // the foot of the cusped gate, its east side: two crowns, the right one silver and pierced, a gold slab bridging them
  {id: 'karamon-foot', x: -86, z: 173,
    crags: [
      {lobes: [
        {mat: 'olive', h: 3.2, mv: [3, 2], d: [[-23, -6], [-19, -14], [-12, -18], [-6, -13], [-5, -6], [-11, 0], [-19, -1]], t: [[.62, -.5, -.5, 1.2], [.35, -1.5, -1, 1]]},
        {mat: 'silver', h: 3, mv: [-3, 2], d: [[3, -10], [7, -17], [14, -20], [21, -16], [24, -8], [19, -1], [10, 0]], holes: [[[11, -12], [15, -13], [16, -9], [12, -8]]], t: [[.7, 1.5, 1, 1.2]]},
        {mat: 'gold', h: 2.8, d: [[-13, 0], [-6, -6], [4, -7], [13, -5], [18, 1], [13, 7], [3, 8], [-7, 7]], t: [[.58, 0, .5, 1.1]]},
        {mat: 'olive', h: 2.4, mv: [5, -6], d: [[-23, 5], [-17, 1], [-10, 2], [-8, 7], [-13, 11], [-20, 11]], t: [[.5, -.5, .5, .9]]},
        {mat: 'silver', h: 1.9, mv: [-4, -5], d: [[9, 7], [14, 3], [20, 4], [22, 9], [17, 12], [11, 11]]},
      ]},
      {at: [-34, 7], lobes: [{mat: 'gold', h: 1.8, d: [[-4, -2], [0, -5], [4, -3], [4, 2], [0, 4], [-4, 3]]}]},
    ],
    lines: [[[-16, -12], [-12, -9], [-10, -5]], [[-7, 0], [-1, -2], [6, -3]], [[16, -14], [20, -9]], [[2, 4], [8, 4], [13, 3]], [[-18, 4], [-14, 8]]],
    kiri: [{at: [-14, -8], cols: 3, rows: 2, turn: .25}],
    pebbles: [[-14, 11, 3, 1.8, .8, .2, 'silver'], [6, 10, 3.4, 2, .8, -.2, 'olive'], [26, 6, 2.2, 1.5, .6, .3, 'silver']],
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
    ...ROCKS.flatMap(({id, x, z, ...spec}) => meshCrag(`rock-${id}`, x, z, spec)),
    ...rooms.flatMap(([x, z, w], i) => hall(`ninomaru-${i}`, x, z, w, 22, {wallH: 22, bays: 5})),
    ...karamon('karamon', -172, 184, 69),
    ...pine('west-pine', -305, 62, 99, 12, 2, {clusters: 3}),
    ...pine('east-pine', 282, -79, 112, -12, 6, {clusters: 3}),
    ...bird('uguisu', [[-284.56, 21.72, 1, 'west-pine', 10], [261.10, -125.00, -1, 'east-pine', 10]]),
  ];
}
