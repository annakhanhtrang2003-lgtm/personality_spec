import { describe, it, expect } from "vitest";
import { temperamentOf, TEMPERAMENTS } from "../temperament";

const EXPECTED: Record<string, string> = {
  INTJ: "analysts", INTP: "analysts", ENTJ: "analysts", ENTP: "analysts",
  INFJ: "diplomats", INFP: "diplomats", ENFJ: "diplomats", ENFP: "diplomats",
  ISTJ: "sentinels", ISFJ: "sentinels", ESTJ: "sentinels", ESFJ: "sentinels",
  ISTP: "explorers", ISFP: "explorers", ESTP: "explorers", ESFP: "explorers",
};

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}
function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x! + 0.05) / (y! + 0.05);
}

describe("temperament", () => {
  it("maps all 16 types NT/NF/SJ/SP", () => {
    for (const [type, id] of Object.entries(EXPECTED)) {
      expect(temperamentOf(type), type).toBe(id);
    }
  });

  it("throws on anything that is not a four-letter type", () => {
    expect(() => temperamentOf("XXXX")).toThrow(/XXXX/);
    expect(() => temperamentOf("ENF")).toThrow();
  });

  it("names the four temperaments in Vietnamese", () => {
    expect(TEMPERAMENTS.analysts.name).toBe("Nhóm Tư Duy");
    expect(TEMPERAMENTS.diplomats.name).toBe("Nhóm Lý Tưởng");
    expect(TEMPERAMENTS.sentinels.name).toBe("Nhóm Vững Chãi");
    expect(TEMPERAMENTS.explorers.name).toBe("Nhóm Trải Nghiệm");
  });

  // Review Focus 3 — accents are used as text on white cards and on the tint.
  it("keeps every accent readable (≥ 4.5:1) on white and on its own tint", () => {
    for (const [id, t] of Object.entries(TEMPERAMENTS)) {
      expect(contrast(t.accent, "#ffffff"), `${id} on white`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(t.accent, t.tint), `${id} on tint`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
