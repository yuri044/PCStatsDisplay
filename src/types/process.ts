// TypeScript mirrors of the Rust structs in src-tauri/src/process/types.rs.

export interface ProcessInfo {
  pid: number;
  name: string;
  /** CPU usage percentage for this process, 0.0–100.0 */
  cpu_usage: number;
  /** Resident memory in bytes */
  memory_bytes: number;
  /** Human-readable process state string */
  status: string;
  /** Parent PID; null for root-level processes */
  parent_pid: number | null;
  /** Full path to the executable */
  exe_path: string;
}

export interface KillResult {
  success: boolean;
  message: string;
  /** True when kill failed because we need administrator rights */
  requires_elevation: boolean;
}

/** Column keys available for sorting the process table */
export type SortKey = 'cpu_usage' | 'memory_bytes' | 'name' | 'pid';
