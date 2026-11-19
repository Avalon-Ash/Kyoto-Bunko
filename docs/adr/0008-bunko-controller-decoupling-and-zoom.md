# 0008 文箱控制器解耦、純函式縮放與背景動畫邊界

狀態：採用
日期：2026-11-09

## 背景

首頁文庫與獨立展示頁共用同一組文箱畫布，且主要使用者為手機觸控情境，需要支援放大近觀、背景霞帶與長列表篩選，同時避免記憶體超限或主執行緒掉幀。手勢優先與背景分層於 2026-11-09 決定（`docs/UI_RENEWAL_PLAN.md` §6），卡片與列表動態取捨於 2026-11-16（R8）完成定案；本檔取主架構決定日 2026-11-09。

## 決定

- **文箱核心解耦**：`src/studies/toji/study.js` 的 `mountBunko(root, options)` 僅管畫布、移光、縮放、換函與開蓋，不含頁面按鈕與書卷 UI；React 端由 `src/components/BunkoEntrance.tsx` 單向傳入 `lang`、`wardId`、`preferences` 並接收 `onWardChange`、`onOpenVolume`；獨立展示頁由 `study-chrome.js` 包裝外殼。舞台 DOM 僅由 `template.ts`（`BUNKO_STAGE`）匯出；`destroy()` 須釋放事件、觀察器、RAF 與 GPU 資源。開蓋直接進入 `DetailView`，不另設書卷對話框。
- **相機縮放與手勢優先**：縮放與平移採正交相機視圖框計算，純函式抽離至 `src/studies/toji/view.js`（`ZOOM_MAX=3`、放大時 DPR 上限 2、畫布像素上限 `PIXEL_CAP = 2.2e6`），並與 `groundPoint()` 共用同一投影矩陣。手勢與滑鼠衝突時以觸控手勢優先；縮放依狀態切換換函或平移。
- **背景離屏烘焙與合成器動畫**：`src/studies/toji/backdrop.js` 以 Canvas 2D 僅於尺寸或晝夜改變時離屏重繪和紙與すやり霞，飄移與微粒交由 Web Animations 合成器驅動、不跑 JS 逐格，由 `mountBunko` 控管生命週期並於減少動態或讀卷時暫停；霞帶須避開 `CABINET_SILHOUETTE` 中央禁區。
- **卡片與列表動態**：卡片傾斜與進場純規則置於 `src/lib/card-fx.ts`（彈簧回正使用既有 `motion`，篩選進場採 CSS 動畫且限 30 張以內）；超過 30 張之列表由 `src/lib/batch-render.ts` 分批渲染。

## 放棄的做法

- 以 CSS `scale` 放大文箱：因放大會變糊，改於正交相機投影層縮放（`docs/UI_RENEWAL_PLAN.md` §4 P1）。
- 重寫 `mountBunko` 整體狀態架構，或直接複製 FeralUI 網站未標示授權的打包碼：採外移純函式並僅參考原理重寫（`AGENTS.md` §2、`docs/UI_RENEWAL_ARCHITECTURE.md` §8、`docs/UI_RENEWAL_PLAN.md` 檔頭）。
- 另建全站自寫 `src/lib/spring.ts` 與以 `motion` `AnimatePresence` + `layout` 實作列表重排動畫：375px、CPU 4 倍降速下最長幀由約 50 ms 升至 120–150 ms，故放棄離場與重排動畫，改用 CSS 進場與既有 `motion`（`docs/UI_RENEWAL_PLAN.md` §4 P4、`docs/plans/2026-11-16-roadmap.md` R8）。

## 後果

- `view.js`、`backdrop.js`、`card-fx.ts`、`batch-render.ts` 等純規則可於 Node 測試直接驗證，由 `scripts/ui-renewal.test.mjs` 與 `scripts/bunko-integration.test.mjs` 守門。
- 列表篩選不提供離場與重排過渡；若更改箱體幾何或相機 `EYE`，須同步更新 `CABINET_SILHOUETTE`。

## 證據

- `docs/DEVELOPMENT.md`（京洛文庫）
- `docs/UI_RENEWAL_ARCHITECTURE.md`（§1–§5、§8）
- `docs/UI_RENEWAL_PLAN.md`（§4、§6）
- `docs/plans/2026-11-16-roadmap.md`（R8）
- `src/components/BunkoEntrance.tsx`、`src/studies/toji/study.js`、`src/studies/toji/study-chrome.js`、`src/studies/toji/template.ts`、`src/studies/toji/view.js`、`src/studies/toji/backdrop.js`
- `src/lib/card-fx.ts`、`src/lib/batch-render.ts`、`scripts/ui-renewal.test.mjs`、`scripts/bunko-integration.test.mjs`

