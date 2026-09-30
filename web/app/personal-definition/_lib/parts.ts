import { QUESTION_COUNT } from "./likert";

export const PART_SIZE = 10;
export const PART_COUNT = QUESTION_COUNT / PART_SIZE;

// A bank size that stops dividing evenly would silently produce a short or
// empty final part. Fail at import instead.
if (!Number.isInteger(PART_COUNT)) {
  throw new Error(
    `parts: ${QUESTION_COUNT} questions do not divide into parts of ${PART_SIZE}`,
  );
}

/**
 * One part per dimension, in EI, SN, TF, JP order — questions.json is grouped
 * that way so the intro's preview cards ("Phần 1 · E/I", …) tell the truth.
 * parts.test.ts pins it. Scores are unaffected: each item carries its own
 * dimension and key, and responses are indexed against the same file.
 */
export const PART_TITLES = [
  "Bạn giữa mọi người",
  "Cách bạn tiếp nhận",
  "Cách bạn quyết định",
  "Cách bạn sắp xếp",
] as const;

export function partOf(index: number): number {
  return Math.floor(index / PART_SIZE);
}

export function indexWithinPart(index: number): number {
  return index % PART_SIZE;
}

export function firstIndexOfPart(part: number): number {
  return part * PART_SIZE;
}

export function lastIndexOfPart(part: number): number {
  return part * PART_SIZE + PART_SIZE - 1;
}

/** Every absolute item index belonging to `part`, ascending. */
export function indicesOfPart(part: number): number[] {
  const first = firstIndexOfPart(part);
  return Array.from({ length: PART_SIZE }, (_, i) => first + i);
}

/**
 * The 50% boundary. The interlude after this part reveals zodiac and
 * numerology and shows MBTI as locked; the other two interludes show only
 * an encouragement line. Spec §5.
 */
export const TEASER_PART = 1;
