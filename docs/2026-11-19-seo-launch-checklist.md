# SEO 上線時待辦(2026-11-19 掃描產出)

內容掃描與修正已完成(見下方 diff 於 2026-11-19 commit)。以下項目**依賴正式網域**,等 Roy 說「上線了 + 網域」後由 agent 執行:

1. `SITE=https://<domain> npm run build`(或 compose 的 `DOMAIN=`)— canonical/og:url/JSON-LD url 會自動跟著換,現在 dist 裡是 localhost 佔位
2. `public/robots.txt` 補 `Sitemap: https://<domain>/sitemap.xml`
3. 新增 `public/sitemap.xml`(單頁站:root URL + lastmod)
4. `public/llms.txt` 的 `Domain:` 行換真網域
5. 線上複掃:page_checks(真 URL)+ 手機分享預覽(LinkedIn/Discord)確認 og.webp 被抓到
6. 有 LinkedIn 資料後加入 JSON-LD `sameAs`(BaseLayout.astro)

已完成(2026-11-19):
- Person JSON-LD(alumniOf/sameAs/knowsAbout)
- og:image + twitter:card=summary_large_image + og.webp(22.8KB)
- robots.txt / llms.txt(GEO)
- CaseList 縮圖 alt 由資料帶入(修掉兩個 alt="")
- 測試 25/25 通過;內容品質分 93/100(content_quality.py)
