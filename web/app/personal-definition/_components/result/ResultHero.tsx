import { StickerCard } from "./StickerCard";
import type { MBTIResult } from "../../_lib/types";

/** Spec §5 ①: sticker card, type, label, name — then the narrative unchanged. */
export function ResultHero({
  mbti,
  name,
  narrative,
  accent,
}: {
  mbti: MBTIResult;
  name: string;
  narrative: string;
  accent: string;
}) {
  return (
    <header className="flex flex-col items-center text-center gap-3">
      <StickerCard type={mbti.type} />
      <h1 className="mt-2 text-[40px] leading-none font-extrabold tracking-wide" style={{ color: accent }}>
        {mbti.type}
      </h1>
      <p className="text-lg font-semibold text-[#1e293b]">{mbti.label}</p>
      <p data-testid="result-name" className="text-sm text-[#475569] break-words max-w-full">
        {name}
      </p>
      <p className="mt-2 text-left text-base leading-relaxed text-[#1e293b]">{narrative}</p>
    </header>
  );
}
