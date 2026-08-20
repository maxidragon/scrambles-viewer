import React, { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WCIF, ScrambleSet } from '../types/wcif';
import { buildOrderedSets } from '../utils/schedule';

interface State {
  competitionId: string | null;
  competitionName: string | null;
  wcif: WCIF | null;
  sets: ScrambleSet[];
  /** In-memory only — cleared every time the viewer is exited. */
  passwords: Record<string, string>;
  /**
   * When each set was last closed, in epoch ms. A set that is currently open has
   * no entry. Used to re-lock sets that were left open too long ago.
   */
  closedAt: Record<string, number>;
  loading: boolean;
  setCompetition(id: string, name: string, wcif: WCIF): Promise<void>;
  syncWCIF(wcif: WCIF): Promise<void>;
  reset(): Promise<void>;
  updateSets(sets: ScrambleSet[]): void;
  setSetPassword(setName: string, password: string): void;
  markSetOpened(setName: string): void;
  markSetClosed(setName: string): void;
  lockSet(setName: string): void;
  clearPasswords(): void;
}

function omit<T>(record: Record<string, T>, key: string): Record<string, T> {
  if (!(key in record)) return record;
  const { [key]: _removed, ...rest } = record;
  return rest;
}

const Ctx = createContext<State | null>(null);

const K = {
  ID: 'competition_id',
  NAME: 'competition_name',
  WCIF: 'wcif_data',
  SETS: 'sets_data',
} as const;

export function CompetitionProvider({ children }: { children: ReactNode }) {
  const [competitionId, setCompetitionId] = useState<string | null>(null);
  const [competitionName, setCompetitionName] = useState<string | null>(null);
  const [wcif, setWcif] = useState<WCIF | null>(null);
  const [sets, setSets] = useState<ScrambleSet[]>([]);
  const [passwords, setPasswords] = useState<Record<string, string>>({});
  const [closedAt, setClosedAt] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const entries = await AsyncStorage.multiGet([K.ID, K.NAME, K.WCIF, K.SETS]);
        const [id, name, wcifStr, setsStr] = entries;
        if (id[1]) setCompetitionId(id[1]);
        if (name[1]) setCompetitionName(name[1]);
        if (wcifStr[1]) setWcif(JSON.parse(wcifStr[1]));
        if (setsStr[1]) setSets(JSON.parse(setsStr[1]));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const setCompetition = async (id: string, name: string, newWcif: WCIF) => {
    const newSets = buildOrderedSets(newWcif);
    setCompetitionId(id);
    setCompetitionName(name);
    setWcif(newWcif);
    setSets(newSets);
    setPasswords({});
    setClosedAt({});
    await AsyncStorage.multiSet([
      [K.ID, id],
      [K.NAME, name],
      [K.WCIF, JSON.stringify(newWcif)],
      [K.SETS, JSON.stringify(newSets)],
    ]);
  };

  const syncWCIF = async (newWcif: WCIF) => {
    const freshSets = buildOrderedSets(newWcif);
    const merged = freshSets.map(s => {
      const existing = sets.find(e => e.name === s.name);
      return existing?.pdfPath ? { ...s, pdfPath: existing.pdfPath } : s;
    });
    setWcif(newWcif);
    setSets(merged);
    await AsyncStorage.multiSet([
      [K.WCIF, JSON.stringify(newWcif)],
      [K.SETS, JSON.stringify(merged)],
    ]);
  };

  const reset = async () => {
    setCompetitionId(null);
    setCompetitionName(null);
    setWcif(null);
    setSets([]);
    setPasswords({});
    setClosedAt({});
    await AsyncStorage.multiRemove([K.ID, K.NAME, K.WCIF, K.SETS]);
  };

  const updateSets = (newSets: ScrambleSet[]) => {
    setSets(newSets);
    AsyncStorage.setItem(K.SETS, JSON.stringify(newSets)).catch(() => null);
  };

  const setSetPassword = useCallback((setName: string, password: string) => {
    setPasswords(prev => ({ ...prev, [setName]: password }));
    // Unlocking counts as opening the set — the lock timer starts when it is closed.
    setClosedAt(prev => omit(prev, setName));
  }, []);

  const markSetOpened = useCallback((setName: string) => {
    setClosedAt(prev => omit(prev, setName));
  }, []);

  const markSetClosed = useCallback((setName: string) => {
    setClosedAt(prev => ({ ...prev, [setName]: Date.now() }));
  }, []);

  const lockSet = useCallback((setName: string) => {
    setPasswords(prev => omit(prev, setName));
    setClosedAt(prev => omit(prev, setName));
  }, []);

  const clearPasswords = useCallback(() => {
    setPasswords({});
    setClosedAt({});
  }, []);

  return (
    <Ctx.Provider
      value={{
        competitionId, competitionName, wcif, sets, passwords, closedAt, loading,
        setCompetition, syncWCIF, reset, updateSets, setSetPassword,
        markSetOpened, markSetClosed, lockSet, clearPasswords,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useCompetition(): State {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCompetition must be used inside CompetitionProvider');
  return ctx;
}
