# 0022 著色器編譯或連結失敗時退回降級圖

狀態：採用
日期：2026-11-24

## 背景

0010 的降級圖只用在三種情況：沒有 WebGL2、three.js 模組載入失敗、建立時丟例外；context 遺失則由 `study.js` 重建成降級圖。0010 與 0018 的「後果」都記著同一個缺口：著色器編譯失敗不會退回降級圖。`compileAsync` 失敗時只印警告，照樣把盤標成可畫，畫面停在壞掉或空白的狀態。地著色器約 12.5 萬字元，舊驅動或手機 GPU 編不過的風險沒驗過（`docs/plans/2026-11-24-chain-2.md` §2.3 L1、L5）。使用者 2026-11-24 同意第二條長鏈的 H1 包。

## 決定

- **失敗只回報一次，只有一個入口**：`three-renderer.js` 的 `reportFailure` 是唯一的失敗通知。三種來源都走它：three.js 的 `debug.onShaderError`、`compileAsync` 被拒絕、編譯完後對已就緒程式做的連結檢查（`getUniforms` 觸發 three.js 的首次使用檢查）。它在下一個 microtask 呼叫 `createThreeRenderer` 的第四個參數 `onFailure`。
- **退回和載入失敗走同一條路**：`renderer.js` 的 `fallback` 是「three.js 不能用了」的唯一處理。它釋放 three.js 的盤、清掉畫布，`useStatic()` 換成同一區、同一日夜的降級圖，之後的換函照常。模組載入失敗與建立時丟例外也改走它。
- **context 遺失不算著色器失敗**：`onShaderError` 在 context 已遺失時不回報，仍由 `study.js` 處理（0010）。
- **只在開發時能故意觸發**：網址加 `?plate=shaderfail` 讓一支程式帶 `#error` 編譯失敗。用 `import.meta.env.DEV` 擋住，正式建置沒有這段。`scripts/smoke.mjs --allow-static --query=plate=shaderfail` 驗這條路。

## 放棄的做法

- 失敗後重試或換一套簡化的著色器：要多維護一套著色器，畫面也會和降級圖不同。降級圖已經是同一個盤的靜止畫面（0010、0018）。
- 在每個呼叫 `compileAsync` 的地方各自 catch、各自切換：同一個判斷會散在首盤編譯、鄰盤預熱、繪製三處（`AGENTS.md` §2 不做耦合）。

## 後果

- 正常路徑像素不變：base 22 張、lightoff 11 張和改前比，只有已知會跳 1 級的雜訊；唯一的新位置（上京日）重拍後和改前相同（`docs/plans/2026-11-24-chain-2.md` §8）。著色器內容與 `customProgramCacheKey` 沒改。
- 編譯失敗時使用者看到降級圖，盤面不跟光、不能點部件，換函與開卷照常（`smoke --query=plate=shaderfail`：home、switch、open、return 都過）。
- 還沒做：沒有 `KHR_parallel_shader_compile` 的瀏覽器仍在第一幀前同步編譯（0018 的後果，沒變）。
- 程式編譯完之後才發生的失敗（例如之後才用到的鄰盤程式），在它第一次繪製時回報，退回前可能閃一幀。

## 證據

- `docs/adr/0010-makie-plate-threejs-and-static-fallback.md`、`docs/adr/0018-plate-precompile-with-still-placeholder.md`
- `docs/plans/2026-11-24-chain-2.md`（§2.3 L1、§3 H1、§8）
- `src/studies/toji/plate/three-renderer.js`、`src/studies/toji/renderer.js`、`scripts/smoke.mjs`
