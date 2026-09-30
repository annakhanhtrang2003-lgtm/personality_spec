# Personal Definition — Result Screen (Spec A) (Design)

**Date:** 2026-09-30
**Branch:** `feature/personal-definition/ui`
**Lands after:** `2026-09-30-personal-definition-onboarding-design.md` (its plan runs first; both touch `page.tsx`'s tree).
**Visual source:** `D:\download\MVP_MBTI\Temperament Sticker Kit.html` — 8 mascot poses (webp) and 4 temperament scenes (CSS + SVG), declared final by Khanh.
**Companion:** Spec B (Idol Match + share), written separately. This spec leaves no placeholder for it.

## 1. Why

The result screen has the right content but reads as one long column of eight identically styled lists under tiny grey labels. It is the payoff of a ten-minute test and the thing students will screenshot. It should feel like *their* world.

In scope: sections ①–④ below. Out of scope here: share button and `ShareCard` changes, Idol Match (both Spec B); any change to `buildProfile`, scoring, or authored copy.

## 2. Decisions carried in from brainstorming

| # | Decision |
|---|---|
| D1 | Result stays the `synthesis` phase of `/personal-definition`. No `app/result/[mbti]` route — the profile lives only in memory (anonymous, no DB). |
| D2 | Type naming is ours: the Vietnamese `label` from `mbti-types.json` (e.g. ENFP = "Người thắp ý tưởng"). 16personalities' nicknames ("The Campaigner") and axis names (Mind/Energy/Nature/Tactics/Identity) are not used — ruled out 07-19 and 09-18. |
| D3 | **Zodiac and numerology are removed from the result screen** — no sections, not in the hero sub-line. The engine still computes them (the 50% teaser uses them). |
| D4 | The narrative paragraph is shown unchanged, including its two soft flavour sentences. `profile.ts` is not touched. |
| D5 | Careers render as chips **without icons** — hints are free text; an icon per hint would be a guess. |
| D6 | The mascot is presented in the kit's temperament scene card, lifted as designed. |

## 3. Temperament

Derived from the four letters, never stored:

| Letters | Kit id | Name shown (proposed — Khanh to confirm) | Scene |
|---|---|---|---|
| N + T | `analysts` | Nhóm Tư Duy | Neon circuit lab |
| N + F | `diplomats` | Nhóm Lý Tưởng | Pastel daydream |
| S + J | `sentinels` | Nhóm Vững Chãi | The tidy ledger |
| S + P | `explorers` | Nhóm Trải Nghiệm | Street-poster pop |

The English group names are the kit's code identifiers only; they never reach the UI. The Vietnamese names are our own and are the only copy this spec introduces.

`_lib/temperament.ts` exports `temperamentOf(type: string): TemperamentId` (throws on an invalid type, like `poseForType`) and a `TEMPERAMENTS` table with `{ name, accent, tint }` per id:

| id | accent (text/chips, ≥ 4.5:1 on white) | tint (page background) |
|---|---|---|
| analysts | `#6d28d9` | `#eef2ff` |
| diplomats | `#be185d` | `#fdf2f8` |
| sentinels | `#047857` | `#fffbf0` |
| explorers | `#c2410c` | `#fff7d6` |

Accents are darkened from each kit palette so they pass contrast as text; the kit's own brighter colours stay inside the scene card.

## 4. Mascot poses — adopt the kit's map

The repo maps 16 types onto 8 poses *within* a temperament (ENTJ = ENTP). The kit maps them *across* temperaments, each pose going "to the type whose attitude it already shows":

| Pose | Kit description | Types |
|---|---|---|
| 1 | wink, tongue out, waving | ENTP, ISFP |
| 2 | giggling, hearts | INFP, ESFJ |
| 3 | hand on chin, thinking | INTJ, INFJ |
| 4 | fist pump, striding | ENTJ, ISTJ |
| 5 | blowing a kiss, running | ENFP, ESTP |
| 6 | sunglasses + popcorn | INTP, ISTP |
| 7 | big smile, waving | ENFJ, ISFJ |
| 8 | wink in a shopping cart | ESTJ, ESFP |

- The 8 kit webps are extracted into `_assets/mascot/kit/pose-{1..8}.webp` and `POSE_BY_TYPE` in `mascot.ts` is replaced with this table. `poseForType` keeps its signature and its throw.
- `ShareCard` calls `poseForType`, so it follows automatically.
- `mascot.test.ts`: the test "gives the two types in a temperament pair the same pose" is replaced by one pinning the table above, plus "each pose spans two different temperaments".
- The old `_assets/mascot/poses/pose-*.png` become unused and are deleted. `faces/` stays (interlude uses it).
- Alt text: `Linh vật ${type}` as today (Vietnamese, not the kit's English).

## 5. Page structure

`SynthesisView` becomes a thin composition; each section is its own component in `_components/result/`. Order:

### ① Hero — `ResultHero.tsx` + `StickerCard.tsx`

- `StickerCard` renders the kit's 300×360 card for the user's temperament: back layer, mascot (72% height, feet on the 88% baseline, glow as `filter`), front layer with the four corner props A–D, and the badge (type code + Vietnamese temperament name).
  - Per-type accent pairs from the kit (`--a1/--a2`, `--d1/--d2`, `--s1/--s2`, `--e1/--e2`) are set via `data-type` on the card.
  - Explorers' graffiti tag keeps the kit's text per type (FIX IT / VIBE / GO! / SHOW!) — it is art, not copy, and `aria-hidden`.
  - All scene SVG is decorative (`aria-hidden`); the mascot `img` carries the alt.
  - Card is centred and scales down on screens narrower than 340px (`max-width: 100%`, aspect ratio 5:6 kept).
- Below the card: type code (large), `mbti.label`, the user's display name. No zodiac, no life-path number (D3).
- Then `synthesis.narrative`, unchanged (D4).

### ② Bốn chiều của bạn — `DimensionBreakdown.tsx`

One row per dimension, EI, SN, TF, JP:
- **Two-sided scale:** first pole name at the left, second at the right (from `POLE_NAMES`), a track with a marker at the first pole's percentage (`mbti.dimensions[d].first`), and the winning side's percentage shown next to its name. Winner determined by `dominantPole` so a 50/50 tie shows the default pole exactly as the type letter does.
- Under each row, the winning pole's definition from `questions.json` → `pole_definitions` (existing Vietnamese copy).
- After the four rows: `personality_keywords` as chips.
- Section heading text stays **"Bốn chiều của bạn"** (the full-flow page test anchors on it).
- The scale is exposed to assistive tech as text ("Hướng ngoại 72%, Hướng nội 28%"); the track itself is `aria-hidden`.

### ③ Điểm mạnh & Điểm cần cải thiện — `StrengthsGrowth.tsx`

Two cards: "Điểm mạnh" (`synthesis.strengths`, 5 items) and "Điểm cần cải thiện" (`synthesis.growth_areas`, 3 items). Side by side at ≥ 640px, stacked below. Heading "Điểm cần cải thiện" replaces today's "Có thể để ý thêm".

### ④ Nghề nghiệp phù hợp — `CareerSection.tsx`

`synthesis.career_hints` as chips (6 per type), no icons (D5). Heading "Nghề nghiệp phù hợp" replaces "Hướng nghề gợi mở". One muted line under the chips: "Gợi ý để bạn tìm hiểu thêm, không phải lựa chọn duy nhất." — keeps career advice framed as a hint, consistent with the 07-19 layer separation.

### Removed

"Từ khóa" as a standalone section (folded into ②), "Cung …" and "Thần số học" sections (D3).

## 6. Look

- Page background: the temperament `tint`, full-bleed. Quiz/interlude keep `bg-worker-bg`.
- Sections ②–④: white cards, `rounded-3xl`, soft shadow (`shadow-[0_10px_30px_-12px_rgba(15,23,42,.15)]`), `p-5`, `gap-6` between cards.
- Section headings: 18px bold `#1e293b` with a small accent bar in the temperament `accent`. Chips: white with accent text and a 1px accent-tinted ring.
- `SynthesisView` keeps its `actions?: ReactNode` prop, rendered after ④, for Spec B.

## 7. Motion

Kit rules: animate only `transform`, `opacity`, `stroke-dashoffset`; back layer never faster than 3s; one media query stops everything under `prefers-reduced-motion`, leaving a complete still frame.

The kit's IntersectionObserver pause is for lists of cards; the result screen shows one card, so it is not implemented (YAGNI).

Existing `mascot.module.css` `[data-capturing]` rule is mirrored in the sticker CSS so a future capture of the card exports a resting frame.

## 8. Style exception

Extends the onboarding spec §7 exception to the result screen: `_components/result/*` may use arbitrary Tailwind values and inline `style` for temperament values, and one CSS module `sticker.module.css` holds the kit's scene CSS (lifted from the kit, class names converted to module-local). No global CSS, no new fonts (kit's display/mono fonts are replaced by `font-momo-trust`; the binary strings and badge use the platform monospace stack).

## 9. Cross-spec fix — pole names

`POLE_NAMES` says S = "Thực tế"; the onboarding plan's `partTheme` copied the prototype's "Giác quan". Resolution: `partTheme.poleNames` is derived from `POLE_NAMES` so intro, quiz and result can never disagree. Applied as an amendment to onboarding plan Task 1 before it runs.

## 10. Files

All under `app/personal-definition/`.

| File | Status |
|---|---|
| `_lib/temperament.ts` | new |
| `_lib/mascot.ts` | modified — kit pose map, kit asset imports |
| `_assets/mascot/kit/pose-{1..8}.webp` | new |
| `_assets/mascot/poses/pose-{1..8}.png` | deleted |
| `_components/result/StickerCard.tsx` | new |
| `_components/result/sticker.module.css` | new |
| `_components/result/ResultHero.tsx` | new |
| `_components/result/DimensionBreakdown.tsx` | new |
| `_components/result/StrengthsGrowth.tsx` | new |
| `_components/result/CareerSection.tsx` | new |
| `_components/SynthesisView.tsx` | modified — composition only |
| `page.tsx` | modified — synthesis renders full-bleed (tint background) outside the 600px container, content constrained inside `ResultHero`/sections |

## 11. Tests

1. `temperamentOf`: all 16 types map per §3; invalid type throws.
2. `TEMPERAMENTS`: four entries, each with a non-empty Vietnamese name.
3. `mascot`: pose table exactly as §4; every pose used by exactly two types from two different temperaments; unknown type still throws.
4. `StickerCard`: sets `data-type`; badge shows type + Vietnamese temperament name; decoration is `aria-hidden`; mascot alt is `Linh vật ${type}`.
5. `DimensionBreakdown`: four rows in EI, SN, TF, JP order; both pole names per row; percentages from the fixture; a 50/50 row shows the default pole (I/N/F/P) as winner; winning pole's definition rendered.
6. `SynthesisView` (with the existing distinct-score fixture): renders ①–④ headings; no text "Cung", "Thần số học", "Số Chủ Đạo"; hero sub-line contains the name but not the sun sign.
7. Page full-flow test continues to reach "Bốn chiều của bạn".

## 12. Open for Khanh

- Confirm the four Vietnamese temperament names in §3.
- Confirm the career hint footnote line in ④.
