# 派工單：回填架構決策紀錄（ADR）

模型：agy Orchestrator（Neon）（大範圍讀文件再整理；選用依據是 Group-Battler 同型的包一次過）。
工作區：`C:\Git\_wt_adr_kyoto`，分支 `docs/adr-backfill`（主代理已建好，骨架已提交）。本輪授權：只寫文件，不啟動實作、不再派子代理。

## 目標與成品
把本專案**已經做過、而且會限制之後程式怎麼寫**的決策，從既有文件整理成一決策一檔的 ADR，讓之後的代理動結構前查得到「當初為什麼這樣做」。目前決策散在各份計畫書裡。

成品：
1. `docs/adr/0001-<英文小寫連字號>.md` 起，至少 8 份，編號連續。
2. `docs/adr/README.md` 最下面的「索引」：每份一行「一句話摘要＋相對連結」（例 `- [0001 景點 schema 只存結構](0001-schema-structure-only.md)：……`），並刪掉「（還沒有 ADR。）」。README 其他段落不動。
3. 報告 `docs/agent-runs/2026-11-20-adr-backfill-report.md`。

格式、編號、推翻規則全在 `docs/adr/README.md`，照它寫。

## 來源與取捨
- 內容**只能來自 repo 既有文件**：`AGENTS.md`、`docs/HANDOFF.md`、`docs/DEVELOPMENT.md`、`docs/PLAN.md`、`docs/AGENT_EXECUTION_PLAN.md`、`docs/UI_RENEWAL_ARCHITECTURE.md`、`docs/UI_RENEWAL_PLAN.md`、`docs/MAKIE_*.md`、`docs/SEASONAL_PLAN.md`、`docs/plans/**`，以及程式與測試檔頭的說明。查不到的欄位（常見是「放棄的做法」）寫「原紀錄沒有寫。」，不要自己編理由、不要寫你認為合理的替代方案。
- 日期用出處文件寫明的決定日期（例「使用者 2026-11-14 決定」）；出處沒寫日期時用那份文件檔頭或檔名的日期，並在「背景」註明日期的來源。
- 「證據」列出處：文件路徑與章節、程式或測試路徑。路徑用反引號包起來，而且必須真的存在（檢查腳本會確認）。
- 候選（自己判斷取捨、合併或拆開，理由寫進報告；不限於這些）：景點 schema 只存結構、名稱與描述放中日 locale；景點 ID 穩定、標籤只用登記值；地圖座標集中在 `map-centers.ts` 與經緯度順序；導航共用 `buildGoogleMapsUrl`；不新增大型繪圖依賴，以及蒔繪盤改用 three.js 的例外（原文若寫明是先後兩個決定，用取代鏈或在同一份的背景說明，照原文）；不做耦合與材質表（一個概念只定義在一處，`docs/plans/2026-11-18-material-table.md`）；受保護檔案清單；測試分行為測試與範圍圍欄；`docs/UI_RENEWAL_ARCHITECTURE.md` 裡的架構決定；蒔繪盤的技法分層與渲染管線（`docs/MAKIE_*_PLAN.md`、`docs/plans/2026-11-16-technique-stack.md`）；子代理不得做 Git 操作、主代理整合。
- 不寫 ADR 的：產品範圍、景點內容、美術口味與構圖取捨、數值、待辦。
- 文件裡寫著「原本 X，後來改成 Y」而且兩者都是架構決策時，拆成先後兩份並用取代鏈連起來；只在原文有寫的範圍內這樣做。
- 一個決定只寫在一份 ADR；索引只放摘要與連結，不複製全文。

## 開工前
- 先讀：`AGENTS.md`、`docs/adr/README.md`、`scripts/check-adr.mjs` 的檔頭註解、`docs/HANDOFF.md`。計畫書很多：先看各檔的標題與章節，再讀跟架構決定有關的段落；`docs/archive/**`、`docs/images/**` 不用讀。
- **讀檔與搜尋一律用內建檔案工具，不用終端機指令。**
- **只能跑這些指令**，每個單獨一次呼叫，字串照抄，不加 `cd`、不用 `&&` 或 `;` 串接；清單外的指令會被拒，而且整個執行會結束：
  `git status`、`git diff --stat`、`node scripts/check-adr.mjs --min 8`
- 開工先跑一次 `node scripts/check-adr.mjs --min 8`，確認它是紅的（0 份）。
- 無人值守：中途不要詢問；遇到停下條件就寫報告後結束。不要 commit、push、建或切分支。

## 守則與停下條件
- **只能新增或修改**：`docs/adr/0*.md`、`docs/adr/README.md`（只動「索引」一節）、`docs/agent-runs/2026-11-20-adr-backfill-report.md`。其他全部受保護，特別是 `scripts/**`、`package.json`、`AGENTS.md`、`docs/HANDOFF.md`、其他 `docs/**`、`src/**`。只改工作資料夾內的檔案。
- 驗收腳本不准改；不為了過檢查而刪掉證據路徑或改寫成不被檢查的寫法。同一個驗收失敗兩次（各帶新的假設）就停下回報。
- 只結束自己啟動的行程。
- 結束前 `node scripts/check-adr.mjs --min 8` 必須退出 0。

## 報告
ADR 清單表（編號、標題、狀態、日期、出處文件與章節）；考慮過但沒寫成 ADR 的候選與理由；寫了「原紀錄沒有寫。」的欄位清單；每個指令的「指令＋退出碼」；回退方式。不寫效果形容詞。
