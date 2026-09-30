import { ResultCard } from "./ResultCard";

function Bullets({ items, accent }: { items: string[]; accent: string }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((it) => (
        <li key={it} className="flex gap-2.5 text-[15px] leading-relaxed text-[#1e293b]">
          <span aria-hidden className="mt-2 w-1.5 h-1.5 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
          {it}
        </li>
      ))}
    </ul>
  );
}

/** Two cards; side by side from 640px, stacked below (spec §5 ③). */
export function StrengthsGrowth({
  strengths,
  growthAreas,
  accent,
}: {
  strengths: string[];
  growthAreas: string[];
  accent: string;
}) {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <ResultCard title="Điểm mạnh" accent={accent}>
        <Bullets items={strengths} accent={accent} />
      </ResultCard>
      <ResultCard title="Điểm cần cải thiện" accent={accent}>
        <Bullets items={growthAreas} accent={accent} />
      </ResultCard>
    </div>
  );
}
