import { describe, it, expect } from "vitest";
import { buildProfile } from "../profile";
import { scoreMBTI } from "../mbti";
import bank from "../data/questions.json";
import typeData from "../data/mbti-types.json";
import templatesData from "../data/templates.json";
import type { Response } from "../types";

const NEUTRAL = (): Response[] => bank.items.map(() => 0 as Response);

const ALL_TYPES = [
  "INFP", "INFJ", "INTP", "INTJ", "ISFP", "ISFJ", "ISTP", "ISTJ",
  "ENFP", "ENFJ", "ENTP", "ENTJ", "ESFP", "ESFJ", "ESTP", "ESTJ",
] as const;

// Widened out of the JSON import's literal shape so it can be indexed by
// an item's `dimension` string without TS7053.
const POLES: Record<string, { first: string; second: string }> = bank.poles;
const templates = templatesData as { flavor_life_path: Record<string, string> };
const DIM_ORDER = ["EI", "SN", "TF", "JP"] as const;

/**
 * Build the response vector that scores to `type`.
 *
 * Per scoreMBTI, an item contributes `response * key` to its dimension, so
 * answering `2 * key` drives the dimension positive (its first pole) and
 * `-2 * key` drives it negative (its second pole). Derived from the bank's
 * declared poles rather than hardcoded, so a rebalanced or regrown bank
 * does not silently invert this.
 */
function responsesForType(type: string): Response[] {
  return bank.items.map((item) => {
    const dimIndex = DIM_ORDER.indexOf(item.dimension as (typeof DIM_ORDER)[number]);
    const wanted = type[dimIndex];
    const sign = wanted === POLES[item.dimension]!.first ? 1 : -1;
    return (2 * item.key * sign) as Response;
  });
}

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
// item key -1 pushes the same direction when answered "Rất sai" (-2). So
// answering every item at 2 * key drives every dimension to its maximum
// positive score, yielding "ESTJ" for any balanced bank.
//
// Derived from the bank rather than hardcoded: Task 9 grew the bank from 8
// items to 40, and a literal vector silently became the wrong length.
const ESTJ_RESPONSES: Response[] = bank.items.map((i) => (2 * i.key) as Response);

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

  // The test above varies element AND life path at once, so it would still
  // pass on flavor_element alone — which is exactly what it did while
  // templates.flavor_life_path was empty. These two dates share an element
  // (both Song Tử / Air) and differ only in life path, so the assertion
  // can only be satisfied by the flavor_life_path slot.
  it("lets the life path move the narrative independently of the element", () => {
    const a = buildProfile({ ...BASE, birth_date: "2003-06-15" });
    const b = buildProfile({ ...BASE, birth_date: "2003-06-11" });

    expect(b.zodiac.element).toBe(a.zodiac.element); // precondition
    expect(b.numerology.life_path).not.toBe(a.numerology.life_path); // precondition

    expect(b.synthesis.narrative).not.toBe(a.synthesis.narrative);
    expect(a.synthesis.narrative).toContain(
      templates.flavor_life_path[String(a.numerology.life_path)]!
    );
    expect(b.synthesis.narrative).toContain(
      templates.flavor_life_path[String(b.numerology.life_path)]!
    );
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

  // Task 11 filled all 16 entries, so ESTJ (the type ESTJ_RESPONSES scores
  // to) now builds a real profile rather than tripping the populated-data
  // guard. Kept as the positive half of that former assertion.
  it("builds a fully populated profile for ESTJ, not an empty shell", () => {
    const p = buildProfile({
      ...BASE,
      birth_date: "2003-06-15",
      responses: ESTJ_RESPONSES,
    });
    expect(p.mbti.type).toBe("ESTJ");
    expect(p.synthesis.career_hints.length).toBeGreaterThan(0);
    expect(p.synthesis.strengths.length).toBeGreaterThan(0);
    expect(p.mbti.traits.length).toBeGreaterThan(0);
    expect(p.synthesis.narrative).not.toMatch(/\{[a-z_]+\}/);
  });

  // Every one of the 16 types must now build. Response vectors are derived
  // from the bank's own poles, so this keeps working if Task 9's bank is
  // ever rebalanced or regrown.
  it("builds a populated profile for all 16 types", () => {
    for (const type of ALL_TYPES) {
      const p = buildProfile({
        ...BASE,
        birth_date: "2003-06-15",
        responses: responsesForType(type),
      });
      expect(p.mbti.type, `scored type for ${type}`).toBe(type);
      expect(p.synthesis.narrative, `narrative ${type}`).not.toMatch(/\{[a-z_]+\}/);
      expect(p.synthesis.narrative.length, `narrative ${type}`).toBeGreaterThan(40);
      expect(p.synthesis.career_hints.length, `career_hints ${type}`).toBe(6);
      expect(p.synthesis.strengths.length, `strengths ${type}`).toBe(5);
      expect(p.mbti.traits.length, `traits ${type}`).toBe(4);
    }
  });

  // The populated-data guard in profile.ts is still load-bearing — it is
  // what stops a half-written entry from shipping as a complete-looking
  // profile with empty arrays. With all 16 entries filled, no real input
  // reaches it, so prove it against a deliberately emptied entry. The JSON
  // import is the same cached module object profile.ts reads, so blanking
  // a field here is exactly the state a future half-written entry would be
  // in. Restored in `finally` so no other test sees the mutation.
  it("throws rather than emitting an empty profile if an entry is unpopulated", () => {
    const entry = typeData.ESTJ;
    const savedLabel = entry.label;
    const savedHints = [...entry.career_hints];
    entry.label = "";
    entry.career_hints = [];
    try {
      expect(() =>
        buildProfile({
          ...BASE,
          birth_date: "2003-06-15",
          responses: ESTJ_RESPONSES,
        })
      ).toThrow(/ESTJ/);
    } finally {
      entry.label = savedLabel;
      entry.career_hints = savedHints;
    }
  });
});
