// GPU statistics collector.
//
// Priority:
//   1. NVML (nvidia feature) — richest data: temp, power, accurate VRAM
//   2. WMI (Windows only)   — covers AMD, Intel integrated, and NVIDIA when
//      Optimus has suspended the discrete GPU (NVML init fails silently)
//
// Returns None only when both paths fail (no recognisable GPU found).

use super::types::GpuStats;

pub fn collect() -> Option<GpuStats> {
    // Backend-selection logging: collect() runs every 500ms, so each of these
    // fires exactly once per process lifetime instead of spamming the log.
    #[cfg(feature = "nvidia")]
    static NVML_UNAVAILABLE: std::sync::Once = std::sync::Once::new();
    #[cfg(windows)]
    static WMI_ACTIVE: std::sync::Once = std::sync::Once::new();
    static NO_GPU: std::sync::Once = std::sync::Once::new();

    // NVML gives the richest data for NVIDIA.  Falls through on any failure
    // (Optimus idle, driver not loaded, etc.).
    #[cfg(feature = "nvidia")]
    if let Some(stats) = collect_nvidia() {
        return Some(stats);
    } else {
        NVML_UNAVAILABLE
            .call_once(|| tracing::warn!("GPU NVML unavailable — trying WMI fallback"));
    }

    // WMI covers AMD, Intel integrated, and NVIDIA when NVML is unavailable.
    #[cfg(windows)]
    {
        let stats = collect_wmi();
        match &stats {
            Some(s) => WMI_ACTIVE
                .call_once(|| tracing::info!(name = %s.name, "GPU WMI fallback active")),
            None => NO_GPU
                .call_once(|| tracing::warn!("No GPU detected — hiding GPU section")),
        }
        return stats;
    }

    #[allow(unreachable_code)]
    {
        NO_GPU.call_once(|| tracing::warn!("No GPU detected — hiding GPU section"));
        None
    }
}

// ── NVIDIA path ───────────────────────────────────────────────────────────────

#[cfg(feature = "nvidia")]
fn collect_nvidia() -> Option<GpuStats> {
    use nvml_wrapper::{enum_wrappers::device::TemperatureSensor, Nvml};

    let nvml = Nvml::init().ok()?;
    let device = nvml.device_by_index(0).ok()?;

    let name = device.name().ok()?;
    let utilization = device.utilization_rates().ok()?;
    let memory = device.memory_info().ok()?;
    let temperature = device.temperature(TemperatureSensor::Gpu).ok()?;
    let power_watts = device.power_usage().ok().map(|mw| mw as f32 / 1000.0);

    Some(GpuStats {
        name,
        usage_percent: utilization.gpu,
        vram_used_bytes: memory.used,
        vram_total_bytes: memory.total,
        temperature_c: Some(temperature),
        power_watts,
    })
}

// ── Windows WMI fallback ──────────────────────────────────────────────────────

#[cfg(windows)]
fn collect_wmi() -> Option<GpuStats> {
    use serde::Deserialize;
    use std::cell::OnceCell;
    use wmi::{COMLibrary, WMIConnection};

    // ── WMI struct definitions ─────────────────────────────────────────────
    #[derive(Deserialize)]
    #[allow(non_snake_case)]
    struct VideoController {
        Name: String,
        // uint32 in WMI schema — overflows for GPUs > 4 GB; see vram_total note below
        AdapterRAM: Option<u32>,
    }

    #[derive(Deserialize)]
    #[allow(non_snake_case)]
    struct GpuEngine {
        Name: String,
        UtilizationPercentage: Option<u64>,
    }

    #[derive(Deserialize)]
    #[allow(non_snake_case)]
    struct GpuLocalMem {
        LocalMemoryUsage: Option<u64>,
    }

    // ── Per-thread WMI connection (initialized once, reused every 500 ms) ──
    thread_local! {
        static WMI: OnceCell<Option<WMIConnection>> = OnceCell::new();
        // GPU name + VRAM total are static hardware facts that never change at
        // runtime — queried once and cached instead of re-hitting WMI every tick.
        static STATIC_INFO: OnceCell<Option<(String, u64)>> = OnceCell::new();
    }

    WMI.with(|cell| {
        let con = cell.get_or_init(|| {
            // CoInitializeSecurity can only be called once per process; if
            // Tauri already called it, fall back to without_security().
            let com = COMLibrary::new()
                .or_else(|_| COMLibrary::without_security())
                .ok()?;
            WMIConnection::new(com.into()).ok()
        });

        let wmi = con.as_ref()?;

        // ── GPU name + rough VRAM total (queried once, then cached) ────────
        let (name, vram_total) = STATIC_INFO
            .with(|info| {
                info.get_or_init(|| {
                    let controllers: Vec<VideoController> = wmi
                        .raw_query("SELECT Name, AdapterRAM FROM Win32_VideoController")
                        .unwrap_or_default();

                    // Prefer discrete GPU; skip virtual / remote / Microsoft adapters
                    controllers.into_iter().find_map(|c| {
                        let n = c.Name.to_lowercase();
                        let ram = c.AdapterRAM.unwrap_or(0);
                        (!n.contains("virtual") && !n.contains("remote") && !n.contains("microsoft") && ram > 0)
                            .then(|| (c.Name, ram as u64))
                    })
                })
                .clone()
            })?;

        // ── 3-D engine utilisation (highest across all adapters) ───────────
        let usage_percent: u32 = wmi
            .raw_query::<GpuEngine>(
                "SELECT Name, UtilizationPercentage \
                 FROM Win32_PerfFormattedData_GPUPerformanceCounters_GPUEngine",
            )
            .unwrap_or_default()
            .into_iter()
            .filter(|e| e.Name.contains("engtype_3D"))
            .filter_map(|e| e.UtilizationPercentage.map(|v| v as u32))
            .max()
            .unwrap_or(0);

        // ── Dedicated VRAM in use (bytes) ──────────────────────────────────
        let vram_used: u64 = wmi
            .raw_query::<GpuLocalMem>(
                "SELECT LocalMemoryUsage \
                 FROM Win32_PerfFormattedData_GPUPerformanceCounters_GPULocalAdapterMemory",
            )
            .unwrap_or_default()
            .into_iter()
            .filter_map(|m| m.LocalMemoryUsage)
            .max()
            .unwrap_or(0);

        // AdapterRAM is uint32 so it saturates at ~4 GB for 6/8 GB cards.
        // For vram_used the perf counter is accurate; total is best-effort.
        Some(GpuStats {
            name,
            usage_percent,
            vram_used_bytes: vram_used,
            vram_total_bytes: vram_total,
            temperature_c: None, // WMI has no standard GPU temp without sensor drivers
            power_watts: None,
        })
    })
}
