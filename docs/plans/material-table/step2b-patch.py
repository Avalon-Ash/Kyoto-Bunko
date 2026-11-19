# ALREADY APPLIED in commit 81b2b9a (2026-11-18, verified 2026-11-19: plan 8.11). Do not run it again.
# Step 2, second form (docs/plans/2026-11-18-material-table.md 8.9): the per-material branches of the ground shader stay where they are,
# in the main body, and only their conditions change: a material's recipe (a column of MAT_LOOK) instead of its id.
# Why not functions: moved into recipe functions (step2-patch.py) the shader took 49 s (switch) and 32 s (if chain) to compile the first
# time in a real Chrome on Windows, against 0.3 s for this structure.
# Run from the repo root on the code as it stands after step 1:  python docs/plans/material-table/step2b-patch.py
# Once it has been applied and committed, do not run it again.
import io, sys

def load(p):
    raw = io.open(p, 'r', encoding='utf-8', newline='').read()
    return raw.replace('\r\n', '\n'), '\r\n' in raw
def save(p, s, crlf):
    io.open(p, 'w', encoding='utf-8', newline='').write(s.replace('\n', '\r\n') if crlf else s)
def swap(s, a, b, n=1):
    if s.count(a) != n: sys.exit('count %d (want %d) for: %s' % (s.count(a), n, a[:90]))
    return s.replace(a, b)

# ------------------------------------------------------------------------------------------------ mat.js
P = 'src/studies/toji/plate/mat.js'
s, crlf = load(P)
s = swap(s, " *   tier       which tone layer it belongs to (TIER): the plain ground is the darkest, dense-nashiji faces the middle, the rest the pattern.\n */\n",
            " *   tier       which tone layer it belongs to (TIER): the plain ground is the darkest, dense-nashiji faces the middle, the rest the pattern.\n"
            " *   cloud      hill ground whose metal lies in cloudy patches (mura nashiji).\n"
            " *   recipe     how it is painted (RECIPE): which branches of the ground shader draw it. Gold and silver of one technique share a\n"
            " *              recipe and differ by `tone`.\n */\n")
s = swap(s, "export const TIER = {pattern: 0, ground: 1, dense: 2};\n",
            "export const TIER = {pattern: 0, ground: 1, dense: 2};\n"
            "export const RECIPE = {lamp: 0, ground: 1, hill: 2, gyobu: 3, gold: 4, hirame: 5, foil: 6, aogai: 7, sheet: 8, ryusui: 9, kasumi: 10, lacquer: 11,\n"
            "  coral: 12, bank: 13, suhama: 14, toyama: 15};\n")
s = swap(s, "foil: false, tone: 'gold', hill: false, tier: 'pattern'};", "foil: false, tone: 'gold', hill: false, cloud: false, tier: 'pattern', recipe: 'lamp'};")
s = swap(s, "const HILL = look({coat: 'foot', hill: true, tier: 'dense'});\n", "const HILL = {coat: 'foot', hill: true, tier: 'dense'};\n")
rows = [
 ("  0: look(), // a material this table does not list\n", "  0: look(), // a material this table does not list: painted as the lamp's glow\n"),
 ("[MAT.ground]: look({coat: 'sunk', density: true, tier: 'ground'}),", "[MAT.ground]: look({coat: 'sunk', density: true, tier: 'ground', recipe: 'ground'}),"),
 ("  [MAT.nashijiLight]: HILL,\n", "  [MAT.nashijiLight]: look({...HILL, recipe: 'hill'}),\n"),
 ("  [MAT.mura]: HILL,\n", "  [MAT.mura]: look({...HILL, cloud: true, recipe: 'hill'}),\n"),
 ("  [MAT.gyobu]: HILL,\n", "  [MAT.gyobu]: look({...HILL, recipe: 'gyobu'}),\n"),
 ("[MAT.gold]: look({coat: 'inlayEdge'}),", "[MAT.gold]: look({coat: 'inlayEdge', recipe: 'gold'}),"),
 ("[MAT.silver]: look({coat: 'half', tone: 'silver'}),", "[MAT.silver]: look({coat: 'half', tone: 'silver', recipe: 'hirame'}),"),
 ("[MAT.kirikane]: look({coat: 'inlayEdge', foil: true}),", "[MAT.kirikane]: look({coat: 'inlayEdge', foil: true, recipe: 'foil'}),"),
 ("[MAT.kirigin]: look({coat: 'inlayEdge', foil: true, tone: 'silver'}),", "[MAT.kirigin]: look({coat: 'inlayEdge', foil: true, tone: 'silver', recipe: 'foil'}),"),
 ("[MAT.aogai]: look({coat: 'none'}),", "[MAT.aogai]: look({coat: 'none', recipe: 'aogai'}),"),
 ("[MAT.hyomonGold]: look({coat: 'inlayEdge'}),", "[MAT.hyomonGold]: look({coat: 'inlayEdge', recipe: 'sheet'}),"),
 ("[MAT.hyomonSilver]: look({coat: 'inlayEdge', tone: 'silver'}),", "[MAT.hyomonSilver]: look({coat: 'inlayEdge', tone: 'silver', recipe: 'sheet'}),"),
 ("[MAT.water]: look({ch: 0, coat: 'waterEdge', density: true, tier: 'dense'}),", "[MAT.water]: look({ch: 0, coat: 'waterEdge', density: true, tier: 'dense', recipe: 'ryusui'}),"),
 ("  [MAT.kasumi]: look(),\n", "  [MAT.kasumi]: look({recipe: 'kasumi'}),\n"),
 ("  [MAT.lacquer]: look(),\n", "  [MAT.lacquer]: look({recipe: 'lacquer'}),\n"),
 ("[MAT.coral]: look({coat: 'none'}),", "[MAT.coral]: look({coat: 'none', recipe: 'coral'}),"),
 ("[MAT.bankGold]: look({ch: 15, coat: 'powder30', density: true, tier: 'dense'}),", "[MAT.bankGold]: look({ch: 15, coat: 'powder30', density: true, tier: 'dense', recipe: 'bank'}),"),
 ("[MAT.bankSilver]: look({ch: 15, coat: 'powder30', density: true, tone: 'silver', tier: 'dense'}),", "[MAT.bankSilver]: look({ch: 15, coat: 'powder30', density: true, tone: 'silver', tier: 'dense', recipe: 'bank'}),"),
 ("flakeD: .3, flakeCell: 5.2, tier: 'dense'}),\n  [MAT.sandSilver]", "flakeD: .3, flakeCell: 5.2, tier: 'dense', recipe: 'suhama'}),\n  [MAT.sandSilver]"),
 ("[MAT.sandSilver]: look({ch: 0, coat: 'powder35', density: true, tone: 'silver', tier: 'dense'}),", "[MAT.sandSilver]: look({ch: 0, coat: 'powder35', density: true, tone: 'silver', tier: 'dense', recipe: 'suhama'}),"),
 ("flakeD: .3, flakeCell: 5.2, tier: 'dense'}),\n  [MAT.toyamaBlue]", "flakeD: .3, flakeCell: 5.2, tier: 'dense', recipe: 'toyama'}),\n  [MAT.toyamaBlue]"),
 ("[MAT.toyamaBlue]: look({ch: 5, chRidge: true, coat: 'powder30', density: true, tone: 'blue', tier: 'dense'}),", "[MAT.toyamaBlue]: look({ch: 5, chRidge: true, coat: 'powder30', density: true, tone: 'blue', tier: 'dense', recipe: 'toyama'}),"),
]
for a, b in rows: s = swap(s, a, b)
save(P, s, crlf)

# ------------------------------------------------------------------------------------------------ three-pack.js
P = 'src/studies/toji/plate/three-pack.js'
s, crlf = load(P)
s = swap(s, "import {MAT_LOOK, COAT_KIND, TONE, TIER} from './mat.js';", "import {MAT_LOOK, COAT_KIND, TONE, TIER, RECIPE} from './mat.js';")
s = swap(s, "  glslKinds('COAT', COAT_KIND), glslKinds('TONE', TONE), glslKinds('TIER', TIER),\n",
            "  glslKinds('COAT', COAT_KIND), glslKinds('TONE', TONE), glslKinds('TIER', TIER), glslKinds('RECIPE', RECIPE),\n")
s = swap(s, "  lookColumn('int', {name: 'TIER', of: row => TIER[row.tier]}),\n",
            "  lookColumn('int', {name: 'TIER', of: row => TIER[row.tier]}),\n"
            "  lookColumn('bool', {name: 'CLOUD', of: row => String(row.cloud)}),\n"
            "  lookColumn('int', {name: 'RECIPE', of: row => RECIPE[row.recipe]}),\n")
# the recipe and the metal, read once, before the per-material branches
s = swap(s, "  if(T_DENSITY[mi]){float bk=",
            "  // rc: the material's recipe; gold: its metal. The branches below never ask which material it is. (They stay in this body, base first\n"
            "  // and finish after the shared powder: moved into functions, the shader took most of a minute to compile in Chrome on Windows.)\n"
            "  int rc=T_RECIPE[mi];bool gold=T_TONE[mi]==TONE_GOLD;\n"
            "  if(T_DENSITY[mi]){float bk=")
pairs = [
 ("  else if(mat==2||mat==3){\n    float cloud=mat==3?", "  else if(rc==RECIPE_HILL){\n    float cloud=T_CLOUD[mi]?"),
 ("  else if(mat==4){wN=1.;", "  else if(rc==RECIPE_GYOBU){wN=1.;"),
 ("  else if(mat==5){wM=1.;", "  else if(rc==RECIPE_GOLD){wM=1.;"),
 ("  else if(mat==6){wN=1.;dens=.95;}", "  else if(rc==RECIPE_HIRAME){wN=1.;dens=.95;}"),
 ("  else if(mat==7){wM=inlay;", "  else if(rc==RECIPE_FOIL&&gold){wM=inlay;"),
 ("  else if(mat==8){wM=inlay;", "  else if(rc==RECIPE_FOIL){wM=inlay;"),
 ("  else if(mat==9){wN=1.;}", "  else if(rc==RECIPE_AOGAI){wN=1.;}"),
 ("  else if(mat==10){wS=inlay;", "  else if(rc==RECIPE_SHEET&&gold){wS=inlay;"),
 ("  else if(mat==11){wS=inlay;", "  else if(rc==RECIPE_SHEET){wS=inlay;"),
 ("  else if(mat==13){wS=.82;", "  else if(rc==RECIPE_KASUMI){wS=.82;"),
 ("  else if(mat>=19&&mat<=22){wN=1.;}\n", ""),            # never reached: the density branch above takes these
 ("  else if(mat==23||mat==24){wN=1.;}\n", ""),           # never reached
 ("  else if(mat==17){wN=1.-inlay;", "  else if(rc==RECIPE_CORAL){wN=1.-inlay;"),
 ("  else if(mat==14)c=M_LACQ*", "  else if(rc==RECIPE_LACQUER)c=M_LACQ*"),
 ("  if(mat>=19&&mat<=22){\n", "  if(rc==RECIPE_BANK||rc==RECIPE_SUHAMA){\n"),
 ("    if(mat<=20){\n", "    if(rc==RECIPE_BANK){\n"),
 ("      if(mat==19){\n", "      if(gold){\n"),
 ("(mat==19?1.:.6)", "(gold?1.:.6)"),
 ("      if(mat==19)c*=", "      if(gold)c*="),
 ("      if(mat==21){\n", "      if(gold){\n"),
 ("  if(mat==23||mat==24){\n", "  if(rc==RECIPE_TOYAMA){\n"),
 ("    vec3 pw=mat==23?", "    vec3 pw=gold?"),
 ("    if(mat==24){pwd=", "    if(!gold){pwd="),
 ("    if(mat==23)pwd=", "    if(gold)pwd="),
 ("+(mat==24?mMetal(", "+(!gold?mMetal("),
 ("  if(mat==6){\n", "  if(rc==RECIPE_HIRAME){\n"),
 ("  if(mat==9){\n", "  if(rc==RECIPE_AOGAI){\n"),
 ("  if(mat==12){\n", "  if(rc==RECIPE_RYUSUI){\n"),
]
for a, b in pairs: s = swap(s, a, b)
save(P, s, crlf)

# ------------------------------------------------------------------------------------------------ the tests
P = 'scripts/plate.test.mjs'
s, crlf = load(P)
s = swap(s, "    tier: m => m === 1 ? 'ground' : (m === 2 || m === 3 || m === 4 || m === 12 || (m >= 19 && m <= 24)) ? 'dense' : 'pattern',\n",
            "    tier: m => m === 1 ? 'ground' : (m === 2 || m === 3 || m === 4 || m === 12 || (m >= 19 && m <= 24)) ? 'dense' : 'pattern',\n"
            "    cloud: m => m === 3,\n"
            "    recipe: m => ({1: 'ground', 2: 'hill', 3: 'hill', 4: 'gyobu', 5: 'gold', 6: 'hirame', 7: 'foil', 8: 'foil', 9: 'aogai', 10: 'sheet', 11: 'sheet', 12: 'ryusui',\n"
            "      13: 'kasumi', 14: 'lacquer', 17: 'coral', 19: 'bank', 20: 'bank', 21: 'suhama', 22: 'suhama', 23: 'toyama', 24: 'toyama'})[m] ?? 'lamp',\n"
            "    recipeIsGold: m => m === 7 || m === 10 || m === 19 || m === 21 || m === 23,\n")
s = swap(s, "    for (const key of ['ch', 'chRidge', 'lh', 'coat', 'density', 'foil', 'hill', 'tier']) assert.equal(row[key], was[key](m), `material ${m}: ${key}`);\n",
            "    for (const key of ['ch', 'chRidge', 'lh', 'coat', 'density', 'foil', 'hill', 'tier', 'cloud', 'recipe']) assert.equal(row[key], was[key](m), `material ${m}: ${key}`);\n"
            "    if (['foil', 'sheet', 'bank', 'suhama', 'toyama'].includes(row.recipe)) assert.equal(row.tone === 'gold', was.recipeIsGold(m), `material ${m}: the recipe's metal`);\n")
s = swap(s, "  const {MAT_LOOK_GLSL, MAKIE_GROUND_FRAG_GLSL, MATERIALS} = await import('../src/studies/toji/plate/three-pack.js');\n",
            "  const {MAT_LOOK_GLSL, MAKIE_GROUND_FRAG_GLSL, MAKIE_GROUND_PARS_GLSL, MATERIALS} = await import('../src/studies/toji/plate/three-pack.js');\n"
            "  // The ground shader never compares a material id with a number: it reads the material's row once (its recipe, its metal).\n"
            "  const ground = MAKIE_GROUND_PARS_GLSL + MAKIE_GROUND_FRAG_GLSL;\n"
            "  assert.deepEqual(ground.match(/\\bmat\\s*(==|!=|>=|<=|<|>)\\s*[0-9]+/g) ?? [], [], 'no material id is compared with a number');\n"
            "  assert.equal((ground.match(/T_RECIPE\\[mi\\]/g) ?? []).length, 1, 'the recipe is read in one place');\n"
            "  assert.ok(!/\\brc\\s*(==|!=)\\s*[0-9]/.test(ground), 'a recipe is compared with its named constant');\n")
save(P, s, crlf)
print('ok')
