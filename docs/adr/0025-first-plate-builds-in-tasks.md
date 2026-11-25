# 0025 首盤在第一次編譯前分步建造，步與步之間讓出主執行緒

狀態：採用
日期：2026-11-25

## 背景

L3 第一階（`scripts/perf-home.mjs --taps --gpu`，CPU×4、RTX 4070）量到：溫快取首盤 ready 前有一個 1,241–1,281 ms 的長任務，在裡面按鍵要等 1,032–1,296 ms。原因是 `setWard` 把 `buildWard` 生成器在同一個任務裡跑完；鄰區預建本來就在閒置回呼裡逐步跑。使用者 2026-11-25 同意做第二階（拆步、讓出，不搬 Worker）。本決定擴充 0018：「還不能畫」多了首盤建造這一段，0018 原文不改。

## 決定

- **範圍**：只在第一次編譯完成前（`compiled` 為 false）的 cache miss 分步。之後的 cache miss 仍在換函動畫的繪製任務裡同步建完（實測換函最長任務 184–192 ms），預建好的區照舊同步啟用。
- **讓出只定義一處**：`src/studies/toji/plate/ward-build.js`（`stepBuild`、`finishBuildInTasks`、`cancelBuild`）。有 `scheduler.yield` 用它，沒有用 `setTimeout(0)`。
- **前景建造的唯一狀態**是 `three-renderer.js` 的 `foreground`；細步只給前景（`canYield`），`bake.js` 依 `RASTER_SLICE_MS`（32 ms，留給 50 ms 長任務門檻）在重的繪製步驟裡再讓出。預建的分步點不變。
- **回傳合約**：`setWard` 回傳布林（同步完成：`true` 有盤、`false` 這區沒有盤）或 Promise（分步建造中；取消時解析為 `undefined`）。`renderer.js` 的 `setMesh` 兩種都接；建造中 `data-plate` 寫 `true`（這區有盤），佔位的降級圖不另加投影。
- **取消**：換區或 dispose 時關閉生成器（`return()`），已排隊的舊步驟醒來後不再推進、不提交；資源由 `buildWard` 的 `finally` 釋放。
- **失敗**：分步路徑的例外交 `renderer.js` 的 `fallback`（入口 `'build ward'`，0022）。同步路徑的例外照舊拋給呼叫端，本決定沒有改它。

## 放棄的做法

- 搬進 Worker：構圖與 Canvas 資料的所有權要改，使用者選不搬。
- 每次換函都分步：預建命中會離開換函的繪製任務、多等一幀以上。
- 把南區構圖 `PLATES[ward]()` 再切細：要改構圖檔的同步入口，不在這次範圍。

## 後果

- 溫快取首盤最長長任務 1,241–1,281 → 327–329 ms，按鍵最長 1,032–1,296 → 224 ms，目標 ≤200 ms 沒達到：剩下的是南區構圖單步約 276 ms。
- 首盤 ready 變慢約 9%（2,678–2,793 → 2,912–3,060 ms），降級圖出現的時機不變。
- 沒有 `scheduler.yield` 的瀏覽器每步至少等一個 timer，背景分頁更慢；期間顯示降級圖。沒有實機驗過。
- 盤面像素不變（106 張逐像素比對）。

## 證據

- `docs/plans/2026-11-24-chain-3.md` §9.3–§9.6
- `docs/adr/0018-plate-precompile-with-still-placeholder.md`、`docs/adr/0022-shader-failure-falls-back-to-still-picture.md`
- `src/studies/toji/plate/ward-build.js`、`src/studies/toji/plate/three-renderer.js`、`src/studies/toji/plate/bake.js`、`src/studies/toji/renderer.js`、`scripts/ward-build.test.mjs`
- commit `d3f1039`
