import { describe, it, expect } from "vitest";
import { flagFor, FLAG_RED, FLAG_YELLOW } from "./SignalFlag.jsx";

describe("flagFor maps NWS events to the coastal warning flags", () => {
  const f = (event, kind) => {
    const { shape, count, color } = flagFor(event, kind);
    return `${count}x ${shape} ${color === FLAG_RED ? "red" : color === FLAG_YELLOW ? "yellow" : color}`;
  };

  it("uses the marine pennants and storm flags", () => {
    expect(f("Small Craft Advisory", "advisory")).toBe("1x pennant red");
    expect(f("Small Craft Advisory for Hazardous Seas", "advisory")).toBe("1x pennant red");
    expect(f("Gale Warning", "warning")).toBe("2x pennant red");
    expect(f("Storm Warning", "warning")).toBe("1x storm red");
    expect(f("Tropical Storm Warning", "warning")).toBe("1x storm red");
    expect(f("Hurricane Warning", "warning")).toBe("2x storm red");
    expect(f("Hurricane Force Wind Warning", "warning")).toBe("2x storm red");
  });

  it("uses beach hazard flags for everything else", () => {
    expect(f("Beach Hazards Statement", "statement")).toBe("1x beach yellow");
    expect(f("Rip Current Statement", "statement")).toBe("1x beach yellow");
    expect(f("Coastal Flood Advisory", "advisory")).toBe("1x beach yellow");
    expect(f("Hurricane Watch", "watch")).toBe("1x beach yellow");
    expect(f("Special Marine Warning", "warning")).toBe("1x beach red");
  });

  it("doesn't mistake land storms for marine storm warnings", () => {
    expect(f("Winter Storm Warning", "warning")).toBe("1x beach red");
  });
});
