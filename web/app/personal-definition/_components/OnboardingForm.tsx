"use client";

import { useState } from "react";
import { TextInput } from "@/components/worker/ui/TextInput";
import { Select } from "@/components/worker/ui/Select";
import { HERO_MASCOT } from "../_lib/partTheme";
import { srcOf } from "../_lib/mascot";
import universities from "../_lib/data/universities.json";
import type { Input, InputErrors } from "../_lib/state";
import { YEARS, MONTHS, daysInMonth, toIso, fromIso } from "../_lib/birthdate";

const numeric = (v: string): number | null => (v === "" ? null : Number(v));

type Props = {
  input: Input;
  errors: InputErrors;
  onChange: (field: keyof Input, value: string) => void;
  onSubmit: () => void;
  onBack: () => void;
};

// 'other' always sorts last so a student whose school is missing is never blocked.
const OPTIONS = [...(universities as { id: string; name: string }[])]
  .sort((a, b) => (a.id === "other" ? 1 : b.id === "other" ? -1 : 0))
  .map((u) => ({ value: u.id, label: u.name }));

export function OnboardingForm({ input, errors, onChange, onSubmit, onBack }: Props) {
  // Local state, not derived from `input.birth_date` on every render: while the
  // selection is incomplete the emitted value is "" (see toIso), so deriving
  // straight from props would forget an in-progress day/month the instant the
  // next part is picked. Seeded once from the incoming value so a pre-filled
  // date still shows.
  //
  // BACK to the intro now unmounts this component, so the seed is what
  // restores a completed date on return. A half-picked date emits "" (see
  // toIso) and is not restored — accepted: the student re-picks one select.
  // A future "start over" using a `key` will need this to seed again.
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
}
