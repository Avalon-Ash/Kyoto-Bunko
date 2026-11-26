/** @template T @typedef {{gen: Generator<string, T, void> | null, entry: T | null, buildMs: number}} WardBuild */
/** @typedef {(step: string, start: number, end: number) => void} MeasureStep */

/**
 * How long a stepped build runs before it yields: room below the browser's 50 ms long-task threshold for the next indivisible
 * operation (one canvas fill, one composition step). The one slice budget for every stepped build (bake.js, compose.js).
 */
export const TASK_SLICE_MS = 32;

/** A time slice: due() once TASK_SLICE_MS have run since it began; restart() after the yield. */
export function taskSlice() {
  let start = performance.now();
  return {
    due: () => performance.now() - start >= TASK_SLICE_MS,
    restart() { start = performance.now(); },
  };
}

function yieldToMain() {
  const scheduler = /** @type {{yield?: () => Promise<void>}} */ ('scheduler' in globalThis ? globalThis.scheduler : undefined);
  // A zero-delay timer also starts a new task in browsers without the Scheduling API.
  return typeof scheduler?.yield === 'function' ? scheduler.yield() : new Promise(resolve => setTimeout(resolve, 0));
}

/** @template T @param {WardBuild<T>} slot @param {MeasureStep} [measure] */
export function stepBuild(slot, measure) {
  const start = performance.now();
  const step = slot.gen.next();
  const end = performance.now();
  slot.buildMs += end - start;
  if (step.done === true) {
    slot.entry = step.value;
    slot.gen = null;
  } else measure?.(step.value, start, end);
}

/** @template T @param {WardBuild<T>} slot @param {MeasureStep} [measure] */
export async function finishBuildInTasks(slot, measure) {
  while (slot.gen) {
    await yieldToMain();
    if (slot.gen) stepBuild(slot, measure);
  }
}

/** @template T @param {WardBuild<T>} slot */
export function cancelBuild(slot) {
  const gen = slot.gen;
  slot.gen = null; // A continuation already scheduled for this slot will no longer advance it.
  gen?.return(undefined);
}
