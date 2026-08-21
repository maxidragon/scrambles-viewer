# Publishing to Google Play

Everything the repo can do ahead of a Play release is done; what is left is Play Console
work. This is the checklist, split into what is already handled in code and what has to
be done by hand in the Console.

## Already handled in this repo

| Requirement | Where |
|---|---|
| App Bundle (AAB) — required for new apps | `eas.json`, `production.android.buildType: "app-bundle"` |
| Unique version code on every upload | `eas.json`, `production.android.autoIncrement: true` (default is `false`, which causes duplicate-versionCode rejections) |
| Target API level 36 | React Native 0.85 defaults to `targetSdk`/`compileSdk` 36 and `expo-build-properties` does not override it |
| 16 KB page size support | `io.legere:pdfiumandroid:1.0.32` ships 16 KB-aligned `.so` files (`p_align = 0x4000` on arm64-v8a and x86_64; 32-bit ABIs are exempt) |
| No unnecessary storage permissions | `app.json`, `android.blockedPermissions` |
| Privacy policy text | [`PRIVACY.md`](../PRIVACY.md) |
| Adaptive + themed launcher icon | `app.json`, `android.adaptiveIcon` |

### About the blocked permissions

`react-native-blob-util` declares `READ_EXTERNAL_STORAGE` and `WRITE_EXTERNAL_STORAGE`
with no `maxSdkVersion` in its own manifest, and those merge into the final
`AndroidManifest.xml` even though the app never needs them: ZIPs come in through the
system file picker (SAF) and every extracted PDF is written to
`FileSystem.documentDirectory`, which is app-private. `android.blockedPermissions` strips
them with `tools:node="remove"` so the Play listing does not claim storage access.

`react-native-blob-util` also injects `WAKE_LOCK`, `ACCESS_WIFI_STATE` and
`DOWNLOAD_WITHOUT_NOTIFICATION` for its download manager, which this app does not use
either. They are left alone because they are "normal" permissions that do not show up in
the store listing, so blocking them is risk without benefit.

## Play Console setup

### 1. Developer account

- $25 one-time registration fee, plus identity verification (D-U-N-S number as well if
  you register as an organization).
- **Choose the account type deliberately.** A *personal* account created after
  13 November 2023 must run a closed test with **12 testers opted in continuously for
  14 days** before it can even apply for production access. *Organization* accounts are
  exempt. This is the longest item on the list — start it first.

### 2. Upload key and signing

Let EAS generate the upload keystore (`eas build` prompts on first run) and enroll in
Play App Signing, which is mandatory for new apps. Back up the keystore:

```bash
npx eas-cli credentials
```

### 3. Service account for `eas submit`

1. In Play Console: **Setup → API access**, link a Google Cloud project, create a service
   account, and grant it *Release manager* on this app.
2. Download the JSON key to the repo root as `google-play-service-account.json` — the
   path `eas.json` expects, and already in `.gitignore`. Never commit it.
3. Submit:

```bash
npx eas-cli build --platform android --profile production
npx eas-cli submit --platform android --profile production   # internal track
```

EAS can create the *first* release itself; no manual AAB upload is needed.

The `production` submit profile targets the **internal** track, which is also what a
bare `eas submit` does by default. Promoting a release from internal to closed, open, or
production testing is done in the Play Console, not by re-submitting the AAB.

For CI there is `.github/workflows/play-submit.yml`. It is `workflow_dispatch` only, so a
Play upload can never happen as a side effect of pushing a tag, and it builds and submits
in a single `eas build --auto-submit` call so the binary submitted is the one just built.
It needs two repository secrets:

- `EXPO_TOKEN` — already used by the APK release workflow;
- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` — the full contents of the service account JSON key.

It builds whatever version `app.json` holds, which `release-apk.yml` keeps in sync with
the latest release tag. So the order for a versioned Play release is: publish the GitHub
release first, then dispatch this workflow.

### 4. Store listing assets

| Asset | Spec |
|---|---|
| App icon | 512 × 512, 32-bit PNG with alpha, ≤ 1 MB |
| Feature graphic | 1024 × 500, JPEG or 24-bit PNG, **no** alpha, ≤ 1 MB |
| Phone screenshots | 2–8, 9:16 or 16:9, 320–3840 px per side, ≤ 8 MB each |
| Tablet screenshots | ≥ 4 if you list tablet support (`ios.supportsTablet` is on; Android tablets are worth listing too) |
| App name | ≤ 30 characters |
| Short description | ≤ 80 characters |
| Full description | ≤ 4000 characters |

From **31 March 2026** Play renders listing icons with a 30% corner radius, so keep the
mark inside roughly 15–18% padding. `assets/logo.svg` is the source to export from.

Metadata policy: no emoji, no ALL CAPS, no "free" / "#1" / "best", and no
"download now"-style calls to action in the title or short description.

### 5. Declarations

- **Privacy policy URL** — required even though the app collects nothing. Point it at
  `PRIVACY.md` in the public repo, or enable GitHub Pages for a nicer URL.
- **Data safety form** — answer *no data collected* and *no data shared*: WCA data comes
  from a public API, ZIPs and PDFs never leave the device, and passwords are memory-only.
- **Content rating** questionnaire (IARC) — utility app, no objectionable content.
- **Target audience** — 13+; not designed for children.
- **Ads** — none.
- News, financial, health and government declarations — all no.

### 6. One content caution

The app handles official competition scrambles, so the listing must not imply WCA
endorsement. Do not use WCA marks in the icon, title, or graphics, and state plainly in
the description that the app is unofficial and not affiliated with the World Cube
Association.

## Release order

1. Register the account and get the closed test running with 12 testers — the 14-day
   clock only starts once the release is live and 12 testers have opted in.
2. Build and submit to the internal track, then promote to closed testing.
3. Prepare listing assets and declarations while the 14 days run.
4. Apply for production access, then promote the release.

## References

- [Target API level requirements](https://support.google.com/googleplay/android-developer/answer/11926878)
- [Meet Play's target API level requirement](https://developer.android.com/google/play/requirements/target-sdk)
- [Support 16 KB page sizes](https://developer.android.com/guide/practices/page-sizes)
- [Testing requirements for new personal accounts](https://support.google.com/googleplay/android-developer/answer/14151465)
- [EAS Submit for Android](https://docs.expo.dev/submit/android/)
- [eas.json reference](https://docs.expo.dev/eas/json/)
- [Expo app config reference](https://docs.expo.dev/versions/v56.0.0/config/app/)
- [Store listing best practices](https://support.google.com/googleplay/android-developer/answer/13393723)
