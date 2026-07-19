import { describe, it, expect } from "vitest";
import { scoreMBTI } from "../mbti";
import bank from "../data/questions.json";
import type { Response } from "../types";

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
    expect(r.type).toBe("INFP");
    for (const d of ["EI", "SN", "TF", "JP"] as const) {
      expect(r.dimensions[d].raw).toBe(0);
      expect(r.dimensions[d].first).toBe(50);
      expect(r.dimensions[d].second).toBe(50);
    }
  });

  it("keeps first and second complementary", () => {
    const responses = NEUTRAL();
    responses[0] = 2;
    responses[1] = 1;
    const r = scoreMBTI(responses);
    for (const d of ["EI", "SN", "TF", "JP"] as const) {
      expect(r.dimensions[d].first + r.dimensions[d].second).toBe(100);
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
});
