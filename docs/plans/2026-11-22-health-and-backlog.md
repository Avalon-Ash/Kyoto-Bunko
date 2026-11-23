# 專案體檢、積壓工作與下一批計畫（開案書）

開案：Claude Fable 5.2（主席，2026-11-22）。base：`main` @ `b61314c`，工作樹乾淨，本機與遠端只有 `main`。
依據：使用者 2026-11-22「詳細看一下目前專案弱點和可優化部分，並把積壓工作列出。給我妳的計畫」。
§1–§6 是盤點與計畫，寫的時候**沒有改任何程式或資料**；P0（文件對齊）之後做完，結果在 §7，W12–W14 已修。標記：「確認」＝本次用指令量到；「文件說」＝只在文件裡看到、這次沒重新核對；「推測」＝判斷。

## 1. 現在是好的（確認）

| 檢查 | 結果（`b61314c`） | 指令 |
|---|---|---|
| 型別與 ADR | exit 0；ADR 20 份通過 | `npm run lint` |
| 資料 | 734 筆，ERROR 0／WARN 0 | `npx --no-install tsx validate_data.js --strict` |
| 測試 | 155／155、17／17 | `npm test` |
| 建置 | exit 0，4.5 秒 | `npm run build` |

- 程式裡沒有 `TODO`／`FIXME`、沒有 `as any`／`@ts-ignore`／`eslint-disable`（`git grep`）。
- 地著色器不再比材質編號（`git grep -E "mat\s*==\s*[0-9]" -- src/studies` 0 處）。
- three 與 Leaflet 都是延遲載入（`renderer.js:65`、`DetailView.tsx:26`），three 起不來有靜態降級圖。
- dev 專用的 `clip-probe.js`、`export-glb.js` 有 `import.meta.env.DEV` 擋著，沒有進產品包（`ls dist/assets` 沒有它們）。`probe.js` 例外，見 W19。

**這次體檢的範圍**：量的是指標（四項檢查、計數、grep、建置輸出、文件對 git），加上幾個檔的抽樣。React 那一側與三個大檔（`three-pack.js`、`three-renderer.js`、`study.js`）沒有逐行讀；逐行審查排在 P2、P3 裡做。

## 2. 弱點（依風險排序）

### A. 做了但沒人驗過

| # | 弱點 | 證據 | 等級 |
|---|---|---|---|
| W1 | 11/16–11/20 上線的盤面、作舊、換函、冷編譯改動，使用者都沒在手機實機看過，也沒在實機量過。八項畫面決定原本卡在這（§3 B2）；2026-11-22 使用者改成由主席全權決定（§5），但「實機沒人看過」這件事本身還在 | HANDOFF §3「沒人驗過的」；`2026-11-20-next.md`「使用者的實機上沒量」；材質表提案 §8.11「手機實機」沒做 | 文件說 |
| W2 | 冷快取第一次載入到實景仍要 8.1–9.7 秒（期間顯示降級圖），是桌機 D3D 的數字；地著色器以外的 24 支程式沒處理；手機未知 | 材質表提案 §8.17、§8.18 | 文件說 |
| W3 | 產品包：`three-renderer` 802.79 kB（gzip 230.69）、`main` 362.69 kB（gzip 117.52）、`ClusterMap` 205.87 kB（gzip 61.42）。沒有做過包的拆解，所以不知道哪些可以省 | `npm run build` 輸出 | 確認（大小）；能省多少未知 |

### B. 靜態保護薄

| # | 弱點 | 證據 | 等級 |
|---|---|---|---|
| W4 | 文箱與蒔繪盤全是純 JS、沒有型別檢查：`tsconfig.json` 有 `allowJs` 沒有 `checkJs`，全庫沒有 `@ts-check`；`npm run lint` 只有 `tsc` 加 ADR 檢查，沒有 ESLint。範圍是 `src/studies/toji` 的 46 個 `.js`，含最大的三個檔：`three-pack.js`（87 KB）、`three-renderer.js`（66 KB）、`study.js`（31 KB）。打錯屬性名、少傳參數只能靠測試與截圖抓 | `cat tsconfig.json`；`git grep -c "@ts-check"` 0；試跑 `npx tsc --noEmit --checkJs`（排除 `dist/`）：3,100 個錯誤，其中 TS7006 隱含 any 1,941、TS7005 350；比較像真問題的 TS2345（引數型別）189、TS2339（屬性不存在）155，還沒逐筆看是不是真錯 | 確認 |
| W5 | `tsconfig.json` 沒有 `include`／`exclude`，`tsc` 會把 `dist/` 的產物也掃進去 | 同上（`dist/assets/*.js` 佔 11,868 個錯誤） | 確認 |
| W6 | 測試集中在一個大檔：`scripts/plate.test.mjs` 1,726 行、64 個測試，行為測試與範圍圍欄混在一起。讀原始碼文字的圍欄（`readFileSync` 10 處）是 ADR 0014、0017 與材質表提案 §2.3 設計的防線，**不是弱點、要留**；弱點是檔太大、兩類沒分開。直接碰 React 元件或 `useKyotoEngine` 的測試檔 grep 到 2 個。手勢、換函、開蓋的瀏覽器流程沒有自動化，靠手動跑截圖腳本。重裝依賴後偶發 1 個失敗（N2）沒重現、沒定位 | `grep -c` 計數；ADR 0014；`2026-11-20-next.md` N2 | 確認（計數）；N2 文件說 |

### C. 耦合與魔術數字（只提案，照合約不直接動）

| # | 弱點 | 證據 | 等級 |
|---|---|---|---|
| W7 | **區的清單與順序定義了六處**。來源是 `src/data/wards.ts` 的 `WARD_KEYS`（受保護），另外各寫一份的有：`src/hooks/useKyotoEngine.ts:51`（`ALL_WARD_KEYS`）、`scripts/plate-fallback-shots.mjs:15`、`scripts/plate-matrix.sh:11`（名稱:步數表）、`scripts/plate-shot.mjs:40`、`scripts/plate-doha-similar.mjs:77`（ID→檔名），以及 HANDOFF §4.5 的步數。預設區 `'W_MINAMI'` 在 `src/App.tsx:13` 與 `src/studies/toji/study.js:36` 各寫一次 | `git grep "W_YAMASHINA"`、`git grep "'W_MINAMI'"` | 確認 |
| W8 | 截圖腳本的環境各寫各的：dev 埠 3000、偵錯埠 9377、`127.0.0.1` 散在 5 支腳本（`plate-clip` 5 行、`plate-shot` 5 行、`plate-fallback-shots` 4 行、`shots` 3 行、`plate-matrix.sh` 1 行）；啟動無頭 Chrome 的程式有三份（`plate-clip`、`plate-shot`、`plate-fallback-shots`） | `git grep -E "9377\|:3000\|127\.0\.0\.1"`、`git grep -l "remote-debugging-port"` | 確認 |
| W9 | `study.js` 的時間與手感係數直接寫在式子裡：`:101`（停穩 350 ms 才畫鄰盒）、`:204`（展卷 420 ms）、`:353`（滾輪 .01／.0015）、`:384`（回彈 180 ms）；471 行裡具名常數只有 1 個。寫法是一行多個敘述（9 行超過 200 字元），diff 難看、難審 | `grep -n` 取樣 | 確認（行號）；影響是推測 |
| W10 | `three-pack.js` 1,293 行裡約 1,320 個小數字面量、具名常數 34 個；`vocab.js` 369 個。這個數含 GLSL 與構圖座標，是訊號不是定罪：哪些該有名字要逐段看 | 字面量計數 | 訊號 |
| W11 | 每區的中繼資料在四張表：`src/lib/makie-scene.ts`（地標、古地名、形）、`src/studies/toji/landmarks.js`（場景題名）、`ward-art.js`（紋樣、短句）、`plate/<區>.js`（構圖）。性質不同，分開不一定錯；要先看有沒有同一個事實寫兩次（例：地標名） | `git grep -l "W_YAMASHINA" -- src` | 待評估 |

### D. 文件與對外資訊

| # | 弱點 | 證據 | 等級 |
|---|---|---|---|
| W12 | （P0 已修，§7）**HANDOFF（唯一入口）過期而且自相矛盾**：標頭寫更新 11/17，內容到 11/20；§1 有一列說工作樹 `_wt_kyoto_doha` 可以重用，另一列說已拆（`git worktree list` 只有主資料夾）；資料分支列寫「未合併 `main`、未 push」，實際已上線、分支不存在；§3 驗收表還是 792 筆、146 個測試；§4.2 要人確認在已刪的 `claude/finish-1117`；§4.1「定調預設 Opus」已被全域合約 11/18 的「Fable 預算」取代 | `docs/HANDOFF.md` 對 `git branch -a`、`git worktree list` | 確認 |
| W13 | （P0 已修，§7）三份 README 都寫 792 處（各兩處），實際 734。這是公開頁面上的事實錯誤 | `grep -n 792 README*.md` | 確認 |
| W14 | （P0 已修，§7）待辦散在五份：HANDOFF §4.6、`2026-11-16-roadmap.md`（自稱唯一待辦來源）、`2026-11-17-finish.md`、`2026-11-18-data-next.md`、`2026-11-20-next.md`。`docs/` 有 126 個 md；`2026-11-18-material-table.md` 762 行、`2026-11-16-doha.md` 565 行是邊做邊記的長文 | `ls`、`wc -l` | 確認 |
| W15 | （查過，不算弱點）ADR 0016「後果」最後一句的過渡期已結束；使用者 11/20 選「取代」：0017 取代 0013，0016 不改原文、仍採用 | 材質表提案 §8.15 | 確認，不用處理 |

### E. 門面與雜項

| # | 弱點 | 證據 | 等級 |
|---|---|---|---|
| W16 | `index.html` 沒有 `meta description`、Open Graph、favicon（`public/` 只有 `toji-study`）：貼連結沒有預覽。字體用 Google Fonts 載三個 CJK 家族（外部請求） | `cat index.html`、`ls public` | 確認 |
| W17 | `.shots/` 2.7 GB 本機暫存：`_archive_wt_kyoto_doha` 1,023 MB、`mat-table` 283 MB、`polish` 247 MB、`finish` 211 MB。`ref/`（73 MB）是參考圖，含使用者給的，不能刪 | `du -sh .shots/*` | 確認 |
| W19 | 閃爍量測用的 `probe.js` 進了產品包（`dist/assets/probe-*.js`）：`standalone.ts:17` 在 `?probe=flicker` 時動態載入，沒有 DEV 條件。是延遲載入、平常不會下載，影響小 | `ls dist/assets \| grep probe`；`standalone.ts:13–17` | 確認 |
| W18 | 依賴：補丁版落後（react 19.2.6→19.3.1、vite 6.4.2→6.4.6、three 0.186.0→0.186.1、tailwind 4.3.0→4.3.5）；大版本有 vite 8、TypeScript 7、motion 14、lucide 1.x。建置用的套件放在 `dependencies` | `npm outdated`、`package.json` | 確認 |

## 3. 積壓工作

這一節各列都是「文件說」（從 HANDOFF 與各開案書的「沒做」清單收來），除非另外註明；開工那一包時再對程式核對一次。

### 原本等使用者的（2026-11-22 已回答，見 §5）

| # | 項目 | 出處 |
|---|---|---|
| B1 | 手機實機看 11/16–20 上線的盤面、換函、第一次載入 | HANDOFF §3 |
| B2 | 看圖後才能定的八項：岩新版（輪廓仍是八點的環，逐顆寫輪廓還沒做）、屋面顏色、貼金範圍、金片粒徑、青金與金山的差距、霞要不要更明顯、漆變透的幅度、盒繩的光澤下限 | `2026-11-17-finish.md` §9、§11、§14、§15；材質表提案 §8.14；HANDOFF §4.4 |
| B3 | `makie-painting` skill 使用者還沒看過 | HANDOFF §4.4 |
| B4 | 地圖的去留（11/17 決定維持現狀，同時記了「最後可能整個拔掉」）；T4.3、MapLibre 擱著 | HANDOFF §4.6；ADR 0006 |
| B5 | 歲時記（R11）：只有 40 行的計畫，首頁入口已移除 | roadmap R11；`SEASONAL_PLAN.md` |

### 有日期

| # | 項目 | 何時 | 出處 |
|---|---|---|---|
| B6 | 複查三家店：HY-065 八咫、NK-120 村上開新堂、NK-111；仍未營業或查不到就退役 | 2026-12-01 起 | `2026-11-18-data-next.md` 第 1 項 |

### 沒被擋，可以直接做

| # | 項目 | 出處 |
|---|---|---|
| B7 | 資料未結：FS-018 伏水酒蔵小路的類型、NK-014 寺町通商店街的身分、NK-084／NK-085 是哪家分店（11/23 晚重查已結，§9.15）、延暦寺根本中堂參拜現況、HY-041 光明院、HY-024 地主神社、FS-026 宝塔寺、SK-018 真如堂與安祥寺的國寶、清水寺等國寶指定頁原文 | `2026-11-18-data-next.md` 第 2–5 項；HANDOFF §4.6 |
| B8 | 冷編譯其餘：`mNashiji` 上色組合約 1.5 秒、其他 24 支程式 | 材質表提案 §8.17 |
| B9 | 偶發測試失敗（N2）：下次出現先存完整輸出 | `2026-11-20-next.md` |
| B10 | 盤面小缺口：鳳凰不放大時頭喙偏小；細草與葦不放大看不到；夜間濃梨子地與圖案差距小；`parts.js` 的 `act()` 讓 `MAT.lamp` 部件在游標停留時發橘光；背景霞帶避開盒子的輪廓窄 2–10 px | HANDOFF §4.6 |
| B11 | 年代：沒有可拖的控制（只有網址參數）；立體部件在演示中不跟著年代變 | `2026-11-17-finish.md` §15.2 |
| B12 | 用 ThreeRT 算每區俯視遮蔽圖給地用（研究） | `2026-11-16-lighting-research.md` 實驗 2 |
| B13 | 中京預建 387 ms 的長工作（要改構圖檔才能切）、`meshRock` 約 18 ms（11/23 已隨檔案刪除）：收益小，沒排 | `agent-runs/2026-11-17-mesh-perf.md` |
| B14 | `export-glb.js` 的顏色表和 `MATERIALS.color` 不同；GPU 幀成本的前後對照沒量 | 材質表提案 §8.11、§8.13（文件說，沒核對後來有沒有做） |
| B15 | 夜間 agy 流水線的改進（R12）：擱置中 | roadmap R12 |
| B16 | 盒內左側四張色紙是素面 | `2026-11-17-finish.md` §13「沒做、主席還在意的」 |
| B17 | 著色器編譯失敗不會退回降級圖；沒有 `KHR_parallel_shader_compile` 的瀏覽器（部分舊 Safari）仍在第一幀前同步編譯 | 材質表提案 §8.16「沒做」；ADR 0010 的後果 |
| B18 | 拍圖的雜訊來源、跨一次重開機差 1–2 級的原因沒查；手機 GPU 驅動對地著色器的編譯結果沒驗過 | 材質表提案 §8.8「沒做／沒驗證」 |

本次體檢新增的：W4–W18。

## 4. 計畫

額度（`~/.claude/QUOTA.md`，2026-11-22 21:12）：Claude 週剛重設（Fable 計量 0%、時間進度約 0%：大致同步）→ 定調與前後相依的鏈 Fable 自己做，可拆且有數字驗收的派 Sonnet 子代理；Gemini Models 週剩 37.6%（偏低）→ 可拆包不派 Neon；Codex 82%（充足）。每包開工前重查。

| 包 | 內容 | 解決 | 執行者 | 驗收 | 停下來問 |
|---|---|---|---|---|---|
| P0 | （已做，§7）**文件對齊**：HANDOFF 改寫成現況（刪過期列、驗收表改成 734 與 155＋17、待辦收成一張表並指向本檔）；三份 README 的 792 改 734 | W12–W14 | 主席 | `npm run adr:check`；連結與 diff 檢查 | commit 與 push |
| P1 | **手機條件的補量**（使用者不看實機，§5）：主席用 CPU ×4 與 375 px 量第一次載入、換函、幀時間，拍十一區日夜與光移到盤外的圖，當作 P5、P6 的基準。實機本身仍然沒人看過，這一點照實寫在報告裡 | W1、B1 | 主席 | 量測表與截圖 | — |
| P2 | **靜態保護**：`tsconfig.json` 加 `include`／`exclude`；邊界檔先開 `// @ts-check` 並補 JSDoc 型別（`renderer.js`、`study.js`、`three-renderer.js`、`mat.js`、`parts.js`），其餘分批；ESLint 只開正確性規則（未定義、未使用），不管風格。寫一份 ADR 記檢查範圍 | W4、W5 | 主席定規則與第一個檔；其餘 Sonnet 子代理 | 四項檢查；`plate-parts-hash` 十一區相同；`plate-matrix.sh` 0 差異 | 要改行為才能過檢查 |
| P3 | **解耦提案**（先提案、同意才做）：(a) 區的順序與預設區只讀 `wards.ts`（不改受保護檔），腳本共用一個環境模組：埠、Chrome 啟動、區→步數由 `WARD_KEYS` 導出；(b) `study.js` 的時間與手感係數集中命名；(c) 每區四張表先評估有沒有重複的事實。每項寫：改哪裡、怎麼證明行為不變、怎麼回退。相關 ADR：0003（`wards.ts` 受保護，所以方向是別處讀它）、0008（`study.js` 只管畫布與手勢，邊界不動） | W7–W11 | 主席（提案）；實作 Sonnet 子代理 | 四項檢查；矩陣 0 差異；降級圖不變。(a) 會改到拍圖腳本本身，所以「改前」那組圖要用舊腳本先拍好 | 提案本身要使用者同意 |
| P4 | **資料**：B7 現在做；B6 在 12/1 之後做。唯讀報告先行，每筆附來源網址與查核日期；主席審完才改 | B6、B7 | Sonnet 子代理（唯讀）；主席改資料 | `validate --strict` ERROR 0／WARN 0；報告放 `docs/agent-runs/` | Tabelog 跳驗證就列未確認，不繞過 |
| P5 | **載入**：先量不改。包的拆解（一次性工具，不進依賴）、其餘 24 支程式的冷編譯、手機 CPU ×4；交數字表再決定改什麼 | W2、W3、B8 | 主席（相依鏈） | 數字表；有改著色器就矩陣 0 差異 | 要動畫面或推翻 ADR 0017／0018／0019 |
| P6 | **畫面收尾**（定調）：B2 八項由主席自己定（§5），每項寫下改或不改的理由；順手 B10、B11 | B2、B10、B11 | 主席 | 受影響的區日夜、1440 與 375、一張 2 倍特寫、一張光移到盤外；降級圖重拍 | 構圖或材質的方向改變 |
| P7 | **測試體質**：`plate.test.mjs` 依 ADR 0014 拆成行為與圍欄兩個檔（圍欄一條都不刪、不改弱）；用現有的無頭 Chrome 腳本加一條冒煙（首頁→換函→開蓋→返回，console 無錯），不加 Playwright；`npm test` 失敗時自動存輸出（N2） | W6、B9 | Sonnet 子代理 | 測試數不減、斷言不改弱 | 要改斷言強度 |
| P8 | **門面**：`meta description`、OG 圖（用現有的 `docs/images`）、favicon | W16 | 主席（小） | 建置後檢查 `dist/index.html` | 文案 |
| P9 | **清理**：`.shots` 刪舊批次，先列清單給使用者看；一定留 `ref/`、各批 `FINAL-*`、`nine/overview-*`（HANDOFF 引用）、`_archive_wt_kyoto_doha` 裡的派工紀錄。依賴只升補丁版，大版本不動。`probe.js` 加 DEV 條件或留著，開工時定 | W17–W19 | 主席 | 四項檢查；矩陣 0 差異（three 補丁版） | 刪 `.shots` 要使用者同意 |

順序（依 §5「先體質」）：P0 → P2 與 P4（B7）並行，P3 的提案同時寫 → P3 實作（同意後）→ P1 → P5 → P7 → P6 → P8、P9；B6 在 12/1 之後；歲時記在最後。P2、P3、P6 都寫 `src/studies/toji`，不同時進行。每條線同時最多兩個子代理。

有預設、不另外問的：ESLint 只管正確性；依賴大版本不升；不加 Playwright；B12、B13、B15 維持擱置。使用者可以否決。

## 5. 使用者的決定（2026-11-22，對話中回答）

| 題目 | 決定 | 對計畫的影響 |
|---|---|---|
| 下一批先做哪一類 | **先體質** | P0、P2、P3、P5 排在畫面之前 |
| 實機驗收與 B2 八項 | **「不看了，你全權決定」** | B1–B2 不再等使用者：八項由主席看桌機與 375 px 截圖自己定，做完告知結果。P1 改成主席自己補量；P6 不必等意見，但仍排在體質之後。B3（skill 沒看過）不擋任何工作 |
| 地圖 | **維持現狀、不再投資** | B4 結案：T4.3 與 MapLibre 從待辦移除；要拔掉另外開案（會取代 ADR 0006） |
| 歲時記 | **擱到體質與畫面收完** | B5 留在待辦最後，這一批不開案 |

這是對這一批的授權；合併 `main`、push、刪 `.shots`、解耦提案（P3）仍然逐次問。

## 6. 回退

每包獨立分支、獨立 commit；不滿意 revert 該 commit。P2、P3 以「矩陣 0 差異＋部件雜湊相同」當作行為不變的證明，證明不了就不合併。合併 `main` 與 push 各自分開問。

## 7. P0 結果（2026-11-22，主席，分支 `claude/docs-1122`，base `main` @ `b61314c`）

- `docs/HANDOFF.md` 改寫成現況：§1 的分支與工作樹照 `git branch -a`、`git worktree list`；§2 補上材質表、第一次載入、換函、地圖與歲時記的決定；§3 換成 11/22 的驗收數字；§4.1–§4.3 換成使用者 11/22 的四個決定與做完的批次；§4.6 的待辦改成指向本檔 §3、§4，只留各列用得到的細節。章節編號沒有變（別的文件引用 §4.4、§4.5、§4.6）。
- 三份 README 的 792 改成 734（各兩處）。
- 四份舊開案書（roadmap、finish、data-next、next）標題下加一行，指向本檔。
- 查到的新事實：`b61314c` 那次 push 的部署失敗是 GitHub 取不到 artifact，不是測試失敗；同一個 commit 重跑成功（`gh run list --workflow deploy.yml --limit 3`）。
- 檢查：兩份入口文件的相對連結 0 個失效（scratchpad 的一次性腳本）；`npm run lint` exit 0（ADR 20 份通過）。只改文件，照 `AGENTS.md` §5 沒有重跑 build。
- 沒做：commit、合併、push（等使用者）。README 的其他敘述與截圖沒有逐句核對，只改了筆數。

## 8. 長鏈：對齊一次、一次做完、合回主線一次

使用者 2026-11-22：「每次這樣來回都是耗額度，妳排長鏈計畫出來我們確認對齊後一次作完合回主線，再回主線前妳分支怎麼開都可以只要妳判斷需要就開因為作錯可退回。」

### 8.1 怎麼跑

- **對齊只做一次**：§8.5 的事項在開跑前問完，答案回填 §8.6。之後不逐包問；中途只在 §8.4 的情況找使用者。
- **分支**：整合分支 `claude/chain-1122`（自 `claude/docs-1122` @ `002e546`）。每一包在自己的分支或工作樹（`C:\Git\_wt_kyoto_<包>`）做，驗收過才進整合分支；做壞了就丟掉那個分支重來。分支上的 commit 由主席自己決定，不另外問。`main` 只在最後動一次。
- **每包做完**在 §9 記一段結果：改了什麼、驗收的指令與數字、沒做的。
- **額度**（`get_usage`，2026-11-22 22:50）：5 小時窗已用 90%（23:10 重設）；週所有模型 10%、Fable 計量 16% → Fable 週占比 8%、其他模型 2%、時間進度約 1%。Fable 超前：主席只做定調與前後相依的鏈，可拆且有數字驗收的包派 Sonnet 子代理（Gemini Models 週剩 37.6%，偏低，不派 Neon）。同時最多兩個子代理。每個階段開頭重查。
- **5 小時窗用完時**：停在整合分支上一個驗收過的 commit，在 §9 記下做到哪裡；窗重設後使用者說「繼續」就接著做，不必重新對齊。

### 8.2 階段與順序

| 階段 | 包 | 內容 | 執行者 | 過關條件 |
|---|---|---|---|---|
| A0 基準 | — | 起 dev server（記 PID）；用**現在的腳本**拍「改前」全組矩陣（`bash scripts/plate-matrix.sh`）、存十一區部件雜湊（`node scripts/plate-parts-hash.mjs`）、存一次換函量測與 `npm test` 完整輸出 | 主席（機器時間） | 基準檔齊全 |
| A1 靜態保護 | P2 | `tsconfig.json` 加 `include`／`exclude`；ESLint 只開正確性規則；`// @ts-check` 先開邊界檔（`renderer.js`、`mat.js`、`parts.js`、`view.js`、`geometry.js`、`interaction.js`、`collection.ts` 的使用端），再往 `study.js`、`three-renderer.js` 推進；隱含 any 不要求清光，目標是把 TS2339、TS2345 這類真錯清到 0。新增一份 ADR 記檢查範圍 | 主席定規則與第一個檔；其餘 Sonnet 子代理（工作樹） | 四項檢查；部件雜湊相同；矩陣 0 差異；檢查找到的真錯逐筆列出 |
| A2 區順序與腳本環境 | P3(a) | 見 §8.3(a) | 主席 | 同上；新舊腳本拍出來的每張 `ward` 相同 |
| A3 係數命名 | P3(b) | 見 §8.3(b) | 主席 | 同上；`git diff` 只有字面量換成名字；換函量測同一量級 |
| A4 測試體質 | P7 | `plate.test.mjs` 拆成行為與圍欄兩檔（圍欄不刪、不改弱）；無頭 Chrome 冒煙一條（首頁→換函→開蓋→返回，console 無錯）；`npm test` 失敗時存完整輸出 | Sonnet 子代理（工作樹） | 測試數不減；四項檢查 |
| A5 雜項 | P9 一部分 | 依賴升補丁版；`probe.js` 加 DEV 條件 | 主席 | 四項檢查；矩陣 0 差異 |
| **A 關卡** | — | 階段 A 全部進整合分支後重跑四項＋全組矩陣對 A0 | 主席 | **逐像素 0 差異**（有差的那張重拍，重現才算差異） |
| B 量測與載入 | P1、P5 | CPU ×4 與 375 px 的第一次載入、換函、幀時間；產品包拆解；其餘 24 支程式的冷編譯。先交數字表；只做「不動畫面、不推翻 ADR 0017–0019」的改法 | 主席 | 數字表；有改就矩陣 0 差異 |
| C 內容與門面 | P4（B7）、P8 | 資料未結項：唯讀報告（每筆附來源網址與查核日期）→ 主席審後改資料；`meta description`、OG 圖、favicon。和階段 A 不碰同一批檔，可以並行 | Sonnet 子代理（唯讀報告）；主席改 | `validate --strict` ERROR 0／WARN 0；報告在 `docs/agent-runs/` |
| D 畫面收尾 | P6 | B2 八項逐項定（改或不改都寫理由）、B10 小缺口、B16 色紙。每項最多兩輪調整，兩輪不滿意就記下現況、不硬磨。做完重拍降級圖 | 主席（定調） | 受影響的區：日夜、1440 與 375、2 倍特寫、光移到盤外；穿插 0；四項檢查 |
| E 收尾 | P0 的延續、P9 | HANDOFF 與本檔更新、ADR 檢查、四項檢查、合併 `main`、push、確認部署、刪工作分支與工作樹、清 `.shots`（照 §8.6 的答案） | 主席 | `gh run list` 部署成功 |

不在這條鏈裡：12 月複查三家店（B6，12/1 之後）、歲時記（B5）、B12、B13、B15。

### 8.3 解耦提案（P3）

**(a) 區的順序、預設區、拍圖腳本的環境**

- 改哪裡：
  - `src/hooks/useKyotoEngine.ts`：刪掉 `ALL_WARD_KEYS`，讀 `src/data/wards.ts` 的 `WARD_KEYS`（`wards.ts` 受保護，不改）。
  - 預設區：在 `src/studies/toji/collection.ts` 定義一次（`DEFAULT_CABINET`），`src/App.tsx` 與 `study.js` 讀它。
  - 新增 `scripts/lib/plate-env.mjs`：dev 位址、偵錯埠、Chrome 路徑與啟動、CDP 連線各只有一份；`plate-shot.mjs`、`plate-clip.mjs`、`plate-fallback-shots.mjs` 讀它。
  - 腳本裡的區順序不再自己寫一份：node 腳本不能直接匯入 `wards.ts`（試過，`import()` 失敗），所以向 dev 頁面要（頁面的順序來自 `wards.ts`）。job 仍接受舊的步數寫法，另外可以直接寫區名；`plate-matrix.sh` 的「名稱:步數」表改成只寫區名。
- 怎麼證明行為不變：A0 用舊腳本拍的全組矩陣，對改後用新腳本拍的，逐像素 0 差異、每張的 `ward` 相同；四項檢查；`plate-fallback-shots.mjs` 試拍一區確認能跑，不提交重拍的圖。
- 怎麼回退：一個 commit，revert 即可。

**(b) `study.js` 的時間與手感係數**

- 改哪裡：`src/studies/toji/study.js` 檔頭加一張具名的表（停穩多久畫鄰盒、展卷時間、滾輪倍率、回彈時間、換函滑動時間等），每個值註明它依賴誰；式子改讀表。**數值一個都不改**，也不重排程式（一行多敘述的寫法是另一件事，這次不動，diff 才看得出只換了名字）。ADR 0008 的邊界（`mountBunko` 只管畫布與手勢）不變。
- 怎麼證明行為不變：`git diff` 逐行只有字面量換成名字；既有的文箱測試；換函量測前後同一量級；矩陣 0 差異。
- 怎麼回退：一個 commit，revert 即可。

**(c) 每區的四張表**（`makie-scene.ts`、`landmarks.js`、`ward-art.js`、`plate/<區>.js`）：這條鏈只評估、寫進 §9（有沒有同一個事實寫兩次，例如地標名和 locale 的景點名）；要動再另外提案。

`three-pack.js` 的數字（W10）這條鏈不動：那是材質與構圖的調校值，要逐段看，等階段 D 碰到哪一段再就地命名。

### 8.4 中途才找使用者的情況

- 階段 A 的關卡出現重現得了的像素差異，而且找不到原因。
- 要動畫面才能縮短載入，或要推翻既有 ADR。
- 要改受保護檔案、要新增 §8.6 沒同意過的依賴。
- 同一包兩次不及格，而且原因是規則或架構（附修改提案）。
- 資料查核要退役景點以外的大動作（例如整類重分）。

其餘照預設做，結果寫進 §9。

### 8.5 開跑前要對齊的

1. 這條鏈的範圍（全部，或畫面留到下一條）。
2. 事先同意的動作：P3(a)、P3(b)、新增 ESLint（devDependency）、刪 `.shots` 舊批次。`.shots` 現在 2.7 GB；保留 `ref/`、`refs/`、`threert/`、各批 `FINAL*`、`nine/overview-*`、`_archive_wt_kyoto_doha` 裡的非圖片檔（派工紀錄、腳本、日誌）、最近一批（`switch/`、`cold/`）與這條鏈新拍的；其餘刪掉，約 2.3 GB，刪了回不來。
3. 全部驗收過之後，合併 `main` 要不要先停下來。
4. 合併之後要不要直接 push。

### 8.6 使用者的回答（2026-11-22 約 23:00）

| 題目 | 回答 |
|---|---|
| 鏈的範圍 | **全部 A–E** |
| 事先同意 | 四項都同意：P3(a) 區順序與拍圖腳本環境、P3(b) `study.js` 係數命名、新增 ESLint（開發依賴）、刪 `.shots` 舊批次。另外加了一句：「技術面fable妳定奪，我只處理抽象需求有沒有達成和關鍵決定。」 |
| 合併 `main` | **驗收過就直接合併**；任何一項驗收沒過就不合併、停下來回報 |
| push | **合併後直接 push**，確認部署成功再刪工作分支 |

主席對那句話的解讀：技術上的取捨（工具、結構、做法、要不要拆包）不再拿去問；要問的只剩產品方向、對外不可逆的動作、以及 §8.4 列的情況。

## 9. 長鏈執行紀錄

（每包做完記一段。）

### 9.1 停在這裡（2026-11-22 約 23:40，用量上限到了）

做到的：
- 整合分支 `claude/chain-1122`（自 `claude/docs-1122`）；三個工作樹：`C:\Git\_wt_kyoto_static`（`claude/static-1122`）、`_wt_kyoto_tests`（`agent/tests-1122`）、`_wt_kyoto_data`（`agent/data-1122`），`node_modules` 都是 junction（拆之前先 `cmd /c rmdir`）。
- A0：部件雜湊存在 `.shots/chain/parts-hash-before.txt`（對 repo 基準 11／11 相同）。「改前」全組矩陣在背景拍到 `.shots/chain/before/`，**停下來時還沒確認拍完**：接手先看每組的張數與 `*.log` 有沒有 WRONG。dev server 是瀏覽器面板啟動的（3000 埠，PID 11096）；9377 埠的無頭 Chrome（PID 33032）是 11/20 留下來的，不是這次啟動的。基準只在同一次開機、同一個 dev server 內有效；重開機過就從 `8a0fdb5` 重拍。
- A1 開了頭（`claude/static-1122`，一個 commit）：`tsconfig.json` 加 `include`／`exclude`（不再掃 `dist/`）；新增 `tsconfig.js.json`：用 JSDoc 檢查全部 JS，不把沒標型別的參數與 null 當錯。這個設定下有 **231 個錯誤**（`npx tsc -p tsconfig.js.json --noEmit`），當作關卡是 0。最多的幾類：`mesh` 等屬性不在型別上 55、選項不在 JSDoc 裡（例 `h`）21、陣列對元組 20、**多傳一個引數（傳 7 個、函式收 0–6 個）16**、`Frame` 少了 `years`。還沒接進 `npm run lint`、還沒修任何一個。
- 派出兩個 Sonnet 子代理（派工單在對話裡）：資料未結項的唯讀報告（要寫到 `_wt_kyoto_data` 的 `docs/agent-runs/2026-11-22-data-open-items.md`）、`plate.test.mjs` 拆成行為與圍欄（`_wt_kyoto_tests`，不 commit）。**停下來時兩個都還在跑，成果沒審過**；可能被用量上限中斷，接手先看兩個工作樹的 `git status` 與 diff。

接著做（順序照 §8.2）：審兩個子代理的成果 → A1 修 231 個錯誤（只改 JSDoc，不改執行的值；多傳引數那 16 個先逐一看是不是真錯）、裝 ESLint（等矩陣拍完再裝，免得 dev server 重載）→ A2 → A3 → A 關卡 → B → C → D → E。

### 9.2 續做（2026-11-22 23:15 起）：低風險的包改派 agy

使用者：「因為有另一個專案在高耗量，妳這邊先派比較沒風險的給agy跑」。額度（`quota` skill，23:13）：Gemini Models 5 小時剩 100%、週剩 37.6%（偏低；使用者指定用它）；Codex 週剩 52%。

- **A0 基準拍完**：`.shots/chain/before/` 十組共 106 張（base 22、coat0 11、new 11、v4／v5／v6 各 11、swapA 11、swapB 4、lightoff 11、mobile 3）。`coat0.log` 對下京夜間報了一次 WRONG；重拍那一張與基準逐像素比，0 差異（`node scripts/plate-diff.mjs .shots/chain/recheck/orig .shots/chain/recheck/coat0`），是檢查讀早了，圖是對的。
- **A4 測試拆檔（完成，已進整合分支）**：Sonnet 子代理在用量上限前已做完主體。主席核對：斷言數 512 → 512、測試 155 → 156（一段混在行為測試裡的圍欄切成獨立測試）、`npm test` 156／156 與 17／17、`npm run lint` exit 0。圍欄在 `scripts/plate-fences.test.mjs`，共用的區集合在 `scripts/lib/plate-test-helpers.mjs`。工作樹 `_wt_kyoto_tests` 已拆。冒煙測試與「失敗時存輸出」還沒做（等 A2 的腳本環境模組）。
- **資料查核（部分）**：Sonnet 子代理做了八項中的約三項半就被上限中斷，全部只到 PLAUSIBLE；報告在 `C:\Git\_wt_kyoto_data\docs\agent-runs\2026-11-22-data-open-items.md`，還沒審、沒有改任何資料。這一包要查原文、真實性第一，不派 agy；等 Claude 額度。
- **A1 型別錯誤 231 個，拆兩包派 agy**（派工單在各工作樹的 `.claude/dispatch/`，允許清單 `C:\Git\_agent_allow\kyoto-types.json`）：
  - N1（Neon medium，`_wt_kyoto_static`）：`src/studies/toji/plate/` 的 125 個。
  - H1（Hydrogen high，`_wt_kyoto_types2`，分支 `agent/types-b-1122`）：文箱外層 24 個、腳本與工具 16 個。
  - 規則：只改 JSDoc（與一個 `.d.ts`），執行的程式一個字都不動；不准 `any` 轉型或 `@ts-ignore`；只有改程式才消得掉的錯誤當「真問題」留著回報。主席驗收：重跑四個指令、部件雜湊 11／11、每個改過的檔去掉註解後與改前相同。
  - 測試檔的 66 個（`plate.test.mjs` 64）還沒派。

### 9.3 A1 型別檢查：231 → 18（2026-11-22 23:55，已進整合分支 `c3d3a3d`）

| 包 | 模型（agy log 確認） | 範圍 | 結果 | 主席的驗收 |
|---|---|---|---|---|
| H1 | `gemini-4-hydrogen-high` | 文箱外層 24、腳本與工具 16 | 清掉 38；剩 2 個找不到模組 | 十個檔去掉註解後與改前相同（esbuild 壓縮後逐字比）；沒有 `any` 轉型或 `@ts-ignore`；沒有被拒的動作 |
| N1 | `gemini-4-neon-medium` | `src/studies/toji/plate/` 125 | 清掉 105；回報 18 個真問題（另 2 個是 H1 的 `Frame.years`） | 十三個檔去掉註解後與改前相同；新增 `plate/dev-globals.d.ts` |

兩包的自述驗收（tsc、部件雜湊、`npm test`）主席都重跑過。H1 的報告把測試檔的錯誤數寫成 63（實際 66），其餘數字相符。

型別檢查找到、主席修掉的三類（`687c213`；部件雜湊十一區相同）：
- **十六處 `pine(…, {clusters: 3})`**：第七個引數從來沒人讀（`trees.js` 的 `stampedPine` 只收六個）。拿掉。這表示構圖檔裡「三簇」的意圖一直沒有生效；松現在的樣子就是沒有這個選項的樣子，階段 D 看松的時候再決定要不要做。
- **`meshRock` 的粉岩分支回傳單一零件**，其他分支回傳陣列，而每個呼叫端都用展開：改成回傳陣列。目前沒有區走這個分支（粉岩都改用 `crag-mesh.js`），所以是潛在的錯，沒有發作過。
- `creature-mesh.js` 的 `refine()` 把三個布林相加：各包一層 `Number()`。
- `src/optional-modules.d.ts`：宣告 `playwright` 與 `@threert/scene`（這個 repo 不安裝的兩個模組）。

剩下 18 個都在四個測試檔，派給 Hydrogen（H2，`_wt_kyoto_types2`，分支 `agent/types-c-1122`），還在跑。清到 0 之後把 `tsc -p tsconfig.js.json` 接進 `npm run lint`、寫 ADR 0021。ESLint 還沒裝。

### 9.4 A1 收尾、A2、ESLint（2026-11-23 00:20，整合分支 `f4cc424`）

- **型別錯誤 18 → 0**：H2（`gemini-4-hydrogen-high`）只加 JSDoc 清掉四個測試檔的 18 個；五個檔去掉註解後與改前相同，測試名稱與斷言沒動。`tsc -p tsconfig.js.json` 接進 `npm run lint`（`bc81942`）。
- **A2 區順序與拍圖腳本環境**（`gemini-4-neon-medium`，§8.3(a)）：`scripts/lib/plate-env.mjs` 是 dev 位址、兩個偵錯埠、Chrome 啟動與 CDP 連線的唯一定義；`RING`、`WARDS`、`START`、`ALL_WARD_KEYS` 都刪了，腳本向 dev 頁面要順序（`window.__kyotoCabinetIds`，只在 dev；`dist/` 裡搜不到）；job 可以直接寫區名；預設區在 `collection.ts` 的 `DEFAULT_CABINET`。主席逐行看過 diff。`plate-doha-similar.mjs` 第 77 行那張「區 ID → 檔名」的表這次沒動。
- **A2 的瀏覽器驗收**：用新腳本重拍全組矩陣（`.shots/chain/after-a2/`）對 A0 的基準。106 張裡 102 張 0 差異；4 張共 6 個像素差 1 級。逐張查：
  - `base/nakagyo-day`、`swapB/minami-day`：各重拍兩次都和基準 0 差異，是雜訊。
  - `base/fushimi-day`（2 個像素）、`v4/minami-day`（1 個像素）：重拍會重現。把主資料夾切回改前的 `8a0fdb5` 用舊腳本重拍這兩張，**和基準差的是同樣的像素**，而和新程式重拍的圖 0 差異（`node scripts/plate-diff.mjs`）。所以差異來自 A0 那一次拍攝本身（當時瀏覽器面板的分頁剛關），不是修改造成的。
  - 結論：到 `f4cc424` 為止沒有任何像素差異可歸因於程式修改。之後的比對改用 `.shots/chain/after-a2/` 當基準（同一次開機、同一個 dev server）。
- **ESLint**（`f4cc424`）：只開正確性規則，接進 `npm run lint`。全庫 20 個發現：14 個是口味或刻意的寫法（關掉那幾條規則；受保護檔案不為 lint 修改），6 個修掉：一個沒用到的 import、一個沒用到的回呼參數、dev 匯出裡三個沒用到的解構名稱、`meshMoonBowl` 沒有人傳的第四個參數、一個只在掛載時跑的 effect 加註記。ADR 0021 記下型別檢查與 ESLint 的範圍。
- **四項檢查**（主席在主資料夾跑）：`npm run lint` exit 0（ADR 21 份）；`validate --strict` ERROR 0／WARN 0；`npm test` 156／156、17／17；`npm run build` exit 0（`three-renderer` 802.79 kB、`main` 362.56 kB、`ClusterMap` 205.87 kB）；部件雜湊 11／11。
- **更正 W19**：`probe.js` 留在產品包是刻意的。`MAKIE_PLATE_HANDOFF.md` §第 312 行：閃爍量測要在實機的線上頁面加 `?probe=flicker` 跑。不加 DEV 條件。
- **不做「`npm test` 失敗時自動存輸出」**（B9）：偶發只出現過一次；在驗收指令外面包一層，等於多一個會壞的地方。再出現時用 `npm test > .shots/test.log 2>&1` 重跑即可。
- **派出、還在跑**：A3（`study.js` 係數命名，Neon medium，`_wt_kyoto_static`，分支 `agent/a3-1122`）；H3（首頁冒煙測試 `scripts/smoke.mjs`，Hydrogen high，`_wt_kyoto_types2`，分支 `agent/smoke-1122`）。派工單在各工作樹的 `.claude/dispatch/`。

### 9.5 A3、冒煙測試、A 關卡（2026-11-23 00:30，整合分支 `a637e38`）

- **A3 `study.js` 係數命名**（`gemini-4-neon-medium`，§8.3(b)）：檔頭一張 `FEEL` 表，46 個時間與手感係數各有名字與說明。主席用腳本驗：把每個 `FEEL.名稱` 代回數字、刪掉表，壓縮後與改前逐字相同；46 個名字全部有用到。
- **跨檔的兩組數字改成導出**（主席，`a637e38`）：Neon 指出拖曳門檻 8 px 與 `interaction.js` 的 `isTap` 是同一個數、光跡邊界 364 × 234 是蓋面 370 × 240 各內縮 6。現在 `interaction.js` 匯出 `TAP_SLOP_PX`、`LID_HALF_X`、`LID_HALF_Z`，`study.js` 讀它們，只留 `FEEL.trailInset`（6）。`liftEmbedded`（.88）加 `idleLiftAmp`（.12）等於 1 這一組只寫在註解裡，沒有合併（兩個是不同的概念，剛好相加為 1 是調出來的結果）。
- **冒煙測試**（`gemini-4-hydrogen-high`）：`npm run smoke`（`scripts/smoke.mjs`）走首頁 → 右方向鍵換函 → Enter 開蓋進卷 → 返回，最後檢查 console 沒有錯誤；約 5 秒。需要 dev server 與 GPU，不進 `npm test`。主席實際跑：正常時連過 6 次；反向檢查兩種都會失敗（在 `main.tsx` 加一行 `console.error` → 失敗在 `console`；把返回鈕的 class 改掉 → 失敗在 `open`），還原後恢復通過。
- **A 關卡**：全組矩陣 `.shots/chain/after-a/` 對 `after-a2`。103 張 0 差異；3 張共 4 個像素差 1 級，都落在之前看過的同一批位置（南區 (448,261)、中京 (755–757, 387–392)）。重拍兩次：`base/minami-night` 與 `after-a2` 0 差異；`base/nakagyo-day`、`swapB/minami-day` 與最初的基準 `before` 0 差異。也就是每一張都和某一次改前的拍攝逐像素相同。**這幾個像素會在兩個相差 1 級的值之間跳，和程式修改無關**；之前文件記的「同一份程式拍兩次 0 差異」在這幾個像素上不成立。之後比對遇到這些位置，照「重拍、重現才算」處理。
- 四項檢查（`a637e38`）：`npm run lint` exit 0；`validate --strict` ERROR 0／WARN 0；`npm test` 156／156、17／17；`npm run build` exit 0（`main` 362.56 kB、`three-renderer` 802.79 kB）；部件雜湊 11／11。

**階段 A 到這裡完成**（A0–A5 裡只剩依賴升級在驗，見 §9.6）。

### 9.6 依賴升級（進行中）

- `npm update` 全部升到相容範圍內的最新版之後，`main` 包從 362.56 kB 變成 393.41 kB（+31 kB），來源是 react 19.2.6 → 19.3.1 或 motion 12.38.0 → 12.43.0。沒有換來任何需要的東西，**不升這兩個**。
- 只升建置工具與 three 的補丁版：three 0.186.0 → 0.186.1、vite 6.4.2 → 6.4.6、tailwindcss 4.3.0 → 4.3.5、tsx 4.22.1 → 4.23.15、`@types/*`。升完 `main` 仍是 362.56 kB。
- 途中 `npm ci` 以 EBUSY 中斷：`node_modules/.cache/chrome-profile` 被常駐的無頭 Chrome（9377 埠）鎖住。之後的 `npm update` 把缺的套件補回來；主席在工作樹另做一次乾淨安裝，逐檔比對主資料夾的 `node_modules`：14,291 個檔一個不缺（多 3 個 npm 改名留下的暫存原生模組，無害）。**在這個 repo 不要在拍圖用的 Chrome 開著時跑 `npm ci`**；要乾淨安裝就先關掉自己啟動的那個 Chrome，或在工作樹裝。
- dev server 重啟後，全組矩陣 `.shots/chain/after-deps/` 對 `after-a`：106 張裡 105 張 0 差異；剩下一張是 `base/minami-night` 的 (448,261)，和 `after-a2` 那一次的同一張 0 差異（已知會跳的像素）。四項檢查與冒煙測試在最終的依賴狀態重跑都過。鎖檔已提交（`f63e37f`）。
- 用完的工作樹（`_wt_kyoto_static`、`_wt_kyoto_types2`）與分支已清掉；剩 `_wt_kyoto_data`（未審的資料報告）與 `claude/docs-1122`（整合分支的祖先，合併後再刪）。

### 9.7 階段 A 的總帳與接下來

| 項目 | 誰做的 | 結果 |
|---|---|---|
| 測試拆成行為與圍欄 | Sonnet 子代理（上限前做完主體） | 斷言 512 → 512，測試 155 → 156 |
| JavaScript 型別檢查 231 → 0 | agy：Neon medium 一包、Hydrogen high 兩包；主席修三類真問題 | 接進 `npm run lint`；ADR 0021 |
| ESLint（只管正確性） | 主席 | 20 個發現，修 6 個、關掉 14 個口味規則 |
| 區順序與拍圖腳本環境（提案 a） | agy Neon medium | 矩陣沒有可歸因的差異 |
| `study.js` 係數命名（提案 b） | agy Neon medium；跨檔兩組由主席改成導出 | 46 個名字，代回數字後與改前逐字相同 |
| 冒煙測試 | agy Hydrogen high | 正常通過；兩種反向檢查都會失敗 |
| 依賴補丁版 | 主席 | react、motion 不升（主包 +31 kB） |

agy 共六包，沒有一包被拒或需要重派；每包主席都重跑驗收並用腳本證明「只改註解」或「只換名字」。

還沒做：階段 B（量測與載入）、C（資料未結項與門面）、D（畫面收尾）、E（合併、push、確認部署、刪 `.shots` 舊批次）。這幾個階段是定調、前後相依的量測、或要查原文的資料，不適合派 agy，要用 Claude 額度。

### 9.8 停工，留兩包給 agy 跑（2026-11-23 00:33）

使用者：「agy也有Claude 可用妳看著派，池很小但也可以作一點簡單的。今天這邊5小時用量要留給relay-diorama那邊處理美術重構，妳先停或是派Agy妳判斷」。

主席的判斷：這個工作階段的脈絡已經很長，每多一輪都要重讀一次，光是驗收 agy 的回報就會吃 5 小時窗。所以只派兩包**不需要馬上驗收**的，用脫離工作階段的方式啟動（跑完不會喚醒主席），然後停工。成果留在工作樹，下次開工再驗。

| 包 | 模型（agy log 確認） | 工作樹／分支 | 內容 | 成果在哪 | Windows PID |
|---|---|---|---|---|---|
| H4 | `gemini-4-hydrogen-high`，可寫 | `C:\Git\_wt_kyoto_libtests`／`agent/libtests-1123` | 替 `src/lib/` 三個沒有測試的模組（`map-clusters.ts`、`numerals.ts`、`makie-icons.ts`）補行為測試；只准新增三個測試檔 | 工作樹的未提交 diff；報告在 `.claude/dispatch/libtests.out.json` | 21956 |
| R1 | `gemini-4-argon-medium`，只讀（`--mode plan`） | `C:\Git\_wt_kyoto_audit`／`agent/audit-1123` | 兩份核對：README 三個語言版的敘述逐句對程式；每區的事實（地標名等）有沒有在兩處各寫一份（W11） | `.claude/dispatch/audit.out.json` 的 `response` | 33328 |

派工單在各工作樹的 `.claude/dispatch/`。兩包都設了逾時（35 分、30 分）。

**沒派 agy 的 Claude 池**：agy 裡的 Claude 在無頭模式讀檔走終端機，第一步就會被拒（`agy-call` skill 的實測），只能做「所有脈絡都貼在提示詞裡、不用讀檔」的工作；這條鏈剩下的事沒有這種形狀的。池留著。

**下次開工先做**（建議開新的工作階段，讀 `AGENTS.md`、`HANDOFF.md`、本節）：
1. 驗 H4：解析 `libtests.out.json` 開頭是 `{` 的那一行（看 `denied_actions` 與報告）；`git -C C:\Git\_wt_kyoto_libtests status` 應只有三個新測試檔；讀測試確認預期值不是照抄輸出、斷言沒有放水；主資料夾 `git cherry-pick` 後跑 `npm run lint`、`npm test`。它回報「現在行為有錯」的地方由主席判斷。
2. 讀 R1 的兩份報告：README 不符的地方直接改 README；W11 若有真的重複，照 §8.3(c) 另寫提案。Argon 的結論逐條回到檔案:行號核對再採用。
3. 兩個工作樹用完就拆（`_wt_kyoto_libtests` 的 `node_modules` 是 junction，先 `cmd /c rmdir`；`_wt_kyoto_audit` 沒有 `node_modules`）。
4. 接著做階段 B–E（§8.2）。資料查核的半份報告仍在 `C:\Git\_wt_kyoto_data`。

dev server（3000 埠）是這個工作階段的瀏覽器面板啟動的，工作階段結束會跟著停；9377 埠的無頭 Chrome 是 11/20 留下的，沒有動它。跨了重開機之後，`.shots/chain/` 的基準要重拍才能再用來比對。

### 9.9 接手（2026-11-23 晚，Opus 5.5 當主席：本週 Fable 用完）

額度（`get_usage`，21:20）：5 小時窗已用 13%；週所有模型 55%、Fable 計量 100% → Fable 週占比 50%、其他模型 5%、時間進度約 14%。Fable 沒了，其他模型還有約 45 點空間：主席（Opus）自己做定調與相依的鏈；可拆的資料查核派 Sonnet 子代理。agy 的 Gemini Models 週剩 18.9%（偏低），不派。

**H4（lib 測試）收下**（`c9e33bc`）：三個測試檔，預期值是手寫的規格（例 `1010 → 一千零一十`、`0..9999` 兩兩相異），不是照抄輸出；`libtests.log` 裡沒有被拒的動作。`npm run lint` exit 0；`npm test` 156／156、27／27（原本 17）。它回報的「現在行為有錯」五項都到不了：`toChineseNumerals` 只被 `ClusterMap` 拿來寫叢集筆數（正整數，最多 734），`typeMotifs[…]` 的兩個呼叫端都有 `?? 'all'`。不改程式。

**R1（README 與每區事實的稽核，Argon）**：結論逐條回到檔案核對過。
- README 引用的 8 張圖都存在，但全是 **11/13 的舊管線截圖**（`docs/images/*` 的修改日期；畫面寫 809 處、舊的短句）。重拍排在階段 D 之後，和 OG 圖一起拍（現在拍，D 一改又要重拍）。
- 英文 README 的「交接」「代理合約」沒標 `(in Chinese)`：已補（`ab6b554`）。
- `docs/DEVELOPMENT.md` 抄了一份各區關鍵字，其中下京、南、山科三區和 `wards.ts` 的 `WARD_DESCS` 失步：改成指向 `WARD_DESCS`，不再抄（`ab6b554`）。
- Argon 說的「JA README 的七類名稱和 `types.ts` 不同」：README 是給讀者的說明，不是介面原文，維持。

**提案 (c) 的評估**（§8.3(c)；只記、不動）：
- `MAKIE_LANDMARKS`（`src/lib/makie-scene.ts`）的 `title` 與 `shape` **沒有任何讀者**：暫時把兩個欄位從型別與資料拿掉，`tsc --noEmit` 與 `tsc -p tsconfig.js.json` 都 0 錯，之後還原。`title` 又和 locale 的景點名重複，五區已經寫得不一樣（例：`二条城`／locale `二條城`、`伏見稻荷`／`伏見稻荷大社`）。提案：刪掉這兩個欄位（改哪裡：`makie-scene.ts` 一檔；證明：兩種型別檢查與 `npm test`；回退：revert）。要顯示地標名時讀 locale。
- `WARD_DESCS`（受保護的 `wards.ts`）目前沒有畫面讀它，只由 `data/index.ts` 匯出。受保護檔不動，記著。
- 四張以區為鍵的表（`makie-scene.ts`、`landmarks.js`、`ward-art.js`、`plate/<區>.js`）：Argon 歸為重複，主席核對後判斷**不是同一個事實**：古地名、蓋面構圖題名、背景短句、構圖各是各的，只是鍵相同。不合併。
- `ward-art.js` 的 `wardSeed` 用 `Object.keys(WARD_ART).indexOf(id)` 當亂數種子：鍵的順序一變，背景紋樣就變。這是隱性依賴，記在這裡；要改成讀 `WARD_KEYS` 時，先證明兩個順序相同（背景不在蓋面矩陣裡，要另外拍）。

**新基準**（`ab6b554`，這次開機、這個 dev server）：`.shots/chain/base-1123/` 十組 106 張。對重開機前的 `after-deps`：103 張 0 差異；3 張共 5 個像素差 1 級：`new/minami-day` (448,261) 是已知位置；`coat0/shimogyo-night` (634,360) 與 `v4/nishikyo-day` (488–681, 219–264) 是新的。這兩張重拍後和 `after-deps` 逐像素相同（`.shots/chain/recheck-1123/`），所以是新基準那一輪自己跳了。已知會跳的像素多這兩處。base 組的 3 個 WRONG 是拍圖檢查讀早了，那幾張圖本身 0 差異。拍圖用的 Chrome 快取被 `npm ci` 清過，這一輪每區第一次都冷編譯，約 35 分鐘。

**資料 B7**（`817dfc2`；報告 [`agent-runs/2026-11-23-data-open-items.md`](../agent-runs/2026-11-23-data-open-items.md)）：Sonnet 子代理開原文查，主席用 Chrome 補查 Tabelog（子代理那邊 403）。改了五筆：
- NK-084 改成「晦庵 河道屋」：原本名稱與描述混了兩家；這家 2025-10-19 搬到姉小路通麩屋町，照常營業。
- NK-085 改成「豚しゃぶ英 京都離れ店」：拿掉沒有來源的阿波豚。四条烏丸店在下京區，不是這筆。
- SK-038 補上根本中堂停止內部參拜（2026-01 至 2028-01 左右）。
- FS-018 不寫蔵數（來源 17 對 18）。
- NK-014 改成寺町会原文能支持的描述。

NK-014、NK-084 的 `areaId` 從二条城・堀川改成烏丸・河原町。其餘六項不改，理由在報告。`validate --strict` ERROR 0／WARN 0。B6（三家店）照舊 12/1 之後。

### 9.10 階段 B：量測（2026-11-23，主席）

**工具**：新增 `scripts/perf-home.mjs`。它自己開一個無頭 Chrome（`PERF_DEBUG_PORT` 9379，加在 `plate-env.mjs`），用全新的 profile，所以第 1 次載入一定是冷快取；結束時只關自己那個 Chrome。量的是：第一次載入（降級圖出現、實景可畫）、長任務、閒置幀、換一次函，`--compile` 另外逐支量冷編譯。參數 `--cpu 4` 只壓 CPU，GPU 照桌機（RTX 4070、ANGLE D3D11），所以**不是手機**；實機仍沒人量過。原始輸出在 `.shots/chain/perf/`（不提交）。

**正式建置**（`vite build` 加 `vite preview`；dev server 沒打包，JS 載入時間會被高估），每格三次載入：

| 條件 | 冷快取：實景（ms） | 溫快取：實景（ms） | 溫：最長任務（ms） | 換函：最長卡頓（ms）／超過 50 ms 的幀 |
|---|---|---|---|---|
| CPU ×1，1440×900 | 11,284 | 738、735 | 343、353 | 38–104／0–2 |
| CPU ×4，1440×900 | 10,785 | 2,525、2,685 | 1,332、1,485 | 163–213／8–9 |
| CPU ×4，375×812（手機模擬） | 10,579 | 2,249、2,167 | 1,242、1,219 | 163–175／8 |

dev server 的數字（同腳本，四種條件，含 CPU ×1 的 375 px）溫快取比正式建置慢 0.2–0.5 秒，冷快取同一量級（8.6–10.7 秒）。閒置時幀間隔中位數 4.2 ms（無頭 Chrome 不鎖 60 Hz）；CPU ×4 時 p95 8–12 ms。冷載入時 console 有一筆 three.js 印出的 D3D 編譯器 warning（X4122，精度提示），快取命中後沒有。CPU ×4 的溫快取有一次 9.2 秒的異常，重跑兩次（3.0、3.1 秒）沒有重現。

**冷編譯逐支**（dev，`--compile`，每支都加一個新名字、有用到的 uniform，快取一定落空）：25 支程式合計 11.2 秒。地 6.2 秒、第二支 1.1 秒，其餘 23 支 0.004–0.44 秒。有 1 支（非 physical 的 ShaderMaterial）插入探針後連結失敗，沒量到；它的原始碼 29 k 字元，比 physical 的小很多。這次比 §8.17 的地 5.0–5.2 秒慢，所以在頁面與預建都安靜之後（實景出現後再等 15 秒）只量地那一支：HEAD 5,975、5,758、5,953 與 6,051、6,511、6,291 ms；同時用 `main`（`b61314c`，自己的工作樹，`npm ci` 裝它自己的依賴、three 0.186.0）量 6,323、5,933、5,914 ms。兩邊的地著色器原始碼都是 126,751 字元。**這條鏈沒有讓編譯變慢**；比 11/20 慢的約 15% 是這台機器當天的狀態。量法的坑：`LINK_STATUS` 要先查再停錶，否則量到的是送出時間（1 ms）。

**產品包**（`--sourcemap` 建置，用一次性腳本依 sourcemap 把壓縮後的位元組歸到來源；腳本在 scratchpad，不提交）：
- `three-renderer` 784 KiB：three 本身 521 KiB（66%）、`three-pack.js` 68、`three-renderer.js` 35，其餘都是構圖與網格。
- `main` 352 KiB：react-dom 177（50%）、motion（`motion-dom`＋`framer-motion`）130（37%）。
- `ClusterMap` 201 KiB：leaflet 146、區界 GeoJSON 37。
- `theme` 112 KiB：`study.js` 17、`backdrop.js` 12、734 筆景點資料約 60。

**判斷：這個階段不改程式。**
- 冷快取約 10–11 秒，幾乎全是 GPU 編譯，CPU 慢四倍也只多 0.5 秒。主要是地著色器，再砍要動上色的結構，會碰到 ADR 0017、0019。第一次載入期間顯示降級圖（ADR 0018），使用者看得到東西。
- 溫快取在 CPU ×4 要 2.2–2.7 秒，其中一個 1.2–1.5 秒的長任務是第一塊盤的建盤與烘焙。`setWard` 現在把產生器一次跑完；要拆就得讓 `setWard` 非同步（`renderer.js`、`study.js` 的介面都要改），降級圖則要多掛一段時間。
- 換函後 3 秒內在 CPU ×4 有 8–9 個 160–210 ms 的長任務：鄰區預建已經是「一個 idle 回呼一步、延遲 900 ms 才開始」，長的是單一步驟本身（整層畫布繪製與讀回）。要再切，得把烘焙搬進 Worker（OffscreenCanvas）。
- motion 佔主包 37%，可以改用 `LazyMotion`＋`m` 省一部分，但要逐個元件驗動畫，gzip 估計只省約 20–25 kB；和 230 kB 的 three 包、10 秒的冷編譯相比，不是瓶頸。不做。
- 後兩項（`setWard` 非同步、烘焙進 Worker）是架構改動，記成提案，這條鏈不做：要等有手機的實測數字，才知道值不值得。

### 9.11 階段 D：八項的決定（2026-11-23，主席 Opus；使用者 11/22「你全權決定」）

修前圖：`.shots/chain/d-before/`（十一區日夜、1440×900、`PLATE_TONE=1`，拍法同 11/17；總覽 `sheet-day.png`、`sheet-night.png`）；放大 `crop-*.png`。

**先更正一個量法**：矩陣的 base 組用 still 模式（固定時鐘、部件沒有游標的光），這樣量 9／11 區的圖案層比濃梨子地暗（例：右京日 37／58／52）。照 11/17 的拍法（一般模式）量右京是 37／58／66、夜 29／47／55，和 §15 的 38／57／65 一致。**三層順序沒有問題**，still 模式的分層數字不能拿來判斷調子。

| 項目 | 決定 | 理由 |
|---|---|---|
| 岩新版 | **改**：九區的 17 顆舊圓岩（`rock()` → `meshRock`）換成伏見、中京在用的尖岩簇（`meshCrag`，各區一張 `ROCKS`，每簇寫 `on`、`why`） | 使用者 11/16 指定「以尖的岩簇那一版」（doha §18.1），但只做了伏見、中京兩區當樣板。其餘九區還是 §16–§17 已作廢那條路的圓岩：南區路邊三顆像土堆，違反 R3（立面的畫）。換成已經定調的樣式，不另外造新形。逐顆重寫輪廓（§18 第 1–3 點，會站起來的薄側影）是重畫構圖的量級，這次不做 |
| 屋面顏色 | 不改 | 各區屋面都是淡金的蒔粉，貼金只在小處（R16）；日夜都比地亮，三層順序對 |
| 貼金範圍 | 不改 | 同上；11/17 以來沒有新的反例 |
| 金片粒徑 | 不改 | 使用者 11/16 說的「初音的金粉更大、更濃、色更多」已在 ground-tone 處理；現在不放大就看得到片，放大兩倍沒有格子 |
| 青金與金山的差距 | 不改 | 11/17 §13 已把金山調暖、青金調冷；照 techniques §4.2，青金和金的差別本來就該在色相，不在亮度。再拉開會讓青金比稜線亮，違反同一條 |
| 霞 | 不改 | §13 霞心收成較亮的平金之後，日夜總覽裡每區的霞都讀得出是一帶；再強會蓋過建築 |
| 漆變透的幅度 | 不改 | 預設 `uAge` .85 約 285 年（江戶中期，R5）；初音的年紀約 .92，幅度差在常數，不是方向。使用者沒有說不夠 |
| 盒繩的光澤下限 | 不改 | 繩是絲，不是漆：不提清漆的光澤下限（`shine: false`）是對的。`coat: 'top'` 在原則上可議，但繩在盒面只露出一小段，看不出差別 |

順帶結案的積壓：
- **B16 色紙**：11/17 §14 已改成料紙（切箔、砂子、雲帶），這列是過期的。
- **B10 夜間差距**：上面的一般模式量測，夜間三層順序對，結案。
- B10 其餘（鳳凰頭小、細草與葦不放大看不到、`MAT.lamp` 的橘光、霞帶避盒的 2–10 px）與 B11（年代的拖動控制）：這條鏈不做，留在積壓。

**岩的執行**：Sonnet 子代理在主資料夾做（只准改九個構圖檔；`crag-mesh.js`、測試都不准動），主席這段期間不改 `src/`、不拍圖。結果與主席的審查記在下一節。

### 9.12 岩換成尖岩簇（2026-11-23，Sonnet 子代理實作，主席審查）

- 九區（南 3、北 2、東山 2、右京 2、上京 2、下京 2、山科 2、西京 1、左京 1，共 17 簇）的 `rock()` 換成各區一張 `ROCKS`（格式同伏見），用 `meshCrag` 畫；每簇逐一手寫 `ridge`，並寫 `on`、`why`。`crag-mesh.js`、`rock-mesh.js` 沒動。位置沿用舊岩，只有西京的 east-stone 從 x 312 移到 326（原位壓到石燈籠，`plate.test.mjs` 的間距測試擋下）。
- 主席看了 17 張放大三倍的圖（`.shots/chain/rocks/z1/`，拼成 `z1-sheet-a/b/c.png` 逐張看過），覺得可以收：都是直立的岩簇，和伏見同一個語彙，腳都接地。右京與左京各有一簇在池裡，這是池庭的石組，合理。子代理自己說不滿意的兩點，主席同意但這次不改：簇偏小（主峰 19–22），17 簇之間有一家人的相似感。
- **測試**（主席改，子代理沒碰）：
  - 範圍圍欄 `rockTotals`（`plate-fences.test.mjs`）：七區原本釘死 0（舊岩不叫 `rock-*`，量不到），改成現在的簇數。
  - 行為測試 T4a 兩條原本從各區取樣 `rock()` 的岩；現在沒有一區用 `rock()`，改成把那 17 組舊參數照抄成 `FORMER_WARD_ROCKS` 直接呼叫 `rock()`。輸入與斷言都沒變，第一條的「至少 17 顆」改成「剛好 17 顆」。
- 檢查：`npm test` 156／156、27／27；`npm run lint` exit 0；`plate-clip` findings 0；`npm run smoke` 通過；部件雜湊：九區 CHANGED，伏見與中京相同。降級圖：九區日夜 18 張重拍（伏見、中京還原），拼成一張核對過每張的區與日夜。
- 沒做：§18 的第 1–3 點（逐顆照參考圖畫輪廓、會站起來的薄側影）。`rock()`／`meshRock` 現在只剩測試在用；要不要刪，等下一次動岩時再定。

### 9.13 README 截圖與 OG 圖（2026-11-23，主席）

- README 引用的八張圖（`docs/images/*.webp`）全部重拍：原本是 11/13 舊管線的畫面，寫著 809 筆和舊短句。新圖用一次性腳本走首頁拍，腳本在 scratchpad，不提交：dev server、共用的無頭 Chrome、1440×900，手機 390×844 ×2。取景沿用舊圖：左京夜（中、日介面各一）、北日、左京開蓋（按 Enter 後 350 ms，蓋正掀起，看得到盒內的料紙與卷）、左京卷的列表與地圖、手機的首頁與卷。拼成一張逐張核對過（`.shots/chain/readme/sheet.png`）。README 的替代文字仍然符合，沒改。
- OG：`public/og.jpg`（1200×630，從左京夜那張裁的），`index.html` 加 `og:type`、`og:title`、`og:url`、`og:image`（GitHub Pages 的絕對網址）與 `twitter:card`。`og:description` 不另寫，預覽會讀 `meta description`，同一段字只寫一處。
- 建置後 `dist/index.html` 的 icon 是 `./favicon.svg`，`og.jpg` 也在 `dist/` 裡。線上的連結預覽要等部署後才看得到。

### 9.14 階段 E：Fable 終審與修正（2026-11-23）

**終審**：Fable 5.2，經 Console API 點數（`api-call` skill，single 模式），$2.82。附件：`AGENTS.md`、本檔、ADR 0021，以及 `git diff main...claude/chain-1122`（不含 docs、鎖檔與圖檔）。派工單與回覆在 `.claude/dispatch/final-review.*`（不提交）。結論「可以合併」，沒有擋合併的項目；列了 6 條應修、8 條小事、10 個要主席自己查的問題。

**修了的**
- NK-084：拿掉「（預約制）」。Tabelog 的「お席のご予約は承っておりません。「芳香炉」のご予約のみ」是說只有芳香炉可以預約，不是必須預約，之前讀錯了。「附近的」也一起拿掉（條目裡沒有舊址可以當參照）。NK-085 的「三種の付けダレ」是離れ店那頁的原文（「オリジナルスープと3種の付けダレ」），保留。
- 冒煙測試：畫面落到降級圖（`static`）時算失敗；要測降級圖就加 `--allow-static`。
- 岩的相似度：九區原本被豁免，理由是「rocks not yet redone」，這次岩已經重做，豁免拿掉。`plate-doha-similar` 九區每一對的距離 0.12–0.21，都在門檻（0.06–0.113）以上。
- 新測試：十一區所有 `rock-*` 部件都是 `KIND.rock`，網格通過 `assertValidMeshChunks`。T4a 的註解改成實際涵蓋的範圍。
- 耦合：`ROCKS.flatMap(… meshCrag(\`rock-${id}\` …))` 原本在十一個構圖檔各寫一份（九份是這次新加的），收成 `crag-mesh.js` 的 `crags(rocks)`，`rock-` 前綴只寫在那裡。部件雜湊 11／11 相同。
- `perf-home.mjs`：9379 埠已經有 Chrome 時直接報錯結束，不然會連到舊的 Chrome，把溫快取量成冷快取。
- 部件雜湊基準（`docs/plans/material-table/parts-hash-baseline.json`）更新成九區的新值。

**主席自己查的**
- CI：`deploy.yml` 用 Node 24，ESLint 10 可以跑。新的 `npm run lint`（含 JS 型別檢查與 ESLint）還沒在 Linux 上跑過，第一次就是合併後的那次部署；失敗只會讓部署停下，線上維持舊版。
- 區的順序：`wards.ts` 的 `WARD_KEYS` 和被刪掉的 `ALL_WARD_KEYS` 逐字相同。
- CSS：`main` 用自己的依賴（工作樹裡 `npm ci`）建置，和本分支逐檔比：`ClusterMap`、`theme`、`toji` 三個 CSS 相同；`main` 的 CSS 差在 tailwind 4.3.5 換了預設的 sans 字體堆疊，並多了一個 `.collapse` 工具類。站上沒有元素用 `collapse` 這個 class，`.kyoto-app` 自己設了 serif 字體，所以畫面不受影響。
- 換岩之後重量（dev，CPU ×1）：冷快取 9,159 ms、溫快取 812／797 ms，換岩前是 9,611 與 1,086／923，同一量級。
- 375 px（南、北夜、東山）與光移到盤外（南、右京、下京夜）各拍了一張（`.shots/chain/d-after/`）：岩在手機上小但讀得出，不搶戲；光移開時地仍是最深的一層。
- `LID_HALF_X`／`LID_HALF_Z`（370、240）和 `PLATE`（360、230）不是同一個量（蓋與盤面），不算重複。

**留到積壓（這次不做）**
- 拍圖腳本裡「向頁面要區的順序、算步數」寫了三份（`plate-shot.mjs`、`plate-fallback-shots.mjs`、`smoke.mjs`），步數規則還有兩種。這是階段 A2 留下的，應收進 `plate-env.mjs`。
- `study.js` 的 `FEEL`：三組只寫在註解裡的關係（`settleMs`、`demoDurationSec`、`liftEmbedded + idleLiftAmp = 1`），以及表外還沒命名的兩個裸數字 `.985` 與 `700`。
- `connectCdp` 的 `logs` 沒有區分 error 與 warning；`plate-env.mjs` 的 Chrome 路徑寫死 Windows（應先讀 `CHROME_PATH`）；檔頭註解寫「兩個埠」，實際有三個。
- `useKyotoEngine.ts` 的 `WARD_KEYS as WardKey[]` 是型別轉型。
- `rock()`／`meshRock` 已經沒有任何區在用，只剩測試；提案 (c) 的 `MAKIE_LANDMARKS.title`／`shape` 也沒有讀者。兩者都等使用者同意再刪。→ 使用者同意，11/23 晚刪了（§9.15）。
- 資料：SK-038 的停止參拜到 2028-01 為止，2028 年要回頭改；NK-014 名稱仍是泛稱，導航可能落在寺町京極那一段。
- 載入：`setWard` 改成非同步、烘焙搬進 Worker（§9.10）。岩：簇偏小、17 簇有一家人的相似感（§9.12）。

### 9.15 收尾：NK-084／NK-085 重查、刪沒人用的程式（2026-11-23 晚）

使用者的決定（對話原話）：NK-084、NK-085「重新查一輪不符合規範就拿掉」；`rock()`／`meshRock` 與 `MAKIE_LANDMARKS.title`／`shape`「刪掉」。分支 `claude/cleanup-1123`，base `6ef5f01`。

**資料**：主代理用使用者的 Chrome 重開兩頁 Tabelog，這次兩頁都直接顯示（只有語言選擇框，沒有安全驗證），主代理只做了開頁與讀文字（同一個 Chrome 當天稍早通過過一次自動驗證，這次沒跳可能跟那次有關）。兩頁都沒有閉店標示，名稱、住所、區與現有資料相符，兩筆保留、資料不改。細節與原文在 [`agent-runs/2026-11-23-data-open-items.md`](../agent-runs/2026-11-23-data-open-items.md) 末節。兩筆都不在 `map-centers.ts` 的 `SPOT_POSITIONS`（地圖上走群集點、導航用日文店名），沒有搬家前的舊座標。

**刪掉的程式**
- `src/studies/toji/plate/rock-mesh.js` 整檔（只匯出 `meshRock`）與 `vocab.js` 的 `rock()`。
- `mat.js` 的 `ROCK_LOOK`、`ROCK_DEFAULT`、`rockLook`：讀者只有 `rock-mesh.js`。
- `makie-scene.ts` 的 `MakieLandmark.title`／`shape` 與十一列的值；`oldName` 有讀者（`study.js` 盒面的古地名），保留。
- 測試：`plate.test.mjs` 的 `FORMER_WARD_ROCKS`、`formerRocks` 和三個只測 `rock()`／`meshRock` 的測試（T4a 網格、T4a 切金離面距離、自訂輪廓的岩），以及只有後者用的 `pointTriDist3D`、`segIntersectXZ`；`plate-fences.test.mjs` 的材質表圍欄拿掉 `rock-mesh.js` 那半，留 doha 那半。十一區的岩是 crag 的測試（`every ward draws its rocks as crags…`）保留。
- 註解：`mat.js`、`three-renderer.js`、`creature-mesh.js`、`crag-mesh.js` 裡指向 `rock-mesh.js` 的改掉。
- ADR 0013 的「證據」列了 `rock-mesh.js`，`adr:check` 會擋不存在的路徑：改成「2026-11-23 刪除，最後的版本在 commit `6ef5f01`」。0013 已被 0017 取代，決定本文不動。0017（採用）的決定寫「`DOHA_TONE`、`ROCK_LOOK` 是以別的鍵查的表，也在 `mat.js`」，現在 `ROCK_LOOK` 不在了：決定（以別的鍵查的表也放 `mat.js`）沒被推翻，只是舉的例子少了一個，所以不新開 ADR、也不改原文，記在這裡；使用者要的話再新開一份。0021 只在背景提到 `meshRock`，不動。

**沒動的**（著色器與材質列）：`mat.js` 的 `rock` 欄、`MAT.muraSilver`、`three-renderer.js` 的 `isRock` 分支、`three-pack.js` 的 `K_ROCK_*`。石垣（`vocab.js` 的牆，`MAT.mura`＋`KIND.rock`）還走這條路，動了會改到著色器，要逐像素證明，不在這次範圍。

**檢查**：`npm run lint` exit 0（ADR 21 份）；`validate_data.js --strict` ERROR 0／WARN 0，734 筆；`npm test` 154／154＋27／27（原本 157，少的 3 個是上面刪的）；`npm run build` exit 0，`three-renderer` 808.47 kB（gzip 230.68；原本 809.24／230.76）；`plate-parts-hash --check` 11／11 相同；`npm run smoke` 通過（three、console 0 錯）。部件一個位元都沒變，所以沒有拍圖。

**留到積壓**：`MAT.muraSilver`（銀岩的身）現在沒有任何部件用（`grep -rn muraSilver src` 只剩 `mat.js` 的定義與 `three-renderer.js` 的註解），還有 `plate.test.mjs` 的 `MATERIALS[MAT.muraSilver].rock` 測試。拿掉它會動到材質編號與著色器的 `isSilverRock` 分支，要的話另外提案、逐像素證明。
