# 0017 禁止架構耦合與蒔繪盤的一張材質表

狀態：採用
日期：2026-11-20
取代：0013

## 背景

0013 定下不做耦合的原則，以及材質性質集中在 `mat.js`。它的「決定」裡有一條過渡期的分工：`MAT_LOOK` 管地面、`MATERIALS` 管立體部件，兩表欄位不得重疊，第 3 步再併表。它的「後果」寫第 3 步與第 4b 步還沒做。2026-11-20 第 3、4b 步併進 `main`（0016），第 4c 步拿掉 `doha.js` 填色上的種類旗標，0013 這兩處不再成立。使用者 2026-11-20 選擇以新的一份取代 0013（「取代」）。原則與著色器的做法沿用 0013，本檔照現況重寫。

## 決定

- **不做耦合原則**（同 0013）：每個概念（材質、狀態、設定、規則）的性質只定義在一處（SSOT，資料與行為分開的 ECS 結構），其他模組讀它；不留魔術數字，連動的常數合併或寫成導出值；既有的耦合先提案（改哪裡、怎麼證明行為不變、怎麼回退），使用者同意才動手。
- **一張材質表**：`src/studies/toji/plate/mat.js`（不 import 任何東西）的 `MAT_LOOK` 每列有地的欄、`fine`（烘焙怎麼畫）、`refColour`（參考圖的顏色）、`mesh`（立體部件的物理參數與著色器欄）。`three-pack.js` 的 `MATERIALS` 是 `mesh` 欄導出的常數。讀一列用 `lookOf(mat)`（表裡沒有的 id 讀第 0 列）。`DOHA_TONE`、`ROCK_LOOK` 是以別的鍵查的表，也在 `mat.js`。各欄的細節見 0016。
- **不用別的鍵判斷材質**：地著色器不比材質編號，`three-renderer.js` 不比材質名字，`bake.js` 與量測腳本不靠填色上的種類旗標（填色只帶幾何：`f.wedge`、`f.fade`），`doha.js` 不比 `tone` 字串，`rock-mesh.js` 不比 `MAT.*`。加材質就是在 `MAT` 加編號、在 `MAT_LOOK` 加一列。
- **著色器取表與保守分支**（同 0013）：建字串時由 `MAT_LOOK` 生成 GLSL 常數陣列（`MAT_LOOK_GLSL`，精確數值，不經 `toFixed`）；配方分支留在地著色器主體原位，以具名常數（`rc == RECIPE_*`）判斷，不抽成個別 GLSL 配方函式；不設新舊雙路徑開關。
- **不變證明與編譯量測**：畫面不變以固定時鐘加 `scripts/plate-diff.mjs`（同一次開機、同一個 dev server）與 `scripts/plate-parts-hash.mjs` 驗證；拿掉沒人讀的鍵時，用去掉那些鍵再算的雜湊比改前改後。著色器冷編譯時間在真實瀏覽器排除快取後量。

## 放棄的做法

- 上色抽成 GLSL 配方函式（`switch` 或 `if` 鏈）、以 DataTexture 或 uniform 陣列傳表、保留新舊兩條路的執行期開關：理由同 0013（`docs/plans/2026-11-18-material-table.md` §2.2、§4、§8.9–§8.12）。
- 把 0013 標成由 0016 取代、在 0016 補上原則：0016 的「後果」寫的過渡期旗標也已拿掉，照規則不改 0016 原文，所以另開本檔。

## 後果

- 地著色器 `mat==N` 84 → 0；`three-renderer.js` 的 `spec.name ===` 0；填色上沒有 `tongue`、`wedge.far`。`scripts/plate.test.mjs` 的窮舉測試與行為測試擋回歸。
- 0016 仍是第 3、4b 步各欄的紀錄；它「後果」裡「還剩 `doha.js` 的兩個旗標」一句由第 4c 步（`docs/plans/2026-11-18-material-table.md` §8.15）結束。
- `BOX_MATERIALS`（盒的部位，另一套 id）留在 `three-pack.js`，用同一組網格欄。
- 地著色器仍是單體主體，第一次編譯慢（§8.12）還沒處理。

## 證據

- `AGENTS.md`（§2 不做耦合）
- `docs/adr/0013-no-coupling-ssot-and-material-table.md`、`docs/adr/0016-material-table-mesh-and-bake-columns.md`
- `docs/plans/2026-11-18-material-table.md`（§2、§4、§8.1–§8.15）
- `src/studies/toji/plate/mat.js`、`src/studies/toji/plate/three-pack.js`、`src/studies/toji/plate/three-renderer.js`、`src/studies/toji/plate/bake.js`、`src/studies/toji/plate/doha.js`
- `scripts/plate.test.mjs`、`scripts/plate-diff.mjs`、`scripts/plate-parts-hash.mjs`
- commit `8c00620`、`2f821f3`
