import { appDataDir, join } from "@tauri-apps/api/path";
import { BaseDirectory, exists, mkdir, remove, writeFile } from "@tauri-apps/plugin-fs";
import type { ScrambleSet } from "@shared/types/wcif";
import { extractMatchedPdfs } from "./archive";

// The one directory the capability file lets the webview write to.
const PDF_DIR = "scramble_pdfs";
const IN_APP_DATA = { baseDir: BaseDirectory.AppData };

export interface ImportResult {
  sets: ScrambleSet[];
  matched: number;
  total: number;
  unmatched: string[];
}

export async function importZip(bytes: Uint8Array, sets: ScrambleSet[]): Promise<ImportResult> {
  const extraction = await extractMatchedPdfs(bytes, sets);
  await mkdir(PDF_DIR, { ...IN_APP_DATA, recursive: true });
  const dir = await join(await appDataDir(), PDF_DIR);

  const updated = sets.map((s) => ({ ...s }));
  for (const pdf of extraction.pdfs) {
    await writeFile(`${PDF_DIR}/${pdf.fileName}`, pdf.bytes, IN_APP_DATA);
    updated[pdf.setIndex] = { ...updated[pdf.setIndex], pdfPath: await join(dir, pdf.fileName) };
  }
  return { sets: updated, matched: extraction.pdfs.length, total: extraction.total, unmatched: extraction.unmatched };
}

export async function clearPdfs(): Promise<void> {
  if (await exists(PDF_DIR, IN_APP_DATA)) await remove(PDF_DIR, { ...IN_APP_DATA, recursive: true });
}
