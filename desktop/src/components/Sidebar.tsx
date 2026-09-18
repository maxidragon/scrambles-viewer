import { useMemo, useRef, useState } from "react";
import { fetchWCIF } from "@shared/api/wca";
import { getVenueTimezone } from "@shared/utils/schedule";
import { useCompetition } from "../store/CompetitionContext";
import { groupSetsByRound, withoutPdfs } from "../store/sets";
import { clearPdfs } from "../import/importZip";
import type { ZipImport } from "../import/useZipImport";
import { ImportResult } from "./ImportResult";
import { Notice, type NoticeMessage } from "./Notice";
import { SearchPanel } from "./SearchPanel";
import { SetList } from "./SetList";

interface Props {
  currentIndex: number | null;
  onOpenSet(index: number): void;
  zipImport: ZipImport;
}

type Confirming = "reset" | "clear-pdfs" | null;

export function Sidebar({ currentIndex, onOpenSet, zipImport }: Props): React.JSX.Element {
  const { ready, competitionId, competitionName, wcif, sets, syncWcif, replaceSets, reset } = useCompetition();
  const [searchOpen, setSearchOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [confirming, setConfirming] = useState<Confirming>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState<NoticeMessage | null>(null);

  const timezone = wcif === null ? "UTC" : getVenueTimezone(wcif);
  const groups = useMemo(() => groupSetsByRound(sets, timezone), [sets, timezone]);
  const loadedCount = sets.filter((s) => s.pdfPath != null).length;

  const sync = async () => {
    if (competitionId === null) return;
    setSyncing(true);
    try {
      await syncWcif(await fetchWCIF(competitionId));
      setNotice({ kind: "info", text: "Schedule updated." });
    } catch {
      setNotice({ kind: "error", text: "Sync failed. Check your connection; the loaded schedule is unchanged." });
    } finally {
      setSyncing(false);
    }
  };

  const confirmReset = async () => {
    setConfirming(null);
    await clearPdfs();
    await reset();
    zipImport.dismiss();
    setNotice(null);
  };

  const confirmClearPdfs = async () => {
    setConfirming(null);
    await clearPdfs();
    await replaceSets(withoutPdfs(sets));
    zipImport.dismiss();
  };

  const onFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file !== undefined) void zipImport.importFile(file);
  };

  if (!ready) return <aside className="sidebar" />;

  return (
    <aside className="sidebar">
      <header className="comp-header">
        {competitionName === null ? (
          <span className="comp-none">No competition selected</span>
        ) : (
          <>
            <span className="comp-name">{competitionName}</span>
            <span className="comp-id">{competitionId}</span>
          </>
        )}
      </header>

      {searchOpen ? (
        <SearchPanel
          onClose={() => setSearchOpen(false)}
          onError={(text) => setNotice({ kind: "error", text })}
        />
      ) : (
        <div className="actions">
          <button type="button" className="btn" onClick={() => setSearchOpen(true)}>
            Search
          </button>
          {competitionId !== null && (
            <>
              <button type="button" className="btn" onClick={() => void sync()} disabled={syncing}>
                {syncing ? "Syncing…" : "Sync"}
              </button>
              <button type="button" className="btn btn-danger" onClick={() => setConfirming("reset")}>
                Reset
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => fileInput.current?.click()}
                disabled={zipImport.importing}
              >
                {zipImport.importing ? "Importing…" : "Load ZIP"}
              </button>
              <input ref={fileInput} type="file" accept=".zip,application/zip" hidden onChange={onFilePicked} />
              {loadedCount > 0 && (
                <button type="button" className="btn btn-secondary" onClick={() => setConfirming("clear-pdfs")}>
                  Clear PDFs
                </button>
              )}
            </>
          )}
        </div>
      )}

      {confirming !== null && (
        <div className="confirm">
          <span>
            {confirming === "reset"
              ? "Clear this competition and all extracted PDFs?"
              : "Remove all extracted PDFs? The schedule stays."}
          </span>
          <div className="confirm-actions">
            <button type="button" className="btn btn-quiet" onClick={() => setConfirming(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => void (confirming === "reset" ? confirmReset() : confirmClearPdfs())}
            >
              {confirming === "reset" ? "Reset" : "Clear"}
            </button>
          </div>
        </div>
      )}

      <Notice notice={notice} onDismiss={() => setNotice(null)} />
      <ImportResult zipImport={zipImport} />

      {sets.length > 0 && (
        <div className="status-bar">
          {loadedCount}/{sets.length} PDFs loaded
        </div>
      )}

      {groups.length > 0 ? (
        <SetList sets={sets} groups={groups} currentIndex={currentIndex} onOpen={onOpenSet} />
      ) : (
        <div className="empty">
          {competitionId === null ? "Search for a WCA competition to get started." : "No schedule data yet. Try Sync."}
        </div>
      )}
    </aside>
  );
}
