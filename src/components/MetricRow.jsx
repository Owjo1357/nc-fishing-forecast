import { degToCompass } from "../lib/scoring.js";
import { IconWind, IconWave, IconRain, IconTherm, IconTide, IconDrop } from "./Icons.jsx";
import { num, roundOrDash, nextEventLabel } from "./format.js";

function MetricCard({ icon, label, value, detail }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-1.5 eyebrow mb-2" style={{ color: "var(--label)" }}>
        {icon} {label}
      </div>
      <div className="font-display font-bold text-xl tabular" style={{ color: "var(--ink)" }}>
        {value}
      </div>
      <div className="text-xs mt-0.5" style={{ color: "var(--label)" }}>
        {detail}
      </div>
    </div>
  );
}

export default function MetricRow({ day }) {
  const inp = day.score.inputs || {};
  const dir =
    inp.avgDirDeg !== undefined && inp.avgDirDeg !== null ? degToCompass(inp.avgDirDeg) : null;
  const nextTide = nextEventLabel(day.nextTideEvent);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
      <MetricCard
        icon={<IconWind size={13} />}
        label="WIND"
        value={
          inp.avgWindMph !== undefined && inp.avgWindMph !== null
            ? `${roundOrDash(inp.avgWindMph)} mph`
            : "—"
        }
        detail={dir ? `${dir} · gust ${roundOrDash(inp.maxGustMph)}` : "morning avg"}
      />
      <MetricCard
        icon={<IconWave size={13} />}
        label="WAVES"
        value={
          inp.avgWaveFt !== undefined && inp.avgWaveFt !== null ? `${num(inp.avgWaveFt, 1)} ft` : "—"
        }
        detail={
          inp.avgPeriodSec
            ? `${roundOrDash(inp.avgPeriodSec)}s period`
            : day.marineAvailable === false
            ? "beyond marine horizon"
            : "morning avg"
        }
      />
      <MetricCard
        icon={<IconRain size={13} />}
        label="RAIN"
        value={
          inp.maxPrecipProb !== undefined && inp.maxPrecipProb !== null
            ? `${roundOrDash(inp.maxPrecipProb)}%`
            : "—"
        }
        detail="chance, morning"
      />
      <MetricCard
        icon={<IconTherm size={13} />}
        label="TEMP"
        value={
          inp.avgApparentTemp !== undefined && inp.avgApparentTemp !== null
            ? `${roundOrDash(inp.avgApparentTemp)}°`
            : "—"
        }
        detail="feels-like avg"
      />
      <MetricCard
        icon={<IconTide size={13} />}
        label="TIDE"
        value={nextTide.time}
        detail={nextTide.type ? `next ${nextTide.type.toLowerCase()}` : "unavailable"}
      />
      <MetricCard
        icon={<IconDrop size={13} />}
        label="WATER TEMP"
        value={day.sstF !== null && day.sstF !== undefined ? `${roundOrDash(day.sstF)}°` : "—"}
        detail={day.marineAvailable === false ? "beyond marine horizon" : "sea surface"}
      />
    </div>
  );
}
