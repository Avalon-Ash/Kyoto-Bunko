import assert from 'node:assert/strict';
import test from 'node:test';
import {cancelBuild, finishBuildInTasks} from '../src/studies/toji/plate/ward-build.js';

function mockScheduler(t, scheduler) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'scheduler');
  Object.defineProperty(globalThis, 'scheduler', {value: scheduler, configurable: true});
  t.after(() => {
    if (descriptor) Object.defineProperty(globalThis, 'scheduler', descriptor);
    else delete globalThis.scheduler;
  });
}

test('an unfinished ward advances once per scheduler task and cancellation closes its generator', async t => {
  const tasks = [], work = [];
  mockScheduler(t, {yield: () => new Promise(resolve => tasks.push(resolve))});
  function* build() {
    try {
      work.push('paint');
      yield 'paint';
      work.push('pack');
      return 'entry';
    } finally {
      work.push('release');
    }
  }
  const slot = {gen: build(), entry: null, buildMs: 0};
  const result = finishBuildInTasks(slot);
  assert.deepEqual(work, []);
  assert.equal(tasks.length, 1);
  tasks.shift()();
  await Promise.resolve();
  assert.deepEqual(work, ['paint']);
  assert.equal(tasks.length, 1);

  cancelBuild(slot);
  assert.deepEqual(work, ['paint', 'release']);
  tasks.shift()();
  await result;
  assert.deepEqual(work, ['paint', 'release']);
  assert.equal(slot.gen, null);
  assert.equal(slot.entry, null);
});

test('the timer fallback finishes the ward in successive tasks and commits its result', async t => {
  mockScheduler(t, undefined);
  t.mock.timers.enable({apis: ['setTimeout']});
  const steps = [];
  const entry = {};
  function* build() {
    yield 'paint';
    return entry;
  }
  const slot = {gen: build(), entry: null, buildMs: 0};
  const result = finishBuildInTasks(slot, (name, start, end) => {
    assert.ok(end >= start);
    steps.push(name);
  });
  assert.deepEqual(steps, []);
  t.mock.timers.tick(0);
  await Promise.resolve();
  assert.deepEqual(steps, ['paint']);
  assert.equal(slot.entry, null);
  t.mock.timers.tick(0);
  await result;
  assert.equal(slot.entry, entry);
  assert.equal(slot.gen, null);
});
