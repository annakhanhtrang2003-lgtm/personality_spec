"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/worker/ui/Button";
import { ProgressBar } from "@/components/worker/ui/ProgressBar";
import { PART_COUNT, PART_SIZE, PART_TITLES, indicesOfPart } from "../_lib/parts";
import { srcOf } from "../_lib/mascot";
import { PART_THEMES } from "../_lib/partTheme";
import { QuizItem } from "./QuizItem";
import type { Response } from "../_lib/types";
import bank from "../_lib/data/questions.json";
import styles from "./mascot.module.css";

const ITEMS = (bank as { items: { text: string }[] }).items;

type Props = {
  part: number;
  responses: (Response | null)[];
  open: number | null;
  /** `advance` distinguishes a pointer/touch answer from a keyboard one — see LikertScale. */
  onAnswer: (index: number, v: Response, advance: boolean) => void;
  onToggle: (index: number) => void;
  onFinishPart: () => void;
  onBack: () => void;
};

export function QuizPart({
  part, responses, open, onAnswer, onToggle, onFinishPart, onBack,
}: Props) {
  const indices = indicesOfPart(part);
  const answered = indices.filter((i) => responses[i] !== null).length;
  const complete = answered === PART_SIZE;
  const isLastPart = part === PART_COUNT - 1;
  const theme = PART_THEMES[part]!;

  // Set right before a pointer-triggered ANSWER, so the effect below knows
  // the *next* `open` change is an auto-advance it should follow with focus
  // — as opposed to a manual TOGGLE, or a keyboard ANSWER that leaves `open`
  // where it was. Reset once consumed so a later TOGGLE never inherits it.
  const pendingFocusRef = useRef(false);

  useEffect(() => {
    if (!pendingFocusRef.current) return;
    pendingFocusRef.current = false;
    if (open !== null) {
      document.getElementById(`quiz-row-toggle-${open}`)?.focus();
    }
  }, [open]);

  return (
    <div className="flex flex-col gap-5">
      <div
        className="flex flex-col items-center text-center gap-2 rounded-[24px] px-4 py-5"
        style={{ backgroundColor: theme.bg, boxShadow: `0 0 0 1px ${theme.ring}` }}
      >
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
        <span
          data-testid="part-letters"
          className="rounded-full px-3 py-1 text-xs font-semibold"
          style={{ backgroundColor: theme.badge, color: theme.badgeInk }}
        >
          {theme.letters[0]} · {theme.letters[1]}
        </span>
        <p className="text-sm font-medium" style={{ color: theme.chip }}>
          {PART_TITLES[part]}
        </p>

        {/* The dimension mascots are single images with no expressions, so
            progress shows as a bounce instead: keying on `answered` remounts
            the img, which replays pulseOnChange on every new answer. */}
        <img
          key={answered}
          src={srcOf(theme.mascot)}
          alt=""
          className={`w-20 h-20 object-contain ${styles.pulseOnChange}`}
        />

        <div className="w-full max-w-[280px]">
          <ProgressBar value={(answered / PART_SIZE) * 100} />
        </div>
        <p className="text-xs text-worker-text-secondary">
          {answered}/{PART_SIZE} câu
        </p>
      </div>

      <div className="flex flex-col">
        {indices.map((index) => (
          <QuizItem
            key={index}
            index={index}
            text={ITEMS[index]!.text}
            value={responses[index] ?? null}
            isOpen={open === index}
            onToggle={() => onToggle(index)}
            onAnswer={(v, advance) => {
              if (advance) pendingFocusRef.current = true;
              onAnswer(index, v, advance);
            }}
          />
        ))}
      </div>

      <div className="flex justify-between gap-2">
        {part > 0 ? (
          <Button variant="secondary" onClick={onBack}>
            Quay lại
          </Button>
        ) : (
          <span />
        )}
        <Button onClick={onFinishPart} disabled={!complete}>
          {isLastPart ? "Xem kết quả" : `Xong phần ${part + 1}`}
        </Button>
      </div>
    </div>
  );
}
