# 0028 蒔繪盤的房間只定義在 room.js，環境貼圖由公式畫出

狀態：提議
日期：2026-11-28

## 背景

蒔繪盤的「房間」原本有三處獨立定義：蓋面的 `mRoom`／`mBand`／`mCoat`（光色寫在 GLSL）、部件的 `kyotoWin` 與真塗 `K_LACQ_WIN`、three 內建的 `RoomEnvironment`（與主光方向、日夜色無關）。K0 實測確認 three 0.186.1 在材質沒有獨立 `envMap` 時會忽略 `material.envMapIntensity`（0 與 5 逐像素 0 差異）。使用者 2026-11-27 同意「Kyoto 的解耦我同意」，並回答 Q1 接受部署後冷編譯一次、Q2 部件直射光色先不統一。

## 決定

- **正本**：主光方向、窗的範圍與增益、天光比例、日夜光色只定義在無 import 的 `src/studies/toji/plate/room.js`（`ROOM`）；GLSL 只收 `ROOM_GLSL` 注入的具名常數，不寫字面值。
- **同一份房間形狀**：天光與窗的公式只在 `src/studies/toji/plate/three-pack.js` 的 `roomLightGlsl` 寫一份 JS 文字樣板，蓋面與環境貼圖各自展開。
- **環境貼圖**：只在 `src/studies/toji/plate/room-env.js` 的 `buildRoomEnvironment` 建立，將房間公式（粗糙度 0）畫在球面上交給 `PMREMGenerator.fromScene`，不再使用 `RoomEnvironment`；`ROOM_ENV.fill` 是唯一允許偏離蓋面天光比例的旋鈕。
- **日夜色調與每材質倍率**：環境只烘一張日色貼圖；`patchRoomTint` 在 `lights_fragment_maps` 之後把 IBL 乘上 `uRoomTint` 與每材質 `uRoomGain`（來自 `mat.js` 的 `roomGain` 欄，原 `envMapIntensity` 改名），不設 `material.envMap`；亮度由 `scene.environmentIntensity` 管。
- **窗只留一處**：窗留在環境貼圖裡，刪除部件的 `kyotoWin`、真塗窗瓣、`K_LACQ_ROOM`、`ROOM.partWindow`、`ROOM.lacquerWindow`。
- **蓋面不變**：蓋面不吃 `scene.environment`；動房間時蓋面必須 0 差異，以 `scripts/plate-room-stats.mjs` 的 `lid-diff` 驗證。

## 放棄的做法

- **光板場景（開案書 §2.2）**：改由球面著色器直接畫房間公式，省去用平面近似平滑窗緣。
- **房間公式抽成 GLSL 函式（B0）**：`?coat=0` 與 `?matSwap` 出現零星大差異（最多 120 級，金片閃點翻面），改用 JS 文字樣板 `roomLightGlsl`。
- **兩張日夜環境貼圖**：啟動或切換會多出長任務，超出 ADR 0027 預算。
- **環境加「牆」（側面補光）**：0.5 時金的 σ 掉到 23（改前 28.5），0.08–0.2 仍低於無牆，拿掉。
- **留著 `kyotoWin`**：窗不可同時存在兩處，改留於環境貼圖。

## 後果

- 地著色器字串變動，部署後每位訪客冷編譯一次（期間顯示降級圖，ADR 0018）。
- 夜間天光色沿用窗光夜日色比（`roomTint(true)`），是近似。
- `patchRoomTint` 依賴 three 的 `lights_fragment_maps` chunk 與內部變數名，升級 three 須重驗（缺 chunk 會拋錯）。
- 色調接縫與著色器文字變動讓部件像素差 1 級屬預期（A 包手機版南區日景 182 像素差 1 級，全在部件上）。
- `scripts/room.test.mjs` 守門單一來源、接縫與窗只留一處；`scripts/plate-room-stats.mjs` 守門蓋面 0 差異與亮暗分佈。

## 證據

- `AGENTS.md`（§2 不做耦合）、`docs/plans/2026-11-28-room.md`（§1–§11）
- `docs/adr/0011-makie-technique-stack-and-coat-layers.md`、`docs/adr/0017-no-coupling-one-material-table.md`、`docs/adr/0018-plate-precompile-with-still-placeholder.md`、`docs/adr/0019-shaders-set-light-and-position-once.md`、`docs/adr/0027-first-load-in-steps-one-slice-budget.md`
- `src/studies/toji/plate/room.js`、`src/studies/toji/plate/room-env.js`、`src/studies/toji/plate/three-pack.js`、`src/studies/toji/plate/three-renderer.js`、`src/studies/toji/plate/mat.js`
- `scripts/room.test.mjs`、`scripts/plate-room-stats.mjs`、`scripts/plate-room-shots.sh`
- commit `c995a35`（A 包，標籤 `k1-a`）、`036e624`（S 包）、`545166c`（B＋C 包）
