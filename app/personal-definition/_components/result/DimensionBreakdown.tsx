import { ResultCard, Chip } from "./ResultCard";
import { dominantPole, POLE_NAMES } from "../../_lib/poles";
import type { Dimension, MBTIResult } from "../../_lib/types";
import bank from "../../_lib/data/questions.json";

const DIMENSIONS: Dimension[] = ["EI", "SN", "TF", "JP"];
const POLES = (bank as { poles: Record<Dimension, { first: string; second: string }> }).poles;
const DEFINITIONS = (bank as { pole_definitions: Record<string, string> }).pole_definitions;

/**
 * Two-sided scale per dimension. The marker sits `100 - first`% from the
 * left, so it leans toward whichever pole won; a 50/50 tie centres it and
 * `dominantPole` names the default pole (I/N/F/P), matching the type letter.
 * The track is decorative — the sr-only line carries the numbers.
 */
export function DimensionBreakdown({
  mbti,
  keywords,
  accent,
}: {
  mbti: MBTIResult;
  keywords: string[];
  accent: string;
}) {
  return (
    <ResultCard title="Bốn chiều của bạn" accent={accent}>
      <ul className="flex flex-col gap-5">
        {DIMENSIONS.map((d) => {
          const { first, second } = POLES[d];
          const score = mbti.dimensions[d];
          const win = dominantPole(d, score);
          const side = (pole: string) => (
            <span
              className={pole === win.pole ? "font-bold" : "text-[#64748b]"}
              style={pole === win.pole ? { color: accent } : undefined}
            >
              {POLE_NAMES[pole]}
              {pole === win.pole && ` ${win.percent}%`}
            </span>
          );
          return (
            <li key={d} data-testid={`dim-${d}`} className="flex flex-col gap-2">
              <p className="sr-only">
                {`${POLE_NAMES[first]} ${score.first}%, ${POLE_NAMES[second]} ${score.second}%`}
              </p>
              <div aria-hidden className="flex justify-between text-sm">
                {side(first)}
                {side(second)}
              </div>
              <div aria-hidden className="relative h-2 rounded-full bg-[#e2e8f0]">
                <span
                  data-testid={`dim-${d}-marker`}
                  className="absolute top-1/2 w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
                  style={{ left: `${100 - score.first}%`, backgroundColor: accent }}
                />
              </div>
              <p className="text-sm leading-relaxed text-[#475569]">{DEFINITIONS[win.pole]}</p>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap gap-2">
        {keywords.map((k) => (
          <Chip key={k} label={k} accent={accent} />
        ))}
      </div>
    </ResultCard>
  );
}
