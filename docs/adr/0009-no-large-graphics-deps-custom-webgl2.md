# 0009 禁止新增大型繪圖依賴並以原生 WebGL2 繪製蒔繪盤

狀態：已取代（由 0010）
日期：2026-11-11

## 背景

專案前端以靜態網站部署於 GitHub Pages，在 Phase 4 文庫浮雕盤與 UI 翻新規劃階段，需要控制打包體積並避免引入與現有座標及鉸鏈運動生命週期不一致的外部 3D 引擎。此規則載於 `AGENTS.md` §2 與 `docs/UI_RENEWAL_ARCHITECTURE.md` §8（2026-11-11），並於 2026-11-14 `docs/MAKIE_REBUILD_PLAN.md` §3 評估後再次維持；本檔取最早載明此限制的文件日期 2026-11-11。

## 決定

- 全專案禁止新增大型繪圖依賴（不引入 `three` 等 3D 函式庫），亦不複製外部引擎原始碼或自 CDN 載入。
- 首頁文箱蒔繪浮雕盤以專案自寫的原生 WebGL2 管線與有限範圍 CPU 幾何建構函式實作（自寫倒角、擠出、掃掠、陰影深度 pass、拾取與 GLSL ES 3.00 著色器）。
- 若日後出現大量任意輪廓帶洞或倒角需求，須另行評估並經使用者決定是否解除大型繪圖依賴限制。

## 放棄的做法

- 僅引入 three.js 幾何產生器（`ExtrudeGeometry`、`LatheGeometry`、`TubeGeometry`）輸出至現有 WebGL2 buffer：在 2026-11-14 評估中，因須連帶引入 `BufferGeometry`、曲線與三角化模組，仍需自行處理 XY→XZ 轉軸、owner 歸屬與本案鉸鏈運動，當時選擇零新依賴並以有限範圍自寫幾何取代（`docs/MAKIE_REBUILD_PLAN.md` §3）。

## 後果

- 打包體積無外部 3D 函式庫增量，資料座標與鉸鏈運動無第二套座標系或生命週期。
- 幾何法線、端蓋、帶洞擠出、陰影、拾取與多層漆器材質均須由專案自行撰寫與除錯；此決定之蒔繪盤範圍於 2026-11-14 由 ADR 0010 取代。

## 證據

- `AGENTS.md`（§2 專案不變條件）
- `docs/UI_RENEWAL_ARCHITECTURE.md`（§8 不做的事）
- `docs/MAKIE_PLATE_HANDOFF.md`（§4 架構）
- `docs/MAKIE_REBUILD_PLAN.md`（§3 three.js 評估）

