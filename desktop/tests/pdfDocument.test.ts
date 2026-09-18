import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { openPdf } from "../src/viewer/pdfDocument";

function fixture(name: string): Uint8Array {
  return new Uint8Array(readFileSync(fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url))));
}

describe("openPdf", () => {
  it("opens an unencrypted PDF without asking for a password", async () => {
    const outcome = await openPdf(fixture("plain.pdf"), null);
    expect(outcome.kind).toBe("open");
    if (outcome.kind === "open") {
      expect(outcome.document.numPages).toBe(2);
      await outcome.close();
    }
  });

  it("reports that an encrypted PDF needs a password", async () => {
    expect((await openPdf(fixture("encrypted.pdf"), null)).kind).toBe("needs-password");
  });

  it("distinguishes a wrong password from a missing one", async () => {
    expect((await openPdf(fixture("encrypted.pdf"), "not-it")).kind).toBe("wrong-password");
  });

  it("opens with the right password and leaves the caller's bytes intact", async () => {
    const bytes = fixture("encrypted.pdf");
    const outcome = await openPdf(bytes, "set-a-passcode");
    expect(outcome.kind).toBe("open");
    expect(bytes.byteLength).toBeGreaterThan(0);
    if (outcome.kind === "open") await outcome.close();
  });
});
