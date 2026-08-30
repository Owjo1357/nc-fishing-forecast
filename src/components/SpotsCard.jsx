export default function SpotsCard({ spots }) {
  return (
    <div className="card p-5 sm:p-6 mb-4">
      <h2 className="font-display font-bold text-base mb-3" style={{ color: "var(--ink)" }}>
        Recommended spots
      </h2>
      {spots.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--label)" }}>
          No spot clears conditions today — sit this one out or stay inside the inlet.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {spots.map((s) => (
            <li key={s.id}>
              <div className="flex items-baseline justify-between gap-3 flex-wrap">
                <div className="font-semibold text-sm" style={{ color: "var(--ink)" }}>
                  {s.name}
                </div>
                <div className="text-xs tabular" style={{ color: "var(--label)" }}>
                  {s.distanceNm} nm · {s.depthFt !== null ? `${s.depthFt} ft` : "depth unpublished"}
                </div>
              </div>
              <div className="text-sm mt-0.5" style={{ color: "var(--label)" }}>
                {s.reason}
              </div>
              {!s.verified && (
                <div className="text-xs mt-0.5 italic" style={{ color: "var(--label-dim)" }}>
                  {s.note}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
