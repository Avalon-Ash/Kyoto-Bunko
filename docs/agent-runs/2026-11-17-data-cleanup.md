# 2026-11-17 資料小修：假座標、YS-045、食處描述

任務：使用者 2026-11-17 同意的三項（交接 §4.6 的待辦整理）／完成
執行：主代理（Opus 5.5），沒有派子代理。分支 `claude/data-1117`（自 `main` `ee7c89d`）。查核日期一律 2026-11-17。

## 1. 拿掉區中心周圍的假座標

- `src/data/map-centers.ts` 的 `getLatLng` 刪除：它在景點沒有座標時，用 ID 雜湊在區中心周圍撒 ±0.005 度（約 500 m）的位置，找不到時回傳京都車站。前者看起來精確、其實是編的；後者會把未知的區默默放到車站。違反 `AGENTS.md` §2「未知資料不得當作精確值」。
- 實際只有 `src/lib/map-clusters.ts` 用到它，而且只走「區中心」那一支，所以畫面不變：叢集改成直接讀 `AREA_CENTERS[areaId]`，找不到就丟錯（`Unknown area centre`），不再落到預設點。沒用到的 `activeId` 參數一併拿掉（`ClusterMap.tsx` 一行、測試兩處）。
- 新增測試：未登記的區不能落到預設點。

## 2. YS-045 三条商店街

商店街不是食處（R9-B 報告：Tabelog 0 筆，因為不是單一店面）。依 schema 檔頭「通道散策路→T_SHOP」改成 `T_SHOP`，標籤 `正餐 名物` → `購物 歷史`（舊東海道沿線）；中日 locale 的 tags 字串同步。

## 3. 食處描述裡沒證實的說法

| ID | 說法 | 結果 | 處理 | 來源 |
|---|---|---|---|---|
| HY-061 菊乃井 本店 | 米其林三星多年 | 證實：2026 年版連續 17 年三星 | 保留 | https://forbesjapan.com/articles/detail/96474 |
| HY-066 いづう | 1781 年創業 | 證實（天明元年） | 保留 | https://www.keihan.co.jp/navi/famous/famous110.html |
| SK-050 進々堂 京大北門前 | 1930 年創業 | 證實（昭和 5 年開店） | 保留 | https://serai.jp/tour/traveljapan/1053792 、https://rurubu.jp/andmore/spot/80026227 |
| HY-058 ぎをん萬屋 | 九條蔥烏龍 | 證實（名物「ねぎうどん」） | 保留 | https://www.mapple.net/article/36775/ 、https://tabelog.com/kyoto/A2601/A260301/26000254/ |
| HY-064 十二段家 本店 | 涮涮鍋發源 | 店方與觀光資料都這樣說（1949 年第二代店主的牛肉水炊き）；原文已是「として知られる」 | 保留 | https://www.gltjp.com/ja/directory/item/16061/ |
| UK-069 平野屋 | 創業 400 年 | 只有媒體說法，分不清是創業還是建物；「創業は江戸時代」有來源。**中文描述原本寫「高雄山中」「川床料理」，地點與料理都錯** | 改成「嵯峨鳥居本、愛宕神社一之鳥居旁，江戶時代經營至今的香魚料理茶屋」 | https://serai.jp/tour/313624 |
| UK-071 うなぎ屋 廣川 | 米其林一星 | 米其林官網京都鰻魚類沒有這家；只有一個無日期的評論站這樣寫 | 刪掉該句；中文的「關東風」也沒來源，一併刪 | https://guide.michelin.com/us/en/kyoto-region/restaurants/unagi-freshwater-eel |
| UK-074 篩月 | Bib Gourmand | 米其林官網有收錄這一頁，但沒有 Bib 或星的標記 | 日文改成「ミシュランガイドにも掲載」；中文原本就是「獲得米其林推薦」，不動 | https://guide.michelin.com/jp/ja/kyoto-region/kyoto/restaurant/shigetsu |
| NK-118 To. | 創作義式、布里歐修做的 crostini | 早午餐 2024 年 1 月開始；招牌是自製火腿布里歐修與 bomboloni；Tabelog 類型是居酒屋／創作（R9-F） | 「創作イタリアン」→「創作料理」，餐點改成有來源的兩樣 | https://www.leafkyoto.net/en/?p=133089 |
| NK-100 ARCHI | 二条城附近 | 不符：中京區壬生高樋町，近西大路（R9-F，Tabelog） | 改成「中京區壬生、靠近西大路通」 | https://tabelog.com/en/kyoto/A2601/A260401/26038903/ |
| NK-127 本家船はしや | 丸太町通、江戶氛圍 | 地點不符：三条大橋西詰（R9-F，Tabelog）；江戶時代的說法沒有來源 | 地點改正、刪江戶那句 | https://tabelog.com/en/kyoto/A2601/A260301/26005884/ |

沒動的：NK-084 河道屋、NK-085 豚しゃぶ英是「哪一家分店」的身分問題，不是描述說法，留給日後。HY-077、店名待修的幾筆（UK-049、UK-085、SG-070、SG-085、SK-100）查看時已經改好。

## 4. 檢查

| 命令 | 結果 |
|---|---|
| `npm run lint` | exit 0 |
| `npx --no-install tsx validate_data.js --strict` | ERROR 0、WARN 0，792 筆 |
| `npm test` | 149／149、17／17 |
| `npm run build` | exit 0 |

地圖畫面沒有重拍：叢集位置在修改前後都是 `AREA_CENTERS[areaId]`，只少了到不了的分支。
