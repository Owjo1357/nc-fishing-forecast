import { IconFish, IconPin } from "./Icons.jsx";

export default function Header({ location, allLocations, onChangeLocation, refreshing }) {
  return (
    <header className="pt-6 pb-4">
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
        <div className="min-w-0 flex-1">
          <div className="eyebrow" style={{ color: "var(--label-dim)" }}>
            NC Fishing Forecast{refreshing && " · updating…"}
          </div>
          <h1
            className="font-display font-extrabold text-[1.35rem] leading-tight"
            style={{ color: "var(--ink)" }}
          >
            {location.name}
          </h1>
          <div className="flex items-center gap-1 text-sm" style={{ color: "var(--label)" }}>
            <IconPin size={13} />
            <span>{location.region}</span>
          </div>
        </div>
        {allLocations.length > 1 && (
          <label className="shrink-0">
            <span className="sr-only">Choose a location</span>
            <select
              value={location.id}
              onChange={(e) => onChangeLocation(e.target.value)}
              className="text-sm font-semibold rounded-lg border py-2 pl-3 pr-8 appearance-none cursor-pointer"
              style={{
                borderColor: "var(--card-border)",
                color: "var(--ink)",
                background:
                  "var(--card) url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7686' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\") no-repeat right 0.65rem center",
                maxWidth: "11rem",
              }}
            >
              {allLocations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div className="mt-5" style={{ borderTop: "1px solid var(--divider)" }} />
    </header>
  );
}
