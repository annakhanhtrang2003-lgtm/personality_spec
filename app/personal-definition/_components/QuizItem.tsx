"use client";

import { likertFor } from "../_lib/likert";
import { indexWithinPart } from "../_lib/parts";
import { LikertScale } from "./LikertScale";
import type { Response } from "../_lib/types";

type Props = {
  /** Absolute index into the bank, 0..39. */
  index: number;
  text: string;
  value: Response | null;
  isOpen: boolean;
  onToggle: () => void;
  /** `advance` distinguishes a pointer/touch answer from a keyboard one — see LikertScale. */
  onAnswer: (v: Response, advance: boolean) => void;
};

export function QuizItem({ index, text, value, isOpen, onToggle, onAnswer }: Props) {
  const ordinal = indexWithinPart(index) + 1;
  const answered = value !== null;

  return (
    <div className="border-b border-worker-border last:border-b-0">
      <button
        id={`quiz-row-toggle-${index}`}
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={`likert-panel-${index}`}
        className="w-full flex items-start gap-3 py-3 text-left"
      >
        <span className="w-5 shrink-0 text-sm text-worker-text-secondary">{ordinal}.</span>
        <span
          className={`flex-1 text-sm ${
            answered && !isOpen ? "text-worker-text-secondary" : "text-worker-primary"
          }`}
        >
          {text}
        </span>
        {answered ? (
          <span data-testid="row-answered" className="shrink-0 text-sm text-worker-primary" aria-hidden>
            ✓
          </span>
        ) : (
          <span className="shrink-0 text-sm text-worker-text-secondary" aria-hidden>
            {isOpen ? "⌄" : "›"}
          </span>
        )}
      </button>

      {isOpen && (
        <div id={`likert-panel-${index}`} className="pb-4 pl-8 pr-2">
          <LikertScale
            options={likertFor(index)}
            value={value}
            onChange={onAnswer}
            questionId={String(index)}
            question={`Câu hỏi: ${text}`}
          />
        </div>
      )}
    </div>
  );
}
