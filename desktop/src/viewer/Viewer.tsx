import { useCallback, useEffect, useState } from "react";
import type { ScrambleSet } from "@shared/types/wcif";
import { pdfFiles } from "../platform/pdfFiles";
import { PasswordPrompt } from "./PasswordPrompt";
import { PdfPane } from "./PdfPane";
import { openPdf, type OpenOutcome } from "./pdfDocument";
import { forgetPassword, rememberPassword, type ViewerState } from "./viewerState";

interface Props {
  sets: ScrambleSet[];
  currentIndex: number;
  viewer: ViewerState;
  onViewerChange(update: (state: ViewerState) => ViewerState): void;
  onNavigate(index: number): void;
  zoom: number;
  onZoomBy(factor: number): void;
  fullscreen: boolean;
  onToggleFullscreen(): void;
  onLockAll(): void;
}

export function Viewer(props: Props): React.JSX.Element {
  const { sets, currentIndex, fullscreen, onNavigate, onToggleFullscreen, onLockAll, viewer } = props;
  const set = sets[currentIndex];
  if (set === undefined) return <main className="main-pane" />;
  const unlocked = viewer.passwords[set.name] !== undefined;

  return (
    <main className={`main-pane${fullscreen ? " main-pane-fullscreen" : ""}`}>
      {fullscreen ? (
        <div className="fullscreen-overlay">
          <span className="viewer-set-name">{set.name}</span>
          <span className="viewer-counter">
            {currentIndex + 1} / {sets.length}
          </span>
        </div>
      ) : (
        <div className="viewer-toolbar">
          <span className="viewer-set-name" title={set.name}>
            {set.name}
          </span>
          <span className="viewer-counter">
            {currentIndex + 1} / {sets.length}
          </span>
          <button type="button" className="btn btn-quiet" onClick={() => onNavigate(currentIndex - 1)} disabled={currentIndex === 0}>
            ← Prev
          </button>
          <button
            type="button"
            className="btn btn-quiet"
            onClick={() => onNavigate(currentIndex + 1)}
            disabled={currentIndex === sets.length - 1}
          >
            Next →
          </button>
          <button
            type="button"
            className="btn btn-quiet"
            title={unlocked ? "Forget this set's password" : "No password held"}
            disabled={!unlocked}
            onClick={() => props.onViewerChange((s) => forgetPassword(s, set.name))}
          >
            {unlocked ? "🔑 Lock" : "🔒"}
          </button>
          <button type="button" className="btn btn-quiet" onClick={onLockAll} title="Forget every password">
            Lock all
          </button>
          <button type="button" className="btn btn-quiet" onClick={onToggleFullscreen} title="Fullscreen (F11)">
            ⛶
          </button>
        </div>
      )}
      <SetView key={currentIndex} set={set} {...props} />
    </main>
  );
}

type Loaded = { kind: "loading" } | { kind: "error"; message: string } | Exclude<OpenOutcome, { kind: "wrong-password" }>;

function SetView({ set, viewer, onViewerChange, zoom, onZoomBy }: Props & { set: ScrambleSet }): React.JSX.Element {
  const password = viewer.passwords[set.name] ?? null;
  const [loaded, setLoaded] = useState<Loaded>({ kind: "loading" });
  const [promptDismissed, setPromptDismissed] = useState(false);
  const [wrongAttempt, setWrongAttempt] = useState(false);
  const pdfPath = set.pdfPath;

  useEffect(() => {
    if (pdfPath == null) return;
    let cancelled = false;
    let outcome: OpenOutcome | null = null;
    pdfFiles()
      .read(pdfPath)
      .then((bytes) => openPdf(bytes, password))
      .then((result) => {
        if (cancelled) {
          if (result.kind === "open") void result.close();
          return;
        }
        if (result.kind === "wrong-password") {
          // Forget the bad passcode so the list stops showing the set as unlocked; that
          // reruns this effect without a password, which ends in the prompt with the error.
          setWrongAttempt(true);
          onViewerChange((s) => forgetPassword(s, set.name));
          return;
        }
        outcome = result;
        setLoaded(result);
      })
      .catch((e: unknown) => {
        if (!cancelled) setLoaded({ kind: "error", message: e instanceof Error ? e.message : String(e) });
      });
    return () => {
      cancelled = true;
      if (outcome?.kind === "open") void outcome.close();
    };
  }, [pdfPath, password, set.name, onViewerChange]);

  const submitPassword = useCallback(
    (entered: string) => {
      setWrongAttempt(false);
      setPromptDismissed(false);
      setLoaded({ kind: "loading" });
      onViewerChange((s) => rememberPassword(s, set.name, entered));
    },
    [onViewerChange, set.name],
  );

  if (pdfPath == null) {
    return (
      <div className="empty">
        No PDF loaded for this set.
        <br />
        Load the scrambles ZIP from the sidebar.
      </div>
    );
  }
  if (loaded.kind === "loading") return <div className="empty">Loading…</div>;
  if (loaded.kind === "error") return <div className="empty">Could not open this PDF: {loaded.message}</div>;
  if (loaded.kind === "open") return <PdfPane document={loaded.document} zoom={zoom} onZoomBy={onZoomBy} />;

  return (
    <div className="empty">
      Enter the password to view this set.
      <button type="button" className="btn prompt-reopen" onClick={() => setPromptDismissed(false)}>
        Enter password
      </button>
      {!promptDismissed && (
        <PasswordPrompt
          setName={set.name}
          wrongPassword={wrongAttempt}
          onSubmit={submitPassword}
          onCancel={() => setPromptDismissed(true)}
        />
      )}
    </div>
  );
}
