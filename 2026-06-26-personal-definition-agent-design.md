# Personal Definition Agent — Design Spec

**Date:** 2026-06-26
**Revised:** 2026-07-15 — removed referral/streaks/rewards; removed all LLM/Claude usage (fully deterministic flow)
**Status:** Draft
**Scope:** Buddy Agent Step 1 — Personal Definition

---

## 1. Overview

The Personal Definition Agent is Step 1 of the Buddy Agent system. It helps Vietnamese students (year 3-4 and fresh graduates) discover who they are through three personality frameworks, then uses that profile to drive career matching in Step 2.

It combines a serious personality framework (MBTI) with fun, engaging layers (Zodiac, Numerology). The fun layers make the experience approachable; MBTI is the career value that feeds Step 2.

Step 1 is a **fully deterministic app** — no LLM/Claude calls anywhere. Every result comes from fixed data tables, a fixed question bank, and rule-based scoring. "Agent" here is a product name, not an autonomous LLM agent.

### Goals

- Help users build a meaningful self-understanding profile
- Produce a weighted personality profile that feeds Step 2 (Career Path Matching)
- Give users a shareable result card they can post if they want

### Target Users

- Vietnamese university students (year 3-4) and fresh graduates
- Primary language: Vietnamese
- Comfortable with astrology culture and personality tests

---

## 2. Architecture

### Deterministic Flow Controller + Modular Calculators

A client-side **Flow Controller** (a guided wizard) drives Step 1 through fixed phases. It owns phase state, screen transitions, and collected input. All computation lives in four independent, pure modules it calls — no network dependency for the core flow, no LLM.

```
User <-> Flow Controller (wizard)
              |
              |-- ZodiacCalculator (pure fn)
              |-- NumerologyCalculator (pure fn)
              |-- MBTIScorer (pure fn)
              |-- ProfileBuilder (template composer)
```

**Why this architecture:**
- Fully deterministic → every module is unit-testable with fixed inputs/outputs, no mocking
- No API keys, no latency, no LLM cost; works offline except OG-image generation
- Modules have single responsibilities and can be reused/replaced independently
- Easy to add new fun layers later (e.g., Chinese zodiac) without touching the flow

---

## 3. User Flow

Five phases, driven by the Flow Controller. All on-screen copy is static template text (no generated dialogue).

### Phase 0 — Onboarding

- Structured form: name, university (dropdown), birthday (date picker), full name (as on birth certificate)
- Birthday unlocks Sun sign + Life Path Number
- No free-text parsing of dates/names

### Phase 1 — Zodiac Reveal

- Compute and present **Sun sign** from birth date
- Present element (Fire/Earth/Air/Water), modality (Cardinal/Fixed/Mutable), and traits — all derived from the Sun sign
- Optionally ask birth time as a **teaser only** — "Moon & Rising sẽ mở khoá ở bản sau" (not computed in Phase 1)
- **Shareable moment #1:** partial card with Sun sign

### Phase 2 — Numerology Reveal

- Life Path Number already computed from birthday
- Expression Number computed from full name
- Present both with template interpretations
- Static cross-reference line combining Sun sign + Life Path (from a lookup table, not generated)

### Phase 3 — MBTI Quiz

- **Fixed question bank** (see §4.3) — a set quiz, not an adaptive conversation
- Multiple-choice / forced-choice questions covering all 4 dimensions (E/I, S/N, T/F, J/P)
- Progress indicator; all questions must be answered before scoring
- On completion, MBTIScorer tallies answers into a 4-letter type

### Phase 4 — Profile Synthesis

- ProfileBuilder composes the "story of you" from templates keyed on the results
- Weighted profile: MBTI 80% (core strengths/growth/keywords) + Zodiac/Numerology 20% (flavor lines)
- **Shareable moment #2:** full profile card (university badge applied)
- Structured profile handed to Step 2 (in-session; no persistence in Phase 1)

---

## 4. Modules

All four are pure/deterministic. No LLM.

### 4.1 ZodiacCalculator

**Input:**
- birth_date (required): date

**Output:**
- sun_sign: computed from date ranges
- element: Fire / Earth / Air / Water
- modality: Cardinal / Fixed / Mutable
- traits: array of personality descriptors (from `data/zodiac/signs.json`)

Moon/Rising are **out of scope for Phase 1** (deferred). Birth time/location are not used.

### 4.2 NumerologyCalculator

**Input:**
- birth_date (required): date
- full_name (required): string (Vietnamese with diacritics)

**Output:**
- life_path_number: single digit 1-9 or master number 11/22/33
- expression_number: single digit 1-9 or master number 11/22/33
- interpretations: object with meaning for each number (from `data/numerology/interpretations.json`)

**Logic:**
- Life Path: sum all digits of birth date, reduce to single digit (preserve master numbers)
- Expression: map each letter to number using Pythagorean system
- Vietnamese diacritics: strip diacritics first (A=Á=À=1), handle D/Đ separately
- Mapping stored in `data/numerology/vietnamese-char-map.json`

### 4.3 MBTIScorer

**Input:**
- answers: array of selected-option ids, one per quiz question

**Question bank (`data/mbti/questions.json`):**
- Fixed set of ~20 forced-choice questions (≈5 per dimension)
- Each question maps its options to a pole (e.g., option A → E, option B → I) with a weight

**Output:**
- type: 4-letter string (e.g., "ENFJ")
- dimensions: percentage scores per dimension, e.g. `{ EI: { E: 72, I: 28 }, ... }` — raw margins are retained, so Step 2 can derive its own trust signal later if needed
- traits: descriptions per dimension (from `data/mbti/types.json`)

**Logic:**
- Tally weighted votes per dimension across all answers
- Dominant pole wins each dimension; percentage = pole votes / total votes for that dimension
- Deterministic tie-break rule (documented in code) when a dimension is exactly 50/50

### 4.4 ProfileBuilder

**Input:**
- zodiac_result, numerology_result, mbti_result
- user_name, university

**Output:**
- narrative_profile: Vietnamese text composed from templates
- weighted_trait_map: MBTI-weighted (80%) with zodiac/numerology flavor (20%)
- strengths: top 5 (from the MBTI type's data)
- growth_areas: top 3 (from the MBTI type's data)
- personality_keywords: 5-8 keywords
- career_hints: preliminary signals passed to Step 2
- shareable_card_data: structured data for card generation

**Logic:**
- Template-based composition (no generation). Narrative = fixed template fragments keyed by MBTI type + zodiac element + life path number, with placeholders (name, type name, etc.) filled in
- strengths/growth/keywords pulled from `data/mbti/types.json` (primary) and blended with flavor lines from zodiac/numerology data files
- Templates stored in `data/profiles/templates.json`

---

## 5. UX & Screens

Hybrid flow — structured input where accuracy matters, a quiz for MBTI, result screens for the payoff.

- **Onboarding screen** — form: name (text), university (dropdown from `data/universities.json`), birthday (date picker), full name (text). Client-side validation.
- **Zodiac result screen** — Sun sign reveal (element/modality/traits) + partial card. Optional birth-time teaser.
- **Numerology result screen** — Life Path + Expression numbers with interpretations.
- **Quiz screen** — the MBTI question bank, one question at a time (or paged), progress bar, back/next. Replaces any chat interface. No free-text.
- **Synthesis / result screen** — narrative profile + strengths/growth/keywords + full card with **Share** (Web Share API, copy fallback) and **Download** (PNG).

---

## 6. State Model

Single Zustand store, **in-session only** (no persistence in Phase 1 — anonymous):

```typescript
interface Step1State {
  phase: "onboarding" | "zodiac" | "numerology" | "quiz" | "synthesis";
  input: {
    name: string;
    university: string;
    birth_date: string;
    full_name: string;
    birth_time?: string; // captured as teaser only, unused in Phase 1
  };
  zodiacResult: ZodiacResult | null;
  numerologyResult: NumerologyResult | null;
  quizAnswers: string[];          // selected option ids, index-aligned to question bank
  mbtiResult: MBTIResult | null;
  profile: PersonalProfile | null;
}
```

**Phase state machine:** `onboarding → zodiac → numerology → quiz → synthesis`, strictly forward. Each transition guarded: a phase cannot start until the previous phase's required data exists (e.g., quiz cannot be scored until all answers present; synthesis requires zodiac + numerology + mbti results).

---

## 7. Shareable Profile Card

A single-purpose output: a visual card of the user's personality result. The card image is shown to the user, who can then tap **Share** or **Download** to save it. It is a static artifact — no referral code, no tracking, no social/friend mechanics.

### 7.1 Card

**Generated at two moments:**
1. After Phase 1 (Zodiac) — partial card with Sun sign
2. After Phase 4 (Synthesis) — full card with all results

**Card content:**
- User name
- University badge/branding (UEH, RMIT, FPT, HCMUT, etc.)
- Sun sign with element icon
- Life Path + Expression numbers
- MBTI type
- Short personality tagline

**Format:**
- OG-image style visual card, rendered as an image the user sees on screen
- University-themed color scheme/design
- Two actions on the card:
  - **Share** — Web Share API, with copy-link / copy-image fallback
  - **Download** — save the card image (PNG) to the device

### 7.2 Privacy

- Users choose what to display on their profile card
- Can hide MBTI, zodiac details, or specific results
- No raw personal data (birth time, full name) shown on cards — only derived results
- University affiliation is user-selected, not verified

---

## 8. Error Handling

No LLM/network calls in the core flow, so error surface is small and mostly input-side:

- **Form validation (onboarding):** name/full name non-empty; university selected; birth date is a valid calendar date and not in the future. Block progress with inline messages until valid.
- **Numerology edge case:** full name with no mappable letters (e.g., only symbols) → prompt user to re-enter a valid name.
- **Quiz completeness:** scoring guarded — cannot reach synthesis until every question is answered.
- **Card / OG image generation failure:** the only networked step; on failure, fall back to rendering the card as on-screen HTML and offer a retry. Core results remain fully available offline.

---

## 9. Testing

vitest, all deterministic — no mocking required:

- **ZodiacCalculator:** date → Sun sign, including sign-boundary dates; element/modality derivation.
- **NumerologyCalculator:** Life Path reduction, master-number preservation (11/22/33), Vietnamese diacritics stripping, D/Đ handling.
- **MBTIScorer:** answer arrays → expected type; percentage math; documented tie-break at exact 50/50.
- **ProfileBuilder:** template composition for each of the 16 types — assert no unfilled placeholders and correct data blending.
- **State machine:** legal phase transitions succeed; guarded transitions blocked until prerequisites exist.

---

## 10. Data Requirements

| Data | Source | Storage |
|---|---|---|
| Zodiac sign traits & descriptions | Content creation | `data/zodiac/signs.json` |
| Vietnamese character → number mapping | Pythagorean system adapted | `data/numerology/vietnamese-char-map.json` |
| Numerology interpretations (1-9, 11, 22, 33) | Content creation | `data/numerology/interpretations.json` |
| MBTI question bank (fixed quiz, dimension + weight per option) | Content creation | `data/mbti/questions.json` |
| MBTI type descriptions (16 types: traits, strengths, growth, keywords) | Content creation | `data/mbti/types.json` |
| Profile narrative templates | Content creation | `data/profiles/templates.json` |
| University list + branding | Manual curation | `data/universities.json` |

---

## 11. Tech Stack Alignment

- **Frontend:** Next.js 15 + React 19 + Tailwind CSS 4
- **State management:** Zustand (in-session store, no persistence in Phase 1)
- **Computation:** plain TypeScript modules (no external AI/LLM). **Remove `@anthropic-ai/sdk` from `package.json`** — not used in Step 1.
- **Card generation:** server-side OG image generation (Next.js API route), with on-screen HTML fallback
- **Sharing:** Web Share API + fallback copy-to-clipboard

---

## 12. Profile Data Schema (Step 2 Handoff)

The structured output passed to the Career Path Matching agent:

```typescript
interface PersonalProfile {
  user: {
    name: string;
    university: string;
    birth_date: string;
  };

  zodiac: {
    sun_sign: string;
    moon_sign: string | null;   // deferred in Phase 1
    rising_sign: string | null; // deferred in Phase 1
    element: "Fire" | "Earth" | "Air" | "Water";
    modality: "Cardinal" | "Fixed" | "Mutable";
    traits: string[];
  };

  numerology: {
    life_path_number: number;
    expression_number: number;
    interpretations: {
      life_path: string;
      expression: string;
    };
  };

  mbti: {
    type: string; // e.g., "ENFJ"
    dimensions: {
      EI: { E: number; I: number };
      SN: { S: number; N: number };
      TF: { T: number; F: number };
      JP: { J: number; P: number };
    };
    traits: string[];
  };

  synthesis: {
    narrative: string;
    strengths: string[];
    growth_areas: string[];
    personality_keywords: string[];
    career_hints: string[];
    weighted_trait_map: Record<string, number>;
  };
}
```

---

## 13. Out of Scope (for this spec)

- Conversational / LLM-based interaction (Phase 1 is fully deterministic)
- Moon & Rising sign computation (deferred to a later version)
- Step 2-4 agents (Career Matching, CV Prep, Job Search)
- User authentication / account system
- Database selection and schema (Phase 1 runs anonymous, no persistence)
- University verification
- Admin dashboard
- Analytics / tracking implementation
