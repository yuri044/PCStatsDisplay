import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Vite config tuned for Tauri 2 dev workflow.
// The internal dev server runs on 1420 (matches tauri.conf.json devUrl).
export default defineConfig({
  plugins: [react(), tailwindcss()],

  // Suppress Vite's own browser-open behavior — Tauri opens the WebView instead
  clearScreen: false,

  server: {
    port: 1420,
    strictPort: true,
    watch: {
      // Don't watch src-tauri — Rust changes are handled by cargo
      ignored: ["**/src-tauri/**"],
    },
  },
});
