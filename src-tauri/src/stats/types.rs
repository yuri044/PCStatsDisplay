// Shared data types for the stats layer.
// All structs must derive Serialize so they can cross the Tauri IPC boundary to React.
// Field names use snake_case — serde serializes them as-is, and the TypeScript types mirror them exactly.

use serde::{Deserialize, Serialize};

/// Top-level snapshot emitted every 500ms as the "stats-update" Tauri event.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SystemStats {
    pub cpu: CpuStats,
    pub memory: MemoryStats,
    /// None when no supported GPU is detected (AMD, integrated, or no NVIDIA driver)
    pub gpu: Option<GpuStats>,
    pub disks: Vec<DiskStats>,
    pub network: NetworkStats,
    /// Unix timestamp in milliseconds — lets the frontend detect stale data
    pub timestamp: u64,
}

/// CPU statistics for the whole socket plus per-core breakdown.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CpuStats {
    /// Overall utilisation across all cores, 0.0–100.0
    pub usage_total: f32,
    /// Per-logical-core utilisation, same range
    pub usage_per_core: Vec<f32>,
    /// Average clock frequency of all cores in MHz
    pub frequency_mhz: u64,
    /// Package temperature in °C; None if the sensor isn't readable
    /// (Windows may need Open Hardware Monitor driver for this)
    pub temperature_c: Option<f32>,
    /// Brand string, e.g. "AMD Ryzen 9 7950X"
    pub name: String,
}

/// System RAM and swap statistics.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct MemoryStats {
    pub used_bytes: u64,
    pub total_bytes: u64,
    /// Pre-computed percentage to avoid floating-point in the frontend hot path
    pub used_percent: f32,
    pub swap_used_bytes: u64,
    pub swap_total_bytes: u64,
}

/// NVIDIA GPU statistics (requires nvidia feature + installed driver).
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct GpuStats {
    pub name: String,
    /// Shader/compute engine utilisation, 0–100
    pub usage_percent: u32,
    pub vram_used_bytes: u64,
    pub vram_total_bytes: u64,
    /// Die temperature in °C; None when read via WMI (requires sensor driver)
    pub temperature_c: Option<u32>,
    /// Board power in watts; None if the GPU doesn't expose a power sensor
    pub power_watts: Option<f32>,
}

/// Per-mount-point disk space (I/O rates derived from process aggregation).
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct DiskStats {
    /// Device name, e.g. "sda" or "NVMe"
    pub name: String,
    /// Mount point, e.g. "C:\" on Windows or "/home" on Linux
    pub mount_point: String,
    pub used_bytes: u64,
    pub total_bytes: u64,
    /// Bytes read per second across all processes (sampled each 500ms tick)
    pub read_bytes_per_sec: u64,
    /// Bytes written per second across all processes
    pub write_bytes_per_sec: u64,
}

/// Network bandwidth for the most-active non-loopback interface.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct NetworkStats {
    /// Upload speed in bytes/second since last refresh
    pub upload_bytes_per_sec: u64,
    /// Download speed in bytes/second since last refresh
    pub download_bytes_per_sec: u64,
    /// Interface name, e.g. "Ethernet" or "Wi-Fi"
    pub interface_name: String,
}
