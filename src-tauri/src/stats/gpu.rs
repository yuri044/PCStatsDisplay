// GPU statistics collector.
//
// This module compiles unconditionally but only produces data when:
//   - The "nvidia" Cargo feature is enabled (adds nvml-wrapper dependency), AND
//   - An NVIDIA driver is installed at runtime (Nvml::init() succeeds).
//
// For AMD / Intel integrated graphics the function returns None, and the
// frontend hides the GPU section gracefully.

use super::types::GpuStats;

/// Try to collect GPU stats from the first NVIDIA device.
/// Returns None on any failure — missing driver, no GPU, unsupported device.
pub fn collect() -> Option<GpuStats> {
    collect_nvidia()
}

// ── NVIDIA path (compiled only when the "nvidia" feature is enabled) ──────────

#[cfg(feature = "nvidia")]
fn collect_nvidia() -> Option<GpuStats> {
    use nvml_wrapper::{enum_wrappers::device::TemperatureSensor, Nvml};

    // Init fails gracefully if NVIDIA drivers aren't installed
    let nvml = Nvml::init().ok()?;

    // Use the first GPU (index 0); multi-GPU support can be added later
    let device = nvml.device_by_index(0).ok()?;

    let name = device.name().ok()?;
    let utilization = device.utilization_rates().ok()?;
    let memory = device.memory_info().ok()?;
    let temperature = device.temperature(TemperatureSensor::Gpu).ok()?;

    // power_usage() returns milliwatts; convert to watts for display
    let power_watts = device
        .power_usage()
        .ok()
        .map(|mw| mw as f32 / 1000.0);

    Some(GpuStats {
        name,
        usage_percent: utilization.gpu,
        vram_used_bytes: memory.used,
        vram_total_bytes: memory.total,
        temperature_c: temperature,
        power_watts,
    })
}

// ── Stub when NVIDIA feature is disabled ──────────────────────────────────────

#[cfg(not(feature = "nvidia"))]
fn collect_nvidia() -> Option<GpuStats> {
    // GPU stats are opt-in; without the feature flag we always return None.
    // To enable: cargo build --features nvidia
    None
}
