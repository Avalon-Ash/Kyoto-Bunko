# 0014 測試區分行為測試與範圍圍欄並採統一驗收管線

狀態：採用
日期：2026-11-14

## 背景

專案在長期資料查核、UI 翻新與蒔繪盤遷移期間，同時存在不得破壞的對外行為契約與隨階段推進會更新的過渡期限制，需要明確區分「改弱測試」與「合法更新圍欄」並統一本地與 CI 的驗證指令。統一 `npm test` 載於 2026-11-11 `docs/UI_RENEWAL_ARCHITECTURE.md` §1，行為測試與範圍圍欄之區分確立於 2026-11-14 `docs/MAKIE_THREE_PLAN.md` §4 與 `AGENTS.md` §2，本檔取該分類確立日 2026-11-14。

## 決定

- **測試分類**：
  - **行為測試**：驗證對外行為與不變條件，實作者不得改弱、放寬或刪除。
  - **範圍圍欄**：約束尚未遷移項目、過渡期表分工或暫時邊界之斷言，須於測試檔內以註解標明，允許於對應後續階段更新，不視為竄改既有測試。
- **受保護測試與驗收紀律**：主代理預先撰寫的回歸測試（如 `scripts/ui-renewal.test.mjs`）列為受保護，實作代理不得修改；不得為通過檢查而修改驗收腳本、塞入假資料或扭曲幾何。禁止新增 `as any` 逃避型別檢查。
- **統一整合驗收**：每次整合須執行四項閘門：`npm run lint`（`tsc --noEmit` 與 `node scripts/check-adr.mjs`）、`npx --no-install tsx validate_data.js`（Phase 收尾加 `--strict`）、`npm test`（`node:test` 跑 `scripts/*.test.mjs` 與 `tsx --test` 跑 `src/lib/*.test.ts`，CI 跑同一指令）及 `npm run build`。ERROR 須為 0、WARN 不得上升；畫面與地圖改動須另做 1440px／375px、日夜、語系、鍵盤與減少動態之瀏覽器驗收。

## 放棄的做法

- 照搬 FFT 專案的測試或效能指令、或以 build 成功代替畫面驗收（`AGENTS.md` §5、`docs/AGENT_EXECUTION_PLAN.md` §1）。
- 以 `npx tsc` 代替 `npm run lint`：未裝依賴時 `npx` 會下載同名錯誤套件 `tsc@2.0.4`（`docs/PLAN.md` §0）。
- 以有損 webp 降級圖或整張平均像素差（如 0.11/255）證明重構無畫面差異：改以固定時鐘零雜訊逐像素比對或資料雜湊驗證（`docs/plans/2026-11-18-material-table.md` §3.1、§8.13）。

## 後果

- 階段性遷移可透過註記清楚的範圍圍欄逐步收斂，同時維持行為測試不可鬆動。
- 驗收工具鏈全部依賴本機已安裝套件與 Node 內建 `node:test`，不需新增第三方測試框架。

## 證據

- `AGENTS.md`（§2、§5）
- `docs/PLAN.md`（§0 執行者守則）
- `docs/AGENT_EXECUTION_PLAN.md`（§1）
- `docs/UI_RENEWAL_ARCHITECTURE.md`（§1、§6）
- `docs/MAKIE_THREE_PLAN.md`（§4 硬規則）
- `docs/plans/2026-11-18-material-table.md`（§2.3、§3.1）
- `package.json`、`scripts/plate.test.mjs`、`scripts/ui-renewal.test.mjs`

