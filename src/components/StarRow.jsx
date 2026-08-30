function clampFrac(x) {
  return Math.max(0, Math.min(1, x));
}

function StarShape({ size, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ position: "absolute", top: 0, left: 0 }}>
      <path d="M12 2.5l2.9 6.3 6.8.7-5.1 4.7 1.5 6.8-6.1-3.5-6.1 3.5 1.5-6.8-5.1-4.7 6.8-.7Z" fill={color} />
    </svg>
  );
}

export default function StarRow({ stars, size = 20 }) {
  const items = [1, 2, 3, 4, 5].map((i) => clampFrac(stars - (i - 1)));
  return (
    <div className="flex items-center gap-0.5" aria-label={`${stars} out of 5 stars`}>
      {items.map((frac, i) => (
        <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
          <StarShape size={size} color="#d7dde3" />
          <span className="absolute inset-0 overflow-hidden" style={{ width: `${frac * 100}%` }}>
            <StarShape size={size} color="#d6a643" />
          </span>
        </span>
      ))}
    </div>
  );
}
