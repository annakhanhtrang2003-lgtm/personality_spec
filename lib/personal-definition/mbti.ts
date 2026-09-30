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
 *
 * `bank` defaults to the shipped question bank; Task 8 calls scoreMBTI
 * with a single argument, so that call site is unaffected. The parameter
 * exists so tests can exercise the tie-default rule against a bank whose
 * `defaults` differ from its `second` poles.
 */
export function scoreMBTI(responses: Response[], questionBank: QuestionBank = BANK): MBTIResult {
  if (questionBank.size !== questionBank.items.length) {
    throw new Error(
      `scoreMBTI: questionBank.size (${questionBank.size}) does not match items.length (${questionBank.items.length})`
    );
  }
  for (const d of DIMENSIONS) {
    const hasItem = questionBank.items.some((item) => item.dimension === d);
    if (!hasItem) {
      throw new Error(`scoreMBTI: questionBank has no items for dimension ${d}`);
    }
    if (!questionBank.defaults[d]) {
      throw new Error(`scoreMBTI: questionBank is missing a default for dimension ${d}`);
    }
    if (!questionBank.poles[d] || !questionBank.poles[d].first || !questionBank.poles[d].second) {
      throw new Error(`scoreMBTI: questionBank is missing poles for dimension ${d}`);
    }
  }
  if (responses.length !== questionBank.items.length) {
    throw new Error(
      `scoreMBTI: expected ${questionBank.items.length} responses, got ${responses.length}`
    );
  }
  for (const [index, r] of responses.entries()) {
    if (!Number.isInteger(r) || r < -2 || r > 2) {
      throw new Error(`scoreMBTI: response at index ${index} out of range: ${r}`);
    }
  }

  const raw: Record<Dimension, number> = { EI: 0, SN: 0, TF: 0, JP: 0 };
  const counts: Record<Dimension, number> = { EI: 0, SN: 0, TF: 0, JP: 0 };

  questionBank.items.forEach((item, index) => {
    raw[item.dimension] += responses[index]! * item.key;
    counts[item.dimension] += 1;
  });

  const dimensions = {} as Record<Dimension, DimensionScore>;
  let type = "";

  for (const d of DIMENSIONS) {
    const span = counts[d] * 2;                    // |S| max for this dimension
    const s = raw[d];
    const first = ((s + span) / (span * 2)) * 100;

    const roundedFirst = Number(first.toFixed(1));

    dimensions[d] = {
      raw: s,
      first: roundedFirst,
      second: Number((100 - roundedFirst).toFixed(1)),
    };

    type +=
      s > 0
        ? questionBank.poles[d].first
        : s < 0
          ? questionBank.poles[d].second
          : questionBank.defaults[d];
  }

  return { type, dimensions, traits: [] };
}
