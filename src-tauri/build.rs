// Tauri's build script: generates the invoke bindings and embeds tauri.conf.json.
// On Windows this also embeds the app manifest so WebView2 is correctly requested.
fn main() {
    tauri_build::build()
}
