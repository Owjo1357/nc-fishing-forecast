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
 *
 * Optional per-location fields:
 *   spots[].access     "boat" (default) or "beach". When a location has
 *                      both, the UI recommends the best of each.
 *   windAgainstTide    Override the inlet wind-against-tide ranges in
 *                      scoring.js; null switches the penalty off.
 *   roughWaterAdvice   What to say about the inshore fallback species
 *                      when it's too rough outside.
 *   weights            Overrides merged onto DEFAULT_WEIGHTS, e.g.
 *                      { windSpeed: 0.32 }.
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

  {
    id: "cape-lookout",
    name: "Cape Lookout",
    region: "Core Banks, NC",
    // Just off the tip of the Point, on the ocean side, so the marine
    // models pick open-ocean grid cells south of the cape rather than the
    // sheltered Bight to the north -- checked against the API on
    // 2026-10-06 (GFS-Wave snaps to 34.50, -76.50).
    lat: 34.58,
    lon: -76.538,
    verified: true,

    // NOAA CO-OPS reference (harmonic) tide station inside the Bight.
    // Verified via the CO-OPS metadata API: station 8656841, "Cape
    // Lookout, Lookout Bight", lat 34.6133 / lng -76.5383.
    tideStationId: "8656841",
    tideStationName: "Cape Lookout, Lookout Bight",

    // NDBC C-MAN station CLKN7 on the cape (wind/met, no waves), 0.7 nm
    // from the tide station per the NDBC active-stations list
    // (2026-10-06). Not wired up yet -- same as Masonboro's buoy.
    buoyId: "CLKN7",
    buoyName: "Cape Lookout, NC (C-MAN)",

    // The wind-against-tide penalty in scoring.js is modeled on a
    // single inlet's flood/ebb axis (Masonboro). There's no single inlet
    // run here -- you're fishing the beach, the Bight, or crossing
    // Barden or Beaufort Inlet -- so it's switched off rather than
    // guessed at.
    windAgainstTide: null,

    // What to tell people when it's too rough outside.
    roughWaterAdvice: "Too rough on the ocean side — fish the Bight or the sound side behind the banks.",

    // Spots come in two kinds. "beach" spots are reached by truck on
    // South Core Banks (vehicle ferry from Davis); "boat" spots are runs
    // from the Bight. distanceNm is the straight line from the Bight
    // anchorage (34.6133, -76.5383). For beach spots it only ranks them
    // against each other.
    spots: [
      {
        id: "the-point",
        name: "The Point",
        access: "beach",
        lat: 34.583,
        lon: -76.538,
        distanceNm: 2,
        depthFt: null,
        verified: false,
        note: "Representative point at the tip of the cape. The sandbar shifts every season -- drive and wade it with care.",
        suits: {
          maxWaveFt: 4,
          preferredWindFrom: null, // there's usually a lee side of the Point
          tideMovingBonus: true,
          description:
            "The tip of the cape, where the ocean and the Bight meet. Moving water over the bar pulls in drum, blues and Spanish.",
        },
      },
      {
        id: "lookout-bight",
        name: "Lookout Bight (inside the hook)",
        access: "beach",
        lat: 34.61,
        lon: -76.54,
        distanceNm: 0,
        depthFt: null,
        verified: false,
        note: "Representative point along the inside shoreline of the hook -- a stretch, not a single pin.",
        suits: {
          maxWaveFt: 99, // sheltered -- the fallback when the ocean side is blown out
          preferredWindFrom: ["N", "NE", "E"],
          description:
            "Sheltered water inside the hook. The calm option when a north or east wind has the ocean side chopped up.",
        },
      },
      {
        id: "core-banks-surf",
        name: "South Core Banks ocean beach",
        access: "beach",
        lat: 34.64,
        lon: -76.49,
        distanceNm: 4,
        depthFt: null,
        verified: false,
        note: "Representative point on the ocean beach north of the lighthouse. The whole ocean side is fishable -- look for sloughs and cuts in the bar.",
        suits: {
          maxWaveFt: 3.5,
          preferredWindFrom: ["W", "NW"],
          avoidWindFrom: ["NE", "E"],
          description:
            "The open surf on the ocean side. Best when a west or northwest wind lays the breakers down.",
        },
      },
      {
        id: "lookout-shoals",
        name: "Cape Lookout Shoals (inner edge)",
        access: "boat",
        lat: null,
        lon: null,
        distanceNm: 3,
        depthFt: null,
        verified: false,
        note: "Breaking shoals that run miles to the southeast -- no single published spot. Fish the edges, never inside the breakers, and use a current chart.",
        suits: {
          maxWaveFt: 2,
          minPeriodSec: 7,
          tideMovingBonus: true,
          description:
            "Fish feed along the edges of the shoals when the tide is moving. Spanish, kings and albies in season. Only go on flat days.",
        },
      },
      {
        id: "ar-285",
        name: "AR-285 (George Summerlin Reef)",
        access: "boat",
        lat: 34.5575,
        lon: -76.4378,
        distanceNm: 6,
        depthFt: 65,
        verified: true,
        note: "NC DMF Reef Guide (2016): 341° magnetic, 3.9 nm from Cape Lookout Shoals Lighted Buoy 2. Concrete pipe, reef balls and the 130-ft Nancy Lee. Distance is a straight line from the Bight; the actual run goes around the Point.",
        suits: {
          maxWaveFt: 3,
          minPeriodSec: 6,
          description:
            "The closest reef, on the Raleigh Bay side of the cape. Pipe, reef balls and a sunken vessel in 65 ft.",
        },
      },
      {
        id: "ar-315",
        name: "AR-315 (Atlantic Beach Reef)",
        access: "boat",
        lat: 34.67,
        lon: -76.7467,
        distanceNm: 10.8,
        depthFt: 49,
        verified: true,
        note: "NC DMF Reef Guide (2016): 239° magnetic, 3.6 nm from Beaufort Inlet at the Fort Macon jetty. Liberty ship Theodore Parker, tug Takos and lots of concrete.",
        suits: {
          maxWaveFt: 3,
          minPeriodSec: 6,
          description:
            "Off Atlantic Beach, west of Beaufort Inlet. A big, well-known reef in 49 ft, and close to the ramps if you're launching from Morehead City instead.",
        },
      },
    ],

    // Shared species reuse Masonboro's water-temperature ranges so the
    // two pages agree with each other. Seasons for false albacore and big
    // red drum come from Cape Lookout fishing reports (Carolina
    // Sportsman, Salt Water Sportsman); they are general fishing
    // knowledge, not survey data.
    species: [
      {
        id: "false-albacore",
        name: "False albacore / little tunny",
        activeMonths: [9, 10, 11, 12],
        sstMinF: 62,
        sstMaxF: 80,
        notes:
          "Cape Lookout's famous fall run -- albies show in early September and get thicker into November. Watch for birds over bait balls off the Point.",
      },
      {
        id: "red-drum",
        name: "Red drum (big reds)",
        activeMonths: [4, 5, 6, 7, 8, 9, 10, 11, 12],
        sstMinF: 60,
        sstMaxF: 84,
        notes:
          "Big reds feed off the Point and along the shoals, peaking in the fall. Cut bait or fresh menhaden off the beach, or sight-cast from a boat.",
      },
      {
        id: "spanish-mackerel",
        name: "Spanish mackerel",
        activeMonths: [4, 5, 6, 7, 8, 9, 10],
        sstMinF: 68,
        sstMaxF: 86,
        notes: "Casting metal off the Point at first light, or trolling the shoal edges from a boat.",
      },
      {
        id: "bluefish",
        name: "Bluefish",
        activeMonths: [3, 4, 5, 9, 10, 11],
        sstMinF: 55,
        sstMaxF: 82,
        notes: "Spring and fall in the surf and around the Point. Bring wire leaders.",
      },
      {
        id: "pompano",
        name: "Florida pompano",
        activeMonths: [5, 6, 7, 8, 9, 10],
        sstMinF: 70,
        sstMaxF: 86,
        notes: "Sand fleas or Fishbites in the first trough on the ocean beach. Calm, clear surf fishes best.",
      },
      {
        id: "king-mackerel",
        name: "King mackerel",
        activeMonths: [5, 6, 7, 8, 9, 10, 11],
        sstMinF: 70,
        sstMaxF: 88,
        notes: "Boat only -- slow-troll live bait around the reefs and shoal edges.",
      },
      {
        id: "cobia",
        name: "Cobia",
        activeMonths: [5, 6],
        sstMinF: 68,
        sstMaxF: 82,
        notes: "Sight-casting around Beaufort Inlet and the Cape in late spring.",
      },
      {
        id: "trout-flounder",
        name: "Speckled trout & flounder",
        activeMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        sstMinF: null,
        sstMaxF: null,
        inshoreFallback: true,
        notes: "Sound side and inside the Bight when the ocean is unfishable.",
      },
    ],

    weights: null,
  },
];

// Look up a location by the id used in the URL path (/cape-lookout).
export function findLocation(id) {
  return LOCATIONS.find((l) => l.id === id) || null;
}
