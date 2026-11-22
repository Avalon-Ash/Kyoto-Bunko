// Unequal twin roofs share a long baseline and a small connecting gallery, answered by a great fan-leaved tree.
// The foreground between ginkgo and pine is an unpainted court; the back wall supplies a quiet horizontal limit.
import {MAT, hall, corridor, branchGinkgo as ginkgo, fallenFans, branchPine as pine, bird, rock, suyari, lantern} from './vocab.js';
import {tongues} from './doha.js';

// The ground (doha.js) is drawn piece by piece, every outline written here as control points. There is no mountain in this ward.
//   the bank  one long, shallow bank across the near end of the lid, in three pieces, each lying over the end of the one before: the ginkgo stands at its
//             left end and the pine at its right, the fallen fans, the ginkgo's stone and the east stone lie on it. Behind it the court is bare lacquer,
//             the two halls standing on it (their roofs read against the dark) and the mist behind them.
/// The pieces, far to near (a later piece lies over an earlier one). Each outline is written as a few broad lobes (a big lobe 40-70 wide, a small
/// one 15-25) with bays of different depths between, the lobes toward the halls on the back edge and toward the viewer on the front.
const BANK = [
  // the court under the two halls: its back edge is hidden behind their walls, its front thins toward the viewer, with one lobe
  // reaching forward under the pair of lanterns. Why: the halls and the lanterns need ground to stand on; bare lacquer left them floating.
  {p: [[-226, -50], [-196, -64], [-168, -66], [-140, -72], [-116, -60], [-90, -60], [-66, -50], [-40, -52], [-10, -46], [16, -50], [40, -66], [66, -70], [90, -82], [118, -90], [148, -80], [176, -84], [200, -82], [228, -62], [232, -44], [222, -22], [204, -6],
    [196, 14], [190, 36], [178, 54], [150, 62], [122, 58], [100, 62], [78, 54], [66, 36], [58, 14], [40, -2], [10, -10], [-20, -4], [-54, -16], [-90, -20], [-130, -14], [-168, -26], [-204, -30], [-222, -40]], tone: 'gold', seed: 80},
  // left: under the great ginkgo and the fallen fans; its back edge has two big lobes and two small, its right end round and low
  {p: [[-336, 178], [-334, 160], [-322, 148], [-300, 145], [-282, 152], [-270, 157], [-262, 149], [-252, 150], [-246, 158], [-232, 143], [-214, 138], [-196, 144], [-186, 158], [-178, 152], [-160, 145],
    [-140, 148], [-126, 154], [-118, 150], [-106, 146], [-92, 152], [-84, 154], [-76, 162], [-68, 168], [-64, 176], [-62, 188], [-70, 204], [-84, 214], [-100, 220], [-122, 221], [-140, 216], [-150, 211], [-160, 218], [-180, 221],
    [-196, 224], [-212, 221], [-224, 219], [-236, 212], [-248, 218], [-268, 221], [-286, 217], [-300, 222], [-322, 218], [-334, 204], [-338, 190]], tone: 'gold', seed: 81},
  // middle: under the ginkgo's stone and the east stone; lies over the left piece's right end; two big lobes on the back edge, the right one the higher
  {p: [[-130, 176], [-126, 160], [-120, 152], [-106, 149], [-94, 142], [-78, 138], [-62, 141], [-48, 147], [-34, 153], [-22, 160], [-14, 160], [0, 152], [10, 146], [22, 150], [32, 158], [52, 150], [80, 140], [110, 138], [132, 146],
    [146, 154], [160, 148], [176, 142], [194, 148], [210, 158], [218, 172], [216, 190], [204, 206], [188, 214], [170, 219], [146, 217], [130, 210], [116, 217], [90, 221], [62, 219], [40, 213],
    [26, 219], [4, 221], [-16, 216], [-30, 208], [-44, 215], [-70, 219], [-96, 217], [-112, 210], [-124, 200], [-132, 190]], tone: 'gold', seed: 82},
  // right: under the east pine; lies over the middle piece's right end; one big lobe above the pine and a small one beside it
  {p: [[188, 186], [192, 164], [206, 152], [228, 146], [250, 138], [262, 134], [278, 140], [292, 148], [300, 142], [312, 144], [322, 152], [334, 164], [342, 180], [340, 196], [330, 208], [316, 215],
    [296, 219], [274, 221], [256, 215], [240, 221], [220, 219], [204, 213], [192, 204], [188, 194]], tone: 'gold', seed: 83},
];
/** The clusters, for the measuring and checking scripts. */
const PIECES = {BANK};
export {PIECES};

export function shimogyo() {
  return [
    ...tongues('bank', BANK),
    // The mist is behind the halls, between them and the back wall: the roofs rise out of it.
    ...suyari('mist-west', -338, -171, -140, 12, 4),
    ...suyari('mist-east', 122, 329, -156, 15, 8),
    ...corridor('back-wall', -290, 290, -181, {open: false, height: 16}),
    ...hall('amidado', -154, -65, 101, 43, {wallH: 26, group: 'twin-halls'}),
    ...hall('goeido', 128, -80, 135, 59, {wallH: 41, bays: 9, group: 'twin-halls'}),
    ...corridor('watari', -62, 32, -39, {height: 17, group: 'twin-halls'}),
    // Stone lanterns before the Goei-do's steps, a pair: only the great hall has them, the smaller one beside it has none.
    ...lantern('goeido-lantern-west', 88, 46, .8).map(p => ({...p, on: 'goeido-wall'})),
    ...lantern('goeido-lantern-east', 168, 46, .8).map(p => ({...p, on: 'goeido-wall'})),
    ...fallenFans('ginkgo-fall', -170, 190, 150, 32, 42, 6, {size: 12}),
    ...ginkgo('great-ginkgo', -224, 198, 139),
    ...pine('east-pine', 284, 201, 112, -12, 6),
    ...rock('ginkgo-stone', -104, 206, 21, 17, 4),
    ...rock('east-stone', 173, 178, 23, 16, 7, {mat: MAT.kirigin}),
    ...bird('uguisu', [[263.10, 155.00, -1, 'east-pine', 10], [-192.73, 129.80, 1, 'great-ginkgo', 21]]),
  ];
}
