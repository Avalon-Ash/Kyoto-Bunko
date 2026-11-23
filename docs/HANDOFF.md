# 京都專案交接入口

更新：2026-11-23。這是**唯一的目前狀態入口**；各輪細節在 `agent-runs/`，舊狀態以 Git 歷史為準，不在文件頂端堆疊「最新狀態」。新對話依序讀 `../AGENTS.md`、本檔（**先看 §4**）、[`plans/2026-11-24-chain-2.md`](plans/2026-11-24-chain-2.md)（目前的開案書：積壓總表與第二條長鏈）。上一份 [`plans/2026-11-22-health-and-backlog.md`](plans/2026-11-22-health-and-backlog.md) 是體檢與第一條鏈的紀錄。架構決策在 [`adr/`](adr/README.md)，動結構前先查。蒔繪盤的畫法在 skill `makie-painting`（§4.4）。

## 1. Git 狀態

| 項目 | 狀態 |
|---|---|
| 主線 | `main` 與 `origin/main` 同步；實際位置以 `git log -1 main` 為準。11/18–11/20 上線的：全庫事實查核（792 → 734 筆，`56fc135`）、材質表解耦第 0–4c 步（ADR 0016、0017）、第一次載入先非同步編譯（ADR 0018）、地著色器冷編譯減半（ADR 0019）、換函不再卡（ADR 0020）。11/22 的 `b61314c` 只改合約文件 |
| 工作分支 | 本機與遠端平常只有 `main`；工作分支合併後就刪。現況以 `git branch -a` 為準，這一列不逐次改 |
| 子代理工作樹 | 目前沒有（`git worktree list` 只有主資料夾）。要用時由主代理建在 `C:\Git\_wt_kyoto_<topic>`（`git worktree add`）並負責刪除；`node_modules` 用 junction 連到主資料夾（`cmd /c mklink /J`），**刪工作樹前先 `cmd /c rmdir` 拿掉 junction**，否則會刪到主資料夾的 `node_modules`。舊工作樹 `_wt_kyoto_doha` 已拆，截圖與派工紀錄在 `.shots/_archive_wt_kyoto_doha/` |
| 遠端與部署 | GitHub repo `Avalon-Ash/Kyoto-Bunko`；GitHub Pages（`https://avalon-ash.github.io/Kyoto-Bunko/`）由 `.github/workflows/deploy.yml` 在 push `main` 時自動部署。部署結果用 `gh run list --workflow deploy.yml --limit 3` 查。`b61314c` 的 push 那次因 GitHub 取不到 artifact 失敗，同一個 commit 重跑成功（2026-11-22）。11/23 15:08 起連續三次（`6ef5f01`、`fd0afad` 與它的重跑）同樣失敗：lint、測試、build、上傳都過，是同一個 job 裡 `deploy-pages` 查不到剛上傳的 artifact（[actions/deploy-pages#451](https://github.com/actions/deploy-pages/issues/451)，11/22 起多個 repo 回報）。11/24 把 build 與 deploy 拆成兩個 job（GitHub 範本的寫法）；線上在修好前停在 `73ac948` |
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
| 資料 | **734 筆**，`validate_data.js --strict` ERROR 0／WARN 0。全庫每一類都事實查核過一輪（食處 11/16；商店、ACG、寺社、自然、近代設施、交通 11/17–18），退役與改區的來源在 `agent-runs/2026-11-16-r9*.md` 與 `2026-11-17-*audit*.md`。「營業中」的依據是 Tabelog 英文版沒有閉店類標示，不是現場確認。未結的個別項目在開案書 §3 B6、B7 |
| 首頁文庫 | 十一區文箱，每區一面蒔繪盤；單指盒面移光，長拖換函，雙指捏合／滾輪／快捷鍵放大（上限 3 倍），點蓋／Enter／空白鍵開蓋直入 `DetailView`；月光預設、閒置移光 |
| 蒔繪盤 | **只有 three.js 一條管線**（`plate/three-renderer.js`＋`three-pack.js`）。舊的自寫 WebGL2 管線、2.5D 浮雕與 `?three=0` 已刪。狐、鳳凰、鶯、銀沙灘與向月台、石垣都是 three 網格，沒有平塗佔位。岩面是菱形切金（受光大而密、背光小而疏），銀岩是銀。地有疏密場（靠近物較密）。土坡、高台、庭的面是刑部梨子地（不規則的大金片，沒有格子），切金只在稜邊成群；上京南庭與左京銀沙灘是銀的平目地。九區有依附小景（`plate/<區>.js` 裡帶 `on` 欄位的部件）。**銀的分工**（2026-11-16 對照德川美術館「初音蒔絵文台・硯箱（部分）」照片）：葉是金的樹，幹與枝是銀（背光氧化銀灰、受光淡銀、上面是切銀）；開銀花的櫻保留金幹；霞帶的金裡躺著細長的灰銀條。**作舊**：總開關 `?age=0..1`（預設 .85，0 是全新）；地是深棕橙的梨子地、圖的金比地淡、岩與樹幹的陰面是硫化銀的暖深灰；部件腳邊只有光影（環境光遮蔽與投影），沒有畫上去的汙；粉的疏密過渡加強；銀、切銀、平文銀（砂、狐、花、腳印）保持淡；平嵌小物依輪廓裁切，邊界只留 0.5 單位（`reach: .5`），否則旁邊會多一圈材質；紅珊瑚（`MAT.coral`）用在楓葉、梅心、「大」字。屋面是金粉、貼金只在小部分並透出木紋；丘與台地全部拆掉，十一區用 `plate/doha.js` 的遠山（`mountain()`）、岸（`banks()`）、洲浜（`tongues()`）與霞，輪廓逐片手寫在各區 `<區>.js`；地是最深的一層（亮度約 28–38）、濃梨子地中間（48–58）、平金與線最亮（60–85），`PLATE_TONE=1` 可分層量；包漿預設開（`?coat=0` 可關）；岩是 `crag-mesh.js` 的尖岩簇。**11/17 的修整**（都已上線）：岸與洲浜改成研出、遠山沿稜線淡出、霞改成金粉、岸與山面的金粉會閃、盒內的紙、岩的表面與稜面、漆經年變透與年代演示（漆齡用漢數字），紀錄在 [`plans/2026-11-17-finish.md`](plans/2026-11-17-finish.md) §8–§15 |
| 材質 | 材質的性質與配方只在 `plate/mat.js` 的 `MAT_LOOK` 一張表（ADR 0017、0016）：地著色器讀表、不比材質編號；renderer 不比名字；測試的範圍圍欄會擋。經過在 [`plans/2026-11-18-material-table.md`](plans/2026-11-18-material-table.md) §8 |
| 第一次載入 | 第一塊盤先非同步編譯整個場景，期間顯示該區的降級圖（ADR 0018）。地著色器冷編譯 5.0–5.2 秒、冷快取到實景 8.1–9.7 秒（桌機 D3D，材質表提案 §8.17；ADR 0019）。著色器進快取之後不受影響 |
| 換函 | 鄰盒的預覽只畫背景已預建並編譯完的區，沒好就淡出淡入（ADR 0020）；量測在 [`plans/2026-11-20-next.md`](plans/2026-11-20-next.md) N5 |
| 降級 | 沒有 WebGL2、three 載入或啟動失敗、context 遺失、或網址加 `?plate=static` 時，顯示預渲染的靜態圖（`plate/static/` 22 張 webp，十一區 × 日夜），換函與開蓋照常，盒面不動。**盤面有改動就要重拍**：`node scripts/plate-fallback-shots.mjs`（dev server 在 3000） |
| 全站 UI | 手機優先、深色預設；暖日／月光、語系、減少動態全站共用（色票唯一來源 `src/theme.css`）。卡片有傾斜與柔光（觸控只有按壓回饋）、篩選後新卡片淡入；30 張以上的列表分批渲染（`src/lib/batch-render.ts`） |
| 背景 | すやり霞＋和紙＋金箔／銀塵、障子格光與卓面光澤（`backdrop.js`）；十一區各自的紋樣與一行短句（`ward-art.js`，「地標＋該區另一個重點」） |
| 地圖 | 卷內地圖是 Leaflet＋OSM 官方圖磚（ADR 0006）。使用者 2026-11-22：維持現狀、不再投資 |
| 歲時記 | 只有[計畫](SEASONAL_PLAN.md)；首頁入口已移除。使用者 2026-11-22：擱到體質與畫面收完 |
| 文箱架構 | `study.js`（`mountBunko`：手勢、移光、縮放、換函、開蓋）、`renderer.js`（選 three 或靜態圖）、`plate/three-renderer.js`＋`three-pack.js`、`plate/static-plate.js`、`plate/parts.js`＋`vocab.js`＋`mat.js`＋`<區>.js`（構圖資料）、`plate/creature-mesh.js`／`crag-mesh.js`／`architecture-mesh.js` 等（網格）、`backdrop.js`＋`ward-art.js`（背景） |

## 3. 最近一次驗收（2026-11-23 晚，分支 `claude/cleanup-1123`，base `6ef5f01`）

| 檢查 | 結果 |
|---|---|
| `npm run lint` | exit 0（`tsc --noEmit`、JS 的 JSDoc 型別檢查、ESLint、ADR 21 份） |
| `npx --no-install tsx validate_data.js --strict` | ERROR 0、WARN 0，734 筆 |
| `npm test` | `scripts/*.test.mjs` 154／154（刪了 3 個只測 `rock()` 的）、`src/lib/*.test.ts` 27／27 |
| `npm run build` | exit 0；`three-renderer` 808.47 kB（gzip 230.68）、`main` 362.56 kB（gzip 117.49）、`ClusterMap` 205.87 kB（gzip 61.42） |
| `npm run smoke` | 通過（three.js 畫出、console 無錯） |
| 部件雜湊 | `plate-parts-hash --check` 11／11 相同（刪的程式沒有區在用，十一區的部件一個位元都沒變；所以這次沒有拍圖、沒跑 `plate-clip`） |
| 部署 | 上一次是 `73ac948`（長鏈，2026-11-23 部署成功）；這個分支還沒合併 |

以上是主代理 11/23 晚在主資料夾跑的（`claude/cleanup-1123`）。11/22 那天沒有拍圖；最近一次蓋面矩陣是 11/20 的 `plate-matrix.sh`（25 張 0 差異，[`plans/2026-11-20-next.md`](plans/2026-11-20-next.md)）。穿插檢查用 `node scripts/plate-clip.mjs <out.json>`，上次跑是 11/23 的長鏈整合（`c19e02f`，findings 0）。

**沒人驗過的**：11/16 之後上線的畫面與效能，沒有人在手機實機上看過或量過；所有截圖與量測都是這台機器的無頭 Chrome（桌機 GPU）。使用者 2026-11-22 決定不看實機、畫面由主代理全權決定（§4.1）；所以報告裡不要寫「實機看過」。

## 4. 下一步

### 4.1 現在停在哪裡（2026-11-22）

使用者要主代理做專案體檢、列積壓工作、排計畫，成果是 [`plans/2026-11-22-health-and-backlog.md`](plans/2026-11-22-health-and-backlog.md)。使用者在對話裡定了四件事（開案書 §5）：

1. **先做工程體質**（文件、靜態檢查、解耦、載入），畫面排在後面。
2. **實機不看了，畫面由主代理全權決定**：岩新版、屋面顏色、貼金範圍、金片粒徑、青金與金山的差距、霞、漆變透的幅度、盒繩的光澤下限，由主代理看桌機與 375 px 截圖自己定，做完告知結果。
3. **地圖維持現狀、不再投資**：T4.3（個別景點地圖）與 MapLibre 從待辦移除；要拔掉另外開案（會取代 ADR 0006）。
4. **歲時記擱到體質與畫面收完**。

之後使用者要求把工作排成一條長鏈、對齊一次、做完才合回主線（開案書 §8；回主線前分支自由開，技術上的取捨由主代理定）。使用者事先同意了：全鏈 A–E、解耦提案 (a)(b)、新增 ESLint、刪 `.shots` 舊批次、驗收過就合併 `main` 並 push。

**長鏈做到哪裡**（已全部合併 `main` 並部署，2026-11-23；細節在開案書 §9）：階段 A（工程體質）完成：JavaScript 型別檢查與 ESLint 接進 `npm run lint`（ADR 0021）、區的順序與拍圖腳本環境只定義一處、`study.js` 的係數命名、測試拆成行為與圍欄、冒煙測試 `npm run smoke`、依賴補丁版。11/23 晚由 Opus 主席接手（Fable 週額度用完）：階段 B 完成，只量不改，數字在開案書 §9.10，量測腳本是 `scripts/perf-home.mjs`。階段 C 的資料未結項完成（`817dfc2` 與後續修正；報告 `agent-runs/2026-11-23-data-open-items.md`），門面做了 meta description 與 favicon；OG 圖與 README 的八張截圖（都是 11/13 舊管線）等階段 D 做完再拍。lib 測試 27 個、README 與 `DEVELOPMENT.md` 的修正也進了整合分支。階段 D：八項逐項決定，只改了「岩」：九區 17 顆舊圓岩換成伏見、中京的尖岩簇，其餘七項不改，理由在開案書 §9.11–§9.12。README 的八張圖與 OG 圖已重拍（§9.13）。階段 E：Fable 終審（API 點數）結論「可以合併」，應修的已修（§9.14）。**全部完成**：合併 `main`、push、部署成功，工作分支已刪；`.shots` 只刪了沒被任何文件、skill、記憶或程式引用的 19 項（約 139 MB），被引用的舊批次都留著。**11/23 晚的收尾**（開案書 §9.15）：使用者要 NK-084、NK-085 重查一輪、不合規範就拿掉；重查時 Tabelog 沒有出現安全驗證，兩頁都開得到原文、沒有閉店標示，內容與現有資料相符，兩筆保留。使用者同意刪沒人用的程式：`rock()`／`rock-mesh.js`（連同只有它讀的 `ROCK_LOOK`）與 `MAKIE_LANDMARKS` 的 `title`／`shape` 已刪。**下一步**：積壓已收成一張總表，第二條長鏈（F 體質、G 資料、H 穩健、I 畫面、J 收尾）排在 [`plans/2026-11-24-chain-2.md`](plans/2026-11-24-chain-2.md)；開跑前的十個問題使用者 11/24 已回答（該檔 §5.1），可以開跑。

誰做什麼：照全域合約「跨模型派工」（Fable 預算、動手原則）與目前開案書（`plans/2026-11-24-chain-2.md`）§1 的額度表、§3 的執行者欄；每包開工前用 `quota` skill 重查額度。定調類的視覺由主代理自己做，可拆且有目標圖或數字驗收的才派子代理。

### 4.2 下一個工作階段照這樣開始

1. 讀 `AGENTS.md`、本檔、開案書；專案記憶會自動載入。
2. `git fetch --prune; git status -sb; git branch -a`，確認從最新的 `main` 開工作分支。
3. 查額度（`quota` skill），照目前開案書 §3 選下一包與執行者。
4. 要動結構先查 [`adr/`](adr/README.md)；要動盤面先讀 skill `makie-painting`，並看參考圖與現況圖（都在本機 `.shots/`，不在 repo；雲端工作階段看不到）：`.shots/ref/`（初音、千代姬等實物照）、`.shots/polish/FINAL-day.png`、`FINAL-night.png`。
5. 合併 `main`、push 分開問使用者；解耦提案（P3）、刪 `.shots` 也要問。

### 4.3 做完的批次（只供回溯，不是待辦）

| 期間 | 內容 | 紀錄 |
|---|---|---|
| 11/16 | 蒔繪盤收尾、UI、資料（R0–R10） | [`plans/2026-11-16-roadmap.md`](plans/2026-11-16-roadmap.md) |
| 11/17 | 盤面修整 P1–P5、盒內、岩、漆經年變透 | [`plans/2026-11-17-finish.md`](plans/2026-11-17-finish.md) |
| 11/17–18 | 全庫事實查核、資料線交接 | [`plans/2026-11-18-data-next.md`](plans/2026-11-18-data-next.md) |
| 11/18–20 | 材質表解耦、冷編譯 | [`plans/2026-11-18-material-table.md`](plans/2026-11-18-material-table.md) |
| 11/20 | 冷編譯減半、換函卡頓、ADR 回填 | [`plans/2026-11-20-next.md`](plans/2026-11-20-next.md)、[`agent-runs/2026-11-20-adr-backfill-report.md`](agent-runs/2026-11-20-adr-backfill-report.md) |

### 4.4 使用者定的設計規則

規則只在一處維護：skill `~/.claude/skills/makie-painting/`（`SKILL.md` 的 R1–R18；做法與原話在同資料夾的參考檔，2026-11-18 寫成，使用者還沒看過）。原話的證據在專案記憶。repo 裡有一份備份 [`skills/makie-painting/`](skills/makie-painting/BACKUP.md)（以 skill 為準，skill 改了要重新複製，做法寫在該資料夾的 `BACKUP.md`）。外部代理讀不到 skill，派工時把用得到的段落貼進派工單。以下只記這個 repo 的狀態：

- **岩**：使用者 2026-11-17 解除「先不動」。主代理改了表面（切金成群、露出岩身）與形（扇區成平面、稜線相接），見 `plans/2026-11-17-finish.md` §14。還沒做的是逐顆寫輪廓與峰（立面的岩）。
- **屋面顏色、貼金範圍、金片粒徑**：原本等使用者意見；2026-11-22 起由主代理決定（§4.1），改或不改都寫下理由。
- **加材質、動著色器**：照 §4.5 與 ADR 0017、0019；不要再加比材質編號或名字的分支。

### 4.5 工具與踩過的坑

- 拍圖：`node scripts/plate-shot.mjs <outDir> <job…>`，job＝`name:steps:theme:WxH:zoom:fx,fy`。步數：南 0、右京 1、西京 2、山科 3、伏見 4、北 5、上京 6、下京 -1、東山 -2、中京 -3、左京 -4。環境變數：`PLATE_TONE=1`（分層調子）、`PLATE_KIRI=1`（切金佔比）、`PLATE_CPU=4`、`PLATE_LIGHT=fx,fy`（把游標光移開）、`PLATE_SHOT_QUERY='?coat=0'`。dev server 在 127.0.0.1:3000、無頭 Chrome 用 9377。
- 量測：`node scripts/plate-doha-measure.mjs <區…>`（佔比、留白、直線）、`plate-doha-similar.mjs`（形的相似度）、`plate-clip.mjs <out.json>`（穿插）。降級圖：`node scripts/plate-fallback-shots.mjs`（22 張；只改了幾區就把其餘 `git checkout` 還原）。
- **冒煙測試**：`npm run smoke`（首頁 → 換函 → 開蓋進卷 → 返回，console 無錯；約 5 秒；要 dev server 與 GPU，不在 `npm test` 裡）。改了文箱或首頁的流程就跑一次。
- **拍圖 job 可以直接寫區名**（`kita`、`W_KITA`），步數的寫法照舊能用；腳本的 dev 位址、埠與 Chrome 啟動都在 `scripts/lib/plate-env.mjs`。
- **有幾個像素會自己跳 1 級**：南區 (448,261)、中京 (755–757, 387–392)、伏見兩個點、下京夜 (634,360)、西京日 (488–681, 219–264 之間的三點)（1440×900 的圖）。逐像素比對只在這些位置差 1 級時，重拍那一張再比；和任何一次改前的拍攝相同就不算差異（開案書 §9.4、§9.5、§9.9）。
- **量第一次載入與換函**：`node scripts/perf-home.mjs [--cpu 4] [--size 375x812 --mobile] [--url …] [--compile]`（用法在檔頭；自己開、自己關一個 9379 埠的 Chrome）。要量正式建置就 `vite build` 到別處再 `vite preview`，用 `--url` 指過去；dev server 沒打包，JS 載入會被高估。
- **不要在拍圖用的 Chrome 開著時跑 `npm ci`**：`node_modules/.cache/chrome-profile` 被它鎖住，`npm ci` 會刪到一半以 EBUSY 中斷。要乾淨安裝就在工作樹裝，或先關掉自己啟動的那個 Chrome（開案書 §9.6）。
- **要證明一個修改沒有動到畫面**：`bash scripts/plate-matrix.sh <資料夾>` 拍改前與改後（固定時鐘、只拍盤），`node scripts/plate-diff.mjs <改前>/<組> <改後>/<組>` 逐像素比。改前與改後要在同一次開機、同一個 dev server 裡拍（跨一次重開機會差 1–2 級）；有差異的那一張要重拍，重現才算。拍圖進行中不改 `src/`。細節在材質表提案 §8.2、§8.7、§8.8。拍圖腳本的檢查偶爾會讀早了、對某一張報 WRONG 而圖本身是對的（`plans/2026-11-20-next.md` N5）：以比對結果為準並重拍那一張。
- **加材質**：在 `mat.js` 的 `MAT_LOOK` 加一列：地的欄與配方（`recipe`）、烘焙畫法（`fine`）、網格（`mesh`，`meshLook` 的欄）；地著色器不比材質編號、renderer 不比名字（測試會擋）。不要把上色搬進 GLSL 函式：冷編譯從十幾秒變成 32–49 秒（推測是共用的鋪粉被編譯器在每個配方裡各展開一份）。
- **要拍開盒的畫面**（盒內、托盤、紙）：`plate-shot.mjs` 加 `PLATE_EVAL_SHOT=1` 與送 Enter 鍵的 `PLATE_EVAL`，會多存一張 `<name>-after.png`；指令在材質表提案 §8.18。
- **著色器的編譯時間要在真的瀏覽器裡、排除快取後量**：做法在材質表提案 §8.12（把程式的原始碼拿出來、加一個有用到的 uniform、另開 context 編譯計時；dev 模式的 `window.__kyotoRenderer`）。在著色器裡加一個沒用到的常數不保證快取失效；無頭 Chrome 也量不到。冷快取量測用 dev 的 `?cold`（ADR 0018）。
- **量換函**：自己開無頭 Chrome（ANGLE D3D11），第二次載入、等 4 秒讓鄰區預建完，對 `#scene` 送方向鍵；記長任務、超過 50 ms 的 rAF 間隔、`renderedWard` 改變的時間（`plans/2026-11-20-next.md` N5；腳本沒提交）。
- 改著色器不要用 `sed -i`：dev server 偵測不到，會量到舊畫面。用編輯工具或整檔寫回。
- **外觀要在沒有光的時候也成立**：手機沒有滑鼠，光要等閒置自動移光才出現；桌機截圖的光剛好照在盤心，會把只靠金粉反光的差別（例如池心的深淺）拍得比實際明顯。檢查時加一張 `PLATE_LIGHT=.02,.95`（光移到盤外）和一張 375×812。
- 批次拍圖時別讓別的頁面同時佔用 GPU（瀏覽器面板開著盤面、另一支拍圖腳本）：換區的按鍵會被吃掉，拍到別區或別的日夜。拍完核對輸出裡每張的 `"ward"`，日夜看圖的角落亮度。
- 收尾停 dev server 與無頭 Chrome 時，**只結束自己啟動的行程（記下 PID）**。11/17 有子代理用太寬的條件結束了 10 個行程。
- 直線檢查（`plate-doha-measure.mjs` 的 `longestStraight`）只是防呆；不要為了過檢查在輪廓上加等距的小波浪。
- 把整張照片的亮度中位數當成地的目標是錯的（地被調太亮過一次）；目標要分層量。
- `npm test` 在重裝依賴（`npm ci`）後第一次偶發 1 個失敗，之後連跑 11 次都過，沒定位；再出現先存完整輸出（開案書 B9）。
- 本機有 ThreeRT（`C:\Git\_ext\ThreeRT`，RTX 4070 走 Vulkan 硬體光追，南區 64 spp 約 1.1 秒），可以算參考圖；沒有烘焙模式、沒有正交相機。
- 整合子代理成果的流程：在工作樹 `git add -A scripts src docs && git commit`，主資料夾 `git cherry-pick`，主資料夾重跑四項驗收，複製截圖到主資料夾 `.shots/`。

### 4.6 待辦

**待辦只在開案書維護**：[`plans/2026-11-24-chain-2.md`](plans/2026-11-24-chain-2.md) §2（積壓總表）與 §3（階段與順序）。舊開案書（roadmap、finish、data-next、next、health-and-backlog）裡的待辦都已收進去，不再當待辦來源。這裡只留開案書各列會用到的細節：

- **資料（B6、B7）**：12 月複查三家店：HY-065 八咫（臨時休業）、NK-120 村上開新堂（改裝休業）、NK-111（新店無評論）；仍未營業就退役。沒有原文、留給日後的：FS-018 伏水酒蔵小路改不改成食處（Tabelog 頁打不開）、NK-014 寺町通商店街的身分、延暦寺根本中堂內部參拜、安祥寺與真如堂的國寶、清水寺等國寶指定頁的原文；出處在 `plans/2026-11-18-data-next.md` §3 與三份查核報告（[商店](agent-runs/2026-11-17-shop-audit.md)、[ACG 與寺社](agent-runs/2026-11-17-audit-acg-temples.md)、[自然、近代設施與交通](agent-runs/2026-11-17-audit-nature-modern.md)）。新 ID 一律用歷史上沒用過的號碼（`git log -p -- src/data/spots` 找最大號）。
- **盤面小缺口（B10）**：鳳凰不放大時頭與喙偏小；細小的草、葦不放大時幾乎看不到；夜間濃梨子地與圖案差距小；`parts.js` 的 `act()` 會讓任何 `MAT.lamp` 的部件在游標停留時發橘光，所以小景不要用 `MAT.lamp`；背景霞帶避開盒子的輪廓是照舊盒子調的，比 three 的盒子窄 2–10 px。
- **效能的小項（B13）**：中京預建的 387 ms 長工作（`meshRock` 那項已隨檔案刪除）要改構圖檔才能切，收益小，沒排（[報告](agent-runs/2026-11-17-mesh-perf.md)）。
- **遮蔽圖（B12）**：用 ThreeRT 算每區俯視遮蔽圖給地用（[研究](plans/2026-11-16-lighting-research.md) 實驗 2），還沒做。
- **地圖**：維持現狀（§4.1）。評估與 B-0 量測在 [R10 備忘錄](plans/2026-11-16-r10-map-evaluation.md)。OSM 圖磚被擋時，最省事的替代是換 OpenFreeMap 的網址或改走 `protomaps-leaflet`。

使用者的常設決定：資料查不到就退役（ID 留給日後補資料）；「國寶」標籤含國寶建造物與國寶藏品；真實性第一，資料由主代理直接判斷。**合併 `main`、push、新增大型依賴仍要逐次問，合併與 push 分開問。**

## 5. 不變條件（摘要；全文見 `AGENTS.md` §2）

- 十一區、古地名與地標保留；蒔繪和區界是同一畫面，不恢復切換或下方清單當主要入口。
- 設計語言一律依初音調度（`MAKIE_THREE_PLAN.md` §2a）。盤上的東西是正視的畫（像松），不是俯瞰的實體；材質先分沉在漆裡、研出（面露出、邊包在漆下）、在漆上三類；地最深，圖案比地亮（使用者 2026-11-16）。初音是技法與材質的定標，不是構圖的範本：它多是近景的物語畫，我們是地標建築加山水的遠景，構圖由主代理設計（使用者 2026-11-16）。明暗差用光照與遮蔽做，不往表面混暗色；任何兩種表面相接都要有漸變（使用者 2026-11-16）。技法的堆疊照 [`plans/2026-11-16-technique-stack.md`](plans/2026-11-16-technique-stack.md) §2.3：大面積的土坡、高台、庭用刑部梨子地或平目地；切金、切銀只散在岩、樹幹與邊緣做點睛，不整面鋪（使用者 2026-11-16）。小景只能依附於物、逐區設計，不可隨機撒（`MAKIE_COMPOSITION_PLAN.md` §7）。立體做大形，特徵用平嵌的切金銀意象。
- 不做耦合、不留魔術數字；解耦是架構改動，先提案、使用者同意再動手（`AGENTS.md` §2、ADR 0017）。
- `municipalityId: 'M_OTSU'` 是唯一授權過的受保護型別擴充；其餘受保護檔案仍不可改（ADR 0003）。
- 所有導航共用 `buildGoogleMapsUrl`；地標座標只讀 `SPOT_POSITIONS`。
- `theme.css`、`index.css`、`bunko-ui.css`、`ClusterMap.tsx`、`study.css`、`bunko.css`、`backdrop.js`、`ward-art.js` 屬同一視覺工作線，同時只能有一個寫入者。

## 6. 文件地圖

| 文件 | 現在的用途 |
|---|---|
| [`plans/2026-11-24-chain-2.md`](plans/2026-11-24-chain-2.md) | **目前的開案書**：積壓總表、第二條長鏈的階段與執行者、開跑前要對齊的問題 |
| [`plans/2026-11-22-health-and-backlog.md`](plans/2026-11-22-health-and-backlog.md) | 體檢的弱點、第一條長鏈（A–E）的執行紀錄、使用者 11/22 的四個決定 |
| [`adr/`](adr/README.md) | 架構決策紀錄（21 份）；`npm run adr:check` |
| [`plans/2026-11-18-material-table.md`](plans/2026-11-18-material-table.md) | 材質表解耦與冷編譯的提案與執行紀錄；§8 有拍圖比對與編譯量測的做法 |
| [`plans/2026-11-20-next.md`](plans/2026-11-20-next.md)、[`plans/2026-11-18-data-next.md`](plans/2026-11-18-data-next.md)、[`plans/2026-11-17-finish.md`](plans/2026-11-17-finish.md)、[`plans/2026-11-16-roadmap.md`](plans/2026-11-16-roadmap.md) | 做完的批次的開案書與結果（§4.3）；裡面的待辦已收進目前的開案書 |
| `plans/2026-11-16-*.md` | 11/16 各包的開案書與結果：`patina`（作舊）、`clip`（穿插）、`technique-stack`、`roof-makie`、`doha`（疊坡，§10–§18 是遠山與岩的規則與歷次失敗）、`ground-tone`、`coat`（包漿）、`nine-wards`（九區，§9 是總結）、`lighting-research`、`r10-map-evaluation` |
| `MAKIE_THREE_PLAN.md` | three.js 架構與設計語言（§2a） |
| `MAKIE_GROUND_PLAN.md`、`MAKIE_COMPOSITION_PLAN.md` | 地與構圖的設計紀錄 |
| `MAKIE_THREERT_REFERENCE.md` | 路徑追蹤參考圖的做法 |
| `MAKIE_PLATE_HANDOFF.md`、`MAKIE_REBUILD_PLAN.md`、`MAKIE_STAMPS.md` | 11/14 以前的紀錄（舊管線時期）；只供回溯，不當待辦來源 |
| `UI_RENEWAL_PLAN.md`、`UI_RENEWAL_ARCHITECTURE.md`、`UI_RENEWAL_ART.md` | UI 翻新的設計；只供回溯 |
| `PLAN.md`、`AGENT_EXECUTION_PLAN.md` | Phase 0–4 的歷史計畫與舊派工表；模型分工以全域合約與目前的開案書為準 |
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
| 11/16 食處與標籤查核 | `agent-runs/2026-11-16-r9a-heritage-tags.md`、`2026-11-16-r9b`～`r9f-food-*.md` |
| 11/17 效能、資料清理與全庫查核 | [`2026-11-17-perf.md`](agent-runs/2026-11-17-perf.md)、[`2026-11-17-mesh-perf.md`](agent-runs/2026-11-17-mesh-perf.md)、[`2026-11-17-data-cleanup.md`](agent-runs/2026-11-17-data-cleanup.md)、三份查核報告（§4.6） |
| 11/20 ADR 回填 | [`2026-11-20-adr-backfill.md`](agent-runs/2026-11-20-adr-backfill.md)、[報告](agent-runs/2026-11-20-adr-backfill-report.md) |
