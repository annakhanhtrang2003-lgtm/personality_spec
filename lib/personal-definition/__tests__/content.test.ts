import { describe, it, expect } from "vitest";
import bank from "../data/questions.json";

const DIMENSIONS = ["EI", "SN", "TF", "JP"] as const;

describe("question bank integrity", () => {
  it("holds exactly the declared number of items", () => {
    expect(bank.items).toHaveLength(bank.size);
  });

  it("splits items evenly across the four dimensions", () => {
    for (const d of DIMENSIONS) {
      const items = bank.items.filter((i) => i.dimension === d);
      expect(items, `dimension ${d}`).toHaveLength(bank.size / 4);
    }
  });

  it("balances keying within every dimension", () => {
    for (const d of DIMENSIONS) {
      const items = bank.items.filter((i) => i.dimension === d);
      const plus = items.filter((i) => i.key === 1).length;
      const minus = items.filter((i) => i.key === -1).length;
      expect(plus, `dimension ${d} +1 items`).toBe(items.length / 2);
      expect(minus, `dimension ${d} -1 items`).toBe(items.length / 2);
    }
  });

  it("uses only +1 or -1 as key", () => {
    for (const i of bank.items) {
      expect([1, -1], `item ${i.id}`).toContain(i.key);
    }
  });

  it("has unique ids", () => {
    const ids = bank.items.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("declares a default and poles for every dimension", () => {
    for (const d of DIMENSIONS) {
      expect(bank.defaults).toHaveProperty(d);
      expect(bank.poles).toHaveProperty(d);
    }
  });

  it("defaults to the second pole of each dimension", () => {
    // I, N, F, P — the less socially-desirable pole, so residual
    // acquiescence does not drift the population toward ESTJ. Spec §4.3.
    for (const d of DIMENSIONS) {
      expect(bank.defaults[d], `default for ${d}`).toBe(bank.poles[d].second);
    }
  });

  it("has non-empty Vietnamese text on every item", () => {
    for (const i of bank.items) {
      expect(i.text.trim().length, `item ${i.id}`).toBeGreaterThan(10);
    }
  });
});
