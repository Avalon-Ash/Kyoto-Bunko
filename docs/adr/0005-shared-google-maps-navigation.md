# 0005 導航網址共用 buildGoogleMapsUrl 與日文名錨點

狀態：採用
日期：2026-10-15

## 背景

景點卡片與地圖叢集面板皆需提供開啟 Google Maps 定位的功能，同時全庫多數景點未存經緯度，且包含英文／羅馬字 ACG 景點、帶括號消歧義名稱與跨市景點。括號消歧義規則（D2）於 2026-10-15 決定（`docs/PLAN.md` §1），跨市地域規則於 2026-11-04 補入（T4.2），本檔取初始規則決定日 2026-10-15。

## 決定

- 全站 Google Maps 導航統一呼叫 `src/components/SpotCard.tsx` 匯出的 `buildGoogleMapsUrl`，`SpotCard` 與 `ClusterMap` 等入口共用，禁止在其他元件複製網址拼接規則。
- 搜尋錨點以 `spot.jaName`（由 `spots-loader.ts` 在所有語系下自 JA locale 注入的官方日文全名）為唯一事實來源，不依賴地理座標。
- 組裝規則固定如下：
  1. 剝除半形／全形括號附註並 trim（允許在 JA name 以括號作消歧義或 ACG 標記，禁止純裝飾後綴）。
  2. 完全等於「先斗町」時改用「先斗町公園」。
  3. 依 `getSpotLocation` 判斷：跨市景點附加真實市名與府縣；京都市內指定廣域名稱（`STANDALONE_NAMES`）僅附加「京都」；其餘附加 `WARD_NAMES[wardId].ja` 與「京都」。
  4. 各片段經 `encodeURIComponent` 後以 `+` 串接至 `https://www.google.com/maps/search/?api=1&query=...`，禁止使用 `maps/dir/`。

## 放棄的做法

- 使用 `maps/dir/` 點對點導航端點（`docs/DEVELOPMENT.md` Query Assembly System、`src/components/SpotCard.tsx`）。
- 在 Schema 內維護獨立的 `mapQuery` 欄位：已廢除，違反結構與文字分離原則（`AGENTS.md` §2、`src/types.ts`）。
- D2 方案 B（逐筆移除 51 筆 JA name 的括號附註）：會導致 ACG 重複景點變成同名而放棄，改由 `buildGoogleMapsUrl` 剝除括號並移除驗證器對括號的警告（`docs/PLAN.md` §1 D2）。

## 後果

- 導航行為集中於單一函式並由 `scripts/location-navigation.test.mjs` 驗證，不因座標缺漏或語系切換而失效。
- JA locale 的 `name` 成為對外搜尋契約，必須填寫可在 Google Maps 檢索的官方全名，不可任意拼湊。

## 證據

- `AGENTS.md`（§2 專案不變條件）
- `docs/DEVELOPMENT.md`（Query Assembly System；資料錄入規範 §3）
- `docs/PLAN.md`（§1 D2；Phase 4 T4.2）
- `src/components/SpotCard.tsx`、`src/data/spots-loader.ts`、`src/data/municipalities.ts`
- `scripts/location-navigation.test.mjs`

