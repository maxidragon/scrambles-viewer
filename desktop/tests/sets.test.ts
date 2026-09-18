import { describe, expect, it } from "vitest";
import type { ScrambleSet } from "@shared/types/wcif";
import { groupSetsByRound, mergeSetsKeepingPdfs, withoutPdfs } from "../src/store/sets";

function set(name: string, activityCode: string, startTime = "2026-05-01T08:00:00Z", pdfPath?: string): ScrambleSet {
  return { name, activityCode, setLetter: "A", startTime, pdfPath };
}

describe("mergeSetsKeepingPdfs", () => {
  it("keeps the PDF of a set that survives by name and drops the rest", () => {
    const existing = [set("3x3x3 Round 1 Set A", "333-r1", undefined, "/pdfs/a.pdf"), set("Old Round 1 Set A", "old-r1", undefined, "/pdfs/old.pdf")];
    const fresh = [set("New Round 1 Set A", "new-r1"), set("3x3x3 Round 1 Set A", "333-r1")];

    expect(mergeSetsKeepingPdfs(fresh, existing).map((s) => s.pdfPath)).toEqual([undefined, "/pdfs/a.pdf"]);
  });
});

describe("withoutPdfs", () => {
  it("removes the path rather than leaving an empty one", () => {
    expect(withoutPdfs([set("x", "333-r1", undefined, "/pdfs/a.pdf")])[0]).not.toHaveProperty("pdfPath");
  });
});

describe("groupSetsByRound", () => {
  it("groups consecutive sets of one round and strips the set suffix from the title", () => {
    const sets = [
      set("2x2x2 Round 1 Set A", "222-r1", "2026-05-01T08:00:00Z"),
      set("2x2x2 Round 1 Set B", "222-r1", "2026-05-01T08:00:00Z"),
      set("3x3x3 Multi-Blind Round 1 Set A Attempt 1", "333mbf-r1", "2026-05-01T09:30:00Z"),
    ];

    expect(groupSetsByRound(sets, "UTC")).toEqual([
      { title: "2x2x2 Round 1", time: "08:00", setIndexes: [0, 1] },
      { title: "3x3x3 Multi-Blind Round 1", time: "09:30", setIndexes: [2] },
    ]);
  });
});
