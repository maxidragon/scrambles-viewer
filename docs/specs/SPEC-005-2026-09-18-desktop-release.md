# SPEC-005: Desktop — build and release

Part of [SPEC-001](./SPEC-001-2026-09-18-desktop-app.md).

## TLDR

A tag of the form `desktop-v1.2.3` builds installers for macOS (Apple silicon and
Intel), Windows and Linux on GitHub Actions and attaches them to a GitHub release. The
tag is the only place the version lives, matching how the mobile app already releases.
Builds are unsigned to start; that is a stated limitation, not an oversight. The existing
mobile release workflow must learn to ignore desktop tags.

## Problem Statement

The repository already has a release convention: publish a GitHub release tagged
`v1.2.3`, CI reads the version from the tag, builds, attaches the artifact and writes
the version back. Desktop needs the same convenience without colliding with it. Today
the mobile workflow runs on *every* published release and fails its tag check on
anything that is not `vX.Y.Z` — so a desktop release would trigger a red run in the
mobile pipeline unless it is scoped first.

Users also need to know what they are getting: unsigned builds produce OS warnings, and
saying so on the release page is cheaper than answering the same issue repeatedly.

## User Stories

- **Maintainer** publishes a release tagged `desktop-v1.2.3` and gets one installer per
  platform attached without running anything locally. Acceptance: macOS disk images for
  both architectures, a Windows installer, a Linux AppImage and a Debian package; the
  app reports that version in its About; the mobile workflow does not run.
- **Maintainer** pushes a PR touching `desktop/` and gets lint, typecheck, tests and a
  Rust compile check, but not a full bundle build. Acceptance: the check completes in
  minutes, not tens of minutes; a PR touching only mobile files does not run it.
- **User** downloads the build for their platform from the release page and knows what
  warning to expect. Acceptance: the release notes template includes the "unsigned
  build" note per platform with the exact steps to open it.

## Proposed Solution

Two workflows under `.github/workflows/`:

- **desktop-ci** on pull requests and pushes to the default branch, filtered to paths
  under `desktop/`, the shared modules in `src/` it imports, and the workflow itself.
  Runs the frontend checks and a Rust compile check on one Linux runner.
- **desktop-release** on published releases whose tag starts with `desktop-v`. A matrix
  over the three platforms using the official Tauri GitHub action, which builds the
  bundles and uploads them to the release that triggered it. Before building, the
  version from the tag is written into the desktop config, the same way the mobile
  workflow writes it into the Expo config, and committed back to the default branch
  afterwards so the repo reflects the latest release.

The mobile workflow gains a job-level condition so it runs only for tags starting with
`v` followed by a digit. Both workflows validate their tag shape and fail loudly on
anything else.

Alternative: one workflow with a matrix over both apps — the two builds share nothing
(EAS cloud build vs. three native runners) and would only complicate each other's
failure modes.

## Design

None.

## Data Models

None.

## API Contracts

None.

## Implementation Approach

1. Scope the mobile release workflow to `v`-tags. Ship this first and alone; it is a
   one-line change that protects the existing pipeline.
2. Desktop CI workflow with path filters.
3. A version-writing script for the desktop config, mirroring the mobile one, with a
   test that it rejects a non-semver argument.
4. Desktop release workflow with the platform matrix and the version write-back. First
   run against a pre-release tag to confirm the artifacts before announcing anything.
5. Release-notes template with the per-platform "unsigned build" instructions, and a
   desktop section in the README.

## Key Design Decisions

1. **Tag prefix `desktop-v`** rather than a separate repo or a `v2` line: same
   repository, same release mechanism, zero ambiguity about which app a tag belongs to,
   and the mobile convention is untouched.
2. **The tag is the only source of the version**, as for mobile. The desktop config in
   the repo is written back after release, never bumped by hand before tagging.
3. **Unsigned to start.** Signing needs an Apple Developer membership and a Windows
   certificate, both paid, and the notarisation pipeline on top. The app is free and
   volunteer-built. The cost is a Gatekeeper / SmartScreen warning on first launch, which
   the release notes explain. Signal to revisit: users abandoning installs because of
   the warning, or a code-signing route without recurring cost becoming available.
4. **No auto-updater.** It requires signing keys for update manifests and an endpoint to
   host them; the audience updates a few times a year before a competition. Revisit if
   competition reports show stale versions in the field.
5. **Full bundles only on tags.** Bundling on every PR would cost three native runners
   per push for a check that the compile check already covers.

## Open Questions

- Linux packaging beyond AppImage and Debian (RPM, Flatpak): wait for a request.
- Universal macOS binary instead of two disk images: simpler for users, twice the size;
  decide when the first release is cut.

## Changelog

| Date | Change |
|------|--------|
| 2026-09-18 | Initial draft |
| 2026-09-18 | Implemented: desktop-ci.yml, desktop-release.yml (macOS arm64 + x86_64 dmg, Windows NSIS exe, Linux AppImage + deb), version script, mobile workflow guarded to v-tags. Unsigned-build instructions live in desktop/README.md rather than a release-notes template. |
