import { appDataDir, join } from "@tauri-apps/api/path";
import { BaseDirectory, exists, mkdir, readFile, remove, writeFile } from "@tauri-apps/plugin-fs";
import { hasTauriBridge } from "./tauri";

/** Where extracted scramble PDFs live. Paths handed out are what `ScrambleSet.pdfPath` stores. */
export interface PdfFiles {
  write(fileName: string, bytes: Uint8Array): Promise<string>;
  read(path: string): Promise<Uint8Array>;
  clear(): Promise<void>;
}

// The one directory the capability file lets the webview touch.
const PDF_DIR = "scramble_pdfs";
const IN_APP_DATA = { baseDir: BaseDirectory.AppData };

const onDisk: PdfFiles = {
  async write(fileName, bytes) {
    await mkdir(PDF_DIR, { ...IN_APP_DATA, recursive: true });
    await writeFile(`${PDF_DIR}/${fileName}`, bytes, IN_APP_DATA);
    return join(await appDataDir(), PDF_DIR, fileName);
  },
  read(path) {
    return readFile(path);
  },
  async clear() {
    if (await exists(PDF_DIR, IN_APP_DATA)) await remove(PDF_DIR, { ...IN_APP_DATA, recursive: true });
  },
};

// Plain-browser development: nothing is written anywhere.
const MEMORY_SCHEME = "memory://";
const memoryFiles = new Map<string, Uint8Array>();
const inMemory: PdfFiles = {
  async write(fileName, bytes) {
    const path = MEMORY_SCHEME + fileName;
    memoryFiles.set(path, bytes);
    return path;
  },
  async read(path) {
    const bytes = memoryFiles.get(path);
    if (bytes === undefined) throw new Error(`No PDF at ${path}`);
    return bytes;
  },
  async clear() {
    memoryFiles.clear();
  },
};

export function pdfFiles(): PdfFiles {
  return hasTauriBridge() ? onDisk : inMemory;
}
