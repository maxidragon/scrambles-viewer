# AGENTS.md

Scrambles Viewer: an app for viewing WCA scramble PDFs at a competition. Two apps share
this repository:

- **Mobile** (Expo / React Native) at the root — `src/`, `App.tsx`, `app.json`. Read the
  exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any
  code; Expo has changed.
- **Desktop** (Tauri 2 / React) in `desktop/` — see `desktop/AGENTS.md`. It imports the
  pure modules from `src/` (types, WCA client, schedule, PDF matching, event names, set
  lock); keep those free of React Native and Expo imports.

Design specs for non-trivial work live in `docs/specs/` — read the index there first.
Commits follow Conventional Commits with no trailers; use the scope `desktop` for the
desktop app.
