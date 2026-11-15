// 南区・東寺. A composition, not a survey: the pagoda on its bank, the hall half lost in mist,
// a stream between two banks, pines in the foreground. A third of the ground stays empty nashiji.
import {MAT, hill, stream, streamEdge, suyari, rock, pagoda, hall, stampedPine as pine, bird, shell, grassTufts, silverPlum} from './vocab.js';

// The stream's own points and widths, kept here so its banks can be found again for the grass.
const STREAM = [[[-8, -150], [22, -70], [-30, 20], [14, 110], [-26, 232]], [7, 11, 17, 25, 36]];
/** A tuft on the bank of the stream at t (0 head, 1 foot), side -1 east or 1 west, set 2.5 units out from the water. */
function bankTuft(t, side, h, n, flower = false) {
  const [x, z] = streamEdge(...STREAM, t, side);
  return [x - side * 2.5, z, h, n, -side * .2, flower];
}

export function minami() {
  return [
    // Layer 0: the ground itself — banks and water. It swells, it does not stand.
    ...hill('bank-far', -360, -70, -168, -112, 11, {amp: .34, mat: MAT.nashijiLight, humps: 3}),
    ...hill('bank-left', -372, -52, 92, 214, 23, {amp: .8}),
    ...hill('bank-right', 44, 372, 118, 214, 31, {amp: .7, mat: MAT.gyobu, humps: 1}),
    ...stream('stream', ...STREAM),
    ...shell('shell', [[14, -44, 4.2, 2], [-22, 34, 5, 5], [6, 96, 4.4, 8], [-12, 168, 5.6, 3]]),
    // Grass on both banks: gold line work, two tufts carrying a small silver flower.
    ...grassTufts('stream-grass', [bankTuft(.38, -1, 12, 4), bankTuft(.58, -1, 11, 4, true), bankTuft(.78, -1, 12, 4), bankTuft(.5, 1, 12, 4), bankTuft(.68, 1, 11, 4, true)], {on: 'stream', seed: 4}),
    // A silver plum by the hall's west roof corner.
    ...silverPlum('plum', -222, 4, 1.4, {on: 'kondo'}),
    // Slot 1: mist and stones.
    ...suyari('mist-hall', -360, -18, -34, 17, 5),
    ...suyari('mist-sky', 196, 372, -186, 15, 9),
    ...suyari('mist-far', -372, -210, -206, 13, 14),
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
