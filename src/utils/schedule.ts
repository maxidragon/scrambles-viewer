import { WCIF, WCIFActivity, ScrambleSet } from '../types/wcif';
import { getEventName } from './eventNames';

const ACTIVITY_CODE_RE = /^([a-z0-9]+)-r(\d+)(?:-g([^-]+))?(?:-a(\d+))?$/;
const ATTEMPT_BASED_EVENTS = new Set(['333fm', '333mbf']);

interface ParsedActivityCode {
  eventId: string;
  roundNumber: number;
  groupName?: string;
  attemptNumber?: number;
}

function parseActivityCode(activityCode: string): ParsedActivityCode | null {
  const match = ACTIVITY_CODE_RE.exec(activityCode);
  if (!match) return null;

  return {
    eventId: match[1],
    roundNumber: Number(match[2]),
    groupName: match[3],
    attemptNumber: match[4] ? Number(match[4]) : undefined,
  };
}

function getAttemptCount(format: string): number {
  if (format === 'm') return 3;
  if (format === 'a') return 5;
  const count = Number(format);
  return Number.isInteger(count) && count > 0 ? count : 1;
}

function flattenActivities(wcif: WCIF): WCIFActivity[] {
  const result: WCIFActivity[] = [];
  for (const venue of wcif.schedule.venues) {
    for (const room of venue.rooms) {
      for (const activity of room.activities) {
        const visit = (item: WCIFActivity) => {
          result.push(item);
          item.childActivities.forEach(visit);
        };
        visit(activity);
      }
    }
  }
  return result;
}

export function buildOrderedSets(wcif: WCIF): ScrambleSet[] {
  const activities = flattenActivities(wcif)
    .map(activity => ({ activity, code: parseActivityCode(activity.activityCode) }))
    .filter((item): item is { activity: WCIFActivity; code: ParsedActivityCode } => item.code !== null)
    .sort(
      (a, b) =>
        new Date(a.activity.startTime).getTime() - new Date(b.activity.startTime).getTime(),
    );
  const seen = new Set<string>();

  const roundActivities = activities
    .filter(({ code }) => {
      const roundCode = `${code.eventId}-r${code.roundNumber}`;
      if (seen.has(roundCode)) return false;
      seen.add(roundCode);
      return true;
    });

  const sets: ScrambleSet[] = [];

  for (const { activity, code } of roundActivities) {
    const { eventId, roundNumber: roundNum } = code;
    const roundCode = `${eventId}-r${roundNum}`;
    const eventName = getEventName(eventId);

    const event = wcif.events.find(e => e.id === eventId);
    const round = event?.rounds.find(r => r.id === roundCode);

    const setCount = round?.scrambleSetCount ?? activity.scrambleSetCount ?? 1;

    // FM and MBLD get one PDF per attempt per scramble set, e.g.
    // "… Round 1 Scramble Set A Attempt 1".
    if (ATTEMPT_BASED_EVENTS.has(eventId)) {
      // Attempts may be scheduled separately (333mbf-r1-a2); fall back to the round format.
      const attemptActivities = new Map<number, WCIFActivity>();
      for (const item of activities) {
        const { eventId: id, roundNumber, attemptNumber } = item.code;
        if (id !== eventId || roundNumber !== roundNum || attemptNumber === undefined) continue;
        if (!attemptActivities.has(attemptNumber)) attemptActivities.set(attemptNumber, item.activity);
      }

      const attemptNumbers = attemptActivities.size > 0
        ? [...attemptActivities.keys()].sort((a, b) => a - b)
        : Array.from({ length: getAttemptCount(round?.format ?? '1') }, (_, i) => i + 1);

      for (const attemptNumber of attemptNumbers) {
        for (let i = 0; i < setCount; i++) {
          const setLetter = String.fromCharCode(65 + i);
          sets.push({
            name: `${eventName} Round ${roundNum} Set ${setLetter} Attempt ${attemptNumber}`,
            activityCode: roundCode,
            setLetter,
            startTime: (attemptActivities.get(attemptNumber) ?? activity).startTime,
            attemptNumber,
          });
        }
      }

      continue;
    }

    for (let i = 0; i < setCount; i++) {
      const setLetter = String.fromCharCode(65 + i);
      sets.push({
        name: `${eventName} Round ${roundNum} Set ${setLetter}`,
        activityCode: roundCode,
        setLetter,
        startTime: activity.startTime,
      });
    }
  }

  return sets;
}

export function getVenueTimezone(wcif: WCIF): string {
  return wcif.schedule.venues[0]?.timezone ?? 'UTC';
}

export function formatTime(isoTime: string, timezone: string): string {
  try {
    return new Date(isoTime).toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return new Date(isoTime).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }
}
