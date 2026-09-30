import { describe, it, expect } from "vitest";
import { reduceNumber, calculateNumerology } from "../numerology";

describe("reduceNumber", () => {
  it("reduces to a single digit", () => {
    expect(reduceNumber(7)).toBe(7);
    expect(reduceNumber(12)).toBe(3);
    expect(reduceNumber(48)).toBe(3);   // 48 → 12 → 3
  });

  it("stops at a master number", () => {
    expect(reduceNumber(29)).toBe(11);  // 29 → 11, stop
    expect(reduceNumber(38)).toBe(11);
    expect(reduceNumber(22)).toBe(22);
    expect(reduceNumber(33)).toBe(33);
  });

  it("stops at a master reached part-way down the chain", () => {
    expect(reduceNumber(209)).toBe(11); // 2+0+9 = 11, stop
    expect(reduceNumber(994)).toBe(22); // 9+9+4 = 22, stop
  });

  it("does not mistake a non-master two-digit result for a stop", () => {
    expect(reduceNumber(695)).toBe(2);  // 6+9+5 = 20 → 2
  });
});

describe("calculateNumerology", () => {
  const name = "Nguyễn Thị Khánh Trang";

  it("computes life path by reducing D, M, Y then summing", () => {
    // 2003-06-15 → day 15→6, month 6→6, year 2003→5; 6+6+5=17→8
    expect(calculateNumerology("2003-06-15", name).life_path).toBe(8);
  });

  it("computes expression from every letter", () => {
    // NGUYENTHIKHANHTRANG
    // N5 G7 U3 Y7 E5 N5 T2 H8 I9 K2 H8 A1 N5 H8 T2 R9 A1 N5 G7 = 99 → 18 → 9
    expect(calculateNumerology("2003-06-15", name).expression).toBe(9);
  });

  it("computes soul urge from vowels only, counting Y as a vowel", () => {
    // Vowels of NGUYENTHIKHANHTRANG: U3 Y7 E5 I9 A1 A1 = 26 → 8
    expect(calculateNumerology("2003-06-15", name).soul_urge).toBe(8);
  });

  it("computes personality from consonants only", () => {
    // expression 99 - soul 26 = 73 → 10 → 1
    expect(calculateNumerology("2003-06-15", name).personality).toBe(1);
  });

  it("splits every letter into exactly one of soul urge or personality", () => {
    // Digital roots add, so vowel-sum + consonant-sum must have the same
    // root as the full letter sum. Asserted on the *unreduced* sums via a
    // known case, because master numbers deliberately break the identity
    // once reduction has been applied — 11 does not reduce to 2 here.
    const r = calculateNumerology("2003-06-15", name);
    expect(r.soul_urge).toBe(8);      // vowels   26 → 8
    expect(r.personality).toBe(1);    // consonants 73 → 10 → 1
    expect(r.expression).toBe(9);     // all       99 → 18 → 9
    expect(reduceNumber(26 + 73)).toBe(9);
  });

  it("treats Đ as D", () => {
    expect(calculateNumerology("2000-01-01", "Đức").expression).toBe(
      calculateNumerology("2000-01-01", "Duc").expression
    );
  });

  it("ignores diacritics entirely", () => {
    expect(calculateNumerology("2000-01-01", "Nguyễn Thuý").expression).toBe(
      calculateNumerology("2000-01-01", "Nguyen Thuy").expression
    );
  });

  it("rejects a name with no mappable letters", () => {
    expect(() => calculateNumerology("2000-01-01", "!!! 123")).toThrow(
      /no mappable letters/
    );
  });

  it("rejects a malformed date", () => {
    expect(() => calculateNumerology("01-01-2000", "Duc")).toThrow(/YYYY-MM-DD/);
  });

  it("rejects a well-formed but impossible calendar date", () => {
    expect(() => calculateNumerology("2000-02-30", "Duc")).toThrow(/not a real date/);
    expect(() => calculateNumerology("2000-13-01", "Duc")).toThrow(/not a real date/);
  });
});
