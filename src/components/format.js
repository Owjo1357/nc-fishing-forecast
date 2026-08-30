// Small display-formatting helpers shared across components.

export function fmtHM(parts) {
  if (!parts) return "—";
  let h = parts.hour % 12;
  if (h === 0) h = 12;
  const ampm = parts.hour >= 12 ? "PM" : "AM";
  return `${h}:${String(parts.minute).padStart(2, "0")} ${ampm}`;
}

export function fmtDateLabel(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export function fmtDateLong(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt
    .toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })
    .toUpperCase();
}

export function num(v, digits = 0) {
  return v === null || v === undefined || Number.isNaN(v) ? "—" : v.toFixed(digits);
}

export function roundOrDash(v) {
  return v === null || v === undefined || Number.isNaN(v) ? "—" : Math.round(v).toString();
}

export function nextEventLabel(ev) {
  if (!ev) return { time: "—", type: "" };
  const [h, m] = ev.t.slice(11, 16).split(":").map(Number);
  return { time: fmtHM({ hour: h, minute: m }), type: ev.type === "H" ? "High" : "Low" };
}

export function fmtHourLabel(h) {
  let hh = h % 12;
  if (hh === 0) hh = 12;
  return `${hh} ${h >= 12 ? "PM" : "AM"}`;
}

export function isInRecommendedWindow(hour, whenToGo) {
  if (!whenToGo) return false;
  const parse = (s) => {
    const m = s.match(/(\d+):(\d+)\s*(AM|PM)/);
    if (!m) return null;
    let h = parseInt(m[1], 10);
    if (m[3] === "PM" && h !== 12) h += 12;
    if (m[3] === "AM" && h === 12) h = 0;
    return h;
  };
  const start = parse(whenToGo.windowStart);
  const end = parse(whenToGo.windowEnd);
  if (start === null || end === null) return false;
  return hour >= start && hour <= end;
}
