# Job-Portfolio Site v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Roy Shao's single-page, English-only job-hunting portfolio site with Astro, shipped as a Docker-static deployable that Roy runs on his own host + domain.

**Architecture:** Astro 5 static output, zero JS framework runtime. All copy/data lives in one typed module (`src/data/site.ts`); components render from it. Case detail = in-page accordion with `#case-<id>` deep links. Custom CSS design tokens (no Tailwind). Tests = `node:test` assertions against built `dist/index.html` + asset manifest (HTML is the deliverable, so it is the test surface).

**Tech Stack:** Astro 5, TypeScript, @fontsource/inter + @fontsource/jetbrains-mono, sharp (astro:assets), vanilla TS for accordion/reveal, node:22-alpine + nginx-unprivileged multi-stage Docker, docker compose.

**Spec:** `/workspace/artifacts/portfolio-site/docs/2026-11-17-personal-site-design.md` (read it with this plan; all copy values below are verbatim from it)

## Global Constraints

- Repo root: `/workspace/artifacts/portfolio-site` (git init in Task 1; assets already in `assets/img/`)
- Sandbox has Node v26 + npm + playwright chromium; **no docker CLI** — Docker artifacts are verified by static review + Roy runs build on host (final acceptance).
- All site copy is **English**. Author identity for commits: `Roy <roych.shao@gmail.com>` + trailer `Co-authored-by: Hermes Agent <noreply@nousresearch.com>`.
- Never include on the site: phone number, LinkedIn, resume download, blog section, testimonials, thesis source-code link, `dcTrack-regression`, `question_generation`.
- GitHub links = exactly the 6 pinned repos: `hermes-agent-k8s-config`, `hermes-multi-agent-sdlc`, `Sunbird-Container-Observability-Project`, `TANET2023-JPetStore-OpenTelemetry`, `AttackMonitor`, `chatApp` (under `https://github.com/roychshao/`).
- Contact = `mailto:roych.shao@gmail.com` + `https://github.com/roychshao` + `https://medium.com/@roych.shao`.
- Thesis DOI link: `https://doi.org/10.6342/NTU202603218`.
- Performance budget: page JS < 30 KB after minify; every `<img>` has width/height + below-fold images `loading="lazy"`; fonts `font-display: swap`.
- Lighthouse (mobile preset) Performance ≥ 90.

## File Structure

```
portfolio-site/
├── src/
│   ├── data/site.ts            # ALL content: profile, nav, hero, cases, honors, writing, skills, contact, timeline (single source)
│   ├── components/             # Nav, Hero, CaseList, CaseDetail, HonorsWriting, About, Footer, SkillPill, Icons(.astro inline SVG)
│   ├── layouts/BaseLayout.astro# <head>: meta/canonical/OG from SITE, font imports, global.css
│   ├── pages/index.astro       # composes all sections in block order
│   ├── scripts/main.ts         # accordion toggle + hash deep-link + IntersectionObserver reveal
│   └── styles/global.css       # design tokens (:root custom props) + utilities
├── public/fonts handled by @fontsource (no public/ copies)
├── assets/img/                 # 8 curated images (already in place; moved to src/assets/ in Task 2)
├── tests/site.test.mjs         # node:test, reads dist/index.html + dist file listing
├── astro.config.mjs            # site from process.env.SITE, output static
├── Dockerfile  nginx.conf  docker-compose.yml  README.md
```

## Review Focus

- **JS disabled / failed** → page must still show all text and images (hidden states gated on `.js` class added by main.ts).
- **Mobile 375 px width** → no horizontal scroll; nav collapses to logo + menu button.
- **Banned strings** (`+886`, `linkedin`, `resume`, `blog`) must not appear anywhere in dist — privacy decisions from spec.
- **Deep link on cold load** (`/#case-sunbird`) → that accordion opens; other two closed.
- **Single source drift** → metrics/links render only from `site.ts`; any hardcoded copy in `.astro` files is a defect.

---

### Task 1: Scaffold + git baseline

**Files:**
- Create: git repo + `package.json`, `astro.config.mjs`, `tsconfig.json`, `.gitignore`, `src/pages/index.astro` (placeholder)
- Create: `tests/site.test.mjs` (first assertion only)

**Interfaces:**
- Produces: npm scripts `dev`, `build`, `preview`, `test` (`node --test tests/`); `npm run build` emits `dist/`.

- [ ] Step 1: `git init`; write failing test `test build produces index.html` asserting `dist/index.html` exists and contains `<title>Roy Shao` — run `node --test tests/`, expect FAIL.
- [ ] Step 2: scaffold minimal Astro 5 (`npm create astro@latest . -- --template minimal --no-git --install`), pin config: `output: 'static'`, `site: process.env.SITE ?? 'http://localhost:4321'`; add scripts incl. `test`.
- [ ] Step 3: `npm run build`; test passes. Commit `feat: scaffold Astro 5 static site` (author/trailer per constraints).

### Task 2: Content data layer (`src/data/site.ts`)

**Files:**
- Create: `src/data/site.ts`
- Modify: `tests/site.test.mjs` (add `test site.ts data invariants` — imports the TS module via `node --experimental-strip-types`, asserts: 3 cases with ids `thesis|sunbird|dcim`; thesis results array contains `mean 0.954`, `96.02%`, `top-3 100%`, `92.08%`, `27/27`; `contact` has exactly email/github/medium and no `phone`/`linkedin` keys; `ghPinned` = the exact 6 names from constraints)

**Interfaces:**
- Produces:
```ts
export interface Case { id: string; title: string; tagline: string; badges: string[];
  techTags: string[]; links: { label: string; url: string }[];
  body: { challenge: string; approach: { title: string; text: string }[];
          results: { metric: string; label: string }[] } }
export const profile, nav, hero, cases: Case[], honors, writing, skills, contact, timeline, ghPinned: string[]
```
`hero`: name `Roy Shao (Ching-Hsiang Shao)`, status pill `NTU CSIE MS · Software Engineer`, sub `Building useful things with code — from systems observability to LLM agents.`, CTAs `View Work` / `Get in touch`.
`cases[0]` (thesis): links = DOI only. `cases[1]` (sunbird): link = repo + badges `3 demos · 3 source branches`. `cases[2]` (dcim): link = GitHub profile; badges `100+ Cypress E2E · adopted as lab standard`; no images.
- Move `assets/img/` → `src/assets/img/` (git mv) so astro:assets can process it; `_manifest.json` stays at `assets/` path.

- [ ] Step 1: Write failing data-invariants test (above); run, expect FAIL (module missing).
- [ ] Step 2: Write `site.ts` with all values from spec §已定案補充 + §頁面結構; `git mv` images. Run test → PASS. Commit `feat: typed single-source site content`.

### Task 3: BaseLayout + design tokens + fonts + SEO

**Files:**
- Create: `src/layouts/BaseLayout.astro`, `src/styles/global.css`
- Modify: `package.json` (+`@fontsource/inter @fontsource/jetbrains-mono sharp`), `src/pages/index.astro` (wrap in BaseLayout)
- Test additions: dist HTML contains 1 `canonical` + `og:title` + `twitter:card`; contains `font-display:swap` in inlined/linked CSS; JS files in dist total < 30 KB.

**Interfaces:**
- Produces: `<BaseLayout title desc>` slot renders full document; tokens: `--c-primary:#2563eb --c-ink:#0f172a --c-muted:#64748b --c-bg:#f8fafc --c-card:#fff --radius:14px --font-sans:'Inter' --font-mono:'JetBrains Mono'`; utility classes `.pill .card .section-title`; reveal contract: `.js .reveal{opacity:0;translate:0 12px}` + `.reveal.is-visible{...}` (hidden only under `.js`).

- [ ] Step 1: failing test (above). [ ] Step 2: install deps; write layout + global.css. [ ] Step 3: build → PASS. Commit `feat: base layout, design tokens, fonts, SEO head`.

### Task 4: Nav + Hero

**Files:** `src/components/Nav.astro`, `Hero.astro`; modify `index.astro`, `tests/site.test.mjs`.

- Test: dist contains sticky-pill nav with links `#work #about #contact`; hero shows name, status pill, both CTAs, and 1 optimized `<img>` of `about-portrait` (astro:assets output) with width/height.
- Nav: `>_ Roy Shao` wordmark (mono) + links + GitHub/Mail icons (inline SVG in `Icons.astro`); mobile: menu button toggling `aria-expanded`.

- [ ] failing test → implement → build PASS → commit `feat: nav + hero`.

### Task 5: Work section + accordion + deep links + reveal script

**Files:** `src/components/CaseList.astro`, `CaseDetail.astro`, `src/scripts/main.ts`; test additions.

**Interfaces:** Produces `main.ts`: adds `.js` to `<html>`; `button[data-case-toggle]` toggles `aria-expanded` + sibling `[data-case-panel]`; on `hashchange`/load, opens `#case-<id>` and closes others; IntersectionObserver reveals `.reveal` (unobserve after reveal). Markup contract: `section#work > article[data-case-id] > header > button[data-case-toggle]` + `div[data-case-panel]`.

- Tests: 3 `article[data-case-id]` with correct ids; each panel contains its `results` metrics (e.g. `96.02%`) and thesis panel contains DOI link + the similarity-dist image; sunbird panel contains its 3 images; dcim panel contains none of `img/`; `main.ts` compiled size < 30 KB; `js/` hidden-state test: grep global.css that `.reveal` opacity:0 only appears under a `.js` selector.

- [ ] failing tests → implement → build → PASS → commit `feat: case accordion with deep links and scroll reveal`.

### Task 6: Honors & Writing + About + Contact/Footer

**Files:** `src/components/HonorsWriting.astro`, `About.astro`, `Footer.astro`; index.astro; tests.

- Tests: TANET banner (title + `Best Paper` + repo link); exactly 2 Medium links from `writing`; About shows `about-bg.jpg` as background img, skill pills from `skills`, timeline includes `Hermes Agent` and `2026 — NTU CSIE MS`; footer © 2026 + `mailto:`; banned-strings test: `dist/index.html` + all dist assets contain none of `+886`, `908`, `linkedin`, `resume`, `blog` (case-insensitive).

- [ ] failing tests → implement → build → PASS → commit `feat: honors, writing, about, footer`.

### Task 7: Image pipeline + performance pass

**Files:** `astro.config.mjs` (assets: `{ endpoints: true }` default ok), case image usage in components; tests.

- Tests: every `<img>` in dist has `width` `height` and (`loading="lazy"` or hero LCP image with `fetchpriority="high"`); dist contains `.webp` variants and no source `.png` larger than 300 KB copied to dist.
- Manual: `npx serve dist` + lighthouse CI run
  `npx lighthouse http://127.0.0.1:4321 --preset=perf --quiet --chrome-flags='--no-sandbox'` (point `CHROME_PATH` at playwright chromium); record score. If < 90: fix (image sizes, font subsetting) and rerun.

- [ ] failing tests → implement → build → PASS + Lighthouse ≥ 90 → commit `perf: image optimization, budget pass`.

### Task 8: Docker deployables + README

**Files:** `Dockerfile`, `nginx.conf`, `docker-compose.yml`, `README.md`; tests addition `test docker artifacts well-formed` (Dockerfile has 2 FROM stages, build stage passes `ARG SITE`, nginx.conf has `gzip on`, `location ~* \.(webp|png|jpg|js|css|woff2)$` with `Cache-Control`, no `80` privileged port — nginx-unprivileged listens 8080; compose has `build.args.SITE: ${DOMAIN:-https://example.com}` and `ports: "8080:8080"`).

Dockerfile:
```
FROM node:22-alpine AS build
ARG SITE=https://example.com
ENV SITE=$SITE
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
```
README: exact host commands (`DOMAIN=... docker compose up -d --build`, curl self-check, paste-back for Hermes port-probe verification).

- [ ] failing test → write files → PASS → commit `feat: docker deployables + host runbook`.

### Task 9: End-to-end verification + 30-second test

- [ ] Serve dist (node http server), desktop 1280 + mobile 375 playwright screenshots of every section; check no horizontal scroll (mobile `scrollWidth === clientWidth`).
- [ ] Cold deep-link `/#case-sunbird` opens right panel.
- [ ] 30-sec test with fresh subagent: show hero screenshot 30 s, ask who/what/best-work/contact — fix copy gaps found.
- [ ] `git log` review: clean history; final commit any fixes.
