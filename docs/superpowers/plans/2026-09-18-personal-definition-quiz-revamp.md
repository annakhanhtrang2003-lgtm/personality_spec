# Personal Definition Quiz Revamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the one-question-per-screen quiz into a four-screen accordion with a horizontal Likert scale, a centred progress header, and a half-way result teaser — and fix the seven question items that are unscoreable on an agree/disagree scale.

**Architecture:** `state.current` splits into `part` (which screen) and `open` (which accordion row). The auto-advance rule that decides which row opens next lives in the reducer as a pure function, so it is testable without rendering. `QuizItem` splits into three components: a part shell, a single accordion row, and the scale. The 50% teaser reads zodiac and numerology directly — both are already determined at onboarding — so no partial MBTI scoring is added and the MBTI panel stays a static lock.

**Tech Stack:** Next 16.2.9 (App Router, `'use client'`), React 19, Tailwind v4, Vitest + jsdom + `@testing-library/react`. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-18-personal-definition-quiz-revamp-design.md` (commit `3e516d0`)

## Global Constraints

- **Branch:** `feature/personal-definition/ui`. Commit locally only. **Never push, never open a PR** — CONTRIBUTING §5; Khanh opens the PR against `uat`.
- **Ownership:** touch only `app/personal-definition/**` and `docs/superpowers/**`. Do not edit `components/worker/ui/**`, `lib/**`, or any other cluster.
- **Shared UI:** import primitives from `@/components/worker/ui/X`. **No new CSS files and no new CSS classes.** Use existing design tokens only: `text-worker-primary`, `text-worker-text-secondary`, `bg-worker-bg`, `bg-worker-accent`, `border-worker-border`, `accent-worker-primary`, `rounded-worker-md`. The one existing local stylesheet, `_components/mascot.module.css`, may be used but not extended.
- **One deliberate deviation, already approved (spec §4):** `LikertScale` uses native `<input type="radio">` rather than the `RadioButton` wrapper, because `RadioButton` exposes no `aria-label` and a dot scale needs a hidden accessible name. No new styling is introduced by this.
- **Copy:** all user-facing strings in Vietnamese. Item text is authored by us; no third-party item bank is copied or adapted.
- **Scoring is frozen:** 40 items, four dimensions, 5-point Likert, `S = Σ(r × key)`. Do not change `scoreMBTI`, `MBTIResult`, `Response`, or `buildProfile`.
- **Item invariant:** every dimension keeps exactly 5 items at `key: 1` and 5 at `key: -1`. Never change one item's `key` without changing another in the same dimension the opposite way.
- **Never reorder the `items` array** in `questions.json` — `mbti.test.ts` indexes `bank.items[0]`, and `responses[i]` is positional.
- **Test command:** `npm test` runs the whole repo. Scope with `npx vitest run app/personal-definition`.
- **Known-failing, not your problem:** `tests/db-connection.test.ts` needs a live DB and fails with the dummy local `.env`. Three pre-existing `tsc` errors live in `tests/api/`. Neither is caused by this work.

---

### Task 1: Fix the question bank

Seven items are comparative ("A hơn B", "kể cả khi", "không kém"), which cannot be scored on an agree/disagree scale — disagreement is ambiguous between "I prefer B" and "I reject the framing", and both land on the same `S`. Three more exceed the length a collapsed accordion row can show. Two items flip `key` as a balanced pair.

**Files:**
- Modify: `app/personal-definition/_lib/data/questions.json`
- Test: `app/personal-definition/_lib/__tests__/content.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: a `questions.json` whose every item is single-clause and ≤ 16 syllables. `id`, `dimension`, `label_set`, array order and item count are unchanged. `tf_03` becomes `key: -1`, `tf_09` becomes `key: 1`.

- [ ] **Step 1: Write the failing tests**

Append both to the `describe("question bank content", ...)` block in `app/personal-definition/_lib/__tests__/content.test.ts`:

```ts
  // Comparative items ("tôi chọn A hơn B") are unscoreable on an agree/
  // disagree scale: disagreement could mean "I prefer B" or "I reject the
  // comparison", and both add the same amount to S. Spec §6.1.
  it("states one pole per item, with no comparison", () => {
    const comparative = /(\bhơn\b|kể cả khi|không kém)/i;
    for (const i of bank.items) {
      expect(comparative.test(i.text), `item ${i.id}: ${i.text}`).toBe(false);
    }
  });

  // A collapsed accordion row shows the whole item; anything longer
  // truncates mid-clause and reads as nonsense. Syllables, not words —
  // Vietnamese compounds make word-counting ambiguous. Spec §6.1.
  it("keeps every item within 16 syllables", () => {
    for (const i of bank.items) {
      const syllables = i.text.replace(/[.,!?;:]/g, "").split(/\s+/).filter(Boolean).length;
      expect(syllables, `item ${i.id} (${syllables}): ${i.text}`).toBeLessThanOrEqual(16);
    }
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run app/personal-definition/_lib/__tests__/content.test.ts`

Expected: FAIL. `states one pole per item` fails on the first of `tf_02`, `tf_03`, `tf_04`, `tf_05`, `tf_09`, `tf_10`, `sn_01`. `keeps every item within 16 syllables` fails on the first of `ei_03` (17), `sn_04` (17), `tf_06` (17), plus the long Group A items.

If either test fires on an id **not** in those two lists, stop and report it — the bank has an item the spec did not account for. Do not widen the rewrite on your own.

- [ ] **Step 3: Apply the seven structural rewrites**

In `app/personal-definition/_lib/data/questions.json`, replace only the `text` of each item below, and the `key` of `tf_03` and `tf_09`. Leave `id`, `dimension`, `label_set` and array position exactly as they are.

| id | `key` | New `text` |
|---|---|---|
| `tf_02` | stays `1` | `Trong tranh luận, lý lẽ chặt chẽ là thứ thuyết phục được tôi.` |
| `tf_03` | `1` → **`-1`** | `Chia việc nhóm, tôi muốn ai cũng có cơ hội làm phần quan trọng.` |
| `tf_04` | stays `1` | `Lựa chọn khó, tôi liệt kê ra cho rõ rồi mới quyết.` |
| `tf_05` | stays `1` | `Quy định chung thì nên áp dụng như nhau với mọi người.` |
| `tf_09` | `-1` → **`1`** | `Quyết định lớn, tôi chọn phương án hiệu quả nhất.` |
| `tf_10` | stays `-1` | `Không khí trong nhóm với tôi cũng là một kết quả.` |
| `sn_01` | stays `1` | `Tôi chỉ tin khi tự mình quan sát được.` |

`tf_03` moves to the F pole and `tf_09` to the T pole **as a pair**, so TF stays at five items per pole:

- `key: 1` — `tf_01`, `tf_02`, `tf_04`, `tf_05`, `tf_09`
- `key: -1` — `tf_03`, `tf_06`, `tf_07`, `tf_08`, `tf_10`

- [ ] **Step 4: Apply the three length trims**

Replace only the `text`. `key`, `dimension` and `label_set` are unchanged.

| id | New `text` |
|---|---|
| `ei_03` | `Nghĩ chưa ra, tôi nói ra cho bạn nghe rồi mới rõ.` |
| `sn_04` | `Ý tưởng hay tới mấy, tôi vẫn đợi thấy nó chạy thật.` |
| `tf_06` | `Trước khi quyết định, tôi nghĩ xem ai sẽ bị ảnh hưởng.` |

- [ ] **Step 5: Run the whole logic suite to verify it passes**

Run: `npx vitest run app/personal-definition/_lib`

Expected: PASS, all files. Watch four tests in particular — they are the ones the rewrite could break:

- `balances keying within every dimension` — proves the `tf_03`/`tf_09` pair swap held.
- `has no duplicate item text` — proves no rewrite collided with an existing item.
- `does not open every item the same way` — the rewrites change opening words.
- `keeps items free of type and career names` — the banned list includes `nghề`, `ngành`, `hướng nội`, `hướng ngoại`.

`mbti.test.ts` reads `i.key` from the bank rather than hardcoding it, so the key swap is invisible to it. `state.test.ts`'s all-neutral → `INFP` assertion still holds: every response is `0`, so `S = 0` on all four dimensions and the declared defaults `I/N/F/P` apply regardless of keying.

- [ ] **Step 6: Commit**

```bash
git add app/personal-definition/_lib/data/questions.json app/personal-definition/_lib/__tests__/content.test.ts
git commit -m "Fix comparative and over-long question items"
```

---

### Task 2: Extend `parts.ts`

Additive only, so the existing suite stays green. `isLastOfPart` is removed in Task 3, once its last caller is gone.

**Files:**
- Modify: `app/personal-definition/_lib/parts.ts`
- Test: `app/personal-definition/_lib/__tests__/parts.test.ts`

**Interfaces:**
- Consumes: `PART_SIZE`, `firstIndexOfPart` from this file.
- Produces: `indicesOfPart(part: number): number[]` and `TEASER_PART: number`, both used by Task 3, Task 6 and Task 7.

- [ ] **Step 1: Write the failing test**

Append to `app/personal-definition/_lib/__tests__/parts.test.ts`:

```ts
describe("indicesOfPart", () => {
  it("lists the ten absolute indices of a part", () => {
    expect(indicesOfPart(0)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(indicesOfPart(2)).toEqual([20, 21, 22, 23, 24, 25, 26, 27, 28, 29]);
  });

  it("covers the whole bank with no gaps or repeats across every part", () => {
    const all = Array.from({ length: PART_COUNT }, (_, p) => indicesOfPart(p)).flat();
    expect(all).toEqual(Array.from({ length: PART_COUNT * PART_SIZE }, (_, i) => i));
  });
});

describe("TEASER_PART", () => {
  it("is the halfway boundary", () => {
    // The interlude after this part shows the teaser, so it must sit at
    // exactly 50% of the bank. Spec §5.
    expect((TEASER_PART + 1) * PART_SIZE).toBe((PART_COUNT * PART_SIZE) / 2);
  });
});
```

Add `indicesOfPart`, `TEASER_PART`, `PART_COUNT` and `PART_SIZE` to the existing import from `../parts` at the top of the file.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run app/personal-definition/_lib/__tests__/parts.test.ts`

Expected: FAIL — `indicesOfPart is not a function`, `TEASER_PART is not defined`.

- [ ] **Step 3: Write the implementation**

Append to `app/personal-definition/_lib/parts.ts`:

```ts
/** Every absolute item index belonging to `part`, ascending. */
export function indicesOfPart(part: number): number[] {
  const first = firstIndexOfPart(part);
  return Array.from({ length: PART_SIZE }, (_, i) => first + i);
}

/**
 * The 50% boundary. The interlude after this part reveals zodiac and
 * numerology and shows MBTI as locked; the other two interludes show only
 * an encouragement line. Spec §5.
 */
export const TEASER_PART = 1;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run app/personal-definition/_lib/__tests__/parts.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/personal-definition/_lib/parts.ts app/personal-definition/_lib/__tests__/parts.test.ts
git commit -m "Add indicesOfPart and TEASER_PART"
```

---

### Task 3: Rebuild the reducer around `part` and `open`

`state.current` meant "the question on screen". With ten questions on screen it has to become two things: which part, and which row is expanded.

**Files:**
- Modify: `app/personal-definition/_lib/state.ts`
- Modify: `app/personal-definition/_lib/parts.ts` (remove `isLastOfPart`)
- Test: `app/personal-definition/_lib/__tests__/state.test.ts`
- Test: `app/personal-definition/_lib/__tests__/parts.test.ts` (drop the `isLastOfPart` cases)

**Interfaces:**
- Consumes: `indicesOfPart`, `firstIndexOfPart`, `PART_COUNT`, `PART_SIZE` (Task 2); `buildProfile`, `QUESTION_COUNT`, `validateInput` (unchanged).
- Produces: `State` with `part: number` and `open: number | null` replacing `current: number`. `Action` gains `{type:"TOGGLE";index:number}` and `{type:"FINISH_PART"}` and loses `{type:"NEXT"}`. Tasks 6 and 7 read `state.part`; Task 7 dispatches all of these.

- [ ] **Step 1: Replace the navigation tests**

In `app/personal-definition/_lib/__tests__/state.test.ts`, delete the whole `describe("quiz navigation", ...)` block and the `answeredUpTo` helper above it. Replace with:

```ts
/** A quiz state on `part` with the listed part-local positions answered. */
function onPart(part: number, answeredWithin: number[] = []): State {
  const responses = initialState.responses.slice();
  for (const within of answeredWithin) responses[firstIndexOfPart(part) + within] = 1;
  return { ...initialState, phase: "quiz", part, responses, open: firstIndexOfPart(part) };
}

describe("quiz navigation", () => {
  it("opens the first row of the part on START_QUIZ", () => {
    let s = initialState;
    for (const [field, value] of Object.entries(validInput)) {
      s = reducer(s, { type: "SET_INPUT", field: field as keyof typeof validInput, value });
    }
    s = reducer(s, { type: "START_QUIZ" });
    expect(s.part).toBe(0);
    expect(s.open).toBe(0);
  });

  it("ANSWER records the response and opens the next unanswered row", () => {
    const s = reducer(onPart(0), { type: "ANSWER", index: 0, value: 2 });
    expect(s.responses[0]).toBe(2);
    expect(s.open).toBe(1);
  });

  it("skips rows that are already answered", () => {
    const s = reducer(onPart(0, [1, 2]), { type: "ANSWER", index: 0, value: 1 });
    expect(s.open).toBe(3);
  });

  it("wraps to an earlier unanswered row rather than leaving the part", () => {
    // Positions 1..9 answered, 0 left. Answering 9 must come back to 0.
    const s = reducer(onPart(0, [1, 2, 3, 4, 5, 6, 7, 8]), { type: "ANSWER", index: 9, value: 1 });
    expect(s.open).toBe(0);
  });

  it("collapses everything once the part is complete", () => {
    const s = reducer(onPart(0, [0, 1, 2, 3, 4, 5, 6, 7, 8]), { type: "ANSWER", index: 9, value: 1 });
    expect(s.open).toBeNull();
  });

  it("TOGGLE opens a row and closes it again", () => {
    const opened = reducer(onPart(1), { type: "TOGGLE", index: 14 });
    expect(opened.open).toBe(14);
    expect(reducer(opened, { type: "TOGGLE", index: 14 }).open).toBeNull();
  });

  it("FINISH_PART is refused while the part has an unanswered row", () => {
    const partial = onPart(0, [0, 1, 2]);
    expect(reducer(partial, { type: "FINISH_PART" })).toBe(partial);
  });

  it("FINISH_PART enters the interlude when the part is complete", () => {
    const done = onPart(0, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const s = reducer(done, { type: "FINISH_PART" });
    expect(s.phase).toBe("interlude");
    expect(s.part).toBe(0);
  });

  it("FINISH_PART on the last part builds the profile instead", () => {
    const all = initialState.responses.map(() => 0 as Response);
    const last = { ...initialState, phase: "quiz" as const, input: validInput, part: PART_COUNT - 1, responses: all };
    const s = reducer(last, { type: "FINISH_PART" });
    expect(s.phase).toBe("synthesis");
    expect(s.profile).not.toBeNull();
  });

  it("CONTINUE moves to the next part and opens its first row", () => {
    const interlude = { ...onPart(0, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]), phase: "interlude" as const };
    const s = reducer(interlude, { type: "CONTINUE" });
    expect(s.phase).toBe("quiz");
    expect(s.part).toBe(1);
    expect(s.open).toBe(firstIndexOfPart(1));
  });

  it("BACK from the interlude returns to the same part", () => {
    const interlude = { ...onPart(1), phase: "interlude" as const };
    const s = reducer(interlude, { type: "BACK" });
    expect(s.phase).toBe("quiz");
    expect(s.part).toBe(1);
  });

  it("BACK inside the quiz steps to the previous part with rows collapsed", () => {
    const s = reducer(onPart(2), { type: "BACK" });
    expect(s.part).toBe(1);
    expect(s.open).toBeNull();
  });

  it("BACK is refused on the first part", () => {
    const first = onPart(0);
    expect(reducer(first, { type: "BACK" })).toBe(first);
  });
});
```

Then fix the three older tests that still mention `current`:

- `"START_QUIZ enters the quiz once input is valid"` — change `expect(s.current).toBe(0)` to `expect(s.part).toBe(0)`.
- `"ANSWER records a response and NEXT moves the cursor"` — delete it; the new `ANSWER` tests replace it.
- Update the import line to `import { firstIndexOfPart, PART_COUNT } from "../parts";`.

Also delete the `isLastOfPart` cases from `app/personal-definition/_lib/__tests__/parts.test.ts` and drop it from that file's import.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run app/personal-definition/_lib/__tests__/state.test.ts`

Expected: FAIL — TypeScript rejects `part` and `open` as unknown properties of `State`, and `TOGGLE` / `FINISH_PART` as unknown action types.

- [ ] **Step 3: Write the implementation**

Replace the imports, `State`, `Action`, `initialState` and `reducer` in `app/personal-definition/_lib/state.ts`. `validateInput` is unchanged — leave it exactly as it is.

```ts
import { PART_COUNT, indicesOfPart, firstIndexOfPart } from "./parts";
```

```ts
export interface State {
  phase: Phase;
  input: Input;
  responses: (Response | null)[];
  /** Which of the four screens is showing. */
  part: number;
  /** Absolute index of the expanded row, or null when all are collapsed. */
  open: number | null;
  profile: PersonalProfile | null;
}

export type Action =
  | { type: "SET_INPUT"; field: keyof Input; value: string }
  | { type: "START_QUIZ" }
  | { type: "ANSWER"; index: number; value: Response }
  | { type: "TOGGLE"; index: number }
  | { type: "FINISH_PART" }
  | { type: "BACK" }
  | { type: "CONTINUE" }
  | { type: "FINISH" };

export const initialState: State = {
  phase: "onboarding",
  input: { name: "", full_name: "", university: "", birth_date: "" },
  responses: Array.from({ length: QUESTION_COUNT }, () => null),
  part: 0,
  open: null,
  profile: null,
};

/**
 * The row to expand after answering `after`: the next unanswered row in the
 * part, scanning ascending and wrapping to the start of the part, or null
 * when every row is answered.
 *
 * Wrapping matters — a student who skips row 0 and answers 1..9 must be
 * brought back to 0 rather than dropped at the end of a part that still
 * cannot be finished. Returning null on a complete part is what enables the
 * end-of-part button, so "nothing left to open" and "you may leave" are the
 * same state and cannot drift apart.
 */
function nextOpen(
  responses: (Response | null)[],
  part: number,
  after: number,
): number | null {
  const indices = indicesOfPart(part);
  const from = indices.indexOf(after);
  for (let step = 1; step <= indices.length; step++) {
    const index = indices[(from + step + indices.length) % indices.length]!;
    if (responses[index] === null) return index;
  }
  return null;
}
```

```ts
export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_INPUT":
      return { ...state, input: { ...state.input, [action.field]: action.value } };

    case "START_QUIZ":
      if (Object.keys(validateInput(state.input)).length > 0) return state;
      return { ...state, phase: "quiz", part: 0, open: firstIndexOfPart(0) };

    case "ANSWER": {
      const responses = state.responses.slice();
      responses[action.index] = action.value;
      return { ...state, responses, open: nextOpen(responses, state.part, action.index) };
    }

    case "TOGGLE":
      return { ...state, open: state.open === action.index ? null : action.index };

    case "FINISH_PART": {
      if (state.phase !== "quiz") return state;
      const complete = indicesOfPart(state.part).every((i) => state.responses[i] !== null);
      if (!complete) return state;
      // The last part has no interlude after it — it goes straight to the
      // profile. FINISH re-checks all 40 rather than trusting the per-part
      // gates, so the "every response present" contract has one owner.
      if (state.part >= PART_COUNT - 1) return reducer(state, { type: "FINISH" });
      return { ...state, phase: "interlude" };
    }

    case "CONTINUE": {
      if (state.phase !== "interlude") return state;
      const next = state.part + 1;
      if (next >= PART_COUNT) return state;
      return { ...state, phase: "quiz", part: next, open: firstIndexOfPart(next) };
    }

    case "BACK": {
      if (state.phase === "interlude") return { ...state, phase: "quiz" };
      if (state.phase !== "quiz") return state;
      if (state.part === 0) return state;
      return { ...state, part: state.part - 1, open: null };
    }

    case "FINISH": {
      if (state.responses.some((r) => r === null)) return state;
      const profile = buildProfile({
        name: state.input.name,
        university: state.input.university,
        birth_date: state.input.birth_date,
        full_name: state.input.full_name,
        responses: state.responses as Response[],
      });
      return { ...state, phase: "synthesis", profile };
    }

    default:
      return state;
  }
}
```

Then delete `isLastOfPart` from `app/personal-definition/_lib/parts.ts` — Task 3 removed its only caller.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run app/personal-definition/_lib`

Expected: PASS. Component tests are expected to be broken at this point — they are rebuilt in Tasks 4–7. Do not run the component folder yet.

- [ ] **Step 5: Commit**

```bash
git add app/personal-definition/_lib/state.ts app/personal-definition/_lib/parts.ts app/personal-definition/_lib/__tests__/state.test.ts app/personal-definition/_lib/__tests__/parts.test.ts
git commit -m "Replace quiz cursor with part and open row"
```

---

### Task 4: `LikertScale`

Five radios in a row with the extremes labelled, and the chosen option's Vietnamese label appearing underneath. The `LIKERT_SETS` data is untouched — only its presentation changes.

**Files:**
- Create: `app/personal-definition/_components/LikertScale.tsx`
- Test: `app/personal-definition/_components/__tests__/LikertScale.test.tsx`

**Interfaces:**
- Consumes: `Response` from `../_lib/types`.
- Produces: `LikertScale` with props `{ options: readonly {value: Response; label: string}[]; value: Response | null; onChange: (v: Response) => void; questionId: string; question: string }`. Task 5 renders it.

- [ ] **Step 1: Write the failing test**

Create `app/personal-definition/_components/__tests__/LikertScale.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LikertScale } from "../LikertScale";
import { LIKERT_SETS } from "../../_lib/likert";

const base = {
  options: LIKERT_SETS.self,
  value: null,
  onChange: () => {},
  questionId: "7",
  question: "Tôi hay tưởng tượng.",
};

describe("LikertScale", () => {
  it("renders one radio per option, each with an accessible name", () => {
    render(<LikertScale {...base} />);
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(5);
    for (const opt of LIKERT_SETS.self) {
      expect(screen.getByRole("radio", { name: opt.label })).toBeInTheDocument();
    }
  });

  it("names the group after the question so the radios are not orphaned", () => {
    render(<LikertScale {...base} />);
    expect(screen.getByRole("group", { name: "Tôi hay tưởng tượng." })).toBeInTheDocument();
  });

  it("shows only the two anchors before anything is chosen", () => {
    render(<LikertScale {...base} />);
    expect(screen.getByText("Đồng ý")).toBeInTheDocument();
    expect(screen.getByText("Không đồng ý")).toBeInTheDocument();
    expect(screen.queryByText("Đúng y chang mình")).not.toBeInTheDocument();
  });

  it("reports the chosen value", () => {
    const onChange = vi.fn();
    render(<LikertScale {...base} onChange={onChange} />);
    fireEvent.click(screen.getByRole("radio", { name: "Hơi giống mình" }));
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it("shows the label of the chosen option and checks its radio", () => {
    render(<LikertScale {...base} value={1} />);
    expect(screen.getByTestId("likert-chosen")).toHaveTextContent("Hơi giống mình");
    expect(screen.getByRole("radio", { name: "Hơi giống mình" })).toBeChecked();
  });

  it("uses the situation wording when given the situation set", () => {
    render(<LikertScale {...base} options={LIKERT_SETS.situation} value={2} />);
    expect(screen.getByTestId("likert-chosen")).toHaveTextContent("Chuẩn luôn");
  });

  it("keeps two scales on one page independent", () => {
    render(
      <>
        <LikertScale {...base} questionId="1" />
        <LikertScale {...base} questionId="2" />
      </>,
    );
    const names = screen.getAllByRole("radio").map((r) => r.getAttribute("name"));
    expect(new Set(names).size).toBe(2);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run app/personal-definition/_components/__tests__/LikertScale.test.tsx`

Expected: FAIL — cannot resolve `../LikertScale`.

- [ ] **Step 3: Write the implementation**

Create `app/personal-definition/_components/LikertScale.tsx`:

```tsx
"use client";

import type { Response } from "../_lib/types";

type Option = { value: Response; label: string };

type Props = {
  options: readonly Option[];
  value: Response | null;
  onChange: (v: Response) => void;
  /** Distinct per item, so two scales on one screen form separate groups. */
  questionId: string;
  question: string;
};

/**
 * Native radios rather than the shared `RadioButton`: that wrapper renders
 * its label as visible text and exposes no aria-label, so a dot scale built
 * from it would ship five radios with no accessible name. Styling is the
 * existing `accent-worker-primary` token only — no new CSS. Spec §4.
 */
export function LikertScale({ options, value, onChange, questionId, question }: Props) {
  const chosen = options.find((o) => o.value === value);

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="sr-only">{question}</legend>

      <div className="flex items-center justify-between gap-1 px-1">
        {options.map((opt) => (
          <input
            key={opt.value}
            type="radio"
            name={`likert-${questionId}`}
            value={String(opt.value)}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            aria-label={opt.label}
            className="accent-worker-primary w-7 h-7 shrink-0"
          />
        ))}
      </div>

      <div className="flex justify-between text-xs text-worker-text-secondary">
        <span>Đồng ý</span>
        <span>Không đồng ý</span>
      </div>

      {/* Reserved height: the label appearing on first choice must not
          shove the rows below it down the screen. */}
      <p data-testid="likert-chosen" className="text-sm text-center text-worker-primary min-h-5">
        {chosen?.label ?? ""}
      </p>
    </fieldset>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run app/personal-definition/_components/__tests__/LikertScale.test.tsx`

Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add app/personal-definition/_components/LikertScale.tsx app/personal-definition/_components/__tests__/LikertScale.test.tsx
git commit -m "Add horizontal Likert scale"
```

---

### Task 5: `QuizItem` becomes one accordion row

The component keeps its name but loses everything to do with navigation and the part header — those move to `QuizPart` in Task 6.

**Files:**
- Rewrite: `app/personal-definition/_components/QuizItem.tsx`
- Rewrite: `app/personal-definition/_components/__tests__/QuizItem.test.tsx`

**Interfaces:**
- Consumes: `LikertScale` (Task 4); `likertFor` from `../_lib/likert`; `indexWithinPart` from `../_lib/parts`.
- Produces: `QuizItem` with props `{ index: number; text: string; value: Response | null; isOpen: boolean; onToggle: () => void; onAnswer: (v: Response) => void }`. Task 6 renders ten of them.

- [ ] **Step 1: Replace the test file**

Replace the whole contents of `app/personal-definition/_components/__tests__/QuizItem.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QuizItem } from "../QuizItem";

const base = {
  index: 13,
  text: "Khi nhận đề tài mới, tôi muốn xem một ví dụ cụ thể trước đã.",
  value: null,
  isOpen: false,
  onToggle: () => {},
  onAnswer: () => {},
};

describe("QuizItem", () => {
  it("numbers the row within its part, not across the bank", () => {
    render(<QuizItem {...base} />);
    // index 13 is the 4th item of part 2
    expect(screen.getByText("4.")).toBeInTheDocument();
  });

  it("shows the full item text whether open or closed", () => {
    const { rerender } = render(<QuizItem {...base} />);
    expect(screen.getByText(base.text)).toBeInTheDocument();
    rerender(<QuizItem {...base} isOpen />);
    expect(screen.getByText(base.text)).toBeInTheDocument();
  });

  it("hides the scale while collapsed", () => {
    render(<QuizItem {...base} />);
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });

  it("shows the scale when open", () => {
    render(<QuizItem {...base} isOpen />);
    expect(screen.getAllByRole("radio")).toHaveLength(5);
  });

  it("reports expansion state to assistive tech", () => {
    const { rerender } = render(<QuizItem {...base} />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "false");
    rerender(<QuizItem {...base} isOpen />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "true");
  });

  it("toggles when the row is clicked", () => {
    const onToggle = vi.fn();
    render(<QuizItem {...base} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("marks an answered row", () => {
    render(<QuizItem {...base} value={2} />);
    expect(screen.getByTestId("row-answered")).toBeInTheDocument();
  });

  it("leaves an unanswered row unmarked", () => {
    render(<QuizItem {...base} />);
    expect(screen.queryByTestId("row-answered")).not.toBeInTheDocument();
  });

  it("passes the label set that matches the item", () => {
    // index 13 is sn_02, label_set "situation"
    render(<QuizItem {...base} isOpen value={2} />);
    expect(screen.getByTestId("likert-chosen")).toHaveTextContent("Chuẩn luôn");
  });

  it("reports the chosen value", () => {
    const onAnswer = vi.fn();
    render(<QuizItem {...base} isOpen onAnswer={onAnswer} />);
    fireEvent.click(screen.getByRole("radio", { name: "Chuẩn luôn" }));
    expect(onAnswer).toHaveBeenCalledWith(2);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run app/personal-definition/_components/__tests__/QuizItem.test.tsx`

Expected: FAIL — the current `QuizItem` takes `onBack`/`onNext`/`onFinish` and renders a part header, so `aria-expanded`, `"4."` and `row-answered` are all absent.

- [ ] **Step 3: Write the implementation**

Replace the whole contents of `app/personal-definition/_components/QuizItem.tsx`:

```tsx
"use client";

import { likertFor } from "../_lib/likert";
import { indexWithinPart } from "../_lib/parts";
import { LikertScale } from "./LikertScale";
import type { Response } from "../_lib/types";

type Props = {
  /** Absolute index into the bank, 0..39. */
  index: number;
  text: string;
  value: Response | null;
  isOpen: boolean;
  onToggle: () => void;
  onAnswer: (v: Response) => void;
};

export function QuizItem({ index, text, value, isOpen, onToggle, onAnswer }: Props) {
  const ordinal = indexWithinPart(index) + 1;
  const answered = value !== null;

  return (
    <div className="border-b border-worker-border last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={`likert-panel-${index}`}
        className="w-full flex items-start gap-3 py-3 text-left"
      >
        <span className="w-5 shrink-0 text-sm text-worker-text-secondary">{ordinal}.</span>
        <span
          className={`flex-1 text-sm ${
            answered && !isOpen ? "text-worker-text-secondary" : "text-worker-primary"
          }`}
        >
          {text}
        </span>
        {answered ? (
          <span data-testid="row-answered" className="shrink-0 text-sm text-worker-primary" aria-hidden>
            ✓
          </span>
        ) : (
          <span className="shrink-0 text-sm text-worker-text-secondary" aria-hidden>
            {isOpen ? "⌄" : "›"}
          </span>
        )}
      </button>

      {isOpen && (
        <div id={`likert-panel-${index}`} className="pb-4 pl-8 pr-2">
          <LikertScale
            options={likertFor(index)}
            value={value}
            onChange={onAnswer}
            questionId={String(index)}
            question={text}
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run app/personal-definition/_components/__tests__/QuizItem.test.tsx`

Expected: PASS, 10 tests.

- [ ] **Step 5: Commit**

```bash
git add app/personal-definition/_components/QuizItem.tsx app/personal-definition/_components/__tests__/QuizItem.test.tsx
git commit -m "Turn QuizItem into a single accordion row"
```

---

### Task 6: `QuizPart`

The screen: centred progress header with the mascot, ten rows, and the button that ends the part.

**Files:**
- Create: `app/personal-definition/_components/QuizPart.tsx`
- Test: `app/personal-definition/_components/__tests__/QuizPart.test.tsx`

**Interfaces:**
- Consumes: `QuizItem` (Task 5); `indicesOfPart`, `PART_COUNT`, `PART_SIZE`, `PART_TITLES` from `../_lib/parts`; `FACES`, `srcOf`, `FaceName` from `../_lib/mascot`; `Button`, `ProgressBar` from `@/components/worker/ui/`.
- Produces: `QuizPart` with props `{ part: number; responses: (Response | null)[]; open: number | null; onAnswer: (index: number, v: Response) => void; onToggle: (index: number) => void; onFinishPart: () => void; onBack: () => void }`. Task 7 renders it.

- [ ] **Step 1: Write the failing test**

Create `app/personal-definition/_components/__tests__/QuizPart.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QuizPart } from "../QuizPart";
import { QUESTION_COUNT } from "../../_lib/likert";
import { firstIndexOfPart } from "../../_lib/parts";
import type { Response } from "../../_lib/types";

/** Responses with the given part-local positions of `part` answered. */
function responsesFor(part: number, answeredWithin: number[]): (Response | null)[] {
  const r: (Response | null)[] = Array.from({ length: QUESTION_COUNT }, () => null);
  for (const within of answeredWithin) r[firstIndexOfPart(part) + within] = 1;
  return r;
}

const base = {
  part: 1,
  responses: responsesFor(1, []),
  open: null,
  onAnswer: () => {},
  onToggle: () => {},
  onFinishPart: () => {},
  onBack: () => {},
};

const ALL_TEN = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

describe("QuizPart", () => {
  it("names the part and its position", () => {
    render(<QuizPart {...base} />);
    expect(screen.getByText("Phần 2/4")).toBeInTheDocument();
    expect(screen.getByText("Cách bạn tiếp nhận")).toBeInTheDocument();
  });

  it("renders all ten rows of the part at once", () => {
    render(<QuizPart {...base} />);
    expect(screen.getAllByRole("button", { expanded: false })).toHaveLength(10);
  });

  it("fills the bar by answers given, not by row position", () => {
    render(<QuizPart {...base} responses={responsesFor(1, [0, 1, 2])} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "30");
    expect(screen.getByText("3/10 câu")).toBeInTheDocument();
  });

  it("expands only the open row", () => {
    render(<QuizPart {...base} open={firstIndexOfPart(1) + 2} />);
    expect(screen.getAllByRole("button", { expanded: true })).toHaveLength(1);
    expect(screen.getAllByRole("radio")).toHaveLength(5);
  });

  it("keeps the end-of-part button disabled until all ten are answered", () => {
    const { rerender } = render(<QuizPart {...base} responses={responsesFor(1, [0, 1, 2])} />);
    expect(screen.getByRole("button", { name: "Xong phần 2" })).toBeDisabled();
    rerender(<QuizPart {...base} responses={responsesFor(1, ALL_TEN)} />);
    expect(screen.getByRole("button", { name: "Xong phần 2" })).toBeEnabled();
  });

  it("offers the result button on the last part instead", () => {
    render(<QuizPart {...base} part={3} responses={responsesFor(3, ALL_TEN)} />);
    expect(screen.getByRole("button", { name: "Xem kết quả" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Xong phần/ })).not.toBeInTheDocument();
  });

  it("hides the back button on the first part", () => {
    render(<QuizPart {...base} part={0} responses={responsesFor(0, [])} />);
    expect(screen.queryByRole("button", { name: "Quay lại" })).not.toBeInTheDocument();
  });

  it("reports which row was answered, by absolute index", () => {
    const onAnswer = vi.fn();
    render(<QuizPart {...base} open={firstIndexOfPart(1)} onAnswer={onAnswer} />);
    fireEvent.click(screen.getAllByRole("radio")[0]!);
    expect(onAnswer).toHaveBeenCalledWith(firstIndexOfPart(1), 2);
  });

  it("reports which row was toggled, by absolute index", () => {
    const onToggle = vi.fn();
    render(<QuizPart {...base} onToggle={onToggle} />);
    fireEvent.click(screen.getAllByRole("button", { expanded: false })[4]!);
    expect(onToggle).toHaveBeenCalledWith(firstIndexOfPart(1) + 4);
  });

  it("changes the mascot as the part fills up", () => {
    const { rerender } = render(<QuizPart {...base} />);
    const empty = screen.getByAltText("Mascot").getAttribute("src");
    rerender(<QuizPart {...base} responses={responsesFor(1, [0, 1, 2, 3, 4])} />);
    const half = screen.getByAltText("Mascot").getAttribute("src");
    rerender(<QuizPart {...base} responses={responsesFor(1, ALL_TEN)} />);
    const full = screen.getByAltText("Mascot").getAttribute("src");
    expect(new Set([empty, half, full]).size).toBe(3);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run app/personal-definition/_components/__tests__/QuizPart.test.tsx`

Expected: FAIL — cannot resolve `../QuizPart`.

- [ ] **Step 3: Write the implementation**

Create `app/personal-definition/_components/QuizPart.tsx`:

```tsx
"use client";

import { Button } from "@/components/worker/ui/Button";
import { ProgressBar } from "@/components/worker/ui/ProgressBar";
import { PART_COUNT, PART_SIZE, PART_TITLES, indicesOfPart } from "../_lib/parts";
import { FACES, srcOf, type FaceName } from "../_lib/mascot";
import { QuizItem } from "./QuizItem";
import type { Response } from "../_lib/types";
import bank from "../_lib/data/questions.json";
import styles from "./mascot.module.css";

const ITEMS = (bank as { items: { text: string }[] }).items;

type Props = {
  part: number;
  responses: (Response | null)[];
  open: number | null;
  onAnswer: (index: number, v: Response) => void;
  onToggle: (index: number) => void;
  onFinishPart: () => void;
  onBack: () => void;
};

/**
 * The mascot tracks progress through the part. It used to mirror the current
 * answer, which has no meaning now that ten items share a screen.
 */
function faceForProgress(answered: number): FaceName {
  if (answered === 0) return "smile";
  if (answered >= PART_SIZE) return "laugh";
  if (answered >= PART_SIZE / 2) return "excited";
  return "playful";
}

export function QuizPart({
  part, responses, open, onAnswer, onToggle, onFinishPart, onBack,
}: Props) {
  const indices = indicesOfPart(part);
  const answered = indices.filter((i) => responses[i] !== null).length;
  const complete = answered === PART_SIZE;
  const isLastPart = part === PART_COUNT - 1;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-center text-center gap-2">
        <div className="flex items-center gap-1.5" aria-hidden>
          {Array.from({ length: PART_COUNT }, (_, i) => (
            <span
              key={i}
              className={`w-2 h-2 rounded-full ${i <= part ? "bg-worker-primary" : "bg-worker-border"}`}
            />
          ))}
        </div>

        <span className="text-xs text-worker-text-secondary">
          Phần {part + 1}/{PART_COUNT}
        </span>
        <p className="text-sm font-medium text-worker-primary">{PART_TITLES[part]}</p>

        <img
          src={srcOf(FACES[faceForProgress(answered)])}
          alt="Mascot"
          className={`w-20 h-20 object-contain ${styles.pulseOnChange}`}
        />

        <div className="w-full max-w-[280px]">
          <ProgressBar value={(answered / PART_SIZE) * 100} />
        </div>
        <p className="text-xs text-worker-text-secondary">
          {answered}/{PART_SIZE} câu
        </p>
      </div>

      <div className="flex flex-col">
        {indices.map((index) => (
          <QuizItem
            key={index}
            index={index}
            text={ITEMS[index]!.text}
            value={responses[index] ?? null}
            isOpen={open === index}
            onToggle={() => onToggle(index)}
            onAnswer={(v) => onAnswer(index, v)}
          />
        ))}
      </div>

      <div className="flex justify-between gap-2">
        {part > 0 ? (
          <Button variant="secondary" onClick={onBack}>
            Quay lại
          </Button>
        ) : (
          <span />
        )}
        <Button onClick={onFinishPart} disabled={!complete}>
          {isLastPart ? "Xem kết quả" : `Xong phần ${part + 1}`}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run app/personal-definition/_components/__tests__/QuizPart.test.tsx`

Expected: PASS, 11 tests.

- [ ] **Step 5: Commit**

```bash
git add app/personal-definition/_components/QuizPart.tsx app/personal-definition/_components/__tests__/QuizPart.test.tsx
git commit -m "Add the part screen with a centred progress header"
```

---

### Task 7: The 50% teaser

`InterludeView` gains an optional `preview`. When absent it behaves exactly as it does today, so the interludes after parts 0 and 2 are unchanged.

**Files:**
- Modify: `app/personal-definition/_components/InterludeView.tsx`
- Modify: `app/personal-definition/_components/__tests__/InterludeView.test.tsx`

**Interfaces:**
- Consumes: `ZodiacResult`, `NumerologyResult` from `../_lib/types`; `PART_SIZE`, `PART_COUNT` from `../_lib/parts`; `QUESTION_COUNT` from `../_lib/likert`.
- Produces: `InterludeView` with props `{ part: number; preview?: { zodiac: ZodiacResult; numerology: NumerologyResult }; onContinue: () => void; onBack: () => void }`. Task 8 supplies `preview`.

- [ ] **Step 1: Write the failing test**

Append to `app/personal-definition/_components/__tests__/InterludeView.test.tsx`, and add the imports it needs at the top of the file:

```tsx
import { calculateZodiac } from "../../_lib/zodiac";
import { calculateNumerology } from "../../_lib/numerology";

const preview = {
  zodiac: calculateZodiac("2003-10-05"),
  numerology: calculateNumerology("2003-10-05", "Nguyễn Thị Khánh Trang"),
};

describe("InterludeView teaser", () => {
  it("shows nothing extra when no preview is given", () => {
    render(<InterludeView part={0} onContinue={() => {}} onBack={() => {}} />);
    expect(screen.queryByTestId("teaser")).not.toBeInTheDocument();
  });

  it("reveals the zodiac sign when a preview is given", () => {
    render(<InterludeView part={1} preview={preview} onContinue={() => {}} onBack={() => {}} />);
    expect(screen.getByTestId("teaser")).toBeInTheDocument();
    expect(screen.getByText(preview.zodiac.sun_sign)).toBeInTheDocument();
  });

  it("reveals the life path number", () => {
    render(<InterludeView part={1} preview={preview} onContinue={() => {}} onBack={() => {}} />);
    expect(screen.getByText(String(preview.numerology.life_path))).toBeInTheDocument();
  });

  it("keeps MBTI locked and names no type", () => {
    render(<InterludeView part={1} preview={preview} onContinue={() => {}} onBack={() => {}} />);
    expect(screen.getByTestId("teaser-locked")).toBeInTheDocument();
    // A halfway type could contradict the final one, so none is computed.
    expect(screen.queryByText(/INFP|INFJ|ENFP|ESTJ/)).not.toBeInTheDocument();
  });

  it("counts the questions still to go", () => {
    render(<InterludeView part={1} preview={preview} onContinue={() => {}} onBack={() => {}} />);
    expect(screen.getByText("Còn 20 câu nữa")).toBeInTheDocument();
  });

  it("still offers the continue button", () => {
    render(<InterludeView part={1} preview={preview} onContinue={() => {}} onBack={() => {}} />);
    expect(screen.getByRole("button", { name: "Đi tiếp" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run app/personal-definition/_components/__tests__/InterludeView.test.tsx`

Expected: FAIL — TypeScript rejects the `preview` prop; `teaser` and `teaser-locked` are not in the DOM.

- [ ] **Step 3: Write the implementation**

In `app/personal-definition/_components/InterludeView.tsx`, add the imports and the two helpers, extend `Props`, and insert the teaser block. Everything already in the file — `LINES`, the heading, the dots, the buttons — stays as it is.

```tsx
import { PART_COUNT, PART_SIZE, PART_TITLES } from "../_lib/parts";
import { QUESTION_COUNT } from "../_lib/likert";
import type { NumerologyResult, ZodiacResult } from "../_lib/types";
```

```tsx
type Props = {
  /** 0-based index of the part just finished. */
  part: number;
  /**
   * Present only at the 50% boundary. Both values are settled at onboarding,
   * so revealing them here cannot contradict the final profile. Spec §5.
   */
  preview?: { zodiac: ZodiacResult; numerology: NumerologyResult };
  onContinue: () => void;
  onBack: () => void;
};

/** The interpretations run 2-3 sentences; the teaser shows only the first. */
function firstSentence(text: string): string {
  return (text.split(/[.!?](?:\s|$)/)[0] ?? text).trim();
}

function TeaserRow({ badge, label, value }: { badge: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 border border-worker-border rounded-worker-md px-4 py-3">
      <span className="text-lg text-worker-primary shrink-0" aria-hidden>{badge}</span>
      <div className="flex flex-col text-left">
        <span className="text-xs text-worker-text-secondary">{label}</span>
        <span className="text-sm text-worker-primary">{value}</span>
      </div>
    </div>
  );
}
```

Insert this immediately after the `{nextTitle && (...)}` block and before the part dots:

```tsx
      {preview && (
        <div data-testid="teaser" className="w-full flex flex-col gap-2 mt-2">
          <TeaserRow
            badge="★"
            label={preview.zodiac.sun_sign}
            value={preview.zodiac.traits[0] ?? ""}
          />
          <TeaserRow
            badge={String(preview.numerology.life_path)}
            label="Số Chủ Đạo"
            value={firstSentence(preview.numerology.interpretations.life_path)}
          />
          <div
            data-testid="teaser-locked"
            className="flex items-center gap-3 border border-worker-border rounded-worker-md px-4 py-3 opacity-60"
          >
            <span className="text-lg shrink-0" aria-hidden>🔒</span>
            <div className="flex flex-col text-left">
              <span className="text-xs text-worker-text-secondary">Nhóm tính cách MBTI</span>
              <span className="text-sm text-worker-primary">
                Còn {QUESTION_COUNT - (part + 1) * PART_SIZE} câu nữa
              </span>
            </div>
          </div>
        </div>
      )}
```

The zodiac row uses `sun_sign` as its label so the sign name is the readable line — the test looks it up by text.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run app/personal-definition/_components/__tests__/InterludeView.test.tsx`

Expected: PASS — the six new tests plus every test already in the file.

- [ ] **Step 5: Commit**

```bash
git add app/personal-definition/_components/InterludeView.tsx app/personal-definition/_components/__tests__/InterludeView.test.tsx
git commit -m "Reveal zodiac and numerology at the halfway interlude"
```

---

### Task 8: Wire the page and verify the whole branch

**Files:**
- Modify: `app/personal-definition/page.tsx`
- Test: `app/personal-definition/_components/__tests__/page.test.tsx`

**Interfaces:**
- Consumes: everything from Tasks 2–7.
- Produces: the working page. Nothing downstream depends on it.

- [ ] **Step 1: Write the failing test**

`app/personal-definition/_components/__tests__/page.test.tsx` currently holds exactly one test — the onboarding block. **Keep it unchanged**; nothing in this file references the old one-question screen, so there is nothing to delete.

Append this, and add `TEASER_PART` to the imports at the top:

```tsx
import { TEASER_PART, PART_COUNT, PART_SIZE } from "../../_lib/parts";
import { QUESTION_COUNT } from "../../_lib/likert";

describe("page wiring", () => {
  it("shows no quiz controls before onboarding is submitted", () => {
    render(<PersonalDefinitionPage />);
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  // page.tsx decides whether to pass `preview` by comparing state.part to
  // TEASER_PART. A full walkthrough cannot run here — DatePicker's popover
  // does not drive under jsdom — so this pins the constant the wiring reads
  // instead. Move TEASER_PART and this fails, which is the point.
  it("puts the teaser boundary at the halfway mark", () => {
    expect((TEASER_PART + 1) * PART_SIZE).toBe(QUESTION_COUNT / 2);
    expect(TEASER_PART).toBeLessThan(PART_COUNT - 1); // never the final part
  });
});
```

The page-level walkthrough this cannot cover is Step 6, which is a required manual check rather than an optional one.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run app/personal-definition/_components/__tests__/page.test.tsx`

Expected: FAIL — `page.tsx` still imports `QuizItem` with the old props and `partOf(state.current)`, so the module does not typecheck.

- [ ] **Step 3: Write the implementation**

Replace `app/personal-definition/page.tsx`:

```tsx
"use client";

import { useMemo, useReducer, useState } from "react";
import { initialState, reducer, validateInput } from "./_lib/state";
import type { Input } from "./_lib/state";
import { TEASER_PART } from "./_lib/parts";
import { calculateZodiac } from "./_lib/zodiac";
import { calculateNumerology } from "./_lib/numerology";
import { OnboardingForm } from "./_components/OnboardingForm";
import { QuizPart } from "./_components/QuizPart";
import { InterludeView } from "./_components/InterludeView";
import { SynthesisView } from "./_components/SynthesisView";

export default function PersonalDefinitionPage() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [showErrors, setShowErrors] = useState(false);

  const errors = showErrors ? validateInput(state.input) : {};

  const { birth_date, full_name } = state.input;

  /**
   * Zodiac and numerology depend only on onboarding input, so they are
   * available long before the quiz ends — that is what lets the halfway
   * teaser show real values with no partial MBTI scoring. START_QUIZ cannot
   * succeed while validateInput reports an error, so by the time an
   * interlude renders, neither call can throw.
   */
  const preview = useMemo(() => {
    if (!birth_date || !full_name.trim()) return undefined;
    return {
      zodiac: calculateZodiac(birth_date),
      numerology: calculateNumerology(birth_date, full_name),
    };
  }, [birth_date, full_name]);

  const handleStart = () => {
    if (Object.keys(validateInput(state.input)).length > 0) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    dispatch({ type: "START_QUIZ" });
  };

  return (
    <div className="px-5 py-6 max-w-[600px] mx-auto">
      {state.phase === "onboarding" && (
        <OnboardingForm
          input={state.input}
          errors={errors}
          onChange={(field: keyof Input, value) => dispatch({ type: "SET_INPUT", field, value })}
          onSubmit={handleStart}
        />
      )}

      {state.phase === "quiz" && (
        <QuizPart
          part={state.part}
          responses={state.responses}
          open={state.open}
          onAnswer={(index, value) => dispatch({ type: "ANSWER", index, value })}
          onToggle={(index) => dispatch({ type: "TOGGLE", index })}
          onFinishPart={() => dispatch({ type: "FINISH_PART" })}
          onBack={() => dispatch({ type: "BACK" })}
        />
      )}

      {state.phase === "interlude" && (
        <InterludeView
          part={state.part}
          preview={state.part === TEASER_PART ? preview : undefined}
          onContinue={() => dispatch({ type: "CONTINUE" })}
          onBack={() => dispatch({ type: "BACK" })}
        />
      )}

      {state.phase === "synthesis" && state.profile && <SynthesisView profile={state.profile} />}
    </div>
  );
}
```

- [ ] **Step 4: Run the subpage suite and the typechecker**

```bash
npx vitest run app/personal-definition
npx tsc --noEmit
```

Expected: all `app/personal-definition` tests PASS. `tsc` reports only the three pre-existing errors in `tests/api/` — no error in `app/personal-definition/`.

- [ ] **Step 5: Run the whole repo suite**

Run: `npm test`

Expected: every suite passes except `tests/db-connection.test.ts`, which needs a live database and fails against the dummy local `.env`. That failure predates this work.

- [ ] **Step 6: Walk the page in a browser**

```bash
npm run dev
```

Open `http://localhost:3000/personal-definition` and check by hand, because none of it is covered by jsdom:

1. Ten rows render collapsed, no text truncates mid-clause at 390px wide. Watch the nine longest items listed in spec §6.5.
2. Answering a row collapses it and expands the next one.
3. The five radios fit on one line at 390px without wrapping.
4. Finishing part 2 shows the teaser with a real zodiac sign and life path number, and a locked MBTI row.
5. The progress bar and mascot stay centred on both a narrow and a wide viewport.

- [ ] **Step 7: Commit**

```bash
git add app/personal-definition/page.tsx app/personal-definition/_components/__tests__/page.test.tsx
git commit -m "Wire the accordion quiz and the halfway teaser into the page"
```

- [ ] **Step 8: Record the outcome**

Append to `.superpowers/sdd/progress.md`: the branch state, the full-suite result, anything found in Step 6 that was not fixed, and the open `RadioButton` `aria-label` question for the Shared-UI owner (spec §4).

```bash
git add .superpowers/sdd/progress.md
git commit -m "Record quiz revamp outcome"
```

**Do not push and do not open a PR.** Khanh opens the PR against `uat`.

---

## Notes for the reviewer

**The risk the spec left open is now closed.** Spec §7 flagged that `mbti.test.ts` or `content.test.ts` might hold a fixture keyed to `tf_03`/`tf_09`. Both files were read while writing this plan: every assertion in `content.test.ts` is an aggregate (counts per dimension, 5/5 keying balance, unique ids, unique text, banned vocabulary), and `mbti.test.ts` reads `i.key` from the bank rather than hardcoding it. The pair swap in Task 1 passes both. The spec text still describes this as unresolved; that is the spec being older than this plan, not a disagreement.

**What is deliberately not covered by tests.** There is no page-level quiz→synthesis integration test. The pre-existing reason is in the ledger: `DatePicker`'s popover does not drive reliably under jsdom, so onboarding cannot be completed in a test. Task 8 Step 6 is the manual substitute; treat it as a required step, not a suggestion.
