"use client";

import { useRef } from "react";
import type { Response } from "../_lib/types";

type Option = { value: Response; label: string };

type Props = {
  options: readonly Option[];
  value: Response | null;
  /**
   * `advance` is true for a pointer/touch activation and false for a
   * keyboard-driven one (arrow-key radio-group navigation fires `change`
   * with no preceding `click`). The caller decides whether to auto-advance
   * from that flag — this component only reports it.
   */
  onChange: (v: Response, advance: boolean) => void;
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

  // A real click (mouse or touch) always fires `click` before `change`, with
  // `event.detail > 0`. Arrow-key navigation inside the radio group changes
  // the selection without ever firing `click`, so this ref is left at its
  // last value — false at rest. It is consumed and reset on every `change`
  // so a later keyboard-only change can't ride on an earlier click's flag.
  const pointerActivated = useRef(false);

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
            onClick={(e) => {
              pointerActivated.current = e.detail > 0;
            }}
            onChange={() => {
              const advance = pointerActivated.current;
              pointerActivated.current = false;
              onChange(opt.value, advance);
            }}
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
