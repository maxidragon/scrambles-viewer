/**
 * Decides when to ask the user to consider supporting the app.
 *
 * The app is used at live competitions, so the one thing this must never do is
 * interrupt someone mid-round. Two rules keep it out of the way: the prompt only
 * lives on the home screen (never the viewer), and it stays quiet for a day after
 * the last ZIP import, so it surfaces after a competition rather than during one.
 */

/** Competitions' worth of use before asking anything. */
export const MIN_ZIP_LOADS = 2;

/** Quiet period after a ZIP import, so the prompt never lands during a competition. */
export const QUIET_AFTER_ZIP_MS = 24 * 60 * 60 * 1000;

/** How long "Not now" holds it off. */
export const SNOOZE_MS = 60 * 24 * 60 * 60 * 1000;

export interface SupportPromptState {
  /** Successful ZIP imports, all-time. */
  zipLoads: number;
  /** Epoch ms of the last successful ZIP import, if any. */
  lastZipLoadAt?: number;
  /** Epoch ms before which the prompt stays hidden. */
  snoozedUntil?: number;
  /** Set once the user donates or asks not to be asked again. */
  optedOut: boolean;
}

export const INITIAL_SUPPORT_PROMPT_STATE: SupportPromptState = {
  zipLoads: 0,
  optedOut: false,
};

export function shouldShowSupportPrompt(
  enabled: boolean,
  state: SupportPromptState,
  now: number = Date.now(),
): boolean {
  if (!enabled || state.optedOut) return false;
  if (state.zipLoads < MIN_ZIP_LOADS) return false;
  if (state.snoozedUntil !== undefined && now < state.snoozedUntil) return false;
  // Still at the competition — don't interrupt.
  if (state.lastZipLoadAt !== undefined && now - state.lastZipLoadAt < QUIET_AFTER_ZIP_MS) {
    return false;
  }
  return true;
}

export function snooze(state: SupportPromptState, now: number = Date.now()): SupportPromptState {
  return { ...state, snoozedUntil: now + SNOOZE_MS };
}

export function optOut(state: SupportPromptState): SupportPromptState {
  return { ...state, optedOut: true };
}

export function recordZipLoad(
  state: SupportPromptState,
  now: number = Date.now(),
): SupportPromptState {
  return { ...state, zipLoads: state.zipLoads + 1, lastZipLoadAt: now };
}
