# 0021 JavaScript 也做型別檢查，ESLint 只管正確性

狀態：採用
日期：2026-11-22

## 背景

- 文箱與蒔繪盤（`src/studies/toji/` 底下 46 個 `.js`）與 `scripts/` 的腳本是純 JavaScript。`tsconfig.json` 有 `allowJs` 沒有 `checkJs`，`npm run lint` 只跑 `tsc --noEmit` 與 ADR 檢查：打錯屬性名、多傳或少傳引數，只能靠測試與截圖發現。
- 2026-11-22 體檢試跑 `tsc --checkJs`：照 TypeScript 那一側的嚴格度有 3,100 個錯誤，多數是沒標型別的參數；放寬成「沒標型別與 null 不算錯」後是 231 個。
- 這 231 個裡有 18 個是程式真的有問題：十六處 `pine()` 多傳一個沒人讀的引數、`meshRock` 的粉岩分支回傳單一零件而呼叫端都當陣列展開、一處把布林相加。
- `tsc` 沒有 `include`／`exclude`，會把 `dist/` 的產物也掃進去。

## 決定

- **兩份設定**：`tsconfig.json` 管 TypeScript（嚴格，範圍是 `src`、`scripts`、`tools` 與根目錄的兩個檔，不含 `dist`）；`tsconfig.js.json` 繼承它，開 `checkJs`，關掉 `noImplicitAny`、`noImplicitThis`、`strictNullChecks`。JavaScript 的型別從 JSDoc 來。
- **關卡是 0 個錯誤**。`npm run lint` 依序跑 `tsc --noEmit`、`tsc -p tsconfig.js.json --noEmit`、`eslint .`、`node scripts/check-adr.mjs`；CI 的部署流程跑同一個指令。
- **修型別錯誤只用 JSDoc**（`@typedef`、`@param`、`@returns`、`@type`，以及轉成具體型別的 JSDoc 轉型）。不用 `any` 轉型、`@ts-ignore`、`@ts-expect-error`、`@ts-nocheck`，也不把選項物件寫成 `Object` 或 `Record<string, any>`。只有改程式才消得掉的錯誤是真問題，照實修或回報，不用型別蓋掉。
- **一個資料形狀的 `@typedef` 只寫一處**，放在定義它的檔（例：`Part` 在 `plate/vocab.js`、`Frame` 在 `renderer.js`），其他檔用 `import('./x.js').T` 引用。dev 專用的 `window` 全域宣告在各自模組旁的 `dev-globals.d.ts`。
- **ESLint 只管正確性**（`eslint.config.js`）：未定義、未使用、不可達、重複的鍵，以及 React hooks 的兩條規則。不開任何排版或風格規則；`no-useless-escape`、`no-useless-assignment`、`preserve-caught-error` 關掉，空的 `catch` 允許。受保護檔案（ADR 0003）不為了過 lint 而修改，在設定裡對它們關掉未使用變數的規則。
- 這個 repo 沒安裝的模組（`playwright`、`@threert/scene`）宣告在 `src/optional-modules.d.ts`。

## 放棄的做法

- 逐檔加 `// @ts-check`：哪些檔有檢查要靠人記，新檔容易漏；整個資料夾一起檢查、關卡是 0，比較不會退步。
- 對 JavaScript 用和 TypeScript 一樣的嚴格度：3,100 個錯誤裡多數是補參數型別的苦工，抓不到更多真問題，而且會逼出大量 `any`。
- 把 `.js` 改寫成 `.ts`：蒔繪盤的程式逐像素驗收，改寫的風險與成本都高，JSDoc 已能擋住同一類錯。
- ESLint 的風格規則或 Prettier：`study.js` 等檔是一行多敘述的寫法，全面改排版會讓 diff 失去可讀性，和這次要抓的錯無關。

## 後果

- 新增或修改 JavaScript 時，傳了函式不收的引數、讀了不存在的屬性、選項名打錯，`npm run lint` 會擋下。
- 沒標型別的參數仍是 `any`：經過它的值不受檢查。要更嚴，從補 `@param` 開始，不是改設定。
- 開發依賴多了 `eslint`、`@eslint/js`、`globals`、`typescript-eslint`、`eslint-plugin-react-hooks`；都不進產品包。
- 程式裡有一處 `eslint-disable-next-line`（`src/components/HomeView.tsx`，只在掛載時執行的 effect，理由寫在同一處）。再加新的要寫理由。

## 證據

- `tsconfig.json`、`tsconfig.js.json`、`eslint.config.js`、`package.json`（`lint` 指令）。
- `src/studies/toji/plate/dev-globals.d.ts`、`src/studies/toji/dev-globals.d.ts`、`src/optional-modules.d.ts`。
- `docs/plans/2026-11-22-health-and-backlog.md` §2 W4、W5，§9.1–§9.4（錯誤數、派工、驗收的做法與找到的真問題）。
- commit `08a3354`、`81c6cde`、`46c2411`（只改 JSDoc 的三包）、`687c213`（三類真問題的修正）。
