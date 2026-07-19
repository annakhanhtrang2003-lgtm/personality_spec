import { describe, it, expect } from "vitest";
import { scoreMBTI } from "../mbti";
import type { QuestionBank, QuestionItem } from "../mbti";
import bank from "../data/questions.json";
import type { Dimension, Response } from "../types";

/** Answer every item at `r`, honouring its key so all dimensions land the same way. */
function allToward(pole: "first" | "second", magnitude: 1 | 2): Response[] {
  return bank.items.map((i) => {
    const sign = pole === "first" ? 1 : -1;
    return (sign * i.key * magnitude) as Response;
  });
}

const NEUTRAL = (): Response[] => bank.items.map(() => 0 as Response);

describe("scoreMBTI", () => {
  it("returns maximum score when every answer points to the first pole", () => {
    const r = scoreMBTI(allToward("first", 2));
    expect(r.type).toBe("ESTJ");
    for (const d of ["EI", "SN", "TF", "JP"] as const) {
      expect(r.dimensions[d].raw).toBe(bank.size / 4 * 2);
      expect(r.dimensions[d].first).toBe(100);
      expect(r.dimensions[d].second).toBe(0);
    }
  });

  it("returns minimum score when every answer points to the second pole", () => {
    const r = scoreMBTI(allToward("second", 2));
    expect(r.type).toBe("INFP");
    for (const d of ["EI", "SN", "TF", "JP"] as const) {
      expect(r.dimensions[d].raw).toBe(-(bank.size / 4) * 2);
      expect(r.dimensions[d].first).toBe(0);
    }
  });

  it("falls back to the declared defaults when every dimension ties at zero", () => {
    const r = scoreMBTI(NEUTRAL());
    const expectedType = (["EI", "SN", "TF", "JP"] as const)
      .map((d) => bank.defaults[d])
      .join("");
    expect(r.type).toBe(expectedType);
    for (const d of ["EI", "SN", "TF", "JP"] as const) {
      expect(r.dimensions[d].raw).toBe(0);
      expect(r.dimensions[d].first).toBe(50);
      expect(r.dimensions[d].second).toBe(50);
    }
  });

  it("resolves ties to the bank's declared defaults, not to the second pole, when the two differ", () => {
    // A bank whose `defaults` are deliberately the OPPOSITE of `second` for
    // every dimension. If scoreMBTI ever fell back to `poles[d].second` (or
    // to hardcoded letters) instead of genuinely reading `defaults`, this
    // would produce "INFP" instead of the expected "ESTJ".
    const flippedDefaultsBank: QuestionBank = {
      ...(bank as unknown as QuestionBank),
      defaults: { EI: "E", SN: "S", TF: "T", JP: "J" },
    };
    const r = scoreMBTI(NEUTRAL(), flippedDefaultsBank);
    expect(r.type).toBe("ESTJ");
  });

  it("keeps first and second complementary across a range of deterministic response vectors", () => {
    const vectors: Response[][] = [];

    // The original single vector this test used to check, kept as one case
    // among many rather than dropped.
    const original = NEUTRAL();
    original[0] = 2;
    original[1] = 1;
    vectors.push(original);

    // Every single-item deflection at every Likert magnitude — deterministic,
    // no randomness, and it sweeps a wide range of raw sums per dimension.
    for (let i = 0; i < bank.items.length; i++) {
      for (const v of [-2, -1, 0, 1, 2] as const) {
        const responses = NEUTRAL();
        responses[i] = v as Response;
        vectors.push(responses);
      }
    }

    // A handful of full vectors mixing several magnitudes at once, built
    // from a fixed deterministic pattern (no Math.random anywhere).
    for (let offset = 0; offset < 5; offset++) {
      const responses = bank.items.map(
        (_, i) => (((i + offset) % 5) - 2) as Response
      );
      vectors.push(responses);
    }

    for (const responses of vectors) {
      const r = scoreMBTI(responses);
      for (const d of ["EI", "SN", "TF", "JP"] as const) {
        expect(r.dimensions[d].first + r.dimensions[d].second).toBe(100);
      }
    }
  });

  it("moves one dimension by exactly 1 per response step and leaves the others alone", () => {
    const base = scoreMBTI(NEUTRAL());
    const nudged = NEUTRAL();
    const item = bank.items[0]!;
    nudged[0] = (item.key === 1 ? 1 : -1) as Response;

    const after = scoreMBTI(nudged);
    const moved = item.dimension as "EI" | "SN" | "TF" | "JP";

    expect(after.dimensions[moved].raw).toBe(base.dimensions[moved].raw + 1);
    for (const d of ["EI", "SN", "TF", "JP"] as const) {
      if (d !== moved) {
        expect(after.dimensions[d].raw, `${d} should be untouched`).toBe(
          base.dimensions[d].raw
        );
      }
    }
  });

  it("scores each dimension independently of the others", () => {
    const responses = bank.items.map((i) =>
      (i.dimension === "EI" ? 2 * i.key : 0) as Response
    );
    const r = scoreMBTI(responses);
    expect(r.dimensions.EI.raw).toBeGreaterThan(0);
    expect(r.dimensions.SN.raw).toBe(0);
    expect(r.dimensions.TF.raw).toBe(0);
    expect(r.dimensions.JP.raw).toBe(0);
  });

  it("rejects a response array of the wrong length", () => {
    expect(() => scoreMBTI([0, 0] as Response[])).toThrow(/expected \d+ responses/);
  });

  it("rejects an out-of-range response value", () => {
    const bad = NEUTRAL();
    bad[0] = 5 as Response;
    expect(() => scoreMBTI(bad)).toThrow(/out of range/);
  });

  it("rejects a non-integer response value that is within the numeric bounds", () => {
    // 1.5 sits inside [-2, 2], so only the Number.isInteger guard can catch
    // it — the bounds check alone would let it through.
    const bad = NEUTRAL();
    bad[0] = 1.5 as Response;
    expect(() => scoreMBTI(bad)).toThrow(/out of range/);
  });

  it("rejects a response value below the lower bound", () => {
    const bad = NEUTRAL();
    bad[0] = -3 as Response;
    expect(() => scoreMBTI(bad)).toThrow(/out of range/);
  });

  it("keeps first + second exactly 100 for a bank where they'd land on an exact .x5 tie (count=4 regression)", () => {
    // With 4 items per dimension, span = count*2 = 8, so first = ((s+8)/16)*100.
    // At s = -1, first = 43.75 exactly. Rounding `second` from the UNROUNDED
    // first (the old `100 - first` formula) independently rounds 56.25 up to
    // 56.3, while first rounds 43.75 up to 43.8 — 43.8 + 56.3 = 100.1, not 100.
    // Deriving `second` from the ROUNDED first fixes this. This is the
    // smallest bank size (items-per-dimension count) where the bug appears.
    const dims: Dimension[] = ["EI", "SN", "TF", "JP"];
    const items: QuestionItem[] = dims.flatMap((d) =>
      Array.from({ length: 4 }, (_, i) => ({
        id: `${d}_${i}`,
        dimension: d,
        key: 1 as const,
        text: "",
      }))
    );
    const fourPerDimensionBank: QuestionBank = {
      size: items.length,
      defaults: { EI: "I", SN: "N", TF: "F", JP: "P" },
      poles: {
        EI: { first: "E", second: "I" },
        SN: { first: "S", second: "N" },
        TF: { first: "T", second: "F" },
        JP: { first: "J", second: "P" },
      },
      items,
    };

    // EI: raw sum = -1 (one item answered -1, the rest neutral).
    const responses: Response[] = [-1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    const r = scoreMBTI(responses, fourPerDimensionBank);
    expect(r.dimensions.EI.raw).toBe(-1);
    expect(r.dimensions.EI.first).toBe(43.8);
    expect(r.dimensions.EI.second).toBe(56.2);
    expect(r.dimensions.EI.first + r.dimensions.EI.second).toBe(100);
  });
});
