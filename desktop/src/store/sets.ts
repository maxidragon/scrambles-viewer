import type { ScrambleSet } from "@shared/types/wcif";
import { formatTime } from "@shared/utils/schedule";

/**
 * Sync rule shared with mobile: a fresh set list from the WCIF keeps the PDF of any
 * existing set with the same name. Renamed or removed sets lose theirs.
 */
export function mergeSetsKeepingPdfs(fresh: ScrambleSet[], existing: ScrambleSet[]): ScrambleSet[] {
  const pdfByName = new Map(existing.filter((s) => s.pdfPath != null).map((s) => [s.name, s.pdfPath]));
  return fresh.map((s) => {
    const pdfPath = pdfByName.get(s.name);
    return pdfPath == null ? s : { ...s, pdfPath };
  });
}

export function withoutPdfs(sets: ScrambleSet[]): ScrambleSet[] {
  return sets.map(({ pdfPath: _pdfPath, ...rest }) => rest);
}

export interface RoundGroup {
  title: string;
  time: string;
  /** Indexes into the full set list, so the viewer can be opened at that set. */
  setIndexes: number[];
}

const SET_SUFFIX_RE = / Set [A-Z](?: Attempt \d+)?$/;

/** Consecutive sets of the same round become one group, in list order. */
export function groupSetsByRound(sets: ScrambleSet[], timezone: string): RoundGroup[] {
  const groups: RoundGroup[] = [];
  let current: RoundGroup | null = null;
  let currentCode: string | null = null;
  sets.forEach((set, index) => {
    if (current === null || set.activityCode !== currentCode) {
      currentCode = set.activityCode;
      current = { title: set.name.replace(SET_SUFFIX_RE, ""), time: formatTime(set.startTime, timezone), setIndexes: [] };
      groups.push(current);
    }
    current.setIndexes.push(index);
  });
  return groups;
}
