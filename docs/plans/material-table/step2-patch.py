# ALREADY APPLIED in commit d99774d (2026-11-18). Kept as the record of how the change was made; do not run it again.
# Step 2 of docs/plans/2026-11-18-material-table.md: the per-material code of the ground shader becomes recipe functions with one
# dispatch. Run from the repo root, after step1-patch.py:  python docs/plans/material-table/step2-patch.py
# The recipe bodies are cut out of the existing shader text by this script, not retyped: inside the functions the struct's fields are
# #defined back to the names the main body used, so the cut text compiles unchanged.
import io, re, sys

def load(p):
    raw = io.open(p, 'r', encoding='utf-8', newline='').read()
    return raw.replace('\r\n', '\n'), '\r\n' in raw
def save(p, s, crlf):
    io.open(p, 'w', encoding='utf-8', newline='').write(s.replace('\n', '\r\n') if crlf else s)
def once(s, a):
    if s.count(a) != 1: sys.exit('count %d for: %s' % (s.count(a), a[:90]))
    return s.index(a)
def swap(s, a, b):
    once(s, a); return s.replace(a, b)
def between(s, start, end):
    """The text after `start` up to (not including) `end`; both must be unique from start on."""
    i = once(s, start) + len(start); j = s.index(end, i)
    return s[i:j]

# ------------------------------------------------------------------------------------------------ mat.js
P = 'src/studies/toji/plate/mat.js'
s, crlf = load(P)
i = once(s, " *   tier       which tone layer it belongs to")
j = s.index("});\n", once(s, "export const MAT_LOOK = Object.freeze({")) + 4
s = s[:i] + ''' *   tier       which tone layer it belongs to (TIER): the plain ground is the darkest, dense-nashiji faces the middle, the rest the pattern.
 *   coatHi     for coat 'powder': the powder thickness (fine.g) at which the lacquer over it has thinned to a film.
 *   flakeSq    the larger flakes are square (cut foil) rather than irregular: 1 or 0.
 *   cloud      hill ground whose metal lies in cloudy patches (mura nashiji).
 *   recipe     how it is painted (RECIPE): the one function of the ground shader that draws it. Gold and silver of one technique
 *              share a recipe and differ by `tone`.
 */
export const COAT_KIND = {top: 0, sunk: 1, half: 2, foot: 3, powder: 4, waterEdge: 5, inlayEdge: 6, none: 7};
export const TONE = {gold: 0, silver: 1, blue: 2};
export const TIER = {pattern: 0, ground: 1, dense: 2};
export const RECIPE = {lamp: 0, ground: 1, hill: 2, gyobu: 3, gold: 4, hirame: 5, foil: 6, aogai: 7, sheet: 8, ryusui: 9, kasumi: 10, lacquer: 11,
  coral: 12, bank: 13, suhama: 14, toyama: 15};
const LOOK_DEFAULT = {ch: 2.4, chRidge: false, lh: .7, coat: 'top', coatHi: 0, density: false, flakeD: 0, flakeCell: 0, flakeSq: 0, foil: false,
  tone: 'gold', hill: false, cloud: false, tier: 'pattern', recipe: 'lamp'};
const look = (over = {}) => Object.freeze({...LOOK_DEFAULT, ...over});
const HILL = {coat: 'foot', hill: true, tier: 'dense'}, FOIL = {coat: 'inlayEdge', foil: true, flakeD: .4, flakeCell: 7, flakeSq: 1, recipe: 'foil'};
export const MAT_LOOK = Object.freeze({
  0: look(), // a material this table does not list: painted as the lamp's glow, as before
  [MAT.ground]: look({coat: 'sunk', density: true, tier: 'ground', recipe: 'ground'}),
  [MAT.nashijiLight]: look({...HILL, recipe: 'hill'}),
  [MAT.mura]: look({...HILL, cloud: true, recipe: 'hill'}),
  [MAT.gyobu]: look({...HILL, recipe: 'gyobu'}),
  [MAT.gold]: look({coat: 'inlayEdge', recipe: 'gold'}),
  [MAT.silver]: look({coat: 'half', tone: 'silver', recipe: 'hirame'}),
  [MAT.kirikane]: look(FOIL),
  [MAT.kirigin]: look({...FOIL, tone: 'silver'}),
  [MAT.aogai]: look({coat: 'none', recipe: 'aogai'}),
  [MAT.hyomonGold]: look({coat: 'inlayEdge', recipe: 'sheet'}),
  [MAT.hyomonSilver]: look({coat: 'inlayEdge', tone: 'silver', recipe: 'sheet'}),
  [MAT.water]: look({ch: 0, coat: 'waterEdge', density: true, tier: 'dense', recipe: 'ryusui'}),
  [MAT.kasumi]: look({recipe: 'kasumi'}),
  [MAT.lacquer]: look({recipe: 'lacquer'}),
  [MAT.lamp]: look(),
  [MAT.muraSilver]: look({tone: 'silver'}),
  [MAT.coral]: look({coat: 'none', recipe: 'coral'}),
  [MAT.roofPowder]: look(),
  [MAT.bankGold]: look({ch: 15, coat: 'powder', coatHi: .3, density: true, tier: 'dense', recipe: 'bank'}),
  [MAT.bankSilver]: look({ch: 15, coat: 'powder', coatHi: .3, density: true, tone: 'silver', tier: 'dense', recipe: 'bank'}),
  [MAT.sandGold]: look({ch: 0, lh: .15, coat: 'powder', coatHi: .35, density: true, flakeD: .3, flakeCell: 5.2, tier: 'dense', recipe: 'suhama'}),
  [MAT.sandSilver]: look({ch: 0, coat: 'powder', coatHi: .35, density: true, tone: 'silver', tier: 'dense', recipe: 'suhama'}),
  [MAT.toyamaGold]: look({ch: 5, chRidge: true, coat: 'powder', coatHi: .3, density: true, flakeD: .3, flakeCell: 5.2, tier: 'dense', recipe: 'toyama'}),
  [MAT.toyamaBlue]: look({ch: 5, chRidge: true, coat: 'powder', coatHi: .3, density: true, tone: 'blue', tier: 'dense', recipe: 'toyama'}),
  [MAT.rockGold]: look(),
  [MAT.rockSilver]: look({tone: 'silver'}),
  [MAT.rockOlive]: look({tone: 'blue'}),
  [MAT.rockLine]: look(),
});
''' + s[j:]
save(P, s, crlf)

# ------------------------------------------------------------------------------------------------ three-pack.js
P = 'src/studies/toji/plate/three-pack.js'
s, crlf = load(P)
s = swap(s, "import {MAT_LOOK, COAT_KIND, TONE, TIER} from './mat.js';", "import {MAT_LOOK, COAT_KIND, TONE, TIER, RECIPE} from './mat.js';")
s = swap(s, "  glslKinds('COAT', COAT_KIND), glslKinds('TONE', TONE), glslKinds('TIER', TIER),\n",
            "  glslKinds('COAT', COAT_KIND), glslKinds('TONE', TONE), glslKinds('TIER', TIER), glslKinds('RECIPE', RECIPE),\n")
s = swap(s, "  lookColumn('int', {name: 'TIER', of: row => TIER[row.tier]}),\n",
            "  lookColumn('int', {name: 'TIER', of: row => TIER[row.tier]}),\n"
            "  lookColumn('float', {name: 'COAT_HI', of: row => glslFloat(row.coatHi)}),\n"
            "  lookColumn('float', {name: 'FLAKE_SQ', of: row => glslFloat(row.flakeSq)}),\n"
            "  lookColumn('bool', {name: 'CLOUD', of: row => String(row.cloud)}),\n"
            "  lookColumn('int', {name: 'RECIPE', of: row => RECIPE[row.recipe]}),\n")
s = swap(s, "    else if(ck==COAT_POWDER30){mKS=1.-smoothstep(.0,.3,fine.g);mKT=1.-mKS;}\n"
            "    else if(ck==COAT_POWDER35){mKS=1.-smoothstep(.0,.35,fine.g);mKT=1.-mKS;}\n",
            "    else if(ck==COAT_POWDER){mKS=1.-smoothstep(.0,T_COAT_HI[mi],fine.g);mKT=1.-mKS;}\n")

# the region of the main body that is per-material: from the density prelude to just before the dev views
START, END = "  if(T_DENSITY[mi]){float bk=", "  if(uDensView>4.5)c=T_TIER[mi]"
a, b = once(s, START), once(s, END)
r = s[a:b]
density = r[:r.index("\n") + 1]                                    # the one-line density prelude
def branch(cond):                                                  # the body of a one-line `else if(cond){body}` of the chain
    line = between(r, "  else if(%s){" % cond, "\n")
    line = line.split(" //")[0].rstrip()
    assert line.endswith("}"), line[-40:]
    return line[:-1]
hill_base = between(r, "  else if(mat==2||mat==3){\n", "  }\n  else if(mat==4){")
hill_base = swap(hill_base, "mat==3?", "T_CLOUD[mi]?")
gyobu_base, gold_base, hirame_base = branch("mat==4"), branch("mat==5"), branch("mat==6")
foil_gold, foil_silver, aogai_base = branch("mat==7"), branch("mat==8"), branch("mat==9")
sheet_gold, sheet_silver, kasumi_base, coral_base = branch("mat==10"), branch("mat==11"), branch("mat==13"), branch("mat==17")
lacquer_base = between(r, "  else if(mat==14)", "\n")
lamp_base = between(r, "  else c=mix(vec3(.10,.06,.025)", "\n"); lamp_base = "c=mix(vec3(.10,.06,.025)" + lamp_base
for dead in ("  else if(mat>=19&&mat<=22){wN=1.;}\n", "  else if(mat==23||mat==24){wN=1.;}\n"): once(r, dead)   # the two unreachable branches: dropped
flakes = "bigD=.4;bigCell=7.;bigSq=1.;"
assert flakes in foil_gold and flakes in foil_silver
foil_gold, foil_silver = foil_gold.replace(flakes, ""), foil_silver.replace(flakes, "")   # now in the table (flakeD, flakeCell, flakeSq)

lay = "  c+=wN*mNashiji(kp,dens,tint)" + between(r, "  c+=wN*mNashiji(kp,dens,tint)", "  if(mat>=19&&mat<=22){\n")
lay = swap(lay, "  if(T_FLAKE_D[mi]>0.){bigD=T_FLAKE_D[mi];bigCell=T_FLAKE_CELL[mi];}\n", "  if(T_FLAKE_D[mi]>0.){bigD=T_FLAKE_D[mi];bigCell=T_FLAKE_CELL[mi];bigSq=T_FLAKE_SQ[mi];}\n")
lay = swap(lay, "  vec3 bigG;float bigX=mFlake(", "  bigX=mFlake(")

doha = between(r, "  if(mat>=19&&mat<=22){\n", "  if(mat==23||mat==24){\n")
kiri_decl = between(doha, "    // Doha. kiri:", "    if(mat<=20){\n"); kiri_decl = "    // Doha. kiri:" + kiri_decl
bank = between(doha, "    if(mat<=20){\n", "    }else{\n      // A suhama tongue")
assert bank.count("mat==19") == 3
bank = bank.replace("if(mat==19){", "if(gold){").replace("(mat==19?1.:.6)", "(gold?1.:.6)").replace("if(mat==19)c*=", "if(gold)c*=")
suhama = "      // A suhama tongue" + between(doha, "      // A suhama tongue", "    }\n    c=mix(c,mKiriColor(mix(M_GOLD,M_PALE,.8))")
suhama = swap(suhama, "      if(mat==21){\n", "      if(gold){\n")
kiri_tail = "    c=mix(c,mKiriColor(mix(M_GOLD,M_PALE,.8))" + between(doha, "    c=mix(c,mKiriColor(mix(M_GOLD,M_PALE,.8))", "  }\n")

toyama = between(r, "  if(mat==23||mat==24){\n", "  }\n  if(kAmt>0.){\n")
assert toyama.count("mat==23") == 2 and toyama.count("mat==24") == 2
toyama = toyama.replace("mat==23?", "gold?").replace("if(mat==23)", "if(gold)").replace("if(mat==24){", "if(!gold){").replace("(mat==24?", "(!gold?")
hill_over = "  if(kAmt>0.){\n" + between(r, "  if(kAmt>0.){\n", "  if(mat==6){\n")
hirame_over = between(r, "  if(mat==6){\n", "  }\n  if(mat==9){\n")
aogai_over = between(r, "  if(mat==9){\n", "  }\n  if(mat==12){\n")
water_over = between(r, "  if(mat==12){\n", "  }\n  if(uAge>0.&&T_HILL[mi]){\n")
wear = between(r, "  if(uAge>0.&&T_HILL[mi]){\n", "  }\n")
for text in (hill_base, lay, bank, suhama, toyama, hill_over, hirame_over, aogai_over, water_over, wear, kiri_decl, kiri_tail):
    assert not re.search(r"\bmat\s*(==|!=|<|>)", text), text[:200]   # (the word "mat" itself appears in a comment)

FIELDS = [("vec2", ["kp", "gs"]), ("vec4", ["fine"]), ("int", ["id"]), ("float", ["hs", "rise", "glow", "inlay", "line", "w", "ring"]),
          ("vec3", ["L", "c", "tint", "f0", "bigG"]), ("float", ["dens", "kAmt", "wN", "wM", "wS", "bigD", "bigCell", "bigSq", "bigX", "kiriV", "kiriB"])]
names = [n for _, group in FIELDS for n in group]
struct = "struct MG{" + "".join("%s %s;" % (t, ",".join(g)) for t, g in FIELDS) + "};"
defines = "\n".join("#define %s S.%s" % (n, n) for n in names)
undefs = "\n".join("#undef %s" % n for n in names)

recipes = f'''
// ---- The recipes: how each material is painted on the lid. MAT_LOOK (mat.js) names a material's recipe; mRecipe is the one place that
// chooses among them. A recipe never asks which material it is drawing: what differs between two materials of one recipe is a column of
// the table (its tone, its flakes). MG is one lid pixel's working state; inside the recipes its fields go by their plain names.
{struct}
{defines}
/** What every recipe lays down once its own base is set: the nashiji, metal and sheet in the shares it asked for, then the larger flakes. */
void mLay(inout MG S,int mi){{
{lay}}}
/** A doha piece's string of cut gold squares (the B channel at full strength; a rim line is half that). */
void mDohaKiri(inout MG S){{
{kiri_decl}{kiri_tail}}}
/** Hill ground after its powder: halftone kirikane toward the light, then the wear at the crown. */
void mHillOver(inout MG S){{
{hill_over}  if(uAge>0.){{
{wear}  }}
}}
void mRecipeGround(inout MG S,int mi){{mLay(S,mi);}}
void mRecipeHill(inout MG S,int mi){{
{hill_base}  mLay(S,mi);mHillOver(S);
}}
void mRecipeGyobu(inout MG S,int mi){{{gyobu_base}mLay(S,mi);mHillOver(S);}}
void mRecipeGold(inout MG S,int mi){{{gold_base}mLay(S,mi);}}
void mRecipeHirame(inout MG S,int mi){{
  {hirame_base}mLay(S,mi);
{hirame_over}}}
void mRecipeFoil(inout MG S,int mi){{
  if(T_TONE[mi]==TONE_GOLD){{{foil_gold}}}
  else{{{foil_silver}}}
  mLay(S,mi);
}}
void mRecipeAogai(inout MG S,int mi){{
  {aogai_base}mLay(S,mi);
{aogai_over}}}
void mRecipeSheet(inout MG S,int mi){{
  if(T_TONE[mi]==TONE_GOLD){{{sheet_gold}}}
  else{{{sheet_silver}}}
  mLay(S,mi);
}}
void mRecipeRyusui(inout MG S,int mi){{
  mLay(S,mi);
{water_over}}}
void mRecipeKasumi(inout MG S,int mi){{{kasumi_base}mLay(S,mi);}}
void mRecipeLacquer(inout MG S,int mi){{{lacquer_base}mLay(S,mi);}}
void mRecipeCoral(inout MG S,int mi){{{coral_base}mLay(S,mi);}}
void mRecipeBank(inout MG S,int mi){{
  bool gold=T_TONE[mi]==TONE_GOLD;mLay(S,mi);
  {{
{bank}  }}
  mDohaKiri(S);
}}
void mRecipeSuhama(inout MG S,int mi){{
  bool gold=T_TONE[mi]==TONE_GOLD;mLay(S,mi);
  {{
{suhama}  }}
  mDohaKiri(S);
}}
void mRecipeToyama(inout MG S,int mi){{
  bool gold=T_TONE[mi]==TONE_GOLD;mLay(S,mi);
{toyama}}}
void mRecipeLamp(inout MG S,int mi){{{lamp_base}mLay(S,mi);}}
/** The one dispatch: a material's recipe, by the table. */
void mRecipe(inout MG S,int mi){{
  switch(T_RECIPE[mi]){{
    case RECIPE_GROUND:mRecipeGround(S,mi);break;
    case RECIPE_HILL:mRecipeHill(S,mi);break;
    case RECIPE_GYOBU:mRecipeGyobu(S,mi);break;
    case RECIPE_GOLD:mRecipeGold(S,mi);break;
    case RECIPE_HIRAME:mRecipeHirame(S,mi);break;
    case RECIPE_FOIL:mRecipeFoil(S,mi);break;
    case RECIPE_AOGAI:mRecipeAogai(S,mi);break;
    case RECIPE_SHEET:mRecipeSheet(S,mi);break;
    case RECIPE_RYUSUI:mRecipeRyusui(S,mi);break;
    case RECIPE_KASUMI:mRecipeKasumi(S,mi);break;
    case RECIPE_LACQUER:mRecipeLacquer(S,mi);break;
    case RECIPE_CORAL:mRecipeCoral(S,mi);break;
    case RECIPE_BANK:mRecipeBank(S,mi);break;
    case RECIPE_SUHAMA:mRecipeSuhama(S,mi);break;
    case RECIPE_TOYAMA:mRecipeToyama(S,mi);break;
    default:mRecipeLamp(S,mi);
  }}
}}
{undefs}
'''
new_main = (density +
  "  // The rest is the material's recipe (mRecipe, declared with the ground's functions): its own base, the shared powder, its own finish.\n"
  "  MG S;" + "".join("S.%s=%s;" % (n, n) for n in names if n not in ("bigG", "bigX")) + "S.bigG=vec3(0.);S.bigX=0.;\n"
  "  mRecipe(S,mi);\n"
  "  c=S.c;kiriV=S.kiriV;kiriB=S.kiriB;\n")
s = s[:a] + new_main + s[b:]
# the recipes go after the common functions, in the ground's declarations
anchor = "varying vec3 vKyotoWorld, vKyotoNormal, vKyotoTanX, vKyotoTanZ;\n${MAKIE_COMMON_GLSL}`;\n\n/** Fragment body replacing outgoingLight"
s = swap(s, anchor, "varying vec3 vKyotoWorld, vKyotoNormal, vKyotoTanX, vKyotoTanZ;\n${MAKIE_COMMON_GLSL}\n${MAKIE_GROUND_RECIPES_GLSL}`;\n\n/** Fragment body replacing outgoingLight")
anchor = "/** Fragment declarations injected into groundMaterial (MeshPhysicalMaterial). */\n"
s = swap(s, anchor, "const MAKIE_GROUND_RECIPES_GLSL = `" + recipes.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${") + "`;\n\n" + anchor)
save(P, s, crlf)

# ------------------------------------------------------------------------------------------------ the tests
P = 'scripts/plate.test.mjs'
s, crlf = load(P)
s = swap(s, "(m === 19 || m === 20 || m === 23 || m === 24) ? 'powder30'\n      : (m === 21 || m === 22) ? 'powder35' :",
            "(m === 19 || m === 20 || m === 23 || m === 24) ? 'powder.3'\n      : (m === 21 || m === 22) ? 'powder.35' :")
s = swap(s, "    flake: m => (m === 21 || m === 23) ? [.3, 5.2] : null,\n",
            "    flake: m => (m === 21 || m === 23) ? [.3, 5.2, 0] : (m === 7 || m === 8) ? [.4, 7, 1] : null,\n"
            "    cloud: m => m === 3,\n"
            "    recipe: m => ({1: 'ground', 2: 'hill', 3: 'hill', 4: 'gyobu', 5: 'gold', 6: 'hirame', 7: 'foil', 8: 'foil', 9: 'aogai', 10: 'sheet', 11: 'sheet', 12: 'ryusui',\n"
            "      13: 'kasumi', 14: 'lacquer', 17: 'coral', 19: 'bank', 20: 'bank', 21: 'suhama', 22: 'suhama', 23: 'toyama', 24: 'toyama'})[m] ?? 'lamp',\n"
            "    recipeIsGold: m => m === 7 || m === 10 || m === 19 || m === 21 || m === 23,\n")
s = swap(s, "    for (const key of ['ch', 'chRidge', 'lh', 'coat', 'density', 'foil', 'hill', 'tier']) assert.equal(row[key], was[key](m), `material ${m}: ${key}`);\n"
            "    assert.deepEqual(row.flakeD > 0 ? [row.flakeD, row.flakeCell] : null, was.flake(m), `material ${m}: large flakes`);\n",
            "    for (const key of ['ch', 'chRidge', 'lh', 'density', 'foil', 'hill', 'tier', 'cloud', 'recipe']) assert.equal(row[key], was[key](m), `material ${m}: ${key}`);\n"
            "    assert.equal(row.coat === 'powder' ? `powder${String(row.coatHi).replace(/^0/, '')}` : row.coat, was.coat(m), `material ${m}: coat`);\n"
            "    assert.deepEqual(row.flakeD > 0 ? [row.flakeD, row.flakeCell, row.flakeSq] : null, was.flake(m), `material ${m}: large flakes`);\n"
            "    if (['foil', 'sheet', 'bank', 'suhama', 'toyama'].includes(row.recipe)) assert.equal(row.tone === 'gold', was.recipeIsGold(m), `material ${m}: the recipe's metal`);\n")
s = swap(s, "  const {MAT_LOOK_GLSL, MAKIE_GROUND_FRAG_GLSL, MATERIALS} = await import('../src/studies/toji/plate/three-pack.js');\n",
            "  const {MAT_LOOK_GLSL, MAKIE_GROUND_FRAG_GLSL, MAKIE_GROUND_PARS_GLSL, MATERIALS} = await import('../src/studies/toji/plate/three-pack.js');\n"
            "  // The ground shader never compares a material id with a number, and chooses a recipe in one place.\n"
            "  const ground = MAKIE_GROUND_PARS_GLSL + MAKIE_GROUND_FRAG_GLSL;\n"
            "  assert.deepEqual(ground.match(/\\bmat\\s*(==|!=|>=|<=|<|>)\\s*[0-9]+/g) ?? [], [], 'no material id is compared with a number');\n"
            "  assert.equal((ground.match(/T_RECIPE\\[mi\\]/g) ?? []).length, 1, 'one dispatch on the recipe');\n")
save(P, s, crlf)
print('ok')
