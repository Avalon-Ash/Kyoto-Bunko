# R9-E：左京區、下京區食處查核

任務：R9 E 批（`docs/plans/2026-11-16-roadmap.md`）＋HY-085 複查／完成
請求模型／強度：Sonnet 5.5（主席請求）；實際設定：未確認
工作區／base SHA：`C:\Git\Kyoto-Bunko`，分支 `claude/roadmap-1116`；唯讀，未 commit／push
變更檔案與行為：只新增本報告，未改任何 `src/data/**`
檢查：無應用檢查（純查核）；方法見最後一節
資料來源／未確認項：Tabelog 英文版為主；查核日期 2026-11-16。未確認 2 筆（SK-075、SG-084）
問題：無閉店確定案例；2 筆未確認、10 筆行政區不符、2 組重複、數筆店名待修
交接：退役／改區／改名需使用者同意；子代理未 commit／push

## 0. HY-085「七条ふたば」結論

**不在東山區，應在下京區。** Tabelog「Nanajou Futaba」：京都府京都市下京区七条通大宮東入大工町120-2，電話 075-371-8643，週一、二休，營業中（精選評論 2026-05、2025-03、2025-01）。類型為和菓子、豆大福，與庫內描述（豆大福）相符。七条通大宮東入屬下京區（梅小路京都西駅 666m）。來源：https://tabelog.com/en/kyoto/A2601/A260101/26017156/

## 1. 清單與判定統計

`typeId: 'T_FOOD'` 共 **80** 筆：左京區 `W_SAKYO` 31（SK-）、下京區 `W_SHIMOGYO` 49（SG-）。

| 判定 | 筆數 | id |
|---|---|---|
| 營業中 | 78 | 其中 10 筆營業中但行政區不在庫內所列區（SG-039、061、062、069、076、077、094、097、102、103）；SG-069 與 SK-051 同店，SG-095 與 SG-086 同店 |
| 已閉店 | 0 | |
| 已移轉 | 0 | SK-095 イノツチ洋食店 為同町內遷對面，仍在左京區，視為營業中 |
| 休業中 | 0 | |
| 身分不符 | 0 | 
| 未確認 | 2 | SK-075、SG-084 |

判定方法：Tabelog 英文版搜尋頁取店名、區域、「Listing on hold」標示；詳情頁取地址、電話；評論列表頁依最新排序（`dtlrvwlst/?SrtT=nd`）取最新造訪月份。「營業中」＝Tabelog 無掲載保留標示且有近月評論，不是現場確認。評論月份以頁面顯示的「Visited on」為準。簡稱：表中網址前綴 `https://tabelog.com/en/kyoto/`。

## 2. 總表（查核日 2026-11-16）

| id | 店名（日） | 庫內區 | 判定 | 事實摘要 | 來源（Tabelog） |
|---|---|---|---|---|---|
| SK-033 | 麺屋 極鶏 | 左京 | 營業中 | Tabelog「GOKKEI Ichijouji honten」左京区一乗寺西閉川原町29-7，最新評論 November, 2026 | A2601/A260303/26017870/ |
| SK-034 | 茶寮 寶泉 | 左京 | 營業中 | Tabelog「Saryo Housen」左京区下鴨西高木町25，最新評論 November, 2026 | A2601/A260503/26001872/ |
| SK-050 | 進々堂 京大北門前 | 左京 | 營業中 | Tabelog「Shinshindo Kyodai kitamonmae」左京区北白川追分町88，最新評論 September, 2026 | A2601/A260302/26001845/ |
| SK-051 | 満月 本店 (阿闍梨餅) | 左京 | 營業中 | Tabelog「Ajari Mochi Honpo Kyogashi Tsukasa Mangetsu Honten」左京区鞠小路通今出川上ル，最新評論 November, 2026 | A2601/A260302/26003917/ |
| SK-055 | 瓢亭 本店 | 左京 | 營業中 | Tabelog「Hyotei Honten」左京区南禅寺草川町35，最新評論 October, 2026 | A2601/A260301/26001012/ |
| SK-056 | 聖護院八ッ橋総本店 | 左京 | 營業中（店名待修） | Tabelog「聖護院八ッ橋総本店 熊野店」；最新評論僅 2025-12（偏舊），無閉店標示 | A2601/A260302/26017881/ |
| SK-066 | グリル小宝 | 左京 | 營業中 | Tabelog「Grill Kodakara」左京区岡崎北御所町46，最新評論 November, 2026 | A2601/A260301/26000009/ |
| SK-067 | 岡北 | 左京 | 營業中 | Tabelog「Kyo Udon Nama Soba Okakita」左京区岡崎南御所町34，最新評論 November, 2026 | A2601/A260302/26000919/ |
| SK-068 | 茂庵 | 左京 | 營業中 | Tabelog「Moan」左京区吉田神楽岡町8，最新評論 October, 2026 | A2601/A260302/26001082/ |
| SK-069 | 山元麺蔵 | 左京 | 營業中 | Tabelog「Yamamoto Menzou」左京区岡崎南御所町34，最新評論 November, 2026 | A2601/A260301/26002504/ |
| SK-070 | 日の出うどん | 左京 | 營業中 | Tabelog「Hinode Udon」左京区南禅寺北ノ坊町36，最新評論 November, 2026 | A2601/A260301/26000815/ |
| SK-071 | おめん 銀閣寺本店 | 左京 | 營業中 | Tabelog「Omen Ginkakuji honten」左京区浄土寺石橋町74，最新評論 October, 2026 | A2601/A260302/26001803/ |
| SK-072 | 一乗寺 中谷 | 左京 | 營業中 | Tabelog「Ichijoji Nakatani」左京区一乗寺花ノ木町5，最新評論 October, 2026 | A2601/A260303/26000491/ |
| SK-074 | 南禅寺 順正 | 左京 | 營業中 | Tabelog「Nanzenji Junsei」左京区南禅寺草川町60，最新評論 November, 2026 | A2601/A260301/26001013/ |
| SK-075 | 総本家 ゆどうふ 奥丹南禅寺 | 左京 | 未確認（建議退役） | Tabelog「掲載保留」（閉店・移転・休業のいずれかで現況不明）。清水店 2026-02 評論者が「南禅寺店は閉店したので清水店へ」と記述。旅行サイト（るるぶ等）は営業扱いだが日付なし | A2601/A260301/26001834/ |
| SK-076 | 天ぷら圓堂 岡ざき邸 | 左京 | 營業中 | Tabelog「Kyoto Tempura Endo Okazaki tei」左京区岡崎西天王町60-3，最新評論 October, 2026 | A2601/A260302/26027215/ |
| SK-086 | COYOTE Roastery | 左京 | 營業中 | Tabelog「COYOTE Roastery」左京区田中下柳町3，最新評論 October, 2026 | A2601/A260302/26041614/ |
| SK-087 | swimpond coffee | 左京 | 營業中 | Tabelog「swimpond coffee」左京区浄土寺馬場町1-4，最新評論 August, 2026 | A2601/A260301/26033346/ |
| SK-088 | 喫茶ドセイノワ | 左京 | 營業中 | Tabelog「Kissa Doseinowa」左京区北白川東久保田町11，最新評論 October, 2026 | A2601/A260302/26039629/ |
| SK-089 | 喫茶とパン do. | 左京 | 營業中 | Tabelog「Kissa to Pan do.」左京区北白川東久保田町10-1，最新評論 July, 2026 | A2601/A260302/26029581/ |
| SK-090 | み空 | 左京 | 營業中 | Tabelog「Misora」左京区北白川久保田町28-1，最新評論 October, 2026 | A2601/A260302/26041953/ |
| SK-092 | jete | 左京 | 營業中 | Tabelog「jete'」左京区吉田下大路20-3，最新評論 June, 2026 | A2601/A260302/26042433/ |
| SK-093 | 菓子・茶房 チェカ | 左京 | 營業中 | Tabelog「cheka」左京区岡崎法勝寺町25番地，最新評論 November, 2026 | A2601/A260301/26016994/ |
| SK-094 | しばし | 左京 | 營業中 | Tabelog「sibasi」左京区岡崎天王町76-16，最新評論 June, 2026 | A2601/A260301/26041734/ |
| SK-095 | イノツチ洋食店 | 左京 | 營業中 | 2025 年遷至對面（Tabelog 評論 2026-01、04、06、07 皆提及），地址仍為左京區 | A2601/A260301/26044045/ |
| SK-096 | 暁珈琲 | 左京 | 營業中 | Tabelog「Akatsuki Coffee」，一乗寺赤ノ宮町15-1 | A2601/A260303/26021308/ |
| SK-097 | 遠藤珈琲店 | 左京 | 營業中 | Tabelog「Endo Coffee Ten」左京区一乗寺東杉ノ宮町18-2，最新評論 September, 2026 | A2601/A260303/26043613/ |
| SK-098 | つばめ | 左京 | 營業中 | Tabelog「Tsubame」左京区一乗寺払殿町50-1，最新評論 July, 2026 | A2601/A260303/26027686/ |
| SK-099 | 大原山荘 足湯喫茶 | 左京 | 營業中 | Tabelog「大原山荘」頁面，足湯咖啡館 9:00〜17:00 左右，2026-06 評論提及 | A2601/A260504/26001062/ |
| SK-100 | Ohara River side cafe 来隣 | 左京 | 營業中（店名待修） | Tabelog 名「Kirin」（来隣=きりん），大原來迎院町114 | A2601/A260504/26022393/ |
| SK-143 | らぁ麺 とうひち | 左京 | 營業中 | Tabelog「Ramen Touhichi」左京区山端壱町田町8-6，最新評論 November, 2026 | A2601/A260303/26037391/ |
| SG-029 | 和久傳 | 下京 | 營業中 | Tabelog「Muromachi Wakuden」中京区堺町姉小路上ル丸木材木町679，最新評論 November, 2026 | A2601/A260202/26000621/ |
| SG-039 | 七條甘春堂 | 下京 | 營業中（區不符） | 本店在東山區七条通本町東入西ノ門町551；Tabelog「Shichijo Kanshundo Honten」東山区七条通本町東入ル西ノ門町551，最新評論 November, 2026 | A2601/A260304/26000543/ |
| SG-048 | 伊藤久右衛門 京都駅前店 | 下京 | 營業中 | Tabelog「Ito Kyuemon Kyoto ekimae ten」下京区塩小路通り烏丸西入ル東塩小路町579-1，最新評論 October, 2026 | A2601/A260101/26022791/ |
| SG-049 | 末富 | 下京 | 營業中 | Tabelog「Suetomi」下京区松原通室町東入ル，最新評論 October, 2026 | A2601/A260201/26003472/ |
| SG-055 | 京都拉麺小路 | 下京 | 營業中 | Tabelog「Nakamura Shoten Kyoto ramen koji ten」下京区烏丸通塩小路下ル東塩小路町901，最新評論 November, 2026 | A2601/A260101/26030811/ |
| SG-056 | 本家 第一旭 | 下京 | 營業中 | Tabelog「Honke Daiichi Asahi Honten」下京区東塩小路向畑町845，最新評論 November, 2026 | A2601/A260101/26000873/ |
| SG-057 | 新福菜館 本店 | 下京 | 營業中 | Tabelog「Shinpuku Saikan Honten」下京区東塩小路向畑町569，最新評論 November, 2026 | A2601/A260101/26000791/ |
| SG-060 | 吟醸らーめん 久保田 | 下京 | 營業中 | Tabelog「Ginjo Ramen Kubota」下京区西松屋町563，最新評論 November, 2026 | A2601/A260101/26004660/ |
| SG-061 | 吉廼家 | 下京 | 營業中（區不符） | 北區北大路室町西入ル（庫內放在下京區）；Tabelog「Yoshinoya」北区北大路室町西入ル，最新評論 October, 2026 | A2601/A260503/26008740/ |
| SG-062 | さらさ 花遊小路 | 下京 | 營業中（區不符） | 中京區新京極四条上ル中之町565-13；Tabelog「Sarasa Kayu Koji」中京区新京極四条上ル中之町565-13，最新評論 October, 2026 | A2601/A260201/26005388/ |
| SG-065 | 中村藤吉 京都駅店 | 下京 | 營業中 | Tabelog「Nakamura Tokichi Honten Kyoto eki ten」下京区烏丸通塩小路下る東塩小路町，最新評論 October, 2026 | A2601/A260101/26005903/ |
| SG-066 | マールブランシュ 八条口店 | 下京 | 營業中 | Tabelog「Malebranche Hachijoguchi ten」下京区東塩小路釜殿町31-1，最新評論 November, 2026 | A2601/A260101/26007103/ |
| SG-067 | 開化堂カフェ | 下京 | 營業中 | Tabelog「Kaikado Cafe」下京区河原町通七条上ル住吉町352，最新評論 October, 2026 | A2601/A260101/26027350/ |
| SG-068 | Walden Woods Kyoto | 下京 | 營業中 | Tabelog「Walden Woods Kyoto」下京区栄町508-1，最新評論 October, 2026 | A2601/A260101/26030010/ |
| SG-069 | 阿闍梨餅本舗 滿月 | 下京 | 營業中（區不符、與 SK-051 重複） | 左京區鞠小路通今出川上ル，與 SK-051 同一店；Tabelog「Ajari Mochi Honpo Kyogashi Tsukasa Mangetsu Honten」左京区鞠小路通今出川上ル，最新評論 November, 2026 | A2601/A260302/26003917/ |
| SG-070 | 寿しのむさし | 下京 | 營業中（店名待修） | Tabelog「寿しのむさし 京都駅八条口店」 | A2601/A260101/26003088/ |
| SG-071 | 瓢斗 京都駅前本店 | 下京 | 營業中 | Tabelog「Hyoto Kyoto ekimae honten」下京区東塩小路町607-12，最新評論 November, 2026 | A2601/A260101/26031208/ |
| SG-072 | とんかつ一番 | 下京 | 營業中 | Tabelog「Tonkatsu Ichiban」下京区黒門通木津屋橋上る徹宝町403，最新評論 November, 2026 | A2601/A260101/26002247/ |
| SG-073 | 山本まんぼ | 下京 | 營業中 | Tabelog「Yamamoto Mambo」下京区小稲荷町61-54，最新評論 November, 2026 | A2601/A260101/26034294/ |
| SG-074 | 貝だし麺 きた田 | 下京 | 營業中 | Tabelog「Kaidashi Men Kitada」下京区北不動堂町570-3，最新評論 November, 2026 | A2601/A260101/26036754/ |
| SG-076 | すき焼き 木村 | 下京 | 營業中（區不符） | 中京區寺町通四条上ル大文字300；Tabelog「Sukiyaki Kimura」，最新評論 November, 2026 | A2601/A260201/26000648/ |
| SG-077 | 乙羽 | 下京 | 營業中（區不符） | 中京區新京極通四条上ル中之町565；Tabelog「Otowa」中京区新京極通四条上ル中之町565，最新評論 October, 2026 | A2601/A260201/26000667/ |
| SG-078 | モリタ屋 伊勢丹店 | 下京 | 營業中 | Tabelog「Morita Ya Kiya machi ten」中京区木屋町三条上ル上大阪町531，最新評論 October, 2026 | A2601/A260202/26000410/ |
| SG-080 | 焼肉食べ放題 やる気 京都駅前店 | 下京 | 營業中 | Tabelog「Yakiniku Yaruki Kyoto ekimae ten」下京区七条通烏丸東入真苧屋町220-3，最新評論 November, 2026 | A2601/A260101/26034272/ |
| SG-081 | 本格焼肉 チファジャ 京都駅前店 | 下京 | 營業中 | Tabelog「CHIFAJA Kyoto ekimae ten」下京区塩小路町517-2，最新評論 October, 2026 | A2601/A260101/26034700/ |
| SG-082 | パティスリー・エス | 下京 | 營業中 | Tabelog「PATISSERIE.S」下京区高辻通室町西入繁昌町300-1，最新評論 November, 2026 | A2601/A260201/26012808/ |
| SG-083 | 拳ラーメン | 下京 | 營業中 | Tabelog「Kobushi Ramen」下京区朱雀正会町1-16，最新評論 November, 2026 | A2601/A260203/26017616/ |
| SG-084 | 手打ち蕎麦 実延 | 下京 | 未確認（建議退役） | 「実延」の店名は Tabelog・Web 検索で2輪とも0件。同地下鉄五条〜松原通の蕎麦店は「手打ち蕎麦 井上」（松原通新町東入中野之町168-2、2026-03 評論）のみで、関係は不明 | A2601/A260101/26028498/ |
| SG-085 | Kurasu | 下京 | 營業中（店名待修） | Tabelog「Kurasu Kyoto Stand」，下京區東油小路町552 | A2601/A260101/26027807/ |
| SG-086 | Len | 下京 | 營業中 | 下京區植松町709-3（Len 京都河原町，與 SG-095 同址）；Tabelog「Len」下京区植松町709-3，最新評論 August, 2026 | A2601/A260201/26025344/ |
| SG-093 | 焼肉 弘 商店 四条高倉 | 下京 | 營業中 | Tabelog「Yakiniku Hiro Shoten Shijo takakura」下京区高倉通四条下ル高材木町224-2，最新評論 November, 2026 | A2601/A260201/26023225/ |
| SG-094 | 焼肉 弘 商店 烏丸錦 | 下京 | 營業中（區不符） | 中京區烏丸通錦小路東入元法然寺町681；Tabelog「Yakiniku Hiro Shoten Karasuma nishiki」中京区烏丸通錦小路東入元法然寺町681，最新評論 November, 2026 | A2601/A260202/26016840/ |
| SG-095 | Len 京都河原町 | 下京 | 營業中（與 SG-086 重複） | Tabelog「Len」下京區植松町709-3 = 庫內 SG-086；官方 Backpackers Japan 的「Len KYOTO KAWARAMACHI」也是同址 | A2601/A260201/26025344/ |
| SG-096 | BERRY BUTTON | 下京 | 營業中 | Tabelog「BERRY BUTTON」下京区本覚寺前町811，最新評論 October, 2026 | A2601/A260301/26043908/ |
| SG-097 | ACTUAL KYOTO | 下京 | 營業中（區不符） | 中京區壬生賀陽御所町20-2；Tabelog「ACTUAL KYOTO」中京区壬生賀陽御所町20-2，最新評論 October, 2026 | A2601/A260203/26039246/ |
| SG-098 | Hygge | 下京 | 營業中 | Tabelog「Hygge」下京区西新屋敷中堂寺町74，最新評論 November, 2026 | A2601/A260203/26020698/ |
| SG-099 | 喫茶若山 | 下京 | 營業中 | Tabelog「Kissa Wakayama」下京区二人司町2-6，最新評論 September, 2026 | A2601/A260203/26043450/ |
| SG-100 | WANDERERS | 下京 | 營業中 | Tabelog「WANDERERS」下京区八百屋町58，最新評論 November, 2026 | A2601/A260101/26028186/ |
| SG-101 | サフラン サフラン | 下京 | 營業中 | Tabelog「Saffron Saffron」下京区東洞院通仏光寺東南角高橋町605，最新評論 November, 2026 | A2601/A260201/26009105/ |
| SG-102 | FUGLEN KYOTO | 下京 | 營業中（區不符） | 北區紫竹東栗栖町38-3；Tabelog「FUGLEN KYOTO」北区紫竹東栗栖町38-3，最新評論 October, 2026 | A2601/A260503/26044216/ |
| SG-103 | 伴奏珈琲店 | 下京 | 營業中（區不符） | 活躍中的「伴奏珈琲店」在上京區西町22-5（北野白梅町）；中京區西ノ京東月光町27 的同名登録為「掲載保留」；Tabelog「Banso Coffee Ten」上京区西町22-5，最新評論 November, 2026 | A2601/A260501/26043764/ |
| SG-104 | 牛角 四条河原町店 | 下京 | 營業中 | Tabelog「Gyukaku Kyoto shijo kawaramachi ten」下京区真町97，最新評論 September, 2026 | A2601/A260201/26026075/ |
| SG-105 | 本格焼肉 チファジャ 烏丸仏光寺店 | 下京 | 營業中 | Tabelog「Honkaku Yakiniku Chifaja Karasuma bukkoji ten」下京区仏光寺通室町東入釘隠町248-4，最新評論 August, 2026 | A2601/A260201/26021071/ |
| SG-106 | あぶりや 四条河原町駅前店 | 下京 | 營業中 | Tabelog「Aburiya Shijou kawaramachi ekimae ten」下京区河原町通四条下ル順風町305-，最新評論 October, 2026 | A2601/A260201/26029860/ |
| SG-108 | 鬼とうふ | 下京 | 營業中 | Tabelog「Oni Tofu」下京区須浜町647-2，最新評論 October, 2026 | A2601/A260301/26043345/ |
| SG-109 | WIFE&HUSBAND ROASTERY DAUGHTER | 下京 | 營業中 | 下京區鎌屋町22，無店內用餐；2026-06 評論（主店 WIFE&HUSBAND 已搬到北區北大路，是不同的店）；Tabelog「WIFE&HUSBAND ROASTERY DAUGHTER」下京区鎌屋町22，最新評論 June, 2026 | A2601/A260101/26031639/ |
| SG-110 | 原了郭 京都駅八条口店 | 下京 | 營業中 | Tabelog「Hara Ryokaku Kyoto eki hachijoguchi ten」下京区東塩小路高倉町8-3，最新評論 October, 2026 | A2601/A260101/26026055/ |
| SG-111 | 麺屋 猪一 | 下京 | 營業中 | Tabelog「Menya Inoichi」下京区恵美須之町寺町通仏光寺下ル542，最新評論 November, 2026 | A2601/A260201/26032368/ |
| SG-112 | Veg Out | 下京 | 營業中 | Tabelog「Veg Out」下京区稲荷町448，最新評論 May, 2026 | A2601/A260304/26026227/ |
## 3. 建議退役（需使用者決定）

| id | 理由 | 證據 |
|---|---|---|
| SG-084 手打ち蕎麦 実延 | 查兩輪找不到這間店 | Tabelog `sw=実延`、`sw=手打ち蕎麦 松原通` 皆無；WebSearch「実延 蕎麦 京都 下京区」「實延 手打ち蕎麦 京都」皆無。松原通新町東入的蕎麦店是「手打ち蕎麦 井上」（https://tabelog.com/en/kyoto/A2601/A260101/26028498/ ，電話 075-351-9923），但庫內名與它無關聯證據，不可當作已確認；若主席認為是它誤植，改名為「手打ち蕎麦 井上」 |
| SK-075 総本家 ゆどうふ 奥丹南禅寺 | 現況未確認（疑似閉店） | Tabelog 南禅寺店 https://tabelog.com/en/kyoto/A2601/A260301/26001834/ 顯示「掲載保留」（現況未確認）；清水店 https://tabelog.com/en/kyoto/A2601/A260301/26001625/ 的 2026-02 評論寫「南禅寺店は閉店したので清水店へ」。反面るるぶ、LiveJapan 仍列為營業（無日期），官網（okutan.co.jp／okutan.jp）無法連線，無第一手證據。建議：退役，或改為東山區清水店（東山区清水3-340，075-525-2051，評論 2026-02，營業中） |
| SG-069 阿闍梨餅本舗 滿月 | 與 SK-051 重複，且放錯區 | 兩筆都是 Tabelog 同一家「Ajari Mochi Honpo Kyogashi Tsukasa Mangetsu Honten」左京區鞠小路通今出川上ル（075-791-4121），下京區並無滿月分店 |
| SG-095 Len 京都河原町 | 與 SG-086 重複 | 兩筆同為下京區植松町709-3 的「Len」（Backpackers Japan 官方：Len KYOTO KAWARAMACHI，709-3 Uematsucho，https://backpackersjapan.co.jp/kyotohostel/?p=354 ）；Tabelog 無「Len 京都河原町」另址 |

## 4. 建議修正

**改區（營業中，Tabelog 地址不在庫內所列區）**

| id | 庫內 | 應在 | 證據地址 |
|---|---|---|---|
| HY-085 七条ふたば | 東山 | 下京 | 下京区七条通大宮東入大工町120-2 |
| SG-039 七條甘春堂 | 下京 | 東山 | 本店 東山区七条通本町東入ル西ノ門町551（下京區的是 JR 京都伊勢丹店，另一家） |
| SG-061 吉廼家 | 下京 | 北區 | 北区北大路室町西入ル（一休大福的 Yoshinoya） |
| SG-062 さらさ 花遊小路 | 下京 | 中京 | 中京区新京極四条上ル中之町565-13 |
| SG-076 すき焼き 木村 | 下京 | 中京 | 中京区寺町通四条上ル大文字300 |
| SG-077 乙羽 | 下京 | 中京 | 中京区新京極通四条上ル中之町565 |
| SG-094 焼肉 弘 商店 烏丸錦 | 下京 | 中京 | 中京区烏丸通錦小路東入元法然寺町681 |
| SG-097 ACTUAL KYOTO | 下京 | 中京 | 中京区壬生賀陽御所町20-2 |
| SG-102 FUGLEN KYOTO | 下京 | 北區 | 北区紫竹東栗栖町38-3 |
| SG-103 伴奏珈琲店 | 下京 | 上京 | 上京区西町22-5（Banso Coffee Ten）；中京區同名者為掲載保留 |

注意：下京區的「四条通以南」與中京區以四条通為界，SG-062、SG-077 在「四条上ル」側（北側）故屬中京；SG-104 牛角 四条河原町（下京区真町97）、SG-106 あぶりや（下京区河原町通四条下ル）在南側，屬下京，無問題。

**改名／表記（營業中，名稱與 Tabelog 不同；以 Tabelog 日文表記或官方為準，這裡英文版只能看到英文名）**

| id | 庫內 | Tabelog 表記 |
|---|---|---|
| SK-056 聖護院八ッ橋総本店 | | 「聖護院八ッ橋総本店 熊野店」，左京区聖護院山王町16（Shogoin Yatsuhashi Sohonten Kumano ten） |
| SK-100 Ohara River side cafe 来隣 | | Tabelog 名「Kirin」，大原來迎院町114（来隣＝きりん，電話 075-744-2239 與 gltjp 一致） |
| SG-070 寿しのむさし | | 「寿しのむさし 京都駅八条口店」（Sushi no Musashi Kyoto eki hachijoguchi ten） |
| SG-085 Kurasu | | 「Kurasu Kyoto Stand」下京区東油小路町552（另有中京區 Kurasu Ebisugawa 為不同店） |
| SK-051 満月 本店 (阿闍梨餅) | | 括弧是消歧用，正式名為「阿闍梨餅本舗 京菓子司 満月 本店」 |

**庫內描述待查（未動）**：SK-050 進々堂 京大北門前 描述「1930年創業」未在 Tabelog 驗證；SK-075 描述「江戸時代創業」未驗證；SG-029 和久傳 描述 JR 京都伊勢丹11階，與 Tabelog「Kyoto Wakuden」（烏丸通塩小路下ル東塩小路町901 JR京都伊勢丹 11F，電話 050-5597-4012）相符。

## 5. 做法與無法取得的來源

- 取得：`curl -A "Mozilla/5.0" https://tabelog.com/en/kyoto/rstLst/?sw=<店名>`（Tabelog 英文版）取前 4 到 5 筆結果的店名、最寄站、類型、「Listing on hold」標示，並抓前 2 到 3 筆詳情頁取地址、電話。評論列表頁 `.../dtlrvwlst/?SrtT=nd` 取最新造訪月份。腳本放在 scratchpad，未放進 repo。第 1 輪結果 80 筆中 8 筆 0 結果或錯店（SK-075、096、099、100、SG-078、080、084、095），第 2 輪改以簡稱或英文名（奥丹、Akatsuki Coffee、大原山荘、来隣、モリタ屋、やる気 京都駅）解決，其餘（SG-084、SG-095）列為上表處理。
- 搜尋：WebSearch 用於 SK-075、SK-056、SK-096、SK-099、SK-100、SG-084、SG-086／095，結果僅作輔助。
- 抓不到：Tabelog 日文版與 curl 回 403；奥丹官網（www.okutan.co.jp、www.okutan.jp）DNS 無法解析。
- 局限：評論月份來自 Tabelog 評論列表，「營業中」不是現場確認。SK-056 最新評論只到 2025-12，未見閉店標示。
- 未逐筆核對庫內描述細節（如創業年、米其林星數），僅在發現矛盾時列出。

## 主席裁決與處理（2026-11-16，Fable 5.2；依使用者「查不到就退役」）

| 處理 | 對象 | 內容 |
|---|---|---|
| 退役 | SG-084 手打ち蕎麦 実延 | 查兩輪找不到店 |
| 退役 | SK-075 奥丹 南禅寺 | Tabelog 掲載保留，另有評論寫南禅寺店已閉店 |
| 退役（重複） | SG-069 滿月（同 SK-051）、SG-095 Len（同 SG-086） | 同一家店登了兩筆 |
| 改區 | SG-062 → NK-135、SG-076 → NK-136、SG-077 → NK-137、SG-094 → NK-138（中京 A01）；SG-097 → NK-139（中京 A03） | Tabelog 地址在四条通以北或壬生 |
| 改區 | SG-061 吉廼家 → KT-077（北 A12）；SG-039 七條甘春堂 → HY-099（東山 A05）；SG-103 伴奏珈琲店 → KG-086（上京 A02）；HY-085 七条ふたば → SG-113（下京 A04） | 依 Tabelog 地址 |
| 改名（日文） | SG-070 → 寿しのむさし 京都駅八条口店；SG-085 → Kurasu Kyoto Stand | 依 Tabelog 表記 |
| **未處理** | SG-102 FUGLEN KYOTO | 報告說在北區紫竹，但庫內描述寫「鴨川沿い」，兩者對不上；下一批複查地址後再改 |
| 未處理（低優先） | SK-056、SK-100、SK-051 的店名細節 | 不影響身分 |

全庫 801 → 797。檢查：`validate_data.js --strict` ERROR 0／WARN 0；`npm run lint` exit 0；`npm test` 126/126、6/6。
