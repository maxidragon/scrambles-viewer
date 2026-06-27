import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WCIF, ScrambleSet } from '../types/wcif';
import { buildOrderedSets } from '../utils/schedule';

interface State {
  competitionId: string | null;
  competitionName: string | null;
  wcif: WCIF | null;
  sets: ScrambleSet[];
  passwords: Record<string, string>;
  loading: boolean;
  setCompetition(id: string, name: string, wcif: WCIF): Promise<void>;
  syncWCIF(wcif: WCIF): Promise<void>;
  reset(): Promise<void>;
  updateSets(sets: ScrambleSet[]): void;
  /** Save password for a single set (keyed by set name). */
  setSetPassword(setName: string, password: string): void;
  /** Apply password to every set that does not yet have one. */
  setPasswordForRemaining(password: string): void;
}

const Ctx = createContext<State | null>(null);

const K = {
  ID: 'competition_id',
  NAME: 'competition_name',
  WCIF: 'wcif_data',
  SETS: 'sets_data',
  PASSWORDS: 'passwords_data',
} as const;

export function CompetitionProvider({ children }: { children: ReactNode }) {
  const [competitionId, setCompetitionId] = useState<string | null>(null);
  const [competitionName, setCompetitionName] = useState<string | null>(null);
  const [wcif, setWcif] = useState<WCIF | null>(null);
  const [sets, setSets] = useState<ScrambleSet[]>([]);
  const [passwords, setPasswordsState] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const entries = await AsyncStorage.multiGet([K.ID, K.NAME, K.WCIF, K.SETS, K.PASSWORDS]);
        const [id, name, wcifStr, setsStr, passStr] = entries;
        if (id[1]) setCompetitionId(id[1]);
        if (name[1]) setCompetitionName(name[1]);
        if (wcifStr[1]) setWcif(JSON.parse(wcifStr[1]));
        if (setsStr[1]) setSets(JSON.parse(setsStr[1]));
        if (passStr[1]) setPasswordsState(JSON.parse(passStr[1]));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persistPasswords = (p: Record<string, string>) => {
    setPasswordsState(p);
    AsyncStorage.setItem(K.PASSWORDS, JSON.stringify(p)).catch(() => null);
  };

  const setCompetition = async (id: string, name: string, newWcif: WCIF) => {
    const newSets = buildOrderedSets(newWcif);
    setCompetitionId(id);
    setCompetitionName(name);
    setWcif(newWcif);
    setSets(newSets);
    // Keep existing passwords when changing competition only if IDs match; otherwise clear.
    const newPasswords = id === competitionId ? passwords : {};
    setPasswordsState(newPasswords);
    await AsyncStorage.multiSet([
      [K.ID, id],
      [K.NAME, name],
      [K.WCIF, JSON.stringify(newWcif)],
      [K.SETS, JSON.stringify(newSets)],
      [K.PASSWORDS, JSON.stringify(newPasswords)],
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
    setPasswordsState({});
    await AsyncStorage.multiRemove([K.ID, K.NAME, K.WCIF, K.SETS, K.PASSWORDS]);
  };

  const updateSets = (newSets: ScrambleSet[]) => {
    setSets(newSets);
    AsyncStorage.setItem(K.SETS, JSON.stringify(newSets)).catch(() => null);
  };

  const setSetPassword = (setName: string, password: string) => {
    persistPasswords({ ...passwords, [setName]: password });
  };

  const setPasswordForRemaining = (password: string) => {
    const updated = { ...passwords };
    for (const s of sets) {
      if (!updated[s.name]) updated[s.name] = password;
    }
    persistPasswords(updated);
  };

  return (
    <Ctx.Provider
      value={{
        competitionId, competitionName, wcif, sets, passwords, loading,
        setCompetition, syncWCIF, reset, updateSets, setSetPassword, setPasswordForRemaining,
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
