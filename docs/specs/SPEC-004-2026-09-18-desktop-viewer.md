# SPEC-004: Desktop — viewer

Part of [SPEC-001](./SPEC-001-2026-09-18-desktop-app.md).

## TLDR

Open a set, enter its passcode, read the scrambles, move to the next set — with the
mobile app's lock rules and a desktop layout: the set list is a sidebar, the PDF fills
the rest, the keyboard drives everything, and a fullscreen mode hides all chrome for
the scrambling table or a second monitor. PDF.js renders inside the app; passcodes are
held in memory and forgotten when a set re-locks, when the user locks everything, or
when the app quits.

## Problem Statement

The viewer is where the security rules live and where the phone form factor shows most.
On mobile the whole screen is one set, navigation is swipe and arrows, and "leaving the
viewer" (going back to the list) is the moment all passcodes are forgotten. On desktop
the list and the PDF are visible together, so there is no "back"; the rules about when a
passcode is forgotten need restating for that layout without becoming weaker.

## User Stories

- **Open a set.** I click a set in the list or press Enter on it. Acceptance: if it has
  no PDF, the pane says so and points at Load ZIP; if the PDF opens without a passcode
  (an unencrypted file), it is simply shown; otherwise the passcode prompt appears with
  the set name, and nothing of the PDF is visible behind it.
- **Enter the passcode.** I type it and press Enter. Acceptance: input is masked with a
  show/hide toggle, has autocomplete and spell-check off, and Escape cancels; a wrong
  passcode shows "Incorrect password" and keeps the prompt open with the text selected;
  a correct one shows the PDF fitted to the pane width with the page count visible.
- **Move on.** I press → or click Next, or click another set in the list. Acceptance:
  the set I left is marked closed and its lock timer starts; the set I arrive at is shown
  if it is unlocked, or prompts for its passcode without ever drawing the previous set's
  PDF underneath the prompt; ← and Prev work the same way backwards; at either end the
  key does nothing.
- **Come back.** I return to a set I opened earlier. Acceptance: within 30 minutes of
  closing it, it opens without a prompt; after that, the passcode was forgotten and the
  prompt appears. A set that is open never expires, however long it stays on screen.
- **Lock now.** I press the lock control on the current set, or Lock all in the toolbar.
  Acceptance: the set (or all sets) forget their passcode immediately and the current
  one shows the prompt.
- **Read.** I scroll and zoom. Acceptance: pages are stacked vertically; Space and Page
  Down scroll; Ctrl/Cmd with plus, minus and zero zoom in, out and back to fit-width;
  trackpad pinch zooms; the zoom level carries over to the next set within the session.
- **Fullscreen.** I press F11 (Ctrl+Cmd+F on macOS) or the fullscreen control.
  Acceptance: the sidebar and toolbar disappear, a thin overlay shows the set name and
  "n / total", and Escape or the same key returns; keyboard navigation keeps working.
  Escape inside the passcode prompt closes the prompt, not fullscreen.
- **Quit.** I close the app. Acceptance: on relaunch no set is unlocked.

## Proposed Solution

Layout: two panes. Left, the grouped set list from SPEC-002, with the current set
highlighted and each row showing its PDF/no-PDF state and a key or lock glyph
mirroring mobile. Right, the viewer pane with a toolbar (set name, page count, "n /
total", Prev, Next, lock, Lock all, fullscreen) and the PDF below. Below a window width
threshold the sidebar collapses to a toggle.

Rendering: PDF.js with its worker bundled by Vite. The file's bytes are read from the
app data directory through the fs plugin and handed to PDF.js in memory; no asset URL,
no custom protocol. Each page is rendered to a canvas at the current scale and the
device pixel ratio; pages are rendered lazily as they scroll into view.

Password flow, built on the two outcomes PDF.js reports: the document is opened with the
known passcode if there is one. If PDF.js asks for a passcode and none is known, the
prompt is shown; if it reports the one it was given is wrong, the prompt is shown with
the error and the stored passcode is discarded. If it opens without asking, the set is
shown and treated as unlocked without a passcode (no key glyph; nothing to forget).

Lock rules use the shared `setLock` module unchanged: a set has a closed-at timestamp
while not on screen; opening clears it; the state is "unlocked", "expired" or "locked".
On desktop, "closing" a set is: navigating to another set, or the app losing the viewer
entirely (Reset, Clear PDFs). Lock all clears every passcode and timestamp.

Alternatives: the platform PDF viewer inside an iframe — the three webviews differ in
whether they have one, whether it handles passwords, and whether it can be told the
passcode without a native dialog; not controllable. PDF.js's bundled viewer UI —
brings its own toolbar, find bar and sidebar, all of which fight the app's; the API is
small enough to use directly.

## Design

Storyboard to be added with the scaffold. States: no PDF for this set; passcode prompt;
incorrect passcode; loading; rendered at fit-width; rendered zoomed; fullscreen with
overlay; sidebar collapsed; expired set re-prompting.

## Data Models

In memory only: passcode per set name; closed-at timestamp per set name; current set
index; zoom level. None persisted.

## API Contracts

None.

## Implementation Approach

1. Tests for the shared `getSetLockState` and `isSetLockExpired` in `desktop/tests/`:
   the boundary at exactly 30 minutes, an open set never expiring, no passcode meaning
   "locked" regardless of timestamps.
2. A viewer-state module (current index, passcodes, closed-at, open/close/lock/lock-all
   transitions) as pure functions over state, tested with the sequences above: open A,
   move to B, return to A within the window; return after the window; Lock all.
3. The PDF pane: load, render lazily, zoom, page count, error surface.
4. The passcode prompt and its wiring to PDF.js's outcomes.
5. Keyboard map, fullscreen, sidebar collapse.

## Key Design Decisions

1. **The app never assumes a PDF is encrypted; it asks PDF.js.** Mobile always prompts
   when a PDF exists, which is right for its input (the nested ZIP) but wrong when the
   printing PDFs got imported. Asking costs nothing and makes that case visible.
2. **Both directions on the arrow keys.** Mobile made "previous" button-only because a
   stray rightward swipe kept closing the set being scrambled. A keypress is not a
   stray gesture; the rule that protects the scrambler — moving away closes the set —
   is unchanged.
3. **A plain masked input.** The mobile prompt hand-rolls its masking to stop Android
   learning passcodes as words. Desktop webviews have no such keyboard; a standard
   password field with autocomplete off is the correct, smaller thing.
4. **Passcodes survive while the app is open, subject to the timer.** On mobile they are
   also dropped when the viewer screen is left. Desktop has no equivalent moment, so
   the explicit Lock all control replaces it, and the 30-minute timer remains the
   safety net. This is not weaker: on mobile the same set stays unlocked as long as the
   viewer stays open, too.
5. **Rendering in memory, not via a URL.** Handing PDF.js bytes keeps the file-system
   capability read-only and scoped, and avoids registering a custom protocol whose
   scope would have to be maintained separately.

## Open Questions

- Should the lock timer also fire when the window is minimised or the machine sleeps for
  longer than the window? With timestamps rather than timers it already does — the check
  happens on open — but a set left on screen through a sleep stays open. Decide whether
  "on screen" should require the window to be visible.
- Whether the overlay in fullscreen should show the passcode prompt centred with the
  same chrome-free look, or drop out of fullscreen to prompt. Lean: stay in fullscreen.

## Changelog

| Date | Change |
|------|--------|
| 2026-09-18 | Initial draft |
| 2026-09-18 | Implemented. Page count shown above the pages; the list glyph reflects a held passcode (expiry is applied on open, as on mobile); Escape in the prompt closes the prompt. |
