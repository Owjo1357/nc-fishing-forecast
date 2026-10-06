// Coastal warning display flags -- the signals marinas and Coast Guard
// stations flew for NWS marine warnings -- so an advisory reads the way a
// fisherman already knows it:
//   Small Craft Advisory  one red pennant
//   Gale Warning          two red pennants
//   Storm Warning         square red flag, black center
//   Hurricane Warning     two of those
// Everything else (beach hazards, rip currents, coastal flood, fog,
// watches) gets a beach hazard flag: red for warnings, yellow otherwise.

export const FLAG_RED = "#c8372d";
export const FLAG_BLACK = "#16202b";
export const FLAG_YELLOW = "#e2ae1b";

export function flagFor(event, kind) {
  if (/small craft/i.test(event)) return { shape: "pennant", count: 1, color: FLAG_RED };
  if (/^gale/i.test(event)) return { shape: "pennant", count: 2, color: FLAG_RED };
  if (/hurricane (force wind )?warning/i.test(event)) return { shape: "storm", count: 2, color: FLAG_RED };
  if (/^(storm warning|storm force|tropical storm warning)/i.test(event)) return { shape: "storm", count: 1, color: FLAG_RED };
  return { shape: "beach", count: 1, color: kind === "warning" ? FLAG_RED : FLAG_YELLOW };
}

function FlagShape({ shape, color, y, ink }) {
  if (shape === "pennant") return <path d={`M4 ${y} L25 ${y + 5.5} L4 ${y + 11} Z`} fill={color} />;
  if (shape === "storm")
    return (
      <g>
        <rect x="4" y={y} width="19" height="12" fill={color} />
        <rect x="10" y={y + 3.5} width="7" height="5" fill={ink} />
      </g>
    );
  return <path d={`M4 ${y} H22 L19.5 ${y + 6} L22 ${y + 12} H4 Z`} fill={color} />;
}

// `size` is the rendered height in px. `pole` draws the staff down past
// the flags; the banner extends it the rest of the way so each alert
// hangs off its own flagpole. `ink` is the staff and storm-flag center,
// flipped to white on dark backgrounds.
export default function SignalFlag({ event, kind, size = 30, pole = true, ink = FLAG_BLACK }) {
  const f = flagFor(event, kind);
  const height = f.count === 2 ? 27 : 14;
  const vbHeight = pole ? 30 : height + 1;
  return (
    <svg
      width={(size * 26) / vbHeight}
      height={size}
      viewBox={`0 0 26 ${vbHeight}`}
      aria-hidden="true"
      style={{ display: "block", overflow: "visible" }}
    >
      <line x1="3.25" y1="0.5" x2="3.25" y2={vbHeight} stroke={ink} strokeWidth="1.5" strokeLinecap="round" />
      <FlagShape shape={f.shape} color={f.color} y={1.5} ink={ink} />
      {f.count === 2 && <FlagShape shape={f.shape} color={f.color} y={15} ink={ink} />}
    </svg>
  );
}
