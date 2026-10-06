/**
 * APP LOGIC
 * ------------------------------------------------------------------
 * Turns raw API data (Open-Meteo Forecast + Marine, NOAA CO-OPS
 * tides) + location config into the exact per-day objects the UI
 * renders. This is the only place that knows about API response
 * shapes -- everything below this layer (scoring.js) works on plain
 * normalized numbers, and everything above it (the React components)
 * just reads day objects.
 *
 * All "local time" here means America/New_York, computed explicitly
 * with Intl -- never the viewer's browser timezone.
 *
 * Expected raw shape (see dataFetch.js):
 *   {
 *     fetchedAt: ISO string,
 *     location: locationId,
 *     weather: <Open-Meteo forecast JSON> | null,   // visibility already normalized to MILES
 *     marine:  <Open-Meteo marine JSON>   | null,
 *     tides:   { predictions: [{t, v, type}] } | null,
 *     buoy:    { status, note } | null,
 *     dataNotice: string | null,
 *   }
 */

import * as Scoring from "./scoring.js";

const TZ = "America/New_York";
const THUNDER_CODES = new Set([95, 96, 99]);

export function nowInNY() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t).value;
  let hour = parseInt(get("hour"), 10);
  if (hour === 24) hour = 0;
  return {
    dateStr: `${get("year")}-${get("month")}-${get("day")}`,
    hour,
    minute: parseInt(get("minute"), 10),
  };
}

// Open-Meteo, requested with timezone=America/New_York, returns local
// wall-clock strings like "2026-08-27T05:00" -- no offset, no UTC math
// needed. We just slice them.
function splitLocalIso(iso) {
  return { dateStr: iso.slice(0, 10), hour: parseInt(iso.slice(11, 13), 10) };
}

function daysBetween(dateStrA, dateStrB) {
  const a = new Date(dateStrA + "T12:00:00Z");
  const b = new Date(dateStrB + "T12:00:00Z");
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

function addCalendarDays(dateStr, n) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

function dummyTime(hour, minute) {
  return new Date(2000, 0, 1, hour, minute, 0, 0);
}

function parseHHMM(hhmm) {
  const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10));
  return { h, m };
}

// ---- sunrise/sunset, computed astronomically -------------------
// Used ONLY as a fallback when Open-Meteo's daily.sunrise/sunset isn't
// available. This is a real, deterministic calculation (the standard
// "sunrise equation"), not a guessed or interpolated number -- sun
// times for a given lat/lon/date are astronomy, not forecast.
// Accurate to within roughly a minute.
function julianDay(y, m, d) {
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
}
function isUsDst(y, m, d) {
  // DST: 2nd Sunday in March through 1st Sunday in November.
  const secondSundayOfMarch = nthSunday(y, 3, 2);
  const firstSundayOfNovember = nthSunday(y, 11, 1);
  const t = Date.UTC(y, m - 1, d);
  return t >= Date.UTC(y, 2, secondSundayOfMarch) && t < Date.UTC(y, 10, firstSundayOfNovember);
}
function nthSunday(y, month, n) {
  const first = new Date(Date.UTC(y, month - 1, 1));
  const firstSunday = 1 + ((7 - first.getUTCDay()) % 7);
  return firstSunday + (n - 1) * 7;
}
function sunTimes(lat, lon, dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const rad = Math.PI / 180;
  const JD = julianDay(y, m, d);
  const n = Math.ceil(JD - 2451545.0 + 0.0008);
  const Jstar = n - lon / 360;
  const M = (357.5291 + 0.98560028 * Jstar) % 360;
  const Mr = M * rad;
  const C = 1.9148 * Math.sin(Mr) + 0.02 * Math.sin(2 * Mr) + 0.0003 * Math.sin(3 * Mr);
  const lambda = (M + C + 180 + 102.9372) % 360;
  const lambdaR = lambda * rad;
  const Jtransit = 2451545.0 + Jstar + 0.0053 * Math.sin(Mr) - 0.0069 * Math.sin(2 * lambdaR);
  const sinDelta = Math.sin(lambdaR) * Math.sin(23.44 * rad);
  const cosOmega =
    (Math.sin(-0.83 * rad) - Math.sin(lat * rad) * sinDelta) /
    (Math.cos(lat * rad) * Math.cos(Math.asin(sinDelta)));
  if (cosOmega > 1 || cosOmega < -1) return null; // polar day/night, N/A here
  const omega = Math.acos(cosOmega) / rad;
  const Jrise = Jtransit - omega / 360;
  const Jset = Jtransit + omega / 360;
  const dst = isUsDst(y, m, d);
  const offsetHours = dst ? -4 : -5;
  return { rise: jdToLocalHM(Jrise, offsetHours), set: jdToLocalHM(Jset, offsetHours) };
}
function jdToLocalHM(jd, offsetHours) {
  const ms = (jd - 2440587.5) * 86400000; // JD -> Unix epoch ms (UTC)
  const utc = new Date(ms);
  let totalMin = utc.getUTCHours() * 60 + utc.getUTCMinutes() + offsetHours * 60;
  totalMin = ((totalMin % 1440) + 1440) % 1440;
  return { hour: Math.floor(totalMin / 60), minute: Math.round(totalMin % 60) };
}

// ---- moon phase (local synodic-month approximation; display only,
// does NOT affect the score) ------------------------------------
const SYNODIC_DAYS = 29.530588;
const KNOWN_NEW_MOON_UTC = Date.UTC(2000, 0, 6, 18, 14);

export function moonPhase(dateStr) {
  const t = new Date(dateStr + "T12:00:00Z").getTime();
  const days = (t - KNOWN_NEW_MOON_UTC) / 86400000;
  let frac = (days % SYNODIC_DAYS) / SYNODIC_DAYS;
  if (frac < 0) frac += 1;
  const names = [
    { max: 0.03, name: "New moon", icon: "🌑" },
    { max: 0.22, name: "Waxing crescent", icon: "🌒" },
    { max: 0.28, name: "First quarter", icon: "🌓" },
    { max: 0.47, name: "Waxing gibbous", icon: "🌔" },
    { max: 0.53, name: "Full moon", icon: "🌕" },
    { max: 0.72, name: "Waning gibbous", icon: "🌖" },
    { max: 0.78, name: "Last quarter", icon: "🌗" },
    { max: 0.97, name: "Waning crescent", icon: "🌘" },
    { max: 1.01, name: "New moon", icon: "🌑" },
  ];
  const match = names.find((n) => frac <= n.max);
  return { fraction: frac, name: match.name, icon: match.icon };
}

// ---- pull a variable's morning (5-11) slice for one date ---------
function hourlySliceForDate(hourlyBlock, dateStr, varNames) {
  if (!hourlyBlock || !hourlyBlock.time) return [];
  const rows = [];
  for (let i = 0; i < hourlyBlock.time.length; i++) {
    const { dateStr: d, hour } = splitLocalIso(hourlyBlock.time[i]);
    if (d === dateStr && hour >= 5 && hour <= 11) {
      const row = { hour };
      for (const v of varNames) {
        row[v] = hourlyBlock[v] ? valueOrNull(hourlyBlock[v][i]) : null;
      }
      rows.push(row);
    }
  }
  rows.sort((a, b) => a.hour - b.hour);
  return rows;
}

function valueOrNull(v) {
  return v === undefined || v === null ? null : v;
}

function pressureTrend(hourlyBlock, dateStr) {
  if (!hourlyBlock || !hourlyBlock.time || !hourlyBlock.surface_pressure) return null;
  const idxAt5 = hourlyBlock.time.findIndex((t) => {
    const { dateStr: d, hour } = splitLocalIso(t);
    return d === dateStr && hour === 5;
  });
  if (idxAt5 < 0 || idxAt5 - 12 < 0) return null;
  const now = hourlyBlock.surface_pressure[idxAt5];
  const before = hourlyBlock.surface_pressure[idxAt5 - 12];
  if (now === null || now === undefined || before === null || before === undefined) return null;
  return now - before; // hPa per ~12h
}

function tideEventsForDate(tidePredictions, dateStr) {
  if (!tidePredictions) return [];
  return tidePredictions
    .filter((p) => p.t.slice(0, 10) === dateStr)
    .map((p) => {
      const { h, m } = parseHHMM(p.t.slice(11, 16));
      return { hour: h, minute: m, type: p.type, heightFt: parseFloat(p.v) };
    });
}

function tideStageAt5am(tidePredictions, dateStr) {
  if (!tidePredictions) return null;
  // sort all predictions chronologically, find the bracketing pair
  // around this date's 5:00 AM.
  const target = new Date(dateStr + "T05:00:00");
  const sorted = tidePredictions
    .map((p) => ({ ...p, dt: new Date(p.t.replace(" ", "T") + ":00") }))
    .sort((a, b) => a.dt - b.dt);
  let before = null,
    after = null;
  for (const p of sorted) {
    if (p.dt <= target) before = p;
    else if (!after) after = p;
  }
  if (!before || !after) return null;
  if (before.type === "L" && after.type === "H") return "flood";
  if (before.type === "H" && after.type === "L") return "ebb";
  return null;
}

function splitTimeOfDay(iso) {
  // "2026-08-27T06:32" -> {hour, minute}
  return { hour: parseInt(iso.slice(11, 13), 10), minute: parseInt(iso.slice(14, 16), 10) };
}

// Prediction times are "YYYY-MM-DD HH:MM" local strings, so plain string
// comparison orders them chronologically -- no Date parsing needed.
export function nextTideEvent(tidePredictions, dateStr, todayStr, nowHour, nowMinute = 0) {
  if (!tidePredictions) return null;
  const sorted = [...tidePredictions].sort((a, b) => (a.t < b.t ? -1 : a.t > b.t ? 1 : 0));
  if (dateStr !== todayStr) return sorted.find((p) => p.t.slice(0, 10) === dateStr) || null;
  // Today: the next event from now, which after the evening's last tide
  // is tomorrow's first one -- not a tide that already happened.
  const nowStr = `${todayStr} ${String(nowHour).padStart(2, "0")}:${String(nowMinute).padStart(2, "0")}`;
  return sorted.find((p) => p.t >= nowStr) || null;
}

export function buildDays(rawData, location) {
  const weather = rawData.weather || null;
  const marine = rawData.marine || null;
  const tides = rawData.tides ? rawData.tides.predictions : null;

  const { dateStr: todayStr, hour: nowHour, minute: nowMinute } = nowInNY();
  // Per-location weights are overrides on top of the defaults, so a
  // partial object like { windSpeed: 0.32 } doesn't drop every other
  // factor out of the score.
  const weights = location.weights ? { ...Scoring.DEFAULT_WEIGHTS, ...location.weights } : undefined;

  // Normally the day list comes straight from Open-Meteo's daily
  // forecast. When weather data isn't available at all, fall back to
  // whatever date range the one live source we DO have (NOAA tides)
  // covers, anchored 2 days back from today -- we never show more days
  // than we have at least some real data for.
  let dailyTimes = (weather && weather.daily && weather.daily.time) || [];
  if (dailyTimes.length === 0 && tides && tides.length) {
    const tideDates = Array.from(new Set(tides.map((p) => p.t.slice(0, 10)))).sort();
    const start = daysBetween(tideDates[0], todayStr) < -2 ? addCalendarDays(todayStr, -2) : tideDates[0];
    dailyTimes = tideDates.filter((d) => d >= start);
  }

  const WEATHER_VARS = [
    "wind_speed_10m", "wind_gusts_10m", "wind_direction_10m",
    "temperature_2m", "apparent_temperature", "precipitation",
    "precipitation_probability", "cloud_cover", "surface_pressure",
    "visibility", "weather_code",
  ];
  const MARINE_VARS = [
    "wave_height", "wave_period", "wave_direction",
    "swell_wave_height", "swell_wave_period",
    "wind_wave_height", "sea_surface_temperature",
  ];

  // Only trust weather.daily's own index-i alignment when the day list
  // actually came from weather.daily.time; in the tide-only fallback
  // there is no weather array to align with.
  const weatherDailyIndex = {};
  if (weather && weather.daily && weather.daily.time) {
    weather.daily.time.forEach((d, idx) => (weatherDailyIndex[d] = idx));
  }

  const days = dailyTimes.map((dateStr) => {
    const dayIndexFromToday = daysBetween(dateStr, todayStr);
    const i = weatherDailyIndex[dateStr];
    const weatherRows = weather ? hourlySliceForDate(weather.hourly, dateStr, WEATHER_VARS) : [];
    const marineRows = marine ? hourlySliceForDate(marine.hourly, dateStr, MARINE_VARS) : [];
    const marineByHour = {};
    marineRows.forEach((r) => (marineByHour[r.hour] = r));

    const nonNullWave = marineRows.filter((r) => r.wave_height !== null).length;
    const marineAvailable = nonNullWave >= 4;

    const window5to11 = weatherRows.map((w) => {
      const m = marineByHour[w.hour] || {};
      return {
        hour: w.hour,
        windMph: w.wind_speed_10m,
        gustMph: w.wind_gusts_10m,
        windDirDeg: w.wind_direction_10m,
        waveFt: marineAvailable ? valueOrNull(m.wave_height) : null,
        periodSec: marineAvailable ? valueOrNull(m.wave_period) : null,
        precipIn: w.precipitation,
        precipProbPct: w.precipitation_probability,
        isThunderstorm: THUNDER_CODES.has(w.weather_code),
        cloudPct: w.cloud_cover,
        pressureHpa: w.surface_pressure,
        visibilityMi: w.visibility, // dataFetch normalizes visibility to miles
        tempF: w.temperature_2m,
        apparentTempF: w.apparent_temperature,
      };
    });

    const sstValues = marineRows
      .map((r) => r.sea_surface_temperature)
      .filter((v) => v !== null && v !== undefined);
    const sstF = sstValues.length ? sstValues.reduce((a, b) => a + b, 0) / sstValues.length : null;

    const tideEvents = tideEventsForDate(tides, dateStr);
    const sunriseIso =
      weather && weather.daily && weather.daily.sunrise && i !== undefined ? weather.daily.sunrise[i] : null;
    const sunsetIso =
      weather && weather.daily && weather.daily.sunset && i !== undefined ? weather.daily.sunset[i] : null;
    let sunriseParts = sunriseIso ? splitTimeOfDay(sunriseIso) : null;
    let sunsetParts = sunsetIso ? splitTimeOfDay(sunsetIso) : null;
    let sunTimesComputed = false;
    if (!sunriseParts || !sunsetParts) {
      const computed = sunTimes(location.lat, location.lon, dateStr);
      if (computed) {
        sunriseParts = sunriseParts || computed.rise;
        sunsetParts = sunsetParts || computed.set;
        sunTimesComputed = true;
      }
    }
    const sunrise = sunriseParts ? dummyTime(sunriseParts.hour, sunriseParts.minute) : dummyTime(6, 30);

    const tideEventsInWindow = tideEvents.filter((e) => e.hour >= 5 && e.hour <= 11);
    const sunriseMinutes = sunriseParts ? sunriseParts.hour * 60 + sunriseParts.minute : null;
    const tideEventsNearSunrise =
      sunriseMinutes !== null &&
      tideEvents.some((e) => {
        const em = e.hour * 60 + e.minute;
        return em >= sunriseMinutes && em <= sunriseMinutes + 120;
      });

    const month = parseInt(dateStr.slice(5, 7), 10);

    const context = {
      weights,
      windAgainstTide: location.windAgainstTide,
      marineAvailable,
      sstF,
      tideStage: tideStageAt5am(tides, dateStr),
      tideEventsInWindow,
      tideEventsNearSunrise,
      pressureTrendHpaPer12h: weather ? pressureTrend(weather.hourly, dateStr) : null,
      speciesConfig: location.species,
      month,
      dayIndexFromToday,
    };

    const scoreResult = window5to11.length
      ? Scoring.computeDayScore(window5to11, context)
      : Scoring.computeDayScore([], context);

    const whenToGo = window5to11.length
      ? Scoring.computeWhenToGo(window5to11, sunrise, scoreResult.capReasons)
      : null;
    const species = Scoring.recommendSpecies(location.species, {
      month,
      sstF,
      finalScore: scoreResult.score,
      avgWindMph: scoreResult.inputs ? scoreResult.inputs.avgWindMph : null,
      roughWaterAdvice: location.roughWaterAdvice,
    });
    const spots = Scoring.recommendSpots(location.spots, {
      avgWaveFt: scoreResult.inputs ? scoreResult.inputs.avgWaveFt : null,
      avgPeriodSec: scoreResult.inputs ? scoreResult.inputs.avgPeriodSec : null,
      avgDirDeg: scoreResult.inputs ? scoreResult.inputs.avgDirDeg : null,
      tideEventsInWindow,
    });

    const dailyHigh =
      weather && weather.daily && weather.daily.temperature_2m_max && i !== undefined
        ? weather.daily.temperature_2m_max[i]
        : null;
    const dailyLow =
      weather && weather.daily && weather.daily.temperature_2m_min && i !== undefined
        ? weather.daily.temperature_2m_min[i]
        : null;

    let label;
    if (dayIndexFromToday === 0) label = "TODAY";
    else if (dayIndexFromToday === 1) label = "TOMORROW";
    else if (dayIndexFromToday === -1) label = "YESTERDAY";
    else if (dayIndexFromToday < -1) label = `${-dayIndexFromToday} DAYS AGO`;
    else label = `+${dayIndexFromToday} DAYS`;

    return {
      dateStr,
      dayIndexFromToday,
      isPast: dayIndexFromToday < 0,
      label,
      window5to11,
      score: scoreResult,
      whenToGo,
      species,
      spots,
      sunrise: sunriseParts,
      sunset: sunsetParts,
      sunTimesComputed,
      dailyHigh,
      dailyLow,
      sstF,
      moon: moonPhase(dateStr),
      marineAvailable,
      tideEvents,
      nextTideEvent: nextTideEvent(tides, dateStr, todayStr, nowHour, nowMinute),
    };
  });

  // Default selection: today before noon, tomorrow at/after noon.
  const wantTomorrow = nowHour >= 12;
  let defaultIndex = days.findIndex((d) => d.dayIndexFromToday === (wantTomorrow ? 1 : 0));
  if (defaultIndex < 0) defaultIndex = days.findIndex((d) => d.dayIndexFromToday === 0);
  if (defaultIndex < 0) defaultIndex = Math.min(2, days.length - 1);

  return { days, defaultIndex, todayStr };
}
