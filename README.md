# Roy Shao — Portfolio Site

A single-page Astro 5 static portfolio (work case studies, honors, writing, about, contact).
It ships as one small static bundle so it loads fast on mobile and deploys anywhere.
Deploy is a self-contained Docker image (multi-stage Node build → unprivileged nginx), one `docker compose up` per host.

## Local development

```bash
npm ci            # install dependencies
npm run dev       # dev server at http://localhost:4321 (SITE origin from env/.astro)
```

## Build & test

```bash
npm run build     # static output in dist/
npm test          # node --test: build smoke + data/layout/docker static assertions
                  # (run `npm run build` first — several tests assert on dist/)
```

The `SITE` env var sets the canonical/OG absolute origin at build time; default `https://example.com`.

## Deploy on host

The sandbox has no docker CLI; the image is built and run **on the deploy host** from this repo:

```bash
# 1. Build + start (replace DOMAIN with your public origin, no trailing slash)
DOMAIN=https://roy.example.com docker compose up -d --build

# 2. Self-check — expect 200
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8080/

# 3. Spot-check one hashed asset from the bundle — expect 200 + immutable cache header
curl -sI http://127.0.0.1:8080/_astro/ | head -5   # or pick a file from dist/_astro/

# 4. Stop / update
docker compose down           # stop
DOMAIN=https://roy.example.com docker compose up -d --build   # rebuild after a git pull
```

Container listens on **8080** (nginx-unprivileged, non-root UID 101) — no privileged ports.

### HTTPS / reverse proxy

TLS termination and the public DNS name are **owner-managed** outside this repo:
point your existing reverse proxy (nginx/Caddy/Traefik) at `127.0.0.1:8080` and set `DOMAIN`
to the same origin used for the build so canonical/OG URLs match.
