# PC Stats Monitor

A compact, always-on-top desktop overlay for real-time hardware monitoring and process management. Built with **Tauri 2**, **Rust**, and **React 19**.

## ⚡ Features

- **Real-time Monitoring**: Live tracking of CPU, RAM, GPU, Temperatures, Network, and Disk activity.
- **Process Manager**: View running processes with the ability to terminate standard or elevated processes (via UAC prompt).
- **Always-on-Top**: A toggleable overlay that stays visible while you work or game.
- **System Tray Integration**: Minimize to tray, toggle visibility, and quick-access controls.
- **Performance Focused**: Minimal footprint (< 1% CPU idle target) using optimized Rust background polling.
- **Custom UI**: Frameless, modern interface with high-refresh-rate sparklines and customizable opacity.

## 🏗️ Architecture

The application follows a two-process model:

1.  **Rust Backend (Core)**: 
    - Uses `sysinfo` and `nvml-wrapper` to gather hardware metrics.
    - Runs a `StatsCollector` background thread that emits updates every 500ms.
    - Handles OS-level operations like process termination and autostart configuration.
2.  **React Frontend (UI)**:
    - Rendered in a Tauri WebView.
    - Uses **Zustand** for state management (Stats, Processes, and Settings stores).
    - Subscribes to Rust events for real-time UI updates without polling from the frontend.

### Privilege Tiers
- **Standard**: Processes killed directly via the Tauri process.
- **Elevated**: Requires the `elevated-helper` binary, which triggers a Windows UAC prompt to gain necessary permissions.
- **System**: Protected processes are identified and cannot be terminated by the app.

## 🚀 Getting Started

### Prerequisites
- Rust (stable)
- Node.js (LTS)
- Windows Build Tools (for `sysinfo` and `webview2`)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd PCStatsMonitor
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run in development mode:
   ```bash
   npm run tauri dev
   ```

### Building

To create a production-ready installer:
```bash
npm run tauri build
```

To build the elevated helper specifically:
```bash
cd elevated-helper && cargo build --release
```

## 🛠️ Project Structure

- `src/`: React frontend (Typescript).
  - `components/`: UI components (TitleBar, Stats panels, etc).
  - `store/`: Zustand state management.
  - `hooks/`: Custom hooks for IPC and event subscription.
- `src-tauri/`: Rust backend.
  - `src/stats/`: Logic for hardware data collection.
  - `src/process/`: Process listing and killing logic.
  - `src/window/`: Tray and window management (AOT, Opacity).
- `elevated-helper/`: Separate Rust CLI tool for administrative tasks.

## 📝 Implementation Notes

- **CPU Accuracy**: The monitor requires two refresh cycles before CPU usage readings are accurate (delta-based).
- **GPU Support**: Supports NVIDIA (NVML) with WMI fallbacks for AMD/Integrated graphics.
- **Fullscreen Games**: Note that "Always on Top" may not work over certain exclusive-mode fullscreen games due to Windows OS limitations.

---
*Built with ❤️ using Tauri.*