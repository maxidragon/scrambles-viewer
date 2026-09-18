# SPEC-002: Desktop — competition and schedule

Part of [SPEC-001](./SPEC-001-2026-09-18-desktop-app.md).

## TLDR

The desktop app's home state: search the WCA for a competition, load its public WCIF,
show every scramble set in schedule order grouped by round, keep it all on disk so the
app opens straight into the competition next time, and offer Sync and Reset. Behaviour
is the mobile app's; the set ordering is literally the mobile code. What changes is the
shape: search is a panel over the list, not a separate screen, and the list is a
persistent sidebar once a viewer is open (SPEC-004).

## Problem Statement

Nothing in this area is new product behaviour. The problem is fidelity: a desktop user
switching from the phone must find the same sets in the same order with the same names,
or the two apps disagree about which set is "next" and the phone becomes the source of
truth again.

## User Stories

- **Search.** I type part of a competition name and see matching competitions, newest
  first, each with its city and dates. Acceptance: results update as I type without a
  submit button; an empty query shows nothing; no matches shows "No competitions
  found"; a network failure shows an inline message and keeps whatever was on screen —
  no modal dialog.
- **Select.** I pick a result and the app loads that competition's schedule. Acceptance:
  the set list replaces the search panel; the competition name and id are shown at the
  top; passwords and lock timers from any previous competition are gone; if the WCIF
  fetch fails the previous competition stays loaded and a message says the load failed.
- **Set list.** I see rounds in the order they start, each expanded into its scramble
  sets, with the round's start time in the venue's timezone. Acceptance: identical
  output to the mobile app for the same WCIF (guaranteed by importing the same function,
  and by tests over it — see below); Fewest Moves and Multi-Blind get one row per attempt
  per set; a competition whose WCIF has no schedule shows an empty state that says so.
- **Sync.** After the delegate changes the schedule I press Sync and the list reorders
  without losing loaded PDFs. Acceptance: sets matched to a PDF stay matched when their
  name is unchanged; sets that disappeared are gone; new sets appear without a PDF;
  offline, Sync fails with a message and changes nothing.
- **Reset.** I clear the competition to load another. Acceptance: asks for
  confirmation, then removes the competition, the set list, every extracted PDF and all
  in-memory passwords; the app returns to the "no competition" state.
- **Reopen.** I quit and relaunch. Acceptance: the last competition, its set list and PDF
  paths are back; no set is unlocked.

## Proposed Solution

One home view with three regions: a header (competition name and id, or "No competition
selected"), an action row (Search, Sync, Load ZIP, Clear PDFs, Reset — the last four only
once a competition is loaded), and the grouped set list with the "n/m PDFs loaded" line
above it. Search opens as a panel that takes focus, filters as you type with the same
debounce as mobile, and closes on selection or Escape.

Persistence uses Tauri's store plugin, one store file in the app data directory holding
the four keys the mobile app keeps in AsyncStorage. It is written on every change and
read once at launch; the UI shows a neutral loading state until that read completes so
the "no competition" empty state never flashes before a stored competition appears.

Alternatives: hand-rolled JSON file via the fs plugin (more code for the same result);
SQLite (nothing here is relational). Both lost to the store plugin.

## Design

Storyboard to be added when the scaffold exists. States to cover: no competition; search
panel with results, empty result, and error; competition loaded with no PDFs; loaded
with some PDFs; sync in progress; sync error; reset confirmation.

## Data Models

Shared `ScrambleSet` and WCIF types. Persisted keys: competition id, competition name,
the WCIF document, the set list. Not persisted, ever: passwords, closed-at timestamps.

## API Contracts

The WCA competition search (sorted by start date descending, one page of results) and
the public WCIF endpoint, called with the shared client. No new contracts.

## Implementation Approach

1. Bring the shared `buildOrderedSets`, `formatTime`, `getVenueTimezone` under test in
   `desktop/tests/` with hand-written WCIF fixtures: a plain event with several sets, a
   Multi-Blind round with attempts scheduled separately, a Fewest Moves round without
   attempt activities (falls back to the round format), a round with no matching
   activity in the schedule, and a WCIF with no venues. These tests are the parity
   guarantee with mobile.
2. Store module: load-once-at-launch, write-on-change, with the same merge rule Sync uses
   on mobile (keep `pdfPath` when a set with the same name survives).
3. Home view, search panel, sync and reset actions, error and empty states.

## Key Design Decisions

1. **Ordering is imported, not reimplemented.** Any desktop-only change to ordering
   rules is a bug; the fix goes in `src/utils/schedule.ts` and both apps get it.
2. **Search is a panel, not a route.** Desktop has room; a route would only add a back
   button. The list stays visible behind it, which also makes "cancel" free.
3. **Failures are inline, not modal.** Mobile uses alerts because that is the platform
   idiom; on desktop a modal for "you are offline" gets in the way of the thing that
   still works, the loaded PDFs.
4. **Sync keeps PDFs by set name**, exactly as mobile. A renamed round loses its PDF and
   needs a re-import; that is the existing behaviour and it is acceptable because the ZIP
   is regenerated when the schedule changes that much.

## Open Questions

- Should the list remember which set was last opened and scroll to it on relaunch? Cheap
  and useful at a multi-day competition; decide during implementation.
- The mobile code treats a round with a `scrambleSetCount` of zero as having no sets.
  Keep for parity; confirm against a real WCIF whether that value ever occurs.

## Changelog

| Date | Change |
|------|--------|
| 2026-09-18 | Initial draft |
