# 架構決策紀錄（ADR）

本資料夾放 Kyoto Bunko 的架構級決策，一個決策一個檔：記下限制之後程式怎麼寫的選擇、理由、放棄的做法、後果與出處。動某個結構之前先查這裡；要做的事和「採用」的 ADR 衝突時停下來回報，不直接改。

## 什麼時候寫

符合任一條就新增一份：

1. 會限制之後程式怎麼寫的決策：模組邊界、資料所有權、單一事實來源放哪、資料格式與相容承諾、渲染規則、驗證流程。
2. 寫進開案書（`docs/plans/`）「契約」的架構決策。
3. 推翻或取代既有 ADR。

產品範圍、素材與授權、視覺口味、單次小取捨不寫 ADR，照舊寫在計畫書（`docs/plans/`、`docs/*_PLAN.md`）或 `docs/HANDOFF.md`。

## 編號與檔名

- `NNNN-<英文小寫連字號>.md`，從 `0001` 連續遞增，不跳號、不重複、不重編。
- 每新增一份，在本檔最下面的「索引」加一行：一句話摘要＋相對連結。

## 格式

- 第一行 `# NNNN <繁體中文標題>`（編號與檔名一致）。
- 狀態行只有三種寫法：`狀態：採用`、`狀態：提議`、`狀態：已取代（由 NNNN）`。
- `日期：YYYY-MM-DD`（決定的日期）。只有取代別份時才在下一行寫 `取代：NNNN`。
- 五個章節，標題固定：`## 背景`、`## 決定`、`## 放棄的做法`、`## 後果`、`## 證據`。
- 20～50 行，只寫事實與理由，不寫效果形容詞。
- 查不到的欄位寫「原紀錄沒有寫。」，不補編。
- `## 證據` 只列查得到的出處：repo 內存在的檔案路徑（用反引號包起來，檢查腳本會確認存在）、文件章節、commit SHA。

## 推翻既有決策

不改原檔的決定內容，新開一份並雙向標註：

1. 舊檔狀態行改成 `狀態：已取代（由 <新編號>）`。
2. 新檔在 `日期：` 下一行寫 `取代：<舊編號>`。
3. 兩份都留在本資料夾與索引。

## 檢查

`npm run adr:check`（`scripts/check-adr.mjs`，只用 node 內建模組）：編號連續、標題、狀態、日期、五節、取代鏈雙向、索引與資料夾一致、證據路徑存在。腳本不判斷決策內容對不對。

## 範本

```markdown
# NNNN 標題

狀態：採用
日期：YYYY-MM-DD

## 背景

觸發這個決策的問題、限制或量測數據。

## 決定

實際採行的規則、邊界、誰是唯一寫入者、落在哪個檔。

## 放棄的做法

評估過但沒採用的方案與原因；原紀錄沒有記載時寫「原紀錄沒有寫。」。

## 後果

遵守這個決定換來的保證、由什麼檢查守門、付出的代價。

## 證據

- 出處文件、程式路徑、測試檔或 commit SHA。
```

## 索引

- [0001 景點結構層與雙語內容層分離](0001-schema-locale-separation.md)：`src/data/spots/` 只存機器可讀結構，名稱與描述放中日 locale，由 `spots-loader.ts` 裝配。
- [0002 景點 ID 穩定與標籤登記表雙層機制](0002-spot-id-and-tag-registry.md)：`XX-NNN` 穩定不重編，篩選標籤限用 `TAG_REGISTRY`（上限 6 個），主副標籤白名單集中於 `type-tag-groups.ts`。
- [0003 核心元數據與全域型別列為受保護檔案](0003-protected-metadata-files.md)：`tags.ts`、`types.ts`、`areas.ts`、`wards.ts`、`index.ts`、`src/types.ts` 未獲授權不可修改，跨市例外採 `municipalityId`。
- [0004 地圖座標集中管理、經緯度順序與禁止假座標](0004-map-coordinates-ssot-and-order.md)：座標集中於 `map-centers.ts`，GeoJSON `[lng, lat]` 與 Leaflet `[lat, lng]` 不混用，刪除假座標散射並以螢幕空間避讓標記。
- [0005 導航網址共用 buildGoogleMapsUrl 與日文名錨點](0005-shared-google-maps-navigation.md)：全站共用 `buildGoogleMapsUrl`，以 `spot.jaName` 為唯一地理錨點並固定輸出 `maps/search/`。
- [0006 靜態行政區邊界與詳細地圖維持 Leaflet 及 OSM 圖磚](0006-static-ward-boundaries-and-leaflet-tiles.md)：十一區 GeoJSON 由離線腳本靜態產出（前端與 CI 不呼叫 Nominatim），詳細地圖維持 Leaflet＋OSM 不導入 MapLibre。
- [0007 全站色票集中於 theme.css 與單一視覺寫入線](0007-single-theme-token-ssot.md)：`src/theme.css` 為唯一色票來源，樣式依邊界分檔、文案集中於 `i18n.ts`，視覺工作線限單一寫入者。
- [0008 文箱控制器解耦、純函式縮放與背景動畫邊界](0008-bunko-controller-decoupling-and-zoom.md)：`mountBunko` 與 React／展示頁解耦，縮放抽離為 `view.js` 並以觸控手勢優先，背景離屏烘焙並以 Web Animations 驅動，大列表採分批渲染。
- [0009 禁止新增大型繪圖依賴並以原生 WebGL2 繪製蒔繪盤](0009-no-large-graphics-deps-custom-webgl2.md)：原規則禁止引入 3D 繪圖依賴並以自寫 WebGL2 繪製蒔繪盤（已由 0010 取代）。
- [0010 蒔繪盤改用 three.js 單一管線與靜態圖降級](0010-makie-plate-threejs-and-static-fallback.md)：僅 `plate/` 例外改用 three.js 單一管線（刪除舊 WebGL2 管線）並以預渲染 webp 降級，其餘頁面仍不加大型繪圖依賴。
- [0011 蒔繪盤技法分層、透漆包漿與三層亮度結構](0011-makie-technique-stack-and-coat-layers.md)：透漆包漿於材質內依沉漆／研出／漆上三類計算，大面積採刑部地／平目地並嚴守三層亮度順序與禁混暗色規則。
- [0012 蒔繪盤地形採手寫疊坡組件、依附小景與逐點貼地](0012-makie-doha-terrain-and-attached-scenes.md)：拆除 `hill()`／`gardenGround()` 改由 `doha.js` 手寫控制點構成，小景須帶 `on` 依附主體，部件躺平時逐點貼地零穿插。
- [0013 禁止架構耦合與蒔繪盤材質表單一事實來源](0013-no-coupling-ssot-and-material-table.md)：採 ECS＋SSOT 原則，材質性質集中於無 import 的 `mat.js`（`MAT_LOOK`、`DOHA_TONE`、`ROCK_LOOK`），地著色器以常數陣列讀表並保留主體分支避免冷編譯逾時（已由 0017 取代）。
- [0014 測試區分行為測試與範圍圍欄並採統一驗收管線](0014-behavior-tests-and-scope-fences.md)：區分不可改弱的行為測試與可階段更新的範圍圍欄，整合一律跑 lint、validate、test、build 四閘門。
- [0015 主代理整合、Git 權限邊界與定調工作歸屬](0015-agent-authority-and-git-integration-boundary.md)：子代理不執行 Git 操作且限於派工單範圍，主代理負責整合與前後相依的定調視覺工作，架構決策記錄於 `docs/adr/`。
- [0016 材質表併表：網格參數與烘焙畫法也是材質表的欄](0016-material-table-mesh-and-bake-columns.md)：`MATERIALS` 成為 `MAT_LOOK` 的 `mesh` 欄，renderer 讀網格欄不比名字（包漿與光澤下限分兩欄），bake 依 `fine` 欄選畫法，參考圖顏色是 `refColour` 欄。
- [0017 禁止架構耦合與蒔繪盤的一張材質表](0017-no-coupling-one-material-table.md)：沿用 0013 的不做耦合原則與著色器做法，材質性質全在 `mat.js` 的一張 `MAT_LOOK`（`lookOf` 讀列），不以名字、編號或填色旗標判斷材質（取代 0013）。
- [0018 蒔繪盤先非同步編譯完再畫，期間顯示降級圖](0018-plate-precompile-with-still-placeholder.md)：第一塊盤先 `compileAsync` 整個場景，編譯中不畫、canvas 鋪降級圖，避免冷快取時整頁卡十幾秒；`data-renderer` 第一幀實景才變 `three`。
- [0019 著色器先用 mSetLightAt 設好光與位置，再呼叫 mNashiji、mMetal](0019-shaders-set-light-and-position-once.md)：兩者只跟位置與光有關的部分每個像素算一次，地著色器冷編譯 9–11 秒 → 約 5 秒。
- [0020 鄰盒的預覽只畫背景已建好的區，沒好就淡出淡入](0020-neighbour-pictures-only-from-prefetch.md)：畫預覽圖不再同步建鄰區（換函後 285–600 ms 的卡頓 → ≤77 ms），來不及預建時換函改淡出淡入。
- [0021 JavaScript 也做型別檢查，ESLint 只管正確性](0021-javascript-type-check-and-correctness-lint.md)：`tsconfig.js.json` 用 JSDoc 檢查全部 JavaScript、關卡是 0 個錯誤、只用 JSDoc 修；ESLint 只開正確性規則，兩者都接在 `npm run lint`。
- [0022 著色器編譯或連結失敗時退回降級圖](0022-shader-failure-falls-back-to-still-picture.md)：`three-renderer.js` 的 `reportFailure` 是唯一的失敗通知，`renderer.js` 的 `fallback` 換成同區同日夜的降級圖；`?plate=shaderfail`（只在開發時）可重現。
- [0023 歲時記活動資料：主檔、年度場次與雙語內容分離](0023-seasonal-events-catalog-occurrences-locales.md)：活動放 `src/data/events/`，主檔、年度場次、中日 locale 分開，和地點的關係只在 `venues`，畫面只經 `loader.ts`，不改受保護檔。
- [0024 歲時記的日期語意：東京曆日、場次展開與狀態規則](0024-seasonal-dates-tokyo-sessions-status.md)：東京曆日字串、多筆 session、日期判斷只在 `seasonal-query.ts`、狀態規則一張表、例年日期算已確認但要標示。
- [0025 首盤在第一次編譯前分步建造，步與步之間讓出主執行緒](0025-first-plate-builds-in-tasks.md)：`ward-build.js` 是唯一的讓出工具，`setWard` 回傳布林或 Promise，換區取消建造；溫快取首盤最長任務約 1.3 秒 → 330 ms（已由 0026 取代）。
- [0026 首盤分步建造；任何一次建造失敗都退回降級圖](0026-ward-builds-in-tasks-and-failed-builds-fall-back.md)：沿用 0025 的分步建造，換函時同步建造丟錯也交 `fallback`，顯示該區降級圖（取代 0025）。
