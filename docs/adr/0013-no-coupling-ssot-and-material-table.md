# 0013 禁止架構耦合與蒔繪盤材質表單一事實來源

狀態：已取代（由 0017）
日期：2026-11-19

## 背景

蒔繪盤材質性質原本分散於四個檔案（地著色器 47 行、84 處 `mat==N` 比較，`three-renderer.js` 字串判斷，`bake.js` 填色旗標，`doha.js` 的 `tone` 字串），2026-11-17 曾因疏密場條件漏列導致岸、山腳、池邊三處各修一次。使用者於 2026-11-17 確立「不做耦合」原則，2026-11-18 核准材質表提案，2026-11-19 完成第 0–2 步保守版與第 4a 步，本檔取定案日 2026-11-19。

## 決定

- **不做耦合原則**：每個概念（材質、狀態、設定、規則）的性質只定義於一處（SSOT，採資料與行為分離的 ECS 結構），其他模組讀表；不留魔術數字，連動常數須合併或導出；既有耦合須先提案（改哪裡、行為不變證明、回退方式）經使用者同意才動手。
- **材質表集中於 `mat.js`**：`src/studies/toji/plate/mat.js`（維持零 import）存放 `MAT_LOOK`、`DOHA_TONE`、`ROCK_LOOK`；新增材質於表內加列並指定配方，禁止在地著色器比對材質編號、在 `doha.js` 比對 `tone` 字串或在 `rock-mesh.js` 比對 `MAT.*`。過渡期間 `MAT_LOOK` 管地面性質、`MATERIALS` 管立體部件性質，兩表鍵齊備且欄位不得重疊（第 3 步併表）。
- **著色器取表與保守分支**：建字串時由 `MAT_LOOK` 生成 GLSL 常數陣列（`MAT_LOOK_GLSL`，以精確數值輸出不經 `toFixed` 截斷）；配方分支保留於地著色器主體原位、以具名常數（`rc == RECIPE_*`）判斷，不把上色本體抽進個別 GLSL 配方函式；不設新舊雙路徑開關。
- **不變證明與編譯量測**：畫面不變以固定時鐘（`?clock=`）加 `scripts/plate-diff.mjs`（同次開機與同 dev server）及 `scripts/plate-parts-hash.mjs` 驗證；著色器冷編譯時間須在真實瀏覽器排除快取後量測。

## 放棄的做法

- 將各材質上色抽成獨立 GLSL 配方函式搭配 `switch`（commit `d99774d`，已以 `5e0ae16` 回退）或 `if`/`else if` 鏈：在桌機 Chrome D3D11 上排除快取冷編譯由 10–15 秒增至 48.6 秒與 32.1 秒，故改採主體保留分支的保守版（`docs/plans/2026-11-18-material-table.md` §8.9–§8.12）。
- 以 DataTexture（RGBA32F）或 uniform 陣列傳表：前者壓縮手機 16 個 sampler 餘量並多一次取樣，後者消耗大量 vec4 uniform 上限不穩（`docs/plans/2026-11-18-material-table.md` §2.2）。
- 保留新舊兩條路的執行期開關：會讓舊分支與新表並存形成二次耦合，改以每步獨立 commit 搭配 `git revert` 回退（`docs/plans/2026-11-18-material-table.md` §4）。

## 後果

- 地著色器 `mat==N` 比較由 84 降至 0，`scripts/plate.test.mjs` 以範圍圍欄與 0–28 窮舉測試阻擋回歸及欄位重疊。
- 地著色器仍維持單體主體結構；第 3 步（`three-renderer.js` 字串判斷與 `MATERIALS` 併表）及第 4b 步（`bake.js`、`export-glb.js`）尚未完成。

## 證據

- `AGENTS.md`（§2 不做耦合）
- `docs/HANDOFF.md`（§4.4a、§4.5）
- `docs/plans/2026-11-18-material-table.md`（§0、§2、§4、§8.1–§8.13）
- `src/studies/toji/plate/mat.js`、`src/studies/toji/plate/three-pack.js`、`src/studies/toji/plate/doha.js`；rock-mesh.js 在 2026-11-23 隨 `rock()` 一起刪除（沒有區在用），最後的版本在 commit `6ef5f01`
- `scripts/plate.test.mjs`、`scripts/plate-diff.mjs`、`scripts/plate-parts-hash.mjs`

