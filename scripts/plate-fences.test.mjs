// Scope fences and range fences for the plate (ADR 0014): tests that pin the current scope or a plan's numbers.
// They are expected to move when the plan or the scope moves; a change that moves one is not a behaviour change.
// The behaviour tests are in scripts/plate.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import {PLATES, preparePlate} from '../src/studies/toji/plate/parts.js';
import {KIND, MAT} from '../src/studies/toji/plate/vocab.js';
import {dohaWards, nineWards, flatWards} from './lib/plate-test-helpers.mjs';
import {measureDoha} from './plate-doha-measure.mjs';

// Doha (docs/plans/2026-11-16-doha.md §4.3, §10): the pieces of the two pilot wards stay inside the plan's numbers. Range fences; they move when the plan does.
const rockTotals = {W_FUSHIMI: [3, 5], W_NAKAGYO: [3, 5], W_HIGASHIYAMA: [2, 2], W_KITA: [0, 0], W_MINAMI: [3, 3], W_UKYO: [0, 0], W_SAKYO: [0, 0], W_YAMASHINA: [0, 0], W_NISHIKYO: [0, 0], W_KAMIGYO: [0, 0], W_SHIMOGYO: [0, 0]}; // Kita's two rocks are not named rock-*, so the measure does not count them
for (const ward of dohaWards) test(`doha: ${ward} pieces keep the composition numbers`, () => {
  const m = measureDoha(ward);
  // Nakagyo is one shore of four long banks (plan §11.2): the cluster, piece-count, size and straight-run ranges are for the scattered wards.
  const shore = ward === 'W_NAKAGYO' || nineWards.has(ward);
  if (!shore) assert.ok(m.clusters >= 2 && m.clusters <= 4, `clusters ${m.clusters}`);
  if (!shore) for (const [c, n] of Object.entries(m.piecesPerCluster)) assert.ok(n >= 3 && n <= 7, `${c}: ${n} pieces`);
  else if (!nineWards.has(ward)) assert.ok(m.pieces >= 2 && m.pieces <= 4, `shore pieces ${m.pieces}`);
  else if (flatWards[ward]) assert.ok(m.pieces >= flatWards[ward][0] && m.pieces <= flatWards[ward][1] && m.farHeads === 0, `shore pieces ${m.pieces}, mountain heads ${m.farHeads}`);
  else assert.ok(m.pieces >= 6 && m.pieces <= 14 && m.farHeads >= 3, `mountain heads ${m.farHeads} and shore pieces ${m.pieces - m.farHeads}`);
  for (const [c, n] of Object.entries(m.rocksPerCluster)) assert.ok(n <= 5, `${c}: ${n} rocks`);
  const [lo, hi] = rockTotals[ward];
  assert.ok(m.rocks >= lo && m.rocks <= hi, `${m.rocks} rocks, not ${lo}-${hi}`);
  if (!shore) assert.ok(m.largestPiece <= 4, `largest piece ${m.largestPiece}%`);
  assert.ok(m.piecesAndRocksShare >= (ward === 'W_KAMIGYO' ? 0 : flatWards[ward] ? 12 : nineWards.has(ward) ? 15 : 20) && m.piecesAndRocksShare <= (flatWards[ward] ? 30 : 35), `taken ${m.piecesAndRocksShare}%`);
  assert.ok(m.bareShare >= 35 && m.bareConnectedShare >= 70, `bare ${m.bareShare}%, connected ${m.bareConnectedShare}%`);
  if (!shore) assert.ok(m.silverPieces >= 33.3, `silver ${m.silverPieces}% (far mountains excepted)`);
  if (!shore || nineWards.has(ward)) assert.ok((nineWards.has(ward) ? m.longestStraightPieces : m.longestStraight) <= 30, `straight run ${nineWards.has(ward) ? m.longestStraightPieces : m.longestStraight}`);
  const {parts} = preparePlate(PLATES[ward]());
  for (const id of ['palace-ground', 'inari-yama', 'ridge-far', 'bank-near', 'bank-gate']) assert.ok(!parts.some(p => p.id === id), `${ward} no longer has ${id}`);
});
test('doha: Inari-yama is one far mountain: no rocks on it, a low ridge, no cut gold, and a rock stands in the near land only', () => {
  const {parts} = preparePlate(PLATES.W_FUSHIMI());
  const heads = parts.filter(p => p.mat === MAT.toyamaGold || p.mat === MAT.toyamaBlue).flatMap(p => p.fills);
  assert.ok(heads.length >= 3 && heads.length <= 5 + 3, 'three to five heads on the mountain, and the far range');
  for (const f of heads) { assert.ok(f.wedge && f.wedge.amp <= .2, 'a far mountain is raised only a little, at its ridge'); assert.ok(!f.kiri, 'and carries no cut gold'); }
  for (const r of parts.filter(p => p.kind === KIND.rock && /^rock-/.test(p.id))) assert.ok(r.centre[1] > 20, `${r.id} is in the near land (z ${r.centre[1].toFixed(0)}), not on the mountain`);
});

test('scope fence: part counts per ward, and which parts of Fushimi and Higashiyama are explicit meshes', () => {
  // Scope fence: part counts per ward. R5a/R5b added the attached scenes to every ward; patina P3b split the coral
  // leaves, the fire of the 大, the silver petals and the dew of shell into parts of their own (one part per material).
  const expectedCounts = {W_MINAMI: 55, W_UKYO: 29, W_NISHIKYO: 34, W_YAMASHINA: 39, W_FUSHIMI: 46, W_KITA: 32, W_KAMIGYO: 42, W_SAKYO: 37, W_NAKAGYO: 45, W_HIGASHIYAMA: 31, W_SHIMOGYO: 36};
  for (const [ward, build] of Object.entries(PLATES)) {
    const {parts, errors} = preparePlate(build());
    assert.deepEqual(errors, [], ward);
    assert.equal(parts.length, expectedCounts[ward], `${ward} part count`);
  }

  const fushimi = preparePlate(PLATES.W_FUSHIMI()).parts;
  for (const p of fushimi) {
    // Scope fence (p1, widened by p2): torii and the rōmon are explicit meshes; the rest of Fushimi is not migrated yet.
    const isTorii = p.id === 'torii' || p.id === 'torii-lip' || p.id.startsWith('gate-');
    if (isTorii || p.id.startsWith('romon-') || p.kind === KIND.rock) {
      assert.ok(Array.isArray(p.mesh) && p.mesh.length > 0, `${p.id} has mesh`);
      assert.equal(p.thick, 0, `${p.id} thick is 0`);
    } else if (/^(kitsune-(stone|body)|uguisu-)/.test(p.id)) {
      // Scope fence widened by R2: the fox and the uguisu are low-relief meshes.
      assert.ok(Array.isArray(p.mesh) && p.mesh.length > 0, `${p.id} has mesh`);
    } else if (/^torii-lantern-/.test(p.id) && !p.id.includes('-glow')) {
      // Scope fence widened by R5a: the stone lantern at the great torii is a mesh (their glow chips stay ground).
      assert.ok(Array.isArray(p.mesh) && p.mesh.length > 0, `${p.id} has mesh`);
    } else {
      assert.equal(p.mesh, undefined, `${p.id} is not migrated`);
    }
  }
  assert.equal(fushimi.find(p => p.id === 'torii-lip').motionWith, 'torii');

  const higashiyama = preparePlate(PLATES.W_HIGASHIYAMA()).parts;
  for (const p of higashiyama) {
    // Scope fence (p1, widened by p2): the stage and the hondō on it are explicit meshes.
    if (p.id === 'butai-frame' || p.id === 'butai-deck' || p.id.startsWith('hondo-') || p.kind === KIND.rock) {
      assert.ok(Array.isArray(p.mesh) && p.mesh.length > 0, `${p.id} has mesh`);
      assert.equal(p.thick, 0, `${p.id} thick is 0`);
    } else if (p.id.startsWith('uguisu-')) {
      assert.ok(Array.isArray(p.mesh) && p.mesh.length > 0, `${p.id} has mesh (R2)`);
    } else {
      assert.equal(p.mesh, undefined, `${p.id} is not migrated`);
    }
    if (p.group === 'butai' && p.id !== 'butai-frame') {
      assert.equal(p.motionWith, 'butai-frame', `${p.id} follows butai-frame`);
    }
  }
});

// Scope fence (docs/plans/2026-11-18-material-table.md, step 1): the ground shader's shared properties were moved from mat==N
// branches into MAT_LOOK. The predicates below are the ones the shader used at 56fc135, copied as JS; later steps update them.
test('material table: every predicate the ground shader used gives the same answer from MAT_LOOK, for every material id', async () => {
  const {MAT, MAT_LOOK} = await import('../src/studies/toji/plate/mat.js');
  const was = {
    ch: m => (m === 19 || m === 20) ? 15 : (m === 23 || m === 24) ? 5 : (m === 21 || m === 22 || m === 12) ? 0 : 2.4,
    chRidge: m => m === 23 || m === 24,
    lh: m => m === 21 ? .15 : .7,
    coat: m => m === 1 ? 'sunk' : m === 6 ? 'half' : (m === 2 || m === 3 || m === 4) ? 'foot' : (m === 19 || m === 20 || m === 23 || m === 24) ? 'powder30'
      : (m === 21 || m === 22) ? 'powder35' : m === 12 ? 'waterEdge' : (m === 5 || m === 7 || m === 8 || m === 10 || m === 11) ? 'inlayEdge' : (m === 9 || m === 17) ? 'none' : 'top',
    density: m => m === 1 || m === 12 || (m >= 19 && m <= 22) || m === 23 || m === 24,
    flake: m => (m === 21 || m === 23) ? [.3, 5.2] : null,
    foil: m => m === 7 || m === 8,
    foilIsGold: m => m === 7,
    hill: m => m >= 2 && m <= 4,
    tier: m => m === 1 ? 'ground' : (m === 2 || m === 3 || m === 4 || m === 12 || (m >= 19 && m <= 24)) ? 'dense' : 'pattern',
    cloud: m => m === 3,
    recipe: m => ({1: 'ground', 2: 'hill', 3: 'hill', 4: 'gyobu', 5: 'gold', 6: 'hirame', 7: 'foil', 8: 'foil', 9: 'aogai', 10: 'sheet', 11: 'sheet', 12: 'ryusui',
      13: 'kasumi', 14: 'lacquer', 17: 'coral', 19: 'bank', 20: 'bank', 21: 'suhama', 22: 'suhama', 23: 'toyama', 24: 'toyama'})[m] ?? 'lamp',
    recipeIsGold: m => m === 7 || m === 10 || m === 19 || m === 21 || m === 23,
  };
  const last = Math.max(...Object.values(MAT));
  assert.equal(last, 28, 'the highest material id (the table and this test cover 0..28)');
  for (const id of Object.values(MAT)) assert.ok(MAT_LOOK[id], `MAT_LOOK has a row for material ${id}`);
  for (let m = 0; m <= last; m++) {
    const row = MAT_LOOK[m] ?? MAT_LOOK[0];
    for (const key of ['ch', 'chRidge', 'lh', 'coat', 'density', 'foil', 'hill', 'tier', 'cloud', 'recipe']) assert.equal(row[key], was[key](m), `material ${m}: ${key}`);
    if (['foil', 'sheet', 'bank', 'suhama', 'toyama'].includes(row.recipe)) assert.equal(row.tone === 'gold', was.recipeIsGold(m), `material ${m}: the recipe's metal`);
    assert.deepEqual(row.flakeD > 0 ? [row.flakeD, row.flakeCell] : null, was.flake(m), `material ${m}: large flakes`);
    if (row.foil) assert.equal(row.tone === 'gold', was.foilIsGold(m), `material ${m}: the foil's metal`);
  }
});

// Scope fence (docs/plans/2026-11-18-material-table.md, step 4a): doha.js and rock-mesh.js read DOHA_TONE / ROCK_LOOK from mat.js instead of branching on tone strings or MAT ids.
test('material table: doha and rock-mesh read DOHA_TONE and ROCK_LOOK with valid MAT ids', async () => {
  const {readFileSync} = await import('node:fs');
  const {MAT, DOHA_TONE, ROCK_LOOK, ROCK_DEFAULT} = await import('../src/studies/toji/plate/mat.js');
  const dohaSrc = readFileSync(new URL('../src/studies/toji/plate/doha.js', import.meta.url), 'utf8');
  const rockSrc = readFileSync(new URL('../src/studies/toji/plate/rock-mesh.js', import.meta.url), 'utf8');

  assert.equal(/\btone\s*(?:===?|!==?)\s*['"]/.test(dohaSrc), false, 'doha.js does not compare tone against a string literal');
  assert.equal(/['"][^'"]*['"]\s*(?:===?|!==?)\s*tone\b/.test(dohaSrc), false, 'doha.js does not compare a string literal against tone');
  assert.equal(/\bmat\s*(?:===?|!==?)\s*MAT\./.test(rockSrc), false, 'rock-mesh.js does not compare mat against MAT.*');
  assert.equal(/MAT\.\w+\s*(?:===?|!==?)\s*mat\b/.test(rockSrc), false, 'rock-mesh.js does not compare MAT.* against mat');

  const matIds = new Set(Object.values(MAT));
  for (const [kind, tones] of Object.entries(DOHA_TONE)) {
    for (const [tone, spec] of Object.entries(tones)) {
      assert.ok(matIds.has(spec.mat), `DOHA_TONE.${kind}.${tone}.mat (${spec.mat}) is a registered MAT id`);
    }
  }
  for (const [id, spec] of [...Object.entries(ROCK_LOOK), /** @type {[string, typeof ROCK_DEFAULT]} */ (['default', ROCK_DEFAULT])]) {
    assert.equal(typeof spec.powder, 'boolean', `ROCK_LOOK[${id}].powder is boolean`);
    assert.ok(matIds.has(spec.body), `ROCK_LOOK[${id}].body (${spec.body}) is a registered MAT id`);
    assert.ok(matIds.has(spec.tile), `ROCK_LOOK[${id}].tile (${spec.tile}) is a registered MAT id`);
    if (id !== 'default') assert.ok(matIds.has(Number(id)), `ROCK_LOOK key ${id} is a registered MAT id`);
  }
});

// Scope fence (docs/plans/2026-11-18-material-table.md, step 3): three-renderer.js read a raised surface's look from its name
// (spec.name === '…'); now it reads the columns of mat.js meshLook. The predicates below are the ones it used at 0b44c2c, copied
// as JS: every part material, every piece of the box and the lid must give the same answer from the columns.
test('material table: the renderer shader choices read the mesh columns and give the answers the names gave', async () => {
  const {readFileSync} = await import('node:fs');
  const {MATERIALS, BOX_MATERIALS, GROUND_LID} = await import('../src/studies/toji/plate/three-pack.js');
  const {MESH_COAT} = await import('../src/studies/toji/plate/mat.js');
  const was = {
    lacq: n => n === 'lacquer', rockP: n => /^rockPowder/.test(n), coat: n => n !== 'paper', shine: n => n !== 'paper' && n !== 'cord',
    cls: n => n === 'inner' || n === 'tray' ? 0 : n === 'aogai' || n === 'coral' ? 2 : 1,
    powder: n => n === 'roofPowder', leaf: n => n === 'gold', woodSilver: n => n === 'silver',
  };
  const all = [...Object.values(MATERIALS).map(s => [s, true]), ...Object.values(BOX_MATERIALS).map(s => [s, false]), [GROUND_LID, false]];
  for (const [s, isPart] of all) {
    const n = s.name;
    assert.equal(s.coat !== 'none', was.coat(n), `${n}: coated`);
    if (s.coat !== 'none') assert.equal(MESH_COAT[s.coat], was.cls(n), `${n}: coat class`);
    assert.equal(s.shine, was.shine(n), `${n}: takes the coat's shine`);
    if (!isPart) continue; // the rest only apply to a part's mesh (isPart in patchMaterial) or a tree's limbs
    assert.equal(s.shinnuri, was.lacq(n), `${n}: shin-nuri`);
    assert.equal(s.rockPowder, was.rockP(n), `${n}: powder rock`);
    assert.equal(s.grain === 'powder', was.powder(n), `${n}: roof powder`);
    assert.equal(s.grain === 'leaf', was.leaf(n), `${n}: gold leaf`);
    assert.equal(s.wood === 'silver', was.woodSilver(n), `${n}: silver wood`);
  }
  for (const [s] of all) for (const [k, kinds] of /** @type {['coat' | 'grain' | 'wood' | 'rock', (string | null)[]][]} */ ([['coat', [...Object.keys(MESH_COAT), 'none']], ['grain', [null, 'powder', 'leaf']], ['wood', ['gold', 'silver']], ['rock', [null, 'gold', 'silver']]]))
    assert.ok(kinds.includes(s[k]), `${s.name}.${k} is one of ${kinds}`);
  const src = readFileSync(new URL('../src/studies/toji/plate/three-renderer.js', import.meta.url), 'utf8');
  assert.deepEqual(src.match(/spec\.name\s*(===?|!==?)|\.test\(spec\.name\)/g) ?? [], [], 'the renderer does not branch on a material name');
});
