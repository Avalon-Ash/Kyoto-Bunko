# 京都專案交接入口

更新：2026-11-17。這是**唯一的目前狀態入口**；各輪細節在 `agent-runs/`，舊狀態以 Git 歷史為準，不在文件頂端堆疊「最新狀態」。新對話依序讀 `../AGENTS.md`、本檔（**先看 §4**）、[`plans/2026-11-17-finish.md`](plans/2026-11-17-finish.md)（下一批的開案書）。整體的拆包表在 [`plans/2026-11-16-roadmap.md`](plans/2026-11-16-roadmap.md)。蒔繪盤的設計語言在 `MAKIE_THREE_PLAN.md` §2a 與本檔 §4.4。

## 1. Git 狀態

| 項目 | 狀態 |
|---|---|
| 主線 | `main` 與 `origin/main` 在 `a919d81`（2026-11-17 下午，使用者同意合併與 push；GitHub Pages 部署成功，`gh run list` 確認；含建部件網格的效能與開案書 §13、§14 的修整）：開案書 R0–R10、銀的補強、作舊與珊瑚、穿插修正、技法堆疊、屋頂金粉、疊坡（遠山、岸、洲浜）、地與調子、包漿、九區重做、盤面修整 P1–P5 都已上線。實際 HEAD 以 `git log -1 main` 為準 |
| 工作分支 | `claude/finish-1117`：P1–P5（`470293f`）與「建部件網格的效能」（`creature-mesh.js`、`architecture-mesh.js`、`rock-mesh.js`，報告 [`agent-runs/2026-11-17-mesh-perf.md`](agent-runs/2026-11-17-mesh-perf.md)）都已併入 `main`（`5c988da`）並上線。2026-11-17 下午主席自己做的修整（水面、夜間照明、金山與青金、霞、北的蘆葦、銀杏落葉、銀洲浜、盒內梨子地、卷軸；開案書 §13）也已併入 `main`（`bdde162`）。最後一批（盒內的紙、左京的白砂與「大」、岩的表面與形；開案書 §14）也已併入 `main`（`f3ffe45`）並上線。「岩頂依種子偏向一側」也已併入 `main`（`a919d81`）並上線。分支上之後多的是「漆經年變透」（`three-pack.js` 的三個常數、降級圖；開案書 §15），**尚未合併 `main`**；合併與 push 要使用者同意。本機還留著已併入 `main` 的 `claude/doha-1116`、`claude/roof-1116`、`claude/handoff-1116` 與 `agent/*`，可以刪（刪前確認 `git log main..<branch>` 為 0） |
| 本機分支清理 | 2026-11-16 刪除已併入 `main` 的本機 `claude/great-brahmagupta-ye2uqt`、`claude/threert-reference`（刪前確認 `git log main..<branch>` 為 0） |
| 遠端分支 | 2026-11-16 刪除已併入 `main` 的 `origin/claude/great-brahmagupta-ye2uqt`、`origin/claude/amazing-cerf-cuoj8j`（使用者同意）。遠端只剩 `main` |
| 子代理工作樹 | 現有一個：`C:\Git\_wt_kyoto_doha`（分支 `agent/perf-1117`，`73ef7d7`，盤的程式與 `470293f` 相同，乾淨），可以直接重用：`git checkout -B agent/<主題> claude/finish-1117`。規矩：放在 `C:\Git\_wt_kyoto_<topic>`（`git worktree add`），由主代理建立與刪除；`node_modules` 用 junction 連到主資料夾（`cmd /c mklink /J`），**刪工作樹前先 `cmd /c rmdir` 拿掉 junction**，否則會刪到主資料夾的 `node_modules` |
| 遠端與部署 | GitHub repo `Avalon-Ash/Kyoto-Bunko`；GitHub Pages（`https://avalon-ash.github.io/Kyoto-Bunko/`）由 `.github/workflows/deploy.yml` 在 push `main` 時自動部署 |
| 參考資源 | ThreeRT 原始碼與參考圖在 `C:\Git\_ext`（不在本 repo）；用法見 `MAKIE_THREERT_REFERENCE.md` |
| 不提交 | `.claude/`、`.shots/`、`dist/`、`node_modules/`、驗收截圖與日誌 |

```powershell
Set-Location C:\Git\Kyoto-Bunko
git fetch --prune; git status -sb; git log --oneline -5
Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
# 3000 沒有 listener 時才啟動：
npm run dev -- --host 127.0.0.1 --strictPort
```

預覽：首頁 `/`，獨立文箱展示 `/toji-study/index.html`。截圖：`node scripts/plate-shot.mjs <outDir> <job…>`（用法在檔頭；dev server 必須在 127.0.0.1:3000）。

## 2. 目前產品狀態（`main`，已上線）

| 範圍 | 狀態 |
|---|---|
| 資料 | **792 筆**，`validate_data.js --strict` ERROR 0／WARN 0。2026-11-16 查完十一區所有食處（Tabelog）與「世界遺產」「國寶」標籤：退役 17 筆、改區 27 筆。「營業中」的依據是 Tabelog 英文版沒有閉店類標示，不是現場確認。寺社、商店等其他類型的事實查核還沒做 |
| 首頁文庫 | 十一區文箱，每區一面蒔繪盤；單指盒面移光，長拖換函，雙指捏合／滾輪／快捷鍵放大（上限 3 倍），點蓋／Enter／空白鍵開蓋直入 `DetailView`；月光預設、閒置移光 |
| 蒔繪盤 | **只有 three.js 一條管線**（`plate/three-renderer.js`＋`three-pack.js`）。舊的自寫 WebGL2 管線、2.5D 浮雕與 `?three=0` 已刪。狐、鳳凰、鶯、銀沙灘與向月台、石垣都是 three 網格，沒有平塗佔位。岩面是菱形切金（受光大而密、背光小而疏），銀岩是銀。地有疏密場（靠近物較密）。土坡、高台、庭的面是刑部梨子地（不規則的大金片，沒有格子），切金只在稜邊成群；上京南庭與左京銀沙灘是銀的平目地（已上線）。九區有依附小景（`plate/<區>.js` 裡帶 `on` 欄位的部件）。**銀的分工**（2026-11-16 對照德川美術館「初音蒔絵文台・硯箱（部分）」照片）：葉是金的樹，幹與枝是銀（背光氧化銀灰、受光淡銀、上面是切銀）；開銀花的櫻保留金幹；霞帶的金裡躺著細長的灰銀條。**作舊**（已上線）：總開關 `?age=0..1`（預設 .85，0 是全新）；地是深棕橙的梨子地、圖的金比地淡、岩與樹幹的陰面是硫化銀的暖深灰；部件腳邊只有光影（環境光遮蔽與投影），沒有畫上去的汙；粉的疏密過渡加強；銀、切銀、平文銀（砂、狐、花、腳印）保持淡；平嵌小物依輪廓裁切，邊界只留 0.5 單位（`reach: .5`），否則旁邊會多一圈材質；紅珊瑚（`MAT.coral`）用在楓葉、梅心、「大」字。**11/17 上線**：屋面是金粉、貼金只在小部分並透出木紋；丘與台地全部拆掉（`vocab.js` 的 `hill()`、`gardenGround()` 已刪），十一區改用 `plate/doha.js` 的遠山（`mountain()`）、岸（`banks()`）、洲浜（`tongues()`）與霞，輪廓逐片手寫在各區 `<區>.js`；地是最深的一層（亮度約 28–38）、濃梨子地中間（48–58）、平金與線最亮（60–85），`PLATE_TONE=1` 可分層量；包漿預設開（`?coat=0` 可關）：沉在漆裡的整片染、研出的只染輪廓內側一圈、在漆上的薄而冷；岩是 `crag-mesh.js` 的尖岩簇（使用者指定的一版，先不動）。主席對這一版的岸、山面、青金、霞仍不滿意，見 §4 |
| 降級 | 沒有 WebGL2、three 載入或啟動失敗、context 遺失、或網址加 `?plate=static` 時，顯示預渲染的靜態圖（`plate/static/` 22 張 webp，十一區 × 日夜），換函與開蓋照常，盒面不動。**盤面有改動就要重拍**：`node scripts/plate-fallback-shots.mjs`（dev server 在 3000） |
| 全站 UI | 手機優先、深色預設；暖日／月光、語系、減少動態全站共用（色票唯一來源 `src/theme.css`）。卡片有傾斜與柔光（觸控只有按壓回饋）、篩選後新卡片淡入；30 張以上的列表分批渲染（`src/lib/batch-render.ts`） |
| 背景 | すやり霞＋和紙＋金箔／銀塵、障子格光與卓面光澤（`backdrop.js`）；十一區各自的紋樣與一行短句（`ward-art.js`，2026-11-16 改寫為「地標＋該區另一個重點」） |
| 歲時記 | 只有[計畫](SEASONAL_PLAN.md)；首頁入口已移除 |
| 文箱架構 | `study.js`（`mountBunko`：手勢、移光、縮放、換函、開蓋）、`renderer.js`（選 three 或靜態圖）、`plate/three-renderer.js`＋`three-pack.js`、`plate/static-plate.js`、`plate/parts.js`＋`vocab.js`＋`mat.js`＋`<區>.js`（構圖資料）、`plate/creature-mesh.js`／`rock-mesh.js`／`architecture-mesh.js` 等（網格）、`backdrop.js`＋`ward-art.js`（背景） |

## 3. 最近一次驗收（2026-11-17，`claude/finish-1117`）

| 檢查 | 結果 |
|---|---|
| `npm run lint` | exit 0 |
| `npx --no-install tsx validate_data.js --strict` | ERROR 0、WARN 0，792 筆 |
| `npm test` | `scripts/*.test.mjs` 146/146、`src/lib/*.test.ts` 17/17 |
| `npm run build` | exit 0 |
| 穿插 | `node scripts/plate-clip.mjs <out.json>`：十一區 0 |
| 盤面調子 | `PLATE_TONE=1 node scripts/plate-shot.mjs <outDir> <job…>`；數字在 [`plans/2026-11-17-finish.md`](plans/2026-11-17-finish.md) §8–§11 |
| 部署 | `main` 在 `a919d81`（含開案書 §13、§14），GitHub Pages 部署成功；線上頁面與實機沒有人看過 |
| 下午的修整（§13、§14 都已上線） | lint exit 0、validate --strict ERROR 0／WARN 0、test 146／146 與 17／17、build exit 0（主席重跑）；降級圖 22 張重拍；手機 375×812 拍過兩區；主站開盒流程用瀏覽器面板走過一次。十一區日夜總覽在 `.shots/polish/FINAL-day.png`、`FINAL-night.png` |
| 網格效能（已上線） | 十一區 `PLATES[ward]()` 的輸出在修改前後逐位元相同（主代理用自己的腳本算 sha256，11／11）；lint exit 0、validate --strict ERROR 0／WARN 0、test 146／146 與 17／17、build exit 0（主代理重跑）。建盤時間降 14–101 ms、換區最長幀降 39–64% 是另一個工作階段量的，主代理沒有重量 |

前四項是主席在主資料夾重跑的。截圖都是無頭 Chrome（桌機 GPU）拍的，放在 `.shots/`（不提交）；修整後的十一區日夜總覽是 `.shots/finish/FINAL-day.png`、`FINAL-night.png`。**11/16–17 的畫面使用者都還沒在實機（手機）上看過。**

## 4. 下一步

### 4.1 現在停在哪裡（2026-11-17）

使用者說：「這版先合併推上去，因為今天一整天下來你自己都不滿意，先擬下一批計畫。視覺要不要你自己跳下來作？」已合併並 push；下一批寫成 [`plans/2026-11-17-finish.md`](plans/2026-11-17-finish.md)。**P1–P4 已由 Fable 主席自己做完**（岸與洲浜改成研出、遠山沿整條稜線淡出、霞改成金粉、岸與山面的金粉會閃、東山的山腰、左京的「大」、下京堂前的庭），在 `claude/finish-1117`，等使用者看（開案書 §8–§11）；P5（效能）由 Sonnet 子代理做完、已整合：烘焙時間各區降 16–27 ms，畫面沒有變（開案書 §12）。**P1–P5 已合併 `main` 並 push（`470293f`，使用者 2026-11-17 分別同意），等使用者看圖後的意見。**之後使用者啟動了「建部件網格的效能」那一包，主代理審過後使用者同意合併與 push（`5c988da`，已上線）。2026-11-17 下午使用者說「現在都你自己作，讓你自己對這 REPO 的品質和畫面滿意為基準」，主席自己做了一批修整（開案書 §13），在 `claude/finish-1117`、尚未合併。山腳暗三角的原因是山與岸底下的地沒有套用疏密場，不是烘焙的楔形。

**誰做定調的視覺：已定案。** 使用者要主席和「CODE合約總管」（另一個工作階段，管全域合約）討論，總管擬稿、使用者同意後，2026-11-17 改了全域 `~/.claude/CLAUDE.md`「跨模型派工」（主席讀檔核對過）。新增的「動手原則」不分 Fable 或 Opus：

1. 定調類的工作（材質、著色器外觀、看截圖反覆調整、前後相依的一條鏈、一個 context 裝得下）由**主代理自己做**；能拆成互不相依、有明確目標圖或數字驗收的（各區套用、效能、資料、補測試）才派子代理。
2. 新的定調主題預設在 **Opus 5.5 medium** 的工作階段做。Fable 自己動手只限兩種情況：手上已經累積了這條鏈的判斷，或 Opus 開到 high 仍然不夠；Fable 動手用 medium。**換了新工作階段就沒有脈絡，回到 Opus 預設。**
3. 連續兩包都是「看得出問題但不能動手」：停止派工，主代理自己接手那一段。
4. 派工單固定兩條：只結束自己啟動的行程（記下 PID，不用名稱或萬用條件）；不為了過檢查改造形或改驗收。

對這一包的意思：開案書的 P1–P3（定調）由下一個工作階段的主代理自己做，預設是 Opus 5.5 medium；P4、P5 派 Sonnet 子代理。官方分工原則的來源與數字在開案書 §2。

### 4.2 下一個工作階段照這樣開始

1. 讀 `AGENTS.md`、本檔、[`plans/2026-11-17-finish.md`](plans/2026-11-17-finish.md)；專案記憶會自動載入（設計規則都在裡面，§4.4 是摘要）。
2. `git fetch --prune; git status -sb`，確認在 `claude/finish-1117`、`main` 是 `a919d81` 或更新。
3. 看參考圖與現況圖（都在本機 `.shots/`，不在 repo；雲端工作階段看不到）：`.shots/ref/user-hatsune-suzuribako-lid.png`、`shioyama-2.jpg`、`user-toyama-cup-a.png`、`hirasan-3.jpg`、`user-hatsune-three-grounds.png`；`.shots/nine/overview-day.png`、`overview-night.png`。
4. 確認這個工作階段的模型與推理強度：定調（開案書 P1–P3）由主代理自己做，預設 Opus 5.5 medium（§4.1）。
5. P1–P5 都已做完（開案書 §8–§12）。先問使用者看過之後的意見；主席自己列的不滿意處在開案書 §11 末尾。
6. 合併 `main`、push 分開問使用者。

### 4.3 盤面修整要解決的（開案書 §1、§3）

1. 岸與洲浜像一塊塊墊高的板（面是平的一個調子、邊線暗而重）。目標：研出，沒有台階；一邊濃、一邊化進地裡；細金線收邊。這是使用者最早說的「平整又大片，不符合肉合研出」剩下的部分，最重要。
2. 山的面偏透、金山和地分不開；右京的嵐山不突出。
3. 青金的山頭像月亮（日間灰白、夜間是很亮的白弧）。青金應該是偏青的淡金。
4. 山腳的鋸齒暗三角（`bake.js` 的山楔形）。
5. 霞是灰褐的硬邊扁帶。目標：金色、上下緣是粉的漸變、兩端圓收。
6. 個別構圖：東山舞台像立在空地上；左京「大」字讀不出是字；山科石階兩側的岸下寬上窄；下京兩堂腳下沒有地；西京左岸太大。
7. 烘焙時間（山多的區 +45–60 ms）；南、右京的換區最長幀（量到 +18%、+30%，雜訊大）。

### 4.4 使用者定的設計規則（摘要；全文在專案記憶與各開案書）

- **明暗用光做，不用畫的。** 深度靠遮蔽與陰影，不往表面混暗色；兩種表面相接都要漸變。
- **初音調度是技法與材質的定標，不是構圖的範本。** 構圖由主代理設計（山水加建築的遠景）；年代定在江戶；可參考印籠（`.shots/ref/inro/`）。
- **盤上的東西是正視的畫（像松），不是俯瞰的實體。** 別把浮雕的厚度當體積；發現自己把東西越做越扁、越圓就停。
- **形狀逐片手寫、有手感，不能複製貼上**；每樣東西要答得出「為什麼在這裡」；交圖前逐群放大看。
- **遠山**：三到五座大而圓的山相疊成完整的山體，稜盛起最亮、面往下暈、山腳化掉、一座換金屬；山上沒有岩、沒有樹（肉合研出）。小而崎嶇只屬於近景。
- **技法堆疊**：大面積用梨子地、平目地；切金只做點睛（≤5%）。地最深、濃梨子地中間、平金與線最亮，三層不能顛倒。初音的金粉大、濃密、色多。
- **漆上還是漆下**：沉在漆裡的整片染成琥珀；研出的（平文、洲浜、山的面）面露出、只有輪廓內側一圈包在漆下，邊是軟的；在漆上的（高蒔繪、付描、切金、貼金）邊是銳利的、色淡而冷。
- **銀一律維持淡**（銀變黑、平文脫落是保存不良，不做）；作舊的標準是保存良好的傳世品。
- **岩**：使用者 2026-11-17 下午解除「先不動」（「你全權負責……最後動你翻車過的岩」）。主席改了表面（切金成群、露出岩身）與形（扇區成平面、稜線相接），見開案書 §14。還沒做的是逐顆寫輪廓與峰（立面的岩）；使用者還沒看過這一版。
- 屋面顏色、貼金範圍、金片粒徑：等使用者意見，不主動改。
- 小景的主設計是該區特色，用「日本人會想看到什麼」判斷。

### 4.5 工具與踩過的坑

- 拍圖：`node scripts/plate-shot.mjs <outDir> <job…>`，job＝`name:steps:theme:WxH:zoom:fx,fy`。步數：南 0、右京 1、西京 2、山科 3、伏見 4、北 5、上京 6、下京 -1、東山 -2、中京 -3、左京 -4。環境變數：`PLATE_TONE=1`（分層調子）、`PLATE_KIRI=1`（切金佔比）、`PLATE_CPU=4`、`PLATE_LIGHT=fx,fy`（把游標光移開）、`PLATE_SHOT_QUERY='?coat=0'`。dev server 在 127.0.0.1:3000、無頭 Chrome 用 9377。
- 量測：`node scripts/plate-doha-measure.mjs <區…>`（佔比、留白、直線）、`plate-doha-similar.mjs`（形的相似度）、`plate-clip.mjs <out.json>`（穿插）。降級圖：`node scripts/plate-fallback-shots.mjs`（22 張；只改了幾區就把其餘 `git checkout` 還原）。
- 改著色器不要用 `sed -i`：dev server 偵測不到，會量到舊畫面。用編輯工具或整檔寫回。
- **外觀要在沒有光的時候也成立**：手機沒有滑鼠，光要等閒置自動移光才出現；桌機截圖的光剛好照在盤心，會把只靠金粉反光的差別（例如池心的深淺）拍得比實際明顯。檢查時加一張 `PLATE_LIGHT=.02,.95`（光移到盤外）和一張 375×812。（11/17：池的深淺第一版只在光下看得見。）
- 批次拍圖時別讓別的頁面同時佔用 GPU（瀏覽器面板開著盤面、另一支拍圖腳本）：換區的按鍵會被吃掉，拍到別區或別的日夜（11/17 伏見兩張拍錯）。拍完核對輸出裡每張的 `"ward"`，日夜看圖的角落亮度。
- 拍操作之後的畫面（開盒）：`PLATE_EVAL='<js>' PLATE_EVAL_SHOT=1`，會多存一張 `<name>-after.png`。
- 收尾停 dev server 與無頭 Chrome 時，**只結束自己啟動的行程（記下 PID）**。11/17 有子代理用太寬的條件結束了 10 個行程。
- 直線檢查（`plate-doha-measure.mjs` 的 `longestStraight`）只是防呆；不要為了過檢查在輪廓上加等距的小波浪。
- 把整張照片的亮度中位數當成地的目標是錯的（地被調太亮過一次）；目標要分層量。
- 本機有 ThreeRT（`C:\Git\_ext\ThreeRT`，RTX 4070 走 Vulkan 硬體光追，南區 64 spp 約 1.1 秒），可以算參考圖；沒有烘焙模式、沒有正交相機。
- 整合子代理成果的流程：在工作樹 `git add -A scripts src docs && git commit`，主資料夾 `git cherry-pick`，主資料夾重跑四項驗收，複製截圖到主資料夾 `.shots/`。

### 4.6 其他待辦

0. 建盤的另一半時間在建部件網格（`creature-mesh.js` 的 `makePillow`、`architecture-mesh.js` 的 `meshWall`、`meshRoof`、`meshSandCone`），可以再拿回幾十毫秒與換區的長幀（開案書 §12 的發現）；還沒做。
1. 用 ThreeRT 算每區俯視遮蔽圖給地用（[研究](plans/2026-11-16-lighting-research.md) 實驗 2），還沒做。
2. 使用者還沒在實機上看 11/16–17 上線的畫面。
3. 12 月複查三家店：HY-065 八咫（臨時休業）、NK-120 村上開新堂（改裝休業）、NK-111（新店無評論）；仍未營業就退役。
4. 還沒做的：歲時記（R11）；寺社與商店類的事實查核；各食處報告裡列的描述細節（米其林、創業年）；背景霞帶避開盒子的輪廓是照舊盒子調的，比 three 的盒子窄 2–10 px。
5. 已知的小缺口：鳳凰不放大時頭與喙偏小；細小的草、葦不放大時幾乎看不到；夜間濃梨子地與圖案差距小；`parts.js` 的 `act()` 會讓任何 `MAT.lamp` 的部件在游標停留時發橘光，所以小景不要用 `MAT.lamp`。

使用者的常設決定：資料查不到就退役（ID 留給日後補資料）；「國寶」標籤含國寶建造物與國寶藏品。**合併 `main`、push、新增大型依賴仍要逐次問，合併與 push 分開問。**

## 5. 不變條件（摘要；全文見 `AGENTS.md` §2）

- 十一區、古地名與地標保留；蒔繪和區界是同一畫面，不恢復切換或下方清單當主要入口。
- 設計語言一律依初音調度（`MAKIE_THREE_PLAN.md` §2a）。盤上的東西是正視的畫（像松），不是俯瞰的實體；材質先分沉在漆裡、研出（面露出、邊包在漆下）、在漆上三類；地最深，圖案比地亮（使用者 2026-11-16）。初音是技法與材質的定標，不是構圖的範本：它多是近景的物語畫，我們是地標建築加山水的遠景，構圖由主代理設計（使用者 2026-11-16）。明暗差用光照與遮蔽做，不往表面混暗色；任何兩種表面相接都要有漸變（使用者 2026-11-16）。技法的堆疊照 [`plans/2026-11-16-technique-stack.md`](plans/2026-11-16-technique-stack.md) §2.3：大面積的土坡、高台、庭用刑部梨子地或平目地；切金、切銀只散在岩、樹幹與邊緣做點睛，不整面鋪（使用者 2026-11-16）。小景只能依附於物、逐區設計，不可隨機撒（`MAKIE_COMPOSITION_PLAN.md` §7）。立體做大形，特徵用平嵌的切金銀意象。
- `municipalityId: 'M_OTSU'` 是唯一授權過的受保護型別擴充；其餘受保護檔案仍不可改。
- 所有導航共用 `buildGoogleMapsUrl`；地標座標只讀 `SPOT_POSITIONS`。
- `theme.css`、`index.css`、`bunko-ui.css`、`ClusterMap.tsx`、`study.css`、`bunko.css`、`backdrop.js`、`ward-art.js` 屬同一視覺工作線，同時只能有一個寫入者。

## 6. 文件地圖

| 文件 | 現在的用途 |
|---|---|
| [`plans/2026-11-17-finish.md`](plans/2026-11-17-finish.md) | **下一批的開案書**：盤面修整（岸、山、霞的定調；構圖修正；效能），含「誰做視覺」 |
| [`plans/2026-11-16-roadmap.md`](plans/2026-11-16-roadmap.md) | 整體的開案書：拆包、派工、驗收、停下來問 |
| `plans/2026-11-16-*.md` | 11/16 各包的開案書與結果：`patina`（作舊）、`clip`（穿插）、`technique-stack`、`roof-makie`、`doha`（疊坡，§10–§18 是遠山與岩的規則與歷次失敗）、`ground-tone`、`coat`（包漿）、`nine-wards`（九區，§9 是總結）、`lighting-research` |
| `MAKIE_THREE_PLAN.md` | three.js 架構與設計語言（§2a）；§7 的待辦已移到開案書 |
| `MAKIE_GROUND_PLAN.md`、`MAKIE_COMPOSITION_PLAN.md` | 地與構圖的設計紀錄；未做的 D3、C5、C6 已列入開案書 |
| `MAKIE_THREERT_REFERENCE.md` | 路徑追蹤參考圖的做法 |
| `MAKIE_PLATE_HANDOFF.md`、`MAKIE_REBUILD_PLAN.md`、`MAKIE_STAMPS.md` | 11/14 以前的紀錄（舊管線時期）；只供回溯，不當待辦來源 |
| `UI_RENEWAL_PLAN.md`、`UI_RENEWAL_ARCHITECTURE.md`、`UI_RENEWAL_ART.md` | UI 翻新的設計；未做項目已列入開案書 R8 |
| `PLAN.md`、`AGENT_EXECUTION_PLAN.md` | Phase 0–4 的歷史計畫與舊派工表；模型分工以開案書為準 |
| `DEVELOPMENT.md` | 資料錄入規範（仍然有效） |

## 7. 執行紀錄索引

| 期間 | 紀錄 |
|---|---|
| Phase 0–3 | `agent-runs/2026-10-28-*.md`、`2026-10-29-phase03.md` |
| Phase 4 資料與地圖 | `2026-11-04-phase04-data.md`、`2026-11-04-phase04-location-makie.md` |
| 文庫首頁（T4-M1～M4c） | `2026-11-05-phase04-*.md`、`2026-11-06-phase04-*.md`；主線交付見 `2026-11-06-phase04-main-release.md` |
| 手機 UI（T4-M5） | [2026-11-06-mobile-bunko-ui.md](agent-runs/2026-11-06-mobile-bunko-ui.md)（含 11-09 補驗） |
| UI 翻新 P3 背景、程式審查與 UI 統一 | [背景](agent-runs/2026-11-09-ui-renewal-p3-backdrop.md)、[審查](agent-runs/2026-11-09-code-review-ui-unify.md) |
| 蒔繪浮雕盤 P0–P3、W1–W4（舊管線） | `agent-runs/2026-11-12-*.md`、`2026-11-13-*.md`、`2026-11-14-makie-plate-*.md` |
| three.js 遷移、地、部件光照 | [`2026-11-14-threert-reference.md`](agent-runs/2026-11-14-threert-reference.md)（§7–9 是部件光照與換盒）、[流水線檢討](agent-runs/2026-11-14/pipeline-retro.md) |
| 11/16–17 作舊、技法堆疊、屋頂、疊坡、地與調子、岩、包漿、九區 | `agent-runs/2026-11-16-*.md`（`clip`、`technique-stack`、`roof-makie`、`doha-pilot`、`ground-tone`、`rocks`、`rocks-lobes`、`coat`、`nine-wards`） |
