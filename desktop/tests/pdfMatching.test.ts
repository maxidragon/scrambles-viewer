import { describe, expect, it } from "vitest";
import type { ScrambleSet } from "@shared/types/wcif";
import { matchSet } from "@shared/utils/pdfMatching";

function set(activityCode: string, setLetter: string, attemptNumber?: number): ScrambleSet {
  return { name: `${activityCode} ${setLetter}`, activityCode, setLetter, startTime: "", attemptNumber };
}

const sets: ScrambleSet[] = [
  set("333-r1", "A"),
  set("333-r1", "B"),
  set("333oh-r1", "A"),
  set("333mbf-r1", "A", 1),
  set("333mbf-r1", "A", 2),
];

describe("matchSet", () => {
  it("matches a TNoodle filename with the competition prefix", () => {
    expect(matchSet("Test Open 2026 - 3x3x3 Cube Round 1 Scramble Set B.pdf", sets)).toBe(1);
  });

  it("matches without the prefix", () => {
    expect(matchSet("3x3x3 Cube Round 1 Scramble Set A.pdf", sets)).toBe(0);
  });

  it("is case-insensitive", () => {
    expect(matchSet("3X3X3 CUBE ROUND 1 SCRAMBLE SET a.PDF", sets)).toBe(0);
  });

  it("uses the TNoodle spelling of Multi-Blind and the attempt number", () => {
    expect(matchSet("3x3x3 Multiple Blindfolded Round 1 Scramble Set A Attempt 2.pdf", sets)).toBe(4);
  });

  it("treats a file without an attempt as attempt 1 for attempt-based events", () => {
    expect(matchSet("3x3x3 Multiple Blindfolded Round 1 Scramble Set A.pdf", sets)).toBe(3);
  });

  it("does not let an attempt suffix match a set without attempts", () => {
    expect(matchSet("3x3x3 Cube Round 1 Scramble Set A Attempt 1.pdf", sets)).toBe(-1);
  });

  it("does not match an event whose display name is a suffix of another", () => {
    expect(matchSet("3x3x3 One-Handed Round 1 Scramble Set A.pdf", sets)).toBe(2);
    expect(matchSet("2x2x2 Cube Round 1 Scramble Set A.pdf", sets)).toBe(-1);
  });

  it("rejects a round that is not in the schedule", () => {
    expect(matchSet("3x3x3 Cube Round 2 Scramble Set A.pdf", sets)).toBe(-1);
  });

  it("rejects a filename with neither a set letter nor an attempt", () => {
    expect(matchSet("3x3x3 Cube Round 1.pdf", sets)).toBe(-1);
  });
});
