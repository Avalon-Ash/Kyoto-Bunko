# 來源

## 1. 標記怎麼讀

| 標記 | 指的是 |
|---|---|
| `記:<名>` | Kyoto 專案記憶 `C:\Users\xino_\.claude\projects\C--Git-Kyoto-Bunko\memory\<名>.md` |
| `案:<名> §x` | `C:\Git\Kyoto-Bunko\docs\plans\` 的開案書：`2026-11-16-<名>.md`，`finish` 是 `2026-11-17-finish.md` |
| `MTP §x` | `C:\Git\Kyoto-Bunko\docs\MAKIE_THREE_PLAN.md` |
| `MCP §x` | `C:\Git\Kyoto-Bunko\docs\MAKIE_COMPOSITION_PLAN.md` |
| `HO §x` | `C:\Git\Kyoto-Bunko\docs\HANDOFF.md` |
| 【原話】 | 使用者說的（原話或原話大意，開案書裡有原句） |
| 【文獻】 | 查到的公開來源（下面 §2） |
| 【量測】 | 主代理在實物照片或截圖上量的（例：初音局部的三層亮度 28／54／62–84；照片壓縮過，當方向用） |
| 【解讀】 | 主代理的推論或自訂的數字；換專案要重新判斷 |

techniques.md、review.md 與 pitfalls.md 的括號裡常省略 `案:` 前綴（例：`finish §8`、`doha §10.2`、`coat §7.4`），意思相同。

開案書是依時間寫的紀錄，前面的說法常被後面更正。本 skill 寫的是最後的定案；techniques.md 每節末的「取代了」列出被推翻的舊說法。

## 2. 公開文獻（查核日 2026-11-16，除非另註）

技法與用語
- JAANUS：[maki-e](https://projects.mcah.columbia.edu/jaanus/node/2613)（梨子地、平目地、沃懸地、平塵、高蒔繪、肉合研出）。個別詞條多數 404。
- [Baur 基金會詞彙](https://fondation-baur.ch/en/glossaire-161)、[Kotobank：刑部梨子地](https://kotobank.jp/word/刑部梨子地-3227693)、[Kotobank：平目地](https://kotobank.jp/word/平目地-613860)。
- [維基百科日文版：蒔絵](https://ja.wikipedia.org/wiki/蒔絵)（工序）。

山水硯箱（室町；切金放在哪裡、洲浜、遠山）
- [塩山蒔絵硯箱](https://online.bunka.go.jp/heritages/detail/195796)、[柴垣蔦蒔絵硯箱](https://bunka.nii.ac.jp/heritages/detail/169405)、[比良山蒔絵硯箱](https://online.bunka.go.jp/heritages/detail/207996)（文化遺産オンライン）。

遠山
- [淡交社 TANKO＋：遠山文](https://tankoplus.jp/sado/article-146/)；[皇居三の丸尚蔵館：妙法山遠望図蒔絵巻莨箱](https://collection.shozokan.nich.go.jp/object/SZK003785)（近景盛高、遠景暈蒔細粉）。

初音調度（技法定標，江戶 1639）
- [徳川美術館：初音の調度](https://www.tokugawa-art-museum.jp/collections/初音の調度/)；[文化遺産オンライン：婚礼調度類](https://online.bunka.go.jp/heritages/detail/192763)；[dig-it：初音の調度 技法解說](https://dig-it.media/digit/article/863228/)。

漆與年代
- [島根縣：八雲塗](https://www.pref.shimane.lg.jp/industry/syoko/sangyo/dentou_kougei/kougei/kougei_02.html)（透漆隨年月透明度增加；只讀到搜尋摘要）。
- 京都漆器店（井助商店）的說法：歲月越久透明度越高、顏色越鮮明（記:urushi-clears-with-age，11/17，一次搜尋）。
- [Canadian Conservation Institute：銀的硫化](https://www.canada.ca/en/conservation-institute/services/preventive-conservation/guidelines-collections/metal-objects/understanding-silver-tarnish.html)。

山水裡的建築（布局參考，江戶）
- [The Met Open Access](https://www.metmuseum.org/about-the-met/policies-and-documents/open-access) 的山水印籠，館藏編號 58379、58394、65398（江戶）；58390、58393、58386、58630（館方標江戶或明治）。搜尋 API 用 `/public/collection/v1.1/search`（v1 已停用）。

渲染
- Ďurikovič, Kolchin, Ershov, "Rendering of Japanese Artcraft", Eurographics 2002（[diglib](https://diglib.eg.org/handle/10.2312/egs20021020)）：蒔繪是遮罩混合金屬 BRDF，梨地是吸收層裡的金屬片。
- [three.js MeshPhysicalMaterial](https://threejs.org/docs/pages/MeshPhysicalMaterial.html)。

## 3. 沒查到的

- 沒有來源明說「切金不可用於大面積」；結論來自三件室町實例加使用者的判斷。
- 砂、白砂在蒔繪裡怎麼表現；切金一片的尺寸與排列。
- 專講梨子地漆或溜塗經年變化的資料；漆膜變透的速度（Kyoto 的 150 年時間常數是自訂的）。
- 蒔繪金粉專用的渲染論文。

## 4. 使用者的收藏與本機參考圖

- 使用者自己收藏江戶到昭和的漆器（相簿網址、已知年代、哪幾件是江戶）：見 `記:user-lacquer-collection-album`。江戶的定標是富士三景盃（岩與山）與金銀螺鈿平文櫻的櫛（平文；銀變黑是損傷）。明治的朧若松山水裏鶴蒔繪盃只取遠山的做法。昭和的村雨蒔絵松棗（初代鈴木光入）可當京塗參考。研出梨子地八五重段的技法和江戶不同，不當梨子地定標。
- Kyoto repo 的 `.shots/ref/`（不提交，可能被清掉）存過：初音硯箱蓋面、初音三種地的局部、使用者的遠山盃、塩山與比良山、遠山棗、印籠總覽。清掉了就從上面的網址或請使用者重拍。
