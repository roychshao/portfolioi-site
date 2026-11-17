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
