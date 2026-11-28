// Reshoots the README pictures of the home page and the OG image from the live app (three.js on the shared headless Chrome).
// Usage: node scripts/readme-shots.mjs [outDir]   (the dev server must be on 127.0.0.1:3000)
// Writes PNGs to outDir (default .shots/readme). Converting to WebP / JPEG and copying into docs/images and public/ is done by
// scripts/readme-shots.py so this script needs no image library. Only pictures that show the cabinet are here: the volume
// list, its map and the phone volume do not show the plate and are not reshot.
// Each shot: the ward, the theme and language, the viewport, where the hand light rests, and whether the lid is opened.
import {writeFileSync, mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {SHARED_DEBUG_PORT, DEV_HOME_URL, ensureSharedChrome, connectCdp, sleep, wardId} from './lib/plate-env.mjs';

/** The README layout (README.md) and the OG crop (readme-shots.py) depend on these names and sizes. */
export const README_SHOTS = [
  {name: 'home-night', ward: 'sakyo', night: true, lang: 'zh', size: [1440, 900, 1], light: [.36, .42]},
  {name: 'home-night-ja', ward: 'sakyo', night: true, lang: 'ja', size: [1440, 900, 1], light: [.36, .42]},
  {name: 'home-day', ward: 'kita', night: false, lang: 'zh', size: [1440, 900, 1], light: [.40, .45]},
  {name: 'lid', ward: 'sakyo', night: true, lang: 'zh', size: [1440, 900, 1], light: [.45, .70], open: true},
  {name: 'mobile-home', ward: 'sakyo', night: true, lang: 'zh', size: [390, 844, 2], light: [.40, .55]},
];
/** Time after Enter at which the lid is half lifted (the README picture shows the scrolls under the rising lid). */
const LID_CAPTURE_MS = 350;
const READY_POLLS = 150, POLL_MS = 200, SETTLE_MS = 1500;

const outDir = process.argv[2] ?? '.shots/readme';
mkdirSync(outDir, {recursive: true});
await ensureSharedChrome();
const {ws, send, evalJs, logs} = await connectCdp(SHARED_DEBUG_PORT);
const scene = `document.querySelector('#scene')`;

for (const shot of README_SHOTS) {
  const [w, h, dpr] = shot.size;
  await send('Emulation.setDeviceMetricsOverride', {width: w, height: h, deviceScaleFactor: dpr, mobile: w < 700});
  await send('Page.navigate', {url: DEV_HOME_URL});
  for (let i = 0; i < READY_POLLS && (await evalJs(`${scene}?.dataset.renderer`)) !== 'three'; i++) await sleep(POLL_MS);
  if (!shot.night) { await evalJs(`document.querySelector('.bunko-tools button:nth-child(1)').click()`); await sleep(300); }
  if (shot.lang !== 'zh') { await evalJs(`document.querySelector('.bunko-tools button:nth-child(3)').click()`); await sleep(300); }
  const want = wardId(shot.ward);
  await evalJs(`${scene}.focus({preventScroll:true})`);
  for (let i = 0; i < 12 && (await evalJs(`${scene}.dataset.ward`)) !== want; i++) {
    await send('Input.dispatchKeyEvent', {type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39});
    await send('Input.dispatchKeyEvent', {type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39});
    for (let k = 0; k < 40 && (await evalJs(`${scene}.dataset.bookState`)) !== 'closed'; k++) await sleep(150);
    await sleep(400);
  }
  const ward = await evalJs(`${scene}.dataset.ward`);
  await evalJs(`window.scrollTo(0,0)`);
  const r = await evalJs(`(()=>{const c=${scene}.getBoundingClientRect();return [c.x,c.y,c.width,c.height];})()`);
  const [lx, ly] = shot.light;
  await send('Input.dispatchMouseEvent', {type: 'mouseMoved', x: r[0] + r[2] * lx - 30, y: r[1] + r[3] * ly - 20});
  await sleep(120);
  await send('Input.dispatchMouseEvent', {type: 'mouseMoved', x: r[0] + r[2] * lx, y: r[1] + r[3] * ly});
  await sleep(SETTLE_MS);
  if (shot.open) {
    await evalJs(`${scene}.focus({preventScroll:true})`);
    await send('Input.dispatchKeyEvent', {type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13});
    await send('Input.dispatchKeyEvent', {type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13});
    await sleep(LID_CAPTURE_MS);
  }
  const png = await send('Page.captureScreenshot', {format: 'png'});
  writeFileSync(join(outDir, `${shot.name}.png`), Buffer.from(png.result.data, 'base64'));
  console.log(JSON.stringify({name: shot.name, ward, wanted: want, ok: ward === want, renderer: await evalJs(`${scene}.dataset.renderer`), opening: await evalJs(`${scene}.dataset.opening`)}));
}
for (const l of logs) console.log('CONSOLE', l.level, l.text);
ws.close();
process.exit(0);
