# 設計文件：求職個人網站 v1

日期：2026-11-17 ｜ 狀態：待 Roy 確認
素材來源：vault `40-職涯/職涯總覽.md`、`01-關於我.md`；專案筆記 `30-專案/求職個人網站.md`

## 意圖與 why

邵靖翔（Roy Shao）要一個求職用個人網站，目標受眾是純軟體公司（外商佳）的 recruiter / 工程師面试官，職缺方向全端 / DevOps / AI software & solution，定位 new grad（NTU 資工所 2026-08 畢業）。網站要在訪客停留的 ~30 秒內回答：你是誰、你做什麼、你最好的作品、怎麼聯絡你——目的是換到一個面試。

## 目標

1. 30 秒 test：hero 一眼給出姓名 + 定位（Observability · Microservices · LLM Agents）+ 兩個 CTA。
2. 3 個精選 case（problem → 做法 → 量化結果）：
   - 碩論：stage-based LLM pipeline，自然語言 → DCIM 查詢，真實系統驗證
   - Sunbird：K8s telemetry Push/Pull PoC，交付 3 支 demo + 3 個 source branch
   - DCIM 回歸測試：100+ Cypress E2E 成為實驗室持續驗證標準（不配圖，用圖表/文字視覺）
3. 榮譽：TANET 2023 Best Paper（第一作者）；寫作：Medium 兩篇內嵌連結。
4. 聯絡僅 email + GitHub + Medium（不放電話 / LinkedIn / 表單）。
5. 手機版完好；Lighthouse Performance ≥ 90（單頁、無框架 runtime）。
6. 本地端以 Docker 驗證成功：`docker-compose.yml` + 多階段 Dockerfile，靜態輸出由 nginx 提供，端口 / 域名可配置，供 Roy 之後部署到 host。

## 非目標（v1 明確不做）

Blog 區塊、Resume 下載、Testimonials、聯絡表單、多頁面路由、個人跳舞經歷、OpenNCCU（後兩項素材未補，留 v2）。

## 反目標（做錯方向的重點）

- 長得像 template（Astro 官方 portfolio 模板原樣改字）
- 淪為靜態履歷頁（無故事、無視覺、純條列）
- 重動畫拖慢載入或手機卡頓

## 限制 / 已定案（Roy）

- 技術：**Astro**（static output）。
- 託管：Roy 自有 domain，部署在自家 host（Roy 自己上線）；我只負責產出 Docker 部署物 + 本地驗證。
- 沙箱無 docker daemon：本地驗證 = `astro build` + 靜態伺服模擬 nginx  stage + 瀏覽器實測（桌面/手機 viewport）；`docker build` 與 compose 的最終執行由 Roy 在 host 跑，我再以端口探測驗證。
- 結構：單頁式，參考 `design-ref-portfolio.png`（膠囊導覽列、卡片/圓角元件系統、`>_` 品牌符、藍色主色、light 主題），但**少插畫、無 Blog 區塊**——hero 右欄不採 3D 插畫，改用 Roy 提供的山城背影照。
- 圖片資產：已萃取完成，`assets/img/{thesis,sunbird}/` 各 3 張 + About 2 張（`about-portrait.jpg` 進 hero 圓角色塊、`about-bg.jpg` 進 About 區背景），共 8 張已入專案（見 `assets/img/_manifest.json`）。

## 我做的決定（Roy 未指定，可否決）

| 決定 | 理由 |
|---|---|
| CSS 用手寫 design tokens（自訂屬性 + 一層薄 utility），不引 Tailwind | 單頁站依賴越少越快；anti-templated 原則要求自己的視覺語言 |
| 字型：Inter（本檔 self-host）+ JetBrains Mono（`>_` 與技術標籤點綴） | 與參考圖調性一致，等寬字呼應開發者品牌 |
| 每個 case 以頁內展開（accordion/overlay）呈現 problem→做法→結果，不出新路由 | 維持單頁式；深鏈接用 #anchor 支援 |
| 圖片輸出 WebP + 原 PNG fallback，lazy-load 非首屏圖 | Lighthouse ≥ 90 |
| 動效：僅 scroll-reveal（IntersectionObserver）+ hover 微位移，無滾動庫 | 反目標「重動畫」 |
| Dockerfile：node:22 Multi-stage build → nginx:alpine + 非 root + gzip + 靜態快取 header；compose 只暴露端口，反代/HTTPS 留給 Roy 的 host 現有架構 | 部署物乾淨，權限最小 |
| 文案語氣：專業但第一人稱有聲音（非被動式履歷體） | interactive-portfolio：_show, don't tell_ |

## 頁面結構（block 順序）

1. Nav（膠囊）：`>_ Roy Shao`｜Work / About / Contact｜GitHub、Email 圖示
2. Hero：綠點標籤「NTU CSIE MS · Software Engineer」→ 大標「Hi, I'm Roy Shao 👋」→ 副標一句（systems → AI agents）→ CTA「View Work」+「Get in touch」｜右：頭貼/山城照置圓角色塊
3. Selected Work：3 張 case 卡（縮圖、名稱、一句話、量化結果徽章、tech tags）→ 頁內展開 detail
4. Honors & Writing：TANET Best Paper 橫幅卡 + Medium 兩篇連結卡
5. About：左自介故事（NCCU→NTU→業界→研究，一小段）＋技能膠囊；右台北/ email / 履歷亮點時間線
6. Footer：© 2026 Roy Shao ｜ `>_` 重複品牌

## Builder check 已補的決定（2026-11-17 subagent 審查後，皆屬我拍板）

- case 展開用 accordion + `#anchor` 深鏈（不用 overlay）
- design tokens 依參考圖語感自建（主色近 `#2563EB` 系）；icon 用 Lucide 線性圖示；nav sticky
- repo 連結：以「已定案補充」為準 = profile pinned 6 支（取代先前「只掛確認公開的」寫法）
- 碩論 case 徽章 = Chapter 4 真實評估數據（見已定案補充；皆出自公開論文，非未公開數字）
- Hermes Agent 經歷進 About 時間線一條，不進 case 區
- OG meta / canonical 的 domain 用佔位變數，compose 留 `DOMAIN=` 給 host 部署時填

## 已定案補充（Roy 2026-11-17）

- **語言：全英文。**
- **GitHub repo 連結：只掛 profile pinned 的 6 支**（已從 github.com/roychshao 實際核對）：`hermes-multi-agent-sdlc`、`hermes-agent-k8s-config`、`Sunbird-Container-Observability-Project`、`TANET2023-JPetStore-OpenTelemetry`、`AttackMonitor`、`chatApp`。
- **碩論 source code 未公開（Roy 確認）**：case 只掛 DOI 連結（10.6342/NTU202603218），不放 repo；不寫代碼連結也不暗示有。
- **碩論 case 寫詳細，含 Chapter 4 完整評估數據**（出自公開論文，可直接引用）：
  - Setup：308 筆真實 DCIM 使用者查詢 + 人工標註 use case specs；Gemma-4-31B-it（vLLM @ NVIDIA DGX Spark，temp 0.0）
  - Reasoning step quality：regenerated spec similarity **mean 0.954 / median 0.966**（n=308, σ=0.030）
  - Controller method matching（929 steps）：語意檢索 top-10 **96.02%**；加 keyword 後 top-1 **95.05%**、top-3 **100%**
  - Computation operation matching（3,348 steps）：top-10 **92.08%**；加 keyword 後 top-1 **100%**
  - Final reply（key-data set 比對）：格式一致組 **27/27 pass（100%）**
  - 視覺：已萃取的 similarity 分布圖（`assets/img/thesis/03-similarity-dist.png`）當結果圖
- **DOMAIN= 的用途（Roy 問）**：不是 CORS——是 Astro 的 `site` 設定，餵 canonical URL + Open Graph/Twitter meta，讓求職者在 LinkedIn/Slack 分享網站時連結預覽正確；build 時帶 `DOMAIN=` 即可。static 站資源同 origin，本身不需要 CORS。

## 驗收

1. 桌面 + 手機 viewport 截圖 Roy 確認
2. 30 秒 test（陌生視角）
3. Lighthouse（build 後本地跑）
4. Roy host 上 `docker compose up -d` 後我探測端口 200 + 資源完整
