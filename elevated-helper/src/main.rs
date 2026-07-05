// Elevated helper binary.
//
// This is a minimal standalone CLI tool invoked by the main PC Monitor app
// via ShellExecuteW "runas" when a process kill requires administrator rights.
// The UAC prompt is triggered by the "runas" verb — this binary itself just
// calls sysinfo to kill the target PID and exits immediately.
//
// Usage: elevated-helper.exe <PID> [LOG_FILE]
//
// LOG_FILE (optional) is the main app's log file. Because the app spawns us
// fire-and-forget through PowerShell, the lines we append here are the ONLY
// record of whether the elevated kill actually succeeded — stdout/stderr go
// nowhere (the console is hidden). No tracing dependency: this process lives
// for milliseconds, a plain appended line is enough.
//
// Exit codes:
//   0  — process terminated successfully
//   1  — bad arguments, process not found, or kill failed

use std::io::Write;

use sysinfo::{Pid, System};

/// Append one timestamped line to the shared log file (same format family as
/// the main app's tracing output, tagged `elevated-helper`).
fn log_line(log_path: Option<&str>, level: &str, msg: &str) {
    let Some(path) = log_path else { return };
    if let Ok(mut file) = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(path)
    {
        let ts = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ");
        let _ = writeln!(file, "{ts} {level:>5} elevated-helper: {msg}");
    }
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let log_path = args.get(2).map(|s| s.as_str());

    // Expect at least one argument: the PID to terminate
    if args.len() < 2 {
        eprintln!("Usage: elevated-helper <PID> [LOG_FILE]");
        log_line(log_path, "ERROR", &format!("Bad arguments args={:?}", &args[1..]));
        std::process::exit(1);
    }

    let pid: u32 = match args[1].trim().parse() {
        Ok(n) => n,
        Err(_) => {
            eprintln!("Invalid PID: {}", args[1]);
            log_line(log_path, "ERROR", &format!("Bad arguments args={:?}", &args[1..]));
            std::process::exit(1);
        }
    };

    log_line(log_path, "INFO", &format!("Helper invoked pid={pid}"));

    // Build a fresh System snapshot so we can locate the process
    let mut sys = System::new();
    sys.refresh_processes();

    match sys.process(Pid::from(pid as usize)) {
        None => {
            eprintln!("Process {} not found", pid);
            log_line(log_path, "WARN", &format!("Process not found pid={pid}"));
            std::process::exit(1);
        }
        Some(process) => {
            if process.kill() {
                println!("Process {} terminated", pid);
                log_line(log_path, "INFO", &format!("Kill succeeded pid={pid}"));
                std::process::exit(0);
            } else {
                // Even with elevation we can't kill SYSTEM-protected processes
                eprintln!("Failed to terminate process {} (SYSTEM-protected?)", pid);
                log_line(
                    log_path,
                    "WARN",
                    &format!("Kill failed (SYSTEM-protected?) pid={pid}"),
                );
                std::process::exit(1);
            }
        }
    }
}
