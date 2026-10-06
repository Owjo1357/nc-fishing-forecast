import { alertSections, alertTiming } from "../lib/alerts.js";
import SignalFlag, { FLAG_BLACK } from "./SignalFlag.jsx";

// Background tints per alert kind. The flag carries the signal; the
// tint just separates the banner from the score card below it.
const TINTS = {
  warning: { bg: "#fbedeb", text: "#a3342b" },
  advisory: { bg: "#fcf4e6", text: "#8a5d0c" },
  watch: { bg: "#fcf4e6", text: "#8a5d0c" },
  statement: { bg: "#f1f5f9", text: "#46566a" },
};

function AlertItem({ alert, dateStr, nowMs, moreInfoUrl }) {
  const tint = TINTS[alert.kind] || TINTS.statement;
  const sections = alertSections(alert.description);
  const what = sections.find((x) => x.label === "WHAT") || sections[0];
  const rest = sections.filter((x) => x !== what);

  return (
    <div className="alert-item flex gap-3 rounded-xl pl-3 pr-4 pt-3 pb-3.5" style={{ background: tint.bg }}>
      {/* The flag's staff continues down the full height of the alert. */}
      <div className="flex flex-col items-start shrink-0" style={{ width: 26 }}>
        <SignalFlag event={alert.event} kind={alert.kind} />
        <div className="flex-1" style={{ width: 1.5, marginLeft: 2.5, background: FLAG_BLACK, borderRadius: 1 }} />
      </div>

      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex items-baseline justify-between gap-x-3 gap-y-0.5 flex-wrap">
          <h2 className="font-display font-bold text-base leading-tight" style={{ color: "var(--ink)" }}>
            {alert.event}
          </h2>
          <span className="text-sm font-semibold tabular" style={{ color: tint.text }}>
            {alertTiming(alert, dateStr, nowMs)}
          </span>
        </div>
        {what && (
          <p className="text-sm mt-1 leading-snug" style={{ color: "var(--ink-soft)", maxWidth: "62ch" }}>
            {what.text}
          </p>
        )}
        {(rest.length > 0 || alert.instruction) && (
          <details className="alert-details mt-2 text-sm">
            <summary className="cursor-pointer font-semibold" style={{ color: tint.text }}>
              Read the full Weather Service notice
            </summary>
            <div className="mt-2 flex flex-col gap-1.5" style={{ color: "var(--ink-soft)", maxWidth: "62ch" }}>
              {rest.map((x, i) => (
                <p key={i} className="leading-snug">
                  {x.label && (
                    <span className="font-semibold" style={{ color: "var(--ink)" }}>
                      {x.label[0] + x.label.slice(1).toLowerCase()}:{" "}
                    </span>
                  )}
                  {x.text}
                </p>
              ))}
              {alert.instruction && <p className="leading-snug">{alert.instruction.replace(/\s+/g, " ")}</p>}
              <p className="text-xs mt-0.5" style={{ color: "var(--label)" }}>
                Issued by {alert.sender}. More on{" "}
                <a href={moreInfoUrl} target="_blank" rel="noopener noreferrer" style={{ color: tint.text }}>
                  weather.gov
                </a>
                .
              </p>
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

// Active NWS watches/warnings/advisories for the selected day, shown
// above the score. They don't change the score.
export default function AlertBanner({ alerts, dateStr, location }) {
  if (!alerts || alerts.length === 0) return null;
  const nowMs = Date.now();
  const moreInfoUrl = `https://forecast.weather.gov/MapClick.php?lat=${location.lat}&lon=${location.lon}`;
  return (
    <section aria-label="National Weather Service alerts" className="flex flex-col gap-2 mb-4">
      {alerts.map((a) => (
        <AlertItem key={a.id || a.event} alert={a} dateStr={dateStr} nowMs={nowMs} moreInfoUrl={moreInfoUrl} />
      ))}
    </section>
  );
}
