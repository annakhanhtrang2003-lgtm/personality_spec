"use client";

import { useState } from "react";
import { TextInput } from "@/components/worker/ui/TextInput";
import { Select } from "@/components/worker/ui/Select";
import { Button } from "@/components/worker/ui/Button";
import universities from "../_lib/data/universities.json";
import type { Input, InputErrors } from "../_lib/state";
import { YEARS, MONTHS, daysInMonth, toIso, fromIso } from "../_lib/birthdate";

const numeric = (v: string): number | null => (v === "" ? null : Number(v));

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

export function OnboardingForm({ input, errors, onChange, onSubmit }: Props) {
  // Local state, not derived from `input.birth_date` on every render: while the
  // selection is incomplete the emitted value is "" (see toIso), so deriving
  // straight from props would forget an in-progress day/month the instant the
  // next part is picked. Seeded once from the incoming value so a pre-filled
  // date still shows.
  //
  // That seeding only happens on mount — there's no effect syncing it if
  // `input.birth_date` changes afterwards from outside this component. Safe
  // today only because birth_date is written solely by this component's own
  // onChange round-trip and page.tsx never remounts OnboardingForm mid-flow
  // (no reducer action resets `input` or returns to the onboarding phase).
  // A future "start over" / external prefill will need this to seed again —
  // reset via a `key` on OnboardingForm rather than an effect that fights the
  // user's own keystrokes.
  const initialParts = fromIso(input.birth_date);
  const [day, setDay] = useState<number | null>(initialParts?.day ?? null);
  const [month, setMonth] = useState<number | null>(initialParts?.month ?? null);
  const [year, setYear] = useState<number | null>(initialParts?.year ?? null);

  // Without a month a 31-day list is the honest default; it narrows as soon
  // as a month is picked. Year matters only for February.
  const dayCount = month ? daysInMonth(month, year ?? 2004) : 31;

  const emit = (d: number | null, m: number | null, y: number | null) => {
    setDay(d);
    setMonth(m);
    setYear(y);
    onChange("birth_date", toIso(d, m, y));
  };

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

        <Button type="submit">Bắt đầu</Button>
      </form>
    </div>
  );
}
