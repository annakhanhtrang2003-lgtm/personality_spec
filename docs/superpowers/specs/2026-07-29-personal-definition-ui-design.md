# Personal Definition — UI Design Spec (vertical slice)

## 1. Context

The Personal Definition logic layer is finished and fully tested in a separate
spec repo (`personality_spec`): four deterministic modules — `ZodiacCalculator`,
`NumerologyCalculator`, `MBTIScorer`, `ProfileBuilder` — plus `normalize`/`date`
helpers and all Vietnamese content (40 MBTI items, 48 numerology passages, 16
type entries, 70 universities, zodiac traits). 115 tests green, `tsc --noEmit`
clean, no runtime dependencies, no LLM. The single entry point is
`buildProfile(input): PersonalProfile`.

This spec covers **the UI that wraps that logic** inside the product repo
(`merchant-job-board`), as the worker subpage `personal-definition`
(cluster `@member-G`). The logic modules move into the repo unchanged; this
document is only about the screens, the state, and how they call `buildProfile`.

It supersedes §6/§7/§8 of the logic spec on the points where the real repo
differs from what that spec assumed (see §7 below).

## 2. Scope — first increment (vertical slice)

Three screens, forward-only, one page-level client component:

| Phase | Screen | Content |
|---|---|---|
| `onboarding` | Form | display name, full name (as on birth certificate), university (Select), birth date (DatePicker). Client-side validation. |
| `quiz` | 40 Likert items | one item per screen, 5-point scale, ProgressBar, Back/Next. No skip. |
| `synthesis` | Result | narrative, MBTI type + strengths/growth/keywords/career hints, **and** the zodiac + numerology results shown inline as flavor sections. |

**Deferred to a later increment (explicitly out of this plan):**
- Separate zodiac reveal and numerology reveal screens (logic-spec §6 phases 1–2).
  Their data still appears — folded into the synthesis screen — so nothing is lost.
- The shareable result card, Web Share, PNG download, and any OG-image route.
  No OG-image pattern exists in the repo and Next 16 changes the API surface;
  this earns its own increment rather than riding along here.
- Birth-time teaser field (Moon/Rising). Unused in Phase 1 anyway.

## 3. Architecture

**Everything runs client-side. No API route.** `buildProfile` is pure,
synchronous, and deterministic, so the whole flow computes in the browser. This
is the key difference from the CareerPath sibling, which needs
`/api/careerpath/analyze` only because it calls an LLM. Personal Definition adds
**no** `app/api/personal-definition/` route in this increment.

**File layout** — co-located under the route, matching the CareerPath template:

```
app/personal-definition/
├── layout.tsx                 # WorkerHeader/Footer shell, font-momo-trust
├── page.tsx                   # 'use client', useReducer state machine, phase router
├── _components/
│   ├── OnboardingForm.tsx
│   ├── QuizItem.tsx           # one Likert item + progress + Back/Next
│   └── SynthesisView.tsx      # narrative + MBTI + zodiac/numerology sections
└── _lib/                      # the tested logic, copied in unchanged
    ├── types.ts  date.ts  normalize.ts
    ├── zodiac.ts  numerology.ts  mbti.ts  profile.ts
    ├── data/*.json            # 6 data files
    └── __tests__/*.test.ts    # the 115 tests, moved with the code
```

The logic lives in `app/personal-definition/_lib/`, **not** shared `lib/`. The
cluster owns `app/personal-definition/`; `lib/` is Shared-UI/Infra territory
(`CONTRIBUTING.md` §2). Import paths inside `_lib` are already relative and need
no change; the move is a straight directory copy plus updating the test runner
glob if necessary.

**UI composes `components/worker/ui/` only.** No new CSS, no new design tokens
(`CONTRIBUTING.md` §7). MoMo tokens used: `text-worker-primary`,
`text-worker-text-secondary`, `bg-worker-bg`, `border-worker-border`,
`worker-danger`, `rounded-worker-pill`.

## 4. State

`useReducer` in `page.tsx` (no `zustand` in the repo — confirmed). Shape:

```typescript
type Phase = "onboarding" | "quiz" | "synthesis";

interface State {
  phase: Phase;
  input: { name: string; full_name: string; university: string; birth_date: string };
  responses: (Response | null)[];   // length 40, null = unanswered
  current: number;                  // quiz item index 0..39
  profile: PersonalProfile | null;
}
```

Transitions are forward-only and guarded:
- `onboarding → quiz` requires all four inputs valid (see §6).
- `quiz → synthesis` requires all 40 responses non-null; the reducer calls
  `buildProfile` at this transition and stores the result.
- Within `quiz`, `current` moves back and forth; each answer is retained.

State is in-memory only and lost on refresh — Phase 1 is anonymous, no DB
(`CONTRIBUTING.md` §7). Accepted.

## 5. Screen → component mapping (verified against the repo)

**Onboarding** — `TextInput{value,onChange}` for name and full name;
`Select{value,onChange,options:{value,label}[]}` for university (options mapped
from `universities.json`: `id → value`, `name → label`); `DatePicker{value:Date|null,
onChange:(Date)=>void}` for birth date. `DatePicker` yields a `Date`; convert to
`YYYY-MM-DD` before storing (the logic expects that string). Errors via
`Callout{variant:"error",message}`, submit via `Button`.

**Quiz** — each item renders its statement plus five options on a 5-point scale
(Rất sai · Sai · Bình thường · Đúng · Rất đúng) mapped to Response `-2..+2`.
Options render as `Choicebox{selected,onClick}` (tappable cards, one idea each —
better on a phone than a radio row). `ProgressBar{value}` shows
`(answeredCount/40)*100`. `Button` (variant `secondary`) for Back, primary for
Next; Next disabled until the current item is answered. Selecting advances
automatically after a short delay, matching the logic-spec §6 interaction.

**Synthesis** — `buildProfile` output rendered as sections: intro narrative
(already includes the fixed caveat line), MBTI type + label, strengths /
growth_areas / personality_keywords / career_hints as lists (`Chips` for
keywords), then zodiac (sun sign, element, traits) and numerology (four numbers
with interpretations) as flavor sections. The closing caveat is always present
because `buildProfile` appends it.

## 6. Validation and errors

- Name and full name non-empty after trim.
- University selected (not the empty placeholder).
- Birth date is a real calendar date, not in the future, within a plausible
  range (e.g. age 15–60). `date.ts` already rejects impossible dates.
- **Unmappable name:** if `normalizeVietnamese(full_name)` is empty,
  `calculateNumerology` throws. Onboarding must pre-check and show an inline
  message asking for a name with letters, rather than letting the throw surface.
- Quiz scoring is guarded on all 40 responses being non-null (the reducer will
  not transition otherwise).

There is no network call in this increment, so there is no network error surface.

## 7. What changed from the logic spec (§6/§7/§8)

Recorded so the divergence is deliberate, not drift:

1. **Logic location** — logic-spec §11 proposed `lib/personal-definition/`.
   Moved to `app/personal-definition/_lib/` to stay inside cluster ownership and
   match the CareerPath sibling.
2. **No API route** — logic-spec §8/§12 assumed a server OG-image route as "the
   only networked call." Deferred; this increment is fully offline.
3. **Screen count** — five phases collapsed to three for the first slice; zodiac
   and numerology are shown inside synthesis instead of on their own screens.
4. **`zustand` question resolved** — not a dependency, so `useReducer` (the
   spec's stated fallback), no ambiguity.

## 8. Testing

- The 115 logic tests move with the code and must stay green under the repo's
  `vitest` (`npm run test`). They are the safety net for the copy.
- Component tests (`@testing-library/react`, already in the repo) for: onboarding
  validation blocks an invalid submit; quiz records an answer and advances;
  Back preserves a prior answer; synthesis renders after 40 answers; the
  guarded `quiz → synthesis` transition does not fire while any answer is null.
- No mocking — everything is deterministic.

## 9. Constraints (from `CONTRIBUTING.md`)

- Touch only `app/personal-definition/` (and this `docs/` file). No shared files.
- `components/worker/ui/` only; no new styles.
- Phase 1 anonymous, no Prisma/DB.
- Branch `feature/personal-definition/ui`; commit local, **no push, no PR** by
  the agent. Khanh reviews, then opens the PR targeting `uat`.
- Read `node_modules/next/dist/docs/` before writing route/layout code — Next 16
  in this repo has breaking changes (`AGENTS.md`).

## 10. Open items

- Confirm the repo's `vitest.config.ts` picks up tests under
  `app/personal-definition/_lib/__tests__/` (the config glob may need the path),
  and that `resolveJsonModule` is on in the repo `tsconfig` so the data imports
  compile. Verify during Task 1 of the plan.
