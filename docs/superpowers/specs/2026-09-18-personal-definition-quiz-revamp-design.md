# Personal Definition — Quiz Revamp (Design)

**Date:** 2026-09-18
**Branch:** `feature/personal-definition/ui`
**Supersedes:** the quiz-screen portion of `2026-07-29-personal-definition-ui-design.md` (§6 quiz phase). Everything else in that spec — onboarding, synthesis, share card, layer separation — stands unchanged.

## 1. Why

Four problems with the shipped quiz, in the order they were raised:

1. **The items read poorly.** Six of ten TF items and one SN item are written as comparisons ("A hơn B", "kể cả khi"). On an agree/disagree scale these are unscoreable — see §6.
2. **One question per screen gives no sense of progress.** The user cannot see how much of a part is left, so there is nothing pulling them forward.
3. **Answers stack vertically**, which wastes the screen and makes each item feel like a separate page.
4. **Nothing is revealed until 100%.** A 40-item quiz with a single payoff at the end loses people in the middle.

Not in scope: changing the psychometric model. The instrument stays 40 items, four dimensions, 5-point Likert, `S = Σ(r × key)`. No fifth axis, no 7-point scale, no change to `MBTIResult` or anything Step 2 consumes.

Item text is authored by us in Vietnamese, as it has been since the 2026-07-19 spec. No third-party item bank is used or adapted.

## 2. Shape of the change

| # | Change | Touches |
|---|---|---|
| 1 | Quiz screen becomes one **part** (10 items) as an accordion | `state.ts`, `parts.ts`, `_components/` |
| 2 | Answers become a **horizontal 5-dot scale** | new `LikertScale.tsx` |
| 3 | Part header: **progress bar + mascot, centred** | new `QuizPart.tsx` |
| 4 | **50% teaser** — zodiac and numerology revealed, MBTI locked | `InterludeView.tsx`, `page.tsx` |
| 5 | **10 items rewritten** — 7 structural, 3 trims | `data/questions.json` |

Shipped as one increment. The four are coupled: the rewrite exists to fit the accordion row, the dot scale only makes sense in the new layout, and the teaser reuses the interlude that the accordion changes the entry into. Splitting them means writing the quiz component twice.

## 3. State model

`state.current` carried two meanings that the accordion separates: *which screen* and *which row is open*. It is replaced by two fields.

```ts
export interface State {
  phase: "onboarding" | "quiz" | "interlude" | "synthesis";
  input: Input;
  responses: (Response | null)[];
  part: number;          // 0..PART_COUNT-1 — which screen
  open: number | null;   // absolute item index, or null = all rows collapsed
  profile: PersonalProfile | null;
}
```

### Actions

| Action | Behaviour |
|---|---|
| `SET_INPUT` | unchanged |
| `START_QUIZ` | validate; `phase = "quiz"`, `part = 0`, `open = firstIndexOfPart(0)` |
| `ANSWER {index, value}` | record the response, then apply the auto-advance rule below |
| `TOGGLE {index}` | `open = open === index ? null : index` |
| `FINISH_PART` | no-op unless every item of `part` is answered. Last part → same as `FINISH`. Otherwise `phase = "interlude"` |
| `CONTINUE` | interlude only; `part += 1`, `phase = "quiz"`, `open = firstIndexOfPart(part + 1)` |
| `BACK` | from interlude → `phase = "quiz"` (same `part`). From quiz with `part > 0` → `part -= 1`, `open = null`. From quiz at `part === 0` → no-op |
| `FINISH` | unchanged — refuses while any response is `null` |

`NEXT` is removed. `BACK` changes meaning from "previous question" to "previous part"; per-question back is meaningless when ten questions share a screen.

### Auto-advance rule

After `ANSWER`, `open` moves to the next **unanswered** item *within the current part*, scanning ascending from `index + 1` and then wrapping to the start of the part. If every item in the part is answered, `open = null`.

Collapsing everything is the signal that the part is done — the "Xong phần" button enables at exactly that moment, so the state that ends the screen and the state that reveals the exit are the same state.

This rule lives in the reducer rather than the component because it is the behaviour that decides whether the screen feels smooth, and it is the one most likely to be tuned repeatedly. Pure-function tests make that iteration cheap; `jsdom` accordion tests would not.

### `parts.ts`

Keeps `PART_SIZE`, `PART_COUNT`, `PART_TITLES`, `partOf`, `indexWithinPart`, `firstIndexOfPart`, `lastIndexOfPart`.

- **Add** `indicesOfPart(part): number[]`
- **Add** `export const TEASER_PART = 1` — the 50% boundary
- **Remove** `isLastOfPart` — its only caller was the `NEXT` branch

## 4. Components

`QuizItem` splits three ways.

| Component | Responsibility | Props |
|---|---|---|
| `QuizPart` | part header, ten rows, the end-of-part button | `part`, `responses`, `open`, `onAnswer`, `onToggle`, `onFinishPart`, `onBack` |
| `QuizItem` | **one** accordion row | `index`, `text`, `value`, `isOpen`, `onToggle`, `onAnswer` |
| `LikertScale` | the five dots and their labels | `options`, `value`, `onChange`, `questionId` |

### Row states

- **Collapsed, unanswered** — ordinal + full item text + chevron
- **Collapsed, answered** — ordinal + item text + check mark, muted
- **Open** — item text at full size + `LikertScale`

Item text stays on one or two lines at ≤ 16 syllables (§6), so a collapsed row never truncates mid-clause.

### `LikertScale` and the shared-UI constraint

CONTRIBUTING requires `components/worker/ui/`. There is no scale component there, and the nearest fit does not work:

`RadioButton` accepts `{label, name, value, checked, onChange, size, disabled}`. It renders the label as visible text beside the input and exposes neither `aria-label` nor `className`. A dot scale needs the label *hidden* (it appears below the scale on selection, not beside each dot), so the only way to use `RadioButton` is `label=""` — which produces five radios with no accessible name. That is a real accessibility defect, not a cosmetic one.

**Decision:** `LikertScale` uses native `<input type="radio">` inside a `<fieldset>` whose `<legend>` is the question text, each input carrying `aria-label` set to its Likert label. Styling uses the existing token `accent-worker-primary` and Tailwind utilities already in use — **no new CSS is introduced**.

This is a deliberate, recorded deviation: the component is composed from primitives rather than routed through the `RadioButton` wrapper, because the wrapper cannot express an accessible hidden label. It belongs to the same class as the existing `DatePicker` "Select a value" entry in `.superpowers/sdd/progress.md` — a shared primitive missing something this subpage needs — and should be raised with the Shared-UI owner, who may prefer to add `aria-label` to `RadioButton` and have us switch back.

**Consequence:** the five dots are equal in size. The graduated circles of the 16personalities scale would require custom CSS and are out of scope.

### Likert labels

`LIKERT_SETS` and the `label_set` field survive intact. Both five-point sets, `self` and `situation`, keep their current wording and `likert.test.ts` is unchanged.

Presentation changes only: the two extremes are printed as anchors under the ends of the scale ("Đồng ý" / "Không đồng ý"), and the label of the selected dot appears beneath the scale after selection. The Vietnamese labels become feedback on a choice rather than five blocks of text to read before choosing.

## 5. Part header and the 50% teaser

### Header

```
        ●●○○   Phần 2/4
       Cách bạn tiếp nhận
         ( mascot )
      ━━━━━━━━━╸──────
          6/10 câu
```

Centred column: part dots and label, `PART_TITLES[part]`, mascot, `ProgressBar` valued on answered-items-within-part, count.

The mascot now tracks **progress through the part**, changing face at 0 / 5 / 10 answered. It previously mirrored the current answer (`faceFor(value)`), which has no meaning when ten items share a screen.

### Teaser

`InterludeView` gains `preview?: { zodiac: ZodiacResult; numerology: NumerologyResult }`. `page.tsx` passes it only when `state.part === TEASER_PART`; the interludes after part 0 and part 2 keep their existing encouragement lines and are otherwise untouched. (`part` is 0-based, so the three interlude boundaries are after parts 0, 1 and 2; `TEASER_PART = 1` is the middle one.)

When `preview` is present the body renders three rows:

| Row | Content | Source |
|---|---|---|
| Cung hoàng đạo | `zodiac.sun_sign` + `zodiac.traits[0]` | `calculateZodiac(input.birth_date)` |
| Số Chủ Đạo | `numerology.life_path` + first clause of `interpretations.life_path` | `calculateNumerology(input.birth_date, input.full_name)` |
| Nhóm tính cách MBTI | lock icon, "Còn 20 câu nữa" | static — reads nothing |

Both values are computed in `page.tsx` inside a `useMemo` keyed on `input.birth_date` and `input.full_name`, and passed down; `InterludeView` stays presentational. `validateInput` has already rejected an invalid or future `birth_date` before `START_QUIZ` succeeds, so neither function can throw at this point.

**No partial MBTI scoring is added.** `scoreMBTI` keeps its "exactly 40 responses or throw" contract. The MBTI row is a static locked panel, so a halfway reveal can never contradict the final result — which is the failure that would do most damage, since Step 2's career advice is built on the MBTI output.

## 6. Item rewrite

`id`, `dimension` and `label_set` are preserved for every item. `key` changes on exactly two items, as a balanced pair (§6.3).

### 6.1 Rules

1. **One pole, one clause.** No "hơn", "hơn là", "kể cả khi"; no two-clause constructions.
2. **≤ 16 syllables (âm tiết)**, so a collapsed accordion row never truncates mid-clause. Syllables, not "words" — Vietnamese compounds make word-counting ambiguous, and syllables are what determine rendered width. Count whitespace-separated tokens, ignoring punctuation.
3. **A real disagree side** — an ordinary student must plausibly choose "không đồng ý".

Rule 3 is the hard one, and it is why this is not a copy-edit. The comparative clause was doing real work: it forced a T-versus-F trade-off. Delete it naively and `tf_03` becomes *"tôi giao phần quan trọng cho người chắc tay nhất"*, which nearly everyone endorses — the item stops discriminating. Where the single-pole phrasing is only natural at the opposite pole, the item is rewritten there and its `key` flips.

### 6.2 Group A — structural rewrites (7)

| id | dim | key | Current | Proposed |
|---|---|---|---|---|
| `tf_02` | TF | `+1` | Tranh luận trong nhóm, tôi ngả theo bên có lý lẽ vững hơn, kể cả khi bên kia đang rất cần người ủng hộ. | Trong tranh luận, lý lẽ chặt chẽ là thứ thuyết phục được tôi. |
| `tf_03` | TF | `+1` → **`-1`** | Chia việc nhóm, tôi giao phần quan trọng cho người chắc tay nhất hơn là cho người đang muốn thử sức. | Chia việc nhóm, tôi muốn ai cũng có cơ hội làm phần quan trọng. |
| `tf_04` | TF | `+1` | Đứng trước lựa chọn khó, tôi nghiêng về lý lẽ hơn cảm xúc. | Lựa chọn khó, tôi liệt kê ra cho rõ rồi mới quyết. |
| `tf_05` | TF | `+1` | Tôi thấy quy định chung thì nên giữ như nhau, kể cả khi ai đó có hoàn cảnh riêng. | Quy định chung thì nên áp dụng như nhau với mọi người. |
| `tf_09` | TF | `-1` → **`+1`** | Quyết định lớn, tôi ưu tiên điều tốt cho người trong cuộc hơn phương án tối ưu trên giấy. | Quyết định lớn, tôi chọn phương án hiệu quả nhất. |
| `tf_10` | TF | `-1` | Với tôi, cả nhóm vui vẻ với nhau quan trọng không kém kết quả cuối cùng. | Không khí trong nhóm với tôi cũng là một kết quả. |
| `sn_01` | SN | `+1` | Tôi tin vào những gì mình quan sát được hơn là linh cảm. | Tôi chỉ tin khi tự mình quan sát được. |

### 6.3 Key balance

Balanced keying is what keeps `S = Σ(r × key)` free of acquiescence bias, so it is an invariant, not a preference.

`tf_03` moves `+1 → -1` and `tf_09` moves `-1 → +1` as a **pair**, leaving TF at five items per pole:

- `key: +1` — `tf_01`, `tf_02`, `tf_04`, `tf_05`, `tf_09`
- `key: -1` — `tf_03`, `tf_06`, `tf_07`, `tf_08`, `tf_10`

SN, EI and JP keep their existing 5/5 split; `sn_01` keeps `key: +1`.

### 6.4 Group B — length trims (3)

Meaning, `key`, pole and `label_set` are preserved; these are shortened only to satisfy rule 2.

| id | Current (syllables) | Proposed (syllables) |
|---|---|---|
| `ei_03` | Nghĩ chưa ra thì tôi nói ra cho bạn nghe, nói tới đâu sáng ra tới đó. (17) | Nghĩ chưa ra, tôi nói ra cho bạn nghe rồi mới rõ. (12) |
| `sn_04` | Ý tưởng nghe hay tới mấy, tôi vẫn đợi thấy nó chạy được thật rồi mới tin. (17) | Ý tưởng hay tới mấy, tôi vẫn đợi thấy nó chạy thật. (12) |
| `tf_06` | Trước khi quyết định, tôi hay nghĩ xem chuyện đó ảnh hưởng tới cảm xúc của ai. (17) | Trước khi quyết định, tôi nghĩ xem ai sẽ bị ảnh hưởng. (12) |

### 6.5 Items left alone

The other 30 items are single-clause and within the limit, so they are not touched. Nine of them sit at 15–16 syllables and are the longest that will ship:

`ei_07` (15), `ei_09` (15), `jp_06` (15), `jp_09` (15), `sn_02` (15), `sn_05` (16), `sn_07` (16), `sn_09` (16), `sn_10` (16).

These are the items to watch when the collapsed row is first rendered on a narrow viewport. The 16-syllable limit is a proxy for rendered width, not a measurement of it; if a 16-syllable row truncates badly in practice, trimming this list is a follow-up content task, not a redesign.

All 10 proposed strings in §6.2 and §6.4 are drafts pending Khanh's Vietnamese review. The ids, dimensions, `label_set` values and the §6.3 key assignment are not drafts.

## 7. Testing

### Rewritten

- `state.test.ts` — navigation section replaced. New coverage: auto-advance to next unanswered; wrap to start of part; `open = null` when the part completes; `TOGGLE` open and closed; `FINISH_PART` refused while incomplete; `FINISH_PART` on the last part builds the profile; `BACK` from interlude, from `part > 0`, and the no-op at `part === 0`.
- `QuizItem.test.tsx` — split into `QuizItem.test.tsx` (one row: three visual states, toggle, answer) and `QuizPart.test.tsx` (header, ten rows, button enablement).
- `InterludeView.test.tsx` — add the `preview` case; assert the MBTI row is locked and renders no type.
- `page.test.tsx` — rewire; assert `preview` is passed at `TEASER_PART` and withheld at the other two boundaries.

### New

- `LikertScale.test.tsx` — five inputs, each with an accessible name; selection calls `onChange` with the right `Response`; selected label appears.

### Unchanged

`likert.test.ts`, `zodiac.test.ts`, `numerology.test.ts`, `date.test.ts`, `normalize.test.ts`, `birthdate.test.ts`, `poles.test.ts`, `mascot.test.ts`, `types.test.ts`, `profile.test.ts`.

### Known risk

`mbti.test.ts` and `content.test.ts` may hold fixtures that depend on item order or on the specific `key` of `tf_03` / `tf_09`. The §6.3 pair swap preserves every aggregate (5/5 per dimension, 40 items, 10 per dimension), so aggregate assertions hold; a fixture naming those two ids directly would not. This is the one unresolved risk in this design and is checked by running the suite in the first task that touches `questions.json`.

`profile.test.ts` asserts that identical answers with different birthdays yield identical career signals. Nothing here touches that path — the teaser reads zodiac and numerology for display only, exactly as the layer separation in the 2026-07-19 spec requires.

## 8. Out of scope

- Graduated (size-varying) scale dots — needs custom CSS
- Separate zodiac and numerology reveal screens (2026-07-19 spec §6 phases 1–2)
- Share/download card and OG image
- Any change to the number of items, the number of dimensions, or the response scale
- Persistence: the quiz remains anonymous, client-side, no DB
