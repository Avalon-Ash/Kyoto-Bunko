# 2026-11-17 商店類（T_SHOP）事實查核

任務：交接 §4.6「寺社與商店類的事實查核」第一批：商店類 83 筆（含當天從食處改過來的 YS-045）／完成
請求模型／強度：兩個 Sonnet 子代理（研究員，唯讀，各一包）；實際設定：未確認。主代理（Opus 5.5）審報告、補查、套用。
工作區／base：`C:\Git\Kyoto-Bunko`，`claude/data-1117` `5828b2d`
分包：A 包 43 筆（中京、下京、上京、北、右京）；B 包 40 筆（東山、伏見、山科、南、左京、西京）。查核日一律 2026-11-17。
規則：使用者的常設決定「查不到就退役，ID 留給日後補資料」，主代理依報告直接改，不逐筆問。

## 1. 結果總數

| 包 | 存續／營業中 | 閉店 | 未確認 | 區不符 | 描述待修 |
|---|---|---|---|---|---|
| A | 35 | 0 | 8 | 0 | 5 |
| B | 31 | 1 | 8 | 2 | 8 |

限制（兩包子代理都註明）：多數結論來自搜尋摘要，不是逐頁原文；「營業中」是「近期仍有刊登、沒看到閉店」，不是官方即時確認。

## 2. 已套用

### 退役（schema 與中日 locale 三處同步刪除，ID 不重用）

| ID | 名稱 | 理由 | 來源 |
|---|---|---|---|
| NS-044 | 洛西タカシマヤ | 2026-08-03 營業終了（後繼是ラクセーヌ 1F 的小型店） | https://www.takashimaya.co.jp/store/aboutinfo/rakusai20260529/ （搜尋摘要） |
| SG-087 | ブックオフプラス | 下京區查無此店；BOOKOFF PLUS 在河原町オーパ（中京區），身分對不上 | https://www.bookoff.co.jp/shop/shop20461.html （搜尋摘要） |
| SG-090 | パントリー 伊勢丹店 | 子代理兩輪＋主代理一輪都查不到；伊勢丹 B1／B2 食品樓層資料沒有這家 | https://www.mistore.jp/store/kyoto/shops/floorB2.html （搜尋摘要） |
| SG-091 | 成城石井 京都駅店 | 查不到京都駅的店（只有四条烏丸店、髙島屋店） | https://tokubai.co.jp/prefectures/26/loconavi_spots/48447 |
| NK-075 | 古着屋JAM 京都三条店 | 只有一篇沒有日期的整理文提到，無地址、無官方頁 | https://aumo.jp/articles/19426 |
| SG-042 | 京都織物問屋街 | 沒有以此名存在的商店街或組合（室町一帶的呉服問屋跨中京、下京） | — |
| MN-039 | 瓦町 繊維問屋街 | 南區查無此地名的問屋街 | — |
| YS-045 | 三条商店街 (旧東海道) | 兩次查核都找不到這個名稱的商店街（舊東海道沿線只有個別店家） | https://pedia.3rd-in.co.jp/wiki/%E4%B8%89%E6%9D%A1%E9%80%9A |
| YS-029 | 清水焼の郷 工房 | 沒有獨立實體；工房見學與體驗屬於清水焼の郷會館，與 YS-009 重複 | https://www.pref.kyoto.jp/kyotoyamashirokanko/experience_art.html |
| YS-052 | 陶あん 清水焼店 | 山科沒有這家；陶あん的店在東山區（本店、八坂店），清水焼團地的導覽圖也沒有 | https://rurubu.jp/andmore/spot/80111859 |
| SK-083 | ライフ 川端店 | 查無此店名；附近是「ライフ 川端東一条店」或 Fresco 川端店，無法確定指哪一家 | https://www.super-fresco.co.jp/store/fresco/kyoto/ |
| HY-098 | Ryokaku | 品牌存在，但查不到大和大路通的直營店；Retty 上的同名店是咖哩、咖啡，與「物販のみ、飲食無し」衝突 | https://retty.me/area/PRE26/ARE112/SUB11201/100000772274/ |
| HY-089 → **SG-123** | フレスコ 五条大橋店 | 改區：地址是**下京區**五条通寺町西入御影堂町 16-21（24 小時）。原描述「五条大橋東詰」也錯（寺町在鴨川以西）。依舊例改區＝舊 ID 退役、新區給新 ID | https://www.super-fresco.co.jp/store/fresco/kyoto/ （子代理直接抓取） |

### 改名

| ID | 原名 | 新名 | 來源 |
|---|---|---|---|
| NK-074 | セカンドストリート 京都三条店 | セカンドストリート 三条河原町通店（中京區河原町通六角下る） | https://uridoki.net/shops/13497 |
| UK-054 | ちりめん工藝館 | 嵐山ちりめん細工館 嵐山本店（右京區嵯峨天竜寺造路町；同店是推定，名稱、地點、品項一致） | https://livejapan.com/ko/in-kansai/in-pref-kyoto/in-arashiyama_uzumasa/spot-lj0011146/ |
| MN-048 | ドン・キホーテ 京都駅八条口 | ドン・キホーテ 京都アバンティ店（2F，9:00–24:00，不是 24 小時） | https://www.walkerplus.com/spot/ar0726s575167/data.html |
| FS-021 | 竜馬通り | 竜馬通り商店街（南北約 130 m，1994 年由南納屋町商店街改名） | https://rurubu.jp/andmore/spot/80027311 |
| FS-018 | 伏見酒蔵小路 | 伏水酒蔵小路（正式名） | https://rurubu.jp/andmore/spot/80027316 |

### 描述與標籤

| ID | 改了什麼 | 來源 |
|---|---|---|
| NK-081 新風館 | 「安藤忠雄が改築」**錯**→ 舊京都中央電話局（吉田鐵郎設計，1926），2020 年隈研吾監修再生 | https://www.city.kyoto.lg.jp/tokei/cmsfiles/contents/0000305/305675/shinpuhkan.pdf |
| NK-035 丸善 | 補「《檸檬》的舊店 2005 年閉店，現店在京都 BAL 地下」 | https://ja.kyoto.travel/times/night/article/single.php?id=480 |
| NK-016 三条名店街 | 「大正・昭和の面影」沒來源 → 「河原町通と寺町通を結ぶアーケード」 | 子代理 A 包 |
| NK-030 柳小路 | 「柳がなびき石畳」沒來源 → 細い路地に長屋の小さな店（はちべえ長屋） | https://ssl.tabelog.com/en/kyoto/A2601/A260201/26027454/ |
| KG-033 三上家路地 | 「突抜」（兩頭通）→ 行き止まりの「路地」；織物司三上家（室町時代から） | https://www.keihan.co.jp/navi/kyoto_tsu/tsu200906.html |
| SG-023 京都中央卸売市場 | 拿掉「周邊魚料理名店」與 `正餐 名物 老舖`；改寫成第一市場的事實，標籤 `歷史` | https://www.city.kyoto.lg.jp/sankan/cmsfiles/contents/0000357/357919/houdou.pdf |
| HY-097 原了郭 | 創業 1703 → **1685 年（貞享 2 年）**；刪「一子相伝」「宮廷御用」（沒來源） | https://rurubu.jp/andmore/article/20084 |
| SK-052 洛北阪急スクエア | 「左京区最大」沒來源 → 2019 年全館リニューアル | https://www.city.kyoto.lg.jp/sankan/cmsfiles/contents/0000243/243711/report10.pdf |
| SK-023 手づくり市 | 補「8 月休み」 | https://rurubu.jp/andmore/spot/80026193 |
| YS-051 無印良品 京都山科 | 「世界最大級」錯（那是堺北花田）→ 関西最大級の食品売場、2019 年開業 | https://resemom.jp/release/prtimes/20191018/57495.html |
| YS-024 西友 山科店 | 「駅からの利便性も高く」與距離（約 900 m）不符 → ジャンボスクエア山科内 | https://tokubai.co.jp/transit/rail_lines/station_groups/5915/supermarket |
| FS-021 竜馬通り商店街 | 「お洒落なカフェが立ち並ぶ」沒來源，刪；`喫茶` 標籤一併拿掉 | 同改名 |
| FS-031 伏見夢百衆 | `老舖` 標籤沒依據（設施是月桂冠舊本社改裝），拿掉 | https://rurubu.jp/andmore/article/4151 |
| NS-020 ラクセーヌ | 中文「洛西地區最大」沒來源 → 洛西新城中心的大型購物中心 | — |

## 3. 沒動、留給日後

- NK-014「寺町通 商店街」：子代理建議改成「寺町京極商店街」（三条〜四条），但描述的古書店、畫廊、老舖茶商比較像寺町通北段（寺町專門店會），對不上，先不改。
- FS-018 伏水酒蔵小路：實際是試飲、飲食設施，標籤已有 `正餐`，可能該改成 `T_FOOD`；改類前要用 Tabelog 查（食處規範），這次沒做。
- FS-030 黄桜 伏見蔵：正式名可能是「黄桜 伏水蔵」，與カッパカントリー的關係沒分清，先不改。
- NK-007 木屋町通、SG-006 四条河原町：實體跨兩三區，維持現在的區。
- NK-032 俵屋、NK-033 柊家：旅館不屬於商店，但 schema 沒有住宿類型，維持。
- KT-040 マールブランシュ：子代理建議改成食處；它是賣洋菓子的店附沙龍，屬「商肆茶寮」，維持 `T_SHOP`。

## 4. 檢查

| 命令 | 結果 |
|---|---|
| `npx --no-install tsx validate_data.js --strict` | ERROR 0、WARN 0，**780 筆**（792 − 退役 13 + 改區新增 1） |
| `npm run lint` | exit 0 |
| `npm test` | 149／149、17／17 |
| `npm run build` | exit 0 |

退役的 ID 在 `src`、`scripts` 都沒有其他引用（`grep`）。套用用的腳本在 repo 外（`C:\Git\_handoff_kyoto_shop\apply.mjs`），不提交。
