import type { Response } from "./types";
import questionBank from "./data/questions.json";

export type LabelSet = "self" | "situation";

interface Option {
  value: Response;
  label: string;
}

/**
 * Both sets are five points, most-agree first, with matching intensity at
 * each position. Scoring is S = Σ(r × key), so an asymmetric or shorter set
 * would quietly bias every result that used it.
 */
export const LIKERT_SETS: Record<LabelSet, readonly Option[]> = {
  self: [
    { value: 2, label: "Đúng y chang mình" },
    { value: 1, label: "Hơi giống mình" },
    { value: 0, label: "Tuỳ lúc" },
    { value: -1, label: "Không giống lắm" },
    { value: -2, label: "Không phải mình" },
  ],
  situation: [
    { value: 2, label: "Chuẩn luôn" },
    { value: 1, label: "Thường là vậy" },
    { value: 0, label: "Còn tuỳ" },
    { value: -1, label: "Ít khi" },
    { value: -2, label: "Không bao giờ" },
  ],
};

interface BankItem {
  text: string;
  label_set?: LabelSet;
}

const ITEMS = (questionBank as { items: BankItem[] }).items;

/** Derived from the bank so the view and the scorer can never disagree. */
export const QUESTION_COUNT = ITEMS.length;

export function likertFor(index: number): readonly Option[] {
  return LIKERT_SETS[ITEMS[index]?.label_set ?? "self"];
}
