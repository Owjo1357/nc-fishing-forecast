/**
 * SCORING ENGINE
 * ------------------------------------------------------------------
 * Pure functions only: every function here takes plain data in and
 * returns plain data out. Nothing touches the DOM, nothing reads a
 * clock internally (the caller passes `now`), nothing fetches. That
 * makes this file unit-testable and tunable on its own -- see
 * scoring.test.js -- without touching the UI at all.
 *
 * All inputs are imperial (mph, ft, °F, inches, nautical miles) and
 * all times are plain local-time strings/Date objects already
 * resolved to America/New_York by the caller.
 *
 * DO NOT retune the weights, safety-cap thresholds, or rating bands
 * without an explicit decision -- they are deliberate and match the
 * functional spec exactly.
 */

export const DEFAULT_WEIGHTS = {
  windSpeed: 0.28,
  windDirection: 0.07,
  waveHeight: 0.22,
  wavePeriod: 0.08,
  rainStorm: 0.12,
  temperature: 0.08,
  cloudCover: 0.05,
  pressureTrend: 0.05,
  tideCurrent: 0.05,
};

export const RATING_BANDS = [
  { min: 88, max: 100, stars: 5, word: "Excellent", color: "#1E6B45" },
  { min: 72, max: 87, stars: 4, word: "Good", color: "#4C8C4A" },
  { min: 55, max: 71, stars: 3, word: "Fair", color: "#B8862A" },
  { min: 38, max: 54, stars: 2, word: "Slow", color: "#C1743D" },
  { min: 0, max: 37, stars: 1, word: "Poor", color: "#B3453A" },
];

const COMPASS_16 = [
  "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
];

// ---------------------------------------------------------------
// Small numeric helpers
// ---------------------------------------------------------------

export function clamp(x, lo, hi) {
  return Math.max(lo, Math.min(hi, x));
}

function lerp(x, x0, x1, y0, y1) {
  if (x1 === x0) return y0;
  const t = clamp((x - x0) / (x1 - x0), 0, 1);
  return y0 + t * (y1 - y0);
}

export function mean(arr) {
  const v = arr.filter((x) => x !== null && x !== undefined && !Number.isNaN(x));
  if (v.length === 0) return null;
  return v.reduce((a, b) => a + b, 0) / v.length;
}

export function degToCompass(deg) {
  if (deg === null || deg === undefined) return null;
  const idx = Math.round(((((deg % 360) + 360) % 360) / 22.5)) % 16;
  return COMPASS_16[idx];
}

function fmtTime(date) {
  // date: JS Date already in the correct wall-clock instant; we format
  // using its local getters as prepared by the caller (America/New_York).
  let h = date.getHours();
  const m = date.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, "0")} ${ampm}`;
}

function addMinutes(date, mins) {
  return new Date(date.getTime() + mins * 60000);
}

// ---------------------------------------------------------------
// Sub-scores. Each returns { score: 0-100|null, detail: string }
// A null score means "not enough data for this factor" -- the
// caller drops it from the weighted sum and reweights the rest.
// ---------------------------------------------------------------

function scoreWindSpeed(avgWindMph, maxGustMph) {
  if (avgWindMph === null || avgWindMph === undefined) return { score: null };
  let score;
  if (avgWindMph <= 8) score = lerp(avgWindMph, 0, 8, 100, 100);
  else if (avgWindMph <= 12) score = lerp(avgWindMph, 8, 12, 100, 85);
  else if (avgWindMph <= 15) score = lerp(avgWindMph, 12, 15, 85, 65);
  else if (avgWindMph <= 20) score = lerp(avgWindMph, 15, 20, 65, 35);
  else score = lerp(avgWindMph, 20, 30, 35, 10);
  score = clamp(score, 0, 100);

  let gustPenalty = 0;
  if (maxGustMph !== null && maxGustMph !== undefined && maxGustMph - avgWindMph > 8) {
    gustPenalty = 10;
  }
  return {
    score: clamp(score - gustPenalty, 0, 100),
    gustPenalty,
  };
}

function scoreWindDirection(avgDirDeg, tideStage) {
  if (avgDirDeg === null || avgDirDeg === undefined) return { score: null };
  // Base score by 8-point direction: offshore/side-offshore (W/NW/SW)
  // flattens and cleans the nearshore water and is rewarded; onshore
  // (NE/E/ENE) builds chop and dirty water, with NE the worst case
  // for this stretch of coast.
  const base8 = { W: 95, NW: 90, SW: 85, N: 60, S: 55, SE: 35, E: 20, NE: 10 };
  const dirs8 = Object.keys(base8);
  const angles8 = { N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315 };
  // Interpolate around the circle between the two nearest of the 8
  // principal directions.
  let best = dirs8
    .map((d) => {
      let diff = Math.abs(((avgDirDeg - angles8[d] + 540) % 360) - 180);
      return { d, diff };
    })
    .sort((a, b) => a.diff - b.diff);
  const [n1, n2] = best;
  let score;
  if (n1.diff === 0) score = base8[n1.d];
  else {
    const total = n1.diff + n2.diff;
    score = (base8[n1.d] * n2.diff + base8[n2.d] * n1.diff) / total;
  }

  // Wind-against-tide penalty at the inlet: on a flood tide the
  // current runs in (roughly onshore/westerly into the inlet); on an
  // ebb it runs out (roughly offshore/easterly). Wind opposing the
  // running current stacks up short, steep, dangerous chop right at
  // the inlet mouth. This is a heuristic based on general inlet
  // hydrodynamics, not a measured current -- kept as a modest penalty.
  let windAgainstTide = false;
  if (tideStage === "flood" && avgDirDeg >= 45 && avgDirDeg <= 135) {
    windAgainstTide = true; // easterly wind vs. incoming (westerly-ish) current
  } else if (tideStage === "ebb" && avgDirDeg >= 225 && avgDirDeg <= 315) {
    windAgainstTide = true; // westerly wind vs. outgoing (easterly-ish) current
  }
  if (windAgainstTide) score -= 12;

  return { score: clamp(score, 0, 100), windAgainstTide };
}

function scoreWaveHeight(heightFt) {
  if (heightFt === null || heightFt === undefined) return { score: null };
  let score;
  if (heightFt <= 2) score = lerp(heightFt, 0, 2, 100, 75);
  else if (heightFt <= 3) score = lerp(heightFt, 2, 3, 75, 45);
  else if (heightFt <= 4) score = lerp(heightFt, 3, 4, 45, 20);
  else if (heightFt <= 5) score = lerp(heightFt, 4, 5, 20, 0);
  else score = 0;
  return { score: clamp(score, 0, 100) };
}

function scoreWavePeriod(heightFt, periodSec) {
  if (periodSec === null || periodSec === undefined || heightFt === null || heightFt === undefined) {
    return { score: null };
  }
  // Long-period groundswell (8s+) is rolling and trollable at a given
  // height; short-period wind chop (<5s) is miserable at the same
  // height, and costs real points once there's any size to it (>=2ft).
  let score;
  if (periodSec >= 8) score = 100;
  else if (periodSec >= 6) score = lerp(periodSec, 6, 8, 75, 100);
  else if (periodSec >= 5) score = lerp(periodSec, 5, 6, 55, 75);
  else score = lerp(periodSec, 2, 5, 15, 55);

  if (periodSec < 5 && heightFt >= 2) {
    score -= 20; // short period + real size = genuinely miserable
  }
  return { score: clamp(score, 0, 100) };
}

function scoreRainStorm(precipInPerHr, precipProbPct, isThunderstorm) {
  if (
    (precipInPerHr === null || precipInPerHr === undefined) &&
    (precipProbPct === null || precipProbPct === undefined)
  ) {
    return { score: null };
  }
  let score = 100;
  if (precipInPerHr !== null && precipInPerHr !== undefined) {
    if (precipInPerHr > 0.3) score -= 35; // heavy rain, moderate penalty
    else if (precipInPerHr > 0.05) score -= 8; // light rain barely matters
  }
  if (precipProbPct !== null && precipProbPct !== undefined && isThunderstorm) {
    if (precipProbPct >= 30) score -= 40; // safety factor, heavy penalty
  }
  return { score: clamp(score, 0, 100) };
}

function scoreTemperature(apparentTempF, sstF, bestSpeciesRange) {
  const hasSst = sstF !== null && sstF !== undefined && bestSpeciesRange;
  const hasApparent = apparentTempF !== null && apparentTempF !== undefined;
  if (!hasSst && !hasApparent) return { score: null };
  let score = 80; // neutral baseline
  if (sstF !== null && sstF !== undefined && bestSpeciesRange) {
    const { sstMinF, sstMaxF } = bestSpeciesRange;
    if (sstMinF !== null && sstMinF !== undefined) {
      if (sstF < sstMinF) score = clamp(lerp(sstF, sstMinF - 10, sstMinF, 30, 80), 0, 100);
      else if (sstMaxF && sstF > sstMaxF) score = clamp(lerp(sstF, sstMaxF, sstMaxF + 10, 80, 30), 0, 100);
      else score = 100; // squarely in range
    }
  }
  if (apparentTempF !== null && apparentTempF !== undefined) {
    if (apparentTempF < 45) score -= 15;
    else if (apparentTempF > 95) score -= 15;
  }
  return { score: clamp(score, 0, 100) };
}

function scoreCloudCover(cloudPct) {
  if (cloudPct === null || cloudPct === undefined) return { score: null };
  if (cloudPct >= 30 && cloudPct <= 70) return { score: 90 };
  return { score: 72 }; // neutral -- fully clear or fully overcast
}

function scorePressureTrend(trendHpaPer12h) {
  if (trendHpaPer12h === null || trendHpaPer12h === undefined) return { score: null };
  // Falling ahead of a front: bonus. Sharply rising behind a front
  // (the bluebird post-frontal day): penalty. Steady: neutral.
  if (trendHpaPer12h <= -2) return { score: 92, trend: "falling" };
  if (trendHpaPer12h < -0.5) return { score: 80, trend: "falling" };
  if (trendHpaPer12h >= 3) return { score: 45, trend: "rising sharply" };
  if (trendHpaPer12h > 0.5) return { score: 65, trend: "rising" };
  return { score: 70, trend: "steady" };
}

function scoreTideCurrent(tideEventsInWindow, tideEventsNearSunrise) {
  let score = 60; // slack-ish baseline
  if (tideEventsInWindow && tideEventsInWindow.length > 0) score = 85;
  if (tideEventsNearSunrise) score = 100;
  return { score };
}

// ---------------------------------------------------------------
// Rating band lookup (keeps number/stars/word/color always in sync)
// ---------------------------------------------------------------

// Within a band, interpolate from (stars-0.5) at the bottom of the
// band to `stars` at the top, rounded to the nearest half star.
function starsForScore(score, band) {
  const bandSpan = band.max - band.min || 1;
  const posInBand = clamp((score - band.min) / bandSpan, 0, 1);
  const raw = band.stars - 0.5 + posInBand * 0.5;
  return clamp(Math.round(raw * 2) / 2, 0.5, 5);
}

// ---------------------------------------------------------------
// Safety caps -- applied AFTER the weighted sum, and they only ever
// lower the score.
// ---------------------------------------------------------------

function applySafetyCaps(score, inputs) {
  const reasons = [];
  let capped = score;

  const { avgWindMph, maxGustMph, waveHeightFt, thunderstormProbPct, visibilityMi } = inputs;

  if ((avgWindMph !== null && avgWindMph >= 25) || (maxGustMph !== null && maxGustMph >= 30)) {
    if (capped > 25) {
      capped = 25;
      reasons.push("small-craft-wind");
    }
  }
  if (waveHeightFt !== null && waveHeightFt >= 5) {
    if (capped > 25) {
      capped = 25;
      reasons.push("seas");
    }
  }
  if (thunderstormProbPct !== null && thunderstormProbPct >= 50) {
    if (capped > 30) {
      capped = 30;
      reasons.push("thunderstorms");
    }
  }
  let fogWarning = false;
  if (visibilityMi !== null && visibilityMi !== undefined && visibilityMi < 1) {
    if (capped > 40) {
      capped = 40;
    }
    fogWarning = true;
    reasons.push("fog");
  }
  return { score: capped, reasons, fogWarning };
}

// ---------------------------------------------------------------
// Main entry point: computeDayScore
// ---------------------------------------------------------------
// `window5to11` is an array of up to 7 hourly samples (05:00-11:00
// local), each: { hour, windMph, gustMph, windDirDeg, waveFt, periodSec,
// precipIn, precipProbPct, isThunderstorm, cloudPct, pressureHpa,
// visibilityMi, tempF, apparentTempF }. Any field may be null.
//
// `context` carries everything that isn't per-hour: sstF, tideStage
// ('flood'|'ebb'|null), tideEventsInWindow, tideEventsNearSunrise,
// pressureTrendHpaPer12h, marineAvailable (bool), weights (object,
// defaults to DEFAULT_WEIGHTS), speciesConfig (array), spotsConfig
// (array), month (1-12), dayIndexFromToday (for confidence).

export function computeDayScore(window5to11, context) {
  const weights = context.weights || DEFAULT_WEIGHTS;
  const hasAnyHour = window5to11 && window5to11.length > 0;

  const avgWindMph = hasAnyHour ? mean(window5to11.map((h) => h.windMph)) : null;
  const gustList = hasAnyHour
    ? window5to11
        .map((h) => (h.gustMph === null || h.gustMph === undefined ? -Infinity : h.gustMph))
        .filter((v) => v > -Infinity)
    : [];
  const maxGustMph = gustList.length ? Math.max(...gustList) : -Infinity;
  const maxGustSafe = maxGustMph === -Infinity ? null : maxGustMph;
  const avgDirDeg = hasAnyHour ? circularMeanDeg(window5to11.map((h) => h.windDirDeg)) : null;
  const avgWaveFt = context.marineAvailable && hasAnyHour ? mean(window5to11.map((h) => h.waveFt)) : null;
  const avgPeriodSec = context.marineAvailable && hasAnyHour ? mean(window5to11.map((h) => h.periodSec)) : null;
  const maxPrecipIn = hasAnyHour ? Math.max(...window5to11.map((h) => h.precipIn ?? 0)) : null;
  const maxPrecipProb = hasAnyHour ? Math.max(...window5to11.map((h) => h.precipProbPct ?? 0)) : null;
  const anyThunder = hasAnyHour ? window5to11.some((h) => h.isThunderstorm) : false;
  const avgCloud = hasAnyHour ? mean(window5to11.map((h) => h.cloudPct)) : null;
  const avgApparentTemp = hasAnyHour ? mean(window5to11.map((h) => h.apparentTempF)) : null;
  const minVisibility = hasAnyHour
    ? (() => {
        const vs = window5to11.map((h) => h.visibilityMi).filter((v) => v !== null && v !== undefined);
        return vs.length ? Math.min(...vs) : null;
      })()
    : null;

  // Best-matching active species for the SST/temperature sub-score
  const activeSpecies = (context.speciesConfig || []).filter((s) => s.activeMonths.includes(context.month));
  const bestSpeciesRange = activeSpecies.find((s) => s.sstMinF !== null) || activeSpecies[0] || null;

  const sub = {
    windSpeed: scoreWindSpeed(avgWindMph, maxGustSafe),
    windDirection: scoreWindDirection(avgDirDeg, context.tideStage),
    waveHeight: scoreWaveHeight(avgWaveFt),
    wavePeriod: scoreWavePeriod(avgWaveFt, avgPeriodSec),
    rainStorm: scoreRainStorm(maxPrecipIn, maxPrecipProb, anyThunder),
    temperature: scoreTemperature(avgApparentTemp, context.sstF, bestSpeciesRange),
    cloudCover: scoreCloudCover(avgCloud),
    pressureTrend: scorePressureTrend(context.pressureTrendHpaPer12h),
    tideCurrent: scoreTideCurrent(context.tideEventsInWindow, context.tideEventsNearSunrise),
  };

  // Weighted sum with reweighting for any factor that came back null
  // (missing data) rather than faking a number for it.
  let usedWeight = 0;
  let weightedTotal = 0;
  const breakdown = {};
  for (const key of Object.keys(weights)) {
    const s = sub[key];
    breakdown[key] = { score: s && s.score !== null ? Math.round(s.score) : null, weight: weights[key] };
    if (s && s.score !== null) {
      usedWeight += weights[key];
      weightedTotal += s.score * weights[key];
    }
  }
  const marineLimited = !context.marineAvailable;
  // Require at least ~15% of the weighted model to have real data before
  // we'll show a number at all -- otherwise a single small-weight factor
  // (e.g. just tide, at 5%) would get reweighted up to 100% of the score
  // and read as a confident rating built on almost nothing.
  const MIN_USABLE_WEIGHT = 0.15;
  const rawScore = usedWeight >= MIN_USABLE_WEIGHT ? weightedTotal / usedWeight : null;

  if (rawScore === null) {
    return {
      score: null,
      stars: null,
      ratingWord: null,
      color: "#9AA3AE",
      summary: "Not enough data to score this morning yet.",
      breakdown,
      marineLimited,
      confidenceNote: null,
      capReasons: [],
      fogWarning: false,
    };
  }

  const caps = applySafetyCaps(Math.round(rawScore), {
    avgWindMph,
    maxGustMph: maxGustSafe,
    waveHeightFt: avgWaveFt,
    thunderstormProbPct: anyThunder ? maxPrecipProb : 0,
    visibilityMi: minVisibility,
  });

  const finalScore = clamp(Math.round(caps.score), 0, 100);
  const band =
    RATING_BANDS.find((b) => finalScore >= b.min && finalScore <= b.max) ||
    RATING_BANDS[RATING_BANDS.length - 1];
  const stars = starsForScore(finalScore, band);

  const confidenceNote =
    context.dayIndexFromToday !== null && context.dayIndexFromToday >= 6
      ? "Lower confidence this far out"
      : null;

  const summary = buildSummary({
    band,
    avgWindMph,
    avgDirDeg,
    avgWaveFt,
    maxPrecipProb,
    anyThunder,
    avgApparentTemp,
    capReasons: caps.reasons,
    marineLimited,
    fogWarning: caps.fogWarning,
  });

  return {
    score: finalScore,
    stars,
    ratingWord: band.word,
    color: band.color,
    summary,
    breakdown,
    marineLimited,
    confidenceNote,
    capReasons: caps.reasons,
    fogWarning: caps.fogWarning,
    inputs: {
      avgWindMph, maxGustMph: maxGustSafe, avgDirDeg, avgWaveFt, avgPeriodSec,
      maxPrecipIn, maxPrecipProb, anyThunder, avgCloud, avgApparentTemp, minVisibility,
    },
  };
}

export function circularMeanDeg(degs) {
  const v = degs.filter((d) => d !== null && d !== undefined);
  if (v.length === 0) return null;
  let sinSum = 0,
    cosSum = 0;
  for (const d of v) {
    const r = (d * Math.PI) / 180;
    sinSum += Math.sin(r);
    cosSum += Math.cos(r);
  }
  let deg = (Math.atan2(sinSum, cosSum) * 180) / Math.PI;
  if (deg < 0) deg += 360;
  return deg;
}

function buildSummary({
  band, avgWindMph, avgDirDeg, avgWaveFt, maxPrecipProb, anyThunder,
  avgApparentTemp, capReasons, marineLimited, fogWarning,
}) {
  const dir = degToCompass(avgDirDeg);
  const windPhrase = avgWindMph !== null ? `${Math.round(avgWindMph)} mph ${dir || ""}`.trim() : "wind data unavailable";
  const wavePhrase = avgWaveFt !== null ? `${avgWaveFt.toFixed(1)} ft seas` : "seas unavailable";
  const tempPhrase = avgApparentTemp !== null ? `around ${Math.round(avgApparentTemp)}°F` : "";

  if (capReasons.includes("small-craft-wind") || capReasons.includes("seas")) {
    return `Small craft conditions — ${windPhrase} with ${wavePhrase}. Not a trolling day.`;
  }
  if (capReasons.includes("thunderstorms")) {
    return `Thunderstorm risk is high this morning — ${windPhrase}, ${Math.round(maxPrecipProb)}% storm chance. Not worth the run.`;
  }
  if (fogWarning) {
    return `Dense fog expected — visibility under a mile. ${windPhrase}${tempPhrase ? ", " + tempPhrase : ""}. Wait for it to lift before running out.`;
  }

  const bits = [];
  if (band.word === "Excellent" || band.word === "Good") bits.push(`calm-ish winds (${windPhrase})`);
  else bits.push(`${windPhrase} wind`);
  bits.push(wavePhrase);
  if (anyThunder && maxPrecipProb >= 15) bits.push(`${Math.round(maxPrecipProb)}% storm chance`);
  if (tempPhrase) bits.push(tempPhrase);
  const lead =
    band.word === "Excellent" ? "Excellent morning"
      : band.word === "Good" ? "Good morning"
      : band.word === "Fair" ? "Fair morning"
      : band.word === "Slow" ? "Slow morning"
      : "Poor morning";
  let sentence = `${lead} — ${bits.join(", ")}.`;
  if (marineLimited) sentence += " (limited marine data this far out)";
  return sentence;
}

// ---------------------------------------------------------------
// When-to-go recommendation
// ---------------------------------------------------------------
// early = hours 5,6,7,8 ; late = hours 8,9,10,11 (8 counted in both,
// as the pivot). sunrise is a Date already in local wall-clock time.

export function computeWhenToGo(window5to11, sunrise) {
  const byHour = {};
  for (const h of window5to11) byHour[h.hour] = h;

  const early = [5, 6, 7, 8].map((h) => byHour[h]).filter(Boolean);
  const late = [8, 9, 10, 11].map((h) => byHour[h]).filter(Boolean);

  const earlyWind = mean(early.map((h) => h.windMph));
  const lateWind = mean(late.map((h) => h.windMph));
  const earlyWave = mean(early.map((h) => h.waveFt));
  const lateWave = mean(late.map((h) => h.waveFt));
  const earlyStorm = Math.max(0, ...early.map((h) => h.precipProbPct ?? 0));
  const lateStorm = Math.max(0, ...late.map((h) => h.precipProbPct ?? 0));
  const earlyVis = Math.min(99, ...early.map((h) => h.visibilityMi ?? 99));

  const dWind = earlyWind !== null && lateWind !== null ? lateWind - earlyWind : 0;
  const dWave = earlyWave !== null && lateWave !== null ? lateWave - earlyWave : 0;
  const dStorm = lateStorm - earlyStorm;

  // For "does it actually recover" we look strictly after the 8 AM
  // pivot hour, since 8 AM itself is shared by both blocks and would
  // otherwise mask a recovery that starts right at 9.
  const lateStrict = [9, 10, 11].map((h) => byHour[h]).filter(Boolean);
  const lateStrictWind = mean(lateStrict.map((h) => h.windMph));
  const lateStrictVis = lateStrict.length ? Math.min(...lateStrict.map((h) => h.visibilityMi ?? 99)) : 99;
  const lateStrictStorm = lateStrict.length ? Math.max(0, ...lateStrict.map((h) => h.precipProbPct ?? 0)) : 0;

  const earlyBlown = (earlyWind !== null && earlyWind >= 20) || earlyVis < 1 || earlyStorm >= 40;
  const lateRecovers = (lateStrictWind === null || lateStrictWind < 15) && lateStrictVis >= 1 && lateStrictStorm < 30;

  let category, arrival, end, reason;

  if (earlyBlown && lateRecovers) {
    category = "Wait it out";
    const cleanHour = late.find(
      (h) => (h.windMph ?? 99) < 15 && (h.visibilityMi ?? 99) >= 1 && (h.precipProbPct ?? 0) < 30
    );
    const startHour = cleanHour ? cleanHour.hour : 9;
    arrival = setHour(sunrise, startHour);
    end = setHour(sunrise, 11);
    reason =
      earlyVis < 1
        ? `fog should lift by ${fmtTime(arrival)}`
        : `wind drops from ${Math.round(earlyWind)} to ${Math.round(lateWind)} mph after ${fmtTime(arrival)}`;
  } else if (dWind >= 6 || dWave >= 1.0 || (lateStorm >= 40 && earlyStorm < 20)) {
    category = "Get out early";
    arrival = addMinutes(sunrise, -45);
    end = addMinutes(arrival, 195); // 3h15m
    reason =
      dWind >= dWave * 4
        ? `wind goes from ${Math.round(earlyWind)} to ${Math.round(lateWind)} mph by ${fmtTime(setHour(sunrise, 9))}`
        : `seas build from ${earlyWave?.toFixed(1)} to ${lateWave?.toFixed(1)} ft through the morning`;
  } else if (dWind >= 2.5 || dWave >= 0.4 || dStorm >= 15) {
    category = "Early is better, but no rush";
    arrival = addMinutes(sunrise, -15);
    end = addMinutes(arrival, 255); // 4h15m
    reason = `wind builds from ${Math.round(earlyWind)} to ${Math.round(lateWind)} mph through the morning`;
  } else {
    category = "No hurry";
    arrival = addMinutes(sunrise, 30);
    end = setHour(sunrise, 11);
    reason =
      dWind <= -2 || dWave <= -0.3
        ? `conditions ease through the morning — wind drops to ${Math.round(lateWind)} mph by 11`
        : `wind stays light all morning`;
  }

  return {
    category,
    windowStart: fmtTime(arrival),
    windowEnd: fmtTime(end),
    reason,
    label:
      category === "No hurry"
        ? `${fmtTime(arrival)} – ${fmtTime(end)}, and it only gets better`
        : `${fmtTime(arrival)} – ${fmtTime(end)}`,
  };
}

function setHour(sunrise, hour) {
  const d = new Date(sunrise.getTime());
  d.setHours(hour, 0, 0, 0);
  return d;
}

// ---------------------------------------------------------------
// Species recommendation
// ---------------------------------------------------------------

export function recommendSpecies(speciesConfig, { month, sstF, finalScore, avgWindMph }) {
  const active = speciesConfig.filter((s) => s.activeMonths.includes(month));
  const conditionsAreRough = finalScore !== null && finalScore < 45;

  const scored = active
    .filter((s) => !s.inshoreFallback)
    .map((s) => {
      let fit = 50;
      let reason;
      if (sstF !== null && s.sstMinF !== null) {
        if (sstF >= s.sstMinF && (!s.sstMaxF || sstF <= s.sstMaxF)) {
          fit = 90;
          reason = `SST ${Math.round(sstF)}°F and ${
            avgWindMph !== null ? Math.round(avgWindMph) + " mph wind" : "light wind"
          } — prime ${s.name.toLowerCase()} conditions.`;
        } else if (sstF < s.sstMinF) {
          fit = clamp(50 - (s.sstMinF - sstF) * 5, 0, 50);
          reason = `Water's still ${Math.round(s.sstMinF - sstF)}°F short of ideal for ${s.name.toLowerCase()}.`;
        } else {
          fit = 40;
          reason = `Water's running warm for ${s.name.toLowerCase()} but still worth a look.`;
        }
      } else {
        reason = s.notes;
      }
      if (conditionsAreRough && (s.id === "spanish-mackerel" || s.id === "mahi" || s.id === "cobia")) {
        fit -= 30; // these fall off hard in dirty/rough water
      }
      return { ...s, fit, reason };
    })
    .sort((a, b) => b.fit - a.fit);

  if (conditionsAreRough) {
    const fallback = speciesConfig.find((s) => s.inshoreFallback);
    const picks = scored.slice(0, 1).filter((s) => s.fit > 30);
    const result = fallback
      ? [...picks, { ...fallback, reason: "Wind and seas are up outside — wind is up, fish inside." }]
      : picks;
    return result.slice(0, 3);
  }

  return scored.slice(0, 3).filter((s) => s.fit > 15);
}

// ---------------------------------------------------------------
// Spot recommendation
// ---------------------------------------------------------------

export function recommendSpots(spotsConfig, { avgWaveFt, avgPeriodSec, avgDirDeg, tideEventsInWindow }) {
  const dir = degToCompass(avgDirDeg);
  const scored = spotsConfig
    .map((spot) => {
      let score = 100 - spot.distanceNm * 1.5; // prefer closer, all else equal
      let excluded = false;

      if (avgWaveFt !== null && spot.suits.maxWaveFt !== undefined && avgWaveFt > spot.suits.maxWaveFt) {
        excluded = true;
      }
      if (
        avgPeriodSec !== null &&
        spot.suits.minPeriodSec !== undefined &&
        avgPeriodSec < spot.suits.minPeriodSec &&
        spot.distanceNm > 5
      ) {
        excluded = true; // don't send someone on a long run in short-period chop
      }
      if (dir && spot.suits.preferredWindFrom && spot.suits.preferredWindFrom.includes(dir)) {
        score += 20;
      }
      if (dir && spot.suits.avoidWindFrom && spot.suits.avoidWindFrom.includes(dir)) {
        score -= 25;
      }
      if (spot.suits.tideMovingBonus && tideEventsInWindow && tideEventsInWindow.length > 0) {
        score += 15;
      }

      return { ...spot, matchScore: score, excluded };
    })
    .filter((s) => !s.excluded)
    .sort((a, b) => b.matchScore - a.matchScore);

  return scored.slice(0, 3).map((s) => ({
    id: s.id,
    name: s.name,
    distanceNm: s.distanceNm,
    depthFt: s.depthFt,
    verified: s.verified,
    note: s.note,
    reason: s.suits.description,
  }));
}
