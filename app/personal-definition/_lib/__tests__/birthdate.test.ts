import { describe, it, expect } from "vitest";
import { YEARS, MONTHS, daysInMonth, toIso, fromIso } from "../birthdate";

describe("birthdate", () => {
  it("offers 2012 down to 1990, newest first", () => {
    expect(YEARS[0]).toBe(2012);
    expect(YEARS[YEARS.length - 1]).toBe(1990);
    expect(YEARS).toHaveLength(23);
  });

  it("offers twelve months", () => {
    expect(MONTHS).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it("knows month lengths", () => {
    expect(daysInMonth(1, 2004)).toBe(31);
    expect(daysInMonth(4, 2004)).toBe(30);
    expect(daysInMonth(12, 2004)).toBe(31);
  });

  it("handles February across the leap rules", () => {
    expect(daysInMonth(2, 2003)).toBe(28);
    expect(daysInMonth(2, 2004)).toBe(29); // divisible by 4
    expect(daysInMonth(2, 1900)).toBe(28); // century, not divisible by 400
    expect(daysInMonth(2, 2000)).toBe(29); // divisible by 400
  });

  it("builds a zero-padded ISO date", () => {
    expect(toIso(5, 3, 2004)).toBe("2004-03-05");
    expect(toIso(31, 12, 1999)).toBe("1999-12-31");
  });

  it("returns an empty string until all three parts are chosen", () => {
    expect(toIso(null, 3, 2004)).toBe("");
    expect(toIso(5, null, 2004)).toBe("");
    expect(toIso(5, 3, null)).toBe("");
    expect(toIso(null, null, null)).toBe("");
  });

  it("returns an empty string for a day the month does not have", () => {
    expect(toIso(31, 4, 2004)).toBe("");
    expect(toIso(29, 2, 2003)).toBe("");
  });

  it("round-trips an ISO date", () => {
    expect(fromIso("2004-03-05")).toEqual({ day: 5, month: 3, year: 2004 });
  });

  it("returns null for junk or empty input", () => {
    expect(fromIso("")).toBeNull();
    expect(fromIso("05/03/2004")).toBeNull();
    expect(fromIso("2004-13-01")).toBeNull();
  });
});
