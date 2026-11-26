// A ward's composition as a list of steps (L3d P1, docs/plans/2026-11-26-boot.md). Calling it runs every step and returns the
// parts in order, the same array PLATES[ward]() always returned; composeInSteps runs the steps one at a time and yields between
// slices, so the first plate's build in tasks does not hold the page for the whole composition.
import {taskSlice} from './ward-build.js';

/** @typedef {() => object[]} ComposeStep a run of parts, in the composition's order */
/** @typedef {(() => object[]) & {steps?: readonly ComposeStep[]}} Composition */

/** @param {readonly ComposeStep[]} steps @returns {Composition} */
export function composition(steps) {
  const compose = () => steps.flatMap(step => step());
  return Object.assign(compose, {steps});
}

/**
 * The composition's parts, one step at a time: yields 'compose-plate' once a slice is due (ward-build.js). A function without
 * steps is called whole.
 * @param {Composition} compose
 * @returns {Generator<string, object[], void>}
 */
export function* composeInSteps(compose) {
  if (!compose.steps) return compose();
  const slice = taskSlice(), parts = [];
  for (const step of compose.steps) {
    for (const part of step()) parts.push(part);
    if (slice.due()) { yield 'compose-plate'; slice.restart(); }
  }
  return parts;
}
