/**
 * NWS ALERTS
 * ------------------------------------------------------------------
 * Active watches/warnings/advisories from the National Weather Service
 * (api.weather.gov, which allows browser requests). Each location lists
 * the NWS zones it touches -- its coastal-waters zone(s) plus the land
 * zone for its beach -- and every alert in those zones is shown.
 *
 * Display only: alerts do NOT change the fishing score (the score's
 * weights and caps are a separate, deliberate decision). A Small Craft
 * Advisory is still the NWS's call, so it's surfaced right above the
 * score rather than folded into it.
 *
 * Pure functions, like scoring.js -- `nowMs` is always passed in.
 */

const TZ = "America/New_York";

// Most serious first. Anything that isn't a warning/watch/advisory
// (e.g. "Beach Hazards Statement", "Marine Weather Statement") is a
// statement.
const KIND_ORDER = { warning: 0, advisory: 1, watch: 2, statement: 3 };

export function alertKind(event) {
  if (/warning/i.test(event)) return "warning";
  if (/advisory/i.test(event)) return "advisory";
  if (/watch/i.test(event)) return "watch";
  return "statement";
}

export function alertsUrl(zones) {
  return `https://api.weather.gov/alerts/active?zone=${zones.map(encodeURIComponent).join(",")}`;
}

// api.weather.gov GeoJSON -> a short, de-duplicated list. NWS often
// issues the same event as several alerts (one per zone, or an update
// alongside the original); those collapse into one entry spanning the
// earliest start to the latest end.
export function normalizeAlerts(geojson) {
  if (!geojson || !Array.isArray(geojson.features)) return null;
  const byEvent = {};
  for (const f of geojson.features) {
    const p = (f && f.properties) || {};
    if (p.status !== "Actual" || p.messageType === "Cancel" || !p.event) continue;
    const start = p.onset || p.effective || p.sent || null;
    const end = p.ends || p.expires || null;
    const cur = byEvent[p.event];
    if (!cur) {
      byEvent[p.event] = {
        id: p.id,
        event: p.event,
        kind: alertKind(p.event),
        start,
        end,
        description: p.description || "",
        instruction: p.instruction || "",
        sender: p.senderName || "National Weather Service",
      };
      continue;
    }
    if (start && (!cur.start || Date.parse(start) < Date.parse(cur.start))) cur.start = start;
    if (end && (!cur.end || Date.parse(end) > Date.parse(cur.end))) cur.end = end;
  }
  return Object.values(byEvent).sort(
    (a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || Date.parse(a.start || 0) - Date.parse(b.start || 0)
  );
}

function nyParts(ms) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "numeric", minute: "2-digit", weekday: "short", hour12: true,
  }).formatToParts(new Date(ms));
  const get = (t) => (parts.find((p) => p.type === t) || {}).value;
  return {
    dateStr: `${get("year")}-${get("month")}-${get("day")}`,
    weekday: get("weekday"),
    time: `${get("hour")}${get("minute") === "00" ? "" : ":" + get("minute")} ${get("dayPeriod")}`,
  };
}

// Which alerts matter for one day's tab: anything still in effect (as of
// now) at some point during that local calendar day. Past days get none
// -- these are *active* alerts, not a history.
export function alertsForDay(alerts, dateStr, todayStr, nowMs) {
  if (!alerts || !alerts.length || dateStr < todayStr) return [];
  return alerts.filter((a) => {
    const start = a.start ? Date.parse(a.start) : nowMs;
    const end = a.end ? Date.parse(a.end) : null;
    if (end !== null && end <= nowMs) return false; // already over
    const firstDay = nyParts(Math.max(start, nowMs)).dateStr;
    // An alert ending exactly at midnight doesn't touch the next day.
    const lastDay = end !== null ? nyParts(end - 60000).dateStr : firstDay;
    return dateStr >= firstDay && dateStr <= lastDay;
  });
}

// "until 3 AM Wed", "from 2 PM until 7 PM", "until 5 PM" -- phrased
// relative to the day being viewed, so same-day times drop the weekday.
export function alertTiming(alert, dateStr, nowMs) {
  const stamp = (ms) => {
    const p = nyParts(ms);
    return p.dateStr === dateStr ? p.time : `${p.time} ${p.weekday}`;
  };
  const start = alert.start ? Date.parse(alert.start) : null;
  const end = alert.end ? Date.parse(alert.end) : null;
  const from = start !== null && start > nowMs ? `from ${stamp(start)}` : "";
  const until = end !== null ? `until ${stamp(end)}` : "";
  return [from, until].filter(Boolean).join(" ") || "in effect";
}

// NWS descriptions are "* WHAT...text * WHERE...text * WHEN..." blocks.
// Pull out the sections so the banner can lead with WHAT and lay the
// rest out readably. Falls back to the raw text when the format differs.
export function alertSections(description) {
  const text = (description || "").replace(/\s+/g, " ").trim();
  const re = /\*\s*([A-Z][A-Z ]+?)\.\.\.\s*(.*?)(?=\s*\*\s*[A-Z][A-Z ]+?\.\.\.|$)/g;
  const out = [];
  let m;
  while ((m = re.exec(text))) out.push({ label: m[1].trim(), text: m[2].trim() });
  return out.length ? out : text ? [{ label: null, text }] : [];
}
