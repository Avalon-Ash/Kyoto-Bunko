// Screenshots of the makie plate through headless Chrome over the DevTools protocol; no Playwright needed.
// Usage: node scripts/plate-shot.mjs <outDir> <job> [job…]   (the dev server must be on 127.0.0.1:3000)
// job = name:steps:theme:WxH:zoom:fx,fy   steps: signed cabinet steps from the starting ward, or a ward name (kita, KITA, W_KITA); theme: night|day, plus "-still"
// to press pause first; zoom 1..3; fx,fy: where the light rests, as fractions of the canvas. See docs/MAKIE_PLATE_HANDOFF.md §7.
// PLATE_SHOT_QUERY=?plate=static node scripts/plate-shot.mjs …  shoots the still-picture fallback instead of three.js.
// PLATE_TONE=1 also prints each shot's tone over the lid's own pixels (three.js only): luminance percentiles, median
// saturation, and the share of bright and dark pixels, all in percent. docs/plans/2026-11-16-patina.md §5 uses them.
// Each layer also reports its mean hue (degrees, weighted by chroma) and mean HSV saturation (percent).
// The same line carries three layers (docs/plans/2026-11-16-ground-tone.md): ground (plain ground), dense (faces of dense nashiji: hills,
// water, banks, suhama, toyama, mist) and pattern (the rest: inlays, parts), each with its share of the lid, L25/L50/L75, and the share of
// the lid it covers with luminance above 75 (bright). Dev mask view 5 paints plain ground magenta, dense faces cyan, the rest green.
import {writeFileSync, mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {MASK_GROUPS} from './plate-room-stats.mjs';
import {SHARED_DEBUG_PORT, ensureSharedChrome, connectCdp, studyUrl, sleep, cabinetOrder, stepsTo, wardAfter} from './lib/plate-env.mjs';

const [outDir, ...jobs] = process.argv.slice(2);
mkdirSync(outDir, {recursive: true});
await ensureSharedChrome();
const {target, ws, send, evalJs, logs} = await connectCdp(SHARED_DEBUG_PORT);

const query = new URLSearchParams((process.env.PLATE_SHOT_QUERY ?? '').replace(/^\?/, ''));
if (process.env.PLATE_CLOCK) query.set('clock', process.env.PLATE_CLOCK);
const shoot = async job => {
  const [name, stepSpec, theme, size, zoom, at] = job.split(':'), [w, h] = size.split('x').map(Number), [fx, fy] = at.split(',').map(Number);
  await send('Emulation.setDeviceMetricsOverride', {width: w, height: h, deviceScaleFactor: w < 700 ? 2 : 1, mobile: false});
  await send('Page.navigate', {url: studyUrl(query)});
  for (let i = 0; i < 60 && !(await evalJs(`Boolean(document.querySelector('#scene')?.dataset.lift)`)); i++) await sleep(200);
  // The live plate, not the still picture shown while its shaders compile (src/studies/toji/renderer.js): data-renderer turns 'three' at its first frame.
  for (let i = 0; i < 150 && (await evalJs(`document.querySelector('#scene')?.dataset.renderer`)) !== 'three'; i++) await sleep(200);
  const {order, startWard} = await cabinetOrder(evalJs);
  const stepCount = /^[+-]?\d+$/.test(stepSpec) ? Number(stepSpec) : stepsTo(order, startWard, stepSpec);
  const want = wardAfter(order, startWard, stepCount);
  if (theme.endsWith('still')) { await evalJs(`document.querySelector('#motion').click()`); await sleep(200); }
  if (theme.startsWith('day')) { await evalJs(`document.querySelector('#night').click()`); await sleep(300); }
  for (let i = 0; i < Math.abs(stepCount); i++) {
    await evalJs(`document.querySelector('#${stepCount < 0 ? 'previous' : 'next'}-cabinet').click()`);
    for (let k = 0; k < 40; k++) { await sleep(150); if (!(await evalJs(`document.querySelector('#next-cabinet').disabled`))) break; }
  }
  await evalJs(`document.querySelector('#scene').scrollIntoView({block:'center'})`);
  await sleep(300);
  const r = await evalJs(`(()=>{const c=document.querySelector('#scene').getBoundingClientRect();return [c.x,c.y,c.width,c.height,scrollX,scrollY];})()`);
  let x = r[0] + r[2] * fx, y = r[1] + r[3] * fy;
  await send('Input.dispatchMouseEvent', {type: 'mouseMoved', x: x - 30, y: y - 20});
  await sleep(120);
  await send('Input.dispatchMouseEvent', {type: 'mouseMoved', x, y});
  if (Number(zoom) > 1) { await send('Input.dispatchMouseEvent', {type: 'mouseWheel', x, y, deltaX: 0, deltaY: -Math.log(Number(zoom)) / .01, modifiers: 2}); await sleep(900); }
  // PLATE_CENTER=1 drags the view so the point the zoom was anchored on (fx,fy) comes to the middle of the canvas: a group is then centred.
  if (process.env.PLATE_CENTER && Number(zoom) > 1) {
    const cx = r[0] + r[2] / 2, cy = r[1] + r[3] / 2;
    await send('Input.dispatchMouseEvent', {type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1});
    for (let s = 1; s <= 10; s++) await send('Input.dispatchMouseEvent', {type: 'mouseMoved', x: x + (cx - x) * s / 10, y: y + (cy - y) * s / 10, buttons: 1});
    await send('Input.dispatchMouseEvent', {type: 'mouseReleased', x: cx, y: cy, button: 'left', buttons: 0, clickCount: 1});
    await sleep(900); x = cx; y = cy;
  }
  // PLATE_LIGHT=fx,fy rests the light elsewhere after the zoom, so a close view of a roof is not under the light's own pool.
  if (process.env.PLATE_LIGHT) { const [lx, ly] = process.env.PLATE_LIGHT.split(',').map(Number); x = r[0] + r[2] * lx; y = r[1] + r[3] * ly; await send('Input.dispatchMouseEvent', {type: 'mouseMoved', x, y}); await sleep(300); }
  // PLATE_CLOCK: the picture is the lid alone (the cloud bands behind it are other canvases, and they drift).
  if (process.env.PLATE_CLOCK) await evalJs(`(()=>{const s=document.createElement('style');s.textContent='html,body{background:#000!important}body *,body *::before,body *::after{visibility:hidden!important}#scene{visibility:visible!important}';document.head.append(s);})()`);
  // PLATE_VIEW=n paints a dev view instead of the picture: 2 plain-ground mask, 4 kirikane, 5 tone layers, 6 coat (three-pack.js).
  if (process.env.PLATE_VIEW) await evalJs(`window.__kyotoPlateUniforms.uDensView.value = ${Number(process.env.PLATE_VIEW)}`);
  await sleep(2800);
  await send('Input.dispatchMouseEvent', {type: 'mouseMoved', x: x + 1, y});
  await sleep(400);
  const info = await evalJs(`JSON.stringify(Object.assign({}, document.querySelector('#scene').dataset))`);
  // The picture must be of the ward and theme the job asked for: a swallowed click leaves the previous ward or theme on screen.
  const isNight = await evalJs(`Boolean(document.querySelector('#scene').closest('.night'))`);
  if (JSON.parse(info).renderedWard !== want || isNight !== theme.startsWith('night')) {
    console.log(name, 'WRONG', JSON.parse(info).renderedWard, isNight ? 'night' : 'day', '(wanted', want, theme + ')');
    return false;
  }
  const shot = await send('Page.captureScreenshot', {format: 'png', clip: {x: Math.max(0, r[0] + r[4]), y: Math.max(0, r[1] + r[5]), width: r[2], height: r[3], scale: 1}});
  writeFileSync(join(outDir, `${name}.png`), Buffer.from(shot.result.data, 'base64'));
  console.log(name, info);
  // PLATE_CPU=4 slows the page's CPU fourfold before PLATE_EVAL runs (for frame-time readings).
  if (process.env.PLATE_CPU) await send('Emulation.setCPUThrottlingRate', {rate: Number(process.env.PLATE_CPU)});
  if (process.env.PLATE_EVAL) console.log(name, 'eval', await evalJs(process.env.PLATE_EVAL));
  // PLATE_EVAL_SHOT=1 takes a second picture of the whole viewport after PLATE_EVAL (the opened box, a dialog): <name>-after.png.
  if (process.env.PLATE_EVAL && process.env.PLATE_EVAL_SHOT) {
    const after = await send('Page.captureScreenshot', {format: 'png'});
    writeFileSync(join(outDir, `${name}-after.png`), Buffer.from(after.result.data, 'base64'));
  }
  // PLATE_MASK=gold,silver,parts,room also writes <name>-mask-<group>.png: the group's materials painted magenta by the dev hook
  // window.__kyotoPlateMask (three-renderer.js); the groups are scripts/plate-room-stats.mjs MASK_GROUPS, which reads the pictures.
  if (process.env.PLATE_MASK) {
    const clip = {x: Math.max(0, r[0] + r[4]), y: Math.max(0, r[1] + r[5]), width: r[2], height: r[3], scale: 1};
    for (const group of process.env.PLATE_MASK.split(',')) {
      if (!MASK_GROUPS[group]) throw new Error('PLATE_MASK: no group ' + group);
      const painted = await evalJs('window.__kyotoPlateMask(' + JSON.stringify(MASK_GROUPS[group]) + ')');
      await send('Input.dispatchMouseEvent', {type: 'mouseMoved', x, y}); await sleep(500);
      const mask = await send('Page.captureScreenshot', {format: 'png', clip});
      writeFileSync(join(outDir, name + '-mask-' + group + '.png'), Buffer.from(mask.result.data, 'base64'));
      console.log(name, 'mask', group, painted);
    }
    await evalJs('window.__kyotoPlateMask(null)');
    await send('Input.dispatchMouseEvent', {type: 'mouseMoved', x: x + 1, y}); await sleep(300);
  }
  if (process.env.PLATE_KIRI) {
    // Dev view 4 (?dens=kiri): kirikane pixels red, the rest of the bank ground (materials 2-4) blue, all else black. Prints red / (red + blue).
    const clip = {x: Math.max(0, r[0] + r[4]), y: Math.max(0, r[1] + r[5]), width: r[2], height: r[3], scale: 1};
    await evalJs(`window.__kyotoPlateUniforms.uDensView.value = 4`);
    await send('Input.dispatchMouseEvent', {type: 'mouseMoved', x, y}); await sleep(500);
    const km = await send('Page.captureScreenshot', {format: 'png', clip});
    await evalJs(`window.__kyotoPlateUniforms.uDensView.value = 0`);
    writeFileSync(join(outDir, `${name}-kiri.png`), Buffer.from(km.result.data, 'base64'));
    const kiri = await evalJs(`(async () => {
      const i = new Image(); i.src = 'data:image/png;base64,' + ${JSON.stringify(km.result.data)}; await i.decode();
      const c = new OffscreenCanvas(i.width, i.height), g = c.getContext('2d'); g.drawImage(i, 0, 0); const d = g.getImageData(0, 0, i.width, i.height).data;
      let red = 0, blue = 0;
      for (let k = 0; k < d.length; k += 4) { if (d[k + 1] < 40 && d[k] + d[k + 2] > 120) { red += d[k] / 255; blue += d[k + 2] / 255; } }
      return JSON.stringify({kiri: Math.round(red), bank: Math.round(red + blue), share: Math.round(red / Math.max(red + blue, 1) * 1000) / 10});
    })()`);
    console.log(name, 'kiri', kiri);
  }
  if (process.env.PLATE_TONE) {
    // The lid's pixels: paint plain ground magenta and the rest of the lid green (the dev mask), then take each row from
    // its first to its last masked pixel, so the parts standing on the lid count too.
    const clip = {x: Math.max(0, r[0] + r[4]), y: Math.max(0, r[1] + r[5]), width: r[2], height: r[3], scale: 1};
    await evalJs(`window.__kyotoPlateUniforms.uDensView.value = 5`);
    await send('Input.dispatchMouseEvent', {type: 'mouseMoved', x, y}); await sleep(500);
    const mask = await send('Page.captureScreenshot', {format: 'png', clip});
    await evalJs(`window.__kyotoPlateUniforms.uDensView.value = 0`);
    const tone = await evalJs(`(async () => {
      const load = async b64 => { const i = new Image(); i.src = 'data:image/png;base64,' + b64; await i.decode();
        const c = new OffscreenCanvas(i.width, i.height), g = c.getContext('2d'); g.drawImage(i, 0, 0); return g.getImageData(0, 0, i.width, i.height); };
      const a = await load(${JSON.stringify(shot.result.data)}), m = await load(${JSON.stringify(mask.result.data)});
      const L = [], S = [], cls = [[], [], []], hue = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]; // hue[k] = chroma-weighted hue vector (cos, sin), saturation sum, count // cls: 0 plain ground (mat 1), 1 dense-nashiji faces (hill, water, bank, suhama, toyama, mist), 2 everything else on the lid (inlays, parts)
      for (let y = 0; y < a.height; y++) {
        let x0 = -1, x1 = -1;
        for (let x = 0; x < a.width; x++) {
          const k = (y * a.width + x) * 4, R = m.data[k], G = m.data[k + 1], B = m.data[k + 2];
          if ((R > 150 && B > 150 && G < 90) || (G > 150 && R < 90 && B < 90) || (G > 150 && B > 150 && R < 90)) { if (x0 < 0) x0 = x; x1 = x; }
        }
        for (let x = x0; x0 >= 0 && x <= x1; x++) {
          const k = (y * a.width + x) * 4, R = a.data[k] / 255, G = a.data[k + 1] / 255, B = a.data[k + 2] / 255, mx = Math.max(R, G, B);
          const lum = .2126 * R + .7152 * G + .0722 * B;
          L.push(lum); S.push(mx > 0 ? (mx - Math.min(R, G, B)) / mx : 0);
          const mR = m.data[k], mG = m.data[k + 1], mB = m.data[k + 2];
          const ci = (mR > 150 && mB > 150 && mG < 90) ? 0 : (mG > 150 && mB > 150 && mR < 90) ? 1 : 2; cls[ci].push(lum);
          const ch = mx - Math.min(R, G, B), hh = ch > 0 ? ((mx === R ? ((G - B) / ch + 6) % 6 : mx === G ? (B - R) / ch + 2 : (R - G) / ch + 4) * Math.PI / 3) : 0;
          hue[ci][0] += ch * Math.cos(hh); hue[ci][1] += ch * Math.sin(hh); hue[ci][2] += mx > 0 ? ch / mx : 0; hue[ci][3]++;
        }
      }
      if (!L.length) return 'no lid pixels';
      const pct = (v, p) => Math.round([...v].sort((p, q) => p - q)[Math.floor((v.length - 1) * p)] * 100);
      const share = f => Math.round(L.filter(f).length / L.length * 1000) / 10;
      const hs = k => ({hue: Math.round((Math.atan2(hue[k][1], hue[k][0]) * 180 / Math.PI + 360) % 360 * 10) / 10, sat: Math.round(hue[k][2] / Math.max(hue[k][3], 1) * 1000) / 10});
      const layer = (v, k) => v.length ? {...hs(k), share: Math.round(v.length / L.length * 1000) / 10, L25: pct(v, .25), L50: pct(v, .5), L75: pct(v, .75), bright: Math.round(v.filter(x => x > .75).length / L.length * 1000) / 10} : null;
      return JSON.stringify({pixels: L.length, L5: pct(L, .05), L25: pct(L, .25), L50: pct(L, .5), L75: pct(L, .75), L95: pct(L, .95),
        S50: pct(S, .5), bright: share(v => v > .75), dark: share(v => v < .22), ground: layer(cls[0], 0), dense: layer(cls[1], 1), pattern: layer(cls[2], 2)});
    })()`);
    console.log(name, 'tone', tone);
  }
  return true;
};
// A job whose picture is of the wrong ward or theme is shot once more; if it is wrong again the run fails.
let failed = 0;
for (const job of jobs) if (!await shoot(job) && !await shoot(job)) failed++;
if (failed) { console.log('FAILED', failed, 'job(s)'); process.exitCode = 1; }
if (logs.length) console.log('CONSOLE:', [...new Set(logs.map(l => `${l.level}: ${l.text}`))].slice(0, 12).join('\n'));
await send('Target.closeTarget', {targetId: target.id}).catch(() => {});
ws.close();
