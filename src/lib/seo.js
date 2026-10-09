/**
 * Build-time files for search engines and link previews.
 *
 * The app renders in the browser, so without this every URL would serve
 * the same bare index.html. At build time (see vite.config.js) each
 * location gets its own copy of the page with its own title,
 * description and canonical URL, and robots.txt / sitemap.xml are
 * written from LOCATIONS so a new location is picked up automatically.
 */

export const SITE_URL = "https://ncfishingforecast.com";
export const SITE_NAME = "NC Fishing Forecast";

const escapeAttr = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function locationMeta(location) {
  return {
    url: `${SITE_URL}/${location.id}`,
    title: `${location.name} Fishing Forecast · ${location.region}`,
    description:
      `Morning fishing forecast for ${location.name}, ${location.region}: ` +
      "a 0–100 fishing score, wind, waves, tides, water temperature, " +
      "what's biting and where to fish.",
  };
}

// Swap the title, description, canonical and social tags in the built
// index.html for one page's values.
export function pageHtml(html, { url, title, description }) {
  const t = escapeAttr(title);
  const d = escapeAttr(description);
  const u = escapeAttr(url);
  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${t}</title>`)
    .replace(/(<meta\s+name="description"\s+content=")[^"]*(")/, `$1${d}$2`)
    .replace(/(<link\s+rel="canonical"\s+href=")[^"]*(")/, `$1${u}$2`)
    .replace(/(<meta\s+property="og:url"\s+content=")[^"]*(")/, `$1${u}$2`)
    .replace(/(<meta\s+property="og:title"\s+content=")[^"]*(")/, `$1${t}$2`)
    .replace(/(<meta\s+property="og:description"\s+content=")[^"]*(")/, `$1${d}$2`);
}

export function sitemapXml(locations) {
  const urls = [`${SITE_URL}/`, ...locations.map((l) => `${SITE_URL}/${l.id}`)];
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((u) => `  <url><loc>${u}</loc></url>\n`).join("") +
    "</urlset>\n"
  );
}

export function robotsTxt() {
  return `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;
}
