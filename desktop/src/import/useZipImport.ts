import { useCallback, useState } from "react";
import { useCompetition } from "../store/CompetitionContext";
import { ImportError } from "./archive";
import { importZip } from "./importZip";

export interface ImportOutcome {
  matched: number;
  total: number;
  unmatched: string[];
}

export interface ZipImport {
  importing: boolean;
  outcome: ImportOutcome | null;
  error: string | null;
  importFile(file: File): Promise<void>;
  dismiss(): void;
}

export function useZipImport(): ZipImport {
  const { sets, replaceSets } = useCompetition();
  const [importing, setImporting] = useState(false);
  const [outcome, setOutcome] = useState<ImportOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);

  const importFile = useCallback(
    async (file: File) => {
      if (importing) return;
      setOutcome(null);
      setError(null);
      if (sets.length === 0) {
        setError("Select a competition first, then load its scrambles ZIP.");
        return;
      }
      if (!file.name.toLowerCase().endsWith(".zip")) {
        setError(`${file.name} is not a ZIP file.`);
        return;
      }
      setImporting(true);
      try {
        const result = await importZip(new Uint8Array(await file.arrayBuffer()), sets);
        await replaceSets(result.sets);
        setOutcome({ matched: result.matched, total: result.total, unmatched: result.unmatched });
      } catch (e: unknown) {
        if (e instanceof ImportError) setError(e.message);
        else throw e;
      } finally {
        setImporting(false);
      }
    },
    [importing, sets, replaceSets],
  );

  const dismiss = useCallback(() => {
    setOutcome(null);
    setError(null);
  }, []);

  return { importing, outcome, error, importFile, dismiss };
}
