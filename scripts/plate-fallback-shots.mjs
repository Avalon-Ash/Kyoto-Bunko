// Renders the still pictures the cabinet shows when three.js cannot run (src/studies/toji/plate/static-plate.js).
// Each picture is the real three.js plate at rest (light centred, lid closed), transparent background, drawn at the
// reference frame the fallback maps onto the canvas: view box 950 x 680 camera-plane units (view.js baseHalf at aspect 950/680).
// Usage: node scripts/plate-fallback-shots.mjs [outDir] [themes] [wards]
//   outDir  default src/studies/toji/plate/static          themes  comma list of day,night (default day,night)
//   wards   comma list of ward ids (default all eleven)    Needs the dev server on 127.0.0.1:3000 (npm run dev) and Chrome.
// Files: <WARD>.<theme>.webp. Quality steps down until a file is within BUDGET bytes.
import {spawnSync} from 'node:child_process';
import {writeFileSync, mkdirSync, mkdtempSync, rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {FALLBACK_DEBUG_PORT, launchChrome, waitForChrome, connectCdp, studyUrl, sleep} from './lib/plate-env.mjs';

const BUDGET = 150 * 1024, SCALE = 1;
const [outArg, themeArg, wardArg] = process.argv.slice(2);
const outDir = outArg ?? fileURLToPath(new URL('../src/studies/toji/plate/static', import.meta.url));
const themes = (themeArg ?? 'day,night').split(',');
mkdirSync(outDir, {recursive: true});
const W = Math.round(950 * SCALE), H = Math.round(680 * SCALE);
const profile = mkdtempSync(join(tmpdir(), 'plate-fallback-'));
const chrome = launchChrome({port: FALLBACK_DEBUG_PORT, profileDir: profile, width: W, height: H});
const done = () => { try { spawnSync('taskkill', ['/F', '/T', '/PID', String(chrome.pid)], {stdio: 'ignore'}); } catch {} try { rmSync(profile, {recursive: true, force: true}); } catch {} };
process.on('exit', done);
await waitForChrome(FALLBACK_DEBUG_PORT);
const {target, ws, send, evalJs} = await connectCdp(FALLBACK_DEBUG_PORT);
await send('Emulation.setDeviceMetricsOverride', {width: W, height: H, deviceScaleFactor: 1, mobile: false});
await send('Emulation.setDefaultBackgroundColorOverride', {color: {r: 0, g: 0, b: 0, a: 0}});

await send('Page.navigate', {url: studyUrl()});
for (let i = 0; i < 60 && !(await evalJs(`Boolean(document.querySelector('#scene')?.dataset.lift)`)); i++) await sleep(200);
const allWards = await evalJs(`window.__kyotoCabinetIds`), startWard = await evalJs(`document.querySelector('#scene')?.dataset.ward`);
if (!Array.isArray(allWards) || !allWards.length || !allWards.includes(startWard)) throw new Error(`missing cabinet order: ${JSON.stringify({allWards, startWard})}`);
const wards = wardArg ? wardArg.split(',') : allWards;

for (const theme of themes) for (const ward of wards) {
  await send('Page.navigate', {url: studyUrl()});
  for (let i = 0; i < 60 && !(await evalJs(`Boolean(document.querySelector('#scene')?.dataset.lift)`)); i++) await sleep(200);
  await evalJs(`document.querySelector('#motion').click()`); await sleep(200);          // paused: light centred, no trails
  if (theme === 'day') { await evalJs(`document.querySelector('#night').click()`); await sleep(300); }
  const idx = allWards.indexOf(ward);
  if (idx < 0) throw new Error(`unknown ward: ${ward}`);
  const steps = idx - allWards.indexOf(startWard);
  for (let i = 0; i < Math.abs(steps); i++) {
    await evalJs(`document.querySelector('#${steps < 0 ? 'previous' : 'next'}-cabinet').click()`);
    for (let k = 0; k < 40; k++) { await sleep(150); if (!(await evalJs(`document.querySelector('#next-cabinet').disabled`))) break; }
  }
  // Only the canvas stays visible, filling the viewport, on a transparent page.
  await evalJs(`(()=>{const s=document.createElement('style');s.textContent='html,body{background:transparent!important}*{visibility:hidden!important}#scene{visibility:visible!important;position:fixed!important;left:0!important;top:0!important;width:${W}px!important;height:${H}px!important;transform:none!important;scale:none!important;filter:none!important;opacity:1!important}';document.head.append(s);})()`);
  await sleep(2000);
  // The live plate, not the still picture shown while its shaders compile (a cold cache after a ground-shader change): wait for its first frame.
  for (let i = 0; i < 150 && (await evalJs(`document.querySelector('#scene').dataset.renderer`)) !== 'three'; i++) await sleep(200);
  const info = JSON.parse(await evalJs(`JSON.stringify({ward:document.querySelector('#scene').dataset.renderedWard,w:document.querySelector('#scene').width,h:document.querySelector('#scene').height,plate:document.querySelector('#scene').dataset.plate,renderer:document.querySelector('#scene').dataset.renderer})`));
  if (info.ward !== ward || info.plate !== 'true' || info.renderer !== 'three') throw Error(`not ready: ${JSON.stringify(info)}`);
  let quality = 84, bytes; // 92 until the ground became a field of chips (docs/plans/2026-11-16-ground-tone.md): that detail does not compress, and the set must stay within 2.5 MB
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
