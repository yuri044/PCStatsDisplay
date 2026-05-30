// Animated horizontal progress bar used by StatRow.
// The fill colour transitions from green → orange → red based on the value,
// and the width animates smoothly via Framer Motion's layout animation.

import { motion } from 'framer-motion';

interface Props {
  /** Current value, 0–100 */
  value: number;
  /** Optional explicit colour override; defaults to dynamic heat colour */
  color?: string;
  className?: string;
}

/** Map a 0–100 value to a CSS colour along the green-orange-red heat scale. */
function heatColor(value: number): string {
  if (value < 60) return 'var(--accent-green)';
  if (value < 80) return 'var(--accent-orange)';
  return 'var(--accent-red)';
}

export function ProgressBar({ value, color, className = '' }: Props) {
  const clampedValue = Math.min(100, Math.max(0, value));
  const fill = color ?? heatColor(clampedValue);

  return (
    // Track (grey background)
    <div
      className={`relative h-1.5 rounded-full overflow-hidden ${className}`}
      style={{ background: 'var(--bar-track)' }}
    >
      {/* Animated fill */}
      <motion.div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{ background: fill }}
        animate={{ width: `${clampedValue}%` }}
        transition={{ type: 'spring', stiffness: 120, damping: 20, mass: 0.5 }}
      />
    </div>
  );
}
