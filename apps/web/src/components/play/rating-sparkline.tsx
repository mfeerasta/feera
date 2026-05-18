/**
 * Zero-dep SVG sparkline for a player's recent rating trail.
 * Renders a smooth polyline + a dot at the last data point.
 * Respects `prefers-reduced-motion` (no animations either way; this just
 * draws once).
 */

export interface SparklinePoint {
  ratingDisplay: number;
}

export function RatingSparkline({
  points,
  width = 220,
  height = 56,
  strokeWidth = 1.5,
  className,
  ariaLabel,
}: {
  points: ReadonlyArray<SparklinePoint>;
  width?: number;
  height?: number;
  strokeWidth?: number;
  className?: string;
  ariaLabel?: string;
}) {
  if (points.length < 2) {
    return (
      <div
        className={`flex h-[56px] items-center text-[10px] uppercase tracking-[0.2em] text-[var(--color-fg-muted)] ${className ?? ''}`}
      >
        No history yet.
      </div>
    );
  }

  // Pad x evenly, scale y to fit.
  const padX = 6;
  const padY = 6;
  const usableW = width - padX * 2;
  const usableH = height - padY * 2;

  const ys = points.map((p) => p.ratingDisplay);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const yRange = yMax - yMin || 1; // avoid divide-by-zero

  const coords = points.map((p, i) => {
    const x = padX + (i * usableW) / (points.length - 1);
    // Invert Y so higher rating renders higher.
    const y = padY + usableH - ((p.ratingDisplay - yMin) / yRange) * usableH;
    return { x, y };
  });

  const path = coords
    .map((c, i) => (i === 0 ? `M ${c.x} ${c.y}` : `L ${c.x} ${c.y}`))
    .join(' ');

  const last = coords[coords.length - 1]!;
  const lastValue = ys[ys.length - 1]!;
  const trend = ys[ys.length - 1]! - ys[0]!;
  const trendColor = trend >= 0 ? 'var(--color-court, #437e5b)' : 'var(--color-fg-muted, #888)';

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label={
        ariaLabel ??
        `Rating trail. Latest ${lastValue.toFixed(1)}. ${trend >= 0 ? 'Up' : 'Down'} ${Math.abs(trend).toFixed(1)} over ${points.length} matches.`
      }
      className={className}
    >
      {/* Baseline */}
      <line
        x1={padX}
        x2={width - padX}
        y1={height - padY}
        y2={height - padY}
        stroke="currentColor"
        strokeOpacity={0.15}
        strokeWidth={1}
      />
      {/* Trail */}
      <path
        d={path}
        fill="none"
        stroke={trendColor}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Last point dot */}
      <circle cx={last.x} cy={last.y} r={3} fill={trendColor} />
    </svg>
  );
}
