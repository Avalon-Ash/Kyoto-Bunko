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
| B7 | 資料未結：FS-018 伏水酒蔵小路的類型、NK-014 寺町通商店街的身分、NK-084／NK-085 是哪家分店、延暦寺根本中堂參拜現況、HY-041 光明院、HY-024 地主神社、FS-026 宝塔寺、SK-018 真如堂與安祥寺的國寶、清水寺等國寶指定頁原文 | `2026-11-18-data-next.md` 第 2–5 項；HANDOFF §4.6 |
| B8 | 冷編譯其餘：`mNashiji` 上色組合約 1.5 秒、其他 24 支程式 | 材質表提案 §8.17 |
| B9 | 偶發測試失敗（N2）：下次出現先存完整輸出 | `2026-11-20-next.md` |
| B10 | 盤面小缺口：鳳凰不放大時頭喙偏小；細草與葦不放大看不到；夜間濃梨子地與圖案差距小；`parts.js` 的 `act()` 讓 `MAT.lamp` 部件在游標停留時發橘光；背景霞帶避開盒子的輪廓窄 2–10 px | HANDOFF §4.6 |
| B11 | 年代：沒有可拖的控制（只有網址參數）；立體部件在演示中不跟著年代變 | `2026-11-17-finish.md` §15.2 |
| B12 | 用 ThreeRT 算每區俯視遮蔽圖給地用（研究） | `2026-11-16-lighting-research.md` 實驗 2 |
| B13 | 中京預建 387 ms 的長工作（要改構圖檔才能切）、`meshRock` 約 18 ms：收益小，沒排 | `agent-runs/2026-11-17-mesh-perf.md` |
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
