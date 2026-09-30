import { buildProfile } from "../../_lib/profile";
import type { Dimension, Response } from "../../_lib/types";
import bank from "../../_lib/data/questions.json";

const DIMENSIONS: Dimension[] = ["EI", "SN", "TF", "JP"];

interface BankItem {
  dimension: Dimension;
  key: 1 | -1;
}

const ITEMS = (bank as { items: BankItem[] }).items;

/**
 * Spreads `target` — the desired raw dimension score, S = Σ(response × key)
 * — evenly across a dimension's items so every individual response stays a
 * legal Likert value (-2..2), rather than maxing a couple of items out and
 * leaving the rest neutral. `Math.floor` handles negative targets the same
 * way as positive ones (floor rounds toward -∞), so the same formula lands
 * the score on whichever pole `target`'s sign points at.
 */
function spreadResponses(keys: Array<1 | -1>, target: number): Response[] {
  const n = keys.length;
  const base = Math.floor(target / n);
  const remainder = target - base * n; // items that need one extra +1 of "confidence"
  return keys.map((key, i) => ((base + (i < remainder ? 1 : 0)) * key) as Response);
}

/**
 * The naive fixture — every question answered neutrally — ties all four
 * dimensions at exactly 50%. That's structurally blind to a whole class of
 * rendering bugs: a bar showing another dimension's percentage, or a pole
 * name paired with the wrong row, is invisible when every row reads "50%".
 * It also means `dominantPole` only ever gets exercised through its tie
 * branch here, never its ordinary one.
 *
 * This fixture instead gives each dimension a distinct, non-tied raw score:
 * strongly toward E, mildly toward S, mildly toward F (the "other" pole of
 * TF), strongly toward P (the "other" pole of JP) — so all four bars are
 * individually checkable and the type comes out ESFP.
 */
function buildDistinctResponses(): Response[] {
  const targets: Record<Dimension, number> = { EI: 18, SN: 8, TF: -4, JP: -12 };
  const cursor: Record<Dimension, number> = { EI: 0, SN: 0, TF: 0, JP: 0 };
  const perDimension = DIMENSIONS.reduce(
    (acc, d) => {
      const keys = ITEMS.filter((it) => it.dimension === d).map((it) => it.key);
      acc[d] = spreadResponses(keys, targets[d]);
      return acc;
    },
    {} as Record<Dimension, Response[]>,
  );
  return ITEMS.map((item) => {
    const response = perDimension[item.dimension][cursor[item.dimension]]!;
    cursor[item.dimension] += 1;
    return response;
  });
}

export const profile = buildProfile({
  name: "Khánh",
  university: "ueh",
  birth_date: "2003-06-15",
  full_name: "Nguyễn Thị Khánh Trang",
  responses: buildDistinctResponses(),
});
