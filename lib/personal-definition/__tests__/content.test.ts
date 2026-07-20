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

// `as const` is required: indexing the JSON-derived objects with a plain
// string[] element is TS7053 under this tsconfig.
const LIFE_PATH_VALUES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "11", "22", "33"] as const;

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
      expect(Array.isArray(entry.traits), `${t}.traits`).toBe(true);
      expect(Array.isArray(entry.strengths), `${t}.strengths`).toBe(true);
      expect(Array.isArray(entry.growth_areas), `${t}.growth_areas`).toBe(true);
      expect(Array.isArray(entry.personality_keywords), `${t}.keywords`).toBe(true);
      expect(Array.isArray(entry.career_hints), `${t}.career_hints`).toBe(true);
    }
  });
});

describe("mbti-types.json content", () => {
  it("fills every field for all 16 types", () => {
    for (const t of ALL_TYPES) {
      const e = types[t];
      expect(e.label.length, `${t}.label`).toBeGreaterThan(3);
      expect(e.traits.length, `${t}.traits`).toBe(4);
      expect(e.strengths.length, `${t}.strengths`).toBe(5);
      expect(e.growth_areas.length, `${t}.growth_areas`).toBe(3);
      expect(e.personality_keywords.length, `${t}.keywords`).toBe(6);
      expect(e.career_hints.length, `${t}.career_hints`).toBe(6);
    }
  });

  it("gives each type a distinct label", () => {
    const labels = ALL_TYPES.map((t) => types[t].label);
    expect(new Set(labels).size).toBe(16);
  });

  it("does not reuse a strengths list between types", () => {
    const joined = ALL_TYPES.map((t) => types[t].strengths.join("|"));
    expect(new Set(joined).size).toBe(16);
  });

  it("does not reuse a growth_areas or career_hints list between types", () => {
    const growth = ALL_TYPES.map((t) => types[t].growth_areas.join("|"));
    expect(new Set(growth).size, "growth_areas").toBe(16);
    const careers = ALL_TYPES.map((t) => types[t].career_hints.join("|"));
    expect(new Set(careers).size, "career_hints").toBe(16);
  });

  // `career_hints.length === 6` cannot see an entry that spends two of its
  // six slots on one field ("chăm sóc khách hàng" + "dịch vụ khách hàng
  // doanh nghiệp"), which ships 5 distinct fields where every other type
  // ships 6 — weaker Step 2 signal, invisible to a count.
  it("gives no type a duplicated item within any list", () => {
    for (const t of ALL_TYPES) {
      const e = types[t];
      const lists = {
        traits: e.traits,
        strengths: e.strengths,
        growth_areas: e.growth_areas,
        personality_keywords: e.personality_keywords,
        career_hints: e.career_hints,
      };
      for (const [field, list] of Object.entries(lists)) {
        expect(new Set(list).size, `${t}.${field}`).toBe(list.length);
      }
    }
  });

  // Adjacent types blur field by field, not entry by entry: ISFJ and ESFJ
  // once shared 3 of 6 keywords, a trait and a career on top of a shared
  // strength. Whole-list uniqueness cannot see that. Half the list is the
  // ceiling — beyond it the two entries stop reading as different types.
  it("keeps keyword overlap between any two types at or below half", () => {
    for (const a of ALL_TYPES) {
      for (const b of ALL_TYPES) {
        if (a >= b) continue;
        const shared = types[a].personality_keywords.filter((k) =>
          types[b].personality_keywords.includes(k)
        );
        expect(shared.length, `${a}/${b} share: ${shared.join(", ")}`).toBeLessThanOrEqual(3);
      }
    }
  });

  // Spec §5: these four fields are the Step 2 handoff and derive from the
  // MBTI type alone. A zodiac or numerology word here would make career
  // signal move with a birthday, which profile.test.ts guards at runtime —
  // this catches it at the source instead.
  it("keeps zodiac and numerology vocabulary out of the four signal fields", () => {
    const banned =
      /(cung hoàng đạo|hoàng đạo|Bạch Dương|Kim Ngưu|Song Tử|Cự Giải|Sư Tử|Xử Nữ|Thiên Bình|Thiên Yết|Nhân Mã|Ma Kết|Bảo Bình|Song Ngư|thần số|số chủ đạo|ngày sinh|con giáp)/i;
    for (const t of ALL_TYPES) {
      const e = types[t];
      const fields = [
        ...e.strengths,
        ...e.growth_areas,
        ...e.personality_keywords,
        ...e.career_hints,
      ];
      for (const text of fields) {
        expect(banned.test(text), `${t}: ${text}`).toBe(false);
      }
    }
  });

  // career_hints feed a matcher in Step 2 that expects fields of work.
  // A job title ("Data Analyst tại ngân hàng", "Trưởng phòng ...") would
  // poison it, so hints stay lowercase-opening and title-word free.
  it("writes career hints as fields of work, not job titles", () => {
    const titleish = /(chuyên viên|nhân viên|trưởng phòng|giám đốc|kỹ sư trưởng|manager|analyst|engineer|designer)/i;
    for (const t of ALL_TYPES) {
      for (const hint of types[t].career_hints) {
        expect(titleish.test(hint), `${t}: ${hint}`).toBe(false);
        expect(hint, `${t}: ${hint}`).toBe(hint.toLocaleLowerCase("vi"));
      }
    }
  });
});

describe("templates.json content", () => {
  it("fills every intro and uses the name placeholder", () => {
    for (const t of ALL_TYPES) {
      expect(templates.intro[t].length, `intro ${t}`).toBeGreaterThan(20);
      expect(templates.intro[t], `intro ${t}`).toContain("{name}");
    }
  });

  it("gives every intro the label and trait line too", () => {
    for (const t of ALL_TYPES) {
      expect(templates.intro[t], `intro ${t}`).toContain("{label}");
      expect(templates.intro[t], `intro ${t}`).toContain("{trait_line}");
    }
  });

  it("does not open all 16 intros with the same wording", () => {
    const openings = ALL_TYPES.map((t) =>
      templates.intro[t].split(" ").slice(0, 3).join(" ")
    );
    expect(new Set(openings).size).toBeGreaterThanOrEqual(8);
  });

  it("fills flavor text for every life path value", () => {
    for (const v of LIFE_PATH_VALUES) {
      expect(templates.flavor_life_path[v]?.length, `life path ${v}`).toBeGreaterThan(15);
    }
  });

  it("keeps every life path flavor line to one sentence", () => {
    for (const v of LIFE_PATH_VALUES) {
      const text = templates.flavor_life_path[v];
      const sentences = text.split(/[.!?](?:\s|$)/).filter((s) => s.trim().length > 0);
      expect(sentences.length, `life path ${v}: ${text}`).toBe(1);
    }
  });

  it("does not repeat a life path flavor line", () => {
    const lines = LIFE_PATH_VALUES.map((v) => templates.flavor_life_path[v]);
    expect(new Set(lines).size).toBe(LIFE_PATH_VALUES.length);
  });

  it("uses only placeholders the builder supplies", () => {
    const allowed = new Set(["name", "label", "trait_line"]);
    for (const t of ALL_TYPES) {
      for (const m of templates.intro[t].matchAll(/\{(\w+)\}/g)) {
        expect(allowed.has(m[1]!), `intro ${t} uses {${m[1]}}`).toBe(true);
      }
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
  const VALUES = LIFE_PATH_VALUES;

  const ALL_PASSAGES = KINDS.flatMap((k) =>
    VALUES.map((v) => [`${k}.${v}`, interpretations[k][v]] as const)
  );

  it("covers every kind and value", () => {
    for (const k of KINDS) {
      for (const v of VALUES) {
        // Passages currently run ~185-295 chars; a floor of 40 gated nothing.
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
