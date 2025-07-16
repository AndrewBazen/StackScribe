import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";

const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [svgr(), react()],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: parseInt(process.env.VITE_DEV_PORT || '1421'),
    strictPort: true,
    host: process.env.TAURI_DEV_HOST || false,
    hmr: {
      port: parseInt(process.env.VITE_DEV_PORT || '1421') + 1,
    },
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**", "**/archives/**"],
    },
  },
}));
