/**
 * DATA FETCH + CACHE
 * ------------------------------------------------------------------
 * The live-data boundary. Fetches Open-Meteo Forecast + Marine and
 * NOAA CO-OPS tide predictions directly from the browser (all three
 * send permissive CORS headers and need no API key), normalizes the
 * pieces app-logic cares about, and caches the whole bundle in
 * localStorage with a timestamp.
 *
 * Caching rule (functional spec §2): refresh no more than once per
 * hour. A page load inside the hour reads straight from the cache and
 * makes zero network requests. `loadForecast({ force: true })` bypasses
 * the cache for a manual refresh.
 *
 * Nothing here invents data. If a source fails, its slice is left
 * null and a plain-English `dataNotice` explains what's missing; the
 * scoring engine already degrades gracefully on missing inputs.
 */

import { nowInNY, HISTORY_DAYS } from "./appLogic.js";
import { alertsUrl, normalizeAlerts } from "./alerts.js";

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const MARINE_URL = "https://marine-api.open-meteo.com/v1/marine";
const COOPS_URL = "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const ALERTS_TTL_MS = 10 * 60 * 1000; // NWS advisories re-checked every 10 min
const CACHE_PREFIX = "nc-fishing-forecast:data:";
const FETCH_TIMEOUT_MS = 15000;

const FORECAST_HOURLY = [
  "wind_speed_10m", "wind_gusts_10m", "wind_direction_10m",
  "temperature_2m", "apparent_temperature", "precipitation",
  "precipitation_probability", "cloud_cover", "surface_pressure",
  "visibility", "weather_code",
].join(",");

// Waves come from NOAA's GFS-Wave model. Checked against NDBC buoy 41110
// (Masonboro Inlet) over Sep 30-Oct 5 2026 mornings: GFS-Wave averaged
// 0.20 ft off the buoy, while Open-Meteo's default ("best_match") read
// ~35% low (0.59 ft off). GFS-Wave also runs 16 days instead of ~10.
// It has no sea-surface temperature, so SST comes from a second request
// on the default model, which matched the buoy within half a degree.
const WAVE_MODEL = "ncep_gfswave016";
const WAVE_HOURLY = [
  "wave_height", "wave_period", "wave_direction",
  "swell_wave_height", "swell_wave_period", "wind_wave_height",
].join(",");
const SST_HOURLY = "sea_surface_temperature";

function cacheKey(locationId) {
  return CACHE_PREFIX + locationId;
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} from ${new URL(url).host}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} from ${new URL(url).host}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

// ---- date helpers (NOAA CO-OPS wants YYYYMMDD, in local time) ----
function yyyymmdd(dateStr) {
  return dateStr.replace(/-/g, "");
}
function shiftDate(dateStr, days) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(
    dt.getUTCDate()
  ).padStart(2, "0")}`;
}

// ---- Open-Meteo returns visibility in whatever length system the
// request implied. Read hourly_units and convert the whole array to
// miles so everything downstream can assume miles.
function normalizeVisibilityToMiles(weather) {
  if (!weather || !weather.hourly || !Array.isArray(weather.hourly.visibility)) return weather;
  const unit = (weather.hourly_units && weather.hourly_units.visibility) || "m";
  let factor;
  if (/^(mi|mile|miles)$/i.test(unit)) factor = 1;
  else if (/^ft$/i.test(unit)) factor = 1 / 5280;
  else factor = 0.000621371; // meters
  weather.hourly.visibility = weather.hourly.visibility.map((v) =>
    v === null || v === undefined ? null : v * factor
  );
  if (weather.hourly_units) weather.hourly_units.visibility = "mi";
  return weather;
}

function buildForecastUrl(location) {
  const p = new URLSearchParams({
    latitude: String(location.lat),
    longitude: String(location.lon),
    // Open-Meteo defaults to the nearest *land* grid cell. At Masonboro
    // that's inland near Wilmington, which read ~10 mph on mornings the
    // water saw ~20 (NWS marine forecast, Small Craft Advisory). We fish
    // on the water, so ask for the sea cell.
    cell_selection: "sea",
    hourly: FORECAST_HOURLY,
    daily: "temperature_2m_max,temperature_2m_min,sunrise,sunset",
    timezone: "America/New_York",
    forecast_days: "16",
    past_days: String(HISTORY_DAYS),
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
    precipitation_unit: "inch",
  });
  return `${FORECAST_URL}?${p.toString()}`;
}

function buildMarineUrl(location, hourly, model) {
  const p = new URLSearchParams({
    latitude: String(location.lat),
    longitude: String(location.lon),
    hourly,
    timezone: "America/New_York",
    forecast_days: "16",
    past_days: String(HISTORY_DAYS),
    length_unit: "imperial",
    temperature_unit: "fahrenheit",
  });
  if (model) p.set("models", model);
  return `${MARINE_URL}?${p.toString()}`;
}

// Fold the SST series into the wave response by timestamp, so the rest
// of the app still sees one Open-Meteo-shaped marine object. Either half
// may be missing; whatever arrived is kept.
export function mergeMarine(waves, sst) {
  const ok = (r) => r && !r.error && r.hourly && Array.isArray(r.hourly.time);
  if (!ok(waves) && !ok(sst)) return null;
  if (!ok(waves)) return sst;
  const merged = { ...waves, hourly: { ...waves.hourly } };
  const sstByTime = {};
  if (ok(sst) && Array.isArray(sst.hourly.sea_surface_temperature)) {
    sst.hourly.time.forEach((t, i) => (sstByTime[t] = sst.hourly.sea_surface_temperature[i]));
  }
  merged.hourly.sea_surface_temperature = merged.hourly.time.map((t) => sstByTime[t] ?? null);
  return merged;
}

function buildTidesUrl(location, todayStr) {
  const p = new URLSearchParams({
    product: "predictions",
    application: "nc-fishing-forecast",
    station: location.tideStationId,
    datum: "MLLW",
    time_zone: "lst_ldt",
    interval: "hilo",
    units: "english",
    format: "json",
    begin_date: yyyymmdd(shiftDate(todayStr, -HISTORY_DAYS)),
    end_date: yyyymmdd(shiftDate(todayStr, 16)),
  });
  return `${COOPS_URL}?${p.toString()}`;
}

function readCache(locationId) {
  try {
    const raw = localStorage.getItem(cacheKey(locationId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.fetchedAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(locationId, data) {
  try {
    localStorage.setItem(cacheKey(locationId), JSON.stringify(data));
  } catch {
    /* private mode / quota / disabled -- non-fatal, we just don't cache */
  }
}

function isFresh(data) {
  if (!data || !data.fetchedAt) return false;
  return Date.now() - new Date(data.fetchedAt).getTime() < CACHE_TTL_MS;
}

/**
 * Load the forecast bundle for a location.
 * @returns {Promise<{ data: RawBundle, fromCache: boolean, stale: boolean }>}
 */
// NWS alerts for the location's zones. Returns the normalized list, []
// when the location has no zones configured, or null when the request
// failed (so the UI never mistakes "couldn't check" for "no alerts").
async function fetchAlerts(location) {
  if (!location.nwsZones || !location.nwsZones.length) return [];
  try {
    return normalizeAlerts(await fetchJson(alertsUrl(location.nwsZones)));
  } catch {
    return null;
  }
}

export async function loadForecast({ location, force = false } = {}) {
  const cached = readCache(location.id);
  if (!force && isFresh(cached)) {
    // Forecasts can sit for an hour, but a new advisory shouldn't wait
    // that long -- re-check just the alerts once they're 10 minutes old.
    const alertsAge = Date.now() - new Date(cached.alertsFetchedAt || 0).getTime();
    if (alertsAge < ALERTS_TTL_MS) return { data: cached, fromCache: true, stale: false };
    const alerts = await fetchAlerts(location);
    const data = alerts === null && cached.alerts ? cached : { ...cached, alerts, alertsFetchedAt: new Date().toISOString() };
    writeCache(location.id, data);
    return { data, fromCache: true, stale: false };
  }

  const { dateStr: todayStr } = nowInNY();

  const [weatherR, wavesR, sstR, tidesR, alertsR] = await Promise.allSettled([
    fetchJson(buildForecastUrl(location)),
    fetchJson(buildMarineUrl(location, WAVE_HOURLY, WAVE_MODEL)),
    fetchJson(buildMarineUrl(location, SST_HOURLY)),
    fetchJson(buildTidesUrl(location, todayStr)),
    fetchAlerts(location),
  ]);
  const alerts = alertsR.status === "fulfilled" ? alertsR.value : null;

  let weather = weatherR.status === "fulfilled" ? weatherR.value : null;
  let marine = mergeMarine(
    wavesR.status === "fulfilled" ? wavesR.value : null,
    sstR.status === "fulfilled" ? sstR.value : null
  );
  let tides = null;
  if (tidesR.status === "fulfilled") {
    const v = tidesR.value;
    if (v && Array.isArray(v.predictions)) tides = { predictions: v.predictions };
    // A CO-OPS error body looks like { error: { message } } -- treat as failure.
  }

  // Open-Meteo error bodies come back 200 with { error: true, reason }.
  if (weather && weather.error) weather = null;
  if (marine && marine.error) marine = null;

  weather = normalizeVisibilityToMiles(weather);

  const failed = [];
  if (!weather) failed.push("wind, temperature and rain forecast (Open-Meteo)");
  if (!marine) failed.push("wave and water-temperature forecast (Open-Meteo Marine)");
  if (!tides) failed.push("tide predictions (NOAA CO-OPS)");
  if (alerts === null) failed.push("Weather Service advisories (NWS) — check weather.gov before heading out");

  // Total failure: fall back to a stale cache if we have one, otherwise
  // surface a hard error for the UI to catch.
  if (!weather && !marine && !tides) {
    if (cached) {
      return {
        data: {
          ...cached,
          dataNotice:
            "Couldn't reach any live data source just now — showing the last forecast that loaded. Pull to refresh when you're back online.",
        },
        fromCache: true,
        stale: true,
      };
    }
    throw new Error("Couldn't reach any forecast data source. Check your connection and try again.");
  }

  let dataNotice = null;
  if (failed.length) {
    dataNotice = `Some data didn't load this time: ${failed.join("; ")}. Scores shown use whatever real data came through.`;
  }

  const data = {
    fetchedAt: new Date().toISOString(),
    location: location.id,
    weather,
    marine,
    tides,
    alerts,
    alertsFetchedAt: new Date().toISOString(),
    buoy: { status: "unknown", note: `NDBC station ${location.buoyId} live readings are not wired up in this version.` },
    dataNotice,
  };

  writeCache(location.id, data);
  return { data, fromCache: false, stale: false };
}

export { CACHE_TTL_MS };
