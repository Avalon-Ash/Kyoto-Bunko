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

## 第二輪（使用者退回後修訂，未 commit）
base：f1b608d 之上的未 commit diff。請求模型／強度與實際設定：未確認（工具未回報）。

### 做了什麼
- 石：全部移到近地（鳥居腳、樓門腳、狐座旁、松根、唐門腳、殿基、護城河岸）；山上無石。每塊外形為手寫控制點，`meshRock` 擴充 outline／peaks／lines／foil。
- 舌片、坡：外形由各區檔的控制點手寫（Catmull-Rom），隨機只允許 1.5 單位內抖動。
- 伏見遠山（稲荷山）：4 頭圓潤、略不對稱、相疊；脊線抬高、脊後有細陰影（來自光照與接觸場遮蔽，非畫上去）；山面往下磨平到地面高度，粉由脊向下漸淡、山腳化入梨子地；一頭為青金，其餘金（色調略有差）。無刑部片、無切金、無石，依最新指示也無樹、草點、谷水。另有遠山列 3 頭。
- 中京洲濱：金片明顯比底淡、邊更清楚，重疊處由接觸場降光（只減光、不混色）。
- 實作偏離：壁面用「垂直楔形」（沿手寫脊線垂直向下的條帶），因法線偏移條帶在轉折處產生放射折紋；遠山列不計入「銀片 1/3」，另行量測；中京淨空連通率放寬為 ≥70%；接觸場遮蔽隨 `uAge`，`?age=0` 時關閉。

### 石的理由表
| 石 | 靠著什麼／為什麼在這裡 |
|---|---|
| 伏見 torii-foot | 大鳥居東柱腳；柱子立在那裡 |
| 伏見 romon-step | 樓門腳、小金地東側；門階的承石 |
| 伏見 fox-seat | 狐座石台東；狐在石間 |
| 伏見 fox-seat-s | 緊鄰前者的小石（一大一小） |
| 中京 east-pine／-s | 東松根；松抓著石，旁邊一小塊 |
| 中京 west-pine | 西松根；細高斜立，像老樹旁的燈石 |
| 中京 karamon-foot | 唐門東腳；門腳的承石 |
| 中京 hall-foot | 末殿基壇東角；階梯止於此 |
| 中京 moat-shore | 護城河前水岸；水邊有石 |

### 相似度（`scripts/plate-doha-similar.mjs`）
門檻 = 各類 max(.06, 2×該類抖動基準中位數)；基準由同一外形用不同 seed 抖動量得。
- 伏見：門檻 舌.114／坡.06／石.114；最近對 舌 .116、坡 .084、石 .117（皆高於門檻）。
- 中京：門檻 舌.097／石.097；最近對 舌 .101、石 .150。
- `plate.test.mjs` 以此為測試，皆過。

### 構圖數字
| | 伏見 | 中京 |
|---|---|---|
| 群數 | 4 | 4 |
| 每群片數 | 4／3／6／3 | 6／4／4／4 |
| 石 | 4 | 6 |
| 最大片佔比 | 3.67% | 2.27% |
| 片＋石合計 | 22.6% | 23.9% |
| 留白 | 65.8%（連通 91.2%） | 60%（連通 98.9%） |
| 銀片 | 44.4% | 50% |
| 最長直線 | 24.4 | 28.2 |

### 檢查
- `npm run lint` 0；`validate_data.js --strict` ERROR 0／WARN 0；`npm test` 全過（58 項 plate 測試）；`npm run build` 成功。
- Clip：findings 0。Kirikane（PLATE_KIRI）：伏見 0.4%、中京 0.2%（≤5%）。
- Tone 中位數：伏見日 51／夜 50；中京日 50／夜 48；Kita 53、Kamigyo 51（其他區未動）。伏見日景 bright 4.1%（≤7.1%）。
- 效能 maxGap（4× CPU 降速）：伏見 237 ms、中京 415 ms（第一輪 226／417）。
- Bake：伏見 190–209 ms、中京 204–215 ms；未動的 Kita 102–112 ms。預算（試作前 +80 ms）約 198／197：伏見貼線、中京超出約 10–15 ms。
- 後備圖：只重生成 W_NAKAGYO／W_FUSHIMI 的 day／night 四個 webp。

### 截圖（`.shots/doha/r2/`）
3× 日景、每群一張：`fu-mountain-3x`（遠山相疊的頭、脊、粉的漸淡）、`fu-far-3x`（遠山列＋樓門）、`fu-court-3x`（鳥居與石、舌片）、`fu-fox-3x`（狐座與兩石）、`nk-stairs-3x`／`nk-forecourt-3x`／`nk-east-3x`／`nk-west-3x`。1×：`fushimi-day/night`、`nakagyo-day/night`。對照：`sbs-fushimi-mountain.png`（使用者杯 a、特寫、本作）、`sbs-nakagyo-suhama.png`。PLATE_CENTER 的拖曳置中在 3× 沒有生效（視角被夾住），圖是以錨點放大，群未必在正中。

### 遠山對照八點（§10.8）
達成：圓潤相疊的頭；脊抬高且硬邊；脊後陰影；山面磨平；粉由脊漸淡、腳融入地；一頭異色；無刑部片／切金／石；無樹草水。
未完全達成：山色與地的反差偏低（偏褐灰，不如杯上金／紅的對比）；脊後陰影較淡；青金頭在日景只略偏灰，辨識度弱。

### 沒做／風險
- Bake 時間中京超出放寬預算。
- 手機（375px）與 `?age=0` 未逐一拍照。
- 自評：各群看起來手繪、無明顯重複；遠山列的三頭彼此較相似，但在門檻之上。
