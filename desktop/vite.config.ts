import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const host = process.env.TAURI_DEV_HOST;
// The mobile app's pure modules (schedule, matching, lock rules) are imported from the
// repository root rather than copied — see SPEC-001.
const sharedDir = fileURLToPath(new URL("../src", import.meta.url));

export default defineConfig(() => ({
  plugins: [react()],
  // The shared files sit under the mobile app, whose tsconfig extends an Expo base that
  // only exists when the mobile dependencies are installed. Use this app's config for
  // every file instead of Vite's per-file discovery.
  tsconfig: "./tsconfig.json",
  resolve: {
    alias: { "@shared": sharedDir },
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: "ws", host, port: 1421 } : undefined,
    fs: { allow: [".", sharedDir] },
    watch: { ignored: ["**/src-tauri/**"] },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
}));
