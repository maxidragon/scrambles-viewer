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
  loading: boolean;
  setCompetition(id: string, name: string, wcif: WCIF): Promise<void>;
  syncWCIF(wcif: WCIF): Promise<void>;
  reset(): Promise<void>;
  updateSets(sets: ScrambleSet[]): void;
  setSetPassword(setName: string, password: string): void;
  clearPasswords(): void;
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
    await AsyncStorage.multiRemove([K.ID, K.NAME, K.WCIF, K.SETS]);
  };

  const updateSets = (newSets: ScrambleSet[]) => {
    setSets(newSets);
    AsyncStorage.setItem(K.SETS, JSON.stringify(newSets)).catch(() => null);
  };

  const setSetPassword = useCallback((setName: string, password: string) => {
    setPasswords(prev => ({ ...prev, [setName]: password }));
  }, []);

  const clearPasswords = useCallback(() => setPasswords({}), []);

  return (
    <Ctx.Provider
      value={{
        competitionId, competitionName, wcif, sets, passwords, loading,
        setCompetition, syncWCIF, reset, updateSets, setSetPassword, clearPasswords,
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
