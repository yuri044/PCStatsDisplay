// Mini SVG sparkline showing the rolling 30-second history of a metric.
// Data is normalised to 0–100 and plotted as a smooth SVG polyline.

interface Props {
  /** Array of values (0–100), newest at the end */
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}

export function SparkLine({
  data,
  color = 'var(--accent-blue)',
  width = 60,
  height = 20,
}: Props) {
  if (data.length < 2) return null;

  // Map data points to SVG coordinates
  // X spans the full width; Y is inverted (SVG 0 is top, 100% load is bottom)
  const stepX = width / (data.length - 1);
  const points = data
    .map((v, i) => {
      const x = i * stepX;
      const y = height - (Math.min(100, Math.max(0, v)) / 100) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ overflow: 'visible', flexShrink: 0 }}
    >
      {/* Filled area under the line for visual weight */}
      <polyline
        points={`0,${height} ${points} ${width},${height}`}
        fill={color}
        fillOpacity={0.12}
        stroke="none"
      />
      {/* The sparkline itself */}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
