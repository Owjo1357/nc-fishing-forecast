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

import { nowInNY } from "./appLogic.js";

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const MARINE_URL = "https://marine-api.open-meteo.com/v1/marine";
const COOPS_URL = "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const CACHE_PREFIX = "masonboro-dashboard:data:";
const FETCH_TIMEOUT_MS = 15000;

const FORECAST_HOURLY = [
  "wind_speed_10m", "wind_gusts_10m", "wind_direction_10m",
  "temperature_2m", "apparent_temperature", "precipitation",
  "precipitation_probability", "cloud_cover", "surface_pressure",
  "visibility", "weather_code",
].join(",");

const MARINE_HOURLY = [
  "wave_height", "wave_period", "wave_direction",
  "swell_wave_height", "swell_wave_period",
  "wind_wave_height", "sea_surface_temperature",
].join(",");

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
    hourly: FORECAST_HOURLY,
    daily: "temperature_2m_max,temperature_2m_min,sunrise,sunset",
    timezone: "America/New_York",
    forecast_days: "16",
    past_days: "2",
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
    precipitation_unit: "inch",
  });
  return `${FORECAST_URL}?${p.toString()}`;
}

function buildMarineUrl(location) {
  const p = new URLSearchParams({
    latitude: String(location.lat),
    longitude: String(location.lon),
    hourly: MARINE_HOURLY,
    timezone: "America/New_York",
    forecast_days: "10",
    past_days: "2",
    length_unit: "imperial",
    temperature_unit: "fahrenheit",
  });
  return `${MARINE_URL}?${p.toString()}`;
}

function buildTidesUrl(location, todayStr) {
  const p = new URLSearchParams({
    product: "predictions",
    application: "masonboro-fishing-dashboard",
    station: location.tideStationId,
    datum: "MLLW",
    time_zone: "lst_ldt",
    interval: "hilo",
    units: "english",
    format: "json",
    begin_date: yyyymmdd(shiftDate(todayStr, -2)),
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
export async function loadForecast({ location, force = false } = {}) {
  const cached = readCache(location.id);
  if (!force && isFresh(cached)) {
    return { data: cached, fromCache: true, stale: false };
  }

  const { dateStr: todayStr } = nowInNY();

  const [weatherR, marineR, tidesR] = await Promise.allSettled([
    fetchJson(buildForecastUrl(location)),
    fetchJson(buildMarineUrl(location)),
    fetchJson(buildTidesUrl(location, todayStr)),
  ]);

  let weather = weatherR.status === "fulfilled" ? weatherR.value : null;
  let marine = marineR.status === "fulfilled" ? marineR.value : null;
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
    buoy: { status: "unknown", note: `NDBC/CORMP buoy ${location.buoyId} live readings are not wired up in this version.` },
    dataNotice,
  };

  writeCache(location.id, data);
  return { data, fromCache: false, stale: false };
}

export { CACHE_TTL_MS };
