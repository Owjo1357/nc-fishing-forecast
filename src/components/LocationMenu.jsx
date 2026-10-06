import { useEffect, useId, useRef, useState } from "react";
import { IconCheck, IconChevronDown, IconPin } from "./Icons.jsx";

// The location name doubles as the picker: tap "Cape Lookout ▾" to get a
// themed menu of places. Built by hand (not a native <select>) so the
// open list matches the rest of the app; follows the listbox pattern for
// keyboard and screen-reader use.
export default function LocationMenu({ location, allLocations, onChange }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const listRef = useRef(null);
  const listId = useId();
  const currentIndex = Math.max(0, allLocations.findIndex((l) => l.id === location.id));

  const openMenu = (index = currentIndex) => {
    setActive(index);
    setOpen(true);
  };
  const closeMenu = (refocus = true) => {
    setOpen(false);
    if (refocus) buttonRef.current?.focus();
  };
  const choose = (i) => {
    const next = allLocations[i];
    closeMenu();
    if (next && next.id !== location.id) onChange(next.id);
  };

  // Move focus into the list when it opens.
  useEffect(() => {
    if (open) listRef.current?.focus();
  }, [open]);

  // Close on a tap or click anywhere outside.
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) closeMenu(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const onButtonKey = (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      openMenu();
    }
  };

  const onListKey = (e) => {
    const last = allLocations.length - 1;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i >= last ? 0 : i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? last : i - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(last);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      choose(active);
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeMenu();
    } else if (e.key === "Tab") {
      closeMenu(false);
    }
  };

  return (
    <div ref={rootRef} className="relative max-w-full">
      <h1 className="font-display font-extrabold text-[1.35rem] leading-tight" style={{ color: "var(--ink)" }}>
        <button
          ref={buttonRef}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          onClick={() => (open ? closeMenu() : openMenu())}
          onKeyDown={onButtonKey}
          className="location-trigger flex items-center gap-1.5 rounded-lg -ml-1.5 pl-1.5 pr-1 py-0.5 max-w-full text-left"
        >
          <span className="truncate">{location.name}</span>
          <span
            className="flex items-center justify-center rounded-full shrink-0 transition-transform"
            style={{
              width: 22,
              height: 22,
              background: "var(--accent-soft)",
              color: "var(--accent)",
              transform: open ? "rotate(180deg)" : "none",
            }}
          >
            <IconChevronDown size={14} />
          </span>
          <span className="sr-only">, change location</span>
        </button>
      </h1>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          tabIndex={-1}
          aria-label="Choose a location"
          aria-activedescendant={`${listId}-${active}`}
          onKeyDown={onListKey}
          className="location-menu card absolute z-20 mt-2 p-1.5 outline-none"
          // Pull left past the 44px logo + 12px gap so the menu lines up
          // with the page's left edge and has the full width to work with.
          style={{ left: -56, width: 300, maxWidth: "calc(100vw - 2rem)" }}
        >
          <li role="presentation" className="eyebrow px-3 pt-2 pb-1.5" style={{ color: "var(--label-dim)" }}>
            Fishing spots
          </li>
          {allLocations.map((l, i) => {
            const isCurrent = l.id === location.id;
            const isActive = i === active;
            return (
              <li
                key={l.id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={isCurrent}
                onPointerEnter={() => setActive(i)}
                onClick={() => choose(i)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 cursor-pointer"
                style={{ background: isActive ? "var(--accent-soft)" : "transparent" }}
              >
                <span
                  className="flex items-center justify-center rounded-lg shrink-0"
                  style={{
                    width: 32,
                    height: 32,
                    background: isCurrent ? "linear-gradient(160deg,#4d84b3,#2f5f88)" : "var(--bg-top)",
                    color: isCurrent ? "#fff" : "var(--label)",
                  }}
                >
                  <IconPin size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-sm" style={{ color: "var(--ink)" }}>
                    {l.name}
                  </span>
                  <span className="block text-xs truncate" style={{ color: "var(--label)" }}>
                    {l.region}
                  </span>
                </span>
                {isCurrent && (
                  <span className="shrink-0" style={{ color: "var(--accent)" }}>
                    <IconCheck size={16} />
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
