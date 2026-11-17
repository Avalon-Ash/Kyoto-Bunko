# 2026-11-17 ACG 與寺社的事實查核

任務：交接 §4.6 的事實查核，接在商店類之後（[商店類報告](2026-11-17-shop-audit.md)）。使用者 2026-11-17：「資料你直接判斷，總之保留真實性是第一優先」。
請求模型／強度：Sonnet 子代理（研究員，唯讀，每包一個）；實際設定：未確認。主代理（Opus 5.5）審報告、補查、套用。
共同派工單在 repo 外（`C:\Git\_handoff_kyoto_audit\BRIEF.md`）：每一筆都要附實際搜到的 URL，「知識」「通說」不算來源。查核日一律 2026-11-17。
子代理的第一版報告都只看搜尋摘要、有一半沒查（寺社第一包把存在的崇徳天皇御廟、根上がり松判成查不到；ACG 把 Nintendo KYOTO 判成查不到），主代理退回補查後才採用。

## 1. ACG（34 筆）

判準：ACG 分類從「作品」的角度收地點，和寺社、公園的主條目重複是設計上的安排；所以一筆 ACG 條目的去留，看它和作品的關聯有沒有來源。沒有來源的整筆退役；地點本身值得留的，拿掉作品說法改到別的類型。

### 退役 19 筆、改區 1 筆

| ID | 名稱 | 理由 |
|---|---|---|
| FS-041 | 墨染 (ユーフォ聖地) | 京阪官方《響け！》舞台探訪 MAP 只有宇治側，沒有墨染；Wikipedia 也沒有（https://www.keihan.co.jp/euphonium/index.php） |
| HY-052 | 巽橋 | 「狸と狐」的作品關聯沒有來源 |
| HY-054 | 白川 | 『迷宮の十字路』的舞台列表沒有白川（https://mangapedia.com/gd/w285k4o3j） |
| KG-051 | 晴明神社 (ACG) | 沒有作品來源；神社本身是 KG-012 |
| KG-052 | 北野天滿宮 (髭切) | 「刀剣乱舞のファンも多い」沒有來源；髭切是北野天滿宮所藏重要文化財這件事有來源（京博 2026 新聞稿），改記在主條目 KG-001 |
| KG-053 | 一条戻橋 (有頂天家族) | 『有頂天家族』的舞台列表沒有一条戻橋（ja.wikipedia 兩頁）；橋本身是 KG-016 |
| KG-054 | 露地 | 名稱無法對應實體 |
| KG-055 | 同志社 彰栄館 | 沒有作品來源；校區本身是 KG-009 |
| KG-085 | 北野天満宮（けいおん!） | K-ON! 的實景列表沒有北野天滿宮（https://mangapedia.com/gd/bci6yya52） |
| KT-050 | 船岡山 | 沒有作品來源；山本身是 KT-020 |
| KT-054 | 賀茂川 北大路橋 | 「多くの京アニ作品」沒有來源 |
| KT-074 | 松ヶ崎橋 | OP 關聯沒有來源；而且地點其實在左京區 |
| NK-057 | ガシャポンのデパート 寺町店 | 官方店舖頁與兩輪搜尋都沒有京都寺町店 |
| SG-052 | 京都駅 ピアノ (ACG) | 不是 ACG 地點；現況也未確認 |
| SG-053 | 梅小路公園 (ACG) | 『HELLO WORLD』的報導沒有梅小路公園；公園本身是 SG-007 |
| UK-061 | キモノ・フォレスト (ACG) | 「多くのアニメのイメージ源」沒有來源；景物在 UK-001 描述裡 |
| YS-056 | GiGO 山科 | 查不到山科的 GiGO |
| YS-057 | ジョーシン 山科店 | 店存在，但「プラモ・フィギュア充実」沒有來源，作為 ACG 地點不成立 |
| YS-058 | TSUTAYA 山科駅前 | 查不到 |
| NK-056 → **SG-124** | 駿河屋 京都寺町店 | 改區：下京区恵美須之町 534-2（https://uridoki.net/shops/15729） |

### 保留並改寫（只留有來源的說法）

| ID | 改了什麼 | 來源 |
|---|---|---|
| FS-042 | 名稱「三棲」→「三栖閘門」；拿掉ユーフォ，改成 `T_MODERN`、標籤 `歷史 打卡`；1929 年竣工、近代化產業遺產、土木遺產 | https://ja.wikipedia.org/wiki/三栖閘門 |
| FS-043 | いなこん：伏見稲荷大社全面協力製作 | https://ja.wikipedia.org/wiki/いなり、こんこん、恋いろは。 |
| FS-036 | 拿掉沒有來源的「狐姿」 | https://matcha-jp.com/jp/23753 |
| FS-040 | 京アニ第 1 スタジオ跡地：事件現場、現為空地 | https://www.sakigake.jp/news/article/20260718CO0052/ |
| MN-046 | 拿掉「圧倒的な台数」；イオンモール KYOTO 4F | https://local-media.heteml.net/?p=40656 |
| MN-050 | 「任天堂開発センター」→ 官方名「本社開発棟」；拿掉「真っ白」「聖地」 | https://www.nintendo.co.jp/corporate/offices/index.html |
| NK-019 | 「30 万冊」錯 → 資料約 30 萬點、可閱覽約 5 萬冊；舊龍池小學、2006 年開館 | https://www.museum.or.jp/museum/13880 |
| NK-046 | 「京都最大級」沒有來源 → 新京極パッサージオ 2F | https://www.animate.co.jp/shop/kyoto/ |
| NK-051 | 樓層的說法互相矛盾，拿掉 | — |
| SG-045 | 「屋上のフォトスポット」沒有來源 → 京都髙島屋 S.C.「T8」、2023-10-17 開店 | https://www.nintendo.co.jp/corporate/release/2023/230414.html |
| SG-046 | 丸福樓：拿掉 `老舖`（2022 年開業）與「ライブラリー」 | https://www.famitsu.com/news/202201/20248415.html |
| SG-047 | SUINA 室町 2F、舞妓皮卡丘；拿掉「京都限定グッズも豊富」 | https://www.famitsu.com/news/201903/14173252.html |
| SG-051 | 「京都駅 大階段」→「京都駅ビル」：Wikipedia 只寫演奏會在京都駅ビル，沒有指明大階段 | https://ja.wikipedia.org/wiki/響け!ユーフォニアム |
| SK-058 | 拿掉「けいおん!」（叡電在 K-ON! 的記述是車站，不是きらら）→ 芳文社「きらら×きらら」企劃 | https://eizandensha.co.jp/wp-content/uploads/sites/2/2021/03/news_2021.03.10.pdf （摘要） |
| KG-001 | 補「重要文化財の太刀『髭切（鬼切丸）』を所蔵」 | https://www.kyohaku.go.jp/jp/assets/press/2026_kitano_press.pdf （摘要） |

## 2. 寺社第一包（44 筆：FS-006–HY-096）

44 筆都存在；子代理第一輪判成查不到的兩筆補查後都找到：HY-046 崇徳天皇御廟（祇園町南側，白峯神宮管理，只能從外參拜）、FS-017 根上がり松（奧社奉拜所附近）。

| ID | 改了什麼 | 來源 |
|---|---|---|
| HY-003、HY-004、HY-006 | 拿掉 `ACG`（描述沒有作品，也查不到） | — |
| HY-035 豊国神社 | 補 `國寶`（唐門） | https://www.mlit.go.jp/tagengo-db/R1-01728.html |
| HY-038 東福寺 | 補 `國寶`（三門） | https://tabi-mag.jp/ky0583/ （二手） |
| HY-015 智積院 | 補 `國寶`（長谷川等伯一門の障壁画）；日文描述「障壁畫」改成正確的日文 | https://rurubu.jp/andmore/spot/80026789 |
| 上面三處 | 國寶景點依規則要有座標：加進 `SPOT_POSITIONS`，取自 Wikidata P625（Q11090279、Q709822、Q2166743）；`audit-data.ts` 確認都在東山區界內 | https://www.wikidata.org/wiki/Q2166743 等 |
| FS-025 御香宮神社 | 拿掉 `老舖`（商店用語） | — |
| FS-023 伏見桃山陵 | 拿掉 `山岳`；描述改成明治天皇陵、230 段石段、伏見城跡 | https://smtrc.jp/town-archives/city/katsura/p05.html |
| HY-037 耳塚 | 補 `歷史`；「悲劇を伝える」改成國史跡的事實 | https://online.bunka.go.jp/db/heritages/detail/216869 |
| FS-017 根上がり松 | 「商売繁盛」→「値上がり」諧音、證券金融業者的信仰 | https://fushimiinari-guide.com/neagari-no-matsu/ |
| FS-009 長建寺 | 「伏見で唯一弁財天」沒有來源 → 1699 年創建、「島の弁天さん」、朱紅龍宮門 | https://www.mlit.go.jp/tagengo-db/common/001554327.pdf |
| FS-033 西岸寺 | 補「油かけは金曜 13–15 時のみ」 | https://www.keihan.co.jp/navi/kyoto_tsu/tsu201805.html |
| HY-027 六道珍皇寺 | 補「井戸は特別拝観か 5 名以上の予約で」 | https://www.walkerplus.com/spot/ar0726s577759/ |
| HY-046 崇徳天皇御廟 | 「強力な神域」是評語 → 白峯神宮管理、從外參拜 | https://www.kyototuu.jp/Sightseeing/Goryou75SutokuGobyo.html |

沒動、留給日後：HY-041 光明院（拜觀是否平時公開，來源互相矛盾）、HY-024 地主神社（修復閉門的期間未確認）、FS-026 宝塔寺的拜觀條件、FS-028 墨染寺的墨染櫻傳說、清水寺等的國寶只有二手來源（標籤原本就有、與通識一致，沒動）。

## 3. 寺社第二包（44 筆：KG-001–MN-001）

44 筆都存在。這包子代理第一次就照標準做（大量引用寺社官網、京都市觀光協會、kunishitei），直接採用。

| ID | 改了什麼 | 來源 |
|---|---|---|
| KT-041 高桐院 | **拝観休止中、再開未定**；描述原本寫成可以走參道，改成 1601 年細川忠興創建＋休止中 | https://ja.kyoto.travel/tourism/single01.php?category_id=7&tourism_id=282 、https://ja.kyoto.travel/news/format.php?id=143 |
| KT-005 金閣寺、KT-008 平野神社、KT-015 上賀茂神社 | 拿掉 `ACG`（查不到作品） | — |
| KG-027 妙蓮寺 | 補 `庭園`（十六羅漢の石庭） | https://myorenji.or.jp/ |
| KG-003 相國寺 | 「幡龍圖」是錯字 → 蟠龍図（狩野光信）；補 1392 年、臨濟宗相國寺派大本山。`國寶` 保留（承天閣美術館藏國寶 5 件） | https://www.shokoku-ji.jp/about/ 、https://www.shokoku-ji.jp/museum/about/ |
| KG-005 清浄華院 | 「四本山」與淨土宗官方的「七大本山」不合 → 大本山、以院號相稱、本尊法然上人御影 | https://otera.jodo.or.jp/honzan/shojokein/ |
| KG-007 京都御所 | 「至高の空間」是評語 → 紫宸殿 1855 年重建、宮內廳全年免費參觀（週一、年末年初休） | https://kyoto-gosho.kunaicho.go.jp/visit |
| KG-022 縣井 | 「北西角」不符環境省的「西側」→ 一條家跡、《大和物語》 | https://www.env.go.jp/garden/kyotogyoen/news/nature/index_32.html |
| KG-028 雨寶院 | 「出櫻の密度」沒有來源 → 西陣聖天、大聖歓喜天、歓喜桜 | https://ja.kyoto.travel/tourism/single01.php?category_id=7&tourism_id=27 |
| KG-030 千本ゑんま堂 | 「葬送地への入口」找不到原文 → 引接寺、小野篁開基傳承、お精霊迎え、十重石塔（1386，重文） | https://ja.kyoto.travel/tourism/single01.php?category_id=7&tourism_id=237 |
| KG-032 幸神社 | 「平安京創建時から」「猿田彦大神」都查不到 → 守護鬼門的猿神像 | https://ja.kyoto.travel/tourism/single01.php?category_id=7&tourism_id=2867 |
| KG-034 清荒神 | 「門跡寺院」沒有記載 → 天台宗、772 年傳承、1600 年遷至現址、敕願所 | https://ja.kyoto.travel/tourism/single01.php?category_id=7&tourism_id=288 |
| KG-038 阿弥陀寺 | 補「本堂平時不公開，信長忌開放」；中文原本的「復仇後的祭祀地」不通，改寫 | https://ja.kyoto.travel/tourism/single01.php?category_id=7&tourism_id=225 |
| KG-040 宥清寺 | 「広々とした境内」沒有來源；中文「日蓮宗初門」錯 → 本門佛立宗大本山、1308 年（二手） | https://ja.wikid.org/%E5%AE%A5%E6%B8%85%E5%AF%BA （二手） |
| KT-008 平野神社 | 「江戸時代から庶民に」沒有來源 → 約 60 種 400 株、「平野の夜桜」 | https://ja.kyoto.travel/tourism/single01.php?category_id=7&tourism_id=445 |
| KT-016 建勲神社 | 「京都市内見渡せる」與官方說法不合 → 眺望東山三十六峰 | https://kenkun-jinja.org/precincts/ |
| KT-024 志明院 | 「秘境」是評語；中文的「《魔法公主》靈感來源」沒有來源，刪 → 650 年役行者、829 年空海重興 | https://ja.kyoto.travel/tourism/single02.php?category_id=9&tourism_id=20 |
| KT-034 正伝寺 | 「究極の静寂」是評語 → 七五三的枯山水、本堂為重文 | https://ja.kyoto.travel/tourism/single01.php?category_id=7&tourism_id=327 |
| KT-042 龍源院 | 「最も古い塔頭」→ 原文是「最古の建物」；「五つの庭」數不出來 → 南庭、北庭、東の壷庭など | https://ja.kyoto.travel/tourism/single01.php?category_id=7&tourism_id=483 |
| KG-014 妙顯寺 | 「京都十六本山」的官方構成查不到 → 1321 年、洛中最初の日蓮宗寺院、兩座庭 | https://ja.kyoto.travel/tourism/single01.php?category_id=7&tourism_id=2535 |
| KG-029 千本釋迦堂 | 補「本堂 1227 年、國寶、市內最古的木造建築」 | https://kunishitei.bunka.go.jp/heritage/detail/102/1612 、https://daihoonji.jp/cultural-heritage/architectural |

沒動：KG-007 京都御所不是寺社，但現有類型裡沒有更合適的，維持 `T_TEMPLE`（寺社名所）；KG-036 菅原院天滿宮的「と伝えられる」已經是保留語氣。

## 4. 檢查

| 命令 | 結果 |
|---|---|
| `npx --no-install tsx validate_data.js --strict` | ERROR 0、WARN 0，**761 筆**（780 − 退役 20 + 改區新增 1） |
| `npx --no-install tsx scripts/audit-data.ts` | `coordinatesOutsideAssignedWard: []` |
| `npm run lint` | exit 0 |
| `npm test` | 149／149、17／17 |
| `npm run build` | exit 0 |

## 5. 寺社第三包（44 筆：MN-002–NS-065）

| 處理 | ID | 理由與來源 |
|---|---|---|
| 退役 | MN-042 山王神社、MN-072 神應寺、NS-041 庚申堂 | 南區、樫原都查不到（神應寺只有八幡市男山的同名寺）；京都市「區民の誇りの木」名單也沒有 |
| 退役 | NS-036 花の寺の桜 | 是 NS-009 勝持寺的一棵樹（西行桜），不是獨立的地點 |
| 改成鄰近市町 | NS-034 向日神社（向日市）、NS-040 楊谷寺（長岡京市，區域 A10→A19）、NS-065 長岡天満宮（長岡京市） | 照大津市 `M_OTSU` 的前例，在 `municipalities.ts` 加 `M_MUKO`、`M_NAGAOKAKYO`；鄰近市町的景點要有座標，取自 Wikidata P625（Q11415986、Q11541116、Q11652030）。來源：ja.wikipedia 各條 |
| 改類 | NK-023 酢屋 → `T_SHOP` | 1721 年創業的木材商，1F 店舖、2F 藝廊（https://ja.wikipedia.org/wiki/酢屋） |
| 改類 | NS-037 大原野神社 参道 → `T_SHOP`，拿掉 `神社` | schema 規則「通道散策路→T_SHOP」 |
| 補 `國寶` | NK-013 本能寺 | 國寶「伝藤原行成筆書巻」（https://online.bunka.go.jp/heritages/detail/148768 ，一手）；座標取自 Wikidata Q626535 |
| 拿掉 `ACG` | NS-007 松尾大社、NS-016 鈴虫寺 | 查不到作品 |
| 拿掉 `隱密`／`賞花` | MN-008、NS-012、NS-014、NK-038 的 `隱密`；MN-009 的 `賞花` | 清和源氏發祥的神社、西國 20 番的大寺、預約制的世界遺產、新京極通沿街，都不是「隱密」；吉祥院天滿宮查不到花的資料 |
| 描述 | MN-002、006、008、009、010、044、045，NK-010、011、012、013、018、020、021、023、024、037，NS-006、007、010、012、013、017、023、030、033、034、037、040、065 | 拿掉評語（「文学・歴史の聖地」「インパクト抜群」「日本庭園美の最高峰」「天空の寺」等）與沒有來源的說法（「縁結びの法成橋」「送り地蔵」「日本最古級」「全長 37 m」「塩風呂跡」、正法寺的枝垂れ桜、松尾大社中文的重森三玲庭園）；中文 MN-006「電影《羅生門》原型」錯；NK-012「祥発」是錯字；NK-021 前川邸補「内部非公開」，NS-023 補「本堂・方丈は通常非公開」。來源都是 ja.wikipedia 該條（二手）或京都市資料 |

地圖：瀏覽器面板開「向日・長岡京」的地圖，三處各自以座標顯示（不併進區中心的叢集），console 沒有錯誤。
