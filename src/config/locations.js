/**
 * LOCATIONS CONFIG
 * ------------------------------------------------------------------
 * Every location the app knows about lives in this one array. To add
 * a new North Carolina location later (Carolina Beach, Southport,
 * Topsail, Morehead City, Hatteras, Oregon Inlet, ...), append a new
 * entry with this same shape -- no other file needs to change.
 *
 * Coordinates, station IDs and reef/spot positions below were checked
 * against NOAA CO-OPS station metadata, the NDBC station directory,
 * and the NC DMF Artificial Reef Guide (files.nc.gov) on 2026-08-27.
 * Anything that could not be independently verified is flagged with
 * `verified: false` and a `note` explaining the caveat -- the UI
 * surfaces that instead of pretending the number is exact.
 */

export const LOCATIONS = [
  {
    id: "masonboro-inlet",
    name: "Masonboro Inlet",
    region: "Wrightsville Beach, NC",
    // Inlet mouth / sea buoy area. Cross-checked against the NWS
    // gridpoint for "Masonboro Sea Buoy MR" (34.18415, -77.81054) and
    // the user-supplied approximate position (34.18, -77.82) -- both
    // land in the same spot, so this is the sea-buoy-anchored figure.
    lat: 34.1842,
    lon: -77.8105,
    verified: true,

    // NOAA CO-OPS Tides & Currents station. Verified via the CO-OPS
    // metadata API: station 8658163, name "Wrightsville Beach", NC,
    // lat 34.213306 / lng -77.7867 (Banks Channel, closest published
    // tide-prediction station to the inlet).
    tideStationId: "8658163",
    tideStationName: "Wrightsville Beach, NC",

    // NDBC / CORMP nearshore wave buoy at the inlet itself. Confirmed
    // reporting current-day observations as of 2026-08-27 via the
    // NDBC station page (owned/maintained by CORMP, data via Scripps).
    buoyId: "41110",
    buoyName: "Masonboro Inlet, NC (CORMP)",

    spots: [
      {
        id: "inlet-jetties",
        name: "Masonboro Inlet jetties & inlet mouth",
        lat: 34.187,
        lon: -77.813,
        distanceNm: 0,
        depthFt: 20,
        verified: false,
        note: "Representative point at the jetty tips/inlet mouth, not a single fixed spot.",
        suits: {
          maxWaveFt: 99, // always an option -- it's the safe fallback
          preferredWindFrom: null, // fine in most wind, it's protected
          tideMovingBonus: true,
          description:
            "The close, safe option when wind or seas make running out a bad idea, or when a strong tide is ripping through the inlet.",
        },
      },
      {
        id: "nearshore-north",
        name: "Nearshore troll — Wrightsville Beach side",
        lat: 34.205,
        lon: -77.796,
        distanceNm: 1.5,
        depthFt: 25,
        verified: false,
        note: "Representative point along the beachfront troll run from the inlet north toward Johnnie Mercer's Pier and Shell Island -- this is a stretch, not a single pin.",
        suits: {
          maxWaveFt: 3,
          preferredWindFrom: ["W", "NW", "SW"],
          avoidWindFrom: ["NE"],
          description:
            "Beachfront run north from the inlet toward Johnnie Mercer's Pier and Shell Island. Good for a close Spanish troll on flat mornings.",
        },
      },
      {
        id: "nearshore-south",
        name: "Nearshore troll — south toward Masonboro Island",
        lat: 34.1,
        lon: -77.825,
        distanceNm: 3,
        depthFt: 22,
        verified: false,
        note: "Representative point along the beachfront troll run south toward Masonboro Island and Carolina Beach Inlet -- a stretch, not a single pin.",
        suits: {
          maxWaveFt: 3,
          preferredWindFrom: ["NE", "E", "ENE"],
          description:
            "Southern beachfront run toward Masonboro Island and Carolina Beach Inlet. The lee choice on a NE wind when the north side is chopped up.",
        },
      },
      {
        id: "ar-370",
        name: "AR-370 (Meares Harris Reef)",
        lat: 34.1755,
        lon: -77.7567,
        distanceNm: 2.3,
        depthFt: 52,
        verified: true,
        note: "NC DMF Reef Guide: 078° magnetic, 2.3 nm from the Masonboro Inlet sea buoy. Multi-patch reef; coordinate is the approximate center.",
        suits: {
          maxWaveFt: 3.5,
          minPeriodSec: 6,
          description:
            "The close reef -- king and Spanish structure over concrete pipe, barge and tug wreckage.",
        },
      },
      {
        id: "ar-372",
        name: "AR-372 (5 Mile Boxcars)",
        lat: 34.1048,
        lon: -77.7481,
        distanceNm: 4.8,
        depthFt: 48,
        verified: true,
        note: "NC DMF Reef Guide: 140° magnetic, 4.8 nm from the Masonboro Inlet sea buoy. Same site commonly called “5 Mile Boxcars” for the train boxcars deployed there -- one reef, not two.",
        suits: {
          maxWaveFt: 3,
          minPeriodSec: 6,
          description:
            "Off Wrightsville Beach. An easy run on a calm day to reef balls, boxcars and barge wreckage.",
        },
      },
      {
        id: "ar-376",
        name: "AR-376 (rail cars & pipe)",
        lat: 34.0557,
        lon: -77.6621,
        distanceNm: 9.9,
        depthFt: 60,
        verified: true,
        note: "NC DMF Reef Guide: 126° magnetic, 9.9 nm from the Masonboro Inlet sea buoy (also 9.7 nm from the Carolina Beach Inlet sea buoy -- it sits between the two).",
        suits: {
          maxWaveFt: 2.5,
          minPeriodSec: 7,
          description:
            "The southern option off Carolina Beach -- boxcars and concrete pipe in 60 ft. Only worth the run in settled seas.",
        },
      },
      {
        id: "10-mile-rock",
        name: "10 Mile Rock",
        lat: null,
        lon: null,
        distanceNm: 10,
        depthFt: null,
        verified: false,
        note: "Natural ledge, not an official NC DMF reef site -- no publicly verifiable coordinates found. Distance is the commonly used name only; confirm exact numbers locally before running.",
        suits: {
          maxWaveFt: 2,
          minPeriodSec: 8,
          description:
            "A longer run to natural bottom. Only worth it in settled seas with a long groundswell period.",
        },
      },
      {
        id: "23-mile-rock",
        name: "23 Mile Rock",
        lat: null,
        lon: null,
        distanceNm: 23,
        depthFt: null,
        verified: false,
        note: "Natural ledge, not an official NC DMF reef site -- no publicly verifiable coordinates found. Distance is the commonly used name only; confirm exact numbers locally before running.",
        suits: {
          maxWaveFt: 2,
          minPeriodSec: 8,
          description:
            "The long run. Explicitly not a marginal-day spot -- flat seas and a long period only.",
        },
      },
    ],

    species: [
      {
        id: "spanish-mackerel",
        name: "Spanish mackerel",
        activeMonths: [4, 5, 6, 7, 8, 9, 10],
        sstMinF: 68,
        sstMaxF: 86,
        notes:
          "The bread-and-butter nearshore troll. Best on calm mornings with clean water; falls off hard in dirty, churned-up water after an onshore blow.",
      },
      {
        id: "king-mackerel",
        name: "King mackerel",
        activeMonths: [5, 6, 7, 8, 9, 10, 11],
        sstMinF: 70,
        sstMaxF: 88,
        notes:
          "Slow-trolling live bait or planers on the nearshore reefs and ledges.",
      },
      {
        id: "false-albacore",
        name: "False albacore / little tunny",
        activeMonths: [4, 5, 10, 11, 12],
        sstMinF: 62,
        sstMaxF: 74,
        notes:
          "Fall run October-December, plus a spring showing in April-May. Loves cooler, clean water and bait balls near the inlet and jetties.",
      },
      {
        id: "bluefish",
        name: "Bluefish",
        activeMonths: [3, 4, 5, 9, 10, 11],
        sstMinF: 55,
        sstMaxF: 82,
        notes:
          "Spring and fall, wide temperature tolerance. The consolation prize when nothing else is chewing.",
      },
      {
        id: "mahi",
        name: "Mahi",
        activeMonths: [5, 6, 7, 8],
        sstMinF: 75,
        sstMaxF: 90,
        notes:
          "Offshore over structure and weed lines, only when seas are flat enough to make the run.",
      },
      {
        id: "cobia",
        name: "Cobia",
        activeMonths: [5, 6],
        sstMinF: 68,
        sstMaxF: 82,
        notes: "Sight-casting and slow trolling.",
      },
      {
        id: "amberjack",
        name: "Amberjack",
        activeMonths: [6, 7, 8, 9],
        sstMinF: 72,
        sstMaxF: 88,
        notes: "Warm months on the deeper wrecks and reefs.",
      },
      {
        id: "red-drum-trout",
        name: "Red drum & speckled trout",
        activeMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        sstMinF: null,
        sstMaxF: null,
        inshoreFallback: true,
        notes:
          "Inshore fallback when the ocean is unfishable -- “wind is up, fish inside.”",
      },
    ],

    // No per-location weight overrides for the first entry -- it uses
    // the DEFAULT_WEIGHTS from scoring.js as-is. A future location
    // could add e.g. { weights: { windSpeed: 0.32 } } here.
    weights: null,
  },
];
