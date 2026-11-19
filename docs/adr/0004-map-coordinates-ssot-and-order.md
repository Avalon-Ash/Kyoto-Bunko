# 0004 地圖座標集中管理、經緯度順序與禁止假座標

狀態：採用
日期：2026-11-17

## 背景

專案地圖同時處理 GeoJSON 行政區邊界、Leaflet 標記與地標點位，曾存在缺少真實座標時以雜湊抖動產生假點位的函式 `getLatLng`。座標集中與地標規則始於 2026-05（`src/data/map-centers.ts` 檔頭），移除 `getLatLng` 假座標於 2026-11-17 定案（`docs/agent-runs/2026-11-17-data-cleanup.md`），本檔取最新定案日 2026-11-17。

## 決定

- **單一座標來源**：分區中心點（`AREA_CENTERS`）與個別景點真實座標（`SPOT_POSITIONS`）集中於 `src/data/map-centers.ts`。具有「世界遺產」或「國寶」標籤之景點及跨市景點（`municipalityId`）必須在 `SPOT_POSITIONS` 登記查證後的真實座標。
- **經緯度順序約定**：GeoJSON（`src/data/geo/ward-boundaries.ts`）固定為 `[lng, lat]`，Leaflet 點位固定為 `[lat, lng]`，兩者不得混用。
- **禁止虛構與散射座標**：無真實座標的京都市內景點一律依 `areaId` 聚合於 `AREA_CENTERS[areaId]`；查無分區或跨市景點缺座標時於 `src/lib/map-clusters.ts` 直接拋出錯誤，不回退至預設點、不圍繞中心散射。
- **標記避讓不改座標**：標記重疊由 `src/lib/map-labels.ts`（`placeMapLabels`）依螢幕像素矩形計算偏移並繪製引線回原點，不得修改地理座標。

## 放棄的做法

- `map-centers.ts` 原有的 `getLatLng` 回退邏輯（無座標時以 ID 雜湊在分區中心周圍散射 ±0.005 度、查無分區時回傳京都車站）：會把未知位置畫成看似精確的座標或靜默錯置至車站，違反「未知資料不得當作精確值」，已於 2026-11-17 刪除（`docs/agent-runs/2026-11-17-data-cleanup.md` §1、`docs/plans/2026-11-16-r10-map-evaluation.md` A1）。
- 為避免標記重疊而移動地理座標本身：因會使地理定位失真而改採螢幕空間避讓（`docs/AGENT_EXECUTION_PLAN.md` §3 T3.5、`src/lib/map-labels.ts`）。

## 後果

- `validate_data.js` 阻擋 `AREA_CENTERS` 缺漏、`SPOT_POSITIONS` 指向不存在景點及跨市景點缺有效座標；世界遺產／國寶未登記 `SPOT_POSITIONS` 列為 WARN（`--strict` 失敗）。
- 缺乏查證座標的景點在地圖上維持分區叢集，不會以單點形式出現；補登座標須留來源與查核日期。

## 證據

- `AGENTS.md`（§2 專案不變條件）
- `docs/DEVELOPMENT.md`（真實地圖引擎與空間映射；資料錄入規範 §5）
- `docs/agent-runs/2026-10-28-landmarks.md`
- `docs/agent-runs/2026-11-17-data-cleanup.md`（§1）
- `src/data/map-centers.ts`、`src/lib/map-clusters.ts`、`src/lib/map-labels.ts`、`validate_data.js`

