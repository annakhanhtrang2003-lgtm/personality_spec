import { describe, it, expect } from "vitest";
import bank from "../data/questions.json";
import types from "../data/mbti-types.json";
import templates from "../data/templates.json";
import interpretations from "../data/numerology-interpretations.json";

const DIMENSIONS = ["EI", "SN", "TF", "JP"] as const;

const ALL_TYPES = [
  "INFP", "INFJ", "INTP", "INTJ", "ISFP", "ISFJ", "ISTP", "ISTJ",
  "ENFP", "ENFJ", "ENTP", "ENTJ", "ESFP", "ESFJ", "ESTP", "ESTJ",
] as const;

describe("question bank integrity", () => {
  it("holds exactly the declared number of items", () => {
    expect(bank.items).toHaveLength(bank.size);
  });

  it("splits items evenly across the four dimensions", () => {
    for (const d of DIMENSIONS) {
      const items = bank.items.filter((i) => i.dimension === d);
      expect(items, `dimension ${d}`).toHaveLength(bank.size / 4);
    }
  });

  it("balances keying within every dimension", () => {
    for (const d of DIMENSIONS) {
      const items = bank.items.filter((i) => i.dimension === d);
      const plus = items.filter((i) => i.key === 1).length;
      const minus = items.filter((i) => i.key === -1).length;
      expect(plus, `dimension ${d} +1 items`).toBe(items.length / 2);
      expect(minus, `dimension ${d} -1 items`).toBe(items.length / 2);
    }
  });

  it("uses only +1 or -1 as key", () => {
    for (const i of bank.items) {
      expect([1, -1], `item ${i.id}`).toContain(i.key);
    }
  });

  it("has unique ids", () => {
    const ids = bank.items.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("declares a default and poles for every dimension", () => {
    for (const d of DIMENSIONS) {
      expect(bank.defaults).toHaveProperty(d);
      expect(bank.poles).toHaveProperty(d);
    }
  });

  it("defaults to the second pole of each dimension", () => {
    // I, N, F, P — the less socially-desirable pole, so residual
    // acquiescence does not drift the population toward ESTJ. Spec §4.3.
    for (const d of DIMENSIONS) {
      expect(bank.defaults[d], `default for ${d}`).toBe(bank.poles[d].second);
    }
  });

  it("has non-empty Vietnamese text on every item", () => {
    for (const i of bank.items) {
      expect(i.text.trim().length, `item ${i.id}`).toBeGreaterThan(10);
    }
  });
});

describe("question bank content", () => {
  it("is the full 40 items", () => {
    expect(bank.size).toBe(40);
    expect(bank.items).toHaveLength(40);
  });

  it("defines all eight poles", () => {
    for (const p of ["E", "I", "S", "N", "T", "F", "J", "P"] as const) {
      expect(bank.pole_definitions[p]?.length, `pole ${p}`).toBeGreaterThan(20);
    }
  });

  it("has no duplicate item text", () => {
    const texts = bank.items.map((i) => i.text.trim());
    expect(new Set(texts).size).toBe(texts.length);
  });

  it("does not open every item the same way", () => {
    const openings = bank.items.map((i) => i.text.split(" ").slice(0, 2).join(" "));
    const commonest = Math.max(
      ...[...new Set(openings)].map((o) => openings.filter((x) => x === o).length)
    );
    expect(commonest).toBeLessThanOrEqual(12);
  });

  it("keeps items free of type and career names", () => {
    const banned = /\b(INFP|ENFJ|ESTJ|hướng nội|hướng ngoại|nghề|ngành)\b/i;
    for (const i of bank.items) {
      expect(banned.test(i.text), `item ${i.id}: ${i.text}`).toBe(false);
    }
  });
});

describe("mbti-types.json shape", () => {
  it("has an entry for all 16 types", () => {
    expect(Object.keys(types).sort()).toEqual([...ALL_TYPES].sort());
  });

  it("gives every entry the required fields", () => {
    for (const t of ALL_TYPES) {
      const entry = types[t];
      expect(entry, t).toHaveProperty("label");
      expect(Array.isArray(entry.strengths), `${t}.strengths`).toBe(true);
      expect(Array.isArray(entry.growth_areas), `${t}.growth_areas`).toBe(true);
      expect(Array.isArray(entry.personality_keywords), `${t}.keywords`).toBe(true);
      expect(Array.isArray(entry.career_hints), `${t}.career_hints`).toBe(true);
    }
  });
});

describe("templates.json shape", () => {
  it("has an intro slot for all 16 types", () => {
    expect(Object.keys(templates.intro).sort()).toEqual([...ALL_TYPES].sort());
  });

  it("has flavor text for all four elements", () => {
    for (const e of ["Fire", "Earth", "Air", "Water"] as const) {
      expect(templates.flavor_element[e].length, e).toBeGreaterThan(10);
    }
  });

  it("always carries the closing caveat", () => {
    expect(templates.closing).toContain("không phải toàn bộ con người bạn");
  });
});

describe("numerology interpretations content", () => {
  const KINDS = ["life_path", "expression", "soul_urge", "personality"] as const;
  const VALUES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "11", "22", "33"] as const;

  const ALL_PASSAGES = KINDS.flatMap((k) =>
    VALUES.map((v) => [`${k}.${v}`, interpretations[k][v]] as const)
  );

  it("covers every kind and value", () => {
    for (const k of KINDS) {
      for (const v of VALUES) {
        // Passages run 180-250 chars; a floor of 40 gated nothing.
        expect(interpretations[k][v]?.length, `${k}.${v}`).toBeGreaterThan(120);
      }
    }
  });

  it("keeps every passage to two or three sentences", () => {
    for (const [id, text] of ALL_PASSAGES) {
      const sentences = text.split(/[.!?](?:\s|$)/).filter((s) => s.trim().length > 0);
      expect(sentences.length, `${id}: ${text}`).toBeGreaterThanOrEqual(2);
      expect(sentences.length, `${id}: ${text}`).toBeLessThanOrEqual(3);
    }
  });

  it("names no career, major, or industry — spec §5 layer separation", () => {
    const banned = /(nghề|ngành|sự nghiệp|công việc phù hợp)/i;
    for (const [id, text] of ALL_PASSAGES) {
      expect(banned.test(text), `${id}: ${text}`).toBe(false);
    }
  });

  it("uses no archetype titles", () => {
    const banned = /(Người Lãnh Đạo|Nhà Kiến Tạo|Bậc Thầy)/i;
    for (const [id, text] of ALL_PASSAGES) {
      expect(banned.test(text), `${id}: ${text}`).toBe(false);
    }
  });

  it("does not reuse the same passage across kinds", () => {
    for (const v of VALUES) {
      const passages = KINDS.map((k) => interpretations[k][v]);
      expect(new Set(passages).size, `value ${v} reused across kinds`).toBe(4);
    }
  });
});
