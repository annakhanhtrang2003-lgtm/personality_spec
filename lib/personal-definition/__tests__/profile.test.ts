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

// Second full name for the name-axis invariance tests. Verified below (as a
// precondition) to actually produce different expression/soul_urge/
// personality numbers than BASE.full_name, so the invariance assertions are
// not vacuous. (Also deliberately picked so expression === 7, unlike
// BASE.full_name's 9 — this is the exact condition a reviewer-demonstrated
// leak branched on, so this name is guaranteed to expose that leak.)
const OTHER_NAME = "Nguyễn Văn Dũng";

// All-extreme-first-pole answers. Per scoreMBTI, item key +1 pushes toward
// the dimension's first pole (E, S, T, J) when answered "Rất đúng" (+2), and
// item key -1 pushes the same direction when answered "Rất sai" (-2). With
// the shipped 8-item bank (2 items per dimension) this yields type "ESTJ",
// whose data/mbti-types.json entry is currently unpopulated (label: "",
// career_hints: []) — everything except INFP is, until Task 11 fills them in.
const ESTJ_RESPONSES: Response[] = [2, -2, 2, -2, 2, -2, 2, -2];

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

  // The other half of the spec §5 load-bearing test. calculateNumerology
  // returns four numbers: life_path moves with birth_date, but expression,
  // soul_urge and personality are derived from full_name instead. A guard
  // that only varies birth_date never exercises that second axis, so a leak
  // routed through e.g. numerology.expression would pass silently. This
  // varies ONLY full_name (birth_date held fixed) and asserts the same
  // four-field equality.
  it("keeps career signals identical when only the full name changes", () => {
    const a = buildProfile({ ...BASE, birth_date: "2003-06-15" });
    const c = buildProfile({
      ...BASE,
      birth_date: "2003-06-15",
      full_name: OTHER_NAME,
    });

    // Precondition: the name axis actually moves the numbers this guards
    // against. If these ever match, the test below would be vacuous.
    expect(c.numerology.expression).not.toBe(a.numerology.expression);
    expect(c.numerology.soul_urge).not.toBe(a.numerology.soul_urge);
    expect(c.numerology.personality).not.toBe(a.numerology.personality);
    // Control: birth_date is unchanged, so the date-derived number must be.
    expect(c.numerology.life_path).toBe(a.numerology.life_path);

    expect(c.synthesis.career_hints).toEqual(a.synthesis.career_hints);
    expect(c.synthesis.strengths).toEqual(a.synthesis.strengths);
    expect(c.synthesis.growth_areas).toEqual(a.synthesis.growth_areas);
    expect(c.synthesis.personality_keywords).toEqual(
      a.synthesis.personality_keywords
    );
  });

  // Narrative sibling for the full_name axis. Unlike birth_date (which
  // feeds T.flavor_life_path via numerology.life_path), full_name only
  // feeds expression/soul_urge/personality — and templates.json has no
  // flavor slot keyed on any of those. The narrative's other inputs
  // (input.name, entry.label, entry.traits, zodiac.element, T.closing) are
  // all untouched by full_name. So under the current templates, changing
  // only full_name must leave the narrative byte-for-byte identical.
  it("does not let the full name change the narrative", () => {
    const a = buildProfile({ ...BASE, birth_date: "2003-06-15" });
    const c = buildProfile({
      ...BASE,
      birth_date: "2003-06-15",
      full_name: OTHER_NAME,
    });
    expect(c.synthesis.narrative).toBe(a.synthesis.narrative);
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

  // entry.strengths etc. are references into the imported mbti-types.json
  // module object, which Node caches and shares across every buildProfile()
  // call in the process. If buildProfile ever returns those arrays by
  // reference instead of a copy, a caller doing .push()/.sort() on a
  // returned profile silently corrupts every subsequent user's profile.
  it("returns arrays that are safe to mutate — a fresh call is unaffected", () => {
    const p = buildProfile({ ...BASE, birth_date: "2003-06-15" });
    p.synthesis.strengths.push("MUTATED");
    p.synthesis.growth_areas.push("MUTATED");
    p.synthesis.personality_keywords.push("MUTATED");
    p.synthesis.career_hints.push("MUTATED");
    p.mbti.traits.push("MUTATED");
    // zodiac.traits is a reference into the imported zodiac-signs.json
    // module object, same failure class as the five arrays above — a
    // caller mutating it would corrupt that sign's data for every
    // subsequent buildProfile()/calculateZodiac() call in the process.
    p.zodiac.traits.push("MUTATED");

    const fresh = buildProfile({ ...BASE, birth_date: "2003-06-15" });
    expect(fresh.synthesis.strengths).not.toContain("MUTATED");
    expect(fresh.synthesis.growth_areas).not.toContain("MUTATED");
    expect(fresh.synthesis.personality_keywords).not.toContain("MUTATED");
    expect(fresh.synthesis.career_hints).not.toContain("MUTATED");
    expect(fresh.mbti.traits).not.toContain("MUTATED");
    expect(fresh.zodiac.traits).not.toContain("MUTATED");
  });

  // The `if (!entry)` guard in profile.ts can never fire on its own — all 16
  // MBTI keys exist in mbti-types.json as truthy objects. Today only INFP
  // is populated; the other 15 (including ESTJ, exercised here) have empty
  // label/strengths/career_hints/etc. Without a "populated" check, scoring
  // one of those types would silently produce a complete-looking profile
  // with empty arrays and no error.
  //
  // TASK 11 MUST REVISIT THIS TEST: once mbti-types.json is fully populated,
  // ESTJ_RESPONSES will no longer hit an empty entry and this assertion will
  // start failing. At that point, either point ESTJ_RESPONSES-equivalent
  // input at whichever type (if any) is still unpopulated, or — once all 16
  // are populated — replace this test with one asserting buildProfile
  // returns a populated profile for every type instead of throwing.
  it("throws for a scored type whose data entry is unpopulated (Task 11 must revisit — see comment above)", () => {
    expect(() =>
      buildProfile({
        ...BASE,
        birth_date: "2003-06-15",
        responses: ESTJ_RESPONSES,
      })
    ).toThrow(/ESTJ/);
  });
});
