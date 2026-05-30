// CPU statistics collector.
// Uses sysinfo for usage and frequency; temperature is collected via sysinfo Components
// which maps to OS hardware sensors (requires appropriate drivers on Windows).

use sysinfo::{Components, System};

use super::types::CpuStats;

/// Collect CPU stats from an already-refreshed sysinfo System.
/// `sys` must have been refreshed with `refresh_cpu_all()` before calling this.
pub fn collect(sys: &System) -> CpuStats {
    // Per-core usage — sysinfo returns one entry per logical processor
    let usage_per_core: Vec<f32> = sys.cpus().iter().map(|c| c.cpu_usage()).collect();

    // Overall usage is the global average across all logical cores
    let usage_total = sys.global_cpu_info().cpu_usage();

    // All cores share the same brand string; fall back gracefully if none found
    let name = sys
        .cpus()
        .first()
        .map(|c| c.brand().to_string())
        .unwrap_or_else(|| "Unknown CPU".to_string());

    // Average frequency across all cores in MHz
    let frequency_mhz = if usage_per_core.is_empty() {
        0
    } else {
        let total: u64 = sys.cpus().iter().map(|c| c.frequency()).sum();
        total / sys.cpus().len() as u64
    };

    // Try to read CPU package temperature from hardware sensors.
    // On Windows this usually requires a kernel driver (e.g. OpenHardwareMonitor).
    let temperature_c = read_cpu_temperature();

    CpuStats {
        usage_total,
        usage_per_core,
        frequency_mhz,
        temperature_c,
        name,
    }
}

/// Read the CPU package temperature from sysinfo's component sensor list.
/// Returns None if no matching component is found or the reading is zero
/// (sysinfo returns 0.0 when the sensor is inaccessible).
fn read_cpu_temperature() -> Option<f32> {
    // Components require their own refresh — create a fresh list each tick.
    // This is slightly expensive but required for up-to-date readings.
    let components = Components::new_with_refreshed_list();

    for component in &components {
        let label = component.label().to_lowercase();
        // Match common CPU temperature sensor labels across vendors and OSes
        if label.contains("cpu") || label.contains("package") || label.contains("tdie") {
            let temp = component.temperature();
            if temp > 0.0 {
                return Some(temp);
            }
        }
    }
    None
}
