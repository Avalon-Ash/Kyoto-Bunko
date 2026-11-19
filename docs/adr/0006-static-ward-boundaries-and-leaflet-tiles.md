# 0006 靜態行政區邊界與詳細地圖維持 Leaflet 及 OSM 圖磚

狀態：採用
日期：2026-11-17

## 背景

詳細地圖需呈現京都市十一行政區界與區外遮罩，同時面臨底圖供應政策、套件體積與多 WebGL context 風險。靜態行政區邊界於 2026-10-28 建置（`src/data/geo/README.md`）；R10 評估 MapLibre 與個別景點地圖後，使用者於 2026-11-17 看過 B-0 量測決定維持現狀，本檔取最新定案日 2026-11-17。

## 決定

- **靜態區界離線建置**：十一區 GeoJSON 存放於 `src/data/geo/ward-boundaries.ts`（ODbL 1.0，保留 © OpenStreetMap contributors 署名），由離線一次性腳本 `scripts/fetch-ward-geo.mjs` 依 Nominatim 使用政策抓取、驗證身分與幾何（含 Polygon 洞與 MultiPolygon 分量）並經持久快取產生。嚴禁前端執行期、CI 或定期排程呼叫 Nominatim。
- **詳細地圖延遲載入與技術棧**：`ClusterMap.tsx` 與 Leaflet 採首次切換地圖時延遲載入；區外暗化遮罩由 `src/lib/map-geometry.ts` 保留內洞與多邊形分量。
- **底圖維持現狀**：日夜皆使用 Leaflet 搭配 OSM 標準圖磚，以 `.map-tiles-day` 與 `.map-tiles-night` CSS 濾鏡切換日夜色調（濾鏡不作用於金線與標記）；不導入 MapLibre、不進行 PMTiles 自架底圖（B-1）與個別景點地圖（T4.3）。

## 放棄的做法

- CARTO `dark_all` 暗色圖磚：因改為要求 API key 而停用（`src/components/ClusterMap.tsx` 檔頭）。
- Google Geocoding／Places 作為座標來源或底圖：條款禁止將座標存入公開 repo 超過 30 天並禁止自建資料集，且需金鑰與付費（`docs/plans/2026-11-16-r10-map-evaluation.md` A2、B-0）。
- MapLibre GL JS（打包約 461 kB gzip、須重寫 `ClusterMap.tsx` 並增加一個 WebGL context）與 `protomaps-leaflet` 自架京都 PMTiles（全京都 z15 約 34 MB 檔案與額外樣式維護）：經 B-0 實測後使用者決定維持現狀，不做 B-1；MapTiler／Stadia 免費方案因限非商業且須在前端放金鑰而未採納（`docs/plans/2026-11-16-r10-map-evaluation.md` B2、B-0 §3–§4）。

## 後果

- 執行期無外部地理編碼依賴，首頁 bundle 不載入地圖庫；幾何拒收與離線重建由 `scripts/fetch-ward-geo.test.mjs` 把關。
- 維持依賴 OSM 官方圖磚（best-effort、無 SLA）；若日後遭封鎖，已知替代路徑為更換 OpenFreeMap 網址或改採 `protomaps-leaflet`（須另案核准）。

## 證據

- `docs/DEVELOPMENT.md`（真實地圖引擎與空間映射）
- `docs/HANDOFF.md`（§4.6）
- `docs/plans/2026-11-16-r10-map-evaluation.md`（A2、B2、B-0）
- `src/data/geo/README.md`、`src/data/geo/ward-boundaries.ts`、`src/components/ClusterMap.tsx`、`src/lib/map-geometry.ts`
- `scripts/fetch-ward-geo.mjs`、`scripts/fetch-ward-geo.test.mjs`

