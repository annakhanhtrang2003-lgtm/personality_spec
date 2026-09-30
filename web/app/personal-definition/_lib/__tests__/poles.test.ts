import { describe, it, expect } from "vitest";
import { POLE_NAMES, dominantPole } from "../poles";

describe("poles", () => {
  it("names all eight poles in Vietnamese", () => {
    expect(Object.keys(POLE_NAMES).sort()).toEqual(
      ["E", "F", "I", "J", "N", "P", "S", "T"],
    );
    for (const name of Object.values(POLE_NAMES)) expect(name.length).toBeGreaterThan(0);
  });

  it("picks the leading pole and its percentage", () => {
    expect(dominantPole("EI", { raw: -8, first: 30, second: 70 }))
      .toEqual({ pole: "I", name: "Hướng nội", percent: 70 });
    expect(dominantPole("TF", { raw: 6, first: 65, second: 35 }))
      .toEqual({ pole: "T", name: "Lý trí", percent: 65 });
  });

  it("breaks a dead tie toward the declared default pole", () => {
    // questions.json defaults: EI -> I, SN -> N, TF -> F, JP -> P.
    expect(dominantPole("EI", { raw: 0, first: 50, second: 50 }).pole).toBe("I");
    expect(dominantPole("SN", { raw: 0, first: 50, second: 50 }).pole).toBe("N");
    expect(dominantPole("TF", { raw: 0, first: 50, second: 50 }).pole).toBe("F");
    expect(dominantPole("JP", { raw: 0, first: 50, second: 50 }).pole).toBe("P");
  });
});
