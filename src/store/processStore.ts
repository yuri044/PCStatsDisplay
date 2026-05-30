// Zustand store for the process list panel.
//
// Manages fetching, sorting, filtering, and killing processes.
// All Tauri IPC calls are encapsulated here so components stay simple.

import { invoke } from '@tauri-apps/api/core';
import { create } from 'zustand';

import type { KillResult, ProcessInfo, SortKey } from '../types/process';

interface ProcessStore {
  processes: ProcessInfo[];
  sortKey: SortKey;
  /** true = ascending, false = descending */
  sortAsc: boolean;
  searchQuery: string;
  isLoading: boolean;

  /** Fetch a fresh process snapshot from Rust */
  fetchProcesses: () => Promise<void>;
  /** Attempt to kill a process; returns whether elevation is needed */
  killProcess: (pid: number) => Promise<{ requiresElevation: boolean; message: string }>;
  /** Kill via UAC-elevated helper (triggers Windows UAC prompt) */
  killProcessElevated: (pid: number) => Promise<void>;
  setSort: (key: SortKey) => void;
  setSearch: (query: string) => void;
}

export const useProcessStore = create<ProcessStore>((set, get) => ({
  processes: [],
  sortKey: 'cpu_usage',
  sortAsc: false,
  searchQuery: '',
  isLoading: false,

  fetchProcesses: async () => {
    set({ isLoading: true });
    try {
      const list = await invoke<ProcessInfo[]>('get_process_list');
      set({ processes: list });
    } finally {
      set({ isLoading: false });
    }
  },

  killProcess: async (pid: number) => {
    const result = await invoke<KillResult>('kill_process', { pid });

    if (result.success) {
      // Optimistically remove the process from the list
      set((s) => ({ processes: s.processes.filter((p) => p.pid !== pid) }));
    }

    return {
      requiresElevation: result.requires_elevation,
      message: result.message,
    };
  },

  killProcessElevated: async (pid: number) => {
    // This spawns elevated-helper.exe via ShellExecuteW "runas" (UAC prompt)
    await invoke('kill_process_elevated', { pid });
    // After elevation kill, refetch so the list reflects the change
    await get().fetchProcesses();
  },

  setSort: (key: SortKey) =>
    set((s) => ({
      sortKey: key,
      // Toggle direction if clicking the same column; default to descending for new column
      sortAsc: s.sortKey === key ? !s.sortAsc : false,
    })),

  setSearch: (query: string) => set({ searchQuery: query }),
}));
