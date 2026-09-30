# Personal Definition — Result Screen (Spec A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the result (`synthesis`) screen as four cards — temperament sticker hero, two-sided dimension breakdown, strengths/growth, careers — using the finalized Temperament Sticker Kit, with zodiac and numerology removed from the screen.

**Architecture:** A pure `temperament.ts` derives the kit temperament from the four letters. A committed extraction script lifts the kit's 8 pose webps, its card CSS (as a CSS module) and its scene SVG (as strings) into the repo; `StickerCard` renders those strings with module-localized class names. `SynthesisView` becomes a thin composition of four new section components under `_components/result/`. The engine (`buildProfile`) is not touched.

**Tech Stack:** Next 16.2.9 App Router, React 19, Tailwind v4, CSS Modules, Vitest 4 + jsdom + @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-09-30-personal-definition-result-screen-design.md`

**Prerequisite:** `docs/superpowers/plans/2026-09-30-personal-definition-onboarding.md` is fully executed first. This plan assumes its final `page.tsx` shape (intro/onboarding early returns, then a `px-5 py-6 max-w-[600px] mx-auto` container for quiz, interlude and synthesis).

## Global Constraints

- Repo `D:\projects\merchant_job_board`, branch `feature/personal-definition/ui`. Commit locally per task. **Never push, never open a PR.**
- Only touch `app/personal-definition/` and `docs/superpowers/`.
- Do not modify `_lib/profile.ts`, `_lib/mbti.ts`, any `_lib/data/*.json`, `ShareCard.tsx`, or `InterludeView.tsx`.
- No zodiac or numerology anywhere on the result screen — no "Cung", no "Thần số học", no sun sign, no life-path number.
- Type names: our Vietnamese `mbti.label` only. Never "The Campaigner"-style names or Mind/Energy/Nature/Tactics/Identity.
- Temperament names (UI copy, verbatim): analysts **Nhóm Tư Duy**, diplomats **Nhóm Lý Tưởng**, sentinels **Nhóm Vững Chãi**, explorers **Nhóm Trải Nghiệm**. The English kit ids never reach the UI.
- Section headings (verbatim): **Bốn chiều của bạn**, **Điểm mạnh**, **Điểm cần cải thiện**, **Nghề nghiệp phù hợp**. Career footnote (verbatim): **Gợi ý để bạn tìm hiểu thêm, không phải lựa chọn duy nhất.**
- Explorers' graffiti tags stay the kit's English art text: ISTP `FIX IT`, ISFP `VIBE`, ESTP `GO!`, ESFP `SHOW!`.
- Mascot alt text: `Linh vật ${type}`.
- No new web fonts: kit fonts are replaced by `inherit` / platform stacks at extraction. No global CSS. No new npm dependencies.
- Motion: only `transform`, `opacity`, `stroke-dashoffset` animate; everything stops under `prefers-reduced-motion`; everything stops under `[data-capturing]`.
- Commit trailer on its own last line of the body, never on the subject: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- Tests: `npx vitest run app/personal-definition`. Typecheck: `npx tsc --noEmit` (only the 3 pre-existing `tests/api/` errors allowed). `tsconfig` has `noUncheckedIndexedAccess`, so indexed reads are `T | undefined`.

## Review Focus

1. **A 50/50 dimension** (raw score 0): the winner shown must be the default pole (I, N, F, P) — the same letter the type uses — and the marker must sit dead centre. Test in Task 4.
2. **Every one of the 16 types renders a sticker** — no missing pose, scene or temperament for any type, and no literal `{{TAG}}` leaking into a non-Explorer card. Test in Task 3.
3. **Accent colours used as text stay readable** on white and on their own tint (≥ 4.5:1). Test in Task 1.
4. **Screen readers get each dimension as text** with both poles and both percentages, since the track is decorative. Test in Task 4.
5. **The marker leans toward the winning side** — 72% Hướng ngoại must put the marker in the left half (easy to invert). Test in Task 4.

---

### Task 1: `temperament.ts`

**Files:**
- Create: `app/personal-definition/_lib/temperament.ts`
- Test: `app/personal-definition/_lib/__tests__/temperament.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type TemperamentId = "analysts" | "diplomats" | "sentinels" | "explorers";
  export interface Temperament { name: string; accent: string; tint: string }
  export const TEMPERAMENTS: Record<TemperamentId, Temperament>;
  export function temperamentOf(type: string): TemperamentId; // throws on a non-MBTI string
  ```

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { temperamentOf, TEMPERAMENTS } from "../temperament";

const EXPECTED: Record<string, string> = {
  INTJ: "analysts", INTP: "analysts", ENTJ: "analysts", ENTP: "analysts",
  INFJ: "diplomats", INFP: "diplomats", ENFJ: "diplomats", ENFP: "diplomats",
  ISTJ: "sentinels", ISFJ: "sentinels", ESTJ: "sentinels", ESFJ: "sentinels",
  ISTP: "explorers", ISFP: "explorers", ESTP: "explorers", ESFP: "explorers",
};

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}
function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x! + 0.05) / (y! + 0.05);
}

describe("temperament", () => {
  it("maps all 16 types NT/NF/SJ/SP", () => {
    for (const [type, id] of Object.entries(EXPECTED)) {
      expect(temperamentOf(type), type).toBe(id);
    }
  });

  it("throws on anything that is not a four-letter type", () => {
    expect(() => temperamentOf("XXXX")).toThrow(/XXXX/);
    expect(() => temperamentOf("ENF")).toThrow();
  });

  it("names the four temperaments in Vietnamese", () => {
    expect(TEMPERAMENTS.analysts.name).toBe("Nhóm Tư Duy");
    expect(TEMPERAMENTS.diplomats.name).toBe("Nhóm Lý Tưởng");
    expect(TEMPERAMENTS.sentinels.name).toBe("Nhóm Vững Chãi");
    expect(TEMPERAMENTS.explorers.name).toBe("Nhóm Trải Nghiệm");
  });

  // Review Focus 3 — accents are used as text on white cards and on the tint.
  it("keeps every accent readable (≥ 4.5:1) on white and on its own tint", () => {
    for (const [id, t] of Object.entries(TEMPERAMENTS)) {
      expect(contrast(t.accent, "#ffffff"), `${id} on white`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(t.accent, t.tint), `${id} on tint`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run app/personal-definition/_lib/__tests__/temperament.test.ts`
Expected: FAIL — cannot resolve `../temperament`.

- [ ] **Step 3: Implement**

```ts
/**
 * The Temperament Sticker Kit groups the 16 types into four worlds by their
 * middle letters: NT, NF, SJ, SP. Derived on demand, never stored — the type
 * string is the single source of truth. The ids are the kit's code names and
 * never reach the UI; `name` is our own Vietnamese copy.
 *
 * `accent` is used as text and chip colour on white cards and on `tint`, so
 * it is darkened from the kit palette until it passes WCAG AA on both
 * (temperament.test.ts checks). The kit's brighter colours stay inside the
 * sticker card.
 */
export type TemperamentId = "analysts" | "diplomats" | "sentinels" | "explorers";

export interface Temperament {
  name: string;
  accent: string;
  tint: string;
}

export const TEMPERAMENTS: Record<TemperamentId, Temperament> = {
  analysts: { name: "Nhóm Tư Duy", accent: "#6d28d9", tint: "#eef2ff" },
  diplomats: { name: "Nhóm Lý Tưởng", accent: "#be185d", tint: "#fdf2f8" },
  sentinels: { name: "Nhóm Vững Chãi", accent: "#047857", tint: "#fffbf0" },
  explorers: { name: "Nhóm Trải Nghiệm", accent: "#c2410c", tint: "#fff7d6" },
};

const TYPE_RE = /^[EI][SN][TF][JP]$/;

export function temperamentOf(type: string): TemperamentId {
  if (!TYPE_RE.test(type)) {
    throw new Error(`temperamentOf: not an MBTI type "${type}"`);
  }
  if (type[1] === "N") return type[2] === "T" ? "analysts" : "diplomats";
  return type[3] === "J" ? "sentinels" : "explorers";
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run app/personal-definition/_lib/__tests__/temperament.test.ts`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add app/personal-definition/_lib/temperament.ts app/personal-definition/_lib/__tests__/temperament.test.ts
git commit -F - <<'EOF'
Derive the sticker-kit temperament from the MBTI type

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 2: Lift the kit into the repo and adopt its pose map

**Files:**
- Create: `app/personal-definition/_assets/mascot/kit/extract-kit.mjs` (committed, re-runnable)
- Create (generated): `app/personal-definition/_assets/mascot/kit/pose-{1..8}.webp`
- Create (generated): `app/personal-definition/_components/result/sticker.module.css`
- Create (generated): `app/personal-definition/_components/result/stickerScenes.ts`
- Modify: `app/personal-definition/_lib/mascot.ts` (pose imports lines 1–8; `POSE_BY_TYPE` table)
- Delete: `app/personal-definition/_assets/mascot/poses/pose-{1..8}.png`
- Test: `app/personal-definition/_lib/__tests__/mascot.test.ts`
- Test: `app/personal-definition/_components/__tests__/stickerScenes.test.ts`

**Interfaces:**
- Consumes: `TemperamentId` (Task 1).
- Produces:
  ```ts
  // stickerScenes.ts (generated)
  export const SCENES: Record<TemperamentId, { back: string; front: string }>;
  // inner SVG markup of the kit's back and front layers; front of explorers
  // contains the literal placeholder "{{TAG}}" where the graffiti word goes.
  ```
  `sticker.module.css` exports the kit classes, including `stk`, `stk__layer`, `stk__back`, `stk__front`, `stk__mascot`, `stk__badge`, `stk--analyst`, `stk--diplomat`, `stk--sentinel`, `stk--explorer`, plus every class used inside the scene markup (`trace`, `pad`, `gear`, …).
  `poseForType(type)` keeps its signature and throw; returns the kit pose.

- [ ] **Step 1: Write the extraction script**

`app/personal-definition/_assets/mascot/kit/extract-kit.mjs`:

```js
// Lifts the Temperament Sticker Kit into the repo. Re-run whenever the kit
// changes:  node app/personal-definition/_assets/mascot/kit/extract-kit.mjs "<path to kit html>"
// Outputs are committed; do not hand-edit them.
import fs from "node:fs";
import path from "node:path";

const kitPath = process.argv[2];
if (!kitPath) throw new Error("usage: extract-kit.mjs <Temperament Sticker Kit.html>");
const kit = fs.readFileSync(kitPath, "utf8");
const root = "app/personal-definition";

// 1. Eight pose webps, from the kit's POSE = {"1": "data:…", …} table.
const poses = [...kit.matchAll(/"(\d)":\s*"data:image\/webp;base64,([A-Za-z0-9+/=]+)"/g)];
if (poses.length !== 8) throw new Error(`expected 8 poses, got ${poses.length}`);
for (const [, n, b64] of poses) {
  fs.writeFileSync(path.join(root, "_assets/mascot/kit", `pose-${n}.webp`), Buffer.from(b64, "base64"));
}

// 2. Card CSS: the shared frame + the four temperament blocks, as one module.
const blocks = [...kit.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)]
  .map((m) => m[1])
  .filter((c) => /^\s*\/\* (Shared frame|ANALYSTS|DIPLOMATS|SENTINELS|EXPLORERS)/.test(c));
if (blocks.length !== 5) throw new Error(`expected 5 card style blocks, got ${blocks.length}`);
const css = blocks
  .join("\n")
  // No web fonts in this app: kit display/body fonts inherit font-momo-trust,
  // mono and graffiti fall back to platform stacks.
  .replaceAll('"JetBrains Mono", monospace', 'ui-monospace, Menlo, monospace')
  .replaceAll('"Fredoka", sans-serif', "inherit")
  .replaceAll('"Be Vietnam Pro", sans-serif', "inherit")
  .replaceAll('"Bungee", Impact, sans-serif', 'Impact, "Arial Black", sans-serif');
if (/JetBrains|Fredoka|Be Vietnam|Bungee/.test(css)) throw new Error("unreplaced kit font left in CSS");
const capture = `
/* Added by extract-kit.mjs: a capture records one frame, so pin everything
   to rest (mirrors mascot.module.css). */
:global([data-capturing]) .stk *,
:global([data-capturing]) .stk::before,
:global([data-capturing]) .stk::after { animation: none !important; transition: none !important; }
`;
fs.writeFileSync(
  path.join(root, "_components/result/sticker.module.css"),
  `/* GENERATED by _assets/mascot/kit/extract-kit.mjs from the Temperament Sticker Kit. Do not edit by hand. */\n${css}\n${capture}`,
);

// 3. Scene SVG: the back and front layer of each temperament's hero card.
const KIT_TO_ID = { analyst: "analysts", diplomat: "diplomats", sentinel: "sentinels", explorer: "explorers" };
const scenes = {};
for (const m of kit.matchAll(/<div class="stk stk--(analyst|diplomat|sentinel|explorer)"[^>]*data-hero[^>]*>/g)) {
  const layer = (name) => {
    const open = `<svg class="stk__layer stk__${name}" viewBox="0 0 300 360" aria-hidden="true">`;
    const start = kit.indexOf(open, m.index);
    if (start < 0) throw new Error(`${m[1]}: ${name} layer not found with the expected opening tag`);
    const end = kit.indexOf("</svg>", start);
    return kit
      .slice(start + open.length, end)
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/(<text[^>]*data-tag[^>]*>)[^<]*/g, "$1{{TAG}}")
      .replace(/\s+\n/g, "\n")
      .trim();
  };
  scenes[KIT_TO_ID[m[1]]] = { back: layer("back"), front: layer("front") };
}
if (Object.keys(scenes).length !== 4) throw new Error(`expected 4 scenes, got ${Object.keys(scenes).length}`);
if (!scenes.explorers.front.includes("{{TAG}}")) throw new Error("explorers tag placeholder missing");
fs.writeFileSync(
  path.join(root, "_components/result/stickerScenes.ts"),
  `// GENERATED by _assets/mascot/kit/extract-kit.mjs from the Temperament Sticker Kit. Do not edit by hand.
// Inner markup of each temperament card's back and front SVG layers. Class
// names are the kit's; StickerCard maps them to sticker.module.css at runtime.
import type { TemperamentId } from "../../_lib/temperament";

export const SCENES: Record<TemperamentId, { back: string; front: string }> = ${JSON.stringify(scenes, null, 2)};
`,
);
console.log("ok: 8 poses, card CSS, 4 scenes");
```

- [ ] **Step 2: Run it**

```bash
mkdir -p app/personal-definition/_assets/mascot/kit app/personal-definition/_components/result
node app/personal-definition/_assets/mascot/kit/extract-kit.mjs "D:/download/MVP_MBTI/Temperament Sticker Kit.html"
ls app/personal-definition/_assets/mascot/kit app/personal-definition/_components/result
```

Expected: `ok: 8 poses, card CSS, 4 scenes`; eight `pose-N.webp` (22–33 KB each); `sticker.module.css`; `stickerScenes.ts`.

- [ ] **Step 3: Write the failing tests**

In `_lib/__tests__/mascot.test.ts`, replace the test `"gives the two types in a temperament pair the same pose"` with:

```ts
  it("follows the sticker kit's pose map", () => {
    const KIT: Record<number, [string, string]> = {
      1: ["ENTP", "ISFP"], 2: ["INFP", "ESFJ"], 3: ["INTJ", "INFJ"], 4: ["ENTJ", "ISTJ"],
      5: ["ENFP", "ESTP"], 6: ["INTP", "ISTP"], 7: ["ENFJ", "ISFJ"], 8: ["ESTJ", "ESFP"],
    };
    for (const [pose, [a, b]] of Object.entries(KIT)) {
      expect(srcOf(poseForType(a)), `${a}`).toMatch(new RegExp(`pose-${pose}\\.webp`));
      expect(srcOf(poseForType(b)), `${b}`).toMatch(new RegExp(`pose-${pose}\\.webp`));
    }
  });

  it("gives each pose to two types from two different temperaments", () => {
    const byPose = new Map<string, string[]>();
    for (const t of ALL_TYPES) {
      const src = srcOf(poseForType(t));
      byPose.set(src, [...(byPose.get(src) ?? []), t]);
    }
    for (const [src, types] of byPose) {
      expect(types, src).toHaveLength(2);
      expect(temperamentOf(types[0]!), src).not.toBe(temperamentOf(types[1]!));
    }
  });
```

and add `import { temperamentOf } from "../temperament";` at the top.

Create `_components/__tests__/stickerScenes.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { SCENES } from "../result/stickerScenes";

describe("stickerScenes (generated)", () => {
  it("has a back and front layer for all four temperaments", () => {
    expect(Object.keys(SCENES).sort()).toEqual(["analysts", "diplomats", "explorers", "sentinels"]);
    for (const [id, s] of Object.entries(SCENES)) {
      expect(s.back.length, `${id} back`).toBeGreaterThan(50);
      expect(s.front.length, `${id} front`).toBeGreaterThan(50);
    }
  });

  it("puts the graffiti placeholder only in the explorers front layer", () => {
    expect(SCENES.explorers.front).toContain("{{TAG}}");
    for (const id of ["analysts", "diplomats", "sentinels"] as const) {
      expect(SCENES[id].front + SCENES[id].back).not.toContain("{{TAG}}");
    }
  });

  it("carries no scripts, event handlers or external references", () => {
    for (const s of Object.values(SCENES)) {
      const all = s.back + s.front;
      expect(all).not.toMatch(/<script|\son\w+=|href=|url\(/i);
    }
  });
});
```

- [ ] **Step 4: Run to verify the mascot tests fail**

Run: `npx vitest run app/personal-definition/_lib/__tests__/mascot.test.ts app/personal-definition/_components/__tests__/stickerScenes.test.ts`
Expected: the two new mascot tests FAIL (old PNG map); stickerScenes tests pass.

- [ ] **Step 5: Swap the pose map in `mascot.ts`**

Replace the eight `import poseN from "../_assets/mascot/poses/pose-N.png";` lines with:

```ts
import pose1 from "../_assets/mascot/kit/pose-1.webp";
import pose2 from "../_assets/mascot/kit/pose-2.webp";
import pose3 from "../_assets/mascot/kit/pose-3.webp";
import pose4 from "../_assets/mascot/kit/pose-4.webp";
import pose5 from "../_assets/mascot/kit/pose-5.webp";
import pose6 from "../_assets/mascot/kit/pose-6.webp";
import pose7 from "../_assets/mascot/kit/pose-7.webp";
import pose8 from "../_assets/mascot/kit/pose-8.webp";
```

Replace the `POSE_BY_TYPE` doc comment and table with:

```ts
/**
 * The Temperament Sticker Kit's map: each pose goes to the two types whose
 * attitude it already shows, deliberately in two *different* temperaments —
 * the temperament scene around the mascot carries the difference.
 */
const POSE_BY_TYPE: Record<string, ImageAsset> = {
  ENTP: pose1, ISFP: pose1, // wink, tongue out, waving
  INFP: pose2, ESFJ: pose2, // giggling, hearts
  INTJ: pose3, INFJ: pose3, // hand on chin, thinking
  ENTJ: pose4, ISTJ: pose4, // fist pump, striding
  ENFP: pose5, ESTP: pose5, // blowing a kiss, running
  INTP: pose6, ISTP: pose6, // sunglasses + popcorn
  ENFJ: pose7, ISFJ: pose7, // big smile, waving
  ESTJ: pose8, ESFP: pose8, // wink in a shopping cart
};
```

`poseForType` is unchanged.

- [ ] **Step 6: Delete the old poses**

```bash
git grep -n "mascot/poses" -- app/personal-definition   # expect no hits
git rm app/personal-definition/_assets/mascot/poses/pose-*.png
```

If the grep finds a hit, stop and fix that import before deleting.

- [ ] **Step 7: Run tests and typecheck**

Run: `npx vitest run app/personal-definition` — all pass.
Run: `npx tsc --noEmit` — only the 3 pre-existing errors.

- [ ] **Step 8: Commit**

```bash
git add app/personal-definition/_assets/mascot app/personal-definition/_components/result app/personal-definition/_lib/mascot.ts app/personal-definition/_lib/__tests__/mascot.test.ts app/personal-definition/_components/__tests__/stickerScenes.test.ts
git commit -F - <<'EOF'
Lift the Temperament Sticker Kit and adopt its pose map

extract-kit.mjs pulls the 8 poses, the card CSS (module, kit fonts
swapped for platform stacks) and the 4 scene SVGs. Poses now pair
across temperaments as the kit specifies; old PNG poses removed.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 3: `StickerCard`

**Files:**
- Create: `app/personal-definition/_components/result/StickerCard.tsx`
- Test: `app/personal-definition/_components/__tests__/StickerCard.test.tsx`

**Interfaces:**
- Consumes: `temperamentOf`, `TEMPERAMENTS` (Task 1); `SCENES`, `sticker.module.css` (Task 2); `poseForType`, `srcOf`.
- Produces: `export function StickerCard({ type }: { type: string }): JSX.Element` — root has `data-testid="sticker-card"` and `data-type={type}`.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StickerCard } from "../result/StickerCard";

const ALL_TYPES = [
  "INTJ", "INTP", "ENTJ", "ENTP", "INFJ", "INFP", "ENFJ", "ENFP",
  "ISTJ", "ISFJ", "ESTJ", "ESFJ", "ISTP", "ISFP", "ESTP", "ESFP",
];

describe("StickerCard", () => {
  it("tags the card with its type so the kit's per-type colours apply", () => {
    render(<StickerCard type="ENFP" />);
    expect(screen.getByTestId("sticker-card")).toHaveAttribute("data-type", "ENFP");
  });

  it("shows the type and the Vietnamese temperament name on the badge", () => {
    render(<StickerCard type="INTJ" />);
    const badge = screen.getByTestId("sticker-badge");
    expect(badge).toHaveTextContent("INTJ");
    expect(badge).toHaveTextContent("Nhóm Tư Duy");
    expect(badge).not.toHaveTextContent(/Analysts/i);
  });

  it("names the mascot in Vietnamese and hides every decoration", () => {
    const { container } = render(<StickerCard type="ISTJ" />);
    expect(screen.getByAltText("Linh vật ISTJ")).toBeInTheDocument();
    const svgs = container.querySelectorAll("svg");
    expect(svgs).toHaveLength(2);
    svgs.forEach((s) => expect(s).toHaveAttribute("aria-hidden", "true"));
  });

  // Review Focus 2
  it("renders all 16 types, with the right graffiti tag only on Explorers", () => {
    const TAGS: Record<string, string> = { ISTP: "FIX IT", ISFP: "VIBE", ESTP: "GO!", ESFP: "SHOW!" };
    for (const type of ALL_TYPES) {
      const { container, unmount } = render(<StickerCard type={type} />);
      const html = container.innerHTML;
      expect(html, type).not.toContain("{{TAG}}");
      if (TAGS[type]) expect(html, type).toContain(`>${TAGS[type]}<`);
      unmount();
    }
  });

  it("throws on a non-MBTI type instead of drawing an empty card", () => {
    expect(() => render(<StickerCard type="XXXX" />)).toThrow(/XXXX/);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run app/personal-definition/_components/__tests__/StickerCard.test.tsx`
Expected: FAIL — cannot resolve `../result/StickerCard`.

- [ ] **Step 3: Implement**

```tsx
import { poseForType, srcOf } from "../../_lib/mascot";
import { temperamentOf, TEMPERAMENTS, type TemperamentId } from "../../_lib/temperament";
import { SCENES } from "./stickerScenes";
import styles from "./sticker.module.css";

/** Kit modifier class per temperament. */
const KIT_CLASS: Record<TemperamentId, string> = {
  analysts: "stk--analyst",
  diplomats: "stk--diplomat",
  sentinels: "stk--sentinel",
  explorers: "stk--explorer",
};

/** Explorers' graffiti word — kit art text, kept in English (spec §5 ①). */
const TAGS: Record<string, string> = { ISTP: "FIX IT", ISFP: "VIBE", ESTP: "GO!", ESFP: "SHOW!" };

/** Kit class name(s) → CSS-module class name(s). Unknown names pass through. */
function cx(...names: string[]): string {
  return names.map((n) => styles[n] ?? n).join(" ");
}

/**
 * The scene markup is the kit's own static SVG (see extract-kit.mjs and
 * stickerScenes.test.ts: no scripts, handlers or external refs), so it is
 * injected as HTML. Its class attributes are rewritten once, at module load,
 * to the module-scoped names.
 */
function localize(html: string): string {
  return html.replace(/class="([^"]*)"/g, (_, names: string) => `class="${cx(...names.split(/\s+/).filter(Boolean))}"`);
}

const LOCAL_SCENES = Object.fromEntries(
  Object.entries(SCENES).map(([id, s]) => [id, { back: localize(s.back), front: localize(s.front) }]),
) as Record<TemperamentId, { back: string; front: string }>;

export function StickerCard({ type }: { type: string }) {
  const id = temperamentOf(type);
  const scene = LOCAL_SCENES[id];
  const front = scene.front.replace("{{TAG}}", TAGS[type] ?? "");

  return (
    <div data-testid="sticker-card" data-type={type} className={cx("stk", KIT_CLASS[id])}>
      <svg
        className={cx("stk__layer", "stk__back")}
        viewBox="0 0 300 360"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: scene.back }}
      />
      <img className={cx("stk__mascot")} src={srcOf(poseForType(type))} alt={`Linh vật ${type}`} />
      <svg
        className={cx("stk__layer", "stk__front")}
        viewBox="0 0 300 360"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: front }}
      />
      <div data-testid="sticker-badge" className={cx("stk__badge")}>
        <b>{type}</b>
        <span>{TEMPERAMENTS[id].name}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests and typecheck**

Run: `npx vitest run app/personal-definition` — all pass.
Run: `npx tsc --noEmit` — only the 3 pre-existing errors.

- [ ] **Step 5: Commit**

```bash
git add app/personal-definition/_components/result/StickerCard.tsx app/personal-definition/_components/__tests__/StickerCard.test.tsx
git commit -F - <<'EOF'
Add the temperament sticker card

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 4: `ResultCard` and `DimensionBreakdown`

**Files:**
- Create: `app/personal-definition/_components/result/ResultCard.tsx`
- Create: `app/personal-definition/_components/result/DimensionBreakdown.tsx`
- Test: `app/personal-definition/_components/__tests__/DimensionBreakdown.test.tsx`

**Interfaces:**
- Consumes: `POLE_NAMES`, `dominantPole` from `_lib/poles.ts`; `MBTIResult`, `Dimension` from `_lib/types.ts`; `questions.json` (`poles`, `pole_definitions`).
- Produces:
  ```ts
  export function ResultCard(p: { title: string; accent: string; children: ReactNode }): JSX.Element; // <section> with <h2>
  export function Chip(p: { label: string; accent: string }): JSX.Element;
  export function DimensionBreakdown(p: { mbti: MBTIResult; keywords: string[]; accent: string }): JSX.Element;
  ```
  Each dimension row has `data-testid="dim-EI"` etc.; its marker has `data-testid="dim-EI-marker"`.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { DimensionBreakdown } from "../result/DimensionBreakdown";
import { dominantPole, POLE_NAMES } from "../../_lib/poles";
import type { Dimension, MBTIResult } from "../../_lib/types";
import bank from "../../_lib/data/questions.json";
import { profile } from "./fixtures";

const DIMS: Dimension[] = ["EI", "SN", "TF", "JP"];
const POLES = (bank as { poles: Record<Dimension, { first: string; second: string }> }).poles;
const DEFS = (bank as { pole_definitions: Record<string, string> }).pole_definitions;
const ACCENT = "#6d28d9";

function renderWith(mbti: MBTIResult) {
  return render(<DimensionBreakdown mbti={mbti} keywords={["tò mò", "linh hoạt"]} accent={ACCENT} />);
}

describe("DimensionBreakdown", () => {
  it("is headed 'Bốn chiều của bạn' and lists EI, SN, TF, JP in order", () => {
    renderWith(profile.mbti);
    expect(screen.getByRole("heading", { name: "Bốn chiều của bạn" })).toBeInTheDocument();
    const rows = screen.getAllByTestId(/^dim-(EI|SN|TF|JP)$/);
    expect(rows.map((r) => r.dataset.testid)).toEqual(["dim-EI", "dim-SN", "dim-TF", "dim-JP"]);
  });

  // Review Focus 4
  it("gives each row a text alternative with both poles and both percentages", () => {
    renderWith(profile.mbti);
    for (const d of DIMS) {
      const { first, second } = POLES[d];
      const s = profile.mbti.dimensions[d];
      expect(
        within(screen.getByTestId(`dim-${d}`)).getByText(
          `${POLE_NAMES[first]} ${s.first}%, ${POLE_NAMES[second]} ${s.second}%`,
        ),
      ).toBeInTheDocument();
    }
  });

  it("explains the winning pole under each row", () => {
    renderWith(profile.mbti);
    for (const d of DIMS) {
      const { pole } = dominantPole(d, profile.mbti.dimensions[d]);
      expect(within(screen.getByTestId(`dim-${d}`)).getByText(DEFS[pole]!)).toBeInTheDocument();
    }
  });

  // Review Focus 5 — fixture EI leans E (first pole), so the marker is left of centre.
  it("puts the marker on the winning side", () => {
    renderWith(profile.mbti);
    const s = profile.mbti.dimensions.EI;
    expect(s.first).toBeGreaterThan(50);
    const left = parseFloat(screen.getByTestId("dim-EI-marker").style.left);
    expect(left).toBe(100 - s.first);
    expect(left).toBeLessThan(50);
  });

  // Review Focus 1
  it("shows a 50/50 dimension as the default pole, marker centred", () => {
    const tied: MBTIResult = {
      ...profile.mbti,
      dimensions: { ...profile.mbti.dimensions, EI: { ...profile.mbti.dimensions.EI, raw: 0, first: 50, second: 50 } },
    };
    renderWith(tied);
    const row = screen.getByTestId("dim-EI");
    expect(within(row).getByText(DEFS["I"]!)).toBeInTheDocument();
    expect(screen.getByTestId("dim-EI-marker").style.left).toBe("50%");
  });

  it("renders the keywords as chips", () => {
    renderWith(profile.mbti);
    expect(screen.getByText("tò mò")).toBeInTheDocument();
    expect(screen.getByText("linh hoạt")).toBeInTheDocument();
  });
});
```

Note: `DimensionScore` has `raw`, `first`, `second` (see `_lib/types.ts`). If it has more required fields, spread them from the fixture as shown.

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run app/personal-definition/_components/__tests__/DimensionBreakdown.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `ResultCard.tsx`**

```tsx
import type { ReactNode } from "react";

/** White result section card with an accent-barred heading (spec §6). */
export function ResultCard({ title, accent, children }: { title: string; accent: string; children: ReactNode }) {
  return (
    <section className="bg-white rounded-3xl p-5 shadow-[0_10px_30px_-12px_rgba(15,23,42,.15)] flex flex-col gap-4">
      <h2 className="flex items-center gap-2 text-[18px] font-bold text-[#1e293b]">
        <span aria-hidden className="w-1.5 h-5 rounded-full" style={{ backgroundColor: accent }} />
        {title}
      </h2>
      {children}
    </section>
  );
}

export function Chip({ label, accent }: { label: string; accent: string }) {
  return (
    <span
      className="inline-flex items-center px-3 py-1 rounded-full bg-white text-sm font-medium"
      style={{ color: accent, boxShadow: `0 0 0 1px ${accent}40` }}
    >
      {label}
    </span>
  );
}
```

- [ ] **Step 4: Implement `DimensionBreakdown.tsx`**

```tsx
import { ResultCard, Chip } from "./ResultCard";
import { dominantPole, POLE_NAMES } from "../../_lib/poles";
import type { Dimension, MBTIResult } from "../../_lib/types";
import bank from "../../_lib/data/questions.json";

const DIMENSIONS: Dimension[] = ["EI", "SN", "TF", "JP"];
const POLES = (bank as { poles: Record<Dimension, { first: string; second: string }> }).poles;
const DEFINITIONS = (bank as { pole_definitions: Record<string, string> }).pole_definitions;

/**
 * Two-sided scale per dimension. The marker sits `100 - first`% from the
 * left, so it leans toward whichever pole won; a 50/50 tie centres it and
 * `dominantPole` names the default pole (I/N/F/P), matching the type letter.
 * The track is decorative — the sr-only line carries the numbers.
 */
export function DimensionBreakdown({
  mbti,
  keywords,
  accent,
}: {
  mbti: MBTIResult;
  keywords: string[];
  accent: string;
}) {
  return (
    <ResultCard title="Bốn chiều của bạn" accent={accent}>
      <ul className="flex flex-col gap-5">
        {DIMENSIONS.map((d) => {
          const { first, second } = POLES[d];
          const score = mbti.dimensions[d];
          const win = dominantPole(d, score);
          const side = (pole: string) => (
            <span
              className={pole === win.pole ? "font-bold" : "text-[#64748b]"}
              style={pole === win.pole ? { color: accent } : undefined}
            >
              {POLE_NAMES[pole]}
              {pole === win.pole && ` ${win.percent}%`}
            </span>
          );
          return (
            <li key={d} data-testid={`dim-${d}`} className="flex flex-col gap-2">
              <p className="sr-only">
                {`${POLE_NAMES[first]} ${score.first}%, ${POLE_NAMES[second]} ${score.second}%`}
              </p>
              <div aria-hidden className="flex justify-between text-sm">
                {side(first)}
                {side(second)}
              </div>
              <div aria-hidden className="relative h-2 rounded-full bg-[#e2e8f0]">
                <span
                  data-testid={`dim-${d}-marker`}
                  className="absolute top-1/2 w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
                  style={{ left: `${100 - score.first}%`, backgroundColor: accent }}
                />
              </div>
              <p className="text-sm leading-relaxed text-[#475569]">{DEFINITIONS[win.pole]}</p>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap gap-2">
        {keywords.map((k) => (
          <Chip key={k} label={k} accent={accent} />
        ))}
      </div>
    </ResultCard>
  );
}
```

- [ ] **Step 5: Run tests and typecheck**

Run: `npx vitest run app/personal-definition` — all pass.
Run: `npx tsc --noEmit` — only the 3 pre-existing errors.

- [ ] **Step 6: Commit**

```bash
git add app/personal-definition/_components/result/ResultCard.tsx app/personal-definition/_components/result/DimensionBreakdown.tsx app/personal-definition/_components/__tests__/DimensionBreakdown.test.tsx
git commit -F - <<'EOF'
Add the two-sided dimension breakdown card

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 5: `StrengthsGrowth` and `CareerSection`

**Files:**
- Create: `app/personal-definition/_components/result/StrengthsGrowth.tsx`
- Create: `app/personal-definition/_components/result/CareerSection.tsx`
- Test: `app/personal-definition/_components/__tests__/ResultSections.test.tsx`

**Interfaces:**
- Consumes: `ResultCard`, `Chip` (Task 4).
- Produces:
  ```ts
  export function StrengthsGrowth(p: { strengths: string[]; growthAreas: string[]; accent: string }): JSX.Element;
  export function CareerSection(p: { hints: string[]; accent: string }): JSX.Element;
  ```

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { StrengthsGrowth } from "../result/StrengthsGrowth";
import { CareerSection } from "../result/CareerSection";
import { profile } from "./fixtures";

const ACCENT = "#c2410c";

describe("StrengthsGrowth", () => {
  it("lists every strength and growth area under its own heading", () => {
    render(
      <StrengthsGrowth
        strengths={profile.synthesis.strengths}
        growthAreas={profile.synthesis.growth_areas}
        accent={ACCENT}
      />,
    );
    const strengths = screen.getByRole("heading", { name: "Điểm mạnh" }).closest("section")!;
    const growth = screen.getByRole("heading", { name: "Điểm cần cải thiện" }).closest("section")!;
    expect(within(strengths).getAllByRole("listitem")).toHaveLength(profile.synthesis.strengths.length);
    expect(within(growth).getAllByRole("listitem")).toHaveLength(profile.synthesis.growth_areas.length);
  });
});

describe("CareerSection", () => {
  it("shows every career hint as a chip, with the hint-not-verdict footnote", () => {
    render(<CareerSection hints={profile.synthesis.career_hints} accent={ACCENT} />);
    expect(screen.getByRole("heading", { name: "Nghề nghiệp phù hợp" })).toBeInTheDocument();
    for (const h of profile.synthesis.career_hints) {
      expect(screen.getByText(h)).toBeInTheDocument();
    }
    expect(
      screen.getByText("Gợi ý để bạn tìm hiểu thêm, không phải lựa chọn duy nhất."),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run app/personal-definition/_components/__tests__/ResultSections.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement `StrengthsGrowth.tsx`**

```tsx
import { ResultCard } from "./ResultCard";

function Bullets({ items, accent }: { items: string[]; accent: string }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((it) => (
        <li key={it} className="flex gap-2.5 text-[15px] leading-relaxed text-[#1e293b]">
          <span aria-hidden className="mt-2 w-1.5 h-1.5 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
          {it}
        </li>
      ))}
    </ul>
  );
}

/** Two cards; side by side from 640px, stacked below (spec §5 ③). */
export function StrengthsGrowth({
  strengths,
  growthAreas,
  accent,
}: {
  strengths: string[];
  growthAreas: string[];
  accent: string;
}) {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <ResultCard title="Điểm mạnh" accent={accent}>
        <Bullets items={strengths} accent={accent} />
      </ResultCard>
      <ResultCard title="Điểm cần cải thiện" accent={accent}>
        <Bullets items={growthAreas} accent={accent} />
      </ResultCard>
    </div>
  );
}
```

- [ ] **Step 4: Implement `CareerSection.tsx`**

```tsx
import { ResultCard, Chip } from "./ResultCard";

/** Chips without icons — hints are free text (spec D5). */
export function CareerSection({ hints, accent }: { hints: string[]; accent: string }) {
  return (
    <ResultCard title="Nghề nghiệp phù hợp" accent={accent}>
      <div className="flex flex-wrap gap-2">
        {hints.map((h) => (
          <Chip key={h} label={h} accent={accent} />
        ))}
      </div>
      <p className="text-xs text-[#64748b]">Gợi ý để bạn tìm hiểu thêm, không phải lựa chọn duy nhất.</p>
    </ResultCard>
  );
}
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run app/personal-definition` — all pass.

- [ ] **Step 6: Commit**

```bash
git add app/personal-definition/_components/result/StrengthsGrowth.tsx app/personal-definition/_components/result/CareerSection.tsx app/personal-definition/_components/__tests__/ResultSections.test.tsx
git commit -F - <<'EOF'
Add strengths/growth and career result cards

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 6: `ResultHero`, compose `SynthesisView`, full-bleed in `page.tsx`

**Files:**
- Create: `app/personal-definition/_components/result/ResultHero.tsx`
- Modify: `app/personal-definition/_components/SynthesisView.tsx` (full rewrite as composition)
- Modify: `app/personal-definition/page.tsx` (synthesis early return)
- Test: `app/personal-definition/_components/__tests__/SynthesisView.test.tsx` (rewrite)

**Interfaces:**
- Consumes: everything from Tasks 1–5.
- Produces: `export function ResultHero(p: { mbti: MBTIResult; name: string; narrative: string; accent: string }): JSX.Element`. `SynthesisView({ profile, actions? })` keeps its signature.

- [ ] **Step 1: Rewrite `SynthesisView.test.tsx`**

Replace the whole file:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SynthesisView } from "../SynthesisView";
import { dominantPole } from "../../_lib/poles";
import type { Dimension } from "../../_lib/types";
import { profile } from "./fixtures";

const DIMENSIONS: Dimension[] = ["EI", "SN", "TF", "JP"];

describe("SynthesisView", () => {
  it("guards the fixture: four distinct, non-tied percentages, type ESFP", () => {
    const percents = DIMENSIONS.map((d) => dominantPole(d, profile.mbti.dimensions[d]).percent);
    expect(new Set(percents).size).toBe(4);
    expect(percents).not.toContain(50);
    expect(profile.mbti.type).toBe("ESFP");
  });

  it("leads with the sticker card, the type as the page heading, and the Vietnamese label", () => {
    render(<SynthesisView profile={profile} />);
    expect(screen.getByTestId("sticker-card")).toHaveAttribute("data-type", "ESFP");
    expect(screen.getByRole("heading", { level: 1, name: profile.mbti.type })).toBeInTheDocument();
    expect(screen.getByText(profile.mbti.label)).toBeInTheDocument();
  });

  it("shows the user's name without zodiac or life path", () => {
    render(<SynthesisView profile={profile} />);
    expect(screen.getByTestId("result-name")).toHaveTextContent(profile.user.name);
    expect(screen.getByTestId("result-name")).not.toHaveTextContent(profile.zodiac.sun_sign);
  });

  it("renders the narrative including its caveat", () => {
    render(<SynthesisView profile={profile} />);
    expect(screen.getByText(/không phải toàn bộ con người bạn/)).toBeInTheDocument();
  });

  it("renders the four sections in order", () => {
    render(<SynthesisView profile={profile} />);
    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual(["Bốn chiều của bạn", "Điểm mạnh", "Điểm cần cải thiện", "Nghề nghiệp phù hợp"]);
  });

  it("has no zodiac or numerology anywhere on the screen", () => {
    const { container } = render(<SynthesisView profile={profile} />);
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/Cung |Thần số học|Số Chủ Đạo|Số Sứ Mệnh|Số Linh Hồn|Số Nhân Cách/);
    expect(text).not.toContain(profile.zodiac.sun_sign);
  });

  it("paints the page in the temperament tint", () => {
    render(<SynthesisView profile={profile} />);
    // ESFP → explorers → #fff7d6
    expect(screen.getByTestId("result-page")).toHaveStyle({ backgroundColor: "#fff7d6" });
  });

  it("renders whatever actions it is given", () => {
    render(<SynthesisView profile={profile} actions={<button>Lưu ảnh</button>} />);
    expect(screen.getByRole("button", { name: "Lưu ảnh" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run app/personal-definition/_components/__tests__/SynthesisView.test.tsx`
Expected: FAIL — no `sticker-card`, old headings, zodiac present.

- [ ] **Step 3: Implement `ResultHero.tsx`**

```tsx
import { StickerCard } from "./StickerCard";
import type { MBTIResult } from "../../_lib/types";

/** Spec §5 ①: sticker card, type, label, name — then the narrative unchanged. */
export function ResultHero({
  mbti,
  name,
  narrative,
  accent,
}: {
  mbti: MBTIResult;
  name: string;
  narrative: string;
  accent: string;
}) {
  return (
    <header className="flex flex-col items-center text-center gap-3">
      <StickerCard type={mbti.type} />
      <h1 className="mt-2 text-[40px] leading-none font-extrabold tracking-wide" style={{ color: accent }}>
        {mbti.type}
      </h1>
      <p className="text-lg font-semibold text-[#1e293b]">{mbti.label}</p>
      <p data-testid="result-name" className="text-sm text-[#475569] break-words max-w-full">
        {name}
      </p>
      <p className="mt-2 text-left text-base leading-relaxed text-[#1e293b]">{narrative}</p>
    </header>
  );
}
```

- [ ] **Step 4: Rewrite `SynthesisView.tsx`**

Replace the whole file:

```tsx
"use client";

import type { ReactNode } from "react";
import type { PersonalProfile } from "../_lib/types";
import { temperamentOf, TEMPERAMENTS } from "../_lib/temperament";
import { ResultHero } from "./result/ResultHero";
import { DimensionBreakdown } from "./result/DimensionBreakdown";
import { StrengthsGrowth } from "./result/StrengthsGrowth";
import { CareerSection } from "./result/CareerSection";

/**
 * The result screen: four sections in the user's temperament colours.
 * Zodiac and numerology are deliberately absent (spec D3) — the engine still
 * computes them for the halfway teaser. `actions` is rendered last; Spec B
 * (share + Idol Match) plugs in there.
 */
export function SynthesisView({ profile, actions }: { profile: PersonalProfile; actions?: ReactNode }) {
  const { mbti, synthesis, user } = profile;
  const { accent, tint } = TEMPERAMENTS[temperamentOf(mbti.type)];

  return (
    <div data-testid="result-page" className="min-h-screen px-5 py-8" style={{ backgroundColor: tint }}>
      <div className="max-w-[600px] mx-auto flex flex-col gap-6">
        <ResultHero mbti={mbti} name={user.name} narrative={synthesis.narrative} accent={accent} />
        <DimensionBreakdown mbti={mbti} keywords={synthesis.personality_keywords} accent={accent} />
        <StrengthsGrowth strengths={synthesis.strengths} growthAreas={synthesis.growth_areas} accent={accent} />
        <CareerSection hints={synthesis.career_hints} accent={accent} />
        {actions}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Render synthesis full-bleed in `page.tsx`**

After the `if (state.phase === "onboarding") { … }` block, add:

```tsx
  // The result paints its own full-bleed temperament background and
  // constrains its content internally, so it sits outside the container.
  if (state.phase === "synthesis" && state.profile) {
    return <SynthesisView profile={state.profile} />;
  }
```

and delete the line `{state.phase === "synthesis" && state.profile && <SynthesisView profile={state.profile} />}` from the container.

- [ ] **Step 6: Run the full subpage suite, typecheck, full repo**

Run: `npx vitest run app/personal-definition` — all pass (the full-flow page test still reaches "Bốn chiều của bạn").
Run: `npx tsc --noEmit` — only the 3 pre-existing errors.
Run: `npx vitest run` — only `tests/db-connection.test.ts` may fail.

- [ ] **Step 7: Commit**

```bash
git add app/personal-definition/_components/result/ResultHero.tsx app/personal-definition/_components/SynthesisView.tsx app/personal-definition/page.tsx app/personal-definition/_components/__tests__/SynthesisView.test.tsx
git commit -F - <<'EOF'
Compose the new result screen from the sticker hero and section cards

Zodiac and numerology leave the result screen; the engine is unchanged.
The result renders full-bleed in its temperament tint.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

- [ ] **Step 8: Hand Khanh the walkthrough checklist (do not run it yourself)**

`npm run dev` → finish the test at 390px width, then:
1. Sticker card matches the kit for your temperament: scene, glow, corner props, badge in Vietnamese.
2. Answer to get a different temperament (or check with a teammate) — scene and page tint change.
3. Explorers card shows its graffiti word; other temperaments show none.
4. Type is large in the accent colour; label and name beneath; narrative reads unchanged.
5. Each dimension row: both pole names, marker leaning to the winner, winner's % and definition.
6. Strengths and growth stack on the phone; side by side on a laptop.
7. Career chips plus the footnote line.
8. No zodiac or numerology anywhere on the result.
9. With OS "reduce motion" on, the card is a still frame.
10. Card fits on a 320px-wide screen without horizontal scroll.
