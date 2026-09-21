// Writes the user-facing version into the desktop app's config. Used by the release
// workflow, where the desktop-vX.Y.Z tag is the only source of the version; run by hand
// with `node scripts/set-app-version.ts 1.2.3`. Node 24 runs the TypeScript directly.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SEMVER = /^\d+\.\d+\.\d+$/;

export function assertVersion(version: string): string {
  if (!SEMVER.test(version)) throw new Error(`"${version}" is not a version like 1.2.3`);
  return version;
}

/** Sets the top-level "version" of a JSON document, keeping its formatting otherwise. */
export function withVersion(json: string, version: string): string {
  const parsed: unknown = JSON.parse(json);
  if (typeof parsed !== "object" || parsed === null || !("version" in parsed)) {
    throw new Error('document has no top-level "version" field');
  }
  return JSON.stringify({ ...parsed, version: assertVersion(version) }, null, 2) + "\n";
}

const VERSIONED_FILES = ["src-tauri/tauri.conf.json", "package.json"];

export function setAppVersion(desktopDir: string, version: string): void {
  for (const file of VERSIONED_FILES) {
    const path = join(desktopDir, file);
    writeFileSync(path, withVersion(readFileSync(path, "utf8"), version));
  }
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) {
  const version = process.argv[2];
  if (version === undefined) {
    console.error("usage: node scripts/set-app-version.ts <x.y.z>");
    process.exit(2);
  }
  setAppVersion(dirname(dirname(fileURLToPath(import.meta.url))), version);
  console.log(`desktop app version set to ${version}`);
}
