import { describe, it, expect } from "vitest";
import { mergeMarine } from "./dataFetch.js";

const waves = {
  latitude: 34.17,
  hourly: { time: ["2026-10-06T05:00", "2026-10-06T06:00", "2026-10-06T07:00"], wave_height: [3, 3.5, 4] },
};
const sst = {
  hourly: { time: ["2026-10-06T06:00", "2026-10-06T07:00", "2026-10-06T08:00"], sea_surface_temperature: [77.4, 77.3, 77.2] },
};

describe("mergeMarine", () => {
  it("lines SST up with the wave hours by timestamp", () => {
    const m = mergeMarine(waves, sst);
    expect(m.hourly.wave_height).toEqual([3, 3.5, 4]);
    expect(m.hourly.sea_surface_temperature).toEqual([null, 77.4, 77.3]);
  });

  it("keeps waves when the SST request failed", () => {
    const m = mergeMarine(waves, null);
    expect(m.hourly.wave_height).toEqual([3, 3.5, 4]);
    expect(m.hourly.sea_surface_temperature).toEqual([null, null, null]);
  });

  it("falls back to SST alone when the wave request failed, and null when both did", () => {
    expect(mergeMarine({ error: true, reason: "x" }, sst)).toBe(sst);
    expect(mergeMarine(null, null)).toBeNull();
  });
});
