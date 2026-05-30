// Circular temperature indicator (ring gauge).
// Renders an SVG arc whose progress corresponds to a 0–100°C scale.
// The colour transitions from green → orange → red with the heat scale.

import { motion } from 'framer-motion';

interface Props {
  /** Temperature in °C */
  tempC: number | null;
  /** Diameter in px */
  size?: number;
}

const MIN_TEMP = 0;
const MAX_TEMP = 100; // Treat 100°C as the "full" arc

function tempColor(temp: number): string {
  if (temp < 60) return 'var(--accent-green)';
  if (temp < 80) return 'var(--accent-orange)';
  return 'var(--accent-red)';
}

export function TempRing({ tempC, size = 36 }: Props) {
  // Normalise temperature to a 0–1 progress value
  const progress =
    tempC !== null
      ? Math.min(1, Math.max(0, (tempC - MIN_TEMP) / (MAX_TEMP - MIN_TEMP)))
      : 0;

  const radius = (size - 4) / 2; // Leave 2px margin for stroke width
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);
  const color = tempC !== null ? tempColor(tempC) : 'var(--text-muted)';

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        style={{ transform: 'rotate(-90deg)' }} // Start arc from top
      >
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--bar-track)"
          strokeWidth={2.5}
        />
        {/* Animated progress arc */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeDasharray={circumference}
          animate={{ strokeDashoffset }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        />
      </svg>

      {/* Temperature label in the centre */}
      <span
        className="absolute text-[9px] font-bold tabular-nums"
        style={{ color }}
      >
        {tempC !== null ? `${Math.round(tempC)}°` : '—'}
      </span>
    </div>
  );
}
