// Reshoots the README pictures of the home page and the OG image from the live app (three.js on the shared headless Chrome).
// Usage: node scripts/readme-shots.mjs [outDir]   (the dev server must be on 127.0.0.1:3000)
// Writes PNGs and shots.json (the list scripts/readme-shots.py converts) to outDir (default .shots/readme). Converting to
// WebP / JPEG and copying into docs/images and public/ is done by readme-shots.py so this script needs no image library.
// Only pictures that show the cabinet are here: the volume list, its map and the phone volume do not show the plate.
// A shot whose ward, theme, language or renderer is not what it asked for is not written, and the script exits 1.
import {writeFileSync, mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {SHARED_DEBUG_PORT, DEV_HOME_URL, ensureSharedChrome, connectCdp, sleep, wardId} from './lib/plate-env.mjs';

/** The README layout (README*.md link docs/images/<name>.webp) and the OG crop (readme-shots.py) depend on these. */
export const README_SHOTS = [
  {name: 'home-night', ward: 'sakyo', night: true, lang: 'zh', size: [1440, 900, 1], light: [.36, .42]},
  {name: 'home-night-ja', ward: 'sakyo', night: true, lang: 'ja', size: [1440, 900, 1], light: [.36, .42]},
  {name: 'home-day', ward: 'kita', night: false, lang: 'zh', size: [1440, 900, 1], light: [.40, .45]},
  {name: 'lid', ward: 'sakyo', night: true, lang: 'zh', size: [1440, 900, 1], light: [.45, .70], open: true},
  {name: 'mobile-home', ward: 'sakyo', night: true, lang: 'zh', size: [390, 844, 2], light: [.40, .55]},
];
/** The page opens in the night theme and Chinese (App.tsx, useKyotoEngine.ts) and keeps neither between visits. */
const DEFAULT_NIGHT = true, DEFAULT_LANG = 'zh';
/** BunkoTools.tsx: the theme button first, the language button third. */
const THEME_BUTTON = `.bunko-tools button:nth-child(1)`, LANG_BUTTON = `.bunko-tools button:nth-child(3)`;
/** Below this width the page is emulated as a phone. */
const MOBILE_BELOW_PX = 700;
/** The lid picture shows the scrolls under the rising lid with the lid still in frame: #scene data-opening (0..1), read
 * right after the capture, must lie in LID_OPENING_RANGE. The capture is started at LID_TRIGGER_OPENING because the lid
 * keeps rising while the picture is taken; a shot outside the range is taken again, up to MAX_ATTEMPTS times. */
const LID_TRIGGER_OPENING = .3, LID_OPENING_RANGE = [.7, .85], LID_POLL_MS = 16, LID_POLLS = 300, MAX_ATTEMPTS = 3;
/** One step past every ward of the cabinet ring is enough to reach any of them. */
const MAX_WARD_STEPS = 12;
/** The hand light arrives from a little up and left of where it rests, as a pointer would. */
const LIGHT_APPROACH_PX = [-30, -20];
const READY_POLLS = 150, POLL_MS = 200, SWITCH_POLLS = 40, SWITCH_POLL_MS = 150;
const TOGGLE_MS = 300, AFTER_SWITCH_MS = 400, APPROACH_MS = 120, SETTLE_MS = 1500;

const outDir = process.argv[2] ?? '.shots/readme';
mkdirSync(outDir, {recursive: true});
await ensureSharedChrome();
const {target, ws, send, evalJs, logs} = await connectCdp(SHARED_DEBUG_PORT);
const scene = `document.querySelector('#scene')`;
const key = async (k, code, vk) => {
  await send('Input.dispatchKeyEvent', {type: 'keyDown', key: k, code, windowsVirtualKeyCode: vk});
  await send('Input.dispatchKeyEvent', {type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk});
};
let failed = 0;
const written = [];

async function attempt(shot) {
  const [w, h, dpr] = shot.size;
  await send('Emulation.setDeviceMetricsOverride', {width: w, height: h, deviceScaleFactor: dpr, mobile: w < MOBILE_BELOW_PX});
  await send('Page.navigate', {url: DEV_HOME_URL});
  for (let i = 0; i < READY_POLLS && (await evalJs(`${scene}?.dataset.renderer`)) !== 'three'; i++) await sleep(POLL_MS);
  if (shot.night !== DEFAULT_NIGHT) { await evalJs(`document.querySelector('${THEME_BUTTON}').click()`); await sleep(TOGGLE_MS); }
  if (shot.lang !== DEFAULT_LANG) { await evalJs(`document.querySelector('${LANG_BUTTON}').click()`); await sleep(TOGGLE_MS); }
  const want = wardId(shot.ward);
  await evalJs(`${scene}.focus({preventScroll:true})`);
  for (let i = 0; i < MAX_WARD_STEPS; i++) {
    const before = await evalJs(`${scene}.dataset.ward`);
    if (before === want) break;
    await key('ArrowRight', 'ArrowRight', 39);
    // One press is one ward: wait until the ward has changed and the switch has finished before the next press.
    for (let k = 0; k < SWITCH_POLLS; k++) {
      await sleep(SWITCH_POLL_MS);
      if ((await evalJs(`${scene}.dataset.ward`)) !== before && (await evalJs(`${scene}.dataset.bookState`)) === 'closed') break;
    }
    await sleep(AFTER_SWITCH_MS);
  }
  await evalJs(`window.scrollTo(0,0)`);
  const r = await evalJs(`(()=>{const c=${scene}.getBoundingClientRect();return [c.x,c.y,c.width,c.height];})()`);
  const x = r[0] + r[2] * shot.light[0], y = r[1] + r[3] * shot.light[1];
  await send('Input.dispatchMouseEvent', {type: 'mouseMoved', x: x + LIGHT_APPROACH_PX[0], y: y + LIGHT_APPROACH_PX[1]});
  await sleep(APPROACH_MS);
  await send('Input.dispatchMouseEvent', {type: 'mouseMoved', x, y});
  await sleep(SETTLE_MS);
  if (shot.open) {
    await evalJs(`${scene}.focus({preventScroll:true})`);
    await key('Enter', 'Enter', 13);
    for (let i = 0; i < LID_POLLS && Number(await evalJs(`${scene}.dataset.opening`)) < LID_TRIGGER_OPENING; i++) await sleep(LID_POLL_MS);
  }
  const png = await send('Page.captureScreenshot', {format: 'png'});
  const state = await evalJs(`({ward:${scene}.dataset.ward, renderer:${scene}.dataset.renderer, opening:${scene}.dataset.opening,
    theme:document.documentElement.dataset.theme, lang:document.querySelector('.kyoto-app')?.getAttribute('lang')})`);
  const problems = [
    state.ward !== want && `ward ${state.ward}`,
    state.renderer !== 'three' && `renderer ${state.renderer}`,
    state.theme !== (shot.night ? 'dark' : 'light') && `theme ${state.theme}`,
    !String(state.lang).startsWith(shot.lang) && `lang ${state.lang}`,
    (shot.open ? !(Number(state.opening) >= LID_OPENING_RANGE[0] && Number(state.opening) <= LID_OPENING_RANGE[1]) : Number(state.opening) > 0) &&
      `opening ${state.opening}`,
  ].filter(Boolean);
  return {png, state, problems};
}

for (const shot of README_SHOTS) {
  let result;
  for (let n = 1; n <= MAX_ATTEMPTS; n++) {
    result = await attempt(shot);
    console.log(JSON.stringify({name: shot.name, attempt: n, ok: !result.problems.length, problems: result.problems, state: result.state}));
    if (!result.problems.length) break;
  }
  if (result.problems.length) { failed++; continue; }
  writeFileSync(join(outDir, `${shot.name}.png`), Buffer.from(result.png.result.data, 'base64'));
  written.push(shot.name);
}
writeFileSync(join(outDir, 'shots.json'), JSON.stringify({names: written, complete: !failed}, null, 2));
for (const l of logs) console.log('CONSOLE', l.level, l.text);
await fetch(`http://127.0.0.1:${SHARED_DEBUG_PORT}/json/close/${target.id}`).catch(() => {});
ws.close();
process.exit(failed ? 1 : 0);
