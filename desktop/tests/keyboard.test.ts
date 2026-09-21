import { describe, expect, it } from "vitest";
import { actionForKey, type KeyPress } from "../src/viewer/keyboard";

function press(key: string, mods: Partial<KeyPress> = {}): KeyPress {
  return { key, ctrlKey: false, metaKey: false, altKey: false, inTextField: false, ...mods };
}

describe("actionForKey", () => {
  it("moves between sets with the arrows in both directions", () => {
    expect(actionForKey(press("ArrowRight"))).toBe("next-set");
    expect(actionForKey(press("ArrowLeft"))).toBe("prev-set");
  });

  it("leaves the arrows to a text field", () => {
    expect(actionForKey(press("ArrowRight", { inTextField: true }))).toBeNull();
  });

  it("zooms with the primary modifier, on either keyboard's plus", () => {
    expect(actionForKey(press("+", { metaKey: true }))).toBe("zoom-in");
    expect(actionForKey(press("=", { ctrlKey: true }))).toBe("zoom-in");
    expect(actionForKey(press("-", { ctrlKey: true }))).toBe("zoom-out");
    expect(actionForKey(press("0", { metaKey: true }))).toBe("zoom-reset");
    expect(actionForKey(press("-"))).toBeNull();
  });

  it("toggles fullscreen with F11 or Ctrl+Cmd+F, and Escape is its own action", () => {
    expect(actionForKey(press("F11"))).toBe("toggle-fullscreen");
    expect(actionForKey(press("f", { ctrlKey: true, metaKey: true }))).toBe("toggle-fullscreen");
    expect(actionForKey(press("Escape", { inTextField: true }))).toBe("escape");
  });
});
