import { describe, it, expect } from "vitest";
import { buildProfile } from "../profile";
import { scoreMBTI } from "../mbti";
import bank from "../data/questions.json";
import type { Response } from "../types";

const NEUTRAL = (): Response[] => bank.items.map(() => 0 as Response);

const BASE = {
  name: "Khánh",
  university: "UEH",
  full_name: "Nguyễn Thị Khánh Trang",
  responses: NEUTRAL(),
};

describe("buildProfile", () => {
  it("assembles all three layers", () => {
    const p = buildProfile({ ...BASE, birth_date: "2003-06-15" });
    expect(p.user.name).toBe("Khánh");
    expect(p.zodiac.sun_sign).toBe("Song Tử");
    expect(p.numerology.life_path).toBe(8);
    expect(p.mbti.type).toBe("INFP");
  });

  it("leaves no unfilled placeholder in the narrative", () => {
    const p = buildProfile({ ...BASE, birth_date: "2003-06-15" });
    expect(p.synthesis.narrative).not.toMatch(/\{[a-z_]+\}/);
  });

  it("always appends the caveat", () => {
    const p = buildProfile({ ...BASE, birth_date: "2003-06-15" });
    expect(p.synthesis.narrative).toContain("không phải toàn bộ con người bạn");
  });

  it("emits no weighted_trait_map and no confidence", () => {
    const p = buildProfile({ ...BASE, birth_date: "2003-06-15" });
    expect(p.synthesis).not.toHaveProperty("weighted_trait_map");
    expect(p.mbti).not.toHaveProperty("confidence");
  });

  // The load-bearing test for spec §5.
  it("keeps career signals identical when only the birth date changes", () => {
    const a = buildProfile({ ...BASE, birth_date: "2003-06-15" }); // Song Tử, Air
    const b = buildProfile({ ...BASE, birth_date: "2003-12-30" }); // Ma Kết, Earth

    expect(a.zodiac.sun_sign).not.toBe(b.zodiac.sun_sign); // precondition

    expect(b.synthesis.career_hints).toEqual(a.synthesis.career_hints);
    expect(b.synthesis.strengths).toEqual(a.synthesis.strengths);
    expect(b.synthesis.growth_areas).toEqual(a.synthesis.growth_areas);
    expect(b.synthesis.personality_keywords).toEqual(
      a.synthesis.personality_keywords
    );
  });

  it("does let the birth date change the narrative", () => {
    const a = buildProfile({ ...BASE, birth_date: "2003-06-15" });
    const b = buildProfile({ ...BASE, birth_date: "2003-12-30" });
    expect(b.synthesis.narrative).not.toBe(a.synthesis.narrative);
  });

  it("is deterministic across repeated calls", () => {
    const input = { ...BASE, birth_date: "2003-06-15" };
    expect(buildProfile(input)).toEqual(buildProfile(input));
  });

  it("carries the MBTI raw scores through to the handoff", () => {
    const p = buildProfile({ ...BASE, birth_date: "2003-06-15" });
    const direct = scoreMBTI(NEUTRAL());
    expect(p.mbti.dimensions.EI.raw).toBe(direct.dimensions.EI.raw);
  });
});
