import { describe, it, expect } from "vitest";
import { PART_THEMES, HERO_MASCOT } from "../partTheme";
import { PART_COUNT } from "../parts";
import { srcOf } from "../mascot";
import { POLE_NAMES } from "../poles";

describe("partTheme", () => {
  it("has exactly one theme per part", () => {
    expect(PART_THEMES).toHaveLength(PART_COUNT);
  });

  it("orders letter pairs EI, SN, TF, JP", () => {
    expect(PART_THEMES.map((t) => t.letters.join(""))).toEqual(["EI", "SN", "TF", "JP"]);
  });

  it("takes pole names from POLE_NAMES so intro, quiz and result agree", () => {
    for (const t of PART_THEMES) {
      expect(t.poleNames).toEqual([POLE_NAMES[t.letters[0]], POLE_NAMES[t.letters[1]]]);
    }
  });

  it("gives every part a distinct mascot, distinct from the hero", () => {
    const srcs = [HERO_MASCOT, ...PART_THEMES.map((t) => t.mascot)].map(srcOf);
    expect(new Set(srcs).size).toBe(5);
  });

  it("uses dark badge ink on amber, where white would fail contrast", () => {
    expect(PART_THEMES[3]!.badge).toBe("#f59e0b");
    expect(PART_THEMES[3]!.badgeInk).toBe("#451a03");
  });
});
