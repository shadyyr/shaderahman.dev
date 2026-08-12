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
    // Emit /experience.html rather than /experience/index.html so the
    // sitemap URLs and the served paths agree with trailingSlash: "never".
    format: "file",
  },

  vite: {
    build: {
      sourcemap: false,
    },
  },
});
