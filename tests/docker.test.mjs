// Static verification of the Docker deployables (no docker CLI in sandbox —
// per plan Global Constraints, the image build itself is verified by Roy on host).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => readFileSync(path.join(root, f), 'utf8');

const dockerfile = 'Dockerfile';
const nginx = 'nginx.conf';
const compose = 'docker-compose.yml';
const ignore = '.dockerignore';

test('docker artifacts: all four files exist', () => {
  for (const f of [dockerfile, nginx, compose, ignore]) {
    assert.ok(existsSync(path.join(root, f)), `${f} should exist at repo root`);
  }
});

test('Dockerfile: two FROM stages, ARG SITE + npm ci in build stage, nginx-unprivileged runtime', () => {
  const d = read(dockerfile);
  const froms = d.match(/^FROM\b/gm) ?? [];
  assert.equal(froms.length, 2, 'Dockerfile should have exactly 2 FROM stages');

  const [buildStage, runtimeStage] = d.split(/^FROM\b/m).slice(1);
  assert.match(buildStage, /^ARG SITE=https:\/\/portfolio\.royshao\.dev$/m, 'build stage needs ARG SITE');
  assert.match(buildStage, /\bnpm ci\b/, 'build stage must use npm ci (not npm install)');
  assert.match(buildStage, /npm run build/, 'build stage must run npm run build');
  assert.match(d, /^FROM nginxinc\/nginx-unprivileged:/m, 'runtime stage must be nginx-unprivileged');
  assert.match(runtimeStage, /\/usr\/share\/nginx\/html/, 'runtime stage must copy dist into the nginx html root');
});

test('nginx.conf: gzip on, no privileged 80, listen 8080, cache rules', () => {
  const n = read(nginx);
  assert.match(n, /gzip\s+on\s*;/, 'nginx.conf should enable gzip');
  assert.match(n, /listen\s+8080\s*;/, 'must listen on 8080 (nginx-unprivileged)');
  assert.doesNotMatch(n, /listen\s+80\s*;/, 'must NOT listen on privileged port 80');
  assert.match(n, /charset\s+utf-8\s*;/, 'should declare charset utf-8');
  assert.match(n, /X-Content-Type-Options\s+"?nosniff/, 'security header X-Content-Type-Options');
  assert.match(n, /Referrer-Policy\s+"strict-origin-when-cross-origin"/, 'security header Referrer-Policy');

  // Hashed Astro assets: immutable 1y, and ^~ so the extension regex can't steal them
  const astro = n.match(/location\s+\^~\s+\/_astro\/\s*\{[^}]*\}/);
  assert.ok(astro, 'nginx.conf should have a `location ^~ /_astro/` block');
  assert.match(astro[0], /Cache-Control\s+"public,\s*max-age=31536000,\s*immutable"/, '/_astro/ must be immutable 1y');

  // Static assets by extension carry a Cache-Control too (plan-mandated rule shape)
  const ext = n.match(/location\s+~\*\s+\\\.\(webp\|png\|jpg\|js\|css\|woff2\)\$\s*\{[^}]*\}/);
  assert.ok(ext, 'nginx.conf should have the asset-extension location block');
  assert.match(ext[0], /Cache-Control/, 'asset-extension block must set Cache-Control');

  // HTML must always revalidate
  const rootLoc = n.match(/location\s+\/\s*\{[^}]*\}/);
  assert.ok(rootLoc, 'nginx.conf should have a `location /` block');
  assert.match(rootLoc[0], /Cache-Control\s+"no-cache"/, 'index.html should be served with no-cache');

  // woff2/webp are already compressed — must NOT be in gzip_types
  const gzipTypes = (n.match(/gzip_types[^;]*;/) ?? [''])[0];
  assert.doesNotMatch(gzipTypes, /woff2|webp/, 'woff2/webp must be excluded from gzip_types (already compressed)');
});

test('docker-compose.yml: SITE build arg from DOMAIN, loopback host port with HOST_PORT override, restart policy', () => {
  const c = read(compose);
  assert.match(c, /name:\s*portfolio-site/, 'compose should be named portfolio-site');
  assert.match(c, /SITE:\s*\$\{DOMAIN:-https:\/\/portfolio\.royshao\.dev\}/, 'build.args SITE must default to ${DOMAIN:-https://portfolio.royshao.dev}');
  assert.match(c, /"127\.0\.0\.1:\$\{HOST_PORT:-8404\}:8080"/, 'ports must bind loopback 127.0.0.1 with HOST_PORT override (default 8404) to container 8080');
  assert.doesNotMatch(c, /(?:^|[\s"'])80:80(?=$|[\s"'])/m, 'must NOT publish port 80 directly');
  assert.match(c, /restart:\s*unless-stopped/, 'restart policy should be unless-stopped');
});

test('.dockerignore: excludes build cruft, keeps src/ and public/ in context', () => {
  const lines = read(ignore)
    .split('\n')
    .map((l) => l.trim().replace(/\/$/, ''))
    .filter((l) => l && !l.startsWith('#'));
  for (const req of ['node_modules', 'dist', '.git', '.superpowers', '.astro', 'assets']) {
    assert.ok(lines.includes(req), `.dockerignore should list ${req}`);
  }
  assert.ok(!lines.some((l) => /^src(\/|$)/.test(l)), '.dockerignore must NOT exclude src/');
  assert.ok(!lines.some((l) => /^public(\/|$)/.test(l)), '.dockerignore must NOT exclude public/');
});

test('README.md: host runbook with exact compose + curl self-check commands', () => {
  const r = read('README.md');
  assert.match(r, /DOMAIN=\S+\s+docker compose up -d --build/, 'README must give the exact host deploy command');
  assert.match(r, /curl[^\n]*127\.0\.0\.1:8404/, 'README must give a curl self-check against the default host port 127.0.0.1:8404');
  assert.match(r, /HOST_PORT/, 'README must document the HOST_PORT override');
  assert.match(r, /http_code/, 'README curl self-check must print the HTTP status code (expect 200)');
  assert.match(r, /reverse[- ]proxy|TLS|HTTPS/i, 'README must note reverse-proxy/HTTPS is owner-managed');
});
