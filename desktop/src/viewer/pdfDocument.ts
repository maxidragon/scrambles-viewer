// The legacy build carries the polyfills the main build assumes of a 2025 browser; it
// keeps older WebKitGTK and WebView2 releases working and runs under Node in tests.
import {
  GlobalWorkerOptions,
  PasswordResponses,
  getDocument,
  type PDFDocumentProxy,
} from "pdfjs-dist/legacy/build/pdf.mjs";

if (typeof window !== "undefined") {
  GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();
}

export type OpenOutcome =
  | { kind: "open"; document: PDFDocumentProxy; close(): Promise<void> }
  | { kind: "needs-password" }
  | { kind: "wrong-password" };

/**
 * Opens a PDF and reports what PDF.js says about its password, instead of assuming the
 * file is encrypted: an unencrypted printing PDF simply opens (SPEC-004).
 */
export async function openPdf(bytes: Uint8Array, password: string | null): Promise<OpenOutcome> {
  // PDF.js transfers the buffer to its worker, so the caller's copy must stay intact.
  const task = getDocument({ data: bytes.slice(), password: password ?? undefined });
  let passwordOutcome: "needs-password" | "wrong-password" | null = null;
  task.onPassword = (update: (value: Error) => void, reason: number) => {
    passwordOutcome = reason === PasswordResponses.INCORRECT_PASSWORD ? "wrong-password" : "needs-password";
    update(new Error("password required"));
  };
  try {
    return { kind: "open", document: await task.promise, close: () => task.destroy() };
  } catch (e: unknown) {
    if (passwordOutcome !== null) return { kind: passwordOutcome };
    throw e;
  }
}
