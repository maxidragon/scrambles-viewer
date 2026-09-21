import { describe, expect, it } from "vitest";
import { assertVersion, withVersion } from "../scripts/set-app-version";

describe("set-app-version", () => {
  it("rejects anything that is not x.y.z", () => {
    for (const bad of ["1.2", "v1.2.3", "1.2.3-beta", ""]) {
      expect(() => assertVersion(bad)).toThrow();
    }
    expect(assertVersion("1.2.3")).toBe("1.2.3");
  });

  it("replaces only the version field and keeps the rest", () => {
    const out = withVersion('{\n  "productName": "X",\n  "version": "0.1.0",\n  "build": {}\n}\n', "1.4.0");
    expect(JSON.parse(out)).toEqual({ productName: "X", version: "1.4.0", build: {} });
    expect(out.endsWith("\n")).toBe(true);
  });

  it("refuses a document without a version field", () => {
    expect(() => withVersion("{}", "1.0.0")).toThrow(/version/);
  });
});
