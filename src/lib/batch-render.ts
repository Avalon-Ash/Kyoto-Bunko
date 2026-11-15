/**
 * Pure rules for rendering a long card list in batches (R8b): the first screens at once, the rest a few cards per frame.
 * Mounting 100+ cards in one commit blocks a phone for ~300 ms; no React or DOM in here so the rules can be tested.
 */

/** Lists up to this long render whole in one go (a small list is cheap, and it keeps the entrance animation intact). */
export const RENDER_ALL_BELOW = 30;
/** Cards added per frame after the first paint. */
export const BATCH_SIZE = 12;
/** Rough height of a card, a little low on purpose so the first batch covers more than two screens. */
const CARD_HEIGHT_PX = 180;

/** How many cards the first commit renders: two viewport heights of cards (times the columns), never fewer than 12. */
export function firstBatchSize(viewportWidth: number, viewportHeight: number): number {
  const columns = viewportWidth >= 768 ? 2 : 1;
  return Math.max(12, columns * Math.ceil((2 * viewportHeight) / CARD_HEIGHT_PX));
}

/** Cards to render now, given how many are unlocked so far. */
export function renderCount(total: number, unlocked: number, first: number): number {
  if (total <= RENDER_ALL_BELOW) return total;
  return Math.min(total, Math.max(first, unlocked));
}

/** The next unlocked count after one more frame. */
export function nextUnlocked(total: number, current: number, batch = BATCH_SIZE): number {
  return Math.min(total, current + batch);
}
