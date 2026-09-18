# Scrambles Viewer — desktop

The desktop build of [Scrambles Viewer](../README.md) for macOS, Windows and Linux: a
Tauri 2 shell around a React UI. Same job as the mobile app — pick a WCA competition,
load the TNoodle scrambles ZIP, step through scramble sets in schedule order, unlock
each with its passcode — with the schedule, matching and re-lock logic imported from the
mobile source tree. Design: [docs/specs](../docs/specs/README.md).

## Prerequisites

- Node.js 24 and npm
- Rust stable (via rustup) and the platform prerequisites from
  https://v2.tauri.app/start/prerequisites/

## Run

```bash
npm install
npm run tauri dev      # the desktop app, with hot reload
npm run dev            # UI only, in a browser at http://localhost:1420 — nothing is persisted
```

In the browser mode the Tauri bridge is absent, so competition state and imported PDFs are
kept in memory. Everything else works, which is how the UI is exercised with Playwright.

## Checks

```bash
npm run typecheck && npm run lint && npm test
cargo check --manifest-path src-tauri/Cargo.toml
```

## Build

```bash
npm run tauri build    # bundles under src-tauri/target/release/bundle/
```

## Using it

- **Search** finds a competition on the WCA; selecting it loads the public schedule.
- **Load ZIP**, or drop the file on the window. Either TNoodle's whole download or the
  nested `… - Computer Display PDFs.zip` inside it works.
- Click a set, or use the keyboard: `←` `→` previous and next set, `Ctrl`/`Cmd` with
  `+` `-` `0` to zoom, `F11` (or `Ctrl+Cmd+F` on macOS) for fullscreen, `Esc` to leave it.
- A set asks for its passcode when opened. Passcodes are held in memory only and are
  forgotten 30 minutes after you move away from the set, on **Lock** / **Lock all**, and
  when the app quits.

State lives in the app's data directory: the competition and set list in a small store
file, and the extracted PDFs under `scramble_pdfs/`. **Reset** removes both.
