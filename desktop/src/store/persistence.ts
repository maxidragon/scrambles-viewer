import { load } from "@tauri-apps/plugin-store";
import type { ScrambleSet, WCIF } from "@shared/types/wcif";
import { hasTauriBridge } from "../platform/tauri";

interface KeyValueStore {
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
  clear(): Promise<void>;
}

// `npm run dev` opened in a plain browser has no Tauri bridge. Keeping state in memory
// there lets the schedule UI be exercised outside the shell; nothing is persisted.
function inMemoryStore(): KeyValueStore {
  const values = new Map<string, unknown>();
  return {
    async get<T>(key: string): Promise<T | undefined> {
      // Same trust-the-caller contract as the store plugin's own get<T>: a key is only
      // ever read back with the type it was written with.
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      return values.get(key) as T | undefined;
    },
    async set(key, value) {
      values.set(key, value);
    },
    async clear() {
      values.clear();
    },
  };
}

const memory = inMemoryStore();

export interface PersistedCompetition {
  competitionId: string;
  competitionName: string;
  wcif: WCIF;
  sets: ScrambleSet[];
}

// Same four keys the mobile app keeps in AsyncStorage. Passwords and lock timestamps are
// deliberately absent: they never reach disk (SPEC-001, PRIVACY.md).
const STORE_FILE = "competition.json";
const K = {
  ID: "competition_id",
  NAME: "competition_name",
  WCIF: "wcif_data",
  SETS: "sets_data",
} as const;

async function store(): Promise<KeyValueStore> {
  return hasTauriBridge() ? load(STORE_FILE, { autoSave: true }) : memory;
}

export async function loadCompetition(): Promise<PersistedCompetition | null> {
  const s = await store();
  const [competitionId, competitionName, wcif, sets] = await Promise.all([
    s.get<string>(K.ID),
    s.get<string>(K.NAME),
    s.get<WCIF>(K.WCIF),
    s.get<ScrambleSet[]>(K.SETS),
  ]);
  if (competitionId == null || competitionName == null || wcif == null || sets == null) return null;
  return { competitionId, competitionName, wcif, sets };
}

export async function saveCompetition(c: PersistedCompetition): Promise<void> {
  const s = await store();
  await s.set(K.ID, c.competitionId);
  await s.set(K.NAME, c.competitionName);
  await s.set(K.WCIF, c.wcif);
  await s.set(K.SETS, c.sets);
}

export async function saveSets(sets: ScrambleSet[]): Promise<void> {
  const s = await store();
  await s.set(K.SETS, sets);
}

export async function clearCompetition(): Promise<void> {
  const s = await store();
  await s.clear();
}
