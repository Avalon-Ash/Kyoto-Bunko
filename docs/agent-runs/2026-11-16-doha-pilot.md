# Doha pilot: Nakagyo (suhama) and Fushimi (banks)

任務：doha pilot（docs/plans/2026-11-16-doha.md §3–§6）／完成（有兩項待決，見末）
請求模型／強度：Sonnet 5.5／未指定；實際設定：未確認
工作區／base SHA：C:\Git\_wt_kyoto_doha／cf6ab3c（branch claude/roof-1116）；全部為未 commit 的 diff

## 變更檔案與行為
- 新增 `src/studies/toji/plate/doha.js`：`tongues()`（洲浜）、`banks()`（土坡）、`tongueShape`、`bankShape`、`bankPoint`、`tonguePoint`、`WEDGE_PROFILE`、`BANK_SOFT`。
- 新增 `scripts/plate-doha-measure.mjs`：§6 數字（純 node，`node scripts/plate-doha-measure.mjs [wards]`）。
- `mat.js`：bankGold 19、bankSilver 20、sandGold 21、sandSilver 22。
- `bake.js`：`paintWedge`（稜線楔形，畫進 G 全解析度，R 帶 BANK_SOFT 給幾何）、`paintKiriString`（切金珠串畫進 B）。
- `three-pack.js`：四種新地面材質的著色；`mHirame` 由舊 `mat==6` 區塊抽成函式（舊區塊改呼叫它，行為不變）；銀坡暗面走硫化銀；金粉坡暗面加深粉層。
- `export-glb.js`：GROUND_COLOUR 四筆。
- `fushimi.js`、`nakagyo.js`：改用 doha 元件；不再用 `hill()`／`gardenGround()`。建築、樹、鳥、狐、燈籠、霧、參道原樣。
- `scripts/plate.test.mjs`：部位數圍欄（Fushimi 54、Nakagyo 57）、p3b 圍欄對 doha 區放寬（石 4–20、裸地 .35–.75、排除 ishigaki）、新增 doha 範圍圍欄與形狀測試、其餘九區尚未使用 doha 材質的測試。
- `src/studies/toji/plate/static/W_{NAKAGYO,FUSHIMI}.{day,night}.webp` 四張重產；其他九張未動（git status 驗證）。

## 技術選擇：稜線與楔形
稜線是一條帶強度 env 的折線（端點 env=0，所以土坡尾端沉入地面）。楔形高度以線性漸層沿稜線畫成條帶、轉角用放射漸層補扇，`lighten` 取最大值，裁在輪廓內，畫進 G 通道（全解析度，shader 的細節法線與色彩淡出都讀它）。幾何只讀 1/4 解析度模糊後的 R，所以脊線的「銳」由 G 的法線給，不靠網格。理由：不加新幾何、不改受保護檔案、疊層用 lighten 與 ident 順序即可、尖脊不會被 15 tap 模糊吃掉。只試了這一種，沒觸發「兩種高度場都失敗」。洲浜是平嵌，不升高，只有細邊線（w1.15, amp .5）。

## 數字（每指令皆可重跑）
| 項目 | W_NAKAGYO（洲浜） | W_FUSHIMI（土坡） | 計畫 |
|---|---|---|---|
| 群數 | 4 | 4 | 2–4 |
| 每群片數 | 7/5/5/5（共 22） | 7/5/4/4（共 20） | 3–7 |
| 石數／每群 | 9（3/2/2/2） | 11（4/2/3/2） | 2–5／群 |
| 最大單片佔蓋面 | 1.8% | 2.49% | ≤4% |
| 片＋石合計 | 24.5% | 28.4% | 20–35% |
| 裸 nashiji | 60.4%（連通 99.2%） | 60.9%（連通 96.4%） | ≥35% 且成帶 |
| 銀片比例 | 40.9% | 45% | ≥1/3 |
| 輪廓最長直線 | 20.6 | 21.6 | ≤30 |
| 切金片數 | 4 | 2 | 少數 |
| 夜 tone L50（前→後） | 49→48 | 49→50 | 48–58 |
| 日 tone L50（前→後） | 53→52 | 52→54 | 48–58 |
| 夜 bright／dark（前→後） | 2/4.3→1/4.8 | 1.4/0.9→0.8/1.4 | bright 不升 |
| 日 bright（前→後） | 7.4→5.7 | 7.1→9.4 | 見待決 2 |
| 切金佔坡面積（夜／日） | 0.3%／1.4% | 0.3%／1.3% | ≤5% |
| 穿插 clip（`plate-clip.mjs`） | findings 0, deepest 0（十一區全部） | 同 | 0 |
| bakeMs（前→後） | ~175–197→218–226 | ~102–118→172–176（楔形 ~20，其餘為 11 顆石的網格） | +30 |
| 切換最長幀，375×812 CPU 4×（前→後，兩次） | 431/411→420/417 | 227/235→226/221 | ≤+10% |

來源指令：`node scripts/plate-doha-measure.mjs`；`PLATE_TONE=1 node scripts/plate-shot.mjs`；`PLATE_KIRI=1 …`；`node scripts/plate-clip.mjs`；`.shots/doha/perf.sh`。其他九區夜 tone L50 48–50（Kamigyo 49、Sakyo 50、Higashiyama 48、Shimogyo 49、Minami 49、Ukyo 49、Nishikyo 49、Yamashina 50、Kita 50）；它們的構圖檔未動。

## 驗收
- `npm run lint`：通過（tsc 無輸出）
- `npx --no-install tsx validate_data.js --strict`：ERROR 0、WARN 0
- `npm test`：134/134 與 17/17 通過
- `npm run build`：通過（3.25 s）

## 對照 §3.0／§3.1（截圖在 .shots/doha/final/，不提交）
達成：洲浜為波與扇貝輪廓、無直線（最長 20.6）；金銀交錯、銀 ≥1/3；切金為珠串、只在少數片；土坡脊線銳利、下方楔形沉入地面無下緣、暗側與疊處為硫化銀；數片前後疊；石擺在舌尖與稜線轉折，腳在片上；二區皆不用舊函式；樹仍逐點貼地；屋頂粉與金箔、`uAge`（`?age=0`）、靜態圖皆保留。
未達：參考圖的起伏更深、片更小更碎（蒔繪實物的坡高約為本作的數倍，本作稜線高度受限於 1/4 解析度的幾何通道）；疊處沒有接觸暗線（接觸場沒有土坡稜線輸入，疊處暗度只靠 face 判斷）；切金珠在 1×、2× 不顯眼，3× 才看得出；金色洲浜在日景偏淡。

## 關鍵截圖
- fu-1n／nk-1n：整面 1×，二區全景，裸地成帶、片群 4 組。
- fu-3n／nk-3n、cmp-fushimi／cmp-nakagyo：3× 並排參考；可見脊線鋸齒、銀坡含金片、石在稜線上；Nakagyo 為金銀洲浜與切金珠。
- fu-age0／nk-age0：新盒（`?age=0`）。fu-static／nk-static：靜態圖。fu-m／nk-m：375×700。
- before：nk-b-*、fu-b-*（改前）。

## 待決
1. 時間預算：Fushimi bake 約 +65 ms、Nakagyo 約 +30–40 ms，超出「+30 ms」。分解：楔形約 20 ms（已把稜線取樣減半），其餘為石的網格（每顆約 4.7 ms；§4.3 要求每群 2–5 顆，每區 8–20 顆，舊版約 1–3 顆）。切換幀未退化（上表）。要壓回需降低石網格細節或放寬預算。
2. Fushimi 日景 bright 7.1→9.4（銀坡高光）。夜景下降。是否接受或再壓。
3. 計畫「片 40–110 長」與「單片 ≤4%」、「合計 20–35%」彼此牽制：舌片實作為 100–140 長、寬 40–66 才夠 20% 以上。建議以測得數字為準。

## 回退指南
這是一個未 commit 的 diff：`git checkout -- src/studies/toji/plate/{bake,export-glb,fushimi,mat,nakagyo,three-pack}.js scripts/plate.test.mjs src/studies/toji/plate/static` 並刪除 `doha.js`、`scripts/plate-doha-measure.mjs`。只回退單區：把該區 .js 還原即可（doha.js 與材質可留，不被引用），並還原該區的圍欄與兩張靜態圖。
