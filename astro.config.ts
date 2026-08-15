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
      /*
        esbuild minifies (max-width: 56rem) into the Media Queries Level 4
        range form, (width <= 56rem), whenever it believes the target supports
        it. That form needs Safari 16.4. Older Safari cannot parse the
        condition and throws the whole block away, so every responsive rule on
        the site disappears and a 375px phone lays itself out on the desktop
        grid: a 240px sidebar against about 135px of content.

        Pinning the CSS target keeps the queries in the form they were written
        in. Verify against the built CSS, not the source, because the source
        looks correct either way.
      */
      cssTarget: "safari15",
    },
  },
});
