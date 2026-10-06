import { describe, it, expect } from "vitest";
import { nextTideEvent } from "./appLogic.js";

const preds = [
  { t: "2026-10-05 03:02", type: "H", v: "4.0" },
  { t: "2026-10-05 09:32", type: "L", v: "0.7" },
  { t: "2026-10-05 15:35", type: "H", v: "4.8" },
  { t: "2026-10-05 22:25", type: "L", v: "0.7" },
  { t: "2026-10-06 04:10", type: "H", v: "4.3" },
  { t: "2026-10-06 10:32", type: "L", v: "0.6" },
];

describe("nextTideEvent", () => {
  it("returns the next tide later today", () => {
    expect(nextTideEvent(preds, "2026-10-05", "2026-10-05", 10, 0).t).toBe("2026-10-05 15:35");
  });

  it("uses minutes, not just the hour", () => {
    // 9:40 is after the 9:32 low, so the next one is the 15:35 high.
    expect(nextTideEvent(preds, "2026-10-05", "2026-10-05", 9, 40).t).toBe("2026-10-05 15:35");
  });

  it("rolls over to tomorrow after tonight's last tide instead of showing one that already happened", () => {
    expect(nextTideEvent(preds, "2026-10-05", "2026-10-05", 23, 0).t).toBe("2026-10-06 04:10");
  });

  it("for other days, shows that day's first tide", () => {
    expect(nextTideEvent(preds, "2026-10-06", "2026-10-05", 23, 0).t).toBe("2026-10-06 04:10");
  });

  it("handles missing data", () => {
    expect(nextTideEvent(null, "2026-10-05", "2026-10-05", 8, 0)).toBeNull();
  });
});
