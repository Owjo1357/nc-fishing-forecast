import { useEffect, useRef } from "react";
import { fmtDateLabel } from "./format.js";

export default function DayTabs({ days, selected, onSelect, todayIndex }) {
  const stripRef = useRef(null);
  const tabRefs = useRef([]);

  // Keep the selected day centered in the scroller so the days on either
  // side of it are always visible without dragging the scrollbar.
  useEffect(() => {
    const strip = stripRef.current;
    const tab = tabRefs.current[selected];
    if (!strip || !tab) return;
    const target = tab.offsetLeft - (strip.clientWidth - tab.clientWidth) / 2;
    const max = strip.scrollWidth - strip.clientWidth;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    strip.scrollTo({
      left: Math.max(0, Math.min(target, max)),
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [selected, days.length]);

  const showJumpToToday = todayIndex >= 0 && selected !== todayIndex;

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-2 min-h-[1.75rem]">
        <span className="eyebrow" style={{ color: "var(--label-dim)" }}>
          Choose a day
        </span>
        {showJumpToToday && (
          <button
            onClick={() => onSelect(todayIndex)}
            className="text-xs font-semibold rounded-full px-2.5 py-1 transition-colors"
            style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
          >
            {selected < todayIndex ? "Jump to today →" : "← Back to today"}
          </button>
        )}
      </div>

      <div className="tab-strip" ref={stripRef} role="tablist" aria-label="Choose a day">
        {days.map((d, i) => {
          const isSel = i === selected;
          return (
            <button
              key={d.dateStr}
              ref={(el) => (tabRefs.current[i] = el)}
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
    </div>
  );
}
