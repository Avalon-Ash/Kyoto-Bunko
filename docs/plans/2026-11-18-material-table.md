# 材質性質集中成一張表：地著色器與它的讀者解耦（提案）

日期：2026-11-18。狀態：**第 0–3 步與第 4 步的 4a、4b 做完（§8.11、§8.13、§8.14；第 3、4b 步 2026-11-20 合併 `main` 並 push）。第 0–2 步（§8.11）：地著色器不再比材質編號。第 2 步用的是保守的寫法（分支留在主體、條件換成配方），因為配方函式的寫法會讓著色器第一次編譯卡 32–49 秒（§8.9、§8.10）。`doha.js` 的兩個填色旗標在 `claude/mat-table-4c` 拿掉（§8.15，沒有合併）**。使用者 2026-11-18 同意由終審者（Fable 5.2）執行並在驗收後合併 `main`、push（原話：「你自己作完這些問題後推上去」）。設計定案與執行紀錄在 §8；終審意見在 §7。base：`claude/data-1117` @ `56fc135`。
- 開案：Claude Opus 5.5（從主工作階段分出的工作階段）。
- 補充脈絡：做了 11/16–17 整輪盤面的工作階段「專案待辦事項討論」。它也負責終審本提案。
- 依據：
  - 使用者 2026-11-17 的指正，見全域合約「架構」、`AGENTS.md` §2「不做耦合」，以及 `HANDOFF.md` §4.4a 第 2 項。
  - 使用者的方向是 **ECS＋SSOT**。原話是這對 AI 長期維護最友善。
  - 不引入框架，不加依賴。

## 0. 摘要（給使用者決定用）

- **問題**：一個材質的性質散在四個檔裡，各自用不同的鍵判斷：
  - 地著色器用 `mat==N`：47 行、84 個比較。
  - renderer 用 `spec.name === '…'` 字串。
  - bake 用填色上的 `f.wedge`／`f.fade`／`f.tongue` 標記。
  - doha 用 `tone` 字串。

  例如遠山金（23）光在地著色器就分散在 10 行。
- **這件事已經造成實際損失**：11/17 的岸暗邊、山腳暗三角、池邊暗影是同一個原因：非素地的材質沒有套用同一個疏密場。結果在三處各修一次。疏密那一行（992）在 11/17 一天被四個 commit 改過，每次加一兩個材質。「是否套疏密」就是應該進表的一欄。
- **目標**（§2）：
  - `mat.js` 放一張表，每個材質一列，欄就是元件：是否套疏密、齊平或浮雕高度、包漿類別、調子層、大金片參數、`fine` 各通道的意思等。
  - 地著色器、包漿、烘焙、量測都是讀欄的系統。
  - 地著色器讀的部分，在建字串時產生 GLSL 常數陣列。同檔的 `COAT` 已經這樣插值，有先例。
  - 每個材質的上色配方寫成一個函式，全檔只分派一次。
  - 圍欄測試守住兩條：每個 `MAT` 都有表列；除了那一處分派，`three-pack.js` 不再出現 `mat==\d`。
- **怎麼證明畫面不變**（§3）：我實測過，同一份程式拍兩次就不一樣。夜間 9.15% 像素不同，最大差 66/255。原因是 `uTime` 走實際時間；降級圖是 webp 有損壓縮，也不能當逐位元的基準。所以第一包是工具：固定時鐘、PNG 比對、補覆蓋率的材質替換。之後每包拍十一區日夜七組。只換條件式的那一包要逐位元相同。
- **回退**：每包一個 commit，可以單獨 `git revert`。不留新舊兩條路的開關。
- **執行者**：11/18 00:41 查過額度。Fable 週占比 4%，時間進度約 31%，Fable 明顯落後；Codex 見底；Gemini 週額度偏低。照全域合約的 Fable 預算規則，**各包都由 Fable 工作階段自己做**，要使用者在 App 開一個 Fable 工作階段。
- **要使用者決定的**（§6）：
  1. 方向與分步。
  2. 死路徑刪或留。
  3. 貝、珊瑚的包漿類別：地和網格現在不一致，要不要統一。統一會改變畫面。
  4. 第 3、4 步（renderer、bake）要不要跟第 1、2 步一起做。

## 1. 現況盤點：性質 × 出現位置

### 1.1 產生清單的指令

```bash
grep -nE "mat(==|!=|>=|<=|<|>)[0-9]+" src/studies/toji/plate/three-pack.js
```

```bash
grep -nE "spec\.name|spec\.rock|nashijiSide|nashijiInner|paperFleck|isLacq|isRockP|coatClass" src/studies/toji/plate/three-renderer.js
```

```bash
grep -nE "\.tongue|\.wedge|\.fade|KIND\.[a-zA-Z]+" src/studies/toji/plate/bake.js
```

```bash
grep -nE "tone ===" src/studies/toji/plate/doha.js
```

每行的日期用 `git blame -L <行>,<行> --date=short <檔>` 查。日期是那一行最後被改的日子，不一定是第一次寫的日子。

### 1.2 總表：每個性質在哪裡定義

**粗體**是 11/17 最後改動的行。

| 性質 | 地著色器 `three-pack.js` | renderer `three-renderer.js` | bake `bake.js` | doha `doha.js` | 其他 |
|---|---|---|---|---|---|
| 是否套疏密（撒粉暈染） | **992**（{1,12,19–24}） | — | `DENSITY_WEIGHT` 依 KIND（278，已經是表） | — | — |
| 齊平或浮雕：`cH`、`lH` | **932**（四種 `cH`、兩種 `lH`） | — | wedge／fade 怎麼畫 `fine.g`（166–170、305–313、352–360） | — | — |
| 包漿類別（沉／研出包邊／在漆上／淡） | 966–969、973–974、**970–972**；預設值在分支外 | `coatClass` 用名字判斷（173）、`isCoat`（171、393） | — | — | `COAT` 註解列了四類（three-pack 第 606–613 行） |
| 調子層（平地／濃梨子地面／其他） | 1172、1174（開發視圖） | — | — | — | `plate-shot.mjs` 的 `PLATE_TONE` 靠開發視圖的顏色分層 |
| 丘的地（切金半調、作舊磨損） | 968、993–994、1000、1094、1168、1179 | — | KIND.hill 的柔高度（346） | — | — |
| 大金片參數 | **1017**（21、23）、1004–1005（7、8） | — | — | — | — |
| 箔閃（切金、切銀） | 1019–1020 | — | — | — | — |
| 底層混合 `wN`／`wM`／`wS`、`f0`、`tint`、`rise` 下限 | **992**、993–1005、**1006–1007**、1008–1014 | — | — | — | — |
| `fine.g` 的意思（平嵌遮罩／堤高／粉厚／稜高） | 1023–1092 依材質解讀 | — | fill 標記決定怎麼畫 | 寫入 `tongue`、`wedge`、`fade` | 兩邊靠慣例對上，沒有一處寫明 |
| 技法程序 | 堤、洲浜 1023–1076；遠山 1078 及 **1085–1092**；銀平目 1122；青貝 1132；流水 1139 | 網格：`spec.rock`（165）、`isLacq`（167）、`isRockP`（169）、`isPowder`／`isLeaf`（174）、樹的 `silver`（290） | — | — | `rock-mesh.js:240` 又判斷一次粉的岩 |
| 金或銀（tone） | 1020、1032、1046、1048、1052、**1085**、**1088**、**1091**、**1092** | `spec.rock === 'silver'`（165）、`spec.name === 'silver'`（290） | — | `tone` → MAT（119、219、244）；**依 tone 決定 `under`、`soft`（122、137）** | — |
| 盒的內側與紙 | — | `nashijiSide`（450）、**`nashijiInner`、`paperFleck`（463、465）** | — | — | `BOX_MATERIALS` 的旗標（122–128）是另一套 id，已經是資料驅動 |
| 顏色 | — | — | — | — | `export-glb.js:24` 另有一份 `MAT → 顏色`，和 `MATERIALS.color` 重複 |
| 預設值（沒列到的材質） | 1014 的 `else`：燈的發光色 | 字串都不符時是「在漆上」 | — | — | — |

### 1.3 地著色器逐行（47 行、84 個比較，`56fc135`）

**粗體**是 11/17 最後改動的行。

| 行 | 材質 | 決定的性質 |
|---|---|---|
| **932** | 19,20／23,24／21,22,12／21 | `cH`：`M_BANK_CH`、`5·smoothstep(.56,.72,g)`、`0`、`2.4`；`lH`：21 是 `.15`，其他 `.7`。水 `mat==12` 齊平（`cH=0`）是 11/17 加的 |
| 966 | 1 | 包漿：沉 |
| 967 | 6 | 包漿：沉與薄膜各半 |
| 968 | 2,3,4 | 包漿：依 `hs` 在 `.01–.14` 之間由沉轉薄 |
| 969 | 19,20,23,24 | 包漿：依 `fine.g` 在 `0–.3` 之間 |
| **970** | 21 | 包漿：依 `fine.g` 在 `0–.35` 之間 |
| **971** | 22 | 和 970 一字不差：銀洲浜 11/17 改成研出時複製了一行 |
| **972** | 12 | 包漿：齊平，包邊是 `.3·ring(.02,.06)`（水，11/17） |
| 973 | 5,7,8,10,11 | 包漿：研平的平嵌，包邊是 `ring(.42,.58)×inlay` |
| 974 | 9,17 | 包漿：無 |
| **992** | 1,12,19–24 | 套疏密，`M_AGE_BOKASHI` 加強；11/17 被 b2bf3ae、676c615、06529f8、29b4c05 四次改動 |
| 993–994 | 2,3 | 丘的地；994 給 3 加雲狀雜訊 |
| 1000 | 4 | 刑部；設 `kAmt` |
| 1001 | 5 | 金 |
| 1003 | 6 | 銀 |
| 1004–1005 | 7,8 | 切金、切銀：inlay 混合、`f0`、`rise` 下限、大片參數、線色 |
| **1006** | 9 | 貝 |
| **1007** | 10 | 平文金 |
| 1008 | 11 | 平文銀 |
| 1009 | 13 | 霞 |
| **1010** | 19–22 | **到不了**：992 已經先接走 |
| 1011 | 23,24 | **到不了** |
| 1012 | 17 | 珊瑚 |
| 1013 | 14 | 黑漆 |
| 1014 | （`else`） | 15、16、18、25–28 和沒列到的值 |
| **1017** | 21,23 | 大金片 `.3/5.2` |
| 1019–1020 | 7,8 | 箔閃；1020 選金箔或銀箔 |
| 1023、1026 | 19–22、`mat<=20` | 土坡入口；堤或洲浜（**依編號順序**） |
| 1032、1046、1048 | 19 | 金堤與銀堤的程式碼不同；背光面硫化 `1.`／`.6`；金堤再加深 |
| 1052 | 21 | 金洲浜或銀洲浜（程式碼不同） |
| 1078 | 23,24 | 遠山入口 |
| **1085、1088、1091、1092** | 23／24 | 粉色、不透明度曲線、大金片、稜線 |
| 1094 | （間接） | `kAmt>0`，也就是 2、3、4 |
| 1122、1132、1139 | 6、9、12 | 銀平目、青貝、流水 |
| 1168 | 2–4 | 作舊磨損 |
| 1172、1174、1179 | 1／2,3,4,12,19–24／2–4 | 開發視圖：分層、遮罩、切金 |

`M_AGE_CLEAR_*`、`M_FLAKE_NEW`（第 799–802 行，11/17）**不是材質分支**。它們是共用梨子地函式 `mNashiji` 的作舊常數，已經有名字，跟材質無關。所以不進材質表，留在原處。

### 1.4 一個材質分散在幾處（地著色器，逐行人工核對）

| 材質 | 處數 | 行 |
|---|---|---|
| 23 遠山金 | 10 | 932, 969, 992, 1017, 1078, 1085, 1088, 1091, 1092, 1172 |
| 19 金堤 | 9 | 932, 969, 992, 1023, 1026, 1032, 1046, 1048, 1172 |
| 21 金洲浜 | 8 | 932, 970, 992, 1017, 1023, 1026, 1052, 1172 |
| 12 水 | 5 | 932, 972, 992, 1139, 1172 |

### 1.5 測試裡寫死的材質

`scripts/plate.test.mjs` 沒有寫死數字的材質編號，都用 `MAT.xxx`，只有一個故意不合法的 `999`（474 行）。和材質表有關的測試：
- 每個網格、枝、印章的材質都在 `MATERIALS` 裡（1086、1158、1170 行）。
- 個別欄位的值（1056–1057、1253、1476 行）。

沒有任何測試檢查著色器裡的材質分支。

### 1.6 覆蓋率：十一區的地上實際出現的材質

用 `__kyotoPlatePose().ident` 數第 0 層 ident 圖裡每個材質的像素（800×600，ident 是半解析度）：

```bash
J=""; for w in minami:0 ukyo:1 nishikyo:2 yamashina:3 fushimi:4 kita:5 kamigyo:6 shimogyo:-1 higashiyama:-2 nakagyo:-3 sakyo:-4; do J="$J ${w%%:*}:${w##*:}:night-still:800x600:1:.5,.5"; done; PLATE_EVAL='(()=>{const p=window.__kyotoPlatePose(),c={};for(let i=1;i<p.ident.length;i+=2)c[p.ident[i]]=(c[p.ident[i]]||0)+1;return p.ward+" "+JSON.stringify(c)})()' node scripts/plate-shot.mjs .shots/mat-table/cov $J
```

- 有出現的：1、2、5、6、7、8、9、10、11、12、14（只有南區 116 px）、17、21、22、23、24。
- **3、4、13、19、20 在十一區都是 0。**
  - 3、4 現在只當立體部件的材質用。
  - 13 有自己的 ident 圖（`three-renderer.js:686`）。
  - 19、20（堤）目前沒有任何一區用在第 0 層。

所以跟這幾個材質有關的地著色器程式，截圖證明不了，要靠 §3.2 的材質替換。

## 2. 目標架構

### 2.1 分界

- **元件（資料）**：`mat.js` 放一張表 `MAT_LOOK`，每個 `MAT` 一列。維持現在的規則：`mat.js` 不 import 任何東西，所以 vocab.js、rock-mesh.js 都能讀它。欄位：
  - `density`：是否套疏密，以及作舊時的倍率。對應 992 行，也就是 11/17 那三個暗邊的根源。
  - `relief`：`{ch, chRidge?: [lo,hi], lh}`，齊平是 `ch: 0`。對應 932 行。
  - `coat`：`'sunk'|'edge'|'top'|'faint'` 加上地上的參數 `{field: 'hs'|'fineG'|'ring', lo, hi, gain}`。地和網格讀同一欄。
  - `tier`：調子層 `'ground'|'dense'|'pattern'`，給開發視圖和 `PLATE_TONE` 讀。
  - `flake`：大金片 `{d, cell, sq}`。
  - `fine`：`fine.g` 的意思，`'mask'|'height'|'powder'|'ridge'`。bake 怎麼畫和著色器怎麼讀，都以這欄為準。
  - `tone`：`'gold'|'silver'|'blue'`。
  - `recipe`：上色配方的編號。
  - 地以外的欄位（`rock`、`lacq`、`grain`、`under`、`soft`）留到第 3、4 步再加。
- **系統（行為）**：
  - **地著色器**讀 `density`、`relief`、`coat`、`tier`、`flake`、`recipe`。
  - **包漿**：地和網格都讀 `coat`。
  - **烘焙**讀 `fine`、`density`。
  - **量測**：`plate-shot.mjs` 讀 `tier` 的顏色約定。
  - **renderer** 讀 `recipe`、`rock`、`lacq`、`grain`。
- **上色配方**：每個配方一個 GLSL 函式，例如 `mRecipeBankGold`、`mRecipeSuhamaSilver`、`mRecipeToyama`、`mRecipeRyusui`、`mRecipeHirame`、`mRecipeAogai`、`mRecipeInlay`、`mRecipeHill`、`mRecipeDefault`。函式只讀傳進來的欄位，不認材質編號。全檔只有一處 `switch(T_RECIPE[mat])`。
- **成對的材質照實寫**：19/20、21/22 的金銀兩邊程式碼不同（1032、1052 行），拆成兩個配方，共用的段落寫成函式，不硬塞成「換一個顏色參數」。23/24 在 1088、1092 行的式子結構也不同，一樣照實處理。
- **預設值是一列**：第 0 列「沒列到的材質」等於現在 1014 行的 `else`。

### 2.2 表怎麼送進著色器

| 做法 | 好處 | 風險 | 結論 |
|---|---|---|---|
| **A. 建字串時把表產生成 GLSL 常數陣列** | 先例是 `COAT`、`DENSITY`；不占 sampler 或 uniform；常數在編譯期決定，有機會逐位元相同；`node:test` 可以直接測產生器 | 改表要重新編譯（表是靜態的，可以接受）；ANGLE／D3D11 對常數陣列的動態索引效能要量 | **建議** |
| B. DataTexture（每個材質一列，RGBA32F） | 執行中可以調 | 地已經用 6 張自己的貼圖，加上 three 的陰影與環境貼圖，手機上 16 個 sampler 的餘量要先查；多一次取樣 | A 的效能不及格時的備案 |
| C. uniform 陣列 | 執行中可以調 | 29 列 × 十幾個值吃掉幾十到上百個 vec4，手機 224 個 vec4 的下限不穩 | 不建議 |

做法 A 的注意事項：
- 產生器**不能用 `toFixed`**。`COAT_GLSL` 的 `toFixed(3)` 會截掉第三位以後，現有的值剛好都不超過三位才沒出事。改用 `String(v)`，整數補 `.`，並由測試檢查 `Number(literal) === v`。
- `mat` 來自一個位元組，索引前要夾到 `[0, N-1]`。

### 2.3 圍欄測試（`scripts/plate.test.mjs`）

- 每個 `MAT` 值都有 `MAT_LOOK` 列，每列每個欄位都合法。
- `MAKIE_GROUND_FRAG_GLSL` 的 `mat(==|!=|>=|<=|<|>)[0-9]` 數量為 0。唯一允許的分派寫成 `T_RECIPE[mat]`，不算在內。
- 第 3 步之後：`three-renderer.js` 不再出現 `spec.name ===`。
- 第 4 步之後：每個帶 `wedge`／`fade`／`tongue` 的填色，它所屬零件的材質 `fine` 欄要和標記一致。
- 這些是範圍圍欄，照 `AGENTS.md` §2 在檔內註明，由後續工作更新。

## 3. 怎麼證明畫面不變

### 3.1 先量到的事實（`56fc135`，臨時腳本放在 scratchpad，沒有新增依賴）

| 條件 | 夜：不同像素 | 夜：最大差 | 日：不同像素 | 日：最大差 |
|---|---|---|---|---|
| 現在的 `plate-shot.mjs`（`-still`），南區拍兩次 | 9.15% | 66/255 | 0.17% | 13/255 |
| 注入固定時鐘（`performance.now = () => 60000`） | 1.59% | 30/255 | 0.05% | 6/255 |
| 固定時鐘，只算差 >2 級的像素 | 305 px，集中在兩個角落 | | 1 px | |

- **原因**：`-still` 只停部件的動作，`uTime` 仍然是 `performance.now()`（`study.js:438`、`three-renderer.js:903`）。流水的線和箔閃（`uTime*9`）每次拍的相位都不同。
- **固定時鐘後剩下的差**，可能來自：
  - 彈簧的步長：`f.time` 不動時 `dt` 退回 `.016`，結果跟渲染了幾幀有關。
  - 游標軌跡的事件時間戳。
  - 繩子的物理。
- **降級圖當不了逐位元基準**：`scripts/plate-fallback-shots.mjs` 連跑兩次輸出到 scratchpad。
  - 第一次的 22 張 webp 逐位元組比對，跟 repo 裡的現有檔案全部不同。
  - 第二次在第 2 張就停了：要拍南區以外的區，畫面卻還是南區，正是 HANDOFF §4.5 記的換區按鍵被吃掉。
  - 它的格式是 webp 有損壓縮，品質從 84 往下調到檔案夠小為止，而且同樣走實際時間。
  - 所以降級圖只拿來做最後的回歸檢查（解碼後比像素、給容許差），不拿來當證明。
- 11/17 P5 那次把門檻訂在雜訊底附近（平均差 0.11/255），結果說不清楚。**這次的做法是先把雜訊壓到 0**，壓不到才用雜訊遮罩，不用平均差。

### 3.2 第 0 包要做的工具

1. **固定時鐘**：`plate-shot.mjs` 加 `PLATE_CLOCK=<ms>`，用 `Page.addScriptToEvaluateOnNewDocument` 在頁面載入前固定 `performance.now`，上表第二列就是這樣量的。剩下的雜訊源逐一固定。目標是同一份程式拍兩次 **0 個像素不同**。輸出 PNG。
2. **比對腳本** `scripts/plate-diff.mjs <dirA> <dirB> [--noise <dirA2>] [--tol N]`：
   - 用 node 內建的 zlib 解 PNG，不新增依賴。
   - 每張圖輸出 JSON：不同像素數、占比、最大通道差、超過容許差的像素數。另外輸出差異熱圖。
   - 有 `--noise` 時，把 A 與 A2 的差異當遮罩，只報遮罩外的差異。
3. **材質替換**：dev 專用的 `?matSwap=21:19,22:20,2:3,2:4,1:13`，上傳 ident 圖時替換材質值（`three-renderer.js:598` 附近，只在 `import.meta.env.DEV` 下生效）。目的是讓沒出現在任何一區的材質程式也跑得到。替換後畫面不好看沒關係，比的是改前改後同一張替換圖。
4. **覆蓋率表**：§1.6 的指令寫成腳本，每包驗收時輸出一次。

### 3.3 拍攝矩陣

```bash
J=""; for w in minami:0 ukyo:1 nishikyo:2 yamashina:3 fushimi:4 kita:5 kamigyo:6 shimogyo:-1 higashiyama:-2 nakagyo:-3 sakyo:-4; do for t in night day; do J="$J ${w%%:*}-$t:${w##*:}:$t-still:1440x900:1:.5,.5"; done; done; echo $J > .shots/mat-table/jobs.txt
```

每組的指令是 `PLATE_CLOCK=60000 node scripts/plate-shot.mjs .shots/mat-table/<組>/<before|after> $(cat .shots/mat-table/jobs.txt)`，每組 22 張、約 3 分鐘，用背景執行：

| 組 | 額外設定 | 證明什麼 |
|---|---|---|
| base | 無 | 一般畫面 |
| coat0 | `PLATE_SHOT_QUERY='?coat=0'` | 包漿關掉時的路徑（966–981 行只在 `KYOTO_COAT_ON` 下跑） |
| new | `PLATE_SHOT_QUERY='?years=0'` | `uAge=0`：作舊分支關閉 |
| vcoat | `PLATE_SHOT_QUERY='?dens=coat'` | `mKS/mKE/mKT` 直接畫成紅綠藍：包漿欄逐像素 |
| vkiri | `PLATE_SHOT_QUERY='?dens=kiri'` | 丘與切金的分類 |
| tone | `PLATE_TONE=1` | 調子層的分類，以及三層亮度數字 |
| swap | `PLATE_SHOT_QUERY='?matSwap=…'` | 3、4、13、19、20 的路徑 |

另外各拍一組 `PLATE_LIGHT=.02,.95`（光移到盤外），以及南區、伏見、上京的 375×812（手機）。

拍攝注意（HANDOFF §4.5）：
- 拍的時候不能有別的頁面佔 GPU。
- 核對每張輸出的 `"ward"`。
- 改著色器不用 `sed -i`。
- 只結束自己啟動的 Chrome（記 PID）。

```bash
node scripts/plate-diff.mjs .shots/mat-table/base/before .shots/mat-table/base/after --noise .shots/mat-table/base/before2
```

### 3.4 驗收的兩個等級

- **甲級：只換條件式**（第 1 步）。
  - 七組 × 22 張，加上光在盤外、手機，**全部 0 個像素不同**。
  - 第 0 包壓不到零雜訊時，差異只能落在 before 對 before2 的雜訊遮罩內，最大差也不能超過那一對。
  - 開發視圖本來就是純色，一律要 0。
- **乙級：收攏配方**（第 2 步）。式子搬了位置，編譯器可能重排浮點運算。
  - 一般畫面：遮罩外最大通道差 ≤2/255，遮罩外的差異像素 ≤0.1%。熱圖不能出現沿著材質輪廓或成片的形狀。
  - 開發視圖仍然要 0。
  - `PLATE_TONE` 三層的 L25／L50／L75 改前改後差 ≤0.5。
- **兩級都要**：
  - 四項檢查（下面的指令）全過，WARN 不增加。
  - 效能：375×812、`PLATE_CPU=4`，換區最長幀與閒置幀不比改前多 10% 以上，改前改後各跑兩次。量法沿用 `docs/plans/2026-11-16-clip.md` 第 86 行。
  - 第一次建區的 `buildMs` 改前改後並列。
  - 降級圖解碼後的像素差，列進報告當參考。

```bash
npm run lint
```

```bash
npx --no-install tsx validate_data.js
```

```bash
npm test
```

```bash
npm run build
```

## 4. 怎麼回退

- 在 `claude/data-1117` 上開工作分支（建議 `claude/mat-table`），每步一個 commit，commit 說明附比對 JSON 的摘要。
- 某一步出問題就 `git revert <該步 sha>`。後面的步驟依賴前面的，所以從後往前退。第 0 包的工具都是 dev 專用，可以單獨保留。
- **不做新舊兩條路的開關**。開關會讓舊分支和新的表同時存在，等於又一個耦合。新舊對照靠 git 和改前的截圖。
- 改前的截圖存在 `.shots/mat-table/*/before`，不 commit；資料夾名稱記下 base SHA。
- 合併進 `main` 以後才發現問題，就 `git revert -m 1 <合併 commit>`。合併與 push 照合約分開問使用者。

## 5. 分步、執行者、驗收

**執行者**依 2026-11-18 00:41 的額度（`quota` skill，已寫進 `~/.claude/QUOTA.md`）：
- Claude：週（所有模型）23%，週（Fable）8%，算出來 Fable 週占比 4%、其他模型 19%、時間進度約 31%。**Fable 落後**，照全域合約連可拆的包也由 Fable 自己跑。
- Codex 見底，Gemini 週剩 38%（偏低）。
- 第 1–3 步本來就是同一個檔上前後相依的一條鏈，`AGENTS.md` §3 也要求單一寫入者，不拆給多個代理。
- 開工時要使用者在 App 開一個 **Fable 工作階段**。本工作階段是 Opus，不自己切模型。
- 開工前重查一次額度：Fable 若超前時間進度，第 0 包改派 Sonnet 子代理。

| 步 | 內容 | 可改的檔 | 執行者 | 驗收 |
|---|---|---|---|---|
| **0 工具** | 固定時鐘、固定其餘雜訊源、PNG 輸出；`plate-diff.mjs`；dev 專用 `?matSwap=`；覆蓋率腳本 | `scripts/plate-shot.mjs`、`scripts/plate-diff.mjs`（新）、`three-renderer.js`（只動 dev 專用段落）、`study.js`（如果固定時鐘必須在這裡） | Fable（Fable 超前時改 Sonnet 子代理） | 同一份程式拍兩次 22 張：0 個像素不同，做不到就附雜訊表後停；不帶參數的正式畫面與 `56fc135` 比較在甲級內；四項檢查全過 |
| **1 只換條件式（甲級）** | `mat.js` 加 `MAT_LOOK`，值從現在的式子逐字抄；`three-pack.js` 產生 `T_*` 常數陣列；932、966–974、992、1017、1019、1168、1172、1174、1179 行改成讀表，控制流與常數不動；加上「每個 MAT 都有列」的測試 | `mat.js`、`three-pack.js`、`scripts/plate.test.mjs` | Fable | §3.4 甲級；效能 ≤10% |
| **2 收攏配方（乙級）** | 992–1014 的底層混合與 1019–1166 的程序寫成配方函式；`switch(T_RECIPE[mat])` 只出現一處；合併 970／971；依 §6 的決定處理 1010／1011；加上 `mat==\d` 為 0 的圍欄 | `mat.js`、`three-pack.js`、`scripts/plate.test.mjs` | Fable；「專案待辦事項討論」終審 diff | §3.4 乙級；`grep -cE "mat(==\|!=\|>=\|<=\|<\|>)[0-9]+" src/studies/toji/plate/three-pack.js` 為 0；效能 ≤10% |
| **3 renderer 的字串判斷** | `three-renderer.js` 的 `coatClass`、`isCoat`、`isLacq`、`isRockP`、`isPowder`、`isLeaf`、`spec.rock`、樹的 `silver`，改讀 `MAT_LOOK` 的 `coat`、`recipe`、`tone`；`rock-mesh.js:240` 同一個判斷一起收；**貝、珊瑚的包漿類別保持現狀**（地上無、網格上淡），除非使用者在 §6 決定統一 | `mat.js`、`three-renderer.js`、`rock-mesh.js`、`three-pack.js`（`MATERIALS` 的 `rock` 欄搬家）、`scripts/plate.test.mjs` | Fable | 甲級（只是換鍵，網格的 shader 字串應該逐字相同：測試可以直接比對改前改後產生的 shader 字串）；`spec.name ===` 為 0 的圍欄 |
| **4 bake 與 doha** | `fine` 欄寫明 `fine.g` 的意思，`bake.js` 依零件材質的 `fine` 欄選畫法；doha 的 `tone → MAT` 與依 tone 的 `under`／`soft` 搬進表；`export-glb.js` 的重複顏色表改讀 `MATERIALS` | `mat.js`、`bake.js`、`doha.js`、`export-glb.js`、`scripts/plate.test.mjs` | Fable | 烘焙輸出（fine、soft、ident、疏密、接觸）逐位元相同（node 可以直接比 typed array，不必拍圖）；加上甲級截圖 |

第 3、4 步範圍較大，要等第 1、2 步完成、使用者看過結果再開工（§6 第 4 項）。

### 什麼時候停下來問

- 第 0 包做不到零雜訊，雜訊遮罩也不穩（拍三次，遮罩彼此差很多）：附數字停下，問使用者能不能只用開發視圖加遮罩規則驗收。
- 第 1 步出現遮罩外的差異：**不准調表的數值去湊**。找出哪一行的替換改了語意，修替換本身；兩次修不好就停。
- 有一段行為寫不成「表的欄位＋一處分派」，除非改公式：列出行號和原因，提出方案再問。
- 要刪掉沒被任何一區用到的路徑（3、4、13、19、20），或到不了的程式：使用者決定前保留。
- 效能變差超過 10%：先換做法 B 量一次再回報。
- 發現現有行為像是錯的：記下來，不在解耦的步驟裡順手修。解耦只保證行為不變。
- 另一個工作階段在同一個 checkout 寫同一個檔：停，不寫。

## 6. 要使用者決定的

1. **方向**：`mat.js` 放 `MAT_LOOK` 一張表（元件），地著色器、包漿、烘焙、量測讀欄（系統）。著色器用產生的常數陣列，配方函式只分派一次。同意的話照第 0–2 步做。
2. **死路徑**：
   - 1010、1011 兩行永遠到不了。建議第 2 步刪掉，行為不變。
   - 3、4、13、19、20 在十一區的地上都沒出現。建議先保留，用 `?matSwap` 證明行為不變，要不要刪以後另外決定。
3. **貝、珊瑚的包漿**：地上完全不上，網格上是「淡」。同一個概念兩處結果不同。統一會改變畫面，所以解耦時保持現狀，只把它寫成表裡看得見的兩個值。要不要統一，由你決定。
4. **第 3、4 步**：renderer 的字串判斷、bake 與 doha 的標記，要接著第 1、2 步做，還是等看過第 1、2 步的結果再說。

## 7. 終審意見（2026-11-18，「專案待辦事項討論」，Fable 5.2）

**結論：通過，附兩項必修；兩項都要在第 1 步開工前補進本提案，不擋使用者核准方向。**

### 7.1 抽查過的（對得上程式，`claude/data-1117` @ `5a288af`）

| 提案的說法 | 怎麼查 | 結果 |
|---|---|---|
| 地著色器 47 行、84 個比較 | §1.1 的 grep，`-c` 與 `-o \| wc -l` | 47、84 |
| 1010、1011 兩行到不了 | 讀 992 行的條件：`mat==1\|\|mat==12\|\|(mat>=19&&mat<=22)\|\|mat==23\|\|mat==24` 已先接走 | 成立 |
| 970、971 一字不差 | 讀兩行 | 成立（971 是終審者 11/17 複製的） |
| `uTime` 走實際時間 | `three-renderer.js:903`：`shared.uTime.value = (f.time / 1000) % 3600`，`f.time` 來自 `study.js` 的 `performance.now()` | 成立 |
| `export-glb.js` 另有一份 MAT → 顏色 | 讀第 20–25 行 | 成立 |
| `rock-mesh.js:240` 又判斷一次粉的岩 | 讀該行 | 成立 |
| 這個 commit 只動文件 | `git show --stat c3f92c1` | 只有 `HANDOFF.md` 與本檔 |

**沒有重跑的**：§3.1 的雜訊表、§1.6 的覆蓋率、§5 的額度數字。這三項是提案自己量的。

### 7.2 必修一：`?dens=coat` 現在畫出來是黑的，vcoat 組證明不了包漿欄

- `three-pack.js:1176`：`if(uDensView>.5){mKS=0.;mKE=0.;mKT=0.;}`（任何開發視圖都先把包漿三個量歸零）。
- `three-pack.js:1178`：`if(uDensView>5.5)outgoingLight=vec3(mKS,mKE,mKT);`（包漿視圖在歸零之後才輸出）。
- 所以地面上 `?dens=coat` 輸出的是 (0,0,0)。這是讀程式得到的，還沒有拍圖確認；第 0 包先拍一張確認。
- 後果：§3.3 的 vcoat 組比的是兩張黑圖，966–974 行（含 970／971 與水那一行）只剩一般畫面在蓋。
- 要補的：
  - 第 0 包多一項工具：修這個視圖（輸出移到歸零之前，或歸零排除包漿視圖）。只動開發視圖，正式畫面不變，照甲級驗。
  - 第 0 包的驗收多一條：vcoat 的圖在地面上紅、綠、藍三色都出現，而且不是全黑。

### 7.3 必修二：`MAT_LOOK` 做完之後，哪張表擁有什麼

- 現在以材質為鍵的表已經有三張：`three-pack.js` 的 `MATERIALS`（顏色、金屬度、粗糙度、清漆、`aged`、`rock`）、`export-glb.js` 的顏色表、以及將要新增的 `MAT_LOOK`。
- 提案只寫了 `rock` 欄搬家和 `export-glb.js` 改讀 `MATERIALS`，沒有寫終點。照使用者的規則（一個概念的性質只定義在一處），「材質」不能有兩張各自維護的表。
- 終審者的建議：**終點是一張表**，放在不 import 任何東西的 `mat.js`。`MATERIALS` 改成由那張表導出（導出值不是第二個來源），`export-glb.js` 的顏色也讀它。`BOX_MATERIALS` 是另一個概念（盒的部位，id 是 20–28 的另一套），維持獨立。
- 做不到一張表時（例如第 1、2 步先不動 `MATERIALS`），要寫明過渡期的分工：哪些欄只在 `MATERIALS`、哪些只在 `MAT_LOOK`、欄位不得重疊，並加圍欄測試（每個 `MAT` 在兩張表都有列；兩張表沒有同名的欄）。併表排在哪一步也要寫。

### 7.4 開工時要留意的（不擋）

- **雜訊表只量了南區，而南區不必換區。** `plate-shot.mjs` 靠按鍵換區，換區動畫與開合都吃 `performance.now()`。在頁面載入前把時鐘釘死，其他十區的換區可能走不完。第 0 包要先確認：是換區完成後才凍結時鐘，還是給一個每幀固定前進的假時鐘。這是實驗性質，§5 的停損條件有涵蓋。
- **拍攝量很大**：七組 × 22 張，改前改後各一次，每步約 40 分鐘的 GPU 時間。拍的時候不能有別的頁面佔 GPU（HANDOFF §4.5），所以這段時間同一台機器上的其他預覽要關。
- `main` @ `56fc135` 的資料修正（792 筆變 734 筆）是另一條線做的，終審者沒有審；它不動 `plate/`，不影響本提案的基準。

### 7.5 有預設的三項（不必問使用者；使用者可以否決）

| 提案 §6 的項目 | 預設 |
|---|---|
| 1010、1011 兩行到不了的程式 | 第 2 步刪掉 |
| 3、4、13、19、20 沒被任何一區用到的路徑 | 保留，用 `?matSwap` 驗 |
| 貝、珊瑚的包漿（地上無、網格上淡） | 維持現狀，表裡照實寫成兩個值；要不要統一另案處理，因為會改變畫面 |
| 第 3、4 步（renderer、bake 與 doha） | 等第 1、2 步完成、使用者看過再開 |

### 7.6 執行者的建議

提案寫「要使用者另開一個 Fable 工作階段，由終審者審 diff」。終審者本身就是 Fable、手上有每一處分支的來龍去脈（多數是 11/16–17 自己加的），全域合約也寫 Fable 用量落後時自己做。所以建議**第 0–2 步在終審者這個工作階段做**。把關不靠同一個人審自己的 diff，而靠 §3.4 的逐像素比對與圍欄測試；每步的比對 JSON 摘要寫進 commit 說明。使用者不同意就照提案另開。

### 7.7 真正要使用者決定的只有一件

照本提案做第 0–2 步嗎？（同意的話，先補 §7.2、§7.3 兩項，再從第 0 包開始。）

## 8. 執行紀錄（2026-11-18 起，Fable 5.2，分支 `claude/mat-table`，base `claude/data-1117` @ `c1a0909`）

這一節是動手前寫的設計定案，之後每一步的結果往下加。對話被壓縮時從這裡接回來。

### 8.1 兩項必修的定案

- **包漿視圖**（§7.2）：第 0 包修 `three-pack.js` 的開發視圖：包漿三個量的歸零排除包漿視圖（`uDensView>5.5`）。驗收：`PLATE_VIEW=6` 的圖在地面上紅、綠、藍都出現。
- **哪張表擁有什麼**（§7.3）：終點是一張表。
  - `mat.js` 的 `MAT_LOOK`：每個材質一列，欄是性質。第 1、2 步放地著色器讀的欄。
  - `three-pack.js` 的 `MATERIALS`（立體部件的顏色、金屬度、粗糙度、清漆、`aged`、`rock`）在第 3 步併進 `MAT_LOOK`（成為 `mesh` 欄），`MATERIALS` 改成由表導出的常數；`export-glb.js` 的顏色表在第 4 步改讀它。
  - 過渡期（第 1、2 步之後、第 3 步之前）：`MAT_LOOK` 只放地上的性質，`MATERIALS` 只放立體部件的性質，兩者沒有同名的欄；圍欄測試檢查「`MATERIALS` 的每個鍵在 `MAT_LOOK` 都有列」與「兩張表沒有同名的欄」。
  - `BOX_MATERIALS` 是盒的部位（另一套 id），不併。

### 8.2 第 0 包的做法（和 §3.2 不同的地方）

- **時鐘釘在渲染器裡，不覆寫 `performance.now`。** `study.js` 的 `tick(time)` 用的是 rAF 給的時間戳，覆寫 `performance.now` 管不到。dev 專用 `?clock=<ms>`：`three-renderer.js` 把 `uTime`、`life.update` 的時間固定在這個值，游標軌跡的強度一律為 0。app 自己的動畫時鐘不動，換區照常走完。
- **比的是盤自己的像素。** `PLATE_CLOCK` 模式下，截圖前把 `#scene` 以外的元素藏起來（背景的雲帶是別的 canvas，會飄）。
- **`plate-shot.mjs` 自己核對**每張拍到的區（`dataset.renderedWard`）與日夜，不符就重拍一次，再不符就以非零退出。
- **`PLATE_VIEW=<n>`**：拍之前把 `uDensView` 設成 n（2 遮罩、4 切金、5 分層、6 包漿）。
- **材質替換** `?matSwap=a:b,…`（dev 專用）：上傳 ident 圖前把材質 a 換成 b。
- 覆蓋率不另寫腳本，用 §1.6 的指令。
- **拍攝矩陣縮小**（理由：第 1 步另有不靠 GPU 的窮舉檢查，見 8.3）：base 日夜 22 張（同時量 `PLATE_TONE`）；`?coat=0` 夜 11；`?years=0` 日 11；開發視圖 4、5、6 各 11（日）；`?matSwap` 日 11；光在盤外日 11；手機三區。每一輪約 100 張。
- **紀律**：拍圖進行中不改 `src/`（dev server 會重載無頭頁面）；先關掉其他開著 localhost:3000 的頁面；只結束自己開的 Chrome（記 PID）。

### 8.3 第 1 步的設計：只換判斷式（甲級）

`mat.js` 的 `MAT_LOOK` 欄位（第 1 步）：

| 欄 | 值 | 取代 `56fc135` 的哪一行 |
|---|---|---|
| `ch` | 浮雕高度：預設 2.4、堤 15、遠山 5、齊平 0 | 932 的 `cH` |
| `chRidge` | 真：`ch` 再乘 `smoothstep(.56,.72,fine.g)`（遠山 23、24） | 932 |
| `lh` | 線的浮雕：金洲浜 .15，其餘 .7 | 932 的 `lH` |
| `coat` | 包漿類別：`top`（預設）、`sunk`（1）、`half`（6）、`foot`（2–4）、`powder30`（19、20、23、24）、`powder35`（21、22）、`waterEdge`（12）、`inlayEdge`（5、7、8、10、11）、`none`（9、17） | 966–974 |
| `density` | 套不套疏密場（1、12、19–24） | 992 的條件 |
| `flakeD`、`flakeCell` | 大金片（21、23：.3、5.2） | 1017 |
| `foil` | 箔閃（7、8） | 1019 |
| `tone` | `gold`、`silver`、`blue` | 1020 |
| `hill` | 丘的地（2、3、4） | 1168、1179 |
| `tier` | 調子層：`ground`（1）、`dense`（2、3、4、12、19–24）、`pattern` | 1172、1174 |

- 著色器端：`three-pack.js` 由表生成 `const float T_CH[N]`、`const int T_COAT[N]` 等陣列與具名常數（`COAT_SUNK` 等），索引前把 `mat` 夾到 `[0, N-1]`。第 0 列是「沒列到的材質」。
- **只被挑選、原樣流進運算的數**（`ch`、`lh`、大金片參數）進表；**當成內建函式常數參數的**（`smoothstep` 的門檻，例如包漿的 .3 與 .35）第 1 步留在原地，所以包漿先分成 `powder30`、`powder35` 兩類，第 2 步才合併成一類加數值欄。有像素不同先懷疑這裡。
- **窮舉檢查**（不靠 GPU）：材質編號只有 0–28。測試裡把 `56fc135` 每個被換掉的判斷式照抄成 JS，對每個編號和表導出的結果比，必須全等。沒有任何一區畫到的 3、4、13、19、20 也因此有證明。
- 圍欄：每個 `MAT` 都有列；類別只能和具名常數比，不能和裸數字比。

### 8.4 第 2 步的設計：收攏配方（乙級）

- 內嵌在 three 的 `main()` 裡的那一段搬不出函式，所以工作中的量（`c`、`dens`、`tint`、`f0`、`wN`／`wM`／`wS`、`kAmt`、`bigX`、`bigG`、`kiriV`、`kiriB` 等）收成一個 struct，配方函式放進宣告區（`MAKIE_GROUND_PARS_GLSL`）。
- 每個材質的路徑是「底 → 共用的鋪粉（梨子地＋金屬＋片、大金片）→ 上層」；同一材質內的先後不動（丘的 2、3、4 是底 → 鋪粉 → 切金半調 → 磨損）。
- 配方（`recipe` 欄）：`ground`（1）、`hill`（2、3；3 多一個雲狀雜訊的旗標）、`gyobu`（4）、`gold`（5）、`hirame`（6）、`foil`（7、8）、`aogai`（9）、`sheetGold`（10）、`sheetSilver`（11）、`ryusui`（12）、`kasumi`（13）、`lacquer`（14）、`coral`（17）、`bankGold`（19）、`bankSilver`（20）、`suhamaGold`（21）、`suhamaSilver`（22）、`toyama`（23、24，`tone` 欄分金與青金）、`lamp`（預設）。
- 全檔只有一處分派。先用 `ryusui`（有貼圖取樣、`fwidth`、迴圈）打通整條機制：console 無編譯錯誤、手機尺寸 4 倍降速的幀時間沒有變差、有池的區在乙級內，再轉其他配方；一次轉一個、各自提交、每次只拍畫到它的區，全矩陣最後跑一次。`switch` 在 ANGLE 上不行的話，退路是單一一條 if／else-if 鏈（仍然只有一處分派）。
- 到不了的 1010、1011 兩行刪掉；包漿 `powder30`／`powder35` 合併成 `powder` 加 `coatHi`；970／971 因此合併。
- 圍欄：`three-pack.js` 的地著色器裡 `mat(==|!=|>=|<=|<|>)[0-9]` 為 0。

### 8.5 推送的條件

- 第 0、1 步驗收通過即可合併與 push；第 2 步若觸發 §5 的停損，不推第 2 步，回報停在哪。
- 這次合併會連帶帶上 `claude/data-1117` 上還沒進 `main` 的文件 commit（skill 的交接與備份、本提案）。

### 8.6 停在這裡（2026-11-18 01:12，使用者：5 小時額度快到，一個段落先停）

**已完成、已提交在 `claude/mat-table`（都沒有合併、沒有 push）**
- `49978c8` 第 0 包的工具：`?clock=`（時鐘釘在渲染器裡）、`plate-shot.mjs` 的 `PLATE_CLOCK`（只拍盤、核對區與日夜、錯了重拍）與 `PLATE_VIEW`、`scripts/plate-diff.mjs`、`?matSwap=`、`scripts/plate-matrix.sh`；包漿視圖修好（不再是黑的：實拍右京，紅 9%、藍 7%，其餘是盤外的黑）。
- 零雜訊已達成：固定時鐘下同一份程式拍兩次（南夜、需要換區的北日），`plate-diff` 0 個像素不同。只驗了這兩張，整組 22 張的重拍還沒做。
- `71aecab` `.gitattributes`（shell 腳本維持 LF）。
- lint exit 0；test 149/149、17/17（第 0 包之後）。

**做到一半**
- 「改前」的基準矩陣（`.shots/mat-table/before/`，不提交）：`base` 22 張、`coat0` 11 張拍完，`new` 拍到一半時停掉，其餘（`v4 v5 v6 swapA swapB lightoff mobile`）還沒拍；`before2`（驗零雜訊的重拍）還沒拍。基準對應的程式是 `49978c8`（之後沒有改 `src/`）。
- 第 1 步的修改腳本寫好了、還沒套用：[`material-table/step1-patch.py`](material-table/step1-patch.py)（在 repo 根目錄執行 `python docs/plans/material-table/step1-patch.py`）。它做三件事：`mat.js` 加 `MAT_LOOK`；`three-pack.js` 由表生成常數陣列，並把 §8.3 列的判斷式換成讀表；`plate.test.mjs` 加窮舉檢查與圍欄。在暫存副本上試跑過：每個取代都對得上，地著色器的材質編號比較從 47 行 84 個降到 29 行 34 個（剩下的是第 2 步的配方）。還沒有在瀏覽器裡編譯過。

**接下來的順序**
1. 補拍基準：`bash scripts/plate-matrix.sh .shots/mat-table/before new v4 v5 v6 swapA swapB lightoff mobile`，再 `bash scripts/plate-matrix.sh .shots/mat-table/before2 base v6 swapA` 並用 `plate-diff` 確認三組都是 0。一輪約 20 分鐘，背景指令有 10 分鐘上限，要分批跑。拍的時候不改 `src/`。
2. 套用第 1 步的腳本 → `npm test`（窮舉檢查要過）→ 拍 `.shots/mat-table/after1` → 每一組 `node scripts/plate-diff.mjs before/<組> after1/<組>` 都要 0 個像素不同（甲級）→ 提交。
3. 第 2 步照 §8.4。做法的補充：配方函式的本體用腳本從現有程式**逐字切出來**（不重打），struct 的欄位用 `#define` 對回原本的區域變數名（函式定義完就 `#undef`），所以本體一字不改；struct 參數取名 `S`（丘那一段有區域變數叫 `g`）。`bigX`、`bigG` 的宣告要改成賦值。7、8 的大金片參數（.4、7、方片 1）一併進表。配方：`ground hill gyobu gold hirame foil aogai sheet ryusui kasumi lacquer coral bank suhama toyama lamp`；`bank`、`suhama`、`toyama`、`foil`、`sheet` 在函式裡讀 `tone` 欄分金銀。套用後先看 console 有沒有編譯錯誤、拍一區，再跑全矩陣（乙級）。
4. 四項檢查、效能（375×812、`PLATE_CPU=4`）、降級圖；然後合併 `main` 並 push（使用者已同意：做完並驗收後推上去），確認部署。
5. 最後寫圖資那條線的交接與計劃（使用者要另開工作階段做，不在這裡接）。

### 8.7 續做（2026-11-18 21:18 起）

- **基準和「改後」要在同一次開機、同一個 dev server 與同一個 Chrome 裡拍。** 昨晚拍的 `base` 組和今天（重開機、重開 dev server 之後）同一份程式重拍的，22 張都有約 0.2% 的像素差 1–2 級（合計 28,563 個像素，最大差 2）；今天連拍的兩組 `v6` 則 11 張都是 0。跨一次重開機的差異原因沒有查（可能是瀏覽器自動更新或顯示卡狀態），做法是昨晚的基準作廢（留在 `.shots/mat-table/before_old`），今天全部重拍。
- 第 2 步的修改腳本也寫好了：[`material-table/step2-patch.py`](material-table/step2-patch.py)。在暫存副本上接著第 1 步的腳本試跑過：地著色器裡的材質編號比較降到 0，`three-pack.js` 與 `mat.js` 語法檢查通過；GLSL 還沒在瀏覽器裡編譯過。
- 和 §8.4「一次轉一個配方、各自提交」不同的地方：配方本體是腳本從現有程式逐字切出來的，而且「只有一處分派」沒辦法和轉到一半的舊分支並存，所以第 2 步一次轉完；套用後先看 console 有沒有編譯錯誤、拍一區確認，再跑全矩陣。有差異時用各區的差異範圍回推是哪個配方。

### 8.8 第 0–2 步的結果（2026-11-18 22:00，分支 `claude/mat-table`）

| commit | 內容 |
|---|---|
| `49978c8` | 第 0 包：`?clock=`、`PLATE_CLOCK`／`PLATE_VIEW`、`plate-diff.mjs`、`?matSwap=`、`plate-matrix.sh`；包漿視圖修好 |
| `ec1a9df` | 第 1 步：`MAT_LOOK` 與常數陣列，共用性質的判斷式改讀表（比較 84 → 34） |
| `d99774d` | 第 2 步：配方函式與一處分派（比較 34 → 0），刪掉兩行到不了的分支，合併重複的包漿分支 |

**現在的結構**
- `mat.js` 的 `MAT_LOOK`：每個材質一列。欄：`ch`、`chRidge`、`lh`、`coat`、`coatHi`、`density`、`flakeD`、`flakeCell`、`flakeSq`、`foil`、`tone`、`hill`、`cloud`、`tier`、`recipe`。
- `three-pack.js`：`MAT_LOOK_GLSL`（由表生成的常數陣列與具名常數）、`MAKIE_GROUND_RECIPES_GLSL`（16 個配方函式、共用的 `mLay`／`mDohaKiri`／`mHillOver`、唯一的分派 `mRecipe`）。地著色器的主體只剩共用的部分：浮雕、包漿、疏密、開發視圖，全部讀表。
- **加一種材質**：在 `MAT` 加編號、在 `MAT_LOOK` 加一列（選一個既有的配方，或寫一個新配方函式並在 `RECIPE` 與 `mRecipe` 各加一行）。不要在著色器裡比材質編號；測試會擋。
- 配方函式裡 struct `MG` 的欄位用 `#define` 對回主體原本的變數名（函式定義完就 `#undef`），所以本體是從舊程式逐字搬過來的。

**證明**（基準與比對都是今天同一次開機拍的；指令 `bash scripts/plate-matrix.sh <dir>` 與 `node scripts/plate-diff.mjs before/<組> <after>/<組>`）

| | 第 1 步（甲級） | 第 2 步（乙級） |
|---|---|---|
| 窮舉檢查（材質 0–28，對照 `56fc135` 的判斷式；`npm test`） | 通過 | 通過（含配方、雲、方片的欄） |
| 106 張裡逐像素相同 | 101 | 98 |
| 有差異的 | 5 張，各 1–3 個像素、差 1 級；逐張重拍後差異都沒有重現（是雜訊） | 8 張，各 1–3 個像素、差 1 級；其中 5 張重拍後差異會重現（同一個像素），其餘 3 張沒有重拍 |
| 最大通道差 | 1 | 1（門檻 ≤2） |
| 容許差 2 級比對 | — | 106 張全部通過 |
| `base`（十一區日夜）、材質替換 A／B、光在盤外、手機、分層視圖、包漿視圖 | 全部 0 | 全部 0 |

- **雜訊的實情**：固定時鐘後，同一份程式連拍，`base` 22 張與包漿視圖 11 張都是 0；但整個矩陣裡大約每二十張有一張會閃 1–3 個像素（差 1 級），位置不固定，原因沒有查。所以第 1 步的判準是「差異要在重拍時重現才算」，五張都沒有重現。
- **和提案 §3.4 不同的地方**：乙級寫「開發視圖仍然要 0」，實際上切金視圖（`PLATE_VIEW=4`）有 1 張差 1 個像素、1 級，而且會重現。那個視圖輸出的是連續值（切金的覆蓋度），不是純色，所以會受浮點運算順序影響；分層與包漿兩個視圖是 0。
- 第 2 步會重現的差異都是單一像素、差 1 級：式子沒有變，只是搬進函式後編譯出來的運算順序不同。

**效能：只量到 CPU 那一側，GPU 的幀成本沒有量到前後對照**（375×812、`PLATE_CPU=4`、換區後 3.5 秒內的 rAF 間隔，各三次；`.claude/dispatch/perf.sh`，不提交）

| 換到 | 最長幀 改前 → 改後（ms，三次） | 中位幀（ms） |
|---|---|---|
| 東山 | 434、444、381 → 411、394、402 | 4.2 → 4.2 |
| 西京 | 99、109、109 → 108、116、99 | 4.2 → 4.2 |

- 上表的中位幀 4.2 ms 是螢幕更新率的上限，不是著色器的成本；`PLATE_CPU=4` 只拖慢 CPU，而這次改的是片段著色器。所以 §3.4「閒置幀不比改前多 10%」**沒有證據**。
- 另外試了關掉幀率上限的無頭 Chrome（全新 profile、1920×1200、演示進行中）：改後兩次的中位幀是 0.9、1.0 ms，載入到第一幀 661、640 ms，`buildMs` 221、200。量測腳本第三次卡住、改用別的做法又被權限擋下，所以**沒有量到改前的數字**，這三個數只能說明這台桌機上絕對值很小，不能當前後對照。
- 換區的最長幀與 `buildMs`（CPU）前後沒有差別。

**其他圖形後端**：D3D11（平常用的）與 OpenGL（`--use-angle=gl`）都編譯通過、console 沒有錯誤、盤有畫出來。SwiftShader（軟體渲染）那次瀏覽器在截圖前就結束了，沒有結果，沒有追查。

**著色器編譯失敗時不會退到靜態圖**：`renderer.js` 只在沒有 WebGL2、three.js 載入或啟動失敗、context 遺失時改用降級圖；著色器編譯或連結失敗時 three.js 只記錯誤、那個材質不畫。所以若某支手機的驅動不接受這次的寫法（常數陣列用變數索引、`switch`、struct 的 `inout`），盤面會是空的。這是既有的行為，但這次的改動讓它值得補：之後可以在建盤後檢查 `renderer.info.programs` 的 `diagnostics.runnable`，失敗就丟例外讓 `renderer.js` 改用降級圖（沒有做）。

**回退**：`git revert d99774d`（第 2 步）或 `git revert d99774d ec1a9df`（連第 1 步），跑四項檢查後 push；push 要使用者同意。

**檢查**：`npm run lint` exit 0；`validate_data.js --strict` ERROR 0／WARN 0；`npm test` 151/151、17/17；`npm run build` exit 0；`plate-clip` findings 0。console 沒有著色器編譯錯誤。

**沒做／沒驗證**
- 第 3 步（`three-renderer.js` 的 `spec.name ===`、`spec.rock` 等字串判斷，`MATERIALS` 併進 `MAT_LOOK`）與第 4 步（`bake.js` 的填色標記、`doha.js` 的 tone 對應、`export-glb.js` 的顏色表）。過渡期的分工有圍欄測試守著（兩張表沒有同名的欄）。
- 降級圖沒有重拍：盤面的像素沒有變。
- 實機沒看；只在這台機器的無頭 Chrome（桌機 GPU）上驗過。手機的 GPU 驅動對 `switch` 加函式呼叫的編譯結果沒有驗過。
- 雜訊的來源沒有查。跨一次重開機的 1–2 級差異也沒有查（§8.7）。

### 8.9 第 2 步上線後退掉：著色器第一次編譯卡 48.6 秒（2026-11-18 22:40）

- **經過**：第 0–2 步合併並 push（`0ab5235`）後，照計劃用使用者的 Chrome 打開線上頁面。第一次查詢頁面逾時（主執行緒 45 秒沒有回應）；重新載入就正常（著色器已進瀏覽器的快取）。
- **重現與定位**（本機 dev server、使用者的 Chrome、桌機 D3D11；在地著色器加一個不用的常數讓快取失效，讀頁面的 long task）：

| 著色器 | 第一次載入最長的工作 |
|---|---|
| 改前（`71aecab`） | 333 ms |
| 第 1 步（`ec1a9df`：表與常數陣列） | 315 ms |
| 第 2 步（`d99774d`：配方函式、`switch`、struct） | **48,594 ms** |

- **原因的假設（沒有驗證）**：ANGLE 把 GLSL 轉成 HLSL 交給 D3D 的編譯器；`switch` 的每個 case 呼叫一個含隱式導數取樣（`texture`、`fwidth`）與迴圈的函式，編譯器要把這些全部攤平才能在分支裡算導數，編譯時間暴增。舊寫法同樣的內容放在主體最外層的 `if` 裡，沒有這個問題。
- **為什麼驗收沒有擋到**：
  - 無頭 Chrome 的量測（全新 profile）載入到第一幀只有 0.65 秒，和真的 Chrome 不一樣；原因沒有查。**所以編譯時間不能在無頭 Chrome 裡量，要用真的瀏覽器。**
  - 逐像素比對只看畫面，看不到編譯時間。
  - 提案 §3.4 的效能門檻量的是幀時間，沒有「第一次載入」這一項。
- **處理**：`git revert d99774d`（commit `5e0ae16`），程式和第 1 步（`ec1a9df`，已逐像素驗過）完全相同；lint exit 0、test 151/151 與 17/17、build exit 0；重新 push。第 0、1 步留在線上：共用性質讀表、84 個材質編號比較剩 34 個。
- **第 2 步要重做時**：
  1. 驗收多一條：**真的瀏覽器裡，讓著色器快取失效後的第一次載入，最長的工作不比改前多 20%**（做法：`.claude/dispatch/probe.py` 那樣加一個不用的常數；讀 `PerformanceObserver` 的 `longtask`）。
  2. 先試最小的改法：分派改成一條 `if`／`else if`（不用 `switch`）、配方函式保留；還是慢的話，把含導數取樣的部分留在主體最外層，只把不取樣的部分搬進函式。每試一種就量第一次載入。
  3. 修改腳本 [`material-table/step2-patch.py`](material-table/step2-patch.py) 可以當起點（它對的是第 1 步之後的程式，也就是現在的 `main`）。

### 8.10 第 2 步重做到一半（2026-11-18 23:10，額度用完，停在這裡）

- `if` 鏈也不行：把分派從 `switch` 改成一條 `if`／`else if`、配方函式保留，乾淨地重測，第一次編譯仍卡 **32,086 ms**。（先前量到的 0.3 秒不算數：那次 dev server 回應延遲 11 秒，載到的是舊模組。）所以問題在「上色搬進函式」本身，推測是共用的鋪粉函式被編譯器在每個配方裡各展開一份。
- **保守版**（[`material-table/step2b-patch.py`](material-table/step2b-patch.py)，已套用並提交在 `claude/mat-table`，**沒有合併、沒有 push**）：分支留在主體原位，只把條件從材質編號換成配方（`rc==RECIPE_…`）與金屬（`gold`）；表加 `recipe`、`cloud` 兩欄；刪掉兩行到不了的分支。地著色器的材質編號比較 34 → 0。
  - 已驗：lint exit 0；test 151/151、17/17（含窮舉檢查與圍欄）；**使用者的 Chrome 裡快取失效後第一次載入，最長的工作 309 ms**（改前 333 ms），並確認載到的是這一版。
  - **還沒驗：逐像素比對**（`bash scripts/plate-matrix.sh` 整組，對今天的基準 `.shots/mat-table/before`；跨重開機要重拍基準）。驗過才能合併。
- 線上（`main` @ `e400adb`）是第 0、1 步，第一次載入 0.33 秒，正常。

### 8.11 第 2 步保守版的驗收（2026-11-19 20:30–21:10，commit `81b2b9a`）

- **逐像素**（基準與改後都是今天同一次開機拍的；基準是線上的第 1 步 `e400adb`，資料夾 `.shots/mat-table/b19` 與 `a19`）：106 張裡 103 張 0 個像素不同；3 張各差 1–2 個像素、差 1 級，用改後的程式重拍兩次，都至少有一次和基準 0 個像素不同（是同一份程式自己的閃動，位置和 11/18 記錄的相同）。十組裡 `new`、分層視圖、包漿視圖、材質替換 A／B、光在盤外、手機都是 0。
- **第一次編譯**：見 §8.12（先前寫的「309 ms、改前 333 ms」是快取命中，不算數）。排除快取後，這一版 10.0–12.9 秒，第 1 步 12.4–15.1 秒：沒有變慢。
- **窮舉檢查與圍欄**（`npm test`）：材質 0–28 的每個欄位對照 `56fc135` 的判斷式；地著色器裡沒有材質編號和數字比較、配方只在一處讀出、配方只和具名常數比。
- 檢查：lint exit 0；`validate_data.js --strict` ERROR 0／WARN 0；test 151/151、17/17；build exit 0。
- **現在的結構**：`MAT_LOOK`（`mat.js`）每個材質一列，欄有 `ch`、`chRidge`、`lh`、`coat`、`density`、`flakeD`、`flakeCell`、`foil`、`tone`、`hill`、`cloud`、`tier`、`recipe`。地著色器的主體開頭讀一次 `rc`（配方）與 `gold`（金屬），之後的分支只問這兩個量與表的欄。加一種材質：在 `MAT` 加編號、在表裡加一列、選一個既有的配方；要新的畫法才需要在 `RECIPE` 加一個名字並在主體加分支。
- **和提案不同的地方**：配方沒有收成函式，「底」與「上層」兩段各有一串以配方為條件的分支（提案寫的是函式加一處分派）。原因是編譯時間（§8.9、§8.10）；包漿的 `powder30`／`powder35` 也沒有合併成數值欄（留在第 1 步的樣子）。
- 沒做：第 3、4 步；GPU 的幀成本前後對照；手機實機。

### 8.12 更正：第一次編譯的時間要這樣量（2026-11-19 21:40）

**§8.9 的表與 §8.11 的「309 ms」是錯的**：那些「改前 333 ms、第 1 步 315 ms、保守版 309 ms」都是瀏覽器的著色器快取命中時的數字（每次載入固定有兩個 0.2–0.3 秒的工作，是建盤與烘焙）。在著色器裡加一個**沒被用到**的常數，並不保證快取失效。

**可靠的量法**：把地的那支程式的原始碼從渲染器拿出來，在同一頁另開一個 WebGL2 context，加一個**有被用到**的 uniform（每次名字不同），編譯、連結，計時到 `LINK_STATUS` 回來。dev 模式下 `window.__kyotoRenderer` 是 three.js 的渲染器（`three-renderer.js`）：

```js
const r = window.__kyotoRenderer, gl0 = r.getContext();
const p0 = r.info.programs.find(p => gl0.getShaderSource(p.fragmentShader).includes('T_DENSITY[mi]'));
const vs = gl0.getShaderSource(p0.vertexShader), fs = gl0.getShaderSource(p0.fragmentShader);
const bench = n => { const tag = 'uProbe' + n, mark = 'outgoingLight=mFinish(c,1.).rgb;';
  const f = fs.replace('void main() {', 'uniform float ' + tag + ';\nvoid main() {').replace(mark, 'outgoingLight=mFinish(c,1.).rgb+vec3(' + tag + '*0.);');
  const gl = document.createElement('canvas').getContext('webgl2'), t0 = performance.now();
  const mk = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, f)); gl.linkProgram(p);
  const ok = gl.getProgramParameter(p, gl.LINK_STATUS); return {ms: Math.round(performance.now() - t0), ok}; };
bench(Date.now() % 100000);
```

要比兩版，就各載入一次把 `vs`、`fs` 存進 `localStorage`，再在同一頁交替量。

**量到的**（使用者的 Chrome、桌機 D3D11，交替量三次，都連結成功）

| 地著色器 | 編譯加連結（ms） |
|---|---|
| 第 1 步（`e400adb`） | 15,129、13,156、12,429 |
| 第 2 步保守版（`81b2b9a`，現在線上） | 12,295、12,941、10,038 |
| 配方函式加 `switch`（`d99774d`，已退掉） | 48,594（頁面載入時的 long task，一次） |
| 配方函式加 `if` 鏈（沒有提交） | 32,086（同上，一次） |

**結論**
- 保守版沒有比第 1 步慢。配方函式的兩種寫法是原本的兩到四倍，所以不用。
- **原本就有的問題**：這支地著色器（片段著色器約 12.5 萬字元）在 D3D 上冷編譯本來就要十幾秒。平常被瀏覽器的著色器快取蓋住；第一次來的訪客，或每次改了地著色器重新部署之後，第一次載入會等這麼久（頁面會不會整個卡住，要看 three.js 當時是不是用非同步編譯；11/18 配方函式那一版是整頁卡住）。這不是這次改動造成的，但值得另開一包處理：縮短這支著色器的編譯時間，或編譯期間先顯示降級圖（`renderer.compileAsync`）。
- 11/19 線上第一次載入看到的 1.8 秒長工作、本機加常數後看到的 8.9 秒，都落在「快取部分命中」的範圍，不能當數據用。

### 8.13 第 4 步的一部分（4a）：土坡的金銀與岩的材質讀表（2026-11-19 21:30，agy 實作、主代理審查）

- 請求模型／強度：Gemini 4 Hydrogen high（agy，Gemini Models 池）；實際設定：未確認。派工單與允許清單在工作樹 `C:\Git\_wt_kyoto_doha\.claude\dispatch\`（不提交）。
- 內容（commit `2997351`）：`mat.js` 新增 `DOHA_TONE`（洲浜、堤、遠山各個 tone 的材質與順序；洲浜另有 `under`、`soft`）與 `ROCK_LOOK`／`ROCK_DEFAULT`（岩是不是粉的、岩身與箔片的材質）；`doha.js` 不再拿 tone 和字面值比，`rock-mesh.js` 不再比材質編號；測試加圍欄。
- 驗收（主代理在主資料夾重跑）：`node scripts/plate-parts-hash.mjs --check` identical 11/11 wards（十一區部件輸出逐位元相同）；lint exit 0；test 152/152、17/17；build exit 0。主代理讀過 diff：沒列到的 tone 與材質的預設值和原本的行為一致；測試檔只在檔尾新增。
- 新工具：`scripts/plate-parts-hash.mjs`（`--write`／`--check`），不靠瀏覽器證明建構程式的改動沒有動到任何數值。
- 第 4 步還剩：`bake.js` 的填色標記（`f.tongue`／`f.wedge`／`f.fade`）對回表的 `fine` 欄；`export-glb.js` 的顏色表（和 `MATERIALS.color` 的值不同，不是單純重複，要先確認用途再動）。第 3 步（`three-renderer.js` 的字串判斷、`MATERIALS` 併表）還沒做。

### 8.14 第 3 步與第 4b 步（2026-11-20，Opus 5.5，分支 `claude/mat-table-34`，base `main` @ `0b44c2c`）

使用者 11/20 凌晨：「從 §8.11–§8.13 接……總之妳處理我要睡了」。`claude/mat-table` 已全在 `main` 裡（`git log main..claude/mat-table` 為 0），所以從 `main` 開新分支，ADR（0001–0015）一起帶進來。**沒有合併、沒有 push。**

**第 3 步：`MATERIALS` 併進 `MAT_LOOK`，renderer 不再看材質的名字**
- `mat.js`：`MAT_LOOK` 每列多一欄 `mesh`，就是原本 `three-pack.js` 的 `MATERIALS` 那一列（逐字搬過去，連註解）；`three-pack.js` 的 `MATERIALS` 改成由這一欄導出的常數。終點是 §8.1 定的「一張表」。
- 網格的欄（`meshLook`，盒的部位 `BOX_MATERIALS` 與蓋 `GROUND_LID` 也用同一組欄）：`coat`（`sunk`／`top`／`faint`／`none`）、`shine`（清漆提到共用的光澤下限）、`shinnuri`、`rock`、`rockPowder`、`grain`（`powder`／`leaf`）、`wood`（樹枝是銀還是金）。`three-renderer.js` 的 `patchMaterial`、`patchLimbMaterial`、`physical` 只讀這些欄，`spec.name ===` 為 0。
- 照實寫下的兩個不同：
  - 貝與珊瑚的包漿：地上 `coat: 'none'`、網格上 `mesh.coat: 'faint'`（§6 第 3 項，沒有統一）。
  - **盒的繩（盒 id 27）**：包漿的著色器有上（舊判斷是「不是紙就上」），清漆的光澤下限沒有提（舊判斷是「不是紙也不是繩」）。所以「包漿」和「光澤下限」是兩欄，繩是 `coat: 'top', shine: false`。`three-renderer.js` 的註解說固定網格裡沒有 27，但 `buildBox()` 實際有 720 個頂點是 27（`box.js:86` 的圓柱）。這可能是原本就有的小錯，解耦不改它，記在這裡。
  - 粉岩：`rockPowder` 是 25–28（舊的 `/^rockPowder/`），和 `ROCK_LOOK.powder`（只有 25、26 是粉的岩身）是不同的性質，沒有合併。
- `export-glb.js` 的 `GROUND_COLOUR`（參考圖裡蓋上每種材質的一個顏色）逐字搬成 `MAT_LOOK` 的 `refColour` 欄。它和 `mesh.color` 是不同的值（例如水：參考圖是金色、網格是藍黑），沒有統一。

**第 4b 步（同一個 commit）：bake 依材質選畫法**
- `MAT_LOOK` 多一欄 `fine`（`FINE`）：`mask`（預設）、`wedge`（岸，19、20）、`ridge`（遠山，23、24）、`powder`（洲浜，21、22）。`bake.js` 的上色、疏密場、接觸場都依零件材質的 `fine` 選畫法，幾何仍從填色的 `f.wedge`／`f.fade` 讀。`paintWedge` 裡永遠到不了的 `f.wedge.far ? 2 : 3` 改成 3（遠山只走 `paintFar`）。
- 沒做：`doha.js` 的 `tongue: true` 與 `wedge.far` 兩個旗標還在。bake 不再讀它們，但 `scripts/plate-doha-measure.mjs`、`plate-doha-similar.mjs` 與 doha 的測試還讀 `wedge.far`。要拿掉就三處一起改讀 `fine` 欄；拿掉後部件雜湊會變，證明用「去掉這兩個鍵再算雜湊」（做法見下）。在那之前，圍欄測試檢查十一區每個填色的旗標都和材質的 `fine` 一致。

**證明**
- 數值逐一相同（一次性的檢查腳本，沒有提交）：28 個 `MATERIALS`、8 個盒的部位、蓋，去掉新加的欄後和 `0b44c2c` 的逐鍵全等；`refColour` 對材質 0–40 和舊的 `GROUND_COLOUR`（含「沒列到就用地的顏色」）全等；`MAT_LOOK_GLSL` 與地著色器的字串一字不差。
- 窮舉圍欄（`npm test`，提交）：把 `0b44c2c` renderer 用名字做的九個判斷照抄成 JS，對每個零件材質、盒的部位與蓋，和讀欄的結果比，必須全等；renderer 原始碼裡沒有 `spec.name ===`；十一區每個填色的旗標和材質的 `fine` 一致；`bake.js` 不讀 `.far`、`f.tongue`；`export-glb.js` 沒有自己的顏色表。
- 部件：`node scripts/plate-parts-hash.mjs --check` identical 11/11（`doha.js` 沒動）。
- 逐像素（改前 `.shots/mat-table/b20`、改後 `a20`，同一次開機、同一個 dev server；改後先用 curl 確認 dev server 送出的是新版模組）：十組 106 張：105 張 0 個像素不同；`swapA` 的南區日差 1 個像素、差 1 級。改後重拍一次仍是同一個像素；把舊程式（`0b44c2c` 的五個檔）暫時放回去重拍，結果和改後 0 個像素不同、和第一次的基準差同一個像素。所以是舊程式自己的閃動，不是這次的改動。
- **逐像素沒有涵蓋的**：矩陣只拍蓋。盒的內面、托盤、紙、繩（`coat: 'sunk'`／`'none'`、`shine: false` 的對象）只在開盒時看得到，沒有拍。它們的證明是上面的窮舉圍欄，加上讀程式：`patchMaterial`、`patchLimbMaterial`、`physical` 產生的著色器字串與快取鍵，只由那九個判斷、`spec.glow` 與盒自己的旗標（`nashijiSide`、`nashijiInner`、`paperFleck`，沒有動）決定；renderer 裡 `physical(`／`patch*Material(` 的呼叫點只吃 `MATERIALS`、`BOX_MATERIALS`、`GROUND_LID`。
- 檢查：lint exit 0（含 `adr:check`）；`validate_data.js --strict` ERROR 0／WARN 0；test 154/154、17/17；build exit 0。拍圖紀錄裡沒有 console 錯誤。`?export=glb`（dev 專用）沒有在瀏覽器裡跑過，只有上面的 `refColour` 對照。

**現在的結構**：一個材質的所有性質都在 `mat.js` 的 `MAT_LOOK` 那一列：地著色器的欄、`fine`、`refColour`、`mesh`（網格的物理參數與著色器欄）。`DOHA_TONE`、`ROCK_LOOK` 是以別的鍵（土坡的 tone、岩的請求材質）查的表，也在 `mat.js`。`BOX_MATERIALS` 是盒的部位（另一套 id），留在 `three-pack.js`，但用同一組網格欄。加材質：在 `MAT` 加編號、在 `MAT_LOOK` 加一列（地的欄、`fine`、`mesh`）；不要在 renderer 或 bake 裡比名字或編號，測試會擋。

**還沒做**
- **要使用者決定**：ADR 0013 的「決定」寫的是過渡期的分工（兩表欄位不得重疊、第 3 步併表），「後果」寫第 3 步未完成；併表之後這兩句過時了。ADR 的規則是不改原文：要嘛把 0013 標成「已取代（由 0016）」並在 0016 加「取代：0013」（0016 要把 0013 的原則一併寫進來），要嘛維持現狀、由 0016 補述。這次沒有標，等使用者選。
- `doha.js` 的兩個旗標（上面）：§8.15 做完。
- 第一次編譯慢（§8.12，原本就有的問題）：另開一包，縮短地著色器的編譯時間，或編譯期間先顯示降級圖。
- 降級圖沒有重拍：這一步證明了畫面逐像素不變，降級圖不必重拍。

### 8.15 第 4c 步：拿掉 `doha.js` 的填色旗標（2026-11-20，Opus 5.5，分支 `claude/mat-table-4c`，base `main` @ `8c00620`）

使用者 11/20 同意把 `claude/mat-table-34` 合併 `main`（快轉）並 push，之後說「額度恢復了」，接著做 §8.14 留下的這一包。**沒有合併、沒有 push。**

**改了什麼**
- `doha.js`：洲浜填色的 `tongue: true`、遠山填色的 `wedge.far: true` 拿掉。一片填色是哪一種，由零件材質的 `fine` 欄說；填色只帶它那一種要的幾何（`f.wedge`、`f.fade`）。
- `mat.js` 加 `lookOf(mat)`：查一個材質的列，表裡沒有的 id 讀第 0 列。原本「`MAT_LOOK[id] ?? MAT_LOOK[0]`」寫在 `bake.js`、`three-pack.js` 與測試各一份，現在都讀 `lookOf`。
- `scripts/plate-doha-measure.mjs`：`visible(f, fine)` 多一個參數，遠山的判斷改成 `fine === FINE.ridge`；`measureDoha` 每個零件讀一次 `lookOf(p.mat).fine`。
- `scripts/plate-doha-similar.mjs`：洲浜的判斷改成 `lookOf(p.mat).fine === FINE.powder`；有 `f.wedge` 的仍算岸（遠山的頭也是，和改前一樣）。
- `scripts/plate.test.mjs`：
  - `mountain()` 的測試改成檢查零件材質的 `fine` 是 `ridge`；稻荷山那條改成只檢查 `f.wedge`（零件已經是用遠山材質挑出來的）。
  - §8.14 的範圍圍欄改成行為測試：十一區每片填色「有 `f.wedge`」等於「材質是 `wedge` 或 `ridge`」，`f.fade` 只在 `powder`，填色上沒有 `tongue`，`wedge` 上沒有 `far`。
- `docs/plans/material-table/parts-hash-baseline.json` 重寫：拿掉兩個鍵，十區的部件雜湊會變（上京沒有洲浜也沒有遠山，不變）。

**證明**（指令都在 scratchpad 跑，結果沒有提交）
- 去掉 `tongue`、`far` 兩個鍵再算十一區的部件雜湊：改前（`8c00620`）與改後逐字相同（`cmp` 退出 0）。
- `node scripts/plate-doha-measure.mjs <十一區>` 與 `node scripts/plate-doha-similar.mjs <十一區>` 的輸出：改前改後逐字相同。
- `MAT_LOOK_GLSL`（`three-pack.js` 改讀 `lookOf`）：sha256 前 16 碼改前改後都是 `8146e60ca86bdbf0`。
- 沒有重拍逐像素：`src/` 裡除了測試與量測腳本，沒有人讀這兩個鍵（`grep` 為 0）；部件去掉這兩個鍵後相同，`bake.js` 與 `three-pack.js` 只是改用 `lookOf`，值相同。
- 檢查：`npm run lint` 0（ADR 16 份通過）；`npx --no-install tsx validate_data.js --strict` ERROR 0／WARN 0；`npm test` 154/154 與 17/17；`npm run build` 0；`node scripts/plate-parts-hash.mjs --check` 重寫基準後 identical 11/11。

**沒動**：ADR 0016 的「後果」寫「過渡期還剩 `doha.js` 的兩個旗標」，現在不成立了。照 ADR 的規則不改原文，和 0013 的問題一起等使用者決定（§8.14）。

**還沒做**
- ADR：使用者 11/20 選「取代」。另開 0017 取代 0013（原則與著色器做法照抄，材質表照現況寫）；0016 不改原文、仍採用（它最後一句的過渡期由本步結束）。
- 第一次編譯慢（§8.12）：§8.16。

### 8.16 第一次載入不再卡住：先非同步編譯，期間顯示降級圖（2026-11-20，Opus 5.5，分支 `claude/cold-compile`，base `main` @ `09ecd79`）

使用者 11/20：「推上繼續後續計畫」。做 §8.12 留下的那一包。決定寫在 ADR 0018。**沒有合併、沒有 push。**

**原因**：第一次 `renderer.render` 同步編譯所有程式；地著色器在 `boxGroup`（盒），不在區的 group，所以既有的預熱（`warmEntry` 只編區的 group）碰不到它。

**改了什麼**
- `three-renderer.js`：啟用第一塊盤時 `renderer.compileAsync(scene, camera)`；編好前 `draw` 不畫、`loading()` 為真，編好呼叫新的第三個參數 `onReady`。編譯中換區就再編一次。`data-renderer = 'three'` 從 `activate` 移到第一幀實景。dev 專用 `?cold`（見下）。
- `renderer.js`：`pending()` 是「three.js 還不能畫」的唯一判斷；期間清空 canvas，用 `static-plate.js` 的 `paint` 把降級圖鋪成 CSS 背景，第一幀實景時拿掉。
- `study.js`：`onReady` 依 `renderer.loading()` 決定提示要不要留著（原本一律收起）。
- `scripts/plate-shot.mjs`：多等 `data-renderer` 變成 `three` 再拍。

**量法**（一次性腳本在 scratchpad，沒提交）：自己開無頭 Chrome（`--use-angle=d3d11`，新的設定檔；只結束自己開的 PID），`?cold` 讓地著色器多一個每次換名字、有被用到的 uniform（快取一定落空，沒有 `?cold` 時快取命中的長任務只有 0.38–0.40 秒）。用 `PerformanceObserver('longtask')` 記最長長任務，用 `requestAnimationFrame` 記降級圖出現與畫完三幀的時間。GPU：ANGLE D3D11、RTX 4070，有 `KHR_parallel_shader_compile`。內建瀏覽器的面板當時是隱藏的，所以沒用它量。

| 冷快取，交替各三次 | 最長長任務（ms） | 降級圖出現（ms） | 實景（ms） |
|---|---|---|---|
| 改前（只有探針） | 17,004、11,975、11,069 | 沒有 | 長任務之後 |
| 改後 | 992、418、431 | —、263、237 | 2,063、715、732 |

（改後第一次是新設定檔，模組還沒進快取，降級圖解碼完之前實景就來了。）

**畫面不變**：`bash scripts/plate-matrix.sh .shots/cold/{b,a} base mobile`，同一次開機、同一個 dev server，`plate-diff` 25 張：24 張 0 差異；伏見日間差 1 個像素、1 級，用改後的程式重拍兩次都和改前 0 差異，是那一次拍的閃動。
**降級圖真的出現**：CPU 降速 8 倍時在編譯期間拍圖（`.shots` 外的 scratchpad）：`data-renderer` 是 `webgl`，提示「正在鋪設金地…」顯示，canvas 背景是南區的降級圖。
**檢查**：lint 0（ADR 18 份）；validate `--strict` ERROR 0／WARN 0；test 154/154、17/17；build 0；正式建置裡沒有 `uCold`／`coldProbe`。

**沒做**
- 沒有 `KHR_parallel_shader_compile` 的瀏覽器（例如部分舊 Safari）仍會在第一幀前同步編譯。
- 沒在使用者的 Chrome 有頭模式量；無頭 Chrome 用的是同一張 GPU 與 ANGLE D3D11。
- 著色器編譯失敗不會退回降級圖（0010 的後果，沒變）。
