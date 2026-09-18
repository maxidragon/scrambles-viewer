import { getSetLockState, type SetLockState } from "@shared/utils/setLock";

/**
 * Everything the viewer knows about passcodes. Memory only, never persisted.
 * A set has a `closedAt` timestamp while it is not on screen; an open set has none.
 */
export interface ViewerState {
  passwords: Readonly<Record<string, string>>;
  closedAt: Readonly<Record<string, number>>;
}

export const EMPTY_VIEWER_STATE: ViewerState = { passwords: {}, closedAt: {} };

function omit<T>(record: Readonly<Record<string, T>>, key: string): Readonly<Record<string, T>> {
  if (!(key in record)) return record;
  const { [key]: _removed, ...rest } = record;
  return rest;
}

export function lockStateFor(state: ViewerState, setName: string, now: number): SetLockState {
  return getSetLockState(state.passwords[setName] !== undefined, state.closedAt[setName], now);
}

/** Moving away from a set starts its lock timer. */
export function closeSet(state: ViewerState, setName: string, now: number): ViewerState {
  return { ...state, closedAt: { ...state.closedAt, [setName]: now } };
}

/** Showing a set stops its timer; it cannot expire under the operator's eyes. */
export function openSet(state: ViewerState, setName: string): ViewerState {
  return { ...state, closedAt: omit(state.closedAt, setName) };
}

/** Unlocking counts as opening. */
export function rememberPassword(state: ViewerState, setName: string, password: string): ViewerState {
  return { passwords: { ...state.passwords, [setName]: password }, closedAt: omit(state.closedAt, setName) };
}

export function forgetPassword(state: ViewerState, setName: string): ViewerState {
  return { passwords: omit(state.passwords, setName), closedAt: omit(state.closedAt, setName) };
}

export function lockAll(): ViewerState {
  return EMPTY_VIEWER_STATE;
}
