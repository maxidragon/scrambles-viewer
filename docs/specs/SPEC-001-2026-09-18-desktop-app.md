# SPEC-001: Desktop app

## TLDR

Build a desktop version of Scrambles Viewer for macOS, Windows and Linux as a Tauri 2 app
with a React UI, living in `desktop/` in this repository. It does the same job as the
mobile app — pick a competition, load the TNoodle ZIP, step through scramble sets in
schedule order, unlock each set with its passcode — under the same rules: passwords stay
in memory, the WCA API is the only network call, everything works offline once loaded.
The schedule, PDF-matching and re-lock logic is imported from the mobile source tree, not
copied. Specs 002–005 detail the four areas; this one fixes the shape they share.

## Problem Statement

At the scrambling table the device is increasingly a laptop, not a phone: the delegate
already has the TNoodle ZIP on it, the screen is bigger, and it can drive an external
monitor. Today that laptop has no Scrambles Viewer. The fallback is opening the
computer-display PDFs one by one in a PDF reader and reading passcodes off the SECRET
text file, which loses everything the mobile app adds: schedule order, "next set is the
next row", the 30-minute re-lock, and the guarantee that no passcode is written anywhere.

If we do nothing, laptop users either keep the phone propped next to the laptop or
abandon the app for a plain PDF reader.

## User Stories

- **Scrambler on a laptop** loads a competition and its ZIP once and steps through the
  sets with the keyboard, in schedule order, without touching the mouse between sets.
  Acceptance: a set can be opened, unlocked and advanced from using only the keyboard.
- **Delegate** hands the laptop to a scrambler knowing that only the sets they have been
  given passcodes for are readable, and that a set left alone re-locks after 30 minutes.
  Acceptance: no passcode is ever written to disk; a closed set re-prompts after the
  timeout; quitting the app forgets every passcode.
- **Anyone at a venue with bad Wi‑Fi** keeps using the app after the competition and ZIP
  are loaded. Acceptance: with the network off, the set list, the PDFs and the passcode
  flow all work; only Search and Sync fail, with a message that says why.
- **A user on any of the three desktop platforms** downloads a build from a GitHub
  release and runs it. Acceptance: one artifact per platform per release; no app store.

Error and edge states are owned by the area specs (002–005).

## Proposed Solution

A Tauri 2 shell around a React 19 + Vite + TypeScript UI. All product logic runs in the
webview; the Rust side is the stock Tauri binary plus the official dialog, file-system
and store plugins — no custom commands until a need appears. PDFs are rendered in the
webview by PDF.js, which handles password-protected files itself, so a passcode never
leaves JavaScript memory and no external viewer is launched.

The mobile modules that have no React Native dependency — WCIF types, the WCA API client,
schedule ordering, PDF filename matching, event names, set-lock rules — are imported by
the desktop app directly from the mobile source tree through a path alias. The desktop
app gets its own storage, file-picking and viewer code, because those are the parts that
differ per platform.

Alternatives considered:

- **Electron.** Ships its own Chromium; bundles are an order of magnitude larger and the
  app's needs (render a PDF, read a ZIP, write a directory) do not require it. The
  system webview Tauri uses runs PDF.js fine.
- **Expo web / react-native-web.** The mobile UI is touch-first and its PDF viewer is a
  native module with no web implementation, so nearly all of the UI would be rewritten
  anyway, and the result would still be a browser tab rather than an installed app.
- **A separate repository.** Clean, but the matching and scheduling rules are the
  product; two copies drift the first time a TNoodle filename changes. Sharing is worth
  more than a tidy repo boundary.
- **A full monorepo with workspaces and a `core` package.** The right end state if a
  third consumer appears. Today it would mean reconfiguring the Expo app's bundler for
  workspaces to serve one consumer. A path alias gets the sharing without touching the
  mobile app; extracting a package later is mechanical.

## Design

None at this level. Screen states live in SPEC-002 (home and search), SPEC-003 (import)
and SPEC-004 (viewer).

## Data Models

Shared with mobile, unchanged: `Competition`, the WCIF types, and `ScrambleSet`
(`name`, `activityCode`, `setLetter`, `startTime`, optional `attemptNumber`, optional
`pdfPath`). The desktop app persists the same four things the mobile app does —
competition id, competition name, the WCIF, and the set list with PDF paths — and, like
mobile, never persists passwords or lock timestamps. `pdfPath` on desktop is an absolute
path inside the app's data directory.

## API Contracts

None new. The WCA API is called exactly as on mobile: competition search and the public
WCIF. It sends permissive cross-origin headers, verified on 2026-09-18, so the webview's
ordinary `fetch` works and no Rust-side HTTP proxy is needed.

## Repository structure

```
scrambles-viewer/
  src/                     mobile app (unchanged); the modules below are also imported by desktop
    types/wcif.ts
    api/wca.ts
    utils/{schedule,pdfMatching,eventNames,setLock}.ts
  desktop/
    AGENTS.md              agent context for the desktop app
    package.json           its own dependencies and scripts; not a workspace of the root
    src/                   React app (Vite)
    src-tauri/             Rust shell, tauri.conf.json, capabilities/
    tests/                 vitest, including tests for the shared modules
  docs/specs/              this spec and 002–005
```

The shared modules are reached from `desktop/` through a `@shared/*` alias pointing at
`../src/`. A test in `desktop/` guards the boundary: every module under the alias must
import nothing from `react-native`, `expo-*` or `@react-native-*`. That test is what
makes the alias safe; the mobile app is free to add native dependencies anywhere else.

## Implementation Approach

1. **Scaffold.** Tauri 2 + React + Vite + TypeScript strict in `desktop/`; the alias; the
   boundary test; vitest with the first real tests for `schedule`, `pdfMatching` and
   `setLock` (the mobile app has none — this is the first time that logic is tested).
   CI runs lint, typecheck, tests and a Rust `check` on every PR.
2. **Competition and schedule** — SPEC-002. The app is usable for browsing a schedule.
3. **ZIP import** — SPEC-003.
4. **Viewer** — SPEC-004. End-to-end usable at a competition after this step.
5. **Release** — SPEC-005. Tag-driven builds for the three platforms.

Each step is one or more PRs; nothing user-visible ships half-wired. Steps 2–4 are
sequential (each builds on the previous state); 5 can start after 1.

## Key Design Decisions

1. **Tauri 2 over Electron** — small bundles, system webview, Rust shell we barely touch.
   Cost: three platform webviews with small rendering differences; PDF.js absorbs the
   one that matters.
2. **Desktop lives in this repo, in `desktop/`, and imports shared logic through a path
   alias** rather than a separate repo or a workspace package. Cheapest way to have one
   copy of the matching rules; upgrade path to a package is mechanical. Revisit when a
   third consumer appears or when the mobile app itself gains a test runner and wants the
   same tests.
3. **PDF.js renders in the webview; passwords never cross to Rust.** The alternative —
   decrypting in Rust and handing pages to the UI — moves the secret across a process
   boundary for no benefit. PDF.js reports "needs password" and "wrong password" as
   distinct outcomes, which the viewer relies on.
4. **Same security posture as mobile, stated once here:** passwords in memory only;
   30-minute re-lock; the only network host is the WCA API; PDFs are written to the
   app's own data directory; the webview's file-system access is scoped to that
   directory; no shell, no updater, no remote content. The Tauri capability file is the
   enforcement point and must not grow beyond what an area spec asks for.
5. **Same bundle identifier as mobile** (`com.maxidragon.scrambles.viewer`). It is the
   same product; the platforms do not collide.
6. **No custom Rust commands until a spec needs one.** Everything in 002–004 is doable
   with the official plugins. The first candidate is decrypting an outer TNoodle ZIP that
   was given a global password (see SPEC-003 open questions).

## Open Questions

- **Minimum supported OS versions.** Tauri's floor (macOS 10.13, Windows 10 with
  WebView2, a distro with WebKitGTK 4.1) is likely fine; confirm once the first build
  exists and record it in the desktop README.
- **Name in the OS.** "Scrambles Viewer" everywhere, or "Scrambles Viewer Desktop"? Leaning
  to the former; the platform already disambiguates.

## Changelog

| Date | Change |
|------|--------|
| 2026-09-18 | Initial draft |
