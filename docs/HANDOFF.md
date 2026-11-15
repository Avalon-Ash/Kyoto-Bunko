# 京都專案交接入口

更新：2026-11-16。這是**唯一的目前狀態入口**；各輪細節在 `agent-runs/`，舊狀態以 Git 歷史為準，不在文件頂端堆疊「最新狀態」。新對話依序讀 `../AGENTS.md`、本檔、[`plans/2026-11-16-roadmap.md`](plans/2026-11-16-roadmap.md)（目前的開案書：拆包表、派工、驗收、停下來問的條件）。蒔繪盤的設計語言在 `MAKIE_THREE_PLAN.md` §2a。

## 1. Git 狀態

| 項目 | 狀態 |
|---|---|
| 主線 | `main` 與 `origin/main` 在 `4ed80e3`（2026-11-15）：three.js 蒔繪盤為預設、T3 材質、黑漆壁真塗都已上線。實際 HEAD 以 `git log -1 main` 為準 |
| 工作分支 | `claude/roadmap-1116`（2026-11-16 從 `main` 開）：開案書 R0–R10 的全部成果都在這裡，**尚未合併 `main`、尚未 push**（各自需要使用者同意；push `main` 會觸發部署）。總表見 [`agent-runs/2026-11-16-overnight-chain.md`](agent-runs/2026-11-16-overnight-chain.md) |
| 本機分支清理 | 2026-11-16 刪除已併入 `main` 的本機 `claude/great-brahmagupta-ye2uqt`、`claude/threert-reference`（刪前確認 `git log main..<branch>` 為 0） |
| 遠端分支 | 2026-11-16 刪除已併入 `main` 的 `origin/claude/great-brahmagupta-ye2uqt`、`origin/claude/amazing-cerf-cuoj8j`（使用者同意）。遠端只剩 `main` |
| 子代理工作樹 | 放在 `C:\Git\_wt_kyoto_<topic>`（`git worktree add`），由主代理建立與刪除。本輪用過的兩個已移除；目前有哪些以 `git worktree list` 為準 |
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

## 2. 目前產品狀態（`claude/roadmap-1116`，尚未上線）

| 範圍 | 狀態 |
|---|---|
| 資料 | **792 筆**，`validate_data.js --strict` ERROR 0／WARN 0。2026-11-16 查完十一區所有食處（Tabelog）與「世界遺產」「國寶」標籤：退役 17 筆、改區 27 筆。「營業中」的依據是 Tabelog 英文版沒有閉店類標示，不是現場確認。寺社、商店等其他類型的事實查核還沒做 |
| 首頁文庫 | 十一區文箱，每區一面蒔繪盤；單指盒面移光，長拖換函，雙指捏合／滾輪／快捷鍵放大（上限 3 倍），點蓋／Enter／空白鍵開蓋直入 `DetailView`；月光預設、閒置移光 |
| 蒔繪盤 | **只有 three.js 一條管線**（`plate/three-renderer.js`＋`three-pack.js`）。舊的自寫 WebGL2 管線、2.5D 浮雕與 `?three=0` 已刪。狐、鳳凰、鶯、銀沙灘與向月台、石垣都是 three 網格，沒有平塗佔位。岩面是菱形切金（受光大而密、背光小而疏），銀岩是銀。地有疏密場（靠近物較密）。九區有依附小景（`plate/<區>.js` 裡帶 `on` 欄位的部件） |
| 降級 | 沒有 WebGL2、three 載入或啟動失敗、context 遺失、或網址加 `?plate=static` 時，顯示預渲染的靜態圖（`plate/static/` 22 張 webp，十一區 × 日夜），換函與開蓋照常，盒面不動。**盤面有改動就要重拍**：`node scripts/plate-fallback-shots.mjs`（dev server 在 3000） |
| 全站 UI | 手機優先、深色預設；暖日／月光、語系、減少動態全站共用（色票唯一來源 `src/theme.css`）。卡片有傾斜與柔光（觸控只有按壓回饋）、篩選後新卡片淡入；30 張以上的列表分批渲染（`src/lib/batch-render.ts`） |
| 背景 | すやり霞＋和紙＋金箔／銀塵、障子格光與卓面光澤（`backdrop.js`）；十一區各自的紋樣與一行短句（`ward-art.js`，2026-11-16 改寫為「地標＋該區另一個重點」） |
| 歲時記 | 只有[計畫](SEASONAL_PLAN.md)；首頁入口已移除 |
| 文箱架構 | `study.js`（`mountBunko`：手勢、移光、縮放、換函、開蓋）、`renderer.js`（選 three 或靜態圖）、`plate/three-renderer.js`＋`three-pack.js`、`plate/static-plate.js`、`plate/parts.js`＋`vocab.js`＋`mat.js`＋`<區>.js`（構圖資料）、`plate/creature-mesh.js`／`rock-mesh.js`／`architecture-mesh.js` 等（網格）、`backdrop.js`＋`ward-art.js`（背景） |

## 3. 最近一次驗收（2026-11-16，`claude/roadmap-1116` `0734d1d`）

| 檢查 | 結果 |
|---|---|
| `npm run lint` | exit 0 |
| `npx --no-install tsx validate_data.js --strict` | ERROR 0、WARN 0，792 筆 |
| `npm test` | `scripts/*.test.mjs` 128/128、`src/lib/*.test.ts` 17/17 |
| `npm run build` | exit 0；`three-renderer` chunk gzip 約 195 KB |

截圖都是無頭 Chrome（桌機 GPU）拍的，存在子代理的工作樹裡，已隨工作樹刪除。**本輪所有畫面改動使用者都還沒在實機上看過。**

## 4. 下一步

1. **等使用者決定**：把 `claude/roadmap-1116` 合併進 `main`、push（各自分開問）。上線前建議使用者先在本機看一輪：鳳凰、岩面切金、九區小景、卡片高光、`?plate=static`。
2. **等使用者決定**：[地圖評估備忘錄](plans/2026-11-16-r10-map-evaluation.md)：景點座標管線（建議做）與 MapLibre 小實驗（建議先不全面導入）。
3. 12 月複查三家店：HY-065 八咫（臨時休業）、NK-120 村上開新堂（改裝休業）、NK-111（新店無評論）；仍未營業就退役。
4. 還沒做的：歲時記（R11）；寺社與商店類的事實查核；各食處報告裡列的描述細節（米其林、創業年）；背景霞帶避開盒子的輪廓是照舊盒子調的，比 three 的盒子窄 2–10 px。
5. 已知的小缺口：鳳凰不放大時頭與喙偏小；細小的草、葦、「大」字不放大時幾乎看不到；`parts.js` 的 `act()` 會讓任何 `MAT.lamp` 的部件在游標停留時發橘光，所以小景不要用 `MAT.lamp`。

使用者 2026-11-16 的常設決定：資料查不到就退役（ID 留給日後補資料）；「國寶」標籤含國寶建造物與國寶藏品；小景的主設計是該區特色，用「日本人會想看到什麼」判斷。**合併 `main`、push、新增大型依賴仍要逐次問。**

## 5. 不變條件（摘要；全文見 `AGENTS.md` §2）

- 十一區、古地名與地標保留；蒔繪和區界是同一畫面，不恢復切換或下方清單當主要入口。
- 設計語言一律依初音調度（`MAKIE_THREE_PLAN.md` §2a）。小景只能依附於物、逐區設計，不可隨機撒（`MAKIE_COMPOSITION_PLAN.md` §7）。立體做大形，特徵用平嵌的切金銀意象。
- `municipalityId: 'M_OTSU'` 是唯一授權過的受保護型別擴充；其餘受保護檔案仍不可改。
- 所有導航共用 `buildGoogleMapsUrl`；地標座標只讀 `SPOT_POSITIONS`。
- `theme.css`、`index.css`、`bunko-ui.css`、`ClusterMap.tsx`、`study.css`、`bunko.css`、`backdrop.js`、`ward-art.js` 屬同一視覺工作線，同時只能有一個寫入者。

## 6. 文件地圖

| 文件 | 現在的用途 |
|---|---|
| [`plans/2026-11-16-roadmap.md`](plans/2026-11-16-roadmap.md) | **目前的開案書**：拆包、派工、驗收、停下來問 |
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
