// Renders the still pictures the cabinet shows when three.js cannot run (src/studies/toji/plate/static-plate.js).
// Each picture is the real three.js plate at rest (light centred, lid closed), transparent background, drawn at the
// reference frame the fallback maps onto the canvas: view box 950 x 680 camera-plane units (view.js baseHalf at aspect 950/680).
// Usage: node scripts/plate-fallback-shots.mjs [outDir] [themes] [wards]
//   outDir  default src/studies/toji/plate/static          themes  comma list of day,night (default day,night)
//   wards   comma list of ward ids (default all eleven)    Needs the dev server on 127.0.0.1:3000 (npm run dev) and Chrome.
// Files: <WARD>.<theme>.webp. Quality steps down until a file is within BUDGET bytes.
import {spawn, spawnSync} from 'node:child_process';
import {writeFileSync, mkdirSync, mkdtempSync, rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';

const PORT = 9378, CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', BUDGET = 150 * 1024, SCALE = 1;
const WARDS = ['W_KITA', 'W_KAMIGYO', 'W_SAKYO', 'W_NAKAGYO', 'W_HIGASHIYAMA', 'W_SHIMOGYO', 'W_MINAMI', 'W_UKYO', 'W_NISHIKYO', 'W_YAMASHINA', 'W_FUSHIMI'];
const START = 'W_MINAMI';
const [outArg, themeArg, wardArg] = process.argv.slice(2);
const outDir = outArg ?? fileURLToPath(new URL('../src/studies/toji/plate/static', import.meta.url));
const themes = (themeArg ?? 'day,night').split(','), wards = wardArg ? wardArg.split(',') : WARDS;
mkdirSync(outDir, {recursive: true});
const W = Math.round(950 * SCALE), H = Math.round(680 * SCALE);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const alive = async () => { try { return (await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok; } catch { return false; } };
const profile = mkdtempSync(join(tmpdir(), 'plate-fallback-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--hide-scrollbars', `--window-size=${W},${H}`, 'about:blank'], {stdio: 'ignore'});
const done = () => { try { spawnSync('taskkill', ['/F', '/T', '/PID', String(chrome.pid)], {stdio: 'ignore'}); } catch {} try { rmSync(profile, {recursive: true, force: true}); } catch {} };
process.on('exit', done);
for (let i = 0; i < 40 && !await alive(); i++) await sleep(250);
const target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, {method: 'PUT'})).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r));
let seq = 0; const pending = new Map();
ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise(r => { const id = ++seq; pending.set(id, r); ws.send(JSON.stringify({id, method, params})); });
const evalJs = async expression => (await send('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true})).result?.result?.value;
await send('Runtime.enable'); await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', {width: W, height: H, deviceScaleFactor: 1, mobile: false});
await send('Emulation.setDefaultBackgroundColorOverride', {color: {r: 0, g: 0, b: 0, a: 0}});

for (const theme of themes) for (const ward of wards) {
  await send('Page.navigate', {url: 'http://127.0.0.1:3000/toji-study/index.html'});
  for (let i = 0; i < 60 && !(await evalJs(`Boolean(document.querySelector('#scene')?.dataset.lift)`)); i++) await sleep(200);
  await evalJs(`document.querySelector('#motion').click()`); await sleep(200);          // paused: light centred, no trails
  if (theme === 'day') { await evalJs(`document.querySelector('#night').click()`); await sleep(300); }
  const steps = WARDS.indexOf(ward) - WARDS.indexOf(START);
  for (let i = 0; i < Math.abs(steps); i++) {
    await evalJs(`document.querySelector('#${steps < 0 ? 'previous' : 'next'}-cabinet').click()`);
    for (let k = 0; k < 40; k++) { await sleep(150); if (!(await evalJs(`document.querySelector('#next-cabinet').disabled`))) break; }
  }
  // Only the canvas stays visible, filling the viewport, on a transparent page.
  await evalJs(`(()=>{const s=document.createElement('style');s.textContent='html,body{background:transparent!important}*{visibility:hidden!important}#scene{visibility:visible!important;position:fixed!important;left:0!important;top:0!important;width:${W}px!important;height:${H}px!important;transform:none!important;scale:none!important;filter:none!important;opacity:1!important}';document.head.append(s);})()`);
  await sleep(2000);
  const info = JSON.parse(await evalJs(`JSON.stringify({ward:document.querySelector('#scene').dataset.renderedWard,w:document.querySelector('#scene').width,h:document.querySelector('#scene').height,plate:document.querySelector('#scene').dataset.plate,renderer:document.querySelector('#scene').dataset.renderer})`));
  if (info.ward !== ward || info.plate !== 'true' || info.renderer !== 'three') throw Error(`not ready: ${JSON.stringify(info)}`);
  let quality = 92, bytes;
  for (; quality >= 40; quality -= 4) {
    const shot = await send('Page.captureScreenshot', {format: 'webp', quality, fromSurface: true, clip: {x: 0, y: 0, width: W, height: H, scale: 1}});
    bytes = Buffer.from(shot.result.data, 'base64');
    if (bytes.length <= BUDGET) break;
  }
  const alpha = bytes.subarray(12, 16).toString() === 'VP8X' && (bytes[20] & 0x10) !== 0;
  writeFileSync(join(outDir, `${ward}.${theme}.webp`), bytes);
  console.log(`${ward}.${theme}.webp ${bytes.length} bytes q${quality} ${info.w}x${info.h} alpha=${alpha}`);
}
await send('Target.closeTarget', {targetId: target.id}).catch(() => {});
ws.close(); done();
