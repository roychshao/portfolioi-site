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

  // --- cases: Work holds exactly 2 (thesis moved to Research)
  assert.deepEqual(site.cases.map((c) => c.id), ['sunbird', 'dcim']);
  // --- research: exactly 3, in order, ids thesis|wu-microservices|tanet
  assert.ok(Array.isArray(site.research), 'site.research (Case[]) should be exported');
  assert.deepEqual(site.research.map((c) => c.id), ['thesis', 'wu-microservices', 'tanet']);
  for (const c of [...site.cases, ...site.research]) {
    for (const k of ['id', 'title', 'tagline', 'badges', 'techTags', 'links', 'figures', 'body']) {
      assert.ok(k in c, `case ${c.id} missing field ${k}`);
    }
    assert.ok(Array.isArray(c.badges) && c.badges.every((b) => typeof b === 'string'));
    assert.ok(Array.isArray(c.links) && c.links.every((l) => l.label && l.url.startsWith('https://')));
    assert.ok(c.body.challenge.length > 0);
    assert.ok(c.body.approach.length > 0 && c.body.approach.every((s) => s.title && s.text));
    assert.ok(c.body.results.length > 0 && c.body.results.every((r) => r.metric && r.label));
  }

  // --- figures: alt prose lives in site.ts (components hold only key→import maps
  // and render widths); counts per case must be sunbird 3 / dcim 0 / thesis 3 /
  // wu 0 / tanet 0 (document order: cases then research)
  assert.deepEqual([...site.cases, ...site.research].map((c) => c.figures.length), [3, 0, 3, 0, 0],
    'figures counts should be sunbird 3 / dcim 0 / thesis 3 / wu 0 / tanet 0');
  for (const c of [...site.cases, ...site.research]) {
    assert.ok(c.figures.every((f) => typeof f.key === 'string' && f.key && typeof f.alt === 'string' && f.alt),
      `case ${c.id}: every figure needs a non-empty key and alt`);
    assert.equal(new Set(c.figures.map((f) => f.key)).size, c.figures.length,
      `case ${c.id}: figure keys must be unique`);
  }
  // the similarity-dist alt restates headline stats — it must carry the same
  // derived values as results, not a second hand-typed copy
  {
    const simAlt = site.research[0].figures[0].alt;
    const res = site.research[0].body.results;
    const n = res[0].metric.replace(/^n=/, '');
    const mean = res[1].metric.replace(/^mean /, '');
    const median = res[1].label.match(/median ([\d.]+)/)[1];
    assert.ok(simAlt.includes(`over ${n} real DCIM queries`) &&
      simAlt.includes(`mean ${mean}`) && simAlt.includes(`median ${median}`),
      'similarity alt must interpolate n/mean/median from the results source values');
  }

  // --- thesis results carry the Chapter 4 numbers verbatim
  const thesisText = JSON.stringify(site.research[0].body.results);
  for (const m of ['mean 0.954', '96.02%', 'top-3 100%', '92.08%', '27/27']) {
    assert.ok(thesisText.includes(m), `thesis results should contain "${m}"`);
  }
  // thesis links: DOI only (source code is not public — never imply a repo)
  assert.deepEqual(site.research[0].links, []); // thesis TDR DOI withdrawn from public repo (2026-11) — no dead links
  // --- wu-microservices: base thesis is the senior's; Roy's role credited precisely
  {
    const wu = JSON.stringify(site.research[1]);
    assert.ok(wu.includes('Dong-Hong Wu'), 'wu item must name the senior thesis author');
    assert.ok(/propos/i.test(wu) && /aggregate root/i.test(wu) && /one-to-one/.test(wu) && /one-to-many/.test(wu),
      'wu item must credit Roy for proposing aggregate-root inference from entity relationships (1:1, 1:N)');
    assert.ok(/responsible|owned|my part/i.test(site.research[1].body.approach.map((s) => s.text).join(' ') + JSON.stringify(site.research[1].body.results)) && wu.includes('repack'),
      'wu item must state Roy was responsible for the repack part');
    assert.ok(wu.includes('first master') || wu.includes('MS year 1'),
      'wu item must place Roy\u2019s continuation in his first master\u2019s year');
    // same depth as the thesis item: full challenge/approach/results accordion
    assert.ok(site.research[1].body.challenge.length > 40, 'wu challenge should be substantive');
    assert.ok(site.research[1].body.approach.length >= 3, 'wu item needs the same accordion depth as the thesis item');
    assert.ok(site.research[1].body.results.length >= 3, 'wu results: factual deliverables, not a one-liner');
    // links: the note's single public pointer is the base thesis DOI (verified to resolve
    // to NTU TDR); no repo, no invented URLs
    assert.deepEqual(site.research[1].links, [{ label: 'Base Thesis (DOI)', url: 'https://doi.org/10.6342/NTU202503749' }]);
    assert.ok(!wu.includes('github.com'), 'wu item must not imply a public repo');
    // no invented numbers: metrics stay qualitative (facts in the note carry none)
    assert.ok(!/\d+\.\d+%|\d+\/\d+/.test(JSON.stringify(site.research[1].body.results)),
      'wu results must not invent quantitative metrics \u2014 the source note has none');
  }
  // --- tanet: Best Paper badge + first author + pinned repo link
  {
    const tanet = JSON.stringify(site.research[2]);
    assert.ok(site.research[2].badges.some((b) => b.includes('Best Paper')), 'tanet item must badge the Best Paper award');
    assert.ok(tanet.includes('first author'), 'tanet item must state first authorship');
    assert.deepEqual(site.research[2].links, [{ label: 'Source (GitHub)', url: 'https://github.com/roychshao/TANET2023-JPetStore-OpenTelemetry' }]);
    assert.ok(site.research[2].body.approach.length >= 3 && site.research[2].body.results.length >= 2,
      'tanet item gets the full accordion depth too');
    assert.ok(!/\d+\.\d+%/.test(JSON.stringify(site.research[2].body.results)),
      'tanet results must not invent numbers \u2014 the source note has none');
  }
  // sunbird links: pinned repo + delivery badge; dcim links: GitHub profile only
  assert.equal(site.cases[0].links[0].url, 'https://github.com/roychshao/Sunbird-Container-Observability-Project');
  assert.ok(site.cases[0].badges.some((b) => b.includes('3 demos \u00b7 3 source branches')));
  assert.deepEqual(site.cases[1].links, [{ label: 'GitHub profile', url: 'https://github.com/roychshao' }]);
  assert.ok(site.cases[1].badges.some((b) => b.includes('100+ Cypress E2E \u00b7 adopted as lab standard')));

  // --- nav: exactly 4 links, Research inserted between Work and About
  assert.deepEqual(site.nav.links.map((l) => l.label), ['Work', 'Research', 'About', 'Contact']);
  assert.deepEqual(site.nav.links.map((l) => l.href), ['#work', '#research', '#about', '#contact']);

  // --- hero copy: exact strings from the brief
  assert.equal(site.hero.name, 'Roy Shao (Ching-Hsiang Shao)');
  assert.equal(site.hero.status, 'NTU CSIE MS · Software Engineer');
  assert.equal(site.hero.availability, 'Open to new grad roles');
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

  // --- Task 6 copy homes: about story, writing section title, footer strings
  assert.ok(Array.isArray(site.about.story) && site.about.story.length >= 1,
    'about.story should be a non-empty array of paragraphs');
  assert.ok(site.about.story.every((p) => typeof p === 'string' && p.trim().length > 40),
    'about.story paragraphs should be substantive prose');
  assert.ok(typeof site.about.imageAlt === 'string' && site.about.imageAlt.trim().length > 0,
    'about.imageAlt should be non-empty');
  assert.ok(typeof site.about.skillsLabel === 'string' && site.about.skillsLabel.trim().length > 0,
    'about.skillsLabel should be a non-empty string (accessible name for the skill-pills region)');
  assert.equal(site.writingSection.title, 'Writing');
  assert.ok(!('honors' in site), 'honors export removed — the TANET honor lives in the research badge + timeline, not a banner');
  assert.ok(!('honorsWriting' in site), 'honorsWriting export removed with the Honors & Writing section');
  assert.equal(site.footer.brand, '>_');
  assert.equal(site.footer.copyright, `© 2026 ${site.profile.name.split(' (')[0]}`);
  assert.deepEqual(site.footer.contactLinks.map((l) => l.href),
    [site.contact.email, site.contact.github, site.contact.medium],
    'footer contact links must derive from the single contact source');
  assert.deepEqual(site.footer.contactLinks.map((l) => l.label),
    ['roych.shao@gmail.com', 'github.com/roychshao', 'medium.com/@roych.shao'],
    'contact pill labels must be the visible handles (copyable without clicking)');

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
  // 'resume'/'résumé' dropped from the banned list: owner decision 2026-11-18
  // adds a résumé download (site.resume is now legitimate site data).
  const banned = ['+886', '908 822 007', 'linkedin.com', 'dcTrack-regression', 'question_generation',
    'testimonial', 'OpenNCCU', 'privacyidea'];
  const dump = JSON.stringify({ ...site, profile: site.profile, cases: site.cases }).toLowerCase();
  for (const b of banned) {
    assert.ok(!dump.includes(b.toLowerCase()), `site data must never contain banned token "${b}"`);
  }

  // --- single-source-of-truth consistency: repeated copy must derive from the shared constants
  assert.equal(site.hero.name, site.profile.name);
  assert.equal(site.hero.ctas[1].href, `mailto:${site.profile.email}`);
  assert.equal(site.contact.email, `mailto:${site.profile.email}`);
  for (const u of [site.contact.github, site.cases[1].links[0].url]) {
    assert.equal(u, site.profile.github, 'GitHub profile URLs must all equal the shared profile URL');
  }
  for (const u of [site.cases[0].links[0].url, site.research[2].links[0].url]) {
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
  for (const href of ['#work', '#research', '#about', '#contact']) {
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
// (ids given in document order across the work + research sections)
function articleChunks(html, ids) {
  const starts = ids.map((id) => html.indexOf(`data-case-id="${id}"`));
  starts.forEach((i, k) => assert.ok(i > -1, `article[data-case-id="${ids[k]}"] missing`));
  const lastEnd = html.indexOf('</section>', starts[starts.length - 1]);
  const ends = [...starts.slice(1), lastEnd];
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

  // --- markup contract: exactly 5 accordions across work(2)+research(3), ids in data order
  const ids = [...html.matchAll(/<article[^>]*data-case-id="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(ids, ['sunbird', 'dcim', 'thesis', 'wu-microservices', 'tanet'],
    'expected 2 work + 3 research article[data-case-id] in order');
  assert.equal((html.match(/<article\b(?=[^>]*data-case-id)(?=[^>]*class="[^"]*\breveal\b)[^>]*>/g) ?? []).length, 5,
    'each case article should carry .reveal');

  const chunks = articleChunks(html, ids);
  for (const c of [...site.cases, ...site.research]) {
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
    // --- panel img alts are the site.ts figure alts, interpolated at render
    for (const f of c.figures) {
      assert.ok(panel.includes(`alt="${f.alt}"`),
        `${c.id}: panel img should carry the site.ts figure alt for "${f.key}"`);
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
    if (!c.figures.length) {
      // no-figure ruling: dcim/wu/tanet ship zero images and use the stat visual
      assert.ok(!/<img\b/.test(panel), `${c.id} panel must contain zero <img>`);
      assert.ok(!panel.includes('img/'), `${c.id} panel must reference no img/ asset`);
      assert.match(chunk, /case-stat/, `${c.id} card should use a text/stat visual instead of a thumbnail`);
    }
  }

  // --- thumbnails: figure-carrying cards (sunbird work, thesis research) show one
  // before the panel; the no-figure cards show the stat visual instead
  for (const id of ['thesis', 'sunbird']) {
    const buttonPart = chunks[id].slice(0, chunks[id].indexOf('data-case-panel'));
    assert.equal((buttonPart.match(/<img\b/g) ?? []).length, 1, `${id} card should show one thumbnail`);
    assert.doesNotMatch(buttonPart, /loading="eager"|fetchpriority="high"/, `${id} thumbnail must be lazy`);
  }

  // --- single-source rule: components embed no prose — no literal (non-empty) alt
  // strings anywhere in src/components/*.astro; alt must be interpolated (alt={...})
  const compsDir = path.join(root, 'src', 'components');
  for (const f of readdirSync(compsDir, { withFileTypes: true }).filter((e) => e.isFile() && e.name.endsWith('.astro'))) {
    const compSrc = readFileSync(path.join(compsDir, f.name), 'utf8');
    assert.doesNotMatch(compSrc, /\balt\s*[:=]\s*(["'])[^"']+\1/,
      `${f.name} hardcodes a literal alt string — figure alt prose belongs in site.ts`);
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

  // --- deep-link anchors resolve to elements even without JS (5 cards across work+research)
  for (const id of ['sunbird', 'dcim', 'thesis', 'wu-microservices', 'tanet']) {
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
  // responsive srcset (Task 7): the render cap lives in the srcset descriptors,
  // the width/height attributes carry the intrinsic size for aspect-ratio boxes
  const w = +(tag.match(/\bwidth="(\d+)"/) ?? [])[1];
  const h = +(tag.match(/\bheight="(\d+)"/) ?? [])[1];
  assert.ok(w > 0, `portrait width ${w} should be >0`);
  assert.ok(h > 0 && Math.abs(h - (w * 1477 / 1108)) <= 2,
    `portrait height ${h} should match source aspect ratio at width ${w}`);
  const srcsetWidths = [...(tag.match(/\b(\d+)w\b/g) ?? [])].map((m) => parseInt(m));
  assert.ok(srcsetWidths.length > 0, 'portrait should ship a responsive srcset');
  assert.ok(Math.max(...srcsetWidths) <= 900,
    `portrait srcset cap ${Math.max(...srcsetWidths)}w should be <=900`);
  assert.match(tag, /fetchpriority="high"/, 'LCP portrait must have fetchpriority="high"');
  assert.doesNotMatch(tag, /loading="lazy"/, 'hero portrait must not be lazy-loaded');
  assert.match(tag, /alt="[^"]+"/, 'portrait needs non-empty alt text');
});


// --- Task 6 helper: isolate one top-level <section id="..."> block
function sectionChunk(html, id) {
  const m = new RegExp(`<section[^>]*id="${id}"`).exec(html);
  assert.ok(m, `section#${id} missing from dist/index.html`);
  const end = html.indexOf('</section>', m.index);
  assert.ok(end > -1, `section#${id} unclosed`);
  return html.slice(m.index, end);
}

test('Research section — 3 accordion items: own thesis, senior-thesis continuation, TANET', async () => {
  const site = await import(new URL('../src/data/site.ts', import.meta.url).href);
  assert.ok(existsSync(distIndex), 'run `npm run build` before `npm test`');
  const html = unesc(readFileSync(distIndex, 'utf8'));

  assert.match(html, /<section[^>]*id="research"/, 'missing section#research');
  assert.match(html, /<section[^>]*id="research"[^>]*class="[^"]*\breveal\b/, 'section#research should carry .reveal');
  const researchLink = site.nav.links.find((l) => l.href === '#research');
  assert.ok(researchLink && researchLink.label === 'Research', 'nav should carry the Research label');
  const chunk = sectionChunk(html, 'research');
  assert.match(chunk, /section-title[^>]*>Research<\/h2>/, 'research heading comes from the nav label');
  const rids = [...chunk.matchAll(/<article[^>]*data-case-id="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(rids, ['thesis', 'wu-microservices', 'tanet'], 'research holds 3 accordions in order');

  // own thesis moved over intact: Chapter-4 numbers + DOI link
  assert.ok(!chunk.includes('https://doi.org/10.6342/NTU202603218'), 'withdrawn thesis DOI must not be linked');
  assert.ok(chunk.includes('mean 0.954') && chunk.includes('27/27'), 'thesis Chapter-4 metrics should render in research');
  // senior-thesis continuation: authored by Dong-Hong Wu, Roy's role explicit, verified DOI only
  assert.ok(chunk.includes('Dong-Hong Wu'), 'research should name the senior thesis author');
  assert.ok(/aggregate root/i.test(chunk) && /one-to-one/.test(chunk) && /one-to-many/.test(chunk),
    'Roy\u2019s aggregate-root-from-entity-relationships proposal should render');
  assert.ok(chunk.includes('https://doi.org/10.6342/NTU202503749'), 'senior thesis carries its public NTU DOI');
  assert.ok(!/case-wu-microservices[\s\S]*?github\.com/.test(chunk.slice(chunk.indexOf('case-wu-microservices'))
      .slice(0, chunk.slice(chunk.indexOf('case-wu-microservices')).indexOf('data-case-id="tanet"'))),
    'wu item must not link any repo');
  // TANET: best-paper badge + pinned repo
  assert.ok(chunk.includes('Best Paper'), 'TANET best paper badge should render in research');
  assert.ok(chunk.includes('github.com/roychshao/TANET2023-JPetStore-OpenTelemetry'), 'tanet repo link should render');

  // Work keeps only the two project cases
  const workChunk = sectionChunk(html, 'work');
  assert.ok(!workChunk.includes('data-case-id="thesis"'), 'thesis must be gone from Work');
  assert.doesNotMatch(workChunk, /doi\.org/, 'no DOI links should remain in Work');
});

test('Task 6: writing — section renamed, exactly 2 Medium article links, no honors banner', async () => {
  const site = await import(new URL('../src/data/site.ts', import.meta.url).href);
  assert.ok(existsSync(distIndex), 'run `npm run build` before `npm test`');
  const html = unesc(readFileSync(distIndex, 'utf8'));

  assert.match(html, /<section[^>]*id="writing"/, 'missing section#writing');
  assert.match(html, /<section[^>]*id="writing"[^>]*class="[^"]*\breveal\b/, 'section#writing should carry .reveal');
  assert.doesNotMatch(html, /id="honors-writing"/, 'the Honors & Writing section must be gone');
  assert.doesNotMatch(html, /honor/i, 'no honor-banner markup or copy should remain anywhere');

  const chunk = sectionChunk(html, 'writing');
  assert.ok(chunk.includes(site.writingSection.title), 'writing title should render from site.ts');

  // --- exactly the 2 writing articles, each linked once, title+date rendered
  for (const w of site.writing) {
    assert.ok(chunk.includes(`href="${w.url}"`), `writing link missing: ${w.url}`);
    assert.equal(html.split(w.url).length - 1, 1, `writing URL should appear exactly once: ${w.url}`);
    assert.ok(chunk.includes(w.title) && chunk.includes(w.date), `writing card "${w.title}" incomplete`);
  }
  const mediumLinks = [...html.matchAll(/href="(https:\/\/medium\.com[^"]*)"/g)].map((m) => m[1]);
  assert.deepEqual(mediumLinks.sort(),
    [...site.writing.map((w) => w.url), site.contact.medium].sort(),
    'medium.com links should be exactly the 2 articles + the profile pill');

  // --- TANET honors: research badge + About timeline only, never a Writing banner
  assert.doesNotMatch(chunk, /Best Paper/, 'Best Paper must not appear in the Writing section');
  assert.ok(sectionChunk(html, 'research').includes('Best Paper'), 'Best Paper lives in the Research item');
  assert.ok(sectionChunk(html, 'about').includes('Best Paper'), 'Best Paper lives in the About timeline');
});

test('Task 6: about — story, bg image, skill pills, timeline', async () => {
  const site = await import(new URL('../src/data/site.ts', import.meta.url).href);
  const html = unesc(readFileSync(distIndex, 'utf8'));

  assert.match(html, /<section[^>]*id="about"[^>]*class="[^"]*\breveal\b/,
    'section#about should exist and carry .reveal');
  const chunk = sectionChunk(html, 'about');

  for (const p of site.about.story) {
    assert.ok(chunk.includes(p), 'about story paragraph should render from site.ts');
  }

  // --- about-bg.jpg: exactly one, astro:assets-optimized, dimensioned, lazy
  const imgs = (chunk.match(/<img\b[^>]*>/g) ?? []).filter((t) => /about-bg/.test(t));
  assert.equal(imgs.length, 1, 'expected exactly one about-bg <img> in About');
  assert.match(imgs[0], /\bwidth="\d+"/, 'about-bg img needs width');
  assert.match(imgs[0], /\bheight="\d+"/, 'about-bg img needs height');
  assert.match(imgs[0], /loading="lazy"/, 'about-bg img must be lazy (below fold)');
  assert.ok(imgs[0].includes(`alt="${site.about.imageAlt}"`), 'about-bg alt text should come from site.ts');

  // --- skill pills from all three skills groups
  for (const s of [...site.skills.languages, ...site.skills.frameworks, ...site.skills.tools]) {
    assert.ok(chunk.includes(s), `skill pill "${s}" should render`);
    assert.match(chunk, new RegExp(`class="[^"]*\\bpill\\b[^"]*"[^>]*>${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
      `skill "${s}" should sit in a .pill element`);
  }

  // --- skills region: real accessible name from data (role + aria-label),
  //     never hardcoded prose in the component (all-copy-from-site.ts rule)
  const pillsTag = (chunk.match(/<div[^>]*class="[^"]*skill-pills[^"]*"[^>]*>/) ?? [])[0];
  assert.ok(pillsTag, 'skill-pills container div should exist');
  assert.match(pillsTag, /role="group"/, 'skill-pills region needs an explicit landmark role');
  assert.ok(pillsTag.includes(`aria-label="${site.about.skillsLabel}"`),
    'skill-pills aria-label should be the site.ts about.skillsLabel value');
  assert.doesNotMatch(readFileSync(path.join(root, 'src/components/About.astro'), 'utf8'),
    /aria-label\s*=\s*["']/, 'About.astro must not hardcode aria-label prose');

  // --- timeline: every entry, incl. Hermes Agent + NTU + NCCU markers
  for (const t of site.timeline) {
    assert.ok(chunk.includes(t.title) && chunk.includes(t.period) && chunk.includes(t.org),
      `timeline entry "${t.title}" should render with period and org`);
  }
  assert.ok(chunk.includes('Hermes Agent'), 'timeline should include the Hermes Agent entry');
  assert.ok(chunk.includes('NTU CSIE MS'), 'timeline should include NTU CSIE MS');
  assert.ok(chunk.includes('NCCU'), 'timeline should include NCCU');
});

test('Task 6: contact section + footer', async () => {
  const site = await import(new URL('../src/data/site.ts', import.meta.url).href);
  const html = unesc(readFileSync(distIndex, 'utf8'));

  assert.match(html, /<section[^>]*id="contact"/, 'missing section#contact (nav anchor target)');
  // --- structure ruling: section#contact lives INSIDE <main>; only the
  //     <footer> element sits outside it, after </main> (document order).
  const mainOpen = html.indexOf('<main');
  const mainClose = html.indexOf('</main>');
  const contactPos = html.search(/<section[^>]*id="contact"/);
  const footerPos = html.lastIndexOf('<footer');
  assert.ok(mainOpen > -1 && mainClose > mainOpen, 'expected a single <main>…</main> span');
  assert.ok(contactPos > mainOpen && contactPos < mainClose,
    'section#contact must be rendered inside <main>');
  assert.ok(footerPos > mainClose, 'the <footer> element must come after </main>');
  const chunk = sectionChunk(html, 'contact');
  for (const l of site.footer.contactLinks) {
    assert.ok(chunk.includes(`href="${l.href}"`), `contact pill link missing: ${l.href}`);
    assert.ok(chunk.includes(l.label), `contact pill label missing: ${l.label}`);
  }
  assert.ok(chunk.includes(`href="mailto:${site.profile.email}"`), 'contact must expose the derived mailto');

  const foot = html.slice(html.lastIndexOf('<footer'));
  assert.ok(foot.includes(site.footer.copyright), 'footer should render the © line from site.ts');
  assert.ok(foot.includes('© 2026'), 'footer should show © 2026');
  assert.ok(foot.includes(site.footer.brand), 'footer should repeat the >_ brand mark');
  // --- brand link: non-empty accessible name from data (WCAG 4.1.2) — the
  //     aria-hidden span alone computed an empty name. Note: the label value
  //     contains a raw `>` (legal in quoted attrs), so match <a> tags with
  //     quoted regions atomic, not [^>]*.
  const brandTag = (foot.match(/<a(?:[^>"]|"[^"]*")*>/g) ?? []).find((t) => /class="[^"]*footer-brand/.test(t));
  assert.ok(brandTag, 'footer brand link missing');
  assert.ok(brandTag.includes(`aria-label="${site.nav.brand}"`),
    'footer brand link needs a non-empty aria-label derived from nav.brand');
  for (const l of site.nav.links) {
    assert.ok(foot.includes(`href="${l.href}"`), `footer should repeat nav link ${l.href}`);
  }
});

test('Task 6: banned strings swept from every dist text file', () => {
  // Global Constraints privacy sweep: phone fragments, LinkedIn and blog
  // must not appear anywhere human-readable in the build output.
  // 'resume' removed from the list — owner decision 2026-11-18 ships a résumé
  // download, so the filename/href in HTML is expected, not a leak.
  // The textExt allow-list is the binary guard: rasters (.jpg/.png/.webp) and
  // now the résumé PDF are skipped — they're excluded by never being added.
  assert.ok(existsSync(distIndex), 'run `npm run build` before `npm test`');
  const banned = ['+886', '908', 'linkedin', 'blog'];
  const textExt = new Set(['.html', '.css', '.js', '.map', '.svg', '.txt', '.json']);
  const files = [];
  (function walk(dir) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (textExt.has(path.extname(e.name).toLowerCase())) files.push(p);
    }
  })(path.join(root, 'dist'));
  // Task 7 (build.inlineStylesheets: 'always'): when every style/script is
  // inlined into the single HTML document, there may be no emitted .css/.js
  // files left — then index.html itself is the complete human-readable output.
  const coverageOk =
    files.length >= 2 ||
    (files.length === 1 && /<style[\s>]/.test(readFileSync(distIndex, 'utf8')));
  assert.ok(coverageOk,
    'sanity: the sweep must cover dist/index.html plus every emitted text asset (or those assets are inlined into the HTML)');
  for (const f of files) {
    const hay = readFileSync(f, 'utf8').toLowerCase();
    for (const b of banned) {
      assert.ok(!hay.includes(b), `${path.relative(root, f)} contains banned string "${b}"`);
    }
  }
});

test('30-second test: hero availability pill + copyable contact handles render in dist', async () => {
  const site = await import(new URL('../src/data/site.ts', import.meta.url).href);
  const html = unesc(readFileSync(distIndex, 'utf8'));

  // Availability text renders from data (dot sits on this pill, not status).
  assert.ok(html.includes(site.hero.availability),
    'hero.availability text should render in dist');
  assert.match(html, /class="[^"]*\bdot\b[^"]*"[^>]*>[^<]*<\/span>\s*Open to new grad roles/,
    'the status dot should precede the availability copy');

  // Contact pills expose copyable handle text, not generic labels.
  const chunk = sectionChunk(html, 'contact');
  for (const l of site.footer.contactLinks) {
    assert.ok(chunk.includes(l.label), `contact handle label missing: ${l.label}`);
  }
  assert.ok(site.footer.contactLinks.some((l) => l.label.includes('@') && l.label.includes('.')),
    'contact labels should include @ handle forms');
});

test('Résumé download: hero pill + contact button render from site.resume, PDF ships byte-identical', async () => {
  // Owner decision 2026-11-18 supersedes the earlier "no resume download" ban.
  const site = await import(new URL('../src/data/site.ts', import.meta.url).href);
  assert.ok(existsSync(distIndex), 'run `npm run build` before `npm test`');

  // --- single source: site.ts owns the résumé descriptor
  assert.equal(site.resume.href, '/Ching-Hsiang-Shao-Resume-2026-11.pdf',
    'resume.href must be the exact public/ path');
  assert.ok(site.resume.label && site.resume.updatedAt, 'resume needs label + updatedAt');

  // --- the PDF ships in dist, byte-identical to the public/ source
  const srcPdf = path.join(root, 'public', 'Ching-Hsiang-Shao-Resume-2026-11.pdf');
  const distPdf = path.join(root, 'dist', 'Ching-Hsiang-Shao-Resume-2026-11.pdf');
  assert.ok(existsSync(srcPdf), 'public/ résumé PDF must exist');
  assert.ok(existsSync(distPdf), 'Astro must copy the résumé PDF into dist/');
  assert.equal(Buffer.compare(readFileSync(distPdf), readFileSync(srcPdf)), 0,
    'dist résumé PDF must be byte-identical to public/');

  const html = unesc(readFileSync(distIndex, 'utf8'));

  // --- exactly two résumé anchors (hero + contact), both from resume.href,
  //     both carrying the download attribute
  const anchors = (html.match(/<a\b[^>]*>/g) ?? [])
    .filter((t) => t.includes(`href="${site.resume.href}"`));
  assert.equal(anchors.length, 2, 'résumé link should appear exactly in hero + contact');
  for (const a of anchors) assert.match(a, /\bdownload(?:\s|=|>)/, `résumé anchor needs download attr: ${a}`);

  // --- hero CTA row and the contact section each hold one
  assert.ok(sectionChunk(html, 'top').includes(`href="${site.resume.href}"`),
    'hero CTA row should link the résumé');
  const contactChunk = sectionChunk(html, 'contact');
  assert.ok(contactChunk.includes(`href="${site.resume.href}"`),
    'contact section should link the résumé');

  // --- contact button copy is built from the resume fields, not hardcoded
  assert.ok(contactChunk.includes(`${site.resume.label} · ${site.resume.updatedAt}`),
    'contact résumé button text should be built from resume.label + resume.updatedAt');

  // --- no component hardcodes the PDF path (site.ts is the only source in src/)
  const srcHits = [];
  (function walk(dir) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(astro|ts)$/.test(e.name) && readFileSync(p, 'utf8').includes('Ching-Hsiang-Shao-Resume')) {
        srcHits.push(p);
      }
    }
  })(path.join(root, 'src'));
  assert.deepEqual(srcHits, [path.join(root, 'src', 'data', 'site.ts')],
    'only src/data/site.ts may mention the résumé filename');
});
