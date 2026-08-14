// TypeScript mirror of the Rust struct in src-tauri/src/system_info.rs.
// Field names must stay in snake_case to match serde's default serialization.

export interface SystemInfo {
  os_name: string;
  host_name: string;
  username: string;
  uptime_seconds: number;
  cpu_model: string;
  cpu_cores: number;
  cpu_max_freq_mhz: number;
}
