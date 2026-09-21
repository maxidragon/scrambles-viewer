import JSZip from "jszip";
import type { ScrambleSet } from "@shared/types/wcif";
import { matchSet } from "@shared/utils/pdfMatching";

// TNoodle nests the per-set passcode-protected PDFs in an archive with this suffix inside
// the download; the outer archive's own PDFs are the printing copies (SPEC-003).
const NESTED_DISPLAY_ZIP_SUFFIX = "computer display pdfs.zip";

export type ArchiveChoice =
  | { kind: "nested"; entryName: string }
  | { kind: "flat" }
  | { kind: "ambiguous"; entryNames: string[] };

export function chooseArchive(entryNames: string[]): ArchiveChoice {
  const nested = entryNames.filter((n) => n.toLowerCase().endsWith(NESTED_DISPLAY_ZIP_SUFFIX));
  const only = nested[0];
  if (nested.length === 1 && only !== undefined) return { kind: "nested", entryName: only };
  if (nested.length > 1) return { kind: "ambiguous", entryNames: nested };
  return { kind: "flat" };
}

export interface ImportPlan {
  /** Set index -> archive entry name, first entry in archive order wins. */
  matches: Map<number, string>;
  unmatched: string[];
}

export function planImport(pdfEntryNames: string[], sets: ScrambleSet[]): ImportPlan {
  const matches = new Map<number, string>();
  const unmatched: string[] = [];
  for (const entryName of pdfEntryNames) {
    const index = matchSet(basename(entryName), sets);
    if (index === -1 || matches.has(index)) {
      unmatched.push(entryName);
      continue;
    }
    matches.set(index, entryName);
  }
  return { matches, unmatched };
}

export function basename(entryName: string): string {
  return entryName.split("/").pop() ?? entryName;
}

/** The on-disk name: the PDF's own basename with anything outside a safe set replaced. */
export function safePdfFileName(entryName: string): string {
  return basename(entryName).replace(/[^\w.-]/g, "_");
}

export type ImportFailure = "not-a-zip" | "encrypted" | "ambiguous";

export class ImportError extends Error {
  constructor(
    public readonly reason: ImportFailure,
    message: string,
  ) {
    super(message);
    this.name = "ImportError";
  }
}

export interface ExtractedPdf {
  setIndex: number;
  fileName: string;
  bytes: Uint8Array;
}

export interface Extraction {
  pdfs: ExtractedPdf[];
  unmatched: string[];
  total: number;
}

async function openZip(bytes: Uint8Array): Promise<JSZip> {
  try {
    return await JSZip.loadAsync(bytes);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    if (/encrypted/i.test(message)) {
      throw new ImportError("encrypted", "This ZIP is password-protected. Pick the nested computer-display ZIP instead.");
    }
    throw new ImportError("not-a-zip", "This file is not a ZIP archive that can be read.");
  }
}

function pdfEntryNames(zip: JSZip): string[] {
  return Object.values(zip.files)
    .filter((entry) => !entry.dir && entry.name.toLowerCase().endsWith(".pdf"))
    .map((entry) => entry.name);
}

/** Reads the archive (descending into TNoodle's nested one) and matches its PDFs to sets. */
export async function extractMatchedPdfs(bytes: Uint8Array, sets: ScrambleSet[]): Promise<Extraction> {
  const outer = await openZip(bytes);
  const choice = chooseArchive(Object.keys(outer.files));
  if (choice.kind === "ambiguous") {
    throw new ImportError("ambiguous", "This ZIP holds several computer-display archives; pick one of them directly.");
  }
  const zip = choice.kind === "nested" ? await openZip(await entryBytes(outer, choice.entryName)) : outer;

  const names = pdfEntryNames(zip);
  const plan = planImport(names, sets);
  const pdfs: ExtractedPdf[] = [];
  for (const [setIndex, entryName] of plan.matches) {
    pdfs.push({ setIndex, fileName: safePdfFileName(entryName), bytes: await entryBytes(zip, entryName) });
  }
  return { pdfs, unmatched: plan.unmatched, total: names.length };
}

async function entryBytes(zip: JSZip, entryName: string): Promise<Uint8Array> {
  const entry = zip.file(entryName);
  if (entry === null) throw new ImportError("not-a-zip", `Archive entry disappeared: ${entryName}`);
  return entry.async("uint8array");
}
