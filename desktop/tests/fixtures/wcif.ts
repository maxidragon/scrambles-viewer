import type { WCIF, WCIFActivity, WCIFEvent, WCIFRoom } from "@shared/types/wcif";

let nextActivityId = 1;

export function activity(
  activityCode: string,
  startTime: string,
  extra: Partial<Pick<WCIFActivity, "childActivities" | "scrambleSetCount">> = {},
): WCIFActivity {
  return {
    id: nextActivityId++,
    name: activityCode,
    activityCode,
    startTime,
    endTime: startTime,
    childActivities: extra.childActivities ?? [],
    scrambleSetCount: extra.scrambleSetCount,
  };
}

export function event(id: string, rounds: { number: number; format: string; sets: number }[]): WCIFEvent {
  return {
    id,
    rounds: rounds.map((r) => ({
      id: `${id}-r${r.number}`,
      format: r.format,
      scrambleSetCount: r.sets,
      results: [],
    })),
  };
}

export function wcif(events: WCIFEvent[], rooms: WCIFRoom[], timezone = "Europe/Warsaw"): WCIF {
  return {
    id: "TestOpen2026",
    name: "Test Open 2026",
    events,
    schedule: {
      startDate: "2026-05-01",
      numberOfDays: 1,
      venues: rooms.length === 0 ? [] : [{ id: 1, name: "Hall", timezone, rooms }],
    },
  };
}

export function room(name: string, activities: WCIFActivity[]): WCIFRoom {
  return { id: name.length, name, activities };
}
