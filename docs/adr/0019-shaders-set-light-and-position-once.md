# 0019 著色器先用 mSetLightAt 設好光與位置，再呼叫 mNashiji、mMetal

狀態：採用
日期：2026-11-20

## 背景

地著色器冷編譯 9–11 秒（0018、`docs/plans/2026-11-18-material-table.md` §8.12、§8.16）。逐一把輔助函式換成空殼量時間（§8.17）：把最後的 `mFinish` 換掉只剩約 0.5 秒，時間幾乎全在我們的上色；`mNashiji`（主體 8 個呼叫處，每次 3 層 `mChips`）與 `mMetal`（21 個呼叫處，每次一個 `mFlake`）佔最多。D3D 把每個呼叫都內聯成一份，而這兩個函式最貴的部分只跟像素的位置和光有關：同一支著色器裡每次呼叫的位置都一樣（地是 `kp`、盒側 `sp`、霞 `vKyotoUv`）。使用者 2026-11-20 要主代理自己排的下一批（`docs/plans/2026-11-20-next.md` N3）。

## 決定

- **光與位置一起設一次**：`mSetLightAt(n, worldPos, p)` 設好這個像素的光（`mSetLight`），並算好 `mNashiji` 的三層晶片形狀（`mChipAt`）、不勻（`mMura`）與 `mMetal` 的光照項（`mMetA`、`mMetB`、`mMetC`），存在全域變數。
- `mNashiji(dens, tint)`、`mMetal(f0, rise)` 不再收位置，只做依參數的便宜組合；`mChips` 接 `mChipAt` 的結果。
- 呼叫 `mNashiji` 或 `mMetal` 的著色器，在第一次呼叫前呼叫 `mSetLightAt`；著色器主體不直接呼叫 `mSetLight`。`scripts/plate.test.mjs` 檢查。
- 一個新的、只跟位置與光有關、又被呼叫很多次的輔助函式，照同樣的方式在 `mSetLightAt` 算一次。

## 放棄的做法

- 迴圈改成不展開（界限讀 uniform）：量到沒有變快（§8.17）。
- 第一次呼叫時才算、用旗標記住：每個呼叫處都會內聯一份「第一次」的程式，等於沒省。
- 把各分支的 `mNashiji` 呼叫搬成一次：呼叫夾在分支中間的運算裡，要搬動配方分支的寫法（0017 定的保守版），風險比較大。

## 後果

- 地著色器冷編譯 9.2–11.4 秒 → 5.0–5.2 秒；冷快取下到實景 11.6–14.3 秒 → 8.1–9.7 秒（無頭 Chrome、ANGLE D3D11，§8.17）。
- 畫面：十組 106 張裡 14 張、共 18 個像素差 1 級（滿分 255），位置在各組重複出現，是算式捨入順序改變的固定差異，不是閃動；肉眼看不出。使用者 2026-11-20 接受（「接受合併推上」）。
- 每個盤面像素本來就會跑一次 `mNashiji` 與 `mMetal`（主體第 104 行），先算不多花 GPU 時間；盒內、盒側、霞也照樣。
- 盒內只在開盒時看得到，拍圖矩陣沒有涵蓋。

## 證據

- `docs/plans/2026-11-18-material-table.md`（§8.12、§8.16、§8.17）
- `docs/plans/2026-11-20-next.md`
- `docs/adr/0017-no-coupling-one-material-table.md`、`docs/adr/0018-plate-precompile-with-still-placeholder.md`
- `src/studies/toji/plate/three-pack.js`、`scripts/plate.test.mjs`、`scripts/plate-matrix.sh`、`scripts/plate-diff.mjs`
