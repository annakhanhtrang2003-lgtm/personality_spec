# Personal Definition — Design Spec

**Date:** 2026-07-19
**Status:** Draft
**Scope:** Worker subpage `personal-definition` (Buddy Agent Step 1)
**Supersedes:** `2026-06-26-personal-definition-agent-design.md` (root of this repo) and `spec_updated.txt` (2026-07-14)

---

## 1. Overview

Personal Definition is the first of four Buddy Agent steps. It helps Vietnamese students (year 3–4 and fresh graduates) build a picture of who they are, and produces a structured profile that Step 2 (Career Path Matching) consumes.

It combines one instrument with career relevance (MBTI-style typing) and two cultural layers with none (Zodiac, Numerology). This split is deliberate and is enforced in the architecture — see §5.

The subpage is **fully deterministic**: no LLM calls anywhere. Every result comes from fixed data tables and arithmetic. Identical input always produces identical output, so the whole thing is unit-testable without mocks.

### Goals

- Give students a self-understanding profile that feels worth their 5 minutes
- Emit a clean, structured profile for Step 2
- Produce a result card students may share if they want to

### Non-goals

Listed in §14.

---

## 2. Revision history

This spec replaces two earlier documents. The differences matter because both older files are still in circulation.

| | `spec_updated.txt` (07-14) | root spec (rev. 07-15) | **this spec (07-19)** |
|---|---|---|---|
| Interaction | LLM conversation | Fixed quiz | Fixed quiz |
| MBTI items | Open-ended, NLP-scored | ~20 forced-choice | **40 Likert** |
| MBTI scoring | Undefined | Vote tally | **Signed sum, defined in §4.3** |
| Referral / streaks | Yes | Removed | Removed |
| Moon / Rising | Yes (ephemeris) | Deferred | Deferred |
| Numerology numbers | 2 | 2 | **4** |
| 80/20 blend | Asserted, undefined | Asserted, undefined | **Replaced — see §5** |
| LLM SDK | `@anthropic-ai/sdk` | None | None |

Despite its filename, `spec_updated.txt` is dated 2026-07-14 and predates the 07-15 revision. It also skips sections 5 and 6 entirely (jumps §4 → §7), so it carries no UX or state model. It is superseded; do not build from it.

---

## 3. Repository constraints

This subpage lives in the team's worker repo and is bound by `CONTRIBUTING.md`:

- **Cluster ownership** — work stays inside `app/personal-definition/`, `app/api/personal-definition/`, and components specific to this subpage. Do not modify `lib/services/jobPostService.ts`, `applicationService.ts`, `Shell.tsx`, or `middleware.ts`.
- **Design system is mandatory** — use components in `components/worker/ui/`. Do not invent new styles. Reference `app/jobs/page.tsx` and `app/jobs/[id]/page.tsx` for usage. Layout uses `components/WorkerHeader.tsx` and `components/WorkerFooter.tsx`.
- **Phase 1: no database** — anonymous, no persistence, no new Prisma models or queries.
- **Branch naming** — `feature/personal-definition/<short-description>`.
- **Agent workflow** — dispatch into a git worktree; agent commits locally, does not push or open PRs.
- **Docs** — exactly one design spec and one plan (`docs/superpowers/plans/YYYY-MM-DD-personal-definition.md`). Do not split into four files.

> **⚠ NEEDS VERIFICATION.** This spec was written without access to the product repo. Before implementation, confirm:
> 1. What components exist in `components/worker/ui/` (this spec assumes a Card, Button, ProgressBar/Stepper, RadioGroup, and form Input; substitute real names).
> 2. Whether `zustand` is already a dependency. If not, use `useReducer` in the page-level client component rather than adding a dependency (see §7).
> 3. Where shared non-service logic conventionally lives — this spec assumes `lib/personal-definition/`.
> 4. Whether the OG-image route pattern used elsewhere in the repo differs from §8.

---

## 4. Modules

Four pure TypeScript modules, no I/O, no network, no LLM. Proposed location `lib/personal-definition/`.

### 4.1 ZodiacCalculator

**Input:** `birth_date: string` (ISO date)

**Output:**
```typescript
interface ZodiacResult {
  sun_sign: string;                                  // "Nhân Mã"
  element: "Fire" | "Earth" | "Air" | "Water";
  modality: "Cardinal" | "Fixed" | "Mutable";
  traits: string[];
}
```

Sun sign from fixed date ranges. Element and modality derived from the sign via lookup, not computed. Moon and Rising are out of scope (§14) — they need an ephemeris and birth time/location, which would add a large data dependency for a layer that carries no career signal.

**Edge case:** sign boundary dates vary by year by up to a day. Phase 1 uses fixed conventional boundaries and accepts the imprecision; this is documented in the data file rather than hidden in code.

### 4.2 NumerologyCalculator

**Input:** `birth_date: string`, `full_name: string` (Vietnamese, with diacritics)

**Output:**
```typescript
interface NumerologyResult {
  life_path: number;        // Số Chủ Đạo
  expression: number;       // Số Sứ Mệnh
  soul_urge: number;        // Số Linh Hồn
  personality: number;      // Số Nhân Cách
  interpretations: {
    life_path: string;
    expression: string;
    soul_urge: string;
    personality: string;
  };
}
```

All four are 1–9 or master numbers 11 / 22 / 33.

**Normalization (applied before any letter mapping):**
1. Uppercase.
2. Strip diacritics: `á à ả ã ạ ă â` → `A`; `é è ẻ ẽ ẹ ê` → `E`; `í ì ỉ ĩ ị` → `I`; `ó ò ỏ õ ọ ô ơ` → `O`; `ú ù ủ ũ ụ ư` → `U`; `ý ỳ ỷ ỹ ỵ` → `Y`.
3. `Đ` → `D`.
4. Drop everything that is not A–Z (spaces, punctuation, digits).

Stored in `lib/personal-definition/data/vietnamese-char-map.json` so the mapping is data, not code.

**Pythagorean letter values:**

| 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
|---|---|---|---|---|---|---|---|---|
| A J S | B K T | C L U | D M V | E N W | F O X | G P Y | H Q Z | I R |

**Vowels** are `A E I O U Y`. Y is treated as a vowel unconditionally — in Vietnamese it functions as one (`Lý`, `Thúy`), and a context-dependent rule would be non-deterministic. This is a documented convention, not a discovered fact.

**Reduction rule** — used by all four numbers: sum digits repeatedly until the result is a single digit, **except** stop and return 11, 22, or 33 if reached at any step.

**Calculations:**
- **Life Path** — reduce day, month, and year separately, then sum and reduce.
- **Expression** — sum values of all letters, reduce.
- **Soul Urge** — sum values of vowels only, reduce.
- **Personality** — sum values of consonants only, reduce.

**Interpretation text is written by us.** The method above is traditional public-domain arithmetic and is free to implement, but the Vietnamese interpretation copy on sites such as `tracuuthansohoc.com` is authored, copyrighted work. Do not copy it.

### 4.3 MBTIScorer

The core revision in this spec.

**Question bank** — `lib/personal-definition/data/questions.json`, 40 items, 10 per dimension:

```json
{
  "defaults": { "EI": "I", "SN": "N", "TF": "F", "JP": "P" },
  "items": [
    { "id": "ei_07", "dimension": "EI", "key": -1,
      "text": "Sau một buổi họp nhóm đông người, tôi thấy cạn năng lượng." }
  ]
}
```

- `dimension` — one of `EI`, `SN`, `TF`, `JP`.
- `key` — `+1` if agreement points toward the **first** letter of the dimension name (E, S, T, J); `-1` if toward the second (I, N, F, P).
- **Keying is balanced**: exactly 5 items with `key: +1` and 5 with `key: -1` per dimension. This matters because we authored the items ourselves — without balance, students who habitually agree with statements drift toward ESTJ regardless of who they are. A unit test asserts the balance.

**Item authoring rules:**
- Each item is anchored to a written definition of the pole it measures, kept alongside the bank. Item writing is disciplined, not improvised.
- Situations are drawn from Vietnamese student life — group projects, family expectations, internships, Tết, part-time work.
- One idea per item. No double-barrelled statements ("Tôi thích gặp bạn bè và ghét ở nhà" measures two things and scores as one).
- No item mentions a career, a major, or a personality type.

**Input:** `responses: number[]` — length 40, index-aligned to the bank, each `r ∈ {-2, -1, 0, +1, +2}` (Rất sai → Rất đúng).

**Scoring:**
```
contribution(item) = r × key
S(dimension)       = Σ contribution over that dimension's 10 items    // -20 … +20
letter             = S > 0 ? firstPole : S < 0 ? secondPole : defaults[dimension]
percent(firstPole) = (S + 20) / 40 × 100
```

**Output:**
```typescript
interface MBTIResult {
  type: string;                                  // "ENFJ"
  dimensions: {
    EI: { raw: number; E: number; I: number };   // raw = S, -20…20; E,I = percentages
    SN: { raw: number; S: number; N: number };
    TF: { raw: number; T: number; F: number };
    JP: { raw: number; J: number; P: number };
  };
  traits: string[];                              // from types.json
}
```

**On `S = 0`.** With 40 items and a neutral option this is genuinely reachable (all-neutral responses, or balanced disagreement), so it needs a real rule rather than an afterthought. Each dimension declares a default pole in the data file. The defaults are I, N, F, P — the less socially-desirable pole of each pair — so that any residual acquiescence does not quietly push the population toward ESTJ.

**No `confidence` field.** Callers get `raw` instead. A student with `TF.raw = -3` and one with `TF.raw = -18` are both "F", and Step 2 can see the difference and decide what to do with it. Shipping a three-bucket `confidence` string would mean inventing thresholds we cannot justify.

### 4.4 ProfileBuilder

**Input:** `ZodiacResult`, `NumerologyResult`, `MBTIResult`, `name`, `university`

**Output:** `PersonalProfile` (§13).

Template composition only — no generation. Templates in `lib/personal-definition/data/templates.json`, placeholders filled from results. See §5 for what each layer is allowed to contribute.

---

## 5. Layer separation (replaces the "80/20 blend")

Earlier specs asserted "MBTI 80% + Zodiac/Numerology 20%" and emitted `weighted_trait_map: Record<string, number>`, but never defined the arithmetic. That is because the arithmetic does not exist as described: MBTI yields four signed scores, zodiac yields categories (Fire, Cardinal), and numerology yields labels where 7 is not larger than 3. There is no shared scale to take a weighted average over.

Constructing one was considered and rejected. `weighted_trait_map` feeds Step 2's career matching. Letting astrology and numerology carry 20% of that weight means **two students who answer the quiz identically get different career suggestions because they were born in different months.** Zodiac and numerology have no predictive validity for occupational fit; giving them influence there injects noise into the one output that needs to be defensible.

So the layers are separated by role instead of blended by weight:

| Output | Source | Zodiac / Numerology influence |
|---|---|---|
| `career_hints` | MBTI type only | **none** |
| `strengths` | MBTI type only | **none** |
| `growth_areas` | MBTI type only | **none** |
| `personality_keywords` | MBTI type only | **none** |
| `narrative` | MBTI, plus flavor sentences | flavor sentences only |
| Result card | all three | displayed |

`weighted_trait_map` is **removed from the schema.**

The fun layers keep doing what they are good at — making the product feel personal, giving students something to post — while the career signal stays clean. "80/20" survives as a description of screen presence, not as a multiplication.

---

## 6. User flow and screens

Five phases, strictly forward. All copy is static Vietnamese template text.

| Phase | Screen | Content |
|---|---|---|
| 0 | Onboarding | Form: display name, university (dropdown), birth date (date picker), full name as on birth certificate. Client-side validation. |
| 1 | Zodiac reveal | Sun sign, element, modality, traits. Optional birth-time field labelled as a teaser only — "Moon & Rising sẽ mở khoá ở bản sau". Value is captured but unused. |
| 2 | Numerology reveal | Four numbers with interpretations. One static cross-reference line combining sun sign + life path, from a lookup table. |
| 3 | Quiz | 40 Likert items, one screen at a time, 5 radio options per item. Progress indicator. Back/next. No free text. |
| 4 | Synthesis | Narrative, strengths, growth areas, keywords, result card with Share and Download. |

**Quiz interaction:** one item per screen keeps each decision unambiguous on a phone and makes progress legible. Selecting an option advances automatically after a short delay; Back re-opens the previous item with its answer intact. Every item must be answered before scoring — there is no skip, because a skipped item and a neutral answer are different things and only one of them is expressible in the scale.

Expected completion: about 3–4 minutes for the quiz, 5–6 minutes end to end.

**Design system:** all screens compose `components/worker/ui/` primitives. No new CSS. If a needed primitive does not exist, raise it with the Shared UI / Infra owner rather than adding a local style — per `CONTRIBUTING.md` §3, that file set is shared and changes are coordinated.

---

## 7. State

Phase 1 is anonymous with no persistence, so state lives in memory for the session only and is lost on refresh. This is a known and accepted consequence of the no-DB constraint.

```typescript
type Phase = "onboarding" | "zodiac" | "numerology" | "quiz" | "synthesis";

interface Step1State {
  phase: Phase;
  input: {
    name: string;
    university: string;
    birth_date: string;
    full_name: string;
    birth_time?: string;      // teaser only, unused in Phase 1
  };
  responses: (number | null)[];   // length 40, null = unanswered
  zodiac: ZodiacResult | null;
  numerology: NumerologyResult | null;
  mbti: MBTIResult | null;
  profile: PersonalProfile | null;
}
```

**Transitions** are strictly forward and guarded: a phase cannot begin until the previous phase's required data exists. Synthesis additionally requires all 40 responses to be non-null.

**Implementation:** `useReducer` in the page-level client component, passed down by props or context. This avoids adding a state library to a repo that may not have one. If `zustand` is already a dependency (⚠ verify, §3), a store is equally acceptable — the reducer shape above maps onto it directly.

---

## 8. Result card

A static visual card of the student's result. No referral code, no tracking, no social graph — those were removed on 2026-07-15 to fit the no-DB constraint and are not reintroduced here.

**Generated at two points:** after Phase 1 (partial — sun sign only) and after Phase 4 (full).

**Content:** display name, university name, sun sign with element, the four numerology numbers, MBTI type, one-line tagline.

**Rendering:** server-side OG image via a route under `app/api/personal-definition/`, with an on-screen HTML rendering as fallback. This is the only networked call in the subpage; if it fails the student still has every result on screen.

**Actions:** Share (Web Share API, clipboard fallback) and Download (PNG).

**On university branding:** earlier specs called for per-university color schemes. That conflicts with the design-system rule in `CONTRIBUTING.md` §7. The card therefore uses design-system tokens and shows the university as a name/label, not as bespoke per-school theming. ⚠ If the repo already has university branding assets, revisit this.

**Privacy:** the card shows derived results only. Full name and birth time never appear — they are inputs to arithmetic, not content. University affiliation is self-selected and unverified, and the card should not imply otherwise.

---

## 9. Error handling

The surface is small because the core flow is offline arithmetic.

- **Onboarding validation** — name and full name non-empty; university selected; birth date a real calendar date, not in the future, and within a plausible range. Inline messages, progress blocked until valid.
- **Unmappable name** — if normalization (§4.2) leaves zero A–Z characters, prompt for re-entry rather than computing numbers from nothing.
- **Quiz completeness** — scoring is guarded on all 40 responses being non-null.
- **Card generation failure** — fall back to HTML card, offer retry, never block the results.

---

## 10. Testing

vitest. Everything is deterministic, so no mocking.

**ZodiacCalculator** — each sign; both sides of all twelve boundary dates; element and modality derivation.

**NumerologyCalculator** — reduction including master numbers at each step; all four numbers on hand-worked Vietnamese names; diacritic stripping across every vowel family; `Đ` → `D`; Y counted as a vowel in both soul-urge and personality; unmappable-name rejection.

**MBTIScorer**
- Bank integrity: exactly 40 items, exactly 10 per dimension, exactly 5 of each `key` per dimension, unique ids, every dimension present in `defaults`.
- All `+2` on `key: +1` items and all `-2` on `key: -1` items → `S = +20` → 100%.
- All-neutral responses → `S = 0` on every dimension → type equals the declared defaults (INFP).
- Percentage math at `S = -20, -3, 0, +12, +20`.
- A single item flip changes `S` by exactly `2 × |r|`, not more.

**ProfileBuilder** — compose for all 16 types; assert no unfilled placeholders remain; assert `career_hints`, `strengths`, `growth_areas`, and `personality_keywords` are byte-identical for two profiles differing only in birth date (this is the regression test for §5).

**State machine** — legal transitions succeed; guarded transitions blocked until prerequisites exist.

---

## 11. Data files

Proposed under `lib/personal-definition/data/` to stay within cluster ownership (⚠ verify §3).

| File | Contents | Volume |
|---|---|---|
| `zodiac-signs.json` | 12 signs: element, modality, traits, boundary dates | 12 entries |
| `vietnamese-char-map.json` | Diacritic normalization + Pythagorean values | ~90 mappings |
| `numerology-interpretations.json` | 4 number types × 12 values (1–9, 11, 22, 33) | ~48 passages, **written by us** |
| `questions.json` | 40 items + pole definitions + defaults | 40 items, **written by us** |
| `mbti-types.json` | 16 types: traits, strengths, growth areas, keywords, career hints | 16 entries |
| `templates.json` | Narrative fragments keyed by type, element, life path | ~40 fragments |
| `universities.json` | University list | ~50 entries |

Content authoring is the critical path — roughly 150 passages of Vietnamese copy. The plan should sequence it as its own tasks, not treat it as incidental to the code.

---

## 12. Tech

- **Framework** — Next.js App Router, React, Tailwind, as the host repo already uses.
- **UI** — `components/worker/ui/` only.
- **Logic** — plain TypeScript, no dependencies.
- **State** — `useReducer` (see §7).
- **Card** — server-side OG image route + HTML fallback.
- **Sharing** — Web Share API + clipboard fallback.
- **No LLM.** `@anthropic-ai/sdk` is not used by this subpage.

---

## 13. Step 2 handoff schema

```typescript
interface PersonalProfile {
  user: {
    name: string;
    university: string;
    birth_date: string;
  };

  zodiac: {
    sun_sign: string;
    moon_sign: null;              // deferred
    rising_sign: null;            // deferred
    element: "Fire" | "Earth" | "Air" | "Water";
    modality: "Cardinal" | "Fixed" | "Mutable";
    traits: string[];
  };

  numerology: {
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
  };

  mbti: {
    type: string;
    dimensions: {
      EI: { raw: number; E: number; I: number };
      SN: { raw: number; S: number; N: number };
      TF: { raw: number; T: number; F: number };
      JP: { raw: number; J: number; P: number };
    };
    traits: string[];
  };

  synthesis: {
    narrative: string;            // MBTI + zodiac/numerology flavor
    strengths: string[];          // MBTI only
    growth_areas: string[];       // MBTI only
    personality_keywords: string[]; // MBTI only
    career_hints: string[];       // MBTI only
  };
}
```

`weighted_trait_map` and `confidence` are intentionally absent — see §5 and §4.3.

---

## 14. Out of scope

- LLM or conversational interaction
- Moon and Rising signs (needs ephemeris + birth time/location)
- Numerology beyond the four core numbers — Maturity and Personal Year were considered and cut; "character after age 40–50" has little to say to a year-3 student
- Referral loop, comparison game, streaks, rewards
- Steps 2–4
- Auth, database, persistence
- University verification
- Analytics

---

## 15. Known limitations

Recorded so they are decided rather than discovered.

1. **The instrument is unvalidated.** We authored the 40 items ourselves; there is no reliability or validity evidence behind them. Balanced keying and pole-anchored authoring make it disciplined, not validated. Do not present results as clinical or diagnostic — the copy should stay in the register of "một góc nhìn về bạn", not "đây là con người bạn". Once there is real response data, item-level review should follow.

2. **MBTI itself is contested.** Test–retest reliability is modest and the dichotomies are widely criticized as forcing continuous traits into binaries. The `raw` scores partly mitigate this by preserving how close each call was; Step 2 should lean on near-zero raws lightly.

3. **Sign boundaries are approximate** (§4.1).

4. **Refresh loses everything** — a direct consequence of Phase 1 having no database. Students who navigate away mid-quiz start over.
