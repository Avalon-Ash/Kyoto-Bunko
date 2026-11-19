# 0002 景點 ID 穩定與標籤登記表雙層機制

狀態：採用
日期：2026-10-15

## 背景

景點 ID 同時作為 Schema、雙語 Locale、地標座標表與查核紀錄的外鍵，且專案採分區載入與多模式篩選。D1 與 D3 標籤決策載明於 `docs/PLAN.md` §1（2026-10-15），退役 ID 不重編號亦於 2026-11-16 再度確認，本檔取最初決策日 2026-10-15。

## 決定

- **ID 穩定與命名**：景點 ID 固定採兩碼行政區大寫前綴加三位流水號（`XX-NNN`），使讀取單一區檔或分批載入時可由前綴辨識所屬區。ID 刪除或退役後不重編號，新增景點須取歷史未曾使用之流水號。
- **雙層標籤與白名單**：
  - `src/data/tags.ts`（`TAG_REGISTRY`）為篩選用標籤的唯一事實來源；`spots/*.ts` 的 `tagIds` 只限使用已登記鍵名，單一景點上限 6 個，且 `T_FOOD` 禁用「世界遺產」。禁止在其他檔案硬編碼標籤字串，代理人不得自行擴充白名單。
  - `locale.tags` 僅供 UI 顯示；ZH 須鏡射 schema `tagIds`，缺乏對應系統標籤的描述詞僅寫入 locale 而不擴充 `TAG_REGISTRY`。
- **主副標籤白名單**：主 Tab（`typeId`）對應可顯示的副標籤分組集中於 `src/data/type-tag-groups.ts`（`TYPE_TAG_GROUP_MAP`），禁止在 `useKyotoEngine`、`TagSelector` 或資料層複製。

## 放棄的做法

- `W_WARD_SLUG`、`XX-FOOD-NNN` 等非標準 ID 格式，因違反分區前綴規則而禁止（`docs/DEVELOPMENT.md`）。
- D1 曾評估將 8 筆「ZH 有、schema 無」的已登記標籤自 ZH 刪除；因內容皆為事實且補入後不超過 6 個，決定補進 schema 而非刪除（`docs/PLAN.md` §1）。
- 使用語意模糊標籤（如「美食」），因語意過寬而禁止，食處須指定具體類型（`docs/DEVELOPMENT.md`）。

## 後果

- `validate_data.js` 阻擋非法 ID 格式／前綴／重複、幽靈標籤、超過 6 個標籤、`T_FOOD` 誤標世界遺產，以及 `TYPE_TAG_GROUP_MAP` 與 `TYPES` 不同步；ZH 未鏡射 schema 列為 WARN（`--strict` 視為失敗）。
- 需新增系統標籤時須交由使用者審查後統一登記，不能由代理人臨時加入。

## 證據

- `AGENTS.md`（§2 專案不變條件）
- `docs/DEVELOPMENT.md`（御秘帖；UX 設計原則；Schema 設計細則；資料錄入規範 §4）
- `docs/PLAN.md`（§1 D1、D3）
- `docs/HANDOFF.md`（§4.6）
- `src/data/tags.ts`、`src/data/type-tag-groups.ts`、`validate_data.js`

