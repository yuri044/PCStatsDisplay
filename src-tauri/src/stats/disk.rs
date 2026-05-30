// Disk statistics collector.
//
// sysinfo's Disk struct provides space info (total / available).
// For I/O rates we aggregate process-level disk_usage() across all running
// processes, which gives bytes read/written since the last sysinfo refresh.
// Dividing by the 500ms poll interval converts that to bytes/sec.

use sysinfo::{Disks, System};

use super::types::DiskStats;

/// The poll interval used by the stats collector (milliseconds).
/// Must match the sleep duration in collector.rs.
const POLL_INTERVAL_MS: f64 = 500.0;

/// Collect disk stats.
/// - Space info comes from `disks` (sysinfo Disks list, already refreshed).
/// - I/O rates are computed from per-process delta bytes in `sys`.
pub fn collect(disks: &Disks, sys: &System) -> Vec<DiskStats> {
    // Aggregate system-wide I/O by summing all process deltas for this tick
    let (total_read, total_write) = aggregate_process_io(sys);
    let bytes_per_ms = POLL_INTERVAL_MS;

    // Convert bytes-per-interval to bytes-per-second
    let read_bytes_per_sec = ((total_read as f64 / bytes_per_ms) * 1000.0) as u64;
    let write_bytes_per_sec = ((total_write as f64 / bytes_per_ms) * 1000.0) as u64;

    disks
        .list()
        .iter()
        .map(|disk| {
            let total = disk.total_space();
            let available = disk.available_space();
            let used = total.saturating_sub(available);

            DiskStats {
                name: disk.name().to_string_lossy().into_owned(),
                mount_point: disk.mount_point().to_string_lossy().into_owned(),
                used_bytes: used,
                total_bytes: total,
                // I/O rates are shown for the first disk; future versions can break them out per-disk
                read_bytes_per_sec,
                write_bytes_per_sec,
            }
        })
        .collect()
}

/// Sum `read_bytes` and `written_bytes` across all processes for this 500ms window.
/// These are delta values — bytes since the last sysinfo process refresh, not totals.
fn aggregate_process_io(sys: &System) -> (u64, u64) {
    sys.processes().values().fold((0u64, 0u64), |(r, w), p| {
        let usage = p.disk_usage();
        (r + usage.read_bytes, w + usage.written_bytes)
    })
}
