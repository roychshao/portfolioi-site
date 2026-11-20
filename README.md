# Roy Shao — Portfolio Site

A static single-page portfolio site: projects, research, writing, and contact for
[Roy Shao](https://portfolio.royshao.dev) (Ching-Hsiang Shao), software engineer based in Taipei.

**Live site:** <https://portfolio.royshao.dev>

## Stack

- [Astro 5](https://astro.build) — static output, zero JS shipped by default
- Content is held in a single typed source (`src/data/site.ts`) and rendered into
  anchor sections (`#work`, `#research`, `#writing`, `#about`, `#contact`)
- CSS is inlined at build time (`inlineStylesheets: 'always'`) to avoid a
  render-blocking stylesheet request
- Self-hosted subset fonts (Inter, JetBrains Mono) via `@fontsource`

## SEO & discoverability

- Canonical / Open Graph / Twitter card tags derived from the `SITE` env at build
- `Person` JSON-LD structured data for search and AI answer engines
- `robots.txt`, `sitemap.xml`, and `llms.txt` served from `public/`

## Development

```sh
npm install
npm run dev      # local dev server
npm test         # node --test, content & structure checks
npm run build    # static build → dist/  (SITE env sets canonical origin)
```

## Deployment

The site is a plain static bundle; serve `dist/` with any static host.

Using Docker (nginx serves the build, `DOMAIN` flows into the canonical URLs):

```sh
DOMAIN=https://portfolio.royshao.dev docker compose up -d --build
```

The container binds loopback only (`127.0.0.1:8404`, override with `HOST_PORT`);
serving it over HTTPS at the public domain is handled by the owner's reverse proxy / tunnel.

Verify the container answers locally:

```sh
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8404/   # expect 200
```

## Repository layout

```
src/data/site.ts     # single source of truth for all site content
src/components/      # section components
src/layouts/         # BaseLayout (meta/JSON-LD) + page shell
public/              # resume PDF, og image, robots/sitemap/llms
tests/               # content-quality & structural assertions
docs/                # design notes
```

## License

© 2026 Roy Shao. All rights reserved.
