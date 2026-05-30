// Elevated helper binary.
//
// This is a minimal standalone CLI tool invoked by the main PC Monitor app
// via ShellExecuteW "runas" when a process kill requires administrator rights.
// The UAC prompt is triggered by the "runas" verb — this binary itself just
// calls sysinfo to kill the target PID and exits immediately.
//
// Usage: elevated-helper.exe <PID>
//
// Exit codes:
//   0  — process terminated successfully
//   1  — bad arguments, process not found, or kill failed

use sysinfo::{Pid, ProcessesToUpdate, System};

fn main() {
    let args: Vec<String> = std::env::args().collect();

    // Expect exactly one argument: the PID to terminate
    if args.len() < 2 {
        eprintln!("Usage: elevated-helper <PID>");
        std::process::exit(1);
    }

    let pid: u32 = match args[1].trim().parse() {
        Ok(n) => n,
        Err(_) => {
            eprintln!("Invalid PID: {}", args[1]);
            std::process::exit(1);
        }
    };

    // Build a fresh System snapshot so we can locate the process
    let mut sys = System::new();
    sys.refresh_processes(ProcessesToUpdate::All);

    match sys.process(Pid::from(pid as usize)) {
        None => {
            eprintln!("Process {} not found", pid);
            std::process::exit(1);
        }
        Some(process) => {
            if process.kill() {
                println!("Process {} terminated", pid);
                std::process::exit(0);
            } else {
                // Even with elevation we can't kill SYSTEM-protected processes
                eprintln!("Failed to terminate process {} (SYSTEM-protected?)", pid);
                std::process::exit(1);
            }
        }
    }
}
