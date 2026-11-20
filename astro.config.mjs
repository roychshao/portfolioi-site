// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  site: process.env.SITE ?? 'https://portfolio.royshao.dev',
  build: {
    // Task 7 perf: inline stylesheets so the single 50 KB CSS file is not a
    // render-blocking request (Lighthouse flagged ~1.27 s FCP savings).
    inlineStylesheets: 'always',
  },
});
