export default function SpeciesCard({ species }) {
  return (
    <div className="card p-5 sm:p-6 mb-4">
      <h2 className="font-display font-bold text-base mb-3" style={{ color: "var(--ink)" }}>
        Target species
      </h2>
      {species.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--label)" }}>
          Nothing's really turned on for these conditions — worth a scouting run at best.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {species.map((s) => (
            <li key={s.id} className="flex items-start gap-3">
              <span
                className="mt-1.5 rounded-full shrink-0"
                style={{ width: 6, height: 6, background: "var(--accent)" }}
              />
              <div>
                <div className="font-semibold text-sm" style={{ color: "var(--ink)" }}>
                  {s.name}
                </div>
                <div className="text-sm" style={{ color: "var(--label)" }}>
                  {s.reason}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
