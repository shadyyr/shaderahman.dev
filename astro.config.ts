import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

import { SITE } from "./src/lib/site";

export default defineConfig({
  site: SITE.origin,
  trailingSlash: "never",

  integrations: [
    sitemap({
      changefreq: "monthly",
      lastmod: new Date(),
    }),
  ],

  build: {
    // One <style> in the head beats a blocking request for ~12KB of CSS.
    inlineStylesheets: "always",
    /*
      Directory format, so /experience is emitted as experience/index.html.

      The alternative, format: "file", emits experience.html and then depends
      on the host rewriting a bare /experience onto it. Vercel does not do that
      by default, so every route except the home page returned the 404 page on
      the first deploy. A directory index is the one thing every static host
      resolves without configuration, which makes this the portable choice
      rather than the clever one.
    */
    format: "directory",
  },

  vite: {
    build: {
      sourcemap: false,
    },
  },
});
