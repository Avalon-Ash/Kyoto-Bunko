# 0018 蒔繪盤先非同步編譯完再畫，期間顯示降級圖

狀態：採用
日期：2026-11-20

## 背景

地著色器的片段程式約 12.5 萬字元，在 D3D11 上冷編譯要 10–15 秒（`docs/plans/2026-11-18-material-table.md` §8.12）。平常被瀏覽器的著色器快取蓋住；第一次來的訪客、或每次改了地著色器重新部署後，第一次 `renderer.render` 會同步編譯，整頁卡住十幾秒。改前在無頭 Chrome（ANGLE D3D11、RTX 4070）用 `?cold` 讓快取失效，量到最長的主執行緒長任務 11.1–17.0 秒（§8.16）。0010 的降級圖只用在 three.js 跑不起來的時候。使用者 2026-11-20 說「推上繼續後續計畫」，接著做 §8.12 留下的這一包。

## 決定

- **先編譯，再畫**：`three-renderer.js` 啟用第一塊盤時對整個場景呼叫 `renderer.compileAsync(scene, camera)`（地與盒在 `boxGroup`，不在區的 group 裡，所以不能只編區的 group）。`renderer.js` 的 `mode()` 也讀同一個判斷。編譯完之前 `draw` 不畫，`loading()` 為真；編譯完呼叫 `onReady`。編譯中換區，會對新的場景再編一次。
- **期間顯示降級圖**：`renderer.js` 的 `pending()` 是「three.js 還不能畫」的唯一判斷（模組載入中，或第一塊盤編譯中）。這段期間 canvas 清空，`static-plate.js` 的 `paint` 把該區的降級圖鋪成 canvas 的 CSS 背景；three.js 畫第一幀時拿掉。`study.js` 的「正在鋪設」提示照 `loading()` 顯示。
- **`data-renderer` 的意義不變**：編譯中仍是 `'webgl'`，第一幀實景畫出時才變 `'three'`；`'static'` 只代表真的降級（0010）。拍圖腳本等 `'three'` 再拍。
- **量測工具**：dev 專用的 `?cold` 讓地著色器多一個每次載入都換名字、而且有被用到的 uniform，強迫快取失效；沒有 `?cold` 時著色器字串不變，正式建置沒有這段。

## 放棄的做法

- 只把已有的預熱（`warmEntry`）延伸到第一塊盤：它只編區的 group，碰不到地著色器。
- 先縮短地著色器：把上色收成配方函式會讓編譯變成 32–49 秒（0017、§8.9–§8.12）；要縮短得另做，這一包不動著色器內容。
- 編譯期間顯示空白或只顯示提示：降級圖已經是同一個盤的靜止畫面，也已經打包；不必多一套畫面。

## 後果

- 冷快取下到實景的時間沒變（改前 11.9–18.3 秒、改後 11.6–14.3 秒：編譯本身仍要十幾秒，只是不在主執行緒上）。改變的是這段期間頁面不卡（最長長任務 11.2–16.5 秒 → 0.40–1.04 秒），降級圖約 0.25 秒出現（無頭 Chrome，§8.16）。期間盤不跟光、不能點部件；換函照常（測過：降級圖跟著換，實景是新的那一區）。沒有 `KHR_parallel_shader_compile` 的瀏覽器，`compileAsync` 會在第一幀前同步編譯，和改前一樣卡。
- 降級圖多了一個用途：盤面改動後沒有重拍，第一次載入會先看到舊的靜止畫面（0010 本來就要求重拍）。
- 著色器編譯失敗仍不會自動退回降級圖（0010 的後果，沒變）。

## 證據

- `docs/plans/2026-11-18-material-table.md`（§8.12、§8.16）
- `docs/adr/0010-makie-plate-threejs-and-static-fallback.md`
- `src/studies/toji/plate/three-renderer.js`、`src/studies/toji/renderer.js`、`src/studies/toji/study.js`、`src/studies/toji/plate/static-plate.js`
- `scripts/plate-shot.mjs`、`scripts/plate-matrix.sh`、`scripts/plate-diff.mjs`
