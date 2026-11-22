// A hash of every ward's parts (PLATES[ward]() in src/studies/toji/plate/parts.js): geometry, materials, fills, lines, meshes.
// Proves that a change to the builders (doha.js, vocab.js, the *-mesh.js files, mat.js) did not move a number, without a browser.
// Usage: node scripts/plate-parts-hash.mjs            prints the hashes
//        node scripts/plate-parts-hash.mjs --write    saves them as the baseline (docs/plans/material-table/parts-hash-baseline.json)
//        node scripts/plate-parts-hash.mjs --check    compares with the baseline; exits 1 on any difference
// The baseline is a record for one piece of work, not a test: a change to a composition is meant to change it.
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {PLATES} from '../src/studies/toji/plate/parts.js';

const BASELINE = fileURLToPath(new URL('../docs/plans/material-table/parts-hash-baseline.json', import.meta.url));
const plain = (key, value) => {
  if (typeof value === 'function') return '<function>';
  if (ArrayBuffer.isView(value)) return {type: value.constructor.name, data: Array.from(/** @type {ArrayBufferView & ArrayLike<number>} */ (value))};
  if (typeof value === 'number' && !Number.isFinite(value)) return String(value);
  if (Object.is(value, -0)) return '-0';
  return value;
};
const hashes = Object.fromEntries(Object.keys(PLATES).map(ward => [ward, createHash('sha256').update(JSON.stringify(PLATES[ward](), plain)).digest('hex')]));
const mode = process.argv[2];
if (mode === '--write') { writeFileSync(BASELINE, JSON.stringify(hashes, null, 2) + '\n'); console.log('baseline written:', Object.keys(hashes).length, 'wards'); }
else if (mode === '--check') {
  const want = JSON.parse(readFileSync(BASELINE, 'utf8')), wards = [...new Set([...Object.keys(want), ...Object.keys(hashes)])];
  const changed = wards.filter(ward => want[ward] !== hashes[ward]);
  console.log(changed.length ? `CHANGED: ${changed.join(', ')}` : `identical: ${wards.length}/${wards.length} wards`);
  if (changed.length) process.exitCode = 1;
} else for (const [ward, hash] of Object.entries(hashes)) console.log(ward, hash.slice(0, 16));
