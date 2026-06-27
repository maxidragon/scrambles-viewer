import { WCIF, WCIFActivity, ScrambleSet } from '../types/wcif';
import { getEventName } from './eventNames';

const ROUND_CODE_RE = /^([a-z0-9]+)-r(\d+)$/;

function flattenActivities(wcif: WCIF): WCIFActivity[] {
  const result: WCIFActivity[] = [];
  for (const venue of wcif.schedule.venues) {
    for (const room of venue.rooms) {
      for (const activity of room.activities) {
        result.push(activity);
      }
    }
  }
  return result;
}

export function buildOrderedSets(wcif: WCIF): ScrambleSet[] {
  const activities = flattenActivities(wcif);
  const seen = new Set<string>();

  const roundActivities = activities
    .filter(a => {
      if (!ROUND_CODE_RE.test(a.activityCode)) return false;
      if (seen.has(a.activityCode)) return false;
      seen.add(a.activityCode);
      return true;
    })
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const sets: ScrambleSet[] = [];

  for (const activity of roundActivities) {
    const m = ROUND_CODE_RE.exec(activity.activityCode)!;
    const eventId = m[1];
    const roundNum = parseInt(m[2], 10);
    const eventName = getEventName(eventId);

    const event = wcif.events.find(e => e.id === eventId);
    const round = event?.rounds.find(r => r.id === activity.activityCode);
    const setCount = round?.scrambleSetCount ?? activity.scrambleSetCount ?? 1;

    for (let i = 0; i < setCount; i++) {
      const setLetter = String.fromCharCode(65 + i);
      sets.push({
        name: `${eventName} Round ${roundNum} Set ${setLetter}`,
        activityCode: activity.activityCode,
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
