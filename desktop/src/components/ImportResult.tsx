import type { ZipImport } from "../import/useZipImport";

export function ImportResult({ zipImport }: { zipImport: ZipImport }): React.JSX.Element | null {
  const { outcome, error, dismiss } = zipImport;
  if (error !== null) {
    return (
      <div className="notice notice-error" role="alert">
        <span className="notice-text">{error}</span>
        <button type="button" className="notice-close" onClick={dismiss} aria-label="Dismiss">
          ×
        </button>
      </div>
    );
  }
  if (outcome === null) return null;
  const allMatched = outcome.unmatched.length === 0;
  return (
    <div className={`notice ${allMatched ? "notice-info" : "notice-warn"}`} role="status">
      <div className="notice-text">
        Matched {outcome.matched} of {outcome.total} PDFs.
        {!allMatched && (
          <details className="unmatched">
            <summary>{outcome.unmatched.length} not matched to any set</summary>
            <ul>
              {outcome.unmatched.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </details>
        )}
      </div>
      <button type="button" className="notice-close" onClick={dismiss} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}
