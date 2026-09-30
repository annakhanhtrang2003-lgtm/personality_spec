# Personal Definition — UI round 2 design

**Date:** 2026-07-30
**Branch:** `feature/personal-definition/ui`
**Supersedes nothing.** Extends `2026-07-29-personal-definition-ui-design.md`, which shipped the first vertical slice.

## Why

Khanh walked the shipped slice on localhost and gave three pieces of feedback:

1. **Onboarding.** Picking a birth year is impractical — the shared `DatePicker` opens on the current month and offers only ◀/▶ month arrows (`components/worker/ui/Calendar.tsx:36-52`), so a student born in 2004 clicks back roughly 260 times.
2. **Quiz.** Forty questions in one undifferentiated run is discouraging. Split into four parts of ten, make progress feel like it moves, and warm up the answer copy.
3. **Result.** The synthesis screen is plain text with nothing worth showing anyone. It needs illustration, motion, and a share button that produces an image.

## Constraints carried from `CONTRIBUTING.md`

- Only `app/personal-definition/**` and `app/api/personal-definition/**` may be touched.
- Shared components under `components/worker/ui/` are read-only to this cluster — including `DatePicker` and `Calendar`. Fixes to them are out of scope; we design around them.
- No new global styles. Local CSS scoped under the route is acceptable.
- Commit locally; never push or open the PR.

**One constraint is knowingly broken.** Feedback 3 requires rasterising the result card, and no capable library is present. Khanh chose `html-to-image` over the alternatives (server-rendered `next/og`, hand-drawn canvas) with the trade-off stated. That adds a dependency to the shared `package.json` and `package-lock.json`. **The PR description must call this out for the repo owner.** The design confines all knowledge of the library to a single module so that, if the owner refuses, only that file changes.

## Feature 1 — Birth date as three selects

Replace the `DatePicker` in `OnboardingForm` with three shared `Select`s: day, month, year.

```
Ngày sinh
[ Ngày ▾ ][ Tháng ▾ ][ Năm ▾ ]
```

- **Year range:** 2012 → 1990, newest first. Covers the student audience; anyone outside it is not this product's user.
- **Day count follows month and year** — 30/31, and 29 for leap Februaries. If the day is already 31 and the user switches to a 30-day month, the day resets to empty rather than silently becoming the 30th.
- **`birth_date` stays `YYYY-MM-DD`.** It is only populated once all three parts are chosen; a partial selection leaves it empty and `validateInput` reports `"Chọn đủ ngày, tháng và năm."`.
- The scoring engine, numerology, and zodiac see no change whatsoever.

New pure module `_lib/birthdate.ts`:

```ts
export function daysInMonth(month: number, year: number): number
export function toIso(day: number, month: number, year: number): string   // "" if incomplete
export function fromIso(iso: string): { day: number; month: number; year: number } | null
export const YEARS: number[]   // 2012…1990
```

This also removes two known problems for free: the English `"Select a value"` placeholder leaking from the shared `DatePicker`, and the jsdom popover that blocked a page-level integration test.

## Feature 2 — Quiz in four parts

### Structure

New pure module `_lib/parts.ts` holds `PART_SIZE = 10`, derived `PART_COUNT = QUESTION_COUNT / PART_SIZE`, the part titles, and `partOf(index)` / `indexWithinPart(index)` / `isPartBoundary(index)`. A module-load assertion fails loudly if the bank size stops dividing evenly.

Items are **not reordered**. `questions.json` already cycles `EI → SN → TF → JP` with alternating keying, so a straight 1-10 / 11-20 / 21-30 / 31-40 cut gives every part all four dimensions. Scores are bit-for-bit identical to the current build.

Part titles, describing the journey rather than the psychometric axis:

| Part | Items | Title |
|---|---|---|
| 1 | 1-10 | Bạn giữa mọi người |
| 2 | 11-20 | Cách bạn tiếp nhận |
| 3 | 21-30 | Cách bạn quyết định |
| 4 | 31-40 | Cách bạn sắp xếp |

### Progress

```
●──●──○──○      Phần 2/4
Cách bạn tiếp nhận
▓▓▓▓▓▓░░░░░     Câu 4/10
```

The bar measures progress **within the current part**, so each answer advances it 10% instead of 2.5%. Four dots carry the overall position. This is the actual fix — a progress bar already exists and is not the problem.

### Interlude screens

After the last item of parts 1, 2 and 3 the phase becomes `interlude`:

```
      ( mascot cười tít )

     Xong phần 1/4 rồi!
  Mượt phết — 10 câu chưa
       tới một phút

      ●──○──○──○
       [ Đi tiếp ]
```

Three interludes, each with its own line of copy and mascot expression. There is no interlude after part 4; that transition goes straight to the result.

### Likert copy

The five points stay five, symmetric, and identically weighted — `S = Σ(r × key)` depends on it. What changes is wording. Each item gains a `label_set` field naming one of two sets:

| `label_set` | +2 | +1 | 0 | −1 | −2 |
|---|---|---|---|---|---|
| `self` (items phrased "Tôi thường…") | Đúng y chang mình | Hơi giống mình | Tuỳ lúc | Không giống lắm | Không phải mình |
| `situation` (items phrased "Khi X, tôi…") | Chuẩn luôn | Thường là vậy | Còn tuỳ | Ít khi | Không bao giờ |

Both sets keep the same shape: strong agree, mild agree, neutral, mild disagree, strong disagree. An item with no `label_set` falls back to `self`.

Per-item bespoke labels (200 strings) were considered and rejected: the authoring cost is large and uneven intensity across items would quietly distort scores.

### State model

`Phase` gains `"interlude"`. `GOTO` is replaced by three intention-revealing actions:

- `NEXT` — from the last item of a part, enter `interlude`; otherwise advance one item. Never advances past an unanswered item.
- `BACK` — one item back; from `interlude`, return to the last item of the part just finished.
- `CONTINUE` — leave `interlude` for the first item of the next part.

`FINISH` is unchanged and still refuses to build a profile while any response is null.

## Feature 3 — Result screen and share image

### On-screen

```
╭──────────────────────────────╮
│    ( mascot toàn thân )      │
│            INFJ              │
│  Người lặng lẽ dẫn đường     │
│   Khanh · Sư Tử · Số 7       │
╰──────────────────────────────╯

Hướng nội    ▓▓▓▓▓▓▓░░  72%
Trực giác    ▓▓▓▓▓▓░░░  65%
Cảm xúc      ▓▓▓▓▓▓▓▓░  80%
Linh hoạt    ▓▓▓▓░░░░░  55%

#sâu sắc #kiên định #lắng nghe

Điểm mạnh · Cần để ý · Hướng nghề · Thần số học

[ Lưu ảnh ]        [ Chia sẻ ]
```

Two additions carry most of the "sinh động" the feedback asked for, and both use data the engine already produces and the current screen throws away:

- **Four dimension bars** from `mbti.dimensions[*].first/second`, rendered with the shared `ProgressBar`, each labelled with the winning pole's Vietnamese name and percentage.
- **The type's Vietnamese label** — `mbti-types.json` already carries `label` (INFJ → "Người lặng lẽ dẫn đường"), but `MBTIResult` never exposed it.

**Engine change:** add `label: string` to `MBTIResult` and populate it in `profile.ts` from the type entry. Pure, additive, covered by the existing test file.

Short pole names, new in `_lib/poles.ts`: E Hướng ngoại · I Hướng nội · S Thực tế · N Trực giác · T Lý trí · F Cảm xúc · J Nguyên tắc · P Linh hoạt.

### Share image

A separate fixed-size card, 1080×1350 (4:5 — the tallest ratio Instagram and Facebook feeds accept uncropped, and safe inside a story):

```
╔══════════════════════╗
║  Khanh               ║
║  ( mascot toàn thân )║
║        INFJ          ║
║ Người lặng lẽ dẫn... ║
║ #sâu sắc #kiên định  ║
║ Sư Tử · Số chủ đạo 7 ║
╚══════════════════════╝
```

It renders in the DOM at natural size, positioned off-screen (`position: fixed; left: -9999px`) rather than hidden with `display: none`, which would give the rasteriser nothing to measure. It is **not** the on-screen card restyled: the on-screen card is a responsive column, the share card is a fixed canvas, and trying to make one element serve both is how this kind of feature usually breaks.

Two buttons:

- **Lưu ảnh** — rasterise, download `personal-definition-<TYPE>.png`.
- **Chia sẻ** — rasterise, then `navigator.share({ files })` when `navigator.canShare` accepts files; otherwise fall back to the download path. Failure surfaces as a `Callout`, never a silent no-op.

All library knowledge lives in `_lib/share.ts`:

```ts
export async function renderCardToPng(node: HTMLElement): Promise<Blob>
export async function saveOrShare(node: HTMLElement, filename: string): Promise<'shared' | 'saved'>
```

If the dependency is rejected, `renderCardToPng` is rewritten against Canvas 2D and nothing else moves.

### Mascot

Assets live in `app/personal-definition/_assets/mascot/`, imported statically so Next optimises them and the files stay inside cluster-owned territory. `public/` is shared and is not used.

**Two source sets, two jobs.** They are drawn in different styles — filled dark magenta heads versus pink line-art full bodies — and must never appear on the same screen.

| Set | Source | Use |
|---|---|---|
| 13 heads | `mascot_momo_4-1-2048x1171.png`, a 5×3 sprite sheet (rows of 5, 5, 3) | Quiz interludes and answer reactions |
| 8 full bodies | `Preview/[MOMO]_MoneyEffect_Mascot_1-8.png` from the zip | Result card and share image |

The sheet is sliced once into thirteen transparent PNGs by a PowerShell/`System.Drawing` script, run by hand and committed; it is not part of the build.

**Sixteen types onto eight poses.** Four temperaments × introvert/extravert is exactly eight groups, so the mapping is even and principled rather than arbitrary:

| Pose | Types | Pose | Types |
|---|---|---|---|
| 1 | ENTJ ENTP | 5 | ESTJ ESFJ |
| 2 | INTJ INTP | 6 | ISTJ ISFJ |
| 3 | ENFJ ENFP | 7 | ESTP ESFP |
| 4 | INFJ INFP | 8 | ISTP ISFP |

`_lib/mascot.ts` holds `poseForType(type: string): number` and named constants for the faces. It is pure and unit-tested — including a test asserting all sixteen types resolve.

Only the one pose a user actually earned is fetched.

### Animation

No animation assets exist. The zip holds PNGs, 40 MB PSDs and one `.ai` file; `mascot-momo-video.mp4` is a single fixed clip that cannot vary by type. Motion is therefore CSS over static images, defined in a route-local CSS module:

- Result mascot: `pop-in` on mount, then a slow 3s vertical float.
- Interlude mascot: a short bounce on entry.
- Quiz: the face swaps when an answer is chosen, with a brief scale pulse.
- `prefers-reduced-motion: reduce` disables all of it.

Hand-drawn animation would need the designer to export Lottie or GIF, which is outside this work.

**Animation versus capture.** The rasteriser records one frame; a mascot caught mid-float would export crooked. The share card is deliberately kept free of animation — the float and pop belong to the on-screen result, which is never the thing captured — so the conflict does not arise today. It is guarded anyway: before capture `saveOrShare` sets `data-capturing` on the card root, the CSS module suppresses animation and transform under that attribute, and a `finally` block removes it so a failed capture cannot leave the card frozen. The guard is what makes it safe for someone to add motion to the card later.

## Testing

Pure logic, unit-tested — this is where the risk actually lives:

- `birthdate.ts` — leap years, month lengths, incomplete input yielding `""`, ISO round-trip.
- `parts.ts` — part index from item index, boundaries at 9/10 and 39, divisibility assertion.
- `state.ts` — `NEXT` at a boundary enters `interlude`; `BACK` from `interlude` lands on the part's last item; `CONTINUE` lands on the next part's first item; `NEXT` blocked on an unanswered item; `FINISH` still guarded.
- `mascot.ts` — all sixteen types map to a pose in 1-8; every temperament pair agrees.
- `likert.ts` — both label sets have five entries with values +2…−2; every item's `label_set` resolves.
- `profile.ts` — `label` is populated for all sixteen types.

Component tests with Testing Library: three selects compose a date and clear an out-of-range day; part header shows the right part and within-part count; interlude renders between parts and not after part 4; result card renders four bars, the type label, and both buttons.

`share.ts` is tested with `html-to-image` mocked — asserting `data-capturing` is set before capture and removed after, including on failure, and that the `navigator.share` path falls back to download when files are unsupported. Actual pixel output is verified by hand.

A regression test asserts a fixed response vector still yields the same MBTI type and dimension scores as before the split.

## Out of scope

- Separate zodiac and numerology reveal screens (spec §6 phases 1-2) — still deferred.
- Server-rendered OG image for link previews. `next/og` ships with Next 16 and remains the natural route later.
- Fixing the shared `DatePicker`'s English placeholder — it belongs to another cluster.
- Persisting results. Phase 1 stays anonymous and DB-free.

## Risks

| Risk | Handling |
|---|---|
| Owner rejects the new dependency | Only `_lib/share.ts` changes; rewrite against Canvas 2D |
| `html-to-image` is unreliable on iOS Safari, often needing repeat passes | Verify on a real device; retry once before surfacing an error |
| Full-body PNGs are 227-407 KB | One pose per user, served through Next's optimiser |
| Sprite slicing is manual | Script committed alongside the output so it is reproducible |
| Mascot assets are MoMo brand files | Product is MoMo-branded and Khanh supplied them; no external redistribution |
