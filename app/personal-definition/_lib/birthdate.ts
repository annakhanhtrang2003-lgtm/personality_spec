const NEWEST_YEAR = 2012;
const OLDEST_YEAR = 1990;

/** Newest first — the audience is current students, who scroll least that way. */
export const YEARS: number[] = Array.from(
  { length: NEWEST_YEAR - OLDEST_YEAR + 1 },
  (_, i) => NEWEST_YEAR - i,
);

export const MONTHS: number[] = Array.from({ length: 12 }, (_, i) => i + 1);

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

const LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function daysInMonth(month: number, year: number): number {
  if (month < 1 || month > 12) return 0;
  if (month === 2 && isLeapYear(year)) return 29;
  return LENGTHS[month - 1]!;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "" whenever the selection is incomplete or impossible — never a guess. */
export function toIso(day: number | null, month: number | null, year: number | null): string {
  if (day === null || month === null || year === null) return "";
  if (month < 1 || month > 12) return "";
  if (day < 1 || day > daysInMonth(month, year)) return "";
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function fromIso(iso: string): { day: number; month: number; year: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (day < 1 || day > daysInMonth(month, year)) return null;
  return { day, month, year };
}
