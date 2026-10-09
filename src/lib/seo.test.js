import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { LOCATIONS } from "../config/locations.js";
import { locationMeta, pageHtml, robotsTxt, sitemapXml } from "./seo.js";

const indexHtml = readFileSync(new URL("../../index.html", import.meta.url), "utf8");

describe("pageHtml", () => {
  const loc = LOCATIONS.find((l) => l.id === "cape-lookout");
  const out = pageHtml(indexHtml, locationMeta(loc));

  it("gives the location its own title, description and canonical URL", () => {
    expect(out).toContain("<title>Cape Lookout Fishing Forecast · Core Banks, NC</title>");
    expect(out).toContain('<link rel="canonical" href="https://ncfishingforecast.com/cape-lookout" />');
    expect(out).toContain('<meta property="og:url" content="https://ncfishingforecast.com/cape-lookout" />');
    expect(out).toMatch(/<meta\s+name="description"\s+content="Morning fishing forecast for Cape Lookout/);
    expect(out).toMatch(/<meta\s+property="og:description"\s+content="Morning fishing forecast for Cape Lookout/);
  });

  it("replaces every tag it targets in index.html", () => {
    expect(out).not.toContain('href="https://ncfishingforecast.com/"');
    expect(out).not.toContain('content="https://ncfishingforecast.com/"');
    expect(out).not.toContain("Masonboro Inlet, Cape Lookout and more");
  });

  it("escapes attribute values", () => {
    const html = pageHtml(indexHtml, { url: "https://x/", title: 'A & "B"', description: "<d>" });
    expect(html).toContain("<title>A &amp; &quot;B&quot;</title>");
    expect(html).toContain('content="&lt;d&gt;"');
  });
});

describe("sitemap and robots", () => {
  it("lists the home page and every location", () => {
    const xml = sitemapXml(LOCATIONS);
    expect(xml).toContain("<loc>https://ncfishingforecast.com/</loc>");
    for (const l of LOCATIONS) expect(xml).toContain(`<loc>https://ncfishingforecast.com/${l.id}</loc>`);
  });

  it("points crawlers at the sitemap", () => {
    expect(robotsTxt()).toContain("Sitemap: https://ncfishingforecast.com/sitemap.xml");
  });
});
