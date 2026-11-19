# 0010 蒔繪盤改用 three.js 單一管線與靜態圖降級

狀態：採用
日期：2026-11-14
取代：0009

## 背景

手寫原生 WebGL2 管線自行實作倒角、帶洞擠出、迴轉體、掃掠管、陰影、拾取與漆器材質的維護成本已超過價值。使用者於 2026-11-14 決定「直接換 three.js，不重新造輪子」並在 `AGENTS.md` §2 加入例外；2026-11-16（R3）完成切換、移除舊 WebGL2／2.5D 管線並確立靜態圖降級。

## 決定

- **例外授權邊界**：僅蒔繪盤（`src/studies/toji/plate/`）採用 `three`（以 `MeshPhysicalMaterial` 對應清漆、金屬粉與青貝虹彩，透過 `DataTexture` 與 `onBeforeCompile` 注入鉸鏈運動）；專案其餘頁面仍維持不新增大型繪圖依賴之規則。
- **單一繪製管線與純資料分離**：`src/studies/toji/renderer.js` 動態載入 `plate/three-renderer.js` 作為唯一繪製管線，刪除舊 WebGL2 管線與 `?three=0` 開關；`parts.js`、各幾何 builder 與 `three-pack.js` 維持不 import `three`，供 `node:test` 直接測試。
- **靜態圖降級**：裝置無 WebGL2、three.js 載入或啟動失敗、WebGL context 遺失或網址帶 `?plate=static` 時，由 `plate/static-plate.js` 顯示預渲染靜態圖（`plate/static/<WARD>.<day|night>.webp`，由 `scripts/plate-fallback-shots.mjs` 擷取）；盒面不動但換函與開蓋照常。盤面有改動時必須重拍 22 張降級圖。

## 放棄的做法

- 繼續維護自寫原生 WebGL2 管線或同時在兩條管線回補地與材質改動：因重複維護成本過高而放棄（`docs/MAKIE_THREE_PLAN.md` §1、`docs/MAKIE_GROUND_PLAN.md` §0）。
- 保留舊版 WebGL2 浮雕網格作為無 WebGL2 裝置的降級路徑：改採預渲染靜態 webp 並刪除舊管線，避免維護兩套渲染程式（`docs/plans/2026-11-16-roadmap.md` §1、§3 R3）。
- 將 ThreeRT（Rust＋wgpu 路徑追蹤）接入網站執行期：WebGPU 無硬體光追、Safari／iOS 未測且須將全部自訂 GLSL 改寫為 WGSL，故改僅作離線參考渲染器（dev 專用匯出，由 `import.meta.env.DEV` 排除於正式建置，`docs/MAKIE_THREERT_REFERENCE.md`）。

## 後果

- 蒔繪盤只維護一條 three.js 管線，無 WebGL2 裝置仍可透過靜態圖操作文庫與開蓋。
- 新增 `three` 依賴體積，且每次盤面視覺改動須重拍 22 張降級圖；目前著色器編譯失敗尚未自動退回靜態圖（記錄於 `docs/plans/2026-11-18-material-table.md` §8.8）。

## 證據

- `AGENTS.md`（§2 專案不變條件）
- `docs/HANDOFF.md`（§2 目前產品狀態）
- `docs/MAKIE_THREE_PLAN.md`（§1、§3、§7）
- `docs/MAKIE_GROUND_PLAN.md`（§0）
- `docs/MAKIE_THREERT_REFERENCE.md`
- `docs/plans/2026-11-16-roadmap.md`（§1、§3 R3）
- `src/studies/toji/renderer.js`、`src/studies/toji/plate/three-renderer.js`、`src/studies/toji/plate/three-pack.js`、`src/studies/toji/plate/static-plate.js`、`scripts/plate-fallback-shots.mjs`、`package.json`

