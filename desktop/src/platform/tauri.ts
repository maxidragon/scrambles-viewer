/** False when the UI runs on the Vite dev server in a plain browser. */
export function hasTauriBridge(): boolean {
  return "__TAURI_INTERNALS__" in window;
}
