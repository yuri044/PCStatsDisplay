// A single sensor row: label | animated bar | value.
// Used for CPU, RAM, GPU utilisation, disk usage, network bandwidth.

import { ReactNode } from 'react';
import { ProgressBar } from '../shared/ProgressBar';
import { SparkLine } from './SparkLine';

interface Props {
  /** Short label, e.g. "CPU" or "RAM" */
  label: string;
  /** Current value, 0–100 (percentage or normalised) */
  value: number;
  /** Formatted value string shown on the right, e.g. "72%" or "1.2 GB" */
  displayValue: string;
  /** Optional rolling history for the sparkline (omit to hide sparkline) */
  history?: number[];
  /** Override the bar/sparkline colour */
  color?: string;
  /** Secondary info shown below the label (e.g. CPU name, frequency) */
  subtitle?: string;
  /** Optional element rendered to the right of the value (e.g. TempRing) */
  rightSlot?: ReactNode;
  /** Extra tailwind/CSS classes for the root div */
  className?: string;
}

export function StatRow({ label, value, displayValue, history, color, subtitle, rightSlot, className = '' }: Props) {
  return (
    <div className={`px-3 py-1.5 group flex-1 ${className}`}>
      {/* Top line: label + value */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <span
            className="text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: 'var(--text-muted)' }}
          >
            {label}
          </span>
          {subtitle && (
            <span
              className="text-[9px] truncate max-w-[80px]"
              style={{ color: 'var(--text-muted)', opacity: 0.7 }}
              title={subtitle}
            >
              {subtitle}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Sparkline — only rendered when history data is provided */}
          {history && history.length > 1 && (
            <SparkLine data={history} color={color} width={48} height={14} />
          )}
          <span
            className="text-xs font-mono tabular-nums"
            style={{ color: 'var(--text-primary)', minWidth: '3.5rem', textAlign: 'right' }}
          >
            {displayValue}
          </span>
          {/* Optional right slot (e.g. TempRing) */}
          {rightSlot}
        </div>
      </div>

      {/* Progress bar */}
      <ProgressBar value={value} color={color} />
    </div>
  );
}
