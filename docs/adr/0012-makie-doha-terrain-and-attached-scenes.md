# 0012 蒔繪盤地形採手寫疊坡組件、依附小景與逐點貼地

狀態：採用
日期：2026-11-16

## 背景

原蒔繪盤地形由 `vocab.js` 的 `hill()` 與 `gardenGround()` 整片抬高構成，表面平整大片且與肉合研出不符；早期隨機填隙（C2–C4）破壞物件形意，且樹採單點錨定高度造成躺平時穿插進土坡。隨機填隙於 2026-11-14 晚撤回，拆除台地改採手寫疊坡與樹逐點貼地於 2026-11-16 定案，本檔取最新定案日 2026-11-16。

## 決定

- **手寫疊坡取代平台**：刪除 `vocab.js` 的 `hill()` 與 `gardenGround()`；十一區地形改由 `src/studies/toji/plate/doha.js` 的遠山（`mountain()`）、岸（`banks()`）與洲浜（`tongues()`）組成，每片輪廓控制點逐片手寫於各區 `plate/<區>.js`，不使用共用地形模板加亂數生成。
- **小景依附於主體**：盤面小景必須以 `on` 欄位掛附於特定部件並逐區寫入構圖檔，不自動在空地隨機撒點；`src/studies/toji/plate/fillers.js` 僅保留 `blankStats` 作為留白參考數字，不作為必須壓低的驗收門檻。
- **部件逐點貼地與零穿插**：樹幹、葉片與建築等站立部件躺平時均須依 `groundY` 逐點貼合地形起伏，站立時再回到腳線高度；穿插由 `scripts/plate-clip.mjs` 驗證為 0。

## 放棄的做法

- 保留 `hill()` 與 `gardenGround()` 整片抬升平台僅更換材質紋理：使用者於 2026-11-16 裁定直接拆除，不修補錯誤的地形結構（`docs/plans/2026-11-16-doha.md` §1、§3.3）。
- 以 Poisson 圓盤取樣在空地隨機撒填隙小景（C3）並以共用生成器產生各區遠山（C2）與雲（C4）、以留白率低於 25% 作為驗收目標：使用者於 2026-11-14 晚指出為無差別亂塞並撤回（`docs/MAKIE_COMPOSITION_PLAN.md` §7、`src/studies/toji/plate/fillers.js` 檔頭）。
- 樹維持單一 `groundY(anchor)` 剛性平面：導致樹冠在預設躺平姿態被土坡切穿，於 2026-11-16 修正（`docs/plans/2026-11-16-clip.md` §2、§4）。

## 後果

- 各區地形與小景須逐區手寫維護於對應構圖檔，無法靠單一生成器批次調整全區；每區部品數仍受 `MAX_PARTS` 上限約束。
- 由 `scripts/plate.test.mjs` 的 doha 區規則測試與 `scripts/plate-clip.mjs` 穿插檢查守門。

## 證據

- `docs/HANDOFF.md`（§2、§5）
- `docs/MAKIE_COMPOSITION_PLAN.md`（§7 撤回隨機填隙）
- `docs/plans/2026-11-16-doha.md`（§1、§3–§4）
- `docs/plans/2026-11-16-nine-wards.md`（§1）
- `docs/plans/2026-11-16-clip.md`（§2–§4）
- `src/studies/toji/plate/doha.js`、`src/studies/toji/plate/fillers.js`、`src/studies/toji/plate/bake.js`、`scripts/plate-clip.mjs`、`scripts/plate.test.mjs`

