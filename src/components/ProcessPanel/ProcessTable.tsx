// Virtualized process table.
//
// Renders only the rows that are currently visible in the scroll viewport,
// keeping DOM node count constant regardless of the number of processes.
// This lets the table handle 200+ processes without layout thrashing.
//
// Virtual scroll is implemented without a library: we measure the container
// height and only render rows in the [startIndex, endIndex] window.

import { useRef, useState } from 'react';
import type { ProcessInfo, SortKey } from '../../types/process';
import { ProcessRow } from './ProcessRow';

/** Fixed height for every process row in pixels */
const ROW_HEIGHT = 28;

/** Column header definition */
interface Column {
  key: SortKey;
  label: string;
  width?: string;
}

const COLUMNS: Column[] = [
  { key: 'name',         label: 'Name',    width: 'flex-1' },
  { key: 'pid',          label: 'PID',     width: 'w-10'   },
  { key: 'cpu_usage',    label: 'CPU',     width: 'w-10'   },
  { key: 'memory_bytes', label: 'Mem',     width: 'w-12'   },
];

interface Props {
  processes: ProcessInfo[];
  sortKey: SortKey;
  sortAsc: boolean;
  onSort: (key: SortKey) => void;
  onKill: (process: ProcessInfo) => void;
}

export function ProcessTable({ processes, sortKey, sortAsc, onSort, onKill }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  // Calculate visible window from current scroll position
  const containerHeight = containerRef.current?.clientHeight ?? 300;
  const totalHeight = processes.length * ROW_HEIGHT;

  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 3);
  const endIndex = Math.min(
    processes.length - 1,
    Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + 3
  );

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* ── Column headers ──────────────────────────────────────── */}
      <div
        className="flex items-center px-3 gap-2 shrink-0"
        style={{
          height: '22px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-secondary)',
        }}
      >
        {/* Status dot column spacer */}
        <span className="w-1.5 shrink-0" />

        {COLUMNS.map((col) => (
          <button
            key={col.key}
            onClick={() => onSort(col.key)}
            className={`text-[9px] font-semibold uppercase tracking-widest text-right shrink-0 ${col.width}`}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color:
                sortKey === col.key
                  ? 'var(--text-primary)'
                  : 'var(--text-muted)',
              textAlign: col.key === 'name' ? 'left' : 'right',
            }}
          >
            {col.label}
            {sortKey === col.key && (
              <span style={{ marginLeft: '2px' }}>
                {sortAsc ? '↑' : '↓'}
              </span>
            )}
          </button>
        ))}

        {/* Kill button column spacer */}
        <span className="w-5 shrink-0" />
      </div>

      {/* ── Scrollable virtual row area ─────────────────────────── */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto"
        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      >
        {/* Full-height inner div so the scrollbar is sized correctly */}
        <div style={{ height: totalHeight, position: 'relative' }}>
          {processes.slice(startIndex, endIndex + 1).map((process, offset) => {
            const index = startIndex + offset;
            return (
              <ProcessRow
                key={process.pid}
                process={process}
                style={{ position: 'absolute', top: index * ROW_HEIGHT, left: 0, right: 0 }}
                onKill={onKill}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
