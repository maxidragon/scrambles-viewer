import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import type { ScrambleSet } from "@shared/types/wcif";
import { ImportError, chooseArchive, extractMatchedPdfs, planImport, safePdfFileName } from "../src/import/archive";

function set(activityCode: string, setLetter: string): ScrambleSet {
  return { name: `${activityCode} ${setLetter}`, activityCode, setLetter, startTime: "" };
}

const sets = [set("333-r1", "A"), set("333-r1", "B"), set("222-r1", "A")];

describe("chooseArchive", () => {
  it("picks the nested computer-display archive TNoodle writes", () => {
    const choice = chooseArchive(["Printing/x.pdf", "Test Open 2026 - Computer Display PDFs.zip", "Interchange/"]);
    expect(choice).toEqual({ kind: "nested", entryName: "Test Open 2026 - Computer Display PDFs.zip" });
  });

  it("uses the archive as is when there is no nested one", () => {
    expect(chooseArchive(["3x3x3 Cube Round 1 Scramble Set A.pdf"])).toEqual({ kind: "flat" });
  });

  it("refuses to guess between several nested archives", () => {
    expect(chooseArchive(["A - Computer Display PDFs.zip", "B - Computer Display PDFs.zip"]).kind).toBe("ambiguous");
  });
});

describe("planImport", () => {
  it("matches by basename and lets the first entry win a set", () => {
    const plan = planImport(
      ["Printing/3x3x3 Cube Round 1 Scramble Set A.pdf", "Other/3x3x3 Cube Round 1 Scramble Set A.pdf", "notes.pdf"],
      sets,
    );
    expect([...plan.matches]).toEqual([[0, "Printing/3x3x3 Cube Round 1 Scramble Set A.pdf"]]);
    expect(plan.unmatched).toEqual(["Other/3x3x3 Cube Round 1 Scramble Set A.pdf", "notes.pdf"]);
  });
});

describe("safePdfFileName", () => {
  it("keeps only word characters, dots and dashes of the basename", () => {
    expect(safePdfFileName("a/b/Test Open 2026 - 3x3x3 Cube Round 1 Scramble Set A.pdf")).toBe(
      "Test_Open_2026_-_3x3x3_Cube_Round_1_Scramble_Set_A.pdf",
    );
  });
});

async function zipBytes(files: Record<string, Uint8Array | string>): Promise<Uint8Array> {
  const zip = new JSZip();
  for (const [name, content] of Object.entries(files)) zip.file(name, content);
  return zip.generateAsync({ type: "uint8array" });
}

describe("extractMatchedPdfs", () => {
  it("descends into the nested archive and ignores the printing PDFs", async () => {
    const nested = await zipBytes({ "3x3x3 Cube Round 1 Scramble Set B.pdf": "display-b" });
    const outer = await zipBytes({
      "Printing/3x3x3 Cube Round 1 Scramble Set A.pdf": "printing-a",
      "Test Open 2026 - Computer Display PDFs.zip": nested,
      "Test Open 2026 - Computer Display PDF Passcodes - SECRET.txt": "B: hunter2",
    });

    const result = await extractMatchedPdfs(outer, sets);

    expect(result.total).toBe(1);
    expect(result.unmatched).toEqual([]);
    expect(result.pdfs.map((p) => [p.setIndex, p.fileName, new TextDecoder().decode(p.bytes)])).toEqual([
      [1, "3x3x3_Cube_Round_1_Scramble_Set_B.pdf", "display-b"],
    ]);
  });

  it("imports a flat archive directly and reports what did not match", async () => {
    const flat = await zipBytes({
      "2x2x2 Cube Round 1 Scramble Set A.pdf": "a",
      "Skewb Round 1 Scramble Set A.pdf": "skewb",
    });

    const result = await extractMatchedPdfs(flat, sets);

    expect(result.pdfs.map((p) => p.setIndex)).toEqual([2]);
    expect(result.unmatched).toEqual(["Skewb Round 1 Scramble Set A.pdf"]);
    expect(result.total).toBe(2);
  });

  it("rejects bytes that are not a ZIP", async () => {
    await expect(extractMatchedPdfs(new TextEncoder().encode("%PDF-1.7 nope"), sets)).rejects.toMatchObject({
      name: "ImportError",
      reason: "not-a-zip",
    });
  });

  it("rejects an archive with several nested display archives", async () => {
    const inner = await zipBytes({ "x.pdf": "x" });
    const outer = await zipBytes({ "A - Computer Display PDFs.zip": inner, "B - Computer Display PDFs.zip": inner });

    await expect(extractMatchedPdfs(outer, sets)).rejects.toBeInstanceOf(ImportError);
  });
});
