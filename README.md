# NC Fishing Forecast

Morning fishing forecasts for the North Carolina coast. Every morning gets a score, a time to go, what's biting, and where to fish.

**[ncfishingforecast.com](https://ncfishingforecast.com)**

Open it on your phone before sunrise and you get that morning's actual conditions, not a generic weather report.

## What it shows

- **A 0–100 fishing score** for the 5–11 AM window, with a star rating and a plain-English summary of the morning.
- **When to go.** Whether to get out early before the wind builds, wait out early fog or chop, or take your time.
- **Weather Service advisories.** Small Craft Advisories, gale warnings, rip current statements and other alerts show above the score, drawn with the coastal warning flags marinas fly.
- **Hour-by-hour conditions** for the morning: wind, gusts, waves, rain chance and temperature.
- **Tides, sunrise and water temperature.**
- **Target species** based on the season and the water temperature, with an inshore fallback when it's too rough outside.
- **Recommended spots** that fit the day's wind and seas, from the beach or by boat.
- **About two weeks ahead and five days back**, so you can plan a trip or see how recent mornings scored.

## Locations

| Place | Fishing | Link |
|---|---|---|
| Masonboro Inlet, Wrightsville Beach | Nearshore trolling and the inlet reefs | [/masonboro-inlet](https://ncfishingforecast.com/masonboro-inlet) |
| Cape Lookout, Core Banks | Surf fishing from the beach, plus boat runs to the shoals and reefs | [/cape-lookout](https://ncfishingforecast.com/cape-lookout) |

Each place has its own link, so you can bookmark the one you fish or add it to your home screen.

## Where the data comes from

Everything is live and free to use. There's no account, no API key and no server: the page pulls the data straight from these sources.

- **Wind, weather and sunrise:** [Open-Meteo](https://open-meteo.com/), using over-water grid points so coastal wind isn't softened by land.
- **Waves:** NOAA's GFS-Wave model via [Open-Meteo Marine](https://open-meteo.com/en/docs/marine-weather-api). It was checked against NOAA buoy 41110 off Masonboro Inlet, where it averaged within 0.2 ft of the measured wave height.
- **Water temperature:** Open-Meteo Marine. It matched the same buoy within half a degree.
- **Tides:** [NOAA Tides & Currents](https://tidesandcurrents.noaa.gov/), from the Wrightsville Beach and Cape Lookout Bight stations.
- **Advisories:** [National Weather Service](https://www.weather.gov/) alerts for each place's coastal-waters and beach zones, re-checked every 10 minutes.
- **Reef locations:** the [NC Division of Marine Fisheries Artificial Reef Guide](https://www.deq.nc.gov/about/divisions/marine-fisheries/public-information-and-education/coastal-fishing-information/artificial-reefs). Beach spots and shoals without official coordinates are marked as approximate on the page.

## How the score works

Each morning is scored on what matters most from a small boat, weighted roughly like this:

| Factor | Weight |
|---|---|
| Wind speed and gusts | 28% |
| Wave height | 22% |
| Rain and thunderstorms | 12% |
| Wave period (rolling swell vs. short chop) | 8% |
| Air and water temperature | 8% |
| Wind direction | 7% |
| Cloud cover, pressure trend, tide movement | 5% each |

Safety limits override the math. Sustained wind of 25 mph or more, gusts of 30 mph or more, or seas of 5 ft or more cap the score at 25. A high thunderstorm chance caps it at 30, and dense fog caps it at 40. When some data isn't available yet, such as waves far out in the forecast, the score is built from what is available and the page says so.

Weather Service advisories are shown alongside the score but don't change it.

## Built with

[React](https://react.dev/), [Vite](https://vite.dev/) and [Tailwind CSS](https://tailwindcss.com/), hosted on [Vercel](https://vercel.com/). The scoring is plain JavaScript with unit tests (`src/lib/scoring.js`).

To run it locally:

```bash
npm install
npm run dev    # http://localhost:5173
npm test
```

## Feedback

Have a spot correction or a feature idea? Email **[owencedmondson@gmail.com](mailto:owencedmondson@gmail.com)**.

## A note on safety

The score rates **fishing conditions, not whether it's safe to go out.** Conditions on the water change fast, so always check the marine forecast and use your own judgment before you launch.
