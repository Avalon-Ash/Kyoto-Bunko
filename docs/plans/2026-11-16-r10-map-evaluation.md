# R10 評估備忘錄：個別景點地圖（T4.3）與 MapLibre 向量底圖（T4.4）

日期：2026-11-16。撰寫：研究子代理（Sonnet 5.5，唯讀）。只出建議，由使用者決定做不做。本文不是法律意見。
來源查詢日一律 2026-11-16。「未查到」就是沒查到，沒有推測。

## 結論與建議（給使用者）

1. **A 個別景點地圖：建議做，分兩階段，先做「座標資料管線」再做「畫面」。** 全庫 792 個景點只有 45 個（5.7%）有真實座標，其餘都是分區中心加雜湊抖動或根本不上地圖點位。
2. **座標來源首選 OpenStreetMap（Nominatim 一次性小批次，加 Wikidata P625 補寺社）；不要用 Google 把座標存進 repo（條款明文不允許）。** 每個座標必須通過「落在所屬行政區邊界內」的檢查，並抽查，才能進 `SPOT_POSITIONS`。
3. 畫面不需要新依賴：沿用 Leaflet，依縮放層級顯示、Canvas 小點，點開才出名牌。每區平均只有約 72 個點（792 / 11 區），不是效能問題。
4. **B MapLibre：建議「先不做全面導入」，改做一個隔離的小實驗（約 1 包）。** 它的視覺收益是真的（漆黑配金線、和紙色、日文標籤、只留道路水系），但代價是約 300 kB gzip 的 JS（Leaflet 約 44 kB）、多一個 WebGL context、多一個外部圖磚依賴。
5. 若做實驗：圖磚來源優先「自架 Protomaps PMTiles 放在 GitHub Pages」（無第三方依賴、無金鑰、離線可預快取），次選 OpenFreeMap（免費免金鑰，但官方明說無 SLA、可能隨時停止）。MapTiler 與 Stadia 免費方案限非商業且要金鑰，不建議。
6. 順序建議：A 先於 B。A 的座標是 B 的前提，B 沒有 A 也能單獨做，但做了 B 而沒有 A 收益有限。
7. **目前網站已有一個風險：** 底圖直接打 OSM 官方圖磚 `tile.openstreetmap.org`（`ClusterMap.tsx:225`），該政策註明「best-effort、無 SLA、可能不經通知封鎖」。個人專案流量小，但 B 的任何方案同時也解掉這個風險。

---

## A. 個別景點地圖

### A1. 現況

- 座標數：`src/data/map-centers.ts` 的 `SPOT_POSITIONS` 共 45 筆（`grep` 計數，行 34–101）；`src/data/spots/*.ts` 的景點 ID 共 792 筆（正則計數）。→ 5.7%。
- 規則：檔頭註解（`map-centers.ts:4-5`）寫明只有世界遺產、國寶、各區超重要寺社登錄座標；2026-10-28 補登的來源與「園內錨點不代表幾何中心」見 `docs/agent-runs/2026-10-28-landmarks.md`。
- 沒座標的景點怎麼顯示：
  - `ClusterMap.tsx:172` 呼叫 `buildMapClusters`（`src/lib/map-clusters.ts:6-20`）。非「鄰近市町」的景點一律**依 `areaId` 聚成一個叢集點**，位置是 `AREA_CENTERS[areaId]`（19 個分區中心，`map-centers.ts:9-29`），標示「數字印章加區名」，點開從下方滑出該區景點卡片列表。
  - 有座標的景點（`SPOT_POSITIONS`）另外以地標圖示加名稱顯示（`ClusterMap.tsx:184-191`、`createLandmarkIcon` 行 82-88），但**不會**自叢集裡扣除（叢集數字仍含它）。
  - `map-centers.ts:106-140` 的 `getLatLng` 有「分區中心加 ±0.005 度雜湊抖動」的 fallback（約 ±500 m），但目前地圖的叢集路徑沒有使用它（`buildMapClusters` 直接用區中心）。若個別地圖上線，不要啟用這個抖動：它會畫出看起來精確、實際是假的位置，違反 AGENTS.md §2「未知資料不得當作精確值」。
  - 鄰近市町景點（如延暦寺）必須有座標，否則 `buildMapClusters` 丟錯（行 16）。
- 導航：`SpotCard.tsx:57` 的 `buildGoogleMapsUrl` 以名稱加區名搜尋，不依賴座標。這個可以保留，也不用把座標送進 Google。
- 區界：`src/data/geo/ward-boundaries.ts`（OSM 抽取、ODbL、簡化幾何），`scripts/audit-data.ts:25-31` 已有射線法 `inWard(lng, lat, geometry)`，註明「簡化邊界，只做候選篩查」。

### A2. 取得 792 個座標的做法比較

| 做法 | 能存進公開 repo？（條款） | 金鑰／費用 | 速率 | 日文店名、寺社名命中率 | 精度 |
|---|---|---|---|---|---|
| **OSM Nominatim**（公用實例） | 可，資料為 ODbL，需標示 © OpenStreetMap contributors，且 share-alike。政策原文：「Small extractions are likely covered by fair use」。本 repo 已有 ODbL 區界並附標示（`src/data/geo/README.md`）。來源：https://operations.osmfoundation.org/policies/nominatim/ | 免金鑰、免費。要有可識別的 User-Agent | 絕對上限每秒 1 次；大量批次「discouraged」，一次性小任務須單一執行緒、單機；結果必須自己快取 | **未知（無系統性量測）**。單點實測：查「清水寺 京都」第一筆為正確的清水寺（way 336641107，34.9943, 135.7844），第二筆是公車站同名。只一筆樣本，不能外推。寺社名在 OSM 通常有日文 name；餐廳與小店的覆蓋度未查到 | 建物或園區多邊形的代表點，寺社可到數十公尺；餐廳若有 POI 則為店面點 |
| **OSM Overpass** | 同上（ODbL） | 免金鑰；公用實例「少於 10,000 查詢／日、1 GB／日」，且「overloaded and not highly reliable」。來源：https://wiki.openstreetmap.org/wiki/Overpass_API | 非地址搜尋，是依標籤與範圍查詢。較適合「一次抓京都市所有 `amenity=place_of_worship` 與 `historic`」再自己做名稱比對，只需 1 次大查詢，不用 792 次 | 取決於自己寫的名稱比對；未知 | 同 OSM |
| **國土地理院 地名検索 API**（`msearch.gsi.go.jp/address-search/AddressSearch?q=`） | **未查到 API 本身的使用條款**。GSI 網站內容適用「国土地理院コンテンツ利用規約」（令和7年11月20日改正），需標示出典，來源：https://www.gsi.go.jp/GSI/chosaku.htm 。規約內文（PDL1.0 等）我未能直接抓到，只由搜尋摘要得到，不可當成最終依據；要用前請人工讀規約，並對 API 另行確認 | 免金鑰、免費 | 未查到官方限制 | 實測 `q=清水寺`：回 21 筆，涵蓋全日本同名寺院與町名，其中 135.785059, 34.994844 是京都的清水寺。**只能靠區界檢查或加地名縮小**；本質是地名與住所檢索，**不是 POI 資料庫**，餐廳多半查不到（未實測，標未知） | 地名點或建物點，寺社多半可用 |
| **Wikidata P625** | 可，結構化資料為 CC0，來源：https://www.wikidata.org/wiki/Wikidata:Licensing | 免金鑰、免費（SPARQL 端點有自己的 fair use，未查到數字） | 小批次即可 | 只涵蓋有 Wikidata 條目的名勝（寺社、文化財很多；餐廳很少）。覆蓋率**未知** | 條目座標，品質參差 |
| **Google Geocoding／Places** | **不可。** 政策原文：緯經度只能暫存「up to 30 consecutive calendar days, after which you must delete」；Place ID 可永久存。禁止用結果「create or augment your own mapping… dataset」，也不得批次地理編碼服務。來源：https://developers.google.com/maps/documentation/geocoding/policies 、https://developers.google.com/maps/terms-20180207 （§10.4(c)(ii)、§10.5） | 需金鑰與帳單 | 付費方案 | 日文店名預期最好，但這是推測；本項無法合規落地 | 最佳，但不能存 |
| **人工從 Google Maps 抄座標** | 與上一列同樣的條款疑慮（內容用於自建資料集）；我判斷風險相同，不建議 | 免費，但人力大 | — | 高 | 高 |
| **人工從 OSM 或地理院地圖點選** | 可（ODbL 或 PDL 加出典） | 免費，人力大 | — | 對自己熟悉的 POI 高 | 取決於點選 |

補充：Nominatim 的 ODbL share-alike 是否對「把座標抄進本 repo」構成衍生資料庫，政策只說小量抽取「likely」屬合理使用，沒有保證；本專案已有同性質的 OSM 區界在 repo 內並附標示，風險同級。建議在 `docs/DEVELOPMENT.md` 或座標檔頭記載來源與 ODbL 標示，並在網站頁尾加「座標 © OpenStreetMap contributors」。

### A3. 建議流程

1. **候選產生（腳本，不寫入正式檔）**：新增 `scripts/geocode-spots.mjs`（唯讀對 `src/data` 讀名稱與區界，輸出到 `docs/agent-runs/<date>/geocode-candidates.json`，不直接改 `map-centers.ts`）。
   - 景點日文名取自 ja locale；先去掉括號補充（沿用 `buildGoogleMapsUrl` 的清洗規則，不另寫第二套）。
   - 查詢順序：Wikidata（寺社與名勝）→ Overpass 一次抓京都市範圍 POI 自行比對 → 對剩下的 Nominatim 單線程、每秒 ≤1 次、自訂 User-Agent、結果快取到檔案（重跑不再打）。792 次約 15 分鐘量級，在政策「小型一次性」範圍內但接近下限，建議分批（每批 ≤150）並先問使用者同意。
   - 每筆候選記：來源、查詢字串、回傳名稱、回傳類型、座標、查詢日。
2. **自動閘門**：
   - 候選座標必須落在該景點 `wardId` 的區界內（沿用 `audit-data.ts` 的 `inWard`，但要抽成共用函式，且區界是簡化幾何，邊界 ±50 m 內的點需人工看）。鄰近市町景點（`municipalityId`）改驗市域，目前專案沒有市域邊界資料（未查到，需另抓）。
   - 回傳名稱與查詢名正規化後必須相符（`audit-data.ts:17` 有 `normalize`）。
   - 同座標被多個 ID 命中視為可疑（連鎖店、同名分店）。
   - 類型為公車站、車站出口、道路的結果一律丟棄（上面 Nominatim 的清水寺公車站即此例）。
3. **人工抽查**：寺社與名勝全數看一眼（量不大）；食處抽 10%，並與 Tabelog 查核共用一個步驟（食處本來就要逐筆對 Tabelog，見 `docs/DEVELOPMENT.md`；Tabelog 頁面有地圖，但**不要**從 Tabelog 抄座標，條款未查，只當比對）。
4. **風險控制**：
   - 只有「通過閘門且人工確認」的進 `SPOT_POSITIONS`；其餘維持現況（叢集在區中心）。不為了讓點更多而放寬閘門。
   - 同一 `SPOT_POSITIONS` 繼續是唯一座標來源（`map-centers.ts` 規則）。但目前該檔 AGENTS.md 未列為受保護檔案，可直接擴充；若要新增欄位（來源、查核日）建議放旁檔 `spot-positions.sources.json`，不污染該表型別。
   - 錯點的最壞情況是「景點出現在錯的街角」，不是導航錯：導航仍走 `buildGoogleMapsUrl`（名稱搜尋）。
   - 每筆保留 `confidence: 'poi' | 'area'` 概念：只畫 `poi`，其餘不畫點，避免假精確。

### A4. 792 個點怎麼顯示

- 現行介面是「先選區、再看地圖」（`filteredSpots` 為該區，`ClusterMap.tsx:143`），所以一次畫的點是單一區的數量：平均約 72（792/11），最大區未量，應在實作時量。這個量級 Leaflet 的 `divIcon`（DOM 元素）勉強可以，但標籤會打架。
- 建議：
  - 縮放小：只畫現行的區叢集與地標；縮放到 ≥15 才顯示個別點，用 `CircleMarker`（Canvas 渲染，`L.map({ preferCanvas: true })`）畫小金點，**不畫名牌**。
  - 點擊小點才開名牌或現有底部抽屜（`SpotCard`）。
  - 既有 `placeMapLabels` 避讓演算法（`src/lib/map-labels.ts`）只用於地標與叢集，不要擴到 792 個。
  - 類型篩選沿用 `filteredSpots`（現有的類型膠囊已經過濾）。
  - 若日後要全京都一次顯示，用 `leaflet.markercluster`（新依賴，須先問）或自己用網格聚合；目前不需要。
- 手機效能：Canvas 小點數百個無明顯壓力（我沒有實機量測，標「未量」）。真正的成本是 DOM 名牌與每次 `moveend` 重新計算避讓（`MapMarkers` 在每個 `moveend` 重繪，`ClusterMap.tsx:96-108`），點多時要節流。

### A5. 工作量與停損點

| 包 | 內容 | 大小 | 可停點 |
|---|---|---|---|
| A-1 | 腳本：候選產生（Wikidata、Overpass、Nominatim）、閘門、輸出報告 | M（約 1 個 Sonnet 子代理 session） | 報告出來後可停：使用者看命中率再決定是否繼續 |
| A-2 | 人工抽查報告；寺社與名勝座標寫入 `SPOT_POSITIONS`，附來源檔 | M | 只做寺社與名勝（預期量最少、價值最高）就可停 |
| A-3 | 食處座標（與 R9 Tabelog 查核並行或合併） | L | 隨時可停；沒座標的維持叢集 |
| A-4 | 畫面：縮放門檻、Canvas 小點、點擊開抽屜、截圖驗收（1440 px、375 px、日夜、語系、鍵盤、減少動態） | M | 完成即可上線 |
| A-5 | 文件、標示 OSM 出處、驗收腳本（測試「所有點在區界內」） | S | — |

---

## B. MapLibre 向量底圖

### B1. 現況（Leaflet）

- 底圖：OSM 官方標準圖磚 `https://tile.openstreetmap.org/{z}/{x}/{y}.png`（`ClusterMap.tsx:225`），夜間靠 CSS 濾鏡把同一張圖反相：`src/index.css:22` `.map-tiles-night { filter: invert(1) hue-rotate(180deg) brightness(.78) contrast(.9) saturate(.45); }`。
- 版本與大小：`leaflet` 1.9.4（node_modules 已裝）、`react-leaflet` ^5.0.0。已有 `dist`：`dist/assets/ClusterMap-DDmTYfcM.js` 為 205,242 位元組、gzip 約 61,441；CSS 15,607、gzip 約 6,480（我用 `gzip -c` 量；此 chunk 含 Leaflet、react-leaflet 與元件本身，並以 `React.lazy` 在進入地圖視圖時才載入，`DetailView.tsx:24`）。bundlejs 對 `leaflet@1.9.4` 單獨估 gzip 約 43.7 kB（https://deno.bundlejs.com/?q=leaflet@1.9.4 ，2026-11-16 查）。
- 已知問題：
  - OSM 圖磚政策：只限 Standard 圖磚、無 SLA、「may block without notice」、要 Referer 與 UA、禁止預取與離線；商業或募款服務尤其可能被撤權。來源：https://operations.osmfoundation.org/policies/tiles/
  - 濾鏡夜間色調受限於「反相」：道路、水系、建築物全部被一起處理，標籤是柵格字，無法換成日文專用字體、無法調整標籤大小與密度。
  - 柵格圖磚的標籤語言與樣式由 OSM 決定（在日本境內多為日文），與專案的漆藝配色分離。

### B2. MapLibre GL JS 的成本

- 版本：`maplibre-gl` 最新為 6.18.0，授權 BSD-3-Clause，npm 解包 29 MB（來源：https://registry.npmjs.org/maplibre-gl/latest ，2026-11-16）。v6 只有 ES module 發行（https://maplibre.org/maplibre-gl-js/docs/ ）。
- 大小：bundlejs 估 `maplibre-gl@6.18.0` 壓縮後約 302 kB gzip（未壓縮 1.11 MB），對比 Leaflet 約 43.7 kB gzip。來源：https://deno.bundlejs.com/?q=maplibre-gl@6.18.0 ，2026-11-16。這是第三方估算，Worker 檔與 CSS 另計（CSS 在 jsDelivr 列為 71,596 位元組，未壓縮，https://data.jsdelivr.com/v1/packages/npm/maplibre-gl@6.18.0?structure=flat ）；bundlephobia 當日回 429，未取得。因為地圖視圖是 lazy 載入，首頁不受影響，只增加「點進地圖視圖」的載入量，約多 250 kB gzip 以上。
- 搭配 PMTiles 另需 `pmtiles` 4.5.0（unpacked 380 kB，https://registry.npmjs.org/pmtiles/latest ）。
- `react-leaflet` 要換成 `react-map-gl/maplibre` 或自己包 `useEffect`，`ClusterMap.tsx` 299 行幾乎全部重寫（`useMap`、`Marker`、`GeoJSON`、`Polyline`、`CircleMarker`、divIcon 都是 Leaflet API）。座標順序也要重新注意（`AGENTS.md` §2）：MapLibre 用 `[lng, lat]`。
- 圖磚來源比較：

| 來源 | 授權與條款 | 金鑰與費用 | 純靜態？ | 備註 |
|---|---|---|---|---|
| **自架 Protomaps PMTiles 放 GitHub Pages** | 資料為 ODbL Produced Work，須標示 OSM（https://docs.protomaps.com/basemaps/downloads ） | 免費 | 是，只要主機支援 HTTP Range requests。GitHub 官方限制頁未提 Range（https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits ），**未查到官方保證，需實測**。站台上限 1 GB、頻寬軟上限 100 GB／月 | 京都範圍檔案大小**未查到**。可參考的第三方自述數字：名古屋市 z15 約 9.8 MB（https://socket.dev/npm/package/@mmj-map/tiles ，自述 README，非官方）；官方說明 z 每加一層約倍增，建議用 `pmtiles extract --bbox=... --maxzoom=15` 的 dry-run 預估。京都市加北部鞍馬貴船約略相當於大型都會範圍，我估 z15 在 10–30 MB 量級，**這是推測，需實測** |
| **OpenFreeMap** 公共實例 | 免費、免金鑰、免註冊、可商用；MapLibre 自動帶標示；提供 Positron、Bright、Liberty、Dark、Fiord、3D 樣式（https://openfreemap.org/ ） | 免費 | 是（純 HTTPS 圖磚） | **無 SLA**，服務條款寫「may discontinue it at any time without notice」（https://openfreemap.org/tos/ ）。可自架。圖磚是 OpenMapTiles 格式 |
| **GSI 最適化ベクトルタイル** | 依国土地理院コンテンツ利用規約；GSI 標示為「試験公開」、內容與 URL 測試期間可能改變，標示來源「国土地理院最適化ベクトルタイル」（https://github.com/gsi-cyberjapan/optimal_bvmap ） | 免費、免金鑰 | 是；也有單檔 PMTiles 位址（同上頁），z4–16 | 日本境內日文標籤品質佳（推測，未實測）；是「試験」，穩定性有風險 |
| MapTiler Cloud 免費 | 限非商業、需 API key、須顯示 MapTiler logo；10 萬請求／月（https://www.maptiler.com/cloud/pricing/ ） | 免費但要金鑰 | 金鑰會暴露在前端 | 不建議（靜態網站放金鑰、額度用完就停） |
| Stadia Maps 免費 | 非商業、需 API key 並做網域驗證（https://docs.stadiamaps.com/ ） | 免費但要金鑰 | 同上 | 不建議 |

### B3. 視覺收益

- MapLibre 向量樣式能做到（皆為 style JSON 的 paint 屬性，屬一般能力，非實測）：
  - 底色純黑加金色道路線、水系暗金線；和紙色（`#eee8db` 一類）底加茶褐道路；隱藏 POI、建物、行政界標籤，只留道路與水系。
  - 標籤字體可指定（需提供 glyph PBF，Protomaps 有公共 glyph，日文覆蓋度需實測；自架日文 glyph 檔會很大，CJK 是已知痛點，未量）。
  - 日夜兩套樣式可無縫切換（不需濾鏡、不需重載圖磚來源）。
  - 縮放平滑連續（向量縮放，非柵格階梯），可旋轉與傾斜（本專案不需要）。
  - 能與專案的區界 GeoJSON 同一 GL 圖層畫，邊界遮罩與金線不再需要覆蓋在柵格上。
- Leaflet 加柵格圖磚做不到：（1）道路與水系的獨立配色與隱藏標籤；（2）字體與標籤密度控制；（3）夜間用真正的暗色設計而不是反相濾鏡（反相會讓綠地與水系變成怪色，現況已用 saturate(.45) 壓）。
- Leaflet 加柵格仍可做到的：用「已調色的圖磚供應商」直接換底圖（見 B5）。

### B4. 風險

- **WebGL context 數量**：首頁文箱用 three.js（`src/studies/toji/plate/three-renderer.js`），而 `App.tsx:27-37` 以 `AnimatePresence mode="wait"` 讓首頁與詳細頁互斥，所以兩者通常不同時存在；但首頁的 renderer 是否在離開時 `dispose` 或 `forceContextLoss`，我未查證（grep 只找到建構點）。主流瀏覽器對同頁 WebGL context 有上限（常見說法為 Chrome 約 16、行動 Safari 更少），**官方數字我未查到**，所以說「實際影響未知，需在實機驗證，並確保離開時釋放」。
- 舊裝置：MapLibre 要 WebGL；v6 的最低瀏覽器需求我未能從官方頁查到。不支援 WebGL 時需降級（見下）。
- 離線：PMTiles 自架可由 Service Worker 預取（專案目前是否有 PWA 未查）；OpenFreeMap 條款僅允許最多 3,000 圖磚或 50 MB 的離線下載、4 條並行。
- 圖磚服務中斷：自架 PMTiles 與網站同生命週期，風險最低；OpenFreeMap、GSI 試驗版可能無預警改變。降級策略：偵測 WebGL 失敗或圖磚錯誤時，退回現有 Leaflet 柵格版（需保留兩套程式，維護成本變兩倍），或退回「純區界 SVG 加叢集」不含底圖。
- 驗收負擔：AGENTS.md §5 的地圖畫面驗收（1440、375、日夜、語系、鍵盤、減少動態）全部要重跑。MapLibre 的鍵盤與無障礙行為與 Leaflet 不同（標記需自己做可聚焦 DOM marker）。

### B5. 中間路線：保留 Leaflet，換底圖

- **`@maplibre/maplibre-gl-leaflet`**（0.1.4，peer 含 leaflet ^1.9.3 與 maplibre-gl ^2.4–^6，https://registry.npmjs.org/@maplibre/maplibre-gl-leaflet/latest ）：在 Leaflet 裡嵌一個 MapLibre 向量圖層，保留既有 Leaflet 標記與疊層。收益：向量底圖與自訂樣式；成本：仍付 MapLibre 的全部大小與 WebGL context，再加 Leaflet，兩者相加約 340 kB gzip，且兩個座標系互相同步，**不是便宜的中間路線**。
- **`protomaps-leaflet`**（5.1.0，unpacked 1.14 MB，https://registry.npmjs.org/protomaps-leaflet/latest ）：用 Canvas 在 Leaflet 內渲染 PMTiles 向量圖磚，**不需要 WebGL**，不增加 context 數，保留既有全部 Leaflet 程式。這是我認為最划算的實驗：樣式能力不及 MapLibre（我未實測其對日文標籤的支援，未知），但已足以做黑底金線與和紙色。需實測大小（未量，npm unpacked 1.14 MB 含多餘檔案，不能直接當 bundle 大小）。
- **只換柵格底圖**（不碰向量）：改用已調色的柵格圖磚供應商，但上面 MapTiler 與 Stadia 免金鑰條件不成立；可行性低。
- **單純改善現有濾鏡**（零成本）：夜間濾鏡微調，或日夜都用 OSM 圖磚外加 CSS `mix-blend-mode`；效果有限。

### B6. 建議

**先做小實驗，不全面導入。** 拆包：

| 包 | 內容 | 驗收 |
|---|---|---|
| B-0（約 S） | 量測：在隔離分支用 `pmtiles extract --bbox（京都市＋北部）--maxzoom=15` 取得檔案大小；用 `vite build` 量 `protomaps-leaflet` 與 `maplibre-gl` 各自增加的 gzip；實測 GitHub Pages 對 `.pmtiles` 是否支援 Range 請求。**不改現有 `ClusterMap.tsx`** | 三個數字寫進備忘錄；PMTiles 在 GitHub Pages 載入成功 |
| B-1（M） | 在獨立 demo 頁（例如 `toji-study` 旁一個 `map-study`）用 `protomaps-leaflet` 或 MapLibre 畫一個「黑底金線」與「和紙色」兩套樣式，含日文標籤與現有區界金線 | 截圖與使用者看過；日夜樣式、標籤字體、375 px 皆可讀 |
| B-2（L，視使用者決定） | 把 `ClusterMap` 換到新底圖，保留舊柵格版為降級 | AGENTS.md §5 地圖驗收全套；WebGL context 在首頁與地圖來回切換 20 次無洩漏；斷網或圖磚 404 時降級畫面可用 |

停損點：B-0 後若 PMTiles 檔 >40 MB 或 GitHub Pages 不支援 Range，改用 OpenFreeMap 或放棄；B-1 後使用者不滿意視覺就停，已花的只是一個 demo 頁。

AGENTS.md 注意：導入 MapLibre 是「新增大型依賴」，須先取得使用者同意（開案書 §5 也列為停下來問的事項）。

---

## B-0 量測結果（2026-11-17，主代理 Opus 5.5）

使用者 2026-11-17 要求做 B-0，前提是「地圖最後拔掉也有可能」；當初用 OSM 是因為 Google 要金鑰又要錢。現有 `ClusterMap.tsx` 沒有改。

### 1. GitHub Pages 支援 Range 請求：是

| 請求 | 回應 |
|---|---|
| `curl -r 100-199 https://avalon-ash.github.io/Kyoto-Bunko/assets/W_FUSHIMI.day-6tHakxS9.webp` | `206 Partial Content`，`Content-Range: bytes 100-199/90554`，沒有 `Content-Encoding`（加 `Accept-Encoding: gzip, br` 也一樣） |
| 同上不帶 Range | `200`，`Accept-Ranges: bytes` |
| `curl -r 100-199 -H "Accept-Encoding: gzip" https://avalon-ash.github.io/Kyoto-Bunko/`（HTML） | `206`，但 `Content-Encoding: gzip`、`Content-Range: …/576`：**可壓縮的類型，Range 切的是壓縮後的位元組** |

所以二進位類型可用。`.pmtiles` 會被當成哪一種 Content-Type、會不會被壓縮，要實際部署一個檔才知道（要 push，這次沒做）；推測是 `application/octet-stream` 而不壓縮，與 webp 一樣，**未驗證**。

### 2. 京都範圍的 PMTiles 大小

對 Protomaps 每日建置 `https://build.protomaps.com/20261116.pmtiles`（z0–15、全球 129.6 GiB）只讀目錄、加總範圍內每張圖磚的長度（同內容的圖磚只算一次）。指令：`node scripts/pmtiles-bbox-size.mjs <url> <W,S,E,N> <maxzoom…>`。官方 `pmtiles extract --dry-run` 沒跑（下載的執行檔被本機權限擋下），所以數字不含新檔案的目錄與 metadata（量級是 KB）。

| 範圍 | z0–12 | z0–14 | z0–15 |
|---|---|---|---|
| 市中心 `135.65,34.90,135.85,35.10` | 2.0 MiB（26 張） | 7.2 MiB（182 張） | 21.8 MiB（619 張） |
| 全京都市＋北部＋大津延暦寺 `135.55,34.86,135.92,35.33` | — | 12.9 MiB（659 張） | 34.0 MiB（2461 張） |
| 對照：太平洋 `150.0,20.0,150.2,20.2` | — | — | 0.2 MiB（535 張） |

太平洋那一列是檢查用的：圖磚編號算錯的話，京都會抓到別處（多半是海），大小會接近這一列。京都與海差了兩個數量級，所以編號是對的。

都在停損線 40 MB 以內，也遠低於 Pages 的 1 GB。但 **34 MB 的二進位檔不適合直接 commit**（現在整個 `.git` 是 76 MB，每次更新圖資又會多一份）。要做的話，改成部署流程裡下載或抽出後放進 `dist`，不進 Git 歷史。z15 以上可以放大既有的 z15 圖磚（overzoom）。

### 3. 打包大小（gzip -9）

在 repo 外的暫存資料夾裝 `maplibre-gl` 6.19.0、`protomaps-leaflet` 5.1.0、`pmtiles` 4.5.0、`leaflet` 1.9.4，用 repo 的 esbuild 各自打包、壓縮後量。

| 東西 | gzip |
|---|---|
| 現在的地圖 chunk（`dist/assets/ClusterMap-*.js`：Leaflet＋react-leaflet＋元件） | 59.8 kB（CSS 6.3 kB） |
| `leaflet` 單獨 | 42.4 kB |
| `protomaps-leaflet`（Leaflet 已經有，不重複算；含 pmtiles 讀取） | **＋36.2 kB** |
| `maplibre-gl` 主檔 | 297.7 kB |
| `maplibre-gl` 的 worker（另一個檔，開地圖時載入） | 153.2 kB |
| `maplibre-gl` 的 CSS | 9.9 kB |
| `maplibre-gl`＋`pmtiles` 主檔 | 304.9 kB |

MapLibre 整套約 **461 kB**（主檔＋worker＋CSS；表內 kB 都是 1024 位元組），是現在地圖 chunk 的 7–8 倍，而且要重寫 `ClusterMap.tsx`、多一個 WebGL context。`protomaps-leaflet` 只多 36 kB，不需要 WebGL，現有程式幾乎不動。

### 4. 結論

- 純靜態自架圖資**可行**：Range 可用、全京都 z15 約 34 MB。要做就走 `protomaps-leaflet`（+36 kB），不走 MapLibre。
- 但它只換掉「底圖從哪裡來、長什麼樣」；換來的是：不再依賴 OSM 官方圖磚伺服器、可以自訂日夜配色。代價是每次部署多 34 MB 的檔案、多一套樣式要維護。
- **使用者決定（2026-11-17）：維持現狀**，不做 B-1、不導入 MapLibre，T4.3 也擱著。
- 還沒驗證的：`.pmtiles` 在 Pages 上的 Content-Type 與壓縮；`protomaps-leaflet` 的日文標籤與字型；手機上 Canvas 畫向量圖磚的速度。這三項要做 B-1（獨立 demo 頁）才知道。

## 附錄：沒能查到或只有推測的項目

- 京都範圍 PMTiles 的實際檔案大小（只有名古屋 9.8 MB 的第三方自述）。
- GSI 地名検索 API 本身的使用條款；「国土地理院コンテンツ利用規約」本文（官網多次 302 轉址，只取得摘要）。
- 各來源對日文店名、寺社名的命中率（僅單點實測：清水寺）。
- GitHub Pages 是否保證支援 HTTP Range 請求。
- MapLibre v6 最低瀏覽器需求、WebGL context 數量的官方上限；首頁三維文箱離開時是否釋放 context。
- bundlephobia 當日 429；MapLibre 大小為 bundlejs 第三方估算，未實際在本專案 `vite build` 量過。
- `protomaps-leaflet` 與 `pmtiles` 的日文標籤支援與實際 bundle 大小。
- Tabelog 與 Google 地圖座標的再利用條款。
- Overpass 與 Nominatim 對京都市食處的覆蓋率。
