// Process enumeration command.
//
// get_process_list is a synchronous Tauri command that reads from a
// long-lived sysinfo System (held in Tauri-managed state) rather than
// building a fresh one on every call. Reusing the same System means CPU-usage
// deltas are already meaningful from the natural gap between polls (the
// frontend calls this every 3s while the Processes tab is open), so there's
// no need to block the command thread with an artificial warm-up sleep.

use std::sync::Mutex;

use sysinfo::System;
use tauri::{command, State};

use super::types::ProcessInfo;

/// Return a snapshot of all currently-running processes with CPU, RAM, and status.
/// Invoked from React via: invoke<ProcessInfo[]>('get_process_list')
#[command]
pub fn get_process_list(state: State<'_, Mutex<System>>) -> Vec<ProcessInfo> {
    let mut sys = state.lock().expect("process list sys lock poisoned");
    sys.refresh_processes();

    let list: Vec<ProcessInfo> = sys
        .processes()
        .values()
        .map(|p| ProcessInfo {
            pid: p.pid().as_u32(),
            name: p.name().to_string(),
            cpu_usage: p.cpu_usage(),
            memory_bytes: p.memory(),
            status: format!("{:?}", p.status()),
            parent_pid: p.parent().map(|pid| pid.as_u32()),
            exe_path: p
                .exe()
                .map(|path| path.to_string_lossy().into_owned())
                .unwrap_or_default(),
        })
        .collect();

    tracing::debug!(count = list.len(), "Process list fetched");
    list
}
