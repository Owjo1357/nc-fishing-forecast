import { fmtDateLabel } from "./format.js";

export default function DayTabs({ days, selected, onSelect }) {
  return (
    <div className="tab-strip mb-5" role="tablist" aria-label="Choose a day">
      {days.map((d, i) => {
        const isSel = i === selected;
        return (
          <button
            key={d.dateStr}
            role="tab"
            aria-selected={isSel}
            onClick={() => onSelect(i)}
            className="day-tab rounded-xl px-3 py-2.5 text-left transition-colors"
            style={{
              background: isSel ? "#16202b" : "#ffffff",
              border: isSel ? "1px solid #16202b" : "1px solid var(--card-border)",
              opacity: d.isPast && !isSel ? 0.62 : 1,
              boxShadow: isSel ? "0 6px 16px -6px rgba(22,32,43,0.45)" : "none",
            }}
          >
            <div className="eyebrow" style={{ color: isSel ? "#aab4c0" : "var(--label-dim)" }}>
              {d.label}
            </div>
            <div
              className="font-display font-bold text-sm mt-0.5"
              style={{ color: isSel ? "#fff" : "var(--ink)" }}
            >
              {fmtDateLabel(d.dateStr)}
            </div>
            <div
              className="text-xs font-semibold mt-0.5"
              style={{ color: isSel ? "#fff" : d.score.color || "var(--label-dim)" }}
            >
              {d.score.ratingWord || "—"}
            </div>
          </button>
        );
      })}
    </div>
  );
}
