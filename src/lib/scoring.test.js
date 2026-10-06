import { describe, it, expect } from "vitest";
import {
  computeDayScore, computeWhenToGo, recommendSpots, recommendSpecies, windFromAny,
  RATING_BANDS, DEFAULT_WIND_AGAINST_TIDE,
} from "./scoring.js";
import { LOCATIONS } from "../config/locations.js";

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
    // early block (5-8) vs late block (8-11) means, rounded
    expect(w.reason).toMatch(/wind (goes|builds) from 7 to 16 mph/);
  });

  it("never says 'wind builds from N to N mph' when the wind holds steady", () => {
    const sunrise = new Date(2000, 0, 1, 6, 30, 0, 0);
    // Flat 8 mph wind all morning, but the seas build 1.0 -> 2.6 ft.
    const wave = { 5: 1.0, 6: 1.1, 7: 1.3, 8: 1.7, 9: 2.2, 10: 2.5, 11: 2.8 };
    const win = [5, 6, 7, 8, 9, 10, 11].map((h) =>
      hour(h, { windMph: 8, gustMph: 11, windDirDeg: 270, waveFt: wave[h], periodSec: 5, precipProbPct: 0, visibilityMi: 10 })
    );
    const w = computeWhenToGo(win, sunrise);
    expect(w.reason).not.toMatch(/from (\d+) to \1 mph/);
    expect(w.reason).toMatch(/seas build from 1\.\d to 2\.\d ft/);
  });

  it("describes flat-calm mornings without inventing a wind change", () => {
    const sunrise = new Date(2000, 0, 1, 6, 30, 0, 0);
    const win = [5, 6, 7, 8, 9, 10, 11].map((h) =>
      hour(h, { windMph: 5, gustMph: 7, windDirDeg: 270, precipProbPct: 0, visibilityMi: 10 })
    );
    const w = computeWhenToGo(win, sunrise);
    expect(w.category).toBe("No hurry");
    expect(w.reason).not.toMatch(/from (\d+) to \1/);
    expect(w.reason).toMatch(/wind stays light all morning/);
  });
});

describe("wind-against-tide is configurable per location", () => {
  const ctx = { ...baseContext, tideStage: "flood" };
  const easterly = morning({ windMph: 7, gustMph: 9, windDirDeg: 90, precipProbPct: 0, precipIn: 0, cloudPct: 40, apparentTempF: 74 });

  it("applies Masonboro's flood/ebb penalty by default", () => {
    const withDefault = computeDayScore(easterly, ctx);
    const off = computeDayScore(easterly, { ...ctx, windAgainstTide: null });
    expect(off.breakdown.windDirection.score - withDefault.breakdown.windDirection.score).toBe(12);
  });

  it("explicitly passing the default ranges matches leaving them out", () => {
    const a = computeDayScore(easterly, ctx);
    const b = computeDayScore(easterly, { ...ctx, windAgainstTide: DEFAULT_WIND_AGAINST_TIDE });
    expect(b.score).toBe(a.score);
  });
});

describe("spot wind matching covers neighbouring compass points", () => {
  it("treats NNE and ENE as NE, but not N or E", () => {
    expect(windFromAny(22.5, ["NE"])).toBe(true); // NNE
    expect(windFromAny(67.5, ["NE"])).toBe(true); // ENE
    expect(windFromAny(0, ["NE"])).toBe(false);
    expect(windFromAny(90, ["NE"])).toBe(false);
    expect(windFromAny(350, ["N"])).toBe(true); // wraps through north
    expect(windFromAny(null, ["N"])).toBe(false);
  });

  it("a NNE wind now pushes the north-side Masonboro troll down", () => {
    const masonboro = LOCATIONS.find((l) => l.id === "masonboro-inlet");
    const args = { avgWaveFt: 1.5, avgPeriodSec: 8, tideEventsInWindow: [] };
    const nne = recommendSpots(masonboro.spots, { ...args, avgDirDeg: 25 }).map((s) => s.id);
    const west = recommendSpots(masonboro.spots, { ...args, avgDirDeg: 270 }).map((s) => s.id);
    expect(west).toContain("nearshore-north");
    expect(nne).not.toContain("nearshore-north");
    expect(nne).toContain("nearshore-south"); // the lee side on a NE-ish wind
  });
});

describe("mixed beach/boat locations recommend both kinds", () => {
  const cape = LOCATIONS.find((l) => l.id === "cape-lookout");

  it("returns up to two beach and two boat spots on a calm day", () => {
    const spots = recommendSpots(cape.spots, { avgWaveFt: 1.2, avgPeriodSec: 9, avgDirDeg: 300, tideEventsInWindow: [{ hour: 7 }] });
    expect(spots.filter((s) => s.access === "beach").length).toBe(2);
    expect(spots.filter((s) => s.access === "boat").length).toBe(2);
  });

  it("drops the boat runs when seas are up, but still offers the sheltered Bight", () => {
    const spots = recommendSpots(cape.spots, { avgWaveFt: 4.5, avgPeriodSec: 5, avgDirDeg: 45, tideEventsInWindow: [] });
    expect(spots.filter((s) => s.access === "boat")).toHaveLength(0);
    expect(spots.map((s) => s.id)).toContain("lookout-bight");
  });

  it("boat-only Masonboro still gets a plain top three", () => {
    const masonboro = LOCATIONS.find((l) => l.id === "masonboro-inlet");
    const spots = recommendSpots(masonboro.spots, { avgWaveFt: 1, avgPeriodSec: 9, avgDirDeg: 270, tideEventsInWindow: [] });
    expect(spots).toHaveLength(3);
    expect(spots.every((s) => s.access === "boat")).toBe(true);
  });

  it("uses the location's own rough-water advice for the inshore fallback", () => {
    const picks = recommendSpecies(cape.species, { month: 10, sstF: 72, finalScore: 20, avgWindMph: 24, roughWaterAdvice: cape.roughWaterAdvice });
    const fallback = picks.find((s) => s.inshoreFallback);
    expect(fallback.reason).toBe(cape.roughWaterAdvice);
  });
});

describe("location config sanity", () => {
  it("every location has a unique URL-safe id and the fields the app needs", () => {
    const ids = LOCATIONS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const l of LOCATIONS) {
      expect(l.id).toMatch(/^[a-z0-9-]+$/);
      expect(typeof l.lat).toBe("number");
      expect(typeof l.lon).toBe("number");
      expect(l.tideStationId).toBeTruthy();
      expect(l.spots.length).toBeGreaterThan(0);
      expect(l.species.length).toBeGreaterThan(0);
      for (const s of l.spots) expect(["boat", "beach", undefined]).toContain(s.access);
      for (const sp of l.species) {
        for (const m of sp.activeMonths) expect(m >= 1 && m <= 12).toBe(true);
      }
    }
  });
});

describe("when-to-go doesn't sugar-coat a blown-out morning", () => {
  const sunrise = new Date(2000, 0, 1, 7, 0, 0, 0);

  it("says 'Sit this one out' when a safety cap fired and the wind never drops", () => {
    const win = morning({ windMph: 21, gustMph: 31, windDirDeg: 45, precipProbPct: 0, visibilityMi: 10 });
    const w = computeWhenToGo(win, sunrise, ["small-craft-wind"]);
    expect(w.category).toBe("Sit this one out");
    expect(w.windowStart).toBeNull();
    expect(w.label).not.toMatch(/gets better/);
  });

  it("still says 'Wait it out' when a capped morning genuinely cleans up later", () => {
    const byHour = { 5: 24, 6: 23, 7: 22, 8: 18, 9: 12, 10: 10, 11: 9 };
    const win = [5, 6, 7, 8, 9, 10, 11].map((h) => hour(h, { windMph: byHour[h], gustMph: byHour[h] + 4, windDirDeg: 270, precipProbPct: 0, visibilityMi: 10 }));
    expect(computeWhenToGo(win, sunrise, ["small-craft-wind"]).category).toBe("Wait it out");
  });

  it("only promises 'it only gets better' when something actually eases", () => {
    const steady = morning({ windMph: 12, gustMph: 15, windDirDeg: 270, precipProbPct: 0, visibilityMi: 10 });
    expect(computeWhenToGo(steady, sunrise).label).not.toMatch(/gets better/);
    const byHour = { 5: 12, 6: 12, 7: 11, 8: 10, 9: 8, 10: 7, 11: 6 };
    const easing = [5, 6, 7, 8, 9, 10, 11].map((h) => hour(h, { windMph: byHour[h], gustMph: byHour[h] + 3, windDirDeg: 270, precipProbPct: 0, visibilityMi: 10 }));
    expect(computeWhenToGo(easing, sunrise).label).toMatch(/gets better/);
  });
});

describe("species reasons on rough days", () => {
  it("doesn't call 20+ mph wind 'prime' conditions", () => {
    const sp = [{ id: "false-albacore", name: "False albacore", activeMonths: [10], sstMinF: 62, sstMaxF: 80, notes: "" }];
    const [pick] = recommendSpecies(sp, { month: 10, sstF: 72, finalScore: 25, avgWindMph: 22 });
    expect(pick.reason).not.toMatch(/prime/);
    expect(pick.reason).toMatch(/tough day/);
  });
});
