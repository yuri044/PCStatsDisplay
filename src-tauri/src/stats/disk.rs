// Disk statistics collector.
//
// sysinfo's Disk struct provides space info (total / available).
// I/O throughput (bytes/sec) is read straight from a Windows performance
// counter (aggregate across all physical disks) instead of summing
// per-process disk_usage() — that avoids forcing a full process-table
// refresh every tick just to answer a system-wide question. Non-Windows
// targets fall back to the process-aggregation approach.

use sysinfo::{Disks, System};

use super::types::DiskStats;

/// Collect disk stats.
/// - Space info comes from `disks` (sysinfo Disks list, already refreshed).
/// - I/O rates are the aggregate system-wide read/write throughput.
pub fn collect(disks: &Disks, sys: &System) -> Vec<DiskStats> {
    let (read_bytes_per_sec, write_bytes_per_sec) = collect_io_rates(sys);

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

/// Aggregate system-wide disk read/write throughput in bytes/sec.
/// Reads the `_Total` row of the PhysicalDisk perf counter, which Windows
/// already maintains and formats as a per-second rate — no per-process
/// enumeration needed.
#[cfg(windows)]
fn collect_io_rates(_sys: &System) -> (u64, u64) {
    use serde::Deserialize;
    use std::cell::OnceCell;
    use wmi::{COMLibrary, WMIConnection};

    #[derive(Deserialize)]
    #[allow(non_snake_case)]
    struct DiskIoTotal {
        DiskReadBytesPersec: Option<u64>,
        DiskWriteBytesPersec: Option<u64>,
    }

    // Per-thread WMI connection (initialized once, reused every tick) — mirrors
    // the pattern in gpu.rs's collect_wmi().
    thread_local! {
        static WMI: OnceCell<Option<WMIConnection>> = OnceCell::new();
    }

    WMI.with(|cell| {
        let con = cell.get_or_init(|| {
            let com = COMLibrary::new()
                .or_else(|_| COMLibrary::without_security())
                .ok()?;
            WMIConnection::new(com.into()).ok()
        });

        let wmi = match con.as_ref() {
            Some(wmi) => wmi,
            None => return (0, 0),
        };

        wmi.raw_query::<DiskIoTotal>(
            "SELECT DiskReadBytesPersec, DiskWriteBytesPersec \
             FROM Win32_PerfFormattedData_PerfDisk_PhysicalDisk \
             WHERE Name = '_Total'",
        )
        .unwrap_or_default()
        .into_iter()
        .next()
        .map(|t| {
            (
                t.DiskReadBytesPersec.unwrap_or(0),
                t.DiskWriteBytesPersec.unwrap_or(0),
            )
        })
        .unwrap_or((0, 0))
    })
}

/// Non-Windows fallback: sum `read_bytes` / `written_bytes` deltas across all
/// processes for this 500ms window (requires `sys` to have been refreshed
/// with `refresh_processes()` by the caller).
#[cfg(not(windows))]
fn collect_io_rates(sys: &System) -> (u64, u64) {
    const POLL_INTERVAL_MS: f64 = 500.0;

    let (total_read, total_write) = sys.processes().values().fold((0u64, 0u64), |(r, w), p| {
        let usage = p.disk_usage();
        (r + usage.read_bytes, w + usage.written_bytes)
    });

    let factor = 1000.0 / POLL_INTERVAL_MS;
    (
        (total_read as f64 * factor) as u64,
        (total_write as f64 * factor) as u64,
    )
}
