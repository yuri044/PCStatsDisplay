// Network bandwidth collector.
//
// sysinfo's NetworkData.received() / transmitted() return bytes transferred
// since the last refresh — at 500ms intervals that gives us bytes/tick, which
// we convert to bytes/second.
//
// We pick the single "most active" non-loopback interface (highest combined
// throughput) as the representative interface for display.

use sysinfo::Networks;

use super::types::NetworkStats;

/// The poll interval used by the stats collector (milliseconds).
const POLL_INTERVAL_MS: f64 = 500.0;

/// Collect network stats from an already-refreshed sysinfo Networks list.
pub fn collect(networks: &Networks) -> NetworkStats {
    // Find the non-loopback interface with the most combined traffic this tick
    let best = networks
        .iter()
        .filter(|(name, _)| !is_loopback(name))
        .max_by_key(|(_, data)| data.received() + data.transmitted());

    match best {
        Some((name, data)) => {
            // Convert bytes/tick to bytes/sec
            let factor = 1000.0 / POLL_INTERVAL_MS;
            NetworkStats {
                upload_bytes_per_sec: (data.transmitted() as f64 * factor) as u64,
                download_bytes_per_sec: (data.received() as f64 * factor) as u64,
                interface_name: name.clone(),
            }
        }
        // All interfaces are loopback or the list is empty
        None => NetworkStats {
            upload_bytes_per_sec: 0,
            download_bytes_per_sec: 0,
            interface_name: "N/A".to_string(),
        },
    }
}

/// Heuristic loopback check — covers "lo", "Loopback", "lo0", etc.
fn is_loopback(name: &str) -> bool {
    let lower = name.to_lowercase();
    lower == "lo" || lower.starts_with("loopback") || lower.starts_with("lo0")
}
