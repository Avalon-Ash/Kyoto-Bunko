import io, sys
BT = chr(96)
def patch(p, pairs, append=None):
    raw = io.open(p, 'r', encoding='utf-8', newline='').read()
    crlf = '\r\n' in raw
    s = raw.replace('\r\n', '\n')
    for a, b in pairs:
        if s.count(a) != 1: sys.exit('count %d in %s: %s' % (s.count(a), p, a[:80]))
        s = s.replace(a, b)
    if append: s = s.rstrip('\n') + '\n' + append
    io.open(p, 'w', encoding='utf-8', newline='').write(s.replace('\n', '\r\n') if crlf else s)

# ---------------------------------------------------------------- mat.js: the table
patch('src/studies/toji/plate/mat.js', [], append='''
/**
 * MAT_LOOK: one row per material, one column per property. It is the only place a material's look on the lid is decided; the ground
 * shader, the coat, the dev views and the measuring tools read the columns (three-pack.js turns them into GLSL constant arrays).
 * Add a material here, not as a branch in a shader (docs/plans/2026-11-18-material-table.md).
 *
 *   ch         how steeply the powder channel (fine.g) tilts the surface's normal: 2.4 a bevelled inlay or line; 15 a bank's wedge;
 *              5 a far mountain's ridge; 0 flush with the lid (togidashi: suhama, water).
 *   chRidge    ch only bites near the ridge (a far mountain: the step where its head lies over the one behind).
 *   lh         how steeply a drawn line (fine.b) tilts the normal: .7, or .15 for the fine gold line on a gold suhama's edge.
 *   coat       how the transparent lacquer lies over it (COAT_KIND).
 *   density    the ground under it is the plain ground itself, so it takes the same powder-density field (maki-bokashi). A material
 *              drawn flush on the ground without this shows a dark rim where its powder thins (the three dark edges of 2026-11-17).
 *   flakeD, flakeCell   larger flakes scattered in its powder (density and cell size); 0: none.
 *   foil       cut foil that flashes as the light moves.
 *   tone       its metal (TONE).
 *   hill       hill ground: carries halftone kirikane and wears at the crown.
 *   tier       which tone layer it belongs to (TIER): the plain ground is the darkest, dense-nashiji faces the middle, the rest the pattern.
 */
export const COAT_KIND = {top: 0, sunk: 1, half: 2, foot: 3, powder30: 4, powder35: 5, waterEdge: 6, inlayEdge: 7, none: 8};
export const TONE = {gold: 0, silver: 1, blue: 2};
export const TIER = {pattern: 0, ground: 1, dense: 2};
const LOOK_DEFAULT = {ch: 2.4, chRidge: false, lh: .7, coat: 'top', density: false, flakeD: 0, flakeCell: 0, foil: false, tone: 'gold', hill: false, tier: 'pattern'};
const look = (over = {}) => Object.freeze({...LOOK_DEFAULT, ...over});
const HILL = look({coat: 'foot', hill: true, tier: 'dense'});
export const MAT_LOOK = Object.freeze({
  0: look(), // a material this table does not list
  [MAT.ground]: look({coat: 'sunk', density: true, tier: 'ground'}),
  [MAT.nashijiLight]: HILL,
  [MAT.mura]: HILL,
  [MAT.gyobu]: HILL,
  [MAT.gold]: look({coat: 'inlayEdge'}),
  [MAT.silver]: look({coat: 'half', tone: 'silver'}),
  [MAT.kirikane]: look({coat: 'inlayEdge', foil: true}),
  [MAT.kirigin]: look({coat: 'inlayEdge', foil: true, tone: 'silver'}),
  [MAT.aogai]: look({coat: 'none'}),
  [MAT.hyomonGold]: look({coat: 'inlayEdge'}),
  [MAT.hyomonSilver]: look({coat: 'inlayEdge', tone: 'silver'}),
  [MAT.water]: look({ch: 0, coat: 'waterEdge', density: true, tier: 'dense'}),
  [MAT.kasumi]: look(),
  [MAT.lacquer]: look(),
  [MAT.lamp]: look(),
  [MAT.muraSilver]: look({tone: 'silver'}),
  [MAT.coral]: look({coat: 'none'}),
  [MAT.roofPowder]: look(),
  [MAT.bankGold]: look({ch: 15, coat: 'powder30', density: true, tier: 'dense'}),
  [MAT.bankSilver]: look({ch: 15, coat: 'powder30', density: true, tone: 'silver', tier: 'dense'}),
  [MAT.sandGold]: look({ch: 0, lh: .15, coat: 'powder35', density: true, flakeD: .3, flakeCell: 5.2, tier: 'dense'}),
  [MAT.sandSilver]: look({ch: 0, coat: 'powder35', density: true, tone: 'silver', tier: 'dense'}),
  [MAT.toyamaGold]: look({ch: 5, chRidge: true, coat: 'powder30', density: true, flakeD: .3, flakeCell: 5.2, tier: 'dense'}),
  [MAT.toyamaBlue]: look({ch: 5, chRidge: true, coat: 'powder30', density: true, tone: 'blue', tier: 'dense'}),
  [MAT.rockGold]: look(),
  [MAT.rockSilver]: look({tone: 'silver'}),
  [MAT.rockOlive]: look({tone: 'blue'}),
  [MAT.rockLine]: look(),
});
''')

# ---------------------------------------------------------------- three-pack.js: arrays from the table, predicates read them
patch('src/studies/toji/plate/three-pack.js', [
 ("import {MAT, KIND} from './vocab.js';\n",
  "import {MAT, KIND} from './vocab.js';\nimport {MAT_LOOK, COAT_KIND, TONE, TIER} from './mat.js';\n"),
 ("/** Fragment declarations injected into groundMaterial (MeshPhysicalMaterial). */\n",
  "/**\n"
  " * MAT_LOOK (mat.js) as GLSL constant arrays, one per column, indexed by the material id; and the names of each column's kinds.\n"
  " * The ground shader reads these and never compares a material id with a number. A float is written out in full (String, not\n"
  " * toFixed), so the shader holds exactly the table's value.\n"
  " */\n"
  "const LOOK_N = Math.max(...Object.keys(MAT_LOOK).map(Number)) + 1;\n"
  "const lookColumn = (type, value) => `const ${type} T_${value.name}[${LOOK_N}]=${type}[${LOOK_N}](${Array.from({length: LOOK_N}, (_, id) => value.of(MAT_LOOK[id] ?? MAT_LOOK[0])).join(',')});`;\n"
  "const glslFloat = v => { const text = String(v); return /[.e]/.test(text) ? text : `${text}.`; };\n"
  "const glslName = key => key.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase();\n"
  "const glslKinds = (prefix, kinds) => `const int ${Object.entries(kinds).map(([key, id]) => `${prefix}_${glslName(key)}=${id}`).join(',')};`;\n"
  "export const MAT_LOOK_GLSL = [\n"
  "  `const int LOOK_N=${LOOK_N};`,\n"
  "  glslKinds('COAT', COAT_KIND), glslKinds('TONE', TONE), glslKinds('TIER', TIER),\n"
  "  lookColumn('float', {name: 'CH', of: row => glslFloat(row.ch)}),\n"
  "  lookColumn('bool', {name: 'CH_RIDGE', of: row => String(row.chRidge)}),\n"
  "  lookColumn('float', {name: 'LH', of: row => glslFloat(row.lh)}),\n"
  "  lookColumn('int', {name: 'COAT', of: row => COAT_KIND[row.coat]}),\n"
  "  lookColumn('bool', {name: 'DENSITY', of: row => String(row.density)}),\n"
  "  lookColumn('float', {name: 'FLAKE_D', of: row => glslFloat(row.flakeD)}),\n"
  "  lookColumn('float', {name: 'FLAKE_CELL', of: row => glslFloat(row.flakeCell)}),\n"
  "  lookColumn('bool', {name: 'FOIL', of: row => String(row.foil)}),\n"
  "  lookColumn('int', {name: 'TONE', of: row => TONE[row.tone]}),\n"
  "  lookColumn('bool', {name: 'HILL', of: row => String(row.hill)}),\n"
  "  lookColumn('int', {name: 'TIER', of: row => TIER[row.tier]}),\n"
  "].join('\\n');\n\n"
  "/** Fragment declarations injected into groundMaterial (MeshPhysicalMaterial). */\n"),
 ("// Banks (doha.js): how steeply the wedge's height (the G channel, 0..1) tilts the surface's normal, in the same units as cH below.\nconst float M_BANK_CH=15.;\n",
  "${MAT_LOOK_GLSL}\n"),
 ("  ivec2 im=mIdent0(kp);int id=im.x,mat=im.y;\n",
  "  ivec2 im=mIdent0(kp);int id=im.x,mat=im.y,mi=clamp(mat,0,LOOK_N-1); // mi: the material's row in MAT_LOOK (the T_ arrays)\n"),
 ("cH=(mat==19||mat==20)?M_BANK_CH:(mat==23||mat==24)?5.*smoothstep(.56,.72,fine.g):(mat==21||mat==22||mat==12)?0.:2.4,lH=mat==21?.15:.7,eC=",
  "cH=T_CH_RIDGE[mi]?T_CH[mi]*smoothstep(.56,.72,fine.g):T_CH[mi],lH=T_LH[mi],eC="),
 ("    if(mat==1){mKS=1.;mKT=0.;}\n"
  "    else if(mat==6){mKS=.45;mKT=.55;}\n"
  "    else if(mat==2||mat==3||mat==4){mKS=1.-smoothstep(.01,.14,hs);mKT=1.-mKS;}\n"
  "    else if(mat==19||mat==20||mat==23||mat==24){mKS=1.-smoothstep(.0,.3,fine.g);mKT=1.-mKS;}\n"
  "    else if(mat==21){mKS=1.-smoothstep(.0,.35,fine.g);mKT=1.-mKS;}\n"
  "    else if(mat==22){mKS=1.-smoothstep(.0,.35,fine.g);mKT=1.-mKS;}\n"
  "    else if(mat==12){mFlat=1.;",
  "    int ck=T_COAT[mi];\n"
  "    if(ck==COAT_SUNK){mKS=1.;mKT=0.;}\n"
  "    else if(ck==COAT_HALF){mKS=.45;mKT=.55;}\n"
  "    else if(ck==COAT_FOOT){mKS=1.-smoothstep(.01,.14,hs);mKT=1.-mKS;}\n"
  "    else if(ck==COAT_POWDER30){mKS=1.-smoothstep(.0,.3,fine.g);mKT=1.-mKS;}\n"
  "    else if(ck==COAT_POWDER35){mKS=1.-smoothstep(.0,.35,fine.g);mKT=1.-mKS;}\n"
  "    else if(ck==COAT_WATER_EDGE){mFlat=1.;"),
 ("    else if(mat==5||mat==7||mat==8||mat==10||mat==11){mFlat=1.;float ke=", "    else if(ck==COAT_INLAY_EDGE){mFlat=1.;float ke="),
 ("    else if(mat==9||mat==17){mKT=0.;mKS=0.;mKE=0.;}\n", "    else if(ck==COAT_NONE){mKT=0.;mKS=0.;mKE=0.;}\n"),
 ("  if(mat==1||mat==12||(mat>=19&&mat<=22)||mat==23||mat==24){float bk=mix(1.,M_AGE_BOKASHI,uAge);", "  if(T_DENSITY[mi]){float bk=mix(1.,M_AGE_BOKASHI,uAge);"),
 ("  if(mat==21||mat==23){bigD=.3;bigCell=5.2;}\n", "  if(T_FLAKE_D[mi]>0.){bigD=T_FLAKE_D[mi];bigCell=T_FLAKE_CELL[mi];}\n"),
 ("  if(mat==7||mat==8){\n    vec3 foil=mat==7?M_PALE:mAgedSilver(M_SILVER,kp,.6);", "  if(T_FOIL[mi]){\n    vec3 foil=T_TONE[mi]==TONE_GOLD?M_PALE:mAgedSilver(M_SILVER,kp,.6);"),
 ("  if(uAge>0.&&mat>=2&&mat<=4){\n", "  if(uAge>0.&&T_HILL[mi]){\n"),
 ("  if(uDensView>4.5)c=mat==1?vec3(1.,0.,1.):(mat==2||mat==3||mat==4||mat==12||(mat>=19&&mat<=24))?vec3(0.,1.,1.):vec3(0.,1.,0.);",
  "  if(uDensView>4.5)c=T_TIER[mi]==TIER_GROUND?vec3(1.,0.,1.):T_TIER[mi]==TIER_DENSE?vec3(0.,1.,1.):vec3(0.,1.,0.);"),
 ("  else if(uDensView>1.5)c=mat==1?vec3(1.,0.,1.):vec3(0.,1.,0.);", "  else if(uDensView>1.5)c=T_TIER[mi]==TIER_GROUND?vec3(1.,0.,1.):vec3(0.,1.,0.);"),
 ("outgoingLight=vec3(kiriV,0.,(mat>=2&&mat<=4)?1.-kiriV:kiriB*(1.-kiriV));", "outgoingLight=vec3(kiriV,0.,T_HILL[mi]?1.-kiriV:kiriB*(1.-kiriV));"),
])

# ---------------------------------------------------------------- tests: the oracle and the fences
patch('scripts/plate.test.mjs', [], append='''
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
  };
  const last = Math.max(...Object.values(MAT));
  assert.equal(last, 28, 'the highest material id (the table and this test cover 0..28)');
  for (const id of Object.values(MAT)) assert.ok(MAT_LOOK[id], `MAT_LOOK has a row for material ${id}`);
  for (let m = 0; m <= last; m++) {
    const row = MAT_LOOK[m] ?? MAT_LOOK[0];
    for (const key of ['ch', 'chRidge', 'lh', 'coat', 'density', 'foil', 'hill', 'tier']) assert.equal(row[key], was[key](m), `material ${m}: ${key}`);
    assert.deepEqual(row.flakeD > 0 ? [row.flakeD, row.flakeCell] : null, was.flake(m), `material ${m}: large flakes`);
    if (row.foil) assert.equal(row.tone === 'gold', was.foilIsGold(m), `material ${m}: the foil's metal`);
  }
});

test('material table: the GLSL arrays hold the table exactly, and kinds are compared by name, never by number', async () => {
  const {MAT_LOOK_GLSL, MAKIE_GROUND_FRAG_GLSL, MATERIALS} = await import('../src/studies/toji/plate/three-pack.js');
  const {MAT_LOOK, COAT_KIND} = await import('../src/studies/toji/plate/mat.js');
  const column = name => { const m = MAT_LOOK_GLSL.match(new RegExp(`T_${name}\\\\[(\\\\d+)\\\\]=\\\\w+\\\\[\\\\d+\\\\]\\\\(([^)]*)\\\\);`)); assert.ok(m, `column ${name}`); return m[2].split(','); };
  const rows = Array.from({length: 29}, (_, id) => MAT_LOOK[id] ?? MAT_LOOK[0]);
  assert.deepEqual(column('CH').map(Number), rows.map(r => r.ch));
  assert.deepEqual(column('LH').map(Number), rows.map(r => r.lh));
  assert.deepEqual(column('FLAKE_D').map(Number), rows.map(r => r.flakeD));
  assert.deepEqual(column('FLAKE_CELL').map(Number), rows.map(r => r.flakeCell));
  assert.deepEqual(column('COAT').map(Number), rows.map(r => COAT_KIND[r.coat]));
  assert.deepEqual(column('DENSITY'), rows.map(r => String(r.density)));
  assert.ok(column('CH').every(text => /[.e]/.test(text)), 'floats are written as floats');
  assert.equal((MAKIE_GROUND_FRAG_GLSL.match(/T_[A-Z_]+\\[mi\\]\\s*(==|!=|<|>)=?\\s*[0-9]/g) ?? []).filter(hit => !/>0\\.$/.test(hit) && !/>\\s*0$/.test(hit)).length, 0, 'a kind is compared with its named constant');
  // Until the mesh materials move into MAT_LOOK (step 3) the two tables split the columns between them.
  const meshColumns = new Set(Object.values(MATERIALS).flatMap(Object.keys)), lookColumns = Object.keys(MAT_LOOK[0]);
  for (const id of Object.keys(MATERIALS)) assert.ok(MAT_LOOK[id], `MATERIALS[${id}] has a row in MAT_LOOK`);
  for (const key of lookColumns) assert.ok(!meshColumns.has(key), `column ${key} lives in one table only`);
});
''')
print('ok')
