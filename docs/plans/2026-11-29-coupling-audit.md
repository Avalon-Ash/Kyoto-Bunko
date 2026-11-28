# 2026-11-29 耦合與魔術數字體檢（解耦提案書，給使用者決定）

- 範圍：`main` 的 `f8acaec`（工作樹 `C:\Git\_wt_kyoto_audit`，detached）。只讀，沒有改任何程式、測試或 ADR。
- 依據：`AGENTS.md` §2「不做耦合」、ADR 0016、0017、0027、0028，以及使用者的偏好（ECS＋SSOT：資料與行為分開、行為讀資料；兩個必須一起動的常數合成一個或寫成導出值；測試假資料從正本取）。
- 先前提過的不重報：`ROOM.direct` 與蓋面光色（room 開案書 Q2）、健檢開案書 W7–W11、第二條鏈 K1–K18、材質表提案 §4 的 `toFixed` 注意事項。這些放在 §5。
- `npm test` 和 `npm run lint` 沒跑：這個工作樹沒有 `node_modules`，照派工單不安裝。本書每一條的證據都是 `rg`、`sed`、`git log` 的輸出。
- 「常改」的依據是 `git log --oneline -- <檔>` 的總次數／11-20 之後的次數：`three-pack.js` 66／8、`three-renderer.js` 61／18、`study.js` 33／12、`vocab.js` 36／6、`bake.js` 19／5、`export-glb.js` 10／2、`plate-doha-similar.mjs` 8／3、`plate-fallback-shots.mjs` 5／3、`bunko-ui.css` 9／2、`box.js` 2／0、`view.js` 1／0、`batch-render.ts` 1／0。

## 1. 摘要表（依「最容易出錯 × 最常被改」排序）

驗證工具的縮寫：
- **字串**：在 node 裡把改前、改後產生的著色器字串逐字比對。逐字相同就不會重新編譯，降級圖也不必重拍。
- **plate-diff**：固定時鐘加 `scripts/plate-diff.mjs`，同一次開機、同一個 dev server，十一區日夜皆 0 差異（ADR 0017 的不變證明）。
- **parts-hash**：`scripts/plate-parts-hash.mjs --check`。
- **lid-diff**：`scripts/plate-room-stats.mjs` 的 `lid-diff`（ADR 0028）。

每一條都是一個獨立的 commit。回退一律 `git revert <該 commit>`。沒寫的部分不會動到正本表以外的資料。

| # | 概念 | 出現位置（檔:行） | 風險（改一處漏另一處） | 建議的單一來源 | ADR | 大小 | 證明不變 | 回退 |
|---|---|---|---|---|---|---|---|---|
| 1 | **蓋面的尺寸與高度場**：畫面半寬 360×230、軟隆起高 17、邊緣淡出 44／6；蓋頂的穹（高 3.2、半寬 370×240） | 畫面 360×230：`vocab.js:19`（`PLATE`，JS 烘焙全部讀它）、`three-pack.js:204`（`K_HALF`）、`three-pack.js:622`（`M_HALF`）、`export-glb.js:14`（`HALF`）。隆起 17：`three-pack.js:205`（`K_SWELL`）、`:624`（`M_SWELL`）、`export-glb.js:14`（`SWELL`）。淡出 44／6：`three-pack.js:212`、`export-glb.js:35`。穹的式子：`box.js:15`、`:18-19`、`three-pack.js:199`（`DOME_GLSL`，沒有人 import，是死碼）、`:211`、`export-glb.js:34`。盒緣 370×240 另見 `interaction.js:15`、`box.js:37` | 改 `PLATE` 時，JS 用新尺寸烘焙 `uSoft0`、`uIdent0`、`uFine0`，著色器卻用舊的 360×230 取樣，整面圖錯位，部件對不到自己的地。改 `K_SWELL` 卻漏改 `export-glb`，參考圖與 clip 探測量到的高度就和畫面不同。改穹高只改 `box.js`，蓋頂網格與 `groundY` 會差 3.2 單位，部件浮起或陷進去 | 新增無 import 的 `plate/lid.js`：`LID = {picture: {halfW, halfH}, swell, edgeFade: [44, 6], dome: {height, halfW, halfH}}`，`PLATE` 改由它導出。GLSL 照 `ROOM_GLSL` 的做法由 `LID_GLSL` 注入具名常數。`box.js` 與 `export-glb.js` 讀同一張表。刪 `DOME_GLSL`。**畫面（360×230）和蓋頂（370×240）照 11/24 的判斷仍是兩個量**，兩者的關係（盒緣比畫面各寬 10）在表裡寫成欄位 | 新開一份 ADR（蓋的幾何只定義一處），比照 0028 | M | 字串（`LID_GLSL` 照原樣印出 `vec2(360.,230.)`，可以逐字相同）、parts-hash、plate-diff。另加一條比照 `room.test.mjs` 的圍欄：`three-pack.js`、`export-glb.js`、`box.js` 不再出現 `360.,230.`、`/370.`、`3.2*(` | revert |
| 2 | **CPU 鏡像 `poseKit`** 與部件、樹的頂點運動 GLSL | GLSL：`three-pack.js:286-305`（`kyotoMotion`：站起 `smoothstep(.1,.7)`、`eps=1.5`、離地 `.35`）、`:482-483`（樹：離地 `.6`）、`:1262`（霞：`.35`）。JS 鏡像：`export-glb.js:30-36`（`groundY`）、`:41-56`（`partVertex`，`.35`、`smooth(.1, .7)`、`eps = 1.5`）、`:58-66`（`treeVertex`，`.6`）。使用者：`clip-probe.js`、`scripts/plate-clip.mjs`、`?export=glb` | 調部件離地高度或站起曲線時，只改 GLSL 的話，`plate-clip` 的穿模量測和 glb 參考圖還照舊姿勢算，量測會不出聲地失準。沒有任何測試把鏡像和 GLSL 綁在一起（`rg "poseKit" scripts/*.test.mjs` 沒有結果） | 把運動用的數字（離地 `.35`／`.6`、站起區間 `.1–.7`、差分步長 `1.5`）放進 #1 的 `lid.js`（或同層的 `motion` 欄），GLSL 注入、`poseKit` 讀表。式子本身還是寫兩份（GLSL 與 JS 無法共用），但數字只寫一處；另加測試，檢查 `PART_MOTION_GLSL` 的字串含注入的常數名、不含字面值 | 同 #1 的新 ADR | M | 字串、plate-diff、`plate-clip` 改前改後同一份報告（相同狀態下最大穿模量相同） | revert |
| 3 | **開蓋位移與傾斜樞紐**（抬高 360、後移 650、樞紐 y −48） | `three-pack.js:304-305`、`:484-485`、`:523-524`、`:538-539`、`:552-553`、`:1263-1264`（六份 GLSL，同一兩行），JS 端 `three-renderer.js:1083-1084`（盒繩的固定點 `+ 48`、`- 48`） | 要調開蓋的距離或樞紐高度時，六份漏改一份，那一類網格（部件、樹、盒、蓋頂、陰影深度、霞）開蓋時就和其他的分家：陰影對不到物件，或霞留在原地。漏改 JS 的 ±48，盒繩的固定點就不跟著盒傾斜 | 數字放進 #1 的 `lid.js`（`open: {lift, slide}`、`pivotY`）。GLSL 抽成一個 `kyotoLidPose(p, isLid)` 函式放在共用片段裡，六處都呼叫它；JS 盒繩讀 `pivotY` | 同 #1 | S–M | 字串會變（函式化），所以要換成 plate-diff（含開蓋中途 `opening=.5` 一格）＋ `lid-diff`。訪客會冷編譯一次（同 room 開案書 Q1） | revert |
| 4 | **光跡的點數 20** | `feel.js:58`（`trailMaxPoints: 20`）、`three-renderer.js:183`（`Array.from({length: 20})`）、`:1109`（`for (i < 20)`）、`three-pack.js:620`（`uniform vec3 uTrails[20]`）、`:966`（`for(int i=0;i<20;i++)`） | 把 `FEEL.trailMaxPoints` 調大，多出的點不會報錯，只是 renderer 不送、著色器不畫，光跡會不出聲地變短。調小雖然安全，但 GLSL 迴圈照跑 20 次 | `FEEL.trailMaxPoints` 是正本；`three-renderer.js` 讀它，GLSL 用注入的 `const int TRAIL_N` | 不需新 ADR（0028 的注入做法） | S | 字串（注入 `20` 可以逐字相同）、plate-diff（`?clock` 固定時光跡全 0，再加一格有光跡的手動截圖） | revert |
| 5 | **銀的氧化色、作舊的硫化色、地的作舊色**：同一個顏色在兩段著色器各寫一份 | `vec3(.66,.66,.64)`：`three-pack.js:386`（`K_M_OXID`，註解自己寫「matches M_OXID」）、`:623`（`M_OXID`）。`vec3(.46,.42,.36)`：`:392`（`K_TARNISH`）、`:645`（`M_TARNISH`）。`vec3(.43,.29,.14)`：`:393`（`K_ROCK_FOOT`）、`three-renderer.js:288`（字面值，粉岩的腳） | 美術輪調蓋面的銀（`M_OXID`、`M_TARNISH`）是常做的事（定調類）。漏改部件那份，盒上平嵌的銀和立起來的銀就會變成兩種顏色。`K_ROCK_FOOT` 是「作舊後地的顏色」的手抄估計值，地的作舊配方一改它就過時，岩腳會出現一圈不同的色 | 這些是「金屬依 `TONE` 的作舊色」，放進 `mat.js` 的一張小表（例：`TONE_AGE = {silver: {oxid, tarnish}}`、`GROUND_AGED`），兩段 GLSL 都注入。三份 `ROCK_FOOT` 合成一份 | 新 ADR，或併入 #1 的那份（0017 不改原文） | S | 字串（注入同值可以逐字相同）、plate-diff（作舊預設 .85 與 `?age=0` 各一輪） | revert |
| 6 | **透漆的邊緣環**：寬度式寫兩份；`COAT`／`DENSITY` 注入時用 `toFixed` | 邊緣環的式子：`three-pack.js:990`（地）、`:1301`（霞），都是 `(${COAT.edgeWidth[0].toFixed(2)}+…*uAge)*(.75+.5*mVnoise(…*.9+3.))`。`toFixed`：`:593`（`v3`）、`:599`、`:931`、`:990`、`:1301` | 調邊緣環的不勻（`.75+.5*`、`.9`、`+3.`）只改地那份，霞的邊和地的邊就不一樣寬。`toFixed(2)`／`(3)` 在值多一位小數時會不出聲地截掉；目前的值剛好都不超過位數（材質表提案 §4 已記，沒修） | 邊緣環寫成一個 GLSL 函式 `mCoatEdgeWidth(vec2 p)`，兩處呼叫；注入全部改用既有的 `glslFloat`（`three-pack.js:310`，不經 `toFixed`），並加 `Number(literal) === v` 的測試 | 0017 已有規則（「精確數值，不經 toFixed」），不需新 ADR | S | 字串會變（`toFixed(2)` 印 `0.60`，`String` 印 `0.6`），所以要換成 plate-diff，再加一條測試檢查每個注入值 `Number(literal) === v`；訪客冷編譯一次 | revert |
| 7 | **貼金木紋**：`grainUv` 比材質編號，不讀 `grain` 欄；uv 的哨兵值 1000／500 寫在 JS 與 GLSL 兩邊 | `three-pack.js:110`（`if (chunk.mat !== MAT.gold)`）對照 `mat.js` 金那一列的 `grain: 'leaf'` 與 `three-renderer.js:243`（`spec.grain === 'leaf'`）。哨兵：`three-pack.js:117`（`1000 +`）、`:375`（`step(500.,…)`）、`:379`（`-1000.`） | 給另一種材質加 `grain: 'leaf'`（例如平文金）時，著色器會走木紋分支，但 `grainUv` 不會改它的 uv，木紋就用錯座標畫。這違反 0017「不用別的鍵判斷材質」的精神；現有圍欄只擋著色器與 renderer，沒擋到這裡 | `grainUv` 改讀 `lookOf(chunk.mat).mesh?.grain === 'leaf'`；哨兵取名 `GRAIN_UV_OFFSET`，GLSL 注入，門檻寫成導出值（`OFFSET / 2`） | 0017 範圍內 | S | parts-hash 不受影響；`plate.test.mjs:1339-1342` 照過；字串、plate-diff | revert |
| 8 | **頂點格式**：部件 16 個 float、盒與盒繩 10 個 float 的欄位位置 | 16：`mesh-geometry.js:333-338`（`packMeshes` 寫入）、`three-pack.js:136`（`* 16 + 14` 寫鳥的旗標）、`:173`、`three-renderer.js:779-782`（偏移 0、3、6、8、12）、`export-glb.js:129`（`subarray(8, 12)`、`(12, 16)`）、`clip-probe.js:25`。10：`box.js:6`（`STRIDE`）、`three-pack.js:184`（`BOX_STRIDE`）、`:189`（`data[i + 8]` 是材質）、`three-renderer.js:45`（`STRIDE`，盒繩） | 在 `packMeshes` 多塞一欄（例如再一個部件狀態），renderer 的 `InterleavedBuffer`、glb 匯出、clip 探測、鳥的旗標偏移 14 都要同步，漏一處就讀到錯的欄，畫面通常不會報錯，只會怪 | 在 `mesh-geometry.js` 匯出 `PART_VERTEX = {stride: 16, position: 0, normal: 3, uv: 6, owner: 8, style: 12, birdFlag: 14}`、在 `box.js` 匯出 `BOX_VERTEX = {stride: 10, …, mat: 8, part: 9}`，其他地方讀它 | 不需新 ADR | S | parts-hash、plate-diff、`plate.test.mjs` 的打包測試 | revert |
| 9 | **卡片列表的門檻**：雙欄斷點、整批顯示與進場動畫的上限、錯開的張數 | 斷點：`batch-render.ts:15`（`>= 768`）對照 `bunko-ui.css:176`（`@media (min-width:701px)`）、`:199`（`.spot-grid` 兩欄）。**已經不一致**。上限 30：`batch-render.ts:7`（`RENDER_ALL_BELOW`）、`card-fx.ts:9`（`MAX_ANIMATED_CARDS`）。錯開 8：`card-fx.ts:11`、`bunko-ui.css:146-152`（`nth-child(2)`–`(n+8)`） | 701–767 px（直立的平板）時 CSS 已是兩欄，`DetailView.tsx:53` 卻用一欄算第一批，第一批只蓋到約一屏，捲動時會看到補卡。`RENDER_ALL_BELOW` 若調得比 `MAX_ANIMATED_CARDS` 小，會播進場動畫的列表就會分批出現，動畫被截斷（`batch-render.ts:6` 的註解寫著這個依賴） | 斷點：`batch-render.ts` 匯出 `TWO_COLUMN_MIN_PX = 701`，註明「mirrors bunko-ui.css」（ADR 0007 的副本規則），或由 `matchMedia` 讀。上限：`RENDER_ALL_BELOW` 改成從 `MAX_ANIMATED_CARDS` 導出（或反過來）。錯開：維持 ADR 0007 允許、已註明的副本 | 0007、0008 範圍內 | S | `batch-render.test.ts`、`card-fx.test.ts`；改斷點會讓 701–767 px 的第一批變多，**這是行為修正**，要使用者同意 | revert |
| 10 | **靜態圖的參考框** 950×680（＝ `baseHalf` 的 475 與 340） | `view.js:10`（`Math.max(475,340*aspect)`）、`static-layout.js:5`（`REF_W = 950, REF_H = 680`）、`scripts/plate-fallback-shots.mjs:3`、`:20`（`950`、`680`）、`scripts/bunko-zoom.test.mjs:13`（`475`、`340`） | 調首頁取景（`baseHalf`）時，`static-plate.test.mjs:17-18` 會擋下 `REF` 沒跟上的情況（部分有守）。但拍圖腳本照舊用 950×680 拍，22 張降級圖就和新取景錯位，這一點沒有守 | `view.js` 匯出 `BASE_HALF = {w: 475, h: 340}`；`REF_W`／`REF_H` 由它導出；拍圖腳本 import `REF_W`／`REF_H`；測試讀 `BASE_HALF` | 0008 範圍內 | S | `bunko-zoom.test.mjs`、`static-plate.test.mjs`；拍圖腳本的輸出尺寸不變（950×680） | revert |
| 11 | **部件的預設欄**：七個建構函式各寫一份 `{id, kind, group, order: 0, layer, mat, reach, thick, bias, anchor, fills: [], lines: []}` | `vocab.js:60`、`doha.js:69`、`crag-mesh.js:238`、`architecture-mesh.js:16`、`frame-mesh.js:13`、`lantern-mesh.js:266`、`trees.js:20` | 部件要多一個必填欄（像 11/22 的 `on`）時，七處都要補，漏的那一類部件拿到 `undefined`；`reach`、`thick` 的預設也因此各自漂移 | `vocab.js` 匯出 `basePart(id, kind, layer, mat, anchor, extra)`，各建構函式只傳自己不同的欄（`reach`、`thick`） | 不需新 ADR | S–M | **parts-hash 11／11 相同**就足以證明（部件陣列逐欄相同） | revert |
| 12 | **測試與量測腳本裡的正本數值** | `scripts/plate-doha-measure.mjs:10`（`PIECE_MATS`：六個土坡材質，就是 `mat.js` `DOHA_TONE` 的六個 `mat`）、`scripts/plate-doha-similar.mjs:77`（區 ID 對檔名的表，`parts.js:26` `PLATES` 已有；健檢 W7 的殘留）、`scripts/lib/plate-test-helpers.mjs:3`（`dohaWards`＝十一區全部，等於 `Object.keys(PLATES)`）、`scripts/plate.test.mjs:33`（`[372, 232]`／`[360, 230]`）、`:71`（`-356..360`、`-226..230`）、`:283`（`360`、`230`）、`scripts/bunko-zoom.test.mjs:13`（`475`、`340`）、`:57`（`2.2e6`）、`scripts/plate-room-stats.mjs:26-29`（`kinds` 字串，對 `three-renderer.js:230` 等的 `tag(…, 'limb'|'stamp'|'cord')`，只檢查了 `names`） | 加一種土坡材質，`plate-doha-measure` 不會把它算進「部件占比」，量測少算卻不報錯。改 `PLATE` 時測試照舊用 360×230 檢查，測試本身就錯了。renderer 改了 tag 名，`plate-room-stats` 的遮罩就變空，V4–V7 的門檻變成在量空集合 | 各自 import 正本：`DOHA_TONE` 展開成集合、`PLATES`、`PLATE`（或 #1 的 `LID`）、`BASE_HALF`、`PIXEL_CAP`（要匯出）。`MASK_GROUPS.kinds` 比照 `names` 加檢查（renderer 匯出 tag 名的清單） | 0014（行為測試不得改弱；這是讓測試讀正本，不是放寬） | S | 測試照過；`plate-doha-measure` 對十一區的輸出與改前逐字相同 | revert |
| 13 | **區的總數 `/ 11`** | `study.js:158`、`study-chrome.js:53`（都寫死 `/ 11`；同一行的 `CABINETS` 已在手上） | 區數變了（合併或拆區），盒標仍寫「/ 11」 | `CABINETS.length` | 不需 | S | `toji-study.test.mjs`、`bunko-integration.test.mjs` | revert |
| 14 | **亮度權重 `vec3(.3,.55,.15)`** | `three-pack.js:43`、`:61`、`:836`、`:889` | 調其中一處（例如改用 Rec.709），各處對「亮不亮」的判斷就不同步；低風險 | 共用片段裡的 `const vec3 M_LUMA` | 不需 | S | 字串（可以逐字相同以外的地方不動）、plate-diff | revert |

## 2. 證據（產生它的指令與輸出摘錄）

所有指令都在 `C:\Git\_wt_kyoto_audit` 下執行（Git Bash）。

### #1 蓋面的尺寸與高度場

```
$ rg -n "PLATE *=|HALF\b|SWELL" src scripts
src\studies\toji\plate\vocab.js:19:export const PLATE = {halfW: 360, halfH: 230};
src\studies\toji\plate\three-pack.js:204:const vec2 K_HALF=vec2(360.,230.);
src\studies\toji\plate\three-pack.js:205:const float K_SWELL=17.;
src\studies\toji\plate\three-pack.js:622:const vec2 M_HALF=vec2(360.,230.);
src\studies\toji\plate\three-pack.js:624:const float M_SWELL=17., M_AMB=.17, M_KEY=.44, M_POOL=1.75;
src\studies\toji\plate\export-glb.js:14:const HALF = [360, 230], SWELL = 17;
$ rg -n "3\.2 ?\*|/ ?370|/ ?240" src/studies/toji
src/studies/toji\plate\box.js:15:  const dome = (x, z) => 3.2 * (1 - (x / 370) ** 2) * (1 - (z / 240) ** 2);
src/studies/toji\plate\box.js:19:    const n = normalize([3.2 * 2 * x / 370 ** 2 * (1 - (z / 240) ** 2), 1, ...
src/studies/toji\plate\export-glb.js:34:    const dome = 3.2 * (1 - (px / 370) ** 2) * (1 - (pz / 240) ** 2);
src/studies/toji\plate\three-pack.js:199:export const DOME_GLSL = `float groundY(vec2 p){ return 3.2*(1.-(p.x/370.)*...
src/studies/toji\plate\three-pack.js:211:  float dome=3.2*(1.-(p.x/370.)*(p.x/370.))*(1.-(p.y/240.)*(p.y/240.));
$ sed -n 212p src/studies/toji/plate/three-pack.js; sed -n 35p src/studies/toji/plate/export-glb.js
  vec2 e=1.-smoothstep(K_HALF-44.,K_HALF-6.,abs(c));
    const e = (1 - smooth(HALF[0] - 44, HALF[0] - 6, Math.abs(cx))) * (1 - smooth(HALF[1] - 44, HALF[1] - 6, Math.abs(cz)));
$ rg -n "DOME_GLSL" src scripts
src\studies\toji\plate\three-pack.js:199:export const DOME_GLSL = ...      # 只有定義，沒有任何 import
$ rg -n "PLATE\.half" src/studies/toji --glob '*.js'       # JS 烘焙與取樣全部讀 PLATE
bake.js:17, :266, :275-276, :405；parts.js:129；doha.js:254；fillers.js:7；three-renderer.js:714, :748, :760, :772；vocab.js:188
```

### #2 CPU 鏡像

```
$ sed -n 40,56p src/studies/toji/plate/export-glb.js
  /** PART_MOTION_GLSL kyotoMotion for one vertex. ... */
    const upF = style[0] > 0 ? smooth(.1, .7, A[1]) : 0, mix = ..., eps = 1.5;
    return {p: [..., gy + B[2] + .35 + down[1] * d + up[1] * height, ...], n};
$ sed -n 63p src/studies/toji/plate/export-glb.js
    const p = [..., gy + B[2] + .6 + down[1] * d + up[1] * height, ...];
$ rg -n "smoothstep\(\.1,\.7|eps=1\.5|\+\.35|\+\.6," src/studies/toji/plate/three-pack.js
:291 float upF=aStyle.x>0.?smoothstep(.1,.7,A.y):0.;   :293 float eps=1.5;   :303 ...gy+B.z+.35...
:481 float upF=style.x>0.?smoothstep(.1,.7,A.y):0.;    :483 ...gy+B.z+.6...  :1262 ...gy+B.z+.35...
$ rg -n "poseKit|GROUND_GLSL|K_HALF" scripts/*.test.mjs
scripts/plate.test.mjs:1103/1104/1148   # 只檢查 GLSL 字串包含 GROUND_GLSL，沒有任何測試把 poseKit 和 GLSL 綁在一起
```

### #3 開蓋與傾斜

```
$ rg -n "uOpening\*|-48\." src/studies/toji/plate/three-pack.js
304/305, 484/485, 523/524, 538/539, 552/553, 1263/1264:
  p.y+=uOpening*360.; p.z-=uOpening*650.;
  vec3 centre=vec3(0.,-48.,0.); p=uTilt*(p-centre)+centre;
$ sed -n 1083,1084p src/studies/toji/plate/three-renderer.js
      const [x, y, z] = [c.anchor[0], c.anchor[1] + 48, c.anchor[2]];
      const pin = [..., tilt[1] * x + tilt[4] * y + tilt[7] * z - 48, ...];
```

### #4 光跡的點數

```
$ rg -n "trailMaxPoints" src/studies/toji/feel.js
58:  trailMaxPoints: 20, // Maximum number of active trail points kept
$ rg -n "length: 20|i < 20|<20;|\[20\]" src/studies/toji
three-renderer.js:183:  const trails = Array.from({length: 20}, () => new THREE.Vector3());
three-renderer.js:1109:    for (let i = 0; i < 20; i++) {
three-pack.js:620:uniform vec3 uTrails[20];
three-pack.js:966:  for(int i=0;i<20;i++){
```

### #5 銀與作舊色

```
$ rg -o -n "vec3\([0-9.]+, ?[0-9.]+, ?[0-9.]+\)" three-pack.js three-renderer.js | (同值分組，見下)
2 vec3(.66,.66,.64)  three-pack.js:386 three-pack.js:623
2 vec3(.46,.42,.36)  three-pack.js:392 three-pack.js:645
2 vec3(.43,.29,.14)  three-renderer.js:288 three-pack.js:393
$ sed -n 386p src/studies/toji/plate/three-pack.js
const vec3 K_M_OXID=vec3(.66,.66,.64); // oxidized silver-grey on shaded faces (matches M_OXID)
$ sed -n 288p src/studies/toji/plate/three-renderer.js
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.43, .29, .14), (1. - smoothstep(0., 6., vLift)) * .35 * uAge);
```

完整的分組指令：`rg -o -n "vec3\(\.?[0-9][0-9.]*, ?\.?[0-9][0-9.]*, ?\.?[0-9][0-9.]*\)" src/studies/toji/plate/three-pack.js src/studies/toji/plate/three-renderer.js | awk -F: '{k=$3; gsub(/ /,"",k); c[k]++; l[k]=l[k]" "$1":"$2} END{for(k in c) if(c[k]>1) print c[k], k, l[k]}' | sort -rn`。

### #6 透漆的邊緣環與 toFixed

```
$ rg -n "toFixed" src/studies/toji/plate/three-pack.js
593:const v3 = c => c.map(v => v.toFixed(3)).join(',');
599:const float K_COAT_RN2=1./(${(COAT.index * COAT.index).toFixed(3)}), K_COAT_GS=${COAT.sunkGain.toFixed(3)}, ...
931:const float M_DENS_MORE=${DENSITY.more.toFixed(3)}, M_DENS_LESS=${DENSITY.less.toFixed(3)};
990:    float er=(${COAT.edgeWidth[0].toFixed(2)}+${COAT.edgeWidth[1].toFixed(2)}*uAge)*(.75+.5*mVnoise(kp*.9+3.))*(.8+.4*mThick);
1301:    float ke=smoothstep(.0,.4,mEdgeOut(uMistFine,2,vKyotoUv,(${COAT.edgeWidth[0].toFixed(2)}+${COAT.edgeWidth[1].toFixed(2)}*uAge)*(.75+.5*mVnoise(vKyotoUv*.9+3.)),.45,.6));
$ sed -n 310p src/studies/toji/plate/three-pack.js
/** A number as a GLSL float, written out in full (String, not toFixed), so the shader holds exactly the table's value. */
```

### #7 貼金木紋

```
$ sed -n 109,117p src/studies/toji/plate/three-pack.js
export function grainUv(chunk) {
  if (chunk.mat !== MAT.gold) return chunk;
  ...  out[i + 6] = 1000 + (alongX ? v[i + 2] : v[i]); ...
$ rg -n "500\.|-1000\." src/studies/toji/plate/three-pack.js
375:float kyotoLeafOn(){ return step(500.,vKyotoUv.x); }
379:  float across=vKyotoUv.x-1000., along=vKyotoUv.y;
$ sed -n 243p src/studies/toji/plate/three-renderer.js
    const isPowder = isPart && spec.grain === 'powder', isLeaf = isPart && spec.grain === 'leaf', ...
```

### #8 頂點格式

```
$ rg -n "\* 16 \+|InterleavedBuffer\(|subarray\(i, i \+ 16\)|STRIDE = 10|BOX_STRIDE" src/studies/toji/plate
three-pack.js:136:      if (p.kind === KIND.bird) for (let v = 0; v < n; v++) packed[(at + v) * 16 + 14] = 1;
three-pack.js:184:const BOX_STRIDE = 10;
three-renderer.js:45:const STRIDE = 10;
three-renderer.js:779:          const g = new THREE.BufferGeometry(), buffer = new THREE.InterleavedBuffer(data, 16);
export-glb.js:129:        const v = data.subarray(i, i + 16), owner = v.subarray(8, 12), style = v.subarray(12, 16);
box.js:6:const STRIDE = 10;
$ sed -n 333,338p src/studies/toji/plate/mesh-geometry.js     # 寫入順序：位置3、法線3、uv2、owner4、style4（第14格為0，鳥的旗標）
```

### #9 卡片列表的門檻

```
$ sed -n 15p src/lib/batch-render.ts
  const columns = viewportWidth >= 768 ? 2 : 1;
$ rg -n "@media|spot-grid \{ grid-template" src/bunko-ui.css
176:@media (min-width:701px) {
199:  .spot-grid { grid-template-columns:repeat(2,minmax(0,1fr)); padding:8px 36px 36px; }
$ rg -n "firstBatchSize" src/components
DetailView.tsx:53:  const shown = renderCount(total, unlocked, firstBatchSize(window.innerWidth, window.innerHeight));
$ rg -n "= 30;|STAGGER_CARDS = 8" src/lib
batch-render.ts:7:export const RENDER_ALL_BELOW = 30;
card-fx.ts:9:export const MAX_ANIMATED_CARDS = 30;
card-fx.ts:11:export const STAGGER_CARDS = 8; // mirrored in bunko-ui.css: cards 2–7 step by 20 ms, the rest start together
$ sed -n 6p src/lib/batch-render.ts
/** Lists up to this long render whole in one go (a small list is cheap, and it keeps the entrance animation intact). */
```

### #10 參考框

```
$ sed -n 10p src/studies/toji/view.js
export function baseHalf(aspect){const halfW=Math.max(475,340*aspect);return {halfW,halfH:halfW/aspect};}
$ sed -n 5p src/studies/toji/plate/static-layout.js
export const REF_W = 950, REF_H = 680;
$ sed -n 20p scripts/plate-fallback-shots.mjs
const W = Math.round(950 * SCALE), H = Math.round(680 * SCALE);
$ sed -n 17,18p scripts/static-plate.test.mjs        # 這條測試間接擋住 REF 與 baseHalf 不一致
  const big = pictureLayout(1900, 1360);
  assert.deepEqual([big.width, big.height].map(Math.round), [1900, 1360]);
```

### #11 部件的預設欄

```
$ rg -n "thick: ?[0-9]+, ?bias: ?0" src/studies/toji/plate
vocab.js:60:  ... order: 0, layer, mat, reach: 4, thick: 24, bias: 0, anchor, fills: [], lines: [], ...extra});
doha.js:69:  ... order: 0, layer: 0, mat, reach: .5, thick: 0, bias: 0, anchor, fills: [], lines: [], ...extra});
crag-mesh.js:238: ... order: 0, layer: spec.layer ?? 1, mat: MAT.rockGold, reach: 4, thick: 0, bias: 0, ...
architecture-mesh.js:16:  id, kind, group: id, order: 0, layer, mat, reach: .6, thick: 0, bias: 0, anchor, fills: [], lines: [], ...extra,
frame-mesh.js:13:  id, kind, group: id, order: 0, layer, mat, reach: .7, thick: 0, bias: 0, anchor, fills: [], lines: [], ...extra,
lantern-mesh.js:266:    id: pid, kind: KIND.tier, group: id, order: 0, layer, mat, reach: .6, thick: 0, bias: 0, ...
trees.js:20:    anchor: [x,z], reach: 1, thick: 0, bias: 0, fills: [], lines: [], limbs: [], stamps: [], species};
```

### #12 測試與量測腳本

```
$ sed -n 10p scripts/plate-doha-measure.mjs
const PIECE_MATS = new Set([MAT.bankGold, MAT.bankSilver, MAT.sandGold, MAT.sandSilver, MAT.toyamaGold, MAT.toyamaBlue]);
$ rg -n "mat: MAT\." src/studies/toji/plate/mat.js     # DOHA_TONE 的六個 mat 與上面逐一相同
$ sed -n 77p scripts/plate-doha-similar.mjs
  const mod = await import(`../src/studies/toji/plate/${{W_FUSHIMI: 'fushimi', W_NAKAGYO: 'nakagyo', ...}[ward]}.js`);
$ sed -n 3p scripts/lib/plate-test-helpers.mjs
export const dohaWards = new Set(['W_NAKAGYO', 'W_FUSHIMI', ... 十一區全部]);
$ sed -n 33p scripts/plate.test.mjs
      const limit = p.layer === 0 ? [372, 232] : [360, 230];
$ sed -n 31p scripts/plate-room-stats.mjs     # 只驗 names，kinds 字串沒人驗
for (const [group, {names}] of Object.entries(MASK_GROUPS)) for (const name of names ?? []) if (!(name in MAT)) throw ...
```

### #13、#14

```
$ rg -n "/ 11\`" src/studies/toji
study.js:158:  $('cabinet-context').textContent=`${name} · ${String(CABINETS.indexOf(cabinet)+1).padStart(2,'0')} / 11`;
study-chrome.js:53:    $('cabinet-number').textContent=`${number} / 11`;...
$ rg -n "vec3\(\.3,\.55,\.15\)" src/studies/toji/plate/three-pack.js
43, 61, 836, 889
```

## 3. 不建議動

| 項目 | 位置 | 理由 |
|---|---|---|
| 範圍圍欄裡的數字（`expectedCounts`、`rockTotals`、材質表的 `was` 謂詞、`FROM_MINAMI`、圍欄裡的 2026） | `scripts/plate-fences.test.mjs:12`、`:44`、`:89-`、`:189`；`scripts/plate-env.test.mjs:11` | ADR 0014：圍欄本來就是「刻意抄一份舊值來鎖住」，從正本取就失去意義 |
| 盒的部位 id 20–28 用裸數字 | `box.js:37-107`、`three-pack.js:68-80`、`three-renderer.js:589-591` | ADR 0016 決定 `BOX_MATERIALS` 留在 `three-pack.js`、另一套 id。`box.js` 總共只被 2 個 commit 動過（`git log --oneline -- src/studies/toji/plate/box.js`）。可以順手加一張 `BOX_PART = {side: 20, …}` 的名字表，但不急 |
| 貝與珊瑚的包漿、`rockPowder` 與 `ROCK_LOOK.powder`、`refColour` 與 `mesh.color` | `mat.js` | ADR 0016「不同的性質照實分開」，是否統一由使用者決定（材質表提案 §6） |
| 註明「mirrors theme.css」的色碼副本 | `App.tsx:10`、`ClusterMap.tsx:39-42`、`card-fx.ts:11` 對應 `bunko-ui.css:146-152` | ADR 0007 允許 Canvas、Leaflet、CSS 之間註明出處的字面副本。`index.html:5` 的 `theme-color` 沒有註明，加一行註解即可，不必解耦 |
| 樹種的字串分支（10 處） | `trees.js:23-62` | 全在一個檔、一個函式裡，近 11-20 之後沒動過（4／0）。等下次動樹的構圖時再收成 `SPECIES` 表，現在收沒有收益 |
| 三份相同的雜湊函式 | `three-pack.js:368`（`kyotoHash2`）、`:433`（`kyotoHash`）、`:654`（`mHash`） | 雜湊不是會被調的性質，各段著色器的雜訊互不依賴；合併只會讓字串變、要冷編譯一次 |
| 透漆種類的權重寫在著色器分支裡（`COAT_HALF` 的 .45／.55 等） | `three-pack.js:992-994` | ADR 0017「配方分支留在地著色器主體原位，以具名常數判斷」，是刻意保守 |
| 驗收視窗 1440×900、375×812 | `scripts/smoke.mjs:16-17`、`shots.mjs:45-46`、`plate-room-shots.sh:23-28`、`lib/plate-env.mjs:89` | 驗收規格本身（`AGENTS.md` §5），每支腳本是不同情境，不是同一個設定 |
| 瀏覽器長任務門檻 50 ms | `perf-home.mjs:54`、`ward-build.js:5` 的註解 | 外部常數（瀏覽器的定義），不是本專案的性質 |
| 只出現一次、沒有名字的著色器字面值 | `three-pack.js` 全檔 | 第二條鏈 K10 已決定「碰到哪段改哪段，不整批命名」 |
| 地圖的預設中心 `[35.00, 135.74]` | `ClusterMap.tsx:199` | 只在沒有任何聚落時用；使用者 2026-11-22 決定地圖維持現狀、不再投資 |

## 4. 分級：CONFIRMED 與 PLAUSIBLE

### CONFIRMED（14 條，§1 全部）

#1–#14 都有 `rg`／`sed` 的檔:行證據，而且確實是同一個值或同一個判斷寫在兩處以上。其中兩條**已經出現不一致**，不只是潛在風險：

- #9：雙欄斷點 768 對 701。
- #1 的 `DOME_GLSL`：留著的死碼。

#6 的 `toFixed` 部分是已知未修（材質表提案 §4），邊緣環的式子重複是新的。

### PLAUSIBLE（6 條，沒列進 §1 的排序；要先確認意圖才算數）

| # | 概念 | 位置 | 為什麼只是 PLAUSIBLE |
|---|---|---|---|
| P1 | **手燈**：部件用 three 的 `PointLight('#ffe2b0')`，強度日 50000、夜 120000；蓋面用 `mPoolC=mix(vec3(1.,.93,.80),vec3(.96,.96,1.),uNight)`，衰減 `/24000.`。燈高 70 寫兩次 | `three-renderer.js:154`、`:1055`（`LAMP_H = 70`）、`:188`（`uLamp` 初值 `(0, 70, 0)`）、`:1099`；`three-pack.js:670`、`:673` | 和 Q2（`ROOM.direct` 對蓋面光色）是同一型：同一盞「手的燈」有兩組顏色與強度。蓋面的色是線性值還是顯示值沒確認（room 開案書 §10），不能直接比。**建議併進 Q2 一起決定**，不另案。燈高 70 的兩份可以先合一（S） |
| P2 | **部件種類（`KIND`）的行為散在六個檔** | `parts.js:178-184`（點到時的反應）、`:252`（塔的站起速度）、`:35`、`:47`、`:71`（鳥）；`bake.js:303`（`DENSITY_WEIGHT`，已是表）、`:364-372`；`three-pack.js:136`（鳥的旗標）；`three-renderer.js:814`、`clip-probe.js:92`、`:104`、`:107`（霞） | 各處判斷的是不同面向（物理、烘焙、打包、探測），不一定是同一個性質。若要照 ECS＋SSOT 收成 `KIND_LOOK` 表（像 `MAT_LOOK`），是 M–L 的架構改動，要另開案。改動頻率中等（`parts.js` 11／0） |
| P3 | **手機寬度 700 px** | `three-renderer.js:149`（陰影解析度）、`:714`（烘焙解析度）；`bunko.css:94`、`study.css:53`（`max-width:700px`） | 數字相同，但貼圖解析度和版面斷點未必是同一個概念。若是，應有一個 `PHONE_MAX_PX` |
| P4 | **預建延遲 900 ms** 和換函動畫長度 | `three-renderer.js:666`（`PREFETCH_DELAY_MS = 900`，註解「讓換函動畫先停」）；`feel.js:22-23`（`slideBaseMs + slideExtraMs` 最多約 460 ms） | 註解寫了依賴，數字卻沒寫成導出值。900 遠大於 460，目前不會出事 |
| P5 | **生命狀態貼圖的欄位**：`a = (sway, stand, rise, glow)`、`b = (dx, dz, lift, group)` | `parts.js:140`、`three-pack.js:84`（註解）；GLSL 以 `A.x`、`A.y`、`A.z`、`A.w`、`B.xy`、`B.z` 讀（`three-pack.js:285-303`）；`export-glb.js:33`（`a[… * 4 + 2]` 是 rise） | 和 #8 同型，但兩邊都寫了註解（沒查改過欄位的歷史）。要不要比照 #8 給欄位取名，跟 #8 一起決定 |
| P6 | **`vec3(1.,.93,.80)` 出現兩次** | `three-pack.js:670`（手燈的日色）、`:1191`（水的色調） | 可能只是巧合，意義不同，不建議合併 |

## 5. 已提過或已處理（不重報）

| 項目 | 狀態 | 出處 |
|---|---|---|
| `ROOM.direct` 對蓋面光色 | 使用者 11/27 決定先不統一（Q2）；P1 建議併入它 | `docs/plans/2026-11-28-room.md` §9 |
| 房間（主光方向、窗、天光、日夜色） | 已處理，`room.test.mjs:14` 圍欄擋住 GLSL 再抄一份 | ADR 0028 |
| 材質的性質、地著色器不比編號、renderer 不比名字 | 已處理，`plate-fences.test.mjs:87`、`:138` 圍欄 | ADR 0016、0017 |
| 相機 `EYE`／`TARGET`（第二條鏈發現的五支測試） | 已處理：`plate/camera.js` 是唯一來源，`renderer.js:14` 與 `three-renderer.js:32` 都 import | `docs/plans/2026-11-24-chain-2.md` §8.3 |
| 切片預算、讓出 | 已處理 | ADR 0027（`ward-build.js:8`） |
| `CABINET_SILHOUETTE`（盒的投影外殼） | 已處理：預算的值，`ui-renewal.test.mjs` 用盒與十一區全部網格的頂點檢查 | `backdrop.js:7-13` 的註解 |
| `LID_HALF_X`／`_Z`（370、240）和 `PLATE`（360、230） | 11/24 判定「不是同一個量，不算重複」；#1 沿用，只建議把兩者的關係寫成欄位 | `docs/plans/2026-11-22-health-and-backlog.md` 第 467 行 |
| 拖曳門檻 8 px、光跡邊界 364×234 | 已處理（`a637e38`，`TAP_SLOP_PX`、`LID_HALF_*` 匯出） | 同上，第 296 行 |
| 區的清單與順序寫了六處（W7）、拍圖腳本的步數（K1） | 大部分已處理；殘留的 `plate-doha-similar.mjs:77` 列在 #12 | 健檢 W7、第二條鏈 K1 |
| `FEEL` 的註解關係與裸數字（K3） | 第二條鏈 F2 | 第二條鏈 §2.1 |
| `three-pack.js` 字面值的總數（W10／K10） | 擱置 | 第二條鏈 §2.1 |
| `COAT_GLSL` 的 `toFixed` | 已記、未修；併在 #6 | `docs/plans/2026-11-18-material-table.md` 第 190 行 |
| 每區的中繼資料在四張表（W11） | 待評估，沒重查 | 健檢 W11 |

## 6. 建議的做法與要使用者決定的事

- **一次做還是分批**：#1–#3 都動「蓋的幾何與動作」，建議合成一包（一份新 ADR、一張 `lid.js`、一次冷編譯、一次 plate-diff 矩陣）。#4–#8、#10–#14 都是 S，可以各自小 commit，不必另開 ADR。#9 會改變 701–767 px 的第一批張數，是行為修正，要單獨同意。
- **著色器字串會不會變**：#1、#4、#5、#7、#14 若照原樣印出數字，字串可以逐字相同，訪客不用冷編譯，降級圖也不必重拍。#3（函式化）和 #6（改 `glslFloat`）會變字串，部署後冷編譯一次，同 room 開案書 Q1 的情形。
- **P1（手燈）**：建議併進 Q2，等 Q2 另案時一起決定。
- **P2（`KIND` 表）**：建議另開案，不和本書一起做。
