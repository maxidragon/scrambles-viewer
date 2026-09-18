# SPEC-003: Desktop — ZIP import

Part of [SPEC-001](./SPEC-001-2026-09-18-desktop-app.md).

## TLDR

Load the scramble PDFs from the ZIP TNoodle produced, by file picker or by dropping the
file on the window. Unlike mobile, the desktop app understands the full TNoodle archive:
given the outer ZIP it finds the nested computer-display ZIP inside and uses those PDFs;
given the nested ZIP directly it uses it as is. Matched PDFs are written to the app's
data directory and attached to their sets; the result says what matched and lists what
did not.

## Problem Statement

TNoodle's download is one outer ZIP containing a printing folder, an interchange folder,
a nested `… - Computer Display PDFs.zip`, and the passcode text files. The per-set
passcode-protected PDFs — the ones this app is for — are only in the nested ZIP. On mobile
the user must first extract the outer archive and pick the nested one; picking the outer
one silently matches the printing PDFs instead, which carry no per-set passcode. On a
laptop the user has the outer ZIP right there, and the app should take it.

The mobile import also reports only counts. When three sets stay unmatched the user has
no way to see which filenames were ignored, and the alias list in `eventNames.ts` is the
fix — but only if someone can read the offending name.

## User Stories

- **Pick.** I press Load ZIP and choose a file. Acceptance: the picker filters to ZIP
  files; cancelling changes nothing; picking with no competition loaded is refused with
  a message to select a competition first.
- **Drop.** I drag the ZIP from the downloads folder onto the window. Acceptance: same
  result as picking; dropping anything but a single ZIP file is refused with a message;
  a drop while an import is already running is ignored.
- **Outer or inner archive.** I give the app either the ZIP TNoodle downloaded or the
  nested computer-display ZIP. Acceptance: both end with the passcode-protected PDFs
  matched; the app never picks a printing PDF when a computer-display PDF for the same
  set exists.
- **Result.** I see how many PDFs matched and which files did not. Acceptance: "Matched
  n of m PDFs"; the unmatched filenames are listed and can be copied; sets that already
  had a PDF and now got a new one are replaced, not duplicated.
- **Clear.** I remove the extracted PDFs without losing the competition. Acceptance:
  confirmation first; every set returns to "No PDF"; the files are deleted from disk;
  in-memory passwords are forgotten.
- **Failure.** The file is not a ZIP, is corrupt, or its entries are encrypted.
  Acceptance: a message naming the problem; nothing on disk or in the set list changes.

## Proposed Solution

Import pipeline, all in the webview:

1. Read the chosen file's bytes.
2. Open it as a ZIP. If it contains exactly one entry whose name ends in
   `Computer Display PDFs.zip`, open that entry as the archive to import from. If it
   contains several such entries, fail with a message — that is not a TNoodle archive
   we know. If it contains none, import from the archive itself (this is the nested ZIP
   picked directly, or some other flat ZIP of PDFs, which mobile also accepts).
3. Take every non-directory entry ending in `.pdf`, match its basename to a set with the
   shared `matchSet`, and for each match write the bytes to
   `<app data>/scramble_pdfs/<sanitised basename>` and record the path on the set.
   Where two entries match the same set, the first in archive order wins and the other
   is reported as unmatched — deterministic, unlike the mobile race.
4. Report matched count, total PDF count and the unmatched names.

A ZIP whose entries are encrypted cannot be read by the JavaScript ZIP library; that is
reported as "this ZIP is password-protected" rather than a generic failure.

Alternatives: extracting in Rust with the `zip` crate — it would gain support for
encrypted outer archives, but adds a custom command, a second implementation of the
folder-walking logic, and a Rust dependency, for a case whose frequency is unknown (see
open questions). Keeping the ZIP on disk and reading entries on demand instead of
extracting — breaks the moment the user moves or deletes the download; the app is
supposed to be self-contained after import.

## Design

Storyboard to be added with the scaffold. States: idle with drop hint; drag-over
highlight; importing with progress; result with all matched; result with unmatched list;
refused (no competition, not a ZIP, encrypted); clear confirmation.

## Data Models

`ScrambleSet.pdfPath` becomes an absolute path under the app data directory. No other
change.

## API Contracts

None.

## Implementation Approach

1. Tests for `matchSet` in `desktop/tests/` using real TNoodle filename shapes: with and
   without competition prefix; Multi-Blind with attempt; a filename with no set letter;
   an event alias (`3x3x3 Cube`, `3x3x3 Multiple Blindfolded`); a round number that
   matches but an event that does not.
2. The archive-selection step (outer vs nested) as a pure function over entry names,
   with tests for the three branches.
3. The import module using the dialog and fs plugins, then the drop handler, then the
   result panel and Clear.

## Key Design Decisions

1. **Nested ZIP detection by entry-name suffix**, because that is what TNoodle writes
   (`<competition> - Computer Display PDFs.zip`), and the nested archive is deliberately
   unencrypted upstream. If TNoodle renames it, the fallback (import the archive as is)
   still works and the printing PDFs will match instead — visibly, since the viewer
   will not ask for a passcode. Recorded so the symptom is recognisable.
2. **Never trust entry paths for writing.** Files are written by sanitised basename into
   one fixed directory, so a crafted archive cannot write outside it.
3. **The passcode text files in the archive are ignored on purpose.** Importing them
   would put every set's passcode in memory at once and defeat the point of per-set
   passcodes: a scrambler is given the passcode for their set and no other. The delegate
   reads the passcode from the SECRET file and types it; the app does not shortcut that.
4. **File-system capability is scoped** to the PDF directory under the app data
   directory (read, write, create directory, remove). The picked ZIP is read through the
   dialog's returned path, which Tauri scopes for that one file.

## Open Questions

- **Outer ZIPs given a global password.** TNoodle encrypts the printing PDFs with that
  password; whether it also encrypts the outer archive's entries is not verified. If it
  does, users who set one will need to pick the nested ZIP (which stays unencrypted),
  and the "password-protected ZIP" message should say exactly that. Verify with a real
  archive before writing the message.
- Whether to keep the previous PDFs when a new import matches fewer sets than the last
  one (a wrong file picked by mistake). Current lean: replace only the sets the new
  archive matched, keep the rest — which the pipeline above already does.

## Changelog

| Date | Change |
|------|--------|
| 2026-09-18 | Initial draft |
