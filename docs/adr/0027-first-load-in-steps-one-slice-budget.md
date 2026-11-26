# 0027 首頁第一次載入全程分步：渲染器啟動、構圖與每一次建造都依同一個切片預算讓出

狀態：採用
日期：2026-11-26
取代：0026

## 背景

0026（沿用 0025）只讓首盤在第一次編譯前分步，細步只給前景，構圖 `PLATES[ward]()` 是一個同步呼叫。L3d（`docs/plans/2026-11-26-boot.md`，Fable 5.2 經 API 開案）的 CPU profile 顯示，溫快取第一次載入（CPU×4、正式建置）在首次繪製之後還有三個單一長任務：three.js 渲染器啟動 405 ms、構圖 391 ms、閒置回呼裡的預建單步 296 ms；按鍵最長 192–400 ms，超過使用者 2026-11-25 定的 200 ms 門檻。使用者 2026-11-26：「fable開案終審可以用api，繼續」。其餘的決定照 0026，本檔照現況重寫。

## 決定

- **切片預算只定義一處**：`src/studies/toji/plate/ward-build.js` 的 `TASK_SLICE_MS`（32 ms，留給瀏覽器 50 ms 長任務門檻下一個不可分割的操作）與 `taskSlice()`（`due()`、`restart()`）。`bake.js`、`compose.js` 讀它；預建的閒置回呼也拿它判斷還能不能再跑一步。
- **讓出只定義一處**：`ward-build.js` 的 `stepBuild`、`finishBuildInTasks`、`cancelBuild`；有 `scheduler.yield` 用它，沒有用 `setTimeout(0)`。
- **渲染器啟動分步**：`three-renderer.js` 的 `createThreeRendererInSteps` 是生成器，在環境貼圖、兩張烘焙貼圖、盒的幾何、盒的網格之後讓出；`renderer.js` 用 `finishBuildInTasks` 驅動，期間 `loading` 為 true（降級圖佔位，0018）。dispose 時 `cancelBuild`，生成器的 `finally` 釋放沒建完的資源；設置丟錯走 `fallback(error, 'start')`（0022）。同步的 `createThreeRenderer` 跑完同一個生成器，只給測試用。
- **構圖以步驟清單為唯一入口**：每區是 `compose.js` 的 `composition(steps)`；呼叫它得到和以前一樣的部件陣列（`plate-parts-hash --check`），`composeInSteps` 一步一步跑、到期讓出。岩群一群一步（`crag-mesh.js` 的 `cragSteps`）。
- **每一次建造都切細**：`buildWard` 不再分前景與預建，任何建造都在重的步驟裡依切片讓出。第一次編譯前的首盤在任務裡跑完；預建在閒置回呼裡跑，deadline 還剩一個切片以上就再跑一步，沒有 deadline 時一次一步；第一次編譯之後的 cache miss 仍在換函的繪製任務裡同步跑完（一樣的步驟，只是不讓出）。
- **回傳合約**：`setWard` 回傳布林（同步完成：`true` 有盤、`false` 這區沒有盤）或 Promise（分步建造中；取消時解析為 `undefined`）。`renderer.js` 的 `setMesh` 兩種都接；建造中 `data-plate` 寫 `true`。
- **取消**：換區或 dispose 時關閉生成器（`return()`），已排隊的舊步驟醒來後不再推進、不提交；資源由各生成器的 `finally` 釋放。
- **失敗**：建造失敗不論分步或同步，都由 `setMesh` 交給 `fallback`（`BUILD_WARD_STEP`，0026）。降級圖自己的 `setWard` 丟錯時照舊丟出。

## 放棄的做法

- 搬進 Worker：構圖與 Canvas 資料的所有權要改，使用者選不搬。
- 拆主程式的 chunk、延後 motion（開案書第 1 段）：首次繪製前畫面沒有可按的東西；拆 chunk 不減少同一任務內的模組求值。使用者沒有要求，預設不做。
- 第一次編譯分攤（開案書 P4：盒與地的程式先編）：P3 之後連續三輪按鍵最長都 ≤ 200 ms（120–152 ms）；剩下約 130 ms 的 `getProgram` 任務要動冷編譯的時機（0018、0019），收益與風險不成比例，沒做。
- 在預建時保留粗步：預建的單步會遠超過 idle deadline（profile 量到 296 ms）。

## 後果

- 同一時段的對照（正式建置、溫快取、CPU×4）：首次繪製之後最長的任務 290–295 → 128–134 ms；載入期間按鍵最長 160–216 → 128–152 ms；首盤 ready 不變（2,150–2,233 對 2,199–2,211 ms）。冷快取（GPU 編譯，L2）仍有 0.5 秒以上的任務。
- 換函到沒預建好的區仍在一個任務裡建完（約 200–300 ms），本決定沒有改。
- 構圖檔的寫法變成步驟清單；新增一區或一個部件時照同一種寫法，一個步驟在 Node 裡不該超過約 30 ms。
- 沒有 `scheduler.yield` 的瀏覽器每步至少等一個 timer；沒有實機驗過。
- 盤面像素不變（base 22 張相同；375 的南區日景同一份程式拍兩次就差 199 點 1 級，改後的差在這個範圍內）。

## 證據

- `docs/plans/2026-11-26-boot.md` §8、`docs/plans/2026-11-26-boot-profile.txt`
- `docs/adr/0018-plate-precompile-with-still-placeholder.md`、`docs/adr/0022-shader-failure-falls-back-to-still-picture.md`
- `src/studies/toji/plate/ward-build.js`、`src/studies/toji/plate/compose.js`、`src/studies/toji/plate/three-renderer.js`、`src/studies/toji/renderer.js`、`src/studies/toji/plate/bake.js`、`scripts/compose.test.mjs`、`scripts/perf-home.mjs`
