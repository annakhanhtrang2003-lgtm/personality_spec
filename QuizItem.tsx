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
