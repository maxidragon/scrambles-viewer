export type NoticeKind = "info" | "error";

export interface NoticeMessage {
  kind: NoticeKind;
  text: string;
}

interface Props {
  notice: NoticeMessage | null;
  onDismiss(): void;
}

export function Notice({ notice, onDismiss }: Props): React.JSX.Element | null {
  if (notice === null) return null;
  return (
    <div className={`notice notice-${notice.kind}`} role={notice.kind === "error" ? "alert" : "status"}>
      <span className="notice-text">{notice.text}</span>
      <button type="button" className="notice-close" onClick={onDismiss} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}
