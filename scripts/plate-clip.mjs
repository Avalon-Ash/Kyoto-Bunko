// Interpenetration probe: for each of the eleven wards, how deep do parts go into the ground and into each other, lying
// and standing? Runs src/studies/toji/plate/clip-probe.js in the dev page through headless Chrome (dev server on 127.0.0.1:3000).
// Usage: node scripts/plate-clip.mjs <out.json> [--anchor] [--min=0.5]
//   --anchor measures the trees as they moved before the fix (one flat height per tree), for the before column.
// Prints one line per finding and a summary; the full list is written to <out.json>. docs/plans/2026-11-16-clip.md.
import {spawn} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const PORT = 9377, CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const [out, ...flags] = process.argv.slice(2);
const anchor = flags.includes('--anchor'), minDepth = Number(flags.find(f => f.startsWith('--min='))?.slice(6) ?? .25);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const alive = async () => { try { return (await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok; } catch { return false; } };
if (!await alive()) {
  spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${fileURLToPath(new URL('../node_modules/.cache/chrome-profile', import.meta.url))}`, '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--hide-scrollbars', '--window-size=1440,900', 'about:blank'], {detached: true, stdio: 'ignore'}).unref();
  for (let i = 0; i < 40 && !await alive(); i++) await sleep(250);
}
const target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, {method: 'PUT'})).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r));
let seq = 0; const pending = new Map();
ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise(r => { const id = ++seq; pending.set(id, r); ws.send(JSON.stringify({id, method, params})); });
const evalJs = async expression => { const r = (await send('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true})).result; if (r?.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails)); return r?.result?.value; };
await send('Runtime.enable'); await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', {width: 1440, height: 900, deviceScaleFactor: 1, mobile: false});
await send('Page.navigate', {url: 'http://127.0.0.1:3000/toji-study/index.html'});
for (let i = 0; i < 80 && !(await evalJs(`Boolean(document.querySelector('#scene')?.dataset.lift)`)); i++) await sleep(200);

const all = [], seen = new Set();
for (let step = 0; step < 11; step++) {
  if (step) {
    await evalJs(`document.querySelector('#next-cabinet').click()`);
    for (let k = 0; k < 40; k++) { await sleep(150); if (!(await evalJs(`document.querySelector('#next-cabinet').disabled`))) break; }
  }
  // The hand rests at the lid's far corner so the lid has its relief (lift) and nothing stands under it.
  await evalJs(`document.querySelector('#scene').scrollIntoView({block:'center'})`);
  const r = await evalJs(`(()=>{const c=document.querySelector('#scene').getBoundingClientRect();return [c.x,c.y,c.width,c.height];})()`);
  await send('Input.dispatchMouseEvent', {type: 'mouseMoved', x: r[0] + r[2] * .02, y: r[1] + r[3] * .1});
  await sleep(150); await send('Input.dispatchMouseEvent', {type: 'mouseMoved', x: r[0] + r[2] * .03, y: r[1] + r[3] * .1});
  await sleep(3500);
  console.error('lift', await evalJs(`document.querySelector('#scene').dataset.lift`));
  const res = JSON.parse(await evalJs(`window.__kyotoPlateProbe(${JSON.stringify({treeAtAnchor: anchor, minDepth})}).then(JSON.stringify)`));
  if (seen.has(res.ward)) { console.error('ward repeated', res.ward); continue; }
  seen.add(res.ward); all.push(res);
}
writeFileSync(out, JSON.stringify({anchor, minDepth, wards: all}, null, 1));
const rows = [];
for (const w of all) {
  for (const g of w.ground) rows.push({...g, ward: w.ward, kind: 'ground', what: g.id});
  for (const p of w.pairs) rows.push({...p, ward: w.ward, kind: 'pair', what: `${p.a} x ${p.b}`});
}
rows.sort((a, b) => b.max - a.max);
for (const r of rows.slice(0, 60)) console.log(`${r.max.toFixed(1).padStart(5)}  ${r.ward.padEnd(13)} ${r.posture.padEnd(22)} ${r.kind.padEnd(6)} ${r.what}  n=${r.n}${r.kind === 'ground' ? ` aboveFoot=${r.maxAboveFoot}` : ''}`);
const worst = rows.length ? rows[0].max : 0;
console.log(`findings ${rows.length}  deepest ${worst}  (ground ${rows.filter(r => r.kind === 'ground').length}, pairs ${rows.filter(r => r.kind === 'pair').length}, depth > ${minDepth})`);
ws.close(); process.exit(0);
