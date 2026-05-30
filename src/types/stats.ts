// TypeScript mirrors of the Rust structs in src-tauri/src/stats/types.rs.
// Field names must stay in snake_case to match serde's default serialization.

export interface SystemStats {
  cpu: CpuStats;
  memory: MemoryStats;
  /** null when no supported GPU is detected */
  gpu: GpuStats | null;
  disks: DiskStats[];
  network: NetworkStats;
  /** Unix timestamp in milliseconds */
  timestamp: number;
}

export interface CpuStats {
  /** Overall utilisation across all cores, 0.0–100.0 */
  usage_total: number;
  /** Per-logical-core utilisation */
  usage_per_core: number[];
  /** Average frequency in MHz */
  frequency_mhz: number;
  /** Package temperature in °C; null if the sensor is inaccessible */
  temperature_c: number | null;
  /** Brand string e.g. "AMD Ryzen 9 7950X" */
  name: string;
}

export interface MemoryStats {
  used_bytes: number;
  total_bytes: number;
  /** Pre-computed percentage, 0–100 */
  used_percent: number;
  swap_used_bytes: number;
  swap_total_bytes: number;
}

export interface GpuStats {
  name: string;
  /** Shader/compute engine utilisation, 0–100 */
  usage_percent: number;
  vram_used_bytes: number;
  vram_total_bytes: number;
  temperature_c: number;
  /** null if the GPU doesn't expose a power sensor */
  power_watts: number | null;
}

export interface DiskStats {
  name: string;
  mount_point: string;
  used_bytes: number;
  total_bytes: number;
  read_bytes_per_sec: number;
  write_bytes_per_sec: number;
}

export interface NetworkStats {
  upload_bytes_per_sec: number;
  download_bytes_per_sec: number;
  interface_name: string;
}
