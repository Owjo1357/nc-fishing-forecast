import StarRow from "./StarRow.jsx";
import { IconClock, IconSunrise } from "./Icons.jsx";
import { fmtHM, fmtDateLong, roundOrDash } from "./format.js";

export default function OutlookCard({ day }) {
  const s = day.score;
  const noScore = s.score === null;
  return (
    <div className="card p-5 sm:p-6 mb-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="eyebrow mb-2">{fmtDateLong(day.dateStr)} · MORNING OUTLOOK</div>
          {noScore ? (
            <div className="flex items-center gap-2 mb-2.5">
              <span
                className="text-[0.7rem] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: "#eef1f4", color: "#6b7686" }}
              >
                no score yet
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 flex-wrap mb-2.5">
              <StarRow stars={s.stars} />
              <span className="font-display font-bold text-lg" style={{ color: s.color }}>
                {s.ratingWord}
              </span>
              {day.marineAvailable === false && (
                <span
                  className="text-[0.7rem] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: "#f1f0e6", color: "#8a7a3d" }}
                >
                  limited marine data
                </span>
              )}
              {s.confidenceNote && (
                <span className="text-[0.7rem] font-medium" style={{ color: "var(--label-dim)" }}>
                  {s.confidenceNote}
                </span>
              )}
            </div>
          )}
          <p className="text-[1.05rem] leading-snug pr-2" style={{ color: "var(--ink-soft)" }}>
            {s.summary || "Not enough data to score this morning yet."}
          </p>
        </div>
        <div className="text-right shrink-0">
          <div
            className="font-display font-extrabold tabular leading-none"
            style={{ fontSize: "3.25rem", color: noScore ? "#c3cad2" : s.color }}
          >
            {noScore ? "—" : s.score}
          </div>
          <div className="eyebrow mt-1">fishing score</div>
        </div>
      </div>

      <div
        className="mt-5 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4"
        style={{ borderTop: "1px solid var(--divider)" }}
      >
        <div>
          <div className="flex items-center gap-1.5 eyebrow mb-1.5">
            <IconClock size={13} /> WHEN TO GO
          </div>
          {day.whenToGo ? (
            <div className="text-sm" style={{ color: "var(--ink-soft)" }}>
              <span className="font-semibold" style={{ color: "var(--ink)" }}>
                {day.whenToGo.category}
              </span>
              {" — "}
              {day.whenToGo.label}
              <div className="mt-0.5" style={{ color: "var(--label)" }}>
                {day.whenToGo.reason}
              </div>
              {s.fogWarning && (
                <div className="mt-0.5 font-medium" style={{ color: "#a4552f" }}>
                  Bring radar/GPS caution — dense fog possible.
                </div>
              )}
              {!s.fogWarning && s.score !== null && s.score < 55 && (
                <div className="mt-0.5" style={{ color: "var(--label)" }}>
                  Rain gear's not a bad call this morning.
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm" style={{ color: "var(--label)" }}>
              Data unavailable for this window.
            </div>
          )}
        </div>
        <div className="sm:pl-4" style={{ borderLeft: "1px solid var(--divider)" }}>
          <div className="flex items-center gap-1.5 eyebrow mb-1.5">
            <IconSunrise size={13} /> SUNRISE
          </div>
          <div className="text-sm" style={{ color: "var(--ink-soft)" }}>
            <span className="font-semibold" style={{ color: "var(--ink)" }}>
              {fmtHM(day.sunrise)}
            </span>
            <span style={{ color: "var(--label)" }}>
              {" "}
              rise · {fmtHM(day.sunset)} set
            </span>
          </div>
          <div className="text-xs mt-0.5" style={{ color: "var(--label)" }}>
            High {roundOrDash(day.dailyHigh)}° · Low {roundOrDash(day.dailyLow)}°
            {day.sunTimesComputed && " · sun times computed"}
          </div>
        </div>
      </div>
    </div>
  );
}
