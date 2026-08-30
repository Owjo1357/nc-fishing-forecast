import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { fmtDateLabel } from "./format.js";

export default function DayTabs({ days, selected, onSelect, todayIndex }) {
  const stripRef = useRef(null);
  const tabRefs = useRef([]);
  const leadSpacerRef = useRef(null);
  const tailSpacerRef = useRef(null);

  // Center the selected day in the scroller. The leading/trailing
  // spacers give the strip enough slack that even the first or last
  // day can sit dead center, not just jammed against the edge.
  const centerSelected = useCallback(
    (behavior) => {
      const strip = stripRef.current;
      const tab = tabRefs.current[selected];
      if (!strip || !tab) return;

      const pad = strip.clientWidth / 2;
      if (leadSpacerRef.current) leadSpacerRef.current.style.flexBasis = `${pad}px`;
      if (tailSpacerRef.current) tailSpacerRef.current.style.flexBasis = `${pad}px`;

      // getBoundingClientRect forces the reflow, so the spacer widths
      // above are already applied by the time we measure.
      const stripRect = strip.getBoundingClientRect();
      const tabRect = tab.getBoundingClientRect();
      const tabCenterInContent =
        tabRect.left - stripRect.left + strip.scrollLeft + tabRect.width / 2;
      const left = tabCenterInContent - strip.clientWidth / 2;

      const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      strip.scrollTo({ left, behavior: reduceMotion ? "auto" : behavior });
    },
    [selected]
  );

  // Jump (no animation) on first paint / when the day list changes;
  // animate when the user picks a different day.
  useLayoutEffect(() => {
    centerSelected("auto");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days.length]);

  useEffect(() => {
    centerSelected("smooth");
  }, [centerSelected]);

  useEffect(() => {
    const onResize = () => centerSelected("auto");
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [centerSelected]);

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
        <div ref={leadSpacerRef} aria-hidden="true" style={{ flex: "0 0 0px" }} />
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
        <div ref={tailSpacerRef} aria-hidden="true" style={{ flex: "0 0 0px" }} />
      </div>
    </div>
  );
}
