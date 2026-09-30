# Personal Definition — Onboarding Revamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an intro screen (hero + 4-card quiz preview) in front of the personality test, restyle the form to match, regroup the 40 questions so part N = dimension N, theme each quiz part with its dimension's colour and mascot, and make the route headerless.

**Architecture:** One new reducer phase (`intro`) and one new action (`START_FORM`); the existing `BACK` gains an `onboarding → intro` case. A single table, `_lib/partTheme.ts`, is the source of per-part colours, letter pairs and mascots for both the preview cards and the quiz header. Intro and form render full-bleed outside the page's 600px container; quiz/interlude/synthesis stay inside it.

**Tech Stack:** Next 16.2.9 (App Router, `'use client'` page), React 19, Tailwind v4, Vitest 4 + jsdom + @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-09-30-personal-definition-onboarding-design.md`

## Global Constraints

- Repo: `D:\projects\merchant_job_board`, branch `feature/personal-definition/ui`. Commit locally after each task. **Never push, never open a PR** (CONTRIBUTING §5).
- Only touch files under `app/personal-definition/` and `docs/superpowers/`. Nothing in `components/`, `public/`, `app/page.tsx`, or any shared file.
- Form inputs stay `components/worker/ui/` (`TextInput`, `Select`). No shared component is modified.
- Style exception (spec §7) is scoped to: `_components/onboarding/*`, the `OnboardingForm` frame, the `QuizPart` header block. Prototype palette via Tailwind arbitrary values; per-part colours via inline `style` read from `partTheme`; one CSS module `onboarding.module.css` for keyframes and the classes that apply them. No global CSS, no new fonts — keep `font-momo-trust`.
- No new npm dependencies.
- Vietnamese copy is copied **verbatim** from this plan. Do not rephrase.
- Every animation is disabled under `prefers-reduced-motion: reduce`.
- Commit message trailer goes on its **own line at the end of the body**, never on the subject line:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- Test command: `npx vitest run app/personal-definition`. Typecheck: `npx tsc --noEmit` — the only acceptable errors are the 3 pre-existing ones under `tests/api/`.
- Env is already set up (`npm install`, dummy `.env`, `npx prisma generate`). If `tsc` complains about Prisma types, run `npx prisma generate` again.

## Review Focus

1. **Round trip intro ↔ form keeps a completed birth date.** `OnboardingForm` unmounts on `BACK` and seeds day/month/year from `input.birth_date` on remount — a full date must reappear in the three selects. (A half-picked date emits `""` and is lost; that is accepted and documented in a code comment.) Test in Task 6.
2. **Hero CTA where `scrollIntoView` is missing** (jsdom, old WebViews): clicking must not throw and must not change phase. Test in Task 4.
3. **Short viewports** (iPhone SE landscape, 320×568): hero uses `min-h-[100svh]`, never a fixed `h-`, so content is never clipped. Test in Task 4.
4. **Keyboard users on the carousel:** track is focusable, each dot is a labelled button with `aria-current`, and a dot works where `Element.scrollTo` is missing. Test in Task 4.
5. **Screen change intro → form scrolls to top** (student taps "Làm bài test ngay" from far down the page). Test in Task 6.

---

### Task 1: Spec corrections, onboarding assets, `partTheme`

**Files:**
- Modify: `docs/superpowers/specs/2026-09-30-personal-definition-onboarding-design.md` (§5.1, §7)
- Create: `app/personal-definition/_assets/onboarding/{hero,ei,sn,tf,jp}.webp`
- Create: `app/personal-definition/_lib/partTheme.ts`
- Test: `app/personal-definition/_lib/__tests__/partTheme.test.ts`

**Interfaces:**
- Consumes: `ImageAsset`, `srcOf` from `_lib/mascot.ts`; `PART_COUNT` from `_lib/parts.ts`.
- Produces:
  ```ts
  export interface PartTheme {
    letters: readonly [string, string];   // e.g. ["E", "I"]
    poleNames: readonly [string, string]; // from POLE_NAMES, e.g. ["Hướng ngoại", "Hướng nội"]
    mascot: ImageAsset;
    bg: string; ring: string; well: string;
    badge: string; badgeInk: string; chip: string;
  }
  export const PART_THEMES: readonly PartTheme[]; // length PART_COUNT, index = part
  export const HERO_MASCOT: ImageAsset;
  ```

- [ ] **Step 1: Correct the spec**

In §5.1, replace the hero CTA line
`- CTA: "Bắt đầu hành trình của bạn" (pink → rose pill), scrolls to the preview.`
with
`- CTA: "Bắt đầu hành trình của bạn ↓" — dark pill \`#0f172a\` (as in the approved mockup v4), scrolls to the preview. The pink → rose pill is used by "Làm bài test ngay" and the form's "Bắt đầu".`

In §7, replace the "Allowed:" bullet with:
`- Allowed: the intro (\`_components/onboarding/\`), the \`OnboardingForm\` frame, and the \`QuizPart\` header block may use the prototype palette as Tailwind arbitrary values; per-part colours come from \`partTheme\` via inline \`style\` (runtime values cannot be Tailwind classes); one CSS module \`onboarding.module.css\` holds keyframes and the classes that apply them.`

- [ ] **Step 2: Extract the five mascots from the prototype**

The prototype embeds exactly five webp data URIs, in the order hero, E/I card, S/N card, T/F card, J/P card.

Run from the repo root:

```bash
mkdir -p app/personal-definition/_assets/onboarding
node -e "
const fs=require('fs');
const s=fs.readFileSync('D:/download/MVP_MBTI/final UI onboarding.html','utf8');
const m=[...s.matchAll(/data:image\/webp;base64,([A-Za-z0-9+\/=]+)/g)];
if(m.length!==5) throw new Error('expected 5 webps, got '+m.length);
['hero','ei','sn','tf','jp'].forEach((n,i)=>fs.writeFileSync('app/personal-definition/_assets/onboarding/'+n+'.webp',Buffer.from(m[i][1],'base64')));
console.log('ok');
"
ls -la app/personal-definition/_assets/onboarding
```

Expected: `ok`, and five files of roughly 28, 20, 17, 18, 18 KB.

- [ ] **Step 3: Write the failing test**

`app/personal-definition/_lib/__tests__/partTheme.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { PART_THEMES, HERO_MASCOT } from "../partTheme";
import { PART_COUNT } from "../parts";
import { srcOf } from "../mascot";
import { POLE_NAMES } from "../poles";

describe("partTheme", () => {
  it("has exactly one theme per part", () => {
    expect(PART_THEMES).toHaveLength(PART_COUNT);
  });

  it("orders letter pairs EI, SN, TF, JP", () => {
    expect(PART_THEMES.map((t) => t.letters.join(""))).toEqual(["EI", "SN", "TF", "JP"]);
  });

  it("takes pole names from POLE_NAMES so intro, quiz and result agree", () => {
    for (const t of PART_THEMES) {
      expect(t.poleNames).toEqual([POLE_NAMES[t.letters[0]], POLE_NAMES[t.letters[1]]]);
    }
  });

  it("gives every part a distinct mascot, distinct from the hero", () => {
    const srcs = [HERO_MASCOT, ...PART_THEMES.map((t) => t.mascot)].map(srcOf);
    expect(new Set(srcs).size).toBe(5);
  });

  it("uses dark badge ink on amber, where white would fail contrast", () => {
    expect(PART_THEMES[3]!.badge).toBe("#f59e0b");
    expect(PART_THEMES[3]!.badgeInk).toBe("#451a03");
  });
});
```

- [ ] **Step 4: Run it to verify it fails**

Run: `npx vitest run app/personal-definition/_lib/__tests__/partTheme.test.ts`
Expected: FAIL — cannot resolve `../partTheme`.

- [ ] **Step 5: Implement `partTheme.ts`**

`app/personal-definition/_lib/partTheme.ts`:

```ts
import hero from "../_assets/onboarding/hero.webp";
import ei from "../_assets/onboarding/ei.webp";
import sn from "../_assets/onboarding/sn.webp";
import tf from "../_assets/onboarding/tf.webp";
import jp from "../_assets/onboarding/jp.webp";
import type { ImageAsset } from "./mascot";
import { POLE_NAMES } from "./poles";

/**
 * One entry per quiz part — the single source for the intro's preview cards
 * and the quiz part header, so the card a student saw and the screen they
 * land on cannot drift apart. Index = part = dimension (questions.json is
 * grouped EI, SN, TF, JP; see parts.test.ts). Colours are the prototype's
 * `.qp--*` values; they are runtime values, so consumers apply them through
 * inline `style`, not Tailwind classes.
 */
export interface PartTheme {
  letters: readonly [string, string];
  poleNames: readonly [string, string];
  mascot: ImageAsset;
  bg: string;
  ring: string;
  well: string;
  badge: string;
  badgeInk: string;
  chip: string;
}

export const HERO_MASCOT: ImageAsset = hero;

export const PART_THEMES: readonly PartTheme[] = [
  {
    letters: ["E", "I"],
    poleNames: [POLE_NAMES.E!, POLE_NAMES.I!],
    mascot: ei,
    bg: "#fdf2f8",
    ring: "#fbcfe8",
    well: "linear-gradient(135deg, #fbcfe8, #ffe4e6 50%, #ffedd5)",
    badge: "#ec4899",
    badgeInk: "#fff",
    chip: "#db2777",
  },
  {
    letters: ["S", "N"],
    poleNames: [POLE_NAMES.S!, POLE_NAMES.N!],
    mascot: sn,
    bg: "#f5f3ff",
    ring: "#ddd6fe",
    well: "linear-gradient(135deg, #ddd6fe, #e0e7ff 50%, #e0f2fe)",
    badge: "#8b5cf6",
    badgeInk: "#fff",
    chip: "#7c3aed",
  },
  {
    letters: ["T", "F"],
    poleNames: [POLE_NAMES.T!, POLE_NAMES.F!],
    mascot: tf,
    bg: "#f0f9ff",
    ring: "#bae6fd",
    well: "linear-gradient(135deg, #bae6fd, #cffafe 50%, #d1fae5)",
    badge: "#0284c7",
    badgeInk: "#fff",
    chip: "#0369a1",
  },
  {
    letters: ["J", "P"],
    poleNames: [POLE_NAMES.J!, POLE_NAMES.P!],
    mascot: jp,
    bg: "#fffbeb",
    ring: "#fde68a",
    well: "linear-gradient(135deg, #fde68a, #fef9c3 50%, #ecfccb)",
    badge: "#f59e0b",
    // White on #f59e0b fails WCAG AA; the prototype's dark brown passes.
    badgeInk: "#451a03",
    chip: "#b45309",
  },
];
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run app/personal-definition/_lib/__tests__/partTheme.test.ts`
Expected: 5 passed.

- [ ] **Step 7: Typecheck**

Run: `npx tsc --noEmit`
Expected: only the 3 pre-existing `tests/api/` errors (`*.webp` is typed by `next/image-types/global`).

- [ ] **Step 8: Commit**

```bash
git add docs/superpowers/specs/2026-09-30-personal-definition-onboarding-design.md app/personal-definition/_assets/onboarding app/personal-definition/_lib/partTheme.ts app/personal-definition/_lib/__tests__/partTheme.test.ts
git commit -F - <<'EOF'
Add per-part theme table and onboarding mascots

Spec: hero CTA is the mockup's dark pill; inline style allowed for
partTheme colours.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 2: Regroup the question bank by dimension

**Files:**
- Modify: `app/personal-definition/_lib/data/questions.json` (the `items` array, lines 20–70)
- Modify: `app/personal-definition/_lib/parts.ts` (doc comment above `PART_TITLES`)
- Test: `app/personal-definition/_lib/__tests__/parts.test.ts`

**Interfaces:**
- Consumes: `PART_THEMES` from Task 1; `indicesOfPart`, `PART_COUNT` from `parts.ts`.
- Produces: `questions.json` items in order EI (0–9), SN (10–19), TF (20–29), JP (30–39), each dimension in its previous relative order.

- [ ] **Step 1: Write the failing tests**

Append to `app/personal-definition/_lib/__tests__/parts.test.ts` (add the two imports at the top of the file with the others):

```ts
import bank from "../data/questions.json";
import { PART_THEMES } from "../partTheme";
```

```ts
describe("parts are dimensions", () => {
  const ITEMS = (bank as { items: { id: string; dimension: string; key: number }[] }).items;
  const ORDER = ["EI", "SN", "TF", "JP"];

  it("gives each part exactly one dimension, in EI, SN, TF, JP order", () => {
    for (let p = 0; p < PART_COUNT; p++) {
      const dims = new Set(indicesOfPart(p).map((i) => ITEMS[i]!.dimension));
      expect([...dims]).toEqual([ORDER[p]]);
    }
  });

  it("balances five items per pole in every part", () => {
    for (let p = 0; p < PART_COUNT; p++) {
      const keys = indicesOfPart(p).map((i) => ITEMS[i]!.key);
      expect(keys.filter((k) => k === 1)).toHaveLength(5);
      expect(keys.filter((k) => k === -1)).toHaveLength(5);
    }
  });

  it("keeps each dimension's items in their previous relative order", () => {
    expect(ITEMS.map((i) => i.id)).toEqual([
      "ei_01", "ei_06", "ei_02", "ei_07", "ei_03", "ei_08", "ei_04", "ei_09", "ei_05", "ei_10",
      "sn_06", "sn_01", "sn_07", "sn_02", "sn_08", "sn_03", "sn_09", "sn_04", "sn_10", "sn_05",
      "tf_06", "tf_01", "tf_07", "tf_02", "tf_08", "tf_03", "tf_09", "tf_04", "tf_10", "tf_05",
      "jp_01", "jp_06", "jp_02", "jp_07", "jp_03", "jp_08", "jp_04", "jp_09", "jp_05", "jp_10",
    ]);
  });

  it("matches the preview card letters to the part's dimension", () => {
    expect(PART_THEMES.map((t) => t.letters.join(""))).toEqual(ORDER);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run app/personal-definition/_lib/__tests__/parts.test.ts`
Expected: the first three new tests FAIL (items still rotate EI/SN/TF/JP); the letters test passes.

- [ ] **Step 3: Reorder the items (line-level, keeps the file's hand formatting)**

`questions.json` is hand-formatted (one item per line), so do **not** round-trip it through `JSON.stringify`. From the repo root:

```bash
node -e "
const fs=require('fs');
const p='app/personal-definition/_lib/data/questions.json';
const src=fs.readFileSync(p,'utf8');
const lines=src.split('\n');
const start=lines.findIndex(l=>/^\s*\"items\": \[/.test(l));
const end=lines.findIndex((l,i)=>i>start && /^\s*\]/.test(l));
const items=lines.slice(start+1,end).filter(l=>/^\s*\{ \"id\"/.test(l)).map(l=>l.replace(/,\s*$/,''));
if(items.length!==40) throw new Error('expected 40 item lines, got '+items.length);
const order=['EI','SN','TF','JP'];
const dim=l=>l.match(/\"dimension\": \"(\w+)\"/)[1];
const groups=order.map(d=>items.filter(l=>dim(l)===d));
const body=groups.map(g=>g.join(',\n')).join(',\n\n');
fs.writeFileSync(p,[...lines.slice(0,start+1),body,...lines.slice(end)].join('\n'));
console.log('ok');
"
node -e "JSON.parse(require('fs').readFileSync('app/personal-definition/_lib/data/questions.json','utf8'));console.log('valid')"
git diff --stat app/personal-definition/_lib/data/questions.json
```

Expected: `ok`, `valid`. The diff touches only lines inside `items`.

- [ ] **Step 4: Rewrite the `PART_TITLES` doc comment in `parts.ts`**

Replace:

```ts
/**
 * Named for the journey, not the psychometric axis. Items are NOT grouped by
 * dimension — questions.json already rotates EI/SN/TF/JP, so a straight cut
 * gives every part all four, and scores are unchanged by the split.
 */
```

with:

```ts
/**
 * One part per dimension, in EI, SN, TF, JP order — questions.json is grouped
 * that way so the intro's preview cards ("Phần 1 · E/I", …) tell the truth.
 * parts.test.ts pins it. Scores are unaffected: each item carries its own
 * dimension and key, and responses are indexed against the same file.
 */
```

- [ ] **Step 5: Run the whole subpage suite**

Run: `npx vitest run app/personal-definition`
Expected: all pass (every existing bank consumer maps over `bank.items`, so none depends on position).

- [ ] **Step 6: Commit**

```bash
git add app/personal-definition/_lib/data/questions.json app/personal-definition/_lib/parts.ts app/personal-definition/_lib/__tests__/parts.test.ts
git commit -F - <<'EOF'
Group the question bank so each part is one dimension

Stable within each dimension, so poles stay interleaved as before.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 3: Theme the quiz part header

**Files:**
- Modify: `app/personal-definition/_components/QuizPart.tsx`
- Test: `app/personal-definition/_components/__tests__/QuizPart.test.tsx`

**Interfaces:**
- Consumes: `PART_THEMES` from `_lib/partTheme.ts`; `srcOf` from `_lib/mascot.ts`.
- Produces: no prop change to `QuizPart`. Header exposes `data-testid="part-letters"`.

- [ ] **Step 1: Replace the two mascot tests and add the letters test**

In `QuizPart.test.tsx`, add imports:

```ts
import { PART_THEMES } from "../../_lib/partTheme";
import { srcOf } from "../../_lib/mascot";
```

Delete the test `"changes the mascot as the part fills up"` and replace it with:

```ts
  it("shows the part's dimension mascot", () => {
    const { container } = render(<QuizPart {...base} />);
    expect(container.querySelector("img")).toHaveAttribute("src", srcOf(PART_THEMES[1]!.mascot));
  });

  it("remounts the mascot on each new answer so the pulse replays", () => {
    const { container, rerender } = render(<QuizPart {...base} />);
    const before = container.querySelector("img");
    rerender(<QuizPart {...base} responses={responsesFor(1, [0])} />);
    expect(container.querySelector("img")).not.toBe(before);
  });

  it("shows the part's letter pair", () => {
    const { rerender } = render(<QuizPart {...base} part={0} responses={responsesFor(0, [])} />);
    expect(screen.getByTestId("part-letters")).toHaveTextContent("E · I");
    rerender(<QuizPart {...base} part={3} responses={responsesFor(3, [])} />);
    expect(screen.getByTestId("part-letters")).toHaveTextContent("J · P");
  });
```

Keep `"marks the mascot face as decorative"` unchanged.

- [ ] **Step 2: Run to verify the new tests fail**

Run: `npx vitest run app/personal-definition/_components/__tests__/QuizPart.test.tsx`
Expected: the 3 new tests FAIL (src is a MoMo face; img is not remounted; no `part-letters`).

- [ ] **Step 3: Implement**

In `QuizPart.tsx`:

1. Replace the import `import { FACES, srcOf, type FaceName } from "../_lib/mascot";` with:
   ```ts
   import { srcOf } from "../_lib/mascot";
   import { PART_THEMES } from "../_lib/partTheme";
   ```
2. Delete the `faceForProgress` function and its doc comment.
3. Inside the component, after `const isLastPart = …`, add:
   ```ts
   const theme = PART_THEMES[part]!;
   ```
4. Replace the header block — from `<div className="flex flex-col items-center text-center gap-2">` through the `{answered}/{PART_SIZE} câu` paragraph and its closing `</div>` — with:

```tsx
      <div
        className="flex flex-col items-center text-center gap-2 rounded-[24px] px-4 py-5"
        style={{ backgroundColor: theme.bg, boxShadow: `0 0 0 1px ${theme.ring}` }}
      >
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
        <span
          data-testid="part-letters"
          className="rounded-full px-3 py-1 text-xs font-semibold"
          style={{ backgroundColor: theme.badge, color: theme.badgeInk }}
        >
          {theme.letters[0]} · {theme.letters[1]}
        </span>
        <p className="text-sm font-medium" style={{ color: theme.chip }}>
          {PART_TITLES[part]}
        </p>

        {/* The dimension mascots are single images with no expressions, so
            progress shows as a bounce instead: keying on `answered` remounts
            the img, which replays pulseOnChange on every new answer. */}
        <img
          key={answered}
          src={srcOf(theme.mascot)}
          alt=""
          className={`w-20 h-20 object-contain ${styles.pulseOnChange}`}
        />

        <div className="w-full max-w-[280px]">
          <ProgressBar value={(answered / PART_SIZE) * 100} />
        </div>
        <p className="text-xs text-worker-text-secondary">
          {answered}/{PART_SIZE} câu
        </p>
      </div>
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run app/personal-definition`
Expected: all pass.

- [ ] **Step 5: Typecheck and confirm the MoMo faces are still used elsewhere**

Run: `npx tsc --noEmit` — only the 3 pre-existing errors.
Run: `git grep -n "FACES" app/personal-definition -- ':!*__tests__*'` — expect hits in `InterludeView.tsx` only (faces stay in use there). Do not delete anything from `mascot.ts`.

- [ ] **Step 6: Commit**

```bash
git add app/personal-definition/_components/QuizPart.tsx app/personal-definition/_components/__tests__/QuizPart.test.tsx
git commit -F - <<'EOF'
Theme each quiz part with its dimension colour and mascot

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 4: Intro screen — `Hero` and `QuizPreview`

**Files:**
- Create: `app/personal-definition/_components/onboarding/onboarding.module.css`
- Create: `app/personal-definition/_components/onboarding/Hero.tsx`
- Create: `app/personal-definition/_components/onboarding/QuizPreview.tsx`
- Test: `app/personal-definition/_components/__tests__/Hero.test.tsx`
- Test: `app/personal-definition/_components/__tests__/QuizPreview.test.tsx`

**Interfaces:**
- Consumes: `PART_THEMES`, `HERO_MASCOT` (Task 1); `PART_COUNT`, `PART_SIZE` from `parts.ts`; `QUESTION_COUNT` from `likert.ts`; `srcOf`.
- Produces:
  ```ts
  export function Hero(): JSX.Element;                               // Hero.tsx
  export const PREVIEW_ID = "pd-quiz-preview";                       // QuizPreview.tsx
  export function QuizPreview(props: { onStart: () => void }): JSX.Element;
  ```

- [ ] **Step 1: Write the failing tests**

`app/personal-definition/_components/__tests__/Hero.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Hero } from "../onboarding/Hero";

describe("Hero", () => {
  it("shows the locked headline, subtext and CTA", () => {
    render(<Hero />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Giữa thế giới ai cũng đang rực rỡ… Bạn có đang lạc lối?",
    );
    expect(
      screen.getByText(
        "Cảm giác chênh vênh chỉ là trạm dừng chân đầu tiên. Hãy để sự thấu hiểu bản thân dẫn lối cho bạn bước tiếp.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bắt đầu hành trình của bạn" })).toBeInTheDocument();
  });

  // Review Focus 2 — jsdom (like some old WebViews) has no scrollIntoView.
  it("does not throw when scrollIntoView is unavailable", () => {
    render(
      <>
        <Hero />
        <div id="pd-quiz-preview" />
      </>,
    );
    expect(() =>
      fireEvent.click(screen.getByRole("button", { name: "Bắt đầu hành trình của bạn" })),
    ).not.toThrow();
  });

  // Review Focus 3 — a fixed height would clip content on 320×568.
  it("uses a minimum height, never a fixed one", () => {
    const { container } = render(<Hero />);
    const section = container.querySelector("section")!;
    expect(section.className).toContain("min-h-[100svh]");
    expect(section.className).not.toMatch(/(^|\s)h-\[/);
  });
});
```

`app/personal-definition/_components/__tests__/QuizPreview.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { QuizPreview, PREVIEW_ID } from "../onboarding/QuizPreview";

describe("QuizPreview", () => {
  it("renders one card per part with its letter pair and question range", () => {
    render(<QuizPreview onStart={() => {}} />);
    const cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(4);
    expect(within(cards[0]!).getByText("Phần 1 · Câu 1–10")).toBeInTheDocument();
    expect(within(cards[0]!).getByText("E")).toBeInTheDocument();
    expect(within(cards[3]!).getByText("Phần 4 · Câu 31–40")).toBeInTheDocument();
    expect(within(cards[3]!).getByText("P")).toBeInTheDocument();
  });

  it("is the scroll target of the hero CTA", () => {
    const { container } = render(<QuizPreview onStart={() => {}} />);
    expect(container.querySelector(`#${PREVIEW_ID}`)).not.toBeNull();
  });

  it("calls onStart from 'Làm bài test ngay'", () => {
    const onStart = vi.fn();
    render(<QuizPreview onStart={onStart} />);
    fireEvent.click(screen.getByRole("button", { name: "Làm bài test ngay" }));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  // Review Focus 4 — keyboard users and missing Element.scrollTo.
  it("has a focusable track and labelled dots that track the current card", () => {
    render(<QuizPreview onStart={() => {}} />);
    expect(screen.getByRole("list", { name: /4 phần của bài test/ })).toHaveAttribute("tabindex", "0");
    const dots = screen.getAllByRole("button", { name: /^Phần \d$/ });
    expect(dots).toHaveLength(4);
    expect(dots[0]).toHaveAttribute("aria-current", "true");
    expect(() => fireEvent.click(dots[2]!)).not.toThrow();
    expect(dots[2]).toHaveAttribute("aria-current", "true");
    expect(dots[0]).toHaveAttribute("aria-current", "false");
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run app/personal-definition/_components/__tests__/Hero.test.tsx app/personal-definition/_components/__tests__/QuizPreview.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Create `onboarding.module.css`**

```css
/* Keyframes for the intro, and the classes that apply them. Scoped style
   exception — see spec §7. Nothing else belongs in this file. */

@keyframes pd-ob-float {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-12px); }
}

@keyframes pd-ob-float-shadow {
  0%, 100% { transform: scaleX(1);   opacity: 1; }
  50%      { transform: scaleX(.75); opacity: .6; }
}

@keyframes pd-ob-fade-up {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: none; }
}

.float       { animation: pd-ob-float 4s ease-in-out infinite; }
.floatShadow { animation: pd-ob-float-shadow 4s ease-in-out infinite; }
.fadeUp      { animation: pd-ob-fade-up .7s ease-out both; }
.delay1      { animation-delay: .12s; }
.delay2      { animation-delay: .24s; }

@media (prefers-reduced-motion: reduce) {
  .float, .floatShadow, .fadeUp {
    animation: none !important;
    transform: none !important;
    opacity: 1 !important;
  }
}
```

- [ ] **Step 4: Create `Hero.tsx`**

```tsx
"use client";

import { HERO_MASCOT } from "../../_lib/partTheme";
import { srcOf } from "../../_lib/mascot";
import { PREVIEW_ID } from "./QuizPreview";
import styles from "./onboarding.module.css";

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Static v2 hero — no time-of-day greeting, no typing effect (spec §5.1).
 * `min-h`, not `h`: on a 568px-tall phone the content is taller than the
 * viewport and must push the section, not be clipped by it.
 */
export function Hero() {
  // An in-page scroll, not a phase change. scrollIntoView is optional-called
  // because jsdom and some old WebViews lack it; the preview is directly
  // below, so a no-op still leaves the student one swipe away.
  const toPreview = () => {
    document
      .getElementById(PREVIEW_ID)
      ?.scrollIntoView?.({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
  };

  return (
    <section
      aria-labelledby="pd-hero-title"
      className="relative isolate overflow-hidden min-h-[100svh] flex items-center justify-center px-6 pt-10 pb-16 bg-[linear-gradient(180deg,#ffe4e6,#fdf2f8_50%,#ede9fe)]"
    >
      <div aria-hidden className="absolute -z-10 -left-[90px] -top-[60px] w-[240px] h-[240px] rounded-full blur-[56px] bg-[rgba(255,255,255,.55)]" />
      <div aria-hidden className="absolute -z-10 -right-[90px] -bottom-[60px] w-[280px] h-[280px] rounded-full blur-[56px] bg-[rgba(224,242,254,.75)]" />

      <div className="w-full max-w-[420px] flex flex-col items-center gap-6 text-center">
        <div className={styles.float}>
          <img
            src={srcOf(HERO_MASCOT)}
            alt=""
            className="h-[200px] w-auto object-contain drop-shadow-[0_16px_24px_rgba(184,6,102,.22)]"
          />
        </div>
        <div aria-hidden className={`-mt-4 w-[90px] h-[11px] rounded-full bg-[rgba(131,24,67,.1)] blur-[4px] ${styles.floatShadow}`} />

        <h1
          id="pd-hero-title"
          className={`text-[27px] leading-[1.25] font-extrabold text-[#1e293b] text-balance ${styles.fadeUp}`}
        >
          Giữa thế giới ai cũng đang rực rỡ…{" "}
          <span className="bg-[linear-gradient(90deg,#ec4899,#8b5cf6)] bg-clip-text text-transparent">
            Bạn có đang lạc lối?
          </span>
        </h1>

        <p className={`text-[15.5px] leading-[1.65] text-[#475569] text-pretty ${styles.fadeUp} ${styles.delay1}`}>
          Cảm giác chênh vênh chỉ là trạm dừng chân đầu tiên. Hãy để sự thấu hiểu bản thân dẫn lối cho bạn bước tiếp.
        </p>

        <button
          type="button"
          onClick={toPreview}
          className={`inline-flex items-center justify-center gap-2 w-full max-w-[320px] px-6 py-4 rounded-full bg-[#0f172a] text-white text-[17px] font-bold whitespace-nowrap shadow-[0_10px_22px_-6px_rgba(236,72,153,.35)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#f9a8d4] ${styles.fadeUp} ${styles.delay2}`}
        >
          Bắt đầu hành trình của bạn
          <span aria-hidden>↓</span>
        </button>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Create `QuizPreview.tsx`**

```tsx
"use client";

import { useRef, useState } from "react";
import { PART_THEMES } from "../../_lib/partTheme";
import { PART_SIZE } from "../../_lib/parts";
import { QUESTION_COUNT } from "../../_lib/likert";
import { srcOf } from "../../_lib/mascot";

export const PREVIEW_ID = "pd-quiz-preview";

/** Card copy per part, index = part (same order as PART_THEMES). */
const CARDS = [
  {
    title: "Sóng não cực mạnh hay cần sạc pin?",
    desc: "Khám phá cách bạn nạp năng lượng: Trùm tiệc tùng hay chỉ muốn chill một mình?",
  },
  {
    title: "Thực tế phũ phàng hay hệ tâm linh?",
    desc: "Cách bạn nhìn nhận thế giới: Tin vào mắt thấy tai nghe hay thích \"đọc vị\" ẩn giấu?",
  },
  {
    title: "Não nhảy số hay tim lên tiếng?",
    desc: "Khi đứng giữa ngã rẽ: Dùng logic thép phân tích hay nghe theo tiếng gọi con tim?",
  },
  {
    title: "Kế hoạch 5 năm hay nước đến chân mới nhảy?",
    desc: "Phong cách sống: Team \"deadline là chân ái\" hay team linh hoạt ứng biến?",
  },
] as const;

/** Track's inline padding; card offsets are measured from it. */
const TRACK_PAD = 24;

export function QuizPreview({ onStart }: { onStart: () => void }) {
  const trackRef = useRef<HTMLOListElement>(null);
  const [active, setActive] = useState(0);

  const syncActive = () => {
    const track = trackRef.current;
    if (!track) return;
    let best = 0;
    let dist = Infinity;
    Array.from(track.children).forEach((li, i) => {
      const d = Math.abs((li as HTMLElement).offsetLeft - TRACK_PAD - track.scrollLeft);
      if (d < dist) {
        dist = d;
        best = i;
      }
    });
    setActive(best);
  };

  // Element.scrollTo is optional-called: jsdom and some old WebViews lack it.
  // `active` is set directly so the dot reflects the choice either way.
  const goTo = (i: number) => {
    const track = trackRef.current;
    const li = track?.children[i] as HTMLElement | undefined;
    if (track && li) {
      const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      track.scrollTo?.({ left: li.offsetLeft - TRACK_PAD, behavior: reduce ? "auto" : "smooth" });
    }
    setActive(i);
  };

  return (
    <section
      id={PREVIEW_ID}
      aria-labelledby="pd-qp-title"
      className="relative -mt-8 bg-white rounded-t-[28px] pt-9 pb-10 shadow-[0_-8px_24px_rgba(131,24,67,.06)]"
    >
      <div className="max-w-[600px] mx-auto">
        <header className="px-6">
          <p className="text-xs font-semibold tracking-[.12em] uppercase text-[#ec4899]">
            {QUESTION_COUNT} câu hỏi · {PART_THEMES.length} phần
          </p>
          <h2 id="pd-qp-title" className="mt-2 text-[23px] leading-[1.25] font-extrabold text-[#1e293b] text-balance">
            Hành trình “bóc tách” bản thân
          </h2>
          <p className="mt-2 text-sm leading-[1.6] text-[#475569]">
            Không có đáp án đúng sai, chỉ có đáp án thật lòng.
          </p>
        </header>

        <ol
          ref={trackRef}
          tabIndex={0}
          aria-label="4 phần của bài test, vuốt ngang để xem"
          onScroll={() => window.requestAnimationFrame(syncActive)}
          className="relative mt-5 flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-px-6 px-6 pt-1.5 pb-[18px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden focus-visible:outline-2 focus-visible:outline-[#ec4899] focus-visible:-outline-offset-2 rounded-xl"
        >
          {PART_THEMES.map((t, i) => (
            <li key={t.letters.join("")} className="flex-[0_0_82%] snap-start flex">
              <article
                aria-labelledby={`pd-qp-${i}`}
                className="w-full flex flex-col p-3.5 rounded-[24px]"
                style={{ backgroundColor: t.bg, boxShadow: `0 0 0 1px ${t.ring}, 0 6px 14px rgba(148,163,184,.18)` }}
              >
                <div className="relative aspect-[4/3] rounded-[18px] overflow-hidden flex items-end justify-center" style={{ background: t.well }}>
                  <img src={srcOf(t.mascot)} alt="" className="h-[88%] w-auto object-contain drop-shadow-[0_10px_14px_rgba(15,23,42,.12)]" />
                  <span
                    className="absolute left-2.5 top-2.5 px-[11px] py-1 rounded-full text-xs font-semibold"
                    style={{ backgroundColor: t.badge, color: t.badgeInk }}
                  >
                    Phần {i + 1} · Câu {i * PART_SIZE + 1}–{(i + 1) * PART_SIZE}
                  </span>
                </div>
                <p className="mt-3 flex items-center flex-wrap gap-1.5 text-xs font-medium">
                  <span className="sr-only">Cặp tính cách:</span>
                  {t.letters.map((letter, k) => (
                    <span key={letter} className="contents">
                      {k === 1 && (
                        <>
                          <span aria-hidden className="text-[#94a3b8]">↔</span>
                          <span className="sr-only">hoặc</span>
                        </>
                      )}
                      <span
                        className="inline-flex items-center gap-[5px] px-[9px] py-1 rounded-full bg-white"
                        style={{ color: t.chip, boxShadow: `0 0 0 1px ${t.ring}` }}
                      >
                        <b className="text-[13px] font-extrabold">{letter}</b>
                        {t.poleNames[k]}
                      </span>
                    </span>
                  ))}
                </p>
                <h3 id={`pd-qp-${i}`} className="mt-2.5 text-[17px] leading-[1.35] font-bold text-[#1e293b] text-balance">
                  {CARDS[i]!.title}
                </h3>
                <p className="mt-1.5 text-[13.5px] leading-[1.6] text-[#475569]">{CARDS[i]!.desc}</p>
              </article>
            </li>
          ))}
        </ol>

        <div role="group" aria-label="Chọn phần" className="flex justify-center">
          {PART_THEMES.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Phần ${i + 1}`}
              aria-current={i === active ? "true" : "false"}
              onClick={() => goTo(i)}
              className="p-2 focus-visible:outline-2 focus-visible:outline-[#ec4899] rounded-full"
            >
              <span
                className={`block h-2 rounded-full transition-all ${i === active ? "w-[22px] bg-[#ec4899]" : "w-2 bg-[#e2c8d6]"}`}
              />
            </button>
          ))}
        </div>
        <p aria-hidden className="mt-1 text-center text-xs text-[#94a3b8]">
          Vuốt ngang để xem cả 4 phần →
        </p>

        <div className="mt-6 px-6">
          <button
            type="button"
            onClick={onStart}
            className="w-full rounded-full py-4 px-6 text-[17px] font-bold text-white bg-[linear-gradient(90deg,#ec4899,#fb7185)] shadow-[0_10px_20px_-6px_rgba(236,72,153,.45)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#f9a8d4]"
          >
            Làm bài test ngay
          </button>
        </div>
      </div>
    </section>
  );
}
```

Note: `CARDS.length` must equal `PART_THEMES.length`; add a guard test in Step 1's file if you change either. Card copy is the prototype's, verbatim.

- [ ] **Step 6: Run tests**

Run: `npx vitest run app/personal-definition`
Expected: all pass, including the 7 new tests.

- [ ] **Step 7: Typecheck**

Run: `npx tsc --noEmit` — only the 3 pre-existing errors.

- [ ] **Step 8: Commit**

```bash
git add app/personal-definition/_components/onboarding app/personal-definition/_components/__tests__/Hero.test.tsx app/personal-definition/_components/__tests__/QuizPreview.test.tsx
git commit -F - <<'EOF'
Add the intro hero and swipeable quiz preview

Not wired into the page yet.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 5: Restyle the onboarding form and add the back link

**Files:**
- Modify: `app/personal-definition/_components/OnboardingForm.tsx`
- Modify: `app/personal-definition/page.tsx` (pass `onBack`)
- Test: `app/personal-definition/_components/__tests__/OnboardingForm.test.tsx`

**Interfaces:**
- Consumes: `HERO_MASCOT` (Task 1), `srcOf`.
- Produces: `OnboardingForm` props become `{ input; errors; onChange; onSubmit; onBack: () => void }` (`onBack` required).

- [ ] **Step 1: Add `onBack` to every existing render in the test file**

From the repo root:

```bash
sed -i -E 's/<OnboardingForm( |$)/<OnboardingForm onBack={() => {}}\1/' app/personal-definition/_components/__tests__/OnboardingForm.test.tsx
git diff --stat app/personal-definition/_components/__tests__/OnboardingForm.test.tsx
```

Expected: 12 lines changed (10 single-line renders + 2 multi-line openings).

- [ ] **Step 2: Write the failing tests**

Append to `OnboardingForm.test.tsx`:

```tsx
describe("OnboardingForm frame", () => {
  it("calls onBack from the '← Quay lại' link", () => {
    const onBack = vi.fn();
    render(
      <OnboardingForm input={emptyInput} errors={{}} onChange={() => {}} onSubmit={() => {}} onBack={onBack} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Quay lại" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("does not submit the form when going back", () => {
    const onSubmit = vi.fn();
    render(
      <OnboardingForm input={emptyInput} errors={{}} onChange={() => {}} onSubmit={onSubmit} onBack={() => {}} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Quay lại" }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("keeps the heading text whole for assistive tech", () => {
    render(
      <OnboardingForm input={emptyInput} errors={{}} onChange={() => {}} onSubmit={() => {}} onBack={() => {}} />,
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Khám phá bản thân");
  });
});
```

- [ ] **Step 3: Run to verify they fail**

Run: `npx vitest run app/personal-definition/_components/__tests__/OnboardingForm.test.tsx`
Expected: the two back-link tests FAIL (no "Quay lại" button). The heading test may already pass.

- [ ] **Step 4: Implement**

In `OnboardingForm.tsx`:

1. Remove `import { Button } from "@/components/worker/ui/Button";`. Add:
   ```ts
   import { HERO_MASCOT } from "../_lib/partTheme";
   import { srcOf } from "../_lib/mascot";
   ```
2. Add `onBack: () => void;` to `Props`, and `onBack` to the destructured params.
3. Extend the existing seeding comment: replace the sentence starting `Safe today only because birth_date is written solely…` through `…returns to the onboarding phase).` with:
   ```
   // BACK to the intro now unmounts this component, so the seed is what
   // restores a completed date on return. A half-picked date emits "" (see
   // toIso) and is not restored — accepted: the student re-picks one select.
   ```
   Keep the final sentence about a future "start over" using a `key`.
4. Replace the whole returned JSX with:

```tsx
  return (
    <div className="min-h-[100svh] px-5 pt-3 pb-10 bg-[linear-gradient(180deg,#ffe4e6,#fdf2f8_50%,#ede9fe)]">
      <div className="max-w-[440px] mx-auto">
        <button
          type="button"
          onClick={onBack}
          className="-ml-2 min-h-11 min-w-11 px-2 inline-flex items-center gap-1 text-sm font-medium text-[#475569] rounded-full focus-visible:outline-2 focus-visible:outline-[#ec4899]"
        >
          <span aria-hidden>←</span>
          Quay lại
        </button>

        <div className="mt-2 bg-white rounded-[24px] shadow-[0_6px_14px_rgba(148,163,184,.18)] px-5 pt-5 pb-6">
          <img src={srcOf(HERO_MASCOT)} alt="" className="w-[72px] h-[72px] object-contain mx-auto mb-2" />
          <h1 className="text-[26px] font-bold text-[#1e293b] mb-1 text-center">
            Khám phá{" "}
            <span className="bg-[linear-gradient(90deg,#ec4899,#8b5cf6)] bg-clip-text text-transparent">bản thân</span>
          </h1>
          <p className="text-sm text-[#475569] mb-6 text-center">
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
              <span className="text-xs text-worker-text-secondary">Ngày sinh</span>
              <div className="flex gap-2 mt-1">
                <Select
                  label="Ngày"
                  value={day ? String(day) : ""}
                  onChange={(v) => emit(numeric(v), month, year)}
                  options={Array.from({ length: dayCount }, (_, i) => ({
                    value: String(i + 1),
                    label: String(i + 1),
                  }))}
                  placeholder="Ngày"
                />
                <Select
                  label="Tháng"
                  value={month ? String(month) : ""}
                  onChange={(v) => emit(day, numeric(v), year)}
                  options={MONTHS.map((m) => ({ value: String(m), label: `Tháng ${m}` }))}
                  placeholder="Tháng"
                />
                <Select
                  label="Năm"
                  value={year ? String(year) : ""}
                  onChange={(v) => emit(day, month, numeric(v))}
                  options={YEARS.map((y) => ({ value: String(y), label: String(y) }))}
                  placeholder="Năm"
                />
              </div>
              {errors.birth_date && <p className="text-xs text-worker-danger mt-1">{errors.birth_date}</p>}
            </div>

            <button
              type="submit"
              className="w-full rounded-full py-4 px-6 text-[17px] font-bold text-white bg-[linear-gradient(90deg,#ec4899,#fb7185)] shadow-[0_10px_20px_-6px_rgba(236,72,153,.45)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#f9a8d4]"
            >
              Bắt đầu
            </button>
          </form>
        </div>
      </div>
    </div>
  );
```

The four field blocks are identical to the current file — only their indentation changes. Everything above `return` (`OPTIONS`, `numeric`, the day/month/year state, `dayCount`, `emit`) stays as is.

5. In `page.tsx`, add to the `<OnboardingForm …>` element:
   ```tsx
   onBack={() => dispatch({ type: "BACK" })}
   ```
   (`BACK` is a no-op in `onboarding` until Task 6 — that is expected.)

- [ ] **Step 5: Run tests**

Run: `npx vitest run app/personal-definition`
Expected: all pass. The page tests still pass because the page still opens on the form.

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit` — only the 3 pre-existing errors.

- [ ] **Step 7: Commit**

```bash
git add app/personal-definition/_components/OnboardingForm.tsx app/personal-definition/_components/__tests__/OnboardingForm.test.tsx app/personal-definition/page.tsx
git commit -F - <<'EOF'
Restyle the onboarding form to match the intro and add a back link

Fields stay on components/worker/ui; only the frame changes.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 6: Wire the intro phase and make the route headerless

**Files:**
- Modify: `app/personal-definition/_lib/state.ts`
- Modify: `app/personal-definition/page.tsx`
- Modify: `app/personal-definition/layout.tsx`
- Test: `app/personal-definition/_lib/__tests__/state.test.ts`
- Test: `app/personal-definition/_components/__tests__/page.test.tsx`
- Test: `app/personal-definition/_components/__tests__/layout.test.tsx` (new)

**Interfaces:**
- Consumes: `Hero`, `QuizPreview` (Task 4); `OnboardingForm` with `onBack` (Task 5).
- Produces: `Phase = "intro" | "onboarding" | "quiz" | "interlude" | "synthesis"`; `Action` gains `{ type: "START_FORM" }`; `initialState.phase === "intro"`.

- [ ] **Step 1: Write the failing reducer tests**

In `state.test.ts`, change the first reducer test:

```ts
  it("starts in the intro with 40 empty responses", () => {
    expect(initialState.phase).toBe("intro");
    expect(initialState.responses).toHaveLength(QUESTION_COUNT);
    expect(initialState.responses.every((r) => r === null)).toBe(true);
  });
```

Append:

```ts
describe("intro", () => {
  it("START_FORM moves from the intro to the form", () => {
    expect(reducer(initialState, { type: "START_FORM" }).phase).toBe("onboarding");
  });

  it("START_FORM is a no-op outside the intro (double tap, stale click)", () => {
    const onForm: State = { ...initialState, phase: "onboarding" };
    expect(reducer(onForm, { type: "START_FORM" })).toBe(onForm);
    const inQuiz: State = { ...initialState, phase: "quiz" };
    expect(reducer(inQuiz, { type: "START_FORM" })).toBe(inQuiz);
  });

  it("BACK from the form returns to the intro and keeps the input", () => {
    const onForm: State = { ...initialState, phase: "onboarding", input: validInput };
    const back = reducer(onForm, { type: "BACK" });
    expect(back.phase).toBe("intro");
    expect(back.input).toEqual(validInput);
  });

  it("BACK from the intro does nothing", () => {
    expect(reducer(initialState, { type: "BACK" })).toBe(initialState);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run app/personal-definition/_lib/__tests__/state.test.ts`
Expected: FAIL — phase is `"onboarding"`, `START_FORM` unknown.

- [ ] **Step 3: Implement the reducer change**

In `state.ts`:

```ts
export type Phase = "intro" | "onboarding" | "quiz" | "interlude" | "synthesis";
```

Add to `Action`:

```ts
  | { type: "START_FORM" }
```

In `initialState`: `phase: "intro",`

In `reducer`, before `case "START_QUIZ":`:

```ts
    case "START_FORM":
      if (state.phase !== "intro") return state;
      return { ...state, phase: "onboarding" };
```

In `case "BACK":`, make the first line:

```ts
      if (state.phase === "onboarding") return { ...state, phase: "intro" };
```

- [ ] **Step 4: Run reducer tests**

Run: `npx vitest run app/personal-definition/_lib/__tests__/state.test.ts`
Expected: all pass.

- [ ] **Step 5: Write the failing page and layout tests**

In `page.test.tsx`:

1. Add a helper above `fillOnboarding`, and call it as the first line of `fillOnboarding`:

```ts
/** Leaves the intro for the form. The page opens on the intro. */
function openForm() {
  fireEvent.click(screen.getByRole("button", { name: "Làm bài test ngay" }));
}
```

```ts
function fillOnboarding() {
  openForm();
  // …existing body unchanged
```

2. Replace the test `"opens in onboarding and blocks an empty submit with a message"` with:

```ts
  it("opens on the intro, with no form fields yet", () => {
    render(<PersonalDefinitionPage />);
    expect(screen.getByText("Bạn có đang lạc lối?")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/tên bạn muốn hiển thị/i)).not.toBeInTheDocument();
  });

  it("blocks an empty form submit with a message", () => {
    render(<PersonalDefinitionPage />);
    openForm();
    fireEvent.click(screen.getByRole("button", { name: /^bắt đầu$/i }));
    expect(screen.getByText(/Cho mình biết tên bạn/i)).toBeInTheDocument();
  });
```

3. In `"does not crash when the full name has no mappable letters"`, add `openForm();` right after `render(<PersonalDefinitionPage />);`.

4. In every remaining `getByRole("button", { name: /bắt đầu/i })` in the file, change the regex to `/^bắt đầu$/i` (the hero CTA "Bắt đầu hành trình của bạn" is not on screen at those points, but the anchored regex keeps the intent exact).

5. Append:

```ts
describe("intro flow", () => {
  it("stays on the intro when the hero CTA is pressed", () => {
    render(<PersonalDefinitionPage />);
    fireEvent.click(screen.getByRole("button", { name: "Bắt đầu hành trình của bạn" }));
    expect(screen.getByRole("button", { name: "Làm bài test ngay" })).toBeInTheDocument();
  });

  // Review Focus 5
  it("scrolls to the top when moving from the intro to the form", () => {
    render(<PersonalDefinitionPage />);
    scrollTo.mockClear();
    openForm();
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });

  // Review Focus 1
  it("keeps typed fields and a completed birth date across intro ↔ form", () => {
    render(<PersonalDefinitionPage />);
    fillOnboarding();
    fireEvent.click(screen.getByRole("button", { name: "Quay lại" }));
    expect(screen.getByRole("button", { name: "Làm bài test ngay" })).toBeInTheDocument();

    openForm();
    expect(screen.getByPlaceholderText(/tên bạn muốn hiển thị/i)).toHaveValue("Khánh");
    expect(screen.getByPlaceholderText(/họ tên đầy đủ/i)).toHaveValue("Nguyễn Thị Khánh Trang");
    expect(screen.getByLabelText("Ngày")).toHaveValue("15");
    expect(screen.getByLabelText("Tháng")).toHaveValue("6");
    expect(screen.getByLabelText("Năm")).toHaveValue("2003");
  });
});
```

`app/personal-definition/_components/__tests__/layout.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PersonalDefinitionLayout from "../../layout";

describe("PersonalDefinitionLayout", () => {
  it("renders just the test — no worker header or footer", () => {
    const { container } = render(
      <PersonalDefinitionLayout>
        <p>content</p>
      </PersonalDefinitionLayout>,
    );
    expect(screen.getByText("content")).toBeInTheDocument();
    expect(container.querySelector("header")).toBeNull();
    expect(container.querySelector("footer")).toBeNull();
    expect(container.querySelector("main")!.className).not.toContain("pt-[60px]");
  });
});
```

- [ ] **Step 6: Run to verify they fail**

Run: `npx vitest run app/personal-definition/_components/__tests__/page.test.tsx app/personal-definition/_components/__tests__/layout.test.tsx`
Expected: FAIL — the page does not render the intro yet; the layout still has header/footer (it may also fail to render `WorkerHeader` outside Next — either failure is fine).

- [ ] **Step 7: Wire `page.tsx`**

1. Add imports:
   ```ts
   import { Hero } from "./_components/onboarding/Hero";
   import { QuizPreview } from "./_components/onboarding/QuizPreview";
   ```
2. Replace the `return (…)` block with the version below. All hooks stay above it, unchanged. Intro and form render outside the container so their gradients reach the screen edges (spec §4).

```tsx
  if (state.phase === "intro") {
    return (
      <>
        <Hero />
        <QuizPreview onStart={() => dispatch({ type: "START_FORM" })} />
      </>
    );
  }

  if (state.phase === "onboarding") {
    return (
      <OnboardingForm
        input={state.input}
        errors={errors}
        onChange={(field: keyof Input, value) => dispatch({ type: "SET_INPUT", field, value })}
        onSubmit={handleStart}
        onBack={() => dispatch({ type: "BACK" })}
      />
    );
  }

  return (
    <div className="px-5 py-6 max-w-[600px] mx-auto">
      {state.phase === "quiz" && (
        <QuizPart
          part={state.part}
          responses={state.responses}
          open={state.open}
          onAnswer={(index, value, advance) => dispatch({ type: "ANSWER", index, value, advance })}
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
```

Also update the scroll-reset comment's list "(onboarding, a quiz part, an interlude, synthesis)" to "(intro, onboarding, a quiz part, an interlude, synthesis)".

- [ ] **Step 8: Make `layout.tsx` headerless**

Replace the whole file with:

```tsx
/**
 * Headerless by design (spec §3): the route is "just the personality test".
 * Unlike sibling CareerPath there is no WorkerHeader/WorkerFooter, so no link
 * back to the job board — a deliberate deviation noted for the PR.
 */
export default function PersonalDefinitionLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-momo-trust">
      <main className="bg-worker-bg min-h-screen">{children}</main>
    </div>
  );
}
```

- [ ] **Step 9: Run the full subpage suite**

Run: `npx vitest run app/personal-definition`
Expected: all pass. Report the count (was 252 before this plan, plus the new tests).

- [ ] **Step 10: Typecheck and full repo run**

Run: `npx tsc --noEmit` — only the 3 pre-existing `tests/api/` errors.
Run: `npx vitest run` — only failure allowed is `tests/db-connection.test.ts` (needs a live DB).

- [ ] **Step 11: Commit**

```bash
git add app/personal-definition/_lib/state.ts app/personal-definition/page.tsx app/personal-definition/layout.tsx app/personal-definition/_lib/__tests__/state.test.ts app/personal-definition/_components/__tests__/page.test.tsx app/personal-definition/_components/__tests__/layout.test.tsx
git commit -F - <<'EOF'
Open the test on the intro and drop the worker header and footer

New intro phase with START_FORM; BACK from the form returns to it with
input kept. Intro and form render full-bleed outside the page container.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

- [ ] **Step 12: Hand Khanh the 390px walkthrough checklist (do not run it yourself)**

`npm run dev` → `http://localhost:3000/personal-definition` at 390px width:
1. No MoMo header/footer anywhere in the flow.
2. Hero fills the screen; mascot floats; headline second half is gradient.
3. "Bắt đầu hành trình của bạn ↓" smooth-scrolls to the preview.
4. Preview cards swipe and snap; dots follow; tapping a dot moves the track.
5. "Làm bài test ngay" opens the form at the top of the page.
6. Form: gradient background, white card, mascot, gradient "bản thân", pink "Bắt đầu".
7. "← Quay lại" returns to the intro; going forward again keeps name, school and full birth date.
8. Part 1 header is pink with "E · I" and the E/I mascot; part 2 violet "S · N"; part 3 sky "T · F"; part 4 amber "J · P" with dark badge text.
9. Mascot bounces on each answer.
10. With OS "reduce motion" on, nothing floats, fades or bounces.
