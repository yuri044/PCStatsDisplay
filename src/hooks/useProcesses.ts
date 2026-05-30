// Hook: load the process list when the Processes tab becomes active, and
// expose a sorted + filtered view without duplicating logic in components.

import { useMemo } from 'react';

import { useProcessStore } from '../store/processStore';
import type { ProcessInfo, SortKey } from '../types/process';

/** Sort and filter the raw process list according to current store state. */
function applySort(
  processes: ProcessInfo[],
  sortKey: SortKey,
  sortAsc: boolean,
  searchQuery: string
): ProcessInfo[] {
  // Apply search filter first (case-insensitive name match)
  const filtered = searchQuery
    ? processes.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : processes;

  // Sort in-place on a copy so the store array stays stable
  return [...filtered].sort((a, b) => {
    let diff: number;
    switch (sortKey) {
      case 'name':
        diff = a.name.localeCompare(b.name);
        break;
      case 'pid':
        diff = a.pid - b.pid;
        break;
      case 'memory_bytes':
        diff = a.memory_bytes - b.memory_bytes;
        break;
      case 'cpu_usage':
      default:
        diff = a.cpu_usage - b.cpu_usage;
    }
    return sortAsc ? diff : -diff;
  });
}

export function useProcesses() {
  const {
    processes,
    sortKey,
    sortAsc,
    searchQuery,
    isLoading,
    fetchProcesses,
    killProcess,
    killProcessElevated,
    setSort,
    setSearch,
  } = useProcessStore();

  // Memoize the sorted+filtered list — only recomputes when inputs change
  const visible = useMemo(
    () => applySort(processes, sortKey, sortAsc, searchQuery),
    [processes, sortKey, sortAsc, searchQuery]
  );

  return {
    processes: visible,
    totalCount: processes.length,
    sortKey,
    sortAsc,
    searchQuery,
    isLoading,
    fetchProcesses,
    killProcess,
    killProcessElevated,
    setSort,
    setSearch,
  };
}
