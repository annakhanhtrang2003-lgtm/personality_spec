# Personal Definition UI (vertical slice) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Personal Definition worker subpage as a three-screen client flow (onboarding → 40-item quiz → synthesis) that wraps the already-tested deterministic logic and renders results with the existing worker design system.

**Architecture:** One page-level client component drives a `useReducer` state machine across three phases. All computation is client-side via the pure `buildProfile` function — no API route, no DB. The tested logic modules are copied into `app/personal-definition/_lib/` unchanged; three presentational components in `app/personal-definition/_components/` compose `components/worker/ui/` primitives.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, vitest + @testing-library/react (jsdom). No new runtime dependencies.

**Source spec:** `docs/superpowers/specs/2026-07-29-personal-definition-ui-design.md`

## Global Constraints

- **Touch only** `app/personal-definition/**` and the two `docs/superpowers/**` files for this feature. No shared files (`CONTRIBUTING.md` §2, §3).
- **UI composes `components/worker/ui/` only.** No new CSS, no new Tailwind tokens (`CONTRIBUTING.md` §7). Allowed MoMo tokens: `text-worker-primary`, `text-worker-text-secondary`, `bg-worker-bg`, `border-worker-border`, `worker-danger`, `rounded-worker-pill`.
- **Phase 1 anonymous, no DB.** No Prisma model, query, or migration.
- **No LLM, no API route** in this increment. `buildProfile` runs in the browser.
- **`useReducer` for state** — `zustand` is not a repo dependency.
- **All user-facing strings Vietnamese**, warm and casual, never a verdict (`bạn thường…` not `bạn là…`).
- **Branch `feature/personal-definition/ui`.** Commit locally only — **no push, no PR** (`CONTRIBUTING.md` §5). Khanh reviews, then opens the PR targeting `uat`.
- **Next 16 caveat:** before writing `layout.tsx`/`page.tsx`, skim `node_modules/next/dist/docs/` — this repo's Next has breaking changes vs. training data (`AGENTS.md`).
- **Logic source of truth:** the finished, tested modules live at
  `C:\Users\KHANH TRANG\Desktop\personality_spec\lib\personal-definition\`.
  They are copied in Task 1 and **must not be edited** afterward — they carry
  their own 115-test safety net.

## File Structure

```
app/personal-definition/
├── layout.tsx                     # Task 3 — WorkerHeader/Footer shell
├── page.tsx                       # Task 3 — 'use client', reducer, phase router
├── _components/
│   ├── OnboardingForm.tsx         # Task 4
│   ├── QuizItem.tsx               # Task 5
│   └── SynthesisView.tsx          # Task 6
└── _lib/
    ├── types.ts date.ts normalize.ts zodiac.ts numerology.ts mbti.ts profile.ts   # Task 1 (copied)
    ├── data/*.json (6 files)      # Task 1 (copied)
    ├── __tests__/*.test.ts (8)    # Task 1 (copied)
    ├── likert.ts                  # Task 2 — 5-point scale option table
    └── state.ts                   # Task 2 — reducer, initial state, validation
```

The reducer and Likert table are pure and live in `_lib` so they are unit-tested without rendering. The three components are controlled (props in, callbacks out) so each is tested in isolation.

## Task Order

Tasks are sequential: Task 1 brings the logic in; Task 2 builds the pure state machine on top of its types; Task 3 stands up the route and wires the reducer with placeholder markup; Tasks 4–6 build the three screens; Task 7 wires them into the page and adds the end-to-end test.

---

### Task 1: Bring in the tested logic layer

**Files:**
- Create: `app/personal-definition/_lib/{types,date,normalize,zodiac,numerology,mbti,profile}.ts` (copied)
- Create: `app/personal-definition/_lib/data/*.json` (6 files, copied)
- Create: `app/personal-definition/_lib/__tests__/*.test.ts` (8 files, copied)

**Interfaces:**
- Consumes: nothing (logic is self-contained; imports only from within `_lib` and `vitest` in tests).
- Produces: `buildProfile(input: BuildProfileInput): PersonalProfile`, `scoreMBTI`, `calculateZodiac`, `calculateNumerology`, plus the types `Response = -2 | -1 | 0 | 1 | 2`, `PersonalProfile`, `MBTIResult`, `ZodiacResult`, `NumerologyResult`. `BuildProfileInput = { name: string; university: string; birth_date: string; full_name: string; responses: Response[] }`. Every later task imports from here.

- [ ] **Step 1: Copy the logic tree in**

Run (Git Bash):
```bash
mkdir -p "/d/projects/merchant_job_board/app/personal-definition/_lib"
cp -r "/c/Users/KHANH TRANG/Desktop/personality_spec/lib/personal-definition/." \
      "/d/projects/merchant_job_board/app/personal-definition/_lib/"
```
Expected: `_lib/` now holds 7 `.ts` modules, `data/` with 6 JSON files, and `__tests__/` with 8 test files.

- [ ] **Step 2: Run the copied tests under the repo's vitest**

Run: `cd /d/projects/merchant_job_board && npx vitest run app/personal-definition`
Expected: **115 tests pass**. The repo's `vitest.config.ts` has no `include` restriction, so co-located tests are picked up automatically; `globals: true` makes the explicit `vitest` imports redundant but harmless.

- [ ] **Step 3: Typecheck the whole repo**

Run: `npx tsc --noEmit`
Expected: exit 0. The repo `tsconfig` has `resolveJsonModule: true` and is *less* strict than the source (`noUncheckedIndexedAccess` off), so code written under the stricter config still compiles.

- [ ] **Step 4: Commit**

```bash
git add app/personal-definition/_lib
git commit -m "feat(personal-definition): bring in tested deterministic logic layer"
```

---

### Task 2: Likert scale and the pure state machine

**Files:**
- Create: `app/personal-definition/_lib/likert.ts`
- Create: `app/personal-definition/_lib/state.ts`
- Test: `app/personal-definition/_lib/__tests__/state.test.ts`

**Interfaces:**
- Consumes: `Response`, `PersonalProfile`, `buildProfile` from `_lib`.
- Produces:
  - `LIKERT: { value: Response; label: string }[]` (length 5).
  - `QUESTION_COUNT = 40`.
  - `initialState: State`, `reducer(state: State, action: Action): State`, `validateInput(input: Input): InputErrors`.
  - Types `Phase`, `Input`, `InputErrors`, `State`, `Action`.

- [ ] **Step 1: Write `likert.ts`**

```typescript
import type { Response } from "./types";

/** 5-point agreement scale, shown most-agree first. */
export const LIKERT: { value: Response; label: string }[] = [
  { value: 2, label: "Rất đúng với mình" },
  { value: 1, label: "Khá đúng" },
  { value: 0, label: "Cũng bình thường" },
  { value: -1, label: "Không hẳn" },
  { value: -2, label: "Hoàn toàn không" },
];

export const QUESTION_COUNT = 40;
```

- [ ] **Step 2: Write the failing state tests**

```typescript
import { describe, it, expect } from "vitest";
import { initialState, reducer, validateInput } from "../state";
import { QUESTION_COUNT } from "../likert";
import type { Response } from "../types";

const validInput = {
  name: "Khánh",
  full_name: "Nguyễn Thị Khánh Trang",
  university: "ueh",
  birth_date: "2003-06-15",
};

const answered = (): (Response | null)[] =>
  Array.from({ length: QUESTION_COUNT }, () => 0 as Response);

describe("validateInput", () => {
  it("passes a complete, valid input", () => {
    expect(validateInput(validInput)).toEqual({});
  });

  it("flags empty name and full name", () => {
    const e = validateInput({ ...validInput, name: "  ", full_name: "" });
    expect(e.name).toBeTruthy();
    expect(e.full_name).toBeTruthy();
  });

  it("flags an unselected university", () => {
    expect(validateInput({ ...validInput, university: "" }).university).toBeTruthy();
  });

  it("flags a missing or future birth date", () => {
    expect(validateInput({ ...validInput, birth_date: "" }).birth_date).toBeTruthy();
    expect(validateInput({ ...validInput, birth_date: "2999-01-01" }).birth_date).toBeTruthy();
  });

  it("flags a name with no mappable letters", () => {
    expect(validateInput({ ...validInput, full_name: "123 !!!" }).full_name).toBeTruthy();
  });
});

describe("reducer", () => {
  it("starts in onboarding with 40 empty responses", () => {
    expect(initialState.phase).toBe("onboarding");
    expect(initialState.responses).toHaveLength(QUESTION_COUNT);
    expect(initialState.responses.every((r) => r === null)).toBe(true);
  });

  it("SET_INPUT updates one field", () => {
    const s = reducer(initialState, { type: "SET_INPUT", field: "name", value: "An" });
    expect(s.input.name).toBe("An");
  });

  it("START_QUIZ is blocked while input is invalid", () => {
    const s = reducer(initialState, { type: "START_QUIZ" });
    expect(s.phase).toBe("onboarding");
  });

  it("START_QUIZ enters the quiz once input is valid", () => {
    let s = initialState;
    for (const [field, value] of Object.entries(validInput)) {
      s = reducer(s, { type: "SET_INPUT", field: field as keyof typeof validInput, value });
    }
    s = reducer(s, { type: "START_QUIZ" });
    expect(s.phase).toBe("quiz");
    expect(s.current).toBe(0);
  });

  it("ANSWER records a response and GOTO moves the cursor", () => {
    let s = reducer(initialState, { type: "ANSWER", index: 0, value: 2 });
    expect(s.responses[0]).toBe(2);
    s = reducer(s, { type: "GOTO", index: 5 });
    expect(s.current).toBe(5);
  });

  it("FINISH is blocked until all 40 are answered", () => {
    const partial = { ...initialState, phase: "quiz" as const };
    expect(reducer(partial, { type: "FINISH" }).phase).toBe("quiz");
  });

  it("FINISH computes the profile and enters synthesis", () => {
    const ready = {
      ...initialState,
      phase: "quiz" as const,
      input: validInput,
      responses: answered(),
    };
    const s = reducer(ready, { type: "FINISH" });
    expect(s.phase).toBe("synthesis");
    expect(s.profile).not.toBeNull();
    expect(s.profile!.mbti.type).toBe("INFP"); // all-neutral → declared defaults
  });
});
```

- [ ] **Step 3: Run to verify they fail**

Run: `npx vitest run app/personal-definition/_lib/__tests__/state.test.ts`
Expected: FAIL — `Failed to resolve import "../state"`.

- [ ] **Step 4: Implement `state.ts`**

```typescript
import type { PersonalProfile, Response } from "./types";
import { buildProfile } from "./profile";
import { normalizeVietnamese } from "./normalize";
import { QUESTION_COUNT } from "./likert";

export type Phase = "onboarding" | "quiz" | "synthesis";

export interface Input {
  name: string;
  full_name: string;
  university: string;
  birth_date: string; // YYYY-MM-DD
}

export type InputErrors = Partial<Record<keyof Input, string>>;

export interface State {
  phase: Phase;
  input: Input;
  responses: (Response | null)[];
  current: number;
  profile: PersonalProfile | null;
}

export type Action =
  | { type: "SET_INPUT"; field: keyof Input; value: string }
  | { type: "START_QUIZ" }
  | { type: "ANSWER"; index: number; value: Response }
  | { type: "GOTO"; index: number }
  | { type: "FINISH" };

export const initialState: State = {
  phase: "onboarding",
  input: { name: "", full_name: "", university: "", birth_date: "" },
  responses: Array.from({ length: QUESTION_COUNT }, () => null),
  current: 0,
  profile: null,
};

/** Pure validation shared by the form (for messages) and the START_QUIZ guard. */
export function validateInput(input: Input): InputErrors {
  const errors: InputErrors = {};
  if (!input.name.trim()) errors.name = "Cho mình biết tên bạn nhé.";
  if (!input.full_name.trim()) {
    errors.full_name = "Điền họ tên đầy đủ giúp mình.";
  } else if (normalizeVietnamese(input.full_name).length === 0) {
    errors.full_name = "Tên cần có chữ cái để tính được con số của bạn.";
  }
  if (!input.university) errors.university = "Chọn trường của bạn.";
  if (!input.birth_date) {
    errors.birth_date = "Chọn ngày sinh của bạn.";
  } else {
    const d = new Date(input.birth_date + "T00:00:00");
    if (Number.isNaN(d.getTime()) || d.getTime() > Date.now()) {
      errors.birth_date = "Ngày sinh chưa hợp lệ.";
    }
  }
  return errors;
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_INPUT":
      return { ...state, input: { ...state.input, [action.field]: action.value } };

    case "START_QUIZ":
      if (Object.keys(validateInput(state.input)).length > 0) return state;
      return { ...state, phase: "quiz", current: 0 };

    case "ANSWER": {
      const responses = state.responses.slice();
      responses[action.index] = action.value;
      return { ...state, responses };
    }

    case "GOTO": {
      const current = Math.max(0, Math.min(QUESTION_COUNT - 1, action.index));
      return { ...state, current };
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

- [ ] **Step 5: Run to verify they pass**

Run: `npx vitest run app/personal-definition/_lib/__tests__/state.test.ts`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add app/personal-definition/_lib/likert.ts app/personal-definition/_lib/state.ts app/personal-definition/_lib/__tests__/state.test.ts
git commit -m "feat(personal-definition): Likert scale and pure state machine"
```

---

### Task 3: Route shell and phase-routing page

**Files:**
- Create: `app/personal-definition/layout.tsx`
- Create: `app/personal-definition/page.tsx`
- Test: `app/personal-definition/_components/__tests__/page.test.tsx`

**Interfaces:**
- Consumes: `initialState`, `reducer` from `_lib/state`.
- Produces: the default-exported `PersonalDefinitionPage`. Renders placeholder text per phase for now; Tasks 4–7 replace the placeholders with real components.

- [ ] **Step 1: Write `layout.tsx`** (server component, mirrors `app/careerpath/layout.tsx`)

```tsx
import { Suspense } from "react";
import { WorkerHeader } from "@/components/WorkerHeader";
import { WorkerFooter } from "@/components/WorkerFooter";

export default function PersonalDefinitionLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-momo-trust">
      <Suspense fallback={null}>
        <WorkerHeader />
      </Suspense>
      <main className="pt-[60px] bg-worker-bg min-h-screen">{children}</main>
      <WorkerFooter />
    </div>
  );
}
```

- [ ] **Step 2: Write the failing page test**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PersonalDefinitionPage from "../../page";

describe("PersonalDefinitionPage", () => {
  it("opens in the onboarding phase", () => {
    render(<PersonalDefinitionPage />);
    expect(screen.getByText(/onboarding/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx vitest run app/personal-definition/_components/__tests__/page.test.tsx`
Expected: FAIL — cannot resolve `../../page`.

- [ ] **Step 4: Write `page.tsx`** (placeholder markup per phase)

```tsx
"use client";

import { useReducer } from "react";
import { initialState, reducer } from "./_lib/state";

export default function PersonalDefinitionPage() {
  const [state] = useReducer(reducer, initialState);

  return (
    <div className="px-5 py-6 max-w-[600px] mx-auto">
      {state.phase === "onboarding" && <p>onboarding</p>}
      {state.phase === "quiz" && <p>quiz</p>}
      {state.phase === "synthesis" && <p>synthesis</p>}
    </div>
  );
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run app/personal-definition/_components/__tests__/page.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/personal-definition/layout.tsx app/personal-definition/page.tsx app/personal-definition/_components/__tests__/page.test.tsx
git commit -m "feat(personal-definition): route shell and phase-routing page skeleton"
```

---

### Task 4: OnboardingForm

**Files:**
- Create: `app/personal-definition/_components/OnboardingForm.tsx`
- Test: `app/personal-definition/_components/__tests__/OnboardingForm.test.tsx`

**Interfaces:**
- Consumes: `Input`, `InputErrors` from `_lib/state`; `universities.json`; `TextInput`, `Select`, `DatePicker`, `Button`, `Callout` from `@/components/worker/ui`.
- Produces: `OnboardingForm` with props
  `{ input: Input; errors: InputErrors; onChange: (field: keyof Input, value: string) => void; onSubmit: () => void }`.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OnboardingForm } from "../OnboardingForm";
import type { Input } from "../../_lib/state";

const emptyInput: Input = { name: "", full_name: "", university: "", birth_date: "" };

describe("OnboardingForm", () => {
  it("renders a university option sourced from the data file", () => {
    render(<OnboardingForm input={emptyInput} errors={{}} onChange={() => {}} onSubmit={() => {}} />);
    // UEH is the first university id in the data file.
    expect(screen.getByRole("option", { name: /Kinh tế TP\.HCM/i })).toBeInTheDocument();
  });

  it("shows an error message when one is passed", () => {
    render(
      <OnboardingForm
        input={emptyInput}
        errors={{ name: "Cho mình biết tên bạn nhé." }}
        onChange={() => {}}
        onSubmit={() => {}}
      />,
    );
    expect(screen.getByText("Cho mình biết tên bạn nhé.")).toBeInTheDocument();
  });

  it("calls onChange when the display name is typed", () => {
    const onChange = vi.fn();
    render(<OnboardingForm input={emptyInput} errors={{}} onChange={onChange} onSubmit={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText(/tên bạn muốn hiển thị/i), {
      target: { value: "An" },
    });
    expect(onChange).toHaveBeenCalledWith("name", "An");
  });

  it("calls onSubmit when the submit button is clicked", () => {
    const onSubmit = vi.fn();
    render(<OnboardingForm input={emptyInput} errors={{}} onChange={() => {}} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: /bắt đầu/i }));
    expect(onSubmit).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run app/personal-definition/_components/__tests__/OnboardingForm.test.tsx`
Expected: FAIL — cannot resolve `../OnboardingForm`.

- [ ] **Step 3: Implement `OnboardingForm.tsx`**

```tsx
"use client";

import { TextInput } from "@/components/worker/ui/TextInput";
import { Select } from "@/components/worker/ui/Select";
import { DatePicker } from "@/components/worker/ui/DatePicker";
import { Button } from "@/components/worker/ui/Button";
import { Callout } from "@/components/worker/ui/Callout";
import universities from "../_lib/data/universities.json";
import type { Input, InputErrors } from "../_lib/state";

type Props = {
  input: Input;
  errors: InputErrors;
  onChange: (field: keyof Input, value: string) => void;
  onSubmit: () => void;
};

// 'other' always sorts last so a student whose school is missing is never blocked.
const OPTIONS = [...(universities as { id: string; name: string }[])]
  .sort((a, b) => (a.id === "other" ? 1 : b.id === "other" ? -1 : 0))
  .map((u) => ({ value: u.id, label: u.name }));

function isoToDate(iso: string): Date | null {
  if (!iso) return null;
  const d = new Date(iso + "T00:00:00");
  return Number.isNaN(d.getTime()) ? null : d;
}

function dateToIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function OnboardingForm({ input, errors, onChange, onSubmit }: Props) {
  return (
    <div>
      <h1 className="text-[26px] font-medium text-worker-primary mb-1">Khám phá bản thân</h1>
      <p className="text-sm text-worker-text-secondary mb-6">
        Vài thông tin nhỏ để bắt đầu — không lưu lại đâu, chỉ dùng cho lần này thôi.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="flex flex-col gap-4"
      >
        <div>
          <TextInput
            value={input.name}
            onChange={(v) => onChange("name", v)}
            placeholder="Tên bạn muốn hiển thị"
          />
          {errors.name && <p className="text-xs text-worker-danger mt-1">{errors.name}</p>}
        </div>

        <div>
          <TextInput
            value={input.full_name}
            onChange={(v) => onChange("full_name", v)}
            placeholder="Họ tên đầy đủ như trên giấy khai sinh"
          />
          {errors.full_name && <p className="text-xs text-worker-danger mt-1">{errors.full_name}</p>}
        </div>

        <Select
          label="Trường của bạn"
          value={input.university}
          onChange={(v) => onChange("university", v)}
          options={OPTIONS}
          placeholder="Chọn trường"
          error={errors.university}
        />

        <div>
          <DatePicker
            label="Ngày sinh"
            value={isoToDate(input.birth_date)}
            onChange={(d) => onChange("birth_date", dateToIso(d))}
          />
          {errors.birth_date && <p className="text-xs text-worker-danger mt-1">{errors.birth_date}</p>}
        </div>

        <Button type="submit">Bắt đầu</Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run app/personal-definition/_components/__tests__/OnboardingForm.test.tsx`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add app/personal-definition/_components/OnboardingForm.tsx app/personal-definition/_components/__tests__/OnboardingForm.test.tsx
git commit -m "feat(personal-definition): onboarding form"
```

---

### Task 5: QuizItem

**Files:**
- Create: `app/personal-definition/_components/QuizItem.tsx`
- Test: `app/personal-definition/_components/__tests__/QuizItem.test.tsx`

**Interfaces:**
- Consumes: `Response` from `_lib/types`; `LIKERT`, `QUESTION_COUNT` from `_lib/likert`; `Choicebox`, `ProgressBar`, `Button` from `@/components/worker/ui`.
- Produces: `QuizItem` with props
  `{ text: string; index: number; value: Response | null; onAnswer: (v: Response) => void; onBack: () => void; onNext: () => void; onFinish: () => void }`.
  The last item (`index === QUESTION_COUNT - 1`) shows a "Xem kết quả" button that calls `onFinish`; earlier items show "Tiếp" calling `onNext`, disabled until answered. "Quay lại" calls `onBack` and is hidden on the first item.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QuizItem } from "../QuizItem";

const base = {
  text: "Ở chỗ đông người, tôi thường là người bắt chuyện trước.",
  value: null,
  onAnswer: () => {},
  onBack: () => {},
  onNext: () => {},
  onFinish: () => {},
};

describe("QuizItem", () => {
  it("shows the statement and five options", () => {
    render(<QuizItem {...base} index={0} />);
    expect(screen.getByText(base.text)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Rất đúng với mình/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Hoàn toàn không/i })).toBeInTheDocument();
  });

  it("reports the chosen Likert value", () => {
    const onAnswer = vi.fn();
    render(<QuizItem {...base} index={0} onAnswer={onAnswer} />);
    fireEvent.click(screen.getByRole("button", { name: /Khá đúng/i }));
    expect(onAnswer).toHaveBeenCalledWith(1);
  });

  it("disables Tiếp until an option is chosen", () => {
    const { rerender } = render(<QuizItem {...base} index={0} value={null} />);
    expect(screen.getByRole("button", { name: /Tiếp/i })).toBeDisabled();
    rerender(<QuizItem {...base} index={0} value={2} />);
    expect(screen.getByRole("button", { name: /Tiếp/i })).toBeEnabled();
  });

  it("hides Quay lại on the first item", () => {
    render(<QuizItem {...base} index={0} />);
    expect(screen.queryByRole("button", { name: /Quay lại/i })).toBeNull();
  });

  it("shows Xem kết quả on the last item and calls onFinish", () => {
    const onFinish = vi.fn();
    render(<QuizItem {...base} index={39} value={0} onFinish={onFinish} />);
    fireEvent.click(screen.getByRole("button", { name: /Xem kết quả/i }));
    expect(onFinish).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run app/personal-definition/_components/__tests__/QuizItem.test.tsx`
Expected: FAIL — cannot resolve `../QuizItem`.

- [ ] **Step 3: Implement `QuizItem.tsx`**

```tsx
"use client";

import { Choicebox } from "@/components/worker/ui/Choicebox";
import { ProgressBar } from "@/components/worker/ui/ProgressBar";
import { Button } from "@/components/worker/ui/Button";
import { LIKERT, QUESTION_COUNT } from "../_lib/likert";
import type { Response } from "../_lib/types";

type Props = {
  text: string;
  index: number;
  value: Response | null;
  onAnswer: (v: Response) => void;
  onBack: () => void;
  onNext: () => void;
  onFinish: () => void;
};

export function QuizItem({ text, index, value, onAnswer, onBack, onNext, onFinish }: Props) {
  const isLast = index === QUESTION_COUNT - 1;
  const answered = value !== null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <ProgressBar value={((index + 1) / QUESTION_COUNT) * 100} />
        <p className="text-xs text-worker-text-secondary">
          Câu {index + 1}/{QUESTION_COUNT}
        </p>
      </div>

      <p className="text-lg font-medium text-worker-primary">{text}</p>

      <div className="flex flex-col gap-2">
        {LIKERT.map((opt) => (
          <Choicebox key={opt.value} selected={value === opt.value} onClick={() => onAnswer(opt.value)}>
            {opt.label}
          </Choicebox>
        ))}
      </div>

      <div className="flex justify-between gap-2">
        {index > 0 ? (
          <Button variant="secondary" onClick={onBack}>
            Quay lại
          </Button>
        ) : (
          <span />
        )}
        {isLast ? (
          <Button onClick={onFinish} disabled={!answered}>
            Xem kết quả
          </Button>
        ) : (
          <Button onClick={onNext} disabled={!answered}>
            Tiếp
          </Button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run app/personal-definition/_components/__tests__/QuizItem.test.tsx`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add app/personal-definition/_components/QuizItem.tsx app/personal-definition/_components/__tests__/QuizItem.test.tsx
git commit -m "feat(personal-definition): quiz item screen"
```

---

### Task 6: SynthesisView

**Files:**
- Create: `app/personal-definition/_components/SynthesisView.tsx`
- Test: `app/personal-definition/_components/__tests__/SynthesisView.test.tsx`

**Interfaces:**
- Consumes: `PersonalProfile` from `_lib/types`; `Chips`, `Callout` from `@/components/worker/ui`.
- Produces: `SynthesisView` with props `{ profile: PersonalProfile }`.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SynthesisView } from "../SynthesisView";
import { buildProfile } from "../../_lib/profile";
import { QUESTION_COUNT } from "../../_lib/likert";
import type { Response } from "../../_lib/types";

const profile = buildProfile({
  name: "Khánh",
  university: "ueh",
  birth_date: "2003-06-15",
  full_name: "Nguyễn Thị Khánh Trang",
  responses: Array.from({ length: QUESTION_COUNT }, () => 0 as Response),
});

describe("SynthesisView", () => {
  it("shows the MBTI type", () => {
    render(<SynthesisView profile={profile} />);
    expect(screen.getByText(profile.mbti.type)).toBeInTheDocument();
  });

  it("renders the narrative including its caveat", () => {
    render(<SynthesisView profile={profile} />);
    expect(screen.getByText(/không phải toàn bộ con người bạn/)).toBeInTheDocument();
  });

  it("shows the sun sign and life path number", () => {
    render(<SynthesisView profile={profile} />);
    // sun_sign ("Song Tử") is unique; the life-path number is matched with its
    // label so it does not collide with the other numerology numbers on screen.
    expect(screen.getByText(new RegExp(`Cung ${profile.zodiac.sun_sign}`))).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(`Số Chủ Đạo ${profile.numerology.life_path}`)),
    ).toBeInTheDocument();
  });

  it("lists at least one career hint", () => {
    render(<SynthesisView profile={profile} />);
    expect(screen.getByText(profile.synthesis.career_hints[0]!)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run app/personal-definition/_components/__tests__/SynthesisView.test.tsx`
Expected: FAIL — cannot resolve `../SynthesisView`.

- [ ] **Step 3: Implement `SynthesisView.tsx`**

```tsx
"use client";

import { Chips } from "@/components/worker/ui/Chips";
import type { PersonalProfile } from "../_lib/types";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xs font-medium text-worker-text-secondary uppercase">{title}</h2>
      {children}
    </section>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-1.5 list-disc list-inside">
      {items.map((it) => (
        <li key={it} className="text-sm text-worker-primary">{it}</li>
      ))}
    </ul>
  );
}

export function SynthesisView({ profile }: { profile: PersonalProfile }) {
  const { mbti, zodiac, numerology, synthesis, user } = profile;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-sm text-worker-text-secondary">{user.name}</p>
        <h1 className="text-[26px] font-medium text-worker-primary">{mbti.type}</h1>
        <p className="text-base text-worker-primary mt-3">{synthesis.narrative}</p>
      </div>

      <Section title="Điểm mạnh">
        <List items={synthesis.strengths} />
      </Section>

      <Section title="Có thể để ý thêm">
        <List items={synthesis.growth_areas} />
      </Section>

      <Section title="Từ khóa">
        <div className="flex flex-wrap gap-2">
          {synthesis.personality_keywords.map((k) => (
            <Chips key={k} label={k} variant="outline" size="sm" />
          ))}
        </div>
      </Section>

      <Section title="Hướng nghề gợi mở">
        <List items={synthesis.career_hints} />
      </Section>

      <Section title={`Cung ${zodiac.sun_sign}`}>
        <p className="text-sm text-worker-primary">{zodiac.traits.join(" · ")}</p>
      </Section>

      <Section title="Thần số học">
        <div className="flex flex-col gap-2 text-sm text-worker-primary">
          <p>Số Chủ Đạo {numerology.life_path}: {numerology.interpretations.life_path}</p>
          <p>Số Sứ Mệnh {numerology.expression}: {numerology.interpretations.expression}</p>
          <p>Số Linh Hồn {numerology.soul_urge}: {numerology.interpretations.soul_urge}</p>
          <p>Số Nhân Cách {numerology.personality}: {numerology.interpretations.personality}</p>
        </div>
      </Section>
    </div>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run app/personal-definition/_components/__tests__/SynthesisView.test.tsx`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add app/personal-definition/_components/SynthesisView.tsx app/personal-definition/_components/__tests__/SynthesisView.test.tsx
git commit -m "feat(personal-definition): synthesis result screen"
```

---

### Task 7: Wire the page and test the full flow

**Files:**
- Modify: `app/personal-definition/page.tsx`
- Modify: `app/personal-definition/_components/__tests__/page.test.tsx`

**Interfaces:**
- Consumes: `OnboardingForm`, `QuizItem`, `SynthesisView`; `initialState`, `reducer`, `validateInput` from `_lib/state`; `questions.json` for item text.
- Produces: the finished page — no new exports.

- [ ] **Step 1: Replace `page.tsx` with the wired version**

```tsx
"use client";

import { useReducer, useState } from "react";
import { initialState, reducer, validateInput } from "./_lib/state";
import type { Input } from "./_lib/state";
import { OnboardingForm } from "./_components/OnboardingForm";
import { QuizItem } from "./_components/QuizItem";
import { SynthesisView } from "./_components/SynthesisView";
import bank from "./_lib/data/questions.json";

const ITEMS = (bank as { items: { text: string }[] }).items;

export default function PersonalDefinitionPage() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [showErrors, setShowErrors] = useState(false);

  const errors = showErrors ? validateInput(state.input) : {};

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
        <QuizItem
          text={ITEMS[state.current]!.text}
          index={state.current}
          value={state.responses[state.current]}
          onAnswer={(v) => dispatch({ type: "ANSWER", index: state.current, value: v })}
          onBack={() => dispatch({ type: "GOTO", index: state.current - 1 })}
          onNext={() => dispatch({ type: "GOTO", index: state.current + 1 })}
          onFinish={() => dispatch({ type: "FINISH" })}
        />
      )}

      {state.phase === "synthesis" && state.profile && <SynthesisView profile={state.profile} />}
    </div>
  );
}
```

- [ ] **Step 2: Replace the page test with the wired-flow guard test**

The `DatePicker` is a calendar popover that is awkward to drive in jsdom, so the
full quiz→synthesis path is left to the layers that already cover it:
`state.test.ts` (Task 2) proves the `FINISH` transition, and the three component
suites prove their screens. This page test covers only what those cannot — that
the page mounts in onboarding and that its submit **guard** blocks an invalid
start with a visible message.

```tsx
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PersonalDefinitionPage from "../../page";

describe("PersonalDefinitionPage", () => {
  it("opens in onboarding and blocks an empty submit with a message", () => {
    render(<PersonalDefinitionPage />);
    expect(screen.getByPlaceholderText(/tên bạn muốn hiển thị/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /bắt đầu/i }));
    expect(screen.getByText(/Cho mình biết tên bạn/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run the page test**

Run: `npx vitest run app/personal-definition/_components/__tests__/page.test.tsx`
Expected: PASS. (End-to-end quiz→synthesis behaviour is covered by `state.test.ts`; the individual screens by their own component tests.)

- [ ] **Step 4: Run the whole subpage suite and typecheck**

Run: `npx vitest run app/personal-definition && npx tsc --noEmit`
Expected: every test green (115 logic + state + component tests), tsc exit 0.

- [ ] **Step 5: Verify it renders in the real app**

Run: `npm run dev`, open `http://localhost:3000/personal-definition`.
Expected: onboarding form renders inside the worker header/footer shell; filling it and answering 40 items reaches the synthesis screen. (Manual check — not automated. Requires `.env` per `.env.example`; the page itself makes no DB/network call, so a missing DB does not block it.)

- [ ] **Step 6: Commit**

```bash
git add app/personal-definition/page.tsx app/personal-definition/_components/__tests__/page.test.tsx
git commit -m "feat(personal-definition): wire onboarding, quiz and synthesis into the page"
```

---

## Definition of Done

- [ ] `npx vitest run app/personal-definition` green — 115 logic tests plus state, page, and three component suites.
- [ ] `npx tsc --noEmit` clean.
- [ ] `git diff --stat main...HEAD` touches only `app/personal-definition/**` and the two `docs/superpowers/**` files (`CONTRIBUTING.md` §6 checklist).
- [ ] No file under `lib/`, `components/`, `prisma/`, or any other cluster modified.
- [ ] No Prisma/DB code, no API route, no `@anthropic-ai/sdk` or `openai` import.
- [ ] `git log` shows local commits only — nothing pushed, no PR opened (Khanh does that, targeting `uat`).
- [ ] Manual: `/personal-definition` completes onboarding → 40 items → synthesis in the running app.

## What this plan does not cover (next increment)

- Separate zodiac and numerology reveal screens (logic-spec §6 phases 1–2). Their data already shows inside synthesis.
- The shareable result card: Web Share, PNG download, OG-image route. No OG pattern exists in the repo and Next 16 changes the API — it earns its own spec + plan.
- Auto-advance on selection (the current flow uses an explicit "Tiếp" button, which is simpler and fully testable). Add later if desired.
- Persistence / accounts — blocked on Phase 2 login (`CONTRIBUTING.md` §7).
