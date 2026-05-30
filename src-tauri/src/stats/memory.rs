// Memory statistics collector.
// Reads RAM and swap usage directly from the sysinfo System struct.

use sysinfo::System;

use super::types::MemoryStats;

/// Collect memory stats from an already-refreshed sysinfo System.
/// `sys` must have been refreshed with `refresh_memory()` before calling this.
pub fn collect(sys: &System) -> MemoryStats {
    let used_bytes = sys.used_memory();
    let total_bytes = sys.total_memory();

    // Pre-compute the percentage so the React hot path stays simple
    let used_percent = if total_bytes > 0 {
        (used_bytes as f32 / total_bytes as f32) * 100.0
    } else {
        0.0
    };

    MemoryStats {
        used_bytes,
        total_bytes,
        used_percent,
        swap_used_bytes: sys.used_swap(),
        swap_total_bytes: sys.total_swap(),
    }
}
