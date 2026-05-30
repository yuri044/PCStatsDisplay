// Process panel — task-manager-style view of all running processes.
// Fetches a fresh snapshot when the panel becomes visible, then refreshes
// every 3 seconds while the tab is active.

import { useEffect, useRef, useState } from 'react';
import { useProcesses } from '../../hooks/useProcesses';
import { SearchBar } from './SearchBar';
import { ProcessTable } from './ProcessTable';
import { KillConfirmModal } from './KillConfirmModal';
import type { ProcessInfo } from '../../types/process';

/** Refresh interval while the Processes tab is visible (milliseconds) */
const REFRESH_INTERVAL_MS = 3000;

export function ProcessPanel() {
  const {
    processes,
    totalCount,
    sortKey,
    sortAsc,
    searchQuery,
    isLoading,
    fetchProcesses,
    setSort,
    setSearch,
  } = useProcesses();

  // The process selected for the kill confirmation modal
  const [processToKill, setProcessToKill] = useState<ProcessInfo | null>(null);

  // Initial fetch + polling while the panel is mounted
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchProcesses();

    timerRef.current = setInterval(fetchProcesses, REFRESH_INTERVAL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchProcesses]);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Filter + count header */}
      <SearchBar
        value={searchQuery}
        onChange={setSearch}
        count={processes.length}
        totalCount={totalCount}
      />

      {/* Loading state — only shown on first load before any data arrives */}
      {isLoading && processes.length === 0 ? (
        <div
          className="flex items-center justify-center flex-1 text-xs"
          style={{ color: 'var(--text-muted)' }}
        >
          Loading processes…
        </div>
      ) : (
        <ProcessTable
          processes={processes}
          sortKey={sortKey}
          sortAsc={sortAsc}
          onSort={setSort}
          onKill={setProcessToKill}
        />
      )}

      {/* Kill confirmation modal — portal-like positioning via fixed layout */}
      <KillConfirmModal
        process={processToKill}
        onClose={() => setProcessToKill(null)}
      />
    </div>
  );
}
