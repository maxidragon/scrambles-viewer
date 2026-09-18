import { useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { useZipImport } from "./import/useZipImport";
import { CompetitionProvider, useCompetition } from "./store/CompetitionContext";

function MainPane({ currentIndex }: { currentIndex: number | null }): React.JSX.Element {
  const { sets } = useCompetition();
  const set = currentIndex === null ? undefined : sets[currentIndex];
  return (
    <main className="main-pane">
      <div className="empty">{set === undefined ? "Select a scramble set." : set.name}</div>
    </main>
  );
}

function Layout(): React.JSX.Element {
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const zipImport = useZipImport();

  // Tauri's own drag-drop handler is off (tauri.conf.json), so the webview gets the
  // file's bytes directly and no file-system permission is needed for the picked ZIP.
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file !== undefined && e.dataTransfer.files.length === 1) void zipImport.importFile(file);
  };

  return (
    <div
      className={`layout${dragging ? " layout-dragging" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDragging(false);
      }}
      onDrop={onDrop}
    >
      <Sidebar currentIndex={currentIndex} onOpenSet={setCurrentIndex} zipImport={zipImport} />
      <MainPane currentIndex={currentIndex} />
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
