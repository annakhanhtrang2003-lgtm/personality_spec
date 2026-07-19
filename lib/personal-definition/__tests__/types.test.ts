import { describe, it, expect } from "vitest";
import type { MBTIResult } from "../types";

describe("types", () => {
  it("compiles a well-formed MBTIResult", () => {
    const r: MBTIResult = {
      type: "INFP",
      dimensions: {
        EI: { raw: 0, first: 50, second: 50 },
        SN: { raw: 0, first: 50, second: 50 },
        TF: { raw: 0, first: 50, second: 50 },
        JP: { raw: 0, first: 50, second: 50 },
      },
      traits: [],
    };
    expect(r.type).toBe("INFP");
  });
});
