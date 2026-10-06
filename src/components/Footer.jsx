export default function Footer({ location, fetchedAt, weatherConnected, marineConnected, tidesConnected, alertsConnected }) {
  const sources = [
    `Open-Meteo forecast${weatherConnected ? "" : " (not connected)"}`,
    `Open-Meteo marine${marineConnected ? "" : " (not connected)"}`,
    `NOAA CO-OPS tides, station ${location.tideStationId}${tidesConnected ? "" : " (not connected)"}`,
  ];
  if (location.nwsZones && location.nwsZones.length) {
    sources.push(`NWS alerts, zones ${location.nwsZones.join(", ")}${alertsConnected ? "" : " (not connected)"}`);
  }
  return (
    <footer className="text-center text-xs pt-2 pb-8" style={{ color: "var(--label-dim)" }}>
      <p>Data: {sources.join(" · ")}</p>
      <p className="mt-1">
        {location.name} · {location.lat.toFixed(4)}°N, {Math.abs(location.lon).toFixed(4)}°W
      </p>
      {fetchedAt && (
        <p className="mt-1">
          Forecast data as of{" "}
          {new Date(fetchedAt).toLocaleString("en-US", {
            timeZone: "America/New_York",
            dateStyle: "medium",
            timeStyle: "short",
          })}{" "}
          ET
        </p>
      )}
      <p className="mt-2 font-semibold" style={{ color: "var(--ink-soft)" }}>
        Conditions change — always check before you launch.
      </p>
      <p className="mt-2">
        Feature ideas or spot corrections?{" "}
        <a href="mailto:owencedmondson@gmail.com" style={{ color: "var(--accent)" }}>
          owencedmondson@gmail.com
        </a>
      </p>
    </footer>
  );
}
