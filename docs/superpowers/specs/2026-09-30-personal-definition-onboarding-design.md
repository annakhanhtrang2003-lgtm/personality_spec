# Personal Definition — Onboarding Revamp (Design)

**Date:** 2026-09-30
**Branch:** `feature/personal-definition/ui`
**Builds on:** `2026-09-18-personal-definition-quiz-revamp-design.md` (quiz accordion, Likert dots, 50% teaser — all unchanged here except where §5 says otherwise).
**Visual source:** `D:\download\MVP_MBTI\final UI onboarding.html` (v2). Approved Section 1 mockup: `docs/superpowers/specs/2026-09-30-personal-definition-onboarding-mockup.html`.

## 1. Why

The test currently opens straight on a form. There is no moment that tells a student why they should spend ten minutes on 40 questions, and no preview of what the questions cover. The prototype adds that moment: an emotional hero, then a swipeable preview of the four parts, then the form.

Scope is the entry into the test plus the visual continuity into the quiz. The interlude, synthesis, share card, Likert scale, item rows and all scoring/profile logic are **unchanged**.

## 2. Shape of the change

| # | Change | Touches |
|---|---|---|
| 1 | Route becomes headerless — "just the personality test" | `layout.tsx` |
| 2 | New `intro` phase: hero + 4-card quiz preview, one scroll | `state.ts`, `page.tsx`, `_components/onboarding/` |
| 3 | Form restyled to match the intro, with a back link | `OnboardingForm.tsx` |
| 4 | Questions regrouped so part N = dimension N | `data/questions.json`, `parts.ts` |
| 5 | Each quiz part wears its dimension's colour + mascot | `_lib/partTheme.ts`, `QuizPart.tsx` |

## 3. Layout — no header, no footer

`layout.tsx` drops `WorkerHeader`, `WorkerFooter` and the `pt-[60px]` offset. It keeps `font-momo-trust` and `<main className="bg-worker-bg min-h-screen">`.

Applies to the whole route (intro through synthesis), not only the intro — hiding it on the intro alone would make the header pop in on the form.

**Known deviation (PR note):** sibling CareerPath keeps the header; this subpage now has no link back to the job board.

## 4. Flow and state

```
intro ──"Làm bài test ngay"──▶ onboarding ──"Bắt đầu" (valid)──▶ quiz …
  ▲                               │
  └──────── "← Quay lại" ─────────┘
```

- `Phase` gains `"intro"`; `initialState.phase` becomes `"intro"`.
- New action `START_FORM`: `intro → onboarding`. No-op from any other phase.
- Existing `BACK` gains one case: `onboarding → intro`. `input` is untouched, so a student who goes back and returns finds their fields filled.
- The hero CTA "Bắt đầu hành trình của bạn" is an in-page scroll to the preview, **not** a phase change.
- `START_QUIZ`, validation, and every quiz/interlude/synthesis transition are unchanged.
- The existing scroll-reset effect (keyed on `phase`, `part`) already covers `intro ↔ onboarding`.

`page.tsx` renders `intro` and `onboarding` **outside** the `px-5 py-6 max-w-[600px]` container so their gradient reaches the screen edges; each constrains its own content width internally. Quiz, interlude and synthesis stay inside the container as today.

## 5. Screens

### 5.1 Intro (`_components/onboarding/Hero.tsx`, `QuizPreview.tsx`)

As the approved mockup. Summary:

- **Hero** — minimum height `100svh` (`min-h`, so short screens scroll rather than clip). Static v2 background `linear-gradient(180deg, #ffe4e6, #fdf2f8 50%, #ede9fe)`. Floating `hero` mascot. No time-of-day greeting, no typing effect.
  - Headline: "Giữa thế giới ai cũng đang rực rỡ… *Bạn có đang lạc lối?*" — second sentence in the `#ec4899 → #8b5cf6` gradient text.
  - Subtext: "Cảm giác chênh vênh chỉ là trạm dừng chân đầu tiên. Hãy để sự thấu hiểu bản thân dẫn lối cho bạn bước tiếp."
  - CTA: "Bắt đầu hành trình của bạn ↓" — dark pill `#0f172a` (as in the approved mockup v4), scrolls to the preview. The pink → rose pill is used by "Làm bài test ngay" and the form's "Bắt đầu".
- **Quiz preview** — horizontally swipeable track of 4 cards (one per part, colours from `partTheme`, §5.3), dot indicators, CTA "Làm bài test ngay" → `START_FORM`.
- Animations (fade-up, float, float-shadow) live in one local `onboarding.module.css`, all disabled under `prefers-reduced-motion`.

### 5.2 Form (`OnboardingForm.tsx`)

Frame changes only; fields and logic are untouched.

- Full-bleed v2 gradient background (same as hero).
- "← Quay lại" link, top-left above the card, tap target ≥ 44px → `BACK`.
- White card: radius 24px, shadow `0 6px 14px rgba(148,163,184,.18)`, `hero` mascot ~72px at top.
- Heading "Khám phá bản thân" in `#1e293b`, with "bản thân" in the pink → violet gradient. Subtext unchanged, colour `#475569`.
- **Fields stay `components/worker/ui/`** (`TextInput` ×2, `Select` ×4), with their existing error rendering, date-select logic (`emit`/`toIso`) and validation.
- Submit: prototype pink → rose gradient pill, full width, `type="submit"`, label "Bắt đầu". Replaces worker `Button` here only.

### 5.3 Quiz part header (`QuizPart.tsx`, `_lib/partTheme.ts`)

`partTheme.ts` exports one entry per part — the single source for both the preview cards and the quiz header:

| Part | Letters | Mascot | bg | ring | badge / badge ink | chip |
|---|---|---|---|---|---|---|
| 0 | E · I | `ei` | `#fdf2f8` | `#fbcfe8` | `#ec4899` / `#fff` | `#db2777` |
| 1 | S · N | `sn` | `#f5f3ff` | `#ddd6fe` | `#8b5cf6` / `#fff` | `#7c3aed` |
| 2 | T · F | `tf` | `#f0f9ff` | `#bae6fd` | `#0284c7` / `#fff` | `#0369a1` |
| 3 | J · P | `jp` | `#fffbeb` | `#fde68a` | `#f59e0b` / `#451a03` | `#b45309` |

Amber uses the dark badge ink from the prototype; white on `#f59e0b` fails contrast.

In `QuizPart`, only the header block changes: tinted card (`bg` + `ring`), letter-pair badge, `PART_TITLES[part]` in `chip` colour, and the part's dimension mascot in place of the MoMo face.

**Mascot behaviour changes:** the dimension mascots are single images with no expressions, so `faceForProgress` is removed. The mascot is static per part and keeps the existing `pulseOnChange` bounce keyed on the answered count. The 13 MoMo faces remain in use by the interlude and synthesis.

Progress dots, progress bar, count, item rows, Likert scale and the part buttons are unchanged.

## 6. Question regrouping

`questions.json` is reordered so indices 0–9 are EI, 10–19 SN, 20–29 TF, 30–39 JP. Within each dimension the **current relative order is kept** (stable filter), which keeps poles interleaved as today (e.g. EI strictly alternates `ei_01+, ei_06−, ei_02+, …`; TF is interleaved but not strictly, after the 09-18 `tf_03`/`tf_09` key swap). No reshuffling to force strict alternation.

- This overrides the 09-18 plan's never-reorder rule. The reason: the preview cards now promise "Phần 1 · E/I", and that must be true.
- `PART_TITLES` already match dimension order (EI "Bạn giữa mọi người", SN "Cách bạn tiếp nhận", TF "Cách bạn quyết định", JP "Cách bạn sắp xếp"). Only the `parts.ts` doc comment that says items are *not* grouped is rewritten.
- Scores are unaffected: responses are indexed against the same file, and each item still carries its own `dimension` and `key`.
- The 50% teaser still follows part 2 and still shows MBTI **locked**. After EI + SN we could score two letters; we deliberately do not (09-18 rule: no partial type that can contradict the final one).
- No existing test pins the old order.

## 7. Style exception

`CONTRIBUTING.md` requires `components/worker/ui/` and no new styles. This spec takes a **scoped** exception, recorded for the PR:

- Allowed: the intro (`_components/onboarding/`), the `OnboardingForm` frame, and the `QuizPart` header block may use the prototype palette as Tailwind arbitrary values; per-part colours come from `partTheme` via inline `style` (runtime values cannot be Tailwind classes); one CSS module `onboarding.module.css` holds keyframes and the classes that apply them.
- Not allowed anywhere: new global CSS, new fonts (keep `font-momo-trust`; prototype's Be Vietnam Pro is dropped), restyled form inputs, changes to shared components.

## 8. Files

All under `app/personal-definition/` (cluster ownership rule — nothing in `components/`, `public/`, or `app/page.tsx`).

| File | Status |
|---|---|
| `layout.tsx` | modified — §3 |
| `page.tsx` | modified — render `intro`; intro/form outside container |
| `_lib/state.ts` | modified — `intro` phase, `START_FORM`, `BACK` case |
| `_lib/data/questions.json` | modified — regrouped |
| `_lib/parts.ts` | modified — comment only |
| `_lib/partTheme.ts` | **new** |
| `_components/onboarding/Hero.tsx` | **new** |
| `_components/onboarding/QuizPreview.tsx` | **new** |
| `_components/onboarding/onboarding.module.css` | **new** — keyframes only |
| `_assets/onboarding/{hero,ei,sn,tf,jp}.webp` | **new** — extracted from the prototype's base64 in that order |
| `_components/OnboardingForm.tsx` | modified — §5.2 |
| `_components/QuizPart.tsx` | modified — §5.3 |

## 9. Tests

New:
1. Reducer: initial phase is `intro`; `START_FORM` → `onboarding`; `BACK` from `onboarding` → `intro` with `input` preserved; `START_FORM` is a no-op outside `intro`.
2. Bank: every item in part N has dimension N (order EI, SN, TF, JP); each part has 5 items per pole.
3. `partTheme` has exactly `PART_COUNT` entries.
4. Intro: "Làm bài test ngay" shows the form.
5. Form: "← Quay lại" returns to the intro.
6. `QuizPart`: renders the correct letter pair per part.

Updated: the full-flow page test gains the intro step before the form.

All existing tests (252) must stay green; `tsc --noEmit` clean apart from the 3 pre-existing `tests/api/` errors.

## 10. Out of scope

- Interlude and synthesis visuals, `ShareCard`.
- Time-of-day greeting and typing effect (prototype drafts).
- Restyling form inputs.
- Any scoring, item-text or profile change.
- Share-to-image / OG route.
