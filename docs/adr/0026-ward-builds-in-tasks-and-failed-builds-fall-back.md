# 0026 首盤分步建造；任何一次建造失敗都退回降級圖

狀態：採用
日期：2026-11-25
取代：0025

## 背景

0025 定下首盤在第一次編譯前分步建造（L3 第二階）。它的「失敗」一條寫：分步路徑的例外交 `renderer.js` 的 `fallback`，同步路徑的例外照舊拋給呼叫端。第三條鏈開案書 §9.6 把「同步路徑建造失敗不走 `fallback`」列為積壓；§9.8 的 N3 實測：第一次編譯之後換到一個沒預建好的區、建造丟錯時，錯誤穿過 `renderer.js` 變成沒人處理的 rejection，盤停在上一區，不顯示降級圖。這和 0022 的「`fallback` 是『three.js 不能用了』的唯一處理」不一致。主席在 §9.7 的積壓表把 N3 列為「做」，使用者 2026-11-25 晚回「可以跑啊」（§9.8）。其餘的決定照 0025，本檔照現況重寫。

## 決定

- **範圍**：只在第一次編譯完成前（`compiled` 為 false）的 cache miss 分步。之後的 cache miss 仍在換函動畫的繪製任務裡同步建完，預建好的區照舊同步啟用。
- **讓出只定義一處**：`src/studies/toji/plate/ward-build.js`（`stepBuild`、`finishBuildInTasks`、`cancelBuild`）。有 `scheduler.yield` 用它，沒有用 `setTimeout(0)`。
- **前景建造的唯一狀態**是 `three-renderer.js` 的 `foreground`；細步只給前景（`canYield`），`bake.js` 的 `rasterSlice` 依 `RASTER_SLICE_MS`（32 ms，留給 50 ms 長任務門檻）在重的繪製步驟裡再讓出。預建的分步點不變。
- **回傳合約**：`setWard` 回傳布林（同步完成：`true` 有盤、`false` 這區沒有盤）或 Promise（分步建造中；取消時解析為 `undefined`）。`renderer.js` 的 `setMesh` 兩種都接；建造中 `data-plate` 寫 `true`，佔位的降級圖不另加投影。
- **取消**：換區或 dispose 時關閉生成器（`return()`），已排隊的舊步驟醒來後不再推進、不提交；資源由 `buildWard` 的 `finally` 釋放。
- **失敗（本檔改的）**：建造失敗不論分步或同步，都由 `renderer.js` 的 `setMesh` 交給 `fallback`，步驟名稱是 `BUILD_WARD_STEP`（`'build ward'`，0022）。同步的在 `setWard` 呼叫外接住，分步的在 Promise 的 `catch`。降級圖自己的 `setWard` 丟錯時照舊丟出（它沒有可退的；`static-plate.js` 的 `setWard` 同步部分只查表、排載入，載入失敗在非同步裡接住）。

## 放棄的做法

- 搬進 Worker：構圖與 Canvas 資料的所有權要改，使用者選不搬。
- 每次換函都分步：預建命中會離開換函的繪製任務、多等一幀以上。
- 把南區構圖 `PLATES[ward]()` 再切細（L3c）：本決定沒有做。開案書 §9.7 在 11/25 晚（機器整體慢約 1.7 倍）量到正式建置在盤開始建造前就有 360–420 ms 的啟動長任務；主席建議不做，待使用者確認。
- 失敗時在 `three-renderer.js` 的 `setWard` 裡自己退回：退回的處理就分成兩處（0022 只有 `fallback` 一個入口）。

## 後果

- 溫快取首盤最長長任務 1,241–1,281 → 327–329 ms，按鍵最長 1,032–1,296 → 224 ms（0025 時的量測），目標 ≤ 200 ms 沒達到。
- 首盤 ready 變慢約 9%，降級圖出現的時機不變。
- 沒有 `scheduler.yield` 的瀏覽器每步至少等一個 timer，背景分頁更慢；期間顯示降級圖。沒有實機驗過。
- 換函時建造失敗會顯示該區的降級圖，之後的換函照常（N3 實測）；首盤同步失敗的警告寫 `build ward`，不再是 `first ward`。三種 smoke 都不走這條路，沒有自動化防護。

## 證據

- `docs/plans/2026-11-24-chain-3.md` §9.3–§9.8
- `docs/adr/0018-plate-precompile-with-still-placeholder.md`、`docs/adr/0022-shader-failure-falls-back-to-still-picture.md`
- `src/studies/toji/plate/ward-build.js`、`src/studies/toji/plate/three-renderer.js`、`src/studies/toji/plate/bake.js`、`src/studies/toji/renderer.js`、`scripts/ward-build.test.mjs`
- commit `d3f1039`、`5bbe386`
