import { describe, it, expect } from "vitest";
import { shouldShowWhatsNew, SHOW_UNTIL } from "./WhatsNew.jsx";

describe("shouldShowWhatsNew", () => {
  it("shows once to someone who hasn't closed it yet", () => {
    expect(shouldShowWhatsNew("2026-10-07", null)).toBe(true);
  });

  it("stays closed once it's been dismissed on this device", () => {
    expect(shouldShowWhatsNew("2026-10-07", "2026-10-07T12:00:00.000Z")).toBe(false);
  });

  it("retires itself on the cutoff date, even for people who never saw it", () => {
    expect(SHOW_UNTIL).toBe("2026-12-01");
    expect(shouldShowWhatsNew("2026-11-30", null)).toBe(true);
    expect(shouldShowWhatsNew("2026-12-01", null)).toBe(false);
  });
});
