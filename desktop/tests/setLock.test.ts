import { describe, expect, it } from "vitest";
import { SET_LOCK_TIMEOUT_MS, getSetLockState, isSetLockExpired } from "@shared/utils/setLock";

const now = 1_800_000_000_000;

describe("isSetLockExpired", () => {
  it("never expires a set that is open", () => {
    expect(isSetLockExpired(undefined, now)).toBe(false);
  });

  it("expires exactly at the timeout, not before", () => {
    expect(isSetLockExpired(now - SET_LOCK_TIMEOUT_MS + 1, now)).toBe(false);
    expect(isSetLockExpired(now - SET_LOCK_TIMEOUT_MS, now)).toBe(true);
  });
});

describe("getSetLockState", () => {
  it("is locked without a password regardless of timestamps", () => {
    expect(getSetLockState(false, undefined, now)).toBe("locked");
    expect(getSetLockState(false, now - 1, now)).toBe("locked");
  });

  it("is unlocked with a password while open or recently closed", () => {
    expect(getSetLockState(true, undefined, now)).toBe("unlocked");
    expect(getSetLockState(true, now - 1000, now)).toBe("unlocked");
  });

  it("is expired with a password once closed for the timeout", () => {
    expect(getSetLockState(true, now - SET_LOCK_TIMEOUT_MS, now)).toBe("expired");
  });
});
