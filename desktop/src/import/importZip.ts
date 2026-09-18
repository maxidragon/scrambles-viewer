import type { ScrambleSet } from "@shared/types/wcif";
import { pdfFiles } from "../platform/pdfFiles";
import { extractMatchedPdfs } from "./archive";

export interface ImportResult {
  sets: ScrambleSet[];
  matched: number;
  total: number;
  unmatched: string[];
}

export async function importZip(bytes: Uint8Array, sets: ScrambleSet[]): Promise<ImportResult> {
  const extraction = await extractMatchedPdfs(bytes, sets);
  const files = pdfFiles();
  const updated = sets.map((s) => ({ ...s }));
  for (const pdf of extraction.pdfs) {
    const pdfPath = await files.write(pdf.fileName, pdf.bytes);
    updated[pdf.setIndex] = { ...updated[pdf.setIndex], pdfPath };
  }
  return { sets: updated, matched: extraction.pdfs.length, total: extraction.total, unmatched: extraction.unmatched };
}

export function clearPdfs(): Promise<void> {
  return pdfFiles().clear();
}
