// Site build smoke test: `npm run build` must emit dist/index.html with the page title.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distIndex = path.join(root, 'dist', 'index.html');

test('build produces index.html', () => {
  assert.ok(existsSync(distIndex), 'dist/index.html should exist after npm run build');
  const html = readFileSync(distIndex, 'utf8');
  assert.match(html, /<title>Roy Shao/, 'dist/index.html should contain the <title>Roy Shao ... tag');
});

test('BaseLayout head: canonical, OG, twitter, fonts, JS budget', () => {
  assert.ok(existsSync(distIndex), 'run `npm run build` before `npm test`');
  const html = readFileSync(distIndex, 'utf8');

  // --- exactly one canonical, pointing at the configured site origin
  const canonicals = html.match(/<link[^>]*rel="canonical"[^>]*>/g) ?? [];
  assert.equal(canonicals.length, 1, 'dist/index.html should contain exactly 1 canonical link');
  assert.match(canonicals[0], /href="https?:\/\/[^"]+\/?"/, 'canonical needs an absolute href');

  // --- social/SEO meta
  assert.match(html, /<meta[^>]*property="og:title"[^>]*content="[^"]+"/, 'missing og:title');
  assert.match(html, /<meta[^>]*property="og:description"[^>]*content="[^"]+"/, 'missing og:description');
  assert.match(html, /<meta[^>]*name="twitter:card"[^>]*content="summary/, 'missing twitter:card');
  assert.match(html, /<meta[^>]*name="description"[^>]*content="[^"]+"/, 'missing meta description');

  // --- font-display:swap must survive into the emitted CSS (inlined or linked)
  const distDir = path.join(root, 'dist');
  const cssFiles = [];
  (function walk(dir) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.css')) cssFiles.push(p);
    }
  })(distDir);
  const css = cssFiles.map((f) => readFileSync(f, 'utf8')).join('\n')
    + '\n' + (html.match(/<style[^>]*>[\s\S]*?<\/style>/g) ?? []).join('\n');
  assert.match(css, /font-display:\s*swap/, 'emitted CSS should contain font-display: swap');
  assert.match(css, /@font-face/, 'emitted CSS should contain @font-face rules (self-hosted fonts)');

  // --- design tokens + utility classes + reveal contract (hidden ONLY under .js)
  assert.match(css, /--c-primary:\s*#2563eb/i, 'missing --c-primary token');
  assert.match(css, /--c-ink:\s*#0f172a/i, 'missing --c-ink token');
  assert.match(css, /--c-muted:\s*#64748b/i, 'missing --c-muted token');
  assert.match(css, /--c-bg:\s*#f8fafc/i, 'missing --c-bg token');
  assert.match(css, /--c-card:\s*(#fff|#ffffff)\b/i, 'missing --c-card token');
  assert.match(css, /--radius:\s*14px/, 'missing --radius token');
  assert.match(css, /--font-sans:\s*['"]?Inter/, 'missing --font-sans token');
  assert.match(css, /--font-mono:\s*['"]?JetBrains Mono/, 'missing --font-mono token');
  assert.match(css, /\.pill\b/, 'missing .pill utility');
  assert.match(css, /\.card\b/, 'missing .card utility');
  assert.match(css, /\.section-title\b/, 'missing .section-title utility');
  assert.match(css, /\.js\s+\.reveal\s*\{[^}]*opacity:\s*0/, 'reveal hidden state must be gated on .js');
  assert.match(css, /\.js\s+\.reveal\.is-visible/, 'reveal .is-visible contract missing');
  const revealBare = css.replace(/\.js\s+\.reveal/g, '');
  assert.doesNotMatch(revealBare, /(^|[^.\w])\.reveal\s*\{[^}]*opacity:\s*0/,
    'no un-gated .reveal hidden state (JS-disabled must show content)');

  // --- page JS budget: all emitted JS files total < 30 KB
  const jsFiles = [];
  (function walkJs(dir) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walkJs(p);
      else if (e.name.endsWith('.js')) jsFiles.push(p);
    }
  })(distDir);
  const jsTotal = jsFiles.reduce((n, f) => n + statSync(f).size, 0);
  assert.ok(jsTotal < 30 * 1024, `dist JS is ${(jsTotal / 1024).toFixed(1)} KB — budget is 30 KB`);
});

test('site.ts data invariants', async () => {
  // Node v26 strips TS types natively — import the module directly, no flags.
  const site = await import(new URL('../src/data/site.ts', import.meta.url).href);

  // --- cases: exactly 3, in order, ids thesis|sunbird|dcim
  assert.deepEqual(site.cases.map((c) => c.id), ['thesis', 'sunbird', 'dcim']);
  for (const c of site.cases) {
    for (const k of ['id', 'title', 'tagline', 'badges', 'techTags', 'links', 'body']) {
      assert.ok(k in c, `case ${c.id} missing field ${k}`);
    }
    assert.ok(Array.isArray(c.badges) && c.badges.every((b) => typeof b === 'string'));
    assert.ok(Array.isArray(c.links) && c.links.every((l) => l.label && l.url.startsWith('https://')));
    assert.ok(c.body.challenge.length > 0);
    assert.ok(c.body.approach.length > 0 && c.body.approach.every((s) => s.title && s.text));
    assert.ok(c.body.results.length > 0 && c.body.results.every((r) => r.metric && r.label));
  }

  // --- thesis results carry the Chapter 4 numbers verbatim
  const thesisText = JSON.stringify(site.cases[0].body.results);
  for (const m of ['mean 0.954', '96.02%', 'top-3 100%', '92.08%', '27/27']) {
    assert.ok(thesisText.includes(m), `thesis results should contain "${m}"`);
  }
  // thesis links: DOI only (source code is not public — never imply a repo)
  assert.deepEqual(site.cases[0].links, [{ label: 'Paper (DOI)', url: 'https://doi.org/10.6342/NTU202603218' }]);
  // sunbird links: pinned repo + delivery badge; dcim links: GitHub profile only
  assert.equal(site.cases[1].links[0].url, 'https://github.com/roychshao/Sunbird-Container-Observability-Project');
  assert.ok(site.cases[1].badges.some((b) => b.includes('3 demos · 3 source branches')));
  assert.deepEqual(site.cases[2].links, [{ label: 'GitHub profile', url: 'https://github.com/roychshao' }]);
  assert.ok(site.cases[2].badges.some((b) => b.includes('100+ Cypress E2E · adopted as lab standard')));

  // --- hero copy: exact strings from the brief
  assert.equal(site.hero.name, 'Roy Shao (Ching-Hsiang Shao)');
  assert.equal(site.hero.status, 'NTU CSIE MS · Software Engineer');
  assert.equal(site.hero.sub, 'Building useful things with code — from systems observability to LLM agents.');
  assert.deepEqual(site.hero.ctas.map((c) => c.label), ['View Work', 'Get in touch']);

  // --- contact: exactly email/github/medium, no phone, no linkedin
  assert.deepEqual(Object.keys(site.contact).sort(), ['email', 'github', 'medium']);
  assert.equal(site.contact.email, 'mailto:roych.shao@gmail.com');
  assert.equal(site.contact.github, 'https://github.com/roychshao');
  assert.equal(site.contact.medium, 'https://medium.com/@roych.shao');

  // --- ghPinned: exactly the 6 constraint repos (order-insensitive)
  assert.deepEqual([...site.ghPinned].sort(), [
    'hermes-agent-k8s-config',
    'hermes-multi-agent-sdlc',
    'Sunbird-Container-Observability-Project',
    'TANET2023-JPetStore-OpenTelemetry',
    'AttackMonitor',
    'chatApp',
  ].sort());

  // --- timeline: the 6 rulings from the controller note
  assert.equal(site.timeline.length, 6);
  const tl = JSON.stringify(site.timeline);
  for (const needle of ['NCCU', 'TANET', 'DCIM', 'NTU CSIE MS', 'SE Lab', 'Hermes Agent']) {
    assert.ok(tl.includes(needle), `timeline should mention ${needle}`);
  }

  // --- skills: languages + frameworks + tools from 職涯總覽 §技術棧
  const sk = JSON.stringify(site.skills);
  for (const needle of ['Java', 'Python', 'TypeScript', 'Spring Boot', 'LlamaIndex', 'React', 'OpenTelemetry', 'vLLM', 'Kubernetes', 'Docker', 'Cypress', 'Qdrant']) {
    assert.ok(sk.includes(needle), `skills should include ${needle}`);
  }

  // --- banned-content guard (Global Constraints): nothing forbidden may appear anywhere
  const banned = ['+886', '908 822 007', 'linkedin.com', 'dcTrack-regression', 'question_generation',
    'resume', 'testimonial', 'OpenNCCU', 'privacyidea'];
  const dump = JSON.stringify({ ...site, profile: site.profile, cases: site.cases }).toLowerCase();
  for (const b of banned) {
    assert.ok(!dump.includes(b.toLowerCase()), `site data must never contain banned token "${b}"`);
  }

  // --- single-source-of-truth consistency: repeated copy must derive from the shared constants
  assert.equal(site.hero.name, site.profile.name);
  assert.equal(site.hero.ctas[1].href, `mailto:${site.profile.email}`);
  assert.equal(site.contact.email, `mailto:${site.profile.email}`);
  for (const u of [site.contact.github, site.cases[2].links[0].url]) {
    assert.equal(u, site.profile.github, 'GitHub profile URLs must all equal the shared profile URL');
  }
  for (const u of [site.cases[1].links[0].url, ...site.honors.map((h) => h.url)]) {
    assert.ok(u === site.profile.github || u.startsWith(`${site.profile.github}/`),
      `GitHub URL "${u}" must derive from the shared profile URL`);
  }

  // --- images moved into src/assets for astro:assets (_manifest stays public)
  assert.ok(existsSync(path.join(root, 'src/assets/img/thesis/03-similarity-dist.png')),
    'thesis images should live under src/assets/img/');
  assert.ok(existsSync(path.join(root, 'assets/img/_manifest.json')),
    '_manifest.json should stay at assets/img/');
  assert.ok(!existsSync(path.join(root, 'assets/img/about-portrait.jpg')),
    'images should be gone from assets/img/ after the git mv');
});

test('Task 4: sticky nav renders anchors, wordmark, icons, and mobile toggle', async () => {
  const site = await import(new URL('../src/data/site.ts', import.meta.url).href);
  assert.ok(existsSync(distIndex), 'run `npm run build` before `npm test`');
  const html = readFileSync(distIndex, 'utf8');

  // helper: all emitted CSS (linked files + inline <style>)
  const cssFiles = [];
  (function walk(dir) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.css')) cssFiles.push(p);
    }
  })(path.join(root, 'dist'));
  const css = cssFiles.map((f) => readFileSync(f, 'utf8')).join('\n')
    + '\n' + (html.match(/<style[^>]*>[\s\S]*?<\/style>/g) ?? []).join('\n');

  // --- anchor links straight from nav data, sticky capsule in CSS
  for (const href of ['#work', '#about', '#contact']) {
    assert.match(html, new RegExp(`href="${href}"`), `nav should link ${href}`);
  }
  assert.match(css, /(site-nav|nav-capsule|nav-inner)[^{]*\{[^}]*position:\s*sticky/i,
    'nav CSS should use position: sticky');

  // --- wordmark `>_ Roy Shao` in monospace
  assert.match(html, /&gt;_ Roy Shao|>_ Roy Shao/, 'missing wordmark ">_ Roy Shao"');
  assert.match(css, /wordmark[^{]*\{[^}]*var\(--font-mono\)/i, 'wordmark should use the mono token');

  // --- GitHub + Mail as inline SVG links (no img tags for icons)
  assert.match(html, new RegExp(`href="${site.profile.github.replace(/[/.]/g, '\\$&')}"`),
    'nav should link the GitHub profile');
  assert.match(html, new RegExp(`href="${site.contact.email.replace(/[/.]/g, '\\$&')}"`),
    'nav should link mailto: derived from profile.email');
  const svgs = html.match(/<svg\b[^>]*>/g) ?? [];
  assert.ok(svgs.length >= 2, 'GitHub and Mail icons should be inline <svg> elements');

  // --- mobile hamburger button with aria-expanded + toggle script present
  assert.match(html, /<button[^>]*aria-expanded="false"/, 'missing menu button with aria-expanded');
  assert.match(html, /aria-controls="[^"]+"/, 'menu button should reference the panel via aria-controls');
  assert.match(html, /aria-expanded/, 'toggle script should manipulate aria-expanded');

  // --- JS budget including inline scripts: dist .js files + <script> bodies < 30 KB
  const jsFiles = [];
  (function walkJs(dir) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walkJs(p);
      else if (e.name.endsWith('.js')) jsFiles.push(p);
    }
  })(path.join(root, 'dist'));
  const inlineJs = (html.match(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g) ?? [])
    .reduce((n, s) => n + s.replace(/^<script[^>]*>|<\/script>$/g, '').length, 0);
  const jsTotal = jsFiles.reduce((n, f) => n + statSync(f).size, 0) + inlineJs;
  assert.ok(jsTotal < 30 * 1024, `page JS (files + inline) is ${(jsTotal / 1024).toFixed(1)} KB — budget is 30 KB`);
});

// --- Task 5 helpers: isolate one case's <article> region in the emitted HTML
function articleChunks(html) {
  const ids = ['thesis', 'sunbird', 'dcim'];
  const starts = ids.map((id) => html.indexOf(`data-case-id="${id}"`));
  starts.forEach((i, k) => assert.ok(i > -1, `article[data-case-id="${ids[k]}"] missing`));
  const workEnd = html.indexOf('</section>', starts[2]);
  const ends = [starts[1], starts[2], workEnd];
  const out = {};
  ids.forEach((id, k) => { out[id] = html.slice(starts[k], ends[k]); });
  return out;
}
// split an article chunk into its toggle-button part and its panel part
function panelOf(chunk) {
  const i = chunk.indexOf('data-case-panel');
  assert.ok(i > -1, 'article should contain a [data-case-panel]');
  return chunk.slice(i);
}
const unesc = (s) => s
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'");

test('Task 5: work section — 3 case accordions with panels, metrics, images, links', async () => {
  const site = await import(new URL('../src/data/site.ts', import.meta.url).href);
  assert.ok(existsSync(distIndex), 'run `npm run build` before `npm test`');
  const html = unesc(readFileSync(distIndex, 'utf8'));

  // --- section#work with heading and reveal class
  assert.match(html, /<section[^>]*id="work"/, 'missing section#work');
  assert.match(html, /<section[^>]*id="work"[^>]*class="[^"]*\breveal\b/, 'section#work should carry .reveal');

  // --- markup contract: exactly 3 articles, ids in data order
  const ids = [...html.matchAll(/<article[^>]*data-case-id="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(ids, ['thesis', 'sunbird', 'dcim'], 'expected 3 article[data-case-id] in order');
  assert.equal((html.match(/<article[^>]*class="[^"]*\breveal\b/g) ?? []).length, 3,
    'each case article should carry .reveal');

  const chunks = articleChunks(html);
  for (const c of site.cases) {
    const chunk = chunks[c.id];

    // --- header > button[data-case-toggle] + div[data-case-panel]
    assert.match(chunk, /<header[^>]*>[\s\S]*?<button[^>]*data-case-toggle[^>]*aria-expanded="false"[^>]*aria-controls="case-panel-/i,
      `${c.id}: header should hold the toggle button (collapsed by default)`);
    assert.match(chunk, /<\/button>\s*<div[^>]*data-case-panel[^>]*role="region"[^>]*aria-labelledby="case-toggle-/i,
      `${c.id}: panel div[data-case-panel] must follow the button in header, role=region`);
    assert.match(panelOf(chunk).slice(0, 300), /\bhidden\b/, `${c.id}: panel must render hidden server-side`);

    // --- card summary: title, tagline, badges, techTags all from data
    assert.ok(chunk.includes(c.title), `${c.id}: title should render`);
    assert.ok(chunk.includes(c.tagline), `${c.id}: tagline should render`);
    for (const b of [...c.badges, ...c.techTags]) {
      assert.ok(chunk.includes(b), `${c.id}: badge/techTag "${b}" should render`);
    }

    // --- panel: challenge, approach steps, every results metric + label
    const panel = panelOf(chunk);
    assert.ok(panel.includes(c.body.challenge), `${c.id}: challenge should render in panel`);
    for (const s of c.body.approach) {
      assert.ok(panel.includes(s.title) && panel.includes(s.text), `${c.id}: approach step "${s.title}" should render`);
    }
    for (const r of c.body.results) {
      assert.ok(panel.includes(r.metric) && panel.includes(r.label), `${c.id}: result "${r.metric}" should render`);
    }
    for (const l of c.links) {
      assert.ok(panel.includes(l.url) && panel.includes(l.label), `${c.id}: link "${l.label}" should render in panel`);
    }

    // --- images inside the panel (astro:assets processed, lazy, dimensioned)
    const panelImgs = panel.match(/<img\b[^>]*>/g) ?? [];
    for (const tag of panelImgs) {
      assert.match(tag, /\bwidth="\d+"/, `${c.id}: panel img needs width`);
      assert.match(tag, /\bheight="\d+"/, `${c.id}: panel img needs height`);
      assert.match(tag, /loading="lazy"/, `${c.id}: below-fold panel img must be lazy`);
    }
    if (c.id === 'thesis') {
      assert.equal(panelImgs.length, 3, 'thesis panel should embed its 3 images');
      assert.match(panel, /<img\b[^>]*similarity-dist/, 'thesis panel must contain the similarity-dist image');
      assert.ok(panel.indexOf('similarity-dist') < panel.indexOf('02-pipeline') ||
        panel.indexOf('similarity-dist') < panel.indexOf('dcim-architecture'),
        'similarity-dist should lead the thesis panel (prominent)');
    }
    if (c.id === 'sunbird') {
      assert.equal(panelImgs.length, 3, 'sunbird panel should embed its 3 images');
      for (const f of ['arch-traces', 'collector-pipeline', 'fluentd-routing']) {
        assert.ok(panel.includes(f), `sunbird panel should contain ${f} image`);
      }
    }
    if (c.id === 'dcim') {
      // hidden-dcim-img ruling: dcim has no images at all
      assert.ok(!/<img\b/.test(panel), 'dcim panel must contain zero <img>');
      assert.ok(!panel.includes('img/'), 'dcim panel must reference no img/ asset');
      assert.match(chunk, /case-stat/, 'dcim card should use a text/stat visual instead of a thumbnail');
    }
  }

  // --- thumbnails: thesis/sunbird cards carry one before the panel; dcim carries none
  for (const id of ['thesis', 'sunbird']) {
    const buttonPart = chunks[id].slice(0, chunks[id].indexOf('data-case-panel'));
    assert.equal((buttonPart.match(/<img\b/g) ?? []).length, 1, `${id} card should show one thumbnail`);
    assert.doesNotMatch(buttonPart, /loading="eager"|fetchpriority="high"/, `${id} thumbnail must be lazy`);
  }
});

test('Task 5: main.ts — js class, deep links, reveal and nav sync compiled into dist', () => {
  assert.ok(existsSync(distIndex), 'run `npm run build` before `npm test`');
  const html = readFileSync(distIndex, 'utf8');

  // --- no-flash: html.js is added by an inline snippet inside <head>
  const head = html.slice(0, html.indexOf('</head>'));
  assert.match(head, /classList\.add\((["'])js\1\)/, 'head should add the js class before paint');

  // --- fail-open without JS: panels (and mobile taglines) render regardless of hidden attr
  const cssFiles = [];
  (function walkCss(dir) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walkCss(p);
      else if (e.name.endsWith('.css')) cssFiles.push(p);
    }
  })(path.join(root, 'dist'));
  const css = cssFiles.map((f) => readFileSync(f, 'utf8')).join('\n')
    + '\n' + (html.match(/<style[^>]*>[\s\S]*?<\/style>/g) ?? []).join('\n');
  assert.match(css, /:not\(\.js\)[^,{]*\.case-panel(\[[^\]]+\])*\[hidden\][^{]*\{[^}]*display:\s*(block|flex)/,
    'without html.js, hidden case panels must still render (plan: JS-disabled shows all text/images)');

  // --- deep-link anchors resolve to elements even without JS
  for (const id of ['thesis', 'sunbird', 'dcim']) {
    assert.match(html, new RegExp(`id="case-${id}"`), `#case-${id} anchor target should exist`);
  }

  // --- compiled behavior: emitted .js bundles plus inline module scripts
  // (Astro inlines small module scripts directly into the HTML)
  const jsFiles = [];
  (function walk(dir) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.js')) jsFiles.push(p);
    }
  })(path.join(root, 'dist'));
  const inlineScripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const js = jsFiles.map((f) => readFileSync(f, 'utf8')).join('\n') + '\n' + inlineScripts.join('\n');
  assert.match(js, /data-case-toggle/, 'accordion wiring missing from bundle');
  assert.match(js, /data-case-panel/, 'panel wiring missing from bundle');
  assert.match(js, /aria-expanded/, 'toggle should keep aria-expanded');
  assert.match(js, /hashchange/, 'deep links should listen for hashchange');
  assert.match(js, /#case-/, 'deep links should parse #case-<id>');
  assert.match(js, /IntersectionObserver/, 'scroll reveal should use IntersectionObserver');
  assert.match(js, /unobserve/, 'revealed elements should be unobserved');
  assert.match(js, /is-visible/, 'reveal should add is-visible');
  // Task 4 deferred a11y minors: focus-within aria-expanded sync + Escape-to-close
  assert.match(js, /focusin|focusout/, 'nav should sync aria-expanded on focus moves');
  assert.match(js, /Escape/, 'nav menu should close on Escape');

  // --- main.ts compiled size stays small (page-wide budget covered above)
  let mainBundleBytes = 0;
  for (const f of jsFiles) {
    if (readFileSync(f, 'utf8').includes('data-case-toggle')) mainBundleBytes = statSync(f).size;
  }
  if (!mainBundleBytes) {
    const inline = inlineScripts.find((s) => s.includes('data-case-toggle'));
    assert.ok(inline, 'the accordion bundle should be emitted (file or inlined module)');
    mainBundleBytes = Buffer.byteLength(inline);
  }
  assert.ok(mainBundleBytes < 30 * 1024,
    `main.ts compiled is ${(mainBundleBytes / 1024).toFixed(1)} KB — budget is 30 KB`);
});

test('Task 4: hero renders from data with eager optimized portrait (LCP)', async () => {
  const site = await import(new URL('../src/data/site.ts', import.meta.url).href);
  const html = readFileSync(distIndex, 'utf8');

  // --- all hero copy comes from site.ts (no hardcoded component text)
  assert.ok(html.includes(site.hero.status), 'hero.status pill text should render');
  assert.ok(html.includes(site.hero.name), 'hero.name should render');
  assert.ok(html.includes(site.hero.sub), 'hero.sub should render');
  assert.match(html, /<h1[^>]*>[\s\S]*?👋[\s\S]*?<\/h1>/, 'h1 should include the waving hand');
  assert.match(html, /class="[^"]*\bpill\b[^"]*"[^>]*>[\s\S]*?NTU CSIE MS/,
    'status should sit in a .pill element');

  // --- CTAs: both labels, first anchors #work, second is the derived mailto
  assert.deepEqual(site.hero.ctas.map((c) => c.href), ['#work', `mailto:${site.profile.email}`]);
  for (const cta of site.hero.ctas) assert.ok(html.includes(cta.label), `missing CTA label "${cta.label}"`);
  assert.ok(html.includes(`href="mailto:${site.profile.email}"`), 'missing derived mailto CTA');

  // --- exactly one portrait <img> from astro:assets, eager + dimensioned (LCP image)
  const imgs = html.match(/<img\b[^>]*>/g) ?? [];
  const portrait = imgs.filter((t) => /about-portrait/.test(t));
  assert.equal(portrait.length, 1, 'expected exactly one about-portrait <img>');
  const tag = portrait[0];
  const w = +(tag.match(/\bwidth="(\d+)"/) ?? [])[1];
  const h = +(tag.match(/\bheight="(\d+)"/) ?? [])[1];
  assert.ok(w > 0 && w <= 900, `portrait width ${w} should be >0 and <=900`);
  assert.ok(h > 0 && Math.abs(h - (w * 1477 / 1108)) <= 2,
    `portrait height ${h} should match source aspect ratio at width ${w}`);
  assert.match(tag, /fetchpriority="high"/, 'LCP portrait must have fetchpriority="high"');
  assert.doesNotMatch(tag, /loading="lazy"/, 'hero portrait must not be lazy-loaded');
  assert.match(tag, /alt="[^"]+"/, 'portrait needs non-empty alt text');
});


