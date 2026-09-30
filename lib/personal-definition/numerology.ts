import type { NumerologyResult } from "./types";
import { normalizeVietnamese } from "./normalize";
import { parseBirthDate } from "./date";
import interpretations from "./data/numerology-interpretations.json";

const PYTHAGOREAN: Record<string, number> = {
  A: 1, J: 1, S: 1,
  B: 2, K: 2, T: 2,
  C: 3, L: 3, U: 3,
  D: 4, M: 4, V: 4,
  E: 5, N: 5, W: 5,
  F: 6, O: 6, X: 6,
  G: 7, P: 7, Y: 7,
  H: 8, Q: 8, Z: 8,
  I: 9, R: 9,
};

/**
 * Y counts as a vowel unconditionally. In Vietnamese it functions as one
 * (Lý, Thúy), and any context-dependent rule would make the result depend
 * on parsing rather than arithmetic. Documented convention, spec §4.2.
 */
const VOWELS = new Set(["A", "E", "I", "O", "U", "Y"]);

const MASTERS = new Set([11, 22, 33]);

/** Sum digits repeatedly until single-digit, stopping early on 11/22/33. */
export function reduceNumber(n: number): number {
  let value = n;
  while (value > 9 && !MASTERS.has(value)) {
    value = String(value)
      .split("")
      .reduce((sum, digit) => sum + Number(digit), 0);
  }
  return value;
}

function sumLetters(letters: string, filter?: (c: string) => boolean): number {
  return letters
    .split("")
    .filter((c) => (filter ? filter(c) : true))
    .reduce((sum, c) => sum + (PYTHAGOREAN[c] ?? 0), 0);
}

export function calculateNumerology(
  birthDate: string,
  fullName: string
): NumerologyResult {
  const { year, month, day } = parseBirthDate(birthDate, "calculateNumerology");

  const letters = normalizeVietnamese(fullName);
  if (letters.length === 0) {
    throw new Error("calculateNumerology: name has no mappable letters");
  }

  const life_path = reduceNumber(
    reduceNumber(day) + reduceNumber(month) + reduceNumber(year)
  );
  const expression = reduceNumber(sumLetters(letters));
  const soul_urge = reduceNumber(sumLetters(letters, (c) => VOWELS.has(c)));
  const personality = reduceNumber(sumLetters(letters, (c) => !VOWELS.has(c)));

  const table = interpretations as Record<string, Record<string, string>>;
  const look = (kind: string, value: number): string =>
    table[kind]?.[String(value)] ?? "";

  return {
    life_path,
    expression,
    soul_urge,
    personality,
    interpretations: {
      life_path: look("life_path", life_path),
      expression: look("expression", expression),
      soul_urge: look("soul_urge", soul_urge),
      personality: look("personality", personality),
    },
  };
}
