import { describe, it, expect } from "vitest";
import { computeDayScore, computeWhenToGo, RATING_BANDS } from "./scoring.js";

// Minimal species config so the temperature sub-score has a range to
// work against when SST is present.
const speciesConfig = [
  { id: "spanish-mackerel", name: "Spanish mackerel", activeMonths: [8], sstMinF: 68, sstMaxF: 86, notes: "" },
];

function hour(h, over = {}) {
  return {
    hour: h,
    windMph: null, gustMph: null, windDirDeg: null,
    waveFt: null, periodSec: null,
    precipIn: null, precipProbPct: null, isThunderstorm: false,
    cloudPct: null, pressureHpa: null, visibilityMi: null,
    tempF: null, apparentTempF: null,
    ...over,
  };
}
const morning = (over) => [5, 6, 7, 8, 9, 10, 11].map((h) => hour(h, over));

const baseContext = {
  marineAvailable: false,
  sstF: null,
  tideStage: null,
  tideEventsInWindow: [],
  tideEventsNearSunrise: false,
  pressureTrendHpaPer12h: null,
  speciesConfig,
  month: 8,
  dayIndexFromToday: 0,
};

describe("§5 — no fabricated score when there is genuinely no data", () => {
  it("an empty morning window (no weather hours at all) returns a null score, not a number", () => {
    const r = computeDayScore([], baseContext);
    expect(r.score).toBeNull();
    expect(r.summary).toMatch(/not enough data/i);
  });

  it("stays null even when only the 5%-weight tide factor has data", () => {
    const ctx = { ...baseContext, tideEventsInWindow: [{ hour: 7, minute: 0, type: "H" }], tideEventsNearSunrise: true };
    const r = computeDayScore([], ctx);
    expect(r.score).toBeNull();
  });
});

describe("marine horizon — degrade, don't fake", () => {
  it("scores from weather factors alone and flags limited marine data", () => {
    const r = computeDayScore(morning({ windMph: 7, gustMph: 10, windDirDeg: 270, precipProbPct: 10, precipIn: 0, cloudPct: 40, apparentTempF: 74 }), baseContext);
    expect(r.score).not.toBeNull();
    expect(r.marineLimited).toBe(true);
    expect(r.inputs.avgWaveFt).toBeNull();
  });

  it("uses wave data when marine is available", () => {
    const ctx = { ...baseContext, marineAvailable: true };
    const r = computeDayScore(morning({ windMph: 5, gustMph: 7, windDirDeg: 270, waveFt: 1.2, periodSec: 8, precipProbPct: 0, precipIn: 0, cloudPct: 40, apparentTempF: 74 }), ctx);
    expect(r.marineLimited).toBe(false);
    expect(r.inputs.avgWaveFt).toBeCloseTo(1.2, 5);
    expect(r.score).toBeGreaterThan(70); // flat, light wind, long period
  });
});

describe("rating bands always agree", () => {
  it("every integer score 0-100 maps to exactly one band", () => {
    for (let s = 0; s <= 100; s++) {
      const bands = RATING_BANDS.filter((b) => s >= b.min && s <= b.max);
      expect(bands.length).toBe(1);
    }
  });

  it("computeDayScore's word/color always come from the band its number falls in", () => {
    const ctx = { ...baseContext, marineAvailable: true };
    for (const wind of [3, 9, 13, 18, 24]) {
      const r = computeDayScore(morning({ windMph: wind, gustMph: wind + 3, windDirDeg: 270, waveFt: wind / 8, periodSec: 7, precipProbPct: 0, precipIn: 0, cloudPct: 40, apparentTempF: 74 }), ctx);
      if (r.score === null) continue;
      const band = RATING_BANDS.find((b) => r.score >= b.min && b.max >= r.score);
      expect(r.ratingWord).toBe(band.word);
      expect(r.color).toBe(band.color);
    }
  });
});

describe("safety caps fire independently", () => {
  it("25+ mph sustained wind caps the score at 25", () => {
    const r = computeDayScore(morning({ windMph: 26, gustMph: 28, windDirDeg: 270, precipProbPct: 0, precipIn: 0, cloudPct: 40, apparentTempF: 74 }), baseContext);
    expect(r.score).toBeLessThanOrEqual(25);
    expect(r.capReasons).toContain("small-craft-wind");
    expect(r.summary).toMatch(/small craft/i);
  });

  it("30+ mph gust alone caps at 25", () => {
    const r = computeDayScore(morning({ windMph: 14, gustMph: 31, windDirDeg: 270, precipProbPct: 0, precipIn: 0, cloudPct: 40, apparentTempF: 74 }), baseContext);
    expect(r.score).toBeLessThanOrEqual(25);
    expect(r.capReasons).toContain("small-craft-wind");
  });

  it("5+ ft seas caps the score at 25", () => {
    const ctx = { ...baseContext, marineAvailable: true };
    const r = computeDayScore(morning({ windMph: 5, gustMph: 7, windDirDeg: 270, waveFt: 5.5, periodSec: 9, precipProbPct: 0, precipIn: 0, cloudPct: 40, apparentTempF: 74 }), ctx);
    expect(r.score).toBeLessThanOrEqual(25);
    expect(r.capReasons).toContain("seas");
  });

  it("50%+ thunderstorm probability caps the score at 30", () => {
    const r = computeDayScore(morning({ windMph: 6, gustMph: 8, windDirDeg: 270, precipProbPct: 60, precipIn: 0.02, isThunderstorm: true, cloudPct: 60, apparentTempF: 78 }), baseContext);
    expect(r.score).toBeLessThanOrEqual(30);
    expect(r.capReasons).toContain("thunderstorms");
  });

  it("sub-1-mile visibility caps at 40 and flags fog in the summary", () => {
    const r = computeDayScore(morning({ windMph: 4, gustMph: 6, windDirDeg: 270, precipProbPct: 0, precipIn: 0, cloudPct: 40, apparentTempF: 66, visibilityMi: 0.4 }), baseContext);
    expect(r.score).toBeLessThanOrEqual(40);
    expect(r.fogWarning).toBe(true);
    expect(r.summary).toMatch(/fog/i);
  });
});

describe("gust spread penalty", () => {
  it("subtracts points when gusts run >8 mph over sustained wind", () => {
    const calm = computeDayScore(morning({ windMph: 7, gustMph: 9, windDirDeg: 270, precipProbPct: 0, precipIn: 0, cloudPct: 40, apparentTempF: 74 }), baseContext);
    const gusty = computeDayScore(morning({ windMph: 7, gustMph: 18, windDirDeg: 270, precipProbPct: 0, precipIn: 0, cloudPct: 40, apparentTempF: 74 }), baseContext);
    expect(gusty.score).toBeLessThan(calm.score);
  });
});

describe("computeWhenToGo produces a real clock window", () => {
  it("returns HH:MM AM/PM strings and a category", () => {
    const sunrise = new Date(2000, 0, 1, 6, 30, 0, 0);
    const w = computeWhenToGo(morning({ windMph: 6, gustMph: 8, windDirDeg: 270, precipProbPct: 0, visibilityMi: 10 }), sunrise);
    expect(w.category).toBeTruthy();
    expect(w.windowStart).toMatch(/^\d+:\d\d (AM|PM)$/);
    expect(w.windowEnd).toMatch(/^\d+:\d\d (AM|PM)$/);
  });

  it("says 'Get out early' when wind builds hard through the morning", () => {
    const sunrise = new Date(2000, 0, 1, 6, 30, 0, 0);
    const byHour = { 5: 4, 6: 5, 7: 7, 8: 10, 9: 15, 10: 18, 11: 20 };
    const win = [5, 6, 7, 8, 9, 10, 11].map((h) => hour(h, { windMph: byHour[h], gustMph: byHour[h] + 3, windDirDeg: 270, precipProbPct: 0, visibilityMi: 10 }));
    const w = computeWhenToGo(win, sunrise);
    expect(w.category).toBe("Get out early");
  });
});
