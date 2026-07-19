# Personal Definition — Logic & Content Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and test the four deterministic calculation modules for the Personal Definition subpage, plus the Vietnamese content they read, so the logic is complete and green before any UI exists.

**Architecture:** Four pure TypeScript modules with no I/O, no network, and no dependencies. Each reads a JSON data file and returns a plain object. A fifth module (`normalize.ts`) handles Vietnamese text normalization and is consumed by the numerology module. Nothing here imports React or Next.js.

**Tech Stack:** TypeScript, vitest. No runtime dependencies.

**Source spec:** `docs/superpowers/specs/2026-07-19-personal-definition-design.md`

## Scope

This plan covers spec §4 (modules), §10 (testing), and §11 (data files) **only**.

It deliberately excludes the UI (spec §6, §7, §8). The product repo containing `components/worker/ui/` has never been accessed, so UI tasks could not name real components or imports without guessing. UI gets its own plan once that repo is available; by then the logic here is finished and tested, and the UI plan reduces to wiring.

## Where this code is built

Paths below are **relative to the product repo root** (`lib/personal-definition/...`). Until that repo is available, build at the **same relative paths** inside this spec repo. Moving the work later is then a straight directory copy — the modules import nothing outside their own folder, by design.

## Global Constraints

- **No runtime dependencies.** The four modules import only from each other and their JSON data. If a task seems to need a library, it is wrong.
- **No LLM.** `@anthropic-ai/sdk` is not used. Identical input must always produce identical output.
- **No `weighted_trait_map` and no `confidence` field.** Both were removed in the spec (§4.3, §5). Do not reintroduce them.
- **Layer separation is load-bearing** (spec §5). `career_hints`, `strengths`, `growth_areas`, and `personality_keywords` derive from the MBTI type and nothing else. Zodiac and numerology touch narrative and card display only. Task 8 enforces this with a test.
- **Interpretation copy is written, never copied.** The numerology *method* is public-domain arithmetic and free to implement. The Vietnamese interpretation text on `tracuuthansohoc.com` and similar sites is copyrighted. Same for MBTI items: 16personalities' bank is not ours to use.
- **All user-facing strings are Vietnamese**, casual and warm, no HR-speak (repo `CLAUDE.md`).
- **Cluster ownership:** everything created here lives under `lib/personal-definition/`. Do not touch files outside it.
- **Branch:** `feature/personal-definition/logic`.
- **Commits are local only.** Do not push, do not open a PR (`CONTRIBUTING.md` §5).

## File Structure

```
lib/personal-definition/
├── types.ts                              # shared interfaces, no logic
├── normalize.ts                          # Vietnamese → A-Z
├── zodiac.ts                             # calculateZodiac
├── numerology.ts                         # calculateNumerology
├── mbti.ts                               # scoreMBTI
├── profile.ts                            # buildProfile
├── data/
│   ├── zodiac-signs.json                 # 12 signs
│   ├── numerology-interpretations.json   # 4 kinds × 12 values
│   ├── questions.json                    # 40 items + defaults
│   ├── mbti-types.json                   # 16 types
│   ├── templates.json                    # narrative fragments
│   └── universities.json                 # ~50 schools
└── __tests__/
    ├── normalize.test.ts
    ├── zodiac.test.ts
    ├── numerology.test.ts
    ├── mbti.test.ts
    ├── profile.test.ts
    └── content.test.ts                   # validates the data files
```

One module per framework keeps each file small enough to hold in context. `normalize.ts` is split out from `numerology.ts` because diacritic handling is the fiddliest part and deserves its own test file.

## Task Order

Tasks 1–8 are sequential (each consumes the previous). Tasks 9–12 are **content authoring and can run in parallel with each other**, once Task 8 is done — they add no code, only JSON. Content is the critical path by volume: roughly 150 Vietnamese passages against maybe 400 lines of logic. Start Tasks 9–12 as early as capacity allows.

---

### Task 1: Scaffold and shared types

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`
- Create: `lib/personal-definition/types.ts`
- Test: `lib/personal-definition/__tests__/types.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `Element`, `Modality`, `Dimension`, `Response`, `ZodiacResult`, `NumerologyResult`, `MBTIResult`, `PersonalProfile` — every later task imports from here.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "personal-definition-logic",
  "private": true,
  "type": "module",
  "scripts": { "test": "vitest run" },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["lib/**/*"]
}
```

`resolveJsonModule` is required — every module imports its data as JSON. `noUncheckedIndexedAccess` catches the array-lookup mistakes that this kind of table-driven code invites.

- [ ] **Step 3: Create `vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["lib/**/__tests__/**/*.test.ts"],
  },
});
```

- [ ] **Step 4: Install**

Run: `npm install`
Expected: completes, `node_modules/` created.

- [ ] **Step 5: Write `lib/personal-definition/types.ts`**

```typescript
export type Element = "Fire" | "Earth" | "Air" | "Water";
export type Modality = "Cardinal" | "Fixed" | "Mutable";
export type Dimension = "EI" | "SN" | "TF" | "JP";

/** Likert response: -2 = Rất sai … +2 = Rất đúng. 0 is neutral, not "skipped". */
export type Response = -2 | -1 | 0 | 1 | 2;

export interface ZodiacResult {
  sun_sign: string;
  moon_sign: null;
  rising_sign: null;
  element: Element;
  modality: Modality;
  traits: string[];
}

export interface NumerologyResult {
  life_path: number;
  expression: number;
  soul_urge: number;
  personality: number;
  interpretations: {
    life_path: string;
    expression: string;
    soul_urge: string;
    personality: string;
  };
}

export interface DimensionScore {
  /** Signed sum, -20…+20. Preserved so Step 2 can see how close the call was. */
  raw: number;
  /** Percentage toward the dimension's first pole (E, S, T, J). */
  first: number;
  /** Percentage toward the second pole (I, N, F, P). Always 100 - first. */
  second: number;
}

export interface MBTIResult {
  type: string;
  dimensions: Record<Dimension, DimensionScore>;
  traits: string[];
}

export interface PersonalProfile {
  user: { name: string; university: string; birth_date: string };
  zodiac: ZodiacResult;
  numerology: NumerologyResult;
  mbti: MBTIResult;
  synthesis: {
    narrative: string;
    strengths: string[];
    growth_areas: string[];
    personality_keywords: string[];
    career_hints: string[];
  };
}
```

> **Dimension score shape** (spec §13 was amended to match this on 2026-07-19).
> The spec types dimensions with letter keys (`EI: { raw, E, I }`). That needs a
> different object type per dimension, which makes `Record<Dimension, …>`
> impossible and forces a cast at every read. This plan uses uniform
> `first`/`second` instead; which letter each refers to is fixed by `poles` in
> the question bank and is available to any consumer that needs the letters.
> Step 2 has not been built, so nothing depends on the spec's shape yet — the
> cost of changing it is zero today and non-zero later. Amend spec §13 when
> this task lands.

- [ ] **Step 6: Write the type smoke test**

```typescript
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
```

- [ ] **Step 7: Run the test**

Run: `npx vitest run`
Expected: 1 test passes.

- [ ] **Step 8: Commit**

```bash
git add package.json tsconfig.json vitest.config.ts lib/personal-definition/
git commit -m "feat(personal-definition): scaffold logic package and shared types"
```

---

### Task 2: Vietnamese normalization

**Files:**
- Create: `lib/personal-definition/normalize.ts`
- Test: `lib/personal-definition/__tests__/normalize.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `normalizeVietnamese(input: string): string` — returns uppercase A–Z only. Task 4 depends on it.

- [ ] **Step 1: Write the failing tests**

```typescript
import { describe, it, expect } from "vitest";
import { normalizeVietnamese } from "../normalize";

describe("normalizeVietnamese", () => {
  it("strips every vowel diacritic family", () => {
    expect(normalizeVietnamese("áàảãạăâ")).toBe("AAAAAAA");
    expect(normalizeVietnamese("éèẻẽẹê")).toBe("EEEEEE");
    expect(normalizeVietnamese("íìỉĩị")).toBe("IIIII");
    expect(normalizeVietnamese("óòỏõọôơ")).toBe("OOOOOOO");
    expect(normalizeVietnamese("úùủũụư")).toBe("UUUUUU");
    expect(normalizeVietnamese("ýỳỷỹỵ")).toBe("YYYYY");
  });

  it("maps đ and Đ to D", () => {
    expect(normalizeVietnamese("đĐ")).toBe("DD");
  });

  it("drops spaces, punctuation and digits", () => {
    expect(normalizeVietnamese("Nguyễn Thị Khánh-Trang 2003")).toBe(
      "NGUYENTHIKHANHTRANG"
    );
  });

  it("returns empty string when nothing is mappable", () => {
    expect(normalizeVietnamese("!!! 123 ???")).toBe("");
  });

  it("is idempotent", () => {
    const once = normalizeVietnamese("Đặng Thuý Vy");
    expect(normalizeVietnamese(once)).toBe(once);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run normalize`
Expected: FAIL — `Failed to resolve import "../normalize"`.

- [ ] **Step 3: Implement**

```typescript
/**
 * Vietnamese name → bare A-Z, for numerology letter mapping.
 *
 * Unicode NFD splits a precomposed character into base + combining marks,
 * so a single regex removes every tone mark, the breve (ă), the circumflex
 * (â ê ô) and the horn (ơ ư). Đ/đ is NOT decomposable — it is its own
 * codepoint — so it is replaced explicitly before the A-Z filter would
 * otherwise discard it.
 */
export function normalizeVietnamese(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
}
```

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run normalize`
Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/personal-definition/normalize.ts lib/personal-definition/__tests__/normalize.test.ts
git commit -m "feat(personal-definition): Vietnamese text normalization"
```

---

### Task 3: Zodiac calculator

**Files:**
- Create: `lib/personal-definition/data/zodiac-signs.json`
- Create: `lib/personal-definition/zodiac.ts`
- Test: `lib/personal-definition/__tests__/zodiac.test.ts`

**Interfaces:**
- Consumes: `ZodiacResult`, `Element`, `Modality` from `types.ts`
- Produces: `calculateZodiac(birthDate: string): ZodiacResult` — `birthDate` is `YYYY-MM-DD`.

- [ ] **Step 1: Create the data file**

Full 12 entries. `start`/`end` are `MM-DD`, inclusive. Traits are placeholders of the right shape here and are replaced with final copy in Task 11 — the calculator must not care what the strings say.

```json
[
  { "sun_sign": "Bạch Dương",  "start": "03-21", "end": "04-19", "element": "Fire",  "modality": "Cardinal", "traits": ["nhiệt huyết", "thẳng thắn", "thích dẫn đầu"] },
  { "sun_sign": "Kim Ngưu",    "start": "04-20", "end": "05-20", "element": "Earth", "modality": "Fixed",    "traits": ["kiên định", "thực tế", "trân trọng sự ổn định"] },
  { "sun_sign": "Song Tử",     "start": "05-21", "end": "06-20", "element": "Air",   "modality": "Mutable",  "traits": ["linh hoạt", "tò mò", "giỏi giao tiếp"] },
  { "sun_sign": "Cự Giải",     "start": "06-21", "end": "07-22", "element": "Water", "modality": "Cardinal", "traits": ["tình cảm", "che chở", "gắn bó gia đình"] },
  { "sun_sign": "Sư Tử",       "start": "07-23", "end": "08-22", "element": "Fire",  "modality": "Fixed",    "traits": ["tự tin", "hào phóng", "thích toả sáng"] },
  { "sun_sign": "Xử Nữ",       "start": "08-23", "end": "09-22", "element": "Earth", "modality": "Mutable",  "traits": ["tỉ mỉ", "có tổ chức", "cầu toàn"] },
  { "sun_sign": "Thiên Bình",  "start": "09-23", "end": "10-22", "element": "Air",   "modality": "Cardinal", "traits": ["hoà nhã", "công bằng", "khéo léo"] },
  { "sun_sign": "Bọ Cạp",      "start": "10-23", "end": "11-21", "element": "Water", "modality": "Fixed",    "traits": ["sâu sắc", "quyết liệt", "trung thành"] },
  { "sun_sign": "Nhân Mã",     "start": "11-22", "end": "12-21", "element": "Fire",  "modality": "Mutable",  "traits": ["phiêu lưu", "lạc quan", "yêu tự do"] },
  { "sun_sign": "Ma Kết",      "start": "12-22", "end": "01-19", "element": "Earth", "modality": "Cardinal", "traits": ["kỷ luật", "kiên trì", "hướng mục tiêu"] },
  { "sun_sign": "Bảo Bình",    "start": "01-20", "end": "02-18", "element": "Air",   "modality": "Fixed",    "traits": ["độc lập", "sáng tạo", "nghĩ khác số đông"] },
  { "sun_sign": "Song Ngư",    "start": "02-19", "end": "03-20", "element": "Water", "modality": "Mutable",  "traits": ["giàu tưởng tượng", "đồng cảm", "nhạy cảm"] }
]
```

Ma Kết is the only entry whose range wraps the year end. The lookup below handles that case explicitly rather than by sorting tricks.

- [ ] **Step 2: Write the failing tests**

```typescript
import { describe, it, expect } from "vitest";
import { calculateZodiac } from "../zodiac";
import signs from "../data/zodiac-signs.json";

describe("calculateZodiac", () => {
  it("returns the sign containing the date", () => {
    expect(calculateZodiac("2003-06-15").sun_sign).toBe("Song Tử");
  });

  it("is inclusive on both boundary days of every sign", () => {
    for (const s of signs) {
      const [sm, sd] = s.start.split("-");
      const [em, ed] = s.end.split("-");
      expect(calculateZodiac(`2003-${sm}-${sd}`).sun_sign).toBe(s.sun_sign);
      expect(calculateZodiac(`2003-${em}-${ed}`).sun_sign).toBe(s.sun_sign);
    }
  });

  it("handles the Ma Kết year wrap on both sides", () => {
    expect(calculateZodiac("2003-12-25").sun_sign).toBe("Ma Kết");
    expect(calculateZodiac("2003-01-05").sun_sign).toBe("Ma Kết");
  });

  it("derives element and modality from the sign", () => {
    const r = calculateZodiac("2003-11-30");
    expect(r.sun_sign).toBe("Nhân Mã");
    expect(r.element).toBe("Fire");
    expect(r.modality).toBe("Mutable");
  });

  it("leaves moon and rising null in Phase 1", () => {
    const r = calculateZodiac("2003-06-15");
    expect(r.moon_sign).toBeNull();
    expect(r.rising_sign).toBeNull();
  });

  it("covers all 366 days of a leap year with exactly one sign", () => {
    const d = new Date(Date.UTC(2004, 0, 1));
    let n = 0;
    while (d.getUTCFullYear() === 2004) {
      expect(() => calculateZodiac(d.toISOString().slice(0, 10))).not.toThrow();
      d.setUTCDate(d.getUTCDate() + 1);
      n++;
    }
    expect(n).toBe(366);
  });

  it("rejects a malformed date", () => {
    expect(() => calculateZodiac("15-06-2003")).toThrow(/YYYY-MM-DD/);
  });
});
```

The 366-day sweep is the test that matters: it proves the twelve ranges leave no gap and no overlap. Hand-picked dates would not.

- [ ] **Step 3: Run to verify they fail**

Run: `npx vitest run zodiac`
Expected: FAIL — `Failed to resolve import "../zodiac"`.

- [ ] **Step 4: Implement**

```typescript
import type { Element, Modality, ZodiacResult } from "./types";
import signs from "./data/zodiac-signs.json";

interface SignRow {
  sun_sign: string;
  start: string;
  end: string;
  element: Element;
  modality: Modality;
  traits: string[];
}

const ROWS = signs as SignRow[];

/** "MM-DD" → comparable integer, e.g. "03-21" → 321. */
function md(monthDay: string): number {
  return Number(monthDay.replace("-", ""));
}

/**
 * Sun sign from birth date.
 *
 * Boundary dates shift by up to a day year to year; Phase 1 uses fixed
 * conventional boundaries and accepts that imprecision (spec §4.1). The
 * dates live in zodiac-signs.json so the convention is visible as data.
 */
export function calculateZodiac(birthDate: string): ZodiacResult {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    throw new Error(`calculateZodiac: expected YYYY-MM-DD, got "${birthDate}"`);
  }

  const value = md(birthDate.slice(5));

  const row = ROWS.find((r) => {
    const start = md(r.start);
    const end = md(r.end);
    // Ma Kết wraps the year boundary, so its start is greater than its end.
    return start <= end
      ? value >= start && value <= end
      : value >= start || value <= end;
  });

  if (!row) {
    throw new Error(`calculateZodiac: no sign covers ${birthDate}`);
  }

  return {
    sun_sign: row.sun_sign,
    moon_sign: null,
    rising_sign: null,
    element: row.element,
    modality: row.modality,
    traits: row.traits,
  };
}
```

- [ ] **Step 5: Run to verify they pass**

Run: `npx vitest run zodiac`
Expected: 7 tests pass.

- [ ] **Step 6: Commit**

```bash
git add lib/personal-definition/zodiac.ts lib/personal-definition/data/zodiac-signs.json lib/personal-definition/__tests__/zodiac.test.ts
git commit -m "feat(personal-definition): zodiac calculator with boundary coverage"
```

---

### Task 4: Numerology calculator

**Files:**
- Create: `lib/personal-definition/numerology.ts`
- Test: `lib/personal-definition/__tests__/numerology.test.ts`

**Interfaces:**
- Consumes: `normalizeVietnamese` from `normalize.ts`; `NumerologyResult` from `types.ts`
- Produces: `reduceNumber(n: number): number`, `calculateNumerology(birthDate: string, fullName: string): NumerologyResult`

Interpretation strings come from `data/numerology-interpretations.json`, authored in Task 10. Until then the file holds empty strings and the tests below assert numbers, not copy.

- [ ] **Step 1: Create the interpretations stub**

`lib/personal-definition/data/numerology-interpretations.json` — four kinds, twelve values each, empty strings for now. Task 10 fills them.

```json
{
  "life_path":   { "1": "", "2": "", "3": "", "4": "", "5": "", "6": "", "7": "", "8": "", "9": "", "11": "", "22": "", "33": "" },
  "expression":  { "1": "", "2": "", "3": "", "4": "", "5": "", "6": "", "7": "", "8": "", "9": "", "11": "", "22": "", "33": "" },
  "soul_urge":   { "1": "", "2": "", "3": "", "4": "", "5": "", "6": "", "7": "", "8": "", "9": "", "11": "", "22": "", "33": "" },
  "personality": { "1": "", "2": "", "3": "", "4": "", "5": "", "6": "", "7": "", "8": "", "9": "", "11": "", "22": "", "33": "" }
}
```

- [ ] **Step 2: Write the failing tests**

```typescript
import { describe, it, expect } from "vitest";
import { reduceNumber, calculateNumerology } from "../numerology";

describe("reduceNumber", () => {
  it("reduces to a single digit", () => {
    expect(reduceNumber(7)).toBe(7);
    expect(reduceNumber(12)).toBe(3);
    expect(reduceNumber(48)).toBe(3);   // 48 → 12 → 3
  });

  it("stops at a master number", () => {
    expect(reduceNumber(29)).toBe(11);  // 29 → 11, stop
    expect(reduceNumber(38)).toBe(11);
    expect(reduceNumber(22)).toBe(22);
    expect(reduceNumber(33)).toBe(33);
  });

  it("stops at a master reached part-way down the chain", () => {
    expect(reduceNumber(209)).toBe(11); // 2+0+9 = 11, stop
    expect(reduceNumber(994)).toBe(22); // 9+9+4 = 22, stop
  });

  it("does not mistake a non-master two-digit result for a stop", () => {
    expect(reduceNumber(695)).toBe(2);  // 6+9+5 = 20 → 2
  });
});

describe("calculateNumerology", () => {
  const name = "Nguyễn Thị Khánh Trang";

  it("computes life path by reducing D, M, Y then summing", () => {
    // 2003-06-15 → day 15→6, month 6→6, year 2003→5; 6+6+5=17→8
    expect(calculateNumerology("2003-06-15", name).life_path).toBe(8);
  });

  it("computes expression from every letter", () => {
    // NGUYENTHIKHANHTRANG
    // N5 G7 U3 Y7 E5 N5 T2 H8 I9 K2 H8 A1 N5 H8 T2 R9 A1 N5 G7 = 99 → 18 → 9
    expect(calculateNumerology("2003-06-15", name).expression).toBe(9);
  });

  it("computes soul urge from vowels only, counting Y as a vowel", () => {
    // Vowels of NGUYENTHIKHANHTRANG: U3 Y7 E5 I9 A1 A1 = 26 → 8
    expect(calculateNumerology("2003-06-15", name).soul_urge).toBe(8);
  });

  it("computes personality from consonants only", () => {
    // expression 99 - soul 26 = 73 → 10 → 1
    expect(calculateNumerology("2003-06-15", name).personality).toBe(1);
  });

  it("splits every letter into exactly one of soul urge or personality", () => {
    // Digital roots add, so vowel-sum + consonant-sum must have the same
    // root as the full letter sum. Asserted on the *unreduced* sums via a
    // known case, because master numbers deliberately break the identity
    // once reduction has been applied — 11 does not reduce to 2 here.
    const r = calculateNumerology("2003-06-15", name);
    expect(r.soul_urge).toBe(8);      // vowels   26 → 8
    expect(r.personality).toBe(1);    // consonants 73 → 10 → 1
    expect(r.expression).toBe(9);     // all       99 → 18 → 9
    expect(reduceNumber(26 + 73)).toBe(9);
  });

  it("treats Đ as D", () => {
    expect(calculateNumerology("2000-01-01", "Đức").expression).toBe(
      calculateNumerology("2000-01-01", "Duc").expression
    );
  });

  it("ignores diacritics entirely", () => {
    expect(calculateNumerology("2000-01-01", "Nguyễn Thuý").expression).toBe(
      calculateNumerology("2000-01-01", "Nguyen Thuy").expression
    );
  });

  it("rejects a name with no mappable letters", () => {
    expect(() => calculateNumerology("2000-01-01", "!!! 123")).toThrow(
      /no mappable letters/
    );
  });

  it("rejects a malformed date", () => {
    expect(() => calculateNumerology("01-01-2000", "Duc")).toThrow(/YYYY-MM-DD/);
  });
});
```

> Note for the implementer: the arithmetic in the comments above is worked by hand. If a test fails, **recheck the hand arithmetic before changing the implementation** — a wrong expected value in a test is the likelier error, and silently "fixing" the code to match a bad expectation is how this module goes subtly wrong.

- [ ] **Step 3: Run to verify they fail**

Run: `npx vitest run numerology`
Expected: FAIL — `Failed to resolve import "../numerology"`.

- [ ] **Step 4: Implement**

```typescript
import type { NumerologyResult } from "./types";
import { normalizeVietnamese } from "./normalize";
import interpretations from "./data/numerology-interpretations.json";

const PYTHAGOREAN: Record<string, number> = {
  A: 1, J: 1, S: 1,
  B: 2, K: 2, T: 2,
  C: 3, L: 3, U: 3,
  D: 4, M: 4, V: 4,
  E: 5, N: 5, W: 5,
  F: 6, O: 6, X: 6,
  G: 7, P: 7, Y: 7,
  H: 8, Q: 8, Z: 8,
  I: 9, R: 9,
};

/**
 * Y counts as a vowel unconditionally. In Vietnamese it functions as one
 * (Lý, Thúy), and any context-dependent rule would make the result depend
 * on parsing rather than arithmetic. Documented convention, spec §4.2.
 */
const VOWELS = new Set(["A", "E", "I", "O", "U", "Y"]);

const MASTERS = new Set([11, 22, 33]);

/** Sum digits repeatedly until single-digit, stopping early on 11/22/33. */
export function reduceNumber(n: number): number {
  let value = n;
  while (value > 9 && !MASTERS.has(value)) {
    value = String(value)
      .split("")
      .reduce((sum, digit) => sum + Number(digit), 0);
  }
  return value;
}

function sumLetters(letters: string, filter?: (c: string) => boolean): number {
  return letters
    .split("")
    .filter((c) => (filter ? filter(c) : true))
    .reduce((sum, c) => sum + (PYTHAGOREAN[c] ?? 0), 0);
}

export function calculateNumerology(
  birthDate: string,
  fullName: string
): NumerologyResult {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    throw new Error(
      `calculateNumerology: expected YYYY-MM-DD, got "${birthDate}"`
    );
  }

  const letters = normalizeVietnamese(fullName);
  if (letters.length === 0) {
    throw new Error("calculateNumerology: name has no mappable letters");
  }

  const [year, month, day] = birthDate.split("-").map(Number) as [
    number,
    number,
    number
  ];

  const life_path = reduceNumber(
    reduceNumber(day) + reduceNumber(month) + reduceNumber(year)
  );
  const expression = reduceNumber(sumLetters(letters));
  const soul_urge = reduceNumber(sumLetters(letters, (c) => VOWELS.has(c)));
  const personality = reduceNumber(sumLetters(letters, (c) => !VOWELS.has(c)));

  const table = interpretations as Record<string, Record<string, string>>;
  const look = (kind: string, value: number): string =>
    table[kind]?.[String(value)] ?? "";

  return {
    life_path,
    expression,
    soul_urge,
    personality,
    interpretations: {
      life_path: look("life_path", life_path),
      expression: look("expression", expression),
      soul_urge: look("soul_urge", soul_urge),
      personality: look("personality", personality),
    },
  };
}
```

- [ ] **Step 5: Run to verify they pass**

Run: `npx vitest run numerology`
Expected: all tests pass. If an arithmetic expectation fails, re-derive it by hand first.

- [ ] **Step 6: Commit**

```bash
git add lib/personal-definition/numerology.ts lib/personal-definition/data/numerology-interpretations.json lib/personal-definition/__tests__/numerology.test.ts
git commit -m "feat(personal-definition): numerology calculator with four core numbers"
```

---

### Task 5: Question bank shape and integrity rules

**Files:**
- Create: `lib/personal-definition/data/questions.json` (fixture-sized: 8 items)
- Test: `lib/personal-definition/__tests__/content.test.ts`

**Interfaces:**
- Consumes: `Dimension` from `types.ts`
- Produces: `QuestionItem`, `QuestionBank` types (declared in `mbti.ts`, Task 6); the integrity test that Task 12 must satisfy with the real 40 items.

This task builds the bank with **8 placeholder items (2 per dimension)** so the scorer in Task 6 can be developed and tested against a small, hand-checkable fixture. Task 12 replaces them with the real 40 and the same integrity test then enforces the full-size rules.

- [ ] **Step 1: Create the fixture bank**

```json
{
  "size": 8,
  "defaults": { "EI": "I", "SN": "N", "TF": "F", "JP": "P" },
  "poles": {
    "EI": { "first": "E", "second": "I" },
    "SN": { "first": "S", "second": "N" },
    "TF": { "first": "T", "second": "F" },
    "JP": { "first": "J", "second": "P" }
  },
  "items": [
    { "id": "ei_01", "dimension": "EI", "key":  1, "text": "Ở chỗ đông người, tôi thường là người bắt chuyện trước." },
    { "id": "ei_02", "dimension": "EI", "key": -1, "text": "Sau một buổi họp nhóm đông người, tôi thấy cạn năng lượng." },
    { "id": "sn_01", "dimension": "SN", "key":  1, "text": "Tôi tin vào những gì mình quan sát được hơn là linh cảm." },
    { "id": "sn_02", "dimension": "SN", "key": -1, "text": "Tôi hay nghĩ tới việc mọi thứ có thể trở thành cái gì trong tương lai." },
    { "id": "tf_01", "dimension": "TF", "key":  1, "text": "Khi góp ý cho bạn, tôi nói thẳng vấn đề dù hơi khó nghe." },
    { "id": "tf_02", "dimension": "TF", "key": -1, "text": "Trước khi quyết định, tôi cân nhắc quyết định đó ảnh hưởng tới cảm xúc của ai." },
    { "id": "jp_01", "dimension": "JP", "key":  1, "text": "Tôi lên kế hoạch cho kỳ thi từ sớm và bám theo lịch đã đặt." },
    { "id": "jp_02", "dimension": "JP", "key": -1, "text": "Tôi làm việc hiệu quả nhất khi để mọi thứ linh hoạt tới phút cuối." }
  ]
}
```

`size` is declared in the data so the integrity test reads the intended count from one place; Task 12 changes it to 40.

- [ ] **Step 2: Write the integrity test**

```typescript
import { describe, it, expect } from "vitest";
import bank from "../data/questions.json";

const DIMENSIONS = ["EI", "SN", "TF", "JP"] as const;

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
```

- [ ] **Step 3: Run to verify they pass**

Run: `npx vitest run content`
Expected: 8 tests pass against the fixture bank.

- [ ] **Step 4: Commit**

```bash
git add lib/personal-definition/data/questions.json lib/personal-definition/__tests__/content.test.ts
git commit -m "feat(personal-definition): question bank shape and integrity rules"
```

---

### Task 6: MBTI scorer

**Files:**
- Create: `lib/personal-definition/mbti.ts`
- Test: `lib/personal-definition/__tests__/mbti.test.ts`

**Interfaces:**
- Consumes: `Dimension`, `Response`, `MBTIResult`, `DimensionScore` from `types.ts`; `data/questions.json`
- Produces: `QuestionItem`, `QuestionBank`, `scoreMBTI(responses: Response[]): MBTIResult`

- [ ] **Step 1: Write the failing tests**

```typescript
import { describe, it, expect } from "vitest";
import { scoreMBTI } from "../mbti";
import bank from "../data/questions.json";
import type { Response } from "../types";

/** Answer every item at `r`, honouring its key so all dimensions land the same way. */
function allToward(pole: "first" | "second", magnitude: 1 | 2): Response[] {
  return bank.items.map((i) => {
    const sign = pole === "first" ? 1 : -1;
    return (sign * i.key * magnitude) as Response;
  });
}

const NEUTRAL = (): Response[] => bank.items.map(() => 0 as Response);

describe("scoreMBTI", () => {
  it("returns maximum score when every answer points to the first pole", () => {
    const r = scoreMBTI(allToward("first", 2));
    expect(r.type).toBe("ESTJ");
    for (const d of ["EI", "SN", "TF", "JP"] as const) {
      expect(r.dimensions[d].raw).toBe(bank.size / 4 * 2);
      expect(r.dimensions[d].first).toBe(100);
      expect(r.dimensions[d].second).toBe(0);
    }
  });

  it("returns minimum score when every answer points to the second pole", () => {
    const r = scoreMBTI(allToward("second", 2));
    expect(r.type).toBe("INFP");
    for (const d of ["EI", "SN", "TF", "JP"] as const) {
      expect(r.dimensions[d].raw).toBe(-(bank.size / 4) * 2);
      expect(r.dimensions[d].first).toBe(0);
    }
  });

  it("falls back to the declared defaults when every dimension ties at zero", () => {
    const r = scoreMBTI(NEUTRAL());
    expect(r.type).toBe("INFP");
    for (const d of ["EI", "SN", "TF", "JP"] as const) {
      expect(r.dimensions[d].raw).toBe(0);
      expect(r.dimensions[d].first).toBe(50);
      expect(r.dimensions[d].second).toBe(50);
    }
  });

  it("keeps first and second complementary", () => {
    const responses = NEUTRAL();
    responses[0] = 2;
    responses[1] = 1;
    const r = scoreMBTI(responses);
    for (const d of ["EI", "SN", "TF", "JP"] as const) {
      expect(r.dimensions[d].first + r.dimensions[d].second).toBe(100);
    }
  });

  it("moves one dimension by exactly 1 per response step and leaves the others alone", () => {
    const base = scoreMBTI(NEUTRAL());
    const nudged = NEUTRAL();
    const item = bank.items[0]!;
    nudged[0] = (item.key === 1 ? 1 : -1) as Response;

    const after = scoreMBTI(nudged);
    const moved = item.dimension as "EI" | "SN" | "TF" | "JP";

    expect(after.dimensions[moved].raw).toBe(base.dimensions[moved].raw + 1);
    for (const d of ["EI", "SN", "TF", "JP"] as const) {
      if (d !== moved) {
        expect(after.dimensions[d].raw, `${d} should be untouched`).toBe(
          base.dimensions[d].raw
        );
      }
    }
  });

  it("scores each dimension independently of the others", () => {
    const responses = bank.items.map((i) =>
      (i.dimension === "EI" ? 2 * i.key : 0) as Response
    );
    const r = scoreMBTI(responses);
    expect(r.dimensions.EI.raw).toBeGreaterThan(0);
    expect(r.dimensions.SN.raw).toBe(0);
    expect(r.dimensions.TF.raw).toBe(0);
    expect(r.dimensions.JP.raw).toBe(0);
  });

  it("rejects a response array of the wrong length", () => {
    expect(() => scoreMBTI([0, 0] as Response[])).toThrow(/expected \d+ responses/);
  });

  it("rejects an out-of-range response value", () => {
    const bad = NEUTRAL();
    bad[0] = 5 as Response;
    expect(() => scoreMBTI(bad)).toThrow(/out of range/);
  });
});
```

Every test derives its expectations from `bank.size` rather than hardcoding 8 or 40, so this suite keeps working unchanged when Task 12 swaps in the real bank.

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run mbti`
Expected: FAIL — `Failed to resolve import "../mbti"`.

- [ ] **Step 3: Implement**

```typescript
import type { Dimension, DimensionScore, MBTIResult, Response } from "./types";
import bank from "./data/questions.json";

export interface QuestionItem {
  id: string;
  dimension: Dimension;
  key: 1 | -1;
  text: string;
}

export interface QuestionBank {
  size: number;
  defaults: Record<Dimension, string>;
  poles: Record<Dimension, { first: string; second: string }>;
  items: QuestionItem[];
}

const BANK = bank as QuestionBank;
const DIMENSIONS: Dimension[] = ["EI", "SN", "TF", "JP"];

/**
 * Score a completed quiz.
 *
 * Per dimension: S = Σ(response × key), where key is +1 when agreement
 * points at the dimension's first pole. With N items per dimension S runs
 * from -2N to +2N. The percentage is a linear remap of that range onto
 * 0…100, so S = 0 reads as an even 50/50 rather than being flattened into
 * a confident letter.
 *
 * S = 0 is genuinely reachable — all-neutral answers, or balanced
 * disagreement — so it resolves to the pole declared in the bank rather
 * than to whichever branch happens to come first. Spec §4.3.
 */
export function scoreMBTI(responses: Response[]): MBTIResult {
  if (responses.length !== BANK.items.length) {
    throw new Error(
      `scoreMBTI: expected ${BANK.items.length} responses, got ${responses.length}`
    );
  }
  for (const [index, r] of responses.entries()) {
    if (!Number.isInteger(r) || r < -2 || r > 2) {
      throw new Error(`scoreMBTI: response at index ${index} out of range: ${r}`);
    }
  }

  const raw: Record<Dimension, number> = { EI: 0, SN: 0, TF: 0, JP: 0 };
  const counts: Record<Dimension, number> = { EI: 0, SN: 0, TF: 0, JP: 0 };

  BANK.items.forEach((item, index) => {
    raw[item.dimension] += responses[index]! * item.key;
    counts[item.dimension] += 1;
  });

  const dimensions = {} as Record<Dimension, DimensionScore>;
  let type = "";

  for (const d of DIMENSIONS) {
    const span = counts[d] * 2;                    // |S| max for this dimension
    const s = raw[d];
    const first = ((s + span) / (span * 2)) * 100;

    dimensions[d] = {
      raw: s,
      first: Number(first.toFixed(1)),
      second: Number((100 - first).toFixed(1)),
    };

    type +=
      s > 0
        ? BANK.poles[d].first
        : s < 0
          ? BANK.poles[d].second
          : BANK.defaults[d];
  }

  return { type, dimensions, traits: [] };
}
```

`traits` is left empty here — it is filled from `mbti-types.json` by `buildProfile` in Task 8, which is where the type data is loaded. Keeping the scorer free of content data means it stays testable against a fixture bank alone.

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run mbti`
Expected: 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/personal-definition/mbti.ts lib/personal-definition/__tests__/mbti.test.ts
git commit -m "feat(personal-definition): MBTI scorer with signed-sum scoring"
```

---

### Task 7: MBTI type data and template stubs

**Files:**
- Create: `lib/personal-definition/data/mbti-types.json`
- Create: `lib/personal-definition/data/templates.json`
- Modify: `lib/personal-definition/__tests__/content.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: the `mbti-types.json` and `templates.json` shapes that Task 8 reads.

This task creates all 16 entries with **one fully-written exemplar (INFP) and 15 structurally-complete entries carrying empty strings**. Task 11 writes the remaining copy. Splitting it this way lets Task 8's builder be written and tested now without waiting on content.

- [ ] **Step 1: Create `mbti-types.json`**

Sixteen keys: `INFP INFJ INTP INTJ ISFP ISFJ ISTP ISTJ ENFP ENFJ ENTP ENTJ ESFP ESFJ ESTP ESTJ`. INFP is written out as the standard to match; the other fifteen take the same shape with `""` and `[]` filled in Task 11.

```json
{
  "INFP": {
    "label": "Người Hoà Giải",
    "traits": ["giàu giá trị nội tâm", "đồng cảm", "sáng tạo", "kín đáo"],
    "strengths": [
      "Nhìn ra điều người khác đang thực sự cần, kể cả khi họ không nói ra",
      "Giữ vững điều mình tin là đúng dù không ai ủng hộ",
      "Diễn đạt ý tưởng trừu tượng thành câu chữ dễ chạm",
      "Làm việc bền bỉ với thứ mình thấy có ý nghĩa",
      "Tạo không gian an toàn để người khác mở lòng"
    ],
    "growth_areas": [
      "Dễ trì hoãn việc mình không thấy ý nghĩa, kể cả khi nó cần thiết",
      "Nhận góp ý theo hướng cá nhân hoá dù người góp ý không có ý đó",
      "Ngại nói ra nhu cầu của mình trong nhóm"
    ],
    "personality_keywords": ["nội tâm", "lý tưởng", "đồng cảm", "sáng tạo", "chân thành", "linh hoạt"],
    "career_hints": ["viết lách và nội dung", "thiết kế", "tâm lý và tham vấn", "giáo dục", "phát triển cộng đồng", "nghiên cứu xã hội"]
  },
  "INFJ": { "label": "", "traits": [], "strengths": [], "growth_areas": [], "personality_keywords": [], "career_hints": [] },
  "INTP": { "label": "", "traits": [], "strengths": [], "growth_areas": [], "personality_keywords": [], "career_hints": [] },
  "INTJ": { "label": "", "traits": [], "strengths": [], "growth_areas": [], "personality_keywords": [], "career_hints": [] },
  "ISFP": { "label": "", "traits": [], "strengths": [], "growth_areas": [], "personality_keywords": [], "career_hints": [] },
  "ISFJ": { "label": "", "traits": [], "strengths": [], "growth_areas": [], "personality_keywords": [], "career_hints": [] },
  "ISTP": { "label": "", "traits": [], "strengths": [], "growth_areas": [], "personality_keywords": [], "career_hints": [] },
  "ISTJ": { "label": "", "traits": [], "strengths": [], "growth_areas": [], "personality_keywords": [], "career_hints": [] },
  "ENFP": { "label": "", "traits": [], "strengths": [], "growth_areas": [], "personality_keywords": [], "career_hints": [] },
  "ENFJ": { "label": "", "traits": [], "strengths": [], "growth_areas": [], "personality_keywords": [], "career_hints": [] },
  "ENTP": { "label": "", "traits": [], "strengths": [], "growth_areas": [], "personality_keywords": [], "career_hints": [] },
  "ENTJ": { "label": "", "traits": [], "strengths": [], "growth_areas": [], "personality_keywords": [], "career_hints": [] },
  "ESFP": { "label": "", "traits": [], "strengths": [], "growth_areas": [], "personality_keywords": [], "career_hints": [] },
  "ESFJ": { "label": "", "traits": [], "strengths": [], "growth_areas": [], "personality_keywords": [], "career_hints": [] },
  "ESTP": { "label": "", "traits": [], "strengths": [], "growth_areas": [], "personality_keywords": [], "career_hints": [] },
  "ESTJ": { "label": "", "traits": [], "strengths": [], "growth_areas": [], "personality_keywords": [], "career_hints": [] }
}
```

- [ ] **Step 2: Create `templates.json`**

The narrative is assembled from three slots. `intro` is keyed by MBTI type, `flavor_element` by zodiac element, `flavor_life_path` by life path number. Only the flavor slots may mention zodiac or numerology (spec §5).

```json
{
  "intro": {
    "INFP": "{name} ơi, bạn thuộc nhóm {label} — {trait_line}.",
    "INFJ": "", "INTP": "", "INTJ": "", "ISFP": "", "ISFJ": "", "ISTP": "", "ISTJ": "",
    "ENFP": "", "ENFJ": "", "ENTP": "", "ENTJ": "", "ESFP": "", "ESFJ": "", "ESTP": "", "ESTJ": ""
  },
  "flavor_element": {
    "Fire":  "Chút lửa trong bạn khiến bạn bắt đầu mọi thứ bằng nhiệt.",
    "Earth": "Bạn có nền đất dưới chân — thích chắc chắn trước khi bước.",
    "Air":   "Bạn sống nhiều trong ý tưởng và những cuộc trò chuyện.",
    "Water": "Bạn cảm nhận mọi thứ hơi sâu hơn người xung quanh một chút."
  },
  "flavor_life_path": {
    "1": "", "2": "", "3": "", "4": "", "5": "", "6": "",
    "7": "", "8": "", "9": "", "11": "", "22": "", "33": ""
  },
  "closing": "Đây là một góc nhìn về bạn, không phải toàn bộ con người bạn."
}
```

The `closing` line is fixed and always appended. It is the spec §15 requirement made concrete: the product must not present an unvalidated instrument as a verdict.

- [ ] **Step 3: Add content-shape tests to `content.test.ts`**

```typescript
import types from "../data/mbti-types.json";
import templates from "../data/templates.json";

const ALL_TYPES = [
  "INFP", "INFJ", "INTP", "INTJ", "ISFP", "ISFJ", "ISTP", "ISTJ",
  "ENFP", "ENFJ", "ENTP", "ENTJ", "ESFP", "ESFJ", "ESTP", "ESTJ",
] as const;

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
```

- [ ] **Step 4: Run**

Run: `npx vitest run content`
Expected: all shape tests pass. Completeness of the *copy* is enforced in Task 11, not here.

- [ ] **Step 5: Commit**

```bash
git add lib/personal-definition/data/mbti-types.json lib/personal-definition/data/templates.json lib/personal-definition/__tests__/content.test.ts
git commit -m "feat(personal-definition): MBTI type and narrative template data shapes"
```

---

### Task 8: Profile builder and the layer-separation guarantee

**Files:**
- Create: `lib/personal-definition/profile.ts`
- Test: `lib/personal-definition/__tests__/profile.test.ts`

**Interfaces:**
- Consumes: everything above
- Produces: `buildProfile(input): PersonalProfile` — the Step 2 handoff. This is the module the UI will call.

This is the task that makes spec §5 real. The regression test below is the reason the whole layer-separation decision holds up over time.

- [ ] **Step 1: Write the failing tests**

```typescript
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
```

The pairing of the last two behavioural tests is the point: birth date **must** move the narrative and **must not** move the career signal. One without the other would pass while the design was broken.

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run profile`
Expected: FAIL — `Failed to resolve import "../profile"`.

- [ ] **Step 3: Implement**

```typescript
import type { PersonalProfile, Response } from "./types";
import { calculateZodiac } from "./zodiac";
import { calculateNumerology } from "./numerology";
import { scoreMBTI } from "./mbti";
import types from "./data/mbti-types.json";
import templates from "./data/templates.json";

export interface BuildProfileInput {
  name: string;
  university: string;
  birth_date: string;
  full_name: string;
  responses: Response[];
}

interface TypeEntry {
  label: string;
  traits: string[];
  strengths: string[];
  growth_areas: string[];
  personality_keywords: string[];
  career_hints: string[];
}

const TYPES = types as Record<string, TypeEntry>;
const T = templates as {
  intro: Record<string, string>;
  flavor_element: Record<string, string>;
  flavor_life_path: Record<string, string>;
  closing: string;
};

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? "");
}

/**
 * Compose the full profile.
 *
 * Layer separation (spec §5) is enforced structurally, not by convention:
 * strengths, growth_areas, personality_keywords and career_hints are read
 * from the MBTI type entry and nothing else touches them. Zodiac and
 * numerology reach only the narrative's flavor slots. Two students with
 * identical answers and different birthdays must get identical career
 * signals — profile.test.ts asserts exactly that.
 */
export function buildProfile(input: BuildProfileInput): PersonalProfile {
  const zodiac = calculateZodiac(input.birth_date);
  const numerology = calculateNumerology(input.birth_date, input.full_name);
  const mbti = scoreMBTI(input.responses);

  const entry = TYPES[mbti.type];
  if (!entry) {
    throw new Error(`buildProfile: no data for MBTI type "${mbti.type}"`);
  }

  const intro = fill(T.intro[mbti.type] ?? "", {
    name: input.name,
    label: entry.label,
    trait_line: entry.traits.join(", "),
  });

  const narrative = [
    intro,
    T.flavor_element[zodiac.element] ?? "",
    T.flavor_life_path[String(numerology.life_path)] ?? "",
    T.closing,
  ]
    .filter((part) => part.trim().length > 0)
    .join(" ");

  return {
    user: {
      name: input.name,
      university: input.university,
      birth_date: input.birth_date,
    },
    zodiac,
    numerology,
    mbti: { ...mbti, traits: entry.traits },
    synthesis: {
      narrative,
      strengths: entry.strengths,
      growth_areas: entry.growth_areas,
      personality_keywords: entry.personality_keywords,
      career_hints: entry.career_hints,
    },
  };
}
```

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run profile`
Expected: 8 tests pass.

- [ ] **Step 5: Run the whole suite**

Run: `npx vitest run`
Expected: every suite green.

- [ ] **Step 6: Commit**

```bash
git add lib/personal-definition/profile.ts lib/personal-definition/__tests__/profile.test.ts
git commit -m "feat(personal-definition): profile builder with layer-separation guarantee"
```

---

## Content Tasks

Tasks 9–12 add no code. They fill the data files whose shapes Tasks 3–7 established, and each ends by tightening a test from "the field exists" to "the field is written". They are independent of each other and can run in parallel.

Shared authoring rules for all four:

- Vietnamese, second person, warm and casual — like a friend, not an HR report (`CLAUDE.md`).
- No English personality jargon in user-facing copy.
- Nothing deterministic-sounding: "bạn thường…", "nhiều người như bạn…", never "bạn là…" as a verdict.
- Nothing copied from `16personalities.com`, `tracuuthansohoc.com`, or any other site. Method yes, wording no.

---

### Task 9: Write the 40 MBTI items

**Files:**
- Modify: `lib/personal-definition/data/questions.json`
- Modify: `lib/personal-definition/__tests__/content.test.ts`

**Interfaces:**
- Consumes: the bank shape from Task 5
- Produces: the real 40-item bank. No signature changes — Task 6's scorer reads `bank.size` and keeps working.

- [ ] **Step 1: Write the pole definitions**

Before writing items, add a `pole_definitions` block to `questions.json`. Every item must be traceable to one of these; this is what keeps item-writing disciplined rather than improvised (spec §4.3).

```json
"pole_definitions": {
  "E": "Lấy lại năng lượng từ tương tác với người khác; nghĩ bằng cách nói ra.",
  "I": "Lấy lại năng lượng khi ở một mình; nghĩ xong rồi mới nói.",
  "S": "Tin vào thông tin cụ thể, quan sát được, đã kiểm chứng.",
  "N": "Chú ý tới mẫu hình, khả năng, ý nghĩa phía sau thông tin.",
  "T": "Ra quyết định dựa trên tính nhất quán và logic của vấn đề.",
  "F": "Ra quyết định dựa trên giá trị và tác động lên con người.",
  "J": "Thấy dễ chịu khi mọi thứ được quyết định và có kế hoạch.",
  "P": "Thấy dễ chịu khi giữ phương án mở và ứng biến."
}
```

- [ ] **Step 2: Write 40 items**

Ten per dimension, five at `key: 1` and five at `key: -1`. Replace the 8 fixture items entirely and set `"size": 40`.

Rules, enforced by review and by the tests below:
- One idea per item. `"Tôi thích gặp bạn bè và ghét ở nhà"` measures two things and must be split.
- Situations from Vietnamese student life: bài tập nhóm, thực tập, kỳ vọng gia đình, làm thêm, Tết, câu lạc bộ, thuyết trình.
- No item names a career, a major, or a personality type.
- No item is negated purely to flip its key — `key: -1` items must read naturally, not as `"Tôi KHÔNG thích…"`. Compare the two fixture EI items in Task 5: both read naturally, one points at E and one at I.
- Vary sentence openings; forty items all starting `"Tôi thường…"` are tiring to answer and invite straight-lining.

- [ ] **Step 3: Tighten the integrity test**

Add to `content.test.ts`:

```typescript
describe("question bank content", () => {
  it("is the full 40 items", () => {
    expect(bank.size).toBe(40);
    expect(bank.items).toHaveLength(40);
  });

  it("defines all eight poles", () => {
    for (const p of ["E", "I", "S", "N", "T", "F", "J", "P"]) {
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
```

- [ ] **Step 4: Run the full suite**

Run: `npx vitest run`
Expected: all green. Task 6's scorer tests now run against 40 items and should pass unchanged — if they do not, the scorer had a hidden dependency on the fixture size and that is a real bug.

- [ ] **Step 5: Commit**

```bash
git add lib/personal-definition/data/questions.json lib/personal-definition/__tests__/content.test.ts
git commit -m "content(personal-definition): 40 Vietnamese MBTI items with pole definitions"
```

---

### Task 10: Write the numerology interpretations

**Files:**
- Modify: `lib/personal-definition/data/numerology-interpretations.json`
- Modify: `lib/personal-definition/__tests__/content.test.ts`

**Interfaces:** no code changes.

- [ ] **Step 1: Write 48 passages**

Four kinds × twelve values (1–9, 11, 22, 33). Two to three sentences each.

Each kind answers a different question, and the copy must reflect that rather than repeating the same adjectives four times:
- `life_path` (Số Chủ Đạo) — hướng đi và bài học lớn
- `expression` (Số Sứ Mệnh) — khả năng bạn mang theo
- `soul_urge` (Số Linh Hồn) — điều bạn thực sự muốn bên trong
- `personality` (Số Nhân Cách) — cách người khác nhìn bạn lúc mới gặp

Exemplar to match:

```json
"life_path": {
  "8": "Bạn có bản năng với chuyện tổ chức và kết quả — nhìn ra cái gì tạo ra giá trị thật, cái gì chỉ ồn ào. Điều đáng để ý là bạn dễ đo giá trị bản thân bằng thành tựu, nên thỉnh thoảng hãy tự hỏi mình đang làm cho ai."
}
```

- [ ] **Step 2: Tighten the test**

```typescript
import interpretations from "../data/numerology-interpretations.json";

describe("numerology interpretations content", () => {
  const KINDS = ["life_path", "expression", "soul_urge", "personality"] as const;
  const VALUES = ["1","2","3","4","5","6","7","8","9","11","22","33"];

  it("covers every kind and value", () => {
    for (const k of KINDS) {
      for (const v of VALUES) {
        expect(interpretations[k][v]?.length, `${k}.${v}`).toBeGreaterThan(40);
      }
    }
  });

  it("does not reuse the same passage across kinds", () => {
    for (const v of VALUES) {
      const passages = KINDS.map((k) => interpretations[k][v]);
      expect(new Set(passages).size, `value ${v} reused across kinds`).toBe(4);
    }
  });
});
```

- [ ] **Step 3: Run**

Run: `npx vitest run content`
Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add lib/personal-definition/data/numerology-interpretations.json lib/personal-definition/__tests__/content.test.ts
git commit -m "content(personal-definition): 48 numerology interpretation passages"
```

---

### Task 11: Write the 16 MBTI type entries and narrative templates

**Files:**
- Modify: `lib/personal-definition/data/mbti-types.json`
- Modify: `lib/personal-definition/data/templates.json`
- Modify: `lib/personal-definition/__tests__/content.test.ts`

**Interfaces:** no code changes.

- [ ] **Step 1: Complete all 16 type entries**

Match the INFP exemplar from Task 7: a `label`, 4 traits, 5 strengths, 3 growth areas, 6 keywords, 6 career hints.

`career_hints` are the only field Step 2 consumes as signal, so keep them as **fields of work**, not job titles — "phân tích dữ liệu" rather than "Data Analyst tại ngân hàng". Step 2 does the matching; this is input to it.

Growth areas are written as tendencies with a handle, never as deficits: "Dễ trì hoãn việc mình không thấy ý nghĩa" not "Lười".

- [ ] **Step 2: Complete the narrative templates**

Sixteen `intro` strings using the placeholders `{name}`, `{label}`, `{trait_line}`, and twelve `flavor_life_path` strings. Keep flavor lines to one sentence — they are seasoning on a narrative, not a second reading.

- [ ] **Step 3: Tighten the test**

```typescript
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
});

describe("templates.json content", () => {
  it("fills every intro and uses the name placeholder", () => {
    for (const t of ALL_TYPES) {
      expect(templates.intro[t].length, `intro ${t}`).toBeGreaterThan(20);
      expect(templates.intro[t], `intro ${t}`).toContain("{name}");
    }
  });

  it("fills flavor text for every life path value", () => {
    for (const v of ["1","2","3","4","5","6","7","8","9","11","22","33"]) {
      expect(templates.flavor_life_path[v]?.length, `life path ${v}`).toBeGreaterThan(15);
    }
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
```

That last test catches the failure mode where someone writes `{university}` into a template and it silently renders as an empty string.

- [ ] **Step 4: Run the full suite**

Run: `npx vitest run`
Expected: all green. Task 8's "no unfilled placeholder" test now runs against real copy.

- [ ] **Step 5: Commit**

```bash
git add lib/personal-definition/data/mbti-types.json lib/personal-definition/data/templates.json lib/personal-definition/__tests__/content.test.ts
git commit -m "content(personal-definition): 16 MBTI type entries and narrative templates"
```

---

### Task 12: University list and zodiac trait copy

**Files:**
- Create: `lib/personal-definition/data/universities.json`
- Modify: `lib/personal-definition/data/zodiac-signs.json`
- Modify: `lib/personal-definition/__tests__/content.test.ts`

**Interfaces:** no code changes. `calculateZodiac` already returns whatever `traits` the data holds.

- [ ] **Step 1: Create the university list**

Vietnamese universities with a stable `id` and a display `name`. The `id` is what the profile stores, so it must not change once shipped.

```json
[
  { "id": "ueh",   "name": "Đại học Kinh tế TP.HCM" },
  { "id": "hcmut", "name": "Đại học Bách khoa TP.HCM" },
  { "id": "ftu",   "name": "Đại học Ngoại thương" },
  { "id": "neu",   "name": "Đại học Kinh tế Quốc dân" },
  { "id": "rmit",  "name": "Đại học RMIT Việt Nam" },
  { "id": "fpt",   "name": "Đại học FPT" },
  { "id": "other", "name": "Trường khác" }
]
```

Extend to roughly 50. `other` must exist and must sort last in the UI — a student whose school is missing should not be blocked at onboarding.

- [ ] **Step 2: Replace the zodiac trait placeholders**

Task 3 shipped three short traits per sign. Replace with 4 traits each in the same register as the MBTI copy — descriptive, not flattering, no fortune-telling.

- [ ] **Step 3: Tighten the test**

```typescript
import universities from "../data/universities.json";
import signs from "../data/zodiac-signs.json";

describe("universities.json", () => {
  it("has unique ids and non-empty names", () => {
    const ids = universities.map((u) => u.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const u of universities) {
      expect(u.name.trim().length, u.id).toBeGreaterThan(3);
    }
  });

  it("includes an 'other' escape hatch", () => {
    expect(universities.some((u) => u.id === "other")).toBe(true);
  });
});

describe("zodiac trait copy", () => {
  it("gives every sign four traits", () => {
    for (const s of signs) {
      expect(s.traits.length, s.sun_sign).toBe(4);
    }
  });

  it("does not reuse a trait list between signs", () => {
    const joined = signs.map((s) => s.traits.join("|"));
    expect(new Set(joined).size).toBe(12);
  });
});
```

- [ ] **Step 4: Run the full suite**

Run: `npx vitest run`
Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add lib/personal-definition/data/universities.json lib/personal-definition/data/zodiac-signs.json lib/personal-definition/__tests__/content.test.ts
git commit -m "content(personal-definition): university list and zodiac trait copy"
```

---

## Definition of Done

- [ ] `npx vitest run` green, no skipped tests
- [ ] `npx tsc --noEmit` clean
- [ ] `lib/personal-definition/` imports nothing outside itself except `vitest` in tests
- [ ] No file outside `lib/personal-definition/` modified (`CONTRIBUTING.md` cluster rule)
- [ ] `git log` shows local commits only — nothing pushed, no PR opened
- [ ] The birth-date-invariance test in `profile.test.ts` passes (spec §5)
- [ ] No `weighted_trait_map`, no `confidence` anywhere in the codebase

## What this plan does not cover

Spec §6, §7, §8 — the five screens, the state machine, and the result card. Blocked on access to the product repo, which is needed to know the real `components/worker/ui/` component names, whether `zustand` is a dependency, and the existing OG-image route pattern (spec §3, items 1–4). Once that repo is available, write `docs/superpowers/plans/<date>-personal-definition-ui.md` against the finished, tested `buildProfile` produced here.
