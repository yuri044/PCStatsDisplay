// A single row in the process table.
// Kept as a separate component so React can diff rows individually rather
// than re-rendering the whole table on every update.

import type { ProcessInfo } from '../../types/process';

/** Format bytes into a short human-readable string */
function fmtMem(bytes: number): string {
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} K`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} M`;
  return `${(bytes / 1024 ** 3).toFixed(2)} G`;
}

interface Props {
  process: ProcessInfo;
  /** Height of this row in px — must match the virtual scroll row height */
  style?: React.CSSProperties;
  onKill: (process: ProcessInfo) => void;
}

export function ProcessRow({ process, style, onKill }: Props) {
  // Map status string to a colour indicator dot
  const statusColor =
    process.status === 'Run' ? 'var(--accent-green)'
    : process.status === 'Sleep' ? 'var(--accent-blue)'
    : 'var(--text-muted)';

  return (
    <div
      className="flex items-center px-3 gap-2 group transition-colors"
      style={{
        ...style,
        height: '28px',
        cursor: 'default',
        borderBottom: '1px solid var(--border)',
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = 'var(--bg-hover)')
      }
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {/* Status dot */}
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: statusColor }}
      />

      {/* Process name — truncated with tooltip showing full name + path */}
      <span
        className="flex-1 text-[11px] truncate"
        style={{ color: 'var(--text-primary)' }}
        title={`${process.name}\n${process.exe_path}`}
      >
        {process.name}
      </span>

      {/* PID */}
      <span
        className="text-[10px] tabular-nums w-10 text-right shrink-0"
        style={{ color: 'var(--text-muted)' }}
      >
        {process.pid}
      </span>

      {/* CPU usage */}
      <span
        className="text-[10px] tabular-nums w-10 text-right shrink-0 font-medium"
        style={{
          color:
            process.cpu_usage > 20
              ? 'var(--accent-orange)'
              : 'var(--text-secondary)',
        }}
      >
        {process.cpu_usage.toFixed(1)}%
      </span>

      {/* Memory */}
      <span
        className="text-[10px] tabular-nums w-12 text-right shrink-0"
        style={{ color: 'var(--text-secondary)' }}
      >
        {fmtMem(process.memory_bytes)}
      </span>

      {/* Kill button — only visible on hover */}
      <button
        onClick={() => onKill(process)}
        title={`Kill ${process.name}`}
        className="w-5 h-5 rounded flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        style={{
          background: 'rgba(239,68,68,0.15)',
          color: 'var(--accent-red)',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        ✕
      </button>
    </div>
  );
}
