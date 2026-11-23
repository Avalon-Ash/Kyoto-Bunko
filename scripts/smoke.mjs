// Smoke test for the home entrance flow: home load -> cabinet switch -> open volume -> return home -> console check.
// Usage: node scripts/smoke.mjs [--allow-static] [--query=<a=b&c=d>]   (or: npm run smoke). Fails on the still picture unless
// --allow-static. --query is added to the home URL, e.g. --query=plate=shaderfail (dev only: a shader fails on purpose).
// Prerequisite: dev server running at http://127.0.0.1:3000 (npm run dev -- --host 127.0.0.1 --strictPort).
// Reuses the shared headless Chrome on port 9377 via scripts/lib/plate-env.mjs; closes its own tab on exit, keeps Chrome alive.
// Checks: #scene reaches 'three' or 'static', ArrowRight advances to the next ward in window.__kyotoCabinetIds,
// Enter opens the matching ward volume (.detail-view .back-button, .spot-grid, heading title), .back-button returns to #scene
// on that same ward, and console has zero errors or uncaught exceptions (warnings are listed without failing).
// Does not check: pixel rendering, mobile layout, drag/pinch gestures, map view, theme/language/motion toggles, or tag/area modes.
import {SHARED_DEBUG_PORT, DEV_HOME_URL, ensureSharedChrome, connectCdp, sleep} from './lib/plate-env.mjs';

const QUERY = process.argv.find(a => a.startsWith('--query='))?.slice('--query='.length) ?? '';
/** The page the run opens: the home page, with --query when given. */
const HOME_URL = QUERY ? `${DEV_HOME_URL}?${QUERY}` : DEV_HOME_URL;

const VIEWPORT_WIDTH = 1440;
const VIEWPORT_HEIGHT = 900;
const DEV_CHECK_TIMEOUT_MS = 3000;
const POLL_INTERVAL_MS = 100;
const SCENE_READY_TIMEOUT_MS = 30_000;
const SWITCH_TIMEOUT_MS = 10_000;
const VOLUME_OPEN_TIMEOUT_MS = 10_000;
const RETURN_HOME_TIMEOUT_MS = 30_000;

/**
 * Polls `predicate` until it returns a truthy value or `timeoutMs` elapses.
 * @template T
 * @param {() => Promise<T | null | undefined | false>} predicate
 * @param {number} timeoutMs
 * @returns {Promise<T | null>}
 */
async function waitFor(predicate, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (true) {
    const result = await predicate();
    if (result) return result;
    if (Date.now() >= deadline) return null;
    await sleep(POLL_INTERVAL_MS);
  }
}

/**
 * Checks whether the dev server responds at DEV_HOME_URL.
 * @returns {Promise<boolean>}
 */
async function isDevServerReachable() {
  try {
    const response = await fetch(DEV_HOME_URL, {signal: AbortSignal.timeout(DEV_CHECK_TIMEOUT_MS)});
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Dispatches a keyDown + keyUp pair over CDP.
 * @param {(method: string, params?: Record<string, unknown>) => Promise<unknown>} send
 * @param {string} key
 * @param {string} code
 * @param {number} keyCode
 */
async function pressKey(send, key, code, keyCode) {
  const base = {key, code, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode};
  await send('Input.dispatchKeyEvent', {type: 'keyDown', ...base});
  await send('Input.dispatchKeyEvent', {type: 'keyUp', ...base});
}

/** @param {Record<string, unknown>} payload */
function emit(payload) {
  console.log(JSON.stringify(payload));
}

if (!await isDevServerReachable()) {
  console.error(`Dev server is not reachable at ${DEV_HOME_URL}. Start it with: npm run dev -- --host 127.0.0.1 --strictPort`);
  process.exit(2);
}

await ensureSharedChrome();
const {target, ws, send, evalJs, logs} = await connectCdp(SHARED_DEBUG_PORT);

// Console errors and uncaught exceptions fail the run; warnings are only listed (levels come from connectCdp's logs).
// Read when reported, so a run that stops at an earlier step still lists what the console said up to then.
const consoleErrors = () => logs.filter(l => l.level !== 'warning').map(l => l.level === 'exception' ? `EXC ${l.text}` : l.text);
const consoleWarnings = () => logs.filter(l => l.level === 'warning').map(l => l.text);

let steps = 0;
/** @type {string | null} */
let failed = null;
/** @type {'three' | 'static' | null} */
let renderer = null;

try {
  // Step 1: Open home page at 1440x900 and wait for #scene to become ready ('three' or 'static').
  const tHome = Date.now();
  await send('Emulation.setDeviceMetricsOverride', {
    width: VIEWPORT_WIDTH,
    height: VIEWPORT_HEIGHT,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send('Page.navigate', {url: HOME_URL});
  /** @type {{renderer: 'three' | 'static', ward: string, ids: string[]} | null} */
  const home = await waitFor(() => evalJs(`(() => {
    const scene = document.querySelector('#scene');
    const r = scene?.dataset.renderer;
    const ward = scene?.dataset.ward;
    const ids = window.__kyotoCabinetIds;
    if ((r !== 'three' && r !== 'static') || !ward || !Array.isArray(ids) || !ids.includes(ward)) return null;
    if (!document.querySelector('#cabinet-context')?.textContent) return null;
    return {renderer: r, ward, ids};
  })()`), SCENE_READY_TIMEOUT_MS);
  const homeMs = Date.now() - tHome;
  steps++;
  if (!home) {
    failed = 'home';
    emit({step: 'home', ok: false, ms: homeMs, reason: 'timeout waiting for #scene with renderer three|static'});
  } else {
    renderer = home.renderer;
    emit({
      step: 'home',
      ok: true,
      ms: homeMs,
      renderer: home.renderer,
      degraded: home.renderer === 'static',
      ward: home.ward,
    });
  }

  // Step 2: Switch cabinet via ArrowRight and verify dataset.ward advances to the next id in __kyotoCabinetIds.
  /** @type {string | null} */
  let nextWard = null;
  let expectedWardName = '';
  if (!failed && home) {
    const startIdx = home.ids.indexOf(home.ward);
    nextWard = home.ids[(startIdx + 1) % home.ids.length];
    const tSwitch = Date.now();
    await evalJs(`document.querySelector('#scene')?.focus({preventScroll: true})`);
    await pressKey(send, 'ArrowRight', 'ArrowRight', 39);
    /** @type {{ward: string, wardName: string} | null} */
    const switched = await waitFor(() => evalJs(`(() => {
      const scene = document.querySelector('#scene');
      const stage = document.querySelector('#stage');
      if (scene?.dataset.ward !== ${JSON.stringify(nextWard)}) return null;
      if (stage?.dataset.bookState !== 'closed') return null;
      const contextText = document.querySelector('#cabinet-context')?.textContent ?? '';
      return {ward: scene.dataset.ward, wardName: contextText.split(' · ')[0].trim()};
    })()`), SWITCH_TIMEOUT_MS);
    const switchMs = Date.now() - tSwitch;
    steps++;
    if (!switched) {
      failed = 'switch';
      const currentWard = await evalJs(`document.querySelector('#scene')?.dataset.ward ?? null`);
      emit({step: 'switch', ok: false, ms: switchMs, from: home.ward, expected: nextWard, actual: currentWard});
    } else {
      expectedWardName = switched.wardName;
      emit({step: 'switch', ok: true, ms: switchMs, from: home.ward, to: switched.ward, wardName: expectedWardName});
    }
  }

  // Step 3: Open the lid via Enter, wait for DetailView (.back-button, .spot-grid), and verify the ward title matches.
  if (!failed && nextWard) {
    const tOpen = Date.now();
    await evalJs(`document.querySelector('#scene')?.focus({preventScroll: true})`);
    await pressKey(send, 'Enter', 'Enter', 13);
    /** @type {{title: string, kicker: string} | null} */
    const opened = await waitFor(() => evalJs(`(() => {
      const back = document.querySelector('.detail-view .back-button');
      const grid = document.querySelector('.detail-view .spot-grid');
      if (!back || !grid) return null;
      const title = document.querySelector('.detail-view .detail-heading h2')?.textContent?.trim() ?? '';
      const kicker = document.querySelector('.detail-view .detail-heading .ui-kicker')?.textContent?.trim() ?? '';
      if (${JSON.stringify(expectedWardName)} && title !== ${JSON.stringify(expectedWardName)}) return null;
      return {title, kicker};
    })()`), VOLUME_OPEN_TIMEOUT_MS);
    const openMs = Date.now() - tOpen;
    steps++;
    if (!opened) {
      failed = 'open';
      const actualTitle = await evalJs(`document.querySelector('.detail-view .detail-heading h2')?.textContent?.trim() ?? null`);
      const hasBack = await evalJs(`Boolean(document.querySelector('.detail-view .back-button'))`);
      emit({step: 'open', ok: false, ms: openMs, ward: nextWard, expectedTitle: expectedWardName, actualTitle, hasBack});
    } else {
      emit({step: 'open', ok: true, ms: openMs, ward: nextWard, title: opened.title, kicker: opened.kicker});
    }
  }

  // Step 4: Click .back-button and wait for #scene to return with dataset.ward still on the switched ward.
  if (!failed && nextWard) {
    const tReturn = Date.now();
    await evalJs(`document.querySelector('.detail-view .back-button')?.click()`);
    /** @type {{ward: string, renderer: 'three' | 'static'} | null} */
    const returned = await waitFor(() => evalJs(`(() => {
      const scene = document.querySelector('#scene');
      const r = scene?.dataset.renderer;
      if (!scene || (r !== 'three' && r !== 'static')) return null;
      if (scene.dataset.ward !== ${JSON.stringify(nextWard)}) return null;
      return {ward: scene.dataset.ward, renderer: r};
    })()`), RETURN_HOME_TIMEOUT_MS);
    const returnMs = Date.now() - tReturn;
    steps++;
    if (!returned) {
      failed = 'return';
      const currentWard = await evalJs(`document.querySelector('#scene')?.dataset.ward ?? null`);
      emit({step: 'return', ok: false, ms: returnMs, expectedWard: nextWard, actualWard: currentWard});
    } else {
      emit({step: 'return', ok: true, ms: returnMs, ward: returned.ward, renderer: returned.renderer, degraded: returned.renderer === 'static'});
    }
  }

  // Step 5: Verify no console errors or uncaught exceptions occurred (from connectCdp's logs array).
  steps++;
  const consoleOk = consoleErrors().length === 0;
  if (!consoleOk && !failed) failed = 'console';
  emit({step: 'console', ok: consoleOk, ms: 0, errors: consoleErrors().length, warnings: consoleWarnings().length});
} finally {
  await send('Target.closeTarget', {targetId: target.id}).catch(() => {});
  ws.close();
}

// The still picture (no WebGL2, three.js failed) passes only with --allow-static: by default the smoke test is that three.js draws.
const ALLOW_STATIC = process.argv.includes('--allow-static');
if (!failed && renderer !== 'three' && !ALLOW_STATIC) failed = 'renderer';
const errors = consoleErrors(), warnings = consoleWarnings();
const ok = failed === null && errors.length === 0;
emit({ok, steps, failed, renderer, errors, warnings});
process.exitCode = ok ? 0 : 1;
