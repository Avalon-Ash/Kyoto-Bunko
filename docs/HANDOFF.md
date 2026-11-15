# 京都專案交接入口

更新：2026-11-16。這是**唯一的目前狀態入口**；各輪細節在 `agent-runs/`，舊狀態以 Git 歷史為準，不在文件頂端堆疊「最新狀態」。新對話依序讀 `../AGENTS.md`、本檔、[`plans/2026-11-16-roadmap.md`](plans/2026-11-16-roadmap.md)（目前的開案書：拆包表、派工、驗收、停下來問的條件）。蒔繪盤的設計語言在 `MAKIE_THREE_PLAN.md` §2a。

## 1. Git 狀態

| 項目 | 狀態 |
|---|---|
| 主線 | `main` 與 `origin/main` 在 `4ed80e3`（2026-11-15）：three.js 蒔繪盤為預設、T3 材質、黑漆壁真塗都已上線。實際 HEAD 以 `git log -1 main` 為準 |
| 工作分支 | `claude/roadmap-1116`（2026-11-16 從 `main` 開）：文件整理、開案書與本輪工作。合併 `main` 與 push 各自需要使用者同意 |
| 本機分支清理 | 2026-11-16 刪除已併入 `main` 的本機 `claude/great-brahmagupta-ye2uqt`、`claude/threert-reference`（刪前確認 `git log main..<branch>` 為 0） |
| 遠端殘留分支 | `origin/claude/great-brahmagupta-ye2uqt`、`origin/claude/amazing-cerf-cuoj8j` 都已併入 `main`；刪遠端分支屬於 push，等使用者同意 |
| 子代理工作樹 | 放在 `C:\Git\_wt_kyoto_<topic>`（`git worktree add`），由主代理建立與刪除；目前有哪些以 `git worktree list` 為準 |
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

## 2. 目前產品狀態

| 範圍 | 狀態 |
|---|---|
| 資料 | 809 筆，`validate_data.js --strict` ERROR 0／WARN 0。綠燈只代表結構正確，不代表全庫事實查核完成（開案書 R9） |
| 首頁文庫 | 十一區文箱，每區一面蒔繪盤；單指盒面移光，長拖換函，雙指捏合／滾輪／快捷鍵放大（上限 3 倍），點蓋／Enter／空白鍵開蓋直入 `DetailView`；月光預設、閒置移光 |
| 蒔繪盤 | **three.js 是預設**（`2ed9e25`）。`?three=0` 或 three 載入／啟動失敗時退回舊的自寫 WebGL2 管線；沒有 WebGL2 時退回更舊的 2.5D 浮雕。地（梨子地、窗光、金色流水、切金、銀）、部件光照 L1–L5、岩與樹幹切金、T3 材質、鄰盒預建都已完成，使用者實機（含 Safari／iOS）看過 OK，樹也 OK。**狐、鳳凰、鶯、銀沙灘向月台仍是平塗佔位**（`three-renderer.js` 的 `paintPlaceholder`） |
| 降級方案（已決定） | 使用者 2026-11-16：刪舊管線後，不能跑 three 的裝置**顯示靜態圖**，不保留舊 WebGL2 管線與 2.5D 浮雕（開案書 R3） |
| 全站 UI | 手機優先、深色預設；暖日／月光、語系、減少動態全站共用（色票唯一來源 `src/theme.css`）；卷軸外觀由 `ScrollRoller.tsx` 統一；詳細頁固定底部列表／地圖切換 |
| 背景 | すやり霞＋和紙＋金箔／銀塵（`backdrop.js`）；十一區各自的紋樣與一行短句（`ward-art.js`）。使用者 2026-11-16：短句要再貼近該區重點（開案書 R1） |
| 歲時記 | 只有[計畫](SEASONAL_PLAN.md)；首頁入口已移除 |
| 文箱架構 | `study.js`（`mountBunko`：手勢、移光、縮放、換函、開蓋）、`renderer.js`（選渲染器）、`plate/three-renderer.js`＋`plate/three-pack.js`（three 版）、`plate/parts.js`＋`plate/vocab.js`＋`plate/<區>.js`（構圖資料）、`backdrop.js`＋`ward-art.js`（背景）。獨立展示頁另由 `study-chrome.js` 包一層控制，主站不載入 |

## 3. 最近一次驗收

`main` `4ed80e3` 的四項檢查（lint、validate strict、test、build）在各 commit 當時通過；本輪每包的結果記在 `agent-runs/2026-11-16-*.md`。

未測：手機幀時間（three 版）的數字量測。實機手感與 Safari／iOS 使用者已看過。

## 4. 下一步

照 [`plans/2026-11-16-roadmap.md`](plans/2026-11-16-roadmap.md) 的拆包表與順序。摘要：

1. R1 短句、R2 狐／鳳凰／鶯改成 three 網格、R9 資料事實查核（唯讀報告）先行。
2. R3 T5 收尾：量手機幀時間、做靜態圖降級、刪舊管線。
3. 之後是岩頂切金、逐區依附小景（方案先給使用者看）、疏密場、換函軌跡光、UI 彈簧與卡片光澤、地圖與歲時記的評估。

使用者 2026-11-16 的授權：蒔繪盤照計畫派工，視覺主代理可自己動手；UI 翻新與 Phase 4 由主代理安排，需要使用者時再說。**合併 `main`、push、新增大型依賴仍要逐次問。**

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
