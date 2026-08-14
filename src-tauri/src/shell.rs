use serde::{Deserialize, Serialize};
use std::process::Command;
use std::os::windows::process::CommandExt;

// CREATE_NO_WINDOW flag to prevent popping up a console window
const CREATE_NO_WINDOW: u32 = 0x08000000;

#[derive(Debug, Serialize, Deserialize)]
pub struct CommandResult {
    pub stdout: String,
    pub stderr: String,
    pub success: bool,
    pub code: Option<i32>,
}

#[tauri::command]
pub async fn execute_shell_command(command: String) -> Result<CommandResult, String> {
    tracing::info!(command = %command, "Executing shell command");

    // We use powershell as the default shell for Windows
    let output = Command::new("powershell")
        .args(["-NoProfile", "-Command", &command])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| format!("Failed to spawn process: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    Ok(CommandResult {
        stdout,
        stderr,
        success: output.status.success(),
        code: output.status.code(),
    })
}
