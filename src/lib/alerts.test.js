import { describe, it, expect } from "vitest";
import { alertKind, alertsUrl, normalizeAlerts, alertsForDay, alertTiming, alertSections } from "./alerts.js";

// Shapes copied from real api.weather.gov alerts for AMZ250/NCZ108 on
// 2026-10-06.
const feature = (over) => ({
  properties: {
    id: "urn:oid:test",
    status: "Actual",
    messageType: "Alert",
    senderName: "NWS Wilmington NC",
    description:
      "* WHAT...Northeast winds 15 to 20 kt with gusts up to 30 kt and seas 4 to 6 ft.\n\n* WHERE...Coastal waters out 20 NM.\n\n* WHEN...Until 3 AM EDT Wednesday.\n\n* IMPACTS...Conditions will be hazardous to small craft.",
    instruction: "Inexperienced mariners, especially those operating smaller\nvessels, should avoid navigating in hazardous conditions.",
    ...over,
  },
});

const sca = feature({ id: "a", event: "Small Craft Advisory", onset: "2026-10-06T14:32:00-04:00", ends: "2026-10-07T03:00:00-04:00", expires: "2026-10-07T03:00:00-04:00" });
const beach = feature({ id: "b", event: "Beach Hazards Statement", onset: "2026-10-06T12:23:00-04:00", ends: "2026-10-06T20:00:00-04:00" });
const gale = feature({ id: "c", event: "Gale Warning", onset: "2026-10-08T02:00:00-04:00", ends: "2026-10-09T08:00:00-04:00" });

// 2026-10-06 3:00 PM EDT
const NOW = Date.parse("2026-10-06T15:00:00-04:00");

describe("alertKind", () => {
  it("sorts NWS products into warning / advisory / watch / statement", () => {
    expect(alertKind("Gale Warning")).toBe("warning");
    expect(alertKind("Small Craft Advisory")).toBe("advisory");
    expect(alertKind("Tropical Storm Watch")).toBe("watch");
    expect(alertKind("Beach Hazards Statement")).toBe("statement");
    expect(alertKind("Rip Current Statement")).toBe("statement");
  });
});

describe("alertsUrl", () => {
  it("asks for every configured zone in one request", () => {
    expect(alertsUrl(["AMZ250", "NCZ108"])).toBe("https://api.weather.gov/alerts/active?zone=AMZ250,NCZ108");
  });
});

describe("normalizeAlerts", () => {
  it("returns null for a bad response so the UI can say it couldn't check", () => {
    expect(normalizeAlerts(null)).toBeNull();
    expect(normalizeAlerts({ title: "error" })).toBeNull();
  });

  it("drops test messages and cancellations", () => {
    const out = normalizeAlerts({
      features: [sca, feature({ event: "Test Message", status: "Test" }), feature({ event: "Gale Warning", messageType: "Cancel" })],
    });
    expect(out.map((a) => a.event)).toEqual(["Small Craft Advisory"]);
  });

  it("merges repeats of the same event into one span", () => {
    const later = feature({ id: "a2", event: "Small Craft Advisory", onset: "2026-10-06T10:00:00-04:00", ends: "2026-10-07T08:00:00-04:00" });
    const [a] = normalizeAlerts({ features: [sca, later] });
    expect(a.start).toBe("2026-10-06T10:00:00-04:00");
    expect(a.end).toBe("2026-10-07T08:00:00-04:00");
  });

  it("puts warnings first, then advisories, then statements", () => {
    const out = normalizeAlerts({ features: [beach, sca, gale] });
    expect(out.map((a) => a.kind)).toEqual(["warning", "advisory", "statement"]);
  });

  it("falls back to 'expires' when an alert has no 'ends'", () => {
    const [a] = normalizeAlerts({ features: [feature({ event: "Marine Weather Statement", onset: "2026-10-06T12:00:00-04:00", ends: null, expires: "2026-10-06T18:00:00-04:00" })] });
    expect(a.end).toBe("2026-10-06T18:00:00-04:00");
  });
});

describe("alertsForDay", () => {
  const alerts = normalizeAlerts({ features: [sca, beach, gale] });
  const events = (d) => alertsForDay(alerts, d, "2026-10-06", NOW).map((a) => a.event).sort();

  it("today shows everything in effect today", () => {
    expect(events("2026-10-06")).toEqual(["Beach Hazards Statement", "Small Craft Advisory"]);
  });

  it("an advisory running past midnight also shows on tomorrow", () => {
    expect(events("2026-10-07")).toEqual(["Small Craft Advisory"]);
  });

  it("a future warning shows on each day it covers, and not before", () => {
    expect(events("2026-10-08")).toEqual(["Gale Warning"]);
    expect(events("2026-10-09")).toEqual(["Gale Warning"]);
    expect(events("2026-10-10")).toEqual([]);
  });

  it("past days never show active alerts", () => {
    expect(events("2026-10-05")).toEqual([]);
  });

  it("drops alerts that have already ended (e.g. from an hour-old cache)", () => {
    const at9pm = Date.parse("2026-10-06T21:00:00-04:00");
    expect(alertsForDay(alerts, "2026-10-06", "2026-10-06", at9pm).map((a) => a.event)).toEqual(["Small Craft Advisory"]);
  });

  it("an alert ending exactly at midnight doesn't spill into the next day", () => {
    const [a] = normalizeAlerts({ features: [feature({ event: "Small Craft Advisory", onset: "2026-10-06T08:00:00-04:00", ends: "2026-10-07T00:00:00-04:00" })] });
    expect(alertsForDay([a], "2026-10-07", "2026-10-06", NOW)).toEqual([]);
  });
});

describe("alertTiming", () => {
  const [g, s, b] = normalizeAlerts({ features: [gale, sca, beach] });

  it("drops the weekday for times on the day being viewed", () => {
    expect(alertTiming(b, "2026-10-06", NOW)).toBe("until 8 PM");
  });

  it("adds the weekday when the end falls on another day", () => {
    expect(alertTiming(s, "2026-10-06", NOW)).toBe("until 3 AM Wed");
  });

  it("shows a start time for alerts that haven't begun yet", () => {
    expect(alertTiming(g, "2026-10-08", NOW)).toBe("from 2 AM until 8 AM Fri");
  });
});

describe("alertSections", () => {
  it("splits the NWS * WHAT... * WHERE... layout into labelled parts", () => {
    const parts = alertSections(sca.properties.description);
    expect(parts.map((p) => p.label)).toEqual(["WHAT", "WHERE", "WHEN", "IMPACTS"]);
    expect(parts[0].text).toBe("Northeast winds 15 to 20 kt with gusts up to 30 kt and seas 4 to 6 ft.");
  });

  it("falls back to the plain text when there are no sections", () => {
    expect(alertSections("Dense fog this morning.")).toEqual([{ label: null, text: "Dense fog this morning." }]);
    expect(alertSections("")).toEqual([]);
  });
});
