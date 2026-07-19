import type { Dimension, DimensionScore, MBTIResult, Response } from "./types";
import bank from "./data/questions.json";

export interface QuestionItem {
  id: string;
  dimension: Dimension;
  key: 1 | -1;
  text: string;
}

export interface QuestionBank {
  size: number;
  defaults: Record<Dimension, string>;
  poles: Record<Dimension, { first: string; second: string }>;
  items: QuestionItem[];
}

const BANK = bank as QuestionBank;
const DIMENSIONS: Dimension[] = ["EI", "SN", "TF", "JP"];

/**
 * Score a completed quiz.
 *
 * Per dimension: S = Σ(response × key), where key is +1 when agreement
 * points at the dimension's first pole. With N items per dimension S runs
 * from -2N to +2N. The percentage is a linear remap of that range onto
 * 0…100, so S = 0 reads as an even 50/50 rather than being flattened into
 * a confident letter.
 *
 * S = 0 is genuinely reachable — all-neutral answers, or balanced
 * disagreement — so it resolves to the pole declared in the bank rather
 * than to whichever branch happens to come first. Spec §4.3.
 */
export function scoreMBTI(responses: Response[]): MBTIResult {
  if (responses.length !== BANK.items.length) {
    throw new Error(
      `scoreMBTI: expected ${BANK.items.length} responses, got ${responses.length}`
    );
  }
  for (const [index, r] of responses.entries()) {
    if (!Number.isInteger(r) || r < -2 || r > 2) {
      throw new Error(`scoreMBTI: response at index ${index} out of range: ${r}`);
    }
  }

  const raw: Record<Dimension, number> = { EI: 0, SN: 0, TF: 0, JP: 0 };
  const counts: Record<Dimension, number> = { EI: 0, SN: 0, TF: 0, JP: 0 };

  BANK.items.forEach((item, index) => {
    raw[item.dimension] += responses[index]! * item.key;
    counts[item.dimension] += 1;
  });

  const dimensions = {} as Record<Dimension, DimensionScore>;
  let type = "";

  for (const d of DIMENSIONS) {
    const span = counts[d] * 2;                    // |S| max for this dimension
    const s = raw[d];
    const first = ((s + span) / (span * 2)) * 100;

    dimensions[d] = {
      raw: s,
      first: Number(first.toFixed(1)),
      second: Number((100 - first).toFixed(1)),
    };

    type +=
      s > 0
        ? BANK.poles[d].first
        : s < 0
          ? BANK.poles[d].second
          : BANK.defaults[d];
  }

  return { type, dimensions, traits: [] };
}
