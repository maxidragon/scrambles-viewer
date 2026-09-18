# Specs

Design specs for non-trivial changes. Naming: `SPEC-{NNN}-{YYYY-MM-DD}-{kebab-title}.md`,
based on [SPEC-000-template.md](./SPEC-000-template.md).

## Index

<!-- This table is the number-allocation ledger: take the next {NNN} from here and add
     your row in the same commit that creates the spec — otherwise parallel branches
     collide on the same number. -->

| SPEC | Date | Title | Status | Description |
|------|------|-------|--------|-------------|
| [001](./SPEC-001-2026-09-18-desktop-app.md) | 2026-09-18 | Desktop app | Draft | Tauri + React desktop build in `desktop/`, reusing the mobile schedule/matching/lock logic. Umbrella for 002–005. |
| [002](./SPEC-002-2026-09-18-desktop-competition-and-schedule.md) | 2026-09-18 | Desktop: competition and schedule | Draft | Competition search, WCIF load, schedule-ordered set list, sync, reset, local persistence. |
| [003](./SPEC-003-2026-09-18-desktop-zip-import.md) | 2026-09-18 | Desktop: ZIP import | Draft | Picking or dropping the TNoodle ZIP, finding the computer-display PDFs inside it, matching them to sets, storing them. |
| [004](./SPEC-004-2026-09-18-desktop-viewer.md) | 2026-09-18 | Desktop: viewer | Draft | In-app PDF rendering, per-set passwords held in memory, 30-minute re-lock, keyboard navigation, fullscreen. |
| [005](./SPEC-005-2026-09-18-desktop-release.md) | 2026-09-18 | Desktop: build and release | Draft | Tag-driven CI builds for macOS, Windows and Linux; coexistence with the mobile release workflow. |

Statuses: `Draft` → `Approved` → `Implemented` (or `Rejected` / `Superseded by SPEC-NNN`).

## When to write a spec

Write one when a change: touches data models or public API contracts, spans multiple
sessions/PRs, has real design alternatives worth recording, or needs sign-off before
building. Skip it for bug fixes, refactors, and single-PR features — a good PR
description is enough there.

The spec **body** is a state doc while the work is live — keep it matching what's being
built. The **Changelog** table is a record — append dated rows, never rewrite old ones.
Once implemented, mark the status and stop editing the body; supersede with a new spec
instead.

## For AI agents

Before implementing anything spec-worthy:

1. Read this index — is there already a spec (or a superseded one) covering the area?
2. New spec: copy `SPEC-000-template.md`, allocate the next number **from the index
   table above**, name it `SPEC-{NNN}-{YYYY-MM-DD}-{kebab-title}.md`.
3. Add the index row in the same commit as the new spec file.
4. Get the spec to `Approved` (human sign-off) before large implementation work.
5. While implementing: update the spec body if reality diverges; log the divergence as a
   dated Changelog row.
6. When done: set status `Implemented` in the spec and in this index.
