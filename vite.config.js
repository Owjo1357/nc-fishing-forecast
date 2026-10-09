import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { LOCATIONS } from "./src/config/locations.js";
import { locationMeta, pageHtml, robotsTxt, sitemapXml } from "./src/lib/seo.js";

// After the build, write a copy of index.html per location (served at
// /<location-id> by Vercel's cleanUrls) plus robots.txt and sitemap.xml.
function seoFiles() {
  let outDir;
  return {
    name: "seo-files",
    apply: "build",
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    writeBundle() {
      const html = readFileSync(resolve(outDir, "index.html"), "utf8");
      for (const loc of LOCATIONS) {
        writeFileSync(resolve(outDir, `${loc.id}.html`), pageHtml(html, locationMeta(loc)));
      }
      writeFileSync(resolve(outDir, "sitemap.xml"), sitemapXml(LOCATIONS));
      writeFileSync(resolve(outDir, "robots.txt"), robotsTxt());
    },
  };
}

// Static single-page app. No backend, no API keys.
// Deploys as static files to Vercel (or any static host).
export default defineConfig({
  plugins: [react(), seoFiles()],
  build: {
    outDir: "dist",
  },
});
