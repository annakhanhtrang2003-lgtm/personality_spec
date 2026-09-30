import type { Dimension, DimensionScore } from "./types";

export const POLE_NAMES: Record<string, string> = {
  E: "Hướng ngoại",
  I: "Hướng nội",
  S: "Thực tế",
  N: "Trực giác",
  T: "Lý trí",
  F: "Cảm xúc",
  J: "Nguyên tắc",
  P: "Linh hoạt",
};

/** Mirrors questions.json `poles`. */
const POLES: Record<Dimension, { first: string; second: string }> = {
  EI: { first: "E", second: "I" },
  SN: { first: "S", second: "N" },
  TF: { first: "T", second: "F" },
  JP: { first: "J", second: "P" },
};

/**
 * A dead tie resolves to the second pole, matching questions.json `defaults`
 * (I, N, F, P) and the scorer — so the bar and the four-letter type can never
 * disagree about which side won.
 */
export function dominantPole(
  dimension: Dimension,
  score: DimensionScore,
): { pole: string; name: string; percent: number } {
  const { first, second } = POLES[dimension];
  const firstWins = score.first > score.second;
  const pole = firstWins ? first : second;
  return {
    pole,
    name: POLE_NAMES[pole]!,
    percent: firstWins ? score.first : score.second,
  };
}
