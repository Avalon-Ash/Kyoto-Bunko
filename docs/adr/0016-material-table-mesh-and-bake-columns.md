# 0016 材質表併表：網格參數與烘焙畫法也是材質表的欄

狀態：採用
日期：2026-11-20

## 背景

0013 定下材質性質集中在 `mat.js`，過渡期由 `MAT_LOOK` 管地面、`three-pack.js` 的 `MATERIALS` 管立體部件，兩表欄位不重疊，第 3 步併表。到 `0b44c2c` 為止還有三處用別的鍵判斷材質：`three-renderer.js` 以 `spec.name === '…'` 選網格著色器的分支（九個判斷）；`bake.js` 以填色上的 `f.wedge.far`、`f.tongue`、`f.fade` 選畫法；`export-glb.js` 另有一張以 `MAT` 為鍵的顏色表 `GROUND_COLOUR`。

## 決定

- **一張表**：`MAT_LOOK` 每列加 `mesh` 欄，內容是原本 `MATERIALS` 的那一列（逐字搬移）；`three-pack.js` 的 `MATERIALS` 改成由這一欄導出的常數，不再是第二個來源。
- **網格的欄**（`mat.js` 的 `meshLook`，`BOX_MATERIALS` 與 `GROUND_LID` 也用同一組欄）：`coat`（`sunk`／`top`／`faint`／`none`）、`shine`、`shinnuri`、`rock`、`rockPowder`、`grain`、`wood`。renderer 只讀欄，不比名字。
- **包漿與光澤下限分成兩欄**：盒的繩（盒 id 27）上包漿著色器、但不提清漆光澤下限，所以兩件事不能共用一欄。
- **不同的性質照實分開**：貝與珊瑚的包漿是地上 `coat: 'none'`、網格上 `mesh.coat: 'faint'`（統一由使用者決定）；`rockPowder`（25–28）和 `ROCK_LOOK.powder`（25、26）不合併；參考圖的顏色 `refColour` 和 `mesh.color` 不合併。
- **烘焙依材質選畫法**：`MAT_LOOK` 的 `fine` 欄（`mask`／`wedge`／`ridge`／`powder`）決定 `bake.js` 怎麼畫一個零件的填色；幾何仍由填色的 `f.wedge`、`f.fade` 提供。
- `BOX_MATERIALS` 是盒的部位（另一套 id，20–28 和 `MAT` 撞號），留在 `three-pack.js`，不用盒 id 查 `MAT_LOOK`。

## 放棄的做法

- 網格的包漿直接讀地上的 `coat` 欄：貝與珊瑚的值不同，統一會改變畫面（`docs/plans/2026-11-18-material-table.md` §6 第 3 項、§7.5）。
- `bake.js` 完全靠填色旗標選畫法、材質表不記：同一個「fine.g 是什麼」由兩個鍵決定，地著色器讀材質、烘焙讀旗標（§2.1）。
- 這一步同時刪掉 `doha.js` 的 `tongue`、`wedge.far` 旗標：量測腳本與 doha 的測試還讀 `wedge.far`，留到下一包（§8.14）。

## 後果

- `three-renderer.js` 沒有 `spec.name ===`；`export-glb.js` 沒有自己的顏色表。`scripts/plate.test.mjs` 的範圍圍欄把 `0b44c2c` 的九個名字判斷照抄成 JS，對每個零件材質、盒的部位與蓋比對讀欄的結果，並檢查十一區每個填色的旗標都和材質的 `fine` 一致。
- 加材質時在 `MAT_LOOK` 加一列，地的欄、`fine`、`mesh` 一起寫。
- 過渡期還剩 `doha.js` 的兩個旗標，由圍欄測試守住和 `fine` 一致。

## 證據

- `docs/plans/2026-11-18-material-table.md`（§2.1、§7.3、§8.1、§8.14）
- `docs/adr/0013-no-coupling-ssot-and-material-table.md`
- `src/studies/toji/plate/mat.js`、`src/studies/toji/plate/three-pack.js`、`src/studies/toji/plate/three-renderer.js`、`src/studies/toji/plate/bake.js`、`src/studies/toji/plate/export-glb.js`
- `scripts/plate.test.mjs`
- 基準 commit `0b44c2c`
