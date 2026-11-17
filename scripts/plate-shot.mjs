// Screenshots of the makie plate through headless Chrome over the DevTools protocol; no Playwright needed.
// Usage: node scripts/plate-shot.mjs <outDir> <job> [job…]   (the dev server must be on 127.0.0.1:3000)
// job = name:steps:theme:WxH:zoom:fx,fy   steps: signed cabinet steps from Minami; theme: night|day, plus "-still"
// to press pause first; zoom 1..3; fx,fy: where the light rests, as fractions of the canvas. See docs/MAKIE_PLATE_HANDOFF.md §7.
// PLATE_SHOT_QUERY=?plate=static node scripts/plate-shot.mjs …  shoots the still-picture fallback instead of three.js.
// PLATE_TONE=1 also prints each shot's tone over the lid's own pixels (three.js only): luminance percentiles, median
// saturation, and the share of bright and dark pixels, all in percent. docs/plans/2026-11-16-patina.md §5 uses them.
// Each layer also reports its mean hue (degrees, weighted by chroma) and mean HSV saturation (percent).
// The same line carries three layers (docs/plans/2026-11-16-ground-tone.md): ground (plain ground), dense (faces of dense nashiji: hills,
// water, banks, suhama, toyama, mist) and pattern (the rest: inlays, parts), each with its share of the lid, L25/L50/L75, and the share of
// the lid it covers with luminance above 75 (bright). Dev mask view 5 paints plain ground magenta, dense faces cyan, the rest green.
import {spawn} from 'node:child_process';
import {writeFileSync, mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const PORT = 9377, CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const [outDir, ...jobs] = process.argv.slice(2);
mkdirSync(outDir, {recursive: true});
const sleep = ms => new Promise(r => setTimeout(r, ms));
const alive = async () => { try { return (await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok; } catch { return false; } };
if (!await alive()) {
  spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${fileURLToPath(new URL('../node_modules/.cache/chrome-profile', import.meta.url))}`, '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--hide-scrollbars', '--window-size=1440,900', 'about:blank'], {detached: true, stdio: 'ignore'}).unref();
  for (let i = 0; i < 40 && !await alive(); i++) await sleep(250);
}
const target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, {method: 'PUT'})).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r));
let seq = 0; const pending = new Map(), logs = [];
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type)) logs.push(m.params.args.map(a => a.value ?? a.description).join(' '));
  if (m.method === 'Runtime.exceptionThrown') logs.push('EXC ' + m.params.exceptionDetails.text + ' ' + (m.params.exceptionDetails.exception?.description ?? ''));
});
const send = (method, params = {}) => new Promise(r => { const id = ++seq; pending.set(id, r); ws.send(JSON.stringify({id, method, params})); });
const evalJs = async expression => (await send('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true})).result?.result?.value;
await send('Runtime.enable'); await send('Page.enable');

for (const job of jobs) {
  const [name, steps, theme, size, zoom, at] = job.split(':'), [w, h] = size.split('x').map(Number), [fx, fy] = at.split(',').map(Number);
  await send('Emulation.setDeviceMetricsOverride', {width: w, height: h, deviceScaleFactor: w < 700 ? 2 : 1, mobile: false});
  await send('Page.navigate', {url: 'http://127.0.0.1:3000/toji-study/index.html' + (process.env.PLATE_SHOT_QUERY ?? '')});
  for (let i = 0; i < 60 && !(await evalJs(`Boolean(document.querySelector('#scene')?.dataset.lift)`)); i++) await sleep(200);
  if (theme.endsWith('still')) { await evalJs(`document.querySelector('#motion').click()`); await sleep(200); }
  if (theme.startsWith('day')) { await evalJs(`document.querySelector('#night').click()`); await sleep(300); }
  for (let i = 0; i < Math.abs(Number(steps)); i++) {
    await evalJs(`document.querySelector('#${Number(steps) < 0 ? 'previous' : 'next'}-cabinet').click()`);
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
  await sleep(2800);
  await send('Input.dispatchMouseEvent', {type: 'mouseMoved', x: x + 1, y});
  await sleep(400);
  const info = await evalJs(`JSON.stringify(Object.assign({}, document.querySelector('#scene').dataset))`);
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
}
if (logs.length) console.log('CONSOLE:', [...new Set(logs)].slice(0, 12).join('\n'));
await send('Target.closeTarget', {targetId: target.id}).catch(() => {});
ws.close();
