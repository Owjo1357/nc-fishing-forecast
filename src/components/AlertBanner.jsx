import { alertSections, alertSummary, alertTiming } from "../lib/alerts.js";
import SignalFlag, { FLAG_BLACK } from "./SignalFlag.jsx";

// Background tints per alert kind. The flag carries the signal; the
// tint just separates the banner from the score card below it.
const TINTS = {
  warning: { bg: "#fbedeb", text: "#a3342b" },
  advisory: { bg: "#fcf4e6", text: "#8a5d0c" },
  watch: { bg: "#fcf4e6", text: "#8a5d0c" },
  statement: { bg: "#f1f5f9", text: "#46566a" },
};

// The full NWS notice minus the WHAT line (already shown as the summary).
function FullNotice({ alert, tint, moreInfoUrl }) {
  const rest = alertSections(alert.description).filter((x) => x.label !== "WHAT");
  return (
    <div className="flex flex-col gap-1.5" style={{ color: "var(--ink-soft)", maxWidth: "62ch" }}>
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
  );
}

// The most serious alert: flag on its own staff, summary always shown.
function LeadAlert({ alert, dateStr, nowMs, moreInfoUrl }) {
  const tint = TINTS[alert.kind] || TINTS.statement;
  const summary = alertSummary(alert);
  return (
    <div className="flex gap-3 rounded-xl pl-3 pr-4 pt-3 pb-3.5" style={{ background: tint.bg }}>
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
        {summary && (
          <p className="text-sm mt-1 leading-snug" style={{ color: "var(--ink-soft)", maxWidth: "62ch" }}>
            {summary}
          </p>
        )}
        <details className="alert-details mt-2 text-sm">
          <summary className="cursor-pointer font-semibold" style={{ color: tint.text }}>
            Read the full Weather Service notice
          </summary>
          <div className="mt-2">
            <FullNotice alert={alert} tint={tint} moreInfoUrl={moreInfoUrl} />
          </div>
        </details>
      </div>
    </div>
  );
}

// Anything else in effect that day: one slim line (flag, name, time)
// that opens to the summary and full notice, so three alerts don't
// stack into three tall boxes.
function CompactAlert({ alert, dateStr, nowMs, moreInfoUrl }) {
  const tint = TINTS[alert.kind] || TINTS.statement;
  const summary = alertSummary(alert);
  return (
    <details className="alert-compact rounded-xl" style={{ background: tint.bg }}>
      <summary className="flex items-center gap-3 cursor-pointer pl-3 pr-4 py-2.5">
        <span className="flex justify-start shrink-0" style={{ width: 26 }}>
          <SignalFlag event={alert.event} kind={alert.kind} size={14} pole={false} />
        </span>
        <span className="flex-1 min-w-0 font-semibold text-sm truncate" style={{ color: "var(--ink)" }}>
          {alert.event}
        </span>
        <span className="text-xs font-semibold tabular shrink-0" style={{ color: tint.text }}>
          {alertTiming(alert, dateStr, nowMs)}
        </span>
      </summary>
      <div className="text-sm pb-3.5 pr-4" style={{ paddingLeft: 50 }}>
        {summary && (
          <p className="leading-snug mb-2" style={{ color: "var(--ink-soft)", maxWidth: "62ch" }}>
            {summary}
          </p>
        )}
        <FullNotice alert={alert} tint={tint} moreInfoUrl={moreInfoUrl} />
      </div>
    </details>
  );
}

// Active NWS watches/warnings/advisories for the selected day, shown
// above the score. They don't change the score. Alerts arrive sorted
// most serious first.
export default function AlertBanner({ alerts, dateStr, location }) {
  if (!alerts || alerts.length === 0) return null;
  const nowMs = Date.now();
  const moreInfoUrl = `https://forecast.weather.gov/MapClick.php?lat=${location.lat}&lon=${location.lon}`;
  const [lead, ...others] = alerts;
  const props = { dateStr, nowMs, moreInfoUrl };
  return (
    <section aria-label="National Weather Service alerts" className="flex flex-col gap-1.5 mb-4">
      <LeadAlert alert={lead} {...props} />
      {others.map((a) => (
        <CompactAlert key={a.id || a.event} alert={a} {...props} />
      ))}
    </section>
  );
}
