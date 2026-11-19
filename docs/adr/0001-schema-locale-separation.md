# 0001 景點結構層與雙語內容層分離

狀態：採用
日期：2026-10-15

## 背景

本專案維護數百筆京都景點資料並支援繁體中文與日文雙語介面，需要同時支援跨區統計與按行政區動態載入文案。原紀錄未載明最初確立此分層的日期，本檔日期取自 `docs/PLAN.md` §1 既有資料規範首次決策日（2026-10-15）。

## 決定

- 資料層採 ECS 與單一事實來源（SSOT）設計，分離結構與文字內容：
  - **結構層（Schema）**放於 `src/data/spots/*.ts`，僅允許機器可讀欄位：`id`、`wardId`、`areaId`、`typeId`、`tagIds`，以及選填的 `reservationRequired`、`municipalityId`。嚴禁寫入 `name`、`desc`、`tags` 或已廢除的 `mapQuery` 等語言或渲染欄位。
  - **內容層（Locales）**放於 `src/data/locales/zh/` 與 `src/data/locales/ja/`，依行政區拆分，僅存放與景點 ID 對應的名稱、描述與顯示標籤串，增刪景點須與 Schema 三檔同步。
- 裝配由 `src/data/spots-loader.ts` 集中負責：Schema 採靜態匯入供 `getWardStats()`、`getAreaStats()`、`getTagCounts()` 計算；Locale 依語系採 Vite lazy 載入並組裝為 `FlatSpot`，所有語系一律自 JA locale 注入 `jaName`。
- UI 元件層禁止直接匯入 `src/data/spots/` 或 `src/data/locales/`，一律透過 `spots-loader.ts` 與 `useKyotoEngine` 取得資料。

## 放棄的做法

原紀錄沒有寫。

## 後果

- `validate_data.js` 阻擋 Schema 白名單以外的欄位，並檢查 ZH／JA Locale 缺漏或孤立節點；雙語文字調整不影響統計與結構型別。
- 每次新增、移轉或刪除景點，須先搜尋全庫引用並同步修改 Schema 與兩語 Locale 共三個檔案。

## 證據

- `AGENTS.md`（§2 專案不變條件）
- `docs/DEVELOPMENT.md`（核心架構：ECS 與 SSOT 原則；資料錄入規範 §2–§3）
- `docs/PLAN.md`（§1 決策點；Phase 2 T2.4）
- `src/types.ts`、`src/data/spots-loader.ts`、`src/data/spots/minami.ts`
- `validate_data.js`

