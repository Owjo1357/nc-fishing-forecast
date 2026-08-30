import { IconFish, IconPin, IconRefresh } from "./Icons.jsx";

export default function Header({ location, allLocations, onRefresh, refreshing }) {
  return (
    <header className="pt-6 pb-4">
      <div className="flex items-center gap-3">
        <div
          className="flex items-center justify-center rounded-xl"
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
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h1
              className="font-display font-extrabold text-[1.35rem] leading-tight"
              style={{ color: "var(--ink)" }}
            >
              {location.name}
            </h1>
            {allLocations.length > 1 && (
              <select
                className="ml-1 text-xs rounded-md border px-1.5 py-0.5"
                style={{ borderColor: "var(--card-border)", color: "var(--label)" }}
                defaultValue={location.id}
              >
                {allLocations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="flex items-center gap-1 text-sm" style={{ color: "var(--label)" }}>
            <IconPin size={13} />
            <span>{location.region} · Fishing Forecast</span>
          </div>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={refreshing}
            aria-label="Refresh forecast"
            className="shrink-0 rounded-lg border p-2 transition-colors disabled:opacity-50"
            style={{ borderColor: "var(--card-border)", color: "var(--label)", background: "var(--card)" }}
          >
            <IconRefresh size={16} className={refreshing ? "animate-spin" : ""} />
          </button>
        )}
      </div>
      <div className="mt-5" style={{ borderTop: "1px solid var(--divider)" }} />
    </header>
  );
}
