import { fmtHourLabel, isInRecommendedWindow } from "./format.js";

function Cell({ val, digits, unit }) {
  const has = val !== null && val !== undefined && !Number.isNaN(val);
  return (
    <td className="text-right py-2 px-2 tabular">
      {has ? (
        <>
          <span style={{ color: "var(--ink)" }}>{val.toFixed(digits)}</span>
          <span style={{ color: "var(--label-dim)" }}>{unit}</span>
        </>
      ) : (
        <span style={{ color: "var(--label-dim)" }}>—</span>
      )}
    </td>
  );
}

export default function MorningBreakdown({ day }) {
  return (
    <div className="card p-5 sm:p-6 mb-4 overflow-x-auto">
      <h2 className="font-display font-bold text-base mb-3" style={{ color: "var(--ink)" }}>
        Morning breakdown
      </h2>
      {day.window5to11.length === 0 ? (
        <div className="text-sm py-6 text-center" style={{ color: "var(--label)" }}>
          No hourly data available for this morning yet.
        </div>
      ) : (
        <table className="breakdown w-full text-sm" style={{ minWidth: 480 }}>
          <thead>
            <tr className="eyebrow" style={{ color: "var(--label)" }}>
              <th className="text-left pb-2 pr-2">Time</th>
              <th className="text-right pb-2 px-2">Wind</th>
              <th className="text-right pb-2 px-2">Gust</th>
              <th className="text-right pb-2 px-2">Waves</th>
              <th className="text-right pb-2 px-2">Rain</th>
              <th className="text-right pb-2 pl-2">Temp</th>
            </tr>
          </thead>
          <tbody>
            {day.window5to11.map((h) => {
              const inWindow = isInRecommendedWindow(h.hour, day.whenToGo);
              return (
                <tr
                  key={h.hour}
                  style={{
                    borderTop: "1px solid var(--divider)",
                    background: inWindow ? "var(--accent-soft)" : "transparent",
                  }}
                >
                  <td className="py-2 pr-2 font-bold" style={{ color: "var(--ink)" }}>
                    {fmtHourLabel(h.hour)}
                  </td>
                  <Cell val={h.windMph} digits={0} unit=" mph" />
                  <Cell val={h.gustMph} digits={0} unit=" mph" />
                  <Cell val={h.waveFt} digits={1} unit=" ft" />
                  <Cell val={h.precipProbPct} digits={0} unit="%" />
                  <Cell val={h.tempF} digits={0} unit="°" />
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
