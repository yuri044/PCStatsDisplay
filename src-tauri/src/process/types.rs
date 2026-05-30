// Shared types for the process management layer.

use serde::{Deserialize, Serialize};

/// Information about a single running process, returned by get_process_list.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ProcessInfo {
    pub pid: u32,
    pub name: String,
    /// CPU usage percentage for this process (0.0–100.0)
    pub cpu_usage: f32,
    /// Resident memory usage in bytes
    pub memory_bytes: u64,
    /// Human-readable process state
    pub status: String,
    /// PID of the parent process, if any
    pub parent_pid: Option<u32>,
    /// Full path to the executable on disk
    pub exe_path: String,
}

/// Result of a kill attempt, returned to the frontend so it can decide next steps.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct KillResult {
    pub success: bool,
    /// Human-readable outcome message for toasts
    pub message: String,
    /// True when the process exists but our token has insufficient privilege.
    /// The frontend uses this to offer "Retry as Administrator".
    pub requires_elevation: bool,
}
