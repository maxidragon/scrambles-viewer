# AGENTS.md — desktop app

<!-- Canonical agent context for desktop/. CLAUDE.md here is a one-line pointer (`@AGENTS.md`).
     State doc: describes the app as it is TODAY — keep it current as the system changes. -->

## Project

The desktop build of Scrambles Viewer: a Tauri 2 app with a React UI for macOS, Windows
and Linux. Same product as the mobile app at the repository root — pick a WCA
competition, load the TNoodle ZIP, step through scramble sets in schedule order, unlock
each set with its passcode — for people whose device at the scrambling table is a laptop.

**Current focus:** the app is built through SPEC-004 (schedule, ZIP import, viewer).
Next is [SPEC-005](../docs/specs/SPEC-005-2026-09-18-desktop-release.md), the CI build and
release. Read [SPEC-001](../docs/specs/SPEC-001-2026-09-18-desktop-app.md) and the area
spec for whatever you are about to touch before writing code.

## Tech stack

- Tauri 2 (Rust shell, stock; official `fs` and `store` plugins only)
- React 19, Vite, TypeScript strict; vitest for tests; ESLint rejects `any`, `as` and `!`
- PDF.js (`pdfjs-dist`, its `legacy` build) renders PDFs inside the webview; `jszip` reads archives
- Node 24, npm; Rust stable toolchain for `src-tauri/`

Look up the exact API before using it: Tauri v2 docs at https://v2.tauri.app/ (the v1
API is different and widely quoted; do not use it), PDF.js from the version pinned in
`package.json`. Every plugin call needs a matching entry in
`src-tauri/capabilities/` — a missing permission fails at runtime, not at compile time.

## Repository structure

```
desktop/
  src/
    App.tsx           layout, navigation with the lock rules, keyboard map, fullscreen, drop
    components/       sidebar: competition header, search panel, set list, import result
    store/            competition context; persistence (store plugin); sync merge + grouping
    import/           archive selection + matching (pure), import hook, result panel
    viewer/           viewer pane, PDF.js wrapper, page renderer, password prompt, lock state
    platform/         Tauri bridge detection; PDF file storage (fs plugin, or memory in a browser)
  src-tauri/          Rust shell, tauri.conf.json, capabilities/
  tests/              vitest — shared-module tests, archive/viewer logic, PDF password fixtures
../src/           the mobile app; the modules below are imported here via the @shared/* alias
  types/wcif.ts
  api/wca.ts
  utils/schedule.ts       WCIF -> ordered scramble sets
  utils/pdfMatching.ts    PDF filename -> set
  utils/eventNames.ts     event ids, display names, TNoodle filename aliases
  utils/setLock.ts        when a closed set needs its passcode again
../docs/specs/    SPEC-001 (umbrella) and SPEC-002..005 (competition/schedule, ZIP import, viewer, release)
```

## Docs index

- `../docs/specs/README.md` — spec index and how to write one
- `../README.md` — the mobile app; its "How PDF matching works" section applies here too
- `../PRIVACY.md` — the promises this app must keep

## Working principles

- **Shared logic is imported, never copied.** Ordering, matching, event aliases and lock
  rules live in `../src/` and are used by both apps. A desktop-only fix to any of them is
  a bug; fix it there and both apps get it. The boundary test in `tests/` fails if a
  shared module imports anything from React Native or Expo — keep it passing.
- **Passcodes never touch disk, the store, logs or the Rust side.** They live in React
  state and are dropped on re-lock, Lock all and quit. This is the product's promise
  (see `../PRIVACY.md`); a convenience that persists them is a regression, not a feature.
- **The only network host is the WCA API.** The CSP and capabilities say so; do not
  widen either for a feature without a spec saying why.
- **The capability file is the smallest set that works.** File-system access is scoped
  to the PDF directory in app data; no shell, no HTTP plugin, no updater.
- **No custom Rust commands without a spec.** Everything planned is doable with the
  official plugins from the webview.
- **`npm run dev` in a plain browser is a supported development mode.** Without the Tauri
  bridge, persistence and PDF storage fall back to memory (`src/platform/`,
  `src/store/persistence.ts`), so search, import, the prompt and rendering can all be
  driven with Playwright. Nothing is written anywhere in that mode; the shell is the
  product.
- **The picked or dropped ZIP is read as bytes in the webview**, never by path: no
  file-system permission exists for it, and Tauri's own drag-drop handler is off so the
  HTML5 drop event carries the file.
- **Verify APIs exist in the pinned versions** before relying on them; Tauri v1 and PDF.js
  pre-4 examples are everywhere online and plausibly wrong here.
- Docs discipline: **state docs** (this file, spec bodies, READMEs) describe the system as
  it is today and are updated with the change that invalidates them; **records** (dated
  spec changelog rows) are closed once dated — never rewritten.

## Task tracking

- Tracker: GitHub issues on `maxidragon/scrambles-viewer`.

## Skill profile

- **checks**: in `desktop/`: `npm run lint && npm run typecheck && npm test`; plus
  `cargo check` in `desktop/src-tauri/`.
- **reviewer**: none configured; local review loop only.
- **ownerCanSelfMerge**: true — but the owner merges by hand, never an agent.
- **defaultBranch**: `main`
- **Give-up tracker**: GitHub issues, same repo.

## Language policy

Everything in English: code, comments, commits, docs.

## Commit style

[Conventional Commits](https://www.conventionalcommits.org/): `<type>(scope): <description>`;
use the scope `desktop` for changes under this directory. No trailers.
