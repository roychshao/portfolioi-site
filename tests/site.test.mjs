// Site build smoke test: `npm run build` must emit dist/index.html with the page title.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distIndex = path.join(root, 'dist', 'index.html');

test('build produces index.html', () => {
  assert.ok(existsSync(distIndex), 'dist/index.html should exist after npm run build');
  const html = readFileSync(distIndex, 'utf8');
  assert.match(html, /<title>Roy Shao/, 'dist/index.html should contain the <title>Roy Shao ... tag');
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

  // --- images moved into src/assets for astro:assets (_manifest stays public)
  assert.ok(existsSync(path.join(root, 'src/assets/img/thesis/03-similarity-dist.png')),
    'thesis images should live under src/assets/img/');
  assert.ok(existsSync(path.join(root, 'assets/img/_manifest.json')),
    '_manifest.json should stay at assets/img/');
  assert.ok(!existsSync(path.join(root, 'assets/img/about-portrait.jpg')),
    'images should be gone from assets/img/ after the git mv');
});
