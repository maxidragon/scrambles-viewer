import { ScrambleSet } from '../types/wcif';
import { getEventFileNames } from './eventNames';

const ROUND_CODE_RE = /^([a-z0-9]+)-r(\d+)$/;

export function matchSet(filename: string, sets: ScrambleSet[]): number {
  const nameNoExt = filename.replace(/\.pdf$/i, '');
  const setLetter = /\bSet\s+([A-Z])\b/i.exec(nameNoExt)?.[1].toUpperCase();
  const attemptM = /\bAttempt\s+(\d+)\b/i.exec(nameNoExt);
  const attemptNumber = attemptM ? Number(attemptM[1]) : undefined;

  const roundM = /\bRound\s+(\d+)\b/i.exec(nameNoExt);
  if (!roundM || (!setLetter && attemptNumber === undefined)) return -1;
  const roundNum = roundM[1];

  // Everything before " Round N" is the event name, possibly with a competition prefix.
  const fileEventPart = nameNoExt.replace(/\s+round\s+\d+.*/i, '').toLowerCase().trim();

  return sets.findIndex(set => {
    const codeM = ROUND_CODE_RE.exec(set.activityCode);
    if (!codeM || codeM[2] !== roundNum) return false;

    const eventMatches = getEventFileNames(codeM[1]).some(
      eventName => fileEventPart === eventName || fileEventPart.endsWith(' ' + eventName),
    );
    if (!eventMatches) return false;

    if (setLetter !== undefined && setLetter !== set.setLetter) return false;

    if (set.attemptNumber !== undefined) {
      // A file without an attempt in its name can only be the single-attempt case.
      return attemptNumber === undefined ? set.attemptNumber === 1 : attemptNumber === set.attemptNumber;
    }

    return attemptNumber === undefined;
  });
}
