// Loading skeletons, error state, and the soft "some data is missing"
// notice. Spec §9: never a blank card or a silent zero.

export function DataNotice({ text }) {
  return (
    <div
      className="rounded-xl px-4 py-3 mb-5 text-sm"
      style={{ background: "#fbf6ea", border: "1px solid #eee0bd", color: "#7a6626" }}
    >
      {text}
    </div>
  );
}

export function ErrorState({ message, detail, onRetry }) {
  return (
    <div className="card p-6 text-center mb-4">
      <div className="font-display font-bold mb-1" style={{ color: "var(--ink)" }}>
        Forecast unavailable
      </div>
      <p className="text-sm" style={{ color: "var(--label)" }}>
        {message}
      </p>
      {detail && (
        <p className="text-xs mt-2" style={{ color: "var(--label-dim)" }}>
          {detail}
        </p>
      )}
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 rounded-lg px-4 py-2 text-sm font-semibold"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          Try again
        </button>
      )}
    </div>
  );
}

function Bar({ w, h = 14 }) {
  return <div className="skeleton" style={{ width: w, height: h }} />;
}

export function LoadingSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      <div className="tab-strip mb-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton day-tab" style={{ height: 68 }} />
        ))}
      </div>
      <div className="card p-5 sm:p-6 mb-4">
        <Bar w={180} h={10} />
        <div className="mt-3 flex gap-2">
          <Bar w={120} h={22} />
          <Bar w={70} h={22} />
        </div>
        <div className="mt-3">
          <Bar w="90%" />
        </div>
        <div className="mt-2">
          <Bar w="60%" />
        </div>
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Bar w="100%" h={54} />
          <Bar w="100%" h={54} />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 84 }} />
        ))}
      </div>
      <div className="skeleton mb-4" style={{ height: 260 }} />
      <div className="skeleton mb-4" style={{ height: 130 }} />
      <div className="skeleton mb-4" style={{ height: 150 }} />
    </div>
  );
}
