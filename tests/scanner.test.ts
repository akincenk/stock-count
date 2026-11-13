import { describe, expect, it } from "vitest";
import { makeDebounce } from "../src/scanner";

describe("makeDebounce", () => {
  it("counts a held barcode once and a new one right away", () => {
    let t = 0;
    const fresh = makeDebounce(1500, () => t);
    expect(fresh("A")).toBe(true);
    t = 500;
    expect(fresh("A")).toBe(false);
    t = 1800; // still in view, last seen at 500 -> 1300 ms ago
    expect(fresh("A")).toBe(false);
    t = 1900;
    expect(fresh("B")).toBe(true);
    t = 4000; // A taken away and scanned again later
    expect(fresh("A")).toBe(true);
  });
});
