import { describe, it, expect } from "vitest";
import { parseBirthDate } from "../date";

const CALLER = "testCaller";

describe("parseBirthDate", () => {
  it("returns year, month, day for a normal date", () => {
    expect(parseBirthDate("2003-06-15", CALLER)).toEqual({
      year: 2003,
      month: 6,
      day: 15,
    });
  });

  it("rejects input not matching YYYY-MM-DD shape, naming the caller and input", () => {
    expect(() => parseBirthDate("15-06-2003", CALLER)).toThrow(/YYYY-MM-DD/);
    expect(() => parseBirthDate("15-06-2003", CALLER)).toThrow(/testCaller/);
    expect(() => parseBirthDate("15-06-2003", CALLER)).toThrow(/15-06-2003/);
  });

  it("rejects garbage strings as malformed", () => {
    expect(() => parseBirthDate("not-a-date", CALLER)).toThrow(/YYYY-MM-DD/);
    expect(() => parseBirthDate("", CALLER)).toThrow(/YYYY-MM-DD/);
  });

  it("rejects month 0 as not a real date", () => {
    expect(() => parseBirthDate("2003-00-10", CALLER)).toThrow(/not a real date/);
    expect(() => parseBirthDate("2003-00-10", CALLER)).toThrow(/testCaller/);
    expect(() => parseBirthDate("2003-00-10", CALLER)).toThrow(/2003-00-10/);
  });

  it("rejects month 13 (and other >12 months) as not a real date", () => {
    expect(() => parseBirthDate("2003-13-01", CALLER)).toThrow(/not a real date/);
  });

  it("rejects day 0 as not a real date", () => {
    expect(() => parseBirthDate("2003-05-00", CALLER)).toThrow(/not a real date/);
  });

  it("rejects a day beyond the month's length as not a real date", () => {
    expect(() => parseBirthDate("2003-02-30", CALLER)).toThrow(/not a real date/);
    expect(() => parseBirthDate("2003-04-31", CALLER)).toThrow(/not a real date/);
  });

  it("rejects the fully-zero 0000-00-00 shape as not a real date", () => {
    expect(() => parseBirthDate("2003-00-00", CALLER)).toThrow(/not a real date/);
  });

  it("rejects Feb 29 in a non-leap year", () => {
    expect(() => parseBirthDate("1900-02-29", CALLER)).toThrow(/not a real date/);
    expect(() => parseBirthDate("2023-02-29", CALLER)).toThrow(/not a real date/);
  });

  it("accepts Feb 29 in a leap year (divisible by 4, or by 400)", () => {
    expect(parseBirthDate("2000-02-29", CALLER)).toEqual({
      year: 2000,
      month: 2,
      day: 29,
    });
    expect(parseBirthDate("2024-02-29", CALLER)).toEqual({
      year: 2024,
      month: 2,
      day: 29,
    });
  });

  it("rejects centuries not divisible by 400 as non-leap (1900) but accepts 2000", () => {
    expect(() => parseBirthDate("1900-02-29", CALLER)).toThrow(/not a real date/);
    expect(parseBirthDate("2000-02-29", CALLER).day).toBe(29);
  });

  it("accepts the last valid day of every month, rejects the day after", () => {
    const lastDayNonLeap: Record<number, number> = {
      1: 31,
      2: 28,
      3: 31,
      4: 30,
      5: 31,
      6: 30,
      7: 31,
      8: 31,
      9: 30,
      10: 31,
      11: 30,
      12: 31,
    };

    for (const [monthStr, last] of Object.entries(lastDayNonLeap)) {
      const month = Number(monthStr);
      const mm = String(month).padStart(2, "0");
      const dd = String(last).padStart(2, "0");
      expect(parseBirthDate(`2023-${mm}-${dd}`, CALLER)).toEqual({
        year: 2023,
        month,
        day: last,
      });

      const overDd = String(last + 1).padStart(2, "0");
      expect(() => parseBirthDate(`2023-${mm}-${overDd}`, CALLER)).toThrow(
        /not a real date/,
      );
    }
  });
});
