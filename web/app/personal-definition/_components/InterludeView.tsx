"use client";

import { Button } from "@/components/worker/ui/Button";
import { PART_COUNT, PART_SIZE, PART_TITLES } from "../_lib/parts";
import { QUESTION_COUNT } from "../_lib/likert";
import type { NumerologyResult, ZodiacResult } from "../_lib/types";
import { FACES, srcOf, type FaceName } from "../_lib/mascot";
import styles from "./mascot.module.css";

type Props = {
  /** 0-based index of the part just finished. */
  part: number;
  /**
   * Present only at the 50% boundary. Both values are settled at onboarding,
   * so revealing them here cannot contradict the final profile. Spec §5.
   */
  preview?: { zodiac: ZodiacResult; numerology: NumerologyResult };
  onContinue: () => void;
  onBack: () => void;
};

/** The interpretations run 2-3 sentences; the teaser shows only the first. */
function firstSentence(text: string): string {
  return (text.split(/[.!?](?:\s|$)/)[0] ?? text).trim();
}

function TeaserRow({ badge, label, value }: { badge: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 border border-worker-border rounded-worker-md px-4 py-3">
      <span className="text-lg text-worker-primary shrink-0" aria-hidden>{badge}</span>
      <div className="flex flex-col text-left">
        <span className="text-xs text-worker-text-secondary">{label}</span>
        <span className="text-sm text-worker-primary">{value}</span>
      </div>
    </div>
  );
}

/** One per boundary — three boundaries for four parts. */
const LINES: { face: FaceName; line: string }[] = [
  { face: "laugh", line: "Mượt phết — mười câu chưa tới một phút." },
  { face: "excited", line: "Nửa đường rồi đó, phần sau nhẹ hơn." },
  { face: "confident", line: "Còn đúng mười câu nữa thôi, ráng nốt nha." },
];

export function InterludeView({ part, preview, onContinue, onBack }: Props) {
  const { face, line } = LINES[part] ?? LINES[LINES.length - 1]!;
  const nextTitle = PART_TITLES[part + 1];

  return (
    <div className="flex flex-col items-center text-center gap-4 py-10">
      <img
        src={srcOf(FACES[face])}
        alt=""
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

      {preview && (
        <div data-testid="teaser" className="w-full flex flex-col gap-2 mt-2">
          <TeaserRow
            badge="★"
            label={preview.zodiac.sun_sign}
            value={preview.zodiac.traits[0] ?? ""}
          />
          <TeaserRow
            badge={String(preview.numerology.life_path)}
            label="Số Chủ Đạo"
            value={firstSentence(preview.numerology.interpretations.life_path)}
          />
          <div
            data-testid="teaser-locked"
            className="flex items-center gap-3 border border-worker-border rounded-worker-md px-4 py-3 opacity-60"
          >
            <span className="text-lg shrink-0" aria-hidden>🔒</span>
            <div className="flex flex-col text-left">
              <span className="text-xs text-worker-text-secondary">Nhóm tính cách MBTI</span>
              <span className="text-sm text-worker-primary">
                Còn {QUESTION_COUNT - (part + 1) * PART_SIZE} câu nữa
              </span>
            </div>
          </div>
        </div>
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
        <Button onClick={onContinue}>
          Đi tiếp
        </Button>
      </div>
    </div>
  );
}
