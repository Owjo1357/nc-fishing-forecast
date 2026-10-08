import { useCallback, useEffect, useRef, useState } from "react";
import { nowInNY } from "../lib/appLogic.js";
import { IconClock, IconFish, IconPin, IconWave } from "./Icons.jsx";
import SignalFlag from "./SignalFlag.jsx";

// One-time "what's new in 2.0" popup for the rename and move to
// ncfishingforecast.com (masonboro-fishing-dashboard.vercel.app and
// nc-fishing-forecast.vercel.app both redirect there).
//
// Shown once per device: closing it is remembered in localStorage.
// There's no way to show it only to people who came from the old link
// (the domain redirect doesn't tell the new site, and the old site's
// storage belongs to the old address), so everyone sees it once, and it
// retires itself on SHOW_UNTIL so people who find the site later don't
// get a "we've moved" message. Bump SEEN_KEY to show a new one.
const SEEN_KEY = "nc-fishing-forecast:whats-new:2.0";
export const SHOW_UNTIL = "2026-12-01"; // America/New_York date, exclusive

export function shouldShowWhatsNew(todayStr, seenValue) {
  return todayStr < SHOW_UNTIL && !seenValue;
}

function readSeen() {
  try {
    return localStorage.getItem(SEEN_KEY);
  } catch {
    return null; // storage blocked -- show it, it just won't be remembered
  }
}

function rememberSeen() {
  try {
    localStorage.setItem(SEEN_KEY, new Date().toISOString());
  } catch {
    /* non-fatal */
  }
}

const CHANGES = [
  {
    icon: <IconPin size={18} />,
    title: "Cape Lookout is here",
    text: "Tap the place name at the top of the page to switch between spots.",
  },
  {
    icon: <SignalFlag event="Small Craft Advisory" kind="advisory" size={11} pole={false} />,
    title: "Weather Service advisories",
    text: "Small craft advisories and other alerts now show right above the score.",
  },
  {
    icon: <IconWave size={18} />,
    title: "Better wind and wave numbers",
    text: "Wind is measured over the water, and waves come from NOAA's own wave model.",
  },
  {
    icon: <IconClock size={18} />,
    title: "Five days of history",
    text: "Scroll the day strip back to see how recent mornings scored.",
  },
];

export default function WhatsNew() {
  const [open, setOpen] = useState(() => shouldShowWhatsNew(nowInNY().dateStr, readSeen()));
  const dialogRef = useRef(null);
  const buttonRef = useRef(null);

  const close = useCallback(() => {
    rememberSeen();
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const before = document.activeElement;
    buttonRef.current?.focus();
    // Keep the page behind from scrolling while the popup is up.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      } else if (e.key === "Tab" && dialogRef.current) {
        // Keep keyboard focus inside the popup.
        const items = dialogRef.current.querySelectorAll("a[href], button");
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      if (before && before.focus) before.focus();
    };
  }, [open, close]);

  if (!open) return null;

  return (
    <div className="whats-new-backdrop fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6" onClick={close}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="whats-new-title"
        aria-describedby="whats-new-intro"
        onClick={(e) => e.stopPropagation()}
        className="whats-new-sheet w-full overflow-y-auto"
        style={{ maxWidth: 460, maxHeight: "92vh" }}
      >
        <div className="px-5 sm:px-7 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center rounded-xl shrink-0"
              style={{
                width: 44,
                height: 44,
                background: "linear-gradient(160deg,#4d84b3,#2f5f88)",
                color: "white",
                boxShadow: "0 4px 10px -4px rgba(47,95,136,0.6)",
              }}
            >
              <IconFish size={24} />
            </div>
            <p className="text-sm leading-snug" style={{ color: "var(--label)" }}>
              Version 2.0
            </p>
          </div>

          <h2
            id="whats-new-title"
            className="font-display font-extrabold text-[1.45rem] leading-tight mt-4"
            style={{ color: "var(--ink)" }}
          >
            Masonboro Fishing Forecast is now NC Fishing Forecast
          </h2>
          <p id="whats-new-intro" className="text-[0.95rem] mt-2 leading-snug" style={{ color: "var(--ink-soft)" }}>
            A new name, a new address, and a second place to fish.
          </p>

          <ul className="mt-5 flex flex-col gap-4">
            {CHANGES.map((c) => (
              <li key={c.title} className="flex gap-3">
                <span
                  className="flex items-center justify-center shrink-0 rounded-lg"
                  style={{ width: 34, height: 34, background: "var(--accent-soft)", color: "var(--accent)" }}
                >
                  {c.icon}
                </span>
                <div className="min-w-0">
                  <div className="font-semibold text-sm" style={{ color: "var(--ink)" }}>
                    {c.title}
                  </div>
                  <div className="text-sm leading-snug" style={{ color: "var(--label)" }}>
                    {c.text}
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-5 rounded-xl px-4 py-3 text-sm leading-snug" style={{ background: "var(--bg-top)", color: "var(--ink-soft)" }}>
            The new address is{" "}
            <a href="https://ncfishingforecast.com" className="font-semibold" style={{ color: "var(--accent)" }}>
              ncfishingforecast.com
            </a>
            . Old links still bring you here, but if you saved the old site to your home screen, add this one
            instead.
          </div>

        </div>

        {/* Pinned to the bottom of the sheet so it's reachable on short
            phones without scrolling past the list. */}
        <div className="sticky bottom-0 px-5 sm:px-7 pt-1 pb-5" style={{ background: "var(--card)" }}>
          <button
            ref={buttonRef}
            type="button"
            onClick={close}
            className="w-full rounded-xl py-3 font-semibold text-[0.95rem]"
            style={{ background: "var(--ink)", color: "#fff" }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
