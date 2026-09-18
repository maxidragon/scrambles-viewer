import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// The desktop app imports these from the mobile source tree (SPEC-001). They must stay
// free of React Native and Expo, or the desktop build breaks the moment mobile touches them.
const SHARED_MODULES = [
  "types/wcif.ts",
  "api/wca.ts",
  "utils/schedule.ts",
  "utils/pdfMatching.ts",
  "utils/eventNames.ts",
  "utils/setLock.ts",
];

const NATIVE_ONLY = /^(react-native|expo|@react-native|@expo)(\/|$|-)/;

function importSpecifiers(source: string): string[] {
  return [...source.matchAll(/from\s+["']([^"']+)["']/g)].map((m) => m[1] ?? "");
}

describe("shared modules", () => {
  for (const module of SHARED_MODULES) {
    it(`${module} imports nothing native-only`, () => {
      const path = fileURLToPath(new URL(`../../src/${module}`, import.meta.url));
      const offenders = importSpecifiers(readFileSync(path, "utf8")).filter((s) => NATIVE_ONLY.test(s));
      expect(offenders).toEqual([]);
    });
  }
});
