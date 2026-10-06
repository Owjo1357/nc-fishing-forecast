# NC Fishing Forecast

Live at **https://nc-fishing-forecast.vercel.app**

A live, single-page fishing-conditions dashboard for North Carolina spots. Right now that's
**Masonboro Inlet** (Wrightsville Beach, trolling) and **Cape Lookout** (Core Banks, surf and boat).
Each location has its own bookmarkable path, e.g. `/cape-lookout`; the bare root opens the last one
you used. Each day gets a 0–100 morning **Fishing Score** (5–11 AM window), a star rating, a plain-English summary, a "when to go" call, target species, and recommended spots — all computed in the browser from live data fetched on page load.

Open it on your phone at 5 AM and you get *today's* actual conditions.

## How it works

- **No API keys, no backend, no database.** The page fetches everything client-side and caches it in `localStorage` for one hour.
- **Data sources**
  - [Open-Meteo Forecast API](https://open-meteo.com/) — requested with `cell_selection=sea` so a coastal location gets an over-water grid cell, not an inland one. Hourly wind, gusts, direction, temp, apparent temp, precip, precip probability, cloud cover, pressure, visibility, weather code; daily high/low, sunrise/sunset. 16-day forecast + 5 past days.
  - [Open-Meteo Marine API](https://open-meteo.com/en/docs/marine-weather-api) — hourly wave height/period/direction, swell and wind wave from NOAA's **GFS-Wave** model (`ncep_gfswave016`, 16 days), plus sea-surface temp from the default model. GFS-Wave was picked because it tracked buoy 41110 far better than the default (0.20 ft vs 0.59 ft average error); see `dataFetch.js`. The score reweights automatically past the wave horizon.
  - [NOAA CO-OPS Tides & Currents](https://api.tidesandcurrents.noaa.gov/api/prod/) — high/low predictions for each location's station (**8658163** Wrightsville Beach, **8656841** Cape Lookout Bight). Fetched directly (it sends `Access-Control-Allow-Origin: *`).
  - Moon phase and (fallback) sunrise/sunset are computed locally — astronomy, not forecast.
  - NDBC stations (**41110** Masonboro, **CLKN7** Cape Lookout) are referenced in config but live readings are not wired up (no CORS; would need a proxy).
- **Scoring engine** (`src/lib/scoring.js`) is pure functions — inputs in, score + breakdown out. Weights, safety caps, and rating bands are fixed and deliberate; don't retune them without a decision. Unit tests: `npm test`.
- **Time** — all day/window logic runs in `America/New_York` via `Intl`, independent of the visitor's device clock. Default day is **today** before local noon, **tomorrow** at/after noon.
- **Refreshing** — a normal page load uses the 1-hour cache; a browser reload (Ctrl+R / pull down on a phone) always fetches fresh data.

## Project layout

```
src/
  config/locations.js   Location schema — add locations here, nothing else changes
  lib/scoring.js         Pure scoring engine (+ scoring.test.js)
  lib/appLogic.js        Raw API JSON + config -> per-day render objects
  lib/dataFetch.js       Fetch + 1-hour localStorage cache + graceful degradation
  components/            React UI
  App.jsx               Orchestration: load, cache, loading/error states, refresh
```

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # scoring engine unit tests
npm run build    # -> dist/
npm run preview  # serve the production build locally
```

## Deploy (Vercel)

The repo is wired for Vercel (`vercel.json`, framework preset `vite`). Pushing to the
default branch triggers a production deploy; pull requests get preview URLs.

```bash
npm i -g vercel
vercel        # first run links the project
vercel --prod
```

## Adding another location

Append an entry to `LOCATIONS` in `src/config/locations.js` with the same shape
(id, name, region, lat/lon, `tideStationId`, `buoyId`, `spots[]`, `species[]`).
Optional fields — `spots[].access` (`"boat"`/`"beach"`), `windAgainstTide`,
`roughWaterAdvice`, `weights` — are documented at the top of that file. The `id`
becomes the URL path. Check that the Open-Meteo Marine API snaps your lat/lon to
a water grid cell, and verify coordinates and station IDs against primary
sources — don't guess.

## Safety

The score reflects **fishing quality, not a go/no-go safety call.** Blown-out days
are marked clearly, but conditions change — always check before you launch.
