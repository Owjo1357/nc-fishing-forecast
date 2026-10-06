import { IconFish, IconPin } from "./Icons.jsx";
import LocationMenu from "./LocationMenu.jsx";

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
          {allLocations.length > 1 ? (
            <LocationMenu location={location} allLocations={allLocations} onChange={onChangeLocation} />
          ) : (
            <h1
              className="font-display font-extrabold text-[1.35rem] leading-tight"
              style={{ color: "var(--ink)" }}
            >
              {location.name}
            </h1>
          )}
          <div className="flex items-center gap-1 text-sm" style={{ color: "var(--label)" }}>
            <IconPin size={13} />
            <span>{location.region}</span>
          </div>
        </div>
      </div>
      <div className="mt-5" style={{ borderTop: "1px solid var(--divider)" }} />
    </header>
  );
}
