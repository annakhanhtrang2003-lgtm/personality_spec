import { describe, it, expect } from "vitest";
import { poseForType, FACES, srcOf } from "../mascot";
import { temperamentOf } from "../temperament";

const ALL_TYPES = [
  "INTJ", "INTP", "ENTJ", "ENTP",
  "INFJ", "INFP", "ENFJ", "ENFP",
  "ISTJ", "ISFJ", "ESTJ", "ESFJ",
  "ISTP", "ISFP", "ESTP", "ESFP",
];

describe("mascot", () => {
  it("resolves a pose for every one of the 16 types", () => {
    for (const type of ALL_TYPES) {
      expect(poseForType(type), type).toBeDefined();
    }
  });

  it("uses exactly the eight available poses", () => {
    const distinct = new Set(ALL_TYPES.map((t) => srcOf(poseForType(t))));
    expect(distinct.size).toBe(8);
  });

  it("follows the sticker kit's pose map", () => {
    const KIT: Record<number, [string, string]> = {
      1: ["ENTP", "ISFP"], 2: ["INFP", "ESFJ"], 3: ["INTJ", "INFJ"], 4: ["ENTJ", "ISTJ"],
      5: ["ENFP", "ESTP"], 6: ["INTP", "ISTP"], 7: ["ENFJ", "ISFJ"], 8: ["ESTJ", "ESFP"],
    };
    for (const [pose, [a, b]] of Object.entries(KIT)) {
      expect(srcOf(poseForType(a)), `${a}`).toMatch(new RegExp(`pose-${pose}\\.webp`));
      expect(srcOf(poseForType(b)), `${b}`).toMatch(new RegExp(`pose-${pose}\\.webp`));
    }
  });

  it("gives each pose to two types from two different temperaments", () => {
    const byPose = new Map<string, string[]>();
    for (const t of ALL_TYPES) {
      const src = srcOf(poseForType(t));
      byPose.set(src, [...(byPose.get(src) ?? []), t]);
    }
    for (const [src, types] of byPose) {
      expect(types, src).toHaveLength(2);
      expect(temperamentOf(types[0]!), src).not.toBe(temperamentOf(types[1]!));
    }
  });

  it("throws on an unknown type rather than rendering a blank card", () => {
    expect(() => poseForType("XXXX")).toThrow(/XXXX/);
  });

  it("exposes thirteen named faces", () => {
    expect(Object.keys(FACES)).toHaveLength(13);
    expect(new Set(Object.values(FACES).map(srcOf)).size).toBe(13);
  });
});
