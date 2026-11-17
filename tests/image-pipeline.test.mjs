// Task 7 — image pipeline assertions on the built dist (run `npm run build` first).
// Contract:
//  1. every <img> in dist/index.html has width + height attributes (CLS guard)
//  2. every <img> has a srcset containing .avif or .webp variants (astro:assets pipeline)
//  3. exactly one eager image (the hero LCP) with fetchpriority="high"; all others lazy
//  4. dist ships no raster originals — every image asset in dist is .webp/.avif,
//     and no source .png/.jpg > 300 KB was copied into dist
//  5. budget: unique image bytes referenced by the page's srcsets < 1.2 MB
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, 'dist');
const distIndex = path.join(distDir, 'index.html');

function html() {
  assert.ok(existsSync(distIndex), 'run `npm run build` before `npm test`');
  return readFileSync(distIndex, 'utf8');
}

function imgTags() {
  return html().match(/<img\b[^>]*>/g) ?? [];
}

function attr(tag, name) {
  const m = tag.match(new RegExp(`\\b${name}="([^"]*)"`));
  return m ? m[1] : null;
}

function walkFiles(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkFiles(p, out);
    else out.push(p);
  }
  return out;
}

test('every <img> has width and height attributes', () => {
  const tags = imgTags();
  assert.ok(tags.length >= 8, `expected the 8+ site images in dist, found ${tags.length}`);
  for (const tag of tags) {
    assert.match(tag, /\bwidth="\d+"/, `missing width on ${tag.slice(0, 80)}`);
    assert.match(tag, /\bheight="\d+"/, `missing height on ${tag.slice(0, 80)}`);
  }
});

test('every <img> srcset offers .avif or .webp variants', () => {
  for (const tag of imgTags()) {
    const srcset = attr(tag, 'srcset');
    assert.ok(srcset, `img without srcset: ${tag.slice(0, 80)}`);
    assert.match(srcset, /\.(avif|webp)\b/, `srcset has no avif/webp variant: ${srcset.slice(0, 120)}`);
  }
});

test('hero is the only eager image and carries fetchpriority=high; the rest are lazy', () => {
  const tags = imgTags();
  const eager = tags.filter((t) => attr(t, 'fetchpriority') === 'high');
  assert.equal(eager.length, 1, 'exactly one img should have fetchpriority="high"');
  assert.match(eager[0], /\bloading="eager"/, 'the hero LCP image must be loading="eager"');
  for (const t of tags) {
    if (t === eager[0]) continue;
    assert.match(t, /\bloading="lazy"/, `below-fold img not lazy: ${t.slice(0, 80)}`);
    assert.doesNotMatch(t, /\bfetchpriority="high"/);
  }
});

test('dist ships optimized variants only — no raster originals, no source png/jpg over 300 KB', () => {
  const files = walkFiles(distDir);
  const rasters = files.filter((f) => /\.(png|jpe?g|avif|webp)$/i.test(f));
  assert.ok(rasters.length > 0, 'expected image assets in dist');
  for (const f of rasters) {
    assert.match(f, /\.(avif|webp)$/i,
      `dist contains a raster original (${path.relative(root, f)}) — only transformed webp/avif allowed`);
  }
  for (const f of files) {
    if (/\.png$/i.test(f) || /\.jpe?g$/i.test(f)) {
      assert.ok(statSync(f).size <= 300 * 1024, `${path.relative(root, f)} exceeds the 300 KB original cap`);
    }
  }
});

test('image budget: srcset-referenced image bytes < 1.2 MB', () => {
  const urls = new Set();
  for (const tag of imgTags()) {
    const srcset = attr(tag, 'srcset');
    const candidates = srcset ? srcset.split(',') : [];
    for (const c of candidates) {
      const u = c.trim().split(/\s+/)[0];
      if (u) urls.add(u);
    }
  }
  let total = 0;
  const detail = [];
  for (const u of urls) {
    const f = path.join(distDir, decodeURIComponent(u.replace(/^\//, '')));
    assert.ok(existsSync(f), `srcset URL not found in dist: ${u}`);
    const kb = statSync(f).size / 1024;
    detail.push(`${u} ${kb.toFixed(1)} KB`);
    total += kb;
  }
  console.log(`[image-budget] ${urls.size} unique image variants, ${total.toFixed(1)} KB total`);
  for (const line of detail.sort()) console.log('  ' + line);
  assert.ok(total < 1.2 * 1024, `srcset-referenced images weigh ${total.toFixed(0)} KB — budget is 1.2 MB`);
});
