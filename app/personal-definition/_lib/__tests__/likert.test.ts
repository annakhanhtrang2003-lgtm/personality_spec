import { describe, it, expect } from "vitest";
import { LIKERT_SETS, likertFor, QUESTION_COUNT } from "../likert";
import bank from "../data/questions.json";

describe("likert", () => {
  it("keeps both sets on the same five-point symmetric scale", () => {
    for (const [name, set] of Object.entries(LIKERT_SETS)) {
      expect(set.map((o) => o.value), name).toEqual([2, 1, 0, -1, -2]);
      for (const option of set) expect(option.label.length, name).toBeGreaterThan(0);
    }
  });

  it("gives the two sets different wording", () => {
    expect(LIKERT_SETS.self.map((o) => o.label)).not.toEqual(
      LIKERT_SETS.situation.map((o) => o.label),
    );
  });

  it("tags every item with a known label set", () => {
    const items = (bank as { items: { label_set?: string }[] }).items;
    expect(items).toHaveLength(QUESTION_COUNT);
    for (const [i, item] of items.entries()) {
      expect(Object.keys(LIKERT_SETS), `item ${i}`).toContain(item.label_set);
    }
  });

  it("resolves labels for every item index", () => {
    for (let i = 0; i < QUESTION_COUNT; i++) {
      expect(likertFor(i), `item ${i}`).toHaveLength(5);
    }
  });

  it("uses both sets somewhere in the bank", () => {
    const used = new Set(
      Array.from({ length: QUESTION_COUNT }, (_, i) => likertFor(i)[0]!.label),
    );
    expect(used.size).toBe(2);
  });
});
