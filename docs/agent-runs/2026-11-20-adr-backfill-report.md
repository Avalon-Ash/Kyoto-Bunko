# 回填架構決策紀錄（ADR）報告

日期：2026-11-20。工作區：`C:\Git\_wt_adr_kyoto`，分支：`docs/adr-backfill`。本輪只寫文件，未啟動實作、未派子代理、未 commit／push。

## 1. ADR 清單

| 編號 | 標題 | 狀態 | 日期 | 出處文件與章節 |
|---|---|---|---|---|
| 0001 | 景點結構層與雙語內容層分離 | 採用 | 2026-10-15 | `AGENTS.md` §2；`docs/DEVELOPMENT.md`（核心架構：ECS 與 SSOT 原則；資料錄入規範 §2–§3）；`docs/PLAN.md` §1、T2.4；`src/types.ts`、`src/data/spots-loader.ts`、`validate_data.js` |
| 0002 | 景點 ID 穩定與標籤登記表雙層機制 | 採用 | 2026-10-15 | `AGENTS.md` §2；`docs/DEVELOPMENT.md`（御秘帖；UX 設計原則；Schema 設計細則；資料錄入規範 §4）；`docs/PLAN.md` §1（D1、D3）；`docs/HANDOFF.md` §4.6；`src/data/tags.ts`、`src/data/type-tag-groups.ts`、`validate_data.js` |
| 0003 | 核心元數據與全域型別列為受保護檔案 | 採用 | 2026-10-28 | `AGENTS.md` §2；`docs/DEVELOPMENT.md` 資料錄入規範 §1–§2；`docs/PLAN.md` §0、T4.2；`docs/HANDOFF.md` §5；`src/types.ts`、`src/data/municipalities.ts` |
| 0004 | 地圖座標集中管理、經緯度順序與禁止假座標 | 採用 | 2026-11-17 | `AGENTS.md` §2；`docs/DEVELOPMENT.md`（真實地圖引擎與空間映射；資料錄入規範 §5）；`docs/agent-runs/2026-10-28-landmarks.md`；`docs/agent-runs/2026-11-17-data-cleanup.md` §1；`src/data/map-centers.ts`、`src/lib/map-clusters.ts`、`src/lib/map-labels.ts` |
| 0005 | 導航網址共用 buildGoogleMapsUrl 與日文名錨點 | 採用 | 2026-10-15 | `AGENTS.md` §2；`docs/DEVELOPMENT.md`（Query Assembly System；資料錄入規範 §3）；`docs/PLAN.md` §1（D2）、T4.2；`src/components/SpotCard.tsx`、`src/data/spots-loader.ts`、`scripts/location-navigation.test.mjs` |
| 0006 | 靜態行政區邊界與詳細地圖維持 Leaflet 及 OSM 圖磚 | 採用 | 2026-11-17 | `docs/DEVELOPMENT.md`（真實地圖引擎與空間映射）；`docs/HANDOFF.md` §4.6；`docs/plans/2026-11-16-r10-map-evaluation.md`（A2、B2、B-0）；`src/data/geo/README.md`、`src/components/ClusterMap.tsx`、`scripts/fetch-ward-geo.mjs` |
| 0007 | 全站色票集中於 theme.css 與單一視覺寫入線 | 採用 | 2026-11-09 | `AGENTS.md` §3；`docs/DEVELOPMENT.md`（視覺風格：漆藝）；`docs/HANDOFF.md` §2、§5；`docs/UI_RENEWAL_ARCHITECTURE.md` §0–§1、§2.5；`src/theme.css`、`src/index.css`、`src/bunko-ui.css`、`src/data/i18n.ts` |
| 0008 | 文箱控制器解耦、純函式縮放與背景動畫邊界 | 採用 | 2026-11-09 | `docs/DEVELOPMENT.md`（京洛文庫）；`docs/UI_RENEWAL_ARCHITECTURE.md` §1–§5、§8；`docs/UI_RENEWAL_PLAN.md` §4、§6；`docs/plans/2026-11-16-roadmap.md` R8；`src/components/BunkoEntrance.tsx`、`src/studies/toji/study.js`、`src/studies/toji/view.js`、`src/studies/toji/backdrop.js`、`src/lib/card-fx.ts`、`src/lib/batch-render.ts` |
| 0009 | 禁止新增大型繪圖依賴並以原生 WebGL2 繪製蒔繪盤 | 已取代（由 0010） | 2026-11-11 | `AGENTS.md` §2；`docs/UI_RENEWAL_ARCHITECTURE.md` §8；`docs/MAKIE_PLATE_HANDOFF.md` §4；`docs/MAKIE_REBUILD_PLAN.md` §3 |
| 0010 | 蒔繪盤改用 three.js 單一管線與靜態圖降級 | 採用（取代 0009） | 2026-11-14 | `AGENTS.md` §2；`docs/HANDOFF.md` §2；`docs/MAKIE_THREE_PLAN.md` §1、§3、§7；`docs/MAKIE_GROUND_PLAN.md` §0；`docs/MAKIE_THREERT_REFERENCE.md`；`docs/plans/2026-11-16-roadmap.md` §1、R3；`src/studies/toji/renderer.js`、`src/studies/toji/plate/static-plate.js`、`scripts/plate-fallback-shots.mjs` |
| 0011 | 蒔繪盤技法分層、透漆包漿與三層亮度結構 | 採用 | 2026-11-16 | `docs/HANDOFF.md` §2、§5；`docs/MAKIE_THREE_PLAN.md` §2a；`docs/plans/2026-11-16-technique-stack.md` §2.3、§4；`docs/plans/2026-11-16-coat.md` §1、§3、§7.4；`docs/plans/2026-11-16-ground-tone.md` §2–§3；`docs/plans/2026-11-16-patina.md` §9；`docs/plans/2026-11-16-roof-makie.md` §1–§4 |
| 0012 | 蒔繪盤地形採手寫疊坡組件、依附小景與逐點貼地 | 採用 | 2026-11-16 | `docs/HANDOFF.md` §2、§5；`docs/MAKIE_COMPOSITION_PLAN.md` §7；`docs/plans/2026-11-16-doha.md` §1、§3–§4；`docs/plans/2026-11-16-nine-wards.md` §1；`docs/plans/2026-11-16-clip.md` §2–§4；`src/studies/toji/plate/doha.js`、`src/studies/toji/plate/fillers.js`、`scripts/plate-clip.mjs` |
| 0013 | 禁止架構耦合與蒔繪盤材質表單一事實來源 | 採用 | 2026-11-19 | `AGENTS.md` §2（不做耦合）；`docs/HANDOFF.md` §4.4a、§4.5；`docs/plans/2026-11-18-material-table.md` §0、§2、§4、§8.1–§8.13；`src/studies/toji/plate/mat.js`、`src/studies/toji/plate/three-pack.js`、`src/studies/toji/plate/doha.js`、`src/studies/toji/plate/rock-mesh.js`、`scripts/plate.test.mjs` |
| 0014 | 測試區分行為測試與範圍圍欄並採統一驗收管線 | 採用 | 2026-11-14 | `AGENTS.md` §2、§5；`docs/PLAN.md` §0；`docs/AGENT_EXECUTION_PLAN.md` §1；`docs/UI_RENEWAL_ARCHITECTURE.md` §1、§6；`docs/MAKIE_THREE_PLAN.md` §4；`docs/plans/2026-11-18-material-table.md` §2.3、§3.1；`package.json` |
| 0015 | 主代理整合、Git 權限邊界與定調工作歸屬 | 採用 | 2026-11-17 | `AGENTS.md` §1–§5；`docs/HANDOFF.md` §1、§4.1；`docs/AGENT_EXECUTION_PLAN.md` §1–§2、§4、§6；`docs/plans/2026-11-17-finish.md` §2、§2.1；`docs/adr/README.md`、`scripts/check-adr.mjs` |

## 2. 合併、拆分與未寫成 ADR 的候選

### 2.1 合併與拆分理由
- **0009 與 0010 拆為取代鏈**：`AGENTS.md` §2、`docs/UI_RENEWAL_ARCHITECTURE.md` §8 與 `docs/MAKIE_REBUILD_PLAN.md` §3 原先明定不新增大型繪圖依賴並以自寫 WebGL2 實作蒔繪盤；2026-11-14 使用者裁定蒔繪盤例外改用 three.js，2026-11-16（R3）刪除舊管線並改採靜態圖降級。兩者皆屬長期約束程式架構的決定，依規則拆為 0009（已取代）與 0010（取代 0009）。
- **地圖領域拆為 0004、0005、0006**：分別對應資料座標契約（`map-centers.ts`、經緯度順序、禁假座標）、導航網址組裝契約（`buildGoogleMapsUrl`、`jaName` 錨點）與地理邊界／底圖技術棧（靜態 ODbL 區界、維持 Leaflet＋OSM 不導入 MapLibre），各檔維持單一決策。
- **UI 翻新架構拆為 0007、0008**：0007 管全站色票 token、樣式分檔、文案集中與單一視覺寫入線；0008 管 `mountBunko` 解耦、`view.js` 縮放、`backdrop.js` 離屏與 Web Animations 及大列表分批渲染。
- **蒔繪盤架構拆為 0010、0011、0012、0013**：分別對應渲染引擎與降級（three.js／靜態圖）、著色分層規則（包漿三類／技法堆疊／三層亮度）、地形與小景資料邊界（手寫疊坡／`on` 依附／逐點貼地），以及「不做耦合」原則與 `MAT_LOOK` 材質表實作。

### 2.2 考慮過但沒寫成 ADR 的候選與理由
- **首頁採十一區文箱入口、不保留舊方塊版 `MapCanvas` 切換**（`docs/PLAN.md` §1 D5、`docs/HANDOFF.md` §5）：屬產品入口與功能範圍取捨；與控制器解耦相關的模組邊界已納入 0008。
- **歲時記移除首頁入口與年度活動資料計畫**（`docs/SEASONAL_PLAN.md`、`docs/PLAN.md` T4.5）：目前僅為待實作計畫且未授權建置資料庫，屬待辦與產品範圍，依 `docs/adr/README.md` 不寫 ADR。
- **初音調度視覺定標、銀的分工、紅珊瑚點綴、`?age=.85` 等具體參數數值**（`docs/MAKIE_THREE_PLAN.md` §2a、`docs/plans/2026-11-16-patina.md`、`docs/UI_RENEWAL_ART.md`）：屬美術口味與調參數值，依規定不寫 ADR；僅將限制著色器結構的分層契約納入 0011。
- **景點內容事實查核規則與個案修正（Tabelog 營業查核、國寶涵蓋建造物與藏品、查不到即退役、D3／D4 個案）**（`docs/DEVELOPMENT.md` 資料錄入規範 §1、`docs/PLAN.md` §1、`docs/HANDOFF.md` §4.6）：屬內容策展與個筆資料查核作業規範，不限制程式結構；退役後 ID 不重編號的結構規則已納入 0002。
- **各區盤面個別構圖修正與尚未定案的岩／屋面調整**（`docs/plans/2026-11-16-nine-wards.md`、`docs/plans/2026-11-17-finish.md`、`docs/HANDOFF.md` §4.4）：屬單區構圖取捨與待辦，依規定不寫 ADR；跨區通用的地形與小景結構規則已納入 0012。
- **各階段模型配額表與夜間 agy 流水線擱置**（`docs/AGENT_EXECUTION_PLAN.md` §2、`docs/plans/2026-11-16-roadmap.md` §2、R12）：屬隨方案額度變動的派工配置與擱置待辦，不寫 ADR；固定權限邊界與動手原則已納入 0015。
- **跨專案畫法 skill（`~/.claude/skills/makie-painting/`）備份慣例**（`docs/HANDOFF.md` §4.4a）：正本位於 repo 之外，屬文件同步流程而非本 repo 程式架構契約，不寫 ADR。

## 3. 寫了「原紀錄沒有寫。」的欄位清單

| ADR | 章節 | 說明 |
|---|---|---|
| `docs/adr/0001-schema-locale-separation.md` | `## 放棄的做法` | 全節寫「原紀錄沒有寫。」（既有文件未載明曾評估並放棄的替代結構方案）。 |
| `docs/adr/0003-protected-metadata-files.md` | `## 放棄的做法` | 第二點註明「受保護檔案清單本身是否曾評估其他權限分界，原紀錄沒有寫。」（第一點記載跨市例外放棄新增行政區與改 ID）。 |

## 4. 執行指令與退出碼

| 階段 | 指令 | 退出碼 | 摘要 |
|---|---|---:|---|
| 開工基準 | `node scripts/check-adr.mjs --min 8` | 1 | ADR 只有 0 份，至少要 8 份 |
| 開工基準 | `git status` | 0 | 分支 `docs/adr-backfill`，工作樹乾淨（nothing to commit, working tree clean） |
| 初版驗收 | `node scripts/check-adr.mjs --min 8` | 0 | ADR 檢查通過：15 份，索引 `docs/adr/README.md` |
| 補齊換行複驗 | `node scripts/check-adr.mjs --min 8` | 0 | ADR 檢查通過：15 份，索引 `docs/adr/README.md` |
| 變更確認（寫報告前） | `git status` | 0 | modified: `docs/adr/README.md`；untracked: `docs/adr/0001-*.md`–`0015-*.md` |
| 差異確認（寫報告前） | `git diff --stat` | 0 | `docs/adr/README.md \| 16 +++++++++++++++-`（1 file changed, 15 insertions(+), 1 deletion(-)） |

（報告寫入後另於收尾步驟執行最後一次 `node scripts/check-adr.mjs --min 8`、`git status`、`git diff --stat`，結果列於任務結束回覆。）

## 5. 回退方式

本輪變更均未提交：
1. 還原索引修改：`git checkout -- docs/adr/README.md`
2. 刪除本輪新增的未追蹤檔案：`docs/adr/0001-*.md` 至 `docs/adr/0015-*.md`，以及 `docs/agent-runs/2026-11-20-adr-backfill-report.md`。

若後續已由主代理提交，使用 `git revert <commit-sha>` 回退該次提交即可。
