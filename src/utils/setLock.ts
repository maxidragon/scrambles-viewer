/**
 * How long a scramble set stays unlocked after it is closed. Swiping (or tapping)
 * to another set counts as closing the one you left; coming back to a set within
 * this window still shows it, and closing it again restarts the countdown.
 */
export const SET_LOCK_TIMEOUT_MS = 30 * 60 * 1000;

/**
 * Whether a set's password should be required again.
 *
 * `closedAt` is undefined while the set is open — an open set never expires under
 * the operator's eyes; the clock only runs once they move away from it.
 */
export function isSetLockExpired(closedAt: number | undefined, now: number = Date.now()): boolean {
  return closedAt !== undefined && now - closedAt >= SET_LOCK_TIMEOUT_MS;
}

/**
 * What should happen when a set is opened.
 *
 * - `unlocked` — the password is known and still valid; show the PDF.
 * - `expired`  — it was known but the set sat closed too long; forget it and re-prompt.
 * - `locked`   — no password known; prompt as usual.
 */
export type SetLockState = 'unlocked' | 'expired' | 'locked';

export function getSetLockState(
  hasPassword: boolean,
  closedAt: number | undefined,
  now: number = Date.now(),
): SetLockState {
  if (!hasPassword) return 'locked';
  return isSetLockExpired(closedAt, now) ? 'expired' : 'unlocked';
}
