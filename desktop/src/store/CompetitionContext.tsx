import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { ScrambleSet, WCIF } from "@shared/types/wcif";
import { buildOrderedSets } from "@shared/utils/schedule";
import { clearCompetition, loadCompetition, saveCompetition, saveSets } from "./persistence";
import { mergeSetsKeepingPdfs } from "./sets";

export interface CompetitionState {
  /** Null until the persisted state has been read, so the empty state never flashes first. */
  ready: boolean;
  competitionId: string | null;
  competitionName: string | null;
  wcif: WCIF | null;
  sets: ScrambleSet[];
  selectCompetition(id: string, name: string, wcif: WCIF): Promise<void>;
  syncWcif(wcif: WCIF): Promise<void>;
  replaceSets(sets: ScrambleSet[]): Promise<void>;
  reset(): Promise<void>;
}

const Ctx = createContext<CompetitionState | null>(null);

export function CompetitionProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [ready, setReady] = useState(false);
  const [competitionId, setCompetitionId] = useState<string | null>(null);
  const [competitionName, setCompetitionName] = useState<string | null>(null);
  const [wcif, setWcif] = useState<WCIF | null>(null);
  const [sets, setSets] = useState<ScrambleSet[]>([]);

  useEffect(() => {
    let cancelled = false;
    loadCompetition()
      .then((stored) => {
        if (cancelled || stored === null) return;
        setCompetitionId(stored.competitionId);
        setCompetitionName(stored.competitionName);
        setWcif(stored.wcif);
        setSets(stored.sets);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectCompetition = useCallback(async (id: string, name: string, newWcif: WCIF) => {
    const newSets = buildOrderedSets(newWcif);
    await saveCompetition({ competitionId: id, competitionName: name, wcif: newWcif, sets: newSets });
    setCompetitionId(id);
    setCompetitionName(name);
    setWcif(newWcif);
    setSets(newSets);
  }, []);

  const syncWcif = useCallback(
    async (newWcif: WCIF) => {
      if (competitionId === null || competitionName === null) return;
      const merged = mergeSetsKeepingPdfs(buildOrderedSets(newWcif), sets);
      await saveCompetition({ competitionId, competitionName, wcif: newWcif, sets: merged });
      setWcif(newWcif);
      setSets(merged);
    },
    [competitionId, competitionName, sets],
  );

  const replaceSets = useCallback(async (newSets: ScrambleSet[]) => {
    await saveSets(newSets);
    setSets(newSets);
  }, []);

  const reset = useCallback(async () => {
    await clearCompetition();
    setCompetitionId(null);
    setCompetitionName(null);
    setWcif(null);
    setSets([]);
  }, []);

  const value = useMemo<CompetitionState>(
    () => ({ ready, competitionId, competitionName, wcif, sets, selectCompetition, syncWcif, replaceSets, reset }),
    [ready, competitionId, competitionName, wcif, sets, selectCompetition, syncWcif, replaceSets, reset],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCompetition(): CompetitionState {
  const ctx = useContext(Ctx);
  if (ctx === null) throw new Error("useCompetition must be used inside CompetitionProvider");
  return ctx;
}
