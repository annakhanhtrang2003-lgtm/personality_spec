# Personal Definition — UI round 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Act on Khanh's three localhost findings — make birth year selectable, split the 40-item quiz into four parts with warmer copy and real progress, and turn the result screen into an illustrated card that exports as a shareable PNG.

**Architecture:** Everything lives under `app/personal-definition/`. Pure logic goes in `_lib/` as small single-purpose modules with unit tests; presentation goes in `_components/` built only from `components/worker/ui/` primitives. The scoring engine is untouched except for one additive field. All knowledge of the rasterising library is confined to `_lib/share.ts` so it can be swapped without touching the card.

**Tech Stack:** Next 16.2.9 (App Router, Turbopack), React 19.2.4, TypeScript, Tailwind v4, vitest 4 + jsdom + @testing-library/react, `html-to-image` (new dependency).

## Global Constraints

- Touch only `app/personal-definition/**`. The one exception is `package.json` / `package-lock.json` in Task 13, which is deliberate and must be flagged in the PR description.
- `components/worker/ui/**` is read-only to this cluster. Never edit `DatePicker`, `Calendar`, `Select`, `Button`, `Choicebox`, `ProgressBar`, `Callout`, `Chips`, `TextInput`.
- No new global styles. Route-local CSS modules under `app/personal-definition/` are allowed. Design tokens only: `worker-primary`, `worker-bg`, `worker-border`, `worker-danger`, `worker-text-secondary`, `worker-accent`, `rounded-worker-md`, `shadow-worker-card`.
- All user-facing copy is Vietnamese.
- The Likert scale stays five points, symmetric, values `+2 +1 0 −1 −2`. Scoring is `S = Σ(r × key)`; changing point count or intensity invalidates every MBTI result.
- Item order in `questions.json` must not change. The straight 10/10/10/10 cut depends on its existing `EI → SN → TF → JP` rotation.
- Commit after every task. Never push, never open a PR.
- Run tests from the repo root with `npx vitest run <path>`. The vitest config has no `include` glob, so co-located tests under `app/` are picked up automatically.

---

### Task 1: Mascot assets and type→pose mapping

**Files:**
- Create: `app/personal-definition/_assets/mascot/slice-sheet.ps1`
- Create: `app/personal-definition/_assets/mascot/faces/face-01.png` … `face-13.png` (script output)
- Create: `app/personal-definition/_assets/mascot/poses/pose-1.png` … `pose-8.png` (copied)
- Create: `app/personal-definition/_lib/mascot.ts`
- Test: `app/personal-definition/_lib/__tests__/mascot.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `poseForType(type: string): ImageAsset`, `FACES: Record<FaceName, ImageAsset>`, `srcOf(asset: ImageAsset): string`, `type ImageAsset = string | { src: string }`, `type FaceName = "grin" | "smile" | "confident" | "playful" | "worried" | "yummy" | "laugh" | "surprised" | "excited" | "smirk" | "playfulAlt" | "laughAlt" | "kiss"`.

**Why `ImageAsset` is a union:** Next resolves a static `.png` import to `{ src, width, height }`; Vite (and therefore vitest) resolves it to a plain URL string. Code that assumes either shape breaks in one of the two environments. `srcOf` is the single place that reconciles them, and every component uses a plain `<img src={srcOf(asset)}>` rather than `next/image` — `next/image` adds lazy loading and `srcset`, both of which fight the rasteriser in Task 13.

- [ ] **Step 1: Write the slicing script**

The sheet is `D:\download\mascot\mascot_momo_4-1-2048x1171.png`: 13 transparent-background faces laid out in rows of 5, 5 and 3. Do not hardcode coordinates — detect them from the alpha channel, so the script survives a re-export at a different size.

Create `app/personal-definition/_assets/mascot/slice-sheet.ps1`:

```powershell
# One-time asset prep. Run by hand, commit the output.
#   powershell -File slice-sheet.ps1 -Sheet "D:\download\mascot\mascot_momo_4-1-2048x1171.png"
param(
  [Parameter(Mandatory=$true)][string]$Sheet,
  [string]$OutDir = "$PSScriptRoot\faces",
  [int]$Step = 4,      # alpha sampling stride; bands are far wider than 4px
  [int]$Pad  = 8       # padding restored around each detected box
)

Add-Type -AssemblyName System.Drawing
$bmp = [System.Drawing.Bitmap]::FromFile((Resolve-Path $Sheet))
New-Item -ItemType Directory -Force $OutDir | Out-Null

function Get-Bands([int[]]$occupied, [int]$limit) {
  # Turn a per-line "has any opaque pixel" flag array into [start,end] runs.
  $bands = @(); $start = -1
  for ($i = 0; $i -lt $limit; $i++) {
    if ($occupied[$i] -and $start -lt 0) { $start = $i }
    elseif (-not $occupied[$i] -and $start -ge 0) { $bands += ,@($start, $i - 1); $start = -1 }
  }
  if ($start -ge 0) { $bands += ,@($start, $limit - 1) }
  return $bands
}

# Row bands -> the three rows of the sheet.
$rowOccupied = New-Object int[] $bmp.Height
for ($y = 0; $y -lt $bmp.Height; $y += $Step) {
  for ($x = 0; $x -lt $bmp.Width; $x += $Step) {
    if ($bmp.GetPixel($x, $y).A -gt 16) { for ($k = 0; $k -lt $Step -and ($y + $k) -lt $bmp.Height; $k++) { $rowOccupied[$y + $k] = 1 }; break }
  }
}
$rows = Get-Bands $rowOccupied $bmp.Height
Write-Output "Rows detected: $($rows.Count)"

$n = 0
foreach ($row in $rows) {
  # Column bands within this row -> the faces in it.
  $colOccupied = New-Object int[] $bmp.Width
  for ($x = 0; $x -lt $bmp.Width; $x += $Step) {
    for ($y = $row[0]; $y -le $row[1]; $y += $Step) {
      if ($bmp.GetPixel($x, $y).A -gt 16) { for ($k = 0; $k -lt $Step -and ($x + $k) -lt $bmp.Width; $k++) { $colOccupied[$x + $k] = 1 }; break }
    }
  }
  foreach ($col in (Get-Bands $colOccupied $bmp.Width)) {
    $n++
    $x0 = [Math]::Max(0, $col[0] - $Pad); $y0 = [Math]::Max(0, $row[0] - $Pad)
    $x1 = [Math]::Min($bmp.Width  - 1, $col[1] + $Pad)
    $y1 = [Math]::Min($bmp.Height - 1, $row[1] + $Pad)
    $rect = New-Object System.Drawing.Rectangle $x0, $y0, ($x1 - $x0 + 1), ($y1 - $y0 + 1)
    $crop = $bmp.Clone($rect, $bmp.PixelFormat)
    $name = "face-{0:d2}.png" -f $n
    $crop.Save((Join-Path $OutDir $name), [System.Drawing.Imaging.ImageFormat]::Png)
    $crop.Dispose()
    Write-Output "  $name  $($rect.Width)x$($rect.Height)"
  }
}
$bmp.Dispose()
Write-Output "Wrote $n faces to $OutDir"
```

- [ ] **Step 2: Run it and check the count**

Run: `powershell -File "app/personal-definition/_assets/mascot/slice-sheet.ps1" -Sheet "D:\download\mascot\mascot_momo_4-1-2048x1171.png"`
Expected: `Rows detected: 3` and `Wrote 13 faces`. If the count is not 13, raise `-Step` to 2 for finer detection and rerun — do not proceed with a wrong count.

Open two or three outputs and confirm each holds exactly one face, fully inside the frame.

- [ ] **Step 3: Extract the eight full-body poses**

```powershell
$dst = "app/personal-definition/_assets/mascot/poses"
New-Item -ItemType Directory -Force $dst | Out-Null
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead("D:\download\mascot\240801_[MOMO]_Mascot_MoMo_Money-20260730T153357Z-1-001.zip")
foreach ($e in $zip.Entries) {
  if ($e.FullName -match 'Preview/\[MOMO\]_MoneyEffect_Mascot_(\d)\.png$') {
    $out = Join-Path $dst ("pose-{0}.png" -f $Matches[1])
    [System.IO.Compression.ZipFileExtensions]::ExtractToFile($e, $out, $true)
  }
}
$zip.Dispose()
Get-ChildItem $dst | Select-Object Name, Length
```

Expected: `pose-1.png` … `pose-8.png`, each roughly 220–410 KB. Only the `Preview/` PNGs — never the 40 MB PSDs or the `.ai`.

- [ ] **Step 4: Write the failing test**

Create `app/personal-definition/_lib/__tests__/mascot.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { poseForType, FACES, srcOf } from "../mascot";

const ALL_TYPES = [
  "INTJ", "INTP", "ENTJ", "ENTP",
  "INFJ", "INFP", "ENFJ", "ENFP",
  "ISTJ", "ISFJ", "ESTJ", "ESFJ",
  "ISTP", "ISFP", "ESTP", "ESFP",
];

describe("mascot", () => {
  it("resolves a pose for every one of the 16 types", () => {
    for (const type of ALL_TYPES) {
      expect(poseForType(type), type).toBeDefined();
    }
  });

  it("uses exactly the eight available poses", () => {
    const distinct = new Set(ALL_TYPES.map((t) => srcOf(poseForType(t))));
    expect(distinct.size).toBe(8);
  });

  it("gives the two types in a temperament pair the same pose", () => {
    const pairs = [
      ["ENTJ", "ENTP"], ["INTJ", "INTP"],
      ["ENFJ", "ENFP"], ["INFJ", "INFP"],
      ["ESTJ", "ESFJ"], ["ISTJ", "ISFJ"],
      ["ESTP", "ESFP"], ["ISTP", "ISFP"],
    ];
    for (const [a, b] of pairs) {
      expect(srcOf(poseForType(a)), `${a} vs ${b}`).toBe(srcOf(poseForType(b)));
    }
  });

  it("throws on an unknown type rather than rendering a blank card", () => {
    expect(() => poseForType("XXXX")).toThrow(/XXXX/);
  });

  it("exposes thirteen named faces", () => {
    expect(Object.keys(FACES)).toHaveLength(13);
    expect(new Set(Object.values(FACES).map(srcOf)).size).toBe(13);
  });
});
```

- [ ] **Step 5: Run test to verify it fails**

Run: `npx vitest run app/personal-definition/_lib/__tests__/mascot.test.ts`
Expected: FAIL — cannot resolve `../mascot`.

- [ ] **Step 6: Write the implementation**

Create `app/personal-definition/_lib/mascot.ts`:

```ts
import pose1 from "../_assets/mascot/poses/pose-1.png";
import pose2 from "../_assets/mascot/poses/pose-2.png";
import pose3 from "../_assets/mascot/poses/pose-3.png";
import pose4 from "../_assets/mascot/poses/pose-4.png";
import pose5 from "../_assets/mascot/poses/pose-5.png";
import pose6 from "../_assets/mascot/poses/pose-6.png";
import pose7 from "../_assets/mascot/poses/pose-7.png";
import pose8 from "../_assets/mascot/poses/pose-8.png";

import face01 from "../_assets/mascot/faces/face-01.png";
import face02 from "../_assets/mascot/faces/face-02.png";
import face03 from "../_assets/mascot/faces/face-03.png";
import face04 from "../_assets/mascot/faces/face-04.png";
import face05 from "../_assets/mascot/faces/face-05.png";
import face06 from "../_assets/mascot/faces/face-06.png";
import face07 from "../_assets/mascot/faces/face-07.png";
import face08 from "../_assets/mascot/faces/face-08.png";
import face09 from "../_assets/mascot/faces/face-09.png";
import face10 from "../_assets/mascot/faces/face-10.png";
import face11 from "../_assets/mascot/faces/face-11.png";
import face12 from "../_assets/mascot/faces/face-12.png";
import face13 from "../_assets/mascot/faces/face-13.png";

/**
 * Next resolves a static image import to an object; Vite resolves it to a
 * URL string. Both shapes flow through here so neither environment wins.
 */
export type ImageAsset = string | { src: string };

export function srcOf(asset: ImageAsset): string {
  return typeof asset === "string" ? asset : asset.src;
}

export type FaceName =
  | "grin" | "smile" | "confident" | "playful" | "worried"
  | "yummy" | "laugh" | "surprised" | "excited" | "smirk"
  | "playfulAlt" | "laughAlt" | "kiss";

/** Sheet order is row-major, matching slice-sheet.ps1 output. */
export const FACES: Record<FaceName, ImageAsset> = {
  grin: face01,
  smile: face02,
  confident: face03,
  playful: face04,
  worried: face05,
  yummy: face06,
  laugh: face07,
  surprised: face08,
  excited: face09,
  smirk: face10,
  playfulAlt: face11,
  laughAlt: face12,
  kiss: face13,
};

/**
 * Sixteen types onto eight poses: four temperaments split by attitude.
 * Even by construction, so no type is left with a borrowed-looking image.
 */
const POSE_BY_TYPE: Record<string, ImageAsset> = {
  ENTJ: pose1, ENTP: pose1,
  INTJ: pose2, INTP: pose2,
  ENFJ: pose3, ENFP: pose3,
  INFJ: pose4, INFP: pose4,
  ESTJ: pose5, ESFJ: pose5,
  ISTJ: pose6, ISFJ: pose6,
  ESTP: pose7, ESFP: pose7,
  ISTP: pose8, ISFP: pose8,
};

export function poseForType(type: string): ImageAsset {
  const pose = POSE_BY_TYPE[type];
  if (!pose) {
    throw new Error(`poseForType: no mascot pose for MBTI type "${type}"`);
  }
  return pose;
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npx vitest run app/personal-definition/_lib/__tests__/mascot.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 8: Commit**

```bash
git add app/personal-definition/_assets app/personal-definition/_lib/mascot.ts app/personal-definition/_lib/__tests__/mascot.test.ts
git commit -m "Add mascot assets and MBTI type to pose mapping"
```

---

### Task 2: Birth date arithmetic

**Files:**
- Create: `app/personal-definition/_lib/birthdate.ts`
- Test: `app/personal-definition/_lib/__tests__/birthdate.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `YEARS: number[]`, `MONTHS: number[]`, `daysInMonth(month: number, year: number): number`, `toIso(day: number | null, month: number | null, year: number | null): string`, `fromIso(iso: string): { day: number; month: number; year: number } | null`.

- [ ] **Step 1: Write the failing test**

Create `app/personal-definition/_lib/__tests__/birthdate.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { YEARS, MONTHS, daysInMonth, toIso, fromIso } from "../birthdate";

describe("birthdate", () => {
  it("offers 2012 down to 1990, newest first", () => {
    expect(YEARS[0]).toBe(2012);
    expect(YEARS[YEARS.length - 1]).toBe(1990);
    expect(YEARS).toHaveLength(23);
  });

  it("offers twelve months", () => {
    expect(MONTHS).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it("knows month lengths", () => {
    expect(daysInMonth(1, 2004)).toBe(31);
    expect(daysInMonth(4, 2004)).toBe(30);
    expect(daysInMonth(12, 2004)).toBe(31);
  });

  it("handles February across the leap rules", () => {
    expect(daysInMonth(2, 2003)).toBe(28);
    expect(daysInMonth(2, 2004)).toBe(29); // divisible by 4
    expect(daysInMonth(2, 1900)).toBe(28); // century, not divisible by 400
    expect(daysInMonth(2, 2000)).toBe(29); // divisible by 400
  });

  it("builds a zero-padded ISO date", () => {
    expect(toIso(5, 3, 2004)).toBe("2004-03-05");
    expect(toIso(31, 12, 1999)).toBe("1999-12-31");
  });

  it("returns an empty string until all three parts are chosen", () => {
    expect(toIso(null, 3, 2004)).toBe("");
    expect(toIso(5, null, 2004)).toBe("");
    expect(toIso(5, 3, null)).toBe("");
    expect(toIso(null, null, null)).toBe("");
  });

  it("returns an empty string for a day the month does not have", () => {
    expect(toIso(31, 4, 2004)).toBe("");
    expect(toIso(29, 2, 2003)).toBe("");
  });

  it("round-trips an ISO date", () => {
    expect(fromIso("2004-03-05")).toEqual({ day: 5, month: 3, year: 2004 });
  });

  it("returns null for junk or empty input", () => {
    expect(fromIso("")).toBeNull();
    expect(fromIso("05/03/2004")).toBeNull();
    expect(fromIso("2004-13-01")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/personal-definition/_lib/__tests__/birthdate.test.ts`
Expected: FAIL — cannot resolve `../birthdate`.

- [ ] **Step 3: Write the implementation**

Create `app/personal-definition/_lib/birthdate.ts`:

```ts
const NEWEST_YEAR = 2012;
const OLDEST_YEAR = 1990;

/** Newest first — the audience is current students, who scroll least that way. */
export const YEARS: number[] = Array.from(
  { length: NEWEST_YEAR - OLDEST_YEAR + 1 },
  (_, i) => NEWEST_YEAR - i,
);

export const MONTHS: number[] = Array.from({ length: 12 }, (_, i) => i + 1);

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

const LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function daysInMonth(month: number, year: number): number {
  if (month < 1 || month > 12) return 0;
  if (month === 2 && isLeapYear(year)) return 29;
  return LENGTHS[month - 1]!;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "" whenever the selection is incomplete or impossible — never a guess. */
export function toIso(day: number | null, month: number | null, year: number | null): string {
  if (day === null || month === null || year === null) return "";
  if (month < 1 || month > 12) return "";
  if (day < 1 || day > daysInMonth(month, year)) return "";
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function fromIso(iso: string): { day: number; month: number; year: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (day < 1 || day > daysInMonth(month, year)) return null;
  return { day, month, year };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run app/personal-definition/_lib/__tests__/birthdate.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add app/personal-definition/_lib/birthdate.ts app/personal-definition/_lib/__tests__/birthdate.test.ts
git commit -m "Add birth date arithmetic for three-select input"
```

---

### Task 3: Onboarding uses three selects

**Files:**
- Modify: `app/personal-definition/_components/OnboardingForm.tsx` (replace the `DatePicker` block at lines 74-81 and the `isoToDate`/`dateToIso` helpers at lines 22-30)
- Modify: `app/personal-definition/_lib/state.ts:50-57` (birth-date validation message)
- Test: `app/personal-definition/_components/__tests__/OnboardingForm.test.tsx` (extend)

**Interfaces:**
- Consumes: `YEARS`, `MONTHS`, `daysInMonth`, `toIso`, `fromIso` from Task 2.
- Produces: no new exports. `OnboardingForm`'s props are unchanged — it still calls `onChange("birth_date", iso)`.

- [ ] **Step 1: Write the failing test**

Append to `app/personal-definition/_components/__tests__/OnboardingForm.test.tsx`:

```ts
describe("OnboardingForm birth date", () => {
  const withDate = (birth_date: string): Input => ({
    name: "", full_name: "", university: "", birth_date,
  });

  it("offers day, month and year selects instead of a calendar popover", () => {
    render(<OnboardingForm input={withDate("")} errors={{}} onChange={() => {}} onSubmit={() => {}} />);
    expect(screen.getByLabelText("Ngày")).toBeInTheDocument();
    expect(screen.getByLabelText("Tháng")).toBeInTheDocument();
    expect(screen.getByLabelText("Năm")).toBeInTheDocument();
  });

  it("lists years newest first, back to 1990", () => {
    render(<OnboardingForm input={withDate("")} errors={{}} onChange={() => {}} onSubmit={() => {}} />);
    const year = screen.getByLabelText("Năm") as HTMLSelectElement;
    const values = Array.from(year.options).map((o) => o.value).filter(Boolean);
    expect(values[0]).toBe("2012");
    expect(values[values.length - 1]).toBe("1990");
  });

  it("emits an ISO date once all three parts are chosen", () => {
    const onChange = vi.fn();
    // Day and month already chosen; choosing the year completes the date.
    render(<OnboardingForm input={withDate("")} errors={{}} onChange={onChange} onSubmit={() => {}} />);
    fireEvent.change(screen.getByLabelText("Ngày"), { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText("Tháng"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("Năm"), { target: { value: "2004" } });
    expect(onChange).toHaveBeenLastCalledWith("birth_date", "2004-03-05");
  });

  it("emits an empty date while the selection is incomplete", () => {
    const onChange = vi.fn();
    render(<OnboardingForm input={withDate("")} errors={{}} onChange={onChange} onSubmit={() => {}} />);
    fireEvent.change(screen.getByLabelText("Ngày"), { target: { value: "5" } });
    expect(onChange).toHaveBeenLastCalledWith("birth_date", "");
  });

  it("shrinks the day list to fit the chosen month", () => {
    render(<OnboardingForm input={withDate("2004-02-10")} errors={{}} onChange={() => {}} onSubmit={() => {}} />);
    const day = screen.getByLabelText("Ngày") as HTMLSelectElement;
    const values = Array.from(day.options).map((o) => o.value).filter(Boolean);
    expect(values).toHaveLength(29); // February 2004 is a leap February
  });

  it("drops a day the newly chosen month cannot hold", () => {
    const onChange = vi.fn();
    render(<OnboardingForm input={withDate("2004-01-31")} errors={{}} onChange={onChange} onSubmit={() => {}} />);
    fireEvent.change(screen.getByLabelText("Tháng"), { target: { value: "4" } });
    // April has no 31st, so the date is incomplete again rather than silently the 30th.
    expect(onChange).toHaveBeenLastCalledWith("birth_date", "");
  });

  it("shows the birth date error", () => {
    render(
      <OnboardingForm
        input={withDate("")}
        errors={{ birth_date: "Chọn đủ ngày, tháng và năm." }}
        onChange={() => {}}
        onSubmit={() => {}}
      />,
    );
    expect(screen.getByText("Chọn đủ ngày, tháng và năm.")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/personal-definition/_components/__tests__/OnboardingForm.test.tsx`
Expected: FAIL — `getByLabelText("Ngày")` finds nothing; the calendar button is still rendered.

- [ ] **Step 3: Replace the date block in the component**

In `OnboardingForm.tsx`, delete the `DatePicker` import and the `isoToDate` / `dateToIso` helpers, then add:

```tsx
import { YEARS, MONTHS, daysInMonth, toIso, fromIso } from "../_lib/birthdate";

const numeric = (v: string): number | null => (v === "" ? null : Number(v));
```

Replace the `<DatePicker>` block with:

```tsx
{(() => {
  const parts = fromIso(input.birth_date);
  const day = parts?.day ?? null;
  const month = parts?.month ?? null;
  const year = parts?.year ?? null;
  // Without a month a 31-day list is the honest default; it narrows as soon
  // as a month is picked. Year matters only for February.
  const dayCount = month ? daysInMonth(month, year ?? 2004) : 31;

  const emit = (d: number | null, m: number | null, y: number | null) =>
    onChange("birth_date", toIso(d, m, y));

  return (
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
  );
})()}
```

`toIso` already returns `""` for an impossible combination, so switching from January 31st to April clears the date without extra branching.

- [ ] **Step 4: Update the validation message**

In `state.ts`, change the empty-birth-date message on line 51 from `"Chọn ngày sinh của bạn."` to `"Chọn đủ ngày, tháng và năm."` — with three separate selects, a partially filled date is now the common failure. Update the matching assertion in `_lib/__tests__/state.test.ts`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run app/personal-definition/_components/__tests__/OnboardingForm.test.tsx app/personal-definition/_lib/__tests__/state.test.ts`
Expected: PASS, all tests including the seven new ones.

- [ ] **Step 6: Commit**

```bash
git add app/personal-definition/_components/OnboardingForm.tsx app/personal-definition/_lib/state.ts app/personal-definition/_lib/__tests__/state.test.ts app/personal-definition/_components/__tests__/OnboardingForm.test.tsx
git commit -m "Replace calendar popover with day/month/year selects"
```

---

### Task 4: Part arithmetic

**Files:**
- Create: `app/personal-definition/_lib/parts.ts`
- Test: `app/personal-definition/_lib/__tests__/parts.test.ts`

**Interfaces:**
- Consumes: `QUESTION_COUNT` from `_lib/likert.ts`.
- Produces: `PART_SIZE: number`, `PART_COUNT: number`, `PART_TITLES: readonly string[]`, `partOf(index: number): number`, `indexWithinPart(index: number): number`, `isLastOfPart(index: number): boolean`, `firstIndexOfPart(part: number): number`, `lastIndexOfPart(part: number): number`. All part numbers are 0-based; all item indices are 0-based.

- [ ] **Step 1: Write the failing test**

Create `app/personal-definition/_lib/__tests__/parts.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  PART_SIZE, PART_COUNT, PART_TITLES,
  partOf, indexWithinPart, isLastOfPart,
  firstIndexOfPart, lastIndexOfPart,
} from "../parts";
import { QUESTION_COUNT } from "../likert";

describe("parts", () => {
  it("splits the bank into four parts of ten", () => {
    expect(PART_SIZE).toBe(10);
    expect(PART_COUNT).toBe(4);
    expect(PART_SIZE * PART_COUNT).toBe(QUESTION_COUNT);
  });

  it("titles every part", () => {
    expect(PART_TITLES).toHaveLength(PART_COUNT);
    for (const title of PART_TITLES) expect(title.length).toBeGreaterThan(0);
  });

  it("maps item indices to parts", () => {
    expect(partOf(0)).toBe(0);
    expect(partOf(9)).toBe(0);
    expect(partOf(10)).toBe(1);
    expect(partOf(39)).toBe(3);
  });

  it("counts position within the part", () => {
    expect(indexWithinPart(0)).toBe(0);
    expect(indexWithinPart(9)).toBe(9);
    expect(indexWithinPart(10)).toBe(0);
    expect(indexWithinPart(39)).toBe(9);
  });

  it("recognises the last item of each part", () => {
    expect(isLastOfPart(8)).toBe(false);
    expect(isLastOfPart(9)).toBe(true);
    expect(isLastOfPart(19)).toBe(true);
    expect(isLastOfPart(29)).toBe(true);
    expect(isLastOfPart(39)).toBe(true);
  });

  it("gives the bounds of a part", () => {
    expect(firstIndexOfPart(0)).toBe(0);
    expect(lastIndexOfPart(0)).toBe(9);
    expect(firstIndexOfPart(2)).toBe(20);
    expect(lastIndexOfPart(3)).toBe(39);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/personal-definition/_lib/__tests__/parts.test.ts`
Expected: FAIL — cannot resolve `../parts`.

- [ ] **Step 3: Write the implementation**

Create `app/personal-definition/_lib/parts.ts`:

```ts
import { QUESTION_COUNT } from "./likert";

export const PART_SIZE = 10;
export const PART_COUNT = QUESTION_COUNT / PART_SIZE;

// A bank size that stops dividing evenly would silently produce a short or
// empty final part. Fail at import instead.
if (!Number.isInteger(PART_COUNT)) {
  throw new Error(
    `parts: ${QUESTION_COUNT} questions do not divide into parts of ${PART_SIZE}`,
  );
}

/**
 * Named for the journey, not the psychometric axis. Items are NOT grouped by
 * dimension — questions.json already rotates EI/SN/TF/JP, so a straight cut
 * gives every part all four, and scores are unchanged by the split.
 */
export const PART_TITLES = [
  "Bạn giữa mọi người",
  "Cách bạn tiếp nhận",
  "Cách bạn quyết định",
  "Cách bạn sắp xếp",
] as const;

export function partOf(index: number): number {
  return Math.floor(index / PART_SIZE);
}

export function indexWithinPart(index: number): number {
  return index % PART_SIZE;
}

export function isLastOfPart(index: number): boolean {
  return indexWithinPart(index) === PART_SIZE - 1;
}

export function firstIndexOfPart(part: number): number {
  return part * PART_SIZE;
}

export function lastIndexOfPart(part: number): number {
  return part * PART_SIZE + PART_SIZE - 1;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run app/personal-definition/_lib/__tests__/parts.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add app/personal-definition/_lib/parts.ts app/personal-definition/_lib/__tests__/parts.test.ts
git commit -m "Add part arithmetic for the four-part quiz"
```

---

### Task 5: Two Likert label sets

**Files:**
- Modify: `app/personal-definition/_lib/data/questions.json` (add `label_set` to all 40 items)
- Modify: `app/personal-definition/_lib/likert.ts`
- Test: `app/personal-definition/_lib/__tests__/likert.test.ts` (create)

**Interfaces:**
- Consumes: nothing new.
- Produces: `type LabelSet = "self" | "situation"`, `LIKERT_SETS: Record<LabelSet, readonly { value: Response; label: string }[]>`, `likertFor(index: number): readonly { value: Response; label: string }[]`, `QUESTION_COUNT` (unchanged). The old `LIKERT` export is removed; Task 7 updates its only consumer.

- [ ] **Step 1: Write the failing test**

Create `app/personal-definition/_lib/__tests__/likert.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { LIKERT_SETS, likertFor, QUESTION_COUNT } from "../likert";
import bank from "../data/questions.json";

describe("likert", () => {
  it("keeps both sets on the same five-point symmetric scale", () => {
    for (const [name, set] of Object.entries(LIKERT_SETS)) {
      expect(set.map((o) => o.value), name).toEqual([2, 1, 0, -1, -2]);
      for (const option of set) expect(option.label.length, name).toBeGreaterThan(0);
    }
  });

  it("gives the two sets different wording", () => {
    expect(LIKERT_SETS.self.map((o) => o.label)).not.toEqual(
      LIKERT_SETS.situation.map((o) => o.label),
    );
  });

  it("tags every item with a known label set", () => {
    const items = (bank as { items: { label_set?: string }[] }).items;
    expect(items).toHaveLength(QUESTION_COUNT);
    for (const [i, item] of items.entries()) {
      expect(Object.keys(LIKERT_SETS), `item ${i}`).toContain(item.label_set);
    }
  });

  it("resolves labels for every item index", () => {
    for (let i = 0; i < QUESTION_COUNT; i++) {
      expect(likertFor(i), `item ${i}`).toHaveLength(5);
    }
  });

  it("uses both sets somewhere in the bank", () => {
    const used = new Set(
      Array.from({ length: QUESTION_COUNT }, (_, i) => likertFor(i)[0]!.label),
    );
    expect(used.size).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/personal-definition/_lib/__tests__/likert.test.ts`
Expected: FAIL — `LIKERT_SETS` is not exported.

- [ ] **Step 3: Tag the items**

Add a `"label_set"` field to each of the 40 objects in `questions.json`. The rule, applied to the item's `text`:

- `"situation"` when the sentence opens with a **scenario clause before the first comma** — an external circumstance the reader is placed in. `Khi`, `Trước khi`, `Ở`, `Nếu`, `Trong`, `Sau khi` are typical openers but the test is semantic, not a keyword match: `Với bài tập nhóm,` qualifies, `Với tôi,` does not.
- `"self"` otherwise — the sentence describes the person directly, with no external frame. `Trong đầu tôi hay bật ra…` is `self` despite opening with `Trong`, because that is an idiom for interiority, not a scenario.

Expect roughly a 21/19 split. A tagging pass that lands almost everything in one set has misapplied the rule — the whole point is that both wordings appear often enough for the reader to notice.

*(Ruling of 2026-07-31: an earlier draft of this rule read as a literal six-word prefix match, which tags only 4 of 40 items `situation`. Khanh chose the semantic reading; the 21/19 tagging stands.)*

Worked examples from the current bank:

```json
{ "id": "ei_01", "dimension": "EI", "key": 1,
  "text": "Ở chỗ đông người, tôi thường là người bắt chuyện trước.",
  "label_set": "situation" }
```

```json
{ "id": "sn_01", "dimension": "SN", "key": -1,
  "text": "Tôi hay tưởng tượng mọi thứ có thể thành cái gì sau này.",
  "label_set": "self" }
```

```json
{ "id": "tf_01", "dimension": "TF", "key": -1,
  "text": "Trước khi quyết định, tôi hay nghĩ xem chuyện đó ảnh hưởng tới cảm xúc của ai.",
  "label_set": "situation" }
```

Do not touch `id`, `dimension`, `key`, `text`, or item order.

- [ ] **Step 4: Rewrite `likert.ts`**

```ts
import type { Response } from "./types";
import questionBank from "./data/questions.json";

export type LabelSet = "self" | "situation";

interface Option {
  value: Response;
  label: string;
}

/**
 * Both sets are five points, most-agree first, with matching intensity at
 * each position. Scoring is S = Σ(r × key), so an asymmetric or shorter set
 * would quietly bias every result that used it.
 */
export const LIKERT_SETS: Record<LabelSet, readonly Option[]> = {
  self: [
    { value: 2, label: "Đúng y chang mình" },
    { value: 1, label: "Hơi giống mình" },
    { value: 0, label: "Tuỳ lúc" },
    { value: -1, label: "Không giống lắm" },
    { value: -2, label: "Không phải mình" },
  ],
  situation: [
    { value: 2, label: "Chuẩn luôn" },
    { value: 1, label: "Thường là vậy" },
    { value: 0, label: "Còn tuỳ" },
    { value: -1, label: "Ít khi" },
    { value: -2, label: "Không bao giờ" },
  ],
};

interface BankItem {
  text: string;
  label_set?: LabelSet;
}

const ITEMS = (questionBank as { items: BankItem[] }).items;

/** Derived from the bank so the view and the scorer can never disagree. */
export const QUESTION_COUNT = ITEMS.length;

export function likertFor(index: number): readonly Option[] {
  return LIKERT_SETS[ITEMS[index]?.label_set ?? "self"];
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run app/personal-definition/_lib/__tests__/likert.test.ts`
Expected: PASS, 5 tests. `QuizItem.test.tsx` now fails on the removed `LIKERT` export — Task 7 fixes it.

- [ ] **Step 6: Commit**

```bash
git add app/personal-definition/_lib/likert.ts app/personal-definition/_lib/data/questions.json app/personal-definition/_lib/__tests__/likert.test.ts
git commit -m "Add contextual Likert label sets"
```

---

### Task 6: Interlude phase in the reducer

**Files:**
- Modify: `app/personal-definition/_lib/state.ts`
- Test: `app/personal-definition/_lib/__tests__/state.test.ts` (extend)

**Interfaces:**
- Consumes: `partOf`, `isLastOfPart`, `firstIndexOfPart`, `lastIndexOfPart`, `PART_COUNT` from Task 4.
- Produces: `Phase` gains `"interlude"`. `Action` drops `GOTO` and gains `{ type: "NEXT" }`, `{ type: "BACK" }`, `{ type: "CONTINUE" }`. `State` is otherwise unchanged; the current part is always `partOf(state.current)`.

- [ ] **Step 1: Write the failing test**

Append to `app/personal-definition/_lib/__tests__/state.test.ts`:

```ts
import { firstIndexOfPart, lastIndexOfPart } from "../parts";

/** A state parked on `index` with every item up to and including it answered. */
function answeredUpTo(index: number): State {
  const responses = initialState.responses.slice();
  for (let i = 0; i <= index; i++) responses[i] = 1;
  return { ...initialState, phase: "quiz", current: index, responses };
}

describe("quiz navigation", () => {
  it("advances within a part", () => {
    const next = reducer(answeredUpTo(3), { type: "NEXT" });
    expect(next.phase).toBe("quiz");
    expect(next.current).toBe(4);
  });

  it("enters the interlude after the last item of a part", () => {
    const next = reducer(answeredUpTo(lastIndexOfPart(0)), { type: "NEXT" });
    expect(next.phase).toBe("interlude");
    expect(next.current).toBe(lastIndexOfPart(0)); // still parked on the item
  });

  it("does not advance while the current item is unanswered", () => {
    const parked = { ...initialState, phase: "quiz" as const, current: 2 };
    expect(reducer(parked, { type: "NEXT" })).toBe(parked);
  });

  it("leaves the interlude for the first item of the next part", () => {
    const interlude = { ...answeredUpTo(lastIndexOfPart(0)), phase: "interlude" as const };
    const next = reducer(interlude, { type: "CONTINUE" });
    expect(next.phase).toBe("quiz");
    expect(next.current).toBe(firstIndexOfPart(1));
  });

  it("goes back from the interlude to the item just answered", () => {
    const interlude = { ...answeredUpTo(lastIndexOfPart(1)), phase: "interlude" as const };
    const back = reducer(interlude, { type: "BACK" });
    expect(back.phase).toBe("quiz");
    expect(back.current).toBe(lastIndexOfPart(1));
  });

  it("steps back one item inside a part", () => {
    const back = reducer(answeredUpTo(5), { type: "BACK" });
    expect(back.current).toBe(4);
  });

  it("refuses to step back past the first item", () => {
    const first = answeredUpTo(0);
    expect(reducer(first, { type: "BACK" }).current).toBe(0);
  });

  it("never enters an interlude after the final part", () => {
    const responses = initialState.responses.map(() => 1 as const);
    const last = { ...initialState, phase: "quiz" as const, current: lastIndexOfPart(3), responses };
    // NEXT on the very last item is a no-op; the view shows "Xem kết quả" instead.
    expect(reducer(last, { type: "NEXT" })).toBe(last);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/personal-definition/_lib/__tests__/state.test.ts`
Expected: FAIL — `"NEXT"` is not assignable to `Action`.

- [ ] **Step 3: Update the reducer**

In `state.ts`, change the phase and action types:

```ts
export type Phase = "onboarding" | "quiz" | "interlude" | "synthesis";

export type Action =
  | { type: "SET_INPUT"; field: keyof Input; value: string }
  | { type: "START_QUIZ" }
  | { type: "ANSWER"; index: number; value: Response }
  | { type: "NEXT" }
  | { type: "BACK" }
  | { type: "CONTINUE" }
  | { type: "FINISH" };
```

Add the import:

```ts
import { PART_COUNT, partOf, isLastOfPart, firstIndexOfPart } from "./parts";
```

Replace the `GOTO` case with:

```ts
case "NEXT": {
  if (state.phase !== "quiz") return state;
  // Guard here as well as in the view: an unanswered item must never be
  // skipped, or FINISH would refuse to build a profile with no explanation.
  if (state.responses[state.current] === null) return state;
  if (state.current >= QUESTION_COUNT - 1) return state;
  if (isLastOfPart(state.current)) {
    // Stay parked on the item so BACK has somewhere obvious to return to.
    return { ...state, phase: "interlude" };
  }
  return { ...state, current: state.current + 1 };
}

case "BACK": {
  if (state.phase === "interlude") return { ...state, phase: "quiz" };
  if (state.phase !== "quiz") return state;
  return { ...state, current: Math.max(0, state.current - 1) };
}

case "CONTINUE": {
  if (state.phase !== "interlude") return state;
  const nextPart = partOf(state.current) + 1;
  if (nextPart >= PART_COUNT) return state;
  return { ...state, phase: "quiz", current: firstIndexOfPart(nextPart) };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run app/personal-definition/_lib/__tests__/state.test.ts`
Expected: PASS, including the eight new tests. `page.test.tsx` and `QuizItem.test.tsx` still fail on `GOTO` — Tasks 7 and 14 fix them.

- [ ] **Step 5: Commit**

```bash
git add app/personal-definition/_lib/state.ts app/personal-definition/_lib/__tests__/state.test.ts
git commit -m "Add interlude phase and part-aware quiz navigation"
```

---

### Task 7: Quiz item shows part progress and reacts

**Files:**
- Modify: `app/personal-definition/_components/QuizItem.tsx` (full rewrite)
- Test: `app/personal-definition/_components/__tests__/QuizItem.test.tsx` (rewrite)

**Interfaces:**
- Consumes: `likertFor` (Task 5), `partOf`/`indexWithinPart`/`PART_SIZE`/`PART_COUNT`/`PART_TITLES` (Task 4), `FACES`/`srcOf` (Task 1).
- Produces: `QuizItem` props become `{ text: string; index: number; value: Response | null; onAnswer: (v: Response) => void; onBack: () => void; onNext: () => void; onFinish: () => void }` — same shape as today, so `page.tsx` only changes which dispatch each handler sends.

- [ ] **Step 1: Write the failing test**

Rewrite `app/personal-definition/_components/__tests__/QuizItem.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QuizItem } from "../QuizItem";

const noop = () => {};
const base = {
  text: "Ở chỗ đông người, tôi thường là người bắt chuyện trước.",
  value: null,
  onAnswer: noop, onBack: noop, onNext: noop, onFinish: noop,
};

describe("QuizItem", () => {
  it("shows the part number and title", () => {
    render(<QuizItem {...base} index={13} />);
    expect(screen.getByText("Phần 2/4")).toBeInTheDocument();
    expect(screen.getByText("Cách bạn tiếp nhận")).toBeInTheDocument();
  });

  it("counts within the part, not across the whole bank", () => {
    render(<QuizItem {...base} index={13} />);
    expect(screen.getByText("Câu 4/10")).toBeInTheDocument();
  });

  it("fills the bar by position within the part", () => {
    render(<QuizItem {...base} index={13} />);
    // 4th of 10 -> 40%
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "40");
  });

  it("renders the situation label set for a scenario item", () => {
    render(<QuizItem {...base} index={0} />);
    expect(screen.getByText("Chuẩn luôn")).toBeInTheDocument();
  });

  it("renders the self label set for a self-description item", () => {
    render(<QuizItem {...base} index={1} text="Tôi hay tưởng tượng." />);
    expect(screen.getByText("Đúng y chang mình")).toBeInTheDocument();
  });

  it("reports the chosen value", () => {
    const onAnswer = vi.fn();
    render(<QuizItem {...base} index={1} onAnswer={onAnswer} />);
    fireEvent.click(screen.getByText("Đúng y chang mình"));
    expect(onAnswer).toHaveBeenCalledWith(2);
  });

  it("keeps the next button disabled until something is chosen", () => {
    const { rerender } = render(<QuizItem {...base} index={1} />);
    expect(screen.getByRole("button", { name: "Tiếp" })).toBeDisabled();
    rerender(<QuizItem {...base} index={1} value={2} />);
    expect(screen.getByRole("button", { name: "Tiếp" })).toBeEnabled();
  });

  it("offers the result button on the very last item", () => {
    render(<QuizItem {...base} index={39} value={1} />);
    expect(screen.getByRole("button", { name: "Xem kết quả" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Tiếp" })).not.toBeInTheDocument();
  });

  it("hides the back button on the first item", () => {
    render(<QuizItem {...base} index={0} />);
    expect(screen.queryByRole("button", { name: "Quay lại" })).not.toBeInTheDocument();
  });

  it("shows a mascot that changes with the answer", () => {
    const { rerender } = render(<QuizItem {...base} index={1} value={null} />);
    const neutral = screen.getByAltText("Mascot").getAttribute("src");
    rerender(<QuizItem {...base} index={1} value={2} />);
    expect(screen.getByAltText("Mascot").getAttribute("src")).not.toBe(neutral);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/personal-definition/_components/__tests__/QuizItem.test.tsx`
Expected: FAIL — the component still imports the removed `LIKERT` and shows "Câu 14/40".

- [ ] **Step 3: Rewrite the component**

```tsx
"use client";

import { Choicebox } from "@/components/worker/ui/Choicebox";
import { ProgressBar } from "@/components/worker/ui/ProgressBar";
import { Button } from "@/components/worker/ui/Button";
import { likertFor, QUESTION_COUNT } from "../_lib/likert";
import { PART_SIZE, PART_COUNT, PART_TITLES, partOf, indexWithinPart } from "../_lib/parts";
import { FACES, srcOf, type FaceName } from "../_lib/mascot";
import type { Response } from "../_lib/types";
import styles from "./mascot.module.css";

type Props = {
  text: string;
  index: number;
  value: Response | null;
  onAnswer: (v: Response) => void;
  onBack: () => void;
  onNext: () => void;
  onFinish: () => void;
};

/** The mascot mirrors the answer — warm for agreement, wry for refusal. */
function faceFor(value: Response | null): FaceName {
  if (value === null) return "smile";
  if (value >= 1) return "playful";
  if (value <= -1) return "smirk";
  return "confident";
}

export function QuizItem({ text, index, value, onAnswer, onBack, onNext, onFinish }: Props) {
  const part = partOf(index);
  const within = indexWithinPart(index);
  const isLast = index === QUESTION_COUNT - 1;
  const answered = value !== null;
  const options = likertFor(index);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
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
        </div>

        <p className="text-sm font-medium text-worker-primary">{PART_TITLES[part]}</p>

        <ProgressBar value={((within + 1) / PART_SIZE) * 100} />
        <p className="text-xs text-worker-text-secondary">
          Câu {within + 1}/{PART_SIZE}
        </p>
      </div>

      <div className="flex items-start gap-3">
        <p className="text-lg font-medium text-worker-primary flex-1">{text}</p>
        <img
          src={srcOf(FACES[faceFor(value)])}
          alt="Mascot"
          className={`w-14 h-14 object-contain shrink-0 ${styles.pulseOnChange}`}
        />
      </div>

      <div className="flex flex-col gap-2">
        {options.map((opt) => (
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

- [ ] **Step 4: Add the CSS module**

Create `app/personal-definition/_components/mascot.module.css`:

```css
@keyframes pd-pulse {
  0%   { transform: scale(1); }
  40%  { transform: scale(1.12); }
  100% { transform: scale(1); }
}

@keyframes pd-float {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-8px); }
}

@keyframes pd-pop {
  0%   { transform: scale(0.85); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

.pulseOnChange { animation: pd-pulse 260ms ease-out; }
.float         { animation: pd-float 3s ease-in-out infinite; }
.popIn         { animation: pd-pop 320ms ease-out both, pd-float 3s ease-in-out 320ms infinite; }
.bounceIn      { animation: pd-pop 320ms ease-out both; }

/* The rasteriser records a single frame. Anything mid-animation exports
   crooked, so capture pins every mascot back to its resting transform. */
:global([data-capturing]) .pulseOnChange,
:global([data-capturing]) .float,
:global([data-capturing]) .popIn,
:global([data-capturing]) .bounceIn {
  animation: none !important;
  transform: none !important;
  opacity: 1 !important;
}

@media (prefers-reduced-motion: reduce) {
  .pulseOnChange, .float, .popIn, .bounceIn {
    animation: none !important;
    transform: none !important;
    opacity: 1 !important;
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run app/personal-definition/_components/__tests__/QuizItem.test.tsx`
Expected: PASS, 10 tests.

- [ ] **Step 6: Commit**

```bash
git add app/personal-definition/_components/QuizItem.tsx app/personal-definition/_components/mascot.module.css app/personal-definition/_components/__tests__/QuizItem.test.tsx
git commit -m "Show part progress and a reacting mascot in the quiz"
```

---

### Task 8: Interlude screen

**Files:**
- Create: `app/personal-definition/_components/InterludeView.tsx`
- Test: `app/personal-definition/_components/__tests__/InterludeView.test.tsx`

**Interfaces:**
- Consumes: `PART_COUNT`, `PART_TITLES` (Task 4); `FACES`, `srcOf` (Task 1); `mascot.module.css` (Task 7).
- Produces: `InterludeView({ part, onContinue, onBack }: { part: number; onContinue: () => void; onBack: () => void })`. `part` is the 0-based part just finished.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { InterludeView } from "../InterludeView";

describe("InterludeView", () => {
  it("says which part was finished", () => {
    render(<InterludeView part={0} onContinue={() => {}} onBack={() => {}} />);
    expect(screen.getByText("Xong phần 1/4 rồi!")).toBeInTheDocument();
  });

  it("names the part coming next", () => {
    render(<InterludeView part={0} onContinue={() => {}} onBack={() => {}} />);
    expect(screen.getByText(/Cách bạn tiếp nhận/)).toBeInTheDocument();
  });

  it("gives each interlude its own line of encouragement", () => {
    const { unmount } = render(<InterludeView part={0} onContinue={() => {}} onBack={() => {}} />);
    const first = screen.getByTestId("interlude-line").textContent;
    unmount();
    render(<InterludeView part={1} onContinue={() => {}} onBack={() => {}} />);
    expect(screen.getByTestId("interlude-line").textContent).not.toBe(first);
  });

  it("shows a mascot", () => {
    render(<InterludeView part={2} onContinue={() => {}} onBack={() => {}} />);
    expect(screen.getByAltText("Mascot")).toBeInTheDocument();
  });

  it("continues and goes back", () => {
    const onContinue = vi.fn();
    const onBack = vi.fn();
    render(<InterludeView part={1} onContinue={onContinue} onBack={onBack} />);
    fireEvent.click(screen.getByRole("button", { name: "Đi tiếp" }));
    fireEvent.click(screen.getByRole("button", { name: "Quay lại" }));
    expect(onContinue).toHaveBeenCalledOnce();
    expect(onBack).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/personal-definition/_components/__tests__/InterludeView.test.tsx`
Expected: FAIL — cannot resolve `../InterludeView`.

- [ ] **Step 3: Write the component**

```tsx
"use client";

import { Button } from "@/components/worker/ui/Button";
import { PART_COUNT, PART_TITLES } from "../_lib/parts";
import { FACES, srcOf, type FaceName } from "../_lib/mascot";
import styles from "./mascot.module.css";

type Props = {
  /** 0-based index of the part just finished. */
  part: number;
  onContinue: () => void;
  onBack: () => void;
};

/** One per boundary — three boundaries for four parts. */
const LINES: { face: FaceName; line: string }[] = [
  { face: "laugh", line: "Mượt phết — mười câu chưa tới một phút." },
  { face: "excited", line: "Nửa đường rồi đó, phần sau nhẹ hơn." },
  { face: "confident", line: "Còn đúng mười câu nữa thôi, ráng nốt nha." },
];

export function InterludeView({ part, onContinue, onBack }: Props) {
  const { face, line } = LINES[part] ?? LINES[LINES.length - 1]!;
  const nextTitle = PART_TITLES[part + 1];

  return (
    <div className="flex flex-col items-center text-center gap-4 py-10">
      <img
        src={srcOf(FACES[face])}
        alt="Mascot"
        className={`w-28 h-28 object-contain ${styles.bounceIn}`}
      />

      <h2 className="text-[22px] font-medium text-worker-primary">
        Xong phần {part + 1}/{PART_COUNT} rồi!
      </h2>

      <p data-testid="interlude-line" className="text-sm text-worker-text-secondary max-w-[280px]">
        {line}
      </p>

      {nextTitle && (
        <p className="text-sm text-worker-primary">
          Tiếp theo: <span className="font-medium">{nextTitle}</span>
        </p>
      )}

      <div className="flex items-center gap-1.5 mt-2" aria-hidden>
        {Array.from({ length: PART_COUNT }, (_, i) => (
          <span
            key={i}
            className={`w-2 h-2 rounded-full ${i <= part ? "bg-worker-primary" : "bg-worker-border"}`}
          />
        ))}
      </div>

      <div className="flex gap-2 mt-2">
        <Button variant="secondary" onClick={onBack}>
          Quay lại
        </Button>
        <Button onClick={onContinue}>Đi tiếp</Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run app/personal-definition/_components/__tests__/InterludeView.test.tsx`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add app/personal-definition/_components/InterludeView.tsx app/personal-definition/_components/__tests__/InterludeView.test.tsx
git commit -m "Add interlude screen between quiz parts"
```

---

### Task 9: Expose the type label and pole names

**Files:**
- Modify: `app/personal-definition/_lib/types.ts` (add `label` to `MBTIResult`)
- Modify: `app/personal-definition/_lib/profile.ts:92`
- Create: `app/personal-definition/_lib/poles.ts`
- Test: `app/personal-definition/_lib/__tests__/poles.test.ts`, extend `_lib/__tests__/profile.test.ts`

**Interfaces:**
- Consumes: `Dimension`, `DimensionScore`, `MBTIResult` from `_lib/types.ts`.
- Produces: `MBTIResult.label: string`; `POLE_NAMES: Record<string, string>`; `dominantPole(dimension: Dimension, score: DimensionScore): { pole: string; name: string; percent: number }`.

`scoreMBTI` in `mbti.ts` does not know about labels — it returns the four-letter type. `buildProfile` already loads the type entry and spreads it, so the label is added there in one line.

- [ ] **Step 1: Write the failing tests**

Create `app/personal-definition/_lib/__tests__/poles.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { POLE_NAMES, dominantPole } from "../poles";

describe("poles", () => {
  it("names all eight poles in Vietnamese", () => {
    expect(Object.keys(POLE_NAMES).sort()).toEqual(
      ["E", "F", "I", "J", "N", "P", "S", "T"],
    );
    for (const name of Object.values(POLE_NAMES)) expect(name.length).toBeGreaterThan(0);
  });

  it("picks the leading pole and its percentage", () => {
    expect(dominantPole("EI", { raw: -8, first: 30, second: 70 }))
      .toEqual({ pole: "I", name: "Hướng nội", percent: 70 });
    expect(dominantPole("TF", { raw: 6, first: 65, second: 35 }))
      .toEqual({ pole: "T", name: "Lý trí", percent: 65 });
  });

  it("breaks a dead tie toward the declared default pole", () => {
    // questions.json defaults: EI -> I, SN -> N, TF -> F, JP -> P.
    expect(dominantPole("EI", { raw: 0, first: 50, second: 50 }).pole).toBe("I");
    expect(dominantPole("SN", { raw: 0, first: 50, second: 50 }).pole).toBe("N");
    expect(dominantPole("TF", { raw: 0, first: 50, second: 50 }).pole).toBe("F");
    expect(dominantPole("JP", { raw: 0, first: 50, second: 50 }).pole).toBe("P");
  });
});
```

Append to `app/personal-definition/_lib/__tests__/profile.test.ts`:

```ts
it("exposes the Vietnamese label of the MBTI type", () => {
  const profile = buildProfile({
    name: "Khanh",
    university: "ueh",
    birth_date: "2004-08-10",
    full_name: "Nguyen Khanh Trang",
    responses: Array.from({ length: 40 }, () => 0) as Response[],
  });
  expect(profile.mbti.label.length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run app/personal-definition/_lib/__tests__/poles.test.ts app/personal-definition/_lib/__tests__/profile.test.ts`
Expected: FAIL — cannot resolve `../poles`; `label` is not on `MBTIResult`.

- [ ] **Step 3: Write `poles.ts`**

```ts
import type { Dimension, DimensionScore } from "./types";

export const POLE_NAMES: Record<string, string> = {
  E: "Hướng ngoại",
  I: "Hướng nội",
  S: "Thực tế",
  N: "Trực giác",
  T: "Lý trí",
  F: "Cảm xúc",
  J: "Nguyên tắc",
  P: "Linh hoạt",
};

/** Mirrors questions.json `poles`. */
const POLES: Record<Dimension, { first: string; second: string }> = {
  EI: { first: "E", second: "I" },
  SN: { first: "S", second: "N" },
  TF: { first: "T", second: "F" },
  JP: { first: "J", second: "P" },
};

/**
 * A dead tie resolves to the second pole, matching questions.json `defaults`
 * (I, N, F, P) and the scorer — so the bar and the four-letter type can never
 * disagree about which side won.
 */
export function dominantPole(
  dimension: Dimension,
  score: DimensionScore,
): { pole: string; name: string; percent: number } {
  const { first, second } = POLES[dimension];
  const firstWins = score.first > score.second;
  const pole = firstWins ? first : second;
  return {
    pole,
    name: POLE_NAMES[pole]!,
    percent: firstWins ? score.first : score.second,
  };
}
```

- [ ] **Step 4: Add the label**

In `types.ts`, add to `MBTIResult`:

```ts
export interface MBTIResult {
  type: string;
  /** Vietnamese name of the type, e.g. "Người lặng lẽ dẫn đường". */
  label: string;
  dimensions: Record<Dimension, DimensionScore>;
  traits: string[];
}
```

In `profile.ts`, change line 92:

```ts
    mbti: { ...mbti, label: entry.label, traits: [...entry.traits] },
```

`scoreMBTI` returns no `label`, so `mbti.test.ts` may need its expected object updated if it compares whole results — check and adjust. `buildProfile` already throws when `entry.label` is missing (line 63), so the field can never be empty.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run app/personal-definition/_lib`
Expected: PASS across the whole `_lib` suite.

- [ ] **Step 6: Commit**

```bash
git add app/personal-definition/_lib/poles.ts app/personal-definition/_lib/types.ts app/personal-definition/_lib/profile.ts app/personal-definition/_lib/__tests__
git commit -m "Expose MBTI type label and Vietnamese pole names"
```

---

### Task 10: Illustrated result screen

**Files:**
- Modify: `app/personal-definition/_components/SynthesisView.tsx` (full rewrite)
- Test: `app/personal-definition/_components/__tests__/SynthesisView.test.tsx` (extend)

**Interfaces:**
- Consumes: `poseForType`, `srcOf` (Task 1); `dominantPole` (Task 9); `mascot.module.css` (Task 7).
- Produces: `SynthesisView({ profile, actions }: { profile: PersonalProfile; actions?: React.ReactNode })`. `actions` is where Task 14 injects the share buttons, so this component stays ignorant of rasterising.

- [ ] **Step 1: Write the failing test**

Append to `app/personal-definition/_components/__tests__/SynthesisView.test.tsx` (the file already builds a `profile` fixture — reuse it):

```tsx
it("shows the type and its Vietnamese label in the hero card", () => {
  render(<SynthesisView profile={profile} />);
  expect(screen.getByText(profile.mbti.type)).toBeInTheDocument();
  expect(screen.getByText(profile.mbti.label)).toBeInTheDocument();
});

it("shows the mascot pose for the type", () => {
  render(<SynthesisView profile={profile} />);
  expect(screen.getByAltText(`Mascot ${profile.mbti.type}`)).toBeInTheDocument();
});

it("renders one bar per dimension", () => {
  render(<SynthesisView profile={profile} />);
  expect(screen.getAllByRole("progressbar")).toHaveLength(4);
});

it("labels each bar with the winning pole and its percentage", () => {
  render(<SynthesisView profile={profile} />);
  const { name, percent } = dominantPole("EI", profile.mbti.dimensions.EI);
  expect(screen.getByText(name)).toBeInTheDocument();
  expect(screen.getByText(`${percent}%`)).toBeInTheDocument();
});

it("puts name, zodiac and life path on one identity line", () => {
  render(<SynthesisView profile={profile} />);
  expect(
    screen.getByText(
      `${profile.user.name} · ${profile.zodiac.sun_sign} · Số ${profile.numerology.life_path}`,
    ),
  ).toBeInTheDocument();
});

it("renders whatever actions it is given", () => {
  render(<SynthesisView profile={profile} actions={<button>Lưu ảnh</button>} />);
  expect(screen.getByRole("button", { name: "Lưu ảnh" })).toBeInTheDocument();
});
```

Add `import { dominantPole } from "../../_lib/poles";` to the test file.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/personal-definition/_components/__tests__/SynthesisView.test.tsx`
Expected: FAIL — no hero card, no progressbars, no mascot.

- [ ] **Step 3: Rewrite the component**

```tsx
"use client";

import type { ReactNode } from "react";
import { Chips } from "@/components/worker/ui/Chips";
import { ProgressBar } from "@/components/worker/ui/ProgressBar";
import { poseForType, srcOf } from "../_lib/mascot";
import { dominantPole } from "../_lib/poles";
import type { Dimension, PersonalProfile } from "../_lib/types";
import styles from "./mascot.module.css";

const DIMENSIONS: Dimension[] = ["EI", "SN", "TF", "JP"];

function Section({ title, children }: { title: string; children: ReactNode }) {
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

export function SynthesisView({
  profile,
  actions,
}: {
  profile: PersonalProfile;
  actions?: ReactNode;
}) {
  const { mbti, zodiac, numerology, synthesis, user } = profile;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col items-center text-center gap-2 bg-worker-accent rounded-worker-md px-5 py-7">
        <img
          src={srcOf(poseForType(mbti.type))}
          alt={`Mascot ${mbti.type}`}
          className={`w-40 h-40 object-contain ${styles.popIn}`}
        />
        <h1 className="text-[32px] font-medium text-worker-primary leading-none">{mbti.type}</h1>
        <p className="text-base text-worker-primary">{mbti.label}</p>
        <p className="text-sm text-worker-text-secondary">
          {user.name} · {zodiac.sun_sign} · Số {numerology.life_path}
        </p>
      </div>

      <Section title="Bốn chiều của bạn">
        <div className="flex flex-col gap-3">
          {DIMENSIONS.map((dimension) => {
            const { name, percent } = dominantPole(dimension, mbti.dimensions[dimension]);
            return (
              <div key={dimension} className="flex flex-col gap-1">
                <div className="flex justify-between text-sm text-worker-primary">
                  <span>{name}</span>
                  <span>{percent}%</span>
                </div>
                <ProgressBar value={percent} />
              </div>
            );
          })}
        </div>
      </Section>

      <p className="text-base text-worker-primary">{synthesis.narrative}</p>

      <Section title="Từ khóa">
        <div className="flex flex-wrap gap-2">
          {synthesis.personality_keywords.map((k) => (
            <Chips key={k} label={k} variant="outline" size="sm" />
          ))}
        </div>
      </Section>

      <Section title="Điểm mạnh">
        <List items={synthesis.strengths} />
      </Section>

      <Section title="Có thể để ý thêm">
        <List items={synthesis.growth_areas} />
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

      {actions}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run app/personal-definition/_components/__tests__/SynthesisView.test.tsx`
Expected: PASS, including the six new tests.

- [ ] **Step 5: Commit**

```bash
git add app/personal-definition/_components/SynthesisView.tsx app/personal-definition/_components/__tests__/SynthesisView.test.tsx
git commit -m "Rebuild result screen with mascot hero and dimension bars"
```

---

### Task 11: The shareable card

**Files:**
- Create: `app/personal-definition/_components/ShareCard.tsx`
- Test: `app/personal-definition/_components/__tests__/ShareCard.test.tsx`

**Interfaces:**
- Consumes: `poseForType`, `srcOf` (Task 1).
- Produces: `ShareCard` — a `forwardRef<HTMLDivElement, { profile: PersonalProfile }>`. Task 13 needs the DOM node, hence the ref.

The card is a fixed 1080×1350 canvas, not the on-screen column restyled. It renders off-screen with `position: fixed; left: -9999px` — `display: none` would leave the rasteriser nothing to measure. All sizes are absolute pixels: this element never reflows.

**On animation:** this card carries no animation classes at all — the float and pop live on the on-screen `SynthesisView`, which is never the thing captured. The `data-capturing` mechanism in Task 13 is therefore a guard rather than a live fix today: it exists so that the first person to add motion to the share card does not silently ship crooked exports. Do not remove it, and do not add animation here to justify it.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from "vitest";
import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { ShareCard } from "../ShareCard";
import { profile } from "./fixtures";

describe("ShareCard", () => {
  it("renders at a fixed 1080x1350", () => {
    const ref = createRef<HTMLDivElement>();
    render(<ShareCard ref={ref} profile={profile} />);
    expect(ref.current).not.toBeNull();
    expect(ref.current!.style.width).toBe("1080px");
    expect(ref.current!.style.height).toBe("1350px");
  });

  it("sits off-screen rather than hidden", () => {
    const ref = createRef<HTMLDivElement>();
    render(<ShareCard ref={ref} profile={profile} />);
    expect(ref.current!.style.display).not.toBe("none");
    expect(ref.current!.style.left).toBe("-9999px");
  });

  it("carries the identity a friend would recognise", () => {
    render(<ShareCard profile={profile} />);
    expect(screen.getByText(profile.user.name)).toBeInTheDocument();
    expect(screen.getByText(profile.mbti.type)).toBeInTheDocument();
    expect(screen.getByText(profile.mbti.label)).toBeInTheDocument();
  });

  it("shows the mascot pose", () => {
    render(<ShareCard profile={profile} />);
    expect(screen.getByAltText(`Mascot ${profile.mbti.type}`)).toBeInTheDocument();
  });

  it("shows at most three keywords so the card never overflows", () => {
    render(<ShareCard profile={profile} />);
    expect(screen.getAllByTestId("share-keyword").length).toBeLessThanOrEqual(3);
  });
});
```

Extract the existing `profile` fixture from `SynthesisView.test.tsx` into `app/personal-definition/_components/__tests__/fixtures.ts` and export it, then import it from both test files. This is a move, not a rewrite — keep the values identical.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/personal-definition/_components/__tests__/ShareCard.test.tsx`
Expected: FAIL — cannot resolve `../ShareCard`.

- [ ] **Step 3: Write the component**

```tsx
"use client";

import { forwardRef } from "react";
import { poseForType, srcOf } from "../_lib/mascot";
import type { PersonalProfile } from "../_lib/types";

/** 4:5 — the tallest ratio Instagram and Facebook feeds accept uncropped. */
const WIDTH = 1080;
const HEIGHT = 1350;

/**
 * Deliberately not the on-screen card. That one is a responsive column; this
 * is a fixed canvas with absolute type sizes, so the exported PNG looks the
 * same regardless of the device it was made on. Inline styles rather than
 * Tailwind: the rasteriser copies computed styles, and utility classes that
 * depend on viewport breakpoints would resolve against the phone, not the card.
 */
export const ShareCard = forwardRef<HTMLDivElement, { profile: PersonalProfile }>(
  function ShareCard({ profile }, ref) {
    const { mbti, zodiac, numerology, user, synthesis } = profile;

    return (
      <div
        ref={ref}
        style={{
          position: "fixed",
          left: "-9999px",
          top: 0,
          width: `${WIDTH}px`,
          height: `${HEIGHT}px`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "24px",
          padding: "72px 64px",
          boxSizing: "border-box",
          background: "linear-gradient(160deg, #FFF0F7 0%, #FFE1EF 100%)",
          fontFamily: "inherit",
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: "36px", color: "#8E8E93", margin: 0 }}>{user.name}</p>

        <img
          src={srcOf(poseForType(mbti.type))}
          alt={`Mascot ${mbti.type}`}
          style={{ width: "520px", height: "520px", objectFit: "contain" }}
        />

        <p style={{ fontSize: "120px", fontWeight: 600, color: "#A50064", margin: 0, lineHeight: 1 }}>
          {mbti.type}
        </p>

        <p style={{ fontSize: "44px", color: "#A50064", margin: 0 }}>{mbti.label}</p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "center" }}>
          {synthesis.personality_keywords.slice(0, 3).map((keyword) => (
            <span
              key={keyword}
              data-testid="share-keyword"
              style={{
                fontSize: "32px",
                color: "#A50064",
                border: "2px solid #A50064",
                borderRadius: "999px",
                padding: "8px 24px",
              }}
            >
              {keyword}
            </span>
          ))}
        </div>

        <p style={{ fontSize: "32px", color: "#8E8E93", margin: 0 }}>
          {zodiac.sun_sign} · Số chủ đạo {numerology.life_path}
        </p>
      </div>
    );
  },
);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run app/personal-definition/_components/__tests__/`
Expected: PASS — the new ShareCard tests plus the untouched SynthesisView tests reading from the extracted fixture.

- [ ] **Step 5: Commit**

```bash
git add app/personal-definition/_components/ShareCard.tsx app/personal-definition/_components/__tests__/
git commit -m "Add fixed-size shareable result card"
```

---

### Task 12: Install html-to-image

**Files:**
- Modify: `package.json`, `package-lock.json`

**Interfaces:**
- Consumes: nothing.
- Produces: the `html-to-image` module for Task 13.

**This is the one deliberate step outside cluster boundaries.** It must appear in the PR description as an explicit request to the repo owner.

- [ ] **Step 1: Install**

Run: `npm install html-to-image@^1.11.13`

- [ ] **Step 2: Confirm nothing else moved**

Run: `git diff --stat package.json package-lock.json`
Expected: `package.json` gains exactly one line under `dependencies`; `package-lock.json` gains only `html-to-image` and its transitive entries. If any unrelated dependency changed version, `git checkout` both files and rerun with `npm install html-to-image@1.11.13 --save-exact`.

- [ ] **Step 3: Confirm the app still builds**

Run: `npx tsc --noEmit`
Expected: only the three pre-existing errors in `tests/api/`.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "Add html-to-image for result card export

Needed by the personal-definition share feature. This touches the shared
manifest, which the cluster does not normally own — flagged for the repo
owner in the PR description."
```

---

### Task 13: Save and share

**Files:**
- Create: `app/personal-definition/_lib/share.ts`
- Test: `app/personal-definition/_lib/__tests__/share.test.ts`

**Interfaces:**
- Consumes: `html-to-image` (Task 12).
- Produces: `renderCardToPng(node: HTMLElement): Promise<Blob>`, `saveOrShare(node: HTMLElement, filename: string): Promise<"shared" | "saved">`.

This is the only module that knows the library exists. If the owner rejects the dependency, `renderCardToPng` is rewritten against Canvas 2D and nothing else in the codebase changes.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { toBlob } from "html-to-image";
import { renderCardToPng, saveOrShare } from "../share";

vi.mock("html-to-image", () => ({ toBlob: vi.fn() }));

const mockToBlob = vi.mocked(toBlob);
const png = new Blob(["x"], { type: "image/png" });

function node(): HTMLElement {
  const el = document.createElement("div");
  document.body.appendChild(el);
  return el;
}

beforeEach(() => {
  mockToBlob.mockReset();
  mockToBlob.mockResolvedValue(png);
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

describe("renderCardToPng", () => {
  it("pins animations during capture and releases them after", async () => {
    const el = node();
    mockToBlob.mockImplementation(async () => {
      // Captured mid-flight: the flag must be on right now.
      expect(el.hasAttribute("data-capturing")).toBe(true);
      return png;
    });
    await renderCardToPng(el);
    expect(el.hasAttribute("data-capturing")).toBe(false);
  });

  it("releases the flag even when capture throws", async () => {
    const el = node();
    mockToBlob.mockRejectedValue(new Error("boom"));
    await expect(renderCardToPng(el)).rejects.toThrow("boom");
    expect(el.hasAttribute("data-capturing")).toBe(false);
  });

  it("throws a readable error when the library returns nothing", async () => {
    mockToBlob.mockResolvedValue(null);
    await expect(renderCardToPng(node())).rejects.toThrow(/không tạo được ảnh/i);
  });
});

describe("saveOrShare", () => {
  it("shares the file when the browser accepts files", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { canShare: () => true, share });
    await expect(saveOrShare(node(), "card.png")).resolves.toBe("shared");
    expect(share).toHaveBeenCalledOnce();
  });

  it("falls back to download when file sharing is unsupported", async () => {
    vi.stubGlobal("navigator", { canShare: () => false });
    await expect(saveOrShare(node(), "card.png")).resolves.toBe("saved");
  });

  it("falls back to download when there is no Web Share API at all", async () => {
    vi.stubGlobal("navigator", {});
    await expect(saveOrShare(node(), "card.png")).resolves.toBe("saved");
  });

  it("treats a cancelled share as a cancellation, not a failure", async () => {
    const abort = Object.assign(new Error("cancelled"), { name: "AbortError" });
    vi.stubGlobal("navigator", { canShare: () => true, share: vi.fn().mockRejectedValue(abort) });
    // The user closing the sheet is not an error worth showing them.
    await expect(saveOrShare(node(), "card.png")).resolves.toBe("shared");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/personal-definition/_lib/__tests__/share.test.ts`
Expected: FAIL — cannot resolve `../share`.

- [ ] **Step 3: Write the implementation**

```ts
import { toBlob } from "html-to-image";

/**
 * The single point of contact with the rasterising library. Everything else
 * in the feature talks to this module, so swapping html-to-image for a
 * hand-rolled Canvas implementation touches only this file.
 */
export async function renderCardToPng(node: HTMLElement): Promise<Blob> {
  // A frame captured mid-animation exports crooked. The share card has no
  // animation today, so this is a guard for the day someone adds one — the
  // CSS module pins every mascot under this attribute.
  node.setAttribute("data-capturing", "true");
  try {
    const blob = await toBlob(node, {
      pixelRatio: 1, // the card is already authored at 1080x1350
      cacheBust: false, // assets are same-origin; cache busting only adds failures
    });
    if (!blob) {
      throw new Error("Trình duyệt không tạo được ảnh từ thẻ kết quả.");
    }
    return blob;
  } finally {
    node.removeAttribute("data-capturing");
  }
}

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * Share the card as a file where the platform supports it (phones), fall
 * back to a download everywhere else (desktop). Returns which path ran so
 * the caller can word its confirmation honestly.
 */
export async function saveOrShare(
  node: HTMLElement,
  filename: string,
): Promise<"shared" | "saved"> {
  const blob = await renderCardToPng(node);
  const file = new File([blob], filename, { type: "image/png" });

  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
    share?: (data: ShareData) => Promise<void>;
  };

  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file] });
      return "shared";
    } catch (error) {
      // Dismissing the share sheet is a choice, not a failure.
      if ((error as Error).name === "AbortError") return "shared";
      throw error;
    }
  }

  download(blob, filename);
  return "saved";
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run app/personal-definition/_lib/__tests__/share.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add app/personal-definition/_lib/share.ts app/personal-definition/_lib/__tests__/share.test.ts
git commit -m "Add result card export with share and download paths"
```

---

### Task 14: Wire the page together

**Files:**
- Modify: `app/personal-definition/page.tsx` (full rewrite)
- Test: `app/personal-definition/_components/__tests__/page.test.tsx` (extend — the file holds one test and no helpers today)

**Interfaces:**
- Consumes: everything from Tasks 1-13.
- Produces: nothing importable.

- [ ] **Step 1: Write the failing test**

Append to `app/personal-definition/_components/__tests__/page.test.tsx`. The helpers do not exist yet — write them exactly as below.

```tsx
/** Fill every onboarding field with something valid. */
function fillOnboarding() {
  fireEvent.change(screen.getByPlaceholderText(/tên bạn muốn hiển thị/i), {
    target: { value: "Khanh" },
  });
  fireEvent.change(screen.getByPlaceholderText(/họ tên đầy đủ/i), {
    target: { value: "Nguyen Khanh Trang" },
  });
  // First id in universities.json.
  fireEvent.change(screen.getByLabelText("Trường của bạn"), { target: { value: "vnu-hanoi" } });
  fireEvent.change(screen.getByLabelText("Ngày"), { target: { value: "5" } });
  fireEvent.change(screen.getByLabelText("Tháng"), { target: { value: "3" } });
  fireEvent.change(screen.getByLabelText("Năm"), { target: { value: "2004" } });
  fireEvent.click(screen.getByRole("button", { name: /bắt đầu/i }));
}

/**
 * Click the first Likert option. Choicebox is the only control carrying
 * aria-pressed, so this can never accidentally hit a navigation button.
 */
function answerCurrent() {
  fireEvent.click(screen.getAllByRole("button", { pressed: false })[0]!);
}

/** Answer all 40 items, passing through the three interludes. */
function completeQuiz() {
  for (let i = 0; i < 40; i++) {
    answerCurrent();
    if (i === 39) {
      fireEvent.click(screen.getByRole("button", { name: "Xem kết quả" }));
    } else {
      fireEvent.click(screen.getByRole("button", { name: "Tiếp" }));
      if ((i + 1) % 10 === 0) {
        fireEvent.click(screen.getByRole("button", { name: "Đi tiếp" }));
      }
    }
  }
}

it("shows the interlude after ten answers and continues into part two", () => {
  render(<PersonalDefinitionPage />);
  fillOnboarding();

  for (let i = 0; i < 10; i++) {
    answerCurrent();
    fireEvent.click(screen.getByRole("button", { name: "Tiếp" }));
  }

  expect(screen.getByText("Xong phần 1/4 rồi!")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Đi tiếp" }));
  expect(screen.getByText("Phần 2/4")).toBeInTheDocument();
  expect(screen.getByText("Câu 1/10")).toBeInTheDocument();
});

it("goes back out of the interlude to the item just answered", () => {
  render(<PersonalDefinitionPage />);
  fillOnboarding();
  for (let i = 0; i < 10; i++) {
    answerCurrent();
    fireEvent.click(screen.getByRole("button", { name: "Tiếp" }));
  }
  fireEvent.click(screen.getByRole("button", { name: "Quay lại" }));
  expect(screen.getByText("Câu 10/10")).toBeInTheDocument();
});

it("shows both export buttons on the result screen", () => {
  render(<PersonalDefinitionPage />);
  fillOnboarding();
  completeQuiz();
  expect(screen.getByRole("button", { name: "Lưu ảnh" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Chia sẻ" })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/personal-definition/_components/__tests__/page.test.tsx`
Expected: FAIL — the page still dispatches `GOTO` and renders no interlude.

- [ ] **Step 3: Rewrite the page**

```tsx
"use client";

import { useReducer, useRef, useState } from "react";
import { initialState, reducer, validateInput } from "./_lib/state";
import type { Input } from "./_lib/state";
import { partOf } from "./_lib/parts";
import { saveOrShare } from "./_lib/share";
import { Button } from "@/components/worker/ui/Button";
import { Callout } from "@/components/worker/ui/Callout";
import { OnboardingForm } from "./_components/OnboardingForm";
import { QuizItem } from "./_components/QuizItem";
import { InterludeView } from "./_components/InterludeView";
import { SynthesisView } from "./_components/SynthesisView";
import { ShareCard } from "./_components/ShareCard";
import bank from "./_lib/data/questions.json";

const ITEMS = (bank as { items: { text: string }[] }).items;

export default function PersonalDefinitionPage() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [showErrors, setShowErrors] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState<{ variant: "success" | "error"; message: string } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const errors = showErrors ? validateInput(state.input) : {};

  const handleStart = () => {
    if (Object.keys(validateInput(state.input)).length > 0) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    dispatch({ type: "START_QUIZ" });
  };

  const handleExport = async () => {
    if (!cardRef.current || !state.profile) return;
    setExporting(true);
    setNotice(null);
    try {
      const result = await saveOrShare(
        cardRef.current,
        `personal-definition-${state.profile.mbti.type}.png`,
      );
      if (result === "saved") {
        setNotice({ variant: "success", message: "Đã lưu ảnh về máy bạn." });
      }
    } catch {
      // Never fail silently — a dead button is worse than a visible error.
      setNotice({ variant: "error", message: "Chưa tạo được ảnh. Bạn thử lại giúp mình nhé." });
    } finally {
      setExporting(false);
    }
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
          onBack={() => dispatch({ type: "BACK" })}
          onNext={() => dispatch({ type: "NEXT" })}
          onFinish={() => dispatch({ type: "FINISH" })}
        />
      )}

      {state.phase === "interlude" && (
        <InterludeView
          part={partOf(state.current)}
          onContinue={() => dispatch({ type: "CONTINUE" })}
          onBack={() => dispatch({ type: "BACK" })}
        />
      )}

      {state.phase === "synthesis" && state.profile && (
        <>
          <SynthesisView
            profile={state.profile}
            actions={
              <div className="flex flex-col gap-3">
                {notice && <Callout variant={notice.variant} message={notice.message} />}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleExport} loading={exporting}>
                    Lưu ảnh
                  </Button>
                  <Button onClick={handleExport} loading={exporting}>
                    Chia sẻ
                  </Button>
                </div>
              </div>
            }
          />
          {/* Off-screen source for the exported PNG. */}
          <ShareCard ref={cardRef} profile={state.profile} />
        </>
      )}
    </div>
  );
}
```

Both buttons run the same handler: `saveOrShare` already picks sharing on phones and downloading on desktop, and a "Chia sẻ" button that does nothing on a laptop is worse than one that saves the file.

- [ ] **Step 4: Run the full subpage suite**

Run: `npx vitest run app/personal-definition`
Expected: PASS — every test in `_lib/__tests__`, `_components/__tests__` and `__tests__`.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: only the three pre-existing `tests/api/` errors. Anything else in `app/personal-definition/` is a real failure.

- [ ] **Step 6: Walk the app by hand**

Run: `npm run dev`, open `http://localhost:3000/personal-definition`, and check:
1. Year 2004 is reachable in two taps.
2. The bar moves visibly with each answer; interludes appear after items 10, 20 and 30 and not after 40.
3. The result shows the mascot, four bars, and the type label.
4. "Lưu ảnh" downloads a 1080×1350 PNG with the mascot upright and no clipped text.

- [ ] **Step 7: Commit**

```bash
git add app/personal-definition/page.tsx app/personal-definition/_components/__tests__/page.test.tsx
git commit -m "Wire four-part quiz, interludes and card export into the page"
```

---

## Definition of done

- Every task's tests pass, plus the whole `app/personal-definition` suite in one run.
- `npx tsc --noEmit` reports only the three pre-existing `tests/api/` errors.
- The manual walkthrough in Task 14 Step 6 has actually been done, including opening the exported PNG.
- The regression guard holds: a fixed response vector still produces the same MBTI type and dimension scores as before the split (`mbti.test.ts` and `profile.test.ts` already cover this and must not have been edited to accommodate the change).
- Nothing outside `app/personal-definition/` is modified except `package.json` and `package-lock.json` from Task 12. Verify with `git diff --stat main...HEAD`.
- The new dependency is written into the PR description for the repo owner.
