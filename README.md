# Masonboro Inlet Fishing Dashboard

A live, single-page fishing-conditions dashboard for trolling out of **Masonboro Inlet, Wrightsville Beach, NC**. Each day gets a 0–100 morning **Fishing Score** (5–11 AM window), a star rating, a plain-English summary, a "when to go" call, target species, and recommended spots — all computed in the browser from live data fetched on page load.

Open it on your phone at 5 AM and you get *today's* actual conditions.

## How it works

- **No API keys, no backend, no database.** The page fetches everything client-side and caches it in `localStorage` for one hour.
- **Data sources**
  - [Open-Meteo Forecast API](https://open-meteo.com/) — hourly wind, gusts, direction, temp, apparent temp, precip, precip probability, cloud cover, pressure, visibility, weather code; daily high/low, sunrise/sunset. 16-day forecast + 2 past days.
  - [Open-Meteo Marine API](https://open-meteo.com/en/docs/marine-weather-api) — hourly wave height/period/direction, swell, wind wave, sea-surface temp. ~10-day horizon; the score reweights automatically past that.
  - [NOAA CO-OPS Tides & Currents](https://api.tidesandcurrents.noaa.gov/api/prod/) — high/low predictions for station **8658163 (Wrightsville Beach)**. Fetched directly (it sends `Access-Control-Allow-Origin: *`).
  - Moon phase and (fallback) sunrise/sunset are computed locally — astronomy, not forecast.
  - NDBC/CORMP buoy **41110** is referenced in config but live readings are not wired up (no CORS; would need a proxy).
- **Scoring engine** (`src/lib/scoring.js`) is pure functions — inputs in, score + breakdown out. Weights, safety caps, and rating bands are fixed and deliberate; don't retune them without a decision. Unit tests: `npm test`.
- **Time** — all day/window logic runs in `America/New_York` via `Intl`, independent of the visitor's device clock. Default day is **today** before local noon, **tomorrow** at/after noon.

## Project layout

```
src/
  config/locations.js   Location schema — add NC locations here, nothing else changes
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
(id, name, region, lat/lon, `tideStationId`, `buoyId`, `spots[]`, `species[]`,
optional `weights` overrides). The header location picker un-hides itself once
there's more than one. Verify coordinates and station IDs against primary
sources — don't guess.

## Safety

The score reflects **fishing quality, not a go/no-go safety call.** Blown-out days
are marked clearly, but conditions change — always check before you launch.
