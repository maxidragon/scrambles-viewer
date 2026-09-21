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

## Releases

Publishing a GitHub release tagged `desktop-v1.2.3` runs
`.github/workflows/desktop-release.yml`, which builds on each platform's own runner and
attaches the installers to the release: `.dmg` for Apple silicon and Intel Macs, an NSIS
setup `.exe` for Windows, and `.AppImage` plus `.deb` for Linux. The tag is the only
source of the version; the workflow writes it into the app config and commits it back to
the default branch. To set it by hand: `node scripts/set-app-version.ts 1.2.3`.

The builds are **not code-signed**, so the first launch shows a warning:

- **macOS:** "cannot be opened because the developer cannot be verified". Right-click
  the app, choose *Open*, then *Open* again. Or, in a terminal:
  `xattr -d com.apple.quarantine "/Applications/Scrambles Viewer.app"`.
- **Windows:** SmartScreen shows "Windows protected your PC". Click *More info*, then
  *Run anyway*.
- **Linux:** make the AppImage executable (`chmod +x`) and run it, or install the `.deb`.

Signing needs paid developer memberships; see SPEC-005 for when that is revisited.

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
