// CPU statistics collector.
// Uses sysinfo for usage and frequency; temperature is collected via sysinfo Components
// which maps to OS hardware sensors (requires appropriate drivers on Windows).
//
// NOTE on temperature cadence: on Windows, sysinfo's Components::refresh_list()
// does a full COM/WMI round trip on every call (CoInitializeEx, ConnectServer,
// ExecQuery against MSAcpi_ThermalZoneTemperature) — there's no cheaper
// "refresh in place" available from the library, so holding a persistent
// Components instance wouldn't reduce cost. Instead, the caller (collector.rs)
// throttles how often read_temperature() is invoked, since temperature doesn't
// need 500ms resolution.

use sysinfo::{Components, System};

use super::types::CpuStats;

/// Collect CPU stats from an already-refreshed sysinfo System.
/// `sys` must have been refreshed with `refresh_cpu_all()` before calling this.
/// `temperature_c` is supplied by the caller (see module docs on cadence)
/// rather than read internally on every call.
pub fn collect(sys: &System, temperature_c: Option<f32>) -> CpuStats {
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
///
/// Expensive on Windows (see module docs) — callers should throttle how often
/// this is invoked rather than calling it on every poll tick.
pub fn read_temperature() -> Option<f32> {
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
