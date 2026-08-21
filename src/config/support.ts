/**
 * Donation / "support the developer" links.
 *
 * These are compiled out of the Google Play build. Google Play's Payments policy
 * only exempts *tax-exempt* donations from Google Play Billing; in-app links to
 * Patreon / Ko-fi / GitHub Sponsors for a non-charity developer have been treated
 * as a Payments policy violation (see docs/PLAY_STORE.md). The GitHub-release APK
 * is not distributed through Play, so it is free to ask.
 *
 * Both values come from `EXPO_PUBLIC_` variables, which Metro inlines at build
 * time — so this is a real compile-time switch, and the donation URL is not merely
 * unused in the Play build, it is never compiled into it. The per-profile values
 * live in eas.json; .env files are gitignored so they can never reach an EAS build
 * and override them.
 */
export const SUPPORT_LINKS_ENABLED = process.env.EXPO_PUBLIC_SUPPORT_LINKS === '1';

/** Donation page. Set per build profile in eas.json; empty in the Play build. */
export const SUPPORT_URL = process.env.EXPO_PUBLIC_SUPPORT_URL ?? '';

/** Both halves have to be present for anything to be shown or opened. */
export const SUPPORT_AVAILABLE = SUPPORT_LINKS_ENABLED && SUPPORT_URL.length > 0;
