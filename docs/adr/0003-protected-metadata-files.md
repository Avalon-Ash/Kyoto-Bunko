# 0003 核心元數據與全域型別列為受保護檔案

狀態：採用
日期：2026-10-28

## 背景

`spots-loader`、`useKyotoEngine`、`validate_data.js` 與各 UI 元件皆共用同一組全域型別與行政區、分區、分類、標籤元數據；任一未協調的鍵值變更會導致下游系統靜默失效。原紀錄未載明最初封閉日期，本檔取執行合約啟用日 2026-10-28（`docs/PLAN.md` §0）；跨市例外授權於 2026-11-04（T4.2）。

## 決定

- 劃分資料層權限邊界，以下六個檔案列為受保護（封閉操作），代理人未獲使用者明確授權禁止修改：
  - `src/data/tags.ts`、`src/data/types.ts`、`src/data/areas.ts`、`src/data/wards.ts`、`src/data/index.ts`、`src/types.ts`。
- 代理人一般僅開放修改 `src/data/spots/*.ts` 與 `src/data/locales/{zh,ja}/*.ts`（仍須依派工單範圍）。
- 經授權的唯一型別擴充例外為 `municipalityId`（2026-11-04 T4.2，配合 `src/data/municipalities.ts` 登記 `M_OTSU` 等周邊市域），藉此分離「旅遊目錄歸屬（`wardId`/`areaId`）」與「實體市域」；省略表示 `M_KYOTO`。其餘受保護檔案維持封閉。

## 放棄的做法

- 為跨市景點（如延暦寺、向日神社）新增京都行政區、改寫既有景點 ID，或將市外地點標示為京都市內：因破壞十一區結構與 ID 穩定而未採行（`docs/DEVELOPMENT.md` 資料錄入規範 §2、`docs/PLAN.md` Phase 4 T4.2）。
- 受保護檔案清單本身是否曾評估其他權限分界，原紀錄沒有寫。

## 後果

- 代理人大量處理資料查核或 UI 任務時不會意外改動核心型別與外鍵定義；任何標籤或分類擴充皆須停下並交使用者核准。
- 跨市景點由 `validate_data.js` 與 `src/lib/map-clusters.ts` 強制要求登記合法 `municipalityId` 與查證後的真實座標。

## 證據

- `AGENTS.md`（§2 專案不變條件）
- `docs/DEVELOPMENT.md`（資料錄入規範 §1–§2）
- `docs/PLAN.md`（§0 執行者守則；Phase 4 T4.2）
- `docs/HANDOFF.md`（§5 不變條件）
- `src/types.ts`、`src/data/tags.ts`、`src/data/types.ts`、`src/data/areas.ts`、`src/data/wards.ts`、`src/data/index.ts`、`src/data/municipalities.ts`
- `validate_data.js`

