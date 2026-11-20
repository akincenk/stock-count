import { describe, expect, it } from "vitest";
import { CountSession, normalizeCode, parseQuantity } from "../src/count";
import { MemoryStore } from "./helpers";

describe("normalizeCode", () => {
  it("trims and rejects empty or too long codes", () => {
    expect(normalizeCode("  BOLT-M8\n")).toBe("BOLT-M8");
    expect(normalizeCode("   ")).toBeNull();
    expect(normalizeCode("x".repeat(65))).toBeNull();
  });
});

describe("parseQuantity", () => {
  it("accepts whole numbers of zero or more", () => {
    expect(parseQuantity("0")).toBe(0);
    expect(parseQuantity(" 23 ")).toBe(23);
  });

  it("treats a cleared field as no value, not as zero", () => {
    expect(parseQuantity("")).toBeNull();
    expect(parseQuantity("   ")).toBeNull();
  });

  it("rejects fractions, negatives, exponents and huge numbers", () => {
    for (const raw of ["2.5", "-1", "1e3", "abc", "99999999999999999999"]) {
      expect(parseQuantity(raw)).toBeNull();
    }
  });
});

describe("CountSession", () => {
  it("adds, sets and survives a reload", () => {
    const store = new MemoryStore();
    const s = new CountSession(store);
    s.add("A");
    s.add("A");
    s.add("B");
    s.set("B", 7);
    expect(new CountSession(store).counts).toEqual(new Map([["A", 2], ["B", 7]]));
  });

  it("never goes below zero and rejects bad quantities", () => {
    const s = new CountSession(new MemoryStore());
    expect(s.add("A", -3)).toBe(0);
    expect(() => s.set("A", 1.5)).toThrow(RangeError);
    expect(() => s.set("A", -1)).toThrow(RangeError);
  });

  it("starts empty when the saved data is corrupt", () => {
    const store = new MemoryStore();
    store.setItem("stock-count.session", "{nope");
    expect(new CountSession(store).counts.size).toBe(0);
  });
});
