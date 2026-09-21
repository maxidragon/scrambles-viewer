import { useCallback, useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Sidebar } from "./components/Sidebar";
import { useZipImport } from "./import/useZipImport";
import { hasTauriBridge } from "./platform/tauri";
import { CompetitionProvider, useCompetition } from "./store/CompetitionContext";
import { Viewer } from "./viewer/Viewer";
import { actionForKey } from "./viewer/keyboard";
import {
  EMPTY_VIEWER_STATE,
  closeSet,
  forgetPassword,
  lockAll,
  lockStateFor,
  openSet,
  type ViewerState,
} from "./viewer/viewerState";

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 4;
const ZOOM_STEP = 1.25;

function isTextField(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
}

function Layout(): React.JSX.Element {
  const { sets } = useCompetition();
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [viewer, setViewer] = useState<ViewerState>(EMPTY_VIEWER_STATE);
  const [zoom, setZoom] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const zipImport = useZipImport();

  // Navigation is where the lock rules apply: leaving a set starts its timer, and the
  // set being opened is either still unlocked, expired (forget it), or locked.
  const goTo = useCallback(
    (index: number) => {
      const next = sets[index];
      if (next === undefined) return;
      const now = Date.now();
      setViewer((state) => {
        let s = state;
        const previous = currentIndex === null ? undefined : sets[currentIndex];
        if (previous !== undefined && currentIndex !== index) s = closeSet(s, previous.name, now);
        const lock = lockStateFor(s, next.name, now);
        if (lock === "expired") s = forgetPassword(s, next.name);
        if (lock === "unlocked") s = openSet(s, next.name);
        return s;
      });
      setCurrentIndex(index);
    },
    [sets, currentIndex],
  );

  const zoomBy = useCallback((factor: number) => {
    setZoom((z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z * factor)));
  }, []);

  const toggleFullscreen = useCallback(() => setFullscreen((f) => !f), []);

  useEffect(() => {
    if (!hasTauriBridge()) return;
    void getCurrentWindow().setFullscreen(fullscreen);
  }, [fullscreen]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const action = actionForKey({
        key: e.key,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey,
        altKey: e.altKey,
        inTextField: isTextField(e.target),
      });
      if (action === null) return;
      if (action === "escape") {
        if (fullscreen) setFullscreen(false);
        return;
      }
      e.preventDefault();
      if (action === "next-set" && currentIndex !== null) goTo(currentIndex + 1);
      if (action === "prev-set" && currentIndex !== null) goTo(currentIndex - 1);
      if (action === "zoom-in") zoomBy(ZOOM_STEP);
      if (action === "zoom-out") zoomBy(1 / ZOOM_STEP);
      if (action === "zoom-reset") setZoom(1);
      if (action === "toggle-fullscreen") toggleFullscreen();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentIndex, fullscreen, goTo, zoomBy, toggleFullscreen]);

  const onPdfsCleared = useCallback(() => {
    setViewer(lockAll());
    setCurrentIndex(null);
  }, []);

  // Tauri's own drag-drop handler is off (tauri.conf.json), so the webview gets the
  // file's bytes directly and no file-system permission is needed for the picked ZIP.
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file !== undefined && e.dataTransfer.files.length === 1) void zipImport.importFile(file);
  };

  // Held passcodes, as on mobile; expiry is applied when a set is opened, in goTo.
  const unlockedSetNames = new Set(Object.keys(viewer.passwords));

  return (
    <div
      className={`layout${dragging ? " layout-dragging" : ""}${fullscreen ? " layout-fullscreen" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDragging(false);
      }}
      onDrop={onDrop}
    >
      {!fullscreen && (
        <Sidebar
          currentIndex={currentIndex}
          onOpenSet={goTo}
          zipImport={zipImport}
          unlockedSetNames={unlockedSetNames}
          onPdfsCleared={onPdfsCleared}
        />
      )}
      {currentIndex === null ? (
        <main className="main-pane">
          <div className="empty">Select a scramble set.</div>
        </main>
      ) : (
        <Viewer
          sets={sets}
          currentIndex={currentIndex}
          viewer={viewer}
          onViewerChange={setViewer}
          onNavigate={goTo}
          zoom={zoom}
          onZoomBy={zoomBy}
          fullscreen={fullscreen}
          onToggleFullscreen={toggleFullscreen}
          onLockAll={() => setViewer(lockAll())}
        />
      )}
      {dragging && <div className="drop-hint">Drop the scrambles ZIP to import it</div>}
    </div>
  );
}

export function App(): React.JSX.Element {
  return (
    <CompetitionProvider>
      <Layout />
    </CompetitionProvider>
  );
}
