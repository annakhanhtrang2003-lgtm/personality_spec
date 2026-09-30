import type { Element, Modality, ZodiacResult } from "./types";
import { parseBirthDate } from "./date";
import signs from "./data/zodiac-signs.json";

interface SignRow {
  sun_sign: string;
  start: string;
  end: string;
  element: Element;
  modality: Modality;
  traits: string[];
}

const ROWS = signs as SignRow[];

/** "MM-DD" → comparable integer, e.g. "03-21" → 321. */
function md(monthDay: string): number {
  return Number(monthDay.replace("-", ""));
}

/**
 * Sun sign from birth date.
 *
 * Boundary dates shift by up to a day year to year; Phase 1 uses fixed
 * conventional boundaries and accepts that imprecision (spec §4.1). The
 * dates live in zodiac-signs.json so the convention is visible as data.
 */
export function calculateZodiac(birthDate: string): ZodiacResult {
  parseBirthDate(birthDate, "calculateZodiac");

  const value = md(birthDate.slice(5));

  const row = ROWS.find((r) => {
    const start = md(r.start);
    const end = md(r.end);
    // Ma Kết wraps the year boundary, so its start is greater than its end.
    return start <= end
      ? value >= start && value <= end
      : value >= start || value <= end;
  });

  if (!row) {
    throw new Error(`calculateZodiac: no sign covers ${birthDate}`);
  }

  return {
    sun_sign: row.sun_sign,
    moon_sign: null,
    rising_sign: null,
    element: row.element,
    modality: row.modality,
    // Shallow copy: row.traits is a reference into the imported
    // zodiac-signs.json module object, which Node caches and shares across
    // every calculateZodiac() call in the process. Returning it as-is would
    // let a caller's .push()/.sort() on a returned result corrupt that
    // sign's data for every subsequent call, process-wide.
    traits: [...row.traits],
  };
}
