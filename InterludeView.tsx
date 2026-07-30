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
        <Button onClick={onContinue}>
          Đi tiếp
        </Button>
      </div>
    </div>
  );
}
