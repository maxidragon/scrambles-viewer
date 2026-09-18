import { describe, expect, it } from "vitest";
import { SET_LOCK_TIMEOUT_MS } from "@shared/utils/setLock";
import {
  EMPTY_VIEWER_STATE,
  closeSet,
  forgetPassword,
  lockAll,
  lockStateFor,
  openSet,
  rememberPassword,
} from "../src/viewer/viewerState";

const t0 = 1_800_000_000_000;

describe("viewer state", () => {
  it("is locked until a passcode is remembered, then unlocked", () => {
    expect(lockStateFor(EMPTY_VIEWER_STATE, "A", t0)).toBe("locked");
    expect(lockStateFor(rememberPassword(EMPTY_VIEWER_STATE, "A", "pw"), "A", t0)).toBe("unlocked");
  });

  it("stays unlocked when reopened within the timeout after moving away", () => {
    let s = rememberPassword(EMPTY_VIEWER_STATE, "A", "pw");
    s = closeSet(s, "A", t0);
    expect(lockStateFor(s, "A", t0 + SET_LOCK_TIMEOUT_MS - 1)).toBe("unlocked");
  });

  it("expires once closed for the timeout", () => {
    let s = rememberPassword(EMPTY_VIEWER_STATE, "A", "pw");
    s = closeSet(s, "A", t0);
    expect(lockStateFor(s, "A", t0 + SET_LOCK_TIMEOUT_MS)).toBe("expired");
  });

  it("never expires while open, and restarts the timer on each close", () => {
    let s = rememberPassword(EMPTY_VIEWER_STATE, "A", "pw");
    s = closeSet(s, "A", t0);
    s = openSet(s, "A");
    expect(lockStateFor(s, "A", t0 + 10 * SET_LOCK_TIMEOUT_MS)).toBe("unlocked");
    s = closeSet(s, "A", t0 + 10 * SET_LOCK_TIMEOUT_MS);
    expect(lockStateFor(s, "A", t0 + 11 * SET_LOCK_TIMEOUT_MS - 1)).toBe("unlocked");
  });

  it("forgets one set's passcode without touching another's", () => {
    let s = rememberPassword(EMPTY_VIEWER_STATE, "A", "pw-a");
    s = rememberPassword(s, "B", "pw-b");
    s = forgetPassword(s, "A");
    expect(lockStateFor(s, "A", t0)).toBe("locked");
    expect(lockStateFor(s, "B", t0)).toBe("unlocked");
  });

  it("lock all forgets everything", () => {
    const s = rememberPassword(rememberPassword(EMPTY_VIEWER_STATE, "A", "a"), "B", "b");
    expect(lockAll()).toEqual(EMPTY_VIEWER_STATE);
    expect(lockStateFor(lockAll(), "A", t0)).toBe("locked");
    expect(s.passwords).toEqual({ A: "a", B: "b" });
  });
});
