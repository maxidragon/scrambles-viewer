export type ViewerAction =
  | "next-set"
  | "prev-set"
  | "zoom-in"
  | "zoom-out"
  | "zoom-reset"
  | "toggle-fullscreen"
  | "escape";

export interface KeyPress {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  /** True when the key event originated in a text field, where arrows edit text. */
  inTextField: boolean;
}

/**
 * The viewer's keyboard map. Arrow keys move between sets in both directions —
 * a keypress is deliberate in a way a stray swipe on a phone is not (SPEC-004).
 */
export function actionForKey(press: KeyPress): ViewerAction | null {
  const primary = press.ctrlKey || press.metaKey;
  if (press.key === "Escape") return "escape";
  if (press.key === "F11") return "toggle-fullscreen";
  if (press.ctrlKey && press.metaKey && press.key.toLowerCase() === "f") return "toggle-fullscreen";
  if (primary && (press.key === "+" || press.key === "=")) return "zoom-in";
  if (primary && press.key === "-") return "zoom-out";
  if (primary && press.key === "0") return "zoom-reset";
  if (press.inTextField || primary || press.altKey) return null;
  if (press.key === "ArrowRight") return "next-set";
  if (press.key === "ArrowLeft") return "prev-set";
  return null;
}
