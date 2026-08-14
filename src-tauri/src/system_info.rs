// System identity command — OS, host, uptime, and CPU model for the
// neofetch-style banner shown when the Terminal tab opens.
//
// Reads from the shared Mutex<System> (already kept refreshed by the
// background poller in stats/collector.rs) rather than constructing a new
// System, same pattern as process::list::get_process_list.

use std::sync::Mutex;

use serde::Serialize;
use sysinfo::System;
use tauri::{command, State};

#[derive(Serialize)]
pub struct SystemInfo {
    os_name: String,
    host_name: String,
    username: String,
    uptime_seconds: u64,
    cpu_model: String,
    cpu_cores: usize,
    cpu_max_freq_mhz: u64,
}

/// Return a snapshot of OS/host/CPU identity info.
/// Invoked from React via: invoke<SystemInfo>('get_system_info')
#[command]
pub fn get_system_info(state: State<'_, Mutex<System>>) -> SystemInfo {
    let sys = state.lock().expect("system info sys lock poisoned");

    // host_name/long_os_version are associated functions — no live instance
    // needed, unlike CPU data below which reads off the refreshed instance.
    let os_name = System::long_os_version().unwrap_or_else(|| "Unknown OS".to_string());
    let host_name = System::host_name().unwrap_or_else(|| "Unknown Host".to_string());
    let uptime_seconds = System::uptime();

    let username = std::env::var("USERNAME").unwrap_or_else(|_| "user".to_string());

    let cpu_model = sys
        .cpus()
        .first()
        .map(|c| c.brand().to_string())
        .unwrap_or_else(|| "Unknown CPU".to_string());
    let cpu_cores = sys.cpus().len();
    let cpu_max_freq_mhz = sys.cpus().iter().map(|c| c.frequency()).max().unwrap_or(0);

    SystemInfo {
        os_name,
        host_name,
        username,
        uptime_seconds,
        cpu_model,
        cpu_cores,
        cpu_max_freq_mhz,
    }
}
