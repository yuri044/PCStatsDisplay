// Process enumeration command.
//
// get_process_list is a synchronous Tauri command that creates a fresh
// sysinfo System, refreshes only process data, and returns a snapshot.
// It is invoked on-demand (not on every 500ms tick) to keep overhead low.

use sysinfo::System;
use tauri::command;

use super::types::ProcessInfo;

/// Return a snapshot of all currently-running processes with CPU, RAM, and status.
/// Invoked from React via: invoke<ProcessInfo[]>('get_process_list')
#[command]
pub fn get_process_list() -> Vec<ProcessInfo> {
    let mut sys = System::new();

    // Two refreshes so CPU usage deltas are non-zero
    sys.refresh_processes();
    // Small sleep between two refreshes for accurate CPU snapshot
    std::thread::sleep(std::time::Duration::from_millis(100));
    sys.refresh_processes();

    sys.processes()
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
        .collect()
}
