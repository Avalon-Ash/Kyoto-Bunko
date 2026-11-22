// Shared by scripts/plate.test.mjs (behaviour tests) and scripts/plate-fences.test.mjs (scope and range fences; ADR 0014).
// Wards whose ground is already doha.js pieces (suhama tongues, banks) (hill() and gardenGround() no longer exist: every ward has been redone).
export const dohaWards = new Set(['W_NAKAGYO', 'W_FUSHIMI', 'W_HIGASHIYAMA', 'W_KITA', 'W_MINAMI', 'W_UKYO', 'W_SAKYO', 'W_YAMASHINA', 'W_NISHIKYO', 'W_KAMIGYO', 'W_SHIMOGYO']);
// The wards redone in the nine-wards run (docs/plans/2026-11-16-nine-wards.md): a far mountain, a shore and the rocks they already had (not yet redone), so
// the cluster, piece-count, silver-share and rock-total ranges of the scattered pilot are not asked of them.
export const mountainWards = new Set(['W_HIGASHIYAMA', 'W_KITA', 'W_MINAMI', 'W_UKYO', 'W_SAKYO', 'W_YAMASHINA']);
// The three wards of the third run have no mountain: a shore (Nishikyo's pond, Shimogyo's long bank) or nothing at all (Kamigyo: the Gosho is flat and still,
// so no ground is laid outside the galleries and the 15-35% of mountains and shores does not apply to it). Their pieces: [lowest, highest] number of pieces.
export const flatWards = {W_NISHIKYO: [4, 6], W_KAMIGYO: [0, 0], W_SHIMOGYO: [3, 4]};
export const nineWards = new Set([...mountainWards, ...Object.keys(flatWards)]);
