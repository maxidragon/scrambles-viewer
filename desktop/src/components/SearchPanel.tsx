import { useEffect, useRef, useState } from "react";
import type { Competition } from "@shared/types/wcif";
import { fetchWCIF, searchCompetitions } from "@shared/api/wca";
import { useCompetition } from "../store/CompetitionContext";

const DEBOUNCE_MS = 500;

interface Props {
  onClose(): void;
  onError(text: string): void;
}

function formatDates(start: string, end: string): string {
  const s = new Date(start).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const e = new Date(end).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${s} – ${e}`;
}

export function SearchPanel({ onClose, onError }: Props): React.JSX.Element {
  const { selectCompetition } = useCompetition();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Competition[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);
  const [selecting, setSelecting] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed === "") return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const found = await searchCompetitions(trimmed);
        if (!cancelled) {
          setResults(found);
          setSearchFailed(false);
        }
      } catch {
        if (!cancelled) setSearchFailed(true);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const select = async (comp: Competition) => {
    setSelecting(comp.id);
    try {
      const wcif = await fetchWCIF(comp.id);
      await selectCompetition(comp.id, comp.name, wcif);
      onClose();
    } catch {
      onError(`Could not load ${comp.name}. Check your connection and try again.`);
      setSelecting(null);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    const first = results[0];
    if (e.key === "Enter" && first !== undefined && selecting === null) void select(first);
  };

  const trimmed = query.trim();

  return (
    <div className="search-panel" onKeyDown={onKeyDown}>
      <div className="search-bar">
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value.trim() === "") {
              setResults([]);
              setSearchFailed(false);
            }
          }}
          placeholder="Search competitions…"
          autoComplete="off"
          spellCheck={false}
          aria-label="Search competitions"
        />
        <button type="button" className="btn btn-quiet" onClick={onClose}>
          Cancel
        </button>
      </div>
      {searching && <div className="search-status">Searching…</div>}
      {!searching && searchFailed && (
        <div className="search-status search-error">Search failed. Check your connection.</div>
      )}
      {!searching && !searchFailed && trimmed !== "" && results.length === 0 && (
        <div className="search-status">No competitions found</div>
      )}
      <ul className="search-results">
        {results.map((comp) => (
          <li key={comp.id}>
            <button
              type="button"
              className="search-result"
              disabled={selecting !== null}
              onClick={() => void select(comp)}
            >
              <span className="search-result-name">{comp.name}</span>
              <span className="search-result-meta">
                {comp.city}, {comp.country_iso2} · {formatDates(comp.start_date, comp.end_date)}
              </span>
              {selecting === comp.id && <span className="search-result-loading">Loading…</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
