export interface ParsedBirthDate {
  year: number;
  month: number; // 1-12
  day: number; // 1-31, valid for the month
}

/**
 * Gregorian leap-year rule: divisible by 4, except centuries, except
 * centuries divisible by 400. (2000 and 2024 are leap; 1900 and 2023 are not.)
 */
function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** Number of days in `month` (1-12) for `year`, computed arithmetically. */
function daysInMonth(year: number, month: number): number {
  const lengths = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return lengths[month - 1] as number;
}

/**
 * Parses and validates a "YYYY-MM-DD" birth date string.
 *
 * Unlike `new Date(...)`, this never rolls an impossible date over into a
 * neighboring one (e.g. "2003-02-30" does NOT become March 2) — it throws.
 * No `Date` object is used; the calendar is computed by hand.
 */
export function parseBirthDate(input: string, caller: string): ParsedBirthDate {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
  if (!match) {
    throw new Error(`${caller}: expected YYYY-MM-DD, got "${input}"`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (month < 1 || month > 12) {
    throw new Error(`${caller}: "${input}" is not a real date`);
  }

  if (day < 1 || day > daysInMonth(year, month)) {
    throw new Error(`${caller}: "${input}" is not a real date`);
  }

  return { year, month, day };
}
