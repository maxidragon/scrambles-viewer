import { describe, expect, it } from "vitest";
import { buildOrderedSets, formatTime, getVenueTimezone } from "@shared/utils/schedule";
import { activity, event, room, wcif } from "./fixtures/wcif";

describe("buildOrderedSets", () => {
  it("orders rounds by start time and expands each into lettered sets", () => {
    const doc = wcif(
      [event("333", [{ number: 1, format: "a", sets: 2 }]), event("222", [{ number: 1, format: "a", sets: 1 }])],
      [room("Main", [activity("333-r1", "2026-05-01T10:00:00Z"), activity("222-r1", "2026-05-01T09:00:00Z")])],
    );

    expect(buildOrderedSets(doc).map((s) => s.name)).toEqual([
      "2x2x2 Round 1 Set A",
      "3x3x3 Round 1 Set A",
      "3x3x3 Round 1 Set B",
    ]);
  });

  it("lists a round once even when it runs in several rooms", () => {
    const doc = wcif(
      [event("333", [{ number: 1, format: "a", sets: 1 }])],
      [
        room("Red", [activity("333-r1", "2026-05-01T10:00:00Z")]),
        room("Blue", [activity("333-r1", "2026-05-01T10:00:00Z")]),
      ],
    );

    expect(buildOrderedSets(doc)).toHaveLength(1);
  });

  it("reads group activities nested under a round", () => {
    const doc = wcif(
      [event("333", [{ number: 1, format: "a", sets: 1 }])],
      [room("Main", [activity("333-r1", "2026-05-01T10:00:00Z", { childActivities: [activity("333-r1-g1", "2026-05-01T10:00:00Z")] })])],
    );

    expect(buildOrderedSets(doc).map((s) => s.name)).toEqual(["3x3x3 Round 1 Set A"]);
  });

  it("gives Multi-Blind one set per attempt, timed by the attempt's own activity", () => {
    const doc = wcif(
      [event("333mbf", [{ number: 1, format: "3", sets: 1 }])],
      [room("Main", [activity("333mbf-r1-a2", "2026-05-01T15:00:00Z"), activity("333mbf-r1-a1", "2026-05-01T09:00:00Z")])],
    );

    const sets = buildOrderedSets(doc);
    expect(sets.map((s) => [s.name, s.attemptNumber, s.startTime])).toEqual([
      ["3x3x3 Multi-Blind Round 1 Set A Attempt 1", 1, "2026-05-01T09:00:00Z"],
      ["3x3x3 Multi-Blind Round 1 Set A Attempt 2", 2, "2026-05-01T15:00:00Z"],
    ]);
  });

  it("falls back to the round format when Fewest Moves attempts are not scheduled separately", () => {
    const doc = wcif(
      [event("333fm", [{ number: 1, format: "m", sets: 1 }])],
      [room("Main", [activity("333fm-r1", "2026-05-01T09:00:00Z")])],
    );

    expect(buildOrderedSets(doc).map((s) => s.attemptNumber)).toEqual([1, 2, 3]);
  });

  it("uses the activity's set count when the round is missing from the events list", () => {
    const doc = wcif([], [room("Main", [activity("pyram-r1", "2026-05-01T09:00:00Z", { scrambleSetCount: 3 })])]);

    expect(buildOrderedSets(doc).map((s) => s.setLetter)).toEqual(["A", "B", "C"]);
  });

  it("ignores activities that are not rounds", () => {
    const doc = wcif([], [room("Main", [activity("other-lunch", "2026-05-01T12:00:00Z")])]);

    expect(buildOrderedSets(doc)).toEqual([]);
  });

  it("returns nothing for a schedule without venues", () => {
    expect(buildOrderedSets(wcif([event("333", [{ number: 1, format: "a", sets: 1 }])], []))).toEqual([]);
  });
});

describe("venue time", () => {
  it("formats in the venue's timezone, 24-hour", () => {
    expect(formatTime("2026-05-01T09:05:00Z", "Europe/Warsaw")).toBe("11:05");
  });

  it("falls back to UTC when the schedule has no venue", () => {
    expect(getVenueTimezone(wcif([], []))).toBe("UTC");
  });
});
