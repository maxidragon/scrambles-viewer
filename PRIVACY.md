# Privacy Policy — Scrambles Viewer

_Last updated: 21 August 2026_

Scrambles Viewer is an app for viewing WCA scramble PDFs at a competition. It has no
user accounts, no analytics, no advertising, and no third-party SDKs that collect data.

## What the app collects

**Nothing.** The developer does not collect, store, or receive any personal information
about you. There is no server operated by this app.

## What stays on your device

The following is stored locally on your device only, and is never transmitted anywhere:

- the competition schedule (WCIF) you selected and the scramble set list built from it;
- the scramble PDFs extracted from the TNoodle ZIP file you pick;
- scramble set passwords, which are held **in memory only** for as long as the viewer is
  open. They are never written to storage and are discarded when you leave the viewer or
  when a set re-locks.

Uninstalling the app, or using `Reset` / `Clear PDFs` inside it, deletes all of it.

## Network connections

The app connects to exactly one service, the public
[World Cube Association API](https://www.worldcubeassociation.org/api/v0), and only when
you search for a competition or press `Sync`. These requests contain the search text or
the competition ID you chose — no personal identifiers are attached, and no account or
login is involved. The WCA receives the request as it would any visit to its public
website; see the [WCA Privacy Policy](https://www.worldcubeassociation.org/privacy).

Once a competition and its ZIP are loaded, the app works fully offline.

## Files you choose

Loading a scrambles ZIP uses the Android and iOS system file picker. The app receives
only the single file you select; it has no ability to browse your storage, and it does
not request storage permissions. Extracted PDFs are written to the app's own private
directory, which other apps cannot read.

## Children

The app is not directed at children and collects no data from anyone.

## Changes

Any change to this policy will be published in this file in the app's public repository,
with the date above updated.

## Contact

Questions about this policy: open an issue at
<https://github.com/maxidragon/scrambles-viewer/issues>.
