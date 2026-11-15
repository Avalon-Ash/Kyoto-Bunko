/**
 * Pure rules for the card tilt/gloss and the list transitions (R8), kept apart from React so they can be tested.
 * The springs themselves come from `motion`; nothing here animates.
 */

/** Largest tilt in degrees; lacquer sheen, not a hologram card. */
export const MAX_TILT_DEG = 3.5;
/** Past this many cards a filter change swaps the list at once: an entrance on every card drops frames on phones. */
export const MAX_ANIMATED_CARDS = 30;
/** Only the first few cards get a staggered entrance; the rest appear with them. */
export const STAGGER_CARDS = 8; // mirrored in bunko-ui.css: cards 2–7 step by 20 ms, the rest start together
/** A touch that moves this far is a scroll, not a press. */
export const PRESS_SLOP_PX = 8;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export interface CardPoseInput { x: number; y: number; width: number; height: number; }
export interface CardPose { rotateX: number; rotateY: number; glowX: number; glowY: number; }

/**
 * Pointer position inside a card (relative to its top-left) → tilt in degrees and the gloss centre in percent.
 * The card leans away from the pointer: the pointer near the top edge tips the top edge back (positive rotateX).
 */
export function cardPose({ x, y, width, height }: CardPoseInput, max = MAX_TILT_DEG): CardPose {
  if (!(width > 0) || !(height > 0)) return { rotateX: 0, rotateY: 0, glowX: 50, glowY: 50 };
  const nx = clamp(x / width, 0, 1), ny = clamp(y / height, 0, 1);
  return {
    rotateX: (0.5 - ny) * 2 * max,
    rotateY: (nx - 0.5) * 2 * max,
    glowX: nx * 100,
    glowY: ny * 100,
  };
}

/** Tilt and the hover gloss belong to a mouse or pen; touch gets the press feedback instead. Reduced motion gets neither. */
export function wantsTilt(pointerType: string, reduced: boolean): boolean {
  return !reduced && (pointerType === 'mouse' || pointerType === 'pen');
}
export function wantsPress(pointerType: string, reduced: boolean): boolean {
  return !reduced && pointerType === 'touch';
}

/** True while a touch has moved far enough that it is a scroll or drag. */
export function movedPastSlop(dx: number, dy: number, slop = PRESS_SLOP_PX): boolean {
  return Math.hypot(dx, dy) > slop;
}

export interface ListMotion { animate: boolean; staggerCount: number; }
/** Whether cards joining a changed list animate in (CSS, data-enter on the grid) and how many cards get a staggered entrance. */
export function listMotion(count: number, reduced: boolean): ListMotion {
  if (reduced || count > MAX_ANIMATED_CARDS) return { animate: false, staggerCount: 0 };
  return { animate: true, staggerCount: Math.min(count, STAGGER_CARDS) };
}

type Raf = (cb: () => void) => number;
type Caf = (id: number) => void;
/** Runs only the latest queued job, at most once per frame (pointermove fires faster than frames). */
export function createFrameGate(raf: Raf, caf: Caf) {
  let id = 0, job: (() => void) | null = null;
  return {
    push(fn: () => void) {
      job = fn;
      if (!id) id = raf(() => { id = 0; const run = job; job = null; run?.(); });
    },
    cancel() { if (id) caf(id); id = 0; job = null; },
    get pending() { return id !== 0; },
  };
}
