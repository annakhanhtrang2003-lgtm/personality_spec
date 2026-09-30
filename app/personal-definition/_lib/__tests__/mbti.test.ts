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

/**
 * A 4-items-per-dimension bank (span=8), distinct in shape from the shipped
 * 2-items-per-dimension bank (span=4). Its `first` values can land on exact
 * .x5 ties and floating-point remainders that the shipped bank's
 * multiples-of-12.5 outputs never can — see the regression test and the
 * complementarity sweep below.
 */
function buildFourPerDimensionBank(): QuestionBank {
  const dims: Dimension[] = ["EI", "SN", "TF", "JP"];
  const items: QuestionItem[] = dims.flatMap((d) =>
    Array.from({ length: 4 }, (_, i) => ({
      id: `${d}_${i}`,
      dimension: d,
      key: 1 as const,
      text: "",
    }))
  );
  return {
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
}

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
    // Sweeps the invariant across a QuestionBank. Parameterized so the same
    // vector-generation logic runs against banks of different shapes: the
    // shipped bank's `first` values are always multiples of 12.5 and can
    // never produce a rounding tie or floating-point remainder on their
    // own, so the sweep also runs against a 4-items-per-dimension bank
    // (span=8) whose raw sums land on values like 43.75/56.25 and
    // 68.8/31.200000000000003 — the actual case this invariant guards.
    function sweep(b: QuestionBank, label: string) {
      const neutral = (): Response[] => b.items.map(() => 0 as Response);
      const vectors: Response[][] = [];

      // The original single vector this test used to check, kept as one
      // case among many rather than dropped.
      const original = neutral();
      original[0] = 2;
      if (original.length > 1) original[1] = 1;
      vectors.push(original);

      // Every single-item deflection at every Likert magnitude — deterministic,
      // no randomness, and it sweeps a wide range of raw sums per dimension.
      for (let i = 0; i < b.items.length; i++) {
        for (const v of [-2, -1, 0, 1, 2] as const) {
          const responses = neutral();
          responses[i] = v as Response;
          vectors.push(responses);
        }
      }

      // A handful of full vectors mixing several magnitudes at once, built
      // from a fixed deterministic pattern (no Math.random anywhere).
      for (let offset = 0; offset < 5; offset++) {
        const responses = b.items.map(
          (_, i) => (((i + offset) % 5) - 2) as Response
        );
        vectors.push(responses);
      }

      for (const responses of vectors) {
        const r = scoreMBTI(responses, b);
        for (const d of ["EI", "SN", "TF", "JP"] as const) {
          const { first, second } = r.dimensions[d];
          expect(first + second, `${label}, dimension ${d}`).toBe(100);

          // `first + second === 100` alone doesn't catch a missing
          // .toFixed(1) on `second`: e.g. first=68.8, second computed as
          // the raw `100 - 68.8` is 31.200000000000003 (floating-point
          // dust), yet 68.8 + 31.200000000000003 still rounds back to
          // exactly 100 in IEEE 754 — verified empirically, this sum check
          // never fails for this formula regardless of span. What DOES
          // change is that `second` stops being a clean one-decimal value.
          // Pin that directly: second must already be rounded to 1dp, i.e.
          // idempotent under another .toFixed(1) pass.
          expect(
            Number(second.toFixed(1)),
            `${label}, dimension ${d}: second (${second}) is not rounded to 1 decimal place`
          ).toBe(second);
        }
      }
    }

    sweep(bank as unknown as QuestionBank, "shipped 2-per-dimension bank");
    sweep(buildFourPerDimensionBank(), "4-per-dimension bank");
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

  it("rejects a response value above the upper bound", () => {
    // Pins the r > 2 boundary itself: mutating it to r > 3 or r > 4 would
    // let 3 through undetected.
    const bad = NEUTRAL();
    bad[0] = 3 as Response;
    expect(() => scoreMBTI(bad)).toThrow(/out of range/);
  });

  it("keeps first + second exactly 100 for a bank where they'd land on an exact .x5 tie (count=4 regression)", () => {
    // With 4 items per dimension, span = count*2 = 8, so first = ((s+8)/16)*100.
    // At s = -1, first = 43.75 exactly. Rounding `second` from the UNROUNDED
    // first (the old `100 - first` formula) independently rounds 56.25 up to
    // 56.3, while first rounds 43.75 up to 43.8 — 43.8 + 56.3 = 100.1, not 100.
    // Deriving `second` from the ROUNDED first fixes this. This is the
    // smallest bank size (items-per-dimension count) where the bug appears.
    const fourPerDimensionBank = buildFourPerDimensionBank();

    // EI: raw sum = -1 (one item answered -1, the rest neutral).
    const responses: Response[] = [-1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    const r = scoreMBTI(responses, fourPerDimensionBank);
    expect(r.dimensions.EI.raw).toBe(-1);
    expect(r.dimensions.EI.first).toBe(43.8);
    expect(r.dimensions.EI.second).toBe(56.2);
    expect(r.dimensions.EI.first + r.dimensions.EI.second).toBe(100);
  });

  it("throws instead of silently producing NaN when the bank is missing every item for a dimension", () => {
    // A bank with no JP items at all. Before this validation existed, the
    // reviewer confirmed this produced JP: { raw: 0, first: NaN, second: NaN }
    // and a type string, with no error thrown — because span = counts.JP * 2
    // = 0, so ((0 + 0) / 0) * 100 is NaN, and NaN silently threads through.
    const full = buildFourPerDimensionBank();
    const items = full.items.filter((i) => i.dimension !== "JP");
    const bankMissingJP: QuestionBank = {
      ...full,
      size: items.length,
      items,
    };
    const responses: Response[] = items.map(() => 0 as Response);

    expect(() => scoreMBTI(responses, bankMissingJP)).toThrow(/JP/);
    // Confirm it's a real throw, not a NaN slipping through.
    expect(() => scoreMBTI(responses, bankMissingJP)).not.toThrow(/NaN/);
  });

  it("throws when the bank's defaults are missing an entry for a dimension", () => {
    const full = buildFourPerDimensionBank();
    const defaults = {
      EI: full.defaults.EI,
      SN: full.defaults.SN,
      TF: full.defaults.TF,
      // JP intentionally omitted.
    } as unknown as Record<Dimension, string>;
    const bankMissingDefault: QuestionBank = { ...full, defaults };
    const responses: Response[] = full.items.map(() => 0 as Response);

    expect(() => scoreMBTI(responses, bankMissingDefault)).toThrow(/JP/);
  });

  it("throws when the bank's poles are missing an entry for a dimension", () => {
    const full = buildFourPerDimensionBank();
    const poles = {
      EI: full.poles.EI,
      SN: full.poles.SN,
      TF: full.poles.TF,
      // JP intentionally omitted.
    } as unknown as Record<Dimension, { first: string; second: string }>;
    const bankMissingPoles: QuestionBank = { ...full, poles };
    const responses: Response[] = full.items.map(() => 0 as Response);

    expect(() => scoreMBTI(responses, bankMissingPoles)).toThrow(/JP/);
  });

  it("throws when questionBank.size disagrees with questionBank.items.length", () => {
    // Task 9 swaps the bank to 40 items and sets size: 40 — a mismatch
    // there (e.g. items.length ending up 41 while size stays 40) must fail
    // loudly rather than silently validating responses against the wrong
    // number.
    const full = buildFourPerDimensionBank();
    const bankBadSize: QuestionBank = { ...full, size: full.items.length + 1 };
    const responses: Response[] = full.items.map(() => 0 as Response);

    expect(() => scoreMBTI(responses, bankBadSize)).toThrow(/size/i);
  });
});
