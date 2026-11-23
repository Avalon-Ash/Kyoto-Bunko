// Shared dev-server URLs, headless Chrome launch parameters, and CDP connection helpers for plate scripts.
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

export const DEV_ORIGIN = 'http://127.0.0.1:3000';
export const DEV_HOME_URL = `${DEV_ORIGIN}/`;
export const DEV_STUDY_URL = `${DEV_ORIGIN}/toji-study/index.html`;

/**
 * Builds the standalone toji-study URL with an optional query string or URLSearchParams.
 * @param {URLSearchParams | string} [query]
 */
export function studyUrl(query) {
  const qs = query ? String(query).replace(/^\?/, '') : '';
  return DEV_STUDY_URL + (qs ? '?' + qs : '');
}

export const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

// Two debugging ports so the two Chrome lifecycles never interfere with each other:
// - SHARED_DEBUG_PORT (9377): shared persistent Chrome used by plate-shot.mjs and plate-clip.mjs,
//   with its profile in node_modules/.cache/chrome-profile; kept running after each script exits.
// - FALLBACK_DEBUG_PORT (9378): ephemeral Chrome spawned per run by plate-fallback-shots.mjs,
//   with a temporary profile and killed on exit.
// - PERF_DEBUG_PORT (9379): ephemeral Chrome spawned per run by perf-home.mjs (a fresh profile is a cold shader cache).
export const SHARED_DEBUG_PORT = 9377;
export const FALLBACK_DEBUG_PORT = 9378;
export const PERF_DEBUG_PORT = 9379;
export const SHARED_CHROME_PROFILE = fileURLToPath(new URL('../../node_modules/.cache/chrome-profile', import.meta.url));

/** @param {number} ms */
export const sleep = ms => new Promise(r => setTimeout(r, ms));

/** @param {number} port */
export const isChromeAlive = async port => {
  try { return (await fetch(`http://127.0.0.1:${port}/json/version`)).ok; } catch { return false; }
};

/**
 * @param {number} port
 * @param {number} [attempts]
 * @param {number} [intervalMs]
 */
export const waitForChrome = async (port, attempts = 40, intervalMs = 250) => {
  for (let i = 0; i < attempts && !await isChromeAlive(port); i++) await sleep(intervalMs);
};

/**
 * Launches headless Chrome with the exact GPU and window flags required by plate scripts.
 * @param {{port: number, profileDir: string, width?: number, height?: number, detached?: boolean}} options
 */
export function launchChrome({port, profileDir, width = 1440, height = 900, detached = false}) {
  const args = [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    '--use-angle=d3d11',
    '--enable-gpu',
    '--ignore-gpu-blocklist',
    '--hide-scrollbars',
    `--window-size=${width},${height}`,
    'about:blank',
  ];
  const child = spawn(CHROME_PATH, args, detached ? {detached: true, stdio: 'ignore'} : {stdio: 'ignore'});
  if (detached) child.unref();
  return child;
}

/** Ensures the persistent shared headless Chrome (port 9377) is running. */
export async function ensureSharedChrome() {
  if (!await isChromeAlive(SHARED_DEBUG_PORT)) {
    launchChrome({port: SHARED_DEBUG_PORT, profileDir: SHARED_CHROME_PROFILE, detached: true});
    await waitForChrome(SHARED_DEBUG_PORT);
  }
}

/**
 * Opens a new blank target on the given debugging port and connects over CDP.
 * @param {number} port
 * @param {{throwOnException?: boolean}} [options]
 */
export async function connectCdp(port, {throwOnException = false} = {}) {
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, {method: 'PUT'})).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));
  let seq = 0;
  const pending = new Map();
  /** @type {string[]} */
  const logs = [];
  ws.addEventListener('message', e => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type)) logs.push(m.params.args.map(a => a.value ?? a.description).join(' '));
    if (m.method === 'Runtime.exceptionThrown') logs.push('EXC ' + m.params.exceptionDetails.text + ' ' + (m.params.exceptionDetails.exception?.description ?? ''));
  });
  /**
   * @param {string} method
   * @param {Record<string, unknown>} [params]
   */
  const send = (method, params = {}) => new Promise(r => { const id = ++seq; pending.set(id, r); ws.send(JSON.stringify({id, method, params})); });
  /** @param {string} expression */
  const evalJs = async expression => {
    const r = (await send('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true})).result;
    if (throwOnException && r?.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
    return r?.result?.value;
  };
  await send('Runtime.enable');
  await send('Page.enable');
  return {target, ws, send, evalJs, logs};
}
