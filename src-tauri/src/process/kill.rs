// Process termination commands.
//
// Two paths:
//   kill_process      — standard user-level kill via sysinfo (most processes)
//   kill_process_elevated — spawns elevated-helper.exe via ShellExecute "runas"
//                           which triggers a UAC prompt to gain admin rights

use sysinfo::{Pid, System};
use tauri::command;

use super::types::KillResult;

/// Attempt to terminate the process with the given PID using our current token.
/// Returns KillResult so the frontend can decide whether to offer elevation.
#[command]
pub fn kill_process(pid: u32) -> KillResult {
    let mut sys = System::new();
    sys.refresh_processes();

    match sys.process(Pid::from(pid as usize)) {
        None => KillResult {
            success: false,
            message: format!("Process {} not found", pid),
            requires_elevation: false,
        },
        Some(process) => {
            if process.kill() {
                KillResult {
                    success: true,
                    message: format!("Process {} terminated", pid),
                    requires_elevation: false,
                }
            } else {
                // Kill failed — most commonly because the process runs with a higher
                // privilege token (admin or SYSTEM) than our own process
                KillResult {
                    success: false,
                    message: "Access denied — process may require administrator rights".to_string(),
                    requires_elevation: true,
                }
            }
        }
    }
}

/// Spawn the separate elevated-helper binary via PowerShell "Start-Process -Verb RunAs"
/// which triggers a UAC prompt.  Only implemented on Windows.
#[command]
pub fn kill_process_elevated(pid: u32) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let helper = elevated_helper_path();

        // PowerShell Start-Process with -Verb RunAs triggers UAC elevation.
        // -WindowStyle Hidden keeps the helper console invisible.
        let script = format!(
            "Start-Process -FilePath '{}' -ArgumentList '{}' -Verb RunAs -WindowStyle Hidden",
            helper, pid
        );

        std::process::Command::new("powershell")
            .args(["-NoProfile", "-NonInteractive", "-Command", &script])
            .spawn()
            .map_err(|e| format!("Failed to spawn PowerShell: {}", e))?;

        Ok(())
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = pid;
        Err("Elevated kill is only supported on Windows".to_string())
    }
}

/// Resolve the path to elevated-helper.exe sitting next to the main executable.
fn elevated_helper_path() -> String {
    std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|dir| dir.join("elevated-helper.exe")))
        .map(|p| p.to_string_lossy().into_owned())
        .unwrap_or_else(|| "elevated-helper.exe".to_string())
}
