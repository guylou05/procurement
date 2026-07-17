import { describe, it, expect } from "vitest";
import { toMinor, toMajor, minorUnitFactor, formatMoney } from "@/lib/money";

describe("money (minor units)", () => {
  it("treats XAF/XOF as zero-decimal currencies", () => {
    expect(minorUnitFactor("XAF")).toBe(1);
    expect(minorUnitFactor("XOF")).toBe(1);
    expect(toMinor(5000, "XAF")).toBe(5000);
    expect(toMajor(5000, "XAF")).toBe(5000);
  });

  it("treats USD/EUR as two-decimal currencies", () => {
    expect(minorUnitFactor("USD")).toBe(100);
    expect(toMinor(19.99, "USD")).toBe(1999);
    expect(toMajor(1999, "USD")).toBe(19.99);
  });

  it("rounds to avoid float drift", () => {
    expect(toMinor(0.1 + 0.2, "USD")).toBe(30);
  });

  it("formats currency without throwing for African currencies", () => {
    expect(typeof formatMoney(45000000, "XAF", "fr")).toBe("string");
    expect(formatMoney(1999, "USD", "en")).toContain("19.99");
  });
});
