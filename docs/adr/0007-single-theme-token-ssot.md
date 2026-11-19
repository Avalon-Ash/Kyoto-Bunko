# 0007 全站色票集中於 theme.css 與單一視覺寫入線

狀態：採用
日期：2026-11-09

## 背景

主站檢索頁面、首頁十一區文庫與獨立展示頁（`/toji-study/index.html`）原本各自維護色值與樣式，日夜切換容易分歧；多代理同時修改樣式檔亦會產生衝突。本決定確立於 2026-11-09 UI 翻新 P0 與樣式統合（`docs/UI_RENEWAL_ARCHITECTURE.md` §2.5），寫入線規則載於 `AGENTS.md` §3。

## 決定

- **唯一色票來源**：`src/theme.css` 定義全站唯一的晝／月光色票與字體 token（`--entry-*`、`--hira-*`、`--font-serif`、`--title-font`），由 `:root[data-theme]`、`.kyoto-app[data-theme]` 與 `.bunko.night` 共用；日夜切換統一以 `cabinetPreferences.night` 為準。元件不寫死 hex 色碼，Canvas／Leaflet 需用字面色值時須註明 `mirrors theme.css`。
- **樣式邊界分檔**：`src/index.css` 僅保留 Tailwind preflight、捲軸與地圖標記樣式；`src/bunko-ui.css` 放主站元件樣式；`src/studies/toji/bunko.css` 放主站與展示頁共用舞台樣式；`src/studies/toji/study.css` 僅放獨立展示頁外殼樣式。
- **介面文案集中**：主站介面字串集中於 `src/data/i18n.ts`，元件內不寫中日文三元運算；獨立展示頁外殼文案保留於 `src/studies/toji/study-chrome.js`，不由 React 載入。
- **單一視覺寫入線**：`theme.css`、`index.css`、`bunko-ui.css`、`ClusterMap.tsx`、`bunko.css`、`study.css`、`backdrop.js`、`ward-art.js` 屬於同一視覺整合工作線，同一時間只允許一個寫入者。

## 放棄的做法

- 在 `study.css` 與主站各自寫死色值，或另建第三套獨立色票變數（`docs/UI_RENEWAL_ARCHITECTURE.md` §2.5）。
- 初期 P0 曾規劃將和色值搬入 `src/index.css` 的 Tailwind `@theme`（`--color-washi-*` 等），實際定案維持 `src/theme.css` 作為唯一色票來源，`src/index.css` 僅提供 preflight 與字體變數（`docs/UI_RENEWAL_ARCHITECTURE.md` §2.5、`src/index.css` 檔頭）。
- 將視覺工作線檔案分派成多個並行美術修改包（`AGENTS.md` §3、`docs/UI_RENEWAL_ARCHITECTURE.md` §0）。

## 後果

- 主站與展示頁切換暖日／月光時共用同一組色票與焦點外框，避免主站與展示頁色值分歧。
- 涉及上述視覺工作線的任務必須排成先後順序執行，不得並行寫入同一組檔案。

## 證據

- `AGENTS.md`（§3 子代理與成本控制）
- `docs/DEVELOPMENT.md`（視覺風格：漆藝）
- `docs/HANDOFF.md`（§2、§5）
- `docs/UI_RENEWAL_ARCHITECTURE.md`（§0–§1、§2.5）
- `src/theme.css`、`src/index.css`、`src/bunko-ui.css`、`src/studies/toji/bunko.css`、`src/studies/toji/study.css`、`src/data/i18n.ts`、`src/studies/toji/study-chrome.js`

