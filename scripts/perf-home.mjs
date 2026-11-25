// Measures the home page's makie cabinet: first load (cold and warm shader cache), one cabinet switch, and idle frame time.
// Usage: node scripts/perf-home.mjs [--cpu 4] [--size 375x812] [--mobile] [--loads 2] [--label name] [--url http://127.0.0.1:4173/] [--compile] [--taps] [--gpu]
//   Dev server must be on 127.0.0.1:3000. Starts its own headless Chrome (PERF_DEBUG_PORT, fresh temp profile, ANGLE D3D11)
//   and kills only that process on exit. Load 1 runs on the empty profile (cold shader cache), later loads reuse it (warm).
//   --cpu throttles the main thread through CDP; the GPU is not throttled, so this is a desktop GPU with a slow CPU, not a phone.
// Prints one JSON line per load and a summary line. Times are milliseconds from navigation (or from the key press, for the switch).
//   fallbackMs: the still picture is on screen; readyMs: #loading hidden (three.js draws the real plate);
//   longTasks / longTaskMs: count and sum of main-thread tasks over 50 ms up to readyMs;
//   switch: key -> renderedWard changes, the longest rAF gap and long tasks in the 3 s after the key, and whether the ward
//   it went to had been prefetched; idle: rAF interval p50/p95/max.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {PERF_DEBUG_PORT, DEV_HOME_URL, launchChrome, waitForChrome, isChromeAlive, connectCdp, sleep} from './lib/plate-env.mjs';

const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : fallback; };
const CPU_RATE = Number(arg('cpu', '1'));
const [WIDTH, HEIGHT] = arg('size', '1440x900').split('x').map(Number);
const MOBILE = process.argv.includes('--mobile');
const LOADS = Number(arg('loads', '2'));
const URL_ = arg('url', DEV_HOME_URL);
const LABEL = arg('label', `cpu${CPU_RATE}-${WIDTH}x${HEIGHT}${MOBILE ? '-mobile' : ''}`);
/** --gpu: ask Chrome for the discrete GPU (on this machine headless Chrome otherwise picks the integrated one, ~20x slower);
 * every row then records the WebGL renderer string so a number is tied to the GPU that produced it. */
const GPU_FLAGS = process.argv.includes('--gpu') ? ['--force_high_performance_gpu'] : [];
const READY_TIMEOUT_MS = 90_000;
/** Neighbours are built and compiled in the background after the first plate (ADR 0020); a switch before that measures the build. */
const PREFETCH_SETTLE_MS = 4_000;
const SWITCH_WINDOW_MS = 3_000;
const IDLE_WINDOW_MS = 3_000;
const POLL_MS = 50;
const COMPILE = process.argv.includes('--compile');
// --compile (dev only, after the last load): every program three.js linked, compiled again in a fresh WebGL2 context with a
// used uniform whose name is new each time, so the shader cache always misses (plans/2026-11-18-material-table.md §8.12).
// Reports ms to LINK_STATUS per program, longest first. A program is named by the first material hint in its source.
const COMPILE_BENCH = `(() => {
  const r = window.__kyotoRenderer, gl0 = r.getContext(), out = [];
  for (const [i, p] of r.info.programs.entries()) {
    const vs = gl0.getShaderSource(p.vertexShader), fs = gl0.getShaderSource(p.fragmentShader);
    const tag = 'uProbe' + Date.now().toString(36) + i, at = fs.lastIndexOf('}');
    const f = fs.replace('void main() {', 'uniform float ' + tag + ';\\nvoid main() {').slice(0, at + ('uniform float ' + tag + ';\\n').length)
      + 'pc_fragColor.a += ' + tag + '*0.;\\n}';
    const gl = document.createElement('canvas').getContext('webgl2'), t0 = performance.now();
    const mk = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const q = gl.createProgram(); gl.attachShader(q, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(q, mk(gl.FRAGMENT_SHADER, f)); gl.linkProgram(q);
    const ok = gl.getProgramParameter(q, gl.LINK_STATUS), ms = Math.round(performance.now() - t0);
    out.push({i, name: p.name || '', cacheKey: String(p.cacheKey).slice(0, 40), fsChars: fs.length, ms, ok});
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
  return out.sort((a, b) => b.ms - a.ms);
})()`;
const LONG_TASK_MS = 50;
// --taps: from navigation until the end of the switch window, press Shift (no handler anywhere) every TAP_EVERY_MS and read
// Event Timing: an interaction's duration is input delay + handlers + time to the next frame, so it shows how long a key
// waits behind the long tasks (INP-like; L3 step one, plans/2026-11-24-chain-3.md §9.2).
const TAPS = process.argv.includes('--taps');
const TAP_EVERY_MS = 250;
/** The smallest durationThreshold Event Timing accepts; shorter interactions are not reported and count as fast. */
const EVENT_THRESHOLD_MS = 16;
/** web.dev's "good" INP bound; the L3 gate the user accepted (p95 at or under this, 2026-11-25). */
const INP_GOOD_MS = 200;

// Installed before any page script: long tasks and rAF gaps, timed from navigation start.
const PROBE = `(() => {
  const w = window; w.__perf = {long: [], gaps: [], lastRaf: 0, fallbackAt: 0};
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) w.__perf.long.push([e.startTime, e.duration]); }).observe({type: 'longtask', buffered: true}); } catch {}
  w.__perf.events = [];
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) if (e.interactionId) w.__perf.events.push([e.startTime, e.duration, e.interactionId]); }).observe({type: 'event', buffered: true, durationThreshold: ${EVENT_THRESHOLD_MS}}); } catch {}
  const tick = t => { const p = w.__perf; if (p.lastRaf) p.gaps.push([t, t - p.lastRaf]); p.lastRaf = t; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
})();`;

// A Chrome left on the port would answer instead of ours, with a warm cache: the cold row would be wrong without a sign.
if (await isChromeAlive(PERF_DEBUG_PORT)) { console.error(`Port ${PERF_DEBUG_PORT} already has a Chrome; close it first.`); process.exit(2); }
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'kyoto-perf-'));
const chrome = launchChrome({port: PERF_DEBUG_PORT, profileDir: profile, width: WIDTH, height: HEIGHT, extraArgs: GPU_FLAGS});
const results = [];
try {
  await waitForChrome(PERF_DEBUG_PORT);
  for (let load = 1; load <= LOADS; load++) {
    const {target, ws, send, evalJs, logs} = await connectCdp(PERF_DEBUG_PORT);
    try {
      await send('Emulation.setDeviceMetricsOverride', {width: WIDTH, height: HEIGHT, deviceScaleFactor: MOBILE ? 2 : 1, mobile: MOBILE});
      if (MOBILE) await send('Emulation.setTouchEmulationEnabled', {enabled: true, maxTouchPoints: 5});
      if (CPU_RATE > 1) await send('Emulation.setCPUThrottlingRate', {rate: CPU_RATE});
      await send('Page.addScriptToEvaluateOnNewDocument', {source: PROBE});
      await send('Page.navigate', {url: URL_});
      let tapping = TAPS;
      const shift = {key: 'Shift', code: 'ShiftLeft', windowsVirtualKeyCode: 16, nativeVirtualKeyCode: 16};
      const tapLoop = (async () => {
        while (tapping) {
          await send('Input.dispatchKeyEvent', {type: 'rawKeyDown', ...shift}).catch(() => {});
          await send('Input.dispatchKeyEvent', {type: 'keyUp', ...shift}).catch(() => {});
          await sleep(TAP_EVERY_MS);
        }
      })();
      const row = {label: LABEL, load, cache: load === 1 ? 'cold' : 'warm'};
      try {
        let fallbackMs = 0, readyMs = 0;
        const deadline = Date.now() + READY_TIMEOUT_MS;
        while (Date.now() < deadline) {
          const s = await evalJs(`(() => { const c = document.querySelector('#scene'), l = document.querySelector('#loading');
            return {now: performance.now(), r: c?.dataset.renderer ?? '', bg: Boolean(c && getComputedStyle(c).backgroundImage !== 'none'), hidden: Boolean(l?.hidden), plate: c?.dataset.plate}; })()`);
          if (s && !fallbackMs && (s.bg || s.r === 'static')) fallbackMs = Math.round(s.now);
          if (s && s.hidden && s.r && s.plate === 'true') { readyMs = Math.round(s.now); break; }
          await sleep(POLL_MS);
        }
        const upToReady = await evalJs(`__perf.long.filter(([t]) => t <= ${readyMs || 1e9})`);
        row.fallbackMs = fallbackMs;
        row.readyMs = readyMs;
        row.longTasks = upToReady.length;
        row.longTaskMs = Math.round(upToReady.reduce((a, [, d]) => a + d, 0));
        row.longestTaskMs = Math.round(Math.max(0, ...upToReady.map(([, d]) => d)));
        row.gpu = await evalJs(`(() => { const g = document.createElement('canvas').getContext('webgl2'), x = g?.getExtension('WEBGL_debug_renderer_info');
          return x ? g.getParameter(x.UNMASKED_RENDERER_WEBGL) : ''; })()`);
        if (readyMs) {
          await sleep(PREFETCH_SETTLE_MS);
          // Idle frame time: nothing pressed, the idle light may be moving.
          const idleFrom = await evalJs('performance.now()');
          await sleep(IDLE_WINDOW_MS);
          const gaps = (await evalJs(`__perf.gaps.filter(([t]) => t > ${idleFrom}).map(([, d]) => d)`)).sort((a, b) => a - b);
          const q = p => Math.round(10 * (gaps[Math.min(gaps.length - 1, Math.floor(p * gaps.length))] ?? 0)) / 10;
          row.idle = {frames: gaps.length, p50: q(.5), p95: q(.95), max: q(1)};
          // One switch with the right arrow.
          const before = await evalJs(`document.querySelector('#scene').dataset.renderedWard`);
          await evalJs(`document.querySelector('#scene').focus({preventScroll: true})`);
          const keyAt = await evalJs('performance.now()');
          const key = {key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39, nativeVirtualKeyCode: 39};
          await send('Input.dispatchKeyEvent', {type: 'keyDown', ...key});
          await send('Input.dispatchKeyEvent', {type: 'keyUp', ...key});
          let changedMs = 0;
          while (await evalJs('performance.now()') - keyAt < SWITCH_WINDOW_MS) {
            const now = await evalJs(`[performance.now(), document.querySelector('#scene').dataset.renderedWard]`);
            if (!changedMs && now[1] !== before) changedMs = Math.round(now[0] - keyAt);
            await sleep(POLL_MS);
          }
          const sw = await evalJs(`({long: __perf.long.filter(([t]) => t >= ${keyAt}), gaps: __perf.gaps.filter(([t]) => t >= ${keyAt}).map(([, d]) => d)})`);
          // prefetched false: the neighbour was still unbuilt and the switch built it in one task, so its numbers measure the
          // build, not the switch (under --cpu 4 with --taps the idle-time prefetch may not finish in PREFETCH_SETTLE_MS).
          const shown = await evalJs(`(({renderedWard, prefetched}) => ({renderedWard, prefetched}))(document.querySelector('#scene').dataset)`);
          row.switch = {from: before, to: shown.renderedWard, prefetched: shown.prefetched === 'true', changedMs,
            maxGapMs: Math.round(Math.max(0, ...sw.gaps)), gapsOver50: sw.gaps.filter(d => d > LONG_TASK_MS).length,
            longTasks: sw.long.length, longestTaskMs: Math.round(Math.max(0, ...sw.long.map(([, d]) => d)))};
        }
      } finally {
        tapping = false;
        await tapLoop;
      }
      if (TAPS) {
        // One interaction is a keydown and a keyup with the same id; its duration is the longer of the two.
        const ev = await evalJs('__perf.events');
        const byId = new Map();
        for (const [, d, id] of ev) byId.set(id, Math.max(byId.get(id) ?? 0, d));
        const durs = [...byId.values()].sort((a, b) => a - b);
        const sent = Math.round((await evalJs('performance.now()')) / TAP_EVERY_MS);
        const q = p => Math.round(durs[Math.min(durs.length - 1, Math.floor(p * durs.length))] ?? 0);
        // Taps shorter than the threshold are not reported, so p95 over the reported ones is an upper bound.
        row.input = {sentApprox: sent, reported: durs.length, p95Reported: q(.95), max: q(1),
          over200: durs.filter(d => d > INP_GOOD_MS).length, gateMs: INP_GOOD_MS};
      }
      if (row.readyMs && COMPILE && load === LOADS) row.compile = await evalJs(COMPILE_BENCH);
      const problems = logs.filter(l => !/^\[vite\]/.test(l.text)).map(l => `${l.level}: ${l.text}`);
      row.consoleErrors = problems.length;
      if (problems.length) row.console = problems.slice(0, 3).map(l => l.slice(0, 200));
      results.push(row);
      console.log(JSON.stringify(row));
    } finally {
      await send('Target.closeTarget', {targetId: target.id}).catch(() => {});
      ws.close();
    }
  }
} finally {
  chrome.kill();
  await sleep(500);
  fs.rmSync(profile, {recursive: true, force: true, maxRetries: 5, retryDelay: 200});
}
process.exitCode = results.every(r => r.readyMs) ? 0 : 1;
