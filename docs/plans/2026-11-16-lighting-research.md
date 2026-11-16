# 光照與包漿研究備忘錄

日期：2026-11-16。性質：只讀研究，沒有渲染、沒有開瀏覽器、沒有編譯。
base：`claude/doha-1116`（`36dbc73`）。ThreeRT：`C:\Git\_ext\ThreeRT`（`edf2768`，見 `docs/agent-runs/2026-11-14-threert-reference.md` §1）。

標記：**[確認]** 讀本機原始碼或文件所得；**[網]** 來自下列網址，我只讀到搜尋摘要或頁面前段，未必逐字核對；**[推測]** 我的推論。

## 結論

1. 「包漿」這一層不該是螢幕濾鏡，也不需要路徑追蹤：它是材質裡的一段運算（有色的清漆：光進出各穿一次，依視角路徑長做 Beer-Lambert 吸收）。three.js r186 的 clearcoat **沒有顏色**，`attenuationColor`／`thickness` **只作用在透射**，所以要自己寫進 `onBeforeCompile`，約十幾行 GLSL。
2. ThreeRT 的清漆只有「量」和「粗糙度」，F0 固定 0.04，沒有顏色、厚度、吸收；沒有正交相機；輸出是成品圖加 diffuse／specular／emission 三張線性訊號，沒有深度、法線、AO、烘焙模式。它是「離線算參考圖」的工具，不是「把光烘進網格」的工具。
3. 「把光算在網格上」對我們最省事的做法是：蓋面用一張**每區一張的遮蔽（AO）圖**，從正上方算好，地的著色器取樣一次；立體部件用頂點 AO。AO 與光源方向、日夜無關，一區一張即可，日夜只在執行時換色。
4. 最值得先做的小實驗：用 ThreeRT 對南區做「白陶土＋均勻天空」的俯視渲染（白模，不含金屬與清漆），當蓋面 AO 圖餵進地的著色器，和現行手調接觸陰影並排比較（§D）。
5. 沒查到：蒔絵（金粉）專用的渲染論文；Safari 上 WebGPU 路徑追蹤的實測；金屬片閃點在手機上的幀時間；glTF `KHR_materials_clearcoat` 是否有顏色欄位（未讀規格，僅 Filament 文件確認其模型無染色）。

## A. ThreeRT 能做什麼

### A1 材質模型

| 問題 | 答案 | 依據 |
|---|---|---|
| 有清漆層？ | 有，一層 GGX，F0 0.04；底層拿到被清漆方向反照率扣掉後的剩餘 | **[確認]** `renderer/shaders/pathtrace.wgsl:1295-1297` |
| 清漆有顏色／吸收／厚度？ | 沒有。描述欄位只有 `clearcoat`、`clearcoatRoughness` | **[確認]** `renderer/src/desc.rs:251-252`；`renderer/src/scene.rs:833`（`layer` 四個數：透射、ior、清漆量、清漆粗糙度）。對 `attenuation` 在 desc.rs／scene.rs／pathtrace.wgsl 搜尋，表面材質沒有對應欄位 |
| 透射？ | 有（透射量、ior、可乘透射貼圖的 R）；無依厚度的體積吸收欄位 | **[確認]** `desc.rs:253-256`、`scene.rs:831-833`、`pathtrace.wgsl:1305` |
| 體積吸收／多層？ | 有「體積網格 `VolumeMesh`」（消光、albedo、發光，用 WGSL 函式定義）與水的「均質介質」旗標（`F_HMEDIA`）；不是材質上的多層 | **[確認]** `packages/scene/src/core.ts:1538-1573`；`pathtrace.wgsl:73` |
| 自寫材質？ | `MaterialFunction`：每個命中點跑一段 WGSL，可改 `base／roughness／metallic／specular／emissive／normal／opacity`；**輸出沒有清漆欄位** | **[確認]** `docs/MATERIAL_FUNCTIONS.md`（Contract 一節） |
| glb 貼圖？ | baseColor、normal、metallicRoughness、emissive、occlusion 貼圖都讀；KHR clearcoat／transmission／ior 只讀係數，清漆貼圖「還沒讀」 | **[確認]** `scene.rs:1937-1958`（含註解 1951-1952） |
| 梨子地這類程序紋理 | 不會跟著 glb 過去（已知限制） | **[確認]** `docs/MAKIE_THREERT_REFERENCE.md:20` 附近 |

要在 ThreeRT 裡做有色清漆，只能在 `MaterialFunction` 裡把 `base` 乘上吸收色當近似；要改清漆本身得改 Rust／WGSL 核心。**[推測]**

### A2 輸出

| 問題 | 答案 | 依據 |
|---|---|---|
| 只出成品圖？ | 成品 PNG，加 `--hdr`（線性 RGB f32 的原始檔）、`--signals PREFIX`（`-diffuse／-specular／-emission.raw`） | **[確認]** `renderer/src/main.rs:3-10, 41-44, 178-179` |
| AOV（深度、法線、albedo、AO、直接／間接分開）？ | `render` 子命令沒有。降噪器內部用 albedo／normal，但不輸出；「view mode」（基色、法線）在即時畫面的 `live` 路徑，`render` 沒有旗標 | **[確認]** `main.rs` 的旗標清單；`docs/ROADMAP.md:2216-2220`（view modes 屬 live 的 pass）。`--signals` 的 diffuse 是否已除以 albedo：沒查到 |
| 烘焙到貼圖／頂點？ | 沒有。README 還明說「沒有 lightmap、不用烘焙」是賣點 | **[確認]** `README.md:36`（「No shadow maps, no light probes, no lightmaps, no baking.」） |
| 正交、正上方？ | 沒有正交相機：在 `packages/` 與 `renderer/src` 搜尋 `ortho` 只有一筆無關的 `any_orthonormal_pair`。現有場景用 4 m 外窄視角（約 6.3 度）逼近 | **[確認]** grep 結果；`scenes/kyoto-plate-minami.ts` 的相機段 |
| 成品圖當蓋面光照貼圖？ | 理論上可（窄視角近似俯視，需要校準與盒身遮擋），但成品圖含視角相關的鏡面反射，要的是 diffuse 訊號或白模渲染 | **[推測]** |

### A3 命令列

`render <bundle.js> -o out.png [--assets DIR] [--state f.json] [--camera JSON] [--spp N] [--width W --height H] [--no-denoise] [--preset name] [--time s] [--hdr out.raw] [--signals PREFIX] [--stats out.json] [--override JSON]`。**[確認]** `main.rs:3-10, 162-179`；`--help` 只印一行用法。降噪：預設 à-trous；OIDN 在條件編譯（`renderer/src/denoise.rs:10, 82, 106`）。本機 11/14 實測：南區 63,310 三角形、1280×720、64 spp、含降噪約 1.1 秒（trace 約 0.23 秒）。**[確認]** `docs/agent-runs/2026-11-14-threert-reference.md` §2。

### A4 硬體光追

- 在 Windows 本機：wgpu 選 **Vulkan**，輸出 `hwrt: true`，adapter RTX 4070；DX12 沒試。**[確認]** `agent-runs/2026-11-14-threert-reference.md` §2。程式取 `EXPERIMENTAL_RAY_QUERY` 特性才用硬體路徑，否則軟體 BVH（`renderer/src/gpu.rs:1529`）。README：「hardware ray queries where the GPU has them (Metal, Vulkan), a software BVH where it does not」（`README.md:132`）。
- 效能數字：官方 Bistro 場景即時 15.5 ms（縮放 0.55）、全解析 40 ms，在 Apple M3 Max；**[確認]** `docs/COMPARE.md:92-93`。與我們無直接關聯。

### A5 瀏覽器版

wasm＋WebGPU；WebGPU 沒有光線查詢，所以走光柵化 G-buffer 的另一條路徑，路線圖列為尚未完成的「步驟 2」。**[確認]** `docs/ROADMAP.md:1470-1476, 3824-3826`；`MAKIE_THREERT_REFERENCE.md:7`（「官方只在 Chrome 跑過 hello world」，Safari／iOS 沒測）。Safari 26 起 WebGPU 預設啟用（iOS 26 含）：**[網]** https://web.dev/blog/webgpu-supported-major-browsers ；二手來源 https://app.cinevva.com/news/2025-09-15-safari-webgpu 。ThreeRT 在 Safari 能否跑：沒查到。

## B. 把光「算在網格上」

### B1 現成工具

| 工具 | 狀態 | 對我們 |
|---|---|---|
| three-gpu-pathtracer | 0.0.24 以前是 WebGL 2、只支援 Standard／Physical 材質（README 未列清漆、衰減、sheen、iridescence），有 `DenoiseMaterial`；v0.0.25 起新增 WebGPU 版並把 WebGL 版標為將移除；v0.0.28（11 月 2 日）要求 three r187，專案是 r186（`node_modules/three/package.json:3`）。 **[網]** https://cdn.jsdelivr.net/npm/three-gpu-pathtracer@0.0.24/README.md ；https://www.github.com/gkjohnson/three-gpu-pathtracer/releases ；https://github.com/gkjohnson/three-gpu-pathtracer （README 稱不穩定） | 用無頭 Chrome＋本機顯卡離線算：專案已有先例（`scripts/plate-fallback-shots.mjs` 用 `--use-angle=d3d11 --enable-gpu` 的無頭 Chrome），但 WebGL 版不吃清漆與 `onBeforeCompile`，只能算「白模的間接光」；無頭 Chrome 跑 WebGPU 版沒試過 |
| 光照貼圖烘焙 | `Three Lightmap Baker`（xatlas-three＋three-mesh-bvh＋three-gpu-pathtracer，示範性質）；three-gpu-pathtracer 有 PR 做 AO（紅）＋厚度（綠）烘焙，是否合併沒查到。 **[網]** https://milk-website-c76.pages.dev/blog/lightmapping-threejs ；https://github.com/gkjohnson/three-gpu-pathtracer/pull/670 | 需要 UV2 的是立體部件；蓋面是平面，不需要 |
| UV2 展開 | `xatlas-three`（wasm＋worker，要求索引幾何）。**[網]** https://npmjs.com/package/xatlas-three | 只在要把部件烘成貼圖時才需要 |
| 頂點 AO | three-mesh-bvh 射線＋自寫迴圈即可；網上沒有現成的 three.js 頂點 AO 烘焙工具。bent normal：three.js 上沒查到現成做法 | 見下 |
| AO 烘焙工具 | Quick AO Lightmapper（three.js 編輯器外掛，WebGL2 光追，授權未查）。**[網]** https://discourse.threejs.org/t/quick-ao-lightmapper-is-now-available-for-three-js-editor/92030.md | 不採用 |

### B2 對我們的情況最省事的做法

事實（**[確認]** `docs/agent-runs/2026-11-14-threert-reference.md` §4 的 L1／L2）：現行網站在部件底部沒有 AO，只有 PCF 陰影與手調的接觸暗部；屋簷底面缺金地反彈光。專案已有「接觸場」貼圖在載入時烘（任務背景）。

**做法一：蓋面俯視 AO 圖（建議先做）。** 蓋面是一張平面加高度場，視角固定為近正交，所以最自然的烘焙座標系就是俯視的 (x, z)，不需要 UV2。
- 內容：只存 AO 一個通道（單色）。AO 不隨光源與日夜變，一區一張，日夜在著色器裡換色。**[推測]**
- 來源兩條：(a) ThreeRT 白模俯視渲染（可含屋簷遮蔽、岩的遮擋，比距離場近似準）；(b) 載入時用現有高度圖與部件足跡在 CPU／GPU 算（零出貨體積，但無法表達屋簷懸挑）。
- 即時成本：地的著色器多一次貼圖取樣。**[推測]**
- 體積（**[推測]**，未實測）：單通道 1024×724 的 WebP 約數十 KB 量級；目前靜態後備圖預算是每張 150 KB（`scripts/plate-fallback-shots.mjs:11`）。十一區一次只載入一區，AO 與日夜無關，所以不用乘二。
- 風險：ThreeRT 沒有正交相機（A2），要用 4 m 外的窄視角並校準到蓋面的 UV；`export-glb.js` 的地是每種材質一色的簡化版，白模不受影響。

**做法二：部件頂點 AO。** 每區 4–12 萬頂點（任務背景）。用 three-mesh-bvh 在 Node 端對每個頂點投半球射線，存一個 byte／頂點（約 40–120 KB／區，**[推測]**）。風險：若部件是載入時程序生成，頂點順序要確定，離線結果才對得上，我沒查生成流程；若難對應，改為載入時在 worker 裡算（無出貨體積，但載入時間要量）。

**不建議：** 為部件展 UV2 並烘光照貼圖。部件小而多，UV2 需要 xatlas 與每區多張貼圖，出貨與載入成本最高，收益主要是 AO，頂點 AO 就能得到。**[推測]**

### B3 出貨體積與載入

十一區 × 日夜：AO 與日夜無關，11 張單色圖；若要連反彈色一併烘，則日夜各一套（22 張，彩色）。數字沒有實測，只能依 B2 的量級估算。**[推測]**

## C. 漆層／包漿

### C1 three.js r186 能做什麼

| 項目 | 結論 | 依據 |
|---|---|---|
| clearcoat 有顏色？ | 沒有。只有 `clearcoat`、`clearcoatRoughness`、對應貼圖與 `clearcoatNormalMap`；清漆 F0 與 F90 在著色器裡固定 | **[確認]** `node_modules/three/src/materials/MeshPhysicalMaterial.js:91-140, 356`；`.../lights_physical_pars_fragment.glsl.js:23-27, 128-137` |
| `attenuationColor`／`thickness` | 只在透射的 `volumeAttenuation`（Beer's law）用到；`transmission` 為 0 時無效 | **[確認]** `MeshPhysicalMaterial.js:280-311`；`.../transmission_pars_fragment.glsl.js:152-163, 173-199` |
| `sheen`、`dispersion`、`anisotropy`、`iridescence` | 都有。`dispersion` 屬透射；本專案已用 `iridescence` 在螺鈿（`three-pack.js:41`） | **[確認]** `MeshPhysicalMaterial.js:75, 225, 357, 449` |
| glTF KHR 擴充 | `KHR_materials_clearcoat` 是否有色：沒查到（Filament 的清漆模型確認只有強度與粗糙度、無染色） | **[網]** https://google.github.io/filament/Filament.md.html |
| OpenPBR | 有 `coat_color`：吸收以 `coat_color` 參數化，視為垂直入射透射率的平方，觀察到的底層色約等於 `coat_color`（進出兩次）；另有 `coat_darkening`（內部多次反射使底層更暗）。2025-12 的 PR 修正了開啟 darkening 時的色相偏移。 **[網]** https://help.autodesk.com/cloudhelp/2027/ENU/Maya-Tech-Docs/Nodes/openPBRSurface.html ；https://arxiv.org/pdf/2512.23696 ；https://github.com/AcademySoftwareFoundation/OpenPBR/pull/253 |

### C2 有色清漆的即時近似（寫法草案，[推測]）

目標：底層（梨子地的金屬片與粉）被透漆染色，且斜看時更深。
1. 清漆表面反射照舊（現有 `clearcoat`）。
2. 底層貢獻（漫射＋底層鏡面）乘 `T = C^{0.5/cosθt(v)} · C^{0.5/cosθt(l)}`：`C` 是 OpenPBR 意義的 `coat_color`（垂直進出兩次後的色），`cosθt = sqrt(1 − (1−cos²θ)/n²)`，`n≈1.5`；視線與光線各穿一次。漫射用光線方向與視線方向，環境鏡面用反射方向。
3. 底層粗糙度與 F0 隨清漆折射改變：Filament 文件給了底層 F0 對清漆界面重算的做法（未調整底層粗糙度）。**[網]** 同上。
4. 成本：每片段一個 `pow`／`exp` 與一個 `sqrt`，加在 `onBeforeCompile` 注入點。

對應文獻：Weidlich & Wilkie 2007（以 Beer-Lambert 衰減與全反射近似的封閉式分層 BRDF，GPU 版有 Elek & Kmoch 2010）；Belcour 2018（以方向統計量的原子運算做分層，著色時映成 BSDF 瓣）。**[網]** https://www.cg.tuwien.ac.at/research/publications/2007/weidlich_2007_almfs/weidlich_2007_almfs-paper.pdf ；https://old.cescg.org/CESCG-2010/papers/ElekOskar.pdf ；https://belcour.github.io/blog/research/publication/2018/05/05/brdf-realtime-layered.html 。Belcour 做法較重，對固定一層透漆的需求，上面的 Beer-Lambert 乘法已足夠，這是我的判斷。

與「專案已有的包漿」的關係：`three-pack.js` 的 `mCoat()`、`M_AGE_*`、`uAge` 已實作一種漆面窗光與老化霧（`three-pack.js:684, 733`），尚未有吸收染色；`docs/plans/2026-11-16-patina.md` 是上一輪作舊的開案書，本備忘錄不重複它。

### C3 梨子地像烤漆

- 金屬片閃點：Deliot & Belcour（HPG 2023／CGF）以二項分佈在各向異性格上算每個像素足跡內的反光片數；Wang、Deng、Holzschuch（2020）的預濾波離散隨機微面元。**[網]** https://ggx-research.github.io/publication/2023/06/09/publication-glints.html ；https://web3.arxiv.org/pdf/2306.05051 。哪些能在手機上跑：沒查到任何幀時間數字。
- 本專案已有「程序化畫金片」的片段著色器（`three-pack.js` `mNashiji`，行 717 起），所以閃點不是缺的東西；缺的是**清漆下的染色與景深感**。**[確認]** 檔案行號。
- 汽車烤漆的角度色變與 IBL：Kneiphof & Klein 的金屬與珠光烤漆即時 IBL（只搜到書目）。**[網]** https://aminer.org/pub/62abf7895aee126c0f655951/real-time-image-based-lighting-of-metallic-and-pearlescent-car-paints

### C4 漆器、蒔絵、金箔

- 沒查到蒔絵（金粉）專用的渲染論文。
- 相近：長野大學對漆器（棗）的反射特性計測與 CG 驗證（限於棗的形狀）。**[網]** https://nagano.repo.nii.ac.jp/record/1184/files/nagano_38-0102-09.pdf ；科研費報告（多波段相機＋旋轉臂的光反射計測、經年劣化的分光反射率變化）https://kaken.nii.ac.jp/file/KAKENHI-PROJECT-21700270/21700270seika.pdf ；金工品「十二の鷹」的分光反射模型（金屬與不均質介電體混合，松田ら）https://ipsj.ixsq.nii.ac.jp/records/101857/export/bibtex ；日本刀的分光反射模型與 GPU 即時繪製（望月ら）https://ipsj.ixsq.nii.ac.jp/record/61330/files/IPSJ-CG09134017.pdf 。以上都只讀到搜尋摘要，沒開全文。

## D. 建議

### 路線排序

| # | 路線 | 效果 | 工作量 | 風險 | 手機 | 出貨 |
|---|---|---|---|---|---|---|
| 1 | 有色清漆（Beer-Lambert）寫進地與部件材質的 `onBeforeCompile` | 對應使用者的「包漿」，且是材質運算不是濾鏡 | 小：0.5–1 天 | 低；要調到不洗掉現有的金色 | 每片段幾個 ALU | 0 |
| 2 | 蓋面俯視 AO 圖（ThreeRT 白模或載入時算） | 補上部件接觸暗部與屋簷下遮蔽（L1） | 中：1–2 天 | 中：ThreeRT 無正交相機要校準 | 多一次取樣 | 約 11 張單色圖 |
| 3 | 部件頂點 AO（three-mesh-bvh） | 補部件內的凹處遮蔽 | 中：1–2 天 | 中：頂點順序對應 | 頂點屬性多一個 | 每區數十 KB（估） |
| 4 | 地面反彈光餵屋簷底面（L2，解析式：`max(-n.y,0)`×地色） | 屋簷底橘光 | 小 | 低 | 幾個 ALU | 0 |
| 5 | 螢幕後製濾鏡包漿 | 不採用：使用者已指出不對，且無法隨視角路徑長變化 | | | | |
| 6 | 把 ThreeRT 接進網站 | 不採用：見 `MAKIE_THREERT_REFERENCE.md:7` | | | | |
| 7 | three-gpu-pathtracer 離線算整張光照 | 不吃 `onBeforeCompile` 材質與清漆，只能算白模間接光；與路線 2 重疊 | 大 | 高 | | |

### 最值得先做的小實驗：路線 1（有色清漆）＋路線 2 的 AO 圖，分兩步，先 1 再 2

**實驗 1（約半天，不需要 ThreeRT）**
- 做什麼：在南區的地材質注入 `T = C^{0.5/cosθt(v)}·C^{0.5/cosθt(l)}`，`C` 先取暖琥珀（如 `#e8c070` 量級，由使用者／美術調），乘到地的梨子地底層貢獻（不乘清漆表面反射）。
- 怎麼判斷成功：同視角截圖並排「改前｜改後」，斜看（拖曳傾斜）時底層明顯比正看更深、更暖；亮度百分位（用 `docs/plans/2026-11-16-patina.md` §1.1 的量法）往照片靠；建築與銀不變色；幀時間不增加（使用者在量幀時間的子代理可以套用同一量法）。

**實驗 2（約 1 天）：蓋面 AO 圖**
- 做什麼：`export-glb.js` 匯出南區，場景把所有材質改白色粗糙非金屬、無清漆、`SkyColor` 均勻環境、不放窗光；相機沿用 4 m 窄視角改為正上方；`--spp 256 --width 2048 --height 1448`，存 `--hdr`；縮成單通道 1024 寬；在地的著色器乘上它（取代部分手調接觸陰影）。
- 怎麼判斷成功：和 11/14 的路徑追蹤參考圖（`C:\Git\_ext\ThreeRT\out\amber2\kyoto-W_MINAMI.png`）並排，岩腳、金堂基壇、金閣底層的暗帶位置與寬度相符；圖檔約數十 KB；換區與日夜不需要重烘。若 AO 圖與蓋面座標對不上，先查校準而不是調強度。
- 失敗時退路：改用載入時用現有高度圖與足跡算（路線 2b），零出貨體積。

### 確認與推測的分界

- **確認**：A 節各表（原始碼行號）、three.js r186 的 clearcoat／attenuation 行為、專案現有的材質與腳本。
- **來自網路摘要、未逐字核對**：OpenPBR 的 `coat_color` 定義、Filament 清漆模型、three-gpu-pathtracer 的版本與要求、Safari WebGPU 狀態、各論文的內容。
- **推測**：所有檔案大小與工時、`C^{0.5/cosθt}` 的組合式（由 OpenPBR 對 `coat_color` 的定義推導，未對照實作驗證）、AO 不隨日夜變、白模俯視渲染能代替光照貼圖、ThreeRT 窄視角校準可行。

### 沒查到

蒔絵專用渲染論文；ThreeRT 在 Safari 能否跑；`--signals` 的 diffuse 是否已去除 albedo；ThreeRT 在 DX12 上是否使用硬體光追（只確認 Vulkan）；金屬片閃點方法在手機上的幀時間；`KHR_materials_clearcoat` 規格本身有無色欄位；three-gpu-pathtracer 無頭 Chrome＋WebGPU 的可行性；three-gpu-pathtracer AO 烘焙 PR 是否合併。
